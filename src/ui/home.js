import { INFO_SVG, CHEVRON_SVG, EXT_LINK_SVG, NOTICE_SVG, SEAT_SVG, MAP_SVG, MANNER_SVG, SHARE_SVG, MOON_SVG } from "./icons.js";
import { SITE, EVENT, ONSITE, SONGS } from "../data.js";
import { siteFooterHtml } from "./footer.js";
const link = (url, label) => `<a class="info-book-link" href="${url}" target="_blank" rel="noopener">${EXT_LINK_SVG} ${label}</a>`;
const hours = item => item.end ? `${item.start}–${item.end}` : `${item.start} 起`;
const policyList = items => `<ul class="way-list">${items.map(item => `<li><b>${item.title}</b>：${item.text}</li>`).join("")}</ul>`;
function scheduleTable(){
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="演出日服務時程表，可左右捲動">
    <table class="event-schedule"><caption>10/31 活動時程 · 台灣時間</caption>
      <thead><tr><th scope="col">服務／活動</th><th scope="col">時間</th><th scope="col">提醒</th></tr></thead>
      <tbody>${ONSITE.schedule.map(item => `<tr><th scope="row">${item.label}</th><td>${hours(item)}</td><td>${item.note}</td></tr>`).join("")}</tbody>
    </table></div>`;
}
function entryTable(){
  return `<div class="table-scroll" tabindex="0" role="region" aria-label="票區入場入口對照表，可左右捲動">
    <table class="entry-routes"><caption>依票區選擇入場入口</caption>
      <thead><tr><th scope="col">票區</th><th scope="col">入口</th></tr></thead>
      <tbody>${ONSITE.entryRoutes.map(item => `<tr><th scope="row">${item.area}</th><td>${item.entrance}${item.note ? `<br><small>${item.note}</small>` : ""}</td></tr>`).join("")}</tbody>
    </table></div>`;
}
function card(id, title, icon, body){
  return `<div class="info-card" id="${id}-card">
    <button class="menu-row info-toggle" id="${id}-toggle" type="button" aria-expanded="false" aria-controls="${id}-panel">
      <span class="info-toggle-icon">${icon}</span><span class="info-toggle-label">${title}</span><span class="info-toggle-chevron">${CHEVRON_SVG}</span>
    </button>
    <div class="info-panel" id="${id}-panel" inert aria-hidden="true"><template class="info-panel-template"><div class="info-panel-inner">${body}</div></template></div>
  </div>`;
}
// One shared homepage for Vite prerendering and client navigation.
export function homeHtml(build, themeToggle = `<button class="theme-toggle home-theme" type="button" data-theme-toggle aria-label="切換主題">${MOON_SVG}</button>`){
  return `<section class="hero">
    ${themeToggle}<div class="hero-inner">
      <div class="eyebrow">FUJII KAZE · KAOHSIUNG 2026</div>
      <h1 class="tour-title"><span>藤井風</span>Prema<br>World Tour</h1>
      <p class="hero-subtitle">高雄演唱會指南 · 非官方粉絲製作</p>
      <div class="countdown" id="countdown"><div class="cd-pill"><span class="cd-dday" id="cd-dday">10.31</span><span class="cd-sep"></span><span class="cd-clock" id="cd-clock">19:00</span></div></div>
      <div class="show-meta">
        <div class="show-row"><span class="show-day">10.31<span class="dow">六</span></span><span class="show-time">${EVENT.startLabel}</span></div>
        <div class="show-venue">${EVENT.venue}</div><p class="show-doors">${EVENT.doors} 入場 · 台灣時間 UTC+8</p>
      </div>
      <div class="today-card" id="today-card" hidden><div class="today-head"><span class="dot"></span><span id="today-title">今日演出</span></div><div class="today-now" id="today-now"></div><ul class="today-list" id="today-list"></ul></div>
      <nav class="main-menu" aria-label="主要導覽"><button class="menu-btn" id="guide-btn" type="button"><span class="menu-btn-label">${SONGS.length} 首歌曲預習</span></button><p class="prep-note">Prema ＋ 代表曲精選 · 並非高雄正式歌單</p></nav>
      <aside class="home-update" aria-labelledby="home-update-title">
        <h2 id="home-update-title">最新演出資訊</h2>
        <a class="announcement-source" href="${ONSITE.sourceUrl}" target="_blank" rel="noopener">主辦公告 ↗</a>
        <ul class="update-highlights">
          <li><strong>${hours(ONSITE.schedule[0])}</strong> 官方周邊取貨與販售</li>
          <li><strong>${EVENT.doors} 入場 · ${EVENT.startLabel} 開演</strong>，請先至全家取票</li>
          <li><strong>${hours(ONSITE.transport.shuttles[0])}</strong> 進場接駁：新左營 → 世運</li>
        </ul>
        <p>入場動線、交通與攜入規定已更新</p>
      </aside>
      <section class="info-section" aria-label="演出與交通資訊"><div class="menu-card">
      ${card("info", "演出資訊", INFO_SVG, `
        <div class="info-panel-title">演出概要</div><dl class="info-facts">
          <dt>演出名稱</dt><dd>${EVENT.name}</dd>
          <dt>日期／時間</dt><dd><span class="em">${EVENT.dateLabel} ${EVENT.startLabel}</span><span class="sub">${EVENT.doors} 開放入場；散場時間待官方公告</span></dd>
          <dt>地點</dt><dd>${EVENT.venue}<span class="sub">${EVENT.address}</span></dd>
          <dt>主辦單位</dt><dd>KKLIVE<span class="sub">協辦：創昕製作、高雄市政府</span></dd>
          <dt>票價</dt><dd><p class="info-price"><span>NT$ 5,800</span><span>4,800</span><span>3,800</span><span>2,800</span><span>1,800</span></p><span class="sub">全場座席；身心障礙席及視線遮蔽區詳見 KKTIX</span></dd>
          <dt>售票／取票</dt><dd>KKTIX、全家 FamiPort<span class="sub">網路訂票於活動前 7 天起開放全家取票；每筆手續費 NT$30，4 張為限。請依訂單及最新公告確認。</span></dd>
        </dl><div class="info-book-links">${link(EVENT.ticketUrl, "KKTIX 活動與取票資訊")}${link(EVENT.tourUrl, "官方巡演資訊")}</div>
        ${scheduleTable()}
        <h3 class="way-block-t">票務櫃檯與票券問題</h3>
        ${policyList(ONSITE.ticketPolicies)}
      `)}
      ${card("notice", "公告與周邊", NOTICE_SVG, `
        <h3 class="way-block-t">官方周邊預購取貨與現場購買</h3>
        <p class="way-note"><b>${EVENT.dateLabel} ${hours(ONSITE.schedule[0])}</b>。周邊攤位位於場館南側外圍，詳見主辦場地圖；排隊及取貨安排依現場指示。</p>
        <p class="announcement-source">${link(ONSITE.merchSourceUrl, "Facebook 官方周邊公告")}</p>
        <h3 class="way-block-t">場地圖與服務設施</h3>
        <figure class="venue-map-figure">
          <a class="seat-map-link" href="${EVENT.venueMap}" target="_blank" rel="noopener" aria-label="開啟原尺寸場地圖，查看入場入口與服務設施">
            <img class="seat-map-image" data-src="${EVENT.venueMap}" width="1200" height="1200" alt="藤井風高雄場官方場地圖，標示特區 D、F 車道、看台 C 至 G 門、周邊販售、票務台、洗手間、救護站及世運大道接駁車乘車處" loading="lazy" decoding="async">
          </a>
          <figcaption class="seat-map-caption">點擊圖片可開啟原尺寸，放大查看入口與服務設施。</figcaption>
        </figure>
        <p class="way-note">場地圖列有：${ONSITE.facilities.join("、")}。票務台與服務台位於場館東南側外圍；接駁車乘車處在世運大道、往捷運世運站方向，請循現場指標。</p>
        <p class="way-note">場地寬闊、人潮較多，可利用主辦標示的公共藝術「火焰」、「和平啟示」、「無限奔馳」作為親友集合地標。</p>
        <div class="info-book-links">${link("https://www.instagram.com/kklive_tw/", "KKLIVE Instagram")}${link("https://www.facebook.com/KKLIVETW/", "KKLIVE Facebook")}</div>
      `)}
      ${card("seat", "舞台與座位配置", SEAT_SVG, `
        <p class="way-note">高雄場官方配置圖。點擊可開啟原圖查看票區與票價。</p>
        <a class="seat-map-link" href="${EVENT.seatMap}" target="_blank" rel="noopener"><img class="seat-map-image" data-src="${EVENT.seatMap}" width="1000" height="1000" alt="藤井風 Prema World Tour 高雄場舞台及全場座席配置圖，含票區、票價與身心障礙席" loading="lazy" decoding="async"></a>
        <p class="way-note">部分區域可能有視線遮蔽，請對照票券與 KKTIX 說明。圖示不代表入場動線。</p>
        ${entryTable()}
        <p class="way-note">特區使用 <b>D、F 車道</b>，看台使用對應的<b>門</b>；兩者不是同一入口，請依票區與主辦指標前往。</p>
      `)}
      ${card("way", "交通與地址", MAP_SVG, `
        <div class="info-panel-title">${EVENT.venue}</div><p class="way-note">${EVENT.address}</p>
        <div class="info-book-links"><button class="info-book-link" id="copy-addr" type="button">複製地址</button>${link(EVENT.mapUrl, "開啟地圖")}</div>
        <div class="way-block"><div class="way-block-t">高雄捷運紅線 · R17 世運站</div><ul class="way-list">
          <li>前往國家體育場可由 1 號出口出站，沿現場指標步行。</li>
          <li>高鐵左營／台鐵新左營可轉乘紅線至世運站；無障礙電梯位置請先查看高捷車站圖。</li>
        </ul></div>${link(EVENT.transitUrl, "高捷出口與首末班車")}
        <h3 class="way-block-t">演出日交通管制</h3>
        <p class="way-note"><b>${ONSITE.transport.roadClosure.road} ${hours(ONSITE.transport.roadClosure)}</b> 管制，建議搭乘捷運、接駁專車或步行前往。</p>
        <div class="table-scroll" tabindex="0" role="region" aria-label="單向接駁服務時段，可左右捲動">
          <table class="event-schedule"><caption>單向接駁專車</caption><thead><tr><th scope="col">方向</th><th scope="col">時間</th><th scope="col">路線</th></tr></thead>
            <tbody>${ONSITE.transport.shuttles.map(item => `<tr><th scope="row">${item.direction}</th><td>${hours(item)}</td><td>${item.from} → ${item.to}</td></tr>`).join("")}</tbody>
          </table></div>
        <p class="way-note">${ONSITE.transport.note}</p>
      `)}
      ${card("manner", "入場提醒", MANNER_SVG, `
        <ul class="way-list">
          <li>帶妥票券；需查驗身分的票種，請依 KKTIX 規定備妥有效證件。</li>
          <li>平面區為維護草皮，不得穿高跟鞋及使用輪類器具進出。</li>
          <li>2F 看台有一定高度，請留意現場安全指引。</li>
          <li>請先在線上開啟指南並等待快取完成；資訊及已整理歌詞可離線閱讀，YouTube 播放仍需網路。</li>
        </ul>
        <h3 class="way-block-t">安檢、拍攝與觀演規定</h3>
        ${policyList(ONSITE.guidelines)}
        <h3 class="way-block-t">禁止攜帶物品與場內限制</h3>
        <ul class="way-list">${ONSITE.prohibitedItems.map(item => `<li>${item}</li>`).join("")}</ul>
      `)}
      <div class="menu-chips"><a class="menu-chip" href="${SITE.officialUrl}" target="_blank" rel="noopener"><span class="chip-label">藤井風官方網站 ↗</span></a><button class="menu-chip" type="button" id="setlist-btn"><span class="chip-label">高雄場歌單待確認</span></button></div>
      </div><aside class="home-note"><div class="home-note-body"><b>把歌曲先聽熟，把驚喜留給現場。</b><p>預習清單依專輯分組，並非本場演出曲目或順序。歌詞與繁中翻譯將分批整理。</p></div></aside>
      <div class="home-foot"><button class="share-btn" type="button" id="share-btn">${SHARE_SVG} 分享指南</button></div>
      </section>
    </div></section>${siteFooterHtml(build)}`;
}
