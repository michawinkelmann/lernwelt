# -*- coding: utf-8 -*-
"""Selbst-enthaltener Umbau Block 2 (Normalverteilung) ma-qs -> /tmp/ma-qs-block2.json"""
import sys, json, math
sys.path.insert(0, 'werkzeuge')
from figbau import Fig

# ===== Figuren-Helfer =======================================================
def gy(x, mu, sig):
    return math.exp(-0.5 * ((x - mu) / sig) ** 2)

def glocke(mu=0, sig=1, W=360, H=200, xr=None, hmax=0.42,
           xticks=None, mu_marke=False, wende=False, xlabel="x"):
    if xr is None: xr = (mu - 4*sig, mu + 4*sig)
    f = Fig(xr, (0, hmax*1.12), W=W, H=H)
    f.achsen(xlabel=xlabel, xticks=(xticks or []), yticks=[])
    n = 140
    xs = [xr[0] + (xr[1]-xr[0])*i/n for i in range(n+1)]
    pts = " ".join(f"{f.px(x):.1f},{f.py(gy(x,mu,sig)*hmax):.1f}" for x in xs)
    f.raw(f'<polyline class="gerade" points="{pts}" fill="none"/>')
    if mu_marke:
        f.raw(f'<line class="hilfslinie" x1="{f.px(mu):.1f}" y1="{f.py(0):.1f}" x2="{f.px(mu):.1f}" y2="{f.py(gy(mu,mu,sig)*hmax):.1f}"/>')
        f.textpx(f.px(mu), f.py(0)+15, "µ", "achsentitel", "middle")
    if wende:
        for xw in (mu-sig, mu+sig):
            yw = gy(xw, mu, sig) * hmax
            f.raw(f'<circle class="punkt" cx="{f.px(xw):.1f}" cy="{f.py(yw):.1f}" r="3.2"/>')
        f.textpx(f.px(mu-sig), f.py(gy(mu-sig,mu,sig)*hmax)-7, "µ−σ", "label-a", "middle")
        f.textpx(f.px(mu+sig), f.py(gy(mu+sig,mu,sig)*hmax)-7, "µ+σ", "label-a", "middle")
    return f.svg()

def glocke_flaeche(mu, sig, a, b, W=360, H=200, xr=None, hmax=0.42,
                   xticks=None, label=None, xlabel="x"):
    if xr is None: xr = (mu - 4*sig, mu + 4*sig)
    f = Fig(xr, (0, hmax*1.12), W=W, H=H)
    f.achsen(xlabel=xlabel, xticks=(xticks or []), yticks=[])
    n = 140
    xs = [xr[0] + (xr[1]-xr[0])*i/n for i in range(n+1)]
    m = 60
    fx = [a + (b-a)*i/m for i in range(m+1)]
    poly = [f"{f.px(a):.1f},{f.py(0):.1f}"]
    poly += [f"{f.px(x):.1f},{f.py(gy(x,mu,sig)*hmax):.1f}" for x in fx]
    poly += [f"{f.px(b):.1f},{f.py(0):.1f}"]
    f.raw(f'<polygon class="dreieck" points="{" ".join(poly)}"/>')
    pts = " ".join(f"{f.px(x):.1f},{f.py(gy(x,mu,sig)*hmax):.1f}" for x in xs)
    f.raw(f'<polyline class="gerade" points="{pts}" fill="none"/>')
    if label:
        xm = (a+b)/2
        f.textpx(f.px(xm), f.py(gy(xm,mu,sig)*hmax*0.4), label, "label-b", "middle")
    return f.svg()

def hist_zu_glocke(n_p=10, p=0.5, W=360, H=200, mit_glocke=True, xlabel="Trefferzahl k"):
    from math import comb
    ks = list(range(n_p+1))
    probs = [comb(n_p,k)*p**k*(1-p)**(n_p-k) for k in ks]
    hmax = max(probs)
    f = Fig((-0.7, n_p+0.7), (0, hmax*1.18), W=W, H=H)
    xt = [k for k in ks if k % 2 == 0]
    f.achsen(xlabel=xlabel, xticks=xt, yticks=[])
    for k, pr in zip(ks, probs):
        f.rect((k-0.42, 0), 0.84, pr, "dreieck")
    if mit_glocke:
        mu = n_p*p; sig = math.sqrt(n_p*p*(1-p))
        nn = 140
        xs = [-0.7 + (n_p+1.4)*i/nn for i in range(nn+1)]
        scale = hmax / gy(mu, mu, sig)
        pts = " ".join(f"{f.px(x):.1f},{f.py(gy(x,mu,sig)*scale):.1f}" for x in xs)
        f.raw(f'<polyline class="gerade-b" points="{pts}" fill="none"/>')
    return f.svg()

