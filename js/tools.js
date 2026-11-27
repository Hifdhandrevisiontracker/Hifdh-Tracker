/* ==========================================================================
   My Companion — Tools: Tasbih, Recite Studio, Library & Vault (Step 7)
   ========================================================================== */

/* ---------------------------- In-app form dialog ---------------------------
   Replaces the browser's prompt() boxes. Resolves with the values or null.  */
function formModal({title,sub,fields,okLabel}){
  return new Promise(resolve=>{
    const root=$('modalRoot');
    root.innerHTML=`<div class="modal-bg" onclick="window._fmDone(null)">
      <form class="modal-card sheet" role="dialog" aria-modal="true" aria-label="${esc(title)}" onclick="event.stopPropagation()" onsubmit="event.preventDefault();window._fmDone(true)">
        <h2 style="margin:0 0 4px">${esc(title)}</h2>
        ${sub?`<div class="mu" style="margin-bottom:8px">${esc(sub)}</div>`:''}
        ${fields.map((f,i)=>`<label class="f" for="fm${i}">${esc(f.label)}</label>${
          f.options
            ?`<select id="fm${i}">${f.options.map(o=>`<option value="${esc(o[0])}" ${o[0]===f.value?'selected':''}>${esc(o[1])}</option>`).join('')}</select>`
            :`<input id="fm${i}" type="text" dir="auto" maxlength="${f.max||120}" value="${esc(f.value||'')}" placeholder="${esc(f.placeholder||'')}">`
        }`).join('')}
        <div class="two" style="margin-top:16px">
          <button type="button" class="g" onclick="window._fmDone(null)">${esc(t('btn_cancel'))}</button>
          <button type="submit">${esc(okLabel||t('btn_save'))}</button>
        </div>
      </form>
    </div>`;
    window._fmDone=ok=>{
      const vals=ok?fields.map((f,i)=>{const el=$('fm'+i);return el?String(el.value||'').trim():''}):null;
      delete window._fmDone;closeModal();resolve(vals);
    };
    setTimeout(()=>{const el=$('fm0');if(el&&el.tagName==='INPUT'){el.focus();el.select()}},60);
  });
}

/* Default topic names are stored in English but shown in the app language. */
const DEFAULT_FOLDERS={'Tajweed Lessons':'fold_tajweed','Mutashabihat':'fold_mutash','Tafsir & Reflections':'fold_tafsir'};
const folderLabel=f=>f==='All'?t('lib_all'):(DEFAULT_FOLDERS[f]?t(DEFAULT_FOLDERS[f]):f);

async function addFolder(){
  const v=await formModal({title:t('lib_new_topic'),fields:[{label:t('lib_topic_name'),placeholder:t('lib_topic_ph'),max:40}],okLabel:t('lib_add')});
  if(!v||!v[0])return;
  const s=loadState();
  if(!s.folders.includes(v[0]))s.folders.push(v[0]);
  s.libFilter=v[0];
  saveState(s);ensureData().state=s;render();
}

/* Show how much phone storage the app uses (when the browser can tell). */
let STORAGE_INFO=null;
async function refreshStorageInfo(){
  try{if(navigator.storage&&navigator.storage.estimate){const e=await navigator.storage.estimate();STORAGE_INFO={used:e.usage||0,quota:e.quota||0}}}catch(e){}
}
const mb=b=>(b/(1024*1024)).toFixed(b<10*1024*1024?1:0);

