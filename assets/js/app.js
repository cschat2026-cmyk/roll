const SCRIPT_URL = new URL(document.currentScript?.src || "assets/js/app.js", window.location.href);
const DATA_URL = new URL("../../data/site-data.json", SCRIPT_URL);
const I18N_URL = new URL("../../data/i18n.json", SCRIPT_URL);
const STORAGE_KEY = "rollradar-go-state-v1";
const LIVE_CACHE_KEY = "rollradar-go-live-cache-v1";
const QUICK_WINS_RESET_TIME_ZONE = "America/New_York";
const QUICK_WINS_RESET_HOUR_LOCAL = 8;
const AD_STATE = {
  renderedKeys: new Set(),
  activeProvider: "ezoic"
};

const state = loadState();
let siteData = null;
let i18n = null;
let currentLang = state.lang || detectLang();
let refreshTimer = null;
let dailyResetTimer = null;
let refreshInFlight = null;
let lastRefreshMode = "seed";

const DATA_TEXT = {
  "zh-CN": {
    diceLabels: {
      "daily-2": "25 骰子社区奖励",
      "daily-3": "今日骰子链接检查",
      "backup-official": "官方奖励页"
    },
    diceNotes: {
      "daily-2": "5 月 21 日社区分享的福利入口。请在手机上打开，在游戏内验证后再标记已处理。",
      "daily-3": "公开骰子链接页更新很快，链接也会快速过期。花骰子冲活动前先做这次检查。",
      "backup-official": "当社区链接互相冲突时，用这个官方入口做兜底验证。"
    },
    eventNames: {
      "quick-wins": "Quick Wins 日常",
      "puppet-party": "Puppet Party 主活动",
      "peg-e-prize-drop": "Peg-E Prize Drop",
      "aladdin-racers": "Aladdin Racers",
      "sticker-boom": "Sticker Boom 观察",
      "golden-blitz-watch": "Golden Blitz 观察",
      "high-roller": "High Roller 观察"
    },
    eventTypes: {
      daily: "每日",
      main: "主活动",
      special: "特殊活动",
      race: "竞速",
      boost: "加成",
      trade: "交易"
    },
    eventStatuses: {
      active: "进行中",
      watch: "观察"
    },
    bestFor: {
      "sticker packs": "贴纸包",
      "daily progress": "日常进度",
      "low dice accounts": "低骰子账号",
      "opening vaults": "开保险箱",
      "large sticker packs": "大贴纸包",
      "album pushes": "相册推进",
      "gold sticker trades": "金卡交易",
      "album completion": "相册补齐",
      "friend trading": "好友交易",
      "large dice banks": "大骰子库存",
      "top event milestones": "高阶活动里程碑",
      "tournament push": "锦标赛推进",
      "landmark upgrades": "地标升级",
      "net worth jumps": "净资产提升",
      "board rush": "棋盘推进",
      "Peg-E tokens": "Peg-E 代币",
      "racing flags": "赛车旗帜",
      "corner scoring": "角落格得分",
      "free rolls": "免费投掷",
      "sticker value": "贴纸收益",
      "team racing": "团队赛车",
      "race dice": "赛车骰子"
    },
    eventActions: {
      "quick-wins": [
        "这是每日阻塞项，不是花骰子的触发窗口。",
        "先完成三项任务，再判断活动 ROI，因为贴纸包和小奖励会改变今日计划。",
        "本站按 America/New_York 时区上午 8:00 的游戏日重置；如果游戏内倒计时不同，以游戏内为准。"
      ],
      "puppet-party": [
        "先用 ROI 选一个可承受的里程碑，不要直接追完整奖励表。",
        "这个活动按角落格计分，接近 Go、监狱、Free Parking、Go To Jail 时再提高倍数。",
        "如果同时需要赛车旗帜或 Peg-E 代币，优先拿中段奖励后停手复算。"
      ],
      "peg-e-prize-drop": [
        "把活动和锦标赛拿到的 Peg-E 代币集中使用，不要零散投入。",
        "先确认是否有贴纸包或万能卡目标，再决定是否继续冲代币里程碑。",
        "如果骰子库存低，把 Peg-E 当成补贴，不要为代币硬追深层奖励。"
      ],
      "aladdin-racers": [
        "先和队友确认目标，不要独自把旗帜一次性打空。",
        "把 Quick Wins、免费礼物和主活动中的旗帜都算进总预算。",
        "只在团队目标明确时投入大倍数，否则先保留骰子。"
      ],
      "sticker-boom": [
        "先把保险箱和大贴纸包停住，等游戏内真的出现加成再开。",
        "如果加成没出现，先清交易队列，贴纸包继续保留。",
        "这只是观察触发点，不要把它当成官方确认窗口。"
      ],
      "golden-blitz-watch": [
        "提前准备可交易金卡截图和缺卡目标。",
        "传闻中的 Blitz 卡先别急着用万能卡，等游戏内组合确认。",
        "窗口开启前，先把交易对象备注保存在本地。"
      ],
      "high-roller": [
        "只有骰子库存能承受波动时才用。",
        "最好配合 Puppet Party 角落格位置，或赛车旗帜目标。",
        "当下个里程碑消耗超过目标回报时立即停手。"
      ]
    },
    milestoneRewards: {
      "10 dice": "10 骰子",
      "Cash": "现金",
      "1-star sticker pack": "1 星贴纸包",
      "40 dice": "40 骰子",
      "80 dice": "80 骰子",
      "Mega Heist 10 min": "Mega Heist 10 分钟",
      "125 dice": "125 骰子",
      "2-star sticker pack": "2 星贴纸包",
      "220 dice": "220 骰子",
      "3-star sticker pack": "3 星贴纸包",
      "350 dice": "350 骰子",
      "Cash + boost": "现金 + 加成",
      "4-star sticker pack": "4 星贴纸包",
      "900 dice": "900 骰子",
      "5-star sticker pack": "5 星贴纸包",
      "1400 dice": "1400 骰子",
      "5 Peg-E tokens": "5 Peg-E 代币",
      "8 Peg-E tokens": "8 Peg-E 代币",
      "10 Peg-E tokens": "10 Peg-E 代币",
      "12 Peg-E tokens": "12 Peg-E 代币",
      "15 Peg-E tokens": "15 Peg-E 代币",
      "17 Peg-E tokens": "17 Peg-E 代币",
      "20 Peg-E tokens": "20 Peg-E 代币",
      "22 Peg-E tokens": "22 Peg-E 代币",
      "25 Peg-E tokens": "25 Peg-E 代币",
      "27 Peg-E tokens": "27 Peg-E 代币",
      "30 Peg-E tokens": "30 Peg-E 代币",
      "35 Peg-E tokens": "35 Peg-E 代币",
      "40 Peg-E tokens": "40 Peg-E 代币",
      "50 Peg-E tokens": "50 Peg-E 代币",
      "70 Peg-E tokens": "70 Peg-E 代币",
      "60 Flags": "60 旗帜",
      "80 Flags": "80 旗帜",
      "100 Flags": "100 旗帜",
      "120 Flags": "120 旗帜",
      "140 Flags": "140 旗帜",
      "30 dice": "30 骰子",
      "55 dice": "55 骰子",
      "135 dice": "135 骰子",
      "150 dice": "150 骰子",
      "175 dice": "175 骰子",
      "375 dice": "375 骰子",
      "400 dice": "400 骰子",
      "450 dice": "450 骰子",
      "500 dice": "500 骰子",
      "550 dice": "550 骰子",
      "600 dice": "600 骰子",
      "650 dice": "650 骰子",
      "700 dice": "700 骰子",
      "750 dice": "750 骰子",
      "1000 dice": "1000 骰子",
      "2500 dice": "2500 骰子",
      "3000 dice": "3000 骰子",
      "3500 dice": "3500 骰子",
      "High Roller 5 min": "High Roller 5 分钟",
      "Cash Boost 10 min": "Cash Boost 10 分钟",
      "Mega Heist 30 min": "Mega Heist 30 分钟",
      "Builder's Bash 30 min": "Builder's Bash 30 分钟"
    }
  },
  "zh-TW": {
    diceLabels: {
      "daily-2": "25 骰子社群獎勵",
      "daily-3": "今日骰子連結檢查",
      "backup-official": "官方獎勵頁"
    },
    diceNotes: {
      "daily-2": "5 月 21 日社群分享的福利入口。請在手機上打開，在遊戲內驗證後再標記已處理。",
      "daily-3": "公開骰子連結頁更新很快，連結也會快速過期。花骰子衝活動前先做這次檢查。",
      "backup-official": "當社群連結互相衝突時，用這個官方入口做兜底驗證。"
    },
    eventNames: {
      "quick-wins": "Quick Wins 日常",
      "puppet-party": "Puppet Party 主活動",
      "peg-e-prize-drop": "Peg-E Prize Drop",
      "aladdin-racers": "Aladdin Racers",
      "sticker-boom": "Sticker Boom 觀察",
      "golden-blitz-watch": "Golden Blitz 觀察",
      "high-roller": "High Roller 觀察"
    },
    eventTypes: {
      daily: "每日",
      main: "主活動",
      special: "特殊活動",
      race: "競速",
      boost: "加成",
      trade: "交易"
    },
    eventStatuses: {
      active: "進行中",
      watch: "觀察"
    },
    bestFor: {
      "sticker packs": "貼紙包",
      "daily progress": "日常進度",
      "low dice accounts": "低骰子帳號",
      "opening vaults": "開保險箱",
      "large sticker packs": "大貼紙包",
      "album pushes": "相簿推進",
      "gold sticker trades": "金卡交易",
      "album completion": "相簿補齊",
      "friend trading": "好友交易",
      "large dice banks": "大骰子庫存",
      "top event milestones": "高階活動里程碑",
      "tournament push": "錦標賽推進",
      "landmark upgrades": "地標升級",
      "net worth jumps": "淨資產提升",
      "board rush": "棋盤推進",
      "Peg-E tokens": "Peg-E 代幣",
      "racing flags": "賽車旗幟",
      "corner scoring": "角落格得分",
      "free rolls": "免費擲骰",
      "sticker value": "貼紙收益",
      "team racing": "團隊賽車",
      "race dice": "賽車骰子"
    },
    eventActions: {
      "quick-wins": [
        "這是每日阻塞項，不是花骰子的觸發窗口。",
        "先完成三項任務，再判斷活動 ROI，因為貼紙包和小獎勵會改變今日計畫。",
        "本站按 America/New_York 時區上午 8:00 的遊戲日重置；如果遊戲內倒數不同，以遊戲內為準。"
      ],
      "puppet-party": [
        "先用 ROI 選一個可承受的里程碑，不要直接追完整獎勵表。",
        "這個活動按角落格計分，接近 Go、監獄、Free Parking、Go To Jail 時再提高倍數。",
        "如果同時需要賽車旗幟或 Peg-E 代幣，優先拿中段獎勵後停手重算。"
      ],
      "peg-e-prize-drop": [
        "把活動和錦標賽拿到的 Peg-E 代幣集中使用，不要零散投入。",
        "先確認是否有貼紙包或萬能卡目標，再決定是否繼續衝代幣里程碑。",
        "如果骰子庫存低，把 Peg-E 當成補貼，不要為代幣硬追深層獎勵。"
      ],
      "aladdin-racers": [
        "先和隊友確認目標，不要獨自把旗幟一次性打空。",
        "把 Quick Wins、免費禮物和主活動中的旗幟都算進總預算。",
        "只在團隊目標明確時投入大倍數，否則先保留骰子。"
      ],
      "sticker-boom": [
        "先把保險箱和大貼紙包停住，等遊戲內真的出現加成再開。",
        "如果加成沒出現，先清交易隊列，貼紙包繼續保留。",
        "這只是觀察觸發點，不要把它當成官方確認窗口。"
      ],
      "golden-blitz-watch": [
        "提前準備可交易金卡截圖和缺卡目標。",
        "傳聞中的 Blitz 卡先別急著用萬能卡，等遊戲內組合確認。",
        "窗口開啟前，先把交易對象備註保存在本地。"
      ],
      "high-roller": [
        "只有骰子庫存能承受波動時才用。",
        "最好搭配 Puppet Party 角落格位置，或賽車旗幟目標。",
        "當下一個里程碑消耗超過目標回報時立即停手。"
      ]
    },
    milestoneRewards: {
      "10 dice": "10 骰子",
      "Cash": "現金",
      "1-star sticker pack": "1 星貼紙包",
      "40 dice": "40 骰子",
      "80 dice": "80 骰子",
      "Mega Heist 10 min": "Mega Heist 10 分鐘",
      "125 dice": "125 骰子",
      "2-star sticker pack": "2 星貼紙包",
      "220 dice": "220 骰子",
      "3-star sticker pack": "3 星貼紙包",
      "350 dice": "350 骰子",
      "Cash + boost": "現金 + 加成",
      "4-star sticker pack": "4 星貼紙包",
      "900 dice": "900 骰子",
      "5-star sticker pack": "5 星貼紙包",
      "1400 dice": "1400 骰子",
      "5 Peg-E tokens": "5 Peg-E 代幣",
      "8 Peg-E tokens": "8 Peg-E 代幣",
      "10 Peg-E tokens": "10 Peg-E 代幣",
      "12 Peg-E tokens": "12 Peg-E 代幣",
      "15 Peg-E tokens": "15 Peg-E 代幣",
      "17 Peg-E tokens": "17 Peg-E 代幣",
      "20 Peg-E tokens": "20 Peg-E 代幣",
      "22 Peg-E tokens": "22 Peg-E 代幣",
      "25 Peg-E tokens": "25 Peg-E 代幣",
      "27 Peg-E tokens": "27 Peg-E 代幣",
      "30 Peg-E tokens": "30 Peg-E 代幣",
      "35 Peg-E tokens": "35 Peg-E 代幣",
      "40 Peg-E tokens": "40 Peg-E 代幣",
      "50 Peg-E tokens": "50 Peg-E 代幣",
      "70 Peg-E tokens": "70 Peg-E 代幣",
      "60 Flags": "60 旗幟",
      "80 Flags": "80 旗幟",
      "100 Flags": "100 旗幟",
      "120 Flags": "120 旗幟",
      "140 Flags": "140 旗幟",
      "30 dice": "30 骰子",
      "55 dice": "55 骰子",
      "135 dice": "135 骰子",
      "150 dice": "150 骰子",
      "175 dice": "175 骰子",
      "375 dice": "375 骰子",
      "400 dice": "400 骰子",
      "450 dice": "450 骰子",
      "500 dice": "500 骰子",
      "550 dice": "550 骰子",
      "600 dice": "600 骰子",
      "650 dice": "650 骰子",
      "700 dice": "700 骰子",
      "750 dice": "750 骰子",
      "1000 dice": "1000 骰子",
      "2500 dice": "2500 骰子",
      "3000 dice": "3000 骰子",
      "3500 dice": "3500 骰子",
      "High Roller 5 min": "High Roller 5 分鐘",
      "Cash Boost 10 min": "Cash Boost 10 分鐘",
      "Mega Heist 30 min": "Mega Heist 30 分鐘",
      "Builder's Bash 30 min": "Builder's Bash 30 分鐘"
    }
  }
};

init();

async function init() {
  siteData = cloneData(window.RollRadarSeed?.siteData || {});
  i18n = cloneData(window.RollRadarSeed?.i18n || {});
  if (!siteData.meta || !i18n.en) {
    showFatalState("Seed data is missing. Rebuild assets/js/seed-data.js.");
    return;
  }
  loadLiveCache();
  applyLanguage(currentLang);
  ensureDailyReset();
  bindLanguage();
  bindAdProviderRefresh();
  hydrateSavedInputs();
  bindHomePlanner();
  syncRuntimeFreshnessState();
  renderShared();
  renderByPage();
  stampFreshness(lastRefreshMode);
  scheduleRefreshCheck();
  scheduleDailyResetCheck();
  bindVisibilityRefresh();
  injectAnalyticsHook();
  await refreshContentNow({ reason: "startup", force: shouldForceRefreshOnOpen() });
}

