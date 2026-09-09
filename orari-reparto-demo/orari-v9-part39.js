// Bilanciamento operativo PDV 349: supporto alle chiusure, limite mobile
// delle chiusure e distribuzione equa degli straordinari tra part-time.
// Reparto, competenze, disponibilita' e riposi restano sempre prioritari.
const PDV1_OPERATIONAL_BALANCE_RULES={
  version:'pdv1-operational-balance-20260909-v1',
  supportedClosers:new Set(['Massimo','Maia','Gaia','Gianmarco']),
  supportStart:'14:00',
  standardWeeklyClosings:2,
  partTimeMaxHours:35,
  overtimeSpreadMaxHours:4
};
let pdv1OperationalBuildContext=null;
let pdv1OperationalPreviousByWeek={};

function pdv1OperationalBalanceActive(){return typeof pdv1Active==='function'&&pdv1Active()}
function pdv1OperationalName(value){return String(value||'').trim()}
function pdv1OperationalEmployee(name){const n=pdv1OperationalName(name).toLowerCase();return S.employees.find(e=>pdv1OperationalName(e.name).toLowerCase()===n)||null}
function pdv1OperationalWeak(name){return PDV1_OPERATIONAL_BALANCE_RULES.supportedClosers.has(pdv1OperationalName(name))}
function pdv1OperationalPartTime(employee){const h=Number(employee?.hours)||0;return Boolean(employee&&!employee.cr&&h>0&&h<=PDV1_OPERATIONAL_BALANCE_RULES.partTimeMaxHours)}
function pdv1OperationalCloseMinutes(){return mins(String(S.rules?.closingTime||'20:45'))}
function pdv1OperationalCloses(shift){const close=pdv1OperationalCloseMinutes();return shiftSegments(shift).some(([,end])=>end===close)}
function pdv1OperationalClosingStart(shift){const close=pdv1OperationalCloseMinutes(),starts=shiftSegments(shift).filter(([,end])=>end===close).map(([start])=>start);return starts.length?Math.min(...starts):null}
function pdv1OperationalDayEntries(day){const out=[];(day?.g||[]).forEach((shift,index)=>out.push({shift,dep:'g',index}));(day?.c||[]).forEach((shift,index)=>out.push({shift,dep:'c',index}));if(day?.cr)out.push({shift:day.cr,dep:'cr',index:'cr'});return out}
function pdv1OperationalClosingEntries(day,dep=''){
  return pdv1OperationalDayEntries(day).filter(x=>(!dep||x.dep===dep)&&x.dep!=='cr'&&x.shift?.name&&x.shift.name!=='SCOPERTO'&&pdv1OperationalCloses(x.shift));
}
function pdv1OperationalCountedClosingEntries(day){
  return pdv1OperationalClosingEntries(day).filter(x=>!x.shift.inventoryShift&&!pdv1OperationalEmployee(x.shift.name)?.cr);
}
function pdv1OperationalClosingCounts(out){
  const counts={};(out||[]).forEach(day=>{
    const names=new Set(pdv1OperationalCountedClosingEntries(day).map(x=>pdv1OperationalName(x.shift.name)).filter(Boolean));
    names.forEach(name=>counts[name]=(counts[name]||0)+1);
  });return counts;
}
function pdv1OperationalTarget(employee){
  let target=typeof effectiveWorkTarget==='function'?effectiveWorkTarget(employee,0):Number(employee?.hours)||0;
  if(typeof sicknessCreditHours==='function')target=Math.max(0,target-(Number(sicknessCreditHours(employee))||0));
  return Math.max(0,target);
}
function pdv1OperationalExtraFromLoad(employee,load,addedHours=0){return Math.max(0,(Number(load?.[employee.name])||0)+addedHours-pdv1OperationalTarget(employee))}
function pdv1OperationalMinimumPartTimeExtra(load){
  const values=S.employees.filter(pdv1OperationalPartTime).filter(e=>pdv1OperationalTarget(e)>0).map(e=>pdv1OperationalExtraFromLoad(e,load));
  return values.length?Math.min(...values):0;
}
function pdv1OperationalOvertimePenalty(employee,load,addedHours=0){
  if(!pdv1OperationalPartTime(employee))return 0;
  const extra=pdv1OperationalExtraFromLoad(employee,load,addedHours),minimum=pdv1OperationalMinimumPartTimeExtra(load),over=Math.max(0,extra-minimum-PDV1_OPERATIONAL_BALANCE_RULES.overtimeSpreadMaxHours);
  return extra*3+(over>0?160+over*70:0);
}

// Registra il carico progressivo del generatore, cosi' le scelte successive
// possono evitare di concentrare chiusure e ore extra sulla stessa persona.
const pushBeforePdv1OperationalBalance=push;
push=function(day,dep,shift,load,mix,period){
  const result=pushBeforePdv1OperationalBalance(day,dep,shift,load,mix,period);
  if(pdv1OperationalBuildContext&&load)pdv1OperationalBuildContext.load=load;
  return result;
};

const gastrShiftScoreBeforePdv1OperationalBalance=gastrShiftScore;
gastrShiftScore=function(employee,skill,period,load,mix){
  let score=gastrShiftScoreBeforePdv1OperationalBalance(employee,skill,period,load,mix);
  if(pdv1OperationalBalanceActive())score+=pdv1OperationalOvertimePenalty(employee,load,0);
  return score;
};

const pickExtraEmployeeBeforePdv1OperationalBalance=pickExtraEmployee;
pickExtraEmployee=function(kind,day,date,load,preferred,start,end){
  if(!pdv1OperationalBalanceActive())return pickExtraEmployeeBeforePdv1OperationalBalance(kind,day,date,load,preferred,start,end);
  let pool=kind==='g'?staff('gastronomia').filter(e=>Number(e.skills?.Servizio||0)>0):S.employees.filter(e=>!e.cr&&Number(e.skills?.Macelleria||0)>=2);
  const available=pool.filter(e=>!leave(e.name,date)&&!employeeBusy(day,e.name,start,end));
  if(preferred&&available.some(e=>e.name===preferred))return preferred;
  const hours=Math.max(0,mins(end)-mins(start))/60;
  available.sort((a,b)=>pdv1OperationalOvertimePenalty(a,load,hours)-pdv1OperationalOvertimePenalty(b,load,hours)||(load[a.name]||0)/(a.hours||1)-(load[b.name]||0)/(b.hours||1));
  return available[0]?.name||'SCOPERTO';
};

