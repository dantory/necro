/* **W-2b — 둘레 «맨 위»에 서는 놈의 머리가 화면 밖으로 나가는가** (2026-08-24)
     node tools/w2b_top_probe.mjs [floor]
   자가 재는 것: **머리끝 여유(px)** = 화면 위 0 에서 제일 높은 머리끝까지.
   음수면 잘린 것이다. 세 자리를 본다 —
     ① 둘레 맨 위(a=-90°)에 선 제일 큰 졸개(brute 62 · 정예 76)
     ② 관문의 주인(늘 오른쪽 ±23°, 그래서 세로로는 덜 오른다)
     ③ 소환수 중 제일 큰 흙 골렘(진 반경 1.25배)
   창 크기를 여럿 본다 — 세로가 짧은 창에서 먼저 깨진다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const FLOOR = Number(process.argv[2] || 50);
const VIEWS = (process.env.W2B_VIEWS || "1512x863,1512x760,1280x860,1920x1080,414x896").split(",").map(v => v.split("x").map(Number));
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
const shot = process.argv.includes("--shot");
for (const [W, H] of VIEWS) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async (expression) => (await S("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true })).result.value;
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE }); await wait(4200);
  await ev("window.__toDungeon()"); await wait(1400);
  const info = await ev(`(function(){
    const S = window.__S; S.speed = 0; S.floor = ${FLOOR};
    S.mobs.length = 0; S.minions.length = 0; S.fx.length = 0; S.drops && (S.drops.length = 0);
    const RAD = 240;                                   // 둘레 바깥(RING_SPAWN 190 + 50)
    const mk = (kind, h, a, rad, boss) => ({ id: Math.random(), kind, h, a, boss: !!boss,
      x: Math.cos(a) * rad, y: Math.sin(a) * rad, hp: 100, hpMax: 100, dmg: 1, spd: 0,
      r: h * 0.4, atk: 0, born: 0, born0: 0.4, dx: 0, dy: 1, swing: 0, moving: 0, walked: 0 });
    const T = -Math.PI / 2;                            // 둘레 맨 위
    const bh = window.__bossH(S.floor);
    S.mobs.push(mk("brute", 62, T, RAD));                       // 제일 큰 졸개
    S.mobs.push(mk("brute", Math.round(62 * 1.22), T + 0.28, RAD));  // 정예
    S.mobs.push(mk("boss", bh, -0.4, RAD, true));               // 관문 주인(오른쪽 위 끝)
    S.minions.push({ id: 9001, kind: "golem", h: Math.round(84 * 1.22), rad: 150 * 1.25,
      home: T, x: Math.cos(T) * 150 * 1.25, y: Math.sin(T) * 150 * 1.25,
      rise: 0, dmg: 1, hp: 100, hpMax: 100, atk: 0, r: 40 });
    return null; })()`);
  await wait(700);
  const out = await ev(`(function(){
    const g = window.__geo, S = window.__S;
    const top = (u) => Math.round(g.cy + u.y * g.sc * g.squash - (u.h || 48) * g.us);
    const rows = S.mobs.map(m => [m.boss ? "관문주인" : (m.h > 62 ? "정예" : "졸개"), m.h, top(m)])
      .concat(S.minions.map(u => ["골렘", u.h, top(u)]));
    return JSON.stringify({ 창: [g.w, g.h], 판밖: Math.round(g.freeH), cy: Math.round(g.cy),
      sc: +g.sc.toFixed(3), us: +g.us.toFixed(3), squash: +g.squash.toFixed(3),
      머리끝: Object.fromEntries(rows.map(r => [r[0] + "(h" + r[1] + ")", r[2]])),
      최악: Math.min(...rows.map(r => r[2])) }); })()`);
  console.log(`${W}x${H}  ${out}`);
  if (shot) {
    const { data } = await S("Page.captureScreenshot", { format: "png" });
    const f = `tmp/w2b_${W}x${H}.png`; writeFileSync(f, Buffer.from(data, "base64")); console.log("  →", f);
  }
  await raw("Target.closeTarget", { targetId });
}
bws.close(); process.exit(0);