def saeule_korrektur(k=12, W=320, H=170):
    mu, sig = k, 4
    f = Fig((k-3.2, k+3.2), (0, 1.15), W=W, H=H)
    f.achsen(xlabel="x", xticks=[k-1, k, k+1], yticks=[])
    f.rect((k-0.5, 0), 1.0, 1.0, "dreieck")
    nn = 120
    xs = [k-3.2 + 6.4*i/nn for i in range(nn+1)]
    pts = " ".join(f"{f.px(x):.1f},{f.py(gy(x,mu,sig)):.1f}" for x in xs)
    f.raw(f'<polyline class="gerade-b" points="{pts}" fill="none"/>')
    f.raw(f'<line class="hilfslinie" x1="{f.px(k-0.5):.1f}" y1="{f.py(0):.1f}" x2="{f.px(k-0.5):.1f}" y2="{f.py(1.0):.1f}"/>')
    f.raw(f'<line class="hilfslinie" x1="{f.px(k+0.5):.1f}" y1="{f.py(0):.1f}" x2="{f.px(k+0.5):.1f}" y2="{f.py(1.0):.1f}"/>')
    f.textpx(f.px(k-0.5), f.py(0)+15, "k−0,5", "label-a", "middle")
    f.textpx(f.px(k+0.5), f.py(0)+15, "k+0,5", "label-a", "middle")
    return f.svg()

def zwei_glocken():
    f = Fig((-5,5),(0,0.5),W=360,H=200)
    f.achsen(xlabel="Füllmenge", xticks=[], yticks=[])
    nn=140
    for sig,cls,h in [(0.9,'gerade-a',0.46),(2.0,'gerade-b',0.46)]:
        xs=[-5+10*i/nn for i in range(nn+1)]
        scale=h/gy(0,0,sig)
        pts=" ".join(f"{f.px(x):.1f},{f.py(gy(x,0,sig)*scale):.1f}" for x in xs)
        f.raw(f'<polyline class="{cls}" points="{pts}" fill="none"/>')
    f.textpx(f.px(0), f.py(0)+15, "µ = 1000 g", "achsentitel", "middle")
    return f.svg()

def sigma_drei():
    f = Fig((-4,4),(0,0.47),W=360,H=200)
    f.achsen(xlabel="x", xticks=[], yticks=[])
    nn=140
    m=60; a,b=-1,1
    fx=[a+(b-a)*i/m for i in range(m+1)]
    poly=[f"{f.px(a):.1f},{f.py(0):.1f}"]+[f"{f.px(x):.1f},{f.py(gy(x,0,1)*0.42):.1f}" for x in fx]+[f"{f.px(b):.1f},{f.py(0):.1f}"]
    f.raw(f'<polygon class="dreieck" points="{" ".join(poly)}"/>')
    xs=[-4+8*i/nn for i in range(nn+1)]
    pts=" ".join(f"{f.px(x):.1f},{f.py(gy(x,0,1)*0.42):.1f}" for x in xs)
    f.raw(f'<polyline class="gerade" points="{pts}" fill="none"/>')
    for xm in (-3,-2,-1,0,1,2,3):
        f.raw(f'<line class="hilfslinie" x1="{f.px(xm):.1f}" y1="{f.py(0):.1f}" x2="{f.px(xm):.1f}" y2="{f.py(gy(xm,0,1)*0.42):.1f}"/>')
    f.textpx(f.px(0), f.py(0.2), "68 %", "label-b", "middle")
    f.textpx(f.px(0), f.py(0)+15, "µ", "achsentitel", "middle")
    return f.svg()

# ===== Lektionen ============================================================
SRC = 'daten/kurse/ma-qs.json'
d = json.load(open(SRC, encoding='utf-8'))
by_id = {l['id']: l for l in d['lektionen']}
def base(lid): return json.loads(json.dumps(by_id[lid], ensure_ascii=False))
out = {}

exec(open('nv_b2_lessons.py', encoding='utf-8').read())

order = ['l6','l7','l8','l9','l10','l10b']
json.dump([out[i] for i in order], open('/tmp/ma-qs-block2.json','w',encoding='utf-8'),
          ensure_ascii=False, indent=1)
print("geschrieben:", len(order), "Lektionen")
