# Fase 4 · Cuentas, progresión, comunidad y notificaciones

Estado: **cuentas, progresión, social y notificaciones funcionando de punta a punta;
comunidades, temporadas y panel de administración, no.** En §6 está la lista exacta de lo
que hay y lo que falta, sin adornos.

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

### Hecho, probado y desplegado

**Cuentas y migración de progreso**

* acceso por **enlace mágico** sin contraseña: código de 8 caracteres, hasheado, de un solo
  uso, con caducidad de 15 minutos, tope de 5 intentos y tope de envíos por hora;
* respuesta idéntica exista el correo o no, para no filtrar quién está registrado;
* sesiones con cookie `httpOnly` + `sameSite=lax`, hash en la base de datos, y pantalla de
  dispositivos con «cerrar las demás»;
* **migración invitado → cuenta**: rellenar `GuestPlayer.userId`. Varios navegadores del
  mismo usuario cuelgan de la misma cuenta y su progreso se SUMA;
* nombre de usuario con validación, forma canónica anti-suplantación y enfriamiento de 30
  días; código de amigo tipo `VECI-KNKX`;
* borrado de cuenta con 14 días de gracia y **anonimización** en lugar de borrado en
  cascada, para no dejar agujeros en el historial de otras personas.

**Progresión**

* libro mayor de XP enganchado al final de partida, con la duración calculada **en el
  servidor** a partir de las respuestas (el cliente no puede declarar una partida de dos
  horas para saltarse el mínimo);
* antifarmeo en tres capas y explicación al jugador cuando se recorta;
* rachas con día local, seguro de derrama y misión de recuperación;
* liga con puntos separados del XP, tope diario, ascensos y descensos, y habilidad (Elo
  simplificado) también separada.

**Social**

* solicitudes, aceptar, rechazar, eliminar, bloquear y desbloquear;
* **el bloqueo gana siempre**: corta solicitudes, desafíos, invitaciones y presencia en las
  dos direcciones, y al bloqueado no se le avisa;
* desafíos asíncronos con semilla compartida, retos de grupo y revancha;
* invitaciones a sala que caducan a los 30 minutos;
* presencia filtrada por la privacidad de cada uno.

**Notificaciones**

* motor central: nada avisa por su cuenta;
* buzón in-app + API, contador acotado a 99, marcar una o todas como leídas;
* Web Push con VAPID y service worker que **solo** hace push (no cachea: una caché agresiva
  enseñaría partidas viejas);
* suscripciones que se limpian solas cuando el navegador las invalida (404/410);
* cada decisión queda registrada con su motivo, así que «¿por qué no me llegó?» tiene
  respuesta;
* métricas agregadas de salud del canal, sin nada por usuario.

**Privacidad y ajustes**

* siete niveles de visibilidad, comprobados en el servidor;
* preferencias de push por categoría y canal;
* horario silencioso con horas reales;
* pantalla de ajustes con todo lo anterior y el borrado de cuenta abajo, sin esconderlo.

**Trabajos programados**

* siete trabajos idempotentes: mantenimiento, reto diario, racha en peligro, cierre de liga,
  aviso de liga, resumen semanal y borrados;
* los dispara **GitHub Actions** (en Vercel no se pueden usar cron functions con este
  despliegue), protegidos por `JOBS_SECRET`, y **si el secreto no está configurado la ruta
  responde 503**: falla hacia el lado seguro.

### Comprobado de punta a punta

Contra el servidor de producción local, por HTTP:

| Paso | Resultado |
| --- | --- |
| Pedir código | 200, código en la consola (sin proveedor de correo configurado) |
| Canjear | cuenta creada: `vecino` / `VECI-KNKX` |
| Reutilizar el mismo código | rechazado |
| Sesión | `/api/amigos`, `/api/notificaciones` y `/api/ajustes` responden autenticados |
| Solicitud de amistad por código | aceptada, y **notificación creada** con destino `/amigos/solicitudes` |
| Registro de envío | `IN_APP ENTREGADA` + `PUSH FALLIDA (SIN_DISPOSITIVO)` |
| Páginas | `/entrar`, `/perfil/[username]`, `/amigos`, `/ajustes` responden 200; las privadas redirigen sin sesión |

### Lo que NO está

Con nombre y apellidos, para que no haya sorpresas:

* **proveedor de correo real**: el transporte está y se activa con tres variables de
  entorno, pero no hay credenciales de ninguno en el entorno del equipo. En desarrollo el
  código sale por consola y **no se finge** que se ha mandado un correo;
* **claves VAPID**: el push está implementado de punta a punta, pero hasta que no se generen
  las claves (`npx web-push generate-vapid-keys`) y se pongan en el entorno, no sale ningún
  push. Queda registrado como `SIN_DISPOSITIVO`, no como enviado;
* **comunidades**: el modelo está, los servicios y la interfaz no;
* **temporadas y eventos**: modelo y cierre de liga sí; el calendario y los eventos
  temáticos no;
* **muro de actividad, recap con tarjeta compartible, A/B de notificaciones y panel de
  administración de usuarios/temporadas**;
* **retos semanales y objetivos personalizados**;
* **matchmaking**: la habilidad se calcula y se guarda, pero no hay cola de emparejamiento;
* **E2E con navegadores reales** para los flujos de cuenta.

## 7. Métrica principal propuesta (§94)

**Vecinos activos semanales**: personas que en 7 días hacen al menos **dos** actividades
significativas (partida que cuenta, reto diario o desafío completado).

Se elige frente a MAU porque MAU premia abrir la app, y este juego no quiere que la gente
abra la app: quiere que juegue. Dos actividades en una semana es el umbral por debajo del
cual alguien no ha vuelto de verdad, solo ha pasado por delante.
