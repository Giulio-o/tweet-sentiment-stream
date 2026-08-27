// Rifinitura architettura: regole generali condivise; orari operativi specifici del singolo PDV.
function pdvRoleTimes(state=S,pdvId=currentPdvId()){
  state.rules=state.rules||{};state.rules.roleTimes={...(state.rules.roleTimes||{})};
  if(pdvId==='PDV_001'&&!state.rules.roleTimes.fornoStart)state.rules.roleTimes.fornoStart='06:00';
  return state.rules.roleTimes;
}

// Le 12 ore sono la regola generale; disattiviamo il vecchio vincolo PDV1 20:45→08:45 scritto fisso.
if(typeof pdv1EnforceNextDayRest==='function')pdv1EnforceNextDayRest=function(out){return out};

// Il controllo generale di part24 deve essere eseguito DOPO aver applicato gli orari specifici del PDV.
const applyGeneralMinimumRestAfterPdvTimes=typeof applyGeneralMinimumRest==='function'?applyGeneralMinimumRest:null;
if(applyGeneralMinimumRestAfterPdvTimes)applyGeneralMinimumRest=function(out){return out};

function applyPdvSpecificTimes(out){
  const close=String(S.rules?.closingTime||'').trim(),rt=pdvRoleTimes(S),forno=String(rt.fornoStart||'').trim();
  out.forEach(day=>{
    (day.g||[]).forEach(s=>{
      const skill=String(s.skill||'').toLowerCase();
      if(forno&&skill.includes('forno')){s.start=forno;s.pdvSpecificFornoStart=true}
      if(close&&skill.includes('chiusura')){s.end=close;s.pdvSpecificClosing=true;s.pause=hrs(s.start,s.end)>6?15:0}
    });
    // I turni CR provenienti dai Presidi non vengono alterati automaticamente.
  });
  return out;
}
const buildBeforePdvSpecificTimes=build;
build=function(){let out=applyPdvSpecificTimes(buildBeforePdvSpecificTimes());return applyGeneralMinimumRestAfterPdvTimes?applyGeneralMinimumRestAfterPdvTimes(out):out};

// Salva i valori numerici generali dentro ogni PDV: così Google Sheets li porta su telefono e PC.
function propagateGeneralShiftRulesToPdvs(){
  const source={...GENERAL_SHIFT_DEFAULTS,...(pdvDb.generalShiftRules||S.rules?.generalShiftRules||{})};
  pdvDb.generalShiftRules=source;
  (pdvDb.pdvs||[]).forEach(p=>{
    p.state=normalizePdvState(p.state);p.state.rules=p.state.rules||{};p.state.rules.generalShiftRules=cloneJson(source);
  });
  S.rules=S.rules||{};S.rules.generalShiftRules=cloneJson(source);persistPdvDb();
  if(pdvDb.cloudEnabled&&typeof pushAllPdvsCloud==='function')pushAllPdvsCloud().catch(()=>{});
}
const generalShiftRulesBeforeCloud=generalShiftRules;
generalShiftRules=function(){
  const cloud=S.rules?.generalShiftRules||{};
  pdvDb.generalShiftRules={...GENERAL_SHIFT_DEFAULTS,...(pdvDb.generalShiftRules||{}),...cloud};
  return pdvDb.generalShiftRules;
};

const pdvRulesPageBeforeRoleTimes=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeRoleTimes();const p=pdvDb?.pdvs?.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p)return;
  const state=p.id===currentPdvId()?S:normalizePdvState(p.state),rt=pdvRoleTimes(state,p.id),form=document.querySelector('#app form');if(!form)return;
  const cards=[...form.querySelectorAll('.card')],hoursCard=cards.find(c=>String(c.querySelector('h3')?.textContent||'').includes('Reparti e orari'));if(!hoursCard||hoursCard.querySelector('#pdvFornoStart'))return;
  const grid=hoursCard.querySelector('.grid');grid?.insertAdjacentHTML('beforeend',`<label>Ingresso Forno<input id="pdvFornoStart" type="time" value="${esc(rt.fornoStart||'')}" placeholder="Specifico del PDV"></label>`);
  hoursCard.insertAdjacentHTML('beforeend','<small class="muted">Apertura, chiusura e ingresso Forno sono parametri del singolo PDV. Il riposo minimo tra due turni resta invece una regola generale.</small>');
};

const savePdvRulesBeforeRoleTimes=savePdvRules;
savePdvRules=function(e,id){
  const fornoValue=String(document.getElementById('pdvFornoStart')?.value||'').trim();
  const hadGeneralPanel=Boolean(document.getElementById('genRest'));
  const result=savePdvRulesBeforeRoleTimes(e,id);
  const p=pdvDb?.pdvs?.find(x=>x.id===id);if(p){p.state=normalizePdvState(p.state);p.state.rules.roleTimes={...(p.state.rules.roleTimes||{}),fornoStart:fornoValue};if(id===currentPdvId())S=normalizePdvState(p.state);p.updatedAt=pdvNow();persistPdvDb()}
  if(hadGeneralPanel)propagateGeneralShiftRulesToPdvs();
  if(pdvDb.cloudEnabled&&p&&typeof cloudSavePdv==='function')cloudSavePdv(p).catch(()=>{});
  return result;
};

// Migrazione: il 349 conserva Forno 06:00; gli altri PDV non ereditano quel valore.
try{if(currentPdvId()==='PDV_001'){pdvRoleTimes(S,'PDV_001');const p=currentPdv();if(p)p.state=cloneJson(S)}propagateGeneralShiftRulesToPdvs();render()}catch(_){}
