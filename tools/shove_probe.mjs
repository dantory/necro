/* 떼어놓기에서 **미는 함수(shove)** 가 태우는 시간을 잰다.
     node tools/shove_probe.mjs [층] [몸수]

   왜 — `cpu_profile` 에 **줄별 몫**을 붙이고 나서야 보였다. `step` 자기시간의 69.5% 가
   딱 두 줄이었다: `shove(a,…)` · `shove(b,…)` (battle.js 1502·1503). 겹친 쌍마다
   **두 번** 부르고, 그때마다 `Math.hypot` 을 부른다 — 그런데 밀린 총량이 상한을
   안 넘으면 그 길이는 **쓰지도 않는다.**

   그래서 제곱끼리 먼저 대 보는 문을 앞에 둔다. 문은 **0.9999 배로 넉넉히** 열어
   아슬아슬한 것은 원래 판정(`L > cap`)으로 넘긴다 — `L > cap` 인 것은
   `Lsq > cap²·0.9999` 가 반드시 참이라 **놓치는 것이 없다.**

   물을 것 둘: ① 정말 싼가 ② **같은 결과가 나오나**(밀린 자리가 비트까지 같아야 한다). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const FLOOR = +(process.argv[2] || 30), BODIES = +(process.argv[3] || 0);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;

await ev(`localStorage.setItem("necro.meta.v1",JSON.stringify({gold:90000,lv:40,deepest:${FLOOR + 4},runs:6,up:{hp:6,mp:6,dmg:5,army:8},equip:{},bag:[],tree:{bone:3,armor:3,ghoul:3,legion:3,golem:3,rot:2,harvest:2}}))`);
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await ev(`window.toDungeon && window.toDungeon()`); await wait(700);
await ev(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
await wait(2500);
/* ★ 자리를 손으로 주지 않는다 — `S.nx`/`S.ny` 는 **없는 칸**이라 더하면 NaN 이 된다
   (그 NaN 판이 「step 8.7%」라는 가짜 병목을 만들었다). 인자 없이 부르면 제 고리에 선다. */
if (BODIES) await ev(`(async()=>{const B=await import("/js/battle.js"); const 종=["skel","ghoul","golem"];
  for (let i=(S.minions||[]).length; i<${BODIES}; i++) B.summon(종[i%3]);
  return (S.minions||[]).length;})()`, true);
await wait(4000);   /* 판이 제 진으로 자리를 잡을 때까지 — 사람이 보는 판에서 잰다 */

/* 살아 있는 판을 그대로 떠서, **떼어놓기 세 패스를 통째로** 두 길로 돌린다.
   (shove 만 따로 재면 부르는 횟수가 실제와 달라져 이득이 부풀거나 줄어든다.) */
const out = await ev(`(async () => {
  const B = await import("/js/battle.js");
  const src = S.minions.concat(S.mobs).map(e => ({ x: e.x, y: e.y, r: e.r }));
  const sq = 0.7, dt = 1/60, SEP_CAP = 130;  /* 대역 — battle.js 와 같은 값, 두 길에 똑같이 들어간다 */
  const cap = SEP_CAP * dt, capsq = cap * cap;
  const N = src.length, tk = B.touchK();

  const 돌리기 = (미는이) => {
    const p = src.map(e => ({ x: e.x, y: e.y, r: e.r, spx: 0, spy: 0 }));
    let 부른수 = 0;
    for (let pass = 0; pass < 3; pass++) {
      for (const b of p) { b.spx = 0; b.spy = 0; }
      for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
        const a = p[i], b = p[j];
        let dx = b.x - a.x, dy = (b.y - a.y) * sq;
        const min = (a.r + b.r) * tk;
        const dsq = dx * dx + dy * dy;
        if (dsq >= min * min * 1.0001) continue;
        let d = Math.hypot(dx, dy);
        if (d >= min) continue;
        if (d < 0.01) { const ang = (i * 2.399 + j * 0.618); dx = Math.cos(ang); dy = Math.sin(ang); d = 1; }
        const push = (min - d) * 0.5, nx = dx / d, ny = dy / d;
        미는이(a, -nx * push, -ny * push); 미는이(b, nx * push, ny * push); 부른수 += 2;
      }
    }
    return { p, 부른수 };
  };
  /* 옛 길 — 부를 때마다 hypot */
  const 옛미는이 = (e, sx, sy) => {
    let cx = e.spx + sx, cy = e.spy + sy;
    const L = Math.hypot(cx, cy);
    if (L > cap) { const k = cap / L; cx *= k; cy *= k; }
    e.x += cx - e.spx; e.y += (cy - e.spy) / sq; e.spx = cx; e.spy = cy;
  };
  /* 새 길 — 제곱 문을 먼저. 넘칠 때만 hypot */
  const 새미는이 = (e, sx, sy) => {
    let cx = e.spx + sx, cy = e.spy + sy;
    if (cx * cx + cy * cy > capsq * 0.9999) {
      const L = Math.hypot(cx, cy);
      if (L > cap) { const k = cap / L; cx *= k; cy *= k; }
    }
    e.x += cx - e.spx; e.y += (cy - e.spy) / sq; e.spx = cx; e.spy = cy;
  };
  const A = 돌리기(옛미는이), Bx = 돌리기(새미는이);
  /* **비트까지 같아야 한다** — 씨앗 재현이 이것에 걸려 있다 */
  let 최대차 = 0, 다른수 = 0, 성한값 = 0;
  for (let i = 0; i < N; i++) {
    const dx = Math.abs(A.p[i].x - Bx.p[i].x), dy = Math.abs(A.p[i].y - Bx.p[i].y);
    /* ★ NaN 은 비교가 전부 거짓이라 **말없이 「같다」로 읽힌다.** 성한 값만 세어
       분모로 쓴다 — 한 자리라도 NaN 이면 이 자는 아무것도 못 잰 것이다. */
    if (!isFinite(dx) || !isFinite(dy)) continue;
    성한값++;
    if (dx || dy) 다른수++;
    최대차 = Math.max(최대차, dx, dy);
  }
  const bench = (fn) => { fn(); fn();
    const t0 = performance.now(); for (let n = 0; n < 200; n++) fn();
    return +(performance.now() - t0).toFixed(1); };
  return { 몸: N, 쌍: N * (N - 1) / 2 * 3, 민횟수: A.부른수,
           성한몸: 성한값, 다른몸: 다른수, 최대차,
           옛ms: bench(() => 돌리기(옛미는이)), 새ms: bench(() => 돌리기(새미는이)) };
})()`, true);
out.배수 = +(out.옛ms / Math.max(0.01, out.새ms)).toFixed(2);
out.같은결과 = out.최대차 === 0 && out.성한몸 === out.몸;
out.콘솔오류 = errs;
console.log(JSON.stringify(out, null, 1));
const bad = errs.length || !out.같은결과 || out.배수 < 1.05;
console.log(bad ? "FAIL" : "PASS");
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
