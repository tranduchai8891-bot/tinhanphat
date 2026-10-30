// ===== KẾT QUẢ TÍNH ÁN =====
// Tách làm 3 bước dùng chung cho: nút "Tính án phạt", đổi chế độ tính ngày lẻ, xem lại lịch sử.
//   computeSentence() : tính toàn bộ số liệu (thuần, không đụng giao diện)
//   renderResult()    : đưa số liệu lên popup "Kết quả tính toán"
//   buildResultText() : văn bản dùng cho nút Sao chép

const CALC_MODE_NAME={qlpn:'Áp dụng theo phần mềm QLPN cũ', thuc:'Áp dụng theo phần mềm QLPN mới'};

// inp : {name, arrestDate, sentMonths, sD, preDetMonths, pdD, remMonths, remissionsSnapshot:[{months}],
//        escapes:[{from,to,dur,n}] (không bắt buộc) — các lần trốn/tạm đình chỉ}
// today: ngày tham chiếu; mode: 'qlpn' | 'thuc'
function computeSentence(inp,today,mode){
  const arrestDate=inp.arrestDate, sentMonths=inp.sentMonths, sD=inp.sD;
  const preDetMonths=inp.preDetMonths, pdD=inp.pdD;
  const totalDeductMonths=preDetMonths+inp.remMonths;
  const totalDeductDays=pdD;   // chỉ tạm giam có ngày lẻ; giảm án theo kỳ chỉ có năm/tháng
  const releaseDate=calcRelease(arrestDate,sentMonths,sD,totalDeductMonths,totalDeductDays,mode);
  const totalSentenceMs=calcRelease(arrestDate,sentMonths,sD,0,0,mode)-arrestDate;
  const elapsedMs=Math.max(0,today-arrestDate);
  const pct=Math.min(100,Math.round(elapsedMs/Math.max(1,totalSentenceMs)*100));
  const left=Math.max(0,Math.ceil((releaseDate-today)/86400000));
  // "Thời hạn còn lại": từ ngày tham chiếu đến ngày hết án
  const remainingDiff=releaseDate>today?calendarDiffMinus1(today,releaseDate):{years:0,months:0,days:0};
  // "Thời gian đã chấp hành": từ ngày bắt đến ngày tham chiếu (ngày bắt là ngày chấp hành thứ 1),
  // cộng thêm thời gian tạm giam (tạm giam được tính là đã chấp hành), quy ước 1 tháng = 30 ngày
  const servedFromArrest=today>=arrestDate?calcServedTime(arrestDate,today):{years:0,months:0,days:0};
  const servedDiff=addYMD(servedFromArrest,{years:Math.floor(preDetMonths/12),months:preDetMonths%12,days:pdD});
  // Mốc 1/4, 1/3, 1/2 so với MỨC ÁN BAN ĐẦU (có trừ tạm giam, không trừ giảm án)
  const m25=calcMilestoneDate(arrestDate,sentMonths,sD,4,preDetMonths,pdD);
  const m33=calcMilestoneDate(arrestDate,sentMonths,sD,3,preDetMonths,pdD);
  const m50=calcMilestoneDate(arrestDate,sentMonths,sD,2,preDetMonths,pdD);
  if(inp.escapes&&inp.escapes.length){
    // Có trốn/tạm đình chỉ: thời gian đó không được tính là đã chấp hành
    const rel=escShift(releaseDate,inp.escapes,mode), Z={years:0,months:0,days:0};
    const esc=inp.escapes.filter(p=>p.from<rel);   // lần bắt đầu từ ngày hết án trở đi: không áp dụng (tính án sẽ báo lỗi)
    const servedNet=subYMD(servedFromArrest,sumYMD(esc.map(p=>escPart(p,today,true))));
    const remain=rel>today?subYMD(calendarDiffMinus1(today,rel),sumYMD(esc.map(p=>escPart(p,today,false)))):Z;
    return {inp,today,mode,arrestDate,sentMonths,sD,preDetMonths,pdD,remMonths:inp.remMonths,
            totalDeductMonths,totalDeductDays,releaseDate:rel,
            pct:Math.min(100,Math.round(Math.max(0,elapsedMs-escMsBefore(esc,today))/Math.max(1,totalSentenceMs)*100)),
            left:Math.max(0,Math.ceil((rel-today)/86400000)),
            remainingDiff:remain,
            servedDiff:addYMD(servedNet,{years:Math.floor(preDetMonths/12),months:preDetMonths%12,days:pdD}),
            m25:escShift(m25,inp.escapes),m33:escShift(m33,inp.escapes),m50:escShift(m50,inp.escapes),
            esc:inp.escapes,escTotal:sumYMD(esc.map(p=>p.dur))};
  }
  return {inp,today,mode,arrestDate,sentMonths,sD,preDetMonths,pdD,remMonths:inp.remMonths,
          totalDeductMonths,totalDeductDays,releaseDate,pct,left,remainingDiff,servedDiff,m25,m33,m50};
}

