/* **군대가 밀고 나가는가** — 병수님이 두 번 말한 「소환수가 제자리에서 크게 이동 안 한다」.
     node tools/march_qa.mjs [초=40] [씨앗=3] [망가뜨림=none|nopush|slow|both]
   ★ 「걷는다/안 걷는다」도 「얼마나 빠른가」도 아니다 — **얼마나 멀리 나가 있나**를 잰다.
     빠르기만 올려도 갈 데가 없으면 제자리에서 종종거린다(그게 지난번 실패였다).
     그래서 셋을 본다: 진이 기운 거리 · 소환수가 본인에게서 떨어진 거리 · 1초에 실제로
     옮긴 거리(왕복은 상쇄되므로 **경로 길이**로 센다). */
const CDP="http://127.0.0.1:9333",PAGE="http://127.0.0.1:8774/index.html";
const SEC=+(process.argv[2]||40), SEED=+(process.argv[3]||3);
/* ★ **되돌리는 손잡이**(2026-08-17) — 바닥선이 진짜 잡는지 보려면 «일부러 망가뜨린 팔»이
   있어야 한다([[pixel-verification-calibration]] 「양성 표본으로 먼저 맞춰 본다」).
   게임 코드에는 한 줄도 안 넣었다 — 자가 step() **뒤에** 상태를 되돌려 옛 몸놀림을 흉내낸다.
   · nopush = 진이 안 기운다(S.push 를 매 틱 0 으로). push 가 없던 시절 그대로다.
   · slow   = 걸음을 4분의 1로(이 틱에 옮긴 거리를 25% 만 남긴다). 목표는 그대로 고르되
              «갈 데까지 못 간다» — 병수님이 두 번 말한 「제자리에서 종종거린다」 그것. */
const BRK=(process.argv[4]||"none"), SLOWK=+(process.argv[5]||0.25);
if(!["none","nopush","slow","both"].includes(BRK)){console.error(`모르는 망가뜨림: ${BRK}`);process.exit(2);}
for (const t of (await (await fetch(CDP+"/json/list")).json()).filter(t=>t.type==="page"&&t.url.startsWith("http://127.0.0.1:8774")))
  await fetch(`${CDP}/json/close/${t.id}`).catch(()=>{});
const ver=await (await fetch(CDP+"/json/version")).json();const bws=new WebSocket(ver.webSocketDebuggerUrl);
let id=0;const pend=new Map();const errs=[];function raw(m,p={},s){const i=++id;bws.send(JSON.stringify({id:i,method:m,params:p,sessionId:s}));return new Promise((res,rej)=>pend.set(i,{res,rej}));}
bws.addEventListener("message",e=>{const m=JSON.parse(e.data);if(m.id&&pend.has(m.id)){const p=pend.get(m.id);pend.delete(m.id);m.error?p.rej(new Error(JSON.stringify(m.error))):p.res(m.result);}
 if(m.method==="Runtime.exceptionThrown")errs.push((m.params.exceptionDetails?.exception?.description||"").slice(0,140));});
await new Promise(r=>bws.addEventListener("open",r));
const {targetId}=await raw("Target.createTarget",{url:PAGE});const {sessionId}=await raw("Target.attachToTarget",{targetId,flatten:true});
const S=(m,p)=>raw(m,p,sessionId);const wait=ms=>new Promise(r=>setTimeout(r,ms));
await S("Page.enable");await S("Runtime.enable");await S("Network.enable");await S("Network.setCacheDisabled",{cacheDisabled:true});
const seed=`Math.random=(()=>{let s=(${SEED}>>>0)||1;return()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296;};})();`;
await S("Page.addScriptToEvaluateOnNewDocument",{source:seed});
await S("Emulation.setDeviceMetricsOverride",{width:1512,height:863,deviceScaleFactor:1,mobile:false});
await S("Page.navigate",{url:PAGE});await wait(1500);
await S("Runtime.evaluate",{expression:`localStorage.removeItem("necro.meta.v1")`});
await S("Page.reload",{ignoreCache:true});await wait(4500);
await S("Runtime.evaluate",{expression:"window.__toDungeon()"});await wait(900);
await S("Runtime.evaluate",{expression:"window.requestAnimationFrame=()=>0"});await wait(200);
await S("Runtime.evaluate",{awaitPromise:true,expression:`(async()=>{const B=await import("/js/battle.js");${seed}B.newRun();return "ok";})()`});
const r=JSON.parse((await S("Runtime.evaluate",{awaitPromise:true,returnByValue:true,expression:`(async()=>{
  const B=await import("/js/battle.js"); const S=window.__S; const n=Math.round(${SEC}/0.05);
  const BRK=${JSON.stringify(BRK)}, SLOWK=${SLOWK};
  let autoT=0, last=new Map(), path=0, marched=0, ticks=0, pushSum=0, pushMax=0, awaySum=0, away=0, still=0;
  for(let i=0;i<n;i++){
    B.step(0.05);
    /* ★ 망가뜨리는 자리는 **재는 자리보다 앞**이라야 한다 — 뒤에 두면 자가 되돌리기 전의
       몸놀림을 재고 「망가뜨렸는데 통과」가 나온다. slow 는 last(직전 자리)를 쓰므로
       아래 재는 고리가 last 를 갱신하기 전에 끝내야 한다. */
    if(BRK==="nopush"||BRK==="both"){ if(S.push){ S.push.x=0; S.push.y=0; } }
    if(BRK==="slow"||BRK==="both"){ for(const u of S.minions){ const L=last.get(u.id);
      if(L){ u.x=L.x+(u.x-L.x)*SLOWK; u.y=L.y+(u.y-L.y)*SLOWK; } } }
    if((autoT+=0.05)>0.35){autoT=0;try{window.auto()}catch{}}
    if(S.dead) B.newRun();
    /* 옛 코드엔 push 가 없다 — A/B 를 해야 하므로 견딘다. (줄 주석을 이 줄 끝에 달았다가
       뒤따르는 셈 세 개를 통째로 먹어 「기운 거리 0」이 나왔다. 주석은 위에.) */
    const PU=S.push||{x:0,y:0}; const p=Math.hypot(PU.x, PU.y); pushSum+=p; pushMax=Math.max(pushMax,p); ticks++;
    for(const u of S.minions){ const L=last.get(u.id);
      if(L){ const d=Math.hypot(u.x-L.x,u.y-L.y); path+=d; if(d<0.05*4) still++; marched++; }
      last.set(u.id,{x:u.x,y:u.y}); awaySum+=Math.hypot(u.x,u.y); away++; }
  }
  return JSON.stringify({ 진이기운평균:+(pushSum/ticks).toFixed(1), 진이기운최대:+pushMax.toFixed(1),
    본인에게서평균:+(awaySum/Math.max(1,away)).toFixed(1),
    초당경로:+(path/Math.max(1,marched)/0.05).toFixed(1),
    멈춰있던비율:+(still/Math.max(1,marched)*100).toFixed(0), 층:S.floor });})()`})).result.value);
