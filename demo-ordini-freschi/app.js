const names={
'Gastronomia':['Prosciutto cotto alta qualità','Prosciutto crudo nazionale','Prosciutto crudo toscano','Mortadella Bologna IGP','Salame toscano','Salame Milano','Finocchiona IGP','Soppressata toscana','Bresaola punta anca','Speck Alto Adige','Pancetta arrotolata','Pancetta tesa','Coppa stagionata','Porchetta arrosto','Tacchino arrosto','Pollo arrosto affettato','Roast beef','Vitello tonnato','Insalata russa','Insalata capricciosa','Mozzarella fiordilatte','Mozzarella bufala','Burrata','Stracciatella','Ricotta vaccina','Ricotta pecora','Scamorza bianca','Scamorza affumicata','Provolone dolce','Provolone piccante','Parmigiano Reggiano 24m','Grana Padano','Pecorino toscano fresco','Pecorino toscano stagionato','Pecorino romano','Gorgonzola dolce','Gorgonzola piccante','Taleggio','Fontina','Asiago','Emmental','Brie','Camembert','Mascarpone','Formaggio spalmabile','Olive verdi condite','Olive nere','Carciofini sottolio','Pomodori secchi','Antipasto misto'],
'Forneria':['Filone toscano','Baguette','Ciabatta','Schiacciata olio','Schiacciata croccante','Pane integrale','Pane ai cereali','Pane di segale','Pane senza sale','Pane pugliese','Pane casereccio','Pane di semola','Pane di grano duro','Pane multicereali','Pane noci','Pane olive','Pane curcuma','Pane farro','Panini rosette','Panini all’olio','Panini latte','Panini hamburger','Panini hot dog','Focaccia pomodoro','Focaccia cipolla','Focaccia olive','Pizza margherita','Pizza rossa','Pizza farcita','Pizzette','Cornetto vuoto','Cornetto crema','Cornetto cioccolato','Cornetto integrale','Treccia crema','Saccottino cioccolato','Krapfen','Sfoglia mela','Muffin','Crostata albicocca','Crostata cioccolato','Torta della nonna','Cantucci','Biscotti frollini','Grissini','Crackers forno','Farina tipo 0','Farina integrale','Lievito fresco','Base pizza'],
'Rosticceria':['Pollo arrosto','Cosce pollo arrosto','Patate arrosto','Lasagne','Cannelloni ricotta spinaci','Parmigiana melanzane','Arancini','Crocchette patate','Verdure grigliate','Polpette al sugo'],
'Carni':['Bistecca fiorentina','Costata bovino','Tagliata bovino','Roast beef bovino','Spezzatino bovino','Macinato bovino','Hamburger bovino','Bollito bovino','Ossobuco bovino','Fegato bovino','Petto pollo','Cosce pollo','Sovracosce pollo','Ali pollo','Pollo intero','Fesa tacchino','Coscia tacchino','Coniglio intero','Lombo suino','Arista suino','Braciole suino','Costine suino','Salsiccia toscana','Macinato suino','Pancetta fresca','Filetto suino','Coppa fresca','Stinco suino','Agnello costolette','Agnello coscio','Agnello spezzatino','Vitello fettine','Vitello arrosto','Vitello spezzatino','Polpette miste','Hamburger pollo','Spiedini misti','Involtini carne','Preparato ragù','Preparato polpettone'],
'Pesce':['Orata','Branzino','Salmone trancio','Tonno trancio','Merluzzo filetto','Seppie','Calamari','Gamberi','Cozze','Vongole']};

const holidays=['2026-08-15','2026-11-01','2026-12-08','2026-12-25','2026-12-26'];
const key='ordini-freschi-demo-v2';
let dept='Gastronomia',mode='exceptions',copyIndex=0,selectedOffer='';
let state=JSON.parse(localStorage.getItem(key)||'null')||{};