// Chế độ tính ngày lẻ của một bản ghi đã lưu (lịch sử, hồ sơ): dùng chế độ ghi kèm bản ghi.
// Bản ghi cũ chưa ghi chế độ -> suy ra từ ngày hết án đã lưu (chế độ nào cho ra đúng ngày đó),
// không khớp chế độ nào -> dùng chế độ mặc định.
function resolveCalcMode(saved,releaseOf,savedReleaseText){
  if(saved==='qlpn'||saved==='thuc')return saved;
  const alt=CALC_MODE_DEFAULT==='thuc'?'qlpn':'thuc';
  return [CALC_MODE_DEFAULT,alt].find(m=>fmtDate(releaseOf(m))===savedReleaseText)||CALC_MODE_DEFAULT;
}

function buildResultText(res){
  return `KẾT QUẢ TÍNH THỜI HẠN CHẤP HÀNH ÁN
(Tính đến ngày ${fmtDate(res.today)})
Cách tính: ${CALC_MODE_NAME[res.mode]}
------------------------------
Ngày bắt giam: ${fmtDate(res.arrestDate)}
Mức án ban đầu: ${fmtDays(res.sentMonths,res.sD)}
Trừ tạm giam: ${fmtDays(res.preDetMonths,res.pdD)}
Tổng được giảm: ${fmtDays(res.totalDeductMonths,res.totalDeductDays)}${escResultLines(res)}
Mốc đạt 1/4 mức án: ${fmtDate(res.m25)}
Mốc đạt 1/3 mức án: ${fmtDate(res.m33)}
Mốc đạt 1/2 mức án: ${fmtDate(res.m50)}
Thời gian đã chấp hành: ${fmtDaysFull(res.servedDiff)}
Thời hạn còn lại: ${fmtDaysFull(res.remainingDiff)}
Ngày hết án dự kiến: ${fmtDate(res.releaseDate)}`;
}

// Các dòng trốn/tạm đình chỉ trong văn bản kết quả (không có thì để trống)
function escResultLines(res){
  if(!res.esc)return '';
  return '\nThời gian trốn/tạm đình chỉ: '+ymdText(res.escTotal)+' ('+res.esc.length+' lần)'
    +res.esc.map(p=>'\n  Lần '+p.n+': '+fmtDate(p.from)+' - '+fmtDate(p.to)+' ('+ymdText(p.dur)+')').join('');
}

