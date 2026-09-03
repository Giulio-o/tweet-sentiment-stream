// Rotazione intersettimanale: la chiusura del sabato non va assegnata alla stessa
// persona per due settimane consecutive. Reparto, competenze e riposi restano prioritari.
const SATURDAY_CLOSING_ROTATION_ANCHOR='2026-09-12';
const SATURDAY_CLOSING_ROTATION_MAX_LOOKBACK=26;

function saturdayRotationName(name){return String(name||'').trim().toLowerCase()}
function saturdayRotationEmployee(name){const n=saturdayRotationName(name);return S.employees.find(e=>saturdayRotationName(e.name)===n)||null}
function saturdayRotationEntries(day){
  const out=[];(day?.g||[]).forEach(s=>out.push({shift:s,dep:'g'}));(day?.c||[]).forEach(s=>out.push({shift:s,dep:'c'}));
  if(day?.cr)out.push({shift:day.cr,dep:'cr'});return out;
}
function saturdayRotationIsClosing(entry){
  if(!entry?.shift||entry.dep==='cr')return false;
  const close=mins(String(S.rules?.closingTime||'20:45'));
  return shiftSegments(entry.shift).some(([,end])=>end===close);
}
function saturdayRotationClosers(day){
  return saturdayRotationEntries(day).filter(saturdayRotationIsClosing).filter(x=>x.shift.name&&x.shift.name!=='SCOPERTO');
}
function saturdayRotationRequiredSkill(shift,dep){
  return typeof baseGridRequiredSkill==='function'?baseGridRequiredSkill(shift,dep):(typeof generalRequiredSkill==='function'?generalRequiredSkill(shift):'Servizio');
}
function saturdayRotationSkillOk(employee,shift,dep){
  if(!employee||employee.cr)return false;
  const required=saturdayRotationRequiredSkill(shift,dep);
  if(typeof baseGridSkillOk==='function')return baseGridSkillOk(employee,required);
  const level=Number(employee.skills?.[required]||0);
  if(required==='Forno'||required==='Ordini'||required==='Macelleria')return level>=2;
  if(required==='Pescheria')return level>=1;
  return Number(employee.skills?.Servizio||0)>0;
}
function saturdayRotationShiftMinutes(shift){
  return typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(shift):shiftSegments(shift).reduce((total,[start,end])=>total+Math.max(0,end-start),0);
}
function saturdayRotationOverlaps(a,b){
  return shiftSegments(a).some(([x,y])=>shiftSegments(b).some(([u,v])=>x<v&&y>u));
}
function saturdayRotationFirstStart(day,name){
  const starts=[];saturdayRotationEntries(day).filter(x=>x.shift.name===name).forEach(x=>shiftSegments(x.shift).forEach(([start])=>starts.push(start)));
  return starts.length?Math.min(...starts):null;
}
function saturdayRotationBlocked(employee,day,shift){
  if(typeof blockedAt!=='function')return false;
  return shiftSegments(shift).some(([start,end])=>blockedAt(employee.name,day.date,toTime(start),toTime(end)));
}
function saturdayRotationCanAssign(out,index,employee,shift,ignore=[]){
  const day=out[index],ignored=new Set(ignore);
  if(!employee||employee.cr||leave(employee.name,day.date)||saturdayRotationBlocked(employee,day,shift))return false;
  const other=saturdayRotationEntries(day).map(x=>x.shift).filter(s=>!ignored.has(s)&&s.name===employee.name);
  if(other.some(s=>saturdayRotationOverlaps(s,shift)))return false;
  const cap=Number(typeof dailyShiftRules==='function'?dailyShiftRules().splitMaxMinutes:480)||480;
  if(other.reduce((total,s)=>total+saturdayRotationShiftMinutes(s),0)+saturdayRotationShiftMinutes(shift)>cap)return false;
  const rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
  if(index>0&&typeof personLastEndMinutes==='function'){
    const previousEnd=personLastEndMinutes(out[index-1],employee.name),start=Math.min(...shiftSegments(shift).map(([a])=>a));
    if(previousEnd!=null&&Number.isFinite(start)&&(24*60-previousEnd)+start<rest)return false;
  }
  if(index<out.length-1){
    const nextStart=saturdayRotationFirstStart(out[index+1],employee.name),ends=shiftSegments(shift).map(([,b])=>b),end=ends.length?Math.max(...ends):null;
    if(nextStart!=null&&end!=null&&(24*60-end)+nextStart<rest)return false;
  }
  return true;
}
function saturdayRotationSameDepartment(employee,dep){
  if(dep==='g')return employee.dept!=='carni';
  if(dep==='c')return employee.dept==='carni'||Number(employee.skills?.Macelleria||0)>=2||Number(employee.skills?.Pescheria||0)>=1;
  return false;
}
function saturdayRotationSafeTeam(day,target,replacementName){
  if(typeof PDV1_WEAK_CLOSERS==='undefined')return true;
  if(day.cr&&shiftSegments(day.cr).some(([,end])=>end===mins(String(S.rules?.closingTime||'20:45'))))return true;
  const names=saturdayRotationClosers(day).map(x=>x.shift===target?replacementName:x.shift.name).filter(n=>n&&n!=='SCOPERTO');
  return names.some(name=>!PDV1_WEAK_CLOSERS.has(String(name||'').trim()));
}
function saturdayRotationWeekCloseCount(out,name){
  return out.reduce((total,day)=>total+saturdayRotationClosers(day).filter(x=>x.shift.name===name).length,0);
}
function saturdayRotationCandidateScore(out,employee,shift,dep){
  const required=saturdayRotationRequiredSkill(shift,dep),level=Number(employee.skills?.[required]||0),closes=saturdayRotationWeekCloseCount(out,employee.name);
  const rank=typeof rotationRank==='function'?rotationRank(employee):0;
  return closes*50-level*8+rank;
}
function saturdayRotationFreeCandidate(out,index,target,dep,previous){
  const day=out[index],current=new Set(saturdayRotationEntries(day).map(x=>saturdayRotationName(x.shift.name)).filter(Boolean));
  return S.employees.filter(e=>!e.cr&&saturdayRotationSameDepartment(e,dep))
    .filter(e=>!previous.has(saturdayRotationName(e.name))&&!current.has(saturdayRotationName(e.name)))
    .filter(e=>saturdayRotationSkillOk(e,target,dep)&&saturdayRotationCanAssign(out,index,e,target,[target]))
    .filter(e=>saturdayRotationSafeTeam(day,target,e.name))
    .sort((a,b)=>saturdayRotationCandidateScore(out,a,target,dep)-saturdayRotationCandidateScore(out,b,target,dep))[0]||null;
}
function saturdayRotationSwapCandidate(out,index,target,dep,previous){
  const day=out[index],old=saturdayRotationEmployee(target.name);if(!old)return null;
  return saturdayRotationEntries(day).filter(x=>x.dep===dep&&x.shift!==target&&!saturdayRotationIsClosing(x))
    .map(entry=>({...entry,employee:saturdayRotationEmployee(entry.shift.name)}))
    .filter(x=>x.employee&&!previous.has(saturdayRotationName(x.employee.name)))
    .filter(x=>saturdayRotationSkillOk(x.employee,target,dep)&&saturdayRotationSkillOk(old,x.shift,dep))
    .filter(x=>saturdayRotationCanAssign(out,index,x.employee,target,[target,x.shift])&&saturdayRotationCanAssign(out,index,old,x.shift,[target,x.shift]))
    .filter(x=>saturdayRotationSafeTeam(day,target,x.employee.name))
    .sort((a,b)=>saturdayRotationCandidateScore(out,a.employee,target,dep)-saturdayRotationCandidateScore(out,b.employee,target,dep))[0]||null;
}
function saturdayRotationAppendSkill(shift,text){
  const field=shift.skill?'skill':(shift.note?'note':'skill'),current=String(shift[field]||'Turno');
  if(!current.includes(text))shift[field]=current+' · '+text;
}
function saturdayRotationMarkReplacement(target,oldName,newName,previousDate,mode){
  target.saturdayRotation={oldName,newName,previousDate,mode};
  saturdayRotationAppendSkill(target,`rotazione sabato: ${String(newName).trim()} al posto di ${String(oldName).trim()}`);
}
function saturdayRotationPrevious(out,depth){
  const currentSaturday=out?.[5]?.date;if(!currentSaturday)return{date:'',names:new Set()};
  const previousDate=key(add(currentSaturday,-7));
  if(previousDate<SATURDAY_CLOSING_ROTATION_ANCHOR)return{date:previousDate,names:new Set()};
  const oldWeek=week;
  try{
    week=mon(add(out[0].date,-7));
    let previous=editedBeforeSaturdayRotation(build());
    if(previousDate>SATURDAY_CLOSING_ROTATION_ANCHOR&&depth<SATURDAY_CLOSING_ROTATION_MAX_LOOKBACK)previous=applySaturdayClosingRotation(previous,depth+1);
    const saturday=previous.find(day=>key(day.date)===previousDate)||previous[5];
    return{date:previousDate,names:new Set(saturdayRotationClosers(saturday).map(x=>saturdayRotationName(x.shift.name)))};
  }finally{week=oldWeek}
}
function applySaturdayClosingRotation(out,depth=0){
  if(!(typeof pdv1Active==='function'&&pdv1Active())||!out?.[5]||key(out[5].date)<=SATURDAY_CLOSING_ROTATION_ANCHOR)return out;
  const index=5,day=out[index],previous=saturdayRotationPrevious(out,depth);
  const repeated=saturdayRotationClosers(day).filter(x=>previous.names.has(saturdayRotationName(x.shift.name)));
  repeated.forEach(({shift:target,dep})=>{
    const oldName=target.name,free=saturdayRotationFreeCandidate(out,index,target,dep,previous.names);
    if(free){
      target.name=free.name;saturdayRotationMarkReplacement(target,oldName,free.name,previous.date,'sostituzione');return;
    }
    const swap=saturdayRotationSwapCandidate(out,index,target,dep,previous.names);
    if(swap){
      target.name=swap.employee.name;swap.shift.name=oldName;
      saturdayRotationMarkReplacement(target,oldName,swap.employee.name,previous.date,'scambio');
      swap.shift.saturdayRotationMoved={name:oldName,from:'chiusura',previousDate:previous.date};
      saturdayRotationAppendSkill(swap.shift,`spostato dalla chiusura per rotazione sabato (${String(oldName).trim()})`);
      return;
    }
    target.saturdayRotationWarning={name:oldName,previousDate:previous.date,reason:'nessuna alternativa con competenza e riposi validi'};
    saturdayRotationAppendSkill(target,'ATTENZIONE: seconda chiusura sabato consecutiva');
  });
  if(typeof baseGridAuditWeek==='function'){
    const audit=baseGridAuditWeek(out);
    audit.saturdayRotationWarnings=saturdayRotationEntries(day).filter(x=>x.shift.saturdayRotationWarning).map(x=>x.shift.saturdayRotationWarning);
  }
  return out;
}

