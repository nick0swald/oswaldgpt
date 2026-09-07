import { timingSafeEqual, randomUUID } from "node:crypto";
import { getSql } from "@/lib/db";
import {
  CLASS_CODES,
  DEFAULT_NAMES,
  MAX_FOLLOWUPS,
  MAX_QUESTIONS_PER_SESSION,
  STEP_TITLES,
} from "@/lib/defaults";
import { generateFollowup, generateHelp, type HelpPayload } from "@/lib/ai.server";
import type { AnswerView, DayStat, FollowUp, StepView, SubmitResult, WinkView } from "@/lib/types";

export type { AnswerView, StepView };

const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]*$/u;

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
  const sql = await getSql();
  const rows = await sql<{ n: number }>`select count(*)::int as n from roster_names`;
  if ((rows[0]?.n ?? 0) > 0) return;
  for (const name of DEFAULT_NAMES) {
    await sql`insert into roster_names (name) values (${name}) on conflict (name) do nothing`;
  }
}

export async function listRosterNames(): Promise<string[]> {
  await ensureSeed();
  const sql = await getSql();
  const rows = await sql<{ name: string }>`select name from roster_names order by name`;
  return rows.map((r) => r.name);
}

export async function startSession(input: {
  name?: string;
  classCode: string;
}): Promise<{ ok: true; sessionId: string } | { ok: false; error: string }> {
  if (!CLASS_CODES.includes(input.classCode as (typeof CLASS_CODES)[number])) {
    return { ok: false, error: "Kies een klas uit de lijst." };
  }
  const name = cleanOptionalName(input.name);
  if (name === null) {
    return { ok: false, error: "Gebruik alleen letters in de naam, of laat leeg." };
  }
  const sql = await getSql();
  const id = randomUUID();
  await sql`
    insert into sessions (id, student_name, class_code)
    values (${id}, ${name}, ${input.classCode})
  `;
  return { ok: true, sessionId: id };
}

export async function submitQuestion(input: {
  sessionId: string;
  text?: string;
  imageDataUrl?: string;
}): Promise<SubmitResult> {
  const session = await loadSession(input.sessionId);
  if (!session) return { ok: false, error: "Sessie niet gevonden. Start opnieuw." };

  const text = input.text?.trim() ?? "";
  const image = input.imageDataUrl?.trim();
  if (!text && !image) {
    return { ok: false, error: "Plak de vraag, of zet een foto/screenshot." };
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

  const generated = await generateHelp({ text: text || undefined, imageDataUrl: image });
  if (!generated.ok) return generated;
  if (!generated.help.readable) {
    return {
      ok: false,
      error:
        generated.help.question_short?.trim() ||
        "Ik kan de vraag niet goed lezen. Typ de vraag of maak een scherpere foto.",
    };
  }

  const topic = generated.help.topic ?? "nask";
  const isWink = topic === "wink";
  const isOther = topic === "other";
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

  if (isOther) {
    return {
      ok: true,
      kind: "other",
      message:
        "Dit is geen NaSk. Oswald helpt alleen bij natuurkunde en scheikunde van de les. Geen antwoord op andere vakken.",
    };
  }
  if (isWink) {
    const wink: WinkView = {
      questionShort: generated.help.question_short,
      wink:
        generated.help.answer.explanation.trim() ||
        "Dit is wel natuurkunde, maar niet van onze les. Knipoog.",
      simpleAnswer: generated.help.answer.model_answer.trim(),
      searchQuery:
        generated.help.search_query.trim() || generated.help.question_short.trim() || text,
    };
    return { ok: true, kind: "wink", wink };
  }

  return { ok: true, kind: "nask", step: toStepView(generated.help, 1, 0) };
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
  const sql = await getSql();
  await sql`
    update sessions
    set steps_shown = ${next}, last_active_at = now()
    where id = ${session.id}
  `;
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
  const sql = await getSql();
  await sql`
    update sessions
    set extra_mask = ${nextMask},
        extra_tips = extra_tips + ${session.extra_mask & bit ? 0 : 1},
        last_active_at = now()
    where id = ${session.id}
  `;
  return {
    ok: true,
    step: toStepView(help, session.steps_shown as 1 | 2 | 3, nextMask),
  };
}

export async function askFollowup(
  sessionId: string,
  question: string,
): Promise<{ ok: true; followup: FollowUp } | { ok: false; error: string }> {
  const session = await loadSession(sessionId);
  if (!session) return { ok: false, error: "Sessie niet gevonden." };
  const help = readHelp(session);
  if (!help || session.steps_shown < 1) {
    return { ok: false, error: "Vraag eerst de eerste hint." };
  }
  if (help.topic === "other" || help.topic === "wink") {
    return { ok: false, error: "Bij deze vraag kan Oswald geen wedervraag." };
  }
  const asked = question.trim();
  if (asked.length < 2) return { ok: false, error: "Typ je vraag." };
  if (asked.length > 400) return { ok: false, error: "Iets korter, max een paar zinnen." };
  const existing = help.followups ?? [];
  if (existing.length >= MAX_FOLLOWUPS) {
    return { ok: false, error: "Genoeg vragen. Probeer nu zelf, of toon het antwoord." };
  }

  const shown: string[] = [];
  const total = Math.min(session.steps_shown, hintCountOf(help));
  const keys = ["step1", "step2", "step3"] as const;
  for (let i = 1; i <= total; i += 1) {
    const block = help[keys[i - 1]];
    if (block.help) shown.push(block.help);
    if (block.tip) shown.push(block.tip);
  }

  const generated = await generateFollowup({
    questionShort: help.question_short,
    shownHints: shown,
    followup: asked,
  });
  if (!generated.ok) return generated;

  const followup: FollowUp = { question: asked, reply: generated.reply };
  const next = [...existing, followup];
  const stored = { ...help, followups: next };
  const sql = await getSql();
  await sql`
    update sessions
    set help_json = ${JSON.stringify(stored)},
        extra_tips = extra_tips + 1,
        last_active_at = now()
    where id = ${session.id}
  `;
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
  const sql = await getSql();
  await sql`
    update sessions
    set answer_shown = true, answer_shown_at = now(), last_active_at = now()
    where id = ${session.id}
  `;
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
  { ok: true; days: DayStat[] } | { ok: false; error: string }
> {
  if (!pinMatches(pin)) return { ok: false, error: "Onjuiste PIN." };
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
  return {
    ok: true,
    days: rows.map((r) => ({
      day: r.day,
      questions: Number(r.questions) || 0,
      answers: Number(r.answers) || 0,
      avgSeconds:
        r.avg_seconds == null || r.avg_seconds === ""
          ? null
          : Number(r.avg_seconds),
    })),
  };
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
  const sql = await getSql();
  await sql`insert into roster_names (name) values (${cleaned}) on conflict (name) do nothing`;
  return { ok: true, names: await listRosterNames() };
}

export async function removeRosterName(
  pin: string,
  name: string,
): Promise<{ ok: true; names: string[] } | { ok: false; error: string }> {
  if (!pinMatches(pin)) return { ok: false, error: "Onjuiste PIN." };
  const sql = await getSql();
  await sql`delete from roster_names where name = ${name}`;
  return { ok: true, names: await listRosterNames() };
}

async function loadSession(id: string): Promise<SessionRow | null> {
  const sql = await getSql();
  const rows = await sql<SessionRow>`
    select id, student_name, class_code, submitted_question, questions_count,
           steps_shown, extra_tips, extra_mask, answer_shown, help_json
    from sessions
    where id = ${id}
  `;
  return rows[0] ?? null;
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
