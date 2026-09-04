const DAYS=['Lunedì','Martedì','Mercoledì','Giovedì','Venerdì','Sabato','Domenica'];
const SKILLS=['Forno','Ordini','Servizio','Macelleria','Pescheria'];

const base=[
  {name:'Giulio CR',hours:38,cr:true,dept:'misto',skills:{Forno:3,Ordini:3,Servizio:3,Macelleria:3,Pescheria:3}},
  {name:'Marco',hours:36,dept:'gastronomia',skills:{Forno:3,Ordini:1,Servizio:3,Macelleria:2,Pescheria:0}},
  {name:'Elena',hours:36,dept:'gastronomia',skills:{Forno:1,Ordini:3,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Luca',hours:30,dept:'gastronomia',skills:{Forno:2,Ordini:1,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Sara',hours:24,dept:'gastronomia',skills:{Forno:2,Ordini:2,Servizio:3,Macelleria:0,Pescheria:2}},
  {name:'Andrea',hours:24,dept:'gastronomia',skills:{Forno:1,Ordini:0,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Paola',hours:20,dept:'gastronomia',skills:{Forno:1,Ordini:0,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Chiara',hours:20,dept:'gastronomia',skills:{Forno:1,Ordini:0,Servizio:3,Macelleria:0,Pescheria:0}},
  {name:'Lorenzo',hours:36,dept:'carni',skills:{Forno:0,Ordini:0,Servizio:3,Macelleria:3,Pescheria:0}}
];

const DEF={employees:base,leaves:[],holidays:[],edits:{},objectives:{gastronomia:215,carni:50,total:265}};
const STORE='orari_demo_pub_v9';
const LEGACY_STORES=['orari_demo_pub_v8','orari_demo_pub_v7','orari_demo_pub_v6','orari_demo_pub_v5','orari_demo_pub_v4','orari_demo_pub_v3','orari_demo_pub_v2','orari_demo_pub'];
function readStoredState(storeKey){try{return JSON.parse(localStorage.getItem(storeKey)||'null')}catch{return null}}
function hasCustomNames(state){if(!Array.isArray(state?.employees))return false;return state.employees.some((e,i)=>base[i]&&e?.name&&e.name!==base[i].name)}
function hasDefaultNames(state){if(!Array.isArray(state?.employees)||state.employees.length!==base.length)return false;return state.employees.every((e,i)=>e?.name===base[i].name)}
const storedStates=[readStoredState(STORE),...LEGACY_STORES.map(readStoredState)].filter(Boolean);
let S=storedStates[0]||DEF;
const stateWithCustomNames=storedStates.find(hasCustomNames);
if(stateWithCustomNames&&(!S.employees||hasDefaultNames(S)))S={...S,employees:stateWithCustomNames.employees};
S={...DEF,...S,objectives:{...DEF.objectives,...(S.objectives||{})}};
S.leaves=S.leaves||[];S.holidays=S.holidays||[];S.edits=S.edits||{};
S.employees=(S.employees||base).map(e=>({...e,skills:{Forno:0,Ordini:0,Servizio:0,Macelleria:0,Pescheria:0,...(e.skills||{})},dept:e.cr?'misto':(e.dept||'gastronomia')}));
const butcher=S.employees.find(e=>!e.cr&&e.dept==='carni'&&Number(e.hours)===36)||S.employees.find(e=>!e.cr&&Number(e.hours)===36&&(e.skills?.Macelleria||0)>=2);
if(butcher){
  const oldName=butcher.name;
  butcher.name='Lorenzo';
  butcher.hours=36;
  butcher.dept='carni';
  butcher.skills={Forno:0,Ordini:0,Servizio:3,Macelleria:3,Pescheria:0};
  if(oldName&&oldName!=='Lorenzo'){
    S.leaves.forEach(x=>{if(x.name===oldName)x.name='Lorenzo'});
    Object.values(S.edits).forEach(x=>{if(x?.name===oldName)x.name='Lorenzo'});
    S.holidays.forEach(h=>{
      if(h.credits&&Object.prototype.hasOwnProperty.call(h.credits,oldName)){
        h.credits.Lorenzo=h.credits[oldName];
        delete h.credits[oldName];
      }
      if(h.extras?.g?.employee===oldName)h.extras.g.employee='Lorenzo';
      if(h.extras?.c?.employee===oldName)h.extras.c.employee='Lorenzo';
    });
  }
}else{
  S.employees.push({...base[base.length-1]});
}
if(!S.employees.some(e=>!e.cr&&e.dept==='gastronomia'&&e.skills.Macelleria>=2)){const x=S.employees.find(e=>!e.cr&&e.dept==='gastronomia'&&e.hours===36);if(x)x.skills.Macelleria=2}
let view='home',week=mon(new Date()),holidayDraftDate='';
const $=q=>document.querySelector(q),add=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x},key=d=>d.toISOString().slice(0,10),fmt=d=>d.toLocaleDateString('it-IT',{day:'numeric',month:'short'});
function mon(d){d=new Date(d);d.setHours(12,0,0,0);const n=d.getDay();d.setDate(d.getDate()+(n===0?-6:1-n));return d}
function save(){localStorage.setItem(STORE,JSON.stringify(S))}
function mins(t){const[a,b]=String(t).split(':').map(Number);return a*60+b}
function hrs(a,b,p=0){return(mins(b)-mins(a)-p)/60}
function dur(s){if(s.coveredByCR)return 0;return hrs(s.start,s.end,s.pause||0)+(s.start2?hrs(s.start2,s.end2):0)}
function departmentDur(s){return s?.excludeFromDepartmentHours?0:dur(s)}
function hf(v){const m=Math.max(0,Math.round((Number(v)||0)*60));return`${Math.floor(m/60)}:${String(m%60).padStart(2,'0')}`}
function parseHM(value){const v=String(value??'').trim().replace(',','.');if(!v)return 0;if(v.includes(':')){const[h,m]=v.split(':').map(Number);return Math.max(0,(h||0)+(m||0)/60)}return Math.max(0,Number(v)||0)}
function dailyCredit(e){const h=Number(e.hours)||0;if(h===38)return 6+20/60;if(h===36)return 6;if(h===30)return 5;if(h===24)return 4;if(h===20)return 4;return Math.round(h/6*12)/12}
function esc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#39;'}[c]))}
function leave(name,d){const k=key(d);return S.leaves.some(x=>x.name===name&&k>=x.from&&k<=x.to)}
function staff(dep){return S.employees.filter(e=>!e.cr&&(!dep||e.dept===dep))}
function holidayFor(d){const k=typeof d==='string'?d:key(d);return S.holidays.find(h=>h.date===k)||null}
function creditFor(holiday,name){if(!holiday||holiday.type!=='closed')return 0;return Number(holiday.credits?.[name])||0}
function closedCreditsInWeek(){const load={};S.employees.forEach(e=>load[e.name]=0);for(let i=0;i<7;i++){const h=holidayFor(add(week,i));if(h?.type==='closed')S.employees.forEach(e=>load[e.name]+=creditFor(h,e.name))}return load}
function holidayExtras(holiday){const defaults={g:{enabled:true,start:'09:30',end:'13:30',employee:''},c:{enabled:true,start:'15:00',end:'18:00',employee:''}};return{g:{...defaults.g,...(holiday?.extras?.g||{})},c:{...defaults.c,...(holiday?.extras?.c||{})}}}
function holidayReductions(){let g=0,c=0,fish=0,closedDays=0;const gAverage=(Number(S.objectives.gastronomia)||0)/7,cAverage=(Number(S.objectives.carni)||0)/7;for(let i=0;i<7;i++){const d=add(week,i),h=holidayFor(d);if(h?.type!=='closed')continue;closedDays++;g+=gAverage;c+=cAverage;if(d.getDay()===5){fish+=6.75;c+=6.75}}return{g,c,fish,closedDays,total:g+c}}
function effectiveTargets(){const r=holidayReductions();return{g:Math.max(0,(Number(S.objectives.gastronomia)||0)-r.g),c:Math.max(0,(Number(S.objectives.carni)||0)-r.c),total:Math.max(0,(Number(S.objectives.total)||0)-r.total),reductions:r}}
function shiftSegments(s){const segments=[];if(s?.start&&s?.end)segments.push([mins(s.start),mins(s.end)]);if(s?.start2&&s?.end2)segments.push([mins(s.start2),mins(s.end2)]);return segments}
function employeeBusy(day,name,start,end){const a=mins(start),b=mins(end),shifts=[...day.g,...day.c];if(day.cr)shifts.push(day.cr);return shifts.some(s=>s.name===name&&shiftSegments(s).some(([x,y])=>a<y&&b>x))}
function pickExtraEmployee(kind,day,d,load,preferred,start,end){let pool=kind==='g'?staff('gastronomia').filter(e=>e.skills.Servizio>0):S.employees.filter(e=>e.skills?.Macelleria>=2);const available=pool.filter(e=>!leave(e.name,d)&&!employeeBusy(day,e.name,start,end)).sort((a,b)=>(load[a.name]||0)/(a.hours||1)-(load[b.name]||0)/(b.hours||1));if(preferred&&available.some(e=>e.name===preferred))return preferred;return available[0]?.name||'SCOPERTO'}
function appendPreHolidayExtras(day,d,load,nextHoliday){if(!nextHoliday||day.holiday?.type==='closed')return;const extras=holidayExtras(nextHoliday);if(extras.g.enabled){const name=pickExtraEmployee('g',day,d,load,extras.g.employee,extras.g.start||'09:30',extras.g.end||'13:30');push(day,'g',{name,start:extras.g.start||'09:30',end:extras.g.end||'13:30',skill:`Preparazione ${nextHoliday.label||'festività'} · Gastronomia`,pause:0,preHoliday:true},load)}if(extras.c.enabled){const name=pickExtraEmployee('c',day,d,load,extras.c.employee,extras.c.start||'15:00',extras.c.end||'18:00');push(day,'c',{name,start:extras.c.start||'15:00',end:extras.c.end||'18:00',skill:`Preparazione ${nextHoliday.label||'festività'} · Carni`,pause:0,preHoliday:true},load)}}
function choose(skill,d,load,exclude=[],dep='gastronomia'){let a=staff(dep).filter(e=>!exclude.includes(e.name)&&!leave(e.name,d)&&e.skills[skill]>0).sort((x,y)=>(load[x.name]||0)/(x.hours||1)-(load[y.name]||0)/(y.hours||1)||y.skills[skill]-x.skills[skill]);if(!a.length)a=staff(dep).filter(e=>!exclude.includes(e.name)&&!leave(e.name,d)).sort((x,y)=>(load[x.name]||0)-(load[y.name]||0));return a[0]?.name||'SCOPERTO'}
function weeklyShiftTarget(e){const h=Number(e.hours)||0;if(h>=36)return 6;if(h>=30)return 5;if(h>=24)return 4;if(h>=20)return 3;return Math.max(1,Math.round(h/6))}
function morningSpecialist(e){return Number(e.skills?.Forno||0)>=2||Number(e.skills?.Ordini||0)>=2}
function targetMorningCount(e){const total=weeklyShiftTarget(e);if(total<=1)return total;const ratio=morningSpecialist(e)?2/3:1/3;return Math.max(1,Math.min(total-1,Math.round(total*ratio)))}
function initShiftMix(){const mix={};staff('gastronomia').forEach(e=>mix[e.name]={morning:0,evening:0});return mix}
function rotationRank(e){const pool=staff('gastronomia'),idx=pool.findIndex(x=>x.name===e.name),offset=((wi()%Math.max(1,pool.length))+Math.max(1,pool.length))%Math.max(1,pool.length);return idx<0?99:(idx-offset+pool.length)%pool.length}
function gastrShiftScore(e,skill,period,load,mix){const total=weeklyShiftTarget(e),targetMorning=targetMorningCount(e),targetEvening=total-targetMorning,current=mix[e.name]||{morning:0,evening:0},assigned=current.morning+current.evening,target=period==='morning'?targetMorning:targetEvening,count=period==='morning'?current.morning:current.evening,need=target-count,totalNeed=total-assigned,loadRatio=(load[e.name]||0)/(Number(e.hours)||1),skillLevel=Number(e.skills?.[skill]||0),specialist=morningSpecialist(e);let score=loadRatio*26-need*34-totalNeed*5-skillLevel*4+rotationRank(e)*.8;if(period==='evening')score+=specialist?5:-7;if(period==='morning'&&(skill==='Forno'||skill==='Ordini'))score+=specialist?-7:8;if(count>=target)score+=(count-target+1)*24;if(assigned>=total)score+=(assigned-total+1)*18;return score}
function chooseGastr(skill,period,d,load,mix,exclude=[]){let pool=staff('gastronomia').filter(e=>!exclude.includes(e.name)&&!leave(e.name,d)&&Number(e.skills?.[skill]||0)>0);if(!pool.length)pool=staff('gastronomia').filter(e=>!exclude.includes(e.name)&&!leave(e.name,d));pool.sort((a,b)=>gastrShiftScore(a,skill,period,load,mix)-gastrShiftScore(b,skill,period,load,mix));return pool[0]?.name||'SCOPERTO'}
function registerShiftMix(mix,name,period){if(!mix||!mix[name]||!period)return;mix[name][period]=(mix[name][period]||0)+1}
function shiftPeriodFlags(s){const flags={morning:false,evening:false};shiftSegments(s).forEach(([a])=>{if(a<12*60)flags.morning=true;else flags.evening=true});return flags}
const CRC=[{start:'06:00',end:'13:30',mode:'morning',note:'Apertura · copre servizio',pause:15},{start:'06:00',end:'13:00',start2:'14:00',end2:'15:30',mode:'morning',note:'Apertura + assistenza',pause:15},{start:'13:30',end:'20:45',mode:'evening',note:'Solo serale',pause:15},{start:'06:30',end:'13:30',mode:'morning',note:'Mattina · copre servizio',pause:15},{start:'06:00',end:'13:30',mode:'morning',note:'Apertura · copre servizio',pause:15},{start:'09:30',end:'13:30',start2:'16:30',end2:'20:45',mode:'split',note:'Spezzato · servizio e chiusura',pause:0}],ANCH=mon(new Date('2026-07-20T12:00:00'));
function wi(){return Math.round((week-ANCH)/604800000)}function off(){return((wi()%6)+6)%6}function crShift(i){if(i===6)return null;return{...CRC[(i-off()+6)%6]}}function swapSat(){return((wi()%2)+2)%2===1}function push(day,dep,s,load,mix,period){day[dep].push(s);load[s.name]=(load[s.name]||0)+dur(s);registerShiftMix(mix,s.name,period)}function crCanMorning(c){return c&&mins(c.start)<=390&&mins(c.end)>=810}
