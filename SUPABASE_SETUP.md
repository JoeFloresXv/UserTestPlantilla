# Supabase — BPD User Tests

Proyecto: `BPD User Tests`

La aplicación usa sesiones anónimas persistentes para que cada investigador pueda guardar sus estudios sin exponer las tablas públicamente. Antes de probar el guardado remoto, habilita **Anonymous Sign-Ins** en:

https://supabase.com/dashboard/project/mgyobszphvqjfjokwtav/auth/providers

Después de habilitarlo, reinicia el servidor Vite y pulsa “Guardar sesión”. El indicador superior debe cambiar de “Modo local” a “Sincronizado”.

La aplicación mantiene un respaldo local mientras Supabase no esté disponible. El proyecto tiene RLS activo en todas las tablas y separa la plantilla del estudio, los participantes, respuestas y valoraciones.
