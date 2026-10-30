// ===== HỒ SƠ ĐỘI PHẠM NHÂN =====
const PROFILES_KEY='prison_profiles_v1';
const PROFILES_MAX=200;
function loadProfiles(){return readStore('profiles');}
function persistProfiles(list){
  if(!writeStore('profiles',list))
    showWarn(lockIsOpen()?'Không lưu được hồ sơ (bộ nhớ đầy).':'Hồ sơ đang khóa — vui lòng mở khóa bằng mã PIN.');
}
// ===== NÚT LẬT: Sao chép <-> Lưu hồ sơ =====
let flipIsSave=false;      // true khi đang ở trang Tra cứu giảm án
function setFlipAction(toSave){
  flipIsSave=!!toSave;
  const inner=document.getElementById('flipInner');
  if(inner)inner.classList.toggle('flipped',flipIsSave);
}
function onFlipAction(ev){
  if(flipIsSave)saveProfileFromRemission();
  else copyResultText(ev);
}

// Lưu hồ sơ ngay từ trang Tra cứu giảm án (lấy bản ghi lịch sử mới nhất)
let shownHistoryIdx=0;     // bản ghi lịch sử đang hiển thị trong popup kết quả
function saveProfileFromRemission(){
  if(!loadHistory().length){showWarn('Chưa có kết quả tính toán để lưu.');return}
  saveProfileFromHistory(shownHistoryIdx);
}

function saveProfileFromHistory(i,forcedName){
  if(!lockIsOpen()){openPin('unlock',()=>saveProfileFromHistory(i,forcedName));return;}
  const h=loadHistory()[i];
  if(!h){return}
  // Chưa có tên -> mở popup cho nhập tên rồi lưu
  if(!h.name&&!forcedName){openNamePrompt(i);return}
  if(forcedName)h.name=forcedName;
  // Đúng phạm nhân đang thao tác -> lấy thông tin mới nhất trên trang giảm án (ngày đến trại,
  // tiền án, Khoản 8, bảng xếp loại, kỳ giảm đã xét)
  if(prisonerKey(h.name,h.arrestDate)===rmCtx.key){
    captureRmCtx();
    h._prof=h._prof||{};
    RM_CTX_FIELDS.forEach(k=>{h._prof[k]=rmCtx[k];});
    h._prof.grades=JSON.parse(JSON.stringify(quarterGrades));
    if(pickedReduction)h._prof.picked=JSON.parse(JSON.stringify(pickedReduction));
  }
  const list=loadProfiles();
  const idx=list.findIndex(p=>p.name===h.name&&p.arrestDate===h.arrestDate);
  const prof={
    name:h.name, arrestDate:h.arrestDate, sentence:h.sentence, preDet:h.preDet,
    remission:h.remission, release:h.release, served:h.served, remaining:h.remaining,
    m25:h.m25, m33:h.m33, m50:h.m50, refDate:h.refDate, escape:h.escape,
    calcMode:(h.calcMode==='qlpn'||h.calcMode==='thuc')?h.calcMode:undefined,
    saved:new Date().toLocaleString('vi-VN'), data:h._prof||null
  };
  let over=false;
  if(idx>=0){list[idx]=prof;}
  else{
    if(list.length>=PROFILES_MAX){
      showWarn('Đã đạt tối đa '+PROFILES_MAX+' hồ sơ. Vui lòng xóa bớt hồ sơ cũ trước khi lưu thêm.');
      return;
    }
    list.unshift(prof);
  }
  persistProfiles(list);
  renderProfiles();
  const doneMsg=idx>=0?('Đã cập nhật hồ sơ: '+h.name):('Đã lưu hồ sơ: '+h.name);
  if(!(idx<0&&list.length===1&&maybePromptPin(doneMsg+'.')))showWarn(doneMsg);
}
// Popup nhập tên khi lưu hồ sơ mà bản ghi chưa có tên
let namePromptIdx=null;
function openNamePrompt(i){
  namePromptIdx=i;
  const inp=document.getElementById('namePromptInput');
  if(inp)inp.value='';
  document.getElementById('namePromptOverlay').style.display='flex';
  setTimeout(()=>{if(inp)inp.focus();},120);
}
function closeNamePrompt(){
  document.getElementById('namePromptOverlay').style.display='none';
  namePromptIdx=null;
}
function confirmNamePrompt(){
  const inp=document.getElementById('namePromptInput');
  const nm=(inp&&inp.value||'').trim();
  if(!nm){showWarn('Vui lòng nhập tên phạm nhân.');return}
  const i=namePromptIdx;
  // Ghi tên vào bản ghi lịch sử để lần sau không phải nhập lại
  try{
    const hs=loadHistory();
    if(hs[i]){
      if(rmCtx.key===prisonerKey(hs[i].name,hs[i].arrestDate))rmCtx.key=prisonerKey(nm,hs[i].arrestDate);
      hs[i].name=nm;writeStore('history',hs);renderHistory();
    }
  }catch(e){}
  closeNamePrompt();
  saveProfileFromHistory(i,nm);
}

