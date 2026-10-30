// Kiểm tra Xếp loại quý cả đội / Dòng thời gian / Phiếu in A4
const path=require('path');
const {chromium}=require('playwright');
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
  const vis=id=>ev(i=>{const e=document.getElementById(i);return !!e&&getComputedStyle(e).display!=='none';},id);
  await pg.goto(file);await pg.waitForTimeout(1300);
  await ev(()=>{window.showWarn=m=>{window.__warn=m;};window.print=()=>{window.__printHTML=document.getElementById('printArea').innerHTML;};});

  // 0. liveProfileCompute cho đúng số liệu như liveProfileValues (hồ sơ ngẫu nhiên, có cả trốn/tạm đình chỉ)
  const eq=await ev(()=>{
    let seed=777;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)%100003)/100003;};const ri=n=>Math.floor(rnd()*n);
    const D=(y,m,d)=>new Date(y,m,d);let same=0,n=0,bad=[];
    for(let k=0;k<600;k++){
      const a=D(2010+ri(16),ri(12),1+ri(28)),t=D(2020+ri(10),ri(12),1+ri(28));
      const sm=1+ri(300),sd=ri(30),pm=ri(20),pd=ri(60),rm=ri(4)?0:ri(30);
      const p={name:'x',arrestDate:fmtDate(a),sentence:fmtDays(sm,sd),preDet:fmtDays(pm,pd),remission:fmtDays(rm,0),release:'x',calcMode:ri(2)?'qlpn':'thuc'};
      if(ri(3)===0){const f=D(a.getFullYear(),a.getMonth()+1+ri(30),1+ri(27)),e=D(f.getFullYear(),f.getMonth()+1+ri(40),f.getDate());p.data={escapes:[{from:fmtDate(f),to:fmtDate(e)}]};}
      const v=liveProfileValues(p,t), r=liveProfileCompute(p,t);n++;
      if(!v&&!r){same++;continue;}
      const w=r&&{release:fmtDate(r.releaseDate),served:fmtDaysFull(r.servedDiff),remaining:fmtDaysFull(r.remainingDiff),m25:fmtDate(r.m25),m33:fmtDate(r.m33),m50:fmtDate(r.m50)};
      if(v&&w&&['release','served','remaining','m25','m33','m50'].every(k=>v[k]===w[k]))same++;else if(bad.length<2)bad.push(JSON.stringify([v,w]));
    }
    return {n,same,bad};
  });
  ok(eq.same===eq.n,'Số liệu dùng cho dòng thời gian/phiếu in trùng số liệu hồ sơ: '+eq.same+'/'+eq.n);
  if(eq.bad.length)console.log(eq.bad);

  // 1. Tạo hồ sơ
  await ev(()=>{
    const mk=(name,arrest,y,arrival,o)=>{closeModal();const s=(i,v)=>document.getElementById(i).value=v;s('prisonerName',name);s('arrestDateText',arrest);s('sY',y+' năm');s('sM',o&&o.m?o.m+' tháng':'');s('sD',o&&o.d?o.d+' ngày':'');
      s('pdY','');s('pdM','');s('pdD','');remissions=[{years:0,months:0}];k7PickShown=true;escapes=o&&o.esc||[];escOwner=null;renderRemissions();setRefMode('today');calculate();openRemissionPage();
      const inp=(id,v)=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
      if(arrival)inp('rmArrival',arrival);
      if(o&&o.k9){const el=document.getElementById('rmK9');el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));pickK9(document.querySelector('.k9-opt[data-v="9"]'));}
      closeRemissionPage();saveProfileFromHistory(shownHistoryIdx);closeSecurity&&closeSecurity();closeModal();};
    mk('Bùi Văn A','10/03/2022',6,'20/03/2022');
    mk('Cao Văn B','01/02/2025',3,'01/06/2026',{k9:true});
    mk('Đinh Văn C','05/05/2024',2,'');
    mk('Lương Văn D','01/09/2026',1,'20/09/2026');
    mk('Ma Văn E','09/03/1984',6,'',{m:6,d:20,esc:[{from:'13/11/1985',to:'29/03/1986'},{from:'02/04/1986',to:'11/09/2026'}]});
  });
  ok((await ev(()=>loadProfiles().length))===5,'Tạo 5 hồ sơ thử');

  // 2. Trang Xếp loại quý
  await ev(()=>goNav('team'));
  await pg.click('.tp-link');
  const G=await ev(()=>({q:document.querySelector('.gp-q-name').textContent,sub:document.querySelector('.gp-q-sub').textContent,
    rows:[...document.querySelectorAll('.gp-row')].map(r=>r.querySelector('.gp-name').textContent+' | '+r.querySelector('.gp-note').textContent+' | '+((r.querySelector('.gp-opt.on')||{}).textContent||'-')),
    nav:document.querySelector('#bottomNav .bn-item.on').dataset.k}));
  ok(await vis('gradeOverlay')&&G.q==='Quý III/2026'&&G.sub==='01/06/2026 – 31/08/2026','Mở Xếp loại từ Tổng quan: mặc định quý gần nhất đã kết thúc (Quý III/2026, 01/06 – 31/08/2026)');
  const row=n=>G.rows.find(r=>r.startsWith(n))||'';
  ok(row('Bùi Văn A').endsWith('Mặc định Khá | Khá'),'Hồ sơ bình thường: mặc định Khá ('+row('Bùi Văn A')+')');
  ok(row('Cao Văn B').includes('Tự xếp Kém theo Điều 26 | Kém'),'Phạm tội mới (Khoản 9): tự xếp Kém theo Điều 26 ('+row('Cao Văn B')+')');
  ok(row('Đinh Văn C').includes('Chưa có ngày đến trại')&&row('Lương Văn D').includes('Chưa đủ thời gian xếp loại quý này'),'Chưa có ngày đến trại / đến trại sau quý: không cho chọn');
  // Chọn Kém cho Bùi Văn A -> lưu ngay vào hồ sơ, kết luận xét giảm đổi theo
  const before=await ev(()=>{const p=loadProfiles().find(p=>p.name==='Bùi Văn A');const c=profileRemissionCtx(p,profileToday());return evaluateRemission(c.e,c.x).html.replace(/<[^>]+>/g,'').slice(0,120);});
  await pg.click('.gp-row:has(.gp-name:text-is("Bùi Văn A")) .gp-opt.Kem');
  const after=await ev(()=>{const p=loadProfiles().find(p=>p.name==='Bùi Văn A');const c=profileRemissionCtx(p,profileToday());
    return {g:p.data.grades['2026-III'],html:evaluateRemission(c.e,c.x).html.replace(/<[^>]+>/g,'').slice(0,120),
      on:document.querySelector('.gp-row:has(.gp-name) .gp-opt.on')&&[...document.querySelectorAll('.gp-row')].find(r=>r.querySelector('.gp-name').textContent==='Bùi Văn A').querySelector('.gp-opt.on').textContent};});
  ok(after.g==='Kem'&&after.on==='Kém','Chọn Kém: lưu ngay vào hồ sơ (Quý III/2026 = Kém)');
  ok(before!==after.html,'  Kết luận xét giảm của hồ sơ đổi theo');
  // Mở lại hồ sơ -> trang Tra cứu giảm án thấy quý Kém
  await ev(()=>{closeGrades();const i=loadProfiles().findIndex(p=>p.name==='Bùi Văn A');loadProfile(i);k7PickShown=true;calculate();openRemissionPage();});
  const cell=await ev(()=>{const c=document.querySelector('#rmQGrid .qg-cell[data-k="2026-III"]');return c?c.textContent+'|'+c.className:'none';});
  ok(cell.includes('Kém')||cell.includes('qg-kem'),'Mở lại hồ sơ: bảng xếp loại trên trang giảm án có Quý III/2026 Kém ('+cell+')');
  await ev(()=>{closeRemissionPage();closeModal();});
  // Chuyển quý
  await ev(()=>openGrades());
  await pg.click('.gp-arrow[aria-label="Quý trước"]');
  ok((await ev(()=>document.querySelector('.gp-q-name').textContent))==='Quý II/2026','Nút quý trước: Quý II/2026');
  ok(await ev(()=>!document.querySelector('.gp-arrow[aria-label="Quý sau"]').disabled),'  (có thể quay lại quý sau)');
  await pg.click('.gp-arrow[aria-label="Quý sau"]');
  ok(await ev(()=>document.querySelector('.gp-arrow[aria-label="Quý sau"]').disabled),'Quý III/2026 là quý mới nhất: không đi tiếp được');
  await ev(()=>closeGrades());

  // 3. Dòng thời gian theo thứ tự ngày (popup kết quả)
  await ev(()=>{const i=loadProfiles().findIndex(p=>p.name==='Ma Văn E');loadProfile(i);k7PickShown=true;calculate();});
  const TL=await ev(()=>[...document.querySelectorAll('#timeline .tl-row')].map(r=>r.querySelector('.lbl').textContent+' = '+r.querySelector('.val').textContent));
  const dates=TL.map(t=>{const m=t.match(/(\d\d)\/(\d\d)\/(\d{4})/);return m?+new Date(+m[3],m[2]-1,+m[1]):null;}).filter(x=>x!==null);
  ok(TL[0].startsWith('Ngày bắt giam')&&TL[TL.length-1].startsWith('Ngày hết án dự kiến = 24/07/2031'),'Dòng thời gian: bắt đầu từ ngày bắt, kết thúc ở ngày hết án 24/07/2031');
  ok(dates.every((d,i)=>i===0||d>=dates[i-1]),'  Các mốc xếp đúng thứ tự ngày');
  ok(TL.some(t=>t==='Đạt mốc 1/4 mức án = 29/10/1985')&&TL.some(t=>t==='Đạt mốc 1/3 mức án = 11/03/2027')&&TL.some(t=>t.startsWith('Tính đến ngày 30/10/2026 = Đã chấp hành 1 năm 9 tháng 26 ngày')),
     '  Có mốc 1/4, 1/3 và ngày tính đến (đã chấp hành 1 năm 9 tháng 26 ngày)');
  console.log('   '+TL.join('\n   '));
  // 4. In phiếu từ popup kết quả
  await pg.click('.res-print');
  await ev(()=>{document.getElementById('pi_unit').value='Trại giam X';confirmPrintInfo();});await pg.waitForTimeout(150);
  const PH=await ev(()=>({html:(window.__printHTML||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' '),page:document.getElementById('printPageStyle').textContent}));
  ok(PH.page.includes('portrait')&&PH.html.includes('PHIẾU TÍNH THỜI HẠN CHẤP HÀNH ÁN PHẠT TÙ')&&PH.html.includes('Ma Văn E')&&PH.html.includes('Thời gian đã chấp hành 1 năm 9 tháng 26 ngày')
     &&PH.html.includes('Thời hạn còn lại 4 năm 8 tháng 24 ngày')&&PH.html.includes('Ngày hết án dự kiến 24/07/2031')&&PH.html.includes('40 năm 9 tháng 25 ngày (2 lần)'),'Phiếu in (A4 dọc): đúng số liệu của kết quả đang xem');
  // 5. Chi tiết hồ sơ: dòng thời gian + in phiếu
  await ev(()=>{closeModal();openProfDetail(loadProfiles().findIndex(p=>p.name==='Ma Văn E'));});
  const pd=await ev(()=>document.getElementById('profDetailBody').textContent);
  ok(pd.includes('Dòng thời gian')&&pd.includes('Ngày hết án dự kiến24/07/2031'),'Chi tiết hồ sơ: có Dòng thời gian, hết án 24/07/2031');
  await ev(()=>{window.__printHTML='';printProfilePhieu();confirmPrintInfo();});await pg.waitForTimeout(150);
  ok((await ev(()=>window.__printHTML||'')).includes('Ma Văn E'),'Chi tiết hồ sơ: bấm In phiếu');
  const btns=await ev(()=>[...document.querySelectorAll('#profDetailOverlay .modal-actions button')].map(b=>b.textContent+':'+Math.round(b.getBoundingClientRect().width)));
  ok(btns.length===3,'  Nút chân chi tiết hồ sơ: '+btns.join(', '));
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
