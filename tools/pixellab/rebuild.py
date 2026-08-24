#!/usr/bin/env python3
"""necro 의 캐릭터를 **PixelLab 캐릭터로 다시 만든다** — 진짜 8방향 걷기·공격.

    python3 tools/pixellab/rebuild.py create     # 캐릭터 9종 줄 세우기
    python3 tools/pixellab/rebuild.py animate    # 다 익은 것에 걷기·공격 걸기
    python3 tools/pixellab/rebuild.py collect    # 받아서 assets/ 에 풀기
    python3 tools/pixellab/rebuild.py all        # 위 셋을 끝까지 (detached 로 돌릴 것)

**왜 다시 만드는가.** 우리가 map_object 로 구운 옆모습 한 장은 애니메이션이 안 된다.
`create_character` 에 그 그림을 참조로 넣어도 PixelLab 은 그것을 움직이는 게 아니라
**제 골격으로 캐릭터를 새로 세운다** — 옆모습 구울이 정면 보는 딴 놈이 되어 돌아왔다.
그래서 병수님이 (가)를 골랐다: 12장을 버리고 **처음부터 캐릭터로** 만든다.

**핵심은 template 애니메이션이다.** `walking-6-frames` 같은 template_animation_id 는
**방향당 1생성**이라 싸고 빠르고 무엇보다 결과가 일정하다. action_description 으로
맡기면(v3) 캔버스 크기만큼 비싸지고 종류마다 딴판이 된다.

**굽기와 받기를 한 흐름에 두지 않는다.** 어젯밤 그렇게 했다가 한 종류가 늦으면 뒤엣것이
줄줄이 밀려 5종을 통째로 놓쳤다. 전부 줄 세운 뒤, 돌아가며 계속 다시 물어본다.

상태는 tools/pixellab/state.json 에 남는다 — 중간에 죽어도 이어서 돈다.
"""
import base64, io, json, os, re, subprocess, sys, time, zipfile, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")
STATE = os.path.join(HERE, "state.json")

# ══ 결 ══ 디아블로 2. **시점은 low top-down** — 사방에서 오는 원형 전장이라
# 눈높이(side)로는 앞뒤가 안 갈리고, 정수리(high)로는 얼굴이 안 보인다.
TONE = ("dark gothic Diablo 2 dungeon character, grim medieval horror, desaturated palette "
        "of bone white, dried blood red, rusted iron and torch amber, heavy black shadows")
MINION = f"{TONE}, undead minion raised by a necromancer, pale and cold"
MOB    = f"{TONE}, hostile dungeon monster, filthy and aggressive"

# key: (설명, 크기, 걷기템플릿, 공격템플릿)
# 크기는 96 을 안 넘긴다 — 애니 비용이 캔버스에 비례해서 128 이면 방향당 2배가 된다.
CHARS = {
  "char/necro":   (f"{TONE}, a gaunt necromancer in a dark hooded robe with bone charms, "
                   "holding a curved bone wand, faint blue glow inside the hood", 64,
                   "walking-6-frames", "fireball"),
  "minion/skel":  (f"{MINION}, a skeleton warrior of bare yellowed bone with a short rusted "
                   "sword and a small round shield, lean and quick", 48,
                   "walking-6-frames", "cross-punch"),
  "minion/ghoul": (f"{MINION}, a hunched ghoul with grey rotting flesh and long claws, "
                   "mouth open, bulkier than a skeleton", 56,
                   "walking-6-frames", "cross-punch"),
  "minion/golem": (f"{TONE}, a massive clay golem of cracked earth and stone with glowing "
                   "orange fissures, huge blocky arms, towering and slow", 80,
                   "walking-6-frames", "cross-punch"),
  "mob/fallen":   (f"{MOB}, a small hunched imp-like fallen demon with a crude curved dagger, "
                   "pointed ears, red skin", 40,
                   "walking-6-frames", "cross-punch"),
  # 주술사 — V-15. 웅크린 단검잡이(fallen)와 **실루엣으로** 갈려야 하므로 키를 키우고
  # 지팡이를 들린다. 공격도 cross-punch 가 아니라 fireball 이라 동작까지 갈린다.
  "mob/shaman":   (f"{MOB}, a tall fallen shaman demon standing upright in a ragged red robe, "
                   "wooden skull-topped staff held high with a small flame at its tip, "
                   "bone mask over the face, thin and lanky", 48,
                   "walking-6-frames", "fireball"),
  "mob/zombie":   (f"{MOB}, a shambling rotted zombie with torn flesh and dangling arms, "
                   "grey green skin", 48,
                   "walking-6-frames", "cross-punch"),
  "mob/skelarch": (f"{MOB}, an armoured skeleton archer with a short bow and a tattered cloak, "
                   "bone and dark iron", 48,
                   "walking-6-frames", "throw-object"),
  "mob/brute":    (f"{MOB}, a hulking horned demon brute with thick shoulder armour and a "
                   "heavy axe, deep blood red", 64,
                   "walking-6-frames", "cross-punch"),
  "mob/boss":     (f"{MOB}, a towering demon lord with curved horns and tattered folded wings, "
                   "glowing molten eyes, holding an enormous blade, menacing and regal", 96,
                   "walking-6-frames", "cross-punch"),
}
COMMON = {"body_type": "humanoid", "mode": "standard", "n_directions": 8,
          "view": "low top-down", "outline": "single color outline",
          "shading": "detailed shading", "detail": "high detail"}


