'use strict';
// ===== Sinh đợt quái =====
// Trả về danh sách sự kiện { t: thời điểm (giây), type } đã sắp xếp theo thời gian.

function waveHpMul(n) {
  // Tăng nhanh dần: ~x2 ở đợt 8, ~x5 ở đợt 18, ~x11 ở đợt 30
  return Math.pow(1.085, n - 1) * (1 + 0.012 * (n - 1) * (n - 1) / 10);
}

function makeWave(n) {
  const groups = [];
  const add = (type, count, gap, start) => groups.push({ type, count: Math.max(0, Math.round(count)), gap, start });

  if (n % 10 === 0) {
    // Đợt trùm
    const bosses = n / 10;
    add('grunt', 6 + n * 0.4, 0.6, 0);
    add('tank', 1 + n / 8, 1.6, 2);
    const kinds = ['boss', 'dragonboss', 'slimeking'];
    for (let i = 0; i < bosses; i++) add(kinds[i % kinds.length], 1, 1, 6 + i * 6);
    if (n >= 20) add('shaman', 2 + n / 10, 1.4, 8);
    if (n >= 20) add('ghost', n / 5, 1.0, 10);
    return flatten(groups);
  }

  add('grunt', 5 + n * 1.1, Math.max(0.35, 0.9 - n * 0.02), 0);
  if (n >= 3) add('runner', 2 + n * 0.7, 0.45, 3);
  if (n >= 4 && n % 2 === 0) add('bat', 2 + n * 0.45, 0.7, 5);
  if (n >= 5) add('tank', (n - 3) * 0.35, 2.0, 6);
  if (n >= 6 && n % 3 !== 1) add('slime', 1 + (n - 5) * 0.3, 1.5, 8);
  if (n >= 8) add('shaman', 1 + (n - 7) * 0.2, 2.5, 7);
  if (n >= 12 && n % 2 === 1) add('runner', n * 0.6, 0.25, 12);
  if (n >= 15) add('bat', n * 0.3, 0.5, 10);
  if (n >= 9 && n % 2 === 1) add('mole', 2 + (n - 9) * 0.3, 1.6, 4);
  if (n >= 11 && n % 3 === 2) add('ghost', 3 + (n - 11) * 0.35, 1.1, 6);
  if (n >= 7 && n % 3 === 0) add('knight', 2 + (n - 7) * 0.3, 1.8, 5);
  if (n >= 6 && n % 4 === 2) add('goldgob', 1 + Math.floor(n / 12), 1.5, 9);
  if (n >= 18 && n % 2 === 1) add('hexer', 1 + (n - 18) * 0.25, 2.2, 7);
  if (n >= 16 && n % 2 === 0) add('dragon', 1 + (n - 16) * 0.3, 2.4, 9);
  if (n >= 21) add('ghost', (n - 18) * 0.4, 0.9, 14);
  return flatten(groups);
}

function flatten(groups) {
  const ev = [];
  groups.forEach((g, gi) => {
    const formation = g.type === 'grunt' || g.type === 'runner';
    for (let i = 0; i < g.count; i++) {
      // Bộ binh tràn lên theo tổ ba con; giữ nguyên tổng số, máu và thưởng mỗi đợt.
      const delay = formation ? Math.floor(i / 3) * g.gap * 3 + (i % 3) * Math.min(0.09, g.gap) : i * g.gap;
      ev.push({ t: g.start + delay, type: g.type, group: gi });
    }
  });
  ev.sort((a, b) => a.t - b.t);
  return ev;
}

// Mô tả ngắn cho đợt sắp tới (hiện trên giao diện)
function describeWave(n) {
  const ev = makeWave(n); const cnt = {};
  for (const e of ev) cnt[e.type] = (cnt[e.type] || 0) + 1;
  return Object.entries(cnt).map(([k, v]) => ({ type: k, count: v }));
}

// Đợt đêm tối: tầm tháp giảm 20% (trừ Mắt Thần)
function isNightWave(n) { return n >= 5 && n % 7 === 5; }
const NIGHT_RANGE = 0.8;

// Cổng của mỗi nhóm quái: nhóm gi ở đợt n đi cổng (gi + n) % số cổng; trùm luôn chia đều
function gateFor(ev, n, nPaths, idx) {
  if (nPaths <= 1) return 0;
  if (ENEMIES[ev.type].boss || ev.type === 'grunt') return idx % nPaths;   // lính thường chia đều để không cổng nào trống
  return (ev.group + n) % nPaths;
}
// Số quái sẽ ra ở mỗi cổng trong đợt n
function gateCounts(n, nPaths) {
  const out = new Array(nPaths).fill(0);
  makeWave(n).forEach((e, i) => out[gateFor(e, n, nPaths, i)]++);
  return out;
}

