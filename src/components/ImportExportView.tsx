import { useRef, useState } from 'react';
import type { Cargo, ResultadoClave, AccionLogro } from '../types';
import {
  parseResultadosFile,
  parseCargosResultadosFile,
  parseAccionLogroFile,
  exportResultadosClave,
  exportCargosResultados,
  exportAccionesLogros,
} from '../importers';

interface Props {
  cargos: Cargo[];
  resultados: ResultadoClave[];
  accionesLogros: AccionLogro[];
  onImportResultados: (parsed: { texto: string; kpis: string[]; clasificacion?: string }[]) => number;
  onImportCargosResultados: (
    parsed: { nombre: string; nivel: Cargo['nivel']; clasificacion: string; resultadosTexto: string[] }[]
  ) => number;
  onImportAccionesLogros: (parsed: { accion: string; logro: string; clasificacion?: string }[]) => number;
}

export default function ImportExportView({
  cargos,
  resultados,
  accionesLogros,
  onImportResultados,
  onImportCargosResultados,
  onImportAccionesLogros,
}: Props) {
  const [toast, setToast] = useState<string | null>(null);
  const resultadosInput = useRef<HTMLInputElement>(null);
  const cargosInput = useRef<HTMLInputElement>(null);
  const accionesInput = useRef<HTMLInputElement>(null);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  async function handleImportResultados(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseResultadosFile(file);
      const count = onImportResultados(parsed);
      flash(`Se importaron/actualizaron ${count} resultados clave desde "${file.name}"`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  }

  async function handleImportCargos(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseCargosResultadosFile(file);
      const count = onImportCargosResultados(parsed);
      flash(`Se importaron/actualizaron ${count} cargos desde "${file.name}"`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  }

  async function handleImportAcciones(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const parsed = await parseAccionLogroFile(file);
      const count = onImportAccionesLogros(parsed);
      flash(`Se importaron/actualizaron ${count} acciones desde "${file.name}"`);
    } catch (err) {
      flash(err instanceof Error ? err.message : 'No se pudo leer el archivo.');
    }
  }

  return (
    <div className="view">
      <header className="view-header">
        <h1>Importar / Exportar</h1>
        <p>Sube nuevas versiones de tus Excel para actualizar los datos, o descarga el estado actual de la aplicación en Excel.</p>
      </header>

      {toast && <div className="toast">{toast}</div>}

      <div className="io-grid">
        <div className="io-card">
          <h3>Resultados Clave y KPIs</h3>
          <p className="muted">Columnas: Resultado Clave, CLASIFICACION (opcional), KPIs (una o varias columnas).</p>
          <div className="io-actions">
            <input ref={resultadosInput} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportResultados} />
            <button className="btn-secondary" onClick={() => resultadosInput.current?.click()}>⬆ Importar Excel</button>
            <button className="btn-primary" onClick={() => exportResultadosClave(resultados)}>⬇ Exportar Excel</button>
          </div>
          <div className="io-count">{resultados.length} resultados clave en el sistema</div>
        </div>

        <div className="io-card">
          <h3>Cargos y Resultados asignados</h3>
          <p className="muted">Columnas: CARGO, NIVEL, CLASIFICACION, RESULTADO CLAVE (una o varias columnas).</p>
          <div className="io-actions">
            <input ref={cargosInput} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportCargos} />
            <button className="btn-secondary" onClick={() => cargosInput.current?.click()}>⬆ Importar Excel</button>
            <button className="btn-primary" onClick={() => exportCargosResultados(cargos, resultados)}>⬇ Exportar Excel</button>
          </div>
          <div className="io-count">{cargos.length} cargos en el sistema</div>
        </div>

        <div className="io-card">
          <h3>Acciones y Logros</h3>
          <p className="muted">Columnas: ACCIONES (varias columnas), LOGROS (varias columnas), CLASIFICACION (opcional).</p>
          <div className="io-actions">
            <input ref={accionesInput} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleImportAcciones} />
            <button className="btn-secondary" onClick={() => accionesInput.current?.click()}>⬆ Importar Excel</button>
            <button className="btn-primary" onClick={() => exportAccionesLogros(cargos, accionesLogros)}>⬇ Exportar Excel</button>
          </div>
          <div className="io-count">{accionesLogros.length} acciones en el catálogo</div>
        </div>
      </div>

      <div className="io-note">
        <strong>Nota:</strong> importar un archivo actualiza (o agrega si no existe) por coincidencia exacta de texto/nombre; no borra datos que no aparezcan en el archivo importado.
      </div>
    </div>
  );
}
