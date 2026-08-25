/* V-57 자 — **대장간 격자에 「빈 구멍」이 몇이고, 칸이 얼마나 차 있나.**
   V-28 이 편성·운용에 세운 규칙(「고를 것이 넷이면 칸도 넷 · 빈 칸은 «아직 못 여는 것»
   으로 읽힌다」)이 대장간에는 안 옮겨져 있다 — 여기만 아직 빈 칸 넷을 그린다.
   재는 것: 빈 칸 수 · 둘째 줄에 홀로 선 칸 수 · 칸 크기 · 그림이 칸의 몇 %를 칠하나.
   문: `body.noPickName` 이면 고치기 전 꼴(6칸 격자 + 빈 칸 넷)로 되돌아간다.
   node tools/v57_forge.mjs */
const CDP="http://127.0.0.1:9333",URL="http://127.0.0.1:8774/index.html";
const fs=await import("node:fs");
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,120));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true})).result?.value;
const meta={gold:182400,lv:26,xp:0,deepest:52,runs:6,dive:1,diveSet:1,up:{hp:8,mp:6,dmg:9,army:5},plus:{wand:6,robe:4,charm:5},equip:{},bag:[],tree:{bone:8,armor:3,ghoul:1,golem:1,legion:2},quests:{},relics:0,rebirths:0,best:52,lastSeen:0,corpses:0};
const OLD=process.env.OLD==="1", TAG=process.env.TAG||"";
const SIZES=[[1512,863],[1366,768],[1366,700],[1280,620]];
for(const [W,H] of SIZES){
 await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:false});
 await S("Page.reload",{ignoreCache:true});await wait(2000);
 await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
 await S("Page.reload",{ignoreCache:true});await wait(1800);
 if(OLD) await ev(`document.body.classList.add("noPickName")`);
 await ev(`window.__openWin("forge")`);await wait(600);
 const r=await ev(`(()=>{const g=document.getElementById("forgeGrid");const gr=g.getBoundingClientRect();
  const cells=[...g.children].map(c=>({empty:c.classList.contains("empty"),r:c.getBoundingClientRect()}));
  const tops=[...new Set(cells.map(c=>Math.round(c.r.top)))].sort((a,b)=>a-b);
  const rows=tops.map(t=>cells.filter(c=>Math.round(c.r.top)===t));
  const lastRow=rows[rows.length-1];
  const ico=[...g.querySelectorAll("i")].map(i=>{const ir=i.getBoundingClientRect(),cr=i.parentElement.getBoundingClientRect();
    return cr.width*cr.height? Math.round(1000*ir.width*ir.height/(cr.width*cr.height))/10 : 0;});
  return {n:cells.length, empty:cells.filter(c=>c.empty).length, rows:rows.length,
    lastRowN:lastRow.length, lastRowEmpty:lastRow.filter(c=>c.empty).length,
    cell:Math.round(cells[0].r.width)+"×"+Math.round(cells[0].r.height),
    gridH:Math.round(gr.height), fill:ico.length?Math.round(10*ico.reduce((a,b)=>a+b,0)/ico.length)/10:0,
    tip:Math.round(document.getElementById("forgeTip").getBoundingClientRect().height)};})()`);
 console.log(`── ${W}×${H}  칸 ${r.n}(빈 칸 **${r.empty}**) · ${r.rows}줄 · 마지막 줄 ${r.lastRowN}칸(빈 ${r.lastRowEmpty}) · 칸크기 ${r.cell} · 그림이 칸의 ${r.fill}% · 격자높이 ${r.gridH} · 설명칸 ${r.tip}`);
 const s=await S("Page.captureScreenshot",{format:"png"});fs.writeFileSync(`tmp/v57_forge_${W}x${H}${TAG}.png`,Buffer.from(s.data,"base64"));
}
console.log("콘솔오류",errs.length,errs.slice(0,3));
await raw("Target.closeTarget",{targetId});process.exit(0);
