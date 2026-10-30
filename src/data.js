// Shared by prerendered HTML and client navigation.
export const SITE = Object.freeze({
  name: "藤井風高雄演唱會指南",
  title: "Fujii Kaze Prema World Tour — 高雄演唱會指南",
  description: "藤井風 10/31 高雄演唱會非官方指南：演出資訊、交通與 19 首歌曲預習。",
  url: "https://kaze.tiaui.co/",
  repoUrl: "https://github.com/watain666/Vaundy-Taiwan-2026",
  officialUrl: "https://fujiikaze.com/",
});
export const EVENT = Object.freeze({
  name: "Fujii Kaze Prema World Tour - Kaohsiung",
  date: "2026-10-31", dateLabel: "2026.10.31（六）",
  doors: "16:00", start: "2026-10-31T19:00:00+08:00", startLabel: "19:00",
  timeZone: "Asia/Taipei",
  venue: "高雄國家體育場（世運主場館）", venueEn: "Kaohsiung National Stadium",
  address: "高雄市左營區世運大道 100 號",
  mapUrl: "https://www.google.com/maps/search/?api=1&query=%E9%AB%98%E9%9B%84%E5%9C%8B%E5%AE%B6%E9%AB%94%E8%82%B2%E5%A0%B4",
  ticketUrl: "https://kklivetw.kktix.cc/events/34473ba4",
  tourUrl: "https://hehn.fujiikaze.com/pwt/en/",
  transitUrl: "https://www.krtc.com.tw/Guide/station_info?n=R17",
  announcementUrl: "https://www.instagram.com/p/De9BM_xE9JZ/?img_index=4",
  announcementAddedAt: "2026-10-29",
  checkedAt: "2026-10-27",
  poster: "./images/prema-poster.jpg", seatMap: "./images/kaohsiung-stage-map.png",
  venueMap: "./images/kaohsiung-venue-map.jpg",
  venueMapSource: "https://www.instagram.com/p/De9BM_xE9JZ/?img_index=5",
  posterSource: "https://assets.kktix.io/organization_resource_files/14945/77471/%E8%97%A4%E4%BA%95%E9%A2%A8_%E9%AB%98%E9%9B%84.jpg",
  seatMapSource: "https://assets.kktix.io/organization_resource_files/14945/77533/0608_%E8%97%A4%E4%BA%95%E9%A2%A8-%E9%80%8F%E5%BA%95.png",
});
// Transcribed from the nine organizer notice images supplied in this chat.
// The Facebook preview independently confirms only the merchandise hours.
export const ONSITE = Object.freeze({
  checkedAt: "2026-10-29",
  sourceUrl: EVENT.announcementUrl,
  merchSourceUrl: "https://www.facebook.com/share/p/1DDvP3kXVA/",
  schedule: [
    { id: "merch", label: "官方周邊取貨與販售", start: "11:00", end: "18:00", note: "預購取貨及現場購買" },
    { id: "market", label: "美食市集", start: "12:00", note: "開始營業；未公告結束時間" },
    { id: "ticket", label: "票務櫃檯", start: "13:00", end: "20:00", note: "不提供現場取票，請先至全家取票" },
    { id: "doors", label: "觀眾入場", start: EVENT.doors, note: "請提早抵達並預留安檢時間" },
    { id: "show", label: "演出開始", start: EVENT.startLabel, note: "實際散場時間依現場安排" },
  ],
  entryRoutes: [
    { area: "特區 A、B", entrance: "D、F 車道", note: "車道入口與同名看台門不同，請依現場指標前往" },
    { area: "看台 C、V 區", entrance: "C 門" },
    { area: "看台 D 區", entrance: "D 門" },
    { area: "看台 E 區", entrance: "E 門" },
    { area: "看台 F 區", entrance: "F 門" },
    { area: "看台 G 區", entrance: "G 門" },
  ],
  transport: {
    roadClosure: { road: "世運大道", start: "09:00", end: "24:00" },
    shuttles: [
      { direction: "進場", from: "台鐵新左營站", to: "世運主場館", start: "15:00", end: "19:00" },
      { direction: "離場", from: "世運主場館", to: "台鐵新左營站", start: "20:30", end: "23:30" },
    ],
    note: "接駁為單向服務，派車依現場狀況調度；離場接駁開始時間不代表演出結束時間。",
  },
  ticketPolicies: [
    { title: "現場不提供取票", text: "在 KKTIX 網站購票者，請提前至全家便利商店完成取票；票務櫃檯開放不代表可在現場取票。" },
    { title: "票券遺失", text: "請先向當地警察單位報案，取得「遺失物受理案件登記表」，並於入場前出示登記表、可證明確定座位的有效購買證明與身分證明文件。開放入場後，經現場確認無其他相同票券持有人就座，方可入場。已進場票券及影印、套印、掃描複製票券均無效。" },
    { title: "身心障礙票券", text: "限本人購票、本人入場，須攜帶身障手冊正本；陪同者須攜帶身分證件查驗。非本人無法入場且無法退票，陪同者不得在無持票人陪同時提前入座。" },
  ],
  guidelines: [
    { title: "安檢與驗包", text: "入場前須配合安檢及驗包，違禁品不得攜入。請提早抵達，預留檢查時間；如現場懷疑有違禁品，請配合工作人員檢查。" },
    { title: "再次入場", text: "中途離場時請先由工作人員蓋手章；再次入場須重新安檢，並同時出示票券與手章，缺一可能無法再次入場。" },
    { title: "無寄物服務", text: "現場不提供寄物，請自行使用場館周邊大眾運輸站點的置物櫃。" },
    { title: "手機拍攝", text: "演出期間可使用手機拍照與短時間錄影；禁止閃光燈、直播及商業用途拍攝。不得攜帶主辦定義的專業攝錄器材、單眼／類單眼相機、外接手機望遠鏡頭、GoPro、自拍桿或錄音筆等設備。" },
    { title: "站立觀演", text: "可在自身座位範圍內站立，但不得站上座椅或離開個人座位區；主辦不受理因其他觀眾站立而要求其坐下的請求。" },
    { title: "雨具", text: "折疊傘可攜入，但場內不得撐開；有需要時請穿雨衣或輕便雨衣。長柄雨傘禁止攜入。" },
    { title: "拍攝與肖像", text: "巡演單位可能拍攝或錄影觀眾區域；參與活動即表示同意巡演單位或藝人方將影像用於未來發布內容。" },
    { title: "應援禮物", text: "活動不代收應援禮物、卡片信件、花籃或食物。" },
    { title: "違規處理", text: "嚴重違規可能被要求離場並不得再次入場，請遵守現場工作人員指引。" },
  ],
  prohibitedItems: [
    "超過 40×40 cm 的包包及任何形式的行李箱／袋；官方販售周邊商品除外，但仍須通過安檢。",
    "板凳、折疊椅及任何用於墊高的物品。",
    "玻璃製品、尖銳物體、違禁品及主辦認定的危險物品。",
    "長柄雨傘、旗桿、自拍桿、攝影腳架等同類器材。",
    "動物、植物。",
    "專業拍攝、錄影與錄音設備，包含單眼／類單眼相機、外接手機望遠鏡頭、底片相機、運動相機、無人機、平板、GoPro、錄音筆等。",
    "可投擲、發射或具噴射功能的物品；嚴禁向舞台或演出人員丟擲物品。",
    "打火機、菸品、酒精、加壓型噴霧、香水、瓦斯罐、蠟燭及煙火等易燃物。",
    "場內禁止飲食、吸菸、嚼口香糖或檳榔，瓶裝水除外；禁帶飲食請在場外食用完畢或丟棄。",
    "非官方商品的應援製作物，以及可能遮擋視線、發光或發聲的裝置，包含發光頭飾、螢光棒、LED 燈牌、看板、氣球、雷射筆、哨子、手拍及加油棒等；僅限官方應援商品。",
  ],
  facilities: ["洗手間", "救護站", "票務台", "服務台", "官方周邊商品", "拍照打卡點", "美食市集", "風民休息區", "接駁專車", "專輯販售", "充電站", "機動派出所", "高雄市政府"],
});
export const SHOW_TIMELINE = {
  [EVENT.date]: [
    { t: "09:00", label: "世運大道開始管制" },
    { t: "11:00", label: "官方周邊取貨與販售開始" },
    { t: "12:00", label: "美食市集開始營業" },
    { t: "13:00", label: "票務櫃檯開放（不提供取票）" },
    { t: "15:00", label: "進場接駁開始" },
    { t: EVENT.doors, label: "開放入場" },
    { t: "18:00", label: "官方周邊取貨與販售結束" },
    { t: EVENT.startLabel, label: "正式開演；進場接駁結束" },
    { t: "20:00", label: "票務櫃檯結束服務" },
    { t: "20:30", label: "離場接駁開始" },
    { t: "23:30", label: "離場接駁結束" },
    { t: "24:00", label: "世運大道管制結束（以現場為準）" },
  ],
};
export const SHOW_SCHEDULE = [{ start: EVENT.start }];
export const NOTICES = [];
export const PICS = {};
export const SONG_BPM = Object.freeze({});
export { SONGS, ALBUMS } from "./song-metadata.js";
