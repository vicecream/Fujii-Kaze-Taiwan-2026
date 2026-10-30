import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { SITE, EVENT, ONSITE, SHOW_SCHEDULE, SHOW_TIMELINE, SONGS, ALBUMS } from "../src/data.js";
import { SONG_LYRICS } from "../src/song-lyrics.js";
import { showState, taipeiDateKey, todayTimeline } from "../src/show-time.js";
import { songCapabilities } from "../src/song-content.js";
import { homeHtml } from "../src/ui/home.js";

const groups = [];
function check(label, run){
  run();
  groups.push(label);
}

check("catalog and listening sources", () => {
  assert.equal(SONGS.length, 23);
  assert.equal(new Set(SONGS.map(song => song.id)).size, 23);
  assert.equal(SONGS.filter(song => song.album === "prema").length, 9);
  assert.equal(SONGS.filter(song => song.album === "best").length, 10);
  assert.deepEqual(SONGS.slice(0, 9).map(song => song.language), Array(9).fill("en"));
  assert.equal(SONGS.filter(song => song.album === "prePrema").length, 2);
  assert.equal(SONGS.filter(song => song.album === "hehn").length, 2);
  assert.deepEqual(SONGS.slice(9).map(song => song.language), Array(14).fill("ja"));
  assert.deepEqual(SONGS.slice(19).map(song => song.id), ["ItsAlright", "Masshiro", "MoEhWa", "Kaerou"]);
  const additional = { ItsAlright: [43, 38], Masshiro: [34, 28], MoEhWa: [51, 51], Kaerou: [47, 47] };
  for (const song of SONG_LYRICS.slice(19)){
    const [originals, translated] = additional[song.id];
    assert.equal(song.lyrics.length, originals, song.id);
    assert.equal(song.lyrics.filter(line => line.tr?.trim()).length, translated, song.id);
    assert.equal(song.lyricsStatus, "imported", song.id);
    assert.equal(song.translationStatus, translated === originals ? "ready" : "partial", song.id);
    assert.equal(song.timingStatus, song.id === "Masshiro" ? "pending" : "preview", song.id);
    assert.equal(song.readingsStatus, "pending", song.id);
    assert.equal(songCapabilities(song).timed, song.id !== "Masshiro", song.id);
    assert.equal(songCapabilities(song).readings, false, song.id);
    if (song.id === "Masshiro"){
      assert.ok(song.lyrics.some(line => line.jp === "真っ白な心に惹かれ"));
      assert.ok(song.lyrics.every(line => line.time === undefined && line.sourceTime === undefined), "The supplied plain text has no timeline");
    }
  }
  for (const song of SONGS){
    assert.equal(song.artist, "Fujii Kaze", song.id);
    assert.ok(ALBUMS[song.album], song.id);
    assert.equal(song.sourceUrl, ALBUMS[song.album].url, song.id);
    assert.equal(new URL(song.sourceUrl).hostname, "fujiikaze.com", song.id);
    assert.match(song.youtubeId, /^[\w-]{11}$/, song.id);
    const listen = new URL(song.listenUrl);
    assert.equal(listen.hostname, "www.youtube.com", song.id);
    assert.equal(listen.searchParams.get("v"), song.youtubeId, song.id);
    assert.equal(SONG_LYRICS.filter(item => item.id === song.id).length, 1, song.id);
  }
  assert.equal(SITE.url, "https://kaze.tiaui.co/");
  assert.equal(EVENT.date, "2026-10-31");
  assert.equal(EVENT.doors, "16:00");
  assert.equal(EVENT.start, "2026-10-31T19:00:00+08:00");
  assert.equal(EVENT.announcementUrl, "https://www.instagram.com/p/De9BM_xE9JZ/?img_index=4");
  assert.equal(new URL(EVENT.announcementUrl).searchParams.get("img_index"), "4");
  assert.equal(EVENT.announcementAddedAt, "2026-10-29");
  assert.equal(EVENT.venueMap, "./images/kaohsiung-venue-map.jpg");
  assert.equal(EVENT.venueMapSource, "https://www.instagram.com/p/De9BM_xE9JZ/?img_index=5");
  assert.equal(new URL(EVENT.venueMapSource).searchParams.get("img_index"), "5", "The service map is the fifth image, not the entrance table");
  const venueMap = fs.readFileSync(new URL(`../${EVENT.venueMap}`, import.meta.url));
  assert.equal(venueMap.readUInt16BE(0), 0xffd8, "The original venue map is a local JPEG asset");
  assert.equal(EVENT.checkedAt, "2026-10-27", "Basic event sources keep their original verification date");
  assert.equal(ONSITE.checkedAt, "2026-10-29", "Organizer images were verified separately");
  assert.equal(SHOW_SCHEDULE.length, 1);
  assert.equal("end" in SHOW_SCHEDULE[0], false, "Unannounced end must not be invented");
  assert.deepEqual(Object.keys(SHOW_TIMELINE), [EVENT.date]);
});

