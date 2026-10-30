// =====================================================================================
// XẾP LOẠI QUÝ CẢ ĐỘI · DÒNG THỜI GIAN · PHIẾU IN A4
// =====================================================================================

// ----- Số liệu đầy đủ (kết quả computeSentence) của 1 hồ sơ tại ngày today — cùng cách với liveProfileValues -----
function liveProfileCompute(p,today){
  const arrest=parseVnDate(p.arrestDate);
  const sen=parseYMDText(p.sentence);
  const pd=p.preDet?parseYMDText(p.preDet):{months:0,days:0};
  const rm=p.remission?parseYMDText(p.remission):{months:0,days:0};
  if(!arrest||!sen||!pd||!rm||rm.days)return null;
  const d=p.data||{};
  const inp={name:p.name, arrestDate:arrest, sentMonths:sen.months, sD:sen.days,
             preDetMonths:pd.months, pdD:pd.days, remMonths:rm.months,
             remissionsSnapshot:(d.remissions||[]).map(r=>({months:(r.years||0)*12+(r.months||0)}))};
  const escRows=Array.isArray(d.escapes)?d.escapes:[];
  if(escRows.length){
    const er=parseEscapeRows(escRows,arrest);
    if(er.error)return null;
    if(er.list.length)inp.escapes=er.list;
  }
  const mode=resolveCalcMode(p.calcMode,
    m=>escShift(calcRelease(arrest,inp.sentMonths,inp.sD,inp.preDetMonths+inp.remMonths,inp.pdD,m),inp.escapes,m),p.release);
  return computeSentence(inp,today,mode);
}

// ===== DÒNG THỜI GIAN (theo thứ tự ngày) =====
// Các mốc có ngày được xếp theo thời gian; khấu trừ tạm giam, giảm án (không gắn ngày) đứng ngay sau ngày bắt.
function timelineHTML(res){
  const row=(dot,lbl,val)=>'<div class="tl-row"><div class="tl-dot '+dot+'"></div><div class="tl-content"><div class="lbl">'+lbl+'</div><div class="val">'+val+'</div></div></div>';
  let head=row('blue','Ngày bắt giam',fmtDate(res.arrestDate));
  if(res.preDetMonths>0||res.pdD>0)head+=row('amber','Khấu trừ tạm giam','− '+fmtDays(res.preDetMonths,res.pdD));
  (res.inp.remissionsSnapshot||[]).forEach((r,i)=>{if(r.months>0)head+=row('amber','Giảm án kỳ '+(i+1),'− '+fmtDays(r.months,0));});
  const ev=[];   // {t, o: thứ tự khi trùng ngày, h}
  (res.esc||[]).forEach(p=>ev.push({t:+p.from,o:1,h:row('red','Trốn/tạm đình chỉ lần '+p.n+': '+fmtDate(p.from)+' – '+fmtDate(p.to),'+ '+ymdText(p.dur))}));
  [['m25','1/4'],['m33','1/3'],['m50','1/2']].forEach(([k,t])=>ev.push({t:+res[k],o:2,h:row('gold','Đạt mốc '+t+' mức án',fmtDate(res[k]))}));
  if(res.today>=res.arrestDate&&res.today<res.releaseDate)
    ev.push({t:+res.today,o:3,h:row('dark','Tính đến ngày '+fmtDate(res.today),'Đã chấp hành '+fmtDaysFull(res.servedDiff))});
  ev.push({t:+res.releaseDate,o:4,h:row('green','Ngày hết án dự kiến',fmtDate(res.releaseDate))});
  ev.sort((a,b)=>(a.t-b.t)||(a.o-b.o));
  return head+ev.map(e=>e.h).join('');
}

