const DEFAULT_APPS_SCRIPT_URL='https://script.google.com/macros/s/AKfycbwPZF8mBt9Z-l59BRLmETcIxYD892qKqa9yjBP1SiUltodLoqrec3a7Nc5Hpl2Kj3r_eA/exec';
(function ensureAppsScriptUrl(){
  let cfg={};
  try{cfg=JSON.parse(localStorage.getItem(TELEGRAM_CFG)||'{}')||{}}catch(_){cfg={}}
  if(!String(cfg.url||'').trim()){
    cfg.url=DEFAULT_APPS_SCRIPT_URL;
    localStorage.setItem(TELEGRAM_CFG,JSON.stringify(cfg));
  }
})();
function telegramConfig(){
  try{
    const cfg=JSON.parse(localStorage.getItem(TELEGRAM_CFG)||'{}')||{};
    return{...cfg,url:String(cfg.url||'').trim()||DEFAULT_APPS_SCRIPT_URL};
  }catch(_){return{url:DEFAULT_APPS_SCRIPT_URL,key:''}}
}
try{pdvCloudError='';pdvCloudStatus=telegramConfig().key?'Collegamento configurato · pronto alla sincronizzazione':'Inserisci la chiave amministratore';render()}catch(_){}
