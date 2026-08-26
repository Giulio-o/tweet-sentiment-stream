// Pulsante esplicito: Google Sheets -> browser. Il cloud e' la fonte autorevole.
async function loadDataFromGoogleSheets(){
  const cfg=telegramConfig();
  if(!cfg.url||!cfg.key){
    alert('Prima collega Apps Script nella sezione Richieste.');
    go('requests');
    return;
  }
  if(!confirm('Caricare i dati da Google Sheets?\n\nI dati del PDV presenti nel foglio sostituiranno la copia locale di questo browser.'))return;
  await syncPdvCloudAuthoritative();
  if(!pdvCloudError){
    alert('Dati caricati da Google Sheets.');
  }
}

function installGoogleSheetsLoadButton(){
  const cards=[...document.querySelectorAll('#app .card')];
  const card=cards.find(c=>String(c.querySelector('h3')?.textContent||'').includes('Archivio e sincronizzazione'));
  if(!card)return;
  const actions=card.querySelector('.pdv-actions');
  if(!actions)return;

  // Rende inequivocabile la direzione della sincronizzazione in lettura.
  const oldSync=[...actions.querySelectorAll('button')].find(b=>String(b.getAttribute('onclick')||'').includes('syncPdvCloud'));
  if(oldSync)oldSync.remove();

  if(!actions.querySelector('[data-google-load="1"]')){
    const btn=document.createElement('button');
    btn.className='btn primary';
    btn.type='button';
    btn.dataset.googleLoad='1';
    btn.textContent='↓ Carica dati da Google Sheets';
    btn.onclick=loadDataFromGoogleSheets;
    actions.prepend(btn);
  }

  const help=card.querySelector('.google-sheets-load-help');
  if(!help){
    const p=document.createElement('p');
    p.className='muted google-sheets-load-help';
    p.innerHTML='<b>Carica</b> = Google Sheets → questo dispositivo. <b>Salva tutti nel cloud</b> = questo dispositivo → Google Sheets.';
    actions.insertAdjacentElement('afterend',p);
  }
}

const homeBeforeGoogleSheetsButton=home;
home=function(){
  homeBeforeGoogleSheetsButton();
  installGoogleSheetsLoadButton();
};

try{if(view==='home')home()}catch(_){}
