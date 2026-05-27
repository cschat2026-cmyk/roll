window.RollRadarConfig = window.RollRadarConfig || {
  adProvider: "ezoic",
  fallbackAdProvider: "adsense",
  adsenseEnabled: true,
  adsenseClient: "ca-pub-2456404542897668",
  // Keep this false until the real AdSense display slot IDs are ready.
  // If Auto Ads is enabled in AdSense, the script can still run account-side after approval.
  adsensePlacementsReady: false,
  ezoicEnabled: true,
  ezoicDomain: "rich20.top",
  ezoicAdsTxtManagerId: "19390",
  ezoicVerificationToken: "",
  // Keep this false until the live Ezoic placeholder IDs from the dashboard are confirmed.
  ezoicPlacementsReady: false,
  // Replace these IDs with the real IDs created in your Ezoic dashboard / AdSense account
  // before enabling manual placements.
  adPlacements: {
    "home-top": { adsenseSlot: "", ezoicSlot: 101 },
    "dice-top": { adsenseSlot: "", ezoicSlot: 102 },
    "events-inline": { adsenseSlot: "", ezoicSlot: 103 },
    "stickers-inline": { adsenseSlot: "", ezoicSlot: 104 },
    "roi-inline": { adsenseSlot: "", ezoicSlot: 105 }
  },
  analyticsId: "G-REPLACE_ME",
  domain: "https://rich20.top"
};
