# Nhật ký thay đổi

## v96 — 31/10/2026

- Nút **"Chia sẻ dữ liệu"** chuyển từ khung "Hồ sơ đội phạm nhân" xuống **chân trang**, thay cho nút "Chữ lớn".
  - Nút luôn hiện, kể cả khi máy chưa có hồ sơ, nên máy mới cũng nhập được file dữ liệu.
  - Hồ sơ đang khóa thì bấm nút sẽ phải nhập mã PIN trước, nhập đúng mới mở các lựa chọn xuất/nhập.
- Bỏ chế độ "Chữ lớn". Máy đã từng bật chữ lớn nay hiển thị cỡ thường.
- Hướng dẫn: bỏ mục "Chữ lớn"; ghi rõ nút "Chia sẻ dữ liệu" ở cuối trang.
- Kiểm thử: nhóm "Báo lỗi tại ô nhập, chữ lớn" đổi thành "Báo lỗi tại ô nhập, chân trang" (15 mục).

## v95 — 31/10/2026

**Hiển thị gọn**
- "Thời gian đã chấp hành" và "Thời hạn còn lại" khi 0 năm 0 tháng thì ghi gọn "… ngày", ví dụ "17 ngày". 0 năm 0 tháng 0 ngày ghi là "0 ngày". Các trường hợp khác vẫn ghi đủ "… năm … tháng … ngày".
- Áp dụng ở kết quả tính, nội dung sao chép, lịch sử, hồ sơ, tổng quan, phiếu in, file Excel.

**Khoản 7: đợt xét giảm tiếp theo**
- Theo Điều 12 Thông tư liên tịch 02/2021/TTLT-TANDTC-VKSNDTC-BCA-BQP, mỗi năm chỉ được xét giảm tối đa 01 lần. Đã được giảm ở đợt nào thì đợt sớm nhất được xét tiếp là cùng đợt của năm sau, không cần đủ tròn 12 tháng giữa 2 ngày xét.
  - Ví dụ: giảm đợt 2/9/2025, ngày xét thực tế 20/07/2025 → được xét lại đợt 2/9/2026 (ngày xét 15/07/2026). Trước đây phần mềm tính từ 20/07/2026 nên nhảy sang Tết 2027.
- Ngày nhập vào (ngày xét thực tế, ngày quyết định) được quy về đợt:
  - tháng 3–5: đợt 30/4;
  - tháng 6–10: đợt 2/9;
  - tháng 11–2: đợt Tết.

  Đã sửa cách đặt tên đợt cũ: ngày tháng 9 từng bị gọi là đợt 30/4; ngày tháng 1–2 thuộc Tết từng bị ghi sai năm.
- Khi chọn đợt từ danh sách (ngày xét cố định 15/3, 15/7, 15/12), kết luận không đổi. Đã so trên 4.000 trường hợp.
- Sửa lỗi: chỉ nhập ngày xét thực tế mà chưa chọn đợt thì kết luận ghi "— Chọn kỳ giảm — 2025". Nay ghi đúng tên đợt.

**Căn cứ**
- Ghi đầy đủ "Nghị quyết 03/2024/NQ-HĐTP" ở mọi chỗ trước đây ghi "Nghị quyết 03" hoặc "Nghị quyết 03/2024".

**Kiểm thử**
- Tự kiểm tra `#kiemthu`: thêm 4 ví dụ (nay 66 mục). Cập nhật 2 dấu vân tay: hồ sơ (định dạng gọn) và kết luận xét giảm (câu gợi ý Khoản 7).
- Thêm nhóm kiểm thử "Định dạng gọn, Khoản 7 cùng đợt năm sau".

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
