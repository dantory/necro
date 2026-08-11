/* 떨어진 전리품이 **등급별로 갈려 보이는가** — 판을 멈추고 다섯 등급을 한 줄로 세워 찍는다.
   전리품은 0.35초 놓였다가 빨려 들어가므로 굴러가는 판에서 우연히 잡기가 어렵다.
   (boss_probe·swing_seq 와 같은 결: 검수는 우연이 아니라 **세워 놓고** 한다.)
     node tools/drop_probe.mjs <out.png> */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
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
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 3, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await new Promise(r => setTimeout(r, 900));
const ex = `(()=>{const S=window.__S;
  S.speed=0; S.mobs.length=0; S.minions.length=0; S.piles.length=0; S.nums.length=0; S.fx.length=0;
  S.drops.length=0;
  const K=['wand','robe','charm'];
  for(let t=0;t<5;t++) S.drops.push({k:K[t%3], tier:t, x:(t-2)*62, y:-10, t:0.2, pull:9});  // pull 크게 = 안 빨려감
  return S.drops.map(d=>d.tier).join(',');})()`;
console.log("세운 등급:", (await S("Runtime.evaluate", { expression: ex, returnByValue: true })).result.value);
await new Promise(r => setTimeout(r, 600));
const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync(process.argv[2] || "/tmp/drop_probe.png", Buffer.from(shot.data, "base64"));
console.log("errors:", errs.slice(0, 3));
await raw("Target.closeTarget", { targetId }); bws.close();
