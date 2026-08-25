(() => {
  const nativeFetch = window.fetch.bind(window);
  const CACHE_PREFIX = "ligakompakt.fetch.";
  const isApi = input => {
    try {
      const url = typeof input === "string" ? input : input?.url;
      return new URL(url, location.href).hostname === "api.openligadb.de";
    } catch { return false; }
  };
  const keyFor = input => {
    const url = typeof input === "string" ? input : input?.url;
    return CACHE_PREFIX + url;
  };
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  window.fetch = async function(input, init = {}) {
    if (!isApi(input)) return nativeFetch(input, init);
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 12000);
      try {
        const response = await nativeFetch(input, { ...init, cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.clone().text();
        try { localStorage.setItem(keyFor(input), JSON.stringify({ saved: Date.now(), status: response.status, type: response.headers.get("content-type") || "application/json", text })); } catch {}
        return response;
      } catch (e) {
        lastError = e;
        if (attempt < 2) await sleep(600 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
    try {
      const cached = JSON.parse(localStorage.getItem(keyFor(input)) || "null");
      if (cached?.text) {
        const banner = document.getElementById("networkBanner");
        if (banner) {
          banner.textContent = "OpenLigaDB vorübergehend nicht erreichbar – zuletzt gespeicherte Daten werden angezeigt";
          banner.classList.remove("hidden");
        }
        return new Response(cached.text, { status: 200, headers: { "content-type": cached.type || "application/json", "x-ligakompakt-cache": "fallback" } });
      }
    } catch {}
    throw lastError || new Error("OpenLigaDB nicht erreichbar");
  };

  window.addEventListener("unhandledrejection", event => {
    const msg = String(event.reason?.message || event.reason || "Unbekannter Fehler");
    console.error("LigaKompakt unhandled rejection:", event.reason);
    const dot = document.getElementById("liveDot");
    if (dot && /fetch|network|http|abort|openliga/i.test(msg)) dot.textContent = "Datenfehler";
  });
})();
