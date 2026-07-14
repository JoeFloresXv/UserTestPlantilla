import { ensureSupabaseSession, supabase } from "./supabase";

type CaptureMode = "rating" | "scale" | "text" | "none";
type LocalQuestion = { id: string; text: string; capture?: CaptureMode; validation?: "functionality" | "copy" };
type LocalSection = { id: string; label: string; tag: string; context: string; task: string; capture?: CaptureMode; questions: LocalQuestion[] };
type StudyMeta = { name?: string; description?: string; creatorName?: string; teamName?: string; flowName?: string };

export type StudySummary = {
  id: string;
  name: string;
  description: string;
  creatorName: string;
  teamName: string;
  flowName: string;
  status: "draft" | "active" | "archived";
  sectionCount: number;
  questionCount: number;
  participantCount: number;
  updatedAt: string;
};

const STUDY_KEY = "ux-research-supabase-study";
const MAP_KEY = "ux-research-supabase-map";
const mapKeyForStudy = (studyId: string) => `${MAP_KEY}:${studyId}`;

type RemoteMap = { studyId?: string; sections: Record<string, string>; questions: Record<string, string>; participants: Record<string, string> };
const emptyMap = (): RemoteMap => ({ sections: {}, questions: {}, participants: {} });
const readMap = (studyId?: string): RemoteMap => {
  try {
    const activeStudyId = studyId || localStorage.getItem(STUDY_KEY) || undefined;
    const scoped = activeStudyId ? localStorage.getItem(mapKeyForStudy(activeStudyId)) : null;
    const legacy = localStorage.getItem(MAP_KEY);
    const legacyMap = JSON.parse(legacy || "{}");
    const parsed = JSON.parse(scoped || ((legacyMap.studyId === activeStudyId || !activeStudyId) ? legacy : null) || "{}");
    return { ...emptyMap(), ...parsed, studyId: activeStudyId || parsed.studyId };
  }
  catch { return emptyMap(); }
};
const writeMap = (map: RemoteMap) => {
  if (!map.studyId) return;
  localStorage.setItem(mapKeyForStudy(map.studyId), JSON.stringify(map));
  localStorage.setItem(STUDY_KEY, map.studyId);
  localStorage.removeItem(MAP_KEY);
};

export const getActiveResearchStudyId = () => localStorage.getItem(STUDY_KEY);

export function activateResearchStudy(studyId: string) {
  localStorage.setItem(STUDY_KEY, studyId);
}

export function resetResearchSync() {
  localStorage.removeItem(STUDY_KEY);
}

const studyPayload = (meta?: StudyMeta) => ({
  name: meta?.name || "BPD User Tests",
  description: meta?.description || "Estudio de user testing",
  creator_name: meta?.creatorName || "",
  team_name: meta?.teamName || "",
  flow_name: meta?.flowName || "",
  updated_at: new Date().toISOString(),
});

