const ICON_CHEVRON_DOWN = `
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
`;

export const renderTeamSelector = (container, teams, { onTeamSelected } = {}) => {
  const equiposOrdenados = [...teams].sort((a, b) => a.name_en.localeCompare(b.name_en));

  container.innerHTML = `
    <label class="flex flex-col gap-1.5">
      <span class="body-sm text-text-secondary">Selecciona un equipo</span>
      <div class="relative">
        <select
          name="team"
          class="glass appearance-none w-full rounded-full pl-5 pr-10 py-3 text-white bg-[#1D1032] outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2"
        >
          <option value="" disabled selected class="bg-[#1D1032] text-white">Elige un equipo</option>
          ${equiposOrdenados
            .map((equipo) => `<option value="${equipo.id}" class="bg-[#1D1032] text-white">${equipo.name_en}</option>`)
            .join('')}
        </select>
        <span class="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-text-secondary">${ICON_CHEVRON_DOWN}</span>
      </div>
    </label>
  `;

  const select = container.querySelector('select');
  select.addEventListener('change', () => {
    onTeamSelected?.(select.value);
  });
};
