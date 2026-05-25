window.RollRadarConfig = window.RollRadarConfig || {
  adProvider: "ezoic",
  fallbackAdProvider: "adsense",
  adsenseEnabled: true,
  adsenseClient: "ca-pub-2456404542897668",
  ezoicEnabled: true,
  ezoicDomain: "rollradargo.com",
  ezoicAdsTxtManagerId: "19390",
  ezoicVerificationToken: "",
  // Keep this false until the live Ezoic placeholder IDs from the dashboard are confirmed.
  ezoicPlacementsReady: false,
  // Replace these IDs with the real IDs created in your Ezoic dashboard before enabling Ezoic placements.
  adPlacements: {
    "home-top": { adsenseSlot: "1000000001", ezoicSlot: 101 },
    "dice-top": { adsenseSlot: "1000000002", ezoicSlot: 102 },
    "events-inline": { adsenseSlot: "1000000003", ezoicSlot: 103 },
    "stickers-inline": { adsenseSlot: "1000000004", ezoicSlot: 104 },
    "roi-inline": { adsenseSlot: "1000000005", ezoicSlot: 105 }
  },
  analyticsId: "G-REPLACE_ME",
  domain: "https://rollradargo.com"
};
