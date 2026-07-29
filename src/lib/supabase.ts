import { createClient } from '@supabase/supabase-js';

// 1. Herencia de cliente padre si se ejecuta dentro de un iframe
const parentSupabase = typeof window !== 'undefined' ? (window.parent as any)?.supabaseClient : null;

// 2. Extraer URL evaluando NEXT_PUBLIC_, VITE_, window.ENV y window.parent.ENV
const supabaseUrl: string =
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_URL ||
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' && (window as any).ENV?.SUPABASE_URL) ||
  (typeof window !== 'undefined' && (window.parent as any)?.ENV?.SUPABASE_URL) ||
  '';

// 3. Extraer Key evaluando NEXT_PUBLIC_, VITE_, window.ENV y window.parent.ENV
const supabaseAnonKey: string =
  (import.meta as any).env?.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (typeof window !== 'undefined' && (window as any).ENV?.SUPABASE_ANON_KEY) ||
  (typeof window !== 'undefined' && (window.parent as any)?.ENV?.SUPABASE_ANON_KEY) ||
  '';

let client: any = parentSupabase;

if (!client) {
  if (supabaseUrl && supabaseAnonKey) {
    try {
      client = createClient(supabaseUrl, supabaseAnonKey);
    } catch (err) {
      console.warn('[Submódulo KPIs] Error al instanciar createClient:', err);
    }
  } else {
    console.warn('[Submódulo KPIs] Advertencia: No se detectaron credenciales de Supabase en el entorno.');
  }
}

// Cliente seguro de respaldo para evitar colapsos por Uncaught Error
const safeClient: any = client || {
  from: () => ({
    select: async () => ({ data: [], error: { message: 'Supabase no disponible (Sin credenciales)' } }),
    upsert: async () => ({ data: null, error: { message: 'Supabase no disponible (Sin credenciales)' } }),
    insert: async () => ({ data: null, error: { message: 'Supabase no disponible (Sin credenciales)' } }),
    delete: async () => ({ data: null, error: { message: 'Supabase no disponible (Sin credenciales)' } }),
  }),
};

export const supabase = safeClient;
