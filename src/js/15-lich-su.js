// ===== LỊCH SỬ TRA CỨU (lưu trên trình duyệt, tối đa 50 lần, mới nhất lên đầu) =====
const HISTORY_KEY='prison_calc_history_v1';
const HISTORY_MAX=50;

function loadHistory(){return readStore('history');}

function saveToHistory(entry){
  let history=loadHistory();
  history.unshift(entry); // mới nhất lên đầu
  if(history.length>HISTORY_MAX)history=history.slice(0,HISTORY_MAX);
  if(!writeStore('history',history))console.error('Không thể lưu lịch sử');
  renderHistory();
}

function deleteHistoryItem(index){
  let history=loadHistory();
  history.splice(index,1);
  writeStore('history',history);
  renderHistory();
}

let lastHistoryText='';

function openHistoryDetail(index){
  CALC_MODE=CALC_MODE_DEFAULT;
  const h=loadHistory()[index];
  if(!h)return;
  // Bản ghi cũ không có dữ liệu thô -> dùng popup chi tiết đơn giản (tương thích ngược)
  if(!h._raw){
    openHistoryDetailLegacy(h);
    return;
  }
  // Tính lại từ dữ liệu nhập đã lưu, đúng ngày tham chiếu và chế độ tính của lần tra cứu đó
  const R=h._raw;
  const inp={
    name:R.name,
    arrestDate:new Date(R.arrestISO),
    sentMonths:R.sentMonths, sD:R.sD,
    preDetMonths:R.preDetMonths, pdD:R.pdD,
    remMonths:(typeof R.remMonths==='number')?R.remMonths:(R.totalDeductMonths-R.preDetMonths),
    remissionsSnapshot:(R.remissionsSnapshot||[]).map(r=>({months:r.months||0})),
    escapes:escListFromISO(R.escapes)
  };
  CALC_MODE=resolveCalcMode(h.calcMode,
    m=>escShift(calcRelease(inp.arrestDate,inp.sentMonths,inp.sD,inp.preDetMonths+inp.remMonths,inp.pdD,m),inp.escapes,m),
    fmtDate(new Date(R.releaseISO)));
  useRmContext(prisonerKey(inp.name,fmtDate(inp.arrestDate)));
  renderResult(computeSentence(inp,new Date(R.todayISO),CALC_MODE));
  shownHistoryIdx=index;
  // Bảo đảm trang tra cứu giảm án đóng, rồi mở popup kết quả
  const rp=document.getElementById('remissionPage');
  if(rp)rp.classList.remove('show');
  openModal();
}

