// Real browser regression checks. A controlled YouTube API fixture exercises
// races and failures; the final session separately uses the live YouTube API.
// Pass an installed Playwright Core ESM entry; no project dependency is needed.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const base = process.env.KAZE_QA_BASE_URL || 'http://localhost:4174/';
const output = path.resolve('artifacts/player-stability-2026-10-29');
await fs.mkdir(output, { recursive: true });
const report = { checks: [], errors: [], live: {} };
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const fixture = `
window.__ytTest = { instances: [], requests: [], playCalls: 0 };
window.YT = {
  PlayerState: { UNSTARTED:-1, ENDED:0, PLAYING:1, PAUSED:2, BUFFERING:3, CUED:5 },
  Player: class {
    constructor(id, options) {
      this.options=options; this.id=options.videoId; this.state=-1; this.rate=1; this.volume=100;
      this.iframe=document.createElement('iframe'); this.iframe.id=id; this.iframe.src='about:blank';
      document.getElementById(id).replaceWith(this.iframe); window.__ytTest.instances.push(this);
    }
    emit(name, data) { if(name==='onStateChange') this.state=data; this.options.events[name]?.({target:this,data}); }
    loadVideoById(id) { this.id=id; this.state=-1; window.__ytTest.requests.push(id); }
    playVideo() { window.__ytTest.playCalls++; this.emit('onStateChange',1); }
    pauseVideo() { this.emit('onStateChange',2); }
    getPlayerState() { return this.state; }
    getVideoUrl() { return 'https://www.youtube.com/watch?v='+this.id; }
    getIframe() { return this.iframe; }
    getCurrentTime() { return 0; }
    getDuration() { return 0; }
    getAvailablePlaybackRates() { return [.5,.75,1,1.25,1.5,2]; }
    getPlaybackRate() { return this.rate; }
    setPlaybackRate(rate) { this.rate=rate; this.emit('onPlaybackRateChange',rate); }
    setVolume(v) { this.volume=v; }
    getVolume() { return this.volume; }
    mute() { this.muted=true; }
    unMute() { this.muted=false; }
    isMuted() { return !!this.muted; }
    seekTo() {}
    destroy() { this.iframe.remove(); }
  }
};
window.onYouTubeIframeAPIReady();
`;
const check = (name, condition, detail = '') => { assert.ok(condition, name + ': ' + detail); report.checks.push(name); console.log('PASS ' + name); };
async function createPage(routeApi = true) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: 'zh-TW', timezoneId: 'Asia/Taipei', serviceWorkers: 'block' });
  const page = await context.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', e => report.errors.push(e.message));
  // External font delivery is irrelevant to the controlled state tests.
  if (routeApi) await page.route('https://www.youtube.com/iframe_api*', route => route.fulfill({ contentType: 'text/javascript', body: fixture }));
  return { context, page };
}
async function waitInstance(page, count = 1) { await page.waitForFunction(n => window.__ytTest?.instances.length === n, count); }
async function emit(page, name, data, index = -1) { await page.evaluate(({name,data,index}) => window.__ytTest.instances.at(index).emit(name,data), {name,data,index}); }
async function state(page) { return page.locator('#video-status').getAttribute('data-state'); }
async function verifyLivePlayback(page, videoId) {
  if (await page.locator('#video-start').isVisible()) await page.locator('#video-start').click();
  const frame = page.frames().find(f => /youtube\.com\/embed\//.test(f.url()));
  await frame.waitForFunction(id => {
    const link = document.querySelector('.ytp-title-link,.ytmVideoInfoVideoTitle');
    return link && new URL(link.href).searchParams.get('v') === id;
  }, videoId, { timeout: 12000 });
  await frame.waitForFunction(() => {
    const video = document.querySelector('video');
    return video && !video.paused && video.readyState >= 3 && video.currentTime > .5;
  }, null, { timeout: 15000 });
  const before = await frame.locator('video').evaluate(v => v.currentTime);
  await frame.waitForFunction(t => document.querySelector('video')?.currentTime > t + .6, before, { timeout: 6000 });
  check('Live video plays and its progress advances: ' + videoId, true);
}
try {
  const { context, page } = await createPage();
  let releaseLyrics;
  const lyricsGate = new Promise(resolve => { releaseLyrics = resolve; });
  await page.route(/\/assets\/song-lyrics-[^/]+\.js$/, async route => { await lyricsGate; await route.continue(); });
  const entry = new URL(base);
  if (entry.hostname === 'localhost') entry.hostname = '127.0.0.1';
  entry.search = '?playback-check=1';
  entry.hash = '#/song/CasketGirl';
  await page.goto(entry.href, { waitUntil: 'domcontentloaded' });
  if (entry.hostname === '127.0.0.1') {
    await page.waitForURL(url => url.hostname === 'localhost');
    const redirected = new URL(page.url());
    check('Loopback redirect preserves port, query and selected song', redirected.port === entry.port && redirected.search === entry.search && redirected.hash === entry.hash);
  }
  await page.evaluate(() => history.replaceState(null, '', location.pathname + location.hash));
  await waitInstance(page);
  check('Player opens before lyric bundle completes', await page.locator('iframe#yt-player').count() === 1);
  check('External listening link is ready before lyrics', (await page.locator('#watch-on-yt').getAttribute('href')).includes('gFOu5r-OuQ4'));
  check('Player state never presents lyric loading as video loading', !(await page.locator('#video-status-text').innerText()).includes('歌詞'));
  check('Iframe identifies the current origin', await page.evaluate(origin => __ytTest.instances[0].options.playerVars.origin === origin, new URL(base).origin));
  check('Iframe allows autoplay and sends an origin referrer', (await page.locator('#yt-player').getAttribute('allow')).includes('autoplay') && await page.locator('#yt-player').getAttribute('referrerpolicy') === 'strict-origin-when-cross-origin');
  await page.locator('#next-song').click(); await page.waitForURL('**/#/song/INeedUBack');
  await page.locator('#next-song').click(); await page.waitForURL('**/#/song/Hachiko');
  await emit(page, 'onReady');
  check('Ready plays only the latest queued song', await page.evaluate(() => __ytTest.requests.length === 1 && __ytTest.requests[0] === 'OodEsjZ88TQ'));
  check('Ready alone does not claim the video is playing', await state(page) === 'loading' && await page.locator('#video-status').isVisible());
  releaseLyrics();
  await page.locator('#song-sheet-list .song-sheet-item').first().waitFor({ state: 'attached' });
  check('Completing lyrics does not duplicate a video load', await page.evaluate(() => __ytTest.requests.length === 1));
  await emit(page, 'onStateChange', 3);
  check('Buffering has its own state', await state(page) === 'buffering');
  await emit(page, 'onAutoplayBlocked');
  check('Autoplay blocking offers a manual play action', await state(page) === 'blocked' && await page.locator('#video-start').isVisible());
  await page.locator('#video-start').click();
  check('Manual play clears the blocked message', await state(page) === 'playing' && await page.locator('#video-status').isHidden());
  await emit(page, 'onStateChange', 2);
  check('Pause clears obsolete loading text', await state(page) === 'paused' && await page.locator('#video-status').isHidden());
  await emit(page, 'onError', 150);
  check('Embedding failure has an actionable error without assuming the owner forbids every embed', /目前頁面/.test(await page.locator('#video-status-text').innerText()) && await page.locator('#video-retry').isHidden());
  check('Embedding restrictions offer the correct direct YouTube action', await page.locator('#video-open').isVisible() && (await page.locator('#video-open').getAttribute('href')).includes('OodEsjZ88TQ'));
  await emit(page, 'onError', 153);
  check('Missing client identity is distinguished from network failure', /來源/.test(await page.locator('#video-status-text').innerText()) && await page.locator('#video-retry').isVisible());
  await page.setViewportSize({ width: 320, height: 568 });
  check('Retry action remains inside the 320px video frame', await page.locator('#video-retry').evaluate(e => {
    const a = e.getBoundingClientRect(), b = e.closest('.video-frame').getBoundingClientRect();
    return a.height >= 44 && a.top >= b.top && a.bottom <= b.bottom;
  }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#video-retry').click(); await waitInstance(page, 2);
  await emit(page, 'onError', 100, 0); await emit(page, 'onReady', undefined, 0);
  check('Destroyed player callbacks cannot overwrite a retry', await state(page) === 'loading');
  await emit(page, 'onReady');
  check('Retry retains the selected song', await page.evaluate(() => __ytTest.requests.at(-1) === 'OodEsjZ88TQ'));
  await emit(page, 'onStateChange', 1);
  await page.locator('#playback-rate').selectOption('0.75');
  await page.locator('#next-song').click(); await page.waitForURL('**/#/song/LoveLikeThis');
  check('Normal song changes reuse the iframe', await page.evaluate(() => __ytTest.instances.length === 2));
  check('Changing songs clears the previous error', await state(page) === 'loading');
  await emit(page, 'onStateChange', 1);
  check('Playback rate is restored after the new video starts', await page.evaluate(() => __ytTest.instances.at(-1).rate === .75));
  await page.clock.install();
  await emit(page, 'onStateChange', 3); await page.clock.runFor(12020);
  check('Stalled video eventually offers retry', await state(page) === 'slow' && await page.locator('#video-retry').isVisible());
  await emit(page, 'onStateChange', 1);
  check('Late playback clears a timeout notice', await state(page) === 'playing' && await page.locator('#video-status').isHidden());
  await page.locator('#song-back-btn').click(); await page.waitForURL('**/#/guide');
  const loads = await page.evaluate(() => __ytTest.requests.length);
  await emit(page, 'onStateChange', 1); await emit(page, 'onReady');
  check('Leaving the song prevents late autoplay', await page.evaluate(n => __ytTest.requests.length === n && __ytTest.instances.at(-1).state === 2, loads));
  await page.locator('.song-row[data-id="Matsuri"]').click(); await page.waitForURL('**/#/song/Matsuri');
  await emit(page, 'onStateChange', 1);
  check('Reopening from guide reuses and plays the requested song', await page.evaluate(() => __ytTest.instances.length === 2 && __ytTest.requests.at(-1) === 'NwOvu-j_WjY') && await state(page) === 'playing');
  await context.setOffline(true);
  await page.waitForFunction(() => document.getElementById('video-status').dataset.state === 'offline');
  check('Offline state explains that video needs a connection', /離線/.test(await page.locator('#video-status-text').innerText()));
  await context.setOffline(false);
  await page.waitForFunction(() => document.getElementById('video-status').dataset.state === 'slow');
  check('Reconnection offers recovery without unexpected autoplay', await page.locator('#video-retry').isVisible() && await page.evaluate(() => __ytTest.instances.at(-1).state === 2));
  await context.close();

  const failed = await createPage(false);
  let attempts = 0;
  await failed.page.route('https://www.youtube.com/iframe_api*', route => ++attempts === 1 ? route.abort('failed') : route.fulfill({ contentType: 'text/javascript', body: fixture }));
  await failed.page.goto(base + '#/song/Prema', { waitUntil: 'domcontentloaded' });
  await failed.page.locator('#video-retry').waitFor();
  check('API script failure offers recovery', await state(failed.page) === 'error');
  await failed.page.locator('#video-retry').click(); await waitInstance(failed.page);
  await emit(failed.page, 'onReady');
  check('API failure can retry without reloading the page', attempts === 2 && await failed.page.evaluate(() => __ytTest.requests.at(-1) === 'UJgPpzZcxGU'));
  await failed.context.close();

  const stalled = await createPage(false);
  await stalled.page.clock.install();
  let releaseApi;
  const apiGate = new Promise(resolve => { releaseApi = resolve; });
  await stalled.page.route('https://www.youtube.com/iframe_api*', async route => { await apiGate; await route.abort('failed'); });
  await stalled.page.goto(base + '#/song/Prema', { waitUntil: 'domcontentloaded' });
  await stalled.page.clock.runFor(12020);
  check('Unresponsive API stops showing endless loading', await state(stalled.page) === 'error' && await stalled.page.locator('#video-retry').isVisible());
  releaseApi();
  await stalled.context.close();

  const reconnect = await createPage(false);
  await reconnect.page.clock.install();
  let reconnectAttempts = 0, releaseOldApi;
  const oldApiGate = new Promise(resolve => { releaseOldApi = resolve; });
  await reconnect.page.route('https://www.youtube.com/iframe_api*', async route => {
    if (++reconnectAttempts === 1) { await oldApiGate; await route.abort('failed'); }
    else await route.fulfill({ contentType: 'text/javascript', body: fixture });
  });
  await reconnect.page.goto(base + '#/song/Prema', { waitUntil: 'domcontentloaded' });
  await reconnect.context.setOffline(true);
  await reconnect.page.clock.runFor(12020);
  check('API timeout during offline preserves offline state', await state(reconnect.page) === 'offline');
  await reconnect.context.setOffline(false);
  await reconnect.page.locator('#video-retry').waitFor();
  await reconnect.page.locator('#video-retry').click(); await waitInstance(reconnect.page);
  await emit(reconnect.page, 'onReady'); await emit(reconnect.page, 'onStateChange', 1);
  releaseOldApi();
  check('Reconnection replaces a stalled API attempt', reconnectAttempts === 2 && await state(reconnect.page) === 'playing');
  await reconnect.context.close();

  const brokenLyrics = await createPage();
  await brokenLyrics.page.route(/\/assets\/song-lyrics-[^/]+\.js$/, route => route.abort('failed'));
  await brokenLyrics.page.goto(base + '#/song/Prema', { waitUntil: 'domcontentloaded' });
  await waitInstance(brokenLyrics.page); await emit(brokenLyrics.page, 'onReady'); await emit(brokenLyrics.page, 'onStateChange', 1);
  await brokenLyrics.page.locator('.lyrics-load-error').waitFor();
  check('Lyric delivery failure does not replace the video state', await state(brokenLyrics.page) === 'playing' && await brokenLyrics.page.locator('#video-status').isHidden());
  await brokenLyrics.context.close();

  // Live integration evidence: no YouTube response is replaced in this session.
  const live = await createPage(false);
  await live.page.setViewportSize({ width: 1440, height: 1000 });
  await live.page.goto(base + '#/song/CasketGirl', { waitUntil: 'domcontentloaded' });
  await live.page.waitForFunction(() => ['error','blocked','playing','slow'].includes(document.getElementById('video-status')?.dataset.state), null, { timeout: 20000 });
  await verifyLivePlayback(live.page, 'gFOu5r-OuQ4');
  report.live.initialState = await state(live.page);
  report.live.initialMessage = await live.page.locator('#video-status-text').textContent();
  check('Live light-theme video status uses readable text on black', await live.page.locator('#video-status').evaluate(e => getComputedStyle(e).color === 'rgb(231, 231, 235)'));
  await live.page.screenshot({ path: path.join(output, '01-live-desktop.png'), animations: 'disabled' });
  await live.page.locator('#next-song').click(); await live.page.waitForURL('**/#/song/INeedUBack');
  check('Live integration retains one iframe on song change', await live.page.locator('iframe#yt-player').count() === 1);
  await live.page.waitForFunction(() => ['error','blocked','playing','slow'].includes(document.getElementById('video-status')?.dataset.state), null, { timeout: 20000 });
  await verifyLivePlayback(live.page, 'ud0lMojStCs');
  await live.page.setViewportSize({ width: 320, height: 568 });
  check('Live fallback link follows the newly selected song', (await live.page.locator('#video-open').getAttribute('href')).includes('ud0lMojStCs'));
  await live.page.screenshot({ path: path.join(output, '02-live-mobile.png'), animations: 'disabled' });
  const layout = await live.page.locator('.lyrics-note').evaluate(e => {
    const range = document.createRange(); range.selectNodeContents(e.querySelector('.lyrics-note-copy'));
    const a = range.getBoundingClientRect(), b = e.querySelector('.watch-on-yt').getBoundingClientRect();
    return a.right <= b.left || a.bottom <= b.top || b.bottom <= a.top;
  });
  check('320px status copy does not overlap the official video link', layout);
  check('Live page has no horizontal overflow', await live.page.evaluate(() => document.documentElement.scrollWidth === innerWidth));
  report.live.finalState = await state(live.page);
  report.live.finalMessage = await live.page.locator('#video-status-text').textContent();
  const opened = live.context.waitForEvent('page');
  const openLink = await live.page.locator('#video-open').isVisible() ? live.page.locator('#video-open') : live.page.locator('#watch-on-yt');
  await openLink.click();
  const popup = await opened;
  await popup.waitForURL(url => url.hostname === 'www.youtube.com' && url.searchParams.get('v') === 'ud0lMojStCs', { timeout: 12000 });
  check('Official YouTube action opens the correct song in a new tab', true);
  await popup.close();
  check('No browser JavaScript exceptions', report.errors.length === 0, JSON.stringify(report.errors));
  await live.context.close();
} catch (error) {
  report.failure = { message: error.message, stack: error.stack };
  console.error(error);
} finally {
  await browser.close();
  await fs.writeFile(path.join(output, 'results.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ checks: report.checks.length, errors: report.errors, live: report.live, failure: report.failure }, null, 2));
  process.exitCode = report.failure || report.errors.length ? 1 : 0;
}