export async function syncStudyTemplate(sections: LocalSection[], meta?: StudyMeta, requestedStudyId?: string) {
  const emptyResult = { studyId: null, sectionIds: {} as Record<string, string>, questionIds: {} as Record<string, string> };
  if (!supabase) return { ...emptyResult, error: new Error("Supabase no está configurado") };
  const session = await ensureSupabaseSession();
  if (session.error || !session.user) return { ...emptyResult, error: session.error || new Error("Sesión no disponible") };

  let map = readMap(requestedStudyId);
  let studyId = requestedStudyId || map.studyId || localStorage.getItem(STUDY_KEY) || undefined;
  if (studyId) {
    const { data, error } = await supabase.from("studies").update(studyPayload(meta)).eq("id", studyId).select("id").maybeSingle();
    if (error) return { ...emptyResult, error };
    if (!data) { studyId = undefined; map = emptyMap(); }
  }
  if (!studyId) {
    const { data, error } = await supabase.from("studies").insert(studyPayload(meta)).select("id").single();
    if (error) return { ...emptyResult, error };
    studyId = data.id;
    map = { ...emptyMap(), studyId };
  }
  localStorage.setItem(STUDY_KEY, studyId);
  map.studyId = studyId;

  const sectionIds: Record<string, string> = {};
  const questionIds: Record<string, string> = {};
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const remoteSectionId = map.sections[section.id] || crypto.randomUUID();
    const { error } = await supabase.from("study_sections").upsert({ id: remoteSectionId, study_id: studyId, position: 10_000 + index, label: section.label, tag: section.tag, context: section.context, task: section.task, capture_mode: section.capture || (section.tag === "General" ? "none" : "rating") });
    if (error) return { studyId, sectionIds, questionIds, error };
    map.sections[section.id] = remoteSectionId;
    sectionIds[section.id] = remoteSectionId;
    for (let questionIndex = 0; questionIndex < section.questions.length; questionIndex += 1) {
      const question = section.questions[questionIndex];
      const remoteQuestionId = map.questions[question.id] || crypto.randomUUID();
      const { error: questionError } = await supabase.from("study_questions").upsert({ id: remoteQuestionId, section_id: remoteSectionId, position: 10_000 + questionIndex, text: question.text, capture_mode: question.capture || (section.tag === "General" ? "none" : "rating"), validation_type: question.validation || "functionality" });
      if (questionError) return { studyId, sectionIds, questionIds, error: questionError };
      map.questions[question.id] = remoteQuestionId;
      questionIds[question.id] = remoteQuestionId;
    }
  }

  const localSectionIds = new Set(sections.map((section) => section.id));
  const localQuestionIds = new Set(sections.flatMap((section) => section.questions.map((question) => question.id)));
  const staleSectionIds = Object.entries(map.sections).filter(([localId]) => !localSectionIds.has(localId)).map(([, remoteId]) => remoteId);
  const staleQuestionIds = Object.entries(map.questions).filter(([localId]) => !localQuestionIds.has(localId)).map(([, remoteId]) => remoteId);
  if (staleQuestionIds.length) {
    const { error: ratingError } = await supabase.from("participant_ratings").delete().eq("target_type", "question").in("target_id", staleQuestionIds);
    if (ratingError) return { studyId, sectionIds, questionIds, error: ratingError };
    const { error } = await supabase.from("study_questions").delete().in("id", staleQuestionIds);
    if (error) return { studyId, sectionIds, questionIds, error };
  }
  if (staleSectionIds.length) {
    const { error: ratingError } = await supabase.from("participant_ratings").delete().eq("target_type", "section").in("target_id", staleSectionIds);
    if (ratingError) return { studyId, sectionIds, questionIds, error: ratingError };
    const { error } = await supabase.from("study_sections").delete().in("id", staleSectionIds);
    if (error) return { studyId, sectionIds, questionIds, error };
  }
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const { error } = await supabase.from("study_sections").update({ position: index }).eq("id", sectionIds[section.id]);
    if (error) return { studyId, sectionIds, questionIds, error };
    for (let questionIndex = 0; questionIndex < section.questions.length; questionIndex += 1) {
      const question = section.questions[questionIndex];
      const { error: questionError } = await supabase.from("study_questions").update({ position: questionIndex }).eq("id", questionIds[question.id]);
      if (questionError) return { studyId, sectionIds, questionIds, error: questionError };
    }
  }
  map.sections = Object.fromEntries(Object.entries(map.sections).filter(([localId]) => localSectionIds.has(localId)));
  map.questions = Object.fromEntries(Object.entries(map.questions).filter(([localId]) => localQuestionIds.has(localId)));
  writeMap(map);
  return { studyId, sectionIds, questionIds, error: null };
}

export async function createResearchStudy(sections: LocalSection[], meta?: StudyMeta) {
  const emptyResult = { studyId: null as string | null, sectionIds: {} as Record<string, string>, questionIds: {} as Record<string, string> };
  if (!supabase) return { ...emptyResult, error: new Error("Supabase no está configurado") };
  const session = await ensureSupabaseSession();
  if (session.error || !session.user) return { ...emptyResult, error: session.error || new Error("Sesión no disponible") };
  const previousStudyId = localStorage.getItem(STUDY_KEY);
  const { data, error } = await supabase.from("studies").insert(studyPayload(meta)).select("id").single();
  if (error || !data) return { ...emptyResult, error: error || new Error("No se pudo crear la plantilla") };
  const studyId = data.id as string;
  const map = { ...emptyMap(), studyId };
  writeMap(map);
  const synced = await syncStudyTemplate(sections, meta, studyId);
  if (!synced.error) return synced;
  await supabase.from("studies").delete().eq("id", studyId);
  localStorage.removeItem(mapKeyForStudy(studyId));
  if (previousStudyId) localStorage.setItem(STUDY_KEY, previousStudyId);
  else localStorage.removeItem(STUDY_KEY);
  return synced;
}

