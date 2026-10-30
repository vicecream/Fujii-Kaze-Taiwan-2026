import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1440,height:1000},locale:'zh-TW'});
const record={url:'https://www.marumaru-x.com/japanese-song/play-wzrv48xlr3'};
try{
  await page.goto(record.url,{waitUntil:'domcontentloaded',timeout:25000});
  await page.locator('.vjs-big-play-button').click({timeout:10000});
  const element=await page.locator('iframe[src*="youtube.com/embed/ptiK8U4WlSc"]').elementHandle({timeout:12000});
  const frame=await element.contentFrame();
  await frame.getByRole('button',{name:/^播放|^Play/i}).first().waitFor({timeout:12000});
  record.wrapper=await page.locator('#player').getAttribute('class');
  record.apiSnippet=await page.evaluate(async()=>{const js=await(await fetch('/js/mr-jp-song-detail.js?v=20260429-2')).text();const i=js.indexOf('new YT.Player');return i>=0?js.slice(i,i+240):null;});
  record.controls=await frame.locator('button').evaluateAll(items=>items.map(e=>({name:e.getAttribute('aria-label'),title:e.title,visible:!!e.getClientRects().length})).filter(e=>e.visible).slice(0,20));
  // Video.js covers the native iframe with its own visible play button.
  if(await page.locator('.vjs-big-play-button').isVisible())await page.locator('.vjs-big-play-button').click();
  await frame.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.currentTime>1&&v.readyState>=3;},null,{timeout:15000});
  record.media=await frame.locator('video').evaluate(v=>({time:v.currentTime,paused:v.paused,duration:v.duration,readyState:v.readyState}));
  record.videoId=new URL(frame.url()).pathname.split('/').at(-1);
  record.origin=new URL(frame.url()).searchParams.get('origin');
  await page.screenshot({path:path.join(path.dirname(fileURLToPath(import.meta.url)),'marumaru-playing.png'),animations:'disabled'});
}catch(error){record.error=error.message.split('\n')[0];}
await fs.writeFile(path.join(path.dirname(fileURLToPath(import.meta.url)),'marumaru-playback.json'),JSON.stringify(record,null,2)+'\n');
console.log(JSON.stringify(record,null,2));
await browser.close();
