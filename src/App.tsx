import { useEffect, useState, useRef } from 'react';
import type { Cargo, ResultadoClave, AccionLogro, Requisito, Kpi } from './types';
import { fetchDataFromSupabase, saveToSupabase } from './storage';
import { supabase } from './lib/supabase';
import ResultadosClaveView from './components/ResultadosClaveView';
import AsignacionView from './components/AsignacionView';
import AccionesLogrosView from './components/AccionesLogrosView';
import RequisitosView from './components/RequisitosView';
import './App.css';

export type View = 'resultados' | 'acciones' | 'requisitos';

export default function App() {
  const [view, setView] = useState<View>('resultados');
  const [rcSubtab, setRcSubtab] = useState<'asignacion' | 'catalogo'>('asignacion');
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

  // Escuchar cambio de vista desde el sidebar de la Plataforma DO (hash o postMessage)
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#/', '').replace('#', '');
      if (hash === 'acciones' || hash === 'requisitos' || hash === 'resultados') {
        setView(hash as View);
      }
    };
    const handleMessage = (e: MessageEvent) => {
      if (e.data && e.data.type === 'CHANGE_VIEW' && e.data.view) {
        setView(e.data.view as View);
      }
      if (e.data && e.data.type === 'REFRESH_DATA') {
        fetchDataFromSupabase().then((data) => {
          setCargos(data.cargos);
          setResultados(data.resultadosClave);
          setAccionesLogros(data.accionesLogros);
          setRequisitos(data.requisitos);
        });
      }
      if (e.data && e.data.type === 'FORCE_SAVE_ALL') {
        console.log('[POSTMESSAGE IN] Recibida orden FORCE_SAVE_ALL en iFrame React.');
        saveToSupabase({ cargos, resultadosClave: resultados, accionesLogros, requisitos });
      }
      if (e.data && e.data.type === 'AUTH_SESSION_SYNC' && e.data.session) {
        const newAccessToken = e.data.session?.access_token;
        if (!newAccessToken) return;

        if (supabase.auth) {
          supabase.auth.getSession().then(({ data: { session: currentSession } }: any) => {
            if (currentSession?.access_token === newAccessToken) {
              return; // Token idéntico, ABORTAR para romper bucle infinito
            }
            console.log('[IFRAME AUTH BRIDGING] Sesión síncronizada exitosamente dentro del iFrame React.');
            if (e.data.session.access_token && e.data.session.refresh_token) {
              supabase.auth.setSession({
                access_token: e.data.session.access_token,
                refresh_token: e.data.session.refresh_token,
              }).catch((err: any) => console.warn('[IFRAME AUTH BRIDGING] Error al establecer sesión local:', err));
            }
          }).catch(() => {});
        }
      }
    };

    try {
      if (typeof window !== 'undefined' && (window.parent as any)?.supabaseClient) {
        (window.parent as any).supabaseClient.auth.getSession().then(({ data: { session } }: any) => {
          if (session) {
            console.log('[IFRAME AUTH BRIDGING] Sesión síncronizada exitosamente dentro del iFrame React.');
          }
        });
      }
    } catch (eAuth) {}

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('hashchange', handleHashChange);
      window.removeEventListener('message', handleMessage);
    };
  }, []);

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

  if (loading) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ textAlign: 'center', color: '#0f1c33', fontFamily: 'sans-serif' }}>
          <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>Cargando datos desde Supabase...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <main className="app-content">
        {view === 'resultados' && (
          <div>
            <div className="subtabs-pills" style={{ marginBottom: '16px', display: 'inline-flex' }}>
              <button
                className={`subtab-pill ${rcSubtab === 'asignacion' ? 'active' : ''}`}
                onClick={() => setRcSubtab('asignacion')}
              >
                Asignación por Cargo
              </button>
              <button
                className={`subtab-pill ${rcSubtab === 'catalogo' ? 'active' : ''}`}
                onClick={() => setRcSubtab('catalogo')}
              >
                Catálogo Maestro de Resultados y KPIs ({resultados.length})
              </button>
            </div>
            {rcSubtab === 'asignacion' ? (
              <AsignacionView
                cargos={cargos}
                resultados={resultados}
                onToggleResultado={handleToggleResultado}
                onToggleKpi={handleToggleKpi}
              />
            ) : (
              <ResultadosClaveView
                resultados={resultados}
                onAdd={handleAddResultado}
                onUpdate={handleUpdateResultado}
                onDelete={handleDeleteResultado}
              />
            )}
          </div>
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
      </main>
    </div>
  );
}
