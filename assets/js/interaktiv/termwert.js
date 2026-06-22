// termwert.js — Termwert berechnen: Zahl für x in einen festen Term a·x + b einsetzen.
// params = { a:1.5, b:2, xmin:0, xmax:8, xinit:4, schritt:1, einheit:"" }
export function mount(container, params){
  const p=params||{}; const a=p.a??1.5,b=p.b??2,E=p.einheit?" "+p.einheit:"";
  let x=p.xinit??4;
  const fmt=v=>(Math.round(v*100)/100).toLocaleString("de-DE");
  const termtext=`${a===1?'':fmt(a)+'·'}x ${b<0?'− '+fmt(-b):'+ '+fmt(b)}`;
  container.innerHTML="";
  const wrap=document.createElement("div"); wrap.style.cssText="display:flex;flex-direction:column;gap:var(--abstand-2)";
  const box=document.createElement("div"); box.setAttribute("role","status"); box.style.cssText="background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius);padding:.7rem;text-align:center;font-size:1.1rem;line-height:1.7;min-height:4.4em";
  const lab=document.createElement("label"); lab.style.cssText="text-align:center;white-space:nowrap"; lab.append(document.createTextNode("x = "));
  const inp=document.createElement("input"); inp.type="range"; inp.min=p.xmin??0;inp.max=p.xmax??8;inp.step=p.schritt??1;inp.value=x;inp.style.verticalAlign="middle";inp.setAttribute("aria-label","Wert für x");
  const xv=document.createElement("strong"); xv.style.cssText="display:inline-block;min-width:2.5ch;text-align:right;font-variant-numeric:tabular-nums"; xv.textContent=fmt(x);
  lab.append(inp,document.createTextNode(" "),xv,document.createTextNode(E));
  function aktualisiere(){ const ax=a*x, val=ax+b;
    box.innerHTML=`Term: T(x) = ${termtext}<br>x = ${fmt(x)} einsetzen:<br>T(${fmt(x)}) = ${a===1?'':fmt(a)+' · '}${fmt(x)} ${b<0?'− '+fmt(-b):'+ '+fmt(b)} = ${a===1?'':fmt(ax)+' '+(b<0?'−':'+')+' '+fmt(Math.abs(b))+' = '}<strong>${fmt(val)}</strong>`;
  }
  inp.addEventListener("input",()=>{x=+inp.value;xv.textContent=fmt(x);aktualisiere();});
  wrap.append(box,lab); container.append(wrap); aktualisiere();
}
