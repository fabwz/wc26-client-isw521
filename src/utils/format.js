// Sección 16 (context/requirements.md): defensa XSS para todo texto proveniente de la API
// (worldcup26.ir) que se interpola dentro de un template de innerHTML. No se traduce ni
// se usa para textos fijos generados por la app, solo para datos externos (nombres de
// equipo/estadio, ciudad/país, fechas, URLs de bandera, etc.).
const HTML_ESCAPE_MAP = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

export const escapeHtml = (value) => {
  if (value === null || value === undefined) return '';
  return String(value).replace(/[&<>"']/g, (caracter) => HTML_ESCAPE_MAP[caracter]);
};

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
  return ROUND_LABELS[group] ?? `Grupo ${escapeHtml(group)}`;
};

// Conteo animado (0 → targetValue) para los números destacados de cada vista (ciudades
// visitadas, empates encontrados, total de goleadas, asistencia potencial). Reusada por las
// 5 vistas en vez de duplicar la lógica de conteo en cada una. Respeta prefers-reduced-motion
// mostrando el valor final de una vez, igual que el resto de animaciones del proyecto.
export const animateCountUp = (element, targetValue, { duration = 500 } = {}) => {
  if (!element) return;

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion || !(targetValue > 0)) {
    element.textContent = targetValue.toLocaleString('es-CR');
    return;
  }

  const inicioMs = performance.now();
  const pintarCuadro = (ahoraMs) => {
    const progreso = Math.min((ahoraMs - inicioMs) / duration, 1);
    element.textContent = Math.round(targetValue * progreso).toLocaleString('es-CR');
    if (progreso < 1) requestAnimationFrame(pintarCuadro);
  };
  requestAnimationFrame(pintarCuadro);
};
