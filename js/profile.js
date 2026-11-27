/* ==========================================================================
   My Companion — Community, Profile & settings screens (Step 8)
   ========================================================================== */
const APP_VERSION='2.1';

function subHeader(title,tag,back='settings'){
  setHdr(`<div class="sub-hdr">
    <button class="back-btn" aria-label="${esc(t('btn_back'))}" onclick="setTab('${back}')">←</button>
    <div><h1 class="brand" style="font-size:1.45rem">${esc(title)}</h1>${tag?`<div class="tagline">${esc(tag)}</div>`:''}</div>
  </div>`);
}
function listRow(onclick,ico,title,sub,subCls){
  return `<button type="button" class="list-row" onclick="${onclick}">
    ${ico?`<div class="list-ico">${ic(ico)}</div>`:''}
    <div class="list-body"><div class="list-title">${esc(title)}</div>${sub?`<div class="list-sub ${subCls||''}">${esc(sub)}</div>`:''}</div>
    <span class="chev" aria-hidden="true">›</span>
  </button>`;
}

/* -------------------------------- Community ------------------------------- */
function rCommunity(s){
  setHdr(`<h1 class="brand">${esc(t('cm_title'))}</h1><div class="tagline">${esc(t('cm_tag'))}</div>`);
  let body='';
  if(COMM_SUBTAB==='circle')body=(typeof circleCardHtml==='function')?circleCardHtml():`<div class="card mu">${esc(t('lib_loading'))}</div>`;
  else if(COMM_SUBTAB==='board')body=(typeof leaderboardCardHtml==='function')?leaderboardCardHtml(s):`<div class="card mu">${esc(t('lib_loading'))}</div>`;
  else body=(typeof communityLessonsHtml==='function')?communityLessonsHtml(s):`<div class="card mu">${esc(t('lib_loading'))}</div>`;
  const tab=(k,label)=>`<span role="tab" aria-selected="${COMM_SUBTAB===k}" class="${COMM_SUBTAB===k?'on':''}" onclick="setCommSubTab('${k}')">${esc(label)}</span>`;
  $('app').innerHTML=`<div class="seg3" role="tablist">${tab('circle',t('cm_tab_circle'))}${tab('board',t('cm_tab_board'))}${tab('lessons',t('cm_tab_lessons'))}</div>${body}`;
}

