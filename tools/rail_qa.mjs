/* **옆 패널이 제대로 서는가** (병수님 2026-08-16 18:28 「PC UI 개판인데」).
     node tools/rail_qa.mjs

   그날 사진에서 걸린 것이 여섯이었고, 넷은 **자가 있었으면 안 났을 것**이다:
     · 체력·마나 숫자(3.6M)가 **전장 위에** 얹혔다 — 판이 비켜야 할 높이를 고정값으로
       박아 둔 탓이다(좁은 화면 기준 124 를 넓은 화면 206 짜리 판에 그대로 썼다)
     · 패널이 **172px** 로 눌려 한글이 낱말 가운데서 꺾였다 — 무대가 폭을 먼저 먹었다
     · 패널·무대·위 띠가 **각각 제 식으로** 세로를 셈해 8px 씩 어긋났다
     · 단추가 `position:absolute` 인 채 패널에 들어가 flex 를 벗어났다

   그래서 이 자는 **좌표를 직접 잰다**(보기 좋은지가 아니라 겹치는지·어긋나는지):
     ① 넓은 창 — 패널 둘이 뜨고, 무대 **밖**에 서고, 무대와 위아래가 **딱 맞는다**
     ② 로그·단추 넷이 **패널 안**에 들어가 있고 화면 밖으로 안 나간다
     ③ 구슬 위 숫자가 **무대를 안 먹는다**(사진의 그 숫자)
     ④ 좁은 창 — 패널이 통째로 안 뜨고 로그·단추가 **원래 자리로 돌아온다**
        (안 돌아오면 로그가 패널 안에 갇혀 화면에서 통째로 사라진다)
     ⑤ 넓 → 좁 → 넓을 오가도 같다(옮기기가 한쪽으로만 되면 창을 줄였다 늘린 사람이 잃는다) */
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

/** 한 폭에서 재는 것 전부. **DOM 부모까지 같이 본다** — 자리만 보면 「옮겨졌는지」를 못 본다. */
const READ = `(() => { const R = el => { const r = el.getBoundingClientRect();
    return { t: Math.round(r.top), b: Math.round(r.bottom), l: Math.round(r.left), r: Math.round(r.right), w: Math.round(r.width), h: Math.round(r.height) }; };
  const par = id => { const el = document.getElementById(id); return el ? (el.parentElement.id || "BODY") : null; };
  return { 뷰: [innerWidth, innerHeight],
    패널: getComputedStyle(document.getElementById("sideL")).display,
    무대: R(document.getElementById("stage")),
    왼: R(document.getElementById("sideL")), 오: R(document.getElementById("sideR")),
    위띠: R(document.getElementById("top")), 아래판: R(document.getElementById("panel")),
    로그: R(document.getElementById("log")), 로그보임: getComputedStyle(document.getElementById("log")).display,
    /* ★ 창이 열려 있으면 **좁은 창에서는 로그를 일부러 감춘다**(2026-08-12: 「전멸」 한 줄이
       정산창보다 먼저 눈에 들어왔다). 그 상태를 「사라졌다」로 읽으면 자가 거짓 실패를 낸다 —
       실제로 처음 돌렸을 때 마침 오프라인 창이 떠 있어 ④ 가 틀렸다고 했다. */
    창열림: document.body.classList.contains("winopen"),
    부모: { 로그: par("log"), 나가기: par("hLeave"), 환생: par("hReborn"), 편성: par("hDoctrine"), 운용: par("hTactic") },
    숫자: [...document.querySelectorAll(".orb .num")].map(R) }; })()`;

