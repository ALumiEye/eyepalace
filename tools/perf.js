// Đo hiệu năng logic trong tình huống nặng: 40 tháp sát đường + ~300 quái liên tục, tốc độ x4.
// Chạy: node tools/perf.js [mapIndex]
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, Math, Set, Map, Object, Array, JSON, performance };
vm.createContext(ctx);
for (const f of ['config', 'maps', 'entities', 'waves', 'game']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
ctx.mi = +(process.argv[2] || 4);
vm.runInContext(`
const g = new Game(mi, 'normal', ['sandbox']); g.gold = 1e9; const G = g.map.grid; const types = Object.keys(TOWERS); let k = 0;
const near = (x, y) => [[1,0],[-1,0],[0,1],[0,-1]].some(([a, b]) => G[y + b] && G[y + b][x + a] === 1);
for (let y = 0; y < ROWS && g.towers.length < 40; y++) for (let x = 0; x < COLS && g.towers.length < 40; x++)
  if ((G[y][x] === 0 || G[y][x] === 4) && near(x, y) && (x + y) % 2 === 0) { const t = g.build(types[k++ % types.length], x, y); if (t) { g.upgrade(t); g.upgrade(t); } }
g.wave = 25; g.startWave(); g.spawns = [];
const et = Object.keys(ENEMIES).filter(t => !ENEMIES[t].boss);
const sp = () => { const e = g.spawn(et[Math.floor(Math.random() * et.length)], Math.floor(Math.random() * g.paths.length), 6); e.dist = Math.random() * e.path.length * 0.8; };
for (let i = 0; i < 300; i++) sp();
let tot = 0, max = 0, peakFx = 0; const N = 600;
for (let i = 0; i < N; i++) {
  const a = performance.now(); for (let s = 0; s < 4; s++) g.update(1 / 60); const d = performance.now() - a;
  tot += d; max = Math.max(max, d); peakFx = Math.max(peakFx, g.fx.parts.length + g.projectiles.length);
  while (g.enemies.length < 300) sp(); g.lives = 99;
}
console.log('tháp', g.towers.length, '| quái ~300 | hạt+đạn tối đa', peakFx);
console.log('logic x4 / khung hình: trung bình', (tot / N).toFixed(2), 'ms, tối đa', max.toFixed(2), 'ms (ngân sách 16,7 ms)');
`, ctx);
