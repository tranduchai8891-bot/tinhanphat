// ===== ĐƠN VỊ CHUẨN NỘI BỘ: THÁNG (không quy đổi ngày cố định 360/30) =====
function toMonths(y,m){return y*12+m}

// Cộng N tháng vào 1 ngày, "kẹp" vào ngày cuối tháng đích nếu ngày gốc vượt quá
// (vd 31/07 + 11 tháng -> phải ra 30/06, không tràn qua 01/07)
function addMonthsClamped(date, totalMonths){
  const d=new Date(date);
  const targetMonth=d.getMonth()+totalMonths;
  const targetYear=d.getFullYear()+Math.floor(targetMonth/12);
  const normMonth=((targetMonth%12)+12)%12;
  const originalDay=d.getDate();
  const lastDayOfTargetMonth=new Date(targetYear,normMonth+1,0).getDate();
  const day=Math.min(originalDay,lastDayOfTargetMonth);
  return new Date(targetYear,normMonth,day);
}

// Cộng/trừ số ngày lẻ của mức án/tạm giam theo quy ước nghiệp vụ đã kiểm chứng.
// Khi CỘNG (extraDays > 0):
//   - Gọi tổng = ngày gốc + số ngày lẻ.
//   - Nếu tổng <= 31: kẹp về ngày cuối tháng đích (vd 11+20=31 ở tháng 2 -> 28/29; ở tháng 4 -> 30).
//     Phần ngày lẻ cộng vào không vượt quá ngày 31, nên không nhảy sang tháng sau.
//   - Nếu tổng > 31: tràn sang tháng sau theo quy ước 30 ngày/tháng (vd 27+15=42 -> 12 của tháng kế).
// Khi TRỪ (extraDays < 0): mượn theo quy ước 30 ngày/tháng (dùng cho trừ tạm giam).
function addExtraDaysFixed30(date, extraDays){
  if(extraDays===0)return new Date(date);
  let month=date.getMonth();
  let year=date.getFullYear();
  if(extraDays>0){
    const total=date.getDate()+extraDays;
    if(total<=31){
      const lastDayOfMonth=new Date(year,month+1,0).getDate();
      return new Date(year,month,Math.min(total,lastDayOfMonth)); // kẹp về cuối tháng
    }
    // tổng > 31: tràn theo quy ước 30 ngày/tháng
    let day=total;
    while(day>30){day-=30;month+=1;if(month>11){month=0;year+=1}}
    return new Date(year,month,day);
  }
  // extraDays < 0: mượn 30 ngày/tháng
  let day=date.getDate()+extraDays;
  while(day<1){month-=1;if(month<0){month=11;year-=1}day+=30}
  return new Date(year,month,day);
}

// Cộng phần NGÀY LẺ vào NGÀY HẾT ÁN (dùng cho cả 2 chế độ).
// monthBase = kết quả addMonthsClamped (có thể đã bị KẸP về ngày cuối tháng đích),
// arrestDay = ngày bắt thực tế.
// - Ngày bắt KHÔNG bị kẹp, hoặc không có ngày lẻ -> giữ nguyên cách tính cũ của từng chế độ.
// - Ngày bắt BỊ KẸP và có ngày lẻ (cả 2 chế độ cho cùng kết quả):
//   (a) Tháng đích là THÁNG 2 (ngày bắt 29/30/31): lấy NGÀY CUỐI THÁNG 2 làm mốc,
//       ngày lẻ đếm tiếp sang tháng 3.
//       VD: bắt 31/01/2023, còn 1 tháng 15 ngày -> 28/02/2023 + 15 ngày = 15/03/2023.
//   (b) Tháng đích có 30 ngày (ngày bắt 31): GIỮ NGUYÊN ngày 31, tức tương đương mùng 1
//       tháng sau, rồi cộng ngày lẻ.
//       VD: bắt 31/07/2026, còn 1 năm 11 tháng 10 ngày -> 31 + 10 = 41 -> 11/07/2028.
function addReleaseExtraDays(monthBase, arrestDay, extraDays, mode){
  const isReal=(mode==='thuc');
  const clamped=monthBase.getDate()<arrestDay;
  if(!clamped || extraDays<=0){
    return isReal ? addDaysReal(monthBase, extraDays)        // cách cũ - lịch thực
                  : addExtraDaysFixed30(monthBase, extraDays); // cách cũ - QLPN (30 ngày)
  }
  let year=monthBase.getFullYear(), month=monthBase.getMonth(), day;
  if(month===1){
    // (a) Tháng 2: mốc = ngày cuối tháng 2 ("mùng 0" tháng 3)
    if(isReal) return addDaysReal(monthBase, extraDays);   // monthBase đang là ngày cuối tháng 2
    month=2; day=extraDays;
    if(day<=31) return new Date(year,month,day);            // tháng 3 có 31 ngày
  }else{
    // (b) Tháng 30 ngày, ngày bắt 31: ngày 31 tràn thành mùng 1 tháng sau
    if(isReal) return addDaysReal(new Date(year,month,arrestDay), extraDays);
    day=arrestDay+extraDays;                                // luôn > 31
  }
  while(day>30){day-=30;month+=1;if(month>11){month=0;year+=1}} // tràn theo quy ước 30 ngày
  return new Date(year,month,day);
}

