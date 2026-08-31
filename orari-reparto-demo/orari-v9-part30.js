// Regola generale: più turni nello stesso giorno sono ammessi solo come spezzato entro il massimo giornaliero.
function dayWorkerEntries(day,name){
  const out=[];(day.g||[]).forEach(s=>{if(s.name===name)out.push({s,dep:'g'})});(day.c||[]).forEach(s=>{if(s.name===name)out.push({s,dep:'c'})});return out;
}
function dayWorkerScheduled(day,name){return dayWorkerEntries(day,name).reduce((a,x)=>a+(typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(x.s):Math.max(0,mins(x.s.end)-mins(x.s.start))),0)}
function dailyCapSkillOk(e,shift){
  const skill=typeof generalRequiredSkill==='function'?generalRequiredSkill(shift):(typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(shift):'Servizio'),v=Number(e.skills?.[skill]||0);
  if(skill==='Forno'||skill==='Ordini'||skill==='Macelleria')return v>=2;if(skill==='Pescheria')return v>=1;return Number(e.skills?.Servizio||0)>0;
}
function dailyCapCandidate(out,index,shift,oldName){
  const day=out[index],cap=Number(typeof dailyShiftRules==='function'?dailyShiftRules().splitMaxMinutes:480)||480,rest=Number(typeof generalShiftRules==='function'?generalShiftRules().minimumRestMinutes:720)||720;
  const seg=typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(shift):Math.max(0,mins(shift.end)-mins(shift.start));
  const stats=typeof people==='function'?people(out):[];
  return S.employees.filter(e=>!e.cr&&e.name!==oldName&&dailyCapSkillOk(e,shift)).filter(e=>{
    if(leave(e.name,day.date))return false;if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,shift.start,shift.end))return false;
    if(typeof employeeBusy==='function'&&employeeBusy(day,e.name,shift.start,shift.end))return false;
    if(dayWorkerScheduled(day,e.name)+seg>cap)return false;
    if(index>0&&typeof personLastEndMinutes==='function'){
      const pe=personLastEndMinutes(out[index-1],e.name);if(pe!=null&&((24*60-pe)+mins(shift.start))<rest)return false;
    }
    return true;
  }).sort((a,b)=>{
    const sa=stats.find(x=>x.name===a.name),sb=stats.find(x=>x.name===b.name),ar=sa?.workTarget?sa.worked/Math.max(1,sa.workTarget):sa?.worked||0,br=sb?.workTarget?sb.worked/Math.max(1,sb.workTarget):sb?.worked||0;
    const ak=String(a.name||'').trim()==='Katia'?0.2:0,bk=String(b.name||'').trim()==='Katia'?0.2:0;
    return (ar+ak)-(br+bk)||(typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0)
  })[0]||null;
}
function applyDailyMultiShiftCap(out){
  const cap=Number(typeof dailyShiftRules==='function'?dailyShiftRules().splitMaxMinutes:480)||480;
  out.forEach((day,index)=>{
    if(day.referenceModel)return; // l'orario pubblicato 7-13 settembre resta identico al modello reale.
    const names=[...new Set([...(day.g||[]),...(day.c||[])].map(s=>s.name).filter(n=>n&&n!=='SCOPERTO'))];
    names.forEach(name=>{
      let entries=dayWorkerEntries(day,name),total=entries.reduce((a,x)=>a+(typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(x.s):0),0);
      while(entries.length>1&&total>cap){
        // Conserva il turno principale più lungo e sposta prima il segmento più corto.
        entries.sort((a,b)=>(typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(a.s)-shiftScheduledMinutes(b.s):0));
        const target=entries[0],old=target.s.name,candidate=dailyCapCandidate(out,index,target.s,old);
        target.s.name=candidate?.name||'SCOPERTO';target.s.skill=String(target.s.skill||'Turno')+` · riequilibrato: max ${hf(cap/60)}/giorno (${old})`;target.s.dailyCapRule=true;
        entries=dayWorkerEntries(day,name);total=entries.reduce((a,x)=>a+(typeof shiftScheduledMinutes==='function'?shiftScheduledMinutes(x.s):0),0);
      }
    });
  });
  return out;
}
const buildBeforeDailyMultiShiftCap=build;
build=function(){return applyDailyMultiShiftCap(buildBeforeDailyMultiShiftCap())};

const pdvRulesBeforeDailyCap=pdvRulesPage;
pdvRulesPage=function(){pdvRulesBeforeDailyCap();const form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;const cap=Number(typeof dailyShiftRules==='function'?dailyShiftRules().splitMaxMinutes:480)||480;actions?.insertAdjacentHTML('beforebegin',`<div class="card"><h3>Controllo giornata addetto</h3><div class="req"><span>Più segmenti nello stesso giorno</span><b>solo spezzato ≤ ${hf(cap/60)}</b></div><small class="muted">Se due assegnazioni portano la persona oltre il massimo giornaliero, il segmento più corto viene riassegnato. Se non esiste un sostituto compatibile, compare SCOPERTO.</small></div>`)};
try{render()}catch(_){}
