// PDV 1 / 349 - settimana pubblicata 07-13/09/2026, aggiornata dal PDF Drive del 04/09/2026.
const PDV1_REFERENCE_WEEK={from:'2026-09-07',to:'2026-09-13',version:'pdv1-ref-20260907-v3',publishedAt:'2026-09-04 07:00'};

function refEmp(label){
  const t=String(label||'').trim().toLowerCase();
  if(t==='giulio')return S.employees.find(e=>e.cr)?.name||'Giulio CR';
  return S.employees.find(e=>String(e.name||'').trim().toLowerCase()===t)?.name||label;
}
function refShift(name,start,end,skill,extra={}){
  return{name:refEmp(name),start,end,skill,pause:0,referenceModel:true,source:'Drive · orario pubblicato 7-13 settembre',...extra};
}
function refDay(g=[],c=[],cr=null,note=''){return{g,c,cr,note}}

// Trascrizione dell'orario pubblicato caricato su Drive.
const PDV1_REAL_ROSTER={
  '2026-09-07':refDay([
    ['Marine','06:00','13:00','Forno'],['Katia','06:30','13:30','Ordini · Gastro mattina'],['Stefano','07:15','14:00','Servizio mattina'],['Massimo','14:00','20:45','Chiusura'],['Antonio','14:30','20:45','Chiusura']
  ],[['Gabriele','06:30','13:30','Macelleria']],['Giulio','07:00','13:00','CR mattina'],'Gianmarco assente · Miriam assente · Maia a Generi Vari'),
  '2026-09-08':refDay([
    ['Stefano','06:00','13:00','Forno'],['Massimo','06:30','13:30','Servizio mattina'],['Katia','13:30','20:45','Chiusura'],['Antonio','14:30','20:45','Chiusura']
  ],[['Gabriele','07:00','13:00','Macelleria']],['Giulio','06:00','11:30','CR mattina'],'Gianmarco assente · Marine assente'),
  '2026-09-09':refDay([
    ['Stefano','06:00','13:00','Forno'],['Antonio','06:30','13:30','Ordini · Gastro mattina'],['Katia','07:00','14:00','Servizio mattina'],['Miriam','10:00','13:30','Rinforzo mattina · straordinario'],['Marine','13:30','20:45','Chiusura']
  ],[['Gabriele','06:30','13:30','Macelleria']],['Giulio','16:00','20:45','CR chiusura'],'Gianmarco assente · chiusura CR + Marine'),
  '2026-09-10':refDay([
    ['Katia','06:00','13:00','Forno'],['Stefano','07:30','13:30','Ordini · Gastro mattina'],['Marine','13:30','20:45','Chiusura'],['Miriam','13:45','20:45','Chiusura']
  ],[['Gabriele','07:00','12:00','Macelleria',{start2:'14:00',end2:'16:30'}]],['Giulio','07:00','13:00','CR mattina'],'Gianmarco assente · Maia a Generi Vari'),
  '2026-09-11':refDay([
    ['Miriam','06:00','13:00','Forno'],['Antonio','06:30','13:30','Ordini · Gastro mattina'],['Massimo','09:30','13:30','Servizio',{start2:'16:30',end2:'20:45'}],['Stefano','13:30','20:45','Chiusura']
  ],[['Gabriele','06:30','13:30','Macelleria'],['Katia','07:00','14:00','Vendita pesce'],['Marine','13:30','20:00','Vendita pesce pomeriggio']],['Giulio','06:00','10:30','CR',{start2:'12:00',end2:'15:30'}],'Gianmarco assente · Katia e Marine al Pesce · Maia a Generi Vari'),
  '2026-09-12':refDay([
    ['Antonio','06:00','13:00','Forno'],['Stefano','06:30','13:30','Ordini · Gastro mattina'],['Miriam','07:00','14:00','Servizio mattina'],['Massimo','09:00','13:30','Rinforzo sabato'],['Marine','13:30','20:45','Chiusura'],['Katia','14:30','20:45','Chiusura']
  ],[['Gabriele','06:30','13:30','Macelleria'],['Giulio','11:00','13:30','Macelleria · CR',{start2:'15:30',end2:'20:45'}]],null,'Gianmarco assente · Maia a Generi Vari · chiusura sabato Katia + Marine'),
  '2026-09-13':refDay([
    ['Stefano','07:00','13:15','Domenica'],['Miriam','07:00','13:15','Domenica']
  ],[],null,'Domenica: 2 addetti 07:00-13:15')
};

