import { STEP_TITLES } from "@/lib/defaults";

export type HelpPayload = {
  readable: boolean;
  topic: "nask" | "wink" | "other";
  question_short: string;
  hint_count: 1 | 2 | 3;
  search_query: string;
  step1: { help: string; tip: string; extra_tip: string };
  step2: { help: string; tip: string; extra_tip: string };
  step3: { help: string; tip: string; extra_tip: string };
  answer: { model_answer: string; explanation: string };
};

const HELP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "readable",
    "topic",
    "question_short",
    "hint_count",
    "search_query",
    "step1",
    "step2",
    "step3",
    "answer",
  ],
  properties: {
    readable: { type: "boolean" },
    topic: { type: "string", enum: ["nask", "wink", "other"] },
    question_short: { type: "string" },
    hint_count: { type: "integer", enum: [1, 2, 3] },
    search_query: { type: "string" },
    step1: stepSchema(),
    step2: stepSchema(),
    step3: stepSchema(),
    answer: {
      type: "object",
      additionalProperties: false,
      required: ["model_answer", "explanation"],
      properties: {
        model_answer: { type: "string" },
        explanation: { type: "string" },
      },
    },
  },
} as const;

function stepSchema() {
  return {
    type: "object",
    additionalProperties: false,
    required: ["help", "tip", "extra_tip"],
    properties: {
      help: { type: "string" },
      tip: { type: "string" },
      extra_tip: { type: "string" },
    },
  } as const;
}

const SYSTEM_PROMPT = `Je bent Oswald: de NaSk-hulpleraar in de klas van docent Nick Oswald (Aeres, VMBO). Je praat zoals hij. Nuchter, kort, vriendelijk. Geen emoji. Geen kinderachtige toon.

Taal: Nederlands. Korte zinnen. Simpele woorden. Geen overbodig jargon.

Eerst classificeren. Zet topic:

- "nask": een echte VMBO-NaSk-opdracht uit de lesstof. Natuurkunde of scheikunde op dat niveau (snelheid, dichtheid, kracht, stroom, warmte, stoffen, reacties, formules zoals s = v × t). Ook een foto van een NaSk-werkblad. DAN de hint-stappen.

- "wink": het IS natuurkunde of scheikunde, maar niet van de VMBO-les (te hoog, te leuk-weetje, universiteit, quantum, relativiteit, zwarte gaten, organische chemie, trivia). DAN geen hints. Wel een knipoog, een heel kort simpel antwoord, en een zoekzin.

- "other": een ander vak of geen schoolvraag (Nederlands, geschiedenis, Engels, aardrijkskunde, biologie, kale wiskunde zonder NaSk, grappen, chat). DAN geen hints en GEEN antwoord. Leeg answer.model_answer.

readable: false alleen als de foto/tekst onleesbaar is. Zet dan korte uitleg in question_short.

Als topic "nask":
- Stap 1 ALTIJD: "Heb je de tekst gelezen?" plus verwijzing naar blz/alinea/figuur/tabel als je die ziet.
- Stap 2–3: kleine hints, geen eindantwoord.
- hint_count 1–3. Nooit de uitkomst in stap 1–3.
- answer.model_answer: modelantwoord. explanation: 2–4 zinnen.
- search_query: "".

Als topic "wink":
- hint_count 1. Stappen mogen kort en leeg-achtig.
- answer.model_answer: één simpele zin, geen college.
- answer.explanation: knipoog, in de trant van: "Dit is wel natuurkunde, maar niet van onze les. Knipoog."
- search_query: een korte Nederlandse zoekzin waarmee de leerling dit kan opzoeken.

Als topic "other":
- hint_count 1. answer.model_answer: "".
- answer.explanation: "Oswald helpt alleen bij NaSk."
- search_query: "".
- question_short: zeg welk vak het lijkt, zonder de vraag te beantwoorden.

Houd elk veld kort (max 4 zinnen).`;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "high" } };

