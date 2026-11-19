const FIREBASE_CFG={
  apiKey:"AIzaSyBcQJHJgGut33yxJFrqLPnITmdI7LgyTSw",
  authDomain:"my-companion-app-c0f8b.firebaseapp.com",
  projectId:"my-companion-app-c0f8b",
  storageBucket:"my-companion-app-c0f8b.firebasestorage.app",
  messagingSenderId:"266861372710",
  appId:"1:266861372710:web:df6121d115ee98c610cde7"
};

const ADMIN_UID='bIv6XebWtLh6qXMKEIBppcSCsUZ2';
const FB_VER='11.6.0';
let fbMods=null, fbApp=null, fbAuth=null, fbDb=null, unsubAuth=null, syncTimer=null, isSyncing=false;
let AUTH_FORM={email:'',pass:'',showPass:false};
let SHOW_COMM_COMPOSER=false, COMMUNITY_EDIT_ID=null;

const CLOUD_STATE={
  user:null,status:'offline',lastSync:'',busy:false,error:'',
  circleCode:'',circle:null,nudges:[],communityLessons:[],leaderboard:[],socialMsg:''
};

const isAdminUser=()=>Boolean(CLOUD_STATE.user&&CLOUD_STATE.user.uid===ADMIN_UID);

function setCloudUi(patch,forceRender=false){
  Object.assign(CLOUD_STATE,patch);
  if(typeof render!=='function')return;
  if(!forceRender){
    const ae=document.activeElement;
    if(ae&&(ae.tagName==='INPUT'||ae.tagName==='TEXTAREA'||ae.isContentEditable))return;
  }
  render();
}

function toggleShowPass(){
  AUTH_FORM.showPass=!AUTH_FORM.showPass;
  if(typeof render==='function')render();
}

