// ===== TÌNH TIẾT TĂNG NẶNG - TIỀN ÁN (Khoản 6) =====
// Mỗi tiền án ứng với số quý xếp loại Khá cộng thêm: xem QUY_DINH.tienAn và remissionRequirement()
function onPenaltyInput(el){
  el.value=el.value.replace(/[^\d]/g,'');
  refreshRemissionGrade();
}

// ===== Điều 21 NĐ 170/2026: tính các quý đã đủ điều kiện xếp loại =====
// Tháng được xếp loại khi đã chấp hành đủ số ngày tối thiểu trong tháng; quý được xếp loại khi
// có đủ số tháng được xếp loại (xem QUY_DINH.ngayToiThieuTrongThang, thangToiThieuTrongQuy, quy).
const QUARTER_DEFS=QUY_DINH.quy;
function lastDayOfMonth(y,m){return new Date(y,m,0).getDate();}
function monthGraded(arrival,y,m){
  const total=lastDayOfMonth(y,m);
  const first=new Date(y,m-1,1), last=new Date(y,m-1,total);
  if(arrival>last)return false;
  const startDay=(arrival<=first)?1:arrival.getDate();
  return (total-startDay+1)>=QUY_DINH.ngayToiThieuTrongThang;
}
// Danh sách quý đã hoàn thành (kèm ngày kết thúc quý) từ ngày đến trại đến ngày tham chiếu
function completedQuarters(arrival,refDate){
  const out=[];
  if(!arrival||!refDate)return out;
  for(let y=arrival.getFullYear();y<=refDate.getFullYear()+1;y++){
    for(const q of QUARTER_DEFS){
      const sy=y+q.startYearOffset;
      const end=new Date(y,q.endMonth-1,lastDayOfMonth(y,q.endMonth));
      if(end>refDate)continue;              // quý chưa kết thúc
      let months=0, my=sy, mm=q.startMonth;
      for(let k=0;k<3;k++){
        if(monthGraded(arrival,my,mm))months++;
        mm++; if(mm>12){mm=1;my++;}
      }
      if(months>=QUY_DINH.thangToiThieuTrongQuy)out.push({end, label:'Quý '+q.name+'/'+y, qname:q.name, year:y, key:y+'-'+q.name});
    }
  }
  out.sort((a,b)=>a.end-b.end);
  return out;
}
// Ngày đến trại (chỉ đối chiếu khi đã nhập đủ ngày/tháng/năm 4 chữ số)
function getArrivalDate(){return readStrictDate('rmArrival');}
function clearArrival(){clearRmDate('rmArrival');}
// Ngày công nhận đã cải tạo tiến bộ (Khoản 8)
function getK8Date(){return readStrictDate('rmK8Date');}
function clearK8DecDate(){clearRmDate('rmK8DecDate');}
function getK8DecDate(){return readStrictDate('rmK8DecDate');}
function clearK8Date(){clearRmDate('rmK8Date');}

// ===== BẢNG KẾT QUẢ XẾP LOẠI THI ĐUA =====
const GRADES=[
  {k:'Tot', t:'Tốt',                c:'qg-tot'},
  {k:'Kha', t:'Khá',                c:'qg-kha'},
  {k:'TB',  t:'Trung bình',         c:'qg-tb'},
  {k:'Kem', t:'Kém',                c:'qg-kem'},
  {k:'No',  t:'Chưa đủ điều kiện',  c:'qg-no'}
];
const GRADE_SHORT={Tot:'Tốt',Kha:'Khá',TB:'TB',Kem:'Kém',No:'Chưa đủ ĐK'};
let quarterGrades={};        // {'2025-I':'Kha', ...} - mặc định Khá (của phạm nhân đang tính)

