// PDV 1: aggiornamento CR 17/09/2026 e definitivi Drive caricati lo stesso giorno.
// I livelli nuovi sono sconosciuti finché il CR li conferma. Mai dedurli dai turni.
const SALES_SKILLS=['Rosticceria/gastronomia banco','Scadenze','Chiusura forno'];
SALES_SKILLS.forEach(k=>{if(!SKILLS.includes(k))SKILLS.push(k)});
const SALES_RULES={version:'20260917-v1',effectiveFrom:'2026-09-21',fridayServiceStart:'',fridayServiceEnd:''};
const SALES_SOURCES={
  '2026-09-14':{url:'https://drive.google.com/file/d/1gUwMoCjwG92Y0Z5fv8cj5YGp1Aa8fZdl/view',daily:['48:15','54:15','56:30','52:30','62:30','62:45','12:30']},
  '2026-09-21':{url:'https://drive.google.com/file/d/1SNLhYp-PaNfOqqCDKtYFQjGKOk5iYzfC/view',daily:['48:30','47:30','43:30','48:30','57:45','61:00','12:30']}
};
const normalizeBeforeSales=normalizePdvState;
normalizePdvState=function(state){const x=normalizeBeforeSales(state);x.employees.forEach(e=>SALES_SKILLS.forEach(k=>{if(e.skills[k]===undefined)e.skills[k]=null}));return x};
function salesEnsure(){
  S.employees.forEach(e=>SALES_SKILLS.forEach(k=>{if(e.skills[k]===undefined)e.skills[k]=null}));
  if(!pdv1Active())return false;
  S.rules=S.rules||{};
  if(S.rules.salesCoverage)return false;
  S.rules.salesCoverage={...SALES_RULES};return true;
}
function salesRules(){return{...SALES_RULES,...S.rules?.salesCoverage}}
function salesActive(date=week){return pdv1Active()&&key(date)>=salesRules().effectiveFrom}
function salesEmployee(name){return S.employees.find(e=>e.name===name)}
function salesBoth(e){return Number(e?.skills?.Scadenze)>=2&&Number(e?.skills?.['Chiusura forno'])>=2}
function salesRequired(s,dep){
  if(s?.salesRequired)return s.salesRequired;
  if(dep==='cr'||s?.excludeFromDepartmentHours)return null;
  const t=String(s?.skill||s?.note||'').toLowerCase();
  if(t.includes('chiusura forno')&&t.includes('scadenze'))return'Chiusura forno + Scadenze';
  if(t.includes('chiusura forno'))return'Chiusura forno';
  if(t.includes('scadenze'))return'Scadenze';
  if(t.includes('rosticceria')||t.includes('gastronomia banco'))return SALES_SKILLS[0];
  return null;
}
const baseGridRequiredBeforeSales=baseGridRequiredSkill;
baseGridRequiredSkill=function(s,dep){return salesRequired(s,dep)||baseGridRequiredBeforeSales(s,dep)};
const baseGridSkillBeforeSales=baseGridSkillOk;
baseGridSkillOk=function(e,k){if(k==='Chiusura forno + Scadenze')return salesBoth(e);if(SALES_SKILLS.includes(k))return Number(e?.skills?.[k])>=2;return baseGridSkillBeforeSales(e,k)};
const pdvRequiredBeforeSales=pdv1RequiredSkill;
pdv1RequiredSkill=function(s){return salesRequired(s,s?._dep)||pdvRequiredBeforeSales(s)};
const replacementRequiredBeforeSales=replacementSkill;
replacementSkill=function(s){return salesRequired(s,s?._dep)||replacementRequiredBeforeSales(s)};
const absenceRequiredBeforeSales=absencePlannerRequiredSkill;
absencePlannerRequiredSkill=function(item){return salesRequired(item,item.dep)||absenceRequiredBeforeSales(item)};
const absenceSkillBeforeSales=absencePlannerSkillOk;
absencePlannerSkillOk=function(e,item){const k=salesRequired(item,item.dep);return k?baseGridSkillOk(e,k):absenceSkillBeforeSales(e,item)};

