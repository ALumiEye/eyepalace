'use strict';
// ===== Trạng thái & vòng cập nhật của một ván chơi (không phụ thuộc DOM) =====

const MAX_PARTICLES = 600;
// Chế độ hiệu ứng thấp: ít hạt hơn, không rung màn hình
const LOW_FX = { on: false };
const HOT_BUFF = 0.25;   // ô nóng: +25% sát thương

// Mức báo động lấy từ chiến trường thật, dùng chung HUD và canvas.
function siegeStatus(game) {
  const critical = game.lives / game.maxLives <= 0.3;
  let near = 0, boss = false;
  for (const e of game.enemies) if (e.alive && e.d.lives > 0 && e.remaining < 4 * TILE) { near++; if (e.d.boss) boss = true; }
  if (game.isOver) return { level: 0, text: 'PHÒNG TUYẾN ĐÃ VỠ' };
  if (game.sandbox) return { level: 0, text: 'DIỄN TẬP PHÒNG THỦ' };
  if (critical || boss) return { level: 2, text: boss ? 'TRÙM ÁP SÁT — BẢO VỆ LUMI' : 'NGUY CẤP — THÀNH SẮP VỠ' };
  if (near) return { level: 1, text: 'BÁO ĐỘNG — QUÁI ÁP SÁT THÀNH' };
  return { level: 0, text: game.state === 'wave' ? 'GIAO TRANH — GIỮ VỮNG PHÒNG TUYẾN' : 'CHUẨN BỊ PHÒNG TUYẾN' };
}

class Effects {
  constructor() { this.parts = []; this.rings = []; this.bolts = []; this.tracers = []; this.texts = []; this.booms = []; this.fires = []; this.corpses = []; this.beams = []; }
  ring(x, y, r, color, life = 0.5) { if (this.rings.length >= 80) this.rings.shift(); this.rings.push({ x, y, r, color, life, max: life }); }
  bolt(pts) {
    // Tạo đường zig-zag một lần để tránh nhấp nháy quá mạnh
    const segs = [];
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i]; const line = [a];
      const n = 5;
      for (let k = 1; k < n; k++) {
        const t = k / n;
        line.push({ x: a.x + (b.x - a.x) * t + (Math.random() - 0.5) * 14, y: a.y + (b.y - a.y) * t + (Math.random() - 0.5) * 14 });
      }
      line.push(b); segs.push(line);
    }
    this.bolts.push({ segs, life: 0.18, max: 0.18 });
  }
  tracer(x1, y1, x2, y2) { this.tracers.push({ x1, y1, x2, y2, life: 0.15, max: 0.15 }); }
  burst(x, y, color, n = 8, spd = 90, size = 2.5) {
    if (LOW_FX.on) n = Math.ceil(n / 4);
    for (let i = 0; i < n && this.parts.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2, v = spd * (0.4 + Math.random() * 0.8);
      this.parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.3, max: 0.7, color, size });
    }
  }
  explosion(x, y, r) {
    this.booms.push({ x, y, r, life: 0.35, max: 0.35 });
    this.burst(x, y, '#fbbf24', 10, 120, 3);
    this.burst(x, y, '#6b7280', 6, 60, 4);
  }
  fire(x, y, r, dur) { this.fires.push({ x, y, r, life: dur, max: dur }); }
  // Pháo hoa ăn mừng: nhiều chùm hạt màu ở vị trí ngẫu nhiên
  fireworks(n = 8) {
    const cols = ['#f472b6', '#fde047', '#60a5fa', '#4ade80', '#f97316', '#c084fc'];
    for (let i = 0; i < n; i++) {
      const x = W * (0.15 + Math.random() * 0.7), y = H * (0.15 + Math.random() * 0.5);
      this.burst(x, y, cols[i % cols.length], 30, 190, 5);
      this.ring(x, y, 40 + Math.random() * 30, cols[(i + 2) % cols.length], 0.7);
    }
  }
  text(x, y, str, color = '#fde68a') {
    if (this.texts.length >= 60) this.texts.shift();   // giới hạn chữ nổi khi quá đông quái
    this.texts.push({ x, y, str, color, life: 0.9, max: 0.9 });
  }
  update(dt) {
    const step = (arr, fn) => {
      let j = 0;
      for (let i = 0; i < arr.length; i++) { const o = arr[i]; o.life -= dt; if (fn) fn(o); if (o.life > 0) arr[j++] = o; }
      arr.length = j;
    };
    step(this.parts, p => { p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; });
    step(this.rings); step(this.fires); step(this.corpses); step(this.beams); step(this.bolts); step(this.tracers); step(this.booms);
    step(this.texts, t => { t.y -= 28 * dt; });
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt);
    if (this.freezeFlash > 0) this.freezeFlash = Math.max(0, this.freezeFlash - dt * 1.2);
  }
}

