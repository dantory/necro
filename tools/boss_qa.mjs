/* **보스가 굼뜨고 부자연스러운가** — 병수님 2026-08-13 01:03 "특히 보스 움직임이
   부자연스럽고 굼뜬느낌이 강하네".
     node tools/boss_qa.mjs [층=5] [초=30] [씨앗=3]
   ★ 절대 속도로 재면 보스도 졸개도 22~32 로 **같다** — 그래서 여태 아무 자에도 안 걸렸다.
     사람 눈은 **제 몸 폭의 몇 배/초**로 본다(2026-08-12 에 배운 자). 보스는 몸이 두 배라
     같은 속도라도 절반으로 보인다.
   ★ 「부자연스럽다」는 **끊김**으로 잰다 — 걷다 서다 하는 비율(멈춘 틱/전체 틱)과
     한 번 멈추면 얼마나 오래 서 있나. */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const F=+(process.argv[2]||5), SEC=+(process.argv[3]||30), SEED=+(process.argv[4]||3);
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
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url:PAGE});await wait(1500);
await S("Runtime.evaluate",{expression:`localStorage.removeItem("necro.meta.v1")`});
await S("Page.reload",{ignoreCache:true});await wait(4500);
await S("Runtime.evaluate",{expression:"window.__toDungeon()"});await wait(900);
await S("Runtime.evaluate",{expression:"window.requestAnimationFrame=()=>0"});await wait(200);
const out=JSON.parse((await S("Runtime.evaluate",{awaitPromise:true,returnByValue:true,expression:`(async()=>{
  const B=await import("/js/battle.js"), C=await import("/js/core.js"); const S=window.__S;
  ${seed} B.newRun(); B.enterFloor(${F});           // 관문 층으로 바로 내려선다
  let autoT=0, last=new Map(), acc={}, n=Math.round(${SEC}/0.05);
  for(let i=0;i<n;i++){
    B.step(0.05);
    if((autoT+=0.05)>0.35){autoT=0;try{window.auto()}catch{}}
    if(S.dead) break;
    const seen=[...S.mobs.map(m=>({o:m,g:m.boss?"보스":"졸개 "+m.kind})),
                ...S.minions.map(u=>({o:u,g:"아군 "+u.kind}))];
    for(const {o,g} of seen){
      const A=acc[g]||(acc[g]={폭:0,틱:0,길이:0,멈춤:0,연속:0,최장멈춤:0,수:0});
      const L=last.get(o.id);
      if(L){ const d=Math.hypot(o.x-L.x,o.y-L.y); A.길이+=d; A.틱++;
        if(d < 0.2){ A.멈춤++; A.연속+=0.05; A.최장멈춤=Math.max(A.최장멈춤,A.연속); } else A.연속=0; }
      last.set(o.id,{x:o.x,y:o.y});
      A.폭 += (o.r||1)*2; A.수++;
    }
  }
  const rows=Object.entries(acc).filter(([,A])=>A.틱>40).map(([g,A])=>({무엇:g,
    "몸폭": +(A.폭/A.수).toFixed(0),
    "몸폭/초": +((A.길이/A.틱/0.05)/(A.폭/A.수)).toFixed(2),
    "px/초": +(A.길이/A.틱/0.05).toFixed(1),
    "멈춘 비율%": +(A.멈춤/A.틱*100).toFixed(0),
    "제일 오래 선 시간": +A.최장멈춤.toFixed(2) }));
  return JSON.stringify({층:S.floor, rows});})()`})).result.value);
console.log(`${F}층 · ${SEC}초 · 씨앗 ${SEED}`);
console.table(out.rows);
if(errs.length) console.log("예외:",errs[0]);
await raw("Target.closeTarget",{targetId});bws.close();process.exit(0);
