import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const sessionIdSchema = z.string().min(8).max(80);
const pinSchema = z.string().min(1).max(64);

export const listNamesFn = createServerFn({ method: "GET" }).handler(async () => {
  const { listRosterNames } = await import("./oswald.server");
  return { names: await listRosterNames() };
});

export const askHelpFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().max(40).optional(),
      classCode: z.string().max(12).optional(),
      text: z.string().max(4000).optional(),
      imageDataUrl: z.string().max(1_500_000).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { askHelp } = await import("./oswald.server");
    return askHelp(data);
  });

export const startSessionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      name: z.string().max(40).optional(),
      classCode: z.string().max(12).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { startSession } = await import("./oswald.server");
    return startSession(data);
  });

export const submitQuestionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: sessionIdSchema,
      text: z.string().max(4000).optional(),
      imageDataUrl: z.string().max(1_500_000).optional(),
      chapter: z.string().max(8).optional(),
      paragraph: z.string().max(8).optional(),
      questionNo: z.string().max(12).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { submitQuestion } = await import("./oswald.server");
    return submitQuestion(data);
  });

export const advanceStepFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: sessionIdSchema }))
  .handler(async ({ data }) => {
    const { advanceStep } = await import("./oswald.server");
    return advanceStep(data.sessionId);
  });

export const extraTipFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: sessionIdSchema }))
  .handler(async ({ data }) => {
    const { extraTip } = await import("./oswald.server");
    return extraTip(data.sessionId);
  });

export const askFollowupFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().max(80).optional(),
      question: z.string().min(1).max(400),
      questionShort: z.string().max(400).optional(),
      shownHints: z.array(z.string().max(800)).max(8).optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { askFollowup } = await import("./oswald.server");
    return askFollowup(data.sessionId || "none", data.question, {
      questionShort: data.questionShort,
      shownHints: data.shownHints,
    });
  });

export const revealAnswerFn = createServerFn({ method: "POST" })
  .validator(z.object({ sessionId: sessionIdSchema }))
  .handler(async ({ data }) => {
    const { revealAnswer } = await import("./oswald.server");
    return revealAnswer(data.sessionId);
  });

export const teacherLoginFn = createServerFn({ method: "POST" })
  .validator(z.object({ pin: pinSchema }))
  .handler(async ({ data }) => {
    const { pinMatches } = await import("./oswald.server");
    if (!pinMatches(data.pin)) return { ok: false as const, error: "Onjuiste PIN." };
    return { ok: true as const };
  });

export const teacherOverviewFn = createServerFn({ method: "POST" })
  .validator(z.object({ pin: pinSchema }))
  .handler(async ({ data }) => {
    const { teacherOverview } = await import("./oswald.server");
    return teacherOverview(data.pin);
  });

export const addNameFn = createServerFn({ method: "POST" })
  .validator(z.object({ pin: pinSchema, name: z.string().min(1).max(40) }))
  .handler(async ({ data }) => {
    const { addRosterName } = await import("./oswald.server");
    return addRosterName(data.pin, data.name);
  });

export const removeNameFn = createServerFn({ method: "POST" })
  .validator(z.object({ pin: pinSchema, name: z.string().min(1).max(40) }))
  .handler(async ({ data }) => {
    const { removeRosterName } = await import("./oswald.server");
    return removeRosterName(data.pin, data.name);
  });

export const deeperExplanationFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().max(80).optional(),
      questionShort: z.string().max(400),
      modelAnswer: z.string().max(2000),
      explanation: z.string().max(4000),
    }),
  )
  .handler(async ({ data }) => {
    const { generateDeeperExplanation } = await import("./ai.server");
    return generateDeeperExplanation({
      questionShort: data.questionShort,
      modelAnswer: data.modelAnswer,
      explanation: data.explanation,
    });
  });

export const practiceQuestionFn = createServerFn({ method: "POST" })
  .validator(
    z.object({
      sessionId: z.string().max(80).optional(),
      questionShort: z.string().max(400),
      modelAnswer: z.string().max(2000),
      explanation: z.string().max(4000),
    }),
  )
  .handler(async ({ data }) => {
    const { generatePracticeQuestion } = await import("./ai.server");
    return generatePracticeQuestion({
      questionShort: data.questionShort,
      modelAnswer: data.modelAnswer,
      explanation: data.explanation,
    });
  });