import { useEffect, useMemo, useState } from 'react';
import type { Cargo, Requisito } from '../types';
import CargoListSidebar from './CargoListSidebar';
import { CATEGORIAS_REQUISITO } from '../data/seed';

interface Props {
  requisitos: Requisito[];
  cargos: Cargo[];
  onAdd: (r: Omit<Requisito, 'id'>) => void;
  onUpdate: (id: string, r: Omit<Requisito, 'id'>) => void;
  onDelete: (id: string) => void;
  onToggleAssignment: (cargoId: string, requisitoId: string) => void;
}

const emptyForm: Omit<Requisito, 'id'> = { categoria: CATEGORIAS_REQUISITO[0], descripcion: '' };

export default function RequisitosView({ requisitos, cargos, onAdd, onUpdate, onDelete, onToggleAssignment }: Props) {
  const [cargoId, setCargoId] = useState<string | null>(null);
  const [subtab, setSubtab] = useState<'asignar' | 'catalogo'>('asignar');
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('TODAS');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Requisito, 'id'>>(emptyForm);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!cargoId && cargos.length > 0) {
      setCargoId(cargos[0].id);
    }
  }, [cargos, cargoId]);

  const cargo = useMemo(() => cargos.find((c) => c.id === cargoId) ?? (cargos[0] || null), [cargos, cargoId]);

  const filteredRequisitos = useMemo(() => {
    const list = requisitos.filter((r) => {
      const matchCat = filterCategoria === 'TODAS' || r.categoria === filterCategoria;
      const q = search.trim().toLowerCase();
      const matchSearch = q === '' || r.descripcion.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });

    if (!cargo || subtab !== 'asignar') {
      return [...list].sort((a, b) => a.descripcion.localeCompare(b.descripcion, 'es', { sensitivity: 'base' }));
    }

    return [...list].sort((a, b) => {
      const aAssigned = cargo.requisitoIds.includes(a.id) ? 1 : 0;
      const bAssigned = cargo.requisitoIds.includes(b.id) ? 1 : 0;
      if (aAssigned !== bAssigned) {
        return bAssigned - aAssigned;
      }
      return a.descripcion.localeCompare(b.descripcion, 'es', { sensitivity: 'base' });
    });
  }, [requisitos, filterCategoria, search, cargo, subtab]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  function startAdd() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  }
  function startEdit(r: Requisito) {
    setEditingId(r.id);
    setForm({ categoria: r.categoria, descripcion: r.descripcion });
    setShowForm(true);
  }
  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.descripcion.trim()) return;
    if (editingId) {
      onUpdate(editingId, form);
      flash('Requisito actualizado');
    } else {
      onAdd(form);
      flash('Requisito agregado');
    }
    closeForm();
  }

  function handleDelete(r: Requisito) {
    if (confirm(`¿Eliminar el requisito "${r.descripcion}"? Se quitará de los cargos asignados.`)) {
      onDelete(r.id);
      flash('Requisito eliminado');
    }
  }

  return (
    <div className="view-2col-container">
      <div className="view-header-simple view-header-row">
        <div>
          <h1>Requisitos del Cargo</h1>
          <p>Selecciona un cargo de la lista para asignar sus requisitos profesionales, o gestiona el catálogo maestro.</p>
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
              Catálogo Maestro ({requisitos.length})
            </button>
          </div>
          <button className="btn-primary" onClick={startAdd}>+ Nuevo requisito</button>
        </div>
      </div>

      {subtab === 'asignar' ? (
        <div className="layout-2col">
          {/* Panel Izquierdo: Lista de Cargos */}
          <CargoListSidebar
            cargos={cargos}
            selectedCargoId={cargoId || (cargos[0]?.id ?? null)}
            onSelectCargo={(id) => setCargoId(id)}
            countType="requisitos"
          />

          {/* Panel Derecho: Asignación */}
          <div className="panel-derecho-asignacion">
            {cargo ? (
              <div className="asignar-items-panel">
                <div className="asignar-items-head">
                  <div>
                    <div className="detail-panel-nivel">{cargo.clasificacion || 'Sin clasificar'}</div>
                    <h2>{cargo.nombre}</h2>
                  </div>
                  <div className="asignar-progress">
                    {cargo.requisitoIds.length} de {requisitos.length} requisitos asignados
                  </div>
                </div>

                <div className="search-catalog-box">
                  <input
                    type="text"
                    placeholder="Buscar requisito en el catálogo..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="search-catalog-input"
                  />
                </div>

                <div className="asignar-item-list">
                  {filteredRequisitos.length === 0 && (
                    <div className="empty-hint">No hay requisitos para mostrar.</div>
                  )}
                  {filteredRequisitos.map((r) => {
                    const checked = cargo.requisitoIds.includes(r.id);
                    return (
                      <label key={r.id} className={`asignar-item-row ${checked ? 'checked' : ''}`}>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => {
                            onToggleAssignment(cargo.id, r.id);
                            flash('Guardado');
                          }}
                        />
                        <div>
                          <div className="asignar-item-accion">{r.descripcion}</div>
                          <div className="asignar-item-meta">
                            <span><strong>Categoría:</strong> {r.categoria}</span>
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="empty-hint">Selecciona un cargo de la lista para gestionar sus requisitos.</div>
            )}
          </div>
        </div>
      ) : (
        /* Catálogo Maestro Tab */
        <div className="catalogo-master-container">
          <div className="toolbar" style={{ marginBottom: '16px' }}>
            <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)}>
              <option value="TODAS">Todas las categorías ({requisitos.length})</option>
              {CATEGORIAS_REQUISITO.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Filtrar catálogo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="item-table requisitos-table">
            <div className="item-table-head">
              <span>Categoría</span>
              <span>Descripción</span>
              <span style={{ textAlign: 'right' }}>Acciones</span>
            </div>
            {filteredRequisitos.length === 0 && (
              <div className="empty-hint">No se encontraron requisitos en el catálogo.</div>
            )}
            {filteredRequisitos.map((r) => (
              <div className="item-table-row requisitos-row" key={r.id}>
                <span>
                  <span className="nivel-pill" style={{ background: '#eef1f4', color: '#374151' }}>
                    {r.categoria}
                  </span>
                </span>
                <span>{r.descripcion}</span>
                <span className="row-actions" style={{ textAlign: 'right' }}>
                  <button className="btn-table-action" onClick={() => startEdit(r)}>Editar</button>
                  <button className="btn-table-action danger" onClick={() => handleDelete(r)}>Eliminar</button>
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
              <h2>{editingId ? 'Editar Requisito' : 'Nuevo Requisito'}</h2>
              <button className="icon-btn" onClick={closeForm}>✕</button>
            </div>
            <form className="form" onSubmit={submit}>
              <label>
                Categoría
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {CATEGORIAS_REQUISITO.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Descripción del Requisito
                <textarea
                  required
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Ej: Título profesional en Ingeniería Comercial, Civil o área afín."
                />
              </label>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancelar</button>
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
