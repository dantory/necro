/* **층마다 방이 다른가**를 잰다 (2026-08-24 · V-17)
     node tools/v17_room_probe.mjs [층수=14]
   층을 하나씩 갈아 끼우며 ① 놓인 소품 수 ② 소품 이름표(어느 자리에 무엇) ③ 맵 띠의
   평균 밝기 를 잰다. 보는 것 셋:
     · **같은 방이 두 번 나오는가**(이름표가 겹치면 그 두 층은 같은 방이다 — V-17 이전엔 전부 같았다)
     · **소품이 0 인 층**(텅 빈 주차장) 이 있는가
     · **깜깜한 층**(밝기 바닥) 이 있는가 — 화로가 안 걸리면 그 층만 어둡다 */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const N = +(process.argv[2] || 14);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async (expression) => (await S("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true })).result.value;
await S("Page.enable"); await S("Runtime.enable");
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.navigate", { url: PAGE }); await wait(4200);
process.stderr.write("  ..페이지 뜸\n");
await ev(`window.__toDungeon && window.__toDungeon()`); await wait(1200);
process.stderr.write("  ..던전 들어감\n");

const rows = [];
for (let f = 1; f <= N; f++) {
  /* 층만 갈아 끼운다 — 싸움은 그대로 두고 «방»만 본다. */
  await ev(`(()=>{ window.__S.floor = ${f}; globalThis.__scatterCount = 1; globalThis.__scatterHits = [];
                   globalThis.__gbust = (globalThis.__gbust||0) + 1; })()`);
  await wait(700);                                     // 층이 바뀌고 바닥이 자리 잡을 틈
  /* ★ **여기서 장부를 비우고 «한 판만» 다시 굽힌다.** 층이 갈리는 사이에 두 번 구워지면
     같은 방이 두 몫으로 담겨 개수가 두 배로 보인다(1층만 94, 나머지가 180 이던 까닭). */
  await ev(`(()=>{ globalThis.__scatterHits = []; globalThis.__gbust++; })()`);
  await wait(450);
  const r = await ev(`(()=>{ const hits = globalThis.__scatterHits || [];
    const cv = document.querySelector("canvas"); const c = cv.getContext("2d");
    const d = c.getImageData(0, 0, cv.width, Math.min(560, cv.height)).data;
    let sum = 0, n = 0; for (let i = 0; i < d.length; i += 4 * 37) { sum += (d[i] + d[i+1] + d[i+2]) / 3; n++; }
    /* 이름표 — 자리를 20px 로 뭉뚱그려 «어디에 무엇» 만 남긴다(흔들림에 안 흔들리게). */
    /* ★ 바닥이 한 층에서 **두 번 구워질 수 있다**(층이 바뀌며 한 번 · __gbust 로 한 번).
       그러면 같은 소품이 두 번 담겨 개수가 두 배로 보인다 — 이름표로 겹친 것을 지운다. */
    const uniq = Array.from(new Set(hits.map(function (h) { return h[2] + Math.round(h[0]/20) + "," + Math.round(h[1]/20); })));
    const tag = uniq.sort().join("|");
    return JSON.stringify({ n: uniq.length, lum: +(sum / n).toFixed(1), tag }); })()`);
  rows.push({ f, ...JSON.parse(r) });
  process.stderr.write(`  ..${f}층 잼\n`);
}
await raw("Target.closeTarget", { targetId });

const seen = new Map(); const dup = [];
for (const r of rows) { if (seen.has(r.tag)) dup.push(`${seen.get(r.tag)}층=${r.f}층`); else seen.set(r.tag, r.f); }
const ns = rows.map(r => r.n), lums = rows.map(r => r.lum);
bws.close();
console.log(rows.map(r => `${r.f}층 소품 ${String(r.n).padStart(3)} · 밝기 ${r.lum}`).join("\n"));
console.log(`── 서로 다른 방 ${seen.size}/${rows.length}` + (dup.length ? ` · ★겹침 ${dup.join(" ")}` : " · 겹침 없음"));
console.log(`   소품 ${Math.min(...ns)}~${Math.max(...ns)} (평균 ${(ns.reduce((a,b)=>a+b,0)/ns.length).toFixed(1)}) · 밝기 ${Math.min(...lums)}~${Math.max(...lums)}`);