/* --------------------------------- Profile -------------------------------- */
function rSettings(s){
  const cols=[['emerald','#1f6b52','col_emerald'],['blue','#1d4ed8','col_blue'],['gold','#9a6200','col_gold'],['plum','#6d28d9','col_plum']];
  const u=(typeof CLOUD_STATE!=='undefined'&&CLOUD_STATE.user)?CLOUD_STATE.user:null;
  const adminHere=(typeof isAdminUser==='function'&&isAdminUser());
  const modeLabel={both:t('pf_mode_both'),hifdh:t('pf_mode_hifdh'),revision:t('pf_mode_revision')}[s.mode]||t('pf_mode_both');
  const methodLabel={tikrar:t('m_tikrar'),ottoman:t('m_ottoman'),simple:t('m_simple'),custom:t('m_custom')}[s.method]||t('m_simple');
  const scalePct=Math.round((Number(s.uiScale)||1)*100);
  const aiStatus=s.aiKey?(s.aiKey.startsWith('AIza')?t('ai_status_set'):t('ai_status_bad')):t('ai_status_off');
  const langMeta=LANGS.find(l=>l.code===LANG)||LANGS[0];
  const langNow=langMeta.native+(LANG==='uz'&&s.uzOld?' · '+t('set_uz_old_short'):'');
  const lookNow=[t(s.theme==='dark'?'set_theme_dark':(s.theme==='light'?'set_theme_light':'set_theme_auto')),t('sz_'+uiSizeKey(s.uiScale))].join(' · ');
  const syncLabel=u?(CLOUD_STATE.status==='synced'?t('pr_synced',{time:CLOUD_STATE.lastSync}):(CLOUD_STATE.status==='syncing'?t('pr_syncing'):(CLOUD_STATE.status==='error'?t('pr_sync_error'):t('pr_connected')))):t('pr_offline');

  setHdr(`<div class="row">
    <h1 class="brand">${esc(t('nav_profile'))}</h1>
    <button class="back-btn" aria-label="${esc(t('pr_edit'))}" onclick="setTab('profile_edit')">${ic('edit')}</button>
  </div>`);

  $('app').innerHTML=`
    <button type="button" class="profile-hero" onclick="setTab('profile_edit')">
      <div class="avatar avatar-lg">${safeImageData(s.avatar)?`<img src="${safeImageData(s.avatar)}" alt="">`:esc(initials(s.name||(u?u.email:'M')))}</div>
      <div style="flex:1;min-width:0;text-align:start">
        <div class="pr-name">${esc(s.name||(u&&u.name)||t('pr_student'))}</div>
        <div class="mu pr-sub">${esc((u&&u.email)||s.email||(s.name?t('pr_edit'):t('pr_add_details')))}</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">
          <span class="pill">${esc(syncLabel)}</span>${adminHere?`<span class="pill">${esc(t('pr_admin'))}</span>`:''}
        </div>
      </div>
      <span class="chev" aria-hidden="true">›</span>
    </button>

    ${!u&&typeof accountCardHtml==='function'?accountCardHtml():''}

    <div class="sec">${esc(t('pr_sec_plan'))}</div>
    <div class="list-card">
      ${listRow("setTab('plan')",'lib',t('pr_my_plan'),`${modeLabel} · ${methodLabel} · ${t('pr_days_wk',{n:s.studyDaysPerWeek||6})}`)}
    </div>

    <div class="sec">${esc(t('pr_sec_settings'))}</div>
    <div class="list-card">
      ${listRow("setTab('language')",'globe',t('set_language'),langNow)}
      ${listRow("setTab('appearance')",'palette',t('pr_sec_look'),lookNow)}
    </div>

    <div class="sec">${esc(t('pr_sec_data'))}</div>
    <div class="list-card">
      ${u?listRow("runCloudSync('manual')",'loop',t('pr_sync_now'),
        CLOUD_STATE.status==='synced'?t('pr_last_synced',{time:CLOUD_STATE.lastSync})
        :(CLOUD_STATE.status==='error'&&CLOUD_STATE.error?t('pr_sync_error')+': '+CLOUD_STATE.error:t('pr_sync_sub')),
        CLOUD_STATE.status==='error'?'sync-err':''):''}
      ${listRow("setTab('backup')",'download',t('pr_backup'),t('pr_backup_sub',{date:s.lastBackup?fmt(s.lastBackup):t('pr_never')}))}
      ${listRow("setTab('ai')",'spark',t('pr_ai'),aiStatus)}
      ${listRow("setTab('privacy')",'shield',t('pr_privacy'),t('pr_privacy_sub'))}
      ${listRow("setTab('about')",'star',t('ab_title'),t('ab_sub'))}
    </div>

    ${u?`<button class="signout-card" onclick="signOutCloud()">${esc(t('pr_sign_out'))}</button>`:''}`;
}

function rPlanPage(){
  subHeader(t('pp_title'),t('pp_tag'));
  $('app').innerHTML=planForm('settings')+`
    <div class="card" style="margin-top:14px"><details>
      <summary>📚 ${esc(t('pp_methods'))}</summary>
      <div class="pp-methods">
        <p><b>🕌 ${esc(t('m_tikrar'))}.</b> ${esc(t('pp_tikrar'))}</p>
        <p><b>🌙 ${esc(t('m_ottoman'))}.</b> ${esc(t('pp_ottoman'))}</p>
        <p><b>✨ ${esc(t('m_simple'))}.</b> ${esc(t('pp_simple'))}</p>
        <p><b>✏️ ${esc(t('m_custom'))}.</b> ${esc(t('pp_custom'))}</p>
        <p class="mu" style="border-top:1px solid var(--bd);padding-top:8px;margin-top:8px">${esc(t('pp_tikrar_credit'))} <a href="https://www.tikrar.net" target="_blank" rel="noopener noreferrer">Tikrar.net ↗</a></p>
      </div>
    </details></div>`;
}