async function fetchJson(url) {
  const nextUrl = new URL(url.href);
  nextUrl.searchParams.set("v", Date.now());
  const response = await fetch(nextUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Failed to load ${url.href}`);
  return response.json();
}

async function refreshContentNow({ reason = "manual", force = false } = {}) {
  if (!force && refreshInFlight) return refreshInFlight;
  refreshInFlight = (async () => {
    const previousData = cloneData(siteData);
    const previousI18n = cloneData(i18n);
    const startedAt = new Date().toISOString();
    setRefreshFeedback("checking", reason, startedAt);
    syncRuntimeFreshnessState("checking");
    renderShared();
    renderByPage();
    stampFreshness("checking");
    try {
      const [data, translations] = await Promise.all([fetchJson(DATA_URL), fetchJson(I18N_URL)]);
      siteData = data;
      i18n = translations;
      saveLiveCache();
      lastRefreshMode = "live";
      setRefreshFeedback("live", reason, startedAt);
    } catch (error) {
      console.info("Using bundled or cached data because live JSON refresh is unavailable.", error);
      if (loadLiveCache()) {
        lastRefreshMode = "cache";
        setRefreshFeedback("cache", reason, startedAt, error);
      } else {
        siteData = previousData;
        i18n = previousI18n;
        lastRefreshMode = "seed";
        setRefreshFeedback("seed", reason, startedAt, error);
      }
    }
    syncRuntimeFreshnessState(lastRefreshMode);
    applyLanguage(currentLang);
    renderShared();
    renderByPage();
    stampFreshness(lastRefreshMode);
  })();
  try {
    await refreshInFlight;
  } finally {
    refreshInFlight = null;
  }
}

function adConfig() {
  return window.RollRadarConfig || {};
}

function adBootstrapState() {
  return window.RollRadarAdsBoot || {};
}

function adsensePlacementsReady() {
  return adConfig().adsensePlacementsReady === true;
}

function currentAdProvider() {
  const runtime = adBootstrapState();
  const configured = String(adConfig().adProvider || "").toLowerCase();
  const provider = String(runtime.activeProvider || configured || "ezoic").toLowerCase();
  return provider === "adsense" ? "adsense" : "ezoic";
}

function bindAdProviderRefresh() {
  window.addEventListener("rollradar:ads-provider-changed", () => {
    AD_STATE.renderedKeys.clear();
    document.querySelectorAll("[data-ad-key]").forEach((slot) => {
      delete slot.dataset.renderedProvider;
      delete slot.dataset.renderedKey;
    });
    renderAdSlots();
  });
}

function renderAdSlots() {
  const slots = document.querySelectorAll("[data-ad-key]");
  if (!slots.length) return;
  AD_STATE.activeProvider = currentAdProvider();
  slots.forEach((slot) => renderAdSlot(slot));
}

function renderAdSlot(slotRoot) {
  const slotKey = slotRoot.dataset.adKey;
  const mount = slotRoot.querySelector("[data-ad-mount]");
  const placement = adConfig().adPlacements?.[slotKey];
  if (!slotKey || !mount || !placement) return;
  const provider = currentAdProvider();
  const adLabel = slotRoot.querySelector("[data-i18n='adLabel']");
  if (
    slotRoot.dataset.renderedProvider === provider &&
    slotRoot.dataset.renderedKey === slotKey &&
    mount.childElementCount > 0
  ) {
    return;
  }
  slotRoot.dataset.adProvider = provider;
  mount.innerHTML = "";

  if (provider === "ezoic" && Number.isFinite(Number(placement.ezoicSlot))) {
    slotRoot.hidden = false;
    if (adLabel) adLabel.hidden = false;
    renderEzoicSlot(mount, Number(placement.ezoicSlot), slotKey);
    return;
  }
  if (
    provider === "adsense" &&
    adsensePlacementsReady() &&
    placement.adsenseSlot &&
    adConfig().adsenseClient
  ) {
    slotRoot.hidden = false;
    if (adLabel) adLabel.hidden = false;
    renderAdsenseSlot(mount, placement.adsenseSlot, slotKey);
    return;
  }
  mount.innerHTML = "";
  slotRoot.hidden = true;
}

function renderEzoicSlot(mount, slotId, slotKey) {
  mount.innerHTML = `<div id="ezoic-pub-ad-placeholder-${slotId}"></div>`;
  const runtime = window.ezstandalone;
  if (!runtime?.cmd?.push || typeof runtime.showAds !== "function") {
    mount.insertAdjacentHTML("beforeend", `<div class="ad-slot-note">${escapeHtml(t("adLoadingEzoic") || "Loading optimized ad placement...")}</div>`);
    return;
  }
  if (AD_STATE.renderedKeys.has(`ezoic:${slotKey}`)) return;
  AD_STATE.renderedKeys.add(`ezoic:${slotKey}`);
  mount.closest("[data-ad-key]")?.setAttribute("data-rendered-provider", "ezoic");
  mount.closest("[data-ad-key]")?.setAttribute("data-rendered-key", slotKey);
  runtime.cmd.push(function showEzoicSlot() {
    runtime.showAds(slotId);
  });
}

function renderAdsenseSlot(mount, adSlot, slotKey) {
  mount.innerHTML = `<ins class="adsbygoogle" style="display:block" data-ad-client="${escapeHtmlAttr(adConfig().adsenseClient)}" data-ad-slot="${escapeHtmlAttr(adSlot)}" data-ad-format="auto" data-full-width-responsive="true"></ins>`;
  if (AD_STATE.renderedKeys.has(`adsense:${slotKey}`)) return;
  try {
    (window.adsbygoogle = window.adsbygoogle || []).push({});
    AD_STATE.renderedKeys.add(`adsense:${slotKey}`);
    mount.closest("[data-ad-key]")?.setAttribute("data-rendered-provider", "adsense");
    mount.closest("[data-ad-key]")?.setAttribute("data-rendered-key", slotKey);
  } catch (error) {
    console.warn("AdSense slot push failed", error);
  }
}

function detectLang() {
  const language = navigator.language || "en";
  if (language.toLowerCase().startsWith("zh-tw") || language.toLowerCase().startsWith("zh-hk")) return "zh-TW";
  if (language.toLowerCase().startsWith("zh")) return "zh-CN";
  return "en";
}

function t(key) {
  return i18n?.[currentLang]?.[key] || i18n?.en?.[key] || "";
}

function translateOr(key, fallback) {
  return t(key) || fallback || key;
}

function dataText(section, key, fallback = "") {
  return DATA_TEXT[currentLang]?.[section]?.[key] || fallback || key;
}

function diceLabel(link) {
  return dataText("diceLabels", link.id, link.label);
}

function diceNote(link) {
  return dataText("diceNotes", link.id, link.note);
}

function eventName(event) {
  return dataText("eventNames", event.id, event.name);
}

function eventTypeLabel(type) {
  return dataText("eventTypes", type, type);
}

function eventStatusLabel(status) {
  return dataText("eventStatuses", status, status);
}

function eventBestFor(event) {
  return (event.bestFor || []).map((item) => dataText("bestFor", item, item));
}

function eventActionList(event) {
  return DATA_TEXT[currentLang]?.eventActions?.[event.id] || event.actions || [];
}

function eventPrimaryAction(event) {
  return eventActionList(event)[0] || t("eventPreparedReason");
}

function milestoneRewardLabel(reward) {
  return dataText("milestoneRewards", reward, reward);
}

function applyLanguage(lang) {
  currentLang = i18n[lang] ? lang : "en";
  document.documentElement.lang = currentLang;
  document.documentElement.dataset.lang = currentLang;
  document.documentElement.classList.toggle("is-cjk", currentLang.startsWith("zh"));
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-source-label]").forEach((node) => {
    node.textContent = sourceLabel(node.dataset.sourceLabel);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  const select = document.getElementById("languageSelect");
  if (select) select.value = currentLang;
  state.lang = currentLang;
  saveState();
}

function bindLanguage() {
  const select = document.getElementById("languageSelect");
  if (!select) return;
  select.addEventListener("change", () => {
    applyLanguage(select.value);
    renderShared();
    renderByPage();
  });
}

function pageLink(name) {
  if (name === "disclaimer") return window.location.pathname.includes("/pages/") ? "disclaimer.html" : "pages/disclaimer.html";
  return window.location.pathname.includes("/pages/") ? `${name}.html` : `pages/${name}.html`;
}

function homeLink(hash = "") {
  return window.location.pathname.includes("/pages/") ? `../index.html${hash}` : `index.html${hash}`;
}

function resolveLocalHref(href) {
  if (!href || /^https?:\/\//i.test(href) || href.startsWith("#")) return href;
  const insidePages = window.location.pathname.includes("/pages/");
  if (insidePages) {
    if (href.startsWith("pages/")) return href.replace(/^pages\//, "");
    if (href.startsWith("index.html")) return `../${href}`;
    return href;
  }
  if (href.startsWith("../index.html")) return href.replace(/^\.\.\//, "");
  if (/^(free-dice|events|stickers|roi-calculator)\.html/.test(href)) return `pages/${href}`;
  return href;
}

function renderShared() {
  renderAdSlots();
  const diceLinkCount = document.getElementById("diceLinkCount");
  const eventCount = document.getElementById("eventCount");
  const savedPlanStatus = document.getElementById("savedPlanStatus");
  const nextRefreshStatus = document.getElementById("nextRefreshStatus");
  const heroResetSummary = document.getElementById("heroResetSummary");
  const plan = updateTodayPlan();
  if (diceLinkCount) diceLinkCount.textContent = claimableDiceLinks().length;
  if (eventCount) eventCount.textContent = confirmedSpendEvents().length;
  if (savedPlanStatus) savedPlanStatus.textContent = plan ? t(`planPhase_${plan.phase}`) : t("ready");
  const reset = gameDayResetInfo();
  if (nextRefreshStatus) nextRefreshStatus.textContent = formatTime(reset.next);
  if (heroResetSummary) {
    heroResetSummary.textContent = template(t("heroOverlayCopy"), {
      time: formatTime(reset.next),
      zone: quickWinsResetLabel()
    });
  }
  renderHeroCommandStrip(plan);
  renderDicePreview();
  renderEventPreview();
  renderDailyChecklist();
  renderNextActions();
  renderTargetChips();
  renderResourceGap();
  renderQuickstartGuide();
  renderPlanDriversPanel();
  updateBestMove();
  updateStickerAdvice();
  renderDiceImpactPanel();
  renderEventImpactPanel();
  renderStickerImpactPanel();
  renderRoiImpactPanel();
  renderDailySessionPanel();
}

function renderByPage() {
  if (document.getElementById("diceList")) renderDiceList();
  if (document.getElementById("eventList")) renderEventList();
  if (document.getElementById("eventFilters")) renderEventFilters();
  if (document.getElementById("eventPlanPanel")) renderEventPlanPanel();
  if (document.getElementById("blitzPrepResult")) bindBlitzPrep();
  if (document.getElementById("roiForm")) bindRoiCalculator();
  if (document.getElementById("stickerPlanner")) bindStickerPlanner();
  if (document.getElementById("vaultDecisionResult")) bindVaultDecision();
  if (document.getElementById("diceImpactPanel")) renderDiceImpactPanel();
  if (document.getElementById("eventImpactPanel")) renderEventImpactPanel();
  if (document.getElementById("stickerImpactPanel")) renderStickerImpactPanel();
  if (document.getElementById("roiImpactPanel")) renderRoiImpactPanel();
  if (document.getElementById("sourceMatrix")) renderSourceMatrix();
  if (document.getElementById("changelogList")) renderChangelog();
}

function renderDicePreview() {
  const target = document.getElementById("dicePreview");
  if (!target) return;
  target.innerHTML = "";
  const links = claimableDiceLinks();
  if (!links.length) {
    target.appendChild(miniItem(t("dicePreviewEmptyTitle"), t("dicePreviewEmptyCopy"), "official"));
    return;
  }
  links.slice(0, 3).forEach((link) => {
    const detail = link.dice
      ? template(t("dicePreviewValue"), { dice: link.dice })
      : t("dicePreviewOfficial");
    target.appendChild(miniItem(diceLabel(link), detail, link.source));
  });
}

function renderEventPreview() {
  const target = document.getElementById("eventPreview");
  if (!target) return;
  target.innerHTML = "";
  const events = [...confirmedSpendEvents(), ...watchOnlyEvents()];
  if (!events.length) {
    target.appendChild(miniItem(t("eventPreviewEmptyTitle"), t("eventPreviewEmptyCopy"), "public"));
    return;
  }
  events.slice(0, 3).forEach((event) => {
    target.appendChild(miniItem(eventName(event), timeUntil(event.endsAt), event.source));
  });
}

function renderHeroCommandStrip(plan = updateTodayPlan()) {
  const target = document.getElementById("heroCommandStrip");
  if (!target) return;
  const context = gatherPlanContext();
  const items = [
    {
      label: t("commandNext"),
      value: plan.nextAction || t("openToolShort"),
      detail: plan.block || t("planBlockDice"),
      tone: plan.phase === "push" ? "good" : plan.phase === "hold" || plan.phase === "choose" ? "warn" : "hot"
    },
    {
      label: t("commandReserve"),
      value: template(t("commandReserveValue"), { dice: plan.reserve ?? context.reserve }),
      detail: template(t("commandAfterValue"), { dice: plan.after ?? context.after }),
      tone: (plan.after ?? context.after) < context.reserve ? "hot" : "good"
    },
    {
      label: t("commandWindow"),
      value: plan.triggerEventId ? eventName(context.triggerEvent) : t("chooseTrigger"),
      detail: plan.triggerEventId ? plan.triggerLabel : t("eventNoTriggerCopy"),
      tone: plan.triggerEventId ? "good" : "warn"
    }
  ];
  target.innerHTML = items.map((item) => `
    <div class="command-pill tone-${item.tone}">
      <small>${escapeHtml(item.label)}</small>
      <strong>${escapeHtml(item.value)}</strong>
      <span>${escapeHtml(item.detail)}</span>
    </div>
  `).join("");
}

function miniItem(title, detail, source) {
  const item = document.createElement("div");
  item.className = "mini-item";
  item.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(detail)}</span><div class="event-meta">${sourcePill(source)}</div>`;
  return item;
}

function renderDailyChecklist() {
  const target = document.getElementById("dailyChecklist");
  if (!target) return;
  ensureDailyReset();
  renderDailyResetPanel();
  const items = getChecklistItems();
  target.innerHTML = "";
  items.forEach((item, index) => {
    const li = document.createElement("li");
    const checked = state.checks?.[index] ? "checked" : "";
    li.innerHTML = `
      <div class="check-card ${checked ? "is-done" : ""}">
        <label>
          <input type="checkbox" data-check="${index}" ${checked}>
          <span>
            <strong>${escapeHtml(item.label)}</strong>
            <small>${escapeHtml(item.impact)}</small>
          </span>
        </label>
        <div class="check-actions">
          ${actionControl({ control: item.control })}
        </div>
      </div>
    `;
    target.appendChild(li);
  });
  target.querySelectorAll("[data-check]").forEach((box) => {
    box.addEventListener("change", () => {
      state.checks ||= {};
      state.checks[box.dataset.check] = box.checked;
      state.checkDay = gameDayKey();
      saveState();
      renderShared();
    });
  });
  bindActionControls(target);
}

function renderDailyResetPanel() {
  const target = document.getElementById("dailyResetPanel");
  if (!target) return;
  const reset = gameDayResetInfo();
  const done = getChecklistItems().filter((_, index) => state.checks?.[index]).length;
  target.innerHTML = `
    <div>
      <strong>${template(t("dailyResetTitle"), { done, total: getChecklistItems().length })}</strong>
      <span>${template(t("dailyResetCopy"), { time: formatTime(reset.next), left: timeUntil(reset.next.toISOString()), zone: quickWinsResetLabel() })}</span>
      <small>${t("dailyResetSource")}</small>
    </div>
    <button class="btn mini-btn" type="button" data-reset-daily>${t("resetToday")}</button>
  `;
  target.querySelector("[data-reset-daily]")?.addEventListener("click", () => {
    state.checks = {};
    state.checkDay = gameDayKey();
    saveState();
    renderShared();
  });
}

function renderNextActions() {
  const target = document.getElementById("nextActions");
  if (!target) return;
  const actions = recommendActions();
  target.innerHTML = actions.map((item) => `
    <div class="action-item priority-${item.priority}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.copy)}</span>
        <small>${escapeHtml(item.reason)}</small>
      </div>
      ${actionControl(item)}
    </div>
  `).join("");
  bindActionControls(target);
}

function dailySessionSteps(context = gatherPlanContext(), plan = updateTodayPlan()) {
  const diceDone = context.links.length > 0 && context.unclaimedLinks.length === 0 && context.unappliedClaimedDice === 0;
  const quickWinsDone = Boolean(state.checks?.[1]);
  const triggerDone = !context.triggerRequired || Boolean(plan.triggerEventId);
  const stickerDone = Boolean(state.checks?.[2]) || context.openTrades.length > 0 || context.goldBlocked || context.missingStickers <= 3;
  const roiDone = Boolean(state.roiPlan?.target);
  return [
    {
      id: "dice",
      done: diceDone,
      title: diceDone ? t("sessionDiceDone") : t("sessionDiceTitle"),
      copy: diceDone ? t("sessionDiceDoneCopy") : template(t("sessionDiceCopy"), { count: context.unclaimedLinks.length }),
      minutes: diceDone ? 0 : 1,
      control: context.unappliedClaimedDice > 0
        ? { type: "button", action: "apply-dice-bank", label: t("applyToPlan") }
        : { type: "link", href: pageLink("free-dice"), label: t("claimDice") }
    },
    {
      id: "quickwins",
      done: quickWinsDone,
      title: quickWinsDone ? t("sessionQuickWinsDone") : t("sessionQuickWinsTitle"),
      copy: quickWinsDone ? t("sessionQuickWinsDoneCopy") : t("sessionQuickWinsCopy"),
      minutes: quickWinsDone ? 0 : 2,
      control: { type: "check", index: 1, label: quickWinsDone ? t("checked") : t("markDone") }
    },
    {
      id: "window",
      done: triggerDone,
      title: triggerDone ? t("sessionWindowDone") : t("sessionWindowTitle"),
      copy: triggerDone ? template(t("sessionWindowDoneCopy"), { window: plan.triggerLabel || t("ready") }) : t("sessionWindowCopy"),
      minutes: triggerDone ? 0 : 1,
      control: { type: "link", href: pageLink("events"), label: triggerDone ? t("viewEvents") : t("chooseTrigger") }
    },
    {
      id: "stickers",
      done: stickerDone,
      title: stickerDone ? t("sessionStickerDone") : t("sessionStickerTitle"),
      copy: stickerDone ? template(t("sessionStickerDoneCopy"), { missing: context.missingStickers }) : template(t("sessionStickerCopy"), { missing: context.missingStickers }),
      minutes: stickerDone ? 0 : 2,
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    },
    {
      id: "roi",
      done: roiDone,
      title: roiDone ? t("sessionRoiDone") : t("sessionRoiTitle"),
      copy: roiDone ? template(t("sessionRoiDoneCopy"), { target: state.roiPlan.target, verdict: state.roiPlan.verdict || t("ready") }) : t("sessionRoiCopy"),
      minutes: roiDone ? 0 : 2,
      control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
    }
  ];
}

function updateDailyVisitStats(doneCount, total) {
  const currentDay = gameDayKey();
  const stats = state.dailySession || {};
  if (stats.lastSeenDay !== currentDay) {
    const previous = stats.lastSeenDay ? new Date(`${stats.lastSeenDay}T00:00:00Z`) : null;
    const current = new Date(`${currentDay}T00:00:00Z`);
    const dayDiff = previous ? Math.round((current - previous) / 86400000) : 0;
    stats.streak = dayDiff === 1 ? (Number(stats.streak) || 0) + 1 : 1;
    stats.firstSeenAt = stats.firstSeenAt || new Date().toISOString();
    stats.lastSeenDay = currentDay;
  }
  stats.bestDone = Math.max(Number(stats.bestDone) || 0, doneCount);
  stats.total = total;
  stats.updatedAt = new Date().toISOString();
  state.dailySession = stats;
  saveState();
  return stats;
}

function renderDailySessionPanel() {
  const target = document.getElementById("dailySessionPanel");
  if (!target) return;
  const context = gatherPlanContext();
  const plan = updateTodayPlan() || {};
  const steps = dailySessionSteps(context, plan);
  const doneCount = steps.filter((step) => step.done).length;
  const remainingMinutes = steps.reduce((sum, step) => sum + (step.done ? 0 : step.minutes), 0);
  const stats = updateDailyVisitStats(doneCount, steps.length);
  const score = document.getElementById("dailySessionScore");
  const streak = document.getElementById("dailySessionStreak");
  const copy = document.getElementById("dailySessionCopy");
  const bar = document.getElementById("dailySessionProgress");
  if (score) score.textContent = `${doneCount}/${steps.length}`;
  if (streak) streak.textContent = template(t("dailySessionStreak"), { days: stats.streak || 1 });
  if (copy) copy.textContent = remainingMinutes > 0
    ? template(t("dailySessionRemaining"), { minutes: remainingMinutes })
    : t("dailySessionComplete");
  if (bar) bar.style.width = `${Math.max(4, Math.round((doneCount / steps.length) * 100))}%`;
  target.innerHTML = steps.map((step, index) => `
    <div class="session-step ${step.done ? "is-done" : ""}">
      <div class="session-index">${String(index + 1).padStart(2, "0")}</div>
      <div>
        <strong>${escapeHtml(step.title)}</strong>
        <span>${escapeHtml(step.copy)}</span>
        <small>${escapeHtml(step.done ? t("completed") : template(t("sessionTimeNeeded"), { minutes: step.minutes }))}</small>
      </div>
      ${actionControl({ control: step.control })}
    </div>
  `).join("");
  bindActionControls(target);
}

function bindHomePlanner() {
  ["homeDiceBank", "homeCurrentPoints", "homeTargetPoints", "missingStickerCount", "goldBlockedCheck"].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.addEventListener("input", () => {
      persistHomeInputs();
      requestSharedRender();
    });
    el.addEventListener("change", () => {
      persistHomeInputs();
      requestSharedRender();
    });
  });
  const save = document.getElementById("saveHomePlan");
  if (save) {
    save.addEventListener("click", () => {
      persistHomeInputs();
      updateTodayPlan();
      renderShared();
      save.textContent = t("saved");
      setTimeout(() => (save.textContent = t("updatePlan")), 1100);
    });
  }
}

