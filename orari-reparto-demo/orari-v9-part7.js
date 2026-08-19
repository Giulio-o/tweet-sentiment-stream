const PDV_DB_KEY='orari_multi_pdv_v1';
let pdvDb=null;
let pdvRulesEditId='';
let pdvCloudStatus='Solo dispositivo';
let pdvCloudError='';
let pdvCloudTimer=null;

function cloneJson(v){return JSON.parse(JSON.stringify(v))}
function pdvNow(){return new Date().toISOString()}
function defaultPdvRules(){return{
  departments:{gastronomia:true,carni:true},
  openingTime:'08:00',closingTime:'20:45',
  minimum:{opening:3,morning:3,closing:2,sunday:3},
  rotation:{forno:2,ordini:2,chiusura:2,specialistsMorning:true,lessSkilledEvening:true},
  notes:''
}}
function blankMonthlyObjectives(){const x={};for(let i=1;i<=12;i++)x[String(i).padStart(2,'0')]={gastronomia:0,carni:0,total:0};return x}
function blankPdvState(){
  const cr=S.employees?.find(e=>e.cr)||base.find(e=>e.cr);
  return{
    employees:cr?[cloneJson(cr)]:[],leaves:[],holidays:[],edits:{},crEdits:{},availabilityBlocks:[],
    objectives:{gastronomia:0,carni:0,total:0,annual:{gastronomia:0,carni:0,total:0},monthly:blankMonthlyObjectives()},
    rules:defaultPdvRules()
  }
}
function normalizePdvState(state){
  const x={...blankPdvState(),...(state||{})};
  x.leaves=Array.isArray(x.leaves)?x.leaves:[];x.holidays=Array.isArray(x.holidays)?x.holidays:[];x.edits=x.edits||{};x.crEdits=x.crEdits||{};x.availabilityBlocks=Array.isArray(x.availabilityBlocks)?x.availabilityBlocks:[];
  x.employees=Array.isArray(x.employees)?x.employees.map(e=>({...e,skills:{Forno:0,Ordini:0,Servizio:0,Macelleria:0,Pescheria:0,...(e.skills||{})},dept:e.cr?'misto':(e.dept||'gastronomia')})):[];
  x.objectives={gastronomia:0,carni:0,total:0,...(x.objectives||{})};
  x.objectives.annual={gastronomia:0,carni:0,total:0,...(x.objectives.annual||{})};
  x.objectives.monthly=x.objectives.monthly||blankMonthlyObjectives();
  for(let i=1;i<=12;i++){const k=String(i).padStart(2,'0');x.objectives.monthly[k]={gastronomia:0,carni:0,total:0,...(x.objectives.monthly[k]||{})}}
  x.rules={...defaultPdvRules(),...(x.rules||{}),departments:{...defaultPdvRules().departments,...(x.rules?.departments||{})},minimum:{...defaultPdvRules().minimum,...(x.rules?.minimum||{})},rotation:{...defaultPdvRules().rotation,...(x.rules?.rotation||{})}};
  return x;
}
function readPdvDb(){try{return JSON.parse(localStorage.getItem(PDV_DB_KEY)||'null')}catch{return null}}
function persistPdvDb(){localStorage.setItem(PDV_DB_KEY,JSON.stringify(pdvDb))}
function currentPdv(){return pdvDb?.pdvs?.find(p=>p.id===pdvDb.activeId)||pdvDb?.pdvs?.[0]||null}
function currentPdvId(){return currentPdv()?.id||''}
function nextPdvId(){let n=1;const ids=new Set((pdvDb?.pdvs||[]).map(p=>p.id));while(ids.has('PDV_'+String(n).padStart(3,'0')))n++;return'PDV_'+String(n).padStart(3,'0')}
function initPdvDb(){
  const existing=readPdvDb();
  if(existing?.pdvs?.length){
    pdvDb=existing;pdvDb.version=2;pdvDb.cloudEnabled=Boolean(pdvDb.cloudEnabled);
    if(!pdvDb.pdvs.some(p=>p.id===pdvDb.activeId))pdvDb.activeId=pdvDb.pdvs[0].id;
    pdvDb.pdvs.forEach(p=>{p.state=normalizePdvState(p.state);p.name=p.name||p.id;p.code=p.code||'';p.notes=p.notes||'';p.updatedAt=p.updatedAt||pdvNow()});
    S=normalizePdvState(currentPdv().state);
  }else{
    S=normalizePdvState(S);S.rules=S.rules||defaultPdvRules();
    pdvDb={version:2,activeId:'PDV_001',cloudEnabled:false,pdvs:[{id:'PDV_001',name:'PDV 1',code:'',notes:'',state:cloneJson(S),updatedAt:pdvNow()}]};
  }
  localStorage.setItem(STORE,JSON.stringify(S));persistPdvDb();
}
function save(){
  if(!pdvDb){localStorage.setItem(STORE,JSON.stringify(S));return}
  const p=currentPdv();if(p){p.state=cloneJson(normalizePdvState(S));p.updatedAt=pdvNow()}
  localStorage.setItem(STORE,JSON.stringify(S));persistPdvDb();
  if(pdvDb.cloudEnabled)schedulePdvCloudSave();
}
function loadPdvIntoState(p){
  if(!p)return;S=normalizePdvState(cloneJson(p.state));pdvDb.activeId=p.id;localStorage.setItem(STORE,JSON.stringify(S));persistPdvDb();
  employeeWeekName='';telegramRequests=[];telegramLinks=[];week=mon(new Date());
}
function switchPdv(id){
  save();const p=pdvDb.pdvs.find(x=>x.id===id);if(!p)return;loadPdvIntoState(p);view='home';render();
  if(telegramConfig().url)loadTelegramRequests();
}
function createPdv(){
  save();const id=nextPdvId(),p={id,name:`PDV ${pdvDb.pdvs.length+1}`,code:'',notes:'',state:blankPdvState(),updatedAt:pdvNow()};
  pdvDb.pdvs.push(p);pdvDb.activeId=id;persistPdvDb();loadPdvIntoState(p);pdvRulesEditId=id;view='pdvRules';render();
}
function duplicatePdv(id){
  save();const src=pdvDb.pdvs.find(x=>x.id===id);if(!src)return;
  const keepStaff=confirm('Duplicare anche addetti e competenze?\n\nOK = sì\nAnnulla = nuovo PDV con solo CR');
  const state=normalizePdvState(cloneJson(src.state));
  state.leaves=[];state.edits={};state.crEdits={};state.availabilityBlocks=[];
  if(!keepStaff){const cr=state.employees.find(e=>e.cr);state.employees=cr?[cr]:[]}
  const nid=nextPdvId(),p={id:nid,name:src.name+' copia',code:'',notes:src.notes||'',state,updatedAt:pdvNow()};
  pdvDb.pdvs.push(p);pdvDb.activeId=nid;persistPdvDb();loadPdvIntoState(p);pdvRulesEditId=nid;view='pdvRules';render();
}
function deletePdv(id){
  if(pdvDb.pdvs.length<=1){alert('Deve rimanere almeno un PDV.');return}
  const p=pdvDb.pdvs.find(x=>x.id===id);if(!p)return;
  if(!confirm(`Eliminare ${p.name}?\n\nL'operazione rimuove la copia locale di questo PDV.`))return;
  pdvDb.pdvs=pdvDb.pdvs.filter(x=>x.id!==id);
  if(pdvDb.activeId===id){pdvDb.activeId=pdvDb.pdvs[0].id;loadPdvIntoState(pdvDb.pdvs[0])}
  persistPdvDb();if(pdvDb.cloudEnabled)postTelegramAction({action:'pdv_delete',pdvId:id}).catch(()=>{});view='home';render();
}
function openPdvRules(id=currentPdvId()){save();pdvRulesEditId=id;view='pdvRules';render()}
function pdvRulesPage(){
  const p=pdvDb.pdvs.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p)return;
  const r=normalizePdvState(p.state).rules||defaultPdvRules();
  $('#app').innerHTML=`<form class="form" onsubmit="savePdvRules(event,'${esc(p.id)}')">
    <div class="card"><div class="row wrap"><div><h2>${esc(p.name)}</h2><small class="muted">Identità, esigenze e regole specifiche del punto vendita.</small></div><button type="button" class="btn small" onclick="go('home')">← Home PDV</button></div>
      <div class="grid"><label>Nome PDV<input id="pdvName" value="${esc(p.name)}" required></label><label>Codice PDV<input id="pdvCode" value="${esc(p.code||'')}" placeholder="Es. 0123"></label></div>
      <label>Note del PDV<textarea id="pdvNotes" rows="4" placeholder="Caratteristiche, vincoli, particolarità...">${esc(p.notes||r.notes||'')}</textarea></label>
    </div>
    <div class="card"><h3>Reparti e orari</h3><div class="grid"><label><input id="pdvG" type="checkbox" ${r.departments.gastronomia?'checked':''}> Gastronomia presente</label><label><input id="pdvC" type="checkbox" ${r.departments.carni?'checked':''}> Carni/Pescheria presente</label><label>Apertura negozio<input id="pdvOpen" type="time" value="${esc(r.openingTime||'08:00')}"></label><label>Chiusura negozio<input id="pdvClose" type="time" value="${esc(r.closingTime||'20:45')}"></label></div></div>
    <div class="card"><h3>Esigenze minime</h3><p class="muted">Restano memorizzate nel profilo PDV e saranno usate progressivamente dal motore di copertura.</p><div class="grid"><label>Minimo apertura<input id="minOpening" type="number" min="0" value="${Number(r.minimum.opening)||0}"></label><label>Minimo mattina<input id="minMorning" type="number" min="0" value="${Number(r.minimum.morning)||0}"></label><label>Minimo chiusura<input id="minClosing" type="number" min="0" value="${Number(r.minimum.closing)||0}"></label><label>Minimo domenica<input id="minSunday" type="number" min="0" value="${Number(r.minimum.sunday)||0}"></label></div></div>
    <div class="card"><h3>Rotazioni attive</h3><p class="muted">Queste impostazioni influenzano direttamente l'alternanza automatica.</p><div class="grid"><label>Forno consecutivi<input id="rotForno" type="number" min="1" max="6" value="${Number(r.rotation.forno)||2}"></label><label>Ordini consecutivi<input id="rotOrdini" type="number" min="1" max="6" value="${Number(r.rotation.ordini)||2}"></label><label>Chiusure consecutive<input id="rotClose" type="number" min="1" max="6" value="${Number(r.rotation.chiusura)||2}"></label><label><input id="rotSpec" type="checkbox" ${r.rotation.specialistsMorning?'checked':''}> Forno/Ordini favoriti al mattino</label><label><input id="rotLess" type="checkbox" ${r.rotation.lessSkilledEvening?'checked':''}> Meno competenze = più sere</label></div></div>
    <div class="grid"><button class="btn primary" type="submit">Salva PDV</button><button class="btn" type="button" onclick="go('skills')">Gestisci addetti</button></div>
  </form>`;
}
function savePdvRules(e,id){
  e.preventDefault();const p=pdvDb.pdvs.find(x=>x.id===id);if(!p)return;
  p.name=String($('#pdvName').value||p.name).trim()||p.name;p.code=String($('#pdvCode').value||'').trim();p.notes=String($('#pdvNotes').value||'').trim();
  const state=id===currentPdvId()?S:normalizePdvState(p.state);
  state.rules={departments:{gastronomia:$('#pdvG').checked,carni:$('#pdvC').checked},openingTime:$('#pdvOpen').value||'08:00',closingTime:$('#pdvClose').value||'20:45',minimum:{opening:Number($('#minOpening').value)||0,morning:Number($('#minMorning').value)||0,closing:Number($('#minClosing').value)||0,sunday:Number($('#minSunday').value)||0},rotation:{forno:Math.max(1,Number($('#rotForno').value)||2),ordini:Math.max(1,Number($('#rotOrdini').value)||2),chiusura:Math.max(1,Number($('#rotClose').value)||2),specialistsMorning:$('#rotSpec').checked,lessSkilledEvening:$('#rotLess').checked},notes:p.notes};
  p.state=cloneJson(state);p.updatedAt=pdvNow();if(id===currentPdvId())S=state;persistPdvDb();save();view='home';render();
}
function pdvRuleBlockSize(role){const r=S.rules?.rotation||{};if(role==='Forno')return Math.max(1,Number(r.forno)||2);if(role==='Ordini')return Math.max(1,Number(r.ordini)||2);return Math.max(1,Number(r.chiusura)||2)}
function pickPairedRole(plan,role,dayIndex,lane,d,start,end,exclude=[]){
  const block=pdvRuleBlockSize(role),pair=Math.floor(dayIndex/block),planKey=`${role}-${lane}-${pair}`,pool=pairedRoleCandidates(role);if(!pool.length)return'SCOPERTO';
  const saved=plan[planKey]&&pool.find(e=>e.name===plan[planKey]);if(saved&&candidateAvailableForRole(saved,d,start,end,exclude))return saved.name;
  const base=pairedRoleBaseIndex(role,pair,lane,pool.length);for(let step=0;step<pool.length;step++){const e=pool[(base+step)%pool.length];if(candidateAvailableForRole(e,d,start,end,exclude)){plan[planKey]=e.name;return e.name}}
  return'SCOPERTO';
}
function targetMorningCount(e){const total=weeklyShiftTarget(e);if(total<=1)return total;const specialist=morningSpecialist(e),prefer=S.rules?.rotation?.specialistsMorning!==false;const ratio=specialist&&prefer?2/3:1/3;return Math.max(1,Math.min(total-1,Math.round(total*ratio)))}
function gastrShiftScore(e,skill,period,load,mix){
  const total=weeklyShiftTarget(e),targetMorning=targetMorningCount(e),targetEvening=total-targetMorning,current=mix[e.name]||{morning:0,evening:0},assigned=current.morning+current.evening,target=period==='morning'?targetMorning:targetEvening,count=period==='morning'?current.morning:current.evening,need=target-count,totalNeed=total-assigned,loadRatio=(load[e.name]||0)/(Number(e.hours)||1),skillLevel=Number(e.skills?.[skill]||0),specialist=morningSpecialist(e),lessEvening=S.rules?.rotation?.lessSkilledEvening!==false;
  let score=loadRatio*26-need*34-totalNeed*5-skillLevel*4+rotationRank(e)*.8;if(period==='evening'&&lessEvening)score+=specialist?5:-7;if(period==='morning'&&(skill==='Forno'||skill==='Ordini'))score+=specialist?-7:8;if(count>=target)score+=(count-target+1)*24;if(assigned>=total)score+=(assigned-total+1)*18;return score;
}
function pdvSummaryCard(p){
  const active=p.id===currentPdvId(),st=normalizePdvState(p.state),r=st.rules||defaultPdvRules();
  return`<div class="card pdv-card ${active?'pdv-active':''}"><div class="row wrap"><div><span class="pdv-badge">${active?'ATTIVO':esc(p.id)}</span><h3>${esc(p.name)}</h3><small>${p.code?`Codice ${esc(p.code)} · `:''}${st.employees.length} addetti</small></div>${active?'<b class="ok">● attivo</b>':''}</div><p class="muted">Forno ${r.rotation.forno}× · Ordini ${r.rotation.ordini}× · Chiusure ${r.rotation.chiusura}×</p><div class="pdv-actions">${active?'<button class="btn primary small" onclick="go(\'schedule\')">Orari</button>':`<button class="btn primary small" onclick="switchPdv('${esc(p.id)}')">Apri</button>`}<button class="btn small" onclick="openPdvRules('${esc(p.id)}')">Regole</button><button class="btn small" onclick="duplicatePdv('${esc(p.id)}')">Duplica</button>${pdvDb.pdvs.length>1?`<button class="btn danger small" onclick="deletePdv('${esc(p.id)}')">Elimina</button>`:''}</div></div>`
}
function home(){
  const p=currentPdv(),cfg=telegramConfig(),cloudReady=Boolean(cfg.url&&cfg.key),pending=telegramRequests.filter(r=>r.status==='Da approvare').length;
  let weekly='';if(S.employees.length){try{const ds=edited(build()),t=totals(ds),target=effectiveTargets();weekly=`<div class="card hero"><div class="row wrap"><div><h2>${esc(p.name)}</h2><small>${p.code?`Codice ${esc(p.code)} · `:''}${fmt(week)} – ${fmt(add(week,6))}</small></div><button class="btn" onclick="openPdvRules()">⚙ Regole PDV</button></div><b>${hf(t.total)} / ${hf(target.total)} ore reparti</b><p><button class="btn primary" onclick="go('schedule')">Apri orario</button> <button class="btn" onclick="go('employeeWeek')">Vista addetto</button> <button class="btn" onclick="go('skills')">Addetti</button></p></div>`}catch(_){}}
  $('#app').innerHTML=`${weekly}<div class="card"><div class="row wrap"><div><h2>I miei PDV</h2><small class="muted">Ogni punto vendita conserva separatamente organico, regole, ferie, obiettivi e indisponibilità.</small></div><button class="btn primary" onclick="createPdv()">＋ Nuovo PDV</button></div><div class="pdv-list">${pdvDb.pdvs.map(pdvSummaryCard).join('')}</div></div><div class="card"><div class="row wrap"><div><h3>Archivio e sincronizzazione</h3><small class="muted">Locale: sempre attivo. Cloud: Google Sheets tramite lo stesso Apps Script.</small></div><span class="sync-status">${esc(pdvCloudStatus)}</span></div>${pdvCloudError?`<p class="bad">${esc(pdvCloudError)}</p>`:''}<div class="pdv-actions">${cloudReady?'<button class="btn primary" onclick="syncPdvCloud()">Sincronizza cloud</button><button class="btn" onclick="pushAllPdvsCloud()">Salva tutti nel cloud</button>':'<button class="btn" onclick="go(\'requests\')">Collega Apps Script</button>'}</div></div>${pending?`<div class="card request-card"><div class="row"><div><h3>${pending} richiest${pending===1?'a':'e'} da approvare</h3><small>PDV attivo</small></div><button class="btn primary" onclick="go('requests')">Apri</button></div></div>`:''}`;
}
function nav(){const pending=telegramRequests.filter(r=>r.status==='Da approvare').length,a=[['home','⌂','PDV'],['schedule','▦','Orari'],['requests','✉',pending?`Richieste ${pending}`:'Richieste'],['skills','✓','Addetti'],['leave','☀','Ferie'],['obj','◎','Obiettivi']];$('#nav').innerHTML=a.map(x=>`<button class="${view===x[0]||((view==='pdvRules')&&x[0]==='home')||(view==='holiday'&&x[0]==='schedule')||(view==='employeeWeek'&&x[0]==='schedule')?'on':''}" onclick="go('${x[0]}')"><b>${x[1]}</b>${x[2]}</button>`).join('')}
function render(){nav();header();const pages={home,schedule,employeeWeek:employeeWeekPage,requests:requestsPage,skills,leave:leavePage,obj,holiday:holidayPage,pdvRules:pdvRulesPage};(pages[view]||home)()}
function go(v){view=v;render();if(v==='requests'&&telegramConfig().url&&!telegramLoading)loadTelegramRequests()}

