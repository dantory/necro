/* **스킬마다 저만의 그림이 뜨는가.**
     node tools/fx_art.mjs           지금 코드
     FXQA_OLD=1 node tools/fx_art.mjs   일부러 옛 상태로 되돌려 실패를 내 본다(캘리브레이션)

   ★★ 이 자가 없어서 병수님이 또 먼저 봤다(2026-08-15): "또 스킬 이펙트 에셋 제대로
   안만든거 있네". `icon_qa` 는 **벨트 칸의 아이콘**을 세지만 **판에서 터지는 그림**은
   아무도 안 셌다. 게다가 그리는 쪽이 모르는 kind 를 전부 `hit` 으로 떨어뜨려서
   **404 가 안 난다** — 「없다」가 「비슷한 게 뜬다」로 위장된다. 그래서 실제로
   태우기는 소환 그림, 제물은 폭발 그림으로 나갔고 저주는 아무것도 안 떴는데,
   자는 여덟 개 다 통과라고 말하고 있었다.

   셋을 본다:
     ① 스킬이 fx 를 **하나라도** 내는가 (안 내면 화면에서 안 쓴 것과 같다)
     ② 그 kind 가 집는 그림 파일이 **실제로 있는가** (FX_ART 표 + HTTP 로 확인)
     ③ 두 스킬이 **같은 그림**을 쓰지 않는가 (빌려 쓰면 뜻이 어긋난다) */
const CDP = "http://127.0.0.1:9333", PAGE = "http://127.0.0.1:8774/index.html";
const BASE = PAGE.replace(/index\.html$/, "");
const ver = await (await fetch(CDP + "/json/version")).json();
const bws = new WebSocket(ver.webSocketDebuggerUrl);
let id = 0; const pend = new Map(); const errs = [];
const raw = (m, p = {}, s) => { const i = ++id; bws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); return new Promise((res, rej) => pend.set(i, { res, rej })); };
bws.addEventListener("message", ev => { const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { const p = pend.get(m.id); pend.delete(m.id); return m.error ? p.rej(new Error(JSON.stringify(m.error))) : p.res(m.result); }
  if (m.method === "Runtime.exceptionThrown") errs.push((m.params.exceptionDetails?.exception?.description || "").slice(0, 140)); });
