// Kiểm tra khâu nhập ngày (năm gõ tắt, ngày không có thật, ngày bắt sau ngày tính) và mật khẩu file xuất
const path=require('path'),fs=require('fs'),os=require('os');
const {chromium}=require('playwright');
const SP=os.tmpdir()+'/';
const file='file://'+path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:360,height:780},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN',acceptDownloads:true});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
  const ev=(f,...a)=>pg.evaluate(f,...a);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  await pg.goto(file);await pg.waitForTimeout(1300);
  await ev(()=>{window.__w=[];window.showWarn=m=>window.__w.push(m);});
  const lastWarn=()=>ev(()=>window.__w[window.__w.length-1]||'');
  const typeInto=async(sel,txt)=>{await ev(s=>{const e=document.querySelector(s);e.value='';dateAdjustNote(e,'');},sel);await pg.click(sel);await pg.keyboard.type(txt);};
  const blur=()=>ev(()=>document.activeElement&&document.activeElement.blur());
  const val=sel=>ev(s=>document.querySelector(s).value,sel);
  const note=sel=>ev(s=>{const h=document.querySelector(s).closest('.input-clearable');const n=h&&h.nextElementSibling;return n&&n.classList.contains('date-adjust')?n.textContent:'';},sel);
  const st=()=>ev(()=>({err:[...document.querySelectorAll('.field-err')].map(e=>e.textContent).join('|'),inv:[...document.querySelectorAll('.invalid')].map(e=>e.id).join(','),
    modal:document.getElementById('modalOverlay').classList.contains('show'),hist:loadHistory().length}));
  const fill=(arrest)=>ev(a=>{closeModal();clearFieldErrors();const s=(i,v)=>document.getElementById(i).value=v;
    s('arrestDateText',a);s('sY','6 năm');s('sM','');s('sD','');escapes=[];k7PickShown=true;setRefMode('today');},arrest);

  // 1. Năm gõ tắt
  await typeInto('#arrestDateText','090384');await blur();
  ok((await val('#arrestDateText'))==='09/03/1984','Ngày bắt gõ 090384 → 09/03/1984 (không còn thành 2084)');
  await typeInto('#arrestDateText','150326');await blur();
  ok((await val('#arrestDateText'))==='15/03/2026','Ngày bắt gõ 150326 → 15/03/2026 (năm hiện tại vẫn là 20xx)');
  await typeInto('#arrestDateText','010527');await blur();
  ok((await val('#arrestDateText'))==='01/05/1927','Ngày bắt gõ 010527 → 01/05/1927 (2027 chưa tới nên hiểu là 19xx)');
  await ev(()=>setRefMode('custom'));
  await typeInto('#refDate','170630');await blur();
  ok((await val('#refDate'))==='17/06/2030','Ngày giả định gõ 170630 → 17/06/2030 (ô này luôn hiểu là 20xx)');
  await ev(()=>setRefMode('today'));
  await ev(()=>openEscape());
  await typeInto('#escF0','131185');await blur();
  ok((await val('#escF0'))==='13/11/1985','Ô "Từ ngày" trốn/tạm đình chỉ gõ 131185 → 13/11/1985');
  await ev(()=>{escDraft=[];closeEscape();});

  // 2. Ngày không có thật: tự sửa và báo bằng chữ cam dưới ô
  await typeInto('#arrestDateText','3104');
  ok((await val('#arrestDateText')).startsWith('30/04')&&(await note('#arrestDateText'))==='Tháng 4 chỉ có 30 ngày — đã sửa ngày 31 thành 30. Kiểm tra lại.','Gõ 31/04: tự sửa thành 30/04 và báo dưới ô');
  await pg.keyboard.type('2024');
  ok((await val('#arrestDateText'))==='30/04/2024'&&(await note('#arrestDateText')).startsWith('Tháng 4 chỉ có 30 ngày'),'  Gõ tiếp năm: dòng báo vẫn còn');
  await ev(()=>clearInput('arrestDateText'));
  ok((await note('#arrestDateText'))==='','  Xóa ô: dòng báo mất');
  await typeInto('#arrestDateText','29022023');
  ok((await val('#arrestDateText'))==='28/02/2023'&&(await note('#arrestDateText'))==='Tháng 2/2023 chỉ có 28 ngày — đã sửa ngày 29 thành 28. Kiểm tra lại.','Gõ 29/02/2023: sửa thành 28/02/2023 và báo');
  await typeInto('#arrestDateText','290223');await blur();
  ok((await val('#arrestDateText'))==='28/02/2023'&&(await note('#arrestDateText')).startsWith('Tháng 2/2023 chỉ có 28 ngày'),'Gõ tắt 29/02/23: khi đổi năm thành 2023 cũng sửa và báo');
  await typeInto('#arrestDateText','2902');
  ok((await note('#arrestDateText'))==='','Gõ 29/02 (chưa có năm): không báo');
  await typeInto('#arrestDateText','150384');await blur();
  ok((await note('#arrestDateText'))==='','Ngày hợp lệ: không có dòng báo');
  const shot=SP+'nhap-ngay-bao.png';
  await typeInto('#arrestDateText','31042024');await blur();
  await ev(()=>document.getElementById('arrestDateText').scrollIntoView({block:'center'}));
  await pg.screenshot({path:shot});

  // 3. Kiểm tra lại khi bấm Tính (dữ liệu không qua ô nhập, ví dụ mở hồ sơ cũ)
  const h0=(await st()).hist;
  await fill('31/04/2024');await ev(()=>calculate());
  let s=await st();
  ok(s.err==='Ngày 31/04/2024 không có thật — tháng 4/2024 chỉ có 30 ngày.'&&!s.modal,'Bấm Tính với ngày 31/04/2024: báo không có thật, không tính');
  await fill('01/01/2030');await ev(()=>calculate());
  s=await st();
  ok(s.err==='Ngày bắt 01/01/2030 sau ngày hôm nay 30/10/2026. Kiểm tra lại năm.'&&s.inv==='arrestDateText'&&!s.modal&&s.hist===h0,'Ngày bắt ở tương lai: báo lỗi, không tính, không ghi lịch sử');
  await fill('09/03/84');await ev(()=>calculate());
  s=await st();
  ok(s.modal&&(await ev(()=>fmtDate(lastCalcRaw.inp.arrestDate)))==='09/03/1984','Bấm Tính với năm gõ tắt 84 (chưa rời ô): tính theo năm 1984');
  await fill('01/01/2024');
  await ev(()=>{setRefMode('custom');document.getElementById('refDate').value='01/01/2020';calculate();});
  s=await st();
  ok(s.err==='Ngày bắt 01/01/2024 sau ngày giả định 01/01/2020. Kiểm tra lại năm.'&&s.inv==='arrestDateText,refDate'&&!s.modal,'Ngày giả định trước ngày bắt: báo, viền đỏ cả 2 ô');
  await ev(()=>{document.getElementById('refDate').value='31/02/2027';calculate();});
  s=await st();
  ok(s.err==='Ngày giả định 31/02/2027 không có thật.'&&!s.modal,'Ngày giả định không có thật: báo tại ô ngày giả định');
  await ev(()=>setRefMode('today'));
  await fill('30/10/2026');await ev(()=>calculate());
  s=await st();
  ok(s.modal&&!s.err,'Ngày bắt đúng bằng hôm nay: vẫn tính bình thường');
  await ev(()=>closeModal());

  // 4. Nhập Excel/CSV: dòng có ngày bắt ở tương lai bị bỏ qua và báo rõ
  const csv=SP+'ngay-tuong-lai.csv';
  fs.writeFileSync(csv,'Họ tên;Ngày bắt;Án (năm)\nNguyễn Văn Đúng;15/03/2022;3\nTrần Văn Sai;01/01/2030;2\n');
  await pg.setInputFiles('#xlImportInput',csv);await pg.waitForTimeout(500);
  const w=await lastWarn();
  ok(w.startsWith('Đã nhập 1 hồ sơ')&&w.includes('dòng 3: ngày bắt 01/01/2030 sau ngày hôm nay'),'Nhập CSV: bỏ dòng ngày bắt ở tương lai, báo đúng dòng');

  // 5. Mật khẩu file xuất: tạo sẵn mật khẩu mạnh
  await ctx.grantPermissions(['clipboard-read','clipboard-write']).catch(()=>{});
  await ev(()=>exportProfilesFile());
  const pw=await ev(()=>({v:document.getElementById('pwA').value,type:document.getElementById('pwA').type,
    b:getComputedStyle(document.getElementById('pwBWrap')).display,tools:getComputedStyle(document.getElementById('pwTools')).display,note:document.getElementById('pwNote').textContent}));
  ok(/^[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}-[a-hjkmnp-z2-9]{4}$/.test(pw.v)&&pw.type==='text'&&pw.b==='none'&&pw.tools!=='none','Xuất file: tạo sẵn mật khẩu 12 ký tự dạng '+pw.v+', hiện rõ, không cần nhập lại');
  ok(pw.note.includes('Sao chép')&&pw.note.includes('10 ký tự'),'  Lời nhắc: sao chép, gửi qua kênh khác, tự đặt từ 10 ký tự');
  const many=await ev(()=>{const set=new Set();for(let i=0;i<2000;i++)set.add(genPassword());const all=[...set].join('');
    return {uniq:set.size,bad:/[01ilo]/.test(all.replace(/-/g,''))};});
  ok(many.uniq===2000&&!many.bad,'  2000 lần tạo: không trùng, không có ký tự dễ nhầm 0, 1, i, l, o');
  await pg.click('#pwTools .pw-tool:nth-child(2)');
  const pw2=await val('#pwA');
  ok(pw2!==pw.v&&pw2.length===14,'Bấm "Tạo mật khẩu khác": đổi mật khẩu mới');
  await pg.click('#pwCopy');await pg.waitForTimeout(150);
  const cp=await ev(async()=>({msg:document.getElementById('pwMsg').textContent,clip:await navigator.clipboard.readText().catch(()=>null)}));
  ok(cp.msg.startsWith('Đã sao chép mật khẩu')&&(cp.clip===null||cp.clip===pw2),'Bấm "Sao chép": báo đã sao chép'+(cp.clip===pw2?' (đúng mật khẩu trong bộ nhớ tạm)':''));
  // Tự đặt mật khẩu riêng
  await pg.fill('#pwA','abc123');
  ok((await ev(()=>getComputedStyle(document.getElementById('pwBWrap')).display))!=='none','Tự gõ mật khẩu riêng: hiện ô nhập lại');
  await pg.fill('#pwB','abc123');await ev(()=>confirmPassword());
  ok((await ev(()=>document.getElementById('pwMsg').textContent))==='Mật khẩu tự đặt cần ít nhất 10 ký tự.','  Mật khẩu riêng 6 ký tự: bị từ chối (cần từ 10)');
  await pg.fill('#pwA','matkhau-doi-1');await pg.fill('#pwB','matkhau-doi-2');await ev(()=>confirmPassword());
  ok((await ev(()=>document.getElementById('pwMsg').textContent))==='Hai lần nhập mật khẩu chưa khớp.','  Hai lần nhập khác nhau: bị từ chối');
  // Dùng mật khẩu tạo sẵn để xuất
  await pg.click('#pwTools .pw-tool:nth-child(2)');
  const pw3=await val('#pwA');
  const [dl]=await Promise.all([pg.waitForEvent('download'),ev(()=>confirmPassword())]);
  const out=SP+'mk-'+dl.suggestedFilename();await dl.saveAs(out);
  const w2=await lastWarn();
  ok(w2.includes('Mật khẩu: '+pw3)&&w2.includes('Hãy lưu lại'),'Xuất bằng mật khẩu tạo sẵn: thông báo ghi lại mật khẩu để lưu');
  const raw=fs.readFileSync(out,'utf8');
  ok(JSON.parse(raw).type==='profiles-enc'&&!raw.includes('Nguyễn'),'  File đã mã hóa');
  // Máy khác nhập file bằng mật khẩu tạo sẵn; file cũ mật khẩu 6 ký tự vẫn mở được
  const oldFile=SP+'file-cu-6-ky-tu.json';
  fs.writeFileSync(oldFile,await ev(async()=>JSON.stringify(await encryptPack('abc123',{app:'tinhanphat',type:'profiles',version:1,count:1,profiles:loadProfiles().slice(0,1)}))));
  const ctx2=await b.newContext({timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'});const pg2=await ctx2.newPage();
  await pg2.clock.setFixedTime(new Date('2026-10-30T09:00:00+07:00'));await pg2.route(/^https?:\/\//,r=>r.abort());
  pg2.on('pageerror',e=>errs.push('máy 2: '+e.message));
  await pg2.goto(file);await pg2.waitForTimeout(1300);
  await pg2.setInputFiles('#profImportInput',out);await pg2.waitForTimeout(300);
  const imp=await pg2.evaluate(()=>({tools:getComputedStyle(document.getElementById('pwTools')).display,b:getComputedStyle(document.getElementById('pwBWrap')).display,v:document.getElementById('pwA').value,type:document.getElementById('pwA').type}));
  ok(imp.tools==='none'&&imp.b==='none'&&imp.v===''&&imp.type==='password','Nhập file: chỉ hỏi mật khẩu, không tạo mật khẩu mới');
  await pg2.fill('#pwA',pw3);await pg2.evaluate(()=>confirmPassword());await pg2.waitForTimeout(300);
  ok((await pg2.evaluate(()=>loadProfiles().map(p=>p.name).join(',')))==='Nguyễn Văn Đúng','  Đúng mật khẩu tạo sẵn: nhập được hồ sơ');
  await pg2.evaluate(()=>{localStorage.clear();});await pg2.reload();await pg2.waitForTimeout(1300);
  await pg2.setInputFiles('#profImportInput',oldFile);await pg2.waitForTimeout(300);
  await pg2.fill('#pwA','abc123');await pg2.evaluate(()=>confirmPassword());await pg2.waitForTimeout(300);
  ok((await pg2.evaluate(()=>loadProfiles().length))===1,'File cũ đặt mật khẩu 6 ký tự: vẫn mở được');
  await ctx2.close();
  // Ảnh popup mật khẩu để xem bố cục
  await ev(()=>exportProfilesFile());await pg.waitForTimeout(100);
  await pg.screenshot({path:SP+'popup-mat-khau.png'});
  const box=await ev(()=>{const r=document.querySelector('#pwOverlay .qpick-box').getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;});
  ok(box,'Popup mật khẩu vừa màn hình 360px');
  await ev(()=>closePassword());
  console.log('Ảnh:',shot,SP+'popup-mat-khau.png');
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