function genCircleCode(){
  const chars='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out='';
  for(let i=0;i<6;i++)out+=chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function copyTextSafe(txt,label='Copied ✓'){
  if(!txt)return;
  if(navigator.clipboard&&navigator.clipboard.writeText){
    navigator.clipboard.writeText(txt).then(()=>toast(label)).catch(()=>toast(txt));
  }else{
    toast(txt);
  }
}

function shareCircleCode(){
  const c=CLOUD_STATE.circle;
  if(!c||!c.id)return;
  const msg=`Join my Study Circle "${c.name}" on My Companion! Circle code: ${c.id}\nhttps://hifdhandrevisiontracker.github.io/Hifdh-Tracker/`;
  if(navigator.share){
    navigator.share({title:c.name,text:msg}).catch(()=>copyTextSafe(c.id,'Circle code copied: '+c.id));
  }else{
    copyTextSafe(c.id,'Circle code copied: '+c.id);
  }
}

function calcActivityMetrics(daysObj){
  const days=daysObj||loadDays();
  const today=T();
  let activeDays30=0;
  for(let i=0;i<30;i++){
    const d=days[addDays(today,-i)];
    if(d&&anyDone(d))activeDays30++;
  }
  const todayObj=days[today];
  const doneToday=Boolean(todayObj&&allDone(todayObj));
  const startedToday=Boolean(todayObj&&anyDone(todayObj));
  let streak=0;
  let offset=doneToday?0:1;
  while(offset<400){
    const d=days[addDays(today,-offset)];
    if(d&&allDone(d)){streak++;offset++}
    else break;
  }
  return{activeDays30,streak,doneToday,startedToday};
}

async function ensureFb(){
  if(fbAuth&&fbDb)return{auth:fbAuth,db:fbDb,m:fbMods};
  const base=`https://www.gstatic.com/firebasejs/${FB_VER}`;
  const [appM,authM,fsM]=await Promise.all([
    import(`${base}/firebase-app.js`),
    import(`${base}/firebase-auth.js`),
    import(`${base}/firebase-firestore.js`)
  ]);
  fbMods={...appM,...authM,...fsM};
  fbApp=fbMods.getApps().length?fbMods.getApp():fbMods.initializeApp(FIREBASE_CFG);
  fbAuth=fbMods.getAuth(fbApp);
  fbDb=fbMods.getFirestore(fbApp);
  if(!unsubAuth){
    unsubAuth=fbMods.onAuthStateChanged(fbAuth,async user=>{
      if(user){
        LS.setItem('hifdh_has_auth','1');
        AUTH_FORM={email:'',pass:'',showPass:false};
        setCloudUi({user:{uid:user.uid,email:user.email||'',name:user.displayName||''},busy:false,error:''},true);
        await runCloudSync('auto');
      }else{
        LS.removeItem('hifdh_has_auth');
        setCloudUi({user:null,status:'offline',lastSync:'',busy:false,circleCode:'',circle:null,nudges:[],leaderboard:[]});
      }
    });
  }
  return{auth:fbAuth,db:fbDb,m:fbMods};
}

function stripInlineImages(html){
  if(!html)return '';
  const tpl=document.createElement('template');
  tpl.innerHTML=String(html);
  tpl.content.querySelectorAll('img').forEach(img=>{
    const src=(img.getAttribute('src')||'').trim();
    if(src.startsWith('data:')){
      const note=document.createElement('span');
      note.className='mu';
      note.textContent=' [Photo stored locally on original device] ';
      img.replaceWith(note);
    }
  });
  return tpl.innerHTML;
}

function hasLocalProgress(s,days,notes){
  return (s.onboarded&&(s.frontier>0||memCount(s)>0||Object.keys(days).length>1||notes.length>0));
}

function mergePstStrings(pA,pB){
  const a=(typeof pA==='string'&&pA.length===TOTAL)?pA:'0'.repeat(TOTAL);
  const b=(typeof pB==='string'&&pB.length===TOTAL)?pB:'0'.repeat(TOTAL);
  const rank={0:0,w:1,s:2};
  let out='';
  for(let i=0;i<TOTAL;i++){
    const ca=a[i]||'0', cb=b[i]||'0';
    out+=(rank[ca]||0)>=(rank[cb]||0)?ca:cb;
  }
  return out;
}

function mergeDays(localDays,cloudDays){
  const merged=Object.assign({},cloudDays||{},localDays||{});
  const allKeys=new Set([...Object.keys(cloudDays||{}),...Object.keys(localDays||{})]);
  allKeys.forEach(k=>{
    const ld0=(localDays||{})[k], cd0=(cloudDays||{})[k];
    if(!ld0){merged[k]=cd0;return}
    if(!cd0){merged[k]=ld0;return}
    const lScore=(ld0.u?ld0.u.length:0)+(allDone(ld0)?10:0);
    const cScore=(cd0.u?cd0.u.length:0)+(allDone(cd0)?10:0);
    merged[k]=lScore>=cScore?ld0:cd0;
  });
  return merged;
}

function mergeStates(localS,cloudS){
  const base=Object.assign({},DEFAULTS,cloudS||{},localS||{});
  const useLocalPlan=(localS.updatedAt||0)>=(cloudS.updatedAt||0);
  const planSrc=useLocalPlan?localS:cloudS;
  [
    'mode','method','order','newPerDay','revPerDay','sabakPages','chunks','afterLast',
    'theme','color','uiText','uiCard','uiScale','studyDaysPerWeek','planCommittedAt',
    'leaderboardOptIn','circleCode'
  ].forEach(k=>{
    if(planSrc&&planSrc[k]!==undefined)base[k]=planSrc[k];
  });
  if(!base.circleCode)base.circleCode=localS.circleCode||cloudS.circleCode||'';
  base.onboarded=Boolean(localS.onboarded||cloudS.onboarded);
  base.seenIntro=Boolean(localS.seenIntro||cloudS.seenIntro);
  base.frontier=Math.max(Number(localS.frontier)||0,Number(cloudS.frontier)||0);
  base.pst=mergePstStrings(localS.pst,cloudS.pst);
  base.tasbihTotal=Math.max(Number(localS.tasbihTotal)||0,Number(cloudS.tasbihTotal)||0);
  base.folders=Array.from(new Set([...(cloudS.folders||[]),...(localS.folders||[])]));
  base.name=localS.name||cloudS.name||'';
  base.email=localS.email||cloudS.email||'';
  base.updatedAt=Math.max(Number(localS.updatedAt)||0,Number(cloudS.updatedAt)||0,Date.now());
  return base;
}

function askFirstSyncChoice(){
  return new Promise(resolve=>{
    $('modalRoot').innerHTML=`<div class="modal-bg">
      <div class="modal-card" onclick="event.stopPropagation()">
        <div style="font-size:38px;margin-bottom:6px">☁️</div>
        <div style="font-size:18px;font-weight:800;color:var(--ac);margin-bottom:6px">Cloud Backup Found</div>
        <div class="mu" style="margin-bottom:14px">Both this phone and your cloud account have Hifdh progress. How would you like to sync?</div>
        <button style="width:100%" onclick="window._syncChoice('merge')">✨ Merge Both (Recommended)</button>
        <button class="g" style="width:100%;margin-top:8px" onclick="window._syncChoice('local')">📱 Keep This Phone’s Data</button>
        <button class="g" style="width:100%;margin-top:8px" onclick="window._syncChoice('cloud')">☁️ Use Cloud Copy</button>
      </div>
    </div>`;
    window._syncChoice=choice=>{
      delete window._syncChoice;
      closeModal();
      resolve(choice);
    };
  });
}

function memberSummary(s,user,daysObj){
  const act=calcActivityMetrics(daysObj);
  return{
    name:(s.name||user.displayName||user.name||(user.email||'').split('@')[0]||'Student').slice(0,32),
    pages:Math.round((memCount(s)||0)*10)/10,
    juz:completedJuzCount(s),
    streak:act.streak,
    activeDays30:act.activeDays30,
    doneToday:act.doneToday,
    startedToday:act.startedToday,
    todayDate:T(),
    updatedAt:Date.now()
  };
}

async function syncCircleAndNudges(db,m,user,s,daysObj){
  const code=(s.circleCode||'').trim().toUpperCase();
  if(code){
    const cRef=m.doc(db,'circles',code);
    const cSnap=await m.getDoc(cRef);
    if(cSnap.exists()){
      const cData=cSnap.data()||{};
      const sum=memberSummary(s,user,daysObj);
      await m.updateDoc(cRef,{[`members.${user.uid}`]:sum,updatedAt:Date.now()});
      const membersObj=Object.assign({},cData.members||{},{[user.uid]:sum});
      LS.setItem('hifdh_circle_code',code);
      setCloudUi({circleCode:code,circle:{id:code,name:cData.name||'Study Circle',members:membersObj}});
    }else{
      LS.removeItem('hifdh_circle_code');
      setCloudUi({circleCode:'',circle:null});
    }
  }else{
    LS.removeItem('hifdh_circle_code');
    setCloudUi({circleCode:'',circle:null});
  }
  const q=m.query(m.collection(db,'nudges'),m.where('toUid','==',user.uid));
  const nSnap=await m.getDocs(q);
  const items=[];
  nSnap.forEach(d=>items.push(Object.assign({id:d.id},d.data())));
  items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  setCloudUi({nudges:items.slice(0,15)});
}

async function syncLeaderboard(db,m,user,s,daysObj){
  const lbRef=m.doc(db,'leaderboard',user.uid);
  if(s.leaderboardOptIn){
    const act=calcActivityMetrics(daysObj);
    const name=(s.name||user.displayName||user.name||(user.email||'').split('@')[0]||'Student').slice(0,32);
    // Consistency-only: no memorized page or Juz totals published
    await m.setDoc(lbRef,{
      uid:user.uid,
      name,
      activeDays30:act.activeDays30,
      streak:act.streak,
      doneToday:act.doneToday,
      todayDate:T(),
      updatedAt:Date.now()
    });
  }else{
    await m.deleteDoc(lbRef).catch(()=>{});
  }
  const q=m.query(m.collection(db,'leaderboard'),m.limit(50));
  const snap=await m.getDocs(q).catch(()=>null);
  if(snap){
    const rows=[];
    snap.forEach(d=>rows.push(d.data()));
    rows.sort((a,b)=>
      (Number(b.activeDays30)||0)-(Number(a.activeDays30)||0) ||
      (Number(b.streak)||0)-(Number(a.streak)||0) ||
      (Number(b.updatedAt)||0)-(Number(a.updatedAt)||0)
    );
    setCloudUi({leaderboard:rows.slice(0,25)});
  }
}

async function loadCommunityLessons(){
  try{
    const {db,m}=await ensureFb();
    const snap=await m.getDocs(m.collection(db,'community_lessons'));
    const list=[];
    snap.forEach(d=>list.push(Object.assign({docId:d.id},d.data())));
    list.sort((a,b)=>(b.updatedAt||b.id||0)-(a.updatedAt||a.id||0));
    setCloudUi({communityLessons:list});
  }catch(e){}
}

async function createOrJoinCircle(action){
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user){toast('Sign in under Profile first');return}
    const s=loadState();
    const sum=memberSummary(s,user,loadDays());
    if(action==='create'){
      const title=($('circleNameInp')?$('circleNameInp').value.trim():'')||'Hifdh Circle';
      const code=genCircleCode();
      await m.setDoc(m.doc(db,'circles',code),{
        name:title.slice(0,40),code,createdBy:user.uid,createdAt:Date.now(),updatedAt:Date.now(),
        members:{[user.uid]:sum}
      });
      s.circleCode=code;saveState(s);LS.setItem('hifdh_circle_code',code);
      setCloudUi({circleCode:code,circle:{id:code,name:title,members:{[user.uid]:sum}},socialMsg:'Circle created! Share code '+code},true);
      toast('Circle '+code+' created ✓');
    }else{
      const code=($('circleCodeInp')?$('circleCodeInp').value.trim().toUpperCase():'');
      if(!code){toast('Enter a 6-character circle code');return}
      const cRef=m.doc(db,'circles',code);
      const cSnap=await m.getDoc(cRef);
      if(!cSnap.exists()){toast('Circle code not found');return}
      const cData=cSnap.data()||{};
      await m.updateDoc(cRef,{[`members.${user.uid}`]:sum,updatedAt:Date.now()});
      s.circleCode=code;saveState(s);LS.setItem('hifdh_circle_code',code);
      const membersObj=Object.assign({},cData.members||{},{[user.uid]:sum});
      setCloudUi({circleCode:code,circle:{id:code,name:cData.name||'Study Circle',members:membersObj},socialMsg:'Joined '+code+'!'},true);
      toast('Joined circle '+code+' ✓');
    }
  }catch(e){
    const msg=(e&&(e.code==='permission-denied'||/insufficient permissions/i.test(e.message||'')))
      ?'Publish the updated Firestore Rules in Firebase Console first.'
      :(e.message||e.code||'Unknown error');
    toast('Circle error: '+msg);
  }
}

