const JUZ_START=[0,1,22,42,62,82,102,122,142,162,182,202,222,242,262,282,302,322,342,362,382,402,422,442,462,482,502,522,542,562,582];
const SURAH_AT_PAGE=[
  [1,"Al-Fatihah"],[2,"Al-Baqarah"],[50,"Ali 'Imran"],[77,"An-Nisa"],[106,"Al-Ma'idah"],[128,"Al-An'am"],
  [151,"Al-A'raf"],[177,"Al-Anfal"],[187,"At-Tawbah"],[208,"Yunus"],[221,"Hud"],[235,"Yusuf"],
  [249,"Ar-Ra'd"],[255,"Ibrahim"],[262,"Al-Hijr"],[267,"An-Nahl"],[282,"Al-Isra"],[293,"Al-Kahf"],
  [305,"Maryam"],[312,"Ta-Ha"],[322,"Al-Anbiya"],[332,"Al-Hajj"],[342,"Al-Mu'minun"],[350,"An-Nur"],
  [359,"Al-Furqan"],[367,"Ash-Shu'ara"],[377,"An-Naml"],[385,"Al-Qasas"],[396,"Al-'Ankabut"],[404,"Ar-Rum"],
  [411,"Luqman"],[415,"As-Sajdah"],[418,"Al-Ahzab"],[428,"Saba"],[434,"Fatir"],[440,"Ya-Sin"],
  [446,"As-Saffat"],[453,"Sad"],[458,"Az-Zumar"],[467,"Ghafir"],[477,"Fussilat"],[483,"Ash-Shura"],
  [489,"Az-Zukhruf"],[496,"Ad-Dukhan"],[499,"Al-Jathiyah"],[502,"Al-Ahqaf"],[507,"Muhammad"],[511,"Al-Fath"],
  [515,"Al-Hujurat"],[518,"Qaf"],[520,"Adh-Dhariyat"],[523,"At-Tur"],[526,"An-Najm"],[528,"Al-Qamar"],
  [531,"Ar-Rahman"],[534,"Al-Waqi'ah"],[537,"Al-Hadid"],[542,"Al-Mujadila"],[545,"Al-Hashr"],[549,"Al-Mumtahanah"],
  [551,"As-Saff"],[553,"Al-Jumu'ah"],[554,"Al-Munafiqun"],[556,"At-Taghabun"],[558,"At-Talaq"],[560,"At-Tahrim"],
  [562,"Al-Mulk"],[564,"Al-Qalam"],[566,"Al-Haqqah"],[568,"Al-Ma'arij"],[570,"Nuh"],[572,"Al-Jinn"],
  [574,"Al-Muzzammil"],[575,"Al-Muddaththir"],[577,"Al-Qiyamah"],[578,"Al-Insan"],[580,"Al-Mursalat"],
  [582,"An-Naba"],[583,"An-Nazi'at"],[585,"'Abasa"],[586,"At-Takwir"],[587,"Al-Infitar"],[587,"Al-Mutaffifin"],
  [589,"Al-Inshiqaq"],[590,"Al-Buruj"],[591,"At-Tariq"],[591,"Al-A'la"],[592,"Al-Ghashiyah"],[593,"Al-Fajr"],
  [594,"Al-Balad"],[595,"Ash-Shams"],[595,"Al-Layl"],[596,"Ad-Duhaa"],[596,"Ash-Sharh"],[597,"At-Tin"],
  [597,"Al-'Alaq"],[598,"Al-Qadr"],[598,"Al-Bayyinah"],[599,"Az-Zalzalah"],[599,"Al-'Adiyat"],[600,"Al-Qari'ah"],
  [600,"At-Takathur"],[601,"Al-'Asr"],[601,"Al-Humazah"],[601,"Al-Fil"],[602,"Quraysh"],[602,"Al-Ma'un"],
  [602,"Al-Kawthar"],[603,"Al-Kafirun"],[603,"An-Nasr"],[603,"Al-Masad"],[604,"Al-Ikhlas"],[604,"Al-Falaq"],[604,"An-Nas"]
];
const TOTAL=604;
const HS=[1,11,22,32,42,51,62,72,82,92,102,112,121,132,142,151,162,173,182,192,201,212,222,231,242,252,262,272,282,292,302,312,322,332,342,352,362,371,382,392,402,413,422,431,442,451,462,472,482,491,502,513,522,531,542,553,562,572,582,591];
const SURAH_END=[1,49,76,106,127,150,176,186,207,221,235,248,255,261,267,281,293,304,312,321,331,341,349,359,366,376,385,396,404,410,414,417,427,434,440,445,452,458,467,476,482,489,495,498,502,506,510,515,517,520,523,525,528,531,534,537,541,545,548,551,552,554,555,557,559,561,564,566,568,570,571,573,575,577,578,580,581,583,584,585,586,587,589,589,590,591,592,592,594,594,595,596,596,596,597,597,598,599,599,600,600,600,601,601,601,602,602,602,603,603,603,604,604,604];
const DEFAULTS={
  seenIntro:false,onboarded:false,name:'',avatar:'',email:'',
  mode:'both',method:'tikrar',order:'fwd',
  frontier:0,newPerDay:1,revPerDay:1,sabakPages:5,
  chunks:[5,10,15,0],cycle:0,juz:1,period:1,
  tourDay:1,tourNum:1,
  theme:'light',color:'emerald',
  tasbihMode:'ayah',tasbihPhrase:'SubḥānAllāh',
  tasbih:0,tasbihTarget:40,tasbihTotal:0,tasbihTheme:'emerald',
  folders:['Tajweed Lessons','Mutashabihat','Tafsir & Reflections'],
  libFilter:'All',libSubTab:'notes',lastBackup:'',aiKey:'',uiText:'m',uiCard:'m',pst:'',afterLast:'keep'
};

const pad=n=>String(n).padStart(2,'0');
const T=()=>{const d=new Date();return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())};
let SELECTED_JUZ=null, D=null, DR=null, TAB='today', OB_SLIDE=0, T_MENU=false, EDIT_NOTE_ID=null, SHOW_COMPOSER=false, RENDER_SEQ=0;
let mediaRec=null, recChunks=[], isRecording=false, audioDevices=[], selectedMic='', selectedMime='';
const ACTIVE_URLS=new Map();
const $=id=>document.getElementById(id);
const LS=window.localStorage;
function ld(k,d){try{const v=LS.getItem(k);return v?JSON.parse(v):d}catch(e){return d}}
function sv(k,v){try{LS.setItem(k,JSON.stringify(v))}catch(e){if($('msg'))$('msg').textContent='Storage limit: '+e.message}}

function ensureData(){if(!D)D=api.getData(T());return D}
function getObjUrl(key,blob){
  const prev=ACTIVE_URLS.get(key);
  if(prev && prev.blob===blob)return prev.url;
  if(prev)URL.revokeObjectURL(prev.url);
  const url=URL.createObjectURL(blob);
  ACTIVE_URLS.set(key,{blob,url});
  return url;
}
function revokeObjUrl(key){
  const entry=ACTIVE_URLS.get(key);
  if(entry){URL.revokeObjectURL(entry.url);ACTIVE_URLS.delete(key)}
}

