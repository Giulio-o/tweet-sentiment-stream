// Regole generali parametrizzate: indipendenti dagli orari specifici dei singoli PDV.
const GENERAL_SHIFT_DEFAULTS={
  singleMaxMinutes:7*60,
  splitMaxMinutes:8*60,
  splitReturnMinMinutes:2*60+30,
  longShiftPauseMinutes:15,
  minimumRestMinutes:12*60
};
function generalShiftRules(){
  pdvDb.generalShiftRules={...GENERAL_SHIFT_DEFAULTS,...(pdvDb.generalShiftRules||{})};
  return pdvDb.generalShiftRules;
}
function personLastEndMinutes(day,name){
  if(!day||!name)return null;const all=[...(day.g||[]),...(day.c||[])];if(day.cr)all.push(day.cr);
  const ends=[];all.filter(s=>s.name===name).forEach(s=>shiftSegments(s).forEach(([,b])=>ends.push(b)));
  return ends.length?Math.max(...ends):null;
}
function earliestStartNextDay(prevEnd){
  const rest=Number(generalShiftRules().minimumRestMinutes)||12*60;
  if(prevEnd==null)return 0;return (prevEnd+rest)%(24*60);
}
function genericRestReplacement(out,index,shift,exclude=[]){
  const day=out[index],skill=typeof pdv1RequiredSkill==='function'?pdv1RequiredSkill(shift):'Servizio';
  let pool=[];
  if(skill==='Macelleria')pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.Macelleria||0)>=2);
  else if(skill==='Pescheria')pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.Pescheria||0)>=1);
  else if(skill==='Forno'||skill==='Ordini')pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.[skill]||0)>=2);
  else pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.Servizio||0)>0);
  return pool.filter(e=>!exclude.includes(e.name)&&!leave(e.name,day.date)&&(!(typeof blockedAt==='function')||!blockedAt(e.name,day.date,shift.start,shift.end))&&(!(typeof pdv1PersonBusy==='function')||!pdv1PersonBusy(day,e.name,shift.start,shift.end,shift))).sort((a,b)=>(typeof rotationRank==='function'?rotationRank(a)-rotationRank(b):0))[0]?.name||'SCOPERTO';
}
function applyGeneralMinimumRest(out){
  const rest=Number(generalShiftRules().minimumRestMinutes)||12*60;
  for(let i=1;i<out.length;i++){
    const prev=out[i-1],day=out[i];
    ['g','c'].forEach(dep=>(day[dep]||[]).forEach(s=>{
      if(!s?.name||s.name==='SCOPERTO')return;
      const prevEnd=personLastEndMinutes(prev,s.name);if(prevEnd==null)return;
      const actualGap=(24*60-prevEnd)+mins(s.start);if(actualGap>=rest)return;
      const old=s.name,exclude=[...new Set([...(day.g||[]),...(day.c||[])].map(x=>x.name))];
      s.name=genericRestReplacement(out,i,s,exclude);
      s.skill=String(s.skill||'Turno')+` · riposo minimo ${hf(rest/60)} (${old})`;
      s.generalRestRule=true;
    }));
    if(day.cr){
      const prevEnd=personLastEndMinutes(prev,day.cr.name);if(prevEnd!=null){const actualGap=(24*60-prevEnd)+mins(day.cr.start);if(actualGap<rest){day.cr.note=String(day.cr.note||'CR')+` · ATTENZIONE riposo ${hf(actualGap/60)} < ${hf(rest/60)}`;day.cr.generalRestWarning=true}}
    }
  }
  return out;
}
const buildBeforeGeneralMinimumRest=build;
build=function(){return applyGeneralMinimumRest(buildBeforeGeneralMinimumRest())};

