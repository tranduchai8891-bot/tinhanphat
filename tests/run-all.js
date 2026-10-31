// Chạy toàn bộ kiểm thử trên index.html ở thư mục gốc.
//   node tests/run-all.js          tất cả (khoảng 10-15 phút)
//   node tests/run-all.js --nhanh  bỏ qua 400 kịch bản so mẫu chuẩn
const path=require('path'),fs=require('fs');
const {spawnSync}=require('child_process');
const html=path.join(__dirname,'..','index.html');
const quick=process.argv.includes('--nhanh');
const SUITES=[
  ['Tự kiểm tra độ chính xác (#kiemthu)','e2e/tu-kiem-tra.js'],
  ['Lưu, mở lại hồ sơ, lịch sử, Excel','e2e/luu-mo-ho-so.js'],
  ['Điều 25, 26 — Khoản 9, 10','e2e/dieu-25-26-khoan-9-10.js'],
  ['Khóa PIN, file dữ liệu có mật khẩu','e2e/khoa-pin.js'],
  ['Trốn/tạm đình chỉ','e2e/tron-tam-dinh-chi.js'],
  ['Tổng quan đội, đề nghị xét giảm, in','e2e/tong-quan-xet-giam.js'],
  ['Xếp loại quý, dòng thời gian, phiếu in','e2e/xep-loai-dong-thoi-gian-in.js'],
  ['Nhập hồ sơ từ Excel/CSV','e2e/nhap-excel.js'],
  ['Báo lỗi tại ô nhập, chữ lớn','e2e/bao-loi-chu-lon.js'],
  ['Nhập ngày, mật khẩu file xuất','e2e/nhap-ngay-mat-khau.js'],
  ['Án đã hết: dừng ở mức án','e2e/an-da-het.js']
];
if(!quick)SUITES.push(['400 kịch bản + hàm tính so với mẫu chuẩn','regression/so-sanh.js']);
const logDir=path.join(__dirname,'..','test-output');fs.mkdirSync(logDir,{recursive:true});
let failed=0;const t0=Date.now();
for(const [name,file] of SUITES){
  const t=Date.now();
  const r=spawnSync(process.execPath,[path.join(__dirname,file),html],{encoding:'utf8',timeout:45*60e3,maxBuffer:64*1024*1024});
  const out=(r.stdout||'')+(r.stderr||'');
  fs.writeFileSync(path.join(logDir,path.basename(file,'.js')+'.log'),out);
  const lines=out.split('\n');
  const pass=lines.filter(l=>l.startsWith('PASS')).length;
  const fails=lines.filter(l=>l.startsWith('FAIL'));
  const jsErr=lines.some(l=>/Lỗi JS: (?!không)/.test(l));
  const ok=r.status===0&&pass>0&&!fails.length&&!jsErr;
  console.log((ok?'✓ ':'✗ ')+name+' — '+pass+' đạt'+(fails.length?(', '+fails.length+' KHÔNG ĐẠT'):'')+(jsErr?', có lỗi JS':'')+' ('+Math.round((Date.now()-t)/1000)+' giây)');
  if(!ok){failed++;console.log(out.split('\n').filter(l=>/^(FAIL|   |Lỗi JS)/.test(l)||r.status!==0).slice(0,40).map(l=>'    '+l).join('\n'));}
}
console.log('\n'+(failed?('✗ '+failed+' nhóm kiểm thử KHÔNG ĐẠT'):'✓ Tất cả nhóm kiểm thử ĐẠT')+' — '+Math.round((Date.now()-t0)/1000)+' giây');
process.exit(failed?1:0);
