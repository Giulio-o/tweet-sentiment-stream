const PDV1_CR_PRESIDI_DEFAULTS={
  paPa:{start:'06:00',end:'11:00',start2:'13:00',end2:'15:30'},
  blank:{start:'06:00',end:'13:30'},
  paR:{start:'06:00',end:'13:30'},
  rPc:{start:'13:00',end:'20:45'},
  pcPc:{start:'11:00',end:'13:00',start2:'15:00',end2:'20:45'}
};
const PDV1_CR_PRESIDI_ANCHOR=new Date('2026-01-05T12:00:00');
const PDV1_CR_PRESIDI_CYCLE=[
  [['PA','PA'],['PC','PC'],['',''],['R','PC'],['',''],['PA','R'],['','']],
  [['PC','PC'],['',''],['PA','R'],['PA','R'],['PC','PC'],['',''],['','']],
  [['',''],['PA','PA'],['R','PC'],['',''],['PA','R'],['PC','PC'],['','']]
];
function pdv1CrPresidiConfig(state=S){
  const saved=state?.rules?.pdv1CrPresidi||{};
  return{
    paPa:{...PDV1_CR_PRESIDI_DEFAULTS.paPa,...(saved.paPa||{})},
    blank:{...PDV1_CR_PRESIDI_DEFAULTS.blank,...(saved.blank||{})},
    paR:{...PDV1_CR_PRESIDI_DEFAULTS.paR,...(saved.paR||{})},
    rPc:{...PDV1_CR_PRESIDI_DEFAULTS.rPc,...(saved.rPc||{})},
    pcPc:{...PDV1_CR_PRESIDI_DEFAULTS.pcPc,...(saved.pcPc||{})}
  };
}
function pdv1CrPresidioCodes(d){
  if(!pdv1Active()||d.getFullYear()!==2026||d.getDay()===0)return null;
  const monday=mon(d),weeks=Math.round((monday-PDV1_CR_PRESIDI_ANCHOR)/604800000),cycle=((weeks%3)+3)%3,day=(d.getDay()+6)%7;
  return PDV1_CR_PRESIDI_CYCLE[cycle][day]||['',''];
}
function pdv1CrShiftFromCodes(d,codes){
  if(!codes)return null;
  const [m,s]=codes,cfg=pdv1CrPresidiConfig();
  if(m==='C'&&s==='C')return null;
  if(m==='PA'&&s==='PA')return{...cfg.paPa,mode:'morning',note:'PA/PA · presidio apertura spezzato · CR 3',pause:0,presidioCodes:'PA/PA'};
  if(m==='PA'&&s==='R')return{...cfg.paR,mode:'morning',note:'PA · presidio apertura turno unico · CR 3',pause:15,presidioCodes:'PA/R'};
  if(m==='R'&&s==='PC')return{...cfg.rPc,mode:'evening',note:'PC · presidio chiusura turno unico · CR 3',pause:15,presidioCodes:'R/PC'};
  if(m==='PC'&&s==='PC')return{...cfg.pcPc,mode:'evening',note:'PC/PC · presidio chiusura spezzato · CR 3',pause:0,presidioCodes:'PC/PC'};
  if(!m&&!s)return{...cfg.blank,mode:'morning',note:'Mattina ordinaria · nessun presidio · CR 3',pause:15,presidioCodes:'—'};
  return null;
}
const crShiftBeforePdv1Presidi=crShift;
crShift=function(i){
  const d=add(week,i);
  if(pdv1Active()&&d.getFullYear()===2026){
    if(i===6)return null;
    const codes=pdv1CrPresidioCodes(d);
    const shift=pdv1CrShiftFromCodes(d,codes);
    if(shift)return shift;
  }
  return crShiftBeforePdv1Presidi(i);
};
function ensurePdv1CrPresidiState(){
  if(!pdv1Active())return;
  S.rules=S.rules||{};
  if(!S.rules.pdv1CrPresidi){
    S.rules.pdv1CrPresidi=JSON.parse(JSON.stringify(PDV1_CR_PRESIDI_DEFAULTS));
    const p=currentPdv();if(p){p.state=cloneJson(S);p.updatedAt=pdvNow();persistPdvDb()}
    save();
  }
}
const pdvRulesPageBeforeCrPresidi=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeCrPresidi();
  const p=pdvDb.pdvs.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p||p.id!=='PDV_001')return;
  const cfg=pdv1CrPresidiConfig(normalizePdvState(p.state)),form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;
  const html=`<div class="card"><h3>CR 3 · Presidi 2026</h3><p class="muted">Calendario ricavato dal file <b>3CR_2026</b> per Gastro, Forno, Carne e Pescheria. Il ciclo PA/PC è di 3 settimane e viene applicato solo a PDV 1.</p><div class="req"><span>PA / PA · apertura spezzata</span><b>${cfg.paPa.start}–${cfg.paPa.end} / ${cfg.paPa.start2}–${cfg.paPa.end2}</b></div><div class="req"><span>Nessun presidio · mattina ordinaria</span><b>${cfg.blank.start}–${cfg.blank.end}</b></div><div class="req"><span>PA / R · apertura turno unico</span><b>${cfg.paR.start}–${cfg.paR.end}</b></div><div class="req"><span>R / PC · chiusura turno unico</span><b>${cfg.rPc.start}–${cfg.rPc.end}</b></div><div class="req"><span>PC / PC · chiusura spezzata</span><b>${cfg.pcPc.start}–${cfg.pcPc.end} / ${cfg.pcPc.start2}–${cfg.pcPc.end2}</b></div><p class="muted" style="margin-top:10px">La domenica non viene assegnata al CR da questo calendario. Le festività chiuse continuano ad avere precedenza.</p></div>`;
  actions?.insertAdjacentHTML('beforebegin',html);
};
const scheduleBeforeCrPresidi=schedule;
schedule=function(){
  scheduleBeforeCrPresidi();
  if(!pdv1Active())return;
  const b=document.querySelector('.purplebox b');if(b)b.textContent='CR 3: calendario Presidi 2026 · ciclo PA/PC di 3 settimane';
};
ensurePdv1CrPresidiState();
try{render()}catch(_){}
