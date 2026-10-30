const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:400,height:860},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN',acceptDownloads:true});
  const pg=await ctx.newPage();await pg.clock.setFixedTime(new Date('2026-10-25T09:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.resolve(process.argv[2]));await pg.waitForTimeout(1200);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  const setup=()=>pg.evaluate(()=>{
    window.calcA=()=>{closeModal();const s=(i,v)=>document.getElementById(i).value=v;s('prisonerName','Đỗ Văn K');s('arrestDateText','10/03/2023');s('sY','6 năm');s('sM','');s('sD','');s('pdY','');s('pdM','');s('pdD','');remissions=[{years:0,months:0}];k7PickShown=true;renderRemissions();calculate();};
    window.st=()=>({k9:document.getElementById('rmK9').checked,t:document.getElementById('rmK9Btn').dataset.value,life:document.getElementById('rmK9Life').checked,
      grid:[...document.querySelectorAll('#rmQGrid .qg-cell')].map(c=>c.dataset.k+'='+c.textContent).join(','),concl:document.getElementById('rmConclusion').textContent});
  });
  await setup();
  await pg.evaluate(()=>{calcA();openRemissionPage();const inp=(id,v)=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
    inp('rmArrival','01/04/2023');const k=document.getElementById('rmK9');k.checked=true;k.dispatchEvent(new Event('change',{bubbles:true}));
    pickK9(document.querySelector('.k9-opt[data-v="10"]'));const l=document.getElementById('rmK9Life');l.checked=true;l.dispatchEvent(new Event('change',{bubbles:true}));});
  const s1=await pg.evaluate(()=>st());
  ok(s1.grid.includes('2023-II=Kém')&&s1.grid.includes('2023-III=Kém')&&s1.grid.includes('2023-IV=TB'),'Khoản 9, 10 trên trang giảm án: tự xếp Kém 02 quý đầu ('+s1.grid.split(',').slice(0,4).join(' ')+'…)');
  await pg.evaluate(()=>{closeRemissionPage();calcA();openRemissionPage();});
  const s2=await pg.evaluate(()=>st());
  ok(JSON.stringify(s1)===JSON.stringify(s2),'Tính lại cùng phạm nhân: Khoản 9, 10 (loại tội, chung thân) được giữ nguyên');
  await pg.evaluate(()=>{onFlipAction();closeModal();});
  const pd=await pg.evaluate(()=>loadProfiles()[0].data);
  ok(pd.k9on===true&&pd.k9type==='10'&&pd.k9life===true,'Lưu hồ sơ: có Khoản 9, 10');
  await pg.evaluate(()=>{openProfDetail(0);});
  const det=await pg.$eval('#profDetailBody',e=>e.textContent);
  ok(det.includes('Phạm tội mới (Khoản 9, 10)')&&det.includes('tù chung thân'),'Chi tiết hồ sơ: hiện mục Phạm tội mới');
  const g2=await pg.$$eval('#profDetailBody .qgrid .qg-cell',els=>els.map(e=>e.textContent));
  ok(g2.filter(x=>x==='Kém').length===2&&g2.includes('TB'),'Chi tiết hồ sơ: bảng xếp loại có 2 quý Kém + quý TB theo Điều 25, 26');
  await pg.evaluate(()=>closeProfDetail());
  await pg.reload();await pg.waitForTimeout(1200);await setup();
  await pg.evaluate(()=>{loadProfile(0);k7PickShown=true;calculate();openRemissionPage();});
  const s3=await pg.evaluate(()=>st());
  ok(JSON.stringify(s1)===JSON.stringify(s3),'Mở lại hồ sơ sau khi tải lại trang: Khoản 9, 10 và kết luận giống hệt');
  // Excel tổng hợp: cột Kết quả xếp loại phản ánh Kém/TB tự xếp
  await pg.evaluate(()=>closeModal());
  const [dl]=await Promise.all([pg.waitForEvent('download'),pg.evaluate(()=>exportProfilesToExcel('full'))]);
  const f=require('os').tmpdir()+'/'+'k9.xlsx';await dl.saveAs(f);
  console.log('Excel:',f,'| Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
