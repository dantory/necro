/* V-131 자 — **칸에 적힌 값과 판이 실제로 무는 값을 맞댄다.**
   벨트 툴팁은 이 판에서 스킬 값을 말하는 유일한 자리다. 세 가지를 센다:
     ㉠ 적힌 시체 수 ≠ 실제로 먹은 시체 수  (폭발이 「1」이라 적고 16을 물었다)
     ㉡ 툴팁에 태그가 날것으로 뜬 칸        (title 은 평문이라 `<b>` 가 글자로 보인다)
     ㉢ 마나·재사용이 안 적힌 칸
     ㉤ 저주 셋의 지속이 안 적혔거나 실제로 걸린 초와 다른 칸 (V-131c)
   ★ **지름길로 안 잰다** — 실제로 `cast()` 를 불러 `S.corpses`·`S.mp` 가 얼마나 줄었는지
     본다([[probe-must-walk-the-real-path]]). 적힌 수는 화면의 `title` 에서 읽는다.
   ★ 문: `node tools/v131_skilltip.mjs old` → 고치기 전 글월(__TIPOLD)로 다시 잰다.  */
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

/* 「값싼 죽음」6급을 찍은 사람 — 마나가 표값과 **달라야** 손으로 적은 수가 걸린다.
   ★ 저주 셋(weaken·decrep)을 열고 **「깊은 저주」를 3급 찍는다**(V-131c) — 지속이 바닥값
     8 초가 아니라 17 초여야 하므로, 칸이 손으로 8 을 적고 있으면 그 자리에서 걸린다
     ([[floor-far-from-threshold]]). 이 때문에 재는 칸이 여덟에서 **열**로 늘었다. */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=30;M.gold=182400;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.tree={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,swift:4,
          weaken:1,decrep:1,deep:3};
  C.saveMeta();return 1})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 1, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1000);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2400);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
