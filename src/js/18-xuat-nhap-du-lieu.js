// ===== XUẤT / NHẬP FILE DỮ LIỆU HỒ SƠ =====
// Xuất toàn bộ hồ sơ ra file .json để chuyển sang máy khác hoặc sao lưu
function exportProfilesFile(){
  const ps=refreshProfiles();
  if(!ps.length){showWarn('Chưa có hồ sơ nào để xuất.');return}
  if(!cryptoOK()){showWarn('Trình duyệt này không hỗ trợ mã hóa nên không xuất được file dữ liệu. Hãy mở ứng dụng qua địa chỉ https.');return}
  openPassword('export',async (pw,info)=>{
    const pack={app:'tinhanphat', type:'profiles', version:1,
                exported:new Date().toISOString(), count:ps.length, profiles:ps};
    const file=await encryptPack(pw,pack);
    saveBlob(new Blob([JSON.stringify(file)],{type:'application/json'}),'ho-so-doi-pham-nhan-'+dateStamp()+'.json');
    markBackupDone();
    showWarn('Đã xuất file dữ liệu đã mã hóa ('+ps.length+' hồ sơ).'
      +(info&&info.generated?' Mật khẩu: '+pw+(info.copied?' (đã sao chép)':'')+'. Hãy lưu lại — không có mật khẩu này sẽ không mở được file.':'')
      +' Gửi mật khẩu cho người nhận qua kênh khác với file.');
    return true;
  });
}
// Ngày hôm nay dạng yyyymmdd để đặt tên file
function dateStamp(){
  const d=new Date();
  return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0');
}

// Làm sạch một hồ sơ (từ file nhập vào hoặc dữ liệu cũ trong máy): chỉ giữ các trường đúng kiểu,
// cắt chuỗi quá dài, bỏ mọi thứ lạ — tránh file hỏng/bị chỉnh sửa làm sai lệch hoặc chèn mã vào app.
function sanitizeProfile(p){
  if(!p||typeof p!=='object')return null;
  const str=(v,max)=>(typeof v==='string'||typeof v==='number')?String(v).slice(0,max):'';
  const name=str(p.name,120).trim();
  if(!name)return null;
  const out={name};
  ['arrestDate','sentence','preDet','remission','release','served','remaining','m25','m33','m50','refDate','saved','escape']
    .forEach(k=>{if(p[k]!=null)out[k]=str(p[k],60);});
  if(p.calcMode==='qlpn'||p.calcMode==='thuc')out.calcMode=p.calcMode;
  const d=p.data;
  if(d&&typeof d==='object'){
    const num=v=>{const n=parseInt(v,10);return isFinite(n)&&n>0?Math.min(n,999):0;};
    const dd={};
    ['arrestText','sY','sM','sD','pdY','pdM','pdD','arrival','penalty','k8type','k8date','k8dec']
      .forEach(k=>{if(d[k]!=null)dd[k]=str(d[k],20);});
    if(Array.isArray(d.remissions))
      dd.remissions=d.remissions.slice(0,30).map(r=>({years:num(r&&r.years),months:num(r&&r.months)}));
    if(Array.isArray(d.escapes)){
      const es=d.escapes.slice(0,ESC_MAX).filter(r=>r&&typeof r==='object')
        .map(r=>({from:str(r.from,10),to:str(r.to,10)}))
        .filter(r=>/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(r.from)&&/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(r.to));
      if(es.length)dd.escapes=es;
    }
    dd.picked=(d.picked&&typeof d.picked==='object'&&/^-?\d{1,15}$/.test(String(d.picked.value)))
      ?{value:String(d.picked.value),label:str(d.picked.label,80)}:null;
    dd.minor=!!d.minor;
    dd.k8on=!!d.k8on;
    dd.k9on=!!d.k9on;
    dd.k9type=(d.k9type==='9'||d.k9type==='10')?d.k9type:'';
    dd.k9life=!!d.k9life;
    dd.grades={};
    if(d.grades&&typeof d.grades==='object')
      Object.keys(d.grades).forEach(k=>{
        if(/^\d{4}-(I|II|III|IV)$/.test(k)&&Object.prototype.hasOwnProperty.call(GRADE_SHORT,d.grades[k]))dd.grades[k]=d.grades[k];
      });
    out.data=dd;
  }else{
    out.data=null;
  }
  return out;
}

