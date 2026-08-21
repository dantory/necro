/* 「구역이 정말 갈리는가」 — 자 하나. (ROADMAP G-b)
   G-b 는 「80층이 1층과 같은 방이다」를 고치는 항목이다. 고쳤다고 말하려면 **무엇이
   얼마나 갈렸는지**를 수로 대야 한다 — 이름만 붙이고 속이 같으면 그건 간판이다.

   네 가지를 잰다:
     ① 층 → 구역 표가 끊김 없이 이어지는가(1..MAXF 가 전부 구역 하나에 든다)
     ② 화면이 갈리는가 — 이웃한 구역의 (타일, 색 기운) 짝이 서로 다른가
     ③ 적이 갈리는가 — 구역별 졸개 식구
     ④ **드랍표가 실제로 갈리는가** — 구역마다 rollDrop 을 TRIALS 번 굴려 슬롯 분포를
        내고, 이웃 구역과의 **총변동거리**(TVD)를 잰다. 이름만 다르고 분포가 같으면
        여기서 0 이 뜬다.
   ★ 그리고 **회귀 하나**: 구역 표는 옛 `MOB_TIERS` 를 접어 넣은 것이라 적 구성이
     한 톨도 바뀌면 안 된다. 옛 표를 여기 박아 두고 층마다 대조한다.

   판정: ①이 빈틈없고 ②가 이웃마다 다르고 ④의 TVD 가 전부 TVD_MIN 이상.

     node tools/zone_probe.mjs            # 표 + 판정
     node tools/zone_probe.mjs --json     # 기계용
   * depth_probe 와 같은 뼈대(CDP 9333 + 8774/index.html) — 사람이 지나는 그 길로 잰다. */
const JSON_OUT = process.argv.includes("--json");
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "")); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);
  const MAXF = 80, TRIALS = 6000;
  /* ── 옛 MOB_TIERS(구역으로 접기 전) — 적 구성 회귀를 여기서 잡는다 ── */
  const OLD = [
    { from: 1,  kinds: ["fallen"] },
    { from: 4,  kinds: ["fallen","zombie"] },
    { from: 9,  kinds: ["fallen","zombie","skelarch"] },
    { from: 16, kinds: ["zombie","skelarch","brute"] },
    { from: 26, kinds: ["skelarch","brute","brute"] },
  ];
  const oldKinds = (f) => ([...OLD].reverse().find(x => f >= x.from) || OLD[0]).kinds;

  /* ① 빈틈 없는가 + ★ 적 구성 회귀 */
  const holes = [], regress = [];
  for (let f = 1; f <= MAXF; f++) {
    const z = C.zoneOf(f);
    if (!z) { holes.push(f); continue; }
    if (f < z.from) holes.push(f);
    const a = C.zoneKinds(f).join("/"), b = oldKinds(f).join("/");
    if (a !== b) regress.push(f + ": " + a + " ≠ " + b);
  }

  /* ④ 구역별 슬롯 분포 — rollDrop 을 그대로 굴린다(유니크는 슬롯이 없으니 뺀다). */
  const mid = (z, i) => Math.min(MAXF, i + 1 < C.ZONES.length
    ? Math.floor((z.from + C.ZONES[i + 1].from - 1) / 2) : z.from + 10);
  const zs = C.ZONES.map((z, i) => {
    const f = mid(z, i), cnt = {};
    for (const k of C.GEAR_KEYS) cnt[k] = 0;
    let n = 0;
    for (let t = 0; t < TRIALS; t++) {
      C.S.uniqCtr = 0;                       // 유니크 회전이 슬롯 분포를 흐리지 않게
      const it = C.rollDrop(f);
      if (it && cnt[it.k] != null) { cnt[it.k]++; n++; }
    }
    const p = {}; for (const k of C.GEAR_KEYS) p[k] = cnt[k] / Math.max(1, n);
    const top = Object.entries(p).sort((a, b) => b[1] - a[1]).slice(0, 2);
    return { n: z.n, from: z.from, f, tile: z.tile, tint: z.tint || "-",
             kinds: z.kinds.join("/"), p, top: top.map(([k, v]) => k + " " + (v * 100).toFixed(1) + "%") };
  });
  /* 이웃 사이 총변동거리 — 반쯤 겹치면 0.5, 판박이면 0 */
  for (let i = 1; i < zs.length; i++) {
    let tvd = 0;
    for (const k of C.GEAR_KEYS) tvd += Math.abs(zs[i].p[k] - zs[i - 1].p[k]);
    zs[i].tvd = tvd / 2;
    zs[i].look = (zs[i].tile + "|" + zs[i].tint) !== (zs[i - 1].tile + "|" + zs[i - 1].tint);
  }
  return JSON.stringify({ zs, holes, regress });
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
if (r.exceptionDetails) { console.error(JSON.stringify(r.exceptionDetails)); process.exit(2); }
const { zs, holes, regress } = JSON.parse(r.result.value);
await S("Target.closeTarget", { targetId });

const TVD_MIN = 0.05;                        // 이웃 구역 드랍 분포가 최소 이만큼은 갈려야
const tvds = zs.slice(1).map(z => z.tvd);
const looks = zs.slice(1).every(z => z.look);
const ok = holes.length === 0 && regress.length === 0 && looks
        && tvds.every(v => v >= TVD_MIN) && errs.length === 0;
if (JSON_OUT) { console.log(JSON.stringify({ zs, holes, regress, looks, ok, errs })); process.exit(ok ? 0 : 1); }

console.log("층부터  구역          바닥    색기운    졸개                      잘 나오는 것        이웃과 TVD");
for (const z of zs)
  console.log(String(z.from).padStart(5) + "  " + z.n.padEnd(12) + "  " + z.tile.padEnd(6) + "  "
    + String(z.tint).padEnd(8) + "  " + z.kinds.padEnd(24) + "  "
    + z.top.join(" · ").padEnd(18) + "  " + (z.tvd == null ? "-" : z.tvd.toFixed(3)));
console.log("\n층 빈틈: " + (holes.length ? holes.join(",") : "없음"));
console.log("적 구성 회귀(옛 MOB_TIERS 대조): " + (regress.length ? regress.join(" / ") : "없음 — 한 톨도 안 바뀜"));
console.log("이웃마다 화면이 갈리는가: " + (looks ? "예" : "아니오"));
console.log("이웃 드랍표 TVD 최소 " + Math.min(...tvds).toFixed(3) + " (문턱 " + TVD_MIN + ")");
for (const e of errs) console.log("  " + e);
console.log(ok ? "\n판정: 통과" : "\n판정: 실패");
process.exit(ok ? 0 : 1);
