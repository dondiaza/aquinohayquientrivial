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

## Fase 2 — dirección artística, animación y sonido

Lo natural de retomar, en orden de valor:

1. **Game feel**: animación de entrada de la pregunta, contador con tensión, aparición de
   puntos (`+1300` volando al marcador), sacudida en el fallo, sello de acierto. Los ganchos
   ya existen: `RevealSummary` trae el desglose completo y `EngineEvent` marca cada momento.
2. **Sonido**: telefonillo, portazo, ascensor, timbre de junta. Con interruptor y respeto a
   `prefers-reduced-motion` / silencio por defecto.
3. **Dirección artística avanzada**: ilustración original del portal, tipografía propia con
   licencia clara (sustituyendo los tokens `--font-*`), texturas y estados de escena por
   ronda.
4. **Más mecánicas**: minijuegos entre rondas, tipos de prueba nuevos (imagen, audio,
   emparejar, rellenar), power-ups nuevos (cambiar de pregunta, doblar puntos, congelar
   tiempo), rachas con recompensas.
5. **Recalibración del banco** con la analítica que ya se está guardando: `QuestionStat`
   acumula veces mostrada, tasa de acierto, tiempo medio, abandonos y dificultad estimada;
   `calibrationDrift()` ya señala las preguntas mal etiquetadas.
6. **Cuentas opcionales** sobre el modelo `User`, sin romper la experiencia de invitado.
7. **Persistencia de partida en curso en servidor** (hoy es `sessionStorage`), para retomar
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
* Sin tests de componentes de React: la lógica está en el dominio (140 tests) y la interfaz
  se ha verificado con navegador real. Fase 2, con animaciones, pedirá tests de UI.
