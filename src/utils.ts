import type { NivelKey } from './types';

// Convierte cualquier variante escrita (con tildes, mayúsculas, typos como
// "SUERIOR TACTICO") en una clave canónica de nivel.
export function normalizeNivel(raw: string): NivelKey {
  const s = (raw ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();

  if (s.includes('CARDINAL')) return 'CARDINAL';
  if (s.includes('ESTRATEG')) return 'SUPERIOR_ESTRATEGICO';
  if (s.includes('TACTIC')) return 'SUPERIOR_TACTICO'; // cubre "SUERIOR TACTICO"
  if (s.includes('INICIAL')) return 'INICIAL';
  return 'INTERMEDIO';
}

// Normaliza texto de clasificación para comparar sin importar tildes,
// mayúsculas o espacios extra (ej. "Vendedor" vs "VENDEDOR ").
export function normalizeClasificacion(raw: string): string {
  return (raw ?? '')
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .trim();
}

export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
