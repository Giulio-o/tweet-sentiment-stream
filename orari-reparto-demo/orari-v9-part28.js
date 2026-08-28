// PDV 1 / 349 - settimana pubblicata 07-13/09/2026 e modello operativo reale.
const PDV1_REFERENCE_WEEK_START='2026-09-07';
const PDV1_REFERENCE_WEEK_END='2026-09-13';
const PDV1_REFERENCE_SOURCE='Orario pubblicato 27/08/2026 · settimana 07-13/09/2026';

const PDV1_REFERENCE_DAYS={
  '2026-09-07':{
    g:[
      ['Katia ','06:30','13:30','Gastronomia'],['Stefano','07:15','14:00','Gastronomia'],
      ['Massimo','14:00','20:45','Chiusura Gastronomia'],['Antonio','15:15','20:45','Chiusura Gastronomia'],
      ['Marine','06:00','13:00','Gastronomia']
    ],
    c:[['Gabriele','06:30','13:30','Carni']],
    cr:['08:00','14:00','','','Gastronomia · CR'],
    external:[['Maia','10:00','14:00','Generi Vari']]
  },
  '2026-09-08':{
    g:[
      ['Katia ','13:30','20:45','Chiusura Gastronomia'],['Stefano','06:30','13:30','Gastronomia'],
      ['Miriam','06:00','13:00','Gastronomia'],['Gianmarco','13:30','20:45','Gastronomia · supporto da Carni']
    ],
    c:[['Gabriele','07:00','13:00','Carni']],
    cr:['06:00','11:00','13:00','15:30','Gastronomia · CR · spezzato'],external:[]
  },
  '2026-09-09':{
    g:[
      ['Katia ','07:00','14:00','Gastronomia'],['Stefano','06:30','13:30','Gastronomia'],
      ['Antonio','06:00','13:00','Gastronomia'],['Marine','17:00','20:45','Chiusura Gastronomia · giorno basso']
    ],
    c:[['Gabriele','06:30','13:30','Carni'],['Gianmarco','13:30','17:15','Carni · straordinario']],
    cr:['16:00','20:45','','','Chiusura Gastronomia · CR · giorno basso'],
    external:[['Maia','16:30','20:45','Generi Vari']]
  },
  '2026-09-10':{
    g:[
      ['Katia ','06:00','13:00','Gastronomia'],['Stefano','07:30','13:30','Gastronomia'],
      ['Massimo','13:30','20:45','Chiusura Gastronomia'],['Marine','13:30','20:45','Chiusura Gastronomia']
    ],
    c:[['Gabriele','07:00','12:00','Carni','14:00','16:30']],
    cr:['08:00','14:00','','','Gastronomia · CR'],external:[['Maia','15:30','20:45','Generi Vari']]
  },
  '2026-09-11':{
    g:[
      ['Stefano','15:00','20:45','Chiusura Gastronomia'],['Massimo','14:00','20:45','Chiusura Gastronomia'],
      ['Antonio','06:30','12:00','Gastronomia'],['Marine','06:00','13:00','Gastronomia'],['Miriam','09:30','14:00','Gastronomia']
    ],
    c:[['Katia ','07:00','14:00','Carni'],['Gabriele','06:30','13:30','Carni'],['Gianmarco','13:30','20:00','Carni']],
    cr:['06:00','12:00','','','Gastronomia · CR'],external:[['Maia','09:15','13:00','Generi Vari']]
  },
  '2026-09-12':{
    g:[
      ['Katia ','14:30','20:45','Chiusura Gastronomia'],['Stefano','06:30','13:30','Gastronomia'],
      ['Antonio','06:00','13:00','Gastronomia'],['Marine','14:30','20:45','Chiusura Gastronomia'],['Miriam','07:00','13:30','Gastronomia']
    ],
    c:[['Gabriele','06:30','13:30','Carni'],['Gianmarco','13:30','20:30','Carni']],
    cr:['11:00','13:30','15:30','20:45','Gastronomia · CR · spezzato'],external:[['Maia','10:00','14:00','Generi Vari']]
  },
  '2026-09-13':{
    g:[['Stefano','07:00','13:15','Domenica · straordinario'],['Miriam','07:00','13:15','Domenica · straordinario']],
    c:[],cr:null,external:[]
  }
};

