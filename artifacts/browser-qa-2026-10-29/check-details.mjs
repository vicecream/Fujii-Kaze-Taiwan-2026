import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const output = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.KAZE_QA_BASE_URL || 'http://127.0.0.1:4174/';
const result = { checks: [], observations: [], screenshots: [], errors: [], failedRequests: [] };
const check = (name, pass, detail = '') => { result.checks.push({ name, pass: !!pass, detail }); console.log(`${pass ? 'PASS' : 'FAIL'} ${name}: ${detail}`); };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'zh-TW', timezoneId: 'Asia/Taipei', colorScheme: 'light', deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(10000);
page.on('pageerror', e => result.errors.push(e.message));
page.on('requestfailed', r => { const u = new URL(r.url()); result.failedRequests.push({ url: u.origin + u.pathname, error: r.failure()?.errorText }); });
async function capture(name) {
  await page.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
  result.screenshots.push({ name, viewport: page.viewportSize() });
}
function contrast(fg, bg) {
  const luminance = color => color.match(/[\d.]+/g).slice(0, 3).map(Number).map(v => { v /= 255; return v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4; }).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0);
  const a = luminance(fg), b = luminance(bg);
  return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
}
try {
  await page.goto(base + '#/song/Matsuri', { waitUntil: 'domcontentloaded' });
  await page.locator('#watch-on-yt[href^="https://www.youtube.com/watch"]').waitFor();
  await page.waitForFunction(() => { const e = document.querySelector('#video-status'); return e && (e.hidden || !/正在載入/.test(e.textContent)); }, { timeout: 15000 });
  await capture('11-mobile-japanese-player');
  const light = await page.locator('#video-status').evaluate(e => { const s = getComputedStyle(e); return { hidden: e.hidden, color: s.color, background: s.backgroundColor, font: s.fontSize, text: e.textContent }; });
  const ratio = contrast(light.color, light.background);
  check('Light video status contrast >= 4.5:1', ratio >= 4.5, JSON.stringify({ ...light, ratio: Number(ratio.toFixed(2)) }));
  const target = await page.locator('.karaoke-source-popover summary').boundingBox();
  result.observations.push({ name: 'Sync info target', size: target });
  check('Sync info target meets project 40px size', target.width >= 40 && target.height >= 40, JSON.stringify(target));
  await page.locator('#song-picker-btn').click();
  await page.keyboard.press('Shift+Tab');
  check('Shift+Tab wraps within song dialog', await page.locator('.song-sheet-panel').evaluate(e => e.contains(document.activeElement)));
  await page.keyboard.press('Tab');
  check('Tab wraps back to song dialog close', await page.locator('.song-sheet-close').evaluate(e => document.activeElement === e));
  const focus = await page.locator('.song-sheet-close').evaluate(e => ({ outline: getComputedStyle(e).outlineStyle, width: getComputedStyle(e).outlineWidth }));
  check('Keyboard focus indicator is visible', focus.outline !== 'none' && parseFloat(focus.width) >= 2, JSON.stringify(focus));
  await capture('17-mobile-keyboard-focus');
  await page.keyboard.press('Escape');
  await page.locator('#playback-rate').selectOption('0.75');
  check('Playback speed selection updates accessible label', (await page.locator('#playback-rate').getAttribute('aria-label')).includes('0.75'));
  await page.locator('#next-song').click();
  await page.waitForURL('**/#/song/WorkinHard');
  check('Playback speed selection survives song change', await page.locator('#playback-rate').inputValue() === '0.75');
  await page.locator('#prev-song').click();
  await page.waitForURL('**/#/song/Matsuri');
  await page.locator('#song-view [data-theme-toggle]').click();
  await page.locator('#video-status').filter({ hasText: /無法播放|影片連線延遲/ }).waitFor();
  await capture('13-mobile-japanese-dark');
  const dark = await page.locator('#video-status').evaluate(e => ({ color: getComputedStyle(e).color, background: getComputedStyle(e).backgroundColor }));
  check('Dark video status contrast >= 4.5:1', contrast(dark.color, dark.background) >= 4.5, String(contrast(dark.color, dark.background).toFixed(2)));
  await page.setViewportSize({ width: 320, height: 568 });
  await page.waitForTimeout(300);
  const note = await page.locator('.lyrics-note').evaluate(e => {
    const copy = e.querySelector('.lyrics-note-copy');
    const link = e.querySelector('.watch-on-yt');
    const range = document.createRange(); range.selectNodeContents(copy);
    const text = range.getBoundingClientRect(), anchor = link.getBoundingClientRect();
    return { textRight: text.right, textTop: text.top, textBottom: text.bottom, linkLeft: anchor.left, linkTop: anchor.top, linkBottom: anchor.bottom, linkRight: anchor.right, text: copy.textContent, gap: anchor.left - text.right };
  });
  check('320px note text and YouTube link do not overlap', note.textRight <= note.linkLeft || note.textBottom <= note.linkTop || note.linkBottom <= note.textTop, JSON.stringify(note));
  await capture('14-small-mobile-player');
  const compact = await page.locator('#song-picker-btn').evaluate(e => ({ width: e.getBoundingClientRect().width, text: e.innerText, visibleTitleWidth: e.querySelector('#song-picker-title').getBoundingClientRect().width }));
  result.observations.push({ name: '320px song title', ...compact });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, { timeout: 12000 });
  check('Production service worker controls page', true);
  result.cacheBeforeOffline = await page.evaluate(async () => {
    const entries = [];
    for (const name of await caches.keys()) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        const response = await cache.match(request);
        entries.push({ name, url: request.url, status: response.status, type: response.headers.get('content-type') });
      }
    }
    return entries;
  });
  await context.setOffline(true);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.locator('#song-content-status').waitFor();
  check('Cached song shell opens offline', (await page.locator('#song-content-status').innerText()).includes('整理中'));
  await page.locator('#app-banner-msg').filter({ hasText: '離線' }).waitFor();
  const offlineMessage = await page.locator('#app-banner-msg').innerText();
  check('Offline banner explains video requires network', /離線/.test(offlineMessage) && /無法播放影片/.test(offlineMessage), offlineMessage);
  await capture('18-mobile-offline');
  await page.locator('#song-back-btn').click();
  await page.locator('.song-row').first().waitFor();
  check('All 19 songs are navigable offline', await page.locator('.song-row').count() === 19);
  await context.setOffline(false);
} catch (error) {
  result.fatal = { message: error.message, stack: error.stack };
  result.failureState = await page.evaluate(() => ({ url: location.href, controller: navigator.serviceWorker.controller?.scriptURL, scripts: [...document.scripts].map(e => e.src).filter(Boolean), stylesheets: [...document.querySelectorAll('link[rel="stylesheet"]')].map(e => e.href), text: document.body.innerText })).catch(() => null);
  await capture('details-failure-state').catch(() => {});
  console.error(error.message);
} finally {
  await fs.writeFile(path.join(output, 'details.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
  console.log(JSON.stringify({ checks: result.checks.length, failed: result.checks.filter(c => !c.pass), errors: result.errors, fatal: result.fatal }, null, 2));
  process.exitCode = result.fatal || result.errors.length || result.checks.some(c => !c.pass) ? 1 : 0;
}
