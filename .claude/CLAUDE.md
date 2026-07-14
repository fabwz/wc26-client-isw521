# CLAUDE.md

Este archivo es el contexto de arquitectura para Claude Code al trabajar en este repositorio. Léelo por completo antes de generar o modificar código. Estas reglas **no son sugerencias**: son restricciones de una rúbrica académica y su incumplimiento invalida el proyecto.

---

## 1. Qué es este proyecto

Aplicación web para el curso ISW-521 (Programación en Ambiente Web I), Categoría A: Cruce de Datos y Analítica. Es una SPA sin framework que consume la API pública del Mundial 2026 (`https://worldcup26.ir`) para construir **5 vistas derivadas distintas**, una por cada subproyecto del catálogo:

1. **La Ruta del Campeón** — ✅ implementado y verificado. Itinerario de partidos de un equipo (equipos + partidos + estadios).
2. **Rastreador de Goleadas** — pendiente. Lista ordenada de partidos con diferencia de gol ≥3.
3. **El Muro** — pendiente. Ranking de las 5 mejores defensas + próximo rival de cada una.
4. **Analítica de Estadios** — pendiente. Gráfica de barras de asistencia potencial por estadio.
5. **Radar de Empates** — pendiente. Matriz visual de empates agrupados por grupo.

> ⚠️ **Cambio de alcance respecto al enunciado original:** el PDF del enunciado especificaba elegir **un solo** subproyecto. El profesor comunicó posteriormente (verbalmente/fuera del PDF) que deben implementarse **los 5**, con igual peso. Este cambio está **pendiente de confirmación por escrito** — ver nota en `context/requirements.md`. Si en algún momento se recibe una corrección oficial que contradiga esto, `requirements.md` es la fuente de verdad a actualizar primero.

Los 5 subproyectos **comparten una sola infraestructura de aplicación** (login/JWT, cliente HTTP, resiliencia, sistema de diseño) — no se duplica nada de eso 5 veces. Cada subproyecto solo aporta su propia capa `domain/` (lógica de cruce específica) y su propia vista en `ui/`.

El valor del proyecto **no está en el diseño visual**, está en:
1. La lógica de cruce de datos entre múltiples endpoints, distinta en cada uno de los 5 subproyectos.
2. El manejo robusto de errores HTTP (401, 429, 500) y de red — incluyendo el **reto de resiliencia específico de cada subproyecto** (5 retos distintos, ver sección 10).
3. Un código que el estudiante pueda defender y explicar línea por línea en una defensa oral en vivo, para cualquiera de los 5 que el profesor elija revisar.

Consulta `context/requirements.md` para el detalle funcional completo de los 5 subproyectos, `context/DESIGN.md` para la dirección visual (dark UI, liquid glass, degradados animados, tipografía), y `context/api-reference.md` para los schemas JSON reales de cada endpoint (nombres de campo exactos, tipos de dato, casos borde — **`/get/groups` todavía no está documentado ahí, investigar antes de construir El Muro**). Este `CLAUDE.md` es la guía de **cómo construirlo**; los archivos de `/context` son el **qué construir**, **cómo debe verse** y **con qué datos exactos trabajar**.

---

## 2. Stack técnico permitido (restricción dura)

- **JavaScript puro (Vanilla JS), ES6+.** Manipulación de DOM nativa (`document.querySelector`, `createElement`, `addEventListener`, etc.).
- **Tailwind CSS** — único framework permitido, y solo para estilos.
- **`fetch` nativo** para llamadas HTTP.
- **`localStorage`** nativo para caché/offline.
- **Logo WC26:** archivo estático `.png` (ej. `public/wc26-logo.png` o `assets/`), insertado con `<img src="...">`. No es un asset generado por código.
- **Íconos:** Lucide, usados como **SVG inline copiado directo en el HTML/JS** (markup estático desde lucide.dev), **nunca** vía el paquete npm `lucide` ni el script CDN + `lucide.createIcons()` — esa segunda forma introduce una librería de JavaScript en tiempo de ejecución, lo cual rompe la restricción de "sin librerías JS" de este proyecto.

