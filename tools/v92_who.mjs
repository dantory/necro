const CDP="http://127.0.0.1:9333", URL="http://127.0.0.1:8774/index.html";
const fs=await import("node:fs");
const ver=await (await fetch(CDP+"/json/version")).json();
const bws=new WebSocket(ver.webSocketDebuggerUrl); let id=0; const pend=new Map();
const raw=(m,p={},s)=>{const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));};
bws.addEventListener("message",ev=>{const m=JSON.parse(ev.data); if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);return m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:URL});
const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:1,mobile:false});
const wait=ms=>new Promise(r=>setTimeout(r,ms));
const ev2=async e=>(await S("Runtime.evaluate",{expression:e,returnByValue:true})).result?.value;
const meta={gold:182400,lv:26,xp:0,deepest:52,runs:6,dive:1,diveSet:1,up:{hp:8,mp:6,dmg:9,army:5},plus:{wand:6,robe:4,charm:5},
 equip:{wand:{k:"wand",tier:3,af:[{id:"dmg",v:22},{id:"mp",v:1.4}]},robe:{k:"robe",tier:3,af:[{id:"hp",v:88}]},charm:{k:"charm",tier:2,af:[{id:"mdmg",v:18}]}},
 bag:[],tree:{},quests:{},relics:0,rebirths:0,best:52,lastSeen:0,corpses:0};
await S("Page.reload",{ignoreCache:true}); await wait(2500);
await ev2(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload",{ignoreCache:true}); await wait(1500);
await ev2(`window.__toDungeon()`);
for(let i=0;i<45;i++){await wait(1000); const a=await ev2(`(()=>({at:(window.MODE||{}).at,dead:!!(window.S&&S.dead)}))()`); if(a&&(a.at!=="dungeon"||a.dead)) await ev2(`window.__toDungeon()`);}
/* 얼린다 */
await ev2(`window.__FREEZE=1; window.__DT_FIX=1e-6;`);
const dump = await ev2(`(()=>{const s=window.S;
 const P=o=>({x:Math.round(o.x),y:Math.round(o.y),k:o.k||o.kind||o.id||o.type||"?",hp:Math.round(o.hp||0),own:!!o.own,dead:!!o.dead});
 return {floor:s.floor, hero:{x:Math.round(s.x),y:Math.round(s.y)},
  minions:s.minions.map(P), mobs:s.mobs.map(P), corpses:s.corpses,
  corpseList:(s.corpseList||s.bodies||[]).length,
  left:(s.left!=null?s.left:null)};})()`);
console.log(JSON.stringify(dump,null,1));
const shot=await S("Page.captureScreenshot",{format:"png"});
fs.writeFileSync("tmp/who.png",Buffer.from(shot.data,"base64"));
console.log("wrote tmp/who.png");
process.exit(0);
