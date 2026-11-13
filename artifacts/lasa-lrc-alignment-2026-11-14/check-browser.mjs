import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { fileURLToPath, pathToFileURL } from "node:url";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const cases = { HedemoNeYoLasa: [53,22], Yaba: [43,43], MoEhYo: [43,43], LonelyRhapsody: [41,40], ByeForNow: [24,24], SeishunSick: [49,46] };
const results = [];
try {
  for (const [name, viewport] of [["desktop", {width:1440,height:1000}], ["mobile", {width:390,height:844}]]){
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/*", route => new URL(route.request().url()).hostname === "localhost" ? route.continue() : route.abort());
    for (const [id, [originals, translated]] of Object.entries(cases)){
      await page.goto(`http://localhost:5176/#/song/${id}`);
      await page.waitForFunction(count => document.querySelectorAll("button.lyric-line").length === count, originals);
      const rows = page.locator("#lyrics-list .lyric-line");
      assert.equal(await rows.count(), originals);
      assert.equal(await page.locator(".lyric-zh").evaluateAll(elements => elements.filter(element => element.textContent.trim()).length), translated);
      assert.equal(await page.locator("#japanese-toggle").isDisabled(), false);
      assert.equal(await page.locator("#autoscroll-btn").isDisabled(), false);
      assert.equal(await page.locator("#karaoke-btn").isDisabled(), false);
      assert.equal(await page.locator("#reading-btn").isDisabled(), true);
      assert.match(await page.locator("#song-content-status").innerText(), /LRC 時間試播/);
      assert.equal(await page.locator("#lyrics-list").evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
      if(id === "Yaba"){
        assert.equal(await rows.nth(7).getAttribute("data-time"), "52.1");
        assert.equal(await rows.nth(7).locator(".lyric-zh").textContent(), "往遠方去／直到抵達高處");
        await page.screenshot({path:fileURLToPath(new URL(`./${name}-yaba-bilingual.png`,import.meta.url))});
      }
      if(id === "LonelyRhapsody") assert.equal(await rows.nth(30).locator(".lyric-zh").textContent(), "");
      if(id === "SeishunSick"){
        assert.equal(await rows.nth(45).locator(".lyric-zh").textContent(), "");
        await page.screenshot({path:fileURLToPath(new URL(`./${name}-seishun-bilingual.png`,import.meta.url))});
      }
    }
    assert.deepEqual(errors, []);
    results.push({viewport:name,passed:true,songs:6,originalCues:253,translatedCues:218,pending:35,pageErrors:errors,mediaPlayback:"not tested; external requests blocked; seek/highlight tested separately with a DOM clock fixture"});
    await page.close();
  }
} finally {await browser.close();}
await fs.writeFile(new URL("./browser-results.json",import.meta.url),JSON.stringify(results,null,2)+"\n");
console.log(JSON.stringify(results,null,2));
