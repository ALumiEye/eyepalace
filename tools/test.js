// Kiểm thử logic game (không cần trình duyệt). Chạy: node tools/test.js
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const ctx = { console, Math, Set, Map, Object, Array, JSON };
vm.createContext(ctx);
for (const f of ['config', 'maps', 'entities', 'waves', 'game']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
}
const run = code => vm.runInContext(code, ctx);

let pass = 0, fail = 0;
function test(name, code) {
  try {
    const r = run(`(() => { ${code} })()`);
    if (r === true) { pass++; console.log('  ✓ ' + name); }
    else { fail++; console.log('  ✗ ' + name + ' → ' + JSON.stringify(r)); }
  } catch (e) { fail++; console.log('  ✗ ' + name + ' → lỗi: ' + e.message); }
}

// Hàm tiện ích trong context
run(`
  function freeCell(g, x0 = 5, y0 = 5) {
    for (let d = 0; d < 12; d++) for (let y = y0 - d; y <= y0 + d; y++) for (let x = x0 - d; x <= x0 + d; x++) if (g.canPlace(x, y)) return [x, y];
  }
  function step(g, sec) { for (let i = 0; i < sec * 60; i++) g.update(1 / 60); }
`);

console.log('Xây & tiền');
test('xây trừ đúng giá', `const g = new Game(0, 'normal'); const g0 = g.gold; const [x, y] = freeCell(g); g.build('archer', x, y); return g.gold === g0 - 50;`);
test('không xây trên đường', `const g = new Game(0, 'normal'); return g.build('archer', 3, 2) === null;`);
test('không xây chồng', `const g = new Game(0, 'normal'); const [x, y] = freeCell(g); g.build('archer', x, y); return g.build('cannon', x, y) === null;`);
test('không đủ vàng thì không xây', `const g = new Game(0, 'normal'); g.gold = 10; const [x, y] = freeCell(g); return g.build('archer', x, y) === null;`);
test('bán nhận 70%', `const g = new Game(0, 'normal'); const [x, y] = freeCell(g); const t = g.build('archer', x, y); const g1 = g.gold; g.sell(t); return g.gold - g1 === Math.floor(50 * 0.7);`);

console.log('Nâng cấp & nhánh');
test('nâng cấp 3 cấp rồi chọn nhánh', `const g = new Game(0, 'normal'); g.gold = 9999; const [x, y] = freeCell(g); const t = g.build('archer', x, y);
  g.upgrade(t); g.upgrade(t); const ok1 = t.canBranch; g.upgrade(t, 1); return ok1 && t.branch === 1 && t.maxed && t.stats.pierce === true;`);
test('tiền đầu tư cộng dồn đúng', `const g = new Game(0, 'normal'); g.gold = 9999; const [x, y] = freeCell(g); const t = g.build('cannon', x, y);
  g.upgrade(t); g.upgrade(t); g.upgrade(t, 0); return t.invested === 80 + 95 + 170 + 320;`);

console.log('Hoàn tác');
test('hoàn tác xây hoàn 100%', `const g = new Game(0, 'normal'); const g0 = g.gold; const [x, y] = freeCell(g); g.build('archer', x, y); g.undo(); return g.gold === g0 && g.towers.length === 0;`);
test('hoàn tác nâng cấp', `const g = new Game(0, 'normal'); g.gold = 999; const [x, y] = freeCell(g); const t = g.build('archer', x, y); const g1 = g.gold; g.upgrade(t); g.undo(); return t.level === 0 && g.gold === g1;`);
test('hoàn tác bán', `const g = new Game(0, 'normal'); const [x, y] = freeCell(g); const t = g.build('archer', x, y); const g1 = g.gold; g.sell(t); g.undo(); return g.towers.length === 1 && g.gold === g1;`);
test('không hoàn tác sau khi gọi đợt', `const g = new Game(0, 'normal'); const [x, y] = freeCell(g); g.build('archer', x, y); g.startWave(); return g.canUndo === false && g.undo() === false;`);

console.log('Chiến đấu');
test('giáp không trừ hết sát thương liên tục (DoT)', `const g = new Game(0, 'normal'); const e = g.spawn('tank', 0, 3); const h0 = e.hp;
  for (let i = 0; i < 60; i++) e.damage(20 / 60, g, null, false, 1 / 60); return h0 - e.hp > 20 * 0.6;`);
