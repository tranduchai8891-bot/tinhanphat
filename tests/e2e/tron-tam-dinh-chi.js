// Kiểm tra luồng Trốn/tạm đình chỉ (giai đoạn 9)
const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const SP=require('os').tmpdir()+'/';
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
  const txt=id=>ev(i=>{const e=document.getElementById(i);return e?e.textContent.trim():null;},id);
  const vis=id=>ev(i=>{const e=document.getElementById(i);return !!e&&getComputedStyle(e).display!=='none';},id);
  const warn=()=>ev(()=>{const o=[...document.querySelectorAll('.modal-overlay')].find(x=>(x.style.display==='flex'||x.classList.contains('show'))&&/warn|Warn/.test(x.id));return o?o.textContent.replace(/\s+/g,' ').trim():'';});
  await pg.goto(file);await pg.waitForTimeout(1300);
  const form=()=>ev(()=>{closeModal();const s=(i,v)=>document.getElementById(i).value=v;s('prisonerName','Lê Văn T');s('arrestDateText','09/03/1984');
    s('sY','6 năm');s('sM','6 tháng');s('sD','20 ngày');s('pdY','');s('pdM','');s('pdD','');remissions=[{years:0,months:0}];k7PickShown=true;renderRemissions();setRefMode('today');});
  await form();

  // 1. Nút nằm ngay dưới phần "Tính đến ngày"
  const pos=await ev(()=>{const sec=document.getElementById('btnRefToday').closest('.form-section');const btn=document.getElementById('btnEscape');
    return {inSec:sec.contains(btn),after:!!(document.getElementById('refDateField').compareDocumentPosition(btn)&Node.DOCUMENT_POSITION_FOLLOWING),text:btn.textContent.trim(),sum:document.getElementById('escSummary').textContent};});
  ok(pos.inSec&&pos.after&&pos.text==='Trốn/tạm đình chỉ'&&pos.sum==='','Nút "Trốn/tạm đình chỉ" ở cuối phần Tính đến ngày, chưa có dữ liệu');

  // 2. Popup: ô Từ ngày / Đến ngày dùng đúng kiểu ô Ngày bắt
  await pg.click('#btnEscape');
  ok(await vis('escOverlay'),'Bấm nút: mở popup');
  const pop=await ev(()=>({title:document.querySelector('#escOverlay .result-header').textContent,
    labels:[...document.querySelectorAll('#escRows label')].map(l=>l.textContent),
    cls:[...document.querySelectorAll('#escRows input')].map(i=>i.className+'|'+((i.parentNode.querySelector('.esc-ph')||{}).textContent||i.placeholder)+'|'+i.inputMode+'|'+i.maxLength),
    ref:(()=>{const a=getComputedStyle(document.getElementById('arrestDateText')),b=getComputedStyle(document.getElementById('escF0'));
      return ['fontSize','height','borderTopWidth','borderTopColor','borderRadius','fontWeight'].map(k=>a[k]===b[k]?'=':k+':'+a[k]+'≠'+b[k]).join(',');})()}));
  ok(pop.title==='Thời gian trốn/tạm đình chỉ'&&pop.labels.join('|')==='Từ ngày|Đến ngày','Popup "Thời gian trốn/tạm đình chỉ" có ô Từ ngày, Đến ngày');
  ok(pop.cls.every(c=>c==='date-single-input|ngày/tháng/năm|numeric|10')&&!pop.ref.replace(/=|,/g,''),'Ô nhập dùng cùng CSS với ô Ngày bắt ('+pop.ref+')');
  // Gõ bằng bàn phím như người dùng — ví dụ anh Hải gửi (bản đã sửa)
  await pg.click('#escF0');await pg.keyboard.type('13111985');
  await pg.click('#escT0');await pg.keyboard.type('29031986');
  ok((await ev(()=>document.getElementById('escF0').value))==='13/11/1985'&&(await txt('escDur0'))==='4 tháng 16 ngày','Gõ 13111985 → 13/11/1985; hiện ngay độ dài lần 1: 4 tháng 16 ngày');
  const phv=()=>ev(()=>['escF0','escT0'].map(id=>getComputedStyle(document.getElementById(id).parentNode.querySelector('.esc-ph')).display).join(','));
  ok((await phv())==='none,none','Đã gõ ngày: chữ gợi ý "ngày/tháng/năm" ẩn đi');
  await pg.click('#escF0 ~ .input-clear-btn');
  ok((await phv())==='block,none','Bấm ✕ xóa ô: chữ gợi ý hiện lại');
  await pg.keyboard.type('13111985');
  await pg.click('#escAddBtn');await pg.keyboard.type('02041986');await pg.click('#escT1');await pg.keyboard.type('11092026');
  ok((await txt('escDur1'))==='40 năm 5 tháng 9 ngày','Lần 2: 40 năm 5 tháng 9 ngày');
  ok((await txt('escTotal'))==='Tổng thời gian trốn/tạm đình chỉ: 40 năm 9 tháng 25 ngày','Tổng: 40 năm 9 tháng 25 ngày');

  // 3. Kiểm tra dữ liệu sai
  const tryRow=async(i,f,t)=>{await ev(([i,f,t])=>{escDraft[i]={from:f,to:t};renderEscRows();saveEscape();},[i,f,t]);return await txt('escMsg');};
  const keep=await ev(()=>JSON.stringify(escDraft));
  ok((await tryRow(0,'09/03/1985','04/08/1984')).includes('"Đến ngày" phải sau'),'Đến ngày trước Từ ngày: báo lỗi');
  ok((await tryRow(0,'04/08/1983','09/03/1984')).includes('trước ngày bắt (09/03/1984)'),'Bắt đầu trước ngày bắt: báo lỗi');
  ok((await tryRow(0,'01/05/1986','01/06/1986')).includes('trùng thời gian'),'Hai lần trùng nhau: báo lỗi');
  ok((await tryRow(0,'31/02/1985','01/03/1985')).includes('nhập đủ'),'Ngày không có thật (31/02): báo lỗi');
  ok(await vis('escOverlay'),'  (lỗi thì popup vẫn mở, chưa lưu)');
  await ev(k=>{escDraft=JSON.parse(k);renderEscRows();},keep);
  await pg.click('#escOverlay .modal-btn.close');
  ok(!(await vis('escOverlay'))&&(await txt('escSummary'))==='Đã nhập 2 lần · tổng 40 năm 9 tháng 25 ngày'&&await ev(()=>document.getElementById('btnEscape').classList.contains('has')),
     'Lưu: đóng popup, dưới nút hiện "Đã nhập 2 lần · tổng 40 năm 9 tháng 25 ngày"');
  // Hủy không làm mất dữ liệu đã lưu
  const foot=await ev(()=>[...document.querySelectorAll('#escOverlay .modal-actions button')].map(b=>b.textContent).join('|')+'#'+document.querySelectorAll('#escOverlay .modal-scroll .link-clear').length);
  ok(foot==='Xóa hết|Xong#0','Chân popup: nút Xóa hết và Xong (không còn Hủy, không trùng Xóa hết ở đầu)');
  await pg.click('#btnEscape');await pg.click('#escOverlay .modal-btn.ghost');
  ok((await ev(()=>escDraft.filter(r=>r.from||r.to).length))===0&&(await ev(()=>escapes.length))===2,'Bấm Xóa hết: xóa các dòng trong popup, chưa áp dụng khi chưa bấm Xong');
  await pg.mouse.click(5,5);
  ok(!(await vis('escOverlay'))&&(await ev(()=>escapes.length))===2,'Chạm ra ngoài popup: đóng, giữ nguyên 2 lần đã lưu');

  // 4. Tính án: ví dụ của anh Hải (tính đến 30/10/2026)
  await pg.click('.btn-calc');await pg.waitForTimeout(400);
  const R1=await ev(()=>({served:document.getElementById('r-served').textContent,remaining:document.getElementById('r-remaining').textContent,
    release:document.getElementById('r-release').textContent,m:['m-25','m-33','m-50'].map(i=>document.getElementById(i).textContent).join(' '),
    card:(document.getElementById('r-esc-card')||{}).textContent||'',tl:document.getElementById('timeline').textContent,copy:lastResultText,
    elig:document.getElementById('eligibleText').textContent}));
  ok(R1.served==='1 năm 9 tháng 26 ngày','Thời gian đã chấp hành: '+R1.served);
  ok(R1.remaining==='4 năm 8 tháng 24 ngày','Thời hạn còn lại: '+R1.remaining);
  ok(R1.release==='24/07/2031','Ngày hết án = 29/09/1990 + 40 năm 9 tháng 25 ngày = '+R1.release);
  ok(R1.m==='29/10/1985 11/03/2027 14/04/2028','Mốc 1/4, 1/3, 1/2 dời theo diễn biến: '+R1.m);
  ok(R1.card==='Thời gian trốn/tạm đình chỉ40 năm 9 tháng 25 ngày · 2 lần','Popup kết quả có thẻ "Thời gian trốn/tạm đình chỉ": '+R1.card);
  ok(R1.tl.includes('Trốn/tạm đình chỉ lần 2: 02/04/1986 – 11/09/2026+ 40 năm 5 tháng 9 ngày'),'Dòng thời gian liệt kê từng lần');
  ok(R1.copy.includes('Thời gian trốn/tạm đình chỉ: 40 năm 9 tháng 25 ngày (2 lần)\n  Lần 1: 13/11/1985 - 29/03/1986 (4 tháng 16 ngày)')&&R1.copy.includes('Ngày hết án dự kiến: 24/07/2031'),'Văn bản Sao chép có các lần trốn/tạm đình chỉ');
  ok(R1.elig.includes('11/03/2027'),'Dòng đợt xét giảm dùng mốc 1/3 đã dời: '+R1.elig.slice(0,60));
  // Đổi cách tính QLPN mới
  await ev(()=>{CALC_MODE='thuc';recomputeByMode();});
  ok((await txt('r-release'))==='24/07/2031'&&(await txt('r-served'))==='1 năm 9 tháng 26 ngày','Đổi sang QLPN mới: vẫn giữ các lần trốn/tạm đình chỉ');
  await ev(()=>{CALC_MODE='qlpn';recomputeByMode();});

  // 5. Trang tra cứu giảm án: mốc 1/3 và 1/4 đã dời
  await ev(()=>openRemissionPage());
  ok((await txt('rmMilestoneVal'))==='11/03/2027','Trang giảm án: mốc 1/3 = 11/03/2027');
  await ev(()=>{const c=document.getElementById('rmPriority');c.checked=true;togglePriority();});
  ok((await txt('rmMilestoneVal'))==='29/10/1985'&&(await txt('rmConclusion')).includes('29/10/1985'),'Người chưa thành niên: mốc 1/4 = 29/10/1985 (đạt trước lần trốn 1, không dời)');
  await ev(()=>{const c=document.getElementById('rmPriority');c.checked=false;togglePriority();closeRemissionPage();});

  // 6. Lịch sử
  const H=await ev(()=>{const h=loadHistory()[0];return {escape:h.escape,prof:(h._prof.escapes||[]).length,raw:(h._raw.escapes||[]).length,release:h.release,served:h.served};});
  ok(H.escape==='40 năm 9 tháng 25 ngày'&&H.prof===2&&H.raw===2&&H.release==='24/07/2031','Lịch sử lưu đủ 2 lần trốn/tạm đình chỉ');
  await ev(()=>{closeModal();openHistoryDetail(0);});
  ok((await txt('r-release'))==='24/07/2031'&&(await txt('r-remaining'))==='4 năm 8 tháng 24 ngày'&&(await txt('r-esc-card')||'').includes('2 lần'),'Xem lại lịch sử: đúng kết quả có trốn/tạm đình chỉ');

  // 7. Hồ sơ: lưu, chi tiết, cập nhật theo ngày hiện tại
  await ev(()=>{closeModal();saveProfileFromHistory(0);closeSecurity&&closeSecurity();closeQuarterWarn&&closeQuarterWarn();});
  const P=await ev(()=>{const p=loadProfiles()[0];return {escape:p.escape,n:(p.data.escapes||[]).length,release:p.release,served:p.served,m33:p.m33};});
  ok(P.escape==='40 năm 9 tháng 25 ngày'&&P.n===2&&P.release==='24/07/2031'&&P.served==='1 năm 9 tháng 26 ngày'&&P.m33==='11/03/2027','Lưu hồ sơ: có 2 lần trốn/tạm đình chỉ, số liệu đúng');
  await ev(()=>openProfDetail(0));
  const pd=await ev(()=>document.getElementById('profDetailBody').textContent);
  ok(pd.includes('Thời gian trốn/tạm đình chỉ')&&pd.includes('Lần 2')&&pd.includes('02/04/1986 – 11/09/2026 (40 năm 5 tháng 9 ngày)')&&pd.includes('Tổng40 năm 9 tháng 25 ngày')&&!pd.includes('không tính chấp hành'),'Chi tiết hồ sơ: liệt kê từng lần và tổng');
  await ev(()=>closeProfDetail());
  // Ngày hiện tại sang 30/11/2026: hồ sơ tự cập nhật (đã chấp hành + 1 tháng, còn lại - 1 tháng)
  await pg.clock.setFixedTime(new Date('2026-11-30T09:00:00+07:00'));
  const live=await ev(()=>{const p=refreshProfiles()[0];return p.served+' | '+p.remaining+' | '+p.release;});
  ok(live==='1 năm 10 tháng 26 ngày | 4 năm 7 tháng 24 ngày | 24/07/2031','Hồ sơ cập nhật theo ngày hiện tại (30/11/2026): '+live);
  await pg.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));

  // 8. Mở lại hồ sơ vào form; hồ sơ khác không có trốn -> xóa sạch
  await ev(()=>{escapes=[];renderEscSummary();loadProfile(0);closeQuarterWarn&&closeQuarterWarn();});
  ok((await ev(()=>escapes.length))===2&&(await txt('escSummary')).includes('2 lần'),'Mở lại hồ sơ: nạp lại 2 lần trốn/tạm đình chỉ vào form');
  await ev(()=>{closeModal();const s=(i,v)=>document.getElementById(i).value=v;s('prisonerName','Phạm Văn K');s('arrestDateText','01/03/2020');s('sY','3 năm');s('sM','');s('sD','');calculate();});
  const cf=await ev(()=>({show:document.getElementById('confirmOverlay').style.display==='flex',t:document.getElementById('cfmTitle').textContent,res:document.getElementById('modalOverlay').classList.contains('show')}));
  ok(cf.show&&!cf.res&&cf.t.includes('của phạm nhân Lê Văn T (bắt 09/03/1984)'),'Tính cho phạm nhân khác khi còn dữ liệu trốn của người trước: hỏi lại, chưa tính ('+cf.t.slice(0,70)+'…)');
  await ev(()=>{closeConfirm();openEscape();clearEscAll();saveEscape();calculate();});
  ok(await ev(()=>document.getElementById('modalOverlay').classList.contains('show')&&!document.getElementById('r-esc-card')),'  Xóa dữ liệu trốn rồi tính: ra kết quả không có trốn');
  await ev(()=>{closeModal();saveProfileFromHistory(0);closeQuarterWarn&&closeQuarterWarn();});
  await ev(()=>{const i=loadProfiles().findIndex(p=>p.name==='Lê Văn T');loadProfile(i);closeQuarterWarn&&closeQuarterWarn();});
  ok((await ev(()=>escapes.length))===2,'  Mở lại hồ sơ Lê Văn T: có 2 lần');
  await ev(()=>{const k=loadProfiles().findIndex(p=>p.name==='Phạm Văn K');loadProfile(k);closeQuarterWarn&&closeQuarterWarn();});
  ok((await ev(()=>escapes.length))===0&&(await txt('escSummary'))==='','Mở hồ sơ Phạm Văn K: không còn dữ liệu trốn của người trước');
  // Đồng ý áp dụng cho phạm nhân khác (VD sửa lại tên)
  await ev(()=>{escapes=[{from:'01/06/2021',to:'01/09/2021'}];escOwner='Người cũ|01/03/2020';renderEscSummary();calculate();});
  await ev(()=>acceptConfirm());
  ok((await txt('r-release'))==='01/06/2023'&&(await ev(()=>escOwner))==='Phạm Văn K|01/03/2020','Bấm "Áp dụng": tính có trốn, dữ liệu chuyển sang phạm nhân đang tính');
  await ev(()=>{closeModal();escapes=[];escOwner=null;renderEscSummary();});
  // 9. Trốn bắt đầu sau ngày hết án -> báo lỗi, không tính
  await ev(()=>{escapes=[{from:'01/06/2024',to:'01/07/2024'}];renderEscSummary();closeModal();const s=(i,v)=>document.getElementById(i).value=v;
    s('prisonerName','Đỗ Văn X');s('arrestDateText','01/01/2020');s('sY','3 năm');s('sM','');s('sD','');calculate();});
  const w=await ev(()=>document.body.innerText);
  ok(!(await ev(()=>document.getElementById('modalOverlay').classList.contains('show')))&&w.includes('sau ngày hết án 01/01/2023'),'Lần trốn bắt đầu sau ngày hết án: báo lỗi, không ra kết quả');
  await ev(()=>{closeQuarterWarn&&closeQuarterWarn();});
  // Lần trốn sau mốc 1/3: mốc 1/4, 1/3 giữ nguyên; mốc 1/2 và ngày hết án dời
  await ev(()=>{escapes=[{from:'01/06/2021',to:'01/09/2021'}];renderEscSummary();calculate();});
  ok(['m-25','m-33','m-50','r-release'].length&&(await ev(()=>['m-25','m-33','m-50','r-release'].map(i=>document.getElementById(i).textContent).join(' ')))==='01/10/2020 01/01/2021 01/10/2021 01/04/2023',
     'Trốn 01/06/2021-01/09/2021 (sau mốc 1/4, 1/3): chỉ mốc 1/2 và ngày hết án dời 3 tháng');
  // Xóa hết -> trở lại như chưa nhập
  await ev(()=>{closeModal();openEscape();clearEscAll();saveEscape();calculate();});
  ok((await txt('escSummary'))===''&&!(await ev(()=>!!document.getElementById('r-esc-card')))&&(await txt('r-release'))==='01/01/2023','Xóa hết rồi Lưu: kết quả trở lại như không có trốn');

  // 10. Excel lịch sử + hồ sơ có cột Trốn/tạm đình chỉ
  await ev(()=>closeModal());
  const [d1]=await Promise.all([pg.waitForEvent('download'),ev(()=>exportHistoryToExcel())]);
  const x1=SP+'esc-hist.xlsx';await d1.saveAs(x1);const s1=fs.readFileSync(x1).toString('utf8');
  ok(s1.includes('Thời gian trốn/tạm đình chỉ')&&s1.includes('40 năm 9 tháng 25 ngày'),'Excel Lịch sử: có cột Thời gian trốn/tạm đình chỉ');
  const [d2]=await Promise.all([pg.waitForEvent('download'),ev(()=>exportProfilesToExcel('full'))]);
  const x2=SP+'esc-prof.xlsx';await d2.saveAs(x2);const s2=fs.readFileSync(x2).toString('utf8');
  ok(s2.includes('Trốn/tạm đình chỉ')&&s2.includes('Lần 1: 13/11/1985 - 29/03/1986')&&s2.includes('Tổng: 40 năm 9 tháng 25 ngày'),'Excel tổng hợp hồ sơ: liệt kê các lần trốn/tạm đình chỉ');

  // 11. File dữ liệu .json (có mật khẩu) chuyển sang máy khác vẫn giữ đủ
  await ev(()=>exportProfilesFile());
  const [d3]=await Promise.all([pg.waitForEvent('download'),ev(()=>{document.getElementById('pwA').value='matkhau-2026';document.getElementById('pwB').value='matkhau-2026';return confirmPassword();})]);
  const j=SP+'esc-pack.json';await d3.saveAs(j);
  const ctx2=await b.newContext({timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'});const pg2=await ctx2.newPage();await pg2.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));
  await pg2.route(/^https?:\/\//,r=>r.abort());await pg2.goto(file);await pg2.waitForTimeout(1300);
  await pg2.setInputFiles('#profImportInput',j);await pg2.waitForTimeout(300);
  await pg2.evaluate(()=>{document.getElementById('pwA').value='matkhau-2026';return confirmPassword();});
  const im=await pg2.evaluate(()=>{const p=loadProfiles().find(p=>p.name==='Lê Văn T');return p?(p.data.escapes.length+' | '+p.escape+' | '+p.release+' | '+p.remaining):'none';});
  ok(im==='2 | 40 năm 9 tháng 25 ngày | 24/07/2031 | 4 năm 8 tháng 24 ngày','Nhập file trên máy khác: giữ đủ 2 lần và số liệu ('+im+')');
  // File bị sửa: dữ liệu trốn sai kiểu bị lọc bỏ
  const bad=await pg2.evaluate(()=>{const p=sanitizeProfile({name:'A',arrestDate:'01/01/2020',sentence:'3 năm',data:{escapes:[{from:'<img src=x>',to:'01/01/2021'},{from:'01/06/2021',to:'01/09/2021',x:1},'abc',null]}});return JSON.stringify(p.data.escapes);});
  ok(bad==='[{"from":"01/06/2021","to":"01/09/2021"}]','File bị sửa: chỉ giữ lần trốn đúng định dạng');
  await ctx2.close();

  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
