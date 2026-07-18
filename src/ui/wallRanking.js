// Ícono Lucide como SVG inline (CLAUDE.md 2), nunca el paquete npm ni el script CDN.
const ICON_SHIELD = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/></svg>
`;

export const renderWallRanking = (container, { ranking }) => {
  container.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4 mt-6 mb-6">
      <div class="flex-1 min-w-[240px]">
        <h2 class="header-enter font-display text-[26px] leading-[30px] font-bold text-white">El Muro</h2>
        <p class="header-enter body-sm text-text-secondary mt-2" style="animation-delay: 60ms">Ranking de las mejores defensas del torneo según goles recibidos en la fase de grupos, con el próximo rival de cada una.</p>
      </div>
      <div class="text-right">
        <p class="body-sm text-text-secondary">Mejores defensas</p>
        <p class="font-display font-extrabold text-4xl bg-gradient-accent bg-clip-text text-transparent">${ranking.length}</p>
      </div>
    </div>

    <div class="flex flex-col gap-4">
      ${ranking.map((entrada, indice) => renderRankingCardHtml(entrada, indice)).join('')}
    </div>
  `;
  releaseCardEnterClass(container);
};

const releaseCardEnterClass = (container) => {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  container.querySelectorAll('.card-enter').forEach((tarjeta) => {
    if (prefersReducedMotion) {
      tarjeta.classList.remove('card-enter');
      return;
    }
    const quitarClase = () => tarjeta.classList.remove('card-enter');
    tarjeta.addEventListener('animationend', quitarClase, { once: true });
    setTimeout(quitarClase, 400);
  });
};

const renderTeamHtml = (name, flag) => `
  <span class="flex items-center gap-2">
    ${flag ? `<img src="${flag}" alt="" class="w-6 h-6 rounded-full object-cover shrink-0" />` : ''}
    <span>${name}</span>
  </span>
`;

// 3 estados normales del torneo (verificados con datos reales, ver wallService.js):
// resuelto (rival real), eliminado (sin partido pendiente) o pendiente de bracket
// (hay partido pero el rival aún no está asignado, ej. Final), más 'failed': fallo técnico
// puntual de la búsqueda de próximo rival de ESE equipo (RF-EM-R) — "Próximo rival no
// disponible" se reserva exclusivamente para este caso, nunca para los otros 3.
const renderNextOpponentHtml = (entrada) => {
  if (entrada.matchStatus === 'failed') {
    return `<p class="text-text-secondary italic">Próximo rival no disponible</p>`;
  }

  if (entrada.matchStatus === 'eliminated') {
    return `<p class="text-text-secondary italic">Eliminado</p>`;
  }

  if (entrada.matchStatus === 'pending-bracket') {
    return `
      <p class="text-text-secondary italic">${entrada.nextOpponentName}</p>
      <p class="text-text-secondary text-[13px]">${entrada.nextMatchDate}</p>
    `;
  }

  return `
    <p class="flex items-center gap-2 text-white">
      <span class="text-text-secondary">vs</span>
      ${renderTeamHtml(entrada.nextOpponentName, entrada.nextOpponentFlag)}
    </p>
    <p class="text-text-secondary text-[13px]">${entrada.nextMatchDate}</p>
  `;
};

const renderRankingCardHtml = (entrada, indice) => `
  <article
    class="card-enter ticket-card relative overflow-hidden glass rounded-[20px] pl-6 pr-5 py-5 grid grid-cols-[minmax(0,1fr)_160px_minmax(0,1fr)] items-center gap-4"
    style="animation-delay: ${indice * 40}ms"
    data-team-id="${entrada.teamId}"
    tabindex="0"
  >
    <span class="ticket-card-accent absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet to-magenta"></span>

    <div class="flex items-center gap-4">
      <span class="glass rounded-full w-9 h-9 flex items-center justify-center font-display font-bold text-white shrink-0">${indice + 1}</span>
      ${renderTeamHtml(entrada.teamName, entrada.teamFlag)}
    </div>

    <div class="font-mono text-[15px] leading-5 flex items-center gap-2 justify-self-center text-white">
      <span class="text-text-secondary">${ICON_SHIELD}</span>
      <span>${entrada.goalsAgainst} GC</span>
    </div>

    <div class="font-mono text-[15px] leading-5 flex flex-col items-end gap-1 justify-self-end">
      ${renderNextOpponentHtml(entrada)}
    </div>
  </article>
`;
