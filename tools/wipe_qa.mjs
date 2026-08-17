/* **초기화가 정말로 지우는가 — 그리고 «그만두기」가 정말로 안 지우는가**
   (병수님 2026-08-17 19:23 「초기화 기능 좀 만들어줘」).
     node tools/wipe_qa.mjs

   지우는 기능은 **틀리는 방향이 둘**이고 둘 다 고약하다:
     ① 안 지워진다 — 「초기화를 눌렀는데 그대로다」
     ② 안 눌렀는데 지워진다 — 되돌릴 수가 없다(제일 나쁘다)
   그래서 두 갈래를 **다 켜서** 본다. 한쪽만 보면 「아무것도 안 하는 단추」도 통과한다.

   훅으로 localStorage 를 지우고 「됐다」고 하면 안 된다 — 그건 창을 한 번도 안 지난 길이다
   ([[probe-must-walk-the-real-path]]). 그래서 이 자는 **능력치 창을 진짜로 열고**,
   「초기화」를 **진짜로 눌러** 확인 창을 띄우고, 그 안의 단추를 **진짜로 누른다.**

   넷을 본다:
     ① 그만두기 — 창은 닫히고 저장은 **한 톨도 안 바뀐다**(JSON 문자열 그대로 비교)
     ② 모두 지운다 — 저장 열쇠가 사라지고 판이 새로 열린다
     ③ 새로 열린 판이 **정말 처음**이다(Lv.1 · 금 0 · 깊이 1 · 유해 0 · 가방 0 · 트리 빈 것)
     ④ 화면 설정(성능 모드)은 **안 지워진다** — 그건 진행이 아니라 이 기기의 사정이다 */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const ev2 = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const fails = [];

/* ★ 세이브는 **페이지가 뜨기 전에** 심는다 — Runtime.evaluate 로 써 넣으면 돌던 판의
   saveMeta 가 그 위를 덮는다(dive_qa 가 겪은 그 자리). 표(seedTag)도 같이 박아
   「새 문서가 섰는지」를 표로 판정한다(옛 문서를 새 판으로 읽으면 결과가 뒤집힌다). */
let seedId = null, tag = 0;
const RICH = JSON.stringify({ gold: 182000, lv: 37, xp: 1200, deepest: 42, best: 55, runs: 9,
  relics: 12, rebirths: 3, dive: 20, up: { hp: 5, mp: 4, dmg: 6, army: 3 },
  equip: {}, bag: [{ k: "wand", tier: 3, af: [], v: 0 }], tree: { bone: 2, ghoul: 1, legion: 3 },
  quests: { gate: 1 } });
const seed = async (withSave) => {
  const t = ++tag;
  /* ★★ **씨앗은 첫 문서에만 심는다.** 새 문서마다 도는 훅이라, 그냥 두면 초기화가 부른
     새로고침 뒤에도 다시 돌아 방금 지운 자리에 세이브를 **도로 심는다.**
     그 덫에 두 번 걸렸다: 처음엔 ③ 이 거짓으로 울었고(고침 뒤 통과), **더 고약하게는
     ① 이 거짓으로 통과했다** — 「그만두기」가 지우도록 일부러 망가뜨려 보정했더니
     자가 그대로 PASS 를 냈다(지운 것을 훅이 되살려 놓아 before == after 로 보였다).
     되돌릴 수 없는 쪽을 못 보는 자는 없는 것만 못하다.
     그래서 ① 판 수를 세고(`__loads`), 씨앗은 **첫 판에서만** 쓴다. */
  const src = `sessionStorage.__loads = String((+sessionStorage.__loads || 0) + 1);
    window.__seedTag=${t}; window.__loads = +sessionStorage.__loads;
    if (window.__loads === 1) {` +
    (withSave ? `localStorage.setItem("necro.meta.v1", ${JSON.stringify(RICH)});` : "") +
    /* ④ 화면 설정은 진행이 아니다 — 초기화가 이것까지 지우면 안 된다 */
    `localStorage.setItem("necro.perf.v1", "1"); }`;
  if (seedId) await S("Page.removeScriptToEvaluateOnNewDocument", { identifier: seedId });
  seedId = (await S("Page.addScriptToEvaluateOnNewDocument", { source: src })).identifier;
  await ev2(`try { sessionStorage.clear(); localStorage.removeItem("necro.meta.v1"); } catch {}`);
  await S("Page.navigate", { url: PAGE });
  for (let i = 0; i < 120; i++) {
    /* **막(#loading)이 걷힐 때까지는 누름이 다 막에 먹힌다** — 자리는 그 아래에서 먼저 선다 */
    if (await ev2(`!!(window.__seedTag === ${t} && window.__openWin && window.META
        && (() => { const l = document.getElementById("loading");
             return !l || getComputedStyle(l).display === "none" || l.classList.contains("gone"); })())`)) return true;
    await wait(200);
  }
  fails.push(`판이 안 섰다(표 ${t}) — 24초를 기다려도 준비가 안 된다`);
  return false;
};

