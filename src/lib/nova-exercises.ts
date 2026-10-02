/**
 * Pure som-nummer-extractie uit Nova-antwoordenboektekst (geen imports, zodat
 * node --test dit direct kan laden).
 *
 * Een paragraaf bevat naast echte opdrachtnummers ook veel losse getallen op
 * een eigen regel: grafiekassen (0/10/20/30), tabelcellen, rekenstappen en
 * paginanummers. Echte opdrachten lopen in leesvolgorde op: 1, 2, 3, … N.
 * Daarom nemen we de oplopende keten 1→N (vroegste voorkomen van elk volgend
 * nummer) en knippen we de staart af als die alleen uit "zwakke" treffers
 * bestaat (een getal dat niet gevolgd wordt door een vraagzin of deelvraag).
 */

export type NovaExercise = { n: number; letters: string[] };
export type ExercisePage = { p: number; t: string };

const NUM_ONLY = /^\s*(\d{1,3})\s*$/;
// Deelvraag: "a\t…", "a …", "a. …", "a) …" — niet "{ A" (meerkeuze).
const SUBPART = /^\s*([a-f])(?:[\t ]|\.(?:\s|$)|\)(?:\s|$))/i;
// Sterk signaal dat een los getal een opdracht opent: daarna een zin
// ("Bekijk afbeelding 6.", "→ Bereken …") of meteen deelvraag a/b/….
const QUESTION_START =
  /^(?:(?:→\s*)?[A-ZÀ-Ý][a-zà-ÿ ]\S*\s+\S|[a-f](?:\t|\s{1,3}|\.\s|\)\s)\S)/;
const HEADER_LINES = 4;

type Token =
  | { kind: "num"; n: number; strong: boolean }
  | { kind: "letter"; letter: string }
  | { kind: "text" };

function tokenize(pages: ExercisePage[]): Token[] {
  const tokens: Token[] = [];
  for (const page of pages) {
    const lines = page.t.replace(/\u00a0/g, " ").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const num = line.match(NUM_ONLY);
      if (num) {
        const n = Number(num[1]);
        // Gedrukt paginanummer staat in de kop van de pagina (pdf-index ± 1).
        if (i < HEADER_LINES && Math.abs(n - page.p) <= 1) continue;
        let next = "";
        for (let j = i + 1; j < lines.length; j++) {
          const s = lines[j].trim();
          if (s) {
            next = s;
            break;
          }
        }
        tokens.push({ kind: "num", n, strong: QUESTION_START.test(next) });
        continue;
      }
      const sub = line.match(SUBPART);
      tokens.push(sub ? { kind: "letter", letter: sub[1].toLowerCase() } : { kind: "text" });
    }
  }
  return tokens;
}

export function extractExercises(pages: ExercisePage[]): NovaExercise[] {
  const tokens = tokenize(pages);

  // Oplopende keten 1, 2, 3, … in leesvolgorde.
  const chainPos: number[] = [];
  tokens.forEach((tok, i) => {
    if (tok.kind === "num" && tok.n === chainPos.length + 1) chainPos.push(i);
  });
  // Staart zonder enige sterke treffer = grafiek/tabel na de laatste opdracht.
  while (chainPos.length) {
    const n = chainPos.length;
    const from = chainPos[n - 1];
    const strong = tokens
      .slice(from)
      .some((tok) => tok.kind === "num" && tok.n === n && tok.strong);
    if (strong) break;
    chainPos.pop();
  }
  const count = chainPos.length;
  if (!count) return [];

  // Deelvragen: verzamel letters na elk voorkomen van een geaccepteerd nummer.
  const letters = new Map<number, string[]>();
  for (let n = 1; n <= count; n++) letters.set(n, []);
  let current: string[] | null = null;
  for (const tok of tokens) {
    if (tok.kind === "num") {
      current = letters.get(tok.n) ?? null;
      continue;
    }
    if (tok.kind === "letter" && current && !current.includes(tok.letter)) {
      current.push(tok.letter);
    }
  }
  return [...letters.entries()].map(([n, l]) => ({ n, letters: l }));
}
