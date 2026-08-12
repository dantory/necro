"""글자가 **읽히는지**를 수로 가른다 — 「옅어 보인다」는 눈만으로는 못 다툰다.

  python3 tools/read_metric.py <잘라찍은.png>

두 값을 낸다:
  bg_sd  바탕 요동. 아래쪽 절반(어두운 쪽) 밝기의 표준편차 — 돌 무늬·관·해골이
         그대로 비치면 커진다. 작을수록 글자가 얹힐 자리가 고르다.
  gap    글자·바탕 밝기차. 위 5%(글자) 평균 − 아래 50%(바탕) 평균.
         커야 읽힌다. bg_sd 를 못 줄이면 gap 을 키워도 눈에는 안 는다.
"""
import sys
from PIL import Image

src = sys.argv[1]
im = Image.open(src).convert("L")
px = sorted(im.getdata())
n = len(px)
bg = px[: n // 2]                       # 어두운 절반 = 바탕
fg = px[int(n * 0.95):]                 # 밝은 5% = 글자 획
mean_bg = sum(bg) / len(bg)
sd = (sum((v - mean_bg) ** 2 for v in bg) / len(bg)) ** 0.5
mean_fg = sum(fg) / len(fg)
print("bg_sd %.1f  gap %.1f  (%s %dx%d)" % (sd, mean_fg - mean_bg, src, *im.size))
