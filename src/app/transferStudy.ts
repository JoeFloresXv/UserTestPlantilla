// Each study gets independent IDs for its sections, questions and interview notes.
type Prompt = { text: string; capture: "text" | "scale" };
type Scenario = { label: string; context: string; task: string; prompts: Prompt[] };

const note = (text: string): Prompt => ({ text, capture: "text" });
const ease: Prompt = { text: "Del 1 al 5, ¿qué tan fácil o difícil te resultó? ¿Qué influyó en tu calificación?", capture: "scale" };

const tasks: Scenario[] = [
  {
    label: "Beneficiario registrado",
    context: "Observa cómo encuentra al destinatario, abre el modal y asocia el monto con la persona correcta.",
    task: "Ya tienes a Geraldine guardada. Prepara un envío de RD$1,200 y avísame cuando esté listo para revisar.",
    prompts: [note("Mientras está abierto el modal: ¿a quién se aplicará este monto? ¿Cómo lo sabes?"), ease],
  },
  {
    label: "Envío expreso",
    context: "Entrega una ficha de prueba con banco, tipo y número de cuenta, documento y nombre esperado.",
    task: "Es la primera vez que le envías dinero a esta persona. Con los datos de la ficha, prepara un envío de RD$800.",
    prompts: [note("Después de agregar el pago, ¿qué acaba de pasar y qué te queda por hacer?"), ease],
  },
  {
    label: "Pago múltiple y comprobante",
    context: "Prepara dos destinatarios y dos comprobantes con importes y referencias coherentes. Observa cómo identifica el comprobante correcto.",
    task: "Envía RD$1,200 a una persona guardada y RD$800 a una nueva en una misma operación de prueba. La segunda persona te pide su referencia. Muéstrame cuál le darías.",
    prompts: [note("¿Cómo comprobaste que esa referencia corresponde al segundo pago?"), ease],
  },
];

const probes: Scenario[] = [
  {
    label: "Vía de pago",
    context: "Muestra las opciones ACH y pago al instante. Observa cómo interpreta la vía y el plazo.",
    task: "La persona necesita recibir el dinero hoy. Elige cómo enviarlo.",
    prompts: [note("¿Cuándo esperas que llegue y qué te hizo elegir esa opción?")],
  },
  {
    label: "Importe y comisión",
    context: "Usa el resumen con RD$10,000 de importe y RD$15 de comisión.",
    task: "Revisa este envío antes de continuar.",
    prompts: [note("¿Cuánto recibirá la persona y cuánto saldrá de tu cuenta?")],
  },
  {
    label: "Corrección de destinatario",
    context: "El nombre esperado en la ficha debe diferir del que devuelve la validación. Observa si detecta la diferencia sin ayuda.",
    task: "Comprueba este envío con la ficha que tienes delante. Decide cómo seguir.",
    prompts: [note("¿Qué dato revisaste y qué harías a continuación?")],
  },
  {
    label: "Cambio de un pago del lote",
    context: "Usa un lote con al menos dos pagos. Indica por nombre cuál se pospone.",
    task: "Uno de los pagos queda para mañana. Deja preparados los demás.",
    prompts: [note("¿Cómo sabes cuáles siguen en la operación y cuánto se debitará ahora?")],
  },
];

const approval: Scenario = {
  label: "Solicitud sometida (opcional)",
  context: "Muestra por separado una solicitud sometida y una operación completada.",
  task: "Revisa cada cierre como si acabaras de hacer el envío.",
  prompts: [note("En cada caso, ¿qué ocurrió y qué le dirías a quien espera el dinero?")],
};

export function createTransferSections(includeApproval: boolean) {
  return [...tasks, ...probes, ...(includeApproval ? [approval] : [])].map(({ label, context, task, prompts }) => ({
    id: crypto.randomUUID(), label, context, task, tag: "Escenario" as const, capture: "none" as const,
    questions: prompts.map(prompt => ({ id: crypto.randomUUID(), ...prompt })),
  }));
}
