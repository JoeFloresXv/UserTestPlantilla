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

interface Question {
  id: string;
  text: string;
  capture?: CaptureMode;
  validation?: ValidationType;
}

interface Section {
  id: string;
  label: string;
  tag: "General" | "Escenario" | "Dashboard" | "Préstamos";
  context: string;
  task: string;
  capture?: CaptureMode;
  questions: Question[];
}

type CaptureMode = "rating" | "scale" | "text" | "none";
type ValidationType = "functionality" | "copy";

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

type Rating = 1 | 2 | 3 | 4 | 5;

interface Participant {
  id: string;
  nombre: string;
  edad: string;
  fecha: string;
  sesion: string;
  checks: Record<string, boolean>;
  respuestas: Record<string, string>;
  ratings: Record<string, Rating>;
  savedAt?: string;
}

interface StudyMeta {
  name: string;
  creatorName: string;
  teamName: string;
  flowName: string;
  description: string;
}

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

let uid = 1000;
const nextId = () => `q${++uid}`;
const nextSectionId = () => `s${++uid}`;
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
  const [activeStudyId, setActiveStudyId] = useState<string | null>(() => getActiveResearchStudyId());
  const [studyCatalog, setStudyCatalog] = useState<StudySummary[]>([]);
  const [activeView, setActiveView] = useState<"catalog" | "template" | "metrics">("catalog");
  const [studyMeta, setStudyMeta] = useState<StudyMeta>(() => {
    try {
      return { name: "User Test — BHD Empresarial", creatorName: "", teamName: "", flowName: "", description: "Estudio de usabilidad de la experiencia empresarial.", ...JSON.parse(localStorage.getItem("ux-research-study-meta") || "{}") };
    } catch {
      return { name: "User Test — BHD Empresarial", creatorName: "", teamName: "", flowName: "", description: "Estudio de usabilidad de la experiencia empresarial." };
    }
  });
  const [editingMeta, setEditingMeta] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);
  const [newStudyMeta, setNewStudyMeta] = useState<StudyMeta>(NEW_STUDY_META);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<Section[]>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("ux-research-sections") || "null");
      return Array.isArray(saved) && saved.length ? saved : INICIAL;
    } catch {
      return INICIAL;
    }
  });
  const [activeSectionIndex, setActiveSectionIndex] = useState(0);
  const [sectionResultsExpanded, setSectionResultsExpanded] = useState(false);
  const [participantDetailsExpanded, setParticipantDetailsExpanded] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(INICIAL[0]?.id || null);
  const [exporting, setExporting] = useState(false);
  const [preparedPdf, setPreparedPdf] = useState<{ url: string; filename: string; validationBase64?: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">(supabaseConfigured ? "idle" : "error");
  const [syncError, setSyncError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const editBackupRef = useRef<Section[] | null>(null);
  const preparedPdfUrlRef = useRef<string | null>(null);

  useEffect(() => {
    localStorage.setItem("ux-research-participants", JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem("ux-research-study-meta", JSON.stringify(studyMeta));
  }, [studyMeta]);

  useEffect(() => {
    localStorage.setItem("ux-research-sections", JSON.stringify(sections));
  }, [sections]);

  useEffect(() => () => {
    if (preparedPdfUrlRef.current) URL.revokeObjectURL(preparedPdfUrlRef.current);
  }, []);

  useEffect(() => {
    if (!preparedPdfUrlRef.current) return;
    URL.revokeObjectURL(preparedPdfUrlRef.current);
    preparedPdfUrlRef.current = null;
    setPreparedPdf(null);
  }, [studyMeta, sections, participants]);

  const updateStudyMeta = (field: keyof StudyMeta, value: string) => setStudyMeta((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    setSyncStatus("syncing");
    (async () => {
      const catalog = await listResearchStudies();
      if (catalog.error) return { catalog, remote: null };
      const preferredStudyId = getActiveResearchStudyId() || catalog.studies[0]?.id;
      const remote = await loadResearchFromSupabase(preferredStudyId);
      return { catalog, remote };
    })().then(({ catalog, remote }) => {
      if (cancelled) return;
      const error = catalog.error || remote?.error;
      if (error) { setSyncError(error.message); setSyncStatus("error"); return; }
      setStudyCatalog(catalog.studies);
      if (remote?.studyId) setActiveStudyId(remote.studyId);
      if (remote?.sections) setSections(remote.sections as Section[]);
      if (remote?.participants) setParticipants(remote.participants as Participant[]);
      if (remote?.meta) setStudyMeta(remote.meta as StudyMeta);
      setSyncError(null);
      setSyncStatus("synced");
    });
    return () => { cancelled = true; };
  }, []);

  const today = new Date().toLocaleDateString("es-DO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const currentSlot = activeParticipantId
    ? participants.findIndex((participant) => participant.id === activeParticipantId) + 1
    : Math.min(participants.length + 1, 10);

  const totalInterviewSteps = sections.length + 1;
  const safeSectionIndex = Math.min(activeSectionIndex, Math.max(totalInterviewSteps - 1, 0));
  const activeSection = safeSectionIndex === 0 ? null : sections[safeSectionIndex - 1];
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
    setActiveParticipantId(null);
    setActiveSectionIndex(0);
    setSectionResultsExpanded(false);
  };

  const saveParticipant = async () => {
    const id = activeParticipantId || `p-${Date.now()}`;
    const participant: Participant = { id, nombre, edad, fecha, sesion, checks, respuestas, ratings, savedAt: new Date().toISOString() };
    setParticipants((current) => {
      const exists = current.some((item) => item.id === id);
      return exists ? current.map((item) => item.id === id ? participant : item) : [...current, participant];
    });
    setActiveParticipantId(id);
    if (supabaseConfigured) {
      setSyncStatus("syncing");
      const error = await saveParticipantToSupabase({ sections, meta: studyMeta, participantNumber: activeParticipantId ? currentSlot : Math.min(participants.length + 1, 10), localId: id, nombre, edad, fecha, sesion, checks, respuestas, ratings });
      setSyncError(error?.message || null);
      setSyncStatus(error ? "error" : "synced");
      if (!error) {
        const catalog = await listResearchStudies();
        if (!catalog.error) setStudyCatalog(catalog.studies);
      }
    }
  };

  const loadParticipant = (participant: Participant) => {
    setNombre(participant.nombre);
    setEdad(participant.edad);
    setFecha(participant.fecha);
    setSesion(participant.sesion);
    setChecks(participant.checks || {});
    setRespuestas(participant.respuestas || {});
    setRatings(participant.ratings || {});
    setActiveParticipantId(participant.id);
    setActiveSectionIndex(0);
    setSectionResultsExpanded(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveTemplateMeta = async () => {
    setEditingMeta(false);
    if (!supabaseConfigured) return;
    setSyncStatus("syncing");
    const result = await syncStudyTemplate(sections, studyMeta, activeStudyId || undefined);
    setSyncError(result.error?.message || null);
    setSyncStatus(result.error ? "error" : "synced");
    if (!result.error) {
      if (result.studyId) setActiveStudyId(result.studyId);
      const catalog = await listResearchStudies();
      if (!catalog.error) setStudyCatalog(catalog.studies);
    }
  };

  const createNewTemplate = () => {
    setNewStudyMeta(NEW_STUDY_META);
    setSyncError(null);
    setCreatingTemplate(true);
  };

  const confirmCreateTemplate = async () => {
    if (!newStudyMeta.name.trim() || !newStudyMeta.flowName.trim()) return;
    const blankSections = createBlankTemplate();
    setSyncStatus("syncing");
    const result = await createResearchStudy(blankSections, newStudyMeta);
    if (result.error || !result.studyId) {
      setSyncError(result.error?.message || "No se pudo crear la plantilla en Supabase");
      setSyncStatus("error");
      return;
    }
    activateResearchStudy(result.studyId);
    setActiveStudyId(result.studyId);
    setStudyMeta(newStudyMeta);
    setSections(blankSections);
    setParticipants([]);
    resetParticipantForm();
    setSyncError(null);
    setSyncStatus("synced");
    setCreatingTemplate(false);
    setActiveView("template");
    setEditingSectionId(blankSections[0].id);
    editBackupRef.current = blankSections.map((section) => ({ ...section, questions: [] }));
    setEditMode(true);
    const catalog = await listResearchStudies();
    if (!catalog.error) setStudyCatalog(catalog.studies);
  };

  const openStudy = async (studyId: string, view: "template" | "metrics" = "template") => {
    setSyncStatus("syncing");
    activateResearchStudy(studyId);
    const remote = await loadResearchFromSupabase(studyId);
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

  const editStudyMeta = async (studyId: string) => {
    if (studyId === "local-current") {
      setEditingMeta(true);
      return;
    }
    if (studyId !== activeStudyId && !(await openStudy(studyId))) return;
    setActiveView("catalog");
    setEditingMeta(true);
  };

  const ratingStats = (id: string) => {
    const values = participants.map((participant) => participant.ratings?.[id]).filter(Boolean) as Rating[];
    const counts = RATING_OPTIONS.map((option) => values.filter((value) => value === option.value).length);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { values, counts, average };
  };

  const metricSections = sections.filter((section) => section.tag !== "General" && captureHasScale(getSectionCapture(section)));
  const metricQuestions = sections.flatMap((section) =>
    section.questions
      .filter((question) => captureHasScale(getQuestionCapture(section, question)))
      .map((question) => ({ section, question, stats: ratingStats(question.id) }))
  );
  const allScenarioRatings = metricQuestions.flatMap((item) => item.stats.values);
  const overallAverage = allScenarioRatings.length ? allScenarioRatings.reduce((sum, value) => sum + value, 0) / allScenarioRatings.length : 0;
  const participantCompletion = (participant: Participant) => {
    if (!metricQuestions.length) return 0;
    const completed = metricQuestions.filter(({ question }) => participant.ratings?.[question.id]).length;
    return Math.round((completed / metricQuestions.length) * 100);
  };
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

  const sectionNotes = (section: Section) => participants
    .map((participant, index) => ({
      participant,
      index,
      note: participant.respuestas?.[`${section.id}_notas`]?.trim() || "",
      rating: participant.ratings?.[section.id],
    }))
    .filter((entry) => entry.note);

  const ratingCountLabel = (count: number, total: number, option: { short: string }) =>
    `${count} de ${total || participants.length || 10} usuarios marcaron ${option.short}`;

  const strongestFinding = scenarioRanking.find((item) => item.stats.values.length);

  const RatingControl = ({ id, compact = false, validation = "functionality" }: { id: string; compact?: boolean; validation?: ValidationType }) => {
    const stats = ratingStats(id);
    const options = getRatingOptions(validation);
    return (
      <div className={`rounded-xl border border-border bg-muted/30 ${compact ? "p-3" : "p-4"}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold text-foreground">Registro del entrevistador</p>
            <p className="text-[11px] text-muted-foreground">Según lo observado, ¿qué tan fácil fue para la persona?</p>
          </div>
          {stats.values.length > 0 && <span className="text-[11px] font-medium text-muted-foreground">Histórico: {stats.average.toFixed(1)}/5 · {stats.values.length} respuestas</span>}
        </div>
        <div className="mt-3 grid grid-cols-5 gap-1.5">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
              onClick={() => setRating(id, option.value)}
              title={option.label}
              className={`rounded-lg border px-1 py-2 text-center text-[10px] font-semibold leading-tight transition-all sm:text-xs ${ratings[id] === option.value ? "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border bg-card text-muted-foreground hover:border-primary hover:text-primary"}`}
            >{option.short}</button>
          ))}
        </div>
        {stats.values.length > 0 && !compact && (
          <div className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-muted" aria-label="Distribución de respuestas">
            {stats.counts.map((count, index) => <span key={index} className={options[index].color} style={{ width: `${(count / stats.values.length) * 100}%` }} />)}
          </div>
        )}
      </div>
    );
  };

  const CalmRatingControl = ({ id, validation = "functionality" }: { id: string; validation?: ValidationType }) => {
    const options = getRatingOptions(validation);
    return (
      <div className="pt-1">
        <p className="mb-3 text-xs font-semibold text-foreground">
          {validation === "copy" ? "¿Qué tan claro o entendible fue el texto?" : "¿Qué tan fácil fue completar esta experiencia?"}
        </p>
        <div className="grid grid-cols-5 gap-2">
          {options.map((option) => (
            <button
              type="button"
              key={option.value}
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

  const toggleSection = (id: string) =>
    setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const openTemplateEditor = () => {
    editBackupRef.current = sections.map((section) => ({
      ...section,
      questions: section.questions.map((question) => ({ ...question })),
    }));
    setEditingSectionId(activeSection?.id || sections[0]?.id || null);
    setEditMode(true);
  };

  const cancelTemplateEditor = () => {
    if (editBackupRef.current) setSections(editBackupRef.current);
    editBackupRef.current = null;
    setEditMode(false);
  };

  const saveTemplateEditor = async () => {
    if (supabaseConfigured) {
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
  const buildTextOnlyPdfNode = () => {
    const selectedDemographics = DEMOGRAFICOS
      .filter((d) => checks[d.id])
      .map((d) => d.label);

    const escapeHtml = (value: string) =>
      value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;");

    const textBlock = (value: string) =>
      escapeHtml(value.trim() || "empty").replace(/\n/g, "<br />");

    const ratingLabel = (id: string) =>
      RATING_OPTIONS.find((option) => option.value === ratings[id])?.label || "Sin registrar";

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; width: 720px; padding: 0; line-height: 1.45;">
        <div style="border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 18px;">
          <div style="font-size: 18px; font-weight: 700; letter-spacing: .3px;">UX Research — Notas de sesión</div>
          <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Documento exportado solo con texto · ${escapeHtml(today)}</div>
        </div>

        <section style="margin-bottom: 20px; page-break-inside: avoid;">
          <h1 style="font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: .8px;">Perfil del participante</h1>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr><td style="width: 34%; padding: 6px 0; color: #4b5563;">Nombre</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(nombre)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563;">Edad</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(edad)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563;">Fecha</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(fecha)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563;">Código de participante</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(sesion)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563; vertical-align: top;">Datos demográficos</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(selectedDemographics.join(", "))}</td></tr>
          </table>
        </section>

        ${participants.length ? `
          <section style="margin-bottom: 20px; page-break-inside: avoid;">
            <h1 style="font-size: 14px; margin: 0 0 10px; text-transform: uppercase; letter-spacing: .8px;">Resumen comparativo</h1>
            ${sections.filter((section) => section.tag !== "General" && captureHasScale(getSectionCapture(section))).map((section) => {
              const stats = ratingStats(section.id);
              return `<div style="font-size: 12px; padding: 7px 0; border-top: 1px solid #e5e7eb;"><strong>${escapeHtml(section.label)}</strong><br /><span style="color: #4b5563;">Promedio: ${stats.values.length ? `${stats.average.toFixed(1)}/5` : "Sin datos"} · ${stats.values.length} valoraciones</span></div>`;
            }).join("")}
          </section>
        ` : ""}

        ${sections.map((section) => `
          <section style="border-top: 1px solid #d1d5db; padding-top: 14px; margin-top: 16px; page-break-inside: avoid;">
            <div style="font-size: 10px; color: #4b5563; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 4px;">${escapeHtml(section.tag)}</div>
            <h2 style="font-size: 15px; margin: 0 0 10px; color: #111827;">${escapeHtml(section.label)}</h2>
            ${section.context ? `<p style="font-size: 12px; margin: 0 0 6px;"><strong>Contexto:</strong> ${textBlock(section.context)}</p>` : ""}
            ${section.task ? `<p style="font-size: 12px; margin: 0 0 12px;"><strong>Tarea:</strong> ${textBlock(section.task)}</p>` : ""}
            ${section.tag !== "General" ? `<p style="font-size: 12px; margin: 0 0 12px;"><strong>Resultado del escenario:</strong> ${escapeHtml(ratingLabel(section.id))}</p>` : ""}
            <div>
              ${section.questions.map((q, i) => `
                <div style="margin: 12px 0; page-break-inside: avoid;">
                   <div style="font-size: 12px; font-weight: 700; margin-bottom: 4px;">${i + 1}. ${escapeHtml(q.text)}</div>
                   <div style="font-size: 11px; color: #4b5563; margin-bottom: 4px;">Facilidad observada: ${escapeHtml(ratingLabel(q.id))}</div>
                   <div style="font-size: 12px; white-space: normal; color: #111827; border-left: 2px solid #9ca3af; padding-left: 10px;">${textBlock(respuestas[q.id] || "")}</div>
                </div>
              `).join("")}
            </div>
            <div style="margin-top: 12px; page-break-inside: avoid;">
              <div style="font-size: 12px; font-weight: 700; margin-bottom: 4px;">Notas adicionales / observaciones</div>
              <div style="font-size: 12px; border-left: 2px solid #9ca3af; padding-left: 10px;">${textBlock(respuestas[`${section.id}_notas`] || "")}</div>
            </div>
          </section>
        `).join("")}
      </div>
    `;

    const node = document.createElement("div");
    node.innerHTML = html;
    node.style.position = "absolute";
    node.style.left = "0";
    node.style.top = "0";
    node.style.width = "720px";
    node.style.background = "#ffffff";
    node.style.zIndex = "-1";
    node.style.pointerEvents = "none";
    node.style.color = "#111827";
    document.body.appendChild(node);
    return node;
  };

  const buildTemplatePdfNode = () => {
    const escapeHtml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const textBlock = (value: string) => escapeHtml(value.trim() || "Sin definir").replace(/\n/g, "<br />");
    const sectionsHtml = sections.map((section, sectionIndex) => `
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
        ${sections.map((section) => `<section style="border-top:1px solid #d1d5db;padding-top:12px;margin-top:12px;page-break-inside:avoid;"><div style="font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:.8px;">${escapeHtml(section.tag)}</div><h2 style="font-size:15px;margin:3px 0 5px;">${escapeHtml(section.label)}</h2>${section.context ? `<p style="font-size:11px;margin:0 0 5px;"><strong>Contexto:</strong> ${textBlock(section.context)}</p>` : ""}${section.task ? `<p style="font-size:11px;margin:0 0 5px;"><strong>Tarea:</strong> ${textBlock(section.task)}</p>` : ""}${captureHasScale(getSectionCapture(section)) ? `<p style="font-size:11px;margin:0 0 10px;"><strong>Resultado del escenario:</strong> ${escapeHtml(ratingLabel(participant.ratings?.[section.id]))}</p>` : ""}${section.questions.map((question, questionIndex) => `<div style="margin:10px 0;page-break-inside:avoid;"><div style="font-size:11px;font-weight:700;">${questionIndex + 1}. ${escapeHtml(question.text)}</div>${captureHasScale(getQuestionCapture(section, question)) ? `<div style="font-size:10px;color:#4b5563;margin:3px 0;">Registro: ${escapeHtml(ratingLabel(participant.ratings?.[question.id]))}</div>` : ""}${captureHasDescription(getQuestionCapture(section, question)) ? `<div style="font-size:11px;border-left:2px solid #9ca3af;padding-left:8px;">${textBlock(participant.respuestas?.[question.id] || "")}</div>` : ""}</div>`).join("")}<div style="margin-top:8px;font-size:11px;"><strong>Notas:</strong> ${textBlock(participant.respuestas?.[`${section.id}_notas`] || "")}</div></section>`).join("")}
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
    } finally {
      exportNode.remove();
      setExporting(false);
    }
  };

  const catalogStudies: StudySummary[] = studyCatalog.length ? studyCatalog : [{
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
  }];

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      {/* Top bar – hidden in PDF */}
      <header className="bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between sticky top-0 z-20 no-print">
        <div className="flex items-center gap-3">
          {activeView !== "catalog" ? <button onClick={() => setActiveView("catalog")} className="rounded-lg p-1.5 hover:bg-white/10" title="Volver al administrador"><ArrowLeft size={18} /></button> : <LayoutDashboard size={18} />}
          <span className="text-sm font-semibold tracking-wide uppercase">UX Research — Plantilla de Notas</span>
        </div>
        <div className="flex items-center gap-2">
          <span title={syncError || undefined} className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold sm:flex ${syncStatus === "synced" ? "bg-emerald-500/20 text-emerald-100" : syncStatus === "syncing" ? "bg-amber-500/20 text-amber-100" : syncStatus === "error" ? "bg-rose-500/20 text-rose-100" : "bg-white/10 text-white/70"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {syncStatus === "synced" ? "Guardado en Supabase" : syncStatus === "syncing" ? "Guardando en Supabase…" : syncStatus === "error" ? "No sincronizado" : "Supabase listo"}
          </span>
          {activeView === "template" && <button
            onClick={saveParticipant}
            disabled={!activeParticipantId && participants.length >= 10}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-40"
            title="Guardar esta entrevista"
          >
            <Save size={13} /> {activeParticipantId ? "Actualizar sesión" : "Guardar sesión"}
          </button>}
          {/* Edit toggle */}
          {activeView === "template" && <button
            onClick={openTemplateEditor}
            className="flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80 transition-colors hover:bg-white/20"
          >
            <Pencil size={13} /> Editar plantilla
          </button>}
          {/* Export PDF */}
          {activeView === "template" && <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download size={13} />
            {exporting ? "Preparando…" : "Exportar PDF"}
          </button>}
          {activeView === "template" && preparedPdf && <a href={preparedPdf.url} download={preparedPdf.filename} data-pdf-validation={preparedPdf.validationBase64} className="flex items-center gap-1.5 rounded-lg border border-emerald-300/40 bg-emerald-500/20 px-3 py-1.5 text-xs font-semibold text-emerald-50 hover:bg-emerald-500/30"><Check size={13} /> Descargar PDF</a>}
        </div>
      </header>

      {activeView === "catalog" && (
        <main className="mx-auto max-w-6xl px-4 py-8">
          <section className="mb-6 rounded-3xl bg-gradient-to-br from-primary to-[#3949b8] p-6 text-primary-foreground shadow-lg sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Research workspace</p><h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Administra tus plantillas de user testing.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">Centraliza el contexto del estudio, las entrevistas y los reportes comparativos en un solo lugar.</p></div>
              <div className="rounded-2xl bg-white/10 p-4 text-sm backdrop-blur"><p className="text-white/70">Plantillas activas</p><p className="mt-1 text-3xl font-semibold">{catalogStudies.length}</p></div>
            </div>
          </section>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Mis plantillas</h2><p className="text-sm text-muted-foreground">Selecciona una plantilla para abrir sus notas y participantes.</p></div><button onClick={createNewTemplate} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">+ Nueva plantilla</button></div>
          <div className="space-y-4">
            {catalogStudies.map((study) => {
              const isActive = study.id === activeStudyId || (study.id === "local-current" && !activeStudyId);
              const openSelectedStudy = (view: "template" | "metrics") => isActive ? setActiveView(view) : void openStudy(study.id, view);
              return (
                <section key={study.id} className={`rounded-2xl border bg-card p-5 shadow-sm transition-all hover:shadow-md ${isActive ? "border-primary/35 ring-1 ring-primary/10" : "border-border"}`}>
                  <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
                    <div className="flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText size={22} /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{study.name}</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">{study.status === "draft" ? "Borrador" : study.status === "active" ? "Activa" : "Archivada"}</span>{isActive && <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-semibold text-primary">Seleccionada</span>}</div><p className="mt-1 text-sm text-muted-foreground">{study.description || "Sin descripción"}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="rounded-lg bg-muted px-2 py-1">Creador: {study.creatorName || "Sin definir"}</span><span className="rounded-lg bg-muted px-2 py-1">Equipo: {study.teamName || "Sin definir"}</span><span className="rounded-lg bg-muted px-2 py-1">Flujo: {study.flowName || "Sin definir"}</span></div></div></div>
                    <div className="flex shrink-0 flex-wrap gap-2"><button onClick={() => openSelectedStudy("metrics")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"><BarChart3 size={15} /> Métricas</button><button onClick={() => void editStudyMeta(study.id)} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">Editar ficha</button><button onClick={() => openSelectedStudy("template")} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Abrir plantilla</button></div>
                  </div>
                  <div className="mt-5 grid grid-cols-3 gap-3 border-t border-border pt-4 text-center"><div><p className="text-lg font-semibold">{study.sectionCount}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Secciones</p></div><div><p className="text-lg font-semibold">{study.questionCount}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Preguntas</p></div><div><p className="text-lg font-semibold">{study.participantCount}/10</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usuarios</p></div></div>
                </section>
              );
            })}
          </div>
          {creatingTemplate && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Crear nueva plantilla">
              <section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl">
                <div className="mb-5 flex items-start justify-between gap-4">
                  <div><p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Nueva investigación</p><h3 className="mt-1 text-lg font-semibold">Crear una plantilla independiente</h3><p className="mt-1 text-sm text-muted-foreground">Comenzará vacía, con sus propias preguntas, escenarios, participantes y resultados. La plantilla actual no se modificará.</p></div>
                  <button onClick={() => setCreatingTemplate(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X size={17} /></button>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-1.5 text-xs font-semibold">Nombre de la plantilla<input autoFocus value={newStudyMeta.name} onChange={(event) => setNewStudyMeta((current) => ({ ...current, name: event.target.value }))} placeholder="Ej. Transferencias internacionales" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="space-y-1.5 text-xs font-semibold">Flujo o funcionalidad<input value={newStudyMeta.flowName} onChange={(event) => setNewStudyMeta((current) => ({ ...current, flowName: event.target.value }))} placeholder="Qué experiencia se probará" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="space-y-1.5 text-xs font-semibold">Creador<input value={newStudyMeta.creatorName} onChange={(event) => setNewStudyMeta((current) => ({ ...current, creatorName: event.target.value }))} placeholder="Nombre del investigador" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="space-y-1.5 text-xs font-semibold">Equipo / mesa<input value={newStudyMeta.teamName} onChange={(event) => setNewStudyMeta((current) => ({ ...current, teamName: event.target.value }))} placeholder="Equipo responsable" className="w-full rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                  <label className="space-y-1.5 text-xs font-semibold md:col-span-2">Descripción<textarea value={newStudyMeta.description} onChange={(event) => setNewStudyMeta((current) => ({ ...current, description: event.target.value }))} placeholder="Objetivo y alcance del user test" rows={3} className="w-full resize-none rounded-lg border border-border bg-input-background px-3 py-2.5 text-sm font-normal" /></label>
                </div>
                {syncError && syncStatus === "error" && <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{syncError}</p>}
                <div className="mt-5 flex justify-end gap-2"><button onClick={() => setCreatingTemplate(false)} className="rounded-lg border border-border px-4 py-2.5 text-xs font-semibold hover:bg-muted">Cancelar</button><button onClick={() => void confirmCreateTemplate()} disabled={!newStudyMeta.name.trim() || !newStudyMeta.flowName.trim() || syncStatus === "syncing"} className="rounded-lg bg-primary px-4 py-2.5 text-xs font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-45">{syncStatus === "syncing" ? "Creando…" : "Crear y configurar"}</button></div>
              </section>
            </div>
          )}
          {editingMeta && activeView === "catalog" && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"><section className="w-full max-w-2xl rounded-2xl border border-border bg-card p-5 shadow-2xl"><div className="mb-4 flex items-center justify-between"><div><h3 className="text-sm font-semibold">Editar ficha de la plantilla</h3><p className="text-xs text-muted-foreground">Estos datos aparecerán en el administrador y en el reporte PDF.</p></div><button onClick={() => setEditingMeta(false)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted" aria-label="Cerrar"><X size={17} /></button></div><div className="grid gap-3 md:grid-cols-2"><input value={studyMeta.name} onChange={(event) => updateStudyMeta("name", event.target.value)} placeholder="Nombre de la plantilla" className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm" /><input value={studyMeta.creatorName} onChange={(event) => updateStudyMeta("creatorName", event.target.value)} placeholder="Quién creó la plantilla" className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm" /><input value={studyMeta.teamName} onChange={(event) => updateStudyMeta("teamName", event.target.value)} placeholder="Equipo / mesa" className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm" /><input value={studyMeta.flowName} onChange={(event) => updateStudyMeta("flowName", event.target.value)} placeholder="Flujo que se está probando" className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm" /><textarea value={studyMeta.description} onChange={(event) => updateStudyMeta("description", event.target.value)} placeholder="Descripción del estudio" rows={3} className="rounded-lg border border-border bg-input-background px-3 py-2 text-sm md:col-span-2" /></div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setEditingMeta(false)} className="rounded-lg border border-border px-3 py-2 text-xs font-semibold hover:bg-muted">Cancelar</button><button onClick={saveTemplateMeta} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground">Guardar ficha</button></div></section></div>}
        </main>
      )}

      {activeView === "metrics" && (
        <main className="mx-auto max-w-6xl px-4 py-8">
          <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Resultados del user test</p>
              <h1 className="mt-1 text-2xl font-semibold tracking-tight">{studyMeta.name}</h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{studyMeta.description}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setActiveView("catalog")} className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-semibold hover:bg-muted">Volver</button>
              <button onClick={() => setActiveView("template")} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">Abrir plantilla</button>
            </div>
          </div>

          <section className="mb-5 grid gap-3 md:grid-cols-4">
            {[
              { label: "Participantes", value: `${participants.length}/10`, detail: "entrevistas guardadas" },
              { label: "Promedio general", value: overallAverage ? `${overallAverage.toFixed(1)}/5` : "—", detail: `${allScenarioRatings.length} valoraciones` },
              { label: "Preguntas medidas", value: metricQuestions.length, detail: "con escala activa" },
              { label: "Mayor friccion", value: strongestFinding ? `${strongestFinding.stats.average.toFixed(1)}/5` : "—", detail: strongestFinding?.question.text || "Sin datos" },
            ].map((metric) => (
              <div key={metric.label} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</p>
                <p className="mt-2 text-2xl font-bold text-foreground">{metric.value}</p>
                <p className="mt-1 truncate text-[11px] text-muted-foreground">{metric.detail}</p>
              </div>
            ))}
          </section>

          {participants.length === 0 ? (
            <section className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
              <BarChart3 className="mx-auto text-muted-foreground" size={28} />
              <h2 className="mt-3 text-base font-semibold">Aun no hay metricas disponibles</h2>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">Cuando guardes entrevistas, aqui apareceran los promedios, distribuciones y comentarios por flujo.</p>
              <button onClick={() => setActiveView("template")} className="mt-4 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">Registrar entrevistas</button>
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
        </main>
      )}

      {activeView === "template" && <div ref={printRef} className="mx-auto max-w-[1500px] px-4 py-6 pdf-root">

        {(
          <div className="no-print">
            <section id="interview-journey" className="mb-4 overflow-hidden rounded-2xl border border-border bg-card shadow-sm scroll-mt-16">
              <div className="flex flex-col gap-3 border-b border-border px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
                <div><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">Sesión de user testing</p><h1 className="mt-1 text-xl font-semibold tracking-tight text-foreground">{studyMeta.name}</h1></div>
                <div className="flex items-center gap-3"><span className="text-xs font-semibold text-muted-foreground">Paso {safeSectionIndex + 1} de {totalInterviewSteps}</span><span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${activeParticipantId ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`}><span className={`h-2 w-2 rounded-full ${activeParticipantId ? "bg-emerald-500" : "bg-amber-500"}`} /> {activeParticipantId ? "Sesión guardada" : "Cambios sin guardar"}</span></div>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-muted/20 p-3 sm:grid-cols-3 xl:grid-cols-6" aria-label={`Recorrido de la entrevista: paso ${safeSectionIndex + 1} de ${totalInterviewSteps}`}>
                {[{ id: "participant-data", label: "Datos del usuario", tag: "Inicio" }, ...sections.map((section) => ({ id: section.id, label: section.label, tag: section.tag }))].map((step, index) => {
                  const isActive = index === safeSectionIndex;
                  const isDone = index < safeSectionIndex;
                  return <button key={step.id} type="button" onClick={() => { setActiveSectionIndex(index); setSectionResultsExpanded(false); }} className={`min-w-0 rounded-xl border px-3 py-2.5 text-left transition-all ${isActive ? "border-primary bg-primary text-primary-foreground shadow-sm" : isDone ? "border-emerald-200 bg-emerald-50 text-emerald-800 hover:border-emerald-300" : "border-border bg-card text-foreground hover:border-primary/40 hover:bg-primary/5"}`}><span className={`block text-[9px] font-bold uppercase tracking-wider ${isActive ? "text-white/70" : "text-muted-foreground"}`}>{isDone ? "Completado" : `${String(index + 1).padStart(2, "0")} · ${step.tag}`}</span><span className="mt-1 block truncate text-[11px] font-semibold" title={step.label}>{step.label}</span></button>;
                })}
              </div>
            </section>

            <div className="grid items-start gap-4 min-[900px]:grid-cols-[180px_minmax(0,1fr)_220px] xl:grid-cols-[230px_minmax(0,1fr)_270px]">
              <aside className="rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-20">
                <div className="border-b border-border px-4 py-3"><p className="text-sm font-semibold">Participantes</p><p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona una sesión guardada</p></div>
                <div className="space-y-1 p-2">
                  {Array.from({ length: 10 }, (_, index) => {
                    const participant = participants[index];
                    const isCurrentCapture = !activeParticipantId && index + 1 === currentSlot;
                    const isActive = participant?.id === activeParticipantId || isCurrentCapture;
                    return <button
                      key={index}
                      type="button"
                      onClick={() => participant && loadParticipant(participant)}
                      disabled={!participant && !isCurrentCapture}
                      className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${isActive ? "border-primary/30 bg-primary/5" : participant ? "border-transparent hover:border-border hover:bg-muted/50" : "border-transparent opacity-55"}`}
                    >
                      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${isActive ? "bg-primary text-primary-foreground" : participant ? "bg-emerald-50 text-emerald-700" : "bg-muted text-muted-foreground"}`}>{participant ? <Check size={14} /> : `U${index + 1}`}</span>
                      <span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">Usuario {index + 1}</span><span className={`mt-0.5 block text-[10px] ${isActive ? "font-semibold text-primary" : participant ? "text-emerald-700" : "text-muted-foreground"}`}>{isActive ? "En entrevista" : participant ? "Completado" : "Disponible"}</span></span>
                      {isActive && <span className="h-2 w-2 rounded-full bg-primary" />}
                    </button>;
                  })}
                </div>
                <div className="border-t border-border p-3"><button type="button" onClick={resetParticipantForm} className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-muted"><RotateCcw size={13} /> Nueva entrevista</button></div>
              </aside>

              <main id="active-scenario" className="min-w-0 space-y-4">
                {!activeSection ? (
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
                    {(activeSection.context || activeSection.task) && <div className="mt-4 grid gap-3 rounded-xl border border-border bg-muted/25 p-4 sm:grid-cols-2">{activeSection.context && <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Contexto</p><p className="mt-1 text-xs leading-relaxed text-foreground">{activeSection.context}</p></div>}{activeSection.task && <div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tarea</p><p className="mt-1 text-xs leading-relaxed text-foreground">{activeSection.task}</p></div>}</div>}
                  </div>

                  <div className="divide-y divide-border">
                    {activeSection.questions.map((question, index) => {
                      const capture = getQuestionCapture(activeSection, question);
                      return <div key={question.id} className="px-5 py-5 sm:px-7">
                        <div className="flex items-start gap-3">
                          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-xs font-bold text-muted-foreground">{index + 1}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-start justify-between gap-2"><p className="max-w-3xl text-sm font-semibold leading-relaxed text-foreground">{question.text}</p><div className="flex shrink-0 gap-1.5">{capture !== "none" && <span className="rounded-full bg-muted px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">{getValidationLabel(question)}</span>}{capture === "none" && <span className="rounded-full border border-border px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Solo guía</span>}</div></div>
                            {capture !== "none" && <div className="mt-4 space-y-4">{captureHasDescription(capture) && <div><label className="mb-2 block text-[11px] font-semibold text-foreground">Notas del entrevistador</label><textarea value={respuestas[question.id] || ""} onChange={(event) => setRespuesta(question.id, event.target.value)} rows={3} placeholder="Escribe observaciones, frases y comportamientos relevantes…" className="w-full resize-none rounded-xl border border-border bg-input-background px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring" /></div>}{captureHasScale(capture) && <CalmRatingControl id={question.id} validation={getQuestionValidation(question)} />}</div>}
                          </div>
                        </div>
                      </div>;
                    })}
                  </div>

                  <div className="border-t border-border bg-muted/15 px-5 py-5 sm:px-7"><label className="mb-2 block text-[11px] font-semibold text-foreground">Notas generales del escenario</label><textarea value={respuestas[`${activeSection.id}_notas`] || ""} onChange={(event) => setRespuesta(`${activeSection.id}_notas`, event.target.value)} rows={3} placeholder="Comportamientos, dudas, reacciones o citas textuales…" className="w-full resize-none rounded-xl border border-border bg-card px-4 py-3 text-sm leading-relaxed placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-ring" /></div>
                </section>

                <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
                  <button type="button" onClick={() => setSectionResultsExpanded((value) => !value)} className="flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-muted/30 sm:px-6"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><BarChart3 size={17} /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">Ver resultados de este escenario</span><span className="mt-0.5 block text-[11px] text-muted-foreground">{activeSection.questions.filter((question) => captureHasScale(getQuestionCapture(activeSection, question))).length} preguntas medibles · {participants.length} participantes</span></span>{sectionResultsExpanded ? <ChevronUp size={18} className="text-muted-foreground" /> : <ChevronDown size={18} className="text-muted-foreground" />}</button>
                  {sectionResultsExpanded && <div className="grid gap-3 border-t border-border bg-muted/15 p-5 sm:grid-cols-2">{activeSection.questions.filter((question) => captureHasScale(getQuestionCapture(activeSection, question))).map((question) => { const stats = ratingStats(question.id); const options = getRatingOptions(getQuestionValidation(question)); return <div key={question.id} className="rounded-xl border border-border bg-card p-4"><div className="flex items-start justify-between gap-3"><p className="text-xs font-semibold leading-relaxed">{question.text}</p><span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-bold">{stats.values.length ? stats.average.toFixed(1) : "—"}/5</span></div><div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">{stats.counts.map((count, optionIndex) => <span key={optionIndex} className={options[optionIndex].color} style={{ width: `${stats.values.length ? (count / stats.values.length) * 100 : 0}%` }} />)}</div><p className="mt-2 text-[10px] text-muted-foreground">{stats.values.length ? `${stats.values.length} respuestas registradas` : "Aún no hay valoraciones"}</p></div>; })}{!activeSection.questions.some((question) => captureHasScale(getQuestionCapture(activeSection, question))) && <p className="sm:col-span-2 py-4 text-center text-xs text-muted-foreground">Este escenario no tiene preguntas con escala activa.</p>}</div>}
                </section>
                </>)}

                <div className="flex items-center justify-between gap-3 pb-8"><button type="button" disabled={safeSectionIndex === 0} onClick={() => { setActiveSectionIndex((index) => Math.max(index - 1, 0)); setSectionResultsExpanded(false); document.getElementById("interview-journey")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"><ArrowLeft size={14} /> Anterior</button>{safeSectionIndex < totalInterviewSteps - 1 ? <button type="button" onClick={() => { setActiveSectionIndex((index) => Math.min(index + 1, totalInterviewSteps - 1)); setSectionResultsExpanded(false); document.getElementById("interview-journey")?.scrollIntoView({ behavior: "smooth", block: "start" }); }} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90">Guardar y continuar <ChevronDown size={14} className="-rotate-90" /></button> : <button type="button" onClick={saveParticipant} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90"><Save size={14} /> Guardar entrevista</button>}</div>
              </main>

              <aside className="rounded-2xl border border-border bg-card shadow-sm lg:sticky lg:top-20">
                <div className="border-b border-border px-4 py-3"><p className="text-sm font-semibold">Resumen del participante</p><p className="mt-0.5 text-[11px] text-muted-foreground">Usuario {currentSlot} · {activeParticipantId ? "Sesión guardada" : "En captura"}</p></div>
                <div className="space-y-4 p-4">
                  <div className="rounded-xl border border-border bg-muted/25 p-3"><div className="flex items-center gap-2"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">U{currentSlot}</span><div className="min-w-0"><p className="truncate text-xs font-semibold">{nombre || "Sin identificar"}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{sesion || "Sin código"}{edad ? ` · ${edad} años` : ""}</p></div></div><div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[10px]"><span className="text-muted-foreground">Datos demográficos</span><span className="font-semibold">{Object.values(checks).filter(Boolean).length} seleccionados</span></div></div>
                  <button type="button" onClick={() => setActiveSectionIndex(0)} className={`flex w-full items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-xs font-semibold ${safeSectionIndex === 0 ? "border-primary bg-primary/5 text-primary" : "border-border hover:bg-muted"}`}><Pencil size={13} /> {safeSectionIndex === 0 ? "Editando datos" : "Editar datos del usuario"}</button>
                  <div><div className="mb-2 flex items-center justify-between text-[10px]"><span className="font-semibold text-muted-foreground">RECORRIDO</span><span>{safeSectionIndex + 1}/{totalInterviewSteps}</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${((safeSectionIndex + 1) / totalInterviewSteps) * 100}%` }} /></div></div>
                  <button type="button" onClick={saveParticipant} disabled={!activeParticipantId && participants.length >= 10} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-40"><Save size={14} /> {activeParticipantId ? "Actualizar sesión" : "Guardar sesión"}</button>
                </div>
              </aside>
            </div>
          </div>
        )}

        {false && editMode && <section className="no-print mt-6 rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          <div className="flex flex-col gap-4 border-b border-border bg-muted/40 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Users size={19} /></span>
              <div>
                <p className="text-sm font-semibold">Participantes y resultados</p>
                <p className="text-xs text-muted-foreground">Guarda cada entrevista para comparar hallazgos. Máximo 10 participantes.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-card px-3 py-1 text-xs font-semibold text-muted-foreground border border-border">Trabajando en Usuario {currentSlot} · {participants.length}/10 guardados</span>
              <button onClick={resetParticipantForm} className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold hover:bg-muted">
                <RotateCcw size={13} /> Nueva entrevista
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-5">
            {Array.from({ length: 10 }, (_, index) => {
              const participant = participants[index];
              const isActive = participant?.id === activeParticipantId;
              return (
                <button
                  key={index}
                  onClick={() => participant && loadParticipant(participant)}
                  disabled={!participant}
                  className={`min-h-16 rounded-xl border p-2 text-left transition-colors ${isActive ? "border-primary bg-primary text-primary-foreground" : participant ? "border-border bg-card hover:border-primary hover:bg-muted" : "border-dashed border-border bg-muted/30 text-muted-foreground cursor-not-allowed"}`}
                >
                  <span className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-wider opacity-70"><span>Usuario {index + 1}</span>{isActive ? <span className="rounded-full bg-white/20 px-1.5 py-0.5">En edición</span> : participant ? <span>Guardado</span> : index + 1 === currentSlot ? <span>En captura</span> : null}</span>
                  <span className="mt-1 block truncate text-xs font-semibold">{participant ? (participant.sesion || participant.nombre || `Usuario ${index + 1}`) : index + 1 === currentSlot ? "Nueva entrevista" : "Disponible"}</span>
                </button>
              );
            })}
          </div>
        </section>}

        {false && editMode && participants.length > 0 && (
          <section className="no-print rounded-2xl border border-border bg-card p-5 shadow-sm">
            <div className="mb-4 flex items-center gap-2"><BarChart3 size={18} className="text-primary" /><div><h2 className="text-base font-semibold">Resumen de la investigación</h2><p className="text-xs text-muted-foreground">Promedio de facilidad por escenario: 1 = muy difícil · 5 = muy fácil.</p></div></div>
            <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { label: "Participantes", value: participants.length, detail: "entrevistas guardadas" },
                { label: "Promedio general", value: overallAverage ? `${overallAverage.toFixed(1)}/5` : "—", detail: `${allScenarioRatings.length} valoraciones` },
                { label: "Preguntas medidas", value: metricQuestions.length, detail: "con escala activa" },
                { label: "Mayor dificultad", value: scenarioRanking[0]?.stats.values.length ? scenarioRanking[0].stats.average.toFixed(1) : "—", detail: scenarioRanking[0]?.question.text || "Sin datos" },
              ].map((metric) => <div key={metric.label} className="rounded-xl border border-border bg-muted/30 p-3"><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{metric.label}</p><p className="mt-1 text-xl font-bold text-foreground">{metric.value}</p><p className="mt-1 truncate text-[11px] text-muted-foreground">{metric.detail}</p></div>)}
            </div>
            <div className="mb-5 grid gap-4 lg:grid-cols-[1.25fr_.75fr]">
              <div className="rounded-xl border border-border p-4">
                <div className="mb-3 flex items-center gap-2"><ClipboardCheck size={16} className="text-primary" /><p className="text-sm font-semibold">Ficha de participantes</p></div>
                <div className="space-y-2">
                  {participants.map((participant, index) => <button key={participant.id} onClick={() => loadParticipant(participant)} className="flex w-full items-center gap-3 rounded-lg border border-transparent px-2 py-2 text-left hover:border-border hover:bg-muted"><span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span><span className="min-w-0 flex-1"><span className="block truncate text-xs font-semibold">{participant.nombre || participant.sesion || `Usuario ${index + 1}`}</span><span className="block text-[10px] text-muted-foreground">{participant.fecha || "Sin fecha"} · {participantCompletion(participant)}% completado</span></span><span className="text-[10px] font-semibold text-muted-foreground">Ver ficha</span></button>)}
                </div>
              </div>
              <div className="rounded-xl border border-border bg-amber-50/60 p-4"><div className="mb-3 flex items-center gap-2"><Lightbulb size={16} className="text-amber-600" /><p className="text-sm font-semibold">Hallazgos para revisar</p></div>{scenarioRanking[0]?.stats.values.length ? <p className="text-xs leading-relaxed text-foreground">{scenarioRanking[0].question.text} concentra el promedio más bajo ({scenarioRanking[0].stats.average.toFixed(1)}/5). Conviene revisar los puntos de fricción y las notas asociadas.</p> : <p className="text-xs text-muted-foreground">Los hallazgos aparecerán cuando guardes valoraciones de los participantes.</p>}{insightNotes.length > 0 && <div className="mt-3 space-y-1.5">{insightNotes.map((note, index) => <p key={index} className="line-clamp-2 border-l-2 border-amber-300 pl-2 text-[11px] text-muted-foreground">“{note}”</p>)}</div>}</div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {metricQuestions.map(({ section, question, stats }) => {
                const options = getRatingOptions(getQuestionValidation(question));
                return <div key={question.id} className="rounded-xl border border-border p-3">
                  <div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold leading-snug">{question.text}</p><span className="shrink-0 rounded-lg bg-muted px-2 py-1 text-xs font-bold">{stats.values.length ? stats.average.toFixed(1) : "—"}/5</span></div>
                  <p className="mt-1 text-[11px] text-muted-foreground">{section.label} · {getValidationLabel(question)}</p>
                  <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">{stats.counts.map((count, index) => <span key={index} className={`${options[index].color} transition-all`} style={{ width: `${stats.values.length ? (count / stats.values.length) * 100 : 0}%` }} />)}</div>
                  <p className="mt-2 text-[11px] text-muted-foreground">{stats.values.length ? `${stats.values.length} valoración${stats.values.length === 1 ? "" : "es"} registradas` : "Aún no hay valoraciones"}</p>
                </div>;
              })}
            </div>
          </section>
        )}

        {/* PDF header (only shows in PDF) */}
        <div className="pdf-only" style={{ display: "none" }}>
          <div style={{ background: "#1A1F36", color: "#fff", padding: "12px 20px", borderRadius: 10, marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 700, fontSize: 14, letterSpacing: 1 }}>UX RESEARCH — NOTAS DE SESIÓN</span>
            <span style={{ fontSize: 11, opacity: 0.6 }}>{today}</span>
          </div>
        </div>

        {/* ── Profile card ─────────────────────────────────────────────────── */}
        {false && editMode && <div className="mt-6 bg-card rounded-2xl border border-border shadow-sm overflow-hidden avoid-break">
          <div className="bg-accent px-6 py-4 flex items-center gap-2">
            <User size={16} className="text-accent-foreground opacity-80" />
            <h2 className="text-sm font-semibold text-accent-foreground uppercase tracking-widest">
              Perfil del Participante
            </h2>
          </div>
          <div className="p-6 space-y-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {[
                { label: "Nombre completo", val: nombre, set: setNombre, placeholder: "Ej. María González", type: "text" },
                { label: "Edad", val: edad, set: setEdad, placeholder: "Ej. 42", type: "number" },
              ].map(({ label, val, set, placeholder, type }) => (
                <div key={label} className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</label>
                  <input
                    type={type}
                    value={val}
                    onChange={(e) => set(e.target.value)}
                    placeholder={placeholder}
                    className="w-full rounded-lg bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              ))}
              <div className="space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Calendar size={12} /> Fecha de sesión
                </label>
                <input
                  type="date"
                  value={fecha}
                  onChange={(e) => setFecha(e.target.value)}
                  className="w-full rounded-lg bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                # Sesión / Código de participante
              </label>
              <input
                type="text"
                value={sesion}
                onChange={(e) => setSesion(e.target.value)}
                placeholder="Ej. P-07"
                className="w-48 rounded-lg bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Datos demográficos
              </label>
              <div className="space-y-4">
                {[
                  {
                    title: "Perfil tecnológico",
                    items: [
                      { id: "tech_avanzado", label: "Tech: Avanzado" },
                      { id: "tech_intermedio", label: "Tech: Intermedio" },
                      { id: "tech_basico", label: "Tech: Básico" },
                      { id: "smartphone_ios", label: "iPhone / iOS" },
                      { id: "smartphone_android", label: "Android" },
                    ],
                  },
                  {
                    title: "Bancos que utiliza",
                    items: [
                      { id: "banco_bhd", label: "BHD" },
                      { id: "banco_popular", label: "Popular" },
                      { id: "banco_banreservas", label: "Banreservas" },
                      { id: "banco_scotiabank", label: "Scotiabank" },
                      { id: "banco_apap", label: "APAP" },
                      { id: "banco_caribe", label: "Banco Caribe" },
                      { id: "banco_multiple", label: "Multibanca (3+ bancos)" },
                    ],
                  },
                  {
                    title: "Apps bancarias que usa",
                    items: [
                      { id: "app_bhd", label: "BHD App" },
                      { id: "app_bhd_empresarial", label: "BHD Empresarial" },
                      { id: "app_popular", label: "Popular" },
                      { id: "app_popular_empresarial", label: "Popular Empresarial" },
                      { id: "app_biz", label: "App BIZ" },
                      { id: "app_banreservas", label: "Banreservas" },
                      { id: "app_banreservas_empresarial", label: "Banreservas Empresarial" },
                    ],
                  },
                ].map((group) => (
                  <div key={group.title} className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {group.title}
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((d) => (
                        <label
                          key={d.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors select-none ${
                            checks[d.id]
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-input-background border-border hover:border-accent"
                          }`}
                        >
                          <input type="checkbox" checked={!!checks[d.id]} onChange={() => toggleCheck(d.id)} className="sr-only" />
                          <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checks[d.id] ? "bg-white border-white" : "border-border bg-card"}`}>
                            {checks[d.id] && (
                              <svg viewBox="0 0 10 8" className="w-2.5 h-2.5" fill="none">
                                <path d="M1 4l2.5 2.5L9 1" stroke="#3B5BDB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          {d.label}
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>}

        {/* ── Sections ──────────────────────────────────────────────────────── */}
        {false && editMode && sections.map((section) => {
          const isCollapsed = collapsed[section.id] && !editMode;
          return (
            <div key={section.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden avoid-break">

              {/* Section header */}
              <div className={`px-6 py-4 flex items-start justify-between gap-3 ${!editMode ? "cursor-pointer hover:bg-muted transition-colors" : ""}`}
                onClick={() => !editMode && toggleSection(section.id)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {editMode && (
                    <GripVertical size={16} className="text-muted-foreground mt-1 flex-shrink-0 cursor-grab" />
                  )}
                  <div className="flex flex-col gap-2 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {editMode ? (
                        <select
                          value={section.tag}
                          onChange={(e) => updateSection(section.id, "tag", e.target.value)}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-xs font-semibold px-2 py-0.5 rounded-full border focus:outline-none ${TAG_COLORS[section.tag]}`}
                        >
                          {TAG_OPTIONS.map((t) => <option key={t}>{t}</option>)}
                        </select>
                      ) : (
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TAG_COLORS[section.tag]}`} style={{ fontFamily: "'DM Mono', monospace" }}>
                          {section.tag}
                        </span>
                      )}
                    </div>
                    {editMode ? (
                      <input
                        value={section.label}
                        onChange={(e) => updateSection(section.id, "label", e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        className="text-base font-semibold bg-input-background border border-border rounded-lg px-3 py-1.5 w-full focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    ) : (
                      <h3 className="text-base font-semibold text-foreground">{section.label}</h3>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {editMode ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteSection(section.id); }}
                      className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors"
                      title="Eliminar sección"
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    isCollapsed
                      ? <ChevronDown size={18} className="text-muted-foreground" />
                      : <ChevronUp size={18} className="text-muted-foreground" />
                  )}
                </div>
              </div>

              {(!isCollapsed || editMode) && (
                <div className="px-6 pb-6 space-y-5">
                  {/* Context & task */}
                  {(section.context || section.task || editMode) && (
                    <div className="rounded-xl bg-muted border border-border p-4 space-y-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contexto</span>
                        {editMode ? (
                          <textarea
                            value={section.context}
                            onChange={(e) => updateSection(section.id, "context", e.target.value)}
                            placeholder="Describe el contexto del escenario..."
                            rows={2}
                            className="mt-1 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        ) : section.context ? (
                          <p className="text-sm text-foreground mt-0.5">{section.context}</p>
                        ) : null}
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarea</span>
                        {editMode ? (
                          <textarea
                            value={section.task}
                            onChange={(e) => updateSection(section.id, "task", e.target.value)}
                            placeholder="Describe la tarea del participante..."
                            rows={2}
                            className="mt-1 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                          />
                        ) : section.task ? (
                          <p className="text-sm text-foreground mt-0.5">{section.task}</p>
                        ) : null}
                      </div>
                    </div>
                  )}

                  {editMode && section.tag !== "General" && (
                    <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registro del escenario</label>
                      <select
                        value={getSectionCapture(section)}
                        onChange={(event) => updateSection(section.id, "capture", event.target.value)}
                        className="mt-2 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      >
                        {CAPTURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{getCaptureLabel(option.value)} - {option.description}</option>)}
                      </select>
                    </div>
                  )}

                  {!editMode && section.tag !== "General" && getSectionCapture(section) !== "none" && (
                    <div className="space-y-3 rounded-xl border border-border bg-muted/30 p-4">
                      {captureHasDescription(getSectionCapture(section)) && <div><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registro del escenario</p><textarea value={respuestas[`${section.id}_registro`] || ""} onChange={(event) => setRespuesta(`${section.id}_registro`, event.target.value)} rows={3} placeholder="Anota el resultado observado..." className="w-full rounded-xl bg-input-background border border-border px-4 py-3 text-sm resize-none" /></div>}
                      {captureHasScale(getSectionCapture(section)) && <RatingControl id={section.id} />}
                    </div>
                  )}

                  {/* Questions */}
                  <div className="space-y-4">
                    {section.questions.map((q, i) => (
                      <div key={q.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <span
                            className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground"
                            style={{ fontFamily: "'DM Mono', monospace" }}
                          >
                            {i + 1}
                          </span>
                          {editMode ? (
                            <div className="flex-1 grid gap-2 lg:grid-cols-[1fr_190px_190px_34px]">
                              <input
                                value={q.text}
                                onChange={(e) => updateQuestion(section.id, q.id, e.target.value)}
                                className="flex-1 rounded-lg bg-input-background border border-border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring"
                              />
                              <select
                                value={getQuestionValidation(q)}
                                onChange={(event) => updateQuestionValidation(section.id, q.id, event.target.value as ValidationType)}
                                className="rounded-lg bg-input-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                title="Que valida esta pregunta"
                              >
                                {VALIDATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                              </select>
                              <select
                                value={getQuestionCapture(section, q)}
                                onChange={(event) => updateQuestionCapture(section.id, q.id, event.target.value as CaptureMode)}
                                className="rounded-lg bg-input-background border border-border px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
                                title="Que se captura para esta pregunta"
                              >
                                {CAPTURE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{getCaptureLabel(option.value)}</option>)}
                              </select>
                              <button
                                onClick={() => deleteQuestion(section.id, q.id)}
                                className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                                title="Eliminar pregunta"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-foreground leading-snug pt-0.5">{q.text}</p>
                          )}
                        </div>
                        {!editMode && getQuestionCapture(section, q) !== "none" && (
                          <div className="ml-9 space-y-2" style={{ width: "calc(100% - 2.25rem)" }}>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                            <span className="rounded-full bg-muted px-2 py-0.5">{getValidationLabel(q)}</span>
                            <span>{getCaptureLabel(getQuestionCapture(section, q))}</span>
                          </div>
                          {captureHasDescription(getQuestionCapture(section, q)) && <textarea
                            value={respuestas[q.id] || ""}
                            onChange={(e) => setRespuesta(q.id, e.target.value)}
                            placeholder="Escribe las observaciones aquí..."
                            rows={3}
                            className="w-full rounded-xl bg-input-background border border-border px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                          />}
                          {captureHasScale(getQuestionCapture(section, q)) && <RatingControl id={q.id} compact validation={getQuestionValidation(q)} />}
                          </div>
                        )}
                      </div>
                    ))}

                    {editMode && (
                      <button
                        onClick={() => addQuestion(section.id)}
                        className="ml-9 flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-blue-700 transition-colors py-1"
                      >
                        <Plus size={14} /> Agregar pregunta
                      </button>
                    )}
                  </div>

                  {/* Notes – only in fill mode */}
                  {!editMode && (
                    <div className="space-y-2 pt-1">
                      <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />
                        Notas adicionales / Observaciones
                      </label>
                      <textarea
                        value={respuestas[`${section.id}_notas`] || ""}
                        onChange={(e) => setRespuesta(`${section.id}_notas`, e.target.value)}
                        placeholder="Comportamientos, dudas, reacciones, citas textuales..."
                        rows={3}
                        className="w-full rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm placeholder:text-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none leading-relaxed"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Add section – edit mode only */}
        {false && editMode && (
          <button
            onClick={addSection}
            className="w-full py-4 rounded-2xl border-2 border-dashed border-border hover:border-accent text-muted-foreground hover:text-accent flex items-center justify-center gap-2 text-sm font-semibold transition-colors"
          >
            <Plus size={16} /> Agregar nueva sección
          </button>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground" style={{ fontFamily: "'DM Mono', monospace" }}>
            UX Research · BHD Empresarial · {new Date().getFullYear()}
          </p>
        </div>
      </div>}

      {editMode && activeView === "template" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm no-print" role="dialog" aria-modal="true" aria-label="Editar plantilla existente">
          <section className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <header className="flex shrink-0 items-center justify-between gap-4 border-b border-border px-5 py-4 sm:px-6">
              <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Pencil size={18} /></span><div><h2 className="text-base font-semibold">Modificar plantilla existente</h2><p className="mt-0.5 text-[11px] text-muted-foreground">Selecciona una sección para editarla. Los cambios se aplican al guardar.</p></div></div>
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
