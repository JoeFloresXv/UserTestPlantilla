import { useState, type ReactNode } from "react";
import { defaultMethod, summarize, type Study, type StudyMeta, type Section, type Participant } from "./studyModel";
import { downloadStudy, importStudy } from "./studyFiles";

export type Area = "prep" | "template" | "metrics" | "files";
const links: [Area,string][] = [["prep","Preparar"],["template","Entrevistas"],["metrics","Resultados"],["files","Archivos"]];
export function StudyNavigation({area, name, go}: {area: Area; name: string; go:(a:Area|"catalog")=>void}) {
  return <nav className="study-nav" aria-label="Estudio"><strong>{name}</strong>{links.map(([key,title])=>
    <button key={key} aria-current={area===key?"page":undefined} onClick={()=>go(key)}>{title}</button>
  )}<button onClick={()=>go("catalog")}>Mis estudios</button></nav>;
}
function Field({name,children}: {name:string;children:ReactNode}) {
  return <label className="study-field">{name}{children}</label>;
}
export function Preparation({meta,sections,onSave,onEdit,onStart}: {
  meta:StudyMeta; sections:Section[]; onSave:(m:StudyMeta)=>Promise<boolean>; onEdit:(id?:string)=>void; onStart:()=>void;
}) {
  const [mode,setMode] = useState<"method"|"meta"|null>(null);
  const [draft,setDraft] = useState(meta);
  const [busy,setBusy] = useState(false);
  const method=meta.method || defaultMethod;
  const working=draft.method || defaultMethod;
  const edit=(next:"method"|"meta")=>{setDraft(meta); setMode(next)};
  if(mode) return <main className="study-page"><h1>{mode==="method"?"Editar metodología":"Editar ficha del estudio"}</h1>
    <form className="study-panel" onSubmit={async e=>{e.preventDefault(); setBusy(true); try {if(await onSave(draft))setMode(null)} finally {setBusy(false)}}}>
    {mode==="method"?<>
      <Field name="Participantes previstos"><input type="number" min="1" required value={working.sample || ""} onChange={e=>setDraft({...draft,method:{...working,sample:Number(e.target.value)}})}/></Field>
      {([["audience","Características de los participantes"],["testType","Tipo de prueba"],["measures","Métricas evaluadas"],["quotas","Muestra por generación"]] as const).map(([key,label])=><Field key={key} name={label}><input value={working[key]} onChange={e=>setDraft({...draft,method:{...working,[key]:e.target.value}})}/></Field>)}
    </>:<>{([["name","Nombre del estudio"],["flowName","Flujo o funcionalidad"],["description","Objetivo del estudio"],["creatorName","Investigador"],["teamName","Equipo"]] as const).map(([key,label])=><Field key={key} name={label}><input required={key==="name"} value={draft[key]} onChange={e=>setDraft({...draft,[key]:e.target.value})}/></Field>)}</>}
    <div className="study-actions"><button type="button" onClick={()=>setMode(null)}>Cancelar</button><button disabled={busy} className="strong">Guardar cambios</button></div></form></main>;
  return <main className="study-page"><div className="study-heading"><h1>Preparar el estudio</h1><button onClick={()=>edit("meta")}>Editar ficha</button></div>
    <p>{meta.description || meta.flowName}</p>
    <section className="study-panel"><header><h2>Metodología</h2><button onClick={()=>edit("method")}>Editar metodología</button></header>
    <dl><div><dt>Muestra prevista</dt><dd>{method.sample} participantes</dd></div><div><dt>Tipo de prueba</dt><dd>{method.testType || "Por definir"}</dd></div><div><dt>Qué se evaluará</dt><dd>{method.measures || "Por definir"}</dd></div></dl></section>
    <section className="study-panel"><header><h2>Guion de la entrevista</h2><button onClick={()=>onEdit()}>Editar guion</button></header>
    <ol>{sections.map(s=><li key={s.id}><button onClick={()=>onEdit(s.id)}>{s.label}{s.enabled===false?" · Desactivada":""}</button></li>)}</ol></section>
    <div className="study-actions"><button className="strong" onClick={onStart}>Ir a entrevistas</button></div></main>;
}
export function ResultsOverview({study}: {study:Study}) {
  const rows=study.sections.filter(s=>s.tag!=="General").map(section=>({section,...summarize(section,study.participants)}));
  const total=rows.reduce((a,r)=>({observed:a.observed+r.observed, independent:a.independent+r.independent,sum:a.sum+r.sum,rated:a.rated+r.rated}),{observed:0,independent:0,sum:0,rated:0});
  const average=(sum:number,n:number)=>n?(sum/n).toLocaleString("es-DO",{minimumFractionDigits:1,maximumFractionDigits:1})+" / 5":"—";
  const [selected,setSelected]=useState<string|null>(null);
  const section=rows.find(r=>r.section.id===selected)?.section;
  return <><div className="study-cards">{[["Entrevistas guardadas",study.participants.length+" de "+(study.meta.method||defaultMethod).sample],["Tareas sin ayuda",total.observed?total.independent+" de "+total.observed:"—"],["Facilidad percibida",average(total.sum,total.rated)]].map(([k,v])=><section key={k} className="study-panel"><small>{k}</small><h2>{v}</h2></section>)}</div>
    <section className="study-panel"><h2>Resultados por tarea</h2><div className="study-table"><table><thead><tr><th>Tarea</th><th>Sin ayuda / observadas</th><th>Facilidad</th></tr></thead><tbody>{rows.map(r=><tr key={r.section.id}><th><button onClick={()=>setSelected(r.section.id)}>{r.section.label}</button></th><td>{r.observed?r.independent+" / "+r.observed:"—"}</td><td>{average(r.sum,r.rated)}</td></tr>)}</tbody></table></div>
    {section && <div><header><h3>{section.label}</h3><button onClick={()=>setSelected(null)}>Cerrar detalle</button></header>{study.participants.map((p:Participant)=><p key={p.id}><strong>{p.nombre || p.sesion || "Participante"}</strong> · {p.outcomes?.[section.id] || "Sin observación"}{p.respuestas[section.id+"_notas"] && " · "+p.respuestas[section.id+"_notas"]}</p>)}</div>}</section></>;
}
export function Files({study,onImport,onPdf,pdf,busy}: {study:Study;onImport:(s:Study)=>void;onPdf:()=>void;pdf:{url:string;filename:string}|null;busy:boolean}) {
  const [error,setError]=useState("");
  return <main className="study-page"><h1>Archivos</h1><section className="study-panel"><h2>Copia editable del estudio</h2>
    <p>El archivo JSON incluye la ficha, la metodología, las pantallas, el guion y las entrevistas guardadas. Impórtalo en otro equipo para continuar.</p>
    <button className="strong" onClick={()=>downloadStudy(study)}>Exportar estudio</button>
    <Field name="Importar como un estudio independiente"><input type="file" accept=".json,application/json" onChange={async e=>{const input=e.currentTarget;const file=input.files?.[0];if(!file)return;try{onImport(await importStudy(file))}catch{setError("No se pudo importar. Comprueba que sea una copia JSON válida exportada desde Archivos.")}finally{input.value=""}}}/></Field>
    {error && <p role="alert">{error}</p>}</section>
    <section className="study-panel"><h2>Informe PDF</h2><p>Genera un documento para compartir los resultados.</p><button onClick={onPdf} disabled={busy}>{busy?"Preparando…":"Preparar PDF"}</button> {pdf && <a href={pdf.url} download={pdf.filename}>Descargar PDF</a>}</section></main>;
}
