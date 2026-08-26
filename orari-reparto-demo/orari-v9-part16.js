const PDV1_349_RULES={
  storeNumber:'349',
  fornoStart:'06:00',
  singleOrdinaryMaxMinutes:7*60,
  splitOrdinaryMaxMinutes:8*60,
  splitReturnMinMinutes:2*60+30
};

function pdv1349Active(){
  return typeof pdv1Active==='function'?pdv1Active():(typeof currentPdvId==='function'&&currentPdvId()==='PDV_001');
}
function pdv1349EnsureState(){
  if(!pdv1349Active())return;
  S.manualShifts=Array.isArray(S.manualShifts)?S.manualShifts:[];
  const p=typeof currentPdv==='function'?currentPdv():null;
  if(p&&p.id==='PDV_001'&&String(p.code||'')!==PDV1_349_RULES.storeNumber){
    p.code=PDV1_349_RULES.storeNumber;
    p.updatedAt=typeof pdvNow==='function'?pdvNow():new Date().toISOString();
    if(typeof persistPdvDb==='function')persistPdvDb();
  }
}
function pdv1349MinutesBetween(start,end){
  if(!start||!end)return 0;
  const a=mins(start),b=mins(end);
  return Number.isFinite(a)&&Number.isFinite(b)&&b>a?b-a:0;
}
function pdv1349Metrics(s){
  const first=pdv1349MinutesBetween(s?.start,s?.end);
  const second=pdv1349MinutesBetween(s?.start2,s?.end2);
  const split=Boolean(s?.start2&&s?.end2);
  const pause=Math.max(0,Number(s?.pause)||0);
  if(split){
    const scheduled=first+second;
    return{
      split:true,
      scheduledMinutes:scheduled,
      effectiveMinutes:Math.max(0,scheduled-pause),
      overtimeMinutes:Math.max(0,scheduled-PDV1_349_RULES.splitOrdinaryMaxMinutes),
      returnMinutes:second,
      returnTooShort:second>0&&second<PDV1_349_RULES.splitReturnMinMinutes
    };
  }
  const effective=Math.max(0,first-pause);
  return{
    split:false,
    scheduledMinutes:first,
    effectiveMinutes:effective,
    overtimeMinutes:Math.max(0,effective-PDV1_349_RULES.singleOrdinaryMaxMinutes),
    returnMinutes:0,
    returnTooShort:false
  };
}
function pdv1349ApplyShiftRules(s){
  if(!s)return s;
  if(String(s.skill||'').toLowerCase().includes('forno')&&s.start){
    s.start=PDV1_349_RULES.fornoStart;
    s.pdv1349Forno=true;
  }
  const m=pdv1349Metrics(s);
  s.pdv1349OvertimeMinutes=m.overtimeMinutes;
  s.pdv1349ReturnTooShort=m.returnTooShort;
  s.pdv1349ReturnMinutes=m.returnMinutes;
  return s;
}
function pdv1349Badge(s){
  if(!pdv1349Active()||!s)return'';
  const bits=[];
  if(Number(s.pdv1349OvertimeMinutes)>0)bits.push(`<span class="bad">Straordinario +${hf(Number(s.pdv1349OvertimeMinutes)/60)}</span>`);
  if(s.pdv1349ReturnTooShort)bits.push(`<span class="bad">Rientro ${hf(Number(s.pdv1349ReturnMinutes)/60)} · minimo 2:30</span>`);
  return bits.length?`<br><small>${bits.join(' · ')}</small>`:'';
}

const editedBeforePdv1349=edited;
edited=function(ds){
  ds=editedBeforePdv1349(ds);
  if(!pdv1349Active())return ds;
  pdv1349EnsureState();
  (S.manualShifts||[]).forEach(m=>{
    const day=ds.find(d=>key(d.date)===m.date);
    if(!day||day.holiday?.type==='closed'||leave(m.name,day.date))return;
    const dep=m.dep==='c'?'c':'g';
    if((day[dep]||[]).some(s=>s._manualId===m.id))return;
    day[dep].push({...m,_manualId:m.id,manualShift:true});
  });
  ds.forEach(day=>{
    (day.g||[]).forEach(pdv1349ApplyShiftRules);
    (day.c||[]).forEach(pdv1349ApplyShiftRules);
  });
  return ds;
};

