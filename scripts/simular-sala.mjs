/**
 * SIMULADOR DE SALA — jugadores de mentira contra el servidor de verdad.
 *
 *   node scripts/simular-sala.mjs [--jugadores 8] [--base http://localhost:3210]
 *                                 [--desconectar] [--formato express]
 *
 * Levanta una sala por HTTP y mete N jugadores que hacen exactamente lo que haría gente
 * real: entrar, responder con tiempos distintos, usar comodines, apostar, reaccionar, y
 * —si se pide— perder la conexión y volver. No usa mocks: habla con las mismas rutas que
 * el móvil.
 *
 * Sirve para dos cosas:
 *
 *   1. **Comprobar que funciona** (§58: mínimo 3 jugadores simultáneos jugando una partida
 *      completa con temporizador y puntuación autoritativos).
 *   2. **Medir** (§47): al final imprime latencias, respuestas rechazadas y cuánto tarda la
 *      partida, que es lo que hay que mirar antes de prometer capacidad.
 */

const argumentos = process.argv.slice(2);

function opcion(nombre, porDefecto) {
  const indice = argumentos.indexOf(`--${nombre}`);
  if (indice === -1) return porDefecto;
  const valor = argumentos[indice + 1];
  return valor && !valor.startsWith('--') ? valor : true;
}

const BASE = String(opcion('base', 'http://localhost:3210'));
const CUANTOS = Number.parseInt(String(opcion('jugadores', '8')), 10);
const FORMATO = String(opcion('formato', 'express'));
const CON_DESCONEXION = Boolean(opcion('desconectar', false));

const NOMBRES = [
  'Marta', 'Pablo', 'Lucía', 'Carlos', 'Nieves', 'Emilio', 'Concha', 'Mauri',
  'Belén', 'Andrés', 'Vicenta', 'Paco', 'Alicia', 'Roberto', 'Bea', 'Yago',
  'Isabel', 'Rafa', 'Ana', 'Nacho',
];

const latencias = [];
const rechazos = new Map();
let respuestasEnviadas = 0;
let respuestasAceptadas = 0;

function opId() {
  return `sim${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`.slice(0, 32);
}

async function llamar(ruta, opciones = {}) {
  const inicio = Date.now();
  const respuesta = await fetch(`${BASE}${ruta}`, {
    ...opciones,
    headers: { 'content-type': 'application/json', ...(opciones.headers ?? {}) },
  });
  latencias.push(Date.now() - inicio);
  const texto = await respuesta.text();
  try {
    return { estado: respuesta.status, datos: JSON.parse(texto) };
  } catch {
    return { estado: respuesta.status, datos: { ok: false, mensaje: texto.slice(0, 120) } };
  }
}

/** Elige una respuesta plausible a partir de lo que la vista pública deja ver. */
function decidir(pregunta) {
  if (!pregunta) return null;

  if (pregunta.tipo === 'TRUE_FALSE') {
    return { kind: 'BOOLEAN', value: Math.random() > 0.5 };
  }
  if (pregunta.tipo === 'SHORT_ANSWER') {
    return { kind: 'TEXT', text: 'no me acuerdo' };
  }
  if (pregunta.items?.length) {
    const elegido = pregunta.items[Math.floor(Math.random() * pregunta.items.length)];
    return { kind: 'ITEM', itemId: elegido.id };
  }
  if (pregunta.pasos?.length) {
    return { kind: 'ORDER', orderedIds: pregunta.pasos.map((paso) => paso.id) };
  }
  if (pregunta.pads?.length && pregunta.secuencia?.length) {
    return { kind: 'ORDER', orderedIds: [...pregunta.secuencia] };
  }
  if (pregunta.opciones?.length) {
    const elegida = pregunta.opciones[Math.floor(Math.random() * pregunta.opciones.length)];
    return { kind: 'OPTION', optionId: elegida.id };
  }
  return null;
}

function anotarRechazo(codigo) {
  rechazos.set(codigo, (rechazos.get(codigo) ?? 0) + 1);
}

