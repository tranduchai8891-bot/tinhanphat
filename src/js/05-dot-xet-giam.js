// ===== CÁC ĐỢT XÉT GIẢM ÁN TRONG NĂM (xem QUY_DINH.dotXet) =====
const REVIEW_DATES=QUY_DINH.dotXet;

// Mốc theo tỉ lệ bất kỳ num/den của mức án (VD 1/2, 2/3 mức hình phạt chung - Khoản 9, 10),
// có trừ tạm giam; quy ước 1 tháng = 30 ngày, phần ngày làm tròn LÊN.
function calcFractionMilestone(arrestDate,totalMonths,extraDays,num,den,preDetMonths,preDetExtraDays){
  const totalDays=totalMonths*30+(extraDays||0);
  const portion=Math.ceil(totalDays*num/den);
  let monthsResult=Math.floor(portion/30), daysResult=portion%30;
  const pdM=preDetMonths||0, pdDraw=preDetExtraDays||0;
  if(pdM>0||pdDraw>0){
    monthsResult-=(pdM+Math.floor(pdDraw/30));
    daysResult-=(pdDraw%30);
    while(daysResult<0){daysResult+=30;monthsResult-=1;}
    if(monthsResult<0){monthsResult=0;daysResult=0;}
  }
  let r=addMonthsClamped(arrestDate,monthsResult);
  r=addExtraDaysFixed30(r,daysResult);
  return r;
}

// Mốc 1/3 (mặc định) hoặc 1/divisor mức án, có trừ tạm giam
function calcOneThirdDate(arrestDate,sentMonths,sentExtraDays,preDetMonths,preDetExtraDays,divisor){
  const div=divisor||QUY_DINH.mocThuong;
  // Tạm giam được trừ ngay trong calcMilestoneDate (đơn vị tháng/ngày, quy ước 30 ngày)
  return calcMilestoneDate(arrestDate,sentMonths,sentExtraDays,div,preDetMonths,preDetExtraDays);
}

// Dòng thông báo phía trên nút "Tra cứu giảm án"
function setEligibleText(oneThirdDate,eligibleReview,today){
  const el=document.getElementById('eligibleText');
  if(!el)return;
  if(pickedReduction&&pickedReduction.value){
    const lastRed=new Date(parseInt(pickedReduction.value));
    el.innerHTML='Đã được giảm án <b>đợt '+escHtml(pickedReduction.label.replace(/\s*\(ngày xét.*\)$/,''))
      +'</b> (ngày xét '+fmtDate(lastRed)+').';
    return;
  }
  if(eligibleReview){
    el.innerHTML='Đạt mốc 1/3 vào <b>'+fmtDate(oneThirdDate)+'</b>. Thời gian chấp hành đủ điều kiện xét giảm án <b>đợt '
      +eligibleReview.name+'</b> (ngày xét '+fmtDate(eligibleReview.date)+').';
  }else{
    el.innerHTML='Chưa xác định được đợt giảm án phù hợp.';
  }
}

// Đợt xét đầu tiên có ngày xét ĐÚNG hoặc SAU ngày đạt mốc
function findEligibleReview(oneThirdDate){
  // Duyệt từ năm của oneThirdDate, tìm ngày xét đầu tiên >= oneThirdDate
  const startYear=oneThirdDate.getFullYear();
  for(let y=startYear;y<=startYear+2;y++){
    for(const r of REVIEW_DATES){
      const reviewDate=new Date(y,r.reviewMonth-1,r.reviewDay);
      if(reviewDate>=oneThirdDate){
        return {name:r.name, date:reviewDate, year:y};
      }
    }
  }
  return null;
}

// Định dạng số tháng -> "X năm Y tháng"
function formatYearMonth(months){
  const y=Math.floor(months/12), m=months%12;
  let p=[];
  if(y)p.push(y+' năm');
  if(m)p.push(m+' tháng');
  return p.length?p.join(' '):'0 tháng';
}