function hydrateSavedInputs() {
  const plan = state.plan || {};
  setValue("homeDiceBank", plan.diceBank ?? 1200);
  setValue("homeCurrentPoints", plan.currentPoints ?? 300);
  setValue("homeTargetPoints", plan.targetPoints ?? 900);
  setValue("missingStickerCount", plan.missingStickers ?? 8);
  const gold = document.getElementById("goldBlockedCheck");
  if (gold) gold.checked = Boolean(plan.goldBlocked);
}

function persistHomeInputs() {
  state.plan = {
    diceBank: numberValue("homeDiceBank"),
    currentPoints: numberValue("homeCurrentPoints"),
    targetPoints: numberValue("homeTargetPoints"),
    missingStickers: numberValue("missingStickerCount"),
    goldBlocked: Boolean(document.getElementById("goldBlockedCheck")?.checked)
  };
  saveState();
}

function updateTodayPlan() {
  const plan = deriveTodayPlan(gatherPlanContext());
  state.planSummary = plan;
  saveState();
  return plan;
}

function requestSharedRender() {
  if (requestSharedRender.pending) return;
  requestSharedRender.pending = true;
  requestAnimationFrame(() => {
    requestSharedRender.pending = false;
    renderShared();
  });
}
requestSharedRender.pending = false;

function gatherPlanContext() {
  const planState = state.plan || {};
  const stickerState = state.stickers || {};
  const vault = state.vault || {};
  const blitz = state.blitzPrep || {};
  const roiPlan = state.roiPlan || {};
  const trades = stickerState.trades || [];
  const links = claimableDiceLinks();
  normalizeClaimedLinks(links);
  const claimedLinks = links.filter(isDiceLinkClaimed);
  const claimedDice = claimedLinks.reduce((sum, link) => sum + (Number(link.dice) || 0), 0);
  const appliedClaimedMap = state.appliedClaimedLinkIds || {};
  let appliedClaimedDice = claimedLinks
    .filter((link) => appliedClaimedMap[link.id])
    .reduce((sum, link) => sum + (Number(link.dice) || 0), 0);
  if (!Object.keys(appliedClaimedMap).length && Number(planState.appliedClaimedDice) > 0) {
    appliedClaimedDice = Math.min(claimedDice, Number(planState.appliedClaimedDice) || 0);
  }
  const unappliedClaimedDice = Math.max(0, claimedDice - appliedClaimedDice);
  const unclaimedLinks = links.filter((link) => !isDiceLinkClaimed(link));
  const events = activeEvents();
  const preparedEvents = events.filter((event) => isPreparedEvent(event.id));
  const selectedTrigger = events.find((event) => event.id === state.planTriggerEventId && isSpendTriggerEvent(event)) || null;
  const stickerBoom = events.find((event) => event.id === "sticker-boom") || null;
  const goldenBlitz = events.find((event) => event.id.includes("golden")) || null;
  const triggerEvent = selectedTrigger || null;
  const diceBank = numberValue("homeDiceBank", planState.diceBank ?? state.roi?.dice ?? 1200);
  const currentPoints = numberValue("homeCurrentPoints", planState.currentPoints ?? state.roi?.current ?? 300);
  const targetPoints = numberValue("homeTargetPoints", planState.targetPoints ?? state.roi?.target ?? 900);
  const missingStickers = numberValue("missingStickerCount", planState.missingStickers ?? stickerState.missing ?? 8);
  const goldBlocked = Boolean(document.getElementById("goldBlockedCheck")?.checked ?? planState.goldBlocked ?? stickerState.gold);
  const dupes = stickerState.dupes ?? 12;
  const gap = Math.max(0, targetPoints - currentPoints);
  const multiplier = roiPlan.multiplier || state.roi?.multiplier || 10;
  const roiContext = roiPlan.context || roiContextScore({
    windowId: roiPlan.windowId || state.roi?.windowId || state.planTriggerEventId || "none",
    boardState: roiPlan.boardState || state.roi?.boardState || "neutral",
    boostState: roiPlan.boostState || state.roi?.boostState || "none"
  });
  const savedCostApplies = Number(roiPlan.current) === currentPoints && Number(roiPlan.target) === targetPoints;
  const cost = savedCostApplies && Number.isFinite(Number(roiPlan.cost))
    ? Number(roiPlan.cost)
    : Math.max(multiplier, Math.round(estimateDiceCost(gap, multiplier) * (roiContext.costFactor || 1)));
  const openTrades = trades.filter((trade) => !trade.done);
  const reserve = roiPlan.reserve ?? (goldBlocked ? 900 : missingStickers <= 3 ? 450 : openTrades.length ? 400 : 250);
  const effectiveDice = diceBank + unappliedClaimedDice;
  const after = Math.max(0, effectiveDice - cost);
  const canPush = gap > 0 && cost <= Math.max(0, effectiveDice - reserve);
  const stopLine = roiPlan.stopLine ?? Math.max(currentPoints, targetPoints - Math.max(100, Math.floor(gap * 0.25)));
  const quickWinsDone = Boolean(state.checks?.[1]);
  const triggerRequired = confirmedSpendEvents().length > 0;
  const dataUsable = isCurrentDataUsable();
  return {
    planState,
    stickerState,
    vault,
    blitz,
    roiPlan,
    trades,
    openTrades,
    links,
    claimedLinks,
    claimedDice,
    appliedClaimedMap,
    appliedClaimedDice,
    unappliedClaimedDice,
    unclaimedLinks,
    preparedEvents,
    stickerBoom,
    goldenBlitz,
    triggerEvent,
    diceBank,
    effectiveDice,
    currentPoints,
    targetPoints,
    missingStickers,
    goldBlocked,
    dupes,
    gap,
    multiplier,
    cost,
    roiContext,
    reserve,
    after,
    canPush,
    stopLine,
    quickWinsDone,
    triggerRequired,
    dataUsable
  };
}

function deriveTodayPlan(context) {
  const hasWindowWait = context.triggerEvent && new Date(context.triggerEvent.startsAt).getTime() > Date.now();
  const blitzPressure = Number.isFinite(context.blitz.left) && context.blitz.left > 0 && (context.goldBlocked || context.openTrades.length > 0 || Boolean(context.goldenBlitz));
  const vaultWait = context.vault.lastVerdict === "wait";
  const canTrustDice = context.unclaimedLinks.length === 0 && context.unappliedClaimedDice === 0;
  const savedRoiApplies = Number(context.roiPlan?.current) === context.currentPoints && Number(context.roiPlan?.target) === context.targetPoints;
  let phase = "farm";
  let title = t("planTitleFarm");
  let summary = t("planSummaryFarm");
  let nextTool = pageLink("free-dice");
  let nextAction = t("claimDice");
  let block = t("planBlockDice");

  if (!context.dataUsable) {
    phase = "refresh";
    title = t("planTitleRefresh");
    summary = t("planSummaryRefresh");
    nextTool = homeLink("#dashboard");
    nextAction = t("refreshNow");
    block = t("planBlockRefresh");
  } else if (context.unclaimedLinks.length > 0) {
    phase = "claim";
    title = t("planTitleClaim");
    summary = t("planSummaryClaim");
    nextTool = pageLink("free-dice");
    nextAction = t("claimDice");
    block = t("planBlockDice");
  } else if (context.unappliedClaimedDice > 0) {
    phase = "bank";
    title = t("planTitleBank");
    summary = template(t("planSummaryBank"), { dice: context.unappliedClaimedDice });
    nextTool = pageLink("free-dice");
    nextAction = t("applyToPlan");
    block = t("planBlockBank");
  } else if (!state.checks?.[1]) {
    phase = "quickwins";
    title = t("planTitleQuickWins");
    summary = t("planSummaryQuickWins");
    nextTool = pageLink("events");
    nextAction = t("markDone");
    block = t("planBlockQuickWins");
  } else if (blitzPressure) {
    phase = "prepare";
    title = t("planTitlePrepare");
    summary = template(t("planSummaryBlitz"), { left: context.blitz.left });
    nextTool = pageLink("events");
    nextAction = t("viewEvents");
    block = t("planBlockBlitz");
  } else if (context.triggerRequired && !context.triggerEvent) {
    phase = "choose";
    title = t("planTitleChooseTrigger");
    summary = t("planSummaryChooseTrigger");
    nextTool = pageLink("events");
    nextAction = t("chooseTrigger");
    block = t("planBlockChooseTrigger");
  } else if (hasWindowWait) {
    phase = "wait";
    title = t("planTitleWait");
    summary = template(t("planSummaryWait"), { event: eventName(context.triggerEvent), time: timeUntil(context.triggerEvent.startsAt) });
    nextTool = pageLink("events");
    nextAction = t("viewEvents");
    block = t("planBlockWait");
  } else if (vaultWait) {
    phase = "hold";
    title = t("planTitleHold");
    summary = t("planSummaryHoldVault");
    nextTool = pageLink("stickers");
    nextAction = t("openStickerPlanner");
    block = t("planBlockStickerWindow");
  } else if (savedRoiApplies && context.roiPlan.verdictKey === "stop") {
    phase = "hold";
    title = t("planTitleHold");
    summary = template(t("planSummarySavedRoiStop"), {
      cost: context.roiPlan.cost ?? context.cost,
      reward: context.roiPlan.reward ?? 0
    });
    nextTool = pageLink("roi-calculator");
    nextAction = t("runRoi");
    block = t("planBlockSavedRoi");
  } else if (savedRoiApplies && context.roiPlan.verdictKey === "wait") {
    phase = "wait";
    title = t("planTitleWait");
    summary = template(t("planSummarySavedRoiWait"), {
      window: roiWindowLabel(context.roiPlan.windowId)
    });
    nextTool = pageLink("events");
    nextAction = t("viewEvents");
    block = t("planBlockSavedRoi");
  } else if (!context.triggerRequired) {
    phase = "hold";
    title = t("planTitleRefresh");
    summary = t("eventNoSpendWindowCopy");
    nextTool = pageLink("events");
    nextAction = t("viewEvents");
    block = t("planBlockRefresh");
  } else if (context.canPush && canTrustDice) {
    phase = "push";
    title = t("planTitlePush");
    summary = template(t("planSummaryPush"), { target: context.targetPoints, cost: context.cost });
    nextTool = pageLink("roi-calculator");
    nextAction = t("runRoi");
    block = context.triggerEvent ? t("planBlockWatchWindow") : t("planBlockStopLine");
  } else if (context.gap > 0 && !context.canPush) {
    phase = "hold";
    title = t("planTitleHold");
    summary = template(t("planSummaryHold"), { reserve: context.reserve, cost: context.cost });
    nextTool = pageLink("roi-calculator");
    nextAction = t("runRoi");
    block = t("planBlockStopLine");
  }

  return {
    phase,
    title,
    summary,
    nextTool,
    nextAction,
    block,
    gap: context.gap,
    cost: context.cost,
    after: context.after,
    reserve: context.reserve,
    stopLine: context.stopLine,
    triggerEventId: context.triggerEvent?.id || null,
    triggerLabel: context.triggerEvent ? `${eventName(context.triggerEvent)} · ${timeUntil(new Date(context.triggerEvent.startsAt).getTime() > Date.now() ? context.triggerEvent.startsAt : context.triggerEvent.endsAt)}` : t("ready"),
    diceBank: context.diceBank,
    effectiveDice: context.effectiveDice,
    missingStickers: context.missingStickers,
    openTrades: context.openTrades.length,
    goldBlocked: context.goldBlocked
  };
}

function updateBestMove() {
  const title = document.getElementById("bestMoveTitle");
  const copy = document.getElementById("bestMoveCopy");
  if (!title || !copy) return;
  const plan = updateTodayPlan() || {};
  title.textContent = plan.title || t("planTitleEmpty");
  copy.textContent = plan.summary || t("planCopyEmpty");
}

function updateStickerAdvice() {
  const target = document.getElementById("stickerAdvice");
  if (!target) return;
  const missing = numberValue("missingStickerCount", state.plan?.missingStickers ?? 8);
  const goldBlocked = Boolean(document.getElementById("goldBlockedCheck")?.checked ?? state.plan?.goldBlocked);
  if (goldBlocked) {
    target.textContent = t("stickerGoldAdvice");
  } else if (missing <= 3) {
    target.textContent = t("stickerNearAdvice");
  } else if (missing <= 12) {
    target.textContent = t("stickerMidAdvice");
  } else {
    target.textContent = t("stickerBroadAdvice");
  }
}