function deleteProfile(i){
  const list=loadProfiles();
  const p=list[i];
  if(!p)return;
  askConfirm('Xóa hồ sơ '+(p.name||'phạm nhân này')+'?','Xóa',function(){
    const cur=loadProfiles();
    cur.splice(i,1);
    persistProfiles(cur);
    renderProfiles();
  });
}
function clearProfiles(){
  askConfirm('Xóa toàn bộ hồ sơ đã lưu?','Xóa hết',function(){
    persistProfiles([]);
    renderProfiles();
  });
}
// Đọc chuỗi ngày dd/mm/yyyy -> Date
function parseVnDate(v){
  const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec((v||'').trim());
  if(!m)return null;
  const d=new Date(+m[3],+m[2]-1,+m[1]);
  return isNaN(d.getTime())?null:d;
}

// ===== CẬP NHẬT HỒ SƠ THEO THỜI GIAN THỰC =====
// Hồ sơ chỉ lưu kết quả dạng chữ tại thời điểm lưu. Mỗi lần hiển thị/xuất, các thông số được
// TÍNH LẠI theo NGÀY HIỆN TẠI (không theo "Ngày giả định") bằng đúng các hàm của màn hình tính toán:
//   - Thời gian đã chấp hành, Thời gian còn lại, Tính đến ngày, bảng xếp loại quý: theo ngày hiện tại
//   - Ngày hết án, mốc 1/4 - 1/3 - 1/2: theo logic tính hiện hành (hồ sơ cũ được tự sửa nếu trước đây tính sai)
function profileToday(){const d=new Date();d.setHours(0,0,0,0);return d;}

// Đọc chuỗi do fmtDays tạo ra ("2 năm 2 tháng 20 ngày", "0 ngày") -> {months, days}.
// Chuỗi không đúng định dạng -> null (giữ nguyên hồ sơ, không tính lại).
function parseYMDText(t){
  const s=String(t==null?'':t).normalize('NFC').trim();
  if(!s)return null;
  const re=/(\d+)\s*(năm|tháng|ngày)/g;
  let m, y=0, mo=0, d=0, n=0;
  while((m=re.exec(s))){n++; if(m[2]==='năm')y=+m[1]; else if(m[2]==='tháng')mo=+m[1]; else d=+m[1];}
  if(!n||s.replace(re,'').trim()!=='')return null;
  return {months:y*12+mo, days:d};
}

