'use strict';
// ===== Thành tựu, thống kê trọn đời & cẩm nang (gắn thêm vào App) =====
Object.assign(App, {
  ach: null,
  loadAch() {
    const raw = store.obj('ach'), A = { unlocked: {}, kills: 0, bosses: 0, goblins: 0, poisonKills: 0, branches: {}, wins: {}, leakBy: {}, games: 0, won: 0, lost: 0, time: 0, waves: 0, gold: 0 };
    for (const k of Object.keys(A)) {
      const v = raw[k];
      if (typeof A[k] === 'number') A[k] = Number.isFinite(v) ? v : 0;
      else A[k] = v && typeof v === 'object' && !Array.isArray(v) ? v : {};
    }
    this.ach = A;
  },
  saveAch() { store.set('ach', this.ach); },
  // Cộng dồn số máu mất theo loại quái của ván vừa kết thúc vào thống kê trọn đời
  addLeaks(g) {
    for (const [t, n] of Object.entries(g.stats.leakBy || {})) if (ENEMIES[t] && Number.isFinite(n)) this.ach.leakBy[t] = (Number.isFinite(this.ach.leakBy[t]) ? this.ach.leakBy[t] : 0) + n;
  },
  leakHtml() {
    const top = Object.entries(this.ach.leakBy).filter(([t, n]) => ENEMIES[t] && n > 0).sort((a, b) => b[1] - a[1]).slice(0, 5);
    if (!top.length) return '';
    const max = top[0][1];
    return '<div class="leak-life"><h4>🩸 Quái làm mất nhiều máu nhất (mọi ván)</h4>' + top.map(([t, n]) =>
      `<div class="bar-row"><span>${ENEMIES[t].name}</span><div class="bar"><i style="width:${Math.round(n / max * 100)}%"></i></div><b>${Math.round(n).toLocaleString('vi-VN')}</b></div>`).join('')
      + `<p class="desc">${LOSS_TIPS[LOSS_GROUP[top[0][0]] || 'basic']}</p></div>`;
  },
  unlock(id) {
    if (!this.ach || this.ach.unlocked[id]) return;
    this.ach.unlocked[id] = Date.now(); this.saveAch();
    const a = ACHIEVEMENTS.find(x => x.id === id);
    this.toast(`${a.icon} Thành tựu mới: <b>${a.name}</b><br><small>${a.desc}</small>`);
    Sound.play('upgrade');
  },
  toast(html) {
    const el = document.createElement('div'); el.className = 'toast'; el.innerHTML = html;
    $('toasts').appendChild(el); setTimeout(() => el.classList.add('out'), 3500); setTimeout(() => el.remove(), 4000);
  },
  checkAch(ev, a) {
    const A = this.ach, g = this.game; if (!A || (g && g.sandbox)) return;
    if (ev === 'kill') {
      A.kills++; if (a.d.boss) A.bosses++;
      if (a.type === 'goldgob' && (A.goblins = (A.goblins || 0) + 1) >= 10) this.unlock('goblin10');
      if (a.lastHitBy === 'poison' && (A.poisonKills = (A.poisonKills || 0) + 1) >= 300) this.unlock('poison300');
      if (A.kills >= 1000) this.unlock('kills_1000');
      if (A.kills >= 10000) this.unlock('kills_10000');
      if (A.bosses >= 10) this.unlock('boss_10');
      if (g.gold >= 3000) this.unlock('rich');
      if (A.kills % 50 === 0) this.saveAch();
    } else if (ev === 'branch') {
      A.branches[a.type + a.branch] = 1; this.unlock('branch');
      if (Object.keys(A.branches).length >= Object.values(BRANCHES).reduce((a, b) => a + b.length, 0)) this.unlock('all_branch');
      this.saveAch();
    } else if (ev === 'meteor' && a >= 5) this.unlock('meteor5');
    else if (ev === 'perfect' && a >= 10) this.unlock('perfect10');
    else if (ev === 'won') {
      A.wins[MAPS[g.mapIndex].id] = 1; A.won++;
      if (MAPS[g.mapIndex].id === 'palace') this.unlock('palace_win'); A.waves++; A.gold += g.stats.goldEarned; this.addLeaks(g); this.unlock('first_win');
      if (g.lives >= g.maxLives) this.unlock('flawless');
      if (g.diffKey === 'hard') this.unlock('hard_win');
      if (MAPS.filter(m => !m.random && !m.custom).every(m => A.wins[m.id])) this.unlock('all_maps');
      if (MAPS.some(m => m.unlockWins && Object.keys(A.wins).length === m.unlockWins)) this.toast('🔓 Đã mở khoá bản đồ <b>Cung Điện Mắt</b>!');
      this.saveAch();
    } else if (ev === 'cleared') {
      A.waves++;
      if (g.endless && g.wave >= 40) this.unlock('endless40');
      if (g.gold >= 3000) this.unlock('rich');
      this.saveAch();
    } else if (ev === 'over') { A.lost++; A.gold += g.stats.goldEarned; this.addLeaks(g); this.saveAch(); }
  },
  showBook() {
    const be = $('book-enemies'); be.innerHTML = '';
    for (const [k, d] of Object.entries(ENEMIES)) {
      const row = document.createElement('div'); row.className = 'entry';
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; row.appendChild(cv);
      const tags = [`❤️ ${d.hp}`, `👟 ${d.speed}`, `🪙 ${d.reward}`];
      if (d.armor) tags.push(`🛡 ${d.armor}`);
      if (d.lives > 1) tags.push(`trừ ${d.lives} máu`);
      row.insertAdjacentHTML('beforeend', `<div><b>${d.name}</b><div class="tags">${tags.join(' · ')}</div><small>${ENEMY_NOTES[k] || ''}</small></div>`);
      be.appendChild(row);
      const ctx = cv.getContext('2d'); ctx.scale(2, 2);
      const fake = { d, type: k, x: 24, y: d.flying ? 36 : 26, hp: 1, maxHp: 1, flying: !!d.flying, wob: 1, ang: 0, slow: 0, hitFlash: 0, shield: d.shield || 0, revealed: true };
      if (d.boss) { ctx.translate(24, 26); ctx.scale(0.7, 0.7); ctx.translate(-24, -26); }
      this.renderer.drawEnemy(ctx, fake);
    }
    const bt = $('book-towers'); bt.innerHTML = '';
    for (const k of TOWER_ORDER) {
      const d = TOWERS[k], br = BRANCHES[k];
      const row = document.createElement('div'); row.className = 'entry';
      const cv = document.createElement('canvas'); cv.width = 96; cv.height = 96; row.appendChild(cv);
      row.insertAdjacentHTML('beforeend', `<div><b>${d.name}</b> <span class="tags">🪙${d.levels[0].cost}${d.air ? '' : ' · không bắn quái bay'}</span><br><small>${d.desc}</small>
        <div class="tags">Cấp 4: <b>${br[0].name}</b> – ${br[0].desc} / <b>${br[1].name}</b> – ${br[1].desc}</div></div>`);
      bt.appendChild(row);
      const ctx = cv.getContext('2d'); ctx.scale(2, 2);
      this.renderer.drawTower(ctx, { type: k, def: d, level: 2, x: 24, y: 28, angle: -Math.PI / 4, recoil: 0, pulse: 0 }, false);
    }
    $('overlay-book').classList.remove('hidden');
  },
  // Lịch sử điểm Thử thách hôm nay trong 7 ngày gần nhất
  dailyHistoryHtml() {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
      days.push({ label: `${d.getDate()}/${d.getMonth() + 1}`, v: store.num('daily.' + key, 0, 0), today: i === 0 });
    }
    const mx = Math.max(1, ...days.map(d => d.v));
    return `<div class="daily-hist"><h4>📅 Thử thách hôm nay – 7 ngày</h4><div class="cols">${days.map(d =>
      `<div class="col${d.today ? ' today' : ''}" title="${d.v ? d.v.toLocaleString('vi-VN') + ' điểm' : 'Chưa chơi'}"><i style="height:${d.v ? Math.max(6, d.v / mx * 60) : 2}px"></i><small>${d.label}</small></div>`).join('')}</div></div>`;
  },
  top10Html() {
    const top = store.arr('top10').filter(t => t && Number.isFinite(t.sc));
    if (!top.length) return '';
    return `<div class="top10"><h4>🏆 10 ván điểm cao nhất</h4><table>${top.map((t, i) =>
      `<tr><td>${i + 1}</td><td><b>${t.sc.toLocaleString('vi-VN')}</b></td><td>${t.map}</td><td>${DIFFICULTY[t.diff] ? DIFFICULTY[t.diff].name : ''}</td>
       <td>${t.won ? '🏆' : '💀'} đợt ${t.wave}</td><td>${(t.mods || []).map(k => MODIFIERS[k] ? MODIFIERS[k].icon : '').join('')}</td><td class="d">${t.date}</td></tr>`).join('')}</table></div>`;
  },
  // Xuất toàn bộ dữ liệu game (localStorage 'eyepalace.*') ra file JSON
  exportData() {
    this.saveAch();
    const data = { game: 'eyepalace', version: 1, exported: new Date().toISOString(), items: {} };
    try { for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i); if (k.startsWith('eyepalace.')) data.items[k] = localStorage.getItem(k); } } catch (e) { /* bỏ qua */ }
    const blob = new Blob([JSON.stringify(data, null, 1)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    a.download = `eyepalace-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    this.toast('💾 Đã xuất ' + Object.keys(data.items).length + ' mục dữ liệu.');
  },
  // Nhập dữ liệu từ file; chỉ nhận khoá 'eyepalace.*' và giá trị là JSON hợp lệ
  importData(text) {
    let data; try { data = JSON.parse(text); } catch (e) { this.toast('⚠ File không hợp lệ.'); return false; }
    if (!data || data.game !== 'eyepalace' || typeof data.items !== 'object') { this.toast('⚠ Không phải file dữ liệu Eye Palace.'); return false; }
    let n = 0;
    for (const [k, v] of Object.entries(data.items)) {
      if (!k.startsWith('eyepalace.') || typeof v !== 'string') continue;
      try { JSON.parse(v); localStorage.setItem(k, v); n++; } catch (e) { /* bỏ mục lỗi */ }
    }
    this.loadAch(); this.buildMenu(); this.showAch();
    this.toast('📂 Đã nhập ' + n + ' mục dữ liệu.');
    return true;
  },
  showAch() {
    this.loadAch();
    const A = this.ach, n = Object.keys(A.unlocked).length, f = v => Math.round(v).toLocaleString('vi-VN');
    const hrs = Math.floor(A.time / 3600), mins = Math.floor(A.time % 3600 / 60);
    const stats = [['🎮', 'Ván đã chơi', f(A.games)], ['🏆', 'Thắng', f(A.won)], ['💀', 'Thua', f(A.lost)], ['⏱', 'Thời gian', `${hrs}g ${mins}p`],
      ['🌊', 'Đợt đã qua', f(A.waves)], ['⚔️', 'Quái đã hạ', f(A.kills)], ['👑', 'Trùm đã hạ', f(A.bosses)], ['🪙', 'Vàng kiếm được', f(A.gold)]];
    $('ach-list').innerHTML = `<div class="lifetime">${stats.map(([i, l, v]) => `<div><span>${i}</span><b>${v}</b><small>${l}</small></div>`).join('')}</div>
      ${this.leakHtml()}
      ${this.dailyHistoryHtml()}
      ${this.top10Html()}
      <p class="sub">Đã mở ${n}/${ACHIEVEMENTS.length} thành tựu</p>` +
      ACHIEVEMENTS.map(a => `<div class="ach ${this.ach.unlocked[a.id] ? 'got' : ''}"><span class="ic">${a.icon}</span><div><b>${a.name}</b><br><small>${a.desc}</small></div></div>`).join('');
    $('overlay-ach').classList.remove('hidden');
  }
});
