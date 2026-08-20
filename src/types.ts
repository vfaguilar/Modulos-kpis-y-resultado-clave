export type NivelKey =
  | 'CARDINAL'
  | 'SUPERIOR_ESTRATEGICO'
  | 'SUPERIOR_TACTICO'
  | 'INTERMEDIO'
  | 'INICIAL';

export interface NivelInfo {
  key: NivelKey;
  label: string;
  color: string;
  colorSoft: string;
}

export interface Kpi {
  id: string;
  texto: string;
  nivel?: string;
}

// Catálogo: un Resultado Clave con sus KPIs asociados.
export interface ResultadoClave {
  id: string;
  texto: string;
  clasificacion: string;
  nivel?: string;
  kpis: Kpi[];
}

// Catálogo: un par Acción + Logro (van siempre unidos).
export interface AccionLogro {
  id: string;
  accion: string;
  logro: string;
  clasificacion: string;
  nivel?: string;
}

export interface Requisito {
  id: string;
  categoria: string;
  descripcion: string;
}

export interface Cargo {
  id: string;
  nombre: string;
  nivel: NivelKey;
  clasificacion: string;
  resultadoClaveIds: string[];
  kpiIds: string[]; // subconjunto de kpis (de los resultados asignados) que aplican a este cargo
  accionLogroIds: string[];
  requisitoIds: string[];
}

export interface AppData {
  cargos: Cargo[];
  resultadosClave: ResultadoClave[];
  accionesLogros: AccionLogro[];
  requisitos: Requisito[];
}
