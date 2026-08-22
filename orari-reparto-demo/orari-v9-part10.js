const PDV1_OPERATIONAL_DEFAULTS={
  nextDayAfter2045:'08:45',
  gastro:{morningCounts:[4,3,3,3,4,4],handoffStart:'13:30',handoffAlt:'14:00',crCloseThirdStart:'17:00',fishFriday:true,fishSaturday:true},
  carni:{morningStart:['06:30','07:00','06:30','07:00','06:30','06:30'],morningEnd:['13:30','13:15','13:30','13:15','13:30','13:30'],thursdayPrepStart:'15:00',thursdayPrepEnd:'17:30',fullDayDays:[4,5],fullDayAfternoonStart:'13:30',fullDayEnd:'20:00'}
};
function pdv1Active(){return typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'}
function pdv1Ops(state=S){
  const saved=state?.rules?.pdv1Operational||{};
  return{
    ...PDV1_OPERATIONAL_DEFAULTS,...saved,
    gastro:{...PDV1_OPERATIONAL_DEFAULTS.gastro,...(saved.gastro||{})},
    carni:{...PDV1_OPERATIONAL_DEFAULTS.carni,...(saved.carni||{})}
  };
}
function pdv1CrName(){return S.employees.find(e=>e.cr)?.name||''}
function pdv1CrCloses(day){
  if(!day?.cr)return false;
  return shiftSegments(day.cr).some(([,b])=>b===mins('20:45'));
}
function pdv1PreviousLateClosers(out,index){
  if(index<=0)return new Set();
  const prev=out[index-1],crName=pdv1CrName(),set=new Set(),all=[...(prev.g||[]),...(prev.c||[])];if(prev.cr)all.push(prev.cr);
  all.forEach(s=>{if(!s?.name||s.name==='SCOPERTO'||s.name===crName)return;const seg=shiftSegments(s);if(seg.some(([,b])=>b===mins('20:45')))set.add(s.name)});
  return set;
}
function pdv1PersonBusy(day,name,start,end,ignore=null){
  const a=mins(start),b=mins(end),all=[...(day.g||[]),...(day.c||[])];if(day.cr)all.push(day.cr);
  return all.some(s=>s!==ignore&&s.name===name&&shiftSegments(s).some(([x,y])=>a<y&&b>x));
}
function pdv1CanUse(e,day,start,end,ignore=null){
  if(!e||leave(e.name,day.date))return false;
  if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,start,end))return false;
  return !pdv1PersonBusy(day,e.name,start,end,ignore);
}
function pdv1MorningNames(day){
  const names=new Set();
  (day.g||[]).forEach(s=>{if(s.name&&s.name!=='SCOPERTO'&&shiftSegments(s).some(([a,b])=>a<12*60&&b>8*60))names.add(s.name)});
  if(day.cr&&day.cr.name&&shiftSegments(day.cr).some(([a,b])=>a<12*60&&b>8*60))names.add(day.cr.name);
  return names;
}
function pdv1AddMorningCoverage(day,index,target){
  let names=pdv1MorningNames(day);
  while(names.size<target){
    const pool=staff('gastronomia').filter(e=>Number(e.skills?.Servizio||0)>0&&!names.has(e.name)&&pdv1CanUse(e,day,'09:30','13:30')).sort((a,b)=>rotationRank(a)-rotationRank(b));
    const e=pool[0];
    if(!e){day.g.push({name:'SCOPERTO',start:'09:30',end:'13:30',skill:'Copertura mattina PDV 1',pause:0,pdv1Rule:true});break}
    day.g.push({name:e.name,start:'09:30',end:'13:30',skill:'Copertura mattina PDV 1',pause:0,pdv1Rule:true});names.add(e.name)
  }
}
function pdv1EnsureFish(day,index,out){
  if(index!==4&&index!==5)return;
  if((day.c||[]).some(s=>String(s.skill||'').toLowerCase().includes('pesce')))return;
  const start='06:30',end='13:30',late=pdv1PreviousLateClosers(out,index),crName=pdv1CrName();
  const pool=S.employees.filter(e=>Number(e.skills?.Pescheria||0)>0&&(!late.has(e.name)||e.name===crName)&&pdv1CanUse(e,day,start,end)).sort((a,b)=>Number(b.skills?.Pescheria||0)-Number(a.skills?.Pescheria||0)||rotationRank(a)-rotationRank(b));
  const name=pool[0]?.name||'SCOPERTO';
  day.c.push({name,start,end,skill:index===5?'Vendita pesce · sabato':'Vendita pesce · Gastronomia',pause:15,pdv1Rule:true});
}
function pdv1TuneGastroEvening(day){
  const ops=pdv1Ops(),closers=(day.g||[]).filter(s=>String(s.end||'')==='20:45'&&String(s.skill||'').includes('Chiusura'));
  if(!closers.length)return;
  closers[0].start=ops.gastro.handoffStart||'13:30';closers[0].pause=hrs(closers[0].start,'20:45')>6?15:0;closers[0].pdv1Handoff=true;
  if(pdv1CrCloses(day)&&closers[1]){closers[1].start=ops.gastro.crCloseThirdStart||'17:00';closers[1].pause=0;closers[1].skill='Chiusura · terzo addetto con CR';closers[1].pdv1CrClose=true}
}
function pdv1ButcherMorning(day,index){
  return (day.c||[]).find(s=>String(s.skill||'').includes('Macelleria')&&s.start&&mins(s.start)<12*60);
}
function pdv1EnsureButcherMorning(day,index){
  const ops=pdv1Ops(),start=ops.carni.morningStart[index],end=ops.carni.morningEnd[index];if(index>5||!start||!end)return;
  let s=pdv1ButcherMorning(day,index);
  if(!s){
    const pool=staff('carni').filter(e=>Number(e.skills?.Macelleria||0)>=2&&pdv1CanUse(e,day,start,end)).sort((a,b)=>Number(b.skills?.Macelleria||0)-Number(a.skills?.Macelleria||0));
    s={name:pool[0]?.name||'SCOPERTO',start,end,skill:'Macelleria',pause:hrs(start,end)>6?15:0,pdv1Rule:true};day.c.push(s)
  }else{s.start=start;s.end=end;s.pause=hrs(start,end)>6?15:0}
  if(index===3){s.start2=ops.carni.thursdayPrepStart||'15:00';s.end2=ops.carni.thursdayPrepEnd||'17:30';s.skill='Macelleria · rientro preparazione banco servito venerdì';s.pdv1ThursdayPrep=true}
}
function pdv1ReplacementForGastrShift(day,shift,excluded=[]){
  const skill=String(shift.skill||'');let pool=staff('gastronomia').filter(e=>!excluded.includes(e.name));
  if(skill.includes('Forno'))pool=pool.filter(e=>Number(e.skills?.Forno||0)>=2);
  else if(skill.includes('Ordini'))pool=pool.filter(e=>Number(e.skills?.Ordini||0)>=2);
  else pool=pool.filter(e=>Number(e.skills?.Servizio||0)>0);
  return pool.filter(e=>pdv1CanUse(e,day,shift.start,shift.end,shift)).sort((a,b)=>rotationRank(a)-rotationRank(b))[0]?.name||'SCOPERTO';
}
function pdv1FreeMacelleriaBackup(day,name,start,end){
  (day.g||[]).filter(s=>s.name===name&&shiftSegments(s).some(([a,b])=>mins(start)<b&&mins(end)>a)).forEach(s=>{s.name=pdv1ReplacementForGastrShift(day,s,[name]);s.skill=String(s.skill||'Turno')+' · riassegnato per copertura Carni'});
}
function pdv1EnsureCarniFullDay(day,index){
  const ops=pdv1Ops();if(!ops.carni.fullDayDays.includes(index))return;
  const start=ops.carni.fullDayAfternoonStart||'13:30',end=ops.carni.fullDayEnd||'20:00',morning=pdv1ButcherMorning(day,index),morningName=morning?.name||'';
  day.c=(day.c||[]).filter(s=>!(String(s.skill||'').includes('Macelleria pomeriggio')||String(s.skill||'').includes('Macelleria sera PDV 1')));
  let pool=S.employees.filter(e=>!e.cr&&e.name!==morningName&&Number(e.skills?.Macelleria||0)>=2).sort((a,b)=>(a.dept==='carni'?0:1)-(b.dept==='carni'?0:1)||Number(b.skills?.Macelleria||0)-Number(a.skills?.Macelleria||0));
  let e=pool.find(x=>!leave(x.name,day.date)&&(!(typeof blockedAt==='function')||!blockedAt(x.name,day.date,start,end)));
  if(e){pdv1FreeMacelleriaBackup(day,e.name,start,end)}
  if(!e||pdv1PersonBusy(day,e.name,start,end)){
    const cr=S.employees.find(x=>x.cr&&Number(x.skills?.Macelleria||0)>=2&&pdv1CanUse(x,day,start,end));if(cr)e=cr
  }
  const name=e&&!pdv1PersonBusy(day,e.name,start,end)?e.name:'SCOPERTO';
  day.c.push({name,start,end,skill:index===5?'Macelleria sera PDV 1 · preparazione libero servizio domenica':'Macelleria sera PDV 1 · copertura continuativa',pause:hrs(start,end)>6?15:0,pdv1Rule:true});
}
function pdv1RequiredSkill(shift){
  const s=String(shift.skill||'').toLowerCase();if(s.includes('forno'))return'Forno';if(s.includes('ordini'))return'Ordini';if(s.includes('pesce'))return'Pescheria';if(s.includes('macelleria'))return'Macelleria';return'Servizio';
}
function pdv1RestReplacement(day,shift,dep,late){
  const skill=pdv1RequiredSkill(shift),crName=pdv1CrName();let pool=[];
  if(skill==='Macelleria')pool=S.employees.filter(e=>Number(e.skills?.Macelleria||0)>=2);
  else if(skill==='Pescheria')pool=staff('gastronomia').filter(e=>Number(e.skills?.Pescheria||0)>0);
  else pool=staff('gastronomia').filter(e=>Number(e.skills?.[skill]||0)>0);
  const autonomous=(skill==='Forno'||skill==='Ordini')?pool.filter(e=>Number(e.skills?.[skill]||0)>=2):pool;if(autonomous.length)pool=autonomous;
  const e=pool.filter(x=>(!late.has(x.name)||x.name===crName)&&pdv1CanUse(x,day,shift.start,shift.end,shift)).sort((a,b)=>rotationRank(a)-rotationRank(b))[0];
  return e?.name||'SCOPERTO';
}
function pdv1EnforceNextDayRest(out){
  const crName=pdv1CrName(),limit=mins(pdv1Ops().nextDayAfter2045||'08:45');
  for(let i=1;i<out.length;i++){
    const day=out[i],late=pdv1PreviousLateClosers(out,i);
    ['g','c'].forEach(dep=>(day[dep]||[]).forEach(s=>{if(!s?.name||s.name==='SCOPERTO'||s.name===crName||!late.has(s.name)||mins(s.start)>=limit)return;const old=s.name;s.name=pdv1RestReplacement(day,s,dep,late);s.skill=String(s.skill||'Turno')+` · riposo dopo chiusura (${old})`;s.restRule=true}));
  }
  return out;
}
function applyPdv1OperationalProfile(out){
  if(!pdv1Active())return out;const ops=pdv1Ops();
  out.forEach((day,index)=>{
    if(index>5||day.holiday?.type==='closed')return;
    pdv1EnsureButcherMorning(day,index);
    pdv1EnsureCarniFullDay(day,index);
    pdv1EnsureFish(day,index,out);
    pdv1AddMorningCoverage(day,index,Number(ops.gastro.morningCounts[index])||0);
    pdv1TuneGastroEvening(day);
  });
  return pdv1EnforceNextDayRest(out);
}
const buildBeforePdv1OperationalProfile=build;
build=function(){return applyPdv1OperationalProfile(buildBeforePdv1OperationalProfile())};

