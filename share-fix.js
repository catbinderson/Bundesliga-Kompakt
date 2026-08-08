(() => {
  const SHARE_URL = "https://catbinderson.github.io/Bundesliga-Kompakt/teilen.html?v=6";
  const COUNTER_BASE = "https://api.counterapi.dev/v1/ligakompakt-andreas-binder-2026";

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

  countUsage();
  addStatsEntry();

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
