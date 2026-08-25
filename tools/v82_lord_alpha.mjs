/* V-82 자 — **관문 주인이 제 목숨의 얼마를 «흐린 채»로 보내는가**를 센다.
   보스는 born0 = 2.6초 동안 어둠에서 배어 나오는데(main.js bornAlpha), 깊은 관문의
   주인은 한 번에 1초 남짓밖에 못 산다(battle.js 2228 의 실측). 둘이 사실이면
   **켜서 보는 사람은 보스를 온전히 한 번도 못 본다** — 유령이 스쳐 지나갈 뿐이다.
   그림만으로는 「배어 나오는 중을 찍었나」와 「내내 흐린가」를 못 가르므로 여기서 잰다.

   node tools/v82_lord_alpha.mjs [초=180] [old]
     둘째 인자에 `old` 를 주면 **옛 그림**(흐림 = born0 통째)으로 되돌려 같은 판을
     두 번 잰다 — 고친 뒤에만 재면 이 자가 무엇을 잡는지 모른다.
     주인이 설 때마다 그 개체를 따라가며 매 프레임 알파(bornAlpha)를 재고,
     죽거나 사라질 때 «산 시간 · 흐렸던 시간 · 최고 알파»를 한 줄로 남긴다. */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 180);
const OLD = process.argv[3] === "old";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S_ = (m, p) => raw(m, p, sessionId);
await S_("Page.enable"); await S_("Runtime.enable");
await S_("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S_("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* look_shots 와 **같은 몸**을 심는다 — 사진에서 본 그 화면을 그대로 잰다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S_("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S_("Page.reload", { ignoreCache: true }); await wait(1800);
if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 이 없다");
await ev(`globalThis.__BORNFADE_OFF = ${OLD ? 1 : 0}`);
await ev(`window.__toDungeon()`);

/* 페이지 안에 감시자를 심는다 — 프레임마다 도는 것이 아니라 40ms 마다 훑는다.
   ★ 자를 «그리는 식»으로 재지 않고 **main.js 의 bornAlpha 를 그대로 부른다**
     (밖에서 다시 쓰면 갈린다 — [[threshold-and-ruler-must-match]]). */
await ev(`(async () => {
  const mod = await import("/js/main.js");
  window.__V82 = { rows: [], seen: new Map() };
  window.__v82t = setInterval(() => {
    const S = window.S; if (!S || !S.mobs) return;
    const now = performance.now() / 1000;
    for (const m of S.mobs) {
      if (!m.boss) continue;
      let r = window.__V82.seen.get(m);
      if (!r) { r = { t0: now, dim: 0, max: 0, n: 0, lord: (m.lord||{}).n || "?", f: S.floor, dead: 0 };
                window.__V82.seen.set(m, r); window.__V82.rows.push(r); }
      const a = mod.bornAlpha(m);
      r.n++; r.max = Math.max(r.max, a); if (a < 0.9) r.dim += 0.04;
      r.life = now - r.t0; r.hp = m.hp;
    }
  }, 40);
})()`);

const t0 = Date.now();
let 마을 = 0;
while ((Date.now() - t0) / 1000 < SEC) {
  await wait(1000);
  const a = await ev(`(()=>({at:(window.MODE||{}).at, dead:!!(window.S&&S.dead)}))()`);
  if (a && (a.at !== "dungeon" || a.dead)) { 마을++; await ev(`window.__toDungeon()`); }
}
const rows = await ev(`(window.__V82||{rows:[]}).rows.map(r=>({lord:r.lord,f:r.f,life:+(r.life||0).toFixed(2),dim:+r.dim.toFixed(2),max:+r.max.toFixed(2)}))`);
const 층 = await ev(`window.S && S.floor`);
clearInterval;
await ev(`clearInterval(window.__v82t)`);
console.log(`팔 ${OLD ? "옛(흐림=born0)" : "새(흐림=BORN_FADE)"} · 도달 층 ${층} · 마을로 돌아간 초 ${마을} · 주인 ${rows.length}기`);
for (const r of rows) console.log(`  ${String(r.f).padStart(3)}층 ${r.lord.padEnd(10)} 산시간 ${String(r.life).padStart(6)}s · 흐린시간 ${String(r.dim).padStart(6)}s · 최고알파 ${r.max}`);
if (rows.length) {
  const life = rows.reduce((s, r) => s + r.life, 0), dim = rows.reduce((s, r) => s + r.dim, 0);
  const never = rows.filter(r => r.max < 0.9).length;
  const pct = 100 * dim / life;
  console.log(`합: 산시간 ${life.toFixed(1)}s 중 흐린 것이 ${dim.toFixed(1)}s = ${pct.toFixed(0)}%`);
  console.log(`**한 번도 또렷해지지 못한 주인 ${never}/${rows.length}기** (최고알파 < 0.9)`);
  /* ══ 판정 ══ 옛 팔은 78~79% · 7~10기가 유령으로 죽었다. 새 팔은 26% · 1기.
     문턱은 그 사이에 **바닥에서 멀찍이** 둔다([[floor-far-from-threshold]]) —
     흐린 몫 45% 아래, 유령으로 죽은 주인은 넷 중 하나 아래.
     ★ 옛 팔(`old`)로 부르면 **울어야 옳다** — 자가 무엇을 잡는지 그것으로 안다. */
  const bad = [];
  if (rows.length < 3) bad.push(`주인을 ${rows.length}기밖에 못 봤다 — 표본이 모자라 판정 못 함`);
  if (pct >= 45) bad.push(`흐린 몫 ${pct.toFixed(0)}% (< 45% 여야 한다)`);
  if (never > rows.length / 4) bad.push(`유령으로 죽은 주인 ${never}/${rows.length} (넷 중 하나 아래여야 한다)`);
  console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : "통과 (관문의 주인이 제 몸으로 선다)"}`);
  await fetch(`${CDP}/json/close/${targetId}`);
  process.exit(bad.length ? 1 : 0);
}
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(1);
