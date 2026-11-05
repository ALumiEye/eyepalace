// Gộp toàn bộ game thành 1 file HTML duy nhất: dist/eyepalace.html
// Chạy: node tools/build.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
html = html.replace(/<link rel="stylesheet" href="style\.css[^"]*">/, () => `<style>\n${css}\n</style>`);
// Bản 1 file: nhúng icon dạng data URI, bỏ manifest (không có service worker)
const icon = fs.readFileSync(path.join(root, 'icon.svg'), 'utf8');
html = html.replace(/<link rel="icon" href="icon\.svg"[^>]*>/, `<link rel="icon" href="data:image/svg+xml,${encodeURIComponent(icon)}">`);
html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');
html = html.replace('<html lang="vi">', '<html lang="vi" data-single="1">');
const scripts = [];
html = html.replace(/<script src="(js\/[a-z]+\.js)[^"]*"><\/script>\n?/g, (_, src) => { scripts.push(src); return ''; });
// Mỗi file giữ 'use strict' cục bộ trong khối riêng nhưng vẫn dùng chung phạm vi toàn cục như khi tải nhiều thẻ <script>
const lumi = 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets', 'lumi.png')).toString('base64');
html = html.replaceAll('assets/lumi.png', lumi);
const js = scripts.map(src => `/* ---- ${src} ---- */\n` + fs.readFileSync(path.join(root, src), 'utf8').replace(/^'use strict';\n/, '').replaceAll('assets/lumi.png', lumi)).join('\n');
html = html.replace('</body>', () => `<script>\n'use strict';\n${js.replace(/<\/script/g, '<\\/script')}\n</script>\n</body>`);
// Hàm thay thế giữ nguyên các chuỗi $ trong mã game (vd. ký hiệu vàng).
new (require('vm').Script)(js, { filename: 'eyepalace-bundle.js' });
fs.mkdirSync(path.join(root, 'dist'), { recursive: true });
const out = path.join(root, 'dist', 'eyepalace.html');
fs.writeFileSync(out, html);
console.log(`Đã gộp ${scripts.length} file JS + CSS → ${path.relative(root, out)} (${(html.length / 1024).toFixed(1)} KB)`);
