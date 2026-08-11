/* **군세가 꽉 찼을 때 겹치는가** — 겹침은 소환수가 두엇일 땐 절대 안 보인다.
   진(RING_HOLD)을 넓힌 것이 실제로 자리를 만들었는지는 **자리가 모자란 상태**,
   곧 군세 상한까지 채운 판에서만 드러난다.

     node tools/pack_probe.mjs [초]

   ★★ 재는 자리가 둘인데 **뜻이 다르다.**
   ① **진(home)** — 적이 없을 때 전원이 서는 자리. 병수님이 본 겹침이 여기다
      (진이 좁으면 슬롯 사이가 그림보다 좁아 위에 선 놈이 아래 놈 머리를 덮는다).
      이건 기하라 판이 달라도 값이 안 흔들린다 → **판정은 이쪽으로 한다.**
   ② **싸우는 중** — 표적을 쫓느라 흩어지므로 진 넓이와 상관이 옅다. 참고만.

   ★ 화면으로 되돌리는 자: 위치는 `x*sc`, `y*sc*squash` 다. **us 는 안 곱한다** —
     us 는 그림 키에만 붙는다(`hh = u.h*us`). 처음에 위치에도 곱했다가 간격을
     1.35배로 부풀려 읽어, 좁은 진에서도 「안 겹친다」가 나왔다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 90);

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown")
    errs.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text || "?");
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 2500));
await S("Runtime.evaluate", { awaitPromise: true, expression:
  `new Promise(r => { const w = () => (window.LOAD && window.LOAD.done) ? r(1) : setTimeout(w, 200); w(); })` });

const r = await S("Runtime.evaluate", { returnByValue: true, expression: `(()=>{
  window.__toDungeon();          // newRun 까지 안에서 한다
  const G = window.__geo, mm = {};
  const met = (u) => (mm[u.id] || (mm[u.id] = window.footMetrics(u.art || ("minion/" + u.kind)) || null));
  const hOf = (u) => (u.h || 40) * G.us;
  /* 화면 픽셀 간격 — us 는 위치에 안 붙는다 */
  const gapPx = (ax, ay, bx, by) => ({ dx: Math.abs(ax - bx) * G.sc,
                                       dy: Math.abs(ay - by) * G.sc * G.squash });

  let peak = 0, liveBody = 1e9, liveTall = 1e9, pairs = 0;
  let homeBody = 1e9, homeTall = 1e9, homePairs = 0, homeAtN = 0;

  for (let i = 0; i < ${SEC} * 60; i++) {
    window.step(1 / 60);
    /* ★ 소환은 **그리는 고리**가 0.35초마다 auto() 를 불러 일어난다. 빨리 감을 때
       이걸 안 부르면 군대가 **한 기도 안 선다** — 처음에 그걸 몰라 「겹침 없음」이
       0쌍으로 통과했다(표본이 없는데 PASS 였다). */
    if (i % 21 === 0) window.auto();
    const U = window.S.minions;
    if (U.length > peak) peak = U.length;
    if (U.length < 2) continue;

    /* ── ① 진(home) — 지금 살아 있는 전원이 **제 자리에 섰다면** 어떻게 되는가 */
    if (U.length >= peak && U.length > homeAtN) {
      homeAtN = U.length; homeBody = 1e9; homeTall = 1e9; homePairs = 0;
      for (let a = 0; a < U.length; a++) for (let b = a + 1; b < U.length; b++) {
        const A = U[a], B = U[b];
        const ax = Math.cos(A.home) * A.rad, ay = Math.sin(A.home) * A.rad;
        const bx = Math.cos(B.home) * B.rad, by = Math.sin(B.home) * B.rad;
        const g = gapPx(ax, ay, bx, by), hA = hOf(A), hB = hOf(B);
        const bw = ((met(A) ? met(A).bodyWidthFrac : .5) * hA + (met(B) ? met(B).bodyWidthFrac : .5) * hB) / 2;
        const tall = (hA + hB) / 2;
        const d = Math.hypot(g.dx, g.dy);
        if (d / bw < homeBody) homeBody = d / bw;
        /* 세로로 겹쳐 선 쌍만 **키**로 견준다 — 좌우로 벌어졌으면 키는 상관없다 */
        if (g.dx < bw && g.dy / tall < homeTall) homeTall = g.dy / tall;
        homePairs++;
      }
    }

    /* ── ② 싸우는 중 (참고) */
    if (i % 6) continue;
    for (let a = 0; a < U.length; a++) for (let b = a + 1; b < U.length; b++) {
      const A = U[a], B = U[b];
      const g = gapPx(A.x, A.y, B.x, B.y), hA = hOf(A), hB = hOf(B);
      const bw = ((met(A) ? met(A).bodyWidthFrac : .5) * hA + (met(B) ? met(B).bodyWidthFrac : .5) * hB) / 2;
      const tall = (hA + hB) / 2;
      const d = Math.hypot(g.dx, g.dy);
      if (d / bw < liveBody) liveBody = d / bw;
      if (g.dx < bw && g.dy / tall < liveTall) liveTall = g.dy / tall;
      pairs++;
    }
  }
  const f = (v) => v === 1e9 ? null : +v.toFixed(3);
  return JSON.stringify({ peak, cap: window.armyCap(), alive: window.S.minions.length,
    home: { n: homeAtN, pairs: homePairs, bodyRatio: f(homeBody), tallRatio: f(homeTall) },
    live: { pairs, bodyRatio: f(liveBody), tallRatio: f(liveTall) } });
})()` });
const out = JSON.parse(r.result.value);
console.log(JSON.stringify(out, null, 2));
console.log("errors:", errs.slice(0, 3));

/* ★ 표본이 없으면 **통과가 아니라 무효다.** 처음 판에서 소환이 한 기도 안 섰는데
   「PASS」가 찍혔다 — 0쌍을 통과로 읽는 자는 자가 아니다. */
if (!out.home.pairs) { console.log("INVALID 표본 0쌍 — 군대가 안 섰다(auto 가 안 불렸는지 보라)"); process.exitCode = 2; }
else {
  /* ★★ **판정은 몸(bodyRatio)으로만 한다.** 처음엔 세로(키)도 1.0 을 넘으라고 했는데,
     그건 **넘을 수 있는 자가 아니다** — 눌린 원(squash 0.86) 위에 열한 기를 세우면
     이웃의 발 높이 차이가 그림 키를 넘는 일은 진을 화면 밖으로 키워야 겨우 생긴다.
     실제로 새 값(150)에서도 0.409 였다. 못 넘을 자로 재면 늘 FAIL 이라 아무것도 못 가른다.
     몸 폭은 다르다 — 105 에서 **0.77(진짜로 파고들었다)**, 150 에서 1.179 로 갈렸다.
     세로는 숫자로만 남겨 두고(참고), 눈으로 볼 것은 tools/pack_shot.mjs 로 본다. */
  const H = out.home;
  const ok = H.bodyRatio >= 1;
  console.log(`진 ${H.n}기 — 몸 ${H.bodyRatio}${ok ? " ≥1 안 파고든다" : " <1 파고든다"} · 세로 ${H.tallRatio}(참고)`);
  console.log(ok ? "PASS" : "FAIL 진에서 겹친다");
  if (!ok) process.exitCode = 1;
}
await raw("Target.closeTarget", { targetId }); bws.close();
