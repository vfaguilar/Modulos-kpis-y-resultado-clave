import { useEffect, useMemo, useState } from 'react';
import type { Cargo, ResultadoClave } from '../types';
import CargoListSidebar from './CargoListSidebar';
import { CLASIFICACIONES } from '../data/seed';

interface Props {
  cargos: Cargo[];
  resultados: ResultadoClave[];
  onToggleResultado: (cargoId: string, resultadoId: string) => void;
  onToggleKpi: (cargoId: string, kpiId: string) => void;
  onDeleteResultado?: (id: string) => void;
  onDeleteKpi?: (kpiId: string) => void;
}

export default function AsignacionView({ cargos, resultados, onToggleResultado, onToggleKpi, onDeleteResultado, onDeleteKpi }: Props) {
  const [cargoId, setCargoId] = useState<string | null>(null);
  const [searchCat, setSearchCat] = useState('');
  const [filterClasif, setFilterClasif] = useState('TODAS');
  const [isAuditMode, setIsAuditMode] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!cargoId && cargos.length > 0) {
      setCargoId(cargos[0].id);
    }
  }, [cargos, cargoId]);

  const cargo = useMemo(() => cargos.find((c) => c.id === cargoId) ?? (cargos[0] || null), [cargos, cargoId]);

  // Lista estable: NO se ocultan elementos al marcar/desmarcar checkboxes
  // Lista con ordenamiento dinámico: Ítems asignados ('checked') al INICIO de la lista
  const resultadosDisponibles = useMemo(() => {
    const list = resultados.filter((r) => {
      const matchClasif = filterClasif === 'TODAS' || (r.clasificacion || 'Sin clasificar') === filterClasif;
      const q = searchCat.trim().toLowerCase();
      const matchSearch = !q || r.texto.toLowerCase().includes(q) || r.kpis.some((k) => k.texto.toLowerCase().includes(q));
      return matchClasif && matchSearch;
    });

    if (!cargo) {
      return [...list].sort((a, b) => a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' }));
    }

    return [...list].sort((a, b) => {
      const aAssigned = (cargo.resultadoClaveIds.includes(a.id) || (a.kpis || []).some((k) => cargo.kpiIds.includes(k.id))) ? 1 : 0;
      const bAssigned = (cargo.resultadoClaveIds.includes(b.id) || (b.kpis || []).some((k) => cargo.kpiIds.includes(k.id))) ? 1 : 0;
      if (aAssigned !== bAssigned) {
        return bAssigned - aAssigned;
      }
      return a.texto.localeCompare(b.texto, 'es', { sensitivity: 'base' });
    });
  }, [resultados, filterClasif, searchCat, cargo]);

  const clasificacionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    (resultados || []).forEach((r) => {
      if (r.clasificacion) set.add(r.clasificacion);
    });
    return Array.from(set).sort();
  }, [resultados]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  return (
    <div className="view-2col-container">
      <div className="view-header-simple" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>Resultados Clave e Indicadores KPI</h1>
          <p>Selecciona un cargo de la lista izquierda para asignar Resultados Clave y medir sus métricas de desempeño.</p>
        </div>
        <button
          type="button"
          onClick={() => setIsAuditMode(!isAuditMode)}
          style={{
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid',
            borderColor: isAuditMode ? '#ef4444' : '#cbd5e1',
            background: isAuditMode ? '#fef2f2' : '#ffffff',
            color: isAuditMode ? '#dc2626' : '#475569',
            fontWeight: 600,
            fontSize: '13px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
            transition: 'all 0.2s ease'
          }}
        >
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Modo Auditoría
          </span>
          <span style={{
            fontSize: '10px',
            padding: '2px 8px',
            borderRadius: '9999px',
            background: isAuditMode ? '#ef4444' : '#e2e8f0',
            color: isAuditMode ? '#ffffff' : '#64748b',
            fontWeight: 700
          }}>
            {isAuditMode ? 'ACTIVADO' : 'DESACTIVADO'}
          </span>
        </button>
      </div>

      <div className="layout-2col">
        {/* Panel Izquierdo: Lista de Cargos */}
        <CargoListSidebar
          cargos={cargos}
          selectedCargoId={cargoId || (cargos[0]?.id ?? null)}
          onSelectCargo={(id) => setCargoId(id)}
          countType="kpi"
        />

        {/* Panel Derecho: Área de Asignación */}
        <div className="panel-derecho-asignacion">
          {cargo ? (
            <div className="asignar-items-panel">
              <div className="asignar-items-head">
                <div>
                  <div className="detail-panel-nivel">{cargo.clasificacion || 'Sin clasificar'}</div>
                  <h2>{cargo.nombre}</h2>
                </div>
                <div className="asignar-progress">
                  {cargo.resultadoClaveIds.length} resultados · {cargo.kpiIds.length} KPIs asignados
                </div>
              </div>

              <div className="search-catalog-box" style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                <select
                  value={filterClasif}
                  onChange={(e) => setFilterClasif(e.target.value)}
                  style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', background: '#fff' }}
                >
                  <option value="TODAS">Todas las clasificaciones</option>
                  {clasificacionesDisponibles.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Buscar en el catálogo de resultados y KPIs..."
                  value={searchCat}
                  onChange={(e) => setSearchCat(e.target.value)}
                  className="search-catalog-input"
                  style={{ flex: 1 }}
                />
              </div>

              {resultadosDisponibles.length === 0 && (
                <div className="empty-hint">
                  No se encontraron resultados clave en el catálogo.
                </div>
              )}

              <div className="rc-assign-list">
                {resultadosDisponibles.map((r) => {
                  const checked = cargo.resultadoClaveIds.includes(r.id);
                  const sortedKpis = [...(r.kpis || [])].sort((a, b) => {
                    const aKpiChecked = cargo.kpiIds.includes(a.id) ? 1 : 0;
                    const bKpiChecked = cargo.kpiIds.includes(b.id) ? 1 : 0;
                    return bKpiChecked - aKpiChecked;
                  });

                  return (
                    <div className={`rc-assign-item ${checked ? 'checked' : ''}`} key={r.id}>
                      <label className="asignar-item-row" style={{ border: 'none', padding: '10px 4px', cursor: 'pointer', display: 'flex', alignItems: 'center', width: '100%' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            onToggleResultado(cargo.id, r.id);
                            flash('Guardado');
                          }}
                        />
                        <div className="asignar-item-accion" style={{ flex: 1 }}>
                          <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{r.clasificacion || 'Sin clasificar'}</span>
                          {r.texto}
                        </div>
                        {isAuditMode && onDeleteResultado && (
                          <button
                            type="button"
                            title="Eliminar Resultado Clave en cascada de la BBDD"
                            style={{
                              background: 'none',
                              border: 'none',
                              cursor: 'pointer',
                              padding: '4px',
                              marginLeft: '8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (confirm(`¿Eliminar en cascada el Resultado Clave "${r.texto}" y sus KPIs asociados de la BBDD?`)) {
                                onDeleteResultado(r.id);
                                flash('Resultado Clave eliminado en cascada');
                              }
                            }}
                          >
                            <svg style={{ width: '16px', height: '16px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')} onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}>
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        )}
                      </label>

                      {checked && sortedKpis.length > 0 && (
                        <div className="rc-kpi-assign-list">
                          {sortedKpis.map((k) => {
                            const kpiChecked = cargo.kpiIds.includes(k.id);
                            return (
                              <label key={k.id} className={`kpi-assign-row ${kpiChecked ? 'checked' : ''}`} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                                  <input
                                    type="checkbox"
                                    checked={kpiChecked}
                                    onChange={() => {
                                      onToggleKpi(cargo.id, k.id);
                                      flash('Guardado');
                                    }}
                                  />
                                  <span>{k.texto}</span>
                                </div>
                                {isAuditMode && onDeleteKpi && (
                                  <button
                                    type="button"
                                    title="Eliminar KPI en cascada de la BBDD"
                                    style={{
                                      background: 'none',
                                      border: 'none',
                                      cursor: 'pointer',
                                      padding: '4px',
                                      marginLeft: '8px',
                                      borderRadius: '4px',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center'
                                    }}
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (confirm(`¿Eliminar en cascada el indicador KPI "${k.texto}" (ID: ${k.id}) de la BBDD?`)) {
                                        onDeleteKpi(k.id);
                                        flash('KPI eliminado en cascada');
                                      }
                                    }}
                                  >
                                    <svg style={{ width: '16px', height: '16px', color: '#94a3b8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24" onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')} onMouseLeave={(e) => (e.currentTarget.style.color = '#94a3b8')}>
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-hint">Selecciona un cargo de la lista para gestionar sus asignaciones.</div>
          )}
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
