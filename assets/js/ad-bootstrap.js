(function bootstrapAds() {
  const config = window.RollRadarConfig || {};
  const currentScript = document.currentScript;
  const parent = currentScript?.parentNode || document.head;
  const head = document.head || parent;

  function normalizeProvider(value) {
    const provider = String(value || "").trim().toLowerCase();
    if (provider === "ezoic" || provider === "adsense") return provider;
    return "";
  }

  function normalizeHostname(value) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw) return "";
    try {
      const hostname = raw.includes("://") ? new URL(raw).hostname : raw;
      return hostname.replace(/^www\./, "");
    } catch (error) {
      return raw.replace(/^www\./, "");
    }
  }

  function currentHostname() {
    return normalizeHostname(window.location.hostname);
  }

  function expectedEzoicHostname() {
    return normalizeHostname(config.ezoicDomain || config.domain);
  }

  function isProductionHost() {
    const current = currentHostname();
    const expected = expectedEzoicHostname();
    return Boolean(current && expected && current === expected);
  }

  function hasReadyEzoicPlacements() {
    if (config.ezoicPlacementsReady !== true) return false;
    const placements = Object.values(config.adPlacements || {});
    return placements.length > 0 && placements.every((placement) => Number.isFinite(Number(placement?.ezoicSlot)));
  }

  function canUseEzoic() {
    return config.ezoicEnabled !== false && isProductionHost() && hasReadyEzoicPlacements();
  }

  function preferredPrimaryProvider() {
    const preferred = normalizeProvider(config.adProvider) || "ezoic";
    if (preferred === "ezoic" && !canUseEzoic()) {
      return normalizeProvider(config.fallbackAdProvider) || "adsense";
    }
    return preferred;
  }

  function injectEzoicVerificationMeta() {
    const token = String(config.ezoicVerificationToken || "").trim();
    if (!token || !head || document.querySelector('meta[name="ezoic-site-verification"]')) return;
    const meta = document.createElement("meta");
    meta.setAttribute("name", "ezoic-site-verification");
    meta.setAttribute("content", token);
    head.appendChild(meta);
  }

  function insertScript(attributes) {
    const script = document.createElement("script");
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === true) script.setAttribute(key, "");
      else if (value !== false && value != null) script.setAttribute(key, String(value));
    });
    parent.insertBefore(script, currentScript || null);
    return script;
  }

  function dispatch(provider, status) {
    window.dispatchEvent(new CustomEvent("rollradar:ads-provider-changed", {
      detail: { provider, status }
    }));
  }

  const runtime = window.RollRadarAdsBoot = window.RollRadarAdsBoot || {
    config,
    primaryProvider: preferredPrimaryProvider(),
    fallbackProvider: normalizeProvider(config.fallbackAdProvider),
    activeProvider: preferredPrimaryProvider(),
    loadedProviders: {},
    failedProviders: {},
    ezoicEligible: canUseEzoic(),
    productionHostMatched: isProductionHost(),
    expectedHost: expectedEzoicHostname(),
    setActiveProvider(provider) {
      this.activeProvider = normalizeProvider(provider) || this.primaryProvider;
      document.documentElement.dataset.adProvider = this.activeProvider;
      dispatch(this.activeProvider, "active");
    }
  };

  function failProvider(provider) {
    runtime.failedProviders[provider] = true;
    if (runtime.fallbackProvider && runtime.fallbackProvider !== provider && !runtime.loadedProviders[runtime.fallbackProvider]) {
      runtime.setActiveProvider(runtime.fallbackProvider);
      loadProvider(runtime.fallbackProvider);
      return;
    }
    dispatch(provider, "failed");
  }

  function loadProvider(provider) {
    if (!provider || runtime.loadedProviders[provider]) return;

    if (provider === "ezoic" && canUseEzoic()) {
      window.ezstandalone = window.ezstandalone || {};
      window.ezstandalone.cmd = window.ezstandalone.cmd || [];
      injectEzoicVerificationMeta();

      insertScript({
        "data-cfasync": "false",
        src: "https://cmp.gatekeeperconsent.com/min.js"
      });
      insertScript({
        "data-cfasync": "false",
        src: "https://the.gatekeeperconsent.com/cmp.min.js"
      });

      const ezoicScript = insertScript({
        async: true,
        src: "https://www.ezojs.com/ezoic/sa.min.js"
      });
      insertScript({
        async: true,
        src: "https://ezoicanalytics.com/analytics.js"
      });
      ezoicScript.addEventListener("load", () => {
        runtime.loadedProviders.ezoic = true;
        runtime.setActiveProvider("ezoic");
      });
      ezoicScript.addEventListener("error", () => failProvider("ezoic"));
      return;
    }

    if (provider === "adsense" && config.adsenseEnabled !== false && config.adsenseClient) {
      const adsenseScript = insertScript({
        async: true,
        src: `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(config.adsenseClient)}`,
        crossorigin: "anonymous"
      });
      adsenseScript.addEventListener("load", () => {
        runtime.loadedProviders.adsense = true;
        runtime.setActiveProvider("adsense");
      });
      adsenseScript.addEventListener("error", () => failProvider("adsense"));
    }
  }

  if (runtime.primaryProvider !== "ezoic") {
    dispatch("ezoic", "skipped");
  }
  runtime.setActiveProvider(runtime.primaryProvider);
  loadProvider(runtime.primaryProvider);
})();
