// ===== Chọn kỳ giảm đã được xét (tích hợp Khoản 7 vào form nhập) =====
let pickedReduction=null;      // {value:timestamp, label:'...'} - kỳ giảm đã chọn
let pendingCalcAfterPick=false;// đang chờ chọn xong kỳ giảm rồi mới tính án phạt
let k7PickShown=false;         // chỉ hỏi 1 lần, ở kỳ giảm đầu tiên
let k7PickTemp=null;           // lựa chọn tạm trong modal

// Đọc thông tin bản án từ form để dựng danh sách kỳ xét
function formMilestoneInfo(){
  const p=(document.getElementById('arrestDateText').value||'').split('/');
  const d=parseInt(p[0]),m=parseInt(p[1]);
  let y=parseInt((p[2]||'').replace(/\D/g,''));
  if(!d||!m||!y)return null;
  if(String(p[2]).replace(/\D/g,'').length<=2)y=2000+y;
  const arrest=new Date(y,m-1,d);
  const iv=id=>parseInt((document.getElementById(id).value||'').replace(/[^\d]/g,''))||0;
  const sentMonths=iv('sY')*12+iv('sM'), sD=iv('sD');
  if(!sentMonths&&!sD)return null;
  const preDetMonths=iv('pdY')*12+iv('pdM'), pdD=iv('pdD');
  const er=parseEscapeRows(escapes,arrest), esc=er.list&&er.list.length?er.list:null;
  const oneThird=escShift(calcOneThirdDate(arrest,sentMonths,sD,preDetMonths,pdD),esc);
  const oneFourth=escShift(calcOneThirdDate(arrest,sentMonths,sD,preDetMonths,pdD,QUY_DINH.mocChuaThanhNien),esc);
  return {arrest, oneThird, oneFourth};
}

