'use strict';
// ===== Thực thể: quái, tháp, đạn =====
// Logic ở đây không phụ thuộc vào việc vẽ, để có thể chạy mô phỏng cân bằng trên Node.

let _uid = 0;

class Enemy {
  constructor(type, path, hpMul, game) {
    const d = ENEMIES[type];
    this.id = ++_uid;
    this.type = type; this.d = d;
    this.maxHp = Math.max(1, Math.round(d.hp * hpMul));
    this.hp = this.maxHp;
    this.speed = d.speed;
    this.armor = (d.armor || 0) * (1 + Math.max(0, hpMul - 1) * 0.08);
    this.flying = !!d.flying;
    this.path = path;
    this.dist = 0; this.seg = 0;
    this.slow = 0; this.slowT = 0;
    this.alive = true; this.escaped = false;
    this.hitFlash = 0; this.healT = 1 + Math.random();
    this.wob = Math.random() * Math.PI * 2;
    this.reward = Math.round(d.reward * game.goldMul);
    this.shield = d.shield ? d.shield + Math.floor(game.wave / 8) : 0;
    // Luân phiên ba làn độc lập từng ván; trùm đi giữa, quái bay giữ đường riêng.
    const serials = game.laneSerial || (game.laneSerial = new Map());
    const slot = serials.get(path) || 0; serials.set(path, slot + 1);
    this.lane = this.flying || d.boss ? 0 : (slot % 3 - 1) * ROAD_LANE;
    const p = path.posAt(0, 0, this.lane); this.x = p.x; this.y = p.y; this.ang = p.ang;
  }

  // Quãng đường còn lại tới lâu đài (dùng cho chế độ nhắm "đầu tiên")
  get remaining() { return this.path.length - this.dist; }

  update(dt, game) {
    if (this.slowT > 0) { this.slowT -= dt; if (this.slowT <= 0) this.slow = 0; }
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.vulnT > 0) this.vulnT -= dt;
    this.wob += dt * 8;
    if (this.burnT > 0) {
      this.burnT -= dt;
      this.damage(this.burnDps * dt, game, this.burnSrc, false, dt);
      if (!this.alive) return;
    }
    if (this.poisonT > 0) {
      this.poisonT -= dt;
      this.damage(this.poisonDps * this.poisonStacks * dt, game, this.poisonSrc, false, dt);
      if (!this.alive) return;
      if (this.poisonT <= 0) { this.poisonStacks = 0; this.corrode = false; }
    }
    if (this.stunT > 0) { this.stunT -= dt; return; }
    let spd = this.speed * (1 - this.slow);
    if (this.d.burrow) {
      // Chu kỳ: 3 giây trên mặt đất, 1.5 giây dưới đất (nhanh hơn, không thể bị đánh)
      this.burrowT = (this.burrowT || 0) + dt;
      const cyc = this.burrowT % 4.5;
      const was = this.under; this.under = cyc > 3;
      if (this.under !== was) game.fx.burst(this.x, this.y, '#78350f', 8, 60, 3);
      if (this.under) spd *= 1.6;
    }
    this.dist += spd * TILE * dt;
    if (this.dist >= this.path.length) {
      this.alive = false; this.escaped = true;
      game.enemyEscaped(this);
      return;
    }
    const p = this.path.posAt(this.dist, this.seg, this.lane);
    this.seg = p.seg; this.x = p.x; this.y = p.y; this.ang = p.ang;
    // Trùm vào vùng nguy hiểm (còn < 3 ô): phát cảnh báo một lần
    if (this.d.boss && !this.warned && this.remaining < 3 * TILE) { this.warned = true; game.sfx('alarm'); }

