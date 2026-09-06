// Promozioni 01-14/10/2026 ricavate dal file Excel caricato su Drive il 05/09/2026.
// Solo promemoria informativo: non modifica turni, ore, fabbisogni o punteggi del generatore.
const PDV1_OCTOBER_PROMOTIONS={
  from:'2026-10-01',to:'2026-10-14',version:'pdv1-promo-20261001-v2',source:'Drive · promo dal 1 al 14 ottobre.xlsx · 05/09/2026',
  initiatives:['Fuori depliant Food','Freschi Freschissimi'],references:25,
  departments:[
    {name:'Carni',count:11,items:'Pollo e preparati, macinato scottona, arista e rosticciana'},
    {name:'Gastronomia',count:6,items:'Pecorino, prosciutto cotto, trippa, taccole, omelette e zuppa inglese'},
    {name:'Pescheria',count:6,items:'Alici, insalata di mare, tranci e carpacci tonno/pesce spada'},
    {name:'Forneria',count:2,items:'Pagnotta di grano duro 350 g, due referenze'}
  ]
};

function octoberPromotionWeek(){
  const from=key(week),to=key(add(week,6)),p=PDV1_OCTOBER_PROMOTIONS;
  if(to<p.from||from>p.to)return null;
  if(from<='2026-10-01')return{label:'ATTIVA · 1-4 ottobre',tone:'active'};
  if(from<='2026-10-07')return{label:'ATTIVA · 5-11 ottobre',tone:'active'};
  return{label:'ATTIVA FINO AL 14/10',tone:'ending'};
}
function octoberPromotionHtml(plan){
  const p=PDV1_OCTOBER_PROMOTIONS;
  return`<div class="card october-promotion-card ${esc(plan.tone)}" id="octoberPromotionCard"><div class="row wrap"><div><h3>Promozioni attive · 1-14 ottobre</h3><small>${esc(p.source)} · ${p.references} referenze</small></div><span class="pill">${esc(plan.label)}</span></div><div class="promotion-initiatives"><span>${p.initiatives.map(esc).join('</span><span>')}</span></div><div class="promotion-departments">${p.departments.map(d=>`<div class="promotion-department"><div class="row"><b>${esc(d.name)}</b><span class="promotion-count">${d.count}</span></div><small>${esc(d.items)}</small></div>`).join('')}</div><small class="muted"><b>Solo promemoria:</b> queste promozioni non aggiungono ore e non modificano turni, fabbisogni o priorità del generatore.</small></div>`;
}
function decorateOctoberPromotions(){
  if(view!=='schedule'||!(typeof pdv1Active==='function'&&pdv1Active()))return;
  const plan=octoberPromotionWeek(),app=document.getElementById('app'),hero=app?.querySelector('.purplebox');
  if(!plan||!app||!hero||document.getElementById('octoberPromotionCard'))return;
  hero.insertAdjacentHTML('afterend',octoberPromotionHtml(plan));
}

const scheduleBeforeOctoberPromotions=schedule;
schedule=function(){scheduleBeforeOctoberPromotions();decorateOctoberPromotions()};

(function installOctoberPromotionStyles(){
  if(document.getElementById('octoberPromotionStyles'))return;const st=document.createElement('style');st.id='octoberPromotionStyles';
  st.textContent=`.october-promotion-card{border-left:5px solid #a54216;background:#fff7ed}.promotion-initiatives{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}.promotion-initiatives span{padding:5px 8px;border-radius:999px;background:#fff;border:1px solid #e0b78f;font-size:.75rem;font-weight:800}.promotion-departments{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin:10px 0}.promotion-department{padding:10px;border-radius:10px;background:#fff;border:1px solid #ead2be}.promotion-department small{display:block;margin-top:5px;color:#5d6670}.promotion-count{display:grid;place-items:center;min-width:26px;height:26px;padding:0 6px;border-radius:999px;background:#fbe1d4;color:#8c2e0b;font-size:.72rem;font-weight:900}@media(max-width:720px){.promotion-departments{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
})();

try{if(view==='schedule')schedule()}catch(_){}