// Nhập hồ sơ từ file .json (gộp thêm, không xóa hồ sơ đang có)
function importProfilesFile(input){
  const file=input.files&&input.files[0];
  input.value='';
  if(!file)return;
  const rd=new FileReader();
  rd.onload=function(){
    let pack;
    try{pack=JSON.parse(rd.result);}catch(e){showWarn('File không hợp lệ hoặc đã hỏng.');return}
    if(pack&&pack.type==='profiles-enc'){
      if(!cryptoOK()){showWarn('Trình duyệt này không hỗ trợ giải mã. Hãy mở ứng dụng qua địa chỉ https.');return}
      openPassword('import',async pw=>{
        const inner=await decryptPack(pw,pack);
        if(!inner)return false;
        importProfilesPack(inner);
        return true;
      });
      return;
    }
    importProfilesPack(pack);
  };
  rd.onerror=function(){showWarn('Không đọc được file.');};
  rd.readAsText(file,'utf-8');
}
// Gộp hồ sơ từ nội dung file (đã giải mã) vào máy này
function importProfilesPack(pack){
  const incoming=Array.isArray(pack)?pack:(pack&&pack.profiles);
  if(!Array.isArray(incoming)||!incoming.length){showWarn('File không chứa hồ sơ nào.');return}
  const cur=loadProfiles();
  let added=0, updated=0, skipped=0;
  incoming.map(sanitizeProfile).forEach(p=>{
    if(!p)return;
    const i=cur.findIndex(x=>x.name===p.name&&x.arrestDate===p.arrestDate);
    if(i>=0){cur[i]=p;updated++;}
    else if(cur.length<PROFILES_MAX){cur.unshift(p);added++;}
    else skipped++;
  });
  persistProfiles(cur);
  renderProfiles();
  showWarn('Đã nhập '+(added+updated)+' hồ sơ (thêm mới '+added+', cập nhật '+updated+')'
    +(skipped?('. Bỏ qua '+skipped+' hồ sơ do vượt giới hạn '+PROFILES_MAX+'.'):'.'));
}

// Popup xác nhận dùng chung (thay cho hộp thoại confirm mặc định)
let confirmAction=null;
function askConfirm(title,okLabel,onOk){
  document.getElementById('cfmTitle').textContent=title;
  document.getElementById('cfmOk').textContent=okLabel||'Xóa';
  confirmAction=onOk;
  document.getElementById('confirmOverlay').style.display='flex';
}
function closeConfirm(){
  document.getElementById('confirmOverlay').style.display='none';
  confirmAction=null;
}
function acceptConfirm(){
  const fn=confirmAction;
  closeConfirm();
  if(typeof fn==='function')fn();
}

