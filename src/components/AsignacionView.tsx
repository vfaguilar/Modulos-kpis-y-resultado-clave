import { useEffect, useMemo, useState } from 'react';
import type { Cargo, ResultadoClave } from '../types';
import CargoPicker from './CargoPicker';
import { normalizeClasificacion } from '../utils';

interface Props {
  cargos: Cargo[];
  resultados: ResultadoClave[];
  onToggleResultado: (cargoId: string, resultadoId: string) => void;
  onToggleKpi: (cargoId: string, kpiId: string) => void;
}

export default function AsignacionView({ cargos, resultados, onToggleResultado, onToggleKpi }: Props) {
  const [cargoId, setCargoId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  // Auto-selección por defecto del primer cargo disponible
  useEffect(() => {
    if (!cargoId && cargos.length > 0) {
      setCargoId(cargos[0].id);
    }
  }, [cargos, cargoId]);

  const cargo = useMemo(() => cargos.find((c) => c.id === cargoId) ?? (cargos[0] || null), [cargos, cargoId]);

  // Se muestran primero los resultados clave de la clasificación del cargo; si es nula o vacía, se muestran todos los resultados disponibles.
  const resultadosDisponibles = useMemo(() => {
    if (!cargo) return resultados;
    const clasifCargo = normalizeClasificacion(cargo.clasificacion);
    const filtered = resultados.filter(
      (r) =>
        normalizeClasificacion(r.clasificacion) === clasifCargo ||
        cargo.resultadoClaveIds.includes(r.id)
    );
    return filtered.length > 0 ? filtered : resultados;
  }, [resultados, cargo]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  return (
    <div className="view">
      <header className="view-header">
        <h1>Asignación de Resultados Clave y KPIs</h1>
        <p>Selecciona un cargo para vincular o desvincular Resultados Clave e Indicadores KPI en tiempo real.</p>
      </header>

      <CargoPicker cargos={cargos} selectedCargoId={cargoId || (cargos[0]?.id ?? null)} onSelectCargo={setCargoId} />

      {cargo && (
        <div className="asignar-items-panel" style={{ marginTop: 20 }}>
          <div className="asignar-items-head">
            <div>
              <div className="detail-panel-nivel">{cargo.clasificacion || 'Sin clasificar'}</div>
              <h2>{cargo.nombre}</h2>
            </div>
            <div className="asignar-progress">
              {cargo.resultadoClaveIds.length} resultados · {cargo.kpiIds.length} KPIs asignados
            </div>
          </div>

          {resultadosDisponibles.length === 0 && (
            <div className="empty-hint" style={{ padding: 24 }}>
              No hay resultados clave creados aún en el catálogo. Créalos en la pestaña Catálogo Maestro.
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
                        flash('Guardado en Supabase');
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
                                flash('Guardado en Supabase');
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
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
