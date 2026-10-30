// ===== KHÓA CUỘN TRANG NỀN KHI CÓ POPUP =====
// Theo dõi mọi lớp phủ; khi có ít nhất 1 popup mở thì khóa cuộn trang chính,
// giữ nguyên vị trí đang đọc và trả lại đúng chỗ khi đóng.
let __scrollLockY=0, __scrollLocked=false;
function lockBodyScroll(){
  if(__scrollLocked)return;
  __scrollLockY=window.scrollY||window.pageYOffset||0;
  // Chỉ khóa cuộn, KHÔNG dịch chuyển trang -> không sinh khoảng hụt ở chân màn hình
  document.documentElement.classList.add('no-scroll');
  document.body.classList.add('no-scroll');
  __scrollLocked=true;
}
function unlockBodyScroll(){
  if(!__scrollLocked)return;
  document.documentElement.classList.remove('no-scroll');
  document.body.classList.remove('no-scroll');
  __scrollLocked=false;
}
function anyOverlayOpen(){
  const ovs=document.querySelectorAll('.modal-overlay,.choice-overlay');
  for(const o of ovs){
    // popup có thể mở bằng style.display='flex' hoặc bằng class 'show'
    if(o.style.display==='flex'||o.classList.contains('show'))return true;
  }
  const rp=document.getElementById('remissionPage');
  if(rp&&rp.classList.contains('show'))return true;
  return false;
}
function syncBodyScrollLock(){
  if(anyOverlayOpen())lockBodyScroll(); else unlockBodyScroll();
}
// Tự phát hiện mọi thay đổi hiển thị của popup (không phải sửa từng hàm mở/đóng)
document.addEventListener('DOMContentLoaded',function(){
  // Đưa MỌI lớp phủ (kết quả, xác nhận, chọn phạm vi áp dụng, quét QR...)
  // ra ngoài .app, vì .app tạo ngữ cảnh xếp lớp riêng (position:relative;z-index:1)
  // khiến các popup bên trong nó không thể nổi lên trên popup đã bị đưa ra ngoài.
  document.querySelectorAll('.modal-overlay,.choice-overlay,.scan-overlay').forEach(o=>{
    if(o.parentElement!==document.body)document.body.appendChild(o);
  });
  const obs=new MutationObserver(()=>syncBodyScrollLock());
  document.querySelectorAll('.modal-overlay,.choice-overlay').forEach(o=>obs.observe(o,{attributes:true,attributeFilter:['style','class']}));
  const rp=document.getElementById('remissionPage');
  if(rp)obs.observe(rp,{attributes:true,attributeFilter:['class']});
});

// Chặn hoàn toàn các cử chỉ zoom của trình duyệt (pinch, gesture, double-tap)
document.addEventListener('gesturestart', e => e.preventDefault());
document.addEventListener('gesturechange', e => e.preventDefault());
document.addEventListener('gestureend', e => e.preventDefault());

document.addEventListener('touchmove', e => {
  if (e.touches.length > 1) e.preventDefault(); // chặn pinch 2 ngón
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', e => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) e.preventDefault(); // chặn double-tap zoom
  lastTouchEnd = now;
}, { passive: false });

document.addEventListener('dblclick', e => e.preventDefault());

// ===== HIỆU ỨNG RUNG NHẸ (Vibration API) khi chạm vào nút và ô nhập =====
// Lưu ý: iOS Safari hiện KHÔNG hỗ trợ Vibration API nên sẽ tự bỏ qua (không lỗi).
// Trên Android (Chrome...) sẽ rung nhẹ khi chạm.
function haptic(ms){
  try{
    if(window.navigator&&typeof window.navigator.vibrate==='function'){
      window.navigator.vibrate(ms);
    }
  }catch(e){/* bỏ qua nếu không hỗ trợ */}
}

// Gắn 1 lần cho toàn trang (event delegation): chạm vào button -> rung 12ms, input -> rung 8ms
document.addEventListener('pointerdown',(e)=>{
  const t=e.target;
  if(!t)return;
  if(t.closest('button')){
    haptic(12);
  }else if(t.matches('input, textarea, select')||t.closest('.input-clearable')){
    haptic(8);
  }
},{passive:true});

document.addEventListener('keydown',(e)=>{
  if(e.key==='Escape'){
    const mc=document.getElementById('modeChoiceOverlay');
    if(mc && mc.classList.contains('show')){closeModeChoice();return;}
    const so=document.getElementById('scanOverlay');
    if(so && so.classList.contains('show')){closeScanner();return;}
    closeModal();closeAnnex();closeGuide();closeDecree();closeReceipt();
  }
});
