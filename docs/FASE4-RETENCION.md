# Fase 4 · Cuentas, progresión, comunidad y notificaciones

Estado: **cimientos puestos y probados; la mayor parte de las pantallas y servicios, no.**
Al final está la lista exacta de lo que hay y lo que falta, sin adornos.

---

## 1. El principio que ordena todo lo demás

> La retención sale de **progreso + amigos + competición + contenido + objetivos**.
> No de insistir.

De ahí salen tres decisiones que se aplican en todo el código de esta fase:

1. **Jugar primero, registrarse después.** `GuestPlayer` sigue siendo el sujeto real del
   juego. Una cuenta es algo que se le ATA encima: la migración es rellenar
   `GuestPlayer.userId`, no copiar datos de un sitio a otro. Por eso no se puede quedar a
   medias y no hay forma de perder progreso al registrarse.
2. **El buzón dentro de la app siempre se escribe.** Lo que se filtra es el push y el
   correo. Un jugador con todas las notificaciones apagadas no se pierde nada: lo tiene todo
   al entrar. Esto quita de raíz la tentación de insistir por push «porque si no no se
   entera».
3. **Toda comunicación tiene un motivo.** «Pablo te ha retado» tiene motivo. «¡Te echamos de
   menos!» no lo tiene, y por eso no existe en el catálogo.

---

## 2. Modelo de datos

Migración `fase4_cuentas_progresion`. Lo que conviene saber:

### El XP es un libro mayor, no un contador

```prisma
model XpTransaction {
  userId   String
  cantidad Int
  motivo   String   // PARTIDA, RETO_DIARIO, LOGRO…
  sourceId String   // id de la partida, del reto, del logro
  recortado Int     // cuánto se recortó y por qué, para poder explicarlo

  @@unique([userId, motivo, sourceId])
}
```

`UserProfile.xp` es solo la suma cacheada. La clave única hace que **conceder dos veces lo
mismo sea imposible**: un reintento no duplica XP, no porque el código tenga cuidado, sino
porque la base de datos no le deja.

### Lo que caduca, caduca en la base de datos

Invitaciones, desafíos y notificaciones llevan `expiresAt`. Nada de «Pablo te invita» cuatro
horas después de que la partida terminara.

### La privacidad es una columna, no un `if` en la UI

`UserSettings` tiene siete niveles de visibilidad (perfil, estadísticas, presencia,
actividad, quién puede invitar, quién puede retar, quién puede solicitar), cada uno
`TODOS | AMIGOS | NADIE`, y se comprueban en el servidor.

### El `User` de Fase 1 ha desaparecido

Era un hueco reservado que nunca se usó. Lo sustituye `UserAccount`, que es el modelo de
verdad. Mantenerlo habría dejado dos tablas de usuario compitiendo, que es el principio de
una tarde muy mala.

---

## 3. Experiencia y antifarmeo

`src/domain/progresion/libro.ts`. Tres capas, y **ninguna castiga a quien juega normal**:

| Capa | Qué hace | Por qué |
| --- | --- | --- |
| **Partida significativa** | Menos de 5 respuestas o menos de 45 s → 0 XP | Dos amigos creando salas de una pregunta no farmean nada |
| **Rendimientos decrecientes** | A partir de la 3.ª partida del día, cada una vale ×0,65 acumulativo, con suelo del 10 % | Se deja de pagar por repetir, pero **nunca se llega a cero**: jugar siempre suma algo |
| **Topes diarios por fuente** | 1200 XP/día de partidas, 400 del reto diario… Los logros no tienen tope porque no se repiten | Que catorce horas seguidas no sean automáticamente la primera posición |

Y cuando se recorta, **se le dice al jugador**, sin regañarle:

> «Ya has sacado toda la experiencia de hoy por aquí. Mañana vuelve a contar.»

Hay un test que comprueba justamente eso: que el texto no contenga una reprimenda.

---

## 4. Racha: la mecánica más fácil de estropear

`src/domain/progresion/rachas.ts`.

* **Cuenta la actividad, no la visita.** Abrir la app no es nada. Si abrir contara, la racha
  mediría lealtad a la notificación, no al juego.
* **El día es el día LOCAL del usuario.** Quien juega a las 00:30 en Madrid no pierde la
  racha porque en UTC ya fuera otro día. Hay test.