function pdv1ReferenceShift(row,dep){
  const [name,start,end,skill,start2='',end2='']=row;
  return{name,start,end,start2,end2,skill,pause:0,publishedReference:true,referenceSource:PDV1_REFERENCE_SOURCE,_dep:dep};
}
function pdv1ReferenceWeekActive(){return typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'&&key(week)===PDV1_REFERENCE_WEEK_START}
function pdv1ApplyReferenceWeek(out){
  if(!pdv1ReferenceWeekActive())return out;
  out.forEach(day=>{
    const k=key(day.date),ref=PDV1_REFERENCE_DAYS[k];if(!ref)return;
    day.g=(ref.g||[]).map(x=>pdv1ReferenceShift(x,'g'));
    day.c=(ref.c||[]).map(x=>pdv1ReferenceShift(x,'c'));
    day.cr=ref.cr?{name:S.employees.find(e=>e.cr)?.name||'Giulio CR',start:ref.cr[0],end:ref.cr[1],start2:ref.cr[2]||'',end2:ref.cr[3]||'',note:ref.cr[4]||'CR',pause:0,publishedReference:true,referenceSource:PDV1_REFERENCE_SOURCE}:null;
    day.publishedReference=true;
  });
  return out;
}

// Prima importazione: elimina soltanto le vecchie correzioni provvisorie della stessa settimana.
function pdv1SeedReferenceModel(){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return;
  if(S.referenceWeekModel?.source===PDV1_REFERENCE_SOURCE)return;
  const inWeek=d=>d>=PDV1_REFERENCE_WEEK_START&&d<=PDV1_REFERENCE_WEEK_END;
  S.manualShifts=(S.manualShifts||[]).filter(x=>!inWeek(String(x.date||'')));
  S.edits=Object.fromEntries(Object.entries(S.edits||{}).filter(([k])=>!/^2026-09-(0[7-9]|1[0-3])-/.test(k)));
  S.crEdits=Object.fromEntries(Object.entries(S.crEdits||{}).filter(([k])=>!inWeek(k)));
  S.referenceWeekModel={
    source:PDV1_REFERENCE_SOURCE,weekStart:PDV1_REFERENCE_WEEK_START,
    closeOpen:{preferredRestHours:12,hardBlock:false,highlightExceptions:true,avoidFor:['Katia ']},
    wednesday:{traffic:'basso',closingTotal:2,note:'Quando chiude il CR: CR + 1 addetto può essere sufficiente.'},
    sunday:{count:2,start:'07:00',end:'13:15'},
    externalShifts:Object.fromEntries(Object.entries(PDV1_REFERENCE_DAYS).map(([d,x])=>[d,x.external||[]]))
  };
  S.planningRules=S.planningRules||{};S.planningRules.people=S.planningRules.people||{};
  S.planningRules.people['Katia ']={...(S.planningRules.people['Katia ']||{}),avoidCloseOpen:true,note:'Viene da lontano: evitare chiusura-apertura salvo necessità.'};
  save();
}

// Il vecchio vincolo 12h poteva trasformare il turno in SCOPERTO: se non esiste alternativa, ripristina l'addetto e segnala l'eccezione.
function restoreSoftRestFallback(out){
  out.forEach(day=>['g','c'].forEach(dep=>(day[dep]||[]).forEach(s=>{
    if(s.name!=='SCOPERTO')return;
    const m=String(s.skill||'').match(/riposo minimo[^()]*\(([^)]+)\)/i);if(!m)return;
    s.name=m[1];s.skill=String(s.skill||'Turno').replace(/ · riposo minimo[^()]*\([^)]+\)/i,'');s.restFallbackRestored=true;
  })));
  return out;
}
function pdv1RestGap(out,index,name,start){
  if(index<=0)return null;const prevEnd=typeof personLastEndMinutes==='function'?personLastEndMinutes(out[index-1],name):null;
  return prevEnd==null?null:(24*60-prevEnd)+mins(start);
}
function pdv1CandidateForRest(out,index,shift,oldName){
  const day=out[index],rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
  const skill=typeof generalRequiredSkill==='function'?generalRequiredSkill(shift):(typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(shift):'Servizio');
  let pool=S.employees.filter(e=>!e.cr&&e.name!==oldName);
  pool=pool.filter(e=>{
    const v=Number(e.skills?.[skill]||0);if((skill==='Forno'||skill==='Ordini'||skill==='Macelleria')&&v<2)return false;if(skill==='Pescheria'&&v<1)return false;if(skill==='Servizio'&&Number(e.skills?.Servizio||0)<1)return false;
    if(leave(e.name,day.date))return false;if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,shift.start,shift.end))return false;
    if(typeof employeeBusy==='function'&&employeeBusy(day,e.name,shift.start,shift.end))return false;
    const gap=pdv1RestGap(out,index,e.name,shift.start);return gap==null||gap>=rest;
  });
  pool.sort((a,b)=>((String(a.name).trim()==='Katia')?1000:0)-((String(b.name).trim()==='Katia')?1000:0)||(typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0));
  return pool[0]||null;
}
function pdv1MarkOrMinimizeCloseOpen(out,{published=false}={}){
  const rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
  for(let i=1;i<out.length;i++){
    const day=out[i];
    ['g','c'].forEach(dep=>(day[dep]||[]).forEach(s=>{
      if(!s?.name||s.name==='SCOPERTO')return;const gap=pdv1RestGap(out,i,s.name,s.start);if(gap==null||gap>=rest)return;
      const old=s.name;
      if(!published){const replacement=pdv1CandidateForRest(out,i,s,old);if(replacement){s.name=replacement.name;s.skill=String(s.skill||'Turno')+` · evita chiusura-apertura (${old})`;s.restRuleOptimized=true;return}}
      s.restWarning=true;s.restGapMinutes=gap;s.restPreferredMinutes=rest;
      if(String(old).trim()==='Katia')s.restWarningPriority='high';
    }));
    if(day.cr){const gap=pdv1RestGap(out,i,day.cr.name,day.cr.start);if(gap!=null&&gap<rest){day.cr.restWarning=true;day.cr.restGapMinutes=gap;day.cr.note=String(day.cr.note||'CR')+` · ⚠ chiusura-apertura ${hf(gap/60)}`}}
  }
  return out;
}

