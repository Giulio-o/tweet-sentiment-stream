// Orari pubblicati PDV 349 (Drive, PDF del 01/10/2026): copie fedeli 05–18 ottobre.
// Non rigenerare i turni pubblicati. Gli eventuali cambi manuali successivi restano modificabili.
const OCT_2026_PUBLISHED={"2026-10-05":{"t":[["Gianmarco","CARNI","06:30","11:00"],["Gabriele","CARNI","11:00","13:30"],["Gabriele","GASTRO","15:15","20:45"],["Maia","GASTRO","07:00","14:00"],["Stefano","GASTRO","06:00","13:15"],["Massimo","GASTRO","06:30","13:30"],["Marine","GASTRO","13:30","20:45"],["Miriam","GASTRO","07:00","14:00"]],"a":["Katia","Antonio"]},"2026-10-06":{"t":[["Gianmarco","GASTRO","09:00","14:00"],["Gabriele","CARNI","07:00","13:00"],["Maia","GASTRO","06:00","13:00"],["Stefano","GASTRO","06:30","13:45"],["Massimo","GASTRO","13:30","20:45"],["Miriam","GASTRO","07:00","13:00","14:00","16:00"],["Giulio","GASTRO","11:00","13:30","15:15","20:45"]],"a":["Katia","Antonio","Marine"]},"2026-10-07":{"t":[["Gianmarco","GASTRO","09:00","14:00"],["Gabriele","CARNI","06:30","13:30"],["Maia","GASTRO","13:30","20:45"],["Massimo","GASTRO","06:30","13:30"],["Marine","GASTRO","06:00","13:00"],["Miriam","GASTRO","13:30","20:45"],["Giulio","GASTRO","06:00","11:00","12:30","15:30"]],"a":["Katia","Antonio"]},"2026-10-08":{"t":[["Gianmarco","GASTRO","09:00","13:30","16:30","20:45"],["Gabriele","CARNI","07:00","12:00","15:00","17:30"],["Maia","CARNI","07:45","13:00","15:00","17:30"],["Stefano","GASTRO","07:00","12:45","14:00","16:30"],["Massimo","GASTRO","06:30","13:30"],["Marine","GASTRO","06:00","13:15"],["Giulio","GASTRO","11:00","13:30","15:15","20:45"]],"a":["Katia","Antonio"]},"2026-10-09":{"t":[["Gianmarco","GASTRO","09:00","13:00"],["Gianmarco","CARNI","16:00","20:00"],["Gabriele","CARNI","07:00","14:00"],["Maia","GASTRO","14:00","20:45"],["Stefano","GASTRO","07:00","12:45","14:00","16:30"],["Massimo","GASTRO","06:30","12:30","12:30","13:30"],["Marine","GASTRO","13:30","20:45"],["Miriam","GASTRO","06:00","13:00"],["Giulio","CARNI","06:30","12:30"]],"a":["Katia","Antonio"]},"2026-10-10":{"t":[["Gianmarco","CARNI","06:30","13:30"],["Gabriele","CARNI","14:00","20:00"],["Maia","CARNI","06:30","11:00"],["Maia","GASTRO","13:30","16:30"],["Stefano","GASTRO","09:30","13:30","16:30","20:45"],["Massimo","GASTRO","13:30","20:45"],["Marine","GASTRO","06:30","13:30"],["Miriam","GASTRO","06:00","13:00"],["Giulio","GASTRO","06:00","11:00","12:30","15:30"]],"a":["Katia","Antonio"]},"2026-10-11":{"t":[["Maia","GASTRO","07:00","13:15"],["Massimo","GASTRO","07:00","13:15"]],"a":["Antonio"]},"2026-10-12":{"t":[["Gianmarco","GASTRO","08:00","14:00","15:00","17:00"],["Gabriele","CARNI","06:30","13:00"],["Maia","CARNI","06:30","13:30"],["Stefano","GASTRO","06:00","13:00"],["Massimo","GASTRO","06:30","13:30"],["Antonio","GASTRO","07:00","13:30"],["Marine","GASTRO","13:30","20:45"],["Giulio","GASTRO","11:00","13:30","15:15","20:45"]],"a":["Katia","Miriam"]},"2026-10-13":{"t":[["Gianmarco","GASTRO","09:00","14:00"],["Gabriele","CARNI","07:00","13:00"],["Stefano","GASTRO","13:30","20:45"],["Massimo","GASTRO","13:30","20:45"],["Antonio","GASTRO","06:30","13:30"],["Marine","GASTRO","06:00","13:00"],["Giulio","GASTRO","06:30","11:45"]],"a":["Katia","Miriam"]},"2026-10-14":{"t":[["Gianmarco","GASTRO","09:00","14:00"],["Gabriele","CARNI","06:30","13:00"],["Maia","GASTRO","06:00","11:00"],["Stefano","GASTRO","06:30","13:30"],["Massimo","GASTRO","14:00","20:45"],["Antonio","GASTRO","13:30","20:45"],["Giulio","GASTRO","06:00","12:00"]],"a":["Katia","Marine","Miriam"]},"2026-10-15":{"t":[["Gianmarco","GASTRO","09:00","14:00"],["Gabriele","CARNI","07:00","12:00","14:00","17:00"],["Maia","GASTRO","06:30","13:30"],["Stefano","GASTRO","15:30","20:45"],["Antonio","GASTRO","14:00","20:45"],["Marine","GASTRO","06:00","13:00"],["Giulio","GASTRO","06:00","11:30"]],"a":["Katia","Miriam"]},"2026-10-16":{"t":[["Gianmarco","CARNI","06:30","13:30"],["Gabriele","GASTRO","09:30","13:30"],["Gabriele","CARNI","16:00","20:00"],["Maia","GASTRO","13:30","20:45"],["Stefano","GASTRO","07:00","13:30"],["Massimo","GASTRO","06:30","13:30"],["Antonio","GASTRO","06:00","13:00"],["Marine","CARNI","07:00","14:00"],["Giulio","GASTRO","14:00","20:45"]],"a":["Katia","Miriam"]},"2026-10-17":{"t":[["Gianmarco","CARNI","13:30","20:00"],["Gabriele","CARNI","06:30","13:00"],["Maia","GASTRO","15:00","20:45"],["Stefano","GASTRO","07:00","13:30"],["Massimo","GASTRO","06:30","13:30"],["Antonio","GASTRO","06:00","13:00"],["Marine","GASTRO","13:30","20:45"],["Giulio","GASTRO","06:00","13:00"]],"a":["Katia","Miriam"]},"2026-10-18":{"t":[["Maia","GASTRO","07:00","13:15"],["Massimo","GASTRO","07:00","13:15"]],"a":["Katia"]}};
const OCT_2026_VERSION='drive-published-oct-2026-v1';
function oct2026Active(){return typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'}
function oct2026Name(name){return name==='Giulio'?(S.employees.find(e=>e.cr)?.name||'Giulio CR'):(S.employees.find(e=>String(e.name||'').toLowerCase()===name.toLowerCase())?.name||name)}
function oct2026Shift(row,dep,date){
  const [name,department,start,end,start2,end2]=row;
  const skill=department==='CARNI'?(name==='Marine'&&date.endsWith('-16')?'Vendita pesce · pubblicato':'Carni · pubblicato'):'Gastronomia · pubblicato';
  return{name:oct2026Name(name),start,end,...(start2&&end2?{start2,end2}:{}),skill,pause:0,_dep:dep,publishedOctoberShift:true,source:'Drive · PDF orario pubblicato ottobre 2026'};
}
function oct2026Prepare(){
  if(!oct2026Active()||S.oct2026Version===OCT_2026_VERSION)return;
  S.edits=S.edits||{};S.crEdits=S.crEdits||{};
  for(const k of Object.keys(S.edits))if(OCT_2026_PUBLISHED[k.slice(0,10)])delete S.edits[k];
  for(const k of Object.keys(S.crEdits))if(OCT_2026_PUBLISHED[k])delete S.crEdits[k];
  S.manualShifts=(S.manualShifts||[]).filter(x=>!OCT_2026_PUBLISHED[String(x.date||'')]);
  S.absenceCoverageChoices=(S.absenceCoverageChoices||[]).filter(x=>!OCT_2026_PUBLISHED[String(x.date||'')]);
  S.oct2026Version=OCT_2026_VERSION;
  save();
}
function oct2026Apply(out,applyEdits=false){
  if(!oct2026Active())return out;
  for(const d of out||[]){
    const date=key(d.date),src=OCT_2026_PUBLISHED[date];
    if(!src)continue;
    d.g=[];d.c=[];d.cr=null;
    for(const row of src.t){
      const name=row[0],dep=name==='Giulio'?'cr':row[1]==='CARNI'?'c':'g';
      const shift=oct2026Shift(row,dep,date);
      if(dep==='cr'){if(d.cr){ // Più segmenti CR, se presenti
        d.cr.start2=shift.start;d.cr.end2=shift.end;
      }else{d.cr=shift;d.cr.note='CR · pubblicato'}
      }else d[dep].push(shift);
    }
    if(applyEdits){
      for(const dep of ['g','c']){
        d[dep]=d[dep].filter((shift,i)=>{
          const edit=S.edits?.[date+'-'+dep+'-'+i];
          if(edit?.deleted)return false;
          if(edit)Object.assign(shift,edit);
          return true;
        });
      }
      const crEdit=S.crEdits?.[date];
      if(crEdit?.deleted)d.cr=null;else if(crEdit&&d.cr)Object.assign(d.cr,crEdit);
    }
    d.oct2026Published=true;
    d.publishedAbsences=src.a.map(oct2026Name);
    d.oct2026Source=date<'2026-10-12'?'dal 5 al 11 ottobre.PDF':'dal 12 al 18 ottobre.PDF';
    d.publishedDriveNote='PDF Drive · Pubblicato · 01/10/2026';
  }
  return out;
}
const buildBeforeOctoberPublished=build;
build=function(){oct2026Prepare();return oct2026Apply(buildBeforeOctoberPublished())};
const editedBeforeOctoberPublished=edited;
edited=function(ds){
  const out=editedBeforeOctoberPublished(ds);
  if(oct2026Active()&&(out||[]).some(d=>OCT_2026_PUBLISHED[key(d.date)])){
    oct2026Apply(out,true);
    if(typeof baseGridAuditWeek==='function')baseGridAuditWeek(out);
  }
  return out;
};
const baseGridCellBeforeOctoberPublished=baseGridEmployeeCell;
baseGridEmployeeCell=function(day,emp){
  if(!day?.oct2026Published)return baseGridCellBeforeOctoberPublished(day,emp);
  if((day.publishedAbsences||[]).includes(emp.name))return'<td class="base-grid-state absent">ASSENZA</td>';
  const items=baseGridDayAssignments(day).filter(x=>x.shift?.name===emp.name);
  if(!items.length)return'<td class="base-grid-state rest">RIPOSO</td>';
  return'<td class="base-grid-cell">'+items.map(x=>'<span class="base-grid-cell-shift"><b>'+esc(x.shift.start)+'–'+esc(x.shift.end)+(x.shift.start2?' / '+esc(x.shift.start2)+'–'+esc(x.shift.end2):'')+'</b><small>'+esc(x.dep==='cr'?'CR':x.dep==='c'?'Carni/Pesce':'Gastronomia')+'</small></span>').join('')+'</td>';
};
const scheduleBeforeOctoberPublished=schedule;
schedule=function(){
  scheduleBeforeOctoberPublished();
  if(view!=='schedule'||!oct2026Active()||!OCT_2026_PUBLISHED[key(week)])return;
  const app=document.getElementById('app');
  if(!app||app.querySelector('#octPublishedBanner'))return;
  const banner=document.createElement('div');
  banner.id='octPublishedBanner';banner.className='card';
  banner.style.borderLeft='5px solid #14734b';
  banner.innerHTML='<b>✓ Orario pubblicato · Google Drive</b><p class="muted">Trascritto dal PDF ufficiale del 1 ottobre 2026. I turni rimangono quelli programmati: eventuali anomalie sono segnalate, non corrette automaticamente.</p>';
  const grid=app.querySelector('#baseWeeklyGrid')||app.querySelector('.purplebox');
  if(grid)grid.insertAdjacentElement('beforebegin',banner);else app.prepend(banner);
};
if(typeof syncPdvCloudAuthoritative==='function'){
  const syncBeforeOctoberPublished=syncPdvCloudAuthoritative;
  syncPdvCloudAuthoritative=async function(){await syncBeforeOctoberPublished();oct2026Prepare()};
}
try{oct2026Prepare();render()}catch(e){console.error('Orari ottobre:',e)}
