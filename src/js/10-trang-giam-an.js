// ===== Hiệu ứng mở/thu gọn mượt cho các card Khoản 7, 8, 9-10 và phụ lục =====
const SLIDE_TR='max-height .30s cubic-bezier(.4,0,.2,1),opacity .24s ease,padding-top .30s ease,margin-top .30s ease';
function slideToggle(el,show){
  if(!el)return;
  clearTimeout(el._slideTimer);
  if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    el.style.transition=''; el.style.maxHeight=''; el.style.opacity='';
    el.style.paddingTop=''; el.style.marginTop=''; el.style.overflow='';
    el.style.display=show?'block':'none';
    return;
  }
  if(show){
    el.style.display='block';
    el.style.transition='none';
    el.style.maxHeight=''; el.style.opacity=''; el.style.paddingTop=''; el.style.marginTop=''; el.style.overflow='hidden';
    const cs=getComputedStyle(el);
    const pt=cs.paddingTop, mt=cs.marginTop, h=el.scrollHeight;
    el.style.maxHeight='0px'; el.style.opacity='0'; el.style.paddingTop='0px'; el.style.marginTop='0px';
    void el.offsetHeight;
    el.style.transition=SLIDE_TR;
    el.style.maxHeight=h+'px'; el.style.opacity='1'; el.style.paddingTop=pt; el.style.marginTop=mt;
    el._slideTimer=setTimeout(function(){
      el.style.maxHeight='none'; el.style.overflow='visible'; el.style.transition='';
    },320);
  }else{
    el.style.transition='none';
    el.style.overflow='hidden';
    el.style.maxHeight=el.scrollHeight+'px';
    void el.offsetHeight;
    el.style.transition=SLIDE_TR;
    el.style.maxHeight='0px'; el.style.opacity='0'; el.style.paddingTop='0px'; el.style.marginTop='0px';
    el._slideTimer=setTimeout(function(){
      el.style.display='none'; el.style.transition='';
    },320);
  }
}

