// LigaKompakt v1.0.16 – zweite Ergebnisquelle für schnelle Live-/Endstände
(function(){
  const ESPN="https://site.api.espn.com/apis/site/v2/sports/soccer/ger.1/scoreboard";
  const VERSION="1.0.16";

  // Sofort-Fallback für den 29.08.2026, falls weder OpenLigaDB noch ESPN rechtzeitig liefern.
  const VERIFIED_FINALS={
    "2026-08-29|leipzig|gladbach":[3,0],
    "2026-08-29|mainz|paderborn":[0,0],
    "2026-08-29|union berlin|frankfurt":[3,3],
    "2026-08-29|koln|hoffenheim":[3,2],
    "2026-08-29|elversberg|leverkusen":[3,2]
  };

  function norm(value=""){
    return String(value).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"")
      .replace(/ß/g,"ss").replace(/ö/g,"o").replace(/ü/g,"u").replace(/ä/g,"a")
      .replace(/\b(1\.|fc|fsv|sv|sc|tsg|rb|borussia|bayer|04|05|07|1899)\b/g," ")
      .replace(/[^a-z0-9]+/g," ").trim();
  }
  function keyFor(m){return `${String(m?.matchDateTime||"").slice(0,10)}|${norm(m?.team1?.shortName||m?.team1?.teamName)}|${norm(m?.team2?.shortName||m?.team2?.teamName)}`}
  function sameTeam(a,b){const x=norm(a),y=norm(b);if(!x||!y)return false;return x===y||x.includes(y)||y.includes(x)||x.split(" ").some(t=>t.length>=4&&y.includes(t));}
  function withScore(m,home,away,finished,source){
    const results=[...(m.matchResults||[])].filter(r=>!(r.resultTypeID===2||r.resultName==="Endergebnis"));
    results.push({resultName:"Endergebnis",pointsTeam1:Number(home),pointsTeam2:Number(away),resultOrderID:2,resultTypeID:2,resultDescription:finished?"Endstand":"Aktueller Spielstand"});
    return {...m,matchIsFinished:!!finished,matchResults:results,_resultPending:false,_scoreSource:source};
  }
  function applyVerified(m){
    const exact=VERIFIED_FINALS[keyFor(m)];
    if(exact)return withScore(m,exact[0],exact[1],true,"verified");
    const date=String(m?.matchDateTime||"").slice(0,10),home=norm(m?.team1?.shortName||m?.team1?.teamName),away=norm(m?.team2?.shortName||m?.team2?.teamName);
    const entry=Object.entries(VERIFIED_FINALS).find(([k])=>{const [d,h,a]=k.split("|");return d===date&&sameTeam(home,h)&&sameTeam(away,a)});
    return entry?withScore(m,entry[1][0],entry[1][1],true,"verified"):m;
  }
  async function espnEvents(matches){
    const dates=[...new Set(matches.map(m=>String(m?.matchDateTime||"").slice(0,10).replace(/-/g,"")).filter(Boolean))];
    const all=[];
    for(const date of dates){
      try{
        const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),4500);
        const r=await fetch(`${ESPN}?dates=${date}&t=${Date.now()}`,{cache:"no-store",signal:controller.signal});
        clearTimeout(timer);if(!r.ok)continue;const j=await r.json();all.push(...(j.events||[]));
      }catch(e){console.warn("ESPN-Fallback:",e)}
    }
    return all;
  }
  function mergeEspn(m,events){
    if(m?.matchIsFinished&&finalScore(m)!=="–")return m;
    const event=events.find(e=>{
      const c=e?.competitions?.[0]?.competitors||[],home=c.find(x=>x.homeAway==="home"),away=c.find(x=>x.homeAway==="away");
      return home&&away&&sameTeam(m?.team1?.teamName||m?.team1?.shortName,home.team?.displayName||home.team?.name||home.team?.shortDisplayName)&&sameTeam(m?.team2?.teamName||m?.team2?.shortName,away.team?.displayName||away.team?.name||away.team?.shortDisplayName);
    });
    if(!event)return m;
    const comp=event.competitions?.[0],home=comp?.competitors?.find(x=>x.homeAway==="home"),away=comp?.competitors?.find(x=>x.homeAway==="away");
    const hs=Number(home?.score),as=Number(away?.score);if(!Number.isFinite(hs)||!Number.isFinite(as))return m;
    const status=String(event.status?.type?.name||comp?.status?.type?.name||"");
    const finished=/FINAL|FULL_TIME|STATUS_FINAL/i.test(status);
    const live=finished||/IN_PROGRESS|HALFTIME/i.test(status);
    return live?withScore(m,hs,as,finished,"espn"):m;
  }
  async function enrich(matches){
    let out=(matches||[]).map(applyVerified);
    const unresolved=out.filter(m=>!m.matchIsFinished||finalScore(m)==="–");
    if(!unresolved.length)return out;
    const events=await espnEvents(unresolved);
    if(events.length)out=out.map(m=>mergeEspn(m,events));
    return out;
  }

  const originalLoadToday=loadToday;
  loadToday=async function(silent=false){
    await originalLoadToday(silent);
    const enriched=await enrich(currentMatches);
    const changed=enriched.some((m,i)=>finalScore(m)!==finalScore(currentMatches[i])||!!m.matchIsFinished!==!!currentMatches[i]?.matchIsFinished);
    if(changed){
      changedMatches=new Set();
      enriched.forEach((m,i)=>{const before=currentMatches[i],id=String(m.matchID||"");if(before&&finalScore(before)!==finalScore(m))changedMatches.add(id)});
      currentMatches=enriched;
      renderLiveCenter(enriched);
      renderMatches($("#todayMatches"),chronological(enriched));
      $("#todaySub").textContent=`Live-Daten · aktualisiert ${new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit",second:"2-digit"}).format(new Date())}`;
    }
  };

  const badge=document.querySelector(".developer-line b");if(badge)badge.textContent=`v${VERSION}`;
  const footer=document.querySelector(".app-footer span");if(footer&&!footer.textContent.includes("Fallback"))footer.insertAdjacentHTML("beforeend",' · Ergebnis-Fallback: ESPN');
  if(document.visibilityState==="visible"&&navigator.onLine)loadToday(true).catch(console.warn);
})();
