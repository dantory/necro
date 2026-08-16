/* **빨리 감아도 같은 판인가** — 병수님이 볼 것은 ×1 이지만, 자는 전부 빨리 감아 잰다.
     node tools/speed_probe.mjs [게임초=24] [배수들=1,3,8]

   ★ 왜 있는가 (2026-08-17, docs/ROADMAP.md J):
     같은 24 «게임»초인데 ×1 은 한 대도 안 맞고 ×3 은 죽어서 마을로 갔다. 배수만 바꿨는데
     안 맞는 판이 전멸하는 판이 된다 — 그렇다면 **빨리 감아 잰 자료는 실제 판이 아니다**
     (A/B·회귀표가 전부 그 위에 서 있다).
     원인은 main.js 의 그리는 고리였다: step(dt) 는 배수만큼 «판의 시간»을 돌리는데
     auto()(소환·저주·폭발 — 판의 머리 전부)는 고리 «밖»에서 **벽시계 dt** 로만 셌다.
     ×3 이면 군세를 셋에 하나만큼, ×8 이면 여덟에 하나만큼 채운다.

   ★ 재는 법: 벽시계로 기다리지 않고 **S.t(게임 시간)가 문턱을 넘을 때까지** 지켜본다.
     기계가 얼마나 빨랐느냐가 표에 안 섞이게 하려는 것이다. 배수마다 **새 탭 · 같은 씨앗**
     으로 열고, 넘은 순간의 체력·층·군세·죽음을 적어 견준다.
   ★ 여기서는 rAF 를 **안 끊는다** — 끊으면 진짜 판이 아니라 loop_health 를 또 재게 된다.
     이 자가 묻는 것이 「그리는 고리가 배수를 옳게 다루는가」이므로 그 고리가 있어야 한다
     ([[probe-must-walk-the-real-path]]). */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SECS = +(process.argv[2] || 24);
const SPEEDS = (process.argv[3] || "1,3,8").split(",").map(Number);
const SEED = 3;

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

async function run(speed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async e => JSON.parse((await S("Runtime.evaluate", { returnByValue: true, awaitPromise: true, expression: e })).result.value);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE }); await wait(5000);
  /* 같은 씨앗을 심고 **판을 새로 연다** — 로딩이 난수를 얼마나 퍼 갔든 여기부터가 0분이다. */
  await ev(`(async()=>{ const B = await import("/js/battle.js");
    Math.random = (() => { let s = (${SEED} >>> 0) || 1;
      return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
    window.__toDungeon(); B.newRun(); window.__S.speed = ${speed}; return JSON.stringify("ok") })()`);
  /* S.t 가 문턱을 넘을 때까지 지켜본다. 죽으면 그 자리에서 멈춘다(마을이 S 를 갈아엎기 전에). */
  let snap = null;
  for (let i = 0; i < 1200; i++) {
    snap = await ev(`(()=>{ const S = window.__S;
      return JSON.stringify({ t: S.t, hp: Math.round(S.hp), hpMax: Math.round(S.hpMax),
        floor: S.floor, army: S.minions.filter(m => !m.own).length, dead: !!S.dead,
        at: window.__MODE ? window.__MODE.at : "?" }) })()`);
    if (snap.dead || snap.at !== "dungeon" || snap.t >= SECS) break;
    await wait(100);
  }
  await raw("Target.closeTarget", { targetId });
  return { speed, ...snap };
}

const rows = [];
for (const s of SPEEDS) rows.push(await run(s));

console.log(`\n씨앗 ${SEED} · ${SECS} 게임초 뒤`);
console.log("배수 | 게임초 | 체력 | 층 | 군세 | 죽음");
for (const r of rows)
  console.log(` ×${String(r.speed).padEnd(2)} | ${r.t.toFixed(1).padStart(5)} | ${String(r.hp).padStart(4)}/${r.hpMax} | ${String(r.floor).padStart(2)} | ${String(r.army).padStart(4)} | ${r.dead ? "★ 죽음" : "-"}`);

/* 판정 — 배수가 판을 **뒤집지 않는가**. 난수는 배수마다 프레임 경계가 달라 한 톨까지
   같을 수 없으므로, 같아야 하는 것은 **판의 결말**이다: 죽었는가 · 군세가 섰는가.
   군세는 배수가 올라도 ×1 의 절반 밑으로 떨어지면 안 된다(머리가 판을 못 따라간 꼴). */
const base = rows.find(r => r.speed === 1) || rows[0];
const bad = [];
for (const r of rows) {
  if (r.dead !== base.dead) bad.push(`×${r.speed}: 죽음이 ×1(${base.dead})과 다르다(${r.dead})`);
  if (base.army >= 4 && r.army < base.army * 0.5) bad.push(`×${r.speed}: 군세 ${r.army} — ×1 의 ${base.army} 의 절반 밑`);
  /* 죽음 직전까지 깎이는 것도 **판이 뒤집힌 것**이다 — 고치기 전 ×3 은 안 죽었지만
     167 중 19 만 남았다(×1 은 160). 결말만 보면 그 한 칸을 놓친다. */
  if (r.hp / r.hpMax < base.hp / base.hpMax * 0.5)
    bad.push(`×${r.speed}: 체력 ${r.hp}/${r.hpMax} — ×1 의 ${base.hp}/${base.hpMax} 의 절반 밑`);
}
console.log(bad.length ? "\n틀림 " + bad.length + "\n  " + bad.join("\n  ") : "\nPASS — 배수가 판을 안 뒤집는다");
bws.close();
process.exit(bad.length ? 1 : 0);
