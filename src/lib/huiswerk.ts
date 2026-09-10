/** Client-side huiswerkmodus: env gate + chatlog transcript helpers. */

export const HUISWERK_SESSION_KEY = "oswald_huiswerk_session";
export const HUISWERK_LOG_KEY = "oswald_huiswerk_log";

/** Public build flag — on when `1` or `true` (case-insensitive). Off by default. */
export function isHuiswerkModusEnabled(): boolean {
  const v = String(import.meta.env.VITE_HUISWERK_MODUS ?? "")
    .trim()
    .toLowerCase();
  return v === "1" || v === "true";
}

export type HuiswerkLogEntry = {
  at: string;
  label: string;
  detail?: string;
};

export function formatAmsterdamStamp(value: string | Date = new Date()): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("nl-NL", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Europe/Amsterdam",
  }).format(date);
}

/** YYYY-MM-DD in Europe/Amsterdam for filenames. */
export function amsterdamDateIso(value: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Amsterdam",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(value);
}

export function slugForFilename(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "zonder-naam";
}

export function shortText(text: string, max = 280): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

export function buildHuiswerkChatlog(opts: {
  name: string;
  classCode: string;
  entries: HuiswerkLogEntry[];
}): string {
  const naam = opts.name.trim() || "—";
  const klas = opts.classCode.trim() || "—";
  const lines: string[] = [
    "OswaldGPT — huiswerk chatlog",
    `Naam: ${naam}`,
    `Klas: ${klas}`,
    `Gegenereerd: ${formatAmsterdamStamp()} (Europe/Amsterdam)`,
    "",
    "— Log —",
    "",
  ];
  for (const entry of opts.entries) {
    const ts = formatAmsterdamStamp(entry.at);
    const detail = entry.detail?.trim();
    lines.push(detail ? `[${ts}] ${entry.label}: ${detail}` : `[${ts}] ${entry.label}`);
  }
  lines.push("");
  return lines.join("\n");
}

export function downloadHuiswerkChatlog(opts: {
  name: string;
  classCode: string;
  entries: HuiswerkLogEntry[];
}): void {
  const text = buildHuiswerkChatlog(opts);
  const filename = `oswald-huiswerk-${amsterdamDateIso()}-${slugForFilename(opts.name)}.txt`;
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function loadHuiswerkLog(): HuiswerkLogEntry[] {
  try {
    const raw = sessionStorage.getItem(HUISWERK_LOG_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is HuiswerkLogEntry =>
        !!item &&
        typeof item === "object" &&
        typeof (item as HuiswerkLogEntry).at === "string" &&
        typeof (item as HuiswerkLogEntry).label === "string",
    );
  } catch {
    return [];
  }
}

export function saveHuiswerkLog(entries: HuiswerkLogEntry[]): void {
  sessionStorage.setItem(HUISWERK_LOG_KEY, JSON.stringify(entries));
}