function pdv1OperationalClosingCandidateScore(employee,start,end){
  const ctx=pdv1OperationalBuildContext||{},name=employee.name,current=Number(ctx.closings?.[name]||0),previous=Number(ctx.previous?.[pdv1OperationalName(name)]||0),openings=Number(ctx.openings?.[name]||0),hours=Math.max(0,mins(end)-mins(start))/60,target=Math.max(1,pdv1OperationalTarget(employee)),ratio=((Number(ctx.load?.[name])||0)+hours)/target;
  return current*900+previous*120+openings*12+ratio*45+pdv1OperationalOvertimePenalty(employee,ctx.load,hours)+(typeof rotationRank==='function'?rotationRank(employee):0);
}
function pdv1OperationalOpeningCandidateScore(employee,start,end){
  const ctx=pdv1OperationalBuildContext||{},hours=Math.max(0,mins(end)-mins(start))/60,target=Math.max(1,pdv1OperationalTarget(employee)),ratio=((Number(ctx.load?.[employee.name])||0)+hours)/target,openings=Number(ctx.openings?.[employee.name]||0),level=Math.max(Number(employee.skills?.Forno||0),Number(employee.skills?.Ordini||0));
  return ratio*90+openings*24+pdv1OperationalOvertimePenalty(employee,ctx.load,hours)-level*4+(typeof rotationRank==='function'?rotationRank(employee):0);
}
const pickPairedRoleBeforePdv1OperationalBalance=pickPairedRole;
pickPairedRole=function(plan,role,dayIndex,lane,date,start,end,exclude=[]){
  const ctx=pdv1OperationalBuildContext;
  if(!ctx||!pdv1OperationalBalanceActive())return pickPairedRoleBeforePdv1OperationalBalance(plan,role,dayIndex,lane,date,start,end,exclude);
  if(role!=='Chiusura'){
    if(role!=='Forno'&&role!=='Ordini')return pickPairedRoleBeforePdv1OperationalBalance(plan,role,dayIndex,lane,date,start,end,exclude);
    let pool=pairedRoleCandidates(role).filter(e=>candidateAvailableForRole(e,date,start,end,exclude));
    if(!pool.length)return pickPairedRoleBeforePdv1OperationalBalance(plan,role,dayIndex,lane,date,start,end,exclude);
    pool.sort((a,b)=>pdv1OperationalOpeningCandidateScore(a,start,end)-pdv1OperationalOpeningCandidateScore(b,start,end)||Number(b.skills?.[role]||0)-Number(a.skills?.[role]||0));
    const planKey=`${role}-${lane}-${Math.floor(dayIndex/2)}`,saved=plan[planKey]&&pool.find(e=>e.name===plan[planKey]),best=pool[0];
    // Manteniamo il blocco di due giorni se non produce uno squilibrio evidente.
    const selected=saved&&pdv1OperationalOpeningCandidateScore(saved,start,end)<=pdv1OperationalOpeningCandidateScore(best,start,end)+35?saved:best;
    if(!selected)return'SCOPERTO';plan[planKey]=selected.name;ctx.openings[selected.name]=(ctx.openings[selected.name]||0)+1;return selected.name;
  }
  let pool=pairedRoleCandidates(role).filter(e=>candidateAvailableForRole(e,date,start,end,exclude));
  if(!pool.length)return pickPairedRoleBeforePdv1OperationalBalance(plan,role,dayIndex,lane,date,start,end,exclude);
  const dateKey=key(date),chosenToday=ctx.dayClosers[dateKey]||[],needsSafe=chosenToday.some(pdv1OperationalWeak)&&!chosenToday.some(name=>!pdv1OperationalWeak(name));
  if(needsSafe){const safe=pool.filter(e=>!pdv1OperationalWeak(e.name));if(safe.length)pool=safe}
  const belowLimit=pool.filter(e=>(ctx.closings[e.name]||0)<PDV1_OPERATIONAL_BALANCE_RULES.standardWeeklyClosings);
  if(belowLimit.length)pool=belowLimit;
  pool.sort((a,b)=>pdv1OperationalClosingCandidateScore(a,start,end)-pdv1OperationalClosingCandidateScore(b,start,end)||Number(b.skills?.Servizio||0)-Number(a.skills?.Servizio||0));
  const selected=pool[0];if(!selected)return'SCOPERTO';
  ctx.closings[selected.name]=(ctx.closings[selected.name]||0)+1;
  ctx.dayClosers[dateKey]=[...chosenToday,selected.name];
  plan[`Chiusura-${lane}-${Math.floor(dayIndex/2)}`]=selected.name;
  return selected.name;
};

