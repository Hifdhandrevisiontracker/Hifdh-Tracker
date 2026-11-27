/* ==========================================================================
   My Companion — Qur'an reader: data layer (Step 13)
   Texts and translations are shown exactly as published — never edited,
   re-ordered or machine-translated. Every file is checked against a SHA-256
   fingerprint of the copy we ship (see QFILES).
   Sources are listed in Settings → About and in the reader's "Text sources".
   ========================================================================== */

const QFILES={
  /* Arabic scripts (Tanzil Project, CC BY 3.0) */
  ar:{file:'data/quran/quran-uthmani.txt',sha:'7f30c647331a61100ebf24a80507dc0fcdd9f2df97f1312b5b2dfcb982a7f326'},
  min:{file:'data/quran/quran-uthmani-min.txt',sha:'ada7b7292b29b543fb608d732f61926e5e1936992573c801bf9d312a67ec1dfe'},
  simple:{file:'data/quran/quran-simple.txt',sha:'b3638f5cf03e2b05e4000efc0e4b656aafb3cf6ed28f8770b6497c5b43c46089'},
  /* Search index only (Tanzil "Simple Clean"): never shown as a reading script */
  clean:{file:'data/quran/quran-simple-clean.txt',sha:'1862ee63c70fbfc6285e0bb0b9587b89beb5b7891109a4d543d9d2cf8283e8c8'},
  /* Indo-Pak script (Digital Khatt IndoPak, Quranic Universal Library / Tarteel) */
  indopak:{file:'data/quran/quran-indopak.txt',sha:'360eb43fbc8ce94e2f53f079ebdb58b19ba886208c760841551a59dfb6dc2b0b'},
  /* Translations */
  en:{file:'data/quran/en.sahih.txt',sha:'a1778a1a56695d9b59ae910809ec46d9f4a55f05961de51cd56e6ebcf9040883',name:'Saheeh International',lang:'en',dir:'ltr'},
  ms:{file:'data/quran/ms.basmeih.txt',sha:'51548b7d7c65f36c4b26b58d81c9c994d96869d06577efb350968968b4ab01b6',name:'Abdullah Muhammad Basmeih',lang:'ms',dir:'ltr'},
  uz:{file:'data/quran/uz.sodik.txt',sha:'6f065883151ef7da3ffff8ab804074e1a219f223397ac788453f5ae62c240d5c',name:'Muhammad Sodik Muhammad Yusuf (Cyrillic)',lang:'uz-Cyrl',dir:'ltr'},
  uzl:{file:'data/quran/uz.sodik-latin.txt',sha:'c4181ad3e976046d1b344e8680dd4754e186b3328ea2fa87b99a7567fea8eda4',name:'Muhammad Sodiq Muhammad Yusuf (Latin)',lang:'uz-Latn',dir:'ltr'}
};
/* The exact Madinah (1421H) page layout, 15 lines per page — Digital Khatt */
const MUSHAF_FILE={file:'data/quran/mushaf-1421.json',sha:'9c1efdd49b15351371a01cdc052478f092f83db404f14def00c38a586df01d94'};
const TR_LIST=['en','ms','uz','uzl'];
const SCRIPT_IDS=['dk','ar','min','simple','indopak'];
const AYAH_TOTAL=6236;
const QTXT={}, QLOAD={};
let MUSHAF=null, MUSHAF_LOAD=null;

/* Position of an ayah in the whole Qur'an (0 … 6235) and back */
const ayahIdx=(s,a)=>QuranData.Sura[s][0]+a-1;
function ayahRef(i){
  let lo=1,hi=114;
  while(lo<hi){const mid=(lo+hi+1)>>1;if(QuranData.Sura[mid][0]<=i)lo=mid;else hi=mid-1}
  return [lo,i-QuranData.Sura[lo][0]+1];
}

function parseTanzil(raw){
  const lines=String(raw).replace(/\r/g,'').split('\n');
  const out=new Array(AYAH_TOTAL);
  let s=1,a=1,n=0;
  for(const ln of lines){
    if(!ln||ln[0]==='#')continue;
    const m=/^(\d+)\|(\d+)\|(.*)$/.exec(ln);
    if(!m)throw new Error('bad line');
    // Every line must be exactly the next ayah, in order — no gaps, no repeats.
    if(Number(m[1])!==s||Number(m[2])!==a)throw new Error('order '+m[1]+':'+m[2]);
    out[n++]=m[3];
    a++; if(a>QuranData.Sura[s][1]){s++;a=1}
  }
  if(n!==AYAH_TOTAL||s!==115)throw new Error('count '+n);
  return out;
}

async function sha256Hex(text){
  if(!(window.crypto&&crypto.subtle))return null;           // very old browsers: structure check only
  const buf=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map(b=>b.toString(16).padStart(2,'0')).join('');
}

/* A copy that fails the check is removed, so "Try again" downloads a fresh one. */
function forgetSavedQFile(file){try{if(window.caches)caches.open('companion-quran-v1').then(c=>c.delete(file)).catch(()=>{})}catch(e){}}

