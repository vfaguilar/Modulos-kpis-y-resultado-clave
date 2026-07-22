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
  resultado_clave: string;
}

// Catálogo: un Resultado Clave con sus KPIs asociados.
export interface ResultadoClave {
  id: string;
  resultado_clave: string;
  clasificacion: string;
  kpis: Kpi[];
}

// Catálogo: un par Acción + Logro (van siempre unidos).
export interface AccionLogro {
  id: string;
  acciones: string;
  logros: string;
  clasificacion: string;
}

export interface Requisito {
  id: string;
  categoria: string;
  descripcion: string;
}

export interface Cargo {
  id: string;
  cargo: string;
  nivel: NivelKey;
  clasificacion: string;
  resultadoClaveIds: string[];
  kpiIds: string[]; 
  accionLogroIds: string[];
  requisitoIds: string[];
}

export interface AppData {
  cargos: Cargo[];
  resultadosClave: ResultadoClave[];
  accionesLogros: AccionLogro[];
  requisitos: Requisito[];
}
