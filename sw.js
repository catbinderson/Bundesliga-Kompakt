const CACHE="ligakompakt-v0.3-ultra";
const ASSETS=["./","index.html","styles.css?v=0.3","app.js?v=0.3","manifest.webmanifest"];
self.addEventListener("install",e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener("fetch",e=>{
  if(new URL(e.request.url).hostname==="api.openligadb.de"){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});