check("Taipei date and schedule boundaries under different host timezones", () => {
  const originalTimezone = process.env.TZ;
  const cases = [
    ["2026-10-30T23:59:59+08:00", "2026-10-30", "upcoming", 1, -1, -1],
    ["2026-10-31T00:00:00+08:00", "2026-10-31", "upcoming", 0, -1, 0],
    ["2026-10-31T08:59:59+08:00", "2026-10-31", "upcoming", 0, -1, 0],
    ["2026-10-31T09:00:00+08:00", "2026-10-31", "upcoming", 0, 0, 1],
    ["2026-10-31T10:59:59+08:00", "2026-10-31", "upcoming", 0, 0, 1],
    ["2026-10-31T11:00:00+08:00", "2026-10-31", "upcoming", 0, 1, 2],
    ["2026-10-31T11:59:59+08:00", "2026-10-31", "upcoming", 0, 1, 2],
    ["2026-10-31T12:00:00+08:00", "2026-10-31", "upcoming", 0, 2, 3],
    ["2026-10-31T12:59:59+08:00", "2026-10-31", "upcoming", 0, 2, 3],
    ["2026-10-31T13:00:00+08:00", "2026-10-31", "upcoming", 0, 3, 4],
    ["2026-10-31T14:59:59+08:00", "2026-10-31", "upcoming", 0, 3, 4],
    ["2026-10-31T15:00:00+08:00", "2026-10-31", "upcoming", 0, 4, 5],
    ["2026-10-31T15:59:59+08:00", "2026-10-31", "upcoming", 0, 4, 5],
    ["2026-10-31T16:00:00+08:00", "2026-10-31", "upcoming", 0, 5, 6],
    ["2026-10-31T17:59:59+08:00", "2026-10-31", "upcoming", 0, 5, 6],
    ["2026-10-31T18:00:00+08:00", "2026-10-31", "upcoming", 0, 6, 7],
    ["2026-10-31T18:59:59+08:00", "2026-10-31", "upcoming", 0, 6, 7],
    ["2026-10-31T19:00:00+08:00", "2026-10-31", "started", 0, 7, 8],
    ["2026-10-31T19:59:59+08:00", "2026-10-31", "started", 0, 7, 8],
    ["2026-10-31T20:00:00+08:00", "2026-10-31", "started", 0, 8, 9],
    ["2026-10-31T20:29:59+08:00", "2026-10-31", "started", 0, 8, 9],
    ["2026-10-31T20:30:00+08:00", "2026-10-31", "started", 0, 9, 10],
    ["2026-10-31T23:29:59+08:00", "2026-10-31", "started", 0, 9, 10],
    ["2026-10-31T23:30:00+08:00", "2026-10-31", "started", 0, 10, 11],
    ["2026-10-31T23:59:59+08:00", "2026-10-31", "started", 0, 10, 11],
    ["2026-11-01T00:00:00+08:00", "2026-11-01", "past", 0, -1, -1],
  ];
  try {
    for (const timezone of ["Asia/Taipei", "Asia/Tokyo", "America/Los_Angeles", "UTC"]){
      process.env.TZ = timezone;
      for (const [iso, date, phase, days, currentIndex, nextIndex] of cases){
        const now = Date.parse(iso);
        const context = `${timezone} ${iso}`;
        assert.equal(taipeiDateKey(now), date, context);
        const state = showState(now);
        assert.equal(state.phase, phase, context);
        assert.equal(state.days, days, context);
        assert.equal(state.remaining, phase === "upcoming" ? Date.parse(EVENT.start) - now : 0, context);
        const timeline = todayTimeline(now);
        assert.equal(timeline.currentIndex, currentIndex, context);
        assert.equal(timeline.nextIndex, nextIndex, context);
        if (date === EVENT.date){
          assert.equal(timeline.times[5], Date.parse("2026-10-31T16:00:00+08:00"), context);
          assert.equal(timeline.times[7], Date.parse(EVENT.start), context);
          assert.equal(timeline.times[11], Date.parse("2026-11-01T00:00:00+08:00"), context);
        } else {
          assert.equal(timeline.steps.length, 0, context);
        }
      }
    }
  } finally {
    if (originalTimezone === undefined) delete process.env.TZ;
    else process.env.TZ = originalTimezone;
  }
});

