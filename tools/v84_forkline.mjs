/* **갈래의 「가는 금」이 이름을 뚫고 지나는가.** (V-84)
   `.tFork::before` 는 갈래 두 칸 사이에 긋는 세로 금인데 자리를 **픽셀로 못박아**
   두었다(top:26px · height:20px). 칸 크기(`--tS`)는 창 높이에 따라 `fitTree` 가
   줄이므로, 낮은 창에서는 칸이 26px 언저리까지 작아지고 **금이 칸 밑 이름줄로
   내려앉는다** — 찍어 보면 「소수 정예」 글자 한가운데를 금이 관통한다
   ([[seam-not-values]] — 이음매는 값으로 못 맞춘다).
     node tools/v84_forkline.mjs            네 폭 전부
     node tools/v84_forkline.mjs 1280 720   한 폭만
     node tools/v84_forkline.mjs old        옛 자리(못박은 26/20)로 되돌려 잰다
   재는 것(갈래마다): 금이 이름과 겹친 px · 금이 칸 밑으로 내려간 px · 금이 칸 사이에
   보이는 px.
   ★ 판정은 셋이다 — ① 이름과 **한 톨도** 겹치면 운다(사람이 글자 위의 금을 본다)
     ② 칸 아래로 삐져나오면 운다 ③ 칸 사이에 **6px 미만**만 남으면 운다(안 보이면
     갈래인 줄 모른다 · [[knob-that-does-nothing]] 을 뒤집은 자리다). */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const A = process.argv.slice(2).filter(s => /^\d+$/.test(s)).map(Number);
const OLD = process.argv.includes("old");
const SIZES = A.length >= 2 ? [[A[0], A[1]]] : [[1512, 863], [1440, 800], [1280, 720], [1366, 700]];
const ws = new WebSocket((await (await fetch(CDP + "/json/version")).json()).webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; ws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
ws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => ws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
/* v80_look·v83_tipclip 과 **같은 몸** — 사진·수치를 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

const PROBE = `(()=>{
  const out=[];
  for(const fk of document.querySelectorAll("#treeCols .tFork")){
    const cs=getComputedStyle(fk,"::before");
    if(cs.content==="none") continue;
    const fr=fk.getBoundingClientRect();
    const top=fr.top+(parseFloat(cs.top)||0), bot=top+(parseFloat(cs.height)||0);
    /* 칸 띠 — 갈래 두 칸의 그림상자가 차지한 세로. 금은 이 안에 있어야 한다. */
    const tiles=[...fk.querySelectorAll(".tTile")].map(e=>e.getBoundingClientRect());
    const tTop=Math.min(...tiles.map(r=>r.top)), tBot=Math.max(...tiles.map(r=>r.bottom));
    let hit=0, names=[];
    for(const n of fk.querySelectorAll(".tn")){
      const r=n.getBoundingClientRect();
      const ov=Math.max(0, Math.min(bot,r.bottom)-Math.max(top,r.top));
      if(ov>0) names.push(n.textContent.trim());
      hit=Math.max(hit,ov);
    }
    out.push({ col: fk.closest(".tCol")?.dataset.k || "?",
      names: [...fk.querySelectorAll(".tn")].map(n=>n.textContent.trim()).join("·"),
      hitPx: Math.round(hit*10)/10, hitOn: names.join("·"),
      belowPx: Math.round(Math.max(0, bot-tBot)*10)/10,
      seenPx: Math.round(Math.max(0, Math.min(bot,tBot)-Math.max(top,tTop))*10)/10,
      tile: Math.round(tiles[0].height*10)/10, line: Math.round((bot-top)*10)/10 });
  }
  return out;
})()`;

let bad = [];
for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1800);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1600);
  if (OLD) await ev(`document.body.classList.add("forkold")`);
  await ev(`window.__openWin("tree")`); await wait(520);
  const rows = await ev(PROBE);
  console.log(`── ${W}x${H}${OLD ? "  (옛 자리 · 못박은 26/20)" : ""}`);
  if (!rows?.length) { bad.push(`${W}x${H}: 갈래를 못 찾았다`); console.log("  갈래 없다"); }
  for (const r of rows) {
    console.log(`  ${r.col.padEnd(6)} ${r.names.padEnd(14)} 칸 ${String(r.tile).padStart(5)}px · 금 ${String(r.line).padStart(4)}px` +
      ` · 이름겹침 ${String(r.hitPx).padStart(5)}px${r.hitOn ? `(${r.hitOn})` : ""} · 칸밑 ${String(r.belowPx).padStart(5)}px · 사이보임 ${String(r.seenPx).padStart(5)}px`);
    if (r.hitPx > 0) bad.push(`${W}x${H} ${r.col}: 금이 이름「${r.hitOn}」을 ${r.hitPx}px 뚫는다`);
    else if (r.belowPx > 0) bad.push(`${W}x${H} ${r.col}: 금이 칸 밑으로 ${r.belowPx}px`);
    else if (r.seenPx < 6) bad.push(`${W}x${H} ${r.col}: 금이 칸 사이에 ${r.seenPx}px 밖에 안 보인다`);
  }
  await ev(`window.__closeWin ? window.__closeWin() : window.__openWin(null)`); await wait(160);
}
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" | ") : `통과 (폭 ${SIZES.length})`}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
