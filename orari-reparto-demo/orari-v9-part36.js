// Settimana pubblicata 14-20 settembre 2026, trascritta dal PDF caricato su Drive il 03/09/2026.
// La domenica, assente nel PDF, usa il turno standard 07:00-13:15 comunicato dal CR.
const PDV1_PUBLISHED_DRIVE_WEEK={from:'2026-09-14',to:'2026-09-20',version:'pdv1-drive-20260914-v2',publishedAt:'2026-09-03 19:40'};

function publishedDriveEmployee(label){
  const target=String(label||'').trim().toLowerCase();
  if(target==='giulio')return S.employees.find(e=>e.cr)?.name||'Giulio CR';
  return S.employees.find(e=>String(e.name||'').trim().toLowerCase()===target)?.name||label;
}
function publishedDriveShift(name,start,end,skill,extra={}){
  return{name:publishedDriveEmployee(name),start,end,skill,pause:0,publishedDriveShift:true,source:'Drive · orario pubblicato 14-20 settembre',...extra};
}
function publishedDriveDay(g=[],c=[],cr=null,note='',absences=[]){return{g,c,cr,note,absences}}

const PDV1_PUBLISHED_DRIVE_ROSTER={
  '2026-09-14':publishedDriveDay([
    ['Antonio','06:00','13:00','Forno'],['Katia','06:30','13:30','Ordini · Gastro mattina'],['Massimo','09:00','14:00','Servizio'],['Stefano','14:00','20:45','Chiusura'],['Miriam','14:30','20:45','Chiusura']
  ],[['Gabriele','06:30','13:30','Macelleria']],['Giulio','06:00','12:30','CR mattina'],'Marine: assenza da orario pubblicato',['Marine']),
  '2026-09-15':publishedDriveDay([
    ['Stefano','06:00','13:00','Forno'],['Massimo','06:30','13:30','Gastro mattina'],['Katia','07:00','14:00','Ordini · Gastro mattina'],['Maia','06:00','12:45','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Antonio','14:00','20:45','Chiusura'],['Miriam','16:00','20:45','Chiusura']
  ],[['Gabriele','07:00','13:30','Macelleria']],['Giulio','11:00','13:30','CR',{start2:'15:15',end2:'20:45'}],'Massimo libero nel pomeriggio · Marine assente',['Marine']),
  '2026-09-16':publishedDriveDay([
    ['Stefano','06:00','13:00','Forno'],['Miriam','06:30','13:30','Ordini'],['Katia','13:30','20:45','Chiusura · Inventario'],['Massimo','13:30','20:45','Chiusura · Inventario'],['Antonio','16:00','20:45','Inventario Gastro-Forno · terza presenza anche fuori reparto',{inventoryShift:true,inventoryEventId:'inventory_quarterly_20260916'}]
  ],[['Gabriele','07:00','14:00','Macelleria · Inventario carne-pesce']],['Giulio','06:30','11:15','CR',{start2:'12:30',end2:'15:30'}],'Inventario: Katia, Massimo e Antonio presenti fino alle 20:45 · Marine assente',['Marine']),
  '2026-09-17':publishedDriveDay([
    ['Stefano','06:00','13:00','Forno'],['Massimo','06:30','13:30','Gastro mattina'],['Miriam','07:00','13:30','Ordini · Gastro mattina · straordinario'],['Katia','13:30','20:45','Chiusura'],['Gianmarco','13:30','20:45','Chiusura Gastro · rientro previsto',{returnExpected:true}]
  ],[['Gabriele','07:00','12:00','Macelleria',{start2:'15:00',end2:'17:45'}]],['Giulio','16:00','20:45','CR chiusura'],'Rientro previsto di Gianmarco · Marine assente',['Marine']),
  '2026-09-18':publishedDriveDay([
    ['Antonio','06:00','13:00','Forno'],['Maia','06:00','13:00','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Massimo','09:00','14:00','Servizio · straordinario'],['Stefano','14:00','20:45','Chiusura']
  ],[['Gabriele','07:00','13:30','Macelleria'],['Katia','07:00','13:30','Vendita pesce'],['Gianmarco','13:30','20:00','Macelleria pomeriggio']],['Giulio','07:00','13:30','CR mattina'],'Katia al pesce 07:00-13:30 · Marine assente',['Marine']),
  '2026-09-19':publishedDriveDay([
    ['Miriam','06:00','13:00','Forno'],['Maia','06:00','13:00','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Katia','07:00','13:30','Gastro mattina'],['Stefano','09:00','14:00','Rinforzo sabato'],['Massimo','13:30','20:45','Chiusura'],['Antonio','13:30','20:45','Chiusura · straordinario']
  ],[['Gabriele','07:00','13:45','Macelleria mattina'],['Gianmarco','13:45','20:45','Macelleria pomeriggio']],['Giulio','06:00','11:00','CR mattina'],'Katia al mattino · Marine assente',['Marine']),
  '2026-09-20':publishedDriveDay([
    ['Katia','07:00','13:15','Domenica · Servizio'],['Maia','07:00','13:15','Domenica · Formazione',{trainingShift:true,excludeFromDepartmentHours:true}]
  ],[],null,'Domenica completata: Katia e Maia 07:00-13:15')
};