// ===== PHIẾU TÍNH THỜI HẠN CHẤP HÀNH ÁN (A4 dọc) =====
function phieuHTML(res,name){
  const e=s=>escHtml(s==null?'':String(s));
  const one=escShift(calcOneThirdDate(res.arrestDate,res.sentMonths,res.sD,res.preDetMonths,res.pdD),res.esc);
  const rv=findEligibleReview(one);
  const rems=(res.inp.remissionsSnapshot||[]).filter(r=>r.months>0);
  const rows=[
    ['Họ và tên phạm nhân','<b>'+e(name||'')+'</b>'],
    ['Ngày bắt / bắt đầu chấp hành án',e(fmtDate(res.arrestDate))],
    ['Mức án',e(fmtDays(res.sentMonths,res.sD))],
    ['Thời gian tạm giam trước đó',e(fmtDays(res.preDetMonths,res.pdD))],
    ['Tổng thời gian được giảm',e(fmtDays(res.totalDeductMonths,res.totalDeductDays))
      +(rems.length?' <i>('+rems.map((r,i)=>'kỳ '+(i+1)+': '+fmtDays(r.months,0)).join('; ')+')</i>':'')],
  ];
  if(res.esc)rows.push(['Thời gian trốn/tạm đình chỉ',e(ymdText(res.escTotal)+' ('+res.esc.length+' lần)')]);
  rows.push(['Thời gian đã chấp hành',e(fmtDaysFull(res.servedDiff))],
    ['Thời hạn còn lại',e(fmtDaysFull(res.remainingDiff))],
    ['Ngày đạt mốc 1/4 · 1/3 · 1/2',e(fmtDate(res.m25)+' · '+fmtDate(res.m33)+' · '+fmtDate(res.m50))],
    ['Đợt xét giảm án đủ điều kiện thời gian',rv?e('Đợt '+shortReviewLabel(rv.name,rv.date)+' (ngày xét '+fmtDate(rv.date)+')'):''],
    ['Ngày hết án dự kiến','<b>'+e(fmtDate(res.releaseDate))+'</b>']);
  let html='<table class="pr-table pr-kv"><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td>'+r[1]+'</td></tr>').join('')+'</tbody></table>';
  if(res.esc)html+='<p class="pr-p">Thời gian trốn/tạm đình chỉ (không tính vào thời gian đã chấp hành án phạt tù): '
    +res.esc.map(p=>'lần '+p.n+' từ '+fmtDate(p.from)+' đến '+fmtDate(p.to)+' ('+ymdText(p.dur)+')').join('; ')+'.</p>';
  html+='<p class="pr-p pr-note">Ghi chú: Kết quả chỉ mang tính tham khảo, cần đối chiếu quyết định của cơ quan có thẩm quyền.</p>';
  return html;
}
function printPhieu(res,name){
  openPrintInfo(()=>printDoc('PHIẾU TÍNH THỜI HẠN CHẤP HÀNH ÁN PHẠT TÙ',
    'Tính đến ngày '+fmtDate(res.today)+' · '+CALC_MODE_NAME[res.mode],phieuHTML(res,name),false));
}
// In từ popup Kết quả tính toán / từ Chi tiết hồ sơ
function printResultPhieu(){if(lastCalcRaw)printPhieu(lastCalcRaw,lastCalcRaw.inp.name);}
function printProfilePhieu(){
  const p=profDetailIdx!=null?loadProfiles()[profDetailIdx]:null;
  const r=p&&liveProfileCompute(p,profileToday());
  if(!r){showWarn('Hồ sơ này chưa đủ dữ liệu để in phiếu.');return}
  printPhieu(r,p.name);
}

