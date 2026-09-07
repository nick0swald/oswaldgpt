import type { NovaSeries } from "@/lib/nova";
import gt3a from "@/lib/nova-books/gt3-a.json";
import gt3b from "@/lib/nova-books/gt3-b.json";
import gt4a from "@/lib/nova-books/gt4-a.json";
import gt4b from "@/lib/nova-books/gt4-b.json";
import kgt12a from "@/lib/nova-books/kgt12-a.json";
import kgt12b from "@/lib/nova-books/kgt12-b.json";

type BookPage = { p: number; h: number | null; s: number | null; t: string };
type BookFile = {
  id: string;
  series: string;
  part: string;
  book: string;
  pages: BookPage[];
};

const BOOKS = [gt3a, gt3b, gt4a, gt4b, kgt12a, kgt12b] as BookFile[];
const MAX_CHARS = 9000;
const STOP = new Set([
  "hoofdstuk",
  "paragraaf",
  "opdracht",
  "vraagnummer",
  "samenvatting",
  "nask",
  "nova",
  "deze",
  "voor",
  "naar",
  "met",
  "een",
  "het",
  "van",
  "dat",
  "die",
  "wat",
  "hoe",
  "welke",
  "maak",
  "schrijf",
  "leerling",
]);

function parseN(value?: string): number | undefined {
  const n = Number.parseInt(value?.trim() ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function preferredSeries(input: { series?: NovaSeries; chapter?: number }): NovaSeries[] {
  if (input.series) return [input.series];
  if (input.chapter && input.chapter >= 9) return ["gt4", "gt3", "kgt12"];
  if (input.chapter && input.chapter >= 5) return ["gt3", "gt4", "kgt12"];
  return ["kgt12", "gt3", "gt4"];
}

function sliceQuestion(text: string, question?: string): string {
  const q = question?.trim().toLowerCase() ?? "";
  if (!q) return text;
  const m = q.match(/^(\d{1,2})([a-z])?$/i);
  if (!m) return text;
  const n = m[1];
  const letter = m[2] ?? "";
  const startRe = new RegExp(
    `(?:^|\\n)\\s*(?:opdracht(?:en)?\\s+)?${n}${letter ? letter : "(?:\\b|\\s)"}`,
    "i",
  );
  const start = text.search(startRe);
  if (start < 0) return text;
  const next = Number(n) + 1;
  const nextRe = new RegExp(`(?:^|\\n)\\s*(?:opdracht(?:en)?\\s+)?${next}\\b`, "i");
  const rest = text.slice(start + 1);
  const cut = rest.search(nextRe);
  const block = (cut >= 0 ? text.slice(start, start + 1 + cut) : text.slice(start, start + 2800)).trim();
  return block.length > 40 ? block : text;
}

function keywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9àáâäèéêëìíîïòóôöùúûüÿñç ]/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 5 && !STOP.has(w));
}

function clip(parts: string[], max = MAX_CHARS): string {
  let out = "";
  for (const part of parts) {
    if (!part) continue;
    if (out.length + part.length + 2 > max) {
      out += (out ? "\n\n" : "") + part.slice(0, Math.max(0, max - out.length - 20)) + " …";
      break;
    }
    out += (out ? "\n\n" : "") + part;
  }
  return out.trim();
}

export function answerBookExcerpt(input: {
  series?: NovaSeries;
  chapter?: string;
  paragraph?: string;
  question?: string;
  query?: string;
}): string {
  const chapter = parseN(input.chapter);
  const paragraph = parseN(input.paragraph);
  const question = input.question?.trim();
  const seriesOrder = preferredSeries({ series: input.series, chapter });
  const rankedBooks = [...BOOKS].sort(
    (a, b) => seriesOrder.indexOf(a.series as NovaSeries) - seriesOrder.indexOf(b.series as NovaSeries),
  );

  if (chapter) {
    const chunks: string[] = [];
    for (const book of rankedBooks) {
      let pages = book.pages.filter((p) => p.h === chapter);
      if (!pages.length) continue;
      if (paragraph) {
        const exact = pages.filter((p) => p.s === paragraph);
        if (exact.length) pages = exact;
      }
      const header = `${book.book} — hoofdstuk ${chapter}${paragraph ? `, paragraaf ${paragraph}` : ""}${question ? `, opdracht ${question}` : ""}.`;
      const body = pages.map((p) => p.t).join("\n\n");
      chunks.push(`${header}\n${sliceQuestion(body, question)}`);
      if (clip(chunks).length >= MAX_CHARS) break;
    }
    return clip(chunks);
  }

  const terms = keywords(input.query ?? "");
  if (!terms.length) return "";

  const scored: { score: number; header: string; text: string }[] = [];
  for (const book of rankedBooks) {
    for (const page of book.pages) {
      const lower = page.t.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (lower.includes(term)) score += 1;
      }
      if (score === 0) continue;
      scored.push({
        score,
        header: `${book.book} h${page.h ?? "?"} p${page.p}`,
        text: page.t,
      });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return clip(scored.slice(0, 3).map((s) => `${s.header}\n${s.text}`));
}
