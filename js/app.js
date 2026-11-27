/* ==========================================================================
   My Companion — screens and interactions
   (data & logic live in util.js, quran.js, plan.js, store.js)
   ========================================================================== */

let SELECTED_JUZ=null, D=null, DR=null, TAB='today', COMM_SUBTAB='circle', OB_SLIDE=0, T_MENU=false;
let EDIT_NOTE_ID=null, VIEW_NOTE_ID=null, SHOW_COMPOSER=false, LIB_SEARCH='', AI_TEST_MSG=null, RENDER_SEQ=0;
let COMMIT_RAF=null, COMMIT_START=0, COMMIT_DONE=false;
let mediaRec=null, recChunks=[], isRecording=false, audioDevices=[], selectedMic='', selectedMime='';
const ACTIVE_URLS=new Map();
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

/* Memory map, Today and Stats screens live in js/today.js */

function applyTheme(s){
  if(typeof applyLanguage==='function')applyLanguage(s);
  const sysDark=Boolean(window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
  const theme=s.theme==='dark'?'dark':(s.theme==='system'?(sysDark?'dark':'light'):'light');
  const color=['emerald','blue','gold','plum'].includes(s.color)?s.color:'emerald';
  const scale=Math.max(0.85,Math.min(1.25,Number(s.uiScale)||1));
  document.documentElement.setAttribute('data-theme',theme);
  document.documentElement.setAttribute('data-color',color);
  document.documentElement.style.setProperty('--ui-scale',scale.toFixed(2));
  const mt=$('metaTheme');
  if(mt)mt.setAttribute('content',theme==='dark'?'#0f1513':'#f5f7f4');
}
function setThemeMode(th){
  ensureData();
  const s=loadState();s.theme=['dark','light','system'].includes(th)?th:'system';
  saveState(s);applyTheme(s);D.state=s;render();
}
/* ---------------------------- Language ---------------------------- */
function setLanguage(code){
  if(!LANGS.some(l=>l.code===code))return;
  ensureData();const s=loadState();s.lang=code;saveState(s);
  applyLanguage(s);D=null;buildNav();render();
}
function setUzOld(on){ensureData();const s=loadState();s.uzOld=Boolean(on);saveState(s);applyLanguage(s);D=null;buildNav();render()}
function languageCardHtml(s){
  return `<div class="sec">${esc(t('set_language'))}</div>
    <div class="card">
      <div class="mu">${esc(t('set_language_sub'))}</div>
      <div class="lang-grid" role="radiogroup" aria-label="${esc(t('set_language'))}">${LANGS.map(l=>`<button type="button" role="radio" aria-checked="${LANG===l.code}" class="lang-opt ${LANG===l.code?'on':''}" onclick="setLanguage('${l.code}')" lang="${l.code}" dir="${l.dir}"><b>${esc(l.native)}</b><span>${esc(l.name)}</span></button>`).join('')}</div>
      ${LANG==='uz'?`<label class="row" style="justify-content:flex-start;gap:10px;margin-top:12px;cursor:pointer"><input type="checkbox" ${s.uzOld?'checked':''} onchange="setUzOld(this.checked)"><span style="font-size:.86rem;font-weight:650">${esc(t('set_uz_old'))}</span></label>`:''}
    </div>`;
}
function setColor(c){ensureData();const s=loadState();s.color=c;saveState(s);applyTheme(s);D.state=s;render()}
function previewUiScale(pct){
  const scale=Math.max(0.85,Math.min(1.25,(parseInt(pct,10)||100)/100));
  document.documentElement.style.setProperty('--ui-scale',scale.toFixed(2));
  const lbl=$('scaleValLbl');if(lbl)lbl.textContent=Math.round(scale*100)+'%';
}
function commitUiScale(pct){
  ensureData();
  const scale=Math.max(0.85,Math.min(1.25,(parseInt(pct,10)||100)/100));
  const s=loadState();s.uiScale=scale;
  s.uiText=scale<0.95?'s':(scale>1.07?'l':'m');
  saveState(s);applyTheme(s);D.state=s;
}

const navKey=t=>{
  if(['tasbih','recite','library','quran','quiz'].includes(t))return 'tools';
  if(['plan','ai','backup','profile_edit','privacy','about'].includes(t))return 'settings';
  return t;
};
function setTab(t){
  if(t!==TAB&&TAB==='recite'&&isRecording&&typeof stopRecording==='function')stopRecording();
  if(t!==TAB&&(TAB==='recite'||TAB==='library')){ACTIVE_URLS.forEach(e=>URL.revokeObjectURL(e.url));ACTIVE_URLS.clear()}
  TAB=t;T_MENU=false;DR=null;VIEW_NOTE_ID=null;AI_TEST_MSG=null;
  if(t==='community'&&typeof loadCommunityLessons==='function')loadCommunityLessons();
  const activeKey=navKey(t);
  NAV.forEach(n=>{const e=$('nav-'+n[0]);if(e)e.classList.toggle('active',n[0]===activeKey)});
  render();window.scrollTo(0,0);
  const a=$('app');if(a){a.classList.remove('enter');void a.offsetWidth;a.classList.add('enter')}
}
function setCommSubTab(st){
  COMM_SUBTAB=st;
  if(st==='lessons'&&typeof loadCommunityLessons==='function')loadCommunityLessons();
  render();
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
      <button style="width:100%" onclick="closeModal()">${esc(t('cel_continue'))}</button>
    </div>
  </div>`;
}
function closeModal(){const mr=$('modalRoot');if(mr)mr.innerHTML=''}

function call(fn,...a){
  if($('msg'))$('msg').textContent='';
  if(fn!=='getData'&&D&&D.date&&D.date!==T()){
    D=null;render();toast(t('err_new_day'));return false;
  }
  try{
    const r=api[fn](T(),...a);
    if(r&&r.error){toast(r.error,4000);if(r.refresh)D=null;render();return false}
    if(r)D=r;
    if(r&&r.celebrate)showCelebration(r.celebrate.ico,r.celebrate.title,r.celebrate.body);
  }catch(e){toast(e.message||t('err_generic'),4000);return false}
  render();
  return true;
}
const isTyping=()=>{const ae=document.activeElement;return Boolean(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.tagName==='SELECT'||ae.isContentEditable))};
function onStorageError(msg){toast(msg,6000)}

function uploadAvatar(inp){
  const f=inp.files[0];if(!f)return;
  const reader=new FileReader();
  reader.onerror=()=>toast(t('pr_photo_read'));
  reader.onload=e=>{
    const img=new Image();
    img.onerror=()=>{inp.value='';toast(t('pr_photo_bad'))};
    img.onload=()=>{
      const canvas=document.createElement('canvas');
      canvas.width=128;canvas.height=128;
      const ctx=canvas.getContext('2d');
      const min=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-min)/2,(img.height-min)/2,min,min,0,0,128,128);
      const s=loadState();s.avatar=canvas.toDataURL('image/jpeg',0.82);
      inp.value='';
      saveState(s);ensureData().state=s;render();
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(f);
}
function removeAvatar(){const s=loadState();s.avatar='';saveState(s);ensureData().state=s;render()}

/* Tasbih, Recite Studio, Library & Vault screens live in js/tools.js */
let DB_PROMISE=null;
function openDB(){
  if(DB_PROMISE)return DB_PROMISE;
  DB_PROMISE=new Promise((res,rej)=>{
    const req=indexedDB.open('my_companion_db',2);
    req.onupgradeneeded=e=>{
      const db=e.target.result;
      if(!db.objectStoreNames.contains('clips'))db.createObjectStore('clips',{keyPath:'id'});
      if(!db.objectStoreNames.contains('vault'))db.createObjectStore('vault',{keyPath:'id'});
    };
    req.onsuccess=e=>{const db=e.target.result;db.onversionchange=()=>{db.close();DB_PROMISE=null};res(db)};
    req.onerror=e=>{DB_PROMISE=null;rej(e)};
  });
  return DB_PROMISE;
}
/* Save one record; shows a clear message if the phone's storage is full. */
async function idbPut(store,obj){
  const db=await openDB();
  return new Promise((res,rej)=>{
    const tx=db.transaction(store,'readwrite');
    tx.objectStore(store).put(obj);
    tx.oncomplete=()=>res(true);
    const fail=()=>{toast('Could not save — your phone storage may be full.',5000);rej(tx.error||new Error('save failed'))};
    tx.onerror=fail;tx.onabort=fail;
  });
}
async function idbDelete(store,id){
  const db=await openDB();
  return new Promise(res=>{const tx=db.transaction(store,'readwrite');tx.objectStore(store).delete(id);tx.oncomplete=()=>res(true);tx.onerror=()=>res(false)});
}

/* Note being written: kept in memory AND on the phone, so switching apps,
   changing topic or closing the app never loses it. */
let NOTE_DRAFT=ld('hifdh_note_draft',null);
let DRAFT_RESTORED=Boolean(NOTE_DRAFT);
function blankDraft(){return{title:'',cat:(loadState().folders||[])[0]||'Tajweed Lessons',link:'',html:''}}
function noteDraftInput(){
  if(!$('rtEditor'))return;
  DRAFT_RESTORED=false;
  NOTE_DRAFT={
    title:$('ntTitle')?$('ntTitle').value:'',
    cat:$('ntCat')?$('ntCat').value:'',
    link:$('ntLink')?$('ntLink').value:'',
    html:$('rtEditor').innerHTML,
    editId:EDIT_NOTE_ID||null
  };
  sv('hifdh_note_draft',NOTE_DRAFT);
}
function draftHasContent(d){return Boolean(d&&((d.title||'').trim()||(d.link||'').trim()||htmlToPlain(d.html||'')||/<img/i.test(d.html||'')))}
function openComposer(){
  if(NOTE_DRAFT&&NOTE_DRAFT.editId&&loadNotes().some(n=>n.id===NOTE_DRAFT.editId))EDIT_NOTE_ID=NOTE_DRAFT.editId;
  else{if(!NOTE_DRAFT||NOTE_DRAFT.editId)NOTE_DRAFT=blankDraft();EDIT_NOTE_ID=null}
  SHOW_COMPOSER=true;VIEW_NOTE_ID=null;render();
}
function closeComposer(){
  if(draftHasContent(NOTE_DRAFT)&&!confirm(t('nt_discard')))return;
  NOTE_DRAFT=null;LS.removeItem('hifdh_note_draft');
  SHOW_COMPOSER=false;EDIT_NOTE_ID=null;render();
}
function execRT(cmd,val=null){
  const area=$('rtEditor');if(!area)return;
  area.focus();document.execCommand(cmd,false,val);noteDraftInput();
}
function insertRTTable(){
  const area=$('rtEditor');if(!area)return;
  area.focus();
  const tbl=`<table><tr><th>${esc(t('nt_tbl_h1'))}</th><th>${esc(t('nt_tbl_h2'))}</th></tr><tr><td>${esc(t('nt_tbl_ex',{n:1}))}</td><td>${esc(t('nt_tbl_cell'))}</td></tr><tr><td>${esc(t('nt_tbl_ex',{n:2}))}</td><td>${esc(t('nt_tbl_cell'))}</td></tr></table><p></p>`;
  document.execCommand('insertHTML',false,tbl);
  noteDraftInput();
}
async function attachInlinePhoto(inp){
  const f=inp.files[0];if(!f)return;
  inp.value='';
  try{
    const data=await resizeImageFile(f,1280,0.8);   // ~100–250 KB instead of several MB
    const area=$('rtEditor');if(!area)return;
    area.focus();
    document.execCommand('insertHTML',false,`<img src="${data}" style="max-width:100%;border-radius:10px;margin:8px 0"><p></p>`);
    noteDraftInput();
  }catch(e){toast(t('nt_photo_failed'),4000)}
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
function setAiNoteStatus(ok,txt){
  const el=$('aiNoteStatus');
  if(!el)return;
  el.className='ai-status '+(ok?'ok':'err');
  el.textContent=txt;
  el.style.display='block';
}
async function polishNoteAI(){
  const area=$('rtEditor');if(!area)return;
  const raw=area.innerText.trim();
  if(!raw){setAiNoteStatus(false,t('ai_write_first'));return}
  const s=loadState();
  const key=(s.aiKey||'').trim();
  if(key){
    if(!key.startsWith('AIza')){
      area.innerHTML=formatPlainNotes(raw);noteDraftInput();
      setAiNoteStatus(false,t('ai_bad_key_local'));
      return;
    }
    try{
      setAiNoteStatus(true,'✨ '+t('ai_polishing'));
      const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,{
        method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({contents:[{parts:[{text:`Organize and polish these Qur'an/Tajweed study notes into clean HTML using <h3>, <b>, <ul>, <li>, and <p> tags without markdown code fences:\n\n${raw}`}]}]})
      });
      if(!res.ok){
        let errDetail='HTTP '+res.status;
        try{const j=await res.json();if(j&&j.error&&j.error.message)errDetail=j.error.message}catch(_){}
        throw new Error(errDetail);
      }
      const data=await res.json();
      const out=data&&data.candidates&&data.candidates[0]&&data.candidates[0].content&&data.candidates[0].content.parts&&data.candidates[0].content.parts[0]?data.candidates[0].content.parts[0].text:'';
      if(out){
        area.innerHTML=sanitizeHtml(out.replace(/```html|```/g,'').trim());
        noteDraftInput();
        setAiNoteStatus(true,'✨ '+t('ai_polished'));
        return;
      }
      throw new Error('Empty response from Gemini');
    }catch(e){
      area.innerHTML=formatPlainNotes(raw);noteDraftInput();
      setAiNoteStatus(false,t('ai_error_local',{msg:e.message}));
      return;
    }
  }
  area.innerHTML=formatPlainNotes(raw);noteDraftInput();
  setAiNoteStatus(true,'✨ '+t('ai_offline_done'));
}

