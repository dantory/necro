// 「위 띠가 또 잘린다」 자 — 폰 폭(414)에서 **「남은 적 NN」이 잘리는지**를 픽셀로 잰다.
//   node tools/topbar_probe.mjs
// ★ 마을에서는 배수를 아예 안 그린다(`.dep:empty{display:none}`) — 반드시 **던전에서** 잰다.
// ★ 양성 샘플로 먼저 캘리브레이션한다: 옛 표기(×19.50, toFixed(2))가 **잘려야** 이 자가 맞다.
//   (「0px = 통과」는 자가 눈을 감았을 때도 나온다.)
// 통과 조건: 새 표기(mul())로 20~200층 전부 clip 0 이고, 옛 표기는 50층에서 clip > 0.
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 3500));

/* ★ 글자를 손으로 넣어 재지 않는다 — 그러면 main.js 가 무엇을 쓰는지와 **자가 갈라진다.**
   층에 실제로 들어가서 hud() 가 채운 그 글자를 잰다(scrollWidth > clientWidth).
   마릿수는 제일 나쁜 두 자리(24)로 채워 둔다 — 한 마리 남은 화면은 뭘 해도 안 잘린다. */
const probe = `(async () => {
  const core = await import("/js/core.js");
  const bat  = await import("/js/battle.js");
  const st = core.S;
  window.toDungeon();
  const dep = document.getElementById("hDepth"), left = document.getElementById("hLeft");
  const FLOORS = [20, 50, 80, 120, 200];
  /* ★ hud() 는 프레임마다가 아니라 **0.1초마다** 돈다(main.js hudT) — rAF 두 번(32ms)만
     기다리면 글자가 아직 바뀌기 전이라 「남은 적 1」을 재고 통과한다. 넉넉히 기다린다. */
  const frame = () => new Promise(r => setTimeout(r, 250));
  const read = () => ({ dep: dep.textContent, left: left.textContent,
                        clip: Math.max(0, left.scrollWidth - left.clientWidth) });
  const out = [];
  for (const f of FLOORS) {
    bat.enterFloor(f);
    /* ★ 첫 마리가 **걸어 나오기를 기다린다**(적은 하나씩 나온다 — 250ms 로는 아직 빈 판이라
       클론을 못 떠서 「남은 적 1」만 재고 통과했다). 줄에서 꺼낸 한 마리를 24로 늘린다. */
    for (let i = 0; i < 40 && !st.mobs[0]; i++) await new Promise(r => setTimeout(r, 100));
    const m0 = st.mobs[0];
    if (m0) while (st.mobs.length < 24) st.mobs.push({ ...m0 });
    await frame();
    out.push({ f, ...read() });
  }
  /* 양성 샘플 — **고치기 전 화면을 그대로 되돌려** 본다(「남은 」을 다시 보이게 + 옛 ×19.50).
     이것이 안 잘리면 자가 눈을 감은 것이다. 배치는 동기라 hud() 가 되돌리기 전에 읽힌다.
     ★ 2026-08-15: 오른쪽에서 「· 금」 낱말을 접고 금을 줄인 표기로 바꾸자(hud.css/main.js)
       줄에 16px 쯤이 생겨 **옛 화면조차 안 잘렸다** — 자가 눈을 감은 것이 아니라 자가
       **옛 화면을 반만 되돌린** 탓이다. 되돌릴 것은 왼쪽·오른쪽 **둘 다**여야 한다. */
  const old = [];
  const lw = left.querySelector(".lw");
  const gw = document.querySelector("#top .who .gw");
  const gold = document.getElementById("hGold");
  const goldNow = gold ? gold.textContent : "";
  for (const f of FLOORS) {
    if (lw) lw.style.display = "inline";
    if (gw) gw.style.display = "inline";
    /* 옛 금 표기 — toLocaleString() 은 자릿수가 자랄수록 넓어진다(제일 나쁜 일곱 자리). */
    if (gold) { gold.textContent = (1234567).toLocaleString(); gold.style.color = "inherit"; }
    dep.textContent = "×" + Math.pow(1.0625, f - 1).toFixed(2);
    void left.offsetWidth;
    old.push({ f, dep: dep.textContent, clip: Math.max(0, left.scrollWidth - left.clientWidth) });
  }
  if (lw) lw.style.display = "";
  if (gw) gw.style.display = "";
  if (gold) { gold.textContent = goldNow; gold.style.color = ""; }
  return JSON.stringify({ at: window.__MODE.at, floor: st.floor, now: out, old });
})()`;
const r = await S("Runtime.evaluate", { expression: probe, awaitPromise: true, returnByValue: true });
const v = r.result.value;
if (!v) { console.log("EVAL FAIL", JSON.stringify(r.result)); process.exit(2); }
const o = JSON.parse(v);
console.log("at", o.at, "floor", o.floor);
for (const c of o.now) console.log(`  now f${c.f}\t${c.dep}\t"${c.left}"\tclip ${c.clip}`);
for (const c of o.old) console.log(`  old f${c.f}\t${c.dep}\t(남은 다시 보임)\tclip ${c.clip}`);
await S("Target.closeTarget", { targetId }).catch(() => {});
/* 수가 성한지도 같이 본다 — 잘림 0 이어도 「적 2」로 적혀 있으면 숫자가 거짓말한 것이다. */
/* ★ 마릿수는 **두 자리면 된다** — 24 로 못 박아 뒀더니 줄에서 한 마리가 더 걸어 나온 뒤
   (「적 25」) 자가 제 숫자를 못 알아보고 울었다. 재는 것은 마릿수가 아니라 **잘림**이다. */
const bad   = o.now.filter(c => c.clip > 0 || c.left.includes("…") || !/적 \d\d$/.test(c.left));
const calib = o.old.some(c => c.f === 50 && c.clip > 0);
if (!calib)     { console.log("FAIL 캘리브레이션 — 고치기 전 화면이 50층에서 안 잘렸다(자가 눈을 감았다)"); process.exit(1); }
if (bad.length) { console.log("FAIL " + bad.map(c => `f${c.f} ${c.dep} "${c.left}" +${c.clip}px`).join(" · ")); process.exit(1); }
console.log("PASS 20~200층 잘림 0 · 두 자리 마릿수 성함 · 고치기 전은 50층에서 잘렸다(캘리브레이션 OK)");
process.exit(0);
