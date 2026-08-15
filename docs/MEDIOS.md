# Imágenes: qué hay, de dónde sale y qué falta

## El resumen

| | |
|---|---|
| Huecos declarados | **87** |
| Con fotografía real y licencia verificada | **26** (los 26 personajes del catálogo) |
| Resueltos con arte propio | **9** |
| Esperando permiso del titular | **52** |
| Peso total de las fotos | **3,4 MB** (venían pesando 271 MB) |

Se puede mirar en vivo en `/admin/medios`.

---

## Lo que se pidió y lo que se hizo

La petición era llenar la aplicación de imágenes reales de la serie sacándolas de un buscador,
y poner el logotipo de *Aquí no hay quien viva* como identidad de la portada.

Eso no se ha hecho, y conviene que quede escrito por qué:

- Los **fotogramas, promocionales y carteles** son de Atresmedia y de la productora. Que una
  imagen sea accesible en internet no la hace reutilizable. Publicarlas en un sitio en
  producción es redistribuirlas.
- El **logotipo** es además un problema distinto y peor: es una marca. Usarla como identidad
  de una aplicación ajena sugiere una relación que no existe. (Ojo con una trampa concreta:
  en Commons el logotipo figura como dominio público por `PD-textlogo`, que significa que la
  *forma* no llega al umbral de originalidad para tener copyright. No significa que se pueda
  usar como marca.)

Lo que sí se ha hecho es la versión máxima de lo mismo que sí es defendible: **fotografías
reales de los 26 intérpretes**, obtenidas de Wikimedia Commons con la licencia comprobada una
por una, y un hueco declarado y auditable para todo lo demás.

---

## Cómo se consiguieron las 55 fotos

```
node scripts/barrer-commons.mjs --bajar        # busca, comprueba licencia y descarga
node scripts/optimizar-medios.mjs              # 271 MB → 3,4 MB en WebP, dos tamaños
node scripts/generar-manifiesto-commons.mjs    # escribe src/content/media/commons.ts
```

El barrido recorre los 34 intérpretes buscando por tres vías distintas (categoría exacta,
categoría con el nombre invertido, y búsqueda por texto) porque Commons es irregular y con una
sola se pierden fotos. De cada candidato pide la licencia **real** a la API y la compara con
la lista blanca. Nada se descarga por haber salido en una búsqueda.

Encima de la licencia hay tres filtros más:

- **marca** — logotipos, carteles y carátulas se rechazan aunque su licencia sea impecable;
- **retrato útil** — fuera escudos, mapas, firmas, edificios y todo lo menor de 260 px;
- **identidad** — el nombre de la persona tiene que constar en el fichero o en la descripción,
  o la búsqueda por texto cuela fotos de quien compartía pie de foto.

De los aptos se quedan **los dos de mayor resolución por intérprete**. El resto queda anotado
en el informe con su licencia por si algún día hace falta.

Todo queda en `medios/informe-commons.json`: cada candidato, admitido o descartado, **con el
motivo**. Ese fichero es la prueba de que lo publicado se comprobó.

### Dos cosas que costaron y merecen quedar escritas

**Wikimedia responde 429 si el User-Agent no lleva contacto.** No es cuestión de ir despacio:
se comprobó que la misma URL da 429 con un agente anónimo y 200 con uno que identifica la
herramienta y da un correo. El primer barrido «encontró 0 candidatos» para 25 intérpretes y
parecía que no había material; lo que había era una política de uso incumplida.

**Un descarte por estrangulamiento se lee igual que un descarte por licencia.** El segundo
informe daba 185 ficheros aptos y 179 con «no se pudo bajar». Ahí se vio que el freno estaba
solo en las consultas y no en las descargas. En un fichero que sirve de prueba de que se
comprobó, eso es exactamente lo que no puede pasar: se arregló el freno y se hizo que los
avisos salgan en el informe en vez de tragárselos un `catch` vacío.

---

## Citar es obligatorio

De las 55 fotos, 47 son CC BY o CC BY-SA. Esas licencias **no son «gratis»: son «gratis
citando»**. La cita tiene que estar donde está la foto y ser legible.

Por eso la atribución se compone en el generador y viaja pegada al asset, y el componente
`RetratoReal` la pinta él mismo: no hay forma de poner la foto y olvidar el crédito, porque
son la misma llamada. En listas largas —los 26 vecinos del catálogo— la atribución se agrupa
en una sección de créditos al pie de la misma página, que es lo razonable para el medio; lo
que no vale es no ponerla.

Hay tres pruebas que lo blindan (`src/domain/media/tipos.test.ts`): que ninguna licenciada se
quede sin crédito, que el crédito nombre la misma licencia que declara el asset, y que cada
una enlace a su página de origen.

---

## Los 87 huecos

`src/content/media/huecos.ts` declara **todos** los sitios que la aplicación espera llenar. Sin
esa lista no se puede decir que falte nada, porque no consta que debiera estar.

| Familia | Qué es | Cuántos |
|---|---|---|
| El portal | Fachada, entrada, versión nocturna | 3 |
| Personajes | Un retrato y una escena por vecino | 52 |
| Zonas | Cada vivienda y espacio común | 9 |
| Temporadas | Una imagen por temporada | 5 |
| Situaciones | Junta, ascensor averiado, derrama, mudanza… | 10 |
| Elementos | Buzones, telefonillo, tablón, escalera… | 8 |

Los 52 «esperando» son, casi todos, `escenas/<personaje>` y las situaciones: material que solo
puede salir de un fotograma. Están declarados con su nombre exacto, así que **el día que
llegue el permiso basta con dejar el fichero en `public/serie/<hueco>.webp` y volver a
desplegar**. Ni una línea de código.

---

## Aviso de no afiliación

Está pintado en la página del portal, junto a los créditos:

> Fotografías de los intérpretes en actos públicos, obtenidas de Wikimedia Commons bajo
> licencias que permiten su reutilización con atribución. No son fotogramas de la serie. Este
> es un juego de aficionados sin relación con Atresmedia ni con la productora.
