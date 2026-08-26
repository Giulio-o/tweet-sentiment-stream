// Cloud-first sync: Google Sheets is authoritative for PDVs that already exist remotely.
const syncPdvCloudLegacy = typeof syncPdvCloud === 'function' ? syncPdvCloud : null;

async function syncPdvCloudAuthoritative(){
  try{
    const cfg=telegramConfig();
    if(!cfg.url||!cfg.key){
      pdvCloudStatus='Inserisci la chiave amministratore';
      pdvCloudError='';
      try{render()}catch(_){}
      return;
    }
    pdvCloudStatus='Sincronizzazione cloud…';
    pdvCloudError='';
    try{render()}catch(_){}

    const data=await pdvJsonp('pdv_list');
    if(!data?.ok||!Array.isArray(data.pdvs))throw new Error(data?.error||'Archivio cloud non disponibile');

    if(!data.pdvs.length){
      // Cloud vuoto: il dispositivo corrente diventa il primo seed.
      await pushAllPdvsCloud();
      return;
    }

    const localPdvs=Array.isArray(pdvDb?.pdvs)?pdvDb.pdvs:[];
    const remoteIds=new Set(data.pdvs.map(x=>String(x.id||'')));
    const remotePdvs=data.pdvs.map(cp=>({
      id:cp.id,
      name:cp.name||cp.id,
      code:cp.code||'',
      notes:cp.notes||'',
      updatedAt:cp.updatedAt||pdvNow(),
      state:normalizePdvState(cp.state||{})
    }));
    // Conserva eventuali PDV creati solo localmente, ma per gli ID esistenti nel cloud vince sempre il cloud.
    const localOnly=localPdvs.filter(lp=>!remoteIds.has(String(lp.id||'')));
    const previousActive=pdvDb?.activeId||'PDV_001';
    pdvDb.pdvs=[...remotePdvs,...localOnly];
    pdvDb.activeId=pdvDb.pdvs.some(p=>p.id===previousActive)?previousActive:(pdvDb.pdvs[0]?.id||'PDV_001');
    pdvDb.cloudEnabled=true;
    persistPdvDb();
    loadPdvIntoState(currentPdv());
    pdvCloudStatus='Cloud sincronizzato · Google Sheets è la memoria principale';
    pdvCloudError='';
    try{render()}catch(_){}
    if(telegramConfig().url)loadTelegramRequests();
  }catch(err){
    pdvCloudError=err?.message||String(err);
    pdvCloudStatus='Dati locali · cloud non raggiungibile';
    if(pdvDb){pdvDb.cloudEnabled=false;persistPdvDb()}
    try{render()}catch(_){}
  }
}

// Sostituisce il merge basato solo su updatedAt, che su un nuovo browser poteva far vincere un PDV locale appena creato.
syncPdvCloud=syncPdvCloudAuthoritative;

if(typeof saveTelegramConfig==='function'){
  const saveTelegramConfigBeforeCloud=saveTelegramConfig;
  saveTelegramConfig=function(){
    saveTelegramConfigBeforeCloud();
    setTimeout(()=>{
      const cfg=telegramConfig();
      if(cfg.url&&cfg.key)syncPdvCloudAuthoritative();
    },500);
  };
}

// Se questo browser è già collegato, carica automaticamente il cloud all'apertura.
setTimeout(()=>{
  try{
    const cfg=telegramConfig();
    if(cfg.url&&cfg.key)syncPdvCloudAuthoritative();
  }catch(_){}
},700);
