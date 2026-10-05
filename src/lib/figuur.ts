/** Deterministische NaSk-figuren. Zelfde idee als Toetski: een spec, de code tekent. Geen beeldmodel. */

export type OnderdeelSoort =
  | "lamp"
  | "weerstand"
  | "schakelaar"
  | "stroommeter"
  | "spanningsmeter"
  | "motor"
  | "zekering";

export type Figuur =
  | {
      type: "schakelschema";
      schakeling: "serie" | "parallel";
      bron: "cel" | "wissel";
      onderdelen: { soort: OnderdeelSoort; label: string }[];
    }
  | {
      type: "grafiek";
      xLabel: string;
      yLabel: string;
      punten: { x: number; y: number }[];
      lijn: boolean;
    }
  | {
      type: "krachten";
      voorwerp: string;
      pijlen: { naam: string; richting: "omhoog" | "omlaag" | "links" | "rechts"; sterkte: 1 | 2 | 3 }[];
    }
  | {
      type: "meter";
      soort: "wijzer" | "kwh";
      eenheid: string;
      min: number;
      max: number;
      waarde: number;
    };

const ONDERDELEN = new Set<OnderdeelSoort>([
  "lamp",
  "weerstand",
  "schakelaar",
  "stroommeter",
  "spanningsmeter",
  "motor",
  "zekering",
]);

const RICHTINGEN = new Set(["omhoog", "omlaag", "links", "rechts"]);

export function verbodenGetallen(tekst: string): string[] {
  const found = tekst.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return [...new Set(found.filter((n) => n.replace(/[.,]/g, "").length >= 2 || n.includes(",") || n.includes(".")))];
}

function schoon(value: unknown, max: number): string {
  return String(value ?? "")
    .replace(/[<>&]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function labelVrij(value: unknown, max: number, verboden: string[]): string {
  const tekst = schoon(value, max);
  if (!tekst) return "";
  const kaal = tekst.toLowerCase().replace(/\s+/g, "");
  for (const v of verboden) {
    const stuk = v.toLowerCase().replace(/\s+/g, "");
    if (stuk.length >= 2 && kaal.includes(stuk)) return "";
  }
  return tekst;
}

function num(value: unknown): number | null {
  const n = typeof value === "number" ? value : Number(String(value ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function alsOnderdeel(value: unknown, verboden: string[]): { soort: OnderdeelSoort; label: string } | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { soort?: unknown; label?: unknown };
  const soort = schoon(row.soort, 20).toLowerCase() as OnderdeelSoort;
  if (!ONDERDELEN.has(soort)) return null;
  return { soort, label: labelVrij(row.label, 16, verboden) };
}

/** Plat model-JSON → figuur, of null als er niets te tekenen valt of de spec ongeldig is. */
export function figuurUitModel(raw: unknown, verboden: string[] = []): Figuur | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Record<string, unknown>;
  const soort = schoon(d.soort, 20).toLowerCase();
  if (!soort || soort === "geen") return null;

  if (soort === "schakelschema") {
    const schakeling = d.schakeling === "parallel" ? "parallel" : "serie";
    const bron = d.bron === "wissel" ? "wissel" : "cel";
    const onderdelen = (Array.isArray(d.onderdelen) ? d.onderdelen : [])
      .map((row) => alsOnderdeel(row, verboden))
      .filter((row): row is { soort: OnderdeelSoort; label: string } => Boolean(row))
      .slice(0, 4);
    if (!onderdelen.length) return null;
    return { type: "schakelschema", schakeling, bron, onderdelen };
  }

  if (soort === "grafiek") {
    const punten = (Array.isArray(d.punten) ? d.punten : [])
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const row = p as { x?: unknown; y?: unknown };
        const x = num(row.x);
        const y = num(row.y);
        if (x == null || y == null) return null;
        return { x, y };
      })
      .filter((p): p is { x: number; y: number } => Boolean(p))
      .slice(0, 8);
    if (punten.length < 2) return null;
    return {
      type: "grafiek",
      xLabel: labelVrij(d.xLabel, 28, verboden) || "x",
      yLabel: labelVrij(d.yLabel, 28, verboden) || "y",
      punten,
      lijn: d.lijn !== false,
    };
  }

  if (soort === "krachten") {
    const pijlen = (Array.isArray(d.pijlen) ? d.pijlen : [])
      .map((p) => {
        if (!p || typeof p !== "object") return null;
        const row = p as { naam?: unknown; richting?: unknown; sterkte?: unknown };
        const richting = schoon(row.richting, 12).toLowerCase();
        if (!RICHTINGEN.has(richting)) return null;
        const sterkte = Math.round(num(row.sterkte) ?? 2);
        return {
          naam: labelVrij(row.naam, 12, verboden) || "F",
          richting: richting as "omhoog" | "omlaag" | "links" | "rechts",
          sterkte: (sterkte <= 1 ? 1 : sterkte >= 3 ? 3 : 2) as 1 | 2 | 3,
        };
      })
      .filter((p): p is { naam: string; richting: "omhoog" | "omlaag" | "links" | "rechts"; sterkte: 1 | 2 | 3 } => Boolean(p))
      .slice(0, 4);
    if (!pijlen.length) return null;
    return {
      type: "krachten",
      voorwerp: labelVrij(d.voorwerp, 18, verboden),
      pijlen,
    };
  }

  if (soort === "meter") {
    const meterSoort = d.meterSoort === "kwh" || d.soortMeter === "kwh" ? "kwh" : "wijzer";
    if (meterSoort === "kwh") {
      const waarde = num(d.waarde) ?? 0;
      return {
        type: "meter",
        soort: "kwh",
        eenheid: "kWh",
        min: 0,
        max: 0,
        waarde: Math.max(0, waarde),
      };
    }
    const min = num(d.min) ?? 0;
    const max = num(d.max) ?? 10;
    const hi = max > min ? max : min + 1;
    const waarde = Math.min(hi, Math.max(min, num(d.waarde) ?? min));
    return {
      type: "meter",
      soort: "wijzer",
      eenheid: labelVrij(d.eenheid, 8, verboden) || "V",
      min,
      max: hi,
      waarde,
    };
  }

  return null;
}

export function figuurOmschrijving(figuur: Figuur): string {
  if (figuur.type === "schakelschema") return "Schakelschema";
  if (figuur.type === "grafiek") return `Grafiek ${figuur.yLabel} tegen ${figuur.xLabel}`;
  if (figuur.type === "krachten") return "Krachtpijlen";
  return figuur.soort === "kwh" ? "kWh-meter" : `Meter in ${figuur.eenheid}`;
}