// opt.keepProgress = true: đang xem kết quả và đổi chế độ -> thanh tiến độ chạy tiếp từ vị trí hiện tại.
// Mặc định: đưa thanh tiến độ về 0%, openModal() sẽ chạy hiệu ứng tới giá trị đích.
function renderResult(res,opt){
  opt=opt||{};
  const setText=(id,t)=>{document.getElementById(id).textContent=t;};
  const nameEl=document.getElementById('resultName');
  if(res.inp.name){nameEl.textContent=res.inp.name;nameEl.style.display='flex';}
  else{nameEl.textContent='';nameEl.style.display='none';}
  setText('r-arrest',fmtDate(res.arrestDate));
  setText('r-original',fmtDays(res.sentMonths,res.sD));
  renderCrimeClass(res.sentMonths,res.sD);
  setText('r-reduced',fmtDays(res.totalDeductMonths,res.totalDeductDays));
  setText('r-served',fmtDaysFull(res.servedDiff));
  setText('r-remaining',fmtDaysFull(res.remainingDiff));
  setText('r-release',fmtDate(res.releaseDate));
  // Thẻ trốn/tạm đình chỉ: chỉ dựng khi có
  const oldEsc=document.getElementById('r-esc-card'); if(oldEsc)oldEsc.remove();
  if(res.esc){
    document.getElementById('r-remaining').closest('.result-grid').insertAdjacentHTML('beforeend',
      '<div class="metric full esc" id="r-esc-card"><div class="lbl">Thời gian trốn/tạm đình chỉ</div>'
      +'<div class="val">'+ymdText(res.escTotal)+' · '+res.esc.length+' lần</div></div>');
  }

  lastProgressPct=res.pct;
  const bar=document.getElementById('progressBar');
  if(opt.keepProgress){
    bar.style.transition='width .8s cubic-bezier(.4,0,.2,1)';
    bar.style.width=res.pct+'%';
    setText('progressPct','Đã chấp hành: '+res.pct+'%');
  }else{
    bar.style.transition='none';
    bar.style.width='0%';
    setText('progressPct','Đã chấp hành: 0%');
  }
  setText('progressDaysLeft',res.left>0?('Còn '+fmtDaysFull(res.remainingDiff)):'✅ Đã hết án');

  setText('m-25',fmtDate(res.m25));
  setText('m-33',fmtDate(res.m33));
  setText('m-50',fmtDate(res.m50));

  // Đợt xét giảm án đủ điều kiện thời gian (mốc 1/3 có trừ tạm giam, đối chiếu 3 đợt xét/năm)
  const oneThirdDate=escShift(calcOneThirdDate(res.arrestDate,res.sentMonths,res.sD,res.preDetMonths,res.pdD),res.esc);
  const eligibleReview=findEligibleReview(oneThirdDate);
  lastEligibleData={oneThirdDate, eligibleReview, today:res.today, sentMonths:res.sentMonths, sentExtraDays:res.sD,
                    arrestDate:res.arrestDate, preDetMonths:res.preDetMonths, preDetDays:res.pdD, esc:res.esc};
  setEligibleText(oneThirdDate,eligibleReview,res.today);

  updateAlert(res.left);
  setText('resultRefDate','(tính đến ngày '+fmtDate(res.today)+')');

  // Dòng thời gian
  document.getElementById('timeline').innerHTML=timelineHTML(res);

  lastResultText=buildResultText(res);
  lastCalcRaw=res;              // để tính lại khi đổi chế độ tính ngày lẻ
  syncCalcModeButtons();
}

// Đổi chế độ tính ngày lẻ khi đang xem kết quả
function recomputeByMode(){
  if(!lastCalcRaw)return;
  renderResult(computeSentence(lastCalcRaw.inp,lastCalcRaw.today,CALC_MODE),{keepProgress:true});
}

// Đọc "ngày/tháng/năm" người dùng nhập; năm 1-2 chữ số hiểu theo expandShortYear
// (past=true: ô chỉ có thể là ngày đã qua, ví dụ ngày bắt). Thiếu phần nào thì phần đó = 0.
function readDateParts(v,past){
  const p=String(v||'').split('/');
  let yRaw=(p[2]||'').replace(/\D/g,'');
  if(yRaw.length>=1&&yRaw.length<=2)yRaw=String(expandShortYear(yRaw,past));
  return {d:parseInt(p[0])||0, m:parseInt(p[1])||0, y:parseInt(yRaw)||0};
}

