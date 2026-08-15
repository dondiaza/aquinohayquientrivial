# EL TRIVIAL DE DESENGAÑO 21 — Fases 1, 2 y contenido ANHQV

Trivial / party-game sobre **AQUÍ NO HAY QUIEN VIVA** (Antena 3, 7 de septiembre de 2003 –
6 de julio de 2006): el reparto, los pisos, las relaciones, las tramas, la producción, las
audiencias y las adaptaciones, con la estética de una junta de vecinos de principios de los
2000.

* **Fase 1 (completa):** arquitectura, motor de juego, contenido, navegación y producto
  funcional en modo solitario.
* **Fase 2 (completa):** identidad propia. Sistema de diseño «Comunidad», sonido original
  sintetizado, home cinemática donde el portal ES el menú, comodines con rareza, director
  de partida, combos, progresión con logros y rangos, reto del día, desafíos con semilla,
  modo fantasma, ceremonia de resultados y PWA.
* **Contenido ANHQV (completo):** el pack editorial entero importado y jugable — 958
  preguntas del pack + 75 derivadas de la biblia, 11 familias de prueba (incluida la de
  escribir la respuesta), 14 temáticas, modo sin spoilers, 260 pruebas, 48 modos, 120
  rondas preconstruidas y 174 tarjetas. Ver [docs/CONTENIDO-ANHQV.md](docs/CONTENIDO-ANHQV.md).
* **Fase 3 (jugable):** salas en tiempo real. Pantalla grande con código y QR, móviles como
  mando, servidor autoritativo, equipos, comodines multijugador, reconexión y ceremonia
  final. Ver [docs/FASE3-SALAS.md](docs/FASE3-SALAS.md) y la decisión de transporte en
  [docs/FASE3-REALTIME.md](docs/FASE3-REALTIME.md).

> **Qué es y qué no es.** Este es un juego de aficionados sobre una serie ajena. Las
> preguntas son **datos sobre la serie** (reparto, pisos, fechas, tramas), con su
> explicación y su fuente. Lo que NO hay es material con derechos: ni un fotograma, ni un
> logotipo, ni una tipografía, ni un audio de la serie. Toda la identidad gráfica —fachada,
> retratos, placas, buzones— es **original**, hecha en SVG y CSS. Los huecos para imágenes
> con licencia están preparados y documentados en
> [public/serie/LEEME.md](public/serie/LEEME.md): quien tenga los derechos copia los
> ficheros y la web los usa sin tocar código. Sin relación ni afiliación con Antena 3,
> Atresmedia ni la productora.

---

## 1. Puesta en marcha

Requisitos: **Node 20.11+** (probado con Node 24). No hace falta Docker ni instalar
PostgreSQL: hay un PostgreSQL embebido para desarrollo.