// Applichiamo la regola dopo modifiche manuali e coperture assenze, così legge l'orario effettivo.
const editedBeforeSaturdayRotation=edited;
edited=function(ds){return applySaturdayClosingRotation(editedBeforeSaturdayRotation(ds))};

function saturdayRotationNote(shift){
  if(shift?.saturdayRotationWarning)return`⚠ BORDERLINE · chiusura anche sabato ${shift.saturdayRotationWarning.previousDate} · ${shift.saturdayRotationWarning.reason}`;
  if(shift?.saturdayRotation)return`↻ Sabato alternato · sostituisce ${String(shift.saturdayRotation.oldName).trim()} (chiusura del ${shift.saturdayRotation.previousDate})`;
  if(shift?.saturdayRotationMoved)return`↻ Spostato dalla chiusura per rispettare l'alternanza del sabato`;
  return'';
}
const shiftRowBeforeSaturdayRotation=shiftRow;
shiftRow=function(s,d,dep,i){
  let html=shiftRowBeforeSaturdayRotation(s,d,dep,i),note=saturdayRotationNote(s);if(!note)return html;
  const cls=s.saturdayRotationWarning?'saturday-rotation-warning':'saturday-rotation-ok';
  html=html.replace('class="shift"',`class="shift ${cls}"`);
  return html.replace('</div><div class="time">',`<small class="saturday-rotation-note">${esc(note)}</small></div><div class="time">`);
};

