# DESIGN.md — "La Ruta del Campeón"
**Dirección visual: dark UI moderno, liquid glass, degradados animados**
**Uso:** este documento se envía junto a `context/requirements.md` a Google Stitch, y sirve como referencia directa para la implementación en Tailwind CSS.

---

## 0. Concepto y racional

Interfaz **oscura, moderna y premium**, inspirada en el lenguaje visual de dashboards/SaaS de nueva generación (referencia: motionsites.ai). Fondo casi negro con capas de degradado animado en tonos morado/magenta que le dan profundidad sin saturar la lectura. Los componentes interactivos (navbar, botones, tarjetas) usan un efecto **"liquid glass"** (glassmorphism): superficies translúcidas con blur, bordes finos de brillo y una sutil sensación de material físico flotando sobre el fondo animado.

El elemento firma del sistema (heredado del concepto de itinerario) es la **tarjeta de partido tipo "boleto de cristal"**: una tarjeta de vidrio con línea divisoria punteada y un borde con resplandor de degradado, que conserva la metáfora de "boleto de viaje" pero reinterpretada en clave dark/glass.

> **Nota de marca:** el logotipo oficial de la Copa Mundial FIFA 2026 es propiedad de FIFA. Este documento deja el espacio y las reglas de uso definidas, pero el asset real (`wc26-logo.svg`) debe ser provisto por el usuario e insertado en la navbar; no se genera ni se describe el diseño del logo en sí.

---

## 1. Paleta de colores

| Nombre | Valor | Uso |
|---|---|---|
| **Void** | `#08080D` | Fondo base de toda la aplicación |
| **Void Elevated** | `#0F0F17` | Fondo de secciones ligeramente elevadas (sin usar tarjetas glass) |
| **Glass Surface** | `rgba(255,255,255,0.06)` | Fondo de superficies liquid glass (navbar, botones, tarjetas) |
| **Glass Border** | `rgba(255,255,255,0.14)` | Borde 1px de todas las superficies glass |
| **Text Primary** | `#F4F2FA` | Texto principal (blanco con tinte lavanda) |
| **Text Secondary** | `#9B98A8` | Texto secundario, labels, metadatos |
| **Violet** | `#7C3AED` | Extremo inicial del degradado de acento |
| **Magenta** | `#EC4899` | Punto medio del degradado de acento |
| **Amber** | `#F59E0B` | Extremo final del degradado (solo en datos/gráficas, uso puntual) |
| **Signal (429/backoff)** | `#F5A623` | Countdown y estados de reintento |
| **Alert (401/500)** | `#F0455C` | Errores críticos |

### Degradado de acento (token `--gradient-accent`)
```css
--gradient-accent: linear-gradient(135deg, #7C3AED 0%, #EC4899 100%);
--gradient-accent-data: linear-gradient(135deg, #7C3AED 0%, #EC4899 55%, #F59E0B 100%);
```
- `--gradient-accent`: botones primarios, ícono de la app, bordes de resplandor en hover.
- `--gradient-accent-data`: reservado para visualizaciones de datos (contador de ciudades, barras/gráficas si se agregan), igual que en la referencia visual (gauge/bar chart violeta→magenta→ámbar).

### Fondo animado (ambient gradient) — referencia: Draftea

El fondo NO son varios blobs sutiles y pequeños, ni un glow radial solo: son **dos capas superpuestas**:
1. **Capa 1 — glow animado** (arriba): radial **solo en violeta** que se mueve lentamente, sin magenta.
2. **Capa 2 — degradado estático** (debajo): un `linear-gradient` vertical de violeta oscuro a casi-negro, que actúa como base tonal de todo el lienzo.

**El magenta nunca aparece en el fondo ambiental** — se reserva exclusivamente para elementos de acento (botones con `--gradient-accent`, bordes en hover, texto con degradado). El fondo, de punta a punta, es una escala de violeta a negro.

> **Nota técnica — por qué se necesitan las dos capas:** en un `radial-gradient`, los porcentajes de los stops son fracciones del **radio**, pero el área visual cubierta crece con el radio al cuadrado — un stop al `40%` del radio ya cubre `~84%` del área. Por eso el violeta se atenúa progresivamente (`0.55` → `0.18`) en vez de cortar abrupto, y la **capa 2** aporta la base tonal violeta oscuro para que el centro del glow nunca se vea "flotando sobre negro puro" de forma abrupta.