function calculate(){
  CALC_MODE=CALC_MODE_DEFAULT;   // mở kết quả ở chế độ mặc định đang đặt
  const prisonerName=(document.getElementById('prisonerName').value||'').trim();
  const a=readDateParts(document.getElementById('arrestDateText').value.trim(),true);
  const num=id=>parseInt(document.getElementById(id).value)||0;
  const sY=num('sY'), sM=num('sM'), sD=num('sD');
  const pdY=num('pdY'), pdM=num('pdM'), pdD=num('pdD');

  clearFieldErrors();
  if(!a.d||!a.m||!a.y){fieldError(['arrestDateText'],'Nhập đủ ngày/tháng/năm, ví dụ 01/12/2025.');return}
  if(a.m<1||a.m>12){fieldError(['arrestDateText'],'Tháng phải từ 1 đến 12.');return}
  if(a.d<1||a.d>31){fieldError(['arrestDateText'],'Ngày phải từ 1 đến 31.');return}
  if(a.y<1900||a.y>2100){fieldError(['arrestDateText'],'Năm không hợp lệ.');return}
  const p2=n=>String(n).padStart(2,'0'), dim=(m,y)=>new Date(y,m,0).getDate();
  if(a.d>dim(a.m,a.y)){fieldError(['arrestDateText'],'Ngày '+p2(a.d)+'/'+p2(a.m)+'/'+a.y+' không có thật — tháng '+a.m+'/'+a.y+' chỉ có '+dim(a.m,a.y)+' ngày.');return}
  if(!sY&&!sM&&!sD){fieldError(['sY','sM','sD'],'Nhập mức án (năm, tháng hoặc ngày).');return}
  if(refMode==='custom'){
    const rv=document.getElementById('refDate').value.trim();
    const rp=rv.split('/');
    if(!rv||rp.length<3||!parseInt(rp[2])){fieldError(['refDate'],'Nhập ngày giả định, ví dụ 17/06/2026.');return}
    const r=readDateParts(rv);
    if(r.m<1||r.m>12||r.d<1||r.y<1900||r.y>2100||r.d>dim(r.m,r.y)){fieldError(['refDate'],'Ngày giả định '+rv+' không có thật.');return}
  }
  // Ngày bắt phải từ ngày tính trở về trước (thường do gõ nhầm năm, ví dụ 2084 thay cho 1984)
  const arrD=new Date(a.y,a.m-1,a.d), refD=getRefDate();
  if(arrD>refD){
    const custom=refMode==='custom';
    fieldError(custom?['arrestDateText','refDate']:['arrestDateText'],
      'Ngày bắt '+fmtDate(arrD)+' sau '+(custom?'ngày giả định ':'ngày hôm nay ')+fmtDate(refD)+'. Kiểm tra lại năm.');
    return}

  // Đã nhập kỳ giảm đầu tiên mà chưa được hỏi -> hiện popup chọn kỳ giảm trước
  if(!k7PickShown && !pickedReduction && remissions[0] && ((remissions[0].years||0)||(remissions[0].months||0))){
    pendingCalcAfterPick=true;
    openK7Pick();
    return;
  }

  const inp={
    name:prisonerName,
    arrestDate:new Date(a.y,a.m-1,a.d),
    sentMonths:toMonths(sY,sM), sD,
    preDetMonths:toMonths(pdY,pdM), pdD,
    remMonths:remissions.reduce((s,r)=>s+((r.years||0)*12+(r.months||0)),0),
    remissionsSnapshot:remissions.map(r=>({months:(r.years||0)*12+(r.months||0)}))
  };
  // Dữ liệu trốn/tạm đình chỉ thuộc về phạm nhân đã nhập nó; tính cho phạm nhân khác thì hỏi lại trước
  const key=prisonerKey(inp.name,fmtDate(inp.arrestDate));
  const er=parseEscapeRows(escapes,inp.arrestDate);
  if(escapes.length){
    if(escOwner&&escOwner!==key){
      const o=escOwner.split('|');
      askConfirm('Các lần trốn/tạm đình chỉ đang nhập là của phạm nhân '+(o[0]||'(chưa có tên)')+' (bắt '+o[1]+'). Áp dụng cho phạm nhân đang tính?',
        'Áp dụng',()=>{escOwner=key;calculate();});
      return;
    }
    if(er.error){showWarn('Thời gian trốn/tạm đình chỉ — '+er.error);return}
    escOwner=key;
    if(er.list.length)inp.escapes=er.list;
  }
  const res=computeSentence(inp,getRefDate(),CALC_MODE);
  const late=res.esc&&res.esc.find(p=>p.from>=res.releaseDate);
  if(late){showWarn('Thời gian trốn/tạm đình chỉ — lần '+late.n+' bắt đầu '+fmtDate(late.from)
    +', từ hoặc sau ngày hết án '+fmtDate(res.releaseDate)+'. Vui lòng kiểm tra lại.');return}
  useRmContext(prisonerKey(inp.name,fmtDate(inp.arrestDate)));
  renderResult(res);
  openModal();
  saveToHistory(buildHistoryEntry(res));
  shownHistoryIdx=0;
}

