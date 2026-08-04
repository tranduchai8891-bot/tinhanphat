# Hướng dẫn triển khai bản cài đặt được trên Android

## 1. Tải 6 file này lên GitHub

Đưa **tất cả 6 file** vào cùng thư mục gốc của repo `tinhanphat` (ngang hàng nhau,
không tạo thư mục con):

```
tinhanphat/
├── index.html          ← ghi đè file cũ
├── manifest.json       ← mới
├── sw.js               ← mới
├── icon-192.png        ← mới
├── icon-512.png        ← mới
└── apple-touch-icon.png ← mới
```

Cách làm trên web GitHub: vào repo → **Add file** → **Upload files** → kéo cả 6 file
vào → **Commit changes**.

> Quan trọng: phải tải lên **đủ cả 6 file**. Thiếu `manifest.json`, `sw.js` hoặc
> file icon thì Android sẽ không cài được.

Sau khi commit, chờ khoảng 1–2 phút để GitHub Pages cập nhật.

## 2. Kiểm tra trên Android

1. Mở Chrome, vào `https://tranduchai8891-bot.github.io/tinhanphat/`
2. Nếu trước đây đã từng mở trang này, hãy **xóa dữ liệu trang cũ**:
   menu ⋮ → **Thông tin trang** (biểu tượng ổ khóa) → **Cài đặt trang** → **Xóa dữ liệu**
   (bước này cần thiết vì manifest hỏng cũ có thể còn lưu trong máy)
3. Tải lại trang
4. Chrome sẽ hiện thanh **"Cài đặt ứng dụng"** ở dưới, hoặc vào
   menu ⋮ → **Thêm vào Màn hình chính / Cài đặt ứng dụng**
5. Bấm **Cài đặt**

Sau khi cài: app có icon riêng, mở toàn màn hình không có thanh địa chỉ,
và **dùng được offline** (không cần mạng).

## 3. iPhone

Không thay đổi gì, vẫn làm như cũ: Safari → nút Chia sẻ → **Thêm vào MH chính**.

## 4. Khi cần cập nhật app về sau

Mỗi lần bạn sửa `index.html` và tải lên GitHub:

- **Máy đã cài app**: tự động nhận bản mới ở lần mở kế tiếp (khi có mạng).
- Nếu muốn chắc chắn tất cả máy nhận bản mới ngay, hãy mở file `sw.js`,
  sửa dòng:
  ```js
  const CACHE_VERSION = 'v1';
  ```
  thành `'v2'`, `'v3'`... rồi tải lên cùng lúc với `index.html`.

## 5. Lưu ý

- App **phải chạy qua HTTPS** thì mới cài được. GitHub Pages đã có sẵn HTTPS nên
  không cần làm gì thêm.
- Mở file `index.html` trực tiếp từ máy (đường dẫn `file://`) sẽ **không cài được**
  và không có offline — đây là quy định của trình duyệt, không phải lỗi app.
- Tính năng **tra cứu biên lai điện tử** vẫn cần mạng vì phải kết nối ra ngoài.
  Các tính năng còn lại (tính án, tra cứu giảm án, lịch sử, xuất Excel) chạy
  offline bình thường.
