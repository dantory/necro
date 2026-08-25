/* V-77 — 켜서 본다. 도킹한 「능력치」 창의 **발치**를 전/후로 찍는다.
   node tools/v77_shot.mjs      (tmp/v77_foot_before.png · tmp/v77_foot_after.png)
   `__NOMENUH=true` 가 「전」(메뉴 띠를 0 으로 친다 — 고치기 전과 같은 자리). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] }, robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] }, charm: { k: "charm", tier: 2, af: [] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1800);
/* 발치만 도려낸다 — 온화면은 「좀 낮네」로만 보여 V-76 을 닷새 놓쳤다. */
const CLIP = { x: 0, y: 540, width: 1000, height: 130, scale: 2 };
for (const [tag, before] of [["before", true], ["after", false]]) {
  await ev(`globalThis.__NOMENUH=${before}; window.dispatchEvent(new Event("resize"))`); await wait(300);
  /* ★ `__openWin` 은 **토글**이다 — 이미 열려 있으면 닫힌다. 「후」 판이 통째로 마을
     사진이 된 까닭이 이것이었다. 열렸는지 **보고** 아니면 한 번 더 연다
     ([[probe-must-walk-the-real-path]] — 사람은 열릴 때까지 누른다). */
  for (let i = 0; i < 3; i++) {
    if (await ev(`document.body.classList.contains("winopen")`)) break;
    await ev(`window.__openWin("stat")`); await wait(500);
  }
  if (!(await ev(`document.body.classList.contains("winopen")`))) throw new Error(`${tag}: 창이 안 열렸다`);
  const s = await S("Page.captureScreenshot", { format: "png", clip: CLIP });
  fs.writeFileSync(`tmp/v77_foot_${tag}.png`, Buffer.from(s.data, "base64"));
  console.log("wrote", `tmp/v77_foot_${tag}.png`,
    await ev(`(()=>{const w=document.getElementById("winStat").getBoundingClientRect(),
      m=document.getElementById("hudMenu").getBoundingClientRect();
      return " 창 발치 "+Math.round(w.bottom)+" · 띠 윗금 "+Math.round(m.top)+
             " · 겹침 "+Math.max(0,Math.round(w.bottom-m.top))+"px";})()`));
}
await S("Target.closeTarget", { targetId }); bws.close(); process.exit(0);
