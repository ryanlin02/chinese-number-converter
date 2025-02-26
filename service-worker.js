const CACHE_NAME = 'chinese-number-converter-v0.19';
const ASSETS_TO_CACHE = [
  '/chinese-number-converter/',
  '/chinese-number-converter/index.html',
  '/chinese-number-converter/manifest.json',
  '/chinese-number-converter/icons/icon-72x72.png',
  '/chinese-number-converter/icons/icon-96x96.png',
  '/chinese-number-converter/icons/icon-128x128.png',
  '/chinese-number-converter/icons/icon-144x144.png',
  '/chinese-number-converter/icons/icon-152x152.png',
  '/chinese-number-converter/icons/icon-192x192.png',
  '/chinese-number-converter/icons/icon-384x384.png',
  '/chinese-number-converter/icons/icon-512x512.png'
];

// Service Worker安裝階段：緩存所有靜態資源
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('開始緩存應用資源...');
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        // 強制新的 Service Worker 立即接管應用
        return self.skipWaiting();
      })
  );
});

// Service Worker啟動階段：清理舊版本緩存
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('移除舊緩存：', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // 確保 Service Worker 控制所有頁面
      return self.clients.claim();
    })
  );
});

// 處理fetch請求：優先使用網絡，然後備份到緩存
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // 如果網絡請求成功，複製響應並保存到緩存
        if (event.request.method === 'GET' && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // 如果網絡請求失敗，嘗試從緩存中獲取
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          // 如果是HTML請求，返回主頁
          if (event.request.headers.get('accept').includes('text/html')) {
            return caches.match('/chinese-number-converter/');
          }
          
          return new Response('網絡不可用，且該資源未緩存。', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});
