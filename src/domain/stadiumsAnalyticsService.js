// RF-AE-01 a RF-AE-03: agrega partidos por estadio y calcula asistencia potencial.
// `stadiums`/`games` ya vienen obtenidos por quien orquesta la llamada (main.js reutiliza
// la memorización de getStadiums()/getGames() con el mismo patrón que obtenerTeamsYGames()).
export const buildStadiumsAnalytics = (stadiums, games) => {
  // RF-AE-01: cuántos partidos de /get/games tienen ese stadium_id, por cada uno de los 16 estadios.
  const gameCountByStadiumId = new Map();
  games.forEach((juego) => {
    const cantidadActual = gameCountByStadiumId.get(juego.stadium_id) ?? 0;
    gameCountByStadiumId.set(juego.stadium_id, cantidadActual + 1);
  });

  const stadiumsWithAnalytics = stadiums.map((estadio) => {
    const gameCount = gameCountByStadiumId.get(estadio.id) ?? 0;
    return {
      id: estadio.id,
      name: estadio.name_en,
      cityCountry: `${estadio.city_en}, ${estadio.country_en}`,
      capacity: estadio.capacity,
      gameCount,
      // RF-AE-02: capacity (número) × cantidad de partidos.
      potentialAttendance: estadio.capacity * gameCount,
    };
  });

  // RF-AE-03: mayor a menor asistencia potencial.
  const sortedStadiums = [...stadiumsWithAnalytics].sort(
    (a, b) => b.potentialAttendance - a.potentialAttendance
  );

  return { stadiums: sortedStadiums };
};
