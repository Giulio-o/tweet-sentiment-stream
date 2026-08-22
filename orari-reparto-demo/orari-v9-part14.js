function exportShiftLabel(s,dep){
  if(!s)return'';
  const p1=s.start&&s.end?`${s.start}–${s.end}`:'';
  const p2=s.start2&&s.end2?`${s.start2}–${s.end2}`:'';
  const hours=[p1,p2].filter(Boolean).join(' / ');
  const role=String(s.skill||'').replace(/ · /g,' · ');
  const prefix=dep==='c'?'C':'G';
  return `<div class="shift-line"><b>${esc(hours||'—')}</b>${role?`<small>${prefix} · ${esc(role)}</small>`:''}</div>`;
}
function exportEmployeeDayCell(day,employee){
  if(day.holiday?.type==='closed')return'<span class="badge-cell">FESTIVO</span>';
  if(leave(employee.name,day.date))return'<span class="badge-cell">FERIE</span>';
  const parts=[];
  if(day.cr?.name===employee.name)parts.push(exportShiftLabel(day.cr,'g'));
  (day.g||[]).filter(s=>s.name===employee.name).forEach(s=>parts.push(exportShiftLabel(s,'g')));
  (day.c||[]).filter(s=>s.name===employee.name).forEach(s=>parts.push(exportShiftLabel(s,'c')));
  return parts.length?parts.join(''):'<span class="rest-cell">—</span>';
}
function exportEmployeeHours(ds,employee){
  let total=0;
  ds.forEach(day=>{
    if(day.cr?.name===employee.name)total+=dur(day.cr);
    (day.g||[]).filter(s=>s.name===employee.name).forEach(s=>total+=dur(s));
    (day.c||[]).filter(s=>s.name===employee.name).forEach(s=>total+=dur(s));
    if(day.holiday?.type==='closed')total+=creditFor(day.holiday,employee.name);
  });
  return total;
}
function exportTableEmployeeRows(ds,employees){
  return employees.map(e=>`<tr class="${e.cr?'cr-row':''}"><th><b>${esc(e.name)}</b><small>${e.cr?'CR':e.dept==='carni'?'Carni':'Gastro/Forno'} · ${hf(e.hours)} contr.</small></th>${ds.map(d=>`<td>${exportEmployeeDayCell(d,e)}</td>`).join('')}<td class="total-cell"><b>${hf(exportEmployeeHours(ds,e))}</b></td></tr>`).join('');
}
function exportSectionRow(title){return`<tr class="section-row"><th colspan="9">${esc(title)}</th></tr>`}
function weeklyExportHtml(ds){
  const p=typeof currentPdv==='function'?currentPdv():null;
  const name=p?.name||'PDV';
  const code=p?.code?` · Codice ${esc(p.code)}`:'';
  const days=ds.map(d=>({name:DAYS[(d.date.getDay()+6)%7],date:d.date.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})}));
  const cr=S.employees.filter(e=>e.cr);
  const gastro=S.employees.filter(e=>!e.cr&&e.dept!=='carni');
  const carni=S.employees.filter(e=>!e.cr&&e.dept==='carni');
  const body=[
    exportSectionRow('GASTRO / FORNO'),
    exportTableEmployeeRows(ds,[...cr,...gastro]),
    exportSectionRow('CARNI / PESCE'),
    exportTableEmployeeRows(ds,carni)
  ].join('');
  return `<!doctype html><html lang="it"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Orario ${esc(name)} ${key(week)}</title><style>
  @page{size:A4 landscape;margin:7mm}
  *{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;margin:0;color:#111;background:#fff}.sheet{padding:8px}.top{display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:8px}.top h1{font-size:18px;margin:0}.top p{margin:2px 0 0;font-size:11px}.actions{display:flex;gap:6px}.actions button{padding:7px 12px;border:1px solid #777;background:#fff;border-radius:6px;font-weight:700;cursor:pointer}table{border-collapse:collapse;width:100%;table-layout:fixed;font-size:9px}th,td{border:1px solid #777;padding:4px;vertical-align:top;text-align:center;height:48px}thead th{background:#e8e8e8;font-size:9px;height:auto}thead th:first-child{width:15%}thead th:last-child{width:6%}tbody th{text-align:left;background:#f3f3f3;font-size:9px}tbody th small{display:block;font-weight:400;margin-top:2px}.section-row th{background:#cfcfcf;text-align:left;font-size:10px;letter-spacing:.4px;height:auto;padding:4px 7px}.cr-row th{border-left:4px solid #333}.shift-line{margin-bottom:3px;line-height:1.15}.shift-line:last-child{margin-bottom:0}.shift-line b{display:block;font-size:9px}.shift-line small{display:block;font-size:7px;margin-top:2px;color:#444}.badge-cell{font-weight:700;font-size:8px}.rest-cell{color:#999}.total-cell{vertical-align:middle;font-size:10px}.legend{margin-top:6px;font-size:8px;color:#444}.legend b{color:#111}@media print{.actions{display:none}.sheet{padding:0}body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
  </style></head><body><div class="sheet"><div class="top"><div><h1>${esc(name)}${code}</h1><p>Orario settimanale · ${fmt(ds[0].date)} – ${fmt(ds[6].date)}</p></div><div class="actions"><button onclick="window.print()">Stampa / Salva PDF</button><button onclick="window.close()">Chiudi</button></div></div><table><thead><tr><th>Addetto</th>${days.map(d=>`<th>${esc(d.name)}<br>${esc(d.date)}</th>`).join('')}<th>Ore</th></tr></thead><tbody>${body}</tbody></table><div class="legend"><b>G</b> = Gastro/Forno · <b>C</b> = Carni/Pesce · Le ore finali includono eventuali crediti di festività chiusa.</div></div></body></html>`;
}
function exportWeeklyTable(){
  const ds=edited(build());
  const w=window.open('','_blank');
  if(!w){alert('Il browser ha bloccato la nuova finestra. Consenti i popup per esportare la tabella.');return}
  w.document.open();w.document.write(weeklyExportHtml(ds));w.document.close();
}
function appendWeeklyExportButton(){
  if(view!=='schedule')return;
  const app=document.getElementById('app');if(!app||document.getElementById('weeklyExportCard'))return;
  const card=document.createElement('div');card.className='card';card.id='weeklyExportCard';card.innerHTML=`<div class="row wrap"><div><h3>Esporta orario settimanale</h3><small class="muted">Tabella A4 orizzontale con addetti sulle righe, giorni sulle colonne, orari, mansioni e totale ore.</small></div><button class="btn primary" onclick="exportWeeklyTable()">▦ Esporta tabella</button></div>`;app.appendChild(card);
}
const scheduleBeforeWeeklyExport=schedule;
schedule=function(){scheduleBeforeWeeklyExport();appendWeeklyExportButton()};
try{if(view==='schedule')render()}catch(_){}
