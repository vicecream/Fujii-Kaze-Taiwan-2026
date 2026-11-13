import assert from "node:assert/strict";
import { pathToFileURL } from "node:url";
import fs from "node:fs/promises";

const { chromium } = await import(pathToFileURL(process.argv[2]).href);
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const results = [];
try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 1000 }], ["mobile", { width: 390, height: 844 }]]){
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    // Exercise offline video fallback without starting media during UI checks.
    await page.route("**/*", route => new URL(route.request().url()).hostname === "localhost" ? route.continue() : route.abort());
    await page.goto("http://localhost:5175/#/guide");
    await page.waitForFunction(() => document.querySelectorAll(".song-row").length === 29);
    assert.equal(await page.locator(".song-album-label").filter({ hasText: "LOVE ALL SERVE ALL" }).count(), 1);
    await page.locator('[data-id="Yaba"]').first().click();
    await page.locator(".lyric-zh").filter({ hasText: "希望被注意" }).waitFor();
    assert.equal(await page.locator("#japanese-toggle").isDisabled(), true);
    assert.equal(await page.locator("#autoscroll-btn").isDisabled(), true);
    assert.equal(await page.locator("#karaoke-btn").isDisabled(), true);
    assert.equal(await page.locator("button.lyric-line").count(), 0);
    assert.equal(await page.locator("#song-content-status").innerText().then(text => text.includes("照片中文已整理")), true);
    assert.equal(await page.locator("#lyrics-list").evaluate(element => element.scrollWidth <= element.clientWidth + 1), true);
    await page.screenshot({ path: new URL(`./${name}-yaba.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
    await page.goto("http://localhost:5175/#/song/Garden");
    await page.locator("#photo-translation summary").waitFor();
    await page.locator("#photo-translation summary").click();
    assert.match(await page.locator("#photo-translation").innerText(), /鳥兒宣告春天/);
    assert.ok(await page.locator("button.lyric-line").count() > 0);
    await page.screenshot({ path: new URL(`./${name}-garden-photos.png`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1") });
    await page.goto("http://localhost:5175/#/song/HedemoNeYoLasa");
    await page.locator("#song-content-status").filter({ hasText: "照片中文部分整理" }).waitFor();
    assert.deepEqual(errors, []);
    results.push({ viewport: name, passed: true, songs: 29, photoOnlyChinese: true, partialNotice: true, existingTimedLyrics: true, pageErrors: errors, mediaPlayback: "not tested; external requests blocked" });
    await page.close();
  }
} finally { await browser.close(); }
await fs.writeFile(new URL("./browser-results.json", import.meta.url), JSON.stringify(results, null, 2) + "\n");
console.log(JSON.stringify(results, null, 2));