/* ================================ Tasbih ================================== */
function tasbihPortionLabel(){
  try{const d=D&&D.day;if(d&&d.n)return rngUnits(d.n.uA,d.n.uB,d.n.useHalf,d.n.ord||D.state.order)}catch(e){}
  return '';
}
/* Counting updates only the number and the ring — no full redraw, so taps feel instant. */
function paintTasbih(s){
  const count=s.tasbih||0, target=s.tasbihTarget||40;
  const n=$('tasbihNum'), sub=$('tasbihSub'), ring=$('tasbihRing'), life=$('tasbihLife');
  if(!n){render();return}
  n.textContent=count;
  sub.textContent=count>=target?'🎉 '+t('tb_reached'):t('tb_target',{n:target});
  if(ring)ring.style.setProperty('--p',Math.min(100,count/target*100).toFixed(1));
  if(life)life.textContent=s.tasbihTotal||0;
  const orb=$('tasbihOrb');if(orb){orb.classList.remove('pulse');void orb.offsetWidth;orb.classList.add('pulse')}
}
function tapTasbih(delta=1){
  ensureData();
  const s=loadState();
  const before=s.tasbih||0;
  s.tasbih=Math.max(0,before+delta);
  if(delta>0)s.tasbihTotal=(s.tasbihTotal||0)+1;
  else if(before>0)s.tasbihTotal=Math.max(0,(s.tasbihTotal||0)-1);
  saveState(s);D.state=s;
  const target=s.tasbihTarget||40;
  if(navigator.vibrate&&delta>0)navigator.vibrate(s.tasbih===target?[60,40,60]:(s.tasbih%33===0?35:12));
  if(delta>0&&s.tasbih===target){
    if(s.tasbihMode==='ayah'){try{api.tickSub(T(),'repeat',true);D=api.getData(T())}catch(e){}}
    toast(s.tasbihMode==='ayah'?t('tb_done_ayah',{n:target}):t('tb_done_dhikr',{n:target}),3500);
  }
  paintTasbih(s);
}
function resetTasbih(){ensureData();const s=loadState();s.tasbih=0;saveState(s);D.state=s;paintTasbih(s)}
function resetTasbihLifetime(){
  if(!confirm(t('tb_reset_life_confirm')))return;
  ensureData();const s=loadState();s.tasbihTotal=0;saveState(s);D.state=s;render();
}
function setTasbihTarget(v){ensureData();const s=loadState();s.tasbihTarget=Math.max(1,Math.min(9999,parseInt(v,10)||33));saveState(s);D.state=s;render()}
async function customTasbihTarget(){
  const v=await formModal({title:t('tb_custom_target'),fields:[{label:t('tb_target_lbl'),value:String(loadState().tasbihTarget||33),max:4}]});
  if(v&&parseInt(v[0],10)>0)setTasbihTarget(v[0]);
}
function setTasbihMode(m){ensureData();const s=loadState();s.tasbihMode=m;s.tasbih=0;s.tasbihTarget=m==='ayah'?40:33;saveState(s);D.state=s;render()}
function setTasbihPhrase(p){ensureData();const s=loadState();s.tasbihPhrase=p;saveState(s);D.state=s;render()}
function setTasbihTheme(th){ensureData();const s=loadState();s.tasbihTheme=th;saveState(s);D.state=s;render()}

