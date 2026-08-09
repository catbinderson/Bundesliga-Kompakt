(()=>{
  const API='https://api.openligadb.de/getmatchdata/bl1/2026',FALLBACK='crystal-ball-2026.json?v=7';
  const STRENGTH={40:82,7:68,1635:63,16:60,6:59,175:55,112:50,91:48,81:45,95:43,80:41,87:40,134:38,100:37,65:35,9:34,31:31,198:29};
  const LOGO_FALLBACK={1635:'leipzig-logo.svg?v=1'};
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));

  async function loadMatches(){
    let error;
    for(let attempt=1;attempt<=3;attempt++){
      try{const response=await fetch(API,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const matches=await response.json();if(!Array.isArray(matches))throw new Error('Ungültige Live-Daten');const official=matches.filter(match=>Number(match?.group?.groupOrderID)>=1&&Number(match?.group?.groupOrderID)<=34&&new Date(match.matchDateTime)>=new Date('2026-08-28T00:00:00+02:00'));if(official.length!==306)throw new Error(`Unvollständige Live-Daten: ${official.length}`);return {matches:official,live:true}}catch(reason){error=reason;if(attempt<3)await sleep(400*attempt)}
    }
    console.warn('KI-Glaskugel Live-Daten:',error);
    const response=await fetch(FALLBACK,{cache:'no-store'});if(!response.ok)throw error;
    const data=await response.json(),teams=data?.teams||{};
    const matches=(data?.matches||[]).map(row=>{const home=teams[String(row[1])]||[],away=teams[String(row[2])]||[];return {matchDateTime:row[0],team1:{teamId:row[1],shortName:home[0],teamName:home[0],teamIconUrl:home[1]},team2:{teamId:row[2],shortName:away[0],teamName:away[0],teamIconUrl:away[1]},matchIsFinished:Boolean(row[3]),matchResults:row[4]===null||row[5]===null?[]:[{resultTypeID:2,resultName:'Endergebnis',pointsTeam1:row[4],pointsTeam2:row[5]}]}});
    if(matches.length!==306)throw new Error('Unvollständige Ersatzdaten');
    return {matches,live:false};
  }

  function finalScore(match){
    const finals=(match.matchResults||[]).filter(result=>result.resultTypeID===2||/Endergebnis/i.test(result.resultName||''));
    return finals.at(-1)||(match.matchResults||[]).at(-1)||null;
  }

  function forecast(matches){
    const clubs=new Map();
    const ensure=team=>{if(!clubs.has(team.teamId))clubs.set(team.teamId,{id:team.teamId,name:team.shortName||team.teamName,logo:LOGO_FALLBACK[team.teamId]||team.teamIconUrl,played:0,points:0,goals:0,against:0,expected:0,expectedDiff:0});return clubs.get(team.teamId)};
    for(const match of matches){
      const home=ensure(match.team1),away=ensure(match.team2),result=finalScore(match);
      if(match.matchIsFinished&&result){
        const hg=Number(result.pointsTeam1),ag=Number(result.pointsTeam2);home.played++;away.played++;home.goals+=hg;home.against+=ag;away.goals+=ag;away.against+=hg;
        if(hg>ag){home.points+=3}else if(hg<ag){away.points+=3}else{home.points++;away.points++}
        continue;
      }
      const difference=(STRENGTH[home.id]??38)-(STRENGTH[away.id]??38)+4;
      const draw=Math.max(.16,.25-Math.min(Math.abs(difference)*.0025,.09));
      const homeShare=1/(1+Math.exp(-difference/10));
      const homeWin=(1-draw)*homeShare,awayWin=(1-draw)*(1-homeShare);
      home.expected+=3*homeWin+draw;away.expected+=3*awayWin+draw;
      const margin=Math.max(-1.5,Math.min(1.5,difference/22));home.expectedDiff+=margin;away.expectedDiff-=margin;
    }
    return [...clubs.values()].map(club=>({...club,projectedPoints:Math.round(club.points+club.expected),projectedDiff:Math.round(club.goals-club.against+club.expectedDiff)})).sort((a,b)=>b.projectedPoints-a.projectedPoints||b.projectedDiff-a.projectedDiff||(STRENGTH[b.id]??0)-(STRENGTH[a.id]??0));
  }

  function zone(position){return position<=4?'#4a9dff':position===5?'#30d98b':position===16?'#f5b942':position>=17?'#ff6675':'transparent'}

  function render(table,finished,live){
    const rows=table.map((club,index)=>`<div style="display:grid;grid-template-columns:5px 28px 28px minmax(0,1fr) 38px 48px;gap:8px;align-items:center;padding:9px 4px;border-bottom:1px solid rgba(255,255,255,.07)"><i style="height:28px;border-radius:4px;background:${zone(index+1)}"></i><b style="text-align:center;color:${index<4?'var(--blue)':'var(--text)'}">${index+1}</b><img src="${esc(club.logo)}" alt="" style="width:26px;height:26px;object-fit:contain"><strong style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(club.name)}</strong><small style="text-align:right;color:var(--muted)">${club.projectedDiff>0?'+':''}${club.projectedDiff}</small><b style="text-align:right">${club.projectedPoints} P</b></div>`).join('');
    return `<div style="display:flex;justify-content:center;margin:-4px 0 12px"><span style="padding:5px 10px;border-radius:999px;background:${live?'rgba(48,217,139,.14)':'rgba(245,185,66,.14)'};color:${live?'#30d98b':'#f5b942'};font-size:10px;font-weight:800">${live?'● LIVE-DATEN':'● GESICHERTER DATENSTAND'}</span></div><div style="display:grid;grid-template-columns:5px 28px 28px minmax(0,1fr) 38px 48px;gap:8px;padding:0 4px 7px;color:var(--muted);font-size:10px;text-transform:uppercase;letter-spacing:.08em"><span></span><span>#</span><span></span><span>Verein</span><span style="text-align:right">TD</span><span style="text-align:right">Pkt</span></div>${rows}<p style="margin:12px 0 0;color:var(--muted);font-size:11px;line-height:1.5">Berechnet aus Vorsaison-Stärke, Aufsteiger-Niveau, Heimvorteil sowie ${finished} bereits beendeten Saisonspielen mit Punkten und Toren. Die Vorhersage wird bei jedem Öffnen aktualisiert und ist keine Garantie.</p>`;
  }

  function buildUi(){
    const host=document.querySelector('#today .hero');if(!host)return;
    const feature=document.createElement('div');feature.style.cssText='margin:14px 0 18px;padding:3px;border-radius:20px;background:linear-gradient(135deg,#8b5cf6,#4a9dff,#30d98b);box-shadow:0 12px 34px rgba(99,102,241,.28)';
    feature.innerHTML='<button id="crystalBallBtn" type="button" style="display:flex;width:100%;align-items:center;justify-content:center;gap:12px;border:0;border-radius:17px;padding:16px;background:linear-gradient(135deg,#241343,#102b52);color:white;font:inherit;font-size:18px;font-weight:900;cursor:pointer"><span style="font-size:27px;filter:drop-shadow(0 0 9px #b8a0ff)">🔮</span><span><small style="display:block;color:#c8b9ff;font-size:10px;letter-spacing:.14em;text-transform:uppercase">Saisonprognose</small>KI-Glaskugel</span></button>';
    host.insertAdjacentElement('afterend',feature);
    const modal=document.createElement('div');modal.id='crystalBallModal';modal.className='modal hidden';modal.innerHTML='<div class="modal-card" style="width:min(94vw,520px);max-height:88vh;overflow:auto;padding:18px"><div style="display:flex;align-items:center;gap:12px"><span style="font-size:36px">🔮</span><div><div class="eyebrow">KI-GLASKUGEL</div><h2 style="margin:2px 0">Prognose Abschlusstabelle</h2></div></div><div id="crystalBallContent" style="margin-top:16px"></div><button id="closeCrystalBall" class="primary-btn" style="width:100%;margin-top:16px">Schließen</button></div>';
    document.body.appendChild(modal);
    const content=modal.querySelector('#crystalBallContent');
    feature.querySelector('button').addEventListener('click',async()=>{modal.classList.remove('hidden');content.innerHTML='<div class="skeleton"><i></i><i></i><i></i></div><p class="muted" style="text-align:center">Die KI-Glaskugel berechnet die Saison …</p>';try{const data=await loadMatches(),matches=data.matches;content.innerHTML=render(forecast(matches),matches.filter(match=>match.matchIsFinished&&finalScore(match)).length,data.live)}catch(error){console.warn('KI-Glaskugel:',error);content.innerHTML='<p class="error">Die Prognose konnte gerade nicht berechnet werden. Bitte versuche es erneut.</p>'}});
    modal.querySelector('#closeCrystalBall').addEventListener('click',()=>modal.classList.add('hidden'));
    modal.addEventListener('click',event=>{if(event.target===modal)modal.classList.add('hidden')});
  }

  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',buildUi):buildUi();
})();