function safeExternalUrl(raw){
  if(!raw)return null;
  try{
    const u=new URL(String(raw).trim());
    return (u.protocol==='https:'||u.protocol==='http:')?u.href:null;
  }catch(e){return null}
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
          if(n.startsWith('on')||n==='srcdoc'){ch.removeAttribute(attr.name);return}
          if(tag==='A'){
            if(n==='href'){
              const ok=safeExternalUrl(attr.value);
              if(ok)ch.setAttribute('href',ok);else ch.removeAttribute('href');
            }else if(n!=='target'&&n!=='rel'){ch.removeAttribute(attr.name)}
          }else if(tag==='IMG'){
            if(n==='src'){
              const v=attr.value.trim();
              if(!(/^data:image\/(png|jpe?g|gif|webp);base64,/i.test(v)||safeExternalUrl(v)))ch.removeAttribute('src');
            }else if(n!=='alt'&&n!=='style'){ch.removeAttribute(attr.name)}
          }else if(tag==='FONT'){
            if(n!=='face'&&n!=='size'&&n!=='color')ch.removeAttribute(attr.name);
          }else if(n!=='style'){ch.removeAttribute(attr.name)}
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

const juzEnd=j=>j===30?TOTAL:JUZ_START[j+1]-1;
function juzOf(p){const pg=Math.max(1,Math.ceil(p));for(let j=30;j>=1;j--)if(pg>=JUZ_START[j])return j;return 1}
function surahIdxOf(p){const pg=Math.max(1,Math.ceil(p));let idx=0;for(let i=0;i<SURAH_AT_PAGE.length;i++){if(pg>=SURAH_AT_PAGE[i][0])idx=i;else break}return idx}
const surahOf=p=>SURAH_AT_PAGE[surahIdxOf(p)][1];

/* ---------- Direction & Sequence Mapping (Forward / Juz Reverse / Page Reverse) ---------- */
const SEQ=(()=>{
  const fwd=[], page_rev=[], juz_rev=[];
  for(let p=1;p<=TOTAL;p++)fwd.push(p);
  for(let p=TOTAL;p>=1;p--)page_rev.push(p);
  for(let j=30;j>=1;j--)for(let p=JUZ_START[j];p<=juzEnd(j);p++)juz_rev.push(p);
  return{fwd,juz_rev,page_rev};
})();
const validOrder=o=>['fwd','juz_rev','page_rev'].includes(o)?o:'fwd';
const seqOf=ord=>SEQ[validOrder(ord)];
const hLbl=(ord,u)=>ord==='page_rev'?(u%2===1?'h2':'h1'):(u%2===1?'h1':'h2');
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
function fmtPageList(pages){
  if(!pages||!pages.length)return '';
  if(pages.length===1)return 'Page '+pages[0];
  const runs=[];
  let start=pages[0], prev=pages[0], dir=0;
  for(let i=1;i<pages.length;i++){
    const cur=pages[i], step=cur-prev;
    if((step===1||step===-1)&&(dir===0||dir===step)){dir=step;prev=cur}
    else{runs.push({start,end:prev,dir});start=cur;prev=cur;dir=0}
  }
  runs.push({start,end:prev,dir});
  return 'Pages '+runs.map(r=>r.start===r.end?String(r.start):(r.dir===-1?`${r.start}→${r.end}`:`${r.start}–${r.end}`)).join(', ');
}
function rngUnits(u1,u2,useHalf,ord='fwd'){
  const o=validOrder(ord);
  if(!useHalf)return fmtPageList(pagesInUnits(o,u1,u2));
  const p1=pageAtUnit(o,u1), p2=pageAtUnit(o,u2);
  if(u1===u2)return `Page ${p1} ${hLbl(o,u1)}`;
  if(u1%2===1 && u2===u1+1)return `Page ${p1} (${hLbl(o,u1)}–${hLbl(o,u2)})`;
  if(u1%2===1 && u2%2===0)return fmtPageList(pagesInUnits(o,u1,u2));
  return `Pages ${p1} ${hLbl(o,u1)} → ${p2} ${hLbl(o,u2)}`;
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

/*STRENGTH*/
const hzFirst=p=>Math.max(1,HS.filter(x=>x<p).length);
const hzLast=p=>Math.max(1,HS.filter(x=>x<=p).length);
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
  const sur=nm.length===1?'Surah '+nm[0]:nm.length<=3?'Surahs '+nm.slice(0,-1).join(', ')+' & '+nm[nm.length-1]:'Surahs '+nm[0]+' to '+nm[nm.length-1];
  const jTxt=jList.length===1?String(jList[0]):`${jList[0]}–${jList[jList.length-1]}`;
  const hTxt=hList.length===1?String(hList[0]):`${hList[0]}–${hList[hList.length-1]}`;
  return `${sur}, Juz ${jTxt}, Hizb ${hTxt}`;
}
function syncPst(s){
  if(typeof s.pst==='string'&&s.pst.length===TOTAL)return;
  const t=new Array(TOTAL).fill('0'), seq=seqOf(s.order), lim=Math.min(TOTAL,Math.ceil(s.frontier||0));
  for(let i=0;i<lim;i++)t[seq[i]-1]='s';
  s.pst=t.join('');
}
function markSeq(s,stepA,stepB,ch,onlyEmpty){
  const seq=seqOf(s.order), t=s.pst.split('');
  for(let k=Math.max(1,stepA);k<=Math.min(TOTAL,stepB);k++){
    const p=seq[k-1];
    if(!onlyEmpty||t[p-1]==='0')t[p-1]=ch;
  }
  s.pst=t.join('');
}
function isPureSeqPst(s,ord,steps){
  const expected=new Array(TOTAL).fill('0'), seq=seqOf(ord);
  for(let k=0;k<Math.min(TOTAL,steps);k++)expected[seq[k]-1]='s';
  return s.pst===expected.join('');
}
const memCount=s=>{const c=pstCount(s,1,TOTAL);return c.g+c.w};
function pstCount(s,a,b){let g=0,w=0;for(let p=a;p<=b;p++){const c=s.pst[p-1];if(c==='s')g++;else if(c==='w')w++}return{g,w,n:b-a+1}}
function completedJuzCount(s){
  let n=0;
  for(let j=1;j<=30;j++){const c=pstCount(s,JUZ_START[j],juzEnd(j));if(c.g+c.w>=c.n)n++}
  return n;
}
const stkInner=(g,w,n)=>`<i class="g" style="width:${g/n*100}%"></i><i class="w" style="width:${w/n*100}%"></i>`;
function surahState(s,i){const c=pstCount(s,SURAH_AT_PAGE[i][0],SURAH_END[i]);if(c.g+c.w===0)return'none';if(c.g+c.w<c.n)return'part';return c.w?'weak':'strong'}
function setStrength(a,b,ch,all){const s=loadState();const t=s.pst.split('');for(let p=a;p<=b;p++)if(all||t[p-1]!=='0')t[p-1]=ch;s.pst=t.join('');saveState(s);DR=null;D=null;render()}
function clearSurah(i){if(!confirm('Remove '+SURAH_AT_PAGE[i][1]+' from your memorized pages?'))return;setStrength(SURAH_AT_PAGE[i][0],SURAH_END[i],'0',true)}
function toggleSurah(i){const s=loadState();const c=pstCount(s,SURAH_AT_PAGE[i][0],SURAH_END[i]);if(c.g+c.w===0){setStrength(SURAH_AT_PAGE[i][0],SURAH_END[i],'w',true);return}setStrength(SURAH_AT_PAGE[i][0],SURAH_END[i],c.w>0?'s':'w')}
function selectJuz(j){
  SELECTED_JUZ=(SELECTED_JUZ===j)?null:j;
  render();
  if(SELECTED_JUZ){
    setTimeout(()=>{const el=$('juzInspector');if(el)el.scrollIntoView({behavior:'smooth',block:'nearest'})},40);
  }
}
const CHC={strong:'s',weak:'w',part:'p',none:''},CHL={strong:'✓ Strong',weak:'Weak',part:'In progress',none:'+ Add'};
function strengthCard(s){
  const hasReal=memCount(s)>0;
  const all=hasReal?pstCount(s,1,TOTAL):{g:314,w:54,n:TOTAL};
  const sPct=Math.round(all.g/TOTAL*100), wPct=Math.round(all.w/TOTAL*100), nyPct=Math.max(0,100-sPct-wPct);

  const sampleWeak=new Set([13,15,16]), sampleStrong=new Set([1,2,3,4,5,6,7,8,9,10,11,12,14,30]);
  let gridTiles='';
  for(let j=1;j<=30;j++){
    let cls='';
    if(hasReal){
      const c=pstCount(s,JUZ_START[j],juzEnd(j));
      if(c.w>0)cls='st-weak';
      else if(c.g>=c.n)cls='st-strong';
      else if(c.g>0)cls='st-part';
    }else{
      if(sampleWeak.has(j))cls='st-weak';
      else if(sampleStrong.has(j))cls='st-strong';
    }
    if(SELECTED_JUZ===j)cls+=(cls?' ':'')+'sel';
    gridTiles+=`<div class="jtile ${cls}" onclick="selectJuz(${j})" title="Juz ${j}">${j}</div>`;
  }

  let inspector='';
  if(SELECTED_JUZ){
    const j=SELECTED_JUZ, a=JUZ_START[j], b=juzEnd(j), c=pstCount(s,a,b);
    const idxs=SURAH_AT_PAGE.map((x,i)=>i).filter(i=>SURAH_AT_PAGE[i][0]<=b&&SURAH_END[i]>=a);
    const body=idxs.map(i=>{
      const st=surahState(s,i);
      const p1=SURAH_AT_PAGE[i][0], p2=SURAH_END[i];
      const spans=(p1<a||p2>b)?`<span class="mu">Pages ${p1}–${p2}</span>`:'';
      return `<div class="sr"><div><b>${esc(SURAH_AT_PAGE[i][1])}</b>${spans}</div><span style="display:flex;gap:6px"><button class="chip ${CHC[st]}" onclick="toggleSurah(${i})">${CHL[st]}</button>${st!=='none'?`<button class="chip x" aria-label="Remove" onclick="clearSurah(${i})">✕</button>`:''}</span></div>`;
    }).join('');
    inspector=`<div class="card" id="juzInspector">
      <div class="row">
        <div><h2 style="margin:0">Juz ${j} · Pages ${a}–${b}</h2><div class="mu">Strong ${c.g} · Weak ${c.w} · Remaining ${c.n-c.g-c.w} pages</div></div>
        <button class="g sm" onclick="selectJuz(${j})">✕</button>
      </div>
      <div class="sbar" style="margin:10px 0 12px">${stkInner(c.g,c.w,c.n)}</div>
      <div class="row" style="gap:6px;flex-wrap:wrap;justify-content:flex-start;margin-bottom:10px">
        <button class="sm" onclick="setStrength(${a},${b},'s',true)">Whole juz strong</button>
        <button class="g sm" onclick="setStrength(${a},${b},'w',true)">Whole juz weak</button>
        ${c.g+c.w>0?`<button class="g sm" onclick="if(confirm('Clear memorized marks for Juz ${j}?'))setStrength(${a},${b},'0',true)">Clear juz</button>`:''}
      </div>
      ${body}
    </div>`;
  }

  const juzDone=completedJuzCount(s);
  return `<div class="card">
    <div class="row"><h2 style="margin:0">Memory strength</h2>${!hasReal?'<span class="pill">Sample data</span>':`<span class="pill">${all.g+all.w}/${TOTAL}p · ${juzDone}/30 Juz</span>`}</div>
    <div class="sbar" style="margin:12px 0 10px">${stkInner(all.g,all.w,TOTAL)}</div>
    <div class="row mu" style="justify-content:flex-start;gap:14px;flex-wrap:wrap">
      <span>Strong ${sPct}%</span>
      <span>Weak ${wPct}%</span>
      <span>Not yet ${nyPct}%</span>
    </div>
  </div>
  <div class="card">
    <div class="row"><h2 style="margin:0">Juz</h2>${!hasReal?'<span class="pill">Sample data</span>':''}</div>
    <div class="juz30-grid">${gridTiles}</div>
    <div class="mu" style="margin-top:12px">Tap a juz to see its surahs and mark them weak or strong.</div>
  </div>${inspector}`;
}
/*END*/

function juzSurahRange(j){
  const s1=surahOf(JUZ_START[j]), s2=surahOf(juzEnd(j));
  return s1===s2?s1:`${s1} – ${s2}`;
}

const loadState=()=>{
  const raw=ld('hifdh_state',{});
  if(raw&&raw.frontier!==undefined&&!raw.pst&&!LS.getItem('hifdh_backup_pre_strength'))sv('hifdh_backup_pre_strength',raw);
  const s=Object.assign({},DEFAULTS,raw);
  if(!['tikrar','ottoman','simple'].includes(s.method))s.method='simple';
  s.order=validOrder(s.order);
  if(!Array.isArray(s.chunks)||!s.chunks.length)s.chunks=s.method==='simple'?[0]:[5,10,15,0];
  syncPst(s);
  return s;
};
const saveState=s=>{s.updatedAt=Date.now();sv('hifdh_state',s);if(typeof scheduleCloudSync==='function')scheduleCloudSync()};
const loadDays=()=>ld('hifdh_days',{});
const loadNotes=()=>ld('hifdh_notes',[]);
const saveNotes=n=>{sv('hifdh_notes',n);if(typeof scheduleCloudSync==='function')scheduleCloudSync()};

function applyTheme(s){
  document.documentElement.setAttribute('data-theme',s.theme||'light');
  document.documentElement.setAttribute('data-color',s.color||'emerald');
  document.documentElement.setAttribute('data-size',s.uiText||'m');
  document.documentElement.setAttribute('data-cards',s.uiCard||'m');
  const colors={emerald:'#1f5f4a',blue:'#2563eb',gold:'#a16207',plum:'#7c3aed'};
  const mt=$('metaTheme');
  if(mt)mt.setAttribute('content',colors[s.color]||'#1f5f4a');
}
function toggleTheme(){
  const s=loadState();s.theme=s.theme==='dark'?'light':'dark';
  saveState(s);applyTheme(s);if(D)D.state=s;render();
}
function setColor(c){const s=loadState();s.color=c;saveState(s);applyTheme(s);if(D)D.state=s;render()}

const navKey=t=>['tasbih','recite','library'].includes(t)?'tools':t;
function setTab(t){
  TAB=t;T_MENU=false;DR=null;
  const activeKey=navKey(t);
  NAV.forEach(n=>{const e=$('nav-'+n[0]);if(e)e.classList.toggle('active',n[0]===activeKey)});
  render();window.scrollTo(0,0);
}
function jumpToTasbih(targetCount){
  ensureData();
  const s=loadState();
  s.tasbihMode='ayah';s.tasbih=0;s.tasbihTarget=targetCount;
  saveState(s);D.state=s;setTab('tasbih');
}

function showCelebration(ico,title,body){
  $('modalRoot').innerHTML=`<div class="modal-bg" onclick="closeModal()">
    <div class="modal-card" onclick="event.stopPropagation()">
      <div style="font-size:46px;margin-bottom:8px">${ico}</div>
      <div style="font-size:19px;font-weight:800;color:var(--ac);margin-bottom:6px">${esc(title)}</div>
      <div style="font-size:13.5px;line-height:1.5;margin-bottom:16px">${esc(body)}</div>
      <button style="width:100%" onclick="closeModal()">Alḥamdulillāh · Continue</button>
    </div>
  </div>`;
}
function closeModal(){const mr=$('modalRoot');if(mr)mr.innerHTML=''}

function addDays(str,k){const p=str.split('-');const d=new Date(+p[0],+p[1]-1,+p[2]);d.setDate(d.getDate()+k);return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
const anyDone=day=>(day.n&&day.n.done)||(day.sb&&day.sb.done)||day.r.some(t=>t.done);
function allDone(day){
  const t=(day.n?1:0)+(day.sb?1:0)+day.r.length;if(!t)return false;
  return(!day.n||day.n.done)&&(!day.sb||day.sb.done)&&day.r.every(x=>x.done);
}

function makePlan(s){
  const ord=validOrder(s.order);
  const plan={n:null,sb:null,r:[],u:[],ord};
  const doHifdh=s.mode==='both'||s.mode==='hifdh';
  const doRev=s.mode==='both'||s.mode==='revision';
  const stepPages=Number(s.newPerDay)||1;
  const useHalf=(stepPages===0.5 || (s.frontier%1!==0));
  const curUnits=Math.round((s.frontier||0)*2);
  const stepUnits=Math.max(1,Math.round(stepPages*2));
  const totalUnits=TOTAL*2;

  if(doHifdh && stepPages>0 && curUnits<totalUnits){
    const uA=curUnits+1;
    const uB=Math.min(totalUnits,curUnits+stepUnits);
    const pages=pagesInUnits(ord,uA,uB);
    const repTarget=stepPages>=3?30:40;
    plan.n={
      uA,uB,a:pages[0],b:uB/2,pages,ord,useHalf,repTarget,done:false,
      subs:{yest:false,listen:false,tafsir:false,repeat:false,record:false}
    };
  }

  if(s.method==='tikrar'){
    const connWindowUnits=25*(stepPages>0?stepUnits:2);
    if(curUnits>=stepUnits){
      const connEnd=curUnits;
      const connStart=Math.max(1,connEnd-connWindowUnits+1);
      const sbPages=pagesInUnits(ord,connStart,connEnd);
      plan.sb={
        uA:connStart,uB:connEnd,a:sbPages[0],b:sbPages[sbPages.length-1],
        pages:sbPages,ord,useHalf,label:'Recent Connection (Ar-Rabt)',done:false
      };
      if(doRev){
        const oldEnd=curUnits>=totalUnits ? totalUnits : (connStart-1);
        if(oldEnd>=1){
          const tDay=Math.max(1,Math.min(6,s.tourDay||1));
          const chunk=Math.max(1,Math.ceil(oldEnd/6));
          const revStart=Math.min(oldEnd,(tDay-1)*chunk+1);
          const revEnd=tDay===6?oldEnd:Math.min(oldEnd,tDay*chunk);
          const revPages=pagesInUnits(ord,revStart,revEnd);
          const before={tourDay:tDay,tourNum:s.tourNum||1};
          const after=tDay>=6?{tourDay:1,tourNum:(s.tourNum||1)+1}:{tourDay:tDay+1,tourNum:s.tourNum||1};
          plan.r.push({
            isTikrar:true,tourNum:s.tourNum||1,tourDay:tDay,
            uA:revStart,uB:revEnd,a:revPages[0],b:revPages[revPages.length-1],
            pages:revPages,ord,useHalf,done:false,before,after
          });
        }
      }
    }
    return plan;
  }

  if(s.sabakPages>0 && curUnits>=1 && (doRev || s.mode==='hifdh')){
    const sbUnits=Math.round(s.sabakPages*2);
    const blk=6*Math.max(1,Math.round((stepPages>0?stepPages:1)*2));
    const startU=curUnits>sbUnits?1+blk*Math.floor((curUnits-sbUnits)/blk):1;
    const sbPages=pagesInUnits(ord,startU,curUnits);
    plan.sb={
      uA:startU,uB:curUnits,a:sbPages[0],b:sbPages[sbPages.length-1],
      pages:sbPages,ord,useHalf,label:'Recent Revision (6-day window)',done:false
    };
  }
  if(doRev && s.frontier>=1){
    const jList=seqJuzPages(s);
    if(jList.length){
      const jNums=jList.map(x=>x.j);
      const chunks=(Array.isArray(s.chunks)&&s.chunks.length)?s.chunks:[0];
      let pos={c:s.cycle,j:s.juz,p:s.period};
      if(pos.c>=chunks.length)pos.c=0;
      for(let i=0;i<s.revPerDay;i++){
        let idx=jNums.indexOf(pos.j);
        if(idx===-1){
          const pastEnd=ord==='fwd'?(pos.j>jNums[jNums.length-1]):(pos.j<jNums[jNums.length-1]);
          if(pastEnd){
            pos.c++;
            if(pos.c>=chunks.length){pos.c=s.afterLast==='restart'?0:chunks.length-1;pos.p++}
          }
          idx=0;
          pos.j=jNums[0];
        }
        const entry=jList[idx], N=chunks[pos.c];
        const revPages=N>0?entry.pages.slice(-N):entry.pages.slice();
        const before={c:pos.c,j:pos.j,p:pos.p};
        let after, wrapped=false, wrappedPeriod=false;
        if(idx<jNums.length-1){
          after={c:pos.c,j:jNums[idx+1],p:pos.p};
        }else{
          wrapped=true;
          let nc=pos.c+1, np=pos.p;
          if(nc>=chunks.length){nc=s.afterLast==='restart'?0:chunks.length-1;np++;wrappedPeriod=true}
          after={c:nc,j:jNums[0],p:np};
        }
        plan.r.push({
          j:entry.j,a:revPages[0],b:revPages[revPages.length-1],pages:revPages,ord,
          c:pos.c,p:pos.p,n:N,done:false,before,after,wrapped,wrappedPeriod
        });
        pos={c:after.c,j:after.j,p:after.p};
      }
    }
  }
  return plan;
}

const api={
  getData(today){
    const s=loadState(),days=loadDays();
    applyTheme(s);
    const old=days[today];
    let day=old;
    if(!old||!anyDone(old)){
      const np=makePlan(s);
      if(old&&old.n&&np.n&&old.n.uA===np.n.uA&&old.ord===np.ord&&old.n.subs)np.n.subs=old.n.subs;
      day=np;days[today]=np;
    }
    const cutoff=addDays(today,-400);
    Object.keys(days).forEach(k=>{if(k<cutoff)delete days[k]});
    sv('hifdh_days',days);
    const strip=[];
    for(let i=27;i>=0;i--){const d=addDays(today,-i);const o=days[d];strip.push({d,s:o?(allDone(o)?2:(anyDone(o)?1:0)):0})}
    let streak=0;for(let k=strip[27].s===2?27:26;k>=0&&strip[k].s===2;k--)streak++;
    const juz=[];
    for(let j=1;j<=30;j++){const len=juzEnd(j)-JUZ_START[j]+1;const c=pstCount(s,JUZ_START[j],juzEnd(j));juz.push((c.g+c.w)/len)}
    const remaining=Math.max(0,TOTAL-s.frontier);
    const eta=(s.mode!=='revision'&&s.newPerDay>0&&remaining>0)?addDays(today,Math.ceil(remaining/s.newPerDay)-1):null;
    return{state:s,day,stats:{juz,strip,streak,remaining,eta}};
  },
  tick(today,key){
    const s=loadState(),days=loadDays(),day=days[today];
    const task=key==='n'?day.n:(key==='sb'?day.sb:day.r[+key.slice(1)]);
    if(!task)return{error:'Task not found.'};
    if(!task.done){
      if(key==='n'){
        const oldF=s.frontier;
        const pages=Array.isArray(task.pages)&&task.pages.length?task.pages:rangeArr(task.a,Math.ceil(task.b));
        const touchedJuz=[...new Set(pages.map(juzOf))];
        const beforeJuzDone=new Set(touchedJuz.filter(j=>{const c=pstCount(s,JUZ_START[j],juzEnd(j));return c.g+c.w>=c.n}));
        const touchedSurahs=SURAH_AT_PAGE.map((x,i)=>i).filter(i=>pages.some(p=>p>=SURAH_AT_PAGE[i][0]&&p<=SURAH_END[i]));
        const beforeSurahDone=new Set(touchedSurahs.filter(i=>{const c=pstCount(s,SURAH_AT_PAGE[i][0],SURAH_END[i]);return c.g+c.w>=c.n}));

        task.prev=oldF;
        task.pp=pages.map(p=>[p,s.pst[p-1]]);
        s.frontier=Math.max(s.frontier,task.b);
        {const t=s.pst.split('');pages.forEach(p=>{if(t[p-1]==='0')t[p-1]='w'});s.pst=t.join('')}

        const newF=s.frontier;
        const newlyDoneJuz=touchedJuz.filter(j=>{if(beforeJuzDone.has(j))return false;const c=pstCount(s,JUZ_START[j],juzEnd(j));return c.g+c.w>=c.n});
        const newlyDoneSurahs=touchedSurahs.filter(i=>{if(beforeSurahDone.has(i))return false;const c=pstCount(s,SURAH_AT_PAGE[i][0],SURAH_END[i]);return c.g+c.w>=c.n});
        const totalDoneJuz=completedJuzCount(s);

        if(newF>=TOTAL && oldF<TOTAL){
          showCelebration('👑','Māshā’Allāh! Khatmah Complete!','You have completed all 30 Juz—all 604 pages of the Noble Qur’an!');
        }else if(newlyDoneJuz.length && newF>oldF){
          const j=newlyDoneJuz[newlyDoneJuz.length-1];
          showCelebration('🏔️',`Juz ${j} Complete!`,`Allāhu Akbar! You completed Juz ${j} (${totalDoneJuz} of 30 Juz memorized).`);
        }else if(newlyDoneSurahs.length && newF>oldF){
          const nm=newlyDoneSurahs.map(i=>SURAH_AT_PAGE[i][1]);
          const label=nm.length===1?`Surah ${nm[0]}`:`Surahs ${nm.join(', ')}`;
          showCelebration('✨',`${label} Complete!`,`Māshā’Allāh! You finished memorizing ${label}. Keep going!`);
        }
      }
      else if(key.startsWith('r')){
        if(task.isTikrar){
          s.tourDay=task.after.tourDay;
          s.tourNum=task.after.tourNum;
          if(task.tourDay===6){
            showCelebration('🔄',`Tour / Circuit #${task.tourNum} Complete!`,`Māshā’Allāh! You completed your 6-day revision circuit of all old memorization. Starting Tour #${task.after.tourNum}!`);
          }
        }else{
          const chunks=(Array.isArray(s.chunks)&&s.chunks.length)?s.chunks:[0];
          s.cycle=task.after.c;s.juz=task.after.j;s.period=task.after.p;
          const wrapped=task.wrapped!==undefined?task.wrapped:(task.j>=juzOf(s.frontier)&&juzOf(s.frontier)>=1);
          const wrappedPeriod=task.wrappedPeriod!==undefined?task.wrappedPeriod:(task.c+1>=chunks.length);
          if(wrapped){
            if(wrappedPeriod){
              showCelebration('🌟',`Period ${task.p} Complete!`,`Māshā’Allāh! You finished every cycle of Period ${task.p}. Starting Period ${task.p+1}!`);
            }else{
              showCelebration('🔄',`Revision Cycle ${task.c+1} Complete!`,`Well done! You completed Cycle ${task.c+1} (${chunkName(task.n)}) across all your memorized Juz.`);
            }
          }
        }
      }
      task.done=true;day.u.push(key);
    }else{
      if(day.u[day.u.length-1]!==key)return{error:'Undo the most recent tick first.'};
      if(key==='n'){
        s.frontier=task.prev;
        if(Array.isArray(task.pp)){
          const t=s.pst.split('');
          task.pp.forEach(([p,ch])=>{if(p>=1&&p<=TOTAL)t[p-1]=ch});
          s.pst=t.join('');
        }else if(typeof task.pp==='string'){
          const pA=task.a,pB=Math.min(TOTAL,Math.ceil(task.b));
          s.pst=s.pst.slice(0,pA-1)+task.pp+s.pst.slice(pB);
        }
      }
      else if(key.startsWith('r')){
        if(task.isTikrar){s.tourDay=task.before.tourDay;s.tourNum=task.before.tourNum}
        else{s.cycle=task.before.c;s.juz=task.before.j;s.period=task.before.p}
      }
      task.done=false;day.u.pop();
    }
    saveState(s);sv('hifdh_days',days);
    return api.getData(today);
  },
  tickSub(today,subKey,force){
    const days=loadDays(),day=days[today];
    if(day&&day.n){
      day.n.subs=day.n.subs||{};
      day.n.subs[subKey]=force===true?true:!day.n.subs[subKey];
      sv('hifdh_days',days);
      if(typeof scheduleCloudSync==='function')scheduleCloudSync();
    }
    return api.getData(today);
  },
  savePlan(today,f){
    const s=loadState();
    const chunks=String(f.chunks==null?s.chunks.join(','):f.chunks).split(',').map(x=>parseInt(x.trim(),10)).filter(x=>!isNaN(x)&&x>=0&&x<=21);
    if(!chunks.length)return{error:'Cycle sizes must look like 5,10,15,0 (0 = whole juz).'};
    const oldOrder=validOrder(s.order);
    const oldF=Math.ceil(s.frontier||0);
    const pureBefore=isPureSeqPst(s,oldOrder,oldF);

    s.seenIntro=true;s.onboarded=true;
    if(f.name!==undefined)s.name=String(f.name).trim();
    if(['both','hifdh','revision'].includes(f.mode))s.mode=f.mode;
    if(['tikrar','ottoman','simple'].includes(f.method))s.method=f.method;
    if(['fwd','juz_rev','page_rev'].includes(f.order))s.order=f.order;
    const orderChanged=s.order!==oldOrder;

    s.chunks=chunks.slice(0,8);
    const fr=parseFloat(f.frontier);
    if(!isNaN(fr))s.frontier=Math.max(0,Math.min(TOTAL,Math.round(fr*2)/2));
    const newF=Math.ceil(s.frontier||0);

    if(orderChanged){
      if(pureBefore){s.pst='0'.repeat(TOTAL);markSeq(s,1,newF,'s',false)}
      else{markSeq(s,1,newF,'s',true)}
    }else if(newF>oldF){
      markSeq(s,oldF+1,newF,'s',true);
    }else if(newF<oldF){
      markSeq(s,newF+1,oldF,'0',false);
    }

    const np=parseFloat(f.newPerDay);if(!isNaN(np))s.newPerDay=Math.max(0,Math.min(20,Math.round(np*2)/2));
    const num=(v,def,lo,hi)=>{const n=parseInt(v,10);return isNaN(n)?def:Math.max(lo,Math.min(hi,n))};
    s.revPerDay=num(f.revPerDay,s.revPerDay,1,5);
    s.sabakPages=num(f.sabakPages,s.sabakPages,0,30);
    s.cycle=num(f.cycle,s.cycle+1,1,s.chunks.length)-1;
    s.juz=num(f.juz,orderChanged?(s.order==='fwd'?1:30):s.juz,1,30);
    s.period=num(f.period,s.period,1,9999);
    s.tourDay=num(f.tourDay,s.tourDay||1,1,6);
    s.tourNum=num(f.tourNum,s.tourNum||1,1,9999);
    if(['keep','restart'].includes(f.afterLast))s.afterLast=f.afterLast;
    saveState(s);
    const days=loadDays(),cur=days[today];
    let kept=false;
    if(cur&&!anyDone(cur)){delete days[today];sv('hifdh_days',days)}
    else if(cur)kept=true;
    const r=api.getData(today);r.kept=kept;return r;
  },
  addPages(today,n){
    const s=loadState();
    const add=parseFloat(n)||0;
    const oN=Math.ceil(s.frontier||0);
    s.frontier=Math.min(TOTAL,Math.round((s.frontier+Math.max(0,add))*2)/2);
    markSeq(s,oN+1,Math.ceil(s.frontier),'s',true);
    saveState(s);dropIfUnticked(today);
    return api.getData(today);
  }
};

function dropIfUnticked(today){const d=loadDays();if(d[today]&&!anyDone(d[today])){delete d[today];sv('hifdh_days',d)}}
function call(fn,...a){
  if($('msg'))$('msg').textContent='';
  try{const r=api[fn](T(),...a);if(r&&r.error){if($('msg'))$('msg').textContent=r.error;return}if(r){D=r;DR=null}}
  catch(e){if($('msg'))$('msg').textContent=e.message;return}
  render();
}

function uploadAvatar(inp){
  const f=inp.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=128;canvas.height=128;
      const ctx=canvas.getContext('2d');
      const min=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-min)/2,(img.height-min)/2,min,min,0,0,128,128);
      const s=loadState();s.avatar=canvas.toDataURL('image/jpeg',0.82);
      saveState(s);ensureData().state=s;inp.value='';render();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(f);
}
function removeAvatar(){const s=loadState();s.avatar='';saveState(s);ensureData().state=s;render()}

