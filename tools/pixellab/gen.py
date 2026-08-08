#!/usr/bin/env python3
"""necro 의 스프라이트를 PixelLab MCP 로 굽는다.

    python3 tools/pixellab/gen.py            # 아직 없는 것만
    python3 tools/pixellab/gen.py --force    # 전부 다시
    python3 tools/pixellab/gen.py necro skel # 일부만

**한 세트로 읽히게 하는 것이 전부다.** 시점·조명·팔레트를 설명에 못 박아 두지 않으면
소환수는 옆에서 본 그림, 적은 위에서 본 그림이 되어 같은 줄에 못 세운다.

이 게임의 전장은 **가로 한 줄**이다 — 왼쪽에 네크로멘서, 오른쪽에서 적이 온다.
그러니 전부 **옆에서 본다**(side view). 그리고 병수님이 못 박은 결은 하나다:
**디아블로 2.** 어두운 고딕, 낮은 채도, 빛은 횃불과 핏빛에서만 온다.

결과는 assets/<폴더>/<id>.png — 서버가 리포 루트를 그대로 서빙한다.
"""
import base64, json, os, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
MCP  = os.path.join(HERE, "mcp_call.py")

# 온 세트를 묶는 규칙. **옆에서 본다** — 전장이 가로 한 줄이기 때문이다.
TONE = ("side view profile facing right, dark gothic Diablo 2 dungeon art, grim medieval horror, "
        "desaturated palette of bone white, dried blood red, rusted iron and torch amber, "
        "single warm torchlight from the left, heavy black shadows, transparent background, "
        "no text, no ui frame, no border, one character only")
# 소환수 — 언데드. **네크로멘서의 것**임이 실루엣에서 읽혀야 한다(뼈·창백함·푸른 혼불).
MINION = (f"{TONE}, undead minion raised by a necromancer, faint pale blue soul glow, "
          "full body visible from head to feet, centred, clear readable silhouette")
# 적 — 살아 있는 것들. 붉고 더럽게. 소환수(창백함)와 색으로 갈린다.
MOB = (f"{TONE}, hostile dungeon monster charging left toward the viewer's left, "
       "full body visible, centred, blood red and filthy brown tones")

SPRITES = {
    # ── 본인 ── 직접 안 싸운다. **서 있는 자세**라야 "부리는 자"로 읽힌다.
    "char/necro": (f"{TONE}, a gaunt necromancer standing still in a dark hooded robe, "
                   "bone charms and skull ornaments, holding a curved bone wand low, "
                   "faint blue glow inside the hood, full body, regal and still", 96),

    # ── 소환수 셋 ── 수 · 몸 · 벽. 서로 크기와 실루엣이 확실히 갈려야 한 줄에서 읽힌다.
    "minion/skel":  (f"{MINION}, a skeleton warrior of bare yellowed bone holding a short rusted sword "
                     "and a small round shield, lean and quick", 64),
    "minion/ghoul": (f"{MINION}, a hunched ghoul with grey rotting flesh and long claws, "
                     "mouth open, bulkier than a skeleton", 64),
    "minion/golem": (f"{MINION}, a massive clay golem of cracked earth and stone, "
                     "glowing orange fissures, huge blocky arms, towering and slow", 96),

    # ── 적 ── 디아블로 2 의 그 잡몹 결. 아래로 갈수록 험하다.
    "mob/fallen":  (f"{MOB}, a small hunched imp-like fallen demon with a crude curved dagger, "
                    "pointed ears, red skin", 48),
    "mob/zombie":  (f"{MOB}, a shambling rotted zombie with torn flesh and dangling arms, "
                    "grey green skin", 52),
    "mob/skelarch":(f"{MOB}, an armoured skeleton archer with a short bow and a tattered cloak, "
                    "bone and dark iron", 52),
    "mob/brute":   (f"{MOB}, a hulking horned demon brute with thick shoulder armour and a heavy axe, "
                    "deep blood red", 64),
    "mob/boss":    (f"{MOB}, a towering demon lord with curved horns, tattered wings folded, "
                    "glowing molten eyes, holding an enormous blade, far larger than the others, "
                    "menacing and regal", 112),

    # ── 이펙트 ── 겹쳐 한 번 번쩍인다. 배경이 없어야 하고 실루엣이 단순해야 한다.
    "fx/hit":  ("a small sharp burst of bone white sparks, impact flash, no background, "
                "dark gothic pixel effect", 32),
    "fx/nova": ("a ring of bursting crimson gore and bone shards exploding outward from a corpse, "
                "no background, dark gothic pixel effect", 64),
    "fx/raise":("a swirl of pale blue soul wisps rising from the ground, no background, "
                "dark gothic pixel effect", 48),
}

