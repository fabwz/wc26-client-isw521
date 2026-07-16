// Cantidad de equipos que entran en el ranking de mejores defensas (RF-EM-03).
const TOP_COUNT = 5;

// /get/games trae local_date como "MM/DD/YYYY HH:mm" (no ISO) — se parsea a mano
// para poder ordenar próximos partidos cronológicamente (RF-EM-04).
const parseLocalDate = (localDate) => {
  const [fecha, hora] = localDate.split(' ');
  const [mes, dia, anio] = fecha.split('/').map(Number);
  const [horas, minutos] = (hora ?? '0:0').split(':').map(Number);
  return new Date(anio, mes - 1, dia, horas, minutos);
};

// RF-EM-01/02: recorre los 12 grupos, extrae team_id+ga (string → number) de cada uno
// de los 4 equipos, unifica los 48 registros y ordena ascendente por ga (mejor defensa primero).
const buildGoalsAgainstRanking = (groups) => {
  const registros = groups.flatMap((group) =>
    group.teams.map((team) => ({
      teamId: team.team_id,
      goalsAgainst: Number(team.ga),
    })),
  );

  return registros.sort((a, b) => a.goalsAgainst - b.goalsAgainst);
};

// Verificado con datos reales: cuando un partido de eliminación directa aún no tiene
// equipo real asignado, home/away_team_id llega como "0" y solo hay un label placeholder
// en inglés tipo "Winner Match 101" o "Loser Match 101" — pero si el partido REFERENCIADO
// por ese label (ej. el 101) ya finalizó, su ganador/perdedor real ya se puede calcular a
// mano con sus propios home_score/away_score, sin esperar a que la API reescriba el "0".
// Caso real detectado: España ganó el partido 101 (semifinal, 2-0 como visitante) y avanzó
// a la Final (partido 104), pero el 104 seguía con home_team_id "0" — sin este resolver,
// findNextMatch no lo encontraba y España aparecía como "Eliminado" siendo finalista.
const MATCH_PLACEHOLDER = /^(Winner|Loser) Match (\d+)$/;

const resolvePlaceholderTeamId = (label, gamesById) => {
  const coincidencia = label?.match(MATCH_PLACEHOLDER);
  if (!coincidencia) return null;

  const [, resultado, matchId] = coincidencia;
  const partidoReferenciado = gamesById.get(matchId);
  if (!partidoReferenciado || partidoReferenciado.finished !== 'TRUE') return null;

  const ganoLocal = Number(partidoReferenciado.home_score) > Number(partidoReferenciado.away_score);
  if (resultado === 'Winner') return ganoLocal ? partidoReferenciado.home_team_id : partidoReferenciado.away_team_id;
  return ganoLocal ? partidoReferenciado.away_team_id : partidoReferenciado.home_team_id;
};

// Un lado (home o away) de un partido "es" teamId si su team_id ya lo dice directamente, o
// si sigue en "0" pero el partido que lo alimenta (resolvePlaceholderTeamId) ya determinó
// que teamId fue quien avanzó hasta aquí.
const sideIsTeam = (teamId, sideId, sideLabel, gamesById) =>
  sideId === teamId || (sideId === '0' && resolvePlaceholderTeamId(sideLabel, gamesById) === teamId);

// RF-EM-04: próximo partido pendiente (finished !== "TRUE") de un equipo, ordenado por
// local_date ascendente — el primero de esa lista es el más próximo. Incluye partidos donde
// el equipo todavía figura como placeholder de bracket ya resuelto (ver sideIsTeam arriba).
const findNextMatch = (teamId, games, gamesById) => {
  const partidosPendientes = games
    .filter((juego) => juego.finished !== 'TRUE' &&
      (sideIsTeam(teamId, juego.home_team_id, juego.home_team_label, gamesById) ||
        sideIsTeam(teamId, juego.away_team_id, juego.away_team_label, gamesById)))
    .sort((a, b) => parseLocalDate(a.local_date) - parseLocalDate(b.local_date));

  return partidosPendientes[0] ?? null;
};

// Cuando el rival del próximo partido sigue como placeholder y su partido referenciado
// TAMPOCO ha terminado todavía (ej. "Winner Match 102" antes de que el 102 se juegue), se
// traduce a un texto corto en español, conservando la referencia (número de partido o letra
// de grupo) para que siga siendo información útil, no un texto genérico vacío.
const translateBracketPlaceholder = (label) => {
  const partidoGanador = label.match(/^Winner Match (\d+)$/);
  if (partidoGanador) return `Pendiente de definir (Ganador Partido ${partidoGanador[1]})`;

  const partidoPerdedor = label.match(/^Loser Match (\d+)$/);
  if (partidoPerdedor) return `Pendiente de definir (Perdedor Partido ${partidoPerdedor[1]})`;

  const ganadorGrupo = label.match(/^Winner Group ([A-L])$/);
  if (ganadorGrupo) return `Pendiente de definir (Ganador Grupo ${ganadorGrupo[1]})`;

  const subcampeonGrupo = label.match(/^Runner-up Group ([A-L])$/);
  if (subcampeonGrupo) return `Pendiente de definir (Subcampeón Grupo ${subcampeonGrupo[1]})`;

  return 'Rival aún sin definir';
};

