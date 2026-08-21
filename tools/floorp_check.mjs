// 문 확인 — HPGROW=3 의 p=0 이 2 와, p=1 이 1 과 «한 톨도» 안 다른지 본다.
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
  const st = core.S, M = core.META;
  const FL = [1, 5, 10, 20, 30, 45, 60, 80];
  const 몸 = [ {이름:"맨몸", hp:0, lv:1}, {이름:"계급20", hp:20, lv:40}, {이름:"계급40", hp:40, lv:86} ];
  const rows = [];
  for (const b of 몸) {
    M.up.hp = b.hp; M.lv = b.lv;
    for (const f of FL) {
      st.floor = f;
      const r = { 몸: b.이름, 층: f, 층피해: core.floorDmg(f) };
      for (const [n, hg, p] of [["m1",1,null],["m2",2,null],["p0",3,0],["p05",3,0.5],["p1",3,1]]) {
        globalThis.__HPGROW = hg; if (p == null) delete globalThis.__FLOOR_P; else globalThis.__FLOOR_P = p;
        r[n] = core.hpMaxOf();
      }
      delete globalThis.__HPGROW; delete globalThis.__FLOOR_P;
      rows.push(r);
    }
  }
  return JSON.stringify(rows);
})()`;
const r = await S("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
if (r.exceptionDetails) { console.error(JSON.stringify(r.exceptionDetails)); process.exit(2); }
const rows = JSON.parse(r.result.value);
let bad = 0;
console.log("| 몸 | 층 | 층피해 | m2(지금) | p=0 | p=0.5 | p=1 | m1(옛) |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
for (const x of rows) {
  const ok0 = x.p0 === x.m2, ok1 = Math.abs(x.p1 - x.m1) <= 1;
  if (!ok0 || !ok1) bad++;
  console.log(`| ${x.몸} | ${x.층} | ${x.층피해} | ${x.m2} | ${x.p0}${ok0?"":" ✗"} | ${x.p05} | ${x.p1}${ok1?"":" ✗"} | ${x.m1} |`);
}
console.log(bad ? `\n✗ 어긋난 칸 ${bad}` : "\n✓ p=0 은 지금(2)과 같고 p=1 은 옛(1)과 같다 — 문이 두 끝을 잇는다");
await S("Target.closeTarget", { targetId }).catch(() => {});
process.exit(bad ? 1 : 0);
