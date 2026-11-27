/* ==========================================================================
   My Companion — Qur'an index (pages, juz, hizb, surahs)
   All positions are computed from Tanzil metadata (data/quran-data.js,
   © Tanzil.net, Creative Commons Attribution 3.0) for the Madani Mushaf.
   ========================================================================== */

const TOTAL=604;

/* Page on which a given ayah appears (Madani Mushaf). */
function pageOfAyah(sura,aya){
  const P=QuranData.Page;
  let lo=1,hi=TOTAL;
  while(lo<hi){
    const mid=(lo+hi+1)>>1;
    const [ps,pa]=P[mid];
    if(ps<sura||(ps===sura&&pa<=aya))lo=mid;else hi=mid-1;
  }
  return lo;
}

/* English transliterated surah names used across the app (index 0 = Surah 1). */
const SURAH_NAMES=["Al-Fatihah","Al-Baqarah","Ali 'Imran","An-Nisa","Al-Ma'idah","Al-An'am","Al-A'raf","Al-Anfal","At-Tawbah","Yunus","Hud","Yusuf","Ar-Ra'd","Ibrahim","Al-Hijr","An-Nahl","Al-Isra","Al-Kahf","Maryam","Ta-Ha","Al-Anbiya","Al-Hajj","Al-Mu'minun","An-Nur","Al-Furqan","Ash-Shu'ara","An-Naml","Al-Qasas","Al-'Ankabut","Ar-Rum","Luqman","As-Sajdah","Al-Ahzab","Saba","Fatir","Ya-Sin","As-Saffat","Sad","Az-Zumar","Ghafir","Fussilat","Ash-Shura","Az-Zukhruf","Ad-Dukhan","Al-Jathiyah","Al-Ahqaf","Muhammad","Al-Fath","Al-Hujurat","Qaf","Adh-Dhariyat","At-Tur","An-Najm","Al-Qamar","Ar-Rahman","Al-Waqi'ah","Al-Hadid","Al-Mujadila","Al-Hashr","Al-Mumtahanah","As-Saff","Al-Jumu'ah","Al-Munafiqun","At-Taghabun","At-Talaq","At-Tahrim","Al-Mulk","Al-Qalam","Al-Haqqah","Al-Ma'arij","Nuh","Al-Jinn","Al-Muzzammil","Al-Muddaththir","Al-Qiyamah","Al-Insan","Al-Mursalat","An-Naba","An-Nazi'at","'Abasa","At-Takwir","Al-Infitar","Al-Mutaffifin","Al-Inshiqaq","Al-Buruj","At-Tariq","Al-A'la","Al-Ghashiyah","Al-Fajr","Al-Balad","Ash-Shams","Al-Layl","Ad-Duhaa","Ash-Sharh","At-Tin","Al-'Alaq","Al-Qadr","Al-Bayyinah","Az-Zalzalah","Al-'Adiyat","Al-Qari'ah","At-Takathur","Al-'Asr","Al-Humazah","Al-Fil","Quraysh","Al-Ma'un","Al-Kawthar","Al-Kafirun","An-Nasr","Al-Masad","Al-Ikhlas","Al-Falaq","An-Nas"];

/* JUZ_START[j] = first page of juz j (index 0 unused). */
const JUZ_START=(()=>{
  const out=[0];
  for(let j=1;j<=30;j++){const [s,a]=QuranData.Juz[j];out.push(pageOfAyah(s,a))}
  return out;
})();

/* SURAH_AT_PAGE[i] = [startPage, name]; SURAH_END[i] = last page of surah i+1. */
const SURAH_AT_PAGE=SURAH_NAMES.map((nm,i)=>{
  const e=[pageOfAyah(i+1,1)];
  Object.defineProperty(e,1,{get:()=>surahName(i),enumerable:true});   // name follows the app language
  return e;
});
const SURAH_END=SURAH_NAMES.map((_,i)=>{
  if(i===113)return TOTAL;
  const next=pageOfAyah(i+2,1);
  const [ps,pa]=QuranData.Page[next];
  return (ps===i+2&&pa===1)?next-1:next;   // next surah starts at the top of its page
});

/* HS[n-1] = first page of hizb n (60 hizb). */
const HS=(()=>{
  const out=[];
  for(let n=1;n<=60;n++){const [s,a]=QuranData.HizbQaurter[4*(n-1)+1];out.push(pageOfAyah(s,a))}
  return out;
})();

const SURAH_AYAHS=SURAH_NAMES.map((_,i)=>QuranData.Sura[i+1][1]);

/* ---------------------------- Lookups --------------------------------- */
const juzEnd=j=>j===30?TOTAL:JUZ_START[j+1]-1;
function juzOf(p){const pg=Math.max(1,Math.ceil(p));for(let j=30;j>=1;j--)if(pg>=JUZ_START[j])return j;return 1}
function surahIdxOf(p){const pg=Math.max(1,Math.ceil(p));let idx=0;for(let i=0;i<SURAH_AT_PAGE.length;i++){if(pg>=SURAH_AT_PAGE[i][0])idx=i;else break}return idx}
const surahOf=p=>SURAH_AT_PAGE[surahIdxOf(p)][1];
const hzFirst=p=>Math.max(1,HS.filter(x=>x<p).length);
const hzLast=p=>Math.max(1,HS.filter(x=>x<=p).length);
function juzSurahRange(j){
  const s1=surahOf(JUZ_START[j]), s2=surahOf(juzEnd(j));
  return s1===s2?s1:`${s1} – ${s2}`;
}

