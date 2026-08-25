/* V-71 자 — 「능력치」 창의 인물이 슬롯 축 한가운데에 서 있는가.
   눈으로 「가운데 같다」를 안 센다. **그려진 몸**의 세로 중심선과, 좌우 슬롯 기둥이
   이루는 축을 각각 재서 CSS px 로 견준다.

   ★ 몸을 어떻게 찾나 — `.pdChar img` 를 **그려진 크기 그대로** 캔버스에 옮겨 담고
     세로줄마다 불투명 픽셀을 센다. 그림에는 오른쪽으로 뻗은 **가는 꼬리**(지팡이)가
     있어서, 그 꼬리까지 세면 「그림 한가운데」가 나오고 **몸 한가운데**는 안 나온다.
     그래서 «제일 두꺼운 줄의 40% 이상» 인 줄만 몸으로 본다.
   ★ 축은 무엇인가 — `.pd-helm`(투구) 은 가운데 칸에 홀로 서므로 그 한가운데가 곧
     슬롯 축이다. 왼 기둥(`.pd-wand`)·오른 기둥(`.pd-robe`)이 그 축에 대칭인지도
     같이 확인한다(대칭이 아니면 이 자의 전제부터 틀린 것이라 미달로 끝낸다).
   ★ `V71_OLD=1` 이면 고치기 «전» 을 같은 판에서 다시 세운다(`__NOPDMID=1`).
     **「전」의 어긋남이 6px 를 안 넘으면 미달**로 내 양성 씨앗을 겸한다
     ([[silent-zero-is-not-an-observation]] · 실측 「전」 13px 대 문턱 6px,
      통과 문턱 2px 는 그 사이 [[floor-far-from-threshold]]).

   node tools/v71_dollmid.mjs        (고친 뒤)
   V71_OLD=1 node tools/v71_dollmid.mjs   (옛 꼴) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const OLD = process.env.V71_OLD === "1";
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

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
if (!(await ev(`typeof window.__openWin === "function"`))) { console.log("판정: 미달 — window.__openWin 이 없다"); process.exit(1); }
if (OLD) await ev(`window.__NOPDMID = 1`);        /* 창을 열기 «전»에 — 여는 그 순간 자리가 잡힌다 */
await ev(`window.__openWin("stat")`); await wait(600);

const r = await ev(`(async () => {
  const q = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect();
                     return { x: b.x, y: b.y, w: b.width, h: b.height, cx: b.x + b.width / 2 }; };
  const im = document.querySelector(".pdChar img");
  if (!im) return { err: ".pdChar img 이 없다" };
  if (!im.complete || !im.naturalWidth) await im.decode().catch(()=>{});   /* 늦게 오는 그림을 기다린다 */
  if (!im.naturalWidth) return { err: "인물 그림이 아직 안 왔다" };
  const b = im.getBoundingClientRect();
  const W = Math.max(1, Math.round(b.width)), H = Math.max(1, Math.round(b.height));
  const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
  const g = cv.getContext("2d"); g.imageSmoothingEnabled = false;
  g.drawImage(im, 0, 0, W, H);                       /* 그려진 크기 그대로 — contain 과 같은 셈(비율이 같다) */
  const d = g.getImageData(0, 0, W, H).data;
  const col = new Array(W).fill(0);
  for (let x = 0; x < W; x++) for (let y = 0; y < H; y++) if (d[((y * W + x) << 2) + 3] > 40) col[x]++;
  const mx = Math.max(...col);
  const body = []; for (let x = 0; x < W; x++) if (col[x] >= mx * 0.4) body.push(x);
  const all  = []; for (let x = 0; x < W; x++) if (col[x] > 0) all.push(x);
  if (!body.length) return { err: "몸을 못 찾았다(불투명 픽셀 0)" };
  const bodyMid = b.x + (body[0] + body[body.length - 1] + 1) / 2;
  const artMid  = b.x + (all[0]  + all[all.length - 1]  + 1) / 2;
  return { helm: q(".pd-helm"), wand: q(".pd-wand"), robe: q(".pd-robe"), img: { x: b.x, w: b.width, h: b.height },
           bodyMid, artMid, bodyW: body[body.length-1] - body[0] + 1, artW: all[all.length-1] - all[0] + 1,
           mid: im.style.getPropertyValue("--pdMid").trim(), tf: getComputedStyle(im).transform };
})()`);
if (!r || r.err) { console.log("판정: 미달 —", (r && r.err) || "잴 것이 없다"); process.exit(1); }

const axis = r.helm.cx;
const sym  = (r.wand.cx + r.robe.cx) / 2;                       /* 좌우 기둥의 한가운데 */
const off  = r.bodyMid - axis;
const offArt = r.artMid - axis;
const p1 = (v) => (v >= 0 ? "+" : "") + v.toFixed(1);
console.log(`${OLD ? "전" : "후"}  --pdMid=${r.mid || "(없음)"} · transform=${r.tf}`);
console.log(`  슬롯 축(투구 한가운데) ${axis.toFixed(1)} · 좌우 기둥 한가운데 ${sym.toFixed(1)} (어긋남 ${p1(sym - axis)})`);
console.log(`  그림 상자 ${r.img.x.toFixed(1)} 폭 ${r.img.w.toFixed(1)} · 몸 폭 ${r.bodyW} · 그림 폭 ${r.artW}`);
console.log(`  몸 중심선 ${r.bodyMid.toFixed(1)} → 축에서 ${p1(off)}px  ·  그림 중심선은 ${p1(offArt)}px`);
console.log("errs", errs);

const bad = [];
if (Math.abs(sym - axis) > 1.5) bad.push(`좌우 기둥이 투구 축과 안 맞는다(${p1(sym - axis)}px) — 이 자의 전제가 틀렸다`);
if (r.bodyW >= r.artW) bad.push(`몸 폭(${r.bodyW})이 그림 폭(${r.artW})과 같다 — 꼬리를 못 갈랐으니 잰 값을 믿을 수 없다`);
if (OLD) { if (Math.abs(off) < 6) bad.push(`「전」의 어긋남이 ${p1(off)}px 뿐이다 — 양성 씨앗이 안 된다(자를 의심할 것)`); }
else     { if (Math.abs(off) > 2) bad.push(`몸이 축에서 ${p1(off)}px 어긋났다(문턱 2px)`); }
if (errs.length) bad.push(`콘솔오류 ${errs.length}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과"}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