function leaveCircleLocal(){
  if(!confirm('Leave this study circle? You can rejoin anytime with the code.'))return;
  const s=loadState();s.circleCode='';saveState(s);
  LS.removeItem('hifdh_circle_code');
  setCloudUi({circleCode:'',circle:null,socialMsg:''},true);
  toast('Left circle');
}

async function sendNudge(toUid,toName){
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user||!toUid||toUid===user.uid)return;
    const s=loadState();
    const fromName=(s.name||user.displayName||(user.email||'').split('@')[0]||'Partner').slice(0,30);
    await m.addDoc(m.collection(db,'nudges'),{
      fromUid:user.uid,fromName,toUid,
      text:'Assalamu Alaikum! Gentle reminder for today’s Qur’an session.',
      createdAt:Date.now()
    });
    toast('Nudge sent to '+toName+' ✓');
  }catch(e){toast('Could not send nudge')}
}

async function dismissNudge(nudgeId){
  try{
    const {db,m}=await ensureFb();
    await m.deleteDoc(m.doc(db,'nudges',nudgeId));
    setCloudUi({nudges:CLOUD_STATE.nudges.filter(x=>x.id!==nudgeId)},true);
  }catch(e){}
}

function openCommunityComposer(docId=null){
  if(!isAdminUser()){toast('Sign in with your Admin account to publish lessons');return}
  COMMUNITY_EDIT_ID=docId?String(docId):null;
  SHOW_COMM_COMPOSER=true;
  if(typeof render==='function')render();
  if(docId){
    const existing=(CLOUD_STATE.communityLessons||[]).find(x=>String(x.docId||x.id)===String(docId));
    if(existing){
      setTimeout(()=>{
        if($('commTitle'))$('commTitle').value=existing.title||'';
        if($('commCat'))$('commCat').value=existing.cat||'Tajweed Lessons';
        if($('commLink'))$('commLink').value=existing.link||'';
        if($('commEditor'))$('commEditor').innerHTML=sanitizeHtml(existing.html||'');
      },20);
    }
  }
}

