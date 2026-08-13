/* **망가진 저장을 심어도 안 죽는가** — 저장을 믿지 않는 자리 전부를 한 번에 지나 본다.
     node tools/save_probe.mjs [url]

   ROADMAP 「저장을 믿지 않는 자리를 한 곳 더」(2026-08-13, 가방 사고에서).
   장비·재련은 이미 걸렀지만 **트리·강화·숫자**는 그대로 믿고 있었다. 옛 이름·오타·
   손으로 고친 값이 들어오면 같은 식으로 터진다 — 그것도 하필 **판을 접는 순간**에.

   ★ 「안 터졌다」로는 모자란다. 조용히 접히는 쪽이 더 무섭다 —
     · 모르는 노드가 남으면 spUsed 가 **없는 노드에 쓴 점수까지** 세어 찍을 점수가 사라진다
     · relics 가 음수면 relicMul 이 0 이하가 되어 금·경험치·시체가 통째로 없어진다
     · up 에 모르는 칸이 있으면 upCost 가 그 자리서 터져 **상점이 통째로 멈춘다**
     그래서 예외 0 만 보지 않고 **거른 뒤의 값이 범위 안인지**와 **상점·트리가 실제로
     그려지는지**까지 본다.

   ★ 노드 이름·강화 칸 이름을 손으로 안 적는다 — window.__TREE_IDS / __UP_KEYS /
     __GEAR_KEYS 에서 가져온다(자와 게임이 어긋나면 자가 먼저 거짓말을 한다). */
const CDP = "http://127.0.0.1:9333";
const PAGE = process.argv[2] || "http://127.0.0.1:8774/index.html";
const META_KEY = "necro.meta.v1";

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); let errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 200));
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") errs.push("console: " + (m.params.args?.[0]?.value || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const ev = async (e) => JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: e, awaitPromise: true })).result.value);
const wait = (ms) => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await S("Page.navigate", { url: PAGE });
await wait(5200);

let bad = 0;
const say = (ok, s) => { if (!ok) bad++; console.log(`${ok ? "  ok" : "FAIL"}  ${s}`); };

/* 게임이 스스로 말해 주는 이름표 — 자가 목록을 갖고 있으면 안 된다. */
const KEYS = await ev(`JSON.stringify({ tree: window.__TREE_IDS, up: window.__UP_KEYS, gear: window.__GEAR_KEYS })`);
say(!!KEYS.tree && Object.keys(KEYS.tree).length > 0, `노드 목록을 게임에서 받았다 (${Object.keys(KEYS.tree || {}).length}개)`);
say(Array.isArray(KEYS.up) && KEYS.up.length > 0, `강화 칸 목록을 게임에서 받았다 (${(KEYS.up || []).join(",")})`);
const someNode = Object.keys(KEYS.tree)[0], someMax = KEYS.tree[someNode];

/** 망가진 저장 다섯 벌. 하나하나 **실제로 있었던 모양**을 본떴다. */
const BROKEN = [
  { n: "① 모르는 노드 · 옛 이름",
    save: { lv: 12, tree: { [someNode]: 2, skeleton_dmg: 5, "": 3, ghoul_old: 9 } },
    /* 이름을 한 번이라도 고치면 그 뒤 사용자 전부가 이 모양이 된다. */ },
  { n: "② 상한을 넘긴 랭크 · 손으로 고친 저장",
    save: { lv: 30, tree: { [someNode]: 999 }, up: { army: 9999 } } },
  { n: "③ 문자열 · 소수 · NaN 이 숫자 자리에",
    save: { lv: "12", gold: "5000", xp: null, deepest: 1.7, relics: "abc",
            tree: { [someNode]: "3", ...Object.fromEntries(Object.keys(KEYS.tree).slice(1, 3).map(k => [k, 1.6])) },
            up: Object.fromEntries(KEYS.up.map(k => [k, "2"])) } },
  { n: "④ 음수 유해 · 0층 · 음수 강화",
    save: { relics: -40, rebirths: -3, deepest: 0, lv: 0, best: -9, corpses: -100,
            up: Object.fromEntries(KEYS.up.map(k => [k, -5])), tree: { [someNode]: -2 } } },
  { n: "⑤ 통째로 딴 것 · 배열과 문자열",
    save: { tree: [1, 2, 3], up: "nope", quests: 7, plus: null, equip: { wand: { k: "wand", tier: 77 } },
            bag: [{ k: "amul", tier: 3 }, null, "x"], lastSeen: "어제" } },
];

