import type { ClassCode } from "@/lib/defaults";

export type NovaSeries = "kgt12" | "gt3" | "gt4";

export type NovaChapter = {
  n: number;
  title: string;
  paragraphs: { n: number; title: string }[];
};

const KGT12: NovaChapter[] = [
  {
    n: 1,
    title: "Natuurkunde en scheikunde",
    paragraphs: [
      { n: 1, title: "Een nieuw vak" },
      { n: 2, title: "Onderzoeken" },
      { n: 3, title: "Practicum" },
      { n: 4, title: "Meten" },
    ],
  },
  {
    n: 2,
    title: "Stoffen",
    paragraphs: [
      { n: 1, title: "Stoffen in huis" },
      { n: 2, title: "Zuivere stoffen en mengsels" },
      { n: 3, title: "Massa en volume" },
      { n: 4, title: "Dichtheid" },
    ],
  },
  {
    n: 3,
    title: "Water",
    paragraphs: [
      { n: 1, title: "IJs – water – waterdamp" },
      { n: 2, title: "Temperatuur meten" },
      { n: 3, title: "Veranderen van fase" },
      { n: 4, title: "Kookpunt en smeltpunt" },
    ],
  },
  {
    n: 4,
    title: "Elektriciteit",
    paragraphs: [
      { n: 1, title: "Een stroomkring maken" },
      { n: 2, title: "Spanningsbronnen" },
      { n: 3, title: "Schakelingen" },
      { n: 4, title: "Vermogen en energie" },
    ],
  },
  {
    n: 5,
    title: "Bewegen",
    paragraphs: [
      { n: 1, title: "Bewegingen vastleggen" },
      { n: 2, title: "Gemiddelde snelheid" },
      { n: 3, title: "Soorten bewegingen" },
      { n: 4, title: "Remmen en botsen" },
    ],
  },
  {
    n: 6,
    title: "Licht",
    paragraphs: [
      { n: 1, title: "Licht en schaduw" },
      { n: 2, title: "Spiegelbeelden" },
      { n: 3, title: "Licht en kleur" },
      { n: 4, title: "Infrarode en ultraviolette straling" },
    ],
  },
  {
    n: 7,
    title: "Het heelal",
    paragraphs: [
      { n: 1, title: "De zon, de aarde en de maan" },
      { n: 2, title: "Het zonnestelsel" },
      { n: 3, title: "De planeten" },
      { n: 4, title: "De bouw van het heelal" },
    ],
  },
  {
    n: 8,
    title: "Geluid",
    paragraphs: [
      { n: 1, title: "Geluid maken en horen" },
      { n: 2, title: "Toonhoogte en frequentie" },
      { n: 3, title: "Geluidssterkte" },
      { n: 4, title: "Geluidsoverlast verminderen" },
    ],
  },
];

const GT3: NovaChapter[] = [
  {
    n: 1,
    title: "Elektriciteit",
    paragraphs: [
      { n: 1, title: "Elektrische stroom" },
      { n: 2, title: "Elektriciteit in huis" },
      { n: 3, title: "Vermogen en energie" },
      { n: 4, title: "Elektriciteit en veiligheid" },
    ],
  },
  {
    n: 2,
    title: "Het weer",
    paragraphs: [
      { n: 1, title: "Het deeltjesmodel" },
      { n: 2, title: "Luchtdruk" },
      { n: 3, title: "Temperatuur" },
      { n: 4, title: "Wolken en onweer" },
    ],
  },
  {
    n: 3,
    title: "Krachten",
    paragraphs: [
      { n: 1, title: "Krachten herkennen" },
      { n: 2, title: "Krachten meten" },
      { n: 3, title: "Nettokracht" },
      { n: 4, title: "Krachten in werktuigen" },
    ],
  },
  {
    n: 4,
    title: "Stoffen",
    paragraphs: [
      { n: 1, title: "Stofeigenschappen" },
      { n: 2, title: "Smeltpunt en kookpunt" },
      { n: 3, title: "Veilig werken met stoffen" },
      { n: 4, title: "Chemische reacties" },
    ],
  },
  {
    n: 5,
    title: "Licht",
    paragraphs: [
      { n: 1, title: "Licht, schaduw en spiegels" },
      { n: 2, title: "Van infrarood tot ultraviolet" },
      { n: 3, title: "Beelden maken met een lens" },
      { n: 4, title: "Oog en bril" },
    ],
  },
  {
    n: 6,
    title: "Warmte",
    paragraphs: [
      { n: 1, title: "Warmte en temperatuur" },
      { n: 2, title: "Brandstoffen en verbranden" },
      { n: 3, title: "Warmtetransport" },
      { n: 4, title: "Isoleren" },
    ],
  },
  {
    n: 7,
    title: "Materialen",
    paragraphs: [
      { n: 1, title: "Materialen toepassen" },
      { n: 2, title: "Van grondstof tot product" },
      { n: 3, title: "Afvalverwerking" },
      { n: 4, title: "Dichtheid" },
    ],
  },
  {
    n: 8,
    title: "Atomen en straling",
    paragraphs: [
      { n: 1, title: "Atomen als stralingsbron" },
      { n: 2, title: "Radioactief verval" },
      { n: 3, title: "Straling gebruiken" },
      { n: 4, title: "Bescherming tegen straling" },
    ],
  },
];