const shiftRowBeforePdv1349=shiftRow;
shiftRow=function(s,d,dep,i){
  if(!pdv1349Active())return shiftRowBeforePdv1349(s,d,dep,i);
  const editIndex=s._editIndex??i;
  const editAction=s._manualId
    ?`editPdv1349ManualShift('${esc(s._manualId)}')`
    :`editShift('${key(d)}','${dep}',${editIndex},'${esc(s.name)}','${s.start}','${s.end}')`;
  return`<div class="shift"><div><b>${esc(s.name)}</b>${s.blockedOriginal?`<br><small class="bad">Sostituisce ${esc(s.blockedOriginal)}</small>`:''}<br><span class="pill">${esc(s.skill)}</span>${pdv1349Badge(s)}</div><div class="time">${s.start}–${s.end}${s.start2?`<br>${s.start2}–${s.end2}`:''}</div><button class="btn small edit" onclick="${editAction}">✎</button></div>`;
};

const employeeShiftHtmlBeforePdv1349=employeeShiftHtml;
employeeShiftHtml=function(s,day){
  if(!pdv1349Active())return employeeShiftHtmlBeforePdv1349(s,day);
  const editAction=s._manualId
    ?`editPdv1349ManualShift('${esc(s._manualId)}')`
    :`editEmployeeShift('${key(day.date)}','${s._dep}',${s._editIndex??0},'${esc(s.name)}','${s.start}','${s.end}','${s.start2||''}','${s.end2||''}')`;
  return`<div class="employee-shift"><div><b>${esc(s.department)}</b><br><small>${esc(s.skill||s.note||'Turno')}</small>${pdv1349Badge(s)}</div><div class="time">${s.start}–${s.end}${s.start2?`<br>${s.start2}–${s.end2}`:''}</div><button class="btn small edit employee-edit" onclick="${editAction}">✎</button></div>`;
};

function pdv1349RefreshView(){
  if(view==='employeeWeek')employeeWeekPage();
  else if(view==='schedule')schedule();
  else render();
}
function pdv1349NormalizeSkill(value,dep){
  const v=String(value||'').trim();
  if(!v)return dep==='c'?'Macelleria':'Servizio';
  const l=v.toLowerCase();
  if(l.includes('forno'))return'Forno';
  if(l.includes('ord'))return'Ordini';
  if(l.includes('mac'))return'Macelleria';
  if(l.includes('pesc'))return'Pescheria';
  return v;
}
function pdv1349PromptShift(existing={}){
  const depAnswer=prompt('Reparto: G = Gastronomia/Forno · C = Carni/Pescheria',existing.dep==='c'?'C':'G');
  if(depAnswer===null)return null;
  const dep=String(depAnswer).trim().toUpperCase().startsWith('C')?'c':'g';
  const skillInput=prompt('Mansione (es. Servizio, Forno, Ordini, Macelleria, Pescheria)',existing.skill|| (dep==='c'?'Macelleria':'Servizio'));
  if(skillInput===null)return null;
  const skill=pdv1349NormalizeSkill(skillInput,dep);
  const isForno=skill==='Forno';
  let start=isForno?PDV1_349_RULES.fornoStart:prompt('Entrata',existing.start||'07:00');
  if(start===null)return null;
  if(isForno){start=PDV1_349_RULES.fornoStart;alert('PDV 1 · negozio 349: chi è al Forno entra alle 06:00.');}
  const end=prompt('Uscita',existing.end||'13:00');if(end===null)return null;
  if(pdv1349MinutesBetween(start,end)<=0){alert('Orario del primo turno non valido.');return null}
  const wantsSplit=confirm('È un turno spezzato?\n\nOK = sì · Annulla = turno unico');
  let start2='',end2='';
  if(wantsSplit){
    start2=prompt('Entrata rientro',existing.start2||'15:00');if(start2===null)return null;
    end2=prompt('Uscita rientro',existing.end2||'18:00');if(end2===null)return null;
    if(pdv1349MinutesBetween(start2,end2)<=0||mins(start2)<mins(end)){
      alert('Orario del rientro non valido: il rientro deve iniziare dopo la prima uscita.');return null;
    }
  }
  const scheduled=pdv1349MinutesBetween(start,end)+pdv1349MinutesBetween(start2,end2);
  const pause=scheduled>360?15:0;
  const draft={...existing,dep,skill,start,end,start2,end2,pause};
  const m=pdv1349Metrics(draft);
  if(m.returnTooShort&&!confirm(`Il rientro dura ${hf(m.returnMinutes/60)}, meno del minimo 2:30.\nPuò essere salvato solo come eccezione/straordinario. Continuare?`))return null;
  if(m.overtimeMinutes>0&&!confirm(`Il turno supera il limite ordinario.\n${hf(m.overtimeMinutes/60)} saranno indicati come straordinario. Continuare?`))return null;
  draft.overtimeException=Boolean(m.returnTooShort||m.overtimeMinutes>0);
  return draft;
}
function addPdv1349Shift(date){
  pdv1349EnsureState();
  const name=employeeWeekName;
  if(!name){alert('Seleziona prima un addetto.');return}
  const d=new Date(date+'T12:00:00');
  if(leave(name,d)){alert('L’addetto risulta in ferie in questa data.');return}
  const h=holidayFor(d);if(h?.type==='closed'){alert('Il negozio risulta chiuso in questa data.');return}
  const draft=pdv1349PromptShift({name,date});if(!draft)return;
  const ds=edited(build()),day=ds.find(x=>key(x.date)===date);
  if(day){
    const segments=[[draft.start,draft.end],...(draft.start2?[[draft.start2,draft.end2]]:[])];
    for(const [a,b] of segments){
      if(typeof blockedAt==='function'&&blockedAt(name,d,a,b)){alert('Questo turno sovrappone un’indisponibilità approvata.');return}
      if(typeof employeeBusy==='function'&&employeeBusy(day,name,a,b)){alert('L’addetto ha già un turno sovrapposto in questa fascia.');return}
    }
  }
  const id='m_'+Date.now()+'_'+Math.floor(Math.random()*10000);
  S.manualShifts.push({...draft,id,name,date,source:'Aggiungi turno'});
  save();pdv1349RefreshView();
}
function editPdv1349ManualShift(id){
  pdv1349EnsureState();
  const idx=(S.manualShifts||[]).findIndex(x=>x.id===id);if(idx<0)return;
  const current=S.manualShifts[idx];
  if(confirm(`Eliminare il turno aggiunto di ${current.name} ${current.start}–${current.end}${current.start2?` / ${current.start2}–${current.end2}`:''}?\n\nOK = elimina turno\nAnnulla = modifica turno`)){
    S.manualShifts.splice(idx,1);save();pdv1349RefreshView();return;
  }
  const draft=pdv1349PromptShift(current);if(!draft)return;
  S.manualShifts[idx]={...current,...draft,id:current.id,name:current.name,date:current.date};
  save();pdv1349RefreshView();
}

