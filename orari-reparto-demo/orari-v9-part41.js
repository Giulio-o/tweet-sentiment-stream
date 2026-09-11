// Proposta eccezionale 21–27 settembre: Calendar + indicazioni del CR dell'11/09.
// Le eccezioni sono limitate a questa settimana e le modifiche manuali restano applicabili.
const SEPT21_FROM='2026-09-21';
function sept21Active(){return pdv1Active()&&key(week)===SEPT21_FROM}
function sept21Name(name){return publishedDriveEmployee(name)}
// Esclusione dal solo confronto distributivo: le ore personali restano visibili.
const pdv1OperationalPartTimeBeforeSept21=pdv1OperationalPartTime;
pdv1OperationalPartTime=function(e){return !(sept21Active()&&pdv1OperationalName(e?.name)==='Gianmarco')&&pdv1OperationalPartTimeBeforeSept21(e)};
function ensureSept21Correction(){
  if(!pdv1Active()||S.sept21Correction==='20260911-v2')return false;
  const name=sept21Name('Gabriele');
  S.absences=S.absences.filter(x=>!(x.name===name&&String(x.id||'').startsWith('sept21_abs_')&&x.date>=SEPT21_FROM&&x.date<='2026-09-27'));
  if(!S.leaves.some(x=>x.name===name&&x.from<=SEPT21_FROM&&x.to>='2026-09-27'))S.leaves.push({name,from:SEPT21_FROM,to:'2026-09-27',source:'CR · ferie confermate 11/09/2026'});
  S.sept21Correction='20260911-v2';return true;
}
const SEPT21_ROWS=[
  {g:[['Antonio','06:00','13:00','Forno'],['Katia','06:30','13:30','Ordini'],['Massimo','07:00','13:00','Servizio'],['Maia','13:30','20:45','Chiusura',{pause:15}],['Stefano','14:00','20:45','Supporto chiusura',{pause:15}]],c:[['Gianmarco','07:00','13:30','Macelleria']],cr:['Giulio','09:30','13:30','CR · reparto / Riunione Gastro fuori sede 14:30–17:30',{start2:'14:30',end2:'17:30',offsiteHours:3,operationalSegments:[['09:30','13:30']]}]},
  {g:[['Miriam','06:00','13:00','Forno'],['Antonio','06:30','13:30','Ordini'],['Massimo','07:00','13:00','Servizio'],['Katia','13:30','20:45','Chiusura',{pause:15}],['Maia','16:30','20:45','Chiusura']],c:[['Gianmarco','07:00','13:30','Macelleria']],cr:['Giulio','06:00','13:30','CR · reparto / Riunione Carni fuori sede 15:00–17:00',{pause:15,start2:'15:00',end2:'17:00',offsiteHours:2,operationalSegments:[['06:00','13:30']]}]},
  {g:[['Stefano','06:00','13:00','Forno'],['Antonio','06:30','13:30','Ordini'],['Miriam','13:30','20:45','Supporto chiusura',{pause:15}],['Massimo','13:30','20:45','Chiusura',{pause:15}]],c:[['Gianmarco','07:00','13:30','Macelleria']],cr:['Giulio','06:00','13:30','CR · apertura',{pause:15}]},
  {g:[['Stefano','06:00','13:00','Forno'],['Antonio','06:30','13:30','Ordini'],['Maia','06:00','12:45','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Miriam','13:30','20:45','Supporto chiusura',{pause:15}],['Massimo','13:30','20:45','Chiusura',{pause:15}]],c:[['Gianmarco','07:00','13:15','Macelleria'],['Giulio','15:00','17:00','Macelleria · preparazioni venerdì · nel turno CR',{coveredByCR:true,crDepartmentCover:true}]],cr:['Giulio','13:00','20:45','CR · Macelleria 15:00–17:00; restante turno in reparto',{pause:15,operationalSegments:[['13:00','15:00'],['17:00','20:45']]}]},
  {g:[['Stefano','06:00','13:00','Forno'],['Antonio','06:30','13:30','Ordini'],['Maia','06:00','13:00','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Gianmarco','13:30','17:30','Servizio · cambio reparto dopo Macelleria'],['Miriam','14:00','20:45','Supporto chiusura',{pause:15}],['Massimo','17:30','20:45','Chiusura · subentro a Gianmarco']],c:[['Gianmarco','07:00','11:00','Macelleria'],['Giulio','11:00','13:00','Macelleria · CR · cambio con Gianmarco',{start2:'15:00',end2:'20:45'}],['Katia','07:00','13:30','Vendita pesce · Carni',{fridayFishOnly:true}]],cr:null},
  {g:[['Antonio','06:00','13:00','Forno'],['Katia','07:00','13:30','Ordini'],['Maia','06:00','13:00','Formazione Forno',{trainingShift:true,excludeFromDepartmentHours:true}],['Massimo','09:00','14:00','Vendita straordinaria · sabato mattina',{saturdayMorningSale:true}],['Miriam','09:30','13:30','Rinforzo sabato mattina'],['Marine','13:30','20:45','Chiusura · rientro',{pause:15}],['Stefano','14:00','20:45','Chiusura',{pause:15}]],c:[['Giulio','06:00','13:30','Macelleria · CR · apertura banco',{pause:15}],['Gianmarco','13:30','20:45','Macelleria · chiusura',{pause:15}]],cr:null},
  {g:[['Marine','07:00','13:15','Domenica · Servizio'],['Miriam','07:00','13:15','Domenica · Servizio']],c:[],cr:null}
];
function ensureSept21State(){
  if(!pdv1Active())return false;
  if(S.sept21Version==='20260911-v1')return ensureSept21Correction();
  ensureSpecialState();
  const abs=[{name:'Miriam',date:'2026-09-21',hours:0,type:'Libero',dayStatus:'off'},
    {name:'Stefano',date:'2026-09-22',hours:4,type:'Corso fuori sede',dayStatus:'course',note:'Primo soccorso 09:00–13:00 · fuori negozio per la giornata'},
    ...['2026-09-23','2026-09-24'].map(date=>({name:'Katia',date,hours:6,type:'Permesso',note:'Totale due giorni 12 ore · ripartizione provvisoria 6+6'})),
    ...[21,22,23,24,25].map(n=>({name:'Marine',date:`2026-09-${n}`,hours:0,type:'Permesso 104',creditPending:true,note:'Assenza comunicata dal CR · credito ore da confermare'})),
    ...[21,22,23,24,25,26,27].map(n=>({name:'Gabriele',date:`2026-09-${n}`,hours:0,type:'Assente',note:'Assenza comunicata dal CR · causale e credito non specificati'}))];
  abs.forEach((x,i)=>{x={...x,id:'sept21_abs_'+i,name:sept21Name(x.name),fullDay:true,source:'CR · 11/09/2026'};
    // Non duplicare crediti già caricati nell'app dall'utente.
    if(!S.absences.some(a=>a.name===x.name&&a.date===x.date))S.absences.push(x);
  });
  S.availabilityBlocks=S.availabilityBlocks||[];
  if(!S.availabilityBlocks.some(x=>x.name===sept21Name('Maia')&&x.date==='2026-09-23'))S.availabilityBlocks.push({requestId:'sept21_maia_morning',name:sept21Name('Maia'),date:'2026-09-23',period:'Mattina',source:'CR · richiesta preservata'});
  S.sept21Version='20260911-v1';ensureSept21Correction();return true;
}
const shiftSegmentsBeforeSept21=shiftSegments;
shiftSegments=function(s){
  let segments=shiftSegmentsBeforeSept21(s);
  if(!s?.sept21||!s.operationalSegments)return segments;
  const excluded=s.offsiteHours?(s.offsiteHours===3?[[870,1050]]:[[900,1020]]):(s.crCoverSegments||[[900,1020]]);
  excluded.forEach(([a,b])=>{segments=segments.flatMap(([c,d])=>a>=d||b<=c?[[c,d]]:[[c,Math.min(d,a)],[Math.max(c,b),d]].filter(([x,y])=>y>x))});
  return segments;
};
const departmentDurBeforeSept21=departmentDur;
departmentDur=function(s){if(s?.sept21&&s.name==='SCOPERTO')return 0;return s?.sept21&&s.crDepartmentCover?hrs(s.start,s.end,s.pause||0):departmentDurBeforeSept21(s)};
function sept21Shift(row,dep){
  const [label,start,end,skill,extra={}]=row,name=sept21Name(label);
  return{name:S.employees.some(e=>e.name===name)?name:'SCOPERTO',start,end,skill,note:skill,pause:0,...extra,sept21:true,source:'Proposta CR · 21–27 settembre',_dep:dep};
}
function sept21Build(){
  const ds=SEPT21_ROWS.map((row,i)=>({date:add(week,i),holiday:holidayFor(add(week,i)),g:row.g.map(x=>sept21Shift(x,'g')),c:row.c.map(x=>sept21Shift(x,'c')),cr:row.cr?sept21Shift(row.cr,'cr'):null,sept21:true}));
  ds[5].g.find(s=>s.saturdayMorningSale).skill='Rinforzo sabato mattina';
  ds[5].g.push(sept21Shift(['SCOPERTO','09:30','13:30','Vendita straordinaria · quinta presenza · CR sentirà altro negozio',{saturdayMorningSale:true}],'g'));
  ds.forEach(d=>{if(d.holiday?.type==='closed'){d.g=[];d.c=[];d.cr=null}});
  return ds;
}
const buildBeforeSept21=build;
build=function(){
  if(!sept21Active())return buildBeforeSept21();
  // La settimana precedente serve al confronto delle chiusure, senza alterararla.
  if(!pdv1OperationalPreviousByWeek[SEPT21_FROM]){
    const selected=week;try{week=add(selected,-7);pdv1OperationalPreviousByWeek[SEPT21_FROM]=pdv1OperationalClosingCounts(buildBeforeSept21())}finally{week=selected}
  }
  return sept21Build();
};
const applySaturdayClosingRotationBeforeSept21=applySaturdayClosingRotation;
applySaturdayClosingRotation=function(out,depth=0){return out.some(d=>d.sept21)?out:applySaturdayClosingRotationBeforeSept21(out,depth)};
const pdv1OperationalPreviousClosingsBeforeSept21=pdv1OperationalPreviousClosings;
pdv1OperationalPreviousClosings=function(buildFn){return pdv1OperationalPreviousClosingsBeforeSept21(()=>sept21Active()?edited(sept21Build()):buildFn())};
const saturdayRotationPreviousBeforeSept21=saturdayRotationPrevious;
saturdayRotationPrevious=function(out,depth){
  if(pdv1Active()&&key(out?.[0]?.date)==='2026-09-28'){
    const selected=week;try{week=add(out[0].date,-7);return{date:'2026-09-26',names:new Set(saturdayRotationClosers(edited(sept21Build())[5]).map(x=>saturdayRotationName(x.shift.name)))}}finally{week=selected}
  }
  return saturdayRotationPreviousBeforeSept21(out,depth);
};
function sept21Validate(ds){
  ds.forEach(day=>{
    day.c.filter(s=>s.crDepartmentCover).forEach(s=>{
      s.coveredByCR=Boolean(day.cr&&s.name===day.cr.name&&shiftSegmentsBeforeSept21(s).every(([a,b])=>shiftSegmentsBeforeSept21(day.cr).some(([c,d])=>a>=c&&b<=d)));
    });
    if(day.cr?.operationalSegments&&!day.cr.offsiteHours)day.cr.crCoverSegments=day.c.filter(s=>s.crDepartmentCover&&s.name===day.cr.name).flatMap(shiftSegmentsBeforeSept21);
    const entries=baseGridDayAssignments(day);
    entries.forEach(({shift:s,dep})=>{
      if(!s.name||s.name==='SCOPERTO')return;
      const emp=S.employees.find(e=>e.name===s.name),segments=shiftSegments(s);
      const unavailable=leave(s.name,day.date)||segments.some(([a,b])=>blockedAt(s.name,day.date,toTime(a),toTime(b)));
      const skilled=baseGridSkillOk(emp,baseGridRequiredSkill(s,dep));
      if(unavailable||!skilled){s.sept21Original=s.name;s.name='SCOPERTO';s.skill+=' · '+(unavailable?'indisponibilità':'competenza da verificare');s.note=s.skill;delete s.coveredByCR}
    });
    // Nessuna sovrapposizione può essere mascherata dalle coperture del CR.
    entries.forEach(({shift:s},i)=>{
      if(s.name==='SCOPERTO')return;
      if(entries.slice(0,i).some(({shift:t})=>t.name===s.name&&shiftSegments(s).some(([a,b])=>shiftSegments(t).some(([c,d])=>a<d&&b>c)))){
        s.sept21Original=s.name;s.name='SCOPERTO';s.skill+=' · sovrapposizione da risolvere';delete s.coveredByCR;
      }
    });
  });
  pdv1ApplyOperationalClosingSupport(ds,pdv1OperationalPreviousByWeek[SEPT21_FROM]||{});
  pdv1ApplyOperationalClosingQuota(ds,pdv1OperationalPreviousByWeek[SEPT21_FROM]||{});
  baseGridAuditWeek(ds);
  const previousSaturday=PDV1_PUBLISHED_DRIVE_ROSTER['2026-09-19'];
  const priorNames=new Set([...previousSaturday.g,...previousSaturday.c].filter(r=>r[4]?.end2==='20:45'||r[2]==='20:45').map(r=>saturdayRotationName(sept21Name(r[0]))));
  saturdayRotationClosers(ds[5]).filter(x=>priorNames.has(saturdayRotationName(x.shift.name))).forEach(({shift:s})=>{s.saturdayRotationWarning={name:s.name,previousDate:'2026-09-19',reason:'eccezione per assenza del macellaio e incarichi CR'};});
  ds.baseGridAudit.saturdayRotationWarnings=saturdayRotationClosers(ds[5]).filter(x=>x.shift.saturdayRotationWarning).map(x=>x.shift.saturdayRotationWarning);
  Object.defineProperty(ds,'pdv1OperationalAudit',{value:pdv1OperationalAudit(ds),configurable:true});
  return ds;
}
const editedBeforeSept21=edited;
edited=function(ds){
  if(!ds.some(d=>d.sept21))return editedBeforeSept21(ds);
  // Conserva edit manuali, turni aggiunti, malattia e scelte sostituzione. Non riapplica
  // la rotazione generica sopra gli incarichi eccezionali richiesti per questa settimana.
  ds=editedBeforePdv1OperationalBalance(ds);
  ds=singleDayApply(applySicknessToSchedule(ds));
  return sept21Validate(ds);
};
function sept21Summary(ds){
  const audit=ds.pdv1OperationalAudit||pdv1OperationalAudit(ds),training=ds.flatMap(d=>d.g).filter(s=>s.trainingShift).reduce((n,s)=>n+dur(s),0);
  const warnings=(ds.baseGridAudit?.closeOpen||[]).map(x=>`${esc(x.name)}: ${hf(x.gap/60)} di riposo (${x.severity==='critical'?'CRITICO':'BORDERLINE'})`).join(' · ');
  const uncovered=(ds.baseGridAudit?.uncovered||[]).map(x=>`${DAYS[x.dayIndex]} ${esc(x.shift.start)}–${esc(x.shift.end)} · ${esc(x.shift.skill)}`).join('<br>');
  const crRows=ds.map((d,i)=>{const items=baseGridDayAssignments(d).filter(x=>S.employees.find(e=>e.name===x.shift.name)?.cr);return items.length?`<li>${DAYS[i]}: ${items.map(({shift:s})=>`${esc(s.start)}–${esc(s.end)}${s.start2?' / '+esc(s.start2)+'–'+esc(s.end2):''} · ${esc(s.skill||s.note)}`).join('; ')}</li>`:''}).join('');
  return`<section class="card sept21-summary"><h3>21–27 settembre · proposta eccezionale</h3><p>Turni CR da Calendar, aggiornati con le indicazioni dell’11 settembre. Riunioni fuori sede: lunedì 14:30–17:30, martedì 15:00–17:00; contano nelle ore personali, senza copertura del reparto.</p><ul>${crRows}</ul><p><b>Maia:</b> mattina del 23 libera; formazione ${hf(training)} esclusa dalle ore operative. I turni aggiuntivi contribuiscono agli straordinari personali.</p><p><b>Katia:</b> inserite 12 ore di permesso, provvisoriamente 6+6 il 23 e 24. Crediti modificabili nella gestione permessi.</p>${warnings?`<p class="bad"><b>Riposi da verificare:</b> ${warnings}. Le eccezioni non diventano regole per le altre settimane.</p>`:''}${uncovered?`<p class="bad"><b>Scoperture da gestire:</b><br>${uncovered}</p>`:''}<p>Maia in formazione e CR impegnato in Macelleria non sostituiscono una presenza autonoma in Gastro.</p><p><b>Ore da confermare:</b> resta da indicare il credito dell’assenza di Marine. Gabriele è in ferie dal 21 al 27 settembre.</p><p class="${audit.overtime.within?'ok':'bad'}">Gianmarco è escluso dal confronto: copre il full-time assente in Macelleria; le sue ore extra restano nel totale personale. Scostamento straordinari degli altri part-time: <b>${hf(audit.overtime.spread)}</b> (obiettivo 4:00). ${audit.overtime.within?'Obiettivo rispettato.':'Obiettivo non raggiunto con queste coperture: serve verificare un rinforzo.'}</p></section>`;
}
const hoursHtmlBeforeSept21=hoursHtml;
hoursHtml=function(ds){return(ds.some(d=>d.sept21)?sept21Summary(ds):'')+hoursHtmlBeforeSept21(ds)};
const syncPdvCloudBeforeSept21=syncPdvCloudAuthoritative;
syncPdvCloudAuthoritative=async function(){await syncPdvCloudBeforeSept21();if(ensureSept21State())save()};
try{if(ensureSept21State())save();render()}catch(_){}