// Xếp loại thực tế từng quý của hồ sơ: quý chọn tay + tự xếp theo Điều 25, 26 (Khoản 8, 9 đã lưu)
function profileGradeFn(d,arrival,today){
  const auto=autoGrades({arrival, today, k8on:!!d.k8on,
    k8dec:d.k8on?parseStrictDateText(d.k8dec):null, k8ok:d.k8on?parseStrictDateText(d.k8date):null,
    k9on:!!d.k9on});
  const manual=d.grades||{};
  return key=>effectiveGrade(key,manual,auto);
}
// Tính các thông số "sống" của 1 hồ sơ tại ngày today. Trả về null nếu thiếu dữ liệu.
// Dùng đúng lõi tính của màn hình tính toán (computeSentence).
function liveProfileValues(p,today){
  const arrest=parseVnDate(p.arrestDate);
  const sen=parseYMDText(p.sentence);
  const pd=p.preDet?parseYMDText(p.preDet):{months:0,days:0};
  const rm=p.remission?parseYMDText(p.remission):{months:0,days:0};
  if(!arrest||!sen||!pd||!rm||rm.days)return null;   // giảm án chỉ có năm/tháng
  const inp={name:p.name, arrestDate:arrest, sentMonths:sen.months, sD:sen.days,
             preDetMonths:pd.months, pdD:pd.days, remMonths:rm.months, remissionsSnapshot:[]};
  const escRows=p.data&&Array.isArray(p.data.escapes)?p.data.escapes:[];
  if(escRows.length){
    const er=parseEscapeRows(escRows,arrest);
    if(er.error)return null;
    if(er.list.length)inp.escapes=er.list;
  }
  const mode=resolveCalcMode(p.calcMode,
    m=>escShift(calcRelease(arrest,inp.sentMonths,inp.sD,inp.preDetMonths+inp.remMonths,inp.pdD,m),inp.escapes,m),p.release);
  const r=computeSentence(inp,today,mode);
  return {
    calcMode:mode,
    release:fmtDate(r.releaseDate),
    served:fmtDaysFull(r.servedDiff),
    remaining:fmtDaysFull(r.remainingDiff),
    m25:fmtDate(r.m25),
    m33:fmtDate(r.m33),
    m50:fmtDate(r.m50),
    refDate:fmtDate(today)
  };
}

// Tính lại toàn bộ hồ sơ theo ngày hiện tại và ghi lại vào bộ nhớ (chỉ ghi khi có thay đổi).
// Giữ nguyên thứ tự trong mảng lưu trữ, nên chỉ số i dùng cho xóa/mở hồ sơ không bị lệch.
const PROFILE_LIVE_FIELDS=['calcMode','release','served','remaining','m25','m33','m50','refDate'];
let profLiveDay=null;
function refreshProfiles(){
  const list=loadProfiles();
  const today=profileToday();
  profLiveDay=today.getTime();
  let changed=false;
  list.forEach(p=>{
    if(!p)return;
    const live=liveProfileValues(p,today);
    if(!live)return;
    PROFILE_LIVE_FIELDS.forEach(k=>{if(p[k]!==live[k]){p[k]=live[k];changed=true;}});
  });
  if(changed)persistProfiles(list);
  return list;
}
// Tự làm mới khi sang ngày mới (app mở qua đêm, hoặc mở lại từ nền)
function profLiveTick(){
  if(profLiveDay===profileToday().getTime())return;
  renderProfiles();
  const ov=document.getElementById('profDetailOverlay');
  if(profDetailIdx!=null&&ov&&ov.style.display==='flex')openProfDetail(profDetailIdx);
}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)profLiveTick();});
window.addEventListener('focus',profLiveTick);
setInterval(profLiveTick,60000);

