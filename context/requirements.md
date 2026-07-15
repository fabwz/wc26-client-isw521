# Requisitos del Sistema — Categoría A: Cruce de Datos y Analítica (5 subproyectos)
**ISW-521 · Proyecto Final**

> ⚠️ **Actualización de alcance:** el enunciado original (PDF) especificaba elegir **un** subproyecto del catálogo. El profesor comunicó posteriormente (fuera del PDF) que **deben implementarse los 5 subproyectos**, con igual peso de evaluación entre ellos. Este documento refleja esa instrucción actualizada. **Pendiente:** obtener confirmación por escrito de este cambio (correo/plataforma del curso), dado que contradice el texto literal del PDF original.

---

## 1. Descripción General

Aplicación JavaScript interactiva (SPA sin framework) que consume la API REST pública del Mundial 2026 (`https://worldcup26.ir`) para construir **cinco vistas derivadas distintas**, cada una cruzando distintas colecciones de datos (equipos, partidos, grupos, estadios) para producir información que no existe como tal en ningún endpoint individual. Cada subproyecto vive en **su propia ventana/vista** dentro de la misma aplicación, accesible desde un menú de navegación compartido.

Toda la aplicación comparte una única capa de: autenticación JWT, cliente HTTP, manejo de resiliencia (401/429/500/offline) y sistema de diseño — construida una sola vez y reutilizada por los 5 subproyectos, en vez de duplicarse cinco veces.

El foco de cada subproyecto está en la **lógica de cruce de datos** específica y en la **resiliencia ante fallos de red/API**, no en el maquetado visual.

---

## 2. Stack Técnico del Proyecto

- **Lenguaje:** JavaScript (Vanilla JS — **sin frameworks ni librerías de JS**, DOM nativo obligatorio)
- **Estilos:** Tailwind CSS (único framework permitido, exclusivo para CSS)
- **Almacenamiento local:** `localStorage`
- **API externa:** `https://worldcup26.ir`

> ⚠️ **Restricción crítica:** no se permite ningún framework o librería de JavaScript (React, Vue, jQuery, Axios, etc.). Toda manipulación del DOM, manejo de eventos, fetch y lógica de estado debe hacerse en JavaScript puro. El uso de frameworks está permitido **únicamente para CSS** (Tailwind). Esto incluye **cero librerías de gráficas** para Analítica de Estadios (2.4) — la gráfica de barras debe construirse a mano (SVG o `<div>`s con altura/ancho proporcional), no con Chart.js ni similares.

---

## 3. Endpoints a Consumir (todos los subproyectos)

| Endpoint | Usado por |
|---|---|
| `POST /auth/register` | Registro de cuenta (una sola vez, fuera del flujo normal de la app — vía Swagger/curl) |
| `POST /auth/authenticate` | Login: `{ email, password }` → `{ user, token }` — **compartido por los 5 subproyectos** (un solo login para toda la app) |
| `GET /get/teams` | 2.1, 2.2, 2.3, 2.5 |
| `GET /get/games` | 2.1, 2.2, 2.3, 2.4, 2.5 |
| `GET /get/stadiums` | 2.1, 2.4 |
| `GET /get/groups` | 2.3 (El Muro) — schema confirmado en `context/api-reference.md` |

Todas las peticiones a **endpoints de datos** (`/get/*`) deben incluir el encabezado:
```
Authorization: Bearer <token>
```
El `token` se obtiene autenticándose vía `POST /auth/authenticate` (email + password) y expira a los 84 días. Los endpoints `/auth/*` no llevan este header.

---

## 4. Arquitectura Base de Resiliencia (compartida por los 5 subproyectos)

Esta arquitectura se construye **una sola vez** a nivel de aplicación (no se duplica por subproyecto) y la usan las 5 vistas por igual.

