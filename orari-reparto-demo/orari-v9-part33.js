// Griglia base ciclica e controllo operativo delle chiusure-aperture.
let baseGridOpen=true;
const BASE_GRID_REST_BUFFER_MINUTES=60;

function baseGridDayAssignments(day){
  const out=[];
  if(day?.cr)out.push({shift:day.cr,dep:'cr',index:'cr'});
  (day?.g||[]).forEach((shift,index)=>out.push({shift,dep:'g',index}));
  (day?.c||[]).forEach((shift,index)=>out.push({shift,dep:'c',index}));
  return out;
}
function baseGridRequiredSkill(shift,dep){
  if(dep==='cr')return'CR';
  const text=String(shift?.skill||shift?.note||'').toLowerCase();
  if(text.includes('forno'))return'Forno';
  if(text.includes('ordini'))return'Ordini';
  if(text.includes('pesce'))return'Pescheria';
  if(text.includes('macelleria'))return'Macelleria';
  if(dep==='c'&&!text.includes('supporto')&&!text.includes('ripristino'))return'Macelleria';
  return'Servizio';
}
function baseGridSkillOk(employee,required){
  if(!employee)return false;
  if(required==='CR')return Boolean(employee.cr);
  const level=Number(employee.skills?.[required]||0);
  if(required==='Forno'||required==='Ordini'||required==='Macelleria')return level>=2;
  if(required==='Pescheria')return level>=1;
  return Number(employee.skills?.Servizio||0)>0;
}
function baseGridShiftFirstStart(shift){
  const starts=shiftSegments(shift).map(([start])=>start);
  return starts.length?Math.min(...starts):null;
}
function baseGridShiftLastEnd(shift){
  const ends=shiftSegments(shift).map(([,end])=>end);
  return ends.length?Math.max(...ends):null;
}
function baseGridAuditWeek(ds){
  const audit={uncovered:[],skillWarnings:[],closeOpen:[]};
  (ds||[]).forEach((day,dayIndex)=>baseGridDayAssignments(day).forEach(item=>{
    const s=item.shift;
    delete s.baseGridSkillWarning;delete s.baseGridCloseOpen;
    const required=baseGridRequiredSkill(s,item.dep);
    if(!s?.name||s.name==='SCOPERTO'){
      s.baseGridSkillWarning=`Scoperto · serve ${required}`;
      audit.uncovered.push({...item,dayIndex,required});
      return;
    }
    const employee=S.employees.find(e=>e.name===s.name);
    if(!baseGridSkillOk(employee,required)){
      s.baseGridSkillWarning=`Competenza ${required} non sufficiente`;
      audit.skillWarnings.push({...item,dayIndex,required,employee});
    }
  }));

  const preferred=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
  const closeTime=mins(String(S.rules?.closingTime||'20:45'));
  for(let dayIndex=1;dayIndex<(ds||[]).length;dayIndex++){
    const previous=baseGridDayAssignments(ds[dayIndex-1]);
    const current=baseGridDayAssignments(ds[dayIndex]);
    const names=[...new Set(current.map(x=>x.shift?.name).filter(n=>n&&n!=='SCOPERTO'))];
    names.forEach(name=>{
      const before=previous.filter(x=>x.shift?.name===name),after=current.filter(x=>x.shift?.name===name);
      if(!before.length||!after.length)return;
      const previousEnd=Math.max(...before.map(x=>baseGridShiftLastEnd(x.shift)).filter(Number.isFinite));
      const currentStart=Math.min(...after.map(x=>baseGridShiftFirstStart(x.shift)).filter(Number.isFinite));
      if(!Number.isFinite(previousEnd)||!Number.isFinite(currentStart))return;
      // Evidenziamo solo i veri passaggi chiusura-apertura, non ogni cambio di turno.
      if(previousEnd<closeTime-45||currentStart>9*60+30)return;
      const gap=(24*60-previousEnd)+currentStart;
      if(gap>=preferred+BASE_GRID_REST_BUFFER_MINUTES)return;
      const severity=gap<preferred?'critical':'borderline';
      const event={name,dayIndex,previousEnd,currentStart,gap,preferred,severity};
      audit.closeOpen.push(event);
      before.filter(x=>baseGridShiftLastEnd(x.shift)===previousEnd).forEach(x=>x.shift.baseGridCloseOpen={...event,side:'closing'});
      after.filter(x=>baseGridShiftFirstStart(x.shift)===currentStart).forEach(x=>x.shift.baseGridCloseOpen={...event,side:'opening'});
    });
  }
  try{Object.defineProperty(ds,'baseGridAudit',{value:audit,configurable:true})}catch(_){ds.baseGridAudit=audit}
  return audit;
}

