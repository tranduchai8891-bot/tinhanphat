// ===== TỰ KIỂM TRA ĐỘ CHÍNH XÁC (mở ứng dụng với địa chỉ có đuôi #kiemthu) =====
// Dùng sau mỗi lần sửa phần mềm: nếu tất cả "ĐẠT" thì cách tính vẫn giữ nguyên như bản đã kiểm chứng.
//  - Phần 1: các ví dụ nghiệp vụ đã đối chiếu thủ công (đọc được, sửa được).
//  - Phần 2: "dấu vân tay" — chạy mỗi hàm tính trên hàng chục nghìn trường hợp cố định rồi so
//    với giá trị đã ghi. Lệch bất kỳ một ngày nào ở bất kỳ trường hợp nào cũng sẽ báo KHÔNG ĐẠT.
//    Khi CHỦ ĐỘNG thay đổi cách tính, chép giá trị mới hiện trên màn hình vào SELFTEST_FINGERPRINTS.
const SELFTEST_FINGERPRINTS={
  "Ngày hết án (calcRelease)":"0ec19d5b",
  "Mốc 1/4 - 1/3 - 1/2 (calcMilestoneDate)":"64a3ddce",
  "Mốc 1/2 - 2/3 - 25 năm (calcFractionMilestone)":"12dbfd64",
  "Thời gian đã chấp hành (calcServedTime)":"99e2976d",
  "Thời hạn còn lại (calendarDiffMinus1)":"31dd0219",
  "Quý đủ điều kiện xếp loại (completedQuarters)":"f8efce41",
  "Đợt xét giảm án (findEligibleReview)":"23f17c8a",
  "Hiển thị năm/tháng/ngày (fmtDays, addYMD)":"69f1291e",
  "Hồ sơ cập nhật theo ngày (liveProfileValues)":"4373a526",
  "Tự xếp loại Điều 25, 26 (autoGrades)":"0a031ee9",
  "Kết luận xét giảm án (evaluateRemission)":"36384ee6",
  "Trốn/tạm đình chỉ (computeSentence)":"a3ed1e8b"
};