```css
.ambient-glow {
  position: fixed;
  inset: 0;
  z-index: -10;
  background:
    /* Capa 1: glow animado — solo violeta, sin magenta (el magenta se reserva
       para elementos de acento como botones, nunca para el fondo ambiental) */
    radial-gradient(ellipse clamp(900px, 70vw, 1400px) clamp(700px, 60vh, 1100px) at var(--glow-x, 50%) var(--glow-y, 20%),
      rgba(124, 58, 237, 0.55) 0%,
      rgba(124, 58, 237, 0.18) 40%,
      rgba(8, 8, 13, 0) 75%),
    /* Capa 2: degradado estático, base tonal violeta oscuro → casi negro */
    linear-gradient(180deg, #270C46 0%, #0F031C 55%, #110121 100%);
  animation: glowDrift 22s ease-in-out infinite alternate;
}

@keyframes glowDrift {
  0%   { --glow-x: 50%; --glow-y: 15%; }
  50%  { --glow-x: 65%; --glow-y: 35%; }
  100% { --glow-x: 35%; --glow-y: 25%; }
}
```

- El glow principal (capa 1) usa `ellipse` grande para que domine la composición, tal como en Draftea (donde el morado ocupa buena parte de la parte superior y se diluye hacia abajo).
- Opcionalmente, 1–2 glows secundarios más pequeños y tenues (`opacity` 10–15%) pueden añadirse en otras zonas para dar profundidad, pero el glow principal es siempre el protagonista — no reemplazarlo por múltiples blobs de intensidad pareja.
- El contenido (navbar, tarjetas) sigue viviendo sobre `Glass Surface`/`Void`, nunca directamente expuesto sobre el punto más intenso del glow sin una superficie de por medio (por contraste).

`prefers-reduced-motion: reduce` → el glow se congela en su posición inicial (`--glow-x: 50%; --glow-y: 20%`), sin animación.

---

## 2. Tipografía

| Rol | Fuente | Peso | Uso |
|---|---|---|---|
| **Display** | `Space Grotesk` | 700 / 800 | Headline principal, nombre de equipo, cifras grandes |
| **Body** | `Inter` | 400 / 500 / 600 | Texto general, botones, labels |
| **Utility / Mono** | `IBM Plex Mono` | 500 | Fechas, datos de estadio/ciudad/país, countdown, aforo |

### Escala

| Token | Tamaño / line-height | Peso | Uso |
|---|---|---|---|
| `display-xl` | 44px / 48px | Space Grotesk 800 | Headline hero |
| `display-md` | 26px / 30px | Space Grotesk 700 | Nombre de equipo seleccionado |
| `body-md` | 16px / 24px | Inter 400 | Texto general |
| `body-sm` | 14px / 20px | Inter 500 | Labels, navbar, botones |
| `mono-md` | 15px / 20px | IBM Plex Mono 500 | Fecha, aforo, datos de estadio/ciudad/país |
| `mono-lg` | 28px / 32px | IBM Plex Mono 500 | Countdown de reintento (429) |

**Texto con degradado:** para el headline o cifras destacadas (ej. número de ciudades visitadas), aplicar el degradado de acento como `background-clip: text` con `color: transparent` — igual que "AI is the Future" en la referencia, pero usado con moderación (máximo 1 elemento con texto degradado por vista).

---

## 3. Liquid Glass — especificación del efecto

Todas las superficies "glass" (navbar, botones, tarjetas, modales, chips de estado) comparten esta receta base:

```css
.glass {
  background: rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px) saturate(160%);
  -webkit-backdrop-filter: blur(20px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.14);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12), /* brillo superior */
    0 8px 32px rgba(0, 0, 0, 0.35);          /* profundidad */
  border-radius: 20px; /* 9999px para navbar/botones tipo píldora */
}
```

