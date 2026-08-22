const PDV1_ADVANCED_DEFAULTS={
  gastro:{closingCount:2,secondCloserStart:'14:30',closingCountWithCr:3,secondCloserStartWithCr:'17:00'},
  overtime:{eligibleHours:[20,24],balanced:true},
  fish:{primarySkill:3,fallbackSkill:2},
  carni:{fullTimeHours:40,partTimeHours:20,partTimeGastroHours:6,weeklyCap:60}
};
function pdv1Advanced(state=S){
  const saved=state?.rules?.pdv1Advanced||{};
  return{
    ...PDV1_ADVANCED_DEFAULTS,...saved,
    gastro:{...PDV1_ADVANCED_DEFAULTS.gastro,...(saved.gastro||{})},
    overtime:{...PDV1_ADVANCED_DEFAULTS.overtime,...(saved.overtime||{})},
    fish:{...PDV1_ADVANCED_DEFAULTS.fish,...(saved.fish||{})},
    carni:{...PDV1_ADVANCED_DEFAULTS.carni,...(saved.carni||{})}
  };
}
function pdv1AllShifts(day){const a=[...(day.g||[]),...(day.c||[])];if(day.cr)a.push(day.cr);return a}
function pdv1WorkMap(out){
  const w={};S.employees.forEach(e=>w[e.name]=0);
  out.forEach(d=>{(d.g||[]).forEach(s=>w[s.name]=(w[s.name]||0)+dur(s));(d.c||[]).forEach(s=>w[s.name]=(w[s.name]||0)+dur(s));if(d.cr)w[d.cr.name]=(w[d.cr.name]||0)+dur(d.cr)});
  return w;
}
function pdv1DayIndex(out,day){return out.indexOf(day)}
function pdv1LateBlockedFor(out,index,e,start){
  if(!e||e.cr||mins(start)>=mins(pdv1Ops().nextDayAfter2045||'08:45'))return false;
  return pdv1PreviousLateClosers(out,index).has(e.name);
}
function pdv1AvailableAdvanced(out,index,e,start,end,ignore=null){
  const day=out[index];if(!e||leave(e.name,day.date)||pdv1LateBlockedFor(out,index,e,start))return false;
  if(typeof blockedAt==='function'&&blockedAt(e.name,day.date,start,end))return false;
  return !pdv1PersonBusy(day,e.name,start,end,ignore);
}
function pdv1GenericGastroCandidate(out,index,start,end,exclude=[]){
  const day=out[index],pool=S.employees.filter(e=>!e.cr&&!exclude.includes(e.name)&&Number(e.skills?.Servizio||0)>0);
  return pool.filter(e=>pdv1AvailableAdvanced(out,index,e,start,end)).sort((a,b)=>{
    const ap=[20,24].includes(Number(a.hours))?0:1,bp=[20,24].includes(Number(b.hours))?0:1;
    return ap-bp||rotationRank(a)-rotationRank(b)
  })[0]||null;
}
function pdv1EnsureClosingShape(out,index){
  const day=out[index];if(index>5||day.holiday?.type==='closed')return;
  const cfg=pdv1Advanced(),crClose=pdv1CrCloses(day),desiredNonCr=crClose?Math.max(0,(Number(cfg.gastro.closingCountWithCr)||3)-1):Number(cfg.gastro.closingCount)||2;
  let closers=(day.g||[]).filter(s=>String(s.end||'')==='20:45'&&s.name!==pdv1CrName());
  while(closers.length<desiredNonCr){
    const start=closers.length===0?(pdv1Ops().gastro.handoffStart||'13:30'):(crClose?(cfg.gastro.secondCloserStartWithCr||'17:00'):(cfg.gastro.secondCloserStart||'14:30'));
    const e=pdv1GenericGastroCandidate(out,index,start,'20:45',closers.map(s=>s.name));
    const s={name:e?.name||'SCOPERTO',start,end:'20:45',skill:'Chiusura · copertura PDV 1',pause:hrs(start,'20:45')>6?15:0,pdv1Advanced:true};day.g.push(s);closers.push(s)
  }
  if(closers.length>desiredNonCr){const remove=new Set(closers.slice(desiredNonCr));day.g=day.g.filter(s=>!remove.has(s));closers=closers.slice(0,desiredNonCr)}
  if(closers[0]){closers[0].start=pdv1Ops().gastro.handoffStart||'13:30';closers[0].pause=hrs(closers[0].start,'20:45')>6?15:0;closers[0].pdv1FirstCloser=true}
  if(closers[1]){closers[1].start=crClose?(cfg.gastro.secondCloserStartWithCr||'17:00'):(cfg.gastro.secondCloserStart||'14:30');closers[1].pause=hrs(closers[1].start,'20:45')>6?15:0;closers[1].skill=crClose?'Chiusura · terzo complessivo con CR':'Chiusura · secondo addetto';closers[1].pdv1SecondCloser=true}
}
function pdv1ReplacementForShift(out,index,shift,dep,exclude=[]){
  const day=out[index],skill=pdv1RequiredSkill(shift);let pool=[];
  if(skill==='Macelleria')pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.Macelleria||0)>=2);
  else if(skill==='Pescheria')pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.Pescheria||0)>=2);
  else if(skill==='Forno'||skill==='Ordini')pool=staff('gastronomia').filter(e=>Number(e.skills?.[skill]||0)>=2);
  else pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.Servizio||0)>0);
  return pool.filter(e=>!exclude.includes(e.name)&&pdv1AvailableAdvanced(out,index,e,shift.start,shift.end,shift)).sort((a,b)=>rotationRank(a)-rotationRank(b))[0]?.name||'SCOPERTO';
}
function pdv1FreePersonFromGastro(out,index,name,start,end){
  const day=out[index],a=mins(start),b=mins(end);
  (day.g||[]).filter(s=>s.name===name&&shiftSegments(s).some(([x,y])=>a<y&&b>x)).forEach(s=>{const old=s.name;s.name=pdv1ReplacementForShift(out,index,s,'g',[name]);s.skill=String(s.skill||'Turno')+` · riassegnato (priorità ${old})`})
}
function pdv1FishCandidate(out,index,start,end){
  const cfg=pdv1Advanced(),day=out[index];
  const byLevel=level=>S.employees.filter(e=>!e.cr&&Number(e.skills?.Pescheria||0)===level&&!leave(e.name,day.date)&&!pdv1LateBlockedFor(out,index,e,start)&&(!(typeof blockedAt==='function')||!blockedAt(e.name,day.date,start,end))).sort((a,b)=>rotationRank(a)-rotationRank(b));
  const primary=byLevel(Number(cfg.fish.primarySkill)||3);if(primary.length)return primary[0];
  const fallback=byLevel(Number(cfg.fish.fallbackSkill)||2);return fallback[0]||null;
}
function pdv1EnforceFishPriority(out,index){
  if(index!==4&&index!==5)return;const day=out[index],fish=(day.c||[]).find(s=>String(s.skill||'').toLowerCase().includes('pesce'));if(!fish)return;
  const e=pdv1FishCandidate(out,index,fish.start||'06:30',fish.end||'13:30');
  if(!e){fish.name='SCOPERTO';fish.skill=String(fish.skill||'Vendita pesce')+' · manca competenza Pescheria 3/2';return}
  pdv1FreePersonFromGastro(out,index,e.name,fish.start,fish.end);fish.name=e.name;fish.fishPriority=true;fish.skill=index===5?'Vendita pesce · priorità competenza 3→2 · sabato':'Vendita pesce · priorità competenza 3→2'
}
function pdv1FtButcher(){const h=Number(pdv1Advanced().carni.fullTimeHours)||40;return S.employees.filter(e=>!e.cr&&Number(e.hours)>=h&&Number(e.skills?.Macelleria||0)>=2).sort((a,b)=>Number(b.skills?.Macelleria||0)-Number(a.skills?.Macelleria||0)||Number(b.hours)-Number(a.hours))[0]||null}
function pdv1PtButcher(){const h=Number(pdv1Advanced().carni.partTimeHours)||20;return S.employees.filter(e=>!e.cr&&Number(e.hours)===h&&Number(e.skills?.Macelleria||0)>=2).sort((a,b)=>Number(b.skills?.Macelleria||0)-Number(a.skills?.Macelleria||0))[0]||null}
function pdv1MacShifts(out){
  const rows=[];out.forEach((d,i)=>(d.c||[]).forEach(s=>{if(!String(s.skill||'').toLowerCase().includes('pesce')&&String(s.skill||'').toLowerCase().includes('macelleria'))rows.push({day:d,index:i,shift:s,hours:dur(s)})}));return rows
}
function pdv1AssignButcherPriorities(out){
  const cfg=pdv1Advanced(),ft=pdv1FtButcher(),pt=pdv1PtButcher();if(!ft&&!pt)return;
  const rows=pdv1MacShifts(out),ftTarget=Number(ft?.hours)||Number(cfg.carni.fullTimeHours)||40,ptCarniTarget=Math.max(0,(Number(pt?.hours)||Number(cfg.carni.partTimeHours)||20)-(Number(cfg.carni.partTimeGastroHours)||6));
  let ftUsed=0,ptUsed=0;
  const morning=rows.filter(x=>mins(x.shift.start)<12*60).sort((a,b)=>a.index-b.index),other=rows.filter(x=>mins(x.shift.start)>=12*60).sort((a,b)=>a.index-b.index);
  if(ft){
    [...morning,...other].forEach(x=>{
      if(ftUsed+x.hours>ftTarget+1)return;if(!pdv1AvailableAdvanced(out,x.index,ft,x.shift.start,x.shift.end,x.shift)&&x.shift.name!==ft.name)return;
      pdv1FreePersonFromGastro(out,x.index,ft.name,x.shift.start,x.shift.end);x.shift.name=ft.name;x.shift.butcherFtPriority=true;ftUsed+=x.hours
    })
  }
  if(pt){
    rows.filter(x=>x.shift.name!==ft?.name).forEach(x=>{
      if(ptUsed+x.hours>ptCarniTarget+1)return;if(!pdv1AvailableAdvanced(out,x.index,pt,x.shift.start,x.shift.end,x.shift)&&x.shift.name!==pt.name)return;
      pdv1FreePersonFromGastro(out,x.index,pt.name,x.shift.start,x.shift.end);x.shift.name=pt.name;x.shift.butcherPtPriority=true;ptUsed+=x.hours
    });
    pdv1EnsurePtButcherGastroSupport(out,pt)
  }
}
function pdv1EnsurePtButcherGastroSupport(out,pt){
  const target=Number(pdv1Advanced().carni.partTimeGastroHours)||6;if(!pt||target<=0)return;
  for(let i=0;i<6;i++){
    const day=out[i];if(day.holiday?.type==='closed'||pdv1CrCloses(day))continue;
    const s=(day.g||[]).find(x=>x.pdv1SecondCloser&&String(x.end)==='20:45');if(!s)continue;
    const start='14:30',end='20:45';if(!pdv1AvailableAdvanced(out,i,pt,start,end,s)&&s.name!==pt.name)continue;
    const old=s.name;s.name=pt.name;s.start=start;s.end=end;s.pause=15;s.skill='Chiusura · supporto Gastro PT20 · 6h';s.pt20GastroSupport=true;
    if(old&&old!==pt.name&&old!=='SCOPERTO')s.replacedEmployee=old;return
  }
  for(let i=0;i<6;i++){
    const day=out[i],start='06:30',end='12:30';if(day.holiday?.type==='closed'||!pdv1AvailableAdvanced(out,i,pt,start,end))continue;
    day.g.push({name:pt.name,start,end,skill:'Supporto Gastro PT20 · mattina 6h',pause:0,pt20GastroSupport:true});return
  }
}
function pdv1TransferablePtShift(s){
  const t=String(s.skill||'').toLowerCase();return !t.includes('forno')&&!t.includes('ordini')&&!t.includes('pesce')&&!t.includes('macelleria')&&!s.pt20GastroSupport&&s.name!=='SCOPERTO'
}
function pdv1BalancePartTimeOvertime(out){
  const cfg=pdv1Advanced();if(!cfg.overtime.balanced)return out;
  const eligible=S.employees.filter(e=>!e.cr&&(cfg.overtime.eligibleHours||[20,24]).includes(Number(e.hours))&&Number(e.skills?.Servizio||0)>0);if(eligible.length<2)return out;
  for(let pass=0;pass<10;pass++){
    const w=pdv1WorkMap(out),extra=e=>Math.max(0,(w[e.name]||0)-Number(e.hours||0));
    const donors=[...eligible].sort((a,b)=>extra(b)-extra(a)),receivers=[...eligible].sort((a,b)=>extra(a)-extra(b));const donor=donors[0],receiver=receivers[0];if(!donor||!receiver||donor.name===receiver.name||extra(donor)-extra(receiver)<1)return out;
    let moved=false;
    for(let i=0;i<out.length&&!moved;i++){
      const day=out[i];for(const s of day.g||[]){
        if(s.name!==donor.name||!pdv1TransferablePtShift(s)||!pdv1AvailableAdvanced(out,i,receiver,s.start,s.end,s))continue;
        const h=dur(s),before=extra(donor)*extra(donor)+extra(receiver)*extra(receiver),da=Math.max(0,extra(donor)-h),ra=Math.max(0,extra(receiver)+h),after=da*da+ra*ra;
        if(after<before){s.name=receiver.name;s.overtimeBalanced=true;s.skill=String(s.skill||'Turno')+' · straordinario bilanciato PT';moved=true;break}
      }
    }
    if(!moved)return out
  }
  return out
}
function pdv1CarniHours(out){let h=0;out.forEach(d=>(d.c||[]).forEach(s=>h+=dur(s)));return h}
function applyPdv1AdvancedProfile(out){
  if(!pdv1Active())return out;
  out.forEach((d,i)=>{if(i<=5&&d.holiday?.type!=='closed')pdv1EnsureClosingShape(out,i)});
  out.forEach((d,i)=>{if(i<=5&&d.holiday?.type!=='closed')pdv1EnforceFishPriority(out,i)});
  pdv1AssignButcherPriorities(out);
  pdv1EnforceNextDayRest(out);
  pdv1BalancePartTimeOvertime(out);
  return out;
}
const buildBeforePdv1Advanced=build;
build=function(){return applyPdv1AdvancedProfile(buildBeforePdv1Advanced())};

