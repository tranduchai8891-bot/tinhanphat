// =====================================================================================
// NHẬP HỒ SƠ HÀNG LOẠT TỪ EXCEL (.xlsx) HOẶC CSV — không cần mạng, không thư viện ngoài
// Mỗi dòng được tính bằng đúng lõi tính của màn hình chính (computeSentence) rồi lưu như "Lưu hồ sơ".
// =====================================================================================
const XL_TEMPLATE_HEAD=['Họ tên','Ngày bắt','Án (năm)','Án (tháng)','Án (ngày)','Tạm giam (năm)','Tạm giam (tháng)','Tạm giam (ngày)',
  'Đã giảm (năm)','Đã giảm (tháng)','Ngày đến trại','Số tiền án','Chưa thành niên (x)','Trốn/tạm đình chỉ'];
function downloadImportTemplate(){
  downloadXls(XL_TEMPLATE_HEAD,[
    ['Nguyễn Văn A','10/03/2022',6,'','','','2','','','','20/03/2022','','',''],
    ['Trần Văn B','09/03/1984',6,6,20,'','','','','','','','','13/11/1985-29/03/1986; 02/04/1986-11/09/2026']
  ],'mau-nhap-ho-so.xlsx','Danh sách',
  [{wch:20},{wch:12},{wch:9},{wch:10},{wch:9},{wch:13},{wch:15},{wch:14},{wch:12},{wch:14},{wch:13},{wch:11},{wch:17},{wch:44}]);
}
function startExcelImport(){
  if(needUnlock(startExcelImport))return;
  document.getElementById('xlImportInput').click();
}

// ----- Đọc file .xlsx (ZIP) -----
async function unzipEntries(buf){
  const u8=new Uint8Array(buf), dv=new DataView(buf);
  let eocd=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;}}
  if(eocd<0)throw new Error('không phải file Excel (.xlsx)');
  const count=dv.getUint16(eocd+10,true);
  let p=dv.getUint32(eocd+16,true);
  const out={}, td=new TextDecoder('utf-8');
  for(let k=0;k<count;k++){
    if(dv.getUint32(p,true)!==0x02014b50)break;
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true);
    const nlen=dv.getUint16(p+28,true), elen=dv.getUint16(p+30,true), clen=dv.getUint16(p+32,true), loc=dv.getUint32(p+42,true);
    const name=td.decode(u8.subarray(p+46,p+46+nlen));
    p+=46+nlen+elen+clen;
    if(!/^xl\/(sharedStrings\.xml|worksheets\/sheet\d+\.xml)$/.test(name))continue;
    const start=loc+30+dv.getUint16(loc+26,true)+dv.getUint16(loc+28,true);
    const data=u8.subarray(start,start+csize);
    let raw;
    if(method===0)raw=data;
    else if(method===8){
      if(typeof DecompressionStream==='undefined')throw new Error('trình duyệt này chưa đọc được file Excel — hãy cập nhật trình duyệt hoặc lưu file dạng CSV');
      raw=new Uint8Array(await new Response(new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer());
    }else throw new Error('kiểu nén không hỗ trợ');
    out[name]=td.decode(raw);
  }
  return out;
}
function xmlEls(node,tag){return Array.from(node.getElementsByTagNameNS('*',tag));}
async function readXlsxRows(buf){
  const files=await unzipEntries(buf);
  const sheets=Object.keys(files).filter(n=>/^xl\/worksheets\/sheet\d+\.xml$/.test(n))
    .sort((a,b)=>parseInt(a.match(/\d+/)[0])-parseInt(b.match(/\d+/)[0]));
  if(!sheets.length)throw new Error('không tìm thấy trang tính');
  const dp=new DOMParser();
  const sst=files['xl/sharedStrings.xml']
    ?xmlEls(dp.parseFromString(files['xl/sharedStrings.xml'],'application/xml'),'si').map(si=>xmlEls(si,'t').map(t=>t.textContent).join(''))
    :[];
  const doc=dp.parseFromString(files[sheets[0]],'application/xml');
  const rows=[];
  xmlEls(doc,'row').forEach(r=>{
    const ri=(parseInt(r.getAttribute('r'))||rows.length+1)-1;
    const row=[];
    xmlEls(r,'c').forEach((c,ci)=>{
      const ref=c.getAttribute('r')||'';
      const letters=(ref.match(/^[A-Z]+/)||[''])[0];
      const col=letters?letters.split('').reduce((s,ch)=>s*26+ch.charCodeAt(0)-64,0)-1:ci;
      const t=c.getAttribute('t'), v=xmlEls(c,'v')[0];
      let val='';
      if(t==='s')val=sst[parseInt(v&&v.textContent)]||'';
      else if(t==='inlineStr')val=xmlEls(c,'t').map(x=>x.textContent).join('');
      else val=v?v.textContent:'';
      row[col]=val;
    });
    rows[ri]=row;
  });
  return rows.map(r=>r||[]);
}
// ----- Đọc CSV -----
function readCsvRows(text){
  text=text.replace(/^﻿/,'');
  const first=text.split(/\r?\n/)[0]||'';
  const delim=[';','\t',','].map(d=>[d,first.split(d).length]).sort((a,b)=>b[1]-a[1])[0][0];
  const rows=[];let row=[],cur='',q=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){if(ch==='"'){if(text[i+1]==='"'){cur+='"';i++;}else q=false;}else cur+=ch;continue;}
    if(ch==='"')q=true;
    else if(ch===delim){row.push(cur);cur='';}
    else if(ch==='\n'||ch==='\r'){if(ch==='\r'&&text[i+1]==='\n')i++;row.push(cur);rows.push(row);row=[];cur='';}
    else cur+=ch;
  }
  if(cur!==''||row.length){row.push(cur);rows.push(row);}
  return rows;
}

