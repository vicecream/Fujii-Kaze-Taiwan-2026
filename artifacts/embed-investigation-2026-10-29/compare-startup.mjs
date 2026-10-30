import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const out = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel:'msedge', headless:true });
const records = [];
const videoId = 'ptiK8U4WlSc';
for (const mode of ['manual-play', 'ready-load', 'manual-load', 'ready-play', 'marumaru']) {
  const context = await browser.newContext({ viewport:{width:1440,height:1000}, locale:'zh-TW', serviceWorkers:'block' });
  const page = await context.newPage();
  const record = { mode, responses:[] };
  page.on('response', async response => {
    if (!response.url().includes('/youtubei/v1/player')) return;
    try { const b = await response.json(); record.responses.push({ status:b.playabilityStatus?.status, reason:b.playabilityStatus?.reason, playableInEmbed:b.playabilityStatus?.playableInEmbed, id:b.videoDetails?.videoId }); } catch {}
  });
  try {
    if (mode === 'marumaru') {
      await page.goto('https://www.marumaru-x.com/japanese-song/play-wzrv48xlr3',{waitUntil:'domcontentloaded',timeout:25000});
      await page.locator('.vjs-big-play-button').waitFor({timeout:10000});
      record.sourceConfig = await page.evaluate(async () => {
        const js = await (await fetch('/js/mr-jp-song-detail.js?v=20260429-2')).text();
        return [...js.matchAll(/.{0,80}(?:YT\.Player|loadVideoById|cueVideoById|playerVars|onReady|playsinline|origin|youtube\.com|videojs\().{0,150}/g)].map(m=>m[0]).slice(0,20);
      });
      await page.locator('.vjs-big-play-button').click();
    } else {
      await page.route('http://127.0.0.1:4174/__embed_probe__*', route => route.fulfill({contentType:'text/html',body:`<!doctype html><html><meta charset="utf-8"><body><button id="start">Play</button><div id="player"></div><script>
window.events=[];window.onYouTubeIframeAPIReady=()=>{ window.p=new YT.Player('player',{width:640,height:360,videoId:'${videoId}',playerVars:{origin:location.origin,playsinline:1,autoplay:0},events:{onReady:()=>{window.isReady=true;${mode==='ready-load' ? `p.loadVideoById('${videoId}')` : mode==='ready-play' ? 'p.playVideo()' : ''}},onStateChange:e=>events.push({state:e.data}),onError:e=>events.push({error:e.data}),onAutoplayBlocked:()=>events.push({blocked:true})}});};
document.getElementById('start').onclick=()=>{${mode==='manual-load' ? `p.loadVideoById('${videoId}')` : 'p.playVideo()'}};
</script><script src="https://www.youtube.com/iframe_api"></script></body></html>`}));
      await page.goto('http://127.0.0.1:4174/__embed_probe__?mode='+mode,{waitUntil:'domcontentloaded'});
      await page.waitForFunction(()=>window.isReady,{timeout:12000});
      if (mode.startsWith('manual')) await page.locator('#start').click();
    }
    await page.waitForTimeout(5000);
    if (mode !== 'marumaru') record.events = await page.evaluate(()=>window.events);
    const frame = page.frames().find(f=>/youtube\.com\/embed\//.test(f.url()));
    if (frame) {
      record.frameText = (await frame.locator('body').innerText()).slice(0,800);
      record.video = await frame.locator('video').evaluateAll(items=>items.map(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,readyState:v.readyState,error:v.error?.code})));
    }
    await page.screenshot({path:path.join(out,mode+'.png'),animations:'disabled'});
  } catch(error) { record.error=error.message; }
  console.log(JSON.stringify(record,null,2));
  records.push(record);
  await context.close();
}
await fs.writeFile(path.join(out,'startup-comparison.json'),JSON.stringify(records,null,2)+'\n');
await browser.close();
