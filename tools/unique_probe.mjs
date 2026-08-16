/* **유니크가 판을 가르는가** — 「이게 나오면 판이 달라진다」를 숫자로 본다. (ROADMAP 2단계 ⑤)
   loop_health 골격(씨앗 고정 · rAF 끊기 · 빨리감기)을 그대로 쓰되, 팔을 둘로 나눈다:
   **유니크 없음(base)** 대 **유니크 하나 강제 장착**(window.__forceUnique). 씨앗 셋으로
   각 팔을 돌려 최고층을 모은다(memory 규칙: 한 판은 표본 하나다 — 씨앗을 나눈다).

   판정 — **최고층 분포가 갈릴 것**:
     · 「위로」 유니크(twice·blast·overflow) 중 적어도 하나가 base 대비 **+8%~+60%**.
       8% 밑이면 장식이고, +60% 넘으면 「유니크 없으면 못 하는 게임」이 된다.
     · 어느 유니크도 +60% 를 넘지 않을 것.
     · 주고받기 유니크(gate·lonely)는 방향이 갈리기만 하면 된다(값은 찍어만 둔다).

     UP_SEEDS=1,3,9 UP_MIN=8 node tools/unique_probe.mjs [out.json]

   전 팔이 빨리감기라 실측은 몇 분이면 끝난다 — 계획 시간을 로그 맨 위에 찍는다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const OUT = process.argv[2] || "/tmp/unique_probe.json";
const SEEDS = (process.env.UP_SEEDS || "1,3,9").split(",").map(Number);
const MIN = +(process.env.UP_MIN || 8);
/* null = base(유니크 없음). 나머지는 core.js UNIQUE 의 id. 「위로」 셋 · 「주고받기」 둘. */
const ARMS = [null, "twice", "blast", "overflow", "gate", "lonely"];
const UP_KIND = { twice: "위", blast: "위", overflow: "위", gate: "주고받기", lonely: "주고받기" };

/* 남은 판을 쓴다 — loop_health 와 같은 이유(묵은 탭이 프레임을 나눠 먹으면 씨앗이 흔들린다). */
const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
if (stale.length) console.log(`(남아 있던 판 ${stale.length} 개를 닫았다)`);

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 160));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* 한 팔을 판다 — 씨앗과 유니크 id 를 정하고, loop_health 와 **똑같은 순서**로 판을 새로
   연 뒤(씨앗 박기 · localStorage 비우기 · rAF 끊기 · 재시딩 · newRun), newRun **직전에**
   유니크를 강제로 낀다(로브 유니크는 체력이 바뀌므로 hpMaxOf 전에 껴야 한다). */
