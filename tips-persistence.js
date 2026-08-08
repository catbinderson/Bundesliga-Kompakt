(() => {
  const STORE_KEY = "ligakompakt.tips";
  const TIP_PREFIX = "ligakompakt.tip.";

  function validTip(tip) {
    const home = Number(tip?.home), away = Number(tip?.away), group = Number(tip?.group);
    if (!Number.isInteger(home) || home < 0 || home > 20 || !Number.isInteger(away) || away < 0 || away > 20) return null;
    return { home, away, ...(Number.isInteger(group) && group >= 1 && group <= 34 ? { group } : {}) };
  }

  function aggregateTips() {
    try {
      const value = JSON.parse(localStorage.getItem(STORE_KEY) || "{}");
      return value && typeof value === "object" && !Array.isArray(value) ? value : {};
    } catch {
      return {};
    }
  }

  function individualTips() {
    const tips = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key?.startsWith(TIP_PREFIX)) continue;
      const id = key.slice(TIP_PREFIX.length);
      if (!/^\d+$/.test(id)) continue;
      try {
        const tip = validTip(JSON.parse(localStorage.getItem(key) || "null"));
        if (tip) tips[id] = tip;
      } catch {}
    }
    return tips;
  }

  function writeAllTips(tips) {
    const clean = {};
    for (const [id, raw] of Object.entries(tips || {})) {
      if (!/^\d+$/.test(id)) continue;
      const tip = validTip(raw);
      if (tip) clean[id] = tip;
    }

    localStorage.setItem(STORE_KEY, JSON.stringify(clean));

    const keep = new Set(Object.keys(clean).map(id => TIP_PREFIX + id));
    const remove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TIP_PREFIX) && !keep.has(key)) remove.push(key);
    }
    remove.forEach(key => localStorage.removeItem(key));
    for (const [id, tip] of Object.entries(clean)) localStorage.setItem(TIP_PREFIX + id, JSON.stringify(tip));
    return clean;
  }

  function recoverTips() {
    const merged = { ...aggregateTips(), ...individualTips() };
    try { return writeAllTips(merged); } catch { return merged; }
  }

  savedTips = function () {
    return recoverTips();
  };

  storeTip = function (node, m) {
    const home = node.querySelector(".tip-home"), away = node.querySelector(".tip-away"), status = node.querySelector(".tip-status"), button = node.querySelector(".save-tip"), h = Number(home.value), a = Number(away.value);
    if (home.value === "" || away.value === "" || !Number.isInteger(h) || !Number.isInteger(a) || h < 0 || a < 0 || h > 20 || a > 20) {
      status.textContent = "Bitte zwei gültige Torzahlen eingeben.";
      status.classList.add("tip-error");
      return;
    }

    try {
      const tips = recoverTips();
      tips[String(m.matchID)] = { home: h, away: a, group: Number(m.group?.groupOrderID || currentGroup) };
      writeAllTips(tips);
      const verified = recoverTips()[String(m.matchID)];
      if (!verified || verified.home !== h || verified.away !== a) throw new Error("Tipp konnte nicht verifiziert werden");
    } catch (error) {
      console.error("Tipp speichern:", error);
      status.textContent = "Tipp konnte nicht dauerhaft gespeichert werden.";
      status.classList.add("tip-error");
      return;
    }

    status.textContent = `Gespeichert: ${h}:${a}`;
    status.classList.remove("tip-error");
    button.textContent = "Ändern";
    if (!node.querySelector(".delete-tip")) {
      button.insertAdjacentHTML("afterend", '<button type="button" class="share-tip">↗ Teilen</button><button type="button" class="delete-tip">Löschen</button>');
      node.querySelector(".share-tip").addEventListener("click", e => { e.stopPropagation(); shareTip(m).catch(error => { if (error?.name !== "AbortError") showError(error); }); });
      node.querySelector(".delete-tip").addEventListener("click", e => { e.stopPropagation(); deleteTip(node, m); });
    }
    renderTipOverview(fixtureMatches);
    renderTipReminder(fixtureMatches);
    if (fixtureFilter === "untipped") renderFilteredFixtures();
  };

  deleteTip = function (node, m) {
    const tips = recoverTips();
    delete tips[String(m.matchID)];
    try { writeAllTips(tips); } catch (error) { console.error("Tipp löschen:", error); }
    renderTipOverview(fixtureMatches);
    renderTipReminder(fixtureMatches);
    if (fixtureFilter === "tipped" || fixtureFilter === "untipped") renderFilteredFixtures();
    else {
      const entry = node.querySelector(".match-tip");
      if (entry) entry.outerHTML = tipMarkup(m);
      const save = node.querySelector(".save-tip");
      if (save) save.addEventListener("click", e => { e.stopPropagation(); storeTip(node, m); });
    }
  };

  const originalImportAppData = importAppData;
  importAppData = async function (file) {
    const oldKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(TIP_PREFIX)) oldKeys.push(key);
    }
    await originalImportAppData(file);
    try {
      const imported = aggregateTips();
      oldKeys.forEach(key => localStorage.removeItem(key));
      writeAllTips(imported);
    } catch (error) {
      console.warn("Tipp-Sicherung nach Import:", error);
    }
  };

  recoverTips();
})();

