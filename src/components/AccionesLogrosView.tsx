import { useEffect, useMemo, useState } from 'react';
import type { Cargo, AccionLogro } from '../types';
import CargoListSidebar from './CargoListSidebar';

interface Props {
  cargos: Cargo[];
  accionesLogros: AccionLogro[];
  onToggle: (cargoId: string, accionLogroId: string) => void;
  onAdd: (accion: string, logro: string, clasificacion: string) => void;
  onUpdate?: (id: string, accion: string, logro: string, clasificacion: string) => void;
  onDelete?: (id: string) => void;
}

const getCategoryKey = (rawCat?: string): string => {
  if (!rawCat || !rawCat.trim()) return 'SIN CLASIFICAR';
  return rawCat.trim().toUpperCase();
};

export default function AccionesLogrosView({ cargos, accionesLogros, onToggle, onAdd, onUpdate, onDelete }: Props) {
  const [cargoId, setCargoId] = useState<string | null>(null);
  const [subtab, setSubtab] = useState<'asignar' | 'catalogo'>('asignar');
  const [search, setSearch] = useState('');
  const [filterClasificacion, setFilterClasificacion] = useState<string>('TODAS');
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accion, setAccion] = useState('');
  const [logro, setLogro] = useState('');
  const [newClasificacion, setNewClasificacion] = useState('Sin clasificar');
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!cargoId && cargos.length > 0) {
      setCargoId(cargos[0].id);
    }
  }, [cargos, cargoId]);

  const cargo = useMemo(() => cargos.find((c) => c.id === cargoId) ?? (cargos[0] || null), [cargos, cargoId]);

  // Generación 100% dinámica de categorías basadas en la tabla acciones_logros
  const dynamicCategories = useMemo(() => {
    const map = new Map<string, string>();
    accionesLogros.forEach((al) => {
      const key = getCategoryKey(al.clasificacion);
      if (!map.has(key)) {
        const label = (al.clasificacion && al.clasificacion.trim()) ? al.clasificacion.trim() : 'Sin clasificar';
        map.set(key, label);
      }
    });
    const list = Array.from(map.entries()).map(([key, label]) => ({ key, label }));
    list.sort((a, b) => a.label.localeCompare(b.label, 'es', { sensitivity: 'base' }));
    return list;
  }, [accionesLogros]);

  const alCountsByCat = useMemo(() => {
    const map: Record<string, { assigned: number; total: number }> = {};
    dynamicCategories.forEach((cat) => {
      map[cat.key] = { assigned: 0, total: 0 };
    });

    const cargoAssignedIds = new Set((cargo?.accionLogroIds || []).map(String));

    accionesLogros.forEach((al) => {
      const key = getCategoryKey(al.clasificacion);
      if (!map[key]) {
        map[key] = { assigned: 0, total: 0 };
      }
      map[key].total += 1;
      if (cargoAssignedIds.has(String(al.id))) {
        map[key].assigned += 1;
      }
    });
    return map;
  }, [accionesLogros, cargo, dynamicCategories]);

  const disponibles = useMemo(() => {
    if (!cargo || subtab === 'catalogo') return accionesLogros;
    const clasifCargoKey = getCategoryKey(cargo.clasificacion);
    const cargoAlIds = new Set((cargo.accionLogroIds || []).map(String));

    const filtered = accionesLogros.filter(
      (al) =>
        getCategoryKey(al.clasificacion) === clasifCargoKey ||
        cargoAlIds.has(String(al.id))
    );
    return filtered.length > 0 ? filtered : accionesLogros;
  }, [accionesLogros, cargo, subtab]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = disponibles;

    if (filterClasificacion !== 'TODAS') {
      list = list.filter((al) => getCategoryKey(al.clasificacion) === filterClasificacion);
    }

    if (q !== '') {
      list = list.filter(
        (al) => al.accion.toLowerCase().includes(q) || al.logro.toLowerCase().includes(q)
      );
    }

    if (subtab === 'catalogo' || !cargo) {
      return [...list].sort((a, b) => a.accion.localeCompare(b.accion, 'es', { sensitivity: 'base' }));
    }

    const cargoAlIds = new Set((cargo.accionLogroIds || []).map(String));
    return [...list].sort((a, b) => {
      const aAssigned = cargoAlIds.has(String(a.id)) ? 1 : 0;
      const bAssigned = cargoAlIds.has(String(b.id)) ? 1 : 0;
      if (aAssigned !== bAssigned) {
        return bAssigned - aAssigned;
      }
      return a.accion.localeCompare(b.accion, 'es', { sensitivity: 'base' });
    });
  }, [disponibles, filterClasificacion, search, cargo, subtab]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  function startAdd() {
    setEditingId(null);
    setAccion('');
    setLogro('');
    setNewClasificacion(dynamicCategories[0]?.label || 'Sin clasificar');
    setShowForm(true);
  }

  function startEdit(al: AccionLogro) {
    setEditingId(al.id);
    setAccion(al.accion);
    setLogro(al.logro);
    setNewClasificacion(al.clasificacion || 'Sin clasificar');
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setAccion('');
    setLogro('');
  }

  function submitForm(e: React.FormEvent) {
    e.preventDefault();
    if (!accion.trim()) return;

    if (editingId && onUpdate) {
      onUpdate(editingId, accion.trim(), logro.trim(), newClasificacion);
      flash('Acción y logro actualizados');
    } else {
      onAdd(accion.trim(), logro.trim(), newClasificacion);
      flash('Acción y logro agregados');
    }
    closeForm();
  }

  function handleDelete(al: AccionLogro) {
    if (confirm(`¿Estás seguro de eliminar "${al.accion}" del catálogo maestro y desasociarlo de todos los perfiles?`)) {
      if (onDelete) {
        onDelete(al.id);
        flash('Acción eliminada del catálogo');
      }
    }
  }

  return (
    <div className="view-2col-container">
      <div className="view-header-simple view-header-row">
        <div>
          <h1>Acciones y Logros Esperados</h1>
          <p>Selecciona un cargo de la lista para asignar sus acciones y logros esperados, o gestiona el catálogo maestro.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <div className="subtabs-pills">
            <button
              className={`subtab-pill ${subtab === 'asignar' ? 'active' : ''}`}
              onClick={() => setSubtab('asignar')}
            >
              Asignar por Cargo
            </button>
            <button
              className={`subtab-pill ${subtab === 'catalogo' ? 'active' : ''}`}
              onClick={() => setSubtab('catalogo')}
            >
              Catálogo Maestro ({accionesLogros.length})
            </button>
          </div>
          <button className="btn-primary" onClick={startAdd}>+ Nueva acción y logro</button>
        </div>
      </div>

      {subtab === 'asignar' ? (
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
                  <div className="asignar-progress">
                    {cargo.accionLogroIds.length} de {accionesLogros.length} acciones asignadas
                  </div>
                </div>

                {/* Pills de Clasificación 100% Dinámicas */}
                <div className="subtabs-pills-bar" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', margin: '12px 0' }}>
                  <button
                    type="button"
                    className={`subtab-pill ${filterClasificacion === 'TODAS' ? 'active' : ''}`}
                    onClick={() => setFilterClasificacion('TODAS')}
                  >
                    Todas ({cargo.accionLogroIds.length}/{accionesLogros.length})
                  </button>
                  {dynamicCategories.map((cat) => {
                    const counts = alCountsByCat[cat.key] || { assigned: 0, total: 0 };
                    return (
                      <button
                        key={cat.key}
                        type="button"
                        className={`subtab-pill ${filterClasificacion === cat.key ? 'active' : ''}`}
                        onClick={() => setFilterClasificacion(cat.key)}
                      >
                        {cat.label} ({counts.assigned}/{counts.total})
                      </button>
                    );
                  })}
                </div>

                <div className="search-catalog-box">
                  <input
                    type="text"
                    placeholder="Buscar en el catálogo de acciones y logros..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-catalog-input"
                  />
                </div>

                <div className="asignar-item-list">
                  {disponibles.length === 0 && (
                    <div className="empty-hint">
                      No hay acciones creadas aún. Haz clic en "+ Nueva acción y logro" para agregar.
                    </div>
                  )}
                  {filtered.map((al) => {
                    const checked = (cargo.accionLogroIds || []).map(String).includes(String(al.id));
                    return (
                      <div key={al.id} className={`asignar-item-row ${checked ? 'checked' : ''}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', flex: 1, cursor: 'pointer' }}>
                          <input type="checkbox" checked={checked} onChange={() => { onToggle(cargo.id, al.id); flash('Guardado'); }} style={{ marginTop: '3px' }} />
                          <div>
                            <div className="asignar-item-accion">{al.accion}</div>
                            <div className="asignar-item-meta">
                              <span><strong>Logro esperado:</strong> {al.logro || '—'}</span>
                            </div>
                          </div>
                        </label>
                        {onDelete && (
                          <button
                            type="button"
                            className="icon-btn-delete"
                            title="Eliminar del catálogo maestro"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(al);
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#94a3b8',
                              cursor: 'pointer',
                              padding: '6px 8px',
                              borderRadius: '4px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = '#94a3b8'; }}
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="3 6 5 6 21 6"></polyline>
                              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                            </svg>
                          </button>
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
      ) : (
        /* Catálogo Maestro Tab */
        <div className="catalogo-master-container">
          <div className="subtabs-pills-bar" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            <button
              type="button"
              className={`subtab-pill ${filterClasificacion === 'TODAS' ? 'active' : ''}`}
              onClick={() => setFilterClasificacion('TODAS')}
            >
              Todas ({accionesLogros.length})
            </button>
            {dynamicCategories.map((cat) => {
              const counts = alCountsByCat[cat.key] || { assigned: 0, total: 0 };
              return (
                <button
                  key={cat.key}
                  type="button"
                  className={`subtab-pill ${filterClasificacion === cat.key ? 'active' : ''}`}
                  onClick={() => setFilterClasificacion(cat.key)}
                >
                  {cat.label} ({counts.total})
                </button>
              );
            })}
          </div>

          <div className="toolbar" style={{ marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Filtrar catálogo por acción o logro..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="item-table requisitos-table">
            <div className="item-table-head" style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 140px', gap: '12px', padding: '10px 16px', background: '#f8fafc', fontWeight: 700, fontSize: '12px', color: '#475569' }}>
              <span>Clasificación</span>
              <span>Acción (Qué hace)</span>
              <span>Logro Esperado (Para qué lo hace)</span>
              <span style={{ textAlign: 'right' }}>Acciones</span>
            </div>
            {filtered.length === 0 && (
              <div className="empty-hint">No se encontraron acciones ni logros en el catálogo.</div>
            )}
            {filtered.map((al) => (
              <div className="item-table-row requisitos-row" key={al.id} style={{ display: 'grid', gridTemplateColumns: '160px 1fr 1fr 140px', gap: '12px', padding: '12px 16px', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                <span>
                  <span className="nivel-pill" style={{ background: '#eef1f4', color: '#374151', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600 }}>
                    {al.clasificacion || 'Sin clasificar'}
                  </span>
                </span>
                <span style={{ fontWeight: 600, color: '#1e293b', fontSize: '13px' }}>{al.accion}</span>
                <span style={{ color: '#475569', fontSize: '13px' }}>{al.logro || '—'}</span>
                <span className="row-actions" style={{ textAlign: 'right', display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                  <button className="btn-table-action" onClick={() => startEdit(al)} style={{ padding: '4px 10px', fontSize: '12px', background: '#f1f5f9', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer' }}>Editar</button>
                  <button className="btn-table-action danger" onClick={() => handleDelete(al)} style={{ padding: '4px 10px', fontSize: '12px', background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '6px', cursor: 'pointer' }}>Eliminar</button>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div className="detail-overlay" onClick={closeForm}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-head">
              <h2>{editingId ? 'Editar acción y logro' : 'Nueva acción y logro'}</h2>
              <button className="icon-btn" onClick={closeForm}>✕</button>
            </div>
            <form className="form" onSubmit={submitForm}>
              <label>
                Acción (Qué hace)
                <textarea required rows={2} value={accion} onChange={(e) => setAccion(e.target.value)} placeholder="Ej: Implementar estrategias de retención de talento..." />
              </label>
              <label>
                Logro Esperado (Para qué lo hace)
                <textarea rows={2} value={logro} onChange={(e) => setLogro(e.target.value)} placeholder="Ej: Para reducir la rotación voluntaria en un 15% anual." />
              </label>
              <label>
                Clasificación
                <select value={newClasificacion} onChange={(e) => setNewClasificacion(e.target.value)}>
                  {dynamicCategories.length > 0 ? (
                    dynamicCategories.map((c) => (
                      <option key={c.key} value={c.label}>{c.label}</option>
                    ))
                  ) : (
                    <option value="Sin clasificar">Sin clasificar</option>
                  )}
                </select>
              </label>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancelar</button>
                <button type="submit" className="btn-primary">{editingId ? 'Guardar Cambios' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