function rProfileEdit(s){
  subHeader(t('pr_edit'),t('pr_edit_tag'));
  $('app').innerHTML=`<div class="card">
    <div class="row" style="justify-content:flex-start;gap:14px;margin-bottom:14px">
      <div class="avatar avatar-lg">${safeImageData(s.avatar)?`<img src="${safeImageData(s.avatar)}" alt="">`:esc(initials(s.name))}</div>
      <div>
        <button class="sm" onclick="$('avInp').click()">${esc(t('pr_upload_photo'))}</button>
        ${s.avatar?`<button class="g sm" style="margin-inline-start:6px" onclick="removeAvatar()">${esc(t('pr_remove'))}</button>`:''}
        <input type="file" id="avInp" accept="image/*" style="display:none" onchange="uploadAvatar(this)">
      </div>
    </div>
    <label class="f" for="stName">${esc(t('pr_name'))}</label>
    <input type="text" id="stName" maxlength="40" autocomplete="name" placeholder="${esc(t('ob_name_ph'))}" value="${esc(s.name)}">
    <label class="f" for="stEmail">${esc(t('pr_email'))}</label>
    <input type="email" id="stEmail" autocomplete="email" placeholder="name@example.com" value="${esc(s.email)}">
    <div class="mu" style="margin-top:6px">${esc(t('pr_email_hint'))}</div>
    <button class="bigbtn" onclick="saveProfileBasic()">${esc(t('pr_save'))}</button>
  </div>`;
}

function rAiPage(s){
  const curKey=(s.aiKey||'').trim();
  const badPrefix=curKey&&!curKey.startsWith('AIza');
  subHeader(t('pr_ai'),t('ai_tag'));
  $('app').innerHTML=`<div class="card">
    <h2>${esc(t('ai_key_title'))}</h2>
    <div class="mu" style="margin:6px 0 10px">${esc(t('ai_key_desc'))}</div>
    <label class="f" for="aiKeyInp">${esc(t('ai_key_lbl'))} · <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer">${esc(t('ai_get_key'))} ↗</a></label>
    <input type="text" id="aiKeyInp" dir="ltr" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="AIzaSy..." value="${esc(curKey)}">
    ${badPrefix?`<div class="ai-status err">${esc(t('ai_bad_prefix',{p:curKey.slice(0,4)}))}</div>`:''}
    ${AI_TEST_MSG?`<div class="ai-status ${AI_TEST_MSG.ok?'ok':'err'}">${esc(AI_TEST_MSG.txt)}</div>`:''}
    <div class="two" style="margin-top:12px">
      <button onclick="saveAndTestAiKey(true)">${esc(t('ai_test_save'))}</button>
      <button class="g" onclick="saveAndTestAiKey(false)">${esc(t('ai_save_only'))}</button>
    </div>
    <div class="mu" style="margin-top:12px">${esc(t('ai_offline_note'))}</div>
  </div>`;
}

function rBackupPage(s){
  subHeader(t('pr_backup'),t('bk_tag'));
  $('app').innerHTML=`<div class="card">
    <h2>${esc(t('bk_title'))}</h2>
    <div class="mu" style="margin:6px 0 10px">${esc(t('bk_desc',{date:s.lastBackup?fmt(s.lastBackup):t('pr_never')}))}</div>
    <div class="two">
      <button onclick="exportData()">${esc(t('bk_export'))}</button>
      <button class="g" onclick="$('imp').click()">${esc(t('bk_import'))}</button>
    </div>
    <input type="file" id="imp" accept=".json,application/json" style="display:none" onchange="importData(this)">
    <div class="mu" style="margin-top:10px">${esc(t('bk_media_note'))}</div>
  </div>
  <div class="card">
    <h2>${esc(t('bk_quick'))}</h2>
    <label class="f" for="ad">${esc(t('bk_add_pages'))}</label>
    <div class="row" style="gap:8px">
      <input type="number" inputmode="decimal" step="0.5" min="0.5" id="ad" value="1" style="width:110px">
      <button class="sm" style="flex:1" onclick="if(call('addPages',$('ad').value))toast(t('bk_pages_added'))">${esc(t('bk_add_btn'))}</button>
    </div>
    <div class="two" style="margin-top:12px">
      <button class="g sm" onclick="enableReminder()">🔔 ${esc(t('bk_test_notif'))}</button>
      <button class="g sm" onclick="sendEmailSummary()">✉️ ${esc(t('bk_email'))}</button>
    </div>
  </div>
  <div class="card danger-card">
    <h2 style="color:var(--danger)">${esc(t('bk_danger'))}</h2>
    <div class="mu" style="margin:6px 0 10px">${esc(t('bk_reset_desc'))}</div>
    <button class="d" style="width:100%" onclick="if(confirm(t('bk_reset_confirm'))){resetAll()}">${esc(t('bk_reset'))}</button>
  </div>`;
}

