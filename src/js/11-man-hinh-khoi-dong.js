// ===== Màn hình khởi động (intro) =====
(function(){
  const splash=document.getElementById('splash');
  if(!splash)return;
  const MIN_SHOW=1100;               // hiển thị tối thiểu để không bị chớp
  const MAX_SHOW=5000;               // chốt chặn: luôn ẩn sau 5s dù có lỗi
  const t0=Date.now();
  let done=false;
  // Logo đã có src sẵn trong HTML nên hiện ngay, không bị ô vuông trống.
  // Hàm này chỉ để dự phòng: nếu file icon không tải được thì lấy logo trong header.
  function fillLogo(){
    const dst=document.getElementById('splashLogo');
    if(!dst)return;
    if(dst.dataset.failed==='1'||!dst.complete||dst.naturalWidth===0){
      const src=document.querySelector('.logo-img');
      if(src&&src.src){
        dst.onload=function(){dst.classList.add('ready');};
        dst.src=src.src;
      }
    }
    if(dst.complete&&dst.naturalWidth>0)dst.classList.add('ready');
  }
  function hide(){
    if(done)return;done=true;
    splash.classList.add('hide');
    setTimeout(()=>{if(splash&&splash.parentNode)splash.parentNode.removeChild(splash);},600);
  }
  function ready(){
    const wait=Math.max(0,MIN_SHOW-(Date.now()-t0));
    setTimeout(hide,wait);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',fillLogo);
  else fillLogo();
  if(document.readyState==='complete')ready();
  else window.addEventListener('load',ready);
  setTimeout(hide,MAX_SHOW);
})();

function closeRemissionPage(){
  setFlipAction(false);     // lật ngược lại thành Sao chép
  const p=document.getElementById('remissionPage');
  p.classList.remove('show');
  p.classList.remove('swiping');
  p.style.transform='';
  // Cuộn popup kết quả về đầu khi quay lại
  const rs=document.getElementById('resultScroll');
  if(rs)rs.scrollTop=0;
}

// Vuốt từ mép trái sang phải để quay lại popup "Kết quả tính toán"
function initRemissionBackSwipe(){
  const page=document.getElementById('remissionPage');
  if(!page||page.dataset.swipeBound)return;
  page.dataset.swipeBound='1';
  const THRESHOLD=0.28;   // kéo quá 28% bề rộng thì quay lại
  let startX=0,startY=0,w=0,active=false,decided=false,horiz=false,dxLast=0,t0=0,pid=null,savedTop=0;
  page.addEventListener('pointerdown',e=>{
    if(!page.classList.contains('show'))return;
    if(e.target.closest&&e.target.closest('input,textarea,select,button,label,a'))return; // không cản thao tác nhập/bấm
    const r=page.getBoundingClientRect();
    startX=e.clientX;startY=e.clientY;w=r.width||1;
    active=true;decided=false;horiz=false;dxLast=0;t0=Date.now();pid=e.pointerId;
    page.style.transition='none';
  });
  page.addEventListener('pointermove',e=>{
    if(!active)return;
    const dx=e.clientX-startX, dy=e.clientY-startY;
    if(!decided){
      if(Math.abs(dx)>Math.abs(dy)&&Math.abs(dx)>8){
        decided=true;horiz=true;
        const b=page.querySelector('.slide-page-body');
        if(b){savedTop=b.scrollTop;}
        page.classList.add('swiping');           // khóa cuộn dọc khi đang vuốt ngang
        if(b){b.scrollTop=savedTop;}
        try{page.setPointerCapture(pid)}catch(_){}
      }
      else if(Math.abs(dy)>8){decided=true;horiz=false;}
    }
    if(horiz){
      e.preventDefault();
      dxLast=Math.max(0,dx);                       // chỉ cho kéo sang phải
      page.style.transform='translateX('+dxLast+'px)';
    }
  });
  const finish=()=>{
    if(!active)return;active=false;
    page.style.transition='';
    if(horiz){
      const fast=(Date.now()-t0)<300&&dxLast>60;
      if(dxLast>w*THRESHOLD||fast){closeRemissionPage();}
      else{page.style.transform='';}                // chưa đủ -> trả về chỗ cũ
      page.classList.remove('swiping');             // mở lại cuộn dọc
      const b=page.querySelector('.slide-page-body');
      if(b)b.scrollTop=savedTop;                    // giữ nguyên vị trí đang đọc
    }
    try{page.releasePointerCapture(pid)}catch(_){}
  };
  page.addEventListener('pointerup',finish);
  page.addEventListener('pointercancel',finish);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',initRemissionBackSwipe);
else initRemissionBackSwipe();