* **Seguro de derrama**: cubre un día perdido, automáticamente y sin pedir nada. Se gana uno
  cada 7 días de racha, con un máximo de 2 acumulados. No se vende.
* **Misión de recuperación**: romper una racha de 20 días y volver a cero es la mejor forma
  de que alguien no vuelva. Si la racha era de 5 o más, se abren 3 días para completar 3
  actividades y **se devuelve entera**.

---

## 5. Motor de notificaciones

`src/domain/notificaciones/`. Nada dispara un push directamente: todo pasa por

```
suceso → regla → preferencia → tope de frecuencia → horario silencioso → canal → entrega
```

### La distinción que evita quemar el canal

| | Ejemplo | Gasta tope | Se apaga si no vuelves |
| --- | --- | --- | --- |
| **Enganche** | «El reto de hoy está disponible» | Sí | Sí |
| **Hecho** | «Marta te ha retado», «Has ascendido» | No | No |

Confundir las dos cosas es exactamente cómo se quema el push. Un reto de un amigo llega
aunque el jugador lleve doscientos días sin aparecer; un recordatorio de contenido, no.

### Topes y horarios

* máximo **2 push de enganche al día** y **6 a la semana**;
* no se repite el mismo tipo antes de 20 h;
* horario silencioso por defecto **23:00–09:00**, en la hora local del usuario, y contempla
  el cruce de medianoche;
* **una sola excepción**: una invitación a una partida que está pasando AHORA puede sonar de
  noche, y solo si el jugador tiene la categoría social activa;
* a los 7 días sin jugar la frecuencia baja sola; a los 21, se para.

### Lo que deliberadamente NO manda push

`LEAGUE_POSITION_CHANGED`. Los cambios de puesto pasan todo el rato, y avisar de cada uno es
la forma más rápida de que alguien apague las notificaciones para siempre. Va solo al buzón.

### Deep links

Ninguna notificación abre la portada. Cada una lleva a su sitio exacto: la solicitud, el
desafío, la sala, el reto. Hay un test que recorre los 21 tipos y falla si alguno apunta
a `/`.

---

## 6. Lo que hay hoy, exactamente

**Hecho y probado (38 tests):**

* modelo de datos completo de la fase, migrado y aplicado;
* libro mayor de XP con antifarmeo, topes y explicación al jugador;
* rachas con seguro y misión de recuperación, con día local correcto;
* motor de notificaciones: reglas, preferencias por categoría y canal, topes de frecuencia,
  horario silencioso con cruce de medianoche, reducción por inactividad y elección de
  momento;
* catálogo de 21 tipos de notificación con sus textos y sus deep links.

**No hecho** (y no se afirma lo contrario):

* **autenticación** — el modelo está (`UserAccount`, `UserSession`, `LoginToken` con hash,
  intentos y caducidad), pero el flujo de enlace mágico necesita un proveedor de correo, y
  **no hay credenciales de ninguno en el entorno del equipo**. Es el mismo caso que el
  proveedor de realtime en Fase 3: se deja el modelo listo y se documenta, en lugar de
  inventar una integración que nadie puede desplegar;
* migración invitado → cuenta: diseñada (es un `UPDATE` de `GuestPlayer.userId`), sin
  implementar el servicio;
* perfil público, username con enfriamiento, friend codes;
* amigos, presencia, invitaciones, desafíos asíncronos, revanchas, comunidades;
* ligas y temporadas: el modelo está, los servicios y el cierre por job no;
* buzón in-app, Web Push, service worker, permiso contextual;
* pantalla de ajustes, privacidad, bloqueos, reportes;
* jobs programados, analítica de retención, A/B, admin de usuarios y temporadas.

Es decir: **la fase está empezada, no terminada.** Lo que hay son los cimientos sobre los
que se apoya todo lo demás, y están puestos donde más caro sale equivocarse: el modelo de
datos, la idempotencia del XP y las reglas que deciden cuándo se molesta a alguien.

---

## 7. Métrica principal propuesta (§94)

**Vecinos activos semanales**: personas que en 7 días hacen al menos **dos** actividades
significativas (partida que cuenta, reto diario o desafío completado).

Se elige frente a MAU porque MAU premia abrir la app, y este juego no quiere que la gente
abra la app: quiere que juegue. Dos actividades en una semana es el umbral por debajo del
cual alguien no ha vuelto de verdad, solo ha pasado por delante.