(() => {
  async function freshJson(path) {
    const response = await fetch(API + path, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status} bei ${path}`);
    const data = await response.json();
    if (!Array.isArray(data)) throw new Error(`Ungültige API-Antwort bei ${path}`);
    return data;
  }

  async function resilientFixtures(group = currentGroup) {
    currentGroup = Math.max(1, Math.min(34, Number(group) || 1));
    updateMatchdayNav();
    const list = $("#fixturesList");
    if (list) skeletons(list);

    let matches = [];
    let firstError = null;

    try {
      matches = await freshJson(`/getmatchdata/${LEAGUE}/${SEASON}/${currentGroup}`);
    } catch (error) {
      firstError = error;
      console.warn("Spieltag direkt laden:", error);
    }

    if (!matches.length) {
      try {
        const seasonMatches = await freshJson(`/getmatchdata/${LEAGUE}/${SEASON}`);
        matches = seasonMatches.filter(match => Number(match.group?.groupOrderID) === currentGroup);
      } catch (error) {
        console.warn("Saison-Fallback laden:", error);
        if (!firstError) firstError = error;
      }
    }

    if (!matches.length) {
      try {
        const currentMatches = await freshJson(`/getmatchdata/${LEAGUE}`);
        const currentApiGroup = Number(currentMatches[0]?.group?.groupOrderID);
        if (currentApiGroup && currentApiGroup !== currentGroup) {
          currentGroup = currentApiGroup;
          updateMatchdayNav();
        }
        matches = currentMatches.filter(match => Number(match.group?.groupOrderID) === currentGroup);
      } catch (error) {
        console.warn("Aktueller-Spieltag-Fallback laden:", error);
        if (!firstError) firstError = error;
      }
    }

    if (!matches.length) throw firstError || new Error("Keine Bundesliga-Spiele verfügbar");

    fixtureMatches = matches;
    $("#matchdayTitle").textContent = `${currentGroup}. Spieltag`;
    renderFilteredFixtures();
    if ($("#liveDot")?.textContent === "Fehler") $("#liveDot").textContent = navigator.onLine ? "Online" : "Offline";
    return matches;
  }

  loadFixtures = resilientFixtures;

  const originalRefreshAll = refreshAll;
  refreshAll = async function () {
    const refresh = $("#refreshBtn");
    try {
      refresh?.classList.add("spinning");
      $("#liveDot").textContent = "Lädt …";

      const results = await Promise.allSettled([loadToday(), loadTable(), loadTeams()]);
      setupMatchdays();
      await resilientFixtures(currentGroup);

      const partial = results.some(result => result.status === "rejected");
      $("#liveDot").textContent = navigator.onLine ? (partial ? "Online" : "Online") : "Offline";
      $("#updatedAt").textContent = `Zuletzt aktualisiert: ${new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" }).format(new Date())}`;
      results.filter(result => result.status === "rejected").forEach(result => console.warn("Teilabruf fehlgeschlagen:", result.reason));
    } catch (error) {
      console.error("Aktualisierung:", error);
      try {
        await resilientFixtures(currentGroup);
        $("#liveDot").textContent = navigator.onLine ? "Online" : "Offline";
      } catch {
        originalRefreshAll().catch?.(console.warn);
      }
    } finally {
      refresh?.classList.remove("spinning");
    }
  };

  const refreshButton = $("#refreshBtn");
  if (refreshButton) refreshButton.onclick = refreshAll;

  setTimeout(() => {
    resilientFixtures(currentGroup).catch(error => {
      console.warn("Automatische Spielplan-Reparatur:", error);
    });
  }, 300);
})();
