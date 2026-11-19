const C='companion-v9-0';
const ASSETS=[
  './',
  './index.html',
  './styles.css',
  './app.js',
  './sync.js',
  './delete-account.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(C)
      .then(cache=>Promise.allSettled(ASSETS.map(a=>cache.add(a))))
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

  e.respondWith(
    fetch(e.request)
      .then(res=>{
        if(res&&res.status===200&&res.type==='basic'){
          const copy=res.clone();
          caches.open(C).then(cache=>cache.put(e.request,copy)).catch(()=>{});
        }
        return res;
      })
      .catch(()=>caches.match(e.request).then(hit=>{
        if(hit)return hit;
        if(e.request.mode==='navigate')return caches.match('./index.html');
        return Response.error();
      }))
  );
});