class Game {
  constructor(mapIndex, diffKey, opts = {}) {
    this.mapIndex = mapIndex;
    this.map = buildMap(MAPS[mapIndex]);
    this.diffKey = diffKey; this.diff = DIFFICULTY[diffKey];
    this.goldMul = this.diff.gold;
    this.mods = new Set(opts.mods || []);
    if (this.mods.has('poor')) this.goldMul *= 0.75;
    this.gold = Math.round((this.diff.startGold + (MAPS[mapIndex].goldBonus || 0)) * (this.mods.has('poor') ? 0.8 : 1));
    this.lives = this.mods.has('fragile') ? Math.ceil(this.diff.lives / 4) : this.diff.lives; this.maxLives = this.lives;
    this.sandbox = this.mods.has('sandbox');
    if (this.sandbox) this.gold = 999999;
    this.wave = 0;                 // số đợt đã bắt đầu
    this.enemies = []; this.towers = []; this.projectiles = [];
    this.spawns = [];              // hàng đợi sinh quái của các đợt đang chạy
    this.time = 0;
    this.state = 'build';          // build | wave | over | won
    this.endless = false;
    this.fx = new Effects();
    this.sfx = opts.sfx || (() => {});
    this.onEvent = opts.onEvent || (() => {});
    this.stats = { kills: 0, goldEarned: 0, leaked: 0 };
    this.towerAt = [];
    for (let y = 0; y < ROWS; y++) this.towerAt.push(new Array(COLS).fill(null));
    this.cooldowns = { meteor: 8, freeze: 15 };
    this.livesHistory = [{ wave: 0, lives: this.lives }];
    this.chests = [];    // rương vàng rơi ra, nhấn để nhặt
    this.history = [];   // thao tác có thể hoàn tác trong giai đoạn chuẩn bị
  }

  abilityReady(k) { return !this.mods.has('noAbility') && this.cooldowns[k] <= 0 && !this.isOver; }
  get canSell() { return !this.mods.has('noSell'); }

  // Điểm: đợt, quái hạ, máu còn lại – nhân theo thử thách & độ khó
  get scoreMul() {
    let m = 1 + [...this.mods].reduce((a, k) => a + MODIFIERS[k].score, 0);
    return m * ({ easy: 0.7, normal: 1, hard: 1.5 }[this.diffKey] || 1);
  }
  get score() {
    if (this.sandbox) return 0;
    // Chỉ tính các đợt đã hoàn thành (đợt đang đánh / đợt thua chưa tính)
    const reached = this.state === 'over' || this.state === 'wave' ? this.wave - 1 : this.wave;
    return Math.round((reached * 100 + this.stats.kills * 2 + this.lives * 40) * this.scoreMul);
  }

  useAbility(k, x, y) {
    if (!this.abilityReady(k)) return false;
    const a = ABILITIES[k];
    this.cooldowns[k] = a.cd;
    if (k === 'meteor') {
      const p = new Projectile('meteor', { x: x - 140, y: y - 320 + 10 }, null, meteorDamage(Math.max(1, this.wave)), 0,
        { tx: x, ty: y, flight: 0.7, splash: a.radius * TILE, air: true, fake: true });
      this.projectiles.push(p);
      this.sfx('meteor');
    } else if (k === 'freeze') {
      for (const e of this.enemies) e.applySlow(a.slow, a.dur);
      this.fx.freezeFlash = 1;
      this.fx.ring(W / 2, H / 2, W * 0.7, '#e0f2fe', 0.8);
      this.sfx('frost');
    }
    return true;
  }

  get paths() { return this.map.paths; }

  canPlace(cx, cy) {
    return cx >= 0 && cy >= 0 && cx < COLS && cy < ROWS && (this.map.grid[cy][cx] === 0 || this.map.grid[cy][cx] === 4) && !this.towerAt[cy][cx];
  }