// ===== Khoản 7: chọn kỳ giảm đã được xét =====
function buildK7Reviews(){
  const btn=document.getElementById('rmK7Btn'), list=document.getElementById('rmK7List');
  if(!btn||!list||!lastEligibleData)return;
  const e=lastEligibleData;
  // Liệt kê từ mốc 1/4 mức án để có đầy đủ các kỳ có thể đã được xét giảm
  const milestone=escShift(calcOneThirdDate(e.arrestDate,e.sentMonths,e.sentExtraDays,e.preDetMonths,e.preDetDays,QUY_DINH.mocChuaThanhNien),e.esc);
  const first=findEligibleReview(milestone);
  if(!first){list.innerHTML='<div class="k7-empty">Không xác định được đợt xét</div>';return;}
  const limit=e.today;
  const prev=btn.dataset.value;
  let y=first.year, idx=REVIEW_DATES.findIndex(r=>r.name===first.name);
  let html='',count=0,prevLabel='';
  for(let n=0;n<200;n++){
    const r=REVIEW_DATES[idx];
    const d=new Date(y,r.reviewMonth-1,r.reviewDay);
    if(d>limit)break;
    const val=String(d.getTime());
    const label=r.name+' (ngày xét '+fmtDate(d)+')';
    if(val===prev)prevLabel=label;
    html+='<div class="k7-opt'+(val===prev?' sel':'')+'" data-v="'+val+'" onclick="pickK7(this)">'
        + '<span>'+label+'</span></div>';
    count++;
    idx++; if(idx>=REVIEW_DATES.length){idx=0;y++;}
  }
  list.innerHTML = count?html:'<div class="k7-empty">Chưa có đợt xét nào sau khi đạt mốc</div>';
  btn.textContent = prevLabel || '— Chọn kỳ giảm —';
  btn.classList.toggle('has-value',!!prevLabel);
}
function toggleK7List(ev){
  if(ev)ev.stopPropagation();
  const l=document.getElementById('rmK7List');
  if(l)l.classList.toggle('open');
}
// Xóa một ô ngày trên trang giảm án rồi tính lại
function clearRmDate(id){
  const el=document.getElementById(id);
  if(!el)return;
  el.value=''; toggleClearBtn(el); refreshRemissionGrade(); el.focus();
}
function clearRmK7Date(){clearRmDate('rmK7Date');}
function getRmK7Date(){return readStrictDate('rmK7Date');}
function pickK7(el){
  k7AutoDone=true;          // người dùng tự chọn -> giữ nguyên lựa chọn đó
  const btn=document.getElementById('rmK7Btn'), list=document.getElementById('rmK7List');
  const di=document.getElementById('rmK7Date');
  if(di){di.value=fmtDate(new Date(parseInt(el.dataset.v)));toggleClearBtn(di);}
  btn.dataset.value=el.dataset.v;
  btn.textContent=el.querySelector('span').textContent;
  btn.classList.add('has-value');
  list.querySelectorAll('.k7-opt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');
  list.classList.remove('open');
  refreshRemissionGrade();
}
// ===== Tự suy đoán kỳ giảm đã được xét từ bảng Kết quả xếp loại thi đua =====
// Nguyên tắc: tìm đợt xét ĐÃ DIỄN RA gần nhất mà tại thời điểm đó phạm nhân
// đã tích lũy đủ số quý Khá liên tục theo yêu cầu -> đó là kỳ nhiều khả năng đã được giảm.
let k7AutoDone=false;      // chỉ tự điền 1 lần, sau đó tôn trọng lựa chọn của người dùng
// Duyệt lần lượt các kỳ giảm đã nhập để suy ra đợt xét của TỪNG kỳ.
// Kỳ 1: đợt sớm nhất đủ số quý Khá liên tục kể từ mốc 1/3 (hoặc 1/4).
// Kỳ 2 trở đi: đợt tiếp theo cách kỳ trước ít nhất 01 năm và đã tích đủ quý
//              theo Khoản 7 (liên tục Khá, hoặc >= 4 quý trong đó >= 2 quý liền kề).
// Trả về danh sách các đợt đã được giảm; phần tử cuối là kỳ giảm gần nhất.
function detectK7Series(){
  if(!lastEligibleData)return [];
  const n=(remissions||[]).filter(r=>(r.years||0)||(r.months||0)).length;
  return detectReductionSeries(lastEligibleData,readRemissionInputs(),n);
}
function detectReductionSeries(e,x,nPeriods){
  const arrival=x.arrival;
  if(!arrival)return [];
  const qs=completedQuarters(arrival,e.today);
  if(!qs.length||!nPeriods)return [];
  const Q=QUY_DINH;
  const milestone=x.priority
    ? escShift(calcOneThirdDate(e.arrestDate,e.sentMonths,e.sentExtraDays,e.preDetMonths,e.preDetDays,Q.mocChuaThanhNien),e.esc)
    : e.oneThirdDate;
  const req=remissionRequirement(e.sentMonths,x.priority,x.penalty);
  const need1=Math.max(0,req.base.quarters)+req.extra;   // yêu cầu lần giảm đầu
  if(!need1)return [];
  const gradeFn=remissionGradeFn(e,x);
  // Số quý Khá liên tục tính đến ngày xét rd, chỉ xét các quý kết thúc sau mốc "from"
  const streakUpTo=(rd,from)=>gradeStats(qs.filter(q=>q.end<=rd&&(!from||q.end>from)),gradeFn).adj;
  // Đợt xét đầu tiên (>= notBefore, đã diễn ra) thỏa số quý yêu cầu
  const findNext=(notBefore,need,from)=>{
    let y=notBefore.getFullYear();
    for(let k=0;k<40;k++){
      for(const r of REVIEW_DATES){
        const rd=new Date(y,r.reviewMonth-1,r.reviewDay);
        if(rd<notBefore)continue;
        if(rd>e.today)return null;          // chưa tới -> chưa được giảm
        if(streakUpTo(rd,from)>=need)return {name:r.name,date:rd};
      }
      y++;
    }
    return null;
  };
  const out=[];
  let prev=null, startIdx=0;
  // Đã chọn kỳ giảm ĐẦU TIÊN ở form thì lấy đó làm mốc, không suy đoán lại
  if(x.picked&&x.picked.value){
    const pd=new Date(parseInt(x.picked.value));
    prev={name:String(x.picked.label||'').replace(/\s*\(ngày xét.*\)$/,'')||guessReviewName(pd),date:pd};
    out.push(prev);
    startIdx=1;
  }
  for(let i=startIdx;i<nPeriods;i++){
    const rv=(i===0)
      ? findNext(milestone,need1,null)
      // cách kỳ trước ít nhất 01 năm; Khoản 7: cần đủ số quý kể từ lần giảm trước
      : findNext(new Date(prev.date.getFullYear()+Q.khoan7.cachNam,prev.date.getMonth(),prev.date.getDate()),Q.khoan7.tongQuy,prev.date);
    if(!rv)break;
    out.push(rv);
    prev=rv;
  }
  return out;
}
// Kỳ giảm gần nhất đã được xét
function detectK7Review(){
  const list=detectK7Series();
  return list.length?list[list.length-1]:null;
}
// Tự tích Khoản 7 và điền sẵn kỳ giảm (chỉ khi người dùng chưa tự chọn)
function autoFillK7(){
  if(k7AutoDone)return;
  const cb=document.getElementById('rmK7');
  const btn=document.getElementById('rmK7Btn');
  if(!cb||!btn)return;
  if(cb.checked||btn.dataset.value)return;   // người dùng đã tự chọn trong card -> không đụng
  const rv=detectK7Review();                 // kỳ giảm GẦN NHẤT trong chuỗi các kỳ đã nhập
  if(!rv)return;
  k7AutoDone=true;
  cb.checked=true;
  buildK7Reviews();
  slideToggle(document.getElementById('rmK7Period'),true);
  const label=rv.name+' (ngày xét '+fmtDate(rv.date)+')';
  btn.dataset.value=String(rv.date.getTime());
  btn.textContent=label;
  btn.classList.add('has-value');
  const li=document.getElementById('rmK7List');
  if(li)li.querySelectorAll('.k7-opt').forEach(o=>o.classList.toggle('sel',o.dataset.v===String(rv.date.getTime())));
  const di=document.getElementById('rmK7Date');
  if(di&&!di.value){di.value=fmtDate(rv.date);toggleClearBtn(di);}
}