function publishedDriveWeekDate(value){return value>=PDV1_PUBLISHED_DRIVE_WEEK.from&&value<=PDV1_PUBLISHED_DRIVE_WEEK.to}
function ensurePdv1PublishedDriveState(){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return false;
  let changed=false;S.sicknessSpans=Array.isArray(S.sicknessSpans)?S.sicknessSpans:[];
  const gianmarco=publishedDriveEmployee('Gianmarco');
  S.sicknessSpans.forEach(span=>{
    if(String(span.name||'').trim()!==String(gianmarco).trim()||span.from>='2026-09-17'||span.to<'2026-09-17')return;
    span.to='2026-09-16';span.returnExpected='2026-09-17';changed=true;
  });
  const katia=S.employees.find(e=>String(e.name||'').trim().toLowerCase()==='katia');
  if(katia&&Number(katia.hours)!==40){katia.hours=40;changed=true}
  const maia=S.employees.find(e=>String(e.name||'').trim().toLowerCase()==='maia');
  if(maia&&Number(maia.skills?.Forno||0)<1){maia.skills={...(maia.skills||{}),Forno:1};changed=true}
  if(S.publishedDriveWeekVersion!==PDV1_PUBLISHED_DRIVE_WEEK.version){
    S.edits=S.edits||{};Object.keys(S.edits).forEach(k=>{if(publishedDriveWeekDate(k.slice(0,10)))delete S.edits[k]});
    S.crEdits=S.crEdits||{};Object.keys(S.crEdits).forEach(k=>{if(publishedDriveWeekDate(k))delete S.crEdits[k]});
    S.manualShifts=Array.isArray(S.manualShifts)?S.manualShifts.filter(x=>!publishedDriveWeekDate(String(x.date||''))):[];
    S.absenceCoverageChoices=Array.isArray(S.absenceCoverageChoices)?S.absenceCoverageChoices.filter(x=>!publishedDriveWeekDate(String(x.date||''))):[];
    S.publishedDriveWeekVersion=PDV1_PUBLISHED_DRIVE_WEEK.version;changed=true;
  }
  return changed;
}
function publishedDriveBuildShift(row,dep){
  const[name,start,end,skill,extra={}]=row;return publishedDriveShift(name,start,end,skill,{...extra,_dep:dep});
}
function applyPdv1PublishedDriveWeek(out){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return out;
  out.forEach(day=>{
    const src=PDV1_PUBLISHED_DRIVE_ROSTER[key(day.date)];if(!src)return;
    day.g=(src.g||[]).map(row=>publishedDriveBuildShift(row,'g'));
    day.c=(src.c||[]).map(row=>publishedDriveBuildShift(row,'c'));
    day.cr=src.cr?publishedDriveShift(src.cr[0],src.cr[1],src.cr[2],src.cr[3],{...(src.cr[4]||{}),note:src.cr[3],_dep:'cr'}):null;
    day.publishedDriveRoster=true;day.publishedDriveNote=src.note||'';day.publishedAbsences=(src.absences||[]).map(publishedDriveEmployee);
  });
  return out;
}

const buildBeforePublishedDriveWeek=build;
build=function(){
  const out=applyPdv1PublishedDriveWeek(buildBeforePublishedDriveWeek());
  return typeof applySicknessToSchedule==='function'?applySicknessToSchedule(out):out;
};