- **Navbar y botones:** `border-radius: 9999px` (píldora completa).
- **Tarjetas y modales:** `border-radius: 20px–24px`.
- **Hover en elementos interactivos glass:** el borde cambia a un degradado de 1–2px (`border-image` o pseudo-elemento) usando `--gradient-accent`, y `background` sube ligeramente a `rgba(255,255,255,0.09)`. Transición 150–200ms.
- **Nunca** apilar más de 2 niveles de glass superpuestos (ej. un chip glass dentro de una tarjeta glass es el máximo permitido) para no perder legibilidad.

### 3.0.1 Variante `.glass-elevated` — para dropdowns/popovers sobre contenido dinámico

`.glass` base (6% de opacidad) funciona bien para superficies que flotan sobre el fondo controlado (glow animado) — navbar, tarjetas en su lugar fijo. **No es suficiente para dropdowns/popovers** (menú de proyectos, menú de cuenta) porque estos flotan **encima de contenido que cambia con el scroll** (tarjetas, texto, colores variados) — a 6% de opacidad, ese contenido se transparenta lo suficiente como para romper la legibilidad del texto del dropdown (confirmado visualmente: el nombre de otro subproyecto o el texto de una tarjeta se leía a través del menú desplegado).

```css
.glass-elevated {
  background: rgba(10, 10, 15, 0.88);
  backdrop-filter: blur(28px) saturate(160%);
  -webkit-backdrop-filter: blur(28px) saturate(160%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.12),
    0 12px 40px rgba(0, 0, 0, 0.5); /* sombra más profunda, refuerza que "flota por encima" */
  border-radius: 20px;
}
```

**Dónde usar cada una:**
- `.glass` → navbar (el contenedor de la píldora en sí), tarjetas de contenido, chips de estado, botones.
- `.glass-elevated` → el **panel desplegado** de `projectMenu.js` y `accountMenu.js` (el contenido que aparece al hacer clic, no el botón que lo abre — ese botón sigue siendo `.glass` normal como parte de la navbar). También aplica a `sessionExpiredModal.js` si su overlay no fuera suficiente para garantizar contraste por sí solo.

### 3.1 Iconografía

Todos los íconos son **Lucide**, insertados como **SVG inline copiado directo en el código** (markup estático desde lucide.dev) — nunca vía el paquete npm ni el script CDN de Lucide (ver `CLAUDE.md`, restricción de "sin librerías JS"). `stroke="currentColor"`, sin relleno, grosor de trazo consistente (el default de Lucide, `stroke-width: 2`), color heredado de `Text Primary`/`Text Secondary` según el contexto.

**Los emoji que aparecen en los wireframes de este documento (📅 🏟 📍 👥 🔔 👤) son solo marcadores de posición para indicar qué ícono va ahí** — en la implementación real se reemplazan por el SVG de Lucide equivalente, nunca por el emoji literal (los emoji rinden distinto entre sistemas operativos y no encajan con la estética glass/mono del resto de la UI):

| Emoji en wireframe | Ícono Lucide real |
|---|---|
| 📅 (fecha) | `calendar` |
| 🏟 (estadio) | `landmark` o `building-2` |
| 📍 (ciudad/país) | `map-pin` |
| 👥 (aforo) | `users` |
| 🔔 (campana) | `bell` |
| 👤 (cuenta) | `user` o `user-circle` |

---

## 4. Layout y estructura

### 4.1 Navbar (wireframe)

```
   ╭──────────────────────────────────────────────────────────────────╮
   │  [WC26 LOGO]      Itinerarios              ( 🔔 )  ( 👤 ▾ )       │  ← glass pill, flotante, top-4
   ╰──────────────────────────────────────────────────────────────────╯
```
- Navbar **flotante**: `fixed top-4 left-1/2 -translate-x-1/2`, ancho máximo contenido (no full-width), efecto glass, sombra de profundidad.
- **Logo WC26 a la izquierda es obligatorio en el layout.** Se implementa como `<img>` apuntando a un archivo `.png` estático (ej. `public/wc26-logo.png`) — no se genera por código. Mientras el archivo no esté disponible, usar un placeholder simple (ej. texto "WC26" en un cuadro glass) en el mismo lugar donde luego irá el `<img>`.
- **Un solo ítem de navegación por ahora: Itinerarios** (vista principal, siempre activa). Texto `body-sm`, `Text Primary` (activo). "Partidos" **queda pausado a futuro** (ver `requirements.md`, RF-05b) — no agregarlo a la navbar todavía.
- **Ícono de campana (opcional, sección 5.1):** historial de eventos de resiliencia recientes.
- **Ícono de cuenta** al extremo derecho: avatar circular (inicial del nombre del usuario) dentro de un botón glass tipo píldora. Al hacer clic abre un dropdown glass con: nombre del usuario (`body-md`, `Text Primary`), email (`body-sm`, `Text Secondary`), chip "Sesión activa" y botón "Cerrar sesión" (`Alert` en hover). **No mostrar jerga técnica** en el dropdown (nada de "JWT", "Bearer token" o similar) — esos son detalles de implementación, no información para el usuario final.
- No incluir ítem "Standings" ni ningún otro fuera de Itinerarios (ver `requirements.md`, fuera de alcance del subproyecto).