console.log(JSON.stringify(r), BRK==="none"?"":`[망가뜨림 ${BRK}]`, errs.length?("예외 "+errs[0]):"");
/* ★ **판정을 붙인다**(2026-08-16). 여태 이 자는 수만 뱉고 말이 없었다 — 그래서
   qa_all 이 「아무 말도 안 했다(1줄)」로 **늘 ★죽음**으로 셌다. 죽은 자가 상시로 하나
   있으면 죽음을 무시하게 되고, 그러면 진짜 고장 난 자도 같이 묻힌다.
   ★★ 다만 이 바닥선은 **회귀를 막는 선이지 목표가 아니다.**
   ★★★ **일부러 망가뜨려 맞췄다**(2026-08-17 · 위 SLOWK 손잡이 · 씨앗 1·3·9 · 40초):
     | 걸음 | 본인에게서 | 초당경로 | 옛 판정 |
     |---|---|---|---|
     | 성함 | 82.4·82.1·76.9 | 24.1·26.7·27.2 | 통과 |
     | ×0.25 | 42.7·54.5·49.8 | 9.9 | **통과** ← 걸음을 4분의 1로 줄여도 못 잡았다 |
     | ×0.20 | 44.5·50.8 | 7.1·6.8 | 미달(경로만) |
     | ×0.05 | 39.6 | 2.4 | 미달 |
     | ×0.005(얼어붙음) | **36.9** | 0.2 | 미달 |
     ① `초당경로≥8` 은 **성한 자다** — 성할 때 24~27 이고 걸음을 5분의 1로 줄이면 문다.
     ② `본인에게서≥40` 은 **거의 죽은 자였다.** 걸음을 통째로 얼려도 36.9 까지밖에 안 내려간다 —
        이 수는 「얼마나 멀리 행군했나」가 아니라 **소환수가 어디서 태어나나**(시체 자리)가
        정하기 때문이다. 바닥이 36 인데 문턱이 40 이면 남은 폭이 4 뿐이라, 잡아도 우연이다.
        → **55 로 올린다.** 성할 때 76.9~82.4(폭 22 이상) · ×0.20 이면 44~51 로 물어서
          초당경로와 **함께** 운다. 「실측의 절반」은 이 수에서는 뜻이 없는 셈이었다.
          새 선으로 다시 재니 씨앗 셋이 성할 땐 다 통과 · ×0.25 는 셋 다 미달
          (42.7·54.5·49.8) 이다. 다만 **×0.25 는 아슬아슬하다**(s3 이 54.5/55) —
          이 선이 **미덥게** 무는 것은 ×0.20 이하다. 그보다 무른 회귀는 초당경로가 먼저 문다.
     ★ 교훈: 바닥선을 「실측의 절반」으로 잡기 전에 **그 수의 바닥이 얼마인지**부터 본다.
       바닥이 높은 수는 반으로 잘라도 문턱 아래로 안 내려간다([[pixel-verification-calibration]]).
     ⚠️ `nopush`(진이 안 기울게)는 셋 다 그대로 통과했다 — 40초·2층 규모에서는 진의 기울기가
       이 셋에 안 잡힌다. 그건 이 자의 결함이 아니라 **재는 범위**다(더 깊은 층이 필요하다). */
const fails = [];
if (r.본인에게서평균 < 55) fails.push(`군대가 본인 곁을 못 벗어난다(${r.본인에게서평균} < 55)`);
if (r.초당경로 < 8)      fails.push(`1초에 옮기는 거리가 ${r.초당경로} — 제자리에서 종종거린다`);
if (errs.length)         fails.push(`콘솔 예외 ${errs.length}`);
console.log(fails.length ? `판정: 미달 — ${fails.join(" · ")}` : "판정: 통과 (바닥선 본인에게서≥55 · 초당경로≥8)");
await raw("Target.closeTarget",{targetId});bws.close();process.exit(fails.length?1:0);
