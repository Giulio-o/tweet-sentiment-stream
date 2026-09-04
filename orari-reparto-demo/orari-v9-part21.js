// PDV 1 / negozio 349: non mostrare mai l'organico demo legacy come se fosse reale.
// Google Sheets resta la fonte autorevole; questo e' solo un fallback locale sicuro quando il cloud non e' raggiungibile.
const PDV1_REAL_STAFF_FALLBACK=[
  {name:'Giulio CR',hours:38,cr:true,dept:'misto',skills:{Forno:3,Ordini:3,Servizio:3,Macelleria:3,Pescheria:3}},
  {name:'Marine',hours:38,dept:'gastronomia',skills:{Forno:3,Ordini:3,Servizio:3,Macelleria:0,Pescheria:2}},
  {name:'Katia ',hours:40,dept:'gastronomia',skills:{Forno:3,Ordini:3,Servizio:3,Macelleria:0,Pescheria:3}},
  {name:'Antonio',hours:24,dept:'gastronomia',skills:{Forno:3,Ordini:3,Servizio:3,Macelleria:0,Pescheria:1}},
  {name:'Miriam',hours:24,dept:'gastronomia',skills:{Forno:3,Ordini:3,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Massimo',hours:20,dept:'gastronomia',skills:{Forno:0,Ordini:0,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Maia',hours:20,dept:'gastronomia',skills:{Forno:0,Ordini:0,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Stefano',hours:38,dept:'gastronomia',skills:{Forno:3,Ordini:3,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Gabriele',hours:40,dept:'carni',skills:{Forno:0,Ordini:0,Servizio:3,Macelleria:3,Pescheria:2}},
  {name:'Gianmarco',hours:20,dept:'carni',skills:{Forno:0,Ordini:0,Servizio:3,Macelleria:3,Pescheria:1}}
];
const PDV1_LEGACY_DEMO_NAMES=new Set(['Marco','Elena','Luca','Sara','Andrea','Paola','Chiara','Lorenzo']);

function pdv1HasLegacyDemoRoster(){
  if(!(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001'))return false;
  const names=(S?.employees||[]).map(e=>String(e.name||'').trim());
  const legacyHits=names.filter(n=>PDV1_LEGACY_DEMO_NAMES.has(n)).length;
  const realHits=names.filter(n=>PDV1_REAL_STAFF_FALLBACK.some(e=>String(e.name).trim()===n)).length;
  return legacyHits>=4 && realHits<=2;
}

function installPdv1RealStaffFallback(){
  if(!pdv1HasLegacyDemoRoster())return false;
  S.employees=JSON.parse(JSON.stringify(PDV1_REAL_STAFF_FALLBACK));
  const p=typeof currentPdv==='function'?currentPdv():null;
  if(p){
    p.name=p.name||'PDV 1';
    if(!String(p.code||'').trim())p.code='349';
    p.state=cloneJson(normalizePdvState(S));
    // Non aggiorniamo updatedAt: questo fallback non deve mai risultare piu' autorevole del cloud.
  }
  try{localStorage.setItem(STORE,JSON.stringify(S))}catch(_){}
  try{persistPdvDb()}catch(_){}
  pdvCloudStatus='Organico reale locale · cloud da sincronizzare';
  pdvCloudError=pdvCloudError||'Il collegamento cloud non ha risposto: i nomi demo sono stati rimossi, ma per avere telefono e PC identici va ripristinata la lettura Apps Script.';
  return true;
}

// Migrazione immediata dei vecchi browser che hanno ancora i nomi inventati.
try{
  if(installPdv1RealStaffFallback())render();
}catch(_){}

function jsonpDeploymentError(err){
  if(String(err?.message||'').includes('Tempo scaduto')){
    return new Error('Apps Script non restituisce la risposta JSONP. Il deployment va aggiornato alla versione corrente del codice.');
  }
  return err;
}

// Messaggio di errore piu' utile quando il JSONP del deployment non richiama il callback.
if(typeof requestJsonp==='function'){
  const requestJsonpBeforePdv1Diagnostics=requestJsonp;
  requestJsonp=function(url){return requestJsonpBeforePdv1Diagnostics(url).catch(err=>{throw jsonpDeploymentError(err)})};
}
if(typeof pdvJsonp==='function'){
  const pdvJsonpBeforePdv1Diagnostics=pdvJsonp;
  pdvJsonp=function(action,params={}){return pdvJsonpBeforePdv1Diagnostics(action,params).catch(err=>{throw jsonpDeploymentError(err)})};
}
