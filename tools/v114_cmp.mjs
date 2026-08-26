/* V-114 켜서 본 것 — 1280×620 에서 레벨업 줄이 서는 자리(위 옛 결 · 아래 지금). */
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
await S("Emulation.setDeviceMetricsOverride",{width:1280,height:620,deviceScaleFactor:2,mobile:false});
await S("Page.reload",{ignoreCache:true}); await wait(1200);
await ev("(()=>{try{localStorage.clear()}catch(e){}return 1})()");
await S("Page.reload",{ignoreCache:true}); await wait(2200);
await ev("window.__openWin&&window.__openWin('dive')"); await wait(300);
await ev("(()=>{const b=[...document.querySelectorAll('#winDive button,#winDive .cell')].find(e=>/내려가기/.test(e.textContent));if(b)b.click();return 1})()");
await wait(2500);
/* 덮이는 자리는 **셋째 줄**이다(갓 뜬 맨 윗줄은 타일보다 위다) — 그 자리에 세워 찍는다. */
const stage = (h)=>`(()=>{const L=document.getElementById('log');L.innerHTML='';
  for(let k=0;k<2;k++){const f=document.createElement('div');f.textContent='해골 전사 소환';L.appendChild(f);}
  const s=${JSON.stringify(h)};const m=/^(\\s*<b\\b[^>]*>.*?<\\/b>)([\\s\\S]+)$/.exec(s);
  const d=document.createElement('div');d.innerHTML=m?m[1]+'<i class="d">'+m[2]+'</i>':s;L.appendChild(d);
  L.dataset.frozen='1';return 1})()`;
for (const [nm, html] of [
  ["old", '<b style="color:#ffff64">레벨 12</b> 달성 · 체력·마나 회복 · 스킬 점수 <b>3</b> — <b>T</b> 「어둠의 길」에서 찍는다'],
  ["new", '<b style="color:#ffff64">레벨 12</b> 달성 · 스킬 점수 <b>3</b> — <b>T</b> 「스킬」에서 찍는다'],
]) {
  await ev(stage(html));
  const {data}=await S("Page.captureScreenshot",{format:"png"});
  fs.writeFileSync("tmp/v114_"+nm+".png", Buffer.from(data,"base64"));
  console.log("  → tmp/v114_"+nm+".png  " + await ev("(()=>{const r=document.getElementById('log').getBoundingClientRect();return JSON.stringify([Math.round(r.top),Math.round(r.height)])})()"));
}
await S("Target.closeTarget",{targetId});
process.exit(0);