test('khiên chặn phát bắn đơn nhưng không chặn sát thương lan', `const g = new Game(0, 'normal'); const e = g.spawn('knight', 0, 1); const sh = e.shield, h0 = e.hp;
  e.damage(10, g, null); const blocked = e.hp === h0 && e.shield === sh - 1; e.damage(10, g, null, false, 0, true); return blocked && e.hp < h0;`);
test('Bóng Ma không bị nhắm khi chưa lộ', `const g = new Game(0, 'normal'); const [x, y] = freeCell(g, 10, 10); const t = g.build('archer', x, y);
  const e = g.spawn('ghost', 0, 1); e.x = t.x + TILE * 2; e.y = t.y; g.updateReveal(); return !t.canHit(e);`);
test('Mắt Thần làm lộ Bóng Ma', `const g = new Game(0, 'normal'); g.gold = 999; const [x, y] = freeCell(g, 10, 10); const t = g.build('eye', x, y);
  const e = g.spawn('ghost', 0, 1); e.x = t.x + TILE * 2; e.y = t.y; g.updateReveal(); return e.revealed === true;`);
test('Chuột Chũi dưới đất miễn sát thương lan', `const g = new Game(0, 'normal'); const e = g.spawn('mole', 0, 1); e.under = true;
  const p = new Projectile('shell', { x: e.x, y: e.y }, null, 100, 0, { tx: e.x, ty: e.y, flight: 0.01, splash: 50 }); p.t = 1; const h0 = e.hp; p.update(0.02, g); return e.hp === h0;`);
test('Pháo không bắn quái bay', `const g = new Game(0, 'normal'); const [x, y] = freeCell(g); const t = g.build('cannon', x, y); const e = g.spawn('bat', 0, 1); return !t.canHit(e);`);

test('Phù Thủy làm tê liệt tháp gần nhất', `const g = new Game(0, 'normal'); const [x, y] = freeCell(g, 2, 3); const t = g.build('archer', x, y);
  const e = g.spawn('hexer', 0, 1); e.x = t.x + TILE; e.y = t.y; e.hexT = 0.01; e.dist = 1e9; e.update = Enemy.prototype.update;
  e.path = { length: 1e12, posAt: () => ({ x: t.x + TILE, y: t.y, seg: 0, ang: 0 }) }; e.update(0.02, g); return t.disabledT > 0;`);

test('Tháp Độc cộng dồn lớp & gây sát thương theo thời gian', `const g = new Game(0, 'normal'); const e = g.spawn('tank', 0, 1); const h0 = e.hp;
  for (let i = 0; i < 8; i++) e.applyPoison(10, 4, 5, null); e.dist = 100; g.state = 'wave'; g.spawns = [{ t: 1e9 }]; step(g, 1);
  return e.poisonStacks === 5 && h0 - e.hp > 30;`);
test('Axit giảm 50% giáp khi trúng độc', `const g = new Game(0, 'normal'); const e = g.spawn('tank', 0, 1); const a = e.armor; e.applyPoison(1, 4, 6, null, { corrode: true });
  const h0 = e.hp; e.damage(20, g, null); return Math.abs((h0 - e.hp) - (20 - a * 0.5)) < 1e-6;`);

test('Tháp Độc ưu tiên quái chưa đủ lớp độc', `const g = new Game(0, 'normal'); g.gold = 999; const [x, y] = freeCell(g, 2, 3); const t = g.build('poison', x, y);
  const a = g.spawn('tank', 0, 1), b = g.spawn('tank', 0, 1); a.x = t.x + 30; a.y = t.y; b.x = t.x + 40; b.y = t.y; a.dist = 500; b.dist = 400;
  a.applyPoison(1, 4, 4, null, { stacks: 4 }); t.cd = 0; g.projectiles = []; t.update(1/60, g); const p = g.projectiles[0]; return p && p.target === b;`);

console.log('Đài Chỉ Huy');
test('tăng sát thương tháp kề bên, không cộng dồn', `const g = new Game(0, 'normal'); g.gold = 9999;
  const [x, y] = freeCell(g, 10, 10); const a = g.build('archer', x, y);
  const near = []; for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) if (g.canPlace(x+dx, y+dy)) near.push([x+dx, y+dy]);
  g.build('banner', ...near[0]); g.build('banner', ...near[1]); g.applySupport();
  return Math.abs(a.buff - 0.15) < 1e-9 && Math.abs(a.stats.dmg - 9 * 1.15) < 1e-9 && a.baseStats.dmg === 9;`);