function pdv1OperationalPreviousClosings(buildFn){
  const currentWeek=week,oldContext=pdv1OperationalBuildContext;
  try{
    week=mon(add(currentWeek,-14));pdv1OperationalBuildContext=null;
    const twoWeeksAgo=pdv1OperationalClosingCounts(buildFn());
    week=mon(add(currentWeek,-7));
    pdv1OperationalBuildContext={previous:twoWeeksAgo,closings:{},openings:{},dayClosers:{},load:null};
    return pdv1OperationalClosingCounts(buildFn());
  }catch(_){return{}}
  finally{week=currentWeek;pdv1OperationalBuildContext=oldContext}
}
function pdv1OperationalSafeCloser(employee){return Boolean(employee&&!employee.cr&&!pdv1OperationalWeak(employee.name)&&Number(employee.skills?.Servizio||0)>0)}
function pdv1OperationalCanSupport(out,index,employee,probe,ignoreNextRest=false){
  const day=out[index];if(!employee||leave(employee.name,day.date))return false;
  if(typeof blockedAt==='function'&&blockedAt(employee.name,day.date,probe.start,probe.end))return false;
  const entries=pdv1OperationalDayEntries(day).filter(x=>x.shift.name===employee.name).map(x=>x.shift);
  if(entries.some(s=>shiftSegments(s).some(([a,b])=>shiftSegments(probe).some(([u,v])=>a<v&&b>u))))return false;
  const cap=Number(typeof dailyShiftRules==='function'?dailyShiftRules().splitMaxMinutes:480)||480,scheduled=entries.reduce((total,s)=>total+(typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(s):shiftSegments(s).reduce((n,[a,b])=>n+b-a,0)),0),probeMinutes=shiftSegments(probe).reduce((n,[a,b])=>n+b-a,0);if(scheduled+probeMinutes>cap)return false;
  const rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720,start=pdv1OperationalClosingStart(probe)??mins(probe.start),end=pdv1OperationalCloseMinutes();
  if(index>0&&typeof personLastEndMinutes==='function'){const previousEnd=personLastEndMinutes(out[index-1],employee.name);if(previousEnd!=null&&(24*60-previousEnd)+start<rest)return false}
  if(!ignoreNextRest&&index<out.length-1){const starts=pdv1OperationalDayEntries(out[index+1]).filter(x=>x.shift.name===employee.name).flatMap(x=>shiftSegments(x.shift).map(([a])=>a));if(starts.length&&(24*60-end)+Math.min(...starts)<rest)return false}
  return true;
}
function pdv1OperationalNextOpeningMove(out,index,employee,probe){
  if(index>=out.length-1)return null;const next=out[index+1],rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720,end=pdv1OperationalCloseMinutes();
  const conflicts=pdv1OperationalDayEntries(next).filter(x=>x.dep!=='cr'&&x.shift.name===employee.name&&!x.shift.referenceModel&&!x.shift.publishedDriveShift&&!x.shift.inventoryShift).filter(x=>{const start=Math.min(...shiftSegments(x.shift).map(([a])=>a));return(24*60-end)+start<rest});
  if(conflicts.length!==1||pdv1OperationalCloses(conflicts[0].shift))return null;const target=conflicts[0].shift,required=typeof baseGridRequiredSkill==='function'?baseGridRequiredSkill(target,conflicts[0].dep):'Servizio',stats=people(out);
  const candidates=S.employees.filter(e=>!e.cr&&e.name!==employee.name).filter(e=>typeof baseGridSkillOk==='function'?baseGridSkillOk(e,required):Number(e.skills?.[required]||0)>0).filter(e=>{
    if(leave(e.name,next.date))return false;if(typeof blockedAt==='function'&&shiftSegments(target).some(([a,b])=>blockedAt(e.name,next.date,toTime(a),toTime(b))))return false;
    return typeof saturdayRotationCanAssign!=='function'||saturdayRotationCanAssign(out,index+1,e,target,[]);
  }).sort((a,b)=>{const pa=stats.find(x=>x.name===a.name),pb=stats.find(x=>x.name===b.name),hours=dur(target),ar=((pa?.worked||0)+hours)/Math.max(1,pa?.workTarget??a.hours),br=((pb?.worked||0)+hours)/Math.max(1,pb?.workTarget??b.hours);return ar-br||pdv1OperationalOvertimePenalty(a,Object.fromEntries(stats.map(x=>[x.name,x.worked])),hours)-pdv1OperationalOvertimePenalty(b,Object.fromEntries(stats.map(x=>[x.name,x.worked])),hours)});
  return candidates[0]?{shift:target,replacement:candidates[0],old:employee.name}:null;
}
function pdv1OperationalSupportCandidate(out,index,previous){
  const day=out[index],probe={start:PDV1_OPERATIONAL_BALANCE_RULES.supportStart,end:toTime(pdv1OperationalCloseMinutes()),skill:'Supporto chiusura Gastronomia',pause:15},stats=people(out),counts=pdv1OperationalClosingCounts(out),hours=dur(probe);
  const rank=(a,b)=>{
    const pa=stats.find(x=>x.name===a.name),pb=stats.find(x=>x.name===b.name),ae=Math.max(0,(pa?.worked||0)+hours-(pa?.workTarget??a.hours)),be=Math.max(0,(pb?.worked||0)+hours-(pb?.workTarget??b.hours));
    const ac=counts[pdv1OperationalName(a.name)]||0,bc=counts[pdv1OperationalName(b.name)]||0,ap=previous[pdv1OperationalName(a.name)]||0,bp=previous[pdv1OperationalName(b.name)]||0;
    return (ac>=2?1:0)-(bc>=2?1:0)||ae-be||ac-bc||ap-bp||(typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0);
  };
  const safe=staff('gastronomia').filter(pdv1OperationalSafeCloser),strict=safe.filter(e=>pdv1OperationalCanSupport(out,index,e,probe)).sort(rank)[0];if(strict)return{employee:strict,nextMove:null};
  const movable=safe.filter(e=>pdv1OperationalCanSupport(out,index,e,probe,true)).map(e=>({employee:e,nextMove:pdv1OperationalNextOpeningMove(out,index,e,probe)})).filter(x=>x.nextMove).sort((a,b)=>rank(a.employee,b.employee));
  return movable[0]||null;
}
function pdv1OperationalCanAssignIgnoring(out,index,employee,shift,ignore=[]){
  const day=out[index];if(!employee||employee.cr||leave(employee.name,day.date))return false;
  if(typeof blockedAt==='function'&&shiftSegments(shift).some(([a,b])=>blockedAt(employee.name,day.date,toTime(a),toTime(b))))return false;
  if(typeof saturdayRotationCanAssign==='function')return saturdayRotationCanAssign(out,index,employee,shift,ignore);
  const ignored=new Set(ignore),others=pdv1OperationalDayEntries(day).map(x=>x.shift).filter(s=>!ignored.has(s)&&s.name===employee.name);
  return !others.some(s=>shiftSegments(s).some(([a,b])=>shiftSegments(shift).some(([u,v])=>a<v&&b>u)));
}
function pdv1OperationalDeepSupportPlan(out,index,previous){
  const day=out[index],closers=pdv1OperationalClosingEntries(day,'g'),weak=closers.filter(x=>pdv1OperationalWeak(x.shift.name));if(!weak.length)return null;
  const target=weak.slice().sort((a,b)=>(pdv1OperationalClosingStart(b.shift)||0)-(pdv1OperationalClosingStart(a.shift)||0))[0],counts=pdv1OperationalClosingCounts(out),entries=pdv1OperationalDayEntries(day);
  const plans=[];
  entries.filter(x=>x.dep==='g'&&!pdv1OperationalCloses(x.shift)&&!x.shift.inventoryShift&&!x.shift.trainingShift).forEach(source=>{
    const closer=pdv1OperationalEmployee(source.shift.name);if(!pdv1OperationalSafeCloser(closer))return;
    if(!pdv1OperationalCanAssignIgnoring(out,index,closer,target.shift,[source.shift]))return;
    const required=typeof baseGridRequiredSkill==='function'?baseGridRequiredSkill(source.shift,source.dep):'Servizio';
    S.employees.filter(e=>!e.cr&&e.name!==closer.name).filter(e=>typeof baseGridSkillOk==='function'?baseGridSkillOk(e,required):Number(e.skills?.[required]||0)>0).forEach(replacement=>{
      const own=entries.filter(x=>x.shift.name===replacement.name).map(x=>x.shift),ignore=own.filter(s=>s===target.shift||(!pdv1OperationalCloses(s)&&!s.inventoryShift&&!s.trainingShift&&/servizio|rinforzo|copertura/i.test(String(s.skill||s.note||''))));
      if(own.some(s=>!ignore.includes(s)))return;if(!pdv1OperationalCanAssignIgnoring(out,index,replacement,source.shift,ignore))return;
      const closeCount=counts[pdv1OperationalName(closer.name)]||0,previousCount=previous[pdv1OperationalName(closer.name)]||0,targetBonus=replacement.name===target.shift.name?-20:0;
      plans.push({target,source,closer,replacement,remove:ignore.filter(s=>s!==target.shift),score:(closeCount>=2?500:0)+closeCount*60+previousCount*12+targetBonus});
    });
  });
  return plans.sort((a,b)=>a.score-b.score||(typeof rotationRank==='function'?rotationRank(a.closer)-rotationRank(b.closer):0))[0]||null;
}
function pdv1OperationalApplyDeepSupportPlan(day,plan){
  if(!plan)return false;plan.remove.forEach(shift=>{day.g=day.g.filter(s=>s!==shift);day.c=day.c.filter(s=>s!==shift)});
  const oldSource=plan.source.shift.name;plan.source.shift.name=plan.replacement.name;plan.source.shift.openingBalanceAdjusted={old:oldSource,newName:plan.replacement.name};pdv1OperationalAppendShiftText(plan.source.shift,`turno riequilibrato per liberare il supporto di chiusura (${pdv1OperationalName(oldSource)})`);
  const oldClose=plan.target.shift.name;plan.target.shift.name=plan.closer.name;plan.target.shift.start=PDV1_OPERATIONAL_BALANCE_RULES.supportStart;delete plan.target.shift.start2;delete plan.target.shift.end2;plan.target.shift.pause=15;plan.target.shift.closingSupportAdjusted={mode:'riassetto',old:oldClose};pdv1OperationalAppendShiftText(plan.target.shift,`supporto chiusura non-CR al posto di ${pdv1OperationalName(oldClose)}`);
  return true;
}
function pdv1OperationalAppendShiftText(shift,text){
  const field=shift.skill?'skill':(shift.note?'note':'skill'),current=String(shift[field]||'Turno');if(!current.includes(text))shift[field]=current+' · '+text;
}
function pdv1OperationalSupportIssue(day,reason,weak=[]){
  const issue={date:key(day.date),reason,weak:weak.map(x=>pdv1OperationalName(x.shift.name))};
  weak.forEach(x=>{x.shift.closingSupportWarning=issue;pdv1OperationalAppendShiftText(x.shift,'ATTENZIONE: supporto chiusura non conforme')});
  day.closingSupportIssue=issue;return issue;
}
function pdv1ApplyOperationalClosingSupport(out,previous){
  (out||[]).forEach((day,index)=>{
    if(day.holiday?.type==='closed')return;
    let closers=pdv1OperationalClosingEntries(day,'g'),weak=closers.filter(x=>pdv1OperationalWeak(x.shift.name));if(!weak.length)return;
    const immutable=Boolean(day.referenceModel||day.publishedDriveRoster);
    let safe=closers.filter(x=>pdv1OperationalSafeCloser(pdv1OperationalEmployee(x.shift.name)));
    const earlyWeak=weak.filter(x=>(pdv1OperationalClosingStart(x.shift)??1440)<=13*60+30);
    if(!safe.length&&!immutable){
      const candidatePlan=pdv1OperationalSupportCandidate(out,index,previous),candidate=candidatePlan?.employee;
      if(candidate){
        if(candidatePlan.nextMove){const move=candidatePlan.nextMove;move.shift.name=move.replacement.name;move.shift.openingBalanceAdjusted={old:move.old,newName:move.replacement.name};pdv1OperationalAppendShiftText(move.shift,`apertura riequilibrata dopo chiusura di ${pdv1OperationalName(move.old)}`)}
        const replace=weak.slice().sort((a,b)=>(pdv1OperationalClosingStart(b.shift)||0)-(pdv1OperationalClosingStart(a.shift)||0))[0];
        if(closers.length>=2&&replace){
          const old=replace.shift.name;replace.shift.name=candidate.name;replace.shift.start=PDV1_OPERATIONAL_BALANCE_RULES.supportStart;delete replace.shift.start2;delete replace.shift.end2;replace.shift.pause=15;replace.shift.closingSupportAdjusted={mode:'sostituzione',old};pdv1OperationalAppendShiftText(replace.shift,`supporto chiusura non-CR al posto di ${pdv1OperationalName(old)}`);
        }else{
          const shift={name:candidate.name,start:PDV1_OPERATIONAL_BALANCE_RULES.supportStart,end:toTime(pdv1OperationalCloseMinutes()),skill:'Supporto chiusura Gastronomia · esigenza reparto',pause:15,closingSupportAdjusted:{mode:'aggiunta'}};day.g.push(shift);
        }
        closers=pdv1OperationalClosingEntries(day,'g');weak=closers.filter(x=>pdv1OperationalWeak(x.shift.name));safe=closers.filter(x=>pdv1OperationalSafeCloser(pdv1OperationalEmployee(x.shift.name)));
      }
      if(!safe.length&&pdv1OperationalApplyDeepSupportPlan(day,pdv1OperationalDeepSupportPlan(out,index,previous))){closers=pdv1OperationalClosingEntries(day,'g');weak=closers.filter(x=>pdv1OperationalWeak(x.shift.name));safe=closers.filter(x=>pdv1OperationalSafeCloser(pdv1OperationalEmployee(x.shift.name)))}
    }
    if(!safe.length){pdv1OperationalSupportIssue(day,'manca un addetto esperto non-CR in chiusura',weak);return}
    if(earlyWeak.length){
      let timely=safe.find(x=>(pdv1OperationalClosingStart(x.shift)??1440)<=mins(PDV1_OPERATIONAL_BALANCE_RULES.supportStart));
      if(!timely&&!immutable){
        const adjustable=safe.find(x=>!x.shift.start2&&pdv1OperationalClosingStart(x.shift)!=null);
        if(adjustable){adjustable.shift.start=PDV1_OPERATIONAL_BALANCE_RULES.supportStart;adjustable.shift.pause=15;adjustable.shift.closingSupportAdjusted={mode:'anticipo'};pdv1OperationalAppendShiftText(adjustable.shift,'supporto anticipato alle 14:00');timely=adjustable}
      }
      if(!timely){pdv1OperationalSupportIssue(day,'con chiusurista dalle 13:30 il supporto non-CR deve entrare entro le 14:00',earlyWeak);return}
    }
    weak.forEach(x=>x.shift.closingSupportedBy=pdv1OperationalName(safe[0].shift.name));
  });
  return out;
}
function pdv1OperationalClosingTeamValid(day,target,candidateName){
  const entries=pdv1OperationalClosingEntries(day,'g').map(x=>({shift:x.shift,name:x.shift===target?candidateName:x.shift.name})),weak=entries.filter(x=>pdv1OperationalWeak(x.name));if(!weak.length)return true;
  const safe=entries.filter(x=>pdv1OperationalSafeCloser(pdv1OperationalEmployee(x.name)));if(!safe.length)return false;
  const early=weak.some(x=>(pdv1OperationalClosingStart(x.shift)??1440)<=13*60+30);if(!early)return true;
  return safe.some(x=>(pdv1OperationalClosingStart(x.shift)??1440)<=mins(PDV1_OPERATIONAL_BALANCE_RULES.supportStart))||safe.some(x=>!x.shift.start2&&pdv1OperationalClosingStart(x.shift)!=null);
}
function pdv1OperationalCanTakeClosing(out,index,employee,target){
  const day=out[index];if(!employee||employee.cr||Number(employee.skills?.Servizio||0)<=0||leave(employee.name,day.date))return false;
  if(typeof blockedAt==='function'&&shiftSegments(target).some(([start,end])=>blockedAt(employee.name,day.date,toTime(start),toTime(end))))return false;
  if(typeof saturdayRotationCanAssign==='function'&&!saturdayRotationCanAssign(out,index,employee,target,[]))return false;
  else if(typeof employeeBusy==='function'&&employeeBusy(day,employee.name,target.start,target.end))return false;
  return pdv1OperationalClosingTeamValid(day,target,employee.name);
}
function pdv1RebalanceOperationalClosings(out,previous){
  if(!(out||[]).length)return out;let passes=0;
  while(passes++<18){
    const counts=pdv1OperationalClosingCounts(out),high=Object.entries(counts).filter(([,count])=>count>PDV1_OPERATIONAL_BALANCE_RULES.standardWeeklyClosings).sort((a,b)=>b[1]-a[1])[0];if(!high)break;
    const [highName]=high,targets=[];
    out.forEach((day,index)=>{if(day.referenceModel||day.publishedDriveRoster||day.date.getDay()===6||day.date.getDay()===0)return;pdv1OperationalCountedClosingEntries(day).filter(x=>pdv1OperationalName(x.shift.name)===highName).forEach(x=>targets.push({...x,day,index}))});
    targets.sort((a,b)=>b.index-a.index);let moved=false;
    for(const target of targets){
      const candidates=S.employees.filter(e=>!e.cr&&Number(e.skills?.Servizio||0)>0&&(counts[pdv1OperationalName(e.name)]||0)<PDV1_OPERATIONAL_BALANCE_RULES.standardWeeklyClosings).filter(e=>pdv1OperationalCanTakeClosing(out,target.index,e,target.shift));
      const stats=people(out),hours=dur(target.shift);
      candidates.sort((a,b)=>{
        const pa=stats.find(x=>x.name===a.name),pb=stats.find(x=>x.name===b.name),ae=Math.max(0,(pa?.worked||0)+hours-(pa?.workTarget??a.hours)),be=Math.max(0,(pb?.worked||0)+hours-(pb?.workTarget??b.hours));
        const ac=counts[pdv1OperationalName(a.name)]||0,bc=counts[pdv1OperationalName(b.name)]||0,ap=previous[pdv1OperationalName(a.name)]||0,bp=previous[pdv1OperationalName(b.name)]||0;
        return ae-be||ac-bc||ap-bp||(typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0);
      });
      if(!candidates.length)continue;const old=target.shift.name;target.shift.name=candidates[0].name;target.shift.closingBalanceAdjusted={old,newName:candidates[0].name};pdv1OperationalAppendShiftText(target.shift,`chiusure riequilibrate: ${pdv1OperationalName(candidates[0].name)} al posto di ${pdv1OperationalName(old)}`);moved=true;break;
    }
    if(!moved)break;
  }
  return out;
}
function pdv1OperationalSkillOk(employee,shift,dep){
  const required=typeof baseGridRequiredSkill==='function'?baseGridRequiredSkill(shift,dep):'Servizio';
  return typeof baseGridSkillOk==='function'?baseGridSkillOk(employee,required):Number(employee?.skills?.[required]||0)>0;
}
function pdv1ResolveOperationalCloseOpen(out){
  if(!(out||[]).length)return out;const rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
  for(let index=1;index<out.length;index++){
    const day=out[index];if(day.referenceModel||day.publishedDriveRoster||day.holiday?.type==='closed')continue;
    const names=[...new Set(pdv1OperationalDayEntries(day).map(x=>x.shift.name).filter(n=>n&&n!=='SCOPERTO'&&!pdv1OperationalEmployee(n)?.cr))];
    names.forEach(name=>{
      const previousEnd=typeof personLastEndMinutes==='function'?personLastEndMinutes(out[index-1],name):null;if(previousEnd==null)return;
      const own=pdv1OperationalDayEntries(day).filter(x=>x.shift.name===name),first=Math.min(...own.flatMap(x=>shiftSegments(x.shift).map(([a])=>a)));if(!Number.isFinite(first)||(24*60-previousEnd)+first>=rest)return;
      const target=own.find(x=>shiftSegments(x.shift).some(([a])=>a===first));if(!target||pdv1OperationalCloses(target.shift)||target.shift.inventoryShift||target.shift.trainingShift)return;
      const oldEmployee=pdv1OperationalEmployee(name);if(!oldEmployee)return;
      const swaps=pdv1OperationalDayEntries(day).filter(x=>x.dep===target.dep&&x.shift!==target.shift&&!pdv1OperationalCloses(x.shift)&&x.shift.name&&x.shift.name!=='SCOPERTO').map(x=>({...x,employee:pdv1OperationalEmployee(x.shift.name)})).filter(x=>x.employee&&!x.employee.cr&&pdv1OperationalSkillOk(x.employee,target.shift,target.dep)&&pdv1OperationalSkillOk(oldEmployee,x.shift,x.dep)).filter(x=>pdv1OperationalCanAssignIgnoring(out,index,x.employee,target.shift,[target.shift,x.shift])&&pdv1OperationalCanAssignIgnoring(out,index,oldEmployee,x.shift,[target.shift,x.shift])).sort((a,b)=>pdv1OperationalClosingStart(b.shift)-pdv1OperationalClosingStart(a.shift));
      if(swaps.length){const swap=swaps[0],other=swap.shift.name;target.shift.name=other;swap.shift.name=name;target.shift.closeOpenBalanced={old:name,newName:other,mode:'scambio'};swap.shift.closeOpenBalanced={old:other,newName:name,mode:'scambio'};pdv1OperationalAppendShiftText(target.shift,`apertura riequilibrata dopo chiusura (${pdv1OperationalName(name)})`);pdv1OperationalAppendShiftText(swap.shift,`turno spostato per evitare chiusura-apertura (${pdv1OperationalName(name)})`);return}
      const candidates=S.employees.filter(e=>!e.cr&&e.name!==name&&pdv1OperationalSkillOk(e,target.shift,target.dep)).filter(e=>pdv1OperationalCanAssignIgnoring(out,index,e,target.shift,[])).sort((a,b)=>{
        const load=Object.fromEntries(people(out).map(p=>[p.name,p.worked]));return pdv1OperationalOvertimePenalty(a,load,dur(target.shift))-pdv1OperationalOvertimePenalty(b,load,dur(target.shift))||(typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0);
      });
      if(candidates.length){const replacement=candidates[0];target.shift.name=replacement.name;target.shift.closeOpenBalanced={old:name,newName:replacement.name,mode:'sostituzione'};pdv1OperationalAppendShiftText(target.shift,`apertura riequilibrata dopo chiusura (${pdv1OperationalName(name)})`)}
    });
  }
  return out;
}
function pdv1OperationalExtraSpread(rows){const values=rows.map(x=>Number(x.extra)||0);return values.length?Math.max(...values)-Math.min(...values):0}
function pdv1BalanceOperationalPartTimeOvertime(out){
  let passes=0;
  while(passes++<12){
    const stats=people(out),partTimes=stats.filter(p=>pdv1OperationalPartTime(p)&&Number(p.workTarget)>0),currentSpread=pdv1OperationalExtraSpread(partTimes);if(currentSpread<=PDV1_OPERATIONAL_BALANCE_RULES.overtimeSpreadMaxHours+.01)break;
    const counts=pdv1OperationalClosingCounts(out),highs=partTimes.filter(p=>p.extra>0).sort((a,b)=>b.extra-a.extra),moves=[];
    highs.forEach(high=>{
      (out||[]).forEach((day,index)=>{
        if(day.referenceModel||day.publishedDriveRoster||day.date.getDay()===6||day.date.getDay()===0)return;
        pdv1OperationalCountedClosingEntries(day).filter(x=>x.shift.name===high.name&&!x.shift.inventoryShift).forEach(target=>{
          partTimes.filter(low=>low.name!==high.name&&(counts[pdv1OperationalName(low.name)]||0)<PDV1_OPERATIONAL_BALANCE_RULES.standardWeeklyClosings&&pdv1OperationalSkillOk(low,target.shift,target.dep)).filter(low=>pdv1OperationalCanTakeClosing(out,index,low,target.shift)).forEach(low=>{
            const hours=dur(target.shift),after=partTimes.map(p=>{let worked=Number(p.worked)||0;if(p.name===high.name)worked-=hours;if(p.name===low.name)worked+=hours;return{...p,extra:Math.max(0,worked-(Number(p.workTarget)||0)),missing:Math.max(0,(Number(p.workTarget)||0)-worked)}}),highAfter=after.find(p=>p.name===high.name),spread=pdv1OperationalExtraSpread(after);
            if((highAfter?.missing||0)>.75||spread>=currentSpread-.01)return;moves.push({target,day,index,high,low,spread,missing:highAfter?.missing||0});
          });
        });
      });
    });
    moves.sort((a,b)=>a.spread-b.spread||a.missing-b.missing||(a.index-b.index));const move=moves[0];if(!move)break;
    move.target.shift.name=move.low.name;move.target.shift.overtimeBalanceAdjusted={old:move.high.name,newName:move.low.name};pdv1OperationalAppendShiftText(move.target.shift,`straordinario PT riequilibrato: ${pdv1OperationalName(move.low.name)} al posto di ${pdv1OperationalName(move.high.name)}`);
  }
  return out;
}
function pdv1ApplyOperationalClosingQuota(out,previous){
  const counts=pdv1OperationalClosingCounts(out),byName={};
  (out||[]).forEach(day=>pdv1OperationalCountedClosingEntries(day).forEach(entry=>{delete entry.shift.closingQuotaWarning;const n=pdv1OperationalName(entry.shift.name);(byName[n]||(byName[n]=[])).push({day,shift:entry.shift})}));
  Object.entries(byName).forEach(([name,entries])=>entries.slice(PDV1_OPERATIONAL_BALANCE_RULES.standardWeeklyClosings).forEach(({day,shift},index)=>{
    const warning={name,date:key(day.date),weekly:counts[name]||0,previous:previous[name]||0,number:PDV1_OPERATIONAL_BALANCE_RULES.standardWeeklyClosings+1+index};shift.closingQuotaWarning=warning;
    pdv1OperationalAppendShiftText(shift,`${warning.number}a chiusura · eccezione esigenze reparto`);
  }));
  return counts;
}
function pdv1OperationalPartTimeAudit(out){
  const rows=people(out).filter(p=>pdv1OperationalPartTime(p)&&Number(p.workTarget)>0).map(p=>({name:pdv1OperationalName(p.name),extra:Number(p.extra)||0}));
  const values=rows.map(x=>x.extra),minimum=values.length?Math.min(...values):0,maximum=values.length?Math.max(...values):0,spread=Math.max(0,maximum-minimum);
  return{rows,minimum,maximum,spread,within:spread<=PDV1_OPERATIONAL_BALANCE_RULES.overtimeSpreadMaxHours};
}
function pdv1OperationalAudit(out,previous=pdv1OperationalPreviousByWeek[key(week)]||{}){
  const supportIssues=(out||[]).filter(day=>day.closingSupportIssue).map(day=>day.closingSupportIssue),closingCounts=pdv1OperationalClosingCounts(out),thirdClosings=Object.entries(closingCounts).filter(([,count])=>count>PDV1_OPERATIONAL_BALANCE_RULES.standardWeeklyClosings).map(([name,count])=>({name,count,previous:previous[name]||0})),overtime=pdv1OperationalPartTimeAudit(out);
  return{supportIssues,closingCounts,thirdClosings,overtime,previous};
}

