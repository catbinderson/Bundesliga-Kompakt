(()=>{
  const API='https://api.openligadb.de',DATA='h2h-2026.json?v=5',GOALS_DATA='h2h-goals.json?v=1';
  const matchCache=new Map(),seasonCache=new Map();let duelDataPromise,goalsDataPromise,currentSeasonPromise,tablePromise;
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));

  async function getJson(url,attempts=3){
    let lastError;
    for(let attempt=1;attempt<=attempts;attempt++){
      try{
        const response=await fetch(url,{cache:'no-store'});
        if(!response.ok)throw new Error(`HTTP ${response.status}`);
        return await response.json();
      }catch(error){
        lastError=error;
        if(attempt<attempts)await sleep(350*attempt);
      }
    }
    throw lastError;
  }

  function loadDuelData(){
    if(!duelDataPromise)duelDataPromise=getJson(DATA).catch(error=>{duelDataPromise=null;throw error});
    return duelDataPromise;
  }

  function loadGoalsData(){
    if(!goalsDataPromise)goalsDataPromise=getJson(GOALS_DATA).catch(error=>{goalsDataPromise=null;throw error});
    return goalsDataPromise;
  }

  async function loadMatch(matchId){
    if(matchCache.has(matchId))return matchCache.get(matchId);
    const request=getJson(`${API}/getmatchdata/${encodeURIComponent(matchId)}`).then(value=>Array.isArray(value)?value[0]:value).catch(()=>null);
    matchCache.set(matchId,request);
    const result=await request;
    if(!result)matchCache.delete(matchId);
    return result;
  }

  function seasonFromDate(value){
    const date=new Date(value),year=date.getFullYear(),month=date.getMonth()+1;
    return month>=7?year:year-1;
  }

  async function loadSeason(season){
    if(!seasonCache.has(season))seasonCache.set(season,getJson(`${API}/getmatchdata/bl1/${season}`).catch(error=>{seasonCache.delete(season);throw error}));
    return seasonCache.get(season);
  }

  function score(match){
    return match.pointsTeam1===null||match.pointsTeam2===null?'–':`${match.pointsTeam1}:${match.pointsTeam2}`;
  }

  const packMatch=match=>{
    const finals=(match?.matchResults||[]).filter(result=>result.resultTypeID===2||/Endergebnis/i.test(result.resultName||''));
    const result=finals.at(-1)||(match?.matchResults||[]).at(-1);
    return [match.matchID,match.matchDateTime,match.team1?.teamId,match.team1?.shortName||match.team1?.teamName,match.team2?.teamId,match.team2?.shortName||match.team2?.teamName,result?.pointsTeam1??null,result?.pointsTeam2??null];
  };

  function loadCurrentSeason(){
    if(!currentSeasonPromise)currentSeasonPromise=getJson(`${API}/getmatchdata/bl1/2026`).catch(error=>{currentSeasonPromise=null;throw error});
    return currentSeasonPromise;
  }

  function loadTable(){
    if(!tablePromise)tablePromise=getJson(`${API}/getbltable/bl1/2026`).catch(error=>{tablePromise=null;throw error});
    return tablePromise;
  }

  function formFor(teamId,current,baseline){
    const recent=current.filter(match=>match?.matchIsFinished&&(match.team1?.teamId===teamId||match.team2?.teamId===teamId)).sort((a,b)=>new Date(b.matchDateTime)-new Date(a.matchDateTime)).map(packMatch);
    return recent.concat(baseline||[]).slice(0,5).map(row=>{
      const home=Number(row[2])===Number(teamId),own=Number(home?row[6]:row[7]),against=Number(home?row[7]:row[6]);
      return {result:own>against?'S':own<against?'N':'U',own,against};
    });
  }

  function formCard(teamId,name,form,table){
    const goals=form.reduce((sum,match)=>sum+match.own,0),against=form.reduce((sum,match)=>sum+match.against,0);
    const tableIndex=table.findIndex(row=>Number(row.teamInfoId)===Number(teamId));
    const tableRow=tableIndex>=0?table[tableIndex]:null;
    const position=tableRow&&Number(tableRow.matches)>0?`${tableIndex+1}. Platz`:'Saisonstart';
    const dots=form.length?form.slice().reverse().map(match=>`<i title="${match.result==='S'?'Sieg':match.result==='U'?'Unentschieden':'Niederlage'}" style="display:block;width:15px;height:15px;border-radius:50%;background:${match.result==='S'?'#30d98b':match.result==='U'?'#91a3bd':'#ff6675'}"></i>`).join(''):'<small style="color:var(--muted)">Noch keine Bundesliga-Formdaten</small>';
    return `<div style="min-width:0;padding:11px;border:1px solid rgba(80,155,255,.18);border-radius:14px;background:rgba(10,27,51,.55)"><strong style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(name)}</strong><div style="display:flex;gap:6px;min-height:15px;margin:9px 0">${dots}</div><small style="color:var(--muted)">${form.length?`${goals}:${against} Tore · `:''}${position}</small></div>`;
  }

  async function formComparison(data,matchId){
    const teams=data?.matchTeams?.[String(matchId)];
    if(!Array.isArray(teams))return '';
    let current=[],table=[];
    try{[current,table]=await Promise.all([loadCurrentSeason(),loadTable()])}catch(error){console.warn('Formvergleich:',error)}
    const [homeId,awayId]=teams,homeForm=formFor(homeId,current,data.teamBaseline?.[String(homeId)]),awayForm=formFor(awayId,current,data.teamBaseline?.[String(awayId)]);
    const points=form=>form.reduce((sum,match)=>sum+(match.result==='S'?3:match.result==='U'?1:0),0),difference=points(homeForm)-points(awayForm);
    const homeName=data.teams?.[String(homeId)]||'Heimteam',awayName=data.teams?.[String(awayId)]||'Auswärtsteam';
    let verdict='Die Form beider Mannschaften ist zuletzt ausgeglichen.';
    if(!homeForm.length||!awayForm.length)verdict=`Für ${esc(!homeForm.length?homeName:awayName)} liegen noch keine früheren Bundesliga-Formdaten vor.`;
    else if(difference>=3)verdict=`${esc(homeName)} ist zuletzt formstärker.`;
    else if(difference<=-3)verdict=`${esc(awayName)} ist zuletzt formstärker.`;
    return `<div style="padding:10px 0 14px"><div class="eyebrow">FORMVERGLEICH · LETZTE 5 BUNDESLIGASPIELE</div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:8px">${formCard(homeId,homeName,homeForm,table)}${formCard(awayId,awayName,awayForm,table)}</div><div style="margin-top:8px;color:var(--muted);font-size:11px">Punkte: <span style="color:#30d98b">●</span> Sieg · <span style="color:#91a3bd">●</span> Unentschieden · <span style="color:#ff6675">●</span> Niederlage · links älter, rechts aktuell</div><p style="margin:9px 0 0;font-size:12px;font-weight:700;color:var(--blue)">${verdict}</p></div>`;
  }

  async function goalRows(match){
    let detail=null;
    try{
      const stored=(await loadGoalsData())?.goalsByMatch?.[String(match.matchID)];
      if(Array.isArray(stored)&&stored.length)detail={goals:stored.map(goal=>({scoreTeam1:goal[0],scoreTeam2:goal[1],matchMinute:goal[2],goalGetterName:goal[3],isPenalty:goal[4],isOwnGoal:goal[5]}))};
    }catch(error){console.warn('Gespeicherte Torschützen:',error)}
    if(!Array.isArray(detail?.goals)||!detail.goals.length)try{
      const seasonMatches=await loadSeason(seasonFromDate(match.matchDateTime));
      detail=seasonMatches.find(item=>Number(item.matchID)===Number(match.matchID))||null;
    }catch(error){console.warn('Saison-Torschützen:',error)}
    if(!Array.isArray(detail?.goals)||!detail.goals.length)detail=await loadMatch(match.matchID);
    const goals=Array.isArray(detail?.goals)?detail.goals.slice().sort((a,b)=>Number(a.matchMinute||0)-Number(b.matchMinute||0)):[];
    if(!goals.length&&Number(match.pointsTeam1)===0&&Number(match.pointsTeam2)===0)return '';
    if(!goals.length)return '<div style="margin-top:7px;color:var(--muted);font-size:11px">Für dieses Bundesliga-Spiel sind bei OpenLigaDB keine Torschützen hinterlegt.</div>';
    return `<div style="margin-top:7px;padding-top:7px;border-top:1px solid rgba(255,255,255,.07)">${goals.map(goal=>{
      const minute=Number(goal?.matchMinute||0);
      const name=String(goal?.goalGetterName??goal?.goalgetterName??goal?.name??'').trim()||'Torschütze nicht verfügbar';
      const result=goal?.scoreTeam1!==undefined&&goal?.scoreTeam2!==undefined?`${goal.scoreTeam1}:${goal.scoreTeam2}`:'⚽';
      return `<div style="display:grid;grid-template-columns:38px 1fr;gap:8px;padding:3px 0;font-size:11px"><b style="color:var(--blue)">${esc(result)}</b><span>${esc(name)}${minute?` · ${minute}. Min.`:''}${goal?.isPenalty?' · Elfmeter':''}${goal?.isOwnGoal?' · Eigentor':''}</span></div>`;
    }).join('')}</div>`;
  }

  async function renderPanel(card,panel){
    panel.innerHTML='<div class="skeleton"><i></i><i></i><i></i></div>';
    try{
      const data=await loadDuelData();
      const pair=data?.matchToPair?.[String(card.dataset.matchId)];
      const packed=pair?data?.byPair?.[pair]:undefined;
      const last=Array.isArray(packed)?packed.map(row=>({matchID:row[0],matchDateTime:row[1],team1:{teamId:row[2],shortName:row[3]},team2:{teamId:row[4],shortName:row[5]},pointsTeam1:row[6],pointsTeam2:row[7]})):undefined;
      if(!Array.isArray(last))throw new Error('Begegnung fehlt in der Duell-Datei');
      const form=await formComparison(data,card.dataset.matchId);
      if(!last.length){
        panel.innerHTML=`${form}<p class="muted" style="padding:10px 0">Diese Vereine treffen in der Bundesliga zum ersten Mal aufeinander.</p>`;
        return;
      }
      const rows=[];
      for(const match of last){
        const date=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(match.matchDateTime));
        rows.push(`<div style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,.07)"><div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:12px"><small style="color:var(--muted)">${date}</small><strong style="text-align:center">${esc(match.team1?.shortName||match.team1?.teamName||'')} – ${esc(match.team2?.shortName||match.team2?.teamName||'')}</strong><b style="color:var(--blue)">${esc(score(match))}</b></div>${await goalRows(match)}</div>`);
      }
      panel.innerHTML=`${form}<div style="padding:10px 0 2px"><div class="eyebrow">LETZTE BUNDESLIGA-DUELLE</div>${rows.join('')}</div>`;
    }catch(error){
      console.warn('Direkte Duelle:',error);
      panel.innerHTML='<p class="error" style="padding:10px 0">Die Duellhistorie ist momentan nicht erreichbar. Bitte tippe zum erneuten Laden noch einmal auf „Direkte Duelle“.</p>';
      panel.dataset.loaded='';
    }
  }

  function enhance(card){
    if(!card||card.dataset.h2hReady==='1'||!card.dataset.matchId)return;
    card.dataset.h2hReady='1';
    const actions=card.querySelector('.match-actions');if(!actions)return;
    const button=document.createElement('button');button.type='button';button.className='h2h-toggle';button.innerHTML='<span>⚔️</span> Direkte Duelle';button.style.cssText='border:0;background:transparent;color:var(--blue);font:inherit;font-weight:800;padding:10px 8px;cursor:pointer';
    const panel=document.createElement('div');panel.className='h2h-inline-panel';panel.hidden=true;panel.style.cssText='padding:0 14px 12px';
    actions.insertAdjacentElement('beforebegin',panel);actions.insertAdjacentElement('afterbegin',button);
    button.addEventListener('click',event=>{event.stopPropagation();const open=panel.hidden;panel.hidden=!open;button.innerHTML=open?'<span>⚔️</span> Duelle schließen':'<span>⚔️</span> Direkte Duelle';if(open&&!panel.dataset.loaded){panel.dataset.loaded='1';renderPanel(card,panel)}});
  }

  function scan(){document.querySelectorAll('.match[data-match-id]').forEach(enhance)}
  scan();new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});
})();