### RF-06 — Autenticación JWT y pantalla de login
- **Pantalla de login como puerta de entrada obligatoria**: si al cargar la app no hay un token válido almacenado, se muestra una pantalla completa de login (email + password), sin acceso a navegación ni contenido de ningún subproyecto.
- El formulario llama a `POST /auth/authenticate` con `{ email, password }` y recibe `{ user, token }`.
- El mismo componente de login se **reutiliza dentro del modal de "sesión expirada"** (ver RF-08) cuando ocurre un 401 a mitad de uso, en cualquiera de los 5 subproyectos — no se duplica la lógica de autenticación.
- Login exitoso → guardar `token` (memoria + `localStorage`) y guardar datos de `user` → transicionar a la vista principal (el subproyecto activo, o el selector de subproyectos).
- Enviar el token en **cada** petición a endpoints de datos (`/get/*`) vía `Authorization: Bearer <token>`. Ninguna llamada a un endpoint de datos puede omitir este encabezado, en ningún subproyecto.

### RF-07 — `async/await` exclusivo
- Toda llamada `fetch` se resuelve con `async/await`, en los 5 subproyectos sin excepción.
- **Prohibido** usar `.then()` / `.catch()` en cualquier parte del código.

### RF-08 — Manejo de error 401 (sesión expirada)
- Si la API responde `401` (en la petición de **cualquier** subproyecto):
  - Limpiar el token guardado (localStorage / memoria).
  - Mostrar un **modal de "sesión expirada"** que contiene el mismo formulario de login de RF-06.
  - Reautenticación exitosa desde el modal → cerrar modal y continuar en el subproyecto/vista donde el usuario estaba.
  - **Prohibido** usar `window.location.reload()` o equivalente.

### RF-09 — Backoff exponencial (errores 500 y 429)
- Ante un error `500` o `429` en la petición de **cualquier** subproyecto, reintentar automáticamente con espera creciente (1s → 2s → 4s → 8s).
- Para `429`: mostrar un **countdown visible** en tiempo real, sin acción del usuario, nunca oculto detrás de un ícono que haya que abrir.
- Cada subproyecto puede tener múltiples peticiones en paralelo (ej. El Muro pide 3 endpoints); cada una debe manejar su propio ciclo de backoff sin interferir con las demás (ver la lección aprendida documentada en `CLAUDE.md` sobre namespacing de banners por `source`).

### RF-10 — Modo offline con `localStorage`
- Guardar en `localStorage` la última respuesta exitosa de **cada endpoint** consumido por cualquier subproyecto (`teams`, `games`, `stadiums`, `groups`).
- Si una petición nueva falla y existe copia cacheada, mostrar esos datos junto con un **indicador visible en tiempo real** de que son datos no actualizados.

---

## 5. Prohibiciones Absolutas (invalidan el proyecto si aparecen, en cualquier subproyecto)

- ❌ `alert()` en cualquier punto del flujo, incluyendo manejo de errores, en cualquiera de los 5 subproyectos.
- ❌ `.then()` o `.catch()`, aunque convivan con `async/await` en otra parte del código.
- ❌ `window.location.reload()` (o equivalente) como mecanismo para resolver un error de sesión o de red.

---

## 6. Requisitos No Funcionales (aplican a los 5 subproyectos por igual)

### RNF-01 — Separación de responsabilidades
- La lógica de `fetch` (capa de datos) debe estar claramente separada de la lógica de presentación (DOM/UI), en cada uno de los 5 subproyectos.
- La capa `api/` no debe importar ni conocer nada de `ui/` (usar inyección de dependencias por callback si `api/` necesita disparar una actualización visual — ver el patrón ya corregido en `CLAUDE.md` para 2.1).

### RNF-02 — Manejo explícito de errores HTTP
- Toda llamada asíncrona, en cualquier subproyecto, debe distinguir y manejar explícitamente los códigos de error (401, 429, 500), no solo el caso exitoso.

### RNF-03 — Tolerancia a condiciones de carrera
- El código debe garantizar un resultado correcto en el cruce de datos sin importar el orden en que lleguen las respuestas de las distintas peticiones asíncronas — crítico especialmente en 2.3 (El Muro, 3 endpoints) y 2.4 (2 endpoints con dependencia de orden en su reto de resiliencia).

### RNF-04 — Verificabilidad en DevTools
- Cada uno de los 5 subproyectos debe poder demostrarse en vivo en Console (captura del error sin romper la UI) y Network (código de estado, encabezados, cuerpo de respuesta, timing de reintentos).

