(()=>{
  const BASE='https://countapi.mileshilliard.com/api/v1/hit/';
  const PREFIX='ligakompakt_andreas_binder_2026_v2_';
  const pad=value=>String(value).padStart(2,'0');
  const day=()=>{const date=new Date();return `${date.getFullYear()}_${pad(date.getMonth()+1)}_${pad(date.getDate())}`};
  const hit=name=>fetch(`${BASE}${PREFIX}${name}`,{cache:'no-store',mode:'cors'}).catch(error=>console.warn('Nutzungszähler:',error));
  hit('app_opens');
  hit(`day_${day()}`);
  try{
    const key='ligakompakt.statsDeviceV2';
    if(!localStorage.getItem(key)){localStorage.setItem(key,crypto.randomUUID?.()||`${Date.now()}-${Math.random()}`);hit('unique_devices')}
  }catch(error){console.warn('Gerätezählung:',error)}
})();
