(()=>{
  const CURRENT_BUILD=11;
  const KEY='ligakompakt.build';
  let updating=false;
  function showUpdated(){
    const url=new URL(location.href),updated=url.searchParams.get('updated');
    if(updated!==String(CURRENT_BUILD))return;
    const banner=document.createElement('div');
    banner.textContent=`✓ LigaKompakt wurde aktualisiert · Build ${CURRENT_BUILD}`;
    banner.style.cssText='position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 12px);transform:translateX(-50%);z-index:99999;background:#123d2d;color:#dfffea;border:1px solid rgba(57,219,134,.45);border-radius:14px;padding:10px 14px;font:700 12px system-ui,-apple-system,sans-serif;box-shadow:0 10px 30px rgba(0,0,0,.35);white-space:nowrap';
    document.body.appendChild(banner);setTimeout(()=>banner.remove(),3500);
    url.searchParams.delete('updated');url.searchParams.delete('t');url.searchParams.delete('build');
    history.replaceState(null,'',url.pathname+(url.searchParams.toString()?`?${url.searchParams}`:'')+url.hash);
  }
  async function check(){
    if(updating||!navigator.onLine)return;
    try{
      const r=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store'});if(!r.ok)return;
      const data=await r.json(),remote=Number(data.build||0);
      if(remote>CURRENT_BUILD){
        updating=true;const status=document.getElementById('liveDot');if(status)status.textContent='Update …';
        const reg=await navigator.serviceWorker?.getRegistration();await reg?.update();
        if(reg?.waiting)reg.waiting.postMessage({type:'SKIP_WAITING'});
        localStorage.setItem(KEY,String(remote));
        const u=new URL(location.href);u.searchParams.set('updated',String(remote));u.searchParams.set('t',String(Date.now()));
        setTimeout(()=>location.replace(u.href),800);return;
      }
      localStorage.setItem(KEY,String(CURRENT_BUILD));
    }catch(e){console.warn('Build-Prüfung:',e)}
  }
  showUpdated();check();addEventListener('online',check);document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});setInterval(check,5*60*1000);
})();