const buildBeforePdv1OperationalBalance=build;
build=function(){
  if(!pdv1OperationalBalanceActive())return buildBeforePdv1OperationalBalance();
  const previous=pdv1OperationalPreviousClosings(buildBeforePdv1OperationalBalance),weekKey=key(week);pdv1OperationalPreviousByWeek[weekKey]=previous;
  const oldContext=pdv1OperationalBuildContext;pdv1OperationalBuildContext={previous,closings:{},openings:{},dayClosers:{},load:null};
  let out;try{out=buildBeforePdv1OperationalBalance()}finally{pdv1OperationalBuildContext=oldContext}
  pdv1ApplyOperationalClosingSupport(out,previous);pdv1RebalanceOperationalClosings(out,previous);pdv1ApplyOperationalClosingSupport(out,previous);pdv1ResolveOperationalCloseOpen(out);pdv1BalanceOperationalPartTimeOvertime(out);pdv1ApplyOperationalClosingSupport(out,previous);pdv1ApplyOperationalClosingQuota(out,previous);
  try{Object.defineProperty(out,'pdv1OperationalAudit',{value:pdv1OperationalAudit(out,previous),configurable:true})}catch(_){out.pdv1OperationalAudit=pdv1OperationalAudit(out,previous)}
  return out;
};