function closeCommunityComposer(){
  SHOW_COMM_COMPOSER=false;
  COMMUNITY_EDIT_ID=null;
  if(typeof render==='function')render();
}

async function publishCommunityLesson(){
  if(!isAdminUser()){toast('Only the app admin can publish community lessons');return}
  const title=($('commTitle')?$('commTitle').value.trim():'');
  const cat=($('commCat')?$('commCat').value:'Tajweed Lessons');
  const link=($('commLink')?$('commLink').value.trim():'');
  const rawHtml=($('commEditor')?$('commEditor').innerHTML.trim():'');
  if(!title||!rawHtml){toast('Add both a lesson title and content');return}
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    const isEdit=Boolean(COMMUNITY_EDIT_ID);
    const id=isEdit?COMMUNITY_EDIT_ID:String(Date.now());
    const docData={
      id:isEdit?(Number(id)||id):Number(id),
      date:T(),cat,title,link,
      html:stripInlineImages(sanitizeHtml(rawHtml)),
      authorUid:user.uid,
      updatedAt:Date.now()
    };
    await m.setDoc(m.doc(db,'community_lessons',id),docData,{merge:true});
    SHOW_COMM_COMPOSER=false;
    COMMUNITY_EDIT_ID=null;
    toast(isEdit?'Community lesson updated ✓':'Published to Community Lessons ✓');
    await loadCommunityLessons();
    if(typeof render==='function')render();
  }catch(e){toast('Publish error: '+(e.message||e.code))}
}

async function deleteCommunityLesson(docId){
  if(!isAdminUser()){toast('Admin permission required');return}
  if(!confirm('Delete this community lesson for all users?'))return;
  try{
    const {db,m}=await ensureFb();
    await m.deleteDoc(m.doc(db,'community_lessons',String(docId)));
    setCloudUi({communityLessons:CLOUD_STATE.communityLessons.filter(x=>String(x.docId||x.id)!==String(docId))},true);
    toast('Community lesson removed ✓');
  }catch(e){toast('Delete error: '+(e.message||e.code))}
}

async function toggleLeaderboardOptIn(checked){
  const s=loadState();
  s.leaderboardOptIn=Boolean(checked);
  saveState(s);
  if(D)D.state=s;
  if(LS.getItem('hifdh_has_auth')){
    try{
      const {auth,db,m}=await ensureFb();
      if(auth.currentUser)await syncLeaderboard(db,m,auth.currentUser,s,loadDays());
    }catch(e){}
  }
  toast(s.leaderboardOptIn?'Joined Consistency Leaderboard ✓':'Removed from leaderboard');
  if(typeof render==='function')render();
}