export async function listResearchStudies() {
  const emptyResult = { studies: [] as StudySummary[] };
  if (!supabase) return { ...emptyResult, error: new Error("Supabase no está configurado") };
  const session = await ensureSupabaseSession();
  if (session.error || !session.user) return { ...emptyResult, error: session.error || new Error("Sesión no disponible") };
  const { data, error } = await supabase
    .from("studies")
    .select("id,name,description,creator_name,team_name,flow_name,status,updated_at,study_sections(id,study_questions(id)),participants(id)")
    .order("updated_at", { ascending: false });
  if (error) return { ...emptyResult, error };
  const studies = (data || []).map((study: any): StudySummary => {
    const remoteSections = study.study_sections || [];
    return {
      id: study.id,
      name: study.name,
      description: study.description,
      creatorName: study.creator_name,
      teamName: study.team_name,
      flowName: study.flow_name,
      status: study.status || "draft",
      sectionCount: remoteSections.length,
      questionCount: remoteSections.reduce((total: number, section: any) => total + (section.study_questions || []).length, 0),
      participantCount: (study.participants || []).length,
      updatedAt: study.updated_at,
    };
  });
  return { studies, error: null };
}

export async function saveParticipantToSupabase(input: { sections: LocalSection[]; meta?: StudyMeta; participantNumber: number; localId: string; nombre: string; edad: string; fecha: string; sesion: string; checks: Record<string, boolean>; respuestas: Record<string, string>; ratings: Record<string, number> }) {
  const template = await syncStudyTemplate(input.sections, input.meta);
  if (template.error || !template.studyId) return template.error || new Error("No se pudo sincronizar la plantilla");
  const map = readMap();
  let remoteParticipantId = map.participants[input.localId];
  if (!remoteParticipantId) {
    const { data, error } = await supabase!.from("participants").select("id").eq("study_id", template.studyId).eq("participant_number", input.participantNumber).maybeSingle();
    if (error) return error;
    remoteParticipantId = data?.id || crypto.randomUUID();
  }
  const { error: participantError } = await supabase!.from("participants").upsert({ id: remoteParticipantId, study_id: template.studyId, participant_number: input.participantNumber, name: input.nombre, age: input.edad, session_code: input.sesion, session_date: input.fecha || null, demographics: input.checks, status: "complete", updated_at: new Date().toISOString() });
  if (participantError) return participantError;
  map.participants[input.localId] = remoteParticipantId;
  writeMap(map);

  const answerRows = input.sections.flatMap((section) => section.questions.map((question) => ({ participant_id: remoteParticipantId, question_id: template.questionIds[question.id], answer: input.respuestas[question.id] || "", interviewer_note: input.respuestas[`${question.id}_registro`] || "", updated_at: new Date().toISOString() })));
  if (answerRows.length) {
    const { error } = await supabase!.from("participant_answers").upsert(answerRows, { onConflict: "participant_id,question_id" });
    if (error) return error;
  }
  const sectionNoteRows = input.sections.map((section) => ({ participant_id: remoteParticipantId, section_id: template.sectionIds[section.id], note: input.respuestas[`${section.id}_notas`] || "", updated_at: new Date().toISOString() }));
  if (sectionNoteRows.length) {
    const { error } = await supabase!.from("participant_section_notes").upsert(sectionNoteRows, { onConflict: "participant_id,section_id" });
    if (error) return error;
  }
  const ratingRows = Object.entries(input.ratings).filter(([, rating]) => Number.isInteger(rating) && rating >= 1 && rating <= 5).map(([localTargetId, rating]) => ({ participant_id: remoteParticipantId, target_type: template.sectionIds[localTargetId] ? "section" : "question", target_id: template.sectionIds[localTargetId] || template.questionIds[localTargetId], rating, updated_at: new Date().toISOString() })).filter((row) => Boolean(row.target_id));
  if (ratingRows.length) {
    const { error } = await supabase!.from("participant_ratings").upsert(ratingRows, { onConflict: "participant_id,target_type,target_id" });
    if (error) return error;
  }
  const { data: savedRatings, error: savedRatingsError } = await supabase!.from("participant_ratings").select("id,target_type,target_id").eq("participant_id", remoteParticipantId);
  if (savedRatingsError) return savedRatingsError;
  const currentRatingKeys = new Set(ratingRows.map((row) => `${row.target_type}:${row.target_id}`));
  const staleRatingIds = (savedRatings || []).filter((row) => !currentRatingKeys.has(`${row.target_type}:${row.target_id}`)).map((row) => row.id);
  if (staleRatingIds.length) {
    const { error } = await supabase!.from("participant_ratings").delete().in("id", staleRatingIds);
    if (error) return error;
  }
  return null;
}

