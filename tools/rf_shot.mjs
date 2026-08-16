/* 재련 UI 한 장 — 큰 수(+30 · 재련값 수천만)가 대장간 줄·장비 이름·칸을 안 깨는지 눈으로 본다.
   상태를 손으로 심어(plus 큼 · 4등급 장비) 대장간과 가방을 연다. node tools/rf_shot.mjs */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
/* 큰 수를 심는다 — 슬롯마다 4등급 장비(옵션 셋)에 재련 +30 안팎, 강화도 크게. */
const meta = {
  gold: 48213905, lv: 42, xp: 0, deepest: 104, runs: 4,
  up: { hp: 30, mp: 28, dmg: 33, army: 25 },
  plus: { wand: 30, robe: 28, charm: 32 },
  equip: {
    wand:  { k: "wand",  tier: 4, af: [{ id: "dmg", v: 34 }, { id: "mp", v: 2.4 }, { id: "gold", v: 41 }] },
    robe:  { k: "robe",  tier: 4, af: [{ id: "hp", v: 168 }, { id: "army", v: 1 }] },
    charm: { k: "charm", tier: 4, af: [{ id: "mp", v: 2.8 }, { id: "mdmg", v: 40 }] },
  },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 104, lastSeen: 0, corpses: 0,
};
/* ★ 먼저 초기 로드를 **끝까지** 기다린다 — 안 그러면 부팅이 fresh meta 를 저장해 내 것을 덮는다. */
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 3000));
await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 900));
/* 심은 큰 수가 auto 로 흐트러지기 전에 판을 **멈춰** 그대로 찍는다. */
await S("Runtime.evaluate", { expression: `if(window.S){window.S.dead=true;window.S.speed=0;}` });
await new Promise(r => setTimeout(r, 300));
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); console.log("wrote", out); };
await S("Runtime.evaluate", { expression: `window.__openWin && window.__openWin("forge")` });
await new Promise(r => setTimeout(r, 500));
await shot("tmp/rf_ui.png");
await S("Runtime.evaluate", { expression: `window.__openWin && window.__openWin("bag"); const c=document.querySelector('[data-spick]'); if(c) c.click();` });
await new Promise(r => setTimeout(r, 500));
await shot("tmp/rf_ui_bag.png");
/* 심은 값이 실제로 코드에 통했는지 숫자로도 찍는다(스샷과 교차검증). */
const chk = await S("Runtime.evaluate", { expression: `JSON.stringify({
  forgeTip: document.getElementById('forgeTip')?.innerText.replace(/\\n/g,' | '),
  plus: window.__META ? window.__META.plus : "no __META" })`, returnByValue: true });
console.log(chk.result.value);
await raw(`Target.closeTarget`, { targetId });
process.exit(0);
