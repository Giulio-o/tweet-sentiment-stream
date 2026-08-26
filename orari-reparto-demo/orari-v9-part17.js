const PDV1_GABRIELE_MORNING_DATES=new Set(['2026-09-11','2026-09-12']);
function pdv1EmployeeByName(name){return (S.employees||[]).find(e=>String(e.name||'').trim()===name)||null}
function pdv1ShiftSkillOk(employee,shift){
  if(!employee||!shift)return false;
  const skill=typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(shift):'Servizio';
  if(skill==='Macelleria')return Number(employee.skills?.Macelleria||0)>=2;
  if(skill==='Pescheria')return Number(employee.skills?.Pescheria||0)>=2;
  if(skill==='Forno'||skill==='Ordini')return Number(employee.skills?.[skill]||0)>=2;
  return Number(employee.skills?.Servizio||0)>0;
}
function pdv1ReplacementForForcedMorning(day,shift,excluded=[]){
  const skill=typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(shift):'Servizio';
  let pool=(S.employees||[]).filter(e=>!e.cr&&!excluded.includes(String(e.name||'').trim())&&pdv1ShiftSkillOk(e,shift));
  if(skill==='Pescheria')pool.sort((a,b)=>Number(b.skills?.Pescheria||0)-Number(a.skills?.Pescheria||0));
  else if(skill==='Macelleria')pool.sort((a,b)=>Number(b.skills?.Macelleria||0)-Number(a.skills?.Macelleria||0));
  else pool.sort((a,b)=>typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0);
  return pool.find(e=>{
    if(leave(e.name,day.date))return false;
    if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,shift.start,shift.end))return false;
    return typeof pdv1PersonBusy!=='function'||!pdv1PersonBusy(day,e.name,shift.start,shift.end,shift);
  })?.name||'SCOPERTO';
}
function applyPdv1GabrieleMorning(out){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return out;
  const targetName='Gabriele',targetEmployee=pdv1EmployeeByName(targetName);if(!targetEmployee)return out;
  out.forEach(day=>{
    const date=key(day.date);if(!PDV1_GABRIELE_MORNING_DATES.has(date)||day.holiday?.type==='closed')return;
    day.c=day.c||[];day.g=day.g||[];
    let morning=day.c.find(s=>String(s.skill||'').toLowerCase().includes('macelleria')&&s.start&&mins(s.start)<12*60);
    if(!morning){
      morning={name:'SCOPERTO',start:'06:30',end:'13:30',skill:'Macelleria mattina',pause:15,pdv1Rule:true};
      day.c.push(morning);
    }
    const displaced=morning.name&&morning.name!=='SCOPERTO'&&morning.name!==targetName?morning.name:'';
    const otherGabriele=[...day.g,...day.c].filter(s=>s!==morning&&String(s.name||'').trim()===targetName);
    morning.name=targetName;morning.start='06:30';morning.end='13:30';morning.pause=15;delete morning.start2;delete morning.end2;
    morning.skill='Macelleria mattina · Gabriele fissato 11/12 settembre';morning.manualConstraint=true;
    otherGabriele.forEach((s,index)=>{
      const displacedEmployee=displaced?pdv1EmployeeByName(String(displaced).trim()):null;
      const canSwap=displacedEmployee&&pdv1ShiftSkillOk(displacedEmployee,s)&&!leave(displacedEmployee.name,day.date)&&(!(typeof blockedAt==='function')||!blockedAt(displacedEmployee.name,day.date,s.start,s.end))&&(!(typeof pdv1PersonBusy==='function')||!pdv1PersonBusy(day,displacedEmployee.name,s.start,s.end,s));
      s.name=canSwap?displacedEmployee.name:pdv1ReplacementForForcedMorning(day,s,[targetName]);
      s.skill=String(s.skill||'Turno')+' · ricalcolato per Gabriele mattina';s.manualRecalc=true;
    });
  });
  return out;
}
const buildBeforeGabrieleMorning=build;
build=function(){return applyPdv1GabrieleMorning(buildBeforeGabrieleMorning())};
try{render()}catch(_){}
