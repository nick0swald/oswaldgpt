import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { extractExercises, type ExercisePage } from "./nova-exercises.ts";

type BookPage = { p: number; h: number | null; s: number | null; t: string };
type BookFile = { id: string; series: string; pages: BookPage[] };

const BOOK_IDS = ["gt3-a", "gt3-b", "gt4-a", "gt4-b", "kgt12-a", "kgt12-b"];
const books: BookFile[] = BOOK_IDS.map((id) =>
  JSON.parse(readFileSync(new URL(`./nova-books/${id}.json`, import.meta.url), "utf8")),
);

function paragraphs(): Map<string, BookPage[]> {
  const out = new Map<string, BookPage[]>();
  for (const book of books) {
    for (const page of book.pages) {
      if (!page.h || !page.s) continue;
      const key = `${book.series}|${page.h}|${page.s}`;
      out.set(key, [...(out.get(key) ?? []), page]);
    }
  }
  return out;
}

/**
 * Onafhankelijke referentie: de "LEERDOELEN EN OPDRACHTEN"-tabel op de
 * openingspagina van elke paragraaf noemt alle opdrachten (bv. "4abc, 5b").
 */
function taxonomyTables(): Map<string, number> {
  const out = new Map<string, number>();
  for (const book of books) {
    for (const page of book.pages) {
      const lines = page.t.split("\n");
      const head = lines.slice(0, 4).join("\n");
      const h = head.match(/HOOFDSTUK\s+(\d+)/);
      const start = lines.indexOf("LEERDOELEN EN OPDRACHTEN");
      if (!h || start < 0) continue;
      const s = lines.slice(0, 4).map((l) => l.match(/^(\d)\s+\S/)).find(Boolean);
      if (!s) continue;
      let max = 0;
      for (const raw of lines.slice(start + 1)) {
        const l = raw.trim();
        if (!l || /^[\d.\s*]+$/.test(l) && l.includes(".")) continue;
        if (/^(\d{1,2}[a-z]*)(\s*,?\s*\d{1,2}[a-z]*)*\s*,?$/.test(l)) {
          for (const m of l.matchAll(/(\d{1,2})[a-z]*/g)) max = Math.max(max, Number(m[1]));
          continue;
        }
        if (l.startsWith("*") || l.length <= 25) continue;
        break;
      }
      if (max) out.set(`${book.series}|${h[1]}|${s[1]}`, max);
    }
  }
  return out;
}

// Paragrafen waar de tabel méér opdrachten noemt dan de antwoordenboektekst
// bevat (tekst eindigt aantoonbaar eerder met "Test je kennis").
const TEXT_SHORTER_THAN_TABLE = new Set(["gt3|2|1", "gt4|12|2"]);

describe("extractExercises", () => {
  it("ignores graph axes, table cells and page numbers", () => {
    const pages: ExercisePage[] = [
      {
        p: 12,
        t: "HOOFDSTUK 13  Geluid\n11\nPARAGRAAF 1\n1\nVul in.\na\tGeluid\n2\nNoteer het onderdeel.\n0\n10\n20\n30\n40",
      },
      { p: 13, t: "12\nHOOFDSTUK 13\nPARAGRAAF 1\n3\nBereken de afstand.\n13\nvast" },
    ];
    assert.deepEqual(
      extractExercises(pages).map((e) => e.n),
      [1, 2, 3],
    );
    assert.deepEqual(extractExercises(pages)[0].letters, ["a"]);
  });

  it("keeps exercise numbers that equal a nearby page number", () => {
    const pages: ExercisePage[] = [
      { p: 11, t: "10\nHOOFDSTUK 1\nPARAGRAAF 1\n" + Array.from({ length: 12 }, (_, i) => `${i + 1}\nLeg uit waarom.`).join("\n") },
    ];
    assert.equal(extractExercises(pages).length, 12);
  });

  it("4GT H13 §1 (Geluidsbronnen) lists exactly 1–10 (no stray 30)", () => {
    const pages = paragraphs().get("gt4|13|1") ?? [];
    assert.deepEqual(
      extractExercises(pages).map((e) => e.n),
      [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
  });

  it("every paragraph matches the book's own opdrachten-tabel", () => {
    const tables = taxonomyTables();
    const all = paragraphs();
    assert.ok(all.size >= 90, `expected ~95 paragraphs, got ${all.size}`);
    for (const [key, pages] of all) {
      const nums = extractExercises(pages).map((e) => e.n);
      assert.deepEqual(nums, nums.map((_, i) => i + 1), `${key} not 1..N`);
      const expected = tables.get(key);
      assert.ok(expected, `${key}: no opdrachten-tabel found`);
      if (TEXT_SHORTER_THAN_TABLE.has(key)) {
        assert.ok(nums.length < expected && nums.length >= expected - 3, `${key}: ${nums.length}`);
      } else {
        assert.equal(nums.length, expected, `${key}: got 1..${nums.length}, table says 1..${expected}`);
      }
    }
  });

  it("no page outside a chapter header is tagged with a hoofdstuk/paragraaf", () => {
    for (const book of books) {
      for (const page of book.pages) {
        if (page.h === null) continue;
        const head = page.t.split("\n").slice(0, 4).join("\n");
        assert.match(head, new RegExp(`HOOFDSTUK\\s+${page.h}\\b`), `${book.id} p${page.p}`);
      }
    }
  });
});
