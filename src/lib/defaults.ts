export const CLASSES = [
  { code: "2.5G", label: "2.5G" },
  { code: "2.6G", label: "2.6G" },
  { code: "3.5G", label: "3.5G" },
  { code: "3.6G", label: "3.6G" },
  { code: "4GT", label: "4GT" },
  { code: "3HGL", label: "3HGL" },
] as const;

export type ClassCode = (typeof CLASSES)[number]["code"];

export const CLASS_CODES = CLASSES.map((c) => c.code);

export function classLabel(code: string): string {
  return CLASSES.find((c) => c.code === code)?.label ?? code;
}

export function displayStudentName(name: string): string {
  const trimmed = name.trim();
  return trimmed || "zonder naam";
}

/** Demo-voornamen. De docent vervangt deze door de echte klaslijst. */
export const DEFAULT_NAMES = [
  "Amina",
  "Anouk",
  "Bo",
  "Bram",
  "Daan",
  "Denzel",
  "Emma",
  "Esmee",
  "Finn",
  "Fleur",
  "Iris",
  "Jayden",
  "Jesse",
  "Lars",
  "Lisa",
  "Lotte",
  "Mees",
  "Milan",
  "Mohammed",
  "Noa",
  "Noah",
  "Sanne",
  "Sem",
  "Sophie",
  "Tess",
  "Thijs",
  "Tim",
  "Yara",
] as const;

export const STEP_TITLES = [
  "Eerste tip",
  "Kleine hint",
  "Nog een duwtje",
] as const;

export const SESSION_KEY = "oswald_session_id";
export const NAME_KEY = "oswald_name";
export const CLASS_KEY = "oswald_class";
export const CHAPTER_KEY = "oswald_chapter";
export const PIN_KEY = "oswald_docent_pin";
export const PLEDGE_KEY = "oswald_pledge";
export const BEST_KEY = "oswald_da_best";
export const SHOW_PLEDGE = false;

export const MAX_QUESTIONS_PER_SESSION = 40;
export const MAX_FOLLOWUPS = 20;
