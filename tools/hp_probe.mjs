// 「한 대도 못 버틴다」 자 — 깊이별로 **최대 체력 대 층 피해**를 재고, 층을 내려갈 때
// 남은 체력이 **비율을 지키며** 따라 커지는지 본다.
//   node tools/hp_probe.mjs
// 통과 조건: 어느 깊이에서도 hpMax/floorDmg >= SURVIVE_HITS, 그리고 층 이동 시 hp/hpMax 비율 보존.
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
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 3000));

const expr = `(async () => {
  const core = await import("/js/core.js");
  const bat  = await import("/js/battle.js");
  const st = core.S, out = { rows: [], ratio: [] };
  for (const f of [1, 5, 10, 20, 30, 40, 50, 60, 80]) {
    st.floor = f;
    const dmg = core.floorDmg(f), hm = core.hpMaxOf();
    out.rows.push({ f, dmg, hpMax: hm, hits: +(hm / dmg).toFixed(2) });
  }
  // 층 이동 — 반쯤 깎인 채 내려가면 반쯤인 채로 커져야 한다.
  st.floor = 1; st.hpMax = core.hpMaxOf(); st.hp = st.hpMax * 0.5;
  for (const f of [10, 30, 50]) {
    bat.enterFloor(f);
    out.ratio.push({ f, hp: Math.round(st.hp), hpMax: st.hpMax, frac: +(st.hp / st.hpMax).toFixed(3) });
  }
  return JSON.stringify(out);
})()`;
const r = await S("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
const out = JSON.parse(r.result.value);
const HITS = 5;
const bad = out.rows.filter(x => x.hits < HITS - 0.01);
const badRatio = out.ratio.filter(x => Math.abs(x.frac - 0.5) > 0.02);
console.log(JSON.stringify({ ...out, fail: { tooFragile: bad, ratioBroken: badRatio } }, null, 2));
await S("Target.closeTarget", { targetId }).catch(() => {});
await raw("Target.closeTarget", { targetId }).catch(() => {});
process.exit(bad.length || badRatio.length ? 1 : 0);
