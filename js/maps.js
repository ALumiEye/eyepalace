'use strict';
// ===== Bản đồ & đường đi =====
// Mỗi bản đồ có một hoặc nhiều đường (waypoints theo toạ độ ô). Điểm đầu nằm ngoài lưới = cổng quái,
// điểm cuối = lâu đài (dùng chung cho mọi đường).
const MAPS = [
  {
    id: 'meadow', name: 'Đồng Cỏ Xanh', desc: 'Một đường uốn lượn. Phù hợp để làm quen.',
    theme: { grass: '#5a8f3c', grass2: '#4f8034', path: '#c9a66b', path2: '#b8955c', deco: 'tree' },
    paths: [[[-1, 2], [3, 2], [3, 8], [8, 8], [8, 3], [13, 3], [13, 9], [17, 9], [17, 5], [18, 5]]],
    seed: 7,
  },
  {
    id: 'canyon', name: 'Hẻm Núi Đá', desc: 'Đường rắn dài – mỗi tháp phủ được hai làn.',
    theme: { grass: '#9a7b56', grass2: '#8c6f4c', path: '#d8c39a', path2: '#c7b088', deco: 'rock' },
    paths: [[[-1, 1], [17, 1], [17, 4], [2, 4], [2, 7], [17, 7], [17, 10], [1, 10]]],
    seed: 21,
  },
  {
    id: 'delta', name: 'Ngã Ba Sông', desc: 'Hai cổng quái hợp lại trước cung điện.',
    theme: { grass: '#3f7f5f', grass2: '#377354', path: '#bfa679', path2: '#ad956a', deco: 'reed' },
    paths: [
      [[-1, 2], [7, 2], [7, 6], [18, 6]],
      [[-1, 10], [11, 10], [11, 6], [18, 6]],
    ],
    seed: 5, goldBonus: 130, hpMul: 0.95,
  },
  {
    id: 'spiral', name: 'Xoắn Ốc Băng', desc: 'Quái xoáy vào giữa. Bố trí tháp ở trung tâm!',
    theme: { grass: '#a9c6d6', grass2: '#9bb9ca', path: '#e8eef2', path2: '#d5dfe6', deco: 'crystal' },
    paths: [[[-1, 1], [18, 1], [18, 10], [1, 10], [1, 4], [15, 4], [15, 7], [5, 7]]],
    seed: 13, hpMul: 1.3,
  },
  {
    id: 'swamp', name: 'Đầm Lầy Sương', desc: 'Ba cổng quái từ ba hướng. Thử thách thật sự!',
    theme: { grass: '#4d6b3c', grass2: '#456135', path: '#8a7a55', path2: '#7a6a48', deco: 'reed' },
    paths: [
      [[-1, 1], [9, 1], [9, 5], [18, 5]],
      [[-1, 8], [4, 8], [4, 10], [13, 10], [13, 5], [18, 5]],
      [[15, -1], [15, 3], [18, 3], [18, 5]],
    ],
    seed: 42, goldBonus: 190, hpMul: 0.95,
  },
  {
    id: 'crossing', name: 'Ngã Tư Lá Đỏ', desc: 'Đường tự cắt chéo qua chính nó – tháp ở giao lộ bắn được hai lần!',
    theme: { grass: '#9c8a3a', grass2: '#8f7e33', path: '#d6c08a', path2: '#c4ad78', deco: 'autumn' },
    paths: [[[-1, 3], [15, 3], [15, 9], [5, 9], [5, 1], [18, 1], [18, 6]]],
    seed: 77, hpMul: 1.45,
  },
  {
    id: 'volcano', name: 'Núi Lửa', desc: 'Ô nóng (vết nứt cam): tháp đặt lên được +25% sát thương.',
    theme: { grass: '#3d2f2b', grass2: '#362925', path: '#8a6a55', path2: '#765a47', deco: 'lava' },
    paths: [[[-1, 5], [5, 5], [5, 1], [11, 1], [11, 10], [15, 10], [15, 4], [18, 4]]],
    hot: [[4, 3], [6, 3], [7, 2], [10, 4], [12, 6], [10, 8], [13, 9], [14, 7], [16, 6], [3, 6], [9, 2], [16, 9]],
    seed: 66, hpMul: 0.9, goldBonus: 60,
  },
  {
    id: 'palace', name: 'Cung Điện Mắt', desc: 'Cung điện ở giữa, quái tràn vào từ 4 góc. Thắng 3 bản đồ để mở khoá.',
    theme: { grass: '#3b3363', grass2: '#342d58', path: '#b8a9d9', path2: '#a593c9', deco: 'crystal' },
    paths: [
      [[-1, 1], [6, 1], [6, 4], [10, 4], [10, 6]],
      [[20, 2], [14, 2], [14, 6], [10, 6]],
      [[-1, 10], [5, 10], [5, 7], [10, 7], [10, 6]],
      [[20, 10], [15, 10], [15, 8], [12, 8], [12, 6], [10, 6]],
    ],
    seed: 99, goldBonus: 330, hpMul: 0.72, unlockWins: 3,
  },
];