/** 화면의 것을 **진짜로 누른다**(가운데 좌표에 마우스 이벤트). */
const clickSel = async (sel, why) => {
  const box = await ev2(`(() => { const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null; const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;          // 안 보이는 것은 못 누른다
    return { x: Math.round(r.left + r.width / 2), y: Math.round(r.top + r.height / 2) }; })()`);
  if (!box) { fails.push(`${why}: ${sel} 를 못 찾거나 안 보인다`); return false; }
  await S("Page.bringToFront").catch(() => {});
  for (const type of ["mousePressed", "mouseReleased"])
    await S("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  await wait(350); return true;
};
const readSave = () => ev2(`localStorage.getItem("necro.meta.v1")`);
const winOn = (id) => ev2(`(() => { const w = document.getElementById(${JSON.stringify(id)});
  return !!w && getComputedStyle(w).display !== "none" && !w.classList.contains("off") && w.classList.contains("on"); })()`);

/* ── ① 그만두기 — 창은 닫히고 저장은 한 톨도 안 바뀐다 ── */
if (await seed(true)) {
  const before = await readSave();
  await ev2(`window.__openWin("stat")`); await wait(300);
  if (!await winOn("winStat")) fails.push("① 능력치 창이 안 열렸다 — 초기화 단추가 있는 자리다");
  if (!await clickSel('[data-go="wipe"]', "①")) { /* 아래에서 창 판정이 잡는다 */ }
  if (!await winOn("winWipe")) fails.push("① 「초기화」를 눌렀는데 확인 창이 안 떴다");
  /* 확인 창의 「그만두기」 — 이 창 안의 것만 고른다(다른 창에도 data-close 가 있다) */
  await clickSel('#winWipe [data-close]', "①");
  if (await winOn("winWipe")) fails.push("① 「그만두기」를 눌렀는데 창이 안 닫혔다");
  const after = await readSave();
  /* ★ **판이 새로 열렸는지부터 본다.** 초기화는 새로고침으로 끝나므로, 「그만두기」가
     새 판을 열었다면 그 자체가 「지웠다」는 뜻이다(저장 비교만으로는 훅이 되살린 값에
     속는다 — 위 씨앗 주석의 그 덫). */
  const loads = await ev2(`+sessionStorage.__loads || 0`);
  if (loads !== 1) fails.push(`① 「그만두기」인데 판이 새로 열렸다(${loads}번째) — 지우는 길로 샜다`);
  if (after !== before)
    fails.push(`① 「그만두기」인데 저장이 바뀌었다 — 되돌릴 수 없는 일에서 제일 나쁜 쪽이다`);
  if (!after) fails.push("① 「그만두기」인데 저장이 통째로 사라졌다");
}

/* ── ②③④ 모두 지운다 ── */
let after = null;
if (await seed(true)) {
  await ev2(`window.__openWin("stat")`); await wait(300);
  await clickSel('[data-go="wipe"]', "②");
  if (!await winOn("winWipe")) fails.push("② 확인 창이 안 떴다");
  /* ★★ **누르기 전에 씨앗을 걷는다.** `addScriptToEvaluateOnNewDocument` 는 **새 문서마다**
     도므로, 초기화가 부르는 `location.reload()` 뒤에도 다시 돌아 방금 지운 자리에
     세이브를 **도로 심는다.** 처음 돌렸을 때 실패 11건이 그것이었다 — 게임은 제대로
     지웠는데 자가 뒤에서 되살려 놓고 「안 지워졌다」고 운 것이다.
     화면 설정(④)만 남기고 다시 건다(그건 새 문서에서도 있어야 ④ 를 물을 수 있다). */
  if (seedId) await S("Page.removeScriptToEvaluateOnNewDocument", { identifier: seedId });
  seedId = (await S("Page.addScriptToEvaluateOnNewDocument", {
    source: `if (!localStorage.getItem("necro.perf.v1")) localStorage.setItem("necro.perf.v1", "1");` })).identifier;
  await clickSel('#winWipe [data-wipe]', "②");
  /* 판을 새로 여는 일이라 **새 문서가 설 때까지** 기다린다 — 옛 문서를 읽으면 거짓 통과다 */
  for (let i = 0; i < 120; i++) {
    if (await ev2(`!!(window.META && window.__openWin && (+sessionStorage.__loads || 0) >= 2)`)) break;
    await wait(200);
  }
  after = await ev2(`({ 저장: localStorage.getItem("necro.meta.v1"),
     화면설정: localStorage.getItem("necro.perf.v1"),
     lv: META.lv, gold: META.gold | 0, deepest: META.deepest | 0, best: META.best | 0,
     relics: META.relics | 0, rebirths: META.rebirths | 0, dive: META.dive | 0,
     가방: (META.bag || []).length, 트리: Object.keys(META.tree || {}).length,
     일지: Object.keys(META.quests || {}).length,
     up: Object.values(META.up || {}).reduce((a, b) => a + (b | 0), 0) })`);
  if (!after) fails.push("②③ 지운 뒤 판을 못 읽었다");
  else {
    /* ② 열쇠가 사라졌는가 — 새 판이 곧바로 saveMeta 를 할 수도 있으니 「없거나, 있어도 처음값」 */
    const want = { lv: 1, gold: 0, deepest: 1, best: 1, relics: 0, rebirths: 0, dive: 0, 가방: 0, 트리: 0, 일지: 0, up: 0 };
    for (const [k, v] of Object.entries(want))
      if (after[k] !== v) fails.push(`③ 초기화했는데 ${k} 가 ${after[k]} (처음값 ${v}) — 안 지워진 것이 남았다`);
    if (after.화면설정 !== "1")
      fails.push(`④ 화면 설정(성능 모드)까지 지웠다(${after.화면설정}) — 그건 진행이 아니라 이 기기의 사정이다`);
  }
}

console.log(JSON.stringify({ 지운뒤: after, 콘솔오류: errs, 실패: fails,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length || errs.length ? 1 : 0);
