import { useMemo, useState } from 'react';
import type { ResultadoClave } from '../types';
import { CLASIFICACIONES } from '../data/seed';

interface Props {
  resultados: ResultadoClave[];
  onAdd: (texto: string, kpis: string[], clasificacion: string) => void;
  onUpdate: (id: string, texto: string, kpis: string[], clasificacion: string) => void;
  onDelete: (id: string) => void;
}

export default function ResultadosClaveView({ resultados, onAdd, onUpdate, onDelete }: Props) {
  const [search, setSearch] = useState('');
  const [filterClasificacion, setFilterClasificacion] = useState('TODAS');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [texto, setTexto] = useState('');
  const [clasificacion, setClasificacion] = useState(CLASIFICACIONES[0]);
  const [kpis, setKpis] = useState<string[]>(['']);
  const [toast, setToast] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return resultados.filter((r) => {
      const matchClasif = filterClasificacion === 'TODAS' || (r.clasificacion || 'Sin clasificar') === filterClasificacion;
      const matchSearch = q === '' || r.texto.toLowerCase().includes(q) || r.kpis.some((k) => k.texto.toLowerCase().includes(q));
      return matchClasif && matchSearch;
    });
  }, [resultados, search, filterClasificacion]);

  function flash(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  }

  function startAdd() {
    setEditingId(null);
    setTexto('');
    setClasificacion(CLASIFICACIONES[0]);
    setKpis(['']);
    setShowForm(true);
  }

  function startEdit(r: ResultadoClave) {
    setEditingId(r.id);
    setTexto(r.texto);
    setClasificacion(r.clasificacion || CLASIFICACIONES[0]);
    setKpis(r.kpis.length > 0 ? r.kpis.map((k) => k.texto) : ['']);
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setTexto('');
    setClasificacion(CLASIFICACIONES[0]);
    setKpis(['']);
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!texto.trim()) return;
    const cleanKpis = kpis.map((k) => k.trim()).filter((k) => k !== '');
    if (editingId) {
      onUpdate(editingId, texto.trim(), cleanKpis, clasificacion);
      flash('Resultado clave actualizado');
    } else {
      onAdd(texto.trim(), cleanKpis, clasificacion);
      flash('Resultado clave agregado');
    }
    closeForm();
  }

  function handleDelete(r: ResultadoClave) {
    if (confirm(`¿Eliminar el resultado clave "${r.texto}"? Se quitará de los cargos asignados.`)) {
      onDelete(r.id);
      flash('Resultado clave eliminado');
    }
  }

  function updateKpiField(idx: number, value: string) {
    setKpis((prev) => prev.map((k, i) => (i === idx ? value : k)));
  }
  function addKpiField() {
    setKpis((prev) => [...prev, '']);
  }
  function removeKpiField(idx: number) {
    setKpis((prev) => prev.filter((_, i) => i !== idx));
  }

  const clasificacionesDisponibles = useMemo(() => {
    const set = new Set<string>();
    (resultados || []).forEach((r) => {
      if (r.clasificacion) set.add(r.clasificacion);
    });
    return Array.from(set).sort();
  }, [resultados]);

  return (
    <div className="view">
      <header className="view-header view-header-row">
        <div>
          <h1>Catálogo Maestro de Resultados Clave y KPIs</h1>
          <p>Gestiona los resultados clave y los indicadores KPI asociados para la organización.</p>
        </div>
        <button className="btn-primary" onClick={startAdd}>+ Nuevo resultado clave</button>
      </header>

      <div className="toolbar" style={{ marginBottom: '16px', display: 'flex', gap: '12px' }}>
        <select value={filterClasificacion} onChange={(e) => setFilterClasificacion(e.target.value)} style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}>
          <option value="TODAS">Todas las clasificaciones ({resultados.length})</option>
          {clasificacionesDisponibles.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <div style={{ position: 'relative', flex: 1 }}>
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            placeholder="Buscar en el catálogo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '100%', padding: '8px 12px 8px 32px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="rc-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {filtered.length === 0 && <div className="empty-hint" style={{ padding: 24 }}>No hay resultados clave que coincidan con la búsqueda.</div>}
        {filtered.map((r) => (
          <div className="rc-card" key={r.id} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
            <div className="rc-card-head" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
              <div>
                <span className="cargo-chip-badge" style={{ fontSize: '11px', background: '#e2e8f0', padding: '2px 8px', borderRadius: '4px', marginRight: '8px', color: '#475569' }}>{r.clasificacion || 'Sin clasificar'}</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: '16px', color: '#1e293b' }}>{r.texto}</h3>
              </div>
              <div className="row-actions" style={{ display: 'flex', gap: '6px' }}>
                <button className="btn-table-action" onClick={() => startEdit(r)}>Editar</button>
                <button className="btn-table-action danger" onClick={() => handleDelete(r)}>Eliminar</button>
              </div>
            </div>
            {r.kpis.length === 0 ? (
              <div className="empty-hint" style={{ fontSize: '12px', color: '#94a3b8' }}>Sin KPIs asociados.</div>
            ) : (
              <ul className="rc-kpi-list" style={{ margin: '8px 0 0 0', paddingLeft: '20px', fontSize: '13px', color: '#334155' }}>
                {r.kpis.map((k) => (
                  <li key={k.id}>{k.texto}</li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="detail-overlay" onClick={closeForm}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-head">
              <h2>{editingId ? 'Editar Resultado Clave' : 'Nuevo Resultado Clave'}</h2>
              <button className="icon-btn" onClick={closeForm}>✕</button>
            </div>
            <form className="form" onSubmit={submit}>
              <label>
                Resultado Clave
                <textarea required rows={2} value={texto} onChange={(e) => setTexto(e.target.value)} />
              </label>

              <label>
                Clasificación
                <select value={clasificacion} onChange={(e) => setClasificacion(e.target.value)}>
                  {CLASIFICACIONES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>

              <div className="kpi-fields">
                <span className="kpi-fields-label">Indicadores KPI Asociados</span>
                {kpis.map((k, idx) => (
                  <div className="kpi-field-row" key={idx}>
                    <input
                      type="text"
                      value={k}
                      placeholder={`Nombre de KPI ${idx + 1}`}
                      onChange={(e) => updateKpiField(idx, e.target.value)}
                    />
                    <button type="button" className="icon-btn" onClick={() => removeKpiField(idx)}>✕</button>
                  </div>
                ))}
                <button type="button" className="btn-secondary" onClick={addKpiField}>+ Agregar KPI</button>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={closeForm}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
