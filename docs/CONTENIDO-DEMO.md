# Contenido, veracidad y assets

## El problema

El juego se inspira en el universo de las comedias de comunidad de vecinos españolas. La
tentación obvia sería llenar el banco de preguntas con datos de una serie concreta. No se ha
hecho, por dos razones:

1. **No se puede verificar.** Durante la implementación no había acceso a fuentes fiables
   sobre ninguna serie, y el encargo es explícito: *no inventar como hechos de la serie
   información que no se pueda verificar*. Una pregunta de trivial con un dato inventado no
   es contenido: es desinformación con temporizador.
2. **Propiedad intelectual.** Logotipos, fotogramas, imágenes promocionales, clips, audios y
   fuentes propietarias son material protegido. Tampoco se copian diálogos.

## La solución

Una comunidad de vecinos **original**, creada para este proyecto: **Travesía del Portalón,
13**. Tiene su elenco, sus lugares y cinco "temporadas" de crónica del portal. Está descrita
en [`src/content/portal.ts`](../src/content/portal.ts), que hace de biblia del contenido.

Ventajas:

* el banco es **coherente consigo mismo**, así que se puede jugar de verdad (una pregunta
  responde a otra, hay tramas que cruzan varias categorías);
* no atribuye hechos falsos a una obra ajena;
* el humor, el ambiente y el vocabulario (junta, derrama, Radio Patio, ascensor averiado,
  «un poquito de por favor») sí evocan el universo, que es lo que se pedía;
* el sistema queda listo para importar preguntas verificadas cuando existan.

## Marcado del contenido demo

Las 156 preguntas del seed llevan:

```ts
verified: false
sourceNote: 'CONTENIDO DEMO — comunidad ficticia creada para probar el juego. No es canon de ninguna serie.'
```

La interfaz lo respeta: cada pregunta no verificada muestra el sello **DEMO** durante la
partida, la portada lleva un aviso de contenido, y el panel permite filtrar por
verificada / no verificada.

## Cómo añadir contenido verificado

1. Crea la pregunta desde `/admin/preguntas/nueva` (o añádela a `src/content/demo/*.ts` si
   debe formar parte del seed).
2. Rellena **Nota de fuente** con la referencia concreta que la respalda.
3. Marca **Verificada**. El sello DEMO desaparece para esa pregunta.
4. Las categorías nuevas se añaden en `src/domain/questions/categories.ts` (una entrada, sin
   migración).

Recomendación de estilo, para no acabar copiando la obra: parafrasear siempre, nunca
transcribir diálogos, y preferir preguntas sobre hechos comprobables (quién, dónde, cuándo,
orden de los acontecimientos) antes que sobre frases literales.

## Assets gráficos

No hay ni una imagen de terceros. Toda la identidad es CSS: gotelé de la pared, papel con
renglones, notas con cinta y chincheta, placas de puerta atornilladas, azulejo del portal,
tablón de corcho y sellos de registro (`src/app/globals.css`).

Las fuentes son **de sistema** (`Arial Narrow` con alternativas y las pilas `ui-sans-serif` /
`ui-monospace`), declaradas como tokens `--font-cartel`, `--font-cuerpo` y `--font-sello`:
cambiar la tipografía en Fase 2 es cambiar tres variables.

Para imágenes, audio o vídeo, el modelo de pregunta tiene `media` con un campo
`placeholder`: mientras no haya un asset propio se muestra un marco punteado con el texto del
placeholder y la etiqueta «asset pendiente». Cuando exista el asset original, se rellena
`media.src` y aparece en su sitio, sin tocar código.
