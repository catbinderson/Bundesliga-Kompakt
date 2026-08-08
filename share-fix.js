(() => {
  const SHARE_URL = "https://catbinderson.github.io/Bundesliga-Kompakt/teilen.html?v=6";
  const COUNTER_BASE = "https://api.counterapi.dev/v1/ligakompakt-andreas-binder-2026";
  const OPENLIGA_API = "https://api.openligadb.de";
  const LEAGUE = "bl1";
  const SEASON = "2026";
  const matchCache = new Map();
  let goalGetterMapPromise = null;
  let seasonStatsPromise = null;
  let enrichTimer = null;

  async function countUsage() {
    try { await fetch(`${COUNTER_BASE}/app-opens-v1/up`, { cache: "no-store", mode: "cors" }); } catch (error) { console.warn("Aufrufstatistik nicht erreichbar", error); }
    try {
      const key = "ligakompakt-unique-device-counted-v1";
      if (!localStorage.getItem(key)) {
        const response = await fetch(`${COUNTER_BASE}/unique-devices-v1/up`, { cache: "no-store", mode: "cors" });
        if (response.ok) localStorage.setItem(key, "1");
      }
    } catch (error) { console.warn("Gerätestatistik nicht erreichbar", error); }
  }

  function addStatsEntry() {
    if (document.getElementById("usageStatsCard")) return;
    const liveCenter = document.getElementById("liveCenter"); if (!liveCenter) return;
    const card = document.createElement("a");
    card.id = "usageStatsCard"; card.href = "statistik.html"; card.setAttribute("aria-label", "LigaKompakt Nutzungsstatistik öffnen");
    card.style.cssText = "display:flex;align-items:center;gap:13px;margin:0 0 14px;padding:15px 16px;text-decoration:none;color:var(--text);background:linear-gradient(135deg,rgba(79,163,255,.13),rgba(57,219,134,.09));border:1px solid rgba(79,163,255,.25);border-radius:20px;box-shadow:var(--shadow)";
    card.innerHTML = `<span style="display:grid;place-items:center;width:44px;height:44px;flex:0 0 44px;border-radius:14px;background:rgba(79,163,255,.14);font-size:22px">📊</span><span style="min-width:0;flex:1"><strong style="display:block;font-size:14px">Nutzungsstatistik</strong><small style="display:block;margin-top:3px;color:var(--muted);font-size:11px">Besucher, Aufrufe und 30-Tage-Verlauf ansehen</small></span><span style="color:var(--blue);font-size:22px;font-weight:800">›</span>`;
    liveCenter.insertAdjacentElement("afterend", card);
  }

  const readId = value => value === null || value === undefined || value === "" ? "" : String(value);
  function goalGetterId(item) { return readId(item?.goalGetterID ?? item?.goalGetterId ?? item?.goalgetterID ?? item?.goalgetterId ?? item?.goalGetter?.goalGetterID ?? item?.goalGetter?.goalGetterId ?? item?.goalGetter?.id ?? item?.id); }
  function goalGetterName(item) { return String(item?.goalGetterName ?? item?.goalgetterName ?? item?.name ?? item?.goalGetter?.goalGetterName ?? item?.goalGetter?.name ?? "").trim(); }
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  async function getJson(url) { const response = await fetch(url, { cache: "no-store", mode: "cors" }); if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.json(); }

  async function loadGoalGetterMap() {
    if (goalGetterMapPromise) return goalGetterMapPromise;
    goalGetterMapPromise = (async () => {
      const map = new Map();
      try {
        const data = await getJson(`${OPENLIGA_API}/getgoalgetters/${LEAGUE}/${SEASON}`);
        const list = Array.isArray(data) ? data : Array.isArray(data?.goalGetters) ? data.goalGetters : [];
        for (const item of list) { const id = goalGetterId(item), name = goalGetterName(item); if (id && name) map.set(id, name); }
      } catch (error) { console.warn("Torschützenliste nicht erreichbar", error); }
      return map;
    })();
    return goalGetterMapPromise;
  }

  async function loadMatch(matchId) {
    if (matchCache.has(matchId)) return matchCache.get(matchId);
    const promise = getJson(`${OPENLIGA_API}/getmatchdata/${encodeURIComponent(matchId)}`).then(data => Array.isArray(data) ? data[0] : data).catch(error => { console.warn(`Spieldetails ${matchId} nicht erreichbar`, error); return null; });
    matchCache.set(matchId, promise); return promise;
  }

  function scorerName(goal, map) { const direct = goalGetterName(goal); if (direct) return direct; const id = goalGetterId(goal); return id ? (map.get(id) || "") : ""; }

  async function enrichMatchCard(card, map) {
    if (!card?.dataset?.matchId) return;
    const rows = [...card.querySelectorAll(".goal-list > div")];
    if (!rows.some(row => row.querySelector("span")?.textContent?.includes("Torschütze unbekannt"))) return;
    const match = await loadMatch(card.dataset.matchId);
    const goals = Array.isArray(match?.goals) ? match.goals.slice().sort((a,b)=>Number(a.matchMinute||0)-Number(b.matchMinute||0)) : [];
    if (!goals.length) return;
    rows.forEach((row,index) => { const text=row.querySelector("span"); if(!text||!text.textContent.includes("Torschütze unbekannt")) return; const goal=goals[index]; if(!goal) return; const name=scorerName(goal,map); if(name) text.textContent=text.textContent.replace("Torschütze unbekannt",name); });
  }

  async function enrichUnknownScorers() { const cards=[...document.querySelectorAll(".match[data-match-id]")]; if(!cards.some(card=>card.textContent.includes("Torschütze unbekannt"))) return; const map=await loadGoalGetterMap(); await Promise.all(cards.map(card=>enrichMatchCard(card,map))); }
  function scheduleScorerEnrichment() { clearTimeout(enrichTimer); enrichTimer=setTimeout(()=>enrichUnknownScorers().catch(error=>console.warn("Torschützen-Ergänzung fehlgeschlagen",error)),120); }

  function parseAssist(comment) {
    const text=String(comment||"").trim(); if(!text) return "";
    const match=text.match(/(?:vorlage|assist|assisted\s+by)\s*[:\-]?\s*([^,;()|]+)/i);
    return match ? match[1].trim().replace(/[.!]+$/g,"") : "";
  }

  async function loadSeasonStats() {
    if (seasonStatsPromise) return seasonStatsPromise;
    seasonStatsPromise=(async()=>{
      const [goalGetters,matches,teams]=await Promise.all([
        getJson(`${OPENLIGA_API}/getgoalgetters/${LEAGUE}/${SEASON}`).catch(()=>[]),
        getJson(`${OPENLIGA_API}/getmatchdata/${LEAGUE}/${SEASON}`).catch(()=>[]),
        getJson(`${OPENLIGA_API}/getavailableteams/${LEAGUE}/${SEASON}`).catch(()=>[])
      ]);
      const teamById=new Map((Array.isArray(teams)?teams:[]).map(t=>[readId(t.teamId),t]));
      const playerTeam=new Map(), assists=new Map(), assistTeam=new Map();
      for(const match of (Array.isArray(matches)?matches:[])) {
        for(const goal of (Array.isArray(match?.goals)?match.goals:[])) {
          const gid=goalGetterId(goal), teamId=readId(goal?.scoringTeamId);
          if(gid&&teamId&&!playerTeam.has(gid)) playerTeam.set(gid,teamId);
          const assist=parseAssist(goal?.comment);
          if(assist){ const key=assist.toLocaleLowerCase("de-DE"); assists.set(key,(assists.get(key)||0)+1); if(teamId&&!assistTeam.has(key)) assistTeam.set(key,teamId); }
        }
      }
      const scorers=(Array.isArray(goalGetters)?goalGetters:[]).map(item=>{
        const id=goalGetterId(item), name=goalGetterName(item)||"Unbekannt", goals=Number(item?.goalCount??item?.goals??0)||0, teamId=playerTeam.get(id)||"", team=teamById.get(teamId), key=name.toLocaleLowerCase("de-DE"), assistsCount=assists.get(key)||0;
        return {id,name,goals,assists:assistsCount,points:goals+assistsCount,teamId,team};
      });
      for(const [key,count] of assists){ if(scorers.some(s=>s.name.toLocaleLowerCase("de-DE")===key)) continue; const teamId=assistTeam.get(key)||"", team=teamById.get(teamId); scorers.push({id:`assist:${key}`,name:key.replace(/(^|\s)\S/g,c=>c.toUpperCase()),goals:0,assists:count,points:count,teamId,team}); }
      return scorers;
    })();
    return seasonStatsPromise;
  }

  function rankingRow(player,index,mode){
    const icon=player.team?.teamIconUrl?`<img src="${esc(player.team.teamIconUrl)}" alt="" style="width:30px;height:30px;object-fit:contain">`:`<span style="width:30px;height:30px;display:grid;place-items:center;border-radius:50%;background:rgba(255,255,255,.06)">⚽</span>`;
    const club=player.team?.shortName||player.team?.teamName||"Verein nicht zugeordnet";
    const value=mode==="goals"?`${player.goals} ${player.goals===1?"Tor":"Tore"}`:`${player.points} Pkt.`;
    const detail=mode==="goals"?club:`${player.goals} Tore · ${player.assists} Vorlagen`;
    return `<div style="display:grid;grid-template-columns:30px 30px 1fr auto;gap:10px;align-items:center;padding:11px 4px;border-bottom:1px solid rgba(255,255,255,.06)"><strong style="text-align:center;color:${index<3?'var(--accent)':'var(--muted)'}">${index+1}</strong>${icon}<span style="min-width:0"><b style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(player.name)}</b><small style="display:block;color:var(--muted);margin-top:2px">${esc(detail)}</small></span><strong style="color:var(--blue);white-space:nowrap">${value}</strong></div>`;
  }

  async function renderRanking(mode="goals") {
    const list=document.getElementById("playerRankingList"), note=document.getElementById("playerRankingNote"); if(!list) return;
    list.innerHTML='<div class="skeleton"><i></i><i></i><i></i></div>'; note.textContent="Daten werden geladen …";
    try{
      const stats=await loadSeasonStats();
      const sorted=[...stats].filter(p=>mode==="goals"?p.goals>0:p.points>0).sort((a,b)=>mode==="goals"?(b.goals-a.goals||a.name.localeCompare(b.name,"de")):(b.points-a.points||b.goals-a.goals||a.name.localeCompare(b.name,"de"))).slice(0,20);
      list.innerHTML=sorted.length?sorted.map((p,i)=>rankingRow(p,i,mode)).join(""):'<p class="muted" style="padding:12px 0">Für diese Saison sind noch keine entsprechenden Daten vorhanden.</p>';
      note.textContent=mode==="goals"?"Torjägerdaten: OpenLigaDB · Saison 2026/27":"Scorerpunkte = Tore + erkannte Vorlagen. OpenLigaDB führt Vorlagen nicht als eigenes Standardfeld; deshalb können Vorlagen unvollständig sein.";
    }catch(error){ console.warn(error); list.innerHTML='<p class="error">Die Spieler-Rangliste konnte gerade nicht geladen werden.</p>'; note.textContent="Bitte später erneut versuchen."; }
  }

  function addPlayerRankings(){
    if(document.getElementById("playerRankings")) return;
    const tableView=document.getElementById("table"); if(!tableView) return;
    const firstHead=tableView.querySelector(".section-head"); if(!firstHead) return;
    const card=document.createElement("section"); card.id="playerRankings"; card.className="card"; card.style.cssText="margin-bottom:14px";
    card.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:end;gap:10px;margin-bottom:12px"><div><div class="eyebrow">SPIELER</div><h3>Spieler-Ranglisten</h3></div><span style="font-size:10px;color:var(--muted)">Top 20</span></div><div id="rankingTabs" style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px"><button type="button" data-ranking="goals" class="primary-btn" style="padding:10px">⚽ Torjäger</button><button type="button" data-ranking="scorers" class="ghost-btn" style="padding:10px">★ Topscorer</button></div><div id="playerRankingList"></div><p id="playerRankingNote" class="muted" style="font-size:10px;line-height:1.45;margin-top:10px"></p>`;
    firstHead.insertAdjacentElement("afterend",card);
    const tabs=[...card.querySelectorAll("[data-ranking]")];
    tabs.forEach(btn=>btn.addEventListener("click",()=>{ tabs.forEach(b=>{b.className=b===btn?"primary-btn":"ghost-btn";b.style.padding="10px"}); renderRanking(btn.dataset.ranking).catch(console.warn); }));
    renderRanking("goals").catch(console.warn);
  }

  countUsage(); addStatsEntry(); addPlayerRankings(); scheduleScorerEnrichment();
  const scorerObserver=new MutationObserver(scheduleScorerEnrichment); scorerObserver.observe(document.body,{childList:true,subtree:true});

  const button=document.getElementById("shareAppBtn"); if(!button) return;
  button.addEventListener("click",async event=>{
    event.preventDefault(); event.stopImmediatePropagation();
    const title="LigaKompakt", text="⚽ LigaKompakt ist kostenlos! Bundesliga live, Tabelle, Spieltermine, Tipps und dein Lieblingsverein – mit LigaKompakt von Andreas Binder.";
    try{ if(navigator.share) await navigator.share({title,text,url:SHARE_URL}); else { await navigator.clipboard.writeText(`${text}\n${SHARE_URL}`); const status=document.getElementById("liveDot"); if(status){const old=status.textContent;status.textContent="App-Link kopiert";setTimeout(()=>{status.textContent=old},1800);} } }catch(error){ if(error?.name!=="AbortError") console.warn("Teilen fehlgeschlagen",error); }
  },true);
})();