test('ô nóng Núi Lửa: +25% sát thương', `const mi = MAPS.findIndex(m => m.id === 'volcano'); const g = new Game(mi, 'normal'); g.gold = 999;
  const t = g.build('archer', 4, 3); g.applySupport(); return t && t.hot && Math.abs(t.stats.dmg - 9 * 1.25) < 1e-9;`);

console.log('Đêm tối & thử thách');
test('đợt đêm giảm tầm 20% (trừ Mắt Thần)', `const g = new Game(0, 'normal'); g.gold = 999; const [x, y] = freeCell(g); const a = g.build('archer', x, y);
  const [x2, y2] = freeCell(g, 12, 6); const e = g.build('eye', x2, y2); const r0 = a.rangePx; g.wave = 4; g.startWave();
  return g.night && Math.abs(a.rangePx - r0 * 0.8) < 1e-9 && e.rangeMul === 1;`);
test('Mong Manh: máu còn 1/4', `const g = new Game(0, 'normal', { mods: ['fragile'] }); return g.lives === 5;`);
test('Không Hối Hận: không bán được', `const g = new Game(0, 'normal', { mods: ['noSell'] }); const [x, y] = freeCell(g); const t = g.build('archer', x, y); g.sell(t); return g.towers.length === 1;`);
test('Tay Không: không dùng kỹ năng', `const g = new Game(0, 'normal', { mods: ['noAbility'] }); g.cooldowns.meteor = 0; return g.useAbility('meteor', 100, 100) === false;`);

test('Thử Nghiệm: vàng vô hạn, điểm 0', `const g = new Game(0, 'normal', { mods: ['sandbox'] }); g.gold = 10; g.update(1/60); return g.gold > 500000 && g.score === 0;`);

console.log('Bản đồ & đợt');
test('mọi bản đồ có đường hợp lệ & lâu đài', `for (let i = 0; i < MAPS.length; i++) { const g = new Game(i, 'normal'); if (!g.paths.every(p => p.length > TILE * 5)) return 'map ' + i;
  const c = g.map.castle; if (g.map.grid[c.cy][c.cx] !== 3) return 'castle ' + i; } return true;`);
test('bản đồ ngẫu nhiên tất định theo mã', `const a = JSON.stringify(makeRandomMap(123).paths), b = JSON.stringify(makeRandomMap(123).paths), c = JSON.stringify(makeRandomMap(124).paths); return a === b && a !== c;`);
test('bản đồ ngẫu nhiên luôn tiến sang phải', `for (let sd = 1; sd < 200; sd++) { const p = makeRandomMap(sd).paths[0]; for (let i = 1; i < p.length; i++) if (p[i][0] < p[i-1][0]) return sd; } return true;`);
test('bản đồ tự vẽ: kiểm tra đường hợp lệ', `return validateCustomPath([[0,9],[8,9],[8,2],[14,2],[14,7],[19,7]]) === '' &&
  validateCustomPath([[0,2],[5,2],[5,5],[2,5],[2,1]]).includes('đè') && validateCustomPath([[1,2],[5,2]]) !== '' && validateCustomPath([[0,2],[3,5]]) !== '' && validateCustomPath([[0,2],[5,2]]).includes('ngắn');`);
test('mã hoá/giải mã liên kết bản đồ tự vẽ', `const p = [[0,9],[8,9],[8,2],[14,2],[14,7],[19,7]]; const e = encodeCustomPts(p);
  return JSON.stringify(decodeCustomPts(e)) === JSON.stringify(p) && decodeCustomPts('zz') === null && decodeCustomPts('<script>') === null && decodeCustomPts('0002') === null;`);
test('liên kết bản đồ tự vẽ mang theo ô nóng', `const p = [[0,9],[8,9],[8,2],[14,2],[14,7],[19,7]], h = [[9,4],[13,8]]; const m = decodeCustomMap(encodeCustomPts(p, h));
  setCustomMap(m.pts, m.hot); const g = new Game(CUSTOM_MAP_INDEX, 'normal'); return m.hot.length === 2 && g.map.grid[4][9] === 4 && decodeCustomMap(encodeCustomPts(p, [[8,5]])).hot.length === 0;`);
