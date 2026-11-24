import { defaultMethod, enabledSections, outcomes, screenUrl, summarize, type CaptureMode, type ValidationType, type Participant, type Question, type Rating, type Section, type Study, type StudyMeta, type Outcome } from "./studyModel";
import { type Area, Preparation, ResultsOverview, Files, StudyNavigation } from "./StudyWorkspace";
import { importStudy, readLocalCatalog, storeCopy, localStudy, localSummaries } from "./studyFiles";
import "./workspace.css";
import { createTransferSections } from "./transferStudy";
import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  User,
  Calendar,
  ClipboardList,
  Download,
  Pencil,
  Check,
  Plus,
  Trash2,
  GripVertical,
  X,
  BarChart3,
  Save,
  Users,
  RotateCcw,
  Lightbulb,
  ClipboardCheck,
  LayoutDashboard,
  ArrowLeft,
  FileText,
} from "lucide-react";
import { supabaseConfigured } from "../lib/supabase";
import {
  activateResearchStudy,
  createResearchStudy,
  getActiveResearchStudyId,
  listResearchStudies,
  loadResearchFromSupabase,
  saveParticipantToSupabase,
  syncStudyTemplate,
  type StudySummary,
} from "../lib/researchRepository";

// ─── Types ───────────────────────────────────────────────────────────────────

const CAPTURE_OPTIONS: { value: CaptureMode; label: string; description: string }[] = [
  { value: "rating", label: "Descripción y escala", description: "Notas del entrevistador y selector 1–5" },
  { value: "text", label: "Solo descripción", description: "Contenedor para anotar un hallazgo" },
  { value: "scale", label: "Solo escala", description: "Selector 1–5 sin campo de descripción" },
  { value: "none", label: "Sin registro", description: "No mostrar captura adicional" },
];

const VALIDATION_OPTIONS: { value: ValidationType; label: string; description: string }[] = [
  { value: "functionality", label: "Funcionalidad / experiencia", description: "Valida que tan facil fue completar el flujo" },
  { value: "copy", label: "Texto / comprension", description: "Valida que tan facil fue leer o entender el texto" },
];

const NEW_STUDY_META: StudyMeta = {
  name: "",
  creatorName: "",
  teamName: "",
  flowName: "",
  description: "",
};

const RATING_OPTIONS: { value: Rating; label: string; short: string; color: string }[] = [
  { value: 1, label: "Muy difícil", short: "Muy difícil", color: "bg-rose-500" },
  { value: 2, label: "Difícil", short: "Difícil", color: "bg-orange-400" },
  { value: 3, label: "Ni fácil ni difícil", short: "Neutral", color: "bg-amber-400" },
  { value: 4, label: "Fácil", short: "Fácil", color: "bg-lime-500" },
  { value: 5, label: "Muy fácil", short: "Muy fácil", color: "bg-emerald-500" },
];

// ─── Initial data ─────────────────────────────────────────────────────────────

const COPY_RATING_OPTIONS: { value: Rating; label: string; short: string; color: string }[] = [
  { value: 1, label: "No se entiende", short: "No se entiende", color: "bg-rose-500" },
  { value: 2, label: "Poco claro", short: "Poco claro", color: "bg-orange-400" },
  { value: 3, label: "Aceptable", short: "Aceptable", color: "bg-amber-400" },
  { value: 4, label: "Claro", short: "Claro", color: "bg-lime-500" },
  { value: 5, label: "Muy claro", short: "Muy claro", color: "bg-emerald-500" },
];

const INICIAL: Section[] = [
  {
    id: "generales",
    label: "Preguntas Generales",
    tag: "General",
    context: "",
    task: "",
    questions: [
      { id: "g1", text: "¿Cómo describirías tu habilidad para utilizar aplicaciones móviles y tecnología digital en general?" },
      { id: "g2", text: "¿Qué tipo de actividades realizas más comúnmente en tu smartphone?" },
      { id: "g3", text: "¿Cuáles son las redes sociales que utilizas con más frecuencia?" },
      { id: "g4", text: "Experiencia con apps bancarias: BHD, BHD Empresarial, Popular, App BIZ, Banreservas, Banreservas Empresarial, Otros." },
      { id: "g5", text: "En caso de ser usuario empresarial, ¿tiene usted más de una empresa?" },
    ],
  },
  {
    id: "escenario1",
    label: "Escenario 1 — Login Empresarial",
    tag: "Escenario",
    context: "Primera vez que el usuario hace login como empresarial. Debe completar tres campos.",
    task: "Llegar al dashboard exitosamente completando todos los campos.",
    questions: [
      { id: "e1q1", text: "¿Cómo describirías tu experiencia al completar esta tarea?" },
      { id: "e1q2", text: "¿Cuál fue tu primera impresión al ver el dashboard?" },
    ],
  },
  {
    id: "dashboard_indicaciones",
    label: "Dashboard — Indicaciones guiadas",
    tag: "Dashboard",
    context: "El usuario debe leer las 5 indicaciones presentadas en el dashboard y comentar su reacción ante cada una.",
    task: "Mostrar cada indicación una por una. Pedirle al usuario que la lea en voz alta y explique qué le pareció, qué sentimiento le genera y si entiende qué debe hacer.",
    questions: [
      { id: "d1q1", text: "Indicación 1 — “¡Hay novedades esperándote!” ¿Qué le pareció esta primera indicación y qué sentimiento le genera al verla?" },
      { id: "d1q2", text: "Indicación 2 — “Cambia de empresa.” ¿Qué le pareció esta indicación y qué tan clara le resulta la acción de seleccionar una empresa/RNC?" },
      { id: "d1q3", text: "Indicación 3 — “Cambio de usuario empresarial.” ¿Qué le pareció esta indicación y qué sentimiento le da saber que puede agregar y alternar entre usuarios?" },
      { id: "d1q4", text: "Indicación 4 — “¡Menú de opciones!” ¿Qué le pareció esta indicación y qué sensación le transmite encontrar pagos, préstamos, desembolsos y solicitudes en un solo lugar?" },
      { id: "d1q5", text: "Indicación 5 — Dashboard principal. ¿Qué le pareció la indicación final y qué sentimiento le genera la organización de Resumen, Cuentas, Tarjetas, Préstamos, Accesos rápidos y Recomendados?" },
    ],
  },
  {
    id: "dashboard_navbar",
    label: "Dashboard — Evaluación de opciones del navigation bar",
    tag: "Dashboard",
    context: "En el dashboard se evaluarán 5 áreas principales del navigation bar: Inicio/Dashboard, Autorizar/Aprobaciones, botón central de acción, Historial de transacciones y Menú.",
    task: "Pedirle al usuario que navegue por cada área, lea los textos visibles y comente qué entiende, qué le parece la pantalla y qué tan clara resulta la navegación.",
    questions: [
      { id: "d2q1", text: "Inicio / Dashboard: ¿Qué te parece el texto y la pantalla general del dashboard? ¿La organización de Resumen, Cuentas, Tarjetas, Préstamos, Accesos rápidos y Recomendados se entiende claramente?" },
      { id: "d2q2", text: "Autorizar / Aprobaciones: ¿Qué te parece el texto y la pantalla general de aprobaciones? ¿Queda claro qué está pendiente, el estatus y cómo seleccionar aprobaciones?" },
      { id: "d2q3", text: "Botón central de acción: ¿Qué te comunica este botón dentro del navigation bar? ¿Qué esperarías que pase al tocarlo y qué sentimiento te genera?" },
      { id: "d2q4", text: "Historial de transacciones: ¿Qué te parece el texto y la pantalla general del historial? ¿Los estados, datos de cada transacción y la opción Ver comprobante son claros?" },
      { id: "d2q5", text: "Menú: ¿Qué te parece el texto y la pantalla general del menú? ¿Las categorías como Transferencias, Pagos, Código cash, Tarjetas, Beneficiarios, Desembolsos y Trámites están organizadas de forma entendible?" },
    ],
  },
  {
    id: "prestamos_pago",
    label: "Préstamos — Evaluación de opciones de pago",
    tag: "Préstamos",
    context: "El usuario revisará la pantalla de Pago Préstamo y las 4 opciones de pago disponibles: Cuota(s) pendiente(s), Abono a cuota(s), Abono a capital y Pago total.",
    task: "Mostrar cada opción de pago. Pedirle al usuario que describa qué está viendo en pantalla, qué entiende del texto, los montos, la indicación informativa y la acción que espera realizar.",
    questions: [
      { id: "p1q1", text: "Cuota(s) pendiente(s): ¿Qué entiendes que estás viendo en esta pantalla? ¿Qué te comunica el monto de la cuota pendiente y la indicación “Esta opción paga la cuota pendiente”?" },
      { id: "p1q2", text: "Abono a cuota(s): ¿Qué entiendes que estás viendo en esta opción? ¿Qué te parece el campo de monto, el balance abonado, el disponible para abonar y la indicación sobre abonar a una cuota futura o pendiente?" },
      { id: "p1q3", text: "Abono a capital: ¿Qué entiendes que estás viendo en esta opción? ¿Qué te comunica el monto digitado y la indicación “Esta opción reduce el monto adeudado del préstamo”?" },
      { id: "p1q4", text: "Pago total: ¿Qué entiendes que estás viendo en esta opción? ¿Qué te parecen los conceptos Cargo por saldo anticipado, Mora, Interés y Balance de capital, y la indicación de que esta opción salda por completo el préstamo?" },
    ],
  },
];

