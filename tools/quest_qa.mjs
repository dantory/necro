/* ⑦ 일지(도전 과제) 검수기 — 씨앗 고정 판에서 **각 과제가 실제로 달성되는지**,
   **중복 지급이 없는지**, **저장/불러오기 뒤에도 깬 기록이 남는지**를 판정한다.
   다른 probe(rebirth_qa · corpse_probe)의 CDP 골격을 본떴고, loop_health 처럼 씨앗을
   페이지가 뜨기 전에 갈아 끼워 A/B 가 성립하게 한다(같은 씨앗이면 같은 판).

     node tools/quest_qa.mjs [씨앗들]      기본 1,3,9  (⑤ 「씨앗 하나는 표본 하나」)

   각 과제는 **제 진짜 훅**을 지나 판정한다(questNote 를 직접 부르지 않는다):
     unique  equipFromBag 로 유니크를 손으로 낀다
     army10  floor 20 에서 소환수를 열까지 세운다(summon)
     dig4    금을 들고 무덤을 파(digDraw) 4등급/유니크가 나올 때까지
     gate5   enterFloor 로 관문 다섯을 지난다(+ 판마다 리셋되는지)
     rebirth deepest 를 넘겨 rebirth()
     offer   관문·보스·시체를 갖춰 cast("offer")
     feast   시체 잔치 노드를 찍고 nova 로 한 소환수를 여덟 번 먹인다
   그리고 **중복 지급 없음**(두 번째 신호에 유해가 안 붙는다)과 **저장 persist**
   (전부 깬 뒤 reload → 그대로 남는다)을 같은 씨앗에서 확인한다. */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const SEEDS = (process.argv[2] || "1,3,9").split(",").map(s => +s).filter(Boolean);

/* 남아 있던 판을 쓸고 시작한다(loop_health 와 같은 이유 — 묵은 탭이 프레임을 나눠 먹는다). */
const stale = (await (await fetch(CDP + "/json/list")).json())
  .filter((t) => t.type === "page" && t.url.startsWith(PAGE.split("index.html")[0]));
for (const t of stale) await fetch(`${CDP}/json/close/${t.id}`).catch(() => {});

const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
function raw(m, p = {}, s) { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); }
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push("EXC " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 160)); });
await new Promise(r => bws.addEventListener("open", r));

/* ── 페이지 안에서 도는 검사 본문 ──────────────────────────────────────────
   모듈 싱글턴(core/battle)을 import 해 실제 함수를 지난다. 과제마다 META.quests·relics 를
   먼저 비워 **깨끗한 델타**를 재고(과제끼리 안 섞이게), 진짜 훅을 지나 판정한다. */
