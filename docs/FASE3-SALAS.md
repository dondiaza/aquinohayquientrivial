# Fase 3 · Salas en tiempo real

Cómo funciona el multijugador, qué se midió y qué falta. La decisión de transporte y su
porqué están aparte, en [FASE3-REALTIME.md](FASE3-REALTIME.md).

---

## 1. Las dos pantallas

| | **Pantalla grande** (`/host/[code]`) | **Mando** (`/sala/[code]`) |
| --- | --- | --- |
| Dónde | Portátil conectado a la tele o al proyector | El móvil de cada uno |
| Qué hace | Cuenta la historia | Toma las decisiones |
| Qué muestra | Código, QR, lobby, pregunta, temporizador, recuento de respuestas, revelado, clasificación, ceremonia | Solo lo que hay que pulsar: opciones, comodines, apuesta, reacciones |
| Qué NO muestra | **Quién** falta por responder — solo cuántos | La respuesta correcta antes del revelado |

Esa última fila es una decisión de diseño, no un descuido: señalar al lento en una pantalla
delante de doce personas es la forma más rápida de que deje de jugar.

## 2. El camino de los diez segundos

```
alguien abre /host  →  pulsa «Abrir la sala»  →  la tele enseña 6NRX + QR
                                                      ↓
                    el resto escanea  →  /unirse/6NRX  →  nombre (ya propuesto)  →  dentro
```

Sin instalar nada, sin cuenta, sin email. El nombre y el avatar vienen rellenos, así que se
puede entrar dándole a un botón. Si ya habías entrado en esa sala desde ese móvil, no se te
pregunta nada: se te reconoce y entras directo.

## 3. Autoridad: qué decide el servidor

**Todo lo que puntúa.** El móvil manda intenciones (`ANSWER_SUBMIT`, `POWERUP_USE`,
`BET_SUBMIT`, `VOTE_SUBMIT`); nunca resultados. El servidor comprueba, en este orden:

1. el cuerpo es una intención válida (Zod);
2. el token identifica a quien dice ser;
3. la intención le corresponde (los controles de host, solo al host);
4. la fase es la correcta;
5. la respuesta entra en la ventana de tiempo **del servidor**;
6. no es un duplicado.

Y entonces calcula los puntos con `domain/scoring`, el mismo módulo que el modo solitario.

### El tiempo

No hay cuentas atrás en las que se confíe. Con cada pregunta viajan `empiezaEn`, `terminaEn`
y `servidorAhora`; el cliente calcula su desfase una vez y pinta con el reloj corregido.
`responseMs` lo mide el servidor por la hora de llegada.

Hay una **gracia de 1,2 s** para que la latencia normal no cueste una respuesta — y la
pregunta no se cierra hasta que esa gracia pasa, porque si no la tolerancia no existiría.
El bonus por rapidez sigue topado (máximo 300 puntos en tramos de 50), así que tener mejor
wifi no gana partidas.

### Sin temporizadores de servidor

En serverless no hay proceso que sobreviva a la invocación, así que no hay `setTimeout` que
valga. Cada fase deja escrito en `faseHasta` cuándo debe avanzar, y **cualquier lectura
posterior a esa marca ejecuta el avance** dentro de la misma transacción. Con la tele
leyendo el stream cada pocos cientos de milisegundos el efecto es el mismo y no hay estado
en memoria que perder.

## 4. Concurrencia

Todo cambio pasa por una transacción que empieza bloqueando la fila de la sala:

```sql
SELECT id, seq, state FROM "Room" WHERE id = $1 FOR UPDATE
```

Dos jugadores que responden en el mismo milisegundo se serializan ahí. Sin ese bloqueo, el
segundo leería un estado viejo y podría duplicar un `seq` o perder una respuesta.

## 5. Idempotencia

Cada intención lleva un `opId` que genera el cliente y **repite en los reintentos**. Dos
barreras:

* el reducer ignora un `opId` ya procesado;
* la tabla `RoomAnswer` tiene clave única `(sala, jugador, pregunta)` y `(sala, jugador, opId)`.

Resultado: un doble toque, un reintento tras perder cobertura o un `Retry` del navegador no
puntúan dos veces. Hay test.

## 6. Reconexión

Es el caso que más se rompe en los multijugador caseros, y aquí es trivial por diseño: el
cliente guarda su `seq` y pide «lo que haya después de N». **Reconectar y arrancar son la
misma consulta.** Además:

* la identidad vive en `localStorage` (token opaco de 32 bytes), así que recargar el móvil
  no crea un jugador duplicado: se reconoce al mismo;
* al volver de segundo plano (`visibilitychange`) se pide un snapshot completo, que incluye
  el bloque `privada` con lo que solo te incumbe a ti;
* la presencia (`ACTIVE` / `RECONNECTING` / `AWAY`) se **deriva del reloj** al leer, no hay
  temporizadores por jugador;
* **nunca se expulsa por inactividad.**

## 7. Que la respuesta no se filtre

El requisito crítico (§44). La pregunta se manda como `VistaPregunta`, construida en
[`vista.ts`](../src/domain/party/vista.ts) **campo a campo, sin `spread`**, que es
justamente como se filtran estas cosas. Familia por familia:

