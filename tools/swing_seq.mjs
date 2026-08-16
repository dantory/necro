// 공격 몸짓 검수기 — 한 종의 휘두름을 **진행도별로 세워** 한 줄로 찍는다.
//   node tools/swing_seq.mjs <out.png> <base> [dir]     예: … minion/golem east
// 판을 멈춰 세우고(S.speed=0) swing 값을 손으로 넣어 그리므로, 프레임 타이밍에
// 기대지 않고 **같은 진행도끼리** 전후를 비교할 수 있다.
const [, , OUT = "tmp/swing.png", BASE = "minion/golem", DIR = "east"] = process.argv;
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const errors = [];
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown")
    errors.push("EXC " + (m.params.exceptionDetails?.exception?.description || "?"));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error")
    errors.push("CON " + (m.params.args || []).map(a => a.value ?? a.description ?? "").join(" "));
});
await new Promise(r => bws.addEventListener("open", r));

const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (expression) => {
  const r = await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(JSON.stringify(r.exceptionDetails));
  return r.result.value;
};
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4000));

await ev("window.__toDungeon()");
await new Promise(r => setTimeout(r, 1200));

const KIND = BASE.split("/")[1];
const D = { east: [1, 0], south: [0, 1], "south-east": [0.7, 0.7] }[DIR] || [1, 0];
// 판을 멈추고 **한 놈만** 세운다 — 다른 그림이 겹치면 몸짓을 못 잰다.
const meta = await ev(`(function(){
  const S = window.__S;
  S.speed = 0; S.mobs.length = 0; S.minions.length = 0; S.fx.length = 0; S.corpses2 = [];
  if (S.piles) S.piles.length = 0;
  S.minions.push({ id: 901, kind: ${JSON.stringify(KIND)}, home: 0, rad: 0, h: 84,
    x: 0, y: 150, rise: 0, born: 0, moving: 0, walked: 0, hp: 260, hpMax: 260, atk: 0,
    r: 30, swing: 0, sdx: ${D[0]}, sdy: ${D[1]}, dx: ${D[0]}, dy: ${D[1]} });
  return { geo: window.__geo, swingT: window.__SWING_T || null };
})()`);

const SWING_T = 0.6;                       // battle.js 와 같은 값(멈춘 판에 손으로 넣는다)
const STEPS = 8;
const shots = [];
for (let i = 0; i < STEPS; i++) {
  const p = i / (STEPS - 1);               // 0 → 1 진행도
  await ev(`(function(){const u=window.__S.minions[0]; u.swing=${SWING_T}*(1-${p})||0.0001; })()`);
  await new Promise(r => setTimeout(r, 90));   // rAF 두어 번 — 그린 뒤에 찍는다
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  shots.push(data);
}
fs.mkdirSync("tmp/swing", { recursive: true });
shots.forEach((d, i) => fs.writeFileSync(`tmp/swing/${i}.png`, Buffer.from(d, "base64")));
fs.writeFileSync("tmp/swing/geo.json", JSON.stringify(meta, null, 1));
console.log("frames", shots.length, "errors", errors.length, errors.slice(0, 5).join(" | "));
await raw("Target.closeTarget", { targetId });
bws.close();
