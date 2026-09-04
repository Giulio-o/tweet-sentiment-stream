// Esigenze operative comunicate per la settimana 14-20 settembre 2026:
// - Massimo libero nel pomeriggio di martedi 15;
// - inventario trimestrale mercoledi 16 con tre presenze 18:00-20:45.
// - Katia giovedi 17 senza chiusura e venerdi 18 al pesce 07:00-14:00;
// - Katia sabato 19 al mattino, mai di nuovo in chiusura dopo sabato 12.
const PDV1_SEPTEMBER_OPERATIONAL_VERSION='pdv1-ops-20260915-v3';
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

function september19Employee(name){
  const target=String(name||'').trim().toLowerCase();return S.employees.find(e=>String(e.name||'').trim().toLowerCase()===target)||null;
}
function september19Available(employee,day,shift){
  if(!employee||leave(employee.name,day.date))return false;
  if(typeof blockedAt==='function'&&blockedAt(employee.name,day.date,shift.start,shift.end))return false;
  return true;
}
function september19Assign(day,slot,employeeName,label){
  const employee=september19Employee(employeeName);if(!slot||!september19Available(employee,day,slot))return false;
  const current=String(slot.name||''),other=(day.g||[]).find(s=>s!==slot&&s.name===employee.name);
  slot.name=employee.name;if(other)other.name=current;
  slot.september19Fixed=true;inventoryAppendText(slot,label);return true;
}
function applyPdv1September17And18Plan(out){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return out;
  if((out||[]).some(day=>day?.publishedDriveRoster))return out;
  const thursday=out.find(d=>key(d.date)==='2026-09-17');
  if(thursday&&thursday.holiday?.type!=='closed'){
    const shortClose=(thursday.g||[]).find(s=>s.start==='17:00'&&s.end===String(S.rules?.closingTime||'20:45'));
    const massimo=september19Employee('Massimo');
    if(shortClose&&september19Available(massimo,thursday,shortClose)){
      shortClose.name=massimo.name;shortClose.septemberOperationalFixed=true;
      inventoryAppendText(shortClose,'riassetto chiusura · riposo Katia prima del pesce venerdì');
      thursday.september17Plan={katiaRest:true,massimoShortClose:true};
    }else{
      thursday.september17Plan={katiaRest:false,massimoShortClose:false,warning:'Assetto giovedi da verificare'};
    }
  }
  const friday=out.find(d=>key(d.date)==='2026-09-18');
  if(friday&&friday.holiday?.type!=='closed'){
    const forno=(friday.g||[]).find(s=>/forno/i.test(String(s.skill||''))&&s.start==='06:00');
    const fullClose=(friday.g||[]).find(s=>s.start==='13:30'&&s.end===String(S.rules?.closingTime||'20:45'));
    const fish=(friday.c||[]).find(s=>/pesce/i.test(String(s.skill||'')));
    const marine=september19Employee('Marine'),miriam=september19Employee('Miriam'),katia=september19Employee('Katia');
    const fishProbe={...(fish||{}),start:'07:00',end:'14:00',pause:15};
    if(forno&&fullClose&&fish&&september19Available(marine,friday,forno)&&september19Available(miriam,friday,fullClose)&&september19Available(katia,friday,fishProbe)){
      forno.name=marine.name;fullClose.name=miriam.name;
      fish.name=katia.name;fish.start='07:00';fish.end='14:00';fish.pause=15;
      [forno,fullClose,fish].forEach(s=>s.septemberOperationalFixed=true);
      inventoryAppendText(forno,'riassetto per Katia al pesce');
      inventoryAppendText(fullClose,'riassetto per Katia al pesce');
      inventoryAppendText(fish,'Katia al pesce · assetto richiesto 07:00-14:00');
      friday.september18Plan={katiaFish:true,fishStart:'07:00',fishEnd:'14:00',forno:'Marine',closer:'Miriam'};
    }else{
      friday.september18Plan={katiaFish:false,warning:'Assetto pesce venerdi da verificare'};
    }
  }
  return out;
}
function applyPdv1September19KatiaMorning(out){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return out;
  const day=out.find(d=>key(d.date)==='2026-09-19');if(!day||day.holiday?.type==='closed')return out;
  if(day.publishedDriveRoster)return out;
  const close=String(S.rules?.closingTime||'20:45'),closers=(day.g||[]).filter(s=>String(s.end||'')===close).sort((a,b)=>mins(a.start)-mins(b.start));
  const desiredClosers=['Antonio','Miriam'];
  closers.slice(0,2).forEach((slot,index)=>{
    const old=slot.name,desired=desiredClosers[index];
    if(september19Assign(day,slot,desired,'chiusura alternata sabato 19')){
      delete slot.saturdayRotationWarning;
      if(String(old||'').trim()!==String(slot.name||'').trim())slot.saturdayRotation={oldName:old,newName:slot.name,previousDate:'2026-09-12',mode:'assetto richiesto'};
    }
  });
  const katiaMorning=(day.g||[]).find(s=>s.start==='09:30'&&mins(s.end)<=14*60+30);
  if(september19Assign(day,katiaMorning,'Katia','Katia mattina · assetto richiesto sabato 19')){
    katiaMorning.saturdayRotationMoved={name:katiaMorning.name,from:'chiusura',previousDate:'2026-09-12'};
  }else if(katiaMorning){
    katiaMorning.september19Warning=true;inventoryAppendText(katiaMorning,'ATTENZIONE: Katia mattina da verificare');
  }
  const afternoonSupport=(day.g||[]).find(s=>s.start==='13:00'&&s.end==='17:30');
  september19Assign(day,afternoonSupport,'Maia','riassetto sabato 19 dopo Katia al mattino');
  day.september19Plan={katiaMorning:Boolean(katiaMorning&&String(katiaMorning.name||'').trim()==='Katia'),closers:closers.slice(0,2).map(s=>String(s.name||'').trim())};
  if(typeof baseGridAuditWeek==='function'){
    const audit=baseGridAuditWeek(out);audit.saturdayRotationWarnings=[];
  }
  return out;
}

const editedBeforeInventoryCoverage=edited;
edited=function(ds){
  if(ensurePdv1SeptemberOperationalNeeds())save();
  return applyPdv1September19KatiaMorning(applyPdv1September17And18Plan(applyInventoryCoverage(editedBeforeInventoryCoverage(ds))));
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