### 🚫 Prohibido usar (sin excepción):
- Cualquier framework o librería de JavaScript: React, Vue, Angular, Svelte, jQuery, Axios, Lodash, etc.
- Bundlers/compiladores complejos que oculten lógica (si se usa un bundler, debe ser mínimo y transparente — ej. Vite solo como dev server, sin introducir dependencias de runtime en JS).
- Cualquier librería de manejo de estado, de fetch, o de UI components.
- El paquete npm `lucide` o su script CDN con `createIcons()` — usar solo el SVG estático de sus íconos, copiado directamente (ver arriba).

**Si Claude Code sugiere instalar una librería de JavaScript para "simplificar" algo (manejo de fechas, HTTP client, state management, iconos), la respuesta correcta es implementarlo a mano en JS puro o SVG estático, no instalar la dependencia.**

---

## 3. Reglas de código no negociables

### 3.1 `async/await` exclusivo
- **Toda** promesa (fetch u otra) se resuelve con `async/await`.
- **Nunca** usar `.then()` / `.catch()` en ningún archivo del proyecto, ni siquiera mezclado con `async/await` en otra función.
- Manejo de errores exclusivamente con `try/catch`.

### 3.2 Prohibiciones absolutas
- ❌ `alert()` — en ningún punto del flujo, ni en debugging, ni en manejo de errores.
- ❌ `.then()` / `.catch()`.
- ❌ `window.location.reload()` (o equivalente, como `location.href = location.href`) para resolver errores de sesión o de red.

Si necesitas notificar algo al usuario, usa componentes de UI propios (toast, modal, banner), nunca `alert()`/`confirm()`/`prompt()`.

### 3.3 Separación de responsabilidades
Ver la estructura de carpetas completa en la **Sección 4**. Regla general: nunca mezclar capas.

- Las funciones en `/api` **solo** hacen fetch y devuelven datos o lanzan errores tipados. Nunca tocan el DOM.
- Las funciones en `/ui` **solo** reciben datos ya procesados y los renderizan. Nunca hacen fetch directamente.
- La lógica de cruce de datos (equipos + partidos + estadios) vive en `/domain`, nunca embebida dentro de un handler de UI ni dentro de una función de `/api`.

---

## 4. Estructura de carpetas del proyecto

Esta es la estructura de referencia. Es intencionalmente compacta — es un laboratorio académico de un solo desarrollador, no un producto de equipo: **la meta es cumplir todo lo exigido de forma ordenada y defendible, no maximizar la cantidad de archivos.** Claude Code debe respetarla al crear o ubicar archivos nuevos; no crear carpetas ni archivos adicionales para lo que ya cabe en uno existente (ej. no separar un archivo por endpoint si son 3 GETs casi idénticos — van juntos).

