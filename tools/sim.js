// Mô phỏng không giao diện để kiểm tra lỗi & cân bằng.
// Chạy: node tools/sim.js [mapIndex] [diff] [số ván]   (CUSTOM=<mã> + map 9 = bản đồ tự vẽ)
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, Math, Set, Map, Object, Array, JSON };
vm.createContext(ctx);
for (const f of ['config', 'maps', 'entities', 'waves', 'game']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
vm.runInContext(`
// Bot đơn giản: đặt tháp ở ô phủ nhiều đường nhất, xen kẽ loại tháp, nâng cấp khi dư vàng
function coverage(g, cx, cy, range) {
  const x = (cx + .5) * TILE, y = (cy + .5) * TILE, r2 = (range * TILE) ** 2; let c = 0;
  // Trọng số theo số quái sắp ra ở mỗi cổng (bot "đọc" báo cổng như người chơi)
  const cnt = g.paths.length > 1 ? gateCounts(g.wave + 1, g.paths.length) : [1];
  const tot = cnt.reduce((a, b) => a + b, 0) || 1;
  g.paths.forEach((p, i) => {
    const w = g.paths.length > 1 ? 0.4 + 1.6 * cnt[i] / tot * g.paths.length / 2 : 1;
    for (let d = 0; d < p.length; d += 12) { const q = p.posAt(d); if ((q.x - x) ** 2 + (q.y - y) ** 2 <= r2) c += w; }
  });
  return c;
}
function flyCoverage(g, cx, cy, range) {
  const x = (cx + .5) * TILE, y = (cy + .5) * TILE, r2 = (range * TILE) ** 2; let c = 0;
  for (const p of g.map.flyPaths) for (let d = 0; d < p.length; d += 12) { const q = p.posAt(d); if ((q.x - x) ** 2 + (q.y - y) ** 2 <= r2) c++; }
  return c;
}
function botTurn(g, plan) {
  for (let guard = 0; guard < 50; guard++) {
    const type = plan[g.towers.length % plan.length];
    const cost = TOWERS[type].levels[0].cost;
    // nâng cấp nếu đã có nhiều tháp
    const up = g.towers.filter(t => !t.maxed).sort((a, b) => a.upgradeCost - b.upgradeCost)[0];
    if (g.towers.length >= 6 && up && g.gold >= up.upgradeCost && (g.towers.length >= 14 || Math.random() < 0.5)) { g.upgrade(up, Math.random() < 0.5 ? 0 : 1); continue; }
    if (g.gold < cost) { if (up && g.gold >= up.costFor(0)) { g.upgrade(up, 0); continue; } break; }
    let best = null, bv = 0;
    for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
      if (!g.canPlace(cx, cy)) continue;
      const rg = TOWERS[type].levels[0].range;
      const v = (coverage(g, cx, cy, rg) + (TOWERS[type].air ? flyCoverage(g, cx, cy, rg) * 1.5 : 0)) * (g.map.grid[cy][cx] === 4 && !TOWERS[type].support ? 1.3 : 1);
      if (v > bv) { bv = v; best = [cx, cy]; }
    }
    if (!best) break;
    g.build(type, best[0], best[1]);
  }
}
function runOne(mapIndex, diff, plan, mods) {
  const g = new Game(mapIndex, diff, { mods });
  let steps = 0;
  while (g.state !== 'over' && g.state !== 'won' && steps < 60 * 60 * 120) {
    if (g.state === 'build') { botTurn(g, plan); g.startWave(); }
    g.update(1 / 60); steps++;
  }
  return { wave: g.wave, state: g.state, lives: g.lives, towers: g.towers.length, kills: g.stats.kills, leak: g.stats.leakBy, gold: Math.round(g.gold), time: Math.round(g.time), score: g.score,
    dmg: Object.fromEntries(Object.keys(TOWERS).map(k => [k, Math.round(g.towers.filter(t => t.type === k).reduce((s, t) => s + t.dmgDealt, 0))])) };
}
`, ctx);
if (process.env.CUSTOM) vm.runInContext(`{ const m = decodeCustomMap(${JSON.stringify(process.env.CUSTOM)}); if (!m) throw new Error('mã CUSTOM sai'); setCustomMap(m.pts, m.hot, m.extra); }`, ctx);
if (process.env.SEED) vm.runInContext(`setRandomSeed(${+process.env.SEED})`, ctx);
const mi = +(process.argv[2] || 0), diff = process.argv[3] || 'normal', n = +(process.argv[4] || 3);
const plans = process.env.SOLO ? ['archer','cannon','tesla','sniper','eye'].map(k=>[k,'frost']) : [['archer', 'cannon', 'frost', 'tesla', 'sniper', 'eye'], ['archer', 'cannon', 'banner', 'tesla', 'sniper', 'eye', 'frost'], ['archer', 'poison', 'cannon', 'frost', 'poison'], ['archer', 'archer', 'cannon'], ['eye', 'frost'], ['tesla', 'sniper', 'frost']];
const t0 = Date.now();
for (const plan of plans) {
  ctx.plan = plan;
  for (let i = 0; i < n; i++) {
    const r = vm.runInContext(`runOne(${mi}, '${diff}', plan, ${JSON.stringify((process.env.MODS||'').split(',').filter(Boolean))})`, ctx);
    console.log(plan.join(',').padEnd(40), JSON.stringify(r));
  }
}
console.log('ms', Date.now() - t0);
