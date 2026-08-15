# Fase 5 — Identidad, material visual y clasificación

Lo que se ha construido, y sobre todo **por qué así**. Las decisiones que costaron una
discusión están escritas aquí para no volver a tenerla dentro de seis meses.

---

## 1. Biblioteca de medios: el permiso viaja con la imagen

`src/domain/media/tipos.ts` · `src/content/media/manifiesto.ts` · `src/server/media/service.ts`

Ninguna imagen entra en la aplicación como «una URL que funciona». Entra como un
`MediaAsset` que dice **de dónde sale, quién la hizo, con qué licencia y cuándo se
comprobó**. El campo que manda es `usageStatus`:

| estado | qué significa | ¿se pinta? |
|---|---|---|
| `user-provided` | lo aportó quien es dueño del proyecto | sí |
| `authorized` | hay permiso por escrito | sí |
| `licensed` | licencia libre verificada, con atribución | sí |
| `original` | lo hemos dibujado nosotros | sí |
| `placeholder` | hueco dibujado a propósito | sí |
| `pending` | **no consta permiso** | **no** |

`ESTADOS_SERVIBLES` no incluye `pending`, y hay una prueba que lo comprueba
(`src/domain/media/tipos.test.ts`). Esa lista es la que impide que un descuido acabe
publicando material ajeno: no depende de que alguien se acuerde, depende de que el test
está en verde.

`requiereAtribucion()` devuelve si el crédito es **obligatorio**, no si está puesto.
Parece una tontería hasta que te das cuenta de que la otra versión —`licensed && hay
atribución`— dice que un asset con licencia y sin crédito no necesita crédito, que es
exactamente el fallo que hay que poder detectar. `faltaAtribucion()` es el que canta.

### Cómo se ha conseguido material real

`scripts/importar-commons.mjs` importa de Wikimedia Commons **leyendo la licencia antes de
bajar nada**. Solo pasan las de `LICENCIAS_ADMITIDAS`; el resto se rechaza.

Además hay una segunda barrera que no es de copyright: `PALABRAS_DE_MARCA`. Durante el
desarrollo el script aceptó el logotipo de la serie porque en Commons figura como dominio
público (PD-textlogo: por debajo del umbral de originalidad). Es cierto **y da igual**:
dominio público en derechos de autor no es lo mismo que libre en marcas. Un logotipo
identifica un producto comercial y usarlo sugiere una relación que no existe. Se borró el
fichero y se añadió el filtro, que rechaza logotipos, carteles y carátulas *cualquiera que
sea su licencia*.

```
node scripts/importar-commons.mjs "Marivi Bilbao.jpg" --personaje "Marisa Benito"
node scripts/importar-commons.mjs --categoria "Malena Alterio"   # solo listar
```

### Lo que NO se ha cogido

`src/content/media/wishlist.ts` registra lo que haría falta y no se puede usar: fotogramas,
promocionales, carteles, la sintonía. De cada uno se guarda la página de origen, qué
representa, por qué interesa y **qué haría falta exactamente** para poder usarlo (una
autorización de la productora, normalmente). No bloquea el desarrollo: hay un equivalente
dibujado ocupando su sitio, y el día que llegue el permiso se sustituye el `MediaAsset` sin
tocar una sola pantalla.

---

## 2. Tu vecino: la configuración, no la imagen

`src/domain/avatar/config.ts` · `src/components/avatar/Vecino.tsx` · `/vecino`

**Se guarda una lista de piezas, no un PNG.** Un PNG no se puede volver a editar, pesa, hay
que servirlo y caduca en cuanto cambia el estilo. Doscientos bytes de JSON se editan, se
mandan en una respuesta y se pueden repintar mejor mañana sin migrar nada.

**El render es determinista.** `Vecino` es SVG puro sin estado: la misma configuración da
el mismo dibujo en el servidor (primer pintado, tarjeta de resultados) y en el cliente (el
creador, que responde a cada toque sin pedir nada a la red).

