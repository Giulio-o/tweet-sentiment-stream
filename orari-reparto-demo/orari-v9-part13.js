function pdv1FindMorningButcherShift(day){
  return (day.c||[]).find(s=>{
    const skill=String(s.skill||'').toLowerCase();
    return skill.includes('macelleria')&&s.start&&mins(s.start)<12*60;
  })||null;
}
function pdv1ApplyCarniCapShortening(out){
  if(!pdv1Active())return out;
  const cap=Number(pdv1Advanced().carni.weeklyCap)||60;
  const before=pdv1CarniHours(out);
  if(before<=cap)return out;
  const targets={
    0:{start:'06:30',end:'13:00'},
    1:{start:'07:00',end:'13:00'},
    2:{start:'06:30',end:'13:00'},
    4:{start:'06:30',end:'13:00'}
  };
  Object.entries(targets).forEach(([idx,t])=>{
    const day=out[Number(idx)];if(!day||day.holiday?.type==='closed')return;
    const s=pdv1FindMorningButcherShift(day);if(!s)return;
    s.start=t.start;s.end=t.end;s.pause=hrs(t.start,t.end)>6?15:0;
    s.carniCapShortened=true;
    s.skill=String(s.skill||'Macelleria')+' · ridotto per tetto 60h';
  });
  const after=pdv1CarniHours(out);
  out._pdv1CarniCapAdjustment={before,after,cap,applied:true,stillOver:after>cap};
  return out;
}
const buildBeforePdv1CarniCapShortening=build;
build=function(){return pdv1ApplyCarniCapShortening(buildBeforePdv1CarniCapShortening())};

const pdvRulesPageBeforeCarniCapShortening=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeCarniCapShortening();
  const p=pdvDb.pdvs.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p||p.id!=='PDV_001')return;
  const form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;
  const html=`<div class="card"><h3>Riduzione automatica Carni oltre 60 ore</h3><p class="muted">Si applica solo se Carni + vendita Pesce supera il tetto settimanale di 60 ore.</p><div class="req"><span>Lunedì</span><b>06:30–13:00</b></div><div class="req"><span>Martedì</span><b>07:00–13:00</b></div><div class="req"><span>Mercoledì</span><b>06:30–13:00</b></div><div class="req"><span>Venerdì</span><b>06:30–13:00</b></div><p class="muted" style="margin-top:10px">Se dopo questi accorciamenti il totale resta sopra 60 ore, l'app lo segnala senza tagliare altre coperture automaticamente.</p></div>`;
  actions?.insertAdjacentHTML('beforebegin',html);
};
try{render()}catch(_){}