  build(type, cx, cy) {
    const cost = TOWERS[type].levels[0].cost;
    if (!this.canPlace(cx, cy) || this.gold < cost || this.isOver) return null;
    const t = new Tower(type, cx, cy);
    t.rangeMul = this.night && type !== 'eye' ? NIGHT_RANGE : 1;
    t.hot = this.map.grid[cy][cx] === 4;
    this.gold -= cost; this.towers.push(t); this.towerAt[cy][cx] = t;
    if (this.state === 'build') this.history.push({ kind: 'build', t, cost });
    this.fx.burst(t.x, t.y, '#e5e7eb', 10, 70);
    this.sfx('build');
    return t;
  }

  upgrade(t, branchIdx = 0) {
    if (!t) return false;
    const cost = t.costFor(branchIdx);
    if (t.maxed || this.gold < cost || this.isOver) return false;
    const wasBranch = t.canBranch;
    if (this.state === 'build') this.history.push({ kind: 'upgrade', t, cost, level: t.level, branch: t.branch });
    this.gold -= cost; t.upgrade(branchIdx);
    if (wasBranch) this.onEvent('branch', t);
    this.fx.ring(t.x, t.y, TILE * 0.7, '#fde68a', 0.4);
    this.fx.burst(t.x, t.y, '#fde68a', 12, 80);
    this.fx.beams.push({ x: t.x, y: t.y, life: 0.7, max: 0.7, color: t.branch != null ? '#f472b6' : '#fde047' });
    this.fx.text(t.x, t.y - 26, t.branch != null ? '★ ' + t.baseStats.name : 'Cấp ' + (t.level + 1), t.branch != null ? '#f9a8d4' : '#fef08a');
    this.sfx('upgrade');
    return true;
  }

  sell(t) {
    if (!t || this.isOver || !this.canSell) return;
    if (this.state === 'build') this.history.push({ kind: 'sell', t, value: t.sellValue });
    this.gold += t.sellValue;
    this.fx.text(t.x, t.y - 10, '+' + t.sellValue);
    this.towers = this.towers.filter(o => o !== t);
    this.towerAt[t.cy][t.cx] = null;
    this.fx.burst(t.x, t.y, '#9ca3af', 12, 80);
    this.sfx('sell');
  }

  // Số quái còn lại (chưa sinh + đang sống) và tiến độ 0..1
  get enemiesLeft() { return this.spawns.length + this.enemies.length; }
  get waveProgress() { return this.waveTotal ? Math.max(0, Math.min(1, 1 - this.enemiesLeft / this.waveTotal)) : 1; }

  // Nhặt rương tại vị trí (x, y); trả về true nếu nhặt được
  collectAt(x, y) {
    const i = this.chests.findIndex(c => (c.x - x) ** 2 + (c.y - y) ** 2 <= 26 * 26);
    if (i < 0) return false;
    const c = this.chests.splice(i, 1)[0];
    this.gold += c.value; this.stats.goldEarned += c.value;
    this.fx.text(c.x, c.y - 14, '💰 +' + c.value, '#fde047');
    this.fx.burst(c.x, c.y, '#fde047', 14, 110, 3);
    this.sfx('upgrade');
    this.onEvent('chest', c);
    return true;
  }

  get canUndo() { return this.state === 'build' && this.history.length > 0; }

  // Hoàn tác thao tác gần nhất (hoàn 100% vàng)
  undo() {
    if (!this.canUndo) return false;
    const h = this.history.pop(), t = h.t;
    if (h.kind === 'build') {
      this.towers = this.towers.filter(o => o !== t); this.towerAt[t.cy][t.cx] = null; this.gold += h.cost;
    } else if (h.kind === 'upgrade') {
      t.level = h.level; t.branch = h.branch; t.invested -= h.cost; this.gold += h.cost;
    } else if (h.kind === 'sell') {
      if (this.gold < h.value || this.towerAt[t.cy][t.cx]) return false;
      this.gold -= h.value; this.towers.push(t); this.towerAt[t.cy][t.cx] = t;
    }
    this.fx.burst(t.x, t.y, '#c4b5fd', 8, 60);
    this.sfx('click');
    return true;
  }

  get isOver() { return this.state === 'over'; }
  get spawning() { return this.spawns.length > 0; }

  // Có thể gọi đợt kế tiếp sớm (khi đợt hiện tại đã sinh hết quái) để nhận thưởng
  canCallWave() {
    if (this.state === 'over') return false;
    if (this.state === 'won' && !this.endless) return false;
    return !this.spawning;
  }