async function jugar(code, jugador, indice) {
  let respondidaAhora = -1;
  let apostadaAhora = -1;
  let vueltas = 0;
  let desconectadoYa = false;

  while (vueltas < 900) {
    vueltas += 1;

    // Simula perder el wifi diez segundos a mitad de partida.
    if (CON_DESCONEXION && !desconectadoYa && indice === 1 && vueltas === 25) {
      desconectadoYa = true;
      process.stdout.write(`  · ${jugador.nickname} pierde la conexión…\n`);
      await new Promise((resolver) => setTimeout(resolver, 10_000));
      process.stdout.write(`  · ${jugador.nickname} vuelve\n`);
    }

    const { datos } = await llamar(`/api/salas/${code}/snapshot`, {
      headers: { 'x-sala-token': jugador.token },
    });
    if (!datos.ok) break;

    const sala = datos.sala;
    if (sala.fase === 'GAME_RESULTS' || sala.fase === 'CLOSED') break;

    if (sala.fase === 'FINAL_BET' && sala.preguntaIndex !== apostadaAhora) {
      apostadaAhora = sala.preguntaIndex;
      const fracciones = [0, 0.1, 0.25, 0.5];
      await llamar(`/api/salas/${code}/intencion`, {
        method: 'POST',
        headers: { 'x-sala-token': jugador.token },
        body: JSON.stringify({
          intencion: {
            type: 'BET_SUBMIT',
            opId: opId(),
            fraccion: fracciones[Math.floor(Math.random() * fracciones.length)],
          },
        }),
      });
    }

    if (sala.fase === 'QUESTION' && sala.pregunta && sala.pregunta.indexInGame !== respondidaAhora) {
      respondidaAhora = sala.pregunta.indexInGame;

      // Un comodín de vez en cuando, como haría cualquiera.
      if (Math.random() < 0.12 && sala.privada?.comodinesDisponibles?.length) {
        const comodines = sala.privada.comodinesDisponibles;
        await llamar(`/api/salas/${code}/intencion`, {
          method: 'POST',
          headers: { 'x-sala-token': jugador.token },
          body: JSON.stringify({
            intencion: {
              type: 'POWERUP_USE',
              opId: opId(),
              questionIndex: sala.pregunta.indexInGame,
              powerUpId: comodines[Math.floor(Math.random() * comodines.length)],
            },
          }),
        });
      }

      // Cada uno tarda lo suyo: de medio segundo a cuatro.
      await new Promise((resolver) => setTimeout(resolver, 500 + Math.random() * 3_500));

      const submission = decidir(sala.pregunta);
      if (submission) {
        respuestasEnviadas += 1;
        const { datos: respuesta } = await llamar(`/api/salas/${code}/intencion`, {
          method: 'POST',
          headers: { 'x-sala-token': jugador.token },
          body: JSON.stringify({
            intencion: {
              type: 'ANSWER_SUBMIT',
              opId: opId(),
              questionIndex: sala.pregunta.indexInGame,
              submission,
            },
          }),
        });
        if (respuesta.ok) respuestasAceptadas += 1;
        else anotarRechazo(respuesta.error ?? 'desconocido');
      }
    }

    if (sala.reactionsEnabled && Math.random() < 0.08) {
      await llamar(`/api/salas/${code}/intencion`, {
        method: 'POST',
        headers: { 'x-sala-token': jugador.token },
        body: JSON.stringify({
          intencion: { type: 'REACTION', opId: opId(), emoji: '👏' },
        }),
      });
    }

    await new Promise((resolver) => setTimeout(resolver, 600));
  }
}

/** El host mira la sala: es lo que empuja las fases (no hay temporizadores de servidor). */
async function presidir(code, hostToken) {
  let vueltas = 0;
  while (vueltas < 1200) {
    vueltas += 1;
    const { datos } = await llamar(`/api/salas/${code}/eventos?modo=sondeo&desde=0`, {
      headers: { 'x-sala-token': hostToken },
    });
    if (!datos.ok) break;

    const { datos: foto } = await llamar(`/api/salas/${code}/snapshot`, {
      headers: { 'x-sala-token': hostToken },
    });
    if (foto.ok && (foto.sala.fase === 'GAME_RESULTS' || foto.sala.fase === 'CLOSED')) return foto.sala;

    await new Promise((resolver) => setTimeout(resolver, 500));
  }
  return null;
}

