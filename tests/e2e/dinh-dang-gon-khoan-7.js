// v95: hiển thị gọn "… ngày" khi 0 năm 0 tháng; Khoản 7 — đợt sớm nhất được xét tiếp là cùng đợt năm sau
// (Điều 12 Thông tư liên tịch 02/2021/TTLT-TANDTC-VKSNDTC-BCA-BQP); ghi đầy đủ Nghị quyết 03/2024/NQ-HĐTP
const path=require('path');
const {chromium}=require('playwright');
const file='file://'+path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch();
  const errs=[];
  const open=async(now)=>{
    const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'});
    const pg=await ctx.newPage();await pg.clock.setFixedTime(new Date(now));await pg.route(/^https?:\/\//,r=>r.abort());
    pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
    await pg.goto(file);await pg.waitForTimeout(1300);await pg.evaluate(()=>{window.showWarn=()=>{};});return pg;};
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  const calc=(pg,o)=>pg.evaluate(o=>{closeModal();clearFieldErrors();const s=(i,v)=>document.getElementById(i).value=v;
    s('prisonerName',o.name||'');s('arrestDateText',o.arrest);s('sY',o.sY||'');s('sM',o.sM||'');s('sD',o.sD||'');s('pdY','');s('pdM','');s('pdD','');
    remissions=[{years:0,months:0}];renderRemissions();escapes=[];escOwner=null;k7PickShown=true;pickedReduction=null;
    if(o.ref){setRefMode('custom');s('refDate',o.ref);}else setRefMode('today');
    calculate();const t=id=>document.getElementById(id).textContent.trim();
    return {served:t('r-served'),rem:t('r-remaining'),left:t('progressDaysLeft'),copy:lastResultText};},o);

  // 1. Hiển thị gọn
  let pg=await open('2026-10-30T09:00:00+07:00');
  let r=await calc(pg,{arrest:'01/10/2026',sY:'1 năm'});
  ok(/^\d+ ngày$/.test(r.served)&&r.rem==='0 năm 11 tháng 1 ngày','Mới chấp hành chưa đủ 1 tháng: đã chấp hành ghi gọn "'+r.served+'"; còn lại vẫn đủ "'+r.rem+'"');
  r=await calc(pg,{arrest:'01/01/2026',sY:'1 năm',ref:'14/12/2026'});
  ok(r.rem==='17 ngày'&&r.left==='Còn 17 ngày'&&r.copy.includes('Thời hạn còn lại: 17 ngày'),'Còn 17 ngày: ghi "17 ngày" (kết quả, thanh tiến độ, nội dung sao chép)');
  r=await calc(pg,{arrest:'01/01/2020',sY:'2 năm'});
  ok(r.rem==='0 ngày'&&r.copy.includes('Thời hạn còn lại: 0 ngày'),'Đã hết án: thời hạn còn lại ghi "0 ngày"');
  const h=await pg.evaluate(()=>{openHistoryDetail(0);const t=document.getElementById('modalOverlay').textContent.replace(/\s+/g,' ');closeModal();return t;});
  ok(h.includes('0 ngày')&&!h.includes('0 năm 0 tháng 0 ngày'),'Xem lại trong lịch sử: cũng ghi gọn');
  await calc(pg,{name:'Gọn Ngày',arrest:'01/01/2020',sY:'2 năm'});
  const p=await pg.evaluate(()=>{closeModal();saveProfileFromHistory(0,'Gọn Ngày');const p=refreshProfiles().find(x=>x.name==='Gọn Ngày');return p&&p.remaining;});
  ok(p==='0 ngày','Hồ sơ đã lưu: thời hạn còn lại "0 ngày"');
  r=await calc(pg,{arrest:'09/03/1984',sY:'6 năm',sM:'6 tháng',sD:'20 ngày'});
  ok(r.served==='6 năm 6 tháng 20 ngày','Có năm, tháng: vẫn ghi đủ "6 năm 6 tháng 20 ngày"');
  // 2. Nghị quyết 03/2024/NQ-HĐTP ghi đầy đủ
  const nq=await pg.evaluate(()=>{const t=document.body.textContent;return {bad:(t.match(/Nghị quyết 03(?!\/2024\/NQ-HĐTP)/g)||[]).length,full:(t.match(/Nghị quyết 03\/2024\/NQ-HĐTP/g)||[]).length};});
  ok(nq.bad===0&&nq.full>=3,'Mọi chỗ ghi "Nghị quyết 03/2024/NQ-HĐTP" đầy đủ ('+nq.full+' chỗ, không còn chỗ ghi tắt)');

  // 3. Khoản 7 — ví dụ của anh Hải: giảm đợt 2/9/2025 (ngày xét thực tế 20/07/2025), tính đến 01/06/2026
  pg=await open('2026-06-01T09:00:00+07:00');
  await calc(pg,{arrest:'01/03/2022',sY:'6 năm'});
  const k7=async(date)=>pg.evaluate(d=>{
    if(!document.getElementById('rmConclusion'))openRemissionPage();
    const inpEv=(id,v)=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
    const chk=(id,v)=>{const el=document.getElementById(id);el.checked=v;el.dispatchEvent(new Event('change',{bubbles:true}));};
    inpEv('rmArrival','15/03/2022');chk('rmK7',true);inpEv('rmK7Date',d);
    return {c:document.getElementById('rmConclusion').textContent.replace(/\s+/g,' '),hint:document.getElementById('rmK7Hint').textContent.replace(/\s+/g,' ')};},date);
  let c=await k7('20/07/2025');
  ok(c.c.includes('Kỳ giảm gần nhất: 2/9/2025 (ngày xét 20/07/2025)')&&c.c.includes('Dự kiến kỳ giảm tiếp theo vào đợt 2/9/2026 (ngày xét 15/07/2026)'),
    'Giảm đợt 2/9/2025, ngày xét thực tế 20/07/2025 → được xét lại đợt 2/9/2026 (trước đây nhảy sang Tết 2027)');
  ok(c.hint.includes('Mỗi năm chỉ được xét giảm 01 lần nên đợt sớm nhất được xét tiếp là 2/9/2026 (ngày xét 15/07/2026)'),'  Gợi ý dưới Khoản 7 ghi rõ đợt sớm nhất');
  c=await k7('28/08/2025');
  ok(c.c.includes('Dự kiến kỳ giảm tiếp theo vào đợt 2/9/2026'),'Nhập ngày quyết định 28/08/2025: vẫn là đợt 2/9/2026');
  c=await k7('10/01/2026');
  ok(c.c.includes('Kỳ giảm gần nhất: Tết Nguyên Đán 2026')&&c.c.includes('Tết Nguyên Đán 2027 (ngày xét 15/12/2026)'),'Ngày xét 10/01/2026 thuộc đợt Tết 2026 → đợt sớm nhất Tết 2027');
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
