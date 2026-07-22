import { useMemo, useState } from 'react';
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

  const cargo = useMemo(() => cargos.find((c) => c.id === cargoId) ?? null, [cargos, cargoId]);

  // Solo se listan los resultados clave que pertenecen a la clasificación del
  // cargo seleccionado. Los que ya estaban asignados se siguen mostrando
  // aunque su clasificación no calce, para no ocultar asignaciones previas.
  const resultadosDisponibles = useMemo(() => {
    if (!cargo) return [];
    const clasifCargo = normalizeClasificacion(cargo.clasificacion);
    return resultados.filter(
      (r) =>
        normalizeClasificacion(r.clasificacion) === clasifCargo ||
        cargo.resultadoClaveIds.includes(r.id)
    );
  }, [resultados, cargo]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1200);
  }

  return (
    <div className="view">
      <header className="view-header">
        <h1>Asignación</h1>
        <p>Elige nivel, clasificación y cargo. Luego marca los resultados clave que le correspondan; al asignar uno, se despliegan sus KPIs para elegir cuáles aplican a ese cargo.</p>
      </header>

      <CargoPicker cargos={cargos} selectedCargoId={cargoId} onSelectCargo={setCargoId} />

      {cargo && (
        <div className="asignar-items-panel" style={{ marginTop: 20 }}>
          <div className="asignar-items-head">
            <div>
              <div className="detail-panel-nivel">{cargo.clasificacion}</div>
              <h2>{cargo.nombre}</h2>
            </div>
            <div className="asignar-progress">
              {cargo.resultadoClaveIds.length} resultados · {cargo.kpiIds.length} KPIs asignados
            </div>
          </div>

          {resultadosDisponibles.length === 0 && (
            <div className="empty-hint" style={{ padding: 24 }}>
              No hay resultados clave para la clasificación "{cargo.clasificacion}". Créalos o edítalos en el módulo Resultados Clave.
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
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