### 4.2 Pantalla de login (wireframe)

```
┌───────────────────────────────────────────────────────────┐
│         [fondo Void + glow radial morado dominante]         │
│                                                              │
│                    [WC26 LOGO placeholder]                  │
│                                                              │
│               ╭─── tarjeta glass, centrada ───╮             │
│               │   Iniciar sesión               │             │
│               │   [ email                  ]   │             │
│               │   [ password                ]  │             │
│               │   [  Entrar (gradient-accent) ] │             │
│               ╰─────────────────────────────────╯             │
│                                                              │
└───────────────────────────────────────────────────────────┘
```
- Sin navbar visible en este estado — es la puerta de entrada antes de tener sesión.
- Tarjeta `.glass`, `border-radius: 20px–24px`, centrada vertical y horizontalmente, ancho máximo ~380px.
- Título en `display-md`, inputs con fondo `Glass Surface` más sutil (`bg-white/[0.04]`) y borde `Glass Border`, focus ring en `Magenta`.
- Botón "Entrar": fondo sólido `--gradient-accent` (no glass, para destacar la acción principal), texto `Text Primary`.
- Este mismo bloque (título + inputs + botón) es el componente que se reutiliza dentro del modal de sesión expirada (sección 5), solo cambia el contenedor.

### 4.3 Vista principal — Itinerarios (wireframe)

```
┌───────────────────────────────────────────────────────────┐
│         [fondo Void + glow radial morado dominante,         │
│          moviéndose lentamente por toda la ventana]         │
│              ╭─── navbar glass flotante ───╮                │
│                                                              │
│         Selecciona un equipo   [ Selector glass ▾ ]         │
│                                                              │
│         MÉXICO         Ciudades visitadas: ✨4✨ (texto      │
│                          con degradado violeta→magenta)      │
│         ─────────────────────────────────────────────       │
│                                                              │
│   ╭─ Boleto glass 1 ─────────╮   ╭─ Boleto glass 2 ─────────╮ │
│   │ México  vs  Canadá  Gr.A  │   │ México  vs  Brasil  Gr.A  │ │
│   │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │   │ ┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄  │ │  ← divisor punteado
│   │ 📅 14 JUN 2026             │   │ 📅 20 JUN 2026             │ │
│   │ 🏟 Estadio BBVA            │   │ 🏟 Estadio no disponible   │ │
│   │ 📍 Monterrey, México       │   │    (Text Secondary, itálica)│ │
│   │ 👥 Aforo 47,000            │   │                            │ │
│   │ ░ borde resplandor ░       │   ╰────────────────────────────╯ │
│   ╰────────────────────────────╯                                 │
└───────────────────────────────────────────────────────────┘
```

### 4.4 Vista "Partidos" (calendario completo) — **PAUSADO / A FUTURO, no construir aún**

> No forma parte del alcance evaluado del enunciado (ver `requirements.md`, RF-05b). Se deja esta especificación como referencia por si se retoma más adelante, una vez que Itinerarios y toda la arquitectura de resiliencia estén sólidas.

- Mismo lenguaje visual que Itinerarios: navbar, fondo, tipografía.
- Reutilizaría el **mismo componente de tarjeta "boleto de cristal"** (sección 4.5) para cada partido del torneo, sin agrupar por equipo — simplemente la lista completa, ordenada por `local_date`.
- Sin selector de equipo ni contador de ciudades (esos son exclusivos de Itinerarios); en su lugar llevaría un encabezado simple: `display-md` "Todos los partidos" + conteo total en `mono-md`.

