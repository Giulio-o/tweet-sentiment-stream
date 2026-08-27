// Permessi, spostamenti, note richieste e architettura regole a 3 livelli.
const PDV1_SPECIAL_WEEK={from:'2026-09-07',to:'2026-09-13'};
const DEFAULT_GENERAL_RULES=[
  'Rispettare ferie, permessi, indisponibilità e spostamenti prima di assegnare i turni.',
  'Non creare sovrapposizioni di turno per la stessa persona.',
  'Rispettare le competenze richieste dalla mansione.',
  'Distribuire chiusure e straordinari in modo equilibrato quando la copertura lo consente.',
  'Se una copertura non è possibile, segnalarla come scoperta invece di forzare una persona non disponibile.'
].join('\n');

function planningRulesForState(state=S){
  state.planningRules=state.planningRules||{};
  state.planningRules.general=state.planningRules.general||{notes:DEFAULT_GENERAL_RULES};
  state.planningRules.pdv=state.planningRules.pdv||{notes:''};
  state.planningRules.people=state.planningRules.people||{};
  return state.planningRules;
}
function ensureSpecialState(){
  S.absences=Array.isArray(S.absences)?S.absences:[];
  S.moves=Array.isArray(S.moves)?S.moves:[];
  planningRulesForState(S);
}
function seedPdv1SeptemberSpecials(){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return false;
  ensureSpecialState();let changed=false;
  const seedAbs=[
    {id:'seed_miriam_union_20260907',name:'Miriam',date:'2026-09-07',hours:8,type:'Permesso sindacale',fullDay:true,source:'CR'},
    {id:'seed_marine_104_20260908',name:'Marine',date:'2026-09-08',hours:8,type:'Permesso 104',fullDay:true,source:'CR'}
  ];
  seedAbs.forEach(x=>{if(!S.absences.some(a=>a.id===x.id)){S.absences.push(x);changed=true}});
  const move={id:'seed_maia_generi_vari_20260907',name:'Maia',from:'2026-09-07',to:'2026-09-13',hours:20,type:'Reparto',destination:'Generi Vari',fullPeriod:true,note:'Eccedenza ore reparto',source:'CR'};
  if(!S.moves.some(x=>x.id===move.id)){S.moves.push(move);changed=true}
  return changed;
}
function dateKeyValue(d){return typeof d==='string'?d:key(d)}
function dateBetween(k,from,to){return Boolean(k&&from&&to&&k>=from&&k<=to)}
function absenceItems(name,d){const k=dateKeyValue(d);ensureSpecialState();return S.absences.filter(x=>x.name===name&&x.date===k)}
function moveItems(name,d){const k=dateKeyValue(d);ensureSpecialState();return S.moves.filter(x=>x.name===name&&dateBetween(k,x.from,x.to))}
function fullMoveOnDate(name,d){return moveItems(name,d).some(x=>x.fullPeriod)}
function weekRangeKeys(){return{from:key(week),to:key(add(week,6))}}
function overlapRange(a1,a2,b1,b2){return a1<=b2&&a2>=b1}
function absenceHoursInWeek(name){const r=weekRangeKeys();return S.absences.filter(x=>x.name===name&&x.date>=r.from&&x.date<=r.to).reduce((a,x)=>a+(Number(x.hours)||0),0)}
function moveHoursInWeek(name){const r=weekRangeKeys();return S.moves.filter(x=>x.name===name&&overlapRange(x.from,x.to,r.from,r.to)).reduce((a,x)=>a+(Number(x.hours)||0),0)}
function effectiveWorkTarget(e,festive=0){return Math.max(0,(Number(e?.hours)||0)-absenceHoursInWeek(e.name)-moveHoursInWeek(e.name)-(Number(festive)||0))}

const leaveBeforeCredits=leave;
leave=function(name,d){
  if(leaveBeforeCredits(name,d))return true;
  if(absenceItems(name,d).some(x=>x.fullDay!==false))return true;
  if(fullMoveOnDate(name,d))return true;
  return false;
};

