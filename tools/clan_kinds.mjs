/* **네 종 × 갈래 셋을 한 장에** (2026-08-24 · V-7)
   node tools/clan_kinds.mjs → tmp/clan_kinds.png
   갈래 필터는 타락자를 보고 골랐다 — 좀비(이미 초록)·해골궁수(뼈)에 걸어도 안 흉한지 본다. */
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
await S("Page.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 900, height: 620, deviceScaleFactor: 2, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(1800);
const r = await S("Runtime.evaluate", { awaitPromise: true, returnByValue: true, expression: `(async()=>{
  const C = await import("/js/core.js");
  const kinds = ["fallen", "zombie", "skelarch", "brute"];
  const ims = {};
  for (const k of kinds) { const im = new Image(); im.src = "assets/mob/" + k + "/south.png"; await im.decode(); ims[k] = im; }
  const W = 900, H = 620, cw = W / (C.MOB_CLAN.length + 1), rh = H / kinds.length;
  document.body.innerHTML = ""; document.body.style.cssText = "margin:0;background:#241d16;overflow:hidden";
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  c.style.cssText = "width:" + W + "px;height:" + H + "px;display:block";
  document.body.appendChild(c);
  const g = c.getContext("2d"); g.imageSmoothingEnabled = false;
  g.fillStyle = "#241d16"; g.fillRect(0, 0, W, H);
  g.textAlign = "center";
  kinds.forEach((k, ri) => {
    const y = ri * rh;
    g.fillStyle = "#9a8e78"; g.font = "14px system-ui";
    g.fillText(C.MOB_N[k], cw / 2, y + rh / 2);
    C.MOB_CLAN.forEach((cl, ci) => {
      const x = (ci + 1) * cw + cw / 2, s2 = 118;
      g.save(); g.filter = cl.f || "none";
      g.drawImage(ims[k], x - s2 / 2, y + 8, s2, s2);
      g.restore();
      if (ri === 0) { g.fillStyle = "#e8dcc0"; g.font = "13px system-ui"; g.fillText(cl.n || "붉은", x, y + 6); }
    });
  });
  return C.MOB_CLAN.map(c => c.n || "붉은").join(",");
})()` });
console.log(r.result.value);
await wait(300);
const { data } = await S("Page.captureScreenshot", { format: "png" });
writeFileSync("tmp/clan_kinds.png", Buffer.from(data, "base64"));
console.log("tmp/clan_kinds.png");
await raw("Target.closeTarget", { targetId });
process.exit(0);
