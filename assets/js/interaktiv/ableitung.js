// ableitung.js — Sekante / Tangente / Ableitungsfunktion / Krümmung an einer festen Kurve.
// modus: "sekante" | "tangente" | "ableitung" | "kruemmung"
// params = { modus, fn:"parabel"|"kubik"|"exp" }
export function mount(container, params) {
  const p = params || {};
  const modus = p.modus || "sekante";
  const FN = {
    parabel: { f:x=>0.25*x*x,        d:x=>0.5*x,       dd:x=>0.5,        term:"f(x) = ¼·x²",           xr:[-5,5], yr:[-2,7] },
    kubik:   { f:x=>0.1*x*x*x-0.5*x, d:x=>0.3*x*x-0.5, dd:x=>0.6*x,      term:"f(x) = 0,1·x³ − 0,5·x", xr:[-4,4], yr:[-3,3] },
    exp:     { f:x=>Math.exp(x),     d:x=>Math.exp(x), dd:x=>Math.exp(x),term:"f(x) = eˣ",             xr:[-2,2], yr:[0,7.5] },
    xexp:    { f:x=>x*Math.exp(x), d:x=>(x+1)*Math.exp(x), dd:x=>(x+2)*Math.exp(x), term:"f(x) = x·eˣ", xr:[-4,2], yr:[-1.5,4] }
  };
  const F = FN[p.fn] || FN.parabel;
  const W=320,H=270,ML=34,MR=12,MT=12,MB=26, x0r=F.xr[0],x1r=F.xr[1],y0r=F.yr[0],y1r=F.yr[1];
  const uid="ab"+Math.random().toString(36).slice(2,7);
  const sx=x=>ML+(x-x0r)/(x1r-x0r)*(W-ML-MR);
  const sy=y=>(H-MB)-(y-y0r)/(y1r-y0r)*(H-MT-MB);
  const fmt=v=>{ if(Object.is(v,-0))v=0; return (Math.round(v*100)/100).toLocaleString("de-DE"); };
  let A=-2,B=3,X0=1,Hh=2;
  container.innerHTML="";
  const wrap=document.createElement("div"); wrap.style.cssText="display:flex;flex-direction:column;gap:var(--abstand-2)";
  const formel=document.createElement("p"); formel.style.cssText="margin:0;text-align:center;font-size:1rem"; formel.innerHTML=`<strong>${F.term}</strong>`;
  const svg=document.createElementNS("http://www.w3.org/2000/svg","svg"); svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.setAttribute("role","img");
  svg.style.cssText="width:100%;max-width:340px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer=document.createElement("div"); steuer.style.cssText="display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;justify-content:center";
  const out=document.createElement("p"); out.setAttribute("role","status"); out.style.cssText="margin:0;text-align:center;font-size:1.02rem;min-height:3em";
  function kurve(fn,farbe,bw,dash){ let pts=[],n=180;
    for(let i=0;i<=n;i++){const x=x0r+(x1r-x0r)*i/n,y=fn(x);pts.push(isFinite(y)?`${sx(x).toFixed(1)},${sy(y).toFixed(1)}`:null);}
    let d="",op=false; pts.forEach(pt=>{if(pt===null)op=false;else{d+=(op?" L":" M")+pt;op=true;}});
    return `<path d="${d}" fill="none" stroke="${farbe}" stroke-width="${bw}" ${dash?'stroke-dasharray="6 4"':''} clip-path="url(#${uid})"/>`; }
  function gerade(px,py,m,farbe,dash){ const ya=py+m*(x0r-px),yb=py+m*(x1r-px);
    return `<line x1="${sx(x0r).toFixed(1)}" y1="${sy(ya).toFixed(1)}" x2="${sx(x1r).toFixed(1)}" y2="${sy(yb).toFixed(1)}" stroke="${farbe}" stroke-width="1.8" ${dash?'stroke-dasharray="5 4"':''} clip-path="url(#${uid})"/>`; }
  const punkt=(x,y,f,r)=>`<circle cx="${sx(x).toFixed(1)}" cy="${sy(y).toFixed(1)}" r="${r||4}" fill="${f}"/>`;
  function geruest(){ let s=`<defs><clipPath id="${uid}"><rect x="${ML}" y="${MT}" width="${W-ML-MR}" height="${H-MT-MB}"/></clipPath></defs>`;
    for(let x=Math.ceil(x0r);x<=x1r;x++){const X=sx(x);s+=`<line x1="${X}" y1="${MT}" x2="${X}" y2="${H-MB}" stroke="var(--linie)" stroke-width="0.5" opacity="0.35"/>`;}
    for(let y=Math.ceil(y0r);y<=y1r;y++){const Y=sy(y);s+=`<line x1="${ML}" y1="${Y}" x2="${W-MR}" y2="${Y}" stroke="var(--linie)" stroke-width="0.5" opacity="0.35"/>`;}
    const yA=sy(0),xA=sx(0);
    s+=`<line x1="${ML}" y1="${yA}" x2="${W-MR}" y2="${yA}" stroke="var(--text)" stroke-width="1.1"/><line x1="${xA}" y1="${MT}" x2="${xA}" y2="${H-MB}" stroke="var(--text)" stroke-width="1.1"/>`;
    s+=`<text x="${W-MR}" y="${yA-4}" text-anchor="end" font-size="10" fill="var(--text-leise)">x</text>`; return s; }
  function wendepunkt(){ // x mit dd≈0 (Vorzeichenwechsel)
    let prev=F.dd(x0r),px=x0r;
    for(let i=1;i<=200;i++){const x=x0r+(x1r-x0r)*i/200,v=F.dd(x); if(prev===0)return px; if(prev*v<0)return px+(x-px)*(0-prev)/(v-prev); prev=v;px=x;} return null; }
  function zeichne(){ let s;
    if(modus==="sekante"){ const fa=F.f(A),fb=F.f(B),m=(fb-fa)/((B-A)||1e-9);
      s=geruest()+kurve(F.f,"var(--akzent)",2.4)+gerade(A,fa,m,"var(--text-leise)")+punkt(A,fa,"var(--akzent)")+punkt(B,fb,"var(--akzent)");
      out.innerHTML=`Mittlere Änderungsrate über [${fmt(A)}; ${fmt(B)}]:<br>(f(${fmt(B)}) − f(${fmt(A)})) / (${fmt(B)} − ${fmt(A)}) = <strong>${fmt(m)}</strong>`;
    } else if(modus==="tangente"){ const fx=F.f(X0),fq=F.f(X0+Hh),ms=(fq-fx)/(Hh||1e-9),mt=F.d(X0);
      s=geruest()+kurve(F.f,"var(--akzent)",2.4)+gerade(X0,fx,mt,"var(--ok)",true)+gerade(X0,fx,ms,"var(--text-leise)")+punkt(X0,fx,"var(--akzent)")+punkt(X0+Hh,fq,"var(--text-leise)");
      out.innerHTML=`Sekantensteigung (h = ${fmt(Hh)}) = <strong>${fmt(ms)}</strong><br><span style="color:var(--text-leise);font-size:.93em">Für h → 0: Tangentensteigung f′(${fmt(X0)}) = ${fmt(mt)} (grün gestrichelt)</span>`;
    } else if(modus==="ableitung"){ const fx=F.f(X0),mt=F.d(X0);
      s=geruest()+kurve(F.f,"var(--akzent)",2.4)+kurve(F.d,"var(--ok)",2,true)+gerade(X0,fx,mt,"var(--text-leise)",true)+punkt(X0,fx,"var(--akzent)")+punkt(X0,mt,"var(--ok)");
      out.innerHTML=`Steigung von f bei x = ${fmt(X0)} ist f′(${fmt(X0)}) = <strong>${fmt(mt)}</strong><br><span style="color:var(--text-leise);font-size:.93em">Der Punkt (${fmt(X0)} | ${fmt(mt)}) liegt auf der Ableitung f′ (grün gestrichelt).</span>`;
    } else { // kruemmung
      const fx=F.f(X0),k=F.dd(X0),xw=wendepunkt();
      s=geruest()+kurve(F.f,"var(--akzent)",2.4)+punkt(X0,fx,"var(--akzent)");
      if(xw!==null) s+=punkt(xw,F.f(xw),"var(--ok)",5)+`<text x="${sx(xw).toFixed(1)}" y="${(sy(F.f(xw))-9).toFixed(1)}" text-anchor="middle" font-size="10" fill="var(--ok)" font-weight="bold">WP</text>`;
      const art=k>0.001?"Linkskurve (konvex, f″ > 0)":k<-0.001?"Rechtskurve (konkav, f″ < 0)":"Wendepunkt (f″ = 0)";
      out.innerHTML=`f″(${fmt(X0)}) = <strong>${fmt(k)}</strong> → ${art}<br><span style="color:var(--text-leise);font-size:.93em">Wendepunkt (grün) bei x = ${xw!==null?fmt(xw):"—"}, wo f″ das Vorzeichen wechselt.</span>`;
    }
    svg.innerHTML=s;
  }
  function regler(label,min,max,step,val,set){ const l=document.createElement("label");l.style.cssText="white-space:nowrap";l.append(document.createTextNode(label+": "));
    const i=document.createElement("input");i.type="range";i.min=min;i.max=max;i.step=step;i.value=val;i.style.verticalAlign="middle";i.setAttribute("aria-label",label);
    const o=document.createElement("strong");o.style.cssText="display:inline-block;min-width:2.6ch;text-align:right;font-variant-numeric:tabular-nums";o.textContent=fmt(val);
    i.addEventListener("input",()=>{set(+i.value);o.textContent=fmt(+i.value);zeichne();}); l.append(i,document.createTextNode(" "),o); return l; }
  if(modus==="sekante") steuer.append(regler("a",x0r,x1r,0.5,A,v=>A=v),regler("b",x0r,x1r,0.5,B,v=>B=v));
  else if(modus==="tangente") steuer.append(regler("x₀",x0r+0.5,x1r-0.5,0.5,X0,v=>X0=v),regler("h",0.1,4,0.1,Hh,v=>Hh=v));
  else steuer.append(regler("x₀",x0r,x1r,0.5,X0,v=>X0=v));
  wrap.append(formel,svg,steuer,out); container.append(wrap); zeichne();
}