    if (this.d.boss) {
      // Gầm: vô hiệu hoá tháp gần đó trong 2 giây, mỗi 8 giây
      this.roarT = (this.roarT == null ? 4 : this.roarT) - dt;
      if (this.roarT <= 0) {
        this.roarT = 8; const r2 = (2 * TILE) ** 2; let n = 0;
        for (const t of game.towers) if ((t.x - this.x) ** 2 + (t.y - this.y) ** 2 <= r2) { t.disabledT = 1.5; n++; }
        game.fx.ring(this.x, this.y, 2 * TILE, '#ef4444', 0.6);
        if (n) { game.fx.text(this.x, this.y - 34, 'GẦM!', '#fca5a5'); game.fx.shake = Math.max(game.fx.shake || 0, 0.25); }
        game.sfx('roar');
      }
    }
    if (this.d.hexer) {
      this.hexT = (this.hexT == null ? 2 + Math.random() * 2 : this.hexT) - dt;
      if (this.hexT <= 0) {
        this.hexT = 5; let best = null, bd = (2 * TILE) ** 2;
        for (const t of game.towers) { const d2 = (t.x - this.x) ** 2 + (t.y - this.y) ** 2; if (d2 <= bd && !(t.disabledT > 0)) { bd = d2; best = t; } }
        if (best) { best.disabledT = 2; game.fx.bolt([{ x: this.x, y: this.y - 10 }, { x: best.x, y: best.y - 10 }]); game.fx.ring(best.x, best.y, TILE * 0.6, '#a855f7', 0.5); game.sfx('zap'); }
      }
    }
    if (this.d.healer) {
      this.healT -= dt;
      if (this.healT <= 0) {
        this.healT = 2.2;
        const r2 = (1.8 * TILE) ** 2; let healed = false;
        for (const e of game.enemies) {
          if (!e.alive || e === this || e.hp >= e.maxHp) continue;
          if ((e.x - this.x) ** 2 + (e.y - this.y) ** 2 <= r2) {
            e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.12); healed = true;
          }
        }
        if (healed) game.fx.ring(this.x, this.y, 1.8 * TILE, '#4cc9f0', 0.5);
      }
    }
  }

  // Trả về sát thương thực nhận
  // dot: sát thương liên tục trong dt giây -> giáp được trừ theo tỉ lệ thời gian
  // aoe: sát thương diện rộng (không bị khiên chặn)
  damage(amount, game, src, pierce, dot, aoe) {
    if (!this.alive) return 0;
    if (this.shield > 0 && !dot && !aoe) {
      this.shield--; this.hitFlash = 0.05;
      game.fx.ring(this.x, this.y, this.d.radius + 6, '#93c5fd', 0.25);
      if (this.shield === 0) { game.fx.burst(this.x, this.y, '#bfdbfe', 10, 90); game.fx.text(this.x, this.y - 16, 'Vỡ khiên!', '#bfdbfe'); }
      return 0;
    }
    if (this.vulnT > 0) amount *= 1 + this.vuln;
    const arm = this.corrode && this.poisonT > 0 ? this.armor * 0.5 : this.armor;
    const armor = dot ? arm * dot : arm;
    let dmg = pierce ? amount : Math.max(amount * 0.25, amount - armor);
    dmg = Math.min(dmg, this.hp);
    this.hp -= dmg; this.hitFlash = 0.08;
    if (src) { src.dmgDealt += dmg; if (src.type) this.lastHitBy = src.type; }
    if (this.hp <= 0.001) {
      this.alive = false;
      if (src) src.kills++;
      game.enemyKilled(this);
    }
    return dmg;
  }

  applyStun(dur) { this.stunT = Math.max(this.stunT || 0, this.d.boss ? dur * 0.3 : dur); }
  applyBurn(dps, dur, src) {
    if (!this.burnT || dps >= this.burnDps) { this.burnDps = dps; this.burnSrc = src; }
    this.burnT = Math.max(this.burnT || 0, dur);
  }
  applyVuln(v, dur) { this.vuln = Math.max(this.vulnT > 0 ? this.vuln : 0, v); this.vulnT = Math.max(this.vulnT || 0, dur); }

  // Độc cộng dồn: mỗi lần trúng +1 lớp (tối đa max), làm mới thời gian
  applyPoison(dps, dur, max, src, opt = {}) {
    this.poisonStacks = Math.min(max, (this.poisonT > 0 ? this.poisonStacks : 0) + (opt.stacks || 1));
    if (!this.poisonDps || dps >= this.poisonDps) { this.poisonDps = dps; this.poisonSrc = src; }
    this.poisonT = Math.max(this.poisonT || 0, dur);
    if (opt.spread) this.poisonSpread = true;
    if (opt.corrode) this.corrode = true;
  }

  applySlow(s, dur) {
    if (s >= this.slow) { this.slow = s; this.slowT = Math.max(this.slowT, dur); }
    else this.slowT = Math.max(this.slowT, dur * 0.5);
  }
}

