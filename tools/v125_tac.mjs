/* V-125 자 — **운용 창이 「언제 도나」를 사람이 셀 수 있는 수로 말하는가**를 센다.
   칸 넷 × 사람 셋(막 시작 · 중반 · 저주까지 찍은 사람) × 화면 둘 = 24칸.
   `node tools/v125_tac.mjs old` 면 `__TACFX_OLD` 로 고치기 «전» 결을 그대로 다시 낸다 —
   「시체 20% 이상 · 저주 군세가 상한일 때」 하나로 뭉뚱그리던 그 모습이다
   ([[silent-zero-is-not-an-observation]] — 옛 결을 없애면 자가 그것을 덜 세게 잰다).
   ★ 같이 재는 것 셋:
     ① 폭발 문턱이 **구 수**로 적히나(상한 140 은 화면 어디에도 없는 수다)
     ② 저주 줄이 **피해 증폭**을 이름으로 말하나 — 운용이 쥐는 저주는 그 하나뿐인데
        여태 「저주」라 적어, 「관문에서만」이 약화·쇠약까지 묶는 것처럼 읽혔다
     ③ 좁은 화면(1152×648)에서 창이 넘치지 않나([[floor-erases-the-ramp]])
   ★ 그리고 **auto() 의 판정이 한 톨도 안 바뀌었나**를 산수로 못 박는다 — 문턱 식을 core 로
     옮겼으므로 옛 식과 새 식이 시체 0~140 구 전부에서 같은 답을 내야 한다
     ([[threshold-and-ruler-must-match]]). */
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

/* 사람 셋 — 군세 상한이 다르면 「군세 N기가 다 서면」도 달라야 하고, 저주를 찍은 사람에게만
   「약화·쇠약은 운용이 쥐지 않는다」가 떠야 한다. */
const WHO = [
  { t: "막 시작", lv: 3,  up: { hp: 0, mp: 0, dmg: 0, army: 0 }, tree: {}, curse: false },
  { t: "중반",   lv: 22, up: { hp: 5, mp: 3, dmg: 6, army: 2 }, tree: { bone: 4, wand: 2 }, curse: false },
  { t: "저주까지", lv: 46, up: { hp: 12, mp: 9, dmg: 14, army: 6 },
    tree: { bone: 8, armor: 5, ghoul: 1, golem: 1, elite: 3, marrow: 4, weaken: 1, decrep: 1, rot: 4, wand: 6 }, curse: true },
];
const KEYS = ["steady", "gate", "hoard", "always"];

