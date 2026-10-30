// =====================================================================================
// KHÓA PIN & MÃ HÓA DỮ LIỆU (Hồ sơ phạm nhân + Lịch sử tra cứu)
// - Tùy chọn: chưa bật thì dữ liệu lưu như cũ. Bật rồi thì hồ sơ và lịch sử được mã hóa AES-GCM
//   bằng khóa sinh từ mã PIN (PBKDF2-SHA256); trong máy chỉ còn bản mã, không còn bản rõ.
// - Mỗi lần mở app (hoặc để app chạy nền quá 5 phút) phải nhập PIN mới xem/lưu được hồ sơ, lịch sử.
//   Tính án vẫn dùng bình thường; các lần tính khi đang khóa được giữ tạm và gộp vào lịch sử khi mở khóa.
// - Quên PIN thì KHÔNG khôi phục được dữ liệu đã khóa (chỉ khôi phục từ file sao lưu .json).
// =====================================================================================
const LOCK_KEY='prison_lock_v1', VAULT_KEY='prison_vault_v1', LOCK_PROMPTED_KEY='prison_lock_prompted', PIN_FAIL_KEY='prison_pin_fails';
const PIN_ITER=300000, LOCK_IDLE_MS=5*60*1000;
const PIN_MAX_FAILS=5, PIN_WAIT_MS=30*1000;       // sai 5 lần liên tiếp thì phải chờ 30 giây
const LOCK={meta:null, key:null, data:null, pending:[], saving:Promise.resolve(), hiddenAt:0, fails:0, waitUntil:0};
(function(){
  try{const m=localStorage.getItem(LOCK_KEY);LOCK.meta=m?JSON.parse(m):null;}catch(e){LOCK.meta=null;}
  // Bộ đếm nhập sai được lưu lại, tải lại trang không xóa được
  try{const f=JSON.parse(localStorage.getItem(PIN_FAIL_KEY)||'null');
      if(f&&LOCK.meta){LOCK.fails=Math.max(0,f.n|0);LOCK.waitUntil=Math.min(+f.until||0,Date.now()+PIN_WAIT_MS);}}catch(e){}
})();
function saveFails(){
  try{
    if(LOCK.fails>0)localStorage.setItem(PIN_FAIL_KEY,JSON.stringify({n:LOCK.fails,until:LOCK.waitUntil}));
    else localStorage.removeItem(PIN_FAIL_KEY);
  }catch(e){}
}
function resetFails(){LOCK.fails=0;LOCK.waitUntil=0;saveFails();}
function lockEnabled(){return !!LOCK.meta;}
function lockIsOpen(){return !LOCK.meta||!!LOCK.key;}
function cryptoOK(){return !!(window.crypto&&crypto.subtle&&crypto.getRandomValues&&window.isSecureContext!==false);}

// ----- Mã hóa -----
function b64e(u8){let s='';for(let i=0;i<u8.length;i+=0x8000)s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000));return btoa(s);}
function b64d(s){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
async function deriveKey(secret,salt,iter){
  const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),'PBKDF2',false,['deriveKey']);
  return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);
}
async function encJSON(key,obj){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(obj)));
  return {iv:b64e(iv), ct:b64e(new Uint8Array(ct))};
}
async function decJSON(key,box){
  const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:b64d(box.iv)},key,b64d(box.ct));
  return JSON.parse(new TextDecoder().decode(pt));
}

