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
/* ★ 한 주인만 파고들 때가 있다(고친 뒤 그 주인만 다시 재기). `LORDS=1` 로 고른다. */
const LORDS = (process.env.LORDS || "0,1,2,3").split(",").map(n => +n).filter(n => n >= 0 && n <= 3);
/* ★ 손잡이 통과 — 값을 코드에 박기 **전에** 같은 판에서 두 팔을 견준다(A/B).
   예: ADD_DMG=2.2 LORDS=1 node tools/gatelord_probe.mjs 8 1,7 */
const KNOBS = ["ADD_DMG", "ADD_CAP"].filter(k => process.env[k] != null)
  .map(k => `globalThis.__${k} = ${+process.env[k]};`).join(" ");
if (KNOBS) console.log(`손잡이: ${KNOBS}`);
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
  globalThis.__FORCE_LORD = ${lord}; ${KNOBS}
  Math.random = (() => { let s = (${seed} >>> 0) || 1;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();`;

async function runCombo(lord, seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  open.add(targetId);
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc(seed, lord) });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
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
    const S = window.__S; globalThis.__FORCE_LORD = ${lord}; ${KNOBS}
    window.__share = window.__share || { gate: {}, off: {} }; window.__hi = window.__hi | 0;
    let n = Math.round(60 / 0.05), at = 0;
    for (let i = 0; i < n; i++) {
      try {
        B.step(0.05);
        if ((at += 0.05) > 0.35) { at = 0; window.auto(); }   // main.js 의 그리는 고리가 하던 자동 소환
        /* ★ **죽은 원인만 세면 「얼마나 차이로 졌는지」를 모른다**(2026-08-16). 넷 다
           melee 가 최다인데, 수법이 약해서인지 **평지 졸개 떼의 근접 합이 커서**인지는
           사인 분포로 갈리지 않는다. 그래서 맞은 피해를 **원인별로 합산**한다 —
           고칠 자리가 「수법을 키운다」인지 「관문에 떼를 줄인다」인지가 여기서 갈린다. */
        { const lg = S.hurtLog || [];
          if (lg.length < window.__hi) window.__hi = 0;       // 판이 새로 열려 비워졌다
          const gate = C.isGate(S.floor);
          for (; window.__hi < lg.length; window.__hi++) {
            const e = lg[window.__hi], b = gate ? window.__share.gate : window.__share.off;
            b[e.cause] = (b[e.cause] || 0) + e.dmg; } }
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
    `JSON.stringify({ deaths: (window.__deathLog || []).map(d => ({ floor: d.floor, gate: d.gate, cause: d.cause })),
                      share: (window.__share || { gate: {}, off: {} }).gate })` });
  await raw("Target.closeTarget", { targetId }); open.delete(targetId);
  if (err) console.log(`  [L${lord} s${seed}] ${err}`);
  return JSON.parse(r.result.value || '{"deaths":[],"share":{}}');   // 관문·평지 모두(가른다)
}

const dist = {}, offGate = {}, dmgShare = {};
for (const lord of LORDS) {
  dist[lord] = {}; offGate[lord] = {}; dmgShare[lord] = {};
  for (const seed of SEEDS) {
    const { deaths: all, share } = await runCombo(lord, seed);
    for (const k in share) (dmgShare[lord][k] = (dmgShare[lord][k] || 0) + share[k]);
    const gate = all.filter(d => d.gate), off = all.filter(d => !d.gate);
    for (const d of gate) dist[lord][d.cause] = (dist[lord][d.cause] || 0) + 1;
    for (const d of off) offGate[lord][d.cause] = (offGate[lord][d.cause] || 0) + 1;
    const floors = [...new Set(gate.map(d => d.floor))].sort((a, b) => a - b).join(",");
    console.log(`  L${lord} ${NAMES[lord].padEnd(20)} 씨${String(seed).padStart(2)}: 관문죽음 ${gate.length} (층 ${floors || "-"}) · 평지죽음 ${off.length}`);
  }
}

/* 관문에서 **맞은 피해**의 원인별 몫 — 사인이 melee 로 쏠릴 때 「얼마나 차이로」인지를 본다. */
console.log("\n═══ 관문에서 맞은 피해의 몫 ═══");
for (const lord of LORDS) {
  const d = dmgShare[lord], tot = Object.values(d).reduce((a, b) => a + b, 0);
  console.log(`L${lord} ${NAMES[lord].padEnd(20)} ` + (tot
    ? Object.entries(d).sort((a, b) => b[1] - a[1])
        .map(([c, v]) => `${c} ${Math.round(v / tot * 100)}%`).join(" · ") + `  (합 ${Math.round(tot)})`
    : "(관문에서 안 맞았다)"));
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

/* ══ 판정을 «맞은 피해의 몫»으로 바꾼다 ══ (2026-08-16)
   여태는 **죽은 원인**으로 갈랐고 넷 다 melee 라 FAIL 이었다. 그런데 몫을 재 보니
   pool 99% · charge 95% · curse 90% 였다 — **수법이 체력을 거의 다 깎아 놓고, 마지막
   5초의 잔챙이 근접이 숨통을 끊은 것**이다. 사인은 `S.hurtLog` 의 **최근 5초 합**으로
   정하므로(battle.js), 몰아치는 수법(주기 3.8~5.0초)보다 **쉬지 않고 갉는 근접**에
   구조적으로 유리하다. 99% 를 맞고 죽은 사람에게 「너를 죽인 건 잔챙이다」라고 하는 자는
   **틀린 것을 묻고 있었다.**
   그래서 묻는 말을 바꾼다 — 「이 주인의 수법이 이 관문을 **정하는가**」.
   ★ 무르지 않았다는 증거(보정): 오늘 A/B 에서 소환사는 `__ADD_DMG=1`(옛 기본)일 때
     add 33% < melee 67% 로 **이 판정에서도 틀린다**. 3.2 로 올려서야 73% 가 됐다.
   ★ 죽은 원인 분포는 계속 찍는다 — 판정에서 뺐을 뿐, 「무엇이 숨통을 끊었나」는 여전히
     읽을거리다(잔챙이가 늘 마지막을 차지하면 그건 그것대로 볼 일이다). */
const SHARE_MIN = 50;
const shares = LORDS.map(lord => {
  const d = dmgShare[lord], tot = Object.values(d).reduce((a, b) => a + b, 0);
  const pct = tot ? Math.round((d[WANT[lord]] || 0) / tot * 100) : 0;
  const top = tot ? Object.entries(d).sort((a, b) => b[1] - a[1])[0][0] : "?";
  return { lord, pct, top, tot };
});
const badShare = shares.filter(x => !x.tot || x.top !== WANT[LORDS.indexOf(x.lord) >= 0 ? x.lord : 0] || x.pct < SHARE_MIN);
const low = tops.filter(t => t.tot < 3);
const pass = badShare.length === 0;
console.log(`\n최다 사인(참고): ` + tops.map(t => `L${t.lord}=${t.top}`).join(" · "));
console.log(`수법의 몫: ` + shares.map(x => `L${x.lord} ${WANT[x.lord]} ${x.pct}%`).join(" · "));
if (low.length) console.log(`⚠ 관문죽음이 적다(<3): ` + low.map(t => `L${t.lord}(${t.tot})`).join(" · ") + ` — 사인 분포는 참고만`);
console.log(`판정: ${pass ? "PASS" : "FAIL"} — ` +
  (pass ? `주인 넷 다 제 수법이 관문 피해의 절반을 넘는다(≥${SHARE_MIN}%)`
        : badShare.map(x => x.tot ? `L${x.lord} 는 ${WANT[x.lord]} 가 ${x.pct}% 뿐(최다는 ${x.top})`
                                  : `L${x.lord} 는 관문에서 한 대도 안 맞았다`).join(" · ")));
console.log("errors:", errs.slice(0, 3), "netfail:", netfail.slice(0, 3));
try { bws.close(); } catch {}
process.exit(pass && !errs.length ? 0 : 1);