// Modifiche manuali, assenze e rotazione del sabato vengono applicate dopo build():
// aggiorniamo quindi i controlli anche sull'orario che l'utente vede davvero.
const editedBeforePdv1OperationalBalance=edited;
edited=function(ds){
  ds=editedBeforePdv1OperationalBalance(ds);if(!pdv1OperationalBalanceActive())return ds;
  const previous=pdv1OperationalPreviousByWeek[key(week)]||{};
  pdv1ApplyOperationalClosingSupport(ds,previous);pdv1RebalanceOperationalClosings(ds,previous);pdv1ApplyOperationalClosingSupport(ds,previous);pdv1ResolveOperationalCloseOpen(ds);pdv1BalanceOperationalPartTimeOvertime(ds);pdv1ApplyOperationalClosingSupport(ds,previous);pdv1ApplyOperationalClosingQuota(ds,previous);
  const audit=pdv1OperationalAudit(ds,previous);try{Object.defineProperty(ds,'pdv1OperationalAudit',{value:audit,configurable:true})}catch(_){ds.pdv1OperationalAudit=audit}
  return ds;
};

if(typeof absencePlannerCandidates==='function'){
  const absencePlannerCandidatesBeforePdv1OperationalBalance=absencePlannerCandidates;
  absencePlannerCandidates=function(ds,item){
    const options=absencePlannerCandidatesBeforePdv1OperationalBalance(ds,item),hours=typeof absencePlannerShiftMinutes==='function'?absencePlannerShiftMinutes(item)/60:Math.max(0,mins(item.end)-mins(item.start))/60,stats=people(ds),minimum=Math.min(...stats.filter(p=>pdv1OperationalPartTime(p)&&Number(p.workTarget)>0).map(p=>Number(p.extra)||0),0);
    return options.sort((a,b)=>{
      const tierA=(a.rest.ok?0:100)+(a.sameDept?0:10)+(3-a.level),tierB=(b.rest.ok?0:100)+(b.sameDept?0:10)+(3-b.level);if(tierA!==tierB)return tierA-tierB;
      const pa=stats.find(x=>x.name===a.employee.name),pb=stats.find(x=>x.name===b.employee.name),ae=Math.max(0,(pa?.worked||0)+hours-(pa?.workTarget??a.employee.hours)),be=Math.max(0,(pb?.worked||0)+hours-(pb?.workTarget??b.employee.hours));
      const af=pdv1OperationalPartTime(a.employee)?Math.max(0,ae-minimum-PDV1_OPERATIONAL_BALANCE_RULES.overtimeSpreadMaxHours):0,bf=pdv1OperationalPartTime(b.employee)?Math.max(0,be-minimum-PDV1_OPERATIONAL_BALANCE_RULES.overtimeSpreadMaxHours):0;
      return af-bf||ae-be||a.score-b.score;
    });
  };
}