// ----- Kho dữ liệu dùng chung cho Lịch sử ('history') và Hồ sơ ('profiles') -----
function plainKey(kind){return kind==='history'?HISTORY_KEY:PROFILES_KEY;}
function readPlain(kind){try{const r=localStorage.getItem(plainKey(kind));return r?JSON.parse(r):[];}catch(e){return [];}}
function readStore(kind){
  if(!lockEnabled())return readPlain(kind);
  if(LOCK.key&&LOCK.data)return JSON.parse(JSON.stringify(LOCK.data[kind]||[]));
  return kind==='history'?JSON.parse(JSON.stringify(LOCK.pending)):[];   // đang khóa
}
// Ghi; trả về false nếu không ghi được (đầy bộ nhớ, hoặc đang khóa mà ghi hồ sơ)
function writeStore(kind,list){
  if(!lockEnabled()){
    try{
      if(list.length)localStorage.setItem(plainKey(kind),JSON.stringify(list));
      else localStorage.removeItem(plainKey(kind));
      return true;
    }catch(e){return false;}
  }
  if(LOCK.key&&LOCK.data){LOCK.data[kind]=JSON.parse(JSON.stringify(list));saveVault();return true;}
  if(kind==='history'){LOCK.pending=list.slice(0,HISTORY_MAX);return true;}
  return false;
}
function saveVault(){
  const key=LOCK.key, snap=JSON.parse(JSON.stringify(LOCK.data));
  LOCK.saving=LOCK.saving.then(async()=>{
    try{localStorage.setItem(VAULT_KEY,JSON.stringify(await encJSON(key,snap)));}
    catch(e){showWarn('Không lưu được dữ liệu đã mã hóa (bộ nhớ đầy?).');}
  });
  return LOCK.saving;
}

// ----- Bật / mở / khóa / đổi / tắt -----
async function enablePin(pin){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await deriveKey(pin,salt,PIN_ITER);
  const data={history:readPlain('history'), profiles:readPlain('profiles')};
  const vault=await encJSON(key,data);
  const meta={v:1, kdf:'PBKDF2-SHA256', iter:PIN_ITER, salt:b64e(salt), check:await encJSON(key,{ok:'tinhanphat'})};
  // Thử giải mã lại trước khi xóa bản rõ
  const back=await decJSON(key,vault);
  if(JSON.stringify(back)!==JSON.stringify(data))throw new Error('Kiểm tra mã hóa không khớp');
  localStorage.setItem(VAULT_KEY,JSON.stringify(vault));
  localStorage.setItem(LOCK_KEY,JSON.stringify(meta));
  localStorage.removeItem(HISTORY_KEY);
  localStorage.removeItem(PROFILES_KEY);
  Object.assign(LOCK,{meta,key,data});
  resetFails();
}
async function keyFromPin(pin){
  const m=LOCK.meta, key=await deriveKey(pin,b64d(m.salt),m.iter||PIN_ITER);
  try{const c=await decJSON(key,m.check);return c&&c.ok==='tinhanphat'?key:null;}catch(e){return null;}
}
async function unlockWithPin(pin){
  const key=await keyFromPin(pin);
  if(!key)return false;
  const raw=localStorage.getItem(VAULT_KEY);
  const data=raw?await decJSON(key,JSON.parse(raw)):{history:[],profiles:[]};
  data.history=data.history||[]; data.profiles=data.profiles||[];
  LOCK.key=key; LOCK.data=data;
  if(LOCK.pending.length){        // gộp các lần tính khi đang khóa (mới nhất ở đầu)
    data.history=LOCK.pending.concat(data.history).slice(0,HISTORY_MAX);
    LOCK.pending=[];
    await saveVault();
  }
  return true;
}
async function lockNow(){
  if(!lockEnabled()||!LOCK.key)return;
  await LOCK.saving;
  LOCK.key=null; LOCK.data=null;
  // Đóng mọi popup có thể đang hiện dữ liệu đã khóa
  const pd=document.getElementById('profDetailOverlay'); if(pd)pd.style.display='none';
  profDetailIdx=null;
  const hd=document.getElementById('historyDetailOverlay'); if(hd)hd.classList.remove('show');
  closeModal();
  document.body.style.overflow='';
  renderHistory(); renderProfiles();
}
async function changePin(newPin){
  await LOCK.saving;
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await deriveKey(newPin,salt,PIN_ITER);
  const vault=await encJSON(key,LOCK.data);
  const meta={v:1, kdf:'PBKDF2-SHA256', iter:PIN_ITER, salt:b64e(salt), check:await encJSON(key,{ok:'tinhanphat'})};
  localStorage.setItem(VAULT_KEY,JSON.stringify(vault));
  localStorage.setItem(LOCK_KEY,JSON.stringify(meta));
  Object.assign(LOCK,{meta,key});
}
async function disablePin(){
  await LOCK.saving;
  const d=LOCK.data;
  if(d.history.length)localStorage.setItem(HISTORY_KEY,JSON.stringify(d.history));
  if(d.profiles.length)localStorage.setItem(PROFILES_KEY,JSON.stringify(d.profiles));
  localStorage.removeItem(LOCK_KEY); localStorage.removeItem(VAULT_KEY);
  Object.assign(LOCK,{meta:null,key:null,data:null});
  resetFails();
}
function forgetPinWipe(){
  localStorage.removeItem(LOCK_KEY); localStorage.removeItem(VAULT_KEY);
  const pend=LOCK.pending;
  Object.assign(LOCK,{meta:null,key:null,data:null,pending:[]});
  resetFails();
  if(pend.length)writeStore('history',pend);
}

