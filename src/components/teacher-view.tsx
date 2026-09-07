import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { PIN_KEY } from "@/lib/defaults";
import { teacherLoginFn, teacherOverviewFn } from "@/lib/oswald.functions";
import type { DayStat } from "@/lib/types";
import { formatDuration, formatNlDay } from "@/lib/utils";

type ClassStat = { classCode: string; questions: number; answers: number };
type RecentRow = {
  name: string;
  classCode: string;
  at: string;
  stepsShown: number;
  answerShown: boolean;
  questionShort: string;
};

export function TeacherView({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<DayStat[]>([]);
  const [byClass, setByClass] = useState<ClassStat[]>([]);
  const [recent, setRecent] = useState<RecentRow[]>([]);
  const [persistent, setPersistent] = useState(true);

  async function load(nextPin: string) {
    setLoading(true);
    try {
      const res = await teacherOverviewFn({ data: { pin: nextPin } });
      if (!res.ok) {
        sessionStorage.removeItem(PIN_KEY);
        setUnlocked(false);
        toast.error(res.error);
        return;
      }
      sessionStorage.setItem(PIN_KEY, nextPin);
      setUnlocked(true);
      setDays(res.days);
      setByClass(res.byClass ?? []);
      setRecent(res.recent ?? []);
      setPersistent(res.persistent !== false);
    } catch {
      toast.error("Overzicht laden lukte niet.");
    } finally {
      setLoading(false);
    }
  }

  async function onLogin(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await teacherLoginFn({ data: { pin } });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      await load(pin);
    } catch {
      toast.error("Inloggen lukte niet.");
    } finally {
      setLoading(false);
    }
  }

  const today = days[0];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg/95">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Docent</h1>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Sluiten
          </Button>
        </div>

        {unlocked ? (
          <div className="grid gap-5">
            {!persistent ? (
              <p className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 text-sm leading-relaxed text-muted">
                Geen vaste database (`DATABASE_URL`). Zet Neon op Vercel, anders verdwijnt
                dit overzicht tussen deploys.
              </p>
            ) : null}

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-[var(--radius-lg)] bg-surface px-3 py-3 text-center">
                <p className="text-2xl font-extrabold tabular-nums text-fg">
                  {today?.questions ?? 0}
                </p>
                <p className="text-xs text-muted">Vragen {today ? "vandaag" : ""}</p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-surface px-3 py-3 text-center">
                <p className="text-2xl font-extrabold tabular-nums text-fg">
                  {today?.answers ?? 0}
                </p>
                <p className="text-xs text-muted">Antwoorden</p>
              </div>
              <div className="rounded-[var(--radius-lg)] bg-surface px-3 py-3 text-center">
                <p className="text-2xl font-extrabold tabular-nums text-fg">
                  {formatDuration(today?.avgSeconds ?? null)}
                </p>
                <p className="text-xs text-muted">Gem. tijd</p>
              </div>
            </div>

            {byClass.length > 0 ? (
              <div className="grid gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-leaf">Per klas</h2>
                <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-surface">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted">
                        <th className="px-4 py-2 font-semibold">Klas</th>
                        <th className="px-4 py-2 font-semibold">Vragen</th>
                        <th className="px-4 py-2 font-semibold">Antw.</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byClass.map((row) => (
                        <tr key={row.classCode} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-2 font-medium text-fg">{row.classCode}</td>
                          <td className="px-4 py-2 tabular-nums">{row.questions}</td>
                          <td className="px-4 py-2 tabular-nums">{row.answers}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}

            {recent.length > 0 ? (
              <div className="grid gap-2">
                <h2 className="text-sm font-bold uppercase tracking-wide text-leaf">Recent</h2>
                <ul className="grid gap-2">
                  {recent.slice(0, 20).map((row, i) => (
                    <li
                      key={`${row.at}-${row.name}-${i}`}
                      className="rounded-[var(--radius-lg)] bg-surface px-4 py-3 text-sm leading-relaxed"
                    >
                      <p className="font-semibold text-fg">
                        {row.name} · {row.classCode}
                        {row.answerShown ? " · antwoord" : ` · hint ${row.stepsShown}`}
                      </p>
                      {row.questionShort ? (
                        <p className="mt-1 text-muted">{row.questionShort}</p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="grid gap-2">
              <h2 className="text-sm font-bold uppercase tracking-wide text-leaf">Per dag</h2>
              {days.length === 0 ? (
                <p className="leading-relaxed text-muted">Nog geen ingeleverde vragen.</p>
              ) : (
                <div className="overflow-x-auto rounded-[var(--radius-lg)] bg-surface">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-border text-muted">
                        <th className="px-4 py-3 font-semibold">Dag</th>
                        <th className="px-4 py-3 font-semibold">Vragen</th>
                        <th className="px-4 py-3 font-semibold">Antwoord</th>
                        <th className="px-4 py-3 font-semibold">Tijd</th>
                      </tr>
                    </thead>
                    <tbody>
                      {days.map((row) => (
                        <tr key={row.day} className="border-b border-border/60 last:border-0">
                          <td className="px-4 py-3 font-medium text-fg">{formatNlDay(row.day)}</td>
                          <td className="px-4 py-3 tabular-nums">{row.questions}</td>
                          <td className="px-4 py-3 tabular-nums">{row.answers}</td>
                          <td className="px-4 py-3 tabular-nums text-muted">
                            {formatDuration(row.avgSeconds)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <p className="text-xs text-muted">
              Tijd = gemiddelde tussen inleveren en Toon antwoord.
            </p>
            <Button type="button" variant="paper" size="sm" loading={loading} onClick={() => load(pin)}>
              Vernieuwen
            </Button>
          </div>
        ) : (
          <form onSubmit={onLogin} className="grid gap-4 rounded-[var(--radius-xl)] bg-surface p-5">
            <p className="leading-relaxed text-muted">Alleen voor de docent.</p>
            <div>
              <Label htmlFor="pin">Wachtwoord</Label>
              <Input
                id="pin"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                required
                placeholder="Wachtwoord"
              />
            </div>
            <Button type="submit" size="lg" variant="primary" loading={loading}>
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">Open</span>
                <span className="block text-sm font-medium opacity-70">Gebruiksoverzicht</span>
              </span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
