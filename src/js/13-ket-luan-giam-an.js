// ===== KẾT LUẬN XÉT GIẢM ÁN =====
// Tách khỏi giao diện để kiểm thử được:
//   readRemissionInputs() : đọc mọi thông tin đang nhập trên trang Tra cứu giảm án
//   evaluateRemission()   : tính kết luận (thuần, không đụng giao diện)
//   updateConclusion()    : hiển thị kết luận lên trang
// e : {arrestDate, today, sentMonths, sentExtraDays, preDetMonths, preDetDays, oneThirdDate}
// x : {priority, penalty, arrival, grades, picked,
//      k7:{on, value, label, date}, k8:{on, need, date, dec}, k9:{on, type, life}}
function readRemissionInputs(){
  const $=id=>document.getElementById(id);
  const on=id=>!!($(id)&&$(id).checked);
  const btnVal=id=>{const b=$(id);return b&&b.dataset.value?parseInt(b.dataset.value):0;};
  const k7b=$('rmK7Btn');
  return {
    priority:on('rmPriority'),
    penalty:parseInt(($('rmPenaltyCount')||{}).value)||0,
    arrival:getArrivalDate(),
    grades:quarterGrades,
    picked:pickedReduction,
    // Chưa chọn đợt (nút còn chữ "— Chọn kỳ giảm —") thì không lấy chữ trên nút làm tên đợt
    k7:{on:on('rmK7'), value:btnVal('rmK7Btn'), label:(k7b&&k7b.dataset.value&&k7b.textContent)||'', date:getRmK7Date()},
    k8:{on:on('rmK8'), need:btnVal('rmK8Btn'), date:getK8Date(), dec:getK8DecDate()},
    k9:{on:on('rmK9'), type:btnVal('rmK9Btn'), life:on('rmK9Life')}
  };
}
// Yêu cầu số quý theo mức án (+ Khoản 4 nếu người chưa thành niên) và số quý cộng thêm do tiền án (Khoản 6)
function remissionRequirement(sentMonths,priority,penalty){
  const base=priority?gradeRequirementPriority(sentMonths):gradeRequirement(sentMonths);
  const t=QUY_DINH.tienAn;
  const per=(sentMonths<=t.nguongThang)?t.quyAnNho:t.quyAnLon;
  return {base, extra:(penalty||0)*per};
}
// Xếp loại thực tế từng quý trên trang giảm án: chọn tay + tự xếp theo Điều 25, 26
function remissionGradeFn(e,x){
  const auto=autoGrades({arrival:x.arrival, today:e.today, k8on:x.k8.on,
    k8dec:x.k8.on?x.k8.dec:null, k8ok:x.k8.on?x.k8.date:null, k9on:x.k9.on});
  return key=>effectiveGrade(key,x.grades||{},auto);
}
// Mốc thời gian phải chấp hành: Khoản 9, 10 > người chưa thành niên (Điều 123) > thông thường
function remissionMilestone(e,x){
  const Q=QUY_DINH, k9Type=x.k9.on?x.k9.type:0;
  const frac=(n,d)=>escShift(calcFractionMilestone(e.arrestDate,e.sentMonths,e.sentExtraDays,n,d,e.preDetMonths,e.preDetDays),e.esc);
  if(k9Type===9)return {date:frac(Q.mocKhoan9[0],Q.mocKhoan9[1]), txt:Q.mocKhoan9.join('/')};
  if(k9Type===10){
    if(x.k9.life)return {date:escShift(calcFractionMilestone(e.arrestDate,Q.mocChungThanThang,0,1,1,e.preDetMonths,e.preDetDays),e.esc),
                         txt:(Q.mocChungThanThang/12)+' năm', life:true};
    return {date:frac(Q.mocKhoan10[0],Q.mocKhoan10[1]), txt:Q.mocKhoan10.join('/')};
  }
  if(x.priority)return {date:escShift(calcOneThirdDate(e.arrestDate,e.sentMonths,e.sentExtraDays,e.preDetMonths,e.preDetDays,Q.mocChuaThanhNien),e.esc),
                        txt:'1/'+Q.mocChuaThanhNien};
  return {date:e.oneThirdDate, txt:'1/'+Q.mocThuong};
}