const PDV1_EXTERNAL_REFERENCE={
  '2026-09-07':[{name:'Maia',start:'10:00',end:'14:00',destination:'Generi Vari'}],
  '2026-09-09':[{name:'Maia',start:'16:30',end:'20:45',destination:'Generi Vari'}],
  '2026-09-10':[{name:'Maia',start:'15:30',end:'20:45',destination:'Generi Vari'}],
  '2026-09-11':[{name:'Maia',start:'09:15',end:'13:00',destination:'Generi Vari'}],
  '2026-09-12':[{name:'Maia',start:'10:00',end:'14:00',destination:'Generi Vari'}]
};

function inPdv1ReferenceDate(k){return k>=PDV1_REFERENCE_WEEK.from&&k<=PDV1_REFERENCE_WEEK.to}
function pdv1ReferenceWeekActive(){return typeof pdv1Active==='function'&&pdv1Active()&&key(week)===PDV1_REFERENCE_WEEK.from}
function migratePdv1ReferenceWeekState(){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return;
  if(S.referenceWeekMigration===PDV1_REFERENCE_WEEK.version)return;
  S.edits=S.edits||{};Object.keys(S.edits).forEach(k=>{if(inPdv1ReferenceDate(k.slice(0,10)))delete S.edits[k]});
  S.crEdits=S.crEdits||{};Object.keys(S.crEdits).forEach(k=>{if(inPdv1ReferenceDate(k))delete S.crEdits[k]});
  S.manualShifts=Array.isArray(S.manualShifts)?S.manualShifts.filter(x=>!inPdv1ReferenceDate(String(x.date||''))):[];
  // Una vecchia richiesta approvata non deve alterare retroattivamente l'orario pubblicato: resta solo nota.
  S.availabilityBlocks=Array.isArray(S.availabilityBlocks)?S.availabilityBlocks.filter(x=>!inPdv1ReferenceDate(String(x.date||''))):[];
  S.referenceWeekMigration=PDV1_REFERENCE_WEEK.version;
  S.planningRules=S.planningRules||{};S.planningRules.people=S.planningRules.people||{};
  const katia=refEmp('Katia');S.planningRules.people[katia]={...(S.planningRules.people[katia]||{}),avoidCloseOpen:true,note:'Viene da lontano: evitare chiusura-apertura salvo necessita.'};
}
function refBuildShift(row,dep){const [name,start,end,skill,extra={}]=row;return refShift(name,start,end,skill,{...extra,_dep:dep})}
function annotateReferenceRest(out){
  const rest=typeof generalShiftRules==='function'?Number(generalShiftRules().minimumRestMinutes)||720:720;
  for(let i=1;i<out.length;i++){
    const prev=out[i-1],day=out[i];
    ['g','c'].forEach(dep=>(day[dep]||[]).forEach(s=>{
      const pe=typeof personLastEndMinutes==='function'?personLastEndMinutes(prev,s.name):null;if(pe==null)return;
      const gap=(24*60-pe)+mins(s.start);if(gap>=rest)return;
      if(typeof markRestException==='function')markRestException(s,gap,rest);else{s.restException=true;s.generalRestGapMinutes=gap}
    }));
    if(day.cr){const pe=typeof personLastEndMinutes==='function'?personLastEndMinutes(prev,day.cr.name):null;if(pe!=null){const gap=(24*60-pe)+mins(day.cr.start);if(gap<rest){if(typeof markRestException==='function')markRestException(day.cr,gap,rest);else{day.cr.restException=true;day.cr.generalRestGapMinutes=gap}}}}
  }
  return out;
}
function applyPdv1ReferenceWeek(out){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return out;
  migratePdv1ReferenceWeekState();let touched=false;
  out.forEach(day=>{
    const k=key(day.date),src=PDV1_REAL_ROSTER[k];if(!src)return;touched=true;
    day.g=(src.g||[]).map(x=>refBuildShift(x,'g'));day.c=(src.c||[]).map(x=>refBuildShift(x,'c'));
    day.cr=src.cr?refShift(src.cr[0],src.cr[1],src.cr[2],src.cr[3],{...(src.cr[4]||{}),note:src.cr[3],referenceModel:true}):null;
    day.referenceModel=true;day.referenceNote=src.note||'';
  });
  return touched?annotateReferenceRest(out):out;
}

