/* V-116 그림 — **같은 사람 · 같은 순간**에 문만 여닫아 마을 구슬을 견준다.
   따로 두 판을 걷게 하면 판이 갈려(레벨·전리품) 무엇이 고침의 몫인지 못 읽는다. */
import fs from "node:fs";
const CDP="http://127.0.0.1:9333", URL="http://127.0.0.1:8774/index.html";
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0; const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true,awaitPromise:true})).result?.value;
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:2,mobile:false});
await S("Page.reload",{ignoreCache:true}); await wait(1200);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload",{ignoreCache:true}); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
/* ★ 문은 **내려가기 «전»에** 연다 — 마을로 돌아온 뒤에 열어 봐야 소용이 없다.
   고친 결이 이미 층을 옮겨 놨고, 옛 층은 그때 사라진다(첫 판에 그러다 두 그림이 같았다). */
await ev(`window.__TOWNBODYOLD=1`);
/* 깊이 내려갔다 나온 사람을 만든다 — 얕게 나오면 두 결이 같아 그림이 아무 말도 안 한다 */
await ev(`(()=>{const g=document.getElementById('goGate')||[...document.querySelectorAll('.hBtn,button')].find(b=>/입구/.test(b.textContent));if(g)g.click();return 1})()`); await wait(700);
await ev(`(()=>{const b=[...document.querySelectorAll('#winDive button')].find(e=>/내려가기/.test(e.textContent));if(b)b.click();return 1})()`);
await wait(100000);
await ev(`(()=>{const b=[...document.querySelectorAll('button,.hBtn')].find(e=>/나가기/.test(e.textContent));if(b)b.click();return 1})()`); await wait(1500);
await ev(`(()=>{const b=[...document.querySelectorAll('button')].filter(e=>e.offsetParent).find(e=>/마을로|확인|닫기|계속/.test(e.textContent));if(b)b.click();return 1})()`); await wait(1800);
const R=`(()=>{const C=globalThis.__C,S=C.S;return JSON.stringify({floor:S.floor,hp:document.getElementById('hpNum').textContent,mp:document.getElementById('mpNum').textContent,army:document.getElementById('gArmy').textContent})})()`;
const crop=async(n)=>{const {data}=await S("Page.captureScreenshot",{format:"png",clip:{x:0,y:640,width:1512,height:223,scale:2}});
  fs.writeFileSync("tmp/"+n+".png",Buffer.from(data,"base64")); return "tmp/"+n+".png";};
/* ① 옛 결 — 문이 열린 채로 돌아왔다. 마을이 «나온 층»의 몸을 들고 서 있다. */
console.log("옛 결 ", await ev(R), await crop("v116_old"));
/* ② 지금 결 — 문만 닫는다. 사람도 순간도 그대로다. */
await ev(`window.__TOWNBODYOLD=0`); await wait(900);
console.log("지금  ", await ev(R), await crop("v116_new"));
await S("Target.closeTarget",{targetId});
process.exit(0);
