/* 창마다 «실제로 구르는 칸」을 세고, 그 스크롤바가 판의 결을 따르는지 잰다.
     node tools/v50_scroll.mjs
   각 칸에 대해 scrollbar-width/color(계산값)와, 창 안에서 제일 밝은 화소를 함께 낸다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync, mkdirSync } = await import("node:fs");
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const OUT = process.argv[2] || "tmp/v50_scan";
mkdirSync(OUT, { recursive: true });
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
/* ★ 좁은 창을 쓴다 — 구르는 칸은 «자리가 모자랄 때» 생긴다(V-35 와 같은 결). */
const W = +(process.env.V50_W || 1280), H = +(process.env.V50_H || 800);
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(2200);
await ev(`localStorage.clear()`);
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`window.__toDungeon()`); await wait(45000);
await ev(`window.__die && window.__die()`); await wait(1500);
await ev(`window.__openWin(null)`); await wait(300);

const PROBE = `(() => {
  const out = [];
  for (const el of document.querySelectorAll("*")) {
    const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
    const cs = getComputedStyle(el);
    const oy = cs.overflowY, ox = cs.overflowX;
    const scrollY = (oy === "auto" || oy === "scroll" || oy === "overlay") && el.scrollHeight > el.clientHeight + 1;
    const scrollX = (ox === "auto" || ox === "scroll" || ox === "overlay") && el.scrollWidth > el.clientWidth + 1;
    if (!scrollY && !scrollX) continue;
    out.push({ sel: el.id ? "#" + el.id : "." + (el.className || "").toString().split(/\\s+/).filter(Boolean).slice(0,2).join("."),
      w: Math.round(r.width), h: Math.round(r.height), over: el.scrollHeight - el.clientHeight,
      sw: cs.scrollbarWidth, sc: cs.scrollbarColor,
      x: Math.round(r.x), y: Math.round(r.y) });
  }
  return out;
})()`;

const wins = ["shop", "forge", "dive", "tree", "bag", "stat", "doctrine", "tactic", "end", "reborn", "wipe"];
const report = {};
for (const w of wins) {
  await ev(`window.__openWin(${JSON.stringify(w)})`); await wait(500);
  const on = await ev(`!!document.querySelector(".win.on")`);
  if (!on) { report[w] = { open: false }; await ev(`window.__openWin(null)`); continue; }
  const list = await ev(PROBE);
  const box = await ev(`(()=>{const e=document.querySelector(".win.on .frame")||document.querySelector(".win.on");const r=e.getBoundingClientRect();return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height)};})()`);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`${OUT}/${w}.png`, Buffer.from(data, "base64"));
  report[w] = { open: true, box, scrollers: list };
  await ev(`window.__openWin(null)`); await wait(200);
}
writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
console.log(JSON.stringify(report, null, 1));
console.log("콘솔오류", errs.length, errs.slice(0, 3));
await raw("Target.closeTarget", { targetId });
process.exit(0);