// Mercoledi' e' un giorno basso nel 349: quando chiude il CR, basta un solo altro chiusurista se non ci sono esigenze speciali.
function applyPdv1WednesdayLeanClose(out){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return out;
  const close=String(S.rules?.closingTime||'20:45');
  out.forEach(day=>{
    if(day.date.getDay()!==3||day.referenceModel||!day.cr)return;
    const crCloses=shiftSegments(day.cr).some(([,b])=>b===mins(close));if(!crCloses)return;
    const closers=(day.g||[]).filter(s=>String(s.end||'')===close&&String(s.skill||'').toLowerCase().includes('chiusura'));
    if(closers.length<=1)return;
    const keep=closers.find(s=>String(s.name||'').trim()==='Marine')||closers[0];
    day.g=day.g.filter(s=>!closers.includes(s)||s===keep);day.referenceNote='Mercoledi giorno basso: chiusura leggera CR + 1 addetto';day.leanWednesday=true;
  });
  return out;
}
const buildBeforeReferenceModel=build;
build=function(){return applyPdv1ReferenceWeek(applyPdv1WednesdayLeanClose(buildBeforeReferenceModel()))};

function restExceptionText(s){
  if(!s?.restException)return'';const g=Number(s.generalRestGapMinutes)||0,rest=typeof generalShiftRules==='function'?Number(generalShiftRules().minimumRestMinutes)||720:720;
  return`⚠ Chiusura-apertura: riposo ${hf(g/60)} (preferito ${hf(rest/60)})${String(s.name||'').trim()==='Katia'?' · evitare per Katia':''}`;
}
const shiftRowBeforeReferenceModel=shiftRow;
shiftRow=function(s,d,dep,i){let html=shiftRowBeforeReferenceModel(s,d,dep,i),txt=restExceptionText(s);if(!txt)return html;return html.replace('</div><div class="time">',`<small class="rest-exception-note">${esc(txt)}</small></div><div class="time">`)};

