// rechteck.js — Rechteck mit Reglern a,b: zeigt Umfang U und Fläche A (mit Karogitter).
// params = { amax:12, bmax:8, ainit:6, binit:4, einheit:"cm" }
export function mount(container, params) {
  const p = params || {};
  const amax = p.amax || 12, bmax = p.bmax || 8, E = p.einheit || "cm";
  let a = p.ainit || 6, b = p.binit || 4;
  const PX = 20, OX = 20, OY = 16;
  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${OX*2+amax*PX} ${OY*2+bmax*PX}`);
  svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:360px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div");
  steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p");
  out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.05rem";
  function regler(label, val, max, set) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap";
    l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = 1; i.max = max; i.step = 1; i.value = val;
    i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = val;
    i.addEventListener("input", () => { set(+i.value); s.textContent = i.value; zeichne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(" " + E));
    return l;
  }
  function zeichne() {
    const w = a * PX, h = b * PX;
    let s = `<rect x="${OX}" y="${OY}" width="${w}" height="${h}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
    for (let i = 1; i < a; i++) s += `<line x1="${OX+i*PX}" y1="${OY}" x2="${OX+i*PX}" y2="${OY+h}" stroke="var(--linie)" stroke-width="1"/>`;
    for (let j = 1; j < b; j++) s += `<line x1="${OX}" y1="${OY+j*PX}" x2="${OX+w}" y2="${OY+j*PX}" stroke="var(--linie)" stroke-width="1"/>`;
    svg.innerHTML = s;
    const uTxt = `Umfang <strong>U = 2·(a+b) = ${2*(a+b)} ${E}</strong>`;
    const aTxt = `Fläche <strong>A = a·b = ${a*b} ${E}²</strong>`;
    out.innerHTML = p.zeige === "umfang" ? uTxt : p.zeige === "flaeche" ? aTxt : uTxt + " <br> " + aTxt;
  }
  steuer.append(regler("Länge a", a, amax, v => a = v), regler("Breite b", b, bmax, v => b = v));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