// Trả về {cls, html, hints:{k9, arrival, k8, k7}, arrivalInvalid, arrivalChecked}
// (hint nào không có trong kết quả thì giữ nguyên trên màn hình)
function evaluateRemission(e,x){
  const Q=QUY_DINH, hints={};
  const out=(cls,html,more)=>Object.assign({cls:'rm-conclusion '+cls, html, hints},more||{});
  const done=(cls,html)=>out(cls,html,{arrivalChecked:true});
  const good=g=>g==='Tot'||g==='Kha';
  const years=e.sentMonths/12;
  const {base,extra}=remissionRequirement(e.sentMonths,x.priority,x.penalty);
  const gradeFn=remissionGradeFn(e,x);
  const arrival=x.arrival;
  const qList=arrival?completedQuarters(arrival,e.today):[];
  const qStat=gradeStats(qList,gradeFn), qTotal=qStat.total, qAdj=qStat.adj;

  // ----- Khoản 9, 10: phạm tội mới -> nâng mốc thời gian -----
  const isK9=x.k9.on, k9Type=isK9?x.k9.type:0;
  const ms=remissionMilestone(e,x), milestone=ms.date, fracTxt=ms.txt;
  const review=findEligibleReview(milestone);
  const timeOK=!(milestone&&e.today&&milestone.getTime()>e.today.getTime());
  if(isK9&&!k9Type){
    hints.k9='';
    return out('pending','<span class="rc-head">◷ Chờ thông tin Khoản 9, 10</span>'
      +'Vui lòng chọn <b>loại tội phạm mới</b> để xác định mốc thời gian phải chấp hành.');
  }
  if(isK9){
    hints.k9='Áp dụng <b>Khoản '+k9Type+'</b>: phải chấp hành ít nhất <b>'+fracTxt
      +(ms.life?'':' mức hình phạt chung')+'</b> — đạt mốc ngày <b>'+fmtDate(milestone)
      +'</b>. Vẫn phải đủ điều kiện xếp loại (điểm b, c, d khoản 1) và Khoản 6.';
  }

  // ----- Ngày đến trại không được trước ngày bắt -----
  if(arrival&&e.arrestDate&&arrival.getTime()<e.arrestDate.getTime()){
    hints.arrival='<b style="color:#8a1c1c">Ngày đến trại không hợp lệ</b> — phải từ ngày bắt ('
      +fmtDate(e.arrestDate)+') trở đi.';
    return out('no','<span class="rc-head">Ngày đến trại không hợp lệ</span>'
      +'Ngày đến trại không thể trước ngày bắt (<b>'+fmtDate(e.arrestDate)+'</b>). Vui lòng nhập lại để tiếp tục đối chiếu.',
      {arrivalInvalid:true});
  }
  hints.arrival='';
  const availQ=qList.length;
  // Đợt xét đầu tiên (chưa diễn ra) mà tại thời điểm đó đã có đủ số quý Khá LIÊN TỤC liền kề
  // (chỉ tính các quý đã kết thúc trước ngày xét)
  const reviewWithQuarters=(need,minDate)=>{
    if(!arrival||!need)return null;
    let y=milestone.getFullYear(), found=null;
    for(let k=0;k<40&&!found;k++){
      for(const r of REVIEW_DATES){
        const rd=new Date(y,r.reviewMonth-1,r.reviewDay);
        if(rd<milestone)continue;
        if(rd<e.today)continue;                   // bỏ qua các đợt ĐÃ DIỄN RA
        if(minDate&&rd<minDate)continue;          // đủ khoảng cách với lần giảm trước
        if(gradeStats(qList.filter(q=>q.end<=rd),gradeFn).adj>=need){found={name:r.name,date:rd};break;}
      }
      y++;
    }
    return found;
  };

  // ----- Khoản 8: đã được giảm án nhưng bị kỷ luật -----
  const isK8=x.k8.on, k8Need=isK8?x.k8.need:0, k8Date=isK8?x.k8.date:null;
  if(isK8){
    if(!k8Need||!k8Date){
      hints.k8='';
      return done('pending','<span class="rc-head">◷ Chờ thông tin Khoản 8</span>'
        +'Vui lòng chọn <b>hình thức kỷ luật</b> và nhập <b>ngày công nhận đã cải tạo tiến bộ</b> để đối chiếu.');
    }
    if(e.arrestDate&&k8Date.getTime()<e.arrestDate.getTime()){
      hints.k8='<b style="color:#8a1c1c">Ngày công nhận không hợp lệ</b> — phải từ ngày bắt ('+fmtDate(e.arrestDate)+') trở đi.';
      return done('no','<span class="rc-head">Ngày công nhận tiến bộ không hợp lệ</span>'
        +'Ngày công nhận đã cải tạo tiến bộ không thể trước ngày bắt (<b>'+fmtDate(e.arrestDate)+'</b>).');
    }
    // Số quý đủ điều kiện xếp loại kể từ ngày công nhận tiến bộ (theo Điều 21)
    const k8List=completedQuarters(k8Date,e.today), k8Have=k8List.length;
    hints.k8='Kể từ ngày công nhận <b>'+fmtDate(k8Date)+'</b> đã có <b>'+k8Have+'/'+k8Need+' quý</b> đủ điều kiện xếp loại.';
    if(!timeOK){
      return done('no','<span class="rc-head">Chưa đủ điều kiện xét giảm</span>'
        +'Chưa đạt mốc thời gian '+fracTxt+' mức án (dự kiến đạt ngày <b>'+fmtDate(milestone)+'</b>).');
    }
    if(k8Have>=k8Need&&qAdj>=k8Need){
      let rv=null,yy=k8Date.getFullYear();
      for(let n=0;n<40&&!rv;n++){
        for(const r of REVIEW_DATES){
          const rd=new Date(yy,r.reviewMonth-1,r.reviewDay);
          if(rd<milestone)continue;
          if(rd<e.today)continue;
          if(k8List.filter(q=>q.end<=rd).length>=k8Need){rv={name:r.name,date:rd};break;}
        }
        yy++;
      }
      return Object.assign(done('ok','<span class="rc-head">✓ Đủ điều kiện xét giảm án</span>'
        +'Đã được công nhận cải tạo tiến bộ ngày <b>'+fmtDate(k8Date)+'</b> và có <b>'+qAdj+'/'+k8Need
        +' quý liền kề</b> xếp loại Khá trở lên theo <b>Khoản 8</b>. '
        +(rv?('Đề nghị xét giảm tại đợt <b>'+shortReviewLabel(rv.name,rv.date)+'</b> (ngày xét <b>'+fmtDate(rv.date)+'</b>). '):'')
        +'Lưu ý đối chiếu thêm điều kiện về <b>biến động</b> và các quy định hiện hành.'),{review:rv||null});
    }
    const have=Math.min(k8Have,qAdj||0), missK8=Math.max(k8Need-have,1);
    const nx=findEligibleReview(addQuarters(e.today,missK8));
    return done('pending','<span class="rc-head">◷ Chưa đủ điều kiện theo Khoản 8</span>'
      +'Sau khi được công nhận cải tạo tiến bộ ngày <b>'+fmtDate(k8Date)+'</b>, cần đủ <b>'+k8Need
      +' quý liền kề</b> xếp loại Khá trở lên; hiện mới có <b>'+have+' quý</b>. '
      +'Còn thiếu <b>'+missK8+' quý</b>. '
      +(nx?('Nếu các quý tiếp theo đều đạt Khá trở lên, dự kiến đủ điều kiện đề nghị xét giảm vào đợt <b>'+nx.name+'</b> (ngày xét <b>'+fmtDate(nx.date)+'</b>).'):''));
  }

  // ----- Yêu cầu về xếp loại -----
  const baseQ=Math.max(0,base.quarters)+extra;
  const isK7=x.k7.on;
  const needAdj=isK7?Q.khoan7.lienKe:baseQ, needTotal=isK7?Q.khoan7.tongQuy:baseQ;
  // Điều kiện thay thế theo Khoản 5 (tự động áp dụng với án trên 05 năm)
  const k5Row=Q.khoan5.find(r=>years>r[0]);
  const k5Avail=!isK7&&!!k5Row;
  const k5Total=baseQ+(k5Row?k5Row[1]:0), k5Adj=k5Row?k5Row[2]:0;

  if(!timeOK){
    return done('no','<span class="rc-head">Chưa đủ điều kiện xét giảm</span>'
      +'Chưa đạt mốc thời gian '+fracTxt+' mức án (dự kiến đạt ngày <b>'+fmtDate(milestone)+'</b>).'
      +(review?(' Đợt xét sớm nhất có thể được đề nghị: <b>'+review.name+' ('+fmtDate(review.date)+')</b>.'):''));
  }
  // Chưa có quý xếp loại nào (chưa nhập ngày đến trại)
  if(qTotal===0&&qAdj===0&&needAdj>0){
    if(x.picked&&x.picked.value){
      const lastRedD=new Date(parseInt(x.picked.value));
      return done('pending','<span class="rc-head">◷ Đã được giảm án</span>'
        +'Đã được giảm án <b>đợt '+escHtml(String(x.picked.label||'').replace(/\s*\(ngày xét.*\)$/,''))
        +'</b> (ngày xét <b>'+fmtDate(lastRedD)+'</b>). '
        +'Vui lòng nhập các thông tin bên dưới để tra cứu đợt giảm tiếp theo.');
    }
    return done('pending','<span class="rc-head">◷ Đã đủ điều kiện về thời gian</span>'
      +'Đã đạt mốc '+fracTxt+' mức án ngày <b>'+fmtDate(milestone)+'</b>. '
      +'Vui lòng nhập các thông tin bên dưới để tra cứu kết quả giảm án.');
  }
  if(arrival&&qTotal>availQ){
    return done('no','<span class="rc-head">Số quý chưa hợp lý</span>'
      +'Tính từ ngày đến trại <b>'+fmtDate(arrival)+'</b> theo Điều 21, đến nay mới có <b>'+availQ
      +' quý</b> đủ điều kiện xếp loại. Vui lòng kiểm tra lại số quý đã nhập.');
  }

  // ----- Đối chiếu -----
  let ok=false, viaK5=false, viaTxt='', detail='', k7MinNext=null, qSinceTotal=0, qSinceAdj=0;
  if(isK7){
    // Ưu tiên ngày xét thực tế người dùng nhập, nếu không có thì lấy ngày của đợt đã chọn
    const selVal=x.k7.date?x.k7.date.getTime():x.k7.value;
    let sinceTxt='';
    if(selVal){
      const lastRed=new Date(selVal);
      const pickedName=String(x.k7.label||'').replace(/\s*\(ngày xét.*\)$/,'')||guessReviewName(lastRed);
      const monthsSince=Math.max(0,Math.round((e.today-lastRed)/(1000*60*60*24*30.44)));
      sinceTxt=' kể từ kỳ giảm '+fmtDate(lastRed);
      // Mỗi năm chỉ được xét giảm 01 lần: sớm nhất là cùng đợt của năm sau (Điều 12 TTLT 02/2021)
      k7MinNext=k7EarliestNext(lastRed);
      const k7NextRound=reviewRoundOf(k7MinNext);
      hints.k7='Từ kỳ giảm này đến nay khoảng <b>'+formatYearMonth(monthsSince)
        +'</b>, tối đa đạt <b>'+Math.floor(monthsSince/3)+' quý</b> xếp loại. Mỗi năm chỉ được xét giảm 01 lần nên đợt sớm nhất được xét tiếp là <b>'
        +shortReviewLabel(k7NextRound.name,k7MinNext)+'</b> (ngày xét '+fmtDate(k7MinNext)+').';
      // Chỉ tính các quý xếp loại SAU kỳ giảm gần nhất
      const st=gradeStats(qList.filter(q=>q.end>lastRed),gradeFn);
      qSinceTotal=st.total; qSinceAdj=st.adj;
      if(e.today<k7MinNext){
        let rvN=null,yN=k7MinNext.getFullYear();
        for(let n=0;n<6&&!rvN;n++){
          for(const r of REVIEW_DATES){
            const rd=new Date(yN,r.reviewMonth-1,r.reviewDay);
            if(rd>=k7MinNext){rvN={name:r.name,date:rd};break;}
          }
          yN++;
        }
        return done('pending','<span class="rc-head">◷ Đã được giảm án — chờ đợt tiếp theo</span>'
          +'Kỳ giảm gần nhất: <b>'+escHtml(shortReviewLabel(pickedName,lastRed))+'</b> (ngày xét '+fmtDate(lastRed)+'). '
          +(rvN?('Dự kiến kỳ giảm tiếp theo vào đợt <b>'+shortReviewLabel(rvN.name,rvN.date)
                 +'</b> (ngày xét <b>'+fmtDate(rvN.date)+'</b>), nếu bảo đảm đủ điều kiện xếp loại.')
                :('Đợt xét tiếp theo sớm nhất từ <b>'+fmtDate(k7MinNext)+'</b> trở đi.')));
      }
    }else hints.k7='';
    const tSince=selVal?qSinceTotal:qTotal, aSince=selVal?qSinceAdj:qAdj;
    if(tSince===aSince&&aSince>=1&&aSince>=needAdj){ ok=true; viaTxt='liên tục xếp loại Khá ('+aSince+' quý'+sinceTxt+')'; }
    else if(tSince>=needTotal&&aSince>=needAdj){ ok=true; viaTxt='đủ '+tSince+' quý Khá, trong đó '+aSince+' quý liền kề (Khoản 7)'+sinceTxt; }
    else{ detail='mới có <b>'+tSince+' quý</b> Khá (<b>'+aSince+' quý liền kề</b>)'+sinceTxt
            +', yêu cầu đủ <b>'+pad2(needTotal)+' quý</b> Khá và <b>≥ '+pad2(needAdj)+' quý liền kề</b>; '; }
  }else{
    if(qAdj>=needAdj){
      ok=true;
      viaTxt=needAdj>0?(qAdj+'/'+needAdj+' quý Khá liên tục liền kề'):'chưa xếp loại vẫn được xem xét (người chưa thành niên)';
    }
    else if(k5Avail&&qTotal>=k5Total&&qAdj>=k5Adj){
      ok=true; viaK5=true;
      viaTxt='tổng '+qTotal+' quý Khá (yêu cầu ≥ '+k5Total+') và '+qAdj+' quý liền kề (yêu cầu ≥ '+k5Adj+') — <b>tự động áp dụng Khoản 5</b> do xếp loại không liên tục';
    }else{
      detail='mới có <b>'+qAdj+'/'+needAdj+' quý</b> Khá liên tục liền kề'
           +(k5Avail?(' (Khoản 5 cần tổng ≥ '+k5Total+' quý và ≥ '+k5Adj+' quý liền kề — hiện có '+qTotal+' quý / '+qAdj+' quý liền kề)'):'')+'; ';
    }
  }
  if(ok){
    // Đợt xét đầu tiên CHƯA DIỄN RA mà đã đủ số quý liền kề theo đúng điều kiện vừa đạt
    const needQ=isK7?Math.max(qAdj,1):(viaK5?k5Adj:needAdj);
    let realReview=needQ>0?reviewWithQuarters(needQ,k7MinNext):null;
    if(!realReview){
      // Không tính được theo chuỗi quý: lấy đợt xét đầu tiên kể từ ngày tính (không sớm hơn mốc
      // thời gian và không sớm hơn cùng đợt năm sau của lần giảm trước)
      let from=milestone;
      if(e.today>from)from=e.today;
      if(k7MinNext&&k7MinNext>from)from=k7MinNext;
      realReview=findEligibleReview(from);
    }
    return Object.assign(done('ok','<span class="rc-head">✓ Đủ điều kiện xét giảm án</span>'
      +'Đã đủ điều kiện về <b>thời gian</b> ('+fracTxt+' mức án) và <b>xếp loại</b>: '+viaTxt+'. '
      +(realReview?('Đề nghị xét giảm tại đợt <b>'+shortReviewLabel(realReview.name,realReview.date)+'</b> (ngày xét <b>'+fmtDate(realReview.date)+'</b>). '):'')
      +(arrival?('Số quý xếp loại tính từ ngày đến trại <b>'+fmtDate(arrival)+'</b> theo Điều 21. '):'')
      +'Lưu ý đối chiếu thêm điều kiện về <b>biến động</b> và các quy định hiện hành.'),{review:realReview||null});
  }
  // ----- Đủ thời gian nhưng thiếu quý xếp loại -> tính đợt xét sau -----
  const miss=isK7
    ? Math.max(needTotal-qSinceTotal,needAdj-qSinceAdj,1)
    : Math.max(1,Math.min(needAdj-qAdj, k5Avail?Math.max(k5Total-qTotal,k5Adj-qAdj):Infinity));
  let readyDate=addQuarters(e.today,miss);
  if(k7MinNext&&readyDate<k7MinNext)readyDate=k7MinNext;   // không sớm hơn cùng đợt năm sau của lần giảm trước
  const nextReview=findEligibleReview(readyDate);
  return done('pending','<span class="rc-head">◷ Đủ thời gian — chưa đủ xếp loại</span>'
    +'Đã đạt mốc '+fracTxt+' mức án nhưng '+detail+'còn thiếu <b>'+miss+' quý</b> xếp loại Khá. '
    +(nextReview?('Nếu các quý tiếp theo đều đạt Khá trở lên, dự kiến đủ điều kiện đề nghị xét giảm vào đợt <b>'+nextReview.name+' ('+fmtDate(nextReview.date)+')</b>.'):''));
}

