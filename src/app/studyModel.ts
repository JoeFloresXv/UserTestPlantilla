export interface Question {
  id: string;
  text: string;
  capture?: CaptureMode;
  validation?: ValidationType;
}

export interface Section {
  id: string;
  label: string;
  tag: "General" | "Escenario" | "Dashboard" | "Préstamos";
  context: string;
  task: string;
  capture?: CaptureMode;
  screen?: { name: string; url: string; instructions: string };
  optional?: boolean;
  enabled?: boolean;
  criterion?: string;
  questions: Question[];
}

export type CaptureMode = "rating" | "scale" | "text" | "none";
export type ValidationType = "functionality" | "copy";

export type Rating = 1 | 2 | 3 | 4 | 5;

export interface Participant {
  id: string;
  nombre: string;
  edad: string;
  fecha: string;
  sesion: string;
  checks: Record<string, boolean>;
  respuestas: Record<string, string>;
  ratings: Record<string, Rating>;
  outcomes?: Record<string, Outcome>;
  ease?: Record<string, Rating>;
  savedAt?: string;
}

export interface StudyMeta {
  name: string;
  creatorName: string;
  teamName: string;
  flowName: string;
  description: string;
  method?: Method;
}


export const outcomes = ["Sin ayuda", "Con ayuda", "Incompleta"] as const;
export type Outcome = typeof outcomes[number];
export interface Method {
  sample: number;
  audience: string;
  measures: string;
  testType: string;
  quotas: string;
}
export const defaultMethod: Method = { sample: 6, audience: "", measures: "Logro, facilidad y fricciones", testType: "Moderada", quotas: "" };
export interface Study { meta: StudyMeta; sections: Section[]; participants: Participant[] }
export const enabledSections = (sections: Section[]) => sections.filter(s => s.enabled !== false);
export function screenUrl(value?: string) {
  try {
    const url = new URL(value || "");
    if (url.protocol === "https:" && !url.username && !url.password) return url.href;
  } catch { /* A reference may be empty while editing. */ }
  return undefined;
}
export function summarize(section: Section, participants: Participant[]) {
  const observed = participants.map(p => p.outcomes?.[section.id]).filter(Boolean);
  const easeQuestion = section.questions.find(q => q.capture === "scale" && q.text.startsWith("Del 1 al 5, ¿qué tan fácil o difícil"));
  const ratings = participants.map(p => p.ease?.[section.id] ?? (easeQuestion && p.ratings?.[easeQuestion.id])).filter((v): v is Rating => v !== undefined);
  return { observed: observed.length, independent: observed.filter(o => o === "Sin ayuda").length,
    rated: ratings.length, sum: ratings.reduce<number>((a,b) => a+b,0) };
}
