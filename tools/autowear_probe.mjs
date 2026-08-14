/* 「손해 없는 것만 저절로 껴지는가」 (D-4) — 판을 굴리지 않고 core.js 를 불러 직접 잰다.
   bag_probe 와 같은 뼈대(CDP 9333 + 8774/index.html)다. 저건 「가방이 뜻대로 도나」,
   이건 **유니크가 자동 착용의 어느 쪽에 서는가**.

   재는 것 다섯 — 하나라도 FAIL 이면 exit code 1:
     ① 위로만인 유니크(twice·blast·overflow)는 빈 슬롯에 **저절로 껴진다**
     ② 주고받기 유니크(gate·lonely)는 빈 슬롯에도 **안 껴지고 가방으로** 간다
     ③ 위로만인 유니크라도 **낀 것이 더 세면**(자 하나 scoreOf) 안 갈아 끼운다
     ④ **낀 것이 유니크면 무엇도 자동으로 못 벗긴다** — 저절로 낀 규칙이 저절로 사라지면 안 된다
     ⑤ 평범한 전리품의 길은 **손대기 전과 같다**(더 좋으면 착용 · 아니면 가방)

     node tools/autowear_probe.mjs */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [], netfail = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || ""));
  if (m.method === "Network.loadingFailed") netfail.push(m.params.errorText); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");

/* 깨끗한 바닥에서 — 지난 판이 남긴 장비·가방이 있으면 「저절로 껴졌나」의 셈이 어긋난다. */
await S("Page.navigate", { url: PAGE });
await new Promise(r => setTimeout(r, 1200));
await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4200));

const ex = `(async()=>{
  const C = await import("/js/core.js");
  window.S && (window.S.speed = 0);                 // 판을 멈춘다 — 굴러가는 드랍이 META 를 건드리면 셈이 어긋난다
  const M = C.META;
  const reset = () => { M.bag.length = 0; M.gold = 0; M.equip = { wand:null, robe:null, charm:null };
                        for (const k of Object.keys(M.plus)) M.plus[k] = 0; };
  const out = []; const rec = (name, ok, detail) => out.push({ name, ok, detail });
  const U = C.UNIQ_BY_ID;

  // ① 위로만인 셋 → 빈 슬롯에 저절로
  const 위 = ["twice","blast","overflow"]; const 낀것 = [];
  let ok1 = true;
  for (const uid of 위) {
    reset();
    const r = C.takeDrop(C.mkUnique(U[uid]));
    const 낌 = !!(C.equipped(U[uid].k) && C.equipped(U[uid].k).uid === uid);
    낀것.push(uid + "=" + (r.worn && 낌 ? "낌" : "안낌"));
    if (!(r.worn === true && 낌 === true && r.bagged === false)) ok1 = false;
  }
  rec("① 위로만인 유니크 셋 → 빈 슬롯에 저절로 낀다", ok1, 낀것.join(" · "));

  // ② 주고받기 둘 → 안 낀다 · 가방으로
  const 주 = ["gate","lonely"]; const 결 = [];
  let ok2 = true;
  for (const uid of 주) {
    reset();
    const r = C.takeDrop(C.mkUnique(U[uid]));
    const 낌 = !!(C.equipped(U[uid].k) && C.equipped(U[uid].k).uid === uid);
    결.push(uid + "=" + (낌 ? "낌(틀림)" : (r.bagged ? "가방" : "사라짐")));
    if (!(r.worn === false && 낌 === false && r.bagged === true)) ok2 = false;
  }
  rec("② 주고받기 유니크 둘 → 안 끼고 가방으로", ok2, 결.join(" · "));

  // ③ 낀 것이 더 세면 위로만인 유니크라도 안 갈아 끼운다 — 자는 scoreOf 하나
  reset();
  M.equip.wand = { k:"wand", tier:4, af:[{id:"dmg",v:40},{id:"mdmg",v:40}] };   // 유니크(+60)보다 높게
  const 센것 = C.scoreOf(M.equip.wand), 유니크 = C.mkUnique(U.overflow);
  const r3 = C.takeDrop(유니크);
  const ok3 = C.scoreOf(유니크) < 센것 && r3.worn === false && r3.bagged === true
              && C.equipped("wand").uid === undefined;
  rec("③ 낀 것이 더 세면 위로만인 유니크도 안 갈아 낀다", ok3,
      "낀것=" + 센것 + " 유니크=" + C.scoreOf(유니크) + " worn=" + r3.worn);

  // ④ 낀 것이 유니크면 무엇도 자동으로 못 벗긴다
  reset();
  M.equip.wand = C.mkUnique(U.overflow);
  const 더센평범 = { k:"wand", tier:4, af:[{id:"dmg",v:40},{id:"mdmg",v:40}] };
  const r4a = C.takeDrop(더센평범);
  const r4b = C.takeDrop(C.mkUnique(U.gate));                 // 다른 유니크도 못 벗긴다
  const ok4 = r4a.worn === false && r4b.worn === false && C.equipped("wand").uid === "overflow";
  rec("④ 낀 유니크는 자동으로 안 벗겨진다", ok4,
      "평범worn=" + r4a.worn + " 유니크worn=" + r4b.worn + " 낀것=" + C.equipped("wand").uid);

  // ⑤ 평범한 전리품의 길은 손대기 전과 같다
  reset();
  M.equip.robe = C.mkItem("robe", 2, true);
  const 벗을것 = C.scoreOf(M.equip.robe);
  const r5a = C.takeDrop({ k:"robe", tier:4, af:[{id:"hp",v:30}] });   // 더 좋다 → 착용 · 벗은 것 가방
  const r5b = C.takeDrop({ k:"robe", tier:1, af:[] });                 // 더 나쁘다 → 가방
  const ok5 = r5a.worn === true && r5b.worn === false && r5b.bagged === true
              && M.bag.some(b => C.scoreOf(b) === 벗을것);
  rec("⑤ 평범한 전리품 길은 그대로(좋으면 착용 · 아니면 가방)", ok5,
      "좋은worn=" + r5a.worn + " 나쁜bagged=" + r5b.bagged + " 가방=" + M.bag.length);

  return JSON.stringify(out);
})()`;
const r = await S("Runtime.evaluate", { expression: ex, awaitPromise: true, returnByValue: true });
const results = JSON.parse(r.result.value);

let bad = 0;
for (const t of results) { if (!t.ok) bad++; console.log((t.ok ? "PASS" : "FAIL") + "  " + t.name + " — " + t.detail); }
if (errs.length || netfail.length) console.log("errors:", errs.slice(0, 4), "netfail:", netfail.slice(0, 4));
await raw("Target.closeTarget", { targetId }); bws.close();
process.exit(bad ? 1 : 0);
