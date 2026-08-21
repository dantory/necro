/* 「깊이가 물건을 주는가」 — 자 하나. (ROADMAP G-a)
   G-1 이 「1~80층 기대 드랍 44개 중 34개가 이미 만렙 등급」이라고 셌다. 그 말이 맞다면
   **15층에서 파밍이 죽는다.** 그것을 눈금으로 만든다 — 고치기 전에 재고, 고친 뒤 같은
   자로 다시 잰다(짐작으로 「원인」을 적지 않기 위해서다).

   재는 법: 층 f 마다 rollDrop(f) 로 한 판 분량(RUN_DROPS 개)을 뽑아 **그중 최고 점수**를
   기록하고, 그것을 TRIALS 번 되풀이해 평균 낸다. 방치형에서 실제로 값어치가 있는 건
   「평균 물건」이 아니라 **그 판에서 건진 제일 좋은 것**이라서다.

   판정: 80층의 최고 점수가 15층보다 GROW_MIN 배 이상이어야 「깊이가 끝까지 준다」.
         (dropTierCap 이 15층에서 꼭대기라 지금은 1.0 언저리로 나온다 = FAIL)

     node tools/depth_probe.mjs            # 표 + 판정
     node tools/depth_probe.mjs --json     # 기계용
   * bag_probe·dig_probe 와 같은 뼈대(CDP 9333 + 8774/index.html) — 사람이 지나는 그 길로 잰다. */
const JSON_OUT = process.argv.includes("--json");
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "")); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);
  const M = C.META;
  /* 재련(plus)은 물건이 아니라 금이 주는 것이라 자에서 뺀다 — 안 그러면 깊이의 몫이 섞인다. */
  for (const k of C.GEAR_KEYS) M.plus[k] = 0;
  const FLOORS = [5,10,15,20,25,30,40,50,60,70,80];
  const RUN_DROPS = 44;   // G-1 이 센 한 판(20분·80층) 기대 드랍 개수
  const TRIALS = 400;
  const rows = [];
  for (const f of FLOORS) {
    let bestSum = 0, meanSum = 0, tierSum = 0, afSum = 0, n = 0, tmax = 0;
    for (let t = 0; t < TRIALS; t++) {
      C.S.uniqCtr = 0;
      let best = -1;
      for (let i = 0; i < RUN_DROPS; i++) {
        const it = C.rollDrop(f);
        const sc = C.scoreOf(it);
        if (sc > best) best = sc;
        meanSum += sc; tierSum += it.tier; afSum += it.af.length; n++;
        if (it.tier > tmax) tmax = it.tier;
      }
      bestSum += best;
    }
    rows.push({ f, best: bestSum / TRIALS, mean: meanSum / n, tier: tierSum / n, af: afSum / n, tmax });
  }
  return JSON.stringify(rows);
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
if (r.exceptionDetails) { console.error(JSON.stringify(r.exceptionDetails)); process.exit(2); }
const rows = JSON.parse(r.result.value);
await S("Target.closeTarget", { targetId });

const at = (f) => rows.find(x => x.f === f);
const GROW_MIN = 1.5;                       // 15층 → 80층 최고 점수가 최소 이만큼은 올라야
const grow = at(80).best / at(15).best;
const ok = grow >= GROW_MIN && errs.length === 0;
if (JSON_OUT) { console.log(JSON.stringify({ rows, grow, ok, errs })); process.exit(ok ? 0 : 1); }
console.log("층   한판최고   평균점수  평균등급  평균옵션  최고등급");
for (const x of rows)
  console.log(String(x.f).padStart(3) + "  " + x.best.toFixed(0).padStart(8) + "  "
    + x.mean.toFixed(0).padStart(8) + "  " + x.tier.toFixed(2).padStart(8) + "  "
    + x.af.toFixed(2).padStart(8) + "  " + String(x.tmax).padStart(8));
for (const e of errs) console.log("  " + e);
console.log("\n15층 → 80층 한판최고 " + grow.toFixed(2) + "배 (최소 " + GROW_MIN + "배)");
console.log(ok ? "PASS · 깊이가 끝까지 물건을 준다" : "FAIL · 깊이가 물건을 그만 준다");
process.exit(ok ? 0 : 1);
