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

  // Se muestran siempre todos los niveles del catálogo (aunque todavía
  // ningún cargo los use), para que niveles nuevos como Cardinal o Inicial
  // queden disponibles para seleccionar desde el primer momento.
  const nivelesDisponibles = NIVELES;

  const clasificaciones = useMemo(() => {
    if (!nivel) return [];
    const set = new Set(cargos.filter((c) => c.nivel === nivel).map((c) => c.clasificacion || 'Sin clasificación'));
    return Array.from(set).sort();
  }, [cargos, nivel]);

  const cargosDisponibles = useMemo(() => {
    if (!nivel || !clasificacion) return [];
    return cargos
      .filter((c) => c.nivel === nivel && (c.clasificacion || 'Sin clasificación') === clasificacion)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [cargos, nivel, clasificacion]);

  // Si el cargo seleccionado externamente cambia, sincroniza los selects.
  useEffect(() => {
    if (!selectedCargoId) return;
    const c = cargos.find((c) => c.id === selectedCargoId);
    if (!c) return;
    setNivel(c.nivel);
    setClasificacion(c.clasificacion || 'Sin clasificación');
  }, [selectedCargoId]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="cargo-picker">
      <label>
        1. Nivel
        <select
          value={nivel}
          onChange={(e) => {
            const v = e.target.value as NivelKey | '';
            setNivel(v);
            setClasificacion('');
            onSelectCargo(null);
          }}
        >
          <option value="">Selecciona un nivel...</option>
          {nivelesDisponibles.map((n) => (
            <option key={n.key} value={n.key}>{n.label}</option>
          ))}
        </select>
      </label>

      <label>
        2. Clasificación
        <select
          value={clasificacion}
          disabled={!nivel}
          onChange={(e) => {
            setClasificacion(e.target.value);
            onSelectCargo(null);
          }}
        >
          <option value="">{nivel ? 'Selecciona una clasificación...' : 'Elige primero un nivel'}</option>
          {clasificaciones.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </label>

      <label>
        3. Cargo
        <select
          value={selectedCargoId ?? ''}
          disabled={!clasificacion}
          onChange={(e) => onSelectCargo(e.target.value || null)}
        >
          <option value="">{clasificacion ? 'Selecciona un cargo...' : 'Elige primero una clasificación'}</option>
          {cargosDisponibles.map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </label>
    </div>
  );
}
