/* **기술 칸이 «검은 네모»로 죽어 있는 시간을 센다** (2026-08-24 · V-21)
     node tools/v21_slotdim.mjs [초]
   1층 40초를 돌며 40ms 마다 칸마다 ① 쿨다운 검은 막대가 칸을 덮은 몫
   ② 그 몫이 단축키 숫자(칸 아래 35%)를 가렸는지 ③ off(회색) 상태인지를 센다.
   ★ 밖에서 식을 다시 쓰지 않고 **그리는 자리(DOM)의 실제 높이**를 읽는다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SEC = Number(process.argv[2] || 40);
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
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(4200);
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" }); await wait(1200);
/* 재는 자를 페이지 안에 심는다 — 그리는 자리의 높이를 그대로 읽는다 */
await S("Runtime.evaluate", { expression: `(() => {
  window.__SD = { n: 0, per: {} };
  const KEYFRAC = 0.35;               // 단축키 숫자가 앉은 칸 아래쪽 몫
  window.__sdTimer = setInterval(() => {
    const slots = document.querySelectorAll('#belt .slot[data-sk]');
    if (!slots.length) return;
    window.__SD.n++;
    slots.forEach((el, i) => {
      const key = el.dataset.sk;
      const p = window.__SD.per[key] || (window.__SD.per[key] = { n: 0, cov: 0, keyHid: 0, off: 0, dead: 0 });
      const cd = el.querySelector('[data-cd]');
      const h = cd ? parseFloat(cd.style.height) || 0 : 0;   // %
      const off = el.classList.contains('off');
      p.n++; p.cov += h;
      if (h >= KEYFRAC * 100) p.keyHid++;
      if (off) p.off++;
      if (h >= 60 && off) p.dead++;    // 검은 막대가 아이콘까지 먹고 회색까지 겹친 «죽은 네모»
    });
  }, 40);
})()` });
await wait(SEC * 1000);
const out = (await S("Runtime.evaluate", { returnByValue: true, expression:
  `clearInterval(window.__sdTimer), JSON.stringify(window.__SD)` })).result.value;
const d = JSON.parse(out);
const names = { raise:"해골", ghoul:"구울", golem:"골렘", nova:"시폭", amp:"증폭", weaken:"약화", decrep:"쇠약", burn:"태움", wall:"뼈벽", offer:"제물" };
console.log(`틀 ${d.n} · ${SEC}초`);
for (const k in d.per) { const p = d.per[k];
  console.log(`  ${(names[k]||k).padEnd(4)} 덮인몫 평균 ${(p.cov/p.n).toFixed(1)}% · 단축키가림 ${(100*p.keyHid/p.n).toFixed(1)}% · 회색 ${(100*p.off/p.n).toFixed(1)}% · 죽은네모 ${(100*p.dead/p.n).toFixed(1)}%`); }
console.log(`콘솔오류 ${errs.length}`);
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(errs.length ? 0 : 0);