function qErr(kind){const e=new Error(kind);e.kind=kind;return e}
async function fetchChecked(f){
  let res;
  try{res=await fetch(f.file)}catch(e){throw qErr('net')}
  if(!res.ok)throw qErr('net');
  const raw=new TextDecoder('utf-8').decode(await res.arrayBuffer()).replace(/\r/g,'');
  const h=await sha256Hex(raw);
  if(h&&h!==f.sha){forgetSavedQFile(f.file);throw qErr('check')}
  return raw;
}

function loadQText(id){
  if(QTXT[id])return Promise.resolve(QTXT[id]);
  if(QLOAD[id])return QLOAD[id];
  const f=QFILES[id];
  QLOAD[id]=(async()=>{
    const raw=await fetchChecked(f);
    let arr;
    try{arr=parseTanzil(raw)}catch(e){forgetSavedQFile(f.file);throw qErr('check')}
    QTXT[id]=arr;
    return arr;
  })();
  QLOAD[id].catch(()=>{delete QLOAD[id]});
  return QLOAD[id];
}

/* Mushaf pages: 604 pages, each a list of lines.
   "@S<n>" = surah-name line, "@B" = basmala line, "~text" = centred line, otherwise a justified line of words.
   An ayah ends at a word that starts with U+06DD (the ayah-number mark). */
function loadMushaf(){
  if(MUSHAF)return Promise.resolve(MUSHAF);
  if(MUSHAF_LOAD)return MUSHAF_LOAD;
  MUSHAF_LOAD=(async()=>{
    const raw=await fetchChecked(MUSHAF_FILE);
    let d;
    try{
      d=JSON.parse(raw);
      if(!d||d.v!==1||!Array.isArray(d.pages)||d.pages.length!==604)throw new Error('shape');
      let marks=0;
      d.pages.forEach(pg=>pg.forEach(l=>{if(l[0]!=='@')l.replace(/^~/,'').split(' ').forEach(w=>{if(w.charCodeAt(0)===0x06DD)marks++})}));
      if(marks!==AYAH_TOTAL)throw new Error('marks '+marks);
    }catch(e){forgetSavedQFile(MUSHAF_FILE.file);throw qErr('check')}
    MUSHAF=d.pages;
    return MUSHAF;
  })();
  MUSHAF_LOAD.catch(()=>{MUSHAF_LOAD=null});
  return MUSHAF_LOAD;
}
/* The basmala line, taken from the first four words of Al-Fatihah in the Mushaf file */
const mushafBasmala=()=>MUSHAF?MUSHAF[0][1].replace(/^~/,'').split(' ').slice(0,4).join(' '):'';

/* The basmala that opens surahs 2–114 (except 9) is the start of ayah 1 in the
   Tanzil files. We show it on its own line, using the exact words from the file.
   It is recognised by comparing with the first four words of Al-Fatihah in the same file. */
function splitBasmala(s,text,scriptId){
  if(s===1||s===9||scriptId==='indopak')return {basmala:'',rest:text};
  const ref=QTXT[scriptId||'ar'];
  const w=text.split(' ');
  if(ref&&w.length>4){
    const f=ref[0].split(' ');
    if(w[1]===f[1]&&w[2]===f[2]&&w[3]===f[3])return {basmala:w.slice(0,4).join(' '),rest:w.slice(4).join(' ')};
  }
  return {basmala:'',rest:text};
}

/* All ayahs printed on a Madinah page (1421H page data) */
function ayahsOnPage(p){
  const P=QuranData.Page, out=[];
  let [s,a]=P[p];
  const [es,ea]=P[p+1]||[115,1];
  while(s<es||(s===es&&a<ea)){
    out.push([s,a]);
    a++; if(a>QuranData.Sura[s][1]){s++;a=1}
    if(s>114)break;
  }
  return out;
}

const AR_DIGITS='٠١٢٣٤٥٦٧٨٩';
const arNum=n=>String(n).replace(/\d/g,d=>AR_DIGITS[d]);

/* ------------------------------ Reader state ------------------------------ */
const RD_DEF_TR={en:['en'],ms:['ms'],uz:['uzl'],ar:[]};
let RD=null;
function rdState(){
  if(RD)return RD;
  const S=ld('hifdh_reader2',null)||{}, old=ld('hifdh_reader',{})||{};
  let trs=Array.isArray(S.trs)?S.trs.filter(x=>TR_LIST.includes(x)):null;
  if(!trs)trs=TR_LIST.includes(old.tr)?[old.tr]:(RD_DEF_TR[LANG]||[]).slice();
  RD={
    page:Math.min(604,Math.max(1,Number(S.page)||Number(old.page)||1)),
    script:SCRIPT_IDS.includes(S.script)?S.script:'dk',
    view:S.view==='list'?'list':'page',
    trs,
    size:Math.min(5,Math.max(1,Number(S.size)||Number(old.size)||3)),
    night:Boolean(S.night),
    turn:S.turn==='book'?'book':'mushaf',
    test:false, shown:new Set(), hint:new Set(),
    sel:null, focus:null, ui:true, errs:{}
  };
  return RD;
}
function rdSave(){const r=rdState();sv('hifdh_reader2',{page:r.page,script:r.fbFrom||r.script,view:r.view,trs:r.trs,size:r.size,night:r.night,turn:r.turn})}

