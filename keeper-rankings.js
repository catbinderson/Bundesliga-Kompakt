(() => {
  const API = "https://api.openligadb.de";
  const LEAGUE = "bl1";
  const SEASON = "2026";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const id = value => value === null || value === undefined ? "" : String(value);

  async function json(url) {
    const r = await fetch(url, { cache: "no-store", mode: "cors" });
    if (!r.ok) throw new Error(`HTTP ${r.status}`);
    return r.json();
  }

  function finalResult(match) {
    const results = (match?.matchResults || []).filter(r => r.resultTypeID === 2 || /Endergebnis/i.test(r.resultName || ""));
    return results.at(-1) || (match?.matchResults || []).at(-1) || null;
  }

  async function cleanSheets() {
    const [matches, teams] = await Promise.all([
      json(`${API}/getmatchdata/${LEAGUE}/${SEASON}`),
      json(`${API}/getavailableteams/${LEAGUE}/${SEASON}`)
    ]);
    const map = new Map((Array.isArray(teams) ? teams : []).map(team => [id(team.teamId), { team, cleanSheets: 0, matches: 0 }]));
    for (const match of (Array.isArray(matches) ? matches : [])) {
      if (!match?.matchIsFinished) continue;
      const result = finalResult(match);
      if (!result) continue;
      const home = map.get(id(match.team1?.teamId));
      const away = map.get(id(match.team2?.teamId));
      const hg = Number(result.pointsTeam1), ag = Number(result.pointsTeam2);
      if (home && Number.isFinite(hg) && Number.isFinite(ag)) { home.matches++; if (ag === 0) home.cleanSheets++; }
      if (away && Number.isFinite(hg) && Number.isFinite(ag)) { away.matches++; if (hg === 0) away.cleanSheets++; }
    }
    return [...map.values()].filter(x => x.matches > 0).sort((a,b) => b.cleanSheets - a.cleanSheets || a.matches - b.matches || String(a.team?.teamName || "").localeCompare(String(b.team?.teamName || ""), "de"));
  }

  function row(item, index) {
    const team = item.team || {};
    const icon = team.teamIconUrl ? `<img src="${esc(team.teamIconUrl)}" alt="" style="width:30px;height:30px;object-fit:contain">` : '<span style="width:30px;height:30px;display:grid;place-items:center">🧤</span>';
    const name = team.shortName || team.teamName || "Verein";
    return `<div style="display:grid;grid-template-columns:30px 30px 1fr auto;gap:10px;align-items:center;padding:11px 4px;border-bottom:1px solid rgba(255,255,255,.06)"><strong style="text-align:center;color:${index<3?'var(--accent)':'var(--muted)'}">${index+1}</strong>${icon}<span style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</b><small style="display:block;color:var(--muted);margin-top:2px">${item.matches} beendete Spiele · Torhüter/Defensive</small></span><strong style="color:var(--blue);white-space:nowrap">${item.cleanSheets} ${item.cleanSheets===1?'Weiße Weste':'Weiße Westen'}</strong></div>`;
  }

  async function renderKeepers() {
    const list = document.getElementById("playerRankingList"), note = document.getElementById("playerRankingNote");
    if (!list || !note) return;
    list.innerHTML = '<div class="skeleton"><i></i><i></i><i></i></div>';
    note.textContent = "Weiße Westen werden berechnet …";
    try {
      const data = await cleanSheets();
      list.innerHTML = data.length ? data.slice(0,20).map(row).join("") : '<p class="muted" style="padding:12px 0">Noch keine beendeten Spiele mit auswertbaren Ergebnissen.</p>';
      note.textContent = "Weiße Westen = beendete Bundesliga-Spiele ohne Gegentor. OpenLigaDB liefert keine verlässliche Torhüter-Aufstellung pro Spiel; deshalb wird die Statistik dem Verein bzw. seiner eingesetzten Torhüter-Einheit zugerechnet.";
    } catch (error) {
      console.warn("Weiße-Westen-Statistik:", error);
      list.innerHTML = '<p class="error">Die Weiße-Westen-Statistik konnte gerade nicht geladen werden.</p>';
      note.textContent = "Bitte später erneut versuchen.";
    }
  }

  function install() {
    const tabs = document.getElementById("rankingTabs");
    if (!tabs || tabs.querySelector('[data-ranking="keepers"]')) return false;
    tabs.style.gridTemplateColumns = "repeat(3,minmax(0,1fr))";
    const button = document.createElement("button");
    button.type = "button";
    button.dataset.ranking = "keepers";
    button.className = "ghost-btn";
    button.style.padding = "10px 6px";
    button.textContent = "🧤 Weiße Westen";
    button.addEventListener("click", () => {
      [...tabs.querySelectorAll("[data-ranking]")].forEach(b => { b.className = b === button ? "primary-btn" : "ghost-btn"; b.style.padding = "10px 6px"; });
      renderKeepers();
    });
    tabs.appendChild(button);
    const heading = document.querySelector("#playerRankings h3");
    const eyebrow = document.querySelector("#playerRankings .eyebrow");
    if (heading) heading.textContent = "Bundesliga-Ranglisten";
    if (eyebrow) eyebrow.textContent = "STATISTIKEN";
    return true;
  }

  if (!install()) {
    const observer = new MutationObserver(() => { if (install()) observer.disconnect(); });
    observer.observe(document.body, { childList: true, subtree: true });
  }
})();