const DEMOGRAFICOS = [
  { id: "corredor_seguros", label: "Corredor de seguros" },
  { id: "asesor_seguros", label: "Asesor de seguros" },
  { id: "usuario_empresarial", label: "Usuario empresarial" },
  { id: "usuario_personal", label: "Usuario personal" },
  { id: "multibanca", label: "Multibanca (3+ bancos)" },
  { id: "tech_avanzado", label: "Tech: Avanzado" },
  { id: "tech_intermedio", label: "Tech: Intermedio" },
  { id: "tech_basico", label: "Tech: Básico" },
  { id: "smartphone_ios", label: "iPhone / iOS" },
  { id: "smartphone_android", label: "Android" },
  { id: "redes_whatsapp", label: "WhatsApp" },
  { id: "redes_facebook", label: "Facebook" },
  { id: "redes_instagram", label: "Instagram" },
  { id: "redes_linkedin", label: "LinkedIn" },
  { id: "redes_tiktok", label: "TikTok" },
];

const TAG_COLORS: Record<string, string> = {
  General: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  Escenario: "bg-amber-50 text-amber-700 border border-amber-200",
  Dashboard: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Préstamos: "bg-sky-50 text-sky-700 border border-sky-200",
};

const TAG_OPTIONS = ["General", "Escenario", "Dashboard", "Préstamos"] as const;

const getSectionCapture = (section: Section): CaptureMode =>
  section.capture ?? (section.tag === "General" ? "none" : "rating");

const getQuestionCapture = (section: Section, question: Question): CaptureMode =>
  question.capture ?? (section.tag === "General" ? "none" : "rating");

const getQuestionValidation = (question: Question): ValidationType =>
  question.validation ?? "functionality";

const getRatingOptions = (validation: ValidationType) =>
  validation === "copy" ? COPY_RATING_OPTIONS : RATING_OPTIONS;

const getValidationLabel = (question: Question) =>
  getQuestionValidation(question) === "copy" ? "Texto" : "Funcionalidad";

const getCaptureLabel = (capture: CaptureMode) => {
  if (capture === "rating") return "Descripción y escala";
  if (capture === "text") return "Solo descripción";
  if (capture === "scale") return "Solo escala";
  return "Sin registro";
};

const captureHasDescription = (capture: CaptureMode) => capture === "rating" || capture === "text";
const captureHasScale = (capture: CaptureMode) => capture === "rating" || capture === "scale";

const nextId = () => crypto.randomUUID();
const nextSectionId = () => crypto.randomUUID();
const createBlankTemplate = (): Section[] => [{
  id: crypto.randomUUID(),
  label: "Preguntas Generales",
  tag: "General",
  context: "",
  task: "",
  capture: "none",
  questions: [],
}];

// ─── Component ───────────────────────────────────────────────────────────────