// Modifiche del definitivo 14–20. Le mansioni non esplicitate nel foglio restano
// quelle già confermate; i nuovi rinforzi non certificano nuove competenze.
const SALES_ROSTER_14=cloneJson(PDV1_PUBLISHED_DRIVE_ROSTER);
function sales14Shift(date,name){return SALES_ROSTER_14[date].g.find(r=>r[0]===name)}
sales14Shift('2026-09-14','Antonio')[2]='13:15';
SALES_ROSTER_14['2026-09-14'].g=SALES_ROSTER_14['2026-09-14'].g.filter(r=>r[0]!=='Miriam');
SALES_ROSTER_14['2026-09-14'].g.push(['Marine','15:00','20:45','Chiusura']);
SALES_ROSTER_14['2026-09-14'].absences=['Miriam','Gianmarco'];
sales14Shift('2026-09-15','Massimo')[2]='13:45';
sales14Shift('2026-09-16','Massimo')[1]='09:30';sales14Shift('2026-09-16','Massimo')[2]='13:30';sales14Shift('2026-09-16','Massimo')[4]={start2:'16:30',end2:'20:45'};
SALES_ROSTER_14['2026-09-16'].g.push(['Maia','15:00','20:45','Servizio · rinforzo']);
SALES_ROSTER_14['2026-09-17'].g.push(['Maia','09:00','14:00','Servizio · rinforzo']);
sales14Shift('2026-09-18','Massimo')[1]='09:30';sales14Shift('2026-09-18','Massimo')[2]='13:30';sales14Shift('2026-09-18','Massimo')[4]={start2:'16:30',end2:'20:45'};
SALES_ROSTER_14['2026-09-18'].g.push(['Miriam','06:30','13:30','Gastro mattina']);
// La domenica di Maia era già indicata come formazione dal CR: la nuova foto
// riporta straordinario ma non revoca la formazione. Non deduciamo autonomia.