// Hiển thị kết luận lên trang Tra cứu giảm án
const RM_HINT_IDS={k9:'rmK9Hint', arrival:'rmArrivalHint', k8:'rmK8Hint', k7:'rmK7Hint'};
function updateConclusion(){
  const box=document.getElementById('rmConclusion');
  if(!box||!lastEligibleData)return;
  const r=evaluateRemission(lastEligibleData,readRemissionInputs());
  Object.keys(r.hints).forEach(k=>{const el=document.getElementById(RM_HINT_IDS[k]);if(el)el.innerHTML=r.hints[k];});
  const elArr=document.getElementById('rmArrival');
  if(r.arrivalInvalid){
    if(elArr&&elArr.dataset.warned!=='1'){elArr.dataset.warned='1';showWarn('Ngày đến trại không hợp lệ.');}
  }else if(r.arrivalChecked&&elArr){
    elArr.dataset.warned='';
  }
  box.className=r.cls;
  box.innerHTML=r.html;
}

// Tính lại toàn bộ trang Tra cứu giảm án mỗi khi một thông tin thay đổi:// Tính lại toàn bộ trang Tra cứu giảm án mỗi khi một thông tin thay đổi:
// điều kiện xếp loại theo nhóm ưu tiên (Điều 123) + tiền án (Khoản 6), bảng quý, kỳ giảm, kết luận.
function refreshRemissionGrade(){
  if(!lastEligibleData)return;
  captureRmCtx();
  const e=lastEligibleData;

  // Chú thích Khoản 6 theo mức án hiện tại
  const ruleEl=document.getElementById('rmPenaltyRule');
  if(ruleEl){
    const t=QUY_DINH.tienAn, small=(e.sentMonths<=t.nguongThang);
    ruleEl.textContent='(mức án '+(small?('từ '+pad2(t.nguongThang/12)+' năm trở xuống → mỗi tiền án +'+t.quyAnNho+' quý Khá)')
                                         :('trên '+pad2(t.nguongThang/12)+' năm → mỗi tiền án +'+t.quyAnLon+' quý Khá)'));
  }

  // Áp quy định tự xếp loại Kém (Điều 26) rồi dựng bảng
  computeAutoKem();
  renderQuarterGrid();
  // Nếu hồ sơ có kỳ giảm án -> tự xác định kỳ giảm đã được xét từ bảng xếp loại
  const hasRem=remissions&&remissions.some(r=>(r.years||0)||(r.months||0));
  if(hasRem)autoFillK7();
  updateConclusion();
}

