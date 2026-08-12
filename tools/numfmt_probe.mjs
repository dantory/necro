// 「숫자가 화면을 덮는다」 자 — 떠오르는 피해 숫자가 **구슬과 같은 자**(k/M)로 적히는지 본다.
//   node tools/numfmt_probe.mjs [out.png]
// ★ 마을에서는 S.nums 를 아예 안 그린다 — 반드시 **던전에 들어가서** 잰다.
//   (처음 짤 때 마을에서 재고 「안 뜬다」로 오진했다. 검수기는 사람이 지나는 길로.)
// 통과 조건: 여섯 자리 피해가 398k 로 줄어 스프라이트를 안 덮는다.
const OUT = process.argv[2] || "tmp/numfmt.png";
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
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
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 3500));

/* 판이 도는 동안 숫자는 0.9초면 사라진다 — 찍는 사이에 꺼지지 않게 **계속 다시 채운다.**
   t 는 0.63(=p 0.3)으로 고정: 갓 뜬 것은 아직 투명해서 찍어도 안 보인다. */
const setup = `(async () => {
  const core = await import("/js/core.js");
  const st = core.S;
  window.toDungeon();
  const bat = await import("/js/battle.js");
  bat.enterFloor(50);
  st.mobs.length = 0;                       // 몸통이 숫자를 가리지 않게 판을 비운다
  const CASES = [850, 4400, 39812, 398123, 1234567];
  const XS = [-170, -85, 0, 85, 170];
  window.__numHold = setInterval(() => {
    st.nums.length = 0;
    CASES.forEach((v, i) => st.nums.push({
      x: XS[i], y: (i % 2 ? -30 : 30), v, kind: i === 3 ? "core" : "dmg", t: 0.63, vx: 0, seed: 0.5,
    }));
  }, 60);
  await new Promise(r => setTimeout(r, 400));
  return JSON.stringify({ at: window.__MODE.at, floor: st.floor, nums: st.nums.length, cases: CASES });
})()`;
const r = await S("Runtime.evaluate", { expression: setup, awaitPromise: true, returnByValue: true });
console.log(r.result.value || JSON.stringify(r.result));
const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(OUT, Buffer.from(shot.data, "base64"));
await S("Runtime.evaluate", { expression: "clearInterval(window.__numHold)" });
console.log("shot", OUT);
await S("Target.closeTarget", { targetId }).catch(() => {});
process.exit(0);