// ----- Chuyển 1 dòng thành hồ sơ -----
const xlNorm=s=>String(s==null?'':s).normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/đ/g,'d').replace(/Đ/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
const XL_COLS={
  name:['ho ten','ho va ten','ten pham nhan'], arrest:['ngay bat','ngay bat giam','ngay bat / bat dau chap hanh an'],
  sY:['an (nam)'], sM:['an (thang)'], sD:['an (ngay)'], sText:['an phat','muc an'],
  pY:['tam giam (nam)'], pM:['tam giam (thang)'], pD:['tam giam (ngay)'], pText:['tam giam','tru tam giam','thoi gian tam giam'],
  rY:['da giam (nam)'], rM:['da giam (thang)'], rText:['da giam','thoi gian giam an','tong duoc giam'],
  arrival:['ngay den trai'], penalty:['so tien an'], minor:['chua thanh nien (x)','chua thanh nien','nguoi chua thanh nien'],
  esc:['tron/tam dinh chi','thoi gian tron/tam dinh chi']
};
// Ngày trong ô: dd/mm/yyyy, d-m-yyyy, yyyy-mm-dd hoặc số ngày kiểu Excel
function xlDate(v){
  const s=String(v==null?'':v).trim();
  if(!s)return '';
  if(/^\d+(\.\d+)?$/.test(s)){const n=Math.floor(+s);
    if(n>=1&&n<80000){const d=new Date(Date.UTC(1899,11,30)+n*86400000);return pad2(d.getUTCDate())+'/'+pad2(d.getUTCMonth()+1)+'/'+d.getUTCFullYear();}
    return s;}
  let m=/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s);
  if(m)return pad2(+m[1])+'/'+pad2(+m[2])+'/'+m[3];
  m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s);
  if(m)return pad2(+m[3])+'/'+pad2(+m[2])+'/'+m[1];
  return s;
}
const xlInt=v=>{const s=String(v==null?'':v).trim();if(!s)return 0;const n=parseInt(s,10);return isFinite(n)&&n>0?n:(n===0?0:NaN);};
function xlYMD(text){const t=String(text||'').trim();if(!t||t==='0')return {months:0,days:0};return parseYMDText(t);}
function rowToProfile(get,today){
  const name=String(get('name')||'').trim().slice(0,120);
  if(!name)return {err:'thiếu họ tên'};
  const arrestText=xlDate(get('arrest')), arrest=strictDMY(arrestText);
  if(!arrest)return {err:'ngày bắt không hợp lệ ('+(String(get('arrest')||'').trim()||'trống')+')'};
  let sent;
  if([get('sY'),get('sM'),get('sD')].some(v=>String(v||'').trim()!=='')){
    const y=xlInt(get('sY')),m=xlInt(get('sM')),d=xlInt(get('sD'));
    if([y,m,d].some(isNaN))return {err:'mức án không hợp lệ'};
    sent={months:y*12+m+Math.floor(d/30),days:d%30};
  }else sent=xlYMD(get('sText'));
  if(!sent||(!sent.months&&!sent.days))return {err:'thiếu mức án'};
  let pd;
  if([get('pY'),get('pM'),get('pD')].some(v=>String(v||'').trim()!=='')){
    const y=xlInt(get('pY')),m=xlInt(get('pM')),d=xlInt(get('pD'));
    if([y,m,d].some(isNaN))return {err:'thời gian tạm giam không hợp lệ'};
    pd={months:y*12+m,days:d};
  }else pd=xlYMD(get('pText'));
  if(!pd)return {err:'thời gian tạm giam không hợp lệ'};
  let rem;
  if([get('rY'),get('rM')].some(v=>String(v||'').trim()!=='')){
    const y=xlInt(get('rY')),m=xlInt(get('rM'));
    if([y,m].some(isNaN))return {err:'thời gian đã giảm không hợp lệ'};
    rem={months:y*12+m,days:0};
  }else rem=xlYMD(get('rText'));
  if(!rem||rem.days)return {err:'thời gian đã giảm không hợp lệ (chỉ năm, tháng)'};
  const arrivalText=xlDate(get('arrival'));
  if(arrivalText&&!strictDMY(arrivalText))return {err:'ngày đến trại không hợp lệ'};
  const penalty=xlInt(get('penalty'));
  const minor=/^(x|co|1|yes|true|dung)$/.test(xlNorm(get('minor')));
  // Trốn/tạm đình chỉ: các cặp ngày "dd/mm/yyyy - dd/mm/yyyy"
  const escRows=[];
  String(get('esc')||'').replace(/(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})\s*(?:-|–|đến|den)\s*(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4})/gi,(m,a,b)=>{escRows.push({from:xlDate(a),to:xlDate(b)});return m;});
  return {v:{name, arrest, sent, pd, rem, arrivalText, penalty, minor, escRows}};
}
// Dựng hồ sơ từ dữ liệu một dòng. Hồ sơ đã có (cùng tên, ngày bắt): cập nhật các thông tin file có,
// giữ nguyên những gì file không có (xếp loại quý, kỷ luật, phạm tội mới, kỳ giảm đã xét, ngày đến trại...).
function buildImportedProfile(v,old,today){
  const od=(old&&old.data)||{};
  const {name,arrest,sent,pd,rem}=v;
  const escRows=v.escRows.length?v.escRows:(Array.isArray(od.escapes)?od.escapes:[]);
  const er=parseEscapeRows(escRows,arrest);
  if(er.error)return {err:'trốn/tạm đình chỉ — '+er.error};
  const oldRem=(od.remissions||[]).filter(r=>(r.years||0)||(r.months||0));
  const remissions=(oldRem.length&&oldRem.reduce((s,r)=>s+(r.years||0)*12+(r.months||0),0)===rem.months)?od.remissions
    :(rem.months?[{years:Math.floor(rem.months/12),months:rem.months%12}]:[{years:0,months:0}]);
  const inp={name, arrestDate:arrest, sentMonths:sent.months, sD:sent.days, preDetMonths:pd.months, pdD:pd.days,
             remMonths:rem.months, remissionsSnapshot:remissions.map(r=>({months:(r.years||0)*12+(r.months||0)}))};
  if(er.list.length)inp.escapes=er.list;
  const r=computeSentence(inp,today,CALC_MODE_DEFAULT);
  if(r.esc&&r.esc.some(p=>p.from>=r.releaseDate))return {err:'trốn/tạm đình chỉ bắt đầu sau ngày hết án'};
  const unit=(v,u)=>v?(v+' '+u):'';
  return {p:{
    name, arrestDate:fmtDate(arrest), sentence:fmtDays(sent.months,sent.days), preDet:fmtDays(pd.months,pd.days), remission:fmtDays(rem.months,0),
    release:fmtDate(r.releaseDate), served:fmtDaysFull(r.servedDiff), remaining:fmtDaysFull(r.remainingDiff),
    m25:fmtDate(r.m25), m33:fmtDate(r.m33), m50:fmtDate(r.m50), refDate:fmtDate(today),
    escape:r.esc?ymdText(r.escTotal):undefined, calcMode:r.mode, saved:new Date().toLocaleString('vi-VN'),
    data:{arrestText:fmtDate(arrest), sY:unit(Math.floor(sent.months/12),'năm'), sM:unit(sent.months%12,'tháng'), sD:unit(sent.days,'ngày'),
      pdY:unit(Math.floor(pd.months/12),'năm'), pdM:unit(pd.months%12,'tháng'), pdD:unit(pd.days,'ngày'),
      remissions,
      escapes:er.list.length?er.list.map(q=>({from:fmtDate(q.from),to:fmtDate(q.to)})):undefined,
      picked:od.picked||null, arrival:v.arrivalText||od.arrival||'', penalty:v.penalty?String(v.penalty):(od.penalty||''), minor:v.minor||!!od.minor,
      k8on:!!od.k8on, k8type:od.k8type||'', k8date:od.k8date||'', k8dec:od.k8dec||'',
      k9on:!!od.k9on, k9type:od.k9type||'', k9life:!!od.k9life, grades:od.grades||{}}
  }};
}
function importRows(rows){
  const hi=rows.findIndex(r=>r.some(c=>XL_COLS.name.includes(xlNorm(c))));
  if(hi<0){showWarn('Không thấy cột "Họ tên" trong file. Hãy dùng file Excel mẫu (Chia sẻ dữ liệu → Tải file Excel mẫu).');return}
  const head=rows[hi].map(xlNorm), idx={};
  Object.keys(XL_COLS).forEach(k=>{const i=head.findIndex(h=>XL_COLS[k].includes(h));if(i>=0)idx[k]=i;});
  if(idx.arrest==null){showWarn('Không thấy cột "Ngày bắt" trong file.');return}
  const today=profileToday(), bad=[], cur=loadProfiles();
  let added=0,updated=0,over=0;
  rows.slice(hi+1).forEach((r,k)=>{
    if(!r.some(c=>String(c||'').trim()))return;
    const lbl='dòng '+(hi+2+k)+': ';
    const pr=rowToProfile(key=>idx[key]!=null?r[idx[key]]:'',today);
    if(pr.err){bad.push(lbl+pr.err);return}
    const i=cur.findIndex(x=>x.name===pr.v.name&&x.arrestDate===fmtDate(pr.v.arrest));
    const res=buildImportedProfile(pr.v,i>=0?cur[i]:null,today);
    if(res.err){bad.push(lbl+res.err);return}
    const p=sanitizeProfile(res.p);
    if(!p){bad.push(lbl+'dữ liệu không hợp lệ');return}
    if(i>=0){cur[i]=p;updated++;}
    else if(cur.length<PROFILES_MAX){cur.unshift(p);added++;}
    else over++;
  });
  if(!added&&!updated&&!over){showWarn('Không nhập được hồ sơ nào.'+(bad.length?(' '+bad.slice(0,3).join('; ')+(bad.length>3?'…':'')):''));return}
  persistProfiles(cur);
  renderProfiles();
  if(document.getElementById('teamOverlay').style.display==='flex')renderTeam();
  showWarn('Đã nhập '+(added+updated)+' hồ sơ từ file (thêm mới '+added+', cập nhật '+updated+').'
    +(over?(' Bỏ qua '+over+' hồ sơ do vượt giới hạn '+PROFILES_MAX+'.'):'')
    +(bad.length?(' Không nhập '+bad.length+' dòng — '+bad.slice(0,3).join('; ')+(bad.length>3?'…':'')):''));
}
function importExcelFile(input){
  const file=input.files&&input.files[0];
  input.value='';
  if(!file)return;
  const isCsv=/\.(csv|txt)$/i.test(file.name);
  const rd=new FileReader();
  rd.onload=async function(){
    try{
      const rows=isCsv?readCsvRows(rd.result):await readXlsxRows(rd.result);
      importRows(rows);
    }catch(e){showWarn('Không đọc được file: '+e.message+'.');}
  };
  rd.onerror=function(){showWarn('Không đọc được file.');};
  if(isCsv)rd.readAsText(file,'utf-8');else rd.readAsArrayBuffer(file);
}