function openK7Pick(){
  const info=formMilestoneInfo();
  const list=document.getElementById('k7PickList');
  if(!list)return;
  k7PickTemp=null;
  if(!info){
    list.innerHTML='<div class="k7pick-empty">Vui lòng nhập ngày bắt và mức án trước để xác định các kỳ xét giảm.</div>';
  }else{
    const first=findEligibleReview(info.oneFourth||info.oneThird);   // mở rộng từ mốc 1/4
    const today=getRefDate();
    let html='',count=0;
    if(first){
      let y=first.year, idx=REVIEW_DATES.findIndex(r=>r.name===first.name);
      for(let n=0;n<200;n++){
        const r=REVIEW_DATES[idx];
        const dt=new Date(y,r.reviewMonth-1,r.reviewDay);
        if(dt>today)break;
        const label=r.name+' (ngày xét '+fmtDate(dt)+')';
        html+='<div class="k7pick-opt" data-v="'+dt.getTime()+'" data-l="'+label+'" data-n="'+r.name+'" onclick="selK7Pick(this)">'
            + '<span class="k7pick-dot"></span><span>'+label+'</span></div>';
        count++;
        idx++; if(idx>=REVIEW_DATES.length){idx=0;y++;}
      }
    }
    list.innerHTML = count?html:'<div class="k7pick-empty">Chưa có kỳ xét giảm nào tính đến thời điểm hiện tại.</div>';
  }
  const di=document.getElementById('k7PickDate');
  if(di){di.value='';toggleClearBtn(di);}
  document.getElementById('k7PickOverlay').style.display='flex';
  k7PickShown=true;
}
function selK7Pick(el){
  document.querySelectorAll('#k7PickList .k7pick-opt').forEach(o=>o.classList.remove('sel'));
  el.classList.add('sel');
  k7PickTemp={value:el.dataset.v, label:el.dataset.l, name:el.dataset.n};
  // Điền sẵn ngày xét mặc định để người dùng sửa nếu thực tế khác
  const di=document.getElementById('k7PickDate');
  if(di){di.value=fmtDate(new Date(parseInt(el.dataset.v)));toggleClearBtn(di);}
}
function closeK7Pick(){
  document.getElementById('k7PickOverlay').style.display='none';
  k7PickTemp=null;
  // Nếu người dùng bấm "Tính án phạt" trước đó thì tiếp tục tính (dù chọn hay bỏ qua)
  if(pendingCalcAfterPick){
    pendingCalcAfterPick=false;
    setTimeout(calculate,80);
  }
}
// Đọc ô ngày dạng ngày/tháng/năm (năm đủ 4 chữ số). Sai định dạng hoặc ngoài khoảng hợp lệ -> null.
function readStrictDate(id){
  const el=document.getElementById(id);
  return el?parseStrictDateText(el.value):null;
}
// Cùng quy tắc, đọc từ một chuỗi (dữ liệu hồ sơ đã lưu)
function parseStrictDateText(text){
  const v=String(text||'').trim();
  if(!/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(v))return null;
  const p=v.split('/');
  const d=parseInt(p[0]),m=parseInt(p[1]),y=parseInt(p[2]);
  if(!d||!m||!y||y<1900||m<1||m>12||d<1||d>31)return null;
  return new Date(y,m-1,d);
}
// Ngày xét thực tế người dùng nhập trong popup chọn kỳ giảm
function getK7PickDate(){return readStrictDate('k7PickDate');}
// Suy ra tên đợt từ tháng xét khi người dùng chỉ nhập ngày
function guessReviewName(d){
  const m=d.getMonth()+1;
  if(m>=10||m<=1)return 'Tết Nguyên Đán';
  if(m>=6&&m<=8)return 'Quốc khánh 2/9';
  return '30/4 - 1/5';
}
function confirmK7Pick(){
  const manual=getK7PickDate();
  if(manual){
    const nm=(k7PickTemp&&k7PickTemp.name)?k7PickTemp.name:guessReviewName(manual);
    k7PickTemp={value:String(manual.getTime()), label:nm+' (ngày xét '+fmtDate(manual)+')', name:nm};
  }
  if(k7PickTemp){
    pickedReduction={value:k7PickTemp.value, label:k7PickTemp.label};
    updatePickChip();
    // Cập nhật lại dòng thông báo nếu đã có kết quả tính toán
    if(lastEligibleData){
      setEligibleText(lastEligibleData.oneThirdDate,lastEligibleData.eligibleReview,lastEligibleData.today);
    }
  }
  closeK7Pick();
}
// Rút gọn tên đợt xét: 15/12/2025 -> "Tết Nguyên Đán 2026"; 15/7/2025 -> "2/9/2025";
// 15/3/2025 -> "30/4-1/5/2025"
function shortReviewLabel(name,date){
  const y=date.getFullYear();
  if(name.indexOf('Tết')>=0)return 'Tết Nguyên Đán '+(y+1);   // xét tháng 12 cho Tết năm sau
  if(name.indexOf('2/9')>=0)return '2/9/'+y;
  if(name.indexOf('30/4')>=0)return '30/4-1/5/'+y;
  return name+' '+y;
}
function updatePickChip(){
  const chip=document.getElementById('rmPickChip');
  if(!chip)return;
  if(!pickedReduction){chip.textContent='';return;}
  const d=new Date(parseInt(pickedReduction.value));
  const nm=pickedReduction.label.replace(/\s*\(ngày xét.*\)$/,'');
  chip.textContent='(đã giảm '+shortReviewLabel(nm,d)+')';
}
// Khi xóa trắng kỳ giảm đầu tiên -> bỏ lựa chọn, cho phép hỏi lại
function onRemChanged(index){
  if(index!==0)return;
  const r=remissions[0];
  if(r && !(r.years||0) && !(r.months||0)){
    if(pickedReduction||k7PickShown){
      pickedReduction=null;
      k7PickShown=false;
      updatePickChip();
      if(lastEligibleData)setEligibleText(lastEligibleData.oneThirdDate,lastEligibleData.eligibleReview,lastEligibleData.today);
    }
  }
}

// Hỏi chọn kỳ giảm khi nhập kỳ giảm ĐẦU TIÊN
function maybeAskK7Pick(index){
  if(index!==0||k7PickShown||pickedReduction)return;
  const r=remissions[0];
  if(!r||(!r.years&&!r.months))return;
  setTimeout(openK7Pick,150);
}

function addRemission(y=0,m=0){
  remissions.push({years:y,months:m});
  renderRemissions();
}