await new Promise(r => bws.addEventListener("open", r));
const { targetId } = await raw("Target.createTarget", { url: PAGE });
const { sessionId } = await raw("Target.attachToTarget", { targetId, flatten: true });
const S = (m, p) => raw(m, p, sessionId);
await S("Page.enable"); await S("Runtime.enable"); await S("Network.enable");
await S("Network.setCacheDisabled", { cacheDisabled: true });     // 옛 모듈로 재면 헛것을 본다
const ev2 = async (e, aw = false) => (await S("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: aw })).result?.value;
/* 트리를 열어 둔다 — 구울·골렘은 나무 뒤에 있어 안 열면 부를 수가 없다. */
await S("Runtime.evaluate", { expression: `localStorage.setItem("necro.meta.v1",JSON.stringify({gold:9000,lv:20,deepest:14,runs:3,up:{hp:3,mp:4,dmg:2,army:3},equip:{},bag:[],tree:{bone:2,armor:3,ghoul:1,legion:3,golem:1,rot:1,harvest:1}}))` });
await S("Page.reload", { ignoreCache: true });
await new Promise(r => setTimeout(r, 4800));
await ev2(`window.toDungeon && window.toDungeon()`);
await new Promise(r => setTimeout(r, 700));
/* 관문 층으로 — 제물(offer)은 주인이 있어야 걸린다. */
await ev2(`(async()=>{const B=await import("/js/battle.js");B.enterFloor(10);return 1;})()`, true);
await new Promise(r => setTimeout(r, 3000));

const OLD = process.env.FXQA_OLD === "1";
if (OLD) {
  /* 캘리브레이션 — 표에서 새로 넣은 넷을 빼면 그리는 쪽이 옛날처럼 `hit` 으로 떨군다.
     자가 이 상태를 **실패로 잡아야** 믿을 수 있다(오늘 「자가 통과시켰다」가 네 번 났다). */
  await ev2(`for (const k of ["curse","burn","offer","rise"]) delete window.FX_ART[k];
             window.__FXQA_OLDKIND = 1;`);
}

const res = await ev2(`(async()=>{
  const B = await import("/js/battle.js"), C = await import("/js/core.js");
  const S = window.S, ART = window.FX_ART || {};
  const old = !!window.__FXQA_OLDKIND;
  S.speed = 0;
  const IDS = ["raise","ghoul","golem","nova","amp","burn","wall","offer"];
  const rows = [];
  for (const id of IDS) {
    /* 판을 매번 새로 세운다 — 앞 스킬의 재사용 대기·마나가 남으면 「안 걸림」이 난다
       (skill_qa 에서 한 번 오보 직전까지 갔던 자리다). */
    S.fx.length = 0; if (S.walls) S.walls.length = 0;
    S.minions.length = 0; S.mobs.length = 0; S.piles.length = 0;
    S.corpses = 40; S.mp = C.mpMaxOf() * 10; for (const k in S.cd) delete S.cd[k];
    for (let i = 0; i < 5; i++) S.mobs.push({ id: 900+i, kind:"zombie", x: 200+i*16, y: -20+i*18,
      hp: 9e9, hpMax: 9e9, dmg: 5, spd: 20, h: 50, r: 20, atk: 1, born: 0 });
    /* 제물은 주인이 있어야 한다 — 관문 층이라 이미 서 있지만, 판을 비웠으니 하나 세운다 */
    if (id === "offer") S.mobs.push({ id: 990, kind:"boss", boss: true, x: 240, y: 0,
      hp: 9e9, hpMax: 9e9, dmg: 9, spd: 12, h: 90, r: 40, atk: 1, born: 0,
      lord: { n: "시험용 주인", col: "#d0702c" } });
    B.addCorpse(12, 8, "small", 4, 400); B.addCorpse(205, -10, "small", 4, 400);
    /* ★ **「안 걸림」에 이유를 붙인다.** 처음엔 실패 줄이 「자의 흠일 수 있다 —
       마나·시체·주인을 본다」였는데, 그 말로는 **자를 고칠지 코드를 고칠지 못 정한다**
       (실제로 두 번 돌려 ghoul·golem 이 번갈아 걸렸다 안 걸렸다 했고, 어느 문이 닫혔는지
       알 길이 없어 진단에만 한참 썼다). cast 의 문 넷을 **재기 직전에 그대로** 적어 둔다. */
    const sk = window.SKILLS.find(s => s.id === id);
    const guard = { cd: +(S.cd[id] || 0).toFixed(2), mp: Math.round(S.mp), 마나값: C.mpCost(sk),
      시체: S.corpses, 시체값: sk.corpse, 군세: C.armyN(), 상한: C.armyCap(),
      죽음: !!S.dead, 관문: C.isGate ? !!C.isGate(S.floor) : null,
      주인: S.mobs.some(m => m.boss) };
    const ok = B.cast(id);
    const kinds = [...new Set(S.fx.map(f => f.kind))];
    /* 벽은 fx 가 아니라 S.walls 로 산다 — 그림은 fx/bonewall 을 쓴다 */
    const walls = (S.walls || []).length;
    /* 코드로 그리는 kind(rise·gib·예고 고리)는 그림이 필요 없다 — "code" 로 적어 돌려준다.
       표에 없는 kind 만 「그림이 없다」다(그리는 쪽이 조용히 hit 으로 떨군다). */
    const imgs = kinds.map(k => (ART[k] ? (ART[k].code ? "code" : ART[k].img) : null));
    rows.push({ 스킬: id, 걸림: !!ok, kind: kinds, 벽: walls, 그림: imgs, ...(ok ? {} : { 문: guard }) });
  }
  return rows;
})()`, true);

/* 그림이 진짜 있는가 — 표가 가리키는 파일을 HTTP 로 두들긴다(표만 믿으면 오타를 못 본다). */
const exists = {};
const check = async (p) => { if (p in exists) return exists[p];
  try { const r = await fetch(BASE + "assets/" + p + ".png", { method: "GET" });
        exists[p] = r.ok; } catch { exists[p] = false; } return exists[p]; };

const RAISE_SET = new Set(["raise","ghoul","golem"]);
/* ★ **공통 연출은 겹침이 아니다.** `rise`(시체를 쓴 자리)는 여덟 중 다섯이 **같이 내는**
   kind 다 — 그 그림 하나를 다섯이 쓰는 것은 「빌려 썼다」가 아니라 그게 공통 연출인
   것이다. 예전엔 rise 가 코드로 그려져서 이 구분이 필요 없었는데(그림이 "code" 라 겹침
   판에서 빠졌다), 그림을 걸자마자 ③ 이 다섯 스킬을 한꺼번에 잡았다.
   대신 아래 ① 이 그대로 남는다 — **공통 것 말고 제 그림이 하나는 있어야 한다.** */
const COMMON_KIND = new Set(["rise"]);
const fails = [];
const used = new Map();                        // 그림 → 그걸 쓰는 스킬들
for (const r of res) {
  if (!r.걸림) { fails.push(`${r.스킬}: 안 걸림 — 닫힌 문 ${JSON.stringify(r.문)}`); continue; }
  if (r.스킬 === "wall") {
    if (!r.벽) fails.push("wall: 벽이 안 섬");
    if (!await check("fx/bonewall")) fails.push("wall: fx/bonewall.png 없음");
    if (!used.has("fx/bonewall")) used.set("fx/bonewall", []);
    used.get("fx/bonewall").push("wall");
    continue;
  }
  if (!r.kind.length) { fails.push(`${r.스킬}: ① fx 를 하나도 안 냄 — 화면에서 안 쓴 것과 같다`); continue; }
  for (let i = 0; i < r.kind.length; i++) {
    const k = r.kind[i], img = r.그림[i];
    if (!img) { fails.push(`${r.스킬}: ② kind "${k}" 가 FX_ART 에 없음 — hit 으로 떨어진다`); continue; }
    if (img === "code") continue;                       // 코드로 그린다 — 파일도 겹침도 볼 것이 없다
    if (!await check(img)) { fails.push(`${r.스킬}: ② ${img}.png 없음`); continue; }
    if (COMMON_KIND.has(k)) continue;                   // 공통 연출 — 있는지만 보고 겹침 판에선 뺀다
    if (!used.has(img)) used.set(img, []);
    used.get(img).push(r.스킬);
  }
  /* ★ **제 것이 하나는 있어야 한다.** 시체를 쓴 자리(rise)는 여덟 중 다섯이 같이 내는
     공통 연출이라, 그것만 내고 끝나면 화면에서 「무슨 스킬을 썼는지」가 안 갈린다.
     소환 셋은 예외 — 그 솟는 혼이 곧 「일으켰다」이다.
     ★ 판정은 **kind** 로 한다 — 예전엔 `그림 === "code"` 로 봤는데, rise 에 그림을 걸자
       그 줄이 조용히 통과가 되어 「공통 것만 내는 스킬」을 못 잡게 됐다. */
  if (!RAISE_SET.has(r.스킬) && r.kind.every((k, i) => COMMON_KIND.has(k) || r.그림[i] === "code"))
    fails.push(`${r.스킬}: ① 제 그림이 없다 — 공통 연출(${r.kind.join("·")})만 낸다`);
}
/* ③ 두 스킬이 같은 그림 — 다만 소환 셋(raise/ghoul/golem)은 **같은 의식**이라 봐준다. */
for (const [img, who] of used) {
  const uniq = [...new Set(who)];
  if (uniq.length > 1 && !uniq.every(s => RAISE_SET.has(s)))
    fails.push(`③ ${img} 를 ${uniq.join("·")} 가 같이 쓴다 — 빌려 쓰면 뜻이 어긋난다`);
}

console.log(JSON.stringify({ 모드: OLD ? "옛 상태(캘리브레이션)" : "지금", 줄: res,
  그림쓰임: Object.fromEntries([...used].map(([k, v]) => [k, [...new Set(v)]])),
  실패: fails, 콘솔오류: errs,
  판정: fails.length ? `미달 ${fails.length}건` : "통과" }, null, 1));
await fetch(`${CDP}/json/close/${targetId}`);
process.exit(fails.length ? 1 : 0);
