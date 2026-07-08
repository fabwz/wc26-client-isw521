# Requisitos del Sistema — "La Ruta del Campeón"
**ISW-521 · Proyecto Final · Categoría A: Cruce de Datos y Analítica**

---

## 1. Descripción General

Aplicación JavaScript interactiva que consume la API REST pública del Mundial 2026 para construir una **vista derivada** (itinerario de un equipo) cruzando tres colecciones distintas de datos: equipos, partidos y estadios. El foco del proyecto está en la **lógica de cruce de datos** y en la **resiliencia ante fallos de red/API**, no en el maquetado visual.

---

## 2. Stack Técnico del Proyecto

- **Lenguaje:** JavaScript (Vanilla JS — **sin frameworks ni librerías de JS**, DOM nativo obligatorio)
- **Estilos:** Tailwind CSS (único framework permitido, exclusivo para CSS)
- **Almacenamiento local:** `localStorage`
- **API externa:** `https://worldcup26.ir`

> ⚠️ **Restricción crítica:** no se permite ningún framework o librería de JavaScript (React, Vue, jQuery, Axios, etc.). Toda manipulación del DOM, manejo de eventos, fetch y lógica de estado debe hacerse en JavaScript puro. El uso de frameworks está permitido **únicamente para CSS** (Tailwind).

---

## 3. Endpoints a Consumir

| Endpoint | Uso en el proyecto |
|---|---|
| `POST /auth/register` | Registro de cuenta (una sola vez, fuera del flujo normal de la app — puede hacerse vía Swagger/curl) |
| `POST /auth/authenticate` | Login: `{ email, password }` → `{ user, token }` |
| `GET /get/teams` | Poblar selector de 48 equipos; cruzar nombre/bandera; vista "Partidos" |
| `GET /get/games` | Filtrar partidos por equipo seleccionado; calendario completo en "Partidos" |
| `GET /get/stadiums` | Cruzar `stadium_id` para obtener ciudad, país, aforo |

Todas las peticiones a **endpoints de datos** (`/get/*`) deben incluir el encabezado:
```
Authorization: Bearer <token>
```
El `token` se obtiene autenticándose vía `POST /auth/authenticate` (email + password) y expira a los 84 días. Los endpoints `/auth/*` no llevan este header (son los que lo generan).

---

## 4. Requisitos Funcionales del Subproyecto

### RF-01 — Selector de equipos
- Poblar un `<select>` (o componente equivalente) con los 48 equipos obtenidos de `/get/teams`.
- Debe mostrarse el **nombre completo real** del equipo (ej. "México"), nunca el `id` ni un código abreviado (ej. "MEX"). Este mismo criterio aplica en todas partes donde se muestre un equipo, incluido el encabezado de cada tarjeta de partido ("México vs Polonia", no "MEX vs POL").

### RF-02 — Filtrado de partidos por equipo
- Al elegir un equipo, obtener de `/get/games` **todos** los partidos donde el `id` del equipo coincida con `home_team_id` **o** `away_team_id`.
- Ordenar los partidos resultantes por `local_date` (ascendente).

### RF-03 — Cruce con estadios
- Por cada partido filtrado, cruzar el campo `stadium_id` contra `/get/stadiums`.
- Mostrar en cada partido, **como texto explícito y completo, no como códigos o abreviaciones**:
  - **Estadio:** nombre completo del recinto (ej. "Estadio BBVA"), no un código de 3 letras.
  - **Ciudad, país:** en un campo/línea separada del estadio (ej. "Monterrey, México").
  - **Aforo:** capacidad del recinto.
- Esto es un requisito literal del enunciado ("mostrar ciudad, país y aforo del recinto") — un código abreviado que haya que interpretar no satisface el requisito de forma defendible.

> **Nota — campo `group`:** cada partido de `/get/games` ya incluye un campo `group` de forma nativa, **sin necesidad de consumir `/get/groups`**. En fase de grupos trae una letra (`A`...`L`); en fase eliminatoria trae el código de la ronda, no una letra de grupo: `R32` (ronda de 32), `R16` (ronda de 16), `QF` (cuartos de final), `SF` (semifinal), `3RD` (partido por el tercer puesto), `FINAL` (final). El chip de la tarjeta debe mostrar la etiqueta correcta según el valor — nunca anteponer la palabra "Grupo" a un código de ronda eliminatoria (ej. "Grupo R32" es incorrecto; debe decir "Ronda de 32").

### RF-04 — Renderizado tipo itinerario
- El resultado se debe renderizar como un **itinerario de tarjetas** (una tarjeta por partido).
- Prohibido presentar el resultado como tabla plana.

### RF-05 — Cálculo de ciudades distintas
- Calcular y mostrar el número de **ciudades distintas** (`city_en`) que el equipo seleccionado visitaría, según los partidos encontrados (sin duplicados).

