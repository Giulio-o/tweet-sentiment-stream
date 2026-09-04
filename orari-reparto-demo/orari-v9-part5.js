const TELEGRAM_CFG='orari_telegram_config_v1';
let telegramRequests=[];
let telegramLinks=[];
let telegramLoading=false;
let telegramError='';
S.availabilityBlocks=S.availabilityBlocks||[];

function telegramConfig(){
  try{return JSON.parse(localStorage.getItem(TELEGRAM_CFG)||'{}')}catch{return{}}
}
function refreshTelegramView(){
  nav();
  if(view==='requests')requestsPage();
  else if(view==='skills')skills();
}
function saveTelegramConfig(){
  const url=String($('#tgUrl')?.value||'').trim();
  const keyValue=String($('#tgKey')?.value||'').trim();
  if(!url.endsWith('/exec')){alert('L’URL Apps Script deve terminare con /exec');return}
  if(!keyValue){alert('Inserisci la chiave amministratore');return}
  localStorage.setItem(TELEGRAM_CFG,JSON.stringify({url,key:keyValue}));
  telegramError='';
  loadTelegramRequests();
}
function clearTelegramConfig(){
  if(!confirm('Eliminare il collegamento Telegram salvato su questo dispositivo?'))return;
  localStorage.removeItem(TELEGRAM_CFG);
  telegramRequests=[];
  telegramLinks=[];
  telegramError='';
  refreshTelegramView();
}
function requestJsonp(url){
  return new Promise((resolve,reject)=>{
    const cb='tgcb_'+Date.now()+'_'+Math.floor(Math.random()*10000);
    const script=document.createElement('script');
    const timer=setTimeout(()=>{cleanup();reject(new Error('Tempo scaduto durante il collegamento'))},12000);
    function cleanup(){clearTimeout(timer);delete window[cb];script.remove()}
    window[cb]=data=>{cleanup();resolve(data)};
    script.onerror=()=>{cleanup();reject(new Error('Impossibile leggere Apps Script'))};
    script.src=url+(url.includes('?')?'&':'?')+'action=list&callback='+encodeURIComponent(cb)+'&_='+Date.now();
    document.body.appendChild(script);
  });
}
async function loadTelegramRequests(){
  const cfg=telegramConfig();
  if(!cfg.url||!cfg.key){refreshTelegramView();return}
  telegramLoading=true;telegramError='';refreshTelegramView();
  try{
    const data=await requestJsonp(cfg.url+'?key='+encodeURIComponent(cfg.key));
    if(!data?.ok)throw new Error(data?.error||'Risposta non valida');
    telegramRequests=Array.isArray(data.requests)?data.requests:[];
    telegramLinks=Array.isArray(data.links)?data.links:[];
  }catch(err){telegramError=err.message||String(err)}
  telegramLoading=false;refreshTelegramView();
}
function postTelegramAction(values){
  const cfg=telegramConfig();
  if(!cfg.url||!cfg.key)return Promise.reject(new Error('Collegamento Apps Script mancante'));
  const form=new URLSearchParams({key:cfg.key,...values});
  return fetch(cfg.url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()});
}
function isoFromItalianDate(value){
  const m=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m?`${m[3]}-${m[2]}-${m[1]}`:'';
}
function telegramLinkById(telegramId){
  return telegramLinks.find(x=>String(x.telegramId)===String(telegramId));
}
function telegramLinkForEmployee(employeeName){
  return telegramLinks.find(x=>x.employeeName===employeeName);
}
function linkedEmployeeForRequest(req){
  return telegramLinkById(req.telegramId)?.employeeName||'';
}
function blockRange(period){
  if(period==='Mattina')return[0,13*60+30];
  if(period==='Pomeriggio')return[13*60+30,18*60];
  if(period==='Sera')return[17*60,24*60];
  return[0,24*60];
}
function blockedAt(name,date,start,end){
  const a=mins(start),b=mins(end);
  return S.availabilityBlocks.some(x=>x.name===name&&x.date===key(date)&&(()=>{const[r1,r2]=blockRange(x.period);return a<r2&&b>r1})());
}
function replacementSkill(s){
  const text=String(s.skill||'');
  if(text.includes('Forno'))return'Forno';
  if(text.includes('Ordini'))return'Ordini';
  if(text.includes('Macelleria'))return'Macelleria';
  if(text.includes('pesce'))return'Pescheria';
  return'Servizio';
}
function replacementDept(dep,s){
  if(replacementSkill(s)==='Macelleria')return'carni';
  if(replacementSkill(s)==='Pescheria')return'gastronomia';
  return dep==='c'?'carni':'gastronomia';
}
function shiftBusyInDay(day,name,start,end,current){
  const a=mins(start),b=mins(end),all=[...day.g,...day.c];
  if(day.cr)all.push(day.cr);
  return all.some(s=>s!==current&&s.name===name&&shiftSegments(s).some(([x,y])=>a<y&&b>x));
}
function findReplacement(day,dep,s){
  const skill=replacementSkill(s),d=day.date,start=s.start,end=s.end,dept=replacementDept(dep,s);
  let pool=skill==='Macelleria'?S.employees.filter(e=>e.skills?.Macelleria>=2):staff(dept).filter(e=>(e.skills?.[skill]||0)>0);
  pool=pool.filter(e=>e.name!==s.name&&!leave(e.name,d)&&!blockedAt(e.name,d,start,end)&&!shiftBusyInDay(day,e.name,start,end,s));
  pool.sort((a,b)=>(b.skills?.[skill]||0)-(a.skills?.[skill]||0));
  return pool[0]?.name||'SCOPERTO';
}
function applyAvailabilityBlocks(ds){
  ds.forEach(day=>{
    ['g','c'].forEach(dep=>day[dep].forEach(s=>{
      if(s.name!=='SCOPERTO'&&blockedAt(s.name,day.date,s.start,s.end)){
        s.blockedOriginal=s.name;
        s.name=findReplacement(day,dep,s);
        s.skill=`${s.skill} · sostituzione ${s.blockedOriginal}`;
      }
    }));
    if(day.cr&&blockedAt(day.cr.name,day.date,day.cr.start,day.cr.end))day.cr.note+=' · indisponibilità da gestire';
  });
  return ds;
}
async function associateTelegramRequest(id){
  const req=telegramRequests.find(x=>String(x.id)===String(id));
  const employeeName=String($(`#assoc-${id}`)?.value||'').trim();
  if(!req||!req.telegramId){alert('Telegram ID non disponibile per questa richiesta');return}
  if(!employeeName){alert('Seleziona l’addetto corretto');return}
  const previousForId=telegramLinkById(req.telegramId);
  const previousForEmployee=telegramLinkForEmployee(employeeName);
  const conflicts=[previousForId?.employeeName,previousForEmployee?.employeeName].filter(Boolean);
  if(conflicts.length&&!confirm(`Il nuovo collegamento sostituirà quello esistente.\n\nCollegare questo profilo Telegram a ${employeeName}?`))return;
  try{
    await postTelegramAction({action:'associate',telegramId:String(req.telegramId),employeeName,username:req.username||'',telegramName:req.telegramName||req.name||''});
    telegramLinks=telegramLinks.filter(x=>String(x.telegramId)!==String(req.telegramId)&&x.employeeName!==employeeName);
    telegramLinks.push({telegramId:String(req.telegramId),employeeName,username:req.username||'',telegramName:req.telegramName||req.name||''});
    S.availabilityBlocks.forEach(x=>{if(String(x.telegramId||'')===String(req.telegramId))x.name=employeeName});
    save();refreshTelegramView();setTimeout(loadTelegramRequests,900);
  }catch(err){alert('Associazione non riuscita: '+err.message)}
}
async function unlinkTelegramId(telegramId,employeeName){
  if(!confirm(`Disassociare il profilo Telegram da ${employeeName}?\n\nLe indisponibilità già approvate restano nell’orario. I prossimi messaggi risulteranno non associati.`))return;
  try{
    await postTelegramAction({action:'unlink',telegramId:String(telegramId)});
    telegramLinks=telegramLinks.filter(x=>String(x.telegramId)!==String(telegramId));
    refreshTelegramView();setTimeout(loadTelegramRequests,900);
  }catch(err){alert('Disassociazione non riuscita: '+err.message)}
}
async function sendRequestDecision(id,status){
  const req=telegramRequests.find(x=>String(x.id)===String(id));
  if(!req)return;
  const employeeName=linkedEmployeeForRequest(req);
  if(status==='Approvata'&&!employeeName){alert('Prima associa il profilo Telegram a un addetto');return}
  try{
    await postTelegramAction({action:'status',id:String(id),status});
    req.status=status;
    if(status==='Approvata')applyApprovedRequest(req,employeeName);
    refreshTelegramView();setTimeout(loadTelegramRequests,900);
  }catch(err){alert('Invio non riuscito: '+err.message)}
}
function applyApprovedRequest(req,employeeName){
  const date=isoFromItalianDate(req.dateRequested),period=req.blockedPeriod;
  if(!date||!period||period==='Da verificare'){
    alert('Richiesta approvata nel Foglio, ma data o fascia devono essere verificate manualmente.');
    return;
  }
  const exists=S.availabilityBlocks.some(x=>x.requestId===String(req.id));
  if(!exists)S.availabilityBlocks.push({requestId:String(req.id),telegramId:String(req.telegramId||''),name:employeeName,date,period,source:'Telegram'});
  else S.availabilityBlocks.forEach(x=>{if(x.requestId===String(req.id)){x.telegramId=String(req.telegramId||'');x.name=employeeName;x.date=date;x.period=period}});
  save();week=mon(new Date(date+'T12:00:00'));
  alert(`${employeeName}: ${period.toLowerCase()} bloccata il ${req.dateRequested}. L’orario è stato ricalcolato.`);
}
function removeAvailabilityBlock(i){S.availabilityBlocks.splice(i,1);save();requestsPage()}
function employeeOptions(selected=''){
  return ['<option value="">Seleziona addetto…</option>',...S.employees.map(e=>`<option value="${esc(e.name)}" ${e.name===selected?'selected':''}>${esc(e.name)}</option>`)].join('');
}
function requestAssociationHtml(r){
  const link=telegramLinkById(r.telegramId);
  if(link)return`<div class="telegram-linked"><div><b>Associato a ${esc(link.employeeName)}</b><br><small>${esc(link.telegramName||r.telegramName||r.name||'Profilo Telegram')} ${link.username?`· ${esc(link.username)}`:''}</small></div><button class="btn danger small" onclick="unlinkTelegramId('${esc(r.telegramId)}','${esc(link.employeeName)}')">Disassocia</button></div>`;
  return`<div class="associate-box"><b>Addetto non associato</b><small>Seleziona una volta il nome corretto. I messaggi successivi saranno riconosciuti tramite Telegram ID.</small><div class="associate-row"><select id="assoc-${esc(r.id)}">${employeeOptions()}</select><button class="btn primary" onclick="associateTelegramRequest('${esc(r.id)}')">Associa</button></div></div>`;
}
function requestsPage(){
  const cfg=telegramConfig(),connected=Boolean(cfg.url&&cfg.key);
  $('#app').innerHTML=`
    <div class="card connection">
      <div class="row wrap"><div><h2>Richieste Telegram</h2><small class="muted">URL e chiave restano salvati solo in questo browser.</small></div>${connected?'<span class="request-status">Collegato</span>':'<span class="request-status pending">Da collegare</span>'}</div>
      <div class="form">
        <label>URL Apps Script<input id="tgUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(cfg.url||'')}"></label>
        <label>Chiave amministratore<input id="tgKey" type="password" placeholder="Chiave salvata nelle Proprietà script" value="${esc(cfg.key||'')}"></label>
        <div class="grid"><button class="btn primary" onclick="saveTelegramConfig()">Salva e collega</button><button class="btn" onclick="clearTelegramConfig()">Scollega</button></div>
      </div>
    </div>
    ${connected?`<div class="card"><div class="row"><h3>Richieste ricevute</h3><button class="btn small" onclick="loadTelegramRequests()">Aggiorna</button></div>${telegramLoading?'<p><span class="spinner"></span>Caricamento…</p>':''}${telegramError?`<p class="bad"><b>${esc(telegramError)}</b></p>`:''}${!telegramLoading&&!telegramError&&!telegramRequests.length?'<p class="muted">Nessuna richiesta disponibile.</p>':''}</div>`:''}
    ${telegramRequests.map(r=>{const employeeName=linkedEmployeeForRequest(r);return`<div class="card request-card"><div class="row wrap"><div><b>${esc(r.telegramName||r.name||'Profilo Telegram')}</b><br><small>${esc(r.username||'Senza username')}</small></div><span class="request-status ${r.status==='Da approvare'?'pending':''}">${esc(r.status)}</span></div><div class="request-message">“${esc(r.message)}”</div>${requestAssociationHtml(r)}<div class="grid"><div><small>Data</small><br><b>${esc(r.dateRequested)}</b></div><div><small>Fascia bloccata</small><br><b>${esc(r.blockedPeriod)}</b></div></div>${r.status==='Da approvare'?`<div class="request-actions">${employeeName?`<button class="btn primary" onclick="sendRequestDecision('${esc(r.id)}','Approvata')">Approva per ${esc(employeeName)}</button>`:'<button class="btn" disabled>Associa prima l’addetto</button>'}<button class="btn danger" onclick="sendRequestDecision('${esc(r.id)}','Rifiutata')">Rifiuta</button></div>`:''}</div>`}).join('')}
    <div class="card"><h3>Indisponibilità approvate nell’app</h3>${S.availabilityBlocks.length?S.availabilityBlocks.map((x,i)=>`<div class="req"><span><b>${esc(x.name)}</b><br><small>${esc(x.date)} · ${esc(x.period)}</small></span><button class="btn danger small" onclick="removeAvailabilityBlock(${i})">Elimina</button></div>`).join(''):'<p class="muted">Nessuna indisponibilità applicata.</p>'}</div>`;
}
