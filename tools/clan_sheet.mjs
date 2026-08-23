/* **타락자 갈래 후보를 한 장에 늘어놓는다** (2026-08-24 · V-7)
   node tools/clan_sheet.mjs   → tmp/clan_sheet.png
   CSS filter 로 물들인 스프라이트를 눈으로 고르기 위한 자다. 값을 코드에 박기 전에 본다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const CANDS = JSON.stringify([
  ["원본",       "none"],
  ["푸른 200",   "hue-rotate(200deg)"],
  ["푸른 215+",  "hue-rotate(215deg) saturate(1.25)"],
  ["이끼 95",    "hue-rotate(95deg) saturate(0.8)"],
  ["검은",       "brightness(0.55) saturate(0.4)"],
  ["황토 -30",   "hue-rotate(-30deg) saturate(1.3) brightness(1.08)"],
  ["보라 285",   "hue-rotate(285deg) saturate(1.1)"],
  ["창백",       "saturate(0.25) brightness(1.25)"],
]);
await S("Page.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1180, height: 300, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(1800);
await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async()=>{
  const cands = ${CANDS};
  const im = new Image(); im.src = "assets/mob/fallen/south.png";
  await im.decode();
  const W = 1180, H = 300, cell = W / cands.length;
  document.body.innerHTML = "";
  document.body.style.cssText = "margin:0;background:#241d16;overflow:hidden";
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  c.style.cssText = "width:" + W + "px;height:" + H + "px;display:block";
  document.body.appendChild(c);
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.fillStyle = "#241d16"; g.fillRect(0, 0, W, H);
  const S2 = 160;
  cands.forEach(([name, f], i) => {
    const x = i * cell + cell / 2;
    g.save(); g.filter = f;
    g.drawImage(im, x - S2 / 2, 40, S2, S2);
    g.restore();
    g.fillStyle = "#e8dcc0"; g.font = "16px system-ui"; g.textAlign = "center";
    g.fillText(name, x, 232);
    g.fillStyle = "#9a8e78"; g.font = "11px system-ui";
    g.fillText(String(i), x, 252);
  });
  return "ok";
})()` });
await wait(400);
const { data } = await S("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/clan_sheet.png", Buffer.from(data, "base64"));
console.log("tmp/clan_sheet.png");
await raw("Target.closeTarget", { targetId });
