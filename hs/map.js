// ★ V-183 — 이동 속도를 올린다. V-183 의 자(tools/hs_v183_density.mjs)로 재 보니
//   화면 안 동시 적 p50 이 **0** 이었다(깬 팩은 8인데). 까닭은 적이 플레이어(268)보다
//   너무 느려(46~78) 깨어난 뒤에도 못 붙고 지도 곳곳에 꼬리처럼 늘어져 화면 밖으로
//   샜기 때문이다 — 「뒤처진 놈이 안 붙으면 떼가 안 된다」. 대략 1.6~1.7배 올려 붙게 한다
//   (그래도 플레이어보다 느리다 — 도망은 여전히 되지만 서서 싸우면 몰려든다).
// ★ V-183b — 다시 재 보니 이걸로도 화면 안 동시 적 **중앙값**은 13 뿐이었다(봉우리 p95 는
//   58 로 넉넉한데). 까닭: 깬 팩이 21개(=산 적 수백)인데도 대부분 **화면 밖에 꼬리처럼**
//   늘어져 있었다 — 플레이어(268)가 다음 팩으로 옮길 때마다 앞 무리를 두고 가서 화면이
//   빈다. 봉우리가 아니라 **골(중앙값)**을 메우려면 뒤처진 놈이 이동 중에도 붙어 있어야
//   한다 → 속도를 한 번 더 올린다(여전히 플레이어보단 느리다).
// ★ V-183c — 속도만으로는 봉우리(p95 72)만 커지고 **중앙값은 13** 그대로였다. 분포가
//   둘로 갈렸다: 몰려든 무리를 군세+뼈창이 «한 번에» 녹이고 → 빈 골. 화면에 «동시에»
//   남는 수 = 도착률 × 화면 체류시간(리틀의 법칙)인데, 체류시간이 즉사라 0 에 가까웠다.
//   그래서 **체력을 올려** 무리가 화면에 더 오래 남게 한다(골이 메워진다). 죽는 데 여러
//   대 맞아야 하니 몰살감(처치 연쇄)도 실제로 «잇달아» 터진다. em(엘리트 3.2배)·층 배수는
//   그대로라 위층에서 과하지 않게 기본값만 손댄다.
const MOB_TYPES = [
  { base: "mob/fallen", hp: 42, dmg: 6, spd: 178, h: 74, r: 16, gold: [4, 9] },
  { base: "mob/zombie", hp: 70, dmg: 9, spd: 138, h: 92, r: 20, gold: [5, 11] },
  { base: "mob/skelarch", hp: 48, dmg: 8, spd: 166, h: 82, r: 16, gold: [5, 10] },
  { base: "mob/shaman", hp: 54, dmg: 10, spd: 156, h: 84, r: 17, gold: [7, 13] },
  { base: "mob/brute", hp: 190, dmg: 18, spd: 116, h: 118, r: 26, gold: [12, 22] },
];
const BOSS_TYPE = { base: "mob/boss", hp: 900, dmg: 34, spd: 88, h: 150, r: 40, gold: [80, 140] };

// ★ V-183 — 네임드(champion) 이름을 굴린다: 형용사 + 종족 + 칭호, 대문자(HS 의
//   「SLITHER COMMANDER」꼴). 색은 그리는 쪽(drawEnemy)에서 HS_STYLE 「빛깔·글꼴」의
//   초록을 준다. 이미 있는 m.elite 위에 얹기만 한다 — 새 종을 만들지 않는다.
const ELITE_ADJ = ["ROTTING", "CURSED", "VILE", "SAVAGE", "GLOOM", "WRETCHED", "BLOODGORGED", "PALE", "GRIM", "FESTERING"];
const ELITE_TITLE = ["COMMANDER", "WARLORD", "DEVOURER", "BUTCHER", "HERALD", "TYRANT", "REAVER", "SCOURGE"];
const ELITE_SPECIES = { "mob/fallen": "FALLEN", "mob/zombie": "ROTLING", "mob/skelarch": "BONECASTER", "mob/shaman": "HEXER", "mob/brute": "BRUTE", "mob/boss": "OVERLORD" };
function rollEliteName(base) {
  const sp = ELITE_SPECIES[base] || "HORROR";
  return `${ELITE_ADJ[(Math.random() * ELITE_ADJ.length) | 0]} ${sp} ${ELITE_TITLE[(Math.random() * ELITE_TITLE.length) | 0]}`;
}

function rint(a, b) { return a + ((Math.random() * (b - a + 1)) | 0); }
function overlap(a, b, pad) {
  return a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
}

