// Helpers puros de formateo para presentación (sin DOM, sin estado, sin fetch).

// Fase eliminatoria: el campo `group` de /get/games deja de ser una letra de
// grupo (A..L) y pasa a ser un código de ronda (ver context/api-reference.md).
const ROUND_LABELS = {
  R32: 'Ronda de 32',
  R16: 'Ronda de 16',
  QF: 'Cuartos de Final',
  SF: 'Semifinal',
  '3RD': 'Tercer Puesto',
  FINAL: 'Final',
};

// formatGroupLabel: traduce el campo `group` de un partido al texto a
// mostrar en la tarjeta. En fase de grupos (A..L) es literalmente "Grupo X";
// en fase eliminatoria, el código de ronda se mapea a su nombre en español.
export const formatGroupLabel = (group) => {
  return ROUND_LABELS[group] ?? `Grupo ${group}`;
};
