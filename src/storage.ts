import type { Cargo, ResultadoClave, AccionLogro, Requisito } from './types';
import { seedCargos, seedResultadosClave, seedAccionesLogros, seedRequisitos } from './data/seed';

const CARGOS_KEY = 'gc2_cargos_v1';
const RESULTADOS_KEY = 'gc2_resultados_v1';
const ACCIONLOGRO_KEY = 'gc2_accionlogro_v1';
const REQUISITOS_KEY = 'gc2_requisitos_v1';

function loadOrSeed<T>(key: string, seed: T[]): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    return seed;
  } catch {
    return seed;
  }
}

export function loadCargos(): Cargo[] {
  return loadOrSeed<Cargo>(CARGOS_KEY, seedCargos).map((c) => ({
    ...c,
    resultadoClaveIds: c.resultadoClaveIds ?? [],
    kpiIds: c.kpiIds ?? [],
    accionLogroIds: c.accionLogroIds ?? [],
    requisitoIds: c.requisitoIds ?? [],
  }));
}
export function loadResultadosClave(): ResultadoClave[] {
  return loadOrSeed<ResultadoClave>(RESULTADOS_KEY, seedResultadosClave);
}
export function loadAccionesLogros(): AccionLogro[] {
  return loadOrSeed<AccionLogro>(ACCIONLOGRO_KEY, seedAccionesLogros);
}
export function loadRequisitos(): Requisito[] {
  return loadOrSeed<Requisito>(REQUISITOS_KEY, seedRequisitos);
}

export function saveCargos(v: Cargo[]) {
  localStorage.setItem(CARGOS_KEY, JSON.stringify(v));
}
export function saveResultadosClave(v: ResultadoClave[]) {
  localStorage.setItem(RESULTADOS_KEY, JSON.stringify(v));
}
export function saveAccionesLogros(v: AccionLogro[]) {
  localStorage.setItem(ACCIONLOGRO_KEY, JSON.stringify(v));
}
export function saveRequisitos(v: Requisito[]) {
  localStorage.setItem(REQUISITOS_KEY, JSON.stringify(v));
}

export function resetAll() {
  localStorage.removeItem(CARGOS_KEY);
  localStorage.removeItem(RESULTADOS_KEY);
  localStorage.removeItem(ACCIONLOGRO_KEY);
  localStorage.removeItem(REQUISITOS_KEY);
}
