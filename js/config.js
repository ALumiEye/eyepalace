'use strict';
// ===== Cấu hình chung của game Eye Palace (thủ thành) =====
const TILE = 48, COLS = 20, ROWS = 12;
const W = TILE * COLS, H = TILE * ROWS;
// Đại lộ ba làn: dùng chung độ rộng khi vẽ và giới hạn vị trí quái.
const ROAD_WIDTH = TILE * 1.65;
const ROAD_LANE = TILE * 0.42;

// Độ khó
const DIFFICULTY = {
  easy:   { name: 'Dễ',     hp: 0.8,  gold: 1.15, lives: 30, startGold: 260 },
  normal: { name: 'Thường', hp: 1.25,  gold: 1.0,  lives: 20, startGold: 220 },
  hard:   { name: 'Khó',    hp: 1.55, gold: 0.9,  lives: 10, startGold: 200 },
};

// Bóng Ma chỉ bị nhắm khi ở trong tầm Mắt Thần hoặc rất gần một tháp bất kỳ
const REVEAL_NEAR = 1.4;

const GOAL_WAVE = 30;      // Sống sót qua đợt này là thắng (sau đó có thể chơi vô tận)
const SELL_RATIO = 0.7;    // Bán tháp nhận lại 70% số vàng đã đầu tư

