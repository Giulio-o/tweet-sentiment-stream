// Regole generali giornaliere: niente doppio lungo mattina+sera e limiti di presenza del turno unico.
GENERAL_SHIFT_DEFAULTS.singlePresenceMaxMinutes=7*60+15;   // 7:15 di presenza con 15 min pausa = 7:00 effettive
GENERAL_SHIFT_DEFAULTS.splitRequiredAfterMinutes=7*60+30;  // oltre 7:30 la giornata deve essere spezzata

function dailyShiftRules(){
  const r=generalShiftRules();
  r.singlePresenceMaxMinutes=Number(r.singlePresenceMaxMinutes)||GENERAL_SHIFT_DEFAULTS.singlePresenceMaxMinutes;
  r.splitRequiredAfterMinutes=Number(r.splitRequiredAfterMinutes)||GENERAL_SHIFT_DEFAULTS.splitRequiredAfterMinutes;
  return r;
}
function shiftScheduledMinutes(s){
  if(!s?.start||!s?.end)return 0;
  return Math.max(0,mins(s.end)-mins(s.start))+(s.start2&&s.end2?Math.max(0,mins(s.end2)-mins(s.start2)):0);
}
function isMorningLongShift(s){
  if(!s?.start||s.start2)return false;
  const len=shiftScheduledMinutes(s);
  return mins(s.start)<12*60&&mins(s.end)<=14*60&&len>=6*60;
}
function isEveningLongShift(s){
  if(!s?.start||s.start2)return false;
  const len=shiftScheduledMinutes(s);
  return mins(s.start)>=12*60&&mins(s.end)>=18*60&&len>=6*60;
}
function generalRequiredSkill(shift){
  if(typeof pdv1RequiredSkill==='function')return pdv1RequiredSkill(shift);
  const t=String(shift?.skill||'').toLowerCase();
  if(t.includes('forno'))return'Forno';if(t.includes('ordini'))return'Ordini';if(t.includes('macelleria'))return'Macelleria';if(t.includes('pesc'))return'Pescheria';return'Servizio';
}
function generalDailyCandidate(out,index,shift,oldName){
  const day=out[index],skill=generalRequiredSkill(shift);
  let pool=S.employees.filter(e=>!e.cr&&e.name!==oldName);
  if(skill==='Forno'||skill==='Ordini'||skill==='Macelleria')pool=pool.filter(e=>Number(e.skills?.[skill]||0)>=2);
  else if(skill==='Pescheria')pool=pool.filter(e=>Number(e.skills?.Pescheria||0)>=1);
  else pool=pool.filter(e=>Number(e.skills?.Servizio||0)>0);
  return pool.filter(e=>{
    if(leave(e.name,day.date))return false;
    if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,shift.start,shift.end))return false;
    if(typeof pdv1PersonBusy==='function'&&pdv1PersonBusy(day,e.name,shift.start,shift.end,shift))return false;
    if(typeof employeeBusy==='function'&&employeeBusy(day,e.name,shift.start,shift.end))return false;
    if(index>0&&typeof personLastEndMinutes==='function'){
      const prevEnd=personLastEndMinutes(out[index-1],e.name),rest=Number(dailyShiftRules().minimumRestMinutes)||720;
      if(prevEnd!=null&&((24*60-prevEnd)+mins(shift.start))<rest)return false;
    }
    const same=[...(day.g||[]),...(day.c||[])].filter(s=>s!==shift&&s.name===e.name);
    if(day.cr?.name===e.name)same.push(day.cr);
    if(isEveningLongShift(shift)&&same.some(isMorningLongShift))return false;
    if(isMorningLongShift(shift)&&same.some(isEveningLongShift))return false;
    return true;
  }).sort((a,b)=>{
    const ar=typeof rotationRank==='function'?rotationRank(a):0,br=typeof rotationRank==='function'?rotationRank(b):0;
    return ar-br||Number(b.skills?.[skill]||0)-Number(a.skills?.[skill]||0);
  })[0]||null;
}
function applyGeneralDailyShiftRules(out){
  const r=dailyShiftRules(),singlePresence=Number(r.singlePresenceMaxMinutes)||435,splitThreshold=Number(r.splitRequiredAfterMinutes)||450;
  out.forEach((day,index)=>{
    const all=[...(day.g||[]).map(s=>({s,dep:'g'})),...(day.c||[]).map(s=>({s,dep:'c'}))];
    // Turno unico: 7:15 di presenza ordinaria; tra 7:15 e 7:30 solo eccezione/straordinario; oltre 7:30 spezzato obbligatorio.
    all.forEach(({s})=>{
      if(!s?.start||s.start2)return;
      const scheduled=shiftScheduledMinutes(s),text=String(s.skill||'Turno');
      s.generalSinglePresenceOver=scheduled>singlePresence;
      s.generalMustBeSplit=scheduled>splitThreshold;
      if(s.generalMustBeSplit&&!text.includes('deve essere spezzato'))s.skill=text+' · oltre 7:30: deve essere spezzato';
      else if(s.generalSinglePresenceOver&&!text.includes('oltre 7:15'))s.skill=text+' · oltre 7:15: eccezione/straordinario';
    });
    // La stessa persona non può fare un lungo mattutino e un lungo serale nello stesso giorno.
    const names=[...new Set(all.map(x=>x.s?.name).filter(n=>n&&n!=='SCOPERTO'))];
    names.forEach(name=>{
      const own=all.filter(x=>x.s.name===name),morning=own.filter(x=>isMorningLongShift(x.s)),evening=own.filter(x=>isEveningLongShift(x.s));
      if(!morning.length||!evening.length)return;
      // Manteniamo il lungo mattutino e riassegniamo il lungo serale; se non c'è candidato lo rendiamo scoperto, mai doppio lungo.
      evening.forEach(({s})=>{
        const candidate=generalDailyCandidate(out,index,s,name),old=s.name;
        s.name=candidate?.name||'SCOPERTO';
        s.skill=String(s.skill||'Chiusura')+` · niente doppio lungo (${old})`;
        s.generalDoubleLongRule=true;
      });
    });
  });
  return out;
}
const buildBeforeGeneralDailyShiftRules=build;
build=function(){return applyGeneralDailyShiftRules(buildBeforeGeneralDailyShiftRules())};

