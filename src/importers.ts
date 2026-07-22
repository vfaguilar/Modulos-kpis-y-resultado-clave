import * as XLSX from 'xlsx';
import type { Cargo, ResultadoClave, AccionLogro } from './types';
import { normalizeNivel } from './utils';
import { NIVELES } from './data/seed';

function cellText(cell: unknown): string {
  return String(cell ?? '').trim();
}

async function readFirstSheetAsRows(file: File): Promise<any[][]> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false }) as any[][];
}

function findHeaderRow(rows: any[][], patterns: RegExp[]): number {
  for (let i = 0; i < rows.length; i++) {
    const rowLower = rows[i].map((c) => cellText(c).toLowerCase());
    if (patterns.every((p) => rowLower.some((cell) => p.test(cell)))) return i;
  }
  return -1;
}
function colIndex(headerRow: any[], pattern: RegExp): number {
  return headerRow.findIndex((c) => pattern.test(cellText(c).toLowerCase()));
}

// ---------------------------------------------------------------------
// IMPORTAR: Resultado Clave -> KPIs   (formato Libro12)
// ---------------------------------------------------------------------
export interface ParsedResultado {
  resultado_clave: string;
  kpis: string[];
  clasificacion?: string;
}
export async function parseResultadosFile(file: File): Promise<ParsedResultado[]> {
  const rows = await readFirstSheetAsRows(file);
  const headerIdx = findHeaderRow(rows, [/resultado/]);
  if (headerIdx === -1) {
    throw new Error('No se encontró una columna "Resultado Clave" en el archivo.');
  }
  const header = rows[headerIdx];
  const textoIdx = colIndex(header, /resultado/);
  const clasifIdx = colIndex(header, /clasificacion|clasificación/);
  const out: ParsedResultado[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const texto = cellText(row[textoIdx]);
    if (!texto) continue;
    // las columnas de KPI son las que no son ni el resultado ni la clasificación
    const kpis = row
      .map((cell, idx) => (idx === textoIdx || idx === clasifIdx ? '' : cellText(cell)))
      .filter((v) => v !== '');
    const clasificacion = clasifIdx >= 0 ? cellText(row[clasifIdx]) : '';
    out.push({ resultado_clave: texto, kpis, clasificacion: clasificacion || undefined });
  }
  return out;
}

// ---------------------------------------------------------------------
// IMPORTAR: Cargo + Nivel + Clasificación + Resultados asignados (Libro11)
// ---------------------------------------------------------------------
export interface ParsedCargoResultados {
  cargo: string;
  nivel: Cargo['nivel'];
  clasificacion: string;
  resultadosTexto: string[];
}
export async function parseCargosResultadosFile(file: File): Promise<ParsedCargoResultados[]> {
  const rows = await readFirstSheetAsRows(file);
  const headerIdx = findHeaderRow(rows, [/cargo/, /nivel/, /resultado/]);
  if (headerIdx === -1) {
    throw new Error('No se encontró un encabezado con columnas "CARGO", "NIVEL" y "RESULTADO CLAVE".');
  }
  const header = rows[headerIdx];
  const cargoIdx = colIndex(header, /cargo/);
  const nivelIdx = colIndex(header, /nivel/);
  const clasifIdx = colIndex(header, /clasificacion|clasificación/);
  const firstResultadoIdx = colIndex(header, /resultado/);

  const out: ParsedCargoResultados[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const nombre = cellText(row[cargoIdx]);
    if (!nombre) continue;
    const resultadosTexto = row.slice(firstResultadoIdx).map(cellText).filter((v) => v !== '');
    out.push({
      cargo: nombre,
      nivel: normalizeNivel(cellText(row[nivelIdx])),
      clasificacion: clasifIdx >= 0 ? cellText(row[clasifIdx]) : '',
      resultadosTexto,
    });
  }
  return out;
}

