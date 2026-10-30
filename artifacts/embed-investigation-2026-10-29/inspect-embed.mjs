import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const out = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'zh-TW', timezoneId: 'Asia/Taipei', serviceWorkers: 'block' });
const findings = [];
for (const [label, url] of [
  ['guide', 'http://127.0.0.1:4174/#/song/MichiTeyuKu'],
  ['marumaru', 'https://www.marumaru-x.com/japanese-song/play-wzrv48xlr3'],
]) {
  const page = await context.newPage();
  const record = { label, url, playerResponses: [], failures: [] };
  page.on('response', async response => {
    if (!response.url().includes('/youtubei/v1/player')) return;
    try {
      const body = await response.json();
      record.playerResponses.push({ status: response.status(), playability: { status:body.playabilityStatus?.status, reason:body.playabilityStatus?.reason }, videoId: body.videoDetails?.videoId, title: body.videoDetails?.title });
    } catch {}
  });
  page.on('requestfailed', request => {
    const u = new URL(request.url());
    if (request.isNavigationRequest() || /iframe_api|\/embed\//.test(u.pathname)) record.failures.push({ url: u.origin + u.pathname, error: request.failure()?.errorText });
  });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await page.waitForTimeout(6000);
    record.title = await page.title();
    record.iframes = await page.locator('iframe').evaluateAll(items => items.filter(e=>/^https:\/\/www\.youtube\.com\/embed\//.test(e.src)).map(e => ({ src:e.src, allow:e.getAttribute('allow'), referrer:e.referrerPolicy, title:e.title })));
    record.scripts = await page.locator('script[src]').evaluateAll(items => items.map(e => e.src).filter(s => /^https:\/\/(www\.marumaru-x\.com\/|www\.youtube\.com\/)/.test(s)));
    const html = await page.content();
    record.configSnippets = [...html.matchAll(/.{0,100}(?:videoId|youtube_id|youtubeId|youtu\.be\/|youtube\.com\/embed\/|YT\.Player).{0,170}/g)].map(m => m[0]).slice(0, 10);
    if(label === 'guide') record.visibleState = await page.locator('#video-status').innerText();
    record.frames = [];
    for (const frame of page.frames().filter(f => /youtube(?:-nocookie)?\.com\/embed\//.test(f.url()))) {
      record.frames.push({ url:frame.url(), text:(await frame.locator('body').innerText()).slice(0, 2000) });
    }
    await page.screenshot({ path:path.join(out, label + '.png'), animations:'disabled' });
    if (label === 'marumaru') await fs.writeFile(path.join(os.tmpdir(), 'kaze-marumaru-embed-inspection.html'), html);
  } catch (error) { record.error = error.message; }
  findings.push(record);
  console.log(JSON.stringify(record, null, 2));
  await page.close();
}
await fs.writeFile(path.join(out, 'comparison.json'), JSON.stringify(findings, null, 2) + '\n');
await browser.close();