function selfTestCases(){
  const D=(d,m,y)=>new Date(y,m-1,d);
  const ymd=o=>o.years+' năm '+o.months+' tháng '+o.days+' ngày';
  const keys=qs=>qs.map(q=>q.label).join(', ')||'(không có quý nào)';
  const qlbl=k=>{const [y,n]=k.split('-');return 'Quý '+n+'/'+y;};
  const auto=r=>'Kém: '+(Object.keys(r.kem).map(qlbl).join(', ')||'(không có)')+' | TB: '+(Object.keys(r.tb).map(qlbl).join(', ')||'(không có)');
  return [
    ['Bắt 31/07/2026, án 2 năm 2 tháng, trừ tạm giam 2 tháng 20 ngày → hết án (QLPN cũ)', ()=>fmtDate(calcRelease(D(31,7,2026),26,0,2,20,'qlpn')), '11/07/2028'],
    ['Bắt 31/07/2026, án 2 năm 2 tháng, trừ tạm giam 2 tháng 20 ngày → hết án (lịch thực)', ()=>fmtDate(calcRelease(D(31,7,2026),26,0,2,20,'thuc')), '11/07/2028'],
    ['Bắt 31/01/2023, án 1 tháng 15 ngày → hết án (QLPN cũ)', ()=>fmtDate(calcRelease(D(31,1,2023),1,15,0,0,'qlpn')), '15/03/2023'],
    ['Bắt 31/01/2023, án 1 tháng 15 ngày → hết án (lịch thực)', ()=>fmtDate(calcRelease(D(31,1,2023),1,15,0,0,'thuc')), '15/03/2023'],
    ['Bắt 10/05/2024, án 5 tháng, trừ tạm giữ 9 ngày (còn 4 tháng 21 ngày) → hết án', ()=>fmtDate(calcRelease(D(10,5,2024),5,0,0,9,'qlpn')), '30/09/2024'],
    ['31/07/2026 cộng 11 tháng (kẹp về cuối tháng)', ()=>fmtDate(addMonthsClamped(D(31,7,2026),11)), '30/06/2027'],
    ['11/02/2026 cộng 20 ngày lẻ (kẹp cuối tháng 2)', ()=>fmtDate(addExtraDaysFixed30(D(11,2,2026),20)), '28/02/2026'],
    ['27/03/2026 cộng 15 ngày lẻ (tràn theo quy ước 30 ngày)', ()=>fmtDate(addExtraDaysFixed30(D(27,3,2026),15)), '12/04/2026'],
    ['Đã chấp hành 31/5/2026 → 15/6/2026', ()=>ymd(calcServedTime(D(31,5,2026),D(15,6,2026))), '0 năm 0 tháng 15 ngày'],
    ['Đã chấp hành 28/2/2026 → 15/6/2026', ()=>ymd(calcServedTime(D(28,2,2026),D(15,6,2026))), '0 năm 3 tháng 15 ngày'],
    ['Đã chấp hành 07/5/2024 → 25/6/2026', ()=>ymd(calcServedTime(D(7,5,2024),D(25,6,2026))), '2 năm 1 tháng 18 ngày'],
    ['Đã chấp hành 31/12/2024 → 25/6/2026', ()=>ymd(calcServedTime(D(31,12,2024),D(25,6,2026))), '1 năm 5 tháng 25 ngày'],
    ['Đã chấp hành 20/2/2026 → 01/3/2026 (đếm thực tế)', ()=>ymd(calcServedTime(D(20,2,2026),D(1,3,2026))), '0 năm 0 tháng 9 ngày'],
    ['Đã chấp hành 20/2/2026 → 02/3/2026 (quy ước 30 ngày)', ()=>ymd(calcServedTime(D(20,2,2026),D(2,3,2026))), '0 năm 0 tháng 12 ngày'],
    ['Mốc 1/3: bắt 31/07/2024, án 5 năm 2 tháng 10 ngày, tạm giam 2 tháng 20 ngày', ()=>fmtDate(calcMilestoneDate(D(31,7,2024),62,10,3,2,20)), '05/02/2026'],
    ['Đến trại 11/07/2026, tính đến 14/10/2026 → quý đủ điều kiện xếp loại', ()=>keys(completedQuarters(D(11,7,2026),D(14,10,2026))), 'Quý III/2026'],
    ['Đến trại 12/07/2026, tính đến 14/10/2026 → quý đủ điều kiện xếp loại', ()=>keys(completedQuarters(D(12,7,2026),D(14,10,2026))), '(không có quý nào)'],
    ['Đạt mốc 05/02/2026 → đợt xét giảm án đầu tiên', ()=>{const r=findEligibleReview(D(5,2,2026));return r.name+' ('+fmtDate(r.date)+')';}, '30/4 - 1/5 (15/03/2026)'],
    ['Phân loại tội phạm: án 3 năm / 3 năm 1 ngày / 15 năm 1 tháng', ()=>[crimeClass(36,0),crimeClass(36,1),crimeClass(181,0)].map(c=>c.text).join(' / '), 'Ít nghiêm trọng / Nghiêm trọng / ĐB nghiêm trọng'],
    ['Điều 26, 25 — Phạm tội mới, đến trại 01/01/2024: Kém 02 quý đầu, rồi Trung bình', ()=>auto(autoGrades({arrival:D(1,1,2024),today:D(24,10,2026),k9on:true})), 'Kém: Quý I/2024, Quý II/2024 | TB: Quý III/2024'],
    ['Điều 26, 25 — Kỷ luật 10/01/2025, công nhận tiến bộ 20/06/2025', ()=>auto(autoGrades({arrival:D(1,1,2024),today:D(24,10,2026),k8on:true,k8dec:D(10,1,2025),k8ok:D(20,6,2025)})), 'Kém: Quý I/2025, Quý II/2025, Quý III/2025 | TB: Quý IV/2025'],
    ['Điều 26 — Kỷ luật 10/01/2025, chưa được công nhận tiến bộ (tính đến 24/10/2026)', ()=>auto(autoGrades({arrival:D(1,1,2024),today:D(24,10,2026),k8on:true,k8dec:D(10,1,2025),k8ok:null})), 'Kém: Quý I/2025, Quý II/2025, Quý III/2025, Quý IV/2025, Quý I/2026, Quý II/2026, Quý III/2026 | TB: (không có)'],
    ['Trốn/tạm đình chỉ — bắt 09/03/1984, án 6 năm 6 tháng 20 ngày, trốn 13/11/1985-29/03/1986 và 02/04/1986-11/09/2026; tính đến 30/10/2026',
      ()=>{const r=escCase(D(9,3,1984),78,20,ESC_EX,D(30,10,2026));return 'tổng '+ymdText(r.escTotal)+' | đã chấp hành '+ymd(r.servedDiff)+' | còn lại '+ymd(r.remainingDiff)+' | hết án '+fmtDate(r.releaseDate);},
      'tổng 40 năm 9 tháng 25 ngày | đã chấp hành 1 năm 9 tháng 26 ngày | còn lại 4 năm 8 tháng 24 ngày | hết án 24/07/2031'],
    ['Trốn/tạm đình chỉ — ví dụ trên: mốc 1/4 đạt trước lần trốn 1 nên giữ nguyên; mốc 1/3, 1/2 dời theo diễn biến thực tế',
      ()=>{const r=escCase(D(9,3,1984),78,20,ESC_EX,D(30,10,2026));return [r.m25,r.m33,r.m50].map(fmtDate).join(' | ');}, '29/10/1985 | 11/03/2027 | 14/04/2028'],
    ['Trốn/tạm đình chỉ — bắt 01/01/2020, án 3 năm, trốn 01/06/2021-01/09/2021 (sau khi đã đạt mốc 1/4, 1/3)',
      ()=>{const r=escCase(D(1,1,2020),36,0,[{from:'01/06/2021',to:'01/09/2021'}],D(30,10,2026));return [r.m25,r.m33,r.m50].map(fmtDate).join(' | ')+' | hết án '+fmtDate(r.releaseDate);},
      '01/10/2020 | 01/01/2021 | 01/10/2021 | hết án 01/04/2023'],
    ['Trốn/tạm đình chỉ — ví dụ trên, tính đến 15/07/2021 (đang trốn): thời gian chấp hành dừng lại',
      ()=>{const r=escCase(D(1,1,2020),36,0,[{from:'01/06/2021',to:'01/09/2021'}],D(15,7,2021));return 'đã chấp hành '+ymd(r.servedDiff)+' | còn lại '+ymd(r.remainingDiff);},
      'đã chấp hành 1 năm 5 tháng 0 ngày | còn lại 1 năm 7 tháng 0 ngày'],
    ['Án đã hết từ lâu — bắt 09/03/1984, án 6 năm, tính đến 30/10/2026: đã chấp hành dừng ở mức án',
      ()=>{const r=computeSentence({name:'',arrestDate:D(9,3,1984),sentMonths:72,sD:0,preDetMonths:0,pdD:0,remMonths:0,remissionsSnapshot:[]},D(30,10,2026),'qlpn');
        return 'hết án '+fmtDate(r.releaseDate)+' | đã chấp hành '+ymd(r.servedDiff)+' | còn lại '+ymd(r.remainingDiff);},
      'hết án 09/03/1990 | đã chấp hành 6 năm 0 tháng 0 ngày | còn lại 0 năm 0 tháng 0 ngày'],
    ['Án đã hết — bắt 09/03/1984, án 6 năm, tạm giam 2 tháng 15 ngày, giảm 1 năm, tính đến 30/10/2026',
      ()=>{const r=computeSentence({name:'',arrestDate:D(9,3,1984),sentMonths:72,sD:0,preDetMonths:2,pdD:15,remMonths:12,remissionsSnapshot:[]},D(30,10,2026),'qlpn');
        return 'hết án '+fmtDate(r.releaseDate)+' | đã chấp hành '+ymd(r.servedDiff)+' | còn lại '+ymd(r.remainingDiff);},
      'hết án 24/12/1988 | đã chấp hành 5 năm 0 tháng 0 ngày | còn lại 0 năm 0 tháng 0 ngày'],
    ['Án đã hết — bắt 09/03/1984, án 6 năm 6 tháng 20 ngày, trốn 13/11/1985-29/03/1986, tính đến 30/10/2026',
      ()=>{const r=escCase(D(9,3,1984),78,20,[{from:'13/11/1985',to:'29/03/1986'}],D(30,10,2026));
        return 'hết án '+fmtDate(r.releaseDate)+' | đã chấp hành '+ymd(r.servedDiff)+' | còn lại '+ymd(r.remainingDiff);},
      'hết án 15/02/1991 | đã chấp hành 6 năm 6 tháng 20 ngày | còn lại 0 năm 0 tháng 0 ngày'],
    ['Hiển thị gọn khi 0 năm 0 tháng: 0 năm 0 tháng 17 ngày / 0 năm 0 tháng 0 ngày / 0 năm 3 tháng 5 ngày',
      ()=>[{years:0,months:0,days:17},{years:0,months:0,days:0},{years:0,months:3,days:5}].map(fmtDaysFull).join(' / '),
      '17 ngày / 0 ngày / 0 năm 3 tháng 5 ngày'],
    ['Khoản 7 — đợt sớm nhất được xét tiếp (cùng đợt năm sau): đã giảm với ngày xét thực tế 20/07/2025 / 23/04/2027 / 10/01/2028',
      ()=>[D(20,7,2025),D(23,4,2027),D(10,1,2028)].map(d=>{const n=k7EarliestNext(d);return shortReviewLabel(reviewRoundOf(n).name,n)+' ('+fmtDate(n)+')';}).join(' / '),
      '2/9/2026 (15/07/2026) / 30/4-1/5/2028 (15/03/2028) / Tết Nguyên Đán 2029 (15/12/2028)']
  ];
}
const ESC_EX=[{from:'13/11/1985',to:'29/03/1986'},{from:'02/04/1986',to:'11/09/2026'}];
function escCase(a,sm,sd,rows,t){
  return computeSentence({name:'',arrestDate:a,sentMonths:sm,sD:sd,preDetMonths:0,pdD:0,remMonths:0,remissionsSnapshot:[],
                          escapes:parseEscapeRows(rows,a).list},t,'qlpn');
}