function pdv1OperationalShiftNote(shift){
  if(shift?.closingSupportWarning)return`BORDERLINE · ${shift.closingSupportWarning.reason}`;
  if(shift?.closingQuotaWarning){const x=shift.closingQuotaWarning;return`BORDERLINE · ${x.number}a chiusura nella settimana${x.previous?` · ${x.previous} nella precedente`:''}`}
  if(shift?.closingSupportAdjusted?.mode==='anticipo')return'Supporto chiusura · ingresso anticipato alle 14:00';
  if(shift?.closingSupportAdjusted)return'Supporto chiusura esperto non-CR';
  if(shift?.closingBalanceAdjusted)return`Chiusure riequilibrate · al posto di ${pdv1OperationalName(shift.closingBalanceAdjusted.old)}`;
  if(shift?.closeOpenBalanced)return`Apertura/chiusura riequilibrata · al posto di ${pdv1OperationalName(shift.closeOpenBalanced.old)}`;
  if(shift?.overtimeBalanceAdjusted)return`Straordinario part-time riequilibrato · al posto di ${pdv1OperationalName(shift.overtimeBalanceAdjusted.old)}`;
  if(shift?.closingSupportedBy)return`Supporto chiusura: ${shift.closingSupportedBy}`;
  return'';
}
const shiftRowBeforePdv1OperationalBalance=shiftRow;
shiftRow=function(shift,date,dep,index){
  let html=shiftRowBeforePdv1OperationalBalance(shift,date,dep,index),note=pdv1OperationalShiftNote(shift);if(!note)return html;
  const warning=Boolean(shift.closingSupportWarning||shift.closingQuotaWarning),cls=warning?'operational-balance-warning':'operational-balance-ok';
  html=html.replace('class="shift',`class="shift ${cls}`);
  return html.replace('</div><div class="time">',`<small class="operational-balance-note">${esc(note)}</small></div><div class="time">`);
};

