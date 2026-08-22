function applyPdv1FridayFishOnly(out){
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return out;
  out.forEach((day,index)=>{
    if(day.holiday?.type==='closed')return;
    const isFish=s=>String(s?.skill||'').toLowerCase().includes('pesce');
    if(index===5){
      day.c=(day.c||[]).filter(s=>!isFish(s));
      return;
    }
    if(index===4){
      const fish=(day.c||[]).find(isFish);
      if(fish){
        fish.start='07:00';
        fish.end='13:30';
        fish.pause=15;
        fish.skill='Vendita pesce · venerdì · priorità competenza 3→2';
        fish.fridayFishOnly=true;
      }
    }
  });
  return out;
}
const buildBeforeFridayFishOnly=build;
build=function(){return applyPdv1FridayFishOnly(buildBeforeFridayFishOnly())};

const pdvRulesPageBeforeFridayFishOnly=pdvRulesPage;
pdvRulesPage=function(){
  pdvRulesPageBeforeFridayFishOnly();
  if(!(typeof pdv1Active==='function'&&pdv1Active()))return;
  document.querySelectorAll('#app .req').forEach(row=>{
    const span=row.querySelector('span'),b=row.querySelector('b');
    if(!span||!b)return;
    const t=span.textContent||'';
    if(t.includes('Venerdì mattina · Gastro/Forno + Pesce'))b.textContent='4 + 1 Pesce 07:00–13:30';
    if(t.includes('Sabato mattina · Gastro/Forno + Pesce')){span.textContent='Sabato mattina · Gastro/Forno';b.textContent='4 · nessuna vendita Pesce'}
  });
};
try{render()}catch(_){}