// Sắp xếp hồ sơ: sắp hết án (trong vòng 1 tháng) lên đầu — gần nhất trước;
// còn lại xếp theo tên A → Z.
function sortProfiles(ps){
  const today=profileToday();   // theo ngày hiện tại, đồng bộ với thông số hồ sơ
  const limit=new Date(today.getFullYear(),today.getMonth()+1,today.getDate()); // +1 tháng
  const arr=ps.map((p,idx)=>{
    const rel=parseVnDate(p.release);
    const soon = rel && rel>=today && rel<=limit;
    const days = rel ? Math.ceil((rel-today)/86400000) : null;
    return {p, idx, rel, soon, days};
  });
  arr.sort((a,b)=>{
    if(a.soon!==b.soon)return a.soon?-1:1;            // sắp hết án lên trước
    if(a.soon&&b.soon)return a.rel-b.rel;             // gần hết án nhất lên trên
    return (a.p.name||'').localeCompare(b.p.name||'','vi',{sensitivity:'base'});
  });
  return arr;
}
function renderProfiles(){
  const card=document.getElementById('profileCard');
  const list=document.getElementById('profileList');
  const cnt=document.getElementById('profileCount');
  if(!card||!list)return;
  if(renderLockCard()){card.style.display='none';return;}
  const ps=refreshProfiles();   // cập nhật thông số theo ngày hiện tại
  if(!ps.length){card.style.display='none';return;}
  card.style.display='block';
  if(cnt)cnt.textContent=' ('+ps.length+'/'+PROFILES_MAX+')';
  list.innerHTML=backupReminderHTML()+sortProfiles(ps).map(o=>{
    const p=o.p, i=o.idx;   // i là vị trí GỐC trong mảng lưu trữ
    const badge=o.soon
      ? '<span class="prof-soon">Sắp hết án · còn '+o.days+' ngày</span>'
      : '';
    return `
    <div class="history-item${o.soon?' prof-item-soon':''}" onclick="openProfDetail(${i})">
      <div class="history-item-top">
        <span class="history-item-name" style="margin:0">👤 ${escHtml(p.name)}${badge}</span>
        <button class="history-item-del" onclick="event.stopPropagation();deleteProfile(${i})" title="Xóa"><svg class="ic-trash" aria-hidden="true"><use href="#ic-trash"/></svg></button>
      </div>
      <div class="history-item-row"><span class="lbl">Ngày bắt</span><span class="val">${escHtml(p.arrestDate)}</span></div>
      <div class="history-item-row"><span class="lbl">Án phạt</span><span class="val">${escHtml(p.sentence)}</span></div>
      <div class="history-item-row"><span class="lbl">Ngày hết án</span><span class="val" style="color:#7f1d1d">${escHtml(p.release)}</span></div>
      <div class="history-item-foot">
        <span class="history-item-tap-hint">Bấm để xem chi tiết →</span>
        <button class="btn-save-prof" onclick="event.stopPropagation();loadProfile(${i})">Mở lại</button>
      </div>
    </div>`;
  }).join('');
}