// I limiti turno/spezzato del vecchio profilo 349 ora leggono i valori generali.
if(typeof pdv1349Metrics==='function'){
  pdv1349Metrics=function(s){
    const r=generalShiftRules(),first=pdv1349MinutesBetween(s?.start,s?.end),second=pdv1349MinutesBetween(s?.start2,s?.end2),split=Boolean(s?.start2&&s?.end2),pause=Math.max(0,Number(s?.pause)||0);
    if(split){const scheduled=first+second;return{split:true,scheduledMinutes:scheduled,effectiveMinutes:Math.max(0,scheduled-pause),overtimeMinutes:Math.max(0,scheduled-(Number(r.splitMaxMinutes)||480)),returnMinutes:second,returnTooShort:second>0&&second<(Number(r.splitReturnMinMinutes)||150)}}
    const effective=Math.max(0,first-pause);return{split:false,scheduledMinutes:first,effectiveMinutes:effective,overtimeMinutes:Math.max(0,effective-(Number(r.singleMaxMinutes)||420)),returnMinutes:0,returnTooShort:false};
  };
}

function generalRulesPanel(){const r=generalShiftRules();return`<div class="card"><h3>Regole generali turni</h3><p class="muted">Valgono per tutti i PDV. Gli orari di apertura, chiusura e mansione restano invece specifici del singolo punto vendita.</p><div class="grid"><label>Turno unico max (ore)<input id="genSingleMax" type="number" min="1" step="0.25" value="${r.singleMaxMinutes/60}"></label><label>Spezzato max (ore)<input id="genSplitMax" type="number" min="1" step="0.25" value="${r.splitMaxMinutes/60}"></label><label>Rientro minimo (ore)<input id="genReturnMin" type="number" min="0.5" step="0.25" value="${r.splitReturnMinMinutes/60}"></label><label>Pausa turno lungo (min)<input id="genPause" type="number" min="0" step="5" value="${r.longShiftPauseMinutes}"></label><label>Riposo minimo tra turni (ore)<input id="genRest" type="number" min="8" step="0.25" value="${r.minimumRestMinutes/60}"></label></div><div class="req"><span>Esempio dinamico</span><b>chiude 20:45 → non prima di ${(()=>{const m=(20*60+45+r.minimumRestMinutes)%(24*60);return String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0')})()}</b></div></div>`}
const pdvRulesPageBeforeGeneralStructured=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeGeneralStructured();const form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;actions?.insertAdjacentHTML('beforebegin',generalRulesPanel());
};
const savePdvRulesBeforeGeneralStructured=savePdvRules;
savePdvRules=function(e,id){
  const g=generalShiftRules(),read=(sel,fallback)=>{const el=document.getElementById(sel);return el?Number(el.value):fallback};
  if(document.getElementById('genSingleMax')){
    g.singleMaxMinutes=Math.round(read('genSingleMax',g.singleMaxMinutes/60)*60);
    g.splitMaxMinutes=Math.round(read('genSplitMax',g.splitMaxMinutes/60)*60);
    g.splitReturnMinMinutes=Math.round(read('genReturnMin',g.splitReturnMinMinutes/60)*60);
    g.longShiftPauseMinutes=Math.round(read('genPause',g.longShiftPauseMinutes));
    g.minimumRestMinutes=Math.round(read('genRest',g.minimumRestMinutes/60)*60);
    pdvDb.generalShiftRules=g;persistPdvDb();
  }
  return savePdvRulesBeforeGeneralStructured(e,id);
};

// Corregge il testo del profilo PDV1: 08:45 e' derivato, non una regola autonoma del negozio.
const pdvRulesPageBeforeRestLabel=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeRestLabel();if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return;
  [...document.querySelectorAll('#app .card p.muted')].forEach(p=>{if(String(p.textContent||'').includes('20:45 non può iniziare prima delle 08:45'))p.innerHTML='Il <b>riposo minimo tra turni</b> è una regola generale. Nel PDV 349, con chiusura alle 20:45 e riposo generale di 12h, l’entrata minima risultante è 08:45.'});
};
try{generalShiftRules();render()}catch(_){}
