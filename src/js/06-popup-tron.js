// ===== POPUP THỜI GIAN TRỐN / TẠM ĐÌNH CHỈ =====
let escapes=[];     // các lần đã lưu (dạng chữ dd/mm/yyyy, theo thứ tự thời gian): [{from,to}]
let escDraft=[];    // bản đang sửa trong popup
let escOwner=null;  // phạm nhân sở hữu dữ liệu trốn/tạm đình chỉ (prisonerKey), null = chưa xác định
function openEscape(){
  escDraft=escapes.length?JSON.parse(JSON.stringify(escapes)):[{from:'',to:''}];
  renderEscRows();
  document.getElementById('escMsg').textContent='';
  document.getElementById('escOverlay').style.display='flex';
}
function closeEscape(){document.getElementById('escOverlay').style.display='none';escDraft=[];}
function escInputHTML(i,k,lbl){
  const id='esc'+k+i, key=k==='F'?'from':'to', v=escDraft[i][key]||'';
  return '<div class="field"><label for="'+id+'">'+lbl+'</label><div class="input-clearable">'
    +'<input type="text" id="'+id+'" class="date-single-input" placeholder=" " inputmode="numeric" maxlength="10" value="'+escHtml(v)+'"'
    +' oninput="formatDateInput(this);toggleClearBtn(this);escEdit('+i+',\''+key+'\',this)"'
    +' onblur="expandYearOnBlur(this);escEdit('+i+',\''+key+'\',this)">'
    +'<span class="esc-ph" aria-hidden="true">ngày/tháng/năm</span>'
    +'<button type="button" class="input-clear-btn" onclick="clearInput(\''+id+'\');escEdit('+i+',\''+key+'\',document.getElementById(\''+id+'\'))" title="Xóa">✕</button>'
    +'</div></div>';
}
function renderEscRows(){
  document.getElementById('escRows').innerHTML=escDraft.map((r,i)=>
    '<div class="esc-row"><div class="esc-row-head"><span class="esc-row-t">Lần '+(i+1)+'</span>'
    +'<span class="esc-dur" id="escDur'+i+'"></span>'
    +'<button type="button" class="field-clear-btn" onclick="removeEscRow('+i+')">Xóa</button></div>'
    +'<div class="esc-grid">'+escInputHTML(i,'F','Từ ngày')+escInputHTML(i,'T','Đến ngày')+'</div></div>').join('');
  escDraft.forEach((r,i)=>['F','T'].forEach(k=>toggleClearBtn(document.getElementById('esc'+k+i))));
  document.getElementById('escAddBtn').style.display=escDraft.length>=ESC_MAX?'none':'';
  updateEscTotals();
}
function escEdit(i,key,el){if(escDraft[i]){escDraft[i][key]=el.value.trim();updateEscTotals();}}
function addEscRow(){
  if(escDraft.length>=ESC_MAX)return;
  escDraft.push({from:'',to:''});
  renderEscRows();
  const el=document.getElementById('escF'+(escDraft.length-1)); if(el)el.focus();
}
function removeEscRow(i){
  escDraft.splice(i,1);
  if(!escDraft.length)escDraft.push({from:'',to:''});
  renderEscRows();
}
function clearEscAll(){escDraft=[{from:'',to:''}];renderEscRows();document.getElementById('escMsg').textContent='';}
function updateEscTotals(){
  let tot={years:0,months:0,days:0},n=0;
  escDraft.forEach((r,i)=>{
    const f=strictDMY(r.from),t=strictDMY(r.to),el=document.getElementById('escDur'+i);
    if(f&&t&&t>f){const d=calcServedTime(f,t);tot=addYMD(tot,d);n++;if(el)el.textContent=ymdText(d);}
    else if(el)el.textContent='';
  });
  document.getElementById('escTotal').innerHTML=n?('Tổng thời gian trốn/tạm đình chỉ: <b>'+ymdText(tot)+'</b>'):'';
}
function saveEscape(){
  const arrest=strictDMY(document.getElementById('arrestDateText').value);
  const er=parseEscapeRows(escDraft,arrest);
  if(er.error){document.getElementById('escMsg').textContent=er.error;return}
  escapes=er.list.map(p=>({from:fmtDate(p.from),to:fmtDate(p.to)}));   // lưu theo thứ tự thời gian
  escOwner=(escapes.length&&arrest)?prisonerKey((document.getElementById('prisonerName').value||'').trim(),fmtDate(arrest)):null;
  closeEscape();
  renderEscSummary();
}
// Dòng tóm tắt dưới nút "Trốn/tạm đình chỉ"
function renderEscSummary(){
  const btn=document.getElementById('btnEscape'), sum=document.getElementById('escSummary');
  if(!btn||!sum)return;
  const er=parseEscapeRows(escapes,null), ok=escapes.length&&er.list&&er.list.length;
  btn.classList.toggle('has',!!ok);
  sum.textContent=ok?('Đã nhập '+er.list.length+' lần · tổng '+ymdText(sumYMD(er.list.map(p=>p.dur)))):'';
}