async function runCloudSync(trigger='auto'){
  if(isSyncing)return;
  isSyncing=true;
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user)return;
    setCloudUi({busy:true,status:'syncing',error:''},trigger==='manual');

    const userRef=m.doc(db,'users',user.uid);
    const snap=await m.getDoc(userRef);
    const localS=loadState();
    const localDays=loadDays();
    const localNotes=loadNotes();
    const firstKey='hifdh_first_sync_'+user.uid;
    const isFirstForAccount=!LS.getItem(firstKey);

    let finalState=localS, finalDays=localDays, mode='merge';
    if(snap.exists()){
      const cData=snap.data()||{};
      const cloudS=cData.state||null;
      const cloudDays=cData.days||{};
      if(isFirstForAccount && cloudS && hasLocalProgress(localS,localDays,localNotes)){
        mode=await askFirstSyncChoice();
      }
      if(mode==='cloud' && cloudS){
        finalState=Object.assign({},DEFAULTS,cloudS,{aiKey:localS.aiKey||''});
        finalDays=cloudDays;
      }else if(mode==='local'){
        finalState=Object.assign({},localS,{updatedAt:Date.now()});
        finalDays=localDays;
      }else{
        finalState=cloudS?mergeStates(localS,cloudS):Object.assign({},localS,{updatedAt:Date.now()});
        finalDays=mergeDays(localDays,cloudDays);
      }
    }else{
      finalState=Object.assign({},localS,{updatedAt:Date.now()});
    }

    const syncState=Object.assign({},finalState);
    delete syncState.aiKey;
    await m.setDoc(userRef,{state:syncState,days:finalDays,updatedAt:Date.now()},{merge:true});

    const notesCol=m.collection(db,'users',user.uid,'notes');
    const cNotesSnap=await m.getDocs(notesCol);
    const cloudNotesMap=new Map();
    cNotesSnap.forEach(d=>cloudNotesMap.set(String(d.id),d.data()));
    const deletedIds=new Set(ld('hifdh_deleted_notes',[]));

    if(mode!=='cloud'){
      for(const delId of deletedIds){
        if(cloudNotesMap.has(String(delId))){
          await m.deleteDoc(m.doc(db,'users',user.uid,'notes',String(delId)));
          cloudNotesMap.delete(String(delId));
        }
      }
    }
    sv('hifdh_deleted_notes',[]);

    let mergedNotes=[];
    if(mode==='cloud'){
      mergedNotes=Array.from(cloudNotesMap.values());
    }else{
      const localNotesMap=new Map(localNotes.map(n=>[String(n.id),n]));
      for(const [id,ln] of localNotesMap){
        const cn=cloudNotesMap.get(id);
        const lUpd=ln.updatedAt||ln.id||0;
        const cUpd=cn?(cn.updatedAt||cn.id||0):0;
        if(!cn || mode==='local' || (mode==='merge'&&lUpd>=cUpd)){
          const cleanDoc={
            id:ln.id,date:ln.date||T(),cat:ln.cat||'Lesson',title:ln.title||'Untitled',
            link:ln.link||'',html:stripInlineImages(ln.html||esc(ln.body||'')),updatedAt:lUpd||Date.now()
          };
          await m.setDoc(m.doc(db,'users',user.uid,'notes',id),cleanDoc);
          mergedNotes.push(ln);
        }else{
          mergedNotes.push(cn);
        }
        cloudNotesMap.delete(id);
      }
      if(mode!=='local'){
        for(const [id,cn] of cloudNotesMap){
          if(!deletedIds.has(Number(id))&&!deletedIds.has(id))mergedNotes.push(cn);
        }
      }
    }
    mergedNotes.sort((a,b)=>(b.updatedAt||b.id||0)-(a.updatedAt||a.id||0));

    sv('hifdh_state',finalState);
    sv('hifdh_days',finalDays);
    sv('hifdh_notes',mergedNotes);
    LS.setItem(firstKey,'1');
    DR=null;
    D=api.getData(T());

    await syncCircleAndNudges(db,m,user,finalState,finalDays).catch(()=>{});
    await syncLeaderboard(db,m,user,finalState,finalDays).catch(()=>{});
    await loadCommunityLessons().catch(()=>{});

    const nowTime=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    setCloudUi({busy:false,status:'synced',lastSync:nowTime,error:''},trigger==='manual');
    if(trigger==='manual')toast('Synced with cloud ✓');
  }catch(e){
    setCloudUi({busy:false,status:'error',error:e.message||'Sync failed'},trigger==='manual');
    if(trigger==='manual')toast('Sync error: '+(e.message||'offline'));
  }finally{
    isSyncing=false;
  }
}

function scheduleCloudSync(){
  if(!LS.getItem('hifdh_has_auth'))return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>runCloudSync('auto'),2500);
}

async function signInEmail(isSignup){
  const email=(($('authEmail')?$('authEmail').value:AUTH_FORM.email)||'').trim();
  const pass=(($('authPass')?$('authPass').value:AUTH_FORM.pass)||'');
  AUTH_FORM.email=email;
  AUTH_FORM.pass=pass;
  if(!email||pass.length<6){setCloudUi({error:'Enter a valid email and a password (6+ characters).'},true);return}
  try{
    setCloudUi({busy:true,error:''},true);
    const {auth,m}=await ensureFb();
    if(isSignup){
      await m.createUserWithEmailAndPassword(auth,email,pass);
      toast('Account created ✓');
    }else{
      await m.signInWithEmailAndPassword(auth,email,pass);
      toast('Signed in ✓');
    }
  }catch(e){
    setCloudUi({busy:false,error:e.message.replace('Firebase: ','')},true);
  }
}

async function signInGoogle(){
  try{
    setCloudUi({busy:true,error:''},true);
    const {auth,m}=await ensureFb();
    const provider=new m.GoogleAuthProvider();
    await m.signInWithPopup(auth,provider);
    toast('Signed in with Google ✓');
  }catch(e){
    setCloudUi({busy:false,error:'Google sign-in unavailable here ('+e.code+'). Use Email & Password below.'},true);
  }
}

