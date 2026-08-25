/* V-65 — **배어 나오는 놈의 체력바가 몸보다 진하다**를 화소로 잰다.
   그리는 자리에서 모은 네모(window.__RECTS)를 읽고, **캔버스 화소를 직접** 떠서
   「바 잉크」와 「몸 잉크」를 같은 눈금(바닥색과의 거리)으로 잰다.

   ★ 한 판 안에서 **옛 그림과 새 그림을 번갈아** 켠다(`__BARBORN` 0/1) — 같은 개체·
     같은 born 값에서 견주려는 것이다([[same-seed-is-not-same-run]]). 두 표본 사이는
     한 틀(≈16ms)이라 born 이 0.6% 밖에 안 움직인다.
   ★ **옛 그림이 울지 않으면 미달로 낸다** — 양성 씨앗을 겸한다
     ([[silent-zero-is-not-an-observation]]).

   node tools/v65_bornbar.mjs [--shots]
*/
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SHOTS = process.argv.includes("--shots");
const fs = await import("node:fs");
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
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };

/* 5층은 관문이다 — 시작을 거기 못 박아 **주인이 서는 순간**을 바로 본다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 5, diveSet: 5,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);

/* 잰다: 그린 네모를 읽고 캔버스 화소를 뜬다. 눈금은 **바닥색과의 거리**다. */
await ev(`
window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
/* **바가 실제로 얼마나 진하게 그려졌나**를 화소에서 되푼다.
   알파 a 로 색 C 를 바탕 B 위에 칠하면 화소는 a·C + (1-a)·B 다 — C 와 B 를 알면
   a 를 되찾을 수 있다. 바닥색과의 «거리»로 재던 첫 자는 보스가 걸어 다니는 통에
   바탕이 자꾸 바뀌어 흔들렸다([[threshold-and-ruler-must-match]]) — 바탕은
   **바로 그 자리 바로 위**에서 뜬다. */
window.__v65 = () => {
  const R = window.__RECTS, cv = document.querySelector("canvas");
  if (!R || !cv || !R.bars.length) return null;
  const g = cv.getContext("2d");
  const dpr = cv.width / cv.getBoundingClientRect().width;
  const boss = (window.__S.mobs || []).find(m => m.boss);
  if (!boss) return null;
  let bar = null; for (const b of R.bars) if (!bar || b[2] > bar[2]) bar = b;   // 보스 바 = 제일 넓다
  const grab = (x, y, w, h) => {
    x = Math.round(x*dpr); y = Math.round(y*dpr); w = Math.max(1,Math.round(w*dpr)); h = Math.max(1,Math.round(h*dpr));
    if (x < 0 || y < 0 || x+w > cv.width || y+h > cv.height) return null;
    return g.getImageData(x, y, w, h).data;
  };
  const med = (d, c) => { const n = d.length/4, a = new Array(n);
    for (let i=0;i<n;i++) a[i] = d[i*4+c]; a.sort((x,y)=>x-y); return a[n>>1]; };
  /* ★ **왼쪽 자락만 뜬다.** 바 전체의 중앙값을 쓰면 «빈 칸»(어두운 색)이 절반을
     넘는 순간 판정이 통째로 뒤집힌다 — 보스는 재는 사이에도 맞고 있다. 남은 몫이
     얼마든 왼쪽 자락은 늘 채워져 있다. */
  const fillW = Math.max(3, Math.min(14, Math.floor((bar[2]-6) * Math.max(0.12, boss.hp/boss.hpMax) * 0.8)));
  const inside = grab(bar[0]+3, bar[1]+2, fillW, bar[3]-4);
  const above  = grab(bar[0]+3, bar[1]-7, bar[2]-6, 4);             // 바로 위 바탕
  if (!inside || !above) return null;
  const C = [255, 107, 82];                                          // 관문 주인 바 색 #ff6b52
  let sum = 0, n = 0;
  for (let c = 0; c < 3; c++) {
    const px = med(inside, c), bg = med(above, c);
    if (Math.abs(C[c] - bg) < 45) continue;                          // 바탕과 색이 붙은 채널은 못 믿는다
    sum += (px - bg) / (C[c] - bg); n++;
  }
  if (!n) return null;
  return { barAlpha: sum / n, born: boss.born, born0: boss.born0, barW: bar[2],
           pct: boss.hp / boss.hpMax, chans: n };
};`);

if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("window.__toDungeon 이 없다");
await ev(`window.__toDungeon()`);

const samples = [];
const t0 = Date.now();
let shotOld = null, shotNew = null;
/* ★ **born 을 못 박고 잰다.** 안 박으면 두 표본 사이(왕복 두 번 + 두 틀)에 born 이
   0.3~0.4 나 흘러, 「새 그림」만 더 여문 자리에서 재게 된다 — 그건 견줌이 아니다
   ([[same-seed-is-not-same-run]]). 같은 born 에 세워 두고 그림만 갈아 끼운다. */
/* 재는 동안 **주인이 죽지 않게** 만피로 붙들어 둔다 — 남은 몫이 줄면 바의 «채운
   자락»이 좁아져 자가 흔들린다(첫 판에서 세 번째 표본이 16%까지 깎였다). 그림만
   재는 자리라 판 산수에는 손을 안 댄다. */
