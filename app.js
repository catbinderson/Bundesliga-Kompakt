const API="https://api.openligadb.de", LEAGUE="bl1", SEASON=2026;
let currentGroup=1, teams=[];
const $=s=>document.querySelector(s);

function escapeHtml(value=""){return String(value).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
function finalScore(m){const results=(m.matchResults||[]).filter(x=>x.resultTypeID===2||x.resultName==="Endergebnis");const r=results.at(-1)||(m.matchResults||[]).at(-1);return r?`${r.pointsTeam1}:${r.pointsTeam2}`:"–"}
function dateText(s){return s?new Intl.DateTimeFormat("de-DE",{weekday:"short",day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"}).format(new Date(s)):""}
function skeletons(el,count=3){el.innerHTML=Array.from({length:count},()=>'<div class="card skeleton"><i></i><i></i><i></i></div>').join("")}
async function get(path){const r=await fetch(API+path,{cache:"no-store"});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}

function matchCard(m){
  const node=$("#matchTpl").content.firstElementChild.cloneNode(true), kickoff=new Date(m.matchDateTime), now=new Date();
  node.querySelector(".match-meta").textContent=`${m.group?.groupName||""} · ${dateText(m.matchDateTime)}`;
  node.querySelector(".home img").src=m.team1?.teamIconUrl||""; node.querySelector(".home span").textContent=m.team1?.shortName||m.team1?.teamName||"";
  node.querySelector(".away img").src=m.team2?.teamIconUrl||""; node.querySelector(".away span").textContent=m.team2?.shortName||m.team2?.teamName||"";
  const state=node.querySelector(".match-state"), isLive=!m.matchIsFinished&&now>=kickoff&&(now-kickoff)<3*60*60*1000;
  if(m.matchIsFinished){node.querySelector(".score").textContent=finalScore(m);node.querySelector(".kickoff").textContent="Endstand";state.textContent="BEENDET";state.classList.add("done")}
  else if(isLive){node.querySelector(".score").textContent=finalScore(m)==="–"?"LIVE":finalScore(m);node.querySelector(".kickoff").textContent="läuft";state.textContent="LIVE";state.classList.add("live")}
  else{node.querySelector(".score").textContent=new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(kickoff);node.querySelector(".kickoff").textContent=new Intl.DateTimeFormat("de-DE",{day:"2-digit",month:"2-digit"}).format(kickoff);state.textContent="ANSTEHEND"}
  return node;
}
function renderMatches(el,matches){el.innerHTML="";if(!matches.length){el.innerHTML='<div class="card muted">Keine Spiele gefunden.</div>';return}matches.forEach(m=>el.appendChild(matchCard(m)))}
function renderFavoriteHero(teamId){const wrap=$("#favoriteHero"),t=teams.find(x=>String(x.teamId)===String(teamId));if(!t){wrap.innerHTML="";return}wrap.innerHTML=`<button class="favorite-strip" data-goto="club"><img src="${escapeHtml(t.teamIconUrl||"")}" alt=""><span><span class="eyebrow">MEIN VEREIN</span><strong>${escapeHtml(t.teamName)}</strong><small>Spiele & Übersicht öffnen</small></span><span class="fav-pill">★ FAVORIT</span></button>`;wrap.firstElementChild.onclick=()=>showView("club")}
async function loadTable(){const data=await get(`/getbltable/${LEAGUE}/${SEASON}`);$("#tableBody").innerHTML=data.map((t,i)=>`<tr><td>${i+1}</td><td><div class="club-row"><img src="${escapeHtml(t.teamIconUrl||"")}" alt=""><span>${escapeHtml(t.shortName||t.teamName)}</span></div></td><td>${t.matches}</td><td class="wide-col">${t.won}</td><td class="wide-col">${t.draw}</td><td class="wide-col">${t.lost}</td><td>${t.goalDiff>=0?"+":""}${t.goalDiff}</td><td><b>${t.points}</b></td></tr>`).join("")}
async function loadFixtures(group=currentGroup){skeletons($("#fixturesList"));const data=await get(`/getmatchdata/${LEAGUE}/${SEASON}/${group}`);$("#matchdayTitle").textContent=`${group}. Spieltag`;renderMatches($("#fixturesList"),data)}
async function loadToday(){skeletons($("#todayMatches"));const data=await get(`/getmatchdata/${LEAGUE}`);currentGroup=data[0]?.group?.groupOrderID||1;$("#todayTitle").textContent=`${currentGroup}. Spieltag`;$("#todaySub").textContent="Aktuelle Spiele, Anstoßzeiten und Ergebnisse";renderMatches($("#todayMatches"),data)}
async function loadTeams(){teams=await get(`/getavailableteams/${LEAGUE}/${SEASON}`);const options='<option value="">Verein wählen …</option>'+teams.map(t=>`<option value="${t.teamId}">${escapeHtml(t.teamName)}</option>`).join("");$("#teamSelect").innerHTML=options;$("#onboardingTeam").innerHTML=options;const saved=localStorage.getItem("ligakompakt.favorite");if(saved){$("#teamSelect").value=saved;$("#onboardingTeam").value=saved;renderFavoriteHero(saved);await loadClub(saved,false)}else if(localStorage.getItem("ligakompakt.onboarded")!=="1")$("#onboarding").classList.remove("hidden")}
async function loadClub(teamId,save=true){
  if(!teamId){$("#clubHeader").innerHTML="";$("#clubContent").innerHTML="";renderFavoriteHero("");return}
  if(save){localStorage.setItem("ligakompakt.favorite",teamId);localStorage.setItem("ligakompakt.onboarded","1")}
  $("#teamSelect").value=teamId;$("#onboardingTeam").value=teamId;renderFavoriteHero(teamId);
  const team=teams.find(t=>String(t.teamId)===String(teamId));$("#clubHeader").innerHTML=`<div class="card club-hero"><img src="${escapeHtml(team?.teamIconUrl||"")}" alt=""><div><div class="eyebrow">MEIN VEREIN</div><h2>${escapeHtml(team?.teamName||"")}</h2></div></div>`;
  $("#clubContent").innerHTML='<div class="section-head compact"><h3>Spiele werden geladen …</h3></div>';const matches=await get(`/getmatchesbyteamid/${teamId}/3/3`),now=new Date();
  const upcoming=matches.filter(m=>!m.matchIsFinished&&new Date(m.matchDateTime)>=now).sort((a,b)=>new Date(a.matchDateTime)-new Date(b.matchDateTime)).slice(0,3);
  const past=matches.filter(m=>m.matchIsFinished).sort((a,b)=>new Date(b.matchDateTime)-new Date(a.matchDateTime)).slice(0,3);
  $("#clubContent").innerHTML='<div class="section-head compact"><div><div class="eyebrow">AUSBLICK</div><h3>Nächste Spiele</h3></div></div><div id="clubUpcoming" class="stack"></div><div class="section-head compact"><div><div class="eyebrow">RÜCKBLICK</div><h3>Letzte Ergebnisse</h3></div></div><div id="clubPast" class="stack"></div>';
  renderMatches($("#clubUpcoming"),upcoming);renderMatches($("#clubPast"),past);
}
function setupMatchdays(){const s=$("#matchdaySelect");s.innerHTML=Array.from({length:34},(_,i)=>`<option value="${i+1}">${i+1}. Spieltag</option>`).join("");s.value=String(currentGroup);s.onchange=e=>loadFixtures(Number(e.target.value)).catch(showError)}
function showError(e){console.error(e);$("#todayMatches").innerHTML='<div class="error">Daten konnten nicht geladen werden. Bitte später erneut versuchen.</div>';$("#liveDot").textContent=navigator.onLine?"Fehler":"Offline"}
function showView(id){document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.view===id));document.querySelectorAll(".view").forEach(x=>x.classList.toggle("active",x.id===id));window.scrollTo({top:0,behavior:"smooth"})}
function updateNetwork(){const offline=!navigator.onLine;$("#networkBanner").classList.toggle("hidden",!offline);if(offline)$("#liveDot").textContent="Offline"}
async function refreshAll(){try{$("#refreshBtn").classList.add("spinning");$("#liveDot").textContent="Lädt …";await Promise.all([loadToday(),loadTable(),loadTeams()]);setupMatchdays();$("#matchdaySelect").value=String(currentGroup);await loadFixtures(currentGroup);$("#liveDot").textContent=navigator.onLine?"Online":"Offline";$("#updatedAt").textContent=`Zuletzt aktualisiert: ${new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date())}`}catch(e){showError(e)}finally{$("#refreshBtn").classList.remove("spinning")}}
document.querySelectorAll(".nav").forEach(b=>b.onclick=()=>showView(b.dataset.view));document.querySelectorAll("[data-goto]").forEach(b=>b.onclick=()=>showView(b.dataset.goto));
$("#teamSelect").onchange=e=>loadClub(e.target.value).catch(showError);$("#refreshBtn").onclick=refreshAll;
$("#saveFavorite").onclick=async()=>{const id=$("#onboardingTeam").value;if(!id)return;await loadClub(id);$("#onboarding").classList.add("hidden")};$("#skipFavorite").onclick=()=>{localStorage.setItem("ligakompakt.onboarded","1");$("#onboarding").classList.add("hidden")};
addEventListener("online",()=>{updateNetwork();refreshAll()});addEventListener("offline",updateNetwork);updateNetwork();if("serviceWorker" in navigator)navigator.serviceWorker.register("sw.js");refreshAll();