// ===== GHI NHỚ THÔNG TIN TRANG TRA CỨU GIẢM ÁN THEO TỪNG PHẠM NHÂN =====
// Trang Tra cứu giảm án được dựng lại mỗi lần mở. Thông tin đã nhập (ngày đến trại, tiền án,
// người chưa thành niên, Khoản 8) và kết quả xếp loại quý được ghi nhớ cho phạm nhân đang tính:
//  - mở lại trang / tính lại cho CÙNG phạm nhân (cùng họ tên và ngày bắt) -> giữ nguyên;
//  - tính cho phạm nhân KHÁC -> bắt đầu trống, không lẫn dữ liệu của người trước;
//  - "Mở lại" một hồ sơ đã lưu -> nạp đúng thông tin đã lưu trong hồ sơ.
function emptyRmCtx(key){return {key, arrival:'', penalty:'', minor:false, k8on:false, k8type:'', k8date:'', k8dec:'', k9on:false, k9type:'', k9life:false};}
const RM_CTX_FIELDS=['arrival','penalty','minor','k8on','k8type','k8date','k8dec','k9on','k9type','k9life'];
let rmCtx=emptyRmCtx(null);
function prisonerKey(name,arrestText){return String(name||'').trim()+'|'+String(arrestText||'');}
// Chuyển sang phạm nhân khác -> xóa thông tin của người trước
function useRmContext(key){
  if(rmCtx.key===key)return;
  rmCtx=emptyRmCtx(key);
  quarterGrades={};
  const body=document.getElementById('remissionPageBody');
  if(body)body.innerHTML='';
}
// Ghi lại thông tin đang nhập trên trang giảm án
function captureRmCtx(){
  const ai=document.getElementById('rmArrival');
  if(!ai)return;
  const v=id=>{const el=document.getElementById(id);return el?el.value:'';};
  const k8=document.getElementById('rmK8'), kb=document.getElementById('rmK8Btn'), pr=document.getElementById('rmPriority');
  rmCtx.arrival=ai.value;
  rmCtx.penalty=v('rmPenaltyCount');
  rmCtx.minor=!!(pr&&pr.checked);
  rmCtx.k8on=!!(k8&&k8.checked);
  rmCtx.k8type=kb?(kb.dataset.value||''):'';
  rmCtx.k8date=v('rmK8Date');
  rmCtx.k8dec=v('rmK8DecDate');
  const k9=document.getElementById('rmK9'), k9b=document.getElementById('rmK9Btn'), k9l=document.getElementById('rmK9Life');
  rmCtx.k9on=!!(k9&&k9.checked);
  rmCtx.k9type=k9b?(k9b.dataset.value||''):'';
  rmCtx.k9life=!!(k9l&&k9l.checked);
}
// Điền lại thông tin đã ghi nhớ vào trang giảm án vừa dựng (chưa tính lại)
function applyRmCtx(){
  const ai=document.getElementById('rmArrival');
  if(!ai)return;
  const setVal=(id,val)=>{const el=document.getElementById(id);if(el&&val){el.value=val;toggleClearBtn(el);}};
  setVal('rmArrival',rmCtx.arrival);
  const pc=document.getElementById('rmPenaltyCount');
  if(pc&&rmCtx.penalty)pc.value=rmCtx.penalty;
  if(rmCtx.minor){
    document.getElementById('rmPriority').checked=true;
    updatePriorityMilestone(true);
  }
  if(rmCtx.k8on){
    document.getElementById('rmK8').checked=true;
    document.getElementById('rmK8Detail').style.display='block';
    const opt=document.querySelector('#rmK8List .k8-opt[data-v="'+(rmCtx.k8type==='5'?'5':(rmCtx.k8type==='4'?'4':''))+'"]');
    if(opt){
      const btn=document.getElementById('rmK8Btn');
      btn.dataset.value=opt.dataset.v;
      btn.textContent=opt.querySelector('span').textContent;
      btn.classList.add('has-value');
      opt.classList.add('sel');
    }
    setVal('rmK8DecDate',rmCtx.k8dec);
    setVal('rmK8Date',rmCtx.k8date);
  }
  if(rmCtx.k9on){
    document.getElementById('rmK9').checked=true;
    document.getElementById('rmK9Detail').style.display='block';
    const opt=document.querySelector('#rmK9List .k9-opt[data-v="'+(rmCtx.k9type==='10'?'10':(rmCtx.k9type==='9'?'9':''))+'"]');
    if(opt){
      const btn=document.getElementById('rmK9Btn');
      btn.dataset.value=opt.dataset.v;
      btn.textContent=opt.querySelector('span').textContent;
      btn.classList.add('has-value');
      opt.classList.add('sel');
    }
    const lf=document.getElementById('rmK9Life');
    if(lf&&rmCtx.k9life)lf.checked=true;
  }
}
let qPickKey=null;

