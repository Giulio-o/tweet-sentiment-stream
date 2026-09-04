// Pianificatore assenze: rigenera le alternative per ferie, malattia e permessi certi.
let absencePlannerOpen=false;
let absencePlannerIgnore=null;
let absencePlannerSimulating=false;

function ensureAbsencePlannerState(){
  S.absenceCoverageChoices=Array.isArray(S.absenceCoverageChoices)?S.absenceCoverageChoices:[];
}
function absencePlannerIgnored(name,d){
  return Boolean(absencePlannerIgnore&&absencePlannerIgnore.name===name&&absencePlannerIgnore.date===(typeof d==='string'?d:key(d)));
}

// Durante la simulazione ricostruiamo il turno originario ignorando solo l'assenza
// della persona nel singolo giorno, senza alterare i dati salvati.
const sicknessOnDateBeforeAbsencePlanner=sicknessOnDate;
sicknessOnDate=function(name,d){return absencePlannerIgnored(name,d)?[]:sicknessOnDateBeforeAbsencePlanner(name,d)};
const leaveBeforeAbsencePlanner=leave;
leave=function(name,d){return absencePlannerIgnored(name,d)?false:leaveBeforeAbsencePlanner(name,d)};

function absencePlannerEachDate(from,to,fn){
  let d=new Date(from+'T12:00:00'),end=new Date(to+'T12:00:00');
  while(d<=end){fn(key(d));d=add(d,1)}
}
function absencePlannerRecords(){
  ensureAbsencePlannerState();
  const from=key(week),to=key(add(week,6)),records=new Map();
  const addRecord=(name,date,type,priority)=>{
    if(!name||date<from||date>to)return;
    const id=name+'|'+date,old=records.get(id);
    if(!old||priority>old.priority)records.set(id,{name,date,type,priority});
  };
  (S.leaves||[]).forEach(x=>absencePlannerEachDate(x.from<from?from:x.from,x.to>to?to:x.to,d=>addRecord(x.name,d,'Ferie',1)));
  (S.absences||[]).filter(x=>x.fullDay!==false).forEach(x=>addRecord(x.name,x.date,x.type||'Permesso',2));
  (S.sicknessSpans||[]).forEach(x=>absencePlannerEachDate(x.from<from?from:x.from,x.to>to?to:x.to,d=>addRecord(x.name,d,'Malattia',3)));
  return [...records.values()].sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
}
function absencePlannerEntries(day,name){
  if(!day)return[];const out=[];
  if(day.cr?.name===name)out.push({shift:day.cr,dep:'cr',index:'cr'});
  (day.g||[]).forEach((s,i)=>{if(s.name===name)out.push({shift:s,dep:'g',index:s._editIndex??i})});
  (day.c||[]).forEach((s,i)=>{if(s.name===name)out.push({shift:s,dep:'c',index:s._editIndex??i})});
  return out;
}
function absencePlannerSlotKey(date,dep,index,s){
  return[date,dep,index,s?.start||'',s?.end||'',s?.start2||'',s?.end2||''].join('|');
}
function absencePlannerFindSlot(day,item){
  if(!day)return null;if(item.dep==='cr')return day.cr||null;
  const arr=day[item.dep]||[];
  return arr.find((s,i)=>String(s._editIndex??i)===String(item.index))||arr.find(s=>s.start===item.start&&s.end===item.end&&String(s.start2||'')===String(item.start2||''))||null;
}
function absencePlannerSimulatedWeek(record){
  const previousIgnore=absencePlannerIgnore,previousSimulation=absencePlannerSimulating;
  absencePlannerIgnore={name:record.name,date:record.date};absencePlannerSimulating=true;
  try{return edited(build())}finally{absencePlannerIgnore=previousIgnore;absencePlannerSimulating=previousSimulation}
}
function absencePlannerAffected(ds){
  const found=new Map();
  absencePlannerRecords().forEach(record=>{
    if(holidayFor(record.date)?.type==='closed')return;
    const original=absencePlannerSimulatedWeek(record),day=original.find(d=>key(d.date)===record.date);
    absencePlannerEntries(day,record.name).forEach(({shift,dep,index})=>{
      const item={slotKey:absencePlannerSlotKey(record.date,dep,index,shift),date:record.date,dep,index,absent:record.name,absenceType:record.type,start:shift.start,end:shift.end,start2:shift.start2||'',end2:shift.end2||'',pause:Number(shift.pause)||0,skill:shift.skill||shift.note||'Turno'};
      const currentDay=ds.find(d=>key(d.date)===record.date),current=absencePlannerFindSlot(currentDay,item);
      item.current=current||null;item.currentName=current?.name||'SCOPERTO';
      item.covered=Boolean(item.currentName&&item.currentName!=='SCOPERTO'&&item.currentName!==record.name&&!leave(item.currentName,new Date(record.date+'T12:00:00')));
      if(!found.has(item.slotKey))found.set(item.slotKey,item);
    });
  });
  return [...found.values()].sort((a,b)=>a.date.localeCompare(b.date)||mins(a.start)-mins(b.start));
}
function absencePlannerRequiredSkill(item){
  const probe={skill:item.skill||'',start:item.start,end:item.end};
  const detected=typeof generalRequiredSkill==='function'?generalRequiredSkill(probe):(typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(probe):'Servizio');
  // Nel reparto Carni alcune etichette storiche dicono solo "Carni pomeriggio":
  // in assenza della parola pesce richiedono comunque competenza Macelleria.
  return item.dep==='c'&&detected==='Servizio'?'Macelleria':detected;
}
function absencePlannerSkillOk(e,item){
  if(item.dep==='cr')return Boolean(e.cr);
  const skill=absencePlannerRequiredSkill(item),level=Number(e.skills?.[skill]||0);
  if(skill==='Forno'||skill==='Ordini'||skill==='Macelleria')return level>=2;
  if(skill==='Pescheria')return level>=1;
  return Number(e.skills?.Servizio||0)>0;
}
function absencePlannerShiftMinutes(item){
  return Math.max(0,mins(item.end)-mins(item.start))+(item.start2&&item.end2?Math.max(0,mins(item.end2)-mins(item.start2)):0);
}
function absencePlannerOtherShifts(day,name,target){
  const out=[];(day?.g||[]).forEach(s=>{if(s!==target&&s.name===name)out.push(s)});(day?.c||[]).forEach(s=>{if(s!==target&&s.name===name)out.push(s)});if(day?.cr&&day.cr!==target&&day.cr.name===name)out.push(day.cr);return out;
}
function absencePlannerOverlaps(a,b){
  return shiftSegments(a).some(([x,y])=>shiftSegments(b).some(([u,v])=>x<v&&y>u));
}
function absencePlannerRest(ds,index,name,item){
  const preferred=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
  const previous=index>0&&typeof personLastEndMinutes==='function'?personLastEndMinutes(ds[index-1],name):null;
  const before=previous==null?24*60:(24*60-previous)+mins(item.start);
  let nextStart=null;if(index<ds.length-1){const starts=[];const n=ds[index+1];[...(n.g||[]),...(n.c||[]),...(n.cr?[n.cr]:[])].filter(s=>s.name===name).forEach(s=>shiftSegments(s).forEach(([a])=>starts.push(a)));if(starts.length)nextStart=Math.min(...starts)}
  const itemEnd=item.start2&&item.end2?mins(item.end2):mins(item.end),after=nextStart==null?24*60:(24*60-itemEnd)+nextStart;
  return{preferred,before,after,ok:before>=preferred&&after>=preferred,min:Math.min(before,after)};
}
function absencePlannerCandidates(ds,item){
  const index=ds.findIndex(d=>key(d.date)===item.date),day=ds[index];if(!day)return[];
  const target=absencePlannerFindSlot(day,item),stats=people(ds),needed=absencePlannerShiftMinutes(item),cap=Number(typeof dailyShiftRules==='function'?dailyShiftRules().splitMaxMinutes:480)||480,required=absencePlannerRequiredSkill(item);
  return S.employees.filter(e=>e.name!==item.absent&&absencePlannerSkillOk(e,item)&&!leave(e.name,new Date(item.date+'T12:00:00'))).filter(e=>{
    if(typeof blockedAt==='function'&&shiftSegments(item).some(([a,b])=>blockedAt(e.name,day.date,toTime(a),toTime(b))))return false;
    const other=absencePlannerOtherShifts(day,e.name,target);if(other.some(s=>absencePlannerOverlaps(s,item)))return false;
    const scheduled=other.reduce((a,s)=>a+(typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(s):Math.max(0,mins(s.end)-mins(s.start))),0);
    return scheduled+needed<=cap;
  }).map(e=>{
    const person=stats.find(x=>x.name===e.name),other=absencePlannerOtherShifts(day,e.name,target),already=target?.name===e.name,addedHours=already?0:Math.max(0,needed-(Number(item.pause)||0))/60,projected=(Number(person?.worked)||0)+addedHours,workTarget=Number(person?.workTarget??person?.hours)||0,extra=Math.max(0,projected-workTarget),missing=Math.max(0,Number(person?.missing)||0),rest=absencePlannerRest(ds,index,e.name,item),sameDept=e.cr||e.dept===(item.dep==='c'?'carni':'gastronomia'),level=Number(e.skills?.[required]||0);
    // Dopo l'idoneita minima, preserviamo nell'ordine riposo, reparto e livello
    // di competenza. Il monte ore decide soltanto tra alternative operative simili.
    const score=(rest.ok?0:600)+(sameDept?0:120)+((3-level)*45)+(extra*2)+(missing>0?-Math.min(missing,addedHours)*2:4)+(already?-4:0);
    return{employee:e,person,required,level,extra,missing,addedHours,rest,sameDept,already,score,beforeShifts:other.slice(),wasFree:other.length===0};
  }).sort((a,b)=>a.score-b.score||b.level-a.level||a.employee.name.localeCompare(b.employee.name)).slice(0,3);
}
function absencePlannerChoice(slotKey){ensureAbsencePlannerState();return S.absenceCoverageChoices.find(x=>x.slotKey===slotKey)||null}