async function saveAndTestAiKey(runTest){
  const key=($('aiKeyInp')?$('aiKeyInp').value:'').trim();
  const s=loadState();
  s.aiKey=key;
  saveState(s);
  ensureData().state=s;
  if(!runTest){
    AI_TEST_MSG={ok:true,txt:key?t('ai_saved'):t('ai_cleared')};
    render();
    return;
  }
  if(!key){
    AI_TEST_MSG={ok:false,txt:t('ai_enter_first')};
    render();
    return;
  }
  if(!key.startsWith('AIza')){
    AI_TEST_MSG={ok:false,txt:t('ai_bad_format')};
    render();
    return;
  }
  AI_TEST_MSG={ok:true,txt:t('ai_testing')};
  render();
  try{
    const res=await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({contents:[{parts:[{text:'Reply with OK'}]}]})
    });
    if(!res.ok){
      let detail='HTTP '+res.status;
      try{const j=await res.json();if(j&&j.error&&j.error.message)detail=j.error.message}catch(_){}
      throw new Error(detail);
    }
    AI_TEST_MSG={ok:true,txt:t('ai_connected')};
  }catch(e){
    AI_TEST_MSG={ok:false,txt:t('ai_failed',{msg:e.message})};
  }
  render();
}

function saveRichNote(){
  noteDraftInput();
  const d=NOTE_DRAFT||blankDraft();
  const title=(d.title||'').trim()||t('nt_untitled');
  const cat=d.cat||'Tajweed Lessons';
  const link=(d.link||'').trim();
  const html=sanitizeHtml((d.html||'').trim());
  if(!htmlToPlain(html)&&!/<img/i.test(html)&&!link){toast(t('nt_empty_save'));return}
  const list=loadNotes();
  let savedId=EDIT_NOTE_ID;
  if(EDIT_NOTE_ID){
    const idx=list.findIndex(x=>x.id===EDIT_NOTE_ID);
    if(idx>-1)list[idx]=Object.assign({},list[idx],{title,cat,link,html,updatedAt:Date.now()});
    else{savedId=Date.now();list.unshift({id:savedId,date:T(),updatedAt:Date.now(),cat,title,link,html})}
  }else{
    savedId=Date.now();
    list.unshift({id:savedId,date:T(),updatedAt:Date.now(),cat,title,link,html});
  }
  if(!saveNotes(list)){
    // Storage full: keep the editor open with everything the user wrote.
    return;
  }
  NOTE_DRAFT=null;LS.removeItem('hifdh_note_draft');
  EDIT_NOTE_ID=null;SHOW_COMPOSER=false;VIEW_NOTE_ID=savedId;
  toast(t('nt_saved'));
  render();
}
function openNoteReader(id){VIEW_NOTE_ID=id;SHOW_COMPOSER=false;render();window.scrollTo(0,0)}
function closeNoteReader(){VIEW_NOTE_ID=null;render()}
function editNote(id){
  const n=loadNotes().find(x=>x.id===id);if(!n)return;
  EDIT_NOTE_ID=id;VIEW_NOTE_ID=null;SHOW_COMPOSER=true;
  NOTE_DRAFT={title:n.title||'',cat:n.cat||'Tajweed Lessons',link:n.link||'',html:sanitizeHtml(n.html||esc(n.body||'')),editId:id};
  sv('hifdh_note_draft',NOTE_DRAFT);
  render();window.scrollTo(0,0);
}
function delNote(id){
  if(!confirm(t('nt_delete_confirm')))return;
  const del=ld('hifdh_deleted_notes',[]);if(!del.includes(id))del.push(id);sv('hifdh_deleted_notes',del);
  VIEW_NOTE_ID=null;
  saveNotes(loadNotes().filter(x=>x.id!==id));
  toast(t('nt_deleted'));
  render();
}
function setLibFilter(f){ensureData();const s=loadState();s.libFilter=f;saveState(s);D.state=s;render()}
function setLibSubTab(st){
  ensureData();const s=loadState();s.libSubTab=st;VIEW_NOTE_ID=null;SHOW_COMPOSER=false;
  saveState(s);D.state=s;
  if(st==='community'&&typeof loadCommunityLessons==='function')loadCommunityLessons();
  render();
}
function renderFilteredNotesHtml(s){
  const notes=loadNotes();
  const q=LIB_SEARCH.trim().toLowerCase();
  const filtered=notes.filter(n=>{
    if(s.libFilter!=='All'&&n.cat!==s.libFilter)return false;
    if(!q)return true;
    const hay=(n.title+' '+(n.cat||'')+' '+htmlToPlain(n.html||n.body||'')).toLowerCase();
    return hay.includes(q);
  });
  if(!filtered.length){
    return `<div class="card empty-card"><div class="rest-ico">📝</div><div class="mu">${esc(q?t('lib_no_match'):t('lib_no_notes'))}</div>${q?'':`<button class="sm" style="margin-top:12px" onclick="openComposer()">+ ${esc(t('lib_new_note'))}</button>`}</div>`;
  }
  return filtered.map(n=>{
    const prev=htmlToPlain(n.html||n.body||'');
    return `<div class="note-card" role="button" tabindex="0" onkeydown="if(event.key==='Enter')openNoteReader(${n.id})" onclick="openNoteReader(${n.id})">
      <span class="pill">${esc(folderLabel(n.cat||'Lesson'))}</span>
      <div class="note-title" dir="auto">${esc(n.title||t('nt_untitled'))}</div>
      <div class="note-preview" dir="auto">${esc(prev||t('nt_no_text'))}</div>
      <div class="note-meta">
        <span>${esc(fmt(n.date))}</span>
        <span style="color:var(--ac);font-weight:700">${esc(t('lib_open'))} ›</span>
      </div>
    </div>`;
  }).join('');
}
function onLibSearchInput(val){
  LIB_SEARCH=val;
  const box=$('notesListBox');
  if(box&&D)box.innerHTML=renderFilteredNotesHtml(D.state);
}

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
    const txt=`📖 ${n.title} (${n.cat})\n\n${htmlToPlain(safeBody)}${cleanLink?'\n🔗 '+cleanLink:''}`;
    if(navigator.share)navigator.share({title:n.title,text:txt}).catch(()=>{});
    else if(navigator.clipboard){navigator.clipboard.writeText(txt).catch(()=>{});toast(t('lib_copied'))}
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
  const subj=encodeURIComponent(t('em_subject',{name:s.name||'',date:fmt(T())}));
  const body=encodeURIComponent(
    `Assalamu Alaikum ${s.name||''},\n\n`+
    t('em_title',{date:fmt(T())})+'\n'+
    '• '+t('em_mem',{n:memCount(s),p:Math.round(memCount(s)/604*100)})+'\n'+
    '• '+t('em_juz',{n:completedJuzCount(s)})+'\n'+
    '• '+t('st_streak')+': '+tn('td_streak',st.streak)+'\n\n'+
    t('st_summit_quote')
  );
  window.location.href=`mailto:${to}?subject=${subj}&body=${body}`;
}
function enableReminder(){
  ensureData();
  if(!('Notification' in window)){toast(t('nf_unsupported'));return}
  Notification.requestPermission().then(async p=>{
    if(p!=='granted'){toast(t('nf_denied'));return}
    const body=t('nf_body',{name:D.state.name||''});
    try{
      const reg=('serviceWorker' in navigator)?await navigator.serviceWorker.ready:null;
      if(reg&&reg.showNotification)await reg.showNotification('My Companion',{body,icon:'icon-192.png'});
      else new Notification('My Companion',{body});
      toast(t('nf_sent'),5000);
    }catch(e){toast(t('nf_unsupported'))}
  });
}

