# Supabase — BPD User Tests

Proyecto conectado: `BPD User Tests` (`mgyobszphvqjfjokwtav`).

## Activación necesaria

La aplicación usa sesiones anónimas persistentes. Activa **Allow anonymous sign-ins** en:

https://supabase.com/dashboard/project/mgyobszphvqjfjokwtav/auth/providers

Después, recarga la aplicación. El indicador superior debe pasar de **No sincronizado** a **Guardado en Supabase** al guardar una plantilla o entrevista.

## Publicar desde Figma Make

1. Abre **Make settings → Integrations → Supabase**.
2. Conecta el proyecto existente **BPD User Tests**.
3. Publica o actualiza el sitio.
4. Crea una entrevista de prueba y confirma en Supabase que aparezcan el estudio, sus secciones, preguntas, participante, respuestas, notas y valoraciones.

La URL y la clave **publicable** del proyecto forman parte del cliente como respaldo para el build de Figma Make. Esto es seguro únicamente porque todas las tablas tienen RLS y las operaciones exigen una sesión autenticada. Nunca agregues una `service_role` key ni una secret key al código.

## Alcance de la sesión anónima

Los datos se recuperan en el mismo navegador mientras exista su sesión. Si se borran los datos del navegador o se abre la app en otro dispositivo se crea otra identidad y no se verán los estudios anteriores. Para acceso compartido entre investigadores o recuperación desde varios dispositivos, el siguiente paso es incorporar inicio de sesión por correo.

La aplicación conserva además un respaldo local de participantes, ficha y estructura de la plantilla cuando Supabase no está disponible.
