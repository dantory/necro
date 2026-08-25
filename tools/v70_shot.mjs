/* **켜서 본다** — V-70 의 전/후 그림. `node tools/v70_shot.mjs` → tmp/v70_cmp.png
   자가 「눌렸다」고 센 그 자리를 **사람 눈으로도** 본다.
   · 판을 세우고(`S.speed = 0`) 판 한가운데에 `curse`·`nova` 를 나란히 놓아 한 틀을 찍는다 —
     싸움이 안 굴러야 위/아래가 **같은 판·같은 자리**다([[same-seed-is-not-same-run]]).
   · 위는 V-70 «전»(`__NOFLATFX = 1` · 정사각), 아래는 «후». 잘라 낸 네모는 같다. */
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`;
const PAGE = "http://127.0.0.1:8774/index.html";
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

async function run(old, out) {
  const { targetId } = await raw("Target.createTarget", { url: PAGE });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
  await S("Network.setCacheDisabled", { cacheDisabled: true });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
  await S("Page.addScriptToEvaluateOnNewDocument", { source:
    `Math.random = (() => { let s = 11; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
  await S("Page.navigate", { url: PAGE }); await wait(1500);
  await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})` });
  await S("Page.reload", { ignoreCache: true }); await wait(4500);
  const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;
  if (old) await ev("globalThis.__NOFLATFX = 1");
  await ev("window.__toDungeon && window.__toDungeon()"); await wait(3500);
  const geo = await ev(`(async () => {
    const S = window.S, g = window.__geo;
    S.speed = 0;
    const frame = () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    for (const k of ["curse", "nova"]) { let n = 0; while (!window.sprite(window.FX_ART[k].img) && n++ < 120) await frame(); }
    S.fx.length = 0; if (S.pools) S.pools.length = 0;
    S.fx.push({ t: 0.34, x: -110, y: 0, kind: "curse" });
    S.fx.push({ t: 0.34, x:  110, y: 0, kind: "nova"  });
    await frame(); await frame();
    window.requestAnimationFrame = function () { return 0; };   // 이 틀에 못박는다
    return { cx: g.cx, cy: g.cy, sc: g.sc, squash: g.squash };
  })()`);
  const shot = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(out, Buffer.from(shot.data, "base64"));
  await raw("Target.closeTarget", { targetId });
  return geo;
}

const g = await run(1, "tmp/v70_before.png");
await run(0, "tmp/v70_after.png");
console.log("판의 눌림", g.squash.toFixed(3), "· tmp/v70_before.png · tmp/v70_after.png");
/* 자르기·붙이기는 파이썬(PIL)이 한다 — 여기서는 좌표만 넘긴다. */
const box = { x: Math.round((g.cx - 230) * 2), y: Math.round((g.cy - 140) * 2), w: 460 * 2, h: 260 * 2 };
fs.writeFileSync("tmp/v70_box.json", JSON.stringify(box));
console.log("자를 네모", JSON.stringify(box));
process.exit(0);
