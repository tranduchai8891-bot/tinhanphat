// ===== TRA CỨU BIÊN LAI ĐIỆN TỬ (Bộ Tư pháp) =====
const RECEIPT_LOOKUP_URL='https://kyta.fpt.com/tra-cuu/?bienlai=';

function openReceipt(){
  document.getElementById('receiptOverlay').classList.add('show');
  document.body.style.overflow='hidden';
  showReceiptMsg('');
}
function closeReceipt(){
  closeScanner();
  document.getElementById('receiptOverlay').classList.remove('show');
  document.body.style.overflow='';
}
function showReceiptMsg(text, type){
  const el=document.getElementById('receiptMsg');
  if(!el)return;
  if(!text){el.className='rc-msg';el.textContent='';return;}
  el.className='rc-msg show '+(type||'');
  el.textContent=text;
}

// Tách mã biên lai từ nội dung QR: có thể là URL đầy đủ hoặc chỉ là mã.
function extractReceiptCode(raw){
  if(!raw)return '';
  let s=String(raw).trim();
  // Nếu là đường dẫn có tham số bienlai=... thì lấy giá trị đó
  const m=s.match(/[?&]bienlai=([^&\s#]+)/i);
  if(m)return decodeURIComponent(m[1]);
  // Nếu là URL khác -> lấy phần cuối đường dẫn
  if(/^https?:\/\//i.test(s)){
    try{
      const u=new URL(s);
      const last=u.pathname.split('/').filter(Boolean).pop();
      return last||'';
    }catch(e){ return ''; }
  }
  return s;
}

// Mở trang tra cứu chính thức với mã đã nhập/quét.
// sameTab = true  -> điều hướng thẳng ở tab hiện tại (dùng khi vừa quét QR xong,
//                    vì window.open lúc này KHÔNG do người dùng bấm nên bị trình duyệt chặn).
// sameTab = false -> mở tab mới (khi người dùng tự bấm nút Tra cứu), có dự phòng nếu bị chặn.
function lookupReceipt(code, sameTab){
  const input=document.getElementById('receiptCode');
  let c=(code!==undefined && code!==null) ? String(code) : (input? input.value : '');
  c=extractReceiptCode(c).trim();
  if(!c){
    showReceiptMsg('Vui lòng nhập mã tra cứu hoặc quét mã QR trên biên lai.','err');
    if(input)input.focus();
    return;
  }
  if(input)input.value=c;
  showReceiptMsg('Đang mở cổng tra cứu chính thức của Bộ Tư pháp…','ok');
  const url=RECEIPT_LOOKUP_URL+encodeURIComponent(c);
  if(sameTab){
    window.location.href=url;
    return;
  }
  const w=window.open(url,'_blank','noopener');
  if(!w){ window.location.href=url; }   // bị chặn pop-up -> điều hướng luôn
}

// ===== QUÉT MÃ QR BẰNG CAMERA =====
let scanStream=null, scanRAF=null, scanCanvas=null, scanCtx=null;

async function openScanner(){
  const ov=document.getElementById('scanOverlay');
  const video=document.getElementById('scanVideo');
  const tip=document.getElementById('scanTip');
  ov.classList.add('show');
  tip.textContent='Đang khởi động camera…';

  if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
    tip.textContent='Thiết bị hoặc trình duyệt không hỗ trợ mở camera. Vui lòng nhập mã bằng tay.';
    return;
  }
  try{
    scanStream=await navigator.mediaDevices.getUserMedia({
      video:{facingMode:{ideal:'environment'}}, audio:false
    });
    video.srcObject=scanStream;
    await video.play();
    tip.textContent='Đang tìm mã QR…';
    if(!scanCanvas){scanCanvas=document.createElement('canvas');scanCtx=scanCanvas.getContext('2d',{willReadFrequently:true});}
    scanLoop();
  }catch(err){
    let msg='Không mở được camera.';
    if(err && (err.name==='NotAllowedError'||err.name==='SecurityError')) msg='Bạn chưa cho phép truy cập camera. Vui lòng cấp quyền trong cài đặt trình duyệt, hoặc nhập mã bằng tay.';
    else if(err && err.name==='NotFoundError') msg='Không tìm thấy camera trên thiết bị.';
    tip.textContent=msg;
  }
}

function scanLoop(){
  const video=document.getElementById('scanVideo');
  const ov=document.getElementById('scanOverlay');
  if(!ov.classList.contains('show')){return;}
  if(video && video.readyState===video.HAVE_ENOUGH_DATA && typeof jsQR==='function'){
    const w=video.videoWidth, h=video.videoHeight;
    if(w && h){
      // Chỉ quét vùng giữa khung hình cho nhanh và chính xác
      const side=Math.floor(Math.min(w,h)*0.7);
      const sx=Math.floor((w-side)/2), sy=Math.floor((h-side)/2);
      const target=Math.min(side, 500);
      scanCanvas.width=target; scanCanvas.height=target;
      scanCtx.drawImage(video, sx, sy, side, side, 0, 0, target, target);
      try{
        const img=scanCtx.getImageData(0,0,target,target);
        const res=jsQR(img.data, img.width, img.height, {inversionAttempts:'attemptBoth'});
        if(res && res.data){
          onScanned(res.data);
          return;
        }
      }catch(e){/* bỏ qua khung lỗi */}
    }
  }
  scanRAF=requestAnimationFrame(scanLoop);
}

function onScanned(text){
  const code=extractReceiptCode(text);
  const tip=document.getElementById('scanTip');
  if(!code){
    tip.textContent='Mã QR không hợp lệ. Vui lòng thử lại hoặc nhập mã bằng tay.';
    scanRAF=requestAnimationFrame(scanLoop);
    return;
  }
  if(navigator.vibrate)try{navigator.vibrate(60)}catch(e){}
  // Khung sáng xanh báo đã bắt được mã
  const frame=document.querySelector('.scan-frame');
  if(frame)frame.classList.add('hit');
  tip.textContent='✅ Đã đọc mã: '+code+' — đang mở trang tra cứu…';
  // Chờ một nhịp để người dùng thấy khung xanh, rồi nhảy thẳng sang trang tra cứu
  setTimeout(()=>{
    closeScanner();
    const input=document.getElementById('receiptCode');
    if(input){input.value=code;toggleClearBtn(input);}
    lookupReceipt(code, true);   // điều hướng thẳng, không bị chặn pop-up
  },450);
}

function closeScanner(){
  const ov=document.getElementById('scanOverlay');
  if(ov)ov.classList.remove('show');
  const frame=document.querySelector('.scan-frame');
  if(frame)frame.classList.remove('hit');
  if(scanRAF){cancelAnimationFrame(scanRAF);scanRAF=null;}
  if(scanStream){
    try{scanStream.getTracks().forEach(t=>t.stop());}catch(e){}
    scanStream=null;
  }
  const video=document.getElementById('scanVideo');
  if(video)video.srcObject=null;
}

// Gập/mở một điều trong accordion Nghị định
function toggleDecree(btn){
  const acc=btn.parentElement;
  const open=acc.classList.toggle('open');
  btn.setAttribute('aria-expanded', open?'true':'false');
}

function openGuide(){
  document.getElementById('guideOverlay').classList.add('show');
  document.body.style.overflow='hidden';
}

function closeGuide(){
  document.getElementById('guideOverlay').classList.remove('show');
  document.body.style.overflow='';
}

let lastProgressPct=0;
let progressAnimId=null;

// Chạy thanh tiến độ mượt từ 0% đến target% với easing (ease-out), đồng bộ cả % chữ.
function animateProgress(target){
  const bar=document.getElementById('progressBar');
  const pctLabel=document.getElementById('progressPct');
  if(!bar)return;
  if(progressAnimId)cancelAnimationFrame(progressAnimId);
  bar.style.transition='none';
  bar.style.width='0%';
  // Tôn trọng người dùng tắt chuyển động
  if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches){
    bar.style.width=target+'%';
    if(pctLabel)pctLabel.textContent='Đã chấp hành: '+target+'%';
    return;
  }
  const duration=900; // ms
  let startTime=null;
  function frame(ts){
    if(startTime===null)startTime=ts;
    const elapsed=ts-startTime;
    const t=Math.min(1,elapsed/duration);
    const eased=1-Math.pow(1-t,3); // ease-out cubic
    const cur=target*eased;
    bar.style.width=cur+'%';
    if(pctLabel)pctLabel.textContent='Đã chấp hành: '+Math.round(cur)+'%';
    if(t<1){
      progressAnimId=requestAnimationFrame(frame);
    }else{
      bar.style.width=target+'%';
      if(pctLabel)pctLabel.textContent='Đã chấp hành: '+target+'%';
      progressAnimId=null;
    }
  }
  progressAnimId=requestAnimationFrame(frame);
}

function openModal(){
  document.getElementById('modalOverlay').classList.add('show');
  document.body.style.overflow='hidden';
  // Cuộn nội dung kết quả về đầu
  const rs=document.getElementById('resultScroll');
  if(rs)rs.scrollTop=0;
  // Chạy hiệu ứng thanh tiến độ sau khi modal hiện ra
  requestAnimationFrame(()=>{
    setTimeout(()=>animateProgress(lastProgressPct),120);
  });
}

function closeModal(){
  document.getElementById('modalOverlay').classList.remove('show');
  document.body.style.overflow='';
  closeRemissionPage();
}

function copyResultText(evt){
  if(!lastResultText)return;
  // Đổi chữ ở đúng mặt đang hiển thị (tránh chữ hiện ngược ở mặt kia)
  const sel=flipIsSave?'#flipInner .flip-back':'#flipInner .flip-front';
  const face=document.querySelector(sel);
  const btn=face||(evt&&evt.currentTarget);
  if(!btn)return;
  const oldText=btn.textContent;
  const done=()=>{btn.textContent='✅ Đã sao chép';setTimeout(()=>{btn.textContent=oldText},1500)};

  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(lastResultText).then(done).catch(()=>fallbackCopy(lastResultText,done));
  }else{
    fallbackCopy(lastResultText,done);
  }
}

function fallbackCopy(text,done){
  const ta=document.createElement('textarea');
  ta.value=text;
  ta.style.position='fixed';
  ta.style.opacity='0';
  document.body.appendChild(ta);
  ta.select();
  try{document.execCommand('copy');done();}catch(e){alert('Không thể sao chép tự động. Vui lòng chọn và sao chép thủ công.');}
  document.body.removeChild(ta);
}
