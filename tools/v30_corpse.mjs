/* ══ V-30 자 · **바닥의 시체가 실제로 보이는가** ══
   이 게임의 한 문장은 「시체가 자원」이다. 그런데 깊은 층을 켜서 보면 판 위에 시체
   스물두 구가 있다는데 **바닥에는 아무것도 안 보인다**(tmp/look_deep.png).
   그리는 코드(js/main.js 「바닥에 누운 시체」)는 있다 — 그러니 «안 그린다»가 아니라
   «그렸는데 안 읽힌다»를 재야 한다([[knob-that-does-nothing]] 의 반대 자리다).

   ★ 자를 믿게 만드는 법 — **세 무리를 같은 자로 잰다**([[floor-far-from-threshold]]):
     ㉮ 시체 자리   — 재려는 것
     ㉯ 몸 자리(양성) — 소환수·적. **이건 확실히 보인다.** 위쪽 눈금이 여기여야 한다.
     ㉰ 빈 바닥(음성) — 아무것도 없는 자리. 아래쪽 눈금.
   ㉯ 와 ㉰ 가 안 갈리면 자가 고장난 것이므로 **판정을 내지 않고 미달로 끝낸다.**

   재는 값 = **또렷함**: 안쪽 네모의 밝기가 바깥 고리(둘레 바닥)의 중앙값에서
   얼마나 벗어나는가. 픽셀마다 |ΔL| 을 재서 상위 10% 의 평균을 쓴다(한 점 튐에 안 흔들린다).

   node tools/v30_corpse.mjs [out.json]
   문: 없음(그리는 쪽을 안 건드린다).                                            */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
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
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;

const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1500);
if (!(await ev(`typeof window.__toDungeon === "function"`))) throw new Error("__toDungeon 이 없다");
await ev(`window.__toDungeon()`); await wait(6000);
for (let i = 0; i < 40; i++) { await wait(1000);
  const a = await ev(`(()=>({at:(window.MODE||{}).at, dead:!!(window.S&&S.dead)}))()`);
  if (a && (a.at !== "dungeon" || a.dead)) await ev(`window.__toDungeon()`); }

/* ★ **틀 하나는 표본 하나다**([[seed-the-probe]] · [[same-seed-is-not-same-run]]).
   dt 가 벽시계라 같은 씨앗이라도 실행마다 다른 자리에서 멈춘다 — 첫 판에는 시체 그림이
   아홉이었는데 다음 판에는 **둘**이었다(층이 막 넘어간 직후였다). 둘로 잰 중앙값은
   자가 아니라 동전이다. 그래서 **그림이 여덟 구 이상 깔린 틀**을 기다렸다 찍는다. */
for (let i = 0; i < 40; i++) {
  const n = await ev(`(window.S && S.piles) ? S.piles.length : 0`);
  if (n >= 8) break;
  await wait(1000);
}
/* 한 틀을 멈춰 세우고(그림이 안 바뀌게) 자리와 사진을 **같은 틀에서** 얻는다. */
const st = await ev(`(()=>{ const g=window.__geo, S=window.S; if(!g||!S) return null;
  const px=(x)=>g.cx+x*g.sc, py=(y)=>g.cy+y*g.sc*g.squash;
  return { g,
    piles: (S.piles||[]).map(p=>({x:px(p.x), y:py(p.y), born:p.born|0, fade:p.fade})),
    minions: (S.minions||[]).map(u=>({x:px(u.x), y:py(u.y), rise:u.rise||0})),
    mobs: (S.mobs||[]).map(m=>({x:px(m.x), y:py(m.y)})),
    floor: S.floor, corpses: S.corpses } })()`);
if (!st) throw new Error("__geo/__S 를 못 읽었다");
/* ★★ **전과 후를 «같은 틀»에서 찍는다.** 처음엔 고친 뒤 다시 돌려서 견줬는데,
   그 판은 15층이고 앞 판은 18층이라 **바닥 타일이 달랐다** — 빈 바닥의 또렷함 중앙값이
   9.7 에서 19.9 로 뛰어, 시체가 몇 배 도드라지는지가 뒤집혀 읽혔다
   ([[threshold-and-ruler-must-match]] · [[same-seed-is-not-same-run]]).
   시체 그림은 **안 움직이니**(자리가 눕는 순간 굳는다) 문만 옛 값으로 돌려 한 장 더 찍으면
   같은 바닥·같은 자리에서 **짝지어** 잴 수 있다. */
const shoot = async (out) => { const b = Buffer.from((await S("Page.captureScreenshot", { format: "png" })).data, "base64"); fs.writeFileSync(out, b); };
await ev(`globalThis.__CORPSEH = 26; globalThis.__CORPSEA = 0.44;`); await wait(180);
await shoot("tmp/v30_before.png");
await ev(`delete globalThis.__CORPSEH; delete globalThis.__CORPSEA;`); await wait(180);
await shoot("tmp/v30_after.png");
fs.copyFileSync("tmp/v30_after.png", "tmp/v30_corpse.png");
await fetch(`${CDP}/json/close/${targetId}`);

/* ── 사진을 픽셀로 읽는다(PNG 디코드는 파이썬 PIL 에 맡긴다 — 이 리포에 이미 쓰는 길이다) ── */
const geo = st.g, DPR = 2;
const empty = [];   // 빈 바닥 — 어느 개체에서도 먼 자리
const R = () => 0;  // (씨앗 없는 난수는 안 쓴다 — 격자로 고른다) [[seed-the-probe]]
const all = [...st.piles, ...st.minions, ...st.mobs];
for (let gx = -260; gx <= 260; gx += 65) for (let gy = -150; gy <= 150; gy += 50) {
  const x = geo.cx + gx, y = geo.cy + gy;
  if (all.every(o => Math.hypot(o.x - x, o.y - y) > 70)) empty.push({ x, y });
}
const us = geo.us || 1;
const job = { png: "tmp/v30_corpse.png", dpr: DPR, us,
  groups: { corpse: st.piles.map(p=>({x:p.x,y:p.y,h:26*us})),
            body:   [...st.minions.filter(m=>!m.rise).map(m=>({x:m.x,y:m.y,h:26*us})), ...st.mobs.map(m=>({x:m.x,y:m.y,h:26*us}))],
            empty:  empty.map(p=>({x:p.x,y:p.y,h:26*us})) } };
fs.writeFileSync("tmp/v30_job.json", JSON.stringify(job));
console.log(`층 ${st.floor} · 시체 ${st.corpses}(그림 ${st.piles.length}) · 몸 ${job.groups.body.length} · 빈 바닥 ${empty.length} · errs ${errs.length}`);
if (errs.length) console.log("errs", errs.slice(0,3));

process.exit(0);