def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:300]}")
    return json.loads(r.stdout)

def text_of(resp):
    return "\n".join(c.get("text", "") for c in
                     resp.get("result", {}).get("content", []) if c.get("type") == "text")

def auth():
    cfg = json.load(open("/Users/lbs/.config/opencode/opencode.json"))
    return cfg["mcp"]["pixellab"]["headers"]["Authorization"]

def load():
    try: return json.load(open(STATE))
    except Exception: return {}

def save(st):
    json.dump(st, open(STATE, "w"), ensure_ascii=False, indent=1)


# ══ 1. 캐릭터를 줄 세운다 ══
def do_create(st):
    for key, (desc, size, _, _) in CHARS.items():
        if st.get(key, {}).get("id"):
            print(f"이미 있음 {key}"); continue
        try:
            r = mcp("create_character", {"description": desc, "size": size,
                                         "name": key.split("/")[-1], **COMMON})
            t = text_of(r)
            m = re.search(r"([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})", t)
            if not m:
                print(f"실패 {key} — id 없음: {t[:200]}"); continue
            st.setdefault(key, {})["id"] = m.group(1)
            save(st); print(f"줄 세움 {key}  {m.group(1)}", flush=True)
        except Exception as e:
            print(f"실패 {key} — {e}", flush=True)
        time.sleep(1.5)


def char_done(cid):
    """캐릭터가 다 익었는가. 아직이면 False."""
    try:
        t = text_of(mcp("get_character", {"character_id": cid}))
    except Exception:
        return False
    # **느슨하게 보면 안 된다.** 처음엔 방향 이름이 여덟 개 보이면 익은 것으로 쳤는데,
    # 아직 굽는 중인 캐릭터에 애니를 걸면 서버가 조용히 안 만든다(응답은 멀쩡히 온다).
    # 그래서 아홉 종 중 일곱이 `animations: none` 인 채로 한 시간을 흘려보냈다.
    return bool(re.search(r"status:\s*completed", t, re.I))


# ══ 2. 걷기·공격을 건다 ══ **다 익은 것부터 바로**. 한 종류가 늦어도 나머지는 간다.
def do_animate(st, rounds=40):
    for rnd in range(rounds):
        left = [k for k in CHARS if st.get(k, {}).get("id") and not st[k].get("anim_done")]
        if not left: break
        for key in left:
            cid = st[key]["id"]
            if not st[key].get("ready"):
                if not char_done(cid): continue
                st[key]["ready"] = True; save(st)
                print(f"익음 {key}", flush=True)
            _, _, walk_t, atk_t = CHARS[key]
            for kind, tpl in (("walk", walk_t), ("attack", atk_t)):
                if st[key].get(kind + "_q"): continue
                try:
                    r = mcp("animate_character", {"character_id": cid,
                                                  "template_animation_id": tpl,
                                                  "animation_name": kind})
                    t = text_of(r)
                    # **잡이 실제로 생겼는지 응답에서 확인한다.** group/jobs 가 없으면 안 걸린 것.
                    # 이미 붙어 있으면 "already complete" 로 온다 — 그것도 성공이다
                    if "already complete" in t.lower():
                        st[key][kind + "_q"] = True; save(st)
                        print(f"이미 붙어 있음 {key} {kind}", flush=True); continue
                    if "group:" not in t or "job" not in t:
                        print(f"애니 안 걸림 {key} {kind} — {t[:120]}", flush=True); continue
                    st[key][kind + "_q"] = True; save(st)
                    print(f"애니 걸음 {key} {kind}({tpl})", flush=True)
                except Exception as e:
                    print(f"애니 실패 {key} {kind} — {e}", flush=True)
                time.sleep(1.5)
            if st[key].get("walk_q") and st[key].get("attack_q"):
                st[key]["anim_done"] = True; save(st)
        if [k for k in CHARS if st.get(k, {}).get("id") and not st[k].get("anim_done")]:
            print(f"— {rnd+1}회차, 아직 안 익은 것 있음. 45초 뒤 다시", flush=True)
            time.sleep(45)