const weeklyShiftTargetBeforeCredits=weeklyShiftTarget;
weeklyShiftTarget=function(e){
  const h=effectiveWorkTarget(e,0);
  if(h<=0)return 0;if(h>=36)return 6;if(h>=30)return 5;if(h>=24)return 4;if(h>=20)return 3;
  return Math.max(1,Math.round(h/6));
};
const gastrShiftScoreBeforeCredits=gastrShiftScore;
gastrShiftScore=function(e,skill,period,load,mix){
  let score=gastrShiftScoreBeforeCredits(e,skill,period,load,mix);
  const target=effectiveWorkTarget(e,0),used=Number(load?.[e.name]||0);
  if(target<=0)return score+10000;
  if(used>=target)score+=1000+(used-target)*100;
  return score;
};

people=function(ds){
  const worked={},festive={};S.employees.forEach(e=>{worked[e.name]=0;festive[e.name]=0});
  ds.forEach(d=>{
    d.g.forEach(s=>worked[s.name]=(worked[s.name]||0)+dur(s));
    d.c.forEach(s=>worked[s.name]=(worked[s.name]||0)+dur(s));
    if(d.cr)worked[d.cr.name]=(worked[d.cr.name]||0)+dur(d.cr);
    if(d.holiday?.type==='closed')S.employees.forEach(e=>festive[e.name]+=creditFor(d.holiday,e.name));
  });
  return S.employees.map(e=>{
    const w=worked[e.name]||0,f=festive[e.name]||0,permits=absenceHoursInWeek(e.name),moved=moveHoursInWeek(e.name),workTarget=effectiveWorkTarget(e,f),accounted=w+f+permits+moved;
    return{...e,worked:w,festive:f,permits,moved,workTarget,accounted,extra:Math.max(0,w-workTarget),missing:Math.max(0,workTarget-w)};
  });
};

hoursHtml=function(ds){
  const p=people(ds),ot=p.reduce((a,e)=>a+e.extra,0);
  return`<div class="card"><div class="row wrap"><h3>Ore per addetto</h3><b class="${ot?'bad':'ok'}">Straordinari ${hf(ot)}</b></div><div class="scroll"><table><thead><tr><th>Addetto</th><th>Contr.</th><th>Target</th><th>Lavor.</th><th>Perm.</th><th>Spost.</th><th>Fest.</th><th>Manc.</th><th>Extra</th><th></th></tr></thead><tbody>${p.map(e=>`<tr class="${e.cr?'crrow':''}"><td><b>${esc(e.name)}</b><br><small>${e.cr?'CR':e.dept==='carni'?'Carni':'Gastronomia'}</small></td><td>${hf(e.hours)}</td><td><b>${hf(e.workTarget)}</b></td><td>${hf(e.worked)}</td><td>${e.permits?hf(e.permits):'—'}</td><td>${e.moved?hf(e.moved):'—'}</td><td>${e.festive?hf(e.festive):'—'}</td><td>${e.missing?hf(e.missing):'—'}</td><td class="${e.extra?'bad':''}">${e.extra?hf(e.extra):'—'}</td><td><button class="btn small" onclick="quickLeave('${esc(e.name)}')">Ferie</button></td></tr>`).join('')}</tbody></table></div><small class="muted">Target = ore da lavorare nel reparto dopo permessi, spostamenti e festività. Permessi e spostamenti restano visibili separatamente.</small></div>`;
};

function requestEmployeeName(r){
  const linked=typeof linkedEmployeeForRequest==='function'?linkedEmployeeForRequest(r):'';
  if(linked)return linked;
  const raw=String(r.telegramName||r.name||'').trim();
  return S.employees.find(e=>String(e.name||'').trim().toLowerCase()===raw.toLowerCase())?.name||'';
}
function requestDateIso(r){return isoFromItalianDate(r.dateRequested)||String(r.dateRequested||'')}
function requestNotesFor(name,d){
  const k=dateKeyValue(d);return (telegramRequests||[]).filter(r=>requestEmployeeName(r)===name&&requestDateIso(r)===k).map(r=>({message:r.message||'Richiesta',status:r.status||'Da approvare'}));
}
function requestMiniHtml(name,d){const notes=requestNotesFor(name,d);return notes.map(n=>`<small class="request-mini-note">📝 ${esc(n.message)} · ${esc(n.status)}</small>`).join('')}