// ----- Báo lỗi ngay dưới ô nhập: viền đỏ + một dòng chữ, tự hết khi sửa ô -----
function fieldError(ids,msg){
  const els=ids.map(id=>document.getElementById(id)).filter(Boolean);
  if(!els.length){showWarn(msg);return}
  els.forEach(el=>el.classList.add('invalid'));
  const field=els[0].closest('.field');
  if(field){const m=document.createElement('div');m.className='field-err';m.setAttribute('role','alert');m.textContent=msg;field.appendChild(m);}
  els[0].scrollIntoView({block:'center',behavior:'smooth'});
  setTimeout(()=>{try{els[0].focus({preventScroll:true});}catch(e){}},250);
}
function clearFieldErrors(field){
  const root=field||document;
  root.querySelectorAll('.field-err').forEach(m=>m.remove());
  root.querySelectorAll('.invalid').forEach(el=>el.classList.remove('invalid'));
}
document.addEventListener('input',e=>{
  const t=e.target;
  if(t&&t.classList&&t.classList.contains('invalid')){const f=t.closest('.field');clearFieldErrors(f||undefined);}
});

// Bản ghi lịch sử của một lần tính
function buildHistoryEntry(res){
  const val=id=>{const el=document.getElementById(id);return el?el.value:'';};
  return {
    time:new Date().toLocaleString('vi-VN'),
    name:res.inp.name,
    refDate:fmtDate(res.today),
    arrestDate:fmtDate(res.arrestDate),
    sentence:fmtDays(res.sentMonths,res.sD),
    preDet:fmtDays(res.preDetMonths,res.pdD),
    remission:fmtDays(res.remMonths,0),
    m25:fmtDate(res.m25),
    m33:fmtDate(res.m33),
    m50:fmtDate(res.m50),
    served:fmtDaysFull(res.servedDiff),
    remaining:fmtDaysFull(res.remainingDiff),
    release:fmtDate(res.releaseDate),
    escape:res.esc?ymdText(res.escTotal):undefined,
    calcMode:res.mode,   // chế độ tính ngày lẻ đã dùng cho ngày hết án ở trên
    // Dữ liệu nhập để lưu vào Hồ sơ phạm nhân / mở lại hồ sơ
    _prof:{
      arrestText:val('arrestDateText')||'',
      sY:val('sY')||'', sM:val('sM')||'', sD:val('sD')||'',
      pdY:val('pdY')||'', pdM:val('pdM')||'', pdD:val('pdD')||'',
      remissions:JSON.parse(JSON.stringify(remissions)),
      escapes:res.esc?res.esc.map(p=>({from:fmtDate(p.from),to:fmtDate(p.to)})):undefined,
      picked:pickedReduction?JSON.parse(JSON.stringify(pickedReduction)):null,
      arrival:rmCtx.arrival,
      penalty:rmCtx.penalty,
      minor:rmCtx.minor,
      k8on:rmCtx.k8on,
      k8type:rmCtx.k8type,
      k8date:rmCtx.k8date,
      k8dec:rmCtx.k8dec,
      k9on:rmCtx.k9on,
      k9type:rmCtx.k9type,
      k9life:rmCtx.k9life,
      grades:JSON.parse(JSON.stringify(quarterGrades))
    },
    // Dữ liệu thô để dựng lại đầy đủ popup kết quả khi xem lại
    _raw:{
      name:res.inp.name,
      arrestISO:res.arrestDate.toISOString(),
      releaseISO:res.releaseDate.toISOString(),
      todayISO:res.today.toISOString(),
      sentMonths:res.sentMonths, sD:res.sD,
      preDetMonths:res.preDetMonths, pdD:res.pdD,
      totalDeductMonths:res.totalDeductMonths, totalDeductDays:res.totalDeductDays,
      remMonths:res.remMonths,
      pct:res.pct, left:res.left,
      servedDiff:res.servedDiff, remainingDiff:res.remainingDiff,
      remissionsSnapshot:res.inp.remissionsSnapshot,
      escapes:res.esc?res.esc.map(p=>({from:p.from.toISOString(),to:p.to.toISOString()})):undefined
    }
  };
}