# ══ 3. 받아서 푼다 ══ 개별 프레임 URL 에는 서명 토큰이 안 붙어 403 이 난다.
#      `/characters/<id>/download` 에 Authorization 헤더로 받으면 zip 으로 통째로 온다.
DIRS = ("south", "south-east", "east", "north-east", "north",
        "north-west", "west", "south-west")

def unpack(key, blob):
    """zip → assets/<key>/<dir>.png(정지) · assets/<key>/<anim>/<dir>/<n>.png"""
    out = os.path.join(ROOT, "assets", key)
    n_rot = n_frm = 0
    with zipfile.ZipFile(io.BytesIO(blob)) as z:
        for nm in z.namelist():
            if nm.endswith("/") or not nm.lower().endswith(".png"): continue
            parts = nm.split("/")
            if "rotations" in parts:
                d = os.path.splitext(parts[-1])[0].lower()
                if d not in DIRS: continue
                p = os.path.join(out, d + ".png")
                os.makedirs(os.path.dirname(p), exist_ok=True)
                open(p, "wb").write(z.read(nm)); n_rot += 1
            elif "animations" in parts:
                i = parts.index("animations")
                if len(parts) < i + 4: continue
                group, d = parts[i + 1].lower(), parts[i + 2].lower()
                if d not in DIRS: continue
                grp = "walk" if "walk" in group else ("attack" if "walk" not in group else group)
                m = re.search(r"(\d+)", parts[-1])
                idx = int(m.group(1)) if m else n_frm
                p = os.path.join(out, grp, d, f"{idx}.png")
                os.makedirs(os.path.dirname(p), exist_ok=True)
                open(p, "wb").write(z.read(nm)); n_frm += 1
    return n_rot, n_frm


def complete(key):
    """**다 왔는가.** 프레임이 하나라도 오면 끝으로 쳤다가 brute 를 반만 받았다
       (walk 8방향은 왔는데 attack 은 5방향뿐). 잡이 방향마다 따로 익으므로
       zip 은 익은 것까지만 담아 준다 — 그래서 **둘 다 여덟 방향**을 세야 한다."""
    for grp in ("walk", "attack"):
        d = os.path.join(ROOT, "assets", key, grp)
        if not os.path.isdir(d): return False
        dirs = [x for x in os.listdir(d) if x in DIRS and
                len([f for f in os.listdir(os.path.join(d, x)) if f.endswith(".png")]) >= 4]
        if len(dirs) < 8: return False
    return True


def do_collect(st, rounds=60):
    a = auth()
    for rnd in range(rounds):
        left = [k for k in CHARS if st.get(k, {}).get("anim_done") and not st[k].get("collected")]
        if not left and rnd > 0: break
        for key in left:
            cid = st[key]["id"]
            url = f"https://api.pixellab.ai/mcp/characters/{cid}/download"
            try:
                blob = urllib.request.urlopen(
                    urllib.request.Request(url, headers={"Authorization": a}), timeout=300).read()
            except Exception as e:
                # 423 Locked = 아직 굽는 중. 버리지 않고 다음 회차에 다시 묻는다.
                print(f"대기 {key} — {str(e)[:80]}", flush=True); continue
            try:
                rot, frm = unpack(key, blob)
            except Exception as e:
                print(f"푸는 중 실패 {key} — {e}", flush=True); continue
            if not complete(key):
                print(f"대기 {key} — 아직 덜 익음(받은 프레임 {frm})", flush=True); continue
            st[key]["collected"] = {"rot": rot, "frames": frm}; save(st)
            print(f"받음 {key}  회전 {rot} · 프레임 {frm}", flush=True)
        if [k for k in CHARS if st.get(k, {}).get("anim_done") and not st[k].get("collected")]:
            print(f"— 수거 {rnd+1}회차, 남음. 45초 뒤 다시", flush=True)
            time.sleep(45)


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else "all"
    st = load()
    if cmd in ("create", "all"):   do_create(st)
    if cmd in ("animate", "all"):  do_animate(st)
    if cmd in ("collect", "all"):  do_collect(st)
    got = [k for k in CHARS if st.get(k, {}).get("collected")]
    print(f"══ 끝 — {len(got)}/{len(CHARS)} 종", flush=True)
    for k in CHARS:
        c = st.get(k, {}).get("collected")
        print(f"  {'✓' if c else '✗'} {k}" + (f"  회전{c['rot']} 프레임{c['frames']}" if c else ""))