const shiftRowBeforeRequestNotes=shiftRow;
shiftRow=function(s,d,dep,i){
  let html=shiftRowBeforeRequestNotes(s,d,dep,i),note=requestMiniHtml(s.name,d);if(!note)return html;
  return html.replace(`</b>`,`</b>${note}`);
};
const employeeShiftHtmlBeforeRequestNotes=employeeShiftHtml;
employeeShiftHtml=function(s,day){
  let html=employeeShiftHtmlBeforeRequestNotes(s,day),note=requestMiniHtml(s.name,day.date);if(!note)return html;
  return html.replace(`</b>`,`</b>${note}`);
};

const employeeWeekPageBeforeSpecials=employeeWeekPage;
employeeWeekPage=function(name){
  employeeWeekPageBeforeSpecials(name);ensureSpecialState();
  const emp=S.employees.find(e=>e.name===employeeWeekName);if(!emp)return;
  const person=people(edited(build())).find(e=>e.name===employeeWeekName);
  const summary=document.querySelector('#app .employee-summary');
  if(summary&&person){
    summary.insertAdjacentHTML('beforeend',`<div class="card"><small>Target lavoro</small><br><b>${hf(person.workTarget)}</b></div><div class="card"><small>Permessi</small><br><b>${person.permits?hf(person.permits):'—'}</b></div><div class="card"><small>Spostamenti</small><br><b>${person.moved?hf(person.moved):'—'}</b></div>`);
  }
  [...document.querySelectorAll('#app .employee-day')].forEach((card,i)=>{
    const d=add(week,i),abs=absenceItems(emp.name,d),moves=moveItems(emp.name,d),req=requestMiniHtml(emp.name,d);
    if(moves.length){const x=moves[0],state=card.querySelector('.leave-state,.rest-state');if(state){state.className='day-state move-state';state.innerHTML=`<b>Spostato → ${esc(x.destination||'altra sede/reparto')}</b><br><small>${esc(x.type||'Spostamento')} · ${hf(Number(x.hours)||0)} nella settimana</small>`}}
    else if(abs.length){const x=abs[0],state=card.querySelector('.leave-state,.rest-state');if(state){state.className='day-state permit-state';state.innerHTML=`<b>${esc(x.type||'Permesso')}</b><br><small>${hf(Number(x.hours)||0)}</small>`}}
    if(req&&!card.querySelector('.request-mini-day'))card.insertAdjacentHTML('beforeend',`<div class="request-mini-day">${req}</div>`);
  });
};

function absenceOptions(){return S.employees.map(e=>`<option value="${esc(e.name)}">${esc(e.name)}</option>`).join('')}
function installPermitManager(){
  const root=document.querySelector('#app');if(!root||root.querySelector('[data-permit-manager="1"]'))return;
  root.insertAdjacentHTML('afterbegin',`<div class="card" data-permit-manager="1"><h2>Permessi</h2><p class="muted">104, sindacali o altri permessi riducono le ore da lavorare nella settimana senza confondersi con le ferie.</p><div class="grid"><label>Addetto<select id="permitName">${absenceOptions()}</select></label><label>Tipo<select id="permitType"><option>Permesso 104</option><option>Permesso sindacale</option><option>Altro permesso</option></select></label><label>Data<input id="permitDate" type="date" value="${key(week)}"></label><label>Ore<input id="permitHours" type="number" min="0.25" step="0.25" value="8"></label></div><button class="btn primary" style="margin-top:9px" onclick="addPermitFromPage()">＋ Aggiungi permesso</button>${S.absences.length?`<div style="margin-top:10px">${S.absences.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(x=>`<div class="req"><span><b>${esc(x.name)}</b><br><small>${esc(x.date)} · ${esc(x.type)} · ${hf(Number(x.hours)||0)}</small></span><button class="btn danger small" onclick="deletePermit('${esc(x.id)}')">Elimina</button></div>`).join('')}</div>`:''}</div>`);
}
function addPermitFromPage(){ensureSpecialState();const name=$('#permitName').value,date=$('#permitDate').value,type=$('#permitType').value,hours=Number($('#permitHours').value)||0;if(!name||!date||hours<=0)return;S.absences.push({id:'perm_'+Date.now(),name,date,type,hours,fullDay:true,source:'CR'});save();leavePage()}
function deletePermit(id){S.absences=S.absences.filter(x=>x.id!==id);save();leavePage()}
const leavePageBeforePermits=leavePage;
leavePage=function(){leavePageBeforePermits();ensureSpecialState();installPermitManager()};

