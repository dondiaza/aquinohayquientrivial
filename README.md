# EL TRIVIAL DE LA COMUNIDAD — Fase 1

Trivial / party-game con la personalidad de una comunidad de vecinos española caótica de
principios de los 2000: junta, derramas, Radio Patio, ascensor averiado y una apuesta
final. **Fase 1 completa y jugable de principio a fin en modo solitario.**

> **Identidad propia.** El juego está inspirado en el *género* de comedias de comunidad de
> vecinos, pero no usa ni imita marcas, logotipos, fotogramas, clips, audios ni fuentes de
> ninguna serie. Toda la identidad gráfica es original y hecha con CSS; los huecos para
> assets con derechos son *placeholders* sustituibles. Ver [docs/CONTENIDO-DEMO.md](docs/CONTENIDO-DEMO.md).

---

## 1. Puesta en marcha

Requisitos: **Node 20.11+** (probado con Node 24). No hace falta Docker ni instalar
PostgreSQL: hay un PostgreSQL embebido para desarrollo.

```bash
npm install
cp .env.example .env          # en Windows: copy .env.example .env

# Terminal 1 — base de datos local (déjala abierta)
npm run db:up

# Terminal 2 — migraciones + cliente Prisma + banco de preguntas demo
npm run setup

# Terminal 2 — a jugar
npm run dev                   # http://localhost:3210
```

`npm run db:up` crea el clúster en `./.pgdata` (ignorado por git) en el puerto **5434**
—para no chocar con otros proyectos— y **siempre en UTF-8** (en Windows `initdb` usaría
WIN1252 y PostgreSQL rechazaría cualquier carácter fuera de ese juego).

Si prefieres tu propio PostgreSQL, olvida `db:up` y apunta `DATABASE_URL` a tu servidor.

### Comandos

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo en el puerto 3210 |
| `npm run build` | `prisma generate` + build de producción |
| `npm start` | Servidor de producción |
| `npm test` | Tests de dominio con Vitest (140 tests) |
| `npm run test:watch` | Vitest en modo watch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config + typescript-eslint + react-hooks) |
| `npm run verify` | typecheck + lint + test + build, en ese orden |
| `npm run db:up` | PostgreSQL local embebido (primer plano) |
| `npm run setup` | `migrate deploy` + `generate` + `seed` |
| `npm run db:migrate` | Nueva migración en desarrollo |
| `npm run db:seed` | Siembra/actualiza el banco demo (idempotente) |
| `npm run db:reset` | Borra y recrea la base de datos |

---

## 2. Arquitectura

La regla que manda: **la UI no contiene reglas de juego**. El motor es un reducer puro que
no sabe nada de React, de la red ni de la base de datos.

```
src/
├─ domain/                    ← MOTOR Y REGLAS. Sin React, sin Prisma, sin red.
│  ├─ questions/              tipos, esquemas Zod, evaluación, registro de tipos, analítica
│  ├─ scoring/                fórmula de puntuación (pura y documentada)
│  ├─ streaks/                rachas e hitos
│  ├─ difficulty/             niveles 1-10 y dificultad adaptativa
│  ├─ selection/              selección sin repetición y con relajación de filtros
│  ├─ powerups/               definición + inventario + efectos
│  ├─ events/                 sucesos de partida (derrama, junta urgente, ascensor)
│  ├─ rounds/                 formatos de partida = DATOS (express / normal / maratón)
│  ├─ ranks/                  rangos e índice de rendimiento
│  ├─ results/                resumen de partida
│  ├─ copy/                   TODOS los textos de sabor (rachas, feedback, UI)
│  ├─ rng.ts                  azar determinista con semilla
│  └─ engine/                 estado, acciones, máquina de estados, eventos, contrato de red
├─ server/                    ← ACCESO A DATOS. Prisma y nada más.
│  ├─ questions/              repositorio (Postgres ⇄ dominio, validando con Zod)
│  ├─ games/                  crear partida, registrar respuestas, cerrar y resumir
│  ├─ guest.ts                cookie anónima de invitado
│  └─ admin.ts                puerta del panel
├─ content/                   ← BANCO DEMO. Constructores + 156 preguntas + "biblia" del portal
├─ components/                ← UI. ui/ (primitivas), game/ (partida), admin/, layout/
└─ app/                       ← RUTAS (App Router)
```

### El motor

```ts
applyAction(estado, acción, { pool }) → { estado nuevo, eventos emitidos }
```

* **Puro**: el tiempo entra en `action.at`; el motor nunca lee el reloj.
* **Determinista**: todo el azar sale de `createRng(seed, rngCursor)` y el cursor vive en
  el estado. Misma semilla + mismo banco = misma partida, en cliente y en servidor.
