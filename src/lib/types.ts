export type StepView = {
  step: 1 | 2 | 3;
  title: string;
  help: string;
  tip: string;
  extraTip: string | null;
  questionShort: string;
  hintCount: 1 | 2 | 3;
  canAdvance: boolean;
  canShowAnswer: boolean;
  extraAvailable: boolean;
};

export type AnswerView = {
  questionShort: string;
  modelAnswer: string;
  explanation: string;
};

export type WinkView = {
  questionShort: string;
  wink: string;
  simpleAnswer: string;
  searchQuery: string;
};

export type SubmitResult =
  | { ok: true; kind: "nask"; step: StepView }
  | { ok: true; kind: "wink"; wink: WinkView }
  | { ok: true; kind: "other"; message: string }
  | { ok: false; error: string };

export type FollowUp = {
  question: string;
  reply: string;
};

export type DayStat = {
  day: string;
  questions: number;
  answers: number;
  avgSeconds: number | null;
};
