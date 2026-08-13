import { useEffect, useState, useRef } from 'react';
import type { Cargo, ResultadoClave, AccionLogro, Requisito, Kpi } from './types';
import { fetchDataFromSupabase, saveToSupabase, deleteAccionLogroCascade } from './storage';
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
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const isLoadedRef = useRef<boolean>(false);
  const skipNextSaveRef = useRef<boolean>(false);
  const saveTimeoutRef = useRef<any>(null);

  const loadData = async () => {
    setLoading(true);
    const data = await fetchDataFromSupabase();
    if (data.cargos.length === 0 && data.resultadosClave.length === 0) {
      setIsAuthenticated(false);
      setCargos([]);
      setResultados([]);
      setAccionesLogros([]);
      setRequisitos([]);
    } else {
      setIsAuthenticated(true);
      skipNextSaveRef.current = true;
      setCargos(data.cargos);
      setResultados(data.resultadosClave);
      setAccionesLogros(data.accionesLogros);
      setRequisitos(data.requisitos);
      isLoadedRef.current = true;
    }
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current || !isAuthenticated) return;
    if (skipNextSaveRef.current) {
      skipNextSaveRef.current = false;
      return;
    }
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveToSupabase({ cargos, resultadosClave: resultados, accionesLogros, requisitos });
    }, 400);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [cargos, resultados, accionesLogros, requisitos, isAuthenticated]);

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
        loadData();
      }
      if (e.data && e.data.type === 'FORCE_SAVE_ALL') {
        if (isAuthenticated) {
          console.log('[POSTMESSAGE IN] Recibida orden FORCE_SAVE_ALL en iFrame React.');
          saveToSupabase({ cargos, resultadosClave: resultados, accionesLogros, requisitos });
        }
      }
      if (e.data && e.data.type === 'AUTH_SESSION_PURGE') {
        console.log('[IFRAME AUTH] Purga de sesión solicitada por logout.');
        setIsAuthenticated(false);
        setCargos([]);
        setResultados([]);
        setAccionesLogros([]);
        setRequisitos([]);
        isLoadedRef.current = false;
        if (supabase.auth) {
          supabase.auth.signOut().catch(() => {});
        }
      }
      if (e.data && e.data.type === 'AUTH_SESSION_SYNC' && e.data.session) {
        const newAccessToken = e.data.session?.access_token;
        if (!newAccessToken) return;

        if (supabase.auth) {
          supabase.auth.getSession().then(({ data: { session: currentSession } }: any) => {
            if (currentSession?.access_token === newAccessToken && isAuthenticated) {
              return; // Token idéntico, ABORTAR para romper bucle infinito
            }
            console.log('[IFRAME AUTH BRIDGING] Sesión síncronizada exitosamente dentro del iFrame React.');
            if (e.data.session.access_token && e.data.session.refresh_token) {
              supabase.auth.setSession({
                access_token: e.data.session.access_token,
                refresh_token: e.data.session.refresh_token,
              }).then(() => {
                loadData();
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
  }, [isAuthenticated]);

  // ---------------- Resultados Clave (catálogo) ----------------
  function handleAddResultado(texto: string, kpisText: string[], clasificacion: string) {
    const cleanText = texto.trim().toLowerCase();
    const exists = resultados.some(r => r.texto.trim().toLowerCase() === cleanText);
    if (exists) {
      alert('Ya existe un Resultado Clave con esta misma descripción en el catálogo.');
      return;
    }
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
  async function handleDeleteResultado(id: string) {
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
    try {
      await supabase.from('asignacion_resultados_cargos').delete().eq('resultado_clave_id', id);
      await supabase.from('indicadores_kpi').delete().eq('resultado_clave_id', id);
      await supabase.from('resultados_clave').delete().eq('id', id);
      console.log(`[DELETE CASCADE] RC ${id} y sus KPIs eliminados de Supabase.`);
    } catch (err) {
      console.error('Error al borrar RC en cascada:', err);
    }
    window.dispatchEvent(new CustomEvent('profileDataChanged'));
  }
  async function handleDeleteKpi(kpiId: string) {
    setResultados((prev) =>
      prev.map((r) => ({
        ...r,
        kpis: r.kpis.filter((k) => k.id !== kpiId),
      }))
    );
    setCargos((prev) =>
      prev.map((c) => ({
        ...c,
        kpiIds: c.kpiIds.filter((id) => id !== kpiId),
      }))
    );
    try {
      await supabase.from('asignacion_resultados_cargos').delete().eq('kpi_id', kpiId);
      await supabase.from('indicadores_kpi').delete().eq('id', kpiId);
      console.log(`[DELETE CASCADE] KPI ${kpiId} eliminado de asignaciones e indicadores_kpi.`);
    } catch (err) {
      console.error('Error al borrar KPI en cascada:', err);
    }
    window.dispatchEvent(new CustomEvent('profileDataChanged'));
  }

  // ---------------- Asignación: resultado clave + kpis por cargo ----------------
  function handleToggleResultado(cargoId: string, resultadoId: string) {
    setCargos((prev) =>
      prev.map((c) => {
        if (c.id !== cargoId) return c;
        const has = c.resultadoClaveIds.includes(resultadoId);
        const resultado = resultados.find((r) => r.id === resultadoId);
        const kpiIdsOf = new Set(resultado?.kpis?.map((k) => k.id) ?? []);
        if (has) {
          return {
            ...c,
            resultadoClaveIds: c.resultadoClaveIds.filter((id) => id !== resultadoId),
            kpiIds: c.kpiIds.filter((kid) => !kpiIdsOf.has(kid)),
          };
        }
        const combinedKpis = new Set([...c.kpiIds, ...Array.from(kpiIdsOf)]);
        return {
          ...c,
          resultadoClaveIds: [...c.resultadoClaveIds, resultadoId],
          kpiIds: Array.from(combinedKpis),
        };
      })
    );
  }
  function handleToggleKpi(cargoId: string, kpiId: string) {
    setCargos((prev) =>
      prev.map((c) => {
        if (c.id !== cargoId) return c;
        const has = c.kpiIds.includes(kpiId);
        if (has) {
          return { ...c, kpiIds: c.kpiIds.filter((id) => id !== kpiId) };
        } else {
          const parentRc = resultados.find((r) => (r.kpis || []).some((k) => k.id === kpiId));
          const parentRcId = parentRc?.id;
          const newRcIds = parentRcId && !c.resultadoClaveIds.includes(parentRcId)
            ? [...c.resultadoClaveIds, parentRcId]
            : c.resultadoClaveIds;
          return {
            ...c,
            resultadoClaveIds: newRcIds,
            kpiIds: [...c.kpiIds, kpiId],
          };
        }
      })
    );
  }

  // ---------------- Acciones y Logros ----------------
  function handleAddAccionLogro(accion: string, logro: string, clasificacion: string) {
    const cleanAcc = (accion || '').trim().toLowerCase();
    const cleanLog = (logro || '').trim().toLowerCase();

    const existingAL = accionesLogros.find(
      (al) => (al.accion || '').trim().toLowerCase() === cleanAcc && 
              (al.logro || (al as any).logro_esperado || '').trim().toLowerCase() === cleanLog
    );

    if (existingAL) {
      alert(`La Acción y Logro Esperado ya existe en el catálogo maestro bajo la categoría "${existingAL.clasificacion || 'Sin clasificar'}".`);
      return;
    }

    const id = `al-${Date.now()}`;
    setAccionesLogros((prev) => [...prev, { id, accion: accion.trim(), logro: logro.trim(), clasificacion }]);
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
  async function handleUpdateAccionLogro(id: string, accion: string, logro: string, clasificacion: string) {
    const cleanAcc = (accion || '').trim().toLowerCase();
    const cleanLog = (logro || '').trim().toLowerCase();

    const existingOther = accionesLogros.find(
      (al) => al.id !== id &&
              (al.accion || '').trim().toLowerCase() === cleanAcc && 
              (al.logro || (al as any).logro_esperado || '').trim().toLowerCase() === cleanLog
    );

    if (existingOther) {
      alert(`Ya existe otra Acción y Logro Esperado idéntica en el catálogo maestro bajo la categoría "${existingOther.clasificacion || 'Sin clasificar'}".`);
      return;
    }

    setAccionesLogros((prev) => prev.map((al) => (al.id === id ? { id, accion: accion.trim(), logro: logro.trim(), clasificacion } : al)));
    try {
      await supabase.from('acciones_logros').upsert({
        id,
        accion: accion.trim(),
        logro: logro.trim(),
        clasificacion
      });
      console.log(`[UPDATE MAESTRO] Acción/Logro ${id} actualizada.`);
    } catch (err) {
      console.error('Error actualizando Acción/Logro:', err);
    }
    window.dispatchEvent(new CustomEvent('profileDataChanged'));
  }
  async function handleDeleteAccionLogro(id: string) {
    const deletedAL = accionesLogros.find((al) => String(al.id) === String(id));
    const affectedCargoIds = cargos.filter((c) => c.accionLogroIds.includes(id)).map((c) => c.id);

    setAccionesLogros((prev) => prev.filter((al) => String(al.id) !== String(id)));
    setCargos((prev) =>
      prev.map((c) => ({
        ...c,
        accionLogroIds: c.accionLogroIds.filter((alId) => String(alId) !== String(id)),
      }))
    );

    await deleteAccionLogroCascade(id, affectedCargoIds, deletedAL);
    window.dispatchEvent(new CustomEvent('profileDataChanged'));
  }

  // ---------------- Requisitos ----------------
  function handleAddRequisito(newRequisito: Omit<Requisito, 'id'>) {
    const cleanDesc = (newRequisito.descripcion || '').trim().toLowerCase();
    const cleanCat = (newRequisito.categoria || '').trim().toLowerCase();
    const exists = requisitos.some(r => r.descripcion.trim().toLowerCase() === cleanDesc && (r.categoria || '').trim().toLowerCase() === cleanCat);
    if (exists) {
      alert('Ya existe un Requisito con esta misma categoría y descripción en el catálogo.');
      return;
    }
    const id = `req-${Date.now()}`;
    setRequisitos((prev) => [...prev, { id, ...newRequisito }]);
  }
  function handleUpdateRequisito(id: string, updated: Omit<Requisito, 'id'>) {
    setRequisitos((prev) => prev.map((r) => (r.id === id ? { id, ...updated } : r)));
  }
  async function handleDeleteRequisito(id: string) {
    setRequisitos((prev) => prev.filter((r) => r.id !== id));
    setCargos((prev) => prev.map((c) => ({ ...c, requisitoIds: c.requisitoIds.filter((rid) => rid !== id) })));
    try {
      await supabase.from('asignacion_requisitos_cargos').delete().eq('requisito_id', id);
      await supabase.from('requisitos_maestro').delete().eq('id', id);
      console.log(`[DELETE CASCADE] Requisito ${id} eliminado de asignaciones y requisitos_maestro.`);
    } catch (err) {
      console.error('Error al borrar requisito en cascada:', err);
    }
    window.dispatchEvent(new CustomEvent('profileDataChanged'));
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

  if (!isAuthenticated) {
    return (
      <div className="app-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#0f172a', color: '#f8fafc', padding: '24px' }}>
        <div style={{ textAlign: 'center', maxWidth: '440px', background: 'rgba(30, 41, 59, 0.8)', padding: '32px 24px', borderRadius: '16px', border: '1px solid rgba(255, 255, 255, 0.1)', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
          <div style={{ width: '56px', height: '56px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px auto', color: '#ef4444' }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px', color: '#ffffff' }}>Acceso Restringido</h2>
          <p style={{ fontSize: '13.5px', color: '#94a3b8', margin: 0, lineHeight: 1.6 }}>
            Inicie sesión en la plataforma principal de Desarrollo Organizacional para acceder a los Resultados Clave, KPIs y Requisitos.
          </p>
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
                onDeleteResultado={handleDeleteResultado}
                onDeleteKpi={handleDeleteKpi}
              />
            ) : (
              <ResultadosClaveView
                resultados={resultados}
                onAdd={handleAddResultado}
                onUpdate={handleUpdateResultado}
                onDelete={handleDeleteResultado}
                onDeleteKpi={handleDeleteKpi}
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
            onUpdate={handleUpdateAccionLogro}
            onDelete={handleDeleteAccionLogro}
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
