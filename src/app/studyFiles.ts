import type { Study, Section, Participant } from "./studyModel";
import { outcomes, screenUrl } from "./studyModel";
import type { StudySummary } from "../lib/researchRepository";

const prefix = "ux-research-local:";
const format = "usertest-plantilla";
type Saved = { study: Study; updatedAt: string };
export function readLocalCatalog(): Record<string, Saved> {
  const items: Record<string, Saved> = {};
  for (let i=0; i<localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(prefix)) items[key.slice(prefix.length)] = JSON.parse(localStorage.getItem(key)!);
  }
  return items;
}
export function storeCopy(id: string, study: Study) {
  localStorage.setItem(prefix + id, JSON.stringify({ study, updatedAt: new Date().toISOString() }));
}
export const localStudy = (id: string) => id.startsWith("local-");
export function localSummaries(items: Record<string, Saved>): StudySummary[] {
  return Object.entries(items).map(([id, {study, updatedAt}]) => ({
    ...study.meta, id, updatedAt, status: "draft" as const, sectionCount: study.sections.length,
    questionCount: study.sections.reduce((n,s) => n+s.questions.length,0), participantCount: study.participants.length
  }));
}
export function downloadStudy(study: Study) {
  const file = new Blob([JSON.stringify({ format, version: 1, study }, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const a = document.createElement("a"); a.href = url; a.download = (study.meta.name.replace(/[^\p{L}\p{N}_-]+/gu,"-") || "estudio") + ".json"; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
}
const record = (v: unknown): v is Record<string, any> => v !== null && typeof v === "object" && !Array.isArray(v);
const strings = (v: Record<string,unknown>, keys: string[]) => keys.every(k => typeof v[k] === "string");
const safeId = (v: unknown) => typeof v === "string" && v.length > 0 && !["__proto__", "prototype", "constructor"].includes(v);
const mapOf = (v: unknown, test: (entry: any) => boolean) => record(v) && Object.entries(v).every(([k,val]) => safeId(k) && test(val));
const scale = (v: unknown) => typeof v === "number" && Number.isInteger(v) && v>=1 && v<=5;
const capture = (v: unknown) => v === undefined || ["rating","scale","none","text"].includes(String(v));
function validSection(s: any): s is Section {
  return record(s) && safeId(s.id) && strings(s,["label","context","task"]) &&
    ["General","Escenario","Dashboard","Préstamos"].includes(s.tag) && capture(s.capture) &&
    [s.optional,s.enabled].every(v=>v===undefined || typeof v==="boolean") &&
    (s.criterion===undefined || typeof s.criterion==="string") &&
    (!s.screen || (record(s.screen) && strings(s.screen,["name","url","instructions"]) && (!s.screen.url || screenUrl(s.screen.url)))) &&
    Array.isArray(s.questions) && s.questions.every(q => record(q) && safeId(q.id) && typeof q.text === "string" && capture(q.capture) &&
      (q.validation===undefined || ["copy","functionality"].includes(q.validation)));
}
function validParticipant(p: any): p is Participant {
  return record(p) && safeId(p.id) && strings(p,["nombre","edad","fecha","sesion"]) &&
    mapOf(p.checks,v=>typeof v==="boolean") && mapOf(p.respuestas,v=>typeof v==="string") && mapOf(p.ratings,scale) &&
    (p.outcomes===undefined || mapOf(p.outcomes,v=>outcomes.includes(v))) && (p.ease===undefined || mapOf(p.ease,scale));
}
export async function importStudy(file: File): Promise<Study> {
  const bad = "Elige un archivo JSON exportado desde Archivos de este estudio.";
  const data = JSON.parse(await file.text());
  const study = data?.study;
  if (data?.format !== format || data.version !== 1 || !record(study) || !record(study.meta) ||
      !strings(study.meta,["name","description","creatorName","flowName","teamName"]) ||
      !Array.isArray(study.sections) || !study.sections.length || !study.sections.every(validSection) ||
      !Array.isArray(study.participants) || !study.participants.every(validParticipant)) throw new Error(bad);
  const method = study.meta.method;
  if (method && (!record(method) || !Number.isSafeInteger(method.sample) || method.sample<1 ||
      !strings(method,["audience","measures","testType","quotas"]))) throw new Error(bad);
  const ids = study.sections.flatMap(s=>[s.id,...s.questions.map((q: {id:string})=>q.id)]);
  if (ids.length!==new Set(ids).size || new Set(study.participants.map(p=>p.id)).size!==study.participants.length) throw new Error(bad);
  return study as Study;
}