/* **뼈 맞추는 막이 걷힐 때까지는 잰 값이 다 거짓이다** — 막 아래에서 자리가 먼저 선다. */
for (let i = 0; i < 100; i++) {
  if (await ev2(`(() => { const l = document.getElementById("loading");
      return !!(window.__MODE && (!l || getComputedStyle(l).display === "none" || l.classList.contains("gone"))); })()`)) break;
  await wait(200);
}
const at = async (w, h) => { await S("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: false });
  await wait(800); return await ev2(READ); };

const fails = [];
const wide = await at(1600, 900);
/* ★ **1512 를 반드시 잰다** — 병수님 화면이 그 폭이고, 「패널이 172px 로 눌린」 자리가
   바로 거기다. 1600 만 재면 여유가 480px 이라 패널이 눌려도 안 걸린다(실제로 눈금을
   되돌려 보니 1600 에서는 통과하고 1512 에서만 틀렸다 — 넉넉한 데서만 재면 못 본다). */
const tight = await at(1512, 863);
const narrow = await at(1200, 800);
const wide2 = await at(1600, 900);       // ⑤ 오가도 같은가

/* ── ① 넓은 창: 패널이 서고 무대 밖에 있고 위아래가 맞는가 ── */
for (const [nm, o] of [["처음", wide], ["병수님 폭 1512", tight], ["오간 뒤", wide2]]) {
  if (o.패널 !== "flex") { fails.push(`① 넓은 창(${nm})인데 패널이 안 뜬다(display:${o.패널})`); continue; }
  /* ★★ **묻는 말을 뒤집었다**(2026-08-17 21:26 「플로팅 형태로 전체화면에 겹쳐서」).
     여태는 「패널이 무대를 **파고들면** 틀림」이었다 — 무대가 폭을 먼저 갖던 때의 규칙이다.
     이제 무대는 전체화면이고 패널은 **그 위에 뜨는 것**이라 겹치는 게 맞다.
     대신 물어야 할 것이 바뀐다: **화면 밖으로 안 나가는가**(옛 식을 그대로 뒀더니
     left:-252 로 밀려나 있었다) · **가운데를 안 먹는가**(양쪽 합이 화면의 절반 미만). */
  if (o.왼.l < -1 || o.오.r > o.뷰[0] + 1)
    fails.push(`① 패널이 화면 밖으로 나갔다(왼 ${o.왼.l} · 오른끝 ${o.오.r}/${o.뷰[0]})`);
  if (o.왼.w + o.오.w > o.뷰[0] * 0.5)
    fails.push(`① 패널 둘이 화면의 ${Math.round((o.왼.w + o.오.w) / o.뷰[0] * 100)}% 를 먹는다 — 가운데가 좁아진다`);
  if (Math.abs(o.무대.w - o.뷰[0]) > 1 || o.무대.l !== 0)
    fails.push(`① 무대가 전체화면이 아니다(${o.무대.w}/${o.뷰[0]} · 왼쪽 ${o.무대.l})`);
  /* ★ 세로가 **한 톨이라도** 어긋나면 셋이 「다른 화면 세 개」로 읽힌다 — 실제로
     식을 두 파일에 갈라 적어 8px 어긋난 적이 있다. 1px 까지 본다(반올림 몫). */
  for (const [k, v] of [["위", Math.abs(o.왼.t - o.무대.t)], ["아래", Math.abs(o.왼.b - o.무대.b)]])
    if (v > 1) fails.push(`① 왼 패널 ${k}가 무대와 ${v}px 어긋난다`);
  for (const [k, v] of [["위", Math.abs(o.오.t - o.무대.t)], ["아래", Math.abs(o.오.b - o.무대.b)]])
    if (v > 1) fails.push(`① 오른 패널 ${k}가 무대와 ${v}px 어긋난다`);
  /* 위 띠·아래 판은 이제 무대와 같은 폭(전체화면)이다 — 왼쪽이 0 이면 맞다. */
  if (o.위띠.l !== 0) fails.push(`① 위 띠가 화면 왼쪽에서 ${o.위띠.l}px 떨어져 있다`);
  if (o.아래판.l !== 0) fails.push(`① 아래 판이 화면 왼쪽에서 ${o.아래판.l}px 떨어져 있다`);

  /* ── ② 로그·단추가 패널 «안»에 담겼는가 ── */
  /* ★ 편성·운용은 **아래 판 메뉴로 옮겼다**(2026-08-17 21:1x 「디아블로는 하단에 메뉴가
     있다고」). 나가기·환생만 패널 발치에 남는다 — 그건 메뉴가 아니라 **행동**이라서다.
     자에 적힌 자리를 같이 안 옮기면, 옳게 옮긴 것을 자가 「틀렸다」고 운다. */
  const want = { 로그: "logSlot", 나가기: "footR", 환생: "footR", 편성: "hudMenu", 운용: "hudMenu" };
  for (const k of Object.keys(want))
    if (o.부모[k] !== want[k]) fails.push(`② ${k}가 패널 밖에 있다(부모 ${o.부모[k]}, ${want[k]} 여야 한다)`);
  if (o.로그보임 === "none") fails.push("② 넓은 창에서 로그가 안 보인다");   // 넓은 창에서는 창이 떠 있어도 보여야 한다(패널 안이라 안 겹친다)
  if (o.로그.l < o.왼.l - 1 || o.로그.r > o.왼.r + 1 || o.로그.b > o.왼.b + 1)
    fails.push(`② 로그가 왼 패널을 넘친다(로그 ${o.로그.l}~${o.로그.r}/${o.로그.b} · 패널 ${o.왼.l}~${o.왼.r}/${o.왼.b})`);

  /* ── ③ 구슬 위 숫자가 무대를 먹는가 ── (병수님 사진의 그 숫자) */
  for (const n of o.숫자) if (n.t < o.무대.b)
    fails.push(`③ 체력·마나 숫자가 전장 위로 ${o.무대.b - n.t}px 올라탔다 — 판이 비켜야 할 높이(--panelH)가 모자라다`);
}

/* ── ④ 좁은 창: 통째로 안 뜨고 원래 자리로 ── */
if (narrow.패널 !== "none") fails.push(`④ 좁은 창(1200)인데 패널이 떴다 — 여백이 없는 폭에서는 침범이다`);
/* ★ 편성·운용은 폭과 상관없이 **늘 아래 판 메뉴**에 있다(옆 패널이 안 뜨는 폭에서도
   아래 판은 있다). 되돌아와야 하는 것은 로그·나가기·환생 셋이다. */
for (const k of ["로그", "나가기", "환생"])
  if (narrow.부모[k] !== "BODY") fails.push(`④ 좁은 창인데 ${k}가 패널 안에 갇혀 있다(부모 ${narrow.부모[k]})`);
for (const k of ["편성", "운용"])
  if (narrow.부모[k] !== "hudMenu") fails.push(`④ ${k}가 아래 판 메뉴를 벗어났다(부모 ${narrow.부모[k]})`);
if (narrow.로그보임 === "none" && !narrow.창열림) fails.push("④ 좁은 창에서 로그가 사라졌다");
if (narrow.로그.r > narrow.뷰[0] + 1 || narrow.로그.l < -1) fails.push(`④ 좁은 창에서 로그가 화면 밖으로 나갔다(${narrow.로그.l}~${narrow.로그.r}/${narrow.뷰[0]})`);
for (const n of narrow.숫자) if (n.t < narrow.무대.b)
  fails.push(`④ 좁은 창에서도 숫자가 전장 위로 ${narrow.무대.b - n.t}px 올라탔다`);

console.log(JSON.stringify({ 넓음: wide, 빠듯: tight, 좁음: narrow, 콘솔오류: errs, 실패: fails,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length ? 1 : 0);
