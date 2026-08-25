/* V-70 · **바닥에 깔리는 그림이 판만큼 눌렸는가**를 잰다.
   node tools/v70_flatfx.mjs            (고친 꼴)
   V70_OLD=1 node tools/v70_flatfx.mjs  (V-70 전 — 정사각. 내 양성 씨앗을 겸한다)

   ★ 눈으로 「동그랗다」를 세지 않는다 — **판이 그린 픽셀을 그대로 읽는다.**
     ① 판을 세운다(`S.speed = 0`) — 싸움이 안 굴러야 두 틀이 거의 같다.
     ② `S.fx` 를 비우고 **틀 둘을 그냥 찍어**(a0·a1) 그 사이에 달라진 자리를 **잡음**으로 둔다
        (횃불·빛이 흔들린다). 잡음 칸수를 **같이 내놓는다** — 0 이 나오면 그것부터 의심할 것
        ([[silent-zero-is-not-an-observation]]).
     ③ 그 자리에 그림 하나(kind)를 넣고 한 틀 더 찍는다(b). `b - a1` 에서 잡음을 뺀 것이
        **그림이 차지한 칸**이다. fx 는 판 위 모든 것 **뒤에** 그려지므로 가려지지 않는다.
     ④ 그 네모의 세로/가로가 **판의 눌림(`__geo.squash`)** 과 같아야 바닥에 누운 것이다.
   ★ 문턱은 바닥에서 멀리 둔다([[floor-far-from-threshold]]) — 옛 꼴은 1.00, 판의 눌림은
     0.7 언저리라 그 사이가 넉넉하다. 「전」이 0.92 를 못 넘으면 **자가 틀린 것**으로 끝낸다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const OLD = +(process.env.V70_OLD || 0) === 1;
const KINDS = (process.env.V70_KINDS || "curse,nova").split(",");

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 7; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);
const ev = async (e) => {
  const r = await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || "eval 실패");
  return r.result?.value;
};
if (OLD) await ev("globalThis.__NOFLATFX = 1");
if (!(await ev(`typeof window.__toDungeon === "function"`))) { console.log("판정: 못 쟀다 — __toDungeon 이 없다"); process.exit(2); }
await ev("window.__toDungeon()"); await wait(3500);
if ((await ev("(window.MODE||{}).at")) !== "dungeon") { console.log("판정: 못 쟀다 — 던전에 못 들어갔다"); process.exit(2); }

const probe = (kind) => `(async () => {
  const S = window.S, geo = window.__geo, art = window.FX_ART[${JSON.stringify(kind)}];
  if (!art || !art.img) return { err: "FX_ART 에 " + ${JSON.stringify(kind)} + " 그림이 없다" };
  const cv = document.querySelector("canvas"), g = cv.getContext("2d");
  const dpr = cv.width / cv.clientWidth;
  S.speed = 0;                                        // 판을 세운다(그리기는 계속 돈다)
  const T = 0.34;                                     // 알파가 꽉 찬 자리
  const grow = art.grow ? 0.55 + 0.63 * (1 - Math.max(0, Math.min(1, T / (art.life || 0.35)))) : 1;
  const hh = art.h * grow;
  const wx = 0, wy = 0;                               // 판 한가운데 — px()/py() 와 같은 셈
  const sx = geo.cx + wx * geo.sc, sy = geo.cy + wy * geo.sc * geo.squash;
  const pad = Math.ceil(hh * 1.35);
  const bx = Math.round((sx - pad) * dpr), by = Math.round((sy - pad) * dpr);
  const bw = Math.round(2 * pad * dpr), bh = Math.round(2 * pad * dpr);
  const grab = () => g.getImageData(bx, by, bw, bh).data;
  const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
  /* ★ **그림이 아직 안 왔으면 판은 «대신 그리는 동그라미»를 찍는다**(sprite 는 처음 물을 때
     null 을 주고 그제야 받아 온다). 그 대타는 arc 라 늘 1.00 이 나오므로, 안 기다리면
     자가 「안 눌렸다」를 그림 탓으로 오해한다 — 실제로 nova 가 그렇게 나왔다
     ([[knob-that-does-nothing]] · 손잡이가 아니라 그림이 없던 것). 올 때까지 기다린다. */
  let warm = 0; while (!window.sprite(art.img) && warm++ < 120) await frame();
  const im = window.sprite(art.img);
  if (!im) return { err: "그림을 못 받았다: " + art.img };
  /* ★ **그림 자체가 정사각인 것은 아니다** — 판이 찍는 네모는 늘 정사각이지만, 그 안에서
     **투명하지 않은 자리**는 그림마다 다르다(nova 는 가로로 좁고 세로로 꽉 찼다:
     0.80 × 0.97). 화면에서 잰 네모를 그냥 「눌림」이라 부르면 그 몫이 섞여 들어가
     제대로 눌러 그려도 0.61 이 나온다. 그러니 **그림의 제 몫으로 나눈다** —
     기대값은 「판의 눌림 × (그림 세로몫/가로몫)」 이다([[threshold-and-ruler-must-match]]). */
  const oc = document.createElement("canvas"); oc.width = im.width; oc.height = im.height;
  const og = oc.getContext("2d", { willReadFrequently: true });
  og.imageSmoothingEnabled = false; og.drawImage(im, 0, 0);
  const sd = og.getImageData(0, 0, im.width, im.height).data;
  let sx0 = 1e9, sx1 = -1, sy0 = 1e9, sy1 = -1;
  for (let yy = 0; yy < im.height; yy++) for (let xx = 0; xx < im.width; xx++)
    if (sd[(yy * im.width + xx) * 4 + 3] > 24) {
      if (xx < sx0) sx0 = xx; if (xx > sx1) sx1 = xx;
      if (yy < sy0) sy0 = yy; if (yy > sy1) sy1 = yy; }
  if (sx1 < 0) return { err: "그림이 통째로 투명하다: " + art.img };
  const srcW = (sx1 - sx0 + 1) / im.width, srcH = (sy1 - sy0 + 1) / im.height;
  const srcCy = ((sy0 + sy1 + 1) / 2) / im.height - 0.5;   // 그림 한가운데가 네모 한가운데에서 벗어난 몫
  S.fx.length = 0; if (S.pools) S.pools.length = 0;
  await frame(); const a0 = grab();
  await frame(); const a1 = grab();
  S.fx.push({ t: T, x: wx, y: wy, kind: ${JSON.stringify(kind)} });
  await frame(); const b = grab();
  S.fx.length = 0;
  const D = 40, n = bw * bh;
  const noise = new Uint8Array(n); let nn = 0;
  for (let i = 0; i < n; i++) { const p = i * 4;
    if (Math.max(Math.abs(a0[p]-a1[p]), Math.abs(a0[p+1]-a1[p+1]), Math.abs(a0[p+2]-a1[p+2])) > D) { noise[i] = 1; nn++; } }
  let x0 = 1e9, x1 = -1, y0 = 1e9, y1 = -1, hit = 0;
  const rows = new Int32Array(bh), cols = new Int32Array(bw);
  for (let yy = 0; yy < bh; yy++) for (let xx = 0; xx < bw; xx++) { const i = yy * bw + xx, p = i * 4;
    if (noise[i]) continue;
    if (Math.max(Math.abs(b[p]-a1[p]), Math.abs(b[p+1]-a1[p+1]), Math.abs(b[p+2]-a1[p+2])) > D) { rows[yy]++; cols[xx]++; hit++; } }
  const MIN = 3;                                      // 티끌 한 점으로 네모를 늘리지 않는다
  for (let yy = 0; yy < bh; yy++) if (rows[yy] >= MIN) { if (yy < y0) y0 = yy; y1 = yy; }
  for (let xx = 0; xx < bw; xx++) if (cols[xx] >= MIN) { if (xx < x0) x0 = xx; x1 = xx; }
  if (x1 < 0 || y1 < 0) return { err: "그림이 안 그려졌다(바뀐 칸 " + hit + " · 잡음 " + nn + ")" };
  const W = (x1 - x0 + 1) / dpr, H = (y1 - y0 + 1) / dpr;
  const cyPx = by + (y0 + y1) / 2;                     // 그림 한가운데의 화면 y
  return { kind: ${JSON.stringify(kind)}, w: +W.toFixed(1), h: +H.toFixed(1),
           aspect: +(H / W).toFixed(3), squash: +geo.squash.toFixed(3),
           srcAspect: +(srcH / srcW).toFixed(3),
           /* 그림 제 몫을 걷어낸 **판에서의 눌림** — 이것이 geo.squash 와 같아야 한다 */
           flatness: +((H / W) / (srcH / srcW)).toFixed(3),
           dy: +((cyPx / dpr) - sy).toFixed(1),
           dyWant: +(geo.squash * hh * srcCy).toFixed(1),
           hh: +hh.toFixed(1), hit, noise: nn };
})()`;

const out = [];
for (const k of KINDS) out.push(await ev(probe(k)));

console.log(OLD ? "── V-70 «전»(정사각) ──" : "── V-70 «후»(눌러 그림) ──");
let bad = 0;
for (const r of out) {
  if (!r || r.err) { console.log("  못 쟀다:", r && r.err); bad++; continue; }
  const want = OLD ? 1 : r.squash;
  const okA = OLD ? r.flatness >= 0.92 : Math.abs(r.flatness - r.squash) <= 0.06;
  const okY = OLD ? true : Math.abs(r.dy - r.dyWant) <= 4;
  if (!okA || !okY) bad++;
  console.log(`  ${r.kind.padEnd(6)} 가로 ${String(r.w).padStart(6)} 세로 ${String(r.h).padStart(6)}` +
    ` · 눌림 ${r.flatness} (판은 ${r.squash} · 바라는 것 ${want})` +
    ` · 그림 제 몫 ${r.srcAspect}` +
    ` · 발치에서 ${r.dy > 0 ? "+" : ""}${r.dy}px(바라는 것 ${r.dyWant})` +
    ` · 바뀐 칸 ${r.hit} 잡음 ${r.noise}  ${okA && okY ? "ok" : "미달"}`);
}
console.log("콘솔오류", errs.length, errs.slice(0, 2));
console.log(bad === 0
  ? (OLD ? "판정: 통과 — 옛 꼴은 정말 동그라미다(양성 씨앗)" : "판정: 통과 — 바닥 그림이 판만큼 눌렸다")
  : `판정: 미달 ${bad}`);
process.exit(bad === 0 ? 0 : 1);
