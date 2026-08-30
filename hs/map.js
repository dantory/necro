const MOB_TYPES = [
  { base: "mob/fallen", hp: 26, dmg: 6, spd: 78, h: 74, r: 16, gold: [4, 9] },
  { base: "mob/zombie", hp: 44, dmg: 9, spd: 52, h: 92, r: 20, gold: [5, 11] },
  { base: "mob/skelarch", hp: 30, dmg: 8, spd: 70, h: 82, r: 16, gold: [5, 10] },
  { base: "mob/shaman", hp: 34, dmg: 10, spd: 66, h: 84, r: 17, gold: [7, 13] },
  { base: "mob/brute", hp: 120, dmg: 18, spd: 46, h: 118, r: 26, gold: [12, 22] },
];
const BOSS_TYPE = { base: "mob/boss", hp: 900, dmg: 34, spd: 42, h: 150, r: 40, gold: [80, 140] };

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
    const n = rint(1, 2);
    for (let p = 0; p < n; p++) {
      const count = rint(5, 12);
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

  const { decals, props } = scatter(rooms);
  return { W, H, rooms, corridors, packs, chests, stairs, startX, startY, decals, props };
}

// ★★ V-164 — `decal/stain.png` 를 **줄에서 뺀다.** 그 장은 굽기가 실패한 것이다:
//   112×112 · 1639B 인데 **안쪽이 통째로 투명하고 스캘럽 윤곽선만** 남았다. 화면에서는
//   따뜻한 바닥 위에 뜬 «구름 모양 테두리»로 보인다 — 병수님이 말한 「둥둥 떠 있는 것」의
//   한 몫이고, 소품이 아니라 얼룩이라 여태 아무도 안 봤다.
//   ★ 다시 구우려고 두 판을 돌렸는데 **둘 다 더 나빴다**(V-164 기록 참조) — 색을 앞에
//     세우면 «돌덩어리», 어둠을 앞에 세우면 «청록/남색». `assets/decal_v3` 에 남겨 뒀다.
//     제대로 구워질 때까지는 **없는 편이 낫다** — 빈 테는 고칠 수 없는 결함이다.
const DEC_IMG = ["decal/crack.png", "decal/pebble.png", "decal/mud.png"];
const PROP_IMG = ["decor/pillar.png", "decor/column2.png", "decor/bones.png", "decor/bones2.png",
  "decor/urn.png", "decor/coffin.png", "decor/rubble.png", "decor/statue.png"];

// 방 한가운데에 놓아도 싸움을 안 가리는 «낮은» 소품 (V-169)
const LOW_PROP = new Set(["decor/bones.png", "decor/bones2.png", "decor/urn.png",
  "decor/rubble.png", "decor/coffin.png"]);

function scatter(rooms) {
  const decals = [], props = [];
  for (const room of rooms) {
    const area = room.w * room.h;
    for (let i = 0; i < Math.round(area / 40000); i++) {
      decals.push({ x: rint(room.x + 30, room.x + room.w - 30), y: rint(room.y + 30, room.y + room.h - 30),
        img: DEC_IMG[(Math.random() * DEC_IMG.length) | 0], s: rint(48, 100), a: 0.42 + Math.random() * 0.34 });
    }
    // ★ V-169 — 소품을 벽에만 붙여 놨더니 카메라가 방 가운데를 볼 때 **화면 밖**이었다.
    //   재 보니 방당 2.11개인데 화면에 보이는 건 평균 1.30개, 16% 자리에서는 하나도 안 보였다.
    //   아홉 종을 굽고도 화면에 안 나오면 없는 것과 같다(V-167a).
    //   · 수를 올린다(150000 → 60000).
    //   · **키 큰 것은 벽에, 낮은 것은 방 안쪽에.** 기둥·석상·화로가 방 한가운데 서면
    //     싸움을 가린다 — 뼈·잔해·항아리·관처럼 발밑에 눕는 것만 안쪽으로 보낸다.
    for (let i = 0; i < Math.round(area / 60000); i++) {
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
      props.push({ x: px, y: py, img, h: rint(76, 132), brazier });
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
    hit: 0, kb: { x: 0, y: 0 }, atk: 0, anim: 0, alive: true,
  };
}