async function signOutCloud(){
  try{
    const {auth,m}=await ensureFb();
    await m.signOut(auth);
    LS.removeItem('hifdh_has_auth');
    AUTH_FORM={email:'',pass:'',showPass:false};
    setCloudUi({user:null,status:'offline',lastSync:'',busy:false,error:'',circleCode:'',circle:null,nudges:[],leaderboard:[]},true);
    toast('Signed out (local data kept)');
  }catch(e){setCloudUi({error:e.message},true)}
}

async function deleteCloudAccount(){
  if(!confirm('Permanently delete your cloud account and all synced progress & notes? Local files on this phone will stay unless you also reset the app.'))return;
  try{
    setCloudUi({busy:true,error:''},true);
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user)return;
    const notesSnap=await m.getDocs(m.collection(db,'users',user.uid,'notes'));
    for(const d of notesSnap.docs)await m.deleteDoc(d.ref);
    await m.deleteDoc(m.doc(db,'leaderboard',user.uid)).catch(()=>{});
    await m.deleteDoc(m.doc(db,'users',user.uid));
    LS.removeItem('hifdh_first_sync_'+user.uid);
    LS.removeItem('hifdh_has_auth');
    LS.removeItem('hifdh_circle_code');
    await m.deleteUser(user);
    AUTH_FORM={email:'',pass:'',showPass:false};
    setCloudUi({user:null,status:'offline',lastSync:'',busy:false,error:'',circleCode:'',circle:null,nudges:[],leaderboard:[]},true);
    toast('Account & cloud data deleted ✓');
  }catch(e){
    setCloudUi({busy:false,error:e.code==='auth/requires-recent-login'?'For security, sign out and sign back in once, then tap Delete Account again.':e.message},true);
  }
}

function accountCardHtml(){
  const u=CLOUD_STATE.user;
  if(!u){
    return `<div class="card">
      <div class="row"><h2 style="margin:0">☁️ Cloud Sync &amp; Account</h2><span class="pill">Optional</span></div>
      <div class="mu" style="margin:6px 0 10px">Sign in to back up progress, join a Study Circle, and sync across devices. Audio, video &amp; inline photos stay private on your phone.</div>
      ${CLOUD_STATE.error?`<div class="ai-status err" style="margin-bottom:10px">${esc(CLOUD_STATE.error)}</div>`:''}
      <button style="width:100%" ${CLOUD_STATE.busy?'disabled':''} onclick="signInGoogle()">Continue with Google</button>
      <div class="mu" style="text-align:center;margin:10px 0 6px">— or use Email &amp; Password —</div>
      <input type="email" id="authEmail" autocomplete="email" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Email address" value="${esc(AUTH_FORM.email)}" oninput="AUTH_FORM.email=this.value">
      <div class="row" style="gap:6px;margin-top:8px">
        <input type="${AUTH_FORM.showPass?'text':'password'}" id="authPass" inputmode="text" autocomplete="current-password" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="Password (6+ chars, letters &amp; numbers)" value="${esc(AUTH_FORM.pass)}" oninput="AUTH_FORM.pass=this.value" style="flex:1">
        <button type="button" class="g sm" onclick="toggleShowPass()" title="Show or hide password">${AUTH_FORM.showPass?'🙈':'👁️'}</button>
      </div>
      <div class="two" style="margin-top:8px">
        <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="signInEmail(false)">Sign In</button>
        <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="signInEmail(true)">Create Account</button>
      </div>
    </div>`;
  }
  const stLabel=CLOUD_STATE.status==='syncing'?'Syncing…':(CLOUD_STATE.status==='synced'?`Synced ${CLOUD_STATE.lastSync}`:(CLOUD_STATE.status==='error'?'Sync error':'Connected'));
  return `<div class="card">
    <div class="row"><h2 style="margin:0">☁️ Cloud Sync Active</h2><span class="pill">${esc(stLabel)}</span></div>
    <div class="mu" style="margin:6px 0 10px">Signed in as <b>${esc(u.email||u.name||'Member')}</b>${isAdminUser()?' · <span class="pill">Admin</span>':''}</div>
    ${CLOUD_STATE.error?`<div class="ai-status err" style="margin-bottom:10px">${esc(CLOUD_STATE.error)}</div>`:''}
    <div class="two">
      <button ${CLOUD_STATE.busy?'disabled':''} onclick="runCloudSync('manual')">🔄 Sync Now</button>
      <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="copyTextSafe('${esc(u.uid)}','User UID copied ✓')">Copy UID</button>
    </div>
  </div>`;
}

