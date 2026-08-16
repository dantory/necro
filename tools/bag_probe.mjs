/* 가방이 **뜻대로 도는가** — 판을 굴리지 않고 core.js 를 불러 물건을 직접 넣어 잰다.
   affix_probe 와 같은 뼈대(CDP 9333 + 8774/index.html)다. 저건 「붙는 옵션이 맞나」,
   이건 「가방이 차면 제일 나쁜 것부터 녹나」.

   재는 것 — 하나라도 FAIL 이면 exit code 1:
     ①ㄱ **진짜 길**(takeDrop)로 200개를 주워도 12칸을 안 넘고 유니크가 가방을 안 먹는가
     ①ㄴ 유니크를 뺀 200개를 bagPut 에 직접 넣으면 남는 것이 **점수 상위 12개**인가
     ② 넘칠 때 녹은 금이 meltGold 와 일치하고 META.gold 가 그만큼 늘었는가
     ③ 더 좋은 것을 주우면 착용되고 **벗은 것이 가방에 들어갔는가**
     ④ 더 나쁜 것을 주우면 가방으로 가고, 가방이 꽉 차고 그것이 제일 나쁘면 **그 자리서 금**인가

     node tools/bag_probe.mjs */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || ""));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");

/* META 를 깨끗한 바닥에서 시작하려 저장을 지우고 새로 뜬다 — 지난 판이 남긴
   장비·금이 있으면 ③④ 의 「벗은 것」·「늘어난 금」을 셈이 어긋난다. */
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);                 // 판을 멈춘다 — 굴러가는 드랍이 META 를 건드리면 셈이 어긋난다
  const M = C.META;
  const reset = () => { M.bag.length = 0; M.gold = 0; M.equip = { wand:null, robe:null, charm:null }; };
  const out = [];
  const rec = (name, ok, detail) => out.push({ name, ok, detail });

  /* ①ㄱ **사람이 지나는 길로 잰다**(2026-08-15). 예전엔 rollDrop 을 bagPut 에 **직접**
     넣었는데, 그건 유니크가 생긴 뒤로는 없는 길이다 — bagPut 은 유니크를 안 녹이고
     중복을 그 자리서 금으로 바꾸는 자리는 takeDrop 이라, 직접 넣으면 유니크 열여섯 개가
     쌓여 bag=16 으로 FAIL 했다(판은 멀쩡한데 자가 틀린 것이다). 그래서 ①ㄱ 은 진짜 길
     (takeDrop)로 200개를 줍고, ①ㄴ 이 「상위 12」 셈을 유니크 없이 따로 본다. */
  reset();
  let 터짐1 = null;
  try { for (let i=0;i<200;i++) C.takeDrop(C.rollDrop(20)); }
  catch (e) { 터짐1 = String(e && e.message || e); }
  const 낀유니크  = ["wand","robe","charm"].map(k=>M.equip[k]).filter(x=>x&&x.uid).map(x=>x.uid);
  const 가방유니크 = M.bag.filter(x=>x&&x.uid).map(x=>x.uid);
  const uids = 낀유니크.concat(가방유니크);
  const 중복없음 = new Set(uids).size === uids.length;          // 같은 유니크는 두 번 안 쌓인다(둘째는 그 자리서 금)
  const 평범칸 = M.bag.length - 가방유니크.length;
  const ok1 = 터짐1===null && M.bag.length<=C.BAG_MAX && 중복없음
              && 평범칸 >= C.BAG_MAX - C.UNIQUE.length;         // 유니크가 가방을 통째로 먹지 않는다(합성 고리가 산다)
  rec("①ㄱ 진짜 길(takeDrop) 200개 → 12칸 유지 · 유니크가 가방을 안 먹는다", ok1,
      "bag="+M.bag.length+" 유니크(낀/가방)="+낀유니크.length+"/"+가방유니크.length
      +" 평범칸="+평범칸+" 중복없음="+중복없음+" 터짐="+터짐1);

  // ①ㄴ 셈 — 유니크를 뺀 200개를 직접 넣으면 남는 것이 점수 상위 12
  reset();
  const scores = [];
  for (let n=0;n<200;){ const it = C.rollDrop(20); if (it.uid) continue;   // 유니크는 이 셈의 밖(녹지 않는다)
    scores.push(C.scoreOf(it)); C.bagPut(it); n++; }
  const kept  = M.bag.map(C.scoreOf).sort((a,b)=>a-b);
  const top12 = scores.slice().sort((a,b)=>b-a).slice(0,12).sort((a,b)=>a-b);
  const sameTop = kept.length===12 && kept.every((s,i)=>Math.abs(s-top12[i])<1e-6);
  rec("①ㄴ 유니크 뺀 200개 → 12칸 유지 · 남은 것이 점수 상위 12", M.bag.length<=12 && sameTop,
      "bag="+M.bag.length+" 상위12일치="+sameTop);

  // ② 넘칠 때 녹은 금 = meltGold · META.gold 그만큼 증가
  reset();
  for (let i=0;i<12;i++) M.bag.push(C.mkItem("wand",4));   // 높은 점수 12개로 채운다
  const worst  = C.mkItem("wand",1,true);                  // 제일 나쁜 것 — 넣는 순간 녹아야 한다
  const expect = C.meltGold(worst), g0 = M.gold;
  const melted = C.bagPut(worst);
  const ok2 = melted.length===1 && melted[0].gold===expect && (M.gold-g0)===expect
              && !M.bag.includes(worst) && M.bag.length===12;
  rec("② 넘침 → 녹은 금 = meltGold · gold 증가", ok2,
      "expect="+expect+" got="+(melted[0]&&melted[0].gold)+" Δgold="+(M.gold-g0));

  // ③ 더 좋은 것 → 착용 · 벗은 것이 가방으로
  reset();
  M.equip.wand = C.mkItem("wand",2,true);
  const oldTier = M.equip.wand.tier;
  const r3 = C.takeDrop({ k:"wand", tier:4, af:[{id:"dmg",v:30},{id:"mdmg",v:40}] });
  const ok3 = r3.worn===true && r3.bagged===false && M.bag.length===1 && M.bag[0].tier===oldTier;
  rec("③ 더 좋은 것 → 착용 · 벗은 것 가방행", ok3,
      "worn="+r3.worn+" bag="+M.bag.length+" 벗은등급="+(M.bag[0]&&M.bag[0].tier));

  // ④ 더 나쁜 것 · 가방 꽉 참 · 제일 나쁨 → 그 자리서 금
  reset();
  M.equip.wand = C.mkItem("wand",4);                       // 낀 것은 세다 → 갈아 끼우지 않는다
  for (let i=0;i<12;i++) M.bag.push(C.mkItem("robe",4));   // 가방을 높은 점수로 채운다
  const worse = { k:"wand", tier:1, af:[] };
  const expect4 = C.meltGold(worse), g4 = M.gold;
  const r4 = C.takeDrop(worse);
  const ok4 = r4.worn===false && r4.bagged===false && r4.gold===expect4
              && (M.gold-g4)===expect4 && M.bag.length===12;
  rec("④ 더 나쁨 · 가방 꽉 참 → 그 자리서 금", ok4,
      "worn="+r4.worn+" bagged="+r4.bagged+" gold="+r4.gold+" expect="+expect4);

  return JSON.stringify(out);
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
const results = JSON.parse(r.result.value);

