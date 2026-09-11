import { ArrowRight, Download, RotateCcw, Scan, X } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { PledgeBanner } from "@/components/pledge-banner";
import { Button } from "@/components/ui/button";
import { Input, Label, Select, Textarea } from "@/components/ui/field";
import {
  BEST_KEY,
  CHAPTER_KEY,
  CLASSES,
  CLASS_KEY,
  NAME_KEY,
  PLEDGE_KEY,
  SESSION_KEY,
  SHOW_PLEDGE,
} from "@/lib/defaults";
import { exercisesForParagraph } from "@/lib/answer-book";
import { chaptersForClass } from "@/lib/nova";
import {
  downloadHuiswerkChatlog,
  HUISWERK_SESSION_KEY,
  isHuiswerkModusEnabled,
  loadHuiswerkLog,
  saveHuiswerkLog,
  shortText,
  type HuiswerkLogEntry,
} from "@/lib/huiswerk";
import {
  advanceStepFn,
  askFollowupFn,
  askHelpFn,
  deeperExplanationFn,
  practiceQuestionFn,
  revealAnswerFn,
} from "@/lib/oswald.functions";
import type { AnswerView, PracticeQuestionView, StepView, WinkView } from "@/lib/types";
import { compressImage, searchLinks } from "@/lib/utils";

