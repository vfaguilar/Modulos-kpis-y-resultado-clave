import React from 'react';
import type { View } from '../App';

interface Props {
  view: View;
  onChange: (view: View) => void;
  totalCargos: number;
}

export default function TopTabs({ view, onChange, totalCargos }: Props) {
  const tabs: { id: View; label: string; icon: string }[] = [
    { id: 'resultados', label: 'Resultados Clave y KPIs', icon: '🎯' },
    { id: 'acciones', label: 'Acciones y Logros', icon: '⚡' },
    { id: 'requisitos', label: 'Requisitos del Cargo', icon: '📋' },
  ];

  return (
    <header className="top-tabs-container">
      <div className="top-tabs-wrapper">
        <div className="top-tabs-brand">
          <span className="top-tabs-title">GESTIÓN DE RESULTADOS CLAVE / KPIS</span>
          <span className="top-tabs-badge">{totalCargos} Cargos Registrados</span>
        </div>
        <nav className="top-tabs-nav">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`top-tab-button ${view === tab.id ? 'active' : ''}`}
              onClick={() => onChange(tab.id)}
            >
              <span className="top-tab-icon">{tab.icon}</span>
              <span className="top-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