**Todo es original.** Ninguna pieza imita la cara de nadie real. Son arquetipos de
comunidad de vecinos —la bata, la carpeta de la presidencia, el mono de trabajo, las gafas
de leer el acta, la fregona— y de ahí sale el ambiente, sin usar la imagen de una persona.
Más de 1,4 millones de combinaciones.

**Se valida siempre, y corrigiendo.** `sanearAvatar()` es total: no rechaza, arregla. Un id
de pieza inventado cae al valor por defecto en vez de devolver un 400 a alguien que solo
quería ponerse un bigote. Es la misma función a la entrada de la API y a la salida de la
base de datos, así que un Json corrupto en base nunca llega a la pantalla.

**El invitado también puede.** `PlayerProfile.avatarConfig` existe además de
`UserProfile.avatarConfig` para que alguien que entra por un enlace de WhatsApp se haga un
personaje **antes** de registrarse. Al migrar a cuenta, `heredarAvatarDeInvitado()` se lo
lleva —sin pisar lo que ya hubiera en la cuenta, por si el navegador es prestado—. Si al
registrarse perdiera el personaje, no habría segundo registro.

---

## 3. Clasificación: una sola moneda

`src/server/ranking/service.ts` · `/ranking`

El enunciado pedía ordenar por «puntos acumulados válidos». Eso ya existía: el **libro
mayor de XP** (`XpTransaction`), que nació con antifarmeo, topes diarios, rendimientos
decrecientes e idempotencia por clave única.

Crear un `PointTransaction` aparte habría dejado dos monedas que sincronizar, dos sitios
donde defenderse del farmeo, y una pregunta sin buena respuesta en pantalla: «¿y esto son
los otros puntos?». Así que la clasificación ordena por XP y en pantalla se llama **puntos
de vecindad**. Una sola verdad, ya auditable.

Nivel, victorias, precisión y partidas se enseñan como **columnas**, no sumadas dentro de
la cifra. Una clasificación que mezcla cinco cosas en un número es una clasificación que
nadie entiende ni puede discutir.

**Tu posición, siempre.** Aunque vayas el 4.253 hay una barra fija abajo con tu puesto.
No se materializa ninguna tabla: es un `COUNT(*) WHERE xp > el tuyo` sobre el índice de
`UserProfile.xp`. Una consulta, no un recorrido. Cuando haya cientos de miles de perfiles,
el sitio donde materializarlo es ese fichero y solo ese.

**Tramos.** `global` y `amigos`/`comunidad` van contra `UserProfile.xp`; `semana`, `mes` y
`temporada` agrupan el libro mayor por ventana temporal, que es para lo que sirve tener un
libro y no un contador. Las pestañas son enlaces de verdad (`?tramo=`): funcionan sin
JavaScript y se pueden compartir.

Las cuentas no activas no ocupan puesto (`SOLO_ACTIVAS`).

---

## 4. Compartir la partida

`src/components/sala/Compartir.tsx` · `/join/[code]` · metadatos de `/unirse/[code]`

- **`/join/4K7P`** es un alias corto de `/unirse/4K7P`. Se lee mejor en una tele, se teclea
  antes y ocupa menos en un mensaje. El QR apunta ahí.
- **`BotonCompartir`** intenta `navigator.share`, cae a portapapeles y, si tampoco, a
  seleccionar el texto a mano. Distingue `AbortError` —el usuario canceló, no es un error—
  de un fallo de verdad.
- **Open Graph dinámico** en `/unirse/[code]`: la tarjeta dice cuánta gente hay y qué modo
  es. **No publica los nombres** de quien juega: eso puede acabar en un grupo de doscientas
  personas. `robots: noindex`, porque una sala efímera no debe quedarse indexada.

---

## Migración

`prisma/migrations/20260815131921_avatar_vecino` — dos columnas `Json?` nuevas
(`UserProfile.avatarConfig`, `PlayerProfile.avatarConfig`). Nulas para todo lo existente,
que sigue pintando su avatar de arquetipo. Sin cambios destructivos.
