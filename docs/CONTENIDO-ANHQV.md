# Contenido, veracidad y derechos

Este documento explica de dónde sale cada pregunta del juego, qué se ha corregido del
material de origen, qué se ha dejado fuera y por qué en la web no hay ni un fotograma de la
serie.

---

## 1. El material de origen

El contenido viene de un **pack editorial** entregado con el proyecto y guardado sin tocar en
[`src/content/anhqv/data/`](../src/content/anhqv/data/). Los documentos de acompañamiento
están en [`docs/pack/`](pack/).

| Fichero | Qué trae |
| --- | --- |
| `preguntas.json` | 958 preguntas (`Q0001`–`Q0958`) en 14 familias |
| `pruebas.json` | 260 pruebas y retos con sus reglas y su puntuación |
| `modos.json` | 48 modos de juego (campañas, eventos, sesiones) |
| `rondas.json` | 120 rondas preconstruidas de 10 preguntas |
| `tarjetas.json` | 174 tarjetas de microcontenido |

El pack declara sus fuentes: la biblia editorial propia y, para producción, casting,
audiencias, Campanadas y adaptaciones, **Antena 3 y FormulaTV**. Cada entrada conserva su
`source_hint`, que es información para revisión editorial y **no se muestra al jugador**.

La biblia editorial (reparto, intérpretes, zonas del edificio, relaciones y hitos por
temporada) está pasada a código en [`src/content/serie.ts`](../src/content/serie.ts). Es la
única fuente de verdad de nombres del proyecto: el generador de distractores lee de ahí, así
que un dato mal escrito en ese fichero contamina cientos de preguntas.

---

## 2. Cómo se importa

El pack no está escrito para este motor: trae familias que aquí no existen y muchas entradas
sin opciones. La traducción la hace
[`src/content/anhqv/importar.ts`](../src/content/anhqv/importar.ts) con tres reglas:

1. **Los ids no se tocan.** `Q0001` es `Q0001` en la base de datos. Así el pack se puede
   volver a importar, corregir y comparar contra su origen.
2. **No se inventan hechos.** La respuesta y la explicación son las del pack.
3. **Lo que no se puede jugar limpio, no se publica.** Se importa igual, pero como borrador
   con `needsReview: true`: queda en el panel y fuera de las partidas.

### Correspondencia de familias

| Familia del pack | Se juega como | Cuántas |
| --- | --- | --- |
| `opcion_multiple` | Elección múltiple (una de cada cuatro difíciles, a apuesta final) | 320 |
| `verdadero_falso` | Verdadero o falso | 191 |
| `respuesta_corta` | Ficha del vecino si es tecleable; si no, opciones | 212 |
| `ficha_rapida` | Ficha del vecino | 18 |
| `cadena_relacional` | Ficha del vecino | 18 |
| `pistas_progresivas` | ¿Quién es? (las pistas salen del propio enunciado) | 26 |
| `intruso` (4 opciones) | El infiltrado | 13 |
| `intruso` (2-3 opciones) | Verdadero/falso: «entre los vínculos de X figura Y» | 13 |
| `intruso` («ancla de…») | Reconstruida desde la biblia: quién se asocia con esa zona | 9 |
| `ordenar` | Ordena el desastre (2 hitos del pack + los que falten de la biblia) | 4 |
| `emparejar`, `clasificacion`, `inferencia`, `doble_pista`, `comparacion`, `seleccion_multiple` | Opciones, con su propia presentación | 134 |

Las 14 familias **no se pierden**: se conservan en el campo `variant`, que decide el rótulo,
la instrucción y cómo se parte el enunciado (dos lados enfrentados en `emparejar`, pistas en
fichas en `doble_pista`…). El motor solo necesita saber cómo se responde; el jugador sí nota
la diferencia. Catálogo en
[`src/domain/questions/variants.ts`](../src/domain/questions/variants.ts).

### Escalas y campos

* **Dificultad**: el pack usa 1–5, el motor 1–10. Se multiplica por dos. En `¿quién es?` se
  recalcula con el número de pistas, porque con dos cuesta bastante más que con cuatro.