const GT4: NovaChapter[] = [
  {
    n: 9,
    title: "Schakelingen",
    paragraphs: [
      { n: 1, title: "Weerstanden" },
      { n: 2, title: "LDR en NTC" },
      { n: 3, title: "Schakelen met een relais" },
      { n: 4, title: "Elektronische schakelingen" },
    ],
  },
  {
    n: 10,
    title: "Krachten",
    paragraphs: [
      { n: 1, title: "Soorten krachten" },
      { n: 2, title: "Krachten in constructies" },
      { n: 3, title: "Krachten samenstellen" },
      { n: 4, title: "Krachten ontbinden" },
    ],
  },
  {
    n: 11,
    title: "Energie",
    paragraphs: [
      { n: 1, title: "Fossiele brandstoffen" },
      { n: 2, title: "Zonne-energie" },
      { n: 3, title: "Windenergie" },
      { n: 4, title: "Waterkracht" },
      { n: 5, title: "Energie besparen" },
    ],
  },
  {
    n: 12,
    title: "Elektriciteit",
    paragraphs: [
      { n: 1, title: "Stroom en spanning" },
      { n: 2, title: "Spanning transformeren" },
      { n: 3, title: "Serie- en parallelschakeling" },
      { n: 4, title: "Elektriciteit en veiligheid" },
    ],
  },
  {
    n: 13,
    title: "Geluid",
    paragraphs: [
      { n: 1, title: "Geluidsbronnen" },
      { n: 2, title: "Toonhoogte" },
      { n: 3, title: "Geluidssterkte" },
      { n: 4, title: "Geluidshinder" },
    ],
  },
  {
    n: 14,
    title: "Werktuigen",
    paragraphs: [
      { n: 1, title: "Werken met hefbomen" },
      { n: 2, title: "Hefbomen en zwaartekracht" },
      { n: 3, title: "Katrollen en takels" },
      { n: 4, title: "Druk" },
    ],
  },
  {
    n: 15,
    title: "Bewegingen",
    paragraphs: [
      { n: 1, title: "Bewegingen onderzoeken" },
      { n: 2, title: "Snelheid en versnelling" },
      { n: 3, title: "Eenparig versneld" },
      { n: 4, title: "Eenparig vertraagd" },
    ],
  },
  {
    n: 16,
    title: "Kracht en beweging",
    paragraphs: [
      { n: 1, title: "Voortstuwen en tegenwerken" },
      { n: 2, title: "Optrekken en afremmen" },
      { n: 3, title: "Veiligheid in het verkeer" },
      { n: 4, title: "Kracht en arbeid" },
    ],
  },
];

const SERIES: Record<NovaSeries, { book: string; chapters: NovaChapter[] }> = {
  kgt12: { book: "Nova NaSk 1|2 VMBO-KGT", chapters: KGT12 },
  gt3: { book: "Nova Nask 1, 3 VMBO-GT", chapters: GT3 },
  gt4: { book: "Nova Nask 1, 4 VMBO-GT", chapters: GT4 },
};

export function seriesForClass(classCode: string): NovaSeries {
  // 4GT + 3HGL → Nova 4GT; 3.5/3.6 → 3GT; 2.5/2.6 → NaSk 1|2
  if (classCode === "4GT" || classCode === "3HGL") return "gt4";
  if (classCode === "3.5G" || classCode === "3.6G") return "gt3";
  if (classCode === "2.5G" || classCode === "2.6G") return "kgt12";
  if (classCode.startsWith("3")) return "gt3";
  if (classCode.startsWith("2")) return "kgt12";
  return "kgt12";
}

export function chaptersForClass(classCode: string): NovaChapter[] {
  return SERIES[seriesForClass(classCode)].chapters;
}