// RF-EM-04/RF-EM-R: resuelve el próximo rival de UN equipo. Se llama por separado para
// cada uno de los 5 del ranking (nunca en una sola pasada agregada), para que el fallo de
// una de estas 5 búsquedas no afecte a las otras 4 — ver buildWallRanking.
// `simulateFailure` (solo usado por el simulador de dev de RF-EM-R) fuerza que ESTA
// búsqueda puntual lance un error, como si la búsqueda del próximo partido de este equipo
// específico hubiese fallado técnicamente.
const resolveNextOpponent = (teamId, games, teamsById, gamesById, simulateFailure) => {
  if (simulateFailure) {
    throw new Error(`Fallo simulado (dev) en la búsqueda de próximo rival del equipo ${teamId} — RF-EM-R`);
  }

  const proximoPartido = findNextMatch(teamId, games, gamesById);

  if (!proximoPartido) {
    return { matchStatus: 'eliminated', nextOpponentName: null, nextOpponentFlag: null, nextMatchDate: null };
  }

  const esLocal = sideIsTeam(teamId, proximoPartido.home_team_id, proximoPartido.home_team_label, gamesById);
  const nextOpponentIdCrudo = esLocal ? proximoPartido.away_team_id : proximoPartido.home_team_id;
  const nextOpponentLabel = esLocal ? proximoPartido.away_team_label : proximoPartido.home_team_label;
  const nextMatchDate = proximoPartido.local_date;

  // El rival también puede seguir como placeholder ("0") — si SU partido ya terminó, se
  // resuelve al equipo real antes de buscarlo en teamsById (mismo caso que la Final: ambas
  // semifinales ya jugadas, así que el rival ya es un equipo concreto, no un "pendiente").
  const nextOpponentId = nextOpponentIdCrudo !== '0' ? nextOpponentIdCrudo : resolvePlaceholderTeamId(nextOpponentLabel, gamesById);
  const nextOpponent = nextOpponentId ? teamsById.get(nextOpponentId) : null;

  if (nextOpponent) {
    return { matchStatus: 'resolved', nextOpponentName: nextOpponent.name_en, nextOpponentFlag: nextOpponent.flag, nextMatchDate };
  }

  return { matchStatus: 'pending-bracket', nextOpponentName: translateBracketPlaceholder(nextOpponentLabel), nextOpponentFlag: null, nextMatchDate };
};

// RF-EM-01 a 04: ranking de las 5 mejores defensas (menos goles en contra) con datos de
// equipo (nombre/bandera, cruzados contra /get/teams, no contra el array anidado de
// /get/groups) y próximo rival (cruzado contra /get/games).
//
// Verificado con datos reales (worldcup26.ir): el próximo rival de un equipo del ranking
// no siempre es un caso simple de "encontrado" — hay 4 estados posibles:
//   - 'resolved': hay un próximo partido con rival real ya asignado.
//   - 'eliminated': el equipo no tiene ningún partido pendiente (quedó fuera del torneo).
//   - 'pending-bracket': hay un próximo partido (ej. Final, 3er puesto) pero el rival
//     todavía no tiene equipo asignado, solo un placeholder tipo "Winner Match 102".
//   - 'failed': la búsqueda del próximo rival de ESTE equipo específico falló (RF-EM-R).
//     "Próximo rival no disponible" se reserva exclusivamente para este caso — nunca se usa
//     para los 3 anteriores, que son normales del torneo.
//
// RF-EM-R: la búsqueda de próximo rival se evalúa equipo por equipo (resolveNextOpponent se
// llama 5 veces, una por equipo, cada una en su propio try/catch) — no una sola operación
// agregada. Si falla la de un equipo, solo ese registro cae a 'failed'; los otros 4 no se
// ven afectados porque cada llamada es independiente.
// `forcedFailureIndex` (solo usado por el simulador de dev) indica la posición dentro del
// top 5 (0-4) cuya búsqueda debe fallar; el dataset real de worldcup26.ir tiene hoy los 5
// equipos del ranking en estado 'eliminated' (sin próximo partido), por lo que este fallo no
// se puede demostrar con datos reales — se fuerza sobre el cálculo mismo, no sobre un fetch.
export const buildWallRanking = (groups, teams, games, { forcedFailureIndex = null } = {}) => {
  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const gamesById = new Map(games.map((juego) => [juego.id, juego]));

  const top5 = buildGoalsAgainstRanking(groups).slice(0, TOP_COUNT);

  const ranking = top5.map((registro, indice) => {
    const team = teamsById.get(registro.teamId);

    let opponentInfo;
    try {
      opponentInfo = resolveNextOpponent(registro.teamId, games, teamsById, gamesById, indice === forcedFailureIndex);
    } catch (error) {
      console.error('Fallo aislado en búsqueda de próximo rival (RF-EM-R):', error);
      opponentInfo = { matchStatus: 'failed', nextOpponentName: null, nextOpponentFlag: null, nextMatchDate: null };
    }

    return {
      teamId: registro.teamId,
      teamName: team?.name_en ?? registro.teamId,
      teamFlag: team?.flag ?? null,
      goalsAgainst: registro.goalsAgainst,
      ...opponentInfo,
    };
  });

  return { ranking };
};
