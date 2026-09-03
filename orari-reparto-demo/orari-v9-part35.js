// Esigenze operative comunicate per la settimana 14-20 settembre 2026:
// - Massimo libero nel pomeriggio di martedi 15;
// - inventario trimestrale mercoledi 16 con tre presenze 18:00-20:45.
const PDV1_SEPTEMBER_OPERATIONAL_VERSION='pdv1-ops-20260915-v1';
const PDV1_INVENTORY_EVENT={
  id:'inventory_quarterly_20260916',date:'2026-09-16',label:'Inventario trimestrale',
  start:'18:00',end:'20:45',requiredPeople:3,crCounts:true
};

function ensurePdv1SeptemberOperationalNeeds(){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return false;
  S.availabilityBlocks=Array.isArray(S.availabilityBlocks)?S.availabilityBlocks:[];
  S.inventoryEvents=Array.isArray(S.inventoryEvents)?S.inventoryEvents:[];
  let changed=false;
  const massimo=S.employees.find(e=>String(e.name||'').trim().toLowerCase()==='massimo')?.name||'Massimo';
  const block={requestId:'manual_massimo_pm_20260915',name:massimo,date:'2026-09-15',period:'Pomeriggio',source:'Messaggio addetto',note:'Richiesto pomeriggio libero'};
  if(!S.availabilityBlocks.some(x=>x.requestId===block.requestId||(x.name===block.name&&x.date===block.date&&x.period===block.period))){S.availabilityBlocks.push(block);changed=true}
  if(!S.inventoryEvents.some(x=>x.id===PDV1_INVENTORY_EVENT.id)){S.inventoryEvents.push({...PDV1_INVENTORY_EVENT});changed=true}
  if(S.septemberOperationalVersion!==PDV1_SEPTEMBER_OPERATIONAL_VERSION){S.septemberOperationalVersion=PDV1_SEPTEMBER_OPERATIONAL_VERSION;changed=true}
  return changed;
}
function inventoryEventsForWeek(){
  const from=key(week),to=key(add(week,6));
  return(S.inventoryEvents||[]).filter(x=>x.date>=from&&x.date<=to);
}
function inventoryCoversWindow(shift,event){
  const start=mins(event.start),end=mins(event.end);
  return shiftSegments(shift).some(([a,b])=>a<=start&&b>=end);
}
function inventoryDayEntries(day){
  const out=[];(day?.g||[]).forEach(s=>out.push({shift:s,dep:'g'}));(day?.c||[]).forEach(s=>out.push({shift:s,dep:'c'}));
  return out;
}
function inventoryOtherShifts(day,name){
  const out=inventoryDayEntries(day).filter(x=>x.shift.name===name).map(x=>x.shift);if(day?.cr?.name===name)out.push(day.cr);return out;
}
function inventoryCandidateRest(out,index,employee,event){
  const rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720,start=mins(event.start),end=mins(event.end);
  if(index>0&&typeof personLastEndMinutes==='function'){
    const previousEnd=personLastEndMinutes(out[index-1],employee.name);if(previousEnd!=null&&(24*60-previousEnd)+start<rest)return false;
  }
  if(index<out.length-1){
    const starts=[];inventoryDayEntries(out[index+1]).filter(x=>x.shift.name===employee.name).forEach(x=>shiftSegments(x.shift).forEach(([a])=>starts.push(a)));
    if(out[index+1].cr?.name===employee.name)shiftSegments(out[index+1].cr).forEach(([a])=>starts.push(a));
    if(starts.length&&(24*60-end)+Math.min(...starts)<rest)return false;
  }
  return true;
}
function inventoryCandidate(out,index,event,excluded){
  const day=out[index],probe={start:event.start,end:event.end,skill:event.label,pause:0},minutes=mins(event.end)-mins(event.start);
  const cap=Number(typeof dailyShiftRules==='function'?dailyShiftRules().splitMaxMinutes:480)||480,stats=people(out);
  return staff('gastronomia').filter(e=>Number(e.skills?.Servizio||0)>0&&!excluded.has(String(e.name||'').trim().toLowerCase())).filter(e=>{
    if(leave(e.name,day.date))return false;
    if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,event.start,event.end))return false;
    const other=inventoryOtherShifts(day,e.name);
    if(other.some(s=>typeof saturdayRotationOverlaps==='function'?saturdayRotationOverlaps(s,probe):shiftSegments(s).some(([a,b])=>a<mins(event.end)&&b>mins(event.start))))return false;
    const scheduled=other.reduce((total,s)=>total+(typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(s):shiftSegments(s).reduce((n,[a,b])=>n+b-a,0)),0);
    return scheduled+minutes<=cap&&inventoryCandidateRest(out,index,e,event);
  }).sort((a,b)=>{
    const pa=stats.find(x=>x.name===a.name),pb=stats.find(x=>x.name===b.name),hours=minutes/60;
    const ax=Math.max(0,hours-(Number(pa?.missing)||0)),bx=Math.max(0,hours-(Number(pb?.missing)||0));
    const as=ax*100-Math.min(hours,Number(pa?.missing)||0)*10,bs=bx*100-Math.min(hours,Number(pb?.missing)||0)*10;
    return as-bs||Number(b.skills?.Servizio||0)-Number(a.skills?.Servizio||0)||(typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0);
  })[0]||null;
}
function inventoryAppendText(shift,text){
  const field=shift.skill?'skill':(shift.note?'note':'skill'),current=String(shift[field]||'Turno');if(!current.includes(text))shift[field]=current+' · '+text;
}
function applyInventoryCoverage(out){
  inventoryEventsForWeek().forEach(event=>{
    const index=out.findIndex(day=>key(day.date)===event.date),day=out[index];if(index<0||!day||day.holiday?.type==='closed')return;
    const covered=inventoryDayEntries(day).filter(x=>inventoryCoversWindow(x.shift,event)&&x.shift.name&&x.shift.name!=='SCOPERTO');
    const names=new Set(covered.map(x=>String(x.shift.name||'').trim().toLowerCase())),crCovers=Boolean(event.crCounts&&day.cr&&inventoryCoversWindow(day.cr,event));
    if(crCovers)names.add(String(day.cr.name||'').trim().toLowerCase());
    let missing=Math.max(0,Number(event.requiredPeople||3)-names.size);
    while(missing>0){
      const employee=inventoryCandidate(out,index,event,names),name=employee?.name||'SCOPERTO';
      const shift={name,start:event.start,end:event.end,skill:`${event.label} · terza presenza slegata`,pause:0,inventoryShift:true,inventoryEventId:event.id};
      if(!employee){shift.inventoryCoverageWarning=true;shift.skill+=` · ATTENZIONE: serve una persona competente`;day.g.push(shift);missing=0;break}
      day.g.push(shift);names.add(String(name).trim().toLowerCase());missing--;
    }
    const finalPeople=names.size;
    day.inventoryEvent={...event,crCovers,people:finalPeople,covered:finalPeople>=Number(event.requiredPeople||3)};
    if(crCovers&&day.inventoryEvent.covered){day.cr.inventoryThirdPerson=true;inventoryAppendText(day.cr,`${event.label} · terza presenza CR slegata`)}
  });
  if(typeof baseGridAuditWeek==='function'){
    const saturdayWarnings=out.baseGridAudit?.saturdayRotationWarnings||[],audit=baseGridAuditWeek(out);
    audit.saturdayRotationWarnings=saturdayWarnings;
  }
  return out;
}

