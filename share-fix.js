(() => {
  const SHARE_URL = "https://catbinderson.github.io/Bundesliga-Kompakt/teilen.html?v=5";
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