const SALES_ROSTER_21=[
  {g:[['Stefano','06:00','13:00','Forno'],['Massimo','06:30','13:30','Gastro mattina · mansione da confermare'],['Katia','07:00','14:00','Ordini'],['Antonio','13:30','20:45','Chiusura'],['Maia','14:30','20:45','Servizio · chiusura']],c:[['Gianmarco','06:30','12:30','Macelleria']],cr:['Giulio','09:30','13:30','CR · reparto',{start2:'16:45',end2:'20:45'}],absences:['Miriam','Marine','Gabriele']},
  {g:[['Miriam','06:00','13:00','Forno'],['Antonio','06:30','13:30','Gastro mattina · mansione da confermare'],['Maia','06:30','13:30','Servizio · rinforzo'],['Katia','13:30','20:45','Chiusura'],['Massimo','15:15','20:45','Servizio · chiusura']],c:[['Gianmarco','07:00','13:00','Macelleria']],cr:['Giulio','09:30','13:30','CR · reparto',{start2:'14:45',end2:'18:30'}],absences:['Stefano','Marine','Gabriele']},
  {g:[['Miriam','06:00','13:00','Forno'],['Stefano','06:30','13:30','Gastro mattina · mansione da confermare'],['Massimo','09:00','14:00','Servizio'],['Antonio','13:30','20:45','Chiusura'],['Maia','15:00','20:45','Servizio · chiusura']],c:[['Gianmarco','06:30','13:30','Macelleria']],cr:['Giulio','06:00','10:30','CR · reparto'],absences:['Katia','Marine','Gabriele']},
  {g:[['Stefano','06:00','13:00','Forno'],['Maia','06:00','13:00','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Antonio','06:30','13:30','Gastro mattina · mansione da confermare'],['Miriam','07:00','13:30','Ordini',{start2:'14:30',end2:'16:30'}],['Massimo','09:30','13:30','Servizio · chiusura',{start2:'16:30',end2:'20:45'}]],c:[['Gianmarco','07:00','13:00','Macelleria']],cr:['Giulio','16:00','20:45','CR · reparto'],absences:['Katia','Marine','Gabriele']},
  {g:[['Stefano','06:00','13:15','Forno'],['Maia','06:00','12:45','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Antonio','06:30','13:30','Gastro mattina · mansione da confermare'],['Miriam','07:00','13:30','Ordini',{start2:'14:30',end2:'16:30'}],['Massimo','14:00','20:45','Servizio · chiusura']],c:[['Gianmarco','06:30','13:30','Macelleria'],['Katia','07:00','14:15','Vendita pesce'],['Giulio','13:30','20:45','Macelleria · CR']],cr:null,absences:['Marine','Gabriele']},
  {g:[['Miriam','06:00','13:00','Forno'],['Maia','06:00','13:00','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Katia','06:30','13:30','Gastro mattina · mansione da confermare'],['Antonio','07:00','14:00','Ordini'],['Massimo','08:00','14:00','Servizio'],['Marine','13:30','20:45','Chiusura'],['Stefano','13:30','20:45','Chiusura']],c:[['Giulio','07:00','13:00','Macelleria · CR'],['Gianmarco','13:30','20:00','Macelleria']],cr:null,absences:['Gabriele']},
  {g:[['Marine','07:00','13:15','Domenica · Servizio'],['Miriam','07:00','13:15','Domenica · Servizio']],c:[],cr:null,absences:['Gabriele']}
];
function salesSourceWeek(date=week){return SALES_SOURCES[key(mon(date))]}
function salesPublishedBuild(){
  const from=key(week);
  return Array.from({length:7},(_,i)=>{
    const date=add(week,i),src=from==='2026-09-14'?SALES_ROSTER_14[key(date)]:SALES_ROSTER_21[i];
    const make=(r,dep)=>({...publishedDriveBuildShift(r,dep),salesPublished:true,source:'Drive · definitivo aggiornato 17/09/2026',sourceUrl:SALES_SOURCES[from].url});
    return{date,holiday:holidayFor(date),g:src.g.map(r=>make(r,'g')),c:src.c.map(r=>make(r,'c')),cr:src.cr?make(src.cr,'cr'):null,salesPublished:true,publishedDriveRoster:true,publishedAbsences:(src.absences||[]).map(publishedDriveEmployee)};
  });
}
function salesMigratePublishedEdits(){
  if(!pdv1Active()||S.salesImportVersion===SALES_RULES.version)return false;
  const inRange=k=>k>='2026-09-14'&&k<='2026-09-27';
  // Gli indici del nuovo definitivo hanno un significato diverso. Conservare
  // integralmente gli edit vecchi nel backup prima di disattivarli.
  S.salesImportArchive={version:SALES_RULES.version,at:new Date().toISOString(),edits:{},crEdits:{},manualShifts:[],absenceCoverageChoices:[]};
  for(const field of ['edits','crEdits']){S[field]=S[field]||{};Object.keys(S[field]).forEach(k=>{if(inRange(k.slice(0,10))){S.salesImportArchive[field][k]=cloneJson(S[field][k]);delete S[field][k]}})}
  for(const field of ['manualShifts','absenceCoverageChoices'])S[field]=(S[field]||[]).filter(x=>{if(!inRange(x.date))return true;S.salesImportArchive[field].push(cloneJson(x));return false});
  S.salesImportVersion=SALES_RULES.version;return true;
}

