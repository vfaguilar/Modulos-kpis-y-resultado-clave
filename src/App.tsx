import { useEffect, useState } from 'react';
import type { Cargo, ResultadoClave, AccionLogro, Requisito, Kpi } from './types';
import {
  loadCargos, loadResultadosClave, loadAccionesLogros, loadRequisitos,
  saveCargos, saveResultadosClave, saveAccionesLogros, saveRequisitos,
} from './storage';
import Sidebar from './components/Sidebar';
import ResultadosClaveView from './components/ResultadosClaveView';
import AsignacionView from './components/AsignacionView';
import AccionesLogrosView from './components/AccionesLogrosView';
import RequisitosView from './components/RequisitosView';
import ImportExportView from './components/ImportExportView';
import './App.css';

export type View = 'resultados' | 'asignacion' | 'acciones' | 'requisitos' | 'importar';

export default function App() {
  const [view, setView] = useState<View>('asignacion');
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [resultados, setResultados] = useState<ResultadoClave[]>([]);
  const [accionesLogros, setAccionesLogros] = useState<AccionLogro[]>([]);
  const [requisitos, setRequisitos] = useState<Requisito[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      const [c, r, a, req] = await Promise.all([
        loadCargos(),
        loadResultadosClave(),
        loadAccionesLogros(),
        loadRequisitos(),
      ]);
      setCargos(c);
      setResultados(r);
      setAccionesLogros(a);
      setRequisitos(req);
      setLoading(false);
    }
    init();
  }, []);

  useEffect(() => { if (!loading) saveCargos(cargos); }, [cargos, loading]);
  useEffect(() => { if (!loading) saveResultadosClave(resultados); }, [resultados, loading]);
  useEffect(() => { if (!loading) saveAccionesLogros(accionesLogros); }, [accionesLogros, loading]);
  useEffect(() => { if (!loading) saveRequisitos(requisitos); }, [requisitos, loading]);

  const norm = (s: string) => s.trim().toLowerCase();

  // ---------------- Resultados Clave (catálogo) ----------------
  function handleAddResultado(resultado_clave: string, kpisText: string[], clasificacion: string) {
    const id = `rc-${Date.now()}`;
    const kpis: Kpi[] = kpisText.map((t, i) => ({ id: `kpi-${Date.now()}-${i}`, resultado_clave: t }));
    setResultados((prev) => [...prev, { id, resultado_clave, clasificacion, kpis }]);
  }
  function handleUpdateResultado(id: string, resultado_clave: string, kpisText: string[], clasificacion: string) {
    setResultados((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        // conserva ids de KPIs existentes (por texto) para no romper asignaciones ya hechas
        const kpis: Kpi[] = kpisText.map((t, i) => {
          const existing = r.kpis.find((k) => k.resultado_clave === t);
          return existing ?? { id: `kpi-${Date.now()}-${i}`, resultado_clave: t };
        });
        return { ...r, resultado_clave, clasificacion, kpis };
      })
    );
  }
  function handleDeleteResultado(id: string) {
    const resultado = resultados.find((r) => r.id === id);
    const kpiIdsToRemove = new Set(resultado?.kpis.map((k) => k.id) ?? []);
    setResultados((prev) => prev.filter((r) => r.id !== id));
    setCargos((prev) =>
      prev.map((c) => ({
        ...c,
        resultadoClaveIds: c.resultadoClaveIds.filter((rid) => rid !== id),
        kpiIds: c.kpiIds.filter((kid) => !kpiIdsToRemove.has(kid)),
      }))
    );
  }

  // ---------------- Asignación: resultado clave + kpis por cargo ----------------
  function handleToggleResultado(cargoId: string, resultadoId: string) {
    setCargos((prev) =>
      prev.map((c) => {
        if (c.id !== cargoId) return c;
        const has = c.resultadoClaveIds.includes(resultadoId);
        if (has) {
          const resultado = resultados.find((r) => r.id === resultadoId);
          const kpiIdsOf = new Set(resultado?.kpis.map((k) => k.id) ?? []);
          return {
            ...c,
            resultadoClaveIds: c.resultadoClaveIds.filter((id) => id !== resultadoId),
            kpiIds: c.kpiIds.filter((kid) => !kpiIdsOf.has(kid)),
          };
        }
        return { ...c, resultadoClaveIds: [...c.resultadoClaveIds, resultadoId] };
      })
    );
  }
  function handleToggleKpi(cargoId: string, kpiId: string) {
    setCargos((prev) =>
      prev.map((c) => {
        if (c.id !== cargoId) return c;
        const has = c.kpiIds.includes(kpiId);
        return { ...c, kpiIds: has ? c.kpiIds.filter((id) => id !== kpiId) : [...c.kpiIds, kpiId] };
      })
    );
  }

  // ---------------- Acciones y Logros ----------------
  function handleAddAccionLogro(acciones: string, logros: string, clasificacion: string) {
    const id = `al-${Date.now()}`;
    setAccionesLogros((prev) => [...prev, { id, acciones, logros, clasificacion }]);
  }
  function handleToggleAccionLogro(cargoId: string, accionLogroId: string) {
    setCargos((prev) =>
      prev.map((c) => {
        if (c.id !== cargoId) return c;
        const has = c.accionLogroIds.includes(accionLogroId);
        return {
          ...c,
          accionLogroIds: has
            ? c.accionLogroIds.filter((id) => id !== accionLogroId)
            : [...c.accionLogroIds, accionLogroId],
        };
      })
    );
  }

  // ---------------- Requisitos ----------------
  function handleAddRequisito(newRequisito: Omit<Requisito, 'id'>) {
    const id = `req-${Date.now()}`;
    setRequisitos((prev) => [...prev, { id, ...newRequisito }]);
  }
  function handleUpdateRequisito(id: string, updated: Omit<Requisito, 'id'>) {
    setRequisitos((prev) => prev.map((r) => (r.id === id ? { id, ...updated } : r)));
  }
  function handleDeleteRequisito(id: string) {
    setRequisitos((prev) => prev.filter((r) => r.id !== id));
    setCargos((prev) => prev.map((c) => ({ ...c, requisitoIds: c.requisitoIds.filter((rid) => rid !== id) })));
  }
  function handleToggleRequisitoAssignment(cargoId: string, requisitoId: string) {
    setCargos((prev) =>
      prev.map((c) => {
        if (c.id !== cargoId) return c;
        const has = c.requisitoIds.includes(requisitoId);
        return {
          ...c,
          requisitoIds: has ? c.requisitoIds.filter((id) => id !== requisitoId) : [...c.requisitoIds, requisitoId],
        };
      })
    );
  }

  // ---------------- Importar desde Excel ----------------
  function handleImportResultados(parsed: { resultado_clave: string; kpis: string[]; clasificacion?: string }[]): number {
    let affected = 0;
    setResultados((prev) => {
      const next = [...prev];
      for (const p of parsed) {
        const idx = next.findIndex((r) => norm(r.resultado_clave) === norm(p.resultado_clave));
        const kpis: Kpi[] = p.kpis.map((t, i) => {
          const existing = idx >= 0 ? next[idx].kpis.find((k) => norm(k.resultado_clave) === norm(t)) : undefined;
          return existing ?? { id: `kpi-${Date.now()}-${next.length}-${i}`, resultado_clave: t };
        });
        // si el Excel trae clasificación se usa; si no, se conserva la que ya tenía
        const clasificacion = p.clasificacion?.trim() || (idx >= 0 ? next[idx].clasificacion : 'Sin clasificar');
        if (idx >= 0) next[idx] = { ...next[idx], kpis, clasificacion };
        else next.push({ id: `rc-${Date.now()}-${next.length}`, resultado_clave: p.resultado_clave, clasificacion, kpis });
        affected++;
      }
      return next;
    });
    return affected;
  }

  function handleImportCargosResultados(
    parsed: { cargo: string; nivel: Cargo['nivel']; clasificacion: string; resultadosTexto: string[] }[]
  ): number {
    let affected = 0;
    setCargos((prevCargos) => {
      const next = [...prevCargos];
      for (const p of parsed) {
        const resultadoIds = p.resultadosTexto
          .map((t) => resultados.find((r) => norm(r.resultado_clave) === norm(t))?.id)
          .filter((id): id is string => Boolean(id));
        const kpiIds = resultadoIds.flatMap(
          (rid) => resultados.find((r) => r.id === rid)?.kpis.map((k) => k.id) ?? []
        );
        const idx = next.findIndex((c) => norm(c.cargo) === norm(p.cargo));
        if (idx >= 0) {
          next[idx] = { ...next[idx], nivel: p.nivel, clasificacion: p.clasificacion, resultadoClaveIds: resultadoIds, kpiIds };
        } else {
          next.push({
            id: `cargo-${Date.now()}-${next.length}`,
            cargo: p.cargo,
            nivel: p.nivel,
            clasificacion: p.clasificacion,
            resultadoClaveIds: resultadoIds,
            kpiIds,
            accionLogroIds: [],
            requisitoIds: [],
          });
        }
        affected++;
      }
      return next;
    });
    return affected;
  }

  function handleImportAccionesLogros(parsed: { acciones: string; logros: string; clasificacion?: string }[]): number {
    let affected = 0;
    setAccionesLogros((prev) => {
      const next = [...prev];
      for (const p of parsed) {
        const idx = next.findIndex((al) => norm(al.acciones) === norm(p.acciones));
        const clasificacion = p.clasificacion?.trim() || (idx >= 0 ? next[idx].clasificacion : 'Sin clasificar');
        if (idx >= 0) next[idx] = { ...next[idx], logros: p.logros, clasificacion };
        else next.push({ id: `al-${Date.now()}-${next.length}`, acciones: p.acciones, logros: p.logros, clasificacion });
        affected++;
      }
      return next;
    });
    return affected;
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onChange={setView} totalCargos={cargos.length} />
      <main className="app-content">
        {loading ? (
          <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando datos desde la nube...</div>
        ) : (
          <>
            {view === 'resultados' && (
              <ResultadosClaveView
                resultados={resultados}
                onAdd={handleAddResultado}
                onUpdate={handleUpdateResultado}
                onDelete={handleDeleteResultado}
              />
            )}
        {view === 'asignacion' && (
          <AsignacionView
            cargos={cargos}
            resultados={resultados}
            onToggleResultado={handleToggleResultado}
            onToggleKpi={handleToggleKpi}
          />
        )}
        {view === 'acciones' && (
          <AccionesLogrosView
            cargos={cargos}
            accionesLogros={accionesLogros}
            onToggle={handleToggleAccionLogro}
            onAdd={handleAddAccionLogro}
          />
        )}
        {view === 'requisitos' && (
          <RequisitosView
            requisitos={requisitos}
            cargos={cargos}
            onAdd={handleAddRequisito}
            onUpdate={handleUpdateRequisito}
            onDelete={handleDeleteRequisito}
            onToggleAssignment={handleToggleRequisitoAssignment}
          />
        )}
        {view === 'importar' && (
          <ImportExportView
            cargos={cargos}
            resultados={resultados}
            accionesLogros={accionesLogros}
            onImportResultados={handleImportResultados}
            onImportCargosResultados={handleImportCargosResultados}
            onImportAccionesLogros={handleImportAccionesLogros}
          />
        )}
          </>
        )}
      </main>
    </div>
  );
}
