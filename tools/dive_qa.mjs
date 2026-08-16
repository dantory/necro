/* **건너뛰기가 사람이 지나는 길에서 도는가** (병수님 2026-08-16 「어느정도 성장한 다음부터
   스테이지 스킵」).  node tools/dive_qa.mjs

   훅으로 `META.dive = 30` 을 넣고 「됐다」고 하면 안 된다 — 그건 **창을 한 번도 안 지난** 길이다
   ([[probe-must-walk-the-real-path]]). 그래서 이 자는 **입구를 진짜로 누르고**, 창의 칸을
   **진짜로 눌러** 고르고, 「내려가기」로 들어가서 **판이 그 층에서 섰는지**를 본다.
   넷을 본다:
     ① 얕을 때(깊이 < 15)는 창이 **안 뜨고** 바로 내려간다 — 초반에 한 번 더 누르게 하면 안 된다
     ② 깊어지면 창이 뜨고, 고를 수 있는 위 끝이 **최고 깊이 − 10** 의 5배수다
     ③ 칸을 누르면 그 층에서 판이 선다(S.floor)
     ④ 고른 값이 **저장**돼 다음에 열어도 그 칸이 켜져 있다 */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const fails = [];

/** 마을 입구를 **진짜로** 누른다 — 그 자리는 판을 다시 그릴 때마다 움직이므로 hits 에서 뽑는다. */
const tapGate = async () => {
  const at = await ev2(`(() => { const h = (window.__townHits ? window.__townHits() : []).find(x => x.id === "gate");
    if (!h) return null;
    const cv = document.querySelector("canvas"), r = cv.getBoundingClientRect();
    /* ★ 자리의 모양은 {x,y,w,h}(town.js hits.push) — 처음에 x0/x1 로 짐작해 NaN 을 보냈고
       CDP 가 「double value expected」로 죽었다. 자는 **있는 것을 읽어야** 한다. */
    return { x: Math.round(r.left + h.x + h.w / 2), y: Math.round(r.top + h.y + h.h / 2) }; })()`);
  if (!at) { fails.push("마을에서 입구(gate)를 못 찾았다 — 자가 지나는 길이 아니다"); return false; }
  /* ★★ **앞으로 끌어와야 입력이 닿는다.** 홀로 돌 땐 통과하는데 자 열다섯을 붙이면
     입구를 눌러도 아무 일이 없었다 — 다른 자의 탭이 앞에 있으면 뒤쪽 탭은
     `Input.dispatchMouseEvent` 를 못 받는다. 사람은 늘 보이는 화면을 누른다. */
  await S("Page.bringToFront").catch(() => {});
  for (const type of ["mousePressed", "mouseReleased"])
    await S("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", clickCount: 1 });
  await wait(400); return true;
};
/* ★★ **기다리지 말고 「섰는지」를 본다.** 처음엔 새로고침 뒤 4.2초를 세었는데, 홀로 돌 땐
   통과하고 **자 열다섯을 붙여 돌리면 실패**했다 — 앞 자가 브라우저를 쓰는 동안 마을이
   4.2초 안에 안 서서 입구 자리가 비어 있었던 것이다. 사람은 마을이 뜰 때까지 기다렸다가
   누르므로, 자도 그래야 한다([[probe-must-walk-the-real-path]]). */
/* ★★★ **새로고침을 「보냈다」와 「새 판이 섰다」는 다르다.** 처음엔 reload 를 보내자마자
   마을을 찾았는데, **옛 문서가 아직 서 있어** 그걸 새 판으로 읽었다 — 그래서 돌릴 때마다
   실패 항목이 달라졌다(①이 나기도 ②가 나기도). 그래서 심을 때 **표(seedTag)를 같이 박고**,
   그 표가 보일 때까지는 마을로 안 친다. 표는 새 문서에서만 찍힌다. */
const untilTown = async (tag, ms = 20000) => {
  for (let i = 0; i < ms / 200; i++) {
    /* ★ **뼈 맞추는 막(#loading)이 걷힐 때까지는 마을이 아니다.** 자리(hits)는 그 아래에서
       먼저 서므로 「입구가 있다」만 보고 누르면 **막이 눌림을 다 먹는다**
       (elementFromPoint 가 DIV#loading 이었다). 사람은 막이 걷힌 뒤에 누른다. */
    const ok = await ev2(`!!(window.__seedTag === ${tag} && window.__townHits
                            && window.__townHits().some(h => h.id === "gate")
                            && (window.__MODE || {}).at === "town"
                            && (() => { const l = document.getElementById("loading");
                                 return !l || getComputedStyle(l).display === "none" || l.classList.contains("gone"); })())`);
    if (ok) return true;
    await wait(200);
  }
  fails.push(`마을이 안 섰다(표 ${tag}) — 20초를 기다려도 입구가 없다`);
  return false;
};
/* ★★ **세이브는 페이지가 뜨기 전에 심는다.** `Runtime.evaluate` 로 써 넣으면, 새로고침이
   끝나기 전에 **돌던 판의 `saveMeta()`**(battle.js 의 층·처치마다)가 그 위를 덮어썼다 —
   심은 깊이 42 가 1 로 돌아가 창이 안 뜨는 것처럼 보였다. 새 문서에서 게임 스크립트보다
   먼저 도는 자리에 심으면 덮을 사람이 없다. */
