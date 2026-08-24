/* V-36 자 — **하단 벨트 여섯 칸의 그림이 칸을 채우나.**
   처음 켠 사람이 60초 안에 보는 여섯 칸인데, 그림이 제각각이라 어떤 칸은 «덜 만든 칸»
   으로 읽힌다. 까닭은 그림의 **투명 여백**이다 — `.slot > i` 가 `background:center/contain`
   이라 64×64 안의 여백까지 통째로 칸에 맞춰지고, 획은 그만큼 작아진다.

   재는 법은 V-33/V-34 그대로 — **그림을 껐다 켜서 뺀 잉크**(`tools/v36_pix.py`).
   ★ 눈금을 같은 사진 안에 둔다([[floor-far-from-threshold]]):
       fw·fh = 그림이 닿은 폭·높이 ÷ 상자     ← 재려는 것 (1.00 이 「꽉 참」)
       ink   = 칸 안 |ΔL| 평균                ← 밝기 (꺼진 칸은 낮다 — 참고용)
   ★ 칸이 꺼져 있으면(.slot.off) 어둡게 죽으므로 **밝기로 판정하지 않는다.**
     크기(fw·fh)만 문턱을 건다 — 긴 쪽이 0.80 미만이면 나무란다.

     node tools/v36_beltico.mjs
     V36_MIN=0.9 node tools/v36_beltico.mjs   (문턱을 바꿔 본다) */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, URL = "http://127.0.0.1:8774/index.html";
const MIN = +(process.env.V36_MIN || 0.80);
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

const bad = [];
/* ★★ **칸은 «산 것»과 «죽은 것» 둘 중 하나여야 한다.** 벨트의 약속이 그것이다
   (js/main.js: "쓸 수 있으면 금테가 살고, 못 쓰면 죽는다"). 그런데 «처음부터 못 쓰는
   칸»은 어느 쪽도 아니다 — `beltState` 가 **바뀔 때만** 손대는데 첫 판정이
   「못 씀」이면 바뀐 것이 없어 `off` 가 한 번도 안 붙는다. 그 칸은 죽지 않은 채로
   남아 **쓸 수 있는 칸처럼 보인다.**
   자는 「반 이상의 시간 동안 on/off 중 하나를 달고 있나」가 아니라
   **모든 표본에서 정확히 하나**를 본다. */
const classSamples = [];
const sampleClasses = async (tag) => classSamples.push({ tag, v: await ev(
  `[...document.querySelectorAll("#belt .slot")].map(c=>({id:c.dataset.sk||"빈칸",
     on:c.classList.contains("on"), off:c.classList.contains("off")}))`) });

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
/* **처음 켠 사람**을 그대로 잰다 — 세이브를 지우고 새로 시작한다(V-36 은 초반 화면이다). */
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: URL }); await wait(1500);
await ev(`localStorage.removeItem("necro.meta.v1")`);
await S("Page.reload", { ignoreCache: true }); await wait(3000);
/* 마을은 벨트를 통째로 옅게 한다(`body.in-town #belt{opacity:.45}`) — 던전에서 잰다. */
await ev(`window.__toDungeon && window.__toDungeon()`);
await wait(1200); await sampleClasses("들어선 순간");
await wait(6000);  await sampleClasses("6초");
await wait(15000);
const inTown = await ev(`document.body.classList.contains("in-town")`);
if (inTown) bad.push("던전에 못 들어갔다 — 마을 벨트는 옅어서 못 잰다");
await sampleClasses("22초");

/* 칸마다 **그림 상자(i)** 의 자리와 상태를 받는다. 재는 상자는 그림 상자로 통일한다 —
   칸 전체로 재면 여백까지 분모에 들어가 「채움」이 늘 낮게 나온다. */
const nodes = await ev(`(()=>{const b=document.getElementById("belt");
  return [...b.querySelectorAll(".slot")].map((c,i)=>{
    const ic=c.querySelector("i"); if(!ic) return null;
    const r=ic.getBoundingClientRect();
    const st=c.classList.contains("on")?"on":c.classList.contains("off")?"off":"?";
    const sk=c.dataset.sk||("빈칸"+i);
    return {id:sk, state:st, r:{x:r.x,y:r.y,w:r.width,h:r.height}};
  }).filter(Boolean)})()`);
