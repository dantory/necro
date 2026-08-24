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
await S("Page.reload", { ignoreCache: true }); await wait(5000);
/* ★ 자는 **사람이 지나는 길**로 걸어야 한다([[probe-must-walk-the-real-path]]) —
   마을에 선 채로 재면 몸이 하나도 없어 «가려진 몸 0» 이라는 거짓 통과가 나온다. */
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(2000);
/* **가장 깊이 내려가는 발을 시간을 두고 센다** — 한 장은 표본 하나다([[seed-the-probe]]).
   60초 동안 0.5초마다 훑어 «제일 아래 발»과 «가려지는 자리에 선 몸»의 수를 센다. */
await S("Runtime.evaluate", { expression: `(() => {
  window.__v16 = { deep: -1e9, covered: 0, seen: 0, ticks: 0 };
  const ov = Math.min(...["log","hudMenu"].map(id => { const e = document.getElementById(id);
    const r = e && e.getBoundingClientRect(); return r && r.height > 0 ? r.top : 1e9; }));
  window.__v16.ovTop = ov;
  window.__v16.t = setInterval(() => { const g = window.__geo, S = window.__S; if (!g || !S) return;
    const py = (y) => g.cy + y * g.sc * g.squash; window.__v16.ticks++;
    for (const a of [...(S.mobs||[]), ...(S.minions||[])]) { const f = py(a.y);
      window.__v16.seen++; if (f > window.__v16.deep) window.__v16.deep = f;
      if (f > ov) window.__v16.covered++; } }, 500);
})()` });
await wait(60000);
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
  const v = window.__v16 || {}; if (v.t) clearInterval(v.t);
  return { v16: { 겹치는것의윗금: Math.round(v.ovTop || 0), 제일깊은발: Math.round(v.deep || 0),
                  가려진몸: v.covered, 본몸: v.seen, 훑음: v.ticks,
                  여유px: Math.round((v.ovTop || 0) - (v.deep || 0)) },
           panelH: getComputedStyle(document.documentElement).getPropertyValue("--panelH").trim(),
           geo: { h: g.h, freeH: g.freeH, cy: Math.round(g.cy), sc: +(g.sc||0).toFixed(3), squash: +(g.squash||0).toFixed(3), ringH: Math.round(g.ringH||0) },
           freeBottom: Math.round(g.freeH), lowestFoot: feet[feet.length-1], feetTop5: feet.slice(-5), els };
})()` });
const R = result.value; console.log(JSON.stringify(R.v16, null, 1));
console.log(JSON.stringify({ panelH: R.panelH, geo: R.geo }));
process.exit(0);