function renderRemissions(){
  const list=document.getElementById('remissionList');
  list.innerHTML='';

  if(remissions.length===0){
    const div=document.createElement('div');
    div.className='remission-item';
    div.innerHTML=`
      <div class="remission-slide">
        <span class="remission-empty-hint">Chưa có kỳ giảm án nào</span>
        <button class="btn-add-mini" onclick="addRemission()">Thêm kỳ giảm</button>
      </div>
    `;
    list.appendChild(div);
    return;
  }

  remissions.forEach((r,i)=>{
    const isLast=i===remissions.length-1;
    const div=document.createElement('div');
    div.className='remission-item';
    div.innerHTML=`
      <button type="button" class="remission-del" onclick="removeRemission(${i})" aria-label="Xóa kỳ ${i+1}">Xóa</button>
      <div class="remission-slide">
        <span class="remission-item-label">Kỳ ${i+1}</span>
        <div class="remission-input-wrap remission-year-wrap">
          <input type="text" inputmode="numeric" class="remission-month-input remission-year-input${r.years?' has-value':''}" placeholder="Số năm" data-unit="năm" data-max="30" value="${r.years?(r.years+' năm'):''}" onfocus="stripUnit(this)" oninput="digitsOnly(this);remissions[${i}].years=+this.value||0;onRemChanged(${i})" onblur="addUnit(this);maybeAskK7Pick(${i})">
        </div>
        <div class="remission-input-wrap">
          <input type="text" inputmode="numeric" class="remission-month-input${r.months?' has-value':''}" placeholder="Số tháng" data-unit="tháng" data-max="600" value="${r.months?(r.months+' tháng'):''}" onfocus="stripUnit(this)" oninput="digitsOnly(this);remissions[${i}].months=+this.value||0;onRemChanged(${i})" onblur="addUnit(this);maybeAskK7Pick(${i})">
        </div>
        ${isLast?'<button class="btn-add-mini" onclick="addRemission()">Thêm kỳ giảm</button>':''}
      </div>
    `;
    list.appendChild(div);
    attachRemissionSwipe(div);
  });
}

// Vuốt phải -> trái trên mỗi kỳ để lộ nút Xóa riêng (kiểu iOS)
function closeAllRemissionSwipes(except){
  document.querySelectorAll('.remission-slide.open').forEach(s=>{
    if(s!==except){s.classList.remove('open');s.style.transition='';s.style.transform='translateX(0)';}
  });
}
function attachRemissionSwipe(item){
  const slide=item.querySelector('.remission-slide');
  if(!slide) return;
  const OPEN=76;
  let startX=0,startY=0,base=0,lastX=0,active=false,decided=false,horiz=false,pid=null;
  const setX=x=>{lastX=x;slide.style.transform='translateX('+x+'px)';};
  slide.addEventListener('pointerdown',e=>{
    startX=e.clientX;startY=e.clientY;
    base=slide.classList.contains('open')?-OPEN:0;
    active=true;decided=false;horiz=false;pid=e.pointerId;
    slide.style.transition='none';
  });
  slide.addEventListener('pointermove',e=>{
    if(!active) return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    if(!decided){
      if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>6){decided=true;horiz=true;closeAllRemissionSwipes(slide);try{slide.setPointerCapture(pid)}catch(_){}}
      else if(Math.abs(dy)>6){decided=true;horiz=false;}
    }
    if(horiz){ e.preventDefault(); setX(Math.max(-OPEN,Math.min(0,base+dx))); }
  });
  const end=e=>{
    if(!active) return; active=false;
    slide.style.transition='';
    if(horiz){
      if(lastX<=-OPEN/2){slide.classList.add('open');setX(-OPEN);}
      else{slide.classList.remove('open');setX(0);}
    } else if(slide.classList.contains('open') && e && !e.target.closest('input,button,.remission-del')){
      // chạm ra ngoài input khi đang mở -> đóng lại
      slide.classList.remove('open');setX(0);
    }
    try{slide.releasePointerCapture(pid)}catch(_){}
  };
  slide.addEventListener('pointerup',end);
  slide.addEventListener('pointercancel',end);
}
// Chạm vào bất kỳ vùng nào (ngoài nút Xóa) khi một kỳ đang mở -> trượt trả lại, che nút Xóa
if(typeof window!=='undefined' && !window.__remSwipeCloseBound){
  window.__remSwipeCloseBound=true;
  document.addEventListener('pointerdown',function(e){
    if(!document.querySelector('.remission-slide.open')) return;
    if(e.target.closest && e.target.closest('.remission-del')) return; // để nút Xóa hoạt động
    closeAllRemissionSwipes();
  },true);
}

