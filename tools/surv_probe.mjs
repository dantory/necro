/* **처음 켠 사람이 1층에서 살아남는가** — 여러 번 재서 «동전 던지기 폭»을 본다.
     node tools/surv_probe.mjs [판수=5] [초=45]

   W-1b(ROADMAP)가 적어 둔 것: 씨앗을 박아도 **벽시계 dt** 때문에 판이 실행마다 갈린다
   ([[same-seed-is-not-same-run]]). W-1 을 「고쳤다」고 닫은 근거는 first_look **한 판**이었다.
   한 판은 표본 하나다([[seed-the-probe]]) — 그래서 같은 씨앗으로 **여러 번** 돌려 죽는
   비율을 센다.

   ★ 진짜 새 사람의 길로 간다([[probe-must-walk-the-real-path]]):
     저장을 지우고 · `__AUTO_TREE` 를 **안 켜고**(스킬 0) · rAF 를 안 끊고 실시간으로 둔다.
   재는 것: 죽었는가 · 몇 초에 · 어느 층에서 · 체력비 최저 · 닿은 층 · 군세. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const RUNS = +(process.argv[2] || 5), SEC = +(process.argv[3] || 45);
const SEED = +(process.env.NECRO_SEED || 3);
/* 팔을 가르는 한 줄 — 새 문서마다 씨앗 바로 뒤에 실린다(reload 를 넘긴다).
   예: NECRO_SETUP='globalThis.__EARLY_HP=2.0' */
const SETUP = process.env.NECRO_SETUP || "";
if (SETUP) console.log(`팔: ${SETUP}`);

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter(t => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); let errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 120)); });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

const out = [];
for (let n = 0; n < RUNS; n++) {
  errs = [];
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async expr => { const r = await S("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.exceptionDetails) throw new Error("page: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200));
    return r.result.value; };
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  /* 씨앗은 박되 **rAF 는 그대로 둔다** — 흔들리는 것이 무엇인지가 이 자의 물음이다. */
  await S("Page.addScriptToEvaluateOnNewDocument", { source:
    `Math.random = (() => { let s = ${SEED}; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`
    + (SETUP ? `\n${SETUP};` : "") });
  await S("Page.navigate", { url: PAGE }); await wait(1500);
  await ev(`localStorage.removeItem("necro.meta.v1"); true`);
  await S("Page.reload", { ignoreCache: true }); await wait(3400);
  await ev(`window.__toDungeon(); true`);

  const SNAP = `(()=>{const S=window.__S;return{t:+S.t.toFixed(2),floor:S.floor,hp:Math.round(S.hp),
    hpMax:Math.round(S.hpMax||1),army:S.minions.length,mobs:S.mobs.length,dead:!!S.dead}})()`;
  let deadAt = null, deadFloor = null, minFrac = 1, maxFloor = 1, last = null;
  const t0 = Date.now();
  while (Date.now() - t0 < SEC * 1000) {
    const r = await ev(SNAP); last = r;
    minFrac = Math.min(minFrac, r.hp / Math.max(1, r.hpMax));
    maxFloor = Math.max(maxFloor, r.floor);
    if (r.dead && deadAt === null) { deadAt = r.t; deadFloor = r.floor; break; }
    await wait(250);
  }
  await raw("Target.closeTarget", { targetId });
  out.push({ n: n + 1, dead: deadAt !== null, deadAt, deadFloor, maxFloor, minFrac: +minFrac.toFixed(2),
             t: last?.t, army: last?.army, err: errs.length });
  console.log(`판${n + 1}  ${deadAt !== null ? `☠ ${deadAt.toFixed(1)}초 · ${deadFloor}층` : `살아남음 · ${maxFloor}층`}`
    + ` · 체력비 최저 ${(minFrac * 100) | 0}% · 군세 ${last?.army} · 오류 ${errs.length}`);
}
const dead = out.filter(r => r.dead);
console.log(`\n═══ ${RUNS}판 중 죽음 ${dead.length} (${Math.round(dead.length / RUNS * 100)}%)`
  + (dead.length ? ` · 죽은 때 ${dead.map(r => r.deadAt.toFixed(0) + "초").join(" ")}` : "")
  + ` · 닿은 층 ${out.map(r => r.maxFloor).join(" ")} · 체력비 최저 ${out.map(r => (r.minFrac * 100) | 0 + "").join(" ")}`);
console.log(JSON.stringify(out));
process.exit(0);
