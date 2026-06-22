// normalflaeche.js — Wahrscheinlichkeit P(a ≤ X ≤ b) als Fläche unter der (Standard-)Normalverteilung.
// Regler für die Intervallgrenzen a und b; Fläche wird schraffiert und als Prozent ausgegeben (normCDf-Idee).
// params = { mu:0, sigma:1, aInit:-1, bInit:1 }
export function mount(container, params) {
  const p = params || {}, mu = p.mu ?? 0, sigma = p.sigma ?? 1;
  let a = p.aInit ?? -1, b = p.bInit ?? 1;
  const W = 340, H = 200, ML = 12, MR = 12, MT = 14, MB = 26;
  const lo = mu - 3.5 * sigma, hi = mu + 3.5 * sigma;
  const sx = v => ML + (v - lo) / (hi - lo) * (W - ML - MR);
  const sy = d => (H - MB) - d / (0.4 / sigma) * (H - MT - MB);
  const phi = v => Math.exp(-((v - mu) ** 2) / (2 * sigma * sigma)) / (sigma * Math.sqrt(2 * Math.PI));
  function erf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; }
  const Phi = z => 0.5 * (1 + erf((z - mu) / (sigma * Math.SQRT2)));
  const fmt = v => (Math.round(v * 100) / 100).toLocaleString("de-DE");
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:430px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.0rem;min-height:2em";
  function kurvePts() { let pts = []; for (let i = 0; i <= 160; i++) { const v = lo + (hi - lo) * i / 160; pts.push([sx(v), sy(phi(v))]); } return pts; }
  function zeichne() {
    if (a > b) { const t = a; a = b; b = t; }
    const pts = kurvePts();
    let s = `<line x1="${ML}" y1="${sy(0)}" x2="${W-MR}" y2="${sy(0)}" stroke="var(--text)" stroke-width="1"/>`;
    // Fläche zwischen a und b
    let fl = `M ${sx(a).toFixed(1)},${sy(0).toFixed(1)}`;
    for (let i = 0; i <= 120; i++) { const v = a + (b - a) * i / 120; fl += ` L ${sx(v).toFixed(1)},${sy(phi(v)).toFixed(1)}`; }
    fl += ` L ${sx(b).toFixed(1)},${sy(0).toFixed(1)} Z`;
    s += `<path d="${fl}" fill="var(--akzent)" opacity="0.3"/>`;
    s += `<polyline points="${pts.map(p => p[0].toFixed(1) + "," + p[1].toFixed(1)).join(" ")}" fill="none" stroke="var(--akzent)" stroke-width="2"/>`;
    for (const g of [a, b]) s += `<line x1="${sx(g).toFixed(1)}" y1="${MT}" x2="${sx(g).toFixed(1)}" y2="${sy(0)}" stroke="var(--text-leise)" stroke-width="1" stroke-dasharray="3 3"/>`;
    for (let z = Math.ceil(lo); z <= hi; z++) s += `<text x="${sx(z)}" y="${H-MB+13}" text-anchor="middle" font-size="9" fill="var(--text-leise)">${z}</text>`;
    svg.innerHTML = s;
    const Pab = Phi(b) - Phi(a);
    out.innerHTML = `P(${fmt(a)} ≤ X ≤ ${fmt(b)}) = <strong>${fmt(Pab * 100)} %</strong> (Fläche unter der Kurve)`;
  }
  function regler(label, val, set) { const l = document.createElement("label"); l.style.cssText = "white-space:nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = lo; i.max = hi; i.step = 0.1; i.value = val; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const o = document.createElement("strong"); o.style.cssText = "display:inline-block;min-width:3ch;text-align:right;font-variant-numeric:tabular-nums"; o.textContent = fmt(val);
    i.addEventListener("input", () => { set(+i.value); o.textContent = fmt(+i.value); zeichne(); }); l.append(i, document.createTextNode(" "), o); return l; }
  steuer.append(regler("a", a, v => a = v), regler("b", b, v => b = v));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