### RNF-05 — Comprensión y mantenibilidad del código
- El código debe ser explicable línea por línea para los 5 subproyectos por igual, incluyendo decisiones de diseño de manejo de errores y cruce de datos de cada uno.

---

## 7. Navegación de la Aplicación

Dado que 5 nombres completos de subproyectos no caben en una navbar de una sola fila, se usa un **menú desplegable "Proyectos"** (mismo patrón que el dropdown de cuenta ya construido):

| Elemento | Contenido |
|---|---|
| **Logo** | Logo propio del proyecto ("La Ruta del Campeón"), ya implementado |
| **Dropdown "Proyectos"** (o nombre del proyecto activo + `▾`) | Al desplegar, muestra los 5 subproyectos por su **nombre oficial del catálogo** (sin abreviar ni renombrar, para trazabilidad directa con el enunciado en la defensa):<br>1. La Ruta del Campeón<br>2. Rastreador de Goleadas<br>3. El Muro<br>4. Analítica de Estadios<br>5. Radar de Empates |
| **Ícono de cuenta** | Sin cambios — dropdown con user/logout, compartido por los 5 |

No se incluye una sección "Standings" genérica adicional — El Muro (2.3) ya cubre el uso de `/get/groups` con su propósito específico definido en el enunciado.

---

## 8. Subproyecto 2.1 — La Ruta del Campeón ✅ *(implementado y verificado)*

**Objetivo técnico:** cruzar equipos + partidos + estadios para construir el itinerario de viaje de un equipo.
**Endpoints:** `/get/teams`, `/get/games`, `/get/stadiums`.

### RF-01 — Selector de equipos
- Poblar un `<select>` con los 48 equipos de `/get/teams`, mostrando `name_en` completo, nunca `fifa_code` ni `id`.

### RF-02 — Filtrado de partidos por equipo
- Al elegir un equipo, obtener de `/get/games` los partidos donde el `id` coincida con `home_team_id` o `away_team_id`, ordenados por `local_date` ascendente.

### RF-03 — Cruce con estadios
- Cruzar `stadium_id` contra `/get/stadiums`. Mostrar como texto explícito y completo (nunca códigos): nombre del estadio, ciudad+país en línea separada, aforo.
- Nota del campo `group`: en fase de grupos trae letra (A-L); en eliminatorias trae código de ronda (`R32`, `R16`, `QF`, `SF`, `3RD`, `FINAL`) — nunca anteponer "Grupo" a un código de ronda.

### RF-04 — Renderizado tipo itinerario
- Tarjetas, una por partido — nunca tabla plana.

### RF-05 — Cálculo de ciudades distintas
- Contar `city_en` distintas entre los partidos encontrados.

### RF-05b — Vista "Partidos" (calendario completo) — **opcional/a futuro, sin cambios de prioridad**

### RF-11 — Reto de resiliencia: fallo aislado de `/get/stadiums`
- Si `/get/stadiums` falla después de renderizado el itinerario: las tarjetas no desaparecen, el campo de estadio muestra "Estadio no disponible", solo esa petición entra en backoff, `/get/games` no se vuelve a pedir.

*(Detalle completo de estados de UI y verificación ya documentados en el historial de commits del proyecto — no se repite aquí.)*

---

## 9. Subproyecto 2.2 — Rastreador de Goleadas

**Objetivo técnico:** practicar filtrado y ordenamiento sobre un conjunto de datos numérico, separando cálculo de presentación.
**Endpoints:** `/get/games`, `/get/teams`.

### RF-RG-01 — Filtrar partidos finalizados
- Tomar únicamente los partidos con `finished: true`. ⚠️ Recordar que `finished` llega como **string** (`"TRUE"`/`"FALSE"`), no boolean — comparar explícitamente, no con `=== true`.

### RF-RG-02 — Calcular diferencia de goles
- Para cada partido finalizado, calcular la diferencia absoluta entre `home_score` y `away_score`. ⚠️ Estos campos también llegan como **string** — convertir a número antes de restar (`parseInt`/`Number`), no restar strings directamente.

