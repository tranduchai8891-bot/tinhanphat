// ===== CÁC ĐỢT XÉT GIẢM ÁN TRONG NĂM (xem QUY_DINH.dotXet) =====
const REVIEW_DATES=QUY_DINH.dotXet;

// Quy một ngày bất kỳ (ngày xét thực tế, ngày quyết định giảm...) về ĐỢT xét giảm tương ứng (xem tuThang ở QUY_DINH).
// Trả về {name, date}: date = ngày xét cố định của đợt đó. Ví dụ: 20/07/2025 -> Quốc khánh 2/9, ngày xét 15/07/2025;
// 10/02/2026 -> Tết Nguyên Đán (Tết 2026), ngày xét 15/12/2025.
function reviewRoundOf(d){
  const m=d.getMonth()+1, list=REVIEW_DATES.slice().sort((a,b)=>a.tuThang-b.tuThang);
  let r=null, y=d.getFullYear();
  for(const x of list)if(m>=x.tuThang)r=x;
  if(!r){r=list[list.length-1];y--;}          // đầu năm (trước tuThang nhỏ nhất): thuộc đợt cuối của năm trước (Tết)
  return {name:r.name,date:new Date(y,r.reviewMonth-1,r.reviewDay)};
}
// Khoản 7 — Điều 12 Thông tư liên tịch 02/2021/TTLT-TANDTC-VKSNDTC-BCA-BQP: mỗi năm chỉ được xét giảm tối đa 01 lần.
// Đã được giảm ở đợt nào thì đợt SỚM NHẤT được xét tiếp là cùng đợt đó của năm sau (khi đủ điều kiện xếp loại,
// chấp hành kỷ luật theo Điều 5 Nghị quyết 03/2024/NQ-HĐTP), không cần đủ tròn 12 tháng giữa 2 ngày xét.
// Ví dụ: giảm đợt 2/9/2025 (ngày xét thực tế 20/07/2025) -> sớm nhất đợt 2/9/2026 (ngày xét 15/07/2026).
function k7EarliestNext(lastRed){
  const r=reviewRoundOf(lastRed).date;
  return new Date(r.getFullYear()+QUY_DINH.khoan7.cachNam,r.getMonth(),r.getDate());
}

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
