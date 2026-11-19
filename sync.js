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
let fbMods=null, fbApp=null, fbAuth=null, fbDb=null, authReady=false, unsubAuth=null, syncTimer=null;
const CLOUD_STATE={
  user:null,status:'offline',lastSync:'',busy:false,error:'',
  circleCode:LS.getItem('hifdh_circle_code')||'',
  circle:null,nudges:[],communityLessons:[],leaderboard:[],socialMsg:''
};

const isAdminUser=()=>Boolean(CLOUD_STATE.user&&CLOUD_STATE.user.uid===ADMIN_UID);

function setCloudUi(patch){
  Object.assign(CLOUD_STATE,patch);
  if(typeof render==='function')render();
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
      authReady=true;
      if(user){
        LS.setItem('hifdh_has_auth','1');
        setCloudUi({user:{uid:user.uid,email:user.email||'',name:user.displayName||''},error:''});
        await runCloudSync('auto');
      }else{
        LS.removeItem('hifdh_has_auth');
        setCloudUi({user:null,status:'offline',lastSync:'',busy:false,circle:null,nudges:[],leaderboard:[]});
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
  ['mode','method','order','newPerDay','revPerDay','sabakPages','chunks','afterLast','theme','color','uiText','uiCard','leaderboardOptIn'].forEach(k=>{
    if(planSrc&&planSrc[k]!==undefined)base[k]=planSrc[k];
  });
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
        <button class="g" style="width:100%" onclick="window._syncChoice('local')">📱 Keep This Phone’s Data</button>
        <button class="g" style="width:100%" onclick="window._syncChoice('cloud')">☁️ Use Cloud Copy</button>
      </div>
    </div>`;
    window._syncChoice=choice=>{
      delete window._syncChoice;
      closeModal();
      resolve(choice);
    };
  });
}

function memberSummary(s,user){
  const stats=(D&&D.stats)?D.stats:api.getData(T()).stats;
  return{
    name:(s.name||user.name||(user.email||'').split('@')[0]||'Student').slice(0,32),
    pages:Math.round((memCount(s)||0)*10)/10,
    juz:completedJuzCount(s),
    streak:stats.streak||0,
    updatedAt:Date.now()
  };
}

async function syncCircleAndNudges(db,m,user,s){
  const code=(CLOUD_STATE.circleCode||s.circleCode||'').trim().toUpperCase();
  if(code){
    const cRef=m.doc(db,'circles',code);
    const cSnap=await m.getDoc(cRef);
    if(cSnap.exists()){
      const cData=cSnap.data()||{};
      const sum=memberSummary(s,user);
      await m.updateDoc(cRef,{[`members.${user.uid}`]:sum,updatedAt:Date.now()});
      const membersObj=Object.assign({},cData.members||{},{[user.uid]:sum});
      setCloudUi({circleCode:code,circle:{id:code,name:cData.name||'Study Circle',members:membersObj}});
    }else{
      LS.removeItem('hifdh_circle_code');
      setCloudUi({circleCode:'',circle:null});
    }
  }
  const q=m.query(m.collection(db,'nudges'),m.where('toUid','==',user.uid));
  const nSnap=await m.getDocs(q);
  const items=[];
  nSnap.forEach(d=>items.push(Object.assign({id:d.id},d.data())));
  items.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
  setCloudUi({nudges:items.slice(0,15)});
}

async function syncLeaderboard(db,m,user,s){
  const lbRef=m.doc(db,'leaderboard',user.uid);
  if(s.leaderboardOptIn){
    const sum=memberSummary(s,user);
    await m.setDoc(lbRef,{uid:user.uid,name:sum.name,pages:sum.pages,juz:sum.juz,streak:sum.streak,updatedAt:Date.now()});
  }else{
    await m.deleteDoc(lbRef).catch(()=>{});
  }
  const q=m.query(m.collection(db,'leaderboard'),m.orderBy('pages','desc'),m.limit(20));
  const snap=await m.getDocs(q).catch(()=>null);
  if(snap){
    const rows=[];
    snap.forEach(d=>rows.push(d.data()));
    setCloudUi({leaderboard:rows});
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
    if(!user){toast('Sign in under Settings first');return}
    const s=loadState();
    const sum=memberSummary(s,user);
    if(action==='create'){
      const title=($('circleNameInp')?$('circleNameInp').value.trim():'')||'Hifdh Circle';
      const code=Math.random().toString(36).substring(2,8).toUpperCase();
      await m.setDoc(m.doc(db,'circles',code),{
        name:title.slice(0,40),code,createdBy:user.uid,createdAt:Date.now(),updatedAt:Date.now(),
        members:{[user.uid]:sum}
      });
      s.circleCode=code;saveState(s);LS.setItem('hifdh_circle_code',code);
      setCloudUi({circleCode:code,circle:{id:code,name:title,members:{[user.uid]:sum}},socialMsg:'Circle created! Share code '+code});
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
      setCloudUi({circleCode:code,circle:{id:code,name:cData.name||'Study Circle',members:membersObj},socialMsg:'Joined '+code+'!'});
      toast('Joined circle '+code+' ✓');
    }
  }catch(e){toast('Circle error: '+(e.message||e.code))}
}

function leaveCircleLocal(){
  const s=loadState();s.circleCode='';saveState(s);
  LS.removeItem('hifdh_circle_code');
  setCloudUi({circleCode:'',circle:null,socialMsg:''});
  toast('Left circle');
}

async function sendNudge(toUid,toName){
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user||!toUid||toUid===user.uid)return;
    const s=loadState();
    const fromName=(s.name||user.name||(user.email||'').split('@')[0]||'Partner').slice(0,30);
    await m.addDoc(m.collection(db,'nudges'),{
      fromUid:user.uid,fromName,toUid,
      text:'Assalamu Alaikum! Time for today’s Hifdh & Muraja’ah session.',
      createdAt:Date.now()
    });
    toast('Nudge sent to '+toName+' ✓');
  }catch(e){toast('Could not send nudge')}
}

async function dismissNudge(nudgeId){
  try{
    const {db,m}=await ensureFb();
    await m.deleteDoc(m.doc(db,'nudges',nudgeId));
    setCloudUi({nudges:CLOUD_STATE.nudges.filter(x=>x.id!==nudgeId)});
  }catch(e){}
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
    const id=Date.now();
    const docData={
      id,date:T(),cat,title,link,
      html:stripInlineImages(sanitizeHtml(rawHtml)),
      authorUid:user.uid,updatedAt:Date.now()
    };
    await m.setDoc(m.doc(db,'community_lessons',String(id)),docData);
    toast('Published to Community Lessons ✓');
    await loadCommunityLessons();
  }catch(e){toast('Publish error: '+(e.message||e.code))}
}

async function deleteCommunityLesson(docId){
  if(!isAdminUser()){toast('Admin permission required');return}
  if(!confirm('Delete this community lesson for all users?'))return;
  try{
    const {db,m}=await ensureFb();
    await m.deleteDoc(m.doc(db,'community_lessons',String(docId)));
    setCloudUi({communityLessons:CLOUD_STATE.communityLessons.filter(x=>String(x.docId)!==String(docId))});
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
      if(auth.currentUser)await syncLeaderboard(db,m,auth.currentUser,s);
    }catch(e){}
  }
  toast(s.leaderboardOptIn?'Opted in to leaderboard ✓':'Removed from leaderboard');
  render();
}

async function runCloudSync(trigger='auto'){
  if(CLOUD_STATE.busy)return;
  try{
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user)return;
    setCloudUi({busy:true,status:'syncing',error:''});

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

    for(const delId of deletedIds){
      if(cloudNotesMap.has(String(delId))){
        await m.deleteDoc(m.doc(db,'users',user.uid,'notes',String(delId)));
        cloudNotesMap.delete(String(delId));
      }
    }
    sv('hifdh_deleted_notes',[]);

    const localNotesMap=new Map(localNotes.map(n=>[String(n.id),n]));
    const mergedNotes=[];

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
    mergedNotes.sort((a,b)=>(b.updatedAt||b.id||0)-(a.updatedAt||a.id||0));

    saveState(finalState);
    sv('hifdh_days',finalDays);
    saveNotes(mergedNotes);
    LS.setItem(firstKey,'1');
    D=null;DR=null;
    await syncCircleAndNudges(db,m,user,finalState);
    await syncLeaderboard(db,m,user,finalState);
    await loadCommunityLessons();
    const nowTime=new Date().toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});
    setCloudUi({busy:false,status:'synced',lastSync:nowTime,error:''});
    if(trigger==='manual')toast('Synced with cloud ✓');
    render();
  }catch(e){
    setCloudUi({busy:false,status:'error',error:e.message||'Sync failed'});
    if(trigger==='manual')toast('Sync error: '+(e.message||'offline'));
  }
}

function scheduleCloudSync(){
  if(!LS.getItem('hifdh_has_auth'))return;
  clearTimeout(syncTimer);
  syncTimer=setTimeout(()=>runCloudSync('auto'),2500);
}

async function signInEmail(isSignup){
  const email=($('authEmail')?$('authEmail').value:'').trim();
  const pass=($('authPass')?$('authPass').value:'');
  if(!email||pass.length<6){setCloudUi({error:'Enter a valid email and a password (6+ characters).'});return}
  try{
    setCloudUi({busy:true,error:''});
    const {auth,m}=await ensureFb();
    if(isSignup){
      await m.createUserWithEmailAndPassword(auth,email,pass);
      toast('Account created ✓');
    }else{
      await m.signInWithEmailAndPassword(auth,email,pass);
      toast('Signed in ✓');
    }
  }catch(e){
    setCloudUi({busy:false,error:e.message.replace('Firebase: ','')});
  }
}

async function signInGoogle(){
  try{
    setCloudUi({busy:true,error:''});
    const {auth,m}=await ensureFb();
    const provider=new m.GoogleAuthProvider();
    await m.signInWithPopup(auth,provider);
    toast('Signed in with Google ✓');
  }catch(e){
    setCloudUi({busy:false,error:'Google sign-in unavailable here ('+e.code+'). Use Email & Password below.'});
  }
}

async function signOutCloud(){
  try{
    const {auth,m}=await ensureFb();
    await m.signOut(auth);
    LS.removeItem('hifdh_has_auth');
    setCloudUi({user:null,status:'offline',lastSync:'',busy:false,error:''});
    toast('Signed out (local data kept)');
  }catch(e){setCloudUi({error:e.message})}
}

async function deleteCloudAccount(){
  if(!confirm('Permanently delete your cloud account and all synced progress & notes? Local files on this phone will stay unless you also reset the app.'))return;
  try{
    setCloudUi({busy:true,error:''});
    const {auth,db,m}=await ensureFb();
    const user=auth.currentUser;
    if(!user)return;
    const notesSnap=await m.getDocs(m.collection(db,'users',user.uid,'notes'));
    for(const d of notesSnap.docs)await m.deleteDoc(d.ref);
    await m.deleteDoc(m.doc(db,'leaderboard',user.uid)).catch(()=>{});
    await m.deleteDoc(m.doc(db,'users',user.uid));
    LS.removeItem('hifdh_first_sync_'+user.uid);
    LS.removeItem('hifdh_has_auth');
    await m.deleteUser(user);
    setCloudUi({user:null,status:'offline',lastSync:'',busy:false,error:''});
    toast('Account & cloud data deleted ✓');
  }catch(e){
    setCloudUi({busy:false,error:e.code==='auth/requires-recent-login'?'For security, sign out and sign back in once, then tap Delete Account again.':e.message});
  }
}

function accountCardHtml(){
  const u=CLOUD_STATE.user;
  if(!u){
    return `<div class="card">
      <div class="row"><h2 style="margin:0">☁️ Cloud Sync & Account</h2><span class="pill">Optional</span></div>
      <div class="mu" style="margin:6px 0 10px">Sign in to back up progress and sync across devices. Audio, video &amp; inline photos stay private on your phone.</div>
      ${CLOUD_STATE.error?`<div style="color:#b91c1c;font-size:12px;font-weight:600;margin-bottom:8px">${esc(CLOUD_STATE.error)}</div>`:''}
      <button style="width:100%" ${CLOUD_STATE.busy?'disabled':''} onclick="signInGoogle()">Continue with Google</button>
      <div class="mu" style="text-align:center;margin:10px 0 6px">— or use Email &amp; Password —</div>
      <div class="two">
        <input type="email" id="authEmail" placeholder="Email address">
        <input type="password" id="authPass" placeholder="Password (6+ chars)">
      </div>
      <div class="two" style="margin-top:4px">
        <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="signInEmail(false)">Sign In</button>
        <button class="g" ${CLOUD_STATE.busy?'disabled':''} onclick="signInEmail(true)">Create Account</button>
      </div>
    </div>`;
  }
  const stLabel=CLOUD_STATE.status==='syncing'?'Syncing…':(CLOUD_STATE.status==='synced'?`Synced ${CLOUD_STATE.lastSync}`:(CLOUD_STATE.status==='error'?'Sync error':'Connected'));
  return `<div class="card">
    <d
