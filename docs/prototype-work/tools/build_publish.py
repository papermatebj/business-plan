# 게시용 사본 만들기: index.html은 문서 뼈대(doctype/html/head/body)를 벗기고, 나머지는 그대로 복사
import os, re, shutil, sys, json
HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.normpath(os.path.join(HERE, '..', '..', '..', 'prototype'))
DST = os.path.join(HERE, 'publish')
if os.path.isdir(DST):
    shutil.rmtree(DST)
os.makedirs(os.path.join(DST, 'assets'))
pages = [f for f in os.listdir(SRC) if f.endswith('.html')]
for f in pages:
    s = open(os.path.join(SRC, f), encoding='utf-8').read()
    if f == 'index.html':
        s = re.sub(r'<!doctype html>\s*', '', s, flags=re.I)
        s = re.sub(r'<html[^>]*>\s*', '', s, flags=re.I)
        s = re.sub(r'</?head>\s*', '', s, flags=re.I)
        s = re.sub(r'<meta charset="utf-8">\s*', '', s, flags=re.I)
        s = re.sub(r'<meta name="viewport"[^>]*>\s*', '', s, flags=re.I)
        s = re.sub(r'</?body>\s*', '', s, flags=re.I)
        s = re.sub(r'</html>\s*', '', s, flags=re.I)
    open(os.path.join(DST, f), 'w', encoding='utf-8').write(s)
for a in os.listdir(os.path.join(SRC, 'assets')):
    shutil.copy(os.path.join(SRC, 'assets', a), os.path.join(DST, 'assets', a))
files = {f: os.path.join(DST, f).replace('\\', '/') for f in pages if f != 'index.html'}
for a in os.listdir(os.path.join(DST, 'assets')):
    files['assets/' + a] = os.path.join(DST, 'assets', a).replace('\\', '/')
print(json.dumps(files, ensure_ascii=False, indent=1))