// Gợi ý chiến thuật cho đợt n dựa vào thành phần quái và tháp người chơi đang có
function waveAdvice(n, towers) {
  const cnt = {}; for (const e of makeWave(n)) cnt[e.type] = (cnt[e.type] || 0) + 1;
  const has = k => towers.some(t => t.type === k);
  const airHitters = towers.filter(t => t.def.air && !t.def.support).length;
  const tips = [];
  if (cnt.goldgob) tips.push('💰 Yêu Tinh Vàng xuất hiện – hạ nó để nhận nhiều vàng (lọt cũng không mất máu).');
  const fly = (cnt.bat || 0) + (cnt.dragon || 0) + (cnt.dragonboss || 0);
  if (fly && airHitters < 2) tips.push('🦇 Có quái bay – cần tháp bắn được quái bay (Pháo Đá không bắn được).');
  if (cnt.ghost && !has('eye')) tips.push('👻 Có Bóng Ma – xây Mắt Thần để làm lộ chúng.');
  if ((cnt.tank || cnt.knight || cnt.boss) && !has('sniper') && !towers.some(t => t.branch === 1 && t.type === 'archer')) tips.push('🛡 Quái giáp dày – Tháp Ngắm (xuyên giáp) rất hiệu quả.');
  if (cnt.knight) tips.push('⚔️ Hiệp Sĩ Khiên chặn phát bắn đơn – dùng Pháo, Băng hoặc Mắt Thần.');
  if (cnt.shaman) tips.push('🧙 Pháp Sư hồi máu – nhắm "Máu nhiều" hoặc hạ chúng trước.');
  if ((cnt.runner || 0) >= 10 && !has('frost')) tips.push('💨 Nhiều quái nhanh – Tháp Băng giúp làm chậm.');
  if (cnt.hexer) tips.push('🧿 Phù Thủy làm tê liệt tháp gần nó – dàn tháp ra & dùng Tháp Ngắm tầm xa.');
  if (cnt.mole) tips.push('🐀 Chuột Chũi lặn đất định kỳ – cần tháp phủ dài theo đường.');
  return tips.slice(0, 2);
}

// Gợi ý sau khi thua: dựa vào loại quái làm mất nhiều máu nhất & tháp người chơi đã có
const LOSS_TIPS = {
  air: '🦇 Thêm tháp bắn được quái bay (Cung, Sét, Ngắm, Mắt Thần) dọc đường bay thẳng tới cung điện.',
  ghost: '👻 Xây Mắt Thần gần đường để làm lộ Bóng Ma – tháp khác không thấy chúng.',
  armor: '🛡 Quái giáp dày: dùng Tháp Ngắm hoặc nhánh Xuyên Giáp của Tháp Cung; Tháp Độc nhánh Axit giảm giáp.',
  fast: '💨 Quái nhanh: đặt Tháp Băng ở khúc cua đầu để làm chậm, rồi tháp bắn nhanh phía sau.',
  swarm: '💥 Đông quái / Nhớt tách đôi: Pháo Đá và Sét (lan) xử lý đám đông tốt hơn bắn đơn.',
  mole: '🐀 Chuột Chũi lặn đất: cần tháp phủ dài theo đường, đừng dồn hết một chỗ.',
  healer: '🧙 Pháp Sư hồi máu: đổi chế độ nhắm sang "Máu nhiều" hoặc hạ chúng trước.',
  hexer: '🧿 Phù Thủy làm tê liệt tháp gần: dàn tháp ra và dùng Tháp Ngắm tầm xa.',
  boss: '👑 Trùm: để dành Thiên Thạch & Băng Giá cho trùm, nâng cấp tháp chủ lực lên cấp 4 trước đợt 10/20/30.',
  basic: '⚔️ Lọt cả quái thường: xây thêm tháp sớm hơn và nâng cấp thay vì để dồn vàng.',
};
const LOSS_GROUP = { bat: 'air', dragon: 'air', dragonboss: 'boss', ghost: 'ghost', tank: 'armor', knight: 'armor', runner: 'fast', goldgob: 'fast',
  slime: 'swarm', slimelet: 'swarm', slimeking: 'boss', mole: 'mole', shaman: 'healer', hexer: 'hexer', boss: 'boss', grunt: 'basic' };
function lossAdvice(leakBy, towers = [], wave = 0) {
  const groups = {};
  for (const [type, n] of Object.entries(leakBy || {})) { const k = LOSS_GROUP[type] || 'basic'; groups[k] = (groups[k] || 0) + n; }
  const has = k => towers.some(t => t.type === k);
  let order = Object.entries(groups).sort((a, b) => b[1] - a[1]).map(e => e[0]);
  // Bỏ gợi ý đã làm rồi
  order = order.filter(k => !(k === 'ghost' && has('eye')));
  if (wave % 10 === 0 && wave > 0 && !order.includes('boss')) order.unshift('boss');
  const top = Object.entries(leakBy || {}).sort((a, b) => b[1] - a[1]).slice(0, 3)
    .map(([t, n]) => ({ type: t, name: (ENEMIES[t] || {}).name || t, lives: n }));
  return { top, tips: order.slice(0, 3).map(k => LOSS_TIPS[k]) };
}
