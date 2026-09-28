// Madrid Kingdom · service worker: recibe los avisos de turno y abre la partida al tocarlos.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { title: 'Madrid Kingdom', body: event.data ? event.data.text() : '' }; }
  const title = data.title || 'Madrid Kingdom';
  event.waitUntil(self.registration.showNotification(title, {
    body: data.body || 'Es tu turno de jugar.',
    icon: '/icon-192.png', badge: '/icon-192.png',
    tag: data.tag || 'madrid-kingdom', renotify: true,
    data: { url: data.url || '/' },
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href;
  event.waitUntil((async () => {
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const w of wins) {
      if (w.url.startsWith(self.location.origin)) { try { await w.navigate(url); } catch (e) {} return w.focus(); }
    }
    return self.clients.openWindow(url);
  })());
});
