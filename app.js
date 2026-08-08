const API="https://api.openligadb.de";
const LEAGUE="bl1";
const SEASON=2026;
let currentGroup=1;
let teams=[];
const $=s=>document.querySelector(s);

function finalScore(m){
  const ends=(m.matchResults||[]).filter(x=>x.resultTypeID===2||x.resultName==="Endergebnis");
  const r=ends.at(-1)||(m.matchResults||[]).at(-1);
  return r?`${r.pointsTeam1}:${r.pointsTeam2}`:"–";
}
function dateText(s){
  if(!s)return "";
  return new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(s));
}
async function get(path){
  const r=await fetch(API+path,{cache:"no-store"});
  if(!r.ok)throw new Error(`HTTP ${r.status}`);
  return r.json();
}
function matchCard(m){
  const node=$("#matchTpl").content.firstElementChild.cloneNode(true);
  node.querySelector(".match-meta").textContent=`${m.group?.groupName||""} · ${dateText(m.matchDateTime)}`;
  node.querySelector(".home img").src=m.team1?.teamIconUrl||"";
  node.querySelector(".home span").textContent=m.team1?.shortName||m.team1?.teamName||"";
  node.querySelector(".away span").textContent=m.team2?.shortName||m.team2?.teamName||"";
  node.querySelector(".away img").src=m.team2?.teamIconUrl||"";
  node.querySelector(".score").textContent=m.matchIsFinished?finalScore(m):new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date(m.matchDateTime));
  return node;
}
function renderMatches(el,matches){
  el.innerHTML="";
  if(!matches.length){el.innerHTML='<div class="card muted">Keine Spiele gefunden.</div>';return}
  matches.forEach(m=>el.appendChild(matchCard(m)));
}
async function loadTable(){
  const data=await get(`/getbltable/${LEAGUE}/${SEASON}`);
  $("#tableBody").innerHTML=data.map((t,i)=>`<tr>
    <td>${i+1}</td>
    <td><div class="club-row"><img src="${t.teamIconUrl||""}" alt=""><span>${t.shortName||t.teamName}</span></div></td>
    <td>${t.matches}</td><td>${t.goalDiff>=0?"+":""}${t.goalDiff}</td><td><b>${t.points}</b></td>
  </tr>`).join("");
}
async function loadFixtures(group=currentGroup){
  const data=await get(`/getmatchdata/${LEAGUE}/${SEASON}/${group}`);
  $("#matchdayTitle").textContent=`${group}. Spieltag`;
  renderMatches($("#fixturesList"),data);
}
async function loadToday(){
  const data=await get(`/getmatchdata/${LEAGUE}`);
  currentGroup=data[0]?.group?.groupOrderID||1;
  $("#todayTitle").textContent=`${currentGroup}. Spieltag`;
  $("#todaySub").textContent="Aktuelle Spiele und nächste Termine";
  renderMatches($("#todayMatches"),data);
}
async function loadTeams(){
  teams=await get(`/getavailableteams/${LEAGUE}/${SEASON}`);
  const sel=$("#teamSelect");
  sel.innerHTML='<option value="">Verein wählen …</option>'+teams.map(t=>`<option value="${t.teamId}">${t.teamName}</option>`).join("");
  const saved=localStorage.getItem("ligakompakt.favorite");
  if(saved){sel.value=saved;await loadClub(saved)}
}
async function loadClub(teamId){
  if(!teamId){$("#clubContent").innerHTML="";return}
  localStorage.setItem("ligakompakt.favorite",teamId);
  const team=teams.find(t=>String(t.teamId)===String(teamId));
  const matches=await get(`/getmatchesbyteamid/${teamId}/3/3`);
  $("#clubContent").innerHTML=`<div class="card club-row"><img src="${team?.teamIconUrl||""}" alt=""><div><div class="eyebrow">MEIN VEREIN</div><h2>${team?.teamName||""}</h2></div></div>`;
  renderMatches($("#clubContent"),matches);
}
function setupMatchdays(){
  $("#matchdaySelect").innerHTML=Array.from({length:34},(_,i)=>`<option value="${i+1}">${i+1}. Spieltag</option>`).join("");
  $("#matchdaySelect").value=currentGroup;
  $("#matchdaySelect").onchange=e=>loadFixtures(Number(e.target.value)).catch(showError);
}
function showError(e){
  console.error(e);
  $("#todayMatches").innerHTML=`<div class="error">Daten konnten nicht geladen werden. ${e.message||""}</div>`;
  $("#liveDot").textContent="Offline";
}
async function refreshAll(){
  try{
    $("#liveDot").textContent="Lädt …";
    await Promise.all([loadToday(),loadTable(),loadTeams()]);
    setupMatchdays();
    await loadFixtures(currentGroup);
    $("#liveDot").textContent="Online";
  }catch(e){showError(e)}
}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>{
  document.querySelectorAll(".nav").forEach(x=>x.classList.remove("active"));
  document.querySelectorAll(".view").forEach(x=>x.classList.remove("active"));
  b.classList.add("active");$("#"+b.dataset.view).classList.add("active");
});
$("#teamSelect").onchange=e=>loadClub(e.target.value).catch(showError);
$("#refreshBtn").onclick=refreshAll;
if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");
refreshAll();