const employeeWeekPageBeforePdv1349=employeeWeekPage;
employeeWeekPage=function(name){
  employeeWeekPageBeforePdv1349(name);
  if(!pdv1349Active())return;
  pdv1349EnsureState();
  const cards=[...document.querySelectorAll('#app .employee-day')];
  cards.forEach((card,i)=>{
    const rest=card.querySelector('.rest-state');
    if(!rest||card.querySelector('.pdv1349-add-shift'))return;
    const date=key(add(week,i));
    rest.insertAdjacentHTML('afterend',`<button class="btn primary pdv1349-add-shift" style="margin-top:10px;width:100%" onclick="addPdv1349Shift('${date}')">＋ Aggiungi turno</button>`);
  });
};

const pdvRulesPageBeforePdv1349=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforePdv1349();
  const p=pdvDb?.pdvs?.find(x=>x.id===(pdvRulesEditId||currentPdvId()))||currentPdv();
  if(!p||p.id!=='PDV_001')return;
  if(String(p.code||'')!==PDV1_349_RULES.storeNumber){p.code=PDV1_349_RULES.storeNumber;const code=document.getElementById('pdvCode');if(code)code.value=PDV1_349_RULES.storeNumber;persistPdvDb()}
  const form=document.querySelector('#app form'),actions=form?.lastElementChild;if(!form)return;
  const html=`<div class="card"><h3>PDV 1 · Negozio 349 · regole turno</h3><div class="req"><span>Forno · entrata obbligatoria</span><b>06:00</b></div><div class="req"><span>Turno unico ordinario</span><b>max 7:00 effettive</b></div><div class="req"><span>Oltre 7:00</span><b>eccedenza = straordinario</b></div><div class="req"><span>Spezzato ordinario</span><b>max 8:00 complessive</b></div><div class="req"><span>Rientro dello spezzato</span><b>min 2:30</b></div><div class="req"><span>Pausa sugli spezzati lunghi</span><b>15 min</b></div><p class="muted" style="margin-top:10px">Se un turno supera i limiti ordinari, l’app non elimina la copertura: evidenzia automaticamente la parte eccedente come straordinario. I turni CR provenienti dal calendario Presidi restano invariati.</p></div>`;
  actions?.insertAdjacentHTML('beforebegin',html);
};

pdv1349EnsureState();
try{render()}catch(_){}
