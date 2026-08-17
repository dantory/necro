/* **옆 패널이 정말로 없어졌는가 — 그리고 그 안에 살던 것들이 제자리로 돌아왔는가**
   (병수님 2026-08-17 23:16 「좌우 메뉴 없애라니까,, 필요없음」).
     node tools/rail_qa.mjs

   ★★ 이 자의 **묻는 말이 오늘만 세 번 바뀌었다.** 적어 둔다 — 자가 낡은 규칙을 지키면
     옳게 고친 것을 「틀렸다」고 울고, 그러면 사람이 자를 믿지 않게 된다:
       ① (08-16) 패널이 무대를 **파고들면 틀림** — 무대가 폭을 먼저 갖던 때
       ② (21:26)  전체화면 위에 **겹쳐도 됨** — 「플로팅」으로 갔을 때
       ③ (23:16)  **아예 없어야 함** — 지금
     ①②는 내가 병수님 말을 반만 받아 만든 자리다(「없애」에 붙은 「아니면 플로팅」을 골랐다).

   ★ 없애기만 하면 되는 게 아니다 — **그 안에 살던 것들의 갈 곳**이 맞아야 한다.
     오늘 낮에 가방창의 「낀 것」만 감췄다가 **인물이 통째로 사라진** 적이 있다.
   넷을 본다:
     ① `#sideL`·`#sideR` 이 **문서에 아예 없다**(감춘 게 아니라 없앤 것)
     ② 무대가 **전체화면**이고, 위 띠·아래 판도 화면 폭이다
     ③ 일지(로그)·나가기·환생이 **body 직속**으로 돌아왔고 화면 안에 있다
     ④ 로그가 **보인다**(창이 떠 있을 때는 일부러 감추므로 그때는 안 묻는다) */
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
const ev2 = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const wait = (ms) => new Promise(r => setTimeout(r, ms));

const READ = `(() => { const R = el => { if (!el) return null; const r = el.getBoundingClientRect();
    return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const par = id => { const el = document.getElementById(id); return el ? (el.parentElement.tagName === "BODY" ? "BODY" : (el.parentElement.id || el.parentElement.tagName)) : null; };
  return { 뷰: [innerWidth, innerHeight],
    옆패널있나: !!(document.getElementById("sideL") || document.getElementById("sideR") || document.querySelector(".rail")),
    무대: R(document.getElementById("stage")),
    위띠: R(document.getElementById("top")), 아래판: R(document.getElementById("panel")),
    메뉴: R(document.getElementById("hudMenu")),
    로그: R(document.getElementById("log")), 로그보임: getComputedStyle(document.getElementById("log")).display,
    창열림: document.body.classList.contains("winopen"),
    부모: { 로그: par("log"), 나가기: par("hLeave"), 환생: par("hReborn") } }; })()`;

for (let i = 0; i < 100; i++) {
  if (await ev2(`!!(window.__MODE && (() => { const l = document.getElementById("loading");
      return !l || getComputedStyle(l).display === "none" || l.classList.contains("gone"); })())`)) break;
  await wait(200);
}
const at = async (w, h) => { await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await wait(700); return await ev2(READ); };

const fails = [];
/* 병수님 폭을 **반드시** 넣는다(1512) — 넉넉한 데서만 재면 못 보는 것이 있다. */
for (const [w, h] of [[1600, 900], [1512, 863], [1200, 800]]) {
  const o = await at(w, h);
  const t = `${w}×${h}`;
  if (o.옆패널있나) fails.push(`① ${t}: 옆 패널이 아직 문서에 있다 — 「없애」는 감추기가 아니다`);
  if (Math.abs(o.무대.w - o.뷰[0]) > 1 || o.무대.l !== 0)
    fails.push(`② ${t}: 무대가 전체화면이 아니다(${o.무대.w}/${o.뷰[0]} · 왼쪽 ${o.무대.l})`);
  if (o.위띠.l !== 0 || Math.abs(o.위띠.w - o.뷰[0]) > 1)
    fails.push(`② ${t}: 위 띠가 화면 폭이 아니다(${o.위띠.l} · ${o.위띠.w}/${o.뷰[0]})`);
  if (o.아래판.l !== 0 || Math.abs(o.아래판.w - o.뷰[0]) > 1)
    fails.push(`② ${t}: 아래 판이 화면 폭이 아니다(${o.아래판.l} · ${o.아래판.w}/${o.뷰[0]})`);
  for (const k of ["로그", "나가기", "환생"])
    if (o.부모[k] !== "BODY") fails.push(`③ ${t}: ${k}가 제자리로 안 돌아왔다(부모 ${o.부모[k]})`);
  if (o.로그.l < -1 || o.로그.r > o.뷰[0] + 1)
    fails.push(`③ ${t}: 로그가 화면 밖으로 나갔다(${o.로그.l}~${o.로그.r}/${o.뷰[0]})`);
  /* ④ 창이 떠 있을 때는 로그를 **일부러** 감춘다(2026-08-12) — 그때는 안 묻는다. */
  if (o.로그보임 === "none" && !o.창열림) fails.push(`④ ${t}: 로그가 사라졌다`);
}

console.log(JSON.stringify({ 콘솔오류: errs, 실패: fails,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length ? 1 : 0);