class Tower {
  constructor(type, cx, cy) {
    this.type = type; this.def = TOWERS[type];
    this.level = 0; this.cx = cx; this.cy = cy;
    this.x = (cx + 0.5) * TILE; this.y = (cy + 0.5) * TILE;
    this.cd = 0.2; this.angle = -Math.PI / 2;
    this.target = null; this.mode = this.def.defaultTarget || 'first';
    this.invested = this.def.levels[0].cost;
    this.kills = 0; this.dmgDealt = 0;
    this.beamT = 0; this.recoil = 0; this.pulse = 0;
    this.branch = null;
  }
  get branches() { return BRANCHES[this.type] || null; }
  get baseStats() { return this.branch != null ? this.branches[this.branch] : this.def.levels[this.level]; }
  // Chỉ số sau khi cộng hiệu ứng Đài Chỉ Huy (được cache để không tạo object mỗi khung)
  get stats() {
    const b = this.baseStats;
    if (!this.buff && !this.haste) return b;
    if (this._sb === b && this._sbuf === this.buff && this._shas === this.haste) return this._sc;
    const c = Object.assign({}, b);
    if (c.dmg != null) c.dmg = b.dmg * (1 + this.buff);
    if (c.dps != null) c.dps = b.dps * (1 + this.buff);
    if (c.rate != null) c.rate = b.rate * (1 - this.haste);
    this._sb = b; this._sbuf = this.buff; this._shas = this.haste; this._sc = c;
    return c;
  }
  get rangePx() { return this.stats.range * TILE * (this.rangeMul || 1); }
  // Đang ở cấp 3 và có thể chọn nhánh chuyên môn
  get canBranch() { return this.branch == null && this.level === this.def.levels.length - 1 && !!this.branches; }
  get maxed() { return this.branch != null || (this.level >= this.def.levels.length - 1 && !this.branches); }
  // Giá nâng cấp kế tiếp (với nhánh: giá nhánh rẻ hơn)
  get upgradeCost() {
    if (this.maxed) return 0;
    if (this.canBranch) return Math.min(...this.branches.map(b => b.cost));
    return this.def.levels[this.level + 1].cost;
  }
  costFor(branchIdx) { return this.canBranch ? this.branches[branchIdx].cost : this.upgradeCost; }
  get sellValue() { return Math.floor(this.invested * SELL_RATIO); }
  get displayName() { return this.branch != null ? this.def.name + ' · ' + this.stats.name : this.def.name; }

  upgrade(branchIdx = 0) {
    if (this.maxed) return;
    if (this.canBranch) { this.branch = branchIdx; this.level++; }
    else this.level++;
    this.invested += this.baseStats.cost;
  }

  canHit(e) { return e.alive && !e.under && (this.def.air || !e.flying) && (!e.d.stealth || e.revealed); }

  findTarget(game, range, exclude) {
    const r2 = range * range; let best = null, bestV = -Infinity;
    for (const e of game.enemies) {
      if (!this.canHit(e) || (exclude && exclude.has(e))) continue;
      const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
      if (d2 > r2) continue;
      let v;
      switch (this.mode) {
        case 'first': v = -e.remaining; break;
        case 'last': v = e.remaining; break;
        case 'strong': v = e.hp * 1e4 - e.remaining; break;
        default: v = -d2;
      }
      if (v > bestV) { bestV = v; best = e; }
    }
    return best;
  }

  // Lấy tối đa n mục tiêu tốt nhất theo chế độ nhắm
  findTargets(game, range, n) {
    const out = []; const ex = new Set();
    for (let i = 0; i < n; i++) { const t = this.findTarget(game, range, ex); if (!t) break; out.push(t); ex.add(t); }
    return out;
  }

  aimAt(e, dt) {
    const a = Math.atan2(e.y - this.y, e.x - this.x);
    let diff = a - this.angle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.angle += diff * Math.min(1, dt * 14);
  }

