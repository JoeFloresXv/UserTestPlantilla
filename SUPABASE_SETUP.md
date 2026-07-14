# Supabase — BPD User Tests

Proyecto conectado: `BPD User Tests` (`mgyobszphvqjfjokwtav`).

## Publicar desde Figma Make

1. Abre **Make settings → Integrations → Supabase**.
2. Conecta el proyecto existente **BPD User Tests**.
3. Las variables `VITE_SUPABASE_URL` y `VITE_SUPABASE_PUBLISHABLE_KEY` se inyectan automáticamente.
4. Publica la app. Si los valores de entorno no están disponibles en el build, el código usa los valores de respaldo que ya están embebidos en `src/lib/supabase.ts`.

## Habilitar Anonymous Sign-Ins

La aplicación usa sesiones anónimas persistentes para que cada investigador pueda guardar sus estudios sin exponer las tablas públicamente. Antes de probar el guardado remoto, habilita **Anonymous Sign-Ins** en:

https://supabase.com/dashboard/project/mgyobszphvqjfjokwtav/auth/providers

Después de habilitarlo, pulsa **"Guardar sesión"** en la app. El indicador superior debe cambiar de "Modo local" a "Sincronizado".

## Tablas requeridas

La aplicación necesita las siguientes tablas con RLS activo:

| Tabla | Propósito |
|---|---|
| `studies` | Plantillas de estudio (secciones y preguntas) |
| `study_sections` | Secciones de una plantilla |
| `study_questions` | Preguntas por sección |
| `participants` | Participantes por estudio |
| `participant_answers` | Respuestas por pregunta y participante |
| `participant_ratings` | Valoraciones (1–5) por sección/pregunta |
| `participant_section_notes` | Notas de sección por participante |

## Estudios independientes

La app permite crear plantillas independientes (`createResearchStudy`) y listar todas las plantillas del usuario (`listResearchStudies`). El estudio activo se guarda en `localStorage` bajo la clave `ux-research-supabase-study`.

Para cambiar de estudio activo sin perder datos, usa `activateResearchStudy(studyId)`. Para reiniciar el puntero (próxima sincronización crea un estudio nuevo), usa `resetResearchSync()`.

## Notas

- La clave publicable (`sb_publishable_...`) está diseñada para ejecutarse en el navegador. RLS protege los datos — la `SERVICE_ROLE_KEY` nunca debe aparecer en el frontend.
- La aplicación mantiene un respaldo local mientras Supabase no esté disponible.
- Los mapas de IDs locales→remotos se guardan por estudio en `ux-research-supabase-map:${studyId}` para soportar múltiples estudios en el mismo navegador.