// Các loại tháp. range tính theo ô, rate = giây giữa 2 phát bắn.
const TOWERS = {
  archer: {
    name: 'Tháp Cung', key: '1', color: '#d9a35b', air: true,
    desc: 'Bắn nhanh vào một mục tiêu. Bắn được quái bay.',
    levels: [
      { cost: 50,  dmg: 9,  range: 2.7, rate: 0.55 },
      { cost: 60,  dmg: 16, range: 3.0, rate: 0.47 },
      { cost: 115, dmg: 28, range: 3.3, rate: 0.38 },
    ],
  },
  cannon: {
    name: 'Pháo Đá', key: '2', color: '#8a8f98', air: false,
    desc: 'Đạn nổ gây sát thương lan. Không bắn được quái bay.',
    levels: [
      { cost: 80,  dmg: 22, range: 2.5, rate: 1.45, splash: 0.95 },
      { cost: 95,  dmg: 40, range: 2.7, rate: 1.3,  splash: 1.1 },
      { cost: 170, dmg: 70, range: 3.0, rate: 1.15, splash: 1.25 },
    ],
  },
  frost: {
    name: 'Tháp Băng', key: '3', color: '#7dd3fc', air: true,
    desc: 'Toả hơi lạnh làm chậm mọi quái trong tầm.',
    levels: [
      { cost: 70,  dmg: 2,  range: 2.0, rate: 1.0, slow: 0.35, slowDur: 1.6 },
      { cost: 80,  dmg: 4,  range: 2.3, rate: 0.9, slow: 0.45, slowDur: 1.8 },
      { cost: 140, dmg: 7, range: 2.6, rate: 0.8, slow: 0.55, slowDur: 2.0 },
    ],
  },
  tesla: {
    name: 'Tháp Sét', key: '4', color: '#facc15', air: true,
    desc: 'Tia sét nảy qua nhiều quái liên tiếp.',
    levels: [
      { cost: 110, dmg: 16, range: 2.4, rate: 1.05, chains: 3 },
      { cost: 120, dmg: 27, range: 2.6, rate: 0.95, chains: 4 },
      { cost: 210, dmg: 46, range: 2.9, rate: 0.85, chains: 6 },
    ],
  },
  sniper: {
    name: 'Tháp Ngắm', key: '5', color: '#a3e635', air: true, defaultTarget: 'strong',
    desc: 'Tầm cực xa, sát thương lớn, xuyên giáp.',
    levels: [
      { cost: 120, dmg: 60,  range: 5.5, rate: 2.1, pierce: true },
      { cost: 140, dmg: 115, range: 6.2, rate: 1.9, pierce: true },
      { cost: 240, dmg: 210, range: 7.0, rate: 1.7, pierce: true },
    ],
  },
  eye: {
    name: 'Mắt Thần', key: '6', color: '#f472b6', air: true,
    desc: 'Tia nhìn liên tục, càng nhìn lâu càng đau (tối đa x3).',
    levels: [
      { cost: 150, dps: 24, range: 2.9, ramp: 2.5 },
      { cost: 170, dps: 42, range: 3.2, ramp: 2.2 },
      { cost: 280, dps: 75, range: 3.5, ramp: 1.8 },
    ],
  },
};
// Nhánh chuyên môn cấp 4: chọn 1 trong 2 khi tháp đạt cấp 3
const BRANCHES = {
  archer: [
    { name: 'Liên Châu', desc: 'Bắn cùng lúc 3 mục tiêu.', cost: 260, dmg: 30, range: 3.4, rate: 0.34, multi: 3 },
    { name: 'Xuyên Giáp', desc: 'Mũi tên nặng xuyên mọi lớp giáp.', cost: 260, dmg: 75, range: 3.9, rate: 0.55, pierce: true },
  ],
  cannon: [
    { name: 'Pháo Cối', desc: 'Vụ nổ cực lớn, tầm xa.', cost: 320, dmg: 125, range: 3.5, rate: 1.25, splash: 1.7 },
    { name: 'Pháo Lửa', desc: 'Để lại lửa đốt 30 sát thương/giây trong 3 giây.', cost: 300, dmg: 80, range: 3.1, rate: 1.05, splash: 1.3, burn: 30, burnDur: 3 },
  ],
  frost: [
    { name: 'Bão Tuyết', desc: 'Tầm rộng, làm chậm cực mạnh.', cost: 250, dmg: 12, range: 3.3, rate: 0.7, slow: 0.68, slowDur: 2.2 },
    { name: 'Băng Phong', desc: '20% cơ hội đóng băng quái 1 giây.', cost: 260, dmg: 16, range: 2.8, rate: 0.75, slow: 0.55, slowDur: 2.0, freeze: 0.2 },
  ],
  tesla: [
    { name: 'Lưới Sét', desc: 'Sét nảy qua 10 mục tiêu.', cost: 360, dmg: 55, range: 3.1, rate: 0.8, chains: 10 },
    { name: 'Quá Tải', desc: 'Sét cực mạnh, làm choáng 0,4 giây.', cost: 360, dmg: 130, range: 3.0, rate: 0.9, chains: 3, stun: 0.4 },
  ],
  sniper: [
    { name: 'Ám Sát', desc: '30% cơ hội chí mạng x3.', cost: 400, dmg: 380, range: 7.8, rate: 1.6, pierce: true, crit: 0.3 },
    { name: 'Liên Thanh', desc: 'Bắn nhanh gấp 3 lần.', cost: 380, dmg: 135, range: 6.5, rate: 0.6, pierce: true },
  ],
  eye: [
    { name: 'Huỷ Diệt', desc: 'Tia cực mạnh, tích luỹ nhanh hơn.', cost: 450, dps: 120, range: 3.7, ramp: 1.3 },
    { name: 'Nhãn Ấn', desc: 'Quái bị nhìn chịu thêm 30% sát thương từ mọi nguồn.', cost: 420, dps: 85, range: 3.9, ramp: 1.6, vuln: 0.3 },
  ],
};

// Tháp hỗ trợ: không tấn công, tăng sức mạnh tháp trong tầm (không cộng dồn giữa nhiều Đài)
TOWERS.banner = {
  name: 'Đài Chỉ Huy', key: '7', color: '#fb7185', air: true, support: true,
  desc: 'Không tấn công. Tăng sát thương & tốc bắn cho tháp xung quanh.',
  levels: [
    { cost: 120, range: 1.6, buff: 0.15, haste: 0.08 },
    { cost: 130, range: 1.8, buff: 0.22, haste: 0.12 },
    { cost: 220, range: 2.0, buff: 0.30, haste: 0.15 },
  ],
};
BRANCHES.banner = [
  { name: 'Chiến Kỳ', desc: 'Tăng 45% sát thương, 20% tốc bắn, tầm rộng.', cost: 320, range: 2.4, buff: 0.45, haste: 0.2 },
  { name: 'Kho Bạc', desc: 'Tăng 30% sát thương & +70 vàng sau mỗi đợt.', cost: 300, range: 2.0, buff: 0.3, haste: 0.15, income: 70 },
];

