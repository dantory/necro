/* **켜서 본다** — V-69 의 전/후 그림. `node tools/v69_shot.mjs` → tmp/v69_cmp.png
   자가 「덮였다」고 센 그 자리를 **사람 눈으로도** 본다.
   · 틀마다 `window.__RECTS.nums` 를 보고 **빛깔이 다른데 겹친 짝**이 가장 심한 자리를
     찾아, 그 자리를 둘러싼 네모를 찍는다(전은 `XLAP=0`, 후는 그대로).
   · dt 가 벽시계라 **같은 틀**은 못 찍는다([[same-seed-is-not-same-run]]) — 그러니
     「같은 순간」이 아니라 「같은 판에서 가장 심한 자리」를 견준다.
   ★ **찍는 틀과 잰 틀을 못박는다.** 처음엔 `globalThis.__PAUSE = 1` 로 세운 줄 알았는데
     이 게임에는 그런 이름이 **아예 없다** — 없는 이름은 조용히 아무 일도 안 하고,
     찍힌 그림은 잰 자리와 **다른 틀**이었다([[knob-that-does-nothing]]).
     그래서 판 안에서 세운다: 겹침을 찾은 그 순간 **`requestAnimationFrame` 자체를 막아**
     게임이 다음 틀을 못 그리게 한다. 캔버스에는 그 틀이 그대로 남는다.
     세운 뒤 `__RECTS.nums` 를 **다시 읽어 그 짝이 아직 있는지 확인**한다 — 없으면 미달. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SECS = Number(process.argv[2] || 30);
const fs = await import("node:fs");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 0, rebirths: 0, best: 52, lastSeen: 0, corpses: 0 };

async function run(off, out) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
  await S("Page.addScriptToEvaluateOnNewDocument", { source:
    `Math.random = (() => { let s = 3; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
  await S("Page.navigate", { url: PAGE }); await wait(1500);
  await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})` });
  await S("Page.reload", { ignoreCache: true }); await wait(4500);
  if (off) await S("Runtime.evaluate", { expression: "globalThis.__NOXLAP = 1" });
  await S("Runtime.evaluate", { expression: "window.__toDungeon && window.__toDungeon()" });
  await wait(1500);
  /* 가장 심한 짝을 **틀마다** 보고, 새 최악이 나오면 그 자리를 적어 둔다 */
  await S("Runtime.evaluate", { expression: `
    window.__WANT = ${off ? 0.6 : 0.25};
    window.__RECTS = { bars: [], nums: [], bodies: [], frames: 0 };
    window.__BEST = { r: 0, box: null, txt: "" };
    (function tick() {
      const N = (window.__RECTS.nums || []).filter(a => a[7] >= 0.35);
      for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
        const a = N[i], b = N[j]; if (a[6] === b[6]) continue;
        const ho = Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]);
        const vo = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
        if (ho <= 0 || vo <= 0) continue;
        const r = ho * vo / Math.max(1, Math.min(a[2]*a[3], b[2]*b[3]));
        if (r > window.__BEST.r) window.__BEST = { r, txt: a[4] + " / " + b[4],
          box: [Math.min(a[0], b[0]), Math.min(a[1], b[1]),
                Math.max(a[0]+a[2], b[0]+b[2]), Math.max(a[1]+a[3], b[1]+b[3])] };
      }
      /* 문턱을 넘으면 **그 자리에서 판을 세운다** — 게임의 그리기도 rAF 를 타므로
         rAF 를 막으면 캔버스가 이 틀에 얼어붙는다(내 tick 은 게임의 그리기 «뒤»에 돈다). */
      if (window.__BEST.r >= window.__WANT) { window.__FROZE = 1;
        window.requestAnimationFrame = function () { return 0; }; return; }
      requestAnimationFrame(tick);
    })();` });
  /* 최악을 잡은 **그 틀**을 찍어야 하므로, 새 최악이 뜨면 바로 멈춰 세우고 찍는다 */
  let shot = null;
  for (let i = 0; i < SECS * 10; i++) {
    await wait(100);
    const st = JSON.parse((await S("Runtime.evaluate", { returnByValue: true,
      expression: `JSON.stringify({ b: window.__BEST, froze: !!window.__FROZE, at: (window.MODE||{}).at })` })).result.value);
    if (st.froze) {
      const s = await S("Page.captureScreenshot", { format: "png" });
      /* ★ **잰 짝이 얼어붙은 틀에도 있는지** 확인한다 — 없으면 딴 틀을 찍은 것이다 */
      const still = (await S("Runtime.evaluate", { returnByValue: true, expression: `
        (() => { const N = (window.__RECTS.nums||[]).filter(a => a[7] >= 0.35);
          for (let i = 0; i < N.length; i++) for (let j = i + 1; j < N.length; j++) {
            const a = N[i], b = N[j]; if (a[6] === b[6]) continue;
            const ho = Math.min(a[0]+a[2], b[0]+b[2]) - Math.max(a[0], b[0]);
            const vo = Math.min(a[1]+a[3], b[1]+b[3]) - Math.max(a[1], b[1]);
            if (ho > 0 && vo > 0 && ho*vo / Math.max(1, Math.min(a[2]*a[3], b[2]*b[3])) >= window.__WANT * 0.9) return true;
          } return false; })()` })).result.value;
      shot = { png: Buffer.from(s.data, "base64"), ...st.b, still };
      break;
    }
    if (st.at !== "dungeon") await S("Runtime.evaluate", { expression: "window.__toDungeon()" });
  }
  if (!shot) { console.log(off ? "전" : "후", "미달: " + SECS + "초 안에 문턱을 넘는 겹침이 없었다"); await raw("Target.closeTarget", { targetId }); return; }
  fs.writeFileSync(out, shot.png);
  fs.writeFileSync(out + ".json", JSON.stringify({ r: shot.r, txt: shot.txt, box: shot.box }));
  console.log(off ? "전" : "후", out, "최악", (100 * shot.r).toFixed(0) + "%", shot.txt,
    shot.still ? "· 얼어붙은 틀에 그 짝이 있다" : "· 미달: 얼어붙은 틀에 그 짝이 없다");
  await raw("Target.closeTarget", { targetId });
}
await run(true, "tmp/v69_before.png");
await run(false, "tmp/v69_after.png");
process.exit(0);
