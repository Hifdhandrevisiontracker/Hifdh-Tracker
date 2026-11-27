/* My Companion — offline helper.
   Tries the internet first (so updates arrive quickly), but if the connection
   is slow or missing it shows the saved copy after 3 seconds. */
const C='companion-v10-0';
const ASSETS=[
  './','./index.html','./styles.css',
  './data/quran-data.js','./js/util.js','./js/quran.js','./js/plan.js','./js/store.js','./js/app.js',
  './sync.js','./delete-account.html','./manifest.webmanifest','./icon-192.png','./icon-512.png'
];
const NET_TIMEOUT_MS=3000;

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(C)
      .then(cache=>Promise.allSettled(ASSETS.map(a=>cache.add(new Request(a,{cache:'reload'})))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(keys=>Promise.all(keys.filter(k=>k!==C).map(k=>caches.delete(k))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const url=new URL(e.request.url);
  if(url.origin!==self.location.origin)return;

  e.respondWith((async()=>{
    const cache=await caches.open(C);
    const network=fetch(e.request).then(res=>{
      if(res&&res.status===200&&res.type==='basic')cache.put(e.request,res.clone()).catch(()=>{});
      return res;
    });
    const fromCache=()=>cache.match(e.request,{ignoreSearch:e.request.mode==='navigate'})
      .then(hit=>hit||(e.request.mode==='navigate'?cache.match('./index.html'):undefined));
    try{
      const timeout=new Promise((_,rej)=>setTimeout(()=>rej(new Error('slow')),NET_TIMEOUT_MS));
      return await Promise.race([network,timeout]);
    }catch(err){
      const hit=await fromCache();
      if(hit){network.catch(()=>{});return hit}
      try{return await network}catch(_){return Response.error()}
    }
  })());
});
