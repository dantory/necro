/* ══ 체력바가 편을 말하는지 재는 자 ══
   병수님: "아군과 적의 체력바가 같은 초록이다. 12기가 몰려 있으면 누가 내 것인지 모른다."
   자를 세워 보니 **색이 같았던 게 아니라 적의 바가 바닥에 묻혀 사라졌다.**

   ★ 왜 look_shots 로는 못 재나: 적 바는 `hp < hpMax` 일 때만 뜬다. 씨앗 없이 45초를
     굴리면 **그 순간 다친 적이 하나도 없는 판**이 흔히 나온다(실제로 층 9 에서 적 바
     픽셀 0 이 나와 「고쳤는지」를 말할 수 없었다). 그래서 여기서는 **적을 일부러 60%
     로 깎아** 반드시 바가 뜨게 만든다 — 재는 것은 「그 바가 읽히느냐」지 「다쳤느냐」가
     아니다([[seed-the-probe]] · [[probe-must-walk-the-real-path]]).

   판정: 적 바의 **바닥대비**가 2.5:1 미만이면 FAIL(옛 #8b1a1a 는 1.35:1 이라 제 빈 칸
         1.45:1 보다도 낮았다 — 꽉 찬 바가 빈 바처럼 보였다).
         아군과 적이 **같은 색이면** FAIL.
   node tools/bar_probe.mjs   (tmp/bar_probe.png) */
const CDP = process.env.NECRO_CDP_PORT ? `http://127.0.0.1:${process.env.NECRO_CDP_PORT}` : "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
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
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1500);
await ev(`window.toDungeon && window.toDungeon()`);
await wait(30000);

/* ★ **판에 적이 몇이나 서 있느냐는 그때그때 다르다** — 처음 이 자를 돌렸을 때 마침
   적이 둘뿐이고 관문 주인은 없어서(층 5) 잴 것이 거의 없었다.
   ★★ 그래서 줄(S.spawnQ)에 직접 넣어 봤더니 **그것도 안 됐다** — 군세 22 가 넣는 족족
   죽여서 층이 5→7 로 넘어갔고, 층 진입이 `S.spawnQ = []` 로 줄을 **통째로 비운다.**
   그러니 넣는 것만으로는 못 세운다. **안 죽게 붙들어 놓고** 세운다 — 50ms 마다 적의
   hp 를 만피로 되돌리면 죽지 않고, 판이 안 비니 층도 안 넘어가 줄이 살아남는다.
   (재는 것은 「바가 읽히느냐」지 「누가 이기느냐」가 아니다.)
   ★★★ 순서가 중요하다: **붙들기를 먼저 켜고 그다음에 넣는다.** 반대로 했더니 넣은
   직후에 판이 비어 층이 넘어갔고(5→7), 층 진입이 줄을 비워 **관문 주인이 통째로
   사라졌다**(boss 0). 붙들기가 먼저면 아무도 안 죽어 층이 멈추고, 그 위에 세운 것은
   남는다. */
await ev(`window.__barPin = setInterval(() => { for (const m of S.mobs) m.hp = m.hpMax; }, 50)`);
await wait(1500);                                 // 층이 멈춘 것을 확인할 틈
await ev(`(() => {
  if (!window.S || !S.spawnQ) return 0;
  const f = S.floor;
  for (let i = 0; i < 8; i++) S.spawnQ.push({ f, i, n: 8, boss: false });
  S.spawnQ.unshift({ f, i: 0, n: 1, boss: true });
  return S.spawnQ.length;
})()`);
await wait(12000);

/* 적을 60% 로 깎고 **그 프레임에서 바로 찍는다** — 다시 굴리면 회복·죽음으로 도로 사라진다. */
const state = await ev(`(() => {
  if (!window.S || !S.mobs) return null;
  clearInterval(window.__barPin);                 // 붙들기를 놓고
  for (const m of S.mobs) m.hp = m.hpMax * 0.6;   // 60% 로 깎아 바를 띄운다
  return { floor: S.floor, mobs: S.mobs.length, minions: S.minions ? S.minions.length : 0,
           boss: S.mobs.filter(m => m.boss).length };
})()`);
await wait(60);                                   // 깎은 값이 그려진 프레임 하나만 지나가게
const shot = await S("Page.captureScreenshot", { format: "png" });
fs.writeFileSync("tmp/bar_probe.png", Buffer.from(shot.data, "base64"));
await fetch(`${CDP}/json/close/${targetId}`);

/* ══ 판정 ══ ★ **찍기만 하고 판정을 안 하면 자가 아니라 사진기다.** 처음 판을 이렇게
   두었더니 「판 {...} errs 0」만 찍혀서, 색을 고쳤는지 아닌지를 **사람이 그림을 열어
   봐야** 알 수 있었다 — 그러면 다음 회귀 때 아무도 안 본다([[probe-must-walk-the-real-path]]).
   그래서 찍은 그림에서 **바 색을 그대로 세어** 여기서 통과·실패를 말한다. */
const png = fs.readFileSync("tmp/bar_probe.png");
const ALLY = [0x7f, 0xb0, 0x69], FOE = [0xe0, 0x5a, 0x4a], LORD = [0xff, 0x6b, 0x52], OLD = [0x8b, 0x1a, 0x1a];
const SLOT = [0x1a, 0x14, 0x10];                  // 바의 빈 칸 — 적 바가 여기 묻히면 꽉 차도 빈 것처럼 보인다
const srgb = (v) => (v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
const lum = ([r, g, b]) => 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
const contrast = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };

