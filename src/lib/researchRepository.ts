import { supabase, ensureSupabaseSession } from "./supabase";

type LocalQuestion = { id: string; text: string; capture?: "rating" | "text" | "none"; validation?: "functionality" | "copy" };
type LocalSection = { id: string; label: string; tag: string; context: string; task: string; capture?: "rating" | "text" | "none"; questions: LocalQuestion[] };

const STUDY_KEY = "ux-research-supabase-study";
const MAP_KEY = "ux-research-supabase-map";

type RemoteMap = { studyId?: string; sections: Record<string, string>; questions: Record<string, string>; participants: Record<string, string> };

const readMap = (): RemoteMap => {
  try { return { sections: {}, questions: {}, participants: {}, ...JSON.parse(localStorage.getItem(MAP_KEY) || "{}") }; } catch { return { sections: {}, questions: {}, participants: {} }; }
};

const writeMap = (map: RemoteMap) => localStorage.setItem(MAP_KEY, JSON.stringify(map));

export async function syncStudyTemplate(sections: LocalSection[], meta?: { name?: string; description?: string; creatorName?: string; teamName?: string; flowName?: string }) {
  if (!supabase) return { studyId: null, sectionIds: {}, questionIds: {}, error: new Error("Supabase no está configurado") };
  const session = await ensureSupabaseSession();
  if (session.error || !session.user) return { studyId: null, sectionIds: {}, questionIds: {}, error: session.error || new Error("Sesión no disponible") };

  const map = readMap();
  let studyId = map.studyId || localStorage.getItem(STUDY_KEY) || undefined;
  if (!studyId) {
    const { data, error } = await supabase.from("studies").insert({ name: meta?.name || "BPD User Tests", description: meta?.description || "Estudio de user testing", creator_name: meta?.creatorName || "", team_name: meta?.teamName || "", flow_name: meta?.flowName || "" }).select("id").single();
    if (error) return { studyId: null, sectionIds: {}, questionIds: {}, error };
    studyId = data.id;
    localStorage.setItem(STUDY_KEY, studyId);
    map.studyId = studyId;
  }

  await supabase.from("studies").update({ name: meta?.name, description: meta?.description, creator_name: meta?.creatorName, team_name: meta?.teamName, flow_name: meta?.flowName, updated_at: new Date().toISOString() }).eq("id", studyId);

  const sectionIds: Record<string, string> = {};
  const questionIds: Record<string, string> = {};
  for (let index = 0; index < sections.length; index += 1) {
    const section = sections[index];
    const remoteSectionId = map.sections[section.id] || crypto.randomUUID();
    const { error: sectionError } = await supabase.from("study_sections").upsert({ id: remoteSectionId, study_id: studyId, position: index, label: section.label, tag: section.tag, context: section.context, task: section.task, capture_mode: section.capture || (section.tag === "General" ? "none" : "rating") });
    if (sectionError) return { studyId, sectionIds, questionIds, error: sectionError };
    map.sections[section.id] = remoteSectionId;
    sectionIds[section.id] = remoteSectionId;
    for (let questionIndex = 0; questionIndex < section.questions.length; questionIndex += 1) {
      const question = section.questions[questionIndex];
      const remoteQuestionId = map.questions[question.id] || crypto.randomUUID();
      const { error: questionError } = await supabase.from("study_questions").upsert({ id: remoteQuestionId, section_id: remoteSectionId, position: questionIndex, text: question.text, capture_mode: question.capture || (section.tag === "General" ? "none" : "rating"), validation_type: question.validation || "functionality" });
      if (questionError) return { studyId, sectionIds, questionIds, error: questionError };
      map.questions[question.id] = remoteQuestionId;
      questionIds[question.id] = remoteQuestionId;
    }
  }
  writeMap(map);
  return { studyId, sectionIds, questionIds, error: null };
}

