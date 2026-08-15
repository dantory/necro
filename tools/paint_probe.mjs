/* **그리기가 태운 시간**을 잰다 — CPU 프로파일이 못 보는 쪽.
     node tools/paint_probe.mjs [초] [층] [몸수] [느리게배]

   왜 이 자가 필요한가 — `cpu_profile` 로 JS 쪽 네 자리를 막고 나니 여섯 배 느린
   기계에서도 JS 는 1초 중 0.12~0.15초만 먹는다. 그런데 그 자는 나머지 **94.8%**
   를 `(program)` 한 덩이로만 보여 준다 — 「JS 가 아니다」까지만 말하고 **그럼
   무엇이냐**는 답을 못 한다. 그 안이 곧 `drawImage`·`ellipse`·`fillRect` 같은
   2D 네이티브 호출이고, 폰에서 진짜로 무너지는 자리가 거기다.

   재는 법 — `CanvasRenderingContext2D.prototype` 을 갈아 끼워 **호출을 세고 잰다.**
   두 번 나눠 도는 이유가 있다:
     ① **세기만 하는 판** — `c[i]++` 하나뿐이라 판을 안 흔든다. 프레임당 호출수는
        이쪽 숫자가 맞다.
     ② **재는 판** — 호출마다 `performance.now()` 를 두 번 부른다. 그 자체가 비용이라
        **빈 호출로 먼저 그 비용을 재서(calib) 빼 준다.** 안 빼면 fillRect 처럼
        수천 번 불리는 것이 실제보다 몇 배 크게 나온다.
   ★ 어디서 부르는지도 같이 낸다 — 매번 스택을 뜨면 느려지므로 **N 번에 한 번만**
     뜬다(표본). 「drawImage 가 많다」보다 「drawBodies 가 drawImage 를 판다」가
     고칠 수 있는 말이다.
   ★ 판은 병수님 화면(414×860 · dpr2)으로 세우고 **사람이 지나는 길**로 내려간다
     — 마을에서 시작해 층으로([[probe-must-walk-the-real-path]]). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 6), FLOOR = +(process.argv[3] || 30), BODIES = +(process.argv[4] || 0);
const SLOW = +(process.argv[5] || 1);
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
/* 무겁게 만드는 길도 **판이 쓰는 문**으로만 — 자리는 `summon` 에 맡긴다(손으로 주면 NaN). */
if (BODIES) await ev(`(async()=>{const B=await import("/js/battle.js");
  const 종 = ["skel","ghoul","golem"];
  for (let i=(S.minions||[]).length; i<${BODIES}; i++) B.summon(종[i%3]);
  for (let i=0;i<${BODIES} * 4;i++) B.addCorpse((i%11-5)*24, ((i/11|0)%7-3)*20, i%3);
  return 1;})()`, true);
await wait(1500);
const 판 = await ev(`({몸:(S.minions||[]).length, 적:(S.mobs||[]).length, 시체:S.corpses|0, 그림:(S.piles||[]).length})`);

/* ── 갈아 끼우기 ──────────────────────────────────────────────────────────
   `mode`: "count" 면 세기만, "time" 이면 재기까지. `__paint.stop()` 이 원래대로 돌린다. */
const 계측기 = (mode, everyN) => `(() => {
  const P = CanvasRenderingContext2D.prototype;
  const 이름들 = ["drawImage","fillRect","strokeRect","clearRect","fill","stroke","ellipse","arc","beginPath",
    "moveTo","lineTo","closePath","save","restore","translate","rotate","scale","setTransform","clip",
    "fillText","strokeText","measureText","createRadialGradient","createLinearGradient","createPattern",
    "getImageData","putImageData","roundRect","quadraticCurveTo","bezierCurveTo","rect"];
  const 셈 = Object.create(null), 시간 = Object.create(null), 자리 = Object.create(null), 원래 = Object.create(null);
  const now = performance.now.bind(performance);
  const 표본 = ${everyN | 0};
  for (const n of 이름들) {
    const f = P[n]; if (typeof f !== "function") continue;
    원래[n] = f; 셈[n] = 0; 시간[n] = 0;
    P[n] = ${mode === "time"} ? function (...a) {
      const t = now(); const r = f.apply(this, a); 시간[n] += now() - t;
      const k = ++셈[n];
      if (표본 && k % 표본 === 0) { const s = (new Error().stack || "").split("\\n")[2] || "?";
        const key = n + " ← " + s.trim().replace(/^at /, "").split(" (")[0].slice(0, 40);
        자리[key] = (자리[key] || 0) + 표본; }
      return r;
    } : function (...a) { 셈[n]++; return f.apply(this, a); };
  }
  /* 프레임 수는 rAF 로 센다 — 「프레임당 몇 번」의 분모다. */
  let 프레임 = 0; let 살아 = true;
  const 톱니 = () => { if (!살아) return; 프레임++; requestAnimationFrame(톱니); };
  requestAnimationFrame(톱니);
  window.__paint = { 셈, 시간, 자리, get 프레임() { return 프레임; },
    stop() { 살아 = false; for (const n in 원래) P[n] = 원래[n]; } };
  return 1;
})()`;

