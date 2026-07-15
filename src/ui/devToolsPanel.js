// SOLO DESARROLLO. Agrupa los simuladores en un botón flotante único.
// Mapa de atajos Ctrl+Shift+<tecla> — mantener esta lista al día al agregar un simulador nuevo,
// cada mount*Simulator registra su propio listener de keydown y NO valida colisiones entre sí:
//   E → 401 (sesión expirada)              R → 429 (agota reintentos)
//   T → 429 (recupera al 3er intento)      S → 500 (servidor)
//   D → RF-11  fallo estadios (2.1 La Ruta del Campeón)
//   G → RF-RG-R fallo equipos (2.2 Rastreador de Goleadas)
//   A → RF-AE-R fallo partidos (2.4 Analítica de Estadios, "Analítica")
import { mountDevSessionSimulator } from './devSessionSimulator.js';
import { mountDevRateLimitSimulator } from './devRateLimitSimulator.js';
import { mountDevServerErrorSimulator } from './devServerErrorSimulator.js';
import { mountDevStadiumsFailureSimulator } from './devStadiumsFailureSimulator.js';
import { mountDevTeamsFailureSimulator } from './devTeamsFailureSimulator.js';
import { mountDevGamesFailureSimulator } from './devGamesFailureSimulator.js';

export const mountDevToolsPanel = ({
  trigger401,
  trigger429Agota,
  trigger429Recupera,
  trigger500,
  triggerFalloEstadios,
  triggerFalloEquipos,
  triggerFalloPartidosEstadios,
}) => {
  if (!import.meta.env.DEV) return;

  const boton = document.createElement('button');
  boton.type = 'button';
  // Ícono "settings" de Lucide, SVG inline estático (CLAUDE.md 2).
  boton.innerHTML =
    '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" ' +
    'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>' +
    '<circle cx="12" cy="12" r="3"/>' +
    '</svg>';
  boton.title = 'Herramientas de simulación (dev)';
  boton.setAttribute('aria-haspopup', 'true');
  boton.setAttribute('aria-expanded', 'false');
  boton.className =
    'fixed bottom-4 right-4 z-50 glass rounded-full w-11 h-11 flex items-center justify-center text-white/80 ' +
    'hover:bg-white/10 transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-signal focus-visible:outline-offset-2';

  const panel = document.createElement('div');
  panel.className =
    'fixed bottom-16 right-4 z-50 glass rounded-xl p-3 flex flex-col gap-2 w-64 hidden';
  panel.setAttribute('role', 'menu');

  const titulo = document.createElement('p');
  titulo.textContent = 'Simuladores (dev)';
  titulo.className = 'body-sm text-white/60 px-1 pb-1';
  panel.appendChild(titulo);

  document.body.appendChild(panel);
  document.body.appendChild(boton);

  const abrirPanel = () => {
    panel.classList.remove('hidden');
    boton.setAttribute('aria-expanded', 'true');
  };

  const cerrarPanel = () => {
    panel.classList.add('hidden');
    boton.setAttribute('aria-expanded', 'false');
  };

  const estaAbierto = () => !panel.classList.contains('hidden');

  boton.addEventListener('click', (evento) => {
    evento.stopPropagation();
    if (estaAbierto()) {
      cerrarPanel();
    } else {
      abrirPanel();
    }
  });

  document.addEventListener('click', (evento) => {
    if (!estaAbierto()) return;
    if (panel.contains(evento.target) || boton.contains(evento.target)) return;
    cerrarPanel();
  });

  document.addEventListener('keydown', (evento) => {
    if (evento.key === 'Escape' && estaAbierto()) cerrarPanel();
  });

  mountDevSessionSimulator(trigger401, panel);
  mountDevRateLimitSimulator(trigger429Agota, trigger429Recupera, panel);
  mountDevServerErrorSimulator(trigger500, panel);

  // Retos de resiliencia específicos de cada subproyecto (sección 5.5/6.2 de CLAUDE.md):
  // separados visualmente de los simuladores genéricos de arriba, y cada botón lleva el
  // prefijo del subproyecto en su propia etiqueta para no confundirlos al ir agregando
  // los de El Muro, Analítica de Estadios y Radar de Empates.
  const separador = document.createElement('div');
  separador.className = 'border-t border-white/[0.12] my-1';
  panel.appendChild(separador);

  const tituloRetos = document.createElement('p');
  tituloRetos.textContent = 'Retos de resiliencia por subproyecto';
  tituloRetos.className = 'body-sm text-white/60 px-1 pb-1';
  panel.appendChild(tituloRetos);

  mountDevStadiumsFailureSimulator(triggerFalloEstadios, panel);
  mountDevTeamsFailureSimulator(triggerFalloEquipos, panel);
  mountDevGamesFailureSimulator(triggerFalloPartidosEstadios, panel);
};
