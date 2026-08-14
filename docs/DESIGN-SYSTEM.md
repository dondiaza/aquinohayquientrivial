# Design System — «Comunidad»

Sistema visual de El Trivial de la Comunidad. La regla que lo gobierna todo:

> **El edificio es el sistema operativo.** El portal es el menú, el telefonillo conecta
> jugadores, el ascensor carga partidas, el tablón anuncia eventos, las puertas son modos
> y la junta es la clasificación. Si un elemento funcional puede traducirse al mundo del
> juego, se traduce.

Todo es **original**: ni logos, ni fotogramas, ni audio, ni tipografías propietarias. Los
gráficos son CSS y SVG hechos aquí; el sonido se **sintetiza** en el navegador con Web
Audio (no hay ni un fichero de audio de terceros).

---

## 1. Paleta

Tokens en `src/app/globals.css` (`@theme`). Nada de sepia total: la base es cálida pero
los acentos son saturados y actuales.

| Token | Valor | Uso |
| --- | --- | --- |
| `--color-gotele` | `#e7e0d2` | Pared del portal (fondo de la app) |
| `--color-papel` | `#f7f2e6` | Papel, notas, superficies de lectura |
| `--color-papel-viejo` | `#efe6d0` | Impresos, recibos |
| `--color-tinta` | `#23201b` | Texto y bordes |
| `--color-tinta-suave` / `-tenue` | `#5b544a` / `#8a8175` | Texto secundario y terciario |
| `--color-verde-portal` | `#1e4b3e` | Puerta, placas, marca |
| `--color-verde-claro` | `#2f6d59` | Acierto, estados positivos |
| `--color-verde-azulejo` | `#7fa89a` | Azulejo del zaguán (cabeceras) |
| `--color-granate` | `#6d2233` | Moqueta, alfombras, ronda dramática |
| `--color-rojo-buzon` | `#a6301e` | Buzones, avisos, error |
| `--color-naranja-timbre` | `#e0662b` | Timbre, combo, energía |
| `--color-mostaza` | `#e0a32b` | Cartel, aviso amable, bonus |
| `--color-azul-impreso` | `#23557e` | Impresos oficiales, foco, información |
| `--color-azul-claro` | `#4d84ad` | Selección |
| `--color-morado-junta` | `#55385f` | Junta, apuesta, legendario |
| `--color-madera` | `#6b4429` | Marcos, tablón, puertas |
| `--color-metal` | `#9aa0a6` | Ascensor, telefonillo, botones metálicos |
| `--color-crt` | `#0d1b12` | Fondo de pantalla CRT |
| `--color-crt-verde` | `#6ef3a5` | Fósforo verde del CRT |

**Rareza** (power-ups, eventos, insignias): `comun` gris metal · `curioso` azul impreso ·
`raro` morado junta · `legendario` mostaza con borde doble y brillo sutil.

## 2. Tipografía

Todas de Google Fonts con licencia abierta (OFL/Apache), cargadas con `next/font` (self-host
automático, sin peticiones a terceros en runtime):

| Token | Fuente | Uso |
| --- | --- | --- |
| `--font-cartel` | **Anton** | Titulares, cartelería, marcador. Condensada, gritona, muy «cartel de portal» |
| `--font-cuerpo` | **Inter** | Preguntas y texto general. Máxima legibilidad |
| `--font-sello` | **Courier Prime** | Etiquetas, sellos, burocracia, códigos |
| `--font-mano` | **Caveat** | Notas escritas a mano en el tablón |

Escala: `clamp()` en los titulares para que funcionen igual en un móvil pequeño y en una
tele 16:9.

## 3. Formas

Prohibido el sistema «todo son cards redondeadas». El catálogo de formas es:

* **Placa** (`.placa`) — placa de puerta atornillada, con tornillos en las esquinas.
* **Papel** (`.papel`) — hoja con renglones y sombra desplazada.
* **Nota** (`.nota`) — pósit con cinta o chincheta, ligeramente girado.
* **Puerta** (`.puerta`) — panel vertical con cuarterones, mirilla y felpudo.
* **Botón de ascensor** (`.boton-ascensor`) — círculo metálico con luz.
* **Ticket** (`.ticket`) — recibo con borde troquelado.
* **Cartel** (`.cartel`) — anuncio pegado con tipografía condensada.
* **Etiqueta** (`.chip`) — etiqueta pequeña de archivo.
* **CRT** (`.crt`) — pantalla de televisión de los 2000 con scanlines y viñeta.
* **Buzón** (`.buzon`) — puerta metálica con ranura y número.

## 4. Motion

Cuatro velocidades, en tokens (`--dur-*`) y en `src/lib/motion.ts` para JS:

| Velocidad | Duración | Para qué |
| --- | --- | --- |
| `instantanea` | 90 ms | Pulsación, hover, selección |
| `rapida` | 200 ms | Feedback inmediato, chips, contadores |
| `media` | 350 ms | Cambio de pregunta, entrada de paneles |
| `dramatica` | 700 ms | Revelado, sellos, momentos de combo |
| `cartela` | 1400 ms | Entrada de ronda (nunca más de 2 s) |

Curvas: `--ease-salida` (`cubic-bezier(.2,.8,.2,1)`) para entradas, `--ease-golpe`
(`cubic-bezier(.34,1.56,.64,1)`) para impactos con rebote corto.

Reglas: animar sobre `transform`/`opacity`; nada de animar `width`/`top`; y todo el bloque
`@media (prefers-reduced-motion: reduce)` desactiva animación y giros conservando el color y
el texto (el estado NUNCA depende del movimiento).

## 5. Sonido

`src/lib/audio/engine.ts` sintetiza cada efecto con osciladores y envolventes:

| Sonido | Síntesis | Momento |
| --- | --- | --- |
| `seleccion` | click corto filtrado | tocar una respuesta |
| `acierto` | arpegio mayor ascendente | respuesta correcta |
| `fallo` | dos tonos descendentes con distorsión suave | respuesta incorrecta |
| `bonus` / `combo` | campanillas con altura creciente según intensidad | rachas |
| `tic` | pulso seco | últimos segundos |
| `tiempo` | zumbido de telefonillo | tiempo agotado |
| `comodin` | barrido ascendente | usar power-up |
| `evento` | timbre de portal (dos golpes) | cartela de suceso |
| `ronda` | acorde de concurso televisivo | entrada de ronda |
| `ascensor` | «ding» metálico | avanzar de planta |
| `papel` | ruido blanco filtrado muy corto | cambio de pantalla |
| `sello` | golpe seco de sello | registro/logro |
| `victoria` / `derrota` | fanfarria corta / caída de tres notas | final de partida |

Preferencias (volumen, silencio, ambiente) se guardan en `localStorage` y **nunca** se
reproduce nada antes de la primera interacción del usuario.

## 6. Componentes temáticos

En `src/components/portal/`: `BuildingHeader`, `PortalScene`, `DoorCard`, `IntercomPanel`,
`ElevatorDisplay`, `NoticeBoard`, `PaperNotice`, `ApartmentPlaque`, `CommunityStamp`,
`ScoreTicker`, `GossipTicker`, `TVFrame`, `GameShowBanner`, `NeighbourAvatar`,
`ReactionBurst`, `EventOverlay`, `MailboxWall`, `RarityBadge`, `PortalIcon`.

Todos son presentacionales: reciben datos y no contienen reglas de juego.