function ensurePdv1AdvancedState(){
  if(!pdv1Active())return;S.rules=S.rules||{};if(!S.rules.pdv1Advanced){S.rules.pdv1Advanced=JSON.parse(JSON.stringify(PDV1_ADVANCED_DEFAULTS));const p=currentPdv();if(p){p.state=cloneJson(S);p.updatedAt=pdvNow();persistPdvDb()}save()}
}
const pdvRulesPageBeforeAdvanced=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeAdvanced();const p=pdvDb.pdvs.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p||p.id!=='PDV_001')return;
  const c=pdv1Advanced(normalizePdvState(p.state)),form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;
  const html=`<div class="card"><h3>Regole avanzate PDV 1</h3><div class="req"><span>Chiusura standard</span><b>2 addetti · secondo dalle ${c.gastro.secondCloserStart}</b></div><div class="req"><span>Quando chiude il CR</span><b>${c.gastro.closingCountWithCr} complessivi · ultimo dalle ${c.gastro.secondCloserStartWithCr}</b></div><div class="req"><span>Straordinari</span><b>bilanciati tra PT 20/24h</b></div><div class="req"><span>Vendita Pesce</span><b>competenza ${c.fish.primarySkill} → se assente ${c.fish.fallbackSkill}</b></div><div class="req"><span>FT Macelleria</span><b>${c.carni.fullTimeHours}h · priorità ore in Macelleria</b></div><div class="req"><span>PT20 Macelleria</span><b>${c.carni.partTimeGastroHours}h Gastro · resto Macelleria</b></div><div class="grid" style="margin-top:10px"><label>Secondo addetto chiusura<input id="advClose2" type="time" value="${esc(c.gastro.secondCloserStart)}"></label><label>Tetto ore Carni settimanali<input id="advCarniCap" type="number" min="0" step=".25" value="${Number(c.carni.weeklyCap)||60}"></label><label>Ore Gastro PT20 Macelleria<input id="advPtGastro" type="number" min="0" step=".25" value="${Number(c.carni.partTimeGastroHours)||6}"></label></div><p class="muted">Il tetto Carni comprende anche la vendita Pesce. Se le coperture obbligatorie rendono impossibile stare sotto il tetto, l'app segnala il conflitto invece di cancellare una copertura.</p></div>`;
  actions?.insertAdjacentHTML('beforebegin',html)
};
const savePdvRulesBeforeAdvanced=savePdvRules;
savePdvRules=function(e,id){
  const close2=String(document.getElementById('advClose2')?.value||'14:30'),cap=Number(document.getElementById('advCarniCap')?.value)||60,ptG=Number(document.getElementById('advPtGastro')?.value)||6;
  savePdvRulesBeforeAdvanced(e,id);if(id!=='PDV_001')return;const p=pdvDb.pdvs.find(x=>x.id===id);if(!p)return;p.state=normalizePdvState(p.state);const c=pdv1Advanced(p.state);c.gastro.secondCloserStart=close2;c.carni.weeklyCap=cap;c.carni.partTimeGastroHours=ptG;p.state.rules.pdv1Advanced=c;p.updatedAt=pdvNow();if(id===currentPdvId())S.rules.pdv1Advanced=c;persistPdvDb();save()
};
const scheduleBeforePdv1Advanced=schedule;
schedule=function(){
  scheduleBeforePdv1Advanced();if(!pdv1Active())return;const ds=edited(build()),h=pdv1CarniHours(ds),cap=Number(pdv1Advanced().carni.weeklyCap)||60,box=document.querySelector('.purplebox');if(!box)return;
  const el=document.createElement('div');el.className='target-note';el.innerHTML=`PDV 1 · Ore Carni/Pesce: <b class="${h>cap?'bad':'ok'}">${hf(h)} / ${hf(cap)}</b>${h>cap?` · <span class="bad">superamento di ${hf(h-cap)}: coperture obbligatorie da rivedere</span>`:' · entro il tetto settimanale'}`;box.appendChild(el)
};
ensurePdv1AdvancedState();
try{render()}catch(_){}
