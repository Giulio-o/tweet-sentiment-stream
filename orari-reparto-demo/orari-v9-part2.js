function build(){
  const load=closedCreditsInWeek();
  const out=[];
  for(let i=0;i<7;i++){
    const d=add(week,i),holiday=holidayFor(d),day={date:d,g:[],c:[],cr:null,holiday},used=[],reserved=[];
    if(holiday?.type==='closed'){out.push(day);continue}
    const cr=crShift(i),crName=S.employees.find(e=>e.cr)?.name||'Giulio CR';
    if(cr&&!leave(crName,d)){day.cr={name:crName,...cr};load[crName]=(load[crName]||0)+dur(day.cr)}
    const backup=i===5?staff('gastronomia').filter(e=>!leave(e.name,d)&&e.skills.Macelleria>=2).sort((a,b)=>(load[a.name]||0)-(load[b.name]||0))[0]:null;
    if(backup)reserved.push(backup.name);
    if(i<6){
      const t=[['06:15','13:00','Forno'],['06:30','13:30','Ordini']],cm=day.cr&&(day.cr.mode==='morning'||day.cr.mode==='split');
      if(!cm)t.push(['09:30','13:30','Servizio']);
      if(day.cr?.mode==='evening')t.push(['16:30','20:45','Chiusura'],['16:30','20:45','Chiusura']);else t.push(['13:30','20:45','Chiusura'],['16:30','20:45','Chiusura']);
      if(i===5)t.push(['09:30','13:30','Rinforzo sabato'],['13:00','17:30','Rinforzo sabato']);
      t.forEach(x=>{const sk=['Servizio','Chiusura','Rinforzo sabato'].some(z=>x[2].includes(z))?'Servizio':x[2],n=choose(sk,d,load,used.concat(reserved));used.push(n);push(day,'g',{name:n,start:x[0],end:x[1],skill:x[2],pause:x[0]==='13:30'?15:0},load)})
    }else{
      for(let j=0;j<2;j++){const n=choose('Servizio',d,load,used);used.push(n);push(day,'g',{name:n,start:'07:00',end:'13:30',skill:'Servizio gastronomia',pause:15},load)}
      const candidates=(d.getDate()<=7?staff('carni'):staff('gastronomia')).filter(e=>!used.includes(e.name)&&!leave(e.name,d)&&e.skills.Servizio>0).sort((a,b)=>(load[a.name]||0)-(load[b.name]||0));
      const n=candidates[0]?.name||choose('Servizio',d,load,used);push(day,'g',{name:n,start:'07:00',end:'13:30',skill:'Ripristino carne/pesce → banco Carni',pause:15},load)
    }
    if(i<5){
      const arr=[[[ '06:30','13:30','Macelleria' ]],[[ '07:00','13:15','Macelleria' ]],[[ '06:30','13:30','Macelleria' ]],[[ '07:00','13:15','Macelleria' ]],[[ '06:30','13:30','Macelleria' ],[ '06:30','13:30','Vendita pesce · Gastronomia' ]]][i],cu=[];
      arr.forEach(x=>{const fish=x[2].includes('pesce'),n=choose(fish?'Pescheria':'Macelleria',d,load,fish?used:cu,fish?'gastronomia':'carni');cu.push(n);push(day,'c',{name:n,start:x[0],end:x[1],skill:x[2],pause:hrs(x[0],x[1])>6?15:0},load)})
    }else if(i===5){
      const main=staff('carni').filter(e=>!leave(e.name,d)&&e.skills.Macelleria>=2)[0];let morning,afternoon,crCover=false;
      if(swapSat()){afternoon=main?.name||'SCOPERTO';if(backup)morning=backup.name;else if(crCanMorning(day.cr)){morning=day.cr.name;crCover=true}else morning='SCOPERTO'}else{morning=main?.name||'SCOPERTO';afternoon=backup?.name||'SCOPERTO'}
      push(day,'c',{name:morning,start:'06:30',end:'13:30',skill:crCover?'Macelleria mattina · nel turno CR':'Macelleria mattina',pause:15,coveredByCR:crCover},load);
      push(day,'c',{name:afternoon,start:'15:00',end:'18:00',skill:'Macelleria pomeriggio · rotazione'},load)
    }
    appendPreHolidayExtras(day,d,load,holidayFor(add(d,1)));
    out.push(day)
  }
  return out
}
function edited(ds){ds.forEach(d=>['g','c'].forEach(dep=>d[dep].forEach((s,i)=>Object.assign(s,S.edits[key(d.date)+'-'+dep+'-'+i]||{}))));return ds}
function totals(ds){let g=0,c=0,holiday=0;ds.forEach(d=>{d.g.forEach(s=>g+=dur(s));d.c.forEach(s=>c+=dur(s));if(d.holiday?.type==='closed')S.employees.forEach(e=>holiday+=creditFor(d.holiday,e.name))});return{g,c,total:g+c,holiday}}
function people(ds){const worked={},festive={};S.employees.forEach(e=>{worked[e.name]=0;festive[e.name]=0});ds.forEach(d=>{d.g.forEach(s=>worked[s.name]=(worked[s.name]||0)+dur(s));d.c.forEach(s=>worked[s.name]=(worked[s.name]||0)+dur(s));if(d.cr)worked[d.cr.name]=(worked[d.cr.name]||0)+dur(d.cr);if(d.holiday?.type==='closed')S.employees.forEach(e=>festive[e.name]+=creditFor(d.holiday,e.name))});return S.employees.map(e=>{const w=worked[e.name]||0,f=festive[e.name]||0,accounted=w+f;return{...e,worked:w,festive:f,accounted,extra:Math.max(0,accounted-e.hours),missing:Math.max(0,e.hours-accounted)}})}
function requirements(){const g=staff('gastronomia'),c=staff('carni'),r={cr:S.employees.filter(e=>e.cr&&e.hours===38).length,g36:g.filter(e=>e.hours===36).length,g30:g.filter(e=>e.hours===30).length,g24:g.filter(e=>e.hours===24).length,g20:g.filter(e=>e.hours===20).length,mac:c.filter(e=>e.hours===36&&e.skills.Macelleria>=2).length,backup:g.filter(e=>e.skills.Macelleria>=2).length,forno:g.filter(e=>e.skills.Forno>=2).length,ord:g.filter(e=>e.skills.Ordini>=2).length,fish:g.filter(e=>e.skills.Pescheria>=1).length};r.ok=r.cr===1&&r.g36===2&&r.g30===1&&r.g24===2&&r.g20===2&&r.mac===1&&r.backup>=1&&r.forno>=3&&r.ord>=2&&r.fish>=1;return r}
function reqHtml(){const r=requirements(),x=(l,v,n)=>`<div class="req"><span>${l}</span><b class="${v>=n?'ok':'bad'}">${v}/${n}</b></div>`;return`<div class="card ${r.ok?'greenbox':'redbox'}"><h3>Organico e competenze</h3>${x('CR 38 ore',r.cr,1)}${x('FT Gastronomia 36 ore',r.g36,2)}${x('PT 30 ore',r.g30,1)}${x('PT 24 ore',r.g24,2)}${x('PT 20 ore',r.g20,2)}${x('Macellaio FT 36 ore',r.mac,1)}${x('Secondo competente Macelleria, escluso CR',r.backup,1)}${x('Autonomi forno',r.forno,3)}${x('Autonomi ordini',r.ord,2)}${x('Supporto pescheria Gastronomia',r.fish,1)}</div>`}
function hoursHtml(ds){const p=people(ds),ot=p.reduce((a,e)=>a+e.extra,0);return`<div class="card"><div class="row wrap"><h3>Ore per addetto</h3><b class="${ot?'bad':'ok'}">Straordinari ${hf(ot)}</b></div><div class="scroll"><table><thead><tr><th>Addetto</th><th>Contr.</th><th>Lavor.</th><th>Fest.</th><th>Totale</th><th>Manc.</th><th>Extra</th><th></th></tr></thead><tbody>${p.map(e=>`<tr class="${e.cr?'crrow':''}"><td><b>${esc(e.name)}</b><br><small>${e.cr?'CR':e.dept==='carni'?'Carni':'Gastronomia'}</small></td><td>${hf(e.hours)}</td><td>${hf(e.worked)}</td><td>${e.festive?hf(e.festive):'—'}</td><td>${hf(e.accounted)}</td><td>${e.missing?hf(e.missing):'—'}</td><td class="${e.extra?'bad':''}">${e.extra?hf(e.extra):'—'}</td><td><button class="btn small" onclick="quickLeave('${esc(e.name)}')">Ferie</button></td></tr>`).join('')}</tbody></table></div><small class="muted">Le ore di festività chiusa coprono il contratto, ma restano separate dalle ore lavorate.</small></div>`}