const TASBIH_PHRASES=[
  ['SubḥānAllāh','سُبْحَانَ ٱللَّٰهِ'],['Alḥamdulillāh','ٱلْحَمْدُ لِلَّٰهِ'],['Allāhu Akbar','ٱللَّٰهُ أَكْبَرُ'],
  ['Astaghfirullāh','أَسْتَغْفِرُ ٱللَّٰهَ'],['Lā ilāha illā Allāh','لَا إِلَٰهَ إِلَّا ٱللَّٰهُ']
];
function rTasbih(s){
  setHdr(`<div class="sub-hdr">
    <button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="setTab('tools')">←</button>
    <div><h1 class="brand" style="font-size:1.45rem">${esc(t('tb_title'))}</h1><div class="tagline">${esc(t('tb_tag'))}</div></div>
  </div>`);
  const count=s.tasbih||0, target=s.tasbihTarget||40, isAyah=s.tasbihMode==='ayah';
  const phrase=TASBIH_PHRASES.find(p=>p[0]===s.tasbihPhrase)||TASBIH_PHRASES[0];
  const portion=isAyah?tasbihPortionLabel():'';
  const themes=[['emerald','tb_th_emerald'],['midnight','tb_th_midnight'],['sand','tb_th_sand'],['gold','tb_th_gold'],['ocean','tb_th_ocean']];
  $('app').innerHTML=`<div class="tasbih-stage t-theme-${esc(s.tasbihTheme||'emerald')}">
    <div class="row">
      <div style="min-width:0">
        <span class="pill" style="background:rgba(255,255,255,.18);color:#fff">${isAyah?'📖 '+esc(t('tb_mode_ayah')):'📿 '+esc(t('tb_mode_dhikr'))}</span>
        <div class="tb-phrase">${isAyah?esc(portion?t('tb_repeating',{p:portion}):t('tb_repeating_any')):`<span lang="ar" dir="rtl" class="tb-ar">${phrase[1]}</span><span>${esc(phrase[0])}</span>`}</div>
      </div>
      <button class="g sm tb-menu-btn" aria-label="${esc(t('tb_options'))}" aria-expanded="${T_MENU}" onclick="T_MENU=!T_MENU;render()">⋮</button>
    </div>

    ${T_MENU?`<div class="pop-menu">
      <div class="row" style="margin-bottom:8px"><b>${esc(t('tb_options'))}</b><button class="g sm" aria-label="${esc(t('btn_close'))}" onclick="T_MENU=false;render()">✕</button></div>
      <label class="f">${esc(t('tb_purpose'))}</label>
      <div class="two">
        <button class="${isAyah?'':'g'} sm" onclick="setTasbihMode('ayah')">${esc(t('tb_mode_ayah'))}</button>
        <button class="${!isAyah?'':'g'} sm" onclick="setTasbihMode('dhikr')">${esc(t('tb_mode_dhikr'))}</button>
      </div>
      ${!isAyah?`<label class="f">${esc(t('tb_choose_dhikr'))}</label>
        <select onchange="setTasbihPhrase(this.value)">${TASBIH_PHRASES.map(p=>`<option value="${esc(p[0])}" ${s.tasbihPhrase===p[0]?'selected':''}>${esc(p[0])} — ${p[1]}</option>`).join('')}</select>`:''}
      <label class="f">${esc(t('tb_target_lbl'))}</label>
      <div class="cyc">
        ${[7,20,33,40,100].map(p=>`<span class="cy ${target===p?'on':''}" onclick="setTasbihTarget(${p})">${p}×</span>`).join('')}
        <span class="cy ${[7,20,33,40,100].includes(target)?'':'on'}" onclick="customTasbihTarget()">${[7,20,33,40,100].includes(target)?esc(t('tb_other')):target+'×'}</span>
      </div>
      <label class="f">${esc(t('tb_theme'))}</label>
      <div class="cyc">${themes.map(th=>`<span class="cy ${s.tasbihTheme===th[0]?'on':''}" onclick="setTasbihTheme('${th[0]}')">${esc(t(th[1]))}</span>`).join('')}</div>
      <div style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)" class="row">
        <span class="mu">${esc(t('tb_lifetime'))}: <b id="tasbihLife">${s.tasbihTotal||0}</b></span>
        <button class="g sm" onclick="resetTasbihLifetime()">${esc(t('tb_reset'))}</button>
      </div>
    </div>`:''}

    <div class="tasbih-center">
      <div class="tb-ring" id="tasbihRing" style="--p:${Math.min(100,count/target*100).toFixed(1)}">
        <button class="tasbih-orb" id="tasbihOrb" aria-label="${esc(t('tb_tap_label'))}" onclick="tapTasbih(1)">
          <span class="tasbih-num" id="tasbihNum" aria-live="polite">${count}</span>
          <span class="tasbih-sub" id="tasbihSub">${count>=target?'🎉 '+esc(t('tb_reached')):esc(t('tb_target',{n:target}))}</span>
        </button>
      </div>
      <div style="font-size:.82rem;opacity:.85">${esc(t('tb_hint'))}</div>
    </div>

    <div class="row">
      <button class="g sm tb-ctl" onclick="resetTasbih()">↺ ${esc(t('tb_reset_current'))}</button>
      <button class="g sm tb-ctl" aria-label="${esc(t('tb_minus'))}" onclick="tapTasbih(-1)"><bdi dir="ltr">−1</bdi></button>
    </div>
  </div>`;
}

/* ============================== Recite Studio ============================== */
let REC_START=0, REC_TIMER=null;
async function initMics(){
  if(!navigator.mediaDevices||!navigator.mediaDevices.enumerateDevices)return;
  try{audioDevices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='audioinput')}catch(e){}
}
const fmtClock=ms=>{const s=Math.floor(ms/1000);return `${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}`};
function paintRecTimer(){const el=$('recTime');if(el)el.textContent=fmtClock(Date.now()-REC_START)}