  update(dt, game) {
    if (this.disabledT > 0) { this.disabledT -= dt; this.target = null; return; }
    if (this.def.support) { this.pulse = (this.pulse || 0) + dt; return; }
    const s = this.stats; const range = this.rangePx;
    if (this.recoil > 0) this.recoil = Math.max(0, this.recoil - dt * 4);
    if (this.pulse > 0) this.pulse = Math.max(0, this.pulse - dt * 2);
    this.cd -= dt;

    if (this.type === 'eye') return this.updateEye(dt, game, s, range);

    if (this.type === 'frost') {
      if (this.cd > 0) return;
      let any = false; const r2 = range * range;
      for (const e of game.enemies) {
        if (!e.alive || e.under || (e.x - this.x) ** 2 + (e.y - this.y) ** 2 > r2) continue;
        any = true; e.applySlow(s.slow, s.slowDur);
        if (s.freeze && Math.random() < s.freeze) { e.applyStun(1); game.fx.burst(e.x, e.y, '#e0f2fe', 5, 50); }
        e.damage(s.dmg, game, this, false, 0, true);
      }
      if (any) { this.cd = s.rate; this.pulse = 1; game.fx.ring(this.x, this.y, range, '#bae6fd', 0.6); game.sfx('frost'); }
      return;
    }

    // Giữ mục tiêu cũ nếu còn trong tầm & đang ở chế độ gần nhất; còn lại tìm lại mỗi khung hình
    let t;
    if (this.type === 'poison') {
      // Ưu tiên quái chưa đủ lớp độc (hoặc sắp hết độc) để rải độc ra nhiều mục tiêu
      const full = new Set(game.enemies.filter(e => e.poisonT > 1.5 && e.poisonStacks >= s.stacks));
      t = this.findTarget(game, range, full) || this.findTarget(game, range);
    } else t = this.findTarget(game, range);
    this.target = t;
    if (!t) return;
    this.aimAt(t, dt);
    if (this.cd > 0) return;
    this.cd = s.rate; this.recoil = 1;

    switch (this.type) {
      case 'poison':
        game.projectiles.push(new Projectile('dart', this, t, 0, 8 * TILE, { poison: s }));
        game.sfx('arrow');
        break;
      case 'archer':
        for (const tt of s.multi ? this.findTargets(game, range, s.multi) : [t])
          game.projectiles.push(new Projectile('arrow', this, tt, s.dmg, (s.pierce ? 12 : 9) * TILE, { pierce: !!s.pierce, heavy: !!s.pierce }));
        game.sfx('arrow');
        break;
      case 'cannon': {
        // Đoán trước vị trí mục tiêu sau thời gian bay
        const flight = 0.55;
        const ahead = Math.min(t.dist + t.speed * (1 - t.slow) * TILE * flight, t.path.length);
        const p = t.path.posAt(ahead, t.seg);
        game.projectiles.push(new Projectile('shell', this, null, s.dmg, 0, { tx: p.x, ty: p.y, flight, splash: s.splash * TILE, burn: s.burn, burnDur: s.burnDur }));
        game.sfx('cannon');
        break;
      }
      case 'tesla': {
        const hit = new Set([t]); const pts = [{ x: this.x, y: this.y - 14 }, { x: t.x, y: t.y }];
        if (s.stun) t.applyStun(s.stun);
        t.damage(s.dmg, game, this);
        let cur = t; let dmg = s.dmg;
        for (let i = 1; i < s.chains; i++) {
          dmg *= 0.85;
          let next = null, bd = (1.6 * TILE) ** 2;
          for (const e of game.enemies) {
            if (!this.canHit(e) || hit.has(e)) continue;
            const d2 = (e.x - cur.x) ** 2 + (e.y - cur.y) ** 2;
            if (d2 < bd) { bd = d2; next = e; }
          }
          if (!next) break;
          hit.add(next); pts.push({ x: next.x, y: next.y });
          if (s.stun) next.applyStun(s.stun);
          next.damage(dmg, game, this); cur = next;
        }
        game.fx.bolt(pts);
        game.sfx('zap');
        break;
      }
      case 'sniper':
        {
          const crit = s.crit && Math.random() < s.crit;
          t.damage(s.dmg * (crit ? 3 : 1), game, this, s.pierce);
          if (crit) game.fx.text(t.x, t.y - 20, 'CHÍ MẠNG!', '#fca5a5');
        }
        game.fx.tracer(this.x, this.y, t.x, t.y);
        game.fx.burst(t.x, t.y, '#d9f99d', 6);
        game.sfx('snipe');
        break;
    }
  }

