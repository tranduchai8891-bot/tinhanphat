// ===== THỜI GIAN TRỐN / TẠM ĐÌNH CHỈ (không tính là thời gian đã chấp hành) =====
// Mỗi lần là khoảng [from, to): từ "ngày trốn" đến "ngày bắt lại", hoặc tạm đình chỉ "từ ngày" - "đến ngày".
// Độ dài mỗi lần tính như "thời gian đã chấp hành" (calcServedTime), cộng dồn theo quy ước 30 ngày/tháng.
//   - Ngày hết án mới = ngày hết án ban đầu + tổng thời gian trốn/tạm đình chỉ.
//   - Mốc 1/4, 1/3, 1/2...: theo diễn biến thực tế — chỉ cộng những lần bắt đầu TRƯỚC khi đạt mốc.
//   - Thời gian đã chấp hành: trừ phần trốn/tạm đình chỉ đã diễn ra tính đến ngày tham chiếu;
//     thời hạn còn lại: không tính phần trốn/tạm đình chỉ còn sau ngày tham chiếu.
const ESC_MAX=20;
function ymdDays(a){return a.years*360+a.months*30+a.days;}
function ymdOfDays(t){t=Math.max(0,t);return {years:Math.floor(t/360),months:Math.floor(t%360/30),days:t%30};}
function subYMD(a,b){return ymdOfDays(ymdDays(a)-ymdDays(b));}
function sumYMD(list){return list.reduce((s,x)=>addYMD(s,x),{years:0,months:0,days:0});}
function ymdText(a){return fmtDays(a.years*12+a.months,a.days);}
// Cộng khoảng (năm, tháng, ngày) vào một ngày. mode 'qlpn'/'thuc': cộng như ngày hết án;
// không có mode: cộng như các mốc 1/4, 1/3, 1/2 (ngày lẻ theo quy ước 30 ngày).
function addYMDToDate(date,dur,mode){
  const r=addMonthsClamped(date,dur.years*12+dur.months);
  return mode?addReleaseExtraDays(r,date.getDate(),dur.days,mode):addExtraDaysFixed30(r,dur.days);
}
// Dời một mốc (hoặc ngày hết án) theo các lần trốn/tạm đình chỉ (esc đã sắp theo ngày bắt đầu):
// mốc = mốc ban đầu + tổng các lần bắt đầu trước mốc (xét lại sau mỗi lần dời).
function escShift(base,esc,mode){
  if(!esc||!esc.length)return base;
  let n=0,cur=base;
  for(let g=0;g<=esc.length;g++){
    let k=0;while(k<esc.length&&esc[k].from<cur)k++;
    if(k<=n)break;
    n=k;cur=addYMDToDate(base,sumYMD(esc.slice(0,n).map(p=>p.dur)),mode);
  }
  return cur;
}
// Phần của một lần trốn/tạm đình chỉ nằm trước (before=true) hoặc sau ngày tham chiếu ref
function escPart(p,ref,before){
  const Z={years:0,months:0,days:0};
  if(before)return p.to<=ref?p.dur:(p.from<ref?calcServedTime(p.from,ref):Z);
  return p.from>=ref?p.dur:(p.to>ref?calcServedTime(ref,p.to):Z);
}
function escMsBefore(esc,ref){return esc.reduce((s,p)=>s+Math.max(0,Math.min(p.to,ref)-p.from),0);}
// Ngày dd/mm/yyyy có thật (31/02 không hợp lệ)
function strictDMY(t){
  const m=/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(String(t||'').trim());
  if(!m)return null;
  const d=new Date(+m[3],+m[2]-1,+m[1]);
  return (d.getDate()===+m[1]&&d.getMonth()===+m[2]-1&&+m[3]>=1900&&+m[3]<=2100)?d:null;
}
// Danh sách nhập dạng chữ [{from,to}] -> {list:[{from,to,dur,n}] sắp theo ngày bắt đầu} hoặc {error}.
// Dòng để trống cả 2 ô được bỏ qua; n = số thứ tự dòng (Lần n).
function parseEscapeRows(rows,arrestDate){
  const list=[];
  for(let i=0;i<(rows||[]).length;i++){
    const r=rows[i]||{}, fs=String(r.from||'').trim(), ts=String(r.to||'').trim(), lbl='Lần '+(i+1)+': ';
    if(!fs&&!ts)continue;
    const f=strictDMY(fs), t=strictDMY(ts);
    if(!f||!t)return {error:lbl+'nhập đủ "Từ ngày" và "Đến ngày" (ví dụ 13/11/1985).'};
    if(t<=f)return {error:lbl+'"Đến ngày" phải sau "Từ ngày".'};
    if(arrestDate&&f<arrestDate)return {error:lbl+'không được bắt đầu trước ngày bắt ('+fmtDate(arrestDate)+').'};
    list.push({from:f,to:t,dur:calcServedTime(f,t),n:i+1});
  }
  if(list.length>ESC_MAX)return {error:'Tối đa '+ESC_MAX+' lần trốn/tạm đình chỉ.'};
  list.sort((a,b)=>a.from-b.from);
  for(let i=1;i<list.length;i++)
    if(list[i].from<list[i-1].to)return {error:'Lần '+list[i-1].n+' và lần '+list[i].n+' bị trùng thời gian.'};
  return {list};
}
// Danh sách đã lưu dạng ISO (lịch sử) -> list
function escListFromISO(pairs){
  const list=(pairs||[]).map(q=>({from:new Date(q.from),to:new Date(q.to)}))
    .filter(p=>!isNaN(p.from)&&!isNaN(p.to)&&p.to>p.from).sort((a,b)=>a.from-b.from);
  list.forEach((p,i)=>{p.dur=calcServedTime(p.from,p.to);p.n=i+1;});
  return list.length?list:undefined;
}
