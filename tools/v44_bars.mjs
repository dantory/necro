/* **체력줄이 화면에 얹는 «검은 잉크»를 잰다** (V-44 의 자).
     node tools/v44_bars.mjs [초]
   V-25 와 **같은 규칙** — 그리는 자리에서 모은 네모(`window.__RECTS`)를 그대로 읽는다.
   바깥에서 식을 다시 쓰면 판정이 그림과 갈린다([[threshold-and-ruler-must-match]]).
   잉크 = 화소 × 불투명도 이고 `barAt` 이 **제가 칠한 값을** 일곱째 칸에 적어 준다.
   옛 그림(`__BAROLD=1`)과 새 그림을 **같은 판에서 이어서** 재므로 두 수가 한 눈금이다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 30);
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
const wait = ms => new Promise(r => setTimeout(r, ms));
const { writeFileSync } = await import("node:fs");
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(1200);
/* ══ 세는 고리 — **두 팔을 한 프레임씩 번갈아** 잰다 ══════════════════════════
   앞서 「옛것 25초 → 새것 25초」로 이어 재 봤더니 **팔마다 판이 달랐다**(틀당 바
   4.3 대 8.6) — 뒤 팔이 더 붐비는 때를 잰 것이라 두 수가 한 눈금이 아니다
   ([[same-seed-is-not-same-run]]). 한 틀씩 번갈면 이웃한 두 틀은 거의 같은 판이라
   **짝지어 잰 것**이 된다.
   차례: 게임의 rAF 가 먼저 돌아 그림을 그리고, 뒤에 붙인 이 고리가 돈다. 그래서
   `__RECTS` 는 **직전 틀**의 것이고 그 틀에 걸려 있던 팔이 `cur` 다. */
await S("Runtime.evaluate", { expression: `
  window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
  window.__V44 = { run: false, cur: "before", arm: {} };
  globalThis.__BAROLD = 1;
  (function tick() {
    const R = window.__RECTS, V = window.__V44;
    if (V.run && R.bars.length) {
      const a = V.arm[V.cur] || (V.arm[V.cur] = { frames: 0, bars: 0, ink: 0, area: 0, body: 0, wide: 0, fill: 0 });
      a.frames++; a.bars += R.bars.length;
      for (const b of R.bars) { a.ink += b[6] || 0; a.area += b[2] * b[3];
        for (const d of R.bodies) if (d[4] === b[4] && d[5] === b[5]) { if (b[2] > d[2]) a.wide++; break; } }
      for (const d of R.bodies) a.body += d[2] * d[3];
    }
    /* 다음 틀의 팔을 지금 건다 — 그림은 다음 rAF 에서 이 값을 읽는다. */
    const nx = V.cur === "before" ? "after" : "before";
    V.cur = nx; globalThis.__BAROLD = (nx === "before") ? 1 : 0;
    requestAnimationFrame(tick);
  })();` });
await wait(600);
await S("Runtime.evaluate", { expression: `window.__V44.run = true` });
await wait(SECS * 1000);
await S("Runtime.evaluate", { expression: `window.__V44.run = false` });
/* 그림 — 같은 자리에서 옛것·새것을 **잇달아** 찍는다(판이 거의 안 움직인다). */
const shoot = async (name, old) => {
  await S("Runtime.evaluate", { expression: `globalThis.__BAROLD = ${old ? 1 : 0}` });
  await wait(120);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  writeFileSync(`tmp/v44_${name}.png`, Buffer.from(data, "base64"));
};
await shoot("before", true); await shoot("after", false);
const A = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: "JSON.stringify(window.__V44.arm)" })).result.value);
const row = (k) => { const a = A[k]; if (!a) return `${k}: 없음`;
  const f = Math.max(1, a.frames), nb = Math.max(1, a.bars);
  return `${k.padEnd(7)} 틀 ${String(a.frames).padStart(4)} · 틀당 바 ${(a.bars/f).toFixed(1)} · ` +
         `틀당 **검은 잉크 ${Math.round(a.ink/f)}** · 바 하나당 잉크 ${(a.ink/nb).toFixed(1)} · ` +
         `바 넓이 ${Math.round(a.area/f)} · 바÷몸 ${(100*a.area/Math.max(1,a.body)).toFixed(1)}% · ` +
         `몸보다 넓은 바 ${(100*a.wide/nb).toFixed(1)}%`; };
console.log(row("before")); console.log(row("after"));
if (A.before && A.after) {
  const b = A.before, a = A.after;
  const bi = b.ink / Math.max(1, b.bars), ai = a.ink / Math.max(1, a.bars);
  const bf = b.bars / Math.max(1, b.frames), af = a.bars / Math.max(1, a.frames);
  console.log(`→ 짝이 맞는가: 틀당 바 ${bf.toFixed(2)} 대 ${af.toFixed(2)} (${(100*Math.abs(af-bf)/bf).toFixed(1)}% 차)`);
  console.log(`→ **바 하나가 얹는 검은 잉크 ${bi.toFixed(1)} → ${ai.toFixed(1)} (${(100*(ai-bi)/bi).toFixed(1)}%)**`);
  console.log(`→ 화면 전체 잉크 ${Math.round(b.ink/Math.max(1,b.frames))} → ${Math.round(a.ink/Math.max(1,a.frames))}`);
}
console.log(`콘솔오류 ${errs.length}`, errs.slice(0, 3).join(" | "));
await raw("Target.closeTarget", { targetId });
process.exit(0);