function pdvJsonp(action,params={}){return new Promise((resolve,reject)=>{const cfg=telegramConfig();if(!cfg.url||!cfg.key){reject(new Error('Apps Script non collegato'));return}const cb='pdvcb_'+Date.now()+'_'+Math.floor(Math.random()*10000),script=document.createElement('script'),timer=setTimeout(()=>{cleanup();reject(new Error('Tempo scaduto durante la sincronizzazione'))},15000);function cleanup(){clearTimeout(timer);delete window[cb];script.remove()}window[cb]=data=>{cleanup();resolve(data)};script.onerror=()=>{cleanup();reject(new Error('Impossibile leggere archivio cloud'))};const q=new URLSearchParams({key:cfg.key,action,callback:cb,...params,_:Date.now()});script.src=cfg.url+'?'+q.toString();document.body.appendChild(script)})}
function schedulePdvCloudSave(){clearTimeout(pdvCloudTimer);pdvCloudTimer=setTimeout(()=>cloudSavePdv(currentPdv()).catch(()=>{}),1200)}
async function cloudSavePdv(p){if(!p)return;await postTelegramAction({action:'pdv_save',pdvId:p.id,pdvName:p.name||'',pdvCode:p.code||'',pdvNotes:p.notes||'',updatedAt:p.updatedAt||pdvNow(),state:JSON.stringify(p.state||{})});pdvCloudStatus='Cloud aggiornato';pdvCloudError=''}
async function pushAllPdvsCloud(){try{save();pdvCloudStatus='Salvataggio cloud…';render();for(const p of pdvDb.pdvs)await cloudSavePdv(p);pdvDb.cloudEnabled=true;persistPdvDb();pdvCloudStatus='Tutti i PDV inviati al cloud';render()}catch(err){pdvCloudError=err.message||String(err);pdvCloudStatus='Errore cloud';render()}}
async function syncPdvCloud(){
  try{save();pdvCloudStatus='Sincronizzazione…';pdvCloudError='';render();const data=await pdvJsonp('pdv_list');if(!data?.ok||!Array.isArray(data.pdvs))throw new Error(data?.error||'Backend PDV non ancora installato');
    if(!data.pdvs.length){await pushAllPdvsCloud();return}
    const map=new Map(pdvDb.pdvs.map(p=>[p.id,p]));for(const cp of data.pdvs){const lp=map.get(cp.id);if(!lp||String(cp.updatedAt||'')>String(lp.updatedAt||''))map.set(cp.id,{id:cp.id,name:cp.name||cp.id,code:cp.code||'',notes:cp.notes||'',updatedAt:cp.updatedAt||pdvNow(),state:normalizePdvState(cp.state||{})})}
    pdvDb.pdvs=[...map.values()];pdvDb.cloudEnabled=true;if(!pdvDb.pdvs.some(x=>x.id===pdvDb.activeId))pdvDb.activeId=pdvDb.pdvs[0].id;persistPdvDb();loadPdvIntoState(currentPdv());pdvCloudStatus='Cloud sincronizzato';pdvCloudError='';render();if(telegramConfig().url)loadTelegramRequests();
  }catch(err){pdvCloudError=err.message||String(err);pdvCloudStatus='Solo dispositivo';pdvDb.cloudEnabled=false;persistPdvDb();render()}
}

