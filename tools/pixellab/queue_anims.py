#!/usr/bin/env python3
"""빠진 애니메이션만 **다시 건다.**

앞선 실행에서 일곱 중 둘만 애니가 붙었다. `animate_character` 호출 자체는 정상이었는데
(8방향 잡 8개가 걸린다고 응답까지 왔다), **몸이 다 안 익은 상태에서 걸어서 버려진** 것으로
보인다 — `status: completed` 는 기본 몸만 가리키고 방향은 아직 그려지는 중일 수 있다.

그래서 이 스크립트는 **`get_character` 로 실제 animations 를 확인하고 없는 것만** 건다.
몸은 이미 다 익었으니 이번엔 안 버려진다.

    python3 tools/pixellab/queue_anims.py /tmp/necro_ids.txt
"""
import json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
MCP  = os.path.join(HERE, "mcp_call.py")

ATTACK = {
    "minion/skel":  "swinging a short sword forward in a quick horizontal slash",
    "minion/ghoul": "lunging forward and raking with both claws",
    "minion/golem": "raising both massive arms and slamming them down",
    "mob/fallen":   "stabbing forward with a curved dagger",
    "mob/zombie":   "swiping forward with a heavy dangling arm",
    "mob/skelarch": "drawing a bow and loosing an arrow forward",
    "mob/brute":    "raising a heavy axe overhead and chopping down",
}

def has_walk(t):
    """캐릭터가 실제로 가진 애니메이션 중에 걷기가 있나. `available_animations:` 는 제외."""
    m = re.search(r"animations \(.*?\):(.*?)(?:\navailable_animations:|\Z)", t, re.S)
    if not m:
        return False
    body = m.group(1).lower()
    return "animating" in body or "walking" in body or "walk" in body


def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    d = json.loads(r.stdout); res = d.get("result", d)
    c = res.get("content") or []
    txt = c[0]["text"] if c and c[0].get("type") == "text" else json.dumps(res)
    if res.get("isError"):
        raise RuntimeError(txt[:300])
    return txt

if __name__ == "__main__":
    pairs = [l.split() for l in open(sys.argv[1]) if l.strip()]
    for kind, cid in pairs:
        try:
            t = mcp("get_character", {"character_id": cid})
            # **걷기가 없으면 건다.** 있는데 또 걸면 zip 에 같은 그룹이 두 번 들어간다.
            # 반드시 `animations (...)` 절 안에서만 찾는다 — 응답 아래쪽 `available_animations:`
            # 는 **고를 수 있는 템플릿 목록**이고 거기엔 "crouched-walking" 이 늘 들어 있다.
            # 전문에서 "walking" 을 찾던 버전은 **일곱 마리 전부를 "이미 있음"으로 오판해
            # 아무한테도 걷기를 안 걸었고**, 그걸 모른 채 폴러가 36분을 헛돌았다(2026-08-09).
            if not has_walk(t):
                mcp("animate_character", {"character_id": cid,
                                          "template_animation_id": "walking-4-frames"})
                print(f"걷기 다시 검 {kind}", flush=True)
            else:
                print(f"걷기 이미 있음 {kind}", flush=True)
        except Exception as e:
            print(f"걷기 실패 {kind} — {str(e)[:120]}", flush=True)
        time.sleep(2)

    # 공격은 **아무도 안 걸려 있다** — 앞 실행이 걷기 단계에서 멈췄기 때문이다.
    for kind, cid in pairs:
        try:
            mcp("animate_character", {"character_id": cid, "mode": "v3",
                                      "action_description": ATTACK[kind],
                                      "animation_name": "attack", "frame_count": 4,
                                      "directions": ["south"]})
            print(f"공격 검 {kind}", flush=True)
        except Exception as e:
            print(f"공격 실패 {kind} — {str(e)[:160]}", flush=True)
        time.sleep(2)
    print("— 다 걸었다. 이제 collect.py 가 받아 간다")
