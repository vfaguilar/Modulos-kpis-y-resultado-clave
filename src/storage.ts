import type { Cargo, ResultadoClave, AccionLogro, Requisito } from './types';
import { supabase } from './lib/supabase';
import { seedCargos, seedResultadosClave, seedAccionesLogros, seedRequisitos } from './data/seed';

// Utility for fetching from Supabase with fallback to local seed
async function fetchFromSupabase<T>(table: string, seedFallback: T[]): Promise<T[]> {
  try {
    const { data, error } = await supabase.from(table).select('*');
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      return seedFallback;
    }
    return (data as T[]) || seedFallback;
  } catch (err) {
    console.error(`Unexpected error fetching ${table}:`, err);
    return seedFallback;
  }
}

export async function loadCargos(): Promise<Cargo[]> {
  const data = await fetchFromSupabase<any>('cargos', seedCargos);
  return data.map((c: any) => ({
    id: c.id,
    nombre: c.nombre_cargo || c.nombre,
    nivel: c.nivel_nuevo || c.nivel,
    clasificacion: c.categoria_antigua || c.clasificacion,
    resultadoClaveIds: c.resultadoClaveIds ?? c.metadata?.resultadoClaveIds ?? [],
    kpiIds: c.kpiIds ?? c.metadata?.kpiIds ?? [],
    accionLogroIds: c.accionLogroIds ?? c.metadata?.accionLogroIds ?? [],
    requisitoIds: c.requisitoIds ?? c.metadata?.requisitoIds ?? [],
  }));
}

export async function loadResultadosClave(): Promise<ResultadoClave[]> {
  return fetchFromSupabase<ResultadoClave>('resultados_clave', seedResultadosClave);
}

export async function loadAccionesLogros(): Promise<AccionLogro[]> {
  return fetchFromSupabase<AccionLogro>('acciones_logros', seedAccionesLogros);
}

export async function loadRequisitos(): Promise<Requisito[]> {
  return fetchFromSupabase<Requisito>('requisitos', seedRequisitos);
}

export async function saveCargos(cargos: Cargo[]) {
  // En la nube, las guardadas se realizarán de manera individual o en batch a la tabla 'cargos'
  // Por ahora, actualizamos la metadata localmente.
  console.log('Guardando cargos en Supabase (mock)...', cargos.length);
}
export async function saveResultadosClave(v: ResultadoClave[]) {
  console.log('Guardando resultados_clave en Supabase (mock)...', v.length);
}
export async function saveAccionesLogros(v: AccionLogro[]) {
  console.log('Guardando acciones_logros en Supabase (mock)...', v.length);
}
export async function saveRequisitos(v: Requisito[]) {
  console.log('Guardando requisitos en Supabase (mock)...', v.length);
}