export function genFloor(floor) {
  const W = 3400 + floor * 500, H = 2200 + floor * 320;
  const roomCount = Math.min(14, 8 + floor);
  const rooms = [];
  let guard = 0;
  while (rooms.length < roomCount && guard++ < 800) {
    const w = rint(460, 820), h = rint(360, 640);
    const r = { x: rint(80, W - w - 80), y: rint(80, H - h - 80), w, h,
      cx: 0, cy: 0, dead: false, visited: false, cleared: false };
    r.cx = r.x + w / 2; r.cy = r.y + h / 2;
    if (rooms.some((o) => overlap(r, o, 120))) continue;
    rooms.push(r);
  }

  const corridors = [];
  for (let i = 1; i < rooms.length; i++) {
    let best = 0, bd = Infinity;
    for (let j = 0; j < i; j++) {
      const d = (rooms[i].cx - rooms[j].cx) ** 2 + (rooms[i].cy - rooms[j].cy) ** 2;
      if (d < bd) { bd = d; best = j; }
    }
    const a = rooms[i], b = rooms[best];
    corridors.push({ x: Math.min(a.cx, b.cx), y: a.cy - 60, w: Math.abs(a.cx - b.cx), h: 120, horiz: true });
    corridors.push({ x: b.cx - 60, y: Math.min(a.cy, b.cy), w: 120, h: Math.abs(a.cy - b.cy), horiz: false });
  }
  const linked = new Set(corridors.flatMap((c) => rooms.filter((r) =>
    r.cx >= c.x - 60 && r.cx <= c.x + c.w + 60 && r.cy >= c.y - 60 && r.cy <= c.y + c.h + 60).map((r) => rooms.indexOf(r))));
  for (let i = 2; i < rooms.length; i++) rooms[i].dead = Math.random() < 0.45;

  const start = rooms[0];
  const startX = start.cx, startY = start.cy;

  let far = rooms[1] || rooms[0], fd = 0;
  for (const r of rooms) {
    const d = (r.cx - startX) ** 2 + (r.cy - startY) ** 2;
    if (d > fd) { fd = d; far = r; }
  }
  const stairs = { x: far.cx, y: far.cy - 10, r: 46 };
  far.dead = false;

  const packs = [];
  const chests = [];
  let eid = 0;
  for (let i = 1; i < rooms.length; i++) {
    const room = rooms[i];
    if (room.dead && Math.random() < 0.8) {
      chests.push({ x: room.cx, y: room.cy, opened: false, r: 26 });
    }
    // ★ V-183 — 방당 팩 1~2 → 3~4, 팩당 5~12 → 14~24. 깨우는 반경(WAKE, main.js)을 넓혀
    //   한 방에 든 팩이 함께 깨어나므로, 한 자리에 몰리는 수가 곱으로 는다.
    //   자로 재며 잡았다: 2~3×10~18·WAKE 900 은 p50 16.5·p95 32(미달), 3~4×14~24·WAKE 1050
    //   은 p50 50·p95 134(과함 — 온 층이 한꺼번에 몰려 「벽」이 된다). 그 사이로 내린다.
    const n = rint(3, 4);
    for (let p = 0; p < n; p++) {
      const count = rint(12, 18);
      const px = rint(room.x + 60, room.x + room.w - 60);
      const py = rint(room.y + 60, room.y + room.h - 60);
      const enemies = [];
      const elite = floor >= 1 && Math.random() < 0.25;
      for (let k = 0; k < count; k++) {
        const t = MOB_TYPES[Math.min(MOB_TYPES.length - 1,
          Math.floor(Math.random() * (MOB_TYPES.length - (floor < 1 ? 1 : 0)) * (0.6 + Math.random() * 0.4)))];
        const scale = 1 + floor * 0.35;
        enemies.push(makeMob(t, px + rint(-90, 90), py + rint(-90, 90), scale, eid++, elite && k === 0));
      }
      packs.push({ x: px, y: py, enemies, room: i, awake: false });
    }
  }
  if (floor >= 2) {
    const br = far;
    packs.push({ x: br.cx, y: br.cy + 40, awake: false, room: rooms.indexOf(br),
      enemies: [makeMob(BOSS_TYPE, br.cx, br.cy + 40, 1 + floor * 0.4, eid++, true)] });
  }

  const { decals, props } = scatter(rooms, stairs, chests);
  return { W, H, rooms, corridors, packs, chests, stairs, startX, startY, decals, props };
}

