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

- "nask": VMBO-NaSk. Opdrachten uit Nova, begrippen, formules, toets/examen leren, Binas, vaardigheden, én hoe je NaSk leert (samenvatting, Onthoud, begrippenlijst, aanpak van een opdracht). Ook algemene lesvragen zoals "wat is dichtheid?" of "hoe schrijf ik een samenvatting van hoofdstuk 9?". Foto van een werkblad hoort hier. DAN de hint-stappen.

- "wink": het IS natuurkunde of scheikunde, maar niet van de VMBO-les (te hoog, te leuk-weetje, universiteit, quantum, relativiteit, zwarte gaten, organische chemie, trivia). DAN geen hints. Wel een knipoog, een heel kort simpel antwoord, en een zoekzin.

- "other": een ander vak of kletspraat (Nederlands-opstel, geschiedenis, Engels, aardrijkskunde, biologie als het geen NaSk is, grappen). Let op: "hoe maak ik een samenvatting" voor NaSk/toets IS nask, geen other. DAN geen hints en GEEN antwoord. Leeg answer.model_answer.

readable: false alleen als de foto/tekst onleesbaar is. Zet dan korte uitleg in question_short.

Als topic "nask":
- Twee smaken:
  1) Nova-opdracht (hst/par/vraag of een geplakte/gesnapte som): Stap 1 ALTIJD "Heb je de tekst gelezen?" plus Nova-plek.
  2) Algemene NaSk-vraag of toets-hulp (begrip, formule, samenvatting, hoe leer ik dit): Stap 1 is een eerste duw, geen eindrecept. Bij een samenvatting: stuur naar Onthoud en Begrippen van dat hoofdstuk. Vraag welk hoofdstuk als dat ontbreekt.
- Stap 2–3: kleine hints, geen volledig stappenplan-antwoord.
- hint_count 1–3. Nooit de uitkomst of het hele recept in stap 1.
- answer.model_answer: bij een som het modelantwoord (Nova-stijl). Bij toets-hulp/samenvatting: een kort bruikbaar recept (max 5 zinnen).
- search_query: "".
- Als de leerling een Nova-plek geeft (hst/par/opdracht): topic is nask. Gebruik die plek.

Als de leerling een Nova-hoofdstuk/paragraaf/opdracht meestuurt, is het lesstof. Geen wink. Geen other.

Als topic "wink":
- hint_count 1. Stappen mogen kort en leeg-achtig.
- answer.model_answer: één simpele zin, geen college.
- answer.explanation: knipoog, in de trant van: "Dit is wel natuurkunde, maar niet van onze les. Knipoog."
- search_query: een korte Nederlandse zoekzin waarmee de leerling dit kan opzoeken.

Als topic "other":
- hint_count 1. answer.model_answer: "".
- answer.explanation: "Oswald helpt alleen bij NaSk."
- search_query: "".
- question_short: zeg welk vak het lijkt, zonder de vraag te beantwoorden. Zeg erbij: NaSk, toetsen en samenvattingen mag wel.

Houd elk veld kort (max 4 zinnen).`;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "high" } };

export async function generateHelp(input: {
  text?: string;
  imageDataUrl?: string;
  novaContext?: string;
}): Promise<{ ok: true; help: HelpPayload } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Hulp is nu even niet beschikbaar. Probeer het later of vraag je docent." };
  }

  const userText = buildUserText(input.text, input.novaContext);
  const content: ContentPart[] = [{ type: "text", text: userText }];
  if (input.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: { url: input.imageDataUrl, detail: "high" },
    });
  }

  const body = {
    model: "grok-4.5",
    temperature: 0.2,
    max_tokens: 1200,
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
    const parsed = await callModel(apiKey, body);
    if (parsed) return { ok: true, help: parsed };
    if (input.imageDataUrl) {
      return generateHelp({
        text:
          input.text ||
          "De leerling stuurde een foto van een NaSk-vraag. De foto kon niet worden gelezen.",
        novaContext: input.novaContext,
      });
    }
    const again = await callModel(apiKey, { ...body, temperature: 0, max_tokens: 1400 });
    if (again) return { ok: true, help: again };
    return { ok: false, error: "Het antwoord was onduidelijk. Probeer de vraag opnieuw in te leveren." };
  } catch (err) {
    console.error("[oswald] xAI call failed", err);
    return { ok: false, error: "Hulp ophalen lukte niet. Probeer het nog eens." };
  }
}

async function callModel(
  apiKey: string,
  body: unknown,
): Promise<HelpPayload | null> {
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
    return null;
  }
  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return parseHelp(json.choices?.[0]?.message?.content ?? "");
}

function buildUserText(text: string | undefined, novaContext?: string): string {
  const trimmed = text?.trim() ?? "";
  const titles = STEP_TITLES.join(" / ");
  const nova = novaContext?.trim()
    ? `\n\n${novaContext}\n`
    : "\n";
  if (trimmed) {
    return `Vraag van een VMBO-leerling:${nova}\n${trimmed}\n\nClassificeer (nask / wink / other). Alleen bij nask: hulp zoals Nick Oswald (${titles}). JSON volgens schema.`;
  }
  if (novaContext?.trim()) {
    return `De leerling vroeg hulp bij een Nova-opdracht.${nova}\nGeen extra tekst, wel deze plek in het boek. Classificeer als nask. Hulp zoals Nick Oswald (${titles}). JSON volgens schema.`;
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
- Bij leren/samenvatting: mag je een stukje methode geven, geen heel opstel.
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