/* 재는 판의 **자릿세**를 먼저 잰다 — `performance.now()` 두 번 + 스택 표본의 비용.
   이걸 안 빼면 fillRect 처럼 수천 번 불리는 쪽이 실제보다 부풀어 1위처럼 보인다. */
const 자릿세ns = await ev(`(() => {
  const now = performance.now.bind(performance); const N = 200000;
  const 빈 = function(){}; let t0 = now(); for (let i=0;i<N;i++) 빈();
  const 맨 = now() - t0;
  t0 = now(); for (let i=0;i<N;i++) { const t = now(); 빈(); const d = now() - t; if (d < -1) throw 0; }
  return +(((now() - t0 - 맨) / N) * 1e6).toFixed(1);   /* 호출당 나노초 */
})()`);

const 돌리기 = async (mode) => {
  await ev(계측기(mode, mode === "time" ? 97 : 0));
  if (SLOW > 1) { await S("Emulation.setCPUThrottlingRate", { rate: SLOW }); await wait(800); }
  await wait(SEC * 1000);
  const r = await ev(`(() => { const p = window.__paint; const o = { 셈: {...p.셈}, 시간: {...p.시간}, 자리: {...p.자리}, 프레임: p.프레임 }; p.stop(); return o; })()`);
  if (SLOW > 1) await S("Emulation.setCPUThrottlingRate", { rate: 1 });
  return r;
};

const 센판 = await 돌리기("count");
await wait(600);
const 잰판 = await 돌리기("time");

const 초 = SEC;
const 프레임당 = 센판.프레임 || 1;
/* 시간은 **잰 판**에서, 프레임당 호출수는 **센 판**에서 — 각자 맞는 쪽에서 가져온다.
   자릿세는 잰 판의 호출수로 빼야 한다(두 판의 호출수가 조금 다르다). */
const rows = Object.keys(센판.셈).filter(n => 센판.셈[n] > 0 || 잰판.셈?.[n] > 0).map(n => {
  const 셈2 = 잰판.셈?.[n] ?? 0;
  const 순 = Math.max(0, (잰판.시간[n] || 0) - 셈2 * 자릿세ns / 1e6);
  return { 이름: n, "프레임당": +(센판.셈[n] / 프레임당).toFixed(1),
    "초당ms": +(순 / 초).toFixed(1), 잰호출: 셈2 };
}).sort((a, b) => b.초당ms - a.초당ms);

const 그리기초당ms = +(rows.reduce((a, r) => a + r.초당ms, 0)).toFixed(1);
const 자리 = Object.entries(잰판.자리 || {}).sort((a, b) => b[1] - a[1]).slice(0, 10)
  .map(([어디, n]) => ({ 어디, 대략호출: n }));
const out = { 층: FLOOR, 초, 느리게: SLOW, 판,
  프레임: { 센판: 센판.프레임, 잰판: 잰판.프레임, fps: +(센판.프레임 / 초).toFixed(1) },
  "자릿세ns/호출": 자릿세ns, 그리기초당ms,
  "프레임여유%": +(100 - 그리기초당ms / 10).toFixed(1),
  상위: rows.slice(0, 14), "부르는자리(표본)": 자리, 콘솔오류: errs };
console.log(JSON.stringify(out, null, 1));
/* 판단 기준 — `cpu_profile` 의 JS초당ms 와 **같은 자로 읽는다**(1초 = 1000ms 천장).
   그리기가 초당 400ms 를 넘으면 폰에서 남는 것으로 합성까지 못 한다.
   호출수 쪽 문턱도 하나 둔다: 프레임당 2,000 번을 넘는 단일 호출은 구울 자리다
   (`drawGlows` 가 fillRect 1,600 번으로 1위였던 그 모양). */
const 넘침 = 그리기초당ms > 400;
const 잦음 = rows.find(r => r.프레임당 > 2000);
const bad = errs.length || !센판.프레임 || 넘침 || !!잦음;
console.log(bad ? `FAIL${넘침 ? ` — 그리기 초당 ${그리기초당ms}ms (느리게 ×${SLOW})` : ""}${잦음 ? ` — ${잦음.이름} 프레임당 ${잦음.프레임당}회` : ""}${errs.length ? ` — 콘솔오류 ${errs.length}` : ""}`
  : `PASS — 그리기 초당 ${그리기초당ms}ms · 1위 ${rows[0]?.이름} ${rows[0]?.초당ms}ms (느리게 ×${SLOW})`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad ? 1 : 0);