/* The script used for flowing text (everything except the exact Mushaf pages) */
const flowScript=r=>r.script==='dk'?'ar':r.script;

/* ------------------------------ Bookmarks --------------------------------- */
function bmLoad(){
  const a=ld('hifdh_bookmarks',[]);
  return Array.isArray(a)?a.filter(x=>x&&Number.isInteger(x.i)&&x.i>=0&&x.i<AYAH_TOTAL):[];
}
const bmHas=i=>bmLoad().some(x=>x.i===i);
function bmToggle(i){
  let a=bmLoad();
  const had=a.some(x=>x.i===i);
  a=had?a.filter(x=>x.i!==i):[{i,at:Date.now()}].concat(a);
  sv('hifdh_bookmarks',a);
  return !had;
}

/* ------------------------------ Search ------------------------------------ */
const AR_STRIP=/[ؐ-ًؚ-ٰٟۖ-ۭـ‌-‏‪-‮]/g;
function arNorm(s){
  return String(s).replace(AR_STRIP,'')
    .replace(/[آأإٱ]/g,'ا').replace(/[ىی]/g,'ي')
    .replace(/ة/g,'ه').replace(/ک/g,'ك').replace(/\s+/g,' ').trim();
}
let RD_IDX=null;
function searchIndex(){
  if(RD_IDX||!QTXT.clean)return RD_IDX;
  RD_IDX=QTXT.clean.map((txt,i)=>{
    const [s,a]=ayahRef(i);
    const w=txt.split(' ');
    // The basmala is written at the start of ayah 1 in the file; leave it out so searching "الله" doesn't match every surah opening.
    const body=(a===1&&s!==1&&s!==9&&w.length>4)?w.slice(4).join(' '):txt;
    return arNorm(body);
  });
  return RD_IDX;
}
/* Returns {jump:{s,a?}|null, surahs:[s…], hits:[ayahIndex…], total} */
function searchQuran(query){
  const q0=String(query||'').trim();
  const out={jump:null,surahs:[],hits:[],total:0};
  if(!q0)return out;
  const m=/^(\d{1,3})\s*[:.\-]\s*(\d{1,3})$/.exec(q0);
  if(m){
    const s=+m[1],a=+m[2];
    if(s>=1&&s<=114&&a>=1&&a<=QuranData.Sura[s][1])out.jump={s,a};
    return out;
  }
  if(/^\d{1,3}$/.test(q0)){const s=+q0;if(s>=1&&s<=114)out.surahs.push(s);return out}
  const lo=q0.toLowerCase();
  if(/[a-zÀ-ɏ’'ʻ`]/i.test(q0)&&!/[؀-ۿ]/.test(q0)){
    const plain=x=>String(x).toLowerCase().replace(/[’'ʻ`\-\s]/g,'');
    const key=plain(lo);
    for(let i=0;i<114;i++){
      if(plain(SURAH_NAMES[i]).includes(key)||plain(surahName(i)).includes(key))out.surahs.push(i+1);
    }
    return out;
  }
  const idx=searchIndex();
  if(!idx)return out;
  const norm=arNorm(q0);
  if(!norm)return out;
  const toks=norm.split(' ').filter(Boolean);
  for(let i=0;i<114;i++){if(arNorm(QuranData.Sura[i+1][4]).includes(norm))out.surahs.push(i+1)}
  const phrase=[],all=[];
  for(let i=0;i<idx.length;i++){
    const t=idx[i];
    if(t.includes(norm))phrase.push(i);
    else if(toks.length>1&&toks.every(k=>t.includes(k)))all.push(i);
  }
  out.hits=phrase.concat(all);
  out.total=out.hits.length;
  return out;
}

/* ------------------------------ Selecting / opening ----------------------- */
/* Open the reader at a page (from Today, Tools, quiz or the Go-to sheet).
   focus = an ayah index to highlight, or null. */
let RD_RET=null,RD_OPENING=false;
function openReader(p,focus){
  const r=rdState();
  if(p)r.page=Math.min(604,Math.max(1,Number(p)||1));
  r.focus=(typeof focus==='number')?focus:null;
  r.sel=r.focus;r.shown=new Set();r.hint=new Set();
  rdSave();
  RD_RET=(TAB!=='quran')?TAB:null;      // remember where to go back to (quiz, Today …)
  RD_OPENING=true;
  try{if(TAB==='quran')rQuran();else setTab('quran')}finally{RD_OPENING=false}
}
function rdBack(){const t=RD_RET||'today';RD_RET=null;setTab(t)}
function rdGo(p,focus){closeModal();openReader(p,focus)}