export default function App() {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [sesion, setSesion] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<Record<string, Rating>>({});
  const [participants, setParticipants] = useState<Participant[]>(() => {
    try {
      return JSON.parse(localStorage.getItem("ux-research-participants") || "[]");
    } catch {
      return [];
    }
  });
  const [activeParticipantId, setActiveParticipantId] = useState<string | null>(null);
  const [activeStudyId, setActiveStudyId] = useState<string | null>(() => localStorage.getItem("ux-workspace-current") || getActiveResearchStudyId() || "local-current");
  const [studyCatalog, setStudyCatalog] = useState<StudySummary[]>([]);
  const [activeView, setActiveView] = useState<"catalog" | Area>("catalog");
  const [studyMeta, setStudyMeta] = useState<StudyMeta>(() => {
    try {
      return { name: "User Test — BHD Empresarial", creatorName: "", teamName: "", flowName: "", description: "Estudio de usabilidad de la experiencia empresarial.", ...JSON.parse(localStorage.getItem("ux-research-study-meta") || "{}") };
    } catch {
      return { name: "User Test — BHD Empresarial", creatorName: "", teamName: "", flowName: "", description: "Estudio de usabilidad de la experiencia empresarial." };
    }
  });
  const [preset, setPreset] = useState<"transfer" | "blank">("transfer");
  const [includeApproval, setIncludeApproval] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [newStudyMeta, setNewStudyMeta] = useState<StudyMeta>(NEW_STUDY_META);
  const [sections, setSections] = useState<Section[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ux-research-sections") || "null");
      return Array.isArray(saved) && saved.length ? saved : INICIAL;
    } catch {
      return INICIAL;
    }
  });
  const [localItems, setLocalItems] = useState(readLocalCatalog);
  const [storageChoice,setStorageChoice] = useState<"local"|"cloud">("local");
  const [outcomeValues,setOutcomeValues] = useState<Record<string,Outcome>>({});
  const [easeValues,setEaseValues] = useState<Record<string,Rating>>({});
  const [sessionList,setSessionList] = useState(true);
  const [review,setReview] = useState(false);
  const [saving,setSaving] = useState(false);
  const [notice,setNotice] = useState("");
  const openVersion = useRef(0);
  const isLocal = !activeStudyId || localStudy(activeStudyId);
  const interviewSections = enabledSections(sections);
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [sectionResultsExpanded, setSectionResultsExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(INICIAL[0]?.id || null);
  const [exporting, setExporting] = useState(false);
  const [preparedPdf, setPreparedPdf] = useState<{ url: string; filename: string; validationBase64?: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">(supabaseConfigured ? "idle" : "error");
  const [syncError, setSyncError] = useState<string | null>(null);
  const editBackupRef = useRef<Section[] | null>(null);
  const preparedPdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem("ux-research-participants", JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem("ux-research-study-meta", JSON.stringify(studyMeta));
  }, [studyMeta]);

  useEffect(() => {
    if (editMode) return;
    localStorage.setItem("ux-research-sections", JSON.stringify(sections));
  }, [sections, editMode]);

  useEffect(() => {
    if (!activeStudyId || editMode) return;
    if (isLocal) {
      try {
        storeCopy(activeStudyId,{meta:studyMeta,sections,participants});
        setLocalItems(readLocalCatalog());
      } catch { setNotice("El navegador no pudo guardar la copia completa. Exporta el estudio desde Archivos."); }
    }
    localStorage.setItem("ux-workspace-current",activeStudyId);
  },[activeStudyId,editMode,isLocal,studyMeta,sections,participants]);

  useEffect(() => () => {
    if (preparedPdfUrlRef.current) URL.revokeObjectURL(preparedPdfUrlRef.current);
  }, []);

  useEffect(() => {
    if (!preparedPdfUrlRef.current) return;
    URL.revokeObjectURL(preparedPdfUrlRef.current);
    preparedPdfUrlRef.current = null;
    setPreparedPdf(null);
  }, [studyMeta, sections, participants]);


  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    const version=openVersion.current;
    const restoreLocal=isLocal && (activeStudyId !== "local-current" || Boolean(localStorage.getItem("ux-research-supabase-study")) === false);
    setSyncStatus("syncing");
    (async () => {
      const catalog = await listResearchStudies();
      if (catalog.error || restoreLocal) return { catalog, remote: null };
      const preferredStudyId = (activeStudyId && !isLocal ? activeStudyId : getActiveResearchStudyId()) || catalog.studies[0]?.id;
      const remote = await loadResearchFromSupabase(preferredStudyId);
      return { catalog, remote };
    })().then(({ catalog, remote }) => {
      if (cancelled) return;
      const error = catalog.error || remote?.error;
      if (error) { setSyncError(error.message); setSyncStatus("error"); return; }
      setStudyCatalog(catalog.studies);
      if (version!==openVersion.current) return;
      if (remote?.studyId) setActiveStudyId(remote.studyId);
      if (remote?.sections) setSections(remote.sections as Section[]);
      if (remote?.participants) setParticipants(remote.participants as Participant[]);
      if (remote?.meta) setStudyMeta(remote.meta as StudyMeta);
      setSyncError(null);
      setSyncStatus("synced");
    });
    return () => { cancelled = true; };
  }, []);

  const currentSlot = activeParticipantId
    ? participants.findIndex((participant) => participant.id === activeParticipantId) + 1
    : participants.length + 1;

  const totalInterviewSteps = interviewSections.length + 1;
  const safeSectionIndex = Math.min(activeSectionIndex, Math.max(totalInterviewSteps - 1, 0));
  const activeSection = safeSectionIndex === 0 ? null : interviewSections[safeSectionIndex - 1];
  const easeQuestion=activeSection?.tag!=="General" ? activeSection?.questions.find(q=>q.capture==="scale" && q.text.startsWith("Del 1 al 5, ¿qué tan fácil o difícil")) : undefined;
  const editingSection = sections.find((section) => section.id === editingSectionId) || sections[0] || null;

  useEffect(() => {
    if (activeSectionIndex >= totalInterviewSteps) setActiveSectionIndex(Math.max(totalInterviewSteps - 1, 0));
  }, [activeSectionIndex, totalInterviewSteps]);

  useEffect(() => {
    if (activeView !== "template" || editMode) return;
    const frame = window.requestAnimationFrame(() => document.getElementById("interview-journey")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return () => window.cancelAnimationFrame(frame);
  }, [activeSectionIndex, activeView, editMode]);

  // ── Checks ────────────────────────────────────────────────────────────────
  const toggleCheck = (id: string) =>
    setChecks((p) => ({ ...p, [id]: !p[id] }));

  // ── Answers ───────────────────────────────────────────────────────────────
  const setRespuesta = (id: string, val: string) =>
    setRespuestas((p) => ({ ...p, [id]: val }));

  const setRating = (id: string, value: Rating) =>
    setRatings((p) => ({ ...p, [id]: value }));

  const resetParticipantForm = () => {
    setNombre("");
    setEdad("");
    setFecha(new Date().toISOString().split("T")[0]);
    setSesion("");
    setChecks({});
    setRespuestas({});
    setRatings({});
    setOutcomeValues({}); setEaseValues({}); setReview(false);
    setActiveParticipantId(null);
    setActiveSectionIndex(0);
    setSectionResultsExpanded(false);
  };

  const saveParticipant = async () => {
    if (saving) return;
    setSaving(true);
    try {
    const id = activeParticipantId || crypto.randomUUID();
    const participant: Participant = { id, nombre, edad, fecha, sesion, checks, respuestas, ratings, outcomes:outcomeValues, ease:easeValues, savedAt: new Date().toISOString() };
    setParticipants((current) => {
      const exists = current.some((item) => item.id === id);
      return exists ? current.map((item) => item.id === id ? participant : item) : [...current, participant];
    });
    setActiveParticipantId(id);
    if (supabaseConfigured && !isLocal) {
      setSyncStatus("syncing");
      const error = await saveParticipantToSupabase({ sections, meta: studyMeta, participantNumber: activeParticipantId ? currentSlot : participants.length + 1, localId: id, outcomes:outcomeValues, ease:easeValues, nombre, edad, fecha, sesion, checks, respuestas, ratings });
      setSyncError(error?.message || null);
      setSyncStatus(error ? "error" : "synced");
      if (!error) {
        const catalog = await listResearchStudies();
        if (!catalog.error) setStudyCatalog(catalog.studies);
      }
    }
    setReview(false); setSessionList(true);
    setNotice("Entrevista guardada en este navegador.");
    } finally {setSaving(false)}
  };

  const loadParticipant = (participant: Participant) => {
    setNombre(participant.nombre);
    setEdad(participant.edad);
    setFecha(participant.fecha);
    setSesion(participant.sesion);
    setChecks(participant.checks || {});
    setRespuestas(participant.respuestas || {});
    setRatings(participant.ratings || {});
    setOutcomeValues(participant.outcomes || {}); setEaseValues(participant.ease || {}); setReview(false);
    setActiveParticipantId(participant.id);
    setActiveSectionIndex(0);
    setSectionResultsExpanded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const createNewTemplate = () => {
    setStorageChoice("local");
    setPreset("transfer");
    setIncludeApproval(false);
    setNewStudyMeta({ ...NEW_STUDY_META, name: "Prueba de transferencias interbancarias", flowName: "Transferencias interbancarias" });
    setSyncError(null);
    setCreatingTemplate(true);
  };

  const confirmCreateTemplate = async () => {
    if (!newStudyMeta.name.trim() || !newStudyMeta.flowName.trim()) return;
    const initialSections = preset === "transfer" ? createTransferSections(includeApproval) : createBlankTemplate();
    setSyncStatus("syncing");
    openVersion.current++;
    const result = storageChoice==="local" ? {studyId:"local-"+crypto.randomUUID(),error:null} : await createResearchStudy(initialSections, newStudyMeta);
    if (result.error || !result.studyId) {
      setSyncError(result.error?.message || "No se pudo crear la plantilla en Supabase");
      setSyncStatus("error");
      return;
    }
    if (!localStudy(result.studyId)) activateResearchStudy(result.studyId);
    setActiveStudyId(result.studyId);
    setStudyMeta(newStudyMeta);
    setSections(initialSections);
    setParticipants([]);
    resetParticipantForm();
    setSyncError(null);
    setSyncStatus("synced");
    setCreatingTemplate(false);
    setActiveView("prep"); setSessionList(true);
    setEditingSectionId(initialSections[0].id);
    editBackupRef.current = initialSections;
    setEditMode(false);
    if (storageChoice==="local") return;
    const catalog = await listResearchStudies();
    if (!catalog.error) setStudyCatalog(catalog.studies);
  };

  const openStudy = async (studyId: string, view: Area = "prep") => {
    setSyncStatus("syncing");
    const version=++openVersion.current;
    setNotice(""); setSessionList(true);
    if(localStudy(studyId)) {
      const snapshot=readLocalCatalog()[studyId]?.study;
      if(!snapshot) return false;
      setStudyMeta(snapshot.meta); setSections(snapshot.sections); setParticipants(snapshot.participants);
      setActiveStudyId(studyId); resetParticipantForm(); setSyncStatus("idle"); setSyncError(null); setActiveView(view); return true;
    }
    const remote = await loadResearchFromSupabase(studyId);
    if (version!==openVersion.current) return false;
    if (remote.error || !remote.meta || !remote.sections || !remote.participants) {
      setSyncError(remote.error?.message || "No se pudo abrir la plantilla");
      setSyncStatus("error");
      return false;
    }
    setActiveStudyId(studyId);
    setStudyMeta(remote.meta as StudyMeta);
    setSections(remote.sections as Section[]);
    setParticipants(remote.participants as Participant[]);
    resetParticipantForm();
    setSyncError(null);
    setSyncStatus("synced");
    setActiveView(view);
    return true;
  };

  const ratingStats = (id: string) => {
    const values = participants.map((participant) => participant.ratings?.[id]).filter(Boolean) as Rating[];
    const counts = RATING_OPTIONS.map((option) => values.filter((value) => value === option.value).length);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { values, counts, average };
  };

  const metricQuestions = sections.flatMap((section) =>
    section.questions
      .filter((question) => captureHasScale(getQuestionCapture(section, question)))
      .map((question) => ({ section, question, stats: ratingStats(question.id) }))
  );
  const scenarioRanking = metricQuestions.map((item) => ({ ...item, stats: ratingStats(item.question.id) })).sort((a, b) => (a.stats.average || 9) - (b.stats.average || 9));
  const insightNotes = participants.flatMap((participant) => Object.entries(participant.respuestas || {})
    .filter(([key, value]) => key.endsWith("_notas") && value.trim())
    .map(([, value]) => value.trim())).slice(0, 3);

  const questionNotes = (id: string) => participants
    .map((participant, index) => ({
      participant,
      index,
      note: participant.respuestas?.[id]?.trim() || "",
      rating: participant.ratings?.[id],
    }))
    .filter((entry) => entry.note);

  const ratingCountLabel = (count: number, total: number, option: { short: string }) =>
    `${count} de ${total || participants.length || 10} usuarios marcaron ${option.short}`;

  const strongestFinding = scenarioRanking.find((item) => item.stats.values.length);

  const CalmRatingControl = ({ id, validation = "functionality" }: { id: string; validation?: ValidationType }) => {
    const options = getRatingOptions(validation);
    return (
      <div className="pt-1">

        <div className="grid grid-cols-5 gap-2">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              aria-pressed={ratings[id] === option.value}
              onClick={() => setRating(id, option.value)}
              title={option.label}
              className={`min-h-11 rounded-xl border px-1.5 py-2 text-center text-[10px] font-semibold leading-tight transition-all sm:text-xs ${ratings[id] === option.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary/60 hover:bg-primary/5 hover:text-primary"}`}
            >
              <span className="block text-sm font-bold">{option.value}</span>
              <span className="mt-0.5 hidden sm:block">{option.short}</span>
            </button>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground"><span>{options[0].short}</span><span>{options[4].short}</span></div>
      </div>
    );
  };

  const openTemplateEditor = (id?:string) => {
    setNotice("");
    editBackupRef.current = sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => ({ ...question })),
    }));
    if (sections.some(s=>s.label==="Pago múltiple y comprobante") && sections.some(s=>s.label==="Envío expreso") && !sections.some(s=>s.optional || s.label==="Solicitud sometida (opcional)")) {
      const optional=createTransferSections(false).find(s=>s.optional);
      if(optional)setSections(prev=>[...prev,optional]);
    }
    setEditingSectionId(id || activeSection?.id || sections[0]?.id || null);
    setEditMode(true);
  };

  const cancelTemplateEditor = () => {
    if (editBackupRef.current) setSections(editBackupRef.current);
    editBackupRef.current = null;
    setEditMode(false);
  };

  const saveTemplateEditor = async () => {
    const invalid=sections.find(s=>s.screen?.url && !screenUrl(s.screen.url));
    if(invalid){setEditingSectionId(invalid.id);setNotice("Revisa el enlace de la pantalla. Debe comenzar con https://.");return;}
    if (supabaseConfigured && !isLocal) {
      setSyncStatus("syncing");
      const result = await syncStudyTemplate(sections, studyMeta, activeStudyId || undefined);
      setSyncError(result.error?.message || null);
      setSyncStatus(result.error ? "error" : "synced");
      if (result.error) return;
      const catalog = await listResearchStudies();
      if (!catalog.error) setStudyCatalog(catalog.studies);
    }
    editBackupRef.current = null;
    setEditMode(false);
  };

  // ── Section editing ───────────────────────────────────────────────────────
  const updateSection = (sId: string, field: keyof Section, val: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === sId ? { ...s, [field]: val } : s))
    );

  const deleteSection = (sId: string) =>
    setSections((prev) => {
      const remaining = prev.filter((section) => section.id !== sId);
      if (editingSectionId === sId) setEditingSectionId(remaining[0]?.id || null);
      return remaining;
    });

  const addSection = () => {
    const id = nextSectionId();
    setSections((prev) => [
      ...prev,
      {
        id,
        label: "Nueva sección",
        tag: "Escenario",
        context: "",
        task: "",
        capture: "rating",
        questions: [{ id: nextId(), text: "Nueva pregunta", capture: "rating" }],
      },
    ]);
    setEditingSectionId(id);
  };

  // ── Question editing ──────────────────────────────────────────────────────
  const updateQuestion = (sId: string, qId: string, text: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sId
          ? { ...s, questions: s.questions.map((q) => (q.id === qId ? { ...q, text } : q)) }
          : s
      )
    );

  const updateQuestionCapture = (sId: string, qId: string, capture: CaptureMode) =>
    setSections((prev) => prev.map((section) => section.id === sId
      ? { ...section, questions: section.questions.map((question) => question.id === qId ? { ...question, capture } : question) }
      : section));

  const updateQuestionValidation = (sId: string, qId: string, validation: ValidationType) =>
    setSections((prev) => prev.map((section) => section.id === sId
      ? { ...section, questions: section.questions.map((question) => question.id === qId ? { ...question, validation } : question) }
      : section));

  const deleteQuestion = (sId: string, qId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sId
          ? { ...s, questions: s.questions.filter((q) => q.id !== qId) }
          : s
      )
    );

  const addQuestion = (sId: string) =>
    setSections((prev) =>
      prev.map((s) =>
        s.id === sId
          ? { ...s, questions: [...s.questions, { id: nextId(), text: "Nueva pregunta", capture: "rating", validation: "functionality" }] }
          : s
      )
    );

  // ── PDF export ────────────────────────────────────────────────────────────
  const buildTemplatePdfNode = () => {
    const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const textBlock = (value: string) => escapeHtml(value.trim() || "Sin definir").replace(/\n/g, "<br />");
    const sectionsHtml = interviewSections.map((section, sectionIndex) => `
      <section style="border-top:1px solid #d1d5db;padding-top:14px;margin-top:16px;page-break-inside:auto;">
        <div style="page-break-inside:avoid;">
          <div style="font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:.8px;">${String(sectionIndex + 1).padStart(2, "0")} · ${escapeHtml(section.tag)}</div>
          <h2 style="font-size:16px;margin:4px 0 8px;">${escapeHtml(section.label)}</h2>
          ${section.context ? `<p style="font-size:11px;margin:0 0 5px;"><strong>Contexto:</strong> ${textBlock(section.context)}</p>` : ""}
          ${section.task ? `<p style="font-size:11px;margin:0 0 10px;"><strong>Tarea:</strong> ${textBlock(section.task)}</p>` : ""}
          <p style="font-size:10px;color:#4b5563;margin:0 0 9px;"><strong>Registro general:</strong> ${escapeHtml(getCaptureLabel(getSectionCapture(section)))}</p>
        </div>
        ${section.questions.length ? section.questions.map((question, questionIndex) => `<div style="margin:9px 0;padding:9px 11px;border:1px solid #e5e7eb;border-radius:7px;page-break-inside:avoid;"><div style="font-size:11px;font-weight:700;">${questionIndex + 1}. ${escapeHtml(question.text || "Pregunta sin texto")}</div><div style="font-size:9px;color:#6b7280;margin-top:4px;">Validación: ${escapeHtml(getValidationLabel(question))} · Registro: ${escapeHtml(getCaptureLabel(getQuestionCapture(section, question)))}</div></div>`).join("") : `<p style="font-size:11px;color:#6b7280;font-style:italic;">Esta sección todavía no tiene preguntas.</p>`}
      </section>`).join("");
    const node = document.createElement("div");
    node.innerHTML = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;width:720px;line-height:1.45;"><header style="background:#1A1F36;color:#fff;border-radius:10px;padding:18px 20px;margin-bottom:16px;"><div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:.72;">Plantilla de user testing</div><div style="font-size:22px;font-weight:700;margin-top:4px;">${escapeHtml(studyMeta.name || "Plantilla sin nombre")}</div><div style="font-size:11px;opacity:.78;margin-top:5px;">${escapeHtml(studyMeta.teamName || "Equipo no definido")} · ${escapeHtml(studyMeta.flowName || "Flujo no definido")}</div></header><section style="font-size:11px;margin-bottom:16px;page-break-inside:avoid;"><p style="margin:0 0 5px;"><strong>Creada por:</strong> ${textBlock(studyMeta.creatorName)}</p><p style="margin:0 0 5px;"><strong>Descripción:</strong> ${textBlock(studyMeta.description)}</p><p style="margin:0;"><strong>Contenido:</strong> ${sections.length} secciones · ${sections.reduce((total, section) => total + section.questions.length, 0)} preguntas · 0 participantes</p></section>${sectionsHtml}</div>`;
    node.style.position = "absolute"; node.style.left = "0"; node.style.top = "0"; node.style.width = "720px"; node.style.background = "#fff"; node.style.zIndex = "-1"; node.style.pointerEvents = "none"; document.body.appendChild(node); return node;
  };

  const buildParticipantsPdfNode = () => {
    const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const textBlock = (value: string) => escapeHtml(value.trim() || "empty").replace(/\n/g, "<br />");
    const ratingLabel = (value?: number) => RATING_OPTIONS.find((option) => option.value === value)?.label || "Sin registrar";
    const participantSections = participants.map((participant, index) => `
      <section style="page-break-before: ${index ? "always" : "auto"}; padding-top: 8px;">
        <div style="background:#1A1F36;color:#fff;border-radius:10px;padding:14px 16px;margin-bottom:14px;">
          <div style="font-size:10px;letter-spacing:1px;text-transform:uppercase;opacity:.7;">Participante ${index + 1}</div>
          <div style="font-size:20px;font-weight:700;margin-top:3px;">${escapeHtml(participant.nombre || participant.sesion || `Usuario ${index + 1}`)}</div>
          <div style="font-size:11px;opacity:.75;margin-top:4px;">${escapeHtml(participant.sesion || "Sin código")} · ${escapeHtml(participant.fecha || "Sin fecha")} · ${escapeHtml(participant.edad || "Edad no registrada")}</div>
        </div>
        <div style="font-size:12px;margin-bottom:16px;"><strong>Datos demográficos:</strong> ${textBlock(DEMOGRAFICOS.filter((item) => participant.checks?.[item.id]).map((item) => item.label).join(", "))}</div>
        ${sections.filter(s=>s.enabled!==false || participant.outcomes?.[s.id] || participant.ease?.[s.id] || s.questions.some(q=>participant.ratings?.[q.id] || participant.respuestas?.[q.id])).map((section) => `<section style="border-top:1px solid #d1d5db;padding-top:12px;margin-top:12px;page-break-inside:avoid;"><div style="font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:.8px;">${escapeHtml(section.tag)}</div><h2 style="font-size:15px;margin:3px 0 5px;">${escapeHtml(section.label)}</h2>${section.tag !== "General" ? `<p>Logro observado: ${escapeHtml(participant.outcomes?.[section.id] || "Sin registrar")} · Facilidad percibida: ${summarize(section,[participant]).sum || "—"} / 5</p>` : ""}${section.context ? `<p style="font-size:11px;margin:0 0 5px;"><strong>Contexto:</strong> ${textBlock(section.context)}</p>` : ""}${section.task ? `<p style="font-size:11px;margin:0 0 5px;"><strong>Tarea:</strong> ${textBlock(section.task)}</p>` : ""}${captureHasScale(getSectionCapture(section)) ? `<p style="font-size:11px;margin:0 0 10px;"><strong>Resultado del escenario:</strong> ${escapeHtml(ratingLabel(participant.ratings?.[section.id]))}</p>` : ""}${section.questions.map((question, questionIndex) => `<div style="margin:10px 0;page-break-inside:avoid;"><div style="font-size:11px;font-weight:700;">${questionIndex + 1}. ${escapeHtml(question.text)}</div>${captureHasScale(getQuestionCapture(section, question)) ? `<div style="font-size:10px;color:#4b5563;margin:3px 0;">Registro: ${escapeHtml(ratingLabel(participant.ratings?.[question.id]))}</div>` : ""}${captureHasDescription(getQuestionCapture(section, question)) ? `<div style="font-size:11px;border-left:2px solid #9ca3af;padding-left:8px;">${textBlock(participant.respuestas?.[question.id] || "")}</div>` : ""}</div>`).join("")}<div style="margin-top:8px;font-size:11px;"><strong>Notas:</strong> ${textBlock(participant.respuestas?.[`${section.id}_notas`] || "")}</div></section>`).join("")}
      </section>`).join("");
    const node = document.createElement("div");
    node.innerHTML = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;width:720px;line-height:1.45;"><div style="border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:16px;"><div style="font-size:18px;font-weight:700;">${escapeHtml(studyMeta.name)}</div><div style="font-size:11px;color:#4b5563;margin-top:4px;">Reporte de user testing · ${escapeHtml(studyMeta.teamName || "Equipo no definido")} · ${escapeHtml(studyMeta.flowName || "Flujo no definido")}</div><div style="font-size:10px;color:#6b7280;margin-top:4px;">${escapeHtml(studyMeta.description || "Sin descripción")} · ${participants.length} participante${participants.length === 1 ? "" : "s"}</div></div>${participantSections}</div>`;
    node.style.position = "absolute"; node.style.left = "0"; node.style.top = "0"; node.style.width = "720px"; node.style.background = "#fff"; node.style.zIndex = "-1"; node.style.pointerEvents = "none"; document.body.appendChild(node); return node;
  };

  const handleExport = async () => {
    setExporting(true);
    const exportNode = participants.length ? buildParticipantsPdfNode() : buildTemplatePdfNode();
    try {
      // @ts-ignore – html2pdf.js has no types package
      const html2pdf = (await import("html2pdf.js")).default;
      const filenameSlug = (studyMeta.name || "user-test")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "") || "user-test";
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const contentToExport = exportNode.firstElementChild || exportNode;

      const pdfOptions = {
          margin: [12, 12, 12, 12],
          filename: `ux-research-${filenameSlug}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 1.5,
            backgroundColor: "#ffffff",
            logging: false,
            useCORS: true,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        };
      const pdfBlob = await html2pdf().set(pdfOptions).from(contentToExport).outputPdf("blob");
      if (preparedPdfUrlRef.current) URL.revokeObjectURL(preparedPdfUrlRef.current);
      const downloadUrl = URL.createObjectURL(pdfBlob);
      const validationBase64 = import.meta.env.DEV ? await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(pdfBlob);
      }) : undefined;
      preparedPdfUrlRef.current = downloadUrl;
      setPreparedPdf({ url: downloadUrl, filename: pdfOptions.filename, validationBase64 });
    } catch { setNotice("No se pudo generar el PDF. Puedes volver a intentarlo."); } finally {
      exportNode.remove();
      setExporting(false);
    }
  };

  const goToArea=(area: Area | "catalog")=>{
    if(area==="template") setSessionList(true);
    setActiveView(area);
  };
  const currentSummary: StudySummary = {
    id: activeStudyId || "local-current",
    name: studyMeta.name,
    description: studyMeta.description,
    creatorName: studyMeta.creatorName,
    teamName: studyMeta.teamName,
    flowName: studyMeta.flowName,
    status: "draft",
    sectionCount: sections.length,
    questionCount: sections.reduce((sum, section) => sum + section.questions.length, 0),
    participantCount: participants.length,
    updatedAt: new Date().toISOString(),
  };
  const catalogStudies = [...localSummaries(localItems),...studyCatalog].filter(s=>s.id!==currentSummary.id);
  catalogStudies.unshift(currentSummary);
  const study = {meta: studyMeta, sections, participants};
  const importCopy=(copy:Study)=>{
    const id="local-"+crypto.randomUUID();
    storeCopy(id,copy); setLocalItems(readLocalCatalog()); void openStudy(id);
    setNotice("Copia importada como estudio independiente.");
  };
  async function savePreparation(meta:StudyMeta) {
    if (!isLocal) {
      const result=await syncStudyTemplate(sections,meta,activeStudyId || undefined);
      if(result.error){setNotice(result.error.message);return false}
    }
    setStudyMeta(meta);return true;
  }

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
      {/* Top bar – hidden in PDF */}
      <header className="bg-[#18213a] text-white px-4 py-3 flex flex-wrap gap-2 items-center justify-between sticky top-0 z-20 no-print">
        <div className="flex items-center gap-3">
          {activeView !== "catalog" ? <button onClick={() => goToArea("catalog")} className="rounded-lg p-1.5 hover:bg-white/10" title="Volver al administrador"><ArrowLeft size={18} /></button> : <LayoutDashboard size={18} />}
          <span className="text-sm font-semibold tracking-wide uppercase">Estudios de usabilidad</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs">{isLocal ? "En este navegador" : syncStatus==="syncing"?"Sincronizando…":syncStatus==="error"?"Sincronización pendiente":"Estudio en la nube"}</span>
        </div>
      </header>

      {notice && <div className="px-5 py-2 bg-blue-50 text-sm" role="status">{notice} <button aria-label="Cerrar aviso" onClick={()=>setNotice("")}>×</button></div>}
      {!isLocal && syncError && <div className="px-5 py-2 bg-amber-50 text-sm" role="alert">{syncError}</div>}
      <div className={activeView==="catalog"?undefined:"study-shell"}>
      {activeView!=="catalog" && <StudyNavigation area={activeView} name={studyMeta.name} go={goToArea}/>}
      <div className="study-content">
      {activeView==="prep" && <Preparation key={activeStudyId} meta={studyMeta} sections={sections} onSave={savePreparation} onEdit={openTemplateEditor} onStart={()=>goToArea("template")}/>}
      {activeView==="files" && <Files study={study} onImport={importCopy} onPdf={handleExport} pdf={preparedPdf} busy={exporting}/>}
      {activeView === "catalog" && (
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-border pb-5">
            <h1 className="text-3xl font-semibold tracking-tight">Mis estudios</h1>
            <button onClick={createNewTemplate} className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Nueva plantilla</button>
          </div>
          <div className="space-y-4">
            {catalogStudies.map((study) => {
              const isActive = study.id === activeStudyId || (study.id === "local-current" && !activeStudyId);
              const openSelectedStudy = (view: Area) => isActive ? setActiveView(view) : void openStudy(study.id, view);
              return (
                <section key={study.id} className={`rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${isActive ? "border-primary/35 ring-1 ring-primary/10" : "border-border"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-5">
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold">{study.name}</h2>
                      {study.description && <p className="mt-1 text-sm text-muted-foreground">{study.description}</p>}
                      <p className="mt-3 text-xs text-muted-foreground">{study.status === "draft" ? "Borrador" : study.status === "active" ? "Activa" : "Archivada"} · {study.sectionCount} secciones · {study.participantCount} entrevistas guardadas</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                              <button className="rounded-lg border px-3 py-2" onClick={() => openSelectedStudy("metrics")}>Resultados</button>
                      <button className="rounded-lg bg-primary px-4 py-2 font-semibold text-primary-foreground" onClick={() => openSelectedStudy("prep")}>Abrir estudio</button>
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
          <label className="study-field">Importar copia de un estudio<input type="file" accept=".json" onChange={async e=>{const input=e.currentTarget;const file=input.files?.[0];if(file)try{importCopy(await importStudy(file))}catch{setNotice("Selecciona una copia JSON válida exportada desde Archivos.")}input.value=""}}/></label>
          {creatingTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Crear nueva plantilla">
              <section className="max-h-[90dvh] overflow-y-auto w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <h2 className="text-xl font-semibold">Nueva plantilla</h2>
                  <button onClick={() => setCreatingTemplate(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X size={17} /></button>
                </div>
                <div className="mb-5 space-y-3">
                  <label className="study-field">Guardar en<select value={storageChoice} onChange={e=>setStorageChoice(e.target.value as "local"|"cloud")}><option value="local">Este navegador</option><option value="cloud">Supabase</option></select></label>
                  <label className="block text-sm font-semibold">Guion inicial
                    <select value={preset} onChange={event => {
                      const transfer = event.target.value === "transfer";
                      setPreset(transfer ? "transfer" : "blank");
                      setNewStudyMeta(current => ({ ...current,
                        name: current.name === "Prueba de transferencias interbancarias" || !current.name ? (transfer ? "Prueba de transferencias interbancarias" : "") : current.name,
                        flowName: current.flowName === "Transferencias interbancarias" || !current.flowName ? (transfer ? "Transferencias interbancarias" : "") : current.flowName
                      }));
                    }} className="mt-1 block w-full rounded-lg border p-3">
                      <option value="transfer">Transferencias interbancarias</option>
                      <option value="blank">Plantilla en blanco</option>
                    </select>
                  </label>
                  {preset === "transfer" && <div className="rounded-lg bg-muted p-3 text-sm">
                    <p>Tres tareas principales y cuatro evaluaciones adicionales.</p>
                    <label className="mt-2 flex items-center gap-2"><input type="checkbox" checked={includeApproval} onChange={event => setIncludeApproval(event.target.checked)} /> Incluir «Solicitud sometida» (opcional)</label>
                  </div>}
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold">Nombre de la plantilla<input autoFocus value={newStudyMeta.name} onChange={(event) => setNewStudyMeta((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Transferencias internacionales" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="space-y-1.5 text-xs font-semibold">Flujo o funcionalidad<input value={newStudyMeta.flowName} onChange={(event) => setNewStudyMeta((current) => ({ ...current, flowName: event.target.value }))} placeholder="Qué experiencia se probará" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <details className="md:col-span-2 text-sm">
                    <summary className="cursor-pointer py-2 font-semibold">Datos opcionales del estudio</summary>
                    <div className="mt-2 grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold">Creador<input value={newStudyMeta.creatorName} onChange={(event) => setNewStudyMeta((current) => ({ ...current, creatorName: event.target.value }))} placeholder="Nombre del investigador" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="space-y-1.5 text-xs font-semibold">Equipo / mesa<input value={newStudyMeta.teamName} onChange={(event) => setNewStudyMeta((current) => ({ ...current, teamName: event.target.value }))} placeholder="Equipo responsable" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="space-y-1.5 text-xs font-semibold md:col-span-2">Descripción<textarea value={newStudyMeta.description} onChange={(event) => setNewStudyMeta((current) => ({ ...current, description: event.target.value }))} placeholder="Objetivo y alcance del user test" rows={3} className="w-full resize-none rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                    </div>
                  </details>
                </div>
                {syncError && syncStatus === "error" && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{syncError}</p>}
                <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCreatingTemplate(false)} className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted">Cancelar</button><button onClick={() => void confirmCreateTemplate()} disabled={!newStudyMeta.name.trim() || !newStudyMeta.flowName.trim() || (storageChoice==="cloud" && syncStatus === "syncing")} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45">{storageChoice==="cloud" && syncStatus === "syncing" ? "Creando…" : "Crear plantilla"}</button></div>
              </section>
            </div>
          )}
        </main>
      )}

      {activeView === "metrics" && (
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="study-heading"><h1 className="text-3xl font-semibold">Resultados</h1><button onClick={()=>setActiveView("files")}>Informe PDF</button></div>
          <ResultsOverview study={study}/>
          <details><summary className="cursor-pointer py-3 font-semibold">Detalle por pregunta</summary>
          {participants.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <BarChart3 className="mx-auto text-muted-foreground" size={28} />
              <h2 className="mt-3 text-base font-semibold">Aun no hay metricas disponibles</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Cuando guardes entrevistas, aqui apareceran los promedios, distribuciones y comentarios por flujo.</p>
              <button onClick={() => goToArea("template")} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Registrar entrevistas</button>
            </section>
          ) : (
            <div className="space-y-4">
              {strongestFinding && (
                <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5">
                  <div className="flex items-start gap-3">
                    <span className="mt-0.5 rounded-lg bg-amber-100 p-2 text-amber-700"><Lightbulb size={18} /></span>
                    <div>
                      <p className="text-sm font-semibold">Hallazgo principal</p>
                      <p className="mt-1 text-sm leading-relaxed text-foreground">{strongestFinding.question.text} concentra la friccion mas alta dentro de {strongestFinding.section.label}: promedio {strongestFinding.stats.average.toFixed(1)}/5 basado en {strongestFinding.stats.values.length} participante{strongestFinding.stats.values.length === 1 ? "" : "s"}.</p>
                      {questionNotes(strongestFinding.question.id).length > 0 && <p className="mt-2 border-l-2 border-amber-300 pl-3 text-xs text-muted-foreground">{questionNotes(strongestFinding.question.id)[0].note}</p>}
                    </div>
                  </div>
                </section>
              )}

              {metricQuestions.map(({ section, question, stats }) => {
                const notes = questionNotes(question.id);
                const options = getRatingOptions(getQuestionValidation(question));
                return (
                  <section key={question.id} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
                    <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
                      <div>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${TAG_COLORS[section.tag]}`}>{section.tag}</span>
                        <h2 className="mt-2 text-lg font-semibold">{question.text}</h2>
                        <p className="mt-1 text-xs font-medium text-muted-foreground">{section.label} · {getValidationLabel(question)}</p>
                        {section.task && <p className="mt-1 max-w-3xl text-xs leading-relaxed text-muted-foreground">{section.task}</p>}
                      </div>
                      <div className="rounded-xl bg-muted/40 px-4 py-3 text-right">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Promedio</p>
                        <p className="text-2xl font-bold">{stats.values.length ? stats.average.toFixed(1) : "—"}/5</p>
                        <p className="text-[11px] text-muted-foreground">{stats.values.length} de {participants.length} usuarios</p>
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 lg:grid-cols-[.95fr_1.05fr]">
                      <div className="rounded-xl border border-border p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{getQuestionValidation(question) === "copy" ? "Comprension del texto" : "Facilidad de la experiencia"}</p>
                          <span className="text-[11px] text-muted-foreground">{stats.values.length ? `${stats.values.length} respuestas` : "Sin respuestas"}</span>
                        </div>
                        <div className="space-y-2.5">
                          {options.map((option, index) => {
                            const count = stats.counts[index];
                            const width = stats.values.length ? (count / stats.values.length) * 100 : 0;
                            return (
                              <div key={option.value}>
                                <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
                                  <span className="font-medium text-foreground">{option.short}</span>
                                  <span className="text-muted-foreground">{ratingCountLabel(count, stats.values.length, option)}</span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-muted">
                                  <div className={`h-full rounded-full ${option.color}`} style={{ width: `${width}%` }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="rounded-xl border border-border p-4">
                        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notas del entrevistador</p>
                        {notes.length ? (
                          <div className="space-y-2">
                            {notes.map((entry) => (
                              <div key={`${question.id}-${entry.participant.id}`} className="rounded-lg bg-muted/40 p-3">
                                <div className="mb-1 flex items-center justify-between gap-2">
                                  <span className="text-xs font-semibold">Usuario {entry.index + 1}</span>
                                  <span className="text-[10px] text-muted-foreground">{entry.rating ? options.find((option) => option.value === entry.rating)?.label : "Sin escala"}</span>
                                </div>
                                <p className="text-xs leading-relaxed text-muted-foreground">{entry.note}</p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">Aun no hay descripcion escrita para esta pregunta.</p>
                        )}
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          )}
          </details>
        </main>
      )}

      {activeView==="template" && sessionList && <main className="study-page">
        <div className="study-heading"><h1>Entrevistas</h1><button className="strong" onClick={()=>{resetParticipantForm();setSessionList(false)}}>Nueva entrevista</button></div>
        <p>{participants.length} de {(studyMeta.method || defaultMethod).sample} entrevistas previstas</p>
        <section className="study-panel"><h2>Sesiones guardadas</h2>{participants.length===0?<p>Aquí aparecerán las entrevistas que guardes.</p>:participants.map((p,i)=><div className="session-row" key={p.id}><div><strong>{p.nombre || p.sesion || "Participante "+(i+1)}</strong><p>{[p.sesion,p.fecha].filter(Boolean).join(" · ")}</p></div><button onClick={()=>{loadParticipant(p);setSessionList(false)}}>Abrir entrevista</button></div>)}</section>
      </main>}
      {activeView === "template" && !sessionList && <div className="mx-auto max-w-6xl px-4 py-6 pdf-root">

        {(
          <div className="no-print">
            <section id="interview-journey" className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-16">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sesión de user testing</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{studyMeta.name}</h1></div>
                <div className="flex items-center gap-3"><span className="text-xs font-semibold text-muted-foreground">Paso {safeSectionIndex + 1} de {totalInterviewSteps}</span><span className="text-xs text-muted-foreground">Entrevista en curso</span></div>
              </div>
              {!review && <label className="lg:hidden flex flex-wrap items-center gap-3 px-5 py-3 text-sm font-semibold">
                Ir a la sección
                <select className="min-w-0 max-w-full rounded-lg border px-3 py-2 font-normal" value={safeSectionIndex} onChange={event => { setActiveSectionIndex(Number(event.target.value)); setSectionResultsExpanded(false); }}>
                  <option value={0}>Datos del participante</option>
                  {interviewSections.map((section, i) => <option key={section.id} value={i + 1}>{section.label}</option>)}
                </select>
              </label>}
            </section>

            <div className="grid items-start gap-4 lg:grid-cols-[200px_minmax(0,1fr)]">
              <aside className="hidden lg:block rounded-xl border border-border bg-card p-3">
                <h2 className="mb-2 font-semibold">Guion</h2>
                {["Datos del participante",...interviewSections.map(s=>s.label)].map((name,i)=><button className="task-link" key={i} aria-current={!review && safeSectionIndex===i?"step":undefined} onClick={()=>{setReview(false);setActiveSectionIndex(i)}}>{name}</button>)}
              </aside>
              <main id="active-scenario" className="min-w-0 space-y-4">
                {review ? <section className="study-panel"><h2>Revisar entrevista</h2><p>{nombre || sesion || "Participante "+currentSlot}</p><ol>{interviewSections.map((s,i)=><li key={s.id}><button onClick={()=>{setReview(false);setActiveSectionIndex(i+1)}}>{s.label}</button> · {outcomeValues[s.id] || "Sin observación"}</li>)}</ol><div className="study-actions"><button onClick={()=>setReview(false)}>Volver</button><button disabled={saving} className="strong" onClick={saveParticipant}>Guardar entrevista</button></div></section> : !activeSection ? (
                  <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                    <div className="border-b border-border px-5 py-5 sm:px-7">
                      <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><User size={19} /></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paso 01 · Preparación</p><h2 className="mt-1 text-xl font-semibold tracking-tight">Datos del usuario</h2></div></div>
                      <p className="mt-3 max-w-2xl text-xs leading-relaxed text-muted-foreground">Completa la ficha del participante antes de comenzar las preguntas generales y los escenarios del test.</p>
                    </div>
                    <div className="space-y-6 p-5 sm:p-7">
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nombre o identificador</label><input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej. Participante anónimo" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                        <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Código de sesión</label><input value={sesion} onChange={(event) => setSesion(event.target.value)} placeholder="Ej. P-03" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                        <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Edad</label><input type="number" value={edad} onChange={(event) => setEdad(event.target.value)} placeholder="Edad" className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                        <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha</label><input type="date" value={fecha} onChange={(event) => setFecha(event.target.value)} className="w-full rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                      </div>
                      <div><div className="mb-3"><p className="text-sm font-semibold">Perfil y datos demográficos</p><p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona solo las características relevantes para esta sesión.</p></div><div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{DEMOGRAFICOS.map((item) => <label key={item.id} className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-[11px] transition-colors ${checks[item.id] ? "border-primary/30 bg-primary/5 font-semibold text-primary" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}><input type="checkbox" checked={!!checks[item.id]} onChange={() => toggleCheck(item.id)} className="sr-only" /><span className={`flex h-4 w-4 items-center justify-center rounded border ${checks[item.id] ? "border-primary bg-primary text-white" : "border-border"}`}>{checks[item.id] && <Check size={10} />}</span>{item.label}</label>)}</div></div>
                    </div>
                  </section>
                ) : (<>
                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <div className="border-b border-border px-5 py-5 sm:px-7">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${TAG_COLORS[activeSection.tag]}`}>{activeSection.tag}</span>
                      <span className="text-[11px] font-medium text-muted-foreground">Paso {String(safeSectionIndex + 1).padStart(2, "0")} de {totalInterviewSteps}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold tracking-tight text-foreground">{activeSection.label}</h2>
                    {activeSection.task && <div className="mt-4 border-l-4 border-accent bg-muted/40 px-4 py-3"><p className="text-xs font-semibold text-muted-foreground">Consigna para leer</p><p className="mt-1 text-base leading-relaxed">{activeSection.task}</p></div>}
                    {activeSection.criterion && <p className="mt-4 text-sm"><strong>Criterio de logro</strong> · {activeSection.criterion}</p>}
                    {activeSection.screen && <div className="mt-3">{screenUrl(activeSection.screen.url) && <a className="underline" href={screenUrl(activeSection.screen.url)} target="_blank" rel="noreferrer">{activeSection.screen.name || "Abrir pantalla de prueba"}</a>}<p className="text-sm">{activeSection.screen.instructions}</p></div>}
                    {activeSection.context && <details key={activeSection.id} className="mt-3 text-sm text-muted-foreground"><summary className="cursor-pointer font-semibold">Guía del moderador</summary><p className="mt-2 leading-relaxed">{activeSection.context}</p></details>}
                  </div>

                  {captureHasScale(getSectionCapture(activeSection)) && <div className="p-5"><p className="mb-2 font-semibold">Valoración de la sección</p><CalmRatingControl id={activeSection.id}/></div>}
                  {activeSection.tag!=="General" && <div className="space-y-4 border-b p-5 sm:px-7">
                    <fieldset><legend className="mb-2 font-semibold">Resultado observado</legend><div className="outcome-row">{outcomes.map(o=><button key={o} aria-pressed={outcomeValues[activeSection.id]===o} onClick={()=>setOutcomeValues({...outcomeValues,[activeSection.id]:o})}>{o}</button>)}</div></fieldset>
                    <fieldset><legend className="mb-2 font-semibold">Facilidad percibida por el participante</legend><div className="outcome-row">{([1,2,3,4,5] as Rating[]).map(v=><button aria-label={"Facilidad "+v+" de 5"} key={v} aria-pressed={(easeValues[activeSection.id] ?? ratings[easeQuestion?.id || ""])===v} onClick={()=>{setEaseValues({...easeValues,[activeSection.id]:v});if(easeQuestion)setRating(easeQuestion.id,v)}}>{v}</button>)}</div><small>1 · Muy difícil　　5 · Muy fácil</small></fieldset>
                  </div>}
                  <div className="divide-y divide-border">
                    {activeSection.questions.filter(q=>q!==easeQuestion).map((question, index) => {
                      const capture = getQuestionCapture(activeSection, question);
                      return <div key={question.id} className="px-5 py-5 sm:px-7">
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-xs font-bold text-muted-foreground">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2"><p className="max-w-3xl text-sm font-semibold leading-relaxed text-foreground">{question.text}</p></div>
                            {capture !== "none" && <div className="mt-4 space-y-4">{captureHasDescription(capture) && <div><label className="mb-2 block text-[11px] font-semibold text-foreground">Notas del entrevistador</label><textarea value={respuestas[question.id] || ""} onChange={(event) => setRespuesta(question.id, event.target.value)} rows={3} placeholder="Escribe observaciones, frases y comportamientos relevantes…" className="w-full resize-none rounded-xl border border-border bg-input-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring" /></div>}{captureHasScale(capture) && <CalmRatingControl id={question.id} validation={getQuestionValidation(question)} />}</div>}
                          </div>
                        </div>
                      </div>;
                    })}
                  </div>

                  <div className="border-t border-border bg-muted/15 px-5 py-5 sm:px-7"><label className="mb-2 block text-[11px] font-semibold text-foreground">Observaciones y comentarios</label><textarea value={respuestas[`${activeSection.id}_notas`] || ""} onChange={(event) => setRespuesta(`${activeSection.id}_notas`, event.target.value)} rows={3} placeholder="Registra dónde dudó, qué dijo y qué ocurrió." className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <button type="button" onClick={() => setSectionResultsExpanded((value) => !value)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 sm:px-6"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Ver resultados de este escenario</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{activeSection.questions.filter((question) => captureHasScale(getQuestionCapture(activeSection, question))).length} preguntas medibles · {participants.length} participantes</span></span>{sectionResultsExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}</button>
                  {sectionResultsExpanded && <div className="grid gap-3 border-t border-border bg-muted/15 p-5 sm:grid-cols-2">{activeSection.questions.filter((question) => captureHasScale(getQuestionCapture(activeSection, question))).map((question) => { const stats = ratingStats(question.id); const options = getRatingOptions(getQuestionValidation(question)); return <div key={question.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold leading-relaxed">{question.text}</p><span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-bold">{stats.values.length ? stats.average.toFixed(1) : "—"}/5</span></div><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">{stats.counts.map((count, optionIndex) => <span key={optionIndex} className={options[optionIndex].color} style={{ width: `${stats.values.length ? (count / stats.values.length) * 100 : 0}%` }} />)}</div><p className="mt-2 text-[10px] text-muted-foreground">{stats.values.length ? `${stats.values.length} respuestas registradas` : "Aún no hay valoraciones"}</p></div>; })}{!activeSection.questions.some((question) => captureHasScale(getQuestionCapture(activeSection, question))) && <p className="sm:col-span-2 py-4 text-center text-xs text-muted-foreground">Este escenario no tiene preguntas con escala activa.</p>}</div>}
                </section>
                </>)}

                {!review && <div className="flex items-center justify-between gap-3 pb-8"><button type="button" disabled={safeSectionIndex === 0} onClick={() => { setActiveSectionIndex((index) => Math.max(index - 1, 0)); setSectionResultsExpanded(false); document.getElementById("interview-journey")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={14} /> Anterior</button>{safeSectionIndex < totalInterviewSteps - 1 ? <button type="button" onClick={() => { setActiveSectionIndex((index) => Math.min(index + 1, totalInterviewSteps - 1)); setSectionResultsExpanded(false); document.getElementById("interview-journey")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90">Continuar <ChevronDown size={14} className="-rotate-90" /></button> : <button type="button" onClick={()=>setReview(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90">Revisar entrevista</button>}</div>}
              </main>


            </div>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
            Estudios de usabilidad · {new Date().getFullYear()}
          </p>
        </div>
      </div>}

      </div></div>
      {editMode && activeView === "prep" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm no-print" role="dialog" aria-modal="true" aria-label="Editar plantilla existente">
          <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Pencil size={18} /></span><div><h2 className="text-base font-semibold">Editar guion</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona una sección para editarla. Los cambios se aplican al guardar.</p></div></div>
              <button type="button" onClick={cancelTemplateEditor} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Cerrar editor"><X size={18} /></button>
            </header>

            <div className="grid min-h-0 flex-1 md:grid-cols-[250px_minmax(0,1fr)]">
              <aside className="min-h-0 overflow-y-auto border-b border-border bg-muted/20 p-3 md:border-b-0 md:border-r">
                <div className="mb-2 rounded-xl border border-border bg-card px-3 py-3 opacity-70"><div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold">Datos del usuario</span><span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase text-muted-foreground">Fijo</span></div><p className="mt-1 text-[10px] leading-relaxed text-muted-foreground">Nombre, código, edad, fecha y perfil demográfico.</p></div>
                <p className="mb-2 mt-4 px-1 text-[9px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Secciones de la plantilla</p>
                <div className="space-y-1.5">{sections.map((section, index) => <button key={section.id} type="button" onClick={() => setEditingSectionId(section.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors ${editingSection?.id === section.id ? "border-primary bg-primary text-primary-foreground" : "border-transparent bg-card hover:border-border hover:bg-muted"}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ${editingSection?.id === section.id ? "bg-white/15" : "bg-muted text-muted-foreground"}`}>{String(index + 1).padStart(2, "0")}</span><span className="min-w-0"><span className="block truncate text-xs font-semibold">{section.label}</span><span className={`mt-0.5 block text-[9px] uppercase tracking-wider ${editingSection?.id === section.id ? "text-white/65" : "text-muted-foreground"}`}>{section.tag} · {section.questions.length} preguntas</span></span></button>)}</div>
                <button type="button" onClick={addSection} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 px-3 py-3 text-xs font-semibold text-primary hover:bg-primary/5"><Plus size={14} /> Agregar escenario</button>
              </aside>

              <main className="min-h-0 overflow-y-auto p-4 sm:p-6">
                {editingSection ? <div className="mx-auto max-w-3xl space-y-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Editando contenido existente</p><h3 className="mt-1 text-lg font-semibold">{editingSection.label}</h3></div><button type="button" disabled={sections.length <= 1} onClick={() => deleteSection(editingSection.id)} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={13} /> Eliminar sección</button></div>

                  <div className="grid gap-4 rounded-2xl border border-border bg-muted/20 p-4 sm:grid-cols-[180px_minmax(0,1fr)]">
                    <details key={editingSection.id} className="ref-editor sm:col-span-2"><summary>Editar pantalla</summary>
                      {([["name","Nombre de la pantalla"],["url","Enlace al frame o prototipo (https://)"],["instructions","Indicaciones para el moderador"]] as const).map(([key,title])=><label className="study-field" key={key}>{title}<input value={editingSection.screen?.[key] || ""} onChange={e=>setSections(prev=>prev.map(s=>s.id===editingSection.id?{...s,screen:{name:"",url:"",instructions:"",...s.screen,[key]:e.target.value}}:s))}/></label>)}</details>
                    <label className="study-field sm:col-span-2">Criterio de logro<input value={editingSection.criterion || ""} onChange={e=>updateSection(editingSection.id,"criterion",e.target.value)}/></label>
                    {(editingSection.optional || editingSection.label==="Solicitud sometida (opcional)") && <label className="sm:col-span-2"><input type="checkbox" checked={editingSection.enabled!==false} onChange={e=>setSections(prev=>prev.map(s=>s.id===editingSection.id?{...s,optional:true,enabled:e.target.checked}:s))}/> Incluir esta tarea opcional en las entrevistas</label>}
                    <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tipo</label><select value={editingSection.tag} onChange={(event) => updateSection(editingSection.id, "tag", event.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">{TAG_OPTIONS.map((tag) => <option key={tag} value={tag}>{tag}</option>)}</select></div>
                    <div><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Nombre de la sección</label><input value={editingSection.label} onChange={(event) => updateSection(editingSection.id, "label", event.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    <div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contexto</label><textarea value={editingSection.context} onChange={(event) => updateSection(editingSection.id, "context", event.target.value)} rows={2} placeholder="Contexto que verá el entrevistador…" className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    <div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tarea</label><textarea value={editingSection.task} onChange={(event) => updateSection(editingSection.id, "task", event.target.value)} rows={2} placeholder="Tarea que debe completar el participante…" className="w-full resize-none rounded-xl border border-border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                    <div className="sm:col-span-2"><label className="mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Registro general de la sección</label><select value={getSectionCapture(editingSection)} onChange={(event) => updateSection(editingSection.id, "capture", event.target.value)} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring">{CAPTURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{getCaptureLabel(option.value)} · {option.description}</option>)}</select></div>
                  </div>

                  <div><div className="mb-3 flex items-end justify-between gap-3"><div><h4 className="text-sm font-semibold">Preguntas</h4><p className="mt-0.5 text-[11px] text-muted-foreground">Modifica el texto, la validación y el tipo de registro de cada pregunta.</p></div><span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold text-muted-foreground">{editingSection.questions.length}</span></div><div className="space-y-3">{editingSection.questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-border p-4"><div className="flex items-start gap-3"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{index + 1}</span><div className="min-w-0 flex-1 space-y-3"><textarea value={question.text} onChange={(event) => updateQuestion(editingSection.id, question.id, event.target.value)} rows={2} className="w-full resize-none rounded-xl border border-border bg-input-background px-3 py-2.5 text-sm font-medium leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring" /><div className="grid gap-2 sm:grid-cols-2"><div><label className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Qué se valida</label><select value={getQuestionValidation(question)} onChange={(event) => updateQuestionValidation(editingSection.id, question.id, event.target.value as ValidationType)} className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[11px]">{VALIDATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></div><div><label className="mb-1 block text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Qué se registra</label><select value={getQuestionCapture(editingSection, question)} onChange={(event) => updateQuestionCapture(editingSection.id, question.id, event.target.value as CaptureMode)} className="w-full rounded-lg border border-border bg-card px-2.5 py-2 text-[11px]">{CAPTURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{getCaptureLabel(option.value)}</option>)}</select></div></div></div><button type="button" onClick={() => deleteQuestion(editingSection.id, question.id)} className="rounded-lg p-2 text-muted-foreground hover:bg-rose-50 hover:text-rose-600" title="Eliminar pregunta"><Trash2 size={14} /></button></div></article>)}</div><button type="button" onClick={() => addQuestion(editingSection.id)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-primary/40 px-3 py-3 text-xs font-semibold text-primary hover:bg-primary/5"><Plus size={14} /> Agregar pregunta</button></div>
                </div> : <div className="flex min-h-64 flex-col items-center justify-center text-center"><ClipboardList size={26} className="text-muted-foreground" /><p className="mt-3 text-sm font-semibold">No hay secciones en la plantilla</p><button type="button" onClick={addSection} className="mt-3 rounded-xl bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Crear primera sección</button></div>}
              </main>
            </div>

            {notice && <p role="status" className="px-5 text-sm">{notice}</p>}
            {!isLocal && syncError && <p role="alert" className="px-5 text-sm">{syncError}</p>}
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-border bg-muted/20 px-5 py-4 sm:px-6"><p className="hidden text-[11px] text-muted-foreground sm:block">Puedes cancelar para recuperar la versión anterior.</p><div className="ml-auto flex items-center gap-2"><button type="button" onClick={cancelTemplateEditor} className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted">Cancelar</button><button type="button" onClick={saveTemplateEditor} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"><Save size={14} /> Guardar cambios</button></div></footer>
          </section>
        </div>
      )}

      {/* Print styles injected globally */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .pdf-only { display: block !important; }
          .avoid-break { page-break-inside: avoid; }
          body { background: white !important; }
          .pdf-root { max-width: 100% !important; padding: 0 !important; }
        }
        .pdf-only { display: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
