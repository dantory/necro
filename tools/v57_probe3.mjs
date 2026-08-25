/* 훑개가 「능력치 창에 못 본 내용 414px(1512×863에서도)」이라 했다 — **무엇이** 접혀 있나.
   V-56 이 방금 고친 창이라 되레 더 봐야 한다(인물이 접혔으면 그건 되돌아간 것이다). */
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
for(const [W,H] of [[1512,863],[1280,620]]){
 await S("Emulation.setDeviceMetricsOverride",{width:W,height:H,deviceScaleFactor:2,mobile:false});
 await S("Page.reload",{ignoreCache:true});await wait(2000);
 await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
 await S("Page.reload",{ignoreCache:true});await wait(1800);
 await ev(`window.__openWin("stat")`);await wait(600);
 const r=await ev(`(()=>{const b=document.getElementById("statBody");const br=b.getBoundingClientRect();
  const fade=parseFloat(getComputedStyle(b,"::after").height)||0; const lim=br.bottom-fade;
  const kids=[...b.children].map(el=>{const r=el.getBoundingClientRect();
    return {cls:(el.className||"").slice(0,20), h:Math.round(r.height),
      state: r.top>=lim-.5?"통째로 접힘" : r.bottom>lim+.5?"아래가 잘림 "+Math.round(r.bottom-lim)+"px" : "보임"};});
  return {box:Math.round(br.height), inner:Math.round(b.scrollHeight), fade:Math.round(fade), kids,
   charOpen:document.body.classList.contains("charOpen")};})()`);
 console.log(`── ${W}×${H} 상자 ${r.box} 속 ${r.inner} 그늘 ${r.fade} charOpen=${r.charOpen}`);
 for(const k of r.kids) console.log(`   .${k.cls} 높이 ${k.h} → ${k.state}`);
 const s=await S("Page.captureScreenshot",{format:"png"});fs.writeFileSync(`tmp/v57_stat_${W}x${H}.png`,Buffer.from(s.data,"base64"));
}
await raw("Target.closeTarget",{targetId});process.exit(0);