function tapTasbih(){
  ensureData();
  const s=loadState();
  s.tasbih=(s.tasbih||0)+1;
  s.tasbihTotal=(s.tasbihTotal||0)+1;
  saveState(s);
  if(navigator.vibrate)navigator.vibrate(s.tasbih===s.tasbihTarget?[60,40,60]:22);
  if(s.tasbihMode==='ayah'&&s.tasbih===s.tasbihTarget){
    try{api.tickSub(T(),'repeat',true);D=api.getData(T())}catch(e){D.state=s}
  }else{D.state=s}
  render();
}
function resetTasbih(){ensureData();const s=loadState();s.tasbih=0;saveState(s);D.state=s;render()}
function resetTasbihLifetime(){
  if(!confirm('Reset your lifetime counter back to 0?'))return;
  ensureData();const s=loadState();s.tasbihTotal=0;saveState(s);D.state=s;render();
}
function setTasbihTarget(v){ensureData();const s=loadState();s.tasbihTarget=Math.max(1,parseInt(v,10)||33);saveState(s);D.state=s;render()}
function setTasbihMode(m){ensureData();const s=loadState();s.tasbihMode=m;s.tasbih=0;s.tasbihTarget=m==='ayah'?40:33;saveState(s);D.state=s;render()}
function setTasbihPhrase(p){ensureData();const s=loadState();s.tasbihPhrase=p;saveState(s);D.state=s;render()}
function setTasbihTheme(th){ensureData();const s=loadState();s.tasbihTheme=th;saveState(s);D.state=s;render()}

