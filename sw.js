/* Service Worker - Tính thời hạn chấp hành án phạt tù
   Chiến lược: network-first cho trang chính (luôn lấy bản mới nhất khi có mạng,
   tự động dùng bản đã lưu khi mất mạng), cache-first cho icon.
   Khi cập nhật app: đổi số CACHE_VERSION bên dưới rồi đẩy lên GitHub. */

const CACHE_VERSION = 'v51';
const CACHE_NAME = 'tinhanphat-' + CACHE_VERSION;

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './splash-logo.png',
  './apple-touch-icon.png'
];

// Cài đặt: tải sẵn toàn bộ tài nguyên để dùng offline
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())   // vẫn cài được nếu 1 file lỗi
  );
});

// Kích hoạt: xóa các bản cache cũ
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('tinhanphat-') && k !== CACHE_NAME)
            .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;

  // Chỉ xử lý GET
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Không đụng tới request khác nguồn (VD: tra cứu biên lai Bộ Tư pháp,
  // Cloudflare Analytics, Google Fonts) - để trình duyệt tự xử lý bình thường
  if (url.origin !== self.location.origin) return;

  // Trang HTML: ưu tiên mạng, hỏng thì lấy bản đã lưu
  const isPage = req.mode === 'navigate' ||
                 (req.headers.get('accept') || '').includes('text/html');

  if (isPage) {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html')
                      .then(r => r || caches.match('./')))
    );
    return;
  }

  // Tài nguyên tĩnh: lấy từ cache trước cho nhanh
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
