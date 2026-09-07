import { ArrowRight, RotateCcw, Scan, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PledgeBanner } from "@/components/pledge-banner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  BEST_KEY,
  CLASSES,
  CLASS_KEY,
  NAME_KEY,
  PLEDGE_KEY,
  SESSION_KEY,
  SHOW_PLEDGE,
} from "@/lib/defaults";
import {
  advanceStepFn,
  askHelpFn,
  revealAnswerFn,
} from "@/lib/oswald.functions";
import type { AnswerView, StepView, WinkView } from "@/lib/types";
import { compressImage, searchLinks } from "@/lib/utils";

type Screen = "form" | "help" | "answer" | "wink" | "other";

export function StudentApp() {
  const [screen, setScreen] = useState<Screen>("form");
  const [pledged, setPledged] = useState(!SHOW_PLEDGE);
  const [daBest, setDaBest] = useState(false);
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [hints, setHints] = useState<StepView[]>([]);
  const [packedSteps, setPackedSteps] = useState<StepView[]>([]);
  const [step, setStep] = useState<StepView | null>(null);
  const [answer, setAnswer] = useState<AnswerView | null>(null);
  const [wink, setWink] = useState<WinkView | null>(null);
  const [otherMessage, setOtherMessage] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedPledge = sessionStorage.getItem(PLEDGE_KEY);
    const storedBest = sessionStorage.getItem(BEST_KEY) === "1";
    const storedName = sessionStorage.getItem(NAME_KEY) ?? "";
    const storedClass = sessionStorage.getItem(CLASS_KEY) ?? "";
    if (SHOW_PLEDGE && storedPledge) setPledged(true);
    if (storedBest) setDaBest(true);
    if (storedName) setName(storedName);
    if (storedClass && CLASSES.some((c) => c.code === storedClass)) setClassCode(storedClass);
  }, []);

  function onAcceptPledge(best: boolean) {
    sessionStorage.setItem(PLEDGE_KEY, "help");
    if (best) sessionStorage.setItem(BEST_KEY, "1");
    else sessionStorage.removeItem(BEST_KEY);
    setDaBest(best);
    setPledged(true);
  }

  async function onPickFile(file: File | undefined) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Zet een foto of screenshot, of plak de tekst.");
      return;
    }
    try {
      const dataUrl = await compressImage(file);
      setImage(dataUrl);
    } catch {
      toast.error("Dit bestand kan ik niet openen. Probeer jpg of png.");
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!question.trim() && !image) {
      toast.error("Plak de vraag of snap 'm.");
      return;
    }
    setLoading(true);
    try {
      const payload: {
        name?: string;
        classCode?: string;
        text?: string;
        imageDataUrl?: string;
      } = {};
      if (name.trim()) payload.name = name.trim();
      if (classCode) payload.classCode = classCode;
      if (question.trim()) payload.text = question.trim();
      if (image) payload.imageDataUrl = image;
      const res = await askHelpFn({ data: payload });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, res.sessionId);
      sessionStorage.setItem(NAME_KEY, name.trim());
      sessionStorage.setItem(CLASS_KEY, classCode);
      setSessionId(res.sessionId);
      setHints([]);
      setStep(null);
      setAnswer(null);
      setWink(null);
      setOtherMessage("");
      if (res.kind === "other") {
        setOtherMessage(res.message);
        setScreen("other");
        return;
      }
      if (res.kind === "wink") {
        setWink(res.wink);
        setScreen("wink");
        return;
      }
      setAnswer(res.answer);
      setStep(res.steps[0] ?? res.step);
      setHints(res.steps[0] ? [res.steps[0]] : [res.step]);
      setPackedSteps(res.steps);
      setScreen("help");
    } catch {
      toast.error("Hulp ophalen lukte niet. Probeer het nog eens.");
    } finally {
      setLoading(false);
    }
  }

  async function onAdvance() {
    if (!step) return;
    const next = packedSteps.find((s) => s.step === step.step + 1);
    if (next) {
      setStep(next);
      setHints((prev) => [...prev.filter((h) => h.step !== next.step), next]);
      if (sessionId) void advanceStepFn({ data: { sessionId } }).catch(() => undefined);
      return;
    }
    if (!sessionId) return;
    try {
      const res = await advanceStepFn({ data: { sessionId } });
      if (!res.ok) return;
      setStep(res.step);
      setHints((prev) => [...prev.filter((h) => h.step !== res.step.step), res.step]);
    } catch {
      /* ignore — hints staan al op de pagina */
    }
  }


  async function onReveal() {
    if (answer) setScreen("answer");
    if (!sessionId) return;
    try {
      const res = await revealAnswerFn({ data: { sessionId } });
      if (res.ok) {
        setAnswer(res.answer);
        setScreen("answer");
      } else if (!answer) {
        toast.error(res.error);
      }
    } catch {
      if (!answer) toast.error("Antwoord ophalen lukte niet.");
    }
  }

  function onNewQuestion() {
    setQuestion("");
    setImage(null);
    setStep(null);
    setHints([]);
    setPackedSteps([]);
    setAnswer(null);
    setWink(null);
    setOtherMessage("");
    setSessionId("");
    sessionStorage.removeItem(SESSION_KEY);
    setScreen("form");
  }

  return (
    <div className="grid min-w-0 gap-5">
      {SHOW_PLEDGE && !pledged ? <PledgeBanner onAccept={onAcceptPledge} /> : null}
      <div
        inert={SHOW_PLEDGE && !pledged ? true : undefined}
        className={SHOW_PLEDGE && !pledged ? "pointer-events-none" : undefined}
      >
        {screen === "form" ? (
          <form
            onSubmit={onSubmit}
            className="grid min-w-0 gap-4"
            onPaste={(e) => {
              const file = [...e.clipboardData.items]
                .find((item) => item.type.startsWith("image/"))
                ?.getAsFile();
              if (file) {
                e.preventDefault();
                void onPickFile(file);
              }
            }}
          >
            <header>
              <h1 className="text-3xl font-extrabold tracking-tight">OswaldGPT</h1>
              <p className="mt-2 text-pretty leading-relaxed text-muted">
                Hulp bij je NaSk-vraag — eerst zelf nadenken.
                {daBest ? " Oswald is da best." : ""}
              </p>
            </header>

            <div>
              <Label htmlFor="vraag">Jouw vraag</Label>
              <Textarea
                id="vraag"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Plak de vraag, of typ bijv. hst 9 par 1 vraag 3."
              />
            </div>

            {image ? (
              <div className="relative overflow-hidden rounded-[var(--radius-lg)] bg-paper">
                <img
                  src={image}
                  alt="Snap van de vraag"
                  className="max-h-56 w-full object-contain"
                />
                <button
                  type="button"
                  className="absolute right-2 top-2 inline-flex size-11 items-center justify-center rounded-full bg-bg text-fg"
                  onClick={() => setImage(null)}
                  aria-label="Snap verwijderen"
                >
                  <X className="size-4" />
                </button>
              </div>
            ) : null}

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
              className="hidden"
              tabIndex={-1}
              onChange={(e) => {
                void onPickFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            <Button
              type="button"
              variant="primary"
              size="md"
              className="w-fit px-6"
              onClick={() => fileRef.current?.click()}
            >
              <Scan />
              Snap je vraag
            </Button>

            <Button
              type="submit"
              size="lg"
              variant="brand"
              loading={loading}
              className="min-h-[5.75rem] py-6 [&_svg]:size-8"
            >
              <span className="min-w-0 flex-1">
                <span className="block text-2xl font-extrabold tracking-tight">Hulp</span>
                <span className="block text-sm font-medium opacity-70">Eerst een hint</span>
              </span>
              <ArrowRight />
            </Button>

            <div className="grid grid-cols-2 gap-3">
              <div className="min-w-0">
                <Label htmlFor="klas">Klas</Label>
                <Select
                  id="klas"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value)}
                >
                  <option value=""></option>
                  {CLASSES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <Label htmlFor="naam">Jouw naam</Label>
                <Input
                  id="naam"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={40}
                  autoComplete="nickname"
                  className="border-2 border-[#4d9fff] focus-visible:border-[#4d9fff] focus-visible:ring-[#4d9fff]/50"
                />
              </div>
            </div>
          </form>
        ) : null}

        {screen === "help" && step ? (
          <div className="grid min-w-0 gap-4">
            {step.questionShort ? (
              <p className="text-sm leading-relaxed text-muted">{step.questionShort}</p>
            ) : null}
            {hints.map((h) => (
              <div key={h.step} className="grid gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-leaf">
                  Hint {h.step}
                  {h.step === 1 ? " · tekst" : ""}
                </p>
                <div className="rounded-[var(--radius-lg)] rounded-tl-sm bg-paper px-4 py-3 leading-relaxed text-fg">
                  {h.help}
                </div>
                {h.tip ? (
                  <div className="rounded-[var(--radius-lg)] rounded-tl-sm bg-surface px-4 py-3 leading-relaxed text-fg">
                    {h.tip}
                  </div>
                ) : null}
              </div>
            ))}
            <div className="grid gap-2 pt-1">
              {step.canAdvance ? (
                <Button type="button" size="lg" variant="primary" loading={loading} onClick={onAdvance}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">Nog een hint</span>
                  </span>
                  <ArrowRight />
                </Button>
              ) : null}
              {step.canShowAnswer ? (
                <Button type="button" size="lg" variant="brand" loading={loading} onClick={onReveal}>
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">Toon antwoord</span>
                    <span className="block text-sm font-medium opacity-70">Eerst zelf geprobeerd?</span>
                  </span>
                  <ArrowRight />
                </Button>
              ) : null}
            </div>
          </div>
        ) : null}

        {screen === "answer" && answer ? (
          <div className="grid min-w-0 gap-4">
            {answer.questionShort ? (
              <p className="text-sm leading-relaxed text-muted">{answer.questionShort}</p>
            ) : null}
            <div className="rounded-[var(--radius-xl)] bg-primary px-5 py-6 text-primary-fg">
              <p className="text-sm font-semibold uppercase tracking-wide opacity-70">Antwoord</p>
              <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-primary-fg">
                {answer.modelAnswer}
              </h2>
            </div>
            <div className="rounded-[var(--radius-lg)] bg-paper px-4 py-4 leading-relaxed text-fg">
              {answer.explanation}
            </div>
            <Button type="button" size="lg" variant="primary" onClick={onNewQuestion}>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">Nieuwe vraag</span>
                <span className="block text-sm font-medium opacity-70">Klas blijft staan</span>
              </span>
              <RotateCcw />
            </Button>
          </div>
        ) : null}

        {screen === "wink" && wink ? (
          <div className="grid min-w-0 gap-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-leaf">Knipoog</p>
            {wink.questionShort ? (
              <p className="text-sm leading-relaxed text-muted">{wink.questionShort}</p>
            ) : null}
            <div className="rounded-[var(--radius-lg)] bg-surface px-4 py-4 leading-relaxed text-fg">
              {wink.wink}
            </div>
            {wink.simpleAnswer ? (
              <div className="rounded-[var(--radius-xl)] bg-primary px-5 py-6 text-primary-fg">
                <p className="text-sm font-semibold uppercase tracking-wide opacity-70">
                  Kort antwoord
                </p>
                <p className="mt-2 text-xl font-extrabold tracking-tight">{wink.simpleAnswer}</p>
              </div>
            ) : null}
            <p className="text-sm leading-relaxed text-muted">
              Wil je het beter begrijpen? Zoek verder:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {searchLinks(wink.searchQuery).map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-paper text-sm font-bold text-fg hover:bg-surface"
                >
                  {link.label}
                </a>
              ))}
            </div>
            <Button type="button" size="lg" variant="primary" onClick={onNewQuestion}>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">NaSk-vraag</span>
                <span className="block text-sm font-medium opacity-70">Terug naar de les</span>
              </span>
              <RotateCcw />
            </Button>
          </div>
        ) : null}

        {screen === "other" ? (
          <div className="grid min-w-0 gap-4">
            <p className="text-sm font-semibold uppercase tracking-wide text-leaf">Verkeerd vak</p>
            <div className="rounded-[var(--radius-lg)] bg-surface px-4 py-4 leading-relaxed text-fg">
              {otherMessage}
            </div>
            <p className="text-sm leading-relaxed text-muted">
              Plak een NaSk-opdracht, een begrip, of vraag hoe je een samenvatting maakt.
              Geen Nederlands, geschiedenis of andere vakken.
            </p>
            <Button type="button" size="lg" variant="primary" onClick={onNewQuestion}>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">Andere vraag</span>
                <span className="block text-sm font-medium opacity-70">Alleen NaSk</span>
              </span>
              <RotateCcw />
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
