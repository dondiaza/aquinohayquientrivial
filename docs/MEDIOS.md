# Imágenes: qué hay, de dónde sale y qué falta

## El resumen

| | |
|---|---|
| Huecos declarados | **87** |
| Retratos con licencia **confirmados a ojo** | **23** |
| Candidatos bajados pero **sin confirmar** (no se sirven) | los que queden en `/admin/medios/revisar` |
| Rechazados con motivo registrado | **17** |
| Fotos de lugar con licencia | **2** (la calle del Desengaño y su azulejo) |
| Resueltos con arte propio | **9** |
| Esperando permiso del titular | **52** |
| Peso total | **1,3 MB** |

En vivo: `/admin/medios`.

---

## La lección que costó dos despliegues

La primera versión de esto publicó 55 retratos «verificados». Bastó mirarlos para encontrar:

- una **lápida** en el hueco de Eduardo García,
- un **partido de fútbol** en el de Santiago Ramos,
- un **grabado militar del siglo XIX** en el de Elio González,
- una rueda de prensa del Athletic en el de Antonio Molero.

El barrido comprobaba la licencia impecablemente. Lo que no podía comprobar es **quién sale en
la foto**, y estaba fingiendo que sí.

Se intentó arreglar con filtros de texto más estrictos —exigir todas las partes del nombre en
lugar de una— y no sirve, porque el problema no es el filtro: **el texto no dice quién sale en
la foto**. Se restringió a las categorías personales de Commons, que las mantiene gente que
mira las imágenes, y mejoró mucho; pero tampoco basta, porque los nombres colisionan: hay un
piloto de carreras llamado Santiago Ramos y su categoría son coches.

### Cómo está resuelto ahora

Todo lo que baja el barrido entra como **`pending`**, y `pending` no es servible: ya existía
esa garantía en el tipo, ahora se usa para esto. Solo se publica lo que figura en
`src/content/media/confirmados.ts` porque **alguien lo ha mirado**.

Los rechazos también se registran, con su motivo. No es documentación, es memoria: sin esa
lista el siguiente barrido vuelve a bajar la lápida, vuelve a proponerla y alguien vuelve a
tener que descubrir que está mal.

Hay cinco pruebas que lo blindan, incluida la que exige que **nada sin confirmar sea
servible**.

---

## El edificio: no se puede fotografiar porque no existe

Se pidió que la portada enseñara el edificio original de la serie en vez de un dibujo.

El edificio de *Desengaño 21* **nunca existió**. El rodaje se hizo en una nave industrial de
2.000 m² en la calle de Luna del polígono San Millán, en Moraleja de Enmedio, y la fachada era
decorado. Toda imagen de ese edificio es un fotograma o un promocional de Atresmedia.

Pero **la calle del Desengaño sí existe**, en el centro de Madrid, y sus edificios son
decimonónicos con balcones y bajos comerciales, exactamente como el de la ficción. Y aquí hay
una vía legítima: España tiene **libertad de panorama** (art. 35.2 LPI) — las obras
permanentemente situadas en la vía pública se pueden reproducir y publicar libremente. Además
las dos fotos que se usan tienen licencia Creative Commons del propio fotógrafo.

Así que la portada enseña **la calle de verdad**, con su crédito. Es lo más cerca que se puede
llegar de forma legítima, y resulta que es bastante cerca.

---

## AQUINOLAB: se usa en local, no se despliega

El otro proyecto tiene 28 retratos de personaje que son justo lo que se quiere. Su propio
`ATTRIBUTION.md` dice de dónde salen —fotogramas y promocionales de Atresmedia recogidos de
FormulaTV, GQ España, 20minutos/Cinemanía, La Vanguardia y Series de España Wiki— y termina
con esta condición:

> These frames and promotional assets are used as editorial references in a local prototype.
> **Obtain the appropriate rights before any public or commercial distribution.**

El proyecto que las reunió ya dejó escrito que valen en local y no para publicar. Así que:

```
node scripts/importar-aquinolab.mjs ../aquinolab
```

Las copia a `public/serie/vecinos/`, que está **gitignorada**. Resultado:

- en `npm run dev` la web se ve con las caras de la serie, que es para lo que se quieren;
- `git status` sigue limpio y el deploy no las lleva.

El sistema de huecos ya daba prioridad a lo aportado sobre lo licenciado, así que en local
esas caras tapan a las de Commons sin tocar una línea. El día que haya autorización de
Atresmedia, se quita la regla del `.gitignore` y ya está.

Los nombres se traducen con una tabla a mano (`EQUIVALENCIAS`), porque los catálogos no
coinciden —allí `paloma-cuesta`, aquí `paloma-hurtado`— y adivinarlo por parecido de cadena es
exactamente cómo se acaba poniendo la cara de uno en la ficha de otro.

---

## Cómo se rehace el barrido

```
node scripts/barrer-commons.mjs --bajar        # solo categorías personales de Commons
node scripts/optimizar-medios.mjs              # a WebP, dos tamaños
node scripts/generar-manifiesto-commons.mjs    # escribe src/content/media/commons.ts
# … y después MIRAR las fotos y actualizar confirmados.ts
```

**Wikimedia responde 429 si el User-Agent no lleva contacto.** No es cuestión de ritmo: se
comprobó que la misma URL da 429 con un agente anónimo y 200 con uno que identifica la
herramienta y da un correo. El primer barrido «encontró 0 candidatos» para 25 intérpretes y
parecía que no había material; lo que había era una política de uso incumplida.

Todo queda en `medios/informe-commons.json`: cada candidato, admitido o descartado, con el
motivo.

---

## Citar es obligatorio

Casi todas las fotos son CC BY o CC BY-SA: **no son «gratis», son «gratis citando»**. La
atribución se compone en el generador y viaja pegada al asset, y el componente `RetratoReal`
la pinta él mismo, de modo que no hay forma de poner la foto y olvidar el crédito porque son
la misma llamada. En listas largas se agrupa al pie de la misma página, que es lo razonable
para el medio.

---

## Aviso de no afiliación

Pintado junto a los créditos del portal:

> Fotografías de los intérpretes en actos públicos, obtenidas de Wikimedia Commons bajo
> licencias que permiten su reutilización con atribución. No son fotogramas de la serie. Este
> es un juego de aficionados sin relación con Atresmedia ni con la productora.
