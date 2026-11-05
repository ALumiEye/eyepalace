// Service worker: ưu tiên mạng (luôn lấy bản mới), mất mạng thì dùng bản đã lưu → chơi offline được
const CACHE = 'eyepalace-v4';
const CORE = ['./', './index.html', './style.css', './assets/favicon.png', './assets/alumieye.png', './assets/lumi.png', './manifest.webmanifest',
  ...['config', 'maps', 'entities', 'waves', 'game', 'render', 'audio', 'main', 'achievements'].map(f => `./js/${f}.js`)];
self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).catch(() => {}));
});
self.addEventListener('activate', e => e.waitUntil(
  caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
  );
});
