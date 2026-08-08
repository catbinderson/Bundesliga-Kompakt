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

  countUsage();

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