function openDB(){
  return new Promise((res,rej)=>{
    const req=indexedDB.open('my_companion_db',2);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('clips'))db.createObjectStore('clips',{keyPath:'id'});
      if(!db.objectStoreNames.contains('vault'))db.createObjectStore('vault',{keyPath:'id'});
    };
    req.onsuccess=e=>res(e.target.result);
    req.onerror=e=>rej(e);
  });
}

async function initMics(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return;
  try{
    const devs=await navigator.mediaDevices.enumerateDevices();
    audioDevices=devs.filter(d=>d.kind==='audioinput');
  }catch(e){}
}
async function toggleRecord(){
  if(!isRecording){
    try{
      const constraints={audio:selectedMic?{deviceId:{exact:selectedMic}}:true};
      const stream=await navigator.mediaDevices.getUserMedia(constraints);
      await initMics();
      recChunks=[];
      const opts={};
      if(selectedMime && window.MediaRecorder && MediaRecorder.isTypeSupported(selectedMime))opts.mimeType=selectedMime;
      mediaRec=new MediaRecorder(stream,opts);
      mediaRec.ondataavailable=e=>{if(e.data.size>0)recChunks.push(e.data)};
      mediaRec.onstop=async()=>{
        const mime=mediaRec.mimeType||'audio/webm';
        const blob=new Blob(recChunks,{type:mime});
        stream.getTracks().forEach(t=>t.stop());
        const label=prompt('Label this recitation (e.g., Surah Al-Baqarah 3x Test):','Recitation '+T())||('Recitation '+T());
        const note=prompt('Optional note or Tajweed highlight (e.g., Check Ghunnah at 0:45):','')||'';
        const db=await openDB();
        const tx=db.transaction('clips','readwrite');
        tx.objectStore('clips').put({id:Date.now(),date:T(),label,note,mime,blob});
        tx.oncomplete=()=>{try{api.tickSub(T(),'record',true);D=api.getData(T())}catch(e){}render()};
      };
      mediaRec.start();isRecording=true;render();
    }catch(e){if($('msg'))$('msg').textContent='Microphone permission needed: '+e.message}
  }else{
    mediaRec.stop();isRecording=false;render();
  }
}
async function uploadAudioClip(inp){
  const f=inp.files[0];if(!f)return;
  const label=prompt('Title for this audio file:',f.name.replace(/\.[^/.]+$/,''))||f.name;
  const note=prompt('Optional note/highlight for this audio:','')||'';
  const db=await openDB();
  const tx=db.transaction('clips','readwrite');
  tx.objectStore('clips').put({id:Date.now(),date:T(),label,note,mime:f.type||'audio/mp3',blob:f});
  tx.oncomplete=()=>{inp.value='';render()};
}
async function editClipNote(id){
  const clips=await loadClips();const c=clips.find(x=>x.id===id);if(!c)return;
  const next=prompt('Update recitation note / highlight:',c.note||'');
  if(next===null)return;
  c.note=next;
  const db=await openDB();const tx=db.transaction('clips','readwrite');
  tx.objectStore('clips').put(c);tx.oncomplete=()=>render();
}
async function shareClip(id){
  const clips=await loadClips();
  const c=clips.find(x=>x.id===id);if(!c)return;
  const ext=(c.mime||'').includes('mp4')?'m4a':((c.mime||'').includes('wav')?'wav':'webm');
  const safeFile=c.label.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]+/g,'_');
  const file=new File([c.blob],`${safeFile}.${ext}`,{type:c.mime||'audio/webm'});
  if(navigator.canShare && navigator.canShare({files:[file]})){
    await navigator.share({title:c.label,text:c.note||'My Qur’an recitation from My Companion',files:[file]}).catch(()=>{});
  }else{
    const tempUrl=URL.createObjectURL(c.blob);
    const a=document.createElement('a');a.href=tempUrl;a.download=file.name;a.click();
    setTimeout(()=>URL.revokeObjectURL(tempUrl),1000);
  }
}
async function loadClips(){
  try{
    const db=await openDB();
    return new Promise(res=>{
      const req=db.transaction('clips','readonly').objectStore('clips').getAll();
      req.onsuccess=()=>res((req.result||[]).sort((a,b)=>b.id-a.id));
      req.onerror=()=>res([]);
    });
  }catch(e){return[]}
}
async function deleteClip(id){
  revokeObjUrl('clip-'+id);
  const db=await openDB();
  const tx=db.transaction('clips','readwrite');
  tx.objectStore('clips').delete(id);
  tx.oncomplete=()=>render();
}

async function uploadVaultMedia(inp){
  const f=inp.files[0];if(!f)return;
  const title=prompt('Title for this media file:',f.name.replace(/\.[^/.]+$/,''))||f.name;
  const folder=$('vaultFolderSel')?$('vaultFolderSel').value:'Tajweed Lessons';
  const db=await openDB();
  const tx=db.transaction('vault','readwrite');
  tx.objectStore('vault').put({id:Date.now(),date:T(),title,folder,name:f.name,type:f.type,size:f.size,blob:f});
  tx.oncomplete=()=>{inp.value='';render()};
}
async function loadVault(){
  try{
    const db=await openDB();
    return new Promise(res=>{
      const req=db.transaction('vault','readonly').objectStore('vault').getAll();
      req.onsuccess=()=>res((req.result||[]).sort((a,b)=>b.id-a.id));
      req.onerror=()=>res([]);
    });
  }catch(e){return[]}
}
async function deleteVaultItem(id){
  revokeObjUrl('vault-'+id);
  const db=await openDB();
  const tx=db.transaction('vault','readwrite');
  tx.objectStore('vault').delete(id);
  tx.oncomplete=()=>render();
}

function addFolder(){
  const name=prompt('New Folder / Lesson Category Name:');
  if(!name||!name.trim())return;
  const s=loadState();
  if(!s.folders.includes(name.trim()))s.folders.push(name.trim());
  saveState(s);ensureData().state=s;render();
}
function execRT(cmd,val=null){
  const area=$('rtEditor');if(!area)return;
  area.focus();document.execCommand(cmd,false,val);
}
function insertRTTable(){
  const area=$('rtEditor');if(!area)return;
  area.focus();
  const tbl=`<table><tr><th>Rule / Surah</th><th>Details & Examples</th></tr><tr><td>Example 1</td><td>Write notes here...</td></tr><tr><td>Example 2</td><td>Write notes here...</td></tr></table><p></p>`;
  document.execCommand('insertHTML',false,tbl);
}
function attachInlinePhoto(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=e=>{
    const area=$('rtEditor');if(!area)return;
    area.focus();
    document.execCommand('insertHTML',false,`<img src="${e.target.result}" style="max-width:100%;border-radius:10px;margin:8px 0"><p></p>`);
    inp.value='';
  };
  r.readAsDataURL(f);
}
function formatPlainNotes(raw){
  const lines=raw.split(/\n+/).map(l=>l.trim()).filter(Boolean);
  return lines.map((l,idx)=>{
    const refBold=esc(l).replace(/\b(\d{1,3}:\d{1,3})\b/g,'<b>[$1]</b>');
    if(idx===0 && l.length<65)return `<h3>${refBold}</h3>`;
    if(l.endsWith(':'))return `<p><b>${refBold}</b></p>`;
    if(/^[-•*]/.test(l))return `<li>${refBold.replace(/^[-•*]\s*/,'')}</li>`;
    return `<p>${refBold}</p>`;
  }).join('');
}
async function polishNoteAI(){
  const area=$('rtEditor');if(!area)return;
  const raw=area.innerText.trim();
  if(!raw){if($('msg'))$('msg').textContent='Write some notes first before polishing.';return}
  const s=loadState();
  if(s.aiKey){
    try{
      if($('msg'))$('msg').textContent='✨ Polishing with Gemini AI...';
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(s.aiKey)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:`Organize and polish these Qur'an/Tajweed study notes into clean HTML using <b>, <ul>, <li>, and <p> tags without markdown code fences:\n\n${raw}`}]}]})
      });
      if(!res.ok)throw new Error('HTTP '+res.status);
      const data=await res.json();
      const out=data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if(out){
        area.innerHTML=sanitizeHtml(out.replace(/```html|```/g,'').trim());
        if($('msg'))$('msg').textContent='✨ Polished with Gemini!';
        setTimeout(()=>{if($('msg'))$('msg').textContent=''},2500);
        return;
      }
      throw new Error('Empty response from Gemini');
    }catch(e){
      area.innerHTML=formatPlainNotes(raw);
      if($('msg'))$('msg').textContent='AI polish unavailable ('+e.message+') — applied clean local formatting.';
      setTimeout(()=>{if($('msg'))$('msg').textContent=''},3500);
      return;
    }
  }
  area.innerHTML=formatPlainNotes(raw);
  if($('msg'))$('msg').textContent='✨ Note cleanly structured & formatted!';
  setTimeout(()=>{if($('msg'))$('msg').textContent=''},2500);
}
function saveRichNote(){
  const title=$('ntTitle').value.trim()||'Untitled Lesson';
  const cat=$('ntCat').value;
  const link=$('ntLink').value.trim();
  const html=sanitizeHtml($('rtEditor').innerHTML.trim());
  const list=loadNotes();
  if(EDIT_NOTE_ID){
    const idx=list.findIndex(x=>x.id===EDIT_NOTE_ID);
    if(idx>-1)list[idx]=Object.assign(list[idx],{title,cat,link,html,date:T(),updatedAt:Date.now()});
    EDIT_NOTE_ID=null;
  }else{
    list.unshift({id:Date.now(),date:T(),updatedAt:Date.now(),cat,title,link,html});
  }
  SHOW_COMPOSER=false;
  saveNotes(list);render();
}
async function editNote(id){
  const n=loadNotes().find(x=>x.id===id);if(!n)return;
  EDIT_NOTE_ID=id;SHOW_COMPOSER=true;
  await render();
  if($('ntTitle'))$('ntTitle').value=n.title||'';
  if($('ntCat'))$('ntCat').value=n.cat||'Tajweed Lessons';
  if($('ntLink'))$('ntLink').value=n.link||'';
  if($('rtEditor'))$('rtEditor').innerHTML=sanitizeHtml(n.html||esc(n.body||''));
}
function delNote(id){
  if(!confirm('Delete this note/lesson?'))return;
  const del=ld('hifdh_deleted_notes',[]);if(!del.includes(id))del.push(id);sv('hifdh_deleted_notes',del);
  saveNotes(loadNotes().filter(x=>x.id!==id));render();
}
function setLibFilter(f){ensureData();const s=loadState();s.libFilter=f;saveState(s);D.state=s;render()}
function setLibSubTab(st){ensureData();const s=loadState();s.libSubTab=st;saveState(s);D.state=s;render()}

