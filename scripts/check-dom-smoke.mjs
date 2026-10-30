// Optional DOM-only smoke check. Install linkedom outside the project, then run:
// node --experimental-vm-modules scripts/check-dom-smoke.mjs <linkedom-esm-entry>
// This deliberately does not claim browser layout, media or accessibility QA.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath, pathToFileURL } from "node:url";
import { EVENT, ONSITE } from "../src/data.js";

if (!process.argv[2]) throw new Error("Pass the installed linkedom ESM entry path; no project dependency is required.");
const { parseHTML } = await import(pathToFileURL(path.resolve(process.argv[2])).href);
const root = fileURLToPath(new URL("../", import.meta.url));
const { window } = parseHTML(fs.readFileSync(path.join(root, "index.html"), "utf8"));
const document = window.document;
const location = { hash: "#/", search: "", href: "https://kaze.tiaui.co/", origin: "https://kaze.tiaui.co", protocol: "https:", reload(){} };
const timers = new Map();
let nextTimer = 1;
const schedule = callback => { const id = nextTimer++; timers.set(id, callback); return id; };
const cancel = id => timers.delete(id);
const storage = new Map();
const localStorage = { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, String(value)) };
for (const [key, value] of Object.entries({
  location, navigator: { onLine: true, userAgent: "DOM smoke fixture", maxTouchPoints: 0 },
  matchMedia: () => ({ matches: false, addEventListener(){} }),
  innerWidth: 1280, innerHeight: 900, scrollY: 0,
  scrollTo(){}, focus(){}, setTimeout: schedule, clearTimeout: cancel,
  fetch: async () => { throw new Error("DOM fixture has no network"); },
  requestAnimationFrame: schedule, cancelAnimationFrame: cancel,
  getComputedStyle: () => ({ marginTop: "0px", getPropertyValue: () => "" }),
})) Object.defineProperty(window, key, { value, writable: true, configurable: true });
const rect = () => ({ x: 0, y: 0, top: 0, bottom: 400, left: 0, right: 600, width: 600, height: 400 });
window.HTMLElement.prototype.getBoundingClientRect = rect;
window.HTMLElement.prototype.scrollIntoView = function(){};
window.HTMLElement.prototype.focus = function(){};
window.HTMLElement.prototype.pause = function(){};
window.HTMLElement.prototype.play = async function(){};
window.HTMLElement.prototype.load = function(){};
// linkedom's select value has no browser setter; supply browser-like semantics.
Object.defineProperty(window.HTMLSelectElement.prototype, "value", {
  configurable: true,
  get(){ return this.getAttribute("data-fixture-value") || this.querySelector("option[selected]")?.value || this.querySelector("option")?.value || ""; },
  set(value){ this.setAttribute("data-fixture-value", String(value)); },
});
const context = vm.createContext({
  window, document, location, navigator: window.navigator, localStorage,
  console, performance, URL, URLSearchParams, Intl, Date, Node: window.Node, NodeFilter: window.NodeFilter,
  Response, fetch: async () => { throw new Error("DOM fixture has no network"); },
  setTimeout: schedule, clearTimeout: cancel, setInterval: schedule, clearInterval: cancel,
  requestAnimationFrame: schedule, cancelAnimationFrame: cancel,
  getComputedStyle: window.getComputedStyle,
});
const modules = new Map();
function getModule(url){
  const key = url.href;
  if (modules.has(key)) return modules.get(key);
  let module;
  if (url.search === "?inline" || url.search === "?raw"){
    const text = fs.readFileSync(fileURLToPath(new URL(url.pathname, url)), "utf8");
    module = new vm.SyntheticModule(["default"], function(){ this.setExport("default", text); }, { context, identifier: key });
  } else {
    const filename = fileURLToPath(url);
    let source = fs.readFileSync(filename, "utf8");
    if (filename === path.join(root, "src", "main.js")) {
      source = source.replace(/\}\)\.catch\(\(\) => \{\r?\n      window.clearTimeout\(lyricsLoadTimer\);/,
        "}).catch(error => { console.error(error);\n      window.clearTimeout(lyricsLoadTimer);");
      source += "\nexport { router, renderSong, currentSong, updateTodayCard, updateLyricsSync };\nexport function installTimelineFixture(){ const clock = { time:0, seek:null }; player = { getCurrentTime:()=>clock.time, getDuration:()=>400, getPlayerState:()=>2, seekTo:value=>{clock.time=value;clock.seek=value;}, playVideo(){} }; playerReady=true; return clock; }\n";
    }
    module = new vm.SourceTextModule(source, {
      context, identifier: key,
      initializeImportMeta(meta){ meta.env = { BASE_URL: "./", DEV: false }; },
      importModuleDynamically: async (specifier, parent) => {
        const child = getModule(new URL(specifier, parent.identifier));
        if (child.status === "unlinked") await child.link(linker);
        if (child.status === "linked") await child.evaluate();
        return child;
      },
    });
  }
  modules.set(key, module);
  return module;
}
const linker = (specifier, parent) => getModule(new URL(specifier, parent.identifier));
const main = getModule(pathToFileURL(path.join(root, "src", "main.js")));
await main.link(linker);
await main.evaluate();
const settle = async () => { for (let i = 0; i < 8; i++) await new Promise(resolve => setImmediate(resolve)); };
async function route(hash){ location.hash = hash; main.namespace.router(); await settle(); }
assert.ok(document.querySelector(".hero"), "Home route renders");
assert.match(document.querySelector(".hero").textContent, /藤井風/);
const announcement = document.querySelector(".home-update .announcement-source");
assert.equal(announcement.getAttribute("href"), "https://www.instagram.com/p/De9BM_xE9JZ/?img_index=4");
assert.equal(announcement.closest(".info-card"), null, "The latest announcement is visible without expanding a card");
const pendingVenueImage = document.querySelector("#notice-panel .info-panel-template").content.querySelector(`img[data-src="${EVENT.venueMap}"]`);
assert.ok(pendingVenueImage, "The venue map starts inside the inert announcement template");
assert.equal(pendingVenueImage.hasAttribute("src"), false, "The collapsed card does not request the map through img src; the worker separately prepares offline assets");
document.getElementById("notice-toggle").dispatchEvent(new window.Event("click", { bubbles: true }));
assert.equal(document.getElementById("notice-toggle").getAttribute("aria-expanded"), "true");
assert.equal(document.getElementById("notice-panel").getAttribute("aria-hidden"), "false");
assert.equal(document.querySelector("#notice-panel .info-panel-template"), null, "Announcement content is instantiated on expansion");
const venueFigure = document.querySelector("#notice-panel .venue-map-figure");
const venueImage = venueFigure.querySelector("img");
const venueLink = venueFigure.querySelector("a");
assert.equal(venueImage.getAttribute("src"), EVENT.venueMap, "The venue map loads after announcement expansion");
assert.equal(venueImage.hasAttribute("data-src"), false);
assert.equal(venueImage.getAttribute("width"), "1200");
assert.equal(venueImage.getAttribute("height"), "1200");
assert.equal(venueImage.getAttribute("loading"), "lazy");
assert.equal(venueLink.getAttribute("href"), EVENT.venueMap, "Click opens the same original JPEG");
assert.equal(venueLink.getAttribute("target"), "_blank");
assert.match(venueLink.getAttribute("rel"), /noopener/);
document.getElementById("seat-toggle").dispatchEvent(new window.Event("click", { bubbles: true }));
assert.equal(document.querySelector("#seat-panel img").getAttribute("src"), "./images/kaohsiung-stage-map.png");
for (const id of ["info", "way", "manner"]){
  document.getElementById(`${id}-toggle`).dispatchEvent(new window.Event("click", { bubbles: true }));
}
assert.equal(document.querySelectorAll("#info-panel .event-schedule tbody tr").length, 5);
assert.equal(document.querySelectorAll("#seat-panel .entry-routes tbody tr").length, 6);
assert.equal(document.querySelectorAll("#way-panel .event-schedule tbody tr").length, 2);
const infoText = document.getElementById("info-panel").textContent;
for (const expected of ["11:00–18:00", "12:00 起", "13:00–20:00", "不提供現場取票"]) assert.ok(infoText.includes(expected), expected);
const noticeText = document.getElementById("notice-panel").textContent;
assert.ok(noticeText.includes("11:00–18:00"));
assert.ok(document.querySelector(`#notice-panel a[href="${ONSITE.merchSourceUrl}"]`));
for (const { area, entrance } of ONSITE.entryRoutes){
  assert.ok(document.getElementById("seat-panel").textContent.includes(area), area);
  assert.ok(document.getElementById("seat-panel").textContent.includes(entrance), entrance);
}
const transportText = document.getElementById("way-panel").textContent;
for (const expected of ["09:00–24:00", "15:00–19:00", "20:30–23:30", "單向", "離場接駁開始時間不代表演出結束時間"]) assert.ok(transportText.includes(expected), expected);
const rulesText = document.getElementById("manner-panel").textContent;
for (const expected of ["票券與手章", "重新安檢", "無寄物服務", "手機拍照與短時間錄影", "折疊傘可攜入", "40×40 cm", "瓶裝水除外"]) assert.ok(rulesText.includes(expected), expected);
for (const id of ["info", "notice", "seat", "way", "manner"]){
  const panel = document.getElementById(`${id}-panel`);
  assert.doesNotMatch(panel.textContent, /來源：|查核：|2026-10-29 核對|最新安排以官方及現場公告為準/, `${id}: remove audit footnotes`);
  for (const date of [EVENT.checkedAt, ONSITE.checkedAt]) assert.equal(panel.textContent.includes(date), false, `${id}: hide audit date ${date}`);
}
const homepageInformation = document.querySelector(".hero").textContent;
assert.doesNotMatch(homepageInformation, /來源：|查核：|2026-10-29 核對|最新安排以官方及現場公告為準/);
for (const date of [EVENT.checkedAt, ONSITE.checkedAt]) assert.equal(homepageInformation.includes(date), false, `Hide homepage audit date ${date}`);
for (const url of [EVENT.ticketUrl, EVENT.tourUrl, EVENT.mapUrl, EVENT.transitUrl, ONSITE.sourceUrl, ONSITE.merchSourceUrl]){
  assert.ok(document.querySelector(`.hero a[href="${url}"]`), `Keep useful external link ${url}`);
}
for (const [time, activeLabel] of [["11:00", "官方周邊"], ["16:00", "開放入場"], ["19:00", "正式開演"], ["20:30", "離場接駁開始"], ["23:30", "離場接駁結束"]]){
  main.namespace.updateTodayCard(Date.parse(`2026-10-31T${time}:00+08:00`));
  assert.equal(document.getElementById("today-card").hidden, false);
  assert.ok(document.querySelector("#today-list li.now").textContent.includes(activeLabel), time);
  const status = document.getElementById("today-now").textContent;
  assert.doesNotMatch(status, /演出已結束|已散場|今天的演出已全部結束/);
  if (time >= "19:00") assert.match(status, /已開演/, time);
}
main.namespace.updateTodayCard(Date.parse("2026-11-01T00:00:00+08:00"));
assert.equal(document.getElementById("today-card").hidden, true, "The full-day road closure does not create a second show day");
await route("#/guide");
assert.equal(document.querySelectorAll(".song-row").length, 19);
assert.equal(document.querySelectorAll(".song-album-label").length, 2);
assert.equal(document.querySelectorAll("[data-chant-version-toggle]").length, 0);
await route("#/song/CasketGirl");
assert.equal(document.getElementById("reading-btn").hidden, true, "English hides Japanese readings");
assert.match(document.getElementById("song-content-status").textContent, /原文歌詞已匯入/);
assert.match(document.getElementById("song-content-status").textContent, /LRC 時間試播・待校正/);
assert.equal(document.getElementById("japanese-toggle").disabled, false);
assert.equal(document.getElementById("chinese-toggle").disabled, true);
assert.equal(document.getElementById("karaoke-btn").disabled, true);
assert.equal(document.getElementById("autoscroll-btn").disabled, false);
assert.equal(document.getElementById("watch-on-yt").getAttribute("href"), "https://www.youtube.com/watch?v=gFOu5r-OuQ4");
assert.equal(document.querySelectorAll(".lyric-line").length, main.namespace.currentSong.lyrics.length);
assert.equal(document.querySelectorAll(".lyric-timestamp").length, main.namespace.currentSong.lyrics.length);
const clock = main.namespace.installTimelineFixture();
const originalLines = main.namespace.currentSong.lyrics;
const firstLine = document.querySelector(".lyric-line");
firstLine.dispatchEvent(new window.Event("click", { bubbles:true }));
assert.equal(clock.seek, originalLines[0].sourceTime, "Clicking a supplied lyric must seek to its exact LRC timestamp");
clock.time = originalLines[0].time - 0.01;
main.namespace.updateLyricsSync(true);
assert.equal(document.querySelectorAll(".lyric-line.active").length, 0, "Preview must not apply an early lyric lead");
clock.time = originalLines[0].time;
main.namespace.updateLyricsSync(true);
assert.equal(document.querySelector(".lyric-line.active"), firstLine, "Preview follows the supplied line boundary");
clock.time = originalLines.at(-1).time;
main.namespace.updateLyricsSync(true);
assert.equal(document.querySelectorAll(".lyric-line.active").length, 1);
clock.time = originalLines.at(-1).endTime;
main.namespace.updateLyricsSync(true);
assert.equal(document.querySelectorAll(".lyric-line.active").length, 0, "An empty trailing LRC cue ends the highlighted line");
clock.time = 0;
main.namespace.updateLyricsSync(true);
assert.equal(document.querySelectorAll(".lyric-line.active").length, 0, "Seeking to the intro clears the previous lyric");
assert.equal(document.getElementById("chant-btn").hidden, true);
await route("#/song/Matsuri");
assert.equal(document.getElementById("reading-btn").hidden, false, "Japanese retains readings control");
assert.equal(document.getElementById("reading-btn").disabled, true, "Readings wait for prepared text");
assert.equal(document.getElementById("chinese-toggle").disabled, false, "Supplied PDF translations enable Chinese subtitles");
assert.match(document.getElementById("lyrics-credit").textContent, /中文譯詞來源.*MARUMARU/);
assert.ok([...document.querySelectorAll(".lyric-zh")].some(line => line.textContent.trim()), "Chinese is present on the timed lyric rows");
main.namespace.renderSong({ ...main.namespace.currentSong, language: "en", timingStatus: "pending", lyrics: [{ jp: "Example original line" }] });
assert.equal(document.querySelector(".lyric-line").tagName, "DIV", "Untimed text is readable and does not pretend to be a seek control");
assert.equal(document.getElementById("reading-btn").hidden, true);
assert.equal(document.getElementById("karaoke-btn").disabled, true);
assert.match(document.getElementById("song-content-status").textContent, /同步時間整理中/);
main.namespace.renderSong({ ...main.namespace.currentSong, language: "ja", timingStatus: "ready", readingsStatus: "ready", lyrics: [{ jp: "日本語", tr: "測試翻譯", time: 0 }, { jp: "例", time: 1 }] });
assert.equal(document.querySelector(".lyric-line").tagName, "BUTTON", "Prepared timestamps allow seeking");
assert.equal(document.getElementById("reading-btn").hidden, false);
assert.equal(document.getElementById("reading-btn").disabled, false);
assert.equal(document.getElementById("karaoke-btn").disabled, false);
assert.match(document.getElementById("song-content-status").textContent, /繁中翻譯部分整理/);
await route("#/setlist");
assert.match(document.getElementById("app").textContent, /高雄場歌單待確認/);
assert.equal(document.querySelectorAll(".spoiler-hero,.spoiler-choice,.set-order-confirm").length, 0);
await route("#/song/KaijuNoHanauta");
assert.match(document.getElementById("app").textContent, /本指南已轉換/);
await route("#/song/%E0%A4%A");
assert.match(document.getElementById("app").textContent, /本指南已轉換/);
console.log("PASS DOM routes and organizer notices: home cards, hours, entry routes, one-way transport, rules, live timeline, grouped guide, pending players and legacy links.");
