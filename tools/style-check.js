// Kiểm tra giao diện theo nhận diện ALumiEye (xem AGENTS.md). Đọc tĩnh, không cần cài gì.
// Chạy: node tools/style-check.js  — hoặc node tools/style-check.js <thư mục game> để thử trên bản sao.
'use strict';
const fs = require('fs'), path = require('path');
const root = path.resolve(process.argv[2] || path.join(__dirname, '..'));
const read = f => fs.readFileSync(path.join(root, f), 'utf8');
const errors = [], ok = [];
const check = (pass, label) => (pass ? ok : errors).push(label);

const html = read('index.html'), css = read('style.css');

// 1. Logo thật, đặt bằng #brand ở mọi màn hình; không còn biểu tượng cũ.
check(/<img id="brand" src="assets\/alumieye\.png" alt="ALumiEye">/.test(html), 'index.html có <img id="brand" src="assets/alumieye.png" alt="ALumiEye">');
check(!/icon\.svg/.test(html) && !fs.existsSync(path.join(root, 'icon.svg')), 'Không dùng icon.svg (logo cũ sai)');
check(!html.includes('◈'), 'Không dùng ký hiệu ◈ làm logo');
check(/#brand\s*\{[^}]*position:\s*fixed/.test(css), '#brand cố định ở góc màn hình (position: fixed)');
const logo = path.join(root, 'assets/alumieye.png');
const original = path.join(root, '../eyetank/src/client/alumieye.png');
if (!fs.existsSync(logo)) check(false, 'Có file assets/alumieye.png');
else if (fs.existsSync(original)) check(fs.readFileSync(logo).equals(fs.readFileSync(original)), 'assets/alumieye.png giống hệt logo gốc của EyeTank');
else ok.push('assets/alumieye.png có mặt (không tìm thấy bản EyeTank để so)');

// 2. Bảy mã màu thương hiệu, đúng giá trị, trong :root.
const rootBlock = (css.match(/:root\s*\{([^}]*)\}/) || [, ''])[1];
const tokens = { cream: '#efe3cc', 'cream-light': '#f6eddb', plum: '#59325d', 'plum-dark': '#3d2141', orange: '#eba96b', 'orange-dark': '#cf8549', pink: '#f2b3ae' };
for (const [name, value] of Object.entries(tokens)) {
  const m = rootBlock.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`));
  check(m && m[1].toLowerCase() === value, `:root --${name} = ${value}`);
}

// 3. Những thứ làm giao diện "giả": gradient, chữ có chân, kính mờ.
check(!/(linear|radial|conic)-gradient\(/.test(css), 'style.css không có gradient');
check(!/Georgia|Times New Roman|(^|[\s,'"(])serif[\s,;'")]/m.test(css.replace(/sans-serif/g, '')), 'style.css không dùng font có chân (serif)');
check(!/backdrop-filter:\s*(?!none)/.test(css), 'style.css không dùng kính mờ (backdrop-filter)');
check(/^button\s*\{[^}]*border-radius:\s*0/m.test(css) && /^button\s*\{[^}]*box-shadow:\s*0 3px 0/m.test(css), 'Nút phẳng: border-radius 0, bóng đổ cứng 0 3px 0');

// 4. Biểu tượng cảm xúc trên HUD, menu, nút. ▶ và ⛶ là ký hiệu chữ, được phép.
// Ngoại lệ đã biết: thanh trình vẽ (#editor-bar) vẫn dùng biểu tượng khi màn nhỏ — xem AGENTS.md.
const allowed = new Set(['▶', '⛶']);
const visible = html.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<div id="editor-bar"[\s\S]*?<\/div>\s*<\/div>/, '');
const emoji = [...new Set((visible.match(/\p{Extended_Pictographic}/gu) || []).filter(c => !allowed.has(c)))];
check(emoji.length === 0, 'index.html không có biểu tượng cảm xúc trên HUD/menu/nút' + (emoji.length ? ` (thấy: ${emoji.join(' ')})` : ''));

// 5. Lumi vẽ theo tỷ lệ ảnh gốc (kiểm tra thật trên Chrome nằm trong browser-check.js).
const render = read('js/render.js');
check(/naturalWidth/.test(render) && /naturalHeight/.test(render), 'render.js vẽ Lumi theo naturalWidth/naturalHeight');

for (const l of ok) console.log('✓ ' + l);
for (const l of errors) console.log('✗ ' + l);
console.log(errors.length ? `\n${errors.length} lỗi style — sửa theo AGENTS.md` : `\nStyle ALumiEye đạt (${ok.length} mục)`);
process.exitCode = errors.length ? 1 : 0;