const editedBeforeAbsencePlanner=edited;
edited=function(ds){
  ds=editedBeforeAbsencePlanner(ds);if(absencePlannerSimulating)return ds;ensureAbsencePlannerState();const records=absencePlannerRecords();
  S.absenceCoverageChoices.forEach(choice=>{
    if(!records.some(r=>r.name===choice.absent&&r.date===choice.date))return;
    const day=ds.find(d=>key(d.date)===choice.date),slot=absencePlannerFindSlot(day,choice),employee=S.employees.find(e=>e.name===choice.candidate);if(!day||!slot||!employee||leave(employee.name,day.date))return;
    const other=absencePlannerOtherShifts(day,employee.name,slot);if(other.some(s=>absencePlannerOverlaps(s,choice)))return;
    slot.name=employee.name;slot.absenceCoverage=true;slot.coverageOriginalName=choice.absent;
    const tag=`copertura ${choice.absenceType||'assenza'} (${choice.absent})`;if(slot.skill&&!String(slot.skill).includes(tag))slot.skill=String(slot.skill)+' · '+tag;else if(slot.note&&!String(slot.note).includes(tag))slot.note=String(slot.note)+' · '+tag;
  });
  return ds;
};

function absencePlannerCandidateReason(option){
  const parts=[`${option.required} ${option.level}`];
  if(option.already)parts.push('gia inserito dal motore');
  else if(option.missing>0)parts.push(`${hf(Math.min(option.missing,option.addedHours))} ore da recuperare`);
  else if(option.extra>0)parts.push(`+${hf(option.extra)} extra settimanali`);
  else parts.push('nel monte ore');
  parts.push(option.rest.ok?'riposo rispettato':`riposo ${hf(option.rest.min/60)} · eccezione`);
  return parts.join(' · ');
}
function absencePlannerShiftText(shift){
  if(!shift?.start||!shift?.end)return'';
  return`${shift.start}–${shift.end}${shift.start2&&shift.end2?` / ${shift.start2}–${shift.end2}`:''}`;
}
function absencePlannerScheduleText(shifts){
  const labels=(shifts||[]).filter(s=>s?.start&&s?.end).slice().sort((a,b)=>mins(a.start)-mins(b.start)).map(absencePlannerShiftText);
  return labels.length?labels.join(' + '):'LIBERO';
}
function absencePlannerCandidateChangeHtml(item,option,isApplied){
  const before=absencePlannerScheduleText(option.beforeShifts),after=absencePlannerScheduleText([...(option.beforeShifts||[]),item]);
  return`<div class="absence-change"><div><small>ORARIO PRIMA</small><b class="${option.wasFree?'free':''}">${esc(before)}</b></div><span class="absence-change-arrow" aria-hidden="true">→</span><div><small>ORARIO DOPO</small><b>${esc(after)}</b></div></div><div class="absence-flags">${option.wasFree?'<span class="absence-flag free">LIBERO PRIMA</span><span class="absence-flag added">TURNO AGGIUNTO</span>':'<span class="absence-flag changed">ORARIO CAMBIATO</span>'}<span class="absence-flag contact">${isApplied?'DA CONTATTARE':'DA CONTATTARE SE SCELTO'}</span></div>`;
}
function absencePlannerCandidateHtml(item,option,index){
  const selected=absencePlannerChoice(item.slotKey)?.candidate===option.employee.name,already=option.already&&!selected,isApplied=selected||already;
  return`<div class="absence-option ${index===0?'recommended':''} ${selected?'selected':''}"><div class="absence-option-main"><div><b>${esc(option.employee.name)}</b>${index===0?'<span class="absence-best">CONSIGLIATA</span>':''}<br><small>${esc(absencePlannerCandidateReason(option))}</small></div>${absencePlannerCandidateChangeHtml(item,option,isApplied)}</div><button class="btn small ${selected?'primary':''}" data-slot-key="${esc(item.slotKey)}" data-candidate="${esc(option.employee.name)}" onclick="applyAbsenceCandidateFromButton(this)" ${already?'disabled':''}>${selected?'Scelta applicata':already?'Già nell’orario':'Usa questa'}</button></div>`;
}
function absencePlannerItemHtml(ds,item){
  const date=new Date(item.date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'}),options=absencePlannerCandidates(ds,item),choice=absencePlannerChoice(item.slotKey),status=item.covered?`Coperto da ${item.currentName}`:'SCOPERTO';
  return`<div class="absence-shift-card ${item.covered?'covered':'uncovered'}"><div class="row wrap"><div><small>${esc(date)}</small><h3>${esc(item.start)}–${esc(item.end)}${item.start2?` / ${esc(item.start2)}–${esc(item.end2)}`:''}</h3></div><span class="absence-status ${item.covered?'ok':'bad'}">${esc(status)}</span></div><div class="absence-meta"><span>${esc(item.absenceType)} · <b>${esc(item.absent)}</b></span><span>${esc(absencePlannerRequiredSkill(item))}</span></div><p class="muted">${esc(item.skill)}</p>${options.length?`<h4>Opzioni compatibili</h4>${options.map((o,i)=>absencePlannerCandidateHtml(item,o,i)).join('')}`:`<div class="absence-no-option"><b>Nessuna sostituzione interna compatibile.</b><br><small>Valuta un altro CR/PDV, una persona fuori reparto con la competenza necessaria oppure una riduzione del presidio.</small></div>`}${choice?`<button class="btn danger small absence-undo" data-slot-key="${esc(item.slotKey)}" onclick="removeAbsenceCoverageFromButton(this)">Annulla scelta manuale</button>`:''}</div>`;
}
function absencePlannerPanelHtml(ds,affected){
  const records=absencePlannerRecords(),uncovered=affected.filter(x=>!x.covered).length,actionable=affected.filter(x=>!x.covered&&absencePlannerCandidates(ds,x).length).length;
  const action=uncovered?(actionable?`<button class="btn primary absence-apply-all" onclick="applyAllRecommendedAbsenceCovers()">Applica ${actionable===1?'la soluzione consigliata':`le ${actionable} soluzioni consigliate`}</button>`:'<div class="absence-no-option"><b>Nessuna scopertura ha una soluzione interna automatica.</b><br><small>Le alternative esterne sono indicate sotto ciascun turno.</small></div>'):'<div class="absence-all-covered">✓ Tutti i turni coinvolti hanno gia una copertura</div>';
  return`<div class="card absence-planner" id="absencePlanner"><div class="row wrap"><div><h2>Rigenera orario per assenze</h2><small class="muted">Confronta l’orario prima e dopo. Ogni sostituto scelto deve essere contattato e confermare.</small></div><button class="btn small" onclick="closeAbsencePlanner()">Chiudi</button></div><div class="absence-summary"><div><b>${records.length}</b><small>giorni di assenza</small></div><div><b>${affected.length}</b><small>turni coinvolti</small></div><div class="${uncovered?'bad':'ok'}"><b>${uncovered}</b><small>ancora scoperti</small></div></div>${!records.length?'<div class="absence-empty"><b>Nessuna malattia, ferie o permesso nella settimana.</b><br><small>Inserisci l’assenza dalla tabella ore o dalla sezione Ferie.</small></div>':!affected.length?'<div class="absence-empty"><b>Le assenze non tolgono turni programmati.</b><br><small>Non serve modificare l’orario di questa settimana.</small></div>':`${action}${affected.map(x=>absencePlannerItemHtml(ds,x)).join('')}`}</div>`;
}
function installAbsencePlanner(){
  if(view!=='schedule')return;ensureAbsencePlannerState();const app=document.getElementById('app'),hero=app?.querySelector('.purplebox');if(!app||!hero)return;
  const ds=edited(build()),affected=absencePlannerAffected(ds),uncovered=affected.filter(x=>!x.covered).length,actions=hero.querySelector('.row>div:last-child');
  if(actions&&!hero.querySelector('.absence-planner-button'))actions.insertAdjacentHTML('beforeend',` <button class="btn ${uncovered?'primary':''} absence-planner-button" onclick="openAbsencePlanner()">↻ Rigenera per assenze${affected.length?` · ${affected.length}`:''}</button>`);
  if(absencePlannerOpen&&!document.getElementById('absencePlanner'))hero.insertAdjacentHTML('afterend',absencePlannerPanelHtml(ds,affected));
}
function openAbsencePlanner(){absencePlannerOpen=true;schedule()}
function closeAbsencePlanner(){absencePlannerOpen=false;schedule()}
function applyAbsenceCandidateFromButton(btn){
  const slotKey=btn.dataset.slotKey,candidate=btn.dataset.candidate,ds=edited(build()),item=absencePlannerAffected(ds).find(x=>x.slotKey===slotKey),option=item&&absencePlannerCandidates(ds,item).find(x=>x.employee.name===candidate);if(!item||!option){alert('Questa soluzione non e piu disponibile. Rigenera le opzioni.');schedule();return}
  ensureAbsencePlannerState();S.absenceCoverageChoices=S.absenceCoverageChoices.filter(x=>x.slotKey!==slotKey);S.absenceCoverageChoices.push({slotKey,date:item.date,dep:item.dep,index:item.index,start:item.start,end:item.end,start2:item.start2,end2:item.end2,candidate,absent:item.absent,absenceType:item.absenceType,contactRequired:true,createdAt:new Date().toISOString()});save();absencePlannerOpen=true;schedule();
}
function removeAbsenceCoverageFromButton(btn){ensureAbsencePlannerState();S.absenceCoverageChoices=S.absenceCoverageChoices.filter(x=>x.slotKey!==btn.dataset.slotKey);save();absencePlannerOpen=true;schedule()}
function applyAllRecommendedAbsenceCovers(){
  if(!confirm('Applicare la prima soluzione compatibile a tutti i turni ancora scoperti? Le persone scelte dovranno essere contattate e confermare.'))return;ensureAbsencePlannerState();let changed=false,keys=absencePlannerAffected(edited(build())).filter(x=>!x.covered).map(x=>x.slotKey);
  keys.forEach(slotKey=>{const ds=edited(build()),item=absencePlannerAffected(ds).find(x=>x.slotKey===slotKey);if(!item||item.covered)return;const option=absencePlannerCandidates(ds,item)[0];if(!option)return;S.absenceCoverageChoices=S.absenceCoverageChoices.filter(x=>x.slotKey!==slotKey);S.absenceCoverageChoices.push({slotKey,date:item.date,dep:item.dep,index:item.index,start:item.start,end:item.end,start2:item.start2,end2:item.end2,candidate:option.employee.name,absent:item.absent,absenceType:item.absenceType,contactRequired:true,createdAt:new Date().toISOString()});changed=true});
  if(changed)save();absencePlannerOpen=true;schedule();
}

// Dopo l'inserimento di ferie o malattia apre subito il pannello con le alternative.
const quickLeaveBeforeAbsencePlanner=quickLeave;
quickLeave=function(name){const count=(S.leaves||[]).length,previous=absencePlannerOpen;absencePlannerOpen=true;quickLeaveBeforeAbsencePlanner(name);if((S.leaves||[]).length===count)absencePlannerOpen=previous};
const addLeaveBeforeAbsencePlanner=addLeave;
addLeave=function(e){absencePlannerOpen=true;return addLeaveBeforeAbsencePlanner(e)};
const addSicknessBeforeAbsencePlanner=addSickness;
addSickness=function(name,from,to,source='CR'){const ok=addSicknessBeforeAbsencePlanner(name,from,to,source);if(ok)absencePlannerOpen=true;return ok};

const scheduleBeforeAbsencePlanner=schedule;
schedule=function(){scheduleBeforeAbsencePlanner();installAbsencePlanner()};

try{ensureAbsencePlannerState();if(view==='schedule')schedule()}catch(_){}