check("organizer operating hours, one-way transport and entry policies", () => {
  const serviceTimes = Object.fromEntries(ONSITE.schedule.map(({ id, start, end }) => [id, [start, end]]));
  assert.deepEqual(serviceTimes, {
    merch: ["11:00", "18:00"], market: ["12:00", undefined], ticket: ["13:00", "20:00"],
    doors: ["16:00", undefined], show: ["19:00", undefined],
  });
  assert.ok(!("end" in ONSITE.schedule.find(item => item.id === "market")), "Do not invent a food market closing time");
  assert.ok(!("end" in ONSITE.schedule.find(item => item.id === "show")), "The return shuttle is not the show end");
  assert.deepEqual(SHOW_TIMELINE[EVENT.date].map(item => item.t), ["09:00", "11:00", "12:00", "13:00", "15:00", "16:00", "18:00", "19:00", "20:00", "20:30", "23:30", "24:00"]);
  assert.deepEqual(ONSITE.transport.roadClosure, { road: "世運大道", start: "09:00", end: "24:00" });
  assert.deepEqual(ONSITE.transport.shuttles, [
    { direction: "進場", from: "台鐵新左營站", to: "世運主場館", start: "15:00", end: "19:00" },
    { direction: "離場", from: "世運主場館", to: "台鐵新左營站", start: "20:30", end: "23:30" },
  ]);
  assert.match(ONSITE.transport.note, /單向/);
  assert.match(ONSITE.transport.note, /不代表演出結束/);
  assert.deepEqual(ONSITE.entryRoutes.map(({ area, entrance }) => [area, entrance]), [
    ["特區 A、B", "D、F 車道"], ["看台 C、V 區", "C 門"], ["看台 D 區", "D 門"],
    ["看台 E 區", "E 門"], ["看台 F 區", "F 門"], ["看台 G 區", "G 門"],
  ]);
  const policies = ONSITE.ticketPolicies.map(item => `${item.title} ${item.text}`).join("\n");
  assert.match(policies, /現場不提供取票/);
  assert.match(policies, /全家/);
  const guidelines = ONSITE.guidelines.map(item => `${item.title} ${item.text}`).join("\n");
  for (const condition of [/重新安檢/, /票券與手章/, /無寄物服務/, /手機拍照與短時間錄影/, /禁止閃光燈、直播/, /折疊傘可攜入/, /場內不得撐開/]) assert.match(guidelines, condition);
  const prohibited = ONSITE.prohibitedItems.join("\n");
  for (const condition of [/40×40 cm/, /官方販售周邊商品除外/, /仍須通過安檢/, /瓶裝水除外/, /發光或發聲/, /非官方商品/]) assert.match(prohibited, condition);
  assert.equal(ONSITE.sourceUrl, EVENT.announcementUrl);
  assert.equal(ONSITE.merchSourceUrl, "https://www.facebook.com/share/p/1DDvP3kXVA/");
});

