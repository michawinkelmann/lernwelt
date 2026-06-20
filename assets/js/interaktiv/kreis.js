// kreis.js — Kreis mit Radius-Regler → Durchmesser, Umfang, Fläche.
// params = { rmax:8, rinit:4, einheit:"cm" }
export function mount(container, params) {
  const p = params || {}, E = p.einheit || "cm", rmax = p.rmax || 8;
  let r = p.rinit || 4; const PX = 16, C = rmax * PX + 20;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${2*C} ${2*C}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:300px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.textAlign = "center"; lab.append(document.createTextNode("Radius r: "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = 1; inp.max = rmax; inp.step = 1; inp.value = r; inp.setAttribute("aria-label", "Radius");
  const rv = document.createElement("strong"); rv.textContent = r; lab.append(inp, document.createTextNode(" "), rv, document.createTextNode(" " + E));
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.04rem";
  function zeichne() {
    const R = r * PX;
    let s = `<circle cx="${C}" cy="${C}" r="${R}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
    s += `<line x1="${C}" y1="${C}" x2="${C+R}" y2="${C}" stroke="var(--text)" stroke-width="1.5"/>`;
    s += `<circle cx="${C}" cy="${C}" r="2.5" fill="var(--text)"/>`;
    s += `<text x="${C+R/2}" y="${C-4}" text-anchor="middle" font-size="11">r = ${r}</text>`;
    svg.innerHTML = s;
    const U = 2 * Math.PI * r, A = Math.PI * r * r, f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
    out.innerHTML = `Durchmesser d = ${2*r} ${E} <br> Umfang U = 2·π·r = <strong>${f(U)} ${E}</strong> <br> Fläche A = π·r² = <strong>${f(A)} ${E}²</strong>`;
  }
  inp.addEventListener("input", () => { r = +inp.value; rv.textContent = r; zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
