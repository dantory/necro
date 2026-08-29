/* 프레임을 «판 안에서» 잰다: 시작 직후 · 팩 하나 깨운 뒤 · 여럿 깨운 뒤.
   손맛은 수치보다 프레임이 먼저 죽인다. node tools/hs_fps.mjs */
const CDP="http://127.0.0.1:9333", URL="http://127.0.0.1:8774/hs/index.html";
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0; const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);
 if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:1,mobile:false});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
await wait(2200);
/* 프레임 세는 자를 페이지 안에 심는다 — 바깥에서 세면 왕복 지연이 섞인다 */
await ev(`window.__fps=(()=>{let n=0,t0=performance.now();const f=()=>{n++;requestAnimationFrame(f)};requestAnimationFrame(f);
  return (ms)=>new Promise(r=>{const a=n,s=performance.now();setTimeout(()=>r(Math.round((n-a)/((performance.now()-s)/1000))),ms)})})()`);
const fps=async ms=>ev(`window.__fps(${ms})`);
const awake=async()=>ev(`G.packs.reduce((a,pk)=>a+(pk.awake&&!pk.done?pk.enemies.filter(e=>e.alive).length:0),0)`);
const alive=async()=>ev(`G.packs.reduce((a,pk)=>a+pk.enemies.filter(e=>e.alive).length,0)`);
console.log(`판 전체 적: ${await alive()}마리`);
console.log(`시작 직후        깨어난 적 ${await awake()}  FPS ${await fps(2000)}`);
/* 팩을 하나씩 깨워 가며 잰다 — 사람이 방을 하나씩 여는 것과 같다 */
for (const n of [1,2,4]) {
  await ev(`(()=>{let c=0;for(const pk of G.packs){if(!pk.awake&&!pk.done&&c<${n}){pk.awake=true;c++;}}})()`);
  await wait(700);
  console.log(`팩 ${n}개 더 깨움  깨어난 적 ${await awake()}  FPS ${await fps(2000)}`);
}
await ev(`for(const pk of G.packs) pk.awake=true;`); await wait(700);
console.log(`전부 깨움        깨어난 적 ${await awake()}  FPS ${await fps(2500)}`);
await S("Target.closeTarget",{targetId}); process.exit(0);