### RF-RG-03 — Filtrar goleadas
- Quedarse solo con los partidos donde esa diferencia sea **mayor o igual a 3** goles.

### RF-RG-04 — Ordenar por diferencia
- Ordenar la lista resultante de **mayor a menor** diferencia de goles.

### RF-RG-05 — Cruce con equipos
- Cruzar `home_team_id` y `away_team_id` contra `/get/teams` para mostrar **nombre real y bandera** — nunca el `id` crudo, salvo en el escenario de degradación de RF-RG-R.

### RF-RG-06 — Contador total
- Mostrar en la cabecera el **total de goleadas** encontradas.

### RF-RG-R — Reto de resiliencia: fallo aislado de `/get/teams`
- Si `/get/teams` falla pero `/get/games` respondió correctamente: la lista de goleadas debe renderizarse **igual**, mostrando los **ids de los equipos como respaldo temporal** en lugar de bloquear toda la vista.
- La petición de `/get/teams` se reintenta en **segundo plano** con backoff, sin que el usuario tenga que recargar la página.
- Cuando `/get/teams` se recupera, los ids deben **actualizarse a nombres reales automáticamente** (sin acción del usuario), en la misma vista ya renderizada.

---

## 10. Subproyecto 2.3 — El Muro

**Objetivo técnico:** combinar datos agregados (`/get/groups`) con datos de detalle (`/get/games`) para construir un ranking compuesto.
**Endpoints:** `/get/groups`, `/get/teams`, `/get/games`.

> ✅ **Schema confirmado** (ver `context/api-reference.md`): la respuesta viene como `{ "groups": [...] }` (no array directo), cada grupo trae `name` (letra) y `teams` (array de 4 con `team_id`, `ga`, etc., todos como string). **El orden del array `teams` no refleja el ranking** — verificado con datos reales, hay que calcular el orden explícitamente en el cliente.

### RF-EM-01 — Extraer goles en contra por equipo
- Recorrer los 12 grupos de `/get/groups` y extraer, de cada equipo dentro de cada grupo, su `team_id` y su valor `ga` (goles en contra).

### RF-EM-02 — Unificar y ordenar
- Unificar esos 48 registros (12 grupos × 4 equipos) en un solo arreglo y ordenarlo **ascendente por `ga`** (menos goles en contra primero — mejor defensa).

### RF-EM-03 — Top 5 con datos de equipo
- Tomar los **5 primeros** del ranking y cruzarlos contra `/get/teams` para mostrar nombre y bandera.

### RF-EM-04 — Próximo rival de cada uno de los 5
- Para cada uno de esos 5 equipos, buscar en `/get/games` su **próximo partido** (`finished: false`), ordenado por `local_date`, y mostrar contra qué equipo juega.

### RF-EM-R — Reto de resiliencia: fallo aislado por equipo en la búsqueda de rival
- La búsqueda del próximo rival se evalúa **equipo por equipo** (5 búsquedas independientes, no una sola petición agregada).
- Si esa búsqueda falla para **uno solo** de los 5 equipos del ranking: ese registro específico muestra "Próximo rival no disponible", mientras los **otros 4** siguen mostrando su dato completo con normalidad — mismo patrón conceptual que RF-11 (degradación puntual, no global).

---

## 11. Subproyecto 2.4 — Analítica de Estadios

**Objetivo técnico:** practicar agregación de datos (conteos y sumas) cruzando un catálogo fijo (estadios) contra uno dinámico (partidos).
**Endpoints:** `/get/stadiums`, `/get/games`.

### RF-AE-01 — Conteo de partidos por estadio
- Para cada uno de los 16 estadios, contar cuántos registros de `/get/games` tienen ese `stadium_id`.

### RF-AE-02 — Asistencia potencial
- Calcular una "asistencia potencial total" = `capacity` × número de partidos albergados en ese estadio.

### RF-AE-03 — Ordenar por asistencia potencial
- Ordenar los estadios de **mayor a menor** asistencia potencial.

