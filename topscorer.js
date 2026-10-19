/* Topscorer – verifizierte DFB-Scorerstatistik, Saison 2026/27.
   Vorlagen dürfen niemals aus OpenLigaDB-Toren geschätzt werden. */
(async function(){
  const section=document.getElementById("topscorerSection");
  if(!section)return;
  const status=document.getElementById("topscorerStatus");
  const tbody=document.getElementById("topscorerBody");
  const escape=(v)=>String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  try {
    const response=await fetch("topscorer-2026.json",{cache:"no-store"});
    if(!response.ok)throw new Error("HTTP "+response.status);
    const data=await response.json();
    if(data.season!=="2026/27"||!Array.isArray(data.players))throw new Error("Ungültiges Format");
    const valid=data.players.filter(p=>p && typeof p.name==="string" && Number.isInteger(p.goals) && p.goals>=0 && Number.isInteger(p.assists) && p.assists>=0 && p.goals+p.assists===p.points).sort((a,b)=>b.points-a.points||b.goals-a.goals||a.name.localeCompare(b.name,"de")).slice(0,30);
    if(!valid.length)throw new Error("Keine bestätigten Daten");
    tbody.innerHTML=valid.map((p,i)=>`<tr><td>${i+1}</td><td>${escape(p.name)}</td><td>${p.goals}</td><td><strong>${p.assists}</strong></td><td><b>${p.points}</b></td></tr>`).join("");
    status.textContent="DFB-Datencenter · Stand: "+(data.updated||"unbekannt")+" · "+valid.length+" Spieler. Angaben ohne Gewähr.";
  }catch(error){
    tbody.innerHTML='<tr><td colspan="5" class="muted">Scorerstatistik derzeit nicht verfügbar.</td></tr>';
    status.textContent="Bitte die DFB-Quelle aufrufen, um aktuelle Vorlagenzahlen nachzusehen.";
  }
})();
