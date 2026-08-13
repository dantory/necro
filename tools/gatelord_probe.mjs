/* 관문 주인마다 죽은 원인이 다른가 — 주인 넷을 각각 세워 **실제로 판을 돌리고** 죽은 원인
   분포를 모은다(window.__deathLog). 주인은 globalThis.__FORCE_LORD 로 고정하되 판은 실제
   경로로 굴린다: 1층부터 내려가 관문에 진짜로 들어선다(지름길로 상태를 손으로 세우지 않는다).

     node tools/gatelord_probe.mjs [분/씨앗] [씨앗들]
     node tools/gatelord_probe.mjs 18 1,7,13

   판정: 주인 넷의 **최다 사인**이 서로 갈릴 것. 한 사인이 넷 중 **셋 이상**에서 최다면 FAIL
   (같으면 이름만 바꾼 것이다). 주인마다 **최소 3 씨앗**(memory: 한 판은 표본 하나).
   ★ loop_health 의 골격 그대로 — 씨앗을 박고(같은 판) · rAF 를 끊고(빨리 감기만이 시간) ·
     step 을 직접 돌리고 auto() 를 제 박자로 부른다. 이걸 안 하면 씨앗을 박아도 판이 다르다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const MIN = +(process.argv[2] || 18);
const SEEDS = (process.argv[3] || "1,7,13").split(",").map(s => +s).filter(Boolean);
const LORDS = [0, 1, 2, 3];
const NAMES = ["역병술사(장판)", "뼈 부리는 자(소환)", "짓쳐드는 파수꾼(돌진)", "저주받은 왕(저주)"];
const WANT = ["pool", "add", "charge", "curse"];

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter(t => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
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

/* 잘려도(SIGTERM·예외) 열어 둔 탭을 두고 가지 않는다 — 비동기 CDP 는 종료 중에 못 쓰므로 curl 로 닫는다. */
const open = new Set();
{ const { execFileSync } = await import("node:child_process");
  const shut = () => { for (const t of open) { try { execFileSync("curl", ["-s", `${CDP}/json/close/${t}`]); } catch {} } };
  for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) process.on(sig, () => { shut(); process.exit(1); });
  process.on("uncaughtException", (e) => { console.error(e); shut(); process.exit(1); }); }