const editedBeforeInventoryCoverage=edited;
edited=function(ds){
  if(ensurePdv1SeptemberOperationalNeeds())save();
  return applyInventoryCoverage(editedBeforeInventoryCoverage(ds));
};

const shiftRowBeforeInventoryCoverage=shiftRow;
shiftRow=function(s,d,dep,i){
  let html=shiftRowBeforeInventoryCoverage(s,d,dep,i);if(!s?.inventoryShift)return html;
  const cls=s.inventoryCoverageWarning?'inventory-shift-warning':'inventory-shift-ok',note=s.inventoryCoverageWarning?'⚠ SCOPERTO · serve il terzo addetto per l’inventario':'Inventario · terza presenza 18:00–20:45';
  html=html.replace('class="shift"',`class="shift ${cls}"`);
  return html.replace('</div><div class="time">',`<small class="inventory-shift-note">${esc(note)}</small></div><div class="time">`);
};
function decorateInventorySchedule(){
  if(view!=='schedule')return;const app=document.getElementById('app');if(!app)return;
  const ds=edited(build()),sections=[...app.querySelectorAll('section.card')];
  ds.forEach((day,index)=>{
    if(!day.inventoryEvent||!sections[index]||sections[index].querySelector('.inventory-day-banner'))return;
    const event=day.inventoryEvent,assigned=(day.g||[]).find(s=>s.inventoryShift),status=event.crCovers&&event.covered?'Terza presenza coperta dal CR':assigned?.name&&assigned.name!=='SCOPERTO'?`Terza presenza: ${String(assigned.name).trim()}`:'Terza presenza scoperta';
    const cls=event.covered?'ok':'warning';sections[index].querySelector('.row')?.insertAdjacentHTML('afterend',`<div class="inventory-day-banner ${cls}"><b>${esc(event.label)} · ${esc(event.start)}–${esc(event.end)}</b><span>${esc(status)}</span></div>`);
  });
}
const scheduleBeforeInventoryCoverage=schedule;
schedule=function(){scheduleBeforeInventoryCoverage();decorateInventorySchedule()};

if(typeof syncPdvCloudAuthoritative==='function'){
  const syncPdvCloudBeforeInventoryCoverage=syncPdvCloudAuthoritative;
  syncPdvCloudAuthoritative=async function(){await syncPdvCloudBeforeInventoryCoverage();if(ensurePdv1SeptemberOperationalNeeds())save()};
}

try{if(ensurePdv1SeptemberOperationalNeeds())save();if(view==='schedule')schedule()}catch(_){}
