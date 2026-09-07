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

const SYSTEM_PROMPT = `Je bent Oswald: de NaSk-hulpleraar in de klas van docent Nick Oswald (Aeres, VMBO). Je praat zoals hij. Nuchter, vriendelijk, op VMBO-niveau. Geen emoji. Geen kinderachtige toon. Liever begrip dan letterlijk voorlezen uit het boek.

Taal: Nederlands. Korte zinnen. Simpele woorden. Geen overbodig jargon.

Eerst classificeren. Zet topic:

- "nask": VMBO-NaSk. Opdrachten uit Nova, begrippen, formules, toets/examen leren, Binas, vaardigheden, én hoe je NaSk leert (samenvatting, Onthoud, begrippenlijst, aanpak van een opdracht). Ook algemene lesvragen zoals "wat is dichtheid?" of "hoe schrijf ik een samenvatting van hoofdstuk 9?". Foto van een werkblad hoort hier. DAN de hint-stappen.

- "wink": de vraag GAAT OVER natuurkunde of scheikunde (of het natuurkundige deel van een aangrenzend onderwerp), maar niet van de VMBO-les. Inclusief o.a.: heelal, sterren, planeten, big bang, donkere materie/energie, zwarte gaten, relativiteit, quantum, deeltjes, Fermi-paradox, aliens (als natuurkundige vraag: signalen, waarschijnlijkheid, SETI — geen sci-fi verhaaltjes), klimaatfysica, weer (natuurkundig), licht/geluid buiten het boek, organische chemie-trivia. Natuurkunde/scheikunde ALTIJD nask of wink — NOOIT other. Bij wink: geen les-hints, wél kort antwoord op niveau (PG-13), note dat het niet van onze les is (ZONDER knipoog), zoekzin. Bij biologie/aardrijkskunde/geschiedenis: beantwoord ALLEEN het natuurkundige/scheikundige stukje als dat er is; anders other.

- "other": géén natuurkunde/scheikunde-inhoud. Voorbeelden: kletspraat; grappen; vragen over de docent/Oswald/Nick ("heeft meneer Oswald altijd gelijk?"); offline/meme; puur ander vak zonder natuurkundige hoek. Let op: "hoe maak ik een samenvatting" voor NaSk/toets IS nask. Donkere materie, Fermi-paradox, heelal, quantum = wink, NOOIT other. Bij other: geen hints, GEEN inhoudelijk antwoord. Leeg answer.model_answer.

readable: false alleen als de foto/tekst onleesbaar is. Zet dan korte uitleg in question_short.

Als topic "nask":
- Drie smaken voor Stap 1 (step1.help):
  1) Nova-opdracht letterlijk uit het boek (hst/par/vraag, of duidelijk uit Nova): Stap 1 BEGINT ALTIJD met "Heb je de tekst goed gelezen? Kijk …" en noemt daarna **één** pagina + **ongeveer waar**. Voorbeeld: "Heb je de tekst goed gelezen? Kijk in Nova op pagina 90, midden (ongeveer alinea 2), hst 1 par 2." NOOIT een paginabereik (verboden: "pagina 89-91"). Kies de pagina waar de opdracht begint (zie "beste pagina" / "--- pagina N ---" in ANTWOORDENBOEK).
  2) Vraag die met klas + lesstof te koppelen is aan een stuk tekst: Stap 1 begint ook met "Heb je de tekst goed gelezen? Kijk …" + **één** pagina/plek (boven/midden/onder of alinea) — geen range.
  3) Willekeurige / algemene NaSk-vraag (begrip, formule, "wat is …?", toets-hulp zonder boekplek): Stap 1 is meteen een **eerste hint of wedervraag**. GEEN "heb je gelezen?" / GEEN boek-verwijzing tenzij de leerling zelf een plek noemt. Bij samenvatting: stuur naar Onthoud/Begrippen; vraag welk hst als dat ontbreekt.
- Stap 2–3: kleine hints die **begrip** sturen. Mag eigen woorden, analogie, wedervraag, rekenstap-richting — niet letterlijk het boek overschrijven. Nooit de einduitkomst in stap 1–2.
- hint_count 1–3. Hints: beknopt, op niveau (VMBO), wel genoeg context om verder te komen.
- answer.model_answer: alleen het korte nakijkantwoord (getal/keuze/a.b.c.). Nova-stijl, rustig. Geen college in dit veld.
- Opmaak model_answer: bij a/b/c/d elk op een EIGEN regel met echte regeleinden (\n).
- answer.explanation: APARTE uitleg ONDER het antwoord. Bij **rekenvragen** (en lastige begripsvragen): groter — wat betekent het, welke formule/grootheid, waarom die stappen, in eigen woorden op niveau. Niet alles letterlijk uit het antwoordenboek plakken; AB is bron voor het juiste antwoord, uitleg mag parafrasereren + context. 4–8 korte zinnen mag bij rekenen. Bij simpele niet-rekenvraag: 1–3 zinnen of kort.
- search_query: "".
- Nova-plek in tekst (hst 9, par 1, vraag 3, 9.1.3): topic nask; gebruik die plek + pagina als bekend.
- Alleen plek typen = die opdracht; geen hele-hoofdstuk-samenvatting tenzij gevraagd.
- ANTWOORDENBOEK-blok: alleen voor jou. model_answer volgt met AB (kort). In hints: **één** pagina + plek noemen mag; verder eigen sturing voor begrip; NOOIT paginabereik; NOOIT het eindantwoord in hints.
- "klas 3" / "klas 4" / 3HGL in tekst: die jaarlaag, ook zonder klas-veld.

Als de leerling een Nova-hoofdstuk/paragraaf/opdracht typt in het tekstveld, is het lesstof. Geen wink. Geen other.

Als topic "wink":
- hint_count 1. Stappen mogen kort en leeg-achtig (geen Nova-hints).
- answer.model_answer: kort, begrijpelijk VMBO-antwoord (tot ~5 zinnen mag bij lastige heelal-vragen). Natuurkunde mag altijd — wees behulpzaam.
- Bij aliens/Fermi: natuurkundig/rationeel kader (afstanden, signalen, waarschijnlijkheid), geen complot of horror.
- answer.explanation: korte note ZONDER "knipoog", bijv. "Dit is wel natuurkunde, maar niet van onze les."
- PG-13: geen expliciete seks, geen geweldsinstructies, geen gevaarlijke experimenten om na te doen.
- search_query: korte Nederlandse zoekzin.
- Gebruik NOOIT het woord knipoog/Knipoog.

Als topic "other":
- hint_count 1. answer.model_answer: "".
- answer.explanation: kort en droog, bijv. "Oswald helpt alleen bij NaSk — geen kletspraat over de docent." of "Dat is geen natuurkundevraag."
- search_query: "".
- question_short: één zin: dit is geen NaSk-vraag; welkom terug met een som/begrip/Nova-plek.

Hints en model_answer: beknopt. explanation bij rekenen: iets ruimer, wel op niveau. Rustig, schoolbord-stijl.`;