check("missing, partial, English and Japanese lyric capabilities", () => {
  assert.deepEqual(songCapabilities(undefined), {
    hasOriginal: false, hasTranslation: false, translationComplete: false, timed: false, readings: false, japanese: false,
  });
  assert.equal(songCapabilities({ language: "ja", lyrics: [] }).readings, false);
  const original = { language: "en", lyrics: [{ jp: "Example text" }] };
  assert.equal(songCapabilities(original).hasOriginal, true);
  assert.equal(songCapabilities(original).hasTranslation, false);
  assert.equal(songCapabilities(original).timed, false);
  assert.equal(songCapabilities(original).readings, false);
  const japanese = { language: "ja", lyrics: [{ jp: [{ text: "日本語" }], tr: "測試翻譯", time: 0 }] };
  assert.equal(songCapabilities(japanese).readings, true);
  assert.equal(songCapabilities({ ...japanese, readingsStatus: "pending" }).readings, false);
  assert.equal(songCapabilities(japanese).hasTranslation, true);
  assert.equal(songCapabilities(japanese).translationComplete, true);
  assert.equal(songCapabilities(japanese).timed, true);
  const english = { ...japanese, language: "en" };
  assert.equal(songCapabilities(english).readings, false);
  assert.equal(songCapabilities(english).timed, true);
  for (const time of [undefined, null, "", "0", NaN, Infinity, -1]){
    assert.equal(songCapabilities({ language: "ja", lyrics: [{ jp: "例", time }] }).timed, false, String(time));
  }
  assert.equal(songCapabilities({ lyrics: [{ jp: "A", time: 1 }, { jp: "B" }] }).timed, false);
  assert.equal(songCapabilities({ lyrics: [{ jp: "A", time: 3 }, { jp: "B", time: 2 }] }).timed, false);
  assert.equal(songCapabilities({ lyrics: [{ jp: "", time: 0 }] }).timed, false);
  assert.equal(songCapabilities({ lyrics: [{ jp: "  " }, { jp: [{ text: "" }] }] }).hasOriginal, false);
  const partial = songCapabilities({ lyrics: [{ jp: "A", tr: "測試", time: 0 }, { jp: "B", time: 2 }] });
  assert.equal(partial.hasOriginal, true);
  assert.equal(partial.hasTranslation, true, "Available translated lines remain readable");
  assert.equal(partial.translationComplete, false, "Partial translation must not claim completion");
  assert.equal(partial.timed, true);
});

check("homepage content, lazy panels, sources and removal of spoiler UI", () => {
  const home = homeHtml("v2.0.0");
  assert.match(home, /藤井風/);
  assert.match(home, /高雄國家體育場/);
  assert.match(home, /23 首歌曲預習/);
  assert.match(home, /非官方粉絲製作/);
  assert.match(home, /並非高雄正式歌單/);
  assert.match(home, /16:00/);
  assert.match(home, /19:00/);
  assert.doesNotMatch(home, /11\.01|11\/1|2026-11-01|17:30/);
  assert.doesNotMatch(home, /spoiler-|data-mode="random"|data-mode="order"|VAWS|Ticket Plus|台北小巨蛋/);
  assert.equal((home.match(/class="info-panel-template"/g) || []).length, 5);
  assert.equal((home.match(/class="info-panel"[^>]*inert[^>]*aria-hidden="true"/g) || []).length, 5);
  assert.match(home, /data-src="\.\/images\/kaohsiung-stage-map\.png"/);
  assert.match(home, /class="venue-map-figure"/);
  assert.match(home, /data-src="\.\/images\/kaohsiung-venue-map\.jpg"/);
  assert.doesNotMatch(home, /<img[^>]*\ssrc="/);
  for (const url of [EVENT.ticketUrl, EVENT.tourUrl, EVENT.transitUrl, EVENT.mapUrl, ONSITE.sourceUrl]){
    assert.ok(home.includes(url), url);
  }
  // Attribution in the historical footer is outside the homepage information
  // cards. Include inert templates when checking that their footnotes are gone.
  const homepageInformation = home.split('<footer class="credits">')[0];
  assert.doesNotMatch(homepageInformation, /來源：|查核：|2026-10-29 核對|最新安排以官方及現場公告為準/);
  for (const date of [EVENT.checkedAt, ONSITE.checkedAt]){
    assert.equal(homepageInformation.includes(date), false, `Homepage hides audit date ${date}`);
  }
  assert.ok(home.includes(ONSITE.sourceUrl), "Keep the useful organizer announcement link");
  assert.match(home, /class="home-update"/);
  assert.match(home, /11:00–18:00/);
  assert.match(home, /12:00 起/);
  assert.match(home, /13:00–20:00/);
  assert.match(home, /15:00–19:00/);
  assert.match(home, /20:30–23:30/);
  assert.match(home, /09:00–24:00/);
  assert.doesNotMatch(home, /周邊販售時間、攤位、入場動線與完整攜入規定，待/);
  assert.ok(home.includes(ONSITE.merchSourceUrl));
});

check("version and site identity markers", () => {
  const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
  const manifest = JSON.parse(read("manifest.json"));
  const pkg = JSON.parse(read("package.json"));
  const lock = JSON.parse(read("package-lock.json"));
  assert.equal(pkg.version, "2.0.0");
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].version, pkg.version);
  assert.match(read("src/main.js"), /const BUILD = "v2\.0\.0"/);
  assert.match(read("sw.js"), /const CACHE_VERSION = "v2\.0\.0"/);
  assert.match(manifest.name, /藤井風/);
  assert.equal(read("CNAME").trim(), "kaze.tiaui.co");
  for (const file of ["index.html", "sitemap.xml", "robots.txt"]){
    assert.ok(read(file).includes(SITE.url), file);
    assert.ok(!read(file).includes("https://vaundy.tiaui.co/"), file);
  }
});

