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

  // Agrupa los resultados filtrados por clasificación, en el orden del catálogo.
  const grupos = useMemo(() => {
    const map = new Map<string, ResultadoClave[]>();
    for (const r of filtered) {
      const key = r.clasificacion || 'Sin clasificar';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    const orden = [...CLASIFICACIONES, 'Sin clasificar'];
    return Array.from(map.entries()).sort(
      (a, b) => orden.indexOf(a[0]) - orden.indexOf(b[0])
    );
  }, [filtered]);

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
    if (confirm(`¿Eliminar el resultado clave "${r.texto}"? También se quitará de los cargos que lo tengan asignado.`)) {
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

  return (
    <div className="view">
      <header className="view-header view-header-row">
        <div>
          <h1>Resultados Clave</h1>
          <p>Crea, edita o elimina los resultados clave y los KPIs asociados a cada uno. Luego podrás asignarlos a los cargos en el módulo Asignación.</p>
        </div>
      </header>

      <div className="toolbar">
        <select value={filterClasificacion} onChange={(e) => setFilterClasificacion(e.target.value)}>
          <option value="TODAS">Todas las clasificaciones</option>
          {CLASIFICACIONES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Buscar resultado clave o KPI..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <button className="btn-primary" onClick={startAdd}>+ Nuevo resultado clave</button>
      </div>

      {toast && <div className="toast">{toast}</div>}

      <div className="rc-list">
        {filtered.length === 0 && <div className="empty-hint" style={{ padding: 24 }}>No hay resultados.</div>}
        {grupos.map(([clasif, items]) => (
          <div key={clasif} className="rc-group">
            <div className="rc-group-label">{clasif} <span className="cargo-chip-badge">{items.length}</span></div>
            {items.map((r) => (
              <div className="rc-card" key={r.id}>
                <div className="rc-card-head">
                  <h3>{r.texto}</h3>
                  <div className="row-actions">
                    <button className="icon-btn" onClick={() => startEdit(r)} title="Editar">✏️</button>
                    <button className="icon-btn" onClick={() => handleDelete(r)} title="Eliminar">🗑️</button>
                  </div>
                </div>
                {r.kpis.length === 0 ? (
                  <div className="empty-hint">Sin KPIs asociados.</div>
                ) : (
                  <ul className="rc-kpi-list">
                    {r.kpis.map((k) => (
                      <li key={k.id}>{k.texto}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {showForm && (
        <div className="detail-overlay" onClick={closeForm}>
          <div className="detail-panel" onClick={(e) => e.stopPropagation()}>
            <div className="detail-panel-head">
              <h2>{editingId ? 'Editar resultado clave' : 'Nuevo resultado clave'}</h2>
              <button className="icon-btn" onClick={closeForm}>✕</button>
            </div>
            <form className="form" onSubmit={submit}>
              <label>
                Resultado clave
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
                <span className="kpi-fields-label">KPIs</span>
                {kpis.map((k, idx) => (
                  <div className="kpi-field-row" key={idx}>
                    <input
                      type="text"
                      value={k}
                      placeholder={`KPI ${idx + 1}`}
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
