"""Fetch only Latin font subsets; shipped as local assets, no runtime CDN."""
from pathlib import Path
from urllib.request import Request,urlopen
import re
url='https://fonts.googleapis.com/css2?family=Archivo:wght@900&family=Big+Shoulders+Display:wght@600;700;800;900&family=IBM+Plex+Mono:wght@400;500;600&family=Patrick+Hand&family=Sniglet:wght@400;800&family=IBM+Plex+Sans:wght@400;500;600&display=swap'
css=urlopen(Request(url,headers={'User-Agent':'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'})).read().decode()
blocks=re.findall(r'/\* latin \*/\s*(@font-face\s*{.*?})',css,re.S)
if not blocks: blocks=re.findall(r'(@font-face\s*{.*?})',css,re.S)
root=Path(__file__).resolve().parents[1]/'public';(root/'assets/fonts').mkdir(exist_ok=True,parents=True)
seen={};out=[]
for block in blocks:
 for remote in re.findall(r'url\((https[^)]+)\)',block):
  if remote not in seen:
   name=f'assets/fonts/font-{len(seen)}.'+('woff2' if '.woff2' in remote else 'ttf');seen[remote]=name
   (root/name).write_bytes(urlopen(remote).read())
  block=block.replace(remote,'./'+seen[remote])
 out.append(block)
(root/'fonts.css').write_text('\n'.join(out)+'\n')
print(len(seen),'local font files')

for file in (root/'assets/fonts').iterdir():
 if str(file.relative_to(root)) not in seen.values(): file.unlink()