function rPrivacyPage(){
  const u=(typeof CLOUD_STATE!=='undefined'&&CLOUD_STATE.user)?CLOUD_STATE.user:null;
  subHeader(t('pr_privacy'),t('pv_tag'));
  $('app').innerHTML=`<div class="card">
    <h2>${esc(t('pv_where'))}</h2>
    <ul class="pv-list">
      <li><b>📱 ${esc(t('pv_phone'))}</b> — ${esc(t('pv_phone_desc'))}</li>
      <li><b>☁️ ${esc(t('pv_cloud'))}</b> — ${esc(t('pv_cloud_desc'))}</li>
      <li><b>👥 ${esc(t('pv_shared'))}</b> — ${esc(t('pv_shared_desc'))}</li>
    </ul>
    <a class="btn-link" href="./delete-account.html" target="_blank" rel="noopener noreferrer">📄 ${esc(t('pv_full_policy'))} ↗</a>
  </div>
  ${u?`<div class="card">
    <h2>${esc(t('pv_delete_title'))}</h2>
    <div class="mu" style="margin:6px 0 10px">${esc(t('pv_signed_as',{who:u.email||u.name||''}))} · UID <code>${esc(u.uid.slice(0,10))}…</code></div>
    <div class="mu" style="margin-bottom:10px">${esc(t('pv_delete_desc'))}</div>
    <div class="two">
      <button class="g sm" onclick="copyTextSafe(CLOUD_STATE.user.uid,t('pv_uid_copied'))">${esc(t('pv_copy_uid'))}</button>
      <button class="d sm" onclick="deleteCloudAccount()">${esc(t('pv_delete_btn'))}</button>
    </div>
  </div>`:''}
  <div class="tg-banner">
    <div style="font-size:1rem;font-weight:800">📢 ${esc(t('pv_support'))}</div>
    <div style="font-size:.84rem;opacity:.92;margin-top:4px">${esc(t('pv_support_desc'))}</div>
    <div><a href="https://t.me/MyCompanionApp" target="_blank" rel="noopener noreferrer">🚀 ${esc(t('pv_channel'))}</a></div>
  </div>`;
}

function rAboutPage(){
  subHeader(t('ab_title'),t('ab_sub'));
  $('app').innerHTML=`<div class="card" style="text-align:center">
    <div class="ob-logo" style="margin-top:6px">📖</div>
    <h2 style="font-family:var(--serif);font-size:1.4rem">My Companion</h2>
    <div class="mu">${esc(t('ab_version',{v:APP_VERSION}))}</div>
    <div class="mu" style="margin-top:8px">${esc(t('ob_welcome_sub'))}</div>
  </div>
  <div class="card">
    <h2>${esc(t('ab_credits'))}</h2>
    <ul class="pv-list">
      <li><b>${esc(t('ab_quran_data'))}</b> — ${esc(t('ab_tanzil'))} <a href="https://tanzil.net" target="_blank" rel="noopener noreferrer">tanzil.net ↗</a></li>
      <li><b>${esc(t('ab_tikrar'))}</b> — <a href="https://www.tikrar.net" target="_blank" rel="noopener noreferrer">tikrar.net ↗</a></li>
    </ul>
    <div class="mu" style="margin-top:8px">${esc(t('ab_free'))}</div>
  </div>
  <div class="tg-banner">
    <div style="font-size:1rem;font-weight:800">📢 ${esc(t('pv_support'))}</div>
    <div style="font-size:.84rem;opacity:.92;margin-top:4px">${esc(t('pv_support_desc'))}</div>
    <div><a href="https://t.me/MyCompanionApp" target="_blank" rel="noopener noreferrer">🚀 ${esc(t('pv_channel'))}</a></div>
  </div>`;
}

