const C='companion-v8-2';
const F=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icon-192.png','./icon-512.png'];
const SKIP_HOSTS=['firestore.googleapis.com','firebaseio.com','identitytoolkit.googleapis.com','securetoken.googleapis.com','firebaseinstallations.googleapis.com','googleapis.com','gstatic.com'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(C).then(c=>c.addAll(F.map(u=>new Request(u,{cache:'reload'})))));
  self.skipWaiting();
});

self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))));
  self.clients.claim();
});

self.addEventListener('fetch',e=>{
  const r=e.request;
  if(r.method!=='GET')return;
  const url=new URL(r.url);
  if(url.origin!==self.location.origin)return;
  if(SKIP_HOSTS.some(h=>url.hostname===h||url.hostname.endsWith('.'+h)))return;
  e.respondWith(
    fetch(r).then(res=>{
      if(res.ok){
        const cp=res.clone();
        caches.open(C).then(c=>c.put(r,cp));
      }
      return res;
    }).catch(()=>caches.match(r).then(hit=>hit||(r.mode==='navigate'?caches.match('./index.html'):undefined)))
  );
});