/* PNG 를 손으로 푼다 — 이 리포는 의존성을 안 늘린다(zlib 는 node 기본). */
const zlib = await import("node:zlib");
let p = 8, W = 0, H = 0, ctype = 2; const idat = [];
while (p < png.length) {
  const len = png.readUInt32BE(p), tag = png.toString("ascii", p + 4, p + 8);
  if (tag === "IHDR") { W = png.readUInt32BE(p + 8); H = png.readUInt32BE(p + 12); ctype = png[p + 17]; }
  if (tag === "IDAT") idat.push(png.subarray(p + 8, p + 8 + len));
  p += len + 12;
}
/* ★ **바이트 폭을 넘겨짚지 말 것.** RGBA(4) 로 못 박아 뒀더니 이 그림이 RGB(colorType 2)
   라 픽셀이 한 칸씩 밀려, 아군 바가 7264px → 15px 로 세어졌다. 세는 자가 틀리면
   멀쩡한 수정을 FAIL 로 몰아 되돌리게 된다. 머리에서 읽어 온다. */
const BPP = ctype === 6 ? 4 : ctype === 2 ? 3 : 0;
if (!BPP) { console.log(`FAIL\n  - 못 읽는 PNG colorType ${ctype}`); process.exit(1); }
const rawpx = zlib.inflateSync(Buffer.concat(idat)); const stride = W * BPP;
const img = Buffer.alloc(H * stride);
for (let y = 0, o = 0; y < H; y++) {              // 스캔라인 필터를 되돌린다
  const f = rawpx[o++];
  for (let x = 0; x < stride; x++) {
    const cur = rawpx[o + x], a = x >= BPP ? img[y * stride + x - BPP] : 0, b = y ? img[(y - 1) * stride + x] : 0,
          c = (x >= BPP && y) ? img[(y - 1) * stride + x - BPP] : 0;
    let v = cur;
    if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
    else if (f === 4) { const q = a + b - c, da = Math.abs(q - a), db = Math.abs(q - b), dc = Math.abs(q - c);
                        v += (da <= db && da <= dc) ? a : (db <= dc ? b : c); }
    img[y * stride + x] = v & 255;
  }
  o += stride;
}
/* ★ 여유를 ±10 으로 두었더니 **옛 적색이 149px 「아직 그려진다」**로 잡혀 FAIL 이 났는데,
   그림에는 옛 바가 하나도 없었다 — 벽·핏자국 같은 그림 픽셀이 그 반경에 들어온 것이다.
   바는 **납작한 단색으로 칠해지므로 정확히 그 값**이다(±0 과 ±3 의 셈이 같다).
   여유는 좁게 둔다 — 넓히면 배경을 바로 세게 된다. */
const near = (i, t) => Math.abs(img[i] - t[0]) <= 3 && Math.abs(img[i + 1] - t[1]) <= 3 && Math.abs(img[i + 2] - t[2]) <= 3;
const px = { ally: 0, foe: 0, lord: 0, old: 0 };
for (let i = 0; i < img.length; i += BPP) {
  if (near(i, ALLY)) px.ally++; else if (near(i, FOE)) px.foe++;
  else if (near(i, LORD)) px.lord++; else if (near(i, OLD)) px.old++;
}
const cFoe = contrast(FOE, SLOT), cLord = contrast(LORD, SLOT);
/* ★ 아군↔적은 **밝기대비로 재면 안 된다.** 초록과 주황빨강은 밝기가 비슷해 1.45:1 로
   나오는데, 눈에는 전혀 다른 색이다 — 그 자를 그대로 두면 **멀쩡한 색을 FAIL** 로 몬다.
   편이 갈리는지는 **색 거리**로 잰다. 다만 밝기가 붙어 있다는 사실은 버리지 않는다:
   적록 색각이상에는 이 짝이 약하므로 색만으로 편을 말하면 안 된다는 근거가 된다
   (아군은 발밑 룬 고리가 따로 있다). */
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const dSide = dist(ALLY, FOE), cSide = contrast(ALLY, FOE);
const fail = [];
if (cFoe < 2.5) fail.push(`적 바가 제 빈 칸에 묻힌다 ${cFoe.toFixed(2)}:1 (>=2.5 이어야)`);
if (dSide < 90) fail.push(`아군과 적 색이 너무 가깝다 거리 ${dSide.toFixed(0)} (>=90 이어야)`);
if (px.old > 40) fail.push(`옛 어두운 적 바가 아직 그려진다 ${px.old}px`);
if (px.foe < 40) fail.push(`적 바가 화면에 거의 없다 ${px.foe}px — 잰 것이 없다`);
console.log("판", JSON.stringify(state), "errs", errs.length ? errs : "0");
console.log(`바 픽셀  아군 ${px.ally} · 적 ${px.foe} · 주인 ${px.lord} · 옛색 ${px.old}`);
console.log(`빈칸대비 적 ${cFoe.toFixed(2)}:1 · 주인 ${cLord.toFixed(2)}:1`);
console.log(`아군↔적 색거리 ${dSide.toFixed(0)} · 밝기대비 ${cSide.toFixed(2)}:1 (밝기는 붙어 있다 — 색만으로 편을 말하지 않는다)`);
/* ★ 안 잰 것은 **안 잰 것이라고 말한다** — 조용히 통과시키면 「다 봤다」로 읽힌다. */
if (!px.lord) console.log("△ 관문 주인이 판에 없어 **주인 바는 못 쟀다**(색 계산만 통과).");
console.log(fail.length ? "FAIL\n  - " + fail.join("\n  - ") : "PASS");
process.exit(fail.length ? 1 : 0);