* **Serializable**: el estado es JSON plano (se guarda en `sessionStorage`, así que
  recargar la página no pierde la partida).
* **Explícito**: una acción que no corresponde a la fase actual se ignora sin efectos.

Fases: `INTRO → ROUND_INTRO → QUESTION → ANSWER_LOCKED → REVEAL → (EVENT | QUESTION) →
ROUND_RESULTS → … → GAME_RESULTS`, más `FINAL_ROUND` para la apuesta. `HOME`,
`MODE_SELECT` y `SETUP` son rutas de Next, no las gestiona el reducer.

### Dos vocabularios de "evento" (importante)

| Concepto | Dónde | Qué es |
| --- | --- | --- |
| `GameEvent` | `domain/events/` | Suceso de juego: derrama extraordinaria, junta urgente, ascensor averiado |
| `EngineEvent` | `domain/engine/engine-events.ts` | Mensaje tipado del motor: `QUESTION_STARTED`, `ANSWER_SUBMITTED`… |

Los `EngineEvent` se persisten hoy en `GameEventLog` (trazabilidad y analítica) y en Fase 3
son exactamente lo que viajará por WebSocket.

### Reparto cliente / servidor en Fase 1

El motor corre en el cliente y el servidor **registra**: cada respuesta se persiste con su
desglose y **el resumen final lo recalcula el servidor** a partir de lo persistido (con la
misma función pura `buildSummary`), no se acepta un resumen enviado por el cliente.
En Fase 3 se invierte el reparto sin tocar el motor ni el modelo de datos.

---

## 3. Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | Portada: qué es el juego y **JUGAR AHORA** (una partida en un clic) |
| `/jugar` | Selección de modo (solitario jugable; con vecinos, Fase 3) |
| `/jugar/solo` | Setup: duración, dificultad, temática, adaptativa, nombre |
| `/partida/[gameId]` | La partida (motor en el cliente) |
| `/resultados/[gameId]` | Acta de la partida: estadísticas, rango, por rondas y por tipo |
| `/como-jugar` | Reglas **generadas desde el dominio** (nunca se desactualizan) |
| `/admin` | Portería: estado del banco y del juego |
| `/admin/preguntas` | Listado con búsqueda y filtros (tipo, categoría, estado, temporada, verificada) |
| `/admin/preguntas/nueva` | Crear pregunta con previsualización en vivo |
| `/admin/preguntas/[id]` | Editar, activar/desactivar, duplicar, borrar + analítica |
| `/admin/entrar` | Acceso al panel si `ADMIN_PASSWORD` está definida |
| `/unirse`, `/sala/[code]`, `/host/[code]` | Reservadas para Fase 3 (explican qué llegará) |
| `POST /api/games/[gameId]/answers` | Registra una respuesta (Zod + comprobación de dueño) |
| `POST /api/games/[gameId]/finish` | Cierra la partida y recalcula el resumen |

Crear partida no es un endpoint: es un **Server Action** (`src/app/jugar/actions.ts`), así
que el formulario funciona incluso sin JavaScript.

---

## 4. Modelo de datos

| Modelo | Para qué |
| --- | --- |
| `Question` | Banco. Columnas indexadas para filtrar (`type`, `difficulty`, `category`, `status`, `verified`, `season`) + `payload` JSON con lo propio de cada tipo |
| `QuestionStat` | Analítica: veces mostrada, respondida, acertada, abandonos, tiempo total, **dificultad estimada** |
| `GuestPlayer` | Jugador anónimo por cookie. Sin registro |
| `User` | Hueco para cuentas opcionales (Fase 2/3). No se usa |
| `Game` | Configuración, semilla, `poolIds` (permite recargar sin perder la partida), marcador y resumen |
| `GameAnswer` | Cada respuesta con su desglose completo (base, tiempo, racha, multiplicador, apuesta, comodines) |
| `GameEventLog` | Stream de eventos del motor, con `seq` |

Dos decisiones que conviene conocer:

1. **`payload` JSON validado con Zod en el boundary.** La base de datos es flexible y el
   dominio estricto: añadir un séptimo tipo de prueba en Fase 2 no requiere migración.
2. **`category` es String, no enum.** Añadir una categoría es añadir una entrada en
   `domain/questions/categories.ts`.

---

## 5. Mecánicas disponibles

**Seis tipos de prueba**: elección múltiple · verdadero/falso · ¿quién es? (pistas
progresivas; cuantas menos gastes, más multiplica) · el infiltrado · ordena el desastre
(arrastrando **o** con flechas, con acierto parcial) · apuesta final.