// ---------------------------------------------------------------------
// IMPORTAR: Acciones + Logros (Libro13)
// ---------------------------------------------------------------------
export interface ParsedAccionLogro {
  acciones: string;
  logros: string;
  clasificacion?: string;
}
export async function parseAccionLogroFile(file: File): Promise<ParsedAccionLogro[]> {
  const rows = await readFirstSheetAsRows(file);
  const headerIdx = findHeaderRow(rows, [/accion|acción/]);
  if (headerIdx === -1) {
    throw new Error('No se encontró una columna "ACCIONES" en el archivo.');
  }
  const header = rows[headerIdx];
  const accionStart = colIndex(header, /accion|acción/);
  const logroStart = colIndex(header, /logro/);
  const clasifIdx = colIndex(header, /clasificacion|clasificación/);
  if (logroStart === -1) {
    throw new Error('No se encontró una columna "LOGROS" en el archivo.');
  }

  const out: ParsedAccionLogro[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const clasificacion = clasifIdx >= 0 ? cellText(row[clasifIdx]) : '';
    const acciones = row
      .slice(accionStart, logroStart)
      .map((cell, offset) => (accionStart + offset === clasifIdx ? '' : cellText(cell)))
      .filter((v) => v !== '');
    const logros = row
      .slice(logroStart)
      .map((cell, offset) => (logroStart + offset === clasifIdx ? '' : cellText(cell)))
      .filter((v) => v !== '');
    acciones.forEach((accion, idx) => {
      out.push({ accion, logros: logros[idx] ?? '', clasificacion: clasificacion || undefined });
    });
  }
  return out;
}

// ---------------------------------------------------------------------
// EXPORTAR
// ---------------------------------------------------------------------
function downloadWorkbook(rows: any[][], sheetName: string, fileName: string) {
  const ws = XLSX.utils.aoa_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, fileName);
}

function nivelLabelOf(key: Cargo['nivel']) {
  return NIVELES.find((n) => n.key === key)?.label.toUpperCase() ?? key;
}

export function exportResultadosClave(resultados: ResultadoClave[]) {
  const maxKpis = Math.max(1, ...resultados.map((r) => r.kpis.length));
  const header = ['Resultado Clave', 'CLASIFICACION', ...Array.from({ length: maxKpis }, (_, i) => (i === 0 ? 'KPIs' : ''))];
  const rows: any[][] = [header];
  resultados.forEach((r) => {
    rows.push([r.resultado_clave, r.clasificacion, ...r.kpis.map((k) => k.resultado_clave)]);
  });
  downloadWorkbook(rows, 'Resultados Clave', 'resultados-clave-kpis.xlsx');
}

export function exportCargosResultados(cargos: Cargo[], resultados: ResultadoClave[]) {
  const byId = new Map(resultados.map((r) => [r.id, r.resultado_clave]));
  const maxResultados = Math.max(1, ...cargos.map((c) => c.resultadoClaveIds.length));
  const header = ['CARGO', 'NIVEL', 'CLASIFICACION', ...Array.from({ length: maxResultados }, (_, i) => (i === 0 ? 'RESULTADO CLAVE' : ''))];
  const rows: any[][] = [header];
  cargos.forEach((c) => {
    const textos = c.resultadoClaveIds.map((id) => byId.get(id) ?? '').filter(Boolean);
    rows.push([c.cargo, nivelLabelOf(c.nivel), c.clasificacion, ...textos]);
  });
  downloadWorkbook(rows, 'Cargos', 'cargos-resultados-clave.xlsx');
}

export function exportAccionesLogros(cargos: Cargo[], accionesLogros: AccionLogro[]) {
  const byId = new Map(accionesLogros.map((al) => [al.id, al]));
  const maxAcciones = Math.max(1, ...cargos.map((c) => c.accionLogroIds.length));
  const header = [
    'CARGO', 'CLASIFICACION', 'NIVEL',
    ...Array.from({ length: maxAcciones }, (_, i) => (i === 0 ? 'ACCIONES' : '')),
    ...Array.from({ length: maxAcciones }, (_, i) => (i === 0 ? 'LOGROS' : '')),
  ];
  const rows: any[][] = [header];
  cargos.forEach((c) => {
    const pairs = c.accionLogroIds.map((id) => byId.get(id)).filter(Boolean) as AccionLogro[];
    const acciones = pairs.map((p) => p.acciones);
    const logros = pairs.map((p) => p.logros);
    while (acciones.length < maxAcciones) acciones.push('');
    while (logros.length < maxAcciones) logros.push('');
    rows.push([c.cargo, c.clasificacion, nivelLabelOf(c.nivel), ...acciones, ...logros]);
  });
  downloadWorkbook(rows, 'Acciones y Logros', 'cargos-acciones-logros.xlsx');
}
