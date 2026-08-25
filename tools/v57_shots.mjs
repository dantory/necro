/* 창 열하나를 **켜서 찍는다** — 자가 「넘침 0」이라 해도 사람 눈에 어떤지는 따로다. */
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
const S=(m,p)=>raw(m,p,sessionId);await S("Page.enable");await S("Runtime.enable");
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true})).result?.value;
const meta={gold:182400,lv:26,xp:0,deepest:52,runs:6,dive:1,diveSet:1,up:{hp:8,mp:6,dmg:9,army:5},plus:{wand:6,robe:4,charm:5},equip:{},bag:[],tree:{bone:8,armor:3,ghoul:1,golem:1,legion:2},quests:{},relics:0,rebirths:0,best:52,lastSeen:0,corpses:0};
const W=1512,H=863;
await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:false});
await S("Page.reload",{ignoreCache:true});await wait(2000);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload",{ignoreCache:true});await wait(1900);
await ev(`window.LASTRUN=window.LASTRUN||{floor:52,kills:1840,gold:13600,xp:9400,time:720,corpses:236,best:true,drops:[]}`);
const idOf={shop:"winShop",forge:"winForge",dive:"winDive",doctrine:"winDoctrine",tactic:"winTactic",end:"winEnd",reborn:"winReborn",wipe:"winWipe"};
for(const k of Object.keys(idOf)){
  await ev(`try{window.__openWin(${JSON.stringify(k)})}catch(e){}`);await wait(500);
  const on=await ev(`!!document.getElementById(${JSON.stringify(idOf[k])})?.classList.contains("on")`);
  const box=await ev(`(()=>{const w=document.getElementById(${JSON.stringify(idOf[k])});if(!w)return null;const r=w.getBoundingClientRect();
    return {x:Math.max(0,Math.round(r.left)-8),y:Math.max(0,Math.round(r.top)-8),w:Math.round(r.width)+16,h:Math.round(r.height)+16};})()`);
  if(!on||!box){console.log(k,"안 열림");continue;}
  const s=await S("Page.captureScreenshot",{format:"png",clip:{x:box.x,y:box.y,width:box.w,height:box.h,scale:1}});
  fs.writeFileSync(`tmp/v57_win_${k}.png`,Buffer.from(s.data,"base64"));
  console.log(k,"찍음",box.w+"×"+box.h);
  await ev(`window.__openWin(${JSON.stringify(k)})`);await wait(150);
}
await raw("Target.closeTarget",{targetId});process.exit(0);