function fmtDays(months,days){
  months=months||0; days=days||0;
  if(months<=0&&days<=0)return'0 ngày';
  // Quy đổi để hiển thị gọn: 30 ngày = 01 tháng, 12 tháng = 01 năm
  let totalMonths=months+Math.floor(days/30);
  let d=days%30;
  const y=Math.floor(totalMonths/12), m=totalMonths%12;
  let p=[];
  if(y)p.push(y+' năm');
  if(m)p.push(m+' tháng');
  if(d)p.push(d+' ngày');
  return p.length?p.join(' '):'0 ngày';
}

// Luôn hiển thị đủ 3 đơn vị (năm/tháng/ngày) theo lịch thực, cho phần "còn lại"
function fmtDaysFull(diffObj){
  return diffObj.years+' năm '+diffObj.months+' tháng '+diffObj.days+' ngày';
}

function fmtDate(d){return d.toLocaleDateString('vi-VN',{day:'2-digit',month:'2-digit',year:'numeric'})}

// Khoảng cách giữa 2 ngày theo cách: lấy (ngày đích - ngày hiện tại), nếu âm thì bù 30 ngày cố định
// và trừ 1 tháng; lấy (tháng đích - tháng hiện tại), nếu âm thì bù 12 tháng và trừ 1 năm.
function calendarDiffMinus1(from,to){
  let y=to.getFullYear()-from.getFullYear();
  let m=to.getMonth()-from.getMonth();
  let d=to.getDate()-from.getDate();
  if(d<0){
    d+=30;
    m-=1;
  }
  if(m<0){
    m+=12;
    y-=1;
  }
  if(y<0||m<0||d<0)return{years:0,months:0,days:0};
  return {years:y,months:m,days:d};
}

// "Thời gian đã chấp hành" tính theo lịch thực, KHÔNG cộng thêm ngày bắt.
// QUY TẮC 1 (ngày cuối tháng): nếu ngày bắt là NGÀY CUỐI THÁNG (28/2, 30/4, 31/5, 31/12...),
// coi nó tương đương "mốc 0" của tháng kế tiếp, để phần ngày = đúng số ngày của mốc đích.
// QUY TẮC 2 (mượn ngày): khi phần ngày bị âm (phải mượn):
//   - Nếu ngày tính đến (to) đúng là NGÀY 01 của tháng liền kề ngay sau tháng của ngày bắt,
//     đếm số ngày THEO THỰC TẾ (lịch thật) từ ngày bắt đến mốc đó.
//     Ví dụ: 20/2/2026 -> 1/3/2026 = 9 ngày (28-20+1, vì tháng 2/2026 có 28 ngày).
//   - Các trường hợp còn lại, mượn theo quy ước 1 tháng = 30 ngày cố định.
//     Ví dụ: 20/2/2026 -> 2/3/2026 = 12 ngày ((30-20)+2).
// Đã đối chiếu khớp với cách tính nghiệp vụ qua các ví dụ chuẩn:
//   31/5/2026  -> 15/6/2026 = 15 ngày
//   28/2/2026  -> 15/6/2026 = 3 tháng 15 ngày
//   07/5/2024  -> 25/6/2026 = 2 năm 1 tháng 18 ngày
//   31/12/2024 -> 25/6/2026 = 1 năm 5 tháng 25 ngày
//   20/2/2026  -> 01/3/2026 = 9 ngày (thực tế)
//   20/2/2026  -> 02/3/2026 = 12 ngày (quy ước 30 ngày)
function calcServedTime(from,to){
  if(to<from)return{years:0,months:0,days:0};

  let fromDay=from.getDate();
  let fromMonth=from.getMonth();
  let fromYear=from.getFullYear();

  // Kiểm tra ngày bắt có phải ngày cuối tháng không (hôm sau là mùng 1)
  const next=new Date(from);
  next.setDate(next.getDate()+1);
  const isLastDay=next.getDate()===1;
  if(isLastDay){
    fromDay=0;            // coi như mốc 0
    fromMonth+=1;         // của tháng kế tiếp
    if(fromMonth>11){fromMonth=0;fromYear+=1;}
  }

  let y=to.getFullYear()-fromYear;
  let m=to.getMonth()-fromMonth;
  let d=to.getDate()-fromDay;
  if(d<0){
    // Ngày tính đến đúng là mùng 1 của tháng liền kề sau tháng ngày bắt -> đếm thực tế
    const isNextMonthDay1 = !isLastDay && to.getDate()===1 &&
      (to.getFullYear()*12+to.getMonth())===(fromYear*12+fromMonth+1);
    if(isNextMonthDay1){
      const daysInFromMonth=new Date(fromYear,fromMonth+1,0).getDate();
      d = daysInFromMonth - fromDay + to.getDate();
    }else{
      d += 30; // quy ước 1 tháng = 30 ngày cho các trường hợp còn lại
    }
    m-=1;
  }
  if(m<0){
    m+=12;
    y-=1;
  }
  if(y<0||m<0||d<0)return{years:0,months:0,days:0};
  return {years:y,months:m,days:d};
}

// Cộng 2 bộ (năm,tháng,ngày) theo quy ước 1 tháng = 30 ngày, 1 năm = 12 tháng
function addYMD(a,b){
  let totalDays=a.days+b.days;
  let totalMonths=a.months+b.months;
  let totalYears=a.years+b.years;
  if(totalDays>=30){
    totalMonths+=Math.floor(totalDays/30);
    totalDays=totalDays%30;
  }
  if(totalMonths>=12){
    totalYears+=Math.floor(totalMonths/12);
    totalMonths=totalMonths%12;
  }
  return {years:totalYears,months:totalMonths,days:totalDays};
}