### RF-05b — Vista "Partidos" (calendario completo) — **OPCIONAL / A FUTURO, no prioritario**
> ⚠️ Esta sección **no aparece en el enunciado** y no forma parte del alcance evaluado de "La Ruta del Campeón". Se documenta aquí solo como especificación de referencia por si se retoma más adelante, **una vez que todo lo obligatorio (RF-01 a RF-11) esté sólido y bien defendible**. No priorizar su desarrollo sobre la arquitectura de resiliencia ni sobre la preparación de la defensa oral.
- Sección adicional, dentro del alcance técnico del subproyecto si se llegara a implementar (mismos endpoints `/get/games` + `/get/teams`, sin filtrar por equipo).
- Muestra **todos** los partidos del torneo, con nombre/bandera de local y visitante cruzados desde `/get/teams`.
- Reutiliza la misma capa `/api` y `/domain` que la vista Itinerario; no introduce endpoints nuevos ni lógica de cruce adicional.
- Aplicaría la misma arquitectura de resiliencia (RF-06 a RF-10) que el resto de la app.

---

## 5. Arquitectura Base de Resiliencia (obligatoria para todo el proyecto)

### RF-06 — Autenticación JWT y pantalla de login
- **Pantalla de login como puerta de entrada obligatoria**: si al cargar la app no hay un token válido almacenado, se muestra una pantalla completa de login (email + password), sin acceso a navbar ni contenido de la app.
- El formulario llama a `POST /auth/authenticate` con `{ email, password }` y recibe `{ user, token }`.
- El mismo componente de login se **reutiliza dentro del modal de "sesión expirada"** (ver RF-08) cuando ocurre un 401 a mitad de uso — no se duplica la lógica de autenticación en dos flujos distintos.
- Login exitoso → guardar `token` (memoria + `localStorage`) y guardar datos de `user` → transicionar a la vista principal.
- Enviar el token en **cada** petición a endpoints de datos (`/get/*`) vía `Authorization: Bearer <token>`. Ninguna llamada a un endpoint de datos puede omitir este encabezado. Los endpoints `/auth/*` no llevan este header.

### RF-07 — `async/await` exclusivo
- Toda llamada `fetch` se resuelve con `async/await`.
- **Prohibido** usar `.then()` / `.catch()` en cualquier parte del código, incluso si conviven con `async/await` en otro archivo.

### RF-08 — Manejo de error 401 (sesión expirada)
- Si la API responde `401`:
  - Limpiar el token guardado (localStorage / memoria).
  - Mostrar un **modal de "sesión expirada"** que contiene el mismo formulario de login de RF-06 (mismo componente, distinto contenedor: pantalla completa vs. modal).
  - Reautenticación exitosa desde el modal → cerrar modal y continuar en la vista donde el usuario estaba (sin perder el estado de navegación innecesariamente).
  - **Prohibido** usar `window.location.reload()` o equivalente.

### RF-09 — Backoff exponencial (errores 500 y 429)
- Ante un error `500` (servidor) o `429` (rate limit), reintentar automáticamente con espera creciente (ej. 1s → 2s → 4s → 8s).
- Para el caso específico de `429`: mostrar un **countdown visible** (cuenta atrás en segundos) indicando cuándo ocurrirá el siguiente reintento automático.
- **"Visible" implica en tiempo real y sin acción del usuario**: el countdown debe aparecer automáticamente en pantalla (chip/banner flotante) apenas ocurre el 429, no puede estar oculto detrás de un ícono/campana que haya que abrir para verlo. Un historial en una campana puede añadirse como complemento opcional, nunca como reemplazo.

### RF-10 — Modo offline con `localStorage`
- Guardar en `localStorage` la última respuesta exitosa de **cada endpoint** (`teams`, `games`, `stadiums`).
- Si una petición nueva falla y existe copia cacheada, mostrar esos datos junto con un **indicador visible** de que son datos no actualizados (ej. badge "Datos en caché").
- Mismo criterio de RF-09: el indicador debe aparecer automáticamente en tiempo real, sin requerir que el usuario abra nada para verlo.

---

## 6. Reto de Resiliencia Específico del Subproyecto

### RF-11 — Fallo aislado de `/get/stadiums`
- Si la petición a `/get/stadiums` falla **después** de que el itinerario ya se renderizó con los partidos:
  - Las tarjetas de partidos ya renderizadas **no deben desaparecer**.
  - El campo de estadio en cada tarjeta afectada debe mostrar **"Estadio no disponible"**.
  - Solo la petición de estadios entra en backoff exponencial.
  - Los partidos ya obtenidos **no se vuelven a pedir**.

---

## 7. Prohibiciones Absolutas (invalidan el proyecto si aparecen)

