// Diferencia mínima de goles para considerar un partido "goleada" (RF-RG-03).
const DIFERENCIA_MINIMA_GOLEADA = 3;

const resolveTeamName = (teamId, teamsById) => teamsById.get(teamId)?.name_en ?? teamId;
const resolveTeamFlag = (teamId, teamsById) => teamsById.get(teamId)?.flag ?? null;

export const buildGoalsList = (games, teams) => {
  const teamsById = new Map(teams.map((team) => [team.id, team]));

  // finished y los scores llegan como string desde /get/games (RF-RG-01/02).
  const partidosFinalizados = games.filter((juego) => juego.finished === 'TRUE');

  const goleadas = partidosFinalizados
    .map((juego) => ({
      ...juego,
      goalDifference: Math.abs(Number(juego.home_score) - Number(juego.away_score)),
    }))
    .filter((juego) => juego.goalDifference >= DIFERENCIA_MINIMA_GOLEADA)
    .sort((a, b) => b.goalDifference - a.goalDifference);

  const matches = goleadas.map((juego) => ({
    id: juego.id,
    homeTeamName: resolveTeamName(juego.home_team_id, teamsById),
    homeTeamFlag: resolveTeamFlag(juego.home_team_id, teamsById),
    awayTeamName: resolveTeamName(juego.away_team_id, teamsById),
    awayTeamFlag: resolveTeamFlag(juego.away_team_id, teamsById),
    homeScore: Number(juego.home_score),
    awayScore: Number(juego.away_score),
    goalDifference: juego.goalDifference,
    group: juego.group,
    localDate: juego.local_date,
  }));

  return {
    matches,
    totalCount: matches.length,
  };
};