test('bản đồ tự vẽ nhiều cổng: nhánh nhập đường chính & liên kết', `const p = [[0,9],[8,9],[8,2],[14,2],[14,7],[19,7]], br = [[0,3],[5,3],[5,5],[8,5]]; const m = decodeCustomMap(encodeCustomPts(p, [], [br]));
  setCustomMap(m.pts, m.hot, m.extra); const g = new Game(CUSTOM_MAP_INDEX, 'normal'); g.wave = 3; g.startWave(); step(g, 6);
  return m.extra.length === 1 && g.map.paths.length === 2 && g.enemies.some(e => e.pathIdx === 1) && validateBranch(p, [[0,1],[8,1],[8,4]]) !== '' && decodeCustomMap(encodeCustomPts(p, [], [[[0,9],[3,9]]])) === null;`);
test('liên kết bản đồ tự vẽ mang theo chủ đề', `const p = [[0,9],[8,9],[8,2],[14,2],[14,7],[19,7]]; const m = decodeCustomMap(encodeCustomPts(p, [[9,4]], [], 2));
  setCustomMap(m.pts, m.hot, m.extra, m.theme); return m.theme === 2 && MAPS[CUSTOM_MAP_INDEX].theme.deco === 'lava' && decodeCustomMap(encodeCustomPts(p)).theme === 0 && decodeCustomMap(encodeCustomPts(p) + '~99') === null;`);
test('gợi ý đường trong trình vẽ luôn hợp lệ', `for (let k = 1; k <= 200; k++) { const r = suggestCustomPath(k * 13); if (!r || validateCustomPath(r.pts) || r.hot.length > 8) return false; } return true;`);
test('gợi ý khi thua theo loại quái lọt', `const r = lossAdvice({ bat: 6, grunt: 2, ghost: 1 }, [], 14); const r2 = lossAdvice({ ghost: 5 }, [{ type: 'eye' }], 20);
  return r.top[0].type === 'bat' && r.tips[0] === LOSS_TIPS.air && r.tips.length === 3 && !r2.tips.includes(LOSS_TIPS.ghost) && r2.tips[0] === LOSS_TIPS.boss && lossAdvice({}, [], 3).top.length === 0;`);
test('lọt 3 quái cùng nhóm trong đợt → gợi ý 1 lần', `const g = new Game(0, 'normal'); const evs = []; g.onEvent = (e, a) => { if (e === 'leakTip') evs.push(a); }; g.startWave();
  for (let i = 0; i < 7; i++) g.enemyEscaped(g.spawn('bat', 0, 1)); g.enemyEscaped(g.spawn('tank', 0, 1));
  return evs.length === 1 && evs[0] === 'air';`);
test('thua chỉ phát sự kiện over một lần dù nhiều quái lọt cùng lúc', `const g = new Game(0, 'normal'); let n = 0; g.onEvent = e => { if (e === 'over') n++; }; g.startWave(); g.lives = 2;
  for (let i = 0; i < 6; i++) { const e = g.spawn('runner', 0, 1); e.dist = e.path.length - 1; } g.update(1/60);
  return g.state === 'over' && n === 1 && g.lives === 0 && g.stats.leaked === 2;`);
test('bản đồ tự vẽ chơi được', `setCustomMap([[0,9],[8,9],[8,2],[14,2],[14,7],[19,7]]); const g = new Game(CUSTOM_MAP_INDEX, 'normal'); g.startWave(); step(g, 3); return g.enemies.length > 0 && g.map.castle.cx === 19;`);
test('báo trước cổng khớp với quái sinh ra', `const g = new Game(4, 'normal'); g.wave = 6; const pred = gateCounts(7, 3); g.startWave(); const real = [0,0,0]; g.spawns.forEach(s => real[s.pathIdx]++); return JSON.stringify(pred) === JSON.stringify(real);`);
test('đợt 20 có Long Vương, đợt 30 có Vua Nhớt', `return makeWave(20).some(e => e.type === 'dragonboss') && makeWave(30).some(e => e.type === 'slimeking');`);
test('Vua Nhớt chết tách 4 Nhớt Mẹ', `const g = new Game(0, 'normal'); const k = g.spawn('slimeking', 0, 1); k.dist = 200; const n0 = g.enemies.length; k.damage(1e9, g, null, true); return g.enemies.filter(e => e.type === 'slime').length === 4;`);
test('đợt trùm có trùm', `return [10, 20, 30].every(n => makeWave(n).some(e => e.type === 'boss'));`);
test('hết đợt nhận thưởng & về giai đoạn chuẩn bị', `const g = new Game(0, 'normal'); g.startWave(); g.spawns = []; g.enemies = []; const g0 = g.gold; g.update(1/60); return g.state === 'build' && g.gold > g0;`);
test('hết máu thì thua', `const g = new Game(0, 'normal'); g.startWave(); g.lives = 1; const e = g.spawn('grunt', 0, 1); e.dist = e.path.length - 1; step(g, 1); return g.state === 'over';`);