```
proyecto-ruta-del-campeon/
├── .claude/
│   └── CLAUDE.md             → este archivo — ubicación soportada oficialmente para mantener la raíz del proyecto limpia
├── .gitignore
├── context/
│   ├── requirements.md       → requerimientos funcionales y no funcionales de los 5 subproyectos
│   ├── DESIGN.md             → sistema de diseño: dark UI, liquid glass, degradados animados, tipografía
│   └── api-reference.md      → schemas JSON reales de cada endpoint (campos exactos, tipos de dato, casos borde)
├── README.md                  → vacío por ahora; se completa al final, cuando el proyecto ya funcione (setup, cómo correrlo)
├── index.html
├── package.json              → solo para tooling de Tailwind (build/watch), no runtime de JS
├── tailwind.config.js
│
└── src/
    ├── main.js                → punto de entrada: login gate, navegación entre los 5 subproyectos, wiring de callbacks de resiliencia
    │
    ├── styles/
    │   └── input.css          → directivas @tailwind (base/components/utilities)
    │
    ├── api/                   → CAPA DE DATOS (solo fetch, nunca DOM) — compartida por los 5 subproyectos
    │   ├── httpClient.js      → wrapper authFetch() + integración con backoff (usado por los 5)
    │   ├── authApi.js         → POST /auth/authenticate (login usado por toda la app)
    │   ├── worldCupApi.js     → GET /get/teams, /get/games, /get/stadiums (usados por 2.1, 2.2, 2.4, 2.5)
    │   └── groupsApi.js       → GET /get/groups (solo 2.3, El Muro) — investigar schema antes de escribir
    │
    ├── domain/                → LÓGICA DE NEGOCIO / CRUCE DE DATOS (sin fetch, sin DOM) — un archivo por subproyecto
    │   ├── itineraryService.js       → 2.1 La Ruta del Campeón (✅ ya implementado)
    │   ├── goalsService.js           → 2.2 Rastreador de Goleadas (RF-RG-01 a 06)
    │   ├── wallService.js            → 2.3 El Muro (RF-EM-01 a 04)
    │   ├── stadiumsAnalyticsService.js → 2.4 Analítica de Estadios (RF-AE-01 a 04)
    │   └── drawsService.js           → 2.5 Radar de Empates (RF-RE-01 a 04)
    │
    ├── state/                 → ESTADO Y PERSISTENCIA (sin DOM) — compartido por los 5
    │   └── appState.js        → token/user (auth), caché por endpoint con timestamp, subproyecto activo — todo el estado de la app en un solo módulo, con funciones bien nombradas por responsabilidad
    │
    ├── ui/                    → CAPA DE PRESENTACIÓN (solo DOM, nunca fetch)
    │   ├── loginForm.js       → formulario de login — compartido (reutilizado en pantalla completa y en modal 401)
    │   ├── accountMenu.js     → dropdown del ícono de cuenta — compartido
    │   ├── projectMenu.js     → dropdown "Proyectos" para navegar entre los 5 subproyectos (nuevo, ver sección 6.1)
    │   ├── sessionExpiredModal.js → modal de reautenticación (401), envuelve loginForm.js — compartido
    │   ├── resilienceBanners.js   → banners en tiempo real (countdown 429, backoff 500, badge de caché) — compartido, con `source` namespaced por subproyecto+dataset
    │   ├── teamSelector.js    → 2.1 selector de equipo
    │   ├── itineraryCards.js  → 2.1 tarjetas de itinerario
    │   ├── goalsList.js       → 2.2 lista de goleadas
    │   ├── wallRanking.js     → 2.3 ranking de mejores defensas + próximo rival
    │   ├── stadiumsChart.js   → 2.4 gráfica de barras (SVG/divs, sin librerías)
    │   └── drawsMatrix.js     → 2.5 matriz visual de empates
    │
    └── utils/                 → HELPERS PUROS (sin estado, sin DOM, sin fetch) — compartidos
        ├── backoff.js         → fetchWithBackoff(fetchFn, opciones)
        └── format.js          → formateo de fechas, ciudad/país y otros helpers de presentación
```

**Fuera del árbol de `src/`, sin necesidad de carpetas dedicadas todavía:**
- Assets estáticos (logo `.png`, favicon): ya insertados en `public/`. Íconos de Lucide **no** van aquí como archivos — se copian como SVG inline directo en el código (ver sección 2).
- Salida de build de Tailwind (`dist/` o similar): la genera la herramienta de build; agregar a `.gitignore`, no versionar ni mantener manualmente en el árbol del proyecto.
- `matchesView.js` (vista "Partidos" dentro de 2.1): sigue pausada/a futuro (ver RF-05b en `requirements.md`), sin relación con el cambio de alcance a 5 subproyectos — no confundir "Partidos" (opcional, descartado por ahora) con los 4 subproyectos nuevos (obligatorios).
- Campana de historial (`notificationBell.js`): opcional; si se implementa, es un archivo más dentro de `ui/`, no antes de tener resuelto todo lo obligatorio.

### Reglas de dependencia entre capas (de arriba hacia abajo, nunca al revés)

```
ui  →  domain  →  api
 ↓        ↓         ↓
      state / utils (transversales, usados por cualquier capa)
```

- `ui` puede llamar a `domain` y a `state`, pero **nunca** a `api` directamente.
- `domain` puede llamar a `api` y a `state`, pero **nunca** debe tocar el DOM.
- `api` solo conoce `httpClient` y `utils` (ej. `backoff`). Nunca importa nada de `ui` ni de `domain`.
- `state` y `utils` son transversales y no dependen de ninguna otra capa del proyecto.

