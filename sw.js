const CACHE_NAME = 'poke-pwa-v1';
const STATIC_ASSETS = [
  './index.html',
  './manifest.json',
  './icons/icon-96.png',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

// ① インストール: 静的アセットをキャッシュ + 即時アクティベート
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .then(() => self.skipWaiting()) // ② 待機せずすぐ有効化
  );
});

// ③ アクティベート: 古いキャッシュを削除 + 既存ページを即時制御
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim()) // ④ 既存タブも即時制御下に
  );
});

// ⑤ フェッチ戦略: PokeAPI → Network-First / 静的アセット → Cache-First
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // PokeAPI はネットワーク優先（オフライン時のみキャッシュ）
  if (url.hostname === 'pokeapi.co') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // 成功したらキャッシュに保存
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request)) // オフライン時はキャッシュから
    );
    return;
  }

  // 外部フォント・CDN等は素通し（キャッシュしない）
  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(event.request));
    return;
  }

  // 自ドメインの静的アセット → Cache-First
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