// ----- Giao diện -----
let pinMode=null, pinAfter=null, pinTimer=null;     // pinMode: 'unlock' | 'set' | 'change' | 'disable'
const PIN_TEXT={
  unlock:['Nhập mã PIN','Mở khóa hồ sơ và lịch sử tra cứu.'],
  set:['Đặt mã PIN','Dùng 4-6 chữ số. Quên mã PIN sẽ không khôi phục được.'],
  change:['Đổi mã PIN','Dùng 4-6 chữ số. Quên mã PIN sẽ không khôi phục được.'],
  disable:['Tắt khóa PIN','Nhập mã PIN hiện tại để tắt khóa.']
};
const pinIsNew=()=>pinMode==='set'||pinMode==='change';
function openPin(mode,after){
  if(!cryptoOK()){showWarn('Trình duyệt này không hỗ trợ mã hóa (cần mở ứng dụng qua địa chỉ https).');return;}
  pinMode=mode; pinAfter=after||null;
  document.getElementById('pinTitle').textContent=PIN_TEXT[mode][0];
  document.getElementById('pinNote').textContent=PIN_TEXT[mode][1];
  const a=document.getElementById('pinA'), b=document.getElementById('pinB');
  a.value=''; b.value='';
  a.maxLength=pinIsNew()?6:8;        // mã PIN mới: 4-6 số; vẫn mở được mã 7-8 số đặt từ bản trước
  b.parentNode.style.display=pinIsNew()?'':'none';
  hidePinEyes();
  document.getElementById('pinForgot').style.display=(mode==='unlock')?'':'none';
  document.getElementById('pinOverlay').style.display='flex';
  showPinFails();
  setTimeout(()=>{if(!a.disabled)a.focus();},120);
}
function setPinEye(el,show){
  const what=el.classList.contains('pw')?'mật khẩu':'mã PIN';
  const btn=el.parentNode.querySelector('.pin-eye'), t=(show?'Ẩn ':'Hiện ')+what;
  el.type=show?'text':'password';
  btn.classList.toggle('on',show);
  btn.querySelector('use').setAttribute('href',show?'#ic-eye-off':'#ic-eye');
  btn.title=t; btn.setAttribute('aria-label',t);
}
function togglePinEye(id){const el=document.getElementById(id);setPinEye(el,el.type==='password');}
function hidePinEyes(){['pinA','pinB'].forEach(id=>setPinEye(document.getElementById(id),false));}
function closePin(){
  document.getElementById('pinOverlay').style.display='none';pinMode=null;pinAfter=null;
  hidePinEyes();
  if(pinTimer){clearInterval(pinTimer);pinTimer=null;}
}
// Bộ đếm số lần nhập sai (chỉ khi nhập mã PIN hiện tại: mở khóa, tắt khóa)
function showPinFails(prefix){
  const msg=document.getElementById('pinMsg'), a=document.getElementById('pinA'), ok=document.getElementById('pinOk');
  if(pinTimer){clearInterval(pinTimer);pinTimer=null;}
  a.disabled=false; ok.disabled=false;
  if(pinIsNew()||!LOCK.fails){msg.textContent=prefix||'';return;}
  const head=(prefix?prefix+'\n':'')+'Đã nhập sai '+LOCK.fails+' lần';
  const tick=()=>{
    const left=Math.ceil((LOCK.waitUntil-Date.now())/1000);
    if(left>0){msg.textContent=head+'. Vui lòng chờ '+left+' giây.';a.disabled=true;ok.disabled=true;return;}
    if(pinTimer){clearInterval(pinTimer);pinTimer=null;}
    a.disabled=false; ok.disabled=false;
    msg.textContent=head+', còn '+(PIN_MAX_FAILS-LOCK.fails%PIN_MAX_FAILS)+' lần thử.';
    if(pinMode&&document.activeElement!==a)a.focus();
  };
  tick();
  if(Date.now()<LOCK.waitUntil)pinTimer=setInterval(tick,1000);
}
function pinValid(p){return pinIsNew()?/^\d{4,6}$/.test(p):/^\d{4,8}$/.test(p);}
async function confirmPin(){
  const a=document.getElementById('pinA').value.trim(), b=document.getElementById('pinB').value.trim();
  const msg=document.getElementById('pinMsg'), btn=document.getElementById('pinOk');
  const say=t=>{msg.textContent=t;};
  if(!pinIsNew()&&Date.now()<LOCK.waitUntil){showPinFails();return;}
  if(!pinValid(a)){say('Mã PIN gồm 4-6 chữ số.');return;}
  if(pinIsNew()&&a!==b){say('Hai lần nhập mã PIN chưa khớp.');return;}
  btn.disabled=true; say('Đang xử lý…');
  let wrong=false;
  try{
    if(pinMode==='unlock'||pinMode==='disable'){
      const ok=(pinMode==='unlock')?await unlockWithPin(a):!!(await keyFromPin(a));
      if(!ok){
        wrong=true;
        LOCK.fails++;
        if(LOCK.fails%PIN_MAX_FAILS===0)LOCK.waitUntil=Date.now()+PIN_WAIT_MS;
        saveFails();
        document.getElementById('pinA').value='';
        showPinFails('Mã PIN không đúng.');
        return;
      }
      resetFails();
      if(pinMode==='disable'){await disablePin();showWarn('Đã tắt khóa PIN.');}
    }else if(pinMode==='set'){
      await enablePin(a);
      showWarn('Đã bật khóa PIN. Hồ sơ và lịch sử tra cứu đã được mã hóa.');
    }else if(pinMode==='change'){
      await changePin(a);
      showWarn('Đã đổi mã PIN.');
    }
    const after=pinAfter;
    closePin();
    renderHistory(); renderProfiles();
    if(typeof after==='function')after();
  }catch(e){
    say('Có lỗi khi mã hóa: '+e.message);
  }finally{
    if(!wrong)btn.disabled=false;
  }
}
function forgotPin(){
  closePin();
  askConfirm('Quên mã PIN: xóa toàn bộ hồ sơ và lịch sử đã khóa trên máy này? Không thể hoàn tác.','Xóa và tắt khóa',function(){
    forgetPinWipe(); renderHistory(); renderProfiles();
    showWarn('Đã xóa dữ liệu đã khóa và tắt khóa PIN. Có thể nạp lại hồ sơ từ file sao lưu.');
  });
}
// Popup "Bảo mật dữ liệu"
function openSecurity(prompt){
  if(!prompt&&cryptoOK()&&!lockEnabled()){openPin('set');return;}   // chưa bật khóa: vào thẳng Đặt mã PIN
  const box=document.getElementById('secBody');
  const opt=(fn,t)=>'<button type="button" class="exp-opt sec-opt" onclick="'+fn+'"><span class="exp-opt-t">'+t+'</span></button>';
  let html='';
  if(prompt)html+='<p class="sec-note">'+escHtml(prompt)+'</p>';
  if(!cryptoOK()){
    html+='<p class="sec-note">Trình duyệt này không hỗ trợ mã hóa. Hãy mở ứng dụng qua địa chỉ https (GitHub Pages) để dùng khóa PIN.</p>';
  }else if(!lockEnabled()){
    html+=opt("closeSecurity();openPin('set')",'Đặt mã PIN');
  }else{
    html+=opt('closeSecurity();lockNow()','Khóa ngay')
        +opt("closeSecurity();openPin('change')",'Đổi mã PIN')
        +opt("closeSecurity();openPin('disable')",'Tắt khóa PIN');
  }
  box.innerHTML=html;
  document.getElementById('secOverlay').style.display='flex';
}
function closeSecurity(){document.getElementById('secOverlay').style.display='none';}
// Thẻ "Đã khóa" thay cho danh sách hồ sơ và lịch sử
function renderLockCard(){
  const card=document.getElementById('lockCard');
  if(!card)return false;
  const locked=lockEnabled()&&!LOCK.key;
  card.style.display=locked?'block':'none';
  if(locked){
    const n=LOCK.pending.length;
    document.getElementById('lockSub').textContent=n
      ?('Có '+n+' lần tính mới chưa vào lịch sử — mở khóa để lưu.')
      :'Nhập mã PIN để xem và lưu hồ sơ, lịch sử tra cứu.';
  }
  return locked;
}
// Nhắc bật khóa PIN một lần, khi lưu hồ sơ đầu tiên
function maybePromptPin(savedMsg){
  let asked=false;
  try{asked=localStorage.getItem(LOCK_PROMPTED_KEY)==='1';}catch(e){}
  if(asked||lockEnabled()||!cryptoOK())return false;
  try{localStorage.setItem(LOCK_PROMPTED_KEY,'1');}catch(e){}
  openSecurity(savedMsg);
  return true;
}
// Tự khóa khi app chạy nền quá lâu
document.addEventListener('visibilitychange',()=>{
  if(document.hidden){LOCK.hiddenAt=Date.now();return;}
  if(LOCK.key&&LOCK.hiddenAt&&Date.now()-LOCK.hiddenAt>LOCK_IDLE_MS)lockNow();
  LOCK.hiddenAt=0;
});