for (const B of BROKEN) {
  errs = [];
  await S("Runtime.evaluate", { expression:
    `localStorage.setItem(${JSON.stringify(META_KEY)}, ${JSON.stringify(JSON.stringify(B.save))})` });
  await S("Page.navigate", { url: PAGE });
  await wait(4800);
  console.log(`\n${B.n}`);

  /* ㉠ 부팅이 조용한가 — 예외 한 톨도 없어야 한다. */
  say(errs.length === 0, `부팅 예외 0 ${errs.length ? "→ " + errs.slice(0, 2).join(" | ") : ""}`);

  /* ㉡ 거른 뒤의 값이 **범위 안인가.** 살아남기만 하고 값이 미친 것은 더 나쁘다. */
  const m = await ev(`(()=>{ const M = window.META, T = window.__TREE_IDS, U = window.__UP_KEYS;
    const num = (v) => typeof v === "number" && isFinite(v);
    const badTree = Object.entries(M.tree || {}).filter(([k, v]) => !T[k] || !num(v) || v < 1 || v > T[k] || v % 1);
    const badUp   = Object.keys(M.up || {}).filter(k => !U.includes(k) || !num(M.up[k]) || M.up[k] < 0 || M.up[k] % 1);
    const missUp  = U.filter(k => !(k in (M.up || {})));
    return JSON.stringify({ badTree, badUp, missUp,
      lv: M.lv, deepest: M.deepest, best: M.best, relics: M.relics, gold: M.gold, xp: M.xp,
      corpses: M.corpses, lastSeen: M.lastSeen,
      treeType: Object.prototype.toString.call(M.tree), upType: Object.prototype.toString.call(M.up),
      questType: Object.prototype.toString.call(M.quests), plusType: Object.prototype.toString.call(M.plus),
      bagBad: (M.bag || []).filter(it => !it || !window.__GEAR_KEYS.includes(it.k)).length,
      bagArr: Array.isArray(M.bag),
      sp: window.__spLeft ? window.__spLeft() : null });})()`);
  say(m.badTree.length === 0, `트리에 남은 나쁜 노드 0 ${m.badTree.length ? "→ " + JSON.stringify(m.badTree) : ""}`);
  say(m.badUp.length === 0 && m.missUp.length === 0,
      `강화 칸이 정확히 목록 그대로 ${m.badUp.length || m.missUp.length ? `→ 나쁨 ${JSON.stringify(m.badUp)} 빠짐 ${JSON.stringify(m.missUp)}` : ""}`);
  say(m.treeType === "[object Object]" && m.upType === "[object Object]"
      && m.questType === "[object Object]" && m.plusType === "[object Object]",
      `tree/up/quests/plus 가 전부 object (${m.treeType} ${m.upType} ${m.questType} ${m.plusType})`);
  const nums = { lv: m.lv, deepest: m.deepest, best: m.best, relics: m.relics, gold: m.gold, xp: m.xp, corpses: m.corpses, lastSeen: m.lastSeen };
  const badNum = Object.entries(nums).filter(([, v]) => typeof v !== "number" || !isFinite(v) || v < 0);
  say(badNum.length === 0, `숫자 자리가 전부 유한한 0 이상 ${badNum.length ? "→ " + JSON.stringify(badNum) : ""}`);
  say(m.lv >= 1 && m.deepest >= 1 && m.best >= 1, `층·레벨·최고가 1 아래로 안 내려감 (lv ${m.lv} · 깊이 ${m.deepest} · 최고 ${m.best})`);
  say(m.bagArr && m.bagBad === 0, `가방이 배열이고 모르는 물건 0 (나쁨 ${m.bagBad})`);

  /* ㉢ **상점과 트리가 실제로 그려지는가** — upCost·spLeft 가 NaN 이면 여기서 「-」로 샌다.
     터지는 것보다 이쪽이 흔하고, 눈으로만 보면 놓친다. */
  const ui = await ev(`(()=>{ try {
    window.__openWin("forge"); window.__openWin("tree");
    const grid = document.getElementById("forgeGrid"), tre = document.getElementById("treeWrap") || document.getElementById("treeBody");
    const txt = (document.body.innerText || "");
    return JSON.stringify({ forge: (grid?.children.length) | 0,
      tree: (tre?.querySelectorAll(".tNode, .node, button").length) | 0,
      sp: (document.getElementById("treeSp") || {}).textContent,
      nan: (txt.match(/NaN|undefined|Infinity/g) || []).slice(0, 3) });
  } catch (e) { return JSON.stringify({ err: String(e).slice(0, 160) }); } })()`);
  say(!ui.err, `상점·트리를 여는 데 예외 없음 ${ui.err ? "→ " + ui.err : ""}`);
  say((ui.forge | 0) > 0, `상점 칸이 그려짐 (${ui.forge}칸)`);
  say(!/NaN|Infinity|undefined/.test(String(ui.sp)) && String(ui.sp || "").length > 0, `남은 점수가 숫자로 뜸 (${ui.sp})`);
  say(!(ui.nan || []).length, `화면에 NaN/undefined/Infinity 없음 ${(ui.nan || []).length ? "→ " + ui.nan.join(",") : ""}`);

  /* ㉣ **판이 실제로 굴러가는가** — 부팅만 넘기고 첫 층에서 얼어붙는 저장이 있다. */
  errs = [];
  await S("Runtime.evaluate", { expression: `document.querySelectorAll(".win.on .x, .win .close").forEach(e=>e.click()); window.__toDungeon && window.__toDungeon();` });
  await wait(6000);
  const run = await ev(`JSON.stringify({ 적: (window.__S?.mobs||[]).length, 아군: (window.__S?.mins||[]).length,
    층: window.__S?.floor, 체력: window.__S?.hp, at: window.__MODE?.at })`);
  say(errs.length === 0, `던전 6초 예외 0 ${errs.length ? "→ " + errs.slice(0, 2).join(" | ") : ""}`);
  say(typeof run.체력 === "number" && isFinite(run.체력) && run.체력 > 0, `체력이 살아 있는 숫자 (${run.체력})`);
  say((run.층 | 0) >= 1, `층이 1 이상 (${run.층})`);
}

/* 마지막으로 **깨끗한 저장으로 돌려놓는다** — 자가 남긴 쓰레기가 다음 자를 오염시키면 안 된다
   (game-test1 의 「QA 세이브가 실세이브를 덮었다」 사고와 같은 종류). */
await S("Runtime.evaluate", { expression: `localStorage.removeItem(${JSON.stringify(META_KEY)})` });

console.log(`\n${bad === 0 ? "PASS" : "FAIL"} · 나쁜 항목 ${bad}개 · 심은 저장 ${BROKEN.length}벌`);
await raw("Target.closeTarget", { targetId });
bws.close();
process.exit(bad === 0 ? 0 : 1);
