import { useState, useRef } from "react";
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
} from "lucide-react";

interface Question {
  id: string;
  text: string;
}

interface Section {
  id: string;
  label: string;
  tag: "General" | "Escenario" | "Dashboard" | "Préstamos";
  context: string;
  task: string;
  questions: Question[];
}

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
      { id: "d1q1", text: "Indicación 1 — \"¡Hay novedades esperándote!\" ¿Qué le pareció esta primera indicación y qué sentimiento le genera al verla?" },
      { id: "d1q2", text: "Indicación 2 — \"Cambia de empresa.\" ¿Qué le pareció esta indicación y qué tan clara le resulta la acción de seleccionar una empresa/RNC?" },
      { id: "d1q3", text: "Indicación 3 — \"Cambio de usuario empresarial.\" ¿Qué le pareció esta indicación y qué sentimiento le da saber que puede agregar y alternar entre usuarios?" },
      { id: "d1q4", text: "Indicación 4 — \"¡Menú de opciones!\" ¿Qué le pareció esta indicación y qué sensación le transmite encontrar pagos, préstamos, desembolsos y solicitudes en un solo lugar?" },
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
      { id: "p1q1", text: "Cuota(s) pendiente(s): ¿Qué entiendes que estás viendo en esta pantalla? ¿Qué te comunica el monto de la cuota pendiente y la indicación 'Esta opción paga la cuota pendiente'?" },
      { id: "p1q2", text: "Abono a cuota(s): ¿Qué entiendes que estás viendo en esta opción? ¿Qué te parece el campo de monto, el balance abonado, el disponible para abonar y la indicación sobre abonar a una cuota futura o pendiente?" },
      { id: "p1q3", text: "Abono a capital: ¿Qué entiendes que estás viendo en esta opción? ¿Qué te comunica el monto digitado y la indicación 'Esta opción reduce el monto adeudado del préstamo'?" },
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

let uid = 1000;
const nextId = () => `q${++uid}`;
const nextSectionId = () => `s${++uid}`;

