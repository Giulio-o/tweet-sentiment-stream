// Telegram: distingue richieste discrezionali da comunicazioni 104/sindacali e gestisce la ricerca copertura.
let telegramCoverages=[];
let telegramCoverageApi=false;
let telegramEntitlementApi=false;

function entitlementType(r){
  const explicit=String(r?.type||'').trim();
  if(explicit)return explicit;
  const raw=String(r?.message||'');
  if(/(?:^|\b)(?:permesso\s*)?104(?:\b|$)/i.test(raw))return'Permesso 104';
  if(/\b(?:permesso\s+)?sindacal(?:e|i)\b/i.test(raw))return'Permesso sindacale';
  return'';
}
function entitlementHours(r){
  const explicit=Number(String(r?.hours||'').replace(',','.'));
  if(explicit>0)return explicit;
  const m=String(r?.message||'').match(/\b(\d{1,2}(?:[,.]\d{1,2})?)\s*(?:ore|h)\b/i);
  return m?Number(String(m[1]).replace(',','.'))||0:0;
}
function isEntitlementRequest(r){return Boolean(entitlementType(r))}
function entitlementEmployee(r){return r?.employeeName||requestEmployeeName(r)||''}
function entitlementDate(r){return isoFromItalianDate(r?.dateRequested)||String(r?.dateRequested||'')}
function ensureEntitlementAbsences(){
  ensureSpecialState();let changed=false;
  (telegramRequests||[]).filter(isEntitlementRequest).forEach(r=>{
    const name=entitlementEmployee(r),date=entitlementDate(r);if(!name||!/^\d{4}-\d{2}-\d{2}$/.test(date))return;
    const id='tg_ent_'+String(r.id),hours=entitlementHours(r),type=entitlementType(r);
    const existing=S.absences.find(x=>x.id===id)||S.absences.find(x=>x.name===name&&x.date===date&&x.type===type);
    if(existing){
      if(hours>0&&Number(existing.hours||0)!==hours){existing.hours=hours;changed=true}
      existing.fullDay=true;existing.source=existing.source||'Telegram';return;
    }
    S.absences.push({id,name,date,hours,type,fullDay:true,source:'Telegram',requestId:String(r.id)});changed=true;
  });
  if(changed)save();
}
function entitlementOriginalShifts(r){
  const name=entitlementEmployee(r),date=entitlementDate(r);if(!name||!date)return[];
  ensureSpecialState();
  const saved=S.absences;
  try{
    S.absences=saved.filter(x=>!(x.name===name&&x.date===date&&(/104|sindacal/i.test(String(x.type||''))||String(x.requestId||'')===String(r.id))));
    const monday=mon(new Date(date+'T12:00:00')),oldWeek=week;week=monday;
    const ds=edited(build()),day=ds.find(d=>key(d.date)===date);week=oldWeek;
    if(!day)return[];
    const out=[];
    if(day.cr?.name===name)out.push({...day.cr,dep:'cr',skill:day.cr.note||'CR'});
    (day.g||[]).filter(s=>s.name===name).forEach(s=>out.push({...s,dep:'g'}));
    (day.c||[]).filter(s=>s.name===name).forEach(s=>out.push({...s,dep:'c'}));
    return out;
  }finally{S.absences=saved}
}
function coverageSkillLevel(e,shift){
  const skill=typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(shift):'Servizio';
  return Number(e.skills?.[skill]||0);
}
function candidateMeetsSkill(e,shift){
  const skill=typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(shift):'Servizio',v=coverageSkillLevel(e,shift);
  if(skill==='Forno'||skill==='Ordini'||skill==='Macelleria')return v>=2;
  if(skill==='Pescheria')return v>=1;
  return Number(e.skills?.Servizio||0)>0;
}
function candidateRestOk(ds,index,e,start){
  if(index<=0)return true;const prevEnd=typeof personLastEndMinutes==='function'?personLastEndMinutes(ds[index-1],e.name):null;if(prevEnd==null)return true;
  const rest=typeof generalShiftRules==='function'?Number(generalShiftRules().minimumRestMinutes)||720:720;
  return (24*60-prevEnd)+mins(start)>=rest;
}
function coverageCandidates(r,shift){
  const date=entitlementDate(r),absent=entitlementEmployee(r),monday=mon(new Date(date+'T12:00:00')),oldWeek=week;week=monday;
  let ds;try{ds=edited(build())}finally{week=oldWeek}
  const index=Math.max(0,Math.min(6,Math.round((new Date(date+'T12:00:00')-monday)/86400000))),day=ds[index];if(!day)return[];
  const stats=people(ds);
  return S.employees.filter(e=>!e.cr&&e.name!==absent&&candidateMeetsSkill(e,shift)&&!leave(e.name,day.date))
    .filter(e=>!(typeof blockedAt==='function'&&blockedAt(e.name,day.date,shift.start,shift.end)))
    .filter(e=>!(typeof employeeBusy==='function'&&employeeBusy(day,e.name,shift.start,shift.end)))
    .filter(e=>candidateRestOk(ds,index,e,shift.start))
    .sort((a,b)=>{
      const sa=stats.find(x=>x.name===a.name),sb=stats.find(x=>x.name===b.name);
      const ar=(sa?.workTarget?sa.worked/sa.workTarget:sa?.worked||0),br=(sb?.workTarget?sb.worked/sb.workTarget:sb?.worked||0);
      return coverageSkillLevel(b,shift)-coverageSkillLevel(a,shift)||ar-br||rotationRank(a)-rotationRank(b);
    }).slice(0,5);
}
function coverageFor(requestId,shift,substitute=''){
  return (telegramCoverages||[]).find(c=>String(c.requestId)===String(requestId)&&c.date===entitlementDate({dateRequested:shift.date||''})&&c.start===shift.start&&c.end===shift.end&&(!substitute||c.substitute===substitute));
}
function coverageStatusFor(requestId,date,start,end,substitute){
  return (telegramCoverages||[]).find(c=>String(c.requestId)===String(requestId)&&c.date===date&&c.start===start&&c.end===end&&c.substitute===substitute)||null;
}
async function sendCoverageRequest(requestId,absent,date,shift,candidate){
  if(!telegramCoverageApi){alert('Il bot Telegram deve essere aggiornato alla nuova versione con gestione coperture.');return}
  const link=telegramLinkForEmployee(candidate);if(!link){alert(candidate+' non è ancora collegato al bot Telegram.');return}
  try{
    await postTelegramAction({action:'coverage_request',pdvId:currentPdvId(),requestId:String(requestId),absent,date,start:shift.start,end:shift.end,dep:shift.dep||'g',skill:shift.skill||'Turno',substitute:candidate});
    telegramCoverages.unshift({id:'local_'+Date.now(),pdvId:currentPdvId(),requestId:String(requestId),absent,date,start:shift.start,end:shift.end,dep:shift.dep||'g',skill:shift.skill||'Turno',substitute:candidate,status:'Inviata'});
    requestsPage();setTimeout(loadTelegramRequests,1200);
  }catch(err){alert('Invio richiesta copertura non riuscito: '+(err?.message||err))}
}
function applyAcceptedCoverage(){
  ensureSpecialState();S.manualShifts=Array.isArray(S.manualShifts)?S.manualShifts:[];S.coverageAppliedIds=Array.isArray(S.coverageAppliedIds)?S.coverageAppliedIds:[];let changed=false;
  (telegramCoverages||[]).filter(c=>c.status==='Accettata').forEach(c=>{
    const id=String(c.id);if(S.coverageAppliedIds.includes(id))return;
    const d=new Date(c.date+'T12:00:00'),oldWeek=week;week=mon(d);let ds;try{ds=edited(build())}finally{week=oldWeek}
    const day=ds.find(x=>key(x.date)===c.date);
    if(day&&typeof employeeBusy==='function'&&employeeBusy(day,c.substitute,c.start,c.end))return;
    S.manualShifts.push({id:'cov_'+id,name:c.substitute,date:c.date,start:c.start,end:c.end,dep:c.dep==='c'?'c':'g',skill:(c.skill||'Copertura')+' · copertura accettata',pause:hrs(c.start,c.end)>6?15:0,source:'Copertura Telegram'});
    S.coverageAppliedIds.push(id);changed=true;
  });
  if(changed)save();
}

