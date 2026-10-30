// Ghép mã nguồn trong src/ thành ứng dụng một tệp (index.html) và service worker (sw.js).
//   node build.mjs           ghép và ghi index.html, sw.js ở thư mục gốc
//   node build.mjs --check   chỉ kiểm tra index.html, sw.js ở gốc có đúng bằng bản ghép từ src/ không
// Không cần thư viện ngoài. Thứ tự ghép nằm trong src/build-plan.json.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const MIME = {png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', svg: 'image/svg+xml'};

// Ảnh trong src/assets được nhúng thẳng vào trang (dạng base64) để app chạy được khi không có mạng
function assetURI(name) {
  const ext = name.split('.').pop().toLowerCase();
  if (!MIME[ext]) throw new Error('Không rõ loại ảnh: ' + name);
  const buf = fs.readFileSync(path.join(root, 'src/assets', name));
  return 'data:' + MIME[ext] + ';base64,' + buf.toString('base64');
}

export function buildHtml() {
  const plan = JSON.parse(read('src/build-plan.json'));
  let out = '';
  for (const p of plan.parts) {
    if (p.text != null) out += p.text;
    else {
      out += read(p.file);
      if (p.joinNewline) out += '\n';
    }
  }
  return out.replace(/\{\{asset:([\w.-]+)\}\}/g, (m, n) => assetURI(n));
}

export function buildSw() {
  const v = read('src/VERSION').trim();
  if (!/^v\d+$/.test(v)) throw new Error('src/VERSION phải có dạng v<số>, ví dụ v94');
  return read('src/sw.template.js').replace('__CACHE_VERSION__', v);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const outs = {'index.html': buildHtml(), 'sw.js': buildSw()};
  if (process.argv.includes('--check')) {
    let bad = 0;
    for (const [f, txt] of Object.entries(outs)) {
      const cur = fs.existsSync(path.join(root, f)) ? read(f) : null;
      if (cur !== txt) {
        bad++;
        console.error('✗ ' + f + ' không khớp với mã nguồn trong src/. Hãy chạy "npm run build" rồi commit lại.');
      } else console.log('✓ ' + f + ' khớp với mã nguồn (' + txt.length + ' ký tự)');
    }
    process.exit(bad ? 1 : 0);
  }
  for (const [f, txt] of Object.entries(outs)) {
    fs.writeFileSync(path.join(root, f), txt);
    console.log('Đã ghép ' + f + ' (' + txt.length + ' ký tự)');
  }
}
