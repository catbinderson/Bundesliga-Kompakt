// LigaKompakt v1.0.15 – robustere Live-Spielstände und Abpfiff-Erkennung
(function(){
  const REFRESH_MS=10000;
  const FINISH_AFTER_MS=130*60*1000;

  function scoreFromGoals(m){
    const goals=Array.isArray(m?.goals)?m.goals:[];
    if(!goals.length)return null;
    const last=goals.slice().sort((a,b)=>(a.matchMinute||0)-(b.matchMinute||0)).at(-1);
    if(last?.scoreTeam1==null||last?.scoreTeam2==null)return null;
    return `${last.scoreTeam1}:${last.scoreTeam2}`;
  }

  function scoreFromResults(m){
    const results=Array.isArray(m?.matchResults)?m.matchResults:[];
    const final=results.filter(x=>x.resultTypeID===2||x.resultName==="Endergebnis").at(-1);
    const latest=final||results.at(-1);
    if(latest?.pointsTeam1==null||latest?.pointsTeam2==null)return null;
    return `${latest.pointsTeam1}:${latest.pointsTeam2}`;
  }

  function reliableScore(m){return scoreFromResults(m)||scoreFromGoals(m)||"–"}

  function inferFinished(m){
    if(!m||m.matchIsFinished)return m;
    const kickoff=new Date(m.matchDateTime).getTime();
    if(!Number.isFinite(kickoff)||Date.now()-kickoff<FINISH_AFTER_MS)return m;
    const score=reliableScore(m);
    const results=[...(m.matchResults||[])];
    if(score!=="–"&&!results.some(r=>r.resultTypeID===2||r.resultName==="Endergebnis")){
      const [home,away]=score.split(":").map(Number);
      results.push({resultName:"Endergebnis",pointsTeam1:home,pointsTeam2:away,resultOrderID:2,resultTypeID:2,resultDescription:"Endstand"});
    }
    return {...m,matchIsFinished:true,matchResults:results,_resultPending:score==="–"};
  }

  const originalSanitize=typeof sanitizeApiData==="function"?sanitizeApiData:null;
  if(originalSanitize){
    sanitizeApiData=function(data){
      const cleaned=originalSanitize(data);
      return Array.isArray(cleaned)?cleaned.map(inferFinished):inferFinished(cleaned);
    };
  }

  finalScore=function(m){return reliableScore(m)};
  finalResult=function(m){
    const results=(m?.matchResults||[]).filter(x=>x.resultTypeID===2||x.resultName==="Endergebnis");
    const r=results.at(-1)||(m?.matchResults||[]).at(-1);
    if(r)return r;
    const score=scoreFromGoals(m);if(!score)return null;
    const [pointsTeam1,pointsTeam2]=score.split(":").map(Number);return{pointsTeam1,pointsTeam2};
  };
  isLiveMatch=function(m){
    const kickoff=new Date(m?.matchDateTime).getTime(),age=Date.now()-kickoff;
    return !m?.matchIsFinished&&Number.isFinite(kickoff)&&age>=0&&age<FINISH_AFTER_MS;
  };

  const originalMatchCard=matchCard;
  matchCard=function(m){
    const node=originalMatchCard(m);
    if(m?._resultPending&&m.matchIsFinished){
      const score=node.querySelector(".score"),kickoff=node.querySelector(".kickoff"),state=node.querySelector(".match-state");
      if(score)score.textContent="–";
      if(kickoff)kickoff.textContent="Ergebnis folgt";
      if(state){state.textContent="BEENDET";state.classList.add("done")}
    }
    return node;
  };

  startLiveCenter=function(){
    clearInterval(liveTimer);clearInterval(countdownTimer);
    liveTimer=setInterval(()=>{if(document.visibilityState==="visible"&&navigator.onLine)loadToday(true).catch(console.warn)},REFRESH_MS);
    countdownTimer=setInterval(()=>{updateCountdown();updateFavoriteCountdown()},1000);
  };

  const label=document.querySelector(".auto-refresh");
  if(label)label.innerHTML='<i></i> alle 10 Sek.';
  startLiveCenter();
  if(document.visibilityState==="visible"&&navigator.onLine)loadToday(true).catch(console.warn);
})();