  startWave() {
    if (!this.canCallWave()) return false;
    this.history = [];
    this.waveLeaks = 0; this.waveLeakBy = {};
    let bonus = 0;
    if (this.enemies.length > 0) bonus = Math.round((5 + this.wave) * this.goldMul); // thưởng gọi sớm
    this.wave++;
    this.night = this.mods.has('darkness') || isNightWave(this.wave);
    this.applyNight();
    // Mức Khó trên bản đồ nhiều cổng: giảm 15% máu quái để vẫn có cơ hội thắng
    const gateEase = this.diffKey === 'hard' && this.paths.length > 1 ? 0.85 : 1;
    const hpMul = waveHpMul(this.wave) * this.diff.hp * (MAPS[this.mapIndex].hpMul || 1) * gateEase;
    const ev = makeWave(this.wave);
    const nPaths = this.paths.length;
    ev.forEach((e, i) => {
      this.spawns.push({ t: this.time + e.t, type: e.type, pathIdx: gateFor(e, this.wave, nPaths, i), hpMul });
    });
    this.spawns.sort((a, b) => a.t - b.t);
    this.waveTotal = this.spawns.length + this.enemies.length;
    if (bonus) { this.gold += bonus; this.fx.text(W / 2, 60, 'Gọi sớm +' + bonus); }
    if (this.state !== 'won') this.state = 'wave';
    this.onEvent('wave', this.wave);
    this.sfx('wave');
    return true;
  }

  spawn(type, pathIdx, hpMul, dist = 0, seg = 0) {
    const d = ENEMIES[type];
    const path = d.flying ? this.map.flyPaths[pathIdx] : this.paths[pathIdx];
    const e = new Enemy(type, path, hpMul, this);
    if (this.mods.has('fast')) e.speed *= 1.25;
    // Đường bay thẳng có thể rất ngắn: giảm tốc để thời gian bay ~60% thời gian đi bộ
    if (d.flying) e.speed *= Math.min(1, path.length / (0.6 * this.paths[pathIdx].length));
    if (dist) { e.dist = dist; const p = path.posAt(dist, seg, e.lane); e.seg = p.seg; e.x = p.x; e.y = p.y; e.ang = p.ang; }
    e.hpMul = hpMul; e.pathIdx = pathIdx;
    this.enemies.push(e);
    if (d.boss && !dist) { this.fx.shake = Math.max(this.fx.shake || 0, 0.5); this.sfx('bossin'); this.onEvent('boss', e); }
    return e;
  }

  enemyKilled(e) {
    this.gold += e.reward; this.stats.goldEarned += e.reward; this.stats.kills++;
    if (!LOW_FX.on && this.fx.corpses.length < 60) this.fx.corpses.push({ type: e.type, d: e.d, x: e.x, y: e.y, ang: e.ang, flying: e.flying, life: 0.35, max: 0.35 });
    this.fx.burst(e.x, e.y, e.d.color, e.d.boss ? 30 : 10, e.d.boss ? 160 : 90, e.d.boss ? 4 : 2.5);
    this.fx.text(e.x, e.y - 12, '+' + e.reward);
    if (e.d.boss || Math.random() < 0.03) {
      const value = Math.round((12 + this.wave * 3) * (e.d.boss ? 5 : 1) * this.goldMul);
      this.chests.push({ x: e.x, y: e.y, value, life: 8, max: 8, boss: !!e.d.boss });
    }
    // Dịch Hạch: độc lây sang quái xung quanh khi chết
    if (e.poisonSpread && e.poisonT > 0) {
      const r2 = (1.3 * TILE) ** 2;
      for (const o of this.enemies) if (o.alive && o !== e && (o.x - e.x) ** 2 + (o.y - e.y) ** 2 <= r2) o.applyPoison(e.poisonDps, 4, 6, e.poisonSrc, { stacks: 3, spread: true });
      this.fx.ring(e.x, e.y, 1.3 * TILE, '#a3e635', 0.4);
    }
    if (e.d.split) {
      for (let i = 0; i < e.d.splitCount; i++) {
        const back = Math.max(0, e.dist - i * 10);
        this.spawn(e.d.split, e.pathIdx, e.hpMul, back, e.seg);
      }
    }
    this.sfx(e.d.boss ? 'bossdie' : 'die');
    this.onEvent('kill', e);
  }

