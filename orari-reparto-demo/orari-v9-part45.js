// Settimana pubblicata PDV 349, PDF Drive del 06/10/2026, 06:58.
// Riusa l'importatore di part44, senza duplicare le regole del motore.
const SEP28_PUBLISHED={"2026-09-28":{"t":[["Gianmarco","GASTRO","06:30","12:15","14:00","16:30"],["Maia","GASTRO","06:00","13:00"],["Stefano","GASTRO","06:00","13:00"],["Massimo","GASTRO","13:30","20:45"],["Antonio","GASTRO","06:30","13:45"],["Marine","GASTRO","14:00","20:45"],["Miriam","GASTRO","07:00","14:00"]],"a":["Gabriele","Katia","Giulio"]},"2026-09-29":{"t":[["Gianmarco","GASTRO","14:00","20:45"],["Gabriele","CARNI","07:00","14:00"],["Stefano","GASTRO","06:15","13:00"],["Massimo","GASTRO","09:00","13:45"],["Antonio","GASTRO","14:00","20:45"],["Miriam","GASTRO","07:00","13:30"],["Giulio","GASTRO","06:00","12:00"]],"a":["Katia","Marine"]},"2026-09-30":{"t":[["Gianmarco","GASTRO","09:30","13:30"],["Gabriele","CARNI","06:30","09:45","14:45","19:30"],["Maia","GASTRO","14:45","20:45"],["Stefano","GASTRO","06:30","13:00"],["Antonio","GASTRO","07:00","14:00"],["Marine","GASTRO","06:00","13:00"],["Miriam","GASTRO","17:00","20:45"],["Giulio","GASTRO","13:50","20:45"]],"a":["Katia"]},"2026-10-01":{"t":[["Gabriele","CARNI","07:00","12:00","14:30","17:45"],["Maia","GASTRO","06:00","13:15"],["Stefano","GASTRO","14:00","20:45"],["Massimo","GASTRO","06:30","13:30"],["Antonio","GASTRO","06:00","13:30"],["Marine","GASTRO","13:30","20:45"],["Miriam","GASTRO","09:00","14:00"],["Giulio","GASTRO","07:00","13:30"]],"a":["Katia"]},"2026-10-02":{"t":[["Gianmarco","CARNI","13:30","20:00"],["Gabriele","CARNI","06:30","12:00","13:00","16:00"],["Maia","CARNI","14:00","20:45"],["Stefano","GASTRO","08:15","09:00","10:00","14:00"],["Massimo","GASTRO","06:30","10:30","11:00","13:45"],["Antonio","GASTRO","06:00","13:30"],["Marine","CARNI","07:00","14:00"],["Miriam","GASTRO","13:30","16:45","17:15","20:45"],["Giulio","GASTRO","06:00","11:00","13:00","15:30"]],"a":["Katia"]},"2026-10-03":{"t":[["Gianmarco","CARNI","06:30","13:30"],["Gabriele","CARNI","10:30","13:00","14:15","20:00"],["Maia","CARNI","14:00","20:00"],["Stefano","GASTRO","06:00","13:00"],["Massimo","GASTRO","09:00","11:00","13:00","13:30"],["Massimo","GASTRO","16:30","17:00","19:00","20:45"],["Antonio","GASTRO","13:30","20:45"],["Marine","GASTRO","06:30","13:30"],["Miriam","GASTRO","07:00","13:00"],["Giulio","GASTRO","15:30","20:45"]],"a":["Katia"]},"2026-10-04":{"t":[["Stefano","GASTRO","07:00","13:15"],["Giulio","GASTRO","07:00","13:15"]],"a":[]}};
Object.assign(OCT_2026_PUBLISHED,SEP28_PUBLISHED);
function sep28PreparePublished(){
  if(!oct2026Active()||S.sep28PublishedVersion==='drive-20261006-v1')return;
  for(const k of Object.keys(S.edits||{}))if(SEP28_PUBLISHED[k.slice(0,10)])delete S.edits[k];
  for(const k of Object.keys(S.crEdits||{}))if(SEP28_PUBLISHED[k])delete S.crEdits[k];
  S.manualShifts=(S.manualShifts||[]).filter(x=>!SEP28_PUBLISHED[String(x.date||'')]);
  S.absenceCoverageChoices=(S.absenceCoverageChoices||[]).filter(x=>!SEP28_PUBLISHED[String(x.date||'')]);
  S.sep28PublishedVersion='drive-20261006-v1';
  save();
}
const buildBeforeSep28=build;
build=function(){sep28PreparePublished();return buildBeforeSep28()};
const applyBeforeSep28=oct2026Apply;
oct2026Apply=function(out,applyEdits=false){
  const result=applyBeforeSep28(out,applyEdits);
  for(const day of result||[]){
    if(!SEP28_PUBLISHED[key(day.date)])continue;
    day.oct2026Source='orario dal 28 sett al 4 ottobre.PDF';
    day.publishedDriveNote='PDF Drive · Pubblicato · 06/10/2026 06:58';
  }
  return result;
};
try{if(view==='schedule'||view==='home')render()}catch(e){console.error('Pubblicato 28/09–04/10:',e)}