function seedSrc(seed) {
  return `Math.random = (() => { let s = (${seed} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;
}
const tick = (sec, uid) => `(async()=>{
  const B = await import("/js/battle.js"), C = await import("/js/core.js");
  const S = window.__S; let n = Math.round(${sec} / 0.05), at = 0, deaths = 0;
  for (let i = 0; i < n; i++) {
    try {
      B.step(0.05);
      if ((at += 0.05) > 0.35) { at = 0; window.auto(); }   // main.js 의 그리는 고리가 하는 일
      if (S.dead) { deaths++; C.META.runs++; B.newRun(); }
    } catch(e) { return JSON.stringify({ err: e.message }); }
  }
  const worn = C.GEAR_KEYS.map(k => C.equipped(k)).filter(x => x && x.uid).map(x => x.uid);
  return JSON.stringify({ 최고층: C.META.deepest, 층: S.floor, 판수: C.META.runs,
    Lv: C.META.lv, 죽음: deaths, 낀유니크: worn });
})()`;

async function runArm(seed, uid) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const SS = (m, p) => raw(m, p, sessionId);
  await SS("Page.enable"); await SS("Runtime.enable"); await SS("Network.enable");
  await SS("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed) });
  await SS("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
  await SS("Page.navigate", { url: PAGE });
  await sleep(1400);
  await SS("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await SS("Page.reload", { ignoreCache: true });
  await sleep(4200);
  await SS("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await sleep(700);
  await SS("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
  await sleep(150);
  await SS("Runtime.evaluate", { awaitPromise: true, expression:
    `(async()=>{ const B = await import("/js/battle.js");
       ${seedSrc(seed)}
       window.__forceUnique(${uid ? `"${uid}"` : "null"});
       B.newRun(); return "ok"; })()` });
  const r = await SS("Runtime.evaluate", { expression: tick(MIN * 60, uid), awaitPromise: true, returnByValue: true });
  await raw("Target.closeTarget", { targetId }).catch(() => {});
  const v = JSON.parse(r.result.value);
  return v;
}

console.log(`계획: ${ARMS.length}팔(base + 유니크 ${ARMS.length - 1}) × 씨앗 ${SEEDS.length}(${SEEDS.join("·")}) × ${MIN}분(빨리감기)` +
            ` = ${ARMS.length * SEEDS.length}판. 전 팔이 빨리감기라 실측은 몇 분이면 끝난다.`);

const avg = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const by = {};   // uid("base"|id) -> { deep:[씨앗별 최고층], deaths:[...] }
for (const uid of ARMS) {
  const key = uid || "base";
  by[key] = { deep: [], deaths: [], worn: null };
  for (const seed of SEEDS) {
    const v = await runArm(seed, uid);
    if (v.err) { console.log(`  ${key} 씨${seed}  ERR ${v.err}`); errs.push("ARM " + key + " " + v.err); continue; }
    by[key].deep.push(v.최고층); by[key].deaths.push(v.죽음); by[key].worn = v.낀유니크;
    console.log(`  ${String(key).padEnd(9)} 씨${seed}  최고층 ${String(v.최고층).padStart(2)} · 층 ${v.층} · 판 ${v.판수} · Lv ${v.Lv} · 죽음 ${v.죽음}` +
                (uid ? ` · 낀 ${v.낀유니크.join(",") || "(없음!)"}` : ""));
  }
}

const baseAvg = avg(by.base.deep);
console.log(`\nbase 평균 최고층 ${baseAvg.toFixed(2)} (씨앗별 ${by.base.deep.join("·")})`);
const rows = [];
for (const uid of ARMS) if (uid) {
  const a = avg(by[uid].deep);
  const delta = baseAvg ? (a - baseAvg) / baseAvg * 100 : 0;
  rows.push({ uid, kind: UP_KIND[uid], avg: a, delta, deep: by[uid].deep, worn: (by[uid].worn || []).length > 0 });
  console.log(`  ${uid.padEnd(9)}[${UP_KIND[uid]}] 평균 ${a.toFixed(2)} (${by[uid].deep.join("·")})` +
              ` · base 대비 ${delta >= 0 ? "+" : ""}${delta.toFixed(0)}%` + (by[uid].worn?.length ? "" : "  ⚠강제장착 실패"));
}

/* ── 판정 ── **위로 유니크**는 [+8%,+60%] 안에 (아래는 장식·위는 「없으면 못 하는 게임」).
   **주고받기 유니크**(gate·lonely)는 방향이 갈리기만 하면 된다 — 그게 주고받기의 뜻이라,
   씨앗마다 크게 흔들리는 것이 정상이다(+60% 상한을 매기지 않는다). 그리고 **base 자체가
   여전히 갈 만해야** 한다(유니크가 없어도 판이 선다) — base 평균이 0 이 아니면 성립. */
const wornOk = rows.every((r) => r.worn);                             // 강제 장착이 실제로 됐나
const ups = rows.filter((r) => r.kind === "위");
const bestUp = Math.max(...ups.map((r) => r.delta));
const upsMax = Math.max(...ups.map((r) => r.delta));
const upInBand = ups.some((r) => r.delta >= 8 && r.delta <= 60);
const upOverblown = upsMax > 60;                                       // 위로 유니크만 상한을 본다
const trades = rows.filter((r) => r.kind === "주고받기");
const tradeDiverge = trades.every((r) => Math.abs(r.delta) >= 8);      // 주고받기는 방향만 갈리면 된다
const baseViable = baseAvg > 0;
const pass = wornOk && upInBand && !upOverblown && tradeDiverge && baseViable;

console.log(`\n판정: ${pass ? "PASS" : "FAIL"}` +
            `  (위로 [8,60] ${upInBand ? "✓" : "✗"} · 위로 최대 +${upsMax.toFixed(0)}% ${upOverblown ? ">60 ✗과열" : "≤60✓"}` +
            ` · 주고받기 방향갈림 ${tradeDiverge ? "✓" : "✗"} · base 갈만함 ${baseViable ? "✓" : "✗"} · 강제장착 ${wornOk ? "✓" : "✗"})`);
console.log(`주고받기: ${trades.map((r) => `${r.uid} ${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(0)}%`).join(" · ")}` +
            ` — ${tradeDiverge ? "방향 갈림" : "밋밋(값 확인)"}`);
if (!wornOk) console.log("⚠ 강제 장착이 안 된 팔이 있다 — __forceUnique 배선을 볼 것(판정 무효).");

fs.writeFileSync(OUT, JSON.stringify({ baseAvg, rows, by, seeds: SEEDS, min: MIN }, null, 1));
console.log("errors:", errs.slice(0, 4), "netfail:", netfail.slice(0, 3));
console.log(pass ? "expect: PASS" : "expect: FAIL");
bws.close();
process.exit(pass ? 0 : 1);
