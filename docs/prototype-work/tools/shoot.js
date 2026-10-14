// 프로토타입 흐름 자동 클릭 + 스크린샷 (검증용, 스크래치 전용)
// 사용: node shoot.js <page.html> <steps.json> [light|dark] [width]
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const [, , pageName, stepsFile, scheme = 'light', width = '1440'] = process.argv;
const OUT = path.join(__dirname, '..', 'shots');
fs.mkdirSync(OUT, { recursive: true });
const steps = JSON.parse(fs.readFileSync(stepsFile, 'utf8'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// Chrome 위치: CHROME_PATH 환경변수가 있으면 그것, 없으면 OS별 기본 설치 경로 중 있는 것
const CHROME = process.env.CHROME_PATH || [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  path.join(process.env.LOCALAPPDATA || '', 'Google/Chrome/Application/chrome.exe'),
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
].find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Chrome을 찾지 못했어요. CHROME_PATH 환경변수로 chrome 실행 파일 경로를 지정하세요.'); process.exit(1); }

(async () => {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--hide-scrollbars', '--no-first-run'],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: Number(width), height: 1100, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`); });
  await page.goto(`http://127.0.0.1:8765/${pageName}`, { waitUntil: 'networkidle0' });
  await sleep(400);

  async function closeDialogs() {
    for (let i = 0; i < 6; i++) {
      const did = await page.evaluate(() => {
        const d = document.querySelector('dialog[open]');
        if (!d) return false;
        const yes = d.querySelector('button[value="yes"]') || d.querySelector('.btn-ink') || d.querySelector('button');
        yes.click();
        return true;
      });
      if (!did) return;
      await sleep(150);
    }
  }
  let n = 0;
  for (const st of steps) {
    n += 1;
    try {
      const domClick = (sel) => page.evaluate((x) => { const el = document.querySelector(x); if (!el) throw new Error('없음 ' + x); el.click(); }, sel);
      if (st.role) await domClick(`[data-role="${st.role}"]`);
      else if (st.act) {
        const sel = `#gc-device [data-act="${st.act}"]${st.attr ? `[${st.attr}]` : ''}`;
        const ok = await page.evaluate((s, idx) => { const els = document.querySelectorAll(s); const el = els[idx || 0]; if (!el) return false; el.scrollIntoView({ block: 'center' }); return true; }, sel, st.idx || 0);
        if (!ok) { errors.push(`step ${n}: 없음 ${sel}`); continue; }
        if (st.at) {
          const box = await (await page.$$(sel))[st.idx || 0].boundingBox();
          await page.mouse.click(box.x + box.width * st.at[0], box.y + box.height * st.at[1]);
        } else {
          await page.evaluate((s, idx) => document.querySelectorAll(s)[idx || 0].click(), sel, st.idx || 0);
        }
      } else if (st.check) await page.evaluate((k) => { const el = document.querySelector(`#gc-device [data-k="${k}"]`); el.click(); }, st.check);
      else if (st.type) { await page.focus(st.type.sel); await page.keyboard.type(st.type.text); }
      else if (st.adv) await domClick(`[data-adv="${st.adv}"]`);
      else if (st.click) await domClick(st.click);
      else if (st.eval) { const r = await page.evaluate(st.eval); if (r !== undefined) console.log(`eval ${n}:`, JSON.stringify(r)); }
      else if (st.wait) await sleep(st.wait);
      await sleep(st.after || 250);
      if (!st.keepDialog) await closeDialogs();
      if (st.shot) {
        await sleep(200);
        const file = path.join(OUT, `${st.shot}.png`);
        if (st.el) { const h = await page.$(st.el); await h.screenshot({ path: file }); }
        else await page.screenshot({ path: file, fullPage: !!st.full });
        console.log('shot', file);
      }
    } catch (e) { errors.push(`step ${n} ${JSON.stringify(st)}: ${e.message}`); }
  }
  const summary = await page.evaluate(() => ({
    turn: (document.querySelector('#gc-turn .turn-what, #gc-turn .turn-done') || {}).textContent,
    strips: Array.from(document.querySelectorAll('.chip.is-now, .chip.is-branch-now')).map((c) => c.title),
    log: Array.from(document.querySelectorAll('#gc-log li')).slice(0, 40).map((l) => l.textContent.replace(/\s+/g, ' ').trim()),
    hscroll: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  console.log('TURN:', summary.turn);
  console.log('NOW:', summary.strips.join(' | '));
  console.log('HSCROLL:', summary.hscroll);
  console.log('LOG:\n  ' + summary.log.reverse().join('\n  '));
  console.log(errors.length ? 'ERRORS:\n  ' + errors.join('\n  ') : 'ERRORS: none');
  await browser.close();
})();