- ❌ `alert()` en cualquier punto del flujo, incluyendo manejo de errores.
- ❌ `.then()` o `.catch()`, aunque convivan con `async/await` en otra parte del código.
- ❌ `window.location.reload()` (o equivalente) como mecanismo para resolver un error de sesión o de red.

---

## 8. Requisitos No Funcionales

### RNF-01 — Separación de responsabilidades
- La lógica de `fetch` (capa de datos) debe estar claramente separada de la lógica de presentación (DOM/UI).

### RNF-02 — Manejo explícito de errores HTTP
- Toda llamada asíncrona debe distinguir y manejar explícitamente los códigos de error (401, 429, 500), no solo el caso exitoso ("happy path").

### RNF-03 — Tolerancia a condiciones de carrera
- El código debe garantizar un resultado correcto en el cruce de datos (equipos, partidos, estadios) sin importar el orden en que lleguen las respuestas de las distintas peticiones asíncronas.

### RNF-04 — Verificabilidad en DevTools
El sistema debe poder demostrarse en vivo mediante las herramientas de desarrollador del navegador:
- **Console:** captura visible del error (401, 429 o 500) sin que la aplicación se rompa visualmente ni quede en blanco.
- **Network:** debe poder observarse el estado de la petición fallida (código de estado, encabezados, cuerpo de respuesta) y, si aplica, los reintentos generados por el backoff exponencial junto con sus tiempos de espera.

### RNF-05 — Comprensión y mantenibilidad del código
- El código (propio o generado con apoyo de IA) debe ser lo suficientemente claro y comentado para poder explicarse y justificarse línea por línea, incluyendo decisiones de diseño relacionadas con el manejo de errores y el cruce de datos.

---

## 9. Navegación de la Aplicación

Navbar **actual** (versión a construir ahora), dentro del alcance del subproyecto:

| Elemento | Contenido | Endpoints usados |
|---|---|---|
| **Logo WC26** | Placeholder hasta insertar el asset oficial (no se genera ni replica el logo de FIFA) | — |
| **Itinerarios** | Única sección funcional: selector de equipo + itinerario de tarjetas + contador de ciudades (RF-01 a RF-05) | `/get/teams`, `/get/games`, `/get/stadiums` |
| **Ícono de campana** (opcional) | Historial de eventos de resiliencia recientes (429, offline). Complementa, no reemplaza los chips en tiempo real de RF-09/RF-10 | usa datos ya emitidos por esos eventos, sin llamada adicional |
| **Ícono de cuenta** | Dropdown con nombre/email del `user` autenticado + chip "Sesión activa" + botón "Cerrar sesión". **Sin jerga técnica visible** (nada de "JWT"/"Bearer token" en la UI) | usa datos ya obtenidos en el login, sin llamada adicional |

**"Partidos" queda pausado / a futuro** (ver RF-05b): no se construye por ahora. Prioridad total en dejar sólido y bien defendible todo lo obligatorio antes de retomarlo.

No se incluye una sección "Standings"/tabla de posiciones: requeriría `GET /get/groups`, endpoint fuera del alcance de este subproyecto (pertenece a "El Muro", 2.3 del enunciado). El campo `group` de cada partido individual sí está disponible nativamente en `/get/games` y puede mostrarse en las tarjetas sin problema (ver nota en RF-03) — recordando que en fase eliminatoria contiene un código de ronda (`R32`, `QF`, etc.), no una letra de grupo.

---

## 10. Resumen de Estados de UI a Contemplar

| Estado | Disparador | Comportamiento esperado |
|---|---|---|
| Sin sesión | Carga inicial sin token válido en storage | Pantalla de login completa (sin navbar) |
| Carga inicial (con sesión) | Fetch en curso | Indicador de carga (spinner/skeleton) |
| Éxito | Respuesta 200 OK | Render normal de datos |
| Sesión expirada | 401 | Modal de reautenticación (mismo componente de login), limpiar token |
| Límite de tasa | 429 | Backoff exponencial + countdown visible |
| Error de servidor | 500 | Backoff exponencial, sin romper la UI |
| Sin conexión / fallo con caché disponible | Fetch falla + hay dato en localStorage | Mostrar dato cacheado + indicador "no actualizado" |
| Fallo parcial (estadios) | `/get/stadiums` falla tras render de partidos | Tarjetas persisten, campo estadio = "Estadio no disponible" |

---

## 11. Fuera de Alcance (explícitamente no requerido)

- Diseño visual elaborado / pixel-perfect (el foco es la lógica de cruce y resiliencia, no el maquetado).
- Uso de cualquier framework o librería de **JavaScript** (React, Vue, jQuery, Axios, etc.) — **no permitido bajo ninguna circunstancia**.
- Persistencia en backend propio (todo el estado vive en el cliente vía `localStorage`).
- Tabla de posiciones/"Standings" (requiere `/get/groups`, endpoint fuera de este subproyecto).