function pdv1OperationalSummaryHtml(ds){
  const audit=ds.pdv1OperationalAudit||pdv1OperationalAudit(ds),maxClosing=Math.max(0,...Object.values(audit.closingCounts)),history=Object.entries(audit.closingCounts).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])).map(([name,count])=>`<span><b>${esc(name)}</b> ${count} / ${Number(audit.previous?.[name]||0)}</span>`).join(''),fixed=(ds||[]).some(day=>day.referenceModel||day.publishedDriveRoster);
  return`<div class="operational-balance-summary"><div class="${audit.supportIssues.length?'bad':'ok'}"><b>${audit.supportIssues.length}</b><small>supporti chiusura da verificare</small></div><div class="${maxClosing>2?'warn':'ok'}"><b>${maxClosing}</b><small>massimo chiusure per persona</small></div><div class="${audit.overtime.within?'ok':'warn'}"><b>${hf(audit.overtime.spread)}</b><small>differenza extra tra part-time</small></div></div><div class="operational-closing-history"><b>Chiusure questa settimana / precedente</b>${history||'<span>Nessuna chiusura assegnata</span>'}${fixed?'<small>Il turno pubblicato da Drive viene controllato ma non modificato automaticamente.</small>':''}</div>`;
}
if(typeof baseGridPanelHtml==='function'){
  const baseGridPanelHtmlBeforePdv1OperationalBalance=baseGridPanelHtml;
  baseGridPanelHtml=function(ds){
    let html=baseGridPanelHtmlBeforePdv1OperationalBalance(ds);if(!pdv1OperationalBalanceActive())return html;
    return html.replace('<div class="base-grid-summary">',pdv1OperationalSummaryHtml(ds)+'<div class="base-grid-summary">');
  };
}
const hoursHtmlBeforePdv1OperationalBalance=hoursHtml;
hoursHtml=function(ds){
  let html=hoursHtmlBeforePdv1OperationalBalance(ds);if(!pdv1OperationalBalanceActive())return html;
  const audit=ds.pdv1OperationalAudit||pdv1OperationalAudit(ds),fixed=(ds||[]).some(day=>day.referenceModel||day.publishedDriveRoster),note=`<div class="part-time-overtime-note ${audit.overtime.within?'ok':'warning'}"><b>Straordinari part-time · differenza ${hf(audit.overtime.spread)}</b><span>${fixed?'Rilevazione sull’orario Drive: il pubblicato resta invariato. La nuova redistribuzione opera sulle settimane generate.':`Obiettivo: massimo ${hf(PDV1_OPERATIONAL_BALANCE_RULES.overtimeSpreadMaxHours)} tra il valore piu alto e il piu basso. Le esigenze e le competenze restano prioritarie.`}</span></div>`;
  return html.replace('<div class="scroll">',note+'<div class="scroll">');
};