function salesSlots(index){
  const r=salesRules(),service=index===0||index===5?['08:00','14:00']:index>=1&&index<=3?['09:30','14:00']:r.fridayServiceStart&&r.fridayServiceEnd?[r.fridayServiceStart,r.fridayServiceEnd]:null;
  const rows=[['Forno','06:00','13:00','Forno'],['Rosticceria/gastronomia banco','06:30','13:30',SALES_SKILLS[0]],['Ordini','07:00','13:30','Ordini']];
  if(service)rows.push(['Servizio',...service,'Servizio']);
  rows.push(['Chiusura · controllo scadenze','13:30','20:45','Scadenze'],['Seconda chiusura','14:30','20:45','Servizio']);
  return rows.map(([skill,start,end,salesRequired])=>({skill,start,end,salesRequired,name:'SCOPERTO',pause:mins(end)-mins(start)>420?15:0,salesTemplate:true,salesSlot:skill}));
}
function salesUnavailable(e,date,s){return !e||leave(e.name,date)||shiftSegments(s).some(([a,b])=>blockedAt(e.name,date,toTime(a),toTime(b)))}
function salesAssignDay(out,index,load){
  const day=out[index],slots=salesSlots(index),reserved=baseGridDayAssignments({...day,g:day.g.filter(s=>s.trainingShift||s.extra)}).map(x=>x.shift);
  const pool=staff('gastronomia');
  const candidates=slots.map(s=>pool.filter(e=>baseGridSkillOk(e,s.salesRequired)&&!salesUnavailable(e,day.date,s)&&!reserved.some(t=>t.name===e.name)));
  const order=slots.map((_,i)=>i).sort((a,b)=>candidates[a].length-candidates[b].length);
  const assigned=Array(slots.length).fill(null);let best=null,bestCount=-1,bestCost=Infinity;
  function visit(pos,used,count,cost){
    if(count+order.length-pos<bestCount)return;
    if(pos===order.length){
      const first=assigned[slots.length-2],second=assigned[slots.length-1];
      if(first&&second&&!salesBoth(first)&&!salesBoth(second))return;
      if(count>bestCount||(count===bestCount&&cost<bestCost)){best=assigned.slice();bestCount=count;bestCost=cost}return;
    }
    const n=order[pos],s=slots[n];
    for(const e of candidates[n]){
      if(used.has(e.name))continue;
      const previous=index?baseGridDayAssignments(out[index-1]).filter(x=>x.shift.name===e.name):[];
      const end=previous.length?Math.max(...previous.map(x=>baseGridShiftLastEnd(x.shift))):null;
      const rest=end===null?1440:1440-end+mins(s.start);
      const repeated=previous.some(x=>x.shift.salesSlot===s.salesSlot);
      const closing=s.end==='20:45',countClosing=out.slice(0,index).filter(d=>baseGridDayAssignments(d).some(x=>x.shift.name===e.name&&x.shift.end==='20:45')).length;
      const score=(rest<(generalShiftRules().minimumRestMinutes||720)?1000:0)+(closing&&countClosing>=2?100:0)+(load[e.name]||0)/Math.max(1,pdv1OperationalTarget(e))*20+(repeated?-2:0);
      assigned[n]=e;used.add(e.name);visit(pos+1,used,count+1,cost+score);used.delete(e.name);
    }
    assigned[n]=null;visit(pos+1,used,count,cost);
  }
  visit(0,new Set(),0,0);
  slots.forEach((s,i)=>{s.name=best?.[i]?.name||'SCOPERTO';if(s.name!=='SCOPERTO')load[s.name]=(load[s.name]||0)+dur(s)});
  // Una chiusura mancante deve cercare entrambe le competenze se il collega
  // presente non le possiede. Il controllo di squadra resta attivo dopo gli edit.
  const closers=slots.slice(-2);
  if(!closers.some(s=>salesBoth(salesEmployee(s.name)))){const missing=closers.find(s=>s.name==='SCOPERTO');if(missing){missing.salesRequired='Chiusura forno + Scadenze';missing.skill+=' · Chiusura forno + Scadenze'}}
  day.g=[...slots,...day.g.filter(s=>s.trainingShift||s.extra)];day.salesTemplate=true;
  if(index===4&&!salesRules().fridayServiceStart)day.salesFridayPending=true;
  // Il quinto addetto del sabato resta un rinforzo distinto dal quarto servizio.
  if(index===5){const extra={name:'SCOPERTO',start:'09:30',end:'13:30',skill:'Vendita straordinaria · quinto sabato mattina',pause:0,saturdayMorningSale:true,salesTemplate:true};const e=pool.filter(e=>baseGridSkillOk(e,'Servizio')&&!salesUnavailable(e,day.date,extra)&&!baseGridDayAssignments(day).some(x=>x.shift.name===e.name)).sort((a,b)=>(load[a.name]||0)-(load[b.name]||0))[0];if(e){extra.name=e.name;load[e.name]=(load[e.name]||0)+4}day.g.push(extra)}
}
const buildBeforeSales=build;
build=function(){
  salesEnsure();
  if(pdv1Active()&&salesSourceWeek())return salesPublishedBuild();
  const out=buildBeforeSales();if(!salesActive())return out;
  const load={};out.forEach((day,i)=>{
    [...day.c,...(day.cr?[day.cr]:[])].forEach(s=>{load[s.name]=(load[s.name]||0)+dur(s)});
    if(i<6&&day.holiday?.type!=='closed')salesAssignDay(out,i,load);
  });return out;
};