function openShareOpt(){
  document.getElementById('shareOptOverlay').style.display='flex';
}
function closeShareOpt(){
  document.getElementById('shareOptOverlay').style.display='none';
}
function openExportOpt(){
  if(!loadProfiles().length){showWarn('Chưa có hồ sơ nào để xuất.');return}
  document.getElementById('exportOptOverlay').style.display='flex';
}
function closeExportOpt(){
  document.getElementById('exportOptOverlay').style.display='none';
}
// Mô tả gọn bảng xếp loại của một hồ sơ: "Quý I/2025: Khá; Quý II/2025: Kém; ..."
// ===== XUẤT EXCEL HỒ SƠ (2 tùy chọn) =====
function gradesSummary(d){
  if(!d)return '';
  const arr=parseStrictDateText(d.arrival);
  if(arr){
    const today=profileToday(), qs=completedQuarters(arr,today);
    if(!qs.length)return 'Chưa đủ thời gian xếp loại Quý';
    const gf=profileGradeFn(d,arr,today);
    const other=qs.filter(q=>gf(q.key)!=='Kha');
    if(!other.length)return 'Tất cả Khá';
    return other.map(q=>q.label+': '+(GRADE_SHORT[gf(q.key)]||gf(q.key))).join('; ')+' (các quý khác: Khá)';
  }
  // Hồ sơ chưa có ngày đến trại: liệt kê các quý đã chọn tay
  if(!d.grades)return '';
  const ks=Object.keys(d.grades);
  if(!ks.length)return 'Tất cả Khá';
  const nameOrder={I:1,II:2,III:3,IV:4};
  ks.sort((a,b)=>{
    const [ya,na]=a.split('-'), [yb,nb]=b.split('-');
    return (+ya-+yb)||((nameOrder[na]||0)-(nameOrder[nb]||0));
  });
  return ks.map(k=>{
    const [y,n]=k.split('-');
    return 'Quý '+n+'/'+y+': '+(GRADE_SHORT[d.grades[k]]||d.grades[k]);
  }).join('; ')+' (các quý khác: Khá)';
}
function escapesSummary(d,p){
  if(!d||!Array.isArray(d.escapes)||!d.escapes.length)return '';
  return d.escapes.map((r,i)=>'Lần '+(i+1)+': '+r.from+' - '+r.to).join('; ')+(p&&p.escape?('; Tổng: '+p.escape):'');
}
function remissionsSummary(d){
  if(!d||!d.remissions)return '';
  return d.remissions
    .filter(r=>(r.years||0)||(r.months||0))
    .map((r,i)=>'Kỳ '+(i+1)+': '+((r.years||0)?((r.years)+' năm '):'')+((r.months||0)?((r.months)+' tháng'):'')) 
    .join('; ');
}
// ===== XUẤT FILE EXCEL (.xlsx) — KHÔNG CẦN MẠNG =====
// Tự tạo file .xlsx tối giản (chuẩn Office Open XML, đóng gói ZIP không nén), mở được trên
// Excel, Google Sheets, WPS và điện thoại. Không phụ thuộc thư viện tải từ Internet.
const CRC32_TABLE=(()=>{
  const t=new Uint32Array(256);
  for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);t[n]=c>>>0;}
  return t;
})();
function crc32(bytes){
  let c=0xFFFFFFFF;
  for(let i=0;i<bytes.length;i++)c=CRC32_TABLE[(c^bytes[i])&0xFF]^(c>>>8);
  return (c^0xFFFFFFFF)>>>0;
}
// Đóng gói ZIP kiểu "store" (không nén). files: [{name, text}]
function zipStore(files){
  const enc=new TextEncoder();
  const u16=n=>[n&255,(n>>>8)&255];
  const u32=n=>[n&255,(n>>>8)&255,(n>>>16)&255,(n>>>24)&255];
  const now=new Date();
  const dosTime=(now.getHours()<<11)|(now.getMinutes()<<5)|(now.getSeconds()>>1);
  const dosDate=((now.getFullYear()-1980)<<9)|((now.getMonth()+1)<<5)|now.getDate();
  const chunks=[], central=[];
  let offset=0;
  files.forEach(f=>{
    const name=enc.encode(f.name), data=enc.encode(f.text), crc=crc32(data);
    const head=new Uint8Array([...u32(0x04034b50),...u16(20),...u16(0x0800),...u16(0),...u16(dosTime),...u16(dosDate),
      ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0)]);
    chunks.push(head,name,data);
    central.push(new Uint8Array([...u32(0x02014b50),...u16(20),...u16(20),...u16(0x0800),...u16(0),...u16(dosTime),...u16(dosDate),
      ...u32(crc),...u32(data.length),...u32(data.length),...u16(name.length),...u16(0),...u16(0),...u16(0),...u16(0),...u32(0),...u32(offset)]),name);
    offset+=head.length+name.length+data.length;
  });
  const cdSize=central.reduce((s,a)=>s+a.length,0);
  const end=new Uint8Array([...u32(0x06054b50),...u16(0),...u16(0),...u16(files.length),...u16(files.length),...u32(cdSize),...u32(offset),...u16(0)]);
  return new Blob([...chunks,...central,end],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}
