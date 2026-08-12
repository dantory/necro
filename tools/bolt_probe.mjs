/* **뼈가 휘두름의 어느 칸에서 손을 떠나나** — 판이 흐르는 채로 프레임마다 보고,
   뼈가 하나 늘어난 순간의 `S.pswing` 을 읽는다. 진행도 = 1 - pswing/SWING_T.
   판의 다른 모든 타격은 IMPACT_AT(0.55)에서 터진다 — 본인 것만 0.00 이면
   「공격이 먼저 나가고 모션이 뒤늦게」로 보인다(병수님 2026-08-12).
     node tools/bolt_probe.mjs [초] */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const SEC=+(process.argv[2]||10);
const ver=await(await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];
function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");await S("Network.enable");
await S("Network.setCacheDisabled",{cacheDisabled:true});
await S("Emulation.setDeviceMetricsOverride",{width:414,height:860,deviceScaleFactor:2,mobile:true});
await S("Page.navigate",{url:PAGE});await new Promise(r=>setTimeout(r,1200));
await S("Runtime.evaluate",{expression:`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:14,deepest:10,runs:3,up:{hp:3,mp:2,dmg:2,army:1},equip:{},bag:[],tree:{bone:2,armor:3}}))`});
await S("Page.reload",{ignoreCache:true});await new Promise(r=>setTimeout(r,4800));
await S("Runtime.evaluate",{expression:"window.__toDungeon&&window.__toDungeon()"});
await new Promise(r=>setTimeout(r,700));
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const B=await import("/js/battle.js");B.enterFloor(8);return 1;})()`});
await new Promise(r=>setTimeout(r,4000));
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{
  const B=await import("/js/battle.js"); const S=window.__S;
  const R=window.__B={hits:[],t0:performance.now(),prev:S.bolts.length};
  const snap=()=>{ const n=S.bolts.length;
    if(n>R.prev) R.hits.push({pswing:+(S.pswing||0).toFixed(3), 진행도:+(1-(S.pswing||0)/B.SWING_T).toFixed(2)});
    R.prev=n;
    if((performance.now()-R.t0)/1000<${SEC}) requestAnimationFrame(snap);};
  requestAnimationFrame(snap); return "on";})()`});
await S("Runtime.evaluate",{awaitPromise:true,expression:
  `new Promise(r=>{setTimeout(()=>r(1), ${SEC*1000+800});})`});
const r=await S("Runtime.evaluate",{returnByValue:true,expression:`JSON.stringify(window.__B.hits)`});
const h=JSON.parse(r.result.value);
if(!h.length){console.log("INVALID — 뼈가 한 번도 안 나갔다(표본 0은 통과가 아니다)");}
else{
  const p=h.map(x=>x.진행도).sort((a,b)=>a-b);
  console.log(`뼈 ${h.length}발 · 손을 떠난 진행도: 중앙 ${p[p.length>>1]} · 최소 ${p[0]} · 최대 ${p[p.length-1]}`);
  console.log(`   (IMPACT_AT 0.55 가 목표 — 0.00 이면 팔을 들기도 전에 나간 것)`);
  console.log("   앞 다섯:", h.slice(0,5).map(x=>x.진행도).join(" · "));
}
console.log("errors:",errs.slice(0,3));
await raw("Target.closeTarget",{targetId});bws.close();