# 값은 **정해진 것만** 받는다 — outline 은 single color outline · selective outline · lineless,
# detail 은 low/medium/high detail. 다른 말을 넣으면 조용히 안 굽고 검증 오류만 돌아온다.
# `create_map_object` 는 negative_description 을 **안 받는다**(넣으면 통째로 검증 오류다).
# 빼야 할 것은 설명 안에 "no ~" 로 적어 넣는다.
COMMON = {"outline": "single color outline", "shading": "detailed shading", "detail": "high detail"}

def mcp(tool, args, timeout=240):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    if r.returncode != 0:
        raise RuntimeError(f"{tool} 실패: {r.stderr[:300]}")
    return json.loads(r.stdout)

def content(resp):
    return resp.get("result", {}).get("content", [])

def queue(key):
    desc, size = SPRITES[key]
    resp = mcp("create_map_object", {"description": desc, "width": size, "height": size, **COMMON})
    for c in content(resp):
        if c.get("type") == "text":
            for line in c["text"].splitlines():
                if line.startswith("id:"):
                    return line.split(":", 1)[1].strip()
    raise RuntimeError(f"{key}: id 를 못 받았다 — {str(resp)[:240]}")

def fetch(key, oid):
    # 파라미터 이름은 **object_id** 다. map_object_id 로 부르면 조용히 빈손으로 돌아온다
    # (rtd 에서 스물한 개가 그렇게 시간만 흘렸다).
    for _ in range(50):
        resp = mcp("get_map_object", {"object_id": oid})
        done = any(c.get("type") == "text" and "status: completed" in c.get("text", "")
                   for c in content(resp))
        for c in content(resp):
            if done and c.get("type") == "image" and c.get("data"):
                out = os.path.join(ROOT, "assets", key + ".png")
                os.makedirs(os.path.dirname(out), exist_ok=True)
                raw = base64.b64decode(c["data"])
                open(out, "wb").write(raw)
                return len(raw)
        time.sleep(6)
    return 0

if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    force = "--force" in sys.argv
    keys = [k for k in SPRITES if not args or any(a in k for a in args)]
    todo = [k for k in keys
            if force or not os.path.exists(os.path.join(ROOT, "assets", k + ".png"))]
    if not todo:
        print("전부 이미 있음"); sys.exit(0)
    # **먼저 전부 줄 세우고 그다음에 받는다** — 하나씩 굽고 기다리면 열두 장이 열두 배 걸린다.
    jobs = {}
    for k in todo:
        try:
            jobs[k] = queue(k); print(f"줄 세움 {k}", flush=True)
        except Exception as e:
            print(f"줄 세우기 실패 {k} — {e}", flush=True)
        time.sleep(1.2)
    ok = 0
    for k, oid in jobs.items():
        try:
            n = fetch(k, oid)
            print(f"{'구움 ' if n else '못 받음'} {k}  {n or ''}", flush=True)
            ok += 1 if n else 0
        except Exception as e:
            print(f"받기 실패 {k} — {e}", flush=True)
    print(f"— {ok}/{len(todo)} 장")