function removeRemission(i){
  remissions.splice(i,1);
  if(remissions.length===0)remissions.push({years:0,months:0});
  onRemChanged(0);          // kỳ 1 thay đổi -> cập nhật lại lựa chọn kỳ giảm
  renderRemissions();
}
function clearRemissions(){remissions=[{years:0,months:0}];pickedReduction=null;k7PickShown=false;updatePickChip();renderRemissions()}

function updateAlert(daysLeft){
  const banner=document.getElementById('alertBanner');
  const icon=document.getElementById('alertIcon');
  const text=document.getElementById('alertText');

  banner.classList.remove('level-low','level-mid','level-high','level-critical');
  banner.style.display='';

  if(daysLeft<=0){
    banner.classList.add('level-critical');
    icon.textContent='🔴';
    text.textContent='Đã đến/ vượt qua ngày hết án! Cần xử lý ngay.';
  } else if(daysLeft<=3){
    banner.classList.add('level-critical');
    icon.textContent='🚨';
    text.textContent='CHỈ CÒN '+daysLeft+' NGÀY ĐẾN HẠN HẾT ÁN — ƯU TIÊN XỬ LÝ KHẨN!';
  } else if(daysLeft<=7){
    banner.classList.add('level-high');
    icon.textContent='⚠️';
    text.textContent='Còn '+daysLeft+' ngày đến hạn hết án — cần chuẩn bị thủ tục gấp.';
  } else if(daysLeft<=15){
    banner.classList.add('level-high');
    icon.textContent='⚠️';
    text.textContent='Còn '+daysLeft+' ngày đến hạn hết án — cần lưu ý theo dõi.';
  } else if(daysLeft<=30){
    banner.classList.add('level-mid');
    icon.textContent='🔔';
    text.textContent='Còn '+daysLeft+' ngày đến hạn hết án — sắp đến thời điểm hết án.';
  } else {
    banner.style.display='none';
  }
}

// Xóa nhanh nội dung 1 ô (ngày bắt / ngày giả định), focus lại để nhập mới
function clearInput(id){
  const el=document.getElementById(id);
  el.value='';
  toggleClearBtn(el);
  el.focus();
}

// Xóa nhanh cả nhóm ô (mức án hoặc tạm giam)
function clearGroup(ids){
  ids.forEach(id=>{document.getElementById(id).value='';});
  if(ids[0])document.getElementById(ids[0]).focus();
}

// Tự viết hoa chữ cái đầu mỗi từ khi nhập tên phạm nhân.
// Giữ nguyên vị trí con trỏ để sửa giữa chuỗi không bị nhảy.
function capitalizeName(el){
  const start=el.selectionStart, end=el.selectionEnd;
  const v=el.value;
  // Viết hoa ký tự đầu chuỗi và ký tự ngay sau khoảng trắng / dấu chấm / gạch nối
  const out=v.replace(/(^|[\s.\-])(\S)/g,(m,sep,ch)=>sep+ch.toLocaleUpperCase('vi'));
  if(out!==v){
    el.value=out;
    try{el.setSelectionRange(start,end);}catch(e){}
  }
}

// Ẩn/hiện nút xóa trong ô tùy theo ô có nội dung hay không
function toggleClearBtn(el){
  const btn=el.parentElement.querySelector('.input-clear-btn');
  if(!btn)return;
  if(el.value&&el.value.length>0)btn.classList.add('show');
  else btn.classList.remove('show');
}

