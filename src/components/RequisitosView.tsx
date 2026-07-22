import { useMemo, useState } from 'react';
import type { Cargo, Requisito } from '../types';
import { NIVELES, CATEGORIAS_REQUISITO } from '../data/seed';

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
  const [tab, setTab] = useState<'catalogo' | 'asignar'>('catalogo');

  return (
    <div className="view">
      <header className="view-header">
        <h1>Requisitos del Cargo</h1>
        <p>Crea los requisitos (educación, experiencia, conocimientos, etc.) y asígnalos a cada cargo.</p>
      </header>

      <div className="subtabs">
        <button className={`subtab ${tab === 'catalogo' ? 'active' : ''}`} onClick={() => setTab('catalogo')}>
          Catálogo
        </button>
        <button className={`subtab ${tab === 'asignar' ? 'active' : ''}`} onClick={() => setTab('asignar')}>
          Asignar a cargos
        </button>
      </div>

      {tab === 'catalogo' ? (
        <CatalogoRequisitos requisitos={requisitos} onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete} />
      ) : (
        <AsignarRequisitos requisitos={requisitos} cargos={cargos} onToggleAssignment={onToggleAssignment} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------
function CatalogoRequisitos({
  requisitos,
  onAdd,
  onUpdate,
  onDelete,
}: Pick<Props, 'requisitos' | 'onAdd' | 'onUpdate' | 'onDelete'>) {
  const [search, setSearch] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('TODAS');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Requisito, 'id'>>(emptyForm);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return requisitos.filter((r) => {
      const matchCat = filterCategoria === 'TODAS' || r.categoria === filterCategoria;
      const q = search.trim().toLowerCase();
      const matchSearch = q === '' || r.descripcion.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [requisitos, filterCategoria, search]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
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
    if (confirm(`¿Eliminar el requisito "${r.descripcion}"? También se quitará de los cargos que lo tengan asignado.`)) {
      onDelete(r.id);
      flash('Requisito eliminado');
    }
  }

  return (
    <>
      <div className="toolbar">
        <select value={filterCategoria} onChange={(e) => setFilterCategoria(e.target.value)}>
          <option value="TODAS">Todas las categorías</option>
          {CATEGORIAS_REQUISITO.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar requisito..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary" onClick={startAdd}>+ Nuevo requisito</button>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="item-table requisitos-table">
        <div className="item-table-head">
          <span>Categoría</span>
          <span>Descripción</span>
          <span></span>
        </div>
        {filtered.length === 0 && <div className="empty-hint" style={{ padding: 24 }}>No hay resultados.</div>}
        {filtered.map((r) => (
          <div className="item-table-row requisitos-row" key={r.id}>
            <span>
              <span className="nivel-pill" style={{ background: '#eef1f4', color: '#374151' }}>
                {r.categoria}
              </span>
            </span>
            <span>{r.descripcion}</span>
            <span className="row-actions">
              <button className="icon-btn" onClick={() => startEdit(r)} title="Editar">✏️</button>
              <button className="icon-btn" onClick={() => handleDelete(r)} title="Eliminar">🗑️</button>
            </span>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="detail-overlay" onClick={closeForm}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-head">
              <h2>{editingId ? 'Editar requisito' : 'Nuevo requisito'}</h2>
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
                Descripción
                <textarea
                  required
                  rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
                  placeholder="Ej: Título profesional en Ingeniería Comercial o afín"
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
    </>
  );
}

// ---------------------------------------------------------------------
function AsignarRequisitos({
  requisitos,
  cargos,
  onToggleAssignment,
}: Pick<Props, 'requisitos' | 'cargos' | 'onToggleAssignment'>) {
  const [selectedCargoId, setSelectedCargoId] = useState<string | null>(cargos[0]?.id ?? null);
  const [toast, setToast] = useState<string | null>(null);

  const selectedCargo = useMemo(
    () => cargos.find((c) => c.id === selectedCargoId) ?? null,
    [cargos, selectedCargoId]
  );

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 1400);
  }

  function toggle(requisitoId: string) {
    if (!selectedCargo) return;
    onToggleAssignment(selectedCargo.id, requisitoId);
    flash('Guardado');
  }

  return (
    <div className="asignar-layout">
      <div className="asignar-cargos-list">
        {NIVELES.map((nivel) => {
          const cargosNivel = cargos.filter((c) => c.nivel === nivel.key);
          if (cargosNivel.length === 0) return null;
          return (
            <div key={nivel.key} className="asignar-nivel-group">
              <div className="asignar-nivel-label" style={{ color: nivel.color }}>{nivel.label}</div>
              {cargosNivel.map((c) => (
                <button
                  key={c.id}
                  className={`asignar-cargo-item ${selectedCargoId === c.id ? 'active' : ''}`}
                  onClick={() => setSelectedCargoId(c.id)}
                >
                  <span>{c.nombre}</span>
                  <span className="cargo-chip-badge">{c.requisitoIds.length}</span>
                </button>
              ))}
            </div>
          );
        })}
      </div>

      <div className="asignar-items-panel">
        {!selectedCargo ? (
          <div className="empty-state"><p>Selecciona un cargo para comenzar.</p></div>
        ) : requisitos.length === 0 ? (
          <div className="empty-state">
            <p>Todavía no hay requisitos creados.</p>
            <p className="muted">Ve a la pestaña <strong>Catálogo</strong> para agregar el primero.</p>
          </div>
        ) : (
          <>
            <div className="asignar-items-head">
              <h2>{selectedCargo.nombre}</h2>
              <div className="asignar-progress">
                {selectedCargo.requisitoIds.length} de {requisitos.length} asignados
              </div>
            </div>
            <div className="asignar-item-list">
              {requisitos.map((r) => {
                const checked = selectedCargo.requisitoIds.includes(r.id);
                return (
                  <label key={r.id} className={`asignar-item-row ${checked ? 'checked' : ''}`}>
                    <input type="checkbox" checked={checked} onChange={() => toggle(r.id)} />
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
          </>
        )}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
