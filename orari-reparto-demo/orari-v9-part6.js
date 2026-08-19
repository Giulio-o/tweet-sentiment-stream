function objectiveNum(id){return Number(document.getElementById(id)?.value)||0}
function objectiveSet(id,value){const el=document.getElementById(id);if(el)el.value=Math.round((Number(value)||0)*100)/100}
function syncObjectiveTotal(gId,cId,tId){objectiveSet(tId,objectiveNum(gId)+objectiveNum(cId))}
function syncMonthlyObjectiveTotal(k){syncObjectiveTotal(`omg${k}`,`omc${k}`,`omt${k}`)}
function syncAllObjectiveTotals(){
  syncObjectiveTotal('og','oc','ot');
  syncObjectiveTotal('oag','oac','oat');
  for(let i=1;i<=12;i++)syncMonthlyObjectiveTotal(String(i).padStart(2,'0'));
}
function normalizeObjectiveTotals(){
  ensureObjectiveStructure();
  S.objectives.total=(Number(S.objectives.gastronomia)||0)+(Number(S.objectives.carni)||0);
  S.objectives.annual.total=(Number(S.objectives.annual.gastronomia)||0)+(Number(S.objectives.annual.carni)||0);
  for(let i=1;i<=12;i++){
    const k=String(i).padStart(2,'0'),m=S.objectives.monthly[k];
    m.total=(Number(m.gastronomia)||0)+(Number(m.carni)||0);
  }
}
function objectiveMonthlySumsAuto(){
  ensureObjectiveStructure();
  const out={gastronomia:0,carni:0,total:0};
  for(let i=1;i<=12;i++){
    const m=S.objectives.monthly[String(i).padStart(2,'0')];
    out.gastronomia+=Number(m.gastronomia)||0;
    out.carni+=Number(m.carni)||0;
  }
  out.total=out.gastronomia+out.carni;
  return out;
}
function useMonthlySumAsAnnual(){
  const s=objectiveMonthlySumsAuto();
  S.objectives.annual={gastronomia:s.gastronomia,carni:s.carni,total:s.total};
  save();obj();
}
function obj(){
  normalizeObjectiveTotals();
  const sums=objectiveMonthlySumsAuto(),a=S.objectives.annual;
  const months=typeof OBJ_MONTHS!=='undefined'?OBJ_MONTHS:['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const monthlyRows=months.map((m,i)=>{
    const k=String(i+1).padStart(2,'0'),x=S.objectives.monthly[k];
    return `<tr><td><b>${m}</b></td><td><input id="omg${k}" type="number" step=".25" min="0" value="${Number(x.gastronomia)||0}" oninput="syncMonthlyObjectiveTotal('${k}')"></td><td><input id="omc${k}" type="number" step=".25" min="0" value="${Number(x.carni)||0}" oninput="syncMonthlyObjectiveTotal('${k}')"></td><td><input id="omt${k}" type="number" step=".25" min="0" value="${Number(x.total)||0}" readonly aria-readonly="true"></td></tr>`;
  }).join('');
  $('#app').innerHTML=`<form class="form" onsubmit="saveObj(event)">
    <div class="card"><h2>Obiettivi settimanali</h2><p class="muted">Il totale è calcolato automaticamente: Gastronomia + Carni.</p><div class="grid"><label>Gastronomia<input id="og" type="number" step=".25" min="0" value="${Number(S.objectives.gastronomia)||0}" oninput="syncObjectiveTotal('og','oc','ot')"></label><label>Carni<input id="oc" type="number" step=".25" min="0" value="${Number(S.objectives.carni)||0}" oninput="syncObjectiveTotal('og','oc','ot')"></label><label class="wide">Totale automatico<input id="ot" type="number" step=".25" value="${Number(S.objectives.total)||0}" readonly aria-readonly="true"></label></div></div>
    <div class="card"><div class="row wrap"><div><h2>Obiettivi annuali</h2><small class="muted">Il totale annuale è sempre Gastronomia + Carni.</small></div><button class="btn small" type="button" onclick="useMonthlySumAsAnnual()">Usa somma dei mesi</button></div><div class="grid"><label>Gastronomia<input id="oag" type="number" step=".25" min="0" value="${Number(a.gastronomia)||0}" oninput="syncObjectiveTotal('oag','oac','oat')"></label><label>Carni<input id="oac" type="number" step=".25" min="0" value="${Number(a.carni)||0}" oninput="syncObjectiveTotal('oag','oac','oat')"></label><label class="wide">Totale automatico<input id="oat" type="number" step=".25" value="${Number(a.total)||0}" readonly aria-readonly="true"></label></div><div class="grid" style="margin-top:10px"><div class="card"><small>Somma 12 mesi · Gastronomia</small><br><b>${hf(sums.gastronomia)}</b></div><div class="card"><small>Somma 12 mesi · Carni</small><br><b>${hf(sums.carni)}</b></div><div class="card wide"><small>Somma 12 mesi · Totale</small><br><b>${hf(sums.total)}</b></div></div></div>
    <div class="card"><h2>Obiettivi mensili</h2><p class="muted">Per ogni mese inserisci Gastronomia e Carni: il Totale si aggiorna subito da solo.</p><div class="scroll"><table class="objective-table"><thead><tr><th>Mese</th><th>Gastronomia</th><th>Carni</th><th>Totale</th></tr></thead><tbody>${monthlyRows}</tbody></table></div></div>
    <button class="btn primary" type="submit">Salva tutti gli obiettivi</button>
  </form>`;
  syncAllObjectiveTotals();
}
function saveObj(e){
  e.preventDefault();ensureObjectiveStructure();syncAllObjectiveTotals();
  const wg=objectiveNum('og'),wc=objectiveNum('oc');
  S.objectives.gastronomia=wg;S.objectives.carni=wc;S.objectives.total=wg+wc;
  const ag=objectiveNum('oag'),ac=objectiveNum('oac');
  S.objectives.annual={gastronomia:ag,carni:ac,total:ag+ac};
  for(let i=1;i<=12;i++){
    const k=String(i).padStart(2,'0'),g=objectiveNum(`omg${k}`),c=objectiveNum(`omc${k}`);
    S.objectives.monthly[k]={gastronomia:g,carni:c,total:g+c};
  }
  save();obj();alert('Obiettivi salvati');
}
