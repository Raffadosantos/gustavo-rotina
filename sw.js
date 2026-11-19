const C="gr-v2";
self.addEventListener("install",()=>self.skipWaiting());
self.addEventListener("activate",e=>e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",e=>{if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(C).then(x=>x.put(e.request,c));return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("./"))))});
self.addEventListener("push",e=>{let p={};try{p=e.data.json()}catch(_){try{p={data:{body:e.data.text()}}}catch(__){}}
const d=Object.assign({},p.data||{},p.notification||{});
e.waitUntil(self.registration.showNotification(d.title||"Rotina",{body:d.body||"",icon:"icon-192.png",badge:"icon-192.png",tag:d.tag||undefined,data:{url:"./"}}))});
self.addEventListener("notificationclick",e=>{e.notification.close();
e.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(l=>{for(const c of l){if("focus" in c)return c.focus()}return clients.openWindow("./")}))});
