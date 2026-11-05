// Một lệnh build cho hai kênh phát hành:
//   dist/               — website tĩnh cho GitHub Pages (có service worker, cài như ứng dụng, chơi offline)
//   dist/eyepalace.html — một file HTML nhúng đủ CSS/JS/ảnh cho GitHub Releases (cũng có trên Pages)
// Phiên bản hiển thị lấy từ biến môi trường GAME_VERSION (workflow đặt), mặc định "bản dev".
// Chạy: node tools/build.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const root = path.join(__dirname, '..');
const VERSION_SLOT = '<span id="game-version">bản nguồn</span>';
const SITE = ['index.html', 'style.css', 'sw.js', 'manifest.webmanifest', 'js', 'assets'];

const escapeHtml = text => String(text).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function single(source) {
  let html = source;
  const css = fs.readFileSync(path.join(root, 'style.css'), 'utf8');
  html = html.replace(/<link rel="stylesheet" href="style\.css[^"]*">/, () => `<style>\n${css}\n</style>`);
  // Bản 1 file: bỏ manifest (không có service worker); ảnh được nhúng dạng data URI bên dưới.
  html = html.replace(/<link rel="manifest"[^>]*>\n?/, '');
  html = html.replace('<html lang="vi">', '<html lang="vi" data-single="1">');
  const scripts = [];
  html = html.replace(/<script src="(js\/[a-z]+\.js)[^"]*"><\/script>\n?/g, (_, src) => { scripts.push(src); return ''; });
  // Nhúng mọi ảnh (Lumi, logo ALumiEye, favicon) để mở file:// vẫn đủ hình.
  const images = ['lumi.png', 'alumieye.png', 'favicon.png'].map(name =>
    ['assets/' + name, 'data:image/png;base64,' + fs.readFileSync(path.join(root, 'assets', name)).toString('base64')]);
  const inline = text => images.reduce((s, [from, to]) => s.replaceAll(from, to), text);
  html = inline(html);
  // Mỗi file giữ 'use strict' cục bộ nhưng vẫn dùng chung phạm vi toàn cục như khi tải nhiều thẻ <script>.
  const js = scripts.map(src => `/* ---- ${src} ---- */\n` + inline(fs.readFileSync(path.join(root, src), 'utf8').replace(/^'use strict';\n/, ''))).join('\n');
  // Hàm thay thế giữ nguyên các chuỗi $ trong mã game (vd. ký hiệu vàng).
  html = html.replace('</body>', () => `<script>\n'use strict';\n${js.replace(/<\/script/g, '<\\/script')}\n</script>\n</body>`);
  new vm.Script(js, { filename: 'eyepalace-bundle.js' });
  if (/<script src=|<link rel="stylesheet"|(?:src|href)="assets\//.test(html)) throw new Error('Bản một file vẫn còn tham chiếu file ngoài.');
  return { html, count: scripts.length };
}

function build(outputRoot = root, version = process.env.GAME_VERSION || 'bản dev') {
  const source = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  if (source.split(VERSION_SLOT).length !== 2) throw new Error('index.html cần đúng một ' + VERSION_SLOT);
  const index = source.replace(VERSION_SLOT, () => `<span id="game-version">${escapeHtml(version)}</span>`);
  const dist = path.join(outputRoot, 'dist');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  for (const item of SITE) fs.cpSync(path.join(root, item), path.join(dist, item), { recursive: true });
  fs.writeFileSync(path.join(dist, 'index.html'), index);
  fs.writeFileSync(path.join(dist, '.nojekyll'), '');
  const { html, count } = single(index);
  const releaseFile = path.join(dist, 'eyepalace.html');
  fs.writeFileSync(releaseFile, html);
  return { dist, releaseFile, count, version };
}

if (require.main === module) {
  const { dist, releaseFile, count, version } = build();
  console.log(`Pages: ${path.relative(root, dist)}/`);
  console.log(`Release: gộp ${count} file JS + CSS → ${path.relative(root, releaseFile)} (${(fs.statSync(releaseFile).size / 1024).toFixed(1)} KB) — phiên bản ${version}`);
}

module.exports = { build };
