/* Pal family dashboard service worker */
const CACHE_NAME = 'pal-family-v1';
const BASE_URL = new URL('./', self.location.href);
const CORE_ASSETS = [BASE_URL.href, new URL('index.html', BASE_URL).href, new URL('icon.svg', BASE_URL).href];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(fetch(request, {cache:'no-store'}).then(response => {
      const copy = response.clone(); caches.open(CACHE_NAME).then(cache => cache.put(request, copy)); return response;
    }).catch(() => caches.match(request).then(cached => cached || caches.match(new URL('index.html', BASE_URL).href))));
    return;
  }
  event.respondWith(caches.match(request).then(cached => cached || fetch(request)));
});

self.addEventListener('push', event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (_) { data = { body: event.data?.text() || 'You have a reminder.' }; }
  event.waitUntil(self.registration.showNotification(data.title || 'Pal family alert', {
    body: data.body || 'You have an update.',
    icon: './icon.svg',
    tag: data.tag || 'pal-family-background-alert',
    data: { url: data.url || './' }
  }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || './', self.location.href).href;
  event.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const client of list) if ('focus' in client) { client.navigate(target); return client.focus(); }
    return self.clients.openWindow(target);
  }));
});
