"""원본 HTML을 고친 뒤 깨진 곳이 없는지 빠르게 확인한다.

사용: python -I docs/revision-work/tools/check_html.py sikup-spec.html [다른 html ...]
- 명세서면 기능 카드(article.feat) 개수를 단계별로 세고, 중복 ID를 찾는다.
- 모든 파일에서 자주 쓰는 태그의 여닫이 개수가 맞는지 본다.
"""
import collections
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

TAGS = ("article", "section", "table", "tr", "details", "ul", "ol", "div")

for path in sys.argv[1:]:
    h = open(path, encoding="utf-8").read()
    print(f"== {path}")
    arts = re.findall(r"<article[^>]*\bfeat\b[^>]*>", h)
    if arts:
        pri = collections.Counter()
        ids = []
        for a in arts:
            m = re.search(r'data-pri="([^"]+)"', a)
            pri[m.group(1) if m else "none"] += 1
            m = re.search(r'id="([^"]+)"', a)
            ids.append(m.group(1) if m else "?")
        dup = [i for i, n in collections.Counter(ids).items() if n > 1]
        print(f"기능 {len(arts)}개 · " + " · ".join(f"{k} {v}" for k, v in sorted(pri.items())))
        print("중복 ID: " + (", ".join(dup) if dup else "없음"))
    bad = []
    for t in TAGS:
        o = len(re.findall(rf"<{t}[\s>]", h))
        c = len(re.findall(rf"</{t}>", h))
        if o != c:
            bad.append(f"<{t}> {o}/{c}")
    print("태그 여닫이: " + (", ".join(bad) if bad else "모두 맞음"))
