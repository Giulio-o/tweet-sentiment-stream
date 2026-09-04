// Linee guida ricavate dal confronto degli orari pubblicati 7-13 e 14-20 settembre 2026.
// Sono priorita operative: la copertura del negozio prevale, mentre ore e rotazioni
// decidono solo tra soluzioni che garantiscono lo stesso presidio.
const PDV1_NEEDS_FIRST_GUIDE={
  version:'pdv1-needs-first-20260904-v1',
  source:'Drive · orari pubblicati 7-13 e 14-20 settembre',
  priorities:[
    ['1','Negozio e reparti','Coprire le fasce necessarie prima di pareggiare ore o rotazioni.'],
    ['2','Competenze','Forno, Ordini, Macelleria e Pesce richiedono una persona autonoma.'],
    ['3','Eventi e assenze','Inventario, rientri, malattie e richieste approvate modificano la griglia.'],
    ['4','Riposi e sabati','Evitare chiusura-apertura e due sabati in chiusura; se indispensabili, evidenziare.'],
    ['5','Monte ore','Recuperi e straordinari si distribuiscono solo dopo aver messo in sicurezza il servizio.']
  ]
};

function pdv1NeedsFirstActive(){return typeof pdv1Active==='function'&&pdv1Active()}
function needsFirstPriorityBar(){
  return`<div class="base-grid-priority needs-first-priority"><b>Ordine di decisione</b>${PDV1_NEEDS_FIRST_GUIDE.priorities.map(x=>`<span>${esc(x[0])} · ${esc(x[1])}</span>`).join('')}</div>`;
}
function needsFirstGuideHtml(){
  return`<div class="card needs-first-guide" id="needsFirstGuide"><div class="row wrap"><div><h3>Linee guida operative · esigenze prima</h3><small>${esc(PDV1_NEEDS_FIRST_GUIDE.source)}</small></div><span class="pill">GUIDA</span></div><div class="needs-first-list">${PDV1_NEEDS_FIRST_GUIDE.priorities.map(x=>`<div><b>${esc(x[0])}</b><span><strong>${esc(x[1])}</strong><small>${esc(x[2])}</small></span></div>`).join('')}</div><div class="needs-first-observed"><span><b>Aperture</b>Forno dalle 06:00 e presidio mattina con competenze autonome.</span><span><b>Carni / Pesce</b>Macelleria al mattino; continuità soprattutto ven-sab; Pesce il venerdì.</span><span><b>Chiusure</b>Di norma 2 persone; il terzo serve per eventi. Il CR conta solo se presente nella fascia.</span><span><b>Formazione</b>Le ore dell'allievo contano alla persona, non come copertura autonoma del reparto.</span><span><b>Domenica</b>Base osservata: 2 persone 07:00-13:15, con almeno una persona autonoma.</span><span><b>Eccezioni</b>Una chiusura-apertura necessaria non viene cancellata: resta marcata CRITICO/BORDERLINE.</span></div><small class="muted">Queste indicazioni guidano la proposta, ma non sono regole ferree: quando entrano in conflitto prevale il presidio reale del negozio.</small></div>`;
}

if(typeof baseGridPanelHtml==='function'){
  const baseGridPanelHtmlBeforeNeedsFirst=baseGridPanelHtml;
  baseGridPanelHtml=function(ds){
    let html=baseGridPanelHtmlBeforeNeedsFirst(ds);
    html=html.replace(/<div class="base-grid-priority[^>]*">[\s\S]*?<\/div>/,needsFirstPriorityBar());
    return html.replace('ruoli e chiusure ruotano, i fabbisogni restano fissi','la griglia si adatta, mantenendo prima i fabbisogni del negozio');
  };
}

const scheduleBeforeNeedsFirstGuide=schedule;
schedule=function(){
  scheduleBeforeNeedsFirstGuide();
  if(view!=='schedule'||!pdv1NeedsFirstActive())return;
  const app=document.getElementById('app'),hero=app?.querySelector('.purplebox');
  if(!app||!hero||document.getElementById('needsFirstGuide'))return;
  hero.insertAdjacentHTML('afterend',needsFirstGuideHtml());
};

const pdvRulesBeforeNeedsFirstGuide=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesBeforeNeedsFirstGuide();
  const p=pdvDb?.pdvs?.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();
  const form=document.querySelector('#app form'),actions=form?.lastElementChild;
  if(!p||p.id!=='PDV_001'||!form||form.querySelector('#needsFirstGuide'))return;
  actions?.insertAdjacentHTML('beforebegin',needsFirstGuideHtml());
};

(function installNeedsFirstGuideStyles(){
  if(document.getElementById('needsFirstGuideStyles'))return;
  const st=document.createElement('style');st.id='needsFirstGuideStyles';
  st.textContent=`.needs-first-guide{border-left:5px solid #1f6f4a;background:#eef8f2}.needs-first-list{display:grid;gap:6px;margin:10px 0}.needs-first-list>div{display:grid;grid-template-columns:28px 1fr;gap:8px;align-items:start;padding:8px;border-radius:10px;background:#fff;border:1px solid #c9dfd2}.needs-first-list>div>b{display:grid;place-items:center;width:26px;height:26px;border-radius:50%;background:#1f6f4a;color:#fff}.needs-first-list span,.needs-first-list small{display:block}.needs-first-list small{margin-top:2px;color:#52616d}.needs-first-observed{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;margin:10px 0}.needs-first-observed span{display:grid;gap:2px;padding:8px;border-radius:9px;background:#f8fbf9;border:1px solid #d7e6dc;font-size:.78rem}.needs-first-priority{grid-template-columns:repeat(5,minmax(0,1fr))}.needs-first-priority>b{grid-column:1/-1}@media(max-width:720px){.needs-first-observed,.needs-first-priority{grid-template-columns:1fr}}`;
  document.head.appendChild(st);
})();

try{if(view==='schedule')schedule()}catch(_){}