function movesPage(){ensureSpecialState();$('#app').innerHTML=`<div class="card"><h2>Spostamenti</h2><p class="muted">Usalo quando un addetto lavora temporaneamente in un altro reparto o in un altro PDV. Le ore vengono tolte dal target del reparto corrente.</p><div class="grid"><label>Addetto<select id="moveName">${absenceOptions()}</select></label><label>Tipo<select id="moveType"><option value="Reparto">Altro reparto</option><option value="PDV">Altro PDV</option></select></label><label class="wide">Destinazione<input id="moveDest" placeholder="Es. Generi Vari oppure PDV 123"></label><label>Dal<input id="moveFrom" type="date" value="${key(week)}"></label><label>Al<input id="moveTo" type="date" value="${key(add(week,6))}"></label><label>Ore sottratte al reparto<input id="moveHours" type="number" min="0.25" step="0.25" value="20"></label><label><input id="moveFull" type="checkbox" checked> Non pianificare turni qui nel periodo</label></div><button class="btn primary" style="margin-top:9px" onclick="addMoveFromPage()">＋ Aggiungi spostamento</button></div><div class="card"><h3>Spostamenti registrati</h3>${S.moves.length?S.moves.slice().sort((a,b)=>a.from.localeCompare(b.from)).map(x=>`<div class="req"><span><b>${esc(x.name)} → ${esc(x.destination||'Destinazione')}</b><br><small>${esc(x.from)} → ${esc(x.to)} · ${esc(x.type)} · ${hf(Number(x.hours)||0)}</small></span><button class="btn danger small" onclick="deleteMove('${esc(x.id)}')">Elimina</button></div>`).join(''):'<p class="muted">Nessuno spostamento registrato.</p>'}</div>`}
function addMoveFromPage(){ensureSpecialState();const name=$('#moveName').value,type=$('#moveType').value,destination=String($('#moveDest').value||'').trim(),from=$('#moveFrom').value,to=$('#moveTo').value,hours=Number($('#moveHours').value)||0,fullPeriod=$('#moveFull').checked;if(!name||!destination||!from||!to||hours<=0){alert('Completa tutti i dati dello spostamento.');return}if(to<from){alert('La data finale non può precedere quella iniziale.');return}S.moves.push({id:'move_'+Date.now(),name,type,destination,from,to,hours,fullPeriod,note:'',source:'CR'});save();movesPage()}
function deleteMove(id){S.moves=S.moves.filter(x=>x.id!==id);save();movesPage()}

const navBeforeMoves=nav;
nav=function(){
  const pending=telegramRequests.filter(r=>r.status==='Da approvare').length,a=[['home','⌂','PDV'],['schedule','▦','Orari'],['requests','✉',pending?`Richieste ${pending}`:'Richieste'],['skills','✓','Addetti'],['leave','☀','Ferie'],['moves','⇄','Sposta'],['obj','◎','Obiettivi']];
  $('#nav').innerHTML=a.map(x=>`<button class="${view===x[0]||((view==='pdvRules')&&x[0]==='home')||(view==='holiday'&&x[0]==='schedule')||(view==='employeeWeek'&&x[0]==='schedule')?'on':''}" onclick="go('${x[0]}')"><b>${x[1]}</b>${x[2]}</button>`).join('')
};
const renderBeforeMoves=render;
render=function(){if(view==='moves'){nav();header();movesPage();return}renderBeforeMoves()};

