/* **W-2 — 배율을 올리면 관문의 주인이 화면을 넘치는가** (2026-08-24)
     node tools/w2_boss_shot.mjs 50 1.05 1.72 2.0
   제일 큰 놈(관문 주인)을 세워 놓고 배율만 갈아 끼워 찍는다. 배율을 올릴 때
   **깨지는 쪽은 늘 제일 큰 것**이라 여기부터 본다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const FLOOR = Number(process.argv[2] || 50), vals = process.argv.slice(3).map(Number);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
for (const v of vals) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async (expression) => (await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.addScriptToEvaluateOnNewDocument", { source: `globalThis.__SC_MAX = ${v};` });
  await S("Page.navigate", { url: PAGE }); await wait(4200);
  await ev("window.__toDungeon()"); await wait(1400);
  const info = await ev(`(function(){
    const S = window.__S;
    S.speed = 0; S.floor = ${FLOOR}; S.mobs.length = 0; S.minions.length = 0; S.fx.length = 0;
    const mk = (kind, h, x, boss) => ({ id: Math.random(), kind, h, x, y: 40, boss: !!boss,
      hp: 100, hpMax: 100, dmg: 1, spd: 0, a: 0, r: h * 0.4, atk: 0, born: 0, born0: 0.4,
      dx: 0, dy: 1, swing: 0, moving: 0, walked: 0 });
    const kinds = [...new Set(window.__mobKinds(S.floor))];
    const bh = window.__bossH(S.floor);
    S.mobs.push(mk("boss", bh, -110, true));
    kinds.forEach((k, i) => S.mobs.push(mk(k, window.__MOB_H_OF(k), 20 + i * 70, false)));
    return JSON.stringify({ bossH: bh, kinds, us: +window.__geo.us.toFixed(2),
      보스화면px: Math.round(bh * window.__geo.us), 판밖높이: Math.round(window.__geo.freeH) });
  })()`);
  await wait(700);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  const f = `tmp/w2_boss${String(v).replace(".", "_")}.png`;
  writeFileSync(f, Buffer.from(data, "base64"));
  console.log(f, info);
  await raw("Target.closeTarget", { targetId });
}
bws.close(); process.exit(0);
