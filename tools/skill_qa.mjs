/* **스킬을 하나씩 쏘고 그 자리를 본다.**
     node tools/skill_qa.mjs [out.png]

   ★★ 이 자가 없어서 병수님이 먼저 봤다(2026-08-13): 「시체폭발 이펙트가 왜 내 주위에서
   터지는거야, 폭발되는 시체에 이펙트가 나와야지」. 실제로 쓴 시체의 자리(usedAt)를
   구해 놓고 **소환에만 쓰고**, 폭발은 그림도 피해도 본인 자리(0,0)에서 냈다.
   여태 자들은 수치(깊이·점유·겹침)만 봤지 **「스킬을 쏘면 어디서 무슨 일이 나나」**
   라는 제일 기본을 한 번도 안 봤다. 그래서 이걸 둔다.

   판을 세워 놓고(speed 0) 시체를 **아는 자리**에 심은 뒤 스킬을 부르고,
   생긴 이펙트·소환수가 **그 자리**에 있는지 잰다. */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const fs=await import("node:fs");
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
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:3,mobile:false});
await S("Page.navigate",{url:PAGE});await new Promise(r=>setTimeout(r,1200));
await S("Runtime.evaluate",{expression:`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:16,deepest:14,runs:3,up:{hp:3,mp:4,dmg:2,army:2},equip:{},bag:[],tree:{bone:2,armor:3,legion:2,rot:1,harvest:1}}))`});
await S("Page.reload",{ignoreCache:true});await new Promise(r=>setTimeout(r,4800));
await S("Runtime.evaluate",{expression:"window.__toDungeon&&window.__toDungeon()"});
await new Promise(r=>setTimeout(r,700));
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const B=await import("/js/battle.js");B.enterFloor(8);return 1;})()`});
await new Promise(r=>setTimeout(r,3000));

const r=await S("Runtime.evaluate",{awaitPromise:true,returnByValue:true,expression:`(async()=>{
  const B=await import("/js/battle.js"), C=await import("/js/core.js");
  const S=window.__S; const out=[]; const SQ=0.78;
  const d=(ax,ay,bx,by)=>Math.hypot(ax-bx,(ay-by)*SQ);
  /* 판을 세운다 — 그래야 「쏜 그 순간」을 그대로 볼 수 있다 */
  S.speed=0;
  const setup=()=>{ S.fx.length=0; S.mobs.length=0; S.minions.length=0;
    S.piles.length=0; S.corpses=0; S.mp=C.mpMaxOf();
    /* ★ **재사용 대기도 지운다.** 안 지웠더니 앞 스킬의 cd 가 남아 다음 스킬이
       「안 걸림」으로 나왔다 — 게임 결함이 아니라 자의 흠이었다(하마터면 오보). */
    for(const k in S.cd) delete S.cd[k];
    /* 적은 **오른쪽 멀리** 세운다 */
    for(let i=0;i<4;i++) S.mobs.push({id:900+i,kind:"zombie",x:210+i*14,y:-20+i*18,
      hp:9e9,hpMax:9e9,dmg:5,spd:20,h:50,r:50*C.FOOT_R,atk:1,born:0});
    /* 시체를 **두 곳**에 심는다: 내 발밑과 적 쪽 */
    B.addCorpse(10, 8, "small", 2, 400);          // 발밑
    B.addCorpse(215, -10, "small", 3, 400);       // 적 쪽
  };
  /* ── 시체 폭발 ── 폭심이 「적 쪽 시체」여야 한다 */
  setup();
  const okN = B.cast("nova");
  const nv = S.fx.find(f=>f.kind==="nova");
  out.push({스킬:"시체 폭발", 걸림:okN,
    이펙트자리: nv?[Math.round(nv.x),Math.round(nv.y)]:null,
    본인에게서: nv?Math.round(d(nv.x,nv.y,0,0)):null,
    적무리에서: nv?Math.round(d(nv.x,nv.y,215,-10)):null,
    판정: nv ? (d(nv.x,nv.y,0,0) > 120 && d(nv.x,nv.y,215,-10) < 60 ? "적 쪽 시체에서 터짐 OK"
                                                                    : "★ 엉뚱한 자리")
             : "★ 이펙트가 아예 없다"});
  /* ── 해골 되살리기 ── 새 놈이 「쓴 시체 자리」에서 일어나야 한다 */
  setup();
  const okR = B.cast("raise");
  const mn = S.minions[0];
  const ri = S.fx.find(f=>f.kind==="rise");
  out.push({스킬:"해골 되살리기", 걸림:okR,
    선자리: mn?[Math.round(mn.x),Math.round(mn.y)]:null,
    발밑시체에서: mn?Math.round(d(mn.x,mn.y,10,8)):null,
    먼지자리: ri?[Math.round(ri.x),Math.round(ri.y)]:null,
    판정: !mn ? "★ 안 섰다" : (d(mn.x,mn.y,10,8) < 40 ? "쓴 시체 자리에서 일어남 OK" : "★ 엉뚱한 자리")});
  /* ── 약화의 저주 ── 상태가 켜져야 한다(그림은 없다) */
  setup();
  const okA = B.cast("amp");
  out.push({스킬:"약화의 저주", 걸림:okA, 지속:+(S.amp||0).toFixed(1),
    판정: (S.amp||0) > 0 ? "걸림 OK" : "★ 안 걸림"});
  return JSON.stringify(out,null,1);
})()`});
console.log(r.result.value);
/* 눈으로도 본다 — 폭발을 다시 쏘고 그 프레임을 찍는다 */
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{
  const B=await import("/js/battle.js"); const S=window.__S;
  S.fx.length=0; S.mobs.length=0; S.minions.length=0; S.piles.length=0; S.corpses=0;
  for(let i=0;i<4;i++) S.mobs.push({id:900+i,kind:"zombie",x:210+i*14,y:-20+i*18,hp:9e9,hpMax:9e9,dmg:5,spd:20,h:50,r:31,atk:1,born:0});
  B.addCorpse(10,8,"small",2,400); B.addCorpse(215,-10,"small",3,400);
  B.cast("nova"); return 1;})()`});
await new Promise(r=>setTimeout(r,120));
const shot=await S("Page.captureScreenshot",{format:"png"});
fs.writeFileSync(process.argv[2]||"/tmp/skill_qa.png",Buffer.from(shot.data,"base64"));
console.log("errors:",errs.slice(0,3));
await raw("Target.closeTarget",{targetId});bws.close();
