// termableitung.js — Potenz- und Faktorregel: f(x)=a·xⁿ → f′(x)=a·n·x^(n−1).
// params = { amax:5, nmax:5, ainit:3, ninit:2, zeigeF2:false }
export function mount(container, params){
  const p=params||{}; const amax=p.amax||5,nmax=p.nmax||5;
  let a=p.ainit??3, n=p.ninit??2;
  const fmt=v=>(Math.round(v*100)/100).toLocaleString("de-DE");
  const hoch=e=>{const M={'-':'⁻','0':'⁰','1':'¹','2':'²','3':'³','4':'⁴','5':'⁵','6':'⁶','7':'⁷','8':'⁸','9':'⁹'};return String(e).split('').map(c=>M[c]||c).join('');};
  const term=(c,e)=>{ if(c===0)return "0"; if(e===0)return fmt(c); const cp=c===1?'':c===-1?'−':fmt(c)+'·'; return cp+(e===1?'x':'x'+hoch(e)); };
  container.innerHTML="";
  const wrap=document.createElement("div"); wrap.style.cssText="display:flex;flex-direction:column;gap:var(--abstand-2)";
  const box=document.createElement("div"); box.style.cssText="background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius);padding:.7rem;text-align:center;font-size:1.15rem;line-height:1.7";
  const steuer=document.createElement("div"); steuer.style.cssText="display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const regel=document.createElement("p"); regel.style.cssText="margin:0;text-align:center;font-size:.92rem;color:var(--text-leise)";
  regel.textContent="Potenzregel: Den Exponenten als Faktor nach vorne ziehen und den Exponenten um 1 verringern.";
  function aktualisiere(){
    const fc=a*n, fe=n-1, f1 = fe===0?fmt(fc):term(fc,fe);
    let html=`f(x) = ${term(a,n)}<br>f′(x) = <strong style="color:var(--akzent)">${f1}</strong>`;
    if(p.zeigeF2){ const f2c=fc*fe,f2e=fe-1; const f2 = fe<=0?'0':(f2e===0?fmt(f2c):term(f2c,f2e)); html+=`<br>f″(x) = ${f2}`; }
    box.innerHTML=html;
  }
  function regler(label,val,min,max,set){ const l=document.createElement("label");l.style.cssText="white-space:nowrap";l.append(document.createTextNode(label+": "));
    const i=document.createElement("input");i.type="range";i.min=min;i.max=max;i.step=1;i.value=val;i.style.verticalAlign="middle";i.setAttribute("aria-label",label);
    const o=document.createElement("strong");o.style.cssText="display:inline-block;min-width:2ch;text-align:right";o.textContent=val;
    i.addEventListener("input",()=>{set(+i.value);o.textContent=i.value;aktualisiere();}); l.append(i,document.createTextNode(" "),o); return l; }
  steuer.append(regler("Faktor a",a,1,amax,v=>a=v),regler("Exponent n",n,1,nmax,v=>n=v));
  wrap.append(box,steuer,regel); container.append(wrap); aktualisiere();
}
