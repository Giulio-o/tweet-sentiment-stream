// Giornata singola: libero o corso fuori sede, con credito personale scelto dal CR.
// Riutilizza le assenze sincronizzate: nessuna ora aggiunta alla copertura reparti.
function singleDayItems(){ensureSpecialState();return S.absences.filter(x=>x.dayStatus==='off'||x.dayStatus==='course')}
function singleDayItem(name,date){return singleDayItems().find(x=>x.name===name&&x.date===dateKeyValue(date))||null}
function singleDayLabel(kind){return kind==='course'?'Corso fuori sede':'Libero'}
function singleDayHours(value){
  const raw=String(value??'').trim().replace(',','.');
  if(!/^(?:\d+(?:\.\d+)?|\d{1,2}:[0-5]\d)$/.test(raw))throw new Error('Inserisci le ore come 6,5 oppure 6:30. Anche 0 è valido.');
  const hours=raw.includes(':')?Number(raw.split(':')[0])+Number(raw.split(':')[1])/60:Number(raw);
  if(!Number.isFinite(hours)||hours<0||hours>24)throw new Error('Le ore riconosciute devono essere comprese tra 0 e 24.');
  return Math.round(hours*60)/60;
}
function singleDayPut(input){
  ensureSpecialState();
  const employee=S.employees.find(e=>e.name===input.name),date=String(input.date||''),kind=input.dayStatus;
  if(!employee)throw new Error('Seleziona un addetto presente in organico.');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!Number.isFinite(new Date(date+'T12:00:00').getTime())||key(new Date(date+'T12:00:00'))!==date)throw new Error('Seleziona una data valida.');
  if(kind!=='off'&&kind!=='course')throw new Error('Scegli Libero oppure Corso fuori sede.');
  const hours=singleDayHours(input.hours),existing=singleDayItem(employee.name,date);
  if(input.id&&!singleDayItems().some(x=>x.id===input.id))throw new Error('La registrazione non esiste più: riapri la giornata.');
  if(input.id&&existing&&existing.id!==input.id)throw new Error('Esiste già una registrazione per questo addetto e questa data.');
  const id=input.id||existing?.id||'giorno_'+Date.now()+'_'+Math.random().toString(36).slice(2,8);
  const conflict=S.absences.some(x=>x.id!==id&&x.name===employee.name&&x.date===date)||S.leaves.some(x=>x.name===employee.name&&dateBetween(date,x.from,x.to))||sicknessOnDate(employee.name,date).length||moveItems(employee.name,date).length;
  if(conflict)throw new Error('Per questa data è già presente un’assenza o uno spostamento. Modifica prima quella registrazione per evitare un doppio conteggio.');
  if(holidayFor(date)?.type==='closed'&&creditFor(holidayFor(date),employee.name)>0)throw new Error('La giornata ha già ore festive riconosciute. Modifica prima il credito festivo per evitare di contarle due volte.');
  const item={id,name:employee.name,date,type:singleDayLabel(kind),dayStatus:kind,hours,fullDay:true,source:'CR',note:String(input.note||'').trim()};
  const i=S.absences.findIndex(x=>x.id===id);if(i<0)S.absences.push(item);else S.absences[i]=item;
  save();return item;
}
function singleDayRemove(id){
  if(!singleDayItems().some(x=>x.id===id))return false;
  S.absences=S.absences.filter(x=>x.id!==id);save();return true;
}

const peopleBeforeSingleDay=people;
people=function(ds){
  return peopleBeforeSingleDay(ds).map(p=>{
    const range=weekRangeKeys(),items=singleDayItems().filter(x=>x.name===p.name&&x.date>=range.from&&x.date<=range.to);
    const dayCredits=items.reduce((n,x)=>n+(Number(x.hours)||0),0);
    // Target e totale personale includono già queste ore attraverso S.absences.
    return{...p,permits:Math.max(0,(p.permits||0)-dayCredits),dayCredits,dayStatusCount:items.length};
  });
};

