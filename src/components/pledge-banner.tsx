import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PledgeBanner({
  onAccept,
}: {
  onAccept: (daBest: boolean) => void;
}) {
  const [refused, setRefused] = useState(false);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-bg/80 p-4 pb-28"
      role="dialog"
      aria-modal="true"
      aria-labelledby="belofte-titel"
    >
      <div className="max-h-full w-full max-w-md overflow-y-auto rounded-[var(--radius-xl)] bg-surface p-5 sm:p-6">
        {refused ? (
          <>
            <h2 id="belofte-titel" className="text-2xl font-extrabold tracking-tight">
              Dan niet
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              OswaldGPT is alleen voor leerlingen die eerst zelf nadenken. Zonder
              belofte kun je de hulp niet gebruiken. Vraag je docent, of kom terug
              als je akkoord gaat.
            </p>
            <Button
              type="button"
              size="lg"
              variant="primary"
              className="mt-5"
              onClick={() => setRefused(false)}
            >
              <span className="min-w-0 flex-1">
                <span className="block text-lg font-extrabold">Terug</span>
                <span className="block text-sm font-medium opacity-70">
                  Lees de belofte nog eens
                </span>
              </span>
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm font-semibold uppercase tracking-wide text-leaf">
              Voordat je start
            </p>
            <h2 id="belofte-titel" className="mt-1 text-2xl font-extrabold tracking-tight">
              Geen antwoordenmachine
            </h2>
            <p className="mt-3 leading-relaxed text-muted">
              Net als bij cookies: eerst even akkoord. Jij gebruikt OswaldGPT als
              hulp. Jij denkt na. Het modelantwoord komt pas na drie stappen, als
              jij dat zelf tikt.
            </p>
            <ul className="mt-4 grid gap-2 text-sm leading-relaxed text-fg">
              <li className="rounded-[var(--radius-md)] bg-paper px-4 py-3">
                Ik beloof: dit is hulp, geen spiekbriefje.
              </li>
              <li className="rounded-[var(--radius-md)] bg-paper px-4 py-3">
                Optioneel: Oswald is da best.
              </li>
            </ul>
            <div className="mt-5 grid gap-2">
              <Button type="button" size="lg" variant="primary" onClick={() => onAccept(true)}>
                <span className="min-w-0 flex-1">
                  <span className="block text-lg font-extrabold">Akkoord, Oswald is da best</span>
                  <span className="block text-sm font-medium opacity-70">
                    Belofte + een beetje respect
                  </span>
                </span>
              </Button>
              <Button type="button" size="md" variant="paper" onClick={() => onAccept(false)}>
                Alleen de belofte
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setRefused(true)}>
                Niet akkoord
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
