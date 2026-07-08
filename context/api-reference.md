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

## Notas operativas de la API

- **Rate limit público:** 120 peticiones por ventana de 60 segundos en endpoints `/get/*`. Superarlo devuelve `429`. Útil para saber cuánto hay que insistir para provocar el 429 en la demo de la defensa (recargar rápido varias veces suele bastar).
- **Caché interno de la API:** las respuestas `GET` públicas se cachean ~30s del lado del servidor — no afecta el comportamiento esperado de la app, pero explica por qué dos peticiones muy seguidas pueden devolver exactamente el mismo dato.
- **Tipos de dato inconsistentes:** varios campos numéricos llegan como **string** (`finished`, `home_score`, `pts` en otros endpoints), mientras que otros sí llegan como número (`capacity`). No asumir el tipo — validar/convertir explícitamente donde se compare o calcule.