// Chỉ giữ chữ số khi gõ (loại bỏ ký tự khác), đồng thời kẹp theo max nếu có
function digitsOnly(el){
  let v=el.value.replace(/[^\d]/g,'');
  const max=parseInt(el.dataset.max);
  if(v!==''&&!isNaN(max)&&parseInt(v)>max)v=String(max);
  el.value=v;
}
// Mức án tối đa 30 năm: nếu năm = 30 thì tháng và ngày luôn về 0
function clampSentence(el){
  digitsOnly(el);
  const sY=document.getElementById('sY');
  const yy=parseInt((sY&&sY.value||'').replace(/[^\d]/g,''))||0;
  if(yy>=30){
    const sM=document.getElementById('sM'), sD=document.getElementById('sD');
    if(sM) sM.value='0 tháng';
    if(sD) sD.value='0 ngày';
  }
}
// Thời gian tạm giam:
//  - Số năm tạm giam không vượt quá số năm mức án.
//  - Khi số năm tạm giam BẰNG số năm mức án thì "tháng" và "ngày" tạm giam
//    không được lớn hơn "tháng" và "ngày" của mức án.
//  - Khi số năm tạm giam nhỏ hơn thì tháng/ngày nhập tự do.
function clampPreDet(el){
  digitsOnly(el);
  const iv=id=>parseInt((document.getElementById(id).value||'').replace(/[^\d]/g,''))||0;
  const sY=iv('sY'), sM=iv('sM'), sD=iv('sD');
  if(sY<=0 && sM<=0 && sD<=0) return; // chưa nhập mức án thì chưa ràng buộc
  const pdYel=document.getElementById('pdY'), pdMel=document.getElementById('pdM'), pdDel=document.getElementById('pdD');
  let y=iv('pdY');
  if(y>sY){ pdYel.value=String(sY); y=sY; }   // năm tạm giam không vượt quá năm mức án
  if(y===sY){                                 // năm bằng nhau -> khống chế tháng, ngày
    if(iv('pdM')>sM) pdMel.value=String(sM);
    if(iv('pdD')>sD) pdDel.value=String(sD);
  }
}

// Khi focus: bỏ đuôi đơn vị, chỉ còn số để dễ sửa
function stripUnit(el){
  const unit=el.dataset.unit||'';
  let v=el.value.replace(unit,'').trim();
  el.value=v.replace(/[^\d]/g,'');
}

// Khi rời ô: nếu có số thì gắn đuôi đơn vị (vd "6" -> "6 năm"); rỗng thì để trống (hiện placeholder)
function addUnit(el){
  let v=el.value.replace(/[^\d]/g,'');
  const max=parseInt(el.dataset.max);
  if(v!==''&&!isNaN(max)&&parseInt(v)>max)v=String(max);
  el.value = v==='' ? '' : (v+' '+(el.dataset.unit||''));
}