// ===== XẾP LOẠI QUÝ CẢ ĐỘI =====
let gpQuarter=null;   // khóa quý đang xem, VD '2026-III'
function quarterList(today,n){
  const out=[];
  for(let y=today.getFullYear()+1;y>=today.getFullYear()-3&&out.length<n;y--){
    for(let i=QUARTER_DEFS.length-1;i>=0&&out.length<n;i--){
      const q=QUARTER_DEFS[i];
      const end=new Date(y,q.endMonth-1,lastDayOfMonth(y,q.endMonth));
      if(end>today)continue;
      const start=new Date(y+q.startYearOffset,q.startMonth-1,1);
      out.push({key:y+'-'+q.name, label:'Quý '+q.name+'/'+y, start, end});
    }
  }
  return out;   // mới nhất trước
}
function openGrades(){
  if(needUnlock(openGrades))return;
  closeTeamPages('grades');
  renderGrades();
  document.getElementById('gradeOverlay').style.display='flex';
  document.getElementById('gradeScroll').scrollTop=0;
  setNav('team');
}
function closeGrades(){document.getElementById('gradeOverlay').style.display='none';setNav(null);}
function gradeRowsFor(qk){
  const today=profileToday();
  return loadProfiles().map((p,i)=>{
    const d=p.data;
    if(!d)return {p,i,off:'Hồ sơ cũ chưa có dữ liệu chi tiết'};
    const arrival=parseStrictDateText(d.arrival);
    if(!arrival)return {p,i,off:'Chưa có ngày đến trại'};
    const qs=completedQuarters(arrival,today);
    if(!qs.some(q=>q.key===qk))return {p,i,off:'Chưa đủ thời gian xếp loại quý này'};
    const auto=autoGrades({arrival, today, k8on:!!d.k8on, k8dec:d.k8on?parseStrictDateText(d.k8dec):null,
      k8ok:d.k8on?parseStrictDateText(d.k8date):null, k9on:!!d.k9on});
    const manual=d.grades||{};
    const g=effectiveGrade(qk,manual,auto);
    const isManual=Object.prototype.hasOwnProperty.call(manual,qk);
    const note=!isManual&&auto.kem[qk]?'Tự xếp Kém theo Điều 26':(!isManual&&auto.tb[qk]?'Tự xếp Trung bình theo Điều 25':(isManual?'':'Mặc định Khá'));
    return {p,i,g,note,isManual};
  }).sort((a,b)=>(!!a.off-!!b.off)||a.p.name.localeCompare(b.p.name,'vi',{sensitivity:'base'}));
}
function renderGrades(){
  const qsAll=quarterList(profileToday(),12);
  if(!gpQuarter||!qsAll.some(q=>q.key===gpQuarter))gpQuarter=qsAll[0].key;
  const idx=qsAll.findIndex(q=>q.key===gpQuarter), q=qsAll[idx];
  const rows=gradeRowsFor(q.key);
  const act=rows.filter(r=>!r.off), notKha=act.filter(r=>r.g!=='Kha').length;
  const opt=(r,k,t)=>'<button type="button" class="gp-opt '+k+(r.g===k?' on':'')+'" aria-pressed="'+(r.g===k)+'" onclick="setTeamGrade('+r.i+',\''+k+'\')">'+t+'</button>';
  let html='<div class="gp-q"><button type="button" class="gp-arrow" aria-label="Quý trước"'+(idx>=qsAll.length-1?' disabled':'')+' onclick="gpQuarter=\''+(qsAll[idx+1]||q).key+'\';renderGrades()">'
    +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 6l-6 6 6 6"></path></svg></button>'
    +'<div class="gp-q-mid"><div class="gp-q-name">'+q.label+'</div><div class="gp-q-sub">'+fmtDate(q.start)+' – '+fmtDate(q.end)+'</div></div>'
    +'<button type="button" class="gp-arrow" aria-label="Quý sau"'+(idx<=0?' disabled':'')+' onclick="gpQuarter=\''+(qsAll[idx-1]||q).key+'\';renderGrades()">'
    +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button></div>'
    +'<div class="gp-sum">'+act.length+' người được xếp loại quý này · <b>'+notKha+'</b> người khác Khá · chọn là lưu ngay vào hồ sơ</div>';
  if(!rows.length)html+='<div class="tp-empty"><b>Chưa có hồ sơ nào.</b></div>';
  html+=rows.map(r=>r.off
    ?'<div class="gp-row off"><div class="gp-top"><span class="gp-name">'+escHtml(r.p.name)+'</span><span class="gp-note">'+r.off+'</span></div></div>'
    :'<div class="gp-row"><div class="gp-top"><span class="gp-name">'+escHtml(r.p.name)+'</span><span class="gp-note'+(r.note.indexOf('Điều')>=0?' auto':'')+'">'+r.note+'</span></div>'
      +'<div class="gp-opts" role="group" aria-label="Xếp loại '+escHtml(r.p.name)+'">'+opt(r,'Tot','Tốt')+opt(r,'Kha','Khá')+opt(r,'TB','TB')+opt(r,'Kem','Kém')+opt(r,'No','Chưa ĐK')+'</div></div>').join('');
  document.getElementById('gradeBody').innerHTML=html;
}
function setTeamGrade(i,g){
  const list=loadProfiles(), p=list[i];
  if(!p||!p.data)return;
  p.data.grades=p.data.grades||{};
  p.data.grades[gpQuarter]=g;
  persistProfiles(list);
  // Đang mở đúng phạm nhân này trên trang giảm án -> đồng bộ luôn
  if(typeof rmCtx!=='undefined'&&rmCtx&&prisonerKey(p.name,p.arrestDate)===rmCtx.key)quarterGrades[gpQuarter]=g;
  const sc=document.getElementById('gradeScroll'), top=sc.scrollTop;
  renderGrades();
  sc.scrollTop=top;
}
