
/* Đăng ký Service Worker: cho phép cài đặt như ứng dụng và dùng offline.
   Bọc trong try/catch để nếu trình duyệt không hỗ trợ thì app vẫn chạy bình thường. */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    try {
      navigator.serviceWorker.register('./sw.js').catch(function (e) {
        console.warn('SW không đăng ký được:', e);
      });
    } catch (e) {
      console.warn('SW lỗi:', e);
    }
  });
}