const BODY = `(async () => {
  const C = await import("/js/core.js"), B = await import("/js/battle.js");
  const META = C.META, S = C.S;
  const out = { quests: {}, dup: {}, reset: null, persist: null, err: null };
  const relics = () => META.relics | 0;
  const clean = () => { META.quests = {}; META.relics = 0; };
  const idOf = (tag) => C.QUESTS.find(q => q.tag === tag).id;
  const rewardOf = (tag) => C.QUESTS.find(q => q.tag === tag).reward;
  /* 한 과제 판정: 훅을 한 번 지나 「깼나 · 유해가 정확히 보상만큼 붙었나」, 다시 지나
     「중복 지급이 없나(유해 불변)」. drive() 는 그 과제의 진짜 훅을 두 번 부른다. */
  const check = (tag, drive) => {
    clean();
    const b0 = relics(); drive();
    const done1 = !!META.quests[idOf(tag)], gain = relics() - b0;
    const b1 = relics(); drive();
    const gain2 = relics() - b1;
    out.quests[tag] = done1 && gain === rewardOf(tag);
    out.dup[tag] = gain2 === 0;
  };
  try {
    /* unique — 유니크를 손으로 낀다(equipFromBag). 두 번째는 다른 유니크를 껴도 안 준다. */
    check("unique", () => { const u = C.UNIQUE[0]; META.bag = [C.mkUnique(u)]; C.equipFromBag(0); });

    /* army10 — floor 20 에서 소환수를 열까지. armyCap 을 대장간으로 올려(투자) 열이 서게 한다. */
    check("army10", () => {
      B.newRun(); META.up.army = 30; S.floor = 20; S.minions.length = 0;
      for (let i = 0; i < 10; i++) B.summon("skel", null);
    });

    /* dig4 — 금을 들고 깊은 무덤을 판다. 4등급/유니크가 나올 때까지 여러 번(결정적). */
    check("dig4", () => {
      META.gold = 5_000_000; META.deepest = 25; S.uniqCtr = 0;
      for (let i = 0; i < 120 && !META.quests[idOf("dig4")]; i++) C.digDraw();
    });

    /* gate5 — 관문 다섯을 지난다(enterFloor 로 f-1 이 관문인 층에 든다). */
    check("gate", () => { B.newRun(); for (const f of [6, 11, 16, 21, 26]) B.enterFloor(f); });

    /* rebirth — 환생은 **제 몫(relicGain)도 유해를 준다.** 그래서 총 델타에서 그 몫을 빼야
       과제의 몫만 남는다. 두 번째 환생(다시 deepest 를 넘겨 부른다)에선 과제 몫이 0 이어야
       한다(1회성 — 환생 제 몫 6 은 계속 주지만 과제는 두 번 안 준다). */
    { clean();
      const rg = C.relicGain(30);
      META.deepest = 30; const r0 = relics(); C.rebirth();
      const mine1 = relics() - r0 - rg, done = !!META.quests[idOf("rebirth")];
      META.deepest = 30; const r1 = relics(); C.rebirth();
      const mine2 = relics() - r1 - rg;
      out.quests.rebirth = done && mine1 === rewardOf("rebirth");
      out.dup.rebirth = mine2 === 0; }

    /* offer — 관문·보스·시체·마나를 갖춰 제물을 바친다. */
    check("offer", () => {
      B.newRun(); S.floor = 20; S.mobs = [{ boss: true, x: 0, y: 0, hp: 999, hpMax: 999, r: 20, lord: null }];
      S.corpses = 40; S.mp = 200; S.cd = {}; B.cast("offer");
    });

    /* feast — 시체 잔치 노드를 찍고 nova 로 한 소환수를 여덟 번 먹인다. */
    check("feast", () => {
      B.newRun(); META.tree.feast = 1; META.lv = 30; C.syncSkills();
      S.minions = [{ id: 1, kind: "skel", x: 0, y: 0, r: 10, hp: 1, hpMax: 500, fed: 0, dmg: 5, atk: 0, home: 0, rad: 100 }];
      S.mobs = [{ boss: false, x: 5, y: 0, hp: 9e9, hpMax: 9e9, r: 20 }];
      S.corpses = 400; S.mp = 9999;
      for (let i = 0; i < 10; i++) { S.cd = {}; S.mp = 9999; B.cast("nova"); }
    });

    /* 판마다 리셋 — 관문 둘을 지난 뒤 newRun 하면 이 판의 신호가 0 으로 돌아간다.
       (gate5 를 아직 안 깬 상태에서 재야 하므로 quests 를 비우고 본다.) */
    { clean(); B.newRun(); B.enterFloor(6); B.enterFloor(11);
      const before = C.questProg(C.QUESTS.find(q => q.tag === "gate"));
      B.newRun();
      const after = C.questProg(C.QUESTS.find(q => q.tag === "gate"));
      out.reset = before === 2 && after === 0; }

    /* 저장 persist — 일곱을 전부 깬 것으로 두고 저장한다. reload 뒤 load() 가 그대로 올리는지는
       바깥에서 다시 import 해 확인한다(아래). */
    META.quests = {}; for (const q of C.QUESTS) META.quests[q.id] = 1;
    C.saveMeta();
    out.savedIds = C.QUESTS.map(q => q.id);
    out.relicTotal = C.questRelicTotal();
  } catch (e) { out.err = e.message; }
  return JSON.stringify(out);
})()`;

