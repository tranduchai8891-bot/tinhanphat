// Kiểm tra Tổng quan đội / Đề nghị xét giảm theo đợt / In / Nhắc sao lưu / Thanh điều hướng
const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const SP=require('os').tmpdir()+'/';
const file='file://'+path.resolve(process.argv[2]);
const N=+(process.argv[3]||30);
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN',acceptDownloads:true});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
  const ev=(f,...a)=>pg.evaluate(f,...a);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  const vis=id=>ev(i=>{const e=document.getElementById(i);return !!e&&getComputedStyle(e).display!=='none';},id);
  await pg.goto(file);await pg.waitForTimeout(1300);
  await ev(()=>{window.print=()=>{window.__printed=(window.__printed||0)+1;window.__printHTML=document.getElementById('printArea').innerHTML;window.__printCls=document.documentElement.className;};});

  // 0. Chưa có hồ sơ
  await ev(()=>goNav('team'));
  ok(await vis('teamOverlay')&&(await ev(()=>document.getElementById('teamBody').textContent)).includes('Chưa có hồ sơ'),'Tổng quan khi chưa có hồ sơ: báo trống');
  await ev(()=>closeTeam());

  // 1. Tạo nhiều hồ sơ ngẫu nhiên, đủ các trường hợp (đến trại, tiền án, chưa thành niên, Khoản 8, 9, xếp loại, kỳ giảm, trốn)
  const made=await ev((N)=>{
    let seed=4242;const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)%100003)/100003;};const ri=n=>Math.floor(rnd()*n);
    const fmt=d=>pad2(d.getDate())+'/'+pad2(d.getMonth()+1)+'/'+d.getFullYear();
    const names=['An','Bình','Cường','Dũng','Đạt','Giang','Hải','Hùng','Khoa','Lâm','Minh','Nam','Phong','Quân','Sơn','Tâm','Thắng','Tuấn','Việt','Xuân'];
    window.showWarn=()=>{};
    let n=0;
    for(let k=0;k<N;k++){
      closeModal();
      const s=(i,v)=>document.getElementById(i).value=v;
      const arr=new Date(2016+ri(10),ri(12),1+ri(28));
      s('prisonerName','PN '+names[k%names.length]+' '+k);s('arrestDateText',fmt(arr));
      s('sY',String(1+ri(12))+' năm');s('sM',ri(2)?String(ri(12))+' tháng':'');s('sD',ri(3)?'':String(ri(30))+' ngày');
      s('pdY','');s('pdM',ri(3)?'':String(ri(8))+' tháng');s('pdD',ri(3)?'':String(ri(30))+' ngày');
      remissions=ri(3)===0?[{years:0,months:3+ri(9)},...(ri(2)?[{years:0,months:3+ri(6)}]:[])]:[{years:0,months:0}];
      k7PickShown=true;pickedReduction=null;
      escapes=ri(6)===0?[{from:fmt(new Date(arr.getFullYear(),arr.getMonth()+3+ri(12),1+ri(27))),to:''}]:[];
      if(escapes.length){const f=parseStrictDateText(escapes[0].from);escapes[0].to=fmt(new Date(f.getFullYear(),f.getMonth()+1+ri(10),f.getDate()));escOwner=null;}
      renderRemissions();setRefMode('today');calculate();
      if(!document.getElementById('modalOverlay').classList.contains('show'))continue;
      openRemissionPage();
      const inp=(id,v)=>{const el=document.getElementById(id);if(!el)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
      const chk=(id)=>{const el=document.getElementById(id);if(!el)return;el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));};
      if(ri(8))inp('rmArrival',fmt(new Date(arr.getFullYear(),arr.getMonth(),arr.getDate()+ri(120))));
      if(ri(5)===0)chk('rmPriority');
      if(ri(4)===0)inp('rmPenaltyCount',String(1+ri(2)));
      if(ri(6)===0){chk('rmK8');pickK8(document.querySelector('.k8-opt[data-v="'+(ri(2)?4:5)+'"]'));
        const dec=new Date(arr.getFullYear()+1+ri(3),ri(12),1+ri(27));inp('rmK8DecDate',fmt(dec));
        if(ri(3))inp('rmK8Date',fmt(new Date(dec.getFullYear(),dec.getMonth()+3+ri(9),1+ri(27))));}
      if(ri(7)===0){chk('rmK9');pickK9(document.querySelector('.k9-opt[data-v="'+(ri(2)?9:10)+'"]'));}
      if(ri(3)===0){[...document.querySelectorAll('#rmQGrid .qg-cell')].forEach(c=>{if(ri(5)===0){openQPick(c.dataset.k,'x');setQGrade(['Tot','TB','Kem'][ri(3)]);}});}
      closeRemissionPage();
      saveProfileFromHistory(shownHistoryIdx);
      closeSecurity&&closeSecurity();
      n++;
    }
    closeModal();
    return n;
  },N);
  ok(made>=N-2,'Tạo '+made+' hồ sơ thử');

  // 2. Kết quả xét của từng hồ sơ = đúng kết luận trên trang Tra cứu giảm án khi mở lại hồ sơ đó
  const cons=await ev(()=>{
    window.showWarn=()=>{};
    const ps=loadProfiles();let same=0,diff=[];
    ps.forEach((p,i)=>{
      loadProfile(i);k7PickShown=true;setRefMode('today');calculate();
      if(!document.getElementById('modalOverlay').classList.contains('show')){diff.push(p.name+': không tính được');return;}
      openRemissionPage();
      const page=document.getElementById('rmConclusion').innerHTML;
      const c=profileRemissionCtx(loadProfiles()[i],getRefDate());
      const mine=c?evaluateRemission(c.e,c.x).html:'(null)';
      if(page===mine)same++;else diff.push(p.name+'\n  trang: '+page.replace(/<[^>]+>/g,'').slice(0,160)+'\n  đội  : '+mine.replace(/<[^>]+>/g,'').slice(0,160));
      closeRemissionPage();closeModal();
    });
    return {n:ps.length,same,diff:diff.slice(0,3)};
  });
  ok(cons.same===cons.n,'Kết luận theo đội trùng khớp trang Tra cứu giảm án: '+cons.same+'/'+cons.n);
  if(cons.diff.length)console.log(cons.diff.join('\n'));
  const kinds=await ev(()=>{const rd=upcomingReviews(profileToday(),1)[0];const c={};loadProfiles().forEach(p=>{const k=reviewStatus(p,rd).kind;c[k]=(c[k]||0)+1;});return c;});
  console.log('  Phân bố kết quả đợt tới:',JSON.stringify(kinds));

  // 3. Trang Tổng quan
  await pg.click('#bottomNav .bn-item[data-k="team"]');
  const T=await ev(()=>({text:document.getElementById('teamBody').textContent,nav:document.querySelector('#bottomNav .bn-item.on').dataset.k,
    navTop:getComputedStyle(document.getElementById('bottomNav')).zIndex>getComputedStyle(document.getElementById('teamOverlay')).zIndex,
    tiles:[...document.querySelectorAll('#teamBody .tp-stat')].map(t=>t.textContent)}));
  const nProf=await ev(()=>loadProfiles().length);
  ok(T.tiles[0]==='Hồ sơ quản lý'+nProf&&T.text.includes('Đợt xét gần nhất')&&T.text.includes('Tết Nguyên Đán 2027')&&T.text.includes('còn 46 ngày'),'Tổng quan: số hồ sơ, đợt xét gần nhất Tết 2027 (còn 46 ngày)');
  ok(T.nav==='team'&&T.navTop,'Thanh điều hướng nằm trên trang, đang sáng mục Tổng quan');
  const okCount=await ev(()=>{const rd=upcomingReviews(profileToday(),1)[0];return loadProfiles().filter(p=>reviewStatus(p,rd).kind==='ok').length;});
  ok(T.tiles[2]==='Đủ ĐK đợt tới'+okCount,'Ô "Đủ ĐK đợt tới" = '+okCount+' (khớp danh sách xét)');

  // 4. Trang Đề nghị xét giảm
  await pg.click('#bottomNav .bn-item[data-k="review"]');
  ok(await vis('reviewOverlay')&&!(await vis('teamOverlay')),'Chuyển sang Xét giảm: đóng Tổng quan, mở danh sách đề nghị');
  const R=await ev(()=>({seg:[...document.querySelectorAll('.rv-seg-btn')].map(b=>b.textContent),rows:document.querySelectorAll('.rv-row').length,
    checked:document.querySelectorAll('.rv-row input:checked').length,count:document.getElementById('reviewCount').textContent,
    okTags:[...document.querySelectorAll('.rv-row')].filter(r=>r.querySelector('.rv-tag.ok')).length}));
  ok(R.seg.join('|')==='Tết Nguyên Đán 2027xét 15/12/2026|30/4-1/5/2027xét 15/03/2027|2/9/2027xét 15/07/2027','3 đợt xét sắp tới: '+R.seg.join(' | '));
  ok(R.rows===nProf&&R.checked===okCount&&R.okTags===okCount&&R.count.includes('Đã chọn '+okCount+' người'),'Danh sách: '+R.rows+' người, chọn sẵn '+R.checked+' người đủ điều kiện');
  // Lọc + bỏ chọn
  await pg.click('.rv-chip:nth-child(2)');
  ok((await ev(()=>document.querySelectorAll('.rv-row').length))===okCount,'Lọc "Đủ điều kiện": còn '+okCount+' dòng');
  if(okCount){await pg.click('.rv-row input[type=checkbox]');
    ok((await ev(()=>document.getElementById('reviewCount').textContent)).includes('Đã chọn '+(okCount-1)),'Bỏ chọn 1 người: đếm lại');}
  await pg.click('.rv-chip:nth-child(1)');
  // Đổi đợt
  await pg.click('.rv-seg-btn:nth-child(2)');
  const R2=await ev(()=>({on:document.querySelector('.rv-seg-btn.on').textContent,count:document.getElementById('reviewCount').textContent}));
  const ok2=await ev(()=>{const rd=upcomingReviews(profileToday(),3)[1];return loadProfiles().filter(p=>reviewStatus(p,rd).kind==='ok').length;});
  ok(R2.on.startsWith('30/4-1/5/2027')&&R2.count.includes('Đã chọn '+ok2+' người'),'Đợt 30/4-1/5/2027: '+ok2+' người đủ điều kiện');
  ok(ok2>=okCount-1,'  (đợt sau có ít nhất bằng số người đủ điều kiện đợt trước: '+okCount+' → '+ok2+')');
  // Xuất Excel
  const [dl]=await Promise.all([pg.waitForEvent('download'),ev(()=>exportReviewExcel())]);
  const x=SP+'review.xlsx';await dl.saveAs(x);const sx=fs.readFileSync(x).toString('utf8');
  ok(dl.suggestedFilename().startsWith('de-nghi-xet-giam-30-4-1-5-2027')&&sx.includes('Mốc thời gian')&&sx.includes('Xếp loại Khá trở lên'),'Xuất Excel danh sách đề nghị: '+dl.suggestedFilename());
  // In danh sách: hỏi thông tin đơn vị rồi in khổ A4 ngang
  await ev(()=>printReview());
  ok(await vis('printInfoOverlay'),'In danh sách: hỏi thông tin trên bản in');
  await ev(()=>{document.getElementById('pi_org').value='Cục C10';document.getElementById('pi_unit').value='Trại giam X';document.getElementById('pi_place').value='Hà Nội';
    document.getElementById('pi_title').value='Giám thị';confirmPrintInfo();});
  await pg.waitForTimeout(200);
  const P=await ev(()=>({n:window.__printed,html:window.__printHTML||'',cls:window.__printCls||'',page:document.getElementById('printPageStyle').textContent,
    saved:JSON.parse(localStorage.getItem('prison_print_info')||'{}').unit}));
  ok(P.n===1&&P.cls.includes('printing')&&P.page.includes('landscape')&&P.html.includes('DANH SÁCH PHẠM NHÂN ĐỀ NGHỊ XÉT GIẢM')&&P.html.includes('TRẠI GIAM X')&&P.html.includes('Hà Nội, ngày 30 tháng 10 năm 2026')&&P.html.includes('GIÁM THỊ'),
     'Bản in: tiêu đề, tên đơn vị, địa danh, ngày, chức vụ ký; khổ A4 ngang');
  ok(P.saved==='Trại giam X','  (ghi nhớ thông tin đơn vị cho lần in sau)');
  await pg.waitForTimeout(1700);
  ok(!(await ev(()=>document.documentElement.classList.contains('printing'))),'  (in xong trả lại giao diện bình thường)');

  // 5. Thanh điều hướng: Hồ sơ cuộn tới danh sách; đang gõ thì ẩn
  await pg.click('#bottomNav .bn-item[data-k="profiles"]');await pg.waitForTimeout(900);
  const top=await ev(()=>document.getElementById('profileCard').getBoundingClientRect().top);
  ok(!(await vis('reviewOverlay'))&&top<80&&top>-5,'Mục Hồ sơ: đóng trang, cuộn tới danh sách hồ sơ (top='+Math.round(top)+')');
  await pg.click('#bottomNav .bn-item[data-k="calc"]');await pg.waitForTimeout(900);
  await pg.click('#prisonerName');await pg.waitForTimeout(300);
  const hid=await ev(()=>document.getElementById('bottomNav').getBoundingClientRect().top>=window.innerHeight-2);
  ok(hid,'Đang gõ ô nhập: thanh điều hướng ẩn xuống để không che bàn phím');
  await ev(()=>document.activeElement.blur());await pg.waitForTimeout(400);
  ok((await ev(()=>document.getElementById('bottomNav').getBoundingClientRect().bottom<=window.innerHeight+1)),'Gõ xong: thanh điều hướng hiện lại');
  // Không che nút cuối trang
  const fb=await ev(()=>{window.scrollTo(0,document.body.scrollHeight);const f=[...document.querySelectorAll('.footer-guide-btn')].pop().getBoundingClientRect();return f.bottom<=document.getElementById('bottomNav').getBoundingClientRect().top;});
  await pg.waitForTimeout(300);
  ok(await ev(()=>{const f=[...document.querySelectorAll('.footer-copy')].pop().getBoundingClientRect();return f.bottom<=document.getElementById('bottomNav').getBoundingClientRect().top+1;}),'Cuộn hết trang: phần cuối không bị thanh điều hướng che');

  // 6. Nhắc sao lưu sau 7 ngày
  await ev(()=>{localStorage.setItem('prison_backup_seen',String(Date.now()-8*86400000));renderProfiles();});
  const bk=await ev(()=>document.getElementById('profileList').textContent);
  ok(bk.includes('Dữ liệu hồ sơ chưa được sao lưu lần nào'),'Quá 7 ngày chưa sao lưu: nhắc trên thẻ Hồ sơ');
  await ev(()=>exportProfilesFile());
  const [d2]=await Promise.all([pg.waitForEvent('download'),ev(()=>{document.getElementById('pwA').value='matkhau-2026';document.getElementById('pwB').value='matkhau-2026';return confirmPassword();})]);
  await ev(()=>renderProfiles());
  ok(!(await ev(()=>document.getElementById('profileList').textContent)).includes('sao lưu'),'Sao lưu xong: hết nhắc');

  // 7. Khóa PIN: mở Tổng quan khi đang khóa thì hỏi PIN
  await ev(async()=>{await enablePin('123456');await lockNow();});
  await ev(()=>goNav('team'));
  ok(await vis('pinOverlay')&&!(await vis('teamOverlay')),'Đang khóa PIN: bấm Tổng quan thì hỏi mã PIN trước');
  await ev(async()=>{document.getElementById('pinA').value='123456';await confirmPin();});
  ok(await vis('teamOverlay'),'  Nhập đúng PIN: mở Tổng quan');

  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
