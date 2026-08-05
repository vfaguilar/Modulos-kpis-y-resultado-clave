import { useState, useMemo } from 'react';
import type { Cargo } from '../types';

interface Props {
  cargos: Cargo[];
  selectedCargoId: string | null;
  onSelectCargo: (cargoId: string) => void;
  countType: 'kpi' | 'acciones' | 'requisitos';
}

export default function CargoListSidebar({ cargos, selectedCargoId, onSelectCargo, countType }: Props) {
  const [search, setSearch] = useState('');

  const filteredCargos = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return cargos;
    return cargos.filter(
      (c) =>
        c.nombre.toLowerCase().includes(q) ||
        (c.clasificacion && c.clasificacion.toLowerCase().includes(q)) ||
        (c.nivel && c.nivel.toLowerCase().includes(q))
    );
  }, [cargos, search]);

  const getNivelStyle = (nivel?: string) => {
    const n = (nivel || '').toUpperCase();
    if (n.includes('ESTRATÉGICO') || n.includes('ESTRATEGICO')) {
      return { bg: '#f3e8ff', color: '#7e22ce' };
    }
    if (n.includes('TÁCTICO') || n.includes('TACTICO')) {
      return { bg: '#dbeafe', color: '#1d4ed8' };
    }
    if (n.includes('INTERMEDIO')) {
      return { bg: '#fee2e2', color: '#dc2626' };
    }
    if (n.includes('INICIAL')) {
      return { bg: '#f1f5f9', color: '#475569' };
    }
    return { bg: '#fef3c7', color: '#d97706' };
  };

  const getCountLabel = (cargo: Cargo) => {
    if (countType === 'kpi') {
      const rcCount = cargo.resultadoClaveIds?.length || 0;
      const kpiCount = cargo.kpiIds?.length || 0;
      return `${rcCount} RC · ${kpiCount} KPIs`;
    }
    if (countType === 'acciones') {
      const count = cargo.accionLogroIds?.length || 0;
      return `${count} acc.`;
    }
    const count = cargo.requisitoIds?.length || 0;
    return `${count} req.`;
  };

  return (
    <div className="cargo-list-sidebar">
      <div className="cargo-list-search-box" style={{ position: 'relative' }}>
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
          placeholder="Buscar cargo o área..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cargo-list-search-input"
          style={{ paddingLeft: '32px' }}
        />
      </div>
      <div className="cargo-list-items">
        {filteredCargos.map((cargo) => {
          const isSelected = cargo.id === selectedCargoId;
          const nivelStyle = getNivelStyle(cargo.nivel);
          return (
            <div
              key={cargo.id}
              className={`cargo-list-item ${isSelected ? 'selected' : ''}`}
              onClick={() => onSelectCargo(cargo.id)}
            >
              <div className="cargo-list-item-main">
                <span className="cargo-list-item-title">{cargo.nombre}</span>
                <span className="cargo-list-item-badge" style={{ backgroundColor: nivelStyle.bg, color: nivelStyle.color }}>
                  {cargo.nivel || 'Intermedio'}
                </span>
              </div>
              <span className="cargo-list-item-count">{getCountLabel(cargo)}</span>
            </div>
          );
        })}
        {filteredCargos.length === 0 && (
          <div className="cargo-list-empty">No se encontraron cargos</div>
        )}
      </div>
    </div>
  );
}