// Exercise the real worker lifecycle with an in-memory Cache API. This checks
// offline delivery and namespace cleanup without a browser or an actual deploy.
{
  const origin = "https://kaze.tiaui.co";
  const toKey = request => new URL(typeof request === "string" ? request : request.url, `${origin}/`).href;
  const stores = new Map();
  const listeners = new Map();
  let offline = false;
  let claimed = false;
  let skipped = false;
  const fetchFixture = async request => {
    if (offline) throw new Error("Offline fixture");
    return new Response(`fixture:${toKey(request)}`, { status: 200 });
  };
  const caches = {
    async keys(){ return [...stores.keys()]; },
    async delete(name){ return stores.delete(name); },
    async open(name){
      if (!stores.has(name)) stores.set(name, new Map());
      const entries = stores.get(name);
      return {
        async add(request){ entries.set(toKey(request), await fetchFixture(request)); },
        async put(request, response){ entries.set(toKey(request), response.clone()); },
        async match(request){ return entries.get(toKey(request))?.clone(); },
      };
    },
  };
  class RelativeRequest extends Request {
    constructor(input, init){ super(toKey(input), init); }
  }
  const self = {
    location: { origin },
    clients: { async claim(){ claimed = true; } },
    skipWaiting(){ skipped = true; },
    addEventListener(type, handler){ listeners.set(type, handler); },
  };
  vm.runInNewContext(fs.readFileSync(new URL("../sw.js", import.meta.url), "utf8"), {
    self, caches, fetch: fetchFixture, Request: RelativeRequest, Response, URL,
  }, { filename: "sw.js" });
  const dispatchLifecycle = async type => {
    let completion;
    listeners.get(type)({ waitUntil(promise){ completion = promise; } });
    await completion;
  };
  stores.set("horo-guide-v1.11.1", new Map());
  stores.set("kaze-guide-v1.9.0", new Map());
  stores.set("unrelated-app-cache", new Map());
  await dispatchLifecycle("install");
  assert.equal(skipped, true);
  const workerCache = await caches.open("kaze-guide-v2.0.0");
  for (const path of ["./", "./index.html", "./manifest.json", EVENT.poster, EVENT.seatMap, EVENT.venueMap, "./icon-192.png"]){
    assert.ok(await workerCache.match(path), `Precache ${path}`);
  }
  await dispatchLifecycle("activate");
  assert.equal(claimed, true);
  assert.deepEqual(await caches.keys(), ["unrelated-app-cache", "kaze-guide-v2.0.0"]);
  offline = true;
  const dispatchFetch = request => {
    let response;
    listeners.get("fetch")({ request, respondWith(promise){ response = promise; } });
    return response;
  };
  const documentResponse = await dispatchFetch({ method: "GET", mode: "navigate", url: `${origin}/` });
  assert.equal(await documentResponse.text(), `fixture:${origin}/index.html`);
  for (const path of [EVENT.seatMap, EVENT.venueMap]){
    const imageResponse = await dispatchFetch({ method: "GET", mode: "cors", url: new URL(path, `${origin}/`).href });
    assert.equal(imageResponse.status, 200, `First offline image visit: ${path}`);
  }
  assert.equal(dispatchFetch({ method: "GET", mode: "cors", url: "https://www.youtube.com/iframe_api" }), undefined,
    "YouTube is deliberately outside the offline cache");
  groups.push("service worker precache, namespace cleanup and offline delivery");
}

for (const group of groups) console.log(`PASS ${group}`);
const preparedLines = SONG_LYRICS.reduce((count, song) => count + song.lyrics.length, 0);
console.log(`Checked ${SONGS.length} catalog entries; ${preparedLines} lyric lines currently prepared. Pending content is not treated as verified lyrics.`);
