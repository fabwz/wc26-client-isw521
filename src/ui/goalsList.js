import { formatGroupLabel } from '../utils/format.js';

// Ícono Lucide como SVG inline (CLAUDE.md 2), nunca el paquete npm ni el script CDN.
const ICON_ZAP = `
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z"/></svg>
`;

export const renderGoalsList = (container, { matches, totalCount }) => {
  container.innerHTML = `
    <div class="flex flex-wrap items-start justify-between gap-4 mt-6 mb-6">
      <div class="flex items-center gap-3">
        <h2 class="font-display text-[26px] leading-[30px] font-bold text-white">Rastreador de Goleadas</h2>
      </div>
      <div class="text-right">
        <p class="body-sm text-text-secondary">Goleadas encontradas</p>
        <p class="font-display font-extrabold text-4xl bg-gradient-accent bg-clip-text text-transparent">${totalCount}</p>
      </div>
    </div>

    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${matches.map((match, indice) => renderCardHtml(match, indice)).join('')}
    </div>
  `;
  releaseCardEnterClass(container);
};

// `animation-fill-mode: both` deja el transform del último frame por encima del
// hover de .ticket-card sin importar especificidad, así que hay que quitar la clase al terminar.
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
    ${flag ? `<img src="${flag}" alt="" class="w-5 h-5 rounded-full object-cover shrink-0" />` : ''}
    <span>${name}</span>
  </span>
`;

const renderCardHtml = (match, indice) => `
  <article
    class="card-enter ticket-card relative overflow-hidden glass rounded-[20px] pl-6 pr-5 py-5 flex flex-col gap-3"
    style="animation-delay: ${indice * 40}ms"
    data-match-id="${match.id}"
  >
    <span class="ticket-card-accent absolute inset-y-0 left-0 w-[3px] bg-gradient-to-b from-violet to-magenta"></span>

    <header class="flex items-center justify-between gap-2">
      <h3 class="font-display font-bold text-white flex items-center gap-2 flex-wrap">
        ${renderTeamHtml(match.homeTeamName, match.homeTeamFlag)}
        <span class="text-text-secondary">vs</span>
        ${renderTeamHtml(match.awayTeamName, match.awayTeamFlag)}
      </h3>
      <span class="glass rounded-full px-2.5 py-0.5 text-xs text-text-secondary shrink-0">${formatGroupLabel(match.group)}</span>
    </header>

    <div class="border-t border-dashed border-white/[0.16]"></div>

    <div class="font-mono text-[15px] leading-5 flex items-center justify-between">
      <p class="text-white">${match.homeScore} - ${match.awayScore}</p>
      <p class="flex items-center gap-2 text-text-secondary">
        <span>${ICON_ZAP}</span>
        <span class="text-white">+${match.goalDifference}</span>
      </p>
    </div>

    <p class="font-mono text-[13px] text-text-secondary">${match.localDate}</p>
  </article>
`;
