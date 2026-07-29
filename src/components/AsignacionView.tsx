import { useEffect, useMemo, useState } from 'react';
import type { Cargo, ResultadoClave } from '../types';
import CargoListSidebar from './CargoListSidebar';
import { normalizeClasificacion } from '../utils';

interface Props {
  cargos: Cargo[];
  resultados: ResultadoClave[];
  onToggleResultado: (cargoId: string, resultadoId: string) => void;
  onToggleKpi: (cargoId: string, kpiId: string) => void;
}

export default function AsignacionView({ cargos, resultados, onToggleResultado, onToggleKpi }: Props) {
  const [cargoId, setCargoId] = useState<string | null>(null);
  const [searchCat, setSearchCat] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!cargoId && cargos.length > 0) {
      setCargoId(cargos[0].id);
    }
  }, [cargos, cargoId]);

  const cargo = useMemo(() => cargos.find((c) => c.id === cargoId) ?? (cargos[0] || null), [cargos, cargoId]);

  const resultadosDisponibles = useMemo(() => {
    if (!cargo) return resultados;
    const clasifCargo = normalizeClasificacion(cargo.clasificacion);
    const filtered = resultados.filter(
      (r) =>
        normalizeClasificacion(r.clasificacion) === clasifCargo ||
        cargo.resultadoClaveIds.includes(r.id)
    );
    const list = filtered.length > 0 ? filtered : resultados;
    const q = searchCat.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => r.texto.toLowerCase().includes(q) || r.kpis.some((k) => k.texto.toLowerCase().includes(q)));
  }, [resultados, cargo, searchCat]);

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

              <div className="search-catalog-box">
                <input
                  type="text"
                  placeholder="Buscar en el catálogo de resultados y KPIs..."
                  value={searchCat}
                  onChange={(e) => setSearchCat(e.target.value)}
                  className="search-catalog-input"
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
                  return (
                    <div className={`rc-assign-item ${checked ? 'checked' : ''}`} key={r.id}>
                      <label className="asignar-item-row" style={{ border: 'none', padding: '10px 4px' }}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            onToggleResultado(cargo.id, r.id);
                            flash('Guardado');
                          }}
                        />
                        <div className="asignar-item-accion">{r.texto}</div>
                      </label>

                      {checked && r.kpis.length > 0 && (
                        <div className="rc-kpi-assign-list">
                          {r.kpis.map((k) => {
                            const kpiChecked = cargo.kpiIds.includes(k.id);
                            return (
                              <label key={k.id} className={`kpi-assign-row ${kpiChecked ? 'checked' : ''}`}>
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
