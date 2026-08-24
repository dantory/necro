/* V-41 자 — **한 화면에 같은 그림이 몇 번 되풀이되나.**
   던전 바닥은 화면의 대부분인데 거기 서 있는 것이 `SCATTER` 다섯 장뿐이라,
   기둥 다섯·석관 셋이 **한 톨도 안 다른 복사본**으로 흩어져 있다.
   (바닥 타일에는 이미 고친 결함이다 — `loadFloor` 는 뒤집기 넷 × 밝기 셋을
    미리 구워 자리마다 골라 쓴다. 소품에는 안 옮겨져 있었다.)

   재는 법은 **놓는 자리에서 직접 받는다** — `drawScatter` 가 `__scatterCount` 를 켜면
   놓은 것을 `__scatterHits` 에 `[x, y, name, vi]` 로 밀어 넣는다(V-10 이 낸 자다).
   매 프레임 다시 밀리므로 **자리로 겹침을 지워** 한 판 몫만 센다.

   내는 수 (하나가 아니라 셋이다 · [[floor-far-from-threshold]]):
     · 놓인 것 N        — 화면에 실제로 선 소품 수
     · 서로 다른 그림 V — (이름 × 변형) 가짓수. 이게 클수록 눈이 주기를 못 찾는다
     · 되풀이 N/V       ← **재려는 것.** 1.0 이면 전부 다른 그림, 4.0 이면 넉 장에 한 번씩 같다
     · 제일 많이 겹친 한 장이 몇 번

     node tools/v41_props.mjs
     V41_FLOORS=1,2,3 node tools/v41_props.mjs */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, URL = "http://127.0.0.1:8774/index.html";
const FLOORS = (process.env.V41_FLOORS || "1,2").split(",").map(s => +s.trim()).filter(Boolean);
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

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: URL }); await wait(1500);
await ev(`localStorage.removeItem("necro.meta.v1")`);
await S("Page.reload", { ignoreCache: true }); await wait(3200);
await ev(`window.__toDungeon && window.__toDungeon()`);
await wait(1200);

const rows = [];
for (const f of FLOORS) {
  /* 층은 **배치 씨앗**을 바꾼다(V-17 의 layoutOX/OY) — 층마다 다른 방을 본다. */
  await ev(`window.__S && (window.__S.floor = ${f})`);   // syncZone 이 매 프레임 읽는다
  await wait(700);
  /* ★★ **바닥은 구워서 캐시에 둔다** — `drawScatter` 는 매 프레임 도는 게 아니라
     캐시 열쇠가 바뀔 때만 돈다. 세기만 켜고 기다리면 **0 을 돌려받는다**
     (실제로 그랬다 · [[silent-zero-is-not-an-observation]]).
     그래서 켠 다음 `__gbust` 를 올려 **다시 굽게 한다**(ground.js 가 낸 문). */
  await ev(`globalThis.__scatterCount = 1; globalThis.__scatterHits = [];
            globalThis.__gbust = (globalThis.__gbust || 0) + 1;`);
  await wait(400);
  const hits = await ev(`(() => { const h = globalThis.__scatterHits || [];
      globalThis.__scatterCount = 0; globalThis.__scatterHits = [];
      const seen = new Map();
      for (const [x, y, n, vi] of h) seen.set(Math.round(x) + "," + Math.round(y), n + "#" + (vi == null ? "-" : vi));
      const per = {}; for (const v of seen.values()) per[v] = (per[v] || 0) + 1;
      const kinds = {}; for (const v of seen.values()) { const n = v.split("#")[0]; kinds[n] = (kinds[n] || 0) + 1; }
      return { N: seen.size, per, kinds }; })()`);
  const V = Object.keys(hits.per).length;
  const worst = Object.entries(hits.per).sort((a, b) => b[1] - a[1])[0] || ["-", 0];
  rows.push({ f, N: hits.N, kinds: Object.keys(hits.kinds).length, V,
              rep: hits.N && V ? hits.N / V : 0, worst });
  console.log(`${f}층 · 놓인 것 ${hits.N} · 이름 ${Object.keys(hits.kinds).length} · 서로 다른 그림 ${V}` +
              ` · 되풀이 ${(hits.N / (V || 1)).toFixed(2)} · 제일 많이 겹친 ${worst[0]} ×${worst[1]}`);
  console.log(`      이름별: ` + Object.entries(hits.kinds).map(([k, v]) => `${k} ${v}`).join(" · "));
}
const N = rows.reduce((a, r) => a + r.N, 0), rep = rows.reduce((a, r) => a + r.rep, 0) / (rows.length || 1);
console.log(`══ 층 ${rows.length}개 · 놓인 것 ${N} · **되풀이 평균 ${rep.toFixed(2)}** · 콘솔오류 ${errs.length}`);
if (errs.length) console.log(errs.slice(0, 3).join("\n"));
await raw("Target.closeTarget", { targetId });
bws.close(); process.exit(0);