// Popup chi tiết đơn giản cho bản ghi lịch sử CŨ (không có dữ liệu thô)
function openHistoryDetailLegacy(h){
  const e=v=>escHtml(v==null?'':String(v));
  lastHistoryText=
`KẾT QUẢ TÍNH TOÁN THỜI HẠN CHẤP HÀNH ÁN
----------------------------------------
Thời điểm tra cứu: ${h.time}
Tính đến ngày: ${h.refDate||'(không rõ)'}
Ngày bắt giam: ${h.arrestDate}
Mức án ban đầu: ${h.sentence}
Trừ tạm giam: ${h.preDet}
Tổng được giảm: ${h.remission}
Mốc đạt 1/4 mức án: ${h.m25}
Mốc đạt 1/3 mức án: ${h.m33}
Mốc đạt 1/2 mức án: ${h.m50}
Thời gian đã chấp hành: ${h.served}
Thời hạn còn lại: ${h.remaining}
Ngày hết án dự kiến: ${h.release}`;

  document.getElementById('historyDetailContent').innerHTML=`
    <div class="result-header" style="margin-bottom:12px">Kết quả tra cứu<span class="result-refdate">${h.refDate?'(tính đến ngày '+e(h.refDate)+')':''}</span></div>
    ${h.name?`<div class="result-name" style="display:flex">${e(h.name)}</div>`:''}
    <p style="font-size:11px;color:#aaa;margin-bottom:14px">🕐 ${e(h.time)}</p>
    <div class="result-grid">
      <div class="metric pink"><div class="lbl">Ngày bắt</div><div class="val">${e(h.arrestDate)}</div></div>
      <div class="metric"><div class="lbl">Mức án</div><div class="val">${e(h.sentence)}</div></div>
      <div class="metric green"><div class="lbl">Tổng được giảm</div><div class="val">${e(h.remission)}</div></div>
      <div class="metric release"><div class="lbl">Ngày hết án dự kiến</div><div class="val">${e(h.release)}</div></div>
      <div class="metric blue"><div class="lbl">Thời gian đã chấp hành</div><div class="val">${e(h.served)}</div></div>
      <div class="metric lime"><div class="lbl">Thời hạn còn lại</div><div class="val">${e(h.remaining)}</div></div>
    </div>
    <div class="milestone-box">
      <div class="tl-title" style="margin-bottom:8px">Ngày đạt các mốc chấp hành</div>
      <div class="milestone-row"><span class="milestone-tag">1/4 mức án</span><span class="milestone-date">${e(h.m25)}</span></div>
      <div class="milestone-row"><span class="milestone-tag">1/3 mức án</span><span class="milestone-date">${e(h.m33)}</span></div>
      <div class="milestone-row"><span class="milestone-tag">1/2 mức án</span><span class="milestone-date">${e(h.m50)}</span></div>
    </div>
    <div class="timeline" style="margin-top:14px">
      <div class="tl-title">Thông tin chi tiết</div>
      <div class="tl-row"><div class="tl-dot blue"></div><div class="tl-content"><div class="lbl">Ngày bắt giam</div><div class="val">${e(h.arrestDate)}</div></div></div>
      <div class="tl-row"><div class="tl-dot amber"></div><div class="tl-content"><div class="lbl">Trừ tạm giam</div><div class="val">${e(h.preDet||'Không có')}</div></div></div>
      <div class="tl-row"><div class="tl-dot amber"></div><div class="tl-content"><div class="lbl">Thời gian giảm án</div><div class="val">${e(h.remission||'Không có')}</div></div></div>
      <div class="tl-row"><div class="tl-dot green"></div><div class="tl-content"><div class="lbl">Ngày hết án dự kiến</div><div class="val">${e(h.release)}</div></div></div>
    </div>
  `;
  document.getElementById('historyDetailOverlay').classList.add('show');
  document.body.style.overflow='hidden';
}


function closeHistoryDetail(){
  document.getElementById('historyDetailOverlay').classList.remove('show');
  document.body.style.overflow='';
  lastHistoryText='';
}

function copyHistoryText(evt){
  if(!lastHistoryText)return;
  const btn=evt.currentTarget;
  const oldText=btn.textContent;
  const done=()=>{btn.textContent='✅ Đã sao chép';setTimeout(()=>{btn.textContent=oldText},1500)};
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(lastHistoryText).then(done).catch(()=>fallbackCopy(lastHistoryText,done));
  }else{
    fallbackCopy(lastHistoryText,done);
  }
}

function clearHistory(){
  askConfirm('Xóa toàn bộ lịch sử tra cứu?','Xóa hết',function(){
    writeStore('history',[]);
    renderHistory();
  });
}

function renderHistory(){
  const history=loadHistory();
  const card=document.getElementById('historyCard');
  const list=document.getElementById('historyList');
  const countEl=document.getElementById('historyCount');

  if(renderLockCard()||history.length===0){
    card.style.display='none';
    return;
  }
  card.style.display='block';
  if(countEl)countEl.textContent=' ('+history.length+'/50)';

  list.innerHTML=history.map((h,i)=>`
    <div class="history-item" onclick="openHistoryDetail(${i})" style="cursor:pointer">
      <div class="history-item-top">
        <span class="history-item-time">🕐 ${escHtml(h.time)}</span>
        <button class="history-item-del" onclick="event.stopPropagation();deleteHistoryItem(${i})" title="Xóa"><svg class="ic-trash" aria-hidden="true"><use href="#ic-trash"/></svg></button>
      </div>
      ${h.name?`<div class="history-item-name">👤 ${escHtml(h.name)}</div>`:''}
      <div class="history-item-row"><span class="lbl">Ngày bắt</span><span class="val">${escHtml(h.arrestDate)}</span></div>
      <div class="history-item-row"><span class="lbl">Án phạt</span><span class="val">${escHtml(h.sentence)}</span></div>
      <div class="history-item-row"><span class="lbl">Ngày hết án</span><span class="val" style="color:#7f1d1d">${escHtml(h.release)}</span></div>
      <div class="history-item-foot">
        <span class="history-item-tap-hint">Bấm để xem chi tiết →</span>
        <button class="btn-save-prof" onclick="event.stopPropagation();saveProfileFromHistory(${i})">+ Lưu hồ sơ</button>
      </div>
    </div>
  `).join('');
}

function escHtml(s){return String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