// Dấu vân tay: băm (FNV-1a) toàn bộ kết quả của mỗi hàm trên bộ dữ liệu cố định
function selfTestFingerprints(){
  const fp={};
  let seed=20261024;
  const rnd=()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};
  const ri=n=>Math.floor(rnd()*n);
  const iso=d=>d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
  const hasher=()=>{let h=0x811c9dc5;return{add(s){s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619);}h^=10;h=Math.imul(h,16777619);},hex(){return (h>>>0).toString(16).padStart(8,'0');}};};
  const days=[];for(let d=new Date(2019,0,1);d<=new Date(2030,11,31);d.setDate(d.getDate()+1))days.push(new Date(d));
  const run=(name,fn)=>{const h=hasher();fn(h);fp[name]=h.hex();};
  run('Ngày hết án (calcRelease)',h=>{for(const a of days)for(let k=0;k<6;k++){const sm=ri(361),sd=ri(30),dm=ri(sm+2),dd=ri(4)?ri(30):ri(200);for(const md of ['qlpn','thuc'])h.add(iso(calcRelease(a,sm,sd,dm,dd,md)));}});
  run('Mốc 1/4 - 1/3 - 1/2 (calcMilestoneDate)',h=>{for(const a of days)for(let k=0;k<3;k++){const sm=ri(361),sd=ri(30),pm=ri(12),pd=ri(90);for(const dv of [2,3,4])h.add(iso(calcMilestoneDate(a,sm,sd,dv,pm,pd)));}});
  run('Mốc 1/2 - 2/3 - 25 năm (calcFractionMilestone)',h=>{for(const a of days)for(let k=0;k<2;k++){const sm=ri(361),sd=ri(30),pm=ri(24),pd=ri(90);h.add(iso(calcFractionMilestone(a,sm,sd,1,2,pm,pd)));h.add(iso(calcFractionMilestone(a,sm,sd,2,3,pm,pd)));h.add(iso(calcFractionMilestone(a,300,0,1,1,pm,pd)));}});
  run('Thời gian đã chấp hành (calcServedTime)',h=>{for(const a of days)for(let k=0;k<6;k++){const b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(k<2?70:9000));h.add(JSON.stringify(calcServedTime(a,b)));}});
  run('Thời hạn còn lại (calendarDiffMinus1)',h=>{for(const a of days)for(let k=0;k<4;k++){const b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(k<2?70:9000));h.add(JSON.stringify(calendarDiffMinus1(a,b)));}});
  run('Quý đủ điều kiện xếp loại (completedQuarters)',h=>{for(let i=0;i<days.length;i+=3){const a=days[i];for(let k=0;k<2;k++){const b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(2000));h.add(completedQuarters(a,b).map(q=>q.key).join(';'));}}});
  run('Đợt xét giảm án (findEligibleReview)',h=>{for(const a of days){const r=findEligibleReview(a);h.add(r?r.name+iso(r.date):'-');}});
  run('Hiển thị năm/tháng/ngày (fmtDays, addYMD)',h=>{for(let k=0;k<20000;k++){h.add(fmtDays(ri(500),ri(400)));const A={years:ri(40),months:ri(13),days:ri(35)},B={years:ri(10),months:ri(30),days:ri(400)};h.add(JSON.stringify(addYMD(A,B)));}});
  run('Hồ sơ cập nhật theo ngày (liveProfileValues)',h=>{const def=CALC_MODE_DEFAULT;for(let k=0;k<300;k++){const a=days[ri(days.length)],t=days[ri(days.length)];const sm=ri(361),sd=ri(30),pm=ri(30),pd=ri(90),rm=ri(5)?ri(40):0;
    const p={arrestDate:fmtDate(a),sentence:fmtDays(sm,sd),preDet:fmtDays(pm,pd),remission:fmtDays(rm,0),release:ri(2)?fmtDate(calcRelease(a,sm,sd,pm+rm,pd,ri(2)?'qlpn':'thuc')):'x',calcMode:ri(3)?undefined:(ri(2)?'qlpn':'thuc')};
    for(const m of ['qlpn','thuc']){CALC_MODE_DEFAULT=m;h.add(JSON.stringify(liveProfileValues(p,t)));}}CALC_MODE_DEFAULT=def;});
  run('Tự xếp loại Điều 25, 26 (autoGrades)',h=>{for(let k=0;k<3000;k++){const a=days[ri(days.length)];
    const t=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(3000)-50);
    const dec=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(1500)-100);
    const ok=ri(4)?new Date(dec.getFullYear(),dec.getMonth(),dec.getDate()+ri(700)-60):null;
    const r=autoGrades({arrival:a,today:t,k8on:ri(2)===0,k8dec:ri(8)?dec:null,k8ok:ok,k9on:ri(3)===0});
    h.add(JSON.stringify([r.kem,r.tb]));}});
  run('Kết luận xét giảm án (evaluateRemission)',h=>{for(let k=0;k<1500;k++){const a=days[ri(days.length)];
    const sm=1+ri(300),sd=ri(30),pm=ri(10),pd=ri(30),t=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(6000));
    const e={arrestDate:a,today:t,sentMonths:sm,sentExtraDays:sd,preDetMonths:pm,preDetDays:pd,oneThirdDate:calcOneThirdDate(a,sm,sd,pm,pd)};
    const arr=ri(6)?new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(200)-(ri(10)?0:20)):null;
    const g={};if(arr)completedQuarters(arr,t).forEach(q=>{if(ri(5)===0)g[q.key]=['Tot','Kha','TB','Kem','No'][ri(5)];});
    const dec=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(3000));
    const x={priority:ri(5)===0,penalty:ri(4)?0:1+ri(3),arrival:arr,grades:g,
      picked:ri(6)?null:{value:String(new Date(a.getFullYear()+1+ri(4),11,15).getTime()),label:'Tết Nguyên Đán (ngày xét 15/12)'},
      k7:{on:ri(3)===0,value:ri(2)?new Date(a.getFullYear()+1+ri(6),[2,6,11][ri(3)],15).getTime():0,label:'',date:null},
      k8:{on:ri(3)===0,need:[0,4,5][ri(3)],dec:ri(5)?dec:null,date:ri(4)?new Date(dec.getFullYear(),dec.getMonth(),dec.getDate()+ri(700)):null},
      k9:{on:ri(4)===0,type:[0,9,10][ri(3)],life:ri(3)===0}};
    const r=evaluateRemission(e,x);h.add(r.cls+'|'+r.html+'|'+JSON.stringify(r.hints)+'|'+!!r.arrivalInvalid);}});
  run('Trốn/tạm đình chỉ (computeSentence)',h=>{for(let k=0;k<1500;k++){const a=days[ri(days.length)];
    const sm=1+ri(300),sd=ri(30),pm=ri(10),pd=ri(30),rm=ri(3)?0:ri(24);
    const esc=[];let s=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(800));
    for(let j=1+ri(3);j>0;j--){const e=new Date(s.getFullYear(),s.getMonth(),s.getDate()+1+ri(ri(4)?200:3000));
      esc.push({from:s,to:e,dur:calcServedTime(s,e),n:esc.length+1});s=new Date(e.getFullYear(),e.getMonth(),e.getDate()+ri(400));}
    const t=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(9000));
    for(const md of ['qlpn','thuc']){
      const r=computeSentence({name:'',arrestDate:a,sentMonths:sm,sD:sd,preDetMonths:pm,pdD:pd,remMonths:rm,remissionsSnapshot:[],escapes:esc},t,md);
      h.add([iso(r.releaseDate),iso(r.m25),iso(r.m33),iso(r.m50),JSON.stringify(r.servedDiff),JSON.stringify(r.remainingDiff),r.pct,r.left].join('|'));}}});
  return fp;
}

