(() => {
  const API_BASE = "https://api.openligadb.de";
  const CACHE_PREFIX = "ligakompakt.api.";

  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

  async function resilientGet(path) {
    const url = API_BASE + path;
    let lastError;
    for (let attempt = 0; attempt < 3; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 10000);
      try {
        const response = await fetch(url, { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error(`HTTP ${response.status} bei ${path}`);
        const data = await response.json();
        try { localStorage.setItem(CACHE_PREFIX + path, JSON.stringify({ saved: Date.now(), data })); } catch {}
        return data;
      } catch (error) {
        lastError = error;
        if (attempt < 2) await delay(700 * (attempt + 1));
      } finally {
        clearTimeout(timer);
      }
    }
    try {
      const cached = JSON.parse(localStorage.getItem(CACHE_PREFIX + path) || "null");
      if (cached && cached.data != null) {
        const banner = document.getElementById("networkBanner");
        if (banner) {
          banner.textContent = "Verbindung gestört – zuletzt gespeicherte Daten werden angezeigt";
          banner.classList.remove("hidden");
        }
        return cached.data;
      }
    } catch {}
    throw lastError || new Error(`Datenabruf fehlgeschlagen: ${path}`);
  }

  try { get = resilientGet; } catch {}

  async function robustRefreshAll() {
    const refresh = document.getElementById("refreshBtn");
    const liveDot = document.getElementById("liveDot");
    const updatedAt = document.getElementById("updatedAt");
    refresh?.classList.add("spinning");
    if (liveDot) liveDot.textContent = "Lädt …";

    try {
      const core = await Promise.allSettled([loadToday(), loadTable(), loadTeams()]);
      const labels = ["Live-Daten", "Tabelle", "Vereine"];
      const failures = core.map((r, i) => r.status === "rejected" ? `${labels[i]}: ${r.reason?.message || r.reason}` : null).filter(Boolean);

      if (core[0].status === "rejected") throw core[0].reason;

      setupMatchdays();
      const select = document.getElementById("matchdaySelect");
      if (select) select.value = String(currentGroup);

      try { await loadFixtures(currentGroup); }
      catch (e) { failures.push(`Spieltag: ${e?.message || e}`); }

      if (failures.length) {
        console.warn("LigaKompakt Teilfehler:", failures);
        if (liveDot) liveDot.textContent = "Teilweise online";
      } else if (liveDot) {
        liveDot.textContent = navigator.onLine ? "Online" : "Offline";
      }

      const sub = document.getElementById("todaySub");
      if (sub && currentMatches?.length) sub.textContent = `Live-Daten · aktualisiert ${new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date())}`;
      if (updatedAt) updatedAt.textContent = `Zuletzt aktualisiert: ${new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
    } catch (error) {
      console.error("LigaKompakt Datenaktualisierung:", error);
      const today = document.getElementById("todayMatches");
      if (today && !currentMatches?.length) today.innerHTML = '<div class="error">Live-Daten konnten gerade nicht geladen werden. Bitte erneut versuchen.</div>';
      if (liveDot) liveDot.textContent = navigator.onLine ? "Verbindungsfehler" : "Offline";
    } finally {
      refresh?.classList.remove("spinning");
    }
  }

  try { refreshAll = robustRefreshAll; } catch {}
  const refreshButton = document.getElementById("refreshBtn");
  if (refreshButton) refreshButton.onclick = robustRefreshAll;

  // Nach dem Laden dieses Fixes einmal gezielt neu aktualisieren.
  setTimeout(() => robustRefreshAll(), 150);
})();
