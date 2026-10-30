// Chạy bộ so khớp trên 1 file index.html -> ghi JSON kết quả
// node run.js <file.html> <out.json> [soKichBan] [pure=1]
const path=require('path'),fs=require('fs');
const {chromium}=require('playwright');
const pureDigest=require('./ham-tinh-thuan.js');
const [,,file,outFile,NS='120',PURE='1']=process.argv;
(async()=>{
  const b=await chromium.launch();
  const ctx=await b.newContext({viewport:{width:420,height:860},timezoneId:'Asia/Ho_Chi_Minh',locale:'vi-VN'});
  const pg=await ctx.newPage();
  await pg.clock.setFixedTime(new Date('2026-10-24T10:00:00+07:00'));
  await pg.route(/^https?:\/\//,r=>r.abort());
  const errs=[]; pg.on('pageerror',e=>errs.push(String(e.message)));
  pg.on('dialog',d=>{errs.push('dialog:'+d.message());d.dismiss();});
  await pg.goto('file://'+path.resolve(file)); await pg.waitForTimeout(1500);
  const result={errs};
  if(PURE==='1'){
    const t0=Date.now();
    result.pure=await pg.evaluate('('+pureDigest.toString()+')()');
    console.error('pure ok',((Date.now()-t0)/1000).toFixed(1)+'s');
  }
  // ===== Phần B: kịch bản giao diện =====
  await pg.evaluate(()=>{
    // Ghi lại dữ liệu xuất Excel (bản cũ dùng thư viện XLSX; bản mới đi qua downloadXls)
    window.__xl=[];
    window.XLSX={utils:{aoa_to_sheet:a=>{window.__xl.push(JSON.parse(JSON.stringify(a)));return {}},book_new:()=>({}),book_append_sheet:(wb,ws,n)=>{window.__xl.push('sheet:'+n)}},writeFile:(wb,f)=>window.__xl.push('file:'+f)};
    if(typeof window.downloadXlsx==='function'){const o=window.downloadXlsx;window.downloadXlsx=function(sheets,filename){window.__xl.push(...[].concat(...sheets.map(s=>[JSON.parse(JSON.stringify([s.head,...s.rows])),'sheet:'+s.name])),'file:'+filename);};}
    window.__txt=(sel)=>{const el=typeof sel==='string'?document.querySelector(sel):sel;if(!el)return null;const c=el.cloneNode(true);c.querySelectorAll('#progressPct,#progressBar,#rmAnnexBox,script,style').forEach(x=>x.remove());return c.textContent.replace(/\s+/g,' ').trim();};
    window.__vis=(id)=>{const el=document.getElementById(id);if(!el)return 'none';const cs=getComputedStyle(el);return cs.display+'/'+cs.visibility+'/'+el.className;};
  });
  const ev=(f,...a)=>pg.evaluate(f,...a);
  let seed=987654321; const rnd=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return ((seed>>>0)%1000003)/1000003;}; const ri=n=>Math.floor(rnd()*n);
  const pad=n=>String(n).padStart(2,'0');
  const names=['','Nguyễn Văn An','Trần Thị Bình','Lê Văn Cường','Phạm Minh Đức','Hoàng Văn Em','Võ Thị Phương','<b>Đặng</b> "Giang" & Co'];
  const scen=[];
  for(let s=0;s<+NS;s++){
    const rec={s};
    const ay=2016+ri(11), am=1+ri(12), last=new Date(ay,am,0).getDate();
    const ad=ri(3)===0?last:(ri(4)===0?Math.min(last,29+ri(3)):1+ri(last));
    const shortYear=ri(5)===0;
    const sY=ri(5)===0?0:ri(ri(4)===0?31:12), sM=ri(12), sD=ri(3)===0?ri(30):0;
    const pdY=ri(6)===0?ri(2):0, pdM=ri(3)===0?ri(14):ri(4), pdD=ri(2)?ri(30):(ri(4)===0?ri(90):0);
    const nrem=ri(4); const rems=[];for(let k=0;k<nrem;k++)rems.push({years:ri(5)===0?1:0,months:ri(12)});
    const refCustom=ri(3)===0; const ref=new Date(2026,ri(12),1+ri(28)); ref.setFullYear(2025+ri(4));
    const defMode=ri(3)===0?'thuc':'qlpn';
    const inp={name:names[ri(names.length)],arrest:pad(ad)+'/'+pad(am)+'/'+(shortYear?String(ay).slice(2):ay),
      sY:sY?sY+' năm':'',sM:sM?sM+' tháng':'',sD:sD?sD+' ngày':'',pdY:pdY?pdY+' năm':'',pdM:pdM?pdM+' tháng':'',pdD:pdD?pdD+' ngày':'',
      rems,refCustom,ref:pad(ref.getDate())+'/'+pad(ref.getMonth()+1)+'/'+ref.getFullYear(),defMode,k7choice:ri(3)};
    rec.inp=inp;
    await ev((i)=>{
      try{closeModal();}catch(e){}
      ['quarterWarn','confirmOverlay','namePromptOverlay','k7PickOverlay','qPickOverlay'].forEach(id=>{const e=document.getElementById(id);if(e)e.style.display='none';});
      saveDefaultCalcMode(i.defMode);
      const set=(id,v)=>{const e=document.getElementById(id);e.value=v;};
      set('prisonerName',i.name);set('arrestDateText',i.arrest);
      set('sY',i.sY);set('sM',i.sM);set('sD',i.sD);set('pdY',i.pdY);set('pdM',i.pdM);set('pdD',i.pdD);
      remissions=i.rems.length?JSON.parse(JSON.stringify(i.rems)):[{years:0,months:0}];
      if(!i.rems.length){pickedReduction=null;k7PickShown=false;}
      renderRemissions();updatePickChip();
      setRefMode(i.refCustom?'custom':'today'); set('refDate',i.ref);
      calculate();
    },inp);
    await pg.waitForTimeout(30);
    // Khi báo lỗi tại ô nhập, app tự đặt con trỏ vào ô đó sau 250 ms. Chờ bước này xong rồi bỏ chọn ô,
    // để kịch bản sau không phụ thuộc tốc độ máy (con trỏ đặt nhầm lúc đang điền kịch bản sau sẽ bỏ chữ "năm").
    if(await ev(()=>!!document.querySelector('.field-err'))){
      await pg.waitForTimeout(320);
      await ev(()=>{const a=document.activeElement;if(a&&a.blur)a.blur();});
    }
    // Popup chọn kỳ giảm đã xét
    const k7open=await ev(()=>document.getElementById('k7PickOverlay').style.display==='flex');
    if(k7open){
      rec.k7list=await ev(()=>__txt('#k7PickList'));
      await ev((c)=>{const o=document.querySelectorAll('#k7PickList .k7pick-opt');
        if(c===0||!o.length){closeK7Pick();}
        else{selK7Pick(c===1?o[0]:o[o.length-1]);confirmK7Pick();}},inp.k7choice);
      // closeK7Pick() tính lại sau 80ms -> chờ tới khi popup kết quả hiện (tối đa 3 giây)
      for(let w=0;w<60;w++){await pg.waitForTimeout(50);if(await ev(()=>document.getElementById('modalOverlay').classList.contains('show')))break;}
    }
    const shown=await ev(()=>document.getElementById('modalOverlay').classList.contains('show'));
    rec.shown=shown;
    rec.warn=await ev(()=>document.getElementById('quarterWarn').style.display==='flex'?__txt('#qwText'):null);
    if(!shown){scen.push(rec);continue;}
    const capRes=()=>ev(()=>({modal:__txt('#modalOverlay'),copy:lastResultText,pct:lastProgressPct,alert:__vis('alertBanner'),mode:CALC_MODE,note:__txt('#calcModeNote'),cls:document.getElementById('r-class').className}));
    rec.res1=await capRes();
    if(ri(3)===0){await ev((m)=>setCalcMode(m,false),inp.defMode==='qlpn'?'thuc':'qlpn');rec.res2=await capRes();
      if(ri(2)){await ev((m)=>setCalcMode(m,false),inp.defMode);rec.res3=await capRes();}}
    // Trang tra cứu giảm án
    if(ri(4)!==0){
      await ev(()=>openRemissionPage()); await pg.waitForTimeout(20);
      rec.rm0=await ev(()=>__txt('#remissionPageBody'));
      const opts={arr:ri(5), prio:ri(5)===0, pen:ri(4)===0?1+ri(3):0, k7:ri(4)===0, k7pick:ri(3), k8:ri(5)===0, k8t:ri(2), k9:ri(6)===0, k9t:ri(3), life:ri(3)===0, grades:ri(3), arrOff:ri(900), decOff:ri(400), okOff:ri(300)};
      rec.rmopts=opts;
      await ev((o)=>{
        const e=lastEligibleData; const fmt=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0')+'/'+d.getFullYear();
        const inpEv=(id,v)=>{const el=document.getElementById(id);if(!el)return;el.value=v;el.dispatchEvent(new Event('input',{bubbles:true}));};
        const chk=(id,v)=>{const el=document.getElementById(id);if(!el)return;el.checked=v;el.dispatchEvent(new Event('change',{bubbles:true}));};
        if(o.arr){const a=new Date(e.arrestDate.getTime());a.setDate(a.getDate()+(o.arr===1?-5:o.arrOff));inpEv('rmArrival',o.arr===4?'12/3/20':fmt(a));}
        if(o.prio)chk('rmPriority',true);
        if(o.pen)inpEv('rmPenaltyCount',String(o.pen));
        if(o.k7){chk('rmK7',true);const ops=document.querySelectorAll('#rmK7List .k7-opt');if(ops.length&&o.k7pick)pickK7(o.k7pick===1?ops[0]:ops[ops.length-1]);}
        if(o.k8){chk('rmK8',true);pickK8(document.querySelector('.k8-opt[data-v="'+(o.k8t?5:4)+'"]'));
          const d1=new Date(e.arrestDate.getTime());d1.setDate(d1.getDate()+o.decOff);inpEv('rmK8DecDate',fmt(d1));
          if(o.okOff%3){const d2=new Date(d1.getTime());d2.setDate(d2.getDate()+o.okOff);inpEv('rmK8Date',fmt(d2));}}
        if(o.k9){chk('rmK9',true);if(o.k9t)pickK9(document.querySelector('.k9-opt[data-v="'+(o.k9t===1?9:10)+'"]'));if(o.life)chk('rmK9Life',true);}
        if(o.grades){const cells=[...document.querySelectorAll('#rmQGrid .qg-cell')];cells.forEach((c,i)=>{if((i*7+o.grades)%4===0){openQPick(c.dataset.k,'x');setQGrade(['Tot','Kha','TB','Kem','No'][(i+o.grades)%5]);}});}
      },opts);
      await pg.waitForTimeout(20);
      rec.rm1=await ev(()=>({body:__txt('#remissionPageBody'),concl:(document.getElementById('rmConclusion')||{}).className,grades:JSON.stringify(quarterGrades),auto:JSON.stringify([autoKem,autoTB]),k7btn:(document.getElementById('rmK7Btn')||{dataset:{}}).dataset.value,chip:__txt('#rmPickChip'),elig:__txt('#eligibleText')}));
      // Lưu hồ sơ từ trang giảm án
      if(ri(2)){
        await ev(()=>onFlipAction());
        const np=await ev(()=>document.getElementById('namePromptOverlay').style.display==='flex');
        if(np){await ev((n)=>{document.getElementById('namePromptInput').value=n;confirmNamePrompt();},'Hồ Sơ '+s);}
        rec.saveWarn=await ev(()=>__txt('#qwText'));
      }
      await ev(()=>closeRemissionPage());
    }
    await ev(()=>closeModal());
    // Lưu hồ sơ từ lịch sử
    if(ri(6)===0){await ev((n)=>{const h=loadHistory();if(h.length>2)saveProfileFromHistory(2,'Lịch Sử '+n);},s);}
    rec.lists=await ev(()=>({hist:__txt('#historyList'),prof:__txt('#profileList'),hc:__txt('#historyCount'),pc:__txt('#profileCount')}));
    if(s%5===4){
      rec.hdet=await ev((k)=>{const h=loadHistory();if(!h.length)return null;const i=k%h.length;openHistoryDetail(i);const r={modal:__txt('#modalOverlay'),copy:lastResultText,pct:lastProgressPct,mode:CALC_MODE};closeModal();return r;},s);
      rec.pdet=await ev((k)=>{const p=loadProfiles();if(!p.length)return null;const i=k%p.length;openProfDetail(i);const r=__txt('#profDetailBody');closeProfDetail();return r;},s);
    }
    scen.push(rec);
  }
  result.scen=scen;
  // Lịch sử cũ không có _raw + hồ sơ cũ
  result.legacy=await ev(()=>{
    const h=loadHistory();h.push({time:'01/01/2025, 08:00:00',name:'Cũ <i>x</i>',refDate:'01/01/2025',arrestDate:'31/07/2024',sentence:'2 năm',preDet:'0 ngày',remission:'0 ngày',m25:'a',m33:'b',m50:'c',served:'d',remaining:'e',release:'31/07/2026'});
    localStorage.setItem(HISTORY_KEY,JSON.stringify(h.slice(-50)));renderHistory();
    const i=loadHistory().length-1;openHistoryDetail(i);
    const r={det:__txt('#historyDetailContent'),copy:lastHistoryText};closeHistoryDetail();return r;});
  // Xuất Excel + JSON
  result.excel=await ev(()=>{window.__xl.length=0;exportProfilesToExcel('calc');exportProfilesToExcel('full');exportHistoryToExcel();return window.__xl;});
  result.profiles=await ev(()=>loadProfiles());
  result.history=await ev(()=>loadHistory().map(h=>{const c=Object.assign({},h);delete c._raw;return c;}));
  fs.writeFileSync(outFile,JSON.stringify(result,null,1));
  console.error('done',scen.length,'scenarios; errors:',errs.length, errs.slice(0,3));
  await b.close();
})();
