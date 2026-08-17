/* **죽고 마을로 왔을 때 구슬이 무엇을 말하는가**
   (병수님 2026-08-17 19:59 「던전에서 사망하고 마을로 돌아왔을때, 체력이 0 임」).
     node tools/townhp_qa.mjs

   ★ **훅으로 `S.hp = 0` 을 넣고 toTown() 을 부르면 안 된다** — 그건 사람이 지나는 길이
     아니다([[probe-must-walk-the-real-path]]). 실제로 **깊은 층에 내려가 맞아 죽을 때까지
     둔다.** 죽음은 `endRun` 이 굳히고, 그 프레임에 main 의 고리가 마을로 데려간다 —
     그 길 전체가 이 자가 재는 것이다.

   ★ 그리고 **구슬만 보지 않는다.** `S.hp` 는 판의 값이고 사람이 보는 것은 구슬에 적힌
     글자다. 둘 중 하나만 맞으면 「고쳤다」가 아니다 — 셈은 맞는데 화면이 옛 숫자를
     들고 있던 일이 이 리포에 여러 번 있었다(hud 가 캐시를 물고 있던 자리).

   넷을 본다:
     ① 정말로 죽었나 — 그 판에서 안 죽으면 이 자는 아무것도 안 잰 것이다(헛통과 금지)
     ② 죽은 뒤 **마을**에 서 있나
     ③ 마을의 체력·마나가 **가득**인가 (S.hp == S.hpMax · S.mp == S.mpMax)
     ④ **구슬에 적힌 글자**도 가득인가 (hpNum 의 앞 수 == 뒤 수)
   ★ 물러남(나가기)도 같은 자리다 — 반쯤 깎인 채 마을에 서 있을 까닭이 없다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const FLOOR = +(process.argv[2] || 40);          // 얕으면 안 죽어서 ① 이 운다
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const fails = [];

/* 갓 시작한 몸으로 깊은 층에 세운다 — 그래야 오래 안 기다리고 죽는다(자가 빨라진다).
   ★ 세이브는 **뜨기 전에** 심는다(돌던 판의 saveMeta 가 덮는 자리). */
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `localStorage.setItem("necro.meta.v1", JSON.stringify({ gold: 0, lv: 1, deepest: 1,
     up: { hp: 0, mp: 0, dmg: 0, army: 0 }, equip: {}, bag: [], tree: {} }))` });
await S("Page.reload", { ignoreCache: true });
for (let i = 0; i < 120; i++) {
  if (await ev2(`!!(window.toDungeon && window.META && (() => { const l = document.getElementById("loading");
      return !l || getComputedStyle(l).display === "none" || l.classList.contains("gone"); })())`)) break;
  await wait(200);
}

/** 구슬에 **적힌 글자**를 읽는다 — 「3.5k /3.8k」처럼 줄여 적으므로 두 토막을 그대로 견준다. */
const READ = `(() => {
  const n = document.getElementById("hpNum"), m = document.getElementById("mpNum");
  const two = (el) => el ? [ (el.querySelector("b") || {}).textContent || "",
                             ((el.querySelector("i") || {}).textContent || "").replace("/", "") ] : ["", ""];
  return { 어디: (window.__MODE || {}).at, 죽음: !!S.dead,
           hp: Math.round(S.hp), hpMax: Math.round(S.hpMax),
           mp: Math.round(S.mp), mpMax: Math.round(S.mpMax),
           구슬체력: two(n), 구슬마나: two(m) }; })()`;

/* ── 죽을 때까지 둔다 ── */
await ev2(`window.toDungeon()`);
await wait(600);
await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
let died = false;
for (let i = 0; i < 150; i++) {              // 최대 30초
  if (await ev2(`!!(window.__MODE && window.__MODE.at === "town")`)) { died = true; break; }
  await wait(200);
}
await wait(500);                              // hud 는 0.1초마다 도므로 한 박자 준다
const dead = await ev2(READ);

if (!died) fails.push(`① ${FLOOR}층에서 30초를 둬도 안 죽었다 — 이 자는 아무것도 못 쟀다(층을 더 깊게)`);
else {
  if (dead.어디 !== "town") fails.push(`② 죽었는데 마을이 아니다(${dead.어디})`);
  if (dead.hp !== dead.hpMax) fails.push(`③ 마을인데 체력이 ${dead.hp}/${dead.hpMax} — 마을은 쉬는 곳이다`);
  if (dead.mp !== dead.mpMax) fails.push(`③ 마을인데 마나가 ${dead.mp}/${dead.mpMax}`);
  /* ④ 셈이 맞아도 **구슬이 옛 숫자를 들고** 있을 수 있다(hud 는 따로 돈다) */
  if (dead.구슬체력[0] !== dead.구슬체력[1])
    fails.push(`④ 구슬에 적힌 체력이 「${dead.구슬체력[0]} / ${dead.구슬체력[1]}」 — 셈은 찼는데 화면이 안 따라왔다`);
  if (dead.구슬마나[0] !== dead.구슬마나[1])
    fails.push(`④ 구슬에 적힌 마나가 「${dead.구슬마나[0]} / ${dead.구슬마나[1]}」`);
}

/* ── 물러남(나가기)도 같은 자리인가 ── 한 대라도 맞은 뒤에 물러난다(가득이면 안 물었다). */
let left = null;
if (died) {
  await ev2(`window.toDungeon()`);
  await wait(600);
  await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(${FLOOR});return 1;})()`, true);
  let hurt = false;
  for (let i = 0; i < 60; i++) {             // 맞을 때까지 (죽기 전에 나간다)
    const st = await ev2(`({hp:S.hp, max:S.hpMax, dead:!!S.dead, at:(window.__MODE||{}).at})`);
    if (st && st.at === "town") break;        // 그새 죽었으면 이 갈래는 건너뛴다
    if (st && st.hp < st.max) { hurt = true; break; }
    await wait(200);
  }
  if (hurt) {
    await ev2(`(async()=>{const B=await import("/js/battle.js");B.retreat();return 1;})()`, true);
    await wait(900);
    left = await ev2(READ);
    if (left.어디 !== "town") fails.push(`② 물러났는데 마을이 아니다(${left.어디})`);
    else if (left.hp !== left.hpMax) fails.push(`③ 물러나 마을에 왔는데 체력이 ${left.hp}/${left.hpMax}`);
  }
}

console.log(JSON.stringify({ 층: FLOOR, 죽은뒤: dead, 물러난뒤: left, 콘솔오류: errs, 실패: fails,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length || errs.length ? 1 : 0);