// ★★ V-164 — `decal/stain.png` 를 **줄에서 뺀다.** 그 장은 굽기가 실패한 것이다:
//   112×112 · 1639B 인데 **안쪽이 통째로 투명하고 스캘럽 윤곽선만** 남았다. 화면에서는
//   따뜻한 바닥 위에 뜬 «구름 모양 테두리»로 보인다 — 병수님이 말한 「둥둥 떠 있는 것」의
//   한 몫이고, 소품이 아니라 얼룩이라 여태 아무도 안 봤다.
//   ★ 다시 구우려고 두 판을 돌렸는데 **둘 다 더 나빴다**(V-164 기록 참조) — 색을 앞에
//     세우면 «돌덩어리», 어둠을 앞에 세우면 «청록/남색». `assets/decal_v3` 에 남겨 뒀다.
//     제대로 구워질 때까지는 **없는 편이 낫다** — 빈 테는 고칠 수 없는 결함이다.
// ★★ V-174 — **여섯 판을 색으로 다퉜는데 결함은 «꼴»이었다.** 얼룩 일곱 장을 바닥 위에
//   같은 알파(0.59)로 얹어 한 장에 늘어놓고 보니(`tmp/v174_decal_sheet.png`) 판정이
//   단숨에 갈렸다:
//   · `crack`·`pebble` — 금·자갈이 **동그란 회색 접시** 안에 들었다. 바닥에 «파인 것»이
//     아니라 **얹은 판**으로 읽힌다. 원형 실루엣이 남는 한 색을 아무리 맞춰도 뜬다.
//   · `mud` — 픽셀 결이 아예 없는 **뿌연 갈색 원반**. 게임 컷에서 「안개 덩어리」로 보이던
//     것이 이것이다.
//   · `dust`·`stain` — 둘 다 **테두리가 불규칙**하고 결이 픽셀이다. 크립트 바닥에 맞다.
//   그런데 이 좋은 둘이 **여태 화면에 한 번도 안 나왔다** — `dust` 는 목록에 든 적이 없고,
//   `stain` 은 「빈 테」라 V-164 가 뺐는데 V-173b 가 채워 놓고 **되돌려 넣질 않았다.**
//   즉 V-172~V-173b 가 «dust 를 +44→+24 로 내렸다»고 적은 그 일은 **화면에 없는 그림**을
//   고친 것이다. ★ [[knob-that-does-nothing]] · [[carry-fixes-forward]]
//   → 그리는 것을 좋은 둘로 바꾼다. `crack`·`pebble`·`mud` 는 «원형 접시»를 벗겨 다시
//     구울 때까지 뺀다(파일은 `assets/decal/` 에 그대로 있다).
// ★ V-176 — `dust` 를 뺐다(봉우리 +29.5, 띠 +14). ★ V-178 — 되돌렸다.
//   V-176 은 배경 어둡기 한 손잡이로 두 판을 태웠다 — dust 가 「흩뿌린 점」이라
//   어둡게 할수록 속 대비가 오히려 커져 밝기 축으로는 영영 안 들어왔다.
//   고친 것은 밝기가 아니라 **꼴**이다 — 통과한 `stain` 과 같은 «뭉친 덩어리» 로
//   다시 구웠다(조리법에서 "pale"·"scattered"·"grit" 을 뺐다). 평균 −4.1 · 봉우리 −0.1.
// ★ V-179 — `pebble` 을 되돌렸다. 옛 장은 V-164 가 잡은 «둥근 회색 접시» 그대로였고
//   (봉우리 +16.2), V-178 의 «꼴» 처방을 그대로 옮겨 한 판에 들어왔다(봉우리 −0.1).
//   덤으로 새 자(`hs_decaldiff.py`)가 걸린 것: 지금 살아 있는 `stain`·`dust` 가
//   실루엣 겹침 **0.781** 로 이미 «같은 그림»이다. pebble 은 0.58 이라 오히려 더 다르다.
const DEC_IMG = ["decal/stain.png", "decal/crack.png", "decal/dust.png", "decal/pebble.png"];
const PROP_IMG = ["decor/pillar.png", "decor/column2.png", "decor/bones.png", "decor/bones2.png",
  "decor/urn.png", "decor/coffin.png", "decor/rubble.png", "decor/statue.png"];

