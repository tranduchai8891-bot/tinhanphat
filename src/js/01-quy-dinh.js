
// =====================================================================================
// THAM SỐ PHÁP LÝ — SỬA TẠI ĐÂY KHI VĂN BẢN THAY ĐỔI
// Mọi con số nghiệp vụ dùng trong phần tính toán đều lấy từ bảng này (có ghi căn cứ).
// Sau khi sửa: mở ứng dụng với đuôi #kiemthu. Các mục KHÔNG ĐẠT cho biết kết quả nào thay đổi;
// nếu thay đổi đúng ý muốn thì chép mã mới vào SELFTEST_FINGERPRINTS / sửa ví dụ tương ứng.
// Lưu ý: một số câu chữ hướng dẫn trên giao diện (VD "cần 04 quý liền kề" của Khoản 8) là văn bản
// cố định trong HTML, cần sửa tay cho khớp nếu thay đổi.
// =====================================================================================
const QUY_DINH={
  // Các đợt xét giảm thời hạn chấp hành án trong năm và ngày xét cố định.
  // tuThang: một ngày bất kỳ (ngày xét thực tế, ngày quyết định giảm...) từ tháng này đến trước tuThang của đợt kế tiếp
  // được quy về đợt đó: 30/4 - 1/5: tháng 3-5; Quốc khánh 2/9: tháng 6-10; Tết Nguyên Đán: tháng 11-12 và 1-2 năm sau.
  dotXet:[
    {name:'30/4 - 1/5',     reviewMonth:3,  reviewDay:15, tuThang:3},
    {name:'Quốc khánh 2/9', reviewMonth:7,  reviewDay:15, tuThang:6},
    {name:'Tết Nguyên Đán', reviewMonth:12, reviewDay:15, tuThang:11}
  ],
  // Điều kiện thời gian đã chấp hành (1/mẫu số của mức án, có trừ tạm giam)
  mocThuong:3,               // 1/3 mức án — Điều 5 Nghị quyết 03/2024/NQ-HĐTP
  mocChuaThanhNien:4,        // 1/4 mức án — Điều 123 Luật Tư pháp người chưa thành niên
  mocKhoan9:[1,2],           // ≥ 1/2 mức hình phạt chung — Khoản 9 (tội ít nghiêm trọng do cố ý)
  mocKhoan10:[2,3],          // ≥ 2/3 mức hình phạt chung — Khoản 10 (tội nghiêm trọng trở lên)
  mocChungThanThang:300,     // 25 năm nếu tù chung thân — Khoản 10
  // Số quý xếp loại Khá liên tục theo mức án — Phụ lục Phần I.2: [mức án TRÊN ... năm, số quý]
  quyTheoMucAn:[[20,14],[15,12],[10,8],[5,4],[3,2]],
  quyToiThieu:1,             // án từ 03 năm trở xuống: ≥ 1 quý gần nhất
  // Khoản 4 (người dưới 18 tuổi...): được thiếu số quý đầu — [mức án TRÊN ... năm, số quý được thiếu]
  quyDuocThieu:[[15,4],[5,2],[3,1]],
  // Khoản 6: mỗi tiền án ứng với số quý Khá cộng thêm
  tienAn:{nguongThang:36, quyAnNho:1, quyAnLon:2},   // án ≤ 36 tháng: +1 quý; trên 36 tháng: +2 quý
  // Khoản 5 (xếp loại không liên tục, án trên 05 năm): [mức án TRÊN ... năm, cộng thêm tổng quý, số quý liền kề]
  khoan5:[[10,2,4],[5,1,2]],
  // Khoản 7: đã được giảm án — xét đợt tiếp: đủ 04 quý Khá, ≥ 02 quý liền kề.
  // cachNam: mỗi năm chỉ được xét giảm tối đa 01 lần (Điều 12 Thông tư liên tịch 02/2021/TTLT-TANDTC-VKSNDTC-BCA-BQP):
  // được giảm ở đợt nào thì sớm nhất được xét lại vào CÙNG ĐỢT của năm sau (không cần đủ tròn 12 tháng).
  khoan7:{tongQuy:4, lienKe:2, cachNam:1},
  // Điều 21 Nghị định 170/2026/NĐ-CP: tháng được xếp loại khi chấp hành ≥ 21 ngày; quý cần ≥ 02 tháng
  ngayToiThieuTrongThang:21,
  thangToiThieuTrongQuy:2,
  // Quý I: 01/12 năm trước – cuối tháng 02; Quý II: 01/3–31/5; Quý III: 01/6–31/8; Quý IV: 01/9–30/11
  quy:[
    {name:'I',  startMonth:12, startYearOffset:-1, endMonth:2},
    {name:'II', startMonth:3,  startYearOffset:0,  endMonth:5},
    {name:'III',startMonth:6,  startYearOffset:0,  endMonth:8},
    {name:'IV', startMonth:9,  startYearOffset:0,  endMonth:11}
  ],
  // Điều 25: hết diện Kém thì ít nhất ... tháng liền kề xếp loại Trung bình
  thangTrungBinhSauKem:3,
  // Điều 26 khoản 3, 4, 5: phạm tội mới -> ... quý đầu xếp loại Kém
  quyKemPhamToiMoi:2,
  // Phân loại tội phạm theo Điều 9 BLHS, suy từ mức án tuyên (tháng) — chỉ để tham khảo nhanh
  phanLoaiToi:[[36,'Ít nghiêm trọng','c1'],[84,'Nghiêm trọng','c2'],[180,'Rất nghiêm trọng','c3']],
  phanLoaiCaoNhat:['ĐB nghiêm trọng','c4']
};
const pad2=n=>String(n).padStart(2,'0');

let remissions=[];
let refMode='today';

function setRefMode(mode){
  refMode=mode;
  document.getElementById('btnRefToday').classList.toggle('active',mode==='today');
  document.getElementById('btnRefCustom').classList.toggle('active',mode==='custom');
  document.getElementById('refDateField').style.display=mode==='custom'?'block':'none';
}

function getRefDate(){
  if(refMode==='custom'){
    const v=document.getElementById('refDate').value.trim();
    if(v){
      const {d,m,y}=readDateParts(v);
      if(d&&m&&y)return new Date(y,m-1,d);
    }
  }
  const d=new Date();
  d.setHours(0,0,0,0);
  return d;
}
