/* ==========================================================================
   My Companion — shared helpers (dates, storage, safety, formatting)
   ========================================================================== */

const pad=n=>String(n).padStart(2,'0');
const T=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
function addDays(str,k){const p=str.split('-');const d=new Date(+p[0],+p[1]-1,+p[2]);d.setDate(d.getDate()+k);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}

const $=id=>document.getElementById(id);
const LS=window.localStorage;

/* ------------------------------ Storage ------------------------------- */
function ld(k,d){try{const v=LS.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
/* Returns true when saved. On failure (usually "storage full") it never fails silently. */
function sv(k,v){
  try{LS.setItem(k,JSON.stringify(v));return true}
  catch(e){
    const full=e&&(e.name==='QuotaExceededError'||e.code===22||/quota/i.test(e.message||''));
    const msg=full?t('err_storage_full'):t('err_save_failed',{msg:(e&&e.message)||'?'});
    if(typeof onStorageError==='function')onStorageError(msg);
    return false;
  }
}

/* ------------------------------- Safety ------------------------------- */
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const encAttr=t=>encodeURIComponent(t).replace(/'/g,'%27');

function safeExternalUrl(raw){
  if(!raw)return null;
  try{
    const u=new URL(String(raw).trim());
    return (u.protocol==='https:'||u.protocol==='http:')?u.href:null;
  }catch(e){return null}
}
/* Only accept real image data URLs (used for profile photos). */
function safeImageData(src){
  return (typeof src==='string'&&/^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(src))?src:'';
}

/* Only harmless text styling survives in notes and lessons
   (no positioning, overlays or outside images). */
const SAFE_CSS=new Set(['color','background-color','font-weight','font-style','font-size','font-family','text-decoration','text-align','max-width','width','border-radius','margin','margin-top','margin-bottom','padding','direction']);
function cleanStyle(style){
  return String(style||'').split(';').map(x=>x.trim()).filter(Boolean).map(decl=>{
    const i=decl.indexOf(':');if(i<1)return null;
    const prop=decl.slice(0,i).trim().toLowerCase(), val=decl.slice(i+1).trim();
    if(!SAFE_CSS.has(prop))return null;
    if(/url\s*\(|expression|javascript:|[<>\\]|@import/i.test(val))return null;
    return prop+':'+val;
  }).filter(Boolean).join(';');
}
function sanitizeHtml(dirty){
  if(!dirty)return '';
  const tpl=document.createElement('template');
  tpl.innerHTML=String(dirty);
  const ALLOW_TAGS=new Set(['B','STRONG','I','EM','U','P','BR','UL','OL','LI','H1','H2','H3','H4','TABLE','THEAD','TBODY','TR','TH','TD','SPAN','DIV','BLOCKQUOTE','FONT','IMG','A']);
  const walk=node=>{
    Array.from(node.childNodes).forEach(ch=>{
      if(ch.nodeType===1){
        const tag=ch.tagName.toUpperCase();
        if(!ALLOW_TAGS.has(tag)){ch.remove();return}
        Array.from(ch.attributes).forEach(attr=>{
          const n=attr.name.toLowerCase();
          if(n==='style'){
            const c=cleanStyle(attr.value);
            if(c)ch.setAttribute('style',c);else ch.removeAttribute('style');
            return;
          }
          if(n==='dir'&&/^(rtl|ltr|auto)$/i.test(attr.value))return;
          if(tag==='A'){
            if(n==='href'){
              const ok=safeExternalUrl(attr.value);
              if(ok)ch.setAttribute('href',ok);else ch.removeAttribute('href');
            }else ch.removeAttribute(attr.name);
          }else if(tag==='IMG'){
            if(n==='src'){
              const v=attr.value.trim();
              if(!(/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v)||safeExternalUrl(v)))ch.removeAttribute('src');
            }else if(n!=='alt')ch.removeAttribute(attr.name);
          }else if(tag==='FONT'){
            if(n==='color'||n==='size'){/* keep */}
            else if(n==='face'){if(/[<>"]/.test(attr.value))ch.removeAttribute(attr.name)}
            else ch.removeAttribute(attr.name);
          }else if(tag==='TD'||tag==='TH'){
            if(n!=='colspan'&&n!=='rowspan')ch.removeAttribute(attr.name);
          }else ch.removeAttribute(attr.name);
        });
        if(tag==='A'&&ch.hasAttribute('href')){
          ch.setAttribute('target','_blank');
          ch.setAttribute('rel','noopener noreferrer');
        }
        walk(ch);
      }else if(ch.nodeType===8){ch.remove()}
    });
  };
  walk(tpl.content);
  return tpl.innerHTML;
}
function htmlToPlain(html){
  if(!html)return '';
  const d=document.createElement('template');
  d.innerHTML=String(html);
  return (d.content.textContent||'').replace(/\s+/g,' ').trim();
}

/* Shrink a photo before storing it (phone photos are often 3–8 MB). */
function resizeImageFile(file,maxSide=1280,quality=0.8){
  return new Promise((resolve,reject)=>{
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error('Could not read the image'));
    reader.onload=e=>{
      const img=new Image();
      img.onerror=()=>reject(new Error('This file is not a supported image'));
      img.onload=()=>{
        const scale=Math.min(1,maxSide/Math.max(img.width,img.height));
        const w=Math.max(1,Math.round(img.width*scale)), h=Math.max(1,Math.round(img.height*scale));
        const c=document.createElement('canvas');c.width=w;c.height=h;
        const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,w,h);ctx.drawImage(img,0,0,w,h);
        resolve(c.toDataURL('image/jpeg',quality));
      };
      img.src=e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

/* ----------------------------- Formatting ----------------------------- */
const chunkName=n=>n>0?t('chunk_last',{n}):t('chunk_whole');
const UZ_MONTHS=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
function fmtDate(d,opts){
  if(!d)return '—';
  const dt=new Date(d+'T00:00');
  // Phones often lack Uzbek month names ("M12"), so Uzbek dates are written here.
  if(typeof LANG!=='undefined'&&LANG==='uz'){
    const m=UZ_MONTHS[dt.getMonth()];
    return opts&&opts.day?`${dt.getDate()}-${m}, ${dt.getFullYear()}`:`${m}, ${dt.getFullYear()}`;
  }
  try{return dt.toLocaleDateString(curLocale(),opts)}catch(e){return dt.toLocaleDateString(undefined,opts)}
}
const fmt=d=>fmtDate(d,{day:'numeric',month:'short',year:'numeric'});
const fmtMonthYear=d=>fmtDate(d,{month:'long',year:'numeric'});
function fmtDuration(days){
  if(days<=13)return tn('dur_days',days);
  if(days<60)return tn('dur_weeks',Math.max(2,Math.round(days/7)));
  const m=Math.round(days/30.4);
  if(m<18)return tn('dur_months',m);
  return tn('dur_years',(days/365.25).toFixed(1));
}
const initials=name=>(String(name||'M').trim()||'M').split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();
