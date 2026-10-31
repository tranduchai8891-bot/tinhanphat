# Nhật ký thay đổi

## v94 — 31/10/2026

**Nhập ngày**
- Năm gõ tắt 2 số ở các ô ngày đã qua (ngày bắt, ngày đến trại, ngày trốn/tạm đình chỉ, kỳ giảm đã xét, ngày quyết định kỷ luật): lớn hơn năm hiện tại thì hiểu là 19xx. Ví dụ 84 → 1984 (trước đây thành 2084); 18 → 2018. Ô Ngày giả định vẫn hiểu là 20xx.
- Khi phần mềm tự sửa ngày không có thật (31/04 → 30/04, 29/02/2023 → 28/02/2023, tháng 13 → 12), hiện dòng chữ cam ngay dưới ô để người nhập kiểm tra lại. Ô ngày bắt không hiện dòng này.
- Bấm Tính:
  - báo lỗi và không tính khi ngày bắt sau ngày hôm nay hoặc sau ngày giả định;
  - báo lỗi khi ngày bắt hoặc ngày giả định không có thật.
- Nhập Excel/CSV: bỏ qua và báo rõ dòng có ngày bắt sau ngày hôm nay.

**Án đã hết**
- Sau ngày hết án, "thời gian đã chấp hành" không cộng tiếp nữa mà dừng ở mức án trừ phần được giảm, còn thời hạn còn lại bằng 0. Ví dụ: bắt 09/03/1984, án 6 năm, tính đến 30/10/2026 → 6 năm 0 tháng 0 ngày (trước đây 42 năm 7 tháng 21 ngày).
- Trước ngày hết án và đúng ngày hết án: giữ nguyên như cũ.
- Áp dụng chung cho kết quả tính, nội dung sao chép, phiếu in, hồ sơ, tổng quan, file Excel.
- Đã kiểm tra trên 30.000 trường hợp ngẫu nhiên. Ngày hết án, các mốc, thời hạn còn lại không đổi. Chỉ các ca đã hết án đổi con số "đã chấp hành", và đều bằng mức án trừ phần được giảm.
- Tự kiểm tra `#kiemthu`: thêm 3 ví dụ (nay 62 mục) và cập nhật 2 dấu vân tay có chứa thời gian đã chấp hành.

**Mật khẩu file xuất**
- Phần mềm tạo sẵn mật khẩu mạnh 12 ký tự, dạng `xxxx-xxxx-xxxx`, chỉ gồm chữ thường và số, không có ký tự dễ nhầm. Có nút Sao chép và Tạo mật khẩu khác.
- Mật khẩu tạo sẵn được tự sao chép khi bấm Đồng ý, và ghi trong thông báo xuất xong để lưu lại.
- Mật khẩu tự đặt cần từ 10 ký tự (trước đây 6). File cũ đặt mật khẩu 6 ký tự vẫn mở được.

**Kiểm thử**
- Thêm nhóm kiểm thử "Nhập ngày, mật khẩu file xuất" (35 mục) và "Án đã hết" (13 mục).
- 400 kịch bản dùng hạt giống ngẫu nhiên riêng cho từng kịch bản. Một kịch bản dừng sớm không còn làm đổi dữ liệu các kịch bản sau.
- So với v93 chạy cùng bộ kịch bản:
  - các hàm tính giống hệt;
  - 16 kịch bản có ngày bắt sau ngày tính nay bị chặn đúng;
  - các kịch bản còn lại chỉ khác ở danh sách lịch sử và hồ sơ, vì có ít lần tính hơn.

## v93 — 30/10/2026

- Tách mã nguồn ra `src/`, ghép bằng `build.mjs`, giống hệt từng byte bản v93 trước khi tách.
- Thêm kiểm thử tự động: tự kiểm tra `#kiemthu`, các nhóm thao tác trên Chromium, 400 kịch bản so với mẫu chuẩn. GitHub Actions tự chạy mỗi lần đẩy mã.