/* 판이 뜨기 전에 심는 것 둘: **주인 고정**(그 층에 어느 주인이 서든 이 주인)과 **씨앗**(같은 판). */
const seedSrc = (seed, lord) => `
  globalThis.__FORCE_LORD = ${lord};
  Math.random = (() => { let s = (${seed} >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

async function runCombo(lord, seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  open.add(targetId);
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed, lord) });
  await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
  await S("Page.navigate", { url: PAGE });
  await new Promise(r => setTimeout(r, 1500));
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true });
  await new Promise(r => setTimeout(r, 4500));
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await new Promise(r => setTimeout(r, 900));
  /* rAF 를 끊어 **빨리 감기만이 유일한 시간**이 되게 하고, 난수를 다시 심어 판을 새로 연다. */
  await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
  await new Promise(r => setTimeout(r, 150));
  await S("Runtime.evaluate", { awaitPromise: true, expression:
    `(async()=>{ const B = await import("/js/battle.js"); ${seedSrc(seed, lord)} B.newRun(); return "ok"; })()` });

  const chunk = `(async()=>{
    const B = await import("/js/battle.js"), C = await import("/js/core.js");
    const S = window.__S; globalThis.__FORCE_LORD = ${lord};
    let n = Math.round(60 / 0.05), at = 0;
    for (let i = 0; i < n; i++) {
      try {
        B.step(0.05);
        if ((at += 0.05) > 0.35) { at = 0; window.auto(); }   // main.js 의 그리는 고리가 하던 자동 소환
        if (S.dead) { C.META.runs++; B.newRun(); }            // 사람이 「다시」를 누르는 몫
      } catch (e) { return "ERR " + e.message; }
    }
    return "ok";
  })()`;
  let err = null;
  for (let m = 0; m < MIN; m++) {
    const r = await S("Runtime.evaluate", { expression: chunk, awaitPromise: true, returnByValue: true });
    if (typeof r.result.value === "string" && r.result.value.startsWith("ERR")) { err = r.result.value; break; }
  }
  const r = await S("Runtime.evaluate", { returnByValue: true, expression:
    `JSON.stringify((window.__deathLog || []).map(d => ({ floor: d.floor, gate: d.gate, cause: d.cause })))` });
  await raw("Target.closeTarget", { targetId }); open.delete(targetId);
  if (err) console.log(`  [L${lord} s${seed}] ${err}`);
  return JSON.parse(r.result.value || "[]");   // 관문·평지 모두(가른다)
}

const dist = {}, offGate = {};
for (const lord of LORDS) {
  dist[lord] = {}; offGate[lord] = {};
  for (const seed of SEEDS) {
    const all = await runCombo(lord, seed);
    const gate = all.filter(d => d.gate), off = all.filter(d => !d.gate);
    for (const d of gate) dist[lord][d.cause] = (dist[lord][d.cause] || 0) + 1;
    for (const d of off) offGate[lord][d.cause] = (offGate[lord][d.cause] || 0) + 1;
    const floors = [...new Set(gate.map(d => d.floor))].sort((a, b) => a - b).join(",");
    console.log(`  L${lord} ${NAMES[lord].padEnd(20)} 씨${String(seed).padStart(2)}: 관문죽음 ${gate.length} (층 ${floors || "-"}) · 평지죽음 ${off.length}`);
  }
}

console.log("\n═══ 주인별 죽은 원인 분포 ═══");
const tops = [];
for (const lord of LORDS) {
  const d = dist[lord], tot = Object.values(d).reduce((a, b) => a + b, 0);
  const parts = Object.entries(d).sort((a, b) => b[1] - a[1]);
  const top = parts.length ? parts[0][0] : "?";
  tops.push({ lord, top, tot });
  const off = offGate[lord], offParts = Object.entries(off).sort((a, b) => b[1] - a[1]);
  console.log(`L${lord} ${NAMES[lord].padEnd(20)} n=${String(tot).padStart(2)}  ` +
    (parts.map(([c, n]) => `${c} ${Math.round(n / Math.max(1, tot) * 100)}%`).join(" · ") || "(관문죽음 없음)") +
    `  → 최다 ${top}` + (top === WANT[lord] ? " ✓" : ` (의도 ${WANT[lord]})`));
  if (tot < 3 && offParts.length)
    console.log(`     ↳ 평지죽음 ${offParts.reduce((a, b) => a + b[1], 0)}: ` + offParts.map(([c, n]) => `${c} ${n}`).join(" · "));
}

const byTop = {};
for (const t of tops) byTop[t.top] = (byTop[t.top] || 0) + 1;
const maxShared = Math.max(0, ...Object.values(byTop));
const low = tops.filter(t => t.tot < 3);
const pass = maxShared < 3 && low.length === 0;
console.log(`\n최다 사인: ` + tops.map(t => `L${t.lord}=${t.top}`).join(" · "));
if (low.length) console.log(`⚠ 표본 부족(관문죽음<3): ` + low.map(t => `L${t.lord}(${t.tot})`).join(" · ") + ` — 분/씨앗을 늘릴 것`);
console.log(`판정: ${pass ? "PASS" : "FAIL"} — ` +
  (maxShared >= 3 ? `한 사인이 ${maxShared} 주인에서 최다다(같으면 이름만 바꾼 것)`
   : low.length ? "표본이 모자라 못 가른다" : "주인 넷의 최다 사인이 서로 갈렸다"));
console.log("errors:", errs.slice(0, 3), "netfail:", netfail.slice(0, 3));
try { bws.close(); } catch {}
process.exit(pass && !errs.length ? 0 : 1);
