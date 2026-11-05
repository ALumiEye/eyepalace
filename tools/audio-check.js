'use strict';
// Đo tín hiệu WebAudio thật trong Chrome, không dùng loa/micro và không cài thêm gói.
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright-core');
const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'js/audio.js'), 'utf8');
const check = (ok, text) => { if (!ok) throw new Error(text); console.log('✓ ' + text); };
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  try {
    const page = await browser.newPage();
    await page.addScriptTag({ content: source + '\nwindow.audio = {Sound, Music, Ambience};' });
    const result = await page.evaluate(async () => {
      const { Sound, Music } = window.audio;
      const stats = data => {
        let peak = 0, sum = 0;
        for (const n of data) { peak = Math.max(peak, Math.abs(n)); sum += n * n; }
        return { peak, rms: Math.sqrt(sum / data.length) };
      };
      async function render(level, volume = .7, muted = false, stress = false) {
        // Đủ dài đi hết chu kỳ tám ô nhịp, gồm build-up/ngắt/drop.
        const c = new OfflineAudioContext(1, 44100 * 20, 44100);
        window.AudioContext = function () { return c; };
        Sound.ctx = null; Sound.musicVol = volume; Sound.sfxVol = 1; Sound.muted = muted;
        Sound.init(); Music.level = level; Music.start(); clearInterval(Music.timer); Music.timer = null;
        const d = Music.stepDuration();
        for (let t = Music.next; t < 19; t += d) Music.renderStep(t, d);
        if (stress) for (const name of ['bossdie', 'roar', 'boom', 'cannon', 'zap', 'snipe']) Sound.play(name);
        const buffer = await c.startRendering();
        const measured = stats(buffer.getChannelData(0));
        Music.stop(); return measured;
      }
      // Đối chứng đúng nhạc cũ: triangle .025 + sine .05, gain nhạc mặc định 70%.
      const old = new OfflineAudioContext(1, 44100 * 10, 44100), gain = old.createGain();
      gain.gain.value = .7; gain.connect(old.destination);
      let step = 0;
      for (let t = .1; t < 9; t += .16, step++) {
        const k = step % 8, root = [57,53,55,52][Math.floor(step/8)%4];
        const note = (midi, dur, type, vol) => {
          const o=old.createOscillator(), g=old.createGain();o.type=type;o.frequency.value=440*Math.pow(2,(midi-69)/12);
          g.gain.setValueAtTime(.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+.02);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
          o.connect(g).connect(gain);o.start(t);o.stop(t+dur+.05);
        };
        note(root+12+[0,3,5,7,10,12,15,17][[0,2,4,2,5,4,2,1][k]],.16*1.6,'triangle',.025);
        if(k===0||k===4)note(root-12,.16*3.5,'sine',.05);
      }
      const baseline = stats((await old.startRendering()).getChannelData(0));
      const modes = [];
      for(let level=0;level<4;level++)modes.push(await render(level));
      const zero=await render(3,0), muted=await render(3,1,true), stress=await render(3,1,false,true);
      const game = {state:'wave',isOver:false,enemies:[]};
      const levels=[];
      Music.update(game,false,0);levels.push(Music.level);
      game.enemies.push({alive:true,d:{boss:true}});Music.update(game,false,0);levels.push(Music.level);
      Music.update(game,false,1);levels.push(Music.level);
      Music.update(game,true,2);levels.push(Music.level);
      game.isOver=true;Music.update(game,false,2);levels.push(Music.level);
      // Kiểm tra phối khí đủ tám ô: có build-up, khoảng ngắt và drop, không chỉ nhanh/to hơn.
      const originalNote=Music.note, originalDrum=Music.drum;
      let notes=0, drums=[]; Music.note=()=>notes++; Music.drum=(kind)=>drums.push(kind);
      Music.level=3;Music.step=112; // ô thứ tám
      for(let k=0;k<14;k++)Music.renderStep(k*.08,.08);
      const buildup=drums.includes('rise')&&drums.filter(k=>k==='snare').length>=14;
      notes=0;drums=[];Music.renderStep(1.12,.08);Music.renderStep(1.2,.08);
      const gap=notes===0&&drums.length===0;
      Music.renderStep(1.28,.08);const drop=drums.includes('crash')&&drums.includes('kick');
      const tempos=[0,1,2,3].map(level=>{Music.level=level;return Math.round(60/Music.stepDuration()/4);});
      Music.note=originalNote;Music.drum=originalDrum;
      // Hẹn nhạc sau khi tab ngủ lâu: số nốt tạo ra phải bị giới hạn bởi cửa sổ 160 ms.
      Sound.ctx = {currentTime:3600,state:'running'};Sound._muted=false;Music.on=true;Music.next=0;Music.level=3;
      let scheduled=0;const original=Music.renderStep;Music.renderStep=()=>scheduled++;
      Music.schedule();Music.renderStep=original;Music.on=false;Sound.ctx=null;
      return {baseline,modes,zero,muted,stress,levels,tempos,buildup,gap,drop,scheduled,clean:Music.sources.size===0&&!Music.bus&&!Music.timer};
    });
    console.log(JSON.stringify(result, null, 2));
    check(result.modes[1].rms > result.baseline.rms * 3, 'Nhạc giao tranh có RMS >3 lần nền cũ ở cùng mức 70%');
    check(result.modes.every(m=>m.rms>.01&&Number.isFinite(m.peak)&&m.peak<.98), 'Bốn cấp nhạc đều có tín hiệu, còn khoảng trống đỉnh âm');
    check(result.zero.peak === 0 && result.muted.peak === 0, 'Âm lượng 0 và tắt âm đều im lặng');
    check(result.stress.peak < .98, 'Nhạc nguy cấp 100% + hiệu ứng trùm không chạm biên số');
    check(JSON.stringify(result.levels)==='[1,2,3,0,0]', 'Chuyển cấp đúng khi giao tranh/trùm/nguy hiểm/tạm dừng/kết thúc');
    check(result.scheduled<=2&&result.scheduled>0, 'Tab ngủ một giờ không tạo cơn dồn nốt phát bù');
    check(result.clean, 'Dừng nhạc giải phóng nguồn phát, nhánh nhạc và bộ hẹn');
    check(result.tempos.join(',')==='120,168,180,192', 'Bốn cấp tempo 120/168/180/192 BPM');
    check(result.buildup&&result.gap&&result.drop, 'Chu kỳ có snare dồn, riser, ngắt nhịp và drop kick/crash');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
