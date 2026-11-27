/* ==========================================================================
   My Companion — translation system
   - t('key',{vars})  → text in the current language (falls back to English)
   - tn('key',n,{vars}) → picks the right plural form (Arabic has 6 forms)
   - Uzbek is written in the new Latin alphabet (2026 law); an option
     converts it to the old spelling (Oʻ, Gʻ, Sh, Ch) automatically.
   Translations live in lang/en.js, lang/ar.js, lang/uz.js, lang/ms.js
   ========================================================================== */

const I18N={};                       // filled by the lang/*.js files
const LANGS=[
  {code:'en',name:'English',native:'English',dir:'ltr',locale:'en'},
  {code:'ar',name:'Arabic',native:'العربية',dir:'rtl',locale:'ar'},
  {code:'uz',name:'Uzbek',native:'Özbekça · Oʻzbekcha',dir:'ltr',locale:'uz-Latn'},
  {code:'ms',name:'Malay',native:'Bahasa Melayu',dir:'ltr',locale:'ms'}
];
let LANG='en', UZ_OLD=false;

/* All four languages are live for everyone (Step 11).
   The old "?preview=1" switch is no longer needed; its saved flag is cleaned up. */
const LANG_PREVIEW=true;
try{localStorage.removeItem('hifdh_lang_preview')}catch(e){}

function detectLanguage(){
  const list=(navigator.languages||[navigator.language||'en']).map(x=>String(x).toLowerCase());
  for(const l of list){
    const base=l.split('-')[0];
    if(['ar','uz','ms'].includes(base))return base;
    if(base==='en')return 'en';
  }
  return 'en';
}
const langInfo=code=>LANGS.find(l=>l.code===code)||LANGS[0];

/* New Uzbek alphabet → old spelling */
function uzToOld(s){
  return s
    .replace(/Ö/g,'Oʻ').replace(/ö/g,'oʻ')
    .replace(/Ğ/g,'Gʻ').replace(/ğ/g,'gʻ')
    .replace(/Ş/g,'Sh').replace(/ş/g,'sh')
    .replace(/Ç/g,'Ch').replace(/ç/g,'ch');
}

function fillVars(s,vars){
  if(!vars)return s;
  return s.replace(/\{(\w+)\}/g,(m,k)=>vars[k]!==undefined&&vars[k]!==null?String(vars[k]):m);
}
function finish(s){return (LANG==='uz'&&UZ_OLD)?uzToOld(s):s}

function t(key,vars){
  const pack=I18N[LANG]||{}, en=I18N.en||{};
  let s=pack[key];
  if(s===undefined)s=en[key];
  if(s===undefined)return key;
  return finish(fillVars(String(s),vars));
}
/* Plural-aware: looks for key_one / key_two / key_few / key_many / key_other / key_zero */
function tn(key,n,vars){
  let cat='other';
  try{cat=new Intl.PluralRules(langInfo(LANG).locale).select(Number(n))}catch(e){}
  const pack=I18N[LANG]||{}, en=I18N.en||{};
  const v=Object.assign({n},vars||{});
  const pick=p=>p[key+'_'+cat]!==undefined?p[key+'_'+cat]:p[key+'_other'];
  let s=pick(pack);
  if(s===undefined){
    let ec='other';try{ec=new Intl.PluralRules('en').select(Number(n))}catch(e){}
    s=en[key+'_'+ec]!==undefined?en[key+'_'+ec]:en[key+'_other'];
  }
  if(s===undefined)return key;
  return finish(fillVars(String(s),v));
}
/* Join a list naturally: "A, B & C" / "أ، ب و ج" */
function tList(items){
  if(items.length<=1)return items.join('');
  return items.slice(0,-1).join(t('list_sep'))+t('list_and')+items[items.length-1];
}

/* Apply a language to the whole page (direction, fonts, dates). */
function applyLanguage(s){
  const wanted=LANG_PREVIEW?((s&&s.lang)||detectLanguage()):'en';
  LANG=I18N[wanted]?wanted:'en';
  UZ_OLD=Boolean(s&&s.uzOld);
  const info=langInfo(LANG);
  const changed=document.documentElement.getAttribute('lang')!==LANG||applyLanguage._uz!==UZ_OLD;
  applyLanguage._uz=UZ_OLD;
  document.documentElement.setAttribute('lang',LANG);
  document.documentElement.setAttribute('dir',info.dir);
  if(changed&&typeof buildNav==='function'&&document.getElementById('bottomNav'))buildNav();
}
const isRTL=()=>langInfo(LANG).dir==='rtl';
const curLocale=()=>langInfo(LANG).locale;

/* Surah name in the current language (Arabic script for Arabic). */
function surahName(i){
  if(LANG==='ar'&&typeof QuranData!=='undefined'&&QuranData.Sura[i+1])return QuranData.Sura[i+1][4];
  return SURAH_NAMES[i];
}