function exportNoteDoc(id,type){
  const n=loadNotes().find(x=>x.id===id);if(!n)return;
  const cleanLink=safeExternalUrl(n.link);
  const safeBody=sanitizeHtml(n.html||esc(n.body||''));
  const safeFile=n.title.replace(/[^a-zA-Z0-9_\u0600-\u06FF-]+/g,'_')||'lesson';
  const content=`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(n.title)}</title>
    <style>body{font-family:system-ui,sans-serif;padding:28px;line-height:1.6}table{width:100%;border-collapse:collapse}td,th{border:1px solid #999;padding:6px}</style>
    </head><body><h1>${esc(n.title)}</h1><p style="color:#666">${esc(n.cat)} · ${esc(n.date)}</p>${cleanLink?`<p><a href="${esc(cleanLink)}" target="_blank" rel="noopener noreferrer">${esc(cleanLink)}</a></p>`:''}<div>${safeBody}</div></body></html>`;
  if(type==='pdf'){
    const w=window.open('','_blank');
    if(w){w.document.write(content);w.document.close();w.focus();setTimeout(()=>w.print(),300)}
  }else if(type==='doc'){
    const blob=new Blob(['\ufeff',content],{type:'application/msword'});
    const url=URL.createObjectURL(blob);
    const a=document.createElement('a');a.href=url;a.download=`${safeFile}.doc`;a.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
  }else if(type==='share'){
    const tmp=document.createElement('div');tmp.innerHTML=safeBody;
    const txt=`📖 ${n.title} (${n.cat})\n\n${tmp.innerText}${cleanLink?'\n🔗 '+cleanLink:''}`;
    if(navigator.share)navigator.share({title:n.title,text:txt}).catch(()=>{});
    else if(navigator.clipboard){navigator.clipboard.writeText(txt).catch(()=>{});toast('Copied to clipboard!')}
  }
}

function ytEmbedUrl(url){
  const safe=safeExternalUrl(url);
  if(!safe)return null;
  const m=safe.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/);
  return m?`https://www.youtube.com/embed/${m[1]}`:null;
}

function sendEmailSummary(){
  ensureData();
  const s=D.state,st=D.stats;
  const to=encodeURIComponent(s.email||'');
  const subj=encodeURIComponent(`My Companion Progress — ${s.name||'Student'} (${T()})`);
  const body=encodeURIComponent(
    `Assalamu Alaikum ${s.name||''},\n\n`+
    `My Companion Hifdh Summary (${T()}):\n`+
    `• Memorized: ${memCount(s)} / 604 pages (${Math.round(memCount(s)/604*100)}%)\n`+
    `• Juz Completed: ${completedJuzCount(s)} of 30\n`+
    `• Active Streak: ${st.streak} day(s)\n\n`+
    `"Read and ascend, for your station will be at the last verse you recite."`
  );
  window.location.href=`mailto:${to}?subject=${subj}&body=${body}`;
}
function enableReminder(){
  ensureData();
  if(!('Notification' in window)){if($('msg'))$('msg').textContent='Notifications not supported on this browser.';return}
  Notification.requestPermission().then(p=>{
    if(p==='granted')new Notification('My Companion',{body:`Assalamu Alaikum ${D.state.name||''}! Daily Hifdh reminder is active.`});
  });
}

function exportData(){
  const s=loadState();s.lastBackup=T();saveState(s);
  const blob=new Blob([JSON.stringify({app:'hifdh',v:8,state:s,days:loadDays(),notes:loadNotes()})],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='my-companion-backup-'+T()+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  render();
}
function importData(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const o=JSON.parse(r.result);
    if(o.app!=='hifdh'||!o.state||!o.days)throw new Error('Invalid backup file.');
    if(!confirm('Replace your current data with this backup?'))return;
    saveState(Object.assign({},DEFAULTS,o.state));sv('hifdh_days',o.days);
    if(o.notes)saveNotes(o.notes);
    DR=null;D=null;SELECTED_JUZ=null;render();
  }catch(e){if($('msg'))$('msg').textContent=e.message}};
  r.readAsText(f);inp.value='';
}
function resetAll(){
  LS.removeItem('hifdh_state');LS.removeItem('hifdh_days');LS.removeItem('hifdh_notes');LS.removeItem('hifdh_deleted_notes');
  ACTIVE_URLS.forEach(entry=>URL.revokeObjectURL(entry.url));
  ACTIVE_URLS.clear();
  DR=null;D=null;SELECTED_JUZ=null;render();
}
function replayIntro(){ensureData();const s=loadState();s.seenIntro=false;OB_SLIDE=0;saveState(s);D.state=s;render()}

