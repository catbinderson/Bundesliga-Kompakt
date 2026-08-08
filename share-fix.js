(() => {
  const SHARE_URL = "https://catbinderson.github.io/Bundesliga-Kompakt/teilen.html?v=6";
  const COUNTER_BASE = "https://api.counterapi.dev/v1/ligakompakt-andreas-binder-2026";
  const OPENLIGA_API = "https://api.openligadb.de";
  const LEAGUE = "bl1";
  const SEASON = "2026";
  const matchCache = new Map();
  let goalGetterMapPromise = null;
  let enrichTimer = null;

  async function countUsage() {
    try {
      await fetch(`${COUNTER_BASE}/app-opens-v1/up`, { cache: "no-store", mode: "cors" });
    } catch (error) {
      console.warn("Aufrufstatistik nicht erreichbar", error);
    }

    try {
      const key = "ligakompakt-unique-device-counted-v1";
      if (!localStorage.getItem(key)) {
        const response = await fetch(`${COUNTER_BASE}/unique-devices-v1/up`, { cache: "no-store", mode: "cors" });
        if (response.ok) localStorage.setItem(key, "1");
      }
    } catch (error) {
      console.warn("Gerätestatistik nicht erreichbar", error);
    }
  }

  function addStatsEntry() {
    if (document.getElementById("usageStatsCard")) return;
    const liveCenter = document.getElementById("liveCenter");
    if (!liveCenter) return;

    const card = document.createElement("a");
    card.id = "usageStatsCard";
    card.href = "statistik.html";
    card.setAttribute("aria-label", "LigaKompakt Nutzungsstatistik öffnen");
    card.style.cssText = "display:flex;align-items:center;gap:13px;margin:0 0 14px;padding:15px 16px;text-decoration:none;color:var(--text);background:linear-gradient(135deg,rgba(79,163,255,.13),rgba(57,219,134,.09));border:1px solid rgba(79,163,255,.25);border-radius:20px;box-shadow:var(--shadow)";
    card.innerHTML = `
      <span style="display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:rgba(79,163,255,.14);font-size:22px">📊</span>
      <span style="min-width:0;flex:1">
        <strong style="display:block;font-size:14px">Nutzungsstatistik</strong>
        <small style="display:block;margin-top:3px;color:var(--muted);font-size:11px">Besucher, Aufrufe und 30-Tage-Verlauf ansehen</small>
      </span>
      <span style="color:var(--blue);font-size:22px;font-weight:800">›</span>`;
    liveCenter.insertAdjacentElement("afterend", card);
  }

  function readId(value) {
    if (value === null || value === undefined || value === "") return "";
    return String(value);
  }

  function goalGetterId(item) {
    return readId(
      item?.goalGetterID ?? item?.goalGetterId ?? item?.goalgetterID ?? item?.goalgetterId ??
      item?.goalGetter?.goalGetterID ?? item?.goalGetter?.goalGetterId ?? item?.goalGetter?.id ??
      item?.id
    );
  }

  function goalGetterName(item) {
    return String(
      item?.goalGetterName ?? item?.goalgetterName ?? item?.name ??
      item?.goalGetter?.goalGetterName ?? item?.goalGetter?.name ?? ""
    ).trim();
  }

  async function loadGoalGetterMap() {
    if (goalGetterMapPromise) return goalGetterMapPromise;
    goalGetterMapPromise = (async () => {
      const map = new Map();
      try {
        const response = await fetch(`${OPENLIGA_API}/getgoalgetters/${LEAGUE}/${SEASON}`, { cache: "no-store", mode: "cors" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const list = Array.isArray(data) ? data : Array.isArray(data?.goalGetters) ? data.goalGetters : [];
        for (const item of list) {
          const id = goalGetterId(item);
          const name = goalGetterName(item);
          if (id && name) map.set(id, name);
        }
      } catch (error) {
        console.warn("Torschützenliste nicht erreichbar", error);
      }
      return map;
    })();
    return goalGetterMapPromise;
  }

  async function loadMatch(matchId) {
    if (matchCache.has(matchId)) return matchCache.get(matchId);
    const promise = (async () => {
      try {
        const response = await fetch(`${OPENLIGA_API}/getmatchdata/${encodeURIComponent(matchId)}`, { cache: "no-store", mode: "cors" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        return Array.isArray(data) ? data[0] : data;
      } catch (error) {
        console.warn(`Spieldetails ${matchId} nicht erreichbar`, error);
        return null;
      }
    })();
    matchCache.set(matchId, promise);
    return promise;
  }

  function scorerName(goal, map) {
    const direct = goalGetterName(goal);
    if (direct) return direct;
    const id = goalGetterId(goal);
    return id ? (map.get(id) || "") : "";
  }

  async function enrichMatchCard(card, map) {
    if (!card?.dataset?.matchId) return;
    const rows = [...card.querySelectorAll(".goal-list > div")];
    if (!rows.some(row => row.querySelector("span")?.textContent?.includes("Torschütze unbekannt"))) return;

    const match = await loadMatch(card.dataset.matchId);
    const goals = Array.isArray(match?.goals)
      ? match.goals.slice().sort((a, b) => Number(a.matchMinute || 0) - Number(b.matchMinute || 0))
      : [];
    if (!goals.length) return;

    rows.forEach((row, index) => {
      const text = row.querySelector("span");
      if (!text || !text.textContent.includes("Torschütze unbekannt")) return;
      const goal = goals[index];
      if (!goal) return;
      const name = scorerName(goal, map);
      if (name) text.textContent = text.textContent.replace("Torschütze unbekannt", name);
    });
  }

  async function enrichUnknownScorers() {
    const cards = [...document.querySelectorAll(".match[data-match-id]")];
    if (!cards.some(card => card.textContent.includes("Torschütze unbekannt"))) return;
    const map = await loadGoalGetterMap();
    await Promise.all(cards.map(card => enrichMatchCard(card, map)));
  }

  function scheduleScorerEnrichment() {
    clearTimeout(enrichTimer);
    enrichTimer = setTimeout(() => enrichUnknownScorers().catch(error => console.warn("Torschützen-Ergänzung fehlgeschlagen", error)), 120);
  }

  countUsage();
  addStatsEntry();
  scheduleScorerEnrichment();

  const scorerObserver = new MutationObserver(scheduleScorerEnrichment);
  scorerObserver.observe(document.body, { childList: true, subtree: true });

  const button = document.getElementById("shareAppBtn");
  if (!button) return;

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const title = "LigaKompakt";
    const text = "⚽ LigaKompakt ist kostenlos! Bundesliga live, Tabelle, Spieltermine, Tipps und dein Lieblingsverein – mit LigaKompakt von Andreas Binder.";

    try {
      if (navigator.share) {
        await navigator.share({ title, text, url: SHARE_URL });
      } else {
        await navigator.clipboard.writeText(`${text}\n${SHARE_URL}`);
        const status = document.getElementById("liveDot");
        if (status) {
          const old = status.textContent;
          status.textContent = "App-Link kopiert";
          setTimeout(() => { status.textContent = old; }, 1800);
        }
      }
    } catch (error) {
      if (error?.name !== "AbortError") console.warn("Teilen fehlgeschlagen", error);
    }
  }, true);
})();
