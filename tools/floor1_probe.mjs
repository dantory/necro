/* **판을 열고 나서 처음 한동안 무슨 일이 나는지** 한 줄씩 적는다.
     node tools/floor1_probe.mjs [초] [씨앗]

   왜 이 자가 필요한가 — ROADMAP 「1층에서 24초 동안 아무 일도 안 난다」는 로그(일지)를
   보고 적은 말이다. 그런데 로그는 **접힌다**(같은 말은 ×n 으로) — 그러니 「줄이 둘뿐」이
   곧 「아무 일도 안 났다」는 아니다. 판이 실제로 멈춰 있었는지를 보려면 **로그가 아니라
   판을 세야** 한다: 적이 나왔는가 · 죽었는가 · 군세가 늘었는가.

   그래서 100ms 마다 판을 떠서, **바뀐 것이 하나도 없는 구간**(빈틈)을 잰다. 그 구간마다
   그때 무엇이 막고 있었는지도 같이 적는다 — 줄에 남은 적 · 다음 적까지 남은 초 ·
   마나 · 시체 · 군세/상한.

   씨앗을 준 뒤 **새 판**으로 연다(META 를 지운다 — deepest 0 이라 되짚기가 안 걸린다). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 45), SEED = +(process.argv[3] || 3);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 414, height: 860, deviceScaleFactor: 2, mobile: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
/* 페이지 안에서 터진 것을 **삼키지 않는다**(cpu_profile 과 같은 규칙). */
const ev = async expr => { const r = await S("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error("page: " + (r.exceptionDetails.exception?.description || r.exceptionDetails.text).slice(0, 200));
  return r.result.value; };

await ev(`localStorage.clear(); true`);                 // ★ 새 판 — deepest 0 이라 되짚기가 안 걸린다
await S("Page.reload", { ignoreCache: true }); await wait(3200);
await ev(`window.__SEED=${SEED}; true`);
await ev(`window.__toDungeon(); true`);

const SNAP = `(()=>{const S=window.__S;return {
  t:+S.t.toFixed(2), floor:S.floor, mobs:S.mobs.length, q:(S.spawnQ||[]).length,
  spawnT:+(S.spawnT||0).toFixed(2), army:S.minions.filter(u=>!u.own).length,
  mp:Math.round(S.mp||0), mpMax:Math.round(S.mpMax||0), corpse:S.corpses|0,
  cap:(window.__armyCap?window.__armyCap():-1), hp:Math.round(S.hp), logN:S.log.length, dead:!!S.dead }})()`;

const rows = [];
const t0 = Date.now();
while (Date.now() - t0 < SEC * 1000) { rows.push(await ev(SNAP)); await wait(100); }
const log = await ev(`JSON.stringify(window.__S.log)`);
await raw("Target.closeTarget", { targetId });

/* ── 빈틈을 센다 ── 「바뀐 것」은 판에 선 적 수 · 줄 길이 · 군세 · 층 넷이다.
   (마나·체력은 늘 조금씩 움직이므로 「일이 났다」로 치지 않는다.) */
const key = r => `${r.floor}|${r.mobs}|${r.q}|${r.army}`;
const gaps = []; let s = 0;
for (let i = 1; i <= rows.length; i++) {
  if (i === rows.length || key(rows[i]) !== key(rows[s])) {
    const dur = (rows[Math.min(i, rows.length - 1)].t - rows[s].t);
    if (dur >= 1.0) gaps.push({ from: rows[s].t, sec: +dur.toFixed(1), ...rows[s] });
    s = i;
  }
}
gaps.sort((a, b) => b.sec - a.sec);
const perFloor = {};
for (const r of rows) perFloor[r.floor] = (perFloor[r.floor] || 0) + 0.1;

console.log(`씨앗 ${SEED} · ${SEC}초 · 오류 ${errs.length}`);
console.log(`층별 머문 초: ${Object.entries(perFloor).map(([f, s]) => `${f}층 ${s.toFixed(1)}`).join(" · ")}`);
console.log(`끝: ${rows.at(-1).floor}층 · 군세 ${rows.at(-1).army} · ${rows.at(-1).dead ? "죽음" : "살아 있음"}`);
console.log(`\n빈틈(1초 이상 판이 그대로) ${gaps.length}개 — 위 6개:`);
for (const g of gaps.slice(0, 6))
  console.log(`  ${g.from.toFixed(1)}s 부터 ${g.sec}초 · ${g.floor}층 · 적 ${g.mobs} · 줄 ${g.q} · 다음적 ${g.spawnT}s · 군세 ${g.army}/${g.cap} · 마나 ${g.mp}/${g.mpMax} · 시체 ${g.corpse}`);
console.log(`\n빈틈 합 ${gaps.reduce((a, g) => a + g.sec, 0).toFixed(1)}초 / ${SEC}초`);
console.log(`\n일지 ${JSON.parse(log).length}줄:`);
for (const l of JSON.parse(log)) console.log("  " + l.replace(/<[^>]*>/g, ""));
if (errs.length) console.log("\n오류:\n" + errs.join("\n"));
process.exit(0);