const shiftRowBeforePublishedDriveWeek=shiftRow;
shiftRow=function(s,d,dep,i){
  let html=shiftRowBeforePublishedDriveWeek(s,d,dep,i);if(!s?.publishedDriveShift)return html;
  html=html.replace('class="shift"','class="shift published-drive-shift"');
  const notes=[];
  if(s.excludeFromDepartmentHours)notes.push('FORMAZIONE · conta nel contratto di Maia, esclusa dal monte ore reparto');
  if(s.returnExpected)notes.push('RIENTRO PREVISTO · Gianmarco dal 17 settembre');
  return notes.length?html.replace('</div><div class="time">',`<small class="published-drive-note">${esc(notes.join(' · '))}</small></div><div class="time">`):html;
};

if(typeof baseGridEmployeeCell==='function'){
  const baseGridEmployeeCellBeforePublishedDriveWeek=baseGridEmployeeCell;
  baseGridEmployeeCell=function(day,employee){
    if(day?.publishedDriveRoster&&(day.publishedAbsences||[]).includes(employee.name))return'<td class="base-grid-state absent">ASSENZA</td>';
    return baseGridEmployeeCellBeforePublishedDriveWeek(day,employee);
  };
}

const hoursHtmlBeforePublishedDriveWeek=hoursHtml;
hoursHtml=function(ds){
  let html=hoursHtmlBeforePublishedDriveWeek(ds);if(!(ds||[]).some(day=>day.publishedDriveRoster))return html;
  const training=(ds||[]).flatMap(day=>[...(day.g||[]),...(day.c||[])]).filter(s=>s.excludeFromDepartmentHours).reduce((sum,s)=>sum+dur(s),0);
  const note=`<div class="published-training-summary"><b>Formazione Maia: ${hf(training)}</b><span>conteggiata nelle sue ore personali, esclusa dal monte ore operativo dei reparti.</span></div>`;
  return html.replace('<div class="scroll">',note+'<div class="scroll">');
};

function decoratePublishedDriveWeek(){
  if(view!=='schedule'||key(week)!==PDV1_PUBLISHED_DRIVE_WEEK.from)return;
  const app=document.getElementById('app'),hero=app?.querySelector('.purplebox');if(!app||!hero||document.getElementById('publishedDriveWeekCard'))return;
  const card=document.createElement('div');card.id='publishedDriveWeekCard';card.className='card published-drive-week-card';
  card.innerHTML=`<div class="row wrap"><div><h3>Orario pubblicato · 14-20 settembre</h3><small>Fonte: PDF caricato su Drive · ${esc(PDV1_PUBLISHED_DRIVE_WEEK.publishedAt)}</small></div><span class="pill">DRIVE</span></div><div class="published-drive-facts"><span><b>Domenica</b>Katia + Maia · 07:00-13:15</span><span><b>Maia</b>27:00 formazione fuori monte ore reparto, domenica compresa</span><span><b>Gianmarco</b>rientro previsto giovedì 17</span></div><small class="muted">L’orario pubblicato ha precedenza sulla generazione automatica. Le chiusure-aperture critiche o borderline restano evidenziate.</small>`;
  hero.insertAdjacentElement('afterend',card);
}
const scheduleBeforePublishedDriveWeek=schedule;
schedule=function(){scheduleBeforePublishedDriveWeek();decoratePublishedDriveWeek()};

if(typeof syncPdvCloudAuthoritative==='function'){
  const syncPdvCloudBeforePublishedDriveWeek=syncPdvCloudAuthoritative;
  syncPdvCloudAuthoritative=async function(){await syncPdvCloudBeforePublishedDriveWeek();if(ensurePdv1PublishedDriveState())save()};
}

(function installPublishedDriveWeekStyles(){
  if(document.getElementById('publishedDriveWeekStyles'))return;const st=document.createElement('style');st.id='publishedDriveWeekStyles';
  st.textContent=`.published-drive-week-card{border-left:5px solid #1669a8;background:#eef7ff}.published-drive-facts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:10px 0}.published-drive-facts span,.published-training-summary{display:grid;gap:2px;padding:9px;border-radius:10px;background:#fff;border:1px solid #b7d5ea}.published-drive-shift{border-left:3px solid #5a9dca}.published-drive-note{display:block;margin-top:5px;padding:5px 7px;border-radius:8px;background:#e8f5ff;color:#14547e;font-size:.7rem;font-weight:800;line-height:1.25}.published-training-summary{margin:10px 0;background:#eef7ff;color:#154e73}@media(max-width:720px){.published-drive-facts{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
})();

try{if(ensurePdv1PublishedDriveState())save();if(view==='schedule')schedule();else render()}catch(_){}
