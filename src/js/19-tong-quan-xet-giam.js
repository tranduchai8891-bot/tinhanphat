// =====================================================================================
// TỔNG QUAN ĐỘI · ĐỀ NGHỊ XÉT GIẢM THEO ĐỢT · IN ẤN · NHẮC SAO LƯU · THANH ĐIỀU HƯỚNG
// Không có cách tính riêng ở đây: số liệu hồ sơ lấy từ refreshProfiles() (liveProfileValues),
// kết luận xét giảm lấy từ evaluateRemission() với đúng dữ liệu mà trang Tra cứu giảm án dùng.
// =====================================================================================

// ----- Dữ liệu xét giảm của 1 hồ sơ tại ngày T (dựng giống hệt trang Tra cứu giảm án khi mở hồ sơ) -----
function profileRemissionCtx(p,T){
  const d=p&&p.data;
  if(!d)return null;
  const arrest=parseVnDate(p.arrestDate), sen=parseYMDText(p.sentence);
  const pd=p.preDet?parseYMDText(p.preDet):{months:0,days:0};
  if(!arrest||!sen||!pd||(!sen.months&&!sen.days))return null;
  let esc=null;
  if(Array.isArray(d.escapes)&&d.escapes.length){
    const er=parseEscapeRows(d.escapes,arrest);
    if(er.error)return null;
    if(er.list.length)esc=er.list;
  }
  const e={arrestDate:arrest, today:T, sentMonths:sen.months, sentExtraDays:sen.days,
           preDetMonths:pd.months, preDetDays:pd.days,
           oneThirdDate:escShift(calcOneThirdDate(arrest,sen.months,sen.days,pd.months,pd.days),esc), esc};
  const x={priority:!!d.minor, penalty:parseInt(d.penalty)||0, arrival:parseStrictDateText(d.arrival),
           grades:d.grades||{}, picked:(d.picked&&d.picked.value)?d.picked:null,
           k7:{on:false,value:0,label:'',date:null},
           k8:{on:!!d.k8on, need:parseInt(d.k8type)||0, date:parseStrictDateText(d.k8date), dec:parseStrictDateText(d.k8dec)},
           k9:{on:!!d.k9on, type:parseInt(d.k9type)||0, life:!!d.k9life}};
  // Có kỳ giảm án -> tự xác định kỳ giảm đã được xét (như autoFillK7 trên trang giảm án)
  const n=(d.remissions||[]).filter(r=>(r.years||0)||(r.months||0)).length;
  if(n){
    const s=detectReductionSeries(e,x,n);
    if(s.length){const rv=s[s.length-1];
      x.k7={on:true, value:rv.date.getTime(), label:rv.name+' (ngày xét '+fmtDate(rv.date)+')', date:rv.date};}
  }
  return {e,x};
}
const stripTags=h=>String(h||'').replace(/<[^>]+>/g,'').replace(/\s+/g,' ').trim();
const sameDay=(a,b)=>!!a&&!!b&&a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate();
// Các đợt xét từ ngày "from" trở đi
function upcomingReviews(from,n){
  const out=[];
  for(let y=from.getFullYear();out.length<n&&y<from.getFullYear()+3;y++)
    for(const r of REVIEW_DATES){
      const d=new Date(y,r.reviewMonth-1,r.reviewDay);
      if(d>=from&&out.length<n)out.push({name:r.name,date:d,label:shortReviewLabel(r.name,d),key:String(d.getTime())});
    }
  return out;
}
// Kết quả xét của 1 hồ sơ cho 1 đợt: kind = ok (đủ điều kiện đợt này) | later | wait | no | na
function reviewStatus(p,rd){
  const c=profileRemissionCtx(p,rd.date);
  if(!c)return {kind:'na', tag:'Thiếu dữ liệu', note:'Mở lại hồ sơ, tính án rồi lưu lại để cập nhật.'};
  const r=evaluateRemission(c.e,c.x);
  const head=((r.html.match(/rc-head">([^<]*)</)||[])[1]||'').replace(/^[✓◷✕]\s*/,'').trim();
  const note=stripTags(r.html.replace(/<span class="rc-head">[^<]*<\/span>/,''));
  const ms=remissionMilestone(c.e,c.x);
  const qs=c.x.arrival?completedQuarters(c.x.arrival,rd.date):[];
  const st=gradeStats(qs,remissionGradeFn(c.e,c.x));
  const base={ms, qTotal:st.total, qAdj:st.adj, qCount:qs.length, head, note, cls:r.cls};
  if(/\bok\b/.test(r.cls)){
    if(r.review&&sameDay(r.review.date,rd.date))return Object.assign(base,{kind:'ok', tag:'Đủ điều kiện'});
    if(r.review)return Object.assign(base,{kind:'later', tag:'Đợt '+shortReviewLabel(r.review.name,r.review.date)});
    return Object.assign(base,{kind:'wait', tag:'Cần xem'});
  }
  return Object.assign(base,{kind:/\bpending\b/.test(r.cls)?'wait':'no', tag:head||'Chưa đủ điều kiện'});
}
function reviewInfoLine(p,s){
  if(!s.ms)return s.note;
  return p.sentence+' · đạt '+s.ms.txt+' ngày '+fmtDate(s.ms.date)
    +(s.qCount?(' · '+s.qAdj+' quý Khá liên tục'):' · chưa có ngày đến trại');
}

// ----- Mở trang khi dữ liệu đang khóa bằng mã PIN -----
function needUnlock(then){
  if(lockEnabled()&&!lockIsOpen()){openPin('unlock',then);return true;}
  return false;
}

// ===== TỔNG QUAN ĐỘI =====
function openTeam(){
  if(needUnlock(openTeam))return;
  closeTeamPages('team');
  renderTeam();
  document.getElementById('teamOverlay').style.display='flex';
  document.getElementById('teamScroll').scrollTop=0;
  setNav('team');
}
function closeTeam(){document.getElementById('teamOverlay').style.display='none';setNav(null);}
function renderTeam(){
  const box=document.getElementById('teamBody');
  const ps=refreshProfiles();
  const today=profileToday();
  document.getElementById('teamDate').textContent='(ngày '+fmtDate(today)+')';
  if(!ps.length){
    box.innerHTML='<div class="tp-empty"><b>Chưa có hồ sơ nào.</b><br>Tính án cho phạm nhân rồi bấm “Lưu hồ sơ”, hoặc nhập cả danh sách từ Excel.</div>'
      +'<div class="rv-actions"><button type="button" class="modal-btn ghost" onclick="downloadImportTemplate()">Tải file Excel mẫu</button>'
      +'<button type="button" class="modal-btn close" onclick="startExcelImport()">Nhập từ Excel</button></div>';
    return;
  }
  const next=upcomingReviews(today,1)[0];
  const st=ps.map((p,i)=>({p,i,s:reviewStatus(p,next)}));
  const ok=st.filter(o=>o.s.kind==='ok').length;
  const check=st.filter(o=>o.s.kind==='wait'||o.s.kind==='na').length;
  const days=p=>{const r=parseVnDate(p.release);return r?Math.round((r-today)/86400000):null;};
  const soon=ps.map((p,i)=>({p,i,d:days(p)})).filter(o=>o.d!==null&&o.d<=60).sort((a,b)=>a.d-b.d);
  const in30=soon.filter(o=>o.d>=0&&o.d<=30).length;
  const noArr=ps.filter(p=>!(p.data&&parseStrictDateText(p.data.arrival))).length;
  const daysToReview=Math.round((next.date-today)/86400000);
  const tile=(cls,lbl,val,fn)=>'<button type="button" class="tp-stat '+cls+'"'+(fn?(' onclick="'+fn+'"'):' disabled')+'>'
    +'<span class="tp-stat-l">'+lbl+'</span><span class="tp-stat-v">'+val+'</span></button>';
  let html=backupReminderHTML()
    +'<div class="tp-stats">'
    + tile('','Hồ sơ quản lý',ps.length,"goNav('profiles')")
    + tile('red','Hết án ≤ 30 ngày',in30,in30?"document.getElementById('tpSoon').scrollIntoView({behavior:'smooth'})":'')
    + tile('green','Đủ ĐK đợt tới',ok,"openReview()")
    + tile('amber','Chưa có ngày đến trại',noArr,noArr?"openReview()":'')
    +'</div>'
    +'<div class="rm-card tp-round">'
    +  '<div class="tp-round-top"><span class="pd-sub" style="margin:0">Đợt xét gần nhất</span><span class="tp-days">còn '+daysToReview+' ngày</span></div>'
    +  '<div class="tp-round-name">'+escHtml(next.label)+'</div>'
    +  '<div class="tp-round-sub">Ngày xét '+fmtDate(next.date)+' · <b>'+ok+'</b> người đủ điều kiện'+(check?(', '+check+' người cần xem lại'):'')+'</div>'
    +  '<div class="tp-bar"><div style="width:'+Math.round(ok/ps.length*100)+'%"></div></div>'
    +  '<button type="button" class="modal-btn close tp-wide" onclick="openReview()">Lập danh sách đề nghị</button>'
    +'</div>'
    +'<button type="button" class="tp-link" onclick="openGrades()"><span><b>Xếp loại thi đua theo quý</b><small>Nhập Tốt/Khá/TB/Kém cho cả đội trên một màn hình</small></span>'
    +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button>'
    +'<div class="pd-sub tp-h" id="tpSoon">Sắp hết án (60 ngày tới) và đã đến hạn</div>';
  if(soon.length){
    html+=soon.slice(0,8).map(o=>{
      const lbl=o.d<0?'Đã qua '+(-o.d)+' ngày':(o.d===0?'Hết án hôm nay':'Còn '+o.d+' ngày');
      return '<button type="button" class="tp-item" onclick="openProfDetail('+o.i+')">'
        +'<span class="tp-item-main"><span class="tp-item-name">'+escHtml(o.p.name)+'</span>'
        +'<span class="tp-item-sub">Hết án '+escHtml(o.p.release)+'</span></span>'
        +'<span class="tp-pill'+(o.d<=30?' red':'')+'">'+lbl+'</span></button>';
    }).join('');
  }else html+='<div class="tp-none">Không có phạm nhân nào hết án trong 60 ngày tới.</div>';
  box.innerHTML=html;
}

// ===== ĐỀ NGHỊ XÉT GIẢM THEO ĐỢT =====
let rvRoundKey=null, rvFilter='all';
const rvSel={};      // {khóa đợt: {khóa hồ sơ: true/false}} — chỉ giữ trong phiên làm việc
const profKey=p=>prisonerKey(p.name,p.arrestDate);
function openReview(){
  if(needUnlock(openReview))return;
  closeTeamPages('review');
  renderReview();
  document.getElementById('reviewOverlay').style.display='flex';
  document.getElementById('reviewScroll').scrollTop=0;
  setNav('review');
}
function closeReview(){document.getElementById('reviewOverlay').style.display='none';setNav(null);}
function reviewRounds(){return upcomingReviews(profileToday(),3);}
function currentRound(){
  const rs=reviewRounds();
  return rs.find(r=>r.key===rvRoundKey)||rs[0];
}
function reviewData(){
  const rd=currentRound();
  const ps=refreshProfiles();
  const sel=rvSel[rd.key]||(rvSel[rd.key]={});
  const rows=ps.map((p,i)=>{
    const s=reviewStatus(p,rd), k=profKey(p);
    if(!(k in sel))sel[k]=(s.kind==='ok');
    return {p,i,s,k,on:!!sel[k]};
  });
  // Đủ điều kiện lên trước, rồi theo tên
  const rank={ok:0,later:1,wait:2,na:3,no:4};
  rows.sort((a,b)=>(rank[a.s.kind]-rank[b.s.kind])||a.p.name.localeCompare(b.p.name,'vi',{sensitivity:'base'}));
  return {rd,rows};
}
function renderReview(){
  const {rd,rows}=reviewData();
  rvRoundKey=rd.key;
  const box=document.getElementById('reviewBody');
  const nOk=rows.filter(r=>r.s.kind==='ok').length, nOther=rows.length-nOk;
  const seg=reviewRounds().map(r=>'<button type="button" class="rv-seg-btn'+(r.key===rd.key?' on':'')+'" aria-pressed="'+(r.key===rd.key)+'" onclick="rvRoundKey=\''+r.key+'\';renderReview()">'
    +escHtml(r.label)+'<small>xét '+fmtDate(r.date)+'</small></button>').join('');
  const chip=(f,t)=>'<button type="button" class="rv-chip'+(rvFilter===f?' on':'')+'" aria-pressed="'+(rvFilter===f)+'" onclick="rvFilter=\''+f+'\';renderReview()">'+t+'</button>';
  const shown=rows.filter(r=>rvFilter==='all'||(rvFilter==='ok'?r.s.kind==='ok':r.s.kind!=='ok'));
  let html='<div class="rv-seg" role="group" aria-label="Chọn đợt xét">'+seg+'</div>'
    +'<div class="rv-chips">'+chip('all','Tất cả · '+rows.length)+chip('ok','Đủ điều kiện · '+nOk)+chip('other','Chưa đủ · '+nOther)+'</div>';
  if(!rows.length)html+='<div class="tp-empty"><b>Chưa có hồ sơ nào.</b><br>Lưu hồ sơ phạm nhân để lập danh sách.</div>';
  html+=shown.map(r=>{
    const s=r.s, cls=s.kind==='ok'?'ok':(s.kind==='later'?'later':(s.kind==='no'?'no':'wait'));
    return '<div class="rv-row'+(r.on?' on':'')+'">'
      +'<label class="rv-check"><input type="checkbox"'+(r.on?' checked':'')+' data-k="'+escHtml(r.k)+'" onchange="rvToggle(this.dataset.k,this.checked)">'
      +'<span class="rv-main"><span class="rv-top"><span class="rv-name">'+escHtml(r.p.name)+'</span><span class="rv-tag '+cls+'">'+escHtml(s.tag)+'</span></span>'
      +'<span class="rv-info">'+escHtml(reviewInfoLine(r.p,s))+'</span></span></label>'
      +'<button type="button" class="rv-more" aria-label="Xem hồ sơ '+escHtml(r.p.name)+'" onclick="openProfDetail('+r.i+')">'
      +'<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6"></path></svg></button>'
      +(s.kind!=='ok'&&s.note?('<div class="rv-note">'+escHtml(s.note)+'</div>'):'')
      +'</div>';
  }).join('');
  box.innerHTML=html;
  const n=rows.filter(r=>r.on).length;
  document.getElementById('reviewCount').innerHTML='Đã chọn <b>'+n+'</b> người · đợt '+escHtml(rd.label);
}
function rvToggle(k,on){
  const rd=currentRound();
  (rvSel[rd.key]||(rvSel[rd.key]={}))[k]=on;
  renderReview();
}
function reviewSelected(){
  const {rd,rows}=reviewData();
  return {rd,rows:rows.filter(r=>r.on)};
}
function reviewTableRows(rows){
  return rows.map((r,i)=>[i+1,r.p.name,r.p.arrestDate,r.p.sentence,r.p.preDet||'',r.p.remission||'',r.p.escape||'',
    r.s.ms?(r.s.ms.txt+': '+fmtDate(r.s.ms.date)):'', r.s.qCount?(r.s.qAdj+' quý liên tục / '+r.s.qTotal+' quý'):'',
    r.s.tag, r.s.kind==='ok'?'':r.s.note]);
}
const REVIEW_HEAD=['STT','Họ tên','Ngày bắt','Mức án','Tạm giam','Đã giảm','Trốn/tạm đình chỉ','Mốc thời gian','Xếp loại Khá trở lên','Kết quả','Ghi chú'];
function exportReviewExcel(){
  const {rd,rows}=reviewSelected();
  if(!rows.length){showWarn('Chưa chọn phạm nhân nào trong danh sách.');return}
  const lbl=rd.label.replace(/[^\dA-Za-zÀ-ỹ]+/g,'-').replace(/^-|-$/g,'');
  downloadXls(REVIEW_HEAD,reviewTableRows(rows),'de-nghi-xet-giam-'+lbl+'-'+dateStamp()+'.xlsx','Đề nghị xét giảm',
    [{wch:5},{wch:20},{wch:12},{wch:20},{wch:16},{wch:14},{wch:18},{wch:18},{wch:22},{wch:16},{wch:50}]);
}
function printReview(){
  const {rd,rows}=reviewSelected();
  if(!rows.length){showWarn('Chưa chọn phạm nhân nào trong danh sách.');return}
  openPrintInfo(()=>{
    const body='<table class="pr-table"><thead><tr>'+['STT','Họ và tên','Ngày bắt','Mức án','Tạm giam','Đã giảm','Mốc thời gian','Quý Khá trở lên (liền kề/tổng)','Ghi chú']
      .map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'
      +rows.map((r,i)=>'<tr><td class="c">'+(i+1)+'</td><td>'+escHtml(r.p.name)+'</td><td class="c">'+escHtml(r.p.arrestDate)+'</td><td>'+escHtml(r.p.sentence)
        +'</td><td>'+escHtml(r.p.preDet||'')+'</td><td>'+escHtml(r.p.remission||'')+'</td><td>'+(r.s.ms?escHtml(r.s.ms.txt+': '+fmtDate(r.s.ms.date)):'')
        +'</td><td>'+(r.s.qCount?(r.s.qAdj+'/'+r.s.qTotal+' quý'):'')+'</td><td>'+escHtml(r.s.kind==='ok'?(r.p.escape?('Trốn/tạm đình chỉ '+r.p.escape):''):r.s.tag)+'</td></tr>').join('')
      +'</tbody></table>';
    printDoc('DANH SÁCH PHẠM NHÂN ĐỀ NGHỊ XÉT GIẢM THỜI HẠN CHẤP HÀNH ÁN PHẠT TÙ',
      'Đợt '+rd.label+' (ngày xét '+fmtDate(rd.date)+') · Tổng số: '+rows.length+' phạm nhân',body,true);
  });
}

// ===== IN ẤN (A4, thể thức văn bản hành chính) =====
const PRINT_INFO_KEY='prison_print_info';
const PRINT_FIELDS=[['org','Cơ quan cấp trên'],['unit','Tên đơn vị'],['place','Địa danh'],['maker','Người lập'],['title','Chức vụ người ký'],['signer','Họ tên người ký']];
function loadPrintInfo(){try{return JSON.parse(localStorage.getItem(PRINT_INFO_KEY)||'{}')||{};}catch(e){return {};}}
let printAfter=null;
function openPrintInfo(after){
  printAfter=after;
  const v=loadPrintInfo();
  document.getElementById('printInfoBody').innerHTML=PRINT_FIELDS.map(([k,l])=>
    '<div class="field" style="margin-bottom:9px"><label for="pi_'+k+'">'+l+'</label>'
    +'<input type="text" id="pi_'+k+'" class="pi-input" maxlength="80" value="'+escHtml(v[k]||'')+'"></div>').join('');
  document.getElementById('printInfoOverlay').style.display='flex';
}
function closePrintInfo(){document.getElementById('printInfoOverlay').style.display='none';printAfter=null;}
function confirmPrintInfo(){
  const v={};PRINT_FIELDS.forEach(([k])=>{v[k]=(document.getElementById('pi_'+k).value||'').trim();});
  try{localStorage.setItem(PRINT_INFO_KEY,JSON.stringify(v));}catch(e){}
  const fn=printAfter;closePrintInfo();
  if(typeof fn==='function')fn();
}
function printDoc(title,sub,bodyHTML,landscape){
  const v=loadPrintInfo(), t=profileToday(), e=s=>escHtml(s||'');
  const html='<div class="pr-page">'
    +'<table class="pr-head"><tr><td>'+(v.org?e(v.org.toUpperCase())+'<br>':'')+'<b>'+(v.unit?e(v.unit.toUpperCase()):'&nbsp;')+'</b><div class="pr-rule" style="width:35%"></div></td>'
    +'<td><b>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</b><br><b>Độc lập - Tự do - Hạnh phúc</b><div class="pr-rule" style="width:52%"></div>'
    +'<i class="pr-date">'+(v.place?e(v.place)+', ':'')+'ngày '+pad2(t.getDate())+' tháng '+pad2(t.getMonth()+1)+' năm '+t.getFullYear()+'</i></td></tr></table>'
    +'<h1 class="pr-title">'+e(title)+'</h1>'+(sub?'<p class="pr-sub">'+e(sub)+'</p>':'')
    +bodyHTML
    +'<table class="pr-sign"><tr><td><b>NGƯỜI LẬP</b><br><i>(Ký, ghi rõ họ tên)</i><div class="pr-gap"></div><b>'+e(v.maker)+'</b></td>'
    +'<td><b>'+(v.title?e(v.title.toUpperCase()):'&nbsp;')+'</b><br><i>(Ký, ghi rõ họ tên, đóng dấu)</i><div class="pr-gap"></div><b>'+e(v.signer)+'</b></td></tr></table>'
    +'<div class="pr-foot">Lập từ phần mềm Tính thời hạn chấp hành án phạt tù</div>'
    +'</div>';
  let host=document.getElementById('printArea');
  if(!host){host=document.createElement('div');host.id='printArea';document.body.appendChild(host);}
  host.innerHTML=html;
  let st=document.getElementById('printPageStyle');
  if(!st){st=document.createElement('style');st.id='printPageStyle';document.head.appendChild(st);}
  st.textContent='@page{size:A4 '+(landscape?'landscape':'portrait')+';margin:20mm 15mm 20mm '+(landscape?'20mm':'30mm')+'}';
  document.documentElement.classList.add('printing');
  const done=()=>{document.documentElement.classList.remove('printing');window.removeEventListener('afterprint',done);};
  window.addEventListener('afterprint',done);
  setTimeout(()=>{try{window.print();}catch(err){showWarn('Thiết bị này không hỗ trợ in trực tiếp. Hãy dùng Xuất Excel.');}setTimeout(done,1500);},60);
}

// ===== NHẮC SAO LƯU ĐỊNH KỲ =====
const BACKUP_KEY='prison_backup_last', BACKUP_SEEN_KEY='prison_backup_seen', BACKUP_DAYS=7;
function markBackupDone(){try{localStorage.setItem(BACKUP_KEY,String(Date.now()));}catch(e){}}
function backupDaysSince(){
  let last=0,seen=0;
  try{last=+localStorage.getItem(BACKUP_KEY)||0;seen=+localStorage.getItem(BACKUP_SEEN_KEY)||0;
      if(!seen){seen=Date.now();localStorage.setItem(BACKUP_SEEN_KEY,String(seen));}}catch(e){return 0;}
  return Math.floor((Date.now()-Math.max(last,seen))/86400000);
}
function backupReminderHTML(){
  if(!loadProfiles().length)return '';
  const n=backupDaysSince();
  if(n<BACKUP_DAYS)return '';
  let last=0;try{last=+localStorage.getItem(BACKUP_KEY)||0;}catch(e){}
  return '<div class="bk-remind"><span>'+(last?('Đã '+n+' ngày chưa sao lưu dữ liệu hồ sơ.'):'Dữ liệu hồ sơ chưa được sao lưu lần nào.')+'</span>'
    +'<button type="button" onclick="exportProfilesFile()">Sao lưu</button></div>';
}

// ===== CHẾ ĐỘ CHỮ LỚN =====
const BIG_TEXT_KEY='prison_big_text';
function applyBigText(on){
  document.documentElement.classList.toggle('big',!!on);
  const b=document.getElementById('bigTextBtn'); if(b)b.textContent='Chữ lớn: '+(on?'Bật':'Tắt');
}
function toggleBigText(){
  const on=!document.documentElement.classList.contains('big');
  try{localStorage.setItem(BIG_TEXT_KEY,on?'1':'0');}catch(e){}
  applyBigText(on);
}
(function(){let on=false;try{on=localStorage.getItem(BIG_TEXT_KEY)==='1';}catch(e){}
  if(on)applyBigText(true);
  document.addEventListener('DOMContentLoaded',()=>applyBigText(document.documentElement.classList.contains('big')));})();

// ===== THANH ĐIỀU HƯỚNG DƯỚI ĐÁY =====
const TEAM_PAGES={team:'teamOverlay',review:'reviewOverlay',grades:'gradeOverlay'};
function closeTeamPages(except){
  Object.keys(TEAM_PAGES).forEach(k=>{if(k!==except){const o=document.getElementById(TEAM_PAGES[k]);if(o)o.style.display='none';}});
}
function setNav(k){
  document.querySelectorAll('#bottomNav .bn-item').forEach(b=>{
    const on=b.dataset.k===(k||navMainTab());
    b.classList.toggle('on',on);
    if(on)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');
  });
}
let navMainK='calc';
function navMainTab(){return navMainK;}
function goNav(k){
  if(k==='team')return openTeam();
  if(k==='review')return openReview();
  closeTeamPages();
  if(k==='profiles'){
    const lock=document.getElementById('lockCard'), card=document.getElementById('profileCard');
    const target=(lock&&lock.style.display==='block')?lock:((card&&card.style.display==='block')?card:null);
    if(!target){showWarn('Chưa có hồ sơ nào. Tính án rồi bấm “Lưu hồ sơ”, hoặc vào Tổng quan để nhập danh sách từ Excel.');setNav(null);return;}
    navMainK='profiles';setNav(null);
    // đợi trang vừa đóng mở khóa cuộn rồi mới cuộn tới
    setTimeout(()=>window.scrollTo({top:target.getBoundingClientRect().top+window.scrollY-12,behavior:'smooth'}),60);
    return;
  }
  navMainK='calc';setNav(null);
  setTimeout(()=>window.scrollTo({top:0,behavior:'smooth'}),60);
}
// Ẩn thanh điều hướng khi đang gõ (bàn phím điện thoại) để không che ô nhập
document.addEventListener('focusin',e=>{
  const t=e.target;
  if(t&&(t.tagName==='TEXTAREA'||(t.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|file)$/i.test(t.type))))document.body.classList.add('typing');
});
document.addEventListener('focusout',()=>{setTimeout(()=>{
  const a=document.activeElement;
  if(!a||!(a.tagName==='TEXTAREA'||(a.tagName==='INPUT'&&!/^(checkbox|radio|button|submit|file)$/i.test(a.type))))document.body.classList.remove('typing');
},120);});
// Đang xem phần Hồ sơ/Lịch sử trên trang chính -> sáng mục "Hồ sơ"
window.addEventListener('scroll',()=>{
  const card=document.getElementById('profileCard')||null, lock=document.getElementById('lockCard');
  const t=[card,lock].find(x=>x&&x.style.display==='block');
  const k=(t&&t.getBoundingClientRect().top<window.innerHeight*0.5)?'profiles':'calc';
  if(k!==navMainK){navMainK=k;if(!Object.values(TEAM_PAGES).some(id=>{const o=document.getElementById(id);return o&&o.style.display==='flex';}))setNav(null);}
},{passive:true});