function singleDayApply(ds){
  ds.forEach(day=>{
    const date=key(day.date);
    const items=singleDayItems().filter(x=>x.date===date&&!absencePlannerIgnored(x.name,date));
    items.forEach(item=>{
      const shifts=[...(day.g||[]),...(day.c||[]),...(day.cr?[day.cr]:[])];
      shifts.filter(s=>s.name===item.name).forEach(s=>{
        s.originalDayStatusEmployee=item.name;s.name='SCOPERTO';
        const field=s.skill?'skill':'note';s[field]=String(s[field]||'Turno')+' · da coprire: '+item.type+' ('+item.name+')';
        // Un CR assente non può continuare a fornire la copertura fittizia.
        if(s.coveredByCR)delete s.coveredByCR;
      });
    });
  });return ds;
}
const buildBeforeSingleDay=build;
build=function(){return singleDayApply(buildBeforeSingleDay())};
const editedBeforeSingleDay=edited;
edited=function(ds){
  ds=editedBeforeSingleDay(ds);
  if(!singleDayItems().some(x=>ds.some(day=>key(day.date)===x.date)))return ds;
  ds=singleDayApply(ds);
  baseGridAuditWeek(ds);
  if(pdv1OperationalBalanceActive()){
    pdv1ApplyOperationalClosingSupport(ds,pdv1OperationalPreviousByWeek[key(week)]||{});
    Object.defineProperty(ds,'pdv1OperationalAudit',{value:pdv1OperationalAudit(ds),configurable:true});
    baseGridAuditWeek(ds);
  }
  return ds;
};
const blockedAtBeforeSingleDay=blockedAt;
blockedAt=function(name,date,start,end){return Boolean(singleDayItem(name,date)&&!absencePlannerIgnored(name,date))||blockedAtBeforeSingleDay(name,date,start,end)};

function singleDayButton(employeeIndex=-1,date=''){
  return`<button type="button" class="btn small single-day-button" onclick="singleDayOpen(${employeeIndex},'${esc(date)}')">Libero / corso</button>`;
}
function singleDayListHtml(weekOnly=false){
  const range=weekRangeKeys(),items=singleDayItems().filter(x=>!weekOnly||(x.date>=range.from&&x.date<=range.to)).sort((a,b)=>a.date.localeCompare(b.date)||a.name.localeCompare(b.name));
  if(!items.length)return weekOnly?'':'<p class="muted">Nessuna giornata registrata.</p>';
  return`<div class="single-day-list"><h3>${weekOnly?'Giornate fuori negozio nella settimana':'Giornate registrate'}</h3>${items.map(x=>{
    const i=S.absences.indexOf(x);
    return`<div class="req"><span><b>${esc(x.name)} · ${esc(x.type)}</b><br><small>${esc(x.date)} · ${hf(x.hours)} riconosciute${x.note?' · '+esc(x.note):''}</small></span><div class="row wrap"><button class="btn small" type="button" onclick="singleDayEdit(${i})">Modifica</button><button class="btn small danger" type="button" onclick="singleDayDelete(${i})">Elimina</button></div></div>`;
  }).join('')}</div>`;
}
function singleDayClose(){const dialog=document.getElementById('singleDayDialog');if(dialog){if(dialog.open&&typeof dialog.close==='function')dialog.close();dialog.remove()}}
function singleDayOpen(employeeIndex=-1,date='',record=null){
  singleDayClose();
  const employee=record?S.employees.find(e=>e.name===record.name):S.employees[employeeIndex]||S.employees[0];
  if(!employee){alert('Aggiungi prima un addetto.');return}
  record=record||singleDayItem(employee.name,date||key(week));
  const kind=record?.dayStatus||'off',selectedDate=record?.date||date||key(week);
  const dialog=document.createElement('dialog');dialog.id='singleDayDialog';dialog.className='single-day-dialog';dialog.setAttribute('aria-labelledby','singleDayTitle');
  dialog.innerHTML=`<form id="singleDayForm"><div class="row wrap"><h2 id="singleDayTitle">Libero / corso</h2><button class="btn small" type="button" onclick="singleDayClose()">Chiudi</button></div><p>Una sola giornata senza turni in negozio. Le ore scelte valgono nel totale personale, non nelle ore dei reparti.</p><div class="single-day-fields"><label>Addetto<select name="employee">${S.employees.map(e=>`<option value="${esc(e.name)}" ${e.name===employee.name?'selected':''}>${esc(e.name)}</option>`).join('')}</select></label><label>Data<input name="date" type="date" required value="${esc(selectedDate)}"></label><label>Giornata<select name="kind"><option value="off" ${kind==='off'?'selected':''}>Libero</option><option value="course" ${kind==='course'?'selected':''}>Corso fuori sede</option></select></label><label>Ore riconosciute<input name="hours" inputmode="decimal" required value="${record?hf(record.hours):'0:00'}" placeholder="Es. 6:30 oppure 6,5"></label><label class="single-day-wide">Nota facoltativa<input name="note" value="${esc(record?.note||'')}" placeholder="Es. corso HACCP, sede del corso"></label></div><p class="muted">Libero parte da 0 ore. Per un corso viene proposta la quota giornaliera: puoi cambiarla. Se un turno resta scoperto, comparirà tra le coperture da gestire.</p><p id="singleDayError" role="alert" class="bad"></p><button class="btn primary" type="submit">Salva giorno e ricalcola</button></form>`;
  document.body.appendChild(dialog);
  const form=dialog.querySelector('form');
  form.elements.kind.onchange=()=>{
    const e=S.employees.find(x=>x.name===form.elements.employee.value);
    form.elements.hours.value=form.elements.kind.value==='off'?'0:00':hf(dailyCredit(e));
  };
  form.onsubmit=event=>{
    event.preventDefault();
    try{
      const item=singleDayPut({id:record?.id,name:form.elements.employee.value,date:form.elements.date.value,dayStatus:form.elements.kind.value,hours:form.elements.hours.value,note:form.elements.note.value});
      singleDayClose();week=mon(new Date(item.date+'T12:00:00'));view='schedule';render();
    }catch(error){dialog.querySelector('#singleDayError').textContent=error.message}
  };
  dialog.addEventListener('cancel',event=>{event.preventDefault();singleDayClose()});
  if(typeof dialog.showModal==='function')dialog.showModal();else dialog.setAttribute('open','');
}
function singleDayEdit(index){const item=S.absences[index];if(item?.dayStatus)singleDayOpen(-1,'',item)}
function singleDayDelete(index){const item=S.absences[index];if(item?.dayStatus&&singleDayRemove(item.id))render()}

