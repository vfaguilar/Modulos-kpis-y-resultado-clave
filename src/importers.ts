import * as XLSX from 'xlsx';
import type { Cargo, ResultadoClave, AccionLogro } from './types';
import { normalizeNivel } from './utils';
import { NIVELES } from './data/seed';
import { supabase } from './lib/supabase';

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
  cargo?: string;
  nivel?: string;
  texto: string;
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
  const cargoIdx = colIndex(header, /cargo/);
  const clasifIdx = colIndex(header, /clasificacion|clasificación/);
  const nivelIdx = colIndex(header, /nivel/);
  const textoIdx = colIndex(header, /resultado/);

  const out: ParsedResultado[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const texto = cellText(row[textoIdx]);
    if (!texto) continue;

    const cargo = cargoIdx >= 0 ? cellText(row[cargoIdx]) : '';
    const clasificacion = clasifIdx >= 0 ? cellText(row[clasifIdx]) : '';
    const nivel = nivelIdx >= 0 ? cellText(row[nivelIdx]) : '';

    const kpis = row
      .map((cell, idx) => (idx === textoIdx || idx === clasifIdx || idx === cargoIdx || idx === nivelIdx ? '' : cellText(cell)))
      .filter((v) => v !== '');

    out.push({
      cargo: cargo || undefined,
      nivel: nivel || undefined,
      texto,
      kpis,
      clasificacion: clasificacion || undefined,
    });
  }
  return out;
}