/* ------------------------------ Language page ----------------------------- */
function rLanguagePage(s){
  subHeader(t('set_language'),t('lg_tag'));
  $('app').innerHTML=languageCardHtml(s).replace(/^\s*<div class="sec">[^<]*<\/div>/,'');
}

/* ----------------------------- Appearance page ---------------------------- */
const UI_SIZES=[['s',0.9],['m',1],['l',1.12],['xl',1.25]];
function uiSizeKey(v){
  const x=Number(v)||1;let best=UI_SIZES[1];
  UI_SIZES.forEach(o=>{if(Math.abs(o[1]-x)<Math.abs(best[1]-x))best=o});
  return best[0];
}
function setUiSize(key){
  const o=UI_SIZES.find(x=>x[0]===key);if(!o)return;
  ensureData();const s=loadState();s.uiScale=o[1];s.uiText=key==='xl'?'l':key;
  saveState(s);applyTheme(s);D.state=s;render();
}
function rAppearancePage(s){
  const cols=[['emerald','#1f6b52','col_emerald'],['blue','#1d4ed8','col_blue'],['gold','#9a6200','col_gold'],['plum','#6d28d9','col_plum']];
  const cur=uiSizeKey(s.uiScale);
  subHeader(t('pr_sec_look'),t('ap_tag'));
  $('app').innerHTML=`<div class="list-card">
      <div class="list-row static">
        <div class="list-body"><div class="list-title">${esc(t('pr_theme'))}</div><div class="list-sub">${esc(t('set_theme_sub'))}</div></div>
      </div>
      <div class="list-row static" style="display:block;padding-top:0">
        <div class="switch-pill" role="radiogroup" aria-label="${esc(t('pr_theme'))}" style="width:100%;display:flex">
          ${['light','dark','system'].map(th=>`<span role="radio" tabindex="0" style="flex:1;text-align:center" aria-checked="${s.theme===th}" class="${s.theme===th?'on':''}" onclick="setThemeMode('${th}')" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();setThemeMode('${th}')}">${esc(t(th==='system'?'set_theme_auto':'set_theme_'+th))}</span>`).join('')}
        </div>
      </div>
    </div>
    <div class="list-card">
      <div class="list-row static">
        <div class="list-body"><div class="list-title">${esc(t('pr_color'))}</div></div>
        <div class="swatches" role="radiogroup" aria-label="${esc(t('pr_color'))}">${cols.map(c=>`<button type="button" class="swatch ${s.color===c[0]?'on':''}" role="radio" aria-checked="${s.color===c[0]}" aria-label="${esc(t(c[2]))}" style="background:${c[1]}" onclick="setColor('${c[0]}')"></button>`).join('')}</div>
      </div>
    </div>
    <div class="list-card">
      <div class="list-row static" style="display:block">
        <div class="list-title">${esc(t('pr_size'))}</div>
        <div class="size-steps" role="radiogroup" aria-label="${esc(t('pr_size'))}">
          ${UI_SIZES.map(([k,v])=>`<button type="button" role="radio" aria-checked="${cur===k}" class="size-step ${cur===k?'on':''}" onclick="setUiSize('${k}')">
            <b style="font-size:${({s:14,m:18,l:22,xl:26})[k]}px">A</b><span>${esc(t('sz_'+k))}</span></button>`).join('')}
        </div>
        <div class="size-preview">${esc(t('sz_preview'))}</div>
      </div>
    </div>`;
}