function formatDateInput(el){
  const selStart=el.selectionStart;
  const rawBefore=el.value;
  const atEnd=(selStart>=rawBefore.length);

  // Đếm số chữ số bên trái con trỏ (để khôi phục vị trí sau khi format)
  let digitsLeftOfCursor=0;
  for(let i=0;i<selStart && i<rawBefore.length;i++){
    if(/\d/.test(rawBefore[i]))digitsLeftOfCursor++;
  }

  let dayPart, monthPart, yearPart;

  if(atEnd){
    // ----- ĐANG GÕ THÊM Ở CUỐI: gộp digits rồi cắt 2-2-4 (cho phép tự nhảy phần) -----
    let digits=rawBefore.replace(/\D/g,'').slice(0,8);

    // Tự pad 0 vào tháng nếu chữ số đầu tháng > 1 (tháng 3-9) để nhảy sang năm
    let paddedMonth=false;
    if(digits.length>=3 && digits.length<8 && parseInt(digits[2])>1){
      digits=digits.slice(0,2)+'0'+digits.slice(2);
      if(digits.length>8)digits=digits.slice(0,8);
      paddedMonth=true;
    }

    dayPart=digits.slice(0,2);
    monthPart=digits.slice(2,4);
    yearPart=digits.slice(4,8);

    if(paddedMonth && digitsLeftOfCursor>=3)digitsLeftOfCursor++;
  }else{
    // ----- ĐANG SỬA GIỮA CHUỖI: giữ NGUYÊN ranh giới các phần theo dấu '/' -----
    // Tách theo dấu '/', mỗi phần CHỈ giữ chữ số của riêng nó, KHÔNG cho tràn sang phần khác.
    const segs=rawBefore.split('/');
    dayPart=(segs[0]||'').replace(/\D/g,'').slice(0,2);
    monthPart=(segs[1]||'').replace(/\D/g,'').slice(0,2);
    yearPart=(segs[2]||'').replace(/\D/g,'').slice(0,4);
  }

  // --- KẸP THÁNG > 12 về 12 (khi đã đủ 2 chữ số tháng) ---
  if(monthPart.length===2){
    const mm=parseInt(monthPart);
    if(mm>12)monthPart='12';
    if(mm===0)monthPart='01';
  }

  // --- KẸP NGÀY không hợp lệ về ngày cuối tháng ---
  if(dayPart.length===2 && monthPart.length>=1){
    const mm=parseInt(monthPart);
    let dd=parseInt(dayPart);
    if(mm>=1 && mm<=12){
      let maxDay;
      if(mm===2){
        if(yearPart.length===4){
          maxDay=new Date(parseInt(yearPart),2,0).getDate();
        }else{
          maxDay=29;
        }
      }else{
        maxDay=new Date(2024,mm,0).getDate();
      }
      if(dd>maxDay){dd=maxDay;dayPart=String(dd).padStart(2,'0');}
    }
  }

  // --- Ghép lại thành chuỗi hiển thị ---
  let formatted='';
  if(atEnd){
    // Khi gõ ở cuối: chỉ thêm '/' khi phần trước đã đầy, để con trỏ tự tiến mượt
    formatted=dayPart;
    if(dayPart.length===2 && (monthPart.length>0 || rawBefore.replace(/\D/g,'').length>2))formatted+='/'+monthPart;
    if(monthPart.length===2 && (yearPart.length>0 || rawBefore.replace(/\D/g,'').length>4))formatted+='/'+yearPart;
  }else{
    // Khi sửa giữa: giữ cấu trúc theo số phần người dùng đang có (số dấu '/' hiện tại)
    const slashCount=(rawBefore.match(/\//g)||[]).length;
    formatted=dayPart;
    if(slashCount>=1)formatted+='/'+monthPart;
    if(slashCount>=2)formatted+='/'+yearPart;
  }

  el.value=formatted;

  // --- Khôi phục vị trí con trỏ ---
  let newPos;
  if(!atEnd){
    // SỬA GIỮA: cấu trúc (số dấu '/') không đổi, nên giữ con trỏ theo VỊ TRÍ KÝ TỰ gốc.
    // Nhờ vậy khi xóa hết phần tháng, con trỏ ở yên ngay sau dấu '/' đầu (vẫn trong vùng tháng),
    // không bị nhảy về phần ngày. Kẹp lại trong độ dài chuỗi mới.
    newPos=Math.min(selStart, formatted.length);
  }else{
    // GÕ Ở CUỐI: đặt con trỏ sau đúng số chữ số bên trái, tự nhảy qua '/' cho mượt.
    newPos=0;
    let counted=0;
    if(digitsLeftOfCursor<=0){
      newPos=0;
    }else{
      for(let i=0;i<formatted.length;i++){
        if(/\d/.test(formatted[i]))counted++;
        if(counted===digitsLeftOfCursor){
          newPos=i+1;
          if(formatted[newPos]==='/')newPos++;
          break;
        }
      }
      if(counted<digitsLeftOfCursor)newPos=formatted.length;
    }
  }
  try{el.setSelectionRange(newPos,newPos);}catch(e){}
}

// Khi rời ô (blur): nếu phần năm chỉ có 1-2 chữ số thì hiểu là nhập tắt -> mở rộng thành 20xx.
// Ví dụ: 01 -> 2001, 18 -> 2018, 5 -> 2005. (Chỉ áp dụng năm 2000-2999.)
// Năm đã đủ 4 chữ số thì giữ nguyên (cách nhập bình thường).
function expandYearOnBlur(el){
  const v=el.value.trim();
  if(!v)return;
  const segs=v.split('/');
  if(segs.length<3)return; // chưa nhập tới phần năm thì bỏ qua
  let dayPart=segs[0]||'';
  let monthPart=segs[1]||'';
  let yearPart=(segs[2]||'').replace(/\D/g,'');

  if(yearPart.length>=1 && yearPart.length<=2){
    // 1 chữ số: pad 0 thành 2 chữ số (vd '5' -> '05'), rồi thêm '20' phía trước
    const yy=yearPart.padStart(2,'0');
    yearPart='20'+yy;
    el.value=dayPart+'/'+monthPart+'/'+yearPart;
    // Sau khi mở rộng năm, nếu là tháng 2 cần kiểm tra lại ngày nhuận
    if(monthPart.length===2 && dayPart.length===2){
      const mm=parseInt(monthPart), yyyy=parseInt(yearPart);
      let dd=parseInt(dayPart);
      if(mm>=1 && mm<=12 && yyyy>=1900){
        const maxDay=new Date(yyyy,mm,0).getDate();
        if(dd>maxDay){dd=maxDay;el.value=String(dd).padStart(2,'0')+'/'+monthPart+'/'+yearPart;}
      }
    }
  }
}
