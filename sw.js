const CACHE="ligakompakt-v1.0.0-final-keepers1",ASSETS=["./","index.html","info.html","einladen.html","teilen.html","statistik.html","admin.html","styles.css?v=1.0.0-fix1","app.js?v=1.0.0","tips-persistence.js?v=1","share-fix.js?v=2","manifest.webmanifest","icon.svg","icon-192.png","icon-512.png","icon-maskable-512.png","apple-touch-icon.png","qr-ligakompakt.png","social-preview.jpg","facebook-preview-v5.jpg","version.json"];
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)))});
self.addEventListener("activate",e=>e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))])));
self.addEventListener("message",e=>{if(e.data?.type==="SKIP_WAITING")self.skipWaiting()});
self.addEventListener("fetch",e=>{
  if(e.request.method!=="GET")return;const url=new URL(e.request.url),api=url.hostname==="api.openligadb.de";
  if(api){e.respondWith(fetch(e.request,{cache:"no-store"}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(()=>caches.match(e.request)));return}
  if(url.origin!==location.origin)return;
  if(url.pathname.endsWith("version.json")){e.respondWith(fetch(e.request,{cache:"no-store"}));return}
  e.respondWith(fetch(e.request,{cache:"reload"}).then(r=>{const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy));return r}).catch(async()=>await caches.match(e.request)||await caches.match("index.html")));
});
self.addEventListener("notificationclick",e=>{e.notification.close();e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>list[0]?list[0].focus():clients.openWindow(e.notification.data?.url||"./")))});