function recommendActions() {
  const context = gatherPlanContext();
  const plan = updateTodayPlan() || {};
  const dice = context.effectiveDice;
  const current = context.currentPoints;
  const target = context.targetPoints;
  const missing = context.missingStickers;
  const goldBlocked = context.goldBlocked;
  const checks = state.checks || {};
  const gap = context.gap;
  const cost = context.cost;
  const stickerBoom = context.stickerBoom;
  const openTrades = context.openTrades;
  const actions = [];

  if (context.unclaimedLinks.length > 0) {
    actions.push({
      title: t("actionClaimTitle"),
      copy: t("actionClaimCopy"),
      reason: t("actionClaimReason"),
      priority: "high",
      control: { type: "link", href: pageLink("free-dice"), label: t("claimDice") }
    });
  } else if (context.unappliedClaimedDice > 0) {
    actions.push({
      title: template(t("diceStepApplyTitle"), { claimedDice: context.unappliedClaimedDice }),
      copy: t("diceStepApplyCopy"),
      reason: t("diceStepApplyReason"),
      priority: "high",
      control: { type: "button", action: "apply-dice-bank", label: t("applyToPlan") }
    });
  }

  if (!checks[1]) {
    actions.push({
      title: t("actionQuickWinsTitle"),
      copy: t("actionQuickWinsCopy"),
      reason: t("actionQuickWinsReason"),
      priority: "high",
      control: { type: "check", index: 1, label: t("markDone") }
    });
  }

  if (context.triggerRequired && !context.triggerEvent) {
    actions.push({
      title: t("actionChooseTriggerTitle"),
      copy: t("actionChooseTriggerCopy"),
      reason: t("actionChooseTriggerReason"),
      priority: "high",
      control: { type: "link", href: pageLink("events"), label: t("chooseTrigger") }
    });
  }

  if (!context.triggerRequired) {
    actions.push({
      title: t("eventPreviewEmptyTitle"),
      copy: t("eventPreviewEmptyCopy"),
      reason: t("freshnessStaleCopy"),
      priority: "high",
      control: { type: "button", action: "refresh", label: t("refreshNow") }
    });
  } else if (gap > dice) {
    actions.push({
      title: t("actionNoChaseTitle"),
      copy: t("actionNoChaseCopy"),
      reason: template(t("actionNoChaseReason"), { gap, dice }),
      priority: "high",
      control: { type: "set-target", points: Math.max(current + Math.floor(dice * 0.5), current), label: t("lowerTarget") }
    });
  } else {
    actions.push({
      title: t("actionHardStopTitle"),
      copy: template(t("actionHardStopCopy"), { gap }),
      reason: template(t("actionHardStopReason"), { cost, dice }),
      priority: cost > dice * 0.5 ? "medium" : "normal",
      control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
    });
  }

  if (stickerBoom && !checks[2]) {
    actions.push({
      title: t("actionStickerTitle"),
      copy: template(t("actionStickerCopy"), { time: timeUntil(stickerBoom.endsAt) }),
      reason: missing <= 3 || goldBlocked ? t("actionStickerReasonHigh") : t("actionStickerReasonNormal"),
      priority: goldBlocked || missing <= 3 ? "high" : "medium",
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    });
  }

  if (openTrades.length) {
    actions.push({
      title: template(t("actionTradesTitle"), { count: openTrades.length }),
      copy: t("actionTradesCopy"),
      reason: t("actionTradesReason"),
      priority: "high",
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    });
  }

  const vault = context.vault || {};
  if (vault.lastVerdict === "wait") {
    actions.push({
      title: t("actionVaultWaitTitle"),
      copy: t("actionVaultWaitCopy"),
      reason: t("actionVaultWaitReason"),
      priority: "high",
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    });
  } else if (vault.lastVerdict === "open") {
    actions.push({
      title: t("actionVaultOpenTitle"),
      copy: t("actionVaultOpenCopy"),
      reason: t("actionVaultOpenReason"),
      priority: "medium",
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    });
  }

  const blitz = context.blitz || {};
  if (Number.isFinite(blitz.left) && blitz.left > 0) {
    actions.push({
      title: template(t("actionBlitzPrepTitle"), { left: blitz.left }),
      copy: t("actionBlitzPrepCopy"),
      reason: t("actionBlitzPrepReason"),
      priority: "high",
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    });
  }

  if (plan.triggerEventId) {
    actions.push({
      title: t("actionTriggerTitle"),
      copy: template(t("actionTriggerCopy"), { event: plan.triggerLabel }),
      reason: t("actionTriggerReason"),
      priority: "medium",
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    });
  }

  if (checks[0] && checks[1] && checks[2]) {
    actions.unshift({
      title: t("actionCleanTitle"),
      copy: t("actionCleanCopy"),
      reason: t("actionCleanReason"),
      priority: "normal",
      control: { type: "set-target", points: target + 300, label: t("nextMilestone") }
    });
  }

  return actions;
}

function renderQuickstartGuide() {
  const target = document.getElementById("quickstartGuide");
  const context = gatherPlanContext();
  const plan = updateTodayPlan() || {};
  const roi = document.getElementById("setupStatusRoi");
  if (target) {
    const diceReady = context.unclaimedLinks.length === 0 && context.unappliedClaimedDice === 0;
    const diceAction = context.unappliedClaimedDice > 0
      ? { type: "button", action: "apply-dice-bank", label: t("applyToPlan") }
      : { type: "link", href: pageLink("free-dice"), label: diceReady ? t("openToolShort") : t("claimDice") };
    const eventReady = Boolean(plan.triggerEventId);
    const eventNeedsRefresh = !context.triggerRequired;
    const stickerReady = Boolean(state.checks?.[2]) || context.openTrades.length > 0 || context.missingStickers <= 3 || context.goldBlocked;
    const steps = [
      {
        step: "01",
        title: t("claimDice"),
        copy: context.unclaimedLinks.length > 0
          ? template(t("diceStepClaimCopy"), { left: context.unclaimedLinks.length })
          : context.unappliedClaimedDice > 0
            ? template(t("diceStepApplyTitle"), { claimedDice: context.unappliedClaimedDice })
            : t("diceStepDoneCopy"),
        status: diceReady ? t("ready") : t("needsAction"),
        ready: diceReady,
        urgent: !diceReady,
        control: diceAction
      },
      {
        step: "02",
        title: t("eventClock"),
        copy: eventNeedsRefresh
          ? t("eventPreviewEmptyCopy")
          : eventReady
          ? template(t("planSnapshotTriggerCopy"), { trigger: plan.triggerLabel || t("ready") })
          : context.triggerRequired ? t("eventNoTriggerCopy") : t("eventNoSpendWindowCopy"),
        status: eventReady ? t("ready") : t("needsAction"),
        ready: eventReady || eventNeedsRefresh,
        urgent: !eventReady && diceReady,
        control: eventNeedsRefresh
          ? { type: "button", action: "refresh", label: t("refreshNow") }
          : eventReady
          ? { type: "link", href: pageLink("events"), label: t("viewEvents") }
          : { type: "link", href: pageLink("events"), label: t("chooseTrigger") }
      },
      {
        step: "03",
        title: t("stickerPlan"),
        copy: context.openTrades.length
          ? template(t("stickerStepCompleteTradeCopy"), { count: context.openTrades.length })
          : template(t("quickStickerStatus"), {
              missing: context.missingStickers,
              gold: context.goldBlocked ? t("yes") : t("no"),
              reserve: context.reserve
            }),
        status: stickerReady ? t("ready") : t("needsAction"),
        ready: stickerReady,
        urgent: context.goldBlocked || context.openTrades.length > 0,
        control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
      }
    ];
    target.innerHTML = steps.map((item) => `
      <div class="guide-card ${item.ready ? "is-ready" : ""} ${item.urgent ? "is-urgent" : ""}">
        <p class="guide-step">${escapeHtml(item.step)}</p>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.copy)}</span>
        <small class="guide-status">${escapeHtml(item.status)}</small>
        ${actionControl({ control: item.control })}
      </div>
    `).join("");
    bindActionControls(target);
  }
  if (roi) {
    roi.textContent = state.roiPlan?.target
      ? template(t("savedRoiStateCopy"), {
          target: state.roiPlan.target,
          dice: state.roiPlan.dice || context.diceBank,
          window: roiWindowLabel(state.roiPlan.windowId),
          verdict: state.roiPlan.verdict || t("ready")
        })
      : plan.block || t("heroSetupRoi");
  }
}

function renderPlanDriversPanel() {
  const target = document.getElementById("planDriversPanel");
  if (!target) return;
  const context = gatherPlanContext();
  const plan = updateTodayPlan() || {};
  const rows = [];

  if (context.unclaimedLinks.length > 0 || context.unappliedClaimedDice > 0) {
    rows.push({
      title: t("claimDice"),
      copy: context.unclaimedLinks.length > 0
        ? template(t("diceStepClaimCopy"), { left: context.unclaimedLinks.length })
        : template(t("diceStepApplyTitle"), { claimedDice: context.unappliedClaimedDice }),
      status: t("needsAction"),
      control: context.unclaimedLinks.length > 0
        ? { type: "link", href: pageLink("free-dice"), label: t("claimDice") }
        : { type: "button", action: "apply-dice-bank", label: t("applyToPlan") }
    });
  }

  if (context.triggerRequired && !plan.triggerEventId) {
    rows.push({
      title: t("planSnapshotTrigger"),
      copy: t("eventNoTriggerCopy"),
      status: t("needsAction"),
      control: { type: "link", href: pageLink("events"), label: t("chooseTrigger") }
    });
  }

  rows.push({
    title: t("resourceGapDice"),
    copy: template(t("resourceGapDiceCopy"), { cost: context.cost, after: context.after }),
    status: context.canPush ? t("riskOk") : t("riskHigh"),
    control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
  });

  rows.push({
    title: t("resourceGapStickers"),
    copy: template(t("resourceGapStickersCopy"), {
      missing: context.missingStickers,
      gold: context.goldBlocked ? t("yes") : t("no"),
      reserve: context.reserve
    }),
    status: context.goldBlocked || context.openTrades.length > 0 ? t("needsAction") : t("ready"),
    control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
  });

  if (plan.triggerEventId) {
    rows.push({
      title: t("planSnapshotTrigger"),
      copy: template(t("planSnapshotTriggerCopy"), { trigger: plan.triggerLabel || t("ready") }),
      status: t("needsAction"),
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    });
  }

  rows.push({
    title: t("planSnapshotStop"),
    copy: template(t("planSnapshotStopCopy"), { stop: plan.stopLine ?? context.stopLine, reserve: context.reserve }),
    status: plan.phase === "push" ? t("riskOk") : t("ready"),
    control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
  });

  renderImpactPanel("planDriversPanel", rows.slice(0, 4));
}

function renderDiceList() {
  const target = document.getElementById("diceList");
  if (!target) return;
  target.innerHTML = "";
  const links = claimableDiceLinks();
  normalizeClaimedLinks(links);
  syncDiceChecklistState(links);
  if (!links.length) {
    const official = officialRewardLink();
    target.innerHTML = `
      <article class="dice-item">
        <div>
          <strong>${escapeHtml(t("dicePreviewEmptyTitle"))}</strong>
          <span>${escapeHtml(t("dicePreviewEmptyCopy"))}</span>
          <div class="event-meta">${sourcePill("official")}<span class="tag">${t("dicePreviewOfficial")}</span></div>
        </div>
        <div class="dice-actions">
          ${official ? `<a class="btn primary" href="${escapeHtmlAttr(official.claimUrl)}" target="_blank" rel="noopener">${t("claimDice")}</a>` : ""}
          <button class="btn" type="button" data-refresh-now>${t("refreshNow")}</button>
        </div>
      </article>
    `;
    bindActionControls(target);
  }
  links.forEach((link) => {
    const item = document.createElement("article");
    const claimed = isDiceLinkClaimed(link);
    item.className = `dice-item${claimed ? " is-claimed" : ""}`;
    item.innerHTML = `
      <div>
        <strong>${escapeHtml(diceLabel(link))}</strong>
        <span>${escapeHtml(diceNote(link))} ${t("expires")}: ${formatDate(link.expiresAt)}</span>
        <div class="event-meta">${sourcePill(link.source)}<span class="tag">${link.dice ? template(t("dicePreviewValue"), { dice: link.dice }) : t("dicePreviewOfficial")}</span></div>
      </div>
      <div class="dice-actions">
        <a class="btn primary" href="${link.claimUrl}" target="_blank" rel="noopener">${t("claimDice")}</a>
        <button class="btn" type="button" data-copy="${link.claimUrl}">${t("copy")}</button>
        <button class="btn" type="button" data-claim="${link.id}">${claimed ? t("undoClaimed") : t("markClaimed")}</button>
      </div>
    `;
    target.appendChild(item);
  });
  target.querySelectorAll("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.dataset.copy);
      button.textContent = t("copied");
      setTimeout(() => (button.textContent = t("copy")), 900);
    });
  });
  target.querySelectorAll("[data-claim]").forEach((button) => {
    button.addEventListener("click", () => {
      const link = links.find((item) => item.id === button.dataset.claim);
      if (!link) return;
      state.claimedLinks ||= {};
      if (isDiceLinkClaimed(link)) {
        delete state.claimedLinks[link.id];
        if (state.appliedClaimedLinkIds) delete state.appliedClaimedLinkIds[link.id];
      } else {
        state.claimedLinks[link.id] = diceLinkClaimKey(link);
      }
      saveState();
      renderDiceList();
    });
  });
  renderDiceProgress(links);
  const reset = document.getElementById("resetClaimed");
  if (reset) {
    reset.onclick = () => {
      state.claimedLinks = {};
      state.checks ||= {};
      state.checks[0] = false;
      saveState();
      renderDiceList();
    };
  }
  const markAll = document.getElementById("markAllDice");
  if (markAll) {
    markAll.disabled = links.length === 0;
    markAll.onclick = () => {
      if (!links.length) return;
      state.claimedLinks ||= {};
      links.forEach((link) => {
        state.claimedLinks[link.id] = diceLinkClaimKey(link);
      });
      state.checks ||= {};
      state.checks[0] = true;
      saveState();
      renderDiceList();
    };
  }
  renderDiceNextSteps(links);
}

function renderDiceProgress(links) {
  const target = document.getElementById("diceProgress");
  if (!target) return;
  if (!links.length) {
    target.innerHTML = `
      <div>
        <strong>${escapeHtml(t("dicePreviewEmptyTitle"))}</strong>
        <span>${escapeHtml(t("dicePreviewEmptyCopy"))}</span>
      </div>
      <div class="linked-meta"><small>${t("freshnessDue")}</small></div>
    `;
    return;
  }
  const claimed = links.filter(isDiceLinkClaimed).length;
  const totalDice = links.reduce((sum, link) => sum + (Number(link.dice) || 0), 0);
  const claimedDice = links.filter(isDiceLinkClaimed).reduce((sum, link) => sum + (Number(link.dice) || 0), 0);
  target.innerHTML = `
    <div>
      <strong>${template(t("diceProgressTitle"), { claimed, total: links.length })}</strong>
      <span>${template(t("diceProgressCopy"), { dice: totalDice })} ${template(t("diceProgressClaimedCopy"), { claimedDice })}</span>
    </div>
    <div class="linked-meta"><small>${claimed === links.length ? t("completed") : t("needsAction")}</small></div>
  `;
}

function renderDiceNextSteps(links) {
  const target = document.getElementById("diceNextSteps");
  if (!target) return;
  if (!links.length) {
    const actions = [
      {
        title: t("eventPreviewEmptyTitle"),
        copy: t("eventPreviewEmptyCopy"),
        reason: t("freshnessDueCopy"),
        priority: "high",
        control: { type: "button", action: "refresh", label: t("refreshNow") }
      },
      {
        title: t("actionQuickWinsTitle"),
        copy: t("actionQuickWinsCopy"),
        reason: t("actionQuickWinsReason"),
        priority: "medium",
        control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
      }
    ];
    target.innerHTML = actions.map((item) => `
      <div class="action-item priority-${item.priority}">
        <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.copy)}</span><small>${escapeHtml(item.reason)}</small></div>
        ${actionControl(item)}
      </div>
    `).join("");
    bindActionControls(target);
    return;
  }
  const claimed = links.filter(isDiceLinkClaimed).length;
  const claimedDice = links.filter(isDiceLinkClaimed).reduce((sum, link) => sum + (Number(link.dice) || 0), 0);
  const appliedMap = state.appliedClaimedLinkIds || {};
  const unappliedClaimedDice = links
    .filter((link) => isDiceLinkClaimed(link) && !appliedMap[link.id])
    .reduce((sum, link) => sum + (Number(link.dice) || 0), 0);
  const actions = [];
  if (unappliedClaimedDice > 0) {
    actions.push({
      title: template(t("diceStepApplyTitle"), { claimedDice: unappliedClaimedDice }),
      copy: t("diceStepApplyCopy"),
      reason: t("diceStepApplyReason"),
      priority: "high",
      control: { type: "button", action: "apply-dice-bank", label: t("applyToPlan") }
    });
  } else if (claimedDice > 0) {
    actions.push({
      title: t("diceStepBankDoneTitle"),
      copy: template(t("diceStepBankDoneCopy"), { claimedDice }),
      reason: t("diceStepBankDoneReason"),
      priority: "normal",
      control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
    });
  }
  if (claimed < links.length) {
    actions.push({
      title: t("diceStepClaimTitle"),
      copy: template(t("diceStepClaimCopy"), { left: links.length - claimed }),
      reason: t("diceStepClaimReason"),
      priority: "high",
      control: { type: "button", action: "mark-all-dice", label: t("markAllDice") }
    });
  } else {
    actions.push({
      title: t("diceStepDoneTitle"),
      copy: t("diceStepDoneCopy"),
      reason: t("diceStepDoneReason"),
      priority: "normal",
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    });
  }
  actions.push({
    title: t("diceStepRoiTitle"),
    copy: t("diceStepRoiCopy"),
    reason: t("diceStepRoiReason"),
    priority: "medium",
    control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
  });
  target.innerHTML = actions.map((item) => `
    <div class="action-item priority-${item.priority}">
      <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.copy)}</span><small>${escapeHtml(item.reason)}</small></div>
      ${actionControl(item)}
    </div>
  `).join("");
  bindActionControls(target);
}