const chunkName=n=>n>0?`last ${n} pages`:'whole juz';
function fmt(d){return d?new Date(d+'T00:00').toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'}):'—'}
const initials=name=>(name||'M').trim().split(/\s+/).map(x=>x[0]).join('').slice(0,2).toUpperCase();

/* ---------- icons & small helpers ---------- */
const ICO={
  home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  stats:'<path d="M4 20h16M7 20v-7M12 20V7M17 20v-4"/>',
  tools:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  tasbih:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  lib:'<path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z"/>',
  gear:'<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  loop:'<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>',
  both:'<path d="M2 5h5a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H2z"/><path d="M13 10a4.5 4.5 0 0 1 8 0M21 16a4.5 4.5 0 0 1-8 0"/><path d="M21 6v4h-4M13 20v-4h4"/>',
  star:'<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/><rect x="5.5" y="5.5" width="13" height="13" rx="1.5" transform="rotate(45 12 12)"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  mark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  fwd:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  juzrev:'<path d="M4 7h12M4 12h10M4 17h8M19 6v12M16 15l3 3 3-3"/>',
  pagerev:'<path d="M19 12H5M11 6l-6 6 6 6"/>'
};
const ic=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[n]}</svg>`;
const esc=t=>String(t==null?'':t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const encAttr=t=>encodeURIComponent(t).replace(/'/g,'%27');
function toast(t){const e=$('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.remove('show'),2600)}
const NAV=[['today','home','Today'],['journey','stats','Stats'],['tools','tools','Tools'],['settings','gear','Settings']];
function buildNav(){
  const activeKey=navKey(TAB);
  $('bottomNav').innerHTML=NAV.map(n=>`<button id="nav-${n[0]}" class="${n[0]===activeKey?'active':''}" onclick="setTab('${n[0]}')">${ic(n[1])}<span>${n[2]}</span></button>`).join('');
}
function setHdr(h){$('hdr').innerHTML=h}
const themeBtn=s=>`<button class="g sm" onclick="toggleTheme()" id="themeBtn" title="Switch theme">${s.theme==='dark'?'☀️':'🌙'}</button>`;
function skipIntro(){const s=loadState();s.seenIntro=true;saveState(s);DR=null;D=null;render()}
function setUi(k,v){ensureData();const s=loadState();s[k]=v;saveState(s);applyTheme(s);D.state=s;render()}

function heroRing(done,total){
  const r=26, circ=2*Math.PI*r;
  const pct=total>0?(done/total):0;
  const offset=circ*(1-pct);
  return `<div class="ring-wrap" aria-label="${done} of ${total} tasks done">
    <svg class="ring-svg" viewBox="0 0 64 64">
      <circle class="ring-bg" cx="32" cy="32" r="${r}"></circle>
      <circle class="ring-fg" cx="32" cy="32" r="${r}" stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${offset.toFixed(1)}"></circle>
    </svg>
    <span class="ring-txt">${done}/${total}</span>
  </div>`;
}

/* ---------- plan form (shared by first-time setup and Settings) ---------- */
function initDraft(){
  const s=loadState();
  DR={mode:s.mode,method:s.method,order:validOrder(s.order),pace:s.newPerDay,posType:'page',fr:s.frontier,juzIn:'',
      rev:s.revPerDay,sabak:s.sabakPages,cycle:s.cycle+1,juz:s.juz,period:s.period,
      tourDay:s.tourDay||1,tourNum:s.tourNum||1,chunks:s.chunks.join(','),after:s.afterLast||'keep'};
}
function drSet(k,v){
  if(!DR)initDraft();
  DR[k]=v;
  if(k==='method'){
    if(v==='ottoman'){DR.sabak=0;DR.chunks='5,10,15,0'}
    else if(v==='simple'){DR.sabak=5;DR.chunks='0'}
  }
  if(k==='order'){
    if(DR.posType==='juz'&&DR.juzIn!=='')DR.fr=juzCountToPages(DR.juzIn,v);
    if(v==='fwd'&&DR.juz===30)DR.juz=1;
    else if(v!=='fwd'&&DR.juz===1)DR.juz=30;
  }
  render();
}
function drIn(k,v){if(!DR)initDraft();DR[k]=v}
function drPosType(t){if(!DR)initDraft();if(DR.posType!==t){DR.posType=t;DR.juzIn='';render()}}
function drPos(v){
  if(!DR)initDraft();
  if(DR.posType==='page'){
    const n=parseFloat(v);DR.fr=isNaN(n)?0:Math.max(0,Math.min(TOTAL,Math.round(n*2)/2));
  }else{
    DR.juzIn=v;
    if(v!=='')DR.fr=juzCountToPages(v,DR.order);
  }
  const h=$('posHint');if(h)h.textContent=posHintText();
}
function posHintText(){
  const ord=DR?validOrder(DR.order):'fwd';
  const seq=seqOf(ord);
  const f=DR?DR.fr:0;
  if(f<=0){
    const startP=seq[0];
    return `Starting at Page ${startP} · Juz ${juzOf(startP)} · Surah ${surahOf(startP)}`;
  }
  if(f>=TOTAL)return 'All 604 pages memorized · 30 of 30 Juz.';
  const lastP=seq[Math.ceil(f)-1];
  const nextP=seq[Math.floor(f)];
  return `${f} memorized · Last: Page ${lastP} (Juz ${juzOf(lastP)}) · Next: Page ${nextP} (${surahOf(nextP)})`;
}
function planForm(ctx){
  if(!DR)initDraft();
  const d=DR;
  const modes=[['both','Both Hifdh & Revision','both'],['hifdh','Hifdh Only','lib'],['revision','Revision Only','loop']];
  const methods=[['tikrar','Madinah Tikrar','Frequent repetition','star'],['ottoman','Ottoman Cycles','Structured rounds','loop'],['simple','Simple Daily','Steady pace','cal']];
  const orders=[
    ['fwd','Forward','Juz 1 → 30','fwd'],
    ['juz_rev','Juz Reverse','Juz 30 → 1','juzrev'],
    ['page_rev','Page Reverse','Page 604 → 1','pagerev']
  ];
  const desc={
    tikrar:'Madinah Tikrar: 40× repetition of the new page, recent connection, and a 6-day review circuit.',
    ottoman:'Ottoman Cycles: revise each Juz in 4 easy steps (last 5 pages → 10 → 15 → full Juz), one juz per day.',
    simple:'Simple Daily: set your own daily pages, a few recent pages, and a steady juz rotation.'
  };
  const orderDesc={
    fwd:'Standard order: start at Page 1 (Al-Fatihah) and advance forward to Page 604.',
    juz_rev:'Start at Juz 30 (Pages 582–604), then Juz 29 (562–581), moving forward inside each Juz.',
    page_rev:'Strictly backwards from Page 604 (An-Nas) down to Page 1 (Al-Fatihah).'
  };
  const paces=[0.5,1,2,3];
  const paceNum=parseFloat(d.pace);
  const showPaces=paces.includes(paceNum)?paces:[...paces,paceNum];
  const adv=d.method==='tikrar'
   ?`<div class="two">
      <div><label class="f">Review tour #</label><input type="number" value="${esc(d.tourNum)}" oninput="drIn('tourNum',this.value)"></div>
      <div><label class="f">Day in 6-day tour (1–6)</label><input type="number" value="${esc(d.tourDay)}" oninput="drIn('tourDay',this.value)"></div>
     </div>`
   :`<div class="two">
      <div><label class="f">Next juz to revise (1–30)</label><input type="number" value="${esc(d.juz)}" oninput="drIn('juz',this.value)"></div>
      <div><label class="f">Current cycle #</label><input type="number" value="${esc(d.cycle)}" oninput="drIn('cycle',this.value)"></div>
      <div><label class="f">Period #</label><input type="number" value="${esc(d.period)}" oninput="drIn('period',this.value)"></div>
      <div><label class="f">Juz revised per day</label><input type="number" value="${esc(d.rev)}" oninput="drIn('rev',this.value)"></div>
      <div><label class="f">Recent pages to revise daily</label><input type="number" value="${esc(d.sabak)}" oninput="drIn('sabak',this.value)"></div>
     </div>
     <label class="f">Cycle sizes (pages per juz, 0 = whole juz)</label>
     <input type="text" value="${esc(d.chunks)}" oninput="drIn('chunks',this.value)">
     <div class="mu" style="margin-top:4px">Example: <b>5,10,15,0</b> = last 5, last 10, last 15 pages, then the whole juz.</div>
     <div class="mu" style="margin-top:10px">Recent pages is the minimum. The recent window keeps its start page for 6 days and grows by up to 5 pages, then steps forward.</div>
     <label class="f">After the last cycle</label>
     <div class="seg"><span class="${d.after!=='restart'?'on':''}" onclick="drSet('after','keep')">Keep whole juz</span><span class="${d.after==='restart'?'on':''}" onclick="drSet('after','restart')">Restart cycles</span></div>`;
  const juzLabel=d.order==='fwd'?'Juz fully memorized from Juz 1 (0–30)':'Juz fully memorized from Juz 30 (0–30)';
  return `
    ${ctx==='onboard'?`<div class="card"><label class="f" style="margin-top:0">Your name</label><input type="text" id="obName" placeholder="e.g. Ahmad" value="${esc(loadState().name)}"></div>`:''}
    <div class="sec" style="margin-top:${ctx==='onboard'?'18':'4'}px">Your Goal</div>
    ${modes.map(m=>`<div class="goal ${d.mode===m[0]?'on':''}" onclick="drSet('mode','${m[0]}')">${ic(m[2])}<b>${m[1]}</b><span class="tk">✓</span></div>`).join('')}
    <div class="sec">Method</div>
    <div class="mgrid">${methods.map(m=>`<div class="mtile ${d.method===m[0]?'on':''}" onclick="drSet('method','${m[0]}')">${ic(m[3])}<b>${m[1]}</b><span>${m[2]}</span></div>`).join('')}</div>
    <div class="mu mdesc">${desc[d.method]}</div>
    <div class="sec">Memorization Order</div>
    <div class="mgrid">${orders.map(o=>`<div class="mtile ${d.order===o[0]?'on':''}" onclick="drSet('order','${o[0]}')">${ic(o[3])}<b>${o[1]}</b><span>${o[2]}</span></div>`).join('')}</div>
    <div class="mu mdesc">${orderDesc[d.order]}</div>
    <div class="sec">Where are you now?</div>
    <div class="card">
      <div class="seg"><span class="${d.posType==='page'?'on':''}" onclick="drPosType('page')">Pages done</span><span class="${d.posType==='juz'?'on':''}" onclick="drPosType('juz')">Juz done</span></div>
      ${d.posType==='page'
        ?`<label class="f" style="margin-top:0">Pages memorized so far in this order (0–604)</label><input type="number" step="0.5" value="${d.fr}" oninput="drPos(this.value)">`
        :`<label class="f" style="margin-top:0">${juzLabel}</label><input type="number" placeholder="e.g. 1" value="${esc(d.juzIn)}" oninput="drPos(this.value)">`}
      <div class="mu" id="posHint" style="margin-top:6px">${posHintText()}</div>
    </div>
    <div class="sec">Your Daily Pace</div>
    <div class="card"><div class="mu" style="margin-bottom:10px">New pages to memorize each day</div>
      <div class="pace">${showPaces.map(p=>`<span class="${p===paceNum?'on':''}" onclick="drSet('pace',${p})">${p===0.5?'½ Page':p+(p===1?' Page':' Pages')}</span>`).join('')}</div>
    </div>
    <details class="card adv"><summary>⚙️ Advanced fine-tuning (optional)</summary><div style="margin-top:10px">${adv}</div></details>
    <button class="bigbtn" onclick="savePlan('${ctx}')">${ctx==='onboard'?'Start My Journey 🚀':'Save Plan'}</button>`;
}
function savePlan(ctx){
  if(!DR)initDraft();
  const d=DR;
  const f={
    name:ctx==='onboard'&&$('obName')?$('obName').value:undefined,
    mode:d.mode,method:d.method,order:d.order,newPerDay:d.pace,frontier:d.fr,
    revPerDay:d.rev,sabakPages:d.sabak,cycle:d.cycle,juz:d.juz,period:d.period,
    tourDay:d.tourDay,tourNum:d.tourNum,chunks:d.chunks,afterLast:d.after
  };
  if($('msg'))$('msg').textContent='';
  const r=api.savePlan(T(),f);
  if(r&&r.error){if($('msg'))$('msg').textContent=r.error;window.scrollTo(0,0);return}
  D=r;DR=null;
  if(ctx==='onboard'){TAB='today';window.scrollTo(0,0)}
  toast(r.kept?'Saved ✓ Today’s ticked tasks stay; the new plan applies from tomorrow.':'Plan saved ✓');
  buildNav();render();
}
function saveProfile(){
  const s=loadState();
  s.name=$('stName').value.trim();s.email=$('stEmail').value.trim();s.aiKey=$('stAiKey').value.trim();
  saveState(s);DR=null;D=null;toast('Profile saved ✓');render();
}

/* ---------- Today screen ---------- */
function rToday(s,st,day){
  const ord=validOrder(day.ord||s.order);
  const activePage=day.n?(day.n.pages?day.n.pages[0]:day.n.a):(day.r[0]?(day.r[0].pages?day.r[0].pages[0]:day.r[0].a):nextSeqPage(s));
  const activeSurah=surahOf(activePage);
  const activeJuz=juzOf(activePage);
  const activeHizb=hzLast(activePage);

  const tasks=[];
  if(day.n){
    const nOrd=validOrder(day.n.ord||ord);
    const nPages=Array.isArray(day.n.pages)&&day.n.pages.length?day.n.pages:rangeArr(day.n.a,Math.ceil(day.n.b));
    const subs=day.n.subs||{};
    const sp=(k,cls,label,act)=>`<span class="pl ${cls} ${subs[k]?'on':''}" onclick="event.stopPropagation();${act}">${subs[k]?'✓ ':''}${label}</span>`;
    let pills='';
    if(s.method==='tikrar'){
      if(s.frontier>0)pills+=sp('yest','c0','Yesterday 5x',"call('tickSub','yest')");
      pills+=sp('listen','c1','Listen 3x',"call('tickSub','listen')");
      pills+=sp('tafsir','c2','Tafsir',"call('tickSub','tafsir')");
      pills+=sp('repeat','c3',`Repeat ${day.n.repTarget||40}x`,subs.repeat?"call('tickSub','repeat')":`jumpToTasbih(${day.n.repTarget||40})`);
      pills+=sp('record','c4','Record 3x',subs.record?"call('tickSub','record')":"setTab('recite')");
    }
    pills+=`<a class="pl c0" href="https://quran.com/page/${nPages[0]}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Mushaf ↗</a>`;
    const newAmt=s.newPerDay===0.5?'½ new page':`${s.newPerDay} new ${s.newPerDay===1?'page':'pages'}`;
    tasks.push({
      key:'n',done:day.n.done,title:'Memorize',
      sub:`${newAmt} · ${esc(locLabelPages(nPages))} (${rngUnits(day.n.uA,day.n.uB,day.n.useHalf,nOrd)})`,
      pills
    });
  }
  if(day.sb){
    const sbOrd=validOrder(day.sb.ord||ord);
    const sbRng=day.sb.uA&&day.sb.uB?rngUnits(day.sb.uA,day.sb.uB,day.sb.useHalf,sbOrd):fmtPageList(day.sb.pages||rangeArr(day.sb.a,day.sb.b));
    const sbCount=day.sb.uA&&day.sb.uB?(day.sb.uB-day.sb.uA+1)/2:(day.sb.pages?day.sb.pages.length:Math.abs(day.sb.b-day.sb.a)+1);
    const isConn=s.method==='tikrar';
    const pills=(isConn?'<span class="pl soft">Ar-Rabt</span><span class="pl soft">From memory</span>':'<span class="pl soft">Steps every 6 days</span>')
      +`<a class="pl c0" href="https://quran.com/page/${day.sb.a}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Mushaf ↗</a>`;
    tasks.push({key:'sb',done:day.sb.done,title:isConn?'Recent connection':'Recent revision',sub:`${sbRng} · ${sbCount} ${sbCount===1?'page':'pages'}`,pills});
  }
  day.r.forEach((t,i)=>{
    const rOrd=validOrder(t.ord||ord);
    if(t.isTikrar){
      tasks.push({
        key:'r'+i,done:t.done,title:`Old revision · Tour #${t.tourNum}`,
        sub:`${rngUnits(t.uA,t.uB,t.useHalf,rOrd)} · Day ${t.tourDay} of 6`,
        pills:`<span class="pl soft">6-day circuit</span><a class="pl c0" href="https://quran.com/page/${t.a}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Mushaf ↗</a>`
      });
    }else{
      const rPages=Array.isArray(t.pages)&&t.pages.length?t.pages:rangeArr(t.a,t.b);
      const listStr=fmtPageList(rPages);
      const shortRange=listStr.replace(/^Pages?\s+/,'');
      const title=s.method==='ottoman'?`Ottoman cycle ${t.c+1}`:`Juz ${t.j} revision`;
      const sub=s.method==='ottoman'?`Juz ${t.j} · ${chunkName(t.n)} (${shortRange})`:`${listStr} · ${chunkName(t.n)}`;
      tasks.push({
        key:'r'+i,done:t.done,title,sub,
        pills:`<span class="pl soft">Cycle ${t.c+1}/${s.chunks.length}</span><span class="pl soft">Period ${t.p}</span><a class="pl c0" href="https://quran.com/page/${rPages[0]}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()">Mushaf ↗</a>`
      });
    }
  });

  const doneCount=tasks.filter(x=>x.done).length;
  const totalCount=tasks.length;
  const isFull=totalCount>0 && doneCount===totalCount;
  const kicker=day.n
    ?`New ${rngUnits(day.n.uA,day.n.uB,day.n.useHalf,day.n.ord||ord)}`
    :`${memCount(s)} / ${TOTAL} pages · ${completedJuzCount(s)} / 30 Juz`;

  setHdr(`<div class="row"><h1 class="brand light">My Companion</h1><div class="row" style="gap:8px"><span class="mu">🔥 ${st.streak}d</span>${themeBtn(s)}</div></div>`);

  let h=`<div class="hero-em">
    <div style="min-width:0">
      <div class="hero-kicker">${esc(kicker)}</div>
      <div class="hero-title">Surah ${esc(activeSurah)}</div>
      <div class="hero-sub">Juz ${activeJuz} · Hizb ${activeHizb}${s.name?' · '+esc(s.name):''}</div>
    </div>
    ${heroRing(doneCount,totalCount)}
  </div>

  <div class="tools-grid3">
    <div class="tool-tile" onclick="setTab('tasbih')"><div class="tool-ico">${ic('tasbih')}</div><b>Tasbih</b></div>
    <div class="tool-tile" onclick="setTab('recite')"><div class="tool-ico">${ic('mic')}</div><b>Recite</b></div>
    <div class="tool-tile" onclick="setTab('library')"><div class="tool-ico">${ic('lib')}</div><b>Library</b></div>
  </div>

  <div class="sec-lbl">Today’s plan</div>`;

  if(!tasks.length){
    h+=`<div class="card mu">Nothing planned yet. Open <b>Settings</b> to set your plan.</div>`;
  }else{
    h+=tasks.map(t=>`<div class="tcard ${t.done?'done':''}" onclick="call('tick','${t.key}')">
      <div style="flex:1;min-width:0">
        <div class="ttl">${esc(t.title)}</div>
        <div class="tsub mu">${t.sub}</div>
        ${t.pills?`<div class="pills">${t.pills}</div>`:''}
      </div>
      <div class="chk">${t.done?'✓':''}</div>
    </div>`).join('');
  }

  if(day.u.length){
    h+=`<div class="row" style="margin:2px 4px 12px"><span style="font-weight:650;color:var(--ac)">${isFull?'✅ All done today, māshā’Allāh!':''}</span><button class="g sm" onclick="call('tick','${day.u[day.u.length-1]}')">Undo last tick</button></div>`;
  }

  $('app').innerHTML=h;
}

/* ---------- Tools Hub ---------- */
function rTools(){
  $('app').innerHTML=`<div class="card">
    <h2>Study Tools</h2>
    <div class="mu" style="margin-bottom:12px">Quick access to repetition counting, voice practice, and your lessons & offline media.</div>
    <div class="goal" onclick="setTab('tasbih')">${ic('tasbih')}<div style="flex:1"><b>Tasbih & Repetition</b><div class="mu">Count ayah repetitions or dhikr</div></div><span class="mu">→</span></div>
    <div class="goal" onclick="setTab('recite')">${ic('mic')}<div style="flex:1"><b>Recite Studio</b><div class="mu">Record recitations and review notes offline</div></div><span class="mu">→</span></div>
    <div class="goal" onclick="setTab('library')">${ic('lib')}<div style="flex:1"><b>Library & Vault</b><div class="mu">Rich notes, lessons and offline media</div></div><span class="mu">→</span></div>
  </div>`;
}

