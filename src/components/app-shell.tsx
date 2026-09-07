import { useRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8 shrink-0", className)} aria-hidden="true">
      <circle cx="16" cy="16" r="15" fill="var(--color-primary)" />
      <circle
        cx="16"
        cy="16"
        r="6.2"
        fill="none"
        stroke="var(--color-primary-fg)"
        strokeWidth="2.6"
      />
    </svg>
  );
}

export function AppShell({
  children,
  onSecret,
}: {
  children: ReactNode;
  onSecret?: () => void;
}) {
  const clicks = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onLogoClick() {
    if (!onSecret) return;
    clicks.current += 1;
    if (timer.current) clearTimeout(timer.current);
    if (clicks.current >= 5) {
      clicks.current = 0;
      onSecret();
      return;
    }
    timer.current = setTimeout(() => {
      clicks.current = 0;
    }, 4000);
  }

  return (
    <div className="min-h-dvh bg-bg text-fg">
      <a
        href="#inhoud"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-primary focus:px-3 focus:py-2 focus:text-primary-fg"
      >
        Naar inhoud
      </a>
      <header className="sticky top-0 z-[60] border-b border-border bg-bg/90">
        <div className="mx-auto flex h-14 w-full max-w-md items-center justify-between px-4">
          <button
            type="button"
            onClick={onLogoClick}
            className="flex items-center gap-2 text-fg"
            aria-label="OswaldGPT"
          >
            <LogoMark />
            <span className="text-lg font-extrabold tracking-tight">
              Oswald<span className="text-primary">GPT</span>
            </span>
          </button>
        </div>
      </header>
      <div id="inhoud">
        <main className="mx-auto min-w-0 w-full max-w-md overflow-x-clip px-4 pb-10 pt-5">
          {children}
        </main>
      </div>
    </div>
  );
}