  updateEye(dt, game, s, range) {
    const t = this.target;
    // Giữ nguyên mục tiêu khi còn trong tầm để tích luỹ sức mạnh
    if (t && this.canHit(t) && (t.x - this.x) ** 2 + (t.y - this.y) ** 2 <= range * range) {
      this.beamT = Math.min(this.beamT + dt, s.ramp * 2);
    } else {
      this.target = this.findTarget(game, range);
      this.beamT = 0;
      if (!this.target) return;
    }
    this.aimAt(this.target, dt);
    const mul = 1 + Math.min(2, this.beamT / s.ramp);
    if (s.vuln) this.target.applyVuln(s.vuln, 0.4);
    this.target.damage(s.dps * mul * dt, game, this, false, dt);
    if (!this.target.alive) { this.target = null; this.beamT *= 0.5; }
  }
}

class Projectile {
  constructor(kind, tower, target, dmg, speed, opt = {}) {
    this.kind = kind; this.tower = tower; this.target = target; this.dmg = dmg; this.speed = speed;
    this.x = tower.x; this.y = tower.y - 10; this.alive = true;
    this.sx = this.x; this.sy = this.y;
    Object.assign(this, opt);
    this.t = 0; this.ang = 0;
    if (target) { this.lx = target.x; this.ly = target.y; }
  }
  update(dt, game) {
    if (this.kind === 'shell' || this.kind === 'meteor') {
      this.t += dt;
      const k = Math.min(1, this.t / this.flight);
      this.x = this.sx + (this.tx - this.sx) * k;
      this.y = this.sy + (this.ty - this.sy) * k;
      this.h = this.kind === 'shell' ? Math.sin(k * Math.PI) * 40 : 0;
      if (k >= 1) {
        this.alive = false;
        const r2 = this.splash * this.splash;
        const k0 = game.stats.kills;
        for (const e of game.enemies) {
          if (!e.alive || e.under || (e.flying && !this.air)) continue;
          const d2 = (e.x - this.x) ** 2 + (e.y - this.y) ** 2;
          if (d2 > r2) continue;
          e.damage(this.dmg * (1 - 0.4 * Math.sqrt(d2) / this.splash), game, this.fake ? null : this.tower, false, 0, true);
          if (this.burn && e.alive) e.applyBurn(this.burn, this.burnDur, this.tower);
        }
        game.fx.explosion(this.x, this.y, this.splash);
        if (this.burn) game.fx.fire(this.x, this.y, this.splash, this.burnDur);
        if (this.kind === 'meteor') { game.onEvent('meteor', game.stats.kills - k0); game.fx.shake = 0.4; game.fx.burst(this.x, this.y, '#f97316', 24, 200, 4); }
        game.sfx('boom');
      }
      return;
    }
    // Mũi tên đuổi theo mục tiêu; nếu mục tiêu chết thì bay tới vị trí cuối
    if (this.target && this.target.alive) { this.lx = this.target.x; this.ly = this.target.y; }
    const dx = this.lx - this.x, dy = this.ly - this.y, d = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.ang = Math.atan2(dy, dx);
    if (d <= step + 4) {
      this.alive = false;
      if (this.target && this.target.alive && !this.target.under) {
        if (this.poison) { const p = this.poison; this.target.applyPoison(p.dps, p.dur, p.stacks, this.tower, { spread: p.spread, corrode: p.corrode }); }
        else this.target.damage(this.dmg, game, this.tower, this.pierce);
      }
      else {
        // Mục tiêu đã chết: trúng kẻ khác ở gần nếu có
        for (const e of game.enemies) {
          if (this.tower.canHit(e) && (e.x - this.lx) ** 2 + (e.y - this.ly) ** 2 < 400) { e.damage(this.dmg, game, this.tower, this.pierce); break; }
        }
      }
      return;
    }
    this.x += dx / d * step; this.y += dy / d * step;
  }
}
