(()=>{
  const BASE='https://countapi.mileshilliard.com/api/v1/hit/';
  const PREFIX='ligakompakt_andreas_binder_2026_v2_';
  const pad=value=>String(value).padStart(2,'0');
  const day=()=>{const date=new Date();return `${date.getFullYear()}_${pad(date.getMonth()+1)}_${pad(date.getDate())}`};
  const hit=async name=>{const response=await fetch(`${BASE}${PREFIX}${name}`,{cache:'no-store',mode:'cors',keepalive:true});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json()};
  hit('app_opens').catch(error=>console.warn('Aufrufszählung:',error));
  hit(`day_${day()}`).catch(error=>console.warn('Tageszählung:',error));
  try{
    const deviceKey='ligakompakt.statsDeviceV2',registeredKey='ligakompakt.statsDeviceRegisteredV2';
    if(!localStorage.getItem(deviceKey))localStorage.setItem(deviceKey,crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`);
    if(!localStorage.getItem(registeredKey))hit('unique_devices').then(()=>localStorage.setItem(registeredKey,'1')).catch(error=>console.warn('Gerätezählung:',error));
  }catch(error){console.warn('Gerätezählung:',error)}
})();