if(typeof generalRulesPanel==='function'){
  const generalRulesPanelBeforePdv1OperationalBalance=generalRulesPanel;
  generalRulesPanel=function(){
    const html=generalRulesPanelBeforePdv1OperationalBalance(),extra=`<div class="req"><span>Chiusure settimanali</span><b>2 ordinarie · 3a solo per esigenza, considerando la settimana precedente</b></div><div class="req"><span>Supporto chiusura</span><b>Massimo, Maia o Gianmarco in Gastro → esperto non-CR; se partono 13:30, supporto entro 14:00</b></div><div class="req"><span>Straordinari part-time</span><b>distribuzione equa · differenza obiettivo massimo 4 ore</b></div>`,i=html.lastIndexOf('</div>');
    return i>=0?html.slice(0,i)+extra+html.slice(i):html+extra;
  };
}

(function installPdv1OperationalBalanceStyles(){
  if(document.getElementById('pdv1OperationalBalanceStyles'))return;const style=document.createElement('style');style.id='pdv1OperationalBalanceStyles';
  style.textContent=`.operational-balance-summary{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:9px 0}.operational-balance-summary>div{display:grid;gap:2px;padding:8px;border-radius:9px;background:#f7fafc;border:1px solid #d7e0e7}.operational-balance-summary b{font-size:1.05rem}.operational-balance-summary small{font-size:.75rem}.operational-closing-history{display:flex;flex-wrap:wrap;align-items:center;gap:6px;margin:8px 0;padding:8px;border-radius:9px;background:#f7fafc;border:1px solid #d7e0e7}.operational-closing-history>span{padding:3px 6px;border-radius:7px;background:#fff;font-size:.74rem}.operational-closing-history>small{flex-basis:100%;color:#5d6670}.operational-balance-note{display:block;margin-top:5px;padding:4px 7px;border-radius:8px;background:#eaf6ef;color:#205c3a;font-size:.72rem;font-weight:800;line-height:1.3}.operational-balance-warning{border-left:4px solid #d46a00}.operational-balance-warning .operational-balance-note{background:#fff1dd;color:#7b3c00}.part-time-overtime-note{display:grid;gap:2px;margin:9px 0;padding:9px;border-radius:10px;background:#edf7f1;border:1px solid #bad7c5}.part-time-overtime-note.warning{background:#fff1dd;border-color:#e0b06f;color:#7b3c00}.part-time-overtime-note span{font-size:.76rem}@media(max-width:720px){.operational-balance-summary{grid-template-columns:1fr}}`;
  document.head.appendChild(style);
})();

try{if(view==='schedule')schedule()}catch(_){}
