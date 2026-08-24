/* V-16 자 — 무대 아래쪽에서 몸이 잘리는 자리를 잰다. 화면 요소의 실제 사각형과
   geo(freeH/panelH)를 나란히 찍어, 가리는 것이 «판(HUD)»인지 «잘라내기»인지 가른다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(9000);
const { result } = await S("Runtime.evaluate", { returnByValue: true, expression: `(() => {
  const g = window.__geo || {}, S = window.__S || {};
  const els = [...document.body.querySelectorAll("*")].filter(e => {
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    return r.width > 400 && r.height > 8 && cs.display !== "none" && cs.visibility !== "hidden" && +cs.opacity > 0.05; })
    .map(e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
      return { id: e.id || "", cls: (e.className && e.className.baseVal !== undefined ? e.className.baseVal : String(e.className || "")).slice(0,40),
               tag: e.tagName, top: Math.round(r.top), bot: Math.round(r.bottom), h: Math.round(r.height),
               z: cs.zIndex, ov: cs.overflow, bg: cs.backgroundColor.slice(0,28) }; })
    .filter(e => e.bot > 500).sort((a,b) => a.top - b.top);
  const feet = [];
  const py = (y) => g.cy + y * g.sc * g.squash;
  for (const a of [...(S.mobs||[]), ...(S.minions||[])]) feet.push(Math.round(py(a.y)));
  feet.sort((a,b)=>a-b);
  return { panelH: getComputedStyle(document.documentElement).getPropertyValue("--panelH").trim(),
           geo: { h: g.h, freeH: g.freeH, cy: Math.round(g.cy), sc: +(g.sc||0).toFixed(3), squash: +(g.squash||0).toFixed(3), ringH: Math.round(g.ringH||0) },
           freeBottom: Math.round(g.freeH), lowestFoot: feet[feet.length-1], feetTop5: feet.slice(-5), els };
})()` });
console.log(JSON.stringify(result.value, null, 1));
process.exit(0);
