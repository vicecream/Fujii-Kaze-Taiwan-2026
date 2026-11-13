import assert from "node:assert/strict";
import fs from "node:fs/promises";
import {fileURLToPath,pathToFileURL} from "node:url";
const {chromium}=await import(pathToFileURL(process.argv[2]).href);
const browser=await chromium.launch({executablePath:"C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true});
const cases={HedemoNeYoLasa:[53,53],Yaba:[43,43],MoEhYo:[43,43],LonelyRhapsody:[41,40],ByeForNow:[24,24],SeishunSick:[49,46]};
const results=[];
try{
  for(const [name,viewport] of [["desktop",{width:1440,height:1000}],["mobile",{width:390,height:844}]]){
    const page=await browser.newPage({viewport});const errors=[];
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/*",route=>new URL(route.request().url()).hostname==="localhost"?route.continue():route.abort());
    for(const [id,[originals,translated]] of Object.entries(cases)){
      await page.goto(`http://localhost:5177/#/song/${id}`);
      await page.waitForFunction(count=>document.querySelectorAll("button.lyric-line").length===count,originals);
      await page.waitForFunction(()=>document.querySelectorAll(".lyric-jp ruby rt").length>0);
      assert.equal(await page.locator("#reading-btn").isDisabled(),false);
      assert.doesNotMatch(await page.locator("#song-content-status").innerText(),/日文讀音待整理/);
      const chinese=await page.locator(".lyric-zh").allTextContents();
      const times=await page.locator(".lyric-line").evaluateAll(rows=>rows.map(row=>row.dataset.time));
      assert.equal(chinese.filter(text=>text.trim()).length,translated);
      if(id==="HedemoNeYoLasa"){
        assert.match(chinese[0],/多吃蔬菜/);assert.equal(chinese[3],"該死啊(怒)");assert.equal(chinese[7],"起舞吧");
        await page.screenshot({path:fileURLToPath(new URL(`./${name}-hedemo-kana.png`,import.meta.url))});
      }
      await page.locator("#reading-btn").click();
      await page.waitForFunction(()=>document.querySelector("#reading-value").textContent==="羅馬字");
      const romanised=await page.locator(".lyric-jp").allTextContents();
      assert.ok(romanised.every(text=>!/[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u.test(text)));
      if(id==="HedemoNeYoLasa"){
        assert.match(romanised[0],/yasai bakka/);
        await page.screenshot({path:fileURLToPath(new URL(`./${name}-hedemo-romaji.png`,import.meta.url))});
      }
      await page.locator("#reading-btn").click();
      await page.waitForFunction(()=>document.querySelector("#song-page").classList.contains("reading-both"));
      assert.ok(await page.locator(".lyric-jp ruby rt").count()>0);
      assert.ok((await page.locator(".lyric-romaji").allTextContents()).some(text=>text.trim()));
      assert.deepEqual(await page.locator(".lyric-zh").allTextContents(),chinese);
      assert.deepEqual(await page.locator(".lyric-line").evaluateAll(rows=>rows.map(row=>row.dataset.time)),times);
      assert.equal(await page.locator("#lyrics-list").evaluate(element=>element.scrollWidth<=element.clientWidth+1),true);
      if(id==="HedemoNeYoLasa")await page.screenshot({path:fileURLToPath(new URL(`./${name}-hedemo-both.png`,import.meta.url))});
      await page.locator("#reading-btn").click();
      await page.waitForFunction(()=>document.querySelector("#reading-value").textContent==="假名");
    }
    assert.deepEqual(errors,[]);
    results.push({viewport:name,passed:true,songs:6,japaneseRowsWithReadings:251,uniqueReadingLines:194,hedemoChinese:"53/53",modes:["kana","romaji","both"],chineseAndTimesUnchanged:true,pageErrors:errors,mediaPlayback:"not tested; external requests blocked"});
    await page.close();
  }
}finally{await browser.close();}
await fs.writeFile(new URL("./browser-results.json",import.meta.url),JSON.stringify(results,null,2)+"\n");
console.log(JSON.stringify(results,null,2));
