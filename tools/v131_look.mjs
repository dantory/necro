/* V-131 탐색 — **벨트 칸의 툴팁이 스킬 값을 말하는 «유일한 자리»다.**
   창 열둘·일지·정산·이름을 다 훑었으니, 이번엔 사람이 던전에서 손을 얹는 여섯 칸을
   켜서 본다 — 적힌 값과 **실제로 무는 것**을 나란히 잰다([[play-it-before-measuring-it]]). */
import fs from "node:fs";
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
const shot = async n => { const { data } = await S("Page.captureScreenshot", { format: "png" }); fs.writeFileSync("tmp/v131_" + n + ".png", Buffer.from(data, "base64")); console.log("  찍음 " + n); };

/* 심는 사람 — **몇 시간 논 사람**(Lv.26). 스킬 열 개가 다 열려 있어야 열 칸을 다 본다. */
const SEED = `(()=>{const C=globalThis.__C,M=C.META;
  M.lv=26;M.xp=40;M.gold=182400;M.deepest=20;M.best=20;M.corpses=140;M.runs=30;
  M.sp={bone:8,armor:8,ghoul:1,golem:1,rot:8,harvest:8,cheap:6,chain:5,pyre:6,wand:8,weaken:1,decrep:1};
  C.saveMeta();return M.lv})()`;

await S("Emulation.setDeviceMetricsOverride", { width: 1512, height: 863, deviceScaleFactor: 2, mobile: false });
await S("Page.reload", { ignoreCache: true }); await wait(1100);
await ev(`(()=>{try{localStorage.clear()}catch(e){}return 1})()`);
await S("Page.reload", { ignoreCache: true }); await wait(2500);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); return 1})()`);
console.log("심음 Lv." + await ev(SEED));
await S("Page.reload", { ignoreCache: true }); await wait(2600);
await ev(`(async()=>{globalThis.__C = await import('./js/core.js'); globalThis.__B = await import('./js/battle.js'); return 1})()`);

/* 던전으로 — 시체가 쌓일 때까지 돌린다 */
await ev(`window.__toDungeon()`); await wait(9000);
console.log("던전  시체=" + await ev(`window.__S.corpses|0`) + " 층=" + await ev(`window.__S.floor`));

/* ① 칸에 적힌 것 — 툴팁 그대로 */
console.log("① 벨트 칸이 적는 것");
for (const l of await ev(`[...document.querySelectorAll('#belt [data-sk]')].map(e=>e.dataset.sk+' | '+e.title)`)) console.log("   " + l);

/* ② 게임이 실제로 무는 것 */
console.log("② 판이 실제로 쓰는 값");
console.log(await ev(`(()=>{const C=globalThis.__C,B=globalThis.__B;
  return C.SKILLS.map(s=>` + "`" + `\${s.id}\t적힘 mp\${s.mp} cd\${s.cd} 시체\${s.corpse}\t실제 mp\${C.mpCost(s)} cd\${(s.cd*C.cdMul()).toFixed(2)} 시체\${B.corpseNeedOf(s,false)}` + "`" + `).join('\\n')})()`));
console.log("   NOVA_GULP_FLAT = " + await ev(`globalThis.__B.NOVA_GULP_FLAT`));

/* ③ 실제로 한 번 터뜨려 본다 — 시체가 몇 구 줄어드는가 */
for (const sk of ["nova", "raise", "burn", "wall"]) {
  await ev(`(()=>{const S=window.__S;S.cd['${sk}']=0;S.mp=S.mpMax;return 1})()`);
  const b = await ev(`window.__S.corpses|0`);
  await ev(`globalThis.__B.cast('${sk}')`); await wait(120);
  const a = await ev(`window.__S.corpses|0`);
  console.log(`③ ${sk}\t시체 ${b} → ${a}  (${b - a}구 먹음)   일지: ` + JSON.stringify(await ev(`(window.__S.log[0]||'').replace(/<[^>]*>/g,'')`)));
}

/* ④ 칸에 손을 얹은 그림 */
await ev(`(()=>{const e=document.querySelector('#belt [data-sk="nova"]');const r=e.getBoundingClientRect();return [r.x,r.y,r.width]})()`);
await shot("belt");
await raw("Target.closeTarget", { targetId }); bws.close(); process.exit(0);
