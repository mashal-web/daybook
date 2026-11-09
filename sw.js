const CACHE="daybook-v37";
const CORE=["./","./index.html","./styles.css","./timetable-theme.css","./upgrade.css","./upgrade.js","./mobile-app.css","./design-system.css","./study-planner.css","./persistence.js","./scheduling.js","./app.js","./native.js","./manifest.webmanifest","./icon.svg","./icon-192.png","./icon-512.png"];
self.addEventListener("install",event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(CORE)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key.startsWith("daybook-")&&key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim()));
});

self.addEventListener("notificationclick",event=>{
  event.notification.close();
  event.waitUntil((async()=>{
    const windows=await self.clients.matchAll({type:"window",includeUncontrolled:true});
    for(const client of windows)if("focus"in client)return client.focus();
    if(self.clients.openWindow)return self.clients.openWindow("./");
  })());
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET"||new URL(request.url).origin!==self.location.origin)return;
  event.respondWith((async()=>{
    try{
      const response=await fetch(request);
      if(response&&response.ok&&response.type==="basic"){
        const cache=await caches.open(CACHE);
        await cache.put(request,response.clone());
      }
      return response;
    }catch(error){
      const cached=await caches.match(request);
      if(cached)return cached;
      if(request.mode==="navigate"){
        const fallback=await caches.match("./index.html");
        if(fallback)return fallback;
      }
      throw error;
    }
  })());
});