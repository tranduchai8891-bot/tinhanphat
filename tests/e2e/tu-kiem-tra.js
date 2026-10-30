// Mở ứng dụng với đuôi #kiemthu: chạy bộ tự kiểm tra độ chính xác có sẵn trong app (ví dụ nghiệp vụ + mã kiểm tra)
const path=require('path');
const {chromium}=require('playwright');
(async()=>{
  const b=await chromium.launch();
  const pg=await (await b.newContext({viewport:{width:400,height:860},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'})).newPage();
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+path.resolve(process.argv[2])+'#kiemthu');
  await pg.waitForSelector('#selfTestOverlay',{timeout:60000});
  await pg.waitForFunction(()=>/mục ĐẠT|KHÔNG ĐẠT/.test(document.getElementById('selfTestOverlay').textContent),null,{timeout:120000});
  const r=await pg.evaluate(()=>{
    const t=document.getElementById('selfTestOverlay').textContent.replace(/\s+/g,' ');
    const bad=[...document.querySelectorAll('#selfTestOverlay div')].map(d=>d.textContent).filter(x=>x.includes('KHÔNG ĐẠT')&&x.length<400);
    return {sum:(t.match(/(Tất cả \d+ mục ĐẠT|Có \d+ mục KHÔNG ĐẠT)/)||[''])[0],bad};
  });
  console.log((r.sum.startsWith('Tất cả')?'PASS ':'FAIL ')+'Tự kiểm tra trong app: '+r.sum);
  if(!r.sum.startsWith('Tất cả'))r.bad.slice(0,10).forEach(x=>console.log('   '+x));
  console.log('Lỗi JS:',errs.length?errs:'không');
  await b.close();
})();