let lastResultText='';
let lastEligibleData=null;

// Phân loại tội phạm theo Điều 9 BLHS 2015 (sửa đổi 2017), suy từ mức án đã tuyên.
// LƯU Ý: Điều 9 phân loại theo MỨC CAO NHẤT CỦA KHUNG HÌNH PHẠT của tội danh,
// không phải mức án tòa tuyên cho từng người -> kết quả ở đây chỉ mang tính tham khảo nhanh.
//   đến 03 năm            -> Ít nghiêm trọng
//   trên 03 năm  - 07 năm -> Nghiêm trọng
//   trên 07 năm  - 15 năm -> Rất nghiêm trọng
//   trên 15 năm           -> Đặc biệt nghiêm trọng
function crimeClass(sentMonths, extraDays){
  const total = (sentMonths||0) + ((extraDays||0) > 0 ? 0.001 : 0); // ngày lẻ vượt qua mốc tròn
  if(total<=0)return null;
  for(const [max,text,cls] of QUY_DINH.phanLoaiToi) if(total<=max)return {text,cls};
  const [text,cls]=QUY_DINH.phanLoaiCaoNhat;
  return {text,cls};
}

// Hiển thị nhãn phân loại tội phạm trên thẻ "Mức án ban đầu"
function renderCrimeClass(sentMonths, extraDays){
  const el=document.getElementById('r-class');
  if(!el)return;
  const c=crimeClass(sentMonths, extraDays);
  if(!c){el.className='metric-sub';el.textContent='';return;}
  el.className='metric-sub show '+c.cls;
  el.textContent=c.text;
}

// Yêu cầu xếp loại Khá liên tục theo mức án (bám bảng phụ lục Phần I.2)
function gradeRequirement(sentMonths){
  const y=sentMonths/12;
  for(const [over,q] of QUY_DINH.quyTheoMucAn) if(y>over)return {quarters:q, text:q+' quý'};
  return {quarters:QUY_DINH.quyToiThieu, text:'≥ '+QUY_DINH.quyToiThieu+' quý gần nhất'};
}

// Điều kiện xếp loại sau khi áp dụng KHOẢN 4 (trường hợp đặc biệt / người dưới 18 tuổi).
// Được coi là đủ số kỳ xếp loại nếu còn thiếu số quý đầu tiên theo mức án:
//   - Tù trên 15 năm trở lên: được thiếu 04 quý đầu
//   - Tù trên 05 năm đến 15 năm: được thiếu 02 quý đầu
//   - Tù trên 03 năm đến 05 năm: được thiếu 01 quý đầu
//   - Tù từ 03 năm trở xuống: chưa xếp loại vẫn được xem xét
function gradeRequirementPriority(sentMonths){
  const y=sentMonths/12;
  const base=gradeRequirement(sentMonths);
  for(const [over,miss] of QUY_DINH.quyDuocThieu)
    if(y>over)return {quarters:base.quarters-miss, text:(base.quarters-miss)+' quý (được thiếu '+pad2(miss)+' quý đầu)'};
  return {quarters:0, text:'Chưa xếp loại vẫn được xem xét'};
}

// Mở / thu gọn phụ lục điều kiện trong trang tra cứu giảm án
function toggleRmAnnex(){
  const box=document.getElementById('rmAnnexBox');
  const btn=document.getElementById('rmAnnexBtn');
  if(!box||!btn)return;
  const willOpen=(box.style.display==='none'||!box.style.display);
  btn.classList.toggle('open',willOpen);
  slideToggle(box,willOpen);
  if(willOpen){
    // Cuộn nhẹ để thấy phần vừa mở
    setTimeout(function(){btn.scrollIntoView({behavior:'smooth',block:'start'});},120);
  }
}
