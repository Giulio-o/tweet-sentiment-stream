const LEARNED_SUNDAY_RULE={enabled:true,effectiveFrom:'2026-09-13',count:2,start:'07:00',end:'13:15'};

function sundayRule(state=S){
  return{enabled:false,effectiveFrom:'',count:0,start:'07:00',end:'13:15',...(state?.rules?.sunday||{})};
}
function ensureCurrentPdvSundayRule(){
  if(!S.rules)S.rules={};
  if(!S.rules.sunday){
    S.rules.sunday={...LEARNED_SUNDAY_RULE};
    const p=typeof currentPdv==='function'?currentPdv():null;
    if(p){p.state=cloneJson(S);p.updatedAt=pdvNow();persistPdvDb()}
    save();
  }
}
function previousDayLateClosers(out,index){
  if(index<=0)return new Set();
  const prev=out[index-1],names=new Set(),crName=S.employees.find(e=>e.cr)?.name||'';
  const all=[...(prev.g||[]),...(prev.c||[])];if(prev.cr)all.push(prev.cr);
  all.forEach(s=>{if(s?.name&&s.name!==crName&&String(s.end||'')==='20:45')names.add(s.name)});
  return names;
}
function sundayGeneratedShift(s){
  const skill=String(s?.skill||'');
  return skill==='Servizio gastronomia'||skill.includes('Ripristino carne/pesce')||skill==='Servizio domenica';
}
function applySundayPdvRule(out){
  const r=sundayRule();if(!r.enabled||!r.effectiveFrom)return out;
  out.forEach((day,index)=>{
    if(day.date?.getDay()!==0||key(day.date)<r.effectiveFrom||day.holiday?.type==='closed')return;
    const count=Math.max(0,Number(r.count)||0),start=r.start||'07:00',end=r.end||'13:15';
    const closers=previousDayLateClosers(out,index),crName=S.employees.find(e=>e.cr)?.name||'';
    const original=(day.g||[]).filter(sundayGeneratedShift);
    const chosen=[];
    const canUse=name=>name&&name!=='SCOPERTO'&&!chosen.includes(name)&&(!closers.has(name)||name===crName)&&!leave(name,day.date)&&(!(typeof blockedAt==='function')||!blockedAt(name,day.date,start,end));
    original.forEach(s=>{if(chosen.length<count&&canUse(s.name))chosen.push(s.name)});
    const pool=S.employees.filter(e=>!e.cr&&Number(e.skills?.Servizio||0)>0).sort((a,b)=>{
      const ag=a.dept==='gastronomia'?0:1,bg=b.dept==='gastronomia'?0:1;return ag-bg||rotationRank(a)-rotationRank(b)
    });
    pool.forEach(e=>{if(chosen.length<count&&canUse(e.name))chosen.push(e.name)});
    while(chosen.length<count)chosen.push('SCOPERTO');
    day.g=(day.g||[]).filter(s=>!sundayGeneratedShift(s));
    chosen.forEach(name=>day.g.push({name,start,end,skill:'Servizio domenica',pause:hrs(start,end)>6?15:0,sundayRule:true}));
  });
  return out;
}
const buildBeforeSundayPdvRule=build;
build=function(){return applySundayPdvRule(buildBeforeSundayPdvRule())};

const pdvRulesPageBeforeSunday=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeSunday();
  const p=pdvDb.pdvs.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();if(!p)return;
  const r=sundayRule(normalizePdvState(p.state));
  const form=document.querySelector('#app form');if(!form)return;
  const actions=form.lastElementChild;
  const html=`<div class="card"><h3>Domenica</h3><p class="muted">Regola specifica del PDV. Dopo una chiusura alle 20:45 l'addetto non viene scelto per un ingresso prima delle 08:45; il CR resta escluso da questo vincolo.</p><div class="grid"><label><input id="sunEnabled" type="checkbox" ${r.enabled?'checked':''}> Regola domenicale attiva</label><label>Dal giorno<input id="sunFrom" type="date" value="${esc(r.effectiveFrom||'')}"></label><label>Numero addetti<input id="sunCount" type="number" min="0" value="${Number(r.count)||0}"></label><label>Ingresso<input id="sunStart" type="time" value="${esc(r.start||'07:00')}"></label><label>Uscita<input id="sunEnd" type="time" value="${esc(r.end||'13:15')}"></label></div></div>`;
  actions?.insertAdjacentHTML('beforebegin',html);
};
const savePdvRulesBeforeSunday=savePdvRules;
savePdvRules=function(e,id){
  const data={enabled:Boolean(document.getElementById('sunEnabled')?.checked),effectiveFrom:String(document.getElementById('sunFrom')?.value||''),count:Math.max(0,Number(document.getElementById('sunCount')?.value)||0),start:String(document.getElementById('sunStart')?.value||'07:00'),end:String(document.getElementById('sunEnd')?.value||'13:15')};
  savePdvRulesBeforeSunday(e,id);
  const p=pdvDb.pdvs.find(x=>x.id===id);if(!p)return;
  p.state=normalizePdvState(p.state);p.state.rules.sunday=data;p.updatedAt=pdvNow();
  if(id===currentPdvId()){S.rules.sunday=data;S=normalizePdvState(S)}
  persistPdvDb();save();
};

ensureCurrentPdvSundayRule();
try{render()}catch(_){}