export async function generateHelp(input: {
  text?: string;
  imageDataUrl?: string;
}): Promise<{ ok: true; help: HelpPayload } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Hulp is nu even niet beschikbaar. Probeer het later of vraag je docent." };
  }

  const userText = buildUserText(input.text);
  const content: ContentPart[] = [{ type: "text", text: userText }];
  if (input.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: { url: input.imageDataUrl, detail: "high" },
    });
  }

  const body = {
    model: "grok-4.5",
    temperature: 0.3,
    max_tokens: 1800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "nask_hulp",
        strict: true,
        schema: HELP_SCHEMA,
      },
    },
  };

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("[oswald] xAI error", res.status, errText.slice(0, 400));
      if (res.status === 400 && input.imageDataUrl) {
        return generateHelp({ text: input.text || "De leerling stuurde een foto van een NaSk-vraag. De foto kon niet worden gelezen." });
      }
      return { ok: false, error: "Hulp ophalen lukte niet. Probeer het nog eens." };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const parsed = parseHelp(raw);
    if (!parsed) {
      return { ok: false, error: "Het antwoord was onduidelijk. Probeer de vraag opnieuw in te leveren." };
    }
    return { ok: true, help: parsed };
  } catch (err) {
    console.error("[oswald] xAI call failed", err);
    return { ok: false, error: "Hulp ophalen lukte niet. Probeer het nog eens." };
  }
}

function buildUserText(text: string | undefined): string {
  const trimmed = text?.trim() ?? "";
  const titles = STEP_TITLES.join(" / ");
  if (trimmed) {
    return `Vraag van een VMBO-leerling:\n\n${trimmed}\n\nClassificeer (nask / wink / other). Alleen bij nask: hulp zoals Nick Oswald (${titles}). JSON volgens schema.`;
  }
  return `De leerling stuurde een foto/screenshot. Lees wat er staat. Classificeer (nask / wink / other). Alleen bij nask: hulp zoals Nick Oswald (${titles}). JSON volgens schema.`;
}

function parseHelp(raw: string): HelpPayload | null {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "");
  try {
    const data = JSON.parse(cleaned) as HelpPayload;
    if (typeof data.readable !== "boolean") return null;
    if (typeof data.question_short !== "string") return null;
    const topic = data.topic;
    if (topic !== "nask" && topic !== "wink" && topic !== "other") return null;
    if (typeof data.search_query !== "string") data.search_query = "";
    const count = Number(data.hint_count);
    if (count !== 1 && count !== 2 && count !== 3) return null;
    data.hint_count = count;
    if (!isStep(data.step1) || !isStep(data.step2) || !isStep(data.step3)) return null;
    if (
      !data.answer ||
      typeof data.answer.model_answer !== "string" ||
      typeof data.answer.explanation !== "string"
    ) {
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

function isStep(value: unknown): value is HelpPayload["step1"] {
  if (!value || typeof value !== "object") return false;
  const v = value as HelpPayload["step1"];
  return (
    typeof v.help === "string" &&
    typeof v.tip === "string" &&
    typeof v.extra_tip === "string"
  );
}

const FOLLOWUP_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["reply"],
  properties: {
    reply: { type: "string" },
  },
} as const;

const FOLLOWUP_PROMPT = `Je bent Oswald, NaSk-hulpleraar van Nick Oswald (VMBO). De leerling heeft al minstens één hint gehad en stelt een wedervraag.

Regels:
- Nederlands. Korte zinnen. Simpel.
- Geen eindantwoord. Geen uitkomst. Geen getal dat de leerling moet vinden.
- Help de wedervraag: leg een begrip uit, stuur terug naar de tekst/blz/alinea, of geef een kleine duw.
- Max 4 zinnen. Geen emoji.`;

export async function generateFollowup(input: {
  questionShort: string;
  shownHints: string[];
  followup: string;
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Hulp is nu even niet beschikbaar. Probeer het later of vraag je docent." };
  }

  const hints = input.shownHints.filter(Boolean).join("\n- ");
  const user = `Opdracht (kort): ${input.questionShort || "(foto)"}

Hints die de leerling al zag:
- ${hints || "(eerste hint)"}

Wedervraag van de leerling:
${input.followup}

Beantwoord alleen de wedervraag. Geen eindantwoord. JSON volgens schema.`;

  const body = {
    model: "grok-4.5",
    temperature: 0.3,
    max_tokens: 400,
    messages: [
      { role: "system", content: FOLLOWUP_PROMPT },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "wedervraag",
        strict: true,
        schema: FOLLOWUP_SCHEMA,
      },
    },
  };

  try {
    const res = await fetch("https://api.x.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      return { ok: false, error: "Wedervraag lukte niet. Probeer het nog eens." };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const data = JSON.parse(cleaned) as { reply?: string };
    if (!data.reply || typeof data.reply !== "string") {
      return { ok: false, error: "Het antwoord was onduidelijk. Probeer het nog eens." };
    }
    return { ok: true, reply: data.reply.trim() };
  } catch {
    return { ok: false, error: "Wedervraag lukte niet. Probeer het nog eens." };
  }
}
