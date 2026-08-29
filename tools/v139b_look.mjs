/* V-139b 탐색 — **켜서 본다.** 「금을 «내가» 쓴다」를 화면에서 확인한다.
     node tools/v139b_look.mjs [초=180] [씨앗=3]
   같은 씨앗·같은 초를 **두 팔**로 굴린다: 사람(문 없음) 과 자(`__AUTO_FORGE=1`).
   보는 것은 하나 — 그 시간이 지났을 때 **금이 누구 손에 있는가.**
   ★ 자를 새로 만든 것이 아니라 **그림을 얻으려고** 켠다([[play-it-before-measuring-it]]). */
import fs from "node:fs";
const CDP = `http://127.0.0.1:${process.env.NECRO_CDP_PORT || "9333"}`, PAGE = "http://127.0.0.1:8774/index.html";
const SEC = +(process.argv[2] || 180), SEED = +(process.argv[3] || 3);
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const wait = ms => new Promise(r => setTimeout(r, ms));

async function arm(name, forgeOn) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  const ev = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
  await S("Page.enable"); await S("Runtime.enable");
  /* ★ `__AUTO_TREE` 는 **양쪽 다 켠다** — 스킬 트리까지 갈리면 두 팔이 딴 게임이 된다.
     가르는 것은 «지갑» 하나뿐이라야 그림이 한 가지를 말한다. 그래서 `__AUTO_FORGE` 로
     지갑만 따로 덮어쓴다(core.js autoForgeOn 머리말이 낸 그 문). */
  await S("Page.addScriptToEvaluateOnNewDocument", { source:
    `Math.random = (() => { let s = (${SEED} >>> 0) || 1;
       return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();
     globalThis.__AUTO_TREE = 1; globalThis.__AUTO_FORGE = ${forgeOn};` });
  await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
  await S("Page.navigate", { url: PAGE }); await wait(1500);
  await ev(`localStorage.removeItem("necro.meta.v1")`);
  await S("Page.reload", { ignoreCache: true }); await wait(4500);
  await ev(`window.__toDungeon && window.__toDungeon()`); await wait(900);
  await ev(`(async()=>{ const B = await import("/js/battle.js"); B.newRun();
     for (let i = 0, a = 0; i < ${Math.round(SEC / 0.05)}; i++) { B.step(0.05);
       if ((a += 0.05) > 0.35) { a = 0; try { window.auto(); } catch {} } }
     return "ok"; })()`, true);
  await wait(500);
  const st = await ev(`(async()=>{ const C = await import("/js/core.js"); const M = C.META, S = window.__S;
      const up = M.up, plus = Object.values(M.plus||{}).reduce((a,b)=>a+(b|0),0);
      return JSON.stringify({ 층:S.floor, 금:M.gold|0, 강화:(up.hp|0)+(up.mp|0)+(up.dmg|0)+(up.army|0),
        낱:[up.hp|0,up.mp|0,up.dmg|0,up.army|0].join("/"), 재련:plus, 살수있는것:
        ["hp","mp","dmg","army"].filter(k=>M.gold>=C.upCost(k)).length }); })()`, true);
  /* 마을로 돌아가 **대장간을 연다** — 그림이 말해야 하는 것은 「내가 고를 자리」다. */
  await ev(`window.__toTown && window.__toTown()`); await wait(700);
  await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
     window.__openWin && window.__openWin("forge"); return 1})()`); await wait(700);
  const { data } = await S("Page.captureScreenshot", { format: "png" });
  fs.writeFileSync(`tmp/v139b_${name}.png`, Buffer.from(data, "base64"));
  await raw("Target.closeTarget", { targetId });
  console.log(`${name.padEnd(6)} ${st}`);
  return JSON.parse(st);
}

const human = await arm("human", 0);
const robot = await arm("robot", 1);
console.log(`\n금이 사람 손에 남은 몫: ${human.금} 대 ${robot.금}`);
console.log(`강화 계급(사람이 안 산 것): ${human.강화} 대 ${robot.강화}`);
if (human.강화 !== 0) { console.error("틀림: 사람 판인데 강화가 저절로 올랐다"); process.exit(1); }
if (human.살수있는것 < 1) { console.error("틀림: 마을에 왔는데 살 수 있는 강화가 하나도 없다"); process.exit(1); }
console.log("통과 — 사람 판에서 강화는 0 이고, 마을에서 살 수 있는 것이", human.살수있는것, "개");
bws.close(); process.exit(0);
