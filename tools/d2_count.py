#!/usr/bin/env python3
"""D2(LoD 1.13c) 원본 데이터 표를 받아 «necro 와 견줄 수»를 센다.

위키는 전부 Cloudflare 에 막혀 있고, 검색 결과의 숫자는 판(version)이 섞인다.
그래서 게임이 실제로 읽는 `Data/Global/Excel/*.txt` 를 받아 행을 센다.

    python3 tools/d2_count.py            # 받아서 세고 표를 찍는다
    python3 tools/d2_count.py --keep DIR # 받은 txt 를 DIR 에 남긴다

주의: 이건 **1.13c LoD** 다. D2R(2.4+)은 유니크가 ≈397~405 로 조금 더 많다.
"""
import argparse, csv, os, sys, tempfile, urllib.request
from collections import Counter

BASE = ("https://raw.githubusercontent.com/whipowill/d2-113c-txt/"
        "master/Data/Global/Excel")
TABLES = ["UniqueItems", "SetItems", "Sets", "Runes", "Misc", "Levels",
          "Skills", "MonStats", "MagicPrefix", "MagicSuffix", "Weapons", "Armor"]


def fetch(dst):
    for t in TABLES:
        path = os.path.join(dst, t + ".txt")
        if os.path.exists(path):
            continue
        with urllib.request.urlopen(f"{BASE}/{t}.txt", timeout=30) as r:
            open(path, "wb").write(r.read())
    return dst


def rows(dst, name):
    """탭 표를 읽는다. 첫 칸이 빈 줄과 `Expansion` 구분줄은 버린다."""
    f = open(os.path.join(dst, name + ".txt"), encoding="latin-1")
    head = f.readline().rstrip("\n").split("\t")
    out = []
    for line in f:
        cell = line.rstrip("\n").split("\t")
        if cell[0] and cell[0] != "Expansion":
            out.append(dict(zip(head, cell)))
    return out


def count(dst):
    r = lambda n: rows(dst, n)
    out = {}

    uniq = r("UniqueItems")
    out["uniques_rows"] = len(uniq)
    out["uniques"] = sum(1 for x in uniq if x.get("enabled") == "1")

    out["set_items"] = len(r("SetItems"))
    out["sets"] = len(r("Sets"))

    rw = r("Runes")                      # Runes.txt = 룬워드 표
    out["runewords_rows"] = len(rw)
    out["runewords"] = sum(1 for x in rw if x.get("complete") == "1")
    out["runes"] = sum(1 for x in r("Misc")
                       if len(x.get("code", "")) == 3
                       and x["code"][0] == "r" and x["code"][1:].isdigit())

    lv = r("Levels")
    out["areas"] = len(lv)
    # Act 칸은 0-기점이라 막 I 이 빈칸으로 읽힌다. 웨이포인트 9·9·9·3·9 로 맞춰 확인했다.
    act = Counter(x["Act"] or "0" for x in lv)
    out["areas_by_act"] = [act.get(str(i), 0) for i in range(5)]
    out["waypoints"] = sum(1 for x in lv if x.get("Waypoint") not in ("255", "", None))

    sk = Counter(x.get("charclass", "") for x in r("Skills"))
    out["necro_skills"] = sk.get("nec", 0)

    mon = [x for x in r("MonStats")
           if x.get("killable") == "1" and x.get("enabled") == "1" and x.get("npc") != "1"]
    out["monsters"] = len(mon)
    out["monster_families"] = len({x["MonType"] for x in mon if x.get("MonType")})
    out["bosses"] = sum(1 for x in mon if x.get("boss") == "1")

    out["prefixes"] = sum(1 for x in r("MagicPrefix") if x.get("spawnable") == "1")
    out["suffixes"] = sum(1 for x in r("MagicSuffix") if x.get("spawnable") == "1")
    out["weapon_bases"] = len(r("Weapons"))
    out["armor_bases"] = len(r("Armor"))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--keep", metavar="DIR", help="받은 txt 를 여기에 남긴다")
    a = ap.parse_args()
    dst = a.keep or tempfile.mkdtemp(prefix="d2txt-")
    os.makedirs(dst, exist_ok=True)
    fetch(dst)
    c = count(dst)

    print("D2 LoD 1.13c — 원본 표에서 센 수 (%s)" % dst)
    print("  지역          %4d  (막 %s)" % (c["areas"], "·".join(map(str, c["areas_by_act"]))))
    print("  웨이포인트    %4d" % c["waypoints"])
    print("  졸개          %4d  (계열 %d · boss %d)" % (c["monsters"], c["monster_families"], c["bosses"]))
    print("  네크로 스킬   %4d" % c["necro_skills"])
    print("  유니크        %4d  (표 %d행)" % (c["uniques"], c["uniques_rows"]))
    print("  세트 아이템   %4d  (세트 %d벌)" % (c["set_items"], c["sets"]))
    print("  룬            %4d" % c["runes"])
    print("  룬워드        %4d  (표 %d행)" % (c["runewords"], c["runewords_rows"]))
    print("  접두/접미     %4d / %d" % (c["prefixes"], c["suffixes"]))
    print("  베이스        %4d  (무기 %d · 방어구 %d)"
          % (c["weapon_bases"] + c["armor_bases"], c["weapon_bases"], c["armor_bases"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