// ===== TỰ XẾP LOẠI THEO ĐIỀU 25, 26 NĐ 170/2026 =====
// Dùng chung cho trang Tra cứu giảm án và Hồ sơ phạm nhân. Người dùng vẫn chỉnh đè được từng quý.
//   o: {arrival, today, k8on, k8dec, k8ok, k9on}  (arrival, today, k8dec, k8ok: Date hoặc null)
//   Trả về {kem:{'2025-I':'Kem',...}, tb:{'2025-II':'TB',...}}
function autoGrades(o){
  const kem={}, tb={};
  if(!o.arrival||!o.today)return {kem,tb};
  const qs=completedQuarters(o.arrival,o.today);
  if(!qs.length)return {kem,tb};
  const qStart=q=>{
    const d=QUARTER_DEFS.find(x=>x.name===q.qname);
    return new Date(q.year+d.startYearOffset,d.startMonth-1,1);
  };
  // Đánh dấu Trung bình cho các quý phủ khoảng 3 tháng kể từ mốc "from"
  const markTB3Months=(from)=>{
    const end=new Date(from.getFullYear(),from.getMonth()+QUY_DINH.thangTrungBinhSauKem,0);   // hết tháng cuối
    qs.forEach(q=>{
      if(kem[q.key])return;                     // đã Kém thì giữ Kém
      const st=qStart(q);
      if(q.end>=from && st<=end)tb[q.key]='TB';
    });
  };
  // Điều 26 khoản 2: bị kỷ luật -> Kém từ quý có quyết định kỷ luật tới khi được công nhận tiến bộ
  const k8ok=o.k8on?o.k8ok:null;
  if(o.k8on&&o.k8dec){
    qs.forEach(q=>{
      const st=qStart(q);
      if(q.end>=o.k8dec && (!k8ok||st<k8ok))kem[q.key]='Kem';
    });
  }
  // Điều 26 khoản 3, 4, 5: phạm tội mới -> Kém 02 quý đầu
  let lastKemEnd=null;
  if(o.k9on){
    qs.filter(q=>q.end>=o.arrival).slice(0,QUY_DINH.quyKemPhamToiMoi).forEach(q=>{kem[q.key]='Kem'; lastKemEnd=q.end;});
  }
  // Điều 25: hết diện Kém thì ít nhất 03 tháng liền kề xếp Trung bình
  //  a) sau tháng có quyết định công nhận đã cải tạo tiến bộ
  if(k8ok)markTB3Months(new Date(k8ok.getFullYear(),k8ok.getMonth()+1,1));
  //  b) sau quý cuối bị xếp loại Kém do phạm tội mới
  if(lastKemEnd)markTB3Months(new Date(lastKemEnd.getFullYear(),lastKemEnd.getMonth(),lastKemEnd.getDate()+1));
  return {kem,tb};
}
// Xếp loại thực tế của 1 quý: chọn tay > Kém theo Điều 26 > Trung bình theo Điều 25 > mặc định Khá
function effectiveGrade(key,manual,auto){
  if(manual&&Object.prototype.hasOwnProperty.call(manual,key))return manual[key];
  if(auto.kem[key])return auto.kem[key];
  if(auto.tb[key])return auto.tb[key];
  return 'Kha';
}
// Tổng số quý Khá trở lên và số quý Khá liền kề gần nhất
function gradeStats(qs,gradeFn){
  let total=0, adj=0;
  qs.forEach(q=>{const g=gradeFn(q.key); if(g==='Tot'||g==='Kha')total++;});
  for(let i=qs.length-1;i>=0;i--){
    const g=gradeFn(qs[i].key);
    if(g==='Tot'||g==='Kha')adj++; else break;
  }
  return {total, adj, count:qs.length};
}
// Bảng xếp loại theo năm/quý (năm mới nhất lên đầu); interactive=true -> bấm vào ô để đổi
function gradeTableHTML(qs,gradeFn,interactive){
  const years=[...new Set(qs.map(q=>q.year))].sort((a,b)=>b-a);
  const names=['I','II','III','IV'];
  let html='<table class="qgrid"><tr><th class="qg-year">NĂM</th>'
         + names.map(n=>'<th>QUÝ '+n+'</th>').join('') + '</tr>';
  years.forEach(y=>{
    html+='<tr><td class="qg-year">'+y+'</td>';
    names.forEach(n=>{
      const q=qs.find(x=>x.year===y&&x.qname===n);
      if(!q){html+='<td class="qg-empty"></td>';return;}
      const g=gradeFn(q.key), label=escHtml(GRADE_SHORT[g]||g);
      html+=interactive
        ? '<td><button type="button" class="qg-cell '+gradeClass(g)+'" data-k="'+q.key
          +'" onclick="openQPick(\''+q.key+'\',\'Quý '+n+'/'+y+'\')">'+label+'</button></td>'
        : '<td><span class="qg-cell '+gradeClass(g)+'" style="display:block;cursor:default">'+label+'</span></td>';
    });
    html+='</tr>';
  });
  return html+'</table>';
}

