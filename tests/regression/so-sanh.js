// So kết quả 400 kịch bản giao diện + mã băm các hàm tính với bản mẫu chuẩn (mau-chuan.json.gz).
//   node tests/regression/so-sanh.js <index.html>            so sánh, báo khác biệt
//   node tests/regression/so-sanh.js <index.html> --cap-nhat  ghi lại bản mẫu chuẩn (chỉ khi CHỦ ĐỘNG đổi cách tính/giao diện)
const path=require('path'),fs=require('fs'),zlib=require('zlib'),os=require('os');
const {spawnSync}=require('child_process');
const html=path.resolve(process.argv[2]||path.join(__dirname,'..','..','index.html'));
const update=process.argv.includes('--cap-nhat');
const BASE=path.join(__dirname,'mau-chuan.json.gz');
const out=path.join(os.tmpdir(),'ket-qua-kich-ban.json');
const r=spawnSync(process.execPath,[path.join(__dirname,'chay-kich-ban.js'),html,out,'400','1'],{stdio:['ignore','inherit','inherit'],timeout:40*60e3});
if(r.status!==0){console.log('FAIL Không chạy được bộ kịch bản (mã thoát '+r.status+')');process.exit(1);}
const cur=JSON.parse(fs.readFileSync(out,'utf8'));
if(update){fs.writeFileSync(BASE,zlib.gzipSync(JSON.stringify(cur),{level:9}));console.log('PASS Đã ghi lại bản mẫu chuẩn: '+BASE);process.exit(0);}
const base=JSON.parse(zlib.gunzipSync(fs.readFileSync(BASE)).toString('utf8'));
// Gom khác biệt theo "đường dẫn" (bỏ số thứ tự kịch bản) để dễ đọc
const diffs={},first={};
function walk(a,b,p){
  if(JSON.stringify(a)===JSON.stringify(b))return;
  if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)){
    const keys=new Set([...Object.keys(a),...Object.keys(b)]);
    for(const k of keys)walk(a[k],b[k],p+(Array.isArray(a)?'[]':'.'+k));
    return;
  }
  diffs[p]=(diffs[p]||0)+1;
  if(!first[p])first[p]=[a,b];
}
walk(base,cur,'');
const keys=Object.keys(diffs);
if(cur.errs&&cur.errs.length)console.log('FAIL Lỗi JS khi chạy kịch bản: '+JSON.stringify(cur.errs).slice(0,300));
if(!keys.length){console.log('PASS 400 kịch bản giao diện và các hàm tính: giống hệt bản mẫu chuẩn');}
else{
  console.log('FAIL Khác bản mẫu chuẩn ở '+keys.length+' loại dữ liệu:');
  keys.forEach(k=>{console.log('   '+diffs[k]+' × '+k);const [a,b]=first[k];
    console.log('      mẫu chuẩn: '+String(JSON.stringify(a)).slice(0,240));console.log('      bản này  : '+String(JSON.stringify(b)).slice(0,240));});
  console.log('   Nếu khác biệt là do CHỦ ĐỘNG thay đổi, chạy: npm run cap-nhat-mau-chuan');
}
console.log('Lỗi JS:',cur.errs&&cur.errs.length?cur.errs:'không');