// Il controllo viene eseguito dopo modifiche manuali e coperture delle assenze.
const editedBeforeBaseGrid=edited;
edited=function(ds){
  ds=editedBeforeBaseGrid(ds);
  baseGridAuditWeek(ds);
  return ds;
};

function baseGridCloseOpenText(info){
  if(!info)return'';
  const label=info.severity==='critical'?'CRITICO':'BORDERLINE';
  const action=info.side==='closing'?'segue apertura':'dopo chiusura';
  return`${label} · ${action} · riposo ${hf(info.gap/60)}`;
}
function baseGridShiftWarningsHtml(s){
  const parts=[];
  if(s?.baseGridCloseOpen){
    const level=s.baseGridCloseOpen.severity==='critical'?'critical':'borderline';
    parts.push(`<small class="base-grid-warning ${level}">⚠ ${esc(baseGridCloseOpenText(s.baseGridCloseOpen))}</small>`);
  }
  if(s?.baseGridSkillWarning)parts.push(`<small class="base-grid-warning skill">⚠ ${esc(s.baseGridSkillWarning)}</small>`);
  return parts.join('');
}
const shiftRowBeforeBaseGrid=shiftRow;
shiftRow=function(s,d,dep,i){
  let html=shiftRowBeforeBaseGrid(s,d,dep,i),warnings=baseGridShiftWarningsHtml(s);
  const classes=[s?.baseGridCloseOpen?`base-grid-${s.baseGridCloseOpen.severity}`:'',s?.baseGridSkillWarning?'base-grid-skill-problem':''].filter(Boolean).join(' ');
  if(classes)html=html.replace('class="shift"',`class="shift ${classes}"`);
  if(warnings)html=html.replace('</div><div class="time">',`${warnings}</div><div class="time">`);
  return html;
};