// Tháp Độc: phi tiêu tẩm độc cộng dồn nhiều lớp (sát thương theo thời gian)
TOWERS.poison = {
  name: 'Tháp Độc', key: '8', color: '#84cc16', air: true,
  desc: 'Phi tiêu tẩm độc cộng dồn nhiều lớp, gây sát thương theo thời gian.',
  levels: [
    { cost: 90,  dps: 9,  range: 2.6, rate: 0.7,  stacks: 4, dur: 4 },
    { cost: 100, dps: 15, range: 2.8, rate: 0.62, stacks: 5, dur: 4 },
    { cost: 180, dps: 25, range: 3.0, rate: 0.55, stacks: 6, dur: 4.5 },
  ],
};
BRANCHES.poison = [
  { name: 'Dịch Hạch', desc: 'Quái chết khi trúng độc lây 3 lớp độc sang quái xung quanh.', cost: 320, dps: 36, range: 3.1, rate: 0.5, stacks: 7, dur: 5, spread: true },
  { name: 'Axit', desc: 'Quái trúng độc bị giảm 50% giáp.', cost: 300, dps: 32, range: 3.1, rate: 0.5, stacks: 7, dur: 5, corrode: true },
];
const TOWER_ORDER = ['archer', 'cannon', 'frost', 'tesla', 'sniper', 'eye', 'banner', 'poison'];

const TARGET_MODES = ['first', 'last', 'strong', 'close'];
const TARGET_NAMES = { first: 'Đầu tiên', last: 'Cuối cùng', strong: 'Máu nhiều', close: 'Gần nhất' };

// Các loại quái. speed tính theo ô/giây.
const ENEMIES = {
  grunt:    { name: 'Lính Bùn',   hp: 32,   speed: 1.15, reward: 5,   radius: 11, color: '#7fb069', lives: 1 },
  runner:   { name: 'Chuột Chạy', hp: 20,   speed: 2.1,  reward: 4,   radius: 9,  color: '#e9c46a', lives: 1 },
  tank:     { name: 'Rùa Giáp',   hp: 150,  speed: 0.65, reward: 12,  radius: 15, color: '#8d6e63', lives: 2, armor: 4 },
  bat:      { name: 'Dơi Đêm',    hp: 26,   speed: 1.5,  reward: 6,   radius: 10, color: '#9b5de5', lives: 1, flying: true },
  shaman:   { name: 'Pháp Sư',    hp: 60,   speed: 1.0,  reward: 10,  radius: 12, color: '#4cc9f0', lives: 1, healer: true },
  slime:    { name: 'Nhớt Mẹ',    hp: 70,   speed: 0.9,  reward: 6,   radius: 13, color: '#06d6a0', lives: 1, split: 'slimelet', splitCount: 3 },
  slimelet: { name: 'Nhớt Con',   hp: 18,   speed: 1.5,  reward: 1,   radius: 7,  color: '#5ee6b8', lives: 1 },
  ghost:    { name: 'Bóng Ma',    hp: 45,   speed: 1.3,  reward: 9,   radius: 11, color: '#c4b5fd', lives: 1, stealth: true },
  mole:     { name: 'Chuột Chũi', hp: 85,   speed: 1.0,  reward: 9,   radius: 12, color: '#a16207', lives: 1, burrow: true, armor: 2 },
  dragon:   { name: 'Rồng Con',   hp: 150,  speed: 1.0,  reward: 15,  radius: 14, color: '#f97316', lives: 2, flying: true, armor: 3 },
  goldgob:  { name: 'Yêu Tinh Vàng', hp: 70, speed: 2.1, reward: 55, radius: 10, color: '#facc15', lives: 0, bonus: true },
  hexer:    { name: 'Phù Thủy Bóng Đêm', hp: 110, speed: 0.9, reward: 14, radius: 12, color: '#7e22ce', lives: 1, hexer: true },
  knight:   { name: 'Hiệp Sĩ Khiên', hp: 95, speed: 0.85, reward: 11, radius: 13, color: '#60a5fa', lives: 2, armor: 2, shield: 3 },
  dragonboss: { name: 'Long Vương', hp: 950,  speed: 0.6,  reward: 200, radius: 22, color: '#ea580c', lives: 6, armor: 4, boss: true, flying: true },
  slimeking:  { name: 'Vua Nhớt',   hp: 1250, speed: 0.42, reward: 200, radius: 24, color: '#10b981', lives: 6, armor: 5, boss: true, split: 'slime', splitCount: 4 },
  boss:     { name: 'Chúa Quỷ',   hp: 1150, speed: 0.45, reward: 150, radius: 22, color: '#e63946', lives: 6, armor: 6, boss: true },
};

