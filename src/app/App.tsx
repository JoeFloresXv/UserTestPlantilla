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
import { loadResearchFromSupabase, saveParticipantToSupabase, syncStudyTemplate } from "../lib/researchRepository";

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

type CaptureMode = "rating" | "text" | "none";
type ValidationType = "functionality" | "copy";

const CAPTURE_OPTIONS: { value: CaptureMode; label: string; description: string }[] = [
  { value: "rating", label: "Checkbox / escala de facilidad", description: "Selector 1–5 para comparar participantes" },
  { value: "text", label: "Texto libre", description: "Contenedor para anotar un hallazgo del entrevistador" },
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
  if (capture === "rating") return "Descripcion + escala";
  if (capture === "text") return "Solo descripcion";
  return "Sin registro";
};

let uid = 1000;
const nextId = () => `q${++uid}`;
const nextSectionId = () => `s${++uid}`;

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
  const [activeView, setActiveView] = useState<"catalog" | "template" | "metrics">("catalog");
  const [studyMeta, setStudyMeta] = useState<StudyMeta>(() => {
    try {
      return { name: "User Test — BHD Empresarial", creatorName: "", teamName: "", flowName: "", description: "Estudio de usabilidad de la experiencia empresarial.", ...JSON.parse(localStorage.getItem("ux-research-study-meta") || "{}") };
    } catch {
      return { name: "User Test — BHD Empresarial", creatorName: "", teamName: "", flowName: "", description: "Estudio de usabilidad de la experiencia empresarial." };
    }
  });
  const [editingMeta, setEditingMeta] = useState(false);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<Section[]>(INICIAL);
  const [editMode, setEditMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "synced" | "error">(supabaseConfigured ? "idle" : "error");
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem("ux-research-participants", JSON.stringify(participants));
  }, [participants]);

  useEffect(() => {
    localStorage.setItem("ux-research-study-meta", JSON.stringify(studyMeta));
  }, [studyMeta]);

  const updateStudyMeta = (field: keyof StudyMeta, value: string) => setStudyMeta((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!supabaseConfigured) return;
    let cancelled = false;
    setSyncStatus("syncing");
    loadResearchFromSupabase().then((remote) => {
      if (cancelled) return;
      if (remote.error) { setSyncStatus("error"); return; }
      if (remote.sections?.length) setSections(remote.sections as Section[]);
      if (remote.participants?.length) setParticipants(remote.participants as Participant[]);
      if (remote.meta) setStudyMeta(remote.meta as StudyMeta);
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
      setSyncStatus(error ? "error" : "synced");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveTemplateMeta = async () => {
    setEditingMeta(false);
    if (!supabaseConfigured) return;
    setSyncStatus("syncing");
    const result = await syncStudyTemplate(sections, studyMeta);
    setSyncStatus(result.error ? "error" : "synced");
  };

  const createNewTemplate = () => {
    setStudyMeta({ name: "Nueva plantilla", creatorName: "", teamName: "", flowName: "", description: "Describe el estudio de user testing." });
    setSections(INICIAL);
    setParticipants([]);
    setActiveParticipantId(null);
    setChecks({});
    setRespuestas({});
    setRatings({});
    setEditingMeta(true);
    setActiveView("catalog");
  };

  const ratingStats = (id: string) => {
    const values = participants.map((participant) => participant.ratings?.[id]).filter(Boolean) as Rating[];
    const counts = RATING_OPTIONS.map((option) => values.filter((value) => value === option.value).length);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return { values, counts, average };
  };

  const metricSections = sections.filter((section) => section.tag !== "General" && getSectionCapture(section) === "rating");
  const metricQuestions = sections.flatMap((section) =>
    section.questions
      .filter((question) => getQuestionCapture(section, question) === "rating")
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

  const toggleSection = (id: string) =>
    setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  // ── Section editing ───────────────────────────────────────────────────────
  const updateSection = (sId: string, field: keyof Section, val: string) =>
    setSections((prev) =>
      prev.map((s) => (s.id === sId ? { ...s, [field]: val } : s))
    );

  const deleteSection = (sId: string) =>
    setSections((prev) => prev.filter((s) => s.id !== sId));

  const addSection = () =>
    setSections((prev) => [
      ...prev,
      {
        id: nextSectionId(),
        label: "Nueva sección",
        tag: "Escenario",
        context: "",
        task: "",
        capture: "rating",
        questions: [{ id: nextId(), text: "Nueva pregunta", capture: "rating" }],
      },
    ]);

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
            ${sections.filter((section) => section.tag !== "General" && getSectionCapture(section) === "rating").map((section) => {
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
        ${sections.map((section) => `<section style="border-top:1px solid #d1d5db;padding-top:12px;margin-top:12px;page-break-inside:avoid;"><div style="font-size:10px;color:#4b5563;text-transform:uppercase;letter-spacing:.8px;">${escapeHtml(section.tag)}</div><h2 style="font-size:15px;margin:3px 0 5px;">${escapeHtml(section.label)}</h2>${section.context ? `<p style="font-size:11px;margin:0 0 5px;"><strong>Contexto:</strong> ${textBlock(section.context)}</p>` : ""}${section.task ? `<p style="font-size:11px;margin:0 0 5px;"><strong>Tarea:</strong> ${textBlock(section.task)}</p>` : ""}${getSectionCapture(section) === "rating" ? `<p style="font-size:11px;margin:0 0 10px;"><strong>Resultado del escenario:</strong> ${escapeHtml(ratingLabel(participant.ratings?.[section.id]))}</p>` : ""}${section.questions.map((question, questionIndex) => `<div style="margin:10px 0;page-break-inside:avoid;"><div style="font-size:11px;font-weight:700;">${questionIndex + 1}. ${escapeHtml(question.text)}</div><div style="font-size:10px;color:#4b5563;margin:3px 0;">Registro: ${escapeHtml(ratingLabel(participant.ratings?.[question.id]))}</div><div style="font-size:11px;border-left:2px solid #9ca3af;padding-left:8px;">${textBlock(participant.respuestas?.[question.id] || "")}</div></div>`).join("")}<div style="margin-top:8px;font-size:11px;"><strong>Notas:</strong> ${textBlock(participant.respuestas?.[`${section.id}_notas`] || "")}</div></section>`).join("")}
      </section>`).join("");
    const node = document.createElement("div");
    node.innerHTML = `<div style="font-family:Arial,Helvetica,sans-serif;color:#111827;background:#fff;width:720px;line-height:1.45;"><div style="border-bottom:2px solid #111827;padding-bottom:12px;margin-bottom:16px;"><div style="font-size:18px;font-weight:700;">${escapeHtml(studyMeta.name)}</div><div style="font-size:11px;color:#4b5563;margin-top:4px;">Reporte de user testing · ${escapeHtml(studyMeta.teamName || "Equipo no definido")} · ${escapeHtml(studyMeta.flowName || "Flujo no definido")}</div></div>${participantSections}</div>`;
    node.style.position = "absolute"; node.style.left = "0"; node.style.top = "0"; node.style.width = "720px"; node.style.background = "#fff"; node.style.zIndex = "-1"; node.style.pointerEvents = "none"; document.body.appendChild(node); return node;
  };

  const handleExport = async () => {
    setExporting(true);
    const exportNode = participants.length ? buildParticipantsPdfNode() : buildTextOnlyPdfNode();
    try {
      // @ts-ignore – html2pdf.js has no types package
      const html2pdf = (await import("html2pdf.js")).default;
      const participante = studyMeta.name || nombre || sesion || "user-test";
      await new Promise((resolve) => requestAnimationFrame(resolve));
      const contentToExport = exportNode.firstElementChild || exportNode;

      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `ux-research-${participante.toLowerCase().replace(/\s+/g, "-")}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: {
            scale: 1.5,
            backgroundColor: "#ffffff",
            logging: false,
            useCORS: true,
          },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(contentToExport)
        .save();
    } finally {
      exportNode.remove();
      setExporting(false);
    }
  };

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
          <span className={`hidden items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[10px] font-semibold sm:flex ${syncStatus === "synced" ? "bg-emerald-500/20 text-emerald-100" : syncStatus === "syncing" ? "bg-amber-500/20 text-amber-100" : syncStatus === "error" ? "bg-rose-500/20 text-rose-100" : "bg-white/10 text-white/70"}`}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {syncStatus === "synced" ? "Sincronizado" : syncStatus === "syncing" ? "Guardando en Supabase…" : syncStatus === "error" ? "Modo local" : "Supabase listo"}
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
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              editMode
                ? "bg-green-500 text-white hover:bg-green-600"
                : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {editMode ? <><Check size={13} /> Listo</> : <><Pencil size={13} /> Editar plantilla</>}
          </button>}
          {/* Export PDF */}
          {activeView === "template" && <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download size={13} />
            {exporting ? "Generando…" : "Exportar PDF"}
          </button>}
        </div>
      </header>

      {activeView === "catalog" && (
        <main className="mx-auto max-w-6xl px-4 py-8">
          <section className="mb-6 rounded-3xl bg-gradient-to-br from-primary to-[#3949b8] p-6 text-primary-foreground shadow-lg sm:p-8">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Research workspace</p><h1 className="max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">Administra tus plantillas de user testing.</h1><p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">Centraliza el contexto del estudio, las entrevistas y los reportes comparativos en un solo lugar.</p></div>
              <div className="rounded-2xl bg-white/10 p-4 text-sm backdrop-blur"><p className="text-white/70">Plantillas activas</p><p className="mt-1 text-3xl font-semibold">1</p></div>
            </div>
          </section>
          <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-semibold">Mis plantillas</h2><p className="text-sm text-muted-foreground">Selecciona una plantilla para abrir sus notas y participantes.</p></div><button onClick={createNewTemplate} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:opacity-90">+ Nueva plantilla</button></div>
          <section className="rounded-2xl border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
            <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between"><div className="flex gap-4"><span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><FileText size={22} /></span><div><div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold">{studyMeta.name}</h3><span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold text-emerald-700">Borrador</span></div><p className="mt-1 text-sm text-muted-foreground">{studyMeta.description}</p><div className="mt-3 flex flex-wrap gap-2 text-[11px] text-muted-foreground"><span className="rounded-lg bg-muted px-2 py-1">Creador: {studyMeta.creatorName || "Sin definir"}</span><span className="rounded-lg bg-muted px-2 py-1">Equipo: {studyMeta.teamName || "Sin definir"}</span><span className="rounded-lg bg-muted px-2 py-1">Flujo: {studyMeta.flowName || "Sin definir"}</span></div></div></div><div className="flex shrink-0 flex-wrap gap-2"><button onClick={() => setActiveView("metrics")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted"><BarChart3 size={15} /> MÃ©tricas</button><button onClick={() => setEditingMeta(true)} className="rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-semibold hover:bg-muted">Editar ficha</button><button onClick={() => setActiveView("template")} className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90">Abrir plantilla</button></div></div>
            <div className="mt-5 grid grid-cols-4 gap-3 border-t border-border pt-4 text-center"><div><p className="text-lg font-semibold">{sections.length}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Secciones</p></div><div><p className="text-lg font-semibold">{sections.reduce((sum, section) => sum + section.questions.length, 0)}</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Preguntas</p></div><div><p className="text-lg font-semibold">{participants.length}/10</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Usuarios</p></div><div><p className="text-lg font-semibold">{overallAverage ? overallAverage.toFixed(1) : "—"}/5</p><p className="text-[10px] uppercase tracking-wider text-muted-foreground">Promedio</p></div></div>
          </section>
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

      {activeView === "template" && <div ref={printRef} className="max-w-5xl mx-auto px-4 py-8 space-y-6 pdf-root">

        <section className="no-print rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
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
        </section>

        {participants.length > 0 && (
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
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden avoid-break">
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
        </div>

        {/* ── Sections ──────────────────────────────────────────────────────── */}
        {sections.map((section) => {
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

                  {!editMode && section.tag !== "General" && (
                    getSectionCapture(section) === "rating" ? <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Resultado del escenario</p>
                      <RatingControl id={section.id} />
                    </div> : getSectionCapture(section) === "text" ? <div className="rounded-xl border border-border bg-muted/30 p-4"><p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Registro del escenario</p><textarea value={respuestas[`${section.id}_registro`] || ""} onChange={(event) => setRespuesta(`${section.id}_registro`, event.target.value)} rows={3} placeholder="Anota el resultado observado..." className="w-full rounded-xl bg-input-background border border-border px-4 py-3 text-sm resize-none" /></div> : null
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
                            <span>{getQuestionCapture(section, q) === "rating" ? "Descripcion + escala" : "Solo descripcion"}</span>
                          </div>
                          <textarea
                            value={respuestas[q.id] || ""}
                            onChange={(e) => setRespuesta(q.id, e.target.value)}
                            placeholder="Escribe las observaciones aquí..."
                            rows={3}
                            className="w-full rounded-xl bg-input-background border border-border px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed"
                          />
                          {getQuestionCapture(section, q) === "rating" && <RatingControl id={q.id} compact validation={getQuestionValidation(q)} />}
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
        {editMode && (
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
