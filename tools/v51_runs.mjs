/* **떠오르는 숫자 둘이 «한 수»로 읽히는가** (V-51 의 자).
     node tools/v51_runs.mjs [초]
   V-20·V-23·V-26 과 같은 규칙 — 그리는 자리에서 모은 네모(`window.__RECTS.nums`)를
   그대로 읽는다. 식을 밖에서 다시 쓰지 않는다.

   ★ **문턱은 짐작이 아니라 «양성 표본»으로 잡는다.** 글꼴은 monospace 라 한 수 «안»의
     글자 사이 틈은 0 이다 — 그러니 두 수 사이 틈이 글자폭의 1/3 아래면 사람 눈에는
     한 수 안의 틈과 구별이 안 된다(「16」 옆 「16」 = 「1616」).
     세로는 같은 띠에 있어야 한 줄로 읽힌다(겹침 ≥ 작은 쪽 키의 60%).
     빛깔(kind)이 다르면 둘로 읽히므로 안 센다.
   ★ **알파 0.35 아래는 안 센다** — 사그라드는 끝자락은 사람 눈에 이미 없는데 네모는
     그대로 남아, 안 보이는 글자를 「붙었다」고 세고 있었다(첫 판의 위양성). */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 45);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 120)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
const wait = ms => new Promise(r => setTimeout(r, ms));
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });
await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.addScriptToEvaluateOnNewDocument", { source:
  `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
await S("Page.navigate", { url: PAGE }); await wait(1500);
/* `SEED=1` 이면 **몇 시간 논 사람**을 심는다(look_shots·V-26 과 같은 세이브) — 숫자가
   쏟아지는 자리는 새 저장이 아니라 여기다. */
if (process.env.SEED === "1") {
  const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
    up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
    equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
             robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
             charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
    bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };
  await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})` });
} else await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true }); await wait(4500);
/* 전/후를 같은 자로 재는 문 — `GLUE=0` 이면 V-51 의 고침을 끈다 */
if (process.env.GLUE === "0") await S("Runtime.evaluate", { expression: "globalThis.__NOGLUE = 1" });
await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
await wait(1200);
await S("Runtime.evaluate", { expression: `
  window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
  window.__RUN = { frames: 0, seen: 0, glued: 0, pairs: 0, worst: 0, worstTxt: "" };
  (function tick() {
    const R = window.__RECTS, O = window.__RUN;
    const N = R.nums;
    if (N.length) {
      O.frames++; O.seen += N.length;
      const bad = new Set();
      for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
        const a = N[i], b = N[j];
        if (a[6] !== b[6]) continue;                       // 빛깔이 다르면 둘로 읽힌다
        if (a[7] < 0.35 || b[7] < 0.35) continue;          // 사그라든 것은 사람 눈에 없다
        const vo = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
        if (vo < 0.6 * Math.min(a[3], b[3])) continue;     // 같은 띠가 아니다
        const gap = Math.max(a[0], b[0]) - Math.min(a[0]+a[2], b[0]+b[2]);
        const cw = Math.min(a[2] / Math.max(1, String(a[4]).length),
                            b[2] / Math.max(1, String(b[4]).length));
        if (gap < 0.33 * cw) {                             // 한 수 안의 틈과 구별이 안 된다
          bad.add(i); bad.add(j); O.pairs++;
          const len = String(a[4]).length + String(b[4]).length;
          if (len > O.worst) { O.worst = len; O.worstTxt = (a[0] <= b[0] ? a[4] + b[4] : b[4] + a[4]); }
        }
      }
      O.glued += bad.size;
    }
    requestAnimationFrame(tick);
  })();` });
await wait(SECS * 1000);
const O = JSON.parse((await S("Runtime.evaluate", { returnByValue: true, expression: "JSON.stringify(window.__RUN)" })).result.value);
console.log(`틀 ${O.frames} · 숫자 ${O.seen} · **붙어서 한 수로 읽히는 숫자 ${O.glued}** ` +
  `(${(100 * O.glued / Math.max(1, O.seen)).toFixed(1)}%) · 붙은 짝 ${O.pairs} · 최악 «${O.worstTxt}»(${O.worst}자리)`);
console.log("콘솔오류", errs.length, errs.slice(0, 2));
await raw("Target.closeTarget", { targetId });
process.exit(0);