test('điểm chỉ tính đợt đã hoàn thành', `const g = new Game(0, 'normal'); const s0 = g.score; g.startWave(); const s1 = g.score; g.spawns = []; g.enemies = []; g.update(1/60); return s1 === s0 && g.score > s1;`);

test('đợt hoàn hảo thưởng thêm, lọt quái thì không', `const g = new Game(0, 'normal'); g.startWave(); g.spawns = []; g.enemies = []; const g0 = g.gold; g.update(1/60);
  const perfectGain = g.gold - g0; const g2 = new Game(0, 'normal'); g2.startWave(); g2.spawns = []; const e = g2.spawn('grunt', 0, 1); e.dist = e.path.length - 1; g2.update(1/60); g2.update(1/60);
  const g1 = g2.gold; return perfectGain > 25 && g2.perfectStreak === 0 && g2.waveLeaks === 1;`);

console.log('Lưu / tải');
test('lưu rồi tải giữ nguyên tháp, vàng, nhánh', `const g = new Game(2, 'hard', { mods: ['fast'] }); g.gold = 5000;
  const [x, y] = freeCell(g); const t = g.build('tesla', x, y); g.upgrade(t); g.upgrade(t); g.upgrade(t, 1); g.wave = 7; g.perfectStreak = 4;
  const s = JSON.parse(JSON.stringify(g.serialize())); const h = new Game(s.mapIndex, s.diff, { mods: s.mods }); const refund = h.restore(s);
  const u = h.towerAt[y][x]; return refund === 0 && h.gold === g.gold && h.wave === 7 && h.perfectStreak === 4 && u && u.branch === 1 && u.level === 3 && u.stats.stun > 0 && h.mods.has('fast');`);
test('ván lưu tìm bản đồ theo mã, không theo chỉ số', `const g = new Game(MAPS.findIndex(m => m.id === 'volcano'), 'normal'); const s = g.serialize();
  s.mapIndex = 0; return Game.mapIndexOf(s) === MAPS.findIndex(m => m.id === 'volcano') && Game.mapIndexOf({ mapIndex: 2 }) === 2;`);
test('ván lưu hỏng bị nhận diện', `return !Game.validSave({ mapIndex: 99 }) && !Game.validSave(null) && !Game.validSave({ mapIndex: 0, diff: 'x', towers: [], gold: 1 });`);
test('tháp sai ô / loại lạ được hoàn tiền', `const g = new Game(0, 'normal'); const refund = g.restore({ gold: 0, lives: 20, wave: 1, towers: [{ type: 'archer', cx: 3, cy: 2, invested: 100 }, { type: 'laser', cx: 6, cy: 6, invested: 200 }] });
  return refund === 210 && g.towers.length === 0 && g.gold === 210;`);

test('gợi ý chiến thuật: nhắc Mắt Thần khi có Bóng Ma', `const n = [11,12,13,14,15,16,17,18,19,20].find(n => makeWave(n).some(e => e.type === 'ghost'));
  const g = new Game(0, 'normal'); return waveAdvice(n, g.towers).some(t => t.includes('Mắt Thần')) && !waveAdvice(n, [{ type: 'eye', def: TOWERS.eye }]).some(t => t.includes('Bóng Ma'));`);

test('Yêu Tinh Vàng lọt không trừ máu, không phá đợt hoàn hảo', `const g = new Game(0, 'normal'); g.startWave(); g.spawns = []; const l0 = g.lives;
  const e = g.spawn('goldgob', 0, 1); e.dist = e.path.length - 1; g.update(1/60); g.update(1/60); return g.lives === l0 && !g.waveLeaks;`);

