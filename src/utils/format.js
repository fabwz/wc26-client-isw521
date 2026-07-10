// En fase eliminatoria, el campo `group` de /get/games deja de ser una letra (A..L) y pasa a ser un código de ronda.
const ROUND_LABELS = {
  R32: 'Ronda de 32',
  R16: 'Ronda de 16',
  QF: 'Cuartos de Final',
  SF: 'Semifinal',
  '3RD': 'Tercer Puesto',
  FINAL: 'Final',
};

export const formatGroupLabel = (group) => {
  return ROUND_LABELS[group] ?? `Grupo ${group}`;
};
