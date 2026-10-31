// Kiểm tra báo lỗi tại ô nhập và chân trang (nút Chia sẻ dữ liệu thay cho nút Chữ lớn)
const path=require('path');
const {chromium}=require('playwright');
const file='file://'+path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:360,height:780},deviceScaleFactor:2,isMobile:true,hasTouch:true,timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
  const ev=(f,...a)=>pg.evaluate(f,...a);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  await pg.goto(file);await pg.waitForTimeout(1300);
  const st=()=>ev(()=>({errs:[...document.querySelectorAll('.field-err')].map(e=>e.textContent),inv:[...document.querySelectorAll('.invalid')].map(e=>e.id),
    modal:document.getElementById('modalOverlay').classList.contains('show'),warn:getComputedStyle(document.getElementById('quarterWarn')).display!=='none'}));
  // 1. Thiếu ngày bắt
  await ev(()=>calculate());
  let s=await st();
  ok(s.errs.join()==='Nhập đủ ngày/tháng/năm, ví dụ 01/12/2025.'&&s.inv.join()==='arrestDateText'&&!s.modal&&!s.warn,'Thiếu ngày bắt: báo ngay dưới ô (viền đỏ), không bật popup');
  await pg.click('#arrestDateText');await pg.keyboard.type('0903');
  s=await st();
  ok(!s.errs.length&&!s.inv.length,'Gõ vào ô: hết báo lỗi');
  await pg.keyboard.type('1984');
  // 2. Thiếu mức án
  await ev(()=>{document.activeElement.blur();calculate();});
  s=await st();
  ok(s.errs.join()==='Nhập mức án (năm, tháng hoặc ngày).'&&s.inv.join()==='sY,sM,sD','Thiếu mức án: viền đỏ cả 3 ô năm/tháng/ngày');
  // 3. Ngày giả định trống
  await ev(()=>{document.getElementById('sY').value='6 năm';setRefMode('custom');calculate();});
  s=await st();
  ok(s.errs.join()==='Nhập ngày giả định, ví dụ 17/06/2026.'&&s.inv.join()==='refDate'&&!s.inv.includes('sY'),'Thiếu ngày giả định: báo tại ô ngày giả định, lỗi cũ tự xóa');
  await ev(()=>{setRefMode('today');calculate();});
  s=await st();
  ok(s.modal&&!s.errs.length,'Đủ thông tin: ra kết quả, không còn báo lỗi');
  await ev(()=>closeModal());
  // 4. Chân trang: nút "Chia sẻ dữ liệu" thay cho nút "Chữ lớn"
  const foot=await ev(()=>[...document.querySelectorAll('.footer .footer-guide-btn')].map(b=>b.textContent.trim()));
  ok(foot.join(' | ')==='📖 Hướng dẫn sử dụng | Bảo mật | 🔄 Chia sẻ dữ liệu','Chân trang: '+foot.join(' | ')+' (không còn nút Chữ lớn)');
  ok(!(await ev(()=>!!document.querySelector('#profileCard [onclick="openShareOpt()"]'))),'Khung Hồ sơ đội phạm nhân không còn nút Chia sẻ dữ liệu');
  ok(await ev(()=>getComputedStyle(document.getElementById('profileCard')).display==='none'&&!loadProfiles().length),'  (máy chưa có hồ sơ: khung Hồ sơ đang ẩn)');
  await pg.click('#shareFooterBtn');
  const opts=await ev(()=>({show:document.getElementById('shareOptOverlay').style.display==='flex',t:[...document.querySelectorAll('#shareOptOverlay .exp-opt-t')].map(x=>x.textContent)}));
  ok(opts.show&&opts.t.join(',')==='Xuất dữ liệu,Nhập dữ liệu,Nhập danh sách từ Excel,Tải file Excel mẫu','Bấm nút ở chân trang: mở popup Chia sẻ dữ liệu ngay cả khi chưa có hồ sơ ('+opts.t.join(', ')+')');
  await ev(()=>closeShareOpt());
  // Máy đã từng bật chữ lớn ở bản trước: nay hiển thị cỡ thường
  await ev(()=>localStorage.setItem('prison_big_text','1'));await pg.reload();await pg.waitForTimeout(1300);
  ok(!(await ev(()=>document.documentElement.classList.contains('big'))),'Máy đã từng bật chữ lớn: nay hiển thị cỡ thường');
  // Đang khóa PIN: bấm Chia sẻ dữ liệu thì hỏi mã PIN trước, đúng mã mới mở popup
  await ev(async()=>{await enablePin('246810');await lockNow();});
  await pg.click('#shareFooterBtn');await pg.waitForTimeout(200);
  const lk=await ev(()=>({pin:getComputedStyle(document.getElementById('pinOverlay')).display!=='none',share:document.getElementById('shareOptOverlay').style.display==='flex'}));
  ok(lk.pin&&!lk.share,'Đang khóa PIN: bấm Chia sẻ dữ liệu thì hỏi mã PIN trước');
  await ev(async()=>{document.getElementById('pinA').value='246810';await confirmPin();});await pg.waitForTimeout(400);
  ok(await ev(()=>document.getElementById('shareOptOverlay').style.display==='flex'),'  Nhập đúng mã PIN: mở popup Chia sẻ dữ liệu');
  await ev(()=>closeShareOpt());
  const lay=await ev(()=>{const s=(i,v)=>document.getElementById(i).value=v;s('arrestDateText','09/03/1984');s('sY','6 năm');s('sM','6 tháng');s('sD','20 ngày');
    escapes=[{from:'13/11/1985',to:'29/03/1986'}];escOwner=null;k7PickShown=true;calculate();
    const box=document.querySelector('#modalOverlay .modal-box').getBoundingClientRect();
    const r={docW:document.documentElement.scrollWidth,vw:innerWidth,boxOk:box.left>=0&&box.right<=innerWidth&&box.top>=0&&box.bottom<=innerHeight};
    closeModal();openEscape();
    const a=document.getElementById('escF0').getBoundingClientRect(),t=document.getElementById('escT0').getBoundingClientRect();
    r.side=Math.abs(t.top-a.top)<2&&t.left>a.right-1;closeEscape();
    goNav('team');const tb=document.querySelector('#teamOverlay .modal-box').getBoundingClientRect(),nav=document.getElementById('bottomNav').getBoundingClientRect();
    r.teamOk=tb.bottom<=nav.top+1&&nav.right<=innerWidth+1;closeTeam();
    const f=document.querySelector('.footer').getBoundingClientRect();r.footOk=f.right<=innerWidth+1&&f.left>=-1;
    return r;});
  ok(lay.docW===lay.vw&&lay.boxOk&&lay.footOk,'Màn hình 360px: không tràn ngang, popup kết quả và chân trang vừa màn hình');
  ok(lay.side,'  Ô Từ ngày / Đến ngày nằm ngang hàng');
  ok(lay.teamOk,'  Trang Tổng quan không bị thanh điều hướng che');
  await ev(()=>{const f=document.querySelector('.footer');f.scrollIntoView({block:'end'});});await pg.waitForTimeout(200);
  await pg.screenshot({path:require('os').tmpdir()+'/chan-trang.png'});
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