function circleCardHtml(){
  if(!CLOUD_STATE.user){
    return `<div class="card">
      <div class="row"><h2 style="margin:0">🤝 Study Circle</h2><span class="pill">Sign in</span></div>
      <div class="mu" style="margin-top:6px">Sign in under <b>Profile</b> to create or join a private Study Circle, track progress together, and send gentle nudges.</div>
      <button class="g sm" style="margin-top:10px" onclick="setTab('settings')">Go to Profile →</button>
    </div>`;
  }
  let nudgeBanner='';
  if(CLOUD_STATE.nudges&&CLOUD_STATE.nudges.length){
    nudgeBanner=CLOUD_STATE.nudges.map(n=>`<div class="media-box" style="margin-bottom:10px;background:var(--ac2);border-color:var(--ac)">
      <div class="row"><b>🔔 ${esc(n.fromName||'Partner')} nudged you</b><button class="g sm" onclick="dismissNudge('${esc(n.id)}')">Dismiss</button></div>
      <div style="font-size:.84rem;margin-top:4px">${esc(n.text||'Time for today’s Qur’an session!')}</div>
    </div>`).join('');
  }
  if(!CLOUD_STATE.circle){
    return `${nudgeBanner}<div class="card">
      <div class="row"><h2 style="margin:0">🤝 Study Circle</h2><span class="pill">Private Group</span></div>
      <div class="mu" style="margin:6px 0 12px">Start a circle with friends or enter a 6-character code to see each other’s daily consistency, Juz progress, and send gentle nudges.</div>
      <label class="f" style="margin-top:0">Create a new circle</label>
      <div class="row" style="gap:8px">
        <input type="text" id="circleNameInp" placeholder="e.g., Hifdh Leaders" style="flex:1">
        <button class="sm" onclick="createOrJoinCircle('create')">Create</button>
      </div>
      <label class="f">Or join with an invite code</label>
      <div class="row" style="gap:8px">
        <input type="text" id="circleCodeInp" placeholder="6-CHAR CODE" maxlength="6" style="flex:1;text-transform:uppercase;letter-spacing:.08em">
        <button class="g sm" onclick="createOrJoinCircle('join')">Join</button>
      </div>
    </div>`;
  }
  const todayStr=T();
  const members=Object.entries(CLOUD_STATE.circle.members||{}).sort((a,b)=>
    (Number(b[1].activeDays30)||0)-(Number(a[1].activeDays30)||0) ||
    (Number(b[1].streak)||0)-(Number(a[1].streak)||0) ||
    (Number(b[1].pages)||0)-(Number(a[1].pages)||0)
  );
  return `${nudgeBanner}<div class="card">
    <div class="row">
      <div>
        <h2 style="margin:0">${esc(CLOUD_STATE.circle.name)}</h2>
        <div class="mu">${members.length} member${members.length===1?'':'s'} · Code: <b>${esc(CLOUD_STATE.circle.id)}</b></div>
      </div>
      <button class="g sm" onclick="shareCircleCode()">📤 Share</button>
    </div>
    <div style="margin-top:12px">${members.map(([uid,mInfo])=>{
      const isMe=uid===CLOUD_STATE.user.uid;
      const doneToday=mInfo.doneToday && (!mInfo.todayDate || mInfo.todayDate===todayStr);
      const startedToday=mInfo.startedToday && (!mInfo.todayDate || mInfo.todayDate===todayStr);
      const todayBadge=doneToday?'Done today ✓':(startedToday?'In progress':'Not yet today');
      const daysTxt=mInfo.activeDays30!=null?`${mInfo.activeDays30}/30d active`:`🔥 ${mInfo.streak||0}d streak`;
      const avText=(typeof initials==='function')?initials(mInfo.name||'M'):'M';
      return `<div class="sr">
        <div class="row" style="justify-content:flex-start;gap:10px;min-width:0;flex:1">
          <div class="member-av">${esc(avText)}</div>
          <div style="min-width:0">
            <div><b>${esc(mInfo.name||'Member')}</b>${isMe?' <span class="pill">You</span>':''}</div>
            <div class="mu">${esc(todayBadge)} · 🔥 ${mInfo.streak||0}d · ${esc(daysTxt)}</div>
            <div class="mu">Juz ${mInfo.juz||0}/30 · ${mInfo.pages||0} pages</div>
          </div>
        </div>
        ${!isMe?`<button class="g sm" onclick="sendNudge('${esc(uid)}',decodeURIComponent('${encAttr(mInfo.name||'Partner')}'))">👋 Nudge</button>`:''}
      </div>`;
    }).join('')}</div>
    <div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd)">
      <button class="g sm" onclick="runCloudSync('manual')">🔄 Refresh</button>
      <button class="g sm" style="color:var(--danger)" onclick="leaveCircleLocal()">Leave Circle</button>
    </div>
  </div>`;
}

