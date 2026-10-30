# Tính thời hạn chấp hành án phạt tù

Ứng dụng web (PWA) chạy hoàn toàn trên máy, không cần mạng. Nó tính ngày hết án, thời gian đã chấp hành, thời hạn còn lại, các mốc 1/4, 1/3, 1/2, đợt xét giảm án và kết luận đủ điều kiện xét giảm, có xếp loại thi đua, trốn hoặc tạm đình chỉ, hồ sơ và lịch sử được khóa bằng mã PIN.

Trang chạy cho người dùng là tệp **`index.html`** ở thư mục gốc, cùng với `sw.js`, `manifest.json` và các biểu tượng. GitHub Pages phát trực tiếp các tệp này. Người dùng không cần biết đến thư mục `src/`.

## Cấu trúc thư mục

```
index.html, sw.js            ← BẢN GHÉP, do "npm run build" tạo ra. Không sửa tay.
manifest.json, icon-*.png    ← tệp cài đặt PWA
build.mjs                    ← chương trình ghép src/ thành index.html và sw.js
src/
  VERSION                    ← số phiên bản (v93, v94, ...), dùng làm tên bộ nhớ đệm offline
  head.html                  ← phần <head> của trang
  styles/app.css             ← toàn bộ giao diện (CSS)
  markup/01..12-*.html       ← nội dung trang, chia theo khu vực (form nhập, popup, hướng dẫn, ...)
  js/01..23-*.js             ← mã chương trình, chia theo chức năng:
      01-quy-dinh               danh sách điều, khoản, đợt xét giảm
      02-tinh-ngay              các hàm tính ngày tháng (quy ước 30 ngày)
      03-tron-tam-dinh-chi      cộng dồn thời gian trốn hoặc tạm đình chỉ
      04-ngay-het-an-cac-moc    ngày hết án và các mốc 1/4, 1/3, 1/2
      05-dot-xet-giam           đợt xét 15/3, 15/7, 15/12
      ...
      16-khoa-pin               mã hóa hồ sơ và lịch sử bằng mã PIN
      21-nhap-excel             đọc file Excel/CSV
      23-tu-kiem-tra            bộ tự kiểm tra độ chính xác (#kiemthu)
  vendor/jsqr.min.js         ← thư viện đọc mã QR (không sửa)
  assets/                    ← ảnh nền, logo, ảnh hướng dẫn (được nhúng vào index.html khi ghép)
  build-plan.json            ← thứ tự ghép các tệp trên
  sw.template.js             ← mẫu service worker
tests/
  run-all.js                 ← chạy toàn bộ kiểm thử
  e2e/*.js                   ← kiểm thử thao tác trên trình duyệt thật (Chromium)
  regression/                ← 400 kịch bản so với bản mẫu chuẩn (mau-chuan.json.gz)
  fixtures/                  ← file Excel, CSV mẫu để kiểm thử nhập dữ liệu
.github/workflows/kiem-thu.yml ← GitHub tự chạy kiểm thử mỗi lần đẩy mã lên
```

## Quy trình sửa đổi

Cần cài [Node.js](https://nodejs.org) bản 20 trở lên. Chỉ cài một lần:

```
npm ci
npx playwright install chromium
```

Mỗi lần sửa:

1. Sửa tệp trong **`src/`**, không sửa `index.html`.
2. Tăng số trong `src/VERSION`, ví dụ `v93` thành `v94`. Máy người dùng nhận bản mới nhờ số này.
3. Ghép lại: `npm run build`. Lệnh này ghi đè `index.html` và `sw.js`.
4. Kiểm thử: `npm test`, mất khoảng 10–15 phút. Muốn nhanh thì dùng `npm run test:nhanh`, bỏ qua 400 kịch bản.
5. Commit **cả** `src/`, `index.html` và `sw.js` rồi đẩy lên GitHub.

GitHub Actions (tab **Actions** của kho) tự chạy lại toàn bộ kiểm thử. Bản đó báo đỏ khi:

- `index.html` không khớp với `src/`, tức là quên chạy `npm run build` hoặc sửa tay `index.html`;
- có kết quả tính khác với bản đã kiểm chứng;
- có lỗi JavaScript hoặc một thao tác giao diện không chạy đúng.

Nhật ký chi tiết nằm trong mục **Artifacts → nhat-ky-kiem-thu** của lần chạy đó.

## Các lớp kiểm thử

| Lớp | Kiểm tra gì |
|---|---|
| `build.mjs --check` | `index.html` và `sw.js` ở gốc đúng bằng bản ghép từ `src/` |
| Tự kiểm tra `#kiemthu` | Các ví dụ nghiệp vụ đã đối chiếu tay, và "dấu vân tay" của từng hàm tính trên hàng chục nghìn trường hợp ngẫu nhiên cố định. Chỉ cần lệch một ngày ở bất kỳ trường hợp nào là báo KHÔNG ĐẠT. Mở app với đuôi `#kiemthu` để xem trực tiếp. |
| `tests/e2e/` | Thao tác như người dùng: nhập, tính, lưu hồ sơ, khóa PIN, trốn hoặc tạm đình chỉ, Điều 25, 26, xếp loại quý, in phiếu, nhập Excel, báo lỗi tại ô, chữ lớn |
| `tests/regression/` | 400 kịch bản giao diện cùng mã băm các hàm tính, so từng chữ với `mau-chuan.json.gz` |

## Khi chủ động thay đổi cách tính hoặc giao diện

Khi chủ động sửa, kiểm thử sẽ báo khác. Đó là điều đúng: nó cho biết chính xác chỗ nào thay đổi. Sau khi đã tự kiểm tra lại kết quả mới là đúng:

- **Bộ tự kiểm tra `#kiemthu`.** Mở app với đuôi `#kiemthu` (hoặc xem nhật ký `tu-kiem-tra.log` của lần chạy kiểm thử). Dòng KHÔNG ĐẠT ghi "Mong đợi … — Thực tế …" với ví dụ nghiệp vụ, hoặc "Mã ghi sẵn … — Mã hiện tại …" với dấu vân tay. Cập nhật giá trị ghi sẵn tương ứng trong `src/js/23-tu-kiem-tra.js`.
- **Bản mẫu chuẩn 400 kịch bản.** Chạy `npm run cap-nhat-mau-chuan` rồi commit tệp `tests/regression/mau-chuan.json.gz` mới.

Chỉ cập nhật hai thứ này khi chắc chắn thay đổi là cố ý. Nếu không cố ý sửa cách tính mà kiểm thử báo khác, đó là lỗi cần tìm.

## Bảo mật dữ liệu

Kho mã này **không chứa dữ liệu phạm nhân nào**. Hồ sơ chỉ nằm trong trình duyệt trên máy người dùng, được mã hóa bằng mã PIN. File xuất dữ liệu luôn có mật khẩu. Các file trong `tests/fixtures/` là dữ liệu giả để kiểm thử. Không đưa file dữ liệu thật lên kho.