/** Zet a./b./c. op eigen regels als het model ze op één regel plakte. */
function formatModelAnswer(text: string): string {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\s+(?=[a-d]\)\s)/gi, "\n")
    .replace(/\s+(?=[a-d]\.\s)/gi, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Screen = "form" | "help" | "answer" | "wink" | "other";

export function StudentApp() {
  const [screen, setScreen] = useState<Screen>("form");
  const [pledged, setPledged] = useState(!SHOW_PLEDGE);
  const [daBest, setDaBest] = useState(false);
  const [name, setName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [chapter, setChapter] = useState("");
  const [paragraph, setParagraph] = useState("");
  const [somNum, setSomNum] = useState("");
  const [somLetter, setSomLetter] = useState("");
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
  const [deeperCount, setDeeperCount] = useState(0);
  const [deeperLoading, setDeeperLoading] = useState(false);
  const [deeperExtras, setDeeperExtras] = useState<string[]>([]);
  const [practiceList, setPracticeList] = useState<PracticeQuestionView[]>([]);
  const [practiceCount, setPracticeCount] = useState(0);
  const [practiceLoading, setPracticeLoading] = useState(false);
  const [practiceRevealed, setPracticeRevealed] = useState<Record<number, boolean>>({});
  const [winkFollowups, setWinkFollowups] = useState<{ question: string; reply: string }[]>([]);
  const [winkAsk, setWinkAsk] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const huiswerkEnabled = isHuiswerkModusEnabled();
  const [huiswerkActive, setHuiswerkActive] = useState(false);
  const [huiswerkLog, setHuiswerkLog] = useState<HuiswerkLogEntry[]>([]);
  const huiswerkActiveRef = useRef(false);

  useEffect(() => {
    const storedPledge = sessionStorage.getItem(PLEDGE_KEY);
    const storedBest = sessionStorage.getItem(BEST_KEY) === "1";
    const storedName = sessionStorage.getItem(NAME_KEY) ?? "";
    const storedClass = sessionStorage.getItem(CLASS_KEY) ?? "";
    if (SHOW_PLEDGE && storedPledge) setPledged(true);
    if (storedBest) setDaBest(true);
    if (storedName) setName(storedName);
    if (storedClass && CLASSES.some((c) => c.code === storedClass)) {
      setClassCode(storedClass);
      const storedChapter = sessionStorage.getItem(CHAPTER_KEY) ?? "";
      if (
        storedChapter &&
        chaptersForClass(storedClass).some((c) => String(c.n) === storedChapter)
      ) {
        setChapter(storedChapter);
      }
    }
    if (huiswerkEnabled) {
      const active = sessionStorage.getItem(HUISWERK_SESSION_KEY) === "1";
      huiswerkActiveRef.current = active;
      setHuiswerkActive(active);
      setHuiswerkLog(loadHuiswerkLog());
    }
  }, [huiswerkEnabled]);

  function appendHuiswerkLog(label: string, detail?: string) {
    if (!huiswerkActiveRef.current) return;
    const entry: HuiswerkLogEntry = {
      at: new Date().toISOString(),
      label,
      ...(detail?.trim() ? { detail: shortText(detail) } : {}),
    };
    setHuiswerkLog((prev) => {
      const next = [...prev, entry];
      saveHuiswerkLog(next);
      return next;
    });
  }

  function onToggleHuiswerk() {
    if (huiswerkActiveRef.current) {
      huiswerkActiveRef.current = false;
      setHuiswerkActive(false);
      sessionStorage.removeItem(HUISWERK_SESSION_KEY);
      return;
    }
    huiswerkActiveRef.current = true;
    setHuiswerkActive(true);
    sessionStorage.setItem(HUISWERK_SESSION_KEY, "1");
    const entry: HuiswerkLogEntry = {
      at: new Date().toISOString(),
      label: "Huiswerkmodus gestart",
      detail: [name.trim() && `naam ${name.trim()}`, classCode && `klas ${classCode}`]
        .filter(Boolean)
        .join(", ") || undefined,
    };
    setHuiswerkLog((prev) => {
      const next = prev.length ? [...prev, entry] : [entry];
      saveHuiswerkLog(next);
      return next;
    });
  }

  function onDownloadChatlog() {
    if (huiswerkLog.length === 0) {
      toast.error("Nog geen chatlog. Werk eerst in huiswerkmodus.");
      return;
    }
    downloadHuiswerkChatlog({ name, classCode, entries: huiswerkLog });
  }

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
    const questionNo = somNum ? `${somNum}${somLetter}` : "";
    const menuComplete = Boolean(classCode && chapter && paragraph && questionNo);
    if (!question.trim() && !image && !menuComplete) {
      toast.error("Kies som (met klas, hoofdstuk en paragraaf) of plak/snap de vraag.");
      return;
    }
    setLoading(true);
    try {
      const payload: {
        name?: string;
        classCode?: string;
        text?: string;
        imageDataUrl?: string;
        chapter?: string;
        paragraph?: string;
        questionNo?: string;
      } = {};
      if (name.trim()) payload.name = name.trim();
      if (classCode) payload.classCode = classCode;
      if (question.trim()) payload.text = question.trim();
      if (image) payload.imageDataUrl = image;
      if (chapter) payload.chapter = chapter;
      if (paragraph) payload.paragraph = paragraph;
      if (questionNo) payload.questionNo = questionNo;
      const res = await askHelpFn({ data: payload });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      sessionStorage.setItem(SESSION_KEY, res.sessionId);
      sessionStorage.setItem(NAME_KEY, name.trim());
      sessionStorage.setItem(CLASS_KEY, classCode);
      if (chapter) sessionStorage.setItem(CHAPTER_KEY, chapter);
      else sessionStorage.removeItem(CHAPTER_KEY);
      setSessionId(res.sessionId);
      setHints([]);
      setStep(null);
      setAnswer(null);
      setWink(null);
      setWinkFollowups([]);
      setWinkAsk("");
      setOtherMessage("");
      setDeeperExtras([]);
      setDeeperCount(0);
      setPracticeList([]);
      setPracticeCount(0);
      setPracticeRevealed({});
      const menuLabel =
        menuComplete ? `H${chapter} §${paragraph} som ${questionNo}` : "";
      const vraagTekst =
        question.trim() || (image ? "[foto]" : "") || menuLabel;
      appendHuiswerkLog("Vraag", vraagTekst);
      if (res.kind === "other") {
        setOtherMessage(res.message);
        appendHuiswerkLog("Bericht (ander vak)", res.message);
        setScreen("other");
        return;
      }
      if (res.kind === "wink") {
        setWink(res.wink);
        appendHuiswerkLog(
          "Knipoog",
          res.wink.simpleAnswer || res.wink.wink || res.wink.questionShort,
        );
        setScreen("wink");
        return;
      }
      setAnswer(res.answer);
      setStep(res.steps[0] ?? res.step);
      setHints(res.steps[0] ? [res.steps[0]] : [res.step]);
      setPackedSteps(res.steps);
      {
        const first = res.steps[0] ?? res.step;
        appendHuiswerkLog(
          `Hint ${first.step}${first.title ? ` · ${first.title}` : ""}`,
          first.help || first.tip,
        );
      }
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
      appendHuiswerkLog(
        `Hint ${next.step}${next.title ? ` · ${next.title}` : ""}`,
        next.help || next.tip,
      );
      if (sessionId) void advanceStepFn({ data: { sessionId } }).catch(() => undefined);
      return;
    }
    if (!sessionId) return;
    try {
      const res = await advanceStepFn({ data: { sessionId } });
      if (!res.ok) return;
      setStep(res.step);
      setHints((prev) => [...prev.filter((h) => h.step !== res.step.step), res.step]);
      appendHuiswerkLog(
        `Hint ${res.step.step}${res.step.title ? ` · ${res.step.title}` : ""}`,
        res.step.help || res.step.tip,
      );
    } catch {
      /* ignore — hints staan al op de pagina */
    }
  }


  async function onReveal() {
    let logged = false;
    if (answer) {
      appendHuiswerkLog("Antwoord getoond", answer.modelAnswer);
      logged = true;
      setScreen("answer");
    }
    if (!sessionId) return;
    try {
      const res = await revealAnswerFn({ data: { sessionId } });
      if (res.ok) {
        setAnswer(res.answer);
        if (!logged) appendHuiswerkLog("Antwoord getoond", res.answer.modelAnswer);
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
    setWinkFollowups([]);
    setWinkAsk("");
    setOtherMessage("");
    setDeeperExtras([]);
    setDeeperCount(0);
    setDeeperLoading(false);
    setPracticeList([]);
    setPracticeCount(0);
    setPracticeLoading(false);
    setPracticeRevealed({});
    setSessionId("");
    sessionStorage.removeItem(SESSION_KEY);
    setScreen("form");
  }

  const MAX_EXTRA = 3;

  async function onDeeperExplanation() {
    if (!answer || deeperCount >= MAX_EXTRA || deeperLoading) return;
    setDeeperLoading(true);
    try {
      const res = await deeperExplanationFn({
        data: {
          sessionId: sessionId || undefined,
          questionShort: answer.questionShort,
          modelAnswer: answer.modelAnswer,
          explanation: [answer.explanation, ...deeperExtras].filter(Boolean).join("\n\n"),
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setDeeperExtras((prev) => [...prev, res.explanation]);
      setDeeperCount((n) => n + 1);
      appendHuiswerkLog("Extra uitleg", res.explanation);
    } catch {
      toast.error("Diepere uitleg lukte niet. Probeer het nog eens.");
    } finally {
      setDeeperLoading(false);
    }
  }

  async function onPracticeQuestion() {
    if (!answer || practiceCount >= MAX_EXTRA || practiceLoading) return;
    setPracticeLoading(true);
    try {
      const res = await practiceQuestionFn({
        data: {
          sessionId: sessionId || undefined,
          questionShort: answer.questionShort,
          modelAnswer: answer.modelAnswer,
          explanation: answer.explanation,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      const item = res.practice;
      if (!item?.question) {
        toast.error("Oefenvraag maken lukte niet. Probeer het nog eens.");
        return;
      }
      setPracticeList((prev) => [...prev, item]);
      setPracticeCount((n) => n + 1);
      appendHuiswerkLog("Oefenvraag", item.question);
    } catch {
      toast.error("Oefenvraag maken lukte niet. Probeer het nog eens.");
    } finally {
      setPracticeLoading(false);
    }
  }

  async function onWinkAsk(e: FormEvent) {
    e.preventDefault();
    const asked = winkAsk.trim();
    if (asked.length < 2) {
      toast.error("Typ je vraag.");
      return;
    }
    setLoading(true);
    try {
      const res = await askFollowupFn({
        data: {
          sessionId: sessionId || undefined,
          question: asked,
          questionShort: wink?.questionShort || wink?.simpleAnswer || "",
          shownHints: [],
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setWinkFollowups((prev) => [...prev, res.followup]);
      appendHuiswerkLog("Doorvraag", res.followup.question);
      appendHuiswerkLog("Antwoord (doorvraag)", res.followup.reply);
      setWinkAsk("");
    } catch {
      toast.error("Doorvragen lukte niet.");
    } finally {
      setLoading(false);
    }
  }


  const paragraphExercises =
    classCode && chapter && paragraph
      ? exercisesForParagraph({
          classCode,
          chapter,
          paragraph,
        })
      : [];
  const selectedExercise = paragraphExercises.find((ex) => String(ex.n) === somNum);
  const letterOptions = selectedExercise?.letters ?? [];

  return (
    <div className="grid min-w-0 gap-5">
      {SHOW_PLEDGE && !pledged ? <PledgeBanner onAccept={onAcceptPledge} /> : null}
      {huiswerkEnabled ? (
        <div className="grid gap-2 rounded-[var(--radius-lg)] bg-surface px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
              Huiswerkmodus
            </p>
            <Button
              type="button"
              size="sm"
              variant={huiswerkActive ? "brand" : "outline"}
              onClick={onToggleHuiswerk}
            >
              {huiswerkActive ? "Aan" : "Start"}
            </Button>
          </div>
          {huiswerkActive || huiswerkLog.length > 0 ? (
            <>
              <Button
                type="button"
                size="sm"
                variant="paper"
                className="w-fit"
                disabled={huiswerkLog.length === 0}
                onClick={onDownloadChatlog}
              >
                <Download />
                Download chatlog
              </Button>
              <p className="text-xs leading-relaxed text-muted">
                Mail of upload dit bestand naar je docent.
              </p>
            </>
          ) : (
            <p className="text-xs leading-relaxed text-muted">
              Start om je hulp-sessie als chatlog te bewaren.
            </p>
          )}
        </div>
      ) : null}
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
                placeholder="Optioneel: plak de vraag. Of kies hieronder klas → som."
                className="min-h-40"
              />
            </div>

            <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
              <div className="min-w-0">
                <Label htmlFor="klas">Klas</Label>
                <Select
                  id="klas"
                  value={classCode}
                  className="h-10 px-3"
                  onChange={(e) => {
                    setClassCode(e.target.value);
                    setChapter("");
                    setParagraph("");
                    setSomNum("");
                    setSomLetter("");
                  }}
                >
                  <option value="">—</option>
                  {CLASSES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <Label htmlFor="hoofdstuk">Hoofdstuk</Label>
                <Select
                  id="hoofdstuk"
                  value={chapter}
                  disabled={!classCode}
                  className="h-10 px-3"
                  onChange={(e) => {
                    setChapter(e.target.value);
                    setParagraph("");
                    setSomNum("");
                    setSomLetter("");
                  }}
                >
                  <option value="">—</option>
                  {(classCode ? chaptersForClass(classCode) : []).map((c) => (
                    <option key={c.n} value={String(c.n)}>
                      {`H${c.n} · ${c.title}`}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <Label htmlFor="paragraaf">Paragraaf</Label>
                <Select
                  id="paragraaf"
                  value={paragraph}
                  disabled={!chapter}
                  className="h-10 px-3"
                  onChange={(e) => {
                    setParagraph(e.target.value);
                    setSomNum("");
                    setSomLetter("");
                  }}
                >
                  <option value="">—</option>
                  {(classCode && chapter
                    ? chaptersForClass(classCode).find((c) => String(c.n) === chapter)
                        ?.paragraphs ?? []
                    : []
                  ).map((p) => (
                    <option key={p.n} value={String(p.n)}>
                      {`§${p.n} · ${p.title}`}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="min-w-0">
                <Label htmlFor="som">Som</Label>
                <div className="grid grid-cols-[1fr_auto] gap-1.5">
                  <Select
                    id="som"
                    value={somNum}
                    disabled={!paragraph || paragraphExercises.length === 0}
                    className="h-10 px-3"
                    onChange={(e) => {
                      const next = e.target.value;
                      setSomNum(next);
                      const ex = paragraphExercises.find((x) => String(x.n) === next);
                      if (!next || !ex?.letters.length) setSomLetter("");
                      else if (somLetter && !ex.letters.includes(somLetter)) setSomLetter("");
                    }}
                  >
                    <option value="">—</option>
                    {paragraphExercises.map((ex) => (
                      <option key={ex.n} value={String(ex.n)}>
                        {ex.n}
                      </option>
                    ))}
                  </Select>
                  {letterOptions.length > 0 ? (
                    <Select
                      id="som-letter"
                      value={somLetter}
                      disabled={!somNum}
                      aria-label="Som-letter"
                      onChange={(e) => setSomLetter(e.target.value)}
                      className="h-10 w-[4.5rem] px-2"
                    >
                      <option value="">—</option>
                      {letterOptions.map((L) => (
                        <option key={L} value={L}>
                          {L}
                        </option>
                      ))}
                    </Select>
                  ) : (
                    <Select
                      id="som-letter"
                      value=""
                      disabled
                      aria-label="Som-letter"
                      className="h-10 w-[4.5rem] px-2"
                    >
                      <option value="">—</option>
                    </Select>
                  )}
                </div>
              </div>
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
                  {h.step === 1 ? " · tip" : ""}
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
            <div className="rounded-[var(--radius-xl)] bg-primary px-4 py-4 text-primary-fg">
              <p className="text-xs font-semibold uppercase tracking-wide opacity-70">Antwoord</p>
              <p className="mt-2 whitespace-pre-line text-base font-semibold leading-relaxed text-primary-fg">
                {formatModelAnswer(answer.modelAnswer)}
              </p>
            </div>
            {answer.explanation?.trim() ? (
              <div className="rounded-[var(--radius-lg)] bg-paper px-4 py-4 leading-relaxed text-fg">
                <p className="text-xs font-bold uppercase tracking-wide text-leaf">Uitleg</p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{answer.explanation}</p>
              </div>
            ) : null}
            {deeperExtras.map((text, i) => (
              <div key={`deeper-${i}`} className="rounded-[var(--radius-lg)] bg-paper px-4 py-4 leading-relaxed text-fg">
                <p className="text-xs font-bold uppercase tracking-wide text-leaf">
                  Nog meer uitleg{deeperExtras.length > 1 ? ` (${i + 1})` : ""}
                </p>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">{text}</p>
              </div>
            ))}
            {practiceList.map((practice, i) => (
              <div key={`practice-${i}-${practice.question.slice(0, 24)}`} className="grid gap-3 rounded-[var(--radius-lg)] bg-surface px-4 py-4">
                <p className="text-xs font-bold uppercase tracking-wide text-leaf">
                  Oefenvraag{practiceList.length > 1 ? ` (${i + 1})` : ""}
                </p>
                <p className="whitespace-pre-line text-sm leading-relaxed text-fg">{practice.question}</p>
                {!practiceRevealed[i] ? (
                  <Button
                    type="button"
                    size="md"
                    variant="paper"
                    className="w-fit"
                    onClick={() => {
                      setPracticeRevealed((prev) => ({ ...prev, [i]: true }));
                      appendHuiswerkLog("Oefenantwoord getoond", practice.modelAnswer);
                    }}
                  >
                    Toon oefenantwoord
                  </Button>
                ) : (
                  <div className="grid gap-3">
                    <div className="rounded-[var(--radius-lg)] bg-primary px-4 py-3 text-primary-fg">
                      <p className="text-xs font-semibold uppercase tracking-wide opacity-70">
                        Oefenantwoord
                      </p>
                      <p className="mt-2 whitespace-pre-line text-sm font-semibold leading-relaxed">
                        {formatModelAnswer(practice.modelAnswer)}
                      </p>
                    </div>
                    {practice.explanation?.trim() ? (
                      <div className="rounded-[var(--radius-lg)] bg-paper px-4 py-3 leading-relaxed text-fg">
                        <p className="text-xs font-bold uppercase tracking-wide text-leaf">Uitleg</p>
                        <p className="mt-2 whitespace-pre-line text-sm leading-relaxed">
                          {practice.explanation}
                        </p>
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ))}
            <div className="grid gap-2">
              {deeperCount < MAX_EXTRA ? (
                <Button
                  type="button"
                  size="lg"
                  variant="paper"
                  loading={deeperLoading}
                  disabled={deeperLoading}
                  onClick={onDeeperExplanation}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">Ik snap het nog niet</span>
                    <span className="block text-sm font-medium opacity-70">
                      Extra uitleg ({deeperCount}/{MAX_EXTRA})
                    </span>
                  </span>
                </Button>
              ) : (
                <p className="text-sm leading-relaxed text-muted">
                  Max. {MAX_EXTRA}× extra uitleg voor deze vraag. Lever de vraag opnieuw in om verder te oefenen.
                </p>
              )}
              {practiceCount < MAX_EXTRA ? (
                <Button
                  type="button"
                  size="lg"
                  variant="paper"
                  loading={practiceLoading}
                  disabled={practiceLoading}
                  onClick={onPracticeQuestion}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-lg font-extrabold">Oefenvraag</span>
                    <span className="block text-sm font-medium opacity-70">
                      Zelfde vaardigheid ({practiceCount}/{MAX_EXTRA})
                    </span>
                  </span>
                </Button>
              ) : (
                <p className="text-sm leading-relaxed text-muted">
                  Max. {MAX_EXTRA}× oefenvraag hier. Nieuwe ronde? Vraag opnieuw inleveren.
                </p>
              )}
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
            <p className="text-sm font-semibold uppercase tracking-wide text-leaf">Buiten de les</p>
            {wink.questionShort ? (
              <p className="text-sm leading-relaxed text-muted">{wink.questionShort}</p>
            ) : null}
            <div className="rounded-[var(--radius-lg)] bg-surface px-4 py-4 leading-relaxed text-fg">
              {wink.wink.replace(/\bknipoog\b/gi, "").replace(/\s{2,}/g, " ").trim()}
            </div>
            {wink.simpleAnswer ? (
              <div className="rounded-[var(--radius-xl)] bg-primary px-5 py-6 text-primary-fg">
                <p className="text-sm font-semibold uppercase tracking-wide opacity-70">
                  Kort antwoord
                </p>
                <p className="mt-2 text-xl font-extrabold tracking-tight">{wink.simpleAnswer}</p>
              </div>
            ) : null}
            {winkFollowups.map((item) => (
              <div key={`${item.question}-${item.reply.slice(0, 24)}`} className="grid gap-2">
                <div className="ml-8 rounded-[var(--radius-lg)] rounded-tr-sm bg-primary px-4 py-3 text-sm leading-relaxed text-primary-fg">
                  {item.question}
                </div>
                <div className="mr-8 rounded-[var(--radius-lg)] rounded-tl-sm bg-paper px-4 py-3 text-sm leading-relaxed text-fg">
                  {item.reply}
                </div>
              </div>
            ))}
            <form onSubmit={onWinkAsk} className="grid gap-2 rounded-[var(--radius-lg)] bg-surface p-3">
              <Label htmlFor="wink-ask">Doorvragen</Label>
              <Textarea
                id="wink-ask"
                value={winkAsk}
                onChange={(e) => setWinkAsk(e.target.value)}
                maxLength={400}
                className="min-h-20"
                placeholder="Nog iets weten over dit onderwerp?"
              />
              <Button type="submit" variant="paper" size="sm" loading={loading}>
                Stel vraag
              </Button>
            </form>
            <p className="text-sm leading-relaxed text-muted">
              Of zoek verder:
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