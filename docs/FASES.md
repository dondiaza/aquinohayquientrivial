# Fases: qué está hecho y qué viene después

## Fase 1 — hecha

Arquitectura, motor de juego, contenido, navegación, modo solitario y producto funcional.
Detalle en el [README](../README.md).

Puntos que ya se han dejado preparados para lo que viene, con coste cero hoy:

| Preparado | Dónde | Por qué importa después |
| --- | --- | --- |
| Reducer puro y determinista | `domain/engine/machine.ts` | El servidor autoritativo de Fase 3 ejecuta el mismo fichero |
| Eventos tipados con `seq` | `domain/engine/engine-events.ts` | Es el payload de los WebSockets de Fase 3 |
| Contrato de red con Zod | `domain/engine/wire.ts` | Validación idéntica en cliente y servidor |
| Registro de tipos de prueba | `domain/questions/registry.ts` | Añadir un tipo no toca la UI existente |
| `payload` JSON validado | `prisma/schema.prisma` + `schemas.ts` | Tipos nuevos sin migración |
| Formatos como datos | `domain/rounds/formats.ts` | Modos nuevos sin tocar componentes |
| Power-ups como definición + efecto | `domain/powerups/powerups.ts` | Power-ups nuevos sin condicionales en pantalla |
| Textos centralizados | `domain/copy/` | Cambiar el tono del juego sin tocar lógica |
| `media.placeholder` | modelo de pregunta | Meter assets propios sin tocar código |
| Modelo `User` sin usar | `prisma/schema.prisma` | Cuentas opcionales cuando toque |
| Rutas `/unirse`, `/sala`, `/host` | `app/` | El enrutado y los enlaces no cambian |
| `prefers-reduced-motion` | `globals.css` | Las animaciones de Fase 2 nacen accesibles |
| `rankId` en el resumen (no el texto) | `domain/results/summary.ts` | Reescribir los rangos no obliga a migrar partidas |

## Fase 2 — hecha

Identidad propia, sensaciones y contenido:

* Sistema de diseño «Comunidad» documentado (docs/DESIGN-SYSTEM.md), tipografías libres y
  cuatro velocidades de motion con `prefers-reduced-motion` respetado.
* Audio original **sintetizado** con Web Audio: 19 efectos, cero ficheros, preferencias
  persistentes y ningún sonido antes de la primera interacción.
* Home cinemática: fachada SVG y planta baja interactiva (puerta, telefonillo, tablón,
  ascensor, buzones).
* Cuatro familias de prueba nuevas hasta diez: memoria de vecino, ¿qué falta aquí?, la junta
  y portero automático. Dos minijuegos integrados como presentación de ronda (buzones y
  ascensor).
* Seis comodines con rareza y tope de dos por pregunta; siete sucesos gobernados por un
  director que evita monotonía y no castiga a quien va mal.
* Progresión con experiencia, siete rangos, quince logros, avatar personalizable con marcos
  desbloqueables, reto del día determinista, desafíos con etiqueta compartible y modo
  fantasma contra tu propio récord.
* Ceremonia de resultados con tarjeta compartible generada en canvas, PWA instalable y
  estados de error temáticos (404, 500 y sin conexión).

### Lo que quedó fuera de Fase 2 (por orden de valor)

1. **Ilustración propia** en los `placeholder` de `media` (hoy el marco existe y está vacío)
   y música de fondo (hoy solo hay efectos y un ambiente muy suave).
2. **Más familias**: emparejar, rellenar huecos, audio y imagen.
3. **Recalibración del banco** con la analítica que ya se está guardando: `QuestionStat`
   acumula veces mostrada, tasa de acierto, tiempo medio, abandonos y dificultad estimada;
   `calibrationDrift()` ya señala las preguntas mal etiquetadas.
4. **Cuentas opcionales** sobre el modelo `User`, sin romper la experiencia de invitado.
5. **Persistencia de partida en curso en servidor** (hoy es `sessionStorage`), para retomar
   desde otro dispositivo.

## Fase 3 — salas online y multijugador

El plan que la arquitectura ya soporta:

1. **Servidor autoritativo**: mover `applyAction` al servidor. Los clientes envían
   `GameAction`, el servidor emite `EngineEvent`. Como el reducer es puro y determinista, el
   cliente puede seguir prediciendo en local y reconciliar.
2. **Transporte**: WebSocket (o SSE + POST donde no haya WS). El sobre ya está definido:
   `EngineEventEnvelope { seq, gameId, type, at, payload }`. `seq` da orden y detección de
   huecos.
3. **Salas**: `Room { code, hostId, status, config }` y `RoomPlayer`. Las rutas `/unirse`,
   `/sala/[code]` y `/host/[code]` ya existen.
4. **Móviles como mandos**: `/host/[code]` es la pantalla de presentación (tele o
   proyector) y `/sala/[code]` el mando. Los componentes de respuesta (`views/`) se reusan
   tal cual: reciben pregunta + envían `AnswerSubmission`.
5. **Equipos y puntuación colectiva**: `GameMode.PARTY` ya está en el enum; la puntuación es
   una función pura por respuesta, así que agregar por equipo es sumar.
6. **Antitrampas**: hoy el cliente conoce las respuestas correctas de su pool (inevitable con
   motor en cliente). Con servidor autoritativo se envía la pregunta **sin** la solución y se
   evalúa en el servidor con `gradeAnswer`, que ya es la misma función.
7. **Clasificaciones intermedias** entre rondas: `RoundProgress` ya se calcula por ronda.

## Deuda técnica conocida

* La partida en curso vive en `sessionStorage`: si el jugador cambia de navegador, la pierde
  (la partida y sus respuestas sí quedan en la base de datos).
* El pool de la partida viaja al cliente con las respuestas correctas incluidas. Es
  inherente a tener el motor en el cliente en Fase 1; se resuelve en Fase 3.
* `loadPlayableQuestions()` trae todo el banco activo a memoria. Perfecto con cientos de
  preguntas; con decenas de miles habría que muestrear en SQL (está anotado en el código).
* Sin tests de componentes de React: la lógica está en el dominio (170 tests) y la interfaz
  se ha verificado con navegador real (móvil y escritorio, desarrollo y producción).
* La tarjeta compartible se dibuja con las tipografías del sistema, no con Anton: el canvas
  no espera a `document.fonts`. Es un detalle visual, no funcional.
