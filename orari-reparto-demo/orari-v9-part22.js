// PDV 1 / 349: Massimo, Maia (Gaia) e Gianmarco non possono essere gli unici addetti in chiusura.
const PDV1_WEAK_CLOSERS=new Set(['Massimo','Maia','Gaia','Gianmarco']);

function pdv1ClosingShifts(day){
  const shifts=[...(day.g||[]),...(day.c||[])];
  if(day.cr)shifts.push(day.cr);
  return shifts.filter(s=>String(s.end||'')==='20:45' || String(s.end2||'')==='20:45');
}

function pdv1SafeCloserCandidate(out,index,shift,exclude=[]){
  const day=out[index];
  const pool=(typeof staff==='function'?staff('gastronomia'):S.employees.filter(e=>!e.cr&&e.dept==='gastronomia'))
    .filter(e=>!PDV1_WEAK_CLOSERS.has(String(e.name||'').trim()))
    .filter(e=>Number(e.skills?.Servizio||0)>0)
    .filter(e=>!exclude.includes(e.name))
    .filter(e=>{
      if(leave(e.name,day.date))return false;
      if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,shift.start,shift.end))return false;
      if(typeof pdv1AvailableAdvanced==='function')return pdv1AvailableAdvanced(out,index,e,shift.start,shift.end,shift);
      return typeof pdv1PersonBusy!=='function'||!pdv1PersonBusy(day,e.name,shift.start,shift.end,shift);
    });
  pool.sort((a,b)=>{
    const ar=typeof rotationRank==='function'?rotationRank(a):0;
    const br=typeof rotationRank==='function'?rotationRank(b):0;
    return ar-br||Number(b.skills?.Servizio||0)-Number(a.skills?.Servizio||0);
  });
  return pool[0]||null;
}

function applyPdv1SafeClosingTeam(out){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return out;
  out.forEach((day,index)=>{
    if(index>5||day.holiday?.type==='closed')return;
    const closers=pdv1ClosingShifts(day).filter(s=>s.name&&s.name!=='SCOPERTO');
    if(!closers.length)return;
    const hasSafeCloser=closers.some(s=>!PDV1_WEAK_CLOSERS.has(String(s.name||'').trim()));
    if(hasSafeCloser)return;

    // Tutti i chiusuristi appartengono al gruppo Massimo/Maia/Gianmarco: sostituiamo uno di loro.
    const target=[...closers].reverse().find(s=>PDV1_WEAK_CLOSERS.has(String(s.name||'').trim()));
    if(!target)return;
    const exclude=closers.map(s=>s.name);
    const replacement=pdv1SafeCloserCandidate(out,index,target,exclude);
    if(replacement){
      const old=target.name;
      target.name=replacement.name;
      target.skill=String(target.skill||'Chiusura')+` · regola squadra chiusura (al posto di ${old})`;
      target.safeClosingRule=true;
    }else{
      target.closingTeamWarning=true;
      target.skill=String(target.skill||'Chiusura')+' · ATTENZIONE: manca un altro addetto esperto in chiusura';
    }
  });
  return out;
}

const buildBeforeSafeClosingTeam=build;
build=function(){return applyPdv1SafeClosingTeam(buildBeforeSafeClosingTeam())};
try{render()}catch(_){}
