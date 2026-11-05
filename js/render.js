'use strict';
// ===== Vẽ bằng Canvas 2D =====

class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.bg = null; this.bgFor = null;
    this.scale = 1;
    this.t = 0;
    this.lumi = new Image(); this.lumi.src = 'assets/lumi.png';
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  }

  resize() {
    const c = this.canvas, dpr = Math.min(window.devicePixelRatio || 1, 2);
    const r = c.getBoundingClientRect();
    // Khi canvas chưa có kích thước (tab nền, cửa sổ thu nhỏ) vẫn giữ tối thiểu 1px để không lỗi khi vẽ
    c.width = Math.max(1, Math.round(r.width * dpr)); c.height = Math.max(1, Math.round(r.height * dpr));
    this.scale = c.width / W;
    this.bgFor = null; // vẽ lại nền theo độ phân giải mới
  }

  battleTheme(theme) {
    const shade = (hex, k) => {
      const rgb = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)), grey = (rgb[0] + rgb[1] + rgb[2]) / 3;
      return '#' + rgb.map(v => Math.round((v * 0.5 + grey * 0.5) * k).toString(16).padStart(2, '0')).join('');
    };
    return { ...theme, grass: shade(theme.grass, 0.43), grass2: shade(theme.grass2, 0.43), path: shade(theme.path, 0.72), path2: shade(theme.path2, 0.57) };
  }

  // Nền tĩnh vẽ một lần vào canvas phụ
  buildBackground(game) {
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(W * this.scale)); cv.height = Math.max(1, Math.round(H * this.scale));
    const g = cv.getContext('2d'); g.scale(this.scale, this.scale);
    const m = game.map, th = this.battleTheme(m.def.theme), rnd = mulberry32(m.def.seed * 31 + 1);

    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      g.fillStyle = (x + y) % 2 ? th.grass : th.grass2;
      g.fillRect(x * TILE, y * TILE, TILE, TILE);
    }
    // Lốm đốm cỏ
    for (let i = 0; i < 500; i++) {
      g.fillStyle = `rgba(255,255,255,${0.03 + rnd() * 0.05})`;
      g.fillRect(rnd() * W, rnd() * H, 2, 2 + rnd() * 3);
    }
    // Đường đi: vẽ nét dày theo polyline để bo góc mượt
    const drawPaths = (w, color) => {
      g.strokeStyle = color; g.lineWidth = w; g.lineCap = 'round'; g.lineJoin = 'round';
      for (const p of m.paths) {
        g.beginPath(); g.moveTo(p.pts[0].x, p.pts[0].y);
        for (const q of p.pts) g.lineTo(q.x, q.y);
        g.stroke();
      }
    };
    drawPaths(ROAD_WIDTH + 8, 'rgba(0,0,0,0.4)');
    drawPaths(ROAD_WIDTH, th.path2);
    drawPaths(ROAD_WIDTH - 10, th.path);
    // Vệt bánh xe và đất cháy dọc đại lộ, không làm tối các viên đạn/quái.
    g.save(); g.globalAlpha = 0.22;
    drawPaths(ROAD_WIDTH - 28, '#211b19');
    g.restore();
    // Sỏi trên đường
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (m.grid[y][x] !== 1) continue;
      for (let k = 0; k < 4; k++) {
        g.fillStyle = `rgba(0,0,0,${0.06 + rnd() * 0.08})`;
        g.beginPath(); g.arc(x * TILE + 8 + rnd() * 32, y * TILE + 8 + rnd() * 32, 1 + rnd() * 2, 0, 7); g.fill();
      }
    }
    // Đường bay của quái bay (nét đứt mờ)
    g.strokeStyle = 'rgba(155,93,229,0.35)'; g.lineWidth = 3; g.setLineDash([4, 10]); g.lineCap = 'round';
    for (const p of m.flyPaths) { g.beginPath(); g.moveTo(p.pts[0].x, p.pts[0].y); g.lineTo(p.pts[1].x, p.pts[1].y); g.stroke(); }
    g.setLineDash([]);
    // Vật trang trí
    for (const d of m.decos) this.drawDeco(g, d, th.deco);
    // Cổng quái
    for (const p of m.paths) {
      const a = p.pts[0];
      const gx = Math.max(TILE * 0.5, Math.min(W - TILE * 0.5, a.x)), gy = Math.max(TILE * 0.5, Math.min(H - TILE * 0.5, a.y));
      const grd = g.createRadialGradient(gx, gy, 2, gx, gy, 30);
      grd.addColorStop(0, 'rgba(168,85,247,0.9)'); grd.addColorStop(1, 'rgba(168,85,247,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(gx, gy, 30, 0, 7); g.fill();
    }
    // Các hố cháy và vết rạn biến bản đồ thành chiến trường, giữ ô xây dễ đọc.
    for (let i = 0; i < 22; i++) {
      const x = rnd() * W, y = rnd() * H;
      g.fillStyle = 'rgba(6,5,5,0.24)'; g.beginPath(); g.ellipse(x, y, 6 + rnd() * 12, 3 + rnd() * 5, rnd() * 3, 0, 7); g.fill();
      g.strokeStyle = 'rgba(12,9,8,0.3)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(x - 10, y + 3); g.lineTo(x, y); g.lineTo(x + 7, y - 8); g.stroke();
    }
    // Ô nóng: vết nứt dung nham
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (m.grid[y][x] !== 4) continue;
      const cx = x * TILE, cy = y * TILE;
      const grd = g.createRadialGradient(cx + TILE / 2, cy + TILE / 2, 2, cx + TILE / 2, cy + TILE / 2, TILE * 0.6);
      grd.addColorStop(0, 'rgba(251,146,60,0.55)'); grd.addColorStop(1, 'rgba(251,146,60,0)');
      g.fillStyle = grd; g.fillRect(cx, cy, TILE, TILE);
      g.strokeStyle = '#f97316'; g.lineWidth = 2; g.beginPath();
      g.moveTo(cx + 8, cy + 12); g.lineTo(cx + 20, cy + 22); g.lineTo(cx + 16, cy + 34); g.lineTo(cx + 30, cy + 40);
      g.moveTo(cx + 20, cy + 22); g.lineTo(cx + 36, cy + 16); g.stroke();
    }
    // Lưới mờ chỉ trên ô có thể xây
    g.strokeStyle = 'rgba(0,0,0,0.06)'; g.lineWidth = 1;
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
      if (m.grid[y][x] === 0 || m.grid[y][x] === 4) g.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1);
    }

    this.bg = cv; this.bgFor = game;
  }

  drawDeco(g, d, kind) {
    const cx = (d.x + 0.5) * TILE, cy = (d.y + 0.5) * TILE;
    g.fillStyle = 'rgba(0,0,0,0.2)';
    g.beginPath(); g.ellipse(cx + 3, cy + 12, 16, 6, 0, 0, 7); g.fill();
    if (kind === 'tree' || kind === 'autumn') {
      // Cây cháy trụi, cành gãy thay cho tán cây tròn vui mắt.
      g.strokeStyle = '#322e29'; g.lineWidth = 5; g.lineCap = 'square';
      g.beginPath(); g.moveTo(cx, cy + 12); g.lineTo(cx - 2, cy - 18);
      g.moveTo(cx - 1, cy - 2); g.lineTo(cx - 13, cy - 12); g.lineTo(cx - 15, cy - 20);
      g.moveTo(cx - 2, cy - 8); g.lineTo(cx + 10, cy - 17); g.lineTo(cx + 12, cy - 25); g.stroke();
      g.strokeStyle = kind === 'autumn' ? '#796044' : '#5e5b4a'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx - 3, cy + 10); g.lineTo(cx - 5, cy - 17); g.stroke();
    } else if (kind === 'rock') {
      g.fillStyle = '#6b5a48';
      g.beginPath(); g.moveTo(cx - 16, cy + 10); g.lineTo(cx - 10, cy - 10); g.lineTo(cx + 6, cy - 14); g.lineTo(cx + 16, cy + 10); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.moveTo(cx - 10, cy - 10); g.lineTo(cx + 6, cy - 14); g.lineTo(cx, cy); g.closePath(); g.fill();
    } else if (kind === 'reed') {
      g.fillStyle = '#2b6cb0'; g.globalAlpha = 0.7;
      g.beginPath(); g.ellipse(cx, cy + 4, 18, 12, 0, 0, 7); g.fill(); g.globalAlpha = 1;
      g.strokeStyle = '#3f6212'; g.lineWidth = 2;
      for (let i = -2; i <= 2; i++) { g.beginPath(); g.moveTo(cx + i * 5, cy + 6); g.lineTo(cx + i * 6, cy - 12); g.stroke(); }
    } else if (kind === 'lava') {
      g.fillStyle = '#7c2d12'; g.beginPath(); g.ellipse(cx, cy + 4, 18, 13, 0, 0, 7); g.fill();
      g.fillStyle = '#f97316'; g.beginPath(); g.ellipse(cx, cy + 4, 13, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#fde047'; g.beginPath(); g.ellipse(cx - 3, cy + 2, 5, 3, 0, 0, 7); g.fill();
    } else {
      g.fillStyle = '#7dd3fc';
      g.beginPath(); g.moveTo(cx, cy - 18); g.lineTo(cx + 9, cy + 6); g.lineTo(cx, cy + 12); g.lineTo(cx - 9, cy + 6); g.closePath(); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.moveTo(cx, cy - 18); g.lineTo(cx - 9, cy + 6); g.lineTo(cx, cy + 2); g.closePath(); g.fill();
    }
  }

  drawCastle(g, x, y, health = 1) {
    // Một khu thành có sân trong và bốn vọng gác, thay cho biểu tượng lâu đài.
    x = Math.max(TILE * 1.5, Math.min(W - TILE * 1.5, x));
    y = Math.max(TILE * 1.5, Math.min(H - TILE * 1.5, y));
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(-70, -64, 144, 138);
    g.fillStyle = '#25272b'; g.fillRect(-66, -66, 132, 132);
    g.strokeStyle = '#49453e'; g.lineWidth = 1;
    for (let i = -48; i < 60; i += 24) { g.beginPath(); g.moveTo(-60, i); g.lineTo(60, i); g.moveTo(i, -60); g.lineTo(i, 60); g.stroke(); }
    const aura = g.createRadialGradient(0, 0, 5, 0, 0, 48);
    aura.addColorStop(0, health > 0.3 ? 'rgba(243,190,97,0.22)' : 'rgba(239,68,68,0.25)'); aura.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = aura; g.fillRect(-48, -48, 96, 96);
    g.strokeStyle = '#887450'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, 29, 0, 7); g.stroke();
    // Tường đá dày bao quanh sân; cổng ở giữa mỗi cạnh để hợp các hướng đường.
    g.fillStyle = '#4b4d51';
    for (const side of [-1, 1]) {
      g.fillRect(-64, side < 0 ? -64 : 50, 128, 14);
      g.fillRect(side < 0 ? -64 : 50, -64, 14, 128);
    }
    g.strokeStyle = '#858078'; g.lineWidth = 2; g.strokeRect(-64, -64, 128, 128);
    g.fillStyle = '#202024';
    for (const side of [-1, 1]) { g.fillRect(-13, side < 0 ? -64 : 50, 26, 14); g.fillRect(side < 0 ? -64 : 50, -13, 14, 26); }
    g.fillStyle = '#969084';
    for (let i = -44; i <= 44; i += 22) if (Math.abs(i) > 14) {
      g.fillRect(i - 4, -68, 8, 9); g.fillRect(i - 4, 59, 8, 9);
      g.fillRect(-68, i - 4, 9, 8); g.fillRect(59, i - 4, 9, 8);
    }
    for (const xx of [-56, 56]) for (const yy of [-56, 56]) {
      g.fillStyle = '#292c32'; g.fillRect(xx - 13, yy - 13, 26, 26);
      g.strokeStyle = '#9a8b71'; g.lineWidth = 2; g.strokeRect(xx - 13, yy - 13, 26, 26);
      g.fillStyle = '#5b5f66'; g.fillRect(xx - 8, yy - 8, 16, 16);
      g.fillStyle = '#b34d34'; g.beginPath(); g.moveTo(xx, yy - 10); g.lineTo(xx + 6, yy); g.lineTo(xx, yy + 10); g.lineTo(xx - 6, yy); g.closePath(); g.fill();
    }
    // Lumi gốc từ EyeTank; hình dự phòng vẫn nhận ra nhân vật nếu ảnh chưa tải.
    const bob = LOW_FX.on || this.reducedMotion.matches ? 0 : Math.sin(this.t * 2) * 1.2;
    if (this.lumi.complete && this.lumi.naturalWidth) {
      // Giữ tỷ lệ gốc, vừa trong khung 56×56; không kéo méo nhân vật.
      const scale = 56 / Math.max(this.lumi.naturalWidth, this.lumi.naturalHeight);
      const width = this.lumi.naturalWidth * scale, height = this.lumi.naturalHeight * scale;
      g.drawImage(this.lumi, -width / 2, -height / 2 - 1 + bob, width, height);
    } else {
      g.fillStyle = '#efe3c8'; g.beginPath(); g.arc(0, 0, 20, 0, 7); g.fill();
      g.fillStyle = '#57345e'; g.beginPath(); g.arc(-7, -3, 4, 0, 7); g.arc(7, -3, 4, 0, 7); g.fill();
    }
    g.font = 'bold 9px system-ui'; g.textAlign = 'center'; g.fillStyle = '#e5c995'; g.fillText('BẢO VỆ LUMI', 0, 39);
    // Tường nứt, lửa và khói theo lượng máu thật của thành.
    if (health < 0.7) {
      g.strokeStyle = '#171416'; g.lineWidth = 3;
      for (const side of [-1, 1]) { g.beginPath(); g.moveTo(side * 38, -64); g.lineTo(side * 30, -57); g.lineTo(side * 35, -50); g.stroke(); }
    }
    if (health < 0.35) for (const side of [-1, 1]) {
      const f = LOW_FX.on || this.reducedMotion.matches ? 0 : Math.sin(this.t * 5 + side) * 3;
      g.fillStyle = 'rgba(21,18,18,0.65)'; g.beginPath(); g.ellipse(side * 53, 22 - f, 9, 16, side * 0.2, 0, 7); g.fill();
      g.fillStyle = '#c74a27'; g.beginPath(); g.moveTo(side * 53 - 7, 45); g.lineTo(side * 53 + f, 25); g.lineTo(side * 53 + 7, 45); g.closePath(); g.fill();
      g.fillStyle = '#ffc275'; g.fillRect(side * 53 - 2, 36, 4, 9);
    }
    g.restore();
  }

  drawCastleHealth(ctx, game) {
    const ratio = Math.max(0, Math.min(1, game.lives / game.maxLives));
    const color = ratio <= 0.3 ? '#ff998c' : ratio <= 0.6 ? '#ffd17e' : '#8ee0a5';
    const cx = Math.max(TILE * 1.5, Math.min(W - TILE * 1.5, game.map.castle.x));
    const cy = Math.max(TILE * 1.5, Math.min(H - TILE * 1.5, game.map.castle.y));
    const width = 180, height = 48, x = Math.max(6, Math.min(W - width - 6, cx - width / 2));
    // Thành sát mép trên: chuyển xuống dưới, không cắt mất nhãn/số máu.
    const y = cy < 138 ? cy + 76 : cy - 132;
    ctx.save();
    ctx.fillStyle = '#101514'; ctx.fillRect(x, y, width, height);
    ctx.strokeStyle = color; ctx.lineWidth = 2; ctx.strokeRect(x, y, width, height);
    ctx.textAlign = 'left'; ctx.font = 'bold 11px system-ui'; ctx.fillStyle = '#fff4e2';
    ctx.fillText(ratio <= 0.3 ? 'THÀNH NGUY CẤP' : 'MÁU THÀNH LUMI', x + 8, y + 16);
    ctx.textAlign = 'right'; ctx.font = 'bold 14px system-ui'; ctx.fillStyle = color;
    ctx.fillText(game.lives + ' / ' + game.maxLives, x + width - 8, y + 32);
    ctx.fillStyle = '#3c3835'; ctx.fillRect(x + 8, y + 36, width - 16, 7);
    ctx.fillStyle = color; ctx.fillRect(x + 8, y + 36, (width - 16) * ratio, 7);
    ctx.restore();
  }

  draw(game, ui, dt) {
    this.t += dt;
    const ctx = this.ctx;
    if (this.canvas.width < 2) return;                       // chưa có kích thước thật → bỏ qua khung này
    if (this.bgFor !== game || !this.bg.width) this.buildBackground(game);
    const sh = game.fx.shake > 0 && !LOW_FX.on && !this.reducedMotion.matches ? game.fx.shake * 18 : 0;
    const ox = sh ? (Math.random() - 0.5) * sh : 0, oy = sh ? (Math.random() - 0.5) * sh : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (sh) { ctx.fillStyle = '#000'; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
    ctx.drawImage(this.bg, ox * this.scale, oy * this.scale);
    ctx.setTransform(this.scale, 0, 0, this.scale, ox * this.scale, oy * this.scale);

    // Cổng quái nhấp nháy
    for (const p of game.paths) {
      const a = p.pts[0]; const gx = Math.max(TILE * 0.5, Math.min(W - TILE * 0.5, a.x)), gy = Math.max(TILE * 0.5, Math.min(H - TILE * 0.5, a.y));
      ctx.strokeStyle = `rgba(216,180,254,${0.5 + 0.3 * Math.sin(this.t * 4)})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(gx, gy, 14 + 3 * Math.sin(this.t * 3), 0, 7); ctx.stroke();
    }

    // Mũi tên chỉ hướng đi chạy dọc đường (lúc chuẩn bị ở các đợt đầu – giúp người mới)
    if (game.state === 'build' && game.wave < 3) {
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      for (const p of game.paths) {
        for (let d = (this.t * 50) % 64; d < p.length; d += 64) {
          const q = p.posAt(d);
          ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.ang);
          ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-4, -5); ctx.lineTo(-1, 0); ctx.lineTo(-4, 5); ctx.closePath(); ctx.fill();
          ctx.restore();
        }
      }
    }

    // Báo trước số quái ở mỗi cổng (khi đang chuẩn bị, bản đồ nhiều cổng)
    if (game.paths.length > 1 && game.state === 'build') {
      const cnt = gateCounts(game.wave + 1, game.paths.length);
      game.paths.forEach((p, i) => {
        const a = p.pts[0], gx = Math.max(TILE * 0.5, Math.min(W - TILE * 0.5, a.x)), gy = Math.max(TILE * 0.5, Math.min(H - TILE * 0.5, a.y));
        const b = p.pts[1], ang = Math.atan2(b.y - a.y, b.x - a.x);
        const bx = gx + Math.cos(ang) * 34, by = gy + Math.sin(ang) * 34 + Math.sin(this.t * 4) * 2;
        ctx.save(); ctx.translate(bx, by); ctx.rotate(ang);
        ctx.fillStyle = cnt[i] ? 'rgba(239,68,68,0.9)' : 'rgba(156,163,175,0.6)';
        ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-6, -8); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill();
        ctx.restore();
        ctx.fillStyle = 'rgba(15,18,32,0.85)'; roundRect(ctx, bx - 14, by - 26, 28, 16, 5); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
        ctx.fillText(cnt[i], bx, by - 14);
      });
    }

    // Phạm vi tháp đang chọn
    const sel = ui.selected;
    if (ui.showRanges) {
      for (const t of game.towers) if (t !== sel) {
        const c = t.def.color;
        this.ctx.globalAlpha = 0.5; this.rangeCircle(t.x, t.y, t.rangePx, 'rgba(255,255,255,0.04)', c); this.ctx.globalAlpha = 1;
      }
    }
    if (sel) this.rangeCircle(sel.x, sel.y, sel.rangePx, 'rgba(255,255,255,0.12)', 'rgba(255,255,255,0.5)');

    if (sel && sel.def.support) {
      ctx.strokeStyle = 'rgba(251,113,133,0.6)'; ctx.lineWidth = 2; ctx.setLineDash([3, 4]);
      for (const t of game.towers) if (t !== sel && !t.def.support && (t.x - sel.x) ** 2 + (t.y - sel.y) ** 2 <= sel.rangePx ** 2) { ctx.beginPath(); ctx.moveTo(sel.x, sel.y); ctx.lineTo(t.x, t.y); ctx.stroke(); }
      ctx.setLineDash([]);
    }
    for (const t of game.towers) this.drawTower(ctx, t, t === sel);

    this.drawCastle(ctx, game.map.castle.x, game.map.castle.y, game.lives / game.maxLives);

    // Quái: vẽ quái mặt đất trước, quái bay sau
    for (const e of game.enemies) if (!e.flying) this.drawEnemy(ctx, e);
    for (const e of game.enemies) if (e.flying) this.drawEnemy(ctx, e);

    // Tia Mắt Thần
    for (const t of game.towers) if (t.type === 'eye' && t.target && t.target.alive) this.drawBeam(ctx, t);

    for (const c of game.chests) this.drawChest(ctx, c);
    for (const p of game.projectiles) this.drawProjectile(ctx, p);
    this.drawEffects(ctx, game.fx);

    if (!LOW_FX.on) this.drawWeather(ctx, game, dt);
    if (game.night) this.drawNight(ctx, game);

    // Bóng tháp khi đang đặt
    if (ui.placing && (ui.touchPreview || ui.hover)) {
      const { cx, cy } = ui.touchPreview || ui.hover; const def = TOWERS[ui.placing];
      const ok = game.canPlace(cx, cy) && game.gold >= def.levels[0].cost;
      const x = (cx + 0.5) * TILE, y = (cy + 0.5) * TILE;
      ctx.fillStyle = ok ? 'rgba(74,222,128,0.25)' : 'rgba(239,68,68,0.3)';
      ctx.fillRect(cx * TILE, cy * TILE, TILE, TILE);
      this.rangeCircle(x, y, def.levels[0].range * TILE, ok ? 'rgba(255,255,255,0.1)' : 'rgba(239,68,68,0.08)', ok ? 'rgba(255,255,255,0.45)' : 'rgba(239,68,68,0.5)');
      ctx.globalAlpha = 0.6;
      this.drawTower(ctx, { type: ui.placing, def, level: 0, x, y, angle: -Math.PI / 2, recoil: 0, pulse: 0 }, false);
      ctx.globalAlpha = 1;
    } else if (ui.hover && !ui.placing) {
      const { cx, cy } = ui.hover;
      if (game.towerAt[cy] && game.towerAt[cy][cx]) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2; ctx.strokeRect(cx * TILE + 2, cy * TILE + 2, TILE - 4, TILE - 4);
      }
    }

    // Vùng ngắm thiên thạch
    if (ui.ability === 'meteor' && ui.hover) {
      const r = ABILITIES.meteor.radius * TILE;
      this.rangeCircle(ui.hover.x, ui.hover.y, r, 'rgba(249,115,22,0.18)', 'rgba(251,146,60,0.9)');
    }
    if (game.fx.freezeFlash > 0) { ctx.fillStyle = `rgba(186,230,253,${game.fx.freezeFlash * 0.35})`; ctx.fillRect(0, 0, W, H); }

    if (ui.hint && game.towers.length === 0 && game.wave === 0) {
      const x = ui.hint.cx * TILE, y = ui.hint.cy * TILE, a = 0.5 + 0.4 * Math.sin(this.t * 5);
      ctx.strokeStyle = `rgba(253,224,71,${a})`; ctx.lineWidth = 3; ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
      const txt = '💡 Thử đặt Tháp Cung ở đây';
      ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(txt).width + 16, lx = Math.max(tw / 2, Math.min(W - tw / 2, x + TILE / 2));
      ctx.fillStyle = 'rgba(15,18,32,0.85)'; roundRect(ctx, lx - tw / 2, y - 24, tw, 20, 6); ctx.fill();
      ctx.fillStyle = '#fde047'; ctx.fillText(txt, lx, y - 10);
    }
    // Con trỏ bàn phím
    if (ui.kb && ui.hover && !ui.placing) {
      const a = 0.6 + 0.3 * Math.sin(this.t * 6);
      ctx.strokeStyle = `rgba(167,139,250,${a})`; ctx.lineWidth = 3;
      ctx.strokeRect(ui.hover.cx * TILE + 2, ui.hover.cy * TILE + 2, TILE - 4, TILE - 4);
    }
    if (ui.hoverEnemy && ui.hoverEnemy.alive) this.drawEnemyTip(ctx, ui.hoverEnemy);

    // Thanh máu trùm
    const bosses = game.enemies.filter(e => e.d.boss && e.alive);
    if (bosses.length) {
      const hp = bosses.reduce((a, e) => a + e.hp, 0), max = bosses.reduce((a, e) => a + e.maxHp, 0);
      const bw = 420, bx = (W - bw) / 2, by = 10;
      ctx.fillStyle = 'rgba(15,18,32,0.85)'; roundRect(ctx, bx - 8, by - 4, bw + 16, 30, 8); ctx.fill();
      ctx.fillStyle = '#3f1d1d'; ctx.fillRect(bx, by + 12, bw, 9);
      ctx.fillStyle = '#ef4444'; ctx.fillRect(bx, by + 12, bw * hp / max, 9);
      ctx.fillStyle = '#fecaca'; ctx.font = 'bold 11px system-ui, sans-serif'; ctx.textAlign = 'left';
      ctx.fillText('👑 ' + (bosses.length > 1 ? [...new Set(bosses.map(b => b.d.name))].join(' + ') : bosses[0].d.name), bx, by + 8);
      ctx.textAlign = 'right'; ctx.fillText(Math.ceil(hp).toLocaleString('vi-VN') + ' / ' + max.toLocaleString('vi-VN'), bx + bw, by + 8);
    }

    // Cảnh báo: quái sắp tới cung điện (còn < 3 ô) → vòng đỏ quanh cung điện + viền màn hình
    const status = siegeStatus(game), danger = status.level;
    const still = LOW_FX.on || this.reducedMotion.matches;
    if (danger && !game.isOver) {
      const c = game.map.castle, a = still ? 0.55 : 0.5 + 0.15 * Math.sin(this.t * 3);
      ctx.strokeStyle = `rgba(239,68,68,${a + 0.2})`; ctx.lineWidth = danger === 2 ? 5 : 3;
      ctx.strokeRect(Math.max(TILE * 1.5, Math.min(W - TILE * 1.5, c.x)) - 71, Math.max(TILE * 1.5, Math.min(H - TILE * 1.5, c.y)) - 71, 142, 142);
      const grd = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.45, W / 2, H / 2, Math.max(W, H) * 0.65);
      grd.addColorStop(0, 'rgba(239,68,68,0)'); grd.addColorStop(1, `rgba(239,68,68,${(danger === 2 ? 0.5 : 0.28) * (still ? 0.85 : 0.8 + 0.15 * Math.sin(this.t * 3))})`);
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      if (danger === 2) {
        const msg = '⚠ ' + status.text; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
        const hw = ctx.measureText(msg).width / 2 + 6, tx = Math.max(hw, Math.min(W - hw, c.x));
        ctx.fillStyle = 'rgba(15,18,32,0.8)'; roundRect(ctx, tx - hw, Math.max(4, c.y - TILE * 1.4 - 14), hw * 2, 20, 6); ctx.fill();
        ctx.fillStyle = '#fecaca'; ctx.fillText(msg, tx, Math.max(18, c.y - TILE * 1.4));
      }
    }

    // Chớp đỏ khi mất máu
    if (ui.hurt > 0) {
      ctx.fillStyle = `rgba(220,38,38,${ui.hurt * 0.35})`; ctx.fillRect(0, 0, W, H);
    }
    // Vẽ cuối để quái, đêm tối, khói/lửa và chớp sát thương không che máu thành.
    this.drawCastleHealth(ctx, game);
  }

  // Thời tiết theo bản đồ (chỉ để trang trí, không ảnh hưởng luật chơi)
  drawWeather(ctx, game, dt) {
    const deco = game.map.def.theme.deco, id = game.map.def.id;
    const kind = deco === 'crystal' ? 'snow' : deco === 'autumn' ? 'leaf' : deco === 'lava' ? 'ember' : (id === 'swamp' || game.map.def.theme.mist) ? 'mist' : null;
    if (!kind) return;
    if (this.wxKind !== kind || !this.wx) {
      this.wxKind = kind; this.wx = [];
      const n = kind === 'mist' ? 7 : 45;
      for (let i = 0; i < n; i++) this.wx.push({ x: Math.random() * W, y: Math.random() * H, p: Math.random() * 6.28, s: 0.5 + Math.random() });
    }
    for (const q of this.wx) {
      q.p += dt * 2;
      if (kind === 'snow') { q.y += (18 + 18 * q.s) * dt; q.x += Math.sin(q.p) * 12 * dt; }
      else if (kind === 'leaf') { q.y += (20 + 10 * q.s) * dt; q.x += (14 + Math.sin(q.p) * 20) * dt; }
      else if (kind === 'ember') { q.y -= (14 + 16 * q.s) * dt; q.x += Math.sin(q.p) * 8 * dt; }
      else { q.x += 6 * q.s * dt; }
      if (q.y > H + 10) { q.y = -10; q.x = Math.random() * W; }
      if (q.y < -10) { q.y = H + 10; q.x = Math.random() * W; }
      if (q.x > W + 80) q.x = -80;
      if (kind === 'snow') { ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(q.x, q.y, 1.2 + q.s, 0, 7); ctx.fill(); }
      else if (kind === 'leaf') {
        ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.p); ctx.fillStyle = q.s > 1 ? '#ea580c' : '#c2410c';
        ctx.beginPath(); ctx.ellipse(0, 0, 4, 2, 0, 0, 7); ctx.fill(); ctx.restore();
      } else if (kind === 'ember') {
        ctx.fillStyle = `rgba(251,146,60,${0.4 + 0.4 * Math.sin(q.p * 3)})`; ctx.fillRect(q.x, q.y, 2, 2);
      } else {
        const g = ctx.createRadialGradient(q.x, q.y, 10, q.x, q.y, 110);
        g.addColorStop(0, 'rgba(226,232,240,0.12)'); g.addColorStop(1, 'rgba(226,232,240,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(q.x, q.y, 110, 0, 7); ctx.fill();
      }
    }
  }

  // Lớp tối với các quầng sáng quanh tháp và cung điện
  drawNight(ctx, game) {
    const sw = Math.round(W * this.scale), sh = Math.round(H * this.scale);
    if (!this.nightCv || this.nightCv.width !== sw) { this.nightCv = document.createElement('canvas'); this.nightCv.width = sw; this.nightCv.height = sh; }
    const n = this.nightCv.getContext('2d');
    n.setTransform(1, 0, 0, 1, 0, 0); n.globalCompositeOperation = 'source-over';
    n.clearRect(0, 0, sw, sh); n.fillStyle = 'rgba(8,12,38,0.6)'; n.fillRect(0, 0, sw, sh);
    n.setTransform(this.scale, 0, 0, this.scale, 0, 0); n.globalCompositeOperation = 'destination-out';
    const light = (x, y, r) => {
      const g = n.createRadialGradient(x, y, r * 0.2, x, y, r);
      g.addColorStop(0, 'rgba(0,0,0,0.85)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      n.fillStyle = g; n.beginPath(); n.arc(x, y, r, 0, 7); n.fill();
    };
    for (const t of game.towers) light(t.x, t.y, t.rangePx);
    light(game.map.castle.x, game.map.castle.y, TILE * 2);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.drawImage(this.nightCv, 0, 0); ctx.restore();
  }

  drawChest(ctx, c) {
    if (c.life < 2 && Math.floor(c.life * 8) % 2) return;       // nhấp nháy khi sắp biến mất
    const k = c.boss ? 1.4 : 1, bob = Math.sin(this.t * 4 + c.x) * 2;
    const x = c.x, y = c.y + bob;
    ctx.save(); ctx.translate(x, y); ctx.scale(k, k);
    const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
    glow.addColorStop(0, 'rgba(253,224,71,0.5)'); glow.addColorStop(1, 'rgba(253,224,71,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.fill();
    ctx.fillStyle = '#7c2d12'; roundRect(ctx, -9, -5, 18, 12, 2); ctx.fill();
    ctx.fillStyle = '#9a3412'; roundRect(ctx, -9, -10, 18, 7, 3); ctx.fill();
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(-9, -4, 18, 2); ctx.fillRect(-2, -6, 4, 6);
    ctx.restore();
  }

  // Trình vẽ bản đồ: lưới, đường đang vẽ, điểm mốc, xem trước đoạn tiếp theo
  drawEditor(ed, hover) {
    const ctx = this.ctx;
    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const th = this.battleTheme(CUSTOM_THEMES[ed.theme || 0]);
    for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) { ctx.fillStyle = (x + y) % 2 ? th.grass : th.grass2; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
    ctx.fillStyle = 'rgba(168,85,247,0.25)'; ctx.fillRect(0, 0, TILE, H);   // cột được đặt cổng
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'; ctx.lineWidth = 1;
    for (let x = 0; x <= COLS; x++) { ctx.beginPath(); ctx.moveTo(x * TILE, 0); ctx.lineTo(x * TILE, H); ctx.stroke(); }
    for (let y = 0; y <= ROWS; y++) { ctx.beginPath(); ctx.moveTo(0, y * TILE); ctx.lineTo(W, y * TILE); ctx.stroke(); }
    const extra = ed.extra || [], cur = extra.length ? extra[extra.length - 1] : ed.pts, pts = cur;
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const p of [ed.pts, ...extra]) if (p.length) {
      ctx.strokeStyle = th.path2; ctx.lineWidth = ROAD_WIDTH;
      ctx.beginPath(); ctx.moveTo((p[0][0] + 0.5) * TILE, (p[0][1] + 0.5) * TILE);
      for (const [x, y] of p) ctx.lineTo((x + 0.5) * TILE, (y + 0.5) * TILE);
      ctx.stroke();
      if (p.length === 1) { ctx.fillStyle = th.path; ctx.beginPath(); ctx.arc((p[0][0] + 0.5) * TILE, (p[0][1] + 0.5) * TILE, ROAD_WIDTH / 2, 0, 7); ctx.fill(); }
    }
    // Điểm của các cổng phụ
    extra.forEach((br, bi) => br.forEach(([x, y], i) => {
      if (br === cur) return;
      ctx.fillStyle = i === 0 ? '#a855f7' : '#374151';
      ctx.beginPath(); ctx.arc((x + .5) * TILE, (y + .5) * TILE, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center'; ctx.fillText(i === 0 ? '⛩' + (bi + 2) : '•', (x + .5) * TILE, (y + .5) * TILE + 4);
    }));
    // Xem trước đoạn tới ô đang trỏ
    if (hover && pts.length) {
      const [lx, ly] = pts[pts.length - 1];
      const ok = (hover.cx === lx) !== (hover.cy === ly);
      if (ok) {
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 4; ctx.setLineDash([8, 6]);
        ctx.beginPath(); ctx.moveTo((lx + .5) * TILE, (ly + .5) * TILE); ctx.lineTo((hover.cx + .5) * TILE, (hover.cy + .5) * TILE); ctx.stroke(); ctx.setLineDash([]);
      }
      ctx.strokeStyle = ok ? 'rgba(74,222,128,0.9)' : 'rgba(239,68,68,0.8)'; ctx.lineWidth = 3;
      ctx.strokeRect(hover.cx * TILE + 2, hover.cy * TILE + 2, TILE - 4, TILE - 4);
    } else if (hover) {
      ctx.strokeStyle = hover.cx === 0 ? 'rgba(74,222,128,0.9)' : 'rgba(239,68,68,0.8)'; ctx.lineWidth = 3;
      ctx.strokeRect(hover.cx * TILE + 2, hover.cy * TILE + 2, TILE - 4, TILE - 4);
    }
    for (const [x, y] of ed.hot || []) {
      ctx.fillStyle = 'rgba(249,115,22,0.55)'; ctx.fillRect(x * TILE + 3, y * TILE + 3, TILE - 6, TILE - 6);
      ctx.fillStyle = '#fff'; ctx.font = '16px system-ui'; ctx.textAlign = 'center'; ctx.fillText('🔥', (x + .5) * TILE, (y + .5) * TILE + 6);
    }
    const main = ed.pts;
    if (cur !== main) main.forEach(([x, y], i) => {
      ctx.fillStyle = i === 0 ? '#a855f7' : i === main.length - 1 ? '#ef4444' : '#1f2937';
      ctx.beginPath(); ctx.arc((x + .5) * TILE, (y + .5) * TILE, 9, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 10px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? '⛩1' : i === main.length - 1 ? '🏰' : '', (x + .5) * TILE, (y + .5) * TILE + 4);
    });
    const isMain = cur === main;
    pts.forEach(([x, y], i) => {
      ctx.fillStyle = i === 0 ? '#a855f7' : i === pts.length - 1 && isMain ? '#ef4444' : '#1f2937';
      ctx.beginPath(); ctx.arc((x + .5) * TILE, (y + .5) * TILE, 11, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center';
      ctx.fillText(i === 0 ? (isMain ? '⛩' : '⛩' + (extra.length + 1)) : i === pts.length - 1 && isMain ? '🏰' : i, (x + .5) * TILE, (y + .5) * TILE + 4);
    });
  }

  drawEnemyTip(ctx, e) {
    const d = e.d, lines = [d.name, `Máu ${Math.ceil(e.hp)} / ${e.maxHp}`];
    const tags = [];
    if (e.armor >= 0.5) tags.push('Giáp ' + e.armor.toFixed(1));
    tags.push('Tốc ' + (e.speed * (1 - e.slow)).toFixed(2));
    if (d.flying) tags.push('Bay');
    if (d.healer) tags.push('Hồi máu');
    if (d.split) tags.push('Tách đôi');
    if (d.boss) tags.push('Trùm');
    if (d.stealth) tags.push(e.revealed ? 'Tàng hình (đã lộ)' : 'Tàng hình');
    if (d.burrow) tags.push('Đào hầm');
    if (d.hexer) tags.push('Phá phép tháp');
    if (d.bonus) tags.push('Quái thưởng');
    if (e.shield > 0) tags.push('Khiên ' + e.shield);
    if (e.poisonT > 0) tags.push('Độc ×' + e.poisonStacks);
    lines.push(tags.join(' · '));
    ctx.font = '12px system-ui, sans-serif';
    const w = Math.max(...lines.map(l => ctx.measureText(l).width)) + 16, h = lines.length * 16 + 8;
    let x = e.x + 18, y = e.y - h - 10;
    if (x + w > W) x = e.x - w - 18;
    if (y < 0) y = e.y + 18;
    ctx.fillStyle = 'rgba(15,18,32,0.9)'; roundRect(ctx, x, y, w, h, 6); ctx.fill();
    ctx.strokeStyle = d.color; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.textAlign = 'left';
    lines.forEach((l, i) => { ctx.fillStyle = i === 0 ? '#ffffff' : '#c7cbe6'; ctx.font = (i === 0 ? 'bold ' : '') + '12px system-ui, sans-serif'; ctx.fillText(l, x + 8, y + 18 + i * 16); });
    ctx.textAlign = 'center';
  }

  rangeCircle(x, y, r, fill, stroke) {
    const ctx = this.ctx;
    ctx.fillStyle = fill; ctx.strokeStyle = stroke; ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
  }

  drawTower(ctx, t, selected) {
    const x = t.x, y = t.y, lv = t.level, col = t.def.color;
    // Bệ
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(x + 2, y + 15, 18, 6, 0, 0, 7); ctx.fill();
    ctx.fillStyle = selected ? '#e5e7eb' : '#9ca3af';
    roundRect(ctx, x - 18, y - 6, 36, 22, 5); ctx.fill();
    ctx.fillStyle = '#6b7280'; roundRect(ctx, x - 18, y + 10, 36, 6, 3); ctx.fill();
    // Sao cấp độ
    for (let i = 0; i <= lv; i++) {
      ctx.fillStyle = lv >= 3 ? '#f472b6' : '#fde047'; ctx.beginPath(); ctx.arc(x - lv * 4 + i * 8, y + 13, 2.2, 0, 7); ctx.fill();
    }
    if (t.branch != null) {
      ctx.strokeStyle = t.branch === 0 ? 'rgba(250,204,21,0.8)' : 'rgba(244,114,182,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y - 4, 19 + Math.sin(this.t * 4) * 1.5, 0, 7); ctx.stroke();
    }
    if (t.disabledT > 0) {
      ctx.save(); ctx.globalAlpha = 0.55; ctx.fillStyle = '#111827'; ctx.beginPath(); ctx.arc(x, y - 2, 19, 0, 7); ctx.fill(); ctx.restore();
      ctx.fillStyle = '#fca5a5'; ctx.font = 'bold 11px system-ui'; ctx.textAlign = 'center'; ctx.fillText('✖', x, y - 20);
    }
    if (t.buff > 0) { ctx.fillStyle = '#fb7185'; ctx.beginPath(); ctx.moveTo(x + 14, y - 18); ctx.lineTo(x + 18, y - 12); ctx.lineTo(x + 10, y - 12); ctx.fill(); }
    const rec = (t.recoil || 0) * 4;
    ctx.save(); ctx.translate(x, y - 4);
    switch (t.type) {
      case 'archer': {
        ctx.fillStyle = '#7c5a36'; ctx.beginPath(); ctx.arc(0, 0, 12 + lv, 0, 7); ctx.fill();
        ctx.rotate(t.angle);
        ctx.strokeStyle = col; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(-rec, 0, 10, -1.2, 1.2); ctx.stroke();
        ctx.strokeStyle = '#f5f5f4'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-rec + 10 * Math.cos(-1.2), 10 * Math.sin(-1.2)); ctx.lineTo(-rec - 4, 0); ctx.lineTo(-rec + 10 * Math.cos(1.2), 10 * Math.sin(1.2)); ctx.stroke();
        ctx.fillStyle = '#e7e5e4'; ctx.fillRect(-rec - 4, -1, 16, 2);
        if (t.branch === 0) { ctx.fillRect(-rec - 2, -5, 13, 1.5); ctx.fillRect(-rec - 2, 3.5, 13, 1.5); }
        if (t.branch === 1) { ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(-rec, 0, 12, -1.1, 1.1); ctx.stroke(); }
        break;
      }
      case 'cannon': {
        ctx.fillStyle = '#4b5563'; ctx.beginPath(); ctx.arc(0, 0, 13 + lv, 0, 7); ctx.fill();
        ctx.rotate(t.angle);
        if (t.branch === 0) { ctx.fillStyle = '#111827'; roundRect(ctx, -4 - rec, -9, 16, 18, 4); ctx.fill(); }
        else { ctx.fillStyle = '#1f2937'; roundRect(ctx, -4 - rec, -5 - lv, 22, 10 + lv * 2, 3); ctx.fill(); }
        if (t.branch === 1) { ctx.fillStyle = `rgba(249,115,22,${0.6 + 0.4 * Math.sin(this.t * 8)})`; ctx.beginPath(); ctx.arc(18 - rec, 0, 4, 0, 7); ctx.fill(); }
        ctx.fillStyle = t.branch === 1 ? '#f97316' : col; ctx.beginPath(); ctx.arc(0, 0, 7, 0, 7); ctx.fill();
        break;
      }
      case 'frost': {
        const p = t.pulse || 0;
        ctx.fillStyle = '#e0f2fe'; ctx.beginPath(); ctx.arc(0, 0, 12 + lv, 0, 7); ctx.fill();
        ctx.rotate(this.t * 0.8);
        ctx.fillStyle = col;
        for (let i = 0; i < 6; i++) {
          ctx.rotate(Math.PI / 3);
          ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(3, -12 - lv * 2 - p * 3); ctx.lineTo(-3, -12 - lv * 2 - p * 3); ctx.closePath(); ctx.fill();
        }
        ctx.fillStyle = t.branch === 1 ? '#1e3a8a' : '#fff'; ctx.beginPath(); ctx.arc(0, 0, t.branch != null ? 6 : 4, 0, 7); ctx.fill();
        if (t.branch === 0) { ctx.strokeStyle = 'rgba(224,242,254,0.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 20, 0, 7); ctx.stroke(); }
        break;
      }
      case 'tesla': {
        ctx.fillStyle = '#374151'; ctx.fillRect(-7, -8, 14, 14);
        ctx.fillStyle = '#9ca3af'; ctx.fillRect(-3, -20 - lv * 2, 6, 14);
        const glow = 0.5 + 0.5 * Math.sin(this.t * 10 + x);
        ctx.fillStyle = t.branch === 1 ? `rgba(239,68,68,${0.5 + glow * 0.5})` : `rgba(250,204,21,${0.5 + glow * 0.5})`;
        ctx.beginPath(); ctx.arc(0, -22 - lv * 2, 6 + lv, 0, 7); ctx.fill();
        if (t.branch === 0) for (const sx of [-12, 12]) { ctx.fillStyle = '#9ca3af'; ctx.fillRect(sx - 2, -14, 4, 10); ctx.fillStyle = `rgba(250,204,21,${0.4 + glow * 0.6})`; ctx.beginPath(); ctx.arc(sx, -16, 4, 0, 7); ctx.fill(); }
        ctx.strokeStyle = '#fef9c3'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(0, -22 - lv * 2, 9 + lv + glow * 2, 0, 7); ctx.stroke();
        break;
      }
      case 'sniper': {
        ctx.fillStyle = '#3f6212'; ctx.beginPath(); ctx.arc(0, 0, 11 + lv, 0, 7); ctx.fill();
        ctx.rotate(t.angle);
        if (t.branch === 1) { ctx.fillStyle = '#1a2e05'; ctx.fillRect(-6 - rec, -5, 30, 3); ctx.fillRect(-6 - rec, 2, 30, 3); }
        else { ctx.fillStyle = '#1a2e05'; ctx.fillRect(-6 - rec, -2, 28 + lv * 3, 4); }
        if (t.branch === 0 && t.target) { ctx.strokeStyle = 'rgba(239,68,68,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(30, 0); ctx.lineTo(Math.hypot(t.target.x - t.x, t.target.y - t.y), 0); ctx.stroke(); }
        ctx.fillStyle = col; ctx.fillRect(-2 - rec, -4, 8, 3);
        break;
      }
      case 'poison': {
        ctx.fillStyle = '#365314'; ctx.beginPath(); ctx.arc(0, 0, 11 + lv, 0, 7); ctx.fill();
        ctx.fillStyle = t.branch === 1 ? '#facc15' : col;
        ctx.beginPath(); ctx.moveTo(-5, -14 - lv); ctx.lineTo(5, -14 - lv); ctx.lineTo(5, -8); ctx.lineTo(9, 4); ctx.lineTo(-9, 4); ctx.lineTo(-5, -8); ctx.closePath(); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.5)'; const bb = Math.sin(this.t * 5 + x) * 2;
        ctx.beginPath(); ctx.arc(-2, -2 + bb, 2, 0, 7); ctx.arc(3, -5 - bb, 1.5, 0, 7); ctx.fill();
        if (t.branch === 0) { ctx.fillStyle = '#1a2e05'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('☣', 0, 2); }
        break;
      }
      case 'banner': {
        ctx.fillStyle = '#78350f'; ctx.fillRect(-2, -26 - lv * 2, 3, 30 + lv * 2);
        const wv = Math.sin(this.t * 5 + x) * 3;
        ctx.fillStyle = t.branch === 1 ? '#fbbf24' : col;
        ctx.beginPath(); ctx.moveTo(1, -26 - lv * 2); ctx.quadraticCurveTo(10, -24 - lv * 2 + wv, 18, -20 - lv * 2); ctx.lineTo(1, -12 - lv * 2); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fef3c7'; ctx.beginPath(); ctx.arc(7, -19 - lv * 2, 2.5, 0, 7); ctx.fill();
        if (t.branch === 0) { ctx.fillStyle = '#ef4444'; ctx.beginPath(); ctx.moveTo(-1, -12); ctx.lineTo(-14, -8); ctx.lineTo(-1, -4); ctx.fill(); }
        break;
      }
      case 'eye': {
        ctx.fillStyle = '#4c1d95'; ctx.beginPath(); ctx.arc(0, 0, 14 + lv, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, 11 + lv, 7 + lv * 0.5, 0, 0, 7); ctx.fill();
        const a = t.angle; const k = t.target ? 4 : 2;
        if (t.branch === 1) {
          ctx.strokeStyle = 'rgba(244,114,182,0.6)'; ctx.lineWidth = 2;
          for (let i = 0; i < 8; i++) { const ra = i * Math.PI / 4 + this.t; ctx.beginPath(); ctx.moveTo(Math.cos(ra) * 16, Math.sin(ra) * 12); ctx.lineTo(Math.cos(ra) * 21, Math.sin(ra) * 16); ctx.stroke(); }
        }
        ctx.fillStyle = t.branch === 0 ? '#dc2626' : col; ctx.beginPath(); ctx.arc(Math.cos(a) * k, Math.sin(a) * k, 4.5 + lv * 0.5, 0, 7); ctx.fill();
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(Math.cos(a) * k, Math.sin(a) * k, 2, 0, 7); ctx.fill();
        break;
      }
    }
    // Lửa nòng ngay sau khi bắn
    if (t.recoil > 0.65 && (t.type === 'cannon' || t.type === 'sniper' || t.type === 'archer')) {
      const len = t.type === 'cannon' ? 20 : t.type === 'sniper' ? 26 + lv * 3 : 12;
      const k = (t.recoil - 0.65) / 0.35, fx = Math.cos(t.angle) * len, fy = Math.sin(t.angle) * len;
      ctx.globalAlpha = k;
      ctx.fillStyle = t.type === 'archer' ? '#fef3c7' : '#fde047';
      ctx.beginPath(); ctx.arc(fx, fy, (t.type === 'cannon' ? 7 : 4) * (0.6 + k * 0.6), 0, 7); ctx.fill();
      if (t.type !== 'archer') { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawBeam(ctx, t) {
    const e = t.target; const s = t.stats;
    const k = Math.min(1, t.beamT / (s.ramp * 2));
    const w = 2 + k * 5 + Math.sin(this.t * 30) * 0.8;
    const sx = t.x + Math.cos(t.angle) * 6, sy = t.y - 4 + Math.sin(t.angle) * 6;
    ctx.strokeStyle = `rgba(244,114,182,${0.4 + k * 0.4})`; ctx.lineWidth = w + 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x, e.y); ctx.stroke();
    ctx.strokeStyle = '#fff0f6'; ctx.lineWidth = w * 0.4;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(e.x, e.y); ctx.stroke();
  }

  drawEnemy(ctx, e) {
    const d = e.d, r = d.radius, x = e.x, bob = Math.sin(e.wob) * (e.flying ? 4 : 1.5);
    const y = e.y + (e.flying ? -14 : 0) + bob;
    // Bóng
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath(); ctx.ellipse(e.x, e.y + r * 0.7, r * (e.flying ? 0.7 : 1), r * 0.35, 0, 0, 7); ctx.fill();

    if (e.under) {
      // Chỉ thấy ụ đất đang di chuyển
      ctx.fillStyle = '#78350f'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 4, r, r * 0.5, 0, Math.PI, 0); ctx.fill();
      ctx.fillStyle = '#92400e'; ctx.beginPath(); ctx.arc(e.x - 4, e.y, 2, 0, 7); ctx.arc(e.x + 5, e.y + 1, 2, 0, 7); ctx.fill();
      return;
    }
    const baseA = ctx.globalAlpha, ghostA = d.stealth ? (e.revealed ? 0.85 : 0.3) : 1;
    if (ghostA < 1) ctx.globalAlpha = baseA * ghostA;
    const warColors = { grunt: '#647259', runner: '#ac8962', tank: '#68605b', bat: '#665370', shaman: '#557d79', slime: '#467c60', slimelet: '#67967c', ghost: '#9c8da8', boss: '#9b4942', dragonboss: '#b75a35', slimeking: '#527955', knight: '#767a80', hexer: '#75547f' };
    const body = e.hitFlash > 0 ? '#ffffff' : warColors[e.type] || d.color;
    // Gai nhọn tạo hình dữ hơn, vẫn phân biệt được từng loài khi thiếu màu.
    if (!e.flying && e.type !== 'slimelet' && e.type !== 'ghost') {
      ctx.fillStyle = '#322d2d';
      for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + side * r * 0.55, y - r * 0.45); ctx.lineTo(x + side * r * 1.35, y - r * 1.2); ctx.lineTo(x + side * r, y + r * 0.2); ctx.closePath(); ctx.fill(); }
    }
    ctx.fillStyle = body;
    switch (e.type) {
      case 'dragonboss':
        ctx.fillStyle = '#facc15';
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(x + i * 7 - 3, y - r * 0.5); ctx.lineTo(x + i * 7, y - r * 0.5 - 9); ctx.lineTo(x + i * 7 + 3, y - r * 0.5); ctx.fill(); }
        ctx.fillStyle = body;
        // fallthrough
      case 'dragon':
        // đuôi
        ctx.strokeStyle = body; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - Math.cos(e.ang) * r * 1.5, y - Math.sin(e.ang) * r * 1.5 + Math.sin(e.wob) * 4, x - Math.cos(e.ang) * r * 2.2, y - Math.sin(e.ang) * r * 2.2);
        ctx.stroke();
        // fallthrough: cánh như dơi
      case 'bat': {
        const f = Math.sin(e.wob * 2) * 0.6;
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.quadraticCurveTo(x - r * 1.4, y - r * (1 + f), x - r * 2, y + r * 0.2);
        ctx.quadraticCurveTo(x - r, y, x, y + r * 0.4);
        ctx.quadraticCurveTo(x + r, y, x + r * 2, y + r * 0.2);
        ctx.quadraticCurveTo(x + r * 1.4, y - r * (1 + f), x, y);
        ctx.fill();
        ctx.beginPath(); ctx.arc(x, y, r * 0.6, 0, 7); ctx.fill();
        break;
      }
      case 'tank': {
        roundRect(ctx, x - r, y - r * 0.8, r * 2, r * 1.6, 6); ctx.fill();
        ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#5d4037';
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.arc(x + i * r * 0.6, y - r * 0.15, r * 0.3, 0, 7); ctx.fill(); }
        break;
      }
      case 'slimeking':
      case 'slime': case 'slimelet': {
        const sq = 1 + Math.sin(e.wob) * 0.12;
        ctx.beginPath(); ctx.ellipse(x, y + r * 0.2, r * sq, r * (2 - sq) * 0.85, 0, 0, 7); ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(x - r * 0.35, y - r * 0.2, r * 0.25, 0, 7); ctx.fill();
        if (e.type === 'slimeking') {
          ctx.fillStyle = '#facc15'; ctx.beginPath(); const cy = y - r * 0.75;
          ctx.moveTo(x - 10, cy); ctx.lineTo(x - 10, cy - 10); ctx.lineTo(x - 5, cy - 5); ctx.lineTo(x, cy - 12); ctx.lineTo(x + 5, cy - 5); ctx.lineTo(x + 10, cy - 10); ctx.lineTo(x + 10, cy); ctx.closePath(); ctx.fill();
        }
        break;
      }
      case 'boss': {
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.fillStyle = '#facc15';
        for (let i = 0; i < 5; i++) {
          const a = -Math.PI / 2 + (i - 2) * 0.35;
          ctx.beginPath(); ctx.moveTo(x + Math.cos(a - 0.12) * r, y + Math.sin(a - 0.12) * r);
          ctx.lineTo(x + Math.cos(a) * (r + 10), y + Math.sin(a) * (r + 10));
          ctx.lineTo(x + Math.cos(a + 0.12) * r, y + Math.sin(a + 0.12) * r); ctx.fill();
        }
        break;
      }
      case 'shaman': {
        ctx.beginPath(); ctx.moveTo(x, y - r * 1.3); ctx.lineTo(x + r, y + r); ctx.lineTo(x - r, y + r); ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#a5f3fc'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x, y, r * 1.4 + Math.sin(e.wob) * 2, 0, 7); ctx.stroke();
        break;
      }
      case 'goldgob': {
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
        ctx.fillStyle = '#a16207'; ctx.beginPath(); ctx.ellipse(x - Math.cos(e.ang) * r, y - Math.sin(e.ang) * r - 2, r * 0.6, r * 0.7, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fef08a'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText('$', x - Math.cos(e.ang) * r, y - Math.sin(e.ang) * r + 1);
        if (Math.random() < 0.3) { ctx.fillStyle = '#fde047'; ctx.fillRect(x + (Math.random() - 0.5) * r * 2, y - r - Math.random() * 6, 2, 2); }
        break;
      }
      case 'hexer': {
        ctx.beginPath(); ctx.moveTo(x, y - r * 1.6); ctx.lineTo(x + r * 0.9, y - r * 0.4); ctx.lineTo(x - r * 0.9, y - r * 0.4); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.arc(x, y + r * 0.1, r * 0.8, 0, 7); ctx.fill();
        ctx.fillStyle = `rgba(216,180,254,${0.5 + 0.4 * Math.sin(e.wob * 2)})`; ctx.beginPath(); ctx.arc(x, y - r * 1.6, 3, 0, 7); ctx.fill();
        break;
      }
      case 'knight': {
        roundRect(ctx, x - r * 0.8, y - r, r * 1.6, r * 2, 5); ctx.fill();
        ctx.fillStyle = e.hitFlash > 0 ? '#fff' : '#cbd5e1';
        ctx.beginPath(); ctx.moveTo(x + r * 0.9, y - r * 0.7); ctx.lineTo(x + r * 1.4, y - r * 0.4); ctx.lineTo(x + r * 1.4, y + r * 0.4); ctx.lineTo(x + r * 0.9, y + r * 0.8); ctx.closePath(); ctx.fill();
        break;
      }
      case 'ghost': {
        ctx.beginPath(); ctx.arc(x, y - 2, r, Math.PI, 0);
        for (let i = 0; i <= 4; i++) ctx.lineTo(x + r - i * r / 2, y + r * 0.8 + (i % 2 ? -4 : 0) + Math.sin(e.wob + i) * 2);
        ctx.closePath(); ctx.fill();
        break;
      }
      case 'mole': {
        ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.85, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#fcd34d'; ctx.beginPath(); ctx.moveTo(x + Math.cos(e.ang) * r * 1.3, y + Math.sin(e.ang) * r * 1.3);
        ctx.lineTo(x + Math.cos(e.ang + 0.5) * r * 0.8, y + Math.sin(e.ang + 0.5) * r * 0.8);
        ctx.lineTo(x + Math.cos(e.ang - 0.5) * r * 0.8, y + Math.sin(e.ang - 0.5) * r * 0.8); ctx.fill();
        break;
      }
      default:
        ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill();
    }
    // Hốc mắt tối, mắt đỏ hẹp và hàm răng thay mắt tròn dễ thương.
    const ex = Math.cos(e.ang) * r * 0.2, ey = Math.sin(e.ang) * r * 0.15;
    ctx.fillStyle = '#211d22'; ctx.fillRect(x - r * 0.65 + ex, y - r * 0.32 + ey, r * 1.3, r * 0.48);
    ctx.strokeStyle = e.hitFlash > 0 ? '#4b1010' : '#ff7051'; ctx.lineWidth = Math.max(1.5, r * 0.14);
    ctx.beginPath(); ctx.moveTo(x - r * 0.5 + ex, y - r * 0.24 + ey); ctx.lineTo(x - r * 0.13 + ex, y - r * 0.06 + ey);
    ctx.moveTo(x + r * 0.13 + ex, y - r * 0.06 + ey); ctx.lineTo(x + r * 0.5 + ex, y - r * 0.24 + ey); ctx.stroke();
    ctx.fillStyle = '#dfceb1';
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(x + side * r * 0.28, y + r * 0.27); ctx.lineTo(x + side * r * 0.18, y + r * 0.56); ctx.lineTo(x + side * r * 0.06, y + r * 0.27); ctx.closePath(); ctx.fill(); }
    // Hiệu ứng băng
    if (e.slow > 0) {
      ctx.strokeStyle = 'rgba(186,230,253,0.9)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r + 3, 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = baseA;
    if (e.shield > 0) {
      ctx.strokeStyle = 'rgba(147,197,253,0.8)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(x, y, r + 5, 0, 7); ctx.stroke();
      ctx.fillStyle = '#dbeafe'; ctx.font = 'bold 9px system-ui'; ctx.textAlign = 'center'; ctx.fillText(e.shield, x, y - r - 10);
    }
    if (e.stunT > 0) {
      ctx.fillStyle = '#fef08a';
      for (let i = 0; i < 3; i++) { const a = this.t * 6 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r, y - r - 4 + Math.sin(a) * 3, 2, 0, 7); ctx.fill(); }
    }
    if (e.burnT > 0 && Math.random() < 0.5) {
      ctx.fillStyle = Math.random() < 0.5 ? '#f97316' : '#fde047';
      ctx.fillRect(x + (Math.random() - 0.5) * r * 1.6, y - Math.random() * r * 1.4, 3, 3);
    }
    if (e.poisonT > 0) {
      ctx.fillStyle = e.corrode ? 'rgba(250,204,21,0.85)' : 'rgba(163,230,53,0.85)';
      for (let i = 0; i < Math.min(3, e.poisonStacks); i++) { const a = this.t * 3 + i * 2.1; ctx.beginPath(); ctx.arc(x + Math.cos(a) * r * 0.8, y + r * 0.3 - ((this.t * 20 + i * 7) % 14), 1.8, 0, 7); ctx.fill(); }
    }
    if (e.vulnT > 0) {
      ctx.strokeStyle = 'rgba(244,114,182,0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x - r - 4, y); ctx.lineTo(x + r + 4, y); ctx.moveTo(x, y - r - 4); ctx.lineTo(x, y + r + 4); ctx.stroke();
    }
    // Thanh máu
    if (e.hp < e.maxHp) {
      const bw = Math.max(20, r * 2), k = e.hp / e.maxHp;
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(x - bw / 2, y - r - 9, bw, 4);
      ctx.fillStyle = k > 0.5 ? '#4ade80' : k > 0.25 ? '#facc15' : '#ef4444';
      ctx.fillRect(x - bw / 2, y - r - 9, bw * k, 4);
    }
  }

  drawProjectile(ctx, p) {
    if (p.kind === 'meteor') {
      const k = Math.min(1, p.t / p.flight);
      ctx.fillStyle = `rgba(0,0,0,${0.15 + k * 0.25})`; ctx.beginPath(); ctx.ellipse(p.tx, p.ty, 10 + k * 20, 5 + k * 9, 0, 0, 7); ctx.fill();
      const dx = p.tx - p.sx, dy = p.ty - p.sy, d = Math.hypot(dx, dy);
      const grd = ctx.createLinearGradient(p.x - dx / d * 60, p.y - dy / d * 60, p.x, p.y);
      grd.addColorStop(0, 'rgba(251,146,60,0)'); grd.addColorStop(1, 'rgba(251,191,36,0.9)');
      ctx.strokeStyle = grd; ctx.lineWidth = 12; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x - dx / d * 60, p.y - dy / d * 60); ctx.lineTo(p.x, p.y); ctx.stroke();
      ctx.fillStyle = '#7c2d12'; ctx.beginPath(); ctx.arc(p.x, p.y, 10, 0, 7); ctx.fill();
      ctx.fillStyle = '#fdba74'; ctx.beginPath(); ctx.arc(p.x - 2, p.y - 2, 5, 0, 7); ctx.fill();
      return;
    }
    if (p.kind === 'shell') {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(p.x, p.y - p.h, 5, 0, 7); ctx.fill();
      return;
    }
    if (p.kind === 'dart') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
      ctx.fillStyle = '#a3e635'; ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(-5, -2.5); ctx.lineTo(-5, 2.5); ctx.closePath(); ctx.fill();
      ctx.restore(); return;
    }
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.ang);
    ctx.strokeStyle = p.heavy ? '#fca5a5' : '#f5f5f4'; ctx.lineWidth = p.heavy ? 3 : 2;
    ctx.beginPath(); ctx.moveTo(-8, 0); ctx.lineTo(4, 0); ctx.stroke();
    ctx.fillStyle = '#d6d3d1'; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(2, -3); ctx.lineTo(2, 3); ctx.fill();
    ctx.restore();
  }

  drawEffects(ctx, fx) {
    for (const r of fx.rings) {
      const k = 1 - r.life / r.max;
      ctx.strokeStyle = r.color; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(r.x, r.y, r.r * (0.3 + 0.7 * k), 0, 7); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    for (const c of fx.corpses) {
      const k = c.life / c.max;
      ctx.save(); ctx.globalAlpha = k * 0.8; ctx.translate(c.x, c.y); ctx.scale(0.4 + 0.6 * k, 0.4 + 0.6 * k); ctx.translate(-c.x, -c.y);
      this.drawEnemy(ctx, { d: c.d, type: c.type, x: c.x, y: c.y, ang: c.ang, flying: c.flying, hp: 1, maxHp: 1, wob: 0, slow: 0, hitFlash: 1, shield: 0, revealed: true });
      ctx.restore();
    }
    for (const b of fx.beams) {
      const k = 1 - b.life / b.max, h = 90 * Math.min(1, k * 2.5);
      const grd = ctx.createLinearGradient(b.x, b.y, b.x, b.y - h);
      grd.addColorStop(0, b.color); grd.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.globalAlpha = 1 - k; ctx.fillStyle = grd; ctx.fillRect(b.x - 9 * (1 - k * 0.5), b.y - h, 18 * (1 - k * 0.5), h);
      ctx.globalAlpha = 1;
    }
    for (const f of fx.fires) {
      const a = Math.min(1, f.life / f.max * 2) * 0.22;
      ctx.fillStyle = `rgba(249,115,22,${a})`; ctx.beginPath(); ctx.arc(f.x, f.y, f.r * 0.85, 0, 7); ctx.fill();
      for (let i = 0; i < 3; i++) {
        const px = f.x + (Math.random() - 0.5) * f.r * 1.4, py = f.y + (Math.random() - 0.5) * f.r * 1.4;
        ctx.fillStyle = Math.random() < 0.5 ? 'rgba(253,224,71,0.8)' : 'rgba(239,68,68,0.8)'; ctx.fillRect(px, py, 3, 4);
      }
    }
    for (const b of fx.booms) {
      const k = 1 - b.life / b.max;
      const grd = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r);
      grd.addColorStop(0, `rgba(255,237,160,${1 - k})`); grd.addColorStop(0.5, `rgba(249,115,22,${0.7 * (1 - k)})`); grd.addColorStop(1, 'rgba(249,115,22,0)');
      ctx.fillStyle = grd; ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (0.5 + 0.5 * k), 0, 7); ctx.fill();
    }
    for (const b of fx.bolts) {
      ctx.globalAlpha = b.life / b.max;
      for (const [w, c] of [[5, 'rgba(250,204,21,0.5)'], [2, '#fefce8']]) {
        ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineJoin = 'round';
        for (const line of b.segs) {
          ctx.beginPath(); ctx.moveTo(line[0].x, line[0].y);
          for (const q of line) ctx.lineTo(q.x, q.y);
          ctx.stroke();
        }
      }
    }
    for (const tr of fx.tracers) {
      ctx.globalAlpha = tr.life / tr.max;
      ctx.strokeStyle = '#ecfccb'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(tr.x1, tr.y1 - 4); ctx.lineTo(tr.x2, tr.y2); ctx.stroke();
    }
    for (const p of fx.parts) {
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color; ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
    ctx.globalAlpha = 1;
    ctx.font = 'bold 13px system-ui, sans-serif'; ctx.textAlign = 'center';
    for (const t of fx.texts) {
      ctx.globalAlpha = Math.min(1, t.life / t.max * 1.5);
      ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillText(t.str, t.x + 1, t.y + 1);
      ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