const pdvRulesPageBeforePdv1Ops=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforePdv1Ops();const p=pdvDb.pdvs.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p||p.id!=='PDV_001')return;
  const ops=pdv1Ops(normalizePdvState(p.state)),form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;
  const html=`<div class="card"><h3>Profilo operativo PDV 1</h3><p class="muted">Regole ricavate dall'orario tipo del negozio. Sono applicate solo a PDV 1.</p><div class="req"><span>Lunedì mattina · Gastro/Forno</span><b>4</b></div><div class="req"><span>Martedì–Giovedì mattina · Gastro/Forno</span><b>3</b></div><div class="req"><span>Venerdì mattina · Gastro/Forno + Pesce</span><b>4 + 1</b></div><div class="req"><span>Sabato mattina · Gastro/Forno + Pesce</span><b>4 + 1</b></div><div class="grid" style="margin-top:10px"><label>Aggancio serale preferito<select id="pdv1Handoff"><option value="13:30" ${ops.gastro.handoffStart==='13:30'?'selected':''}>13:30</option><option value="14:00" ${ops.gastro.handoffStart==='14:00'?'selected':''}>14:00</option></select></label><label>Terzo addetto quando chiude il CR<input value="17:00" readonly></label></div><hr><div class="req"><span>Macellaio mattina lun/mer/ven</span><b>06:30</b></div><div class="req"><span>Macellaio mattina mar/gio</span><b>07:00</b></div><div class="req"><span>Giovedì · rientro preparazione venerdì</span><b>15:00–17:30</b></div><div class="req"><span>Venerdì Carni · copertura</span><b>06:30–20:00</b></div><div class="req"><span>Sabato Carni · copertura + prep domenica</span><b>06:30–20:00</b></div><p class="muted" style="margin-top:10px">Vincolo duro: chi termina alle 20:45 non può iniziare prima delle 08:45 il giorno successivo. Eccezione CR.</p><p class="muted"><b>Sabato Gastro/Forno:</b> ho fissato 4 mattina + 1 Pesce; non ho inventato una diversa ora di uscita dei turni lunghi perché dalla foto non è abbastanza leggibile. Appena mi dai gli orari esatti li fissiamo.</p></div>`;
  actions?.insertAdjacentHTML('beforebegin',html);
};
const savePdvRulesBeforePdv1Ops=savePdvRules;
savePdvRules=function(e,id){
  const handoff=String(document.getElementById('pdv1Handoff')?.value||'');savePdvRulesBeforePdv1Ops(e,id);if(id!=='PDV_001'||!handoff)return;
  const p=pdvDb.pdvs.find(x=>x.id===id);if(!p)return;p.state=normalizePdvState(p.state);const ops=pdv1Ops(p.state);ops.gastro.handoffStart=handoff;p.state.rules.pdv1Operational=ops;p.updatedAt=pdvNow();if(id===currentPdvId()){S.rules.pdv1Operational=ops}persistPdvDb();save();
};
try{render()}catch(_){}