function runSelfTest(){
  const old=document.getElementById('selfTestOverlay');
  if(old)old.remove();
  const t0=performance.now();
  let pass=0, fail=0, html='';
  const row=(ok,title,detail)=>{ok?pass++:fail++;
    return '<div style="display:flex;gap:8px;padding:7px 0;border-bottom:1px solid #eee;font-size:12.5px;line-height:1.45">'
      +'<b style="flex:0 0 74px;color:'+(ok?'#1d6f42':'#b91c1c')+'">'+(ok?'✔ ĐẠT':'✘ KHÔNG ĐẠT')+'</b>'
      +'<span>'+escHtml(title)+(detail?'<br><span style="color:#666">'+escHtml(detail)+'</span>':'')+'</span></div>';};
  html+='<h3 style="margin:14px 0 4px;font-size:14px;color:#7f1d1d">1. Ví dụ nghiệp vụ đã đối chiếu</h3>';
  selfTestCases().forEach(([title,fn,expect])=>{
    let got; try{got=fn();}catch(e){got='Lỗi: '+e.message;}
    html+=row(got===expect,title,got===expect?('= '+expect):('Mong đợi: '+expect+' — Thực tế: '+got));
  });
  html+='<h3 style="margin:16px 0 4px;font-size:14px;color:#7f1d1d">2. Ví dụ kết luận xét giảm án</h3>';
  selfTestRemissionCases().forEach(([title,fn,expect])=>{
    let got; try{got=fn();}catch(e){got='Lỗi: '+e.message;}
    html+=row(got===expect,title,got===expect?('= '+expect):('Mong đợi: '+expect+' — Thực tế: '+got));
  });
  html+='<h3 style="margin:16px 0 4px;font-size:14px;color:#7f1d1d">3. Dấu vân tay các hàm tính (hàng chục nghìn trường hợp)</h3>';
  let fp={};
  try{fp=selfTestFingerprints();}catch(e){html+=row(false,'Không chạy được phần dấu vân tay','Lỗi: '+e.message);}
  Object.keys(fp).forEach(k=>{
    const ok=SELFTEST_FINGERPRINTS[k]===fp[k];
    html+=row(ok,k,ok?('Mã '+fp[k]):('Mã ghi sẵn: '+(SELFTEST_FINGERPRINTS[k]||'(chưa có)')+' — Mã hiện tại: '+fp[k]));
  });
  const secs=((performance.now()-t0)/1000).toFixed(1);
  const ov=document.createElement('div');
  ov.id='selfTestOverlay';
  ov.style.cssText='position:fixed;inset:0;z-index:100000;background:#fff;overflow:auto;-webkit-overflow-scrolling:touch;'
    +'padding:calc(16px + env(safe-area-inset-top)) 16px calc(24px + env(safe-area-inset-bottom));font-family:inherit;color:#1a1a2e';
  ov.innerHTML='<div style="max-width:640px;margin:0 auto">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px">'
    +'<h2 style="font-size:17px;color:#7f1d1d;margin:0">Tự kiểm tra độ chính xác</h2>'
    +'<button type="button" id="selfTestClose" style="padding:8px 14px;border-radius:10px;border:1px solid #ddd;background:#f6f6f6;font:inherit;font-weight:600">Đóng</button></div>'
    +'<div style="margin:12px 0;padding:12px 14px;border-radius:12px;font-weight:700;font-size:14px;'
    +(fail?'background:#fdecec;color:#b91c1c">✘ Có '+fail+' mục KHÔNG ĐẠT — cách tính đã thay đổi, cần kiểm tra lại trước khi dùng.'
          :'background:#e8f5ec;color:#1d6f42">✔ Tất cả '+pass+' mục ĐẠT — cách tính giữ nguyên như bản đã kiểm chứng.')
    +'</div><div style="font-size:11.5px;color:#888">Thời gian chạy: '+secs+' giây</div>'+html+'</div>';
  document.body.appendChild(ov);
  document.getElementById('selfTestClose').onclick=function(){
    ov.remove();
    if(location.hash==='#kiemthu')history.replaceState(null,'',location.pathname+location.search);
  };
  return {pass,fail,fp};
}
window.addEventListener('load',()=>{if(location.hash==='#kiemthu')setTimeout(runSelfTest,1300);});
window.addEventListener('hashchange',()=>{if(location.hash==='#kiemthu')runSelfTest();});