/* --------------------- Memorization sequences ------------------------- */
const SEQ=(()=>{
  const fwd=[], page_rev=[], juz_rev=[];
  for(let p=1;p<=TOTAL;p++)fwd.push(p);
  for(let p=TOTAL;p>=1;p--)page_rev.push(p);
  for(let j=30;j>=1;j--)for(let p=JUZ_START[j];p<=juzEnd(j);p++)juz_rev.push(p);
  return{fwd,juz_rev,page_rev};
})();
const validOrder=o=>['fwd','juz_rev','page_rev'].includes(o)?o:'fwd';
const seqOf=ord=>SEQ[validOrder(ord)];
const hLbl=(ord,u)=>t(ord==='page_rev'?(u%2===1?'half_2':'half_1'):(u%2===1?'half_1':'half_2'));
function pageAtUnit(ord,u){
  const seq=seqOf(ord);
  const idx=Math.max(0,Math.min(TOTAL-1,Math.ceil(u/2)-1));
  return seq[idx];
}
function pagesInUnits(ord,u1,u2){
  const seq=seqOf(ord);
  const s1=Math.max(1,Math.ceil(u1/2)), s2=Math.min(TOTAL,Math.ceil(u2/2));
  const out=[];
  for(let k=s1;k<=s2;k++)out.push(seq[k-1]);
  return out;
}
function rangeArr(a,b){
  const out=[], lo=Math.max(1,Math.min(a,b)), hi=Math.min(TOTAL,Math.max(a,b));
  for(let p=lo;p<=hi;p++)out.push(p);
  return out;
}
/* "12–15, 20" — numbers only */
function pageRunsText(pages){
  if(!pages||!pages.length)return '';
  if(pages.length===1)return String(pages[0]);
  const runs=[];
  let start=pages[0], prev=pages[0], dir=0;
  for(let i=1;i<pages.length;i++){
    const cur=pages[i], step=cur-prev;
    if((step===1||step===-1)&&(dir===0||dir===step)){dir=step;prev=cur}
    else{runs.push({start,end:prev,dir});start=cur;prev=cur;dir=0}
  }
  runs.push({start,end:prev,dir});
  return runs.map(r=>r.start===r.end?String(r.start):(r.dir===-1?`${r.start}→${r.end}`:`${r.start}–${r.end}`)).join(t('list_sep'));
}
/* "Page 12" / "Pages 12–15" in the current language */
function fmtPageList(pages){
  if(!pages||!pages.length)return '';
  return t(pages.length===1?'page_one':'page_other',{list:pageRunsText(pages)});
}
function rngUnits(u1,u2,useHalf,ord='fwd'){
  const o=validOrder(ord);
  if(!useHalf)return fmtPageList(pagesInUnits(o,u1,u2));
  const p1=pageAtUnit(o,u1), p2=pageAtUnit(o,u2);
  if(u1===u2)return t('page_one',{list:`${p1} ${hLbl(o,u1)}`});
  if(u1%2===1&&u2===u1+1)return t('page_one',{list:`${p1} (${hLbl(o,u1)}–${hLbl(o,u2)})`});
  if(u1%2===1&&u2%2===0)return fmtPageList(pagesInUnits(o,u1,u2));
  return t('page_other',{list:`${p1} ${hLbl(o,u1)} → ${p2} ${hLbl(o,u2)}`});
}
function juzCountToPages(j,ord){
  const n=Math.max(0,Math.min(30,Math.floor(Number(j)||0)));
  if(n<=0)return 0;
  if(n>=30)return TOTAL;
  return validOrder(ord)==='fwd'?juzEnd(n):(TOTAL-JUZ_START[31-n]+1);
}
function seqJuzPages(s){
  const lim=Math.min(TOTAL,Math.ceil(s.frontier||0));
  if(lim<1)return[];
  const seq=seqOf(s.order), map=new Map();
  for(let k=0;k<lim;k++){
    const p=seq[k], j=juzOf(p);
    if(!map.has(j))map.set(j,[]);
    map.get(j).push(p);
  }
  return Array.from(map,([j,pages])=>({j,pages}));
}
function nextSeqPage(s){
  const seq=seqOf(s.order);
  const idx=Math.min(TOTAL-1,Math.floor(s.frontier||0));
  return seq[idx];
}
function locLabelPages(pages){
  if(!pages||!pages.length)return '';
  const pSet=new Set(pages);
  const nm=[], jList=[], hList=[];
  const seenS=new Set(), seenJ=new Set(), seenH=new Set();
  pages.forEach(p=>{
    const j=juzOf(p);if(!seenJ.has(j)){seenJ.add(j);jList.push(j)}
    const h=hzLast(p);if(!seenH.has(h)){seenH.add(h);hList.push(h)}
  });
  SURAH_AT_PAGE.forEach((x,i)=>{
    for(let p=x[0];p<=SURAH_END[i];p++){
      if(pSet.has(p)){if(!seenS.has(i)){seenS.add(i);nm.push(x[1])}break}
    }
  });
  const sur=nm.length===1?t('surah_one',{name:nm[0]}):nm.length<=3?t('surahs_few',{list:tList(nm)}):t('surahs_range',{a:nm[0],b:nm[nm.length-1]});
  const jTxt=jList.length===1?String(jList[0]):`${jList[0]}–${jList[jList.length-1]}`;
  const hTxt=hList.length===1?String(hList[0]):`${hList[0]}–${hList[hList.length-1]}`;
  return t('loc_label',{surah:sur,juz:t('juz_n',{n:jTxt}),hizb:t('hizb_n',{n:hTxt})});
}