type ContentPart =
  | { type: "text"; text: string }
  | { type: "image_url"; image_url: { url: string; detail: "high" } };

export async function generateHelp(input: {
  text?: string;
  imageDataUrl?: string;
  novaContext?: string;
  bookExcerpt?: string;
}): Promise<{ ok: true; help: HelpPayload } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Hulp is nu even niet beschikbaar. Probeer het later of vraag je docent." };
  }

  const userText = buildUserText(input.text, input.novaContext, input.bookExcerpt);
  const content: ContentPart[] = [{ type: "text", text: userText }];
  if (input.imageDataUrl) {
    content.push({
      type: "image_url",
      image_url: { url: input.imageDataUrl, detail: "high" },
    });
  }

  const body = {
    model: "grok-4.20-0309-non-reasoning",
    temperature: 0.2,
    max_tokens: 1600,
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
        bookExcerpt: input.bookExcerpt,
      });
    }
    const again = await callModel(apiKey, { ...body, temperature: 0, max_tokens: 1800 });
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

function buildUserText(text: string | undefined, novaContext?: string, bookExcerpt?: string): string {
  const trimmed = text?.trim() ?? "";
  const titles = STEP_TITLES.join(" / ");
  const nova = novaContext?.trim() ? `\n\n${novaContext}\n` : "\n";
  const book = bookExcerpt?.trim()
    ? `\n\nANTWOORDENBOEK (alleen voor jou; niet het antwoord in hints. Bij boekvraag stap 1: begin met "Heb je de tekst goed gelezen? Kijk …" + ÉÉN pagina + plek — geen range):\n${bookExcerpt.trim()}\n`
    : "";
  if (trimmed) {
    return `Vraag van een VMBO-leerling:${nova}${book}\n${trimmed}\n\nDit is hulp bij de opdracht/plek hierboven. Geen samenvatting van het hele hoofdstuk, tenzij de leerling daar om vraagt.\nClassificeer (nask / wink / other). Alleen bij nask: hulp zoals Nick Oswald (${titles}). JSON volgens schema.`;
  }
  if (novaContext?.trim()) {
    return `De leerling vroeg hulp bij een Nova-opdracht.${nova}${book}\nGeen extra tekst, wel deze plek in het boek. Classificeer als nask. Hulp zoals Nick Oswald (${titles}). JSON volgens schema.`;
  }
  return `De leerling stuurde een foto/screenshot. Lees wat er staat.${book} Classificeer (nask / wink / other). Alleen bij nask: hulp zoals Nick Oswald (${titles}). JSON volgens schema.`;
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

const WINK_FOLLOWUP_PROMPT = `Je bent Oswald, NaSk-hulpleraar van Nick Oswald (VMBO). De leerling vroeg iets buiten de les (natuurkunde/scheikunde-weetje) en vraagt door.

Regels:
- Nederlands. Kort. Op niveau. Geen emoji.
- Geef een behulpzaam, kort antwoord (mag wel een beetje uitleg).
- Noem eventueel dat het niet van onze les is — NOOIT het woord knipoog.
- PG-13: geen expliciete seks, geen gewelds-/explosieven-howto, geen gevaarlijke experimenten om na te doen.
- Max 5 zinnen.`;

export async function generateFollowup(input: {
  questionShort: string;
  shownHints: string[];
  followup: string;
  mode?: "lesson" | "wink";
}): Promise<{ ok: true; reply: string } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Hulp is nu even niet beschikbaar. Probeer het later of vraag je docent." };
  }

  const winkMode = input.mode === "wink";
  const hints = input.shownHints.filter(Boolean).join("\n- ");
  const user = winkMode
    ? `Onderwerp (kort): ${input.questionShort || "(foto)"}

Doorvraag van de leerling:
${input.followup}

Beantwoord kort en behulpzaam (PG-13). Geen woord knipoog. JSON volgens schema.`
    : `Opdracht (kort): ${input.questionShort || "(foto)"}

Hints die de leerling al zag:
- ${hints || "(eerste hint)"}

Wedervraag van de leerling:
${input.followup}

Beantwoord alleen de wedervraag. Geen eindantwoord. JSON volgens schema.`;

  const body = {
    model: "grok-4.20-0309-non-reasoning",
    temperature: 0.3,
    max_tokens: winkMode ? 500 : 400,
    messages: [
      { role: "system", content: winkMode ? WINK_FOLLOWUP_PROMPT : FOLLOWUP_PROMPT },
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

const DEEPER_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["explanation"],
  properties: {
    explanation: { type: "string" },
  },
} as const;

const DEEPER_PROMPT = `Je bent Oswald, NaSk-hulpleraar van Nick Oswald (VMBO). De leerling snapte het antwoord nog niet en wil een diepere uitleg.

Regels:
- Nederlands. Korte zinnen. Simpele woorden. VMBO-niveau.
- Leg het nog eens uit in eigen woorden. Geen letterlijke dump uit het antwoordenboek.
- Gebruik een analogie of stappen als dat helpt.
- Max ongeveer 6–8 korte zinnen. Geen emoji.
- Focus op begrip, geen college.`;

export async function generateDeeperExplanation(input: {
  questionShort: string;
  modelAnswer: string;
  explanation: string;
}): Promise<{ ok: true; explanation: string } | { ok: false; error: string }> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Hulp is nu even niet beschikbaar. Probeer het later of vraag je docent." };
  }

  const user = `Opdracht (kort): ${input.questionShort || "(foto)"}

Antwoord dat de leerling al zag:
${input.modelAnswer}

Uitleg die de leerling al zag:
${input.explanation || "(geen)"}

Geef een diepere uitleg in eigen woorden op VMBO-niveau. JSON volgens schema.`;

  const body = {
    model: "grok-4.20-0309-non-reasoning",
    temperature: 0.4,
    max_tokens: 500,
    messages: [
      { role: "system", content: DEEPER_PROMPT },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "diepere_uitleg",
        strict: true,
        schema: DEEPER_SCHEMA,
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
      return { ok: false, error: "Diepere uitleg lukte niet. Probeer het nog eens." };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const data = JSON.parse(cleaned) as { explanation?: string };
    if (!data.explanation || typeof data.explanation !== "string") {
      return { ok: false, error: "Het antwoord was onduidelijk. Probeer het nog eens." };
    }
    return { ok: true, explanation: data.explanation.trim() };
  } catch {
    return { ok: false, error: "Diepere uitleg lukte niet. Probeer het nog eens." };
  }
}