```bash
npm install
cp .env.example .env          # en Windows: copy .env.example .env

# Terminal 1 — base de datos local (déjala abierta)
npm run db:up

# Terminal 2 — migraciones + cliente Prisma + banco de preguntas de la serie
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
| `npm test` | Tests de dominio y de contenido con Vitest (200 tests) |
| `npm run test:watch` | Vitest en modo watch |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (flat config + typescript-eslint + react-hooks) |
| `npm run verify` | typecheck + lint + test + build, en ese orden |
| `npm run db:up` | PostgreSQL local embebido (primer plano) |
| `npm run setup` | `migrate deploy` + `generate` + `seed` |
| `npm run db:migrate` | Nueva migración en desarrollo |
| `npm run db:seed` | Siembra/actualiza el banco de la serie (idempotente; archiva lo que ya no está) |
| `npm run db:reset` | Borra y recrea la base de datos |
| `node scripts/simular-sala.mjs --jugadores 8` | Simula una partida multijugador real contra el servidor |
| `node scripts/colocar-imagenes.mjs <carpeta>` | Coloca tus imágenes en los huecos de `public/serie/` |

---

## 2. Identidad y sensaciones (Fase 2)

* **Sistema de diseño documentado** en [docs/DESIGN-SYSTEM.md](docs/DESIGN-SYSTEM.md):
  paleta, tipografías libres (Anton, Inter, Courier Prime, Caveat), catálogo de formas
  (placa, papel, nota, puerta, botón de ascensor, ticket, cartel, CRT, buzón) y cuatro
  velocidades de motion.
* **Sonido original sintetizado** con Web Audio (`src/lib/audio/`): 19 efectos generados en
  el navegador, cero ficheros de audio, cero licencias que revisar. Volumen, silencio y
  ambiente persistentes; nunca suena nada antes de la primera interacción.
* **Home cinemática**: fachada en SVG y planta baja interactiva — puerta = jugar,
  telefonillo = salas, tablón = cómo jugar, ascensor = perfil, buzones = logros.
* **Game feel**: combos escalados, tensión del temporizador en tres niveles, revelado
  coreografiado con desglose de puntos, cartelas de ronda, cartela de suceso a pantalla
  completa, números flotantes, chispas, sellos y vibración donde el dispositivo la soporta.
* **Accesibilidad**: `prefers-reduced-motion` desactiva movimiento y giros sin perder
  información, todos los estados llevan icono y texto además de color, el modo «a oscuras»
  mantiene la información para lectores de pantalla y el temporizador se anuncia.

## 3. Arquitectura

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
│  ├─ copy/                   TODOS los textos: rachas, feedback, UI y el PRESENTADOR
│  ├─ progression/            experiencia y rangos de vecindad
│  ├─ achievements/           catálogo de logros y su evaluación
│  ├─ challenges/             reto del día y desafíos con semilla
│  ├─ players/                catálogo de avatares (arquetipos, colores, marcos)
│  ├─ rng.ts                  azar determinista con semilla
│  └─ engine/                 estado, acciones, máquina de estados, eventos, contrato de red
├─ server/                    ← ACCESO A DATOS. Prisma y nada más.
│  ├─ questions/              repositorio (Postgres ⇄ dominio, validando con Zod)
│  ├─ games/                  crear partida, registrar respuestas, cerrar y resumir
│  ├─ players/                perfil, progresión, logros, récords y fantasma
│  ├─ guest.ts                cookie anónima de invitado
│  └─ admin.ts                puerta del panel
├─ lib/                       ← audio sintetizado y sistema de motion
├─ content/                   ← CONTENIDO
│  ├─ serie.ts                biblia editorial: reparto, zonas, relaciones y temporadas
│  ├─ imagenes.ts             huecos de imagen (public/serie/) con respaldo de arte propio
│  ├─ builders.ts             constructores de preguntas validables con Zod
│  └─ anhqv/                  pack editorial: data/*.json + importador + derivadas + catálogos
├─ components/                ← UI. ui/ · portal/ (identidad) · game/ · admin/ · layout/
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
| `GameEvent` | `domain/events/` | Suceso de juego: derrama, junta urgente, obras, inspección… Los dirige `domain/events/director.ts` |
| `EngineEvent` | `domain/engine/engine-events.ts` | Mensaje tipado del motor: `QUESTION_STARTED`, `ANSWER_SUBMITTED`… |

Los `EngineEvent` se persisten hoy en `GameEventLog` (trazabilidad y analítica) y en Fase 3
son exactamente lo que viajará por WebSocket.

### Reparto cliente / servidor

El motor corre en el cliente y el servidor **registra**: cada respuesta se persiste con su
desglose y **el resumen final lo recalcula el servidor** a partir de lo persistido (con la
misma función pura `buildSummary`), no se acepta un resumen enviado por el cliente.
En Fase 3 se invierte el reparto sin tocar el motor ni el modelo de datos.

---

## 4. Rutas

| Ruta | Qué es |
| --- | --- |
| `/` | Portada: qué es el juego y **JUGAR AHORA** (una partida en un clic) |
| `/jugar` | Selección de modo (solitario jugable; con vecinos, Fase 3) |
| `/jugar/solo` | Setup: duración, dificultad, temática (14), adaptativa, **sin spoilers**, nombre |
| `/portal` | El edificio planta por planta: quién vive dónde, reparto, temporadas y relaciones |
| `/pruebas` | Las 260 pruebas y los 48 modos del pack, con filtros y con qué ronda se juega cada una |
| `/tarjetas` | Las 174 tarjetas de curiosidades, filtrables por categoría |
| `/partida/[gameId]` | La partida (motor en el cliente) |
| `/resultados/[gameId]` | Acta de la partida: estadísticas, rango, por rondas y por tipo |
| `/como-jugar` | Reglas **generadas desde el dominio** (nunca se desactualizan) |
| `/reto` | Reto del día + tablón de resultados |
| `/desafio` | Desafíos con etiqueta compartible |
| `/perfil` | Ficha de vecino: avatar, rango, logros y récords |
| `/admin` | Portería: estado del banco y del juego |
| `/admin/preguntas` | Listado con búsqueda y filtros (tipo, categoría, estado, temporada, verificada) |
| `/admin/preguntas/nueva` | Crear pregunta con previsualización en vivo |
| `/admin/preguntas/[id]` | Editar, activar/desactivar, duplicar, borrar + analítica |
| `/admin/entrar` | Acceso al panel si `ADMIN_PASSWORD` está definida |
| `/entrar` | Guardar el progreso: acceso por enlace mágico, sin contraseña |
| `/perfil/[username]` | Ficha pública, filtrada por la privacidad de cada uno |
| `/amigos` | Vecinos, solicitudes y tu código de amigo |
| `/ajustes` | Privacidad, avisos, no molestar, dispositivos y borrar la cuenta |
| `/host` | Abrir una sala: duración, dificultad, temática y equipos |
| `/host/[code]` | **La pantalla grande**: código enorme, QR, lobby, pregunta, revelado y ceremonia |
| `/unirse` · `/unirse/[code]` | Entrar con código o directo desde el QR |
| `/sala/[code]` | **El mando**: lo que ve cada jugador en su móvil |
| `POST /api/salas` | Crea una sala y devuelve código y token de host |
| `POST /api/salas/[code]/unirse` | Entra o **recupera** la identidad (misma llamada) |
| `POST /api/salas/[code]/intencion` | La única puerta por la que un cliente cambia algo |
| `GET /api/salas/[code]/eventos` | Stream por cursor: SSE con caída a sondeo |
| `GET /api/salas/[code]/snapshot` | Foto completa, ya filtrada para quien pregunta |
| `POST /api/cuenta/acceso` · `/canjear` · `/salir` · `/borrar` | Acceso sin contraseña y ciclo de vida de la cuenta |
| `GET`/`POST` `/api/amigos` | Vecinos, solicitudes y bloqueos |
| `GET`/`POST` `/api/notificaciones` | Buzón y marcar como leídas |
| `POST` `/api/notificaciones/suscripcion` | Alta de dispositivo para Web Push |
| `GET`/`POST` `/api/ajustes` | Privacidad y preferencias de aviso |
| `POST /api/jobs` | Trabajos programados (los dispara GitHub Actions con `JOBS_SECRET`) |
| `POST /api/games/[gameId]/answers` | Registra una respuesta (Zod + comprobación de dueño) |
| `POST /api/games/[gameId]/finish` | Cierra la partida y recalcula el resumen |

Crear partida no es un endpoint: es un **Server Action** (`src/app/jugar/actions.ts`), así
que el formulario funciona incluso sin JavaScript.

---

## 5. Modelo de datos

| Modelo | Para qué |
| --- | --- |
| `Question` | Banco. Columnas indexadas para filtrar (`type`, `difficulty`, `category`, `status`, `verified`, `season`, `spoiler`, `factKey`, `needsReview`) + `payload` JSON con lo propio de cada tipo |
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

## 6. Mecánicas disponibles

**Once familias de prueba**: elección múltiple · verdadero/falso (Radio Patio) ·
**ficha del vecino (se escribe la respuesta)** · ¿quién es? (pistas progresivas,
presentadas en buzones que decides abrir) · el infiltrado · ordena el desastre (arrastrando
**o** con flechas, con acierto parcial) · la derrama (apuesta) · memoria del portal
(objetos que desaparecen) · ¿qué falta aquí? (composición visual con iconos propios) ·
la junta (decisiones con peso y consecuencia) · portero automático (secuencia de timbres).

Encima de las once, las **14 familias del pack** (`emparejar`, `doble_pista`,
`clasificacion`, `ficha_rapida`, `inferencia`, `comparacion`, `cadena_relacional`…) se
conservan como *presentación*: cambian el rótulo, la instrucción y cómo se parte el
enunciado (dos lados enfrentados, pistas en fichas…) sin duplicar catorce vistas casi
idénticas. Catálogo en `domain/questions/variants.ts`.

**Rondas con identidad**: calentando la junta, Radio Patio, ¿quién vive aquí?, **ficha del
vecino**, memoria del portal, ¿qué falta aquí?, la junta, llamada al telefonillo
(ultrarrápida), caos en el portal, lectura del acta, apagón relámpago, la derrama y
presidente por un día. Dos de
ellas incorporan minijuego: **buzones** (pistas ocultas) y **ascensor** (el progreso sube
plantas y se para al fallar).

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

**Combos y rachas** con hitos en 2/3/5/8 y efectos que escalan · **dificultad adaptativa**
(±0.5 / −0.7 tras dos aciertos o dos fallos, acotada al nivel, desactivable).

**Seis comodines con rareza**: un poquito de por favor (+5 s) · Radio Patio (descarta una
incorrecta o adelanta una pista) · junta extraordinaria (×2) · se ha ido la luz (a ciegas
×3) · cambio de presidente (cambia la pregunta) · fondo de reserva (protege la mitad de la
apuesta). Máximo dos por pregunta, y cada uno declara dónde tiene sentido.

**Siete sucesos** dirigidos por un **director de partida** que mira ronda, racha,
rendimiento y sequía: nunca en las dos primeras preguntas, nunca dos seguidos y los que
castigan solo aparecen si vas bien (si vas mal, aparecen los que ayudan).

**Progresión ligera**: experiencia por terminar, precisión, dificultad y variedad, con
siete rangos de Visitante a Leyenda del portal, 15 logros con rareza y marcos de avatar
que se desbloquean. **Reto del día** determinista (misma partida para todos, sin cuenta),
**desafíos con etiqueta compartible** tipo `#21DESENGANO` y **modo fantasma** contra tu
propio récord.

