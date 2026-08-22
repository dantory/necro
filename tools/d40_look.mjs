/* ══ D-40 · 자로 열한 갈래를 닫았다 — 이제 «눈»으로 본다 ══
     node tools/d40_look.mjs [초=30] [씨앗=1] [목표층=21]

   D-29~D-39 는 열한 갈래를 다 밀어 보고 **총량(뒤 판당 × 회복초중앙)이 39~65 를
   벗어난 적이 없다**는 것으로 닫혔다. D-39 가 남긴 길은 하나다 — ㉰ **문턱 1.5배를
   «켜서 30초 보고» 다시 본다** ([[play-it-before-measuring-it]]).
   자가 ✗ 라도 눈이 ○ 면 틀린 것은 손잡이가 아니라 **문턱**이다.

   ★ 이 자는 **사람이 보는 그 길**로 간다 ([[probe-must-walk-the-real-path]]) —
     rAF 를 안 끊고 게임의 제 고리를 그대로 돌린다. 깊은 층까지는 게임이 이미 가진
     **빨리감기(`S.speed`)** 로 내려가고(main.js:2714 의 그 고리), 층 21 에 닿으면
     **속도를 1 로 되돌려** 실시간 30초를 찍는다. 손으로 step() 하지 않는다.

   끝 조건 (재기 전에 적는다)
     ① **옳은 화면을 찍었는가** — 30초 중 마을에 있던 초가 5 이하이고, 찍은 사진의
        층이 다 21 이상일 것. 아니면 사진을 믿지 말 것(look_shots 가 마을을 찍던 그 사고).
     ② **두 팔이 같은 자인가** — 같은 씨앗 · 같은 30초 · 시작 층이 ±2 안.
     ③ **눈으로 볼 것(사람이 한다)** — 15장 시트에서 군세가 «눈에 띄게 줄었다가 되차는»
        자리가 보이는가. 보이면 문턱이 틀린 것이고, 안 보이면 D 를 눈으로도 닫는다.
     ④ **자도 같이 적는다** — 0.2초마다 뜬 군세로 30초 안의 최고·최저·「최고의 절반
        아래로 내려간 횟수」·바닥에 머문 초. 이건 D-34 절대 자와 **같은 식**이다.
     ⑤ 두 팔의 ④ 가 사람 눈으로 갈리지 않으면 ㉰ 도 ☒ 다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 30), SEED = +(process.argv[3] || 1), TARGET = +(process.argv[4] || 21);
const FF = +(process.env.D40_FF || 8);            // 빨리감기 배수 (게임이 가진 그 손잡이)
const FFCAP = +(process.env.D40_FFCAP || 200);    // 깊은 층까지 기다리는 벽시계 상한(초)
const SHOTS = +(process.env.D40_SHOTS || 15);
const fs = await import("node:fs");
const ARMS = [["A", ""], ["P11", "__PULSECAP=0.5;__PULSEON=1;__PULSEOFF=1.5"]];

const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter(t => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

const out = {};
for (const [arm, knobs] of ARMS) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  const kb = knobs.split(";").filter(Boolean).map(kv => { const [k, v] = kv.split("="); return `globalThis.${k.trim()} = ${v.trim()};`; }).join(" ");
  const seedSrc = `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
     return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
     globalThis.__AUTO_TREE = 1; ${kb}`;
  await S("Page.addScriptToEvaluateOnNewDocument", { source: seedSrc });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE }); await wait(1500);
  await ev(`localStorage.removeItem("necro.meta.v1")`);
  await S("Page.reload", { ignoreCache: true }); await wait(4500);
  if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("window.__toDungeon 이 없다");
  await ev(`window.__toDungeon()`); await wait(800);

  /* ── 깊은 층까지 **게임의 빨리감기로** 내려간다. 죽으면 마을로 가니 다시 들여보낸다. ── */
  await ev(`window.S && (window.S.speed = ${FF})`);
  const peek = `(()=>{const S=window.S||{};return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead,n:(S.minions||[]).length};})()`;
  let ff = 0, 죽음 = 0, 밖 = 0, 앞at = "dungeon";
  for (; ff < FFCAP; ff++) {
    await wait(1000);
    const a = await ev(peek);
    if (!a) continue;
    if (a.at !== "dungeon" || a.dead) {
      밖++; if (앞at === "dungeon") 죽음++;          // **자리를 뜬 순간**만 센다(머문 초를 죽음으로 세지 않게)
      await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon(); window.S && (window.S.speed = ${FF});`);
      앞at = a.at; continue;
    }
    앞at = "dungeon";
    if (a.f >= TARGET) break;
  }
  const 시작층 = (await ev(peek))?.f ?? 0;
  await ev(`window.S && (window.S.speed = 1)`);
  await wait(300);

  /* ── 여기부터 **실시간 30초**. 0.2초마다 군세를 뜨고 SHOTS 장을 고르게 찍는다. ── */
  const hist = [], 사진 = [];
  const every = Math.max(1, Math.round((SEC / SHOTS) / 0.2));
  let 마을초 = 0, 앞밖 = false, 판깨짐 = 0;
  for (let i = 0; i < Math.round(SEC / 0.2); i++) {
    const a = await ev(`(()=>{const S=window.S||{};return {f:S.floor,at:(window.MODE||{}).at,dead:!!S.dead,n:(S.minions||[]).length,hp:Math.round(S.hp||0),hm:Math.round(S.hpMax||1),mob:(S.mobs||[]).length};})()`);
    if (a) { hist.push(a);
      const 밖 = (a.at !== "dungeon" || a.dead);
      if (밖) { 마을초 += 0.2; if (!앞밖) 판깨짐++; await ev(`window.__closeWin && window.__closeWin(); window.__toDungeon && window.__toDungeon();`); }
      앞밖 = 밖; }
    if (i % every === 0 && 사진.length < SHOTS) {
      const p = `tmp/d40_${arm}_${String(사진.length).padStart(2, "0")}.png`;
      const s = await S("Page.captureScreenshot", { format: "png" });
      fs.writeFileSync(p, Buffer.from(s.data, "base64"));
      사진.push({ p, t: +(i * 0.2).toFixed(1), f: a?.f ?? 0, n: a?.n ?? 0 });
    }
    await wait(200);
  }
  /* ── ④ 자 — D-34 절대 자와 **같은 식**(서 있던 최고 → 그 절반) ── */
  const ns = hist.map(h => h.n);
  const 최고 = Math.max(...ns), 최저 = Math.min(...ns);
  let 사건 = 0, 물린 = false, 바닥초 = 0, hi = ns[0] || 0;
  for (const n of ns) {
    if (n > hi) hi = n;
    if (!물린 && hi >= 3 && n <= hi / 2) { 사건++; 물린 = true; }
    if (물린) { 바닥초 += 0.2; if (n >= hi) 물린 = false; }
  }
  /* ★ **눈이 먼저 본 것을 자로도 적는다** — 사진 서른 칸에서 체력 오브가 내내 꽉 차 있었다.
     군세가 반토막 나는 «사건»이 서른 초에 두 번인데도 아무 일도 아닌 까닭이 여기 있다. */
  const hps = hist.map(h => (h.hm ? h.hp / h.hm : 1));
  const 체력비최저 = +Math.min(...hps).toFixed(3);
  const 체력비평균 = +(hps.reduce((a, b) => a + b, 0) / hps.length).toFixed(3);
  const 위태초 = +(hps.filter(r => r < 0.5).length * 0.2).toFixed(1);   // 절반 아래로 내려가 있던 초
  out[arm] = { 시작층, 끝층: hist.at(-1)?.f ?? 0, 죽음, 밖, ff, 판깨짐, 마을초: +마을초.toFixed(1),
               최고, 최저, 평균: +(ns.reduce((a, b) => a + b, 0) / ns.length).toFixed(2),
               사건, 바닥초: +바닥초.toFixed(1), 체력비최저, 체력비평균, 위태초, 사진, ns, hps };
  console.log(`═════ ${arm} (${knobs || "다 끔"}) ═════`);
  console.log(`  깊은 층까지 ${ff}초(빨리감기 ×${FF}) · 그 사이 판이 끊긴 횟수 ${죽음}(밖에 있던 폴 ${밖}) · 시작층 ${시작층} → 끝층 ${out[arm].끝층} · 30초 중 마을초 ${out[arm].마을초}(끊김 ${판깨짐})`);
  console.log(`  군세 30초: 최고 ${최고} · 최저 ${최저} · 평균 ${out[arm].평균} · 절반아래 사건 ${사건} · 바닥에 머문 초 ${out[arm].바닥초}`);
  console.log(`  체력비 30초: 최저 ${체력비최저} · 평균 ${체력비평균} · 절반 아래에 있던 초 ${위태초}`);
  console.log(`  군세 표본(1초마다): ${ns.filter((_, i) => i % 5 === 0).join(" ")}`);
  await fetch(`${CDP}/json/close/${targetId}`);
}
fs.writeFileSync("tmp/d40_look.json", JSON.stringify(out, null, 1));

/* ── 끝 조건 판정 (사람 눈이 볼 ③ 은 여기서 판정하지 않는다 — 시트를 보고 적는다) ── */
const bad = [];
for (const [arm] of ARMS) {
  const o = out[arm];
  if (o.마을초 > 5) bad.push(`${arm}: 30초 중 ${o.마을초}초를 마을에서 보냈다 — 사진을 믿지 말 것`);
  if (o.사진.some(s => s.f < TARGET)) bad.push(`${arm}: 층 ${TARGET} 아래에서 찍힌 사진이 있다(${o.사진.filter(s => s.f < TARGET).length}장)`);
  if (o.ff >= FFCAP) bad.push(`${arm}: 상한 ${FFCAP}초 안에 층 ${TARGET} 에 못 닿았다`);
}
if (Math.abs(out.A.시작층 - out.P11.시작층) > 2) bad.push(`두 팔의 시작 층이 ${out.A.시작층} 대 ${out.P11.시작층} — 같은 자가 아니다`);
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs.slice(0, 2).join(" | ")}`);
console.log("");
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과 — 두 팔을 같은 자로 층 " + TARGET + "+ 에서 30초씩 찍었다. 시트를 눈으로 볼 것."}`);
process.exit(bad.length ? 1 : 0);