| Familia | Qué se cae |
| --- | --- |
| Opciones (múltiple, ¿quién es?, apuesta, memoria, qué falta) | `correctOptionId` |
| Verdadero/falso | `correctValue` (no viaja nada) |
| El infiltrado | `impostorItemId` |
| Ordena el desastre | los pasos van **mezclados**: el orden correcto no sale del servidor |
| La junta | `bestOptionId`, `weight` y `outcome` |
| Ficha del vecino | `answer` y `accepted` |
| ¿Quién es? | las pistas **aún no reveladas** |

Excepción consciente y documentada: en el portero automático la secuencia **sí** viaja —
verla es la mecánica.

Además, los eventos llevan audiencia (`ALL` / `HOST` / `P:<id>`), y el evento con la solución
es de audiencia pública **solo a partir del revelado**.

Lo comprueban 17 tests que recorren las once familias con contenido real del banco.

## 8. Equipos

Fórmula: **media de los K mejores**, con K el tamaño del equipo más pequeño.

* Es justa con equipos desiguales: todos aportan exactamente K puntuaciones, así que tener
  más gente no suma por sí solo.
* No castiga al que se despista: el que se va al baño queda fuera de los K mejores y no
  arrastra a los suyos.
* Se explica en una frase, que es lo que hace falta para decirla en voz alta antes de empezar.
* En modo «un móvil por equipo» es el caso degenerado K = 1, sin código especial.

El marcador individual se mantiene siempre, así que nadie juega para nada. Detalle y
contrapartidas en [`equipos.ts`](../src/domain/party/equipos.ts).

## 9. Comodines en multijugador

Los seis de Fase 2, adaptados para que **ninguno perjudique a otro jugador** (§25):

| Comodín | En multijugador |
| --- | --- |
| Un poquito de por favor | +5 s **solo para ti**; la ventana de la sala no se mueve |
| Radio Patio | descarta una incorrecta **solo en tu móvil**, nunca la última |
| Junta extraordinaria | ×2 personal |
| Se ha ido la luz | ×3 respondiendo a ciegas |
| Cambio de presidente | **cambia de efecto**: en solitario cambiaba la pregunta, aquí desincronizaría la sala, así que protege tu racha de un fallo |
| Fondo de reserva | protege media apuesta |

## 10. Anti-abuso

* nombres saneados, con lista corta de reservados e insultos, y alternativa automática
  («Marisa» → «Marisa 2») en vez de un error seco;
* caracteres invisibles fuera (los de ancho cero son el truco para colarse dos veces con
  «el mismo» nombre);
* límites de ritmo por cubo de fichas: reacciones 12/min, texto libre 6/min;
* el host puede expulsar, cerrar la entrada, silenciar reacciones, ocultar una respuesta
  abierta y anular una pregunta;
* las acciones destructivas piden confirmación y no se ofrecen durante una pregunta activa.

## 11. Lo que se midió

Partida completa por HTTP real contra el servidor de producción local
(`node scripts/simular-sala.mjs`):

| Escenario | Resultado |
| --- | --- |
| **3 jugadores**, express | ✅ `GAME_RESULTS`, los 3 con puntuación, **33/33** respuestas aceptadas |
| Latencia p50 / p95 / máx | **12 / 71 / 127 ms** · 1.679 peticiones en 201 s |
| **8 jugadores** + uno se desconecta 10 s y vuelve | ✅ `GAME_RESULTS`, los **8** con puntuación, **88/88** aceptadas |
| Latencia p50 / p95 / máx | **34 / 88 / 175 ms** · 3.474 peticiones en 217 s |
| Reconexión | el que perdió la conexión volvió y terminó la partida con sus puntos intactos |

Cero respuestas rechazadas en ambos escenarios: ni por fase, ni por tiempo, ni por
duplicado. La latencia sube poco de 3 a 8 jugadores porque el coste real es una consulta
indexada por lectura, no el número de conexiones.

El simulador acepta `--jugadores N` y `--desconectar` (uno pierde la conexión diez segundos
y vuelve). Sirve tanto de prueba de humo como de medida: imprime latencias y rechazos por
motivo.

**No se promete capacidad sin medirla.** Lo comprobado es 3 y 8 jugadores en local. Los 20
y 50 del enunciado no se han medido todavía contra Neon y Vercel, que es donde el coste por
lectura cambia, así que no se afirma que funcionen: el simulador está listo
(`--jugadores 20`) y esa medición es el siguiente paso.

## 12. Qué falta

Honestamente, lo que aún no está:

* **Rondas sociales completas** — el protocolo, el estado y el reducer ya las contemplan
  (escribir → votar → recuento, con moderación), pero falta rematar la UI y engancharlas a
  una ronda del formato.
* **Duelo 1v1 y «todos contra el presidente»** — diseñados en el protocolo, sin implementar.
* **Radio Patio social** (pistas repartidas) — sin implementar.
* **Traspaso de presidencia** — hay periodo de gracia y latido del host, pero el traspaso
  automático a otro jugador no está.
* **E2E con navegadores reales** (Playwright, varios contextos) — hoy la prueba end-to-end es
  el simulador por HTTP, que cubre el camino completo pero no el DOM.
* **Late join normalizado**: entra con la mediana de los que ya juegan, que es simple y
  justo, pero no se ha medido si desequilibra en partidas largas.