/** Haalt hst / par / vraag uit vrije tekst van de leerling. */
export function parseNovaFromText(text: string): {
  chapter?: string;
  paragraph?: string;
  question?: string;
} {
  const t = text.toLowerCase().replace(/[,;]/g, " ");
  if (!t.trim()) return {};

  let chapter: string | undefined;
  let paragraph: string | undefined;
  let question: string | undefined;

  const h =
    t.match(/(?:hoofdstuk|hst\.?)\s*(\d{1,2})\b/) ?? t.match(/(?:^|\s)h\s?(\d{1,2})\b/);
  if (h) chapter = h[1];

  const p = t.match(/(?:paragraaf|par\.?|§)\s*(\d{1,2})\b/);
  if (p) paragraph = p[1];

  const q = t.match(/(?:vraagnummer|opdracht|vraag|opdr\.?)\s*(\d{1,2}[a-z]?)\b/i);
  if (q) question = q[1];

  if (!chapter) {
    const dotted = t.match(/\b(\d{1,2})\.(\d{1,2})(?:\.(\d{1,2}[a-z]?))?\b/);
    if (dotted) {
      chapter = dotted[1];
      paragraph = paragraph ?? dotted[2];
      if (dotted[3]) question = question ?? dotted[3];
    }
  }

  return { chapter, paragraph, question };
}

export function lookupNova(input: {
  classCode?: string;
  chapter?: string;
  paragraph?: string;
  question?: string;
}): string {
  const chapterN = parseLoose(input.chapter);
  const paragraphN = parseLoose(input.paragraph);
  const question = input.question?.trim() ?? "";
  if (!chapterN && !paragraphN && !question) return "";

  const classCode = input.classCode?.trim() ?? "";
  const knownClass = Boolean(classCode && classCode !== "onbekend");
  const seriesKey = knownClass
    ? seriesForClass(classCode)
    : chapterN && chapterN >= 9
      ? "gt4"
      : undefined;
  const series = seriesKey ? SERIES[seriesKey] : undefined;
  const chapter = series?.chapters.find((c) => c.n === chapterN);
  const paragraph = chapter?.paragraphs.find((p) => p.n === paragraphN);

  const bits: string[] = [];
  if (series) bits.push(`Nova-lesstof: ${series.book}.`);
  else if (chapterN) {
    const hits = Object.values(SERIES).flatMap((s) =>
      s.chapters
        .filter((c) => c.n === chapterN)
        .map((c) => `${s.book}: hoofdstuk ${c.n} ${c.title}`),
    );
    if (hits.length) {
      bits.push(`Nova-plek zonder klas. Kan dit zijn: ${hits.join(" / ")}.`);
    } else {
      bits.push("Nova-opdracht, klas onbekend.");
    }
  } else {
    bits.push("Nova-opdracht, klas onbekend.");
  }
  if (chapter) bits.push(`Hoofdstuk ${chapter.n} ${chapter.title}.`);
  else if (chapterN && series) bits.push(`Hoofdstuk ${chapterN}.`);
  if (paragraph) bits.push(`Paragraaf ${paragraph.n} ${paragraph.title}.`);
  else if (paragraphN) bits.push(`Paragraaf ${paragraphN}.`);
  if (question) bits.push(`Opdracht ${question}.`);
  bits.push(
    "Stap 1: vraag of de leerling de tekst in Nova heeft gelezen, met deze plek. Antwoord later in de stijl van het Nova-antwoordenboek. Geen hele bladzijde overnemen.",
  );
  return bits.join(" ");
}

function parseLoose(value: string | undefined): number | undefined {
  const n = Number.parseInt(value?.trim() ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function novaRefLabel(input: {
  classCode: ClassCode | string;
  chapter?: string;
  paragraph?: string;
  question?: string;
}): string {
  const chapterN = parseLoose(input.chapter);
  const paragraphN = parseLoose(input.paragraph);
  const question = input.question?.trim() ?? "";
  if (!chapterN && !question) return "";
  const series = SERIES[seriesForClass(input.classCode)];
  const chapter = series.chapters.find((c) => c.n === chapterN);
  const paragraph = chapter?.paragraphs.find((p) => p.n === paragraphN);
  return [
    chapter ? `H${chapter.n} ${chapter.title}` : chapterN ? `H${chapterN}` : null,
    paragraph ? `§${paragraph.n}` : paragraphN ? `§${paragraphN}` : null,
    question ? `opdr. ${question}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}