function referenceDayWarnings(ds,index){const day=ds[index],arr=[...(day.g||[]),...(day.c||[])];if(day.cr)arr.push(day.cr);return arr.filter(s=>s.restException).map(restExceptionText)}
function decorateReferenceSchedule(){
  if(view!=='schedule'||!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return;
  const ds=edited(build()),ref=key(week)===PDV1_REFERENCE_WEEK.from,app=document.getElementById('app');if(!app)return;
  if(ref&&!document.getElementById('referenceWeekCard')){
    const sections=[...app.querySelectorAll('section.card')],anchor=sections[0];
    const ext=Object.entries(PDV1_EXTERNAL_REFERENCE).map(([d,rows])=>rows.map(x=>`${d.slice(8,10)}/09 ${x.start}-${x.end}`).join('')).join(' · ');
    const card=document.createElement('div');card.id='referenceWeekCard';card.className='card reference-week-card';card.innerHTML=`<div class="row wrap"><div><h3>Orario pubblicato · 7-13 settembre</h3><small>Fonte: PDF aggiornato su Drive · ${esc(PDV1_REFERENCE_WEEK.publishedAt)}</small></div><span class="pill">DRIVE</span></div><p><b>Maia → Generi Vari:</b> ${esc(ext)}</p><small class="muted">Questo orario mostra la logica reale del negozio. Le chiusure-aperture necessarie restano ammesse ma sono evidenziate come eccezioni.</small>`;
    if(anchor)app.insertBefore(card,anchor);else app.appendChild(card);
  }
  [...app.querySelectorAll('section.card')].forEach((section,i)=>{
    const day=ds[i];if(!day)return;const notes=[];if(day.referenceNote)notes.push(day.referenceNote);notes.push(...referenceDayWarnings(ds,i));
    if(notes.length&&!section.querySelector('.reference-day-note'))section.querySelector('.row')?.insertAdjacentHTML('afterend',`<div class="reference-day-note">${notes.map(x=>`<small>${esc(x)}</small>`).join('')}</div>`);
  });
}
const scheduleBeforeReferenceDecor=schedule;
schedule=function(){scheduleBeforeReferenceDecor();decorateReferenceSchedule()};

const employeeWeekBeforeReferenceDecor=employeeWeekPage;
employeeWeekPage=function(name){
  employeeWeekBeforeReferenceDecor(name);if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return;
  const emp=S.employees.find(e=>e.name===employeeWeekName);if(!emp)return;const ds=edited(build());
  [...document.querySelectorAll('#app .employee-day')].forEach((card,i)=>{
    const day=ds[i];if(!day)return;const shifts=employeeDayShifts(day,emp.name),warn=shifts.filter(s=>s.restException).map(restExceptionText);
    if(day.cr?.name===emp.name&&day.cr.restException)warn.push(restExceptionText(day.cr));
    const ext=(PDV1_EXTERNAL_REFERENCE[key(day.date)]||[]).find(x=>refEmp(x.name)===emp.name);
    if(ext&&!card.querySelector('.external-reference-shift'))card.insertAdjacentHTML('beforeend',`<div class="external-reference-shift"><b>${esc(ext.destination)}</b> · ${esc(ext.start)}-${esc(ext.end)}<br><small>Turno fuori reparto · settimana modello</small></div>`);
    if(warn.length&&!card.querySelector('.rest-exception-note'))card.insertAdjacentHTML('beforeend',warn.map(x=>`<small class="rest-exception-note">${esc(x)}</small>`).join(''));
  });
};

const pdvRulesBeforeReferenceModel=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesBeforeReferenceModel();const p=pdvDb?.pdvs?.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p||p.id!=='PDV_001')return;
  const form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;
  const html=`<div class="card"><h3>Orario reale PDV 349 · 7-13 settembre</h3><div class="req"><span>Chiusura-apertura</span><b>da evitare · eccezione evidenziata</b></div><div class="req"><span>Katia</span><b>evitare ancora di piu' chiusura-apertura</b></div><div class="req"><span>Mercoledi giorno basso</span><b>CR + 1 addetto in chiusura</b></div><div class="req"><span>Domenica</span><b>2 addetti · 07:00-13:15</b></div><div class="req"><span>Doppio turno lungo stesso giorno</span><b>solo se operativo e segnalato</b></div><small class="muted">L'orario guida le settimane future, ma nomi e rotazioni restano adattabili a copertura, competenze, assenze e richieste.</small></div>`;actions?.insertAdjacentHTML('beforebegin',html);
};

(function installReferenceStyles(){
  if(document.getElementById('referenceModelStyles'))return;const st=document.createElement('style');st.id='referenceModelStyles';st.textContent=`.reference-week-card{border-left:5px solid #2d6d8d;background:#eef7ff}.reference-day-note{margin:8px 0;padding:7px 9px;border-radius:10px;background:#fff8e8;border:1px solid #e0b461;display:grid;gap:3px}.rest-exception-note{display:block;margin-top:5px;padding:4px 7px;border-radius:8px;background:#fff1dd;color:#8a4b00;font-size:.7rem;font-weight:800;line-height:1.25}.external-reference-shift{margin-top:8px;padding:9px;border-radius:10px;background:#eef8f0;color:#21633c;border:1px solid #b9d9c0}.shift .rest-exception-note{grid-column:1/-1}`;document.head.appendChild(st)
})();
try{render()}catch(_){}
