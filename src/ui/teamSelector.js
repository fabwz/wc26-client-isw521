// teamSelector: poblar y manejar el <select> de equipos (RF-01). Solo DOM,
// recibe los equipos ya obtenidos por /api — nunca hace fetch directamente.

// renderTeamSelector: dibuja el selector con los 48 equipos (nombre completo,
// nunca fifa_code) y notifica onTeamSelected(teamId) al elegir uno.
export const renderTeamSelector = (container, teams, { onTeamSelected } = {}) => {
  const equiposOrdenados = [...teams].sort((a, b) => a.name_en.localeCompare(b.name_en));

  container.innerHTML = `
    <label class="flex flex-col gap-1.5">
      <span class="body-sm text-text-secondary">Selecciona un equipo</span>
      <select
        name="team"
        class="glass rounded-full px-5 py-3 text-white bg-transparent outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-magenta focus-visible:outline-offset-2"
      >
        <option value="" disabled selected>Elige un equipo</option>
        ${equiposOrdenados
          .map((equipo) => `<option value="${equipo.id}">${equipo.name_en}</option>`)
          .join('')}
      </select>
    </label>
  `;

  const select = container.querySelector('select');
  select.addEventListener('change', () => {
    onTeamSelected?.(select.value);
  });
};
