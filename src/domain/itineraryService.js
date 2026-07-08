// Lógica de cruce de datos del itinerario (RF-02 a RF-05). Puro: no hace
// fetch (eso es responsabilidad de /api) ni toca el DOM (eso es de /ui).

// parseLocalDate: local_date llega como "MM/DD/YYYY HH:mm", no ISO — no se
// puede pasar directo a `new Date(...)` de forma confiable entre navegadores.
const parseLocalDate = (localDate) => {
  const [fecha, hora] = localDate.split(' ');
  const [mes, dia, anio] = fecha.split('/').map(Number);
  const [horas, minutos] = hora.split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos);
};

// resolveTeamName: nombre completo real del equipo (RF-01). Si el equipo aún
// no está definido (fase de eliminación, id "0"), usa el label de respaldo
// que ya provee /get/games (ej. "Runner-up Group A").
const resolveTeamName = (teamId, teamLabel, teamsById) => {
  if (teamId === '0') return teamLabel;
  return teamsById.get(teamId)?.name_en ?? teamLabel;
};

// resolveStadiumInfo: cruce de stadium_id contra /get/stadiums (RF-03).
// Devuelve texto explícito y completo, nunca códigos abreviados.
const resolveStadiumInfo = (stadiumId, stadiumsById) => {
  const estadio = stadiumsById.get(stadiumId);
  if (!estadio) return null;
  return {
    name: estadio.name_en,
    cityCountry: `${estadio.city_en}, ${estadio.country_en}`,
    cityName: estadio.city_en,
    capacity: estadio.capacity,
  };
};

// buildItinerary: dado un equipo seleccionado y las 3 colecciones ya
// obtenidas, arma el itinerario completo: partidos filtrados y ordenados,
// con estadio cruzado y conteo de ciudades distintas visitadas.
export const buildItinerary = (selectedTeamId, teams, games, stadiums) => {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const stadiumsById = new Map(stadiums.map((stadium) => [stadium.id, stadium]));

  const partidosDelEquipo = games.filter(
    (juego) => juego.home_team_id === selectedTeamId || juego.away_team_id === selectedTeamId
  );

  const partidosOrdenados = [...partidosDelEquipo].sort(
    (a, b) => parseLocalDate(a.local_date) - parseLocalDate(b.local_date)
  );

  const matches = partidosOrdenados.map((juego) => {
    const esLocal = juego.home_team_id === selectedTeamId;
    const rivalId = esLocal ? juego.away_team_id : juego.home_team_id;
    const rivalLabel = esLocal ? juego.away_team_label : juego.home_team_label;

    return {
      id: juego.id,
      homeTeamName: resolveTeamName(juego.home_team_id, juego.home_team_label, teamsById),
      awayTeamName: resolveTeamName(juego.away_team_id, juego.away_team_label, teamsById),
      opponentName: resolveTeamName(rivalId, rivalLabel, teamsById),
      group: juego.group,
      localDate: juego.local_date,
      stadiumId: juego.stadium_id,
      stadium: resolveStadiumInfo(juego.stadium_id, stadiumsById),
    };
  });

  const ciudadesDistintas = new Set(
    matches.map((match) => match.stadium?.cityName).filter(Boolean)
  );

  return {
    matches,
    citiesVisitedCount: ciudadesDistintas.size,
  };
};