Si Claude Code necesita ubicar un archivo nuevo y no encaja claramente en ninguna carpeta, preguntar antes de crear una carpeta nueva no contemplada aquí. Ante la duda entre crear un archivo nuevo o añadir una función a uno existente del mismo dominio de responsabilidad, **preferir añadir a uno existente** — menos archivos que el estudiante tenga que ubicar y explicar de memoria en la defensa oral es una ventaja real, no un defecto.

> **Nota sobre `context/DESIGN.md`:** es la fuente de verdad para paleta de colores, tipografía, efecto liquid glass y fondo animado de toda la interfaz (tarjetas de itinerario, modal de sesión expirada, countdown, indicador offline, etc.). No inventar colores, efectos o tipografías fuera de los tokens definidos ahí — cualquier ajuste visual nuevo debe reflejarse primero en `DESIGN.md` y luego implementarse.

---

## 5. Arquitectura de resiliencia obligatoria

Esta es la parte que más peso tiene en la evaluación y en la defensa oral. Debe implementarse de forma explícita y visible, no como un afterthought. Se construye **una sola vez** (5.1 a 5.4) y la comparten los 5 subproyectos; cada subproyecto además tiene su **propio** reto de resiliencia específico (5.5 es el de 2.1; los de 2.2-2.5 están en la sección 6.2).

### 5.1 Autenticación JWT y pantalla de login

**Endpoints reales de auth (fuera de `/get/*`, no llevan header Authorization):**
```
POST https://worldcup26.ir/auth/register     Body: { name, email, password } → { user, token }
POST https://worldcup26.ir/auth/authenticate Body: { email, password }       → { user, token }
```
El registro se hace una sola vez (fuera de la app, vía Swagger/curl). La app **solo consume `/auth/authenticate`**.

- **Pantalla de login como puerta de entrada obligatoria:** si al cargar la app no hay token válido en `localStorage`, se muestra una pantalla completa de login (sin navbar, sin contenido). El formulario llama a `POST /auth/authenticate`.
- Login exitoso → guardar `token` y `user` (memoria + `localStorage`) → mostrar la app (navbar + vista Itinerarios).
- El componente de login es **el mismo** que se reutiliza dentro del modal de 401 (sección 5.2) — no crear dos formularios de login distintos.
- **Cada** llamada a un endpoint de datos (`/get/teams`, `/get/games`, `/get/stadiums`) debe incluir:
  ```
  Authorization: Bearer <token>
  ```
- Crear un wrapper único de fetch autenticado (ej. `authFetch(url, options)`) para no repetir la lógica del header en cada llamada.

### 5.2 Manejo de error 401
- Si cualquier `authFetch` recibe `401`:
  - Limpiar el token de memoria y de `localStorage`.
  - Disparar un **modal** que renderiza el mismo componente de login de 5.1 (mismo formulario, distinto contenedor: pantalla completa vs. modal).
  - **No** recargar la página. Al reautenticarse desde el modal, cerrar el modal y continuar donde el usuario estaba, sin perder el estado de la UI innecesariamente.

> **⚠️ Nota verificada empíricamente (ver `context/api-reference.md`):** la API real de `worldcup26.ir` **no valida el JWT en absoluto** en `/get/*` — ni firma, ni payload, ni que el header exista. Un token corrupto/inventado igual devuelve `200 OK`. Esto significa que **el 401 no se puede provocar mandando un token inválido contra el servidor real**. Es necesario un mecanismo de debug (solo activo en desarrollo, ej. `if (import.meta.env.DEV)`) que fuerce manualmente un `ApiError(401)` para poder demostrar el modal de sesión expirada en la demo/defensa, sin depender de que el servidor lo dispare. Esto no es una falla del código — el manejo de 401 debe implementarse igual (es requisito literal del enunciado), solo que su demostración es simulada por una limitación de la API de terceros.

