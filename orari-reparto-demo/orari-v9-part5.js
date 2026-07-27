const TELEGRAM_CFG='orari_telegram_config_v1';
let telegramRequests=[];
let telegramLoading=false;
let telegramError='';
S.availabilityBlocks=S.availabilityBlocks||[];

function telegramConfig(){
  try{return JSON.parse(localStorage.getItem(TELEGRAM_CFG)||'{}')}catch{return{}}
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
  telegramError='';
  requestsPage();
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
  if(!cfg.url||!cfg.key){requestsPage();return}
  telegramLoading=true;telegramError='';requestsPage();
  try{
    const data=await requestJsonp(cfg.url+'?key='+encodeURIComponent(cfg.key));
    if(!data?.ok)throw new Error(data?.error||'Risposta non valida');
    telegramRequests=Array.isArray(data.requests)?data.requests:[];
  }catch(err){telegramError=err.message||String(err)}
  telegramLoading=false;requestsPage();
}
function isoFromItalianDate(value){
  const m=String(value||'').match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m?`${m[3]}-${m[2]}-${m[1]}`:'';
}
function normalizeEmployeeName(requestName){
  const n=String(requestName||'').trim().toLowerCase();
  const exact=S.employees.find(e=>e.name.toLowerCase()===n);
  if(exact)return exact.name;
  const first=n.split(/\s+/)[0];
  const byFirst=S.employees.find(e=>e.name.toLowerCase().split(/\s+/)[0]===first);
  return byFirst?.name||requestName;
}
function blockRange(period){
  if(period==='Mattina')return[0,13*60+30];
  if(period==='Pomeriggio')return[13*60,18*60];
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
    if(day.cr&&blockedAt(day.cr.name,day.date,day.cr.start,day.cr.end)){
      day.cr.note+=' · indisponibilità da gestire';
    }
  });
  return ds;
}
function localRequestStatus(id){
  const r=telegramRequests.find(x=>String(x.id)===String(id));
  return r?.status||'';
}
async function sendRequestDecision(id,status){
  const cfg=telegramConfig();
  const req=telegramRequests.find(x=>String(x.id)===String(id));
  if(!cfg.url||!cfg.key||!req)return;
  const form=new URLSearchParams({action:'status',key:cfg.key,id:String(id),status});
  try{
    await fetch(cfg.url,{method:'POST',mode:'no-cors',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form.toString()});
    req.status=status;
    if(status==='Approvata')applyApprovedRequest(req);
    requestsPage();
    setTimeout(loadTelegramRequests,900);
  }catch(err){alert('Invio non riuscito: '+err.message)}
}
function applyApprovedRequest(req){
  const date=isoFromItalianDate(req.dateRequested);
  const period=req.blockedPeriod;
  const name=normalizeEmployeeName(req.name);
  if(!date||!period||period==='Da verificare'){
    alert('Richiesta approvata nel Foglio, ma data o fascia devono essere verificate manualmente.');
    return;
  }
  const exists=S.availabilityBlocks.some(x=>x.requestId===String(req.id));
  if(!exists)S.availabilityBlocks.push({requestId:String(req.id),name,date,period,source:'Telegram'});
  save();
  week=mon(new Date(date+'T12:00:00'));
  alert(`${name}: ${period.toLowerCase()} bloccata il ${req.dateRequested}. L’orario è stato ricalcolato.`);
}
function removeAvailabilityBlock(i){
  S.availabilityBlocks.splice(i,1);save();requestsPage();
}
function requestsPage(){
  const cfg=telegramConfig();
  const connected=Boolean(cfg.url&&cfg.key);
  const pending=telegramRequests.filter(r=>r.status==='Da approvare');
  $('#app').innerHTML=`
    <div class="card connection">
      <div class="row wrap"><div><h2>Richieste Telegram</h2><small class="muted">Il collegamento resta salvato solo in questo browser.</small></div>${connected?'<span class="request-status">Collegato</span>':'<span class="request-status pending">Da collegare</span>'}</div>
      <div class="form">
        <label>URL Apps Script<input id="tgUrl" placeholder="https://script.google.com/macros/s/.../exec" value="${esc(cfg.url||'')}"></label>
        <label>Chiave amministratore<input id="tgKey" type="password" placeholder="Chiave salvata nelle Proprietà script" value="${esc(cfg.key||'')}"></label>
        <div class="grid"><button class="btn primary" onclick="saveTelegramConfig()">Salva e collega</button><button class="btn" onclick="clearTelegramConfig()">Scollega</button></div>
      </div>
    </div>
    ${connected?`<div class="card"><div class="row"><h3>Richieste ricevute</h3><button class="btn small" onclick="loadTelegramRequests()">Aggiorna</button></div>${telegramLoading?'<p><span class="spinner"></span>Caricamento…</p>':''}${telegramError?`<p class="bad"><b>${esc(telegramError)}</b></p>`:''}${!telegramLoading&&!telegramError&&!telegramRequests.length?'<p class="muted">Nessuna richiesta disponibile.</p>':''}</div>`:''}
    ${telegramRequests.map(r=>`<div class="card request-card"><div class="row wrap"><div><b>${esc(r.name)}</b><br><small>${esc(r.username||'')}</small></div><span class="request-status ${r.status==='Da approvare'?'pending':''}">${esc(r.status)}</span></div><div class="request-message">“${esc(r.message)}”</div><div class="grid"><div><small>Data</small><br><b>${esc(r.dateRequested)}</b></div><div><small>Fascia bloccata</small><br><b>${esc(r.blockedPeriod)}</b></div></div>${r.status==='Da approvare'?`<div class="request-actions"><button class="btn primary" onclick="sendRequestDecision('${esc(r.id)}','Approvata')">Approva e ricalcola</button><button class="btn danger" onclick="sendRequestDecision('${esc(r.id)}','Rifiutata')">Rifiuta</button></div>`:''}</div>`).join('')}
    <div class="card"><h3>Indisponibilità approvate nell’app</h3>${S.availabilityBlocks.length?S.availabilityBlocks.map((x,i)=>`<div class="req"><span><b>${esc(x.name)}</b><br><small>${esc(x.date)} · ${esc(x.period)}</small></span><button class="btn danger small" onclick="removeAvailabilityBlock(${i})">Elimina</button></div>`).join(''):'<p class="muted">Nessuna indisponibilità applicata.</p>'}</div>`;
}
