#!/usr/bin/env python3
"""**걷기만** 다시 건다. 공격은 이미 5장씩 다 있으므로 절대 건드리지 않는다.

앞선 실행(anim2)에서 일곱에 걷기를 한꺼번에 걸었더니 넷(모브 4종)의 걷기 잡이
조용히 사라졌다 — 붙였다는 응답은 왔는데 `get_character` 의 animations 에는
attack 한 그룹만 남았다. 그래서 이번엔 **네 마리만, 하나씩 천천히** 건다.

    python3 tools/pixellab/queue_walk_only.py /tmp/necro_ids_mobwalk.txt
"""
import json, os, re, subprocess, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
MCP  = os.path.join(HERE, "mcp_call.py")

def mcp(tool, args, timeout=300):
    r = subprocess.run([sys.executable, MCP, tool, json.dumps(args)],
                       capture_output=True, text=True, timeout=timeout)
    d = json.loads(r.stdout); res = d.get("result", d)
    c = res.get("content") or []
    txt = c[0]["text"] if c and c[0].get("type") == "text" else json.dumps(res)
    if res.get("isError"):
        raise RuntimeError(txt[:300])
    return txt

def has_walk(t):
    """캐릭터가 실제로 가진 애니메이션 중에 걷기가 있나."""
    m = re.search(r"animations \(.*?\):(.*?)(?:\navailable_animations:|\Z)", t, re.S)
    if not m:
        return False
    body = m.group(1).lower()
    return "animating" in body or "walking" in body or "walk" in body


if __name__ == "__main__":
    for line in open(sys.argv[1]):
        if not line.strip():
            continue
        kind, cid = line.split()
        try:
            t = mcp("get_character", {"character_id": cid})
            # **`animations (...)` 절만 본다.** 응답 아래쪽 `available_animations:` 는
            # 이 캐릭터가 가진 것이 아니라 **고를 수 있는 템플릿 목록**이고, 거기에
            # "crouched-walking" 같은 게 늘 들어 있다. 전문(全文)에서 "walking" 을 찾으면
            # 무조건 걸려서 **아무한테도 걷기를 안 걸게 된다** — 앞 실행이 이래서 죽었다.
            if has_walk(t):
                print(f"걷기 이미 있음 {kind} — 건너뜀", flush=True); continue
            mcp("animate_character", {"character_id": cid,
                                      "template_animation_id": "walking-4-frames"})
            print(f"걷기 검 {kind}", flush=True)
        except Exception as e:
            print(f"걷기 실패 {kind} — {str(e)[:200]}", flush=True)
        time.sleep(10)
    print("— 걷기 큐잉 끝. collect.py 가 받아 간다", flush=True)