* **Etiquetas**: las entradas antiguas (`Q0001`–`Q0358`) traen una cadena con comas y las
  nuevas un array. Siempre acaban en array.
* **`spoiler`**, **`confidence`** y **`source_hint`** se conservan. Los dos primeros son
  columnas indexadas porque se filtra por ellos en cada pregunta de cada partida.
* **`factKey`**: huella del hecho preguntado. El pack genera tríos sobre el mismo dato
  (escrita + opciones + verdadero/falso); compartir huella permite que la selección no meta
  dos formas del mismo hecho en la misma partida.

---

## 3. Los distractores: dónde está el riesgo

Buena parte del pack trae la respuesta correcta y `options: []`. Para poder jugarlas hay que
fabricar los tres distractores, y ahí es donde una pregunta buena se convierte en una
pregunta con dos respuestas válidas. El orden de preferencia
([`pools.ts`](../src/content/anhqv/pools.ts)) es:

1. **Las del propio pack**, cuando ya trae cuatro y la respuesta está entre ellas *(389)*.
2. **Las de su hermano.** El trío del mismo hecho: el del medio ya trae cuatro opciones
   revisadas, así que se reutilizan *(31)*.
3. **Conjunto cerrado de la biblia**: si la respuesta es un intérprete, un personaje, una
   zona o una temporada, los distractores salen de esa tabla. Plausibles por definición e
   inequívocamente falsos *(52)*.
4. **Misma categoría y misma «pinta»**: respuestas de otras preguntas de la misma categoría
   con el mismo número de palabras y el mismo formato *(54)*.
5. Si nada de eso da tres distractores honestos, la pregunta **no se publica** *(6)*.

Todo es determinista: la semilla es el id de la pregunta, así que el banco sembrado hoy y el
de dentro de un mes son idénticos (hay un test que lo comprueba).

---

## 4. Lo que se ha corregido del pack

El corpus se revisó con tres comprobaciones automáticas más una lectura de lo que salió:

| Comprobación | Resultado |
| --- | --- |
| Enunciados que contienen su propia respuesta | 7 (3 `intruso`, 4 `ordenar`) |
| Verdadero/falso que se contradicen con su propia explicación | 1 |
| Verdadero/falso cuyo valor sustituido viene de otra categoría | 3 |
| Verdadero/falso que afirman el valor correcto y están marcados «Falso» | 0 |

Las **seis erratas** corregidas están en la tabla `ERRATAS` de `importar.ts`, cada una con su
motivo escrito al lado. Se corrigen ahí y **no en el JSON**, para que el fichero del pack
siga siendo el original y la diferencia quede a la vista:

* **`Q0003`** — «La serie original se estrenó en Antena 3» venía marcada como **Falso**, y es
  verdad. El enunciado que se quería poner en duda era la fecha, no la cadena.
* **`Q0304`, `Q0305`, `Q0306`** y la tarjeta **`C0102`** — el pack atribuía
  «Un poquito de por favor» a **Emilio**. Es la muletilla de **Juan Cuesta**. Es
  probablemente el dato más conocido de la serie, así que dejarlo mal habría sido el error
  más visible del banco.
* **`Q0045`** — «El episodio más visto es *arquitecto*»: el valor venía de otra categoría y
  el enunciado quedaba sin sentido.
* **`Q0309`** — comparaba una frase de un personaje con el nombre de una actriz.

Los enunciados que se autorrespondían se han reconstruido (los nueve «ancla de…» se
regeneran desde la biblia preguntando lo que querían preguntar) o se han quedado en borrador.

**8 entradas** siguen marcadas `needsReview` y en `DRAFT`: no dan para cuatro opciones
honestas ni para una respuesta tecleable. El seed las lista por id al terminar.

---

## 5. Contenido derivado de la biblia

El pack cubre de sobra las familias de preguntar-y-responder, pero no trae material para las
que se juegan con las manos. Sin ellas el juego pierde lo que lo separa de un cuestionario,
así que se generan **75 preguntas** desde la biblia
([`derivadas.ts`](../src/content/anhqv/derivadas.ts)):

