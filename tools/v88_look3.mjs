/* **아직 한 번도 «좁은 폭»에서 안 본 창 셋** — 정산(winEnd)·오프라인(winOffline)·초기화(winWipe).
   V-80 의 look 은 상인·대장간·건너뛰기·트리·교리·운용·환생 일곱만 돌았다. 그런데 이 셋은
   **판이 끝날 때마다 · 켤 때마다** 반드시 보는 자리다.
     node tools/v88_look3.mjs [W] [H]   (tmp/v88_<창>_<W>.png) */
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const fs = await import("node:fs");
const W = +(process.argv[2] || 1366), H = +(process.argv[3] || 700);
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
await S("Emulation.setDeviceMetricsOverride", { width: W, height: H, deviceScaleFactor: 2, mobile: false });
const wait = (ms) => new Promise(r => setTimeout(r, ms));
const ev = async (e) => (await S("Runtime.evaluate", { expression: e, returnByValue: true })).result?.value;
const shot = async (out) => { const s = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync(out, Buffer.from(s.data, "base64")); };
/* look_shots·v80_look 과 **같은 몸** — 사진끼리 견줄 수 있어야 한다. */
const meta = { gold: 182400, lv: 26, xp: 0, deepest: 52, runs: 6, dive: 1, diveSet: 1, diveTold: 1,
  up: { hp: 8, mp: 6, dmg: 9, army: 5 }, plus: { wand: 6, robe: 4, charm: 5 },
  equip: { wand: { k: "wand", tier: 3, af: [{ id: "dmg", v: 22 }, { id: "mp", v: 1.4 }] },
           robe: { k: "robe", tier: 3, af: [{ id: "hp", v: 88 }] },
           charm: { k: "charm", tier: 2, af: [{ id: "mdmg", v: 18 }] } },
  bag: [], tree: {}, quests: {}, relics: 3, rebirths: 1, best: 52, lastSeen: 0, corpses: 0 };
await S("Page.reload", { ignoreCache: true }); await wait(2200);
await ev(`localStorage.setItem("necro.meta.v1", ${JSON.stringify(JSON.stringify(meta))})`);
await S("Page.reload", { ignoreCache: true }); await wait(1600);
const LOOT = [
  { k:"helm",  tier:4, af:[{id:"hp",v:120}],                    worn:true },
  { k:"glove" ,tier:3, af:[{id:"dmg",v:14},{id:"mp",v:2.1}],     bagged:true },
  { k:"boots", tier:2, af:[],                                    made:true },
  { k:"ring",  tier:5, af:[{id:"mdmg",v:31},{id:"hp",v:66}], uid:"grip", worn:true },
  { k:"belt",  tier:1, af:[],                                    mat:true },
  { k:"robe",  tier:2, af:[{id:"hp",v:41}],                      bagged:true },
];
const RUN = { has:true, loot:LOOT, gold:13640, xp:1820, killed:337, floor:23, leveled:true,
              from:16, summoned:412, used:288, secs:731 };
const EMPTY = { ...RUN, loot: [] };
const OFF = { min: 197, gold: 48210, corpses: 140, corpsesIn: 140, corpseFull: true, capped: false };
const CASES = [
  ["end",     "winEnd",     `Object.assign(window.__LASTRUN, ${JSON.stringify(RUN)})`],
  ["endempty","winEnd",     `Object.assign(window.__LASTRUN, ${JSON.stringify(EMPTY)})`],
  ["offline", "winOffline", `window.__lastOffline = ${JSON.stringify(OFF)}`],
  ["wipe",    "winWipe",    `0`],
];
const bad = [];
for (const [name, dom, seed] of CASES) {
  await ev(seed);
  const which = name === "endempty" ? "end" : name;
  await ev(`window.__openWin(${JSON.stringify(which)})`); await wait(450);
  const on = await ev(`(()=>{const e=document.getElementById(${JSON.stringify(dom)});
    if(!e) return "없다"; if(!e.classList.contains("on")) return "안 열렸다";
    const r=e.getBoundingClientRect(); return Math.round(r.width)+"x"+Math.round(r.height);})()`);
  if (typeof on === "string" && !/^\d+x\d+$/.test(on)) bad.push(`${name}: ${on}`);
  await shot(`tmp/v88_${name}_${W}.png`);
  console.log(name.padEnd(9), on);
  await ev(`window.__closeWin ? window.__closeWin() : window.__openWin(null)`); await wait(200);
}
if (errs.length) bad.push(`콘솔오류 ${errs.length}: ${errs[0]}`);
console.log(`판정: ${bad.length ? "미달 — " + bad.join(" · ") : `통과 (${W}x${H} · 창 ${CASES.length}장)`}`);
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(bad.length ? 1 : 0);