function xmlEsc(v){
  return String(v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,'')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
// Đổi độ rộng theo số ký tự sang đơn vị của Excel (font Calibri 11, ký tự rộng 7px)
function xlsxWidth(wch){return Math.round((wch*7+5)/7*256)/256;}
function xlsxColName(i){let s='';i++;while(i>0){const m=(i-1)%26;s=String.fromCharCode(65+m)+s;i=Math.floor((i-1)/26);}return s;}
// Tạo nội dung 1 trang tính: hàng đầu là tiêu đề (in đậm), widths: [{wch}] độ rộng cột theo số ký tự
function xlsxSheetXml(head,rows,widths){
  const cell=(v,r,c,bold)=>{
    const ref=xlsxColName(c)+(r+1), s=bold?' s="1"':'';
    if(typeof v==='number'&&isFinite(v))return '<c r="'+ref+'"'+s+'><v>'+v+'</v></c>';
    if(v==null||v==='')return '';
    return '<c r="'+ref+'"'+s+' t="inlineStr"><is><t xml:space="preserve">'+xmlEsc(v)+'</t></is></c>';
  };
  const all=[head,...rows];
  const cols=(widths||[]).map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+xlsxWidth((w&&w.wch)||10)+'" customWidth="1"/>').join('');
  const body=all.map((row,r)=>'<row r="'+(r+1)+'">'+row.map((v,c)=>cell(v,r,c,r===0)).join('')+'</row>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    +'<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    +(cols?'<cols>'+cols+'</cols>':'')+'<sheetData>'+body+'</sheetData></worksheet>';
}
// sheets: [{name, head, rows, widths}]
function downloadXlsx(sheets,filename){
  const safeName=n=>String(n||'Sheet').replace(/[\[\]:*?\/\\]/g,' ').slice(0,31);
  const files=[
    {name:'[Content_Types].xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      +'<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
      +'<Default Extension="xml" ContentType="application/xml"/>'
      +'<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      +'<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      +sheets.map((s,i)=>'<Override PartName="/xl/worksheets/sheet'+(i+1)+'.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
      +'</Types>'},
    {name:'_rels/.rels',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      +'<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
      +'</Relationships>'},
    {name:'xl/workbook.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      +sheets.map((s,i)=>'<sheet name="'+xmlEsc(safeName(s.name))+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')
      +'</sheets></workbook>'},
    {name:'xl/_rels/workbook.xml.rels',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      +sheets.map((s,i)=>'<Relationship Id="rId'+(i+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet'+(i+1)+'.xml"/>').join('')
      +'<Relationship Id="rId'+(sheets.length+1)+'" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
      +'</Relationships>'},
    {name:'xl/styles.xml',text:'<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
      +'<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
      +'<fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts>'
      +'<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>'
      +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
      +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
      +'<cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs>'
      +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
      +'</styleSheet>'}
  ];
  sheets.forEach((s,i)=>files.push({name:'xl/worksheets/sheet'+(i+1)+'.xml',text:xlsxSheetXml(s.head,s.rows,s.widths)}));
  saveBlob(zipStore(files),filename);
}
// Một trang tính
function downloadXls(head,rows,filename,sheetName,widths){
  downloadXlsx([{name:sheetName||'Danh sách',head,rows,widths}],filename);
}
// Tải một Blob về máy với tên file cho trước
function saveBlob(blob,filename){
  const a=document.createElement('a');
  a.href=URL.createObjectURL(blob);
  a.download=filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(a.href),2000);
}
function exportProfilesToExcel(mode){
  const ps=refreshProfiles();   // số liệu tính đến ngày xuất file
  if(!ps.length){showWarn('Chưa có hồ sơ nào để xuất.');return}
  closeExportOpt();
  const stamp=dateStamp();
  if(mode==='calc'){
    // Giống file trong Lịch sử tra cứu
    const head=['STT','Họ tên','Ngày bắt','Án phạt','Tạm giam','Đã giảm','Trốn/tạm đình chỉ','Đã chấp hành','Còn lại','Ngày hết án'];
    const rows=ps.map((p,i)=>[i+1,p.name,p.arrestDate,p.sentence,p.preDet,p.remission,p.escape||'',p.served,p.remaining,p.release]);
    downloadXls(head,rows,'danh-sach-tinh-an-'+stamp+'.xlsx','Danh sách tính án',
      [{wch:5},{wch:20},{wch:12},{wch:20},{wch:18},{wch:16},{wch:18},{wch:22},{wch:20},{wch:14}]);
    return;
  }
  // Tổng thể: đầy đủ trường thông tin
  const head=['STT','Họ tên','Ngày bắt','Án phạt','Tạm giam','Ngày đến trại','Số tiền án',
              'Các kỳ giảm án','Kỳ giảm đã được xét','Trốn/tạm đình chỉ','Kết quả xếp loại',
              'Đã chấp hành','Còn lại','Ngày hết án','Lưu lúc'];
  const rows=ps.map((p,i)=>{
    const dt=p.data||{};
    return [i+1,p.name,p.arrestDate,p.sentence,p.preDet,(dt.arrival||''),(dt.penalty||''),
            remissionsSummary(dt),(dt.picked&&dt.picked.label)||'',escapesSummary(dt,p),gradesSummary(dt),
            p.served,p.remaining,p.release,p.saved];
  });
  downloadXls(head,rows,'danh-sach-tong-hop-'+stamp+'.xlsx','Danh sách tổng hợp',
    [{wch:5},{wch:20},{wch:12},{wch:20},{wch:18},{wch:14},{wch:11},{wch:26},{wch:30},{wch:40},{wch:46},{wch:22},{wch:20},{wch:14},{wch:18}]);
}

function exportHistoryToExcel(){
  const history=loadHistory();
  if(history.length===0){alert('Chưa có lịch sử tra cứu để xuất.');return}

  const headers=['Tên phạm nhân','Ngày bắt','Tính đến ngày','Án phạt','Trừ tạm giam','Thời gian giảm án','Thời gian trốn/tạm đình chỉ',
    'Mốc đạt 1/4 mức án','Mốc đạt 1/3 mức án','Mốc đạt 1/2 mức án',
    'Thời gian đã chấp hành','Thời gian còn lại','Ngày hết án dự kiến'];

  const rows=history.map(h=>[
    h.name||'',h.arrestDate,h.refDate||'',h.sentence,h.preDet,h.remission,h.escape||'',
    h.m25,h.m33,h.m50,h.served,h.remaining,h.release
  ]);

  // Độ rộng từng cột theo nội dung thực tế (tên dài, ngày ngắn, khoảng thời gian trung bình)
  const widths=[
    {wch:20},  // Tên phạm nhân
    {wch:12},  // Ngày bắt
    {wch:14},  // Tính đến ngày
    {wch:22},  // Án phạt
    {wch:20},  // Trừ tạm giam
    {wch:18},  // Thời gian giảm án
    {wch:24},  // Thời gian trốn/tạm đình chỉ
    {wch:19},  // Mốc 1/4
    {wch:19},  // Mốc 1/3
    {wch:19},  // Mốc 1/2
    {wch:23},  // Thời gian đã chấp hành
    {wch:21},  // Thời gian còn lại
    {wch:20}   // Ngày hết án dự kiến
  ];
  const st=dateStamp();
  const fileName='lich_su_tra_cuu_'+st.slice(0,4)+'-'+st.slice(4,6)+'-'+st.slice(6)+'.xlsx';
  downloadXls(headers,rows,fileName,'Lịch sử tra cứu',widths);
}
