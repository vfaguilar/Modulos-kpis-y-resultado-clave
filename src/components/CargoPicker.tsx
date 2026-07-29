import { useEffect, useMemo, useState } from 'react';
import type { Cargo, NivelKey } from '../types';
import { NIVELES } from '../data/seed';

interface Props {
  cargos: Cargo[];
  selectedCargoId: string | null;
  onSelectCargo: (cargoId: string | null) => void;
}

export default function CargoPicker({ cargos, selectedCargoId, onSelectCargo }: Props) {
  const [nivel, setNivel] = useState<NivelKey | ''>('');
  const [clasificacion, setClasificacion] = useState<string>('');

  // Auto-selección por defecto del primer cargo si no hay ninguno seleccionado
  useEffect(() => {
    if (!selectedCargoId && cargos.length > 0) {
      onSelectCargo(cargos[0].id);
    }
  }, [cargos, selectedCargoId, onSelectCargo]);

  // Si el cargo seleccionado cambia, sincroniza los selectores de Nivel y Clasificación
  useEffect(() => {
    if (!selectedCargoId) return;
    const c = cargos.find((item) => item.id === selectedCargoId);
    if (!c) return;
    setNivel(c.nivel);
    setClasificacion(c.clasificacion || 'Sin clasificar');
  }, [selectedCargoId, cargos]);

  const nivelesDisponibles = NIVELES;

  const clasificaciones = useMemo(() => {
    let source = cargos;
    if (nivel) source = source.filter((c) => c.nivel === nivel);
    const set = new Set(source.map((c) => c.clasificacion || 'Sin clasificar'));
    return Array.from(set).sort();
  }, [cargos, nivel]);

  const cargosDisponibles = useMemo(() => {
    let list = cargos;
    if (nivel) list = list.filter((c) => c.nivel === nivel);
    if (clasificacion) list = list.filter((c) => (c.clasificacion || 'Sin clasificar') === clasificacion);
    return [...list].sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [cargos, nivel, clasificacion]);

  return (
    <div className="cargo-picker" style={{ gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
      <label style={{ gridColumn: 'span 1' }}>
        📌 Puesto Seleccionado ({cargos.length})
        <select
          value={selectedCargoId ?? ''}
          onChange={(e) => onSelectCargo(e.target.value || null)}
          style={{ fontWeight: 600, borderColor: 'var(--accent)' }}
        >
          {cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nombre} ({c.clasificacion || 'Sin clasificar'})
            </option>
          ))}
        </select>
      </label>

      <label>
        1. Nivel Jerárquico
        <select
          value={nivel}
          onChange={(e) => {
            const v = e.target.value as NivelKey | '';
            setNivel(v);
            setClasificacion('');
          }}
        >
          <option value="">Todos los Niveles ({cargos.length})</option>
          {nivelesDisponibles.map((n) => (
            <option key={n.key} value={n.key}>{n.label}</option>
          ))}
        </select>
      </label>

      <label>
        2. Clasificación
        <select
          value={clasificacion}
          onChange={(e) => setClasificacion(e.target.value)}
        >
          <option value="">Todas las Clasificaciones ({clasificaciones.length})</option>
          {clasificaciones.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label>
        3. Puestos Filtrados
        <select
          value={selectedCargoId ?? ''}
          onChange={(e) => onSelectCargo(e.target.value || null)}
        >
          <option value="">Seleccionar de lista filtrada ({cargosDisponibles.length})...</option>
          {cargosDisponibles.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
