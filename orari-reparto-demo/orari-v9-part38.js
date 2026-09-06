// Promozioni 01-14/10/2026 ricavate dal file Excel caricato su Drive il 05/09/2026.
// Le promozioni orientano presidio, ordini e rinforzi: non aggiungono automaticamente ore
// finche' non sono disponibili vendite/volumi che giustifichino una modifica del turno.
const PDV1_OCTOBER_PROMOTIONS={
  from:'2026-10-01',to:'2026-10-14',version:'pdv1-promo-20261001-v1',source:'Drive · promo dal 1 al 14 ottobre.xlsx · 05/09/2026',
  initiatives:['Fuori depliant Food','Freschi Freschissimi'],references:25,
  departments:[
    {name:'Carni',level:'ALTA',count:11,items:'Pollo e preparati, macinato scottona, arista e rosticciana',action:'Preservare il macellaio autonomo al mattino; valutare rinforzo 09:00-13:00 nel primo venerdi e sabato.'},
    {name:'Gastronomia',level:'ALTA',count:6,items:'Pecorino, prosciutto cotto, trippa, taccole, omelette e zuppa inglese',action:'Anticipare ordini e preparazione; proteggere la fascia 09:00-14:00 e il servizio dei prodotti in bilancia.'},
    {name:'Pescheria',level:'MEDIA',count:6,items:'Alici, insalata di mare, tranci e carpacci tonno/pesce spada',action:'Controllo scorte al lancio e nel weekend; venerdi mattina Katia o altra competenza Pescheria autonoma.'},
    {name:'Forneria',level:'MIRATA',count:2,items:'Pagnotta di grano duro 350 g, due referenze',action:'Mantenere l’esperto dalle 06:00; aumentare produzione solo dopo il riscontro vendite del primo giorno.'}
  ]
};

function octoberPromotionWeek(){
  const from=key(week),to=key(add(week,6)),p=PDV1_OCTOBER_PROMOTIONS;
  if(to<p.from||from>p.to)return null;
  if(from<='2026-10-01')return{label:'Lancio · 1-4 ottobre',tone:'launch',steps:['Ordini e scorte entro mercoledi 30/09','Controllo esposizione e bilance giovedi 1','Rinforzo flessibile Carni/Gastro venerdi-sabato 09:00-13:00']};
  if(from<='2026-10-07')return{label:'Settimana piena · 5-11 ottobre',tone:'full',steps:['Usare il venduto del primo weekend per correggere gli ordini','Proteggere venerdi e sabato senza indebolire le chiusure','Recuperare ore solo tra persone con competenza equivalente']};
  return{label:'Coda · 12-14 ottobre',tone:'tail',steps:['Controllare residui e rotture di stock','Mantenere copertura fino a mercoledi 14','Togliere eventuali rinforzi solo dopo verifica del venduto']};
}
function octoberPromotionHtml(plan){
  const p=PDV1_OCTOBER_PROMOTIONS;
  return`<div class="card october-promotion-card ${esc(plan.tone)}" id="octoberPromotionCard"><div class="row wrap"><div><h3>Promozioni · 1-14 ottobre</h3><small>${esc(p.source)} · ${p.references} referenze</small></div><span class="pill">${esc(plan.label)}</span></div><div class="promotion-departments">${p.departments.map(d=>`<div class="promotion-department"><div class="row"><b>${esc(d.name)}</b><span class="promotion-level ${String(d.level).toLowerCase()}">${esc(d.level)}</span></div><small>${d.count} referenze · ${esc(d.items)}</small><p>${esc(d.action)}</p></div>`).join('')}</div><div class="promotion-week-plan"><b>Come muoversi in questa settimana</b>${plan.steps.map(x=>`<span>${esc(x)}</span>`).join('')}</div><small class="muted"><b>Scelta applicata:</b> le promo aumentano l’attenzione su ordini, preparazione e picchi; non generano da sole un turno extra. Il rinforzo diventa effettivo solo se vendite, volumi o scoperture lo rendono necessario.</small></div>`;
}
function decorateOctoberPromotions(){
  if(view!=='schedule'||!(typeof pdv1Active==='function'&&pdv1Active()))return;
  const plan=octoberPromotionWeek(),app=document.getElementById('app'),hero=app?.querySelector('.purplebox');
  if(!plan||!app||!hero||document.getElementById('octoberPromotionCard'))return;
  hero.insertAdjacentHTML('afterend',octoberPromotionHtml(plan));
}

const scheduleBeforeOctoberPromotions=schedule;
schedule=function(){scheduleBeforeOctoberPromotions();decorateOctoberPromotions()};

if(typeof pdvRulesPage==='function'){
  const pdvRulesBeforeOctoberPromotions=pdvRulesPage;
  pdvRulesPage=function(){
    pdvRulesBeforeOctoberPromotions();
    const p=pdvDb?.pdvs?.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv(),form=document.querySelector('#app form'),actions=form?.lastElementChild;
    if(!p||p.id!=='PDV_001'||!form||form.querySelector('#octoberPromotionRules'))return;
    const box=document.createElement('div');box.id='octoberPromotionRules';box.className='card october-promotion-rules';
    box.innerHTML=`<h3>Promozioni 1-14 ottobre · criterio operativo</h3><div class="req"><span>Priorita 1</span><b>Carni e Gastronomia · ordini, preparazione, servizio</b></div><div class="req"><span>Priorita 2</span><b>Pescheria · scorte e competenza autonoma venerdi</b></div><div class="req"><span>Priorita 3</span><b>Forneria · produzione guidata dal venduto</b></div><small class="muted">Non si spostano persone solo contando le referenze: prima si guarda se il prodotto richiede banco, bilancia, preparazione o solo rifornimento.</small>`;
    actions?.insertAdjacentElement('beforebegin',box);
  };
}

(function installOctoberPromotionStyles(){
  if(document.getElementById('octoberPromotionStyles'))return;const st=document.createElement('style');st.id='octoberPromotionStyles';
  st.textContent=`.october-promotion-card{border-left:5px solid #a54216;background:#fff7ed}.promotion-departments{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}.promotion-department{padding:10px;border-radius:10px;background:#fff;border:1px solid #ead2be}.promotion-department small{display:block;margin-top:5px;color:#5d6670}.promotion-department p{margin:7px 0 0;font-size:.8rem;line-height:1.35}.promotion-level{padding:3px 7px;border-radius:999px;font-size:.68rem;font-weight:900}.promotion-level.alta{background:#fbe1d4;color:#8c2e0b}.promotion-level.media{background:#fff0c2;color:#765300}.promotion-level.mirata{background:#e6edf7;color:#315074}.promotion-week-plan{display:grid;gap:5px;margin:10px 0;padding:10px;border-radius:10px;background:#fff2df;border:1px solid #e6c08d}.promotion-week-plan span{font-size:.8rem}.promotion-week-plan span:before{content:'• ';font-weight:900;color:#a54216}.october-promotion-rules{border-left:5px solid #a54216}@media(max-width:720px){.promotion-departments{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
})();

try{if(view==='schedule')schedule()}catch(_){}