// ----- File sao lưu .json có mật khẩu -----
// Khi xuất, phần mềm tạo sẵn mật khẩu mạnh: 12 ký tự chữ thường và số (bỏ các ký tự dễ nhầm 0/o, 1/l/i),
// chia 3 nhóm cho dễ đọc, khoảng 59 bit ngẫu nhiên. Người dùng vẫn có thể tự đặt mật khẩu riêng từ PW_MIN ký tự.
// Khi nhập file thì không giới hạn độ dài, để file cũ (mật khẩu 6 ký tự) vẫn mở được.
const PW_CHARS='abcdefghjkmnpqrstuvwxyz23456789', PW_MIN=10;
let pwMode=null, pwAfter=null, pwGen='', pwCopied=false;
function genPassword(){
  const out=[], buf=new Uint8Array(16);
  while(out.length<12){
    crypto.getRandomValues(buf);
    for(const x of buf)if(x<248&&out.length<12)out.push(PW_CHARS[x%31]);   // 248 = 8×31: bỏ phần dư để mọi ký tự đều nhau
  }
  return out.slice(0,4).join('')+'-'+out.slice(4,8).join('')+'-'+out.slice(8).join('');
}
function pwSay(t,good){const m=document.getElementById('pwMsg');m.textContent=t||'';m.classList.toggle('ok',!!good);}
function newPassword(){
  pwGen=genPassword(); pwCopied=false;
  const a=document.getElementById('pwA');
  a.value=pwGen; setPinEye(a,true);
  document.getElementById('pwB').value='';
  pwEdited();
}
// Tự đặt mật khẩu riêng (khác mật khẩu tạo sẵn) thì phải nhập lại lần 2 để chắc chắn không gõ nhầm
function pwEdited(){
  if(pwMode!=='export')return;
  const own=document.getElementById('pwA').value!==pwGen;
  document.getElementById('pwBWrap').style.display=own?'':'none';
  document.getElementById('pwCopy').style.display=own?'none':'';
  pwSay('');
}
function copyText(text){
  return new Promise(res=>{
    const fb=()=>{try{const ta=document.createElement('textarea');ta.value=text;ta.style.position='fixed';ta.style.opacity='0';
      document.body.appendChild(ta);ta.select();const ok=document.execCommand('copy');document.body.removeChild(ta);res(!!ok);}catch(e){res(false);}};
    if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(text).then(()=>res(true),fb);else fb();
  });
}
async function copyPassword(){
  const v=document.getElementById('pwA').value;
  if(!v)return;
  pwCopied=await copyText(v);
  pwSay(pwCopied?'Đã sao chép mật khẩu. Hãy lưu lại ở nơi an toàn.':'Không sao chép tự động được — hãy ghi lại mật khẩu trên.',pwCopied);
}
function openPassword(mode,after){
  pwMode=mode; pwAfter=after; pwGen=''; pwCopied=false;
  const exp=mode==='export';
  document.getElementById('pwTitle').textContent=exp?'Mật khẩu cho file':'Mật khẩu của file';
  document.getElementById('pwNote').textContent=exp
    ?'File dữ liệu luôn được mã hóa. Phần mềm đã tạo sẵn mật khẩu mạnh — bấm "Sao chép", lưu lại và gửi cho người nhận qua kênh khác với file. Có thể tự đặt mật khẩu riêng từ '+PW_MIN+' ký tự.'
    :'File này đã được mã hóa. Nhập mật khẩu do người gửi cung cấp.';
  const a=document.getElementById('pwA'), b=document.getElementById('pwB');
  a.value=''; b.value=''; setPinEye(a,false); setPinEye(b,false);
  document.getElementById('pwTools').style.display=exp?'':'none';
  document.getElementById('pwBWrap').style.display='none';
  pwSay('');
  if(exp)newPassword();
  document.getElementById('pwOverlay').style.display='flex';
  if(!exp)setTimeout(()=>a.focus(),120);
}
function closePassword(){
  document.getElementById('pwOverlay').style.display='none';pwMode=null;pwAfter=null;pwGen='';pwCopied=false;
  ['pwA','pwB'].forEach(id=>{const el=document.getElementById(id);el.value='';setPinEye(el,false);});
}
async function confirmPassword(){
  const a=document.getElementById('pwA').value, b=document.getElementById('pwB').value;
  const btn=document.getElementById('pwOk');
  const gen=pwMode==='export'&&!!pwGen&&a===pwGen;
  if(pwMode==='export'){
    if(!gen){
      if(a.length<PW_MIN){pwSay('Mật khẩu tự đặt cần ít nhất '+PW_MIN+' ký tự.');return;}
      if(a!==b){pwSay('Hai lần nhập mật khẩu chưa khớp.');return;}
    }else if(!pwCopied)pwCopied=await copyText(a);   // mật khẩu tạo sẵn: tự sao chép để không bị mất
  }else if(!a){pwSay('Vui lòng nhập mật khẩu.');return;}
  btn.disabled=true; pwSay('Đang xử lý…');
  try{
    const ok=await pwAfter(a,{generated:gen,copied:pwCopied});
    if(ok===false){pwSay('Mật khẩu không đúng hoặc file đã bị sửa.');return;}
    closePassword();
  }catch(e){pwSay('Có lỗi: '+e.message);}
  finally{btn.disabled=false;}
}
async function encryptPack(password,pack){
  const salt=crypto.getRandomValues(new Uint8Array(16));
  const key=await deriveKey(password,salt,PIN_ITER);
  const box=await encJSON(key,pack);
  return {app:'tinhanphat', type:'profiles-enc', version:2, exported:new Date().toISOString(),
          kdf:{name:'PBKDF2-SHA256', iter:PIN_ITER, salt:b64e(salt)}, iv:box.iv, ct:box.ct};
}
async function decryptPack(password,file){
  const key=await deriveKey(password,b64d(file.kdf.salt),file.kdf.iter||PIN_ITER);
  try{return await decJSON(key,{iv:file.iv,ct:file.ct});}catch(e){return null;}
}
