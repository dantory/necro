/* **낮은 창에서 저주나무 한 칸이 잘리는 자리를 «어디가 먹는지» 재는 자.** (V-90b)
   V-90 은 「더 있다」 표식만 되살렸다 — 잘리는 것 자체는 그대로다(1152×648 에서 24px).
   `--tS` 는 22px 이 바닥이라 칸으로는 더 못 줄인다. 그러면 남은 것은 **칸 사이 세로 여백**뿐인데,
   깎기 전에 **무엇이 몇 px 을 먹는지** 먼저 센다([[cause-written-in-the-item-is-a-guess]]).

     node tools/v90b_treefit.mjs             네 폭 전부
     node tools/v90b_treefit.mjs 1152 648    한 폭만
     node tools/v90b_treefit.mjs old         ★ 문 — 2단을 끄고 옛 꼴로 잰다(울어야 눈금)

   문(다 통과해야 한다):
     · 넘침 ≤ 2px · 잘린 칸 없음 (네 폭 전부)
     · 칸(`--tS`)은 22px 아래로 안 내려간다 — 그림이 안 읽히는 바닥
     · 칸 사이(`--tV`)는 **칸이 바닥(22px)을 친 창에서만** 깎인다 — 그 위에서는 기본값 그대로
   ★ 넘침 1px 까지는 봐준다 — `#treeCols` 의 `padding-bottom:1px` 이라 칸이 잘리지 않는다

   재는 것 — 제일 긴 갈래를 골라 그 안을 쪼갠다:
     머리글 · 칸(tTile) · 이름줄(tn) · 잇는 선(tLink) · 칸에 붙은 여백(padding/margin)
   그리고 넘침px 과 잘린 칸 이름. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const A = process.argv.slice(2);
const OLD = A.includes("old");
const nums = A.filter((s) => /^\d+$/.test(s)).map(Number);
const SIZES = nums.length >= 2 ? [[nums[0], nums[1]]]
  : [[1512, 863], [1366, 700], [1280, 720], [1152, 648]];

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", (ev) => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise((r) => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const bad = [];
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

const READ = `(() => {
  const c = document.getElementById("treeCols");
  const cb = c.getBoundingClientRect();
  const px = (el, p) => parseFloat(getComputedStyle(el)[p]) || 0;
  /* 제일 긴 갈래 = scrollHeight 가 제일 큰 칸줄 */
  let col = null;
  for (const k of c.querySelectorAll(".tCol")) {
    const h = k.getBoundingClientRect().height;
    if (!col || h > col.h) col = { el: k, h, k: k.dataset.k };
  }
  const h3 = col.el.querySelector("h3");
  const nodes = [...col.el.querySelectorAll(".tNode")];
  const links = [...col.el.querySelectorAll(".tLink")];
  const forks = [...col.el.querySelectorAll(".tFork")];
  const sum = (a) => +a.reduce((x, y) => x + y, 0).toFixed(1);
  const n0 = nodes[0];
  const tile = n0.querySelector(".tTile"), tn = n0.querySelector(".tn");
  let cut = null;
  for (const n of c.querySelectorAll(".tNode")) {
    const b = n.getBoundingClientRect();
    if (b.bottom > cb.bottom + 0.5 && b.top < cb.bottom - 0.5) {
      const over = +(b.bottom - cb.bottom).toFixed(1);
      if (!cut || over > cut.over) cut = { n: (n.textContent || "").trim().split("\\n")[0].slice(0, 14), over };
    }
  }
  return {
    over: c.scrollHeight - c.clientHeight, boxH: +cb.height.toFixed(1), cut,
    tS: getComputedStyle(c).getPropertyValue("--tS").trim(),
    branch: col.k, colH: +col.h.toFixed(1), n: nodes.length,
    h3H: +h3.getBoundingClientRect().height.toFixed(1),
    nodesH: sum(nodes.map((n) => n.getBoundingClientRect().height)),
    linksH: sum(links.map((n) => n.getBoundingClientRect().height)), links: links.length,
    forksH: sum(forks.map((n) => n.getBoundingClientRect().height)), forks: forks.length,
    one: { nodeH: +n0.getBoundingClientRect().height.toFixed(1),
           tileH: +tile.getBoundingClientRect().height.toFixed(1),
           tileMB: px(tile, "marginBottom"),
           tnH: +tn.getBoundingClientRect().height.toFixed(1),
           tnFS: getComputedStyle(tn).fontSize,
           padT: px(n0, "paddingTop"), padB: px(n0, "paddingBottom") },
    linkH: links[0] ? +links[0].getBoundingClientRect().height.toFixed(1) : 0,
    tV: getComputedStyle(c).getPropertyValue("--tV").trim() || "(기본 2px)",
  };
})()`;

for (const [W, H] of SIZES) {
  await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await S("Page.reload", { ignoreCache: true }); await wait(1400);
  await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
  await S("Page.reload", { ignoreCache: true }); await wait(1300);
  if (OLD) await ev(`window.__TREE_NOFIT2 = 1`);
  await ev(`window.__openWin("tree")`); await wait(500);
  const r = await ev(READ);
  console.log(`\n══ ${W}x${H} · --tS ${r.tS} · 칸사이 ${r.tV} · 상자 ${r.boxH}px ══`);
  if (r.over > 2) bad.push(`${W}x${H} 넘침 ${r.over}px` + (r.cut ? ` · 「${r.cut.n}」 ${r.cut.over}px 잘림` : ""));
  else if (r.cut) bad.push(`${W}x${H} 잘린 칸 「${r.cut.n}」 ${r.cut.over}px`);
  if (parseFloat(r.tS) < 22) bad.push(`${W}x${H} 칸이 바닥 아래로 내려갔다 (${r.tS})`);
  /* 2단은 **바닥을 친 창에서만** 돈다 — 칸이 22 위인데 칸 사이가 깎여 있으면 헛돈 것이다.
     기본값은 `@media (max-height:900px)` 가 정한다(900 이하 1px · 그 위 2px). */
  const dflt = H <= 900 ? 1 : 2;
  if (parseFloat(r.tS) > 22 && parseFloat(r.tV) < dflt)
    bad.push(`${W}x${H} 칸이 아직 ${r.tS} 인데 칸 사이를 깎았다 (${r.tV} < ${dflt}px)`);
  console.log(`  넘침 ${r.over}px` + (r.cut ? ` · 잘린 칸 「${r.cut.n}」 ${r.cut.over}px` : " · 잘린 칸 없음"));
  console.log(`  제일 긴 갈래 ${r.branch} · 칸 ${r.n}개 · 총 ${r.colH}px`);
  console.log(`    머리글 ${r.h3H} · 칸들 ${r.nodesH} · 잇는선 ${r.linksH}(${r.links}개 × ${r.linkH}) · 갈림 ${r.forksH}(${r.forks}개)`);
  const o = r.one;
  console.log(`    칸 하나 ${o.nodeH}px = 위여백 ${o.padT} + 그림 ${o.tileH} + 그림밑 ${o.tileMB} + 이름 ${o.tnH}(${o.tnFS}) + 아래여백 ${o.padB}`);
}
console.log("");
if (bad.length) { for (const b of bad) console.log("  ✗ " + b); console.log(`판정: ${bad.length}곳이 운다`); }
else console.log("판정: 통과 (네 폭 다 들어간다 · 칸은 22px 바닥 위)");
bws.close(); process.exit(bad.length ? 1 : 0);
