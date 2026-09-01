/* Service Worker de Undergold Transporte
   - Permite mostrar notificaciones del sistema (con el logo y el nombre de quien escribe).
   - Maneja el clic en la notificación (abre/enfoca la app).
   - Deja lista la base para "Web Push" (notificaciones con la app cerrada) a futuro. */

self.addEventListener('install', (e) => { self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(self.clients.claim()); });

// Clic en la notificación → enfocar la app o abrirla
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      if (self.clients.openWindow) return self.clients.openWindow('./');
    })
  );
});

// (Futuro) Notificación enviada por el servidor aunque la app esté cerrada
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data.json(); } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(d.title || 'Undergold Transporte', {
      body: d.body || '',
      icon: d.icon,
      badge: d.icon,
      tag: d.tag || 'chat'
    })
  );
});
