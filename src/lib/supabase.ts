import { createClient } from "@supabase/supabase-js";

// La clave publicable está diseñada para ejecutarse en el navegador. RLS protege los datos.
// Los valores de respaldo permiten que el build publicado por Figma Make use el mismo proyecto.
const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined)
  || "https://mgyobszphvqjfjokwtav.supabase.co";
const supabaseKey = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)
  || "sb_publishable_8OJF2RsLhKyBAJG0-Dd89g_PJP3zXDN";

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);

export const supabase = supabaseConfigured
  ? createClient(supabaseUrl!, supabaseKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export async function ensureSupabaseSession() {
  if (!supabase) return { user: null, error: new Error("Supabase no está configurado") };

  const { data: existing, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) return { user: null, error: sessionError };
  if (existing.session?.user) return { user: existing.session.user, error: null };

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error?.message.toLowerCase().includes("anonymous")) {
    return { user: null, error: new Error("Activa Anonymous Sign-Ins en Supabase para guardar entrevistas desde el navegador.") };
  }
  return { user: data.user, error };
}