// 방 한가운데에 놓아도 싸움을 안 가리는 «낮은» 소품 (V-169)
// ★ V-171 — 그림을 열어 보고 다시 짰다. `bones2.png` 는 무더기가 아니라 **서 있는 해골
//   전신**이다 — 방 가운데 세우면 소환한 해골과 헷갈리므로 벽으로 뺀다. 대신 누워
//   부서진 기둥(`column2.png`)은 눕는 물건이니 안쪽으로 넣는다.
const LOW_PROP = new Set(["decor/bones.png", "decor/column2.png", "decor/urn.png",
  "decor/rubble.png", "decor/coffin.png"]);

// ★★ V-171 — 소품 키를 **종마다** 정한다. 여태 아홉 종이 `rint(76,132)` 한 주머니에서
//   키를 뽑았고, `PLAYER_H = 104` 이므로 항아리가 사람보다 크고(132) 서 있는 기둥이
//   사람보다 작았다(76). 손잡이 하나에 뜻이 아홉 개면 어느 쪽으로 돌려도 절반은 틀린다.
//   기준은 «사람 키(104) 대비».
const PROP_H = {
  "decor/pillar.png":  [170, 215],   // 서 있는 기둥 — 사람의 1.6~2.1배
  "decor/statue.png":  [132, 168],   // 후드 석상 — 사람보다 조금 큼
  "decor/bones2.png":  [ 88, 104],   // 서 있는 해골 전신 — 사람 크기
  "decor/brazier.png": [ 76,  94],   // 화로 — 가슴 높이
  "decor/column2.png": [ 56,  78],   // 누워 부서진 기둥
  "decor/coffin.png":  [ 54,  72],   // 석관 — 무릎~허리
  "decor/urn.png":     [ 50,  70],   // 항아리 — 허리 높이
  "decor/bones.png":   [ 34,  50],   // 해골 무더기 — 발밑
  "decor/rubble.png":  [ 28,  44],   // 잡석 — 발밑
};

// ★★ V-171b — `scatter` 가 **이미 놓인 것을 안 봤다.** V-169 가 밀도를 2.5배 올리자
//   겹침이 드러났다 — 컷에서 화로 둘이 한 덩어리로 뭉치고, 석상이 화로를 뚫고 섰고,
//   해골 무더기가 **계단 구멍 테두리 위**에 걸쳐 있었다. 자리를 뽑을 때 몇 번 다시
//   던져서(최대 12회) 앞서 놓인 소품·계단·상자와 «발자국»이 겹치면 버린다.
//   발자국은 그림의 가로폭 대신 **밑동 반지름**(h 대비)으로 잡는다 — 위로 솟은 부분은
//   겹쳐도 되고(원근), 바닥에서 겹치는 것만 어색하다.
const STAIR_R = 92, CHEST_R = 46;
// ★ V-180 — `footR` 이 **키에서 폭을 짐작**하고 있었다(`h * 0.30`). 넘어진 기둥처럼
//   옆으로 긴 그림에서는 이게 3.8배 과소평가라, 밀도를 올리자마자 둘이 겹쳐 놓였다.
//   아래 표는 짐작이 아니라 **각 그림의 불투명 bbox 를 재서** 낸 반폭비(w/h/2)다.
//   ★ [[cause-written-in-the-item-is-a-guess]] — 표에 없는 그림만 옛 0.30 으로 떨어진다.
const PROP_HALFW = {
  "decor/bones.png":   0.64, "decor/bones2.png": 0.39, "decor/brazier.png": 0.36,
  "decor/chest.png":   0.53, "decor/coffin.png": 0.69, "decor/column2.png": 1.15,
  "decor/pillar.png":  0.18, "decor/rubble.png": 0.88, "decor/stairs.png":  0.49,
  "decor/statue.png":  0.21, "decor/urn.png":    0.34,
};
function footR(pr) { return Math.max(16, pr.h * (PROP_HALFW[pr.img] ?? 0.30)); }
function propFits(pr, placed, stairs, chests) {
  for (const q of placed) {
    const r = footR(pr) + footR(q);
    // y(깊이)는 조금만 봐도 된다 — 앞뒤로 놓인 건 겹쳐 보이지 않는다.
    if (Math.abs(pr.x - q.x) < r && Math.abs(pr.y - q.y) < r * 0.62) return false;
  }
  if (stairs && Math.hypot(pr.x - stairs.x, pr.y - stairs.y) < STAIR_R + footR(pr)) return false;
  for (const c of chests || []) if (Math.hypot(pr.x - c.x, pr.y - c.y) < CHEST_R + footR(pr)) return false;
  return true;
}

