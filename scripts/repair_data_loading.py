from pathlib import Path
import re

app = Path('app.js')
text = app.read_text(encoding='utf-8')

text = re.sub(
    r'async function get\(path\)\{const r=await fetch\(API\+path,\{cache:"no-store"\}\);if\(!r\.ok\)throw new Error\(`HTTP \$\{r\.status\}`\);return r\.json\(\)\}',
    '''async function get(path){
  const cacheKey=`ligakompakt.api.${path}`;
  let lastError=null;
  for(let attempt=1;attempt<=3;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),10000);
    try{
      const r=await fetch(API+path,{cache:"no-store",signal:controller.signal});
      if(!r.ok)throw new Error(`HTTP ${r.status}`);
      const data=await r.json();
      try{localStorage.setItem(cacheKey,JSON.stringify({saved:Date.now(),data}))}catch{}
      return data;
    }catch(e){lastError=e;if(attempt<3)await new Promise(resolve=>setTimeout(resolve,500*attempt))}
    finally{clearTimeout(timer)}
  }
  try{
    const cached=JSON.parse(localStorage.getItem(cacheKey)||"null");
    if(cached?.data!=null){
      const banner=$("#networkBanner");
      if(banner){banner.textContent=`Verbindung gestört – gespeicherte Daten für ${path} werden angezeigt`;banner.classList.remove("hidden")}
      return cached.data;
    }
  }catch{}
  const detail=lastError?.name==="AbortError"?"Zeitüberschreitung":(lastError?.message||"unbekannter Fehler");
  throw new Error(`${path} · ${detail}`);
}''', text, count=1)

text = text.replace('renderFavoriteHero(saved);await loadClub(saved,false)','renderFavoriteHero(saved);loadClub(saved,false).catch(e=>console.warn("Mein Verein konnte nicht aktualisiert werden:",e))')

text = re.sub(
    r'function showError\(e\)\{console\.error\(e\);\$\("#todayMatches"\)\.innerHTML=\'<div class="error">Daten konnten nicht geladen werden\. Bitte später erneut versuchen\.</div>\';\$\("#liveDot"\)\.textContent=navigator\.onLine\?"Fehler":"Offline"\}',
    '''function showError(e){console.error(e);const detail=escapeHtml(e?.message||String(e)||"Unbekannter Fehler");const target=$("#todayMatches");if(target&&!currentMatches.length)target.innerHTML=`<div class="error"><b>Datenabruf fehlgeschlagen</b><br><small>${detail}</small></div>`;$("#todaySub").textContent=`Aktualisierung fehlerhaft · ${detail}`;$("#liveDot").textContent=navigator.onLine?"Teilfehler":"Offline"}''', text, count=1)

text = re.sub(
    r'async function refreshAll\(\)\{try\{\$\("#refreshBtn"\)\.classList\.add\("spinning"\);\$\("#liveDot"\)\.textContent="Lädt …";await Promise\.all\(\[loadToday\(\),loadTable\(\),loadTeams\(\)\]\);setupMatchdays\(\);\$\("#matchdaySelect"\)\.value=String\(currentGroup\);await loadFixtures\(currentGroup\);\$\("#liveDot"\)\.textContent=navigator\.onLine\?"Online":"Offline";\$\("#updatedAt"\)\.textContent=`Zuletzt aktualisiert: \$\{new Intl\.DateTimeFormat\("de-DE",\{hour:"2-digit",minute:"2-digit"\}\)\.format\(new Date\(\)\)\}`\}catch\(e\)\{showError\(e\)\}finally\{\$\("#refreshBtn"\)\.classList\.remove\("spinning"\)\}\}',
    '''async function refreshAll(){$("#refreshBtn").classList.add("spinning");$("#liveDot").textContent="Lädt …";const failures=[];try{const results=await Promise.allSettled([loadToday(),loadTable(),loadTeams()]);const labels=["Live-Daten","Tabelle","Vereine"];results.forEach((r,i)=>{if(r.status==="rejected")failures.push(`${labels[i]}: ${r.reason?.message||r.reason}`)});if(results[0].status==="rejected")throw results[0].reason;setupMatchdays();$("#matchdaySelect").value=String(currentGroup);try{await loadFixtures(currentGroup)}catch(e){failures.push(`Spieltag: ${e?.message||e}`)}$("#liveDot").textContent=failures.length?"Teilweise online":(navigator.onLine?"Online":"Offline");$("#updatedAt").textContent=`Zuletzt aktualisiert: ${new Intl.DateTimeFormat("de-DE",{hour:"2-digit",minute:"2-digit"}).format(new Date())}`;if(failures.length){console.warn("LigaKompakt Teilfehler",failures);$("#todaySub").textContent=`Live-Daten aktuell · Teilfehler: ${failures.join(" | ")}`}}catch(e){showError(e)}finally{$("#refreshBtn").classList.remove("spinning")}}''', text, count=1)

app.write_text(text, encoding='utf-8')

index=Path('index.html')
idx=index.read_text(encoding='utf-8')
idx=re.sub(r'\s*<script src="(?:fetch-fix|data-fix)\.js\?v=[^"]+"></script>','',idx)
index.write_text(idx,encoding='utf-8')

sw=Path('sw.js')
s=sw.read_text(encoding='utf-8')
s=re.sub(r',?"(?:fetch-fix|data-fix)\.js\?v=[^"]+"','',s)
sw.write_text(s,encoding='utf-8')

print('Datenlogik direkt in app.js bereinigt')
