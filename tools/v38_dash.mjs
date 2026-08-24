/* ══ V-38 자 — 「관문·우두머리의 **예고 점선**이 픽셀아트인가」 ══
   깊은 층에서 화면의 절반을 덮는 그 금빛 고리는 판에서 **유일하게 매끈한 벡터 선**이었다.
   `ground.js` 는 진 둘레를 그릴 때 이미 「점선도 픽셀로 — setLineDash 는 매끈하다」고
   못을 박아 두었는데, 예고 쪽에는 안 옮겨져 있었다([[carry-fixes-forward]]).

   재는 법: 판을 **얼려 놓고**(S.speed=0 · 예고의 t 를 못박아 깜빡임까지 고정) 같은 자리를
   두 번 찍는다 — 예고를 띄운 것과 지운 것. 두 사진의 차에서 **덮은 정도 c** 를 되풀어
   「반쯤 칠해진 픽셀의 비율」(blur)을 낸다(tools/v38_dashpix.py 의 주석).
   ★ 같은 사진 안에 눈금을 둔다([[floor-far-from-threshold]]) — 문 `__VECDASH=1` 이
     고치기 전의 벡터 점선을 그 자리에 다시 세운다.

   node tools/v38_dash.mjs                 (고친 뒤 · 픽셀 점선)
   VECDASH=1 node tools/v38_dash.mjs       (고치기 전 · 매끈한 벡터)                */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const URL = "http://127.0.0.1:8774/index.html";
const VEC = process.env.VECDASH === "1";
const TAG = VEC ? "vec" : "pix";
const COL = "#e0b44a";        // 우두머리 절규(CHAMP_COL) — 화면에서 제일 크게 도는 예고
const RR = 190;               // CHAMP_R
const T_PIN = 15.83893;       // |sin(12t)| = 1 → blink 이 0.75 로 못 박힌다
const ALPHA = 0.65;      // blink = 0.3 + 0.35·|sin(12t)| · 위 T_PIN 이 |sin| 을 1 로 못박는다
const fs = await import("node:fs");
const cp = await import("node:child_process");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async out => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

await S("Page.reload", { ignoreCache: true }); await wait(3200);
if (VEC) await ev("globalThis.__VECDASH=1");

/* 던전으로 — **없는 이름을 부르면 조용히 0 이 나온다**([[silent-zero-is-not-an-observation]]).
   있는 것은 `__toDungeon` 이다(look_shots 의 못). 없으면 여기서 끝낸다. */
const bad = [];
if (!(await ev("typeof window.__toDungeon === 'function'"))) {
  console.error("미달 — window.__toDungeon 이 없다"); process.exit(2);
}
await ev("window.__toDungeon()"); await wait(2600);
const at = await ev("window.__S && window.__S.floor");
if (!at) bad.push("던전에 안 들어갔다");

/* 판을 얼린다 — 얼려야 두 사진의 «다른 곳»이 예고 하나뿐이 된다.
   ★ **두 곳을 다 멈춰야 한다.** 처음엔 `S.speed=0` 만 걸었는데, 그건 `step()`(싸움)만
     멈춘다 — `draw(dt)` 는 벽시계 dt 로 계속 돌아 인물의 걸음·횃불·기운이 바뀌었다.
     그래서 두 사진의 제일 큰 차가 **고리가 아니라 네크로의 소매**에 있었다(자를 믿기
     전에 오려서 눈으로 봤다 · [[silent-zero-is-not-an-observation]]).
     `__FIXEDDT` 는 tick 에서 **draw 에도 같이 넘어가는 dt** 라(main.js tick), 아주 작은
     값으로 못박으면 연출까지 선다. S.speed=0 이라 f.t 는 아예 안 줄어든다. */
await ev(`(()=>{globalThis.__FIXEDDT=1e-9; const S=window.__S; S.speed=0; S.fx.length=0;})()`); await wait(700);
await shot(`tmp/v38_${TAG}_off.png`);

await ev(`(()=>{const S=window.__S;
  S.fx.length=0;
  S.fx.push({ t:${T_PIN}, x:0, y:0, kind:"warn_curse", col:${JSON.stringify(COL)}, r:${RR} });
})()`); await wait(500);
await shot(`tmp/v38_${TAG}_on.png`);
const still = await ev(`window.__S.fx.length`);
if (still !== 1) bad.push(`예고가 판에 안 남았다(fx ${still})`);

/* 자가 볼 **띠**는 판이 실제로 그린 기하에서 받는다(window.__geo · 짐작하지 않는다). */
const g = await ev("window.__geo && {cx:__geo.cx, cy:__geo.cy, us:__geo.us, sq:__geo.squash}");
if (!g) { console.error("미달 — window.__geo 가 없다"); process.exit(2); }
const RX = RR * g.us, RY = RX * g.sq;

/* 그림이 정말 달라졌나 — 안 달라졌으면 자가 0 을 내고 그건 관찰이 아니다. */
const out = cp.execFileSync("python3", ["tools/v38_dashpix.py",
  `tmp/v38_${TAG}_on.png`, `tmp/v38_${TAG}_off.png`, COL, String(ALPHA),
  String(g.cx), String(g.cy), String(RX), String(RY), "2"], { encoding: "utf8" });
const m = JSON.parse(out);
if (!m.n || m.n < 400) bad.push(`획이 안 잡혔다(n ${m.n}) — 예고가 안 그려졌거나 자가 헛돈다`);
console.log(`${TAG}  n=${m.n}  blur=${m.blur}  solid=${m.solid}   (층 ${at})`);
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