function exportData(){
  const s=loadState();s.lastBackup=T();saveState(s);
  const safeState=Object.assign({},s);delete safeState.aiKey;          // never put the API key in a file
  const blob=new Blob([JSON.stringify({app:'hifdh',v:10,exported:new Date().toISOString(),state:safeState,days:loadDays(),notes:loadNotes()})],{type:'application/json'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download='my-companion-backup-'+T()+'.json';
  document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
  toast(t('bk_exported'));
  render();
}
function importData(inp){
  const f=inp.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{
    const o=JSON.parse(r.result);
    if(!o||o.app!=='hifdh'||!o.state||typeof o.state!=='object'||!o.days||typeof o.days!=='object')throw new Error(t('bk_invalid'));
    const now=Date.now();
    const days={};
    Object.keys(o.days).forEach(k=>{const d=o.days[k];if(/^\d{4}-\d{2}-\d{2}$/.test(k)&&d&&Array.isArray(d.r)&&Array.isArray(d.u))days[k]=Object.assign({},d,{mt:now})});
    const notes=Array.isArray(o.notes)?o.notes.filter(n=>n&&typeof n==='object'&&n.id!=null).map(n=>Object.assign({},n,{html:sanitizeHtml(n.html||esc(n.body||''))})):[];
    const msg=t('bk_confirm',{d:Object.keys(days).length,n:notes.length});
    if(!confirm(msg))return;
    const cur=loadState();
    const st=Object.assign({},DEFAULTS,o.state,{aiKey:cur.aiKey||''});
    if(!safeImageData(st.avatar))st.avatar='';
    if(!sv('hifdh_days',days))return;
    saveState(st);
    if(!saveNotes(notes))return;
    DR=null;D=null;SELECTED_JUZ=null;toast(t('bk_restored'));render();
  }catch(e){toast(e.message||t('bk_read_failed'),5000)}};
  r.readAsText(f);inp.value='';
}
async function resetAll(){
  // Everything this app stored on the phone: progress, notes, drafts, recordings and Vault files.
  Object.keys(LS).filter(k=>k.startsWith('hifdh_')&&k!=='hifdh_has_auth').forEach(k=>LS.removeItem(k));
  ACTIVE_URLS.forEach(entry=>URL.revokeObjectURL(entry.url));
  ACTIVE_URLS.clear();
  NOTE_DRAFT=null;
  try{
    if(DB_PROMISE){const db=await DB_PROMISE;db.close();DB_PROMISE=null}
    await new Promise(res=>{const rq=indexedDB.deleteDatabase('my_companion_db');rq.onsuccess=rq.onerror=rq.onblocked=()=>res()});
  }catch(e){}
  DR=null;D=null;SELECTED_JUZ=null;TAB='today';OB_SLIDE=0;
  toast(t('bk_reset_done'));
  buildNav();render();
}


const ICO={
  home:'<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  stats:'<path d="M4 20h16M7 20v-7M12 20V7M17 20v-4"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  tools:'<rect x="3" y="3" width="8" height="8" rx="2"/><rect x="13" y="3" width="8" height="8" rx="2"/><rect x="3" y="13" width="8" height="8" rx="2"/><rect x="13" y="13" width="8" height="8" rx="2"/>',
  user:'<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  tasbih:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',
  mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  lib:'<path d="M3 5h7a2 2 0 0 1 2 2v13a2 2 0 0 0-2-2H3zM21 5h-7a2 2 0 0 0-2 2v13a2 2 0 0 1 2-2h7z"/>',
  loop:'<path d="M4 12a8 8 0 0 1 14-5l2 2M20 12a8 8 0 0 1-14 5l-2-2"/><path d="M20 4v5h-5M4 20v-5h5"/>',
  both:'<path d="M2 5h5a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H2z"/><path d="M13 10a4.5 4.5 0 0 1 8 0M21 16a4.5 4.5 0 0 1-8 0"/><path d="M21 6v4h-4M13 20v-4h4"/>',
  star:'<rect x="5.5" y="5.5" width="13" height="13" rx="1.5"/><rect x="5.5" y="5.5" width="13" height="13" rx="1.5" transform="rotate(45 12 12)"/>',
  cal:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  mark:'<path d="M6 3h12v18l-6-4-6 4z"/>',
  fwd:'<path d="M5 12h14M13 6l6 6-6 6"/>',
  juzrev:'<path d="M4 7h12M4 12h10M4 17h8M19 6v12M16 15l3 3 3-3"/>',
  pagerev:'<path d="M19 12H5M11 6l-6 6 6 6"/>',
  spark:'<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/>',
  shield:'<path d="M12 3l7 3v6c0 4.5-3 7.8-7 9-4-1.2-7-4.5-7-9V6l7-3z"/>',
  download:'<path d="M12 3v12M7 10l5 5 5-5M5 20h14"/>',
  quiz:'<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.7.3-1 .9-1 1.6v.6M12 17h.01"/>',
  book:'<path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H20v17H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 21.5A2.5 2.5 0 0 1 6.5 19H20v3H6.5"/><path d="M12 6v8M8 10h8"/>',
  edit:'<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>'
};
const ic=n=>`<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICO[n]||''}</svg>`;
function toast(t,ms=2700){const e=$('toast');if(!e)return;e.textContent=t;e.classList.add('show');clearTimeout(toast._t);toast._t=setTimeout(()=>e.classList.remove('show'),ms)}

const NAV=[
  ['today','home','nav_today'],
  ['journey','stats','nav_stats'],
  ['community','users','nav_community'],
  ['tools','tools','nav_tools'],
  ['settings','user','nav_profile']
];
function buildNav(){
  const activeKey=navKey(TAB);
  $('bottomNav').innerHTML=NAV.map(n=>`<button id="nav-${n[0]}" class="${n[0]===activeKey?'active':''}" onclick="setTab('${n[0]}')">${ic(n[1])}<span>${esc(t(n[2]))}</span></button>`).join('');
}
function setHdr(h){$('hdr').innerHTML=h}
function skipIntro(){const s=loadState();s.seenIntro=true;saveState(s);DR=null;D=null;render()}


/* ==================== PLAN BUILDER + ROADMAP + HOLD TO COMMIT ==================== */
function initDraft(){
  const s=loadState();
  DR={
    mode:s.mode,method:s.method,order:validOrder(s.order),pace:s.newPerDay||1,
    posType:'page',fr:s.frontier,juzIn:'',name:s.name||'',
    rev:s.revPerDay||1,sabak:s.sabakPages,studyDays:s.studyDaysPerWeek||6,
    cycle:s.cycle+1,juz:s.juz,period:s.period,
    tourDay:s.tourDay||1,tourNum:s.tourNum||1,
    chunks:s.chunks.join(','),after:s.afterLast||'keep',
    crType:s.crType||'rotate',crPerDay:s.crPerDay||10,
    crWeekly:Array.isArray(s.crWeekly)?s.crWeekly.slice():['','','','','','',''],
    crTasks:Array.isArray(s.crTasks)?s.crTasks.slice():[],
    restDays:Array.isArray(s.restDays)?s.restDays.slice():[]
  };
}
/* "My own plan" editing helpers */
function drWeekly(i,v){if(!DR)initDraft();DR.crWeekly[i]=v}
function drTask(i,v){if(!DR)initDraft();DR.crTasks[i]=v}
function drAddTask(){if(!DR)initDraft();if(DR.crTasks.length<5){DR.crTasks.push('');render()}}
function drRmTask(i){if(!DR)initDraft();DR.crTasks.splice(i,1);render()}
function drToggleRest(d){
  if(!DR)initDraft();
  const i=DR.restDays.indexOf(d);
  if(i>=0)DR.restDays.splice(i,1);
  else if(DR.restDays.length<3)DR.restDays.push(d);
  else{toast(t('cp_rest_max'));return}
  render();
}
/* Week starting on Saturday for Arabic, Monday otherwise; names in the app language */
function weekOrder(){return LANG==='ar'?[6,0,1,2,3,4,5]:[1,2,3,4,5,6,0]}
function weekdayName(d,style='short'){
  const base=new Date(2026,10,22+d); // 22 Nov 2026 is a Sunday
  try{return base.toLocaleDateString(curLocale(),{weekday:style})}catch(e){return base.toLocaleDateString(undefined,{weekday:style})}
}
function customPlanSection(d,isRevOnly,isHifdhOnly){
  const paceNum=parseFloat(d.pace);
  return `<div class="card">
    <div class="row" style="margin-bottom:6px"><b>${esc(t('cp_title'))}</b><span class="pill">${esc(t('m_custom_sub'))}</span></div>
    ${!isRevOnly?`<div class="mu" style="margin:10px 0 8px">${esc(t('cp_new'))}</div>
      <div class="pace">${[0,0.5,1,2,3].map(p=>`<span class="${p===paceNum?'on':''}" onclick="drSet('pace',${p})">${esc(p===0?t('cp_none'):(p===0.5?t('amt_half'):tn('amt_pages',p)))}</span>`).join('')}</div>
      <div class="mu" style="margin:14px 0 8px">${esc(t('cp_recent'))}</div>
      <div class="pace">${[0,3,5,10].map(n=>`<span class="${parseInt(d.sabak,10)===n?'on':''}" onclick="drSet('sabak',${n})">${esc(n===0?t('cp_none'):tn('amt_pages',n))}</span>`).join('')}</div>`:''}
    ${!isHifdhOnly?`<div class="mu" style="margin:14px 0 8px">${esc(t('cp_rev'))}</div>
      <div class="seg"><span class="${d.crType!=='weekly'?'on':''}" onclick="drSet('crType','rotate')">${esc(t('cp_rev_rotate'))}</span><span class="${d.crType==='weekly'?'on':''}" onclick="drSet('crType','weekly')">${esc(t('cp_rev_weekly'))}</span></div>
      ${d.crType!=='weekly'
        ?`<div class="mu" style="margin-bottom:8px">${esc(t('cp_rev_per_day'))}</div>
          <div class="pace">${[5,10,20,40].map(n=>`<span class="${parseInt(d.crPerDay,10)===n?'on':''}" onclick="drSet('crPerDay',${n})">${esc(tn('amt_pages',n))}</span>`).join('')}</div>`
        :`<div class="mu" style="margin-bottom:8px">${esc(t('cp_weekly_hint'))}</div>
          ${weekOrder().map(i=>`<div class="row cp-day"><span>${esc(weekdayName(i,'long'))}</span><input type="text" inputmode="numeric" dir="ltr" maxlength="60" placeholder="—" value="${esc(d.crWeekly[i]||'')}" oninput="drWeekly(${i},this.value)"></div>`).join('')}`}`:''}
    <div class="mu" style="margin:16px 0 8px">${esc(t('cp_extra'))}</div>
    ${d.crTasks.map((x,i)=>`<div class="row cp-task"><input type="text" maxlength="60" placeholder="${esc(t('cp_extra_ph'))}" value="${esc(x)}" oninput="drTask(${i},this.value)"><button class="g sm" aria-label="${esc(t('btn_delete'))}" onclick="drRmTask(${i})">✕</button></div>`).join('')}
    ${d.crTasks.length<5?`<button class="g sm" onclick="drAddTask()">${esc(t('cp_add'))}</button>`:''}
    <div class="mu" style="margin:16px 0 8px">${esc(t('cp_rest'))}</div>
    <div class="cp-week">${weekOrder().map(i=>`<span class="${d.restDays.includes(i)?'on':''}" role="checkbox" aria-checked="${d.restDays.includes(i)}" onclick="drToggleRest(${i})">${esc(weekdayName(i))}</span>`).join('')}</div>
    <div class="mu" style="margin-top:6px">${esc(t('cp_rest_hint'))}</div>
  </div>`;
}
function drSet(k,v){
  if(!DR)initDraft();
  DR[k]=v;
  if(k==='mode'){
    if(v==='hifdh'&&DR.method==='ottoman'){DR.method='simple';DR.sabak=5;DR.chunks='0'}
  }
  if(k==='method'){
    if(v==='ottoman'){DR.sabak=0;DR.chunks='5,10,15,0'}
    else if(v==='simple'){DR.sabak=DR.mode==='revision'?0:5;DR.chunks='0'}
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
  const rm=$('roadmapBox');if(rm)rm.innerHTML=roadmapCardInner(DR);
}
function posHintText(){
  const ord=DR?validOrder(DR.order):'fwd';
  const seq=seqOf(ord);
  const f=DR?Number(DR.fr)||0:0;
  if(f<=0){
    const p=seq[0];
    return t('pf_hint_start',{p,j:juzOf(p),s:surahOf(p)});
  }
  if(f>=TOTAL)return t('pf_hint_all');
  const lastP=seq[Math.ceil(f)-1], nextP=seq[Math.floor(f)];
  return t('pf_hint_mid',{f,last:lastP,j:juzOf(lastP),next:nextP,s:surahOf(nextP)});
}

/* Juz fully memorized after `count` pages in a given order (exact, not estimated). */
function juzDoneAtCount(ord,count){
  const seq=seqOf(ord), have=new Set(seq.slice(0,Math.max(0,Math.min(TOTAL,Math.ceil(count)))));
  let n=0;for(let j=1;j<=30;j++){let ok=true;for(let p=JUZ_START[j];p<=juzEnd(j);p++)if(!have.has(p)){ok=false;break}if(ok)n++}
  return n;
}

function roadmapCardInner(d){
  const today=T();
  const studyDays=Math.max(4,Math.min(7,parseInt(d.studyDays,10)||6));
  const restDays=7-studyDays;
  const calFactor=7/studyDays;
  const ord=validOrder(d.order||'fwd');
  const items=[];
  const customNoNew=d.method==='custom'&&!(parseFloat(d.pace)>0);

  if(d.mode==='revision'||customNoNew){
    const memPages=Math.max(1,Number(d.fr)||0);
    const estJuz=Math.max(1,Math.ceil(memPages/20));
    const revPerDay=Math.max(1,parseInt(d.rev,10)||1);
    let cycleStudyDays;
    if(d.method==='tikrar')cycleStudyDays=6;
    else if(d.method==='custom')cycleStudyDays=Math.max(1,Math.ceil(memPages/Math.max(1,parseInt(d.crPerDay,10)||10)));
    else if(d.method==='ottoman')cycleStudyDays=Math.max(1,Math.ceil(estJuz/revPerDay))*4;
    else cycleStudyDays=Math.max(1,Math.ceil(estJuz/revPerDay));
    const oneCycleCal=Math.max(1,Math.ceil(cycleStudyDays*calFactor));
    const perYear=Math.max(1,Math.round(365/oneCycleCal));
    items.push({title:d.method==='ottoman'?t('rm_rev1_ottoman'):t('rm_rev1'),badge:fmtDuration(oneCycleCal),sub:t('rm_rev1_sub',{n:memPages,date:fmt(addDays(today,oneCycleCal))})});
    items.push({title:t('rm_rev3'),badge:fmtDuration(oneCycleCal*3),sub:t('rm_rev3_sub',{date:fmtMonthYear(addDays(today,oneCycleCal*3))})});
    items.push({title:t('rm_year',{n:perYear}),badge:t('rm_1year'),sub:restDays?tn('rm_year_sub_rest',restDays,{d:studyDays}):t('rm_year_sub_daily')});
  }else{
    const pace=Math.max(0.5,parseFloat(d.pace)||1);
    const fr=Math.max(0,Math.min(TOTAL,Number(d.fr)||0));
    const remaining=Math.max(0,TOTAL-fr);
    if(remaining<=0){
      items.push({title:t('rm_all'),badge:t('rm_khatmah'),sub:t('rm_all_sub')});
    }else{
      // The juz you are in right now, following your own memorization order
      const seq=seqOf(ord), idx=Math.min(TOTAL-1,Math.floor(fr)), jNow=juzOf(seq[idx]);
      let left=0;for(let k=idx;k<TOTAL&&juzOf(seq[k])===jNow;k++)left++;
      left=Math.max(0.5,left-(fr%1));
      const daysJuz=Math.max(1,Math.ceil((left/pace)*calFactor));
      items.push({title:t('rm_finish_juz',{j:jNow}),badge:fmtDuration(daysJuz),sub:t('rm_target',{date:fmt(addDays(today,daysJuz))})});
      if(remaining>60){
        const midPages=Math.min(remaining-20,100);
        const daysMid=Math.max(1,Math.ceil((midPages/pace)*calFactor));
        const midJuz=juzDoneAtCount(ord,fr+midPages);
        if(midJuz>0)items.push({title:tn('rm_reach',midJuz),badge:fmtDuration(daysMid),sub:t('rm_reach_sub',{n:midPages,date:fmtMonthYear(addDays(today,daysMid))})});
      }
      const totalCal=Math.max(1,Math.ceil((remaining/pace)*calFactor));
      items.push({title:t('rm_khatmah_full'),badge:fmtDuration(totalCal),sub:t('rm_finish',{date:fmtMonthYear(addDays(today,totalCal))})});
    }
  }
  const paceNote=(d.mode==='revision'||customNoNew)
    ?(restDays?tn('rm_note_rev_rest',restDays,{d:studyDays}):t('rm_note_rev_daily'))
    :(restDays?tn('rm_note_pace_rest',restDays,{p:Math.round(parseFloat(d.pace||1)*studyDays*10)/10,d:studyDays}):t('rm_note_pace_daily',{p:Math.round(parseFloat(d.pace||1)*7*10)/10}));

  return `<div class="row"><h2 style="margin:0">${esc(t('rm_title'))}</h2><span class="pill">${esc(t('rm_projected'))}</span></div>
    <div class="mu" style="margin-top:4px">${esc(paceNote)}</div>
    <div class="roadmap">${items.map(it=>`<div class="rm-item">
      <div class="rm-dot"></div>
      <div class="rm-head"><b>${esc(it.title)}</b><span class="pill">${esc(it.badge)}</span></div>
      <div class="mu" style="margin-top:2px">${esc(it.sub)}</div>
    </div>`).join('')}</div>
    <div class="rm-quote">${LANG==='ar'?'«أحبُّ الأعمال إلى الله أدومها وإن قلّ»':esc(t('ob_hadith'))}</div>`;
}

function startCommitHold(ctx,e){
  if(e)e.preventDefault();
  cancelCommitHold(false);
  COMMIT_DONE=false;
  COMMIT_START=performance.now();
  const btn=$('commitBtn'), fill=$('commitFill'), lbl=$('commitLabel');
  if(!btn||!fill)return;
  btn.classList.add('holding');
  if(lbl)lbl.textContent=t('pf_holding');
  if(navigator.vibrate)navigator.vibrate(18);
  const DURATION=1100;
  const step=now=>{
    const pct=Math.min(100,((now-COMMIT_START)/DURATION)*100);
    fill.style.width=pct.toFixed(1)+'%';
    if(pct>=100){
      COMMIT_DONE=true;
      COMMIT_RAF=null;
      btn.classList.add('committed');
      if(lbl)lbl.textContent=t('pf_committed');
      if(navigator.vibrate)navigator.vibrate([45,30,65]);
      setTimeout(()=>savePlan(ctx),180);
      return;
    }
    COMMIT_RAF=requestAnimationFrame(step);
  };
  COMMIT_RAF=requestAnimationFrame(step);
}
function cancelCommitHold(showHint){
  if(COMMIT_RAF){cancelAnimationFrame(COMMIT_RAF);COMMIT_RAF=null}
  if(COMMIT_DONE)return;
  const btn=$('commitBtn'), fill=$('commitFill'), lbl=$('commitLabel');
  if(btn)btn.classList.remove('holding','committed');
  if(fill)fill.style.width='0%';
  if(lbl)lbl.textContent=lbl.dataset.idle||t('pf_hold');
  if(showHint&&COMMIT_START&&(performance.now()-COMMIT_START)<450)toast(t('pf_hold_hint'));
  COMMIT_START=0;
}
/* Keyboard / accessibility: Enter or Space on the commit button saves directly. */
function commitKey(ctx,e){if(e.key==='Enter'||e.key===' '){e.preventDefault();savePlan(ctx)}}

function planForm(ctx){
  if(!DR)initDraft();
  const d=DR;
  const isRevOnly=d.mode==='revision';
  const isHifdhOnly=d.mode==='hifdh';
  const M=(k,ico)=>[k,t('m_'+k),t('m_'+k+'_sub'),ico];
  const methods=isRevOnly
    ?[['simple',t('m_simple_rev'),t('m_simple_rev_sub'),'cal'],['ottoman',t('m_ottoman'),t('m_ottoman_rev_sub'),'loop'],['tikrar',t('m_tikrar_rev'),t('m_tikrar_rev_sub'),'star']]
    :(isHifdhOnly
      ?[['tikrar',t('m_tikrar'),t('m_tikrar_hifdh_sub'),'star'],['simple',t('m_simple'),t('m_simple_hifdh_sub'),'cal']]
      :[M('tikrar','star'),M('ottoman','loop'),M('simple','cal')]);
  methods.push(['custom',t('m_custom'),t('m_custom_sub'),'edit']);
  const isCustom=d.method==='custom';
  const orders=[['fwd',t('o_fwd'),t('o_fwd_sub'),'fwd'],['juz_rev',t('o_juz_rev'),t('o_juz_rev_sub'),'juzrev'],['page_rev',t('o_page_rev'),t('o_page_rev_sub'),'pagerev']];
  const paces=[0.5,1,2,3];
  const paceNum=parseFloat(d.pace);
  const showPaces=paces.includes(paceNum)?paces:[...paces,paceNum].filter(x=>x>0);
  const juzLabel=d.order==='fwd'?t('pf_juz_from1'):t('pf_juz_from30');
  const amt=p=>p===0.5?t('amt_half'):tn('amt_pages',p);

  const adv=d.method==='tikrar'
   ?`<div class="two">
      <div><label class="f">${esc(t('pf_tour_num'))}</label><input type="number" inputmode="numeric" value="${esc(d.tourNum)}" oninput="drIn('tourNum',this.value)"></div>
      <div><label class="f">${esc(t('pf_tour_day'))}</label><input type="number" inputmode="numeric" value="${esc(d.tourDay)}" oninput="drIn('tourDay',this.value)"></div>
     </div>`
   :`<div class="two">
      <div><label class="f">${esc(t('pf_next_juz'))}</label><input type="number" inputmode="numeric" value="${esc(d.juz)}" oninput="drIn('juz',this.value)"></div>
      <div><label class="f">${esc(t('pf_cycle'))}</label><input type="number" inputmode="numeric" value="${esc(d.cycle)}" oninput="drIn('cycle',this.value)"></div>
      <div><label class="f">${esc(t('pf_period'))}</label><input type="number" inputmode="numeric" value="${esc(d.period)}" oninput="drIn('period',this.value)"></div>
      <div><label class="f">${esc(t('pf_rev_per_day'))}</label><input type="number" inputmode="numeric" value="${esc(d.rev)}" oninput="drIn('rev',this.value)"></div>
      ${!isRevOnly?`<div><label class="f">${esc(t('pf_recent_daily'))}</label><input type="number" inputmode="numeric" value="${esc(d.sabak)}" oninput="drIn('sabak',this.value)"></div>`:''}
     </div>
     <label class="f">${esc(t('pf_chunks'))}</label>
     <input type="text" dir="ltr" value="${esc(d.chunks)}" oninput="drIn('chunks',this.value)">
     <div class="mu" style="margin-top:4px">${esc(t('pf_chunks_hint'))}</div>
     <label class="f">${esc(t('pf_after_last'))}</label>
     <div class="seg"><span class="${d.after!=='restart'?'on':''}" onclick="drSet('after','keep')">${esc(t('pf_keep_whole'))}</span><span class="${d.after==='restart'?'on':''}" onclick="drSet('after','restart')">${esc(t('pf_restart'))}</span></div>`;

  const holdLabel=ctx==='onboard'?t('pf_hold_begin'):t('pf_hold');
  return `
    ${ctx==='onboard'?`<div class="card"><label class="f" style="margin-top:0">${esc(t('ob_name_q'))}</label><input type="text" id="obName" maxlength="40" placeholder="${esc(t('ob_name_ph'))}" value="${esc(d.name||'')}" oninput="drIn('name',this.value)"></div>`:''}

    <div class="sec" style="margin-top:4px">1. ${esc(t('pf_s1'))}</div>
    <div class="seg3">
      <span class="${d.mode==='both'?'on':''}" onclick="drSet('mode','both')">${esc(t('pf_mode_both'))}</span>
      <span class="${d.mode==='hifdh'?'on':''}" onclick="drSet('mode','hifdh')">${esc(t('pf_mode_hifdh'))}</span>
      <span class="${d.mode==='revision'?'on':''}" onclick="drSet('mode','revision')">${esc(t('pf_mode_revision'))}</span>
    </div>

    <div class="sec">2. ${esc(isRevOnly?t('pf_s2_rev'):t('pf_s2'))}</div>
    <div class="mgrid" style="grid-template-columns:repeat(${methods.length>3?2:methods.length},1fr)">
      ${methods.map(m=>`<div class="mtile ${d.method===m[0]?'on':''}" role="radio" aria-checked="${d.method===m[0]}" tabindex="0" onclick="drSet('method','${m[0]}')">${ic(m[3])}<b>${esc(m[1])}</b><span>${esc(m[2])}</span></div>`).join('')}
    </div>

    <div class="sec">3. ${esc(t('pf_s3'))}</div>
    <div class="mgrid">${orders.map(o=>`<div class="mtile ${d.order===o[0]?'on':''}" role="radio" aria-checked="${d.order===o[0]}" tabindex="0" onclick="drSet('order','${o[0]}')">${ic(o[3])}<b>${esc(o[1])}</b><span>${esc(o[2])}</span></div>`).join('')}</div>

    <div class="sec">4. ${esc(isRevOnly?t('pf_s4_rev'):t('pf_s4'))}</div>
    <div class="card">
      <div class="seg"><span class="${d.posType==='page'?'on':''}" onclick="drPosType('page')">${esc(t('pf_pages_done'))}</span><span class="${d.posType==='juz'?'on':''}" onclick="drPosType('juz')">${esc(t('pf_juz_done'))}</span></div>
      ${d.posType==='page'
        ?`<label class="f" style="margin-top:0">${esc(t('ob_mem_pages_lbl'))}</label><input type="number" inputmode="decimal" step="0.5" min="0" max="604" value="${esc(d.fr)}" oninput="drPos(this.value)">`
        :`<label class="f" style="margin-top:0">${esc(juzLabel)}</label><input type="number" inputmode="numeric" min="0" max="30" placeholder="5" value="${esc(d.juzIn)}" oninput="drPos(this.value)">`}
      <div class="mu" id="posHint" style="margin-top:6px">${esc(posHintText())}</div>
    </div>

    ${isCustom?`<div class="sec">5. ${esc(t('cp_title'))}</div>${customPlanSection(d,isRevOnly,isHifdhOnly)}`:`<div class="sec">5. ${esc(t('pf_s5'))}</div>
    <div class="card">
      ${!isRevOnly?`<div class="mu" style="margin-bottom:8px">${esc(t('pf_new_per_day'))}</div>
        <div class="pace" style="margin-bottom:14px">${showPaces.map(p=>`<span class="${p===paceNum?'on':''}" onclick="drSet('pace',${p})">${esc(amt(p))}</span>`).join('')}</div>`:''}
      ${isRevOnly&&d.method!=='tikrar'?`<div class="mu" style="margin-bottom:8px">${esc(t('pf_juz_per_day'))}</div>
        <div class="pace" style="margin-bottom:14px">${[1,2,3,4,5].map(r=>`<span class="${parseInt(d.rev,10)===r?'on':''}" onclick="drSet('rev',${r})">${esc(tn('ob_juz',r))}</span>`).join('')}</div>`:''}
      ${isHifdhOnly&&d.method==='simple'?`<div class="mu" style="margin-bottom:8px">${esc(t('pf_recent_connect'))}</div>
        <div class="pace" style="margin-bottom:14px">${[0,3,5,10].map(sb=>`<span class="${parseInt(d.sabak,10)===sb?'on':''}" onclick="drSet('sabak',${sb})">${esc(sb===0?t('cp_none'):amt(sb))}</span>`).join('')}</div>`:''}
      <div class="mu" style="margin-bottom:8px">${esc(t('ob_days_q'))}</div>
      <div class="pace">${[5,6,7].map(x=>`<span class="${parseInt(d.studyDays,10)===x?'on':''}" onclick="drSet('studyDays',${x})">${esc(x===7?t('ob_days_7'):t('ob_days_n',{n:x}))}</span>`).join('')}</div>
    </div>`}

    <div class="card" id="roadmapBox">${roadmapCardInner(d)}</div>

    ${isCustom?'':`<details class="card adv"><summary>⚙️ ${esc(t('pf_advanced'))}</summary><div style="margin-top:10px">${adv}</div></details>`}

    <div class="commit-wrap">
      <button type="button" id="commitBtn" class="commit-btn"
        onpointerdown="startCommitHold('${ctx}',event)"
        onpointerup="cancelCommitHold(true)"
        onpointerleave="cancelCommitHold(false)"
        onpointercancel="cancelCommitHold(false)"
        onkeydown="commitKey('${ctx}',event)">
        <div class="commit-fill" id="commitFill"></div>
        <span class="commit-label" id="commitLabel" data-idle="${esc(holdLabel)}">${esc(holdLabel)}</span>
      </button>
      <div class="mu" style="margin-top:6px">${esc(t('pf_hold_help'))}</div>
    </div>`;
}

function savePlan(ctx){
  if(!DR)initDraft();
  const d=DR;
  const f={
    name:ctx==='onboard'?(d.name||''):undefined,
    mode:d.mode,method:d.method,order:d.order,newPerDay:d.pace,frontier:d.fr,
    revPerDay:d.rev,sabakPages:d.sabak,studyDaysPerWeek:d.studyDays,
    cycle:d.cycle,juz:d.juz,period:d.period,
    tourDay:d.tourDay,tourNum:d.tourNum,chunks:d.chunks,afterLast:d.after,
    crType:d.crType,crPerDay:d.crPerDay,crWeekly:d.crWeekly,crTasks:d.crTasks,restDays:d.restDays
  };
  if(d.method==='custom'){f.studyDaysPerWeek=Math.max(4,7-(d.restDays||[]).length);if(!f.chunks)f.chunks='0'}
  if($('msg'))$('msg').textContent='';
  const r=api.savePlan(T(),f);
  if(r&&r.error){if($('msg'))$('msg').textContent=r.error;window.scrollTo(0,0);return}
  D=r;DR=null;OB=null;
  TAB='today';
  window.scrollTo(0,0);
  toast(r.kept?t('pf_saved_kept'):t('pf_saved'),4000);
  buildNav();render();
}

function saveProfileBasic(){
  const s=loadState();
  s.name=$('stName').value.trim();
  s.email=$('stEmail').value.trim();
  saveState(s);DR=null;D=null;
  toast(t('pr_saved'));
  setTab('settings');
}

/* ==================== TAB RENDERERS ==================== */
const tr=(k,v)=>t(k,v);   // translation helper usable where "t" is a local variable
/* Community, Profile and settings screens live in js/profile.js */
async function render(){
  const seq=++RENDER_SEQ;
  if(!D){call('getData');return}
  const s=D.state,st=D.stats,day=D.day;

  if(!s.onboarded){renderOnboarding();return}   // first-time welcome & setup (onboard.js)
  OB=null;

  $('bottomNav').style.display='flex';

  if(TAB==='today'){rToday(s,st,day)}
  else if(TAB==='community'){rCommunity(s)}
  else if(TAB==='tools'){rTools(s)}
  else if(TAB==='settings'){rSettings(s)}
  else if(TAB==='plan'){rPlanPage()}
  else if(TAB==='profile_edit'){rProfileEdit(s)}
  else if(TAB==='ai'){rAiPage(s)}
  else if(TAB==='backup'){rBackupPage(s)}
  else if(TAB==='privacy'){rPrivacyPage()}
  else if(TAB==='about'){rAboutPage()}
  else if(TAB==='journey'){rStats(s,st)}
  else if(TAB==='quran'){rQuran()}
  else if(TAB==='quiz'){rQuiz()}
  else if(TAB==='tasbih'){rTasbih(s)}
  else if(TAB==='recite'){await rRecite(s,seq)}
  else if(TAB==='library'){await rLibrary(s,seq)}
}

// Coming back to the app: refresh data, but never throw away a draft (notes and plan drafts are kept).
document.addEventListener('visibilitychange',()=>{if(!document.hidden){D=null;render()}});
// If the app stays open past midnight, move to the new day automatically.
setInterval(()=>{if(D&&D.date&&D.date!==T()&&!isTyping()){D=null;render()}},60000);
if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
// "Auto" theme follows the phone's light/dark setting live.
if(window.matchMedia){const mq=matchMedia('(prefers-color-scheme: dark)');const onChange=()=>{try{applyTheme(loadState())}catch(e){}};if(mq.addEventListener)mq.addEventListener('change',onChange);else if(mq.addListener)mq.addListener(onChange)}
if('serviceWorker' in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
/* Home-screen shortcuts open a tab directly: index.html?tab=tasbih */
(function(){
  try{
    const want=new URLSearchParams(location.search).get('tab');
    const ok=['today','journey','quran','quiz','tasbih','library','recite','tools','community','settings'];
    if(want&&ok.includes(want)&&loadState().onboarded)TAB=want;
  }catch(e){}
})();
buildNav();
render();
