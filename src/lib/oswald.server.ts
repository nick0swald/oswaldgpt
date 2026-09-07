import { timingSafeEqual, randomUUID } from "node:crypto";
import { dbSource, getSql } from "@/lib/db";
import {
  CLASS_CODES,
  DEFAULT_NAMES,
  MAX_FOLLOWUPS,
  MAX_QUESTIONS_PER_SESSION,
  STEP_TITLES,
} from "@/lib/defaults";
import { generateFollowup, generateHelp, type HelpPayload } from "@/lib/ai.server";
import { answerBookExcerpt } from "@/lib/answer-book";
import { lookupNova, parseNovaFromText, seriesForClass, seriesFromQuery } from "@/lib/nova";
import type { AnswerView, DayStat, FollowUp, StepView, SubmitResult, WinkView } from "@/lib/types";

export type { AnswerView, StepView };

const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;

function bookContext(input: {
  classCode?: string;
  chapter?: string;
  paragraph?: string;
  question?: string;
  query?: string;
}): string {
  const classCode = input.classCode?.trim() ?? "";
  const known = CLASS_CODES.includes(classCode as (typeof CLASS_CODES)[number]);
  const fromText = seriesFromQuery(input.query ?? "");
  return answerBookExcerpt({
    series: known ? seriesForClass(classCode) : fromText,
    chapter: input.chapter,
    paragraph: input.paragraph,
    question: input.question,
    query: input.query,
  });
}

function cleanOptionalName(value: string | undefined): string | null {
  const cleaned = (value ?? "").trim().replace(/\s+/g, " ");
  if (!cleaned) return "";
  if (cleaned.length > 40 || !NAME_PATTERN.test(cleaned)) return null;
  return cleaned;
}

type SessionRow = {
  id: string;
  student_name: string;
  class_code: string;
  submitted_question: boolean;
  questions_count: number;
  steps_shown: number;
  extra_tips: number;
  extra_mask: number;
  answer_shown: boolean;
  help_json: string | null;
};

type MemSession = SessionRow & {
  created_at: string;
  question_submitted_at: string | null;
  answer_shown_at: string | null;
};

const memRoot = globalThis as typeof globalThis & {
  __oswaldMem?: { sessions: Map<string, MemSession> };
};

function memory(): { sessions: Map<string, MemSession> } {
  memRoot.__oswaldMem ??= { sessions: new Map() };
  return memRoot.__oswaldMem;
}

function nowIso(): string {
  return new Date().toISOString();
}

function emptySession(id: string, name: string, classCode: string): MemSession {
  return {
    id,
    student_name: name,
    class_code: classCode,
    submitted_question: false,
    questions_count: 0,
    steps_shown: 0,
    extra_tips: 0,
    extra_mask: 0,
    answer_shown: false,
    help_json: null,
    created_at: nowIso(),
    question_submitted_at: null,
    answer_shown_at: null,
  };
}

function patchMem(id: string, patch: Partial<MemSession>): MemSession | null {
  const current = memory().sessions.get(id);
  if (!current) return null;
  const next = { ...current, ...patch };
  memory().sessions.set(id, next);
  return next;
}

export function pinMatches(input: string): boolean {
  const expected = (process.env.DOCENT_PIN ?? "0624345142").trim();
  const a = Buffer.from(input.trim().normalize("NFKC"));
  const b = Buffer.from(expected.normalize("NFKC"));
  if (a.length !== b.length) {
    timingSafeEqual(Buffer.alloc(b.length), b);
    return false;
  }
  return timingSafeEqual(a, b);
}

export async function ensureSeed(): Promise<void> {
  try {
    const sql = await getSql();
    const rows = await sql<{ n: number }>`select count(*)::int as n from roster_names`;
    if ((rows[0]?.n ?? 0) > 0) return;
    for (const name of DEFAULT_NAMES) {
      await sql`insert into roster_names (name) values (${name}) on conflict (name) do nothing`;
    }
  } catch (err) {
    console.error("[oswald] ensureSeed db", err);
  }
}