// ===== Bản đồ ngẫu nhiên theo hạt giống =====
// Đường đi luôn tiến sang phải (không tự cắt), xen kẽ các đoạn dọc; máu quái tỉ lệ theo độ dài đường.
const RANDOM_THEMES = [
  { grass: '#5a8f3c', grass2: '#4f8034', path: '#c9a66b', path2: '#b8955c', deco: 'tree' },
  { grass: '#9a7b56', grass2: '#8c6f4c', path: '#d8c39a', path2: '#c7b088', deco: 'rock' },
  { grass: '#a9c6d6', grass2: '#9bb9ca', path: '#e8eef2', path2: '#d5dfe6', deco: 'crystal' },
  { grass: '#9c8a3a', grass2: '#8f7e33', path: '#d6c08a', path2: '#c4ad78', deco: 'autumn' },
  { grass: '#4d6b3c', grass2: '#456135', path: '#8a7a55', path2: '#7a6a48', deco: 'reed' },
];
function makeRandomMap(seed) {
  seed = Math.max(1, Math.floor(seed) % 1000000);
  const rnd = mulberry32(seed * 9973 + 7), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
  let best = null;
  for (let tries = 0; tries < 30; tries++) {
    let y = ri(1, ROWS - 2), x = 0; const pts = [[-1, y]]; let len = 1;
    while (true) {
      const nx = Math.min(18, x + ri(2, 4)); len += nx - x; x = nx; pts.push([x, y]);
      if (x >= 18) break;
      let ny; do { ny = ri(1, ROWS - 2); } while (Math.abs(ny - y) < 3);
      len += Math.abs(ny - y); y = ny; pts.push([x, y]);
    }
    if (!best || Math.abs(len - 46) < Math.abs(best.len - 46)) best = { pts, len };
    if (len >= 40 && len <= 54) break;
  }
  // Ô nóng ở góc trong của một số khúc cua (khoảng một nửa số khúc cua)
  const hot = [];
  for (let i = 1; i < best.pts.length - 1; i++) {
    if (rnd() < 0.5) continue;
    // Góc trong của khúc cua = điểm góc − hướng vào + hướng ra
    const [px, py] = best.pts[i - 1], [x, y] = best.pts[i], [nx, ny] = best.pts[i + 1];
    const hx = x - Math.sign(x - px) + Math.sign(nx - x), hy = y - Math.sign(y - py) + Math.sign(ny - y);
    if (hx >= 0 && hx < COLS && hy >= 0 && hy < ROWS) hot.push([hx, hy]);
  }
  return {
    hot,
    id: 'random', random: true, name: '🎲 Ngẫu Nhiên #' + seed, desc: `Đường đi sinh từ mã ${seed} (dài ${best.len} ô, ${hot.length} ô nóng).`,
    theme: RANDOM_THEMES[seed % RANDOM_THEMES.length], paths: [best.pts], seed: seed,
    hpMul: Math.max(0.85, Math.min(1.5, best.len / 40)), randomSeed: seed,
  };
}
// Gợi ý cho trình vẽ: lấy đường của bản đồ ngẫu nhiên, đổi điểm đầu về cột 0
function suggestCustomPath(seed) {
  for (let k = 0; k < 20; k++) {
    const m = makeRandomMap(seed + k * 7919), pts = m.paths[0].map(p => p.slice());
    pts[0][0] = 0;
    if (pts.length > 2 && pts[1][0] === 0) pts.shift();
    if (validateCustomPath(pts)) continue;
    const on = new Set(pathTiles(pts).map(c => c + ''));
    return { pts, hot: m.hot.filter(c => !on.has(c + '')).slice(0, 8) };
  }
  return null;
}
const RANDOM_MAP_INDEX = MAPS.length;
MAPS.push(makeRandomMap(1));
function setRandomSeed(seed) { MAPS[RANDOM_MAP_INDEX] = makeRandomMap(seed); return MAPS[RANDOM_MAP_INDEX]; }

