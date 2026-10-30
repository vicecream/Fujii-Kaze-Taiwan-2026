import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const out = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({channel:'msedge',headless:true});
const results=[];
// Reserved .test origins are fulfilled locally, solely to isolate origin and
// protocol behavior. YouTube requests and responses are never substituted.
for (const origin of ['http://127.0.0.1:4174','http://localhost:4174','http://guide.test','https://guide.test']) {
  const context=await browser.newContext({viewport:{width:1280,height:900},serviceWorkers:'block'});
  const page=await context.newPage();
  const record={origin,requests:[],responses:[]};
  page.on('request',async r=>{if(/youtube\.com\/embed\//.test(r.url()))record.requests.push({referrer:await r.headerValue('referer')});});
  page.on('response',async r=>{if(!r.url().includes('/youtubei/v1/player'))return;try{const b=await r.json();record.responses.push({status:b.playabilityStatus?.status,reason:b.playabilityStatus?.reason});}catch{}});
  await page.route(origin+'/**',route=>route.fulfill({contentType:'text/html',body:`<!doctype html><meta charset="utf-8"><button id="start">Play</button><div id="player"></div><script>window.events=[];window.onYouTubeIframeAPIReady=()=>{window.p=new YT.Player('player',{width:640,height:360,videoId:'ptiK8U4WlSc',playerVars:{origin:location.origin,playsinline:1},events:{onReady:()=>window.ready=true,onStateChange:e=>events.push({state:e.data}),onError:e=>events.push({error:e.data}),onAutoplayBlocked:()=>events.push({blocked:true})}})};document.getElementById('start').onclick=()=>p.playVideo();</script><script src="https://www.youtube.com/iframe_api"></script>`}));
  try {
    await page.goto(origin+'/embed-test',{waitUntil:'domcontentloaded'});
    await page.waitForFunction(()=>window.ready,null,{timeout:12000});
    await page.locator('#start').click();
    await page.waitForTimeout(5000);
    record.events=await page.evaluate(()=>window.events);
    const frame=page.frames().find(f=>/youtube\.com\/embed\//.test(f.url()));
    record.text=(await frame.locator('body').innerText()).slice(0,500);
    record.media=await frame.locator('video').evaluateAll(v=>v.map(e=>({time:e.currentTime,paused:e.paused,readyState:e.readyState,duration:e.duration})));
  }catch(error){record.error=error.message;}
  console.log(JSON.stringify(record));results.push(record);await context.close();
}
await fs.writeFile(path.join(out,'origin-comparison.json'),JSON.stringify(results,null,2)+'\n');
await browser.close();