function save(){localStorage.setItem(key,JSON.stringify(state))}
function uid(){return 'custom-'+Date.now()+'-'+Math.random().toString(36).slice(2,7)}
function itemEntries(d=dept){return Object.entries(state).filter(([,x])=>x.dept===d&&!x.removed)}
function build(){
  Object.entries(names).forEach(([d,arr])=>arr.forEach((name,i)=>{
    const id=d+'-'+i;
    if(!state[id]) state[id]={id,dept:d,name,code:String(100000+i+(Object.keys(names).indexOf(d)*1000)).padStart(6,'0'),unit:d==='Carni'||d==='Pesce'?'kg':'pz',caseSize:d==='Forneria'?10:(d==='Carni'||d==='Pesce'?5:6),expected:12+(i%7)*2,stockUnits:4+(i%5),risk:i%17===0,offerType:i%13===0?'offer':'',offerFrom:'2026-07-20',offerTo:'2026-08-02'};
  }));save();
}
function isoToday(){return new Date().toISOString().slice(0,10)}
function offerActive(x){const t=isoToday();return !!x.offerType&&(!x.offerFrom||x.offerFrom<=t)&&(!x.offerTo||x.offerTo>=t)}
function factor(){return {Debole:.8,Forte:1.25,Prefestivo:1.35,Festivo:1.5,'Post-festivo':.75,Normale:1}[document.querySelector('#dayType').value]}
function calc(x){
  const promo=offerActive(x)?(x.offerType==='member'?1.3:1.2):1;
  const demand=Math.max(0,Math.ceil(x.expected*factor()*promo));
  const missing=Math.max(0,demand-x.stockUnits);
  const cases=Math.ceil(missing/Math.max(.1,x.caseSize));
  return {demand,missing,cases,orderedUnits:cases*x.caseSize};
}
function todayInfo(){const d=new Date();document.querySelector('#today').textContent=d.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});document.querySelector('#calendarBanner').textContent=holidays.includes(isoToday())?'Oggi è festivo: la previsione è maggiorata.':'Calendario attivo: festività, offerte e offerte soci restano separate nello storico.'}
function renderNav(){const n=document.querySelector('#departments');n.innerHTML='';Object.keys(names).forEach(d=>{const b=document.createElement('button');b.className='dept'+(d===dept?' active':'');b.textContent=`${d} (${itemEntries(d).length})`;b.onclick=()=>{dept=d;render()};n.appendChild(b)})}
function visible(){return itemEntries().map(([id,x])=>({id,...x})).filter(x=>mode==='all'||x.risk||x.offerType||calc(x).cases>0)}
function badge(x){if(!x.offerType)return '';const active=offerActive(x);const cls=x.offerType==='member'?'offerBlueText':'offerRedText';const label=x.offerType==='member'?'OFFERTA SOCI':'OFFERTA';return `<span class='${cls}'>${label}${active?'':' (fuori data)'}</span>`}
function render(){
  renderNav();const all=itemEntries().map(([id,x])=>({id,...x})),v=visible();
  document.querySelector('#countItems').textContent=`${all.length} articoli`;
  document.querySelector('#countPromo').textContent=`${all.filter(x=>x.offerType).length} promozioni`;
  document.querySelector('#countCheck').textContent=`${v.length} da controllare`;
  const list=document.querySelector('#list');list.innerHTML='';
  if(!v.length){list.innerHTML='<div class="empty">Nessuna eccezione.</div>';return}
  v.forEach(x=>{const c=calc(x);const el=document.createElement('article');el.className='item';el.innerHTML=`<div><div class='titleRow'><h3>${x.name}</h3><button class='pencil' title='Modifica'>✏️</button></div><div class='meta'><span>Codice ${x.code}</span><span>Cartone: ${x.caseSize} ${x.unit}</span><span>Vendite attese: ${c.demand}</span><span>Scorta: ${x.stockUnits}</span>${badge(x)}</div><div class='calcLine'>Mancano <strong>${c.missing}</strong> ${x.unit} → ordina <strong>${c.cases} colli</strong> (${c.orderedUnits} ${x.unit})</div></div><div class='qty'><button data-minus>−</button><strong>${c.cases}</strong><button data-plus>+</button></div>`;
    el.querySelector('.pencil').onclick=()=>openEdit(x.id);
    el.querySelector('[data-minus]').onclick=()=>{x.stockUnits+=x.caseSize;state[x.id].stockUnits=x.stockUnits;save();render()};
    el.querySelector('[data-plus]').onclick=()=>{x.stockUnits=Math.max(0,x.stockUnits-x.caseSize);state[x.id].stockUnits=x.stockUnits;save();render()};
    list.appendChild(el);
  });
}
function fillDeptSelect(){const s=document.querySelector('#editDept');s.innerHTML=Object.keys(names).map(d=>`<option>${d}</option>`).join('')}
function openEdit(id=''){
  selectedOffer='';document.querySelector('#editForm').reset();document.querySelector('#editId').value=id;document.querySelector('#removeBtn').style.display=id?'inline-block':'none';
  let x=id?state[id]:{dept,name:'',code:'',unit:'pz',caseSize:6,expected:12,stockUnits:0,offerType:'',offerFrom:'',offerTo:''};
  document.querySelector('#editTitle').textContent=id?'Modifica articolo':'Aggiungi articolo';
  document.querySelector('#editName').value=x.name||'';document.querySelector('#editDept').value=x.dept||dept;document.querySelector('#editCode').value=x.code||'';document.querySelector('#editUnit').value=x.unit||'pz';document.querySelector('#editCaseSize').value=x.caseSize||1;document.querySelector('#editExpected').value=x.expected||0;document.querySelector('#editStockUnits').value=x.stockUnits||0;document.querySelector('#offerFrom').value=x.offerFrom||'';document.querySelector('#offerTo').value=x.offerTo||'';selectedOffer=x.offerType||'';paintOffer();document.querySelector('#editDialog').showModal();
}
function paintOffer(){document.querySelector('#offerBtn').classList.toggle('selected',selectedOffer==='offer');document.querySelector('#memberOfferBtn').classList.toggle('selected',selectedOffer==='member')}
function copyList(){return itemEntries().map(([id,x])=>({id,...x,...calc(x)})).filter(x=>x.cases>0)}
function showCopy(){const arr=copyList();if(!arr.length)return;copyIndex=Math.max(0,Math.min(copyIndex,arr.length-1));const x=arr[copyIndex];document.querySelector('#copyCard').innerHTML=`<div class='copyCard'><div>${copyIndex+1} di ${arr.length}</div><h2>${x.name}</h2><div class='code'>Codice ${x.code}</div><div class='bigQty'>${x.cases}</div><div>COLLI · ${x.caseSize} ${x.unit} per collo</div>${badge(x)}</div>`}