function toggleK7(){
  k7AutoDone=true;          // người dùng đã tự thao tác -> không tự điền nữa
  const on=document.getElementById('rmK7').checked;
  if(on)buildK7Reviews();
  else{
    const d=document.getElementById('rmK7Date');
    if(d){d.value='';toggleClearBtn(d);}
  }
  slideToggle(document.getElementById('rmK7Period'),on);
  refreshRemissionGrade();
}

// ===== Khoản 8 =====
function toggleK8(){
  const on=document.getElementById('rmK8').checked;
  slideToggle(document.getElementById('rmK8Detail'),on);
  refreshRemissionGrade();
}
function toggleK8List(ev){
  if(ev)ev.stopPropagation();
  const l=document.getElementById('rmK8List');
  if(l)l.classList.toggle('open');
}
function pickK8(el){
  const btn=document.getElementById('rmK8Btn'), list=document.getElementById('rmK8List');
  btn.dataset.value=el.dataset.v;
  btn.textContent=el.querySelector('span').textContent;
  btn.classList.add('has-value');
  list.querySelectorAll('.k8-opt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');
  list.classList.remove('open');
  refreshRemissionGrade();
}

// ===== Khoản 9, 10 =====
function toggleK9(){
  const on=document.getElementById('rmK9').checked;
  slideToggle(document.getElementById('rmK9Detail'),on);
  refreshRemissionGrade();
}
function toggleK9List(ev){
  if(ev)ev.stopPropagation();
  const l=document.getElementById('rmK9List');
  if(l)l.classList.toggle('open');
}
function pickK9(el){
  const btn=document.getElementById('rmK9Btn'), list=document.getElementById('rmK9List');
  btn.dataset.value=el.dataset.v;
  btn.textContent=el.querySelector('span').textContent;
  btn.classList.add('has-value');
  list.querySelectorAll('.k9-opt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');
  list.classList.remove('open');
  refreshRemissionGrade();
}
// Chạm ra ngoài -> đóng các danh sách đang mở
document.addEventListener('click',function(ev){
  [['rmK7List','.rm-k7-period .k7-select'],['rmK8List','.rm-k8-detail .k7-select'],['rmK9List','.rm-k9-detail .k7-select']]
  .forEach(([id,sel])=>{
    const l=document.getElementById(id);
    if(l&&l.classList.contains('open')&&!ev.target.closest(sel))l.classList.remove('open');
  });
});

