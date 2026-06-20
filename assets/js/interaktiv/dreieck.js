// dreieck.js — rechtwinkliges Dreieck: Katheten a,b → Hypotenuse c (Pythagoras) + Winkel/Seitenverhältnisse.
// params = { amax:8, bmax:6, ainit:4, binit:3, einheit:"", trig:false }
export function mount(container, params) {
  const p = params || {};
  const amax = p.amax || 8, bmax = p.bmax || 6, E = p.einheit || "";
  let a = p.ainit || 4, b = p.binit || 3;
  const PX = 30, OX = 22, OY = 14;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${OX*2+amax*PX} ${OY*2+bmax*PX}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:360px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.04rem";
  function regler(label, val, max, set) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = 1; i.max = max; i.step = 1; i.value = val; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = val;
    i.addEventListener("input", () => { set(+i.value); s.textContent = i.value; zeichne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(E ? " " + E : "")); return l;
  }
  function zeichne() {
    const H = OY * 2 + bmax * PX;
    const x0 = OX, y0 = H - OY;            // rechter Winkel unten links
    const xa = OX + a * PX, yb = y0 - b * PX;
    const c = Math.sqrt(a * a + b * b);
    let s = `<polygon points="${x0},${y0} ${xa},${y0} ${x0},${yb}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
    s += `<rect x="${x0}" y="${y0-12}" width="12" height="12" fill="none" stroke="var(--text)" stroke-width="1"/>`;
    s += `<text x="${(x0+xa)/2}" y="${y0+12}" text-anchor="middle" font-size="12" fill="var(--text)">a = ${a}</text>`;
    s += `<text x="${x0-6}" y="${(y0+yb)/2}" text-anchor="end" font-size="12" fill="var(--text)">b = ${b}</text>`;
    s += `<text x="${(xa+x0)/2+6}" y="${(y0+yb)/2-4}" font-size="12" fill="var(--akzent)" font-weight="bold">c</text>`;
    svg.innerHTML = s;
    const cr = Math.round(c * 100) / 100;
    let txt = `Pythagoras: a² + b² = ${a*a} + ${b*b} = ${a*a+b*b} = c² &nbsp;⟹&nbsp; <strong>c = ${cr.toLocaleString("de-DE")} ${E}</strong>`;
    if (p.trig) { const al = Math.atan2(b, a) * 180 / Math.PI;
      txt += `<br>Winkel α (bei a–c): <strong>${(Math.round(al*10)/10).toLocaleString("de-DE")}°</strong><br>sin α = ${(Math.round(b/c*100)/100).toLocaleString("de-DE")}, cos α = ${(Math.round(a/c*100)/100).toLocaleString("de-DE")}`;
    }
    out.innerHTML = txt;
  }
  steuer.append(regler("Kathete a", a, amax, v => a = v), regler("Kathete b", b, bmax, v => b = v));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