**Modo sin spoilers**: cada pregunta trae del pack su nivel de destripe
(`none` / `light` / `major`) y es una columna indexada. Con el modo activado, la selección
descarta todo lo marcado como destripe grave —muertes, bodas decisivas y final de la
quinta— y ese filtro **no se relaja nunca**, ni cuando el banco se queda corto.

**Sin repetir el mismo dato**: el pack genera tríos sobre un mismo hecho (escrita, opción
múltiple y verdadero/falso). Cada pregunta guarda una huella del hecho (`factKey`) y la
selección evita que dos formas del mismo dato caigan en la misma partida.

**Tres formatos** (datos, no código de UI): Express 12 preguntas (~5 min), Normal 32
(~13-16 min), Maratón 50 (~21-26 min), todos con ronda final de apuesta.

---

## 7. Calidad y verificación

Todo lo siguiente está ejecutado y en verde en este repositorio:

```
npm run typecheck   ✓ TypeScript estricto, sin `any`
npm run lint        ✓ 0 problemas
npm test            ✓ 200 tests en 14 ficheros
npm run build       ✓ build de producción (24 rutas)
npm run db:seed     ✓ 1033 preguntas sembradas (950 publicadas, 8 en revisión)
```

Los tests cubren: puntuación (tramos de tiempo, topes, parciales, apuesta), rachas e hitos,
dificultad adaptativa, selección sin repetición y relajación de filtros, comodines
(compatibilidad e inventario), evaluación de las once familias, tolerancia de las respuestas
escritas (tildes, artículos, erratas, y que NO cuele otra respuesta), transiciones de la
máquina de estados, sucesos y penalizaciones, **partidas completas** (reproducibles, banco
agotado, abandono), validación de esquemas y del formulario del panel, y contrato de red.

