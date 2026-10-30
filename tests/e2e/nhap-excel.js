// Kiểm tra nhập hồ sơ hàng loạt từ Excel / CSV
const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const SP=require('os').tmpdir()+'/';
const FIX=require('path').join(__dirname,'..','fixtures')+'/';
const file='file://'+path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN',acceptDownloads:true});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
  const ev=(f,...a)=>pg.evaluate(f,...a);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  await pg.goto(file);await pg.waitForTimeout(1300);
  await ev(()=>{window.__w=[];const o=window.showWarn;window.showWarn=m=>{window.__w.push(m);};});
  const lastWarn=()=>ev(()=>window.__w[window.__w.length-1]||'');
  const prof=n=>ev(n=>{const p=loadProfiles().find(p=>p.name===n);return p?{rel:p.release,served:p.served,rem:p.remaining,m33:p.m33,esc:p.escape,ne:(p.data.escapes||[]).length,arr:p.data.arrival,minor:p.data.minor,pen:p.data.penalty,sen:p.sentence,pd:p.preDet,rm:p.remission}:null;},n);

  // 1. Tổng quan khi chưa có hồ sơ: có nút tải mẫu / nhập Excel
  await ev(()=>goNav('team'));
  ok((await ev(()=>document.getElementById('teamBody').textContent)).includes('Nhập từ Excel'),'Tổng quan trống: có nút Tải file Excel mẫu và Nhập từ Excel');
  // 2. File mẫu do app tạo -> nhập lại được ngay
  const [d1]=await Promise.all([pg.waitForEvent('download'),ev(()=>downloadImportTemplate())]);
  const tpl=SP+'mau.xlsx';await d1.saveAs(tpl);
  await pg.setInputFiles('#xlImportInput',tpl);await pg.waitForTimeout(600);
  ok((await lastWarn()).startsWith('Đã nhập 2 hồ sơ từ file (thêm mới 2, cập nhật 0)'),'Nhập file mẫu: '+(await lastWarn()));
  const B=await prof('Trần Văn B');
  ok(B&&B.rel==='24/07/2031'&&B.served==='1 năm 9 tháng 26 ngày'&&B.rem==='4 năm 8 tháng 24 ngày'&&B.ne===2&&B.esc==='40 năm 9 tháng 25 ngày','Dòng mẫu có 2 lần trốn: hết án 24/07/2031, đã chấp hành 1 năm 9 tháng 26 ngày');
  const A=await prof('Nguyễn Văn A');
  ok(A&&A.arr==='20/03/2022'&&A.sen==='6 năm'&&A.pd==='2 tháng','Dòng mẫu 1: mức án, tạm giam, ngày đến trại');
  // Hồ sơ nhập từ Excel = tính tay trên màn hình chính (mở lại -> Tính án)
  const same=await ev(()=>{const i=loadProfiles().findIndex(p=>p.name==='Trần Văn B');loadProfile(i);k7PickShown=true;calculate();
    const r=lastCalcRaw;closeModal();const p=loadProfiles().find(p=>p.name==='Trần Văn B');
    return fmtDate(r.releaseDate)===p.release&&fmtDaysFull(r.servedDiff)===p.served&&fmtDaysFull(r.remainingDiff)===p.remaining&&fmtDate(r.m33)===p.m33;});
  ok(same,'Mở lại hồ sơ nhập từ Excel rồi tính án: ra đúng số liệu đã lưu');
  // 3. File Excel thật (nén, ô ngày kiểu số, cột "Án phạt" dạng chữ như file xuất của app)
  await pg.setInputFiles('#xlImportInput',FIX+'real.xlsx');await pg.waitForTimeout(800);
  const w3=await lastWarn();
  ok(w3.startsWith('Đã nhập 2 hồ sơ từ file (thêm mới 2, cập nhật 0). Không nhập 3 dòng'),'File Excel thật: nhập 2, báo 3 dòng lỗi');
  ok(w3.includes('dòng 4: ngày bắt không hợp lệ (31/02/2020)')&&w3.includes('dòng 5: thiếu họ tên')&&w3.includes('dòng 6: thiếu mức án'),'  Báo đúng lý do từng dòng: '+w3.split('—')[1]);
  const E=await prof('Lê Văn Excel'), S=await prof('Phạm Thị Số');
  ok(E&&E.rel==='24/07/2031'&&E.ne===2,'  Ô ngày kiểu số + "đến" giữa 2 ngày trốn: hết án 24/07/2031');
  ok(S&&S.arr==='20/03/2022'&&S.minor===true&&S.pen==='1'&&S.rm==='1 năm 3 tháng'&&S.pd==='2 tháng','  Cột chữ "6 năm", "2 tháng", "1 năm 3 tháng", chưa thành niên "x", 1 tiền án');
  // Nhập lại cùng file -> cập nhật, không nhân đôi, giữ xếp loại đã nhập trong app
  await ev(()=>{const i=loadProfiles().findIndex(p=>p.name==='Phạm Thị Số');gpQuarter='2026-III';setTeamGrade(i,'Kem');});
  await pg.setInputFiles('#xlImportInput',FIX+'real.xlsx');await pg.waitForTimeout(800);
  ok((await ev(()=>loadProfiles().find(p=>p.name==='Phạm Thị Số').data.grades['2026-III']))==='Kem','  Nhập lại: giữ nguyên xếp loại quý đã chọn trong app');
  ok((await lastWarn()).startsWith('Đã nhập 2 hồ sơ từ file (thêm mới 0, cập nhật 2)')&&(await ev(()=>loadProfiles().length))===4,'Nhập lại cùng file: cập nhật 2 hồ sơ, không nhân đôi');
  // 4. CSV (dấu chấm phẩy, ngày 1/2/2023 và 2023-05-04, tên có dấu chấm phẩy trong ngoặc kép)
  await pg.setInputFiles('#xlImportInput',FIX+'ds.csv');await pg.waitForTimeout(500);
  const H=await prof('Hoàng; Văn CSV'), D=await prof('Đỗ Văn Hai');
  ok((await lastWarn()).startsWith('Đã nhập 2 hồ sơ')&&H&&H.sen==='3 năm'&&H.arr==='15/02/2023'&&D&&D.sen==='2 năm 6 tháng','File CSV: nhập 2 hồ sơ, đọc đúng ngày và mức án');
  // 5. File không đúng mẫu
  fs.writeFileSync(SP+'bad.csv','a;b\n1;2\n');
  await pg.setInputFiles('#xlImportInput',SP+'bad.csv');await pg.waitForTimeout(300);
  ok((await lastWarn()).includes('Không thấy cột "Họ tên"'),'File không đúng mẫu: báo rõ');
  fs.writeFileSync(SP+'bad.xlsx','not a zip');
  await pg.setInputFiles('#xlImportInput',SP+'bad.xlsx');await pg.waitForTimeout(300);
  ok((await lastWarn()).includes('Không đọc được file'),'File hỏng: báo không đọc được');
  // 6. Danh sách xét giảm dùng được ngay cho hồ sơ nhập từ Excel
  await ev(()=>goNav('review'));
  ok((await ev(()=>document.querySelectorAll('.rv-row').length))===6,'Xét giảm: có đủ 6 hồ sơ vừa nhập');
  ok((await ev(()=>document.getElementById('profileCount').textContent))===' (6/200)','Giới hạn hồ sơ: 200');
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