function salesGastroSegments(day,s){
  let segments=shiftSegments(s);
  // Un CR registrato anche come copertura Carni non copre Gastro in quella fascia.
  (day.c||[]).filter(c=>c.name===s.name).flatMap(shiftSegments).forEach(([a,b])=>{segments=segments.flatMap(([x,y])=>a>=y||b<=x?[[x,y]]:[[x,Math.min(y,a)],[Math.max(x,b),y]].filter(([u,v])=>v>u))});
  return segments;
}
function salesAudit(ds){
  const issues=[];baseGridAuditWeek(ds);
  ds.forEach((day,dayIndex)=>{
    const entries=baseGridDayAssignments(day);
    entries.forEach(({shift:s,dep})=>{
      const e=salesEmployee(s.name),messages=[];
      if(e&&salesUnavailable(e,day.date,s))messages.push('Conflitto con assenza/indisponibilità registrata');
      if(day.holiday?.type==='closed'&&e)messages.push('Turno pubblicato in giornata registrata chiusa');
      if(e&&entries.some(x=>x.shift!==s&&x.shift.name===s.name&&!(dep==='cr'&&x.shift.coveredByCR)&&!(x.dep==='cr'&&s.coveredByCR)&&absencePlannerOverlaps(s,x.shift)))messages.push('Sovrapposizione tra incarichi');
      if(messages.length){s.baseGridSkillWarning=[s.baseGridSkillWarning,...messages].filter(Boolean).join(' · ');issues.push({dayIndex,text:s.name+': '+messages.join(' · ')})}
      if(s.baseGridSkillWarning&&!messages.length)issues.push({dayIndex,text:s.name+': '+s.baseGridSkillWarning});
      pdv1349ApplyShiftRules(s);
    });
    if(!salesActive(day.date)||dayIndex===6||day.holiday?.type==='closed')return;
    const gastro=[...day.g,...(day.cr?[day.cr]:[])].filter(s=>!s.excludeFromDepartmentHours&&s.name!=='SCOPERTO'&&!salesUnavailable(salesEmployee(s.name),day.date,s));
    const closers=gastro.filter(s=>salesGastroSegments(day,s).some(([a,b])=>a<=870&&b>=1245));
    const first=closers.filter(s=>salesGastroSegments(day,s).some(([a,b])=>a<=810&&b>=1245));
    if(!first.some(s=>Number(salesEmployee(s.name)?.skills?.Scadenze)>=2))issues.push({dayIndex,text:'13:30–20:45: controllo scadenze da coprire o competenza da confermare'});
    if(new Set(closers.map(s=>s.name)).size<2)issues.push({dayIndex,text:'14:30–20:45: servono due addetti distinti in Gastronomia'});
    if(!closers.some(s=>salesBoth(salesEmployee(s.name))))issues.push({dayIndex,text:'Chiusura: uno stesso addetto deve possedere Chiusura forno e Scadenze (livello ≥2)'});
    const rosti=gastro.filter(s=>salesGastroSegments(day,s).some(([a,b])=>a<=390&&b>=810));
    if(!rosti.some(s=>Number(salesEmployee(s.name)?.skills?.[SALES_SKILLS[0]])>=2))issues.push({dayIndex,text:'06:30–13:30: competenza Rosticceria/gastronomia banco da confermare o copertura mancante'});
    const morning=salesSlots(dayIndex).filter(s=>mins(s.start)<720);
    const pools=morning.map(slot=>[...new Set(gastro.filter(s=>baseGridSkillOk(salesEmployee(s.name),slot.salesRequired)&&salesGastroSegments(day,s).some(([a,b])=>a<=mins(slot.start)&&b>=mins(slot.end))).map(s=>s.name))]);
    let maxCovered=0;
    function match(i,used){if(i===pools.length){maxCovered=Math.max(maxCovered,used.size);return}for(const name of pools[i])if(!used.has(name)){used.add(name);match(i+1,used);used.delete(name)}match(i+1,used)}
    match(0,new Set());
    if(maxCovered<morning.length)issues.push({dayIndex,text:`Mattina: ${maxCovered}/${morning.length} mansioni copribili con persone distinte e competenze confermate`});
    if(dayIndex===4&&!salesRules().fridayServiceStart)issues.push({dayIndex,text:'Quarto addetto servizio: fascia del venerdì da indicare nelle Regole PDV'});
  });
  Object.defineProperty(ds,'salesAudit',{value:issues,configurable:true});return ds;
}
// Per il nuovo modello applicare gli edit senza far riscrivere fasce e persone
// ai precedenti 41 passaggi di riequilibrio. Le incompatibilità restano visibili.
const editedBeforeSales=edited;
edited=function(ds){
  if(!pdv1Active()||!ds.some(d=>d.salesPublished||d.salesTemplate))return editedBeforeSales(ds);
  ds=ds.map(day=>({...day,g:day.g.map(s=>({...s})),c:day.c.map(s=>({...s})),cr:day.cr?{...day.cr}:null}));
  ds.forEach(day=>{
    const date=key(day.date),crEdit=S.crEdits?.[date];
    if(crEdit?.deleted)day.cr=null;else if(crEdit&&day.cr)Object.assign(day.cr,crEdit);
    for(const dep of ['g','c'])day[dep]=day[dep].filter((s,i)=>{s._editIndex=i;const edit=S.edits?.[`${date}-${dep}-${i}`];if(edit?.deleted)return false;if(edit)Object.assign(s,edit);return true});
    (S.manualShifts||[]).filter(m=>m.date===date).forEach(m=>day[m.dep==='c'?'c':'g'].push({...m,_manualId:m.id,manualShift:true}));
    // Le scelte manuali di copertura rimangono utilizzabili, ma solo se idonee.
    (S.absenceCoverageChoices||[]).filter(c=>c.date===date).forEach(choice=>{const s=absencePlannerFindSlot(day,choice),e=salesEmployee(choice.candidate);if(s&&e&&absencePlannerSkillOk(e,{...s,dep:choice.dep})&&!salesUnavailable(e,day.date,s)&&!absencePlannerOtherShifts(day,e.name,s).some(t=>absencePlannerOverlaps(t,s))){s.name=e.name;s.absenceCoverage=true;s.coverageOriginalName=choice.absent}});
  });return salesAudit(ds);
};
const departmentDurBeforeSales=departmentDur;
departmentDur=function(s){return s?.name==='SCOPERTO'&&(s.salesPublished||s.salesTemplate)?0:departmentDurBeforeSales(s)};

