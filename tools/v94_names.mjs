/* V-94 — **물건 이름에 「의」가 사슬로 이어지는가**를 잰다.
   레어 이름은 `접두 + 얼굴 + "의" + 접미`로 붙는데, 얼굴 이름 절반이 이미 「심장의 홀」
   이라 붙는 순간 「잔혹한 심장의 홀의 샘」이 된다. `nameOf` 의 주석이 **접두사**에는
   못을 박아 뒀지만 뒷낱말에는 안 옮겨져 있었다([[carry-fixes-forward]]).
   ★ **「의」를 세지 않고 «꾸밈의 의»만 센다** — `수의`(壽衣)·`제의`(祭衣)는 물건 이름
     자체라 그냥 세면 멀쩡한 「수의 자락의 성채」가 미달로 나온다(없는 결함을 지어내는
     그 결 · [[silent-zero-is-not-an-observation]]).
   node tools/v94_names.mjs [old]     old 면 **고치기 전 결**(얼굴을 안 깎고 붙이기)로 잰다 —
     자가 정말 우는지 먼저 보정한다(안 울면 「통과 0」은 아무 뜻이 없다).  */
const C = await import("../js/core.js");
const { GEAR, GEAR_ALT, AFFIX, nameOf, gearFace } = C;
const OLD = process.argv[2] === "old";
const NOT_GEN = ["수의", "제의"];
/* 이름 하나에 든 «꾸밈의 의» 수 — 낱말이 「의」로 끝나면 꾸밈이다(목록에 든 것만 뺀다). */
const gen = (n) => n.split(" ").filter(w => w.endsWith("의") && !NOT_GEN.includes(w)).length;

const rows = [];
let tot = 0, chain = 0, worst = "", worstN = 0;
const pres = Object.values(AFFIX).map(a => a.pre);
const sufs = Object.values(AFFIX).filter(a => a.suf).map(a => a.suf);
for (const k of Object.keys(GEAR)) {
  const alt = GEAR_ALT[k];
  for (let t = 1; t < GEAR[k].tiers.length; t++) {
    const faces = (alt && alt[t] && alt[t].length) ? alt[t] : [GEAR[k].tiers[t]];
    for (let v = 0; v < faces.length; v++) {
      /* **자를 «사람이 지나는 길»로 낸다** — 이름표를 손으로 짜맞추지 않고 `nameOf` 를
         그대로 부른다([[probe-must-walk-the-real-path]]). 레어(옵션 둘)·매직(하나)·평범. */
      const cases = [
        [{ k, tier: t, v, af: [] }, "평범"],
        [{ k, tier: t, v, af: [{ id: "dmg", v: 12 }] }, "매직"],
        [{ k, tier: t, v, af: [{ id: "dmg", v: 12 }, { id: "mp", v: 1.2 }] }, "레어"],
        [{ k, tier: t, v, af: [{ id: "hp", v: 60 }, { id: "xp", v: 20 }] }, "레어2"],
      ];
      for (const [it, ko] of cases) {
        /* 옛 결은 `nameOf` 에 없으므로 여기서 손으로 짠다(그때의 붙이는 식 그대로). */
        const n = OLD && it.af.length >= 2
          ? `${AFFIX.dmg.pre} ${gearFace(k, t, v)}의 ${AFFIX.mp.suf}` : nameOf(it);
        tot++;
        const g = gen(n);
        if (g > 1) { chain++; if (g > worstN) { worstN = g; worst = n; } if (rows.length < 10) rows.push(`${ko} ${n}`); }
      }
    }
  }
}
console.log(`이름 ${tot} · 꾸밈이 겹친 것 ${chain} (${(100 * chain / tot).toFixed(1)}%)`);
for (const r of rows) console.log("  " + r);
if (worst) console.log(`  최악 ${worstN}겹 — ${worst}`);
/* 붙박이(유니크) 이름은 손으로 지은 것이라 여기서 안 센다 — 다만 있는지만 확인한다. */
console.log(`판정: ${chain === 0 ? "통과" : "미달"} (문턱 0)`);
process.exit(chain === 0 ? 0 : 1);
