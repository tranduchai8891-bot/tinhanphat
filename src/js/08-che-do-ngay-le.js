// ===== ĐỔI CHẾ ĐỘ TÍNH NGÀY LẺ =====
let lastCalcRaw=null;   // kết quả đang hiển thị (để tính lại khi đổi chế độ)

const CALC_MODE_NOTE={
  qlpn:'Quy ước <b>30 ngày = 01 tháng</b> khi cộng ngày lẻ (giống phần mềm QLPN cũ).',
  thuc:'Cộng ngày lẻ theo <b>lịch thực tế</b> (tháng 28/29/30/31 ngày).'
};

function syncCalcModeButtons(){
  const bQ=document.getElementById('btnModeQlpn');
  const bT=document.getElementById('btnModeThuc');
  const note=document.getElementById('calcModeNote');
  if(bQ)bQ.classList.toggle('active',CALC_MODE==='qlpn');
  if(bT)bT.classList.toggle('active',CALC_MODE==='thuc');
  if(note){
    let t=CALC_MODE_NOTE[CALC_MODE]||'';
    if(CALC_MODE==='thuc'){
      t += CALC_MODE_DEFAULT==='thuc'
        ? ' <span style="color:#1d6f42">(đang <b style="color:#1d6f42">luôn áp dụng</b>)</span>'
        : ' <span style="color:#9b6a0a">(chỉ áp dụng lần này)</span>';
    }
    note.innerHTML=t;
  }
}

// Chế độ MẶC ĐỊNH mỗi khi mở kết quả. Người dùng có thể đổi bằng "Luôn áp dụng".
let CALC_MODE_DEFAULT='qlpn';
function loadDefaultCalcMode(){
  try{
    const m=localStorage.getItem('prison_calc_mode_default');
    if(m==='thuc'||m==='qlpn')CALC_MODE_DEFAULT=m;
  }catch(e){}
}
function saveDefaultCalcMode(m){
  CALC_MODE_DEFAULT=m;
  try{localStorage.setItem('prison_calc_mode_default',m);}catch(e){}
}

// mode: 'qlpn' | 'thuc'; asDefault=true -> đặt luôn làm mặc định cho lần sau
function setCalcMode(mode,asDefault){
  if(mode!=='qlpn'&&mode!=='thuc')return;
  CALC_MODE=mode;
  if(asDefault)saveDefaultCalcMode(mode);
  syncCalcModeButtons();
  recomputeByMode();
}

// Mở cửa sổ hỏi phạm vi áp dụng khi chọn "Áp dụng theo ngày thực"
function askRealDayMode(){
  document.getElementById('modeChoiceOverlay').classList.add('show');
}
function closeModeChoice(){
  document.getElementById('modeChoiceOverlay').classList.remove('show');
}
// always=true  -> dùng ngày thực cho tất cả lần sau
// always=false -> CHỈ dùng cho lần này; lần sau quay về QLPN - C10
//                 (nếu trước đó đang "luôn áp dụng" thì hủy trạng thái đó)
function chooseRealDay(always){
  closeModeChoice();
  CALC_MODE='thuc';
  saveDefaultCalcMode(always ? 'thuc' : 'qlpn');
  syncCalcModeButtons();
  recomputeByMode();
}
