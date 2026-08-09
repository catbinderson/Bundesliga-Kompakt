(()=>{
  const API='https://api.openligadb.de',DATA='h2h-2026.json?v=4';
  const matchCache=new Map();let duelDataPromise;
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

  async function loadMatch(matchId){
    if(matchCache.has(matchId))return matchCache.get(matchId);
    const request=getJson(`${API}/getmatchdata/${encodeURIComponent(matchId)}`).then(value=>Array.isArray(value)?value[0]:value).catch(()=>null);
    matchCache.set(matchId,request);
    const result=await request;
    if(!result)matchCache.delete(matchId);
    return result;
  }

  function score(match){
    return match.pointsTeam1===null||match.pointsTeam2===null?'–':`${match.pointsTeam1}:${match.pointsTeam2}`;
  }

  async function goalRows(match){
    const detail=await loadMatch(match.matchID);
    const goals=Array.isArray(detail?.goals)?detail.goals.slice().sort((a,b)=>Number(a.matchMinute||0)-Number(b.matchMinute||0)):[];
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
      if(!last.length){
        panel.innerHTML='<p class="muted" style="padding:10px 0">Diese Vereine treffen in der Bundesliga zum ersten Mal aufeinander.</p>';
        return;
      }
      const rows=[];
      for(const match of last){
        const date=new Intl.DateTimeFormat('de-DE',{day:'2-digit',month:'2-digit',year:'numeric'}).format(new Date(match.matchDateTime));
        rows.push(`<div style="padding:11px 0;border-bottom:1px solid rgba(255,255,255,.07)"><div style="display:grid;grid-template-columns:auto 1fr auto;gap:8px;align-items:center;font-size:12px"><small style="color:var(--muted)">${date}</small><strong style="text-align:center">${esc(match.team1?.shortName||match.team1?.teamName||'')} – ${esc(match.team2?.shortName||match.team2?.teamName||'')}</strong><b style="color:var(--blue)">${esc(score(match))}</b></div>${await goalRows(match)}</div>`);
      }
      panel.innerHTML=`<div style="padding:10px 0 2px"><div class="eyebrow">LETZTE BUNDESLIGA-DUELLE</div>${rows.join('')}</div>`;
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
