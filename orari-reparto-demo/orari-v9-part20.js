// Salvataggio esplicito + autosalvataggio Google Sheets.
function updateCloudStatusBadge(){
  const badge=document.querySelector('.sync-status');
  if(badge)badge.textContent=pdvCloudStatus||'';
}

async function saveDataToGoogleSheets(){
  const cfg=telegramConfig();
  if(!cfg.url||!cfg.key){
    alert('Prima collega Apps Script nella sezione Richieste.');
    go('requests');
    return;
  }
  try{
    // Aggiorna prima lo stato del PDV corrente in memoria locale.
    const p=currentPdv();
    if(!p)throw new Error('PDV non disponibile');
    p.state=cloneJson(normalizePdvState(S));
    p.updatedAt=pdvNow();
    persistPdvDb();
    localStorage.setItem(STORE,JSON.stringify(S));

    clearTimeout(pdvCloudTimer);
    pdvCloudStatus='Salvataggio su Google Sheets…';
    pdvCloudError='';
    updateCloudStatusBadge();
    await cloudSavePdv(p);
    pdvDb.cloudEnabled=true;
    persistPdvDb();
    pdvCloudStatus='Salvato su Google Sheets · '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
    pdvCloudError='';
    updateCloudStatusBadge();
    alert('Dati salvati su Google Sheets.');
  }catch(err){
    pdvCloudError=err?.message||String(err);
    pdvCloudStatus='Errore durante il salvataggio';
    updateCloudStatusBadge();
    alert('Salvataggio non riuscito: '+pdvCloudError);
  }
}

// Rende visibile lo stato dell'autosalvataggio senza cambiare schermata mentre si lavora.
schedulePdvCloudSave=function(){
  clearTimeout(pdvCloudTimer);
  pdvCloudStatus='Modifiche da salvare…';
  updateCloudStatusBadge();
  pdvCloudTimer=setTimeout(async()=>{
    try{
      pdvCloudStatus='Salvataggio automatico…';
      updateCloudStatusBadge();
      await cloudSavePdv(currentPdv());
      pdvCloudStatus='Salvato automaticamente · '+new Date().toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});
      pdvCloudError='';
      updateCloudStatusBadge();
    }catch(err){
      pdvCloudError=err?.message||String(err);
      pdvCloudStatus='Errore autosalvataggio';
      updateCloudStatusBadge();
    }
  },1200);
};

function installGoogleSheetsSaveButton(){
  const cards=[...document.querySelectorAll('#app .card')];
  const card=cards.find(c=>String(c.querySelector('h3')?.textContent||'').includes('Archivio e sincronizzazione'));
  if(!card)return;
  const actions=card.querySelector('.pdv-actions');
  if(!actions)return;

  // Sostituisce il vecchio comando generico con una direzione chiara.
  [...actions.querySelectorAll('button')].forEach(b=>{
    if(String(b.getAttribute('onclick')||'').includes('pushAllPdvsCloud'))b.remove();
  });

  if(!actions.querySelector('[data-google-save="1"]')){
    const btn=document.createElement('button');
    btn.className='btn';
    btn.type='button';
    btn.dataset.googleSave='1';
    btn.textContent='↑ Salva dati su Google Sheets';
    btn.onclick=saveDataToGoogleSheets;
    const loadBtn=actions.querySelector('[data-google-load="1"]');
    if(loadBtn)loadBtn.insertAdjacentElement('afterend',btn);else actions.prepend(btn);
  }

  const help=card.querySelector('.google-sheets-load-help');
  if(help)help.innerHTML='<b>Carica</b> = Google Sheets → dispositivo. <b>Salva</b> = dispositivo → Google Sheets. Dopo il primo collegamento al cloud, ogni modifica viene anche <b>salvata automaticamente</b> dopo circa 1 secondo.';
}

const homeBeforeGoogleSheetsSave=home;
home=function(){
  homeBeforeGoogleSheetsSave();
  installGoogleSheetsSaveButton();
};

try{if(view==='home')home()}catch(_){}
