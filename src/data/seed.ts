import cargosRaw from './cargos-seed.json';
import resultadosRaw from './resultados-clave-seed.json';
import accionLogroRaw from './accion-logro-seed.json';
import type { Cargo, NivelInfo, ResultadoClave, AccionLogro, Requisito } from '../types';

// Estos JSON son el equivalente "horneado" de tus tres Excel:
//   Libro11.xlsx -> cargos-seed.json (CARGO, NIVEL, CLASIFICACION, RESULTADO CLAVE...)
//   Libro12.xlsx -> resultados-clave-seed.json (Resultado Clave -> KPIs)
//   Libro13.xlsx -> accion-logro-seed.json (ACCIONES + LOGROS, deduplicados)
// Se usan solo como datos de partida; desde la app puedes actualizarlos
// importando nuevas versiones de esos mismos Excel en el módulo "Importar/Exportar".

export const NIVELES: NivelInfo[] = [
  { key: 'CARDINAL', label: 'Cardinal', color: '#b8860b', colorSoft: '#fbf1da' },
  { key: 'SUPERIOR_ESTRATEGICO', label: 'Superior Estratégico', color: '#7c5cff', colorSoft: '#efeaff' },
  { key: 'SUPERIOR_TACTICO', label: 'Superior Táctico', color: '#1f2f4d', colorSoft: '#e7eaf1' },
  { key: 'INTERMEDIO', label: 'Intermedio', color: '#d63b34', colorSoft: '#fbe7e6' },
  { key: 'INICIAL', label: 'Inicial', color: '#64748b', colorSoft: '#eef1f4' },
];

export function nivelInfo(key: NivelKeyLike) {
  return NIVELES.find((n) => n.key === key) ?? NIVELES.find((n) => n.key === 'INTERMEDIO')!;
}
type NivelKeyLike = Cargo['nivel'];

export const CATEGORIAS_REQUISITO = [
  'Educación',
  'Experiencia',
  'Conocimientos Técnicos',
  'Habilidades',
  'Certificaciones',
  'Idiomas',
  'Otro',
];

// Clasificaciones de cargo conocidas (mismas que ya existen en el catálogo
// de cargos). Se usan para tipificar Resultados Clave y Acciones/Logros,
// de modo que puedan filtrarse por la clasificación del cargo seleccionado.
export const CLASIFICACIONES = [
  'GERENTE CORPORATIVO',
  'JEFE NEGOCIO',
  'JEFE SUCURSAL',
  'SUPERVISOR',
  'ENCARGADOS',
  'ANALISTA',
  'ADMINISTRATIVO',
  'VENDEDOR',
  'Sin clasificar',
];

export const seedCargos: Cargo[] = cargosRaw as Cargo[];
export const seedResultadosClave: ResultadoClave[] = resultadosRaw as ResultadoClave[];
export const seedAccionesLogros: AccionLogro[] = accionLogroRaw as AccionLogro[];
export const seedRequisitos: Requisito[] = [];
