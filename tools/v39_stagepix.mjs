/* ══ V-39 자 — 「성능모드에서 무대 캔버스가 **부드럽게** 늘어나는가」 ══
   `#stage` 만 `image-rendering` 이 없어서, 성능모드(dpr 1.35)가 켜지면 브라우저가
   뒷그림 2041px 를 화면 3024px 로 **보간해서** 늘린다 — 판 전체가 1.48 배로 번진다.
   창틀·구슬·아이콘·벨트는 전부 `pixelated` 가 붙어 있는데 판만 빠져 있었다
   ([[carry-fixes-forward]]).

   재는 법: 판을 **얼려 놓고** 같은 자리를 두 번 찍는다 — `#stage` 의
   `image-rendering` 을 `auto`(고치기 전) 와 `pixelated`(고친 뒤) 로 바꿔 가며.
   그림이 스스로 말하도록 **인물 언저리를 8 배로 오려** 나란히 남긴다
   ([[play-it-before-measuring-it]]).
   자는 「가장자리 픽셀의 비율」을 센다 — 이웃과 값이 다른데 **어느 쪽과도 안 같은**
   중간색 픽셀. 보간하면 늘고, 최근접이면 준다.

   node tools/v39_stagepix.mjs                (성능모드 · 기본)
   PERF=0 node tools/v39_stagepix.mjs         (성능모드 끔 — dpr 2 라 갈림이 없어야 한다) */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PERF = process.env.PERF === "0" ? "0" : "1";
const URL = `http://127.0.0.1:8774/index.html?perf=${PERF}`;
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
const bad = [];
if (!(await ev("typeof window.__toDungeon === 'function'"))) {
  console.error("미달 — window.__toDungeon 이 없다"); process.exit(2);
}
await ev("window.__toDungeon()"); await wait(2600);
const at = await ev("window.__S && window.__S.floor");
if (!at) bad.push("던전에 안 들어갔다");

/* 늘어나는 배수를 **판에서 직접 읽는다** — 짐작하지 않는다([[silent-zero-is-not-an-observation]]). */
const st = await ev(`(()=>{const c=document.getElementById("stage");
  return {bw:c.width, bh:c.height, cw:c.clientWidth, ch:c.clientHeight,
          ir:getComputedStyle(c).imageRendering, dpr:devicePixelRatio};})()`);
if (!st) { console.error("미달 — #stage 를 못 읽었다"); process.exit(2); }
const up = (st.cw * st.dpr) / st.bw;      // 화면 물리픽셀 ÷ 뒷그림 픽셀
console.log(`뒷그림 ${st.bw}x${st.bh} → 화면 ${st.cw * st.dpr}x${st.ch * st.dpr}  늘림 ${up.toFixed(3)}배  (image-rendering: ${st.ir} · 층 ${at})`);
if (PERF === "1" && up < 1.05) bad.push(`성능모드인데 늘림이 ${up.toFixed(3)} — dpr 이 안 내려갔다`);

/* 판을 얼린다 — 두 사진의 다른 곳이 «늘리는 법» 하나뿐이 되도록. */
await ev(`(()=>{globalThis.__FIXEDDT=1e-9; const S=window.__S; S.speed=0; S.fx.length=0;})()`); await wait(700);

/* 인물이 선 자리를 판에서 받아 그 언저리를 오린다. */
const g = await ev("window.__geo && {cx:__geo.cx, cy:__geo.cy, us:__geo.us}");
if (!g) { console.error("미달 — window.__geo 가 없다"); process.exit(2); }
/* WHAT=fr 이면 **띠·칸의 테두리**(canvas.fr)를 본다 — 여기도 뒷그림이 CSS px 그대로라
   dpr 2 에서 두 배로 늘어난다. 판만 고치고 넘어가면 또 [[carry-fixes-forward]] 다. */
const WHAT = process.env.WHAT === "fr" ? "fr" : "stage";
const SEL = WHAT === "fr" ? "canvas.fr" : "#stage";
let CW = 150, CH = 110, cx, cy;                 // CSS px 로 오릴 창
if (WHAT === "fr") {
  const r = await ev(`(()=>{const e=document.querySelector(".mid .xp"); if(!e) return null;
    const b=e.getBoundingClientRect(); return {x:b.x,y:b.y,w:b.width,h:b.height};})()`);
  if (!r) { console.error("미달 — .mid .xp 를 못 찾았다"); process.exit(2); }
  CW = Math.round(Math.min(150, r.w)); CH = Math.round(r.h) + 6;
  cx = Math.round(r.x); cy = Math.round(r.y) - 3;
} else {
  cx = Math.round(g.cx - CW / 2); cy = Math.round(g.cy - CH * 0.72);
}

const setIR = async v => { await ev(`document.querySelectorAll(${JSON.stringify(SEL)}).forEach(e=>e.style.imageRendering=${JSON.stringify(v)})`); await wait(350); };
const shots = {};
for (const [tag, ir] of [["smooth", "auto"], ["pixel", "pixelated"]]) {
  await setIR(ir);
  const got = await ev(`getComputedStyle(document.querySelector(${JSON.stringify(SEL)})).imageRendering`);
  if (got !== ir) bad.push(`image-rendering 이 안 먹었다(${ir} → ${got})`);
  await shot(`tmp/v39_${WHAT}_${tag}.png`);
  shots[tag] = `tmp/v39_${WHAT}_${tag}.png`;
}

const out = cp.execFileSync("python3", ["tools/v39_edgepix.py",
  shots.smooth, shots.pixel, String(cx), String(cy), String(CW), String(CH), "2", "8"], { encoding: "utf8" });
const m = JSON.parse(out);
console.log(`오린 창 ${CW}x${CH}@(${cx},${cy})  n=${m.n}`);
console.log(`  매끈(auto)     중간색 ${m.smooth}%`);
console.log(`  픽셀(pixelated) 중간색 ${m.pixel}%`);
console.log(`  ${m.zoomA} · ${m.zoomB}`);
if (!m.n || m.n < 600) bad.push(`오린 창이 비었다(n ${m.n})`);
if (WHAT === "stage" && PERF === "1" && m.smooth - m.pixel < 3) bad.push(`갈림이 없다(매끈 ${m.smooth} vs 픽셀 ${m.pixel}) — 자가 헛돌거나 고침이 안 먹었다`);
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