async function loadTelegramRequests(){
  const cfg=telegramConfig();if(!cfg.url||!cfg.key){refreshTelegramView();return}telegramLoading=true;telegramError='';refreshTelegramView();
  try{const data=await requestJsonp(cfg.url+'?key='+encodeURIComponent(cfg.key)+'&pdvId='+encodeURIComponent(currentPdvId()));if(!data?.ok)throw new Error(data?.error||'Risposta non valida');telegramRequests=Array.isArray(data.requests)?data.requests:[];telegramLinks=Array.isArray(data.links)?data.links:[]}
  catch(err){telegramError=err.message||String(err)}telegramLoading=false;refreshTelegramView();
}
async function associateTelegramRequest(id){
  const req=telegramRequests.find(x=>String(x.id)===String(id)),employeeName=String($(`#assoc-${id}`)?.value||'').trim();if(!req||!req.telegramId){alert('Telegram ID non disponibile per questa richiesta');return}if(!employeeName){alert('Seleziona l’addetto corretto');return}
  const previousForId=telegramLinkById(req.telegramId),previousForEmployee=telegramLinkForEmployee(employeeName),conflicts=[previousForId?.employeeName,previousForEmployee?.employeeName].filter(Boolean);if(conflicts.length&&!confirm(`Il nuovo collegamento sostituirà quello esistente.\n\nCollegare questo profilo Telegram a ${employeeName}?`))return;
  try{await postTelegramAction({action:'associate',pdvId:currentPdvId(),telegramId:String(req.telegramId),employeeName,username:req.username||'',telegramName:req.telegramName||req.name||''});telegramLinks=telegramLinks.filter(x=>String(x.telegramId)!==String(req.telegramId)&&x.employeeName!==employeeName);telegramLinks.push({telegramId:String(req.telegramId),employeeName,username:req.username||'',telegramName:req.telegramName||req.name||'',pdvId:currentPdvId()});S.availabilityBlocks.forEach(x=>{if(String(x.telegramId||'')===String(req.telegramId))x.name=employeeName});save();refreshTelegramView();setTimeout(loadTelegramRequests,900)}catch(err){alert('Associazione non riuscita: '+err.message)}
}
async function unlinkTelegramId(telegramId,employeeName){if(!confirm(`Disassociare il profilo Telegram da ${employeeName}?\n\nLe indisponibilità già approvate restano nell’orario.`))return;try{await postTelegramAction({action:'unlink',pdvId:currentPdvId(),telegramId:String(telegramId)});telegramLinks=telegramLinks.filter(x=>String(x.telegramId)!==String(telegramId));refreshTelegramView();setTimeout(loadTelegramRequests,900)}catch(err){alert('Disassociazione non riuscita: '+err.message)}}
async function sendRequestDecision(id,status){const req=telegramRequests.find(x=>String(x.id)===String(id));if(!req)return;const employeeName=linkedEmployeeForRequest(req);if(status==='Approvata'&&!employeeName){alert('Prima associa il profilo Telegram a un addetto');return}try{await postTelegramAction({action:'status',pdvId:currentPdvId(),id:String(id),status});req.status=status;if(status==='Approvata')applyApprovedRequest(req,employeeName);refreshTelegramView();setTimeout(loadTelegramRequests,900)}catch(err){alert('Invio non riuscito: '+err.message)}}

initPdvDb();
view='home';render();