// ===== Bản đồ tự vẽ =====
// pts: danh sách waypoint theo ô (điểm đầu ở cột 0 → cổng nằm ngoài mép trái; điểm cuối là cung điện)
function pathTiles(pts) {
  const tiles = [];
  for (let i = 1; i < pts.length; i++) {
    let [x, y] = pts[i - 1]; const [x1, y1] = pts[i];
    const dx = Math.sign(x1 - x), dy = Math.sign(y1 - y);
    if (i === 1) tiles.push([x, y]);
    while (x !== x1 || y !== y1) { x += dx; y += dy; tiles.push([x, y]); }
  }
  return tiles;
}
// Kiểm tra đường tự vẽ: trả về chuỗi lỗi hoặc '' nếu hợp lệ
function validateCustomPath(pts) {
  if (pts.length < 2) return 'Cần ít nhất 2 điểm.';
  if (pts[0][0] !== 0) return 'Điểm đầu phải ở cột trái cùng.';
  for (let i = 1; i < pts.length; i++) if (pts[i][0] !== pts[i - 1][0] && pts[i][1] !== pts[i - 1][1]) return 'Mỗi đoạn phải thẳng (cùng hàng hoặc cùng cột).';
  const tiles = pathTiles(pts), seen = new Set();
  for (const [x, y] of tiles) { const k = x + ',' + y; if (seen.has(k)) return 'Đường không được tự đè lên nhau.'; seen.add(k); }
  if (tiles.length < 20) return `Đường quá ngắn (${tiles.length}/20 ô).`;
  return '';
}
// Nhánh phụ: bắt đầu ở cột trái, đi thẳng, kết thúc khi chạm đường chính (điểm nhập)
function validateBranch(main, br) {
  if (br.length < 2) return 'Nhánh cần ít nhất 2 điểm.';
  if (br[0][0] !== 0) return 'Cổng phụ phải ở cột trái cùng.';
  for (let i = 1; i < br.length; i++) if (br[i][0] !== br[i - 1][0] && br[i][1] !== br[i - 1][1]) return 'Mỗi đoạn phải thẳng.';
  const mainSet = new Set(pathTiles(main).map(c => c + '')), tiles = pathTiles(br), seen = new Set();
  for (let i = 0; i < tiles.length; i++) {
    const k = tiles[i] + '';
    if (seen.has(k)) return 'Nhánh không được tự đè lên nhau.';
    seen.add(k);
    if (mainSet.has(k) && i < tiles.length - 1) return 'Nhánh chỉ được chạm đường chính ở điểm cuối.';
  }
  if (!mainSet.has(tiles[tiles.length - 1] + '')) return 'Điểm cuối của nhánh phải nằm trên đường chính.';
  if (tiles.length < 6) return 'Nhánh quá ngắn (tối thiểu 6 ô).';
  return '';
}
// Ghép nhánh với phần còn lại của đường chính từ điểm nhập tới cung điện
function branchFull(main, br) {
  const [jx, jy] = br[br.length - 1];
  for (let i = 1; i < main.length; i++) {
    const [ax, ay] = main[i - 1], [bx, by] = main[i];
    const on = (ax === bx && jx === ax && jy >= Math.min(ay, by) && jy <= Math.max(ay, by)) || (ay === by && jy === ay && jx >= Math.min(ax, bx) && jx <= Math.max(ax, bx));
    if (on) { const rest = main.slice(i); if (rest.length && rest[0][0] === jx && rest[0][1] === jy) rest.shift(); return br.concat(rest); }
  }
  return br;
}
// Chủ đề cho bản đồ tự vẽ (chỉ đổi hình ảnh/thời tiết/âm thanh, không đổi luật)
const CUSTOM_THEMES = [
  { name: '🌳 Đồng cỏ', grass: '#5a7d4f', grass2: '#516f47', path: '#cdb38b', path2: '#b99e76', deco: 'tree' },
  { name: '❄️ Tuyết', grass: '#a9c6d6', grass2: '#9bb9ca', path: '#e8eef2', path2: '#d5dfe6', deco: 'crystal' },
  { name: '🌋 Núi lửa', grass: '#3d2f2b', grass2: '#362925', path: '#8a6a55', path2: '#765a47', deco: 'lava' },
  { name: '🐸 Đầm lầy', grass: '#4d6b3c', grass2: '#456135', path: '#8a7a55', path2: '#7a6a48', deco: 'reed', mist: true },
  { name: '🍂 Mùa thu', grass: '#9c8a3a', grass2: '#8f7e33', path: '#d6c08a', path2: '#c4ad78', deco: 'autumn' },
  { name: '🏜 Hẻm đá', grass: '#9a7b56', grass2: '#8c6f4c', path: '#d8c39a', path2: '#c7b088', deco: 'rock' },
];
function makeCustomMap(pts, hot = [], extra = [], theme = 0) {
  theme = Number.isInteger(theme) && CUSTOM_THEMES[theme] ? theme : 0;
  const tiles = pathTiles(pts).length;
  // Tính cả ô của nhánh phụ: đường càng dài (tổng) thì quái càng trâu
  const all = new Set([pts, ...extra].flatMap(p => pathTiles(p)).map(c => c + '')).size;
  return {
    id: 'custom', custom: true, name: '🛠 Bản Đồ Của Bạn', desc: extra.length ? `Đường tự vẽ ${extra.length + 1} cổng (${all} ô).` : `Đường tự vẽ (dài ${tiles} ô).`,
    theme: CUSTOM_THEMES[theme], customTheme: theme,
    paths: [[[-1, pts[0][1]], ...pts], ...extra.map(br => { const f = branchFull(pts, br); return [[-1, f[0][1]], ...f]; })],
    seed: 31, hpMul: Math.max(0.75, Math.min(1.5, all / 40)) * (1 + hot.length * 0.02),
    goldBonus: extra.length * 40, customPts: pts, hot, customHot: hot, customExtra: extra,
  };
}
// Mã hoá đường tự vẽ thành chuỗi ngắn (mỗi điểm 2 ký tự base-36) để chia sẻ qua liên kết
// Định dạng: <điểm đường>[-<ô nóng>], mỗi ô 2 ký tự base-36
const encCells = cells => cells.map(([x, y]) => x.toString(36) + y.toString(36)).join('');
function decCells(str) {
  if (!/^[0-9a-z]*$/i.test(str) || str.length % 2) return null;
  const out = []; for (let i = 0; i < str.length; i += 2) out.push([parseInt(str[i], 36), parseInt(str[i + 1], 36)]);
  return out.every(([x, y]) => x < COLS && y < ROWS) ? out : null;
}
function encodeCustomPts(pts, hot = [], extra = [], theme = 0) { return [pts, ...extra].map(encCells).join('.') + (hot.length ? '-' + encCells(hot) : '') + (theme ? '~' + theme : ''); }
// Trả về { pts, hot } hoặc null nếu mã không hợp lệ
function decodeCustomMap(str) {
  if (typeof str !== 'string' || str.length > 200) return null;
  const [body, th = '0'] = str.split('~'), theme = +th;
  if (!Number.isInteger(theme) || !CUSTOM_THEMES[theme]) return null;
  const [a, b = ''] = body.split('-');
  const parts = a.split('.'); if (parts.length > 3) return null;
  const pts = decCells(parts[0]), hot = decCells(b), extra = parts.slice(1).map(decCells);
  if (!pts || !hot || pts.length < 2 || hot.length > 8 || validateCustomPath(pts)) return null;
  if (extra.some(br => !br || validateBranch(pts, br))) return null;
  const onPath = new Set([pts, ...extra].flatMap(p => pathTiles(p)).map(c => c + ''));
  return { pts, extra, theme, hot: hot.filter(c => !onPath.has(c + '')) };
}
function decodeCustomPts(str) { const m = decodeCustomMap(str); return m ? m.pts : null; }
const CUSTOM_MAP_INDEX = MAPS.length;
MAPS.push(makeCustomMap([[0, 2], [6, 2], [6, 8], [12, 8], [12, 3], [18, 3]]));
function setCustomMap(pts, hot = [], extra = [], theme = 0) { MAPS[CUSTOM_MAP_INDEX] = makeCustomMap(pts, hot, extra, theme); return MAPS[CUSTOM_MAP_INDEX]; }

