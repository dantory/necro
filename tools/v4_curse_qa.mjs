/* **저주 셋이 «다른 것»을 사는지 잰다.**
     node tools/v4_curse_qa.mjs [out.png]

   V-4 로 저주가 셋이 됐다(피해 증폭 · 약화 · 쇠약). 셋이 다 「걸림 OK」로만 나오면
   그건 저주가 셋인 게 아니라 **이름이 셋**인 것이다([[knob-that-does-nothing]]).
   그래서 저주마다 **그 저주가 산 것**을 따로 잰다:
     · amp    — 소환수가 적에게 넣는 한 방 (커져야 한다)
     · weaken — 적이 네크로에게 넣는 한 방 (작아져야 한다)
     · decrep — 적의 걸음과 다음 한 대까지의 사이 (느려져야 한다)
   해금도 같이 본다 — 트리를 안 찍으면 SKILLS 에 아예 없어야 한다(찍기 전엔 못 쓴다). */
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
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:2,mobile:false});

/* ── ① 안 찍은 판 — 저주 둘이 벨트에 **없어야** 한다 ── */
await S("Page.navigate",{url:PAGE});await new Promise(r=>setTimeout(r,1200));
await S("Runtime.evaluate",{expression:`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:20,deepest:14,runs:3,up:{hp:3,mp:4,dmg:2,army:2},equip:{},bag:[],tree:{wand:2,swift:2}}))`});
await S("Page.reload",{ignoreCache:true});await new Promise(r=>setTimeout(r,4800));
const locked=(await S("Runtime.evaluate",{awaitPromise:true,returnByValue:true,expression:`(async()=>{
  const C=await import("/js/core.js");
  return { 벨트:C.SKILLS.map(s=>s.id), 약화있나:C.SKILLS.some(s=>s.id==="weaken"), 쇠약있나:C.SKILLS.some(s=>s.id==="decrep") };
})()`})).result.value;