// Kỹ năng chủ động (hồi chiêu theo giây)
const ABILITIES = {
  meteor: { name: 'Thiên Thạch', key: 'q', icon: '☄️', cd: 40, radius: 1.7, desc: 'Gọi thiên thạch rơi vào vị trí chọn, gây sát thương lớn (cả quái bay).' },
  freeze: { name: 'Băng Giá', key: 'w', icon: '❄️', cd: 60, slow: 0.8, dur: 3.5, desc: 'Làm chậm 80% toàn bộ quái trên bản đồ trong 3,5 giây.' },
};
function meteorDamage(wave) { return 90 + wave * 30 + wave * wave * 1.5; }

// Thành tựu (lưu vĩnh viễn trong trình duyệt)
const ACHIEVEMENTS = [
  { id: 'first_win',   icon: '🏆', name: 'Người Gác Cổng',   desc: 'Thắng một ván bất kỳ.' },
  { id: 'flawless',    icon: '💎', name: 'Không Tì Vết',     desc: 'Thắng mà không mất giọt máu nào.' },
  { id: 'hard_win',    icon: '🔥', name: 'Thép Đã Tôi',      desc: 'Thắng ở độ khó Khó.' },
  { id: 'all_maps',    icon: '🗺', name: 'Chinh Phục',       desc: 'Thắng trên tất cả bản đồ cố định.' },
  { id: 'kills_1000',  icon: '⚔️', name: 'Nghìn Quái',       desc: 'Hạ tổng cộng 1.000 quái.' },
  { id: 'kills_10000', icon: '☠️', name: 'Vạn Quái',         desc: 'Hạ tổng cộng 10.000 quái.' },
  { id: 'boss_10',     icon: '👑', name: 'Diệt Chúa Quỷ',    desc: 'Hạ tổng cộng 10 trùm.' },
  { id: 'branch',      icon: '⭐', name: 'Chuyên Gia',       desc: 'Nâng một tháp lên nhánh cấp 4.' },
  { id: 'all_branch',  icon: '🌟', name: 'Bậc Thầy',         desc: 'Dùng đủ tất cả các nhánh chuyên môn.' },
  { id: 'meteor5',     icon: '☄️', name: 'Mưa Sao Băng',     desc: 'Một Thiên Thạch hạ 5 quái trở lên.' },
  { id: 'perfect10',  icon: '✨', name: 'Thành Đồng',       desc: '10 đợt hoàn hảo liên tiếp (không để lọt quái nào).' },
  { id: 'goblin10',   icon: '🪙', name: 'Kẻ Săn Vàng',      desc: 'Hạ tổng cộng 10 Yêu Tinh Vàng.' },
  { id: 'palace_win', icon: '👁', name: 'Chủ Nhân Cung Điện', desc: 'Thắng bản đồ Cung Điện Mắt.' },
  { id: 'poison300',  icon: '☠️', name: 'Bậc Thầy Độc Dược', desc: 'Tháp Độc hạ tổng cộng 300 quái.' },
  { id: 'rich',        icon: '💰', name: 'Phú Ông',          desc: 'Có 3.000 vàng cùng lúc.' },
  { id: 'endless40',   icon: '♾', name: 'Bất Tận',           desc: 'Sống tới đợt 40 trong chế độ vô tận.' },
];