fillDeptSelect();build();todayInfo();render();
document.querySelector('#exceptionsBtn').onclick=()=>{mode='exceptions';render()};
document.querySelector('#allBtn').onclick=()=>{mode='all';render()};
document.querySelector('#addBtn').onclick=()=>openEdit('');
document.querySelector('#closeEdit').onclick=document.querySelector('#cancelEdit').onclick=()=>document.querySelector('#editDialog').close();
document.querySelector('#offerBtn').onclick=()=>{selectedOffer=selectedOffer==='offer'?'':'offer';paintOffer()};
document.querySelector('#memberOfferBtn').onclick=()=>{selectedOffer=selectedOffer==='member'?'':'member';paintOffer()};
document.querySelector('#editForm').onsubmit=e=>{e.preventDefault();const oldId=document.querySelector('#editId').value;const id=oldId||uid();state[id]={...(state[id]||{}),id,dept:document.querySelector('#editDept').value,name:document.querySelector('#editName').value.trim(),code:document.querySelector('#editCode').value.trim(),unit:document.querySelector('#editUnit').value,caseSize:Number(document.querySelector('#editCaseSize').value),expected:Number(document.querySelector('#editExpected').value),stockUnits:Number(document.querySelector('#editStockUnits').value),offerType:selectedOffer,offerFrom:document.querySelector('#offerFrom').value,offerTo:document.querySelector('#offerTo').value,risk:false};save();document.querySelector('#editDialog').close();render()};
document.querySelector('#removeBtn').onclick=()=>{const id=document.querySelector('#editId').value;if(id&&confirm('Rimuovere questo articolo?')){state[id].removed=true;save();document.querySelector('#editDialog').close();render()}};
document.querySelector('#copyBtn').onclick=()=>{copyIndex=0;showCopy();if(copyList().length)document.querySelector('#copyDialog').showModal()};
document.querySelector('#nextCopy').onclick=()=>{copyIndex++;if(copyIndex>=copyList().length)document.querySelector('#copyDialog').close();else showCopy()};
document.querySelector('#prevCopy').onclick=()=>{copyIndex--;showCopy()};
document.querySelector('#skipCopy').onclick=()=>{copyIndex++;if(copyIndex>=copyList().length)document.querySelector('#copyDialog').close();else showCopy()};
document.querySelector('#dayType').onchange=render;
document.querySelector('#resetBtn').onclick=()=>{localStorage.removeItem(key);location.reload()};
