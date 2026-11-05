// Display polling is independent from task tracking and blocking.
export function createViewRefresh({document,window,refresh,interval=1500,
  setInterval=globalThis.setInterval,clearInterval=globalThis.clearInterval}) {
  let timer, running, paused=false, disposed=false;
  function run() {
    if (disposed || paused || document.hidden) return Promise.resolve();
    if (!running) running=Promise.resolve().then(refresh).finally(()=>{running=undefined;});
    return running;
  }
  function synchronize() {
    clearInterval(timer);timer=undefined;
    if (disposed || paused || document.hidden) return;
    void run().catch(()=>{});
    timer=setInterval(()=>{void run().catch(()=>{});},interval);
  }
  function hide() {paused=true;synchronize();}
  function show() {paused=false;synchronize();}
  document.addEventListener('visibilitychange',synchronize);
  window.addEventListener('pagehide',hide);
  window.addEventListener('pageshow',show);
  synchronize();
  return {refresh:run,dispose(){
    disposed=true;clearInterval(timer);timer=undefined;
    document.removeEventListener('visibilitychange',synchronize);
    window.removeEventListener('pagehide',hide);window.removeEventListener('pageshow',show);
  }};
}