// ===== POPUP CHI TIẾT HỒ SƠ PHẠM NHÂN =====
let profDetailIdx=null;
function openProfDetail(i){
  const p=refreshProfiles()[i];   // cập nhật thông số theo ngày hiện tại
  if(!p)return;
  profDetailIdx=i;
  const d=p.data||{};
  const lr=liveProfileCompute(p,profileToday());
  const row=(l,v,color)=>v?('<div class="rm-row"><span class="rm-lbl">'+l+'</span><span class="rm-val"'
      +(color?(' style="color:'+color+'"'):'')+'>'+escHtml(String(v))+'</span></div>'):'';

  // Các kỳ giảm án kèm mức giảm
  let remBlock='';
  const rems=(d.remissions||[]).filter(r=>(r.years||0)||(r.months||0));
  if(rems.length){
    remBlock='<div class="rm-card"><div class="pd-sub">Các kỳ giảm án</div>'
      + rems.map((r,k)=>{
          const amt=((r.years||0)?((r.years)+' năm '):'')+((r.months||0)?((r.months)+' tháng'):'');
          return '<div class="rm-row"><span class="rm-lbl">Kỳ '+(k+1)+'</span><span class="rm-val">'+escHtml(amt.trim())+'</span></div>';
        }).join('')
      + row('Tổng đã giảm',p.remission)
      + (d.picked&&d.picked.label?('<div class="rm-row"><span class="rm-lbl">Kỳ đã được xét</span><span class="rm-val" style="color:#2b5f9e">'+escHtml(d.picked.label)+'</span></div>'):'')
      + '</div>';
  }

  // Thời gian trốn/tạm đình chỉ
  let escBlock='';
  if(Array.isArray(d.escapes)&&d.escapes.length){
    const er=parseEscapeRows(d.escapes,parseVnDate(p.arrestDate));
    const lst=er.list||d.escapes.map((r,k)=>({n:k+1,txt:r.from+' – '+r.to}));
    escBlock='<div class="rm-card esc-pd"><div class="pd-sub">Thời gian trốn/tạm đình chỉ</div>'
      + lst.map(q=>row('Lần '+q.n,q.txt||(fmtDate(q.from)+' – '+fmtDate(q.to)+' ('+ymdText(q.dur)+')'))).join('')
      + row('Tổng',p.escape||(er.list?ymdText(sumYMD(er.list.map(q=>q.dur))):''),'#c2410c')
      + '</div>';
  }

  // Bảng kết quả xếp loại thi đua (đã áp Điều 25, 26 giống trang Tra cứu giảm án)
  let gradeBlock='';
  const arr=parseStrictDateText(d.arrival);
  if(arr){
    const refD=profileToday();   // xét quý tính đến ngày hiện tại
    const qs=completedQuarters(arr,refD);
    if(qs.length){
      const gradeOfP=profileGradeFn(d,arr,refD);
      const st=gradeStats(qs,gradeOfP);
      gradeBlock='<div class="rm-card"><div class="pd-sub">Kết quả xếp loại thi đua</div>'
        + row('Ngày đến trại',d.arrival)
        + '<div class="qgrid-wrap" style="margin-top:8px">'+gradeTableHTML(qs,gradeOfP,false)+'</div>'
        + '<div class="qgrid-sum">Tổng <b>'+st.total+' quý</b> Khá trở lên / '+qs.length+' quý · Liền kề gần nhất: <b>'+st.adj+' quý</b></div>'
        + '</div>';
    }else{
      // Có Ngày đến trại nhưng tính đến ngày tham chiếu chưa có quý nào đủ điều kiện xếp loại
      // -> thống nhất với card "Kết quả xếp loại thi đua" ở màn hình tính toán.
      gradeBlock='<div class="rm-card"><div class="pd-sub">Kết quả xếp loại thi đua</div>'
        + row('Ngày đến trại',d.arrival)
        + '<div class="qgrid-none">Chưa đủ thời gian xếp loại Quý</div>'
        + '</div>';
    }
  }

  // Kỷ luật (Khoản 8)
  let discBlock='';
  if(d.k8on){
    const t=(d.k8type==='5')?'Giam tại buồng kỷ luật (cần 05 quý liền kề)'
           :(d.k8type==='4')?'Khiển trách 02 lần hoặc cảnh cáo (cần 04 quý liền kề)':'Có bị kỷ luật';
    discBlock='<div class="rm-card"><div class="pd-sub">Kỷ luật (Khoản 8)</div>'
      + row('Hình thức',t)
      + row('Ngày ra QĐ kỷ luật',d.k8dec)
      + row('Ngày công nhận tiến bộ',d.k8date)
      + '</div>';
  }
  // Phạm tội mới (Khoản 9, 10)
  if(d.k9on){
    const t=(d.k9type==='9')?'Khoản 9 — Tội ít nghiêm trọng do cố ý (≥ 1/2 mức hình phạt chung)'
           :(d.k9type==='10')?('Khoản 10 — Tội nghiêm trọng trở lên ('+(d.k9life?'tù chung thân: mốc 25 năm':'≥ 2/3 mức hình phạt chung')+')')
           :'Chưa chọn loại tội phạm mới';
    discBlock+='<div class="rm-card"><div class="pd-sub">Phạm tội mới (Khoản 9, 10)</div>'
      + row('Loại tội phạm mới',t)
      + '</div>';
  }

  document.getElementById('profDetailBody').innerHTML=
    '<div class="result-header" style="margin-bottom:12px">Hồ sơ phạm nhân</div>'
    + '<div class="pd-name">👤 '+escHtml(p.name)+'</div>'
    + '<div class="rm-card">'
      + row('Ngày bắt',p.arrestDate)
      + row('Mức án',p.sentence)
      + row('Thời gian tạm giam',p.preDet)
      + row('Số tiền án',(d.penalty&&+d.penalty)?(d.penalty+' tiền án'):'Không có')
      + (d.minor?'<div class="rm-row"><span class="rm-lbl">Đối tượng</span><span class="rm-val" style="color:#9b6a0a">Người chưa thành niên (Điều 123)</span></div>':'')
    + '</div>'
    + remBlock
    + escBlock
    + '<div class="rm-card">'
      + row('Ngày hết án dự kiến',p.release,'#7f1d1d')
      + row('Thời gian đã chấp hành',p.served)
      + row('Thời gian còn lại',p.remaining)
      + row('Tính đến ngày',p.refDate)
    + '</div>'
    + '<div class="rm-card"><div class="pd-sub">Mốc thời gian chấp hành án</div>'
      + row('Đạt 1/4 mức án',p.m25)
      + row('Đạt 1/3 mức án',p.m33)
      + row('Đạt 1/2 mức án',p.m50)
    + '</div>'
    + (lr?('<div class="rm-card"><div class="pd-sub">Dòng thời gian</div><div class="pd-tl">'+timelineHTML(lr)+'</div></div>'):'')
    + gradeBlock
    + discBlock
    + '<p class="annex-note" style="margin-top:4px">Hồ sơ lưu lúc '+escHtml(p.saved||'')+'</p>';
  document.getElementById('profDetailOverlay').style.display='flex';
}
function closeProfDetail(){
  document.getElementById('profDetailOverlay').style.display='none';
  profDetailIdx=null;
}
function editFromDetail(){
  const i=profDetailIdx;
  closeProfDetail();
  if(i!=null)loadProfile(i);
}

