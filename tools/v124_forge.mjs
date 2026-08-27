/* V-124 자 — 대장간 툴팁이 **고른 칸이 움직이는 수치를 말하는가**를 센다.
   칸 넷 × 사람 셋(막 시작 · 중반 · 오래 논 사람) = 열두 칸.
   `node tools/v124_forge.mjs old` 면 `__FORGEFX_OLD` 로 고치기 «전» 결을 그대로 다시 낸다
   — 「지금」 줄이 네 칸 다 똑같던 그 모습이다([[silent-zero-is-not-an-observation]]).
   ★ 좁은 화면(1152×648)에서 창이 넘치는지도 같이 잰다 — 새 줄을 얹었으면 그 높이를
   갚아야 한다([[floor-erases-the-ramp]] · V-123 에서 27px 이 넘쳤던 자리). */
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

/* 사람 셋 — 강화 단계가 다르면 「지금」도 「한 단계 더」도 달라야 한다. */
const WHO = [
  { t: "막 시작", lv: 3,  up: { hp: 0, mp: 0, dmg: 0, army: 0 }, tree: {} },
  { t: "중반",   lv: 22, up: { hp: 5, mp: 3, dmg: 6, army: 2 }, tree: { bone: 4, wand: 2 } },
  { t: "오래 놈", lv: 46, up: { hp: 12, mp: 9, dmg: 14, army: 6 },
    tree: { bone: 8, armor: 5, ghoul: 1, golem: 1, elite: 3, marrow: 4, fury: 2, rot: 4, harvest: 3, wand: 6, swift: 4, weaken: 1, deep: 1 } },
];

let cells = 0, spoke = 0, toldNext = 0, sameAll = 0, overflow = 0, sample = [];
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
    if (OLD) await ev(`globalThis.__FORGEFX_OLD=1`);
    const r = await ev(`(()=>{[...document.querySelectorAll('.win.on')].forEach(e=>e.classList.remove('on'));
      window.__openWin('forge');
      const win=document.getElementById('winForge');
      if(!win||!win.classList.contains('on')) throw new Error('대장간이 안 섰다');
      const out=[];
      for(const k of ["hp","mp","dmg","army"]){
        /* ★ 칸을 누르면 drawForge 가 격자를 통째로 다시 그린다 — 미리 잡아 둔 칸은 그
           순간 **떨어져 나간다**(V-122 에서 열 칸이 다 같은 수를 냈던 자리). 누를 때마다
           다시 찾고, 「sel」 이 붙었는지 자가 스스로 확인한다. */
        const q=()=>document.querySelector('#forgeGrid [data-fpick="'+k+'"]');
        const c=q(); if(!c) throw new Error('칸이 없다: '+k);
        c.click();
        if(!q().classList.contains('sel')) throw new Error('누름이 안 먹었다: '+k);
        const tip=document.getElementById('forgeTip');
        const fx=[...tip.querySelectorAll('.tFx .tipStat')].map(e=>e.innerText.replace(/\\n/g,' '));
        /* 툴팁이 창 밖으로 나가는가 — 밑판(.frame)이 화면을 넘는 만큼 */
        const fr=document.querySelector('#winForge .frame').getBoundingClientRect();
        out.push({k,fx,over:Math.max(0,Math.round(fr.bottom-innerHeight)+Math.max(0,Math.round(-fr.top)))});
      }
      return JSON.stringify(out);})()`);
    const arr = JSON.parse(r);
    /* 네 칸이 **전부 같은 말**을 하면 그건 고른 칸을 안 보고 있다는 뜻이다(옛 결의 꼴). */
    const said = arr.map(o => o.fx.join("|"));
    if (new Set(said).size === 1) sameAll++;
    for (const o of arr) {
      cells++;
      if (o.fx.length) spoke++;
      if (o.fx.some(t => /한 단계 더|단계 뒤/.test(t))) toldNext++;
      if (o.over > 0) { overflow++; if (sample.length < 4) sample.push(`${w.t}·${vp.w}×${vp.h}·${o.k} 넘침 ${o.over}px`); }
    }
    if (vp.w === 1512) console.log(`  ${w.t.padEnd(6)} · 말한 칸 ${arr.filter(o => o.fx.length).length}/4 · 보기: ${arr[2].fx.join(" / ") || "(없음)"}`);
  }
}
console.log((OLD ? "[옛 결] " : "[지금] ") + `잰 칸 ${cells}`);
console.log(`  고른 칸이 «움직이는 수치»를 말한 칸   ${spoke}/${cells}`);
console.log(`  «강화하면 얼마가 되는지» 말한 칸      ${toldNext}/${cells}`);
console.log(`  네 칸이 전부 같은 말을 한 판          ${sameAll}/${WHO.length * 2}`);
console.log(`  좁은 화면에서 넘친 칸                 ${overflow}/${cells}`);
if (sample.length) console.log("  보기: " + sample.join(" | "));
/* 판정 — 열두 칸이 **전부** 제 수치를 말하고, 넘치는 칸이 없어야 통과.
   옛 결(`old`)에서는 0/24 라 울어야 맞다 — 자를 보정하는 자리다. */
const bad = spoke < cells || toldNext < cells || sameAll > 0 || overflow > 0;
console.log(bad ? `판정 미달 — 말 안 한 칸 ${cells - spoke} · 다음을 안 적은 칸 ${cells - toldNext} · 넘침 ${overflow}` : "판정 통과");
await S("Target.closeTarget", { targetId });
process.exit(bad && !OLD ? 1 : 0);
