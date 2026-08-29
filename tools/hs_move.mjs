/* 한 방향씩 눌러 «실제로 어디로 가는가»를 잰다. 걷기가 안 되면 이 게임은 성립을 안 한다. */
const CDP="http://127.0.0.1:9333", URL="http://127.0.0.1:8774/hs/index.html";
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0; const pend=new Map(); const errs=[];
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data);
 if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:1,mobile:false});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true})).result?.value;
const key=async(k,c,d)=>S("Input.dispatchKeyEvent",{type:d?"keyDown":"keyUp",key:k,code:c,windowsVirtualKeyCode:k.toUpperCase().charCodeAt(0),nativeVirtualKeyCode:k.toUpperCase().charCodeAt(0)});
await wait(2200);
console.log("방  1초 누른 뒤 이동(dx,dy)  기대");
const want={d:"+x",a:"-x",s:"+y",w:"-y"};
for(const [k,exp] of Object.entries(want)){
  const a=JSON.parse(await ev("JSON.stringify([G.player.x|0,G.player.y|0])"));
  await key(k,"Key"+k.toUpperCase(),true); await wait(1000); await key(k,"Key"+k.toUpperCase(),false); await wait(120);
  const b=JSON.parse(await ev("JSON.stringify([G.player.x|0,G.player.y|0])"));
  console.log(` ${k}   dx=${b[0]-a[0]}  dy=${b[1]-a[1]}   기대 ${exp}`);
}
/* keydown 을 게임이 실제로 받는가 */

/* 팩으로 «곧장» 걸어가 본다 — 매초 자리와 남은 거리를 적는다. */
const tj = await ev(`(()=>{const p=G.player;let b=null,bd=1e9;for(const pk of G.packs){const d=Math.hypot(pk.x-p.x,pk.y-p.y);if(d<bd){bd=d;b=pk;}}return b?JSON.stringify({x:b.x|0,y:b.y|0,d:bd|0}):null})()`);
const T = JSON.parse(tj);
console.log("목표 팩:", T);
let held=new Set();
const setk=async(w)=>{for(const k of held)if(!w.has(k))await key(k,"Key"+k.toUpperCase(),false);for(const k of w)if(!held.has(k))await key(k,"Key"+k.toUpperCase(),true);held=w;};
for(let s2=0;s2<14;s2++){
  const P=JSON.parse(await ev("JSON.stringify({x:G.player.x|0,y:G.player.y|0,hp:G.player.hp|0,dead:G.dead,fl:G.floor})"));
  const dx=T.x-P.x, dy=T.y-P.y, dist=Math.hypot(dx,dy)|0;
  console.log(`  ${s2}s  (${P.x},${P.y}) 남은 ${dist}  hp${P.hp} dead=${P.dead} 층${P.fl}`);
  if(dist<90){console.log("  도착");break;}
  const w=new Set();
  if(dx>30)w.add("d");else if(dx<-30)w.add("a");
  if(dy>30)w.add("s");else if(dy<-30)w.add("w");
  await setk(w); await wait(1000);
}
await setk(new Set());
console.log("player 속도:", await ev("G.player.spd ?? G.player.speed ?? '?'"));
console.log("오류:", errs.length, errs.slice(0,3));
await S("Target.closeTarget",{targetId}); process.exit(0);