function propagateGeneralPlanningRules(notes){
  if(!pdvDb?.pdvs)return;pdvDb.generalPlanningRules={notes};
  pdvDb.pdvs.forEach(p=>{p.state=normalizePdvState(p.state);const pr=planningRulesForState(p.state);pr.general.notes=notes});
  persistPdvDb();
}
function editPersonPlanningRule(pdvId){
  const sel=document.getElementById('planningPerson');if(!sel)return;const p=pdvDb?.pdvs?.find(x=>x.id===pdvId),state=pdvId===currentPdvId()?S:(p?normalizePdvState(p.state):null);if(!state)return;const name=sel.value,pr=planningRulesForState(state),old=pr.people[name]||'';const value=prompt(`Regole specifiche per ${name}`,old);if(value===null)return;pr.people[name]=String(value).trim();if(p)p.state=cloneJson(state);if(pdvId===currentPdvId())save();else{persistPdvDb();if(pdvDb.cloudEnabled)cloudSavePdv(p).catch(()=>{})}pdvRulesPage();
}
function planningPersonRulesHtml(state=S){const pr=planningRulesForState(state);return state.employees.map(e=>pr.people[e.name]?`<div class="req"><span><b>${esc(e.name)}</b><br><small>${esc(pr.people[e.name])}</small></span></div>`:'').join('')}
const pdvRulesPageBeforePlanningRules=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforePlanningRules();const p=pdvDb?.pdvs?.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p)return;
  const state=p.id===currentPdvId()?S:normalizePdvState(p.state),pr=planningRulesForState(state),form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;
  const people=state.employees.map(e=>`<option value="${esc(e.name)}">${esc(e.name)}</option>`).join('');
  const html=`<div class="card planning-rules"><h3>Regole di pianificazione · 3 livelli</h3><p class="muted"><b>Persona → PDV → Generali.</b> La regola più specifica prevale. Le regole già codificate nel motore continuano a essere applicate automaticamente.</p><label>1 · Regole generali<textarea id="planningGeneral" rows="6">${esc(pr.general.notes||'')}</textarea></label><label style="margin-top:9px">2 · Regole specifiche di ${esc(p.name)}<textarea id="planningPdv" rows="5" placeholder="Es. esigenze di chiusura, orari forno, peculiarità del punto vendita...">${esc(pr.pdv.notes||'')}</textarea></label><div style="margin-top:10px"><label>3 · Regole della persona<select id="planningPerson">${people}</select></label><button class="btn small" type="button" style="margin-top:7px" onclick="editPersonPlanningRule('${esc(p.id)}')">Modifica regola persona</button>${planningPersonRulesHtml(state)}</div></div>`;
  actions?.insertAdjacentHTML('beforebegin',html);
};
const savePdvRulesBeforePlanningRules=savePdvRules;
savePdvRules=function(e,id){
  const p=pdvDb?.pdvs?.find(x=>x.id===id),state=id===currentPdvId()?S:(p?normalizePdvState(p.state):null);
  if(state){const pr=planningRulesForState(state),g=document.getElementById('planningGeneral'),pdv=document.getElementById('planningPdv');if(g){pr.general.notes=String(g.value||'').trim();propagateGeneralPlanningRules(pr.general.notes)}if(pdv)pr.pdv.notes=String(pdv.value||'').trim();if(p)p.state=cloneJson(state)}
  return savePdvRulesBeforePlanningRules(e,id);
};

const syncPdvCloudBeforeSpecials=typeof syncPdvCloudAuthoritative==='function'?syncPdvCloudAuthoritative:null;
if(syncPdvCloudBeforeSpecials){
  syncPdvCloudAuthoritative=async function(){await syncPdvCloudBeforeSpecials();ensureSpecialState();if(seedPdv1SeptemberSpecials())save();const pr=planningRulesForState(S);if(pdvDb?.generalPlanningRules?.notes)pr.general.notes=pdvDb.generalPlanningRules.notes;else pdvDb.generalPlanningRules={notes:pr.general.notes};persistPdvDb();try{render()}catch(_){}};
  syncPdvCloud=syncPdvCloudAuthoritative;
}
const loadTelegramRequestsBeforeNotes=loadTelegramRequests;
loadTelegramRequests=async function(){await loadTelegramRequestsBeforeNotes();if(view==='schedule')schedule();else if(view==='employeeWeek')employeeWeekPage()};

ensureSpecialState();
setTimeout(()=>{try{const cfg=telegramConfig();if(cfg.url&&cfg.key&&!String(pdvCloudStatus||'').includes('Cloud sincronizzato'))return;if(seedPdv1SeptemberSpecials()){save();render()}}catch(_){}},2500);
try{render()}catch(_){}