/* ---------- Settings screen ---------- */
function rSettings(s){
  const cols=[['emerald','#1f5f4a'],['blue','#2563eb'],['gold','#a16207'],['plum','#7c3aed']];
  setHdr(`<div class="row"><h1 class="brand light">Settings</h1>${themeBtn(s)}</div><div class="tagline">Your plan, profile and backup</div>`);
  $('app').innerHTML=`
    ${typeof accountCardHtml==='function'?accountCardHtml():''}
    ${planForm('settings')}

    <div class="card" style="margin-top:14px"><details>
      <summary>📚 Study methods explained</summary>
      <div style="font-size:13.5px;line-height:1.6;margin-top:10px">
        <p><b>🕌 Madinah Tikrar.</b> Each day: recite yesterday’s portion 5×, listen 3×, read the tafsir, repeat the new portion 40× (30× on 3 pages), and record yourself 3×. Then recite the last ~25 days from memory (connection) and revise older pages in a 6-day circuit.</p>
        <p><b>🌙 Ottoman Cycles.</b> Each day revise the last pages of one juz, moving juz by juz up to where you are. Cycle 1 = last 5 pages of each juz, cycle 2 = last 10, cycle 3 = last 15, cycle 4 = the whole juz. Then a new period starts.</p>
        <p><b>✨ Simple Daily.</b> Your daily new pages, a few recent pages, and a steady juz rotation. Change the sizes in Advanced fine-tuning.</p>
        <p><b>↕️ Direction Support.</b> All three methods work in Forward (Juz 1 → 30), Juz Reverse (Juz 30 → 1, forward inside each Juz), or Page Reverse (Page 604 → 1).</p>
        <p class="mu" style="border-top:1px solid var(--bd);padding-top:10px;margin-top:10px">Method credit: The Tikrar preset is inspired by the memorization, connectivity, and 6-day review circuit structure from <a href="https://www.tikrar.net" target="_blank" rel="noopener noreferrer" style="color:var(--ac);font-weight:700">Tikrar.net ↗</a>. My Companion is an independent study tracker and is not officially affiliated with or endorsed by Tikrar.</p>
      </div>
    </details></div>

    <div class="card"><h2>🔍 Display size</h2>
      <label class="f" style="margin-top:0">Text size</label>
      <div class="pace">${[['s','Small'],['m','Medium'],['l','Large']].map(x=>`<span class="${(s.uiText||'m')===x[0]?'on':''}" onclick="setUi('uiText','${x[0]}')">${x[1]}</span>`).join('')}</div>
      <label class="f">Task card &amp; tick box size</label>
      <div class="pace">${[['s','Small'],['m','Medium'],['l','Large']].map(x=>`<span class="${(s.uiCard||'m')===x[0]?'on':''}" onclick="setUi('uiCard','${x[0]}')">${x[1]}</span>`).join('')}</div>
    </div>

    <div class="card"><h2>👤 Profile & Appearance</h2>
      <div class="row" style="justify-content:flex-start;gap:14px;margin-bottom:10px">
        <div class="avatar avatar-lg">${s.avatar?`<img src="${s.avatar}" alt="">`:initials(s.name)}</div>
        <div>
          <button class="sm" onclick="$('avInp').click()">Upload photo</button>
          ${s.avatar?`<button class="g sm" style="margin-left:6px" onclick="removeAvatar()">Remove</button>`:''}
          <input type="file" id="avInp" accept="image/*" style="display:none" onchange="uploadAvatar(this)">
        </div>
      </div>
      <div class="two">
        <div><label class="f">Your name</label><input type="text" id="stName" value="${esc(s.name)}"></div>
        <div><label class="f">Your email</label><input type="email" id="stEmail" value="${esc(s.email)}"></div>
      </div>
      <label class="f">Optional Gemini API key (<a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" style="color:var(--ac)">get a free key ↗</a>)</label>
      <input type="text" id="stAiKey" placeholder="AIza..." value="${esc(s.aiKey||'')}">
      <label class="f">App colour</label>
      <div class="swatches">${cols.map(c=>`<div class="swatch ${s.color===c[0]?'on':''}" style="background:${c[1]}" onclick="setColor('${c[0]}')"></div>`).join('')}</div>
      <button style="width:100%;margin-top:14px" onclick="saveProfile()">Save profile</button>
      <div class="two" style="margin-top:10px">
        <button class="g sm" onclick="enableReminder()">🔔 Daily alert</button>
        <button class="g sm" onclick="sendEmailSummary()">✉️ Email summary</button>
      </div>
    </div>

    <div class="card"><h2>⚡ Quick actions & backup</h2>
      <label class="f">Add extra memorized pages</label>
      <div class="row"><input type="number" step="0.5" id="ad" value="1" style="width:90px"><button class="sm" onclick="call('addPages',$('ad').value)">Add pages</button></div>
      <label class="f" style="margin-top:14px">Backup data (last backup: ${s.lastBackup||'never'})</label>
      <div class="two"><button onclick="exportData()">Export backup</button><button class="g" onclick="$('imp').click()">Import backup</button></div>
      <input type="file" id="imp" accept=".json,application/json" style="display:none" onchange="importData(this)">
      <div class="mu" style="margin-top:6px">The backup holds your plan, progress and notes. Recordings and vault files stay on this phone.</div>
      <button class="d" style="width:100%;margin-top:16px" onclick="if(confirm('Delete ALL your data?')){resetAll()}">Reset everything</button>
    </div>

    <div class="tg-banner">
      <div style="font-size:15px;font-weight:800">📢 My Companion Community & Updates</div>
      <div style="font-size:12.5px;opacity:.92;margin-top:3px">Follow our official Telegram channel for updates, tips, or support.</div>
      <div><a href="https://t.me/MyCompanionApp" target="_blank" rel="noopener noreferrer">🚀 Updates channel</a><a href="https://t.me/MyCompanionApp" target="_blank" rel="noopener noreferrer">💡 Request feature</a></div>
    </div>`;
}