function baseGridEmployeeShifts(day,employee){
  return baseGridDayAssignments(day).filter(x=>x.shift?.name===employee.name);
}
function baseGridExternalMove(day,employee){
  if(typeof moveItems==='function'){
    const move=moveItems(employee.name,day.date)[0];
    if(move)return{destination:move.destination||'Altro reparto',start:'',end:''};
  }
  if(typeof PDV1_EXTERNAL_REFERENCE!=='undefined'){
    return(PDV1_EXTERNAL_REFERENCE[key(day.date)]||[]).find(x=>typeof refEmp==='function'?refEmp(x.name)===employee.name:String(x.name||'').trim()===String(employee.name||'').trim())||null;
  }
  return null;
}
function baseGridEmployeeCell(day,employee){
  if(day.holiday?.type==='closed')return'<td class="base-grid-state">FESTIVO</td>';
  if(typeof sicknessOnDate==='function'&&sicknessOnDate(employee.name,day.date).length)return'<td class="base-grid-state absent">MALATTIA</td>';
  const permit=typeof absenceItems==='function'?absenceItems(employee.name,day.date)[0]:null;
  if(permit)return`<td class="base-grid-state absent">${esc(String(permit.type||'PERMESSO').toUpperCase())}</td>`;
  const move=baseGridExternalMove(day,employee);
  if(move)return`<td class="base-grid-state moved"><b>${move.start&&move.end?`${esc(move.start)}–${esc(move.end)}`:'SPOSTATO'}</b><small>${esc(move.destination||'Altro reparto')}</small></td>`;
  if(leave(employee.name,day.date))return'<td class="base-grid-state absent">FERIE</td>';
  const assignments=baseGridEmployeeShifts(day,employee);
  if(!assignments.length)return'<td class="base-grid-state rest">RIPOSO</td>';
  const classes=[];
  if(assignments.some(x=>x.shift.baseGridCloseOpen?.severity==='critical'))classes.push('critical');
  else if(assignments.some(x=>x.shift.baseGridCloseOpen))classes.push('borderline');
  if(assignments.some(x=>x.shift.baseGridSkillWarning))classes.push('skill');
  const lines=assignments.map(({shift,dep})=>{
    const times=`${shift.start}–${shift.end}${shift.start2&&shift.end2?` / ${shift.start2}–${shift.end2}`:''}`;
    const role=baseGridRequiredSkill(shift,dep),warn=shift.baseGridCloseOpen?`<span class="base-grid-cell-alert">${shift.baseGridCloseOpen.severity==='critical'?'CRITICO':'BORDERLINE'}</span>`:'';
    return`<span class="base-grid-cell-shift"><b>${esc(times)}</b><small>${esc(dep==='cr'?'CR':role)}</small>${warn}</span>`;
  }).join('');
  return`<td class="base-grid-cell ${classes.join(' ')}">${lines}</td>`;
}
function baseGridEmployeeRows(ds){
  const groups=[
    {title:'CR / GASTRONOMIA / FORNO',employees:S.employees.filter(e=>e.cr||e.dept!=='carni')},
    {title:'CARNI / PESCE',employees:S.employees.filter(e=>!e.cr&&e.dept==='carni')}
  ];
  const stats=people(ds);
  return groups.map(group=>{
    if(!group.employees.length)return'';
    const rows=group.employees.map(employee=>{
      const person=stats.find(x=>x.name===employee.name),dept=employee.cr?'CR':employee.dept==='carni'?'Carni':'Gastro';
      return`<tr><th><b>${esc(employee.name)}</b><small>${esc(dept)} · ${hf(employee.hours)}</small></th>${ds.map(day=>baseGridEmployeeCell(day,employee)).join('')}<td class="base-grid-total"><b>${hf(person?.accounted||person?.worked||0)}</b><small>${person?.missing?`mancano ${hf(person.missing)}`:person?.extra?`extra ${hf(person.extra)}`:'in linea'}</small></td></tr>`;
    }).join('');
    return`<tr class="base-grid-section"><th colspan="9">${esc(group.title)}</th></tr>${rows}`;
  }).join('');
}
function baseGridUncoveredRow(ds,audit){
  if(!audit.uncovered.length)return'';
  const cells=ds.map((day,dayIndex)=>{
    const items=audit.uncovered.filter(x=>x.dayIndex===dayIndex);
    return`<td class="base-grid-cell ${items.length?'skill':''}">${items.length?items.map(x=>`<span class="base-grid-cell-shift"><b>${esc(x.shift.start)}–${esc(x.shift.end)}</b><small>serve ${esc(x.required)}</small></span>`).join(''):'—'}</td>`;
  }).join('');
  return`<tr class="base-grid-uncovered"><th><b>SCOPERTI</b><small>da risolvere</small></th>${cells}<td class="base-grid-total bad"><b>${audit.uncovered.length}</b></td></tr>`;
}
function baseGridIssueList(audit){
  const rest=audit.closeOpen.map(x=>{
    const cls=x.severity==='critical'?'critical':'borderline',from=DAYS[x.dayIndex-1],to=DAYS[x.dayIndex];
    return`<div class="base-grid-issue ${cls}"><b>${esc(x.name)}</b><span>${esc(from)} ${toTime(x.previousEnd)} → ${esc(to)} ${toTime(x.currentStart)}</span><strong>${x.severity==='critical'?'CRITICO':'BORDERLINE'} · ${hf(x.gap/60)} riposo</strong></div>`;
  });
  const skills=audit.skillWarnings.map(x=>`<div class="base-grid-issue skill"><b>${esc(x.shift.name)}</b><span>${esc(DAYS[x.dayIndex])} ${esc(x.shift.start)}–${esc(x.shift.end)}</span><strong>Serve ${esc(x.required)}</strong></div>`);
  return[...rest,...skills].join('');
}
function baseGridPanelHtml(ds){
  const audit=ds.baseGridAudit||baseGridAuditWeek(ds),critical=audit.closeOpen.filter(x=>x.severity==='critical').length,borderline=audit.closeOpen.filter(x=>x.severity==='borderline').length;
  const days=ds.map((day,index)=>`<th>${esc(DAYS[index].slice(0,3))}<small>${day.date.toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit'})}</small></th>`).join('');
  const issues=baseGridIssueList(audit),ok=!audit.uncovered.length&&!audit.skillWarnings.length&&!critical;
  return`<div class="card base-grid-panel" id="baseWeeklyGrid"><div class="row wrap"><div><h2>Griglia base · settimana ${off()+1}/6</h2><small class="muted">Cambia settimana con le frecce in alto: ruoli e chiusure ruotano, i fabbisogni restano fissi.</small></div><button class="btn small" onclick="toggleBaseGrid()">Nascondi</button></div><div class="base-grid-priority"><b>Ordine applicato</b><span>1 · Reparto e competenze</span><span>2 · Riposi e limiti</span><span>3 · Ore contrattuali</span><span>4 · Rotazione equa</span></div><div class="base-grid-summary"><div class="${audit.uncovered.length?'bad':'ok'}"><b>${audit.uncovered.length}</b><small>scoperti</small></div><div class="${audit.skillWarnings.length?'bad':'ok'}"><b>${audit.skillWarnings.length}</b><small>competenze da verificare</small></div><div class="${critical?'bad':'ok'}"><b>${critical}</b><small>chiusure-aperture critiche</small></div><div class="${borderline?'warn':'ok'}"><b>${borderline}</b><small>borderline</small></div></div>${issues?`<div class="base-grid-issues"><h3>Turni da controllare</h3>${issues}</div>`:`<div class="base-grid-ok">${ok?'✓ Coperture e riposi principali risultano coerenti.':'✓ Nessun passaggio chiusura-apertura da segnalare.'}</div>`}<div class="scroll base-grid-scroll"><table class="base-grid-table"><thead><tr><th>Addetto</th>${days}<th>Totale</th></tr></thead><tbody>${baseGridEmployeeRows(ds)}${baseGridUncoveredRow(ds,audit)}</tbody></table></div><div class="base-grid-legend"><span><i class="critical"></i> meno di ${hf((Number(generalShiftRules().minimumRestMinutes)||720)/60)}</span><span><i class="borderline"></i> entro 1 ora dal limite</span><span><i class="skill"></i> scoperto/competenza</span></div></div>`;
}
function decorateBaseGridSchedule(ds){
  const app=document.getElementById('app');if(!app)return;
  [...app.querySelectorAll('section.card')].forEach((section,index)=>{
    const day=ds[index];if(!day)return;
    const warnings=baseGridDayAssignments(day).filter(x=>x.shift.baseGridCloseOpen||x.shift.baseGridSkillWarning);
    if(warnings.length)section.classList.add('base-grid-day-warning');
    const cr=day.cr,card=section.querySelector('.card.cr');
    if(cr&&card){
      const note=baseGridShiftWarningsHtml(cr);
      if(note&&!card.querySelector('.base-grid-warning'))card.insertAdjacentHTML('beforeend',note);
      if(cr.baseGridCloseOpen)card.classList.add(`base-grid-${cr.baseGridCloseOpen.severity}`);
      if(cr.baseGridSkillWarning)card.classList.add('base-grid-skill-problem');
    }
  });
}
function installBaseGrid(){
  if(view!=='schedule')return;
  const app=document.getElementById('app'),hero=app?.querySelector('.purplebox');if(!app||!hero)return;
  const ds=edited(build()),actions=hero.querySelector('.row>div:last-child');
  if(actions&&!hero.querySelector('.base-grid-button'))actions.insertAdjacentHTML('beforeend',` <button class="btn primary base-grid-button" onclick="toggleBaseGrid()">▦ ${baseGridOpen?'Nascondi':'Griglia base'}</button>`);
  if(baseGridOpen&&!document.getElementById('baseWeeklyGrid'))hero.insertAdjacentHTML('afterend',baseGridPanelHtml(ds));
  decorateBaseGridSchedule(ds);
}
function toggleBaseGrid(){baseGridOpen=!baseGridOpen;schedule()}

const scheduleBeforeBaseGrid=schedule;
schedule=function(){scheduleBeforeBaseGrid();installBaseGrid()};

try{if(view==='schedule')schedule()}catch(_){}
