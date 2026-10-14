import sys, re, html
from html.parser import HTMLParser
class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.out=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.skip+=1
        if tag in ('p','div','li','tr','h1','h2','h3','h4','h5','br','section','table','details','summary'): self.out.append('\n')
        if tag in ('h1','h2','h3','h4'): self.out.append('#'*int(tag[1])+' ')
        if tag in ('td','th'): self.out.append(' | ')
        if tag=='li': self.out.append('- ')
        d=dict(attrs)
        if d.get('id') and tag in ('section','h2','h3','div','tr'): self.out.append(f'[#{d["id"]}] ')
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.skip-=1
    def handle_data(self, data):
        if not self.skip: self.out.append(data)
p=P(); p.feed(open(sys.argv[1],encoding='utf-8').read())
t=''.join(p.out)
t=re.sub(r'[ \t]+',' ',t); t=re.sub(r'\n\s*\n+','\n',t)
open(sys.argv[2],'w',encoding='utf-8').write(t)
print(sys.argv[2], len(t))