export async function saveParticipantToSupabase(input: { sections: LocalSection[]; meta?: { name?: string; description?: string; creatorName?: string; teamName?: string; flowName?: string }; participantNumber: number; localId: string; nombre: string; edad: string; fecha: string; sesion: string; checks: Record<string, boolean>; respuestas: Record<string, string>; ratings: Record<string, number> }) {
  const template = await syncStudyTemplate(input.sections, input.meta);
  if (template.error || !template.studyId) return template.error || new Error("No se pudo sincronizar la plantilla");
  const map = readMap();
  const remoteParticipantId = map.participants[input.localId] || crypto.randomUUID();
  const { error: participantError } = await supabase!.from("participants").upsert({ id: remoteParticipantId, study_id: template.studyId, participant_number: input.participantNumber, name: input.nombre, age: input.edad, session_code: input.sesion, session_date: input.fecha || null, demographics: input.checks, status: "complete" });
  if (participantError) return participantError;
  map.participants[input.localId] = remoteParticipantId;
  writeMap(map);

  const answerRows = input.sections.flatMap((section) => section.questions.map((question) => ({ participant_id: remoteParticipantId, question_id: template.questionIds[question.id], answer: input.respuestas[question.id] || "", interviewer_note: input.respuestas[`${question.id}_registro`] || "" })));
  if (answerRows.length) {
    const { error } = await supabase!.from("participant_answers").upsert(answerRows, { onConflict: "participant_id,question_id" });
    if (error) return error;
  }
  const ratingRows = Object.entries(input.ratings).map(([localTargetId, rating]) => ({ participant_id: remoteParticipantId, target_type: template.sectionIds[localTargetId] ? "section" : "question", target_id: template.sectionIds[localTargetId] || template.questionIds[localTargetId], rating }));
  if (ratingRows.length) {
    const { error } = await supabase!.from("participant_ratings").upsert(ratingRows, { onConflict: "participant_id,target_type,target_id" });
    if (error) return error;
  }
  return null;
}

export async function loadResearchFromSupabase() {
  if (!supabase) return { sections: null, participants: null, meta: null, error: new Error("Supabase no está configurado") };
  const session = await ensureSupabaseSession();
  if (session.error || !session.user) return { sections: null, participants: null, meta: null, error: session.error || new Error("Sesión no disponible") };
  const { data: studies, error: studyError } = await supabase.from("studies").select("id, name, description, creator_name, team_name, flow_name, created_at").order("created_at", { ascending: true }).limit(1);
  if (studyError) return { sections: null, participants: null, meta: null, error: studyError };
  const study = studies?.[0];
  if (!study) return { sections: null, participants: null, meta: null, error: null };
  localStorage.setItem(STUDY_KEY, study.id);
  const [{ data: remoteSections, error: sectionError }, { data: remoteParticipants, error: participantError }] = await Promise.all([
    supabase.from("study_sections").select("id,label,tag,context,task,capture_mode,position,study_questions(id,text,capture_mode,validation_type,position)").eq("study_id", study.id).order("position"),
    supabase.from("participants").select("id,participant_number,name,age,session_code,session_date,demographics,updated_at").eq("study_id", study.id).order("participant_number"),
  ]);
  if (sectionError || participantError) return { sections: null, participants: null, meta: null, error: sectionError || participantError };
  const sections = (remoteSections || []).map((section: any) => ({ id: section.id, label: section.label, tag: section.tag, context: section.context, task: section.task, capture: section.capture_mode, questions: (section.study_questions || []).sort((a: any, b: any) => a.position - b.position).map((question: any) => ({ id: question.id, text: question.text, capture: question.capture_mode, validation: question.validation_type || "functionality" })) }));
  const participantIds = (remoteParticipants || []).map((participant: any) => participant.id);
  const [{ data: answers }, { data: ratings }] = participantIds.length ? await Promise.all([
    supabase.from("participant_answers").select("participant_id,question_id,answer,interviewer_note").in("participant_id", participantIds),
    supabase.from("participant_ratings").select("participant_id,target_type,target_id,rating").in("participant_id", participantIds),
  ]) : [{ data: [] }, { data: [] }];
  const participants = (remoteParticipants || []).map((participant: any) => {
    const respuestas: Record<string, string> = {};
    (answers || []).filter((answer: any) => answer.participant_id === participant.id).forEach((answer: any) => { respuestas[answer.question_id] = answer.answer; if (answer.interviewer_note) respuestas[`${answer.question_id}_registro`] = answer.interviewer_note; });
    const participantRatings: Record<string, number> = {};
    (ratings || []).filter((rating: any) => rating.participant_id === participant.id).forEach((rating: any) => { participantRatings[rating.target_id] = rating.rating; });
    return { id: participant.id, nombre: participant.name, edad: participant.age, fecha: participant.session_date || "", sesion: participant.session_code, checks: participant.demographics || {}, respuestas, ratings: participantRatings, savedAt: participant.updated_at };
  });
  return { sections, participants, meta: { name: study.name, description: study.description, creatorName: study.creator_name, teamName: study.team_name, flowName: study.flow_name }, error: null };
}