// Trạng thái tự xếp loại của trang Tra cứu giảm án (tính lại mỗi lần thông tin thay đổi)
let autoKem={};      // quý bị xếp Kém theo Điều 26
let autoTB={};       // quý phải xếp Trung bình theo Điều 25

function computeAutoKem(){
  autoKem={}; autoTB={};
  if(!lastEligibleData)return;
  const arrival=getArrivalDate();
  if(!arrival)return;
  const k8on=!!(document.getElementById('rmK8')&&document.getElementById('rmK8').checked);
  const r=autoGrades({arrival, today:lastEligibleData.today, k8on,
    k8dec:k8on?getK8DecDate():null, k8ok:k8on?getK8Date():null,
    k9on:!!(document.getElementById('rmK9')&&document.getElementById('rmK9').checked)});
  autoKem=r.kem; autoTB=r.tb;
}
function gradeOf(key){return effectiveGrade(key,quarterGrades,{kem:autoKem,tb:autoTB});}
function gradeClass(k){const g=GRADES.find(x=>x.k===k);return g?g.c:'qg-kha';}

// Dựng bảng xếp loại theo các quý đủ điều kiện (từ ngày đến trại -> ngày tham chiếu)
function renderQuarterGrid(){
  const wrap=document.getElementById('rmQGrid'), sum=document.getElementById('rmQSum');
  if(!wrap||!lastEligibleData)return;
  const arrival=getArrivalDate();
  const qs=arrival?completedQuarters(arrival,lastEligibleData.today):[];
  if(!qs.length){
    // Đã nhập Ngày đến trại nhưng tính đến ngày tham chiếu (hiện tại/giả định) chưa có quý nào
    // đủ điều kiện xếp loại (Điều 21) -> báo chưa đủ thời gian; chưa nhập -> nhắc nhập ngày đến trại.
    wrap.innerHTML=arrival
      ? '<div class="qgrid-none">Chưa đủ thời gian xếp loại Quý</div>'
      : '<div class="qgrid-none">Nhập <b>Ngày đến trại</b> ở trên để hiển thị bảng xếp loại theo từng quý.</div>';
    if(sum)sum.innerHTML='';
    return;
  }
  // dọn các quý không còn nằm trong danh sách
  const valid={}; qs.forEach(q=>valid[q.key]=1);
  Object.keys(quarterGrades).forEach(k=>{if(!valid[k])delete quarterGrades[k];});

  wrap.innerHTML=gradeTableHTML(qs,gradeOf,true);

  const st=quarterStats();
  if(sum){
    sum.innerHTML='Tổng <b>'+st.total+' quý</b> Khá trở lên / '+qs.length+' quý đã xếp loại · '
                 +'Liền kề gần nhất: <b>'+st.adj+' quý</b>';
  }
}

// Thống kê: tổng quý Khá trở lên & số quý liền kề gần nhất
function quarterStats(){
  const arrival=getArrivalDate();
  const qs=(arrival&&lastEligibleData)?completedQuarters(arrival,lastEligibleData.today):[];
  return gradeStats(qs,gradeOf);
}

function openQPick(key,title){
  qPickKey=key;
  document.getElementById('qPickTitle').textContent='Xếp loại '+title;
  const cur=gradeOf(key);
  document.getElementById('qPickOpts').innerHTML=GRADES.map(g=>
    '<button type="button" class="qpick-opt '+g.c+(g.k===cur?' sel':'')+'" onclick="setQGrade(\''+g.k+'\')">'+g.t+'</button>'
  ).join('');
  document.getElementById('qPickOverlay').style.display='flex';
}
function setQGrade(k){
  if(qPickKey)quarterGrades[qPickKey]=k;
  closeQPick();
  renderQuarterGrid();
  refreshRemissionGrade();
}
function closeQPick(){
  document.getElementById('qPickOverlay').style.display='none';
  qPickKey=null;
}

function showWarn(msg){
  const t=document.getElementById('qwText');
  if(t)t.textContent=msg;
  document.getElementById('quarterWarn').style.display='flex';
}
function closeQuarterWarn(){
  document.getElementById('quarterWarn').style.display='none';
}

// Cộng thêm n quý (mỗi quý 3 tháng) vào một mốc ngày
function addQuarters(d,n){
  const r=new Date(d.getTime());
  r.setMonth(r.getMonth()+n*3);
  return r;
}