// Nạp hồ sơ trở lại form để tính tiếp
function loadProfile(i){
  const p=sanitizeProfile(loadProfiles()[i]);
  if(!p||!p.data){showWarn('Hồ sơ này chưa có dữ liệu chi tiết.');return}
  const d=p.data;
  const set=(id,v)=>{const el=document.getElementById(id);if(el){el.value=v||'';toggleClearBtn&&el.parentElement&&el.parentElement.querySelector('.input-clear-btn')&&toggleClearBtn(el);}};
  set('prisonerName',p.name);
  set('arrestDateText',d.arrestText);
  set('sY',d.sY); set('sM',d.sM); set('sD',d.sD);
  set('pdY',d.pdY); set('pdM',d.pdM); set('pdD',d.pdD);
  remissions=(d.remissions&&d.remissions.length)?JSON.parse(JSON.stringify(d.remissions)):[{years:0,months:0}];
  pickedReduction=d.picked?JSON.parse(JSON.stringify(d.picked)):null;
  k7PickShown=!!d.picked;
  escapes=(Array.isArray(d.escapes)&&d.escapes.length)?JSON.parse(JSON.stringify(d.escapes)):[];
  escOwner=escapes.length?prisonerKey(p.name,p.arrestDate):null;
  renderEscSummary();
  quarterGrades=d.grades?JSON.parse(JSON.stringify(d.grades)):{};
  rmCtx=Object.assign(emptyRmCtx(prisonerKey(p.name,p.arrestDate)),{
    arrival:d.arrival||'', penalty:d.penalty||'', minor:!!d.minor,
    k8on:!!d.k8on, k8type:d.k8type||'', k8date:d.k8date||'', k8dec:d.k8dec||'',
    k9on:!!d.k9on, k9type:d.k9type||'', k9life:!!d.k9life});
  renderRemissions();
  updatePickChip();
  window.scrollTo({top:0,behavior:'smooth'});
  showWarn('Đã mở hồ sơ: '+p.name+'. Bấm "Tính án phạt" để xem kết quả.');
}