### 4.5 Tarjeta "boleto de cristal" (elemento firma)

1. Contenedor `.glass`, `border-radius: 20px`.
2. Encabezado del boleto: **nombres completos de los equipos** — `México vs Polonia`, nunca códigos de 3 letras (`MEX vs POL`) — en Space Grotesk 700, `Text Primary`, con un chip pequeño de grupo a la derecha (ej. "Grupo A") — el campo `group` viene directamente en cada partido de `/get/games`, no requiere endpoint adicional.
3. Borde con resplandor de degradado (1–2px) en el lado izquierdo de la tarjeta (`border-left` con `--gradient-accent`) — reemplaza el "encabezado sólido Ink" de la versión anterior.
4. Divisor punteado horizontal: `border-top: dashed 1px rgba(255,255,255,0.16)`.
5. Cuerpo en `mono-md`, **como filas separadas** (no todo en una sola línea comprimida):
   - Fecha (`local_date`).
   - **Estadio:** nombre completo del recinto (ej. "Estadio BBVA"), no un código de 3 letras.
   - **Ciudad, país:** texto explícito (ej. "Monterrey, México") — es el dato que RF-03 exige mostrar de forma literal, no una abreviación que haya que interpretar.
   - Aforo, alineado a la derecha.
6. **Estado degradado (resiliencia):** si falla `/get/stadiums`, las filas de Estadio y Ciudad/país se reemplazan por `"Estadio no disponible"` en `Text Secondary`, itálica — la fecha (que viene de `/get/games`, no de `/get/stadiums`) permanece visible con normalidad, y la tarjeta junto con su borde de degradado permanecen intactos (no se "apaga" toda la tarjeta).

---

## 5. Componentes de resiliencia (dark/glass)

> **Regla obligatoria — visibilidad en tiempo real:** el enunciado pide un countdown/indicador "**visible**" para 429 y offline. Esto significa que deben **aparecer automáticamente en pantalla** apenas ocurre el estado (chip/banner flotante, sin acción del usuario), nunca escondidos detrás de un ícono que haya que abrir. Un ícono de campana con historial puede añadirse como complemento opcional (sección 5.1), pero **nunca sustituye** el chip en tiempo real — ambos casos deben demostrarse en vivo durante la defensa sin pasos adicionales.

| Componente | Estilo |
|---|---|
| **Modal sesión expirada (401)** | Overlay `Void` a 70% opacidad + blur. Tarjeta `.glass` centrada que envuelve el **mismo formulario de login** de la sección 4.2 (mismo componente, distinto contenedor), borde superior con degradado `Alert → transparent`, mensaje breve "Tu sesión expiró" sobre el formulario. |
| **Countdown 429** | Aparece automáticamente como chip/banner `.glass` flotante (ej. esquina superior derecha, bajo la navbar) apenas ocurre el 429. Número en `mono-lg` color `Signal`, label `body-sm` en `Text Secondary` ("Reintentando en..."), se actualiza cada segundo y desaparece solo al resolverse el reintento. |
| **Indicador offline / caché** | Aparece automáticamente como chip `.glass` flotante apenas se muestran datos cacheados (no requiere acción del usuario). Punto `Signal` parpadeante lento, texto `body-sm`: "Datos no actualizados · hh:mm". Permanece visible mientras los datos en pantalla sigan siendo los del caché. |
| **Backoff en curso (500)** | Misma lógica de aparición automática que el countdown/offline. Barra de progreso lineal delgada dentro del chip glass, degradado `Signal → transparent` animado de izquierda a derecha. |

### 5.1 Campana de historial (opcional, complementaria)
Ícono de campana en la navbar (junto al ícono de cuenta) que abre un dropdown con el registro de eventos de resiliencia recientes (ej. "Hace 2 min: datos en caché por fallo de red", "Hace 30s: reintento por error 429"). Es un plus de pulido para la demo, útil para mostrar el historial completo en la defensa, pero no reemplaza los chips en tiempo real de la tabla anterior.

---

## 6. Motion