  enemyEscaped(e) {
    if (this.state === 'over') return;   // đã thua: không tính thêm (tránh phát sự kiện 'over' nhiều lần)
    if (!e.d.lives) { this.fx.text(this.map.castle.x, this.map.castle.y - 30, 'Yêu tinh trốn mất!', '#fde68a'); return; }   // quái thưởng không trừ máu
    this.lives -= e.d.lives; this.stats.leaked++; this.waveLeaks = (this.waveLeaks || 0) + 1; this.perfectStreak = 0;
    this.livesHistory.push({ wave: this.wave, lives: Math.max(0, this.lives) });
    (this.stats.leakBy || (this.stats.leakBy = {}))[e.type] = (this.stats.leakBy[e.type] || 0) + e.d.lives;
    this.fx.ring(this.map.castle.x, this.map.castle.y, TILE, '#ef4444', 0.5);
    this.onEvent('leak', e);
    // Một nhóm quái lọt ≥3 con trong đợt → gợi ý tức thời (mỗi nhóm chỉ báo 1 lần mỗi ván)
    const grp = LOSS_GROUP[e.type] || 'basic', wl = this.waveLeakBy || (this.waveLeakBy = {});
    wl[grp] = (wl[grp] || 0) + 1;
    if (wl[grp] === 3 && !(this.tipped || (this.tipped = new Set())).has(grp)) { this.tipped.add(grp); this.onEvent('leakTip', grp); }
    this.sfx('leak');
    if (this.lives <= 0) { this.lives = 0; this.state = 'over'; this.onEvent('over'); this.sfx('lose'); }
  }

  update(dt) {
    if (this.state === 'over') { this.fx.update(dt); return; }
    this.time += dt;
    if (this.sandbox && this.gold < 500000) this.gold = 999999;   // vàng vô hạn
    for (const k in this.cooldowns) if (this.cooldowns[k] > 0) this.cooldowns[k] -= dt;

    while (this.spawns.length && this.spawns[0].t <= this.time) {
      const s = this.spawns.shift();
      this.spawn(s.type, s.pathIdx, s.hpMul);
    }

    for (const e of this.enemies) if (e.alive) e.update(dt, this);
    if (this.state === 'over') return;
    this.updateReveal();
    this.applySupport();
    for (const t of this.towers) t.update(dt, this);
    for (const p of this.projectiles) p.update(dt, this);

    this.enemies = this.enemies.filter(e => e.alive);
    if (this.chests.length) { for (const c of this.chests) c.life -= dt; this.chests = this.chests.filter(c => c.life > 0); }
    this.projectiles = this.projectiles.filter(p => p.alive);
    this.fx.update(dt);

    // Kết thúc đợt
    if (this.state === 'wave' && !this.spawning && this.enemies.length === 0) {
      const income = this.towers.reduce((a, t) => a + (t.baseStats.income || 0), 0);
      if (income) { this.gold += income; for (const t of this.towers) if (t.baseStats.income) this.fx.text(t.x, t.y - 20, '+' + t.baseStats.income, '#fde047'); }
      const bonus = Math.round((20 + this.wave * 2) * this.goldMul);
      this.gold += bonus;
      // Đợt hoàn hảo: không để lọt con nào → thưởng thêm, tăng theo chuỗi liên tiếp
      if (!this.waveLeaks) {
        this.perfectStreak = (this.perfectStreak || 0) + 1; this.stats.perfect = (this.stats.perfect || 0) + 1;
        const pb = Math.round((5 + this.wave * 0.5) * this.goldMul * (1 + 0.05 * Math.min(this.perfectStreak - 1, 10)));
        this.gold += pb; this.stats.goldEarned += pb;
        this.fx.text(W / 2, H / 2 + 26, `✨ Đợt hoàn hảo${this.perfectStreak > 1 ? ' ×' + this.perfectStreak : ''}! +${pb}`, '#a7f3d0');
        this.onEvent('perfect', this.perfectStreak);
      }
      this.fx.text(W / 2, H / 2, 'Hoàn thành đợt ' + this.wave + '  +' + bonus + ' vàng', '#fef08a');
      if (this.night) { this.night = false; this.applyNight(); }
      if (this.wave >= GOAL_WAVE && !this.endless) { this.fx.fireworks(10); this.state = 'won'; this.onEvent('won'); this.sfx('win'); }
      else { this.state = 'build'; this.onEvent('cleared', this.wave); }
    }
  }