export async function listRosterNames(): Promise<string[]> {
  try {
    await ensureSeed();
    const sql = await getSql();
    const rows = await sql<{ name: string }>`select name from roster_names order by name`;
    return rows.map((r) => r.name);
  } catch (err) {
    console.error("[oswald] listRosterNames db", err);
    return [...DEFAULT_NAMES];
  }
}

export async function startSession(input: {
  name?: string;
  classCode?: string;
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  const classCode = CLASS_CODES.includes(input.classCode as (typeof CLASS_CODES)[number])
    ? input.classCode!
    : "";
  const name = cleanOptionalName(input.name);
  if (name === null) {
    return { ok: false, error: "Gebruik alleen letters in de naam, of laat leeg." };
  }
  const id = randomUUID();
  memory().sessions.set(id, emptySession(id, name, classCode));
  try {
    const sql = await getSql();
    await sql`
      insert into sessions (id, student_name, class_code)
      values (${id}, ${name}, ${classCode})
    `;
  } catch (err) {
    console.error("[oswald] startSession db", err);
  }
  return { ok: true, sessionId: id };
}

export async function submitQuestion(input: {
  sessionId: string;
  text?: string;
  imageDataUrl?: string;
  chapter?: string;
  paragraph?: string;
  questionNo?: string;
}): Promise<SubmitResult> {
  let session = await loadSession(input.sessionId);
  if (!session) {
    const started = await startSession({});
    if (!started.ok) return started;
    session = await loadSession(started.sessionId);
    if (!session) {
      const created = emptySession(started.sessionId, "", "");
      memory().sessions.set(created.id, created);
      session = created;
    }
  }

  const text = input.text?.trim() ?? "";
  const image = input.imageDataUrl?.trim();
  if (text && !image && isOffTopicBanter(text)) {
    const id = randomUUID();
    const row = emptySession(id, name, classCode);
    row.submitted_question = true;
    row.questions_count = 1;
    row.help_json = JSON.stringify({
      readable: true,
      topic: "other",
      question_short: "Geen NaSk-vraag — kletspraat over de docent telt niet.",
      hint_count: 1,
      search_query: "",
      step1: { help: "", tip: "", extra_tip: "" },
      step2: { help: "", tip: "", extra_tip: "" },
      step3: { help: "", tip: "", extra_tip: "" },
      answer: { model_answer: "", explanation: "Oswald helpt alleen bij NaSk." },
    });
    row.question_submitted_at = nowIso();
    memory().sessions.set(id, row);
    try {
      const sql = await getSql();
      await sql`
        insert into sessions (id, student_name, class_code, submitted_question, questions_count,
          steps_shown, extra_tips, extra_mask, answer_shown, help_json,
          question_submitted_at, answer_shown_at, last_active_at)
        values (
          ${id}, ${name}, ${classCode}, true, 1,
          0, 0, 0, false, ${row.help_json},
          now(), null, now()
        )
      `;
    } catch (err) {
      console.error("[oswald] askHelp banter save", err);
    }
    return {
      ok: true,
      kind: "other",
      sessionId: id,
      message:
        "Leuk geprobeerd. Oswald helpt bij natuurkunde en scheikunde — niet bij kletspraat over de docent. Plak een som of begrip.",
    };
  }

  const parsed = parseNovaFromText(text);
  const novaContext = lookupNova({
    classCode: session.class_code,
    chapter: input.chapter || parsed.chapter,
    paragraph: input.paragraph || parsed.paragraph,
    question: input.questionNo || parsed.question,
  });
  if (!text && !image) {
    return { ok: false, error: "Plak de vraag of snap 'm." };
  }
  if (image && image.length > 1_500_000) {
    return { ok: false, error: "De foto is te groot. Maak een scherpere, kleinere foto." };
  }
  if (image && !image.startsWith("data:image/")) {
    return { ok: false, error: "Dit bestand is geen foto." };
  }
  if (session.questions_count >= MAX_QUESTIONS_PER_SESSION) {
    return { ok: false, error: "Je hebt genoeg vragen gesteld. Vraag je docent als je verder wilt." };
  }

  const generated = await generateHelp({
    text: text || undefined,
    imageDataUrl: image,
    novaContext: novaContext || undefined,
    bookExcerpt: bookContext({
      classCode: session.class_code,
      chapter: input.chapter || parsed.chapter,
      paragraph: input.paragraph || parsed.paragraph,
      question: input.questionNo || parsed.question,
      query: text,
    }) || undefined,
  });
  if (!generated.ok) return generated;
  if (novaContext) {
    generated.help.topic = "nask";
    generated.help.readable = true;
  }
  if (!generated.help.readable) {
    return {
      ok: false,
      error:
        generated.help.question_short?.trim() ||
        "Ik kan de vraag niet goed lezen. Typ de vraag of maak een scherpere foto.",
    };
  }

  try {
    const topic = generated.help.topic ?? "nask";
    const isWink = topic === "wink";
    const isOther = topic === "other";
    try {
      const sql = await getSql();
      await sql`
    update sessions
    set submitted_question = true,
        questions_count = questions_count + 1,
        steps_shown = ${isOther || isWink ? 0 : 1},
        extra_tips = 0,
        extra_mask = 0,
        answer_shown = ${isWink},
        help_json = ${JSON.stringify(generated.help)},
        question_submitted_at = now(),
        answer_shown_at = ${isWink ? new Date().toISOString() : null},
        last_active_at = now()
    where id = ${session.id}
  `;
    } catch (err) {
      console.error("[oswald] submit save failed", err);
    }
    patchMem(session.id, {
      submitted_question: true,
      questions_count: session.questions_count + 1,
      steps_shown: isOther || isWink ? 0 : 1,
      extra_tips: 0,
      extra_mask: 0,
      answer_shown: isWink,
      help_json: JSON.stringify(generated.help),
      question_submitted_at: nowIso(),
      answer_shown_at: isWink ? nowIso() : null,
    });

    if (isOther) {
      return {
        ok: true,
        kind: "other",
        sessionId: session.id,
        message:
          "Oswald helpt bij natuurkunde en scheikunde. Geen kletspraat of andere vakken — plak een som, begrip of Nova-plek.",
      };
    }
    if (isWink) {
      const wink: WinkView = {
        questionShort: generated.help.question_short,
        wink: (generated.help.answer.explanation.trim() || "Dit is wel natuurkunde, maar niet van onze les.")
          .replace(/\bknipoog\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim() || "Dit is wel natuurkunde, maar niet van onze les.",
        simpleAnswer: generated.help.answer.model_answer.trim(),
        searchQuery:
          generated.help.search_query.trim() || generated.help.question_short.trim() || text,
      };
      return { ok: true, kind: "wink", sessionId: session.id, wink };
    }

    const steps = allStepsOf(generated.help);
    return {
      ok: true,
      kind: "nask",
      sessionId: session.id,
      step: steps[0] ?? toStepView(generated.help, 1, 0),
      steps,
      answer: {
        questionShort: generated.help.question_short,
        modelAnswer: generated.help.answer.model_answer,
        explanation: generated.help.answer.explanation,
      },
    };
  } catch (err) {
    console.error("[oswald] submit failed", err);
    return { ok: false, error: "Hulp ophalen lukte niet. Probeer het nog eens." };
  }
}


/** Grapjes over de docent / kletspraat zonder NaSk-inhoud → other. */
function isOffTopicBanter(text: string): boolean {
  const t = text.toLowerCase().normalize("NFKC");
  if (!t.trim()) return false;
  const aboutTeacher =
    /\b(meneer\s+oswald|mr\.?\s*oswald|docent\s+oswald|nick\s+oswald)\b/.test(t) ||
    (/\boswald\b/.test(t) &&
      /\b(gelijk|leuk|lief|aardig|stom|dom|vriendin|girlfriend|dating|altijd|nooit|jarig|verjaardag)\b/.test(t));
  const aboutTeacherLoose =
    /\b(meneer|docent)\b/.test(t) &&
    /\b(gelijk|leuk|lief|stom|dom)\b/.test(t) &&
    !/\b(volt|ampère|ampere|stroom|spanning|kracht|dichtheid|newton|joule|watt|ohm|molecuul|atoom|nova|hoofdstuk|paragraaf|formule)\b/.test(
      t,
    );
  const hasPhysics =
    /\b(volt|ampère|ampere|stroom|spanning|kracht|dichtheid|newton|joule|watt|ohm|molecuul|atoom|nova|hoofdstuk|hst\b|paragraaf|par\.?\b|formule|binas|practicum|weerstand|lading|energie|snelheid|versnelling|druk|temperatuur|celsius|kelvin)\b/.test(
      t,
    );
  if (hasPhysics) return false;
  return aboutTeacher || aboutTeacherLoose;
}

export async function askHelp(input: {
  name?: string;
  classCode?: string;
  text?: string;
  imageDataUrl?: string;
}): Promise<SubmitResult> {
  const classCode = CLASS_CODES.includes(input.classCode as (typeof CLASS_CODES)[number])
    ? input.classCode!
    : "";
  const name = cleanOptionalName(input.name);
  if (name === null) {
    return { ok: false, error: "Gebruik alleen letters in de naam, of laat leeg." };
  }

  const text = input.text?.trim() ?? "";
  const image = input.imageDataUrl?.trim();
  if (!text && !image) {
    return { ok: false, error: "Plak de vraag of snap 'm." };
  }
  if (image && image.length > 1_500_000) {
    return { ok: false, error: "De foto is te groot. Maak een scherpere, kleinere foto." };
  }
  if (image && !image.startsWith("data:image/")) {
    return { ok: false, error: "Dit bestand is geen foto." };
  }

  if (text && !image && isOffTopicBanter(text)) {
    const id = randomUUID();
    const row = emptySession(id, name, classCode);
    row.submitted_question = true;
    row.questions_count = 1;
    row.help_json = JSON.stringify({
      readable: true,
      topic: "other",
      question_short: "Geen NaSk-vraag — kletspraat over de docent telt niet.",
      hint_count: 1,
      search_query: "",
      step1: { help: "", tip: "", extra_tip: "" },
      step2: { help: "", tip: "", extra_tip: "" },
      step3: { help: "", tip: "", extra_tip: "" },
      answer: { model_answer: "", explanation: "Oswald helpt alleen bij NaSk." },
    });
    row.question_submitted_at = nowIso();
    memory().sessions.set(id, row);
    try {
      const sql = await getSql();
      await sql`
        insert into sessions (id, student_name, class_code, submitted_question, questions_count,
          steps_shown, extra_tips, extra_mask, answer_shown, help_json,
          question_submitted_at, answer_shown_at, last_active_at)
        values (
          ${id}, ${name}, ${classCode}, true, 1,
          0, 0, 0, false, ${row.help_json},
          now(), null, now()
        )
      `;
    } catch (err) {
      console.error("[oswald] askHelp banter save", err);
    }
    return {
      ok: true,
      kind: "other",
      sessionId: id,
      message:
        "Leuk geprobeerd. Oswald helpt bij natuurkunde en scheikunde — niet bij kletspraat over de docent. Plak een som of begrip.",
    };
  }

  const parsed = parseNovaFromText(text);
  const inferredSeries = seriesFromQuery(text);
  const effectiveClass =
    classCode ||
    (inferredSeries === "gt4" ? "4GT" : inferredSeries === "gt3" ? "3.5G" : inferredSeries === "kgt12" ? "2.5G" : "");
  const novaContext = lookupNova({
    classCode: effectiveClass || classCode,
    chapter: parsed.chapter,
    paragraph: parsed.paragraph,
    question: parsed.question,
  });

  const generated = await generateHelp({
    text: text || undefined,
    imageDataUrl: image,
    novaContext: novaContext || undefined,
    bookExcerpt: bookContext({
      classCode: effectiveClass || classCode,
      chapter: parsed.chapter,
      paragraph: parsed.paragraph,
      question: parsed.question,
      query: text,
    }) || undefined,
  });
  if (!generated.ok) return generated;
  if (novaContext) {
    generated.help.topic = "nask";
    generated.help.readable = true;
  }
  if (!generated.help.readable) {
    return {
      ok: false,
      error:
        generated.help.question_short?.trim() ||
        "Ik kan de vraag niet goed lezen. Typ de vraag of maak een scherpere foto.",
    };
  }

  const id = randomUUID();
  const topic = generated.help.topic ?? "nask";
  const isWink = topic === "wink";
  const isOther = topic === "other";
  const row = emptySession(id, name, classCode);
  row.submitted_question = true;
  row.questions_count = 1;
  row.steps_shown = isOther || isWink ? 0 : 1;
  row.answer_shown = isWink;
  row.help_json = JSON.stringify(generated.help);
  row.question_submitted_at = nowIso();
  row.answer_shown_at = isWink ? nowIso() : null;
  memory().sessions.set(id, row);

  try {
    const sql = await getSql();
    await sql`
      insert into sessions (id, student_name, class_code, submitted_question, questions_count,
        steps_shown, extra_tips, extra_mask, answer_shown, help_json,
        question_submitted_at, answer_shown_at, last_active_at)
      values (
        ${id}, ${name}, ${classCode}, true, 1,
        ${isOther || isWink ? 0 : 1}, 0, 0, ${isWink}, ${row.help_json},
        now(), ${isWink ? nowIso() : null}, now()
      )
    `;
  } catch (err) {
    console.error("[oswald] askHelp save", err);
  }

  if (isOther) {
    return {
      ok: true,
      kind: "other",
      sessionId: id,
      message:
        "Oswald helpt bij natuurkunde en scheikunde. Geen kletspraat of andere vakken — plak een som, begrip of Nova-plek.",
    };
  }
  if (isWink) {
    return {
      ok: true,
      kind: "wink",
      sessionId: id,
      wink: {
        questionShort: generated.help.question_short,
        wink: (generated.help.answer.explanation.trim() || "Dit is wel natuurkunde, maar niet van onze les.")
          .replace(/\bknipoog\b/gi, "")
          .replace(/\s{2,}/g, " ")
          .trim() || "Dit is wel natuurkunde, maar niet van onze les.",
        simpleAnswer: generated.help.answer.model_answer.trim(),
        searchQuery:
          generated.help.search_query.trim() || generated.help.question_short.trim() || text,
      },
    };
  }

  const steps = allStepsOf(generated.help);
  return {
    ok: true,
    kind: "nask",
    sessionId: id,
    step: steps[0] ?? toStepView(generated.help, 1, 0),
    steps,
    answer: {
      questionShort: generated.help.question_short,
      modelAnswer: generated.help.answer.model_answer,
      explanation: generated.help.answer.explanation,
    },
  };
}

export async function advanceStep(
  sessionId: string,
): Promise<{ ok: true; step: StepView } | { ok: false; error: string }> {
  const session = await loadSession(sessionId);
  if (!session) return { ok: false, error: "Sessie niet gevonden." };
  const help = readHelp(session);
  if (!help) return { ok: false, error: "Lever eerst een vraag in." };
  if (session.steps_shown < 1) return { ok: false, error: "Lever eerst een vraag in." };
  const total = hintCountOf(help);
  if (session.steps_shown >= total) {
    return { ok: true, step: toStepView(help, total, session.extra_mask) };
  }
  const next = (session.steps_shown + 1) as 2 | 3;
  try {
    const sql = await getSql();
    await sql`
      update sessions
      set steps_shown = ${next}, last_active_at = now()
      where id = ${session.id}
    `;
  } catch (err) {
    console.error("[oswald] advanceStep db", err);
  }
  patchMem(session.id, { steps_shown: next });
  return { ok: true, step: toStepView(help, next, session.extra_mask) };
}

export async function extraTip(
  sessionId: string,
): Promise<{ ok: true; step: StepView } | { ok: false; error: string }> {
  const session = await loadSession(sessionId);
  if (!session) return { ok: false, error: "Sessie niet gevonden." };
  const help = readHelp(session);
  if (!help || session.steps_shown < 1) {
    return { ok: false, error: "Lever eerst een vraag in." };
  }
  const bit = 1 << (session.steps_shown - 1);
  const nextMask = session.extra_mask | bit;
  try {
    const sql = await getSql();
    await sql`
      update sessions
      set extra_mask = ${nextMask},
          extra_tips = extra_tips + ${session.extra_mask & bit ? 0 : 1},
          last_active_at = now()
      where id = ${session.id}
    `;
  } catch (err) {
    console.error("[oswald] extraTip db", err);
  }
  patchMem(session.id, {
    extra_mask: nextMask,
    extra_tips: session.extra_tips + (session.extra_mask & bit ? 0 : 1),
  });
  return {
    ok: true,
    step: toStepView(help, session.steps_shown as 1 | 2 | 3, nextMask),
  };
}

export async function askFollowup(
  sessionId: string,
  question: string,
  fallback?: { questionShort?: string; shownHints?: string[] },
): Promise<{ ok: true; followup: FollowUp } | { ok: false; error: string }> {
  const asked = question.trim();
  if (asked.length < 2) return { ok: false, error: "Typ je vraag." };
  if (asked.length > 400) return { ok: false, error: "Iets korter, max een paar zinnen." };

  const session = await loadSession(sessionId);
  const help = session ? readHelp(session) : null;
  if (help && help.topic === "other") {
    return { ok: false, error: "Bij deze vraag kan Oswald geen wedervraag." };
  }
  const existing = help?.followups ?? [];
  if (existing.length >= MAX_FOLLOWUPS) {
    return { ok: false, error: "Genoeg vragen. Probeer nu zelf, of toon het antwoord." };
  }

  const shown: string[] = [];
  if (help && session) {
    const total = Math.min(session.steps_shown, hintCountOf(help));
    const keys = ["step1", "step2", "step3"] as const;
    for (let i = 1; i <= total; i += 1) {
      const block = help[keys[i - 1]];
      if (block.help) shown.push(block.help);
      if (block.tip) shown.push(block.tip);
    }
  } else if (fallback?.shownHints?.length) {
    shown.push(...fallback.shownHints);
  }

  const generated = await generateFollowup({
    questionShort: help?.question_short || fallback?.questionShort || "",
    shownHints: shown,
    followup: asked,
    mode: help?.topic === "wink" ? "wink" : "lesson",
  });
  if (!generated.ok) return generated;

  const followup: FollowUp = { question: asked, reply: generated.reply };
  if (session && help) {
    const next = [...existing, followup];
    const stored = { ...help, followups: next };
    try {
      const sql = await getSql();
      await sql`
        update sessions
        set help_json = ${JSON.stringify(stored)},
            extra_tips = extra_tips + 1,
            last_active_at = now()
        where id = ${session.id}
      `;
    } catch (err) {
      console.error("[oswald] followup db", err);
    }
    patchMem(session.id, {
      help_json: JSON.stringify(stored),
      extra_tips: session.extra_tips + 1,
    });
  }
  return { ok: true, followup };
}

export async function revealAnswer(
  sessionId: string,
): Promise<{ ok: true; answer: AnswerView } | { ok: false; error: string }> {
  const session = await loadSession(sessionId);
  if (!session) return { ok: false, error: "Sessie niet gevonden." };
  const help = readHelp(session);
  if (!help) return { ok: false, error: "Lever eerst een vraag in." };
  if (session.steps_shown < hintCountOf(help)) {
    return { ok: false, error: "Vraag eerst de hints." };
  }
  try {
    const sql = await getSql();
    await sql`
      update sessions
      set answer_shown = true, answer_shown_at = now(), last_active_at = now()
      where id = ${session.id}
    `;
  } catch (err) {
    console.error("[oswald] revealAnswer db", err);
  }
  patchMem(session.id, { answer_shown: true, answer_shown_at: nowIso() });
  return {
    ok: true,
    answer: {
      questionShort: help.question_short,
      modelAnswer: help.answer.model_answer,
      explanation: help.answer.explanation,
    },
  };
}

export async function teacherOverview(pin: string): Promise<
  | {
      ok: true;
      days: DayStat[];
      byClass: { classCode: string; questions: number; answers: number }[];
      recent: {
        name: string;
        classCode: string;
        at: string;
        stepsShown: number;
        answerShown: boolean;
        questionShort: string;
      }[];
      persistent: boolean;
    }
  | { ok: false; error: string }
> {
  if (!pinMatches(pin)) return { ok: false, error: "Onjuiste PIN." };
  const persistent = dbSource === "neon";
  try {
    const sql = await getSql();
    const rows = await sql<{
      day: string;
      questions: number;
      answers: number;
      avg_seconds: number | string | null;
    }>`
    select
      timezone('Europe/Amsterdam', coalesce(question_submitted_at, created_at))::date::text as day,
      count(*)::int as questions,
      coalesce(sum(case when answer_shown then 1 else 0 end), 0)::int as answers,
      avg(
        extract(epoch from (answer_shown_at - question_submitted_at))
      ) as avg_seconds
    from sessions
    where submitted_question = true
    group by 1
    order by 1 desc
    limit 60
  `;
    const classRows = await sql<{
      class_code: string;
      questions: number;
      answers: number;
    }>`
    select
      coalesce(nullif(class_code, ''), '—') as class_code,
      count(*)::int as questions,
      coalesce(sum(case when answer_shown then 1 else 0 end), 0)::int as answers
    from sessions
    where submitted_question = true
    group by 1
    order by questions desc
  `;
    const recentRows = await sql<{
      student_name: string;
      class_code: string;
      at: string;
      steps_shown: number;
      answer_shown: boolean;
      help_json: string | null;
    }>`
    select
      student_name,
      class_code,
      timezone('Europe/Amsterdam', coalesce(question_submitted_at, created_at))::text as at,
      steps_shown,
      answer_shown,
      help_json
    from sessions
    where submitted_question = true
    order by coalesce(question_submitted_at, created_at) desc
    limit 40
  `;
    return {
      ok: true,
      persistent,
      days: rows.map((r) => ({
        day: r.day,
        questions: Number(r.questions) || 0,
        answers: Number(r.answers) || 0,
        avgSeconds:
          r.avg_seconds == null || r.avg_seconds === ""
            ? null
            : Number(r.avg_seconds),
      })),
      byClass: classRows.map((r) => ({
        classCode: r.class_code,
        questions: Number(r.questions) || 0,
        answers: Number(r.answers) || 0,
      })),
      recent: recentRows.map((r) => {
        let questionShort = "";
        try {
          if (r.help_json) {
            const help = JSON.parse(r.help_json) as { question_short?: string };
            questionShort = help.question_short?.trim() ?? "";
          }
        } catch {
          /* ignore */
        }
        return {
          name: r.student_name || "zonder naam",
          classCode: r.class_code || "—",
          at: r.at,
          stepsShown: Number(r.steps_shown) || 0,
          answerShown: Boolean(r.answer_shown),
          questionShort,
        };
      }),
    };
  } catch (err) {
    console.error("[oswald] teacherOverview db", err);
    const byDay = new Map<string, { questions: number; answers: number; seconds: number[] }>();
    const byClass = new Map<string, { questions: number; answers: number }>();
    const recent: {
      name: string;
      classCode: string;
      at: string;
      stepsShown: number;
      answerShown: boolean;
      questionShort: string;
    }[] = [];
    for (const s of memory().sessions.values()) {
      if (!s.submitted_question) continue;
      const day = (s.question_submitted_at ?? s.created_at).slice(0, 10);
      const cur = byDay.get(day) ?? { questions: 0, answers: 0, seconds: [] };
      cur.questions += 1;
      if (s.answer_shown) cur.answers += 1;
      if (s.answer_shown_at && s.question_submitted_at) {
        const sec =
          (Date.parse(s.answer_shown_at) - Date.parse(s.question_submitted_at)) / 1000;
        if (Number.isFinite(sec) && sec >= 0) cur.seconds.push(sec);
      }
      byDay.set(day, cur);
      const cc = s.class_code || "—";
      const ccCur = byClass.get(cc) ?? { questions: 0, answers: 0 };
      ccCur.questions += 1;
      if (s.answer_shown) ccCur.answers += 1;
      byClass.set(cc, ccCur);
      let questionShort = "";
      try {
        if (s.help_json) {
          const help = JSON.parse(s.help_json) as { question_short?: string };
          questionShort = help.question_short?.trim() ?? "";
        }
      } catch {
        /* ignore */
      }
      recent.push({
        name: s.student_name || "zonder naam",
        classCode: cc,
        at: s.question_submitted_at ?? s.created_at,
        stepsShown: s.steps_shown,
        answerShown: s.answer_shown,
        questionShort,
      });
    }
    recent.sort((a, b) => b.at.localeCompare(a.at));
    const days: DayStat[] = [...byDay.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .slice(0, 60)
      .map(([day, v]) => ({
        day,
        questions: v.questions,
        answers: v.answers,
        avgSeconds:
          v.seconds.length === 0
            ? null
            : v.seconds.reduce((a, b) => a + b, 0) / v.seconds.length,
      }));
    return {
      ok: true,
      persistent,
      days,
      byClass: [...byClass.entries()]
        .map(([classCode, v]) => ({ classCode, ...v }))
        .sort((a, b) => b.questions - a.questions),
      recent: recent.slice(0, 40),
    };
  }
}

export async function addRosterName(
  pin: string,
  name: string,
): Promise<{ ok: true; names: string[] } | { ok: false; error: string }> {
  if (!pinMatches(pin)) return { ok: false, error: "Onjuiste PIN." };
  const cleaned = name.trim().replace(/\s+/g, " ");
  if (cleaned.length < 2 || cleaned.length > 40) {
    return { ok: false, error: "Naam moet 2 tot 40 tekens zijn." };
  }
  if (!NAME_PATTERN.test(cleaned)) {
    return { ok: false, error: "Gebruik alleen letters in de naam." };
  }
  try {
    const sql = await getSql();
    await sql`insert into roster_names (name) values (${cleaned}) on conflict (name) do nothing`;
  } catch (err) {
    console.error("[oswald] addRosterName db", err);
  }
  return { ok: true, names: await listRosterNames() };
}

export async function removeRosterName(
  pin: string,
  name: string,
): Promise<{ ok: true; names: string[] } | { ok: false; error: string }> {
  if (!pinMatches(pin)) return { ok: false, error: "Onjuiste PIN." };
  try {
    const sql = await getSql();
    await sql`delete from roster_names where name = ${name}`;
  } catch (err) {
    console.error("[oswald] removeRosterName db", err);
  }
  return { ok: true, names: await listRosterNames() };
}

async function loadSession(id: string): Promise<SessionRow | null> {
  try {
    const sql = await getSql();
    const rows = await sql<SessionRow>`
      select id, student_name, class_code, submitted_question, questions_count,
             steps_shown, extra_tips, extra_mask, answer_shown, help_json
      from sessions
      where id = ${id}
    `;
    if (rows[0]) return rows[0];
  } catch (err) {
    console.error("[oswald] loadSession db", err);
  }
  return memory().sessions.get(id) ?? null;
}

function readHelp(session: SessionRow): (HelpPayload & { followups?: FollowUp[] }) | null {
  if (!session.help_json) return null;
  try {
    return JSON.parse(session.help_json) as HelpPayload & { followups?: FollowUp[] };
  } catch {
    return null;
  }
}

function hintCountOf(help: HelpPayload): 1 | 2 | 3 {
  const n = help.hint_count;
  return n === 1 || n === 2 || n === 3 ? n : 3;
}

function allStepsOf(help: HelpPayload): StepView[] {
  const total = hintCountOf(help);
  const steps: StepView[] = [];
  for (let i = 1; i <= total; i += 1) {
    steps.push(toStepView(help, i as 1 | 2 | 3, 0));
  }
  return steps;
}

function toStepView(help: HelpPayload, step: 1 | 2 | 3, extraMask: number): StepView {
  const key = (`step${step}` as const);
  const block = help[key];
  const bit = 1 << (step - 1);
  const extraShown = (extraMask & bit) !== 0;
  const total = hintCountOf(help);
  const clamped = step > total ? total : step;
  return {
    step: clamped,
    title: STEP_TITLES[clamped - 1],
    help: block.help,
    tip: block.tip,
    extraTip: extraShown ? block.extra_tip : null,
    questionShort: help.question_short,
    hintCount: total,
    canAdvance: clamped < total,
    canShowAnswer: clamped >= total,
    extraAvailable: !extraShown,
  };
}
