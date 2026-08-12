/* 「무덤 파기」가 **뜻대로 도는가** — 판을 굴리지 않고 core.js 를 불러 직접 판다.
   bag_probe 와 같은 뼈대(CDP 9333 + 8774/index.html)다. 저건 「가방이 차면 녹나」,
   이건 「금을 내면 깊이에 맞는 전리품이 나오고, 값이 깊이를 따르나」.

   재는 것 일곱 — 하나라도 FAIL 이면 exit code 1:
     ① 금이 정확히 digCost() 만큼 준다(빈손에서 파면 갈아 끼워지고 녹은 금이 없다)
     ② 금이 모자라면 null · 금도 deepest 도 안 변한다
     ③ 200 번 파도 뽑힌 등급이 dropTierCap(deepest) 를 한 번도 안 넘는다
     ④ 200 번 뒤에도 가방이 BAG_MAX 를 안 넘는다(넘친 만큼 녹았다)
     ⑤ 200 번 안에서 합성이 실제로 일어난다(중복이 금이 아니라 재료로 탔다)
     ⑥ 깊이 1·10·20·30 에서 값이 round(60·1.12^(d-1)) 을 따른다
     ⑦ 금 잠김 — 분당 3,100 벌이를 한 번 값으로 나눠 「분당 몇 번 파야 받아내나」를 적는다

     node tools/dig_probe.mjs */
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

await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);
  const M = C.META;
  const reset = (deepest) => { M.bag.length = 0; M.gold = 0; M.equip = { wand:null, robe:null, charm:null }; M.deepest = deepest; };
  const out = [];
  const rec = (name, ok, detail) => out.push({ name, ok, detail });

  // ① 빈손에서 파면 갈아 끼워지고(녹은 금 없음) 금이 정확히 digCost() 만큼 준다
  reset(10);
  M.gold = 100000;
  const cost1 = C.digCost(), g0 = M.gold;
  const r1 = C.digDraw();
  const ok1 = !!r1 && r1.worn===true && r1.gold===0 && (g0 - M.gold)===cost1;
  rec("① 금이 정확히 digCost() 만큼 준다", ok1,
      "cost="+cost1+" Δgold="+(g0-M.gold)+" worn="+(r1&&r1.worn)+" 녹은금="+(r1&&r1.gold));

  // ② 모자라면 null · 금도 deepest 도 안 변한다
  reset(10);
  M.gold = C.digCost() - 1;
  const g2 = M.gold, d2 = M.deepest, bag2 = M.bag.length;
  const r2 = C.digDraw();
  const ok2 = r2===null && M.gold===g2 && M.deepest===d2 && M.bag.length===bag2;
  rec("② 모자라면 null · 금·deepest·가방 그대로", ok2,
      "ret="+r2+" gold="+M.gold+"(was "+g2+") bag="+M.bag.length);

  // ③④⑤ 200 번 — 등급 상한 · 가방 상한 · 합성
  reset(20);
  M.gold = 1e12;
  const cap = C.dropTierCap(20);
  let maxTier = 0, bagOverflow = false, meltCount = 0, fuseCount = 0;
  for (let i=0;i<200;i++){
    const r = C.digDraw();
    if (!r) { bagOverflow = true; break; }         // 금은 넉넉하니 null 이면 안 된다
    maxTier = Math.max(maxTier, r.ref.tier);        // 뽑힌 것의 등급 — rollDrop 산물
    if (M.bag.length > C.BAG_MAX) bagOverflow = true;
    meltCount += r.melted.length;
    fuseCount += r.fused.length;
  }
  rec("③ 200 번 뽑힌 등급 ≤ dropTierCap("+20+")="+cap, maxTier<=cap && !bagOverflow,
      "maxTier="+maxTier+" cap="+cap);
  rec("④ 200 번 뒤 가방 ≤ BAG_MAX(넘친 만큼 녹음)", M.bag.length<=C.BAG_MAX && meltCount>0,
      "bag="+M.bag.length+"/"+C.BAG_MAX+" 녹은수="+meltCount);
  rec("⑤ 합성이 실제로 일어난다", fuseCount>0, "합성수="+fuseCount);

  // ⑥ 깊이별 값 = round(60·1.12^(d-1))
  let ok6 = true, d6 = [];
  for (const d of [1,10,20,30]) {
    M.deepest = d;
    const got = C.digCost(), want = Math.round(60 * Math.pow(1.12, d-1));
    d6.push(d+"층="+got+"(기대 "+want+")");
    if (got !== want) ok6 = false;
  }
  rec("⑥ 값이 1.12^(d-1) 을 따른다", ok6, d6.join(" · "));

  // ⑦ 금 잠김 — 분당 3,100 벌이를 한 번 값으로 나눈다(적어 두면 다음 판단의 근거)
  const INCOME = 3100;
  let ok7 = true, d7 = [];
  for (const d of [20,25,30]) {
    M.deepest = d;
    const cost = C.digCost(), perMin = INCOME / cost;
    d7.push(d+"층: 한 번 "+cost+"금 · 분당 "+perMin.toFixed(1)+"번이면 벌이를 받아냄");
    if (perMin < 1) ok7 = false;                    // 한 번 값이 1분 벌이를 넘으면 못 받아낸다
  }
  rec("⑦ 분당 벌이(3100)를 파기가 받아낸다", ok7, d7.join(" · "));

  return JSON.stringify(out);
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
const results = JSON.parse(r.result.value);
let bad = 0;
for (const t of results) { if (!t.ok) bad++; console.log((t.ok ? "PASS" : "FAIL") + "  " + t.name + " — " + t.detail); }
if (errs.length || netfail.length) console.log("errors:", errs.slice(0,4), "netfail:", netfail.slice(0,4));
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