console.log('Rương vàng');
test('trùm luôn rơi rương, nhặt được vàng', `const g = new Game(0, 'normal'); g.wave = 10; const e = g.spawn('boss', 0, 0.01); e.damage(1e6, g, null, true);
  const c = g.chests[0]; const g0 = g.gold; return !!c && g.collectAt(c.x, c.y) && g.gold === g0 + c.value && g.chests.length === 0;`);
test('rương biến mất sau 8 giây', `const g = new Game(0, 'normal'); g.chests.push({ x: 0, y: 0, value: 1, life: 8, max: 8 }); g.state = 'wave'; g.spawns = [{ t: 1e9 }]; step(g, 8.2); return g.chests.length === 0;`);

console.log('Đại lộ & thành bảo vệ Lumi');
test('ba quái cùng đường có ba làn khác nhau', `const g = new Game(0, 'normal'); const a = [0,1,2].map(() => g.spawn('grunt', 0, 1, 100)); return new Set(a.map(e => e.y)).size === 3 && a.every(e => Math.abs(e.lane) + e.d.radius < ROAD_WIDTH / 2);`);
test('mỗi cổng chia làn độc lập, trùm và quái bay đi giữa', `const g = new Game(4, 'normal'); const out = [[],[],[]]; for(let i=0;i<9;i++) out[i%3].push(g.spawn('grunt',i%3,1).lane); return out.every(a => new Set(a).size === 3) && g.spawn('boss',0,1).lane === 0 && g.spawn('bat',0,1).lane === 0;`);
test('làn qua góc cua liên tục và hội tụ đúng điểm cuối', `const p = new Path([[0,2],[3,2],[3,8],[8,8]]); for (const lane of [-ROAD_LANE, ROAD_LANE]) { for (const d of p.cum.slice(1,-1)) {const a=p.posAt(d-.001,0,lane),b=p.posAt(d+.001,0,lane); if(Math.hypot(a.x-b.x,a.y-b.y)>.01) return false;} const q=p.posAt(p.length,0,lane),c=p.pts.at(-1); if(q.x!==c.x||q.y!==c.y)return false;} return true;`);
test('quái không trượt ngoài mặt đường trên mọi bản đồ', `for (const def of MAPS) for(const p of buildMap(def).paths) for(let d=0;d<p.length;d+=7) for(const lane of [-ROAD_LANE,ROAD_LANE]) { const c=p.posAt(d),q=p.posAt(d,0,lane); if(!Number.isFinite(q.x)||Math.hypot(c.x-q.x,c.y-q.y)>ROAD_LANE+.001)return false; } return true;`);
test('sân thành 3×3 ô cấm xây cả ở bản đồ sát mép', `return MAPS.every((m,i)=>{const g=new Game(i,'normal'),cx=Math.max(1,Math.min(COLS-2,g.map.castle.cx)),cy=Math.max(1,Math.min(ROWS-2,g.map.castle.cy)); for(let y=cy-1;y<=cy+1;y++)for(let x=cx-1;x<=cx+1;x++)if(g.canPlace(x,y))return false; return true;});`);
test('báo động theo máu thành và quái áp sát, không theo quái thưởng', `const g = new Game(0,'normal'); if(siegeStatus(g).level!==0)return false;const e=g.spawn('grunt',0,1);e.dist=e.path.length-3*TILE;if(siegeStatus(g).level!==1)return false;e.alive=false;const b=g.spawn('boss',0,1);b.dist=b.path.length-2*TILE;if(siegeStatus(g).level!==2)return false;b.alive=false;const gold=g.spawn('goldgob',0,1);gold.dist=gold.path.length-TILE;if(siegeStatus(g).level!==0)return false;g.lives=2;if(siegeStatus(g).level!==2)return false;g.state='over';return siegeStatus(g).level===0;`);
test('bộ binh ra theo tổ ba, giữ tổng số và lịch tăng dần', `for(let n=1;n<=40;n++){const ev=makeWave(n);if(ev.some((e,i)=>i&&e.t<ev[i-1].t))return false;} const a=makeWave(1).filter(e=>e.type==='grunt');return a.length===6&&a[2].t-a[0].t<=.2&&a[3].t>2;`);

console.log(`\n${pass} đạt, ${fail} lỗi`);
process.exit(fail ? 1 : 0);