Y sobre el contenido real, no sobre fixtures (`src/content/anhqv/banco.test.ts`):

* el pack entero valida con Zod, sin ids perdidos ni repetidos (`Q0001`… siguen siendo suyos);
* las once familias tienen preguntas jugables y repartidas por dificultad;
* en las de opciones, la respuesta correcta aparece **exactamente una vez** y no hay opciones repetidas;
* **ningún enunciado publicado contiene su propia respuesta** (el pack traía siete que sí);
* se juega una partida completa de cada formato sin repetir pregunta **ni hecho**;
* con el modo sin spoilers no sale ni una pregunta de destripe grave;
* el importador es determinista: mismo JSON, mismo banco;
* las 120 rondas preconstruidas apuntan a preguntas que existen.

Verificación manual hecha con navegador real (Chromium):

* portada → setup → partida completa → acta de resultados → volver a jugar;
* comodines, apuesta final, sucesos, revelado con desglose y acierto parcial;
* panel: filtros, edición con persistencia comprobada tras recargar, creación con
  redirección, validación rechazando datos inválidos;
* sin errores de consola ni peticiones fallidas; móvil (390 px) y escritorio (1440 px).

---

## 8. Accesibilidad y responsive

Mobile-first, probado a 390 px y 1440 px. HTML semántico, enlace de salto al contenido,
foco visible de 3 px, objetivos táctiles grandes, estados que **nunca** dependen solo del
color (icono + texto + `sr-only`), avisos con `aria-live`, temporizador que anuncia los
últimos segundos, «ordena el desastre» operable con teclado mediante botones subir/bajar
(el arrastre es un extra para ratón) y bloque `prefers-reduced-motion` ya preparado.