if (!nodes || nodes.length < 6) bad.push(`벨트 칸이 ${nodes ? nodes.length : 0}개 — 여섯이어야 한다`);
const dpr = await ev(`window.devicePixelRatio`);

/* ★★ **판을 먼저 얼린다.** 처음 자는 두 사진을 250ms 사이에 찍었는데, 그 사이에
   ㉮ 칸틀이 다시 그려지고(쓸 수 있음↔없음) ㉯ 재사용 막대(.cd)가 줄고
   ㉰ `slotBreath` 가 칸을 부풀린다. 그 흔들림이 |ΔL| 로 칸 **전체**에 깔려,
   그림이 상자의 44% 밖에 안 차는 칸도 「1.00 꽉 참」으로 읽혔다
   ([[silent-zero-is-not-an-observation]] 의 뒤집힌 꼴 — 자가 준 1 도 관찰이 아니다).
   rAF 를 막아 셈을 세우고, CSS 몸짓은 따로 멈춘다(그것은 rAF 를 안 탄다). */
await ev(`{window.requestAnimationFrame = () => 0;
   const s=document.createElement("style"); s.id="v36freeze";
   s.textContent="*{animation-play-state:paused!important;transition:none!important}";
   document.head.appendChild(s);1}`);
await wait(400);

const onPng = "tmp/v36_belt_on.png", hidePng = "tmp/v36_belt_hide.png";
await shot(onPng);
await ev(`{const s=document.createElement("style");s.id="v36hide";
   s.textContent="#belt .slot > i{visibility:hidden!important}";
   document.head.appendChild(s);1}`);
await wait(250); await shot(hidePng);
await ev(`document.getElementById("v36hide")?.remove()`);

const job = "tmp/v36_job.json";
fs.writeFileSync(job, JSON.stringify({ on: onPng, off: hidePng, dpr, nodes }));
const out = JSON.parse(cp.execFileSync("python3", ["tools/v36_pix.py", job], { encoding: "utf8" }));

console.log("칸(스킬)   상태 | 채움 가로 세로 | 긴 쪽 | 잉크 / top");
for (const o of out) {
  const lon = Math.max(o.fw || 0, o.fh || 0);
  console.log(`${o.id.padEnd(10)} ${o.state.padEnd(4)} |  ${(o.fw||0).toFixed(2)}  ${(o.fh||0).toFixed(2)} | ${lon.toFixed(2)}` +
              ` | ${o.ink == null ? "  못 잼" : o.ink.toFixed(1).padStart(5) + " / " + o.top.toFixed(1)}`);
  if (o.ink == null) bad.push(`${o.id}: 칸을 못 쟀다(창 밖?)`);
  else if (lon < MIN) bad.push(`${o.id}: 그림이 상자의 ${(lon*100)|0}% 밖에 안 찬다(문턱 ${(MIN*100)|0}%)`);
  else if ((o.top || 0) < 8) bad.push(`${o.id}: 그림이 거의 안 나타난다(top ${o.top.toFixed(1)})`);
}
for (const smp of classSamples)
  for (const c of smp.v) {
    const n = (c.on ? 1 : 0) + (c.off ? 1 : 0);
    if (n !== 1) bad.push(`${smp.tag}: ${c.id} 칸이 ${n === 0 ? "산 것도 죽은 것도 아니다(on·off 둘 다 없다)" : "산 것이면서 죽은 것이다"}`);
  }
console.log("\n칸의 산 것/죽은 것 — " + classSamples.map(s2 =>
  `${s2.tag}: ` + s2.v.map(c => `${c.id}${c.on ? "산" : c.off ? "죽" : "?"}`).join(" ")).join(" | "));

const lons = out.map(o => Math.max(o.fw || 0, o.fh || 0));
console.log(`\n긴 쪽 평균 ${(lons.reduce((a,b)=>a+b,0)/lons.length).toFixed(2)} · 제일 작은 칸 ${Math.min(...lons).toFixed(2)}`);
console.log(`사진: ${onPng} (그림 끈 것 ${hidePng})`);
if (errs.length) bad.push(`콘솔 오류 ${errs.length}: ${errs[0]}`);
console.log(bad.length ? "\n【나무람】\n  " + bad.join("\n  ") : "\n【통과】 여섯 칸 다 제 상자를 채운다");
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(bad.length ? 1 : 0);