// ---------------------------------------------------------------------
// IMPORTAR: Cargo + Nivel + Clasificación + Resultados asignados (Libro11)
// ---------------------------------------------------------------------
export interface ParsedCargoResultados {
  nombre: string;
  nivel: Cargo['nivel'];
  nivelTexto?: string;
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
    const nivelRaw = cellText(row[nivelIdx]);
    const resultadosTexto = row.slice(firstResultadoIdx).map(cellText).filter((v) => v !== '');
    out.push({
      nombre,
      nivel: normalizeNivel(nivelRaw),
      nivelTexto: nivelRaw || undefined,
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
  cargo?: string;
  nivel?: string;
  accion: string;
  logro: string;
  clasificacion?: string;
}

export async function parseAccionLogroFile(file: File): Promise<ParsedAccionLogro[]> {
  const rows = await readFirstSheetAsRows(file);
  const headerIdx = findHeaderRow(rows, [/accion|acción/]);
  if (headerIdx === -1) {
    throw new Error('No se encontró una columna "ACCIONES" en el archivo.');
  }
  const header = rows[headerIdx];
  const cargoIdx = colIndex(header, /cargo/);
  const clasifIdx = colIndex(header, /clasificacion|clasificación/);
  const nivelIdx = colIndex(header, /nivel/);
  const accionStart = colIndex(header, /accion|acción/);
  const logroStart = colIndex(header, /logro/);
  if (logroStart === -1) {
    throw new Error('No se encontró una columna "LOGROS" en el archivo.');
  }

  const out: ParsedAccionLogro[] = [];
  for (let i = headerIdx + 1; i < rows.length; i++) {
    const row = rows[i];
    const cargo = cargoIdx >= 0 ? cellText(row[cargoIdx]) : '';
    const clasificacion = clasifIdx >= 0 ? cellText(row[clasifIdx]) : '';
    const nivel = nivelIdx >= 0 ? cellText(row[nivelIdx]) : '';

    const acciones = row
      .slice(accionStart, logroStart)
      .map((cell, offset) => {
        const idx = accionStart + offset;
        if (idx === clasifIdx || idx === cargoIdx || idx === nivelIdx) return '';
        return cellText(cell);
      })
      .filter((v) => v !== '');

    const logros = row
      .slice(logroStart)
      .map((cell, offset) => {
        const idx = logroStart + offset;
        if (idx === clasifIdx || idx === cargoIdx || idx === nivelIdx) return '';
        return cellText(cell);
      })
      .filter((v) => v !== '');

    acciones.forEach((accion, idx) => {
      out.push({
        cargo: cargo || undefined,
        nivel: nivel || undefined,
        accion,
        logro: logros[idx] ?? '',
        clasificacion: clasificacion || undefined,
      });
    });
  }
  return out;
}

// ---------------------------------------------------------------------
// PERSISTENCIA AUTOMÁTICA EN SUPABASE TRAS PARSEO CON RELACIONES DE CARGOS
// ---------------------------------------------------------------------
export async function persistParsedResultadosToSupabase(parsed: ParsedResultado[]): Promise<void> {
  if (!parsed || parsed.length === 0) return;
  const rcRows: any[] = [];
  const kpiRows: any[] = [];
  const asignRows: any[] = [];

  // Obtener lista de cargos maestra de Supabase para vincular por nombre de cargo
  const { data: dbCargos } = await supabase.from('cargos').select('id, nombre_completo_cargo');

  parsed.forEach((p, idx) => {
    const rcId = `rc-imp-${Date.now()}-${idx}`;
    rcRows.push({
      id: rcId,
      texto: p.texto,
      clasificacion: p.clasificacion || 'Sin clasificar',
      nivel: p.nivel || 'Sin nivel',
    });
    p.kpis.forEach((kpiText, kIdx) => {
      kpiRows.push({
        id: `kpi-imp-${Date.now()}-${idx}-${kIdx}`,
        resultado_clave_id: rcId,
        texto: kpiText,
        nivel: p.nivel || 'Sin nivel',
      });
    });

    if (p.cargo && dbCargos) {
      const match = dbCargos.find((c: any) => c.nombre_completo_cargo?.trim().toLowerCase() === p.cargo?.trim().toLowerCase());
      if (match) {
        asignRows.push({
          cargo_id: match.id,
          resultado_clave_id: rcId,
        });
      }
    }
  });

  if (rcRows.length > 0) {
    const { error: errRC } = await supabase.from('resultados_clave').upsert(rcRows);
    if (errRC) console.error('Error al persistir resultados_clave:', errRC);
  }
  if (kpiRows.length > 0) {
    const { error: errKPI } = await supabase.from('indicadores_kpi').upsert(kpiRows);
    if (errKPI) console.error('Error al persistir indicadores_kpi:', errKPI);
  }
  if (asignRows.length > 0) {
    const { error: errAsign } = await supabase.from('asignacion_resultados_cargos').insert(asignRows);
    if (errAsign) console.error('Error al vincular asignacion_resultados_cargos desde import:', errAsign);
  }
}

export async function persistParsedAccionLogroToSupabase(parsed: ParsedAccionLogro[]): Promise<void> {
  if (!parsed || parsed.length === 0) return;
  const alRows: any[] = [];
  const asignRows: any[] = [];

  const { data: dbCargos } = await supabase.from('cargos').select('id, nombre_completo_cargo');

  parsed.forEach((p, idx) => {
    const alId = `al-imp-${Date.now()}-${idx}`;
    alRows.push({
      id: alId,
      accion: p.accion,
      logro: p.logro,
      clasificacion: p.clasificacion || 'Sin clasificar',
      nivel: p.nivel || 'Sin nivel',
    });

    if (p.cargo && dbCargos) {
      const match = dbCargos.find((c: any) => c.nombre_completo_cargo?.trim().toLowerCase() === p.cargo?.trim().toLowerCase());
      if (match) {
        asignRows.push({
          cargo_id: match.id,
          accion_logro_id: alId,
        });
      }
    }
  });

  const { error: errAL } = await supabase.from('acciones_logros').upsert(alRows);
  if (errAL) console.error('Error al persistir acciones_logros:', errAL);

  if (asignRows.length > 0) {
    const { error: errAsign } = await supabase.from('asignacion_resultados_cargos').insert(asignRows);
    if (errAsign) console.error('Error al vincular asignacion_resultados_cargos desde acciones import:', errAsign);
  }
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
  const header = ['Resultado Clave', 'CLASIFICACION', 'NIVEL', ...Array.from({ length: maxKpis }, (_, i) => (i === 0 ? 'KPIs' : ''))];
  const rows: any[][] = [header];
  resultados.forEach((r) => {
    rows.push([r.texto, r.clasificacion, r.nivel || 'Sin nivel', ...r.kpis.map((k) => k.texto)]);
  });
  downloadWorkbook(rows, 'Resultados Clave', 'resultados-clave-kpis.xlsx');
}

export function exportCargosResultados(cargos: Cargo[], resultados: ResultadoClave[]) {
  const byId = new Map(resultados.map((r) => [r.id, r.texto]));
  const maxResultados = Math.max(1, ...cargos.map((c) => c.resultadoClaveIds.length));
  const header = ['CARGO', 'NIVEL', 'CLASIFICACION', ...Array.from({ length: maxResultados }, (_, i) => (i === 0 ? 'RESULTADO CLAVE' : ''))];
  const rows: any[][] = [header];
  cargos.forEach((c) => {
    const textos = c.resultadoClaveIds.map((id) => byId.get(id) ?? '').filter(Boolean);
    rows.push([c.nombre, nivelLabelOf(c.nivel), c.clasificacion, ...textos]);
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
    const acciones = pairs.map((p) => p.accion);
    const logros = pairs.map((p) => p.logro);
    while (acciones.length < maxAcciones) acciones.push('');
    while (logros.length < maxAcciones) logros.push('');
    rows.push([c.nombre, c.clasificacion, nivelLabelOf(c.nivel), ...acciones, ...logros]);
  });
  downloadWorkbook(rows, 'Acciones y Logros', 'cargos-acciones-logros.xlsx');
}
