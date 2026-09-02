// Malattia, contatori, griglia odierna competenze e distribuzione ore ordinarie.
const SICKNESS_STANDARD_WORK_DAYS=6; // distribuzione contrattuale lun-sab per stimare il credito settimanale
const PRIORITY_HOUR_DAYS=new Set([0,4,5]); // lunedi, venerdi, sabato

function ensureSicknessState(){S.sicknessSpans=Array.isArray(S.sicknessSpans)?S.sicknessSpans:[]}
function sicknessKey(d){return typeof d==='string'?d:key(d)}
function sicknessOnDate(name,d){
  ensureSicknessState();const k=sicknessKey(d);
  return S.sicknessSpans.filter(x=>x.name===name&&x.from<=k&&x.to>=k)
}
function weekSicknessDays(name){
  ensureSicknessState();let n=0;
  for(let i=0;i<6;i++){const k=key(add(week,i));if(sicknessOnDate(name,k).length)n++}
  return n;
}
function sicknessCreditHours(e){
  const days=weekSicknessDays(e.name),h=Number(e.hours)||0;
  return Math.min(h,(h/SICKNESS_STANDARD_WORK_DAYS)*days);
}
const leaveBeforeSickness=leave;
leave=function(name,d){return sicknessOnDate(name,d).length>0||leaveBeforeSickness(name,d)};

const peopleBeforeSickness=people;
people=function(ds){
  return peopleBeforeSickness(ds).map(p=>{
    const sickDays=weekSicknessDays(p.name),sickHours=sicknessCreditHours(p),baseTarget=Number((p.workTarget??p.hours)||0),workTarget=Math.max(0,baseTarget-sickHours),worked=Number(p.worked)||0;
    return{...p,sickDays,sickHours,workTarget,accounted:Number(p.accounted||0)+sickHours,missing:Math.max(0,workTarget-worked),extra:Math.max(0,worked-workTarget)};
  });
};

function addSickness(name,from,to,source='CR'){
  ensureSicknessState();if(!name||!from||!to)return false;if(to<from){alert('La data finale non puo precedere quella iniziale.');return false}
  const id='mal_'+Date.now();S.sicknessSpans.push({id,name,from,to,type:'Malattia',source});save();return true;
}
function quickSickness(name){
  const today=new Date(),def=key(today),from=prompt(`Malattia ${name}\nDal (AAAA-MM-GG)`,def);if(!from)return;
  const to=prompt(`Malattia ${name}\nFino al (AAAA-MM-GG)`,from);if(!to)return;
  if(addSickness(name,from,to)){if(view==='schedule')schedule();else render()}
}
function deleteSickness(id){ensureSicknessState();S.sicknessSpans=S.sicknessSpans.filter(x=>x.id!==id);save();leavePage()}

function seedGianmarcoSickness(){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return false;ensureSicknessState();
  const id='seed_gianmarco_malattia_20260902_20260920';if(S.sicknessSpans.some(x=>x.id===id))return false;
  const name=S.employees.find(e=>String(e.name||'').trim().toLowerCase()==='gianmarco')?.name||'Gianmarco';
  S.sicknessSpans.push({id,name,from:'2026-09-02',to:'2026-09-20',type:'Malattia',source:'CR'});save();return true;
}

function applySicknessToSchedule(out){
  ensureSicknessState();
  out.forEach(day=>{
    ['g','c'].forEach(dep=>(day[dep]||[]).forEach(s=>{
      if(!s?.name||s.name==='SCOPERTO'||!sicknessOnDate(s.name,day.date).length)return;
      const old=s.name;s.originalSickEmployee=old;s.name='SCOPERTO';s.skill=String(s.skill||'Turno')+` · da coprire per malattia (${old})`;s.sicknessCoverageNeeded=true;
    }));
    if(day.cr?.name&&sicknessOnDate(day.cr.name,day.date).length){const old=day.cr.name;day.cr.originalSickEmployee=old;day.cr.name='SCOPERTO';day.cr.note=String(day.cr.note||'CR')+` · da coprire per malattia (${old})`;day.cr.sicknessCoverageNeeded=true}
  });
  return out;
}