// Mô tả ngắn cho cẩm nang
const ENEMY_NOTES = {
  grunt: 'Quái cơ bản, đông.', runner: 'Rất nhanh, máu ít.', tank: 'Giáp dày, chậm. Dùng Tháp Ngắm / Xuyên Giáp.',
  bat: 'Bay thẳng về cung điện. Pháo không bắn được.', shaman: 'Hồi máu cho quái xung quanh – ưu tiên hạ trước.',
  slime: 'Chết thì tách thành 3 Nhớt Con.', slimelet: 'Nhỏ, nhanh.', ghost: 'Tàng hình: chỉ lộ trong tầm Mắt Thần hoặc khi đi sát tháp.',
  mole: 'Chui xuống đất định kỳ, khi đó miễn mọi sát thương.', dragon: 'Bay, có giáp, lọt vào trừ 2 máu.',
  dragonboss: 'Trùm bay từ đợt 20 – Pháo không bắn được. Cần tháp bắn quái bay.',
  slimeking: 'Trùm đợt 30 – chết thì vỡ thành 4 Nhớt Mẹ (mỗi con lại tách 3).',
  goldgob: 'Chạy rất nhanh, không trừ máu cung điện – hạ được thì nhận rất nhiều vàng!',
  hexer: 'Cứ 5 giây làm tê liệt tháp gần nhất (trong 2 ô) suốt 2 giây – hạ sớm, dùng Tháp Ngắm tầm xa.',
  knight: 'Khiên chặn vài phát bắn đơn – sát thương lan & tia đi xuyên khiên.', boss: 'Mỗi 10 đợt. Máu & giáp khổng lồ; cứ 8 giây GẦM làm tê liệt tháp trong 2 ô suốt 1,5 giây.',
};

// Thử thách: bật thêm để khó hơn, điểm nhân thêm
const MODIFIERS = {
  fast:      { icon: '💨', name: 'Cuồng Phong', desc: 'Quái nhanh hơn 25%.', score: 0.3 },
  poor:      { icon: '🪙', name: 'Khốn Khó',    desc: 'Vàng nhận được -25%, vàng khởi đầu -20%.', score: 0.5 },
  fragile:   { icon: '💔', name: 'Mong Manh',   desc: 'Máu cung điện chỉ còn 1/4.', score: 0.25 },
  noAbility: { icon: '🚫', name: 'Tay Không',   desc: 'Không dùng được kỹ năng.', score: 0.2 },
  noSell:    { icon: '🔒', name: 'Không Hối Hận', desc: 'Không được bán tháp.', score: 0.15 },
  darkness:  { icon: '🌑', name: 'Vĩnh Dạ',     desc: 'Mọi đợt đều là đêm tối.', score: 0.25 },
  sandbox:   { icon: '🧪', name: 'Thử Nghiệm',  desc: 'Vàng vô hạn để thử đội hình. Không tính điểm, kỷ lục hay thành tựu.', score: 0, sandbox: true },
};

// DPS ước tính trên một mục tiêu (chuỗi/nảy/đa mục tiêu tính thêm hệ số)
function estimateDps(type, s) {
  if (s.dmg == null && s.dps == null) return 0;
  if (s.stacks) return s.dps * s.stacks * 0.7;                // Độc: trung bình ~70% số lớp tối đa
  if (s.dps != null) return s.dps * 2;                       // Mắt Thần: trung bình ~x2 khi tích luỹ
  let d = s.dmg / s.rate;
  if (s.multi) d *= s.multi;
  if (s.chains) d *= 1 + (s.chains - 1) * 0.6;                // sét nảy giảm dần
  if (s.splash) d *= 1 + s.splash;                            // nổ lan trúng nhiều quái
  if (s.crit) d *= 1 + s.crit * 2;
  if (s.burn) d += s.burn * Math.min(1, s.burnDur / s.rate);
  return d;
}
