/* 가방이 **뜻대로 도는가** — 판을 굴리지 않고 core.js 를 불러 물건을 직접 넣어 잰다.
   affix_probe 와 같은 뼈대(CDP 9333 + 8774/index.html)다. 저건 「붙는 옵션이 맞나」,
   이건 「가방이 차면 제일 나쁜 것부터 녹나」.

   재는 것 넷 — 하나라도 FAIL 이면 exit code 1:
     ① 12칸을 넘겨 200개를 넣어도 bag.length<=12 이고, 남은 것이 **점수 상위 12개**인가
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
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);                 // 판을 멈춘다 — 굴러가는 드랍이 META 를 건드리면 셈이 어긋난다
  const M = C.META;
  const reset = () => { M.bag.length = 0; M.gold = 0; M.equip = { wand:null, robe:null, charm:null }; };
  const out = [];
  const rec = (name, ok, detail) => out.push({ name, ok, detail });

  // ① 200개를 넣어도 12칸 유지 · 남은 것이 점수 상위 12
  reset();
  const scores = [];
  for (let i=0;i<200;i++){ const it = C.rollDrop(20); scores.push(C.scoreOf(it)); C.bagPut(it); }
  const kept  = M.bag.map(C.scoreOf).sort((a,b)=>a-b);
  const top12 = scores.slice().sort((a,b)=>b-a).slice(0,12).sort((a,b)=>a-b);
  const sameTop = kept.length===12 && kept.every((s,i)=>Math.abs(s-top12[i])<1e-6);
  rec("① 200개 → 12칸 유지 · 남은 것이 점수 상위 12", M.bag.length<=12 && sameTop,
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
let bad = 0;
for (const t of results) { if (!t.ok) bad++; console.log((t.ok ? "PASS" : "FAIL") + "  " + t.name + " — " + t.detail); }
if (errs.length || netfail.length) console.log("errors:", errs.slice(0,4), "netfail:", netfail.slice(0,4));
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
