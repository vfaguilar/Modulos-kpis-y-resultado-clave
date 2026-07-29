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
      <div className="cargo-list-search-box">
        <input
          type="text"
          placeholder="Buscar cargo o área..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="cargo-list-search-input"
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
