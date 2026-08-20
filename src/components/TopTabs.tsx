import React from 'react';
import type { View } from '../App';

interface Props {
  view: View;
  onChange: (view: View) => void;
  totalCargos: number;
}

export default function TopTabs({ view, onChange, totalCargos }: Props) {
  const getTabIcon = (id: View) => {
    switch (id) {
      case 'resultados':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <circle cx="12" cy="12" r="6" />
            <circle cx="12" cy="12" r="2" />
          </svg>
        );
      case 'acciones':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
          </svg>
        );
      case 'requisitos':
        return (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
          </svg>
        );
    }
  };

  const tabs: { id: View; label: string }[] = [
    { id: 'resultados', label: 'Resultados Clave y KPIs' },
    { id: 'acciones', label: 'Acciones y Logros' },
    { id: 'requisitos', label: 'Requisitos del Cargo' },
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
              <span className="top-tab-icon">{getTabIcon(tab.id)}</span>
              <span className="top-tab-label">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </header>
  );
}