### RF-AE-04 — Gráfica de barras
- Renderizar una **gráfica de barras** comparando capacidad contra partidos albergados por estadio.
- ⚠️ Sin librerías de gráficas (Chart.js, etc. — prohibidas, ver sección 2). Construir con SVG o `<div>`s con altura/ancho proporcional al valor, estilo consistente con `context/DESIGN.md` (glass, paleta de acento).

### RF-AE-R — Reto de resiliencia: estadios cargan, partidos fallan después
- Si `/get/stadiums` se cargó primero y la petición de `/get/games` **falla después**: la gráfica debe entrar en un estado de **"esperando datos de partidos"** sin destruir las barras de estadios ya dibujadas (que solo dependen de `/get/stadiums`, sin conteo de partidos todavía).
- Solo la petición de `/get/games` entra en backoff exponencial.

---

## 12. Subproyecto 2.5 — Radar de Empates

**Objetivo técnico:** practicar filtrado condicional combinado con agrupación visual de resultados.
**Endpoints:** `/get/games`, `/get/teams`.

### RF-RE-01 — Filtrar empates
- Filtrar partidos donde `home_score === away_score` **y** `finished === true`. ⚠️ Mismo cuidado de tipos que en RG: `home_score`/`away_score`/`finished` llegan como string — comparar con el tipo correcto, no asumir booleano/número nativo.

### RF-RE-02 — Agrupar por grupo
- Agrupar el resultado de empates por `group` (A a L — fase de grupos).

### RF-RE-03 — Matriz visual
- Renderizar una **matriz visual** donde cada celda representa un empate, mostrando los dos equipos cruzados contra `/get/teams` (nombre completo, no id).

### RF-RE-04 — Contador por grupo
- Mostrar un contador de empates por cada grupo.

### RF-RE-R — Reto de resiliencia: 429 durante construcción de la matriz
- Si llega un `429` mientras se está construyendo la matriz **grupo por grupo** (implica peticiones/procesamiento incremental, no todo de una vez): el backoff exponencial se activa **solo para la petición pendiente**, mostrando el countdown correspondiente.
- Los **grupos ya dibujados permanecen visibles** — no se destruye ni se re-renderiza la matriz completa por un fallo parcial.
- Prohibido `alert()` para informar el reintento — debe ser visual (banner/countdown), consistente con RF-09.

---

## 13. Resumen de Estados de UI a Contemplar (por subproyecto)

| Estado | Subproyecto(s) | Comportamiento esperado |
|---|---|---|
| Sin sesión | Todos (global) | Pantalla de login completa |
| Sesión expirada (401) | Todos (global) | Modal de reautenticación |
| Rate limit (429) | Todos (global) | Countdown visible; en 2.5 específicamente, solo bloquea el grupo pendiente |
| Error de servidor (500) | Todos (global) | Backoff + banner, sin romper la UI |
| Offline/caché | Todos (global) | Badge de datos no actualizados |
| Fallo aislado de estadio | 2.1 | Tarjeta persiste, campo estadio degradado |
| Fallo de `/get/teams` con `/get/games` OK | 2.2 | Lista se renderiza con ids, actualiza sola al recuperar |
| Fallo de búsqueda de rival para 1 de 5 | 2.3 | Solo ese registro muestra "no disponible" |
| Fallo de `/get/games` con `/get/stadiums` OK | 2.4 | Gráfica en estado "esperando datos de partidos", barras de estadios ya dibujadas persisten |
| 429 durante construcción de matriz | 2.5 | Solo el grupo pendiente entra en backoff, grupos ya dibujados persisten |

---

## 14. Fuera de Alcance (explícitamente no requerido)

- Diseño visual elaborado / pixel-perfect (el foco es la lógica de cruce y resiliencia).
- Uso de cualquier framework o librería de **JavaScript** (React, Vue, jQuery, Axios, librerías de gráficas, etc.) — **no permitido bajo ninguna circunstancia**, en ningún subproyecto.
- Persistencia en backend propio (todo el estado vive en el cliente vía `localStorage`).
- Registro de usuario dentro de la app (se hace una sola vez, fuera del flujo, vía `curl`/Postman).
