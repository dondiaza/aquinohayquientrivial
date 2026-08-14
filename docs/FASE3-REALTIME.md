# Fase 3 · Decisión de transporte en tiempo real

Este documento explica **por qué** el multijugador de este proyecto no usa WebSockets, qué
usa en su lugar, qué se midió para decidirlo y cómo cambiarlo el día que haga falta sin
tocar el juego.

La decisión se toma sobre el despliegue REAL de este proyecto, no sobre el ideal.

---

## 1. Lo que hay debajo (restricciones reales)

| Pieza | Situación | Consecuencia |
| --- | --- | --- |
| **Vercel** | Destino de producción, con deploy **prebuilt** desde GitHub Actions. La cuenta del equipo **no tiene autorizados los builds en la nube**. | Funciones serverless. **No hay proceso persistente**: un `WebSocketServer` no tiene dónde vivir. |
| **Neon (PostgreSQL)** | Ya en uso, con pooler para la app y conexión directa para migraciones. | Hay una fuente de verdad transaccional y compartida entre invocaciones. Es lo único que todas las funciones ven igual. |
| **Coolify** | Infra propia del equipo, **en LAN** (`192.168.1.10:8000`). Sin `COOLIFY_APP_UUID` para este proyecto y sin `COOLIFY_TOKEN` en el entorno. | Sí admitiría un proceso persistente, pero **no es accesible desde fuera de la red**. No puede ser el transporte del público. |
| **Proveedores gestionados** (Pusher, Ably, Supabase Realtime, PartyKit, Liveblocks) | **No hay credenciales de ninguno** en el entorno del equipo (`.env.global.local` tiene Vercel, GitHub, Neon y Bitbucket). | Elegir uno bloquea la fase entera hasta que alguien cree una cuenta, acepte un contrato y añada secretos. |

Conclusión incómoda pero clara: **la opción "WebSockets con Socket.IO" no es
implementable en este despliegue**, y la opción "proveedor gestionado" no es
implementable *hoy* sin depender de una gestión externa.

---

## 2. Opciones evaluadas

| Opción | Funciona en Vercel | Coste | Reconexión | Complejidad | Veredicto |
| --- | --- | --- | --- | --- | --- |
| Socket.IO / `ws` propio | ❌ no hay proceso persistente | — | buena | media | **Descartada**: incompatible con el hosting. |
| Socket.IO en Coolify | ✅ (proceso propio) | infra ya pagada | buena | media-alta | **Descartada como transporte principal**: LAN, no público. Queda como opción futura documentada. |
| Proveedor gestionado (Pusher/Ably/…) | ✅ | de gratis a caro por conexión | excelente | baja | **Descartada por ahora**: exige cuenta y secretos que no existen. Prevista como *driver* alternativo. |
| Redis + gateway | ✅ con gateway | +2 servicios | buena | alta | **Descartada**: dos piezas nuevas para un juego de 8-20 personas. |
| **Postgres autoritativo + registro de eventos con cursor, servido por SSE con caída a sondeo** | ✅ | cero servicios nuevos | **excelente** (el cursor la hace trivial) | baja-media | ✅ **ELEGIDA** |

---

## 3. La decisión

**El estado de la sala vive en PostgreSQL y es la única autoridad. Los clientes no reciben
"mensajes": leen un registro de eventos append-only por número de secuencia.**

```
móvil / TV ──POST intención──▶  route handler ──▶ reducer puro ──▶ Postgres (estado + eventos)
     ▲                                                                     │
     └────────── GET /api/salas/[code]/eventos?desde=N  (SSE o sondeo) ─────┘
```

* **Cliente → servidor**: `POST` con una intención (`ANSWER_SUBMIT`, `POWERUP_USE`,
  `VOTE_SUBMIT`, `BET_SUBMIT`, controles de host). Nunca puntuaciones.
* **Servidor → cliente**: cada cambio de estado escribe uno o más eventos con `seq`
  monotónico. El cliente pide «dame lo que haya después de mi `seq`». El servidor
  responde por **SSE** manteniendo la conexión abierta, y si el entorno la corta, el
  cliente vuelve a conectar con su cursor y **no pierde nada**.
* **Caída a sondeo**: si SSE falla (proxy raro, red corporativa, navegador antiguo), el
  mismo endpoint responde en modo sondeo. El cliente no distingue: la capa de transporte
  está detrás de una interfaz.

### Por qué esto es mejor aquí que un WebSocket

1. **La reconexión sale gratis y es correcta.** El caso crítico del enunciado —«el móvil
   pierde el Wi-Fi 10 segundos»— con WebSockets exige replicar estado en el reconnect. Con
   un cursor es *la misma consulta que ya se hace siempre*: `seq > 42`. No hay código de
   reconexión especial, así que no hay bugs de reconexión especiales.
2. **El estado autoritativo ya estaba en Postgres.** Fase 1 y 2 persisten partidas,
   respuestas y eventos. El multijugador no inventa una segunda fuente de verdad que
   sincronizar.
3. **Sobrevive al reinicio de la función.** Un WebSocket en serverless muere con la
   invocación; aquí una función que muere es un `reconnect` de 200 ms.
4. **Funciona detrás de Discord/Meet.** El host comparte pantalla y los móviles siguen
   hablando por HTTPS normal: nada de puertos ni protocolos que un cautivo bloquee.
5. **Cero servicios nuevos, cero contratos, cero secretos.** Se despliega hoy.

### Lo que cuesta

* **Latencia**: no es un push de 20 ms, es de ~150-400 ms (SSE) o hasta el intervalo de
  sondeo (~800 ms). Para un trivial es irrelevante y además **el tiempo lo valida el
  servidor**, así que la latencia no da ni quita puntos (§ tiempo autoritativo).
* **Consumo**: cada cliente mantiene una conexión o hace una petición pequeña por
  intervalo. Medido en `docs/FASE3-CARGA.md`.

---

## 4. La frontera: cómo se cambia el transporte

Todo el juego habla con una interfaz, no con SSE:

```ts
// src/domain/party/transporte.ts
export type Transporte = {
  suscribir(sala: string, desde: number, alRecibir: (lote: EventoSala[]) => void): () => void;
  enviar(sala: string, intencion: IntencionCliente): Promise<Resultado>;
};
```

Hay un driver `sse-o-sondeo` (el que se despliega). Añadir un WebSocket en Coolify o un
proveedor gestionado es escribir un segundo driver: **el protocolo, el reducer, la
autoridad, el host y los móviles no cambian**. Está pensado así a propósito, porque la
elección de hoy está atada a un hosting, y el hosting cambia.

---

## 5. Reevaluar si pasa cualquiera de estas cosas

* Se necesitan **más de ~50 jugadores por sala** o **muchas salas simultáneas**.
* Se añade una mecánica que exija latencia por debajo de 100 ms (pulsador, dibujo en vivo).
* El equipo abre Coolify a internet o contrata un proveedor de realtime.
* La factura de invocaciones de Vercel se vuelve el mayor coste del proyecto.

Mientras no pase nada de eso, meter un WebSocket sería añadir una pieza de infraestructura
para resolver un problema que este juego no tiene.