- Glow de fondo: deriva continua y lenta de posición (ver sección 1), nunca parpadeo ni cambios bruscos de opacidad.
- Aparición de tarjetas: `opacity 0→1` + `translateY(8px→0)`, 200ms, `ease-out`, con stagger de 40ms entre tarjetas si se renderizan varias a la vez.
- Hover en glass: transición de borde/fondo 150–200ms (sección 3).
- Modal: `opacity` + `scale(0.96→1)`, 150ms.
- Todo lo anterior se desactiva con `prefers-reduced-motion: reduce`.

---

## 7. Accesibilidad

- Contraste `Text Primary` (#F4F2FA) sobre `Void` (#08080D): > 17:1.
- Contraste `Text Secondary` (#9B98A8) sobre `Void`: ~6:1 (válido para texto ≥14px).
- El texto nunca se coloca directamente sobre el punto más intenso del glow sin una capa `Void`/`Glass Surface` de por medio.
- Focus visible: `outline: 2px solid` usando `Magenta` (#EC4899), `outline-offset: 2px`, en todo elemento interactivo (incluidos los botones glass).
- Los estados de error (`Alert`) siempre llevan texto/ícono, nunca dependen solo del color.

---

## 8. Configuración sugerida de Tailwind

```js
// tailwind.config.js (extracto)
module.exports = {
  theme: {
    extend: {
      colors: {
        void: '#08080D',
        'void-elevated': '#0F0F17',
        'text-secondary': '#9B98A8',
        violet: '#7C3AED',
        magenta: '#EC4899',
        amber: '#F59E0B',
        signal: '#F5A623',
        alert: '#F0455C',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)',
        'gradient-accent-data': 'linear-gradient(135deg, #7C3AED 0%, #EC4899 55%, #F59E0B 100%)',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      backdropBlur: {
        glass: '20px',
      },
      keyframes: {
        glowDrift: {
          '0%':   { '--glow-x': '50%', '--glow-y': '15%' },
          '50%':  { '--glow-x': '65%', '--glow-y': '35%' },
          '100%': { '--glow-x': '35%', '--glow-y': '25%' },
        },
      },
      animation: {
        glow: 'glowDrift 22s ease-in-out infinite alternate',
      },
    },
  },
};
```

**Clases utilitarias recomendadas** (en `styles/input.css`, capa `@layer components`):
```css
@layer components {
  .glass {
    @apply bg-white/[0.06] backdrop-blur-glass border border-white/[0.14] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_8px_32px_rgba(0,0,0,0.35)];
  }
  .glass-elevated {
    @apply bg-[rgba(10,10,15,0.88)] backdrop-blur-[28px] border border-white/[0.16] shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_12px_40px_rgba(0,0,0,0.5)];
  }
}
```

---

## 9. Qué evitar explícitamente

- ❌ Glow de fondo a alta opacidad de pared a pared o sin degradado hacia `Void` (debe desvanecerse, nunca ser un morado plano sólido).
- ❌ Reemplazar el glow dominante único por múltiples blobs de intensidad pareja (rompe la referencia visual de Draftea).
- ❌ Más de un elemento con texto en degradado por vista.
- ❌ Glass sobre glass más de 2 niveles de profundidad.
- ❌ Bordes de radio inconsistentes (definir 9999px para píldoras, 20–24px para tarjetas/modales, y no mezclar valores intermedios arbitrarios).
- ❌ Reproducir o recrear el logotipo oficial de FIFA/WC26 — usar siempre el asset oficial provisto por el usuario.
- ❌ Sombras de colores saturados (glow de color en `box-shadow`) fuera de los bordes de resplandor definidos en la sección 3; evitar el efecto "neón genérico".

---

## 10. Cómo usar este documento

`DESIGN.md` vive en `context/`, junto a `context/requirements.md`. Ambos se entregan juntos a Google Stitch y sirven como contexto para Claude Code:
- `requirements.md` → qué pantallas y estados existen (incluye los 4 estados de resiliencia: 401, 429, 500/offline, fallo parcial de estadio).
- `DESIGN.md` → cómo debe verse cada uno de esos estados, con tokens de color, tipografía, glass y motion ya definidos — no queda espacio para interpretación libre en la implementación.