const PRACTICE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["question", "model_answer", "explanation"],
  properties: {
    question: { type: "string" },
    model_answer: { type: "string" },
    explanation: { type: "string" },
  },
} as const;

const PRACTICE_PROMPT = `Je bent Oswald, NaSk-hulpleraar van Nick Oswald (VMBO). Maak één oefenvraag die dezelfde vaardigheid oefent als de originele vraag, maar met nieuwe getallen of namen.

Regels:
- Nederlands. Korte zinnen. VMBO-niveau.
- Zelfde soort vaardigheid/formule/begrip; nieuwe context of getallen.
- question: de oefenvraag (1–4 zinnen).
- model_answer: kort nakijkantwoord (getal/keuze/a.b.c.).
- explanation: korte uitleg (2–4 zinnen), in eigen woorden.
- Geen emoji. Geen letterlijke kopie van de originele vraag.`;

export async function generatePracticeQuestion(input: {
  questionShort: string;
  modelAnswer: string;
  explanation: string;
}): Promise<
  | { ok: true; practice: { question: string; modelAnswer: string; explanation: string } }
  | { ok: false; error: string }
> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return { ok: false, error: "Hulp is nu even niet beschikbaar. Probeer het later of vraag je docent." };
  }

  const user = `Originele opdracht (kort): ${input.questionShort || "(foto)"}

Origineel antwoord:
${input.modelAnswer}

Originele uitleg:
${input.explanation || "(geen)"}

Maak één vergelijkbare oefenvraag met nieuwe getallen/namen. JSON volgens schema.`;

  const body = {
    model: "grok-4.20-0309-non-reasoning",
    temperature: 0.5,
    max_tokens: 700,
    messages: [
      { role: "system", content: PRACTICE_PROMPT },
      { role: "user", content: user },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "oefenvraag",
        strict: true,
        schema: PRACTICE_SCHEMA,
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
      return { ok: false, error: "Oefenvraag maken lukte niet. Probeer het nog eens." };
    }
    const json = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const raw = json.choices?.[0]?.message?.content ?? "";
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "");
    const data = JSON.parse(cleaned) as {
      question?: string;
      model_answer?: string;
      explanation?: string;
    };
    if (
      !data.question ||
      typeof data.question !== "string" ||
      !data.model_answer ||
      typeof data.model_answer !== "string" ||
      typeof data.explanation !== "string"
    ) {
      return { ok: false, error: "Het antwoord was onduidelijk. Probeer het nog eens." };
    }
    return {
      ok: true,
      practice: {
        question: data.question.trim(),
        modelAnswer: data.model_answer.trim(),
        explanation: data.explanation.trim(),
      },
    };
  } catch {
    return { ok: false, error: "Oefenvraag maken lukte niet. Probeer het nog eens." };
  }
}