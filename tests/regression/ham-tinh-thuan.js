// Phần A: băm kết quả các hàm tính thuần trên hàng triệu đầu vào (chạy trong trang)
module.exports = function pureDigest(){
  const out={};
  function mul(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  const iso=d=>d instanceof Date?(isNaN(d)?'NaN':d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()):String(d);
  function H(name){let h=0x811c9dc5,n=0,samples=[];return{add(s){s=String(s);for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)}h^=10;h=Math.imul(h,16777619);if(samples.length<6)samples.push(s);n++},done(){out[name]={hash:(h>>>0).toString(16),n,samples}}}}
  const days=[];for(let d=new Date(2018,0,1);d<=new Date(2031,11,31);d.setDate(d.getDate()+1))days.push(new Date(d));
  const R=mul(20261024), ri=n=>Math.floor(R()*n);
  const has=f=>typeof window[f]==='function';
  // calcRelease
  {const h=H('calcRelease');for(const a of days)for(let k=0;k<120;k++){const sm=ri(361),sd=ri(30),dm=ri(Math.max(1,sm+2)),dd=ri(4)?ri(30):ri(200);for(const md of ['qlpn','thuc'])h.add([iso(a),sm,sd,dm,dd,md,iso(calcRelease(a,sm,sd,dm,dd,md))].join(','))}h.done()}
  {const h=H('calcMilestoneDate');for(const a of days)for(let k=0;k<40;k++){const sm=ri(361),sd=ri(30),pm=ri(4)?0:ri(Math.max(1,Math.floor(sm/2))),pd=ri(3)?ri(30):ri(120);for(const dv of [2,3,4])h.add([iso(a),sm,sd,dv,pm,pd,iso(calcMilestoneDate(a,sm,sd,dv,pm,pd))].join(','))}h.done()}
  {const h=H('calcOneThirdDate');for(const a of days)for(let k=0;k<10;k++){const sm=ri(361),sd=ri(30),pm=ri(12),pd=ri(60);h.add([iso(a),sm,sd,pm,pd,iso(calcOneThirdDate(a,sm,sd,pm,pd)),iso(calcOneThirdDate(a,sm,sd,pm,pd,4))].join(','))}h.done()}
  {const h=H('calcFractionMilestone');for(const a of days)for(let k=0;k<20;k++){const sm=ri(361),sd=ri(30),pm=ri(24),pd=ri(90);h.add([iso(a),sm,sd,pm,pd,iso(calcFractionMilestone(a,sm,sd,1,2,pm,pd)),iso(calcFractionMilestone(a,sm,sd,2,3,pm,pd)),iso(calcFractionMilestone(a,300,0,1,1,pm,pd))].join(','))}h.done()}
  {const h=H('calcServedTime');for(const a of days)for(let k=0;k<60;k++){const b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(k<10?70:9000)-(k%15===0?40:0));h.add([iso(a),iso(b),JSON.stringify(calcServedTime(a,b))].join(','))}h.done()}
  {const h=H('calendarDiffMinus1');for(const a of days)for(let k=0;k<40;k++){const b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(k<10?70:9000)-(k%15===0?40:0));h.add([iso(a),iso(b),JSON.stringify(calendarDiffMinus1(a,b))].join(','))}h.done()}
  {const h=H('addMonthsClamped');for(const a of days)for(let k=0;k<20;k++){const m=ri(400)-(k%7===0?30:0);h.add([iso(a),m,iso(addMonthsClamped(a,m))].join(','))}h.done()}
  {const h=H('addExtraDaysFixed30');for(const a of days)for(let k=0;k<20;k++){const x=ri(120)-40;h.add([iso(a),x,iso(addExtraDaysFixed30(a,x))].join(','))}h.done()}
  {const h=H('addYMD');for(let k=0;k<200000;k++){const A={years:ri(40),months:ri(13),days:ri(35)},B={years:ri(10),months:ri(30),days:ri(400)};h.add(JSON.stringify([A,B,addYMD(A,B)]))}h.done()}
  {const h=H('fmtDays');for(let m=0;m<500;m++)for(let d=0;d<400;d+=(d<40?1:7))h.add([m,d,fmtDays(m,d),fmtDays(m),fmtDays(0,d)].join(','));h.add(fmtDays());h.add(fmtDaysFull({years:1,months:2,days:3}));h.done()}
  {const h=H('completedQuarters');for(const a of days)for(let k=0;k<6;k++){const b=new Date(a.getFullYear(),a.getMonth(),a.getDate()+ri(2500)-(k===0?20:0));h.add([iso(a),iso(b),completedQuarters(a,b).map(q=>q.key+'@'+iso(q.end)+'@'+q.label).join(';')].join(','))}h.add(JSON.stringify(completedQuarters(null,new Date())));h.done()}
  {const h=H('monthGraded');for(const a of days)for(let k=0;k<3;k++){const y=a.getFullYear()+ri(2),m=1+ri(12);h.add([iso(a),y,m,monthGraded(a,y,m)].join(','))}h.done()}
  {const h=H('findEligibleReview');for(const a of days){const r=findEligibleReview(a);h.add([iso(a),r&&r.name,r&&iso(r.date),r&&r.year].join(','))}h.done()}
  {const h=H('crimeClass_grade');for(let m=0;m<=420;m++)for(let d=0;d<30;d+=3){const c=crimeClass(m,d);h.add([m,d,JSON.stringify(c),JSON.stringify(gradeRequirement(m)),JSON.stringify(gradeRequirementPriority(m)),formatYearMonth(m)].join('|'))}h.done()}
  {const h=H('reviewLabels');for(const a of days){h.add([iso(a),guessReviewName(a),shortReviewLabel('Tết Nguyên Đán',a),shortReviewLabel('Quốc khánh 2/9',a),shortReviewLabel('30/4 - 1/5',a),shortReviewLabel('Khác',a)].join('|'))}h.done()}
  {const h=H('addQuarters');for(const a of days)for(let n=0;n<8;n++)h.add([iso(a),n,iso(addQuarters(a,n))].join(','));h.done()}
  {const h=H('parseVnDate');const S=['31/7/2026','01/01/2025','1/1/25','29/02/2023','29/02/2024',' 05/06/2027 ','','abc','32/13/2026','00/00/0000','5/5/2026x'];for(const s of S)h.add(s+'='+iso(parseVnDate(s)));for(let k=0;k<20000;k++){const s=(1+ri(31))+'/'+(1+ri(12))+'/'+(1990+ri(60));h.add(s+'='+iso(parseVnDate(s)))}h.done()}
  if(has('parseYMDText')){const h=H('parseYMDText');const S=['2 năm 2 tháng 20 ngày','0 ngày','5 tháng','1 năm','3 ngày','Chung thân','','2 năm abc','10 năm 0 tháng 0 ngày',null,undefined,' 7 tháng 3 ngày '];for(const s of S)h.add(String(s)+'='+JSON.stringify(parseYMDText(s)));for(let k=0;k<20000;k++){const s=fmtDays(ri(400),ri(60));h.add(s+'='+JSON.stringify(parseYMDText(s)))}h.done()}
  if(has('liveProfileValues')){const h=H('liveProfileValues');for(let k=0;k<60000;k++){const a=days[ri(days.length)],t=days[ri(days.length)];const sm=ri(361),sd=ri(30),pm=ri(30),pd=ri(90),rm=ri(5)?ri(40):0;
    const p={arrestDate:fmtDate(a),sentence:fmtDays(sm,sd),preDet:fmtDays(pm,pd),remission:fmtDays(rm,0),release:ri(2)?fmtDate(calcRelease(a,sm,sd,pm+rm,pd,ri(2)?'qlpn':'thuc')):'x',calcMode:ri(3)?undefined:(ri(2)?'qlpn':'thuc')};
    for(const def of ['qlpn','thuc']){CALC_MODE_DEFAULT=def;h.add(JSON.stringify([p,def,iso(t),liveProfileValues(p,t)]))}}
    CALC_MODE_DEFAULT='qlpn';h.done()}
  return out;
};
