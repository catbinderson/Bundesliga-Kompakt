(()=>{
  const original = renderLeagueTable;
  renderLeagueTable = function(data){
    const table=document.querySelector('.table-wrap table');
    const head=table?.querySelector('thead tr');
    if(head) head.innerHTML='<th>#</th><th>Verein</th><th>Sp</th><th class="wide-col">S</th><th class="wide-col">U</th><th class="wide-col">N</th><th>TF</th><th>TA</th><th>TD</th><th>Pkt</th>';
    const favorite=localStorage.getItem('ligakompakt.favorite');
    document.querySelector('#tableBody').innerHTML=data.map((t,i)=>{
      const id=standingId(t),isFavorite=id===favorite;
      const goals=Number(t.goals??0), against=Number(t.opponentGoals??0), diff=Number(t.goalDiff??(goals-against));
      return `<tr class="${isFavorite?'favorite-standing':''}" data-standing-team="${id}"><td>${i+1}</td><td><div class="club-row"><img src="${escapeHtml(t.teamIconUrl||'')}" alt=""><span>${escapeHtml(t.shortName||t.teamName)}</span>${isFavorite?'<b class="standing-favorite">★ MEIN VEREIN</b>':''}</div></td><td>${t.matches}</td><td class="wide-col">${t.won}</td><td class="wide-col">${t.draw}</td><td class="wide-col">${t.lost}</td><td>${goals}</td><td>${against}</td><td>${diff>=0?'+':''}${diff}</td><td><b>${t.points}</b></td></tr>`;
    }).join('');
    const row=document.querySelector('#tableBody .favorite-standing');
    if(row)row.onclick=()=>showView('club');
  };
  const style=document.createElement('style');
  style.textContent=`
    .table-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
    .table-wrap table{min-width:720px}
    .table-wrap th,.table-wrap td{white-space:nowrap}
    .table-wrap th:nth-last-child(-n+4),.table-wrap td:nth-last-child(-n+4){text-align:center}
    @media(max-width:600px){
      .table-wrap table{min-width:660px}
      .table-wrap th,.table-wrap td{padding-left:9px;padding-right:9px;font-size:13px}
      .table-wrap .club-row img{width:32px;height:32px}
      .standing-favorite{display:none}
    }`;
  document.head.appendChild(style);
  if(Array.isArray(window.leagueTable)&&window.leagueTable.length) renderLeagueTable(window.leagueTable);
})();