### 5.3 Backoff exponencial (429 y 500)
- Ante `429` o `500`, reintentar automáticamente: 1s → 2s → 4s → 8s (o similar, exponencial, con un máximo de reintentos razonable, ej. 4-5).
- El backoff debe ser **por petición individual**, no global — si falla `/get/stadiums`, solo esa petición reintenta; `/get/teams` y `/get/games` no se ven afectadas si ya resolvieron.
- Para `429` específicamente: mostrar un **countdown visible** (segundos restantes hasta el próximo intento) en la UI, actualizado en tiempo real.
- Implementar esto como una función utilitaria reusable, ej. `fetchWithBackoff(fetchFn, { maxRetries, onRetry, onCountdown })`, no duplicar la lógica de reintento en cada llamada.

### 5.4 Modo offline con `localStorage`
- Cada respuesta exitosa de `/get/teams`, `/get/games`, `/get/stadiums` se cachea en `localStorage` con una key clara (ej. `cache:teams`, `cache:games`, `cache:stadiums`) y timestamp.
- Si una petición nueva falla (después de agotar los reintentos de backoff) y existe copia cacheada, mostrar esos datos con un indicador visible tipo "⚠️ Datos no actualizados (última sincronización: hh:mm)".

### 5.5 Reto de resiliencia específico de 2.1 (La Ruta del Campeón)
> Si `/get/stadiums` falla **después** de que el itinerario ya se renderizó con los partidos:
> - Las tarjetas de partidos ya renderizadas **permanecen visibles**, no se destruyen ni se re-renderiza todo desde cero.
> - Solo el campo de estadio en las tarjetas afectadas cambia a **"Estadio no disponible"**.
> - Solo la petición de `/get/stadiums` entra en backoff exponencial; los partidos ya obtenidos de `/get/games` **no se vuelven a pedir**.

Este comportamiento implica que el render de tarjetas debe ser **incremental/parcial**: debe existir una función que actualice solo el campo de estadio de una tarjeta específica por su `stadium_id`/`game_id`, sin re-renderizar toda la lista.

---

## 6. Endpoints y modelo de cruce de datos

**Base URL:** `https://worldcup26.ir`

Los nombres de campo exactos, tipos de dato y casos borde de cada endpoint (`teams`, `games`, `stadiums`) están documentados en detalle en `context/api-reference.md` — consultarlo antes de escribir cualquier función de `/api`, en vez de asumir nombres de campo.

**Flujo de cruce de datos:**
1. `GET /get/teams` → poblar selector (48 equipos).
2. Usuario elige equipo → filtrar `GET /get/games` donde `home_team_id === team.id OR away_team_id === team.id`.
3. Ordenar partidos filtrados por `local_date` ascendente.
4. Por cada partido, cruzar `stadium_id` contra `GET /get/stadiums` → obtener `city_en`, país, `capacity`.
5. Renderizar itinerario de tarjetas (una por partido) con: nombre completo del rival (no código de 3 letras), fecha, nombre completo del estadio, ciudad + país (línea separada, texto explícito), aforo.
6. Calcular `count(distinct city_en)` sobre los partidos encontrados y mostrarlo.

**Importante — condiciones de carrera:** las peticiones a `/get/teams`, `/get/games` y `/get/stadiums` pueden completarse en cualquier orden. El código debe garantizar el resultado correcto sin importar el orden de llegada (ej. no asumir que `teams` siempre resuelve antes que `games`).

### 6.1 Navegación de la app

Navbar con **dropdown "Proyectos"** en vez de pestañas sueltas (5 nombres completos no caben en una fila):

| Elemento | Contenido | Endpoints |
|---|---|---|
| **Logo** | Archivo `.png` propio (`public/logo.png`), ya implementado | — |
| **Dropdown "Proyectos"** | Al desplegar: los 5 subproyectos por su **nombre oficial del catálogo**, sin abreviar (La Ruta del Campeón, Rastreador de Goleadas, El Muro, Analítica de Estadios, Radar de Empates). Mismo patrón visual que `accountMenu.js` | según el subproyecto elegido |
| **Ícono de campana** (opcional) | Historial de eventos de resiliencia recientes — complementa, no reemplaza los chips en tiempo real | ninguno adicional |
| **Ícono de cuenta** | Dropdown con nombre/email del `user` + chip "Sesión activa" + botón "Cerrar sesión". **Nunca mostrar términos técnicos** (JWT, Bearer token, etc.) | ninguno adicional |