/* ⑤ **저장이 모르는 슬롯을 들고 와도 판이 안 터진다.** 2026-08-13 winscroll_qa 가 GEAR 에
   없는 `amul` 넷을 저장에 심었고, 그것을 물려받은 leave_qa 가 **가방이 넘치는 순간**
   `meltGold` 의 `GEAR[it.k].cost` 에서 터졌다 — 하필 그 자리가 「물러남」이라 판을 접을
   때마다 맞았다. 슬롯 이름은 언제든 바뀌므로(옛 이름·오타·지워진 슬롯) 저장을 믿지 않는다.
   ★ 씨앗을 심고 **새로 띄워서** 잰다 — 거르는 자리가 모듈이 뜰 때라 reload 없이는 못 잰다.
     그리고 「걸러졌나」만 보지 않고 **넘치게 넣어 터지는지까지** 본다(터지던 그 자리가 거기다). */
await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", JSON.stringify({
  gold: 0, bag: [ {k:"amul",tier:1,af:[]}, {k:"wand",tier:1,af:[]}, {k:"robe",tier:99,af:[]} ],
  equip: { wand: {k:"amul",tier:2,af:[]}, robe: null, charm: null } }))` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));
const errs0 = errs.length;
const r5 = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async()=>{
  const C = await import("/js/core.js"); const M = C.META;
  window.S && (window.S.speed = 0);
  const 남은것 = M.bag.map(x=>x.k+":"+x.tier);
  const 낀것   = C.equipped("wand");
  let 터짐 = null;
  try { for (let i=0;i<20;i++) C.bagPut(C.mkItem("wand",1,true)); }   // 넘치게 넣어 녹이는 길을 지난다
  catch (e) { 터짐 = String(e && e.message || e); }
  return JSON.stringify({ 남은것, 낀것: 낀것 ? 낀것.k : null, 터짐, 칸: M.bag.length });
})()` });
const g5 = JSON.parse(r5.result.value);
const ok5 = g5.남은것.length === 1 && g5.남은것[0] === "wand:1" && g5.낀것 === null
            && g5.터짐 === null && g5.칸 <= 12 && errs.length === errs0;
results.push({ name: "⑤ 모르는 슬롯이 든 저장 → 걸러지고 넘쳐도 안 터진다", ok: ok5,
  detail: "남은가방=" + JSON.stringify(g5.남은것) + " 낀것=" + g5.낀것 + " 터짐=" + g5.터짐 + " 칸=" + g5.칸 });

let bad = 0;
for (const t of results) { if (!t.ok) bad++; console.log((t.ok ? "PASS" : "FAIL") + "  " + t.name + " — " + t.detail); }
if (errs.length || netfail.length) console.log("errors:", errs.slice(0,4), "netfail:", netfail.slice(0,4));
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