// Le regole diventano visibili nel pannello generale.
const generalRulesPanelBeforeDaily=generalRulesPanel;
generalRulesPanel=function(){
  const html=generalRulesPanelBeforeDaily(),r=dailyShiftRules();
  const extra=`<div class="req"><span>Turno unico ordinario · presenza max</span><b>${hf(r.singlePresenceMaxMinutes/60)} con pausa</b></div><div class="req"><span>Tra 7:15 e 7:30</span><b>solo eccezione/straordinario</b></div><div class="req"><span>Oltre 7:30 di presenza</span><b>spezzato obbligatorio</b></div><div class="req"><span>Doppio lungo nello stesso giorno</span><b>vietato mattina + sera</b></div>`;
  const i=html.lastIndexOf('</div>');
  return i>=0?html.slice(0,i)+extra+html.slice(i):html+extra;
};

// Anche l'aggiunta manuale del PDV1 rispetta i limiti generali.
if(typeof pdv1349PromptShift==='function'){
  const pdv1349PromptShiftBeforeDaily=pdv1349PromptShift;
  pdv1349PromptShift=function(existing={}){
    const draft=pdv1349PromptShiftBeforeDaily(existing);if(!draft)return null;
    const r=dailyShiftRules(),scheduled=shiftScheduledMinutes(draft),split=Boolean(draft.start2&&draft.end2);
    if(!split&&scheduled>Number(r.splitRequiredAfterMinutes||450)){alert('Oltre 7:30 di presenza il turno deve essere spezzato.');return null}
    if(!split&&scheduled>Number(r.singlePresenceMaxMinutes||435)&&!confirm('Il turno unico supera 7:15 di presenza. Può essere salvato solo come eccezione/straordinario. Continuare?'))return null;
    return draft;
  };
}
try{dailyShiftRules();if(typeof propagateGeneralShiftRulesToPdvs==='function')propagateGeneralShiftRulesToPdvs();render()}catch(_){}
