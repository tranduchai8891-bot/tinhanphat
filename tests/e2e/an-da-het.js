// Án đã hết: "thời gian đã chấp hành" dừng ở mức án (trừ phần được giảm), thời hạn còn lại = 0
const path=require('path'),fs=require('fs'),os=require('os');
const {chromium}=require('playwright');
const SP=os.tmpdir()+'/';
const file='file://'+path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
  const ev=(f,...a)=>pg.evaluate(f,...a);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  await pg.goto(file);await pg.waitForTimeout(1300);
  await ev(()=>{window.showWarn=()=>{};});
  // Tính trên màn hình chính, trả về các ô kết quả
  const calc=o=>ev(o=>{closeModal();clearFieldErrors();const s=(i,v)=>document.getElementById(i).value=v;
    s('prisonerName',o.name||'');s('arrestDateText',o.arrest);s('sY',o.sY||'');s('sM',o.sM||'');s('sD',o.sD||'');
    s('pdY','');s('pdM',o.pdM||'');s('pdD',o.pdD||'');
    remissions=o.rem?[{years:o.rem,months:0}]:[{years:0,months:0}];renderRemissions();
    escapes=o.esc||[];escOwner=null;k7PickShown=true;pickedReduction=null;
    if(o.ref){setRefMode('custom');s('refDate',o.ref);}else setRefMode('today');
    calculate();
    const t=id=>document.getElementById(id).textContent.trim();
    return {shown:document.getElementById('modalOverlay').classList.contains('show'),rel:t('r-release'),served:t('r-served'),rem:t('r-remaining'),
      alert:document.getElementById('alertBanner').textContent.replace(/\s+/g,' ').trim(),copy:lastResultText};},o);

  // 1. Ví dụ của anh Hải: bắt 1984, án 6 năm, tính đến hôm nay
  let r=await calc({arrest:'09/03/1984',sY:'6 năm'});
  ok(r.shown&&r.rel==='09/03/1990'&&r.served==='6 năm 0 tháng 0 ngày'&&r.rem==='0 năm 0 tháng 0 ngày','Bắt 09/03/1984, án 6 năm, tính đến 30/10/2026: đã chấp hành 6 năm 0 tháng 0 ngày, còn lại 0 (trước đây 42 năm 7 tháng 21 ngày)');
  ok(r.alert.includes('vượt qua ngày hết án'),'  Vẫn báo đỏ "đã đến/vượt qua ngày hết án"');
  ok(r.copy.includes('Thời gian đã chấp hành: 6 năm 0 tháng 0 ngày')&&r.copy.includes('Thời hạn còn lại: 0 năm 0 tháng 0 ngày'),'  Nội dung Sao chép cũng dừng ở mức án');
  const phieu=await ev(()=>phieuHTML(lastCalcRaw,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '));
  ok(phieu.includes('Thời gian đã chấp hành 6 năm 0 tháng 0 ngày'),'  Phiếu in cũng dừng ở mức án');
  // 2. Có tạm giam và được giảm: dừng ở mức án trừ phần được giảm (tạm giam đã nằm trong đó)
  r=await calc({arrest:'09/03/1984',sY:'6 năm',pdM:'2 tháng',pdD:'15 ngày',rem:1});
  ok(r.rel==='24/12/1988'&&r.served==='5 năm 0 tháng 0 ngày'&&r.rem==='0 năm 0 tháng 0 ngày','Án 6 năm, tạm giam 2 tháng 15 ngày, giảm 1 năm: đã chấp hành 5 năm (mức án trừ phần được giảm)');
  // 3. Có trốn: thời gian trốn không tính, dừng ở mức án
  r=await calc({arrest:'09/03/1984',sY:'6 năm',sM:'6 tháng',sD:'20 ngày',esc:[{from:'13/11/1985',to:'29/03/1986'}]});
  ok(r.rel==='15/02/1991'&&r.served==='6 năm 6 tháng 20 ngày'&&r.rem==='0 năm 0 tháng 0 ngày','Án 6 năm 6 tháng 20 ngày, trốn 4 tháng 16 ngày: đã chấp hành 6 năm 6 tháng 20 ngày');
  // 4. Quanh ngày hết án: trước và đúng ngày hết án giữ nguyên như cũ, sau đó không tăng nữa
  r=await calc({arrest:'09/03/1984',sY:'6 năm',ref:'08/03/1990'});
  ok(r.served==='5 năm 11 tháng 29 ngày'&&r.rem==='0 năm 0 tháng 1 ngày','Ngày trước ngày hết án: 5 năm 11 tháng 29 ngày, còn 1 ngày (như cũ)');
  r=await calc({arrest:'09/03/1984',sY:'6 năm',ref:'09/03/1990'});
  ok(r.served==='6 năm 0 tháng 0 ngày'&&r.rem==='0 năm 0 tháng 0 ngày','Đúng ngày hết án: 6 năm 0 tháng 0 ngày, còn 0 (như cũ)');
  r=await calc({arrest:'09/03/1984',sY:'6 năm',ref:'10/03/1990'});
  ok(r.served==='6 năm 0 tháng 0 ngày','Sau ngày hết án 1 ngày: không cộng thêm (trước đây 6 năm 0 tháng 1 ngày)');
  // 5. Chưa hết án: không đổi
  r=await calc({arrest:'09/03/1984',sY:'6 năm',sM:'6 tháng',sD:'20 ngày',esc:[{from:'13/11/1985',to:'29/03/1986'},{from:'02/04/1986',to:'11/09/2026'}]});
  ok(r.served==='1 năm 9 tháng 26 ngày'&&r.rem==='4 năm 8 tháng 24 ngày'&&r.rel==='24/07/2031','Chưa hết án (ví dụ trốn 2 lần): vẫn 1 năm 9 tháng 26 ngày, còn 4 năm 8 tháng 24 ngày');
  // 6. Hồ sơ đã lưu (tự cập nhật theo ngày) và Tổng quan
  await calc({name:'Án Đã Hết',arrest:'09/03/1984',sY:'6 năm'});
  await ev(()=>{closeModal();saveProfileFromHistory(0,'Án Đã Hết');});
  const p=await ev(()=>{const p=refreshProfiles().find(x=>x.name==='Án Đã Hết');return p&&{served:p.served,rem:p.remaining};});
  ok(p&&p.served==='6 năm 0 tháng 0 ngày'&&p.rem==='0 năm 0 tháng 0 ngày','Hồ sơ đã lưu: đã chấp hành 6 năm 0 tháng 0 ngày, còn lại 0');
  const det=await ev(()=>{const i=loadProfiles().findIndex(x=>x.name==='Án Đã Hết');openProfDetail(i);const t=document.getElementById('profDetailBody').textContent.replace(/\s+/g,' ');closeProfDetail();return t;});
  ok(det.includes('6 năm 0 tháng 0 ngày')&&!det.includes('42 năm'),'  Chi tiết hồ sơ: không còn 42 năm');
  // 7. Nhập Excel/CSV một hồ sơ đã hết án
  const csv=SP+'an-da-het.csv';
  fs.writeFileSync(csv,'Họ tên;Ngày bắt;Án (năm);Án (tháng);Án (ngày)\nNguyễn Hết Án;09/03/1984;6;;\n');
  await pg.setInputFiles('#xlImportInput',csv);await pg.waitForTimeout(500);
  const x=await ev(()=>{const p=loadProfiles().find(x=>x.name==='Nguyễn Hết Án');return p&&p.served;});
  ok(x==='6 năm 0 tháng 0 ngày','Nhập từ Excel/CSV: hồ sơ đã hết án cũng dừng ở mức án');
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
