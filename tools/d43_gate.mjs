/* ══ D-43 · 문이 «꺼졌을 때 한 톨도 안 바뀌는가»를 확인한다 ══
     node tools/d43_gate.mjs
   재는 자가 아니라 **문 검사**다. D-42 가 갈라 놓은 갈래 ㉡(둘레 90/도발)에 문을 냈으니,
   값을 켜기 전에 두 가지만 본다:
     ① 기본(`__GRIP` 없음) — gripMul() 이 **정확히 1** 이고, 90·130 이 글자 그대로 선다.
        통(GRIP.buf)이 아예 안 돌아 판이 예전과 byte 로 같다.
     ② 켜면 **실제로 문다** — 군세를 옛 최고의 절반으로 꺼뜨린 셈을 넣으면 몫이 내려간다.
   ★ 값 고르기(g 얼마)는 여기서 안 한다 — 그건 끝 조건 다섯을 적고 d42_walk 로 잰다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter(t => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId: sid } = await raw("Target.attachToTarget", { targetId, flatten: true });
await raw("Runtime.enable", {}, sid);
await wait(2500);
const ev = async src => (await raw("Runtime.evaluate",
  { expression: src, returnByValue: true, awaitPromise: true }, sid)).result.value;

const R = await ev(`(async()=>{
  const C = await import("/js/core.js");
  const out = {};
  /* ① 꺼진 채로 — 통을 돌리려 해도 아무 일이 없어야 한다 */
  delete globalThis.__GRIP;
  C.gripReset();
  for (let i=0;i<40;i++) C.gripTick(0.1, i<20?8:2, i*0.1);   // 8 마리에서 2 마리로 꺼뜨린다
  out.offMul   = C.gripMul();
  out.offExact = (90 * C.gripMul()) === 90 && (130 * C.gripMul()) === 130;
  out.offBuf   = C.GRIP.buf.reduce((a,b)=>a+b,0);            // 통이 안 돌면 0
  out.offSec   = C.GRIP.sec;
  /* ② 켜면 실제로 문다 */
  globalThis.__GRIP = 1;
  C.gripReset();
  for (let i=0;i<40;i++) C.gripTick(0.1, i<20?8:2, i*0.1);
  out.onHi  = C.GRIP.hi;
  out.onMul = C.gripMul();
  out.onLim = 90 * C.gripMul();
  /* ③ 온전하면 켜 놔도 정확히 1 — 「그냥 쉬워짐」이 아니다 */
  C.gripReset();
  for (let i=0;i<40;i++) C.gripTick(0.1, 8, i*0.1);
  out.fullMul = C.gripMul();
  /* ④ 문턱 아래(hi<4)에서는 아무 일도 안 한다 */
  C.gripReset();
  for (let i=0;i<40;i++) C.gripTick(0.1, i<20?3:0, i*0.1);
  out.lowMul = C.gripMul();
  delete globalThis.__GRIP;
  return out;
})()`);
await raw("Target.closeTarget", { targetId });
bws.close();

const ok = [];
const chk = (name, cond, got) => { ok.push(cond); console.log(`  ${cond ? "✓" : "✗"} ${name} — ${got}`); };
console.log("── D-43 문 검사 ──");
chk("① 꺼지면 몫이 **정확히 1**", R.offMul === 1, `gripMul()=${R.offMul}`);
chk("① 90·130 이 글자 그대로",     R.offExact,    `90*mul===90 · 130*mul===130`);
chk("① 통조차 안 돈다",            R.offBuf === 0 && R.offSec === 0, `buf합=${R.offBuf} · 눌린초=${R.offSec}`);
chk("② 켜면 문다(8→2 · g=1)",      R.onMul < 1,   `옛최고 ${R.onHi} · 몫 ${R.onMul.toFixed(3)} · 둘레 90 → ${R.onLim.toFixed(1)}`);
chk("③ 온전하면 켜 놔도 1",        R.fullMul === 1, `gripMul()=${R.fullMul}`);
chk("④ 문턱 아래(hi<4)는 무일",    R.lowMul === 1, `gripMul()=${R.lowMul}`);
const pass = ok.every(Boolean);
console.log(`\n판정: ${pass ? "통과 — 문만 났고 판은 예전 그대로다" : "실패"}`);
process.exit(pass ? 0 : 1);