**"Partidos"** (vista opcional dentro de 2.1) sigue pausada — no confundir con los 4 subproyectos nuevos, que sí son obligatorios.

> **Regla obligatoria — countdown/offline en tiempo real:** el countdown de 429 (RF-09) y el indicador de datos cacheados (RF-10) deben aparecer automáticamente en pantalla apenas ocurre el estado, **sin requerir que el usuario abra nada**, en los 5 subproyectos por igual.

---

## 6.2 Subproyectos 2.2 a 2.5 — notas de implementación para Claude Code

Detalle funcional completo en `context/requirements.md` secciones 9-12. Aquí solo las notas técnicas que no están en el enunciado y que ya se descubrieron trabajando con esta API real (ver `context/api-reference.md`):

### 2.2 Rastreador de Goleadas
- `home_score`, `away_score`, `finished` llegan como **string** en `/get/games` — convertir antes de operar (`Number(...)`, comparar `=== "TRUE"` no `=== true`).
- El reto de resiliencia (RF-RG-R) requiere que `goalsService.js` pueda construir la lista **sin** datos de `teams` (usando ids como placeholder) y luego **re-cruzar** cuando `teams` llegue tarde — diseñar la función de cruce para que sea llamable dos veces sobre el mismo resultado base, no solo una vez al inicio.

### 2.3 El Muro
- **Antes de escribir código:** investigar el schema real de `/get/groups` (nombres de campo, si `ga` es string o número, cómo vienen los equipos anidados dentro de cada grupo) — no asumir nada, seguir el mismo método de verificación empírica que se usó para `teams`/`games`/`stadiums` (curl/fetch directo + inspección de la respuesta real).
- El reto de resiliencia (RF-EM-R) implica 5 búsquedas de "próximo rival" independientes — cada una debe manejar su propio fallo sin bloquear las otras 4. Esto es distinto a RF-11 (que es 1 sola petición fallando): aquí son 5 peticiones/cálculos paralelos, cada uno con su propio estado de éxito/fallo por equipo.

### 2.4 Analítica de Estadios
- La gráfica de barras debe construirse sin librerías (prohibidas, ver sección 2) — usar `<div>` con `height`/`width` calculado en JS a partir del valor máximo del dataset (normalizar a un % del contenedor), o SVG con `<rect>` generados dinámicamente. Debe seguir el lenguaje visual de `context/DESIGN.md` (glass, paleta de acento), no un gráfico genérico de librería.
- El reto de resiliencia (RF-AE-R) depende de **orden**: estadios deben cargar primero para que las barras existan antes de que games pueda fallar — si se piden en paralelo sin control de orden, este escenario podría no ser reproducible de forma confiable para la demo. Considerar si conviene pedir `stadiums` y `games` de forma controlada (no necesariamente secuencial estricta, pero sí con manejo explícito de qué pasa si uno resuelve mucho antes que el otro).

### 2.5 Radar de Empates
- Igual que 2.2, cuidado con tipos string en `home_score`/`away_score`/`finished`.
- El reto de resiliencia (RF-RE-R) menciona explícitamente "mientras se está construyendo la matriz grupo por grupo" — esto sugiere que el render debe ser incremental (grupo A, luego B, luego C...), no un solo cálculo que arma toda la matriz de golpe. Diseñar `drawsMatrix.js` para pintar de forma progresiva por grupo, de modo que un 429 a mitad de camino deje ver los grupos ya pintados, consistente con el patrón de actualización parcial ya usado en RF-11.

---

## 7. Convenciones de código

- Nombrado de funciones en inglés, comentarios y mensajes de UI en español (idioma del curso/defensa).
- Cada función exportada de `/api` debe tener un comentario breve explicando qué hace y qué errores puede lanzar.
- Evitar "código mágico" generado sin explicación: cada bloque no trivial (especialmente backoff, manejo de 401, cruce de datos) debe tener comentarios que permitan al estudiante explicarlo en la defensa oral.
- Preferir funciones puras y pequeñas sobre funciones largas que mezclen fetch + lógica + DOM.
- Nombres de variables descriptivos relacionados al dominio (`selectedTeamId`, `stadiumsById`, `retryCount`), no genéricos (`data`, `temp`, `x`).

