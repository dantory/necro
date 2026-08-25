/* V-79. 「아래에 더 있다」 그늘·▾ 가 **구르는 칸을 다 못 덮는다.**
   `.wScroll::after` 는 `position:sticky; bottom:0; display:block` 이라 «흐름» 에서는
   칸 폭을 다 덮는다. 그런데 `#statBody.sideBySide` 는 **grid** 라, 가상요소가
   **격자 칸 하나**로 자동 배치된다 — 1열(인물) 아래에 새 줄로 떨어져서,
   ① 정작 잘리는 것은 2열의 「일지」인데 거기엔 아무 표시가 없고
   ② 인물 밑에는 아무것도 없는데 검은 띠와 ▾ 가 덩그러니 뜬다.
   자는 **가상요소의 상자를 CDP 로 직접 재서**(추측하지 않는다) 폭이 칸을 덮는지 본다.
   node tools/v79_morehint.mjs   (인자 없으면 창 다섯을 다 잰다) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("DOM.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

/* ★ 가상요소는 JS 로 상자를 못 잰다 — CDP 의 DOM 트리에는 **노드로** 있다. */
async function afterBox(sel) {
  const { root } = await S("DOM.getDocument", { depth: 1 });
  const { nodeId } = await S("DOM.querySelector", { nodeId: root.nodeId, selector: sel });
  if (!nodeId) throw new Error(`${sel} 이 없다`);
  const { node } = await S("DOM.describeNode", { nodeId, depth: 0 });
  const ps = (node.pseudoElements || []).filter(p => p.pseudoType === "after");
  if (!ps.length) return null;                       // ::after 가 안 그려졌다
  const { model } = await S("DOM.getBoxModel", { backendNodeId: ps[0].backendNodeId });
  const q = model.border;                            // [x1,y1, x2,y2, x3,y3, x4,y4] · CSS px
  return { x: Math.round(q[0]), y: Math.round(q[1]), w: Math.round(q[2] - q[0]), h: Math.round(q[5] - q[1]) };
}

const sizes = [[1512, 863], [1512, 800], [1440, 900], [1366, 768], [1280, 620]];
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);

const rows = []; let bad = 0;
for (const [w, h] of sizes) {
  await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 2, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1600);
  await ev(`window.__openWin && window.__openWin("stat")`); await wait(500);
  const body = await ev(`(()=>{const b=document.getElementById('statBody'); if(!b) return null;
    const r=b.getBoundingClientRect(); const j=b.querySelector('.jList');
    const jr=j?j.getBoundingClientRect():null;
    return {x:Math.round(r.x),y:Math.round(r.y),w:Math.round(r.width),h:Math.round(r.height),
      more:b.classList.contains('more'), grid:getComputedStyle(b).display,
      cw:Math.round(b.clientWidth), ch:Math.round(b.clientHeight), sh:Math.round(b.scrollHeight), st:Math.round(b.scrollTop),
      pl:parseFloat(getComputedStyle(b).paddingLeft)||0, pr:parseFloat(getComputedStyle(b).paddingRight)||0,
      jx:jr?Math.round(jr.x):null, jw:jr?Math.round(jr.width):null};})()`);
  if (!body) { console.log(`${w}×${h}  statBody 가 없다`); bad++; continue; }
  const a = await afterBox("#statBody");
  const inner = body.cw - body.pl - body.pr;        // 안쪽(패딩·막대 뺀) 폭 — 띠가 덮어야 할 폭
  const cov = a ? +(a.w / inner * 100).toFixed(1) : 0;
  /* 끝 조건 둘 — ① 띠가 칸 폭을 «다» 덮는다(≥99%) ② 띠가 칸 밑자락에 붙어 있다(±2px) */
  const foot = a ? (body.y + body.h) - (a.y + a.h) : null;
  const ok = !body.more || (a && cov >= 99 && Math.abs(foot) <= 2);
  if (!ok) bad++;
  rows.push({ win: `${w}×${h}`, more: body.more, disp: body.grid, 구름: `${body.st}/${body.sh}-${body.ch}`, 안쪽: inner, 칸: `${body.x}..${body.x + body.w}(${body.w})`,
    일지: body.jx == null ? "—" : `${body.jx}..${body.jx + body.jw}`,
    띠: a ? `${a.x}..${a.x + a.w}(${a.w})` : "없음", 덮음: `${cov}%`, 밑자락차: foot, 판정: ok ? "ok" : "✗" });
}
console.table(rows);
console.log(`판정: ${bad ? `미달 — ${bad}/${sizes.length} 창에서 「더 있다」 띠가 구르는 칸을 다 못 덮는다` : "통과 — 다섯 창 다 띠가 칸 폭을 덮고 밑자락에 붙어 있다"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad ? 1 : 0);
