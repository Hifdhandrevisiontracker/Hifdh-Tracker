/* ==========================================================================
   My Companion — daily plan builder and memory-strength map
   ========================================================================== */

/* All tasks of a day that count (skipped ones don't). */
function dayTasks(day){
  if(!day)return[];
  return [day.n,day.sb,...(Array.isArray(day.r)?day.r:[]),...(Array.isArray(day.x)?day.x:[])].filter(t=>t&&!t.skip);
}
const anyDone=day=>dayTasks(day).some(t=>t.done);
function allDone(day){
  if(!day||!Array.isArray(day.r)||day.rest)return false;
  const list=dayTasks(day);
  return list.length>0&&list.every(t=>t.done);
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

/* Weekday (0 = Sunday) of a YYYY-MM-DD date */
function weekdayOf(dateStr){const p=String(dateStr||T()).split('-');return new Date(+p[0],+p[1]-1,+p[2]).getDay()}
/* Rest days are part of "My own plan" */
function isRestDay(dateStr,st){
  const s=st||(typeof loadState==='function'?loadState():null);
  return Boolean(s&&s.method==='custom'&&Array.isArray(s.restDays)&&s.restDays.includes(weekdayOf(dateStr)));
}
/* "1-20, 45, 582-604" → [1..20,45,582..604] */
function parsePageRanges(txt){
  const out=[];const seen=new Set();
  String(txt||'').split(/[,،;\s]+/).forEach(part=>{
    const m=part.match(/^(\d{1,3})(?:[-–](\d{1,3}))?$/);if(!m)return;
    let a=+m[1],b=m[2]?+m[2]:a;
    a=Math.max(1,Math.min(TOTAL,a));b=Math.max(1,Math.min(TOTAL,b));
    const step=a<=b?1:-1;
    for(let p=a;step>0?p<=b:p>=b;p+=step){if(!seen.has(p)){seen.add(p);out.push(p)}if(out.length>=TOTAL)break}
  });
  return out;
}
/* Pages the user knows, in their memorization order */
function memorizedInOrder(s){
  const seq=seqOf(s.order);
  const known=seq.filter(p=>s.pst&&s.pst[p-1]&&s.pst[p-1]!=='0');
  if(known.length)return known;
  return seq.slice(0,Math.min(TOTAL,Math.ceil(s.frontier||0)));
}

function makePlan(s,today){
  const ord=validOrder(s.order);
  const plan={n:null,sb:null,r:[],x:[],u:[],ord};
  if(s.method==='custom'&&isRestDay(today||T(),s)){plan.rest=true;return plan}
  const doHifdh=s.mode==='both'||s.mode==='hifdh';
  const doRev=s.mode==='both'||s.mode==='revision';
  const npd=Number(s.newPerDay);
  const stepPages=isNaN(npd)?1:Math.max(0,npd);
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

  if(s.method==='custom'){
    // Recent pages (the last N pages before today's new portion)
    const sbPagesN=Math.max(0,Number(s.sabakPages)||0);
    if(doHifdh&&sbPagesN>0&&curUnits>=1){
      const uA=Math.max(1,curUnits-Math.round(sbPagesN*2)+1);
      const sbPages=pagesInUnits(ord,uA,curUnits);
      plan.sb={uA,uB:curUnits,a:sbPages[0],b:sbPages[sbPages.length-1],pages:sbPages,ord,useHalf,label:'Recent',done:false};
    }
    // Older revision: rotate through everything memorized, or a fixed weekly schedule
    if(doRev){
      if(s.crType==='weekly'){
        const pages=parsePageRanges((s.crWeekly||[])[weekdayOf(today||T())]);
        if(pages.length)plan.r.push({isCustom:true,kind:'weekly',pages,a:pages[0],b:pages[pages.length-1],ord,done:false});
      }else{
        const known=memorizedInOrder(s);
        const M=known.length;
        if(M>0){
          const per=Math.max(1,Math.min(M,Math.round(Number(s.crPerDay)||10)));
          const pos=((Math.floor(Number(s.crPos)||0)%M)+M)%M;
          const pages=[];for(let k=0;k<per;k++)pages.push(known[(pos+k)%M]);
          plan.r.push({isCustom:true,kind:'rotate',pages,a:pages[0],b:pages[pages.length-1],ord,done:false,
            before:{crPos:pos},after:{crPos:(pos+per)%M},wrapped:pos+per>=M});
        }
      }
    }
    plan.x=(Array.isArray(s.crTasks)?s.crTasks:[]).map(x=>String(x||'').trim()).filter(Boolean).slice(0,5).map(label=>({label,done:false}));
    return plan;
  }

  if(s.method==='tikrar'){
    if(s.mode==='revision'){
      if(curUnits>=1){
        const tDay=Math.max(1,Math.min(6,s.tourDay||1));
        const chunk=Math.max(1,Math.ceil(curUnits/6));
        const revStart=Math.min(curUnits,(tDay-1)*chunk+1);
        const revEnd=tDay===6?curUnits:Math.min(curUnits,tDay*chunk);
        const revPages=pagesInUnits(ord,revStart,revEnd);
        const before={tourDay:tDay,tourNum:s.tourNum||1};
        const after=tDay>=6?{tourDay:1,tourNum:(s.tourNum||1)+1}:{tourDay:tDay+1,tourNum:s.tourNum||1};
        plan.r.push({
          isTikrar:true,tourNum:s.tourNum||1,tourDay:tDay,
          uA:revStart,uB:revEnd,a:revPages[0],b:revPages[revPages.length-1],
          pages:revPages,ord,useHalf,done:false,before,after
        });
      }
      return plan;
    }
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

  if(s.sabakPages>0 && curUnits>=1 && (s.mode==='both' || s.mode==='hifdh')){
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
      const perDay=Math.max(1,Math.min(jNums.length,Number(s.revPerDay)||1)); // never the same juz twice in one day
      for(let i=0;i<perDay;i++){
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