// Mercoledì del 349: giorno basso. Il modello accetta 2 persone totali in chiusura.
function pdv1ApplyReferenceLowWednesday(out){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001')||pdv1ReferenceWeekActive())return out;
  const close=String(S.rules?.closingTime||'20:45');const day=out[2];if(!day||day.holiday?.type==='closed')return out;
  const crCloses=day.cr&&shiftSegments(day.cr).some(([,b])=>b===mins(close));
  const closers=(day.g||[]).filter(s=>shiftSegments(s).some(([,b])=>b===mins(close))&&String(s.skill||'').toLowerCase().includes('chiusura'));
  const allowedNonCr=crCloses?1:2;
  if(closers.length>allowedNonCr){
    const keep=[...closers].sort((a,b)=>mins(b.start)-mins(a.start)).slice(0,allowedNonCr);
    const keepSet=new Set(keep);day.g=(day.g||[]).filter(s=>!closers.includes(s)||keepSet.has(s));
    keep.forEach(s=>s.skill=String(s.skill||'Chiusura')+' · modello mercoledì basso');
  }
  return out;
}

const buildBeforeReferenceWeek=build;
build=function(){
  let out=buildBeforeReferenceWeek();
  out=restoreSoftRestFallback(out);
  out=pdv1ApplyReferenceLowWednesday(out);
  if(pdv1ReferenceWeekActive())out=pdv1ApplyReferenceWeek(out);
  return pdv1MarkOrMinimizeCloseOpen(out,{published:pdv1ReferenceWeekActive()});
};

function restWarningHtml(s){
  if(!s?.restWarning)return'';const high=s.restWarningPriority==='high';
  return`<small class="rest-warning ${high?'high':''}">⚠ Chiusura→apertura: ${hf(Number(s.restGapMinutes||0)/60)} di riposo${high?' · da evitare per Katia':''}</small>`;
}
const shiftRowBeforeReferenceWarning=shiftRow;
shiftRow=function(s,d,dep,i){let html=shiftRowBeforeReferenceWarning(s,d,dep,i),w=restWarningHtml(s);return w?html.replace('</span>',`</span>${w}`):html};
const employeeShiftHtmlBeforeReferenceWarning=employeeShiftHtml;
employeeShiftHtml=function(s,day){let html=employeeShiftHtmlBeforeReferenceWarning(s,day),w=restWarningHtml(s);return w?html.replace('</small>',`</small>${w}`):html};

// Mostra gli orari reali di Maia nei Generi Vari senza contarli nelle ore del reparto.
const employeeWeekPageBeforeReferenceExternal=employeeWeekPage;
employeeWeekPage=function(name){
  employeeWeekPageBeforeReferenceExternal(name);if(!pdv1ReferenceWeekActive()||String(employeeWeekName).trim()!=='Maia')return;
  [...document.querySelectorAll('#app .employee-day')].forEach((card,i)=>{
    const d=key(add(week,i)),ext=(PDV1_REFERENCE_DAYS[d]?.external||[]).find(x=>String(x[0]).trim()==='Maia');if(!ext)return;
    const state=card.querySelector('.move-state,.rest-state,.leave-state');if(state)state.innerHTML=`<b>Spostato → Generi Vari</b><br><span class="time">${esc(ext[1])}–${esc(ext[2])}</span><br><small>Orario pubblicato · non conteggiato nel reparto</small>`;
  });
};

const pdvRulesPageBeforeReferenceModel=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeReferenceModel();if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return;
  const form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form||document.getElementById('referenceWeekCard'))return;
  actions?.insertAdjacentHTML('beforebegin',`<div class="card" id="referenceWeekCard"><h3>Modello reale · 7–13 settembre</h3><p class="muted">Derivato dall’orario pubblicato del negozio 349 e usato come riferimento per le settimane successive.</p><div class="req"><span>Chiusura→apertura sotto 12h</span><b>evitare; se necessaria evidenziare ⚠</b></div><div class="req"><span>Katia</span><b>evitare in modo prioritario</b></div><div class="req"><span>Mercoledì · giorno basso</span><b>chiusura totale 2 persone</b></div><div class="req"><span>Domenica</span><b>2 addetti · 07:00–13:15</b></div></div>`);
};

try{pdv1SeedReferenceModel();render()}catch(_){}