// Bật/tắt nhóm ưu tiên (người chưa thành niên) -> áp dụng Điều 123:
// mốc thời gian đổi sang 1/4 mức án, đồng thời điều chỉnh điều kiện xếp loại.
function togglePriority(){
  if(!lastEligibleData)return;
  updatePriorityMilestone(document.getElementById('rmPriority').checked);
  refreshRemissionGrade();
}
function updatePriorityMilestone(isPriority){
  const e=lastEligibleData;
  const mLbl=document.getElementById('rmMilestoneLbl');
  const mVal=document.getElementById('rmMilestoneVal');

  if(isPriority){
    // Điều 123: mốc thời gian 1/4 mức án (trừ tạm giam)
    const q=escShift(calcOneThirdDate(e.arrestDate,e.sentMonths,e.sentExtraDays,e.preDetMonths,e.preDetDays,QUY_DINH.mocChuaThanhNien),e.esc);
    if(mLbl)mLbl.textContent='Ngày đạt mốc 1/'+QUY_DINH.mocChuaThanhNien+' (Điều 123)';
    if(mVal)mVal.innerHTML='<span style="color:#9b6a0a">'+fmtDate(q)+'</span>';
    if(document.getElementById('rmK7')&&document.getElementById('rmK7').checked)buildK7Reviews();
  }else{
    // Trở về Điều 5: mốc 1/3
    if(mLbl)mLbl.textContent='Ngày đạt mốc 1/'+QUY_DINH.mocThuong;
    if(mVal)mVal.textContent=fmtDate(e.oneThirdDate);
    if(document.getElementById('rmK7')&&document.getElementById('rmK7').checked)buildK7Reviews();
  }
}

function openAnnex(){
  document.getElementById('annexOverlay').classList.add('show');
  document.body.style.overflow='hidden';
}

function closeAnnex(){
  document.getElementById('annexOverlay').classList.remove('show');
  document.body.style.overflow='';
}

function openDecree(){
  document.getElementById('decreeOverlay').classList.add('show');
  document.body.style.overflow='hidden';
}

function closeDecree(){
  document.getElementById('decreeOverlay').classList.remove('show');
  document.body.style.overflow='';
}