function renderEventFilters() {
  const target = document.getElementById("eventFilters");
  if (!target) return;
  const types = ["all", "spend", "actionable", "watch", ...Array.from(new Set(activeEvents().map((event) => event.type)))];
  const selected = state.eventFilter || "all";
  target.innerHTML = types.map((type) => {
    const count = filteredEvents(type).length;
    return `<button class="target-chip ${selected === type ? "is-active" : ""}" type="button" data-event-filter="${type}"><strong>${escapeHtml(eventFilterLabel(type))}</strong><span>${count}</span></button>`;
  }).join("");
  target.querySelectorAll("[data-event-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      state.eventFilter = button.dataset.eventFilter;
      saveState();
      renderEventFilters();
      renderEventList();
    });
  });
}

function renderEventList() {
  const target = document.getElementById("eventList");
  if (!target) return;
  const filter = state.eventFilter || "all";
  const events = filteredEvents(filter);
  if (!events.length) {
    const freshness = dataFreshnessSummary();
    target.innerHTML = `
      <article class="event-item">
        <div class="card-head">
          <div>
            <p class="eyebrow">${escapeHtml(t("freshnessStatus"))}</p>
            <h2>${escapeHtml(t("noLiveEventsTitle"))}</h2>
          </div>
          ${sourcePill("public")}
        </div>
        <p>${escapeHtml(freshness.copy)}</p>
        <div class="dice-actions">
          <button class="btn primary" type="button" data-refresh-now>${t("refreshNow")}</button>
          <a class="btn mini-btn" href="${pageLink("free-dice")}">${t("claimDice")}</a>
        </div>
      </article>
    `;
    bindActionControls(target);
    return;
  }
  target.innerHTML = events
    .map((event) => `
      <article class="event-item">
        <div class="card-head">
          <div>
            <p class="eyebrow">${escapeHtml(eventTypeLabel(event.type))}</p>
            <h2>${escapeHtml(eventName(event))}</h2>
          </div>
          ${sourcePill(event.source)}
        </div>
        <div class="event-meta">
          <span class="tag">${escapeHtml(eventStatusLabel(event.status))}</span>
          <span class="tag">${formatDate(event.startsAt)} - ${formatDate(event.endsAt)}</span>
          <span class="tag">${timeUntil(event.endsAt)}</span>
        </div>
        <p><strong>${t("bestFor")}:</strong> ${eventBestFor(event).map(escapeHtml).join(", ")}</p>
        <ul class="event-actions">${eventActionList(event).map((action) => `<li>${escapeHtml(action)}</li>`).join("")}</ul>
        <div class="dice-actions">
          <button class="btn mini-btn" type="button" data-prepare-event="${event.id}">${isPreparedEvent(event.id) ? t("prepared") : t("markPrepared")}</button>
          ${isSpendTriggerEvent(event) ? `<button class="btn mini-btn" type="button" data-set-trigger-event="${event.id}">${state.planTriggerEventId === event.id ? t("planTriggerCurrent") : t("planTriggerUse")}</button>` : ""}
          ${!isActionableEvent(event) ? `<button class="btn mini-btn" type="button" data-confirm-watch="${event.id}">${t("confirmBeforeSpend")}</button>` : ""}
          <a class="btn mini-btn" href="${pageLink(event.id.includes("sticker") || event.id.includes("golden") ? "stickers" : "roi-calculator")}">${event.id.includes("sticker") || event.id.includes("golden") ? t("openStickerPlanner") : t("runRoi")}</a>
        </div>
      </article>
    `)
    .join("");
  target.querySelectorAll("[data-prepare-event]").forEach((button) => {
    button.addEventListener("click", () => {
      state.preparedEvents ||= {};
      const id = button.dataset.prepareEvent;
      state.preparedEvents[id] = !state.preparedEvents[id];
      state.checks ||= {};
      const event = activeEvents().find((item) => item.id === id);
      if (event?.id.includes("sticker") || event?.id.includes("golden")) state.checks[2] = true;
      saveState();
      renderEventList();
      renderEventPlanPanel();
      if (document.getElementById("dashboard")) renderShared();
    });
  });
  target.querySelectorAll("[data-set-trigger-event]").forEach((button) => {
    button.addEventListener("click", () => {
      const event = activeEvents().find((item) => item.id === button.dataset.setTriggerEvent);
      if (!isSpendTriggerEvent(event)) return;
      state.planTriggerEventId = event.id;
      saveState();
      renderEventList();
      renderEventPlanPanel();
      if (document.getElementById("dashboard")) renderShared();
    });
  });
  target.querySelectorAll("[data-confirm-watch]").forEach((button) => {
    button.addEventListener("click", () => {
      state.confirmedWatchEvents ||= {};
      state.confirmedWatchEvents[button.dataset.confirmWatch] = new Date().toISOString();
      saveState();
      button.textContent = t("saved");
      renderEventPlanPanel();
    });
  });
}

function renderEventPlanPanel() {
  const target = document.getElementById("eventPlanPanel");
  if (!target) return;
  const trigger = activeEvents().find((event) => event.id === state.planTriggerEventId && isSpendTriggerEvent(event));
  const watch = communityWatchSummary();
  const hasConfirmedSpendWindow = confirmedSpendEvents().length > 0;
  const actions = trigger ? [{
    title: template(t("eventTriggerPlanTitle"), { event: eventName(trigger) }),
    copy: template(t("eventTriggerPlanCopy"), { time: timeUntil(trigger.endsAt) }),
    reason: eventPrimaryAction(trigger),
    priority: "medium",
    control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
  }] : !hasConfirmedSpendWindow ? [{
    title: t("eventPreviewEmptyTitle"),
    copy: t("eventPreviewEmptyCopy"),
    reason: t("freshnessDueCopy"),
    priority: "high",
    control: { type: "button", action: "refresh", label: t("refreshNow") }
  }] : [{
    title: t("eventNoTriggerTitle"),
    copy: t("eventNoTriggerCopy"),
    reason: t("eventNoTriggerReason"),
    priority: "normal",
    control: { type: "link", href: pageLink("events"), label: t("chooseTrigger") }
  }];
  if (watch.unconfirmedCount) {
    actions.push({
      title: t("watchConfirm"),
      copy: template(t("watchConfirmCopy"), { count: watch.unconfirmedCount, events: watch.unconfirmedEvents }),
      reason: t("watchConfirmReason"),
      priority: "medium",
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    });
  } else if (watch.count) {
    actions.push({
      title: t("watchConfirm"),
      copy: t("watchClearCopy"),
      reason: t("watchConfirmReason"),
      priority: "normal",
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    });
  }
  target.innerHTML = actions.map((item) => `
    <div class="action-item priority-${item.priority}">
      <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.copy)}</span><small>${escapeHtml(item.reason)}</small></div>
      ${actionControl(item)}
    </div>
  `).join("");
  bindActionControls(target);
}

function bindBlitzPrep() {
  const ids = ["goldDupesReady", "missingTradeTargets", "tradePartnersReady", "tradeScreenshotsReady"];
  const update = () => renderBlitzPrep({ persist: true });
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === "true") return;
    el.dataset.bound = "true";
    const eventName = el.type === "checkbox" ? "change" : "input";
    el.addEventListener(eventName, update);
    el.addEventListener("change", update);
  });
  hydrateBlitzPrepInputs();
  renderBlitzPrep({ persist: Boolean(state.blitzPrep) });
}

function hydrateBlitzPrepInputs() {
  const saved = state.blitzPrep || {};
  setValue("goldDupesReady", saved.goldDupes ?? 2);
  setValue("missingTradeTargets", saved.missingTargets ?? 2);
  setValue("tradePartnersReady", saved.tradePartners ?? 1);
  const screenshots = document.getElementById("tradeScreenshotsReady");
  if (screenshots) screenshots.checked = Boolean(saved.screenshotsReady);
}

