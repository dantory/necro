/* **군대가 밀고 나가는가** — 병수님이 두 번 말한 「소환수가 제자리에서 크게 이동 안 한다」.
     node tools/march_qa.mjs [초=40] [씨앗=3]
   ★ 「걷는다/안 걷는다」도 「얼마나 빠른가」도 아니다 — **얼마나 멀리 나가 있나**를 잰다.
     빠르기만 올려도 갈 데가 없으면 제자리에서 종종거린다(그게 지난번 실패였다).
     그래서 셋을 본다: 진이 기운 거리 · 소환수가 본인에게서 떨어진 거리 · 1초에 실제로
     옮긴 거리(왕복은 상쇄되므로 **경로 길이**로 센다). */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const SEC=+(process.argv[2]||40), SEED=+(process.argv[3]||3);
for (const t of (await (await fetch(CDP+"/json/list")).json()).filter(t=>t.type==="page"&&t.url.startsWith("http://127.0.0.1:8774")))
  await fetch(`${CDP}/json/close/${t.id}`).catch(()=>{});
const ver=await (await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);const wait=ms=>new Promise(r=>setTimeout(r,ms));
await S("Page.enable");await S("Runtime.enable");await S("Network.enable");await S("Network.setCacheDisabled",{cacheDisabled:true});
const seed=`Math.random=(()=>{let s=(${SEED}>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();`;
await S("Page.addScriptToEvaluateOnNewDocument",{source:seed});
await S("Emulation.setDeviceMetricsOverride",{width:414,height:860,deviceScaleFactor:1,mobile:true});
await S("Page.navigate",{url:PAGE});await wait(1500);
await S("Runtime.evaluate",{expression:`localStorage.removeItem("necro.meta.v1")`});
await S("Page.reload",{ignoreCache:true});await wait(4500);
await S("Runtime.evaluate",{expression:"window.__toDungeon()"});await wait(900);
await S("Runtime.evaluate",{expression:"window.requestAnimationFrame=()=>0"});await wait(200);
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const B=await import("/js/battle.js");${seed}B.newRun();return "ok";})()`});
const r=JSON.parse((await S("Runtime.evaluate",{awaitPromise:true,returnByValue:true,expression:`(async()=>{
  const B=await import("/js/battle.js"); const S=window.__S; const n=Math.round(${SEC}/0.05);
  let autoT=0, last=new Map(), path=0, marched=0, ticks=0, pushSum=0, pushMax=0, awaySum=0, away=0, still=0;
  for(let i=0;i<n;i++){
    B.step(0.05);
    if((autoT+=0.05)>0.35){autoT=0;try{window.auto()}catch{}}
    if(S.dead) B.newRun();
    /* 옛 코드엔 push 가 없다 — A/B 를 해야 하므로 견딘다. (줄 주석을 이 줄 끝에 달았다가
       뒤따르는 셈 세 개를 통째로 먹어 「기운 거리 0」이 나왔다. 주석은 위에.) */
    const PU=S.push||{x:0,y:0}; const p=Math.hypot(PU.x, PU.y); pushSum+=p; pushMax=Math.max(pushMax,p); ticks++;
    for(const u of S.minions){ const L=last.get(u.id);
      if(L){ const d=Math.hypot(u.x-L.x,u.y-L.y); path+=d; if(d<0.05*4) still++; marched++; }
      last.set(u.id,{x:u.x,y:u.y}); awaySum+=Math.hypot(u.x,u.y); away++; }
  }
  return JSON.stringify({ 진이기운평균:+(pushSum/ticks).toFixed(1), 진이기운최대:+pushMax.toFixed(1),
    본인에게서평균:+(awaySum/Math.max(1,away)).toFixed(1),
    초당경로:+(path/Math.max(1,marched)/0.05).toFixed(1),
    멈춰있던비율:+(still/Math.max(1,marched)*100).toFixed(0), 층:S.floor });})()`})).result.value);
console.log(JSON.stringify(r), errs.length?("예외 "+errs[0]):"");
await raw("Target.closeTarget",{targetId});bws.close();process.exit(0);
