// ===== CHẾ ĐỘ TÍNH NGÀY LẺ =====
// 'qlpn'  : quy ước 30 ngày = 1 tháng (giống phần mềm QLPN - C10)  [MẶC ĐỊNH]
// 'thuc'  : cộng ngày lẻ theo lịch thực tế (tháng 28/29/30/31 ngày)
let CALC_MODE='qlpn';

// Cộng/trừ ngày theo LỊCH THỰC
function addDaysReal(date, days){
  const d=new Date(date);
  d.setDate(d.getDate()+days);
  return d;
}

// Ngày hết án: TRỪ THẲNG thời gian được trừ (tạm giam + giảm án) vào mức án theo đơn vị
// (tháng, ngày), quy ước 1 tháng = 30 ngày cho phần ngày lẻ, RỒI cộng phần còn lại vào ngày bắt.
//   - Mức án: sentMonths tháng + sentExtraDays ngày lẻ.
//   - Được trừ: deductMonths tháng + deductExtraDays ngày lẻ (tạm giam có ngày lẻ; giảm án chỉ có tháng).
//   - Phần được trừ chuẩn hóa 30 ngày -> 1 tháng; khi trừ ngày không đủ thì mượn 30 ngày/tháng.
function calcRelease(arrestDate,sentMonths,sentExtraDays,deductMonths,deductExtraDays,mode){
  const m=mode||CALC_MODE;

  // ===== BƯỚC 1: Trừ tạm giam/tạm giữ + giảm án THẲNG VÀO MỨC ÁN =====
  // Áp dụng quy ước 01 tháng = 30 ngày cho CẢ HAI chế độ.
  // VD: án 5 tháng, trừ 9 ngày tạm giữ -> còn 4 tháng 21 ngày.
  let dM=deductMonths+Math.floor(deductExtraDays/30);
  let dD=deductExtraDays%30;

  let remMonths=sentMonths-dM;
  let remDays=sentExtraDays-dD;
  while(remDays<0){remDays+=30;remMonths-=1;}   // mượn 30 ngày = 1 tháng
  if(remMonths<0){remMonths=0;remDays=0;}        // an toàn: không âm

  // ===== BƯỚC 2: Cộng thời gian còn phải chấp hành vào ngày bắt =====
  // Đây là chỗ DUY NHẤT hai chế độ khác nhau: cách cộng phần NGÀY LẺ.
  let r=addMonthsClamped(arrestDate,remMonths);
  //   - 'thuc': theo lịch thực (tháng 28/29/30/31 ngày)
  //   - 'qlpn': quy ước 30 ngày/tháng (QLPN - C10)
  //   Ngày bắt bị kẹp ở tháng đích (29/30/31) được xử lý riêng trong addReleaseExtraDays.
  r = addReleaseExtraDays(r,arrestDate.getDate(),remDays,m);
  return r;
}

// Ngày đạt mốc 1/divisor của mức án ban đầu (1/3 theo Điều 5; 1/4 cho người chưa thành niên).
// Tạm giam được tính là ĐÃ chấp hành nên được TRỪ: mốc = ngày bắt + (mức án ÷ divisor − tạm giam).
//   - Tháng chia hết cho divisor: tháng = tháng/divisor, ngày = ceil(ngày lẻ/divisor).
//   - Không chia hết: lấy bội số lớn nhất ≤ số tháng, phần tháng dư đổi 30 ngày/tháng cộng vào
//     ngày lẻ rồi ngày = ceil(tổng/divisor).
//   - Khi trừ tạm giam, ngày không đủ thì mượn 30 ngày/tháng.
function calcMilestoneDate(arrestDate,totalMonths,extraDays,divisor,preDetMonths,preDetExtraDays){
  let monthsResult,daysResult;
  if(totalMonths%divisor===0){
    monthsResult=totalMonths/divisor;
    daysResult=extraDays===0?0:Math.ceil(extraDays/divisor);
  } else {
    const monthsForDivisor=Math.floor(totalMonths/divisor)*divisor;
    monthsResult=monthsForDivisor/divisor;
    const borrowedMonths=totalMonths-monthsForDivisor;
    const totalDaysToSplit=borrowedMonths*30+extraDays;
    daysResult=Math.ceil(totalDaysToSplit/divisor);
  }
  // Trừ thời gian tạm giam (nếu có) theo đơn vị tháng + ngày, quy ước 30 ngày/tháng
  const pdM=preDetMonths||0, pdDraw=preDetExtraDays||0;
  if(pdM>0||pdDraw>0){
    let dM=pdM+Math.floor(pdDraw/30);
    let dD=pdDraw%30;
    monthsResult-=dM;
    daysResult-=dD;
    while(daysResult<0){daysResult+=30;monthsResult-=1;}
    if(monthsResult<0){monthsResult=0;daysResult=0;}
  }
  let r=addMonthsClamped(arrestDate,monthsResult);
  r=addExtraDaysFixed30(r,daysResult);
  return r;
}
