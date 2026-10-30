// Kiểm tra các luồng thao tác của giai đoạn 2 trên bản mới
const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const file=path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:400,height:860},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN',acceptDownloads:true});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-10-24T10:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
  await pg.goto('file://'+file);await pg.waitForTimeout(1300);
  const ev=(f,...a)=>pg.evaluate(f,...a);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  const setup=()=>ev(()=>{
    window.calcFor=(name,arrest,sY,pdM,rems)=>{closeModal();const s=(i,v)=>document.getElementById(i).value=v;s('prisonerName',name);s('arrestDateText',arrest);s('sY',sY);s('sM','');s('sD','');s('pdY','');s('pdM',pdM||'');s('pdD','');
      remissions=rems||[{years:0,months:0}];k7PickShown=true;renderRemissions();calculate();};
    window.fill=(o)=>{const inp=(id,v)=>{const el=document.getElementById(id);el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
      const chk=(id)=>{const el=document.getElementById(id);el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}));};
      if(o.arrival)inp('rmArrival',o.arrival); if(o.penalty)inp('rmPenaltyCount',o.penalty); if(o.minor)chk('rmPriority');
      if(o.k8){chk('rmK8');pickK8(document.querySelector('.k8-opt[data-v="5"]'));inp('rmK8DecDate',o.k8dec);inp('rmK8Date',o.k8ok);}
      if(o.grade){const c=document.querySelector('#rmQGrid .qg-cell');openQPick(c.dataset.k,'x');setQGrade('Kem');}};
    window.rmState=()=>({arrival:document.getElementById('rmArrival').value,penalty:document.getElementById('rmPenaltyCount').value,minor:document.getElementById('rmPriority').checked,
      k8:document.getElementById('rmK8').checked,k8type:document.getElementById('rmK8Btn').dataset.value,k8dec:document.getElementById('rmK8DecDate').value,k8ok:document.getElementById('rmK8Date').value,
      lbl:document.getElementById('rmMilestoneLbl').textContent,grades:JSON.stringify(quarterGrades),concl:document.getElementById('rmConclusion').textContent});
  });
  await setup();
  // 1. Cùng phạm nhân: nhập trang giảm án, tính lại, mở lại -> giữ nguyên
  await ev(()=>{calcFor('Nguyễn Văn A','15/03/2022','6 năm','2 tháng');openRemissionPage();fill({arrival:'01/05/2022',penalty:'1',minor:true,k8:true,k8dec:'10/01/2024',k8ok:'20/06/2024',grade:true});});
  const s1=await ev(()=>rmState());
  await ev(()=>{closeRemissionPage();calcFor('Nguyễn Văn A','15/03/2022','6 năm','2 tháng');openRemissionPage();});
  const s2=await ev(()=>rmState());
  ok(JSON.stringify(s1)===JSON.stringify(s2),'Cùng phạm nhân: mở lại trang giảm án giữ nguyên thông tin & kết luận');
  if(JSON.stringify(s1)!==JSON.stringify(s2))console.log(s1,'\n',s2);
  ok(s1.lbl.includes('1/4')&&s1.k8type==='5'&&s1.grades.includes('Kem'),'  (đã có: mốc 1/4, Khoản 8 loại 5, có quý Kém)');
  // 2. Phạm nhân khác: trang trống, không lẫn xếp loại
  await ev(()=>{closeRemissionPage();calcFor('Trần Văn B','20/04/2022','5 năm','');openRemissionPage();});
  const s3=await ev(()=>rmState());
  ok(!s3.arrival&&!s3.penalty&&!s3.minor&&!s3.k8&&s3.grades==='{}','Phạm nhân khác: trang giảm án bắt đầu trống');
  // 3. Quay lại A sau B: không còn ghi nhớ (chỉ nhớ phạm nhân đang tính)
  // 4. Lưu hồ sơ A từ lịch sử (bản ghi cũ) -> không dính dữ liệu của B
  await ev(()=>{fill({arrival:'02/05/2022'});});
  await ev(()=>{closeRemissionPage();closeModal();const h=loadHistory();const i=h.findIndex(x=>x.name==='Nguyễn Văn A');saveProfileFromHistory(i);});
  const pA=await ev(()=>loadProfiles().find(p=>p.name==='Nguyễn Văn A'));
  ok(pA&&pA.data.arrival==='01/05/2022'&&pA.data.penalty==='1'&&pA.data.minor===true&&pA.data.k8type==='5','Lưu hồ sơ A từ Lịch sử: đúng thông tin giảm án của A');
  // 5. Mở lại hồ sơ A (sau khi tải lại trang) -> trang giảm án nạp đủ thông tin đã lưu
  await pg.reload();await pg.waitForTimeout(1300);await setup();
  await ev(()=>{
    window.rmState=()=>({arrival:document.getElementById('rmArrival').value,penalty:document.getElementById('rmPenaltyCount').value,minor:document.getElementById('rmPriority').checked,
      k8:document.getElementById('rmK8').checked,k8type:document.getElementById('rmK8Btn').dataset.value,k8dec:document.getElementById('rmK8DecDate').value,k8ok:document.getElementById('rmK8Date').value,
      lbl:document.getElementById('rmMilestoneLbl').textContent,grades:JSON.stringify(quarterGrades),concl:document.getElementById('rmConclusion').textContent});
    const i=loadProfiles().findIndex(p=>p.name==='Nguyễn Văn A');loadProfile(i);k7PickShown=true;calculate();openRemissionPage();});
  const s5=await ev(()=>rmState());
  ok(s5.arrival==='01/05/2022'&&s5.penalty==='1'&&s5.minor&&s5.k8&&s5.k8type==='5'&&s5.k8dec==='10/01/2024'&&s5.k8ok==='20/06/2024'&&s5.grades===s1.grades,'Mở lại hồ sơ: nạp đủ ngày đến trại, tiền án, chưa thành niên, Khoản 8, xếp loại');
  ok(s5.concl===s1.concl,'Mở lại hồ sơ: kết luận giảm án giống hệt lúc lưu');
  if(s5.concl!==s1.concl)console.log(' s1:',s1.concl,'\n s5:',s5.concl);
  // 6. Xem lại lịch sử bản ghi cũ -> Lưu hồ sơ trên trang giảm án lưu ĐÚNG bản ghi đang xem
  await ev(()=>{closeRemissionPage();closeModal();
    calcFor('Lê Văn C','01/02/2023','3 năm','');closeModal();
    const h=loadHistory();const i=h.findIndex(x=>x.name==='Trần Văn B');openHistoryDetail(i);openRemissionPage();fill({arrival:'25/04/2022'});onFlipAction();});
  const pB=await ev(()=>loadProfiles().find(p=>p.name==='Trần Văn B'));
  const pC=await ev(()=>loadProfiles().find(p=>p.name==='Lê Văn C'));
  ok(pB&&pB.data.arrival==='25/04/2022'&&!pC,'Lưu hồ sơ khi xem lại lịch sử: lưu đúng phạm nhân đang xem (B), không lưu nhầm C');
  // 7. Không nhập tên -> hỏi tên -> hồ sơ vẫn giữ thông tin giảm án
  await ev(()=>{closeRemissionPage();closeModal();calcFor('','05/05/2023','2 năm','');openRemissionPage();fill({arrival:'10/05/2023',penalty:'2'});onFlipAction();
    document.getElementById('namePromptInput').value='Phạm Văn D';confirmNamePrompt();});
  const pD=await ev(()=>loadProfiles().find(p=>p.name==='Phạm Văn D'));
  ok(pD&&pD.data.arrival==='10/05/2023'&&pD.data.penalty==='2','Chưa có tên -> nhập tên khi lưu: hồ sơ vẫn đủ thông tin giảm án');
  // 8. Văn bản sao chép luôn có dòng "Cách tính"
  const cp=await ev(()=>lastResultText);
  ok(/\nCách tính: Áp dụng theo phần mềm QLPN (cũ|mới)\n/.test(cp),'Văn bản Sao chép có dòng "Cách tính"');
  // 9. Nhập file hồ sơ có dữ liệu độc hại -> không chạy mã, dữ liệu được làm sạch
  await ev(()=>{closeRemissionPage();closeModal();window.__pwned=0;});
  const evil={app:'tinhanphat',profiles:[{name:'<img src=x onerror="window.__pwned=1">X',arrestDate:'<img src=x onerror="window.__pwned=2">',sentence:'2 năm',preDet:'0 ngày',remission:'0 ngày',release:'<svg onload="window.__pwned=3">',
     data:{remissions:[{years:'"><img src=x onerror="window.__pwned=4">',months:3}],grades:{"2025-I":"Kem","x'),alert(1),('":"Kha","2025-II":"<b>"},picked:{value:'1)<img>',label:'<img src=x onerror="window.__pwned=5">'}}},{noName:1},'rác',null]};
  fs.writeFileSync(require('os').tmpdir()+'/'+'evil.json',JSON.stringify(evil));
  await pg.setInputFiles('#profImportInput',require('os').tmpdir()+'/'+'evil.json');
  await pg.waitForTimeout(400);
  await ev(()=>{const i=loadProfiles().findIndex(p=>p.name.startsWith('<img'));openProfDetail(i);closeProfDetail();loadProfile(i);});
  await pg.waitForTimeout(300);
  const ev9=await ev(()=>{const p=loadProfiles().find(p=>p.name.startsWith('<img'));return {pwned:window.__pwned,data:p.data,count:loadProfiles().length,warn:document.getElementById('qwText').textContent};});
  ok(ev9.pwned===0,'Nhập file độc hại: không chạy được mã chèn vào');
  ok(JSON.stringify(ev9.data.remissions)==='[{"years":0,"months":3}]'&&JSON.stringify(ev9.data.grades)==='{"2025-I":"Kem"}'&&ev9.data.picked===null,'Nhập file độc hại: dữ liệu bị lọc về đúng kiểu');
  // 10. Xuất Excel thật (tải file) và đọc lại
  const [dl]=await Promise.all([pg.waitForEvent('download'),ev(()=>exportProfilesToExcel('full'))]);
  const out=require('os').tmpdir()+'/'+''+dl.suggestedFilename();await dl.saveAs(out);console.log('Excel tải về:',out);
  const [dl2]=await Promise.all([pg.waitForEvent('download'),ev(()=>exportHistoryToExcel())]);
  const out2=require('os').tmpdir()+'/'+''+dl2.suggestedFilename();await dl2.saveAs(out2);console.log('Excel tải về:',out2);
  await ev(()=>exportProfilesFile());
  const [dl3]=await Promise.all([pg.waitForEvent('download'),ev(()=>{const a=document.getElementById('pwA'),b=document.getElementById('pwB');if(a){a.value='matkhau-123';b.value='matkhau-123';return confirmPassword();}})]);
  console.log('JSON tải về:',dl3.suggestedFilename());
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