| Qué | Cuántas | De dónde sale |
| --- | --- | --- |
| El infiltrado por zona | 6 | Tres vecinos de un piso y uno de otro |
| El infiltrado por relación | 11 | Tres vínculos clave de un personaje y uno que no lo es |
| ¿Quién es? | 27 | Rasgo → zona → papel → intérprete, de lo vago a lo evidente |
| Ordena el desastre | 6 | Hitos de temporadas distintas |
| Memoria del portal | 6 | Vecinos de dos plantas; se pregunta por uno que no estaba |
| Escena del portal | 5 | Quién se asocia a una zona y quién no |
| La junta | 8 | Situaciones de comunidad escritas para el juego |
| Portero automático | 8 | Secuencias de timbres con los pisos reales |

Los ids llevan prefijo `D-` para no chocar nunca con los `Q` del pack. Dos matices honestos:
la **memoria** y el **portero automático** no afirman nada (son ejercicios de memoria
ambientados en el portal) y **la junta** es rol, no hay respuesta «verdadera»; las tres van
con la nota `NOTA_MINIJUEGO`.

---

## 6. Qué es «verificada»

`verified` refleja la confianza que declara el pack (`confidence: high`). La interfaz lo
respeta: lo verificado lleva sello verde y lo demás sale como **pendiente de contrastar**. El
panel permite filtrar por verificada / no verificada, por destripe, por familia y por
`needsReview`.

Para añadir contenido propio:

1. Crea la pregunta en `/admin/preguntas/nueva` (o añádela al importador si debe ir en el seed).
2. Rellena **Nota de fuente** con la referencia concreta que la respalda.
3. Marca **Verificada**.
4. Las categorías nuevas se añaden en `src/domain/questions/categories.ts`: una entrada, sin
   migración.

Recomendación de estilo, para no acabar copiando la obra: parafrasear siempre, no transcribir
diálogos más allá de una expresión corta, y preferir hechos comprobables (quién, dónde,
cuándo, en qué orden) antes que frases literales.

---

## 7. Spoilers

El pack clasifica cada pregunta en `none` / `light` / `major`. El modo **sin spoilers** del
setup descarta todo lo `major` —muertes, bodas decisivas y final de la quinta— y ese filtro
**no se relaja nunca**, ni cuando el banco se queda corto: es una promesa al jugador, no una
preferencia. Hay 13 preguntas `major` y 42 `light`; con el modo activado quedan más de 900
jugables.

---

## 8. Imágenes y derechos

**No hay ni una imagen de terceros en el repositorio.** Los fotogramas, promocionales,
carteles y logotipos de la serie son de Antena 3 y de la productora, y distribuirlos sin
licencia no se arregla con una nota al pie.

Toda la identidad es original: la fachada de Desengaño 21 en SVG, los retratos del reparto
compuestos con piezas geométricas propias (`src/components/serie/Retrato.tsx`), las placas de
puerta, los buzones, el tablón de corcho y los sellos de registro en CSS. Los retratos **no
buscan el parecido** a propósito: son siluetas de portal, no caricaturas de las personas que
interpretaron a los personajes; lo que identifica a cada vecino es su piso, su color y su
ficha.

Las tipografías (Anton, Inter, Courier Prime, Caveat) son de licencia abierta y las
auto-aloja `next/font`: no hay peticiones a terceros en runtime. El sonido son 19 efectos
sintetizados con Web Audio: cero ficheros de audio, cero licencias que revisar.

### Huecos de imagen

Si alguien tiene los derechos, hay un hueco preparado para cada personaje, cada zona y la
fachada. Se copia el fichero en `public/serie/` con el nombre del hueco y la web lo usa en
lugar del dibujo; si se borra, vuelve el dibujo. Sin tocar código. Instrucciones completas en
[`public/serie/LEEME.md`](../public/serie/LEEME.md); la detección está en
[`src/content/imagenes.ts`](../src/content/imagenes.ts).

El modelo de pregunta mantiene además el campo `media` con su `placeholder` para ilustrar
preguntas concretas cuando exista el asset.
