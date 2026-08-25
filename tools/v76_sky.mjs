/* V-76 — **하늘 단추(나가기·환생)가 무엇에도 안 잘리는가.**
   node tools/v76_sky.mjs

   왜 이 자가 필요한가: 두 단추는 위 띠(0~48px)와 창 판(56px~) **사이 8px 띠**에 서 있다.
   자리를 한 톨만 옮겨도 위나 아래가 덮는데, 덮은 쪽이 z-index 로 이기므로 **화면에는
   반쪽만 남는다**(2026-08-26 에 환생이 26px 중 8px 만 보였다). 사진으로는 「좀 낮네」
   정도로 보여 닷새를 지나쳤으니, 겹친 픽셀 수를 **수로** 잰다.

   판정: ① 창이 닫혔을 때 두 단추가 위 띠와 **0px** 겹친다
         ② 창이 열리면 두 단추가 **아예 없다**(반쯤 잘린 채 남지 않는다)
         ③ 둘이 **같은 자리·같은 크기**다 — 짝으로 만든 것이 짝으로 안 움직이면 그게 결함이다 */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const done = async (code, out) => { console.log(JSON.stringify(out, null, 1));
  await S("Target.closeTarget", { targetId }); bws.close(); process.exit(code); };

await wait(2500);
/* 환생은 **최고 25층을 넘긴 몸**에만 뜬다(core.js REBIRTH_MIN) — 안 심으면 잴 것이 없다. */
await ev(`(()=>{const m=JSON.parse(localStorage.getItem("necro.meta")||"{}");m.deepest=52;m.gold=182400;localStorage.setItem("necro.meta",JSON.stringify(m));})()`);
await ev(`location.reload()`); await wait(3000);

const R = await ev(`(()=>{
  const q = s => { const e = document.getElementById(s); if (!e) return null;
    const b = e.getBoundingClientRect(), cs = getComputedStyle(e);
    return { y: Math.round(b.y), h: Math.round(b.height), w: Math.round(b.width),
             right: Math.round(innerWidth - b.right), fs: cs.fontSize,
             vis: cs.display !== "none" && b.height > 0 }; };
  const band = q("top");
  const town = { reborn: q("hReborn"), leave: q("hLeave") };      // 마을 — 환생만 뜬다
  return new Promise(res => {
    window.__toDungeon ? window.__toDungeon() : null;             // 던전 — 나가기가 뜬다
    setTimeout(() => {
      const dun = { reborn: q("hReborn"), leave: q("hLeave") };
      document.getElementById("hBag")?.click();                   // 창을 연다
      setTimeout(() => res({ band, town, dun,
        open: { reborn: q("hReborn"), leave: q("hLeave"), win: q("winBag") } }), 400);
    }, 1200);
  });
})()`);

if (!R || !R.band) await done(2, { "판정": "못 쟀다 — 화면을 못 읽었다", R });
if (!R.town.reborn?.vis) await done(2, { "판정": "못 쟀다 — 마을에서 환생이 안 떴다(깊이를 못 심었나)", R });
if (!R.dun.leave?.vis)   await done(2, { "판정": "못 쟀다 — 던전에서 나가기가 안 떴다", R });

const bandBot = R.band.y + R.band.h;                    // 위 띠의 아래 끝
const winTop  = R.open.win?.y ?? 56;                    // 창 판의 위 끝
const nap = b => Math.max(0, bandBot - b.y);            // 띠에 먹힌 픽셀
const bad = [];
for (const [n, b] of [["환생", R.town.reborn], ["나가기", R.dun.leave]]) {
  if (nap(b) > 0) bad.push(`${n} 머리 ${nap(b)}px 가 위 띠(0~${bandBot}) 밑이다`);
  if (b.y + b.h > winTop && R.open[n === "환생" ? "reborn" : "leave"]?.vis)
    bad.push(`${n} 발치 ${b.y + b.h - winTop}px 가 창 판(${winTop}~) 밑인데 창이 열려도 안 숨는다`);
}
for (const k of ["reborn", "leave"])
  if (R.open[k]?.vis) bad.push(`창이 열렸는데 ${k} 가 남아 있다`);
/* 짝 — 둘은 같은 자리를 나눠 쓰므로 값이 갈리면 한쪽만 고친 것이다. */
const a = R.town.reborn, c = R.dun.leave;
for (const [k, l] of [["y", "위 끝"], ["right", "오른 여백"], ["h", "높이"]])
  if (a[k] !== c[k]) bad.push(`짝이 어긋난다 — ${l} 환생 ${a[k]} 대 나가기 ${c[k]}`);
if (a.fs !== c.fs) bad.push(`짝이 어긋난다 — 글자 크기 환생 ${a.fs} 대 나가기 ${c.fs}`);

await done(bad.length ? 1 : 0, bad.length
  ? { "판정": "틀림 — 하늘 단추가 잘린다", "까닭": bad, "잰 것": R }
  : { "판정": "통과", "위 띠": `0~${bandBot}`, "창 판 위끝": winTop,
      "환생": a, "나가기": c, "창 열림": "둘 다 감춰짐" });
