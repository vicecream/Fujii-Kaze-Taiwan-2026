import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Run with an existing Playwright ESM entry; no project dependency is required.
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const { SONGS } = await import('../../src/song-metadata.js');
const output = path.dirname(fileURLToPath(import.meta.url));
const base = process.env.KAZE_QA_BASE_URL || 'http://127.0.0.1:4174/';
const result = { browser: '', checks: [], screenshots: [], pageErrors: [], consoleErrors: [], failedRequests: [], observations: [] };
const check = (name, pass, detail = '') => {
  result.checks.push({ name, pass: !!pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}${detail ? ': ' + detail : ''}`);
};
const browser = await chromium.launch({ channel: 'msedge', headless: true });
result.browser = browser.version();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-TW', timezoneId: 'Asia/Taipei', colorScheme: 'light', deviceScaleFactor: 1 });
const page = await context.newPage();
page.setDefaultTimeout(7000);
function monitor(p) {
  p.on('pageerror', e => result.pageErrors.push({ url: p.url(), message: e.message }));
  p.on('console', m => { if (m.type() === 'error') result.consoleErrors.push({ url: p.url(), message: m.text() }); });
  p.on('requestfailed', r => { const u = new URL(r.url()); result.failedRequests.push({ url: u.origin + u.pathname, error: r.failure()?.errorText }); });
}
monitor(page);
async function capture(p, name) {
  await p.waitForTimeout(300);
  await p.screenshot({ path: path.join(output, name + '.png'), fullPage: true, animations: 'disabled' });
  result.screenshots.push({ name, viewport: p.viewportSize(), url: p.url() });
}
async function geometry(p, name) {
  const values = await p.evaluate(() => ({ width: innerWidth, scrollWidth: document.documentElement.scrollWidth, overflow: [...document.querySelectorAll('button, input, select, .song-content-status')].filter(e => e.getClientRects().length && !e.closest('[inert]')).map(e => ({ id: e.id, label: (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 50), x: e.getBoundingClientRect().x, right: e.getBoundingClientRect().right, width: e.getBoundingClientRect().width, height: e.getBoundingClientRect().height })).filter(r => r.x < -1 || r.right > innerWidth + 1) }));
  check(name + ' has no horizontal page overflow', values.scrollWidth <= values.width + 1, JSON.stringify(values));
}
async function route(p, hash) {
  await p.goto(base + hash, { waitUntil: 'domcontentloaded' });
  if (hash.startsWith('#/song/')) await songReady(p);
  else await p.locator('#app').waitFor({ state: 'visible' });
}
async function songReady(p) {
  await p.locator('#watch-on-yt[href^="https://www.youtube.com/watch"]').waitFor();
  await p.locator('#song-sheet-list .song-sheet-item').first().waitFor({ state: 'attached' });
}
try {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.locator('#guide-btn').waitFor();
  check('Home artist and preparation entry', (await page.locator('h1').innerText()).includes('藤井風') && (await page.locator('#guide-btn').innerText()).includes('19'));
  check('Collapsed information panels are inert', await page.locator('.info-panel').evaluateAll(items => items.every(e => e.inert && e.getAttribute('aria-hidden') === 'true')));
  await capture(page, '01-desktop-home');
  await geometry(page, 'Desktop home');
  await page.locator('#seat-toggle').click();
  await page.locator('.seat-map-image').waitFor();
  await page.locator('.seat-map-image').evaluate(e => e.decode());
  check('Seat map loads on expansion', await page.locator('#seat-panel').evaluate(e => !e.inert && e.getAttribute('aria-hidden') === 'false'));
  await capture(page, '02-desktop-seat-map');
  await page.locator('#seat-toggle').click();
  await page.locator('#guide-btn').click();
  await page.waitForURL('**/#/guide');
  await page.locator('.song-row').first().waitFor();
  check('Guide has 19 songs in two albums', await page.locator('.song-row').count() === 19 && await page.locator('.song-album-label').count() === 2);
  check('Search has persistent label', await page.locator('label[for="song-search-input"]').isVisible());
  await capture(page, '03-desktop-guide');
  await page.locator('#song-search-input').fill('Matsuri');
  check('Romaji search finds まつり', await page.locator('.song-row:visible').count() === 1 && (await page.locator('.song-row:visible').innerText()).includes('まつり'));
  await page.locator('#song-search-input').fill('no-such-song-qa');
  check('Search empty state is visible', await page.locator('#song-empty').isVisible());
  await page.locator('#song-search-clear').click();
  await page.locator('#sort-title').click();
  check('Title sort exposes pressed state', await page.locator('#sort-title').getAttribute('aria-pressed') === 'true');
  await page.locator('[data-sort="default"]').click();
  await page.locator('.song-row[data-id="CasketGirl"]').click();
  await songReady(page);
  check('English hides Japanese readings', await page.locator('#reading-btn').isHidden());
  check('Pending content disables unavailable lyric controls', await page.locator('#japanese-toggle, #chinese-toggle, #karaoke-btn, #autoscroll-btn').evaluateAll(items => items.length === 4 && items.every(e => e.disabled)));
  check('Unsourced chant controls are hidden', await page.locator('#chant-btn').isHidden() && await page.locator('.lyrics-legend').isHidden());
  check('Pending original, translation and timing are explicit', /原文歌詞整理中.*繁中翻譯整理中[\s\S]*同步時間整理中/.test(await page.locator('#song-content-status').innerText()));
  await page.waitForTimeout(8500);
  result.observations.push({ step: 'English player', text: await page.locator('#song-view').innerText(), videoStatus: await page.locator('#video-status').textContent(), rateDisabled: await page.locator('#playback-rate').isDisabled(), iframeCount: await page.locator('iframe').count() });
  await capture(page, '04-desktop-english-player');
  await geometry(page, 'Desktop player');
  await page.locator('#next-song').click();
  await page.waitForURL('**/#/song/INeedUBack');
  await page.locator('#prev-song').click();
  await page.waitForURL('**/#/song/CasketGirl');
  check('Previous and next song navigation', true);
  await page.locator('#song-picker-btn').click();
  check('Song picker moves focus inside dialog', await page.locator('.song-sheet-panel').evaluate(e => e.contains(document.activeElement)));
  await page.locator('#sheet-search-input').fill('Matsuri');
  check('Song picker search filters to まつり', await page.locator('.song-sheet-item:visible').count() === 1);
  await capture(page, '05-desktop-song-picker');
  await page.keyboard.press('Escape');
  check('Escape closes picker and restores focus', await page.locator('#song-sheet').getAttribute('aria-hidden') === 'true' && await page.locator('#song-picker-btn').evaluate(e => document.activeElement === e));
  await page.locator('#song-picker-btn').click();
  check('Song picker clears previous search', await page.locator('#sheet-search-input').inputValue() === '' && await page.locator('.song-sheet-item:visible').count() === 19);
  await page.locator('#sheet-search-input').fill('Matsuri');
  await page.locator('.song-sheet-item:visible').click();
  await page.waitForURL('**/#/song/Matsuri');
  await songReady(page);
  check('Japanese shows disabled pending reading control', await page.locator('#reading-btn').isVisible() && await page.locator('#reading-btn').isDisabled());
  await page.locator('#song-view [data-theme-toggle]').click();
  check('Theme switches to dark', await page.locator('html').getAttribute('data-theme') === 'dark');
  await capture(page, '06-desktop-japanese-dark');
  await page.locator('#venue-btn').click();
  check('Compact mode activates', await page.locator('#song-page').evaluate(e => e.classList.contains('venue')));
  await capture(page, '07-desktop-compact');
  await page.locator('#venue-btn').click();
  for (const song of SONGS) {
    await route(page, '#/song/' + song.id);
    check('Catalog route ' + song.id, (await page.locator('#watch-on-yt').getAttribute('href')) === song.videoSourceUrl && await page.locator('.lyric-line').count() === 0 && (await page.locator('#song-picker-title').innerText()).length > 0);
  }
  await route(page, '#/setlist');
  check('Setlist remains pending without spoiler gate', (await page.locator('#app').innerText()).includes('高雄場歌單待確認') && await page.locator('.spoiler-hero,.spoiler-choice,.set-order-confirm').count() === 0);
  await capture(page, '08-desktop-pending-setlist');
  await page.goto(base + '#/song/KaijuNoHanauta', { waitUntil: 'domcontentloaded' });
  check('Legacy link explains guide conversion', (await page.locator('#app').innerText()).includes('本指南已轉換'));

  const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'zh-TW', timezoneId: 'Asia/Taipei', colorScheme: 'light' });
  const mobile = await phone.newPage();
  mobile.setDefaultTimeout(7000);
  monitor(mobile);
  await mobile.goto(base, { waitUntil: 'domcontentloaded' });
  await mobile.locator('#guide-btn').waitFor();
  await capture(mobile, '09-mobile-home');
  await geometry(mobile, '390px home');
  await mobile.locator('#guide-btn').click();
  await mobile.locator('.song-row').first().waitFor();
  await capture(mobile, '10-mobile-guide');
  await geometry(mobile, '390px guide');
  check('Mobile search text is at least 16px', await mobile.locator('#song-search-input').evaluate(e => parseFloat(getComputedStyle(e).fontSize) >= 16));
  await mobile.locator('#song-search-input').fill('Matsuri');
  await mobile.locator('.song-row:visible').click();
  await songReady(mobile);
  await capture(mobile, '11-mobile-japanese-player');
  await geometry(mobile, '390px Japanese player');
  const playerGeometry = await mobile.locator('#song-page').evaluate(e => {
    const status = e.querySelector('#song-content-status').getBoundingClientRect();
    const bar = e.querySelector('.player-controls').getBoundingClientRect();
    return { status: { top: status.top, bottom: status.bottom }, bar: { top: bar.top, bottom: bar.bottom }, height: innerHeight };
  });
  check('Mobile pending message clears control bar', playerGeometry.status.bottom <= playerGeometry.bar.top + 1, JSON.stringify(playerGeometry));
  await mobile.locator('#song-picker-btn').click();
  await capture(mobile, '12-mobile-song-picker');
  await geometry(mobile, '390px song picker');
  await mobile.keyboard.press('Escape');
  await mobile.locator('#song-view [data-theme-toggle]').click();
  await capture(mobile, '13-mobile-japanese-dark');
  await mobile.reload({ waitUntil: 'domcontentloaded' });
  await songReady(mobile);
  check('Theme survives reload', await mobile.locator('html').getAttribute('data-theme') === 'dark');
  await mobile.setViewportSize({ width: 320, height: 568 });
  await capture(mobile, '14-small-mobile-player');
  await geometry(mobile, '320px Japanese player');
  await mobile.setViewportSize({ width: 844, height: 390 });
  await capture(mobile, '15-mobile-landscape-player');
  await geometry(mobile, 'Landscape Japanese player');
  await mobile.setViewportSize({ width: 768, height: 1024 });
  await capture(mobile, '16-tablet-player');
  await geometry(mobile, '768px tablet player');
  await phone.close();
  check('No application JavaScript exceptions', result.pageErrors.length === 0, JSON.stringify(result.pageErrors));
} catch (error) {
  result.fatal = { message: error.message, stack: error.stack };
  await capture(page, 'failure-state').catch(() => {});
  console.error(error);
} finally {
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(result, null, 2) + '\n');
  await browser.close();
  console.log(JSON.stringify({ browser: result.browser, checks: result.checks.length, failed: result.checks.filter(c => !c.pass), screenshots: result.screenshots.length, pageErrors: result.pageErrors, fatal: result.fatal }, null, 2));
  process.exitCode = result.fatal || result.pageErrors.length || result.checks.some(c => !c.pass) ? 1 : 0;
}
