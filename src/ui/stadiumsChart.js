// Ícono Lucide como SVG inline (CLAUDE.md 2), nunca el paquete npm ni el script CDN.
const ICON_USERS = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
`;

// RF-AE-04: gráfica de barras construida a mano (sin librerías), dos barras por estadio
// (capacidad vs. partidos albergados), cada una normalizada contra el máximo de su propio
// dataset — capacidad y cantidad de partidos viven en escalas muy distintas (decenas de miles
// vs. unidades), así que normalizarlas juntas dejaría la barra de partidos invisible.
const formatNumber = (numero) => numero.toLocaleString('es-CR');

const renderBarRow = ({ label, value, maxValue, gradientClass }) => {
  const anchoPorcentaje = maxValue > 0 ? Math.round((value / maxValue) * 100) : 0;
  return `
    <div class="flex items-center gap-3">
      <span class="body-sm text-text-secondary w-20 shrink-0">${label}</span>
      <div class="flex-1 h-3 rounded-full bg-white/[0.06] overflow-hidden">
        <div class="h-full rounded-full ${gradientClass}" style="width: ${anchoPorcentaje}%"></div>
      </div>
      <span class="font-mono text-[13px] text-white w-20 shrink-0 text-right">${formatNumber(value)}</span>
    </div>
  `;
};

const renderStadiumCardHtml = (stadium, indice, maxCapacity, maxGameCount) => `
  <article
    class="glass rounded-[20px] p-5 flex flex-col gap-4"
    style="animation-delay: ${indice * 40}ms"
    data-stadium-id="${stadium.id}"
  >
    <header class="flex items-start justify-between gap-3">
      <div>
        <h3 class="font-display font-bold text-white">${stadium.name}</h3>
        <p class="font-mono text-[13px] text-text-secondary">${stadium.cityCountry}</p>
      </div>
      <div class="text-right shrink-0">
        <p class="body-sm text-text-secondary">Asistencia potencial</p>
        <p class="font-mono font-semibold text-lg bg-gradient-accent-data bg-clip-text text-transparent">
          ${formatNumber(stadium.potentialAttendance)}
        </p>
      </div>
    </header>

    <div class="flex flex-col gap-2">
      ${renderBarRow({ label: 'Aforo', value: stadium.capacity, maxValue: maxCapacity, gradientClass: 'bg-gradient-accent-data' })}
      ${renderBarRow({ label: 'Partidos', value: stadium.gameCount, maxValue: maxGameCount, gradientClass: 'bg-gradient-accent' })}
    </div>
  </article>
`;

export const renderStadiumsChart = (container, { stadiums }) => {
  const maxCapacity = Math.max(...stadiums.map((estadio) => estadio.capacity), 0);
  const maxGameCount = Math.max(...stadiums.map((estadio) => estadio.gameCount), 0);

  container.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4 mt-6 mb-6">
      <div class="flex items-center gap-3">
        <h2 class="font-display text-[26px] leading-[30px] font-bold text-white">Analítica de Estadios</h2>
      </div>
      <div class="flex items-center gap-2 text-text-secondary">
        ${ICON_USERS}
        <span class="body-sm">Capacidad vs. partidos albergados</span>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2">
      ${stadiums.map((stadium, indice) => renderStadiumCardHtml(stadium, indice, maxCapacity, maxGameCount)).join('')}
    </div>
  `;
};