---

## 9. Despliegue

El proyecto está listo para Vercel, con dos avisos del terreno conocido del equipo:

1. **No se construye en la nube de Vercel** ni con `vercel build` en Windows. La vía que
   funciona es construir en GitHub Actions (Ubuntu) y subir con `vercel deploy --prebuilt`.
2. **Prisma en Linux**: el generador ya declara `binaryTargets = ["native", "rhel-openssl-3.0.x"]`.
3. Con Neon, las migraciones deben ir por la conexión **directa**: define
   `DATABASE_URL_UNPOOLED` y añade `directUrl = env("DATABASE_URL_UNPOOLED")` al datasource.

---

## 10. Qué queda para las fases siguientes

Resumido; el detalle está en [docs/FASES.md](docs/FASES.md).

* **Fase 2** — hecha. Queda pendiente para más adelante: música (hoy solo hay efectos y
  ambiente), más minijuegos y cuentas opcionales sobre el modelo `User`.
* **Contenido** — 8 entradas del pack están marcadas `needsReview` y esperan una pasada
  humana (el seed las lista por id). Del catálogo de 260 pruebas, 20 familias ya tienen su
  ronda en el motor; el resto está descrito en `/pruebas` y aún por construir.
* **Imágenes** — la web está completa con arte propio. Si se consigue licencia, los huecos
  de `public/serie/` (fachada, 9 zonas y 27 vecinos) se rellenan copiando ficheros.
* **Fase 3** — jugable de punta a punta: se abre una sala, se escanea el QR, se juega desde
  el móvil y termina con ceremonia. Queda pendiente lo que está listado al final de
  [docs/FASE3-SALAS.md](docs/FASE3-SALAS.md): rondas sociales completas, duelo 1v1,
  traspaso de presidencia y E2E con navegadores reales.
* **Fase 4 (en marcha)** — cuentas opcionales por enlace mágico, migración del progreso de
  invitado, experiencia con libro mayor y antifarmeo, rachas con seguro y recuperación,
  amigos y bloqueos, desafíos asíncronos, ligas, buzón de notificaciones con motor de
  reglas, Web Push, privacidad y trabajos programados. Estado exacto y lo que falta en
  [docs/FASE4-RETENCION.md](docs/FASE4-RETENCION.md).
