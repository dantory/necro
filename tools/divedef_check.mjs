/* 문 확인 — 「고르지 않으면 저절로 깊은 데서 시작」이 정말 그렇게 도는가
   (D-15 ㉮ · `core.js` DIVE_DEF / `META.diveSet`).
   ★ 이것은 **식**을 보는 자다. 판이 어떻게 되는지는 이미 재 놨다 —
     `tmp/collapse_d13dive`(문 씀) 대 `tmp/collapse_def_d12`(문 안 씀), `tools/d_gate.py`.
     그 「문 씀」 팔이 **새 기본값과 같은 것**이라는 게 아래 ②다(그래서 다시 안 돌린다).
   보는 것 넷:
     ① 문이 안 열린 깊이(<15층)에서는 기본값이 무엇이든 시작 층이 **1** 인가
        — 앞 6분을 못 건드린다는 것이 산수로 서야 한다(d_gate ③).
     ② 한 번도 안 고른 사람은 `diveAt() === diveMax()` 인가
        — 곧 검수기의 `__AUTO_DIVE`(이미 잰 팔)와 **정확히 같은 사람**인가.
     ③ **고른 값이 이기는가** — 「처음부터」(0)를 고르면 0, 55 를 고르면 55,
        최고 깊이가 줄면 저절로 깎이는가.
     ④ 되돌릴 길(`__DIVE_DEF=0`)이 **옛 판과 한 톨도 안 다른가**. */
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await new Promise(r => setTimeout(r, 2500));
const expr = `(async () => {
  const core = await import("/js/core.js");
  const M = core.META;
  const 깊이들 = [1, 8, 14, 15, 20, 45, 65];
  const rows = [];
  /* 사람 넷 — 「안 고름」과 고른 셋(처음부터·55층·깊이보다 깊게 고른 옛 값). */
  const 사람 = [
    { 이름: "안 고름",      set: 0, dive: 0 },
    { 이름: "처음부터 고름", set: 1, dive: 0 },
    { 이름: "55층 고름",    set: 1, dive: 55 },
  ];
  for (const p of 사람) for (const d of 깊이들) {
    M.deepest = d; M.diveSet = p.set; M.dive = p.dive;
    const r = { 사람: p.이름, 최고깊이: d, 고를수있는데까지: core.diveMax() };
    for (const [팔, v] of [["새 기본값", 1], ["옛 기본값", 0]]) {
      globalThis.__DIVE_DEF = v;
      r[팔] = core.startFloor();
    }
    delete globalThis.__DIVE_DEF;
    globalThis.__AUTO_DIVE = 1; r["검수기(AUTO_DIVE)"] = core.startFloor(); delete globalThis.__AUTO_DIVE;
    rows.push(r);
  }
  return JSON.stringify({ rows, def: core.DIVE_DEF_DEF });
})()`;
const r = await S("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
if (r.exceptionDetails) { console.error(JSON.stringify(r.exceptionDetails)); process.exit(2); }
const { rows, def } = JSON.parse(r.result.value);
let bad = 0;
if (def !== 1) { console.log(`✗ 기본값(DIVE_DEF_DEF)이 1 이 아니다(${def})`); bad++; }
console.log("죽은 뒤 다시 서는 층(startFloor) — 사람 셋 × 깊이 일곱\n");
console.log("| 사람 | 최고 깊이 | 고를 수 있는 데까지 | 새 기본값 | 옛 기본값 | 검수기 |");
console.log("| --- | --- | --- | --- | --- | --- |");
for (const x of rows)
  console.log(`| ${x.사람} | ${x.최고깊이} | ${x.고를수있는데까지} | **${x["새 기본값"]}** | ${x["옛 기본값"]} | ${x["검수기(AUTO_DIVE)"]} |`);
console.log("");
/* ① 문이 안 열리는 깊이에서는 어느 팔이든 1층 */
for (const x of rows) if (x.최고깊이 < 15 && (x["새 기본값"] !== 1 || x["옛 기본값"] !== 1)) {
  console.log(`✗ ① ${x.사람}·${x.최고깊이}층: 문이 안 열렸는데 ${x["새 기본값"]}층에서 선다`); bad++; }
/* ② 안 고른 사람 = 검수기가 이미 잰 그 사람 */
for (const x of rows) if (x.사람 === "안 고름" && x["새 기본값"] !== x["검수기(AUTO_DIVE)"]) {
  console.log(`✗ ② ${x.최고깊이}층: 새 기본값 ${x["새 기본값"]} ≠ 검수기 ${x["검수기(AUTO_DIVE)"]}`); bad++; }
/* ③ 고른 값이 이긴다 */
for (const x of rows) {
  if (x.사람 === "처음부터 고름" && x["새 기본값"] !== 1) {
    console.log(`✗ ③ ${x.최고깊이}층: 「처음부터」를 골랐는데 ${x["새 기본값"]}층에서 선다`); bad++; }
  if (x.사람 === "55층 고름") {
    const want = Math.max(1, Math.min(55, x.고를수있는데까지));
    if (x["새 기본값"] !== want) {
      console.log(`✗ ③ ${x.최고깊이}층: 55 를 골랐으면 ${want} 라야 하는데 ${x["새 기본값"]}`); bad++; }
  }
}
/* ④ 되돌릴 길이 옛 판과 같다 — 옛 판은 「고른 값 아니면 1층」이었다 */
for (const x of rows) {
  const 옛 = x.사람 === "55층 고름" ? Math.max(1, Math.min(55, x.고를수있는데까지)) : 1;
  if (x["옛 기본값"] !== 옛) { console.log(`✗ ④ ${x.사람}·${x.최고깊이}층: 되돌린 팔이 옛 판과 다르다(${x["옛 기본값"]} ≠ ${옛})`); bad++; }
}
console.log(bad ? `\n✗ 어긋남 ${bad}` : "\n✓ 넷 다 선다 — ①문 밖 무해 ②안 고른 사람 = 이미 잰 팔 ③고른 값이 이김 ④되돌릴 길 온전");
process.exit(bad ? 1 : 0);