function renderBlitzPrep({ persist = false } = {}) {
  const result = document.getElementById("blitzPrepResult");
  const steps = document.getElementById("blitzPrepSteps");
  if (!result || !steps) return;
  const goldDupes = numberValue("goldDupesReady", 0);
  const missingTargets = numberValue("missingTradeTargets", 0);
  const tradePartners = numberValue("tradePartnersReady", 0);
  const screenshotsReady = Boolean(document.getElementById("tradeScreenshotsReady")?.checked);
  const left = (goldDupes > 0 ? 0 : 1) + (missingTargets > 0 ? 0 : 1) + (tradePartners > 0 ? 0 : 1) + (screenshotsReady ? 0 : 1);
  const verdict = left === 0 ? t("blitzReadyTitle") : template(t("blitzNotReadyTitle"), { left });
  const copy = left === 0 ? t("blitzReadyCopy") : template(t("blitzNotReadyCopy"), { goldDupes, missingTargets, tradePartners });
  result.className = `mini-item calculator-result${left === 0 ? "" : " warn"}`;
  result.innerHTML = `<strong>${escapeHtml(verdict)}</strong><span>${escapeHtml(copy)}</span>`;
  if (persist) {
    state.blitzPrep = { goldDupes, missingTargets, tradePartners, screenshotsReady, left };
    saveState();
  }
  const actions = [];
  if (goldDupes <= 0) actions.push({ title: t("blitzNeedDupesTitle"), copy: t("blitzNeedDupesCopy"), reason: t("blitzNeedDupesReason"), priority: "high", control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") } });
  if (missingTargets <= 0) actions.push({ title: t("blitzNeedTargetsTitle"), copy: t("blitzNeedTargetsCopy"), reason: t("blitzNeedTargetsReason"), priority: "high", control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") } });
  if (tradePartners <= 0) actions.push({ title: t("blitzNeedPartnerTitle"), copy: t("blitzNeedPartnerCopy"), reason: t("blitzNeedPartnerReason"), priority: "medium", control: { type: "copy-text", text: t("blitzPartnerText"), label: t("copyTradeText") } });
  if (!screenshotsReady) actions.push({ title: t("blitzNeedScreensTitle"), copy: t("blitzNeedScreensCopy"), reason: t("blitzNeedScreensReason"), priority: "medium", control: { type: "button", action: "mark-blitz-screens", label: t("markDone") } });
  if (!actions.length) actions.push({ title: t("blitzAllSetTitle"), copy: t("blitzAllSetCopy"), reason: t("blitzAllSetReason"), priority: "normal", control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") } });
  steps.innerHTML = actions.map((item) => `
    <div class="action-item priority-${item.priority}">
      <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.copy)}</span><small>${escapeHtml(item.reason)}</small></div>
      ${actionControl(item)}
    </div>
  `).join("");
  bindActionControls(steps);
}

function isPreparedEvent(id) {
  return Boolean(state.preparedEvents?.[id]);
}

function isConfirmedWatchEvent(id) {
  return Boolean(state.confirmedWatchEvents?.[id]);
}

function bindRoiCalculator() {
  const form = document.getElementById("roiForm");
  const result = document.getElementById("roiResult");
  const milestones = document.getElementById("milestoneList");
  const decisionPlan = document.getElementById("roiDecisionPlan");
  const targetOptions = document.getElementById("roiTargetOptions");
  const contextPanel = document.getElementById("roiContextPanel");
  if (!form || !result) return;
  if (form.dataset.bound === "true") {
    document.getElementById("roiDice")?.dispatchEvent(new Event("input", { bubbles: true }));
    return;
  }
  form.dataset.bound = "true";
  const saved = state.roi || {};
  setValue("roiDice", saved.dice ?? state.plan?.diceBank ?? 1200);
  setValue("roiCurrent", saved.current ?? state.plan?.currentPoints ?? 300);
  setValue("roiTarget", saved.target ?? state.plan?.targetPoints ?? 900);
  setValue("roiMultiplier", saved.multiplier ?? 10);
  renderRoiWindowOptions();
  setValue("roiWindowSelect", saved.windowId ?? state.planTriggerEventId ?? "none");
  setValue("roiBoardState", saved.boardState ?? "neutral");
  setValue("roiBoostState", saved.boostState ?? "none");
  const calculate = () => {
    const dice = numberValue("roiDice");
    const current = numberValue("roiCurrent");
    const target = numberValue("roiTarget");
    const multiplier = Math.max(1, numberValue("roiMultiplier"));
    const windowId = document.getElementById("roiWindowSelect")?.value || "none";
    const boardState = document.getElementById("roiBoardState")?.value || "neutral";
    const boostState = document.getElementById("roiBoostState")?.value || "none";
    const context = roiContextScore({ windowId, boardState, boostState });
    const gap = Math.max(0, target - current);
    const estimatedRolls = Math.ceil(gap / Math.max(multiplier * 2.2, 1));
    const estimatedDiceCost = Math.max(multiplier, Math.round(estimatedRolls * multiplier * context.costFactor));
    const nextReward = estimateRewardValue(target);
    const adjustedReward = Math.round(nextReward * context.rewardFactor);
    const net = adjustedReward - estimatedDiceCost;
    let verdict = t("pushVerdict");
    let verdictKey = "push";
    let className = "calculator-result";
    let advice = t("roiPushAdvice");
    if (context.score < 0 || net < -dice * 0.18) {
      verdict = t("stopVerdict");
      verdictKey = "stop";
      className = "calculator-result stop";
      advice = t("roiStopAdvice");
    } else if (context.score < 2 || net < 0) {
      verdict = t("waitVerdict");
      verdictKey = "wait";
      className = "calculator-result warn";
      advice = t("roiWaitAdvice");
    }
    result.className = `mini-item ${className}`;
    result.innerHTML = `<strong>${template(t("roiResult"), { verdict, cost: estimatedDiceCost, reward: adjustedReward })}</strong><span>${advice} ${template(t("roiGap"), { gap, net })}</span>`;
    state.roi = { dice, current, target, multiplier, windowId, boardState, boostState, cost: estimatedDiceCost, reward: adjustedReward, net, verdictKey };
    saveState();
    renderRoiContextPanel(contextPanel, { context, windowId, boardState, boostState, cost: estimatedDiceCost, reward: adjustedReward, net, verdict, verdictKey });
    renderRoiDecisionPlan(decisionPlan, { dice, current, target, multiplier, gap, estimatedDiceCost, nextReward: adjustedReward, net, verdict, verdictKey, windowId, boardState, boostState, context });
    renderRoiTargetOptions(targetOptions, { dice, current, multiplier, windowId, boardState, boostState, context });
    renderRoiImpactPanel();
  };
  form.querySelectorAll("input, select").forEach((input) => input.addEventListener("input", calculate));
  form.querySelectorAll("select").forEach((input) => input.addEventListener("change", calculate));
  calculate();
  if (milestones) {
    const event = siteData.milestones[0];
    milestones.innerHTML = event.steps.map((step) => `<button class="linked-item milestone-button" type="button" data-roi-target="${step.points}"><span><strong>${step.points} ${t("points")}</strong><span>${escapeHtml(milestoneRewardLabel(step.reward))} - ${t("value")} ${step.diceValue}</span></span><span class="linked-meta"><small>${t("useTarget")}</small></span></button>`).join("");
    milestones.querySelectorAll("[data-roi-target]").forEach((button) => {
      button.addEventListener("click", () => {
        setValue("roiTarget", button.dataset.roiTarget);
        calculate();
      });
    });
  }
}

function renderRoiDecisionPlan(target, plan) {
  if (!target) return;
  const actions = roiActions(plan);
  target.innerHTML = actions.map((item) => `
    <div class="action-item priority-${item.priority}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.copy)}</span>
        <small>${escapeHtml(item.reason)}</small>
      </div>
      ${actionControl(item)}
    </div>
  `).join("");
  bindActionControls(target);
}

function roiWindowLabel(windowId) {
  const event = activeEvents().find((item) => item.id === windowId);
  return event ? eventName(event) : t("roiNoWindow");
}

function renderRoiWindowOptions() {
  const target = document.getElementById("roiWindowSelect");
  if (!target) return;
  const selected = state.roi?.windowId ?? state.planTriggerEventId ?? "none";
  const options = [
    `<option value="none">${escapeHtml(t("roiNoWindow"))}</option>`,
    ...confirmedSpendEvents().map((event) => `<option value="${escapeHtmlAttr(event.id)}">${escapeHtml(eventName(event))} · ${escapeHtml(timeUntil(event.endsAt))}</option>`)
  ];
  target.innerHTML = options.join("");
  target.value = [...target.options].some((option) => option.value === selected) ? selected : "none";
}

function roiContextScore({ windowId, boardState, boostState }) {
  let score = 0;
  let costFactor = 1;
  let rewardFactor = 1;
  const reasons = [];
  if (windowId && windowId !== "none") {
    score += 2;
    reasons.push(t("roiContextWindowGood"));
  } else {
    score -= 2;
    costFactor += 0.18;
    reasons.push(t("roiContextWindowMissing"));
  }
  if (boardState === "good") {
    score += 1;
    costFactor -= 0.12;
    reasons.push(t("roiContextBoardGood"));
  } else if (boardState === "bad") {
    score -= 1;
    costFactor += 0.16;
    reasons.push(t("roiContextBoardBad"));
  } else {
    reasons.push(t("roiContextBoardNeutral"));
  }
  if (boostState === "boost") {
    score += 1;
    rewardFactor += 0.12;
    reasons.push(t("roiContextBoostGood"));
  } else if (boostState === "watch") {
    score -= 1;
    reasons.push(t("roiContextBoostWait"));
  } else {
    reasons.push(t("roiContextBoostNone"));
  }
  return {
    score,
    costFactor: Math.max(0.72, costFactor),
    rewardFactor,
    reasons
  };
}

function renderRoiContextPanel(target, plan) {
  if (!target) return;
  const scoreLabel = plan.context.score >= 3 ? t("roiContextStrong") : plan.context.score >= 1 ? t("roiContextPlayable") : t("roiContextWeak");
  const contextClass = plan.context.score >= 3 ? "is-strong" : plan.context.score >= 1 ? "is-playable" : "is-weak";
  target.className = `decision-meter ${contextClass}`;
  target.innerHTML = `
    <div class="meter-head">
      <span>${escapeHtml(t("roiContextTitle"))}</span>
      <strong>${escapeHtml(scoreLabel)}</strong>
    </div>
    <div class="meter-track"><span style="width:${Math.max(8, Math.min(100, (plan.context.score + 3) * 16))}%"></span></div>
    <p>${escapeHtml(template(t("roiContextSummary"), {
      window: roiWindowLabel(plan.windowId),
      cost: plan.cost,
      reward: plan.reward,
      net: plan.net
    }))}</p>
    <div class="context-reasons">${plan.context.reasons.map((reason) => `<span>${escapeHtml(reason)}</span>`).join("")}</div>
  `;
}

function renderRoiTargetOptions(target, plan) {
  if (!target) return;
  const options = roiTargetOptions(plan);
  target.innerHTML = options.map((item) => `
    <div class="linked-item">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.copy)}</span>
      </div>
      <div class="linked-meta">
        <small>${escapeHtml(item.status)}</small>
        <button class="btn mini-btn" type="button" data-roi-target="${item.points}">${t("useTarget")}</button>
      </div>
    </div>
  `).join("");
  target.querySelectorAll("[data-roi-target]").forEach((button) => {
    button.addEventListener("click", () => {
      setValue("roiTarget", button.dataset.roiTarget);
      document.getElementById("roiTarget")?.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

function roiActions(plan) {
  const actions = [];
  const stopLine = Math.max(plan.current, plan.target - Math.max(100, Math.floor(plan.gap * 0.25)));
  if (plan.verdictKey === "stop" || plan.net < 0) {
    actions.push({
      title: t("roiActionWaitTitle"),
      copy: template(t("roiActionWaitCopy"), { cost: plan.estimatedDiceCost, reward: plan.nextReward }),
      reason: t("roiActionWaitReason"),
      priority: "high",
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    });
  } else if (plan.verdictKey === "wait") {
    actions.push({
      title: t("roiActionWindowTitle"),
      copy: template(t("roiActionWindowCopy"), { window: roiWindowLabel(plan.windowId) }),
      reason: t("roiActionWindowReason"),
      priority: "high",
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    });
  } else {
    actions.push({
      title: t("roiActionPushTitle"),
      copy: template(t("roiActionPushCopy"), { target: plan.target, stop: stopLine }),
      reason: t("roiActionPushReason"),
      priority: "normal",
      control: { type: "save-roi-plan", label: t("saveToDashboard") }
    });
  }
  actions.push({
    title: t("roiActionSaveTitle"),
    copy: template(t("roiActionSaveCopy"), { target: plan.target, dice: plan.dice, window: roiWindowLabel(plan.windowId) }),
    reason: t("roiActionSaveReason"),
    priority: "medium",
    control: { type: "save-roi-plan", label: t("saveToDashboard") }
  });
  actions.push({
    title: t("roiActionCompareTitle"),
    copy: t("roiActionCompareCopy"),
    reason: t("roiActionCompareReason"),
    priority: "normal",
    control: { type: "scroll-targets", label: t("compareTargets") }
  });
  return actions;
}

function roiTargetOptions(plan) {
  const steps = siteData.milestones[0].steps.filter((step) => step.points > plan.current);
  const costFactor = plan.context?.costFactor || 1;
  const rewardFactor = plan.context?.rewardFactor || 1;
  const affordable = steps.find((step) => estimateDiceCost(step.points - plan.current, plan.multiplier) * costFactor <= plan.dice * 0.35) || steps[0];
  const current = steps.find((step) => step.points >= numberValue("roiTarget")) || steps[0];
  const highValue = steps.find((step) => step.diceValue >= 650) || steps[steps.length - 1];
  const labeled = [
    { step: affordable, role: t("roiTargetSafe") },
    { step: current, role: t("roiTargetCurrent") },
    { step: highValue, role: t("roiTargetHigh") }
  ];
  return labeled.filter((item) => item.step).filter((item, index, array) => array.findIndex((next) => next.step.points === item.step.points) === index).map(({ step, role }) => {
    const cost = Math.round(estimateDiceCost(step.points - plan.current, plan.multiplier) * costFactor);
    const reward = Math.round(step.diceValue * rewardFactor);
    const net = reward - cost;
    return {
      points: step.points,
      title: template(t("roiTargetOptionTitle"), { points: step.points, role }),
      copy: template(t("roiTargetOptionCopy"), { reward: milestoneRewardLabel(step.reward), adjusted: reward, cost, net }),
      status: net >= 0 ? t("riskOk") : t("riskHigh")
    };
  });
}

function bindStickerPlanner() {
  const form = document.getElementById("stickerPlanner");
  const result = document.getElementById("stickerResult");
  const steps = document.getElementById("stickerNextSteps");
  if (!form || !result) return;
  if (form.dataset.bound === "true") {
    renderTradeQueue();
    renderStickerPlannerRefresh();
    renderVaultDecision();
    return;
  }
  form.dataset.bound = "true";
  setValue("plannerMissing", state.stickers?.missing ?? 8);
  setValue("plannerDupes", state.stickers?.dupes ?? 12);
  const gold = document.getElementById("plannerGold");
  if (gold) gold.checked = Boolean(state.stickers?.gold);
  bindTradeBuilder();
  hydrateVaultInputs();
  const update = () => {
    const missing = numberValue("plannerMissing");
    const dupes = numberValue("plannerDupes");
    const goldBlocked = Boolean(gold?.checked);
    const trades = state.stickers?.trades || [];
    let advice = t("tradableDupesAdvice");
    if (goldBlocked) advice = t("goldBlockedPlannerAdvice");
    else if (missing <= 4 && dupes >= 8) advice = t("nearCompletionPlannerAdvice");
    else if (missing > 15) advice = t("collectionPlannerAdvice");
    result.innerHTML = `<strong>${escapeHtml(advice)}</strong><span>${t("missingLabel")}: ${missing}. ${t("tradableLabel")}: ${dupes}. ${goldBlocked ? t("goldPressureHigh") : t("goldPressureNormal")} ${template(t("tradeQueueSummary"), { count: trades.length })}</span>`;
    state.stickers = { ...state.stickers, missing, dupes, gold: goldBlocked };
    saveState();
    renderTradeQueue();
    renderStickerNextSteps(steps, { missing, dupes, goldBlocked, trades });
    renderVaultDecision();
  };
  form.querySelectorAll("input, textarea").forEach((input) => input.addEventListener("input", update));
  form.querySelectorAll("input").forEach((input) => input.addEventListener("change", update));
  update();
}

function hydrateVaultInputs() {
  const saved = state.vault || {};
  setValue("vaultStars", saved.stars ?? 700);
  setValue("packBacklog", saved.packBacklog ?? 6);
  const boom = document.getElementById("stickerBoomReady");
  if (boom) boom.checked = Boolean(saved.stickerBoomReady);
}

function bindVaultDecision() {
  const ids = ["vaultStars", "packBacklog", "stickerBoomReady"];
  const update = () => renderVaultDecision({ persist: true });
  ids.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.bound === "true") return;
    el.dataset.bound = "true";
    el.addEventListener("input", update);
    el.addEventListener("change", update);
  });
  renderVaultDecision({ persist: Boolean(state.vault) });
}

function renderVaultDecision({ persist = false } = {}) {
  const result = document.getElementById("vaultDecisionResult");
  const steps = document.getElementById("vaultDecisionSteps");
  if (!result || !steps) return;
  const stars = numberValue("vaultStars", 0);
  const packBacklog = numberValue("packBacklog", 0);
  const stickerBoomReady = Boolean(document.getElementById("stickerBoomReady")?.checked);
  const missing = numberValue("plannerMissing", state.stickers?.missing ?? 8);
  const dupes = numberValue("plannerDupes", state.stickers?.dupes ?? 12);
  let lastVerdict = "farm";
  let verdict = t("vaultFarmTitle");
  let copy = t("vaultFarmCopy");
  let className = "mini-item calculator-result warn";
  if (stars >= 700 && stickerBoomReady && (missing <= 6 || packBacklog >= 4)) {
    lastVerdict = "open";
    verdict = t("vaultOpenTitle");
    copy = template(t("vaultOpenCopy"), { stars, packBacklog });
    className = "mini-item calculator-result";
  } else if (stars >= 700 && !stickerBoomReady) {
    lastVerdict = "wait";
    verdict = t("vaultWaitTitle");
    copy = template(t("vaultWaitCopy"), { stars });
  } else if (stars < 700) {
    lastVerdict = "farm";
    verdict = t("vaultFarmTitle");
    copy = template(t("vaultFarmCopyNeed"), { need: Math.max(0, 700 - stars) });
  }
  result.className = className;
  result.innerHTML = `<strong>${escapeHtml(verdict)}</strong><span>${escapeHtml(copy)}</span>`;
  if (persist) {
    state.vault = { stars, packBacklog, stickerBoomReady, lastVerdict };
    saveState();
  }
  const actions = [];
  if (lastVerdict === "wait") {
    actions.push({ title: t("vaultStepWaitTitle"), copy: t("vaultStepWaitCopy"), reason: t("vaultStepWaitReason"), priority: "high", control: { type: "link", href: pageLink("events"), label: t("viewEvents") } });
  }
  if (lastVerdict === "open") {
    actions.push({ title: t("vaultStepOpenTitle"), copy: t("vaultStepOpenCopy"), reason: t("vaultStepOpenReason"), priority: "medium", control: { type: "check", index: 2, label: t("markStickerChecked") } });
  }
  if (lastVerdict === "farm") {
    actions.push({ title: t("vaultStepFarmTitle"), copy: template(t("vaultStepFarmCopy"), { dupes }), reason: t("vaultStepFarmReason"), priority: "medium", control: { type: "copy-text", text: buildTradeText({ missing, dupes, goldBlocked: Boolean(document.getElementById("plannerGold")?.checked), trades: state.stickers?.trades || [] }), label: t("copyTradeText") } });
  }
  actions.push({ title: t("vaultStepHomeTitle"), copy: t("vaultStepHomeCopy"), reason: t("vaultStepHomeReason"), priority: "normal", control: { type: "home-plan", label: t("sendToDashboard") } });
  steps.innerHTML = actions.map((item) => `
    <div class="action-item priority-${item.priority}">
      <div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(item.copy)}</span><small>${escapeHtml(item.reason)}</small></div>
      ${actionControl(item)}
    </div>
  `).join("");
  bindActionControls(steps);
}

function bindTradeBuilder() {
  const button = document.getElementById("addTradeBtn");
  if (!button || button.dataset.bound === "true") return;
  button.dataset.bound = "true";
  button.addEventListener("click", () => {
    const partner = document.getElementById("tradePartner")?.value.trim();
    const need = document.getElementById("tradeNeed")?.value.trim();
    const offer = document.getElementById("tradeOffer")?.value.trim();
    if (!need || !offer) {
      button.textContent = t("tradeNeedOfferRequired");
      setTimeout(() => (button.textContent = t("addTrade")), 1100);
      return;
    }
    state.stickers ||= {};
    state.stickers.trades ||= [];
    state.stickers.trades.push({
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      partner: partner || t("unknownPartner"),
      need,
      offer,
      done: false
    });
    setValue("tradePartner", "");
    setValue("tradeNeed", "");
    setValue("tradeOffer", "");
    saveState();
    renderTradeQueue();
    renderStickerPlannerRefresh();
  });
}

function renderStickerPlannerRefresh() {
  const steps = document.getElementById("stickerNextSteps");
  const missing = numberValue("plannerMissing");
  const dupes = numberValue("plannerDupes");
  const goldBlocked = Boolean(document.getElementById("plannerGold")?.checked);
  renderStickerNextSteps(steps, { missing, dupes, goldBlocked, trades: state.stickers?.trades || [] });
}

function renderTradeQueue() {
  const target = document.getElementById("tradeQueueList");
  const count = document.getElementById("tradeQueueCount");
  if (!target) return;
  const trades = state.stickers?.trades || [];
  if (count) count.textContent = String(trades.length);
  if (!trades.length) {
    target.innerHTML = `<div class="mini-item"><strong>${t("emptyTradeQueue")}</strong><span>${t("emptyTradeQueueCopy")}</span></div>`;
    return;
  }
  target.innerHTML = trades.map((trade) => `
    <div class="linked-item ${trade.done ? "is-claimed" : ""}">
      <div>
        <strong>${escapeHtml(trade.partner)}</strong>
        <span>${template(t("tradeCardCopy"), { need: trade.need, offer: trade.offer })}</span>
      </div>
      <div class="linked-meta">
        <small>${trade.done ? t("completed") : t("planned")}</small>
        <button class="btn mini-btn" type="button" data-copy-trade="${trade.id}">${t("copy")}</button>
        <button class="btn mini-btn" type="button" data-complete-trade="${trade.id}">${t("completeTrade")}</button>
        <button class="btn mini-btn" type="button" data-delete-trade="${trade.id}">${t("deleteTrade")}</button>
      </div>
    </div>
  `).join("");
  bindTradeQueueControls(target);
}

function bindTradeQueueControls(root) {
  root.querySelectorAll("[data-copy-trade]").forEach((button) => {
    button.addEventListener("click", async () => {
      const trade = findTrade(button.dataset.copyTrade);
      if (!trade) return;
      await copyText(buildTradeText({ trades: [trade], missing: numberValue("plannerMissing"), dupes: numberValue("plannerDupes"), goldBlocked: Boolean(document.getElementById("plannerGold")?.checked) }));
      button.textContent = t("copied");
      setTimeout(() => (button.textContent = t("copy")), 1000);
    });
  });
  root.querySelectorAll("[data-complete-trade]").forEach((button) => {
    button.addEventListener("click", () => {
      const trade = findTrade(button.dataset.completeTrade);
      if (!trade || trade.done) return;
      trade.done = true;
      setValue("plannerMissing", Math.max(0, numberValue("plannerMissing") - 1));
      setValue("plannerDupes", Math.max(0, numberValue("plannerDupes") - 1));
      saveState();
      renderTradeQueue();
      renderStickerPlannerRefresh();
      document.getElementById("plannerMissing")?.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
  root.querySelectorAll("[data-delete-trade]").forEach((button) => {
    button.addEventListener("click", () => {
      state.stickers.trades = (state.stickers?.trades || []).filter((trade) => trade.id !== button.dataset.deleteTrade);
      saveState();
      renderTradeQueue();
      renderStickerPlannerRefresh();
    });
  });
}

function findTrade(id) {
  return (state.stickers?.trades || []).find((trade) => trade.id === id);
}

function renderStickerNextSteps(target, plan) {
  if (!target) return;
  const actions = stickerActions(plan);
  target.innerHTML = actions.map((item) => `
    <div class="action-item priority-${item.priority}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.copy)}</span>
        <small>${escapeHtml(item.reason)}</small>
      </div>
      ${actionControl(item)}
    </div>
  `).join("");
  bindActionControls(target);
}

function stickerActions(plan) {
  const actions = [];
  const tradeText = buildTradeText(plan);
  const openTrades = (plan.trades || []).filter((trade) => !trade.done);
  if (plan.goldBlocked) {
    actions.push({
      title: t("stickerStepGoldTitle"),
      copy: t("stickerStepGoldCopy"),
      reason: t("stickerStepGoldReason"),
      priority: "high",
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    });
  }
  if (openTrades.length) {
    actions.push({
      title: t("stickerStepCompleteTradeTitle"),
      copy: template(t("stickerStepCompleteTradeCopy"), { count: openTrades.length }),
      reason: t("stickerStepCompleteTradeReason"),
      priority: "high",
      control: { type: "copy-text", text: tradeText, label: t("copyTradeText") }
    });
  } else if (plan.dupes > 0) {
    actions.push({
      title: t("stickerStepTradeTitle"),
      copy: template(t("stickerStepTradeCopy"), { dupes: plan.dupes }),
      reason: t("stickerStepTradeReason"),
      priority: plan.missing <= 4 ? "high" : "medium",
      control: { type: "copy-text", text: tradeText, label: t("copyTradeText") }
    });
  }
  actions.push({
    title: plan.missing <= 4 ? t("stickerStepVaultHoldTitle") : t("stickerStepFarmTitle"),
    copy: plan.missing <= 4 ? t("stickerStepVaultHoldCopy") : t("stickerStepFarmCopy"),
    reason: plan.missing <= 4 ? t("stickerStepVaultHoldReason") : t("stickerStepFarmReason"),
    priority: plan.missing <= 4 ? "medium" : "normal",
    control: { type: "check", index: 2, label: t("markStickerChecked") }
  });
  actions.push({
    title: t("stickerStepHomeTitle"),
    copy: template(t("stickerStepHomeCopy"), { missing: plan.missing }),
    reason: t("stickerStepHomeReason"),
    priority: "normal",
    control: { type: "home-plan", label: t("sendToDashboard") }
  });
  return actions;
}

function buildTradeText(plan) {
  const trades = plan.trades || [];
  if (trades.length) {
    return trades.map((trade) => `Monopoly GO trade: I need ${trade.need}. I can send ${trade.offer}. Partner: ${trade.partner}.`).join("\n");
  }
  return `Monopoly GO trade plan: missing ${plan.missing}, tradable dupes ${plan.dupes}, gold-blocked ${plan.goldBlocked ? "yes" : "no"}.`;
}

function renderSourceMatrix() {
  const target = document.getElementById("sourceMatrix");
  if (!target) return;
  target.innerHTML = Object.entries(siteData.meta.sourcePolicy)
    .map(([key, value]) => `<div class="mini-item"><strong>${sourceLabel(key)}</strong><span>${escapeHtml(policyCopy(key, value))}</span></div>`)
    .join("");
}

function renderChangelog() {
  const target = document.getElementById("changelogList");
  if (!target) return;
  target.innerHTML = siteData.changelog
    .map((entry) => `<div class="mini-item"><strong>${entry.date}</strong><span>${entry.items.map(escapeHtml).join(" ")}</span></div>`)
    .join("");
}

function renderTargetChips() {
  const target = document.getElementById("targetChips");
  if (!target) return;
  target.innerHTML = `<span class="chip-label">${t("suggestedTargets")}</span>`;
  const selected = numberValue("homeTargetPoints", state.plan?.targetPoints ?? 0);
  siteData.playerTargets.forEach((item) => {
    const button = document.createElement("button");
    button.className = `target-chip${Number(item.points) === selected ? " is-active" : ""}`;
    button.type = "button";
    button.innerHTML = `<strong>${escapeHtml(translateOr(`target_${item.id}`, item.label))}</strong><span>${item.points} ${t("points")}</span>`;
    button.addEventListener("click", () => {
      setValue("homeTargetPoints", item.points);
      persistHomeInputs();
      updateBestMove();
      renderNextActions();
      renderResourceGap();
    });
    target.appendChild(button);
  });
}

function renderResourceGap() {
  const target = document.getElementById("resourceGapPanel");
  if (!target) return;
  const context = gatherPlanContext();
  const plan = updateTodayPlan() || {};
  const checks = state.checks || {};
  const freshness = dataFreshnessSummary();
  const usableToday = isCurrentDataUsable();
  const watch = communityWatchSummary();
  const savedRoi = state.roiPlan || null;
  const watchRow = watch.unconfirmedCount
    ? {
        title: t("watchConfirm"),
        copy: template(t("watchConfirmCopy"), { count: watch.unconfirmedCount, events: watch.unconfirmedEvents }),
        status: t("needsAction"),
        control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
      }
    : {
        title: t("watchConfirm"),
        copy: t("watchClearCopy"),
        status: t("ready"),
        control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
      };
  const rows = [
    {
      title: t("planSnapshotStop"),
      copy: savedRoi?.target
        ? template(t("planSnapshotRoiCopy"), {
            target: savedRoi.target,
            dice: savedRoi.dice,
            stop: savedRoi.stopLine,
            reserve: savedRoi.reserve,
            window: roiWindowLabel(savedRoi.windowId),
            verdict: savedRoi.verdict || t("ready")
          })
        : template(t("planSnapshotStopCopy"), { stop: plan.stopLine ?? context.stopLine, reserve: context.reserve }),
      status: savedRoi?.target ? t("saved") : (plan.phase === "push" ? t("riskOk") : t("needsAction")),
      control: { type: "link", href: pageLink("roi-calculator"), label: savedRoi?.target ? t("updatePlan") : t("runRoi") }
    },
    {
      title: t("resourceGapStickers"),
      copy: template(t("resourceGapStickersCopy"), {
        missing: context.missingStickers,
        gold: context.goldBlocked ? t("yes") : t("no"),
        reserve: context.reserve
      }),
      status: checks[2] ? t("checked") : t("needsAction"),
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    },
    {
      title: t("resourceGapDice"),
      copy: template(t("resourceGapDiceCopy"), { cost: context.cost, after: context.after }),
      status: context.after < context.reserve ? t("riskHigh") : t("riskOk"),
      control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
    },
    {
      title: t("freshnessStatus"),
      copy: freshness.copy,
      status: freshness.status,
      control: { type: "button", action: "refresh", label: t("refreshNow") }
    },
    watchRow
  ];
  target.innerHTML = rows.map((row) => `
    <div class="linked-item">
      <div>
        <strong>${escapeHtml(row.title)}</strong>
        <span>${escapeHtml(row.copy)}</span>
      </div>
      <div class="linked-meta">
        <small>${escapeHtml(row.status)}</small>
        ${actionControl({ control: row.control })}
      </div>
    </div>
  `).join("");
  bindActionControls(target);
}

function renderImpactPanel(targetId, rows) {
  const target = document.getElementById(targetId);
  if (!target) return;
  target.innerHTML = rows.map((row) => `
    <div class="linked-item">
      <div>
        <strong>${escapeHtml(row.title)}</strong>
        <span>${escapeHtml(row.copy)}</span>
      </div>
      <div class="linked-meta">
        <small>${escapeHtml(row.status)}</small>
        ${row.control ? actionControl({ control: row.control }) : ""}
      </div>
    </div>
  `).join("");
  bindActionControls(target);
}

function renderDiceImpactPanel() {
  const context = gatherPlanContext();
  const plan = updateTodayPlan() || {};
  renderImpactPanel("diceImpactPanel", [
    {
      title: t("impactPlanPhase"),
      copy: plan.summary || t("planCopyEmpty"),
      status: t(`planPhase_${plan.phase || "farm"}`),
      control: { type: "link", href: plan.nextTool || pageLink("free-dice"), label: plan.nextAction || t("claimDice") }
    },
    {
      title: t("impactDiceBank"),
      copy: template(t("impactDiceBankCopy"), { bank: context.effectiveDice, added: context.unappliedClaimedDice }),
      status: context.unappliedClaimedDice > 0 ? t("needsAction") : t("ready"),
      control: context.unappliedClaimedDice > 0 ? { type: "button", action: "apply-dice-bank", label: t("applyToPlan") } : { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
    }
  ]);
}

function renderEventImpactPanel() {
  const plan = updateTodayPlan() || {};
  renderImpactPanel("eventImpactPanel", [
    {
      title: t("impactTrigger"),
      copy: template(t("impactTriggerCopy"), { trigger: plan.triggerLabel || t("ready") }),
      status: plan.triggerEventId ? t("needsAction") : t("ready"),
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    },
    {
      title: t("impactPlanBlock"),
      copy: plan.block || t("planBlockDice"),
      status: t(`planPhase_${plan.phase || "farm"}`),
      control: { type: "link", href: plan.nextTool || pageLink("events"), label: plan.nextAction || t("viewEvents") }
    }
  ]);
}

function renderStickerImpactPanel() {
  const plan = updateTodayPlan() || {};
  renderImpactPanel("stickerImpactPanel", [
    {
      title: t("impactTradePressure"),
      copy: template(t("impactTradePressureCopy"), { trades: plan.openTrades ?? 0, missing: plan.missingStickers ?? 0 }),
      status: plan.openTrades ? t("needsAction") : t("ready"),
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    },
    {
      title: t("impactPlanPhase"),
      copy: plan.summary || t("planCopyEmpty"),
      status: plan.goldBlocked ? t("needsAction") : t(`planPhase_${plan.phase || "farm"}`),
      control: { type: "link", href: plan.nextTool || pageLink("stickers"), label: plan.nextAction || t("openStickerPlanner") }
    }
  ]);
}

function renderRoiImpactPanel() {
  const plan = updateTodayPlan() || {};
  const hasSavedRoi = Boolean(state.roiPlan?.target);
  renderImpactPanel("roiImpactPanel", [
    {
      title: t("impactStopLine"),
      copy: hasSavedRoi
        ? template(t("impactStopLineCopy"), {
            stop: state.roiPlan.stopLine ?? plan.stopLine ?? 0,
            reserve: state.roiPlan.reserve ?? plan.reserve ?? 0,
            window: roiWindowLabel(state.roiPlan.windowId),
            verdict: state.roiPlan.verdict || t("ready")
          })
        : t("impactStopLineEmptyCopy"),
      status: hasSavedRoi ? t("saved") : t("needsAction"),
      control: { type: "save-roi-plan", label: hasSavedRoi ? t("updatePlan") : t("saveToDashboard") }
    },
    {
      title: t("impactRoiContext"),
      copy: hasSavedRoi
        ? template(t("impactRoiContextCopy"), {
            cost: state.roiPlan.cost ?? plan.cost ?? 0,
            reward: state.roiPlan.reward ?? 0,
            net: state.roiPlan.net ?? 0
          })
        : t("impactRoiContextEmptyCopy"),
      status: hasSavedRoi ? t("saved") : t("needsAction"),
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    },
    {
      title: t("impactPlanPhase"),
      copy: plan.summary || t("planCopyEmpty"),
      status: t(`planPhase_${plan.phase || "farm"}`),
      control: { type: "link", href: homeLink("#dashboard"), label: t("sendToDashboard") }
    }
  ]);
}

function getChecklistItems() {
  return [
    {
      label: t("checkDice"),
      impact: t("checkDiceImpact"),
      control: { type: "link", href: pageLink("free-dice"), label: t("claimDice") }
    },
    {
      label: t("checkQuickWins"),
      impact: t("checkQuickWinsImpact"),
      control: { type: "link", href: pageLink("events"), label: t("viewEvents") }
    },
    {
      label: t("checkStickerBoom"),
      impact: t("checkStickerBoomImpact"),
      control: { type: "link", href: pageLink("stickers"), label: t("openStickerPlanner") }
    },
    {
      label: t("checkStop"),
      impact: t("checkStopImpact"),
      control: { type: "link", href: pageLink("roi-calculator"), label: t("runRoi") }
    }
  ];
}

function actionControl(item) {
  const control = item.control;
  if (!control) return "";
  if (control.type === "link") return `<a class="btn mini-btn" href="${resolveLocalHref(control.href)}">${escapeHtml(control.label)}</a>`;
  if (control.type === "check") return `<button class="btn mini-btn" type="button" data-complete-check="${control.index}">${escapeHtml(control.label)}</button>`;
  if (control.type === "set-target") return `<button class="btn mini-btn" type="button" data-set-target="${control.points}">${escapeHtml(control.label)}</button>`;
  if (control.type === "button" && control.action === "refresh") return `<button class="btn mini-btn" type="button" data-refresh-now>${escapeHtml(control.label)}</button>`;
  if (control.type === "button" && control.action === "mark-all-dice") return `<button class="btn mini-btn" type="button" data-mark-all-dice>${escapeHtml(control.label)}</button>`;
  if (control.type === "button" && control.action === "mark-blitz-screens") return `<button class="btn mini-btn" type="button" data-mark-blitz-screens>${escapeHtml(control.label)}</button>`;
  if (control.type === "button" && control.action === "apply-dice-bank") return `<button class="btn mini-btn" type="button" data-apply-dice-bank>${escapeHtml(control.label)}</button>`;
  if (control.type === "prepare-event") return `<button class="btn mini-btn" type="button" data-prepare-event-action="${control.id}">${escapeHtml(control.label)}</button>`;
  if (control.type === "copy-text") return `<button class="btn mini-btn" type="button" data-copy-text="${escapeHtmlAttr(control.text)}">${escapeHtml(control.label)}</button>`;
  if (control.type === "home-plan") return `<button class="btn mini-btn" type="button" data-send-sticker-plan>${escapeHtml(control.label)}</button>`;
  if (control.type === "save-roi-plan") return `<button class="btn mini-btn" type="button" data-save-roi-plan>${escapeHtml(control.label)}</button>`;
  if (control.type === "scroll-targets") return `<button class="btn mini-btn" type="button" data-scroll-targets>${escapeHtml(control.label)}</button>`;
  return "";
}

function bindActionControls(root) {
  root.querySelectorAll("[data-complete-check]").forEach((button) => {
    button.addEventListener("click", () => {
      ensureDailyReset();
      state.checks ||= {};
      state.checks[button.dataset.completeCheck] = true;
      state.checkDay = gameDayKey();
      saveState();
      renderShared();
    });
  });
  root.querySelectorAll("[data-set-target]").forEach((button) => {
    button.addEventListener("click", () => {
      setValue("homeTargetPoints", button.dataset.setTarget);
      persistHomeInputs();
      renderShared();
      document.getElementById("dashboard")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  root.querySelectorAll("[data-refresh-now]").forEach((button) => {
    button.addEventListener("click", async () => {
      button.textContent = t("checkingShort");
      await refreshContentNow();
      renderResourceGap();
      button.textContent = t("refreshNow");
    });
  });
  root.querySelectorAll("[data-mark-all-dice]").forEach((button) => {
    button.addEventListener("click", () => document.getElementById("markAllDice")?.click());
  });
  root.querySelectorAll("[data-apply-dice-bank]").forEach((button) => {
    button.addEventListener("click", () => {
      const links = activeDiceLinks();
      normalizeClaimedLinks(links);
      const claimedLinks = links.filter(isDiceLinkClaimed);
      state.appliedClaimedLinkIds ||= {};
      const pendingLinks = claimedLinks.filter((link) => !state.appliedClaimedLinkIds[link.id]);
      const delta = pendingLinks.reduce((sum, link) => sum + (Number(link.dice) || 0), 0);
      if (delta <= 0) {
        button.textContent = t("saved");
        setTimeout(() => (button.textContent = t("applyToPlan")), 1000);
        return;
      }
      pendingLinks.forEach((link) => {
        state.appliedClaimedLinkIds[link.id] = true;
      });
      const baseDiceBank = Number.isFinite(Number(state.plan?.diceBank))
        ? Number(state.plan.diceBank)
        : numberValue("homeDiceBank", state.roi?.dice ?? 1200);
      state.plan = {
        ...(state.plan || {}),
        diceBank: baseDiceBank + delta
      };
      saveState();
      if (document.getElementById("dashboard")) renderShared();
      renderDiceList();
      button.textContent = t("saved");
      setTimeout(() => (button.textContent = t("applyToPlan")), 1000);
    });
  });
  root.querySelectorAll("[data-mark-blitz-screens]").forEach((button) => {
    button.addEventListener("click", () => {
      const box = document.getElementById("tradeScreenshotsReady");
      if (box) {
        box.checked = true;
        box.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
  });
  root.querySelectorAll("[data-prepare-event-action]").forEach((button) => {
    button.addEventListener("click", () => {
      state.preparedEvents ||= {};
      state.preparedEvents[button.dataset.prepareEventAction] = true;
      saveState();
      renderEventList();
      renderEventPlanPanel();
      if (document.getElementById("dashboard")) renderShared();
      else button.textContent = t("saved");
    });
  });
  root.querySelectorAll("[data-copy-text]").forEach((button) => {
    button.addEventListener("click", async () => {
      await copyText(button.dataset.copyText);
      button.textContent = t("copied");
      setTimeout(() => (button.textContent = t("copyTradeText")), 1000);
    });
  });
  root.querySelectorAll("[data-send-sticker-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      state.plan = {
        ...(state.plan || {}),
        missingStickers: numberValue("plannerMissing", state.stickers?.missing ?? 8),
        goldBlocked: Boolean(document.getElementById("plannerGold")?.checked),
        stickerSyncedAt: new Date().toISOString()
      };
      state.stickers = {
        ...(state.stickers || {}),
        missing: numberValue("plannerMissing", state.stickers?.missing ?? 8),
        dupes: numberValue("plannerDupes", state.stickers?.dupes ?? 0),
        gold: Boolean(document.getElementById("plannerGold")?.checked)
      };
      saveState();
      button.textContent = t("saved");
      setTimeout(() => {
        window.location.href = homeLink("#dashboard");
      }, 350);
    });
  });
  root.querySelectorAll("[data-save-roi-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      const dice = numberValue("roiDice");
      const current = numberValue("roiCurrent");
      const targetPoints = numberValue("roiTarget");
      const multiplier = Math.max(1, numberValue("roiMultiplier", 10));
      const windowId = document.getElementById("roiWindowSelect")?.value || state.roi?.windowId || state.planTriggerEventId || "none";
      const boardState = document.getElementById("roiBoardState")?.value || state.roi?.boardState || "neutral";
      const boostState = document.getElementById("roiBoostState")?.value || state.roi?.boostState || "none";
      const context = roiContextScore({ windowId, boardState, boostState });
      const gap = Math.max(0, targetPoints - current);
      const cost = Math.max(multiplier, Math.round(estimateDiceCost(gap, multiplier) * context.costFactor));
      const reward = Math.round(estimateRewardValue(targetPoints) * context.rewardFactor);
      const net = reward - cost;
      const verdictKey = context.score < 0 || net < -dice * 0.18 ? "stop" : context.score < 2 || net < 0 ? "wait" : "push";
      const verdict = verdictKey === "push" ? t("pushVerdict") : verdictKey === "wait" ? t("waitVerdict") : t("stopVerdict");
      const reserve = Math.max(200, Math.round(dice * (context.score < 1 ? 0.28 : 0.2)));
      const stopLine = Math.max(current, targetPoints - Math.max(100, Math.floor(gap * 0.25)));
      state.plan = {
        ...(state.plan || {}),
        diceBank: dice,
        currentPoints: current,
        targetPoints
      };
      state.roiPlan = {
        dice,
        current,
        target: targetPoints,
        multiplier,
        windowId,
        boardState,
        boostState,
        context,
        cost,
        reward,
        net,
        reserve,
        stopLine,
        verdict,
        verdictKey,
        savedAt: new Date().toISOString()
      };
      state.roi = {
        dice,
        current,
        target: targetPoints,
        multiplier,
        windowId,
        boardState,
        boostState,
        cost,
        reward,
        net,
        verdictKey
      };
      if (windowId !== "none") state.planTriggerEventId = windowId;
      saveState();
      button.textContent = t("saved");
      if (document.getElementById("dashboard")) renderShared();
      else {
        renderRoiImpactPanel();
        renderRoiWindowOptions();
      }
      const shouldReturnHome = window.location.pathname.includes("/pages/");
      setTimeout(() => {
        if (shouldReturnHome) window.location.href = homeLink("#dashboard");
        else button.textContent = t("saveToDashboard");
      }, shouldReturnHome ? 350 : 1000);
    });
  });
  root.querySelectorAll("[data-scroll-targets]").forEach((button) => {
    button.addEventListener("click", () => {
      document.getElementById("roiTargetOptions")?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function activeDiceLinks() {
  const now = Date.now();
  const freshness = dataFreshnessSummary();
  const seeded = siteData.diceLinks.filter((link) => {
    if (link.source === "official") return true;
    if (freshness.level === "stale") return false;
    return new Date(link.expiresAt).getTime() > now;
  });
  return seeded;
}

function claimableDiceLinks() {
  return activeDiceLinks().filter((link) => Number(link.dice) > 0);
}

function officialRewardLink() {
  return siteData.diceLinks.find((link) => link.source === "official" && link.claimUrl) || null;
}

function diceLinkClaimKey(link) {
  return `${link.claimUrl}|${link.expiresAt}|${link.dice || 0}`;
}

function isDiceLinkClaimed(link) {
  const saved = state.claimedLinks?.[link.id];
  if (!saved) return false;
  if (saved === true) return true;
  return saved === diceLinkClaimKey(link);
}

function normalizeClaimedLinks(links) {
  if (!state.claimedLinks) return;
  let changed = false;
  const activeIds = new Set(links.map((link) => link.id));
  links.forEach((link) => {
    if (state.claimedLinks[link.id] === true) {
      state.claimedLinks[link.id] = diceLinkClaimKey(link);
      changed = true;
    }
  });
  Object.keys(state.claimedLinks).forEach((id) => {
    if (!activeIds.has(id)) {
      delete state.claimedLinks[id];
      if (state.appliedClaimedLinkIds) delete state.appliedClaimedLinkIds[id];
      changed = true;
    }
  });
  if (changed) saveState();
}

function ensureDailyReset() {
  const currentDay = gameDayKey();
  if (state.checkDay === currentDay) return;
  state.checkDay = currentDay;
  state.checks = {};
  state.confirmedWatchEvents = {};
  state.dailyResetSeenAt = new Date().toISOString();
  saveState();
}

function gameDayKey(date = new Date()) {
  const reset = nextQuickWinsResetBoundary(date);
  const previousReset = new Date(reset.getTime() - 24 * 3600000);
  return `${previousReset.getUTCFullYear()}-${String(previousReset.getUTCMonth() + 1).padStart(2, "0")}-${String(previousReset.getUTCDate()).padStart(2, "0")}`;
}

function nextGameDayReset(date = new Date()) {
  return nextQuickWinsResetBoundary(date);
}

function gameDayResetInfo() {
  return {
    key: gameDayKey(),
    next: nextGameDayReset()
  };
}

function timeZoneLabel() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || t("localTime");
}

function quickWinsResetLabel() {
  return `${QUICK_WINS_RESET_HOUR_LOCAL}:00 ${QUICK_WINS_RESET_TIME_ZONE}`;
}

function nextQuickWinsResetBoundary(date = new Date()) {
  const currentInTarget = zonedParts(date, QUICK_WINS_RESET_TIME_ZONE);
  const targetUtc = Date.UTC(
    currentInTarget.year,
    currentInTarget.month - 1,
    currentInTarget.day,
    QUICK_WINS_RESET_HOUR_LOCAL,
    0,
    0,
    0
  );
  const offsetMinutes = timeZoneOffsetMinutes(QUICK_WINS_RESET_TIME_ZONE, new Date(targetUtc));
  const todayReset = new Date(targetUtc - offsetMinutes * 60000);
  if (date.getTime() < todayReset.getTime()) return todayReset;
  const tomorrow = new Date(todayReset.getTime() + 24 * 3600000);
  const tomorrowInTarget = zonedParts(tomorrow, QUICK_WINS_RESET_TIME_ZONE);
  const tomorrowUtc = Date.UTC(
    tomorrowInTarget.year,
    tomorrowInTarget.month - 1,
    tomorrowInTarget.day,
    QUICK_WINS_RESET_HOUR_LOCAL,
    0,
    0,
    0
  );
  const tomorrowOffsetMinutes = timeZoneOffsetMinutes(QUICK_WINS_RESET_TIME_ZONE, new Date(tomorrowUtc));
  return new Date(tomorrowUtc - tomorrowOffsetMinutes * 60000);
}

function zonedParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false
  });
  const parts = formatter.formatToParts(date).reduce((acc, part) => {
    if (part.type !== "literal") acc[part.type] = part.value;
    return acc;
  }, {});
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second)
  };
}

function timeZoneOffsetMinutes(timeZone, date) {
  const parts = zonedParts(date, timeZone);
  const asUtc = Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  return Math.round((asUtc - date.getTime()) / 60000);
}

function syncDiceChecklistState(links) {
  ensureDailyReset();
  normalizeClaimedLinks(links);
  const handled = links.length > 0 && links.every(isDiceLinkClaimed);
  state.checks ||= {};
  if (state.checks[0] === handled) return;
  state.checks[0] = handled;
  state.checkDay = gameDayKey();
  saveState();
}

function activeEvents() {
  const now = Date.now();
  return siteData.events.filter((event) => {
    if (dataFreshnessSummary().level === "stale" && event.source !== "official") return false;
    return new Date(event.endsAt).getTime() > now - 3600000;
  });
}

function isDailyUtilityEvent(event) {
  return event?.id === "quick-wins" || event?.type === "daily";
}

function isActionableEvent(event) {
  return Boolean(event) && event.status !== "watch" && event.source !== "community";
}

function actionableEvents() {
  return activeEvents().filter(isActionableEvent);
}

function isSpendTriggerEvent(event) {
  return isActionableEvent(event) && !isDailyUtilityEvent(event);
}

function confirmedSpendEvents() {
  return activeEvents().filter(isSpendTriggerEvent);
}

function watchOnlyEvents() {
  return activeEvents().filter((event) => !isActionableEvent(event));
}

function filteredEvents(filter) {
  const events = activeEvents();
  if (filter === "spend") return events.filter(isSpendTriggerEvent);
  if (filter === "actionable") return events.filter(isActionableEvent);
  if (filter === "watch") return events.filter((event) => !isActionableEvent(event));
  if (filter === "all") return events;
  return events.filter((event) => event.type === filter);
}

function eventFilterLabel(filter) {
  if (filter === "all") return t("allEvents");
  if (filter === "spend") return t("spendWindows");
  if (filter === "actionable") return t("confirmedWindows");
  if (filter === "watch") return t("watchOnly");
  return eventTypeLabel(filter);
}

function communityWatchSummary() {
  const watchEvents = watchOnlyEvents().filter((event) => event.source === "community" || event.status === "watch");
  const unconfirmed = watchEvents.filter((event) => !isConfirmedWatchEvent(event.id));
  return {
    count: watchEvents.length,
    events: watchEvents.length ? watchEvents.map(eventName).join(", ") : t("ready"),
    unconfirmedCount: unconfirmed.length,
    unconfirmedEvents: unconfirmed.length ? unconfirmed.map(eventName).join(", ") : t("ready")
  };
}

function dataFreshnessSummary() {
  const updated = new Date(siteData.meta.updatedAt).getTime();
  const next = new Date(siteData.meta.nextRefreshAt).getTime();
  const now = Date.now();
  const staleAfter = updated + (Number(siteData.meta.updateCadenceHours) || 6) * 2 * 3600000;
  if (now > staleAfter) {
    return {
      level: "stale",
      status: t("freshnessStale"),
      copy: `${template(t("resourceGapRefreshCopy"), { updated: formatDate(siteData.meta.updatedAt), next: formatDate(siteData.meta.nextRefreshAt) })} ${t("freshnessStaleCopy")}`
    };
  }
  if (now >= next) {
    return {
      level: "due",
      status: t("freshnessDue"),
      copy: `${template(t("resourceGapRefreshCopy"), { updated: formatDate(siteData.meta.updatedAt), next: formatDate(siteData.meta.nextRefreshAt) })} ${t("freshnessDueCopy")}`
    };
  }
  return {
    level: "fresh",
    status: t("freshnessFresh"),
    copy: `${template(t("resourceGapRefreshCopy"), { updated: formatDate(siteData.meta.updatedAt), next: formatDate(siteData.meta.nextRefreshAt) })} ${t("freshnessFreshCopy")}`
  };
}

function scheduleRefreshCheck() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(async () => {
    const next = new Date(siteData.meta.nextRefreshAt).getTime();
    if (Date.now() < next) return;
    try {
      await refreshContentNow({ reason: "timer", force: true });
    } catch (error) {
      console.warn("Refresh check failed", error);
    }
  }, 15 * 60 * 1000);
}

function scheduleDailyResetCheck() {
  if (dailyResetTimer) clearInterval(dailyResetTimer);
  dailyResetTimer = setInterval(() => {
    const previousDay = state.checkDay;
    ensureDailyReset();
    if (state.checkDay !== previousDay) {
      renderShared();
      renderByPage();
    }
  }, 60 * 1000);
}

function injectAnalyticsHook() {
  const config = window.RollRadarConfig || {};
  if (!config.analyticsId || config.analyticsId.includes("REPLACE_ME")) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", config.analyticsId, { anonymize_ip: true });
}

function sourcePill(source) {
  return `<span class="source-pill source-${source}">${sourceLabel(source)}</span>`;
}

function sourceLabel(source) {
  const keyMap = {
    official: "official",
    public: "public",
    community: "community",
    inference: "inference"
  };
  return t(keyMap[source] || source);
}

function policyCopy(key, fallback) {
  const map = {
    official: "officialPolicyCopy",
    public: "publicPolicyCopy",
    community: "communityPolicyCopy",
    inference: "inferencePolicyCopy"
  };
  return t(map[key]) || fallback;
}

function estimateRewardValue(target) {
  const steps = siteData.milestones[0].steps;
  const next = steps.find((step) => step.points >= target) || steps[steps.length - 1];
  return next.diceValue;
}

function estimateDiceCost(pointGap, multiplier) {
  return Math.ceil(Math.max(0, pointGap) / Math.max(multiplier * 2.2, 1)) * multiplier;
}

function timeUntil(iso) {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return t("ended");
  const hours = Math.floor(diff / 3600000);
  const minutes = Math.floor((diff % 3600000) / 60000);
  if (hours >= 24) return template(t("leftDays"), { d: Math.floor(hours / 24), h: hours % 24 });
  return template(t("leftHours"), { h: hours, m: minutes });
}

function formatDate(iso) {
  return new Intl.DateTimeFormat(currentLang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(iso));
}

function formatTime(dateOrIso) {
  return new Intl.DateTimeFormat(currentLang, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short"
  }).format(new Date(dateOrIso));
}

function stampFreshness(mode = "live") {
  const target = document.getElementById("freshnessText");
  if (!target) return;
  const suffixMap = {
    seed: t("seedMode"),
    cache: t("cacheMode"),
    checking: t("checkingShort")
  };
  const suffix = suffixMap[mode] ? ` (${suffixMap[mode]})` : "";
  target.textContent = `${t("updated")}: ${formatDate(siteData.meta.updatedAt)} · ${dataFreshnessSummary().status}${suffix}`;
}

function shouldForceRefreshOnOpen() {
  const freshness = dataFreshnessSummary();
  const lastAttempt = new Date(state.lastRefreshAttemptAt || 0).getTime();
  if (freshness.level === "stale") return true;
  if (freshness.level === "due" && Date.now() - lastAttempt > 3 * 60 * 1000) return true;
  return false;
}

function saveLiveCache() {
  try {
    localStorage.setItem(LIVE_CACHE_KEY, JSON.stringify({
      siteData,
      i18n,
      savedAt: new Date().toISOString()
    }));
  } catch {}
}

function loadLiveCache() {
  try {
    const payload = JSON.parse(localStorage.getItem(LIVE_CACHE_KEY) || "null");
    if (!payload?.siteData?.meta || !payload?.i18n?.en) return false;
    const cachedUpdated = new Date(payload.siteData.meta.updatedAt).getTime();
    const currentUpdated = new Date(siteData.meta.updatedAt).getTime();
    if (!Number.isFinite(cachedUpdated) || cachedUpdated <= currentUpdated) return false;
    siteData = payload.siteData;
    i18n = payload.i18n;
    lastRefreshMode = "cache";
    return true;
  } catch {
    return false;
  }
}

function setRefreshFeedback(mode, reason = "manual", startedAt = new Date().toISOString(), error = null) {
  state.lastRefreshAttemptAt = startedAt;
  state.lastRefreshReason = reason;
  state.lastRefreshMode = mode;
  state.lastRefreshError = error ? String(error.message || error) : "";
  if (mode === "live" || mode === "cache") state.lastRefreshSuccessAt = new Date().toISOString();
  saveState();
}

function syncRuntimeFreshnessState(mode = state.lastRefreshMode || lastRefreshMode) {
  lastRefreshMode = mode;
  document.documentElement.dataset.freshness = dataFreshnessSummary().level;
  document.documentElement.dataset.refreshMode = mode;
}

function bindVisibilityRefresh() {
  document.addEventListener("visibilitychange", async () => {
    if (document.visibilityState !== "visible") return;
    if (!shouldForceRefreshOnOpen()) return;
    try {
      await refreshContentNow({ reason: "visible", force: true });
    } catch (error) {
      console.warn("Visibility refresh failed", error);
    }
  });
}

function isCurrentDataUsable() {
  return dataFreshnessSummary().level !== "stale";
}

function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value;
}

function numberValue(id, fallback = 0) {
  const value = Number(document.getElementById(id)?.value);
  return Number.isFinite(value) ? value : fallback;
}

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Some privacy-focused browsers and automated review environments disable storage.
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[char]);
}

function escapeHtmlAttr(value) {
  return escapeHtml(value).replaceAll("\n", "&#10;");
}

function template(text, values) {
  return Object.entries(values).reduce((output, [key, value]) => output.replaceAll(`{${key}}`, value), text);
}

function showFatalState(message) {
  console.error(message);
  const freshness = document.getElementById("freshnessText");
  if (freshness) freshness.textContent = message;
}

function cloneData(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}
