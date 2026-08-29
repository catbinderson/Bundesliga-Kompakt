(()=>{
  const CURRENT_BUILD=30;
  const KEY='ligakompakt.build';
  let checking=false;

  async function check(){
    if(checking||!navigator.onLine)return;
    checking=true;
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try{
      const r=await fetch(`version.json?t=${Date.now()}`,{cache:'no-store',signal:controller.signal});
      if(!r.ok)return;
      const data=await r.json();
      const remote=Number(data.build||0);
      if(remote>CURRENT_BUILD){
        const seen=Number(sessionStorage.getItem('ligakompakt.updateTarget')||0);
        if(seen===remote)return;
        sessionStorage.setItem('ligakompakt.updateTarget',String(remote));
        const reg=await navigator.serviceWorker?.getRegistration();
        reg?.update().catch(()=>{});
        setTimeout(()=>location.reload(),600);
        return;
      }
      sessionStorage.removeItem('ligakompakt.updateTarget');
      localStorage.setItem(KEY,String(CURRENT_BUILD));
    }catch(e){
      console.warn('Build-Prüfung:',e);
    }finally{
      clearTimeout(timer);
      checking=false;
    }
  }

  check();
  addEventListener('online',check);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')check()});
  setInterval(check,5*60*1000);
})();