export async function loadResearchFromSupabase(requestedStudyId?: string) {
  const emptyResult = { studyId: null as string | null, sections: null, participants: null, meta: null };
  if (!supabase) return { ...emptyResult, error: new Error("Supabase no está configurado") };
  const session = await ensureSupabaseSession();
  if (session.error || !session.user) return { ...emptyResult, error: session.error || new Error("Sesión no disponible") };
  const savedStudyId = requestedStudyId || localStorage.getItem(STUDY_KEY);
  let study: any = null;
  if (savedStudyId) {
    const { data, error } = await supabase.from("studies").select("id,name,description,creator_name,team_name,flow_name,created_at").eq("id", savedStudyId).maybeSingle();
    if (error) return { ...emptyResult, error };
    study = data;
  }
  if (!study) {
    const { data, error } = await supabase.from("studies").select("id,name,description,creator_name,team_name,flow_name,created_at").order("updated_at", { ascending: false }).limit(1).maybeSingle();
    if (error) return { ...emptyResult, error };
    study = data;
  }
  if (!study) { resetResearchSync(); return { ...emptyResult, error: null }; }
  localStorage.setItem(STUDY_KEY, study.id);
  const [{ data: remoteSections, error: sectionError }, { data: remoteParticipants, error: participantError }] = await Promise.all([
    supabase.from("study_sections").select("id,label,tag,context,task,capture_mode,position,study_questions(id,text,capture_mode,validation_type,position)").eq("study_id", study.id).order("position"),
    supabase.from("participants").select("id,participant_number,name,age,session_code,session_date,demographics,updated_at").eq("study_id", study.id).order("participant_number"),
  ]);
  if (sectionError || participantError) return { ...emptyResult, error: sectionError || participantError };
  const sections = (remoteSections || []).map((section: any) => ({ id: section.id, label: section.label, tag: section.tag, context: section.context, task: section.task, capture: section.capture_mode, questions: (section.study_questions || []).sort((a: any, b: any) => a.position - b.position).map((question: any) => ({ id: question.id, text: question.text, capture: question.capture_mode, validation: question.validation_type || "functionality" })) }));
  const participantIds = (remoteParticipants || []).map((participant: any) => participant.id);
  const [answerResult, ratingResult, sectionNoteResult] = participantIds.length ? await Promise.all([
    supabase.from("participant_answers").select("participant_id,question_id,answer,interviewer_note").in("participant_id", participantIds),
    supabase.from("participant_ratings").select("participant_id,target_type,target_id,rating").in("participant_id", participantIds),
    supabase.from("participant_section_notes").select("participant_id,section_id,note").in("participant_id", participantIds),
  ]) : [{ data: [], error: null }, { data: [], error: null }, { data: [], error: null }];
  const relatedError = answerResult.error || ratingResult.error || sectionNoteResult.error;
  if (relatedError) return { ...emptyResult, error: relatedError };
  const participants = (remoteParticipants || []).map((participant: any) => {
    const respuestas: Record<string, string> = {};
    (answerResult.data || []).filter((answer: any) => answer.participant_id === participant.id).forEach((answer: any) => { respuestas[answer.question_id] = answer.answer; if (answer.interviewer_note) respuestas[`${answer.question_id}_registro`] = answer.interviewer_note; });
    (sectionNoteResult.data || []).filter((note: any) => note.participant_id === participant.id).forEach((note: any) => { respuestas[`${note.section_id}_notas`] = note.note; });
    const participantRatings: Record<string, number> = {};
    (ratingResult.data || []).filter((rating: any) => rating.participant_id === participant.id).forEach((rating: any) => { participantRatings[rating.target_id] = rating.rating; });
    return { id: participant.id, nombre: participant.name, edad: participant.age, fecha: participant.session_date || "", sesion: participant.session_code, checks: participant.demographics || {}, respuestas, ratings: participantRatings, savedAt: participant.updated_at };
  });
  writeMap({ studyId: study.id, sections: Object.fromEntries(sections.map((section: any) => [section.id, section.id])), questions: Object.fromEntries(sections.flatMap((section: any) => section.questions.map((question: any) => [question.id, question.id]))), participants: Object.fromEntries(participants.map((participant: any) => [participant.id, participant.id])) });
  return { studyId: study.id, sections, participants, meta: { name: study.name, description: study.description, creatorName: study.creator_name, teamName: study.team_name, flowName: study.flow_name }, error: null };
}
