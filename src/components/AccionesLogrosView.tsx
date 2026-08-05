import { useEffect, useMemo, useState } from 'react';
import type { Cargo, AccionLogro } from '../types';
import CargoListSidebar from './CargoListSidebar';
import { CLASIFICACIONES } from '../data/seed';
import { normalizeClasificacion } from '../utils';

interface Props {
  cargos: Cargo[];
  accionesLogros: AccionLogro[];
  onToggle: (cargoId: string, accionLogroId: string) => void;
  onAdd: (accion: string, logro: string, clasificacion: string) => void;
}

export default function AccionesLogrosView({ cargos, accionesLogros, onToggle, onAdd }: Props) {
  const [cargoId, setCargoId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [accion, setAccion] = useState('');
  const [logro, setLogro] = useState('');
  const [newClasificacion, setNewClasificacion] = useState(CLASIFICACIONES[0]);
  const [filterClasificacion, setFilterClasificacion] = useState<string>('TODAS');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!cargoId && cargos.length > 0) {
      setCargoId(cargos[0].id);
    }
  }, [cargos, cargoId]);

  const cargo = useMemo(() => cargos.find((c) => c.id === cargoId) ?? (cargos[0] || null), [cargos, cargoId]);

  const disponibles = useMemo(() => {
    if (!cargo) return accionesLogros;
    const clasifCargo = normalizeClasificacion(cargo.clasificacion);
    const filtered = accionesLogros.filter(
      (al) =>
        normalizeClasificacion(al.clasificacion) === clasifCargo ||
        cargo.accionLogroIds.includes(al.id)
    );
    return filtered.length > 0 ? filtered : accionesLogros;
  }, [accionesLogros, cargo]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = disponibles;

    if (filterClasificacion !== 'TODAS') {
      const normSel = normalizeClasificacion(filterClasificacion);
      list = list.filter((al) => normalizeClasificacion(al.clasificacion) === normSel || al.clasificacion === filterClasificacion);
    }

    if (q !== '') {
      list = list.filter(
        (al) => al.accion.toLowerCase().includes(q) || al.logro.toLowerCase().includes(q)
      );
    }
    return [...list].sort((a, b) => {
      const aAssigned = cargo ? (cargo.accionLogroIds.includes(a.id) ? 1 : 0) : 0;
      const bAssigned = cargo ? (cargo.accionLogroIds.includes(b.id) ? 1 : 0) : 0;
      if (aAssigned !== bAssigned) {
        return bAssigned - aAssigned;
      }
      return a.accion.localeCompare(b.accion, 'es', { sensitivity: 'base' });
    });
  }, [disponibles, filterClasificacion, search, cargo]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  function submitNew(e: React.FormEvent) {
    e.preventDefault();
    if (!accion.trim()) return;
    onAdd(accion.trim(), logro.trim(), newClasificacion);
    setAccion('');
    setLogro('');
    setNewClasificacion(CLASIFICACIONES[0]);
    setShowForm(false);
    flash('Acción y logro agregados');
  }

  return (
    <div className="view-2col-container">
      <div className="view-header-simple view-header-row">
        <div>
          <h1>Acciones y Logros Esperados</h1>
          <p>Selecciona un cargo de la lista izquierda para marcar las acciones y sus logros esperados.</p>
        </div>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Nueva acción y logro</button>
      </div>

      <div className="layout-2col">
        {/* Panel Izquierdo: Lista de Cargos */}
        <CargoListSidebar
          cargos={cargos}
          selectedCargoId={cargoId || (cargos[0]?.id ?? null)}
          onSelectCargo={(id) => setCargoId(id)}
          countType="acciones"
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
                <div className="asignar-progress">{cargo.accionLogroIds.length} acciones asignadas</div>
              </div>

              <div className="search-catalog-box" style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="text"
                  placeholder="Buscar en el catálogo de acciones y logros..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="search-catalog-input"
                  style={{ flex: 1 }}
                />
                <select
                  value={filterClasificacion}
                  onChange={(e) => setFilterClasificacion(e.target.value)}
                  className="search-catalog-input"
                  style={{ width: '220px', cursor: 'pointer' }}
                >
                  <option value="TODAS">Todas las clasificaciones</option>
                  {CLASIFICACIONES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div className="asignar-item-list">
                {disponibles.length === 0 && (
                  <div className="empty-hint">
                    No hay acciones creadas aún. Haz clic en "+ Nueva acción y logro" para agregar.
                  </div>
                )}
                {filtered.map((al) => {
                  const checked = cargo.accionLogroIds.includes(al.id);
                  return (
                    <label key={al.id} className={`asignar-item-row ${checked ? 'checked' : ''}`}>
                      <input type="checkbox" checked={checked} onChange={() => { onToggle(cargo.id, al.id); flash('Guardado'); }} />
                      <div>
                        <div className="asignar-item-accion">{al.accion}</div>
                        <div className="asignar-item-meta">
                          <span><strong>Logro esperado:</strong> {al.logro || '—'}</span>
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-hint">Selecciona un cargo de la lista para gestionar sus asignaciones.</div>
          )}
        </div>
      </div>

      {showForm && (
        <div className="detail-overlay" onClick={() => setShowForm(false)}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-head">
              <h2>Nueva acción y logro</h2>
              <button className="icon-btn" onClick={() => setShowForm(false)}>✕</button>
            </div>
            <form className="form" onSubmit={submitNew}>
              <label>
                Acción (Qué hace)
                <textarea required rows={2} value={accion} onChange={(e) => setAccion(e.target.value)} />
              </label>
              <label>
                Logro Esperado (Para qué lo hace)
                <textarea rows={2} value={logro} onChange={(e) => setLogro(e.target.value)} />
              </label>
              <label>
                Clasificación
                <select value={newClasificacion} onChange={(e) => setNewClasificacion(e.target.value)}>
                  {CLASIFICACIONES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
