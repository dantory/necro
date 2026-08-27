/* V-121 자 — 물건 툴팁의 **수**를 잰다. 두 가지를 본다:
     ㉠ 소수점이 몇 자리로 적히는가(「최대 마나 +197.9177682123602」)
     ㉡ 「끼면 이렇게 된다」가 **「지금 → 끼면」 두 값**을 말하는가
   ★ ㉡ 은 V-133 에서 **뜻이 바뀌었다.** 예전엔 「가방 것의 대표 수 − 낀 것의 대표 수」가
     맞는지 봤는데, 그 뺄셈 자체가 거짓말이었다 — 「최대 체력 +369」인데 몸은 +233 만
     오른다(물건에 적힌 수는 `bodyHp` 안쪽 수다). 이제 견줌 줄은 **물건을 잠깐 끼워 보고**
     판이 쓰는 함수에서 앞뒤를 읽는다(`core.gearStats`). 그 수가 정말 맞는지는
     `tools/v133_gear.mjs` 가 실제로 「끼기」를 눌러 재고, 여기서는 **꼴**만 본다.
   `node tools/v121_num.mjs old` 면 고치기 «전» 결(__NUMOLD · __GEARFX_OLD)을 되낸다. */
import fs from "node:fs";
const OLD = process.argv[2] === "old";
const CDP = "http://127.0.0.1:9333", URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", e => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); } });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
const wait = ms => new Promise(r => setTimeout(r, ms));
const ev = async e => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true })).result?.value;

/* 낀 것은 20층·한 등급 아래, 가방 것은 34층·꼭대기 등급 — 여섯 슬롯 모두. */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=46;M.gold=1823400;M.deepest=34;M.best=34;M.corpses=880;
  M.plus={wand:9,robe:7,charm:5,helm:6,glove:4,ring:8};
  const ks=["wand","robe","charm","helm","glove","ring"];
  ks.forEach(k=>{M.equip[k]=C.mkItem(k,C.GEAR[k].tiers.length-2,false,20)});
  M.bag=ks.map(k=>C.mkItem(k,C.GEAR[k].tiers.length-1,false,34));
  C.saveMeta();return M.bag.length})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
await S("Page.reload", { ignoreCache: true }); await wait(2600);
if (OLD) await ev(`globalThis.__NUMOLD = 1; globalThis.__GEARFX_OLD = 1`);

/* ★ 창이 정말 섰는지 자가 스스로 본다(__openWin 은 토글이다 · V-119/V-120 의 그 자리). */
const open = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
  window.__openWin('bag');
  return document.getElementById('winBag').classList.contains('on')?'ok':'no'})()`);
if (open !== "ok") throw new Error("가방 창이 안 섰다 — 잰 것을 못 믿는다");
await wait(700);

const KS = ["wand", "robe", "charm", "helm", "glove", "ring"];
const NAME = { wand: "지팡이", robe: "망토", charm: "부적", helm: "투구", glove: "장갑", ring: "반지" };
/* 칸을 누르고 툴팁 글을 줄 단위로 받는다. 툴팁이 안 뜨면 예외 — 조용한 0 을 안 만든다. */
const tipOf = async (sel) => {
  const r = await ev(`(()=>{const c=document.querySelector(${JSON.stringify(sel)});
    if(!c||c.offsetParent===null) return null;
    c.click();
    const f=document.getElementById('ftip');
    if(!f||!f.classList.contains('on')) return null;
    return f.innerText})()`);
  if (r == null) throw new Error("툴팁이 안 떴다: " + sel);
  await wait(120);
  return r.split("\n").map(s => s.trim()).filter(Boolean);
};
/* 「이름 +값」 에서 값만. 단위(%·/초)는 떼고 수만 본다. */
const numOf = (line) => {
  const m = line.match(/([+−-])\s*([\d.]+)/);
  return m ? (m[1] === "+" ? 1 : -1) * parseFloat(m[2]) : null;
};
/* ★ 견줌 줄은 V-133 부터 부호 없이 「1,186 → 2,053」으로 적히므로 부호를 **선택**으로. */
const decOf = (line) => { const m = line.match(/[+−-]?\s*\d+\.(\d+)/); return m ? m[1].length : 0; };

const rows = [];
for (let i = 0; i < KS.length; i++) {
  const k = KS[i], d = ["본인 기본 공격력", "최대 체력", "마나 회복", "최대 마나", "소환수 피해", "금 획득"][i];
  const eq = await tipOf(`[data-spick="${k}"]`);
  const bag = await tipOf(`[data-bpick="${i}"]`);
  const pick = (ls, from) => ls.slice(from).find(l => l.startsWith(d)) || "";
  const eqL = pick(eq, 0), bagL = pick(bag, 0);
  /* 머리글은 셋이다 — 「끼면 이렇게 된다」(V-133) · 「지금 낀 것과 견줌」(옛것) · 「빈 슬롯」. */
  const ci = bag.findIndex(l => /끼면 이렇게 된다|견줌|빈 슬롯/.test(l));
  /* ★ 이름으로 안 집는다 — 견줌 줄은 판이 쓰는 수치 이름을 쓴다(지팡이는 물건이
     「본인 기본 공격력」인데 견줌은 「본인 공격력」이다 · 트리·강화와 같은 낱말).
     상자 아래쪽에서 **화살표가 든 첫 줄**을 집으면 슬롯을 안 가린다. */
  const cmpL = ci >= 0 ? (bag.slice(ci + 1).find(l => l.includes("→")) || "") : "";
  rows.push({ k, d, eqL, bagL, cmpL,
    dec: Math.max(decOf(eqL), decOf(bagL), decOf(cmpL)),
    화살: /→/.test(cmpL) && /\d/.test(cmpL.split("→")[0]) && /\d/.test(cmpL.split("→")[1] || "") });
}
await S("Target.closeTarget", { targetId });

const badDec = rows.filter(r => r.dec > 1);
const badCmp = rows.filter(r => !r.화살);
console.log((OLD ? "【고치기 전】" : "【지금】") + " 툴팁 여섯 벌");
for (const r of rows)
  console.log(`  ${NAME[r.k].padEnd(4)} 낀것「${r.eqL}」 가방「${r.bagL}」 견줌「${r.cmpL}」` +
    `  → 소수 ${r.dec}자리 · 「지금→끼면」 ${r.화살 ? "있음" : "없음"}`);
console.log(`  소수점이 두 자리 넘는 줄 : ${badDec.length}/6 (${badDec.map(r => NAME[r.k]).join("·") || "없음"})`);
console.log(`  견줌이 「지금→끼면」이 아닌 것 : ${badCmp.length}/6 (${badCmp.map(r => NAME[r.k]).join("·") || "없음"})`);
fs.writeFileSync(`tmp/v121_num_${OLD ? "old" : "new"}.json`, JSON.stringify({ rows, badDec: badDec.length, badCmp: badCmp.length }, null, 1));
/* ★ 판정을 말로 낸다 — 「우는 자리 0」만 적으면 자가 죽어도 통과처럼 읽힌다
   (`old` 로 부르면 ㉠ 2 · ㉡ 6 이 나와야 한다 — 문이 뺄셈 결을 되세우면 화살표가 사라진다). */
const bad = badDec.length + badCmp.length;
console.log(bad ? `미달 — 우는 자리 ${bad}` : "통과 — 여섯 벌 모두 맞다");
process.exit(bad && !OLD ? 1 : 0);
