'use strict';
// ===== Điều khiển giao diện & vòng lặp chính =====

const $ = id => document.getElementById(id);
const store = {
  get(k, d) { try { const v = localStorage.getItem('eyepalace.' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('eyepalace.' + k, JSON.stringify(v)); } catch (e) { /* bỏ qua */ } },
  del(k) { try { localStorage.removeItem('eyepalace.' + k); } catch (e) { /* bỏ qua */ } },
  // Đọc có kiểm tra kiểu: dữ liệu rác trong localStorage không được làm hỏng game
  num(k, d, lo = -Infinity, hi = Infinity) { const v = this.get(k, d); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : d; },
  bool(k, d) { const v = this.get(k, d); return typeof v === 'boolean' ? v : d; },
  obj(k) { const v = this.get(k, null); return v && typeof v === 'object' && !Array.isArray(v) ? v : {}; },
  arr(k) { const v = this.get(k, null); return Array.isArray(v) ? v : []; },
};

const App = {
  game: null, renderer: null,
  ui: { placing: null, selected: null, hover: null, hurt: 0 },
  speed: 1, paused: false,
  menuMap: 0, menuDiff: 'normal', menuMods: new Set(),
  autoWave: false,

  init() {
    this.canvas = $('cv');
    this.renderer = new Renderer(this.canvas);
    Sound.muted = store.bool('muted', false);
    LOW_FX.on = store.bool('lowfx', false);
    this.autoWave = store.bool('autoWave', false);
    Sound.sfxVol = store.num('volSfx', 80, 0, 100) / 100; Sound.musicVol = store.num('volMusic', 70, 0, 100) / 100;
    setRandomSeed(store.num('randomSeed', 1 + Math.floor(Math.random() * 99999), 1, 999999));
    const lastId = store.get('lastMapId', null), li = MAPS.findIndex(m => m.id === lastId);
    this.menuMap = li >= 0 ? li : Math.round(store.num('lastMap', 0, 0, MAPS.length - 1));
    this.menuDiff = DIFFICULTY[store.get('lastDiff')] ? store.get('lastDiff') : 'normal';
    this.menuMods = new Set(store.arr('lastMods').filter(k => MODIFIERS[k]));
    const cp = store.arr('customPts');
    if (cp.length && cp.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger)) && !validateCustomPath(cp)) {
      const ch = store.arr('customHot').filter(p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger)).slice(0, 8);
      const ce = store.arr('customExtra').filter(br => Array.isArray(br) && br.every(p => Array.isArray(p) && p.length === 2 && p.every(Number.isInteger)) && !validateBranch(cp, br)).slice(0, 2);
      setCustomMap(cp, ch, ce, Math.round(store.num('customTheme', 0, 0, CUSTOM_THEMES.length - 1)));
    }
    this.loadAch();
    this.buildTowerButtons();
    this.buildAbilityButtons();
    this.buildMenu();
    this.bindInput();
    this.bindButtons();
    window.addEventListener('resize', () => this.layout());
    this.layout();
    this.last = performance.now(); this.acc = 0;
    requestAnimationFrame(t => this.frame(t));
    this.updateSoundBtn(); this.updateAutoBtn(); this.setLowFx(LOW_FX.on);
    // Liên kết nhanh: ?play=<số bản đồ>&diff=<easy|normal|hard>
    const q = new URLSearchParams(location.search);
    if (q.has('custom')) {
      const cm = decodeCustomMap(q.get('custom')), pts = cm && cm.pts;
      if (pts) { setCustomMap(pts, cm.hot, cm.extra, cm.theme); store.set('customTheme', cm.theme); store.set('customPts', pts); store.set('customHot', cm.hot); store.set('customExtra', cm.extra); this.newGame(CUSTOM_MAP_INDEX, this.menuDiff, []); this.banner('🛠 Bản đồ được chia sẻ'); if (!store.get('tutDone', false)) this.showTutorial(); }
      else this.toast('⚠ Liên kết bản đồ không hợp lệ.');
    }
    if (location.hash === '#book') this.showBook();
    if (location.hash === '#achievements') this.showAch();
    if (location.hash === '#editor') this.openEditor();
    if (q.has('play')) {
      if (q.has('seed')) { const sd = parseInt(q.get('seed'), 10) || 1; setRandomSeed(sd); store.set('randomSeed', sd); }
      const mi = Math.max(0, Math.min(MAPS.length - 1, parseInt(q.get('play'), 10) || 0));
      const df = DIFFICULTY[q.get('diff')] ? q.get('diff') : this.menuDiff;
      this.newGame(mi, df); if (!store.get('tutDone', false)) this.showTutorial();
    }
  },

  // Canvas giữ tỉ lệ 20:12, vừa khít khung
  layout() {
    const st = $('stage'); const r = st.getBoundingClientRect();
    const aw = r.width - 16, ah = r.height - 16;
    let w = aw, h = aw * H / W;
    if (h > ah) { h = ah; w = ah * W / H; }
    this.canvas.style.width = Math.floor(w) + 'px'; this.canvas.style.height = Math.floor(h) + 'px';
    this.renderer.resize();
  },

  // ---------- Menu ----------
  buildMenu() {
    const ml = $('map-list'); ml.innerHTML = '';
    MAPS.forEach((m, i) => {
      const b = document.createElement('button'); b.className = 'map-card';
      const cv = document.createElement('canvas'); cv.width = 300; cv.height = 180;
      b.appendChild(cv);
      const best = store.obj('best.' + m.id);
      const stars = store.obj('stars.' + m.id);
      const bestScore = store.num('score.' + m.id, 0, 0);
      const bestTxt = (bestScore ? `${bestScore.toLocaleString('vi-VN')}đ · ` : '') + Object.keys(DIFFICULTY).filter(d => best[d] != null).map(d =>
        DIFFICULTY[d].name + ': ' + (stars[d] ? '⭐'.repeat(stars[d]) : 'đợt ' + best[d])).join(' · ');
      b.insertAdjacentHTML('beforeend', `<div class="nm">${m.name}</div><div class="ds">${m.desc}</div><div class="best">${bestTxt ? '🏆 ' + bestTxt : '&nbsp;'}</div>`);
      const locked = this.isLocked(m);
      if (locked) { b.classList.add('locked'); b.insertAdjacentHTML('beforeend', `<span class="lock">🔒 Thắng ${m.unlockWins} bản đồ (${this.winCount()}/${m.unlockWins})</span>`); }
      b.onclick = () => { if (locked) { Sound.init(); Sound.play('leak'); return; } this.menuMap = i; this.refreshMenu(); Sound.init(); Sound.play('click'); };
      if (m.custom) {
        const ed = document.createElement('span'); ed.className = 'reroll'; ed.textContent = '✏️ Sửa'; ed.title = 'Vẽ lại bản đồ này';
        ed.onclick = ev => { ev.stopPropagation(); this.openEditor(); };
        b.appendChild(ed);
      }
      if (m.random) {
        const rr = document.createElement('span'); rr.className = 'reroll'; rr.textContent = '🎲 Đổi bản đồ'; rr.title = 'Sinh bản đồ ngẫu nhiên mới';
        rr.onclick = ev => { ev.stopPropagation(); const sd = 1 + Math.floor(Math.random() * 99999); setRandomSeed(sd); store.set('randomSeed', sd); this.menuMap = i; this.buildMenu(); this._menuGame = null; };
        b.appendChild(rr);
      }
      ml.appendChild(b);
      // Xem trước bản đồ
      const g = new Game(i, 'normal');
      const rr = new Renderer(cv); rr.scale = cv.width / W;
      rr.draw(g, {}, 0);
      rr.lumi.onload = () => rr.draw(g, {}, 0);
    });
    const dl = $('diff-list'); dl.innerHTML = '';
    for (const [k, d] of Object.entries(DIFFICULTY)) {
      const b = document.createElement('button'); b.textContent = `${d.name} (❤️${d.lives})`; b.dataset.k = k;
      b.onclick = () => { this.menuDiff = k; this.refreshMenu(); Sound.init(); Sound.play('click'); };
      dl.appendChild(b);
    }
    const mlist = $('mod-list'); mlist.innerHTML = '';
    for (const [k, m] of Object.entries(MODIFIERS)) {
      const b = document.createElement('button'); b.dataset.k = k; b.title = m.desc;
      b.innerHTML = `${m.icon} ${m.name} <small>+${Math.round(m.score * 100)}%</small>`;
      b.onclick = () => { this.menuMods.has(k) ? this.menuMods.delete(k) : this.menuMods.add(k); this.refreshMenu(); Sound.init(); Sound.play('click'); };
      mlist.appendChild(b);
    }
    $('btn-play').onclick = () => { this.newGame(this.menuMap, this.menuDiff); if (!store.get('tutDone', false)) this.showTutorial(); };
    $('btn-continue').onclick = () => this.loadSave();
    $('btn-ach').onclick = () => this.showAch();
    $('btn-daily').onclick = () => this.startDaily();
    $('btn-editor').onclick = () => this.openEditor();
    $('ed-undo').onclick = () => this.editorUndo();
    $('ed-clear').onclick = () => { if (this.editor) { this.editor.pts = []; this.editor.extra = []; this.editorMsg(); } };
    $('ed-gate').onclick = () => this.editorNewGate();
    $('ed-suggest').onclick = () => {
      const ed = this.editor; if (!ed) return;
      const s = suggestCustomPath(1 + Math.floor(Math.random() * 99999)); if (!s) return;
      ed.pts = s.pts; ed.hot = s.hot; ed.extra = []; if (ed.hotMode) $('ed-hot').click();
      Sound.init(); Sound.play('click'); this.editorMsg();
    };
    $('ed-theme').onclick = () => { const ed = this.editor; if (!ed) return; ed.theme = (ed.theme + 1) % CUSTOM_THEMES.length; this.edLabel('ed-theme', CUSTOM_THEMES[ed.theme].name); Sound.init(); Sound.play('click'); };
    $('ed-play').onclick = () => this.editorPlay();
    $('ed-hot').onclick = () => { const ed = this.editor; if (!ed) return; ed.hotMode = !ed.hotMode; this.edLabel('ed-hot', '🔥 Ô nóng: ' + (ed.hotMode ? 'BẬT' : 'tắt')); $('ed-hot').classList.toggle('primary', ed.hotMode); this.editorMsg(); };
    $('ed-share').onclick = () => {
      const v = this.editorCheck(); if (v) return this.editorMsg(v);
      this.copyLink(this.customLink(this.editor.pts, this.editor.hot, this.editor.extra, this.editor.theme));
    };
    $('ed-exit').onclick = () => { this.closeEditor(); this.showMenu(); };
    $('btn-book').onclick = () => this.showBook();
    $('btn-book-close').onclick = () => $('overlay-book').classList.add('hidden');
    $('btn-ach-close').onclick = () => $('overlay-ach').classList.add('hidden');
    $('btn-export').onclick = () => this.exportData();
    $('btn-import').onclick = () => $('import-file').click();
    $('import-file').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(t => this.importData(t)); e.target.value = ''; };
    this.refreshMenu();
  },
  // Số bản đồ cố định đã thắng (để mở khoá bản đồ đặc biệt)
  winCount() { return this.ach ? Object.keys(this.ach.wins).filter(id => MAPS.some(m => m.id === id && !m.random && !m.custom && !m.unlockWins)).length : 0; },
  isLocked(m) { return !!m.unlockWins && this.winCount() < m.unlockWins; },
  refreshMenu() {
    if (MAPS[this.menuMap] && this.isLocked(MAPS[this.menuMap])) this.menuMap = 0;
    [...$('map-list').children].forEach((c, i) => c.classList.toggle('active', i === this.menuMap));
    [...$('diff-list').children].forEach(c => c.classList.toggle('active', c.dataset.k === this.menuDiff));
    [...$('mod-list').children].forEach(c => c.classList.toggle('active', this.menuMods.has(c.dataset.k)));
    const mul = 1 + [...this.menuMods].reduce((a, k) => a + MODIFIERS[k].score, 0);
    $('mod-mul').textContent = this.menuMods.has('sandbox') ? '(không tính điểm)' : this.menuMods.size ? `(điểm x${mul.toFixed(2)})` : '';
    const D = this.dailyInfo(), db = store.num('daily.' + D.key, 0, 0);
    $('btn-daily').innerHTML = `Thử thách hôm nay <small>${D.mods.map(k => MODIFIERS[k].name).join(' · ')}${db ? ' · kỷ lục ' + db.toLocaleString('vi-VN') : ''}</small>`;
    $('btn-daily').title = 'Bản đồ ngẫu nhiên của ngày ' + D.label + ' với: ' + D.mods.map(k => MODIFIERS[k].name).join(', ');
    let sv = store.get('save', null);
    if (sv && !Game.validSave(sv)) { store.del('save'); sv = null; }
    $('btn-continue').classList.toggle('hidden', !sv);
    if (sv) $('btn-continue').textContent = `⟲ Chơi tiếp: ${MAPS[Game.mapIndexOf(sv)].name} – trước đợt ${sv.wave + 1}`;
  },
  showTutorial() {
    this.paused = true; this.tutStep = 0;
    $('overlay-tut').classList.remove('hidden'); this.renderTut();
  },
  renderTut() {
    const steps = [
      ['👁 Chào mừng tới Eye Palace!', 'Lumi đang trú trong sân thành. Quái vật sẽ tràn lên đại lộ ba làn; mỗi con lọt vào làm hỏng tường bảo vệ. Thành vỡ là thua — hãy bảo vệ Lumi!'],
      ['🏗 Xây tháp', 'Chọn tháp ở bảng bên phải (hoặc phím 1–8) rồi nhấn vào ô cỏ trống. Mỗi tháp có điểm mạnh riêng – rê chuột lên nút để xem. Ô nứt cam (🔥 ô nóng) cho tháp +25% sát thương!'],
      ['⬆ Nâng cấp', 'Nhấn vào tháp đã xây để nâng cấp, bán, hoặc đổi cách nhắm. Ở cấp 3 bạn chọn 1 trong 2 nhánh chuyên môn cực mạnh.'],
      ['⚠ Kẻ thù đặc biệt', 'Dơi bay thẳng theo nét đứt tím (Pháo không bắn được). Bóng Ma tàng hình – cần Mắt Thần. Phù Thủy & trùm làm tê liệt tháp. Xem 💡 gợi ý ở bảng "Đợt kế tiếp".'],
      ['▶ Bắt đầu!', 'Nhấn "Đợt 1" (hoặc Space) khi đã sẵn sàng. Dùng kỹ năng ☄️ Q / ❄️ W khi nguy cấp, nhặt 💰 rương vàng, bấm ? để xem phím tắt. Chúc may mắn!'],
    ];
    const [t, d] = steps[this.tutStep];
    $('tut-title').textContent = t; $('tut-text').textContent = d;
    $('tut-dots').textContent = steps.map((_, i) => i === this.tutStep ? '●' : '○').join(' ');
    $('btn-tut-next').textContent = this.tutStep === steps.length - 1 ? 'Chơi thôi!' : 'Tiếp →';
    $('btn-tut-next').onclick = () => {
      if (this.tutStep < steps.length - 1) { this.tutStep++; this.renderTut(); }
      else { store.set('tutDone', true); $('overlay-tut').classList.add('hidden'); this.paused = false; if (this.game) this.updateHud(); }
    };
    $('btn-tut-skip').onclick = () => { store.set('tutDone', true); $('overlay-tut').classList.add('hidden'); this.paused = false; if (this.game) this.updateHud(); };
  },
  // ---------- Trình vẽ bản đồ ----------
  openEditor() {
    this.game = null; this.paused = true;
    $('overlay-menu').classList.add('hidden');
    this.editor = { pts: (MAPS[CUSTOM_MAP_INDEX].customPts || []).map(p => p.slice()), hot: (MAPS[CUSTOM_MAP_INDEX].customHot || []).map(p => p.slice()),
      extra: (MAPS[CUSTOM_MAP_INDEX].customExtra || []).map(br => br.map(p => p.slice())), theme: MAPS[CUSTOM_MAP_INDEX].customTheme || 0, hotMode: false };
    document.querySelectorAll('#editor-bar .row button').forEach(b => { if (!b.querySelector('.lbl')) this.edLabel(b.id, b.textContent); });
    this.edLabel('ed-theme', CUSTOM_THEMES[this.editor.theme].name);
    this.edLabel('ed-hot', '🔥 Ô nóng: tắt'); $('ed-hot').classList.remove('primary');
    $('editor-bar').classList.remove('hidden'); document.body.classList.add('editing'); this.layout(); this.editorMsg();
  },
  // Nút trình vẽ = biểu tượng + chữ; màn nhỏ chỉ hiện biểu tượng (chữ đầy đủ nằm trong title)
  edLabel(id, text) {
    const b = $(id), i = text.indexOf(' '), ic = i > 0 ? text.slice(0, i) : text, lbl = i > 0 ? text.slice(i + 1) : '';
    b.innerHTML = `<span class="ic">${ic}</span><span class="lbl"> ${lbl}</span>`;
    const key = (b.dataset.key = b.dataset.key || ((b.title.match(/\(([A-Z])\)$/) || [])[1] || ''));
    b.title = text + (key ? ` (${key})` : '');
  },
  closeEditor() { this.editor = null; $('editor-bar').classList.add('hidden'); document.body.classList.remove('editing'); this.layout(); },
  editorMsg(err) {
    const ed = this.editor, el = $('editor-msg'); if (!ed) return;
    const n = ed.pts.length > 1 ? pathTiles(ed.pts).length : 0;
    el.classList.toggle('err', !!err);
    const br = ed.extra[ed.extra.length - 1];
    el.innerHTML = (err || (br && !ed.hotMode ? (br.length === 0 ? `Cổng phụ ${ed.extra.length + 1}: bấm một ô ở <b>cột trái cùng</b>.` : this.branchDone(br) ? `✅ Cổng ${ed.extra.length + 1} đã nhập vào đường chính. Có thể thêm cổng khác (tối đa 3) hoặc chơi.` : `Kéo nhánh thẳng tới khi <b>chạm đường chính</b> (tối thiểu 6 ô) – quái sẽ đi tiếp theo đường chính.`) : ed.hotMode ? `Chế độ ô nóng: bấm ô cỏ để thêm/bỏ ô nóng (+25% sát thương). Đã đặt <b>${ed.hot.length}</b>/8.` : ed.pts.length === 0 ? 'Bấm một ô ở <b>cột trái cùng</b> (vùng tím) để đặt cổng quái.'
      : `Bấm ô cùng hàng/cột để kéo đường. Điểm cuối là cung điện. Độ dài: <b>${n}</b> ô (tối thiểu 20). Chuột phải = hoàn tác.`)) + this.editorEstimate();
    this.editorSide();
  },
  // Thanh bên khi đang vẽ: thông số bản đồ & quy tắc ngắn
  editorSide() {
    const ed = this.editor, el = $('ed-side'); if (!ed || !el) return;
    const okMain = ed.pts.length > 1 && !validateCustomPath(ed.pts);
    const done = ed.extra.filter(b => this.branchDone(b));
    const m = okMain ? makeCustomMap(ed.pts, ed.hot, done, ed.theme) : null;
    const tiles = m ? new Set([ed.pts, ...done].flatMap(p => pathTiles(p)).map(c => c + '')).size : (ed.pts.length > 1 ? pathTiles(ed.pts).length : 0);
    const row = (k, v) => `<div class="ed-row"><span>${k}</span><b>${v}</b></div>`;
    el.innerHTML = `<h4>🛠 Bản đồ đang vẽ</h4>`
      + row('Đường chính', okMain ? '✅ hợp lệ' : `${ed.pts.length > 1 ? pathTiles(ed.pts).length : 0}/20 ô`)
      + row('Tổng số ô đường', tiles)
      + row('Cổng', `${1 + done.length} / 3`)
      + row('Ô nóng', `${ed.hot.length} / 8`)
      + row('Chủ đề', CUSTOM_THEMES[ed.theme].name)
      + (m ? row('Máu quái', '×' + m.hpMul.toFixed(2).replace('.', ',')) + (m.goldBonus ? row('Vàng thêm', '+' + m.goldBonus) : '') : '')
      + `<ul class="ed-rules"><li>Cổng ở cột trái, đoạn thẳng</li><li>Đường chính ≥ 20 ô, nhánh phụ ≥ 6 ô</li><li>Nhánh phụ nhập vào đường chính</li><li>Ô nóng: +25% sát thương tháp</li></ul>`;
  },
  // Ước lượng độ khó bản đồ đang vẽ (cùng công thức với makeCustomMap)
  editorEstimate() {
    const ed = this.editor; if (validateCustomPath(ed.pts)) return '';
    const m = makeCustomMap(ed.pts, ed.hot, ed.extra.filter(b => this.branchDone(b)));
    const lv = m.hpMul < 0.9 ? ['dễ', '#4ade80'] : m.hpMul < 1.2 ? ['vừa', '#facc15'] : ['khó', '#f87171'];
    return ` <span class="ed-est">· ${m.paths.length} cổng · máu quái <b style="color:${lv[1]}">×${m.hpMul.toFixed(2).replace('.', ',')}</b> (${lv[0]})${m.goldBonus ? ` · +${m.goldBonus} vàng` : ''}</span>`;
  },
  branchDone(br) { return br.length > 1 && !validateBranch(this.editor.pts, br); },
  editorCheck() {
    const ed = this.editor, v = validateCustomPath(ed.pts); if (v) return v;
    for (const br of ed.extra) { const e = validateBranch(ed.pts, br); if (e) return 'Cổng phụ chưa xong: ' + e; }
    return '';
  },
  editorUndo() {
    const ed = this.editor; if (!ed) return;
    const br = ed.extra[ed.extra.length - 1];
    if (br) { br.pop(); if (!br.length) ed.extra.pop(); } else ed.pts.pop();
    this.editorMsg();
  },
  editorNewGate() {
    const ed = this.editor; if (!ed) return;
    if (ed.hotMode) $('ed-hot').click();
    const v = validateCustomPath(ed.pts); if (v) return this.editorMsg('Vẽ xong đường chính trước: ' + v);
    const br = ed.extra[ed.extra.length - 1];
    if (br && !this.branchDone(br)) return this.editorMsg('Hoàn thành cổng hiện tại trước đã.');
    if (ed.extra.length >= 2) return this.editorMsg('Tối đa 3 cổng.');
    ed.extra.push([]); this.editorMsg();
  },
  editorClick(c) {
    const ed = this.editor; if (!ed || c.cx < 0 || c.cy < 0 || c.cx >= COLS || c.cy >= ROWS) return;
    if (ed.hotMode) {
      const onPath = [ed.pts, ...ed.extra].some(p => p.length > 1 && pathTiles(p).some(([x, y]) => x === c.cx && y === c.cy));
      if (onPath) return this.editorMsg('Ô nóng phải nằm ngoài đường đi.');
      const i = ed.hot.findIndex(([x, y]) => x === c.cx && y === c.cy);
      if (i >= 0) ed.hot.splice(i, 1);
      else if (ed.hot.length >= 8) return this.editorMsg('Tối đa 8 ô nóng.');
      else ed.hot.push([c.cx, c.cy]);
      Sound.init(); Sound.play('click'); return this.editorMsg();
    }
    const br = ed.extra[ed.extra.length - 1];
    if (br) {
      if (!br.length) { if (c.cx !== 0) return this.editorMsg('Cổng phụ phải ở cột trái cùng.'); if (pathTiles(ed.pts).some(([x, y]) => x === 0 && y === c.cy)) return this.editorMsg('Ô này đã thuộc đường chính.'); br.push([c.cx, c.cy]); return this.editorMsg(); }
      if (this.branchDone(br)) return this.editorMsg('Cổng này đã xong – bấm ➕ Cổng mới hoặc ▶ Chơi.');
      const [bx, by] = br[br.length - 1];
      if ((c.cx === bx) === (c.cy === by)) return this.editorMsg('Chỉ được kéo thẳng theo hàng hoặc cột từ điểm cuối.');
      const trial = br.concat([[c.cx, c.cy]]), v = validateBranch(ed.pts, trial);
      if (v && !v.startsWith('Điểm cuối')) return this.editorMsg(v);   // chưa chạm đường chính thì vẽ tiếp
      br.push([c.cx, c.cy]); Sound.init(); Sound.play('click'); return this.editorMsg();
    }
    if (!ed.pts.length) { if (c.cx !== 0) return this.editorMsg('Cổng quái phải ở cột trái cùng.'); ed.pts.push([c.cx, c.cy]); return this.editorMsg(); }
    const [lx, ly] = ed.pts[ed.pts.length - 1];
    if ((c.cx === lx) === (c.cy === ly)) return this.editorMsg('Chỉ được kéo thẳng theo hàng hoặc cột từ điểm cuối.');
    const trial = ed.pts.concat([[c.cx, c.cy]]), v = validateCustomPath(trial);
    if (v && !v.startsWith('Đường quá ngắn')) return this.editorMsg(v);
    ed.pts = trial; Sound.init(); Sound.play('click'); this.editorMsg();
  },
  customLink(pts, hot = [], extra = [], theme = 0) { return location.href.split(/[?#]/)[0] + '?custom=' + encodeCustomPts(pts, hot, extra, theme); },
  copyLink(url) {
    const done = () => this.toast('🔗 Đã sao chép liên kết bản đồ:<br><small>' + url + '</small>');
    // Không dùng prompt() (chặn trang): nếu không ghi được clipboard thì hiện ô chữ để người chơi tự sao chép
    const manual = () => {
      this.toast('Sao chép liên kết bên dưới:<br><input class="copy-box" readonly value="' + url.replace(/"/g, '&quot;') + '">');
      const box = document.querySelector('.toast:last-child .copy-box'); if (box) { box.focus(); box.select(); }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, manual);
    else manual();
  },
  editorPlay() {
    const ed = this.editor; const v = this.editorCheck();
    if (v) return this.editorMsg(v);
    const onPath = new Set([ed.pts, ...ed.extra].flatMap(p => pathTiles(p)).map(c => c + '')); ed.hot = ed.hot.filter(c => !onPath.has(c + ''));
    setCustomMap(ed.pts, ed.hot, ed.extra, ed.theme); store.set('customTheme', ed.theme); store.set('customPts', ed.pts); store.set('customHot', ed.hot); store.set('customExtra', ed.extra);
    this.closeEditor(); this.newGame(CUSTOM_MAP_INDEX, this.menuDiff, [...this.menuMods]);
  },

  // ---------- Thử thách hôm nay: bản đồ ngẫu nhiên + 2 thử thách cố định theo ngày ----------
  dailyInfo() {
    const d = new Date(), key = d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
    const rnd = mulberry32(key), mods = Object.keys(MODIFIERS).filter(k => !MODIFIERS[k].sandbox).sort(() => rnd() - 0.5).slice(0, 2);
    return { key, seed: key % 99991 + 1, mods, label: `${d.getDate()}/${d.getMonth() + 1}` };
  },
  startDaily() {
    const D = this.dailyInfo();
    setRandomSeed(D.seed);
    const g = this.newGame(RANDOM_MAP_INDEX, 'normal', D.mods);
    g.daily = D.key;
    this.banner(`📅 Thử thách ngày ${D.label}: ${D.mods.map(k => MODIFIERS[k].icon + ' ' + MODIFIERS[k].name).join(' · ')}`);
    if (!store.get('tutDone', false)) this.showTutorial();
  },
  showMenu() {
    this.paused = true;
    if (this.editor) this.closeEditor();
    Ambience.stop();
    if (this.game && this.game.daily) setRandomSeed(store.num('randomSeed', 1, 1, 999999));   // trả lại bản đồ ngẫu nhiên của người chơi
    $('overlay-pause').classList.add('hidden'); $('overlay-end').classList.add('hidden');
    this.buildMenu();
    $('overlay-menu').classList.remove('hidden');
  },

  newGame(mapIndex, diff, mods = [...this.menuMods]) {
    Sound.init();
    if (store.bool('music', true)) Music.start();
    if (store.bool('music', true)) setTimeout(() => this.game && Ambience.start(MAPS[this.game.mapIndex]), 0); else Ambience.stop();
    store.set('lastMapId', MAPS[mapIndex].id); store.set('lastDiff', diff); store.set('lastMods', mods);
    store.del('save');
    if (this.ach) { this.ach.games++; this.saveAch(); }
    this.game = new Game(mapIndex, diff, { mods, sfx: n => Sound.play(n), onEvent: (ev, a) => this.onGameEvent(ev, a) });
    this.resetUI();
    return this.game;
  },
  // Gợi ý cho người mới: ô phủ đường nhiều nhất cho Tháp Cung (chỉ ở vài ván đầu, trước khi xây tháp nào)
  computeHint() {
    const g = this.game; this.hint = null;
    if (!g || (this.ach && this.ach.games > 3)) return;
    const r2 = (TOWERS.archer.levels[0].range * TILE) ** 2; let best = null, bv = 0;
    for (let cy = 0; cy < ROWS; cy++) for (let cx = 0; cx < COLS; cx++) {
      if (!g.canPlace(cx, cy)) continue;
      const x = (cx + .5) * TILE, y = (cy + .5) * TILE; let v = 0;
      for (const p of g.paths) for (let d = 0; d < p.length; d += 12) { const q = p.posAt(d); if ((q.x - x) ** 2 + (q.y - y) ** 2 <= r2) v++; }
      if (v > bv) { bv = v; best = { cx, cy }; }
    }
    this.hint = best;
  },
  resetUI() {
    setTimeout(() => this.computeHint(), 0);
    this.ui.placing = null; this.ui.selected = null; this.ui.hurt = 0; this.ui.ability = null;
    this.paused = false; if (this.game) this.updateHud();
    ['overlay-menu', 'overlay-pause', 'overlay-end', 'overlay-tut'].forEach(id => $(id).classList.add('hidden'));
    this.refreshSide(true);
  },

  // ---------- Lưu / tải ----------
  saveGame() {
    const g = this.game; if (!g || g.state !== 'build') return;
    store.set('save', g.serialize());
  },
  loadSave() {
    const s = store.get('save', null); if (!s) return;
    if (!Game.validSave(s)) { store.del('save'); this.toast('⚠ Ván lưu bị hỏng nên đã được xoá.'); this.refreshMenu(); return; }
    if (s.seed) { setRandomSeed(s.seed); store.set('randomSeed', s.seed); }
    const g = this.newGame(Game.mapIndexOf(s), s.diff, (s.mods || []).filter(k => MODIFIERS[k]));
    store.set('save', s);
    const refund = g.restore(s);
    if (refund) this.toast(`Một số tháp không còn hợp lệ đã được hoàn 🪙${refund}.`);
    this.refreshSide(true);
  },

  recordBest() {
    const g = this.game; if (g.sandbox) return; const id = MAPS[g.mapIndex].id;
    const best = store.obj('best.' + id);
    const reached = g.state === 'over' ? g.wave - 1 : g.wave;
    if (!best[g.diffKey] || reached > best[g.diffKey]) { best[g.diffKey] = reached; store.set('best.' + id, best); }
  },
  recordScore() {
    const g = this.game, id = MAPS[g.mapIndex].id, sc = g.score;
    if (g.sandbox) return { sc: 0, best: store.num('score.' + id, 0, 0), isNew: false };
    // Bảng xếp hạng cục bộ: 10 ván điểm cao nhất
    const top = store.arr('top10').filter(t => t && Number.isFinite(t.sc));
    const d = new Date();
    top.push({ sc, map: MAPS[g.mapIndex].name, diff: g.diffKey, mods: [...g.mods], wave: g.state === 'over' ? g.wave - 1 : g.wave, won: g.state === 'won', date: `${d.getDate()}/${d.getMonth() + 1}/${d.getFullYear()}` });
    top.sort((a, b) => b.sc - a.sc); store.set('top10', top.slice(0, 10));
    if (g.daily) { const k = 'daily.' + g.daily; if (sc > store.num(k, 0)) store.set(k, sc); }
    const best = store.num('score.' + id, 0, 0);
    if (sc > best) store.set('score.' + id, sc);
    return { sc, best, isNew: sc > best };
  },
  // Sao khi thắng: 3 sao nếu còn >=90% máu, 2 sao >=50%, 1 sao nếu thắng
  recordStars() {
    const g = this.game; const id = MAPS[g.mapIndex].id;
    if (g.sandbox) return 0;
    const k = g.lives / g.maxLives, n = k >= 0.9 ? 3 : k >= 0.5 ? 2 : 1;
    const st = store.obj('stars.' + id);
    if (!st[g.diffKey] || n > st[g.diffKey]) { st[g.diffKey] = n; store.set('stars.' + id, st); }
    return n;
  },

  onGameEvent(ev, a) {
    const g = this.game;
    this.checkAch(ev, a);
    if (ev === 'boss') this.banner(`👑 ${a.d.name} xuất hiện!`);
    if (ev === 'leakTip' && !g.sandbox && !(a === 'ghost' && g.towers.some(t => t.type === 'eye'))) this.toast('⚠ Quái đang lọt nhiều!<br>' + LOSS_TIPS[a]);
    if (ev === 'leak') { this.ui.hurt = 1; $('hud-lives').classList.remove('flash-bad'); void $('hud-lives').offsetWidth; $('hud-lives').classList.add('flash-bad'); }
    if (ev === 'wave') { this.banner(a % 10 === 0 ? `⚠ Đợt ${a} – TRÙM!` : isNightWave(a) ? `🌙 Đợt ${a} – Đêm tối (tầm tháp -20%)` : `Đợt ${a}`); }
    if (ev === 'cleared') {
      this.saveGame(); this.recordBest();
      if (this.autoWave) setTimeout(() => { if (this.game === g && g.state === 'build' && !this.paused) this.callWave(); }, 1500);
    }
    if (ev === 'over') {
      this.recordBest(); store.del('save');
      this.ui.placing = null;
      setTimeout(() => this.showEnd(false), 900);
    }
    if (ev === 'won') {
      this.recordBest(); this.lastStars = this.recordStars(); store.del('save');
      // Bắn thêm vài đợt pháo hoa rồi mới hiện màn chiến thắng
      [400, 900, 1400].forEach(t => setTimeout(() => this.game === g && g.fx.fireworks(6), t));
      setTimeout(() => this.game === g && this.showEnd(true), 1900);
    }
  },
  showEnd(won) {
    const g = this.game;
    $('end-title').textContent = g.sandbox ? (won ? 'Hoàn thành thử nghiệm' : 'Kết thúc thử nghiệm') : won ? 'Chiến thắng! ' + '★'.repeat(this.lastStars || 1) : 'Thành đã thất thủ';
    const S = this.recordScore();
    const modTxt = g.mods.size ? ' · ' + [...g.mods].map(k => MODIFIERS[k].icon).join('') : '';
    $('end-text').innerHTML = `<div class="score">Điểm: <b>${S.sc.toLocaleString('vi-VN')}</b>${S.isNew ? ' 🎉 Kỷ lục mới!' : ` (kỷ lục ${S.best.toLocaleString('vi-VN')})`}${modTxt}</div>` + (won ? `Bạn đã trụ vững qua ${GOAL_WAVE} đợt quái!` : `Bạn trụ được tới đợt <b>${g.wave}</b>.`) +
      `<br>Quái tiêu diệt: <b>${g.stats.kills}</b> · Vàng kiếm được: <b>${g.stats.goldEarned}</b> · Tháp: <b>${g.towers.length}</b>`;
    // Biểu đồ máu cung điện theo đợt
    const hist = (g.livesHistory || []).concat([{ wave: g.wave, lives: g.lives }]);
    if (hist.length > 1) {
      const w = 320, h = 70, maxW = hist[hist.length - 1].wave || 1;
      const pts = hist.map(p => `${(p.wave / maxW * w).toFixed(1)},${(h - p.lives / g.maxLives * h).toFixed(1)}`).join(' ');
      $('end-text').innerHTML += `<div class="lives-chart"><h4>❤️ Máu cung điện theo đợt</h4>
        <svg viewBox="-2 -2 ${w + 4} ${h + 4}" width="${w}" height="${h}"><polyline points="0,${h} ${w},${h}" stroke="#323a63" fill="none"/>
        <polyline points="${pts}" stroke="#f472b6" stroke-width="2" fill="none" stroke-linejoin="round"/></svg>
        <div class="axis"><span>Đợt 0</span><span>Đợt ${maxW}</span></div></div>`;
    }
    // Sát thương theo loại tháp (chỉ tính tháp còn đứng cuối ván)
    const byType = TOWER_ORDER.map(k => ({ k, v: g.towers.filter(t => t.type === k).reduce((a, t) => a + t.dmgDealt, 0) })).filter(o => o.v > 0).sort((a, b) => b.v - a.v);
    if (byType.length) {
      const mx = byType[0].v, tot = byType.reduce((a, o) => a + o.v, 0);
      $('end-text').innerHTML += '<div class="dmg-chart"><h4>⚔️ Sát thương theo loại tháp</h4>' + byType.map(o =>
        `<div class="bar"><span>${TOWERS[o.k].name}</span><i style="width:${(o.v / mx * 100).toFixed(1)}%;background:${TOWERS[o.k].color}"></i><b>${Math.round(o.v / tot * 100)}%</b></div>`).join('') + '</div>';
    }
    // Top 3 tháp gây sát thương nhiều nhất
    const top = [...g.towers].sort((a, b) => b.dmgDealt - a.dmgDealt).slice(0, 3);
    if (top.length) {
      $('end-text').innerHTML += '<div class="top-towers"><h4>Tháp xuất sắc</h4>' + top.map((t, i) =>
        `<div>${['🥇', '🥈', '🥉'][i]} ${t.displayName} (cấp ${t.level + 1}) – ${Math.round(t.dmgDealt).toLocaleString('vi-VN')} sát thương · ${t.kills} hạ gục</div>`).join('') + '</div>';
    }
    if (!won && !g.sandbox) {
      const la = lossAdvice(g.stats.leakBy, g.towers, g.wave);
      if (la.top.length) $('end-text').innerHTML += '<div class="loss-tips"><h4>🔍 Vì sao thất thủ?</h4><p class="desc">Mất máu nhiều nhất vì: '
        + la.top.map(o => `<b>${o.name}</b> (−${o.lives}❤️)`).join(', ') + '</p><ul>' + la.tips.map(t => `<li>${t}</li>`).join('') + '</ul></div>';
    }
    if (MAPS[g.mapIndex].custom) $('end-text').innerHTML += `<p class="desc">Chia sẻ bản đồ: <code>${this.customLink(MAPS[g.mapIndex].customPts, MAPS[g.mapIndex].customHot, MAPS[g.mapIndex].customExtra, MAPS[g.mapIndex].customTheme)}</code></p>`;
    if (MAPS[g.mapIndex].random) $('end-text').innerHTML += `<p class="desc">Chia sẻ bản đồ: <code>index.html?play=${g.mapIndex}&seed=${MAPS[g.mapIndex].randomSeed}</code></p>`;
    $('btn-endless').classList.toggle('hidden', !won);
    $('btn-end-edit').classList.toggle('hidden', !MAPS[this.game.mapIndex].custom);
    $('overlay-end').classList.remove('hidden');
  },
  banner(text) {
    const b = $('banner'); b.textContent = text; b.classList.remove('hidden');
    b.style.animation = 'none'; void b.offsetWidth; b.style.animation = '';
    clearTimeout(this._bt); this._bt = setTimeout(() => b.classList.add('hidden'), 1600);
  },

  // ---------- Bảng bên ----------
  buildTowerButtons() {
    const tl = $('tower-list'); tl.innerHTML = '';
    for (const k of TOWER_ORDER) {
      const d = TOWERS[k];
      const b = document.createElement('button'); b.className = 'tbtn'; b.dataset.k = k;
      b.title = d.desc;
      const cv = document.createElement('canvas'); cv.width = 88; cv.height = 88;
      b.appendChild(cv);
      b.insertAdjacentHTML('beforeend', `<span class="key">${d.key}</span><span class="nm">${d.name}</span><span class="cost">🪙${d.levels[0].cost}</span>`);
      b.onclick = () => this.selectBuild(k);
      b.onmouseenter = () => { this.ui.hoverBtn = k; this.refreshSide(true); };
      b.onmouseleave = () => { this.ui.hoverBtn = null; this.refreshSide(true); };
      tl.appendChild(b);
      const ctx = cv.getContext('2d'); ctx.scale(2, 2);
      this.renderer.drawTower(ctx, { type: k, def: d, level: 0, x: 22, y: 26, angle: -Math.PI / 4, recoil: 0, pulse: 0 }, false);
    }
  },
  buildAbilityButtons() {
    const al = $('ability-list'); al.innerHTML = '';
    for (const [k, a] of Object.entries(ABILITIES)) {
      const b = document.createElement('button'); b.className = 'abtn'; b.dataset.k = k; b.title = a.desc + ' (phím ' + a.key.toUpperCase() + ')';
      b.innerHTML = `<span class="cdv"></span><span class="ic">${a.icon}</span>${a.name}<span class="cdt"></span>`;
      b.onclick = () => this.triggerAbility(k);
      al.appendChild(b);
    }
  },
  triggerAbility(k) {
    const g = this.game; if (!g || this.paused || !g.abilityReady(k)) return;
    Sound.init();
    if (k === 'meteor') { this.ui.ability = this.ui.ability === 'meteor' ? null : 'meteor'; this.ui.placing = null; this.ui.selected = null; this.refreshSide(true); }
    else g.useAbility(k);
  },
  updateAbilities() {
    const g = this.game;
    for (const b of $('ability-list').children) {
      const k = b.dataset.k, cd = Math.max(0, g.cooldowns[k]), max = ABILITIES[k].cd;
      b.firstChild.style.width = (cd / max * 100) + '%';
      b.lastChild.textContent = cd > 0 ? Math.ceil(cd) + 's' : ABILITIES[k].key.toUpperCase();
      b.disabled = cd > 0 || g.isOver || g.mods.has('noAbility');
      if (g.mods.has('noAbility')) b.lastChild.textContent = '🚫';
      b.classList.toggle('active', this.ui.ability === k);
    }
  },
  selectBuild(k) {
    this.ui.ability = null;
    if (!this.game || this.game.isOver) return;
    Sound.init();
    this.ui.placing = this.ui.placing === k ? null : k; this.ui.selected = null;
    Sound.play('click');
    this.refreshSide(true);
  },

  refreshSide(force) {
    const g = this.game; if (!g) return;
    // Chỉ dựng lại HTML khi dữ liệu thay đổi để tránh giật
    const sel = this.ui.selected;
    $('btn-undo').classList.toggle('hidden', !g.canUndo);
    $('btn-skip').classList.toggle('hidden', !(g.sandbox && g.state === 'build'));
    const key = [g.gold, g.state, g.wave, g.history.length, this.ui.hoverBtn, this.ui.placing, sel && sel.level, sel && sel.mode, sel && Math.floor(sel.kills), g.spawning].join('|');
    if (!force && key === this._sideKey) return;
    this._sideKey = key;

    for (const b of $('tower-list').children) {
      const k = b.dataset.k;
      b.classList.toggle('active', this.ui.placing === k);
      b.classList.toggle('poor', g.gold < TOWERS[k].levels[0].cost);
    }

    const info = $('info');
    if (sel) {
      const s = sel.stats, nx = sel.maxed || sel.canBranch ? null : sel.def.levels[sel.level + 1];
      const vn = x => String(x).replace(/(\d)\.(\d)/g, '$1,$2');   // dấu phẩy thập phân kiểu Việt
      const row = (label, v, nv) => `<tr><td>${label}</td><td>${vn(v)}${nv != null && nv !== v ? `<span class="up">→ ${vn(nv)}</span>` : ''}</td></tr>`;
      let rows = '';
      if (s.dmg != null) rows += row('Sát thương', s.dmg, nx && nx.dmg);
      if (s.dps != null) rows += row(s.stacks ? 'Độc/giây mỗi lớp' : 'Sát thương/giây', Math.round(s.dps * 10) / 10, nx && Math.round(nx.dps * 10) / 10);
      if (!sel.def.support) rows += row('DPS ước tính', Math.round(estimateDps(sel.type, s)), nx && Math.round(estimateDps(sel.type, nx)));
      if (s.buff != null) rows += row('Tăng sát thương', '+' + Math.round(s.buff * 100) + '%', nx && '+' + Math.round(nx.buff * 100) + '%');
      if (s.haste != null) rows += row('Tăng tốc bắn', '+' + Math.round(s.haste * 100) + '%', nx && '+' + Math.round(nx.haste * 100) + '%');
      if (s.income) rows += row('Vàng mỗi đợt', '+' + s.income);
      if (sel.hot) rows += row('🔥 Ô nóng', '+' + Math.round(HOT_BUFF * 100) + '% sát thương');
      if (sel.buff > (sel.hot ? HOT_BUFF : 0)) rows += row('Được Đài Chỉ Huy', '+' + Math.round(sel.buff * 100) + '% / +' + Math.round(sel.haste * 100) + '%');
      rows += row('Tầm bắn', s.range.toFixed(1), nx && nx.range.toFixed(1));
      if (s.rate != null) rows += row('Tốc độ (phát/giây)', (1 / s.rate).toFixed(2), nx && (1 / nx.rate).toFixed(2));
      if (s.splash != null) rows += row('Bán kính nổ', s.splash.toFixed(2), nx && nx.splash.toFixed(2));
      if (s.slow != null) rows += row('Làm chậm', Math.round(s.slow * 100) + '%', nx && Math.round(nx.slow * 100) + '%');
      if (s.chains != null) rows += row('Số lần nảy', s.chains, nx && nx.chains);
      if (s.stacks != null) rows += row('Số lớp độc tối đa', s.stacks, nx && nx.stacks);
      rows += row('Hạ gục', sel.kills);
      rows += row('Tổng sát thương', Math.round(sel.dmgDealt));
      const canTarget = sel.type !== 'frost' && !sel.def.support;
      const br = sel.canBranch ? sel.branches : null;
      const upBtn = br
        ? br.map((b, i) => `<button class="branch" id="b-br${i}" ${g.gold < b.cost ? 'disabled' : ''}><b>${b.name}</b> 🪙${b.cost} ${sel.def.support ? '' : ` · DPS ~${Math.round(estimateDps(sel.type, b))}`}<br><small>${b.desc}</small></button>`).join('')
        : `<button id="b-up" ${sel.maxed || g.gold < sel.upgradeCost ? 'disabled' : ''}>${sel.maxed ? 'Tối đa' : `⬆ Nâng cấp 🪙${sel.upgradeCost}`}</button>`;
      const desc = sel.branch != null ? sel.stats.desc : sel.def.desc;
      info.innerHTML = `<h4>${sel.displayName} <small>cấp ${sel.level + 1}</small></h4><p class="desc">${desc}</p><table>${rows}</table>
        ${br ? '<p class="desc">Chọn nhánh chuyên môn (cấp 4):</p>' : ''}
        <div class="btns">
          ${upBtn}
          <button id="b-sell" ${g.canSell ? '' : 'disabled title="Thử thách Không Hối Hận"'}>${this._sellArm === sel ? '⚠ Xác nhận bán' : '💰 Bán'} 🪙${sel.sellValue}</button>
          ${canTarget ? `<button id="b-mode" style="flex-basis:100%">🎯 Mục tiêu: ${TARGET_NAMES[sel.mode]}</button>` : ''}
        </div>`;
      if (br) br.forEach((b, i) => { $('b-br' + i).onclick = () => this.upgradeSel(i); });
      else $('b-up').onclick = () => this.upgradeSel();
      $('b-sell').onclick = () => this.sellSel();
      if (canTarget) $('b-mode').onclick = () => this.cycleMode();
    } else if (this.ui.placing || this.ui.hoverBtn) {
      const d = TOWERS[this.ui.placing || this.ui.hoverBtn], s = d.levels[0];
      info.innerHTML = `<h4>${d.name}</h4><p class="desc">${d.desc}</p><p>Giá: <b style="color:var(--gold)">🪙${s.cost}</b> · Tầm: <b>${s.range}</b></p><p class="desc">Nhấn vào ô cỏ trống để đặt (cảm ứng: chạm 2 lần). Chuột phải / Esc để huỷ. Giữ Shift để xây liên tiếp.</p>`;
    } else {
      info.innerHTML = `<h4>Mẹo</h4><p class="desc tips">Chọn một tháp rồi đặt lên ô cỏ. Nhấn vào tháp đã xây để nâng cấp hoặc bán.<br><br>Quái bay đi thẳng về cung điện (nét đứt tím) – Pháo Đá không bắn được chúng.<br><br>Bóng Ma tàng hình: chỉ bị lộ trong tầm Mắt Thần hoặc khi đi sát tháp. Chuột Chũi chui xuống đất định kỳ.<br><br>Gọi đợt sớm khi quái vẫn còn để nhận thêm vàng.<br><br>💰 Quái đôi khi rơi rương vàng – nhấn nhanh để nhặt trước khi biến mất!</p>`;
    }

    // Đợt sắp tới
    const n = g.wave + 1;
    const nw = $('next-wave');
    if (g.state === 'won' && !g.endless) { nw.innerHTML = ''; }
    else {
      const chips = describeWave(n).map(o => `<span class="wave-chip" title="${ENEMY_NOTES[o.type] || ''}"><img src="${this.enemyIcon(o.type)}" alt="">${ENEMIES[o.type].name} ×${o.count}</span>`).join('');
      nw.innerHTML = `<h4>Đợt kế tiếp: ${n}${n % 10 === 0 ? ' ⚠ Trùm' : ''}${isNightWave(n) ? ' 🌙 Đêm tối' : ''}</h4>${isNightWave(n) ? '<p class="desc">Tầm bắn mọi tháp -20% (trừ Mắt Thần).</p>' : ''}${chips}${waveAdvice(n, g.towers).map(t => `<p class="advice">${t}</p>`).join('')}`;
    }
  },

  // Ảnh nhỏ của quái (vẽ 1 lần, lưu dạng dataURL)
  enemyIcon(type) {
    this._icons = this._icons || {};
    if (this._icons[type]) return this._icons[type];
    const d = ENEMIES[type], cv = document.createElement('canvas'); cv.width = cv.height = 40;
    const ctx = cv.getContext('2d'), sc = Math.min(1, 15 / d.radius) * (d.flying ? 0.8 : 1);
    ctx.translate(20, 20); ctx.scale(sc, sc); ctx.translate(-20, -20);
    this.renderer.drawEnemy(ctx, { d, type, x: 20, y: d.flying ? 30 : 21, hp: 1, maxHp: 1, flying: !!d.flying, wob: 1, ang: 0, slow: 0, hitFlash: 0, shield: 0, revealed: true });
    return (this._icons[type] = cv.toDataURL());
  },
  // Shift+U: nâng cấp liên tục tới khi cần chọn nhánh, tối đa hoặc hết vàng
  upgradeMax() {
    const t = this.ui.selected, g = this.game; if (!t || !g) return;
    let n = 0;
    while (!t.maxed && !t.canBranch && g.gold >= t.upgradeCost && n < 5) { if (!g.upgrade(t)) break; n++; }
    if (n) this.refreshSide(true);
    if (t.canBranch) this.toast('Tháp đã cấp 3 – chọn nhánh chuyên môn ở bảng bên.');
  },
  upgradeSel(branchIdx) {
    const t = this.ui.selected; if (!t) return;
    if (t.canBranch && branchIdx == null) return; // phải chọn nhánh bằng nút
    if (this.game.upgrade(t, branchIdx || 0)) this.refreshSide(true);
  },
  // Bán tháp; tháp đắt (>= 300 vàng đầu tư) cần bấm 2 lần trong 2 giây – trừ khi đang chuẩn bị (có hoàn tác)
  sellSel() {
    const t = this.ui.selected, g = this.game; if (!t || !g.canSell) return;
    const needConfirm = t.invested >= 300 && g.state !== 'build';
    if (needConfirm && !(this._sellArm === t && performance.now() - this._sellArmT < 2000)) {
      this._sellArm = t; this._sellArmT = performance.now();
      this.toast(`Bấm <b>Bán</b> lần nữa để bán ${t.displayName} lấy 🪙${t.sellValue}`);
      this.refreshSide(true); return;
    }
    this._sellArm = null; g.sell(t); this.ui.selected = null; this.refreshSide(true);
  },
  cycleMode() {
    const t = this.ui.selected; if (!t || t.type === 'frost' || t.def.support) return;
    t.mode = TARGET_MODES[(TARGET_MODES.indexOf(t.mode) + 1) % TARGET_MODES.length];
    Sound.play('click'); this.refreshSide(true);
  },

  // ---------- Nhập liệu ----------
  toCell(ev) {
    const r = this.canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * W, y = (ev.clientY - r.top) / r.height * H;
    return { x, y, cx: Math.floor(x / TILE), cy: Math.floor(y / TILE) };
  },
  bindInput() {
    const cv = this.canvas;
    cv.addEventListener('pointermove', e => {
      this.ui.hover = this.toCell(e); this.ui.kb = false;
      const g = this.game, h = this.ui.hover;
      cv.style.cursor = g && g.chests.some(c => (c.x - h.x) ** 2 + (c.y - h.y) ** 2 <= 26 * 26) ? 'pointer' : 'crosshair';
    });
    cv.addEventListener('pointerleave', e => { if (e.pointerType !== 'touch') this.ui.hover = null; });
    cv.addEventListener('contextmenu', e => { e.preventDefault(); if (this.editor) { this.editorUndo(); return; } this.ui.placing = null; this.ui.selected = null; this.ui.ability = null; this.refreshSide(true); });
    cv.addEventListener('pointerdown', e => {
      if (this.editor) { if (e.button === 0) this.editorClick(this.toCell(e)); return; }
      if (e.button !== 0 || !this.game || this.paused) return;
      Sound.init(); this.ui.kb = false;
      const c = this.toCell(e); this.ui.hover = c;
      this.actAt(c, e.pointerType, e.shiftKey);
    });
  },

  // Hành động tại một ô (dùng chung cho chuột, cảm ứng và bàn phím)
  actAt(c, pointerType, shift) {
    {
      const g = this.game;
      if (g.collectAt(c.x, c.y)) { this.refreshSide(true); return; }
      if (this.ui.ability === 'meteor') {
        if (g.useAbility('meteor', c.x, c.y)) this.ui.ability = null;
        return;
      }
      if (this.ui.placing) {
        // Trên màn hình cảm ứng: chạm lần 1 để xem trước, chạm lần 2 cùng ô để xây
        if (pointerType === 'touch') {
          const pv = this.ui.touchPreview;
          if (!pv || pv.cx !== c.cx || pv.cy !== c.cy) { this.ui.touchPreview = { cx: c.cx, cy: c.cy }; return; }
          this.ui.touchPreview = null;
        }
        const t = g.build(this.ui.placing, c.cx, c.cy);
        if (t && !shift && g.gold < TOWERS[this.ui.placing].levels[0].cost) this.ui.placing = null;
        this.refreshSide(true);
        return;
      }
      const t = g.towerAt[c.cy] && g.towerAt[c.cy][c.cx];
      this.ui.selected = t || null;
      if (t) Sound.play('click');
      this.refreshSide(true);
    }
  },

  bindButtons() {
    $('btn-wave').onclick = () => { Sound.init(); this.callWave(); };
    $('btn-speed').onclick = () => this.cycleSpeed();
    $('btn-auto').onclick = () => this.toggleAuto();
    $('btn-undo').onclick = () => this.doUndo();
    $('btn-skip').onclick = () => { const g = this.game; if (g && g.sandbox && g.state === 'build') { g.wave += 5; this.banner('⏭ Tới đợt ' + (g.wave + 1)); this.refreshSide(true); } };
    $('btn-pause').onclick = () => this.togglePause();
    $('btn-sound').onclick = () => { Sound.muted = !Sound.muted; store.set('muted', Sound.muted); this.updateSoundBtn(); };
    $('btn-music').onclick = () => this.toggleMusic();
    $('btn-full').onclick = () => this.toggleFullscreen();
    if (!document.documentElement.requestFullscreen && !document.documentElement.webkitRequestFullscreen) $('btn-full').classList.add('hidden');
    $('btn-menu').onclick = () => this.showMenu();
    $('btn-help').onclick = () => { if (this.game && !this.game.isOver) this.showTutorial(); };
    $('btn-resume').onclick = () => this.togglePause(false);
    $('btn-lowfx').onclick = () => this.setLowFx(!LOW_FX.on);
    for (const [id, kind, key] of [['vol-sfx', 'sfx', 'volSfx'], ['vol-music', 'music', 'volMusic']]) {
      const el = $(id); el.value = Math.round(Sound[kind + 'Vol'] * 100);
      el.oninput = () => { Sound.init(); Sound.setVolume(kind, el.value / 100); store.set(key, +el.value); if (kind === 'sfx') Sound.play('click'); };
    }
    $('btn-keys').onclick = () => $('overlay-keys').classList.remove('hidden');
    $('btn-keys-close').onclick = () => $('overlay-keys').classList.add('hidden');
    $('btn-restart').onclick = () => this.newGame(this.game.mapIndex, this.game.diffKey, [...this.game.mods]);
    $('btn-quit').onclick = () => this.showMenu();
    $('btn-again').onclick = () => this.newGame(this.game.mapIndex, this.game.diffKey, [...this.game.mods]);
    $('btn-end-menu').onclick = () => this.showMenu();
    $('btn-end-edit').onclick = () => { $('overlay-end').classList.add('hidden'); this.openEditor(); };
    $('btn-endless').onclick = () => { this.game.continueEndless(); $('overlay-end').classList.add('hidden'); this.refreshSide(true); };

    window.addEventListener('keyup', e => { if (e.key.toLowerCase() === 'r') this.ui.showRanges = false; });
    window.addEventListener('blur', () => { this.ui.showRanges = false; });
    window.addEventListener('keydown', e => {
      if (this.editor) {
        if (e.key === 'Backspace' || (e.key === 'z' && !e.ctrlKey)) { e.preventDefault(); this.editorUndo(); }
        else if (e.key === 'Enter') this.editorPlay();
        else if (e.key === 'Escape') { if (!$('overlay-keys').classList.contains('hidden')) $('overlay-keys').classList.add('hidden'); else { this.closeEditor(); this.showMenu(); } }
        else if (!e.ctrlKey && !e.metaKey && !e.altKey && !(e.target && e.target.tagName === 'INPUT')) {
          const btn = { g: 'ed-suggest', h: 'ed-hot', c: 'ed-gate', t: 'ed-theme' }[e.key.toLowerCase()];
          if (btn) { e.preventDefault(); $(btn).click(); }
          else if (e.key === '?') $('overlay-keys').classList.toggle('hidden');
        }
        return;
      }
      if (e.key === '?') { $('overlay-keys').classList.toggle('hidden'); return; }
      if (!$('overlay-keys').classList.contains('hidden')) { if (e.key === 'Escape') $('overlay-keys').classList.add('hidden'); return; }
      if (!this.game || !$('overlay-menu').classList.contains('hidden') || !$('overlay-tut').classList.contains('hidden')) return;
      const k = e.key.toLowerCase();
      const tk = TOWER_ORDER.find(t => TOWERS[t].key === k);
      if (tk) return this.selectBuild(tk);
      const ak = Object.keys(ABILITIES).find(a => ABILITIES[a].key === k);
      if (ak) return this.triggerAbility(ak);
      if (k.startsWith('arrow')) {
        e.preventDefault();
        const cur = this.ui.kb && this.ui.hover ? this.ui.hover : { cx: 10, cy: 6 };
        const dx = k === 'arrowleft' ? -1 : k === 'arrowright' ? 1 : 0, dy = k === 'arrowup' ? -1 : k === 'arrowdown' ? 1 : 0;
        const cx = Math.max(0, Math.min(COLS - 1, cur.cx + dx)), cy = Math.max(0, Math.min(ROWS - 1, cur.cy + dy));
        this.ui.kb = true; this.ui.hover = { cx, cy, x: (cx + 0.5) * TILE, y: (cy + 0.5) * TILE };
        return;
      }
      if (k === 'enter' && this.ui.kb && this.ui.hover && !this.paused) { e.preventDefault(); this.actAt(this.ui.hover, 'kb', e.shiftKey); return; }
      if (k === 'r') { this.ui.showRanges = true; return; }
      if (k === 'tab') { e.preventDefault(); this.cycleSelect(e.shiftKey ? -1 : 1); return; }
      if (k === ' ') { e.preventDefault(); this.callWave(); }
      else if (k === 'escape') { if (this.ui.placing || this.ui.selected || this.ui.ability) { this.ui.placing = null; this.ui.selected = null; this.ui.ability = null; this.refreshSide(true); } else this.togglePause(); }
      else if (k === 'u') { if (e.shiftKey) this.upgradeMax(); else this.upgradeSel(); }
      else if (k === 's') this.sellSel();
      else if (k === 't') this.cycleMode();
      else if (k === 'f') this.cycleSpeed();
      else if (k === 'a') this.toggleAuto();
      else if (k === 'z') this.doUndo();
      else if (k === 'p') this.togglePause();
      else if (k === 'm') $('btn-sound').click();
      else if (k === 'n') this.toggleMusic();
    });
    window.addEventListener('beforeunload', () => { this.saveAch(); if (this.game && this.game.state === 'build') this.saveGame(); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.canvas.width < 2) this.layout();
      if (document.hidden) this.saveAch(); if (document.hidden && this.game && !this.paused && !this.game.isOver) this.togglePause(true); });
  },
  // Lưu ngay trước khi gọi đợt để đóng tab giữa đợt vẫn chơi lại được đợt đó với các tháp vừa xây
  callWave() {
    const g = this.game; if (!g || this.paused || !g.canCallWave()) return;
    if (g.state === 'build') this.saveGame();
    if (g.startWave()) { this.hint = null; this.refreshSide(true); }
  },
  // Tab / Shift+Tab: chọn lần lượt các tháp đã xây (theo thứ tự từ trái sang phải)
  cycleSelect(dir) {
    const g = this.game; if (!g || !g.towers.length) return;
    const list = [...g.towers].sort((a, b) => a.cx - b.cx || a.cy - b.cy);
    const i = list.indexOf(this.ui.selected);
    this.ui.placing = null; this.ui.ability = null;
    this.ui.selected = list[(i + dir + list.length) % list.length];
    this.refreshSide(true);
  },
  doUndo() {
    const g = this.game; if (!g || this.paused || !g.undo()) return;
    if (this.ui.selected && !g.towers.includes(this.ui.selected)) this.ui.selected = null;
    this.refreshSide(true);
  },
  setLowFx(on, auto) {
    LOW_FX.on = on; store.set('lowfx', on);
    $('btn-lowfx').textContent = 'Hiệu ứng: ' + (on ? 'Thấp' : 'Cao');
    if (auto) this.toast('🐢 Máy hơi chậm – đã tự chuyển sang <b>hiệu ứng thấp</b>.<br><small>Đổi lại trong menu tạm dừng.</small>');
  },
  // Theo dõi FPS: nếu trung bình > 28ms/khung trong 4 giây thì tự bật hiệu ứng thấp (1 lần)
  watchFps(dt) {
    if (LOW_FX.on || store.get('lowfxAsked', false)) return;
    this._fpsT = (this._fpsT || 0) + dt; this._fpsN = (this._fpsN || 0) + 1;
    if (this._fpsT >= 4) {
      if (this._fpsT / this._fpsN > 0.028) { store.set('lowfxAsked', true); this.setLowFx(true, true); }
      this._fpsT = 0; this._fpsN = 0;
    }
  },
  toggleFullscreen() {
    const d = document, el = d.documentElement;
    const isFs = d.fullscreenElement || d.webkitFullscreenElement;
    try {
      if (isFs) (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      else {
        const p = (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
        // Trên điện thoại: khoá màn hình ngang nếu trình duyệt cho phép
        if (p && p.then) p.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(() => {});
      }
    } catch (e) { /* trình duyệt không hỗ trợ */ }
    setTimeout(() => this.layout(), 300);
  },
  toggleAuto() {
    this.autoWave = !this.autoWave; store.set('autoWave', this.autoWave); this.updateAutoBtn();
    const g = this.game;
    if (this.autoWave && g && g.state === 'build' && g.wave > 0 && !this.paused) this.callWave();
  },
  updateAutoBtn() { $('btn-auto').classList.toggle('on', this.autoWave); },
  cycleSpeed() { this.speed = { 1: 2, 2: 3, 3: 4 }[this.speed] || 1; $('btn-speed').textContent = 'x' + this.speed; },
  togglePause(v) {
    if (!this.game || this.game.isOver || !$('overlay-menu').classList.contains('hidden')) return;
    this.paused = v == null ? !this.paused : v;
    $('overlay-pause').classList.toggle('hidden', !this.paused); this.updateHud();
    if (this.paused) {
      const g = this.game, m = Math.floor(g.time / 60), sec = Math.floor(g.time % 60);
      // Nhãn chữ thay biểu tượng cảm xúc, cùng kiểu thẻ số liệu với EyeTank/EyeRush.
      const items = [['Bản đồ', MAPS[g.mapIndex].name], ['Đợt', g.wave + (g.endless ? ' (vô tận)' : ' / ' + GOAL_WAVE)], ['Điểm', g.score.toLocaleString('vi-VN')],
        ['Máu thành', g.lives + ' / ' + g.maxLives], ['Đã hạ', g.stats.kills.toLocaleString('vi-VN') + ' quái'], ['Thời gian', `${m}:${String(sec).padStart(2, '0')}`]];
      $('pause-info').innerHTML = items.map(([i, t]) => `<span><small>${i}</small>${t}</span>`).join('') +
        (g.mods.size ? `<span><small>Thử thách</small>${[...g.mods].map(k => MODIFIERS[k].name).join(' · ')}</span>` : '');
    }
  },
  toggleMusic() {
    const on = !store.bool('music', true); store.set('music', on);
    if (on) { Music.start(); if (this.game) Ambience.start(MAPS[this.game.mapIndex]); } else { Music.stop(); Ambience.stop(); }
    this.updateSoundBtn();
  },
  updateSoundBtn() {
    if ($('btn-music')) $('btn-music').style.opacity = store.bool('music', true) ? 1 : 0.4; $('btn-sound').textContent = Sound.muted ? 'Âm: Tắt' : 'Âm: Bật'; },

  // ---------- Vòng lặp ----------
  // Luôn hẹn khung kế tiếp kể cả khi một khung bị lỗi, để game không bị đơ vĩnh viễn
  frame(now) {
    try { this.step(now); } catch (e) { console.error(e); }
    requestAnimationFrame(t => this.frame(t));
  },
  step(now) {
    const dt = Math.min(0.1, (now - this.last) / 1000); this.last = now;
    // Canvas chưa có kích thước (mở ở tab nền...) → thử bố trí lại định kỳ
    if (this.canvas.width < 2 && (this._relayout = (this._relayout || 0) + 1) % 30 === 0) this.layout();
    const g = this.game;
    if (g) {
      if (!this.paused) {
        this.watchFps(dt);
        if (this.ach && !g.isOver && $('overlay-menu').classList.contains('hidden')) this.ach.time += dt;
        // Bước cố định 1/60 giây để mô phỏng ổn định ở mọi tốc độ
        this.acc += dt * this.speed;
        const STEP = 1 / 60; let n = 0;
        while (this.acc >= STEP && n < 16) { g.update(STEP); this.acc -= STEP; n++; }
        if (n === 16) this.acc = 0;
        if (this.ui.hurt > 0) this.ui.hurt = Math.max(0, this.ui.hurt - dt * 2);
      }
      if (this.ui.selected && !g.towers.includes(this.ui.selected)) this.ui.selected = null;
      this.ui.hoverEnemy = null;
      if (this.ui.hover && !this.ui.placing) {
        let bd = Infinity;
        for (const e of g.enemies) {
          const ey = e.flying ? e.y - 14 : e.y;
          const d2 = (e.x - this.ui.hover.x) ** 2 + (ey - this.ui.hover.y) ** 2;
          if (d2 < (e.d.radius + 8) ** 2 && d2 < bd) { bd = d2; this.ui.hoverEnemy = e; }
        }
      }
      this.ui.hint = this.hint;
      this.renderer.draw(g, this.ui, this.paused ? 0 : dt);
      this.updateHud();
      this.updateAbilities();
      Music.update(g, this.paused, Number($('siege-status').dataset.level));
      this.refreshSide(false);
    } else if (this.editor) {
      this.renderer.drawEditor(this.editor, this.ui.hover);
    } else {
      // Màn hình menu: vẽ bản đồ đang chọn làm nền
      if (!this._menuGame || this._menuGame.mapIndex !== this.menuMap) this._menuGame = new Game(this.menuMap, 'normal');
      this.renderer.draw(this._menuGame, { }, dt);
    }

  },
  updateHud() {
    const g = this.game;
    $('hud-wave').textContent = g.wave + (g.endless ? '' : ' / ' + GOAL_WAVE);
    $('hud-gold').textContent = Math.floor(g.gold);
    $('hud-lives').textContent = g.lives + ' / ' + g.maxLives;
    const health = $('hud-lives').parentElement, ratio = Math.max(0, Math.min(1, g.lives / g.maxLives));
    health.style.setProperty('--health', (ratio * 100) + '%');
    health.style.setProperty('--ratio', ratio);
    health.dataset.level = ratio <= 0.3 ? 'critical' : ratio <= 0.6 ? 'warning' : 'healthy';
    health.setAttribute('aria-valuenow', g.lives);
    health.setAttribute('aria-valuemax', g.maxLives);
    $('hud-left').textContent = g.enemiesLeft;
    const status = siegeStatus(g), badge = $('siege-status');
    if (badge.textContent !== status.text) badge.textContent = status.text;
    badge.dataset.level = status.level;
    $('hud').dataset.danger = status.level;
    $('hud-lives').parentElement.title = 'Thành bảo vệ Lumi: ' + g.lives + ' / ' + g.maxLives;
    $('wave-bar').firstChild.style.width = (g.state === 'wave' ? g.waveProgress * 100 : 0) + '%';
    const bw = $('btn-wave');
    bw.disabled = !g.canCallWave() || this.paused;
    bw.textContent = g.state === 'wave' ? (g.spawning ? '⏳ Đang tới…' : '⏩ Gọi sớm') : '▶ Đợt ' + (g.wave + 1);
  },
};

window.addEventListener('load', () => {
  App.init();
  // Chơi offline (chỉ khi chạy qua http/https, không áp dụng khi mở file trực tiếp)
  if ('serviceWorker' in navigator && location.protocol.startsWith('http') && !document.documentElement.dataset.single)
    navigator.serviceWorker.register('sw.js').catch(() => {});
});