  // Tính hiệu ứng Đài Chỉ Huy cho mọi tháp (lấy mức cao nhất, không cộng dồn)
  applySupport() {
    const sup = this.towers.filter(t => t.def.support);
    for (const t of this.towers) {
      let buff = 0, haste = 0;
      if (!t.def.support) for (const s of sup) {
        if (s.disabledT > 0) continue;
        const st = s.baseStats, r = st.range * TILE * (s.rangeMul || 1);
        if ((s.x - t.x) ** 2 + (s.y - t.y) ** 2 <= r * r) { buff = Math.max(buff, st.buff); haste = Math.max(haste, st.haste); }
      }
      t.buff = buff + (t.hot && !t.def.support ? HOT_BUFF : 0); t.haste = haste;
    }
  }

  applyNight() {
    for (const t of this.towers) t.rangeMul = this.night && t.type !== 'eye' ? NIGHT_RANGE : 1;
  }

  // Đánh dấu Bóng Ma nào đang bị phát hiện
  updateReveal() {
    let eyes = null; const near2 = (REVEAL_NEAR * TILE) ** 2;
    for (const e of this.enemies) {
      if (!e.d.stealth) continue;
      if (!eyes) eyes = this.towers.filter(t => t.type === 'eye');
      let rev = false;
      for (const t of eyes) { if ((t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= t.rangePx * t.rangePx) { rev = true; break; } }
      if (!rev) for (const t of this.towers) { if ((t.x - e.x) ** 2 + (t.y - e.y) ** 2 <= near2) { rev = true; break; } }
      e.revealed = rev;
    }
  }

  // ---------- Lưu / tải (dữ liệu thuần, không phụ thuộc DOM) ----------
  serialize() {
    return {
      mapIndex: this.mapIndex, mapId: MAPS[this.mapIndex].id, seed: MAPS[this.mapIndex].randomSeed, daily: this.daily || null, perfectStreak: this.perfectStreak || 0,
      diff: this.diffKey, mods: [...this.mods], gold: this.gold, lives: this.lives, wave: this.wave, endless: this.endless, stats: this.stats,
      towers: this.towers.map(t => ({ type: t.type, cx: t.cx, cy: t.cy, level: t.level, mode: t.mode, invested: t.invested, branch: t.branch, kills: t.kills, dmg: t.dmgDealt })),
    };
  }
  // Tìm bản đồ theo mã định danh (ổn định khi thêm bản đồ mới); bản lưu cũ chỉ có chỉ số thì dùng chỉ số
  static mapIndexOf(s) {
    if (s && typeof s.mapId === 'string') { const i = MAPS.findIndex(m => m.id === s.mapId); if (i >= 0) return i; }
    return s && Number.isInteger(s.mapIndex) && MAPS[s.mapIndex] ? s.mapIndex : -1;
  }
  static validSave(s) {
    return !!(s && Game.mapIndexOf(s) >= 0 && DIFFICULTY[s.diff] && Array.isArray(s.towers) && Number.isFinite(s.gold));
  }
  // Nạp trạng thái vào ván mới tạo (cùng bản đồ/độ khó); trả về số vàng hoàn lại cho tháp không hợp lệ
  restore(s) {
    this.daily = s.daily || null;
    this.gold = s.gold; this.lives = s.lives; this.wave = s.wave; this.endless = !!s.endless;
    this.stats = Object.assign(this.stats, s.stats || {});
    this.perfectStreak = s.perfectStreak || 0;
    this.livesHistory = [{ wave: s.wave, lives: s.lives }];
    let refund = 0;
    for (const o of s.towers) {
      if (!TOWERS[o.type] || !this.canPlace(o.cx, o.cy)) { refund += Math.floor((o.invested || 0) * SELL_RATIO); continue; }
      const t = new Tower(o.type, o.cx, o.cy);
      const maxLv = t.def.levels.length - 1 + (BRANCHES[o.type] ? 1 : 0);
      t.level = Math.max(0, Math.min(maxLv, o.level | 0));
      t.mode = TARGET_MODES.includes(o.mode) ? o.mode : t.mode;
      t.branch = o.branch == null || !BRANCHES[o.type] || t.level < t.def.levels.length ? null : (o.branch ? 1 : 0);
      t.invested = o.invested; t.kills = o.kills || 0; t.dmgDealt = o.dmg || 0;
      t.hot = this.map.grid[o.cy][o.cx] === 4;
      this.towers.push(t); this.towerAt[o.cy][o.cx] = t;
    }
    this.gold += refund;
    return refund;
  }

  // Tiếp tục chơi vô tận sau khi thắng
  continueEndless() { if (this.state === 'won') { this.endless = true; this.state = 'build'; } }
}