function salesRulesHtml(r=salesRules()){
  return`<div class="card" id="salesRulesCard"><h3>PDV 1 · coperture aggiornate per aumento vendite</h3><p>Da applicare alle nuove proposte dal <input id="salesFrom" type="date" value="${esc(r.effectiveFrom)}">. I definitivi Drive conservano le loro fasce.</p><div class="scroll"><table><tr><th>Mansione</th><th>Fascia lun–sab</th></tr><tr><td>Forno</td><td>06:00–13:00</td></tr><tr><td>Rosticceria/gastronomia banco</td><td>06:30–13:30</td></tr><tr><td>Ordini</td><td>07:00–13:30</td></tr><tr><td>Quarto addetto · servizio</td><td>Lun e sab 08:00–14:00; mar–gio 09:30–14:00</td></tr><tr><td>Prima chiusura · controllo scadenze</td><td>13:30–20:45</td></tr><tr><td>Seconda chiusura</td><td>14:30–20:45</td></tr></table></div><p><b>Almeno uno dei due addetti di chiusura deve avere sia Chiusura forno sia Scadenze.</b> Per le nuove competenze il livello operativo minimo è 2, come per Forno e Ordini. I livelli mancanti sono da confermare.</p><div class="grid"><label>Servizio venerdì · entrata<input id="salesFridayStart" type="time" value="${esc(r.fridayServiceStart)}"></label><label>Servizio venerdì · uscita<input id="salesFridayEnd" type="time" value="${esc(r.fridayServiceEnd)}"></label></div><p class="muted">Domenica: valgono le regole già presenti. Sabato: il rinforzo di vendita resta distinto dal quarto servizio.</p></div>`;
}
const rulesPageBeforeSales=pdvRulesPage;
pdvRulesPage=function(){rulesPageBeforeSales();const p=pdvDb.pdvs.find(p=>p.id===(pdvRulesEditId||currentPdvId()));if(p?.id!=='PDV_001')return;document.querySelector('#app form')?.insertAdjacentHTML('afterbegin',salesRulesHtml({...SALES_RULES,...p.state?.rules?.salesCoverage}));const old=document.getElementById('advClose2');if(old){old.value='14:30';old.disabled=true;old.title='Fascia definita nelle coperture aggiornate'}};
const saveRulesBeforeSales=savePdvRules;
savePdvRules=function(event,id){
  const from=document.getElementById('salesFrom'),start=document.getElementById('salesFridayStart'),end=document.getElementById('salesFridayEnd');let next=null;
  if(id==='PDV_001'&&from){event.preventDefault();if(!/^\d{4}-\d{2}-\d{2}$/.test(from.value)||Boolean(start.value)!==Boolean(end.value)||(start.value&&mins(start.value)>=mins(end.value))){alert('Completa una data valida e, per il venerdì, entrambe le ore con uscita dopo entrata.');return}next={...SALES_RULES,effectiveFrom:from.value,fridayServiceStart:start.value,fridayServiceEnd:end.value}}
  saveRulesBeforeSales(event,id);
  if(next){const p=pdvDb.pdvs.find(p=>p.id===id);p.state.rules.salesCoverage=next;if(id===currentPdvId()){S.rules.salesCoverage=next;save()}else persistPdvDb();render()}
};
const skillsBeforeSales=skills;
skills=function(){salesEnsure();skillsBeforeSales();const app=document.getElementById('app');if(!app)return;app.querySelectorAll('.pill').forEach(p=>{if(/: (null|undefined)$/.test(p.textContent))p.textContent=p.textContent.replace(/: (null|undefined)$/,': da confermare')});if(pdv1Active())app.insertAdjacentHTML('afterbegin','<div class="card"><b>Nuove competenze PDV 1</b><p>Rosticceria/gastronomia banco, Scadenze e Chiusura forno: assegna i livelli in Competenze. Vuoto = da confermare; 0 = nessuna competenza. Un turno svolto non modifica automaticamente i livelli.</p></div>')};
const todaySkillsBeforeSales=todaySkillsGridHtml;
todaySkillsGridHtml=function(ds){let html=todaySkillsBeforeSales(ds);if(!pdv1Active())return html;html=html.replace('<th>Residue</th>','<th>Rosti./banco</th><th>Scadenze</th><th>Chius. forno</th><th>Residue</th>');for(const e of S.employees){const anchor=`<td>${skillCell(e,'Pescheria')}</td><td><b>`,extra=SALES_SKILLS.map(k=>`<td>${e.skills[k]==null?'?':esc(e.skills[k])}</td>`).join('');const start=html.indexOf(`<td><b>${esc(e.name)}</b></td>`);if(start>=0){const index=html.indexOf(anchor,start);if(index>=0)html=html.slice(0,index)+html.slice(index).replace(anchor,`<td>${skillCell(e,'Pescheria')}</td>${extra}<td><b>`)}}return html};
// Sostituire il vecchio pannello che descriveva ancora il PDF del 5 settembre.
const decoratePublishedBeforeSales=decoratePublishedDriveWeek;
decoratePublishedDriveWeek=function(){if(pdv1Active()&&salesSourceWeek())return;decoratePublishedBeforeSales()};
const hoursBeforeSales=hoursHtml;
hoursHtml=function(ds){
  let html=hoursBeforeSales(ds);if(!pdv1Active()||!ds.some(d=>d.salesPublished||d.salesTemplate))return html;
  const issues=ds.salesAudit||salesAudit(ds).salesAudit,src=salesSourceWeek(),presence=ds.reduce((n,d)=>n+baseGridDayAssignments(d).reduce((m,x)=>m+(x.shift.name==='SCOPERTO'?0:shiftScheduledMinutes(x.shift)),0),0);
  return`<div class="card"><h3>${src?'Definitivo Drive · aggiornato 17 settembre':'Nuove coperture PDV 1'}</h3>${src?`<p><a href="${src.url}" target="_blank" rel="noopener">Apri il file definitivo</a> · Presenza trascritta: <b>${hf(presence/60)}</b> (CR, altri reparti e formazione compresi).</p><p>Il totale di presenza non è l’obiettivo di ore operative del reparto. Le pause e i crediti assenza vanno verificati separatamente. Gli edit precedenti sono conservati nel backup dell’importazione; gli eventuali conflitti con le assenze restano segnalati.</p>`:''}<p>Le nuove competenze individuali non sono ancora confermate. Le fasce dei definitivi restano quelle pubblicate.</p>${issues.length?`<details open><summary>Controlli da completare (${issues.length})</summary><ul>${issues.map(x=>`<li>${DAYS[x.dayIndex]}: ${esc(x.text)}</li>`).join('')}</ul></details>`:'<p class="ok">Coperture e competenze verificate.</p>'}</div>`+html;
};
const syncBeforeSales=syncPdvCloudAuthoritative;
syncPdvCloudAuthoritative=async function(){await syncBeforeSales();const changed=salesEnsure(),imported=salesMigratePublishedEdits();if(changed||imported)save();render()};
const loadPdvBeforeSales=loadPdvIntoState;
loadPdvIntoState=function(p){loadPdvBeforeSales(p);const changed=salesEnsure(),imported=salesMigratePublishedEdits();if(changed||imported)save()};
try{const changed=salesEnsure(),imported=salesMigratePublishedEdits();if(changed||imported)save();render()}catch(err){console.error('Aggiornamento coperture PDV1',err)}
