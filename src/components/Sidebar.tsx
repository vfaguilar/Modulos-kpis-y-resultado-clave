import type { View } from '../App';

interface Props {
  view: View;
  onChange: (v: View) => void;
  totalCargos: number;
}

const NAV: { key: View; label: string; icon: string; hint: string }[] = [
  { key: 'resultados', label: 'Resultados Clave', icon: '🎯', hint: 'Crear y modificar resultados clave y sus KPIs' },
  { key: 'asignacion', label: 'Asignación', icon: '🔗', hint: 'Asignar resultados clave y KPIs a los cargos' },
  { key: 'acciones', label: 'Acciones y Logros', icon: '✅', hint: 'Asignar acciones y logros a los cargos' },
  { key: 'requisitos', label: 'Requisitos del Cargo', icon: '📋', hint: 'Crear y asignar requisitos' },
  { key: 'importar', label: 'Importar / Exportar', icon: '📁', hint: 'Subir o descargar Excel' },
];

export default function Sidebar({ view, onChange, totalCargos }: Props) {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">

        <div className="sidebar-brand-title strong">Gestión de Resultados claves/KPIs</div>
      </div>

      <div className="sidebar-section-label">Navegación</div>
      <nav className="sidebar-nav">
        {NAV.map((n) => (
          <button
            key={n.key}
            className={`sidebar-nav-item ${view === n.key ? 'active' : ''}`}
            onClick={() => onChange(n.key)}
            title={n.hint}
          >
            <span className="sidebar-nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-stat">
          <span className="sidebar-stat-num">{totalCargos}</span>
          <span>cargos registrados</span>
        </div>
      </div>
    </aside>
  );
}
