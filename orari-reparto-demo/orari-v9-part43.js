// UX semplice: mantiene intatto il motore e riduce la complessita visibile.
const SIMPLE_UX_STORE='orari_simple_ux_v1';
function simpleTime(value){const m=Number(value);if(typeof toTime==='function')return toTime(m);if(!Number.isFinite(m))return'';return `${String(Math.floor(m/60)%24).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`}
function simpleApplyBodyMode(){const advanced=simpleIsAdvanced();document.body?.classList.toggle('simple-ux',!advanced);document.body?.classList.toggle('advanced-ux',advanced)}
function simpleUxMode(){return localStorage.getItem(SIMPLE_UX_STORE)==='advanced'?'advanced':'simple'}
function setSimpleUxMode(mode){localStorage.setItem(SIMPLE_UX_STORE,mode==='advanced'?'advanced':'simple');if(view==='more')view='home';render()}
function simpleIsAdvanced(){return simpleUxMode()==='advanced'}

function simpleWeekLabel(){return`${fmt(week)} – ${fmt(add(week,6))}`}
function simplePendingRequests(){return(telegramRequests||[]).filter(r=>r.status==='Da approvare').length}
function simpleAllAssignments(ds){
  const out=[];
  (ds||[]).forEach((day,dayIndex)=>{
    if(day.cr)out.push({shift:day.cr,dep:'cr',dayIndex});
    (day.g||[]).forEach((shift,index)=>out.push({shift,dep:'g',dayIndex,index}));
    (day.c||[]).forEach((shift,index)=>out.push({shift,dep:'c',dayIndex,index}));
  });
  return out;
}
function simpleCollectIssues(ds){
  const issues=[],seen=new Set(),audit=ds?.baseGridAudit||(typeof baseGridAuditWeek==='function'?baseGridAuditWeek(ds):null);
  const addIssue=(id,severity,title,detail)=>{if(seen.has(id))return;seen.add(id);issues.push({id,severity,title,detail})};
  (audit?.uncovered||[]).forEach(x=>addIssue(`u-${x.dayIndex}-${x.dep}-${x.index}`,'bad',`${DAYS[x.dayIndex]} · turno scoperto`,`${x.shift.start}–${x.shift.end} · serve ${x.required}`));
  (audit?.skillWarnings||[]).forEach(x=>addIssue(`s-${x.dayIndex}-${x.dep}-${x.index}`,'bad',`${DAYS[x.dayIndex]} · competenza da verificare`,`${x.shift.name} · serve ${x.required}`));
  (audit?.closeOpen||[]).forEach(x=>addIssue(`r-${x.name}-${x.dayIndex}`,x.severity==='critical'?'bad':'warn',`${x.name} · chiusura → apertura`,`${DAYS[x.dayIndex-1]} ${simpleTime(x.previousEnd)} → ${DAYS[x.dayIndex]} ${simpleTime(x.currentStart)} · riposo ${hf(x.gap/60)}`));
  simpleAllAssignments(ds).forEach(({shift,dayIndex,index,dep})=>{
    if(shift?.inventoryCoverageWarning)addIssue(`i-${dayIndex}-${dep}-${index}`,'bad',`${DAYS[dayIndex]} · inventario scoperto`,shift.note||shift.skill||'Serve una presenza aggiuntiva');
    if(shift?.saturdayRotationWarning)addIssue(`sa-${dayIndex}-${dep}-${index}`,'warn',`${shift.name} · rotazione sabato`,shift.saturdayRotationNote||'Secondo sabato consecutivo da verificare');
  });
  return issues;
}
function simpleStatus(ds){
  const issues=simpleCollectIssues(ds),critical=issues.filter(x=>x.severity==='bad').length;
  return{issues,critical,ok:critical===0};
}
function simpleIssueRows(issues,limit=99){
  if(!issues.length)return'<div class="simple-ok">✓ Nessun problema operativo rilevato.</div>';
  return issues.slice(0,limit).map(x=>`<div class="simple-issue ${x.severity}"><span><b>${esc(x.title)}</b><small>${esc(x.detail)}</small></span><strong>${x.severity==='bad'?'DA RISOLVERE':'ATTENZIONE'}</strong></div>`).join('');
}
function simpleGoProblems(){view='schedule';render();setTimeout(()=>document.getElementById('simpleProblems')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}
function simpleModifySchedule(){
  if(view!=='schedule'){view='schedule';render()}
  setTimeout(()=>{const box=document.getElementById('simpleAdvancedSchedule');if(box){box.open=true;box.scrollIntoView({behavior:'smooth',block:'start'})}},30)
}
function simpleRegenerate(){view='schedule';if(typeof openAbsencePlanner==='function'){openAbsencePlanner();setTimeout(()=>document.getElementById('absencePlanner')?.scrollIntoView({behavior:'smooth',block:'start'}),50)}else render()}
async function simplePublish(){
  try{
    if(typeof saveDataToGoogleSheets==='function')await saveDataToGoogleSheets();
    else save();
  }catch(err){alert('Salvataggio non riuscito: '+(err?.message||err))}
}

const navBeforeSimpleUx=nav;
nav=function(){
  simpleApplyBodyMode();
  if(simpleIsAdvanced()){navBeforeSimpleUx();return}
  const pending=simplePendingRequests(),items=[
    ['home','⌂','Home'],['schedule','▦','Orari'],['requests','✉',pending?`Richieste ${pending}`:'Richieste'],['more','•••','Altro']
  ];
  $('#nav').innerHTML=items.map(x=>`<button class="${view===x[0]||(['employeeWeek','holiday'].includes(view)&&x[0]==='schedule')||(['skills','leave','moves','obj','pdvRules'].includes(view)&&x[0]==='more')?'on':''}" onclick="go('${x[0]}')"><b>${x[1]}</b>${x[2]}</button>`).join('')
};

const homeBeforeSimpleUx=home;
home=function(){
  if(simpleIsAdvanced()){
    homeBeforeSimpleUx();
    const app=document.getElementById('app');
    if(app&&!document.getElementById('simpleModeBack'))app.insertAdjacentHTML('afterbegin',`<div class="card simple-mode-banner" id="simpleModeBack"><div><b>Modalità avanzata</b><small>Tutte le impostazioni e i dettagli sono visibili.</small></div><button class="btn primary" onclick="setSimpleUxMode('simple')">Torna semplice</button></div>`);
    return;
  }
  const ds=edited(build()),status=simpleStatus(ds),pending=simplePendingRequests(),t=totals(ds),target=effectiveTargets();
  $('#app').innerHTML=`
    <section class="simple-home-head">
      <div><small>SETTIMANA</small><h2>${simpleWeekLabel()}</h2></div>
      <span class="simple-health ${status.ok?'ok':'bad'}">${status.ok?'✓ Copertura OK':`⚠ ${status.critical} ${status.critical===1?'problema':'problemi'}`}</span>
    </section>
    <div class="simple-actions-grid">
      <button class="simple-action" onclick="go('schedule')"><b>▦</b><span>Vedi settimana</span><small>Orario completo in una griglia</small></button>
      <button class="simple-action" onclick="go('requests')"><b>✉</b><span>Assenze e richieste</span><small>${pending?`${pending} da approvare`:'Tutto aggiornato'}</small></button>
      <button class="simple-action" onclick="simpleRegenerate()"><b>↻</b><span>Rigenera orario</span><small>Ricalcola dopo assenze o cambi</small></button>
      <button class="simple-action ${status.critical?'attention':''}" onclick="simpleGoProblems()"><b>!</b><span>Controlla problemi</span><small>${status.issues.length?`${status.issues.length} segnalazioni`:'Nessuna segnalazione'}</small></button>
    </div>
    <div class="card simple-week-kpi"><div><small>Ore reparti</small><b>${hf(t.total)} / ${hf(target.total)}</b></div><div><small>Richieste</small><b>${pending}</b></div><div><small>Problemi</small><b class="${status.critical?'bad':'ok'}">${status.critical}</b></div></div>
    <div class="card" id="simpleHomeProblems"><div class="row wrap"><div><h3>Da controllare</h3><small class="muted">L'app mostra solo ciò che richiede una decisione.</small></div>${status.issues.length>3?`<button class="btn small" onclick="simpleGoProblems()">Vedi tutti</button>`:''}</div>${simpleIssueRows(status.issues,3)}</div>`;
};

function simpleMorePage(){
  $('#app').innerHTML=`<div class="card simple-more-head"><div><h2>Altro</h2><small class="muted">Le funzioni meno frequenti restano disponibili senza affollare la Home.</small></div><button class="btn" onclick="setSimpleUxMode('advanced')">Modalità avanzata</button></div>
  <div class="simple-more-grid">
    <button class="simple-more-item" onclick="go('skills')"><b>✓</b><span>Addetti e competenze</span></button>
    <button class="simple-more-item" onclick="go('leave')"><b>☀</b><span>Ferie e permessi</span></button>
    <button class="simple-more-item" onclick="go('moves')"><b>⇄</b><span>Spostamenti</span></button>
    <button class="simple-more-item" onclick="go('obj')"><b>◎</b><span>Obiettivi</span></button>
    <button class="simple-more-item" onclick="go('home');setTimeout(()=>{if(typeof openPdvRules==='function')openPdvRules()},0)"><b>⚙</b><span>Regole PDV</span></button>
    <button class="simple-more-item" onclick="simplePublish()"><b>☁</b><span>Salva nel cloud</span></button>
  </div>`;
}

const renderBeforeSimpleUx=render;
render=function(){
  if(view==='more'&&!simpleIsAdvanced()){nav();header();simpleMorePage();return}
  if(view==='more'&&simpleIsAdvanced())view='home';
  renderBeforeSimpleUx();
};

function simpleScheduleBarHtml(status){
  return`<div class="simple-schedule-bar" id="simpleScheduleBar"><div><small>SETTIMANA</small><b>${simpleWeekLabel()}</b></div><span class="simple-health ${status.ok?'ok':'bad'}">${status.ok?'✓ Copertura OK':`⚠ ${status.critical} problemi`}</span><div class="simple-primary-actions"><button onclick="simpleModifySchedule()">MODIFICA</button><button onclick="simpleRegenerate()">RIGENERA</button><button class="primary" onclick="simplePublish()">PUBBLICA</button></div></div>`;
}
function simpleScheduleProblemsHtml(status){
  return`<div class="card simple-problems ${status.critical?'has-critical':''}" id="simpleProblems"><div class="row wrap"><div><h3>${status.issues.length?'Problemi da risolvere':'Controllo settimana'}</h3><small class="muted">Priorità: copertura → competenze → riposi → ore → rotazione.</small></div><b class="${status.critical?'bad':'ok'}">${status.critical?`${status.critical} critici`:'OK'}</b></div>${simpleIssueRows(status.issues)}</div>`;
}
function simpleCollapseSchedule(){
  const app=document.getElementById('app');if(!app||document.getElementById('simpleScheduleBar'))return;
  const ds=edited(build()),status=simpleStatus(ds),grid=document.getElementById('baseWeeklyGrid'),planner=document.getElementById('absencePlanner');
  const nodes=[...app.children],details=document.createElement('details'),body=document.createElement('div');
  details.id='simpleAdvancedSchedule';details.className='card simple-advanced-details';
  const summary=document.createElement('summary');summary.innerHTML='<b>Dettagli e modifiche manuali</b><small>Turni giornalieri, ore, esportazione, promo e controlli avanzati</small>';
  details.appendChild(summary);body.className='simple-advanced-body';details.appendChild(body);
  nodes.forEach(node=>{if(node!==grid&&node!==planner)body.appendChild(node)});
  app.appendChild(details);
  app.insertAdjacentHTML('afterbegin',simpleScheduleProblemsHtml(status));
  app.insertAdjacentHTML('afterbegin',simpleScheduleBarHtml(status));
  const problems=document.getElementById('simpleProblems');
  if(grid){grid.classList.add('simple-main-grid');problems.insertAdjacentElement('afterend',grid)}
  if(planner){planner.classList.add('simple-planner-visible');(grid||problems).insertAdjacentElement('afterend',planner)}
}

const scheduleBeforeSimpleUx=schedule;
schedule=function(){
  if(!simpleIsAdvanced()&&typeof baseGridOpen!=='undefined')baseGridOpen=true;
  scheduleBeforeSimpleUx();
  if(!simpleIsAdvanced())simpleCollapseSchedule();
};

function simpleDecorateRequests(){
  const app=document.getElementById('app');if(!app||document.getElementById('simpleRequestsHead'))return;
  const pending=simplePendingRequests(),cards=[...app.querySelectorAll('.request-card')];
  cards.sort((a,b)=>Number(b.querySelector('.request-status.pending')!==null)-Number(a.querySelector('.request-status.pending')!==null)).forEach(c=>app.appendChild(c));
  app.insertAdjacentHTML('afterbegin',`<div class="card simple-requests-head" id="simpleRequestsHead"><div><h2>Richieste e assenze</h2><small class="muted">Approva o rifiuta. Quando approvi, l'indisponibilità entra automaticamente nei vincoli.</small></div><b class="${pending?'bad':'ok'}">${pending?`${pending} da decidere`:'Tutto gestito'}</b></div>`);
  const connection=app.querySelector('.connection');
  if(connection&&telegramConfig().url&&telegramConfig().key){
    const details=document.createElement('details');details.className='card simple-request-settings';details.innerHTML='<summary><b>Collegamento Telegram</b><small>Configurazione tecnica</small></summary>';connection.parentNode.insertBefore(details,connection);details.appendChild(connection);connection.classList.remove('card')
  }
}
const requestsPageBeforeSimpleUx=requestsPage;
requestsPage=function(){requestsPageBeforeSimpleUx();if(!simpleIsAdvanced())simpleDecorateRequests()};

try{render()}catch(_){ }
