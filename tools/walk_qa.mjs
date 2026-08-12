/* **걷는 그림이 실제로 도는가** — 병수님 2026-08-13 06:27 "하수인 걷는모션 없이 떠다님".
     node tools/walk_qa.mjs [초=25] [씨앗=3]
   ★ 프레임이 **있느냐**는 자산 얘기고(7장 다 있다), 보이느냐는 **초당 몇 칸 넘어가느냐**다.
     걸음 위상은 지나온 거리로 세는데(main.js WALK_PER_BODY) 한 바퀴에 「제 몸 폭의 1.8배」를
     가야 한다 — 느린 놈은 한 바퀴에 몇 초가 걸려 다리가 사실상 멎는다. 그게 「떠다님」이다.
   ★ 그래서 재는 것: 걷는 상태인 동안 **초당 프레임 수**와 **한 바퀴에 걸리는 시간**.
     사람 눈에 걷는 것으로 보이려면 한 바퀴 ≈0.6~1.2초다. */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const SEC=+(process.argv[2]||25), SEED=+(process.argv[3]||3);
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
await S("Page.addScriptToEvaluateOnNewDocument",{source:`Math.random=(()=>{let s=(${SEED}>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();`});
await S("Emulation.setDeviceMetricsOverride",{width:414,height:860,deviceScaleFactor:1,mobile:true});
await S("Page.navigate",{url:PAGE});await wait(1500);
await S("Runtime.evaluate",{expression:`localStorage.removeItem("necro.meta.v1")`});
await S("Page.reload",{ignoreCache:true});await wait(4800);
/* **그리는 고리를 그대로 둔다** — 걷는 그림은 draw() 안에서 정해지므로 rAF 를 끊으면 못 잰다.
   그래서 시간을 안 당기고 진짜로 지켜본다(그 대신 짧게). */
await S("Runtime.evaluate",{expression:"window.__toDungeon(); window.__ANIM=[]"});
await wait(SEC*1000);
const out=JSON.parse((await S("Runtime.evaluate",{returnByValue:true,expression:`(()=>{
  const A=window.__ANIM||[]; window.__ANIM=null;
  /* ★ **개체별로 센다.** 처음엔 종류별로 뭉쳐 세다가 「초당 245프레임」 같은 값이 나왔다 —
     한 화면에 같은 종이 여럿이면 그 수만큼 곱해진다. 그리는 고리는 개체 하나를 한 프레임에
     한 번 그리므로, 개체의 「걷는 칸 수 / 60」이 곧 그 개체가 걸은 초다. */
  const per=new Map();
  for(const r of A){ const K=r.id+"|"+r.base; let B=per.get(K);
    if(!B) per.set(K,B={base:r.base,전체:0,걷는칸:0,바뀜:0,lastF:null,lastState:null});
    B.전체++;
    if(r.state==="walk"){ B.걷는칸++; if(B.lastState==="walk" && r.f!==B.lastF) B.바뀜++; B.lastF=r.f; }
    B.lastState=r.state; }
  /* ★ **그리는 박자를 가정하지 말 것.** 60 으로 나눴다가 「초당 3프레임」이 나왔는데 이 판은
     그보다 느리게 그린다. 개체는 한 프레임에 한 번 그려지므로, **처음부터 끝까지 살아 있던
     개체**(그려진 칸이 제일 많은 것)의 칸 수가 곧 이 판이 그린 프레임 수다. */
  const FPS = Math.max(...[...per.values()].map(B=>B.전체)) / ${SEC};
  const by={};
  for(const B of per.values()){ if(B.걷는칸<30) continue;         // 잠깐 스친 개체는 표본이 아니다
    const g=by[B.base]||(by[B.base]={수:0,fps:0,걷는칸:0,그림fps:0});
    /* ★ **그리는 박자를 가정하지 말 것.** 60fps 로 나눴다가 「초당 3프레임」이 나왔는데
       이 판은 그보다 느리게 그린다 — 개체가 살아 있던 동안 그려진 칸 수에서 직접 뽑는다.
       (개체는 한 프레임에 한 번 그려지므로 전체칸/살아있던초 = 그 판의 fps 다.) */
    g.수++; g.fps += B.바뀜/(B.걷는칸/FPS); g.그림fps += FPS; g.걷는칸+=B.걷는칸; }
  return JSON.stringify(Object.entries(by).map(([b,g])=>({무엇:b, 개체수:g.수,
    "그리는 fps":+(g.그림fps/g.수).toFixed(0),
    "걷는 동안 초당 프레임":+(g.fps/g.수).toFixed(2),
    "한 바퀴(초)":+(7/Math.max(0.01,g.fps/g.수)).toFixed(2) })));})()`})).result.value);
console.table(out);
if(errs.length) console.log("예외:",errs[0]);
await raw("Target.closeTarget",{targetId});bws.close();process.exit(0);