const hoursHtmlBeforeSingleDay=hoursHtml;
hoursHtml=function(ds){
  let html=hoursHtmlBeforeSingleDay(ds);
  html=html.replace('<h3>Ore per addetto</h3>','<h3>Ore per addetto</h3>'+singleDayButton());
  return html+singleDayListHtml(true);
};
const leavePageBeforeSingleDay=leavePage;
leavePage=function(){leavePageBeforeSingleDay();document.querySelector('#app').insertAdjacentHTML('afterbegin',`<section class="card"><div class="row wrap"><h2>Libero e corsi fuori sede</h2>${singleDayButton()}</div><p class="muted">Scegli una data e quante ore riconoscere all’addetto, anche zero.</p>${singleDayListHtml()}</section>`)};
const baseGridEmployeeCellBeforeSingleDay=baseGridEmployeeCell;
baseGridEmployeeCell=function(day,employee){
  const item=singleDayItem(employee.name,day.date);
  if(!item)return baseGridEmployeeCellBeforeSingleDay(day,employee);
  return`<td class="base-grid-state single-day-cell ${item.dayStatus==='course'?'single-day-course':'single-day-off'}"><b>${esc(item.type)}</b><small>${hf(item.hours)} riconosciute</small>${singleDayButton(S.employees.findIndex(e=>e.name===employee.name),key(day.date))}</td>`;
};
const employeeWeekPageBeforeSingleDay=employeeWeekPage;
employeeWeekPage=function(name){
  employeeWeekPageBeforeSingleDay(name);
  const employee=S.employees.find(e=>e.name===employeeWeekName);if(!employee)return;
  const credits=people(edited(build())).find(e=>e.name===employee.name)?.dayCredits||0;
  document.querySelector('#app .employee-summary')?.insertAdjacentHTML('beforeend',`<div class="card"><small>Corso / libero riconosciuto</small><br><b>${hf(credits)}</b></div>`);
  [...document.querySelectorAll('#app .employee-day')].forEach((card,i)=>{
    const date=key(add(week,i)),item=singleDayItem(employee.name,date);
    if(item){const state=card.querySelector('.day-state');if(state)state.innerHTML=`<b>${esc(item.type)}</b><br><small>${hf(item.hours)} riconosciute${item.note?' · '+esc(item.note):''}</small>`}
    card.insertAdjacentHTML('beforeend',singleDayButton(S.employees.indexOf(employee),date));
  });
};
const emailEmployeeDayBeforeSingleDay=emailEmployeeDay;
emailEmployeeDay=function(day,employee){const item=singleDayItem(employee.name,day.date);return item?`${item.type} · ${hf(item.hours)} riconosciute`:emailEmployeeDayBeforeSingleDay(day,employee)};

(function(){
  const style=document.createElement('style');
  style.textContent='.single-day-dialog{width:min(640px,calc(100vw - 24px));max-height:90vh;overflow:auto;border:1px solid #c9d2df;border-radius:14px;padding:20px;color:#182536;background:#fff}.single-day-dialog::backdrop{background:#13213c88}.single-day-dialog h2{margin:0}.single-day-dialog p{font-size:1rem;line-height:1.45}.single-day-fields{display:grid;grid-template-columns:1fr 1fr;gap:14px}.single-day-fields label{display:grid;gap:6px;font-size:1rem}.single-day-fields input,.single-day-fields select{width:100%;box-sizing:border-box;min-height:42px;font:inherit}.single-day-wide{grid-column:1/-1}.single-day-list{padding:12px;background:#f4f7fc;border-radius:10px;margin:10px 0}.single-day-cell small{display:block;margin:5px 0}.single-day-course{background:#eee8fc!important}.single-day-off{background:#e7f1fb!important}.single-day-button{font-size:.875rem;white-space:normal}@media(max-width:520px){.single-day-fields{grid-template-columns:1fr}.single-day-dialog{padding:14px}}';
  document.head.appendChild(style);
})();
try{render()}catch(_){}
