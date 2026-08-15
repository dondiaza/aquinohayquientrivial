/*
 * Service worker: SOLO notificaciones push.
 *
 * A propósito NO cachea nada. Un juego con estado servido desde una caché agresiva enseña
 * partidas viejas y puntuaciones que no son, que es peor que no funcionar sin conexión.
 * Si algún día hace falta modo sin conexión, se añade aquí con una estrategia explícita.
 */

self.addEventListener('install', (evento) => {
  // Sin espera: la versión nueva manda desde el primer momento.
  evento.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(self.clients.claim());
});

self.addEventListener('push', (evento) => {
  if (!evento.data) return;

  let datos;
  try {
    datos = evento.data.json();
  } catch {
    return;
  }

  const titulo = datos.titulo || 'Desengaño 21';
  const opciones = {
    body: datos.cuerpo || '',
    icon: '/icon.svg',
    badge: '/icon-maskable.svg',
    // El deep link viaja aquí: al pulsar se abre el sitio exacto, nunca la portada.
    data: { deepLink: datos.deepLink || '/' },
    tag: datos.tipo || 'aviso',
    // Reemplaza una notificación del mismo tipo en lugar de apilarlas.
    renotify: false,
  };

  evento.waitUntil(self.registration.showNotification(titulo, opciones));
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.deepLink) || '/';

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((ventanas) => {
      // Si ya hay una pestaña abierta, se navega en ella en lugar de abrir otra.
      for (const ventana of ventanas) {
        if ('focus' in ventana) {
          ventana.navigate(destino);
          return ventana.focus();
        }
      }
      return self.clients.openWindow(destino);
    }),
  );
});