export default function App() {
  const [nombre, setNombre] = useState("");
  const [edad, setEdad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [sesion, setSesion] = useState("");
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const [respuestas, setRespuestas] = useState<Record<string, string>>({});
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [sections, setSections] = useState<Section[]>(INICIAL);
  const [editMode, setEditMode] = useState(false);
  const [exporting, setExporting] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const today = new Date().toLocaleDateString("es-DO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });

  const toggleCheck = (id: string) => setChecks((p) => ({ ...p, [id]: !p[id] }));
  const setRespuesta = (id: string, val: string) => setRespuestas((p) => ({ ...p, [id]: val }));
  const toggleSection = (id: string) => setCollapsed((p) => ({ ...p, [id]: !p[id] }));

  const updateSection = (sId: string, field: keyof Section, val: string) =>
    setSections((prev) => prev.map((s) => (s.id === sId ? { ...s, [field]: val } : s)));

  const deleteSection = (sId: string) => setSections((prev) => prev.filter((s) => s.id !== sId));

  const addSection = () =>
    setSections((prev) => [
      ...prev,
      { id: nextSectionId(), label: "Nueva sección", tag: "Escenario", context: "", task: "", questions: [{ id: nextId(), text: "Nueva pregunta" }] },
    ]);

  const updateQuestion = (sId: string, qId: string, text: string) =>
    setSections((prev) =>
      prev.map((s) => s.id === sId ? { ...s, questions: s.questions.map((q) => (q.id === qId ? { ...q, text } : q)) } : s)
    );

  const deleteQuestion = (sId: string, qId: string) =>
    setSections((prev) =>
      prev.map((s) => s.id === sId ? { ...s, questions: s.questions.filter((q) => q.id !== qId) } : s)
    );

  const addQuestion = (sId: string) =>
    setSections((prev) =>
      prev.map((s) => s.id === sId ? { ...s, questions: [...s.questions, { id: nextId(), text: "Nueva pregunta" }] } : s)
    );

  const buildTextOnlyPdfNode = () => {
    const selectedDemographics = DEMOGRAFICOS.filter((d) => checks[d.id]).map((d) => d.label);
    const escapeHtml = (value: string) =>
      value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const textBlock = (value: string) => escapeHtml(value.trim() || "empty").replace(/\n/g, "<br />");

    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color: #111827; background: #ffffff; width: 720px; padding: 0; line-height: 1.45;">
        <div style="border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 18px;">
          <div style="font-size: 18px; font-weight: 700;">UX Research — Notas de sesión</div>
          <div style="font-size: 11px; color: #4b5563; margin-top: 4px;">Documento exportado solo con texto · ${escapeHtml(today)}</div>
        </div>
        <section style="margin-bottom: 20px;">
          <h1 style="font-size: 14px; margin: 0 0 10px; text-transform: uppercase;">Perfil del participante</h1>
          <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
            <tr><td style="width: 34%; padding: 6px 0; color: #4b5563;">Nombre</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(nombre)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563;">Edad</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(edad)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563;">Fecha</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(fecha)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563;">Código</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(sesion)}</td></tr>
            <tr><td style="padding: 6px 0; color: #4b5563; vertical-align: top;">Datos demográficos</td><td style="padding: 6px 0; font-weight: 600;">${textBlock(selectedDemographics.join(", "))}</td></tr>
          </table>
        </section>
        ${sections.map((section) => `
          <section style="border-top: 1px solid #d1d5db; padding-top: 14px; margin-top: 16px;">
            <div style="font-size: 10px; color: #4b5563; text-transform: uppercase; letter-spacing: .8px; margin-bottom: 4px;">${escapeHtml(section.tag)}</div>
            <h2 style="font-size: 15px; margin: 0 0 10px;">${escapeHtml(section.label)}</h2>
            ${section.context ? `<p style="font-size: 12px; margin: 0 0 6px;"><strong>Contexto:</strong> ${textBlock(section.context)}</p>` : ""}
            ${section.task ? `<p style="font-size: 12px; margin: 0 0 12px;"><strong>Tarea:</strong> ${textBlock(section.task)}</p>` : ""}
            ${section.questions.map((q, i) => `
              <div style="margin: 12px 0;">
                <div style="font-size: 12px; font-weight: 700; margin-bottom: 4px;">${i + 1}. ${escapeHtml(q.text)}</div>
                <div style="font-size: 12px; border-left: 2px solid #9ca3af; padding-left: 10px;">${textBlock(respuestas[q.id] || "")}</div>
              </div>
            `).join("")}
            <div style="margin-top: 12px;">
              <div style="font-size: 12px; font-weight: 700; margin-bottom: 4px;">Notas adicionales</div>
              <div style="font-size: 12px; border-left: 2px solid #9ca3af; padding-left: 10px;">${textBlock(respuestas[`${section.id}_notas`] || "")}</div>
            </div>
          </section>
        `).join("")}
      </div>
    `;

    const node = document.createElement("div");
    node.innerHTML = html;
    node.style.cssText = "position:absolute;left:0;top:0;width:720px;background:#ffffff;z-index:-1;pointer-events:none;color:#111827;";
    document.body.appendChild(node);
    return node;
  };

  const handleExport = async () => {
    setExporting(true);
    const exportNode = buildTextOnlyPdfNode();
    try {
      // @ts-ignore
      const html2pdf = (await import("html2pdf.js")).default;
      const participante = nombre || sesion || "participante";
      await new Promise((resolve) => requestAnimationFrame(resolve));
      await html2pdf()
        .set({
          margin: [12, 12, 12, 12],
          filename: `ux-research-${participante.toLowerCase().replace(/\s+/g, "-")}.pdf`,
          image: { type: "jpeg", quality: 0.95 },
          html2canvas: { scale: 1.5, backgroundColor: "#ffffff", logging: false, useCORS: true },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
          pagebreak: { mode: ["css", "legacy"] },
        })
        .from(exportNode.firstElementChild || exportNode)
        .save();
    } finally {
      exportNode.remove();
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
      <header className="bg-primary text-primary-foreground px-6 py-3 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <ClipboardList size={18} />
          <span className="text-sm font-semibold tracking-wide uppercase">UX Research — Plantilla de Notas</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditMode((v) => !v)}
            className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
              editMode ? "bg-green-500 text-white hover:bg-green-600" : "bg-white/10 text-white/80 hover:bg-white/20"
            }`}
          >
            {editMode ? <><Check size={13} /> Listo</> : <><Pencil size={13} /> Editar plantilla</>}
          </button>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-accent-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Download size={13} />
            {exporting ? "Generando…" : "Exportar PDF"}
          </button>
        </div>
      </header>

      <div ref={printRef} className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        {/* Profile card */}
        <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div className="bg-accent px-6 py-4 flex items-center gap-2">
            <User size={16} className="text-accent-foreground opacity-80" />
            <h2 className="text-sm font-semibold text-accent-foreground uppercase tracking-widest">Perfil del Participante</h2>
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
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"># Sesión / Código</label>
              <input
                type="text"
                value={sesion}
                onChange={(e) => setSesion(e.target.value)}
                placeholder="Ej. P-07"
                className="w-48 rounded-lg bg-input-background border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos demográficos</label>
              <div className="space-y-4">
                {[
                  { title: "Perfil tecnológico", items: [
                    { id: "tech_avanzado", label: "Tech: Avanzado" },
                    { id: "tech_intermedio", label: "Tech: Intermedio" },
                    { id: "tech_basico", label: "Tech: Básico" },
                    { id: "smartphone_ios", label: "iPhone / iOS" },
                    { id: "smartphone_android", label: "Android" },
                  ]},
                  { title: "Bancos que utiliza", items: [
                    { id: "banco_bhd", label: "BHD" },
                    { id: "banco_popular", label: "Popular" },
                    { id: "banco_banreservas", label: "Banreservas" },
                    { id: "banco_scotiabank", label: "Scotiabank" },
                    { id: "banco_apap", label: "APAP" },
                    { id: "banco_caribe", label: "Banco Caribe" },
                    { id: "banco_multiple", label: "Multibanca (3+ bancos)" },
                  ]},
                  { title: "Apps bancarias que usa", items: [
                    { id: "app_bhd", label: "BHD App" },
                    { id: "app_bhd_empresarial", label: "BHD Empresarial" },
                    { id: "app_popular", label: "Popular" },
                    { id: "app_popular_empresarial", label: "Popular Empresarial" },
                    { id: "app_biz", label: "App BIZ" },
                    { id: "app_banreservas", label: "Banreservas" },
                    { id: "app_banreservas_empresarial", label: "Banreservas Empresarial" },
                  ]},
                ].map((group) => (
                  <div key={group.title} className="rounded-xl border border-border bg-muted/40 p-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{group.title}</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {group.items.map((d) => (
                        <label
                          key={d.id}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-sm transition-colors select-none ${
                            checks[d.id] ? "bg-primary text-primary-foreground border-primary" : "bg-input-background border-border hover:border-accent"
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

        {/* Sections */}
        {sections.map((section) => {
          const isCollapsed = collapsed[section.id] && !editMode;
          return (
            <div key={section.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
              <div
                className={`px-6 py-4 flex items-start justify-between gap-3 ${!editMode ? "cursor-pointer hover:bg-muted transition-colors" : ""}`}
                onClick={() => !editMode && toggleSection(section.id)}
              >
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  {editMode && <GripVertical size={16} className="text-muted-foreground mt-1 flex-shrink-0 cursor-grab" />}
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
                        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${TAG_COLORS[section.tag]}`}>{section.tag}</span>
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
                    >
                      <Trash2 size={15} />
                    </button>
                  ) : (
                    isCollapsed ? <ChevronDown size={18} className="text-muted-foreground" /> : <ChevronUp size={18} className="text-muted-foreground" />
                  )}
                </div>
              </div>

              {(!isCollapsed || editMode) && (
                <div className="px-6 pb-6 space-y-5">
                  {(section.context || section.task || editMode) && (
                    <div className="rounded-xl bg-muted border border-border p-4 space-y-3">
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contexto</span>
                        {editMode ? (
                          <textarea value={section.context} onChange={(e) => updateSection(section.id, "context", e.target.value)} placeholder="Describe el contexto..." rows={2} className="mt-1 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                        ) : section.context ? (
                          <p className="text-sm text-foreground mt-0.5">{section.context}</p>
                        ) : null}
                      </div>
                      <div>
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tarea</span>
                        {editMode ? (
                          <textarea value={section.task} onChange={(e) => updateSection(section.id, "task", e.target.value)} placeholder="Describe la tarea..." rows={2} className="mt-1 w-full rounded-lg bg-card border border-border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" />
                        ) : section.task ? (
                          <p className="text-sm text-foreground mt-0.5">{section.task}</p>
                        ) : null}
                      </div>
                    </div>
                  )}
                  <div className="space-y-4">
                    {section.questions.map((q, i) => (
                      <div key={q.id} className="space-y-2">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex-shrink-0 w-6 h-6 rounded-full bg-muted border border-border flex items-center justify-center text-xs font-semibold text-muted-foreground">{i + 1}</span>
                          {editMode ? (
                            <div className="flex-1 flex gap-2">
                              <input value={q.text} onChange={(e) => updateQuestion(section.id, q.id, e.target.value)} className="flex-1 rounded-lg bg-input-background border border-border px-3 py-1.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring" />
                              <button onClick={() => deleteQuestion(section.id, q.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"><X size={14} /></button>
                            </div>
                          ) : (
                            <p className="text-sm font-medium text-foreground leading-snug pt-0.5">{q.text}</p>
                          )}
                        </div>
                        {!editMode && (
                          <textarea
                            value={respuestas[q.id] || ""}
                            onChange={(e) => setRespuesta(q.id, e.target.value)}
                            placeholder="Escribe las observaciones aquí..."
                            rows={3}
                            className="rounded-xl bg-input-background border border-border px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none leading-relaxed ml-9"
                            style={{ width: "calc(100% - 2.25rem)" }}
                          />
                        )}
                      </div>
                    ))}
                    {editMode && (
                      <button onClick={() => addQuestion(section.id)} className="ml-9 flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-blue-700 transition-colors py-1">
                        <Plus size={14} /> Agregar pregunta
                      </button>
                    )}
                  </div>
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

        {editMode && (
          <button onClick={addSection} className="w-full py-4 rounded-2xl border-2 border-dashed border-border hover:border-accent text-muted-foreground hover:text-accent flex items-center justify-center gap-2 text-sm font-semibold transition-colors">
            <Plus size={16} /> Agregar nueva sección
          </button>
        )}

        <div className="text-center py-4">
          <p className="text-xs text-muted-foreground">UX Research · BHD Empresarial · {new Date().getFullYear()}</p>
        </div>
      </div>

      <style>{`
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
      `}</style>
    </div>
  );
}
