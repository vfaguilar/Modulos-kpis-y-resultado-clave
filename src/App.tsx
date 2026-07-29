import { useEffect, useState, useRef } from 'react';
import type { Cargo, ResultadoClave, AccionLogro, Requisito, Kpi } from './types';
import { fetchDataFromSupabase, saveToSupabase } from './storage';
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
  const [loading, setLoading] = useState<boolean>(true);
  const isLoadedRef = useRef<boolean>(false);

  useEffect(() => {
    fetchDataFromSupabase().then((data) => {
      setCargos(data.cargos);
      setResultados(data.resultadosClave);
      setAccionesLogros(data.accionesLogros);
      setRequisitos(data.requisitos);
      setLoading(false);
      isLoadedRef.current = true;
    });
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    saveToSupabase({ cargos, resultadosClave: resultados, accionesLogros, requisitos });
  }, [cargos, resultados, accionesLogros, requisitos]);

  const norm = (s: string) => s.trim().toLowerCase();

  // ---------------- Resultados Clave (catálogo) ----------------
  function handleAddResultado(texto: string, kpisText: string[], clasificacion: string) {
    const id = `rc-${Date.now()}`;
    const kpis: Kpi[] = kpisText.map((t, i) => ({ id: `kpi-${Date.now()}-${i}`, texto: t }));
    setResultados((prev) => [...prev, { id, texto, clasificacion, kpis }]);
  }
  function handleUpdateResultado(id: string, texto: string, kpisText: string[], clasificacion: string) {
    setResultados((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        const kpis: Kpi[] = kpisText.map((t, i) => {
          const existing = r.kpis.find((k) => k.texto === t);
          return existing ?? { id: `kpi-${Date.now()}-${i}`, texto: t };
        });
        return { ...r, texto, clasificacion, kpis };
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
  function handleAddAccionLogro(accion: string, logro: string, clasificacion: string) {
    const id = `al-${Date.now()}`;
    setAccionesLogros((prev) => [...prev, { id, accion, logro, clasificacion }]);
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
  function handleImportResultados(parsed: { texto: string; kpis: string[]; clasificacion?: string }[]): number {
    let affected = 0;
    setResultados((prev) => {
      const next = [...prev];
      for (const p of parsed) {
        const idx = next.findIndex((r) => norm(r.texto) === norm(p.texto));
        const kpis: Kpi[] = p.kpis.map((t, i) => {
          const existing = idx >= 0 ? next[idx].kpis.find((k) => norm(k.texto) === norm(t)) : undefined;
          return existing ?? { id: `kpi-${Date.now()}-${next.length}-${i}`, texto: t };
        });
        const clasificacion = p.clasificacion?.trim() || (idx >= 0 ? next[idx].clasificacion : 'Sin clasificar');
        if (idx >= 0) next[idx] = { ...next[idx], kpis, clasificacion };
        else next.push({ id: `rc-${Date.now()}-${next.length}`, texto: p.texto, clasificacion, kpis });
        affected++;
      }
      return next;
    });
    return affected;
  }

  function handleImportCargosResultados(
    parsed: { nombre: string; nivel: Cargo['nivel']; clasificacion: string; resultadosTexto: string[] }[]
  ): number {
    let affected = 0;
    setCargos((prevCargos) => {
      const next = [...prevCargos];
      for (const p of parsed) {
        const resultadoIds = p.resultadosTexto
          .map((t) => resultados.find((r) => norm(r.texto) === norm(t))?.id)
          .filter((id): id is string => Boolean(id));
        const kpiIds = resultadoIds.flatMap(
          (rid) => resultados.find((r) => r.id === rid)?.kpis.map((k) => k.id) ?? []
        );
        const idx = next.findIndex((c) => norm(c.nombre) === norm(p.nombre));
        if (idx >= 0) {
          next[idx] = { ...next[idx], nivel: p.nivel, clasificacion: p.clasificacion, resultadoClaveIds: resultadoIds, kpiIds };
        } else {
          next.push({
            id: `cargo-${Date.now()}-${next.length}`,
            nombre: p.nombre,
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

  function handleImportAccionesLogros(parsed: { accion: string; logro: string; clasificacion?: string }[]): number {
    let affected = 0;
    setAccionesLogros((prev) => {
      const next = [...prev];
      for (const p of parsed) {
        const idx = next.findIndex((al) => norm(al.accion) === norm(p.accion));
        const clasificacion = p.clasificacion?.trim() || (idx >= 0 ? next[idx].clasificacion : 'Sin clasificar');
        if (idx >= 0) next[idx] = { ...next[idx], logro: p.logro, clasificacion };
        else next.push({ id: `al-${Date.now()}-${next.length}`, accion: p.accion, logro: p.logro, clasificacion });
        affected++;
      }
      return next;
    });
    return affected;
  }

  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#1f2f4d', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>🔄</div>
          <h3>Cargando módulo de KPIs desde Supabase...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <Sidebar view={view} onChange={setView} totalCargos={cargos.length} />
      <main className="app-content">
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
      </main>
    </div>
  );
}
