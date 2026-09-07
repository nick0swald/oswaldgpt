import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/field";
import { PIN_KEY } from "@/lib/defaults";
import { teacherLoginFn, teacherOverviewFn } from "@/lib/oswald.functions";
import type { DayStat } from "@/lib/types";
import { formatDuration, formatNlDay } from "@/lib/utils";

export function TeacherView({ onClose }: { onClose: () => void }) {
  const [pin, setPin] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [days, setDays] = useState<DayStat[]>([]);

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

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-bg/95">
      <div className="mx-auto w-full max-w-md px-4 py-6">
        <div className="mb-5 flex items-center justify-between gap-3">
          <h1 className="text-2xl font-extrabold tracking-tight">Gebruik per dag</h1>
          <Button type="button" variant="ghost" size="sm" onClick={onClose}>
            Sluiten
          </Button>
        </div>

        {unlocked ? (
          <div className="grid gap-4">
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
                      <th className="px-4 py-3 font-semibold">Tijd tot antwoord</th>
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
            <p className="text-xs text-muted">
              Tijd = gemiddelde tussen inleveren van de vraag en tikken op Toon antwoord.
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
                <span className="block text-sm font-medium opacity-70">Gebruik per dag</span>
              </span>
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