let seedId = null, tag = 0;
const onNewDoc = async (source) => {
  if (seedId) await S("Page.removeScriptToEvaluateOnNewDocument", { identifier: seedId });
  seedId = (await S("Page.addScriptToEvaluateOnNewDocument", { source })).identifier;
};
const seed = async (deepest) => {
  const t = ++tag;
  await onNewDoc(`window.__seedTag=${t};localStorage.setItem("necro.meta.v1", JSON.stringify({gold:9000,lv:20,deepest:${deepest},best:${deepest},runs:3,
    up:{hp:3,mp:4,dmg:2,army:3},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3,golem:1}}))`);
  await S("Page.reload", { ignoreCache: true }); await untilTown(t);
};

/* ── ① 얕으면 창이 안 뜬다 ── */
await seed(9);
await tapGate();
const shallow = await ev2(`({창:!document.getElementById("winDive").classList.contains("off") && getComputedStyle(document.getElementById("winDive")).display !== "none",
                             어디:(window.__MODE||{}).at, 층:S.floor})`);
if (shallow.창) fails.push(`① 깊이 9 인데 창이 떴다 — 초반에 한 번 더 누르게 하면 안 된다`);
if (shallow.어디 !== "dungeon") fails.push(`① 깊이 9 에서 입구를 눌렀는데 안 내려갔다(${shallow.어디})`);

/* ── ②③④ 깊으면 창 → 칸 → 내려가기 ── */
await seed(42);                       // diveMax = floor((42-10)/5)*5 = 30
await tapGate();
const opened = await ev2(`(() => { const w = document.getElementById("winDive");
  const on = getComputedStyle(w).display !== "none";
  const opts = [...w.querySelectorAll("[data-dive]")].map(b => +b.getAttribute("data-dive"));
  return { 열림: on, 칸: opts, 최대: Math.max(...opts), 어디: (window.__MODE||{}).at }; })()`);
if (!opened.열림) fails.push("② 깊이 42 인데 창이 안 떴다");
if (opened.어디 === "dungeon") fails.push("② 창이 뜨기 전에 이미 내려가 버렸다");
if (opened.최대 !== 30) fails.push(`② 고를 수 있는 위 끝이 ${opened.최대} — 최고 42 면 30 이어야 한다(−10 의 5배수)`);

/* 칸 30 을 **진짜로 누르고** 내려간다 */
const clickSel = async (sel) => {
  const box = await ev2(`(() => { const el = document.querySelector(${JSON.stringify(sel)});
    if (!el) return null; const r = el.getBoundingClientRect();
    return { x: Math.round(r.left + r.width/2), y: Math.round(r.top + r.height/2) }; })()`);
  if (!box) { fails.push(`③ ${sel} 를 못 찾았다`); return false; }
  await S("Page.bringToFront").catch(() => {});
  for (const type of ["mousePressed", "mouseReleased"])
    await S("Input.dispatchMouseEvent", { type, x: box.x, y: box.y, button: "left", clickCount: 1 });
  await wait(300); return true;
};
await clickSel('[data-dive="30"]');
const picked = await ev2(`({고름: META.dive, 켜진칸: (document.querySelector(".diveOpt.on")||{}).textContent})`);
if (picked.고름 !== 30) fails.push(`③ 칸을 눌렀는데 고른 값이 ${picked.고름}`);
await clickSel('[data-dive-go]');
await wait(900);
const ran = await ev2(`({어디:(window.__MODE||{}).at, 층:S.floor, 최고:S.deepest})`);
if (ran.어디 !== "dungeon") fails.push(`③ 「내려가기」를 눌렀는데 안 내려갔다(${ran.어디})`);
if (ran.층 !== 30) fails.push(`③ 30층을 골랐는데 ${ran.층}층에서 섰다`);

/* ④ 저장돼 있나 — 새로 켜서 다시 연다.
   ★ 여기서는 **세이브를 심지 않는다**(심으면 고른 값을 내 손으로 지우는 꼴이다) — 표만 박는다. */
{ const t = ++tag;
  await onNewDoc(`window.__seedTag=${t}`);
  await S("Page.reload", { ignoreCache: true }); await untilTown(t); }
await tapGate();
const again = await ev2(`({고름: META.dive, 저장: (JSON.parse(localStorage.getItem("necro.meta.v1")||"{}").dive),
  켜진: (document.querySelector(".diveOpt.on")||{}).getAttribute && +document.querySelector(".diveOpt.on").getAttribute("data-dive")})`);
if (again.고름 !== 30 || again.켜진 !== 30) fails.push(`④ 다시 켜니 고른 값이 ${again.고름}/${again.켜진} — 기억을 못 한다`);

console.log(JSON.stringify({ 얕을때: shallow, 창: opened, 고름: picked, 판: ran, 다시켬: again,
  콘솔오류: errs, 실패: fails, 판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length ? 1 : 0);
