// Kiểm tra giao diện thật bằng Chrome; dùng thư viện sẵn có, không cài phụ thuộc.
'use strict';
const fs = require('fs'), path = require('path'), http = require('http');
const { chromium } = require('../../eyetank/node_modules/playwright-core');
const root = path.resolve(__dirname, '..');
const check = (ok, label) => { if (!ok) throw new Error(label); console.log('✓ ' + label); };
(async () => {
  const server = http.createServer((req, res) => {
    const name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const file = path.resolve(root, '.' + (name === '/' ? '/index.html' : name));
    if (!file.startsWith(root + path.sep)) { res.writeHead(403).end(); return; }
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end(); return; }
      res.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json'})[path.extname(file)] || 'application/octet-stream');
      res.end(data);
    });
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  let browser;
  try {
    browser = await chromium.launch({ channel: 'chrome', headless: true });
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
    const url = 'http://127.0.0.1:' + server.address().port;
    await page.goto(url);
    await page.waitForFunction(() => typeof App !== 'undefined' && App.renderer && App.renderer.lumi.naturalWidth > 0);
    const lumiRatioOK = await page.evaluate(() => {
      const r = App.renderer, canvas = document.createElement('canvas');
      canvas.width = W; canvas.height = H;
      const ctx = canvas.getContext('2d'), drawImage = ctx.drawImage.bind(ctx);
      let size;
      ctx.drawImage = (image, ...args) => { if (image === r.lumi) size = args.slice(2); drawImage(image, ...args); };
      r.drawCastle(ctx, W / 2, H / 2);
      return size && Math.abs(size[0] / size[1] - r.lumi.naturalWidth / r.lumi.naturalHeight) < 1e-9;
    });
    check(lumiRatioOK, 'Lumi được vẽ đúng tỷ lệ ảnh gốc, không kéo dọc/ngang');
    await page.screenshot({ path: path.join(root, 'docs/siege-menu.png') });
    await page.click('#btn-play');
    if (await page.locator('#overlay-tut').isVisible()) await page.click('#btn-tut-skip');
    await page.click('#tower-list .tbtn:first-child');
    const placed = await page.evaluate(() => {
      const g = App.game;
      for(let y=0;y<ROWS;y++)for(let x=0;x<COLS;x++)if(g.canPlace(x,y))return {x,y};
    });
    const box = await page.locator('#cv').boundingBox();
    await page.mouse.click(box.x + (placed.x + .5) * box.width / 20, box.y + (placed.y + .5) * box.height / 12);
    check(await page.evaluate(() => App.game.towers.length === 1), 'Xây tháp bằng thao tác thật');
    await page.click('#btn-wave');
    await page.waitForFunction(() => App.game.enemies.length >= 3);
    check(await page.evaluate(() => new Set(App.game.enemies.filter(e=>!e.flying).map(e=>e.lane)).size === 3), 'Quái thật chạy ba làn');
    await page.waitForFunction(() => Music.level === 1 && Sound.ctx.state === 'running' && Music.sources.size > 0);
    check(true, 'Nhạc chiến đấu phát trong AudioContext thật');
    await page.evaluate(() => App.game.spawn('boss', 0, 1, 1));
    await page.waitForFunction(() => Music.level === 2);
    await page.evaluate(() => { App.game.lives = 4; });
    await page.waitForFunction(() => Music.level === 3);
    check(true, 'Nhạc tự tăng cấp khi có trùm và thành nguy cấp trong game thật');
    await page.click('#btn-sound');
    check(await page.evaluate(() => Sound.muted), 'Nút tắt âm điều khiển cả nhạc/âm môi trường');
    await page.click('#btn-sound');
    await page.click('#btn-music');
    check(await page.evaluate(() => !Music.on && !Music.timer && Music.sources.size === 0 && !Music.bus), 'Tắt nhạc ngắt sạch nguồn phát đã hẹn');
    await page.click('#btn-music');
    await page.waitForFunction(() => Music.on && Music.sources.size > 0);
    await page.click('#btn-pause');
    await page.waitForFunction(() => Music.level === 0);
    await page.locator('#vol-music').evaluate(el => { el.value = 35; el.dispatchEvent(new Event('input')); });
    check(await page.evaluate(() => Sound.musicVol === .35 && store.num('volMusic', 70, 0, 100) === 35), 'Thanh âm lượng nhạc vẫn chỉnh và lưu đúng');
    await page.evaluate(() => { App.game.lives = App.game.maxLives; document.getElementById('overlay-pause').classList.add('hidden'); });
    await page.evaluate(() => {
      const g=App.game; g.enemies=[];
      for(let i=0;i<33;i++)g.spawn(i%6===0?'tank':'grunt',0,2,100+Math.floor(i/3)*30);
      App.renderer.draw(g,App.ui,0);
    });
    const healthStates = await page.evaluate(() => {
      const g = App.game, max = g.maxLives;
      const result = [max, Math.ceil(max * .5), Math.floor(max * .2), 0].map(hp => {
        g.lives = hp; App.updateHud();
        const el = document.querySelector('.castle-health');
        return {text: document.getElementById('hud-lives').textContent, level: el.dataset.level, now: +el.getAttribute('aria-valuenow'), width: el.style.getPropertyValue('--health')};
      });
      g.lives = max; App.updateHud(); App.renderer.draw(g, App.ui, 0); return result;
    });
    check(healthStates.map(s=>s.level).join(',') === 'healthy,warning,critical,critical' && healthStates[3].width === '0%' && healthStates.every(s=>s.text.startsWith(s.now+' / ')), 'Máu thành hiện số/tối đa, mức đầy và 3 màu đúng kể cả hết máu');
    await page.screenshot({ path: path.join(root, 'docs/siege-battle.png') });
    await page.evaluate(() => { App.game.lives=4;App.game.spawn('boss',0,3,App.game.paths[0].length-2*TILE);App.updateHud();App.renderer.draw(App.game,App.ui,0); });
    check(await page.locator('#siege-status').getAttribute('data-level') === '2', 'Báo động nguy cấp khi trùm áp sát/thành yếu');
    await page.screenshot({ path: path.join(root, 'docs/siege-danger.png') });
    await page.setViewportSize({width:390,height:844});
    await page.evaluate(() => { App.layout();App.renderer.draw(App.game,App.ui,0); });
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Điện thoại không tràn ngang');
    await page.screenshot({ path: path.join(root, 'docs/siege-mobile.png') });
    await page.setViewportSize({width:1440,height:900});
    await page.goto(url+'/?check=editor#editor');
    await page.waitForFunction(()=>!!App.editor);
    await page.evaluate(()=>{App.editor.pts=[[0,2],[6,2],[6,8],[12,8],[12,3],[18,3]];App.renderer.drawEditor(App.editor,null);});
    await page.screenshot({path:path.join(root,'docs/siege-editor.png')});
    await page.goto(url+'/dist/eyepalace.html');
    await page.waitForFunction(()=>typeof App!=='undefined'&&App.renderer&&App.renderer.lumi.naturalWidth>0);
    check(await page.evaluate(()=>App.renderer.lumi.src.startsWith('data:image/png')), 'Bản một file đã nhúng Lumi');
    await page.click('#btn-play');
    if(await page.locator('#overlay-tut').isVisible())await page.click('#btn-tut-skip');
    await page.click('#btn-wave');
    await page.waitForFunction(()=>App.game.enemies.length>=3);
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>{LOW_FX.on=true;for(let i=0;i<MAPS.length;i++){const g=new Game(i,'normal');g.lives=2;g.spawn('boss',0,1,g.paths[0].length-TILE);App.renderer.draw(g,{},0);}App.renderer.draw(App.game,App.ui,0);});
    check(await page.evaluate(()=>App.renderer.reducedMotion.matches), 'Mọi bản đồ vẽ được ở chế độ ít hiệu ứng/giảm chuyển động');
    await page.goto('file://' + path.join(root,'dist/eyepalace.html'));
    await page.waitForFunction(()=>typeof App!=='undefined'&&App.renderer&&App.renderer.lumi.naturalWidth>0);
    await page.click('#btn-play');
    if(await page.locator('#overlay-tut').isVisible())await page.click('#btn-tut-skip');
    await page.click('#btn-wave');
    await page.waitForFunction(()=>App.game.enemies.length>=3);
    check(true, 'Mở trực tiếp bản một file và chơi được, không cần server');
    check(errors.length===0,'Không có lỗi JavaScript/console: '+JSON.stringify(errors));
    console.log('Ảnh kiểm tra: docs/siege-{menu,battle,danger,mobile,editor}.png');
  } finally {
    if(browser)await browser.close();
    await new Promise(r=>server.close(r));
  }
})().catch(e=>{console.error(e);process.exitCode=1;});
