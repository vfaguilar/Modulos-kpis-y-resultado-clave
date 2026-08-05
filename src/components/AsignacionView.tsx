import { useEffect, useMemo, useState } from 'react';
import type { Cargo, ResultadoClave } from '../types';
import CargoListSidebar from './CargoListSidebar';
import { CLASIFICACIONES } from '../data/seed';

interface Props {
  cargos: Cargo[];
  resultados: ResultadoClave[];
  onToggleResultado: (cargoId: string, resultadoId: string) => void;
  onToggleKpi: (cargoId: string, kpiId: string) => void;
}

export default function AsignacionView({ cargos, resultados, onToggleResultado, onToggleKpi }: Props) {
  const [cargoId, setCargoId] = useState<string | null>(null);
  const [searchCat, setSearchCat] = useState('');
  const [filterClasif, setFilterClasif] = useState('TODAS');
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

    if (!cargo) return list;

    return [...list].sort((a, b) => {
      const aAssigned = cargo.resultadoClaveIds.includes(a.id) ? 1 : 0;
      const bAssigned = cargo.resultadoClaveIds.includes(b.id) ? 1 : 0;
      return bAssigned - aAssigned;
    });
  }, [resultados, filterClasif, searchCat, cargo]);

  const clasificacionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    (resultados || []).forEach((r) => {
      if (r.clasificacion && r.clasificacion !== 'Sin clasificar') set.add(r.clasificacion);
    });
    (cargos || []).forEach((c) => {
      if (c.clasificacion && c.clasificacion !== 'Sin clasificar') set.add(c.clasificacion);
    });
    CLASIFICACIONES.forEach((c) => set.add(c));
    return Array.from(set).sort();
  }, [resultados, cargos]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  return (
    <div className="view-2col-container">
      <div className="view-header-simple">
        <h1>Resultados Clave e Indicadores KPI</h1>
        <p>Selecciona un cargo de la lista izquierda para asignar Resultados Clave y medir sus métricas de desempeño.</p>
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
                      <label className="asignar-item-row" style={{ border: 'none', padding: '10px 4px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            onToggleResultado(cargo.id, r.id);
                            flash('Guardado');
                          }}
                        />
                        <div className="asignar-item-accion">
                          <span style={{ fontSize: '11px', background: '#e2e8f0', color: '#475569', padding: '2px 6px', borderRadius: '4px', marginRight: '6px' }}>{r.clasificacion || 'Sin clasificar'}</span>
                          {r.texto}
                        </div>
                      </label>

                      {checked && sortedKpis.length > 0 && (
                        <div className="rc-kpi-assign-list">
                          {sortedKpis.map((k) => {
                            const kpiChecked = cargo.kpiIds.includes(k.id);
                            return (
                              <label key={k.id} className={`kpi-assign-row ${kpiChecked ? 'checked' : ''}`} style={{ cursor: 'pointer' }}>
                                <input
                                  type="checkbox"
                                  checked={kpiChecked}
                                  onChange={() => {
                                    onToggleKpi(cargo.id, k.id);
                                    flash('Guardado');
                                  }}
                                />
                                <span>{k.texto}</span>
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
