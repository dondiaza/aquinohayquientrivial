# Imágenes de la serie

Esta carpeta está **vacía a propósito**.

La web se ilustra sola: todo lo que se ve —la fachada de Desengaño 21, los retratos del
reparto, las placas de los pisos, los buzones— es arte **original** del proyecto, hecho en
SVG y CSS. No hace falta ninguna imagen para que la web esté completa.

Los fotogramas, promocionales, carteles y logotipos de *Aquí no hay quien viva* son de
**Antena 3** y de la productora. No están en este repositorio y no se sirven desde aquí:
distribuirlos sin licencia no es cosa que se arregle con una nota al pie.

## Si tienes los derechos (o una licencia)

Copia los ficheros con el nombre del hueco que quieras cubrir y vuelve a desplegar. En
cuanto el fichero existe, la web lo usa en lugar del dibujo; si lo borras, vuelve el
dibujo. No hay que tocar código.

Formatos admitidos, en orden de preferencia: `.webp`, `.avif`, `.jpg`, `.jpeg`, `.png`, `.svg`.

### Huecos disponibles

```
public/serie/
├── portal/
│   ├── fachada.webp          Cabecera de la portada (16:9, ≥1600 px de ancho)
│   └── portal-interior.webp  Cabecera de «El portal» (16:9)
├── zonas/
│   ├── 1-a.webp   1-b.webp   2-a.webp   2-b.webp
│   ├── 3-a.webp   3-b.webp
│   └── porteria.webp   videoclub.webp   atico.webp
└── vecinos/
    ├── juan-cuesta.webp        paloma-hurtado.webp     natalia-cuesta.webp
    ├── jose-miguel-cuesta.webp emilio-delgado.webp     mariano-delgado.webp
    ├── belen-lopez-vazquez.webp alicia-sanz.webp       lucia-alvarez.webp
    ├── roberto-alonso.webp     mauri-hidalgo.webp      fernando-navarro.webp
    ├── marisa-benito.webp      vicenta-benito.webp     concha.webp
    ├── isabel-ruiz.webp        andres-guerra.webp      pablo-guerra.webp
    ├── alex-guerra.webp        bea-villarejo.webp      paco.webp
    ├── yago.webp               maria-jesus-vazquez.webp rafael-alvarez.webp
    ├── ana.webp                nieves-cuesta.webp
    └── …
```

El nombre del fichero es el nombre del personaje en minúsculas, sin tildes y con guiones
(lo genera `slug()` en `src/content/imagenes.ts`). Los retratos se recortan a 3:4 y las
zonas a 16:9, así que conviene que el motivo esté centrado.

### Comprobar qué huecos están cubiertos

`resumenDeImagenes()` en `src/content/imagenes.ts` devuelve el recuento, y la portada lo
muestra en el aviso de contenido.