function percentil(valores, p) {
  if (valores.length === 0) return 0;
  const ordenados = [...valores].sort((a, b) => a - b);
  const indice = Math.min(ordenados.length - 1, Math.floor((p / 100) * ordenados.length));
  return ordenados[indice];
}

async function main() {
  const arranque = Date.now();
  console.log('');
  console.log(`  Simulando una junta de ${CUANTOS} vecinos contra ${BASE}`);
  console.log(`  Formato: ${FORMATO}${CON_DESCONEXION ? ' · con desconexión y vuelta' : ''}`);
  console.log('');

  const { datos: creada } = await llamar('/api/salas', {
    method: 'POST',
    body: JSON.stringify({
      setup: {
        formatId: FORMATO,
        difficultyId: 'vecino',
        category: 'mezcla',
        sinSpoilers: false,
        adaptiveDifficulty: false,
      },
    }),
  });

  if (!creada.ok) {
    console.error('  No se ha podido crear la sala:', creada.mensaje ?? creada);
    process.exitCode = 1;
    return;
  }

  const { code, hostToken } = creada;
  console.log(`  Sala ${code} abierta`);

  const jugadores = [];
  for (let indice = 0; indice < CUANTOS; indice += 1) {
    const nickname = `${NOMBRES[indice % NOMBRES.length]}${indice >= NOMBRES.length ? indice : ''}`;
    const { datos } = await llamar(`/api/salas/${code}/unirse`, {
      method: 'POST',
      body: JSON.stringify({ nickname }),
    });
    if (datos.ok) jugadores.push({ token: datos.token, nickname: datos.nickname });
    else console.warn(`  · ${nickname} no ha podido entrar: ${datos.mensaje}`);
  }
  console.log(`  ${jugadores.length} vecinos dentro`);

  const { datos: empezada } = await llamar(`/api/salas/${code}/intencion`, {
    method: 'POST',
    headers: { 'x-sala-token': hostToken },
    body: JSON.stringify({ intencion: { type: 'HOST_START', opId: opId() } }),
  });
  if (!empezada.ok) {
    console.error('  No ha arrancado:', empezada.mensaje);
    process.exitCode = 1;
    return;
  }
  console.log('  Junta empezada. Jugando…');
  console.log('');

  const final = await Promise.all([
    presidir(code, hostToken),
    ...jugadores.map((jugador, indice) => jugar(code, jugador, indice)),
  ]);

  const sala = final[0];
  const duracion = Math.round((Date.now() - arranque) / 1000);

  console.log('');
  console.log('  ── Resultado ─────────────────────────────────────');
  if (sala) {
    console.log(`  Fase final: ${sala.fase}`);
    const clasificacion = sala.clasificacion?.puestos ?? [];
    for (const puesto of clasificacion.slice(0, 5)) {
      console.log(`    ${puesto.posicion}. ${puesto.nickname} — ${puesto.puntos}`);
    }
    const conPuntos = clasificacion.filter((puesto) => puesto.puntos > 0).length;
    console.log(`  Jugadores con puntuación: ${conPuntos} de ${clasificacion.length}`);
  } else {
    console.log('  La partida no ha llegado a resultados (revisa el servidor).');
  }

  console.log('');
  console.log('  ── Medidas ───────────────────────────────────────');
  console.log(`  Duración: ${duracion} s`);
  console.log(`  Peticiones: ${latencias.length}`);
  console.log(
    `  Latencia p50/p95/max: ${percentil(latencias, 50)} / ${percentil(latencias, 95)} / ${Math.max(...latencias, 0)} ms`,
  );
  console.log(`  Respuestas enviadas: ${respuestasEnviadas} · aceptadas: ${respuestasAceptadas}`);
  if (rechazos.size > 0) {
    console.log('  Rechazos por motivo:');
    for (const [motivo, cuantas] of rechazos) console.log(`    · ${motivo}: ${cuantas}`);
  }
  console.log('');

  const salioBien = Boolean(sala && sala.fase === 'GAME_RESULTS' && respuestasAceptadas > 0);
  if (!salioBien) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
