# API Reference — worldcup26.ir
**Referencia técnica de los endpoints reales usados por "La Ruta del Campeón". Solo documentación de apoyo para desarrollo — no forma parte del alcance evaluado por el enunciado.**

> Alcance intencional: este archivo documenta **únicamente** los endpoints que el subproyecto consume (`teams`, `games`, `stadiums`, `auth/register`, `auth/authenticate`). No se documenta `/get/groups` a propósito — no es parte del alcance de "La Ruta del Campeón" (ver `requirements.md`, sección 9) y no debe usarse aunque esté disponible en la API.

**Base URL:** `https://worldcup26.ir`

---

## Autenticación

### `POST /auth/register` (uso único, fuera de la app — vía Swagger/curl)
```json
// Request
{ "name": "string", "email": "string", "password": "string" }

// Response
{
  "user": { "_id": "...", "name": "John Doe", "email": "john@example.com", "createdAt": "..." },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

### `POST /auth/authenticate` (el que usa la app en el login)
```json
// Request
{ "email": "string", "password": "string" }

// Response — mismo shape que register
{
  "user": { "_id": "...", "name": "John Doe", "email": "john@example.com" },
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```
- El `token` expira a los 84 días.
- Estos dos endpoints **no** llevan `Authorization` header (son los que lo generan).

---

## `GET /get/teams`
Requiere `Authorization: Bearer <token>`. Devuelve un array de 48 equipos.

```json
{
  "id": "37",
  "name_en": "Argentina",
  "name_fa": "آرژانتین",
  "fifa_code": "ARG",
  "groups": "J",
  "flag": "https://..."
}
```

**Campos a usar en la app:**
- `id` → para cruzar con `home_team_id`/`away_team_id` de `games`.
- `name_en` → **nombre completo a mostrar siempre** (nunca `fifa_code`, ver RF-01).
- `flag` → URL de bandera, si se decide mostrar.

---

## `GET /get/games`
Requiere `Authorization: Bearer <token>`. Devuelve un array de 104 partidos.

```json
{
  "id": "73",
  "home_team_id": "0",
  "away_team_id": "0",
  "home_score": "0",
  "away_score": "0",
  "home_scorers": "null",
  "away_scorers": "null",
  "group": "R32",
  "matchday": "4",
  "local_date": "06/28/2026 12:00",
  "persian_date": "1405-04-07 12:00",
  "stadium_id": "16",
  "finished": "FALSE",
  "time_elapsed": "notstarted",
  "type": "r32",
  "home_team_label": "Runner-up Group A",
  "away_team_label": "Runner-up Group B"
}
```

**Campos a usar en la app:**
- `home_team_id` / `away_team_id` → cruce con `teams`. **Ojo:** en partidos de fase de eliminación aún no definidos, vienen como `"0"` — en ese caso usar `home_team_label`/`away_team_label` como respaldo (ej. "Runner-up Group A"). Para este subproyecto (fase de grupos, equipo ya definido) esto es poco frecuente, pero vale la pena un fallback defensivo.
- `group` → viene nativo, no requiere `/get/groups`. Valores exactos confirmados:

  | Valor | Etapa | Etiqueta a mostrar |
  |---|---|---|
  | `A`...`L` | Fase de grupos | "Grupo A" (usar el valor tal cual) |
  | `R32` | Ronda de 32 | "Ronda de 32" |
  | `R16` | Ronda de 16 | "Ronda de 16" |
  | `QF` | Cuartos de final | "Cuartos de Final" |
  | `SF` | Semifinal | "Semifinal" |
  | `3RD` | Partido por el 3er puesto | "Tercer Puesto" |
  | `FINAL` | Final | "Final" |

  **No anteponer "Grupo" a un código de ronda eliminatoria** — "Grupo R32" es incorrecto, debe mapearse a "Ronda de 32". Ver también el campo `type` (minúsculas: `r32`, `r16`, `qf`, `sf`, `third`, `final`), que trae el mismo dato en otro formato — usar el que sea más cómodo para el mapeo, ambos son equivalentes.
- `local_date` → formato string `"MM/DD/YYYY HH:mm"`, no ISO — parsear con cuidado al ordenar/formatear.
- `stadium_id` → cruce con `stadiums`.
- `finished` → viene como **string** `"TRUE"`/`"FALSE"`, no boolean. Cuidado al comparar (`finished === "TRUE"`, no `finished === true`).
- `home_score` / `away_score` → no se usan en Itinerarios (ver decisión de no mostrar resultados en esta vista).

---

## `GET /get/stadiums`
Requiere `Authorization: Bearer <token>`. Devuelve un array de 16 estadios.

```json
{
  "id": "11",
  "name_en": "MetLife Stadium",
  "name_fa": "استادیوم متلایف",
  "fifa_name": "New York/New Jersey Stadium",
  "city_en": "East Rutherford, NJ",
  "country_en": "United States",
  "capacity": 82500
}
```

**Campos a usar en la app (RF-03):**
- `id` → cruce con `stadium_id` de `games`.
- `name_en` → **nombre completo del estadio a mostrar** (nunca inventar un código de 3 letras).
- `city_en` → ⚠️ **puede incluir estado/región junto con la ciudad** (ej. "East Rutherford, NJ", no solo "East Rutherford"). Si se quiere mostrar solo el nombre de la ciudad para el contador de `RF-05` (ciudades distintas), usar el valor de `city_en` tal cual como clave de conteo — no intentar separarlo en ciudad/estado, ya que no es un formato 100% consistente entre los 16 estadios.
- `country_en` → mostrar junto a `city_en` (ej. "East Rutherford, NJ, United States" o adaptarlo al idioma de la UI).
- `capacity` → viene como **número**, no string — a diferencia de varios campos de `games`.

---

## `GET /get/groups`
Requiere `Authorization: Bearer <token>`. ⚠️ **A diferencia de `teams`/`games`/`stadiums`, la respuesta NO es un array directo** — viene envuelta en un objeto: `{ "groups": [...] }` (12 grupos). Acceder a `respuesta.groups`, no asumir que la respuesta misma es el array.

```json
{
  "_id": "698985a46e8cb0bf61b5ac9e",
  "name": "H",
  "teams": [
    { "team_id": "29", "mp": "3", "w": "2", "l": "0", "d": "1", "pts": "7", "gf": "5", "ga": "0", "gd": "5", "_id": "698985a46e8cb0bf61b5ac9f" },
    { "team_id": "30", "mp": "3", "w": "0", "l": "0", "d": "3", "pts": "3", "gf": "2", "ga": "2", "gd": "0", "_id": "698985a46e8cb0bf61b5aca0" }
  ],
  "createdAt": "2026-02-09T06:58:44.378Z",
  "__v": 0,
  "updatedAt": "2026-06-27T02:02:41.121Z"
}
```

**Campos a usar en la app (RF-EM-01 a RF-EM-04):**
- `name` → letra del grupo (ej. `"A"`, `"H"`) — equivalente a `group` en `games`, pero aquí se llama `name`.
- `teams` (dentro del grupo) → array de 4 equipos con sus estadísticas. Cada uno trae: `team_id`, `mp` (jugados), `w` (ganados), `l` (perdidos), `d` (empatados), `pts` (puntos), `gf` (goles a favor), `ga` (**goles en contra** — el campo que pide RF-EM-01), `gd` (diferencia de gol), y un `_id` propio de Mongo (distinto al `_id` del grupo, no confundir).
- Todos los campos numéricos (`mp`, `w`, `l`, `d`, `pts`, `gf`, `ga`, `gd`) llegan como **string** — convertir antes de ordenar/comparar (mismo patrón que `home_score`/`away_score` en `games`).
- ⚠️ **El orden del array `teams` NO refleja el ranking/posición dentro del grupo** — verificado empíricamente: en un grupo, el equipo con más puntos (7 pts) aparece en la posición 2 del array, no en la 1. Cualquier ranking (incluyendo el ordenamiento ascendente por `ga` que pide RF-EM-02) debe calcularse explícitamente en el cliente — nunca asumir que `teams[0]` es el líder o el mejor en ningún criterio.
- `_id`, `createdAt`, `updatedAt`, `__v` → metadatos de Mongo, no se usan en el proyecto.

- **Rate limit público:** 120 peticiones por ventana de 60 segundos en endpoints `/get/*`. Superarlo devuelve `429`. Útil para saber cuánto hay que insistir para provocar el 429 en la demo de la defensa (recargar rápido varias veces suele bastar).
- **Caché interno de la API:** confirmado con headers reales — `Cache-Control: public, max-age=30, stale-while-revalidate=30`. Peticiones idénticas (misma URL) dentro de esa ventana de 30s se sirven desde caché (`X-Cache: HIT`) **sin contar contra el rate limit** (`RateLimit-Remaining` casi no baja). **Para provocar un 429 real en pruebas**, hay que romper la caché agregando un parámetro random/timestamp a cada petición (ej. `?_=${Date.now()}_${i}`), de lo contrario un loop de peticiones repetidas idénticas no dispara el límite aunque se manden cientos.
- **Headers de rate limit reales, confirmados:** `RateLimit-Limit: 120`, `RateLimit-Policy: 120;w=60`, `RateLimit-Remaining`, `RateLimit-Reset` — vienen en cada respuesta de `/get/*`, útiles para depurar cuánto margen queda sin tener que provocar el 429 a ciegas.
- **Tipos de dato inconsistentes:** varios campos numéricos llegan como **string** (`finished`, `home_score`, `pts` en otros endpoints), mientras que otros sí llegan como número (`capacity`). No asumir el tipo — validar/convertir explícitamente donde se compare o calcule.
- **⚠️ El servidor NO valida el JWT en `/get/*` (verificado empíricamente):** se probó `/get/teams` sin header `Authorization`, con un string random como token, con un JWT real con firma alterada, y con un JWT bien formado pero con payload/firma 100% inventados — **las 5 variantes devolvieron `200 OK`** con el dataset completo. El servidor no verifica que el header exista, ni la firma, ni el payload. Esto significa que **el 401 no es alcanzable mandando un token inválido/corrupto contra la API real** — el cliente (`httpClient.js`) sigue haciendo lo correcto (envía el header, distinguiría un 401 si el servidor lo devolviera), pero el servidor de esta API pública simplemente no lo dispara en este endpoint.
  - **Implicación para la demo/defensa:** RF-08 (manejo de 401) debe demostrarse de forma **simulada** (ej. un mecanismo de debug que fuerce `ApiError(401)` sin depender del servidor), no provocando un 401 real contra la API. Esto es válido y debe explicarse así en la defensa: el código cumple el requisito, la API de terceros no impone expiración/validación de JWT en estos endpoints.
  - No se debe interpretar esto como una falla del proyecto — es una característica/limitación de la API pública, fuera de control del estudiante.