const pin = (p) => ev(`(()=>{const b=(window.__S.mobs||[]).find(m=>m.boss);
  if(!b) return 0; b.born = b.born0 * ${p}; b.hp = b.hpMax; return 1;})()`);
let bossSeen = false;
while (Date.now() - t0 < 90000) {
  const st = await ev(`(()=>{const b=(window.__S&&window.__S.mobs||[]).find(m=>m.boss);
    return b? {born:b.born, born0:b.born0} : null;})()`);
  if (!st) { await wait(60); continue; }
  bossSeen = true;
  /* ★ **다 선 자리(0)를 먼저** 잰다 — 견줄 바닥이 없으면 나머지 수가 눈금이 아니다
     ([[floor-far-from-threshold]]). 그리고 0.94(거의 안 보임)는 안 쓴다: 알파가
     0.06 이면 화소 차가 잡음보다 작아 되푼 값이 1.7 까지 튄다. */
  for (const frac of [0.0, 0.70, 0.45]) {                // 남은 born 의 몫 — 0 = 다 섰다
    for (const old of [1, 0]) {
      await pin(frac);
      await ev(`window.__BARBORN_OFF = ${old}`);
      await ev(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
      await pin(frac);                                    // 틀이 도는 사이 줄어든 만큼 되돌린다
      const m = await ev(`window.__v65()`);
      if (m && m.barAlpha != null && isFinite(m.barAlpha)) samples.push({ old, p: 1 - frac, ...m });
      else console.log(`  (못 쟀다: 다 선 정도 ${((1-frac)*100)|0}% ${old ? "옛" : "새"} — ${m ? JSON.stringify(m) : "보스 없음/네모 없음"})`);
    }
  }
  /* 사진은 **더 이른 자리**에서 찍는다(남은 born 0.82 = 진하기 0.18) — 재기엔
     잡음이 크지만 «임자 없는 막대»가 눈에 드는 것은 바로 이 자리다. */
  if (SHOTS) for (const old of [1, 0]) {
    await pin(0.82);
    await ev(`window.__BARBORN_OFF = ${old}`);
    await ev(`new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))`);
    await pin(0.82);
    if (old) { await shot("tmp/v65_old.png"); shotOld = 1; } else { await shot("tmp/v65_new.png"); shotNew = 1; }
  }
  break;
}
if (!bossSeen) { console.log("미달 — 관문의 주인을 못 만났다"); process.exit(1); }
await ev(`window.__BARBORN_OFF = 0`);

const mean = (a) => a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN;
const born = (o) => samples.filter(s => s.old === o && s.p < 0.6);   // 배어 나오는 앞 60%(못 박은 자리)
const done = (o) => samples.filter(s => s.old === o && s.p >= 1);
console.log(`표본 ${samples.length} (배어나오는중 옛 ${born(1).length} · 새 ${born(0).length})`);
for (const s of samples)
  console.log(`  다 선 정도 ${(s.p*100).toFixed(0)}% ${s.old ? "옛" : "새"} — 바가 그려진 진하기 ${s.barAlpha.toFixed(2)} (남은 몫 ${(s.pct*100).toFixed(0)}%)`);
const oldB = mean(born(1).map(s => s.barAlpha)), newB = mean(born(0).map(s => s.barAlpha));
const gapNew = mean(born(0).map(s => Math.abs(s.barAlpha - s.p)));
const oldD = mean(done(1).map(s => s.barAlpha)), newD = mean(done(0).map(s => s.barAlpha));
console.log(`배어 나오는 중 바 진하기 — 옛 ${oldB.toFixed(2)} → 새 ${newB.toFixed(2)} (몸과의 어긋남 ${gapNew.toFixed(2)}) | 다 선 뒤 옛 ${oldD.toFixed(2)} · 새 ${newD.toFixed(2)}`);
console.log("errs", errs.slice(0, 3));
let verdict;
if (born(1).length < 2 || born(0).length < 2) verdict = "미달 — 배어 나오는 자리를 못 잡았다";
else if (!(oldB > 0.85)) verdict = `미달 — 옛 그림이 안 운다(${oldB.toFixed(2)}) · 자가 이 결함을 못 잡는다`;
else if (!(newD > 0.85)) verdict = `실패 — 다 선 뒤에도 바가 흐리다(${newD.toFixed(2)})`;
else if (gapNew > 0.18) verdict = `실패 — 새 그림도 몸을 앞선다(어긋남 ${gapNew.toFixed(2)})`;
else verdict = `통과 — 바가 몸과 같이 배어 나온다 (옛 ${oldB.toFixed(2)} → 새 ${newB.toFixed(2)}, 몸과의 어긋남 ${gapNew.toFixed(2)})`;
console.log("판정:", verdict);
if (SHOTS) console.log("사진", shotOld ? "tmp/v65_old.png" : "-", shotNew ? "tmp/v65_new.png" : "-");
process.exit(verdict.startsWith("통과") ? 0 : 1);