// ----- Ví dụ kết luận xét giảm án (trang Tra cứu giảm án) -----
// Tính đến ngày 25/10/2026 (trừ khi ghi khác). Kết quả là toàn văn kết luận hiển thị trên trang.
function selfTestRemissionCases(){
  const D=(d,m,y)=>new Date(y,m-1,d);
  const T=D(25,10,2026);
  const E=(arrest,months,days,pdM,pdD,today)=>({arrestDate:arrest, today:today||T, sentMonths:months, sentExtraDays:days||0,
    preDetMonths:pdM||0, preDetDays:pdD||0, oneThirdDate:calcOneThirdDate(arrest,months,days||0,pdM||0,pdD||0)});
  const X=o=>{o=o||{};return Object.assign({priority:false,penalty:0,arrival:null,grades:{},picked:null},o,{
    k7:Object.assign({on:false,value:0,label:'',date:null},o.k7),
    k8:Object.assign({on:false,need:0,date:null,dec:null},o.k8),
    k9:Object.assign({on:false,type:0,life:false},o.k9)});};
  const txt=r=>r.html.replace(/<[^>]+>/g,'');
  const ev=(e,x)=>()=>txt(evaluateRemission(e,x));
  const A6=E(D(1,3,2022),72), ARR=D(15,3,2022);
  return [
    ['Án 6 năm, bắt 01/03/2022, đến trại 15/03/2022, các quý đều Khá', ev(A6,X({arrival:ARR})), "✓ Đủ điều kiện xét giảm ánĐã đủ điều kiện về thời gian (1/3 mức án) và xếp loại: 18/4 quý Khá liên tục liền kề. Đề nghị xét giảm tại đợt Tết Nguyên Đán 2027 (ngày xét 15/12/2026). Số quý xếp loại tính từ ngày đến trại 15/03/2022 theo Điều 21. Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Như trên, tính đến 01/10/2023 (chưa đạt 1/3)', ev(E(D(1,3,2022),72,0,0,0,D(1,10,2023)),X({arrival:ARR})), "Chưa đủ điều kiện xét giảmChưa đạt mốc thời gian 1/3 mức án (dự kiến đạt ngày 01/03/2024). Đợt xét sớm nhất có thể được đề nghị: 30/4 - 1/5 (15/03/2024)."],
    ['Như trên, chưa nhập ngày đến trại', ev(A6,X()), "◷ Đã đủ điều kiện về thời gianĐã đạt mốc 1/3 mức án ngày 01/03/2024. Vui lòng nhập các thông tin bên dưới để tra cứu kết quả giảm án."],
    ['Ngày đến trại 20/02/2022 trước ngày bắt', ev(A6,X({arrival:D(20,2,2022)})), "Ngày đến trại không hợp lệNgày đến trại không thể trước ngày bắt (01/03/2022). Vui lòng nhập lại để tiếp tục đối chiếu."],
    ['Quý III/2026 xếp Kém (đứt chuỗi Khá)', ev(A6,X({arrival:ARR,grades:{'2026-III':'Kem'}})), "◷ Đủ thời gian — chưa đủ xếp loạiĐã đạt mốc 1/3 mức án nhưng mới có 0/4 quý Khá liên tục liền kề (Khoản 5 cần tổng ≥ 5 quý và ≥ 2 quý liền kề — hiện có 17 quý / 0 quý liền kề); còn thiếu 2 quý xếp loại Khá. Nếu các quý tiếp theo đều đạt Khá trở lên, dự kiến đủ điều kiện đề nghị xét giảm vào đợt Quốc khánh 2/9 (15/07/2027)."],
    ['Khoản 5: án 12 năm, Kém Quý III/2025 (không liên tục)', ev(E(D(1,1,2018),144),X({arrival:D(10,1,2018),grades:{'2025-III':'Kem'}})), "✓ Đủ điều kiện xét giảm ánĐã đủ điều kiện về thời gian (1/3 mức án) và xếp loại: tổng 34 quý Khá (yêu cầu ≥ 10) và 4 quý liền kề (yêu cầu ≥ 4) — tự động áp dụng Khoản 5 do xếp loại không liên tục. Đề nghị xét giảm tại đợt Tết Nguyên Đán 2027 (ngày xét 15/12/2026). Số quý xếp loại tính từ ngày đến trại 10/01/2018 theo Điều 21. Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Án 4 năm, Kém Quý I/2026, không tiền án', ev(E(D(1,3,2022),48),X({arrival:ARR,grades:{'2026-I':'Kem'}})), "✓ Đủ điều kiện xét giảm ánĐã đủ điều kiện về thời gian (1/3 mức án) và xếp loại: 2/2 quý Khá liên tục liền kề. Đề nghị xét giảm tại đợt Tết Nguyên Đán 2027 (ngày xét 15/12/2026). Số quý xếp loại tính từ ngày đến trại 15/03/2022 theo Điều 21. Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Khoản 6: như trên nhưng có 01 tiền án (+2 quý)', ev(E(D(1,3,2022),48),X({arrival:ARR,penalty:1,grades:{'2026-I':'Kem'}})), "◷ Đủ thời gian — chưa đủ xếp loạiĐã đạt mốc 1/3 mức án nhưng mới có 2/4 quý Khá liên tục liền kề; còn thiếu 2 quý xếp loại Khá. Nếu các quý tiếp theo đều đạt Khá trở lên, dự kiến đủ điều kiện đề nghị xét giảm vào đợt Quốc khánh 2/9 (15/07/2027)."],
    ['Điều 123: chưa thành niên, án 6 năm, bắt 01/03/2024, tính đến 10/01/2026', ev(E(D(1,3,2024),72,0,0,0,D(10,1,2026)),X({priority:true,arrival:D(15,3,2024)})), "✓ Đủ điều kiện xét giảm ánĐã đủ điều kiện về thời gian (1/4 mức án) và xếp loại: 7/2 quý Khá liên tục liền kề. Đề nghị xét giảm tại đợt 30/4-1/5/2026 (ngày xét 15/03/2026). Số quý xếp loại tính từ ngày đến trại 15/03/2024 theo Điều 21. Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Như trên nhưng không phải người chưa thành niên', ev(E(D(1,3,2024),72,0,0,0,D(10,1,2026)),X({arrival:D(15,3,2024)})), "Chưa đủ điều kiện xét giảmChưa đạt mốc thời gian 1/3 mức án (dự kiến đạt ngày 01/03/2026). Đợt xét sớm nhất có thể được đề nghị: 30/4 - 1/5 (15/03/2026)."],
    ['Khoản 7: kỳ giảm gần nhất 15/07/2026 (chưa tới đợt 2/9 năm sau)', ev(A6,X({arrival:ARR,k7:{on:true,value:D(15,7,2026).getTime(),label:'Quốc khánh 2/9 (ngày xét 15/07/2026)'}})), "◷ Đã được giảm án — chờ đợt tiếp theoKỳ giảm gần nhất: 2/9/2026 (ngày xét 15/07/2026). Dự kiến kỳ giảm tiếp theo vào đợt 2/9/2027 (ngày xét 15/07/2027), nếu bảo đảm đủ điều kiện xếp loại."],
    ['Khoản 7: giảm đợt 2/9/2025, ngày xét thực tế 20/07/2025; tính đến 01/06/2026 (Điều 12 TTLT 02/2021: cùng đợt năm sau)',
      ev(E(D(1,3,2022),72,0,0,0,D(1,6,2026)),X({arrival:ARR,k7:{on:true,value:D(15,7,2025).getTime(),label:'Quốc khánh 2/9 (ngày xét 15/07/2025)',date:D(20,7,2025)}})),
      "◷ Đã được giảm án — chờ đợt tiếp theoKỳ giảm gần nhất: 2/9/2025 (ngày xét 20/07/2025). Dự kiến kỳ giảm tiếp theo vào đợt 2/9/2026 (ngày xét 15/07/2026), nếu bảo đảm đủ điều kiện xếp loại."],
    ['Khoản 7: như trên, nhập ngày quyết định 28/08/2025 thay cho ngày xét',
      ev(E(D(1,3,2022),72,0,0,0,D(1,6,2026)),X({arrival:ARR,k7:{on:true,value:D(15,7,2025).getTime(),label:'Quốc khánh 2/9 (ngày xét 15/07/2025)',date:D(28,8,2025)}})),
      "◷ Đã được giảm án — chờ đợt tiếp theoKỳ giảm gần nhất: 2/9/2025 (ngày xét 28/08/2025). Dự kiến kỳ giảm tiếp theo vào đợt 2/9/2026 (ngày xét 15/07/2026), nếu bảo đảm đủ điều kiện xếp loại."],
    ['Khoản 7: kỳ giảm gần nhất 15/12/2024, các quý sau đó đều Khá', ev(A6,X({arrival:ARR,k7:{on:true,value:D(15,12,2024).getTime(),label:'Tết Nguyên Đán (ngày xét 15/12/2024)'}})), "✓ Đủ điều kiện xét giảm ánĐã đủ điều kiện về thời gian (1/3 mức án) và xếp loại: liên tục xếp loại Khá (7 quý kể từ kỳ giảm 15/12/2024). Đề nghị xét giảm tại đợt Tết Nguyên Đán 2027 (ngày xét 15/12/2026). Số quý xếp loại tính từ ngày đến trại 15/03/2022 theo Điều 21. Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Khoản 8: chưa chọn hình thức kỷ luật', ev(A6,X({arrival:ARR,k8:{on:true}})), "◷ Chờ thông tin Khoản 8Vui lòng chọn hình thức kỷ luật và nhập ngày công nhận đã cải tạo tiến bộ để đối chiếu."],
    ['Khoản 8: kỷ luật 10/01/2024, công nhận tiến bộ 20/03/2024 (cần 04 quý)', ev(A6,X({arrival:ARR,k8:{on:true,need:4,dec:D(10,1,2024),date:D(20,3,2024)}})), "✓ Đủ điều kiện xét giảm ánĐã được công nhận cải tạo tiến bộ ngày 20/03/2024 và có 8/4 quý liền kề xếp loại Khá trở lên theo Khoản 8. Đề nghị xét giảm tại đợt Tết Nguyên Đán 2027 (ngày xét 15/12/2026). Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Khoản 8: kỷ luật 10/01/2026, công nhận tiến bộ 20/03/2026 (cần 05 quý)', ev(A6,X({arrival:ARR,k8:{on:true,need:5,dec:D(10,1,2026),date:D(20,3,2026)}})), "◷ Chưa đủ điều kiện theo Khoản 8Sau khi được công nhận cải tạo tiến bộ ngày 20/03/2026, cần đủ 5 quý liền kề xếp loại Khá trở lên; hiện mới có 0 quý. Còn thiếu 5 quý. Nếu các quý tiếp theo đều đạt Khá trở lên, dự kiến đủ điều kiện đề nghị xét giảm vào đợt 30/4 - 1/5 (ngày xét 15/03/2028)."],
    ['Khoản 9: phạm tội mới ít nghiêm trọng (mốc 1/2)', ev(A6,X({arrival:ARR,k9:{on:true,type:9}})), "✓ Đủ điều kiện xét giảm ánĐã đủ điều kiện về thời gian (1/2 mức án) và xếp loại: 15/4 quý Khá liên tục liền kề. Đề nghị xét giảm tại đợt Tết Nguyên Đán 2027 (ngày xét 15/12/2026). Số quý xếp loại tính từ ngày đến trại 15/03/2022 theo Điều 21. Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Khoản 10: phạm tội mới nghiêm trọng (mốc 2/3)', ev(A6,X({arrival:ARR,k9:{on:true,type:10}})), "✓ Đủ điều kiện xét giảm ánĐã đủ điều kiện về thời gian (2/3 mức án) và xếp loại: 15/4 quý Khá liên tục liền kề. Đề nghị xét giảm tại đợt Tết Nguyên Đán 2027 (ngày xét 15/12/2026). Số quý xếp loại tính từ ngày đến trại 15/03/2022 theo Điều 21. Lưu ý đối chiếu thêm điều kiện về biến động và các quy định hiện hành."],
    ['Khoản 10: tù chung thân (mốc 25 năm)', ev(A6,X({arrival:ARR,k9:{on:true,type:10,life:true}})), "Chưa đủ điều kiện xét giảmChưa đạt mốc thời gian 25 năm mức án (dự kiến đạt ngày 01/03/2047). Đợt xét sớm nhất có thể được đề nghị: 30/4 - 1/5 (15/03/2047)."],
    ['Khoản 9, 10: chưa chọn loại tội phạm mới', ev(A6,X({arrival:ARR,k9:{on:true}})), "◷ Chờ thông tin Khoản 9, 10Vui lòng chọn loại tội phạm mới để xác định mốc thời gian phải chấp hành."],
    ['Đã chọn kỳ giảm ở form, chưa nhập ngày đến trại', ev(A6,X({picked:{value:String(D(15,12,2024).getTime()),label:'Tết Nguyên Đán (ngày xét 15/12/2024)'}})), "◷ Đã được giảm ánĐã được giảm án đợt Tết Nguyên Đán (ngày xét 15/12/2024). Vui lòng nhập các thông tin bên dưới để tra cứu đợt giảm tiếp theo."],
    ['Tự xác định 02 kỳ giảm đã xét (án 6 năm, các quý đều Khá)', ()=>detectReductionSeries(A6,X({arrival:ARR}),2).map(r=>r.name+' '+fmtDate(r.date)).join(' → '), "30/4 - 1/5 15/03/2024 → 30/4 - 1/5 15/03/2025"]
  ];
}

window.addEventListener('load',()=>{
  loadDefaultCalcMode();
  // arrestDay/Month/Year: để trống, placeholder 'Ngày'/'Tháng'/'Năm' hiển thị mờ
  // refDate: để trống, người dùng nhập khi cần dùng chế độ ngày giả định
  syncCalcModeButtons();
  addRemission();
  renderHistory();
  renderProfiles();
});
