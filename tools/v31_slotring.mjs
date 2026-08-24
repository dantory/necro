/* **V-31 의 자** — 「빈 장비 칸이 안 보인다」를 재기 전에 **재는 자**부터 세운다
   ([[cause-written-in-the-item-is-a-guess]]).
   재는 값 = **칸 테두리의 또렷함**: 칸 둘레 1~2px 고리의 밝기가 **칸 밖 바닥**의
   중앙값에서 얼마나 벗어나는가(픽셀마다 |ΔL| · 상위 25% 평균).
   ★ 자를 믿게 만드는 법은 V-30 과 같다 — **세 무리를 같은 자로**:
     · 낀 칸(등급 테두리)  = 확실히 보인다 = 위 눈금
     · **빈 칸**            = 재려던 것
     · 아무것도 없는 바닥   = 아래 눈금
   node tools/v31_slotring.mjs   (tmp/v31_shot.png · tmp/v31_rects.json → v31_pix.py) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const DPR = 2;
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: DPR, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

/* v27_panels 와 **같은 세이브**(몇 시간 논 사람) — 낀 것이 셋이라 위 눈금이 선다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);

/* 능력치 창을 연다 — **정말 열렸는지 묻고**(안 열렸는데 재면 마을 사진에 0 이 붙는다,
   [[silent-zero-is-not-an-observation]]) 칸이 열 개 다 있는지도 센다. */
await ev(`document.querySelector('#hudMenu [data-win="stat"], #hudMenu button')?.click()`);
await ev(`(window.openWin||window.__openWin) ? (window.openWin?.("stat")||window.__openWin?.("stat")) : 0`);
await wait(500);
let open = await ev(`!!document.getElementById("winStat")?.classList.contains("on")`);
if (!open) {   /* 띠 단추를 이름으로 찾아 누른다 */
  await ev(`[...document.querySelectorAll("#hudMenu *")].find(e=>/능력치/.test(e.textContent||""))?.click()`);
  await wait(500);
  open = await ev(`!!document.getElementById("winStat")?.classList.contains("on")`);
}
if (!open) { console.log("판정: 못 잰다 — 능력치 창이 안 열렸다"); process.exit(1); }
await wait(400);

const rects = await ev(`(() => {
  const out = { slots: [], floor: null };
  for (const s of document.querySelectorAll("#winStat .pdSlot")) {
    const cell = s.querySelector(".cell"); if (!cell) continue;
    const r = cell.getBoundingClientRect(); if (r.width < 6 || r.height < 6) continue;
    out.slots.push({ cls: s.className.replace("pdSlot","").trim(),
                     empty: cell.classList.contains("empty"),
                     x: r.x, y: r.y, w: r.width, h: r.height });
  }
  /* 아래 눈금 — 인물 그림의 **오른쪽 빈 바닥**(칸도 인물도 없는 자리). 칸 하나 크기로 판다. */
  const doll = document.querySelector("#winStat .pdoll");
  if (doll && out.slots.length) {
    const d = doll.getBoundingClientRect(), s0 = out.slots[0];
    out.floor = { x: d.x + d.width/2 - s0.w/2, y: d.y + d.height - s0.h - 2, w: s0.w, h: s0.h };
  }
  return out;
})()`);
if (!rects.slots.length) { console.log("판정: 못 잰다 — 칸을 하나도 못 찾았다"); process.exit(1); }

const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("tmp/v31_shot.png", Buffer.from(shot.data, "base64"));
fs.writeFileSync("tmp/v31_job.json", JSON.stringify({ png: "tmp/v31_shot.png", dpr: DPR, ...rects }, null, 1));
console.log("칸", rects.slots.length, "· 빈 칸", rects.slots.filter(s => s.empty).length, "· errs", errs);
console.log("wrote tmp/v31_shot.png · tmp/v31_job.json → python3 tools/v31_pix.py");
process.exit(0);