let cells = 0, counted = 0, namedAmp = 0, sameAll = 0, overflow = 0, curseNote = 0, curseWant = 0, sample = [];
for (const w of WHO) {
  const SEED = `(()=>{const C=globalThis.__C,M=C.META;
    M.lv=${w.lv};M.gold=99999999;M.deepest=34;M.best=34;
    M.up=${JSON.stringify(w.up)};M.tree=${JSON.stringify(w.tree)};
    C.syncSkills&&C.syncSkills();C.saveMeta();return 1})()`;
  for (const vp of [{ w: 1512, h: 863 }, { w: 1152, h: 648 }]) {
    await S("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: 2, mobile: false });
    await S("Page.navigate", { url: URL }); await wait(1200);
    await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
    await S("Page.reload", { ignoreCache: true }); await wait(2200);
    await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
    await ev(SEED);
    await S("Page.reload", { ignoreCache: true }); await wait(2400);
    if (OLD) await ev(`globalThis.__TACFX_OLD=1`);
    const r = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
      window.__openWin('tactic');
      const win=document.getElementById('winTactic');
      if(!win||!win.classList.contains('on')) throw new Error('운용 창이 안 섰다');
      const out=[];
      for(const k of ${JSON.stringify(KEYS)}){
        /* 칸을 누르면 drawTactic 이 격자를 통째로 다시 그린다 — 미리 잡아 둔 칸은 그 순간
           떨어져 나간다(V-122 에서 열 칸이 다 같은 수를 냈던 자리). 누를 때마다 다시 찾고
           「sel」 이 붙었는지 자가 스스로 확인한다. */
        const q=()=>document.querySelector('#tacGrid [data-tac="'+k+'"]');
        const c=q(); if(!c) throw new Error('칸이 없다: '+k);
        c.click();
        if(!q().classList.contains('sel')) throw new Error('누름이 안 먹었다: '+k);
        const tip=document.getElementById('tacTip');
        const fx=[...tip.querySelectorAll('.tacFx .tipStat')].map(e=>e.innerText.replace(/\\n/g,' '));
        const note=[...tip.querySelectorAll('.tipNote.lockNote')].map(e=>e.innerText).join(' ');
        out.push({k, txt:tip.innerText.replace(/\\n/g,' | '), fx, note});
      }
      /* 창이 담을 자리보다 큰가 — 새 줄을 얹었으면 그 높이를 갚아야 한다. */
      const fr=win.querySelector('.frame');
      const over=Math.max(0, Math.round(fr.scrollHeight - fr.clientHeight));
      const tip=document.getElementById('tacTip');
      const tipOver=Math.max(0, Math.round(tip.scrollHeight - tip.clientHeight));
      return {out, over, tipOver};
    })()`);
    const seen = new Set();
    for (const c of r.out) {
      cells++;
      const body = OLD ? c.txt : c.fx.join(" ");
      /* ① 「몇 구」로 적혔나 — 「28구 / 140」 꼴. % 만 있으면 못 센 것이다. */
      if (/\d+구/.test(body)) counted++;
      /* ② 저주 줄이 이름을 말하나. */
      if (/피해 증폭/.test(body)) namedAmp++;
      seen.add(body);
      if (sample.length < 6 && c.k !== "steady") sample.push(`${w.t}/${vp.h}/${c.k} :: ${body}`);
      if (w.curse) { curseWant++; if (/약화|쇠약/.test(c.note)) curseNote++; }
    }
    if (seen.size === 1) sameAll++;
    overflow += (r.over > 0 || r.tipOver > 0) ? 1 : 0;
    if (r.over > 0 || r.tipOver > 0) sample.push(`넘침 ${w.t}/${vp.h}: 틀 ${r.over}px · 툴팁 ${r.tipOver}px`);
  }
}

/* ══ 판정이 안 바뀌었나 ══ 옛 식과 새 식을 시체 0~140 구 전부에서 대 본다. */
const core = await import("../js/core.js").catch(() => null);
let mismatch = -1;
if (core) {
  mismatch = 0;
  for (const gate of [0, 1]) {
    globalThis.__DOC_CORPSE = gate;
    for (const d of core.DOCTRINE_IDS) {
      globalThis.__DOCTRINE = d;
      const dc = core.docCorpseOf();
      for (const k of KEYS) {
        const t = core.TACTIC[k], need = core.novaNeedOf(k, 140);
        for (let n = 0; n <= 140; n++) {
          const oldFire = (n - dc.keep) >= 140 * t.novaCorpse * dc.novaMul;
          if (oldFire !== (n >= need)) mismatch++;
        }
      }
    }
  }
  delete globalThis.__DOC_CORPSE; delete globalThis.__DOCTRINE;
}

const P = (n, d) => `${n}/${d}`;
console.log(`운용 창 — ${OLD ? "옛 결" : "지금"}`);
console.log(`  잰 칸                            ${cells}`);
console.log(`  폭발 문턱을 «구 수»로 말한 칸    ${P(counted, cells)}`);
console.log(`  저주 줄이 «피해 증폭»을 말한 칸  ${P(namedAmp, cells)}`);
console.log(`  넷이 전부 같은 말을 한 판        ${P(sameAll, WHO.length * 2)}`);
console.log(`  약화·쇠약 줄(찍은 사람에게만)    ${P(curseNote, curseWant)}`);
console.log(`  좁은 화면 넘침                   ${P(overflow, WHO.length * 2)}`);
console.log(`  옛 식과 갈린 판정(0~140구×편성4×게이트2×운용4) ${mismatch < 0 ? "못 잼" : mismatch}`);
for (const s of sample) console.log("    · " + s);
await raw("Target.closeTarget", { targetId });
const bad = OLD ? 0 : (counted !== cells || namedAmp !== cells || overflow > 0 || mismatch !== 0 || curseNote !== curseWant);
console.log(`판정: ${OLD ? "옛 결(보정용)" : bad ? "FAIL" : "PASS"}`);
process.exit(bad ? 1 : 0);