// Đường đi theo pixel, có độ dài tích luỹ để tính vị trí theo quãng đường.
class Path {
  constructor(tilePts) {
    this.pts = tilePts.map(([cx, cy]) => ({ x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE }));
    this.cum = [0];
    for (let i = 1; i < this.pts.length; i++) {
      const a = this.pts[i - 1], b = this.pts[i];
      this.cum.push(this.cum[i - 1] + Math.hypot(b.x - a.x, b.y - a.y));
    }
    this.length = this.cum[this.cum.length - 1];
  }
  // seg: chỉ số đoạn hiện tại (gợi ý) để tìm nhanh O(1)
  posAt(d, seg = 0, lane = 0) {
    const n = this.pts.length - 1;
    if (seg >= n) seg = n - 1;
    while (seg < n - 1 && d > this.cum[seg + 1]) seg++;
    while (seg > 0 && d < this.cum[seg]) seg--;
    const a = this.pts[seg], b = this.pts[seg + 1];
    const len = this.cum[seg + 1] - this.cum[seg] || 1;
    const t = Math.max(0, Math.min(1, (d - this.cum[seg]) / len));
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    let nx = -Math.sin(ang), ny = Math.cos(ang);
    // Trộn pháp tuyến trước/sau góc cua: đổi hướng liên tục, không nhảy làn.
    const blend = Math.min(TILE * 0.65, len / 2);
    if (lane && seg > 0 && d - this.cum[seg] < blend) {
      const prev = this.pts[seg - 1], pa = Math.atan2(a.y - prev.y, a.x - prev.x);
      const k = 0.5 + 0.5 * Math.max(0, d - this.cum[seg]) / blend;
      nx = -Math.sin(pa) * (1 - k) + nx * k; ny = Math.cos(pa) * (1 - k) + ny * k;
    } else if (lane && seg < n - 1 && this.cum[seg + 1] - d < blend) {
      const next = this.pts[seg + 2], na = Math.atan2(next.y - b.y, next.x - b.x);
      const k = 0.5 * (1 - Math.max(0, this.cum[seg + 1] - d) / blend);
      nx = nx * (1 - k) - Math.sin(na) * k; ny = ny * (1 - k) + Math.cos(na) * k;
    }
    // Thu đội hình ở cổng trong cùng để tất cả quái chạm đúng mục tiêu.
    const spread = Math.min(1, Math.max(0, (this.length - d) / TILE));
    return { x: a.x + (b.x - a.x) * t + nx * lane * spread, y: a.y + (b.y - a.y) * t + ny * lane * spread, seg, ang };
  }
}

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Tạo dữ liệu bản đồ: lưới (0 trống, 1 đường, 2 vật cản, 3 lâu đài), các Path, đường bay.
function buildMap(def) {
  const grid = [];
  for (let y = 0; y < ROWS; y++) grid.push(new Array(COLS).fill(0));
  const mark = (x, y, v) => { if (x >= 0 && y >= 0 && x < COLS && y < ROWS) grid[y][x] = v; };
  for (const wp of def.paths) {
    for (let i = 1; i < wp.length; i++) {
      let [x0, y0] = wp[i - 1]; const [x1, y1] = wp[i];
      const dx = Math.sign(x1 - x0), dy = Math.sign(y1 - y0);
      mark(x0, y0, 1);
      while (x0 !== x1 || y0 !== y1) { x0 += dx; y0 += dy; mark(x0, y0, 1); }
    }
  }
  const end = def.paths[0][def.paths[0].length - 1];
  // Sân thành 3×3 ô bảo vệ Lumi: không cho xây tháp xuyên tường hoặc lên nhân vật.
  const fortCX = Math.max(1, Math.min(COLS - 2, end[0])), fortCY = Math.max(1, Math.min(ROWS - 2, end[1]));
  for (let y = fortCY - 1; y <= fortCY + 1; y++) for (let x = fortCX - 1; x <= fortCX + 1; x++) mark(x, y, 3);

  // Vật cản trang trí (cây/đá) – rải ngẫu nhiên có hạt giống, không đè lên đường
  const rnd = mulberry32(def.seed);
  const decos = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (grid[y][x] !== 0) continue;
    let nearPath = false;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = x + i, gy = y + j;
      if (gx >= 0 && gy >= 0 && gx < COLS && gy < ROWS && grid[gy][gx] === 1) nearPath = true;
    }
    const r = rnd();
    if (r < (nearPath ? 0.03 : 0.09)) { grid[y][x] = 2; decos.push({ x, y, v: rnd() }); }
  }

  // Ô nóng (giá trị 4): xây được, tháp trên đó mạnh hơn
  for (const [x, y] of def.hot || []) if (grid[y] && grid[y][x] !== 1 && grid[y][x] !== 3) { grid[y][x] = 4; }
  for (let i = decos.length - 1; i >= 0; i--) if (grid[decos[i].y][decos[i].x] === 4) decos.splice(i, 1);
  const paths = def.paths.map(p => new Path(p));
  // Quái bay đi thẳng từ cổng tới lâu đài
  const clampT = (v, n) => Math.max(0, Math.min(n - 1, v));
  const flyPaths = def.paths.map(p => new Path([[clampT(p[0][0], COLS), clampT(p[0][1], ROWS)], p[p.length - 1]]));
  return { def, grid, paths, flyPaths, decos, castle: { x: (end[0] + 0.5) * TILE, y: (end[1] + 0.5) * TILE, cx: end[0], cy: end[1] } };
}