/* ── ② 찍은 판 — 셋을 다 걸고 무엇이 달라지는지 잰다 ── */
await S("Runtime.evaluate",{expression:`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:24,deepest:14,runs:3,up:{hp:3,mp:4,dmg:2,army:2},equip:{},bag:[],tree:{wand:2,swift:2,weaken:1,deep:3,decrep:1}}))`});
await S("Page.reload",{ignoreCache:true});await new Promise(r=>setTimeout(r,4800));
await S("Runtime.evaluate",{expression:"window.__toDungeon&&window.__toDungeon()"});
await new Promise(r=>setTimeout(r,700));
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const B=await import("/js/battle.js");B.enterFloor(8);return 1;})()`});
await new Promise(r=>setTimeout(r,2500));

const r=await S("Runtime.evaluate",{awaitPromise:true,returnByValue:true,expression:`(async()=>{
  const B=await import("/js/battle.js"), C=await import("/js/core.js");
  const S=window.__S; S.speed=0;
  const out={ 해금:{ 벨트:C.SKILLS.map(s=>s.id) } };

  /* 판을 늘 같은 모양으로 세운다 — 적 넷이 네크로를 둘러싸고, 소환수 둘이 적을 때린다. */
  const setup=()=>{ S.fx.length=0; S.mobs.length=0; S.minions.length=0; S.piles.length=0;
    S.pendMech.length=0; S.hurtLog.length=0;
    S.corpses=0; S.mp=C.mpMaxOf(); S.hp=S.hpMax; S.amp=0; S.wkn=0; S.dcp=0;
    for(const k in S.cd) delete S.cd[k];
    for(let i=0;i<4;i++) S.mobs.push({id:900+i,kind:"zombie",x:40+i*6,y:-6+i*5,hp:9e9,hpMax:9e9,
      dmg:40,spd:24,h:50,r:31,atk:0,born:0,cause:"melee"});
  };
  /* 한 걸음 굴리고 **적이 예약한 한 방**과 **적이 걸은 거리**를 읽는다. pending 은
     impactAt 에서 터지므로, 예약된 dmg 자체가 「이번에 들어올 한 방」이다. */
  const roll=(curse)=>{
    setup();
    if (curse) B.cast(curse);
    const x0=S.mobs.map(m=>m.x), y0=S.mobs.map(m=>m.y);
    let dmg=0, atk=0, moved=0;
    for(let i=0;i<8;i++){
      B.step(0.05);
      for(const m of S.mobs) if(m.pending && m.pending.dmg>dmg){ dmg=m.pending.dmg; atk=m.atk; }
    }
    for(let i=0;i<S.mobs.length;i++) moved+=Math.hypot(S.mobs[i].x-x0[i],S.mobs[i].y-y0[i]);
    return { 한방:+dmg.toFixed(1), 다음까지:+(atk||0).toFixed(2), 걸음:+(moved/S.mobs.length).toFixed(1) };
  };
  const base = roll(null);
  const wk   = roll("weaken");
  const dc   = roll("decrep");
  out.약화 = { 안걸림:base.한방, 걸림:wk.한방, 비:+(wk.한방/(base.한방||1)).toFixed(3),
               판정: wk.한방>0 && wk.한방 < base.한방*0.95 ? "적이 주는 피해가 준다 OK" : "★ 안 준다" };
  out.쇠약 = { 걸음_안걸림:base.걸음, 걸음_걸림:dc.걸음, 걸음비:+(dc.걸음/(base.걸음||1)).toFixed(3),
               사이_안걸림:base.다음까지, 사이_걸림:dc.다음까지,
               판정: dc.걸음 < base.걸음*0.95 && dc.다음까지 > base.다음까지*1.05 ? "느려지고 굼떠진다 OK" : "★ 안 느려진다" };

  /* amp — 소환수가 «넣는» 한 방. 소환수를 둘 세워 적 옆에 붙여 놓고 예약된 피해를 본다. */
  const swing=(on)=>{
    setup();
    for(let i=0;i<2;i++){ B.addCorpse(30+i*8,4,"small",2,400); }
    B.cast("raise"); S.cd.raise=0; B.cast("raise");
    for(const u of S.minions){ u.x=44; u.y=0; u.swing=0; u.atk=0; }
    if(on) B.cast("amp");
    let d=0;
    for(let i=0;i<10;i++){ B.step(0.05); for(const u of S.minions) if(u.pending && u.pending.dmg>d) d=u.pending.dmg; }
    return +d.toFixed(1);
  };
  const a0=swing(false), a1=swing(true);
  out.피해증폭 = { 안걸림:a0, 걸림:a1, 비:+(a1/(a0||1)).toFixed(3),
                   판정: a0>0 && a1 > a0*1.05 ? "소환수 한 방이 커진다 OK" : "★ 안 커진다" };
  out.수치 = { 약화배수:+C.weakenMul().toFixed(3), 쇠약배수:+C.decrepMul().toFixed(3),
               증폭배수:+C.ampPower().toFixed(3), 지속:C.ampSecs() };
  return out;
})()`});
console.log(JSON.stringify({ 안찍은판: locked, 찍은판: r.result.value }, null, 1));

/* 눈으로도 본다 — 셋을 다 걸고 그 프레임을 찍는다 */
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{
  const B=await import("/js/battle.js"); const S=window.__S;
  S.speed=1; S.fx.length=0; for(const k in S.cd) delete S.cd[k]; S.mp=9999;
  B.cast("amp"); B.cast("weaken"); B.cast("decrep"); return 1;})()`});
await new Promise(r=>setTimeout(r,150));
const shot=await S("Page.captureScreenshot",{format:"png"});
fs.writeFileSync(process.argv[2]||"/tmp/v4_curse.png",Buffer.from(shot.data,"base64"));
console.log("errors:",errs.slice(0,3));
await raw("Target.closeTarget",{targetId});bws.close();
