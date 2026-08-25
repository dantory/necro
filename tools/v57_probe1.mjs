/* 훑개가 「트리에 가로 잘린 것 48」이라 했다 — **정말 사람 눈에 잘리는가**를 본다.
   요소마다 클래스·글월·칸너비·속너비를 그대로 뽑는다(자를 먼저 의심한다). */
const CDP="http://127.0.0.1:9333",URL="http://127.0.0.1:8774/index.html";
const fs=await import("node:fs");
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);
await S("Page.enable");await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true})).result?.value;
const meta={gold:182400,lv:26,xp:0,deepest:52,runs:6,dive:1,diveSet:1,up:{hp:8,mp:6,dmg:9,army:5},plus:{wand:6,robe:4,charm:5},equip:{},bag:[],tree:{bone:8,armor:3,ghoul:1,golem:1,legion:2},quests:{},relics:0,rebirths:0,best:52,lastSeen:0,corpses:0};
const W=+(process.env.W||1512),H=+(process.env.H||863);
await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:false});
await S("Page.reload",{ignoreCache:true});await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload",{ignoreCache:true});await wait(1900);
await ev(`window.__openWin("tree")`);await wait(600);
const r=await ev(`(()=>{const w=document.getElementById("winTree");const out=[];
 for(const el of w.querySelectorAll("*")){const o=el.scrollWidth-el.clientWidth;
  if(o>2&&el.clientWidth>0){const cs=getComputedStyle(el);
   out.push({cls:el.className&&el.className.slice?el.className.slice(0,28):"",tag:el.tagName,
    txt:(el.textContent||"").trim().slice(0,22),cw:el.clientWidth,sw:el.scrollWidth,over:o,
    ov:cs.overflow+"/"+cs.overflowX,ws:cs.whiteSpace,ell:cs.textOverflow,fs:cs.fontSize});}}
 return {n:out.length,list:out.slice(0,14)};})()`);
console.log(W+"×"+H+" 가로 넘친 것", r.n);
for(const x of r.list) console.log(`  ${x.tag}.${x.cls} 「${x.txt}」 칸 ${x.cw} 속 ${x.sw} (+${x.over}) ov=${x.ov} ws=${x.ws} ell=${x.ell} fs=${x.fs}`);
const s=await S("Page.captureScreenshot",{format:"png"});fs.writeFileSync(`tmp/v57_tree_${W}x${H}.png`,Buffer.from(s.data,"base64"));
await raw("Target.closeTarget",{targetId});process.exit(0);