if(typeof baseGridIssueList==='function'){
  const baseGridIssueListBeforeSaturdayRotation=baseGridIssueList;
  baseGridIssueList=function(audit){
    const html=baseGridIssueListBeforeSaturdayRotation(audit),warnings=(audit.saturdayRotationWarnings||[]).map(x=>`<div class="base-grid-issue borderline"><b>${esc(String(x.name).trim())}</b><span>Chiusura sabato anche il ${esc(x.previousDate)}</span><strong>BORDERLINE · ${esc(x.reason)}</strong></div>`).join('');
    return html+warnings;
  };
}
if(typeof baseGridEmployeeCell==='function'){
  const baseGridEmployeeCellBeforeSaturdayRotation=baseGridEmployeeCell;
  baseGridEmployeeCell=function(day,employee){
    let html=baseGridEmployeeCellBeforeSaturdayRotation(day,employee),own=saturdayRotationEntries(day).filter(x=>x.shift.name===employee.name).map(x=>x.shift);
    if(own.some(s=>s.saturdayRotationWarning)){html=html.replace('class="base-grid-cell ', 'class="base-grid-cell borderline ');html=html.replace('</td>','<span class="base-grid-cell-alert">2° SABATO</span></td>')}
    else if(own.some(s=>s.saturdayRotation))html=html.replace('</td>','<span class="base-grid-cell-alert saturday-ok">ROT. SABATO</span></td>');
    return html;
  };
}
if(typeof baseGridPanelHtml==='function'){
  const baseGridPanelHtmlBeforeSaturdayRotation=baseGridPanelHtml;
  baseGridPanelHtml=function(ds){return baseGridPanelHtmlBeforeSaturdayRotation(ds).replace('4 · Rotazione equa','4 · Rotazione equa · sabato alternato')};
}
if(typeof generalRulesPanel==='function'){
  const generalRulesPanelBeforeSaturdayRotation=generalRulesPanel;
  generalRulesPanel=function(){
    const html=generalRulesPanelBeforeSaturdayRotation(),extra='<div class="req"><span>Chiusura del sabato</span><b>alternata · mai 2 sabati di fila</b></div><small class="muted">Il sistema cambia il chiusurista solo con competenza e riposi validi. Se il fabbisogno di reparto non offre alternative, mantiene il turno come eccezione borderline.</small>',i=html.lastIndexOf('</div>');
    return i>=0?html.slice(0,i)+extra+html.slice(i):html+extra;
  };
}

try{if(view==='schedule')schedule()}catch(_){}
