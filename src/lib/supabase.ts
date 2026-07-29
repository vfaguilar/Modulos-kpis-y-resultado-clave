import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  (typeof window !== 'undefined' && (window as any).ENV?.SUPABASE_URL) ||
  '';

const supabaseAnonKey =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  (typeof window !== 'undefined' && (window as any).ENV?.SUPABASE_ANON_KEY) ||
  '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[Submódulo KPIs] Advertencia: No se detectaron VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