---

## 8. Qué NO hacer al generar código

- No propongas instalar paquetes npm de runtime para JS (solo Tailwind vía su CLI/build es aceptable).
- No uses `.then()` "solo para esta parte" — siempre `async/await` + `try/catch`.
- No uses `alert()`/`confirm()` como solución rápida para mostrar errores o confirmaciones.
- No resuelvas el 401 recargando la página.
- No mezcles lógica de fetch dentro de funciones de renderizado del DOM.
- No re-renderices toda la lista de tarjetas cuando solo cambia un campo de una tarjeta (rompe el reto de resiliencia de la sección 5.5).
- No generes código que el estudiante no pueda explicar: prioriza claridad sobre "cleverness".

---

## 9. Criterio de éxito funcional (checklist)

### 2.1 La Ruta del Campeón — ✅ ya implementado y verificado (no repetir esta lista, solo referencia)
- [x] Login, JWT, arquitectura de resiliencia completa (401/429/500/offline), RF-01 a RF-05, RF-11, accesibilidad, hover, logo.

### Infraestructura compartida (una sola vez, ya construida — reutilizar para 2.2-2.5)
- [x] `httpClient.js`, `backoff.js`, `resilienceBanners.js`, `loginForm.js`, `sessionExpiredModal.js`, `accountMenu.js`.
- [ ] `projectMenu.js` (dropdown "Proyectos") — nuevo, pendiente.
- [ ] `groupsApi.js` (`/get/groups`) — nuevo, pendiente, solo para 2.3.

### 2.2 Rastreador de Goleadas — pendiente
- [ ] Filtrar `finished` (string) → diferencia de goles (convertir a número) ≥ 3 → ordenar desc.
- [ ] Cruce con `/get/teams` para nombre/bandera reales, nunca id crudo (salvo degradación).
- [ ] Contador total en cabecera.
- [ ] RF-RG-R: si falla `/get/teams`, renderiza igual con ids, reintenta en segundo plano, actualiza sola al recuperar.

### 2.3 El Muro — pendiente
- [ ] Investigar schema real de `/get/groups` antes de escribir código (documentar en `api-reference.md`).
- [ ] Extraer `team_id`+`ga` de los 12 grupos → unificar 48 registros → ordenar asc por `ga`.
- [ ] Top 5 cruzado con `/get/teams`.
- [ ] Próximo rival de cada uno de los 5 (búsqueda independiente por equipo).
- [ ] RF-EM-R: fallo aislado por equipo (1 de 5) no bloquea los otros 4.

### 2.4 Analítica de Estadios — pendiente
- [ ] Conteo de partidos por estadio + asistencia potencial (`capacity` × partidos) → ordenar desc.
- [ ] Gráfica de barras construida a mano (SVG/divs), sin librerías.
- [ ] RF-AE-R: si `games` falla después de que `stadiums` ya cargó, estado "esperando datos de partidos" sin destruir barras ya dibujadas.

### 2.5 Radar de Empates — pendiente
- [ ] Filtrar empates (`home_score === away_score`, `finished`, cuidado con tipos string) → agrupar por `group` (A-L).
- [ ] Matriz visual con equipos cruzados contra `/get/teams`.
- [ ] Contador de empates por grupo.
- [ ] RF-RE-R: 429 durante construcción incremental de la matriz solo bloquea el grupo pendiente; grupos ya dibujados persisten.

### Reglas globales, válidas para los 5 (recordatorio)
- [ ] Cero `alert()`, cero `.then()/.catch()`, cero `window.location.reload()` en todo el repo, en los 5 subproyectos.
- [ ] Cada subproyecto maneja 401/429/500/offline con la misma infraestructura compartida, sin duplicar lógica.
- [ ] Nombres completos de equipos en todas partes, nunca códigos/ids crudos (salvo degradación explícita documentada).