await ev(SEED);
/* ★ 문은 **판이 켜지기 전에** 세워야 한다 — 새로고침 뒤에 넣으면 벨트가 이미 그려진 뒤다. */
if (OLD) await S("Page.addScriptToEvaluateOnNewDocument", { source: "globalThis.__TIPOLD = 1;" });
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); globalThis.__B = await import('./js/battle.js'); return 1})()`);
await ev(`window.__toDungeon()`); await wait(8000);

const tips = await ev(`(()=>{const o={};for(const e of document.querySelectorAll('#belt [data-sk]'))o[e.dataset.sk]=e.title;return o})()`);
const ids = Object.keys(tips);
let bad = { corpse: [], tag: [], cost: [], dur: [], probe: [] };

for (const sk of ids) {
  const t = tips[sk];
  if (/<[a-z/][^>]*>/i.test(t)) bad.tag.push(sk);
  const mpReal = await ev(`globalThis.__C.mpCost(globalThis.__C.SKILLS.find(x=>x.id==='${sk}'))`);
  const wantsMp = mpReal > 0;
  if ((wantsMp && !/마나\s*\d/.test(t)) || !/재사용\s*[\d.]+초/.test(t)) bad.cost.push(sk);

  /* 실제로 쏴 본다 — 시체를 가득 채워 두고, 줄어든 만큼이 «무는 양»이다.
     ★ **한 덩이로 잰다.** 앞뒤를 따로 읽으면 그 사이 한 프레임이 끼어들어 죽인 적의
       시체가 더해지고, 그 잡음이 그대로 「어긋남」으로 읽힌다([[seed-the-probe]]).
       cast() 는 동기라 이 식이 도는 동안 판은 한 발짝도 못 나간다.
     ★ 제물은 **관문에서만** 나간다 — 층을 관문으로 세워 놓고 쏜다(안 그러면 규칙에
       막혀 0 이 나오고, 그건 「적는 것이 틀렸다」가 아니다). */
  /* 제물은 서 있는 적이 하나는 있어야 잰다 — 앞 칸들이 판을 비웠으면 기다린다.
     끝내 없으면 **조용한 0 을 안 낸다**([[silent-zero-is-not-an-observation]]). */
  if (sk === "offer") {
    for (let i = 0; i < 40 && !(await ev(`window.__S.mobs.length`)); i++) await wait(250);
    if (!(await ev(`window.__S.mobs.length`))) { console.log("  offer  ← 잴 수 없었다(판에 적이 없다)"); bad.probe.push(sk); continue; }
  }
  const shot = await ev(`(()=>{const S=window.__S,B=globalThis.__B;
    let mark=null, f0=S.floor;
    if('${sk}'==='offer'){ /* 관문·주인이 있어야 나간다(cast 가드) — 층을 관문으로 세우고
        서 있는 적 하나를 잠깐 주인으로 삼는다. 재는 것은 «무는 시체 수»뿐이다. */
      S.floor=Math.ceil(S.floor/5)*5||5; mark=S.mobs[0]; if(mark)mark.boss=1; }
    S.cd['${sk}']=0;S.mp=S.mpMax;S.corpses=140;
    const b=S.corpses; B.cast('${sk}'); const ate=b-S.corpses;
    /* ★ 저주가 걸어 둔 초도 **같은 덩이 안에서** 읽는다 — 따로 읽으면 그 사이 프레임이
       지나 17 이 16 으로 닳는다([[seed-the-probe]]). */
    const dur=Math.round({amp:S.amp,weaken:S.wkn,decrep:S.dcp}['${sk}']||0);
    if(mark)delete mark.boss; S.floor=f0; return {ate,dur}})()`);
  const ate = shot.ate;
  /* ㉤ **저주 셋의 지속**(V-131c) — 적힌 초를 툴팁에서 읽고, 방금 쏜 그 시전이 판에
     걸어 둔 초(`S.amp`/`S.wkn`/`S.dcp`)와 견준다. 위 `cast()` 가 이미 한 번 나갔으므로
     그 자리에 남아 있다 — 「깊은 저주」3급이라 8 이 아니라 **17** 이어야 한다.
     실제로 안 걸렸으면 조용한 0 을 안 내고 「잴 수 없었다」로 운다
     ([[silent-zero-is-not-an-observation]]). */
  const DURK = { amp: "amp", weaken: "wkn", decrep: "dcp" };
  if (DURK[sk]) {
    const real = shot.dur;
    const dm = /지속\s*(\d+)\s*초/.exec(t);
    const saidD = dm ? +dm[1] : 0;
    if (!real) { console.log(`  ${sk.padEnd(7)} ← 잴 수 없었다(저주가 안 걸렸다)`); bad.probe.push(sk); }
    else if (saidD !== real) bad.dur.push(`${sk} 적힘 ${saidD || "없음"} · 걸림 ${real}초`);
    console.log(`  ${sk.padEnd(7)} 지속 걸림 ${real}초 · 적힘 ${saidD || "없음"}${saidD === real ? "" : "  ← 어긋남"}`);
  }
  /* 적힌 시체 수 — 툴팁에서 읽는다(손으로 안 적는다). 안 적혔으면 0. */
  const m = /시체\s*(?:최대\s*)?(\d+)\s*구/.exec(t) || /시체\s*(\d+)\s*(?:→|$)/.exec(t);
  const said = m ? +m[1] : 0;
  const ok = said === ate;
  if (!ok) bad.corpse.push(`${sk} 적힘 ${said} · 먹음 ${ate}`);
  console.log(`  ${sk.padEnd(7)} 먹음 ${String(ate).padStart(2)}구 · 적힘 ${String(said).padStart(2)}구 ${ok ? "" : "  ← 어긋남"}   ${t.replace(/&#10;|\n/g, " / ")}`);
}

console.log(`\n㉠ 시체 수가 어긋난 칸  ${bad.corpse.length}/${ids.length}` + (bad.corpse.length ? "  " + bad.corpse.join(" · ") : ""));
console.log(`㉡ 태그가 날것으로 뜬 칸 ${bad.tag.length}/${ids.length}` + (bad.tag.length ? "  " + bad.tag.join(" · ") : ""));
console.log(`㉢ 마나·재사용이 없는 칸 ${bad.cost.length}/${ids.length}` + (bad.cost.length ? "  " + bad.cost.join(" · ") : ""));
console.log(`㉤ 지속이 어긋난 저주 칸  ${bad.dur.length}/3` + (bad.dur.length ? "  " + bad.dur.join(" · ") : ""));
const fail = bad.corpse.length + bad.tag.length + bad.cost.length + bad.dur.length + bad.probe.length;
if (bad.probe.length) console.log(`㉣ 못 잰 칸           ${bad.probe.length}/${ids.length}  ${bad.probe.join(" · ")}`);
await raw("Target.closeTarget", { targetId }); bws.close();
console.log(fail ? `\n운다 — 어긋남 ${fail}건` : "\n통과 — 칸이 적는 것과 판이 무는 것이 같다");
process.exit(OLD ? (fail ? 0 : 1) : (fail ? 1 : 0));
