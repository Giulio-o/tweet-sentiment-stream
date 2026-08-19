function objectiveNum(id){return Number(document.getElementById(id)?.value)||0}
function objectiveSet(id,value){const el=document.getElementById(id);if(el)el.value=Math.round((Number(value)||0)*100)/100}
function syncObjectiveTotal(gId,cId,tId){objectiveSet(tId,objectiveNum(gId)+objectiveNum(cId))}
function syncMonthlyObjectiveTotal(k){syncObjectiveTotal(`omg${k}`,`omc${k}`,`omt${k}`)}
function monthlyInputSums(){
  const out={gastronomia:0,carni:0,total:0};
  for(let i=1;i<=12;i++){
    const k=String(i).padStart(2,'0');
    out.gastronomia+=objectiveNum(`omg${k}`);
    out.carni+=objectiveNum(`omc${k}`);
  }
  out.total=out.gastronomia+out.carni;
  return out;
}
function syncAnnualFromMonthly(){
  const s=monthlyInputSums();
  objectiveSet('oag',s.gastronomia);
  objectiveSet('oac',s.carni);
  objectiveSet('oat',s.total);
  const rg=document.getElementById('annualSumG'),rc=document.getElementById('annualSumC'),rt=document.getElementById('annualSumT');
  if(rg)rg.textContent=hf(s.gastronomia);
  if(rc)rc.textContent=hf(s.carni);
  if(rt)rt.textContent=hf(s.total);
}
function syncMonthlyAndAnnual(k){syncMonthlyObjectiveTotal(k);syncAnnualFromMonthly()}
function syncAllObjectiveTotals(){
  syncObjectiveTotal('og','oc','ot');
  for(let i=1;i<=12;i++)syncMonthlyObjectiveTotal(String(i).padStart(2,'0'));
  syncAnnualFromMonthly();
}
function normalizeObjectiveTotals(){
  ensureObjectiveStructure();
  S.objectives.total=(Number(S.objectives.gastronomia)||0)+(Number(S.objectives.carni)||0);
  let annualG=0,annualC=0;
  for(let i=1;i<=12;i++){
    const k=String(i).padStart(2,'0'),m=S.objectives.monthly[k];
    m.total=(Number(m.gastronomia)||0)+(Number(m.carni)||0);
    annualG+=Number(m.gastronomia)||0;
    annualC+=Number(m.carni)||0;
  }
  S.objectives.annual={gastronomia:annualG,carni:annualC,total:annualG+annualC};
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
function useMonthlySumAsAnnual(){normalizeObjectiveTotals();save();obj()}
function obj(){
  normalizeObjectiveTotals();
  const sums=objectiveMonthlySumsAuto(),a=S.objectives.annual;
  const months=typeof OBJ_MONTHS!=='undefined'?OBJ_MONTHS:['Gennaio','Febbraio','Marzo','Aprile','Maggio','Giugno','Luglio','Agosto','Settembre','Ottobre','Novembre','Dicembre'];
  const monthlyRows=months.map((m,i)=>{
    const k=String(i+1).padStart(2,'0'),x=S.objectives.monthly[k];
    return `<tr><td><b>${m}</b></td><td><input id="omg${k}" type="number" step=".25" min="0" value="${Number(x.gastronomia)||0}" oninput="syncMonthlyAndAnnual('${k}')"></td><td><input id="omc${k}" type="number" step=".25" min="0" value="${Number(x.carni)||0}" oninput="syncMonthlyAndAnnual('${k}')"></td><td><input id="omt${k}" type="number" step=".25" min="0" value="${Number(x.total)||0}" readonly aria-readonly="true"></td></tr>`;
  }).join('');
  $('#app').innerHTML=`<form class="form" onsubmit="saveObj(event)">
    <div class="card"><h2>Obiettivi settimanali</h2><p class="muted">Il totale è calcolato automaticamente: Gastronomia + Carni.</p><div class="grid"><label>Gastronomia<input id="og" type="number" step=".25" min="0" value="${Number(S.objectives.gastronomia)||0}" oninput="syncObjectiveTotal('og','oc','ot')"></label><label>Carni<input id="oc" type="number" step=".25" min="0" value="${Number(S.objectives.carni)||0}" oninput="syncObjectiveTotal('og','oc','ot')"></label><label class="wide">Totale automatico<input id="ot" type="number" step=".25" value="${Number(S.objectives.total)||0}" readonly aria-readonly="true"></label></div></div>
    <div class="card"><h2>Obiettivi annuali automatici</h2><p class="muted">Non si inseriscono a mano: Gastronomia annuale è la somma dei 12 mesi Gastronomia, Carni annuale è la somma dei 12 mesi Carni, e il Totale annuale è la somma dei due.</p><div class="grid"><label>Gastronomia annuale<input id="oag" type="number" step=".25" value="${Number(a.gastronomia)||0}" readonly aria-readonly="true"></label><label>Carni annuale<input id="oac" type="number" step=".25" value="${Number(a.carni)||0}" readonly aria-readonly="true"></label><label class="wide">Totale annuale<input id="oat" type="number" step=".25" value="${Number(a.total)||0}" readonly aria-readonly="true"></label></div><div class="grid" style="margin-top:10px"><div class="card"><small>Somma 12 mesi · Gastronomia</small><br><b id="annualSumG">${hf(sums.gastronomia)}</b></div><div class="card"><small>Somma 12 mesi · Carni</small><br><b id="annualSumC">${hf(sums.carni)}</b></div><div class="card wide"><small>Somma 12 mesi · Totale</small><br><b id="annualSumT">${hf(sums.total)}</b></div></div></div>
    <div class="card"><h2>Obiettivi mensili</h2><p class="muted">Modificando Gastronomia o Carni di qualsiasi mese si aggiornano immediatamente il Totale del mese e tutti e tre i valori annuali.</p><div class="scroll"><table class="objective-table"><thead><tr><th>Mese</th><th>Gastronomia</th><th>Carni</th><th>Totale</th></tr></thead><tbody>${monthlyRows}</tbody></table></div></div>
    <button class="btn primary" type="submit">Salva tutti gli obiettivi</button>
  </form>`;
  syncAllObjectiveTotals();
}
function saveObj(e){
  e.preventDefault();ensureObjectiveStructure();syncAllObjectiveTotals();
  const wg=objectiveNum('og'),wc=objectiveNum('oc');
  S.objectives.gastronomia=wg;S.objectives.carni=wc;S.objectives.total=wg+wc;
  let annualG=0,annualC=0;
  for(let i=1;i<=12;i++){
    const k=String(i).padStart(2,'0'),g=objectiveNum(`omg${k}`),c=objectiveNum(`omc${k}`);
    S.objectives.monthly[k]={gastronomia:g,carni:c,total:g+c};
    annualG+=g;annualC+=c;
  }
  S.objectives.annual={gastronomia:annualG,carni:annualC,total:annualG+annualC};
  save();obj();alert('Obiettivi salvati');
}