// Ore: esigenze di reparto prima, poi recupero ore ordinarie privilegiando lun/ven/sab.
function personEntriesToday(day,name){const a=[];(day.g||[]).forEach(s=>{if(s.name===name)a.push(s)});(day.c||[]).forEach(s=>{if(s.name===name)a.push(s)});if(day.cr?.name===name)a.push(day.cr);return a}
function canExtendMorning(day,s,minsToAdd){
  if(!s?.start||!s?.end||s.start2)return false;const end=mins(s.end)+minsToAdd;if(end>14*60+30)return false;
  return true;
}
function canStartEveningEarlier(out,index,s,minsToAdd){
  if(!s?.start||!s?.end||s.start2)return false;const ns=mins(s.start)-minsToAdd;if(ns<13*60)return false;
  if(index>0&&typeof personLastEndMinutes==='function'){
    const pe=personLastEndMinutes(out[index-1],s.name),rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
    if(pe!=null&&((24*60-pe)+ns)<rest)return false;
  }
  return true;
}
function extendPriorityShift(out,index,s,neededMinutes){
  const maxPresence=Number(typeof dailyShiftRules==='function'?dailyShiftRules().singlePresenceMaxMinutes:435)||435;
  const scheduled=typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(s):Math.max(0,mins(s.end)-mins(s.start));
  let room=Math.max(0,maxPresence-scheduled),addMin=Math.min(room,neededMinutes,60);addMin=Math.floor(addMin/15)*15;if(addMin<15)return 0;
  const st=mins(s.start),en=mins(s.end);
  if(en<=15*60&&canExtendMorning(out[index],s,addMin)){s.end=toTime(en+addMin);s.hoursDistributionExtension=addMin;return addMin}
  if(st>=13*60&&canStartEveningEarlier(out,index,s,addMin)){s.start=toTime(st-addMin);s.hoursDistributionExtension=addMin;return addMin}
  return 0;
}
function toTime(m){m=((Math.round(m)%1440)+1440)%1440;return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')}
function applyOrdinaryHoursDistribution(out){
  if(typeof pdv1ReferenceWeekActive==='function'&&pdv1ReferenceWeekActive())return out;
  const order=[0,4,5];
  let stats=people(out);
  order.forEach(index=>{
    const day=out[index];if(!day||day.holiday?.type==='closed')return;
    S.employees.filter(e=>!e.cr&&!leave(e.name,day.date)).forEach(e=>{
      let p=stats.find(x=>x.name===e.name);if(!p||p.missing<0.24)return;
      const entries=personEntriesToday(day,e.name).filter(s=>!s.start2);if(entries.length!==1)return;
      const added=extendPriorityShift(out,index,entries[0],Math.round(p.missing*60));if(added){entries[0].skill=String(entries[0].skill||'Turno')+' · ore distribuite '+['lun','','','','ven','sab'][index];stats=people(out)}
    });
  });
  return out;
}
const buildBeforeOrdinaryHoursDistribution=build;
build=function(){let out=buildBeforeOrdinaryHoursDistribution();out=applySicknessToSchedule(out);return applyOrdinaryHoursDistribution(out)};

function skillCell(e,k){const v=Number(e.skills?.[k]||0);return v?`${v}`:'—'}
function todayShiftLabel(day,e){
  if(sicknessOnDate(e.name,day.date).length)return'<b class="bad">MALATTIA</b>';
  if(leave(e.name,day.date))return'<b>ASSENTE</b>';
  const arr=personEntriesToday(day,e.name);return arr.length?arr.map(s=>`${esc(s.start||'')}–${esc(s.end||'')}${s.start2?` / ${esc(s.start2)}–${esc(s.end2)}`:''}`).join('<br>'):'Riposo';
}
function todaySkillsGridHtml(ds){
  const tk=key(new Date()),day=ds.find(d=>key(d.date)===tk);
  if(!day)return`<div class="card" id="todaySkillGrid"><div class="row wrap"><div><h3>Griglia odierna</h3><small class="muted">Competenze, ore residue e turno di oggi.</small></div><button class="btn small" onclick="week=mon(new Date());schedule()">Vai a oggi</button></div><p class="muted">La settimana visualizzata non contiene la data odierna.</p></div>`;
  const stats=people(ds);
  return`<div class="card" id="todaySkillGrid"><h3>Griglia odierna · ${fmt(day.date)}</h3><p class="muted">Le esigenze di reparto hanno sempre priorita. A parita di copertura, il motore privilegia chi deve ancora completare le ore ordinarie e concentra eventuali allungamenti su lunedi, venerdi e sabato.</p><div class="scroll"><table><thead><tr><th>Addetto</th><th>Rep.</th><th>Forno</th><th>Ord.</th><th>Serv.</th><th>Mac.</th><th>Pesce</th><th>Residue</th><th>Oggi</th></tr></thead><tbody>${S.employees.map(e=>{const p=stats.find(x=>x.name===e.name),res=Math.max(0,Number(p?.missing)||0);return`<tr class="${e.cr?'crrow':''}"><td><b>${esc(e.name)}</b></td><td>${e.cr?'CR':e.dept==='carni'?'Carni':'Gastro'}</td><td>${skillCell(e,'Forno')}</td><td>${skillCell(e,'Ordini')}</td><td>${skillCell(e,'Servizio')}</td><td>${skillCell(e,'Macelleria')}</td><td>${skillCell(e,'Pescheria')}</td><td><b>${hf(res)}</b></td><td>${todayShiftLabel(day,e)}</td></tr>`}).join('')}</tbody></table></div></div>`;
}

hoursHtml=function(ds){
  const p=people(ds),ot=p.reduce((a,e)=>a+e.extra,0);
  return`<div class="card"><div class="row wrap"><h3>Ore per addetto</h3><b class="${ot?'bad':'ok'}">Straordinari ${hf(ot)}</b></div><div class="scroll"><table><thead><tr><th>Addetto</th><th>Contr.</th><th>Target</th><th>Lavor.</th><th>Perm.</th><th>Mal.</th><th>Spost.</th><th>Fest.</th><th>Manc.</th><th>Extra</th><th></th></tr></thead><tbody>${p.map(e=>`<tr class="${e.cr?'crrow':''}"><td><b>${esc(e.name)}</b><br><small>${e.cr?'CR':e.dept==='carni'?'Carni':'Gastronomia'}</small></td><td>${hf(e.hours)}</td><td><b>${hf(e.workTarget)}</b></td><td>${hf(e.worked)}</td><td>${e.permits?hf(e.permits):'—'}</td><td>${e.sickDays?`${e.sickDays} gg`:'—'}</td><td>${e.moved?hf(e.moved):'—'}</td><td>${e.festive?hf(e.festive):'—'}</td><td>${e.missing?hf(e.missing):'—'}</td><td class="${e.extra?'bad':''}">${e.extra?hf(e.extra):'—'}</td><td><div class="row wrap" style="gap:5px"><button class="btn small" onclick="quickLeave('${esc(e.name)}')">Ferie</button><button class="btn small" onclick="quickSickness('${esc(e.name)}')">Malattia</button></div></td></tr>`).join('')}</tbody></table></div><small class="muted">Target = ore ordinarie da distribuire dopo ferie/permessi, malattia, spostamenti e festivita. Malattia e permessi restano contabilizzati separatamente.</small></div>`;
};

const leavePageBeforeSickness=leavePage;
leavePage=function(){
  leavePageBeforeSickness();ensureSicknessState();const root=document.querySelector('#app');if(!root||root.querySelector('[data-sickness-manager="1"]'))return;
  const year=new Date().getFullYear(),daysByName={};S.sicknessSpans.forEach(x=>{let d=new Date(x.from+'T12:00:00'),end=new Date(x.to+'T12:00:00');while(d<=end){if(d.getFullYear()===year)daysByName[x.name]=(daysByName[x.name]||0)+1;d.setDate(d.getDate()+1)}});
  root.insertAdjacentHTML('afterbegin',`<div class="card" data-sickness-manager="1"><h2>Malattia</h2><p class="muted">La malattia blocca automaticamente la pianificazione nel periodo indicato e alimenta i contatori.</p>${S.sicknessSpans.length?S.sicknessSpans.slice().sort((a,b)=>a.from.localeCompare(b.from)).map(x=>`<div class="req"><span><b>${esc(x.name)}</b><br><small>${esc(x.from)} → ${esc(x.to)} · Malattia</small></span><button class="btn danger small" onclick="deleteSickness('${esc(x.id)}')">Elimina</button></div>`).join(''):'<p class="muted">Nessuna malattia registrata.</p>'}<hr><h3>Contatore ${year}</h3>${Object.keys(daysByName).length?Object.entries(daysByName).map(([n,d])=>`<div class="req"><span>${esc(n)}</span><b>${d} gg</b></div>`).join(''):'<p class="muted">Nessun giorno registrato.</p>'}</div>`);
};

const employeeWeekPageBeforeSickness=employeeWeekPage;
employeeWeekPage=function(name){
  employeeWeekPageBeforeSickness(name);const emp=S.employees.find(e=>e.name===employeeWeekName);if(!emp)return;
  [...document.querySelectorAll('#app .employee-day')].forEach((card,i)=>{const x=sicknessOnDate(emp.name,add(week,i))[0];if(!x)return;const state=card.querySelector('.leave-state,.rest-state,.move-state,.permit-state');if(state){state.className='day-state permit-state';state.innerHTML='<b>Malattia</b><br><small>Assenza registrata</small>'}});
};

const scheduleBeforeTodaySkills=schedule;
schedule=function(){scheduleBeforeTodaySkills();const app=document.getElementById('app');if(app&&!document.getElementById('todaySkillGrid'))app.insertAdjacentHTML('afterbegin',todaySkillsGridHtml(edited(build())))};

try{ensureSicknessState();seedGianmarcoSickness();if(view==='schedule')schedule();else render()}catch(_){}
