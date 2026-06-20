// kreissektor.js — Kreissektor: Radius r und Mittelpunktswinkel α → Bogenlänge und Sektorfläche.
// params = { rmax:6, rinit:4, ainit:90, einheit:"cm" }
export function mount(container, params) {
  const p = params || {}, E = p.einheit || "cm", rmax = p.rmax || 6;
  let r = p.rinit || 4, al = p.ainit || 90;
  const PX = 18, C = rmax * PX + 16;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${2*C} ${2*C}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:280px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function regler(label, get, set, min, max, einh) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = 1; i.value = get(); i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = get();
    i.addEventListener("input", () => { set(+i.value); s.textContent = i.value; zeichne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(einh ? " " + einh : "")); return l;
  }
  function zeichne() {
    const R = r * PX, a = Math.min(359.999, al) * Math.PI / 180;
    const x = C + R * Math.cos(-a + Math.PI/2 - Math.PI/2), y = C - R * Math.sin(Math.PI/2 - Math.PI/2); // start rechts
    const ex = C + R * Math.cos(a), ey = C - R * Math.sin(a);
    const large = al > 180 ? 1 : 0;
    let s = `<circle cx="${C}" cy="${C}" r="${R}" fill="none" stroke="var(--linie)" stroke-width="1"/>`;
    s += `<path d="M ${C} ${C} L ${C+R} ${C} A ${R} ${R} 0 ${large} 0 ${ex.toFixed(1)} ${ey.toFixed(1)} Z" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2"/>`;
    s += `<text x="${C + R*0.5*Math.cos(a/2)}" y="${C - R*0.5*Math.sin(a/2) + 4}" text-anchor="middle" font-size="11" fill="var(--text)">${al}°</text>`;
    svg.innerHTML = s;
    const bogen = al / 360 * 2 * Math.PI * r, flaeche = al / 360 * Math.PI * r * r;
    const f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
    out.innerHTML = `Bogenlänge b = (α/360°)·2·π·r = <strong>${f(bogen)} ${E}</strong> <br> Sektorfläche A = (α/360°)·π·r² = <strong>${f(flaeche)} ${E}²</strong>`;
  }
  steuer.append(regler("Radius r", () => r, v => r = v, 1, rmax, E), regler("Winkel α", () => al, v => al = v, 10, 360, "°"));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