function leaderboardCardHtml(s){
  const optedIn=Boolean(s.leaderboardOptIn);
  const rows=CLOUD_STATE.leaderboard||[];
  const todayStr=T();
  const signedIn=Boolean(CLOUD_STATE.user);
  return `<div class="card">
    <div class="row"><h2 style="margin:0">🔥 Consistency Board</h2><span class="pill">Activity Only</span></div>
    <div class="mu" style="margin:6px 0 10px">Ranked purely by daily steadiness and streaks—memorized page totals are never shown here.</div>
    <label class="row" style="justify-content:flex-start;gap:10px;margin-bottom:12px;cursor:pointer">
      <input type="checkbox" ${optedIn?'checked':''} onchange="toggleLeaderboardOptIn(this.checked)">
      <span style="font-size:.86rem;font-weight:650">Show my consistency &amp; streak on the board</span>
    </label>
    ${!signedIn?'<div class="mu">Sign in under <b>Profile</b> to join and view the consistency board.</div>':(
      rows.length?rows.map((r,i)=>{
        const isMe=CLOUD_STATE.user&&r.uid===CLOUD_STATE.user.uid;
        const rkCls=i===0?'rank-1':(i===1?'rank-2':(i===2?'rank-3':''));
        const doneToday=r.doneToday && (!r.todayDate || r.todayDate===todayStr);
        const daysActive=Number(r.activeDays30)||0;
        return `<div class="sr">
          <div class="row" style="justify-content:flex-start;gap:10px;min-width:0">
            <div class="rank-badge ${rkCls}">${i+1}</div>
            <div style="min-width:0">
              <div><b>${esc(r.name||'Student')}</b>${isMe?' <span class="pill">You</span>':''}</div>
              <div class="mu">${daysActive}/30 days active${doneToday?' · Done today ✓':''}</div>
            </div>
          </div>
          <span class="pill">🔥 ${Number(r.streak)||0}d</span>
        </div>`;
      }).join(''):'<div class="mu">No entries yet. Opt in above and tap Refresh to appear first!</div>'
    )}
    ${signedIn?`<div style="margin-top:10px;text-align:right"><button class="g sm" onclick="runCloudSync('manual')">🔄 Refresh</button></div>`:''}
  </div>`;
}

function communityLessonsHtml(s){
  const list=CLOUD_STATE.communityLessons||[];
  const adminHere=isAdminUser();
  let h='';
  if(adminHere){
    h+=`<div class="card">
      <div class="row">
        <div>
          <b>📢 Community Lessons (Admin)</b>
          <div class="mu">Published lessons appear for all My Companion users.</div>
        </div>
        <button class="sm" onclick="${SHOW_COMM_COMPOSER?'closeCommunityComposer()':'openCommunityComposer()'}">${SHOW_COMM_COMPOSER?'Close':'+ New Lesson'}</button>
      </div>
      ${SHOW_COMM_COMPOSER?`<div style="margin-top:12px">
        <div class="two">
          <div><label class="f">Lesson Title</label><input type="text" id="commTitle" placeholder="e.g., Juz 30 Muraja’ah Tips"></div>
          <div><label class="f">Topic</label>
            <select id="commCat">${(s.folders||['Tajweed Lessons','Mutashabihat','Tafsir & Reflections']).map(f=>`<option value="${esc(f)}">${esc(f)}</option>`).join('')}</select>
          </div>
        </div>
        <label class="f">Optional Video / Reference Link</label>
        <input type="text" id="commLink" placeholder="https://youtube.com/...">
        <label class="f">Lesson Content</label>
        <div id="commEditor" class="rt-area" style="border-radius:12px" contenteditable="true" placeholder="Write a public lesson for all users..."></div>
        <button class="bigbtn" onclick="publishCommunityLesson()">${COMMUNITY_EDIT_ID?'💾 Update Lesson':'🚀 Publish to Community'}</button>
      </div>`:''}
    </div>`;
  }
  if(!list.length){
    h+=`<div class="card mu">No community lessons published yet.${adminHere?' Tap <b>+ New Lesson</b> above to publish your first one!':''}</div>`;
    return h;
  }
  h+=list.map(n=>{
    const docKey=String(n.docId||n.id);
    const yt=ytEmbedUrl(n.link);
    const safeLink=safeExternalUrl(n.link);
    return `<div class="card">
      <div class="row"><span class="pill">${esc(n.cat||'Community Lesson')}</span><span class="mu">${esc(n.date||'')}</span></div>
      <h2 style="margin:6px 0">${esc(n.title)}</h2>
      ${yt?`<iframe src="${yt}" style="width:100%;height:200px;border:0;border-radius:12px;margin:6px 0" allowfullscreen></iframe>`:''}
      ${safeLink&&!yt?`<div style="margin:4px 0"><a href="${esc(safeLink)}" target="_blank" rel="noopener noreferrer" style="color:var(--ac);font-size:.82rem;font-weight:700">🔗 Open Resource Link ↗</a></div>`:''}
      <div class="note-reader" style="font-size:.88rem;line-height:1.55;margin-top:8px;overflow-x:auto">${sanitizeHtml(n.html||'')}</div>
      ${adminHere?`<div class="row" style="margin-top:12px;padding-top:10px;border-top:1px solid var(--bd);justify-content:flex-end;gap:6px">
        <button class="g sm" onclick="openCommunityComposer('${esc(docKey)}')">✏️ Edit</button>
        <button class="g sm" style="color:var(--danger)" onclick="deleteCommunityLesson('${esc(docKey)}')">🗑️ Delete</button>
      </div>`:''}
    </div>`;
  }).join('');
  return h;
}

if(LS.getItem('hifdh_has_auth')){
  ensureFb().catch(()=>{});
}
loadCommunityLessons();
if(typeof render==='function')render();