loadTelegramRequests=async function(){
  const cfg=telegramConfig();if(!cfg.url||!cfg.key){refreshTelegramView();return}
  telegramLoading=true;telegramError='';refreshTelegramView();
  try{
    const url=cfg.url+'?key='+encodeURIComponent(cfg.key)+'&pdvId='+encodeURIComponent(currentPdvId());
    const data=await requestJsonp(url);if(!data?.ok)throw new Error(data?.error||'Risposta non valida');
    telegramRequests=Array.isArray(data.requests)?data.requests:[];telegramLinks=Array.isArray(data.links)?data.links:[];telegramCoverages=Array.isArray(data.coverages)?data.coverages:[];
    telegramCoverageApi=Boolean(data.coverageApi);telegramEntitlementApi=Boolean(data.entitlementApi);
    ensureEntitlementAbsences();applyAcceptedCoverage();
  }catch(err){telegramError=err?.message||String(err)}
  telegramLoading=false;refreshTelegramView();
  if(view==='schedule')schedule();else if(view==='employeeWeek')employeeWeekPage();
};

function entitlementCoverageHtml(r){
  const absent=entitlementEmployee(r),date=entitlementDate(r),shifts=entitlementOriginalShifts(r);
  if(!absent)return'<div class="coverage-box"><b>Assenza da coprire</b><br><small>Associa prima il profilo Telegram all’addetto.</small></div>';
  if(!date||date==='Da verificare')return'<div class="coverage-box"><b>Assenza da coprire</b><br><small>Data da verificare prima di cercare un sostituto.</small></div>';
  if(!shifts.length)return`<div class="coverage-box"><b>Assenza registrata</b><br><small>Nessun turno originario trovato per ${esc(date)}.</small></div>`;
  return`<div class="coverage-box"><b>🔎 Copertura immediata</b><small class="muted">104/sindacale: nessuna approvazione. Scegli chi contattare.</small>${shifts.map(shift=>{
    const candidates=coverageCandidates(r,shift);return`<div class="coverage-shift"><b>${esc(shift.start)}–${esc(shift.end)} · ${esc(shift.skill||'Turno')}</b>${candidates.length?candidates.map(e=>{const linked=telegramLinkForEmployee(e.name),cov=coverageStatusFor(r.id,date,shift.start,shift.end,e.name);const label=cov?esc(cov.status):(linked?'Manda richiesta':'Telegram non collegato');return`<div class="coverage-candidate"><span>${esc(e.name)} <small>· competenza ${coverageSkillLevel(e,shift)}</small></span><button class="btn small ${cov?.status==='Accettata'?'primary':''}" ${(!linked||cov||!telegramCoverageApi)?'disabled':''} onclick="sendCoverageRequest('${esc(r.id)}','${esc(absent)}','${esc(date)}',${JSON.stringify({start:shift.start,end:shift.end,dep:shift.dep||'g',skill:shift.skill||'Turno'}).replace(/"/g,'&quot;')},'${esc(e.name)}')">${label}</button></div>`}).join(''):'<p class="bad">Nessun sostituto compatibile trovato.</p>'}</div>`}).join('')}${!telegramCoverageApi?'<small class="bad">Per inviare davvero i messaggi devi pubblicare la nuova versione del codice Apps Script.</small>':''}</div>`;
}
function enhanceEntitlementCards(){
  const cards=[...document.querySelectorAll('#app .request-card')];
  cards.forEach((card,i)=>{const r=telegramRequests[i];if(!r||!isEntitlementRequest(r))return;card.classList.add('entitlement-card');card.querySelector('.request-actions')?.remove();const badge=card.querySelector('.request-status');if(badge){badge.textContent='Comunicata · da coprire';badge.classList.remove('pending')}if(!card.querySelector('.coverage-box'))card.insertAdjacentHTML('beforeend',entitlementCoverageHtml(r))});
}
const requestsPageBeforeEntitlements=requestsPage;
requestsPage=function(){requestsPageBeforeEntitlements();enhanceEntitlementCards()};
try{if(view==='requests')requestsPage()}catch(_){}