**Puntuación** (`domain/scoring/scoring.ts`, con tests):

```
puntos = (base × precisión + bonus de tiempo + bonus de racha)
         × dificultad × pistas sin usar × modificadores de evento/ronda
```

* Acierto 1000 (configurable por pregunta), tiempo **máximo 300 en 6 tramos de 50**: la
  precisión pesa mucho más que los reflejos, y responder 200 ms antes casi nunca cambia nada.
* Racha: +100 por acierto consecutivo con tope de 5 (máx. 500) + bonus de hito.
* Dificultad: ×0.7 … ×1.35 sobre la escala interna 1-10.
* Fallo: 0. La apuesta final suma o resta lo apostado. El marcador nunca baja de cero.

**Rachas** con hitos y textos centralizados · **dificultad adaptativa** (±0.5 / −0.7 tras
dos aciertos o dos fallos, acotada al nivel, desactivable) · **comodines** «Un poquito de
por favor» (+10 s) y «Radio Patio» (descarta una incorrecta, nunca deja una sola opción
viable) · **sucesos**: derrama extraordinaria (×1.5), junta urgente (menos tiempo, ×1.35),
ascensor averiado (×1.25 y −250 si fallas) · **rangos** de Visitante a Leyenda de Radio
Patio según un índice que pesa 65 % precisión y 35 % puntos.

**Tres formatos** (datos, no código de UI): Express 12 preguntas (~5 min), Normal 28
(~12-15 min), Maratón 45 (~20-25 min), todos con ronda final de apuesta.

---

## 6. Calidad y verificación

Todo lo siguiente está ejecutado y en verde en este repositorio:

```
npm run typecheck   ✓ TypeScript estricto, sin `any`
npm run lint        ✓ 0 problemas
npm test            ✓ 140 tests en 10 ficheros
npm run build       ✓ build de producción (17 rutas)
```

Los tests cubren: puntuación (tramos de tiempo, topes, parciales, apuesta), rachas e hitos,
dificultad adaptativa, selección sin repetición y relajación de filtros, comodines
(compatibilidad e inventario), evaluación de los seis tipos, transiciones de la máquina de
estados, sucesos y penalizaciones, **partidas completas** (reproducibles, banco agotado,
abandono), validación de esquemas y del formulario del panel, y contrato de red.

Verificación manual hecha con navegador real (Chromium):

* portada → setup → partida completa → acta de resultados → volver a jugar;
* comodines, apuesta final, sucesos, revelado con desglose y acierto parcial;
* panel: filtros, edición con persistencia comprobada tras recargar, creación con
  redirección, validación rechazando datos inválidos;
* sin errores de consola ni peticiones fallidas; móvil (390 px) y escritorio (1440 px).

---

## 7. Accesibilidad y responsive

Mobile-first, probado a 390 px y 1440 px. HTML semántico, enlace de salto al contenido,
foco visible de 3 px, objetivos táctiles grandes, estados que **nunca** dependen solo del
color (icono + texto + `sr-only`), avisos con `aria-live`, temporizador que anuncia los
últimos segundos, «ordena el desastre» operable con teclado mediante botones subir/bajar
(el arrastre es un extra para ratón) y bloque `prefers-reduced-motion` ya preparado.

---

## 8. Despliegue

El proyecto está listo para Vercel, con dos avisos del terreno conocido del equipo:

1. **No se construye en la nube de Vercel** ni con `vercel build` en Windows. La vía que
   funciona es construir en GitHub Actions (Ubuntu) y subir con `vercel deploy --prebuilt`.
2. **Prisma en Linux**: el generador ya declara `binaryTargets = ["native", "rhel-openssl-3.0.x"]`.
3. Con Neon, las migraciones deben ir por la conexión **directa**: define
   `DATABASE_URL_UNPOOLED` y añade `directUrl = env("DATABASE_URL_UNPOOLED")` al datasource.

---

## 9. Qué queda para las fases siguientes

Resumido; el detalle está en [docs/FASES.md](docs/FASES.md).

* **Fase 2** — dirección artística avanzada, animaciones y sonido, minijuegos, más tipos de
  prueba y power-ups, assets propios en los `placeholder` de `media`, cuentas opcionales.
* **Fase 3** — salas online, WebSockets, móviles como mandos, equipos. El motor y los
  contratos ya están hechos para eso: reducer puro y determinista, eventos tipados con
  número de secuencia y rutas `/unirse`, `/sala/[code]`, `/host/[code]` reservadas.
