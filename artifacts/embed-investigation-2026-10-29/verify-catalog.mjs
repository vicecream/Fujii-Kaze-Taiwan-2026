import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { SONGS } from '../../src/song-metadata.js';
const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const out=path.dirname(fileURLToPath(import.meta.url));
const browser=await chromium.launch({channel:'msedge',headless:true});
const context=await browser.newContext({viewport:{width:1440,height:1000},locale:'zh-TW',timezoneId:'Asia/Taipei',serviceWorkers:'block'});
const page=await context.newPage();
const results={entry:'http://127.0.0.1:4174/#/song/CasketGirl',songs:[],errors:[]};
page.on('pageerror',e=>results.errors.push(e.message));
await page.goto(results.entry,{waitUntil:'domcontentloaded'});
await page.waitForURL(url=>url.hostname==='localhost');
results.redirectedUrl=page.url();
for(let i=0;i<SONGS.length;i++){
  const song=SONGS[i]; const record={id:song.id,title:song.title,youtubeId:song.youtubeId};
  try{
    if(i){ await page.locator('#next-song').click(); await page.waitForURL('**/#/song/'+song.id); }
    await page.locator('iframe#yt-player').waitFor();
    const frame=page.frames().find(f=>/youtube\.com\/embed\//.test(f.url()));
    await frame.waitForFunction(id=>{const a=document.querySelector('.ytp-title-link,.ytmVideoInfoVideoTitle');return a&&new URL(a.href).searchParams.get('v')===id;},song.youtubeId,{timeout:12000});
    await page.waitForFunction(()=>['playing','paused','ready','blocked','error','slow'].includes(document.getElementById('video-status')?.dataset.state),null,{timeout:16000});
    if(await page.locator('#video-start').isVisible())await page.locator('#video-start').click();
    else if(await page.locator('#video-status').getAttribute('data-state')!=='playing'){
      await page.locator('#venue-btn').click();
      if(await page.locator('#play-toggle').isEnabled())await page.locator('#play-toggle').click();
      await page.locator('#venue-btn').click();
    }
    await frame.waitForFunction(()=>{const v=document.querySelector('video');return v&&!v.paused&&v.readyState>=3&&v.currentTime>.5;},null,{timeout:16000});
    const before=await frame.locator('video').evaluate(v=>v.currentTime);
    await frame.waitForFunction(t=>document.querySelector('video')?.currentTime>t+.6,before,{timeout:6000});
    record.playback=await frame.locator('video').evaluate(v=>({time:v.currentTime,duration:v.duration,paused:v.paused,readyState:v.readyState}));
    record.state=await page.locator('#video-status').getAttribute('data-state');
    record.titleLink=await frame.locator('.ytp-title-link,.ytmVideoInfoVideoTitle').first().getAttribute('href');
    record.singleIframe=await page.locator('iframe#yt-player').count()===1;
    record.pass=record.state==='playing'&&record.singleIframe&&record.playback.time>before+.6;
    if(['CasketGirl','Matsuri','MichiTeyuKu'].includes(song.id)) await page.screenshot({path:path.join(out,'playing-'+song.id+'.png'),animations:'disabled'});
  }catch(error){record.pass=false;record.failure=error.message;record.state=await page.locator('#video-status').getAttribute('data-state');record.message=await page.locator('#video-status-text').textContent();}
  results.songs.push(record);
  console.log(JSON.stringify(record));
}
await page.setViewportSize({width:390,height:844});
await page.screenshot({path:path.join(out,'playing-mobile.png'),animations:'disabled'});
await fs.writeFile(path.join(out,'catalog-playback.json'),JSON.stringify(results,null,2)+'\n');
await browser.close();
console.log(JSON.stringify({songs:results.songs.length,passed:results.songs.filter(s=>s.pass).length,errors:results.errors}));
process.exitCode=results.songs.some(s=>!s.pass)||results.errors.length?1:0;