function openRemissionPage(){
  const body=document.getElementById('remissionPageBody');
  let html='';
  if(lastEligibleData && lastEligibleData.eligibleReview){
    const e=lastEligibleData;
    const grade=gradeRequirement(e.sentMonths);
    html+=`
      <div class="rm-card">
        <div class="rm-row"><span class="rm-lbl">Mức án ban đầu</span><span class="rm-val">${formatYearMonth(e.sentMonths)}</span></div>
        <div class="rm-row"><span class="rm-lbl" id="rmMilestoneLbl">Ngày đạt mốc 1/3</span><span class="rm-val" id="rmMilestoneVal">${fmtDate(e.oneThirdDate)}</span></div>
        <div class="rm-conclusion" id="rmConclusion"></div>
      </div>
      <div class="rm-arrival">
        <div class="rm-arrival-row">
          <label for="rmArrival">Ngày đến trại</label>
          <div class="input-clearable">
            <input type="text" id="rmArrival" class="date-single-input" placeholder="ngày/tháng/năm" inputmode="numeric" maxlength="10" oninput="formatDateInput(this);toggleClearBtn(this);refreshRemissionGrade()" onfocus="toggleClearBtn(this)" onblur="expandYearOnBlur(this);toggleClearBtn(this);refreshRemissionGrade()">
            <button type="button" class="input-clear-btn" onclick="clearArrival()" title="Xóa">✕</button>
          </div>
        </div>
        <div class="rm-arrival-hint" id="rmArrivalHint"></div>
      </div>
      <div class="rm-penalty rm-quarter">
        <div class="rm-penalty-title">Kết quả xếp loại thi đua<span class="qgrid-tip">(Nhấn vào để thay đổi)</span></div>
        <div class="qgrid-wrap" id="rmQGrid"></div>
        <div class="qgrid-sum" id="rmQSum"></div>
      </div>
      <label class="rm-priority-toggle">
        <input type="checkbox" id="rmPriority" onchange="togglePriority()">
        <span><b>Người chưa thành niên (dưới 18 tuổi)</b></span>
      </label>
      <div class="rm-penalty">
        <div class="rm-penalty-title">Khoản 6: Người có tiền án</div>
        <div class="rm-penalty-row">
          <label>Số tiền án<br><span id="rmPenaltyRule">(mỗi tiền án +2 quý Khá)</span></label>
          <input type="text" inputmode="numeric" id="rmPenaltyCount" placeholder="0" maxlength="2" onfocus="this.placeholder=''" onblur="this.placeholder='0'" oninput="onPenaltyInput(this)">
        </div>
      </div>
      <div class="rm-k7-toggle">
        <label class="rm-k7-head">
          <input type="checkbox" id="rmK7" onchange="toggleK7()">
          <span><b>Khoản 7: Đã được giảm án — xét giảm đợt tiếp:</b> phải liên tục xếp loại Khá; nếu gián đoạn thì cần đủ 04 quý Khá (trong đó ≥ 02 quý liền kề)</span>
        </label>
        <div class="rm-k7-period" id="rmK7Period" style="display:none">
          <label>Kỳ giảm đã được xét</label>
          <div class="k7-select">
            <button type="button" class="k7-btn" id="rmK7Btn" data-value="" onclick="toggleK7List(event)">— Chọn kỳ giảm —</button>
            <div class="k7-list" id="rmK7List"></div>
          </div>
          <label style="margin-top:8px">Ngày xét thực tế</label>
          <div class="input-clearable">
            <input type="text" id="rmK7Date" class="date-single-input" placeholder="ngày/tháng/năm" inputmode="numeric" maxlength="10" oninput="formatDateInput(this);toggleClearBtn(this);refreshRemissionGrade()" onfocus="toggleClearBtn(this)" onblur="expandYearOnBlur(this);toggleClearBtn(this);refreshRemissionGrade()">
            <button type="button" class="input-clear-btn" onclick="clearRmK7Date()" title="Xóa">✕</button>
          </div>
          <div class="rm-k7-hint" id="rmK7Hint"></div>
        </div>
      </div>
      <div class="rm-k8-toggle">
        <label class="rm-k8-head">
          <input type="checkbox" id="rmK8" onchange="toggleK8()">
          <span><b>Khoản 8: Đã được giảm án nhưng bị kỷ luật</b></span>
        </label>
        <div class="rm-k8-detail" id="rmK8Detail" style="display:none">
          <label>Hình thức kỷ luật</label>
          <div class="k7-select">
            <button type="button" class="k7-btn" id="rmK8Btn" data-value="" onclick="toggleK8List(event)">— Chọn hình thức kỷ luật —</button>
            <div class="k7-list" id="rmK8List">
              <div class="k8-opt" data-v="4" onclick="pickK8(this)"><span>Khiển trách 02 lần hoặc cảnh cáo — cần 04 quý liền kề</span></div>
              <div class="k8-opt" data-v="5" onclick="pickK8(this)"><span>Giam tại buồng kỷ luật — cần 05 quý liền kề</span></div>
            </div>
          </div>
          <label style="margin-top:7px">Ngày ra quyết định kỷ luật</label>
          <div class="input-clearable">
            <input type="text" id="rmK8DecDate" class="date-single-input" placeholder="ngày/tháng/năm" inputmode="numeric" maxlength="10" oninput="formatDateInput(this);toggleClearBtn(this);refreshRemissionGrade()" onfocus="toggleClearBtn(this)" onblur="expandYearOnBlur(this);toggleClearBtn(this);refreshRemissionGrade()">
            <button type="button" class="input-clear-btn" onclick="clearK8DecDate()" title="Xóa">✕</button>
          </div>
          <label style="margin-top:7px">Ngày công nhận đã cải tạo tiến bộ</label>
          <div class="input-clearable">
            <input type="text" id="rmK8Date" class="date-single-input" placeholder="ngày/tháng/năm" inputmode="numeric" maxlength="10" oninput="formatDateInput(this);toggleClearBtn(this);refreshRemissionGrade()" onfocus="toggleClearBtn(this)" onblur="expandYearOnBlur(this);toggleClearBtn(this);refreshRemissionGrade()">
            <button type="button" class="input-clear-btn" onclick="clearK8Date()" title="Xóa">✕</button>
          </div>
          <div class="rm-k7-hint" id="rmK8Hint"></div>
        </div>
      </div>
      <div class="rm-k9-toggle">
        <label class="rm-k9-head">
          <input type="checkbox" id="rmK9" onchange="toggleK9()">
          <span><b>Khoản 9, 10: Đã được giảm án mà phạm tội mới</b></span>
        </label>
        <div class="rm-k9-detail" id="rmK9Detail" style="display:none">
          <label>Loại tội phạm mới</label>
          <div class="k7-select">
            <button type="button" class="k7-btn" id="rmK9Btn" data-value="" onclick="toggleK9List(event)">— Chọn loại tội phạm mới —</button>
            <div class="k7-list" id="rmK9List">
              <div class="k9-opt" data-v="9" onclick="pickK9(this)"><span>Khoản 9 — Tội ít nghiêm trọng do cố ý (phải chấp hành ≥ 1/2 mức hình phạt chung)</span></div>
              <div class="k9-opt" data-v="10" onclick="pickK9(this)"><span>Khoản 10 — Tội nghiêm trọng, rất nghiêm trọng hoặc đặc biệt nghiêm trọng (phải chấp hành ≥ 2/3 mức hình phạt chung; hoặc 25 năm nếu tù chung thân)</span></div>
            </div>
          </div>
          <label style="margin-top:7px" class="k9-lbl-chungthan"><input type="checkbox" id="rmK9Life" onchange="refreshRemissionGrade()" style="width:16px;height:16px;margin-right:6px;vertical-align:-3px;accent-color:#6b3fa0"> Tù chung thân (đã giảm xuống có thời hạn) — áp mốc 25 năm</label>
          <div class="rm-k7-hint" id="rmK9Hint"></div>
        </div>
      </div>
    `;
  }
  // Phụ lục điều kiện: ẩn sau nút bấm, khi cần mới mở ra đối chiếu
  const annexSrc=document.getElementById('annexContent');
  if(annexSrc){
    html+='<button type="button" class="rm-annex-btn" id="rmAnnexBtn" onclick="toggleRmAnnex()">'
        + '<span>Điều kiện xét giảm thời hạn chấp hành án phạt tù</span>'
        + '<i class="rm-annex-arrow">▾</i></button>'
        + '<div class="rm-annex" id="rmAnnexBox" style="display:none">'+annexSrc.innerHTML+'</div>';
  }
  body.innerHTML=html;
  applyRmCtx();             // điền lại thông tin đã nhập cho phạm nhân này (nếu có)
  k7AutoDone=false;         // mỗi lần mở lại cho phép tự xác định
  const rp=document.getElementById('remissionPage');
  rp.classList.add('show');
  setFlipAction(true);      // nút Sao chép lật thành Lưu hồ sơ
  // Kỳ giảm sẽ được điền tự động trong refreshRemissionGrade() bằng autoFillK7(),
  // lấy kỳ GẦN NHẤT trong chuỗi các kỳ giảm đã nhập (không chỉ kỳ đầu tiên).
  if(lastEligibleData && lastEligibleData.eligibleReview)refreshRemissionGrade();
  // Cuộn nội dung tra cứu về đầu trang
  body.scrollTop=0;
}
