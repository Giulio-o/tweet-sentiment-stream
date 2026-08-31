// Invio rapido della tabella settimanale tramite il client email del dispositivo.
const WEEKLY_EMAIL_TO='giuliopiot123456@gmail.com';
function emailShiftText(s){
  if(!s)return'';const times=[s.start&&s.end?`${s.start}-${s.end}`:'',s.start2&&s.end2?`${s.start2}-${s.end2}`:''].filter(Boolean).join(' / ');
  return `${times}${s.skill||s.note?` (${String(s.skill||s.note).replace(/\s+/g,' ')})`:''}`;
}
function emailEmployeeDay(day,e){
  if(day.holiday?.type==='closed')return'FESTIVO';if(leave(e.name,day.date))return'FERIE/PERMESSO';
  const arr=[];if(day.cr?.name===e.name)arr.push(emailShiftText(day.cr));(day.g||[]).filter(s=>s.name===e.name).forEach(s=>arr.push(emailShiftText(s)));(day.c||[]).filter(s=>s.name===e.name).forEach(s=>arr.push(emailShiftText(s)));
  const ext=(typeof PDV1_EXTERNAL_REFERENCE!=='undefined'?PDV1_EXTERNAL_REFERENCE[key(day.date)]||[]:[]).find(x=>refEmp(x.name)===e.name);if(ext)arr.push(`${ext.start}-${ext.end} (${ext.destination})`);
  return arr.length?arr.join(' + '):'Riposo';
}
function weeklyEmailText(ds){
  const p=typeof currentPdv==='function'?currentPdv():null,name=p?.name||'PDV',code=p?.code?` ${p.code}`:'';
  const lines=[`${name}${code}` ,`Orario ${fmt(ds[0].date)} - ${fmt(ds[6].date)}`,''];
  S.employees.forEach(e=>{
    lines.push(e.name);ds.forEach((d,i)=>lines.push(`  ${DAYS[i]} ${fmt(d.date)}: ${emailEmployeeDay(d,e)}`));lines.push('');
  });
  lines.push('Inviato da Orari Reparto');return lines.join('\n');
}
function sendWeeklyTableByEmail(){
  const ds=edited(build()),p=typeof currentPdv==='function'?currentPdv():null,subject=`Orario ${p?.name||'PDV'} · ${fmt(ds[0].date)}-${fmt(ds[6].date)}`,body=weeklyEmailText(ds);
  const uri=`mailto:${encodeURIComponent(WEEKLY_EMAIL_TO)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  if(uri.length>7500&&!confirm('L’orario e molto dettagliato. Il programma di posta potrebbe accorciare il messaggio. Aprirlo comunque?'))return;
  window.location.href=uri;
}
function appendWeeklyEmailButton(){
  if(view!=='schedule')return;const card=document.getElementById('weeklyExportCard');if(!card||document.getElementById('weeklyEmailButton'))return;
  const b=document.createElement('button');b.id='weeklyEmailButton';b.className='btn primary';b.style.cssText='width:100%;margin-top:10px';b.innerHTML='✉ Manda tabella per mail';b.onclick=sendWeeklyTableByEmail;card.appendChild(b);
  const note=document.createElement('small');note.className='muted';note.style.cssText='display:block;margin-top:6px';note.textContent='Destinatario: '+WEEKLY_EMAIL_TO;card.appendChild(note);
}
const scheduleBeforeWeeklyEmail=schedule;
schedule=function(){scheduleBeforeWeeklyEmail();appendWeeklyEmailButton()};
try{if(view==='schedule')schedule()}catch(_){}