async function render(){
  const seq=++RENDER_SEQ;
  if(!D){call('getData');return}
  const s=D.state,st=D.stats,day=D.day;

  if(!s.seenIntro){
    setHdr('');
    $('bottomNav').style.display='none';
    const slides=[
      {ico:'📖',title:'Welcome to My Companion',desc:'Your minimalist daily companion for Qur’an memorization and revision—supporting forward and reverse memorization orders.'},
      {ico:'🏔️',title:'30-Juz Memory Map',desc:'Track every Juz and Surah as strong or weak, and watch your journey rise step-by-step toward a complete Khatmah.'},
      {ico:'🎙️',title:'Tailored to Your Goal',desc:'Choose Hifdh Only, Revision Only, or Both—with built-in Tasbih counter, Voice Studio, and Rich Notes.'}
    ];
    const cur=slides[OB_SLIDE];
    $('app').innerHTML=`<div class="card ob-wrap">
      <div class="row"><span class="pill">Welcome Tour ${OB_SLIDE+1}/3</span><button class="g sm" onclick="skipIntro()">Skip ↗</button></div>
      <div class="ob-art">${cur.ico}</div>
      <h2 style="font-size:19px;margin-bottom:8px">${esc(cur.title)}</h2>
      <div class="mu" style="max-width:360px;margin:0 auto;font-size:13.5px">${esc(cur.desc)}</div>
      <div class="dots">${slides.map((_,i)=>`<div class="dot ${i===OB_SLIDE?'on':''}"></div>`).join('')}</div>
      <div class="row" style="margin-top:10px">
        ${OB_SLIDE>0?`<button class="g" style="flex:1" onclick="OB_SLIDE--;render()">Back</button>`:'<div style="flex:1"></div>'}
        <button style="flex:2" onclick="${OB_SLIDE<2?'OB_SLIDE++;render()':'skipIntro()'}">${OB_SLIDE<2?'Next →':'Set Up My Companion'}</button>
      </div>
    </div>`;
    return;
  }

  if(!s.onboarded){
    $('bottomNav').style.display='none';
    setHdr(`<div class="row"><h1 class="brand">My Companion ${ic('mark')}</h1>${themeBtn(s)}</div><div class="tagline">A gentle path to memorization.</div>`);
    $('app').innerHTML=planForm('onboard');
    return;
  }

  $('bottomNav').style.display='flex';
  if(TAB!=='today'&&TAB!=='settings'){
    const T2={journey:['Stats','Memory strength & progress'],tools:['Tools','Tasbih, Recite & Library'],tasbih:['Tasbih','Count your repetitions'],recite:['Recite','Record and review your recitation'],library:['Library','Notes, lessons and media']}[TAB]||['My Companion',''];
    setHdr(`<div class="row"><h1 class="brand light">${T2[0]}</h1>${themeBtn(s)}</div><div class="tagline">${T2[1]}</div>`);
  }

  if(TAB==='today'){rToday(s,st,day)}
  else if(TAB==='tools'){rTools()}
  else if(TAB==='journey'){
    const mem=memCount(s), pct=Math.round(mem/604*100), juzDone=completedJuzCount(s);
    const activeJuz=juzOf(nextSeqPage(s));
    const isFwd=validOrder(s.order)==='fwd';
    const pathJuz=[];
    if(isFwd){for(let j=30;j>=1;j--)pathJuz.push(j)}
    else{for(let j=1;j<=30;j++)pathJuz.push(j)}

    let pathHtml=`<div class="summit-crown">
      <div class="summit-badge">👑</div>
      <div style="font-weight:800;font-size:15px">The Radiant Summit · Khatmah</div>
      <div class="mu">“Read and ascend, for your station will be at the last verse you recite.”</div>
    </div><div class="path-container">`;

    pathJuz.forEach((j,idx)=>{
      const stepNum=30-idx;
      const fill=Math.round(st.juz[j-1]*100);
      const isClimbed=fill===100;
      const isCurrent=(j===activeJuz && !isClimbed) || (idx===0 && s.frontier>=TOTAL);
      const cls=isCurrent?'current':(isClimbed?'climbed':'');
      pathHtml+=`<div class="path-node ${cls}">
        <div class="node-bubble">${isClimbed?'✓':j}</div>
        <div class="node-info">
          <div class="row">
            <b>Juz ${j} · Step ${stepNum} of 30</b>
            ${isCurrent?`<span class="pill">Current · ${fill}%</span>`:`<span class="mu">${fill}%</span>`}
          </div>
          <div class="mu">Surah: ${esc(juzSurahRange(j))}</div>
        </div>
      </div>`;
    });
    pathHtml+=`</div>`;

    $('app').innerHTML=strengthCard(s)+`
    <div class="card"><div class="row"><h2 style="margin:0">Last 28 Days Consistency</h2><span class="mu">🔥 ${st.streak}d streak</span></div><div class="strip">`+
      st.strip.map(x=>`<div class="s s${x.s}" title="${x.d}"></div>`).join('')+
    `</div></div>
    <details class="card">
      <summary>🏔️ 30-Juz Ascension Path · ${juzDone} of 30 Juz (${pct}%)</summary>
      <div class="row mu" style="margin-top:10px">
        <span>Memorized: <b>${mem} / 604 pages</b></span>
        <span>${st.eta?'Est. finish: '+fmt(st.eta):'All 30 Juz'}</span>
      </div>
      <div class="winding-map">${pathHtml}</div>
    </details>`;
  }
  else if(TAB==='tasbih'){
    const count=s.tasbih||0, target=s.tasbihTarget||40;
    const isAyah=s.tasbihMode==='ayah';
    const phrases=['SubḥānAllāh','Alḥamdulillāh','Allāhu Akbar','Astaghfirullāh','Lā ilāha illā Allāh'];
    const themes=[['emerald','Emerald'],['midnight','Midnight'],['sand','Warm Sand'],['gold','Royal Gold'],['ocean','Deep Ocean']];

    $('app').innerHTML=`<div class="row" style="margin-bottom:8px"><button class="g sm" onclick="setTab('tools')">← Tools</button></div>
    <div class="tasbih-stage t-theme-${s.tasbihTheme||'emerald'}">
      <div class="row">
        <div>
          <span class="pill">${isAyah?'📖 Ayah Repetition Mode':'📿 Dhikr / Tasbih Mode'}</span>
          <div style="font-weight:750;font-size:15px;margin-top:4px">${isAyah?'Repeating Current Portion':esc(s.tasbihPhrase)}</div>
        </div>
        <button class="g sm" style="font-size:16px;padding:5px 11px;background:rgba(255,255,255,.15);color:inherit" onclick="T_MENU=!T_MENU;render()">⋮</button>
      </div>

      ${T_MENU?`<div class="pop-menu">
        <div class="row" style="margin-bottom:8px"><b>Counter Options</b><button class="g sm" onclick="T_MENU=false;render()">✕</button></div>
        <label class="f">Counter Purpose</label>
        <div class="two">
          <button class="${isAyah?'':'g'} sm" onclick="setTasbihMode('ayah')">Ayah Repeat</button>
          <button class="${!isAyah?'':'g'} sm" onclick="setTasbihMode('dhikr')">Dhikr / Tasbih</button>
        </div>
        ${!isAyah?`<label class="f">Select Dhikr</label>
          <select onchange="setTasbihPhrase(this.value)">
            ${phrases.map(p=>`<option value="${esc(p)}" ${s.tasbihPhrase===p?'selected':''}>${esc(p)}</option>`).join('')}
          </select>`:''}
        <label class="f">Target Count</label>
        <div class="cyc">
          ${[5,20,30,33,40,100].map(p=>`<span class="cy ${target===p?'on':''}" onclick="setTasbihTarget(${p})">${p}x</span>`).join('')}
        </div>
        <label class="f">Counter Theme</label>
        <div class="cyc">
          ${themes.map(th=>`<span class="cy ${s.tasbihTheme===th[0]?'on':''}" onclick="setTasbihTheme('${th[0]}')">${th[1]}</span>`).join('')}
        </div>
        <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)" class="row">
          <span class="mu">Lifetime taps: <b>${s.tasbihTotal||0}</b></span>
          <button class="g sm" onclick="resetTasbihLifetime()">Reset</button>
        </div>
      </div>`:''}

      <div class="tasbih-center">
        <button class="tasbih-orb" onclick="tapTasbih()">
          <span class="tasbih-num">${count}</span>
          <span class="tasbih-sub">${count>=target?'🎉 Target Reached!':'Target: '+target}</span>
        </button>
        <div class="mu" style="color:inherit;opacity:.75">Tap anywhere in the circle to count</div>
      </div>

      <div class="row">
        <button class="g sm" style="background:rgba(255,255,255,.14);color:inherit" onclick="resetTasbih()">↺ Reset Current</button>
        <span style="font-size:12px;opacity:.8">Target: ${target}</span>
      </div>
    </div>`;
  }
  else if(TAB==='recite'){
    await initMics();
    const clips=await loadClips();
    if(seq!==RENDER_SEQ)return;
    const formats=[
      ['','Auto (Best Supported)'],
      ['audio/webm;codecs=opus','WebM / High-Clarity Opus'],
      ['audio/mp4','MP4 / AAC (iOS & Mobile)'],
      ['audio/wav','WAV Audio']
    ];
    $('app').innerHTML=`<div class="row" style="margin-bottom:8px"><button class="g sm" onclick="setTab('tools')">← Tools</button></div>
    <div class="card" style="text-align:center">
      <div class="row"><h2>🎙️ Voice Recitation Studio</h2><button class="g sm" onclick="$('audUp').click()">+ Upload Audio</button></div>
      <input type="file" id="audUp" accept="audio/*" style="display:none" onchange="uploadAudioClip(this)">
      <div class="mu">Record yourself reciting the memorized portion 3 times from memory, then listen back while checking the Mushaf.</div>
      <button class="rec-btn ${isRecording?'d':''}" onclick="toggleRecord()">${isRecording?'⏹':'●'}</button>
      <div style="font-weight:700;font-size:13px;color:${isRecording?'#b91c1c':'var(--ac)'}">${isRecording?'Recording... Tap to Stop & Save':'Tap to Record'}</div>

      <details style="margin-top:12px;text-align:left">
        <summary style="font-size:12.5px;color:var(--mu)">⚙️ Microphone & Format Options</summary>
        <div class="two" style="margin-top:8px">
          <div>
            <label class="f">Microphone Input</label>
            <select onchange="selectedMic=this.value">
              <option value="">Default Microphone</option>
              ${audioDevices.map((d,i)=>`<option value="${esc(d.deviceId)}" ${selectedMic===d.deviceId?'selected':''}>${esc(d.label||'Mic '+(i+1))}</option>`).join('')}
            </select>
          </div>
          <div>
            <label class="f">Recording Format</label>
            <select onchange="selectedMime=this.value">
              ${formats.map(f=>`<option value="${f[0]}" ${selectedMime===f[0]?'selected':''}>${esc(f[1])}</option>`).join('')}
            </select>
          </div>
        </div>
      </details>
    </div>

    <div class="card"><h2>Saved Recitations (${clips.length})</h2>
      ${clips.length?clips.map(c=>{
        const url=getObjUrl('clip-'+c.id,c.blob);
        return `<div class="media-box" style="margin-bottom:10px">
          <div class="row"><b>${esc(c.label)}</b><span class="mu">${esc(c.date)}</span></div>
          ${c.note?`<div style="font-size:12.5px;background:var(--ac2);color:var(--ac);padding:6px 9px;border-radius:8px;margin-top:6px">📌 ${esc(c.note)}</div>`:''}
          <audio controls src="${url}" style="width:100%;height:36px;margin-top:8px"></audio>
          <div class="row" style="margin-top:8px;justify-content:flex-end;gap:6px">
            <button class="g sm" onclick="editClipNote(${c.id})">✏️ Note</button>
            <button class="g sm" onclick="shareClip(${c.id})">📤 Share</button>
            <button class="g sm" onclick="deleteClip(${c.id})">🗑️</button>
          </div>
        </div>`;
      }).join(''):'<div class="mu">No recordings yet. Tap record above or upload an existing recitation.</div>'}
    </div>`;
  }
  else if(TAB==='library'){
    const notes=loadNotes();
    const vault=await loadVault();
    if(seq!==RENDER_SEQ)return;
    const allFolders=['All',...s.folders];
    const filteredNotes=s.libFilter==='All'?notes:notes.filter(n=>n.cat===s.libFilter);
    const filteredVault=s.libFilter==='All'?vault:vault.filter(v=>v.folder===s.libFilter);
    const totalVaultMB=(vault.reduce((a,b)=>a+(b.size||0),0)/(1024*1024)).toFixed(1);

    let h=`<div class="row" style="margin-bottom:8px"><button class="g sm" onclick="setTab('tools')">← Tools</button></div>
    <div class="card">
      <div class="row">
        <h2>📂 Study Library & Lessons</h2>
        <div class="row" style="gap:6px">
          <button class="${s.libSubTab==='notes'?'':'g'} sm" onclick="setLibSubTab('notes')">📝 Lessons (${notes.length})</button>
          <button class="${s.libSubTab==='vault'?'':'g'} sm" onclick="setLibSubTab('vault')">🎞️ Vault (${vault.length})</button>
        </div>
      </div>
      <div class="cyc" style="margin-top:8px">
        ${allFolders.map(c=>`<span class="cy ${s.libFilter===c?'on':''}" onclick="setLibFilter(decodeURIComponent('${encAttr(c)}'))">${esc(c)}</span>`).join('')}
        <span class="cy" onclick="addFolder()">+ Folder</span>
      </div>
    </div>`;

    if(s.libSubTab==='notes'){
      h+=`<div class="card">
        <div class="row">
          <b>${EDIT_NOTE_ID?'✏️ Editing Lesson / Note':'✨ Create Lesson or Rich Note'}</b>
          <button class="sm" onclick="SHOW_COMPOSER=!SHOW_COMPOSER;EDIT_NOTE_ID=null;render()">${SHOW_COMPOSER?'Close':'+ New Note'}</button>
        </div>
        ${SHOW_COMPOSER?`<div style="margin-top:12px">
          <div class="two">
            <div><label class="f">Lesson / Note Title</label><input type="text" id="ntTitle" placeholder="e.g., Noon Sakinah"></div>
            <div><label class="f">Folder</label>
              <select id="ntCat">${s.folders.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select>
            </div>
          </div>
          <label class="f">Optional Video / Photo / Reference Link</label>
          <input type="text" id="ntLink" placeholder="https://youtube.com/...">

          <label class="f">Rich Text & Table Editor</label>
          <div class="rt-bar">
            <select onchange="execRT('fontName',this.value)">
              <option value="system-ui">Sans</option>
              <option value="Georgia,serif">Serif</option>
              <option value="'Amiri','Traditional Arabic',serif">Arabic / Quranic</option>
            </select>
            <select onchange="execRT('fontSize',this.value)">
              <option value="2">Small</option>
              <option value="3" selected>Normal</option>
              <option value="4">Large</option>
              <option value="5">Heading</option>
            </select>
            <button class="g sm" onclick="execRT('bold')"><b>B</b></button>
            <button class="g sm" onclick="execRT('italic')"><i>I</i></button>
            <button class="g sm" onclick="execRT('underline')"><u>U</u></button>
            <button class="g sm" onclick="execRT('insertUnorderedList')">• List</button>
            <button class="g sm" onclick="insertRTTable()">⊞ Table</button>
            <button class="g sm" onclick="$('rtImgInp').click()">🖼️ Photo</button>
            <button class="sm" onclick="polishNoteAI()">✨ Polish</button>
          </div>
          <input type="file" id="rtImgInp" accept="image/*" style="display:none" onchange="attachInlinePhoto(this)">
          <div id="rtEditor" class="rt-area" contenteditable="true" placeholder="Write your lesson or paste verses..."></div>
          <button style="width:100%;margin-top:10px" onclick="saveRichNote()">💾 Save Lesson / Note</button>
        </div>`:''}
      </div>`;

      h+=filteredNotes.length?filteredNotes.map(n=>{
        const yt=ytEmbedUrl(n.link);
        const safeLink=safeExternalUrl(n.link);
        const isImg=safeLink && /\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(safeLink);
        return `<div class="card">
          <div class="row"><span class="pill">${esc(n.cat||'Lesson')}</span><span class="mu">${esc(n.date)}</span></div>
          <h2 style="margin:6px 0">${esc(n.title)}</h2>
          ${yt?`<iframe src="${yt}" style="width:100%;height:200px;border:0;border-radius:12px;margin:6px 0" allowfullscreen></iframe>`:''}
          ${isImg?`<img src="${esc(safeLink)}" style="max-width:100%;border-radius:10px;margin:6px 0">`:''}
          ${safeLink&&!yt&&!isImg?`<div style="margin:4px 0"><a href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer" style="color:var(--ac);font-size:12.5px;font-weight:700">🔗 Open Resource Link ↗</a></div>`:''}
          <div style="font-size:13.5px;line-height:1.55;margin-top:8px;overflow-x:auto">${sanitizeHtml(n.html||esc(n.body||''))}</div>
          <div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd);flex-wrap:wrap;gap:6px">
            <div class="row" style="gap:5px">
              <button class="g sm" onclick="editNote(${n.id})">✏️ Edit</button>
              <button class="g sm" onclick="delNote(${n.id})">🗑️</button>
            </div>
            <div class="row" style="gap:5px">
              <button class="g sm" onclick="exportNoteDoc(${n.id},'pdf')">📄 PDF</button>
              <button class="g sm" onclick="exportNoteDoc(${n.id},'doc')">📝 Word</button>
              <button class="g sm" onclick="exportNoteDoc(${n.id},'share')">📤 Share/Drive</button>
            </div>
          </div>
        </div>`;
      }).join(''):`<div class="card mu">No lessons or notes in this folder yet. Tap <b>+ New Note</b> above to create one!</div>`;
    }else{
      h+=`<div class="card">
        <div class="row">
          <div><b>🎞️ Offline Media Vault</b><div class="mu">Store photos, videos & audio offline (${totalVaultMB} MB used)</div></div>
          <button class="sm" onclick="$('vaultInp').click()">+ Upload File</button>
        </div>
        <div style="margin-top:8px">
          <label class="f">Save Uploaded File Into Folder:</label>
          <select id="vaultFolderSel">${s.folders.map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select>
        </div>
        <input type="file" id="vaultInp" accept="image/*,video/*,audio/*" style="display:none" onchange="uploadVaultMedia(this)">
      </div>`;

      h+=filteredVault.length?`<div class="media-grid">`+filteredVault.map(v=>{
        const url=getObjUrl('vault-'+v.id,v.blob);
        const tp=v.type||'';
        let mediaEl='';
        if(tp.startsWith('image/'))mediaEl=`<img src="${url}" onclick="window.open('${url}','_blank','noopener,noreferrer')">`;
        else if(tp.startsWith('video/'))mediaEl=`<video controls src="${url}"></video>`;
        else mediaEl=`<audio controls src="${url}" style="width:100%"></audio>`;
        return `<div class="media-box">
          <span class="pill">${esc(v.folder||'Media')}</span>
          <div style="font-weight:700;font-size:13px;margin:4px 0">${esc(v.title)}</div>
          ${mediaEl}
          <div class="row" style="margin-top:6px">
            <span class="mu">${((v.size||0)/(1024*1024)).toFixed(1)} MB</span>
            <button class="g sm" onclick="deleteVaultItem(${v.id})">🗑️</button>
          </div>
        </div>`;
      }).join('')+`</div>`:`<div class="card mu">No offline media files in this folder yet. Tap <b>+ Upload File</b> to save files for offline study.</div>`;
    }
    $('app').innerHTML=h;
  }
  else if(TAB==='settings'){rSettings(s)}
}

document.addEventListener('visibilitychange',()=>{if(!document.hidden){DR=null;D=null;render()}});
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
buildNav();
render();