/* reload 뒤 저장이 살아남았는지 — 새로 import 한 core 의 META.quests 를 읽는다. */
const PERSIST = `(async () => {
  const C = await import("/js/core.js");
  return JSON.stringify({ quests: C.META.quests || {} });
})()`;

async function oneSeed(seed) {
  const { targetId } = await raw("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
  const S = (m, p) => raw(m, p, sessionId);
  await S("Page.enable"); await S("Runtime.enable");
  await S("Page.addScriptToEvaluateOnNewDocument", { source:
    `Math.random = (() => { let s = (${seed} >>> 0) || 1;
       return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; })();` });
  await S("Page.navigate", { url: PAGE });
  await new Promise(r => setTimeout(r, 1500));
  await S("Runtime.evaluate", { expression: `localStorage.removeItem("necro.meta.v1")` });
  await S("Page.reload", { ignoreCache: true });
  await new Promise(r => setTimeout(r, 3500));
  /* 배경 rAF 가 S 를 건드리지 못하게 끊는다 — 직접 세팅한 판이 흔들리면 안 된다. */
  await S("Runtime.evaluate", { expression: "window.requestAnimationFrame = () => 0" });
  await new Promise(r => setTimeout(r, 150));
  const r = await S("Runtime.evaluate", { expression: BODY, awaitPromise: true, returnByValue: true });
  const res = JSON.parse(r.result.value);
  /* 저장이 살아남았나 — reload 하고 다시 읽는다(load() 의 quests 병합을 검사). */
  await S("Page.reload", { ignoreCache: true });
  await new Promise(r => setTimeout(r, 3000));
  const p = await S("Runtime.evaluate", { expression: PERSIST, awaitPromise: true, returnByValue: true });
  const persisted = JSON.parse(p.result.value).quests;
  res.persist = (res.savedIds || []).every(id => persisted[id] === 1);
  await raw("Target.closeTarget", { targetId });
  return res;
}

const TAGS = ["unique", "army10", "dig4", "gate", "rebirth", "offer", "feast"];
const rows = [];
for (const seed of SEEDS) {
  const res = await oneSeed(seed);
  rows.push({ seed, res });
  if (res.err) { console.log(`씨앗 ${seed}  오류: ${res.err}`); continue; }
  const okQ = TAGS.filter(t => res.quests[t]).length;
  const okD = TAGS.filter(t => res.dup[t]).length;
  console.log(`씨앗 ${String(seed).padStart(2)}  달성 ${okQ}/7  중복없음 ${okD}/7  리셋 ${res.reset ? "O" : "X"}  persist ${res.persist ? "O" : "X"}`);
  console.log(`         ` + TAGS.map(t => `${t}:${res.quests[t] ? "달성" : "✗"}${res.dup[t] ? "" : "!중복"}`).join(" · "));
}

/* ── 판정 ── 씨앗 전부에서 일곱이 다 달성되고, 중복지급 0, 리셋·persist 가 참이어야 PASS. */
let pass = rows.length === SEEDS.length && rows.every(({ res }) =>
  !res.err && TAGS.every(t => res.quests[t]) && TAGS.every(t => res.dup[t]) && res.reset && res.persist);
const total = rows.find(r => !r.res.err)?.res.relicTotal;
if (total != null) { console.log(`\n일지 유해 총합 ${total} (10~14 안 · 초반 환생 유해 1 보다 굵되 과하지 않게)`);
  if (total < 10 || total > 14) pass = false; }
console.log(`판정: ${pass ? "PASS" : "FAIL"}`);
console.log("errors:", errs.slice(0, 3));
bws.close();
process.exit(pass ? 0 : 1);