async function toggleRecord(){
  if(isRecording){stopRecording();return}
  if(!navigator.mediaDevices||!navigator.mediaDevices.getUserMedia||!window.MediaRecorder){toast(t('rc_unsupported'),5000);return}
  try{
    const stream=await navigator.mediaDevices.getUserMedia({audio:selectedMic?{deviceId:{exact:selectedMic}}:true})
      .catch(e=>{if(selectedMic&&e&&e.name==='OverconstrainedError'){selectedMic='';return navigator.mediaDevices.getUserMedia({audio:true})}throw e});
    await initMics();
    recChunks=[];
    const opts={};
    if(selectedMime&&MediaRecorder.isTypeSupported(selectedMime))opts.mimeType=selectedMime;
    mediaRec=new MediaRecorder(stream,opts);
    mediaRec.ondataavailable=e=>{if(e.data.size>0)recChunks.push(e.data)};
    mediaRec.onstop=async()=>{
      clearInterval(REC_TIMER);REC_TIMER=null;
      const mime=mediaRec.mimeType||'audio/webm';
      const blob=new Blob(recChunks,{type:mime});
      const secs=Math.round((Date.now()-REC_START)/1000);
      stream.getTracks().forEach(tr=>tr.stop());
      if(!blob.size){toast(t('rc_empty'));render();return}
      const v=await formModal({title:t('rc_save_title'),sub:t('rc_save_sub',{d:fmtClock(secs*1000)}),
        fields:[{label:t('rc_label'),value:t('rc_default_label',{date:fmt(T())})},{label:t('rc_note'),placeholder:t('rc_note_ph')}],okLabel:t('btn_save')});
      if(!v){if(confirm(t('rc_discard_confirm'))){render();return}}
      const vals=v||[t('rc_default_label',{date:fmt(T())}),''];
      try{
        await idbPut('clips',{id:Date.now(),date:T(),label:vals[0]||t('rc_default_label',{date:fmt(T())}),note:vals[1]||'',mime,blob,secs});
        try{api.tickSub(T(),'record',true);D=api.getData(T())}catch(e){}
        toast(t('rc_saved'));
      }catch(e){}
      render();
    };
    mediaRec.start(1000);isRecording=true;REC_START=Date.now();
    REC_TIMER=setInterval(paintRecTimer,500);
    if(navigator.vibrate)navigator.vibrate(20);
    render();
  }catch(e){
    const denied=e&&(e.name==='NotAllowedError'||e.name==='SecurityError');
    toast(denied?t('rc_permission'):t('rc_failed',{msg:(e&&e.message)||''}),6000);
  }
}
function stopRecording(){
  if(mediaRec&&isRecording){try{mediaRec.stop()}catch(e){}}
  isRecording=false;
  if(TAB==='recite')render();
}
async function uploadAudioClip(inp){
  const f=inp.files[0];if(!f)return;
  inp.value='';
  const v=await formModal({title:t('rc_upload_title'),fields:[{label:t('rc_label'),value:f.name.replace(/\.[^/.]+$/,'')},{label:t('rc_note'),placeholder:t('rc_note_ph')}]});
  if(!v)return;
  try{await idbPut('clips',{id:Date.now(),date:T(),label:v[0]||f.name,note:v[1]||'',mime:f.type||'audio/mpeg',blob:f});toast(t('rc_saved'))}catch(e){}
  render();
}
async function editClipNote(id){
  const c=(await loadClips()).find(x=>x.id===id);if(!c)return;
  const v=await formModal({title:t('rc_edit_title'),fields:[{label:t('rc_label'),value:c.label||''},{label:t('rc_note'),value:c.note||'',placeholder:t('rc_note_ph')}]});
  if(!v)return;
  c.label=v[0]||c.label;c.note=v[1];
  try{await idbPut('clips',c)}catch(e){}
  render();
}
async function shareClip(id){
  const c=(await loadClips()).find(x=>x.id===id);if(!c)return;
  const ext=(c.mime||'').includes('mp4')?'m4a':((c.mime||'').includes('wav')?'wav':((c.mime||'').includes('mpeg')?'mp3':'webm'));
  const safeFile=String(c.label||'recitation').replace(/[^a-zA-Z0-9_؀-ۿЀ-ӿ-]+/g,'_');
  const file=new File([c.blob],`${safeFile}.${ext}`,{type:c.mime||'audio/webm'});
  if(navigator.canShare&&navigator.canShare({files:[file]})){
    await navigator.share({title:c.label,text:c.note||t('rc_share_text'),files:[file]}).catch(()=>{});
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
  if(!confirm(t('rc_delete_confirm')))return;
  revokeObjUrl('clip-'+id);
  await idbDelete('clips',id);
  render();
}

async function rRecite(s,seq){
  setHdr(`<div class="sub-hdr">
    <button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="setTab('tools')">←</button>
    <div><h1 class="brand" style="font-size:1.45rem">${esc(t('rc_title'))}</h1><div class="tagline">${esc(t('rc_tag'))}</div></div>
  </div>`);
  await initMics();
  const clips=await loadClips();
  if(seq!==RENDER_SEQ)return;
  const formats=[['','rc_fmt_auto'],['audio/webm;codecs=opus','rc_fmt_webm'],['audio/mp4','rc_fmt_mp4']];
  $('app').innerHTML=tipCard('recite',[t('tip_recite')])+`<div class="card" style="text-align:center">
    <div class="row"><h2 style="margin:0">🎙️ ${esc(t('rc_recorder'))}</h2><button class="g sm" onclick="$('audUp').click()">+ ${esc(t('rc_upload'))}</button></div>
    <input type="file" id="audUp" accept="audio/*" style="display:none" onchange="uploadAudioClip(this)">
    <div class="mu" style="margin-top:4px">${esc(t('rc_hint'))}</div>
    <button class="rec-btn ${isRecording?'d recording':''}" aria-label="${esc(isRecording?t('rc_stop'):t('rc_start'))}" onclick="toggleRecord()">${isRecording?'⏹':'●'}</button>
    <div class="rec-state ${isRecording?'on':''}">${isRecording?`<span class="rec-dot"></span><span id="recTime">${fmtClock(Date.now()-REC_START)}</span> · ${esc(t('rc_stop'))}`:esc(t('rc_start'))}</div>
    <details style="margin-top:12px;text-align:start">
      <summary style="font-size:.84rem;color:var(--mu)">⚙️ ${esc(t('rc_options'))}</summary>
      <div class="two" style="margin-top:8px">
        <div><label class="f">${esc(t('rc_mic'))}</label>
          <select onchange="selectedMic=this.value"><option value="">${esc(t('rc_mic_default'))}</option>
          ${audioDevices.map((d,i)=>`<option value="${esc(d.deviceId)}" ${selectedMic===d.deviceId?'selected':''}>${esc(d.label||t('rc_mic_n',{n:i+1}))}</option>`).join('')}</select></div>
        <div><label class="f">${esc(t('rc_format'))}</label>
          <select onchange="selectedMime=this.value">${formats.map(f=>`<option value="${f[0]}" ${selectedMime===f[0]?'selected':''}>${esc(t(f[1]))}</option>`).join('')}</select></div>
      </div>
    </details>
  </div>
  <div class="card"><h2 style="margin:0">${esc(t('rc_saved_list',{n:clips.length}))}</h2>
    <div style="margin-top:10px">${clips.length?clips.map(c=>{
      const url=getObjUrl('clip-'+c.id,c.blob);
      return `<div class="media-box" style="margin-bottom:10px">
        <div class="row"><b style="min-width:0;overflow-wrap:anywhere" dir="auto">${esc(c.label)}</b><span class="mu" style="flex-shrink:0">${esc(fmt(c.date))}${c.secs?' · '+fmtClock(c.secs*1000):''}</span></div>
        ${c.note?`<div class="clip-note" dir="auto">📌 ${esc(c.note)}</div>`:''}
        <audio controls preload="none" src="${url}" style="width:100%;margin-top:8px"></audio>
        <div class="row" style="margin-top:8px;justify-content:flex-end;gap:6px">
          <button class="g sm" onclick="editClipNote(${c.id})">✏️ ${esc(t('btn_edit'))}</button>
          <button class="g sm" onclick="shareClip(${c.id})">📤 ${esc(t('lib_share'))}</button>
          <button class="g sm" aria-label="${esc(t('btn_delete'))}" onclick="deleteClip(${c.id})">🗑️</button>
        </div>
      </div>`;
    }).join(''):`<div class="mu">${esc(t('rc_empty_list'))}</div>`}</div>
  </div>`;
}

/* ================================== Vault ================================= */
async function uploadVaultMedia(inp){
  const f=inp.files[0];if(!f)return;
  inp.value='';
  const s=loadState();
  const v=await formModal({title:t('vt_upload_title'),sub:t('vt_size',{mb:mb(f.size||0)}),
    fields:[{label:t('rc_label'),value:f.name.replace(/\.[^/.]+$/,'')},{label:t('lib_topic'),value:s.libFilter!=='All'&&s.folders.includes(s.libFilter)?s.libFilter:s.folders[0],options:s.folders.map(x=>[x,folderLabel(x)])}]});
  if(!v)return;
  try{await idbPut('vault',{id:Date.now(),date:T(),title:v[0]||f.name,folder:v[1],name:f.name,type:f.type,size:f.size,blob:f});toast(t('vt_saved'))}catch(e){}
  await refreshStorageInfo();
  render();
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
  if(!confirm(t('vt_delete_confirm')))return;
  revokeObjUrl('vault-'+id);
  await idbDelete('vault',id);
  await refreshStorageInfo();
  render();
}

/* ================================= Library ================================ */
async function rLibrary(s,seq){
  const notes=loadNotes();
  const vault=await loadVault();
  if(!STORAGE_INFO)await refreshStorageInfo();
  if(seq!==RENDER_SEQ)return;
  const allFolders=['All',...s.folders];
  const filteredVault=s.libFilter==='All'?vault:vault.filter(v=>v.folder===s.libFilter);
  const totalVault=vault.reduce((a,b)=>a+(b.size||0),0);
  const commList=(typeof CLOUD_STATE!=='undefined'&&CLOUD_STATE.communityLessons)?CLOUD_STATE.communityLessons:[];
  const adminHere=typeof isAdminUser==='function'&&isAdminUser();

  let topAction='';
  if(s.libSubTab==='notes'&&!VIEW_NOTE_ID)topAction=`<button class="sm" onclick="${SHOW_COMPOSER?'closeComposer()':'openComposer()'}">${SHOW_COMPOSER?esc(t('btn_close')):'+ '+esc(t('lib_new_note'))}</button>`;
  else if(s.libSubTab==='community'&&adminHere)topAction=`<button class="sm" onclick="openCommunityComposer()">+ ${esc(t('lib_new_lesson'))}</button>`;
  else if(s.libSubTab==='vault')topAction=`<button class="sm" onclick="$('vaultInp').click()">+ ${esc(t('vt_upload'))}</button>`;

  setHdr(`<div class="row">
    <div class="sub-hdr" style="margin:0">
      <button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="${VIEW_NOTE_ID?'closeNoteReader()':"setTab('tools')"}">←</button>
      <div><h1 class="brand" style="font-size:1.45rem">${esc(t('lib_title'))}</h1><div class="tagline">${esc(t('lib_tag'))}</div></div>
    </div>
    ${topAction}
  </div>`);

  const chips=`<div class="chips-scroll" role="tablist">
    ${allFolders.map(c=>`<span class="cy ${s.libFilter===c?'on':''}" role="tab" aria-selected="${s.libFilter===c}" onclick="setLibFilter(decodeURIComponent('${encAttr(c)}'))">${esc(folderLabel(c))}</span>`).join('')}
    <span class="cy" onclick="addFolder()">+ ${esc(t('lib_topic'))}</span>
  </div>`;

  let h=`<div class="seg3" role="tablist">
    <span role="tab" aria-selected="${s.libSubTab==='notes'}" class="${s.libSubTab==='notes'?'on':''}" onclick="setLibSubTab('notes')">${esc(t('lib_tab_notes',{n:notes.length}))}</span>
    <span role="tab" aria-selected="${s.libSubTab==='community'}" class="${s.libSubTab==='community'?'on':''}" onclick="setLibSubTab('community')">${esc(t('lib_tab_comm',{n:commList.length}))}</span>
    <span role="tab" aria-selected="${s.libSubTab==='vault'}" class="${s.libSubTab==='vault'?'on':''}" onclick="setLibSubTab('vault')">${esc(t('lib_tab_vault',{n:vault.length}))}</span>
  </div>`;

  if(s.libSubTab==='notes'){
    if(VIEW_NOTE_ID){
      const n=notes.find(x=>x.id===VIEW_NOTE_ID);
      if(!n){VIEW_NOTE_ID=null;render();return}
      const yt=ytEmbedUrl(n.link), safeLink=safeExternalUrl(n.link);
      const isImg=safeLink&&/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i.test(safeLink);
      h+=`<div class="card">
        <div class="row"><span class="pill">${esc(folderLabel(n.cat||'Lesson'))}</span><span class="mu">${esc(fmt(n.date))}</span></div>
        <h2 class="note-h" dir="auto">${esc(n.title)}</h2>
        ${yt?`<iframe src="${yt}" title="${esc(n.title)}" style="width:100%;aspect-ratio:16/9;border:0;border-radius:12px;margin:8px 0" allowfullscreen loading="lazy"></iframe>`:''}
        ${isImg?`<img src="${esc(safeLink)}" alt="" style="max-width:100%;border-radius:10px;margin:8px 0">`:''}
        ${safeLink&&!yt&&!isImg?`<div style="margin:6px 0"><a href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer" style="font-size:.86rem">🔗 ${esc(t('lib_open_link'))}</a></div>`:''}
        <div class="note-reader" dir="auto" style="font-size:.95rem;line-height:1.7;margin-top:10px;overflow-x:auto">${sanitizeHtml(n.html||esc(n.body||''))}</div>
        <div class="row" style="margin-top:16px;padding-top:12px;border-top:1px solid var(--bd);flex-wrap:wrap;gap:6px">
          <div class="row" style="gap:6px">
            <button class="sm" onclick="editNote(${n.id})">✏️ ${esc(t('btn_edit'))}</button>
            <button class="g sm" style="color:var(--danger)" onclick="delNote(${n.id})">🗑️ ${esc(t('btn_delete'))}</button>
          </div>
          <div class="row" style="gap:6px">
            <button class="g sm" onclick="exportNoteDoc(${n.id},'pdf')">📄 PDF</button>
            <button class="g sm" onclick="exportNoteDoc(${n.id},'doc')">📝 Word</button>
            <button class="g sm" onclick="exportNoteDoc(${n.id},'share')">📤 ${esc(t('lib_share'))}</button>
          </div>
        </div>
      </div>`;
    }else{
      if(SHOW_COMPOSER){
        const dr=NOTE_DRAFT||blankDraft();
        const cats=s.folders.includes(dr.cat)?s.folders:[...s.folders,dr.cat].filter(Boolean);
        h+=`<div class="card">
          <h2 style="margin-bottom:6px">${EDIT_NOTE_ID?'✏️ '+esc(t('nt_edit')):'✨ '+esc(t('nt_new'))}</h2>
          <div class="two">
            <div><label class="f" for="ntTitle">${esc(t('nt_title'))}</label><input type="text" id="ntTitle" dir="auto" maxlength="140" placeholder="${esc(t('nt_title_ph'))}" value="${esc(dr.title)}" oninput="noteDraftInput()"></div>
            <div><label class="f" for="ntCat">${esc(t('lib_topic'))}</label>
              <select id="ntCat" onchange="noteDraftInput()">${cats.map(f=>`<option value="${esc(f)}" ${f===dr.cat?'selected':''}>${esc(folderLabel(f))}</option>`).join('')}</select></div>
          </div>
          <label class="f" for="ntLink">${esc(t('nt_link'))}</label>
          <input type="text" id="ntLink" inputmode="url" placeholder="https://youtube.com/..." value="${esc(dr.link)}" oninput="noteDraftInput()">
          <label class="f">${esc(t('nt_editor'))}</label>
          <div class="rt-bar">
            <select aria-label="${esc(t('nt_font'))}" onchange="execRT('fontName',this.value)">
              <option value="system-ui">${esc(t('nt_font_sans'))}</option><option value="Georgia,serif">${esc(t('nt_font_serif'))}</option><option value="'Amiri','Traditional Arabic',serif">${esc(t('nt_font_ar'))}</option>
            </select>
            <select aria-label="${esc(t('nt_size'))}" onchange="execRT('fontSize',this.value)">
              <option value="2">${esc(t('nt_size_s'))}</option><option value="3" selected>${esc(t('nt_size_m'))}</option><option value="4">${esc(t('nt_size_l'))}</option><option value="5">${esc(t('nt_size_h'))}</option>
            </select>
            <button class="g sm" aria-label="Bold" onclick="execRT('bold')"><b>B</b></button>
            <button class="g sm" aria-label="Italic" onclick="execRT('italic')"><i>I</i></button>
            <button class="g sm" aria-label="Underline" onclick="execRT('underline')"><u>U</u></button>
            <button class="g sm" onclick="execRT('insertUnorderedList')">• ${esc(t('nt_list'))}</button>
            <button class="g sm" onclick="insertRTTable()">⊞ ${esc(t('nt_table'))}</button>
            <button class="g sm" onclick="$('rtImgInp').click()">🖼️ ${esc(t('nt_photo'))}</button>
            <button class="sm" onclick="polishNoteAI()">✨ ${esc(t('nt_polish'))}</button>
          </div>
          <input type="file" id="rtImgInp" accept="image/*" style="display:none" onchange="attachInlinePhoto(this)">
          <div id="rtEditor" class="rt-area" contenteditable="true" dir="auto" role="textbox" aria-multiline="true" placeholder="${esc(t('nt_body_ph'))}" oninput="noteDraftInput()">${sanitizeHtml(dr.html||'')}</div>
          ${DRAFT_RESTORED&&draftHasContent(dr)?`<div class="ai-status ok">${esc(t('nt_draft_restored'))}</div>`:''}
          <div id="aiNoteStatus" class="ai-status" style="display:none"></div>
          <button class="bigbtn" onclick="saveRichNote()">💾 ${esc(t('nt_save'))}</button>
        </div>`;
      }
      if(!SHOW_COMPOSER&&draftHasContent(NOTE_DRAFT)){
        h+=`<div class="card row"><div style="min-width:0"><b>📝 ${esc(t('nt_unsaved'))}</b><div class="mu">${esc(t('nt_unsaved_sub',{title:(NOTE_DRAFT.title||'').trim()||t('nt_untitled')}))}</div></div><button class="sm" onclick="openComposer()">${esc(t('btn_continue'))}</button></div>`;
      }
      h+=`<div class="search-wrap">
        <span class="search-ico" aria-hidden="true">🔍</span>
        <input type="search" aria-label="${esc(t('lib_search'))}" placeholder="${esc(t('lib_search'))}" value="${esc(LIB_SEARCH)}" oninput="onLibSearchInput(this.value)">
      </div>${chips}
      <div id="notesListBox">${renderFilteredNotesHtml(s)}</div>`;
    }
  }else if(s.libSubTab==='community'){
    h+=(typeof communityLessonsHtml==='function')?communityLessonsHtml(s):`<div class="card mu">${esc(t('lib_loading'))}</div>`;
  }else{
    const used=STORAGE_INFO&&STORAGE_INFO.quota?Math.min(100,STORAGE_INFO.used/STORAGE_INFO.quota*100):null;
    h+=chips+`<div class="card">
      <b>🎞️ ${esc(t('vt_title'))}</b>
      <div class="mu">${esc(t('vt_sub',{mb:mb(totalVault)}))}</div>
      ${used!==null?`<div class="sbar" style="margin-top:10px" role="img" aria-label="${esc(t('vt_phone',{used:mb(STORAGE_INFO.used),free:mb(Math.max(0,STORAGE_INFO.quota-STORAGE_INFO.used))}))}"><i class="g" style="width:${used.toFixed(1)}%"></i></div>
        <div class="mu" style="margin-top:6px">${esc(t('vt_phone',{used:mb(STORAGE_INFO.used),free:mb(Math.max(0,STORAGE_INFO.quota-STORAGE_INFO.used))}))}</div>`:''}
      <input type="file" id="vaultInp" accept="image/*,video/*,audio/*" style="display:none" onchange="uploadVaultMedia(this)">
    </div>`;
    h+=filteredVault.length?`<div class="media-grid">`+filteredVault.map(v=>{
      const url=getObjUrl('vault-'+v.id,v.blob), tp=v.type||'';
      const mediaEl=tp.startsWith('image/')?`<img src="${url}" alt="${esc(v.title)}" loading="lazy" onclick="window.open('${url}','_blank','noopener,noreferrer')">`
        :tp.startsWith('video/')?`<video controls preload="metadata" src="${url}"></video>`
        :`<audio controls preload="none" src="${url}"></audio>`;
      return `<div class="media-box">
        <span class="pill">${esc(folderLabel(v.folder||'Media'))}</span>
        <div style="font-weight:700;font-size:.84rem;margin:4px 0;overflow-wrap:anywhere" dir="auto">${esc(v.title)}</div>
        ${mediaEl}
        <div class="row" style="margin-top:6px"><span class="mu">${mb(v.size||0)} MB</span>
          <button class="g sm" aria-label="${esc(t('btn_delete'))}" onclick="deleteVaultItem(${v.id})">🗑️</button></div>
      </div>`;
    }).join('')+`</div>`:`<div class="card empty-card"><div class="rest-ico">🎞️</div><div class="mu" style="margin-bottom:12px">${esc(t('vt_empty'))}</div><button class="sm" onclick="$('vaultInp').click()">+ ${esc(t('vt_upload'))}</button></div>`;
  }
  $('app').innerHTML=h;
}

/* ================================ Tools hub =============================== */
function qzToolPill(){const h=(ld('hifdh_quiz',{})||{}).hist||[];return h.length?t('qz_last',{score:h[0].pct,date:fmt(h[0].d)}):t('tl_quiz_pill')}
function rTools(s){
  const notesCount=loadNotes().length;
  const commCount=(typeof CLOUD_STATE!=='undefined'&&CLOUD_STATE.communityLessons)?CLOUD_STATE.communityLessons.length:0;
  setHdr(`<h1 class="brand">${esc(t('tl_title'))}</h1><div class="tagline">${esc(t('tl_tag'))}</div>`);
  const card=(tab,ico,title,sub,pill)=>`<button type="button" class="tool-card" onclick="setTab('${tab}')">
    <div class="tool-card-ico">${ic(ico)}</div>
    <div class="tool-card-body"><b>${esc(title)}</b><div class="mu">${esc(sub)}</div><div style="margin-top:6px"><span class="pill">${esc(pill)}</span></div></div>
    <span class="chev" aria-hidden="true">›</span>
  </button>`;
  $('app').innerHTML=card('quran','book',t('rd_title'),t('tl_quran_sub'),t('tl_quran_pill'))
    +card('quiz','quiz',t('qz_title'),t('tl_quiz_sub'),qzToolPill())
    +card('tasbih','tasbih',t('tb_title'),t('tl_tasbih_sub'),t('tb_target',{n:s.tasbihTarget||40}))
    +card('recite','mic',t('rc_title'),t('tl_recite_sub'),t('tl_recite_pill'))
    +card('library','lib',t('lib_title'),t('tl_lib_sub'),t('tl_lib_pill',{n:notesCount,c:commCount}));
}