function scatter(rooms, stairs, chests) {
  const decals = [], props = [];
  for (const room of rooms) {
    const area = room.w * room.h;
    // ★ V-176 — 자로 재 보니 방 하나를 덮는 얼룩 넓이가 **0.6%** 였다(`hs_flatruler.py`).
    //   그림 셋의 «채움»이 dust 12.6% · stain 15.2% · crack 2.1% 로 원래 성기기 때문에,
    //   여덟 개를 뿌려도 사실상 아무것도 안 덮는다 — V-175 가 색을 바닥 띠 안으로 넣은
    //   뒤로는 더더욱 안 보인다. 수를 3배(40000→13000), 크기를 1.6배(48~100→64~140)로
    //   올려 5% 언저리를 겨눈다. **색·투명도는 그대로** — 그건 V-175 가 여섯 판에 걸쳐
    //   맞춰 놓은 축이라 여기서 건드리면 도로 밖으로 나간다. ★ [[carry-fixes-forward]]
    for (let i = 0; i < Math.round(area / 13000); i++) {
      decals.push({ x: rint(room.x + 30, room.x + room.w - 30), y: rint(room.y + 30, room.y + room.h - 30),
        img: DEC_IMG[(Math.random() * DEC_IMG.length) | 0], s: rint(64, 140), a: 0.42 + Math.random() * 0.34 });
    }
    // ★ V-169 — 소품을 벽에만 붙여 놨더니 카메라가 방 가운데를 볼 때 **화면 밖**이었다.
    //   재 보니 방당 2.11개인데 화면에 보이는 건 평균 1.30개, 16% 자리에서는 하나도 안 보였다.
    //   아홉 종을 굽고도 화면에 안 나오면 없는 것과 같다(V-167a).
    //   · 수를 올린다(150000 → 60000).
    //   · **키 큰 것은 벽에, 낮은 것은 방 안쪽에.** 기둥·석상·화로가 방 한가운데 서면
    //     싸움을 가린다 — 뼈·잔해·항아리·관처럼 발밑에 눕는 것만 안쪽으로 보낸다.
    let tries = 0;                                     // 방마다 다시 던진 횟수
    for (let i = 0; i < Math.round(area / 34000); i++) {
      const brazier = Math.random() < 0.22;
      const img = brazier ? "decor/brazier.png" : PROP_IMG[(Math.random() * PROP_IMG.length) | 0];
      const low = !brazier && LOW_PROP.has(img);
      const inner = low && Math.random() < 0.62;      // 낮은 것만 방 안쪽으로
      let px, py;
      if (inner) {
        px = rint(room.x + 70, room.x + room.w - 70);
        py = rint(room.y + 70, room.y + room.h - 70);
      } else {
        const onX = Math.random() < 0.5;
        px = onX ? rint(room.x + 26, room.x + room.w - 26) : (Math.random() < 0.5 ? room.x + rint(24, 64) : room.x + room.w - rint(24, 64));
        py = onX ? (Math.random() < 0.5 ? room.y + rint(24, 64) : room.y + room.h - rint(24, 64)) : rint(room.y + 26, room.y + room.h - 26);
      }
      const hr = PROP_H[img] || [76, 132];              // 표에 없는 그림은 옛 자로 떨어진다
      const pr = { x: px, y: py, img, h: rint(hr[0], hr[1]), brazier };
      // 자리가 겹치면 **같은 소품을 다른 자리에** 다시 던진다(수는 안 줄인다 — V-169 의
      // 밀도가 그대로 남아야 한다). 열여섯 번 다 막히면 그 방은 빽빽한 것이니 포기한다.
      if (!propFits(pr, props, stairs, chests)) { if (++tries < 16) i--; continue; }
      props.push(pr);
    }
  }
  return { decals, props };
}

// ★ 스프라이트가 작아 보여서(task 5) 몸을 1.4배 키운다. 충돌 반지름은 살짝만(1.15) —
//   너무 키우면 서로 밀려나 무리가 흩어진다.
const BODY = 1.4, HITR = 1.15;
function makeMob(t, x, y, scale, id, elite) {
  const em = elite ? 3.2 : 1;
  return {
    id, base: t.base, x, y, hp: t.hp * scale * em, maxhp: t.hp * scale * em,
    dmg: t.dmg * scale, spd: t.spd * (elite ? 0.9 : 1), h: t.h * BODY * (elite ? 1.25 : 1),
    r: t.r * HITR * (elite ? 1.2 : 1), gold: t.gold, dx: 0, dy: 1, elite,
    hit: 0, kb: { x: 0, y: 0 }, atk: 0, anim: (id * 2.3) % 6, alive: true,
    tb: id & 3, name: elite ? rollEliteName(t.base) : null,
  };
}
