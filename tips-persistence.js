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
