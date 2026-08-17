/* **단축키가 정말로 도는가** (병수님 2026-08-17 21:06 「그리고 단축키도 있어야함」).
     node tools/hotkey_qa.mjs

   ★ 단축키는 **적어 두기는 쉽고, 안 도는 줄은 아무도 모르는** 자리다. 실제로 이 리포에는
     벨트 칸에 `1`~`8` 이 **적혀만** 있고 아무 키도 안 먹는 채로 오래 서 있었다
     (`belt()` 의 `<span class="k">`). 적어 놓고 안 먹으면 장식이 아니라 **거짓말**이다.

   그래서 이 자는 **진짜로 키를 누른다**(`Input.dispatchKeyEvent` — 페이지가 받는 것과
   같은 이벤트). 그리고 넷을 본다:
     ① C·I·T 로 창이 **열린다**(그리고 같은 키를 다시 누르면 닫힌다 — 토글)
     ② `Esc` 로 닫힌다
     ③ 숫자 `1` 이 **벨트 첫 칸을 실제로 쓴다**(재사용이 돌기 시작한다 = 눌린 것이다)
     ④ **⌘/Ctrl 이 눌린 키는 안 뺏는다** — ⌘R(새로고침)·⌘I(검사)를 게임이 먹으면 안 된다
   ★ 한글 자판에서도 도는지가 걸리는데, 코드가 `e.key`(→「ㅊ」) 가 아니라 `e.code`(→`KeyC`)
     를 보므로 자판과 무관하다. 그 약속이 깨지면 ① 이 운다. */
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const fails = [];

for (let i = 0; i < 120; i++) {
  if (await ev2(`!!(window.__openWin && window.META && (() => { const l = document.getElementById("loading");
      return !l || getComputedStyle(l).display === "none" || l.classList.contains("gone"); })())`)) break;
  await wait(200);
}

/** **진짜 키 누름.** `code` 를 준다 — 게임이 `e.code` 를 보므로 자판과 무관하다.
 *  ★ `Page.bringToFront` 를 먼저 한다: 자 여럿이 같이 돌면 뒤쪽 탭은 입력을 못 받는다
 *    (dive_qa 가 겪은 그 자리 — 홀로 돌면 통과하고 섞이면 진다). */
const press = async (code, key, mods = 0) => {
  await S("Page.bringToFront").catch(() => {});
  for (const type of ["keyDown", "keyUp"])
    await S("Input.dispatchKeyEvent", { type, code, key, windowsVirtualKeyCode: key.toUpperCase().charCodeAt(0), modifiers: mods });
  await wait(320);
};
const winOn = (id) => ev2(`(() => { const w = document.getElementById(${JSON.stringify(id)});
  return !!w && w.classList.contains("on") && getComputedStyle(w).display !== "none"; })()`);
const anyWin = () => ev2(`[...document.querySelectorAll(".win.on")].map(w => w.id).join(",")`);
const closeAll = async () => { await ev2(`window.__closeAll && window.__closeAll()`); await wait(200); };

/* ── ① C·I·T 로 열린다 · 다시 누르면 닫힌다 ── */
for (const [code, key, want, 이름] of [
  ["KeyC", "c", "winStat", "능력치"],
  ["KeyI", "i", "winBag",  "가방"],
  ["KeyT", "t", "winTree", "스킬"],
]) {
  await closeAll();
  await press(code, key);
  if (!await winOn(want)) fails.push(`① ${code} 를 눌렀는데 ${이름}(${want})가 안 열렸다 — 열린 것: [${await anyWin()}]`);
  await press(code, key);                       // 토글 — 같은 키가 닫기도 해야 손이 안 헤맨다
  if (await winOn(want)) fails.push(`① ${code} 를 다시 눌렀는데 ${이름}가 안 닫혔다`);
}

/* ── ② Esc 로 닫힌다 ── */
await closeAll();
await press("KeyC", "c");
await press("Escape", "Escape");
if (await anyWin()) fails.push(`② Esc 를 눌렀는데 창이 남아 있다 [${await anyWin()}]`);

/* ── ③ 숫자 1 이 벨트 첫 칸을 «실제로 쓴다» ──
   ★ 「눌렸다」를 무엇으로 아는가: 그 스킬의 **재사용이 돌기 시작하면** 쓴 것이다.
     화면의 칸 색만 보면 마우스로도 같은 그림이라 「키가 먹었다」를 못 가른다.
     ★ 던전에서만 쓸 수 있으므로 내려간다(마을에서 눌러 놓고 「안 먹는다」 하면 오진이다). */
await closeAll();
await ev2(`window.toDungeon && window.toDungeon()`);
await wait(900);
/* ★★ **자동소환이 대신 눌러 주고 있었다.** 처음엔 첫 칸(raise)의 재사용이 움직이면
   「키가 먹었다」로 봤는데, `auto()` 가 0.35초마다 그 스킬을 **스스로** 쓴다 —
   숫자키를 아예 끊어 놓고 보정해도 이 자는 그대로 **통과**했다(재사용이 저 혼자 돌아서).
   내 손이 한 일과 판이 저절로 한 일을 못 가르면 그건 자가 아니다.
   → **자동이 안 건드리는 칸**을 먼저 찾는다: 1.6초 동안 지켜보며 재사용이 0 에
     머무는 칸을 고르고, 그 칸의 숫자만 누른다. */
const READ_CD = `(async()=>{const C=await import("/js/core.js");
  return JSON.stringify(C.SKILLS.map(k => ({ id:k.id, cd:(S.cd && S.cd[k.id]) || 0 })));})()`;
const c0 = JSON.parse(await ev2(READ_CD, true) || "[]");
await wait(1600);
const c1 = JSON.parse(await ev2(READ_CD, true) || "[]");
const idle = c1.findIndex((k, i) => k.cd === 0 && (c0[i] || {}).cd === 0);
if (idle < 0 || idle >= 9) {
  fails.push(`③ 자동이 안 쓰는 칸을 못 찾았다 — 이 자로는 「내 손이 눌렀는지」를 못 가른다`);
} else {
  const B = JSON.parse(await ev2(READ_CD, true) || "[]")[idle];
  await press("Digit" + (idle + 1), String(idle + 1));
  const A = JSON.parse(await ev2(READ_CD, true) || "[]")[idle];
  if (!(A && B && A.cd > B.cd))
    fails.push(`③ 숫자 ${idle + 1} 을 눌렀는데 그 칸(${B && B.id})이 안 돌았다 — 재사용 ${B && B.cd} → ${A && A.cd}`);
  var A_ = A, B_ = B;                       // 아래 보고 줄이 읽는다
}

/* ── ④ ⌘/Ctrl 이 눌린 키는 안 뺏는다 ── */
await closeAll();
await press("KeyI", "i", 2 /* Ctrl */);
if (await anyWin()) fails.push(`④ Ctrl+I 를 게임이 먹었다 [${await anyWin()}] — 브라우저 몫은 브라우저에게`);
await press("KeyC", "c", 4 /* Meta(⌘) */);
if (await anyWin()) fails.push(`④ ⌘C 를 게임이 먹었다 [${await anyWin()}]`);

console.log(JSON.stringify({ 고른칸: typeof B_ !== "undefined" && B_ && B_.id, 재사용: typeof A_ !== "undefined" && A_ ? [B_.cd, A_.cd] : null, 콘솔오류: errs, 실패: fails,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length || errs.length ? 1 : 0);
