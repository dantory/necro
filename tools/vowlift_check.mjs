/* 문 확인 — GATE_VOW_LIFT 가 정말 도는가([[knob-that-does-nothing]]).
   ★ 이것은 **식**을 보는 자다(약속 한 방이 얼마로 닿는가). 판이 실제로 어떻게 되는지는
     `tools/ab_vowlift.sh` 가 사람이 걷는 길로 잰다([[probe-must-walk-the-real-path]]).
   보는 것 넷:
     ① q = 0 이면 지금과 **한 톨도** 안 다른가
     ② p = 0 이면 배수가 어느 층에서도 정확히 1 인가(기본값에서 무해한가)
     ③ **얕은 층은 p 가 몇이든 1** 인가 — 앞 6분을 못 건드린다는 것이 산수로 서는가
     ④ 깊은 층에서 몸이 커질 때 위협의 **몫**(체력 대비 %)이 유지되는가
   ✗ 앞선 꼴(GATE_VOW_MIN · 「몫의 바닥」)이 왜 졌는지는 battle.js 주석에 남겼다 —
     이 자가 재기 전에 잡아냈다(1층 저주 1.7% → 24%). */
const CDP = "http://127.0.0.1:9333";
const URL = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map();
function raw(method, params = {}, sessionId) {
  const mid = ++id; bws.send(JSON.stringify({ id: mid, method, params, sessionId }));
  return new Promise((res, rej) => pend.set(mid, { res, rej }));
}
bws.addEventListener("message", ev => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id);
    return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
});
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: URL });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable");
await new Promise(r => setTimeout(r, 2500));
const expr = `(async () => {
  const core = await import("/js/core.js");
  const bat  = await import("/js/battle.js");
  const st = core.S, M = core.META;
  /* battle.js 안의 MECH_HIT 을 그대로 옮겨 적는다(export 가 아니다). 어긋나면 ①이 깨진다. */
  const HIT = { curse: 3.8, charge: 3.0, pool: 0.85 };
  /* ★ 「맨몸」이 정말 맨몸이라야 한다 — 페이지가 **실제 세이브를 물고** 뜨므로 장비·부적을
     안 비우면 맨몸이 계급40 보다 커진다(첫 판에서 실제로 그랬다: 맨몸 배수 25). */
  const 비움 = () => { M.equip = {}; M.plus = {}; M.af = []; M.amul = []; };
  const 몸 = [ {이름:"맨몸", hp:0, lv:1}, {이름:"계급20", hp:20, lv:40}, {이름:"계급40", hp:40, lv:86} ];
  const rows = [];
  for (const b of 몸) {
    비움(); M.up.hp = b.hp; M.lv = b.lv;
    for (const f of [1, 5, 20, 45, 65]) {
      st.floor = f;
      for (const [팔, hg, p] of [["지금", 2, null], ["몸보임(p=.5)", 3, 0.5]]) {
        globalThis.__HPGROW = hg; if (p == null) delete globalThis.__FLOOR_P; else globalThis.__FLOOR_P = p;
        const hm = core.hpMaxOf(), raw = core.floorDmg(f), lift = core.hpFloorLift();
        const r = { 몸: b.이름, 층: f, 팔, 최대체력: hm, 배수: Math.round(lift * 1000) / 1000 };
        for (const mech of ["curse", "charge", "pool"]) {
          const hit = HIT[mech];
          for (const [n, q] of [["q0", 0], ["q1", 1]]) {
            let pd = raw;
            if (q > 0) pd *= Math.pow(lift, q);
            pd = Math.min(pd, hm * 0.24 / hit);
            r[mech + "_" + n] = Math.round(pd * hit / hm * 1000) / 10;   // 체력의 %
          }
        }
        delete globalThis.__HPGROW; delete globalThis.__FLOOR_P;
        rows.push(r);
      }
    }
  }
  return JSON.stringify({ rows, def: bat.GATE_VOW_LIFT_DEF });
})()`;
const r = await S("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
if (r.exceptionDetails) { console.error(JSON.stringify(r.exceptionDetails)); process.exit(2); }
const { rows, def } = JSON.parse(r.result.value);
let bad = 0;
/* ★ 재기 전에는 «0 이라야 한다» 였다. 쟀고(`tools/ab_vowlift.sh` · 2026-08-22 04:1x)
   끝 조건 넷을 다 넘어 **1 로 옮겼다** — 그래서 이제는 «옮겨진 채로 있는가» 를 본다.
   되돌릴 길(q=0)은 그대로 남아 있고, 아래 ②가 그 길이 무해함을 매번 다시 잰다. */
if (def !== 1) { console.log(`\u2717 기본값이 1 이 아니다(${def}) — D-12 에서 옮긴 값이다`); bad++; }
console.log("한 방이 «내 최대체력의 몇 %»로 닿는가 — q=0(지금) 대 q=1(위협도 같이 큼)\n");
console.log("| 몸 | 층 | 팔 | 최대체력 | 배수 | 저주 | 돌진 | 웅덩이 |");
console.log("| --- | --- | --- | --- | --- | --- | --- | --- |");
const cell = (a, b) => a === b ? `${a}%` : `${a}% → **${b}%**`;
for (const x of rows)
  console.log(`| ${x.몸} | ${x.층} | ${x.팔} | ${x.최대체력} | \u00d7${x.배수} | ${cell(x.curse_q0, x.curse_q1)} | ${cell(x.charge_q0, x.charge_q1)} | ${cell(x.pool_q0, x.pool_q1)} |`);

const now = rows.filter(x => x.팔 === "지금").filter(x => x.배수 !== 1);
if (now.length) { console.log(`\n\u2717 ②  지금 팔인데 배수가 1 이 아닌 칸 ${now.length}`); bad++; }
else console.log("\n\u2713 ②  p=0 에서는 배수가 어느 층·어느 몸에서도 정확히 1 — 기본값은 무해하다");

const 얕 = rows.filter(x => x.층 <= 20 && x.배수 !== 1);
if (얕.length) { console.log(`\u2717 ③  얕은 층(≤20)에서 배수가 1 이 아닌 칸 ${얕.length} — 앞 6분을 건드린다`); bad++; }
else console.log("\u2713 ③  얕은 층(1·5·20)은 p 를 켜도 배수 1 — 이 손잡이는 앞 6분에 닿을 수가 없다");

console.log("\n깊은 층(45층)에서 «몸이 보이게» 켰을 때 — 위협의 몫이 유지되는가:");
let 샘 = 0;
for (const b of ["맨몸", "계급20", "계급40"]) {
  const a2 = rows.find(x => x.몸 === b && x.층 === 45 && x.팔 === "지금");
  const c2 = rows.find(x => x.몸 === b && x.층 === 45 && x.팔 === "몸보임(p=.5)");
  const d0 = Math.round((a2.pool_q0 - c2.pool_q0) * 10) / 10, d1 = Math.round((a2.pool_q0 - c2.pool_q1) * 10) / 10;
  if (Math.abs(d1) > 0.2) 샘++;
  console.log(`  ${b}: 최대체력 ${a2.최대체력} → ${c2.최대체력}(\u00d7${c2.배수}) · 웅덩이 몫 ${a2.pool_q0}% → q0 ${c2.pool_q0}% (${d0 === 0 ? "그대로" : (d0 > 0 ? "-" : "+") + Math.abs(d0)}) · q1 ${c2.pool_q1}% (${d1 === 0 ? "그대로" : (d1 > 0 ? "-" : "+") + Math.abs(d1)})`);
}
if (샘) { console.log(`\u2717 ④  q=1 인데도 몫이 새는 몸 ${샘}`); bad++; }
else console.log("\u2713 ④  q=1 이면 몸을 보이게 해도 위협의 몫이 «한 톨도» 안 샌다");
console.log(bad ? `\n\u2717 어긋난 것 ${bad}` : "\n\u2713 문이 선다 — 기본값은 무해하고, 얕은 층엔 못 닿고, 깊은 층에서 몫을 지킨다");
await S("Target.closeTarget", { targetId }).catch(() => {});
process.exit(bad ? 1 : 0);
