// LigaKompakt v1.0.14 – robustere Live-Spielstände und Abpfiff-Erkennung
(function(){
  const REFRESH_MS=10000;
  const FINISH_AFTER_MS=135*60*1000;

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
    if(score==="–")return m;
    const [home,away]=score.split(":").map(Number);
    const results=[...(m.matchResults||[])];
    if(!results.some(r=>r.resultTypeID===2||r.resultName==="Endergebnis"))results.push({resultName:"Endergebnis",pointsTeam1:home,pointsTeam2:away,resultOrderID:2,resultTypeID:2,resultDescription:"Endstand"});
    return {...m,matchIsFinished:true,matchResults:results};
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
