// glocke.js — Normalverteilung: Erwartungswert μ und Standardabweichung σ einstellen → Glockenkurve + Sigma-Regeln.
// params = { mumin:-2, mumax:2, muinit:0, smin:0.5, smax:3, sinit:1 }
export function mount(container, params) {
  const p = params || {};
  let mu = p.muinit ?? 0, sig = p.sinit ?? 1;
  const muMin = p.mumin ?? -3, muMax = p.mumax ?? 3, sMin = p.smin ?? 0.5, sMax = p.smax ?? 3;
  const W = 340, H = 180, ML = 10, MB = 22, x0 = -6, x1 = 6;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  const sx = x => ML + (x - x0) / (x1 - x0) * (W - 2 * ML);
  const phi = (x, m, s) => Math.exp(-0.5 * ((x - m) / s) ** 2) / (s * Math.sqrt(2 * Math.PI));
  function regler(label, get, set, min, max, step) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = get(); i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = (+get()).toLocaleString("de-DE");
    i.addEventListener("input", () => { set(+i.value); s.textContent = (+i.value).toLocaleString("de-DE"); zeichne(); });
    l.append(i, document.createTextNode(" "), s); return l;
  }
  function zeichne() {
    const ymax = phi(mu, mu, Math.max(sMin, sig)) * 1.05;
    const sy = y => (H - MB) - y / ymax * (H - MB - 8);
    let band = "", pts = [];
    for (let i = 0; i <= 160; i++) { const x = x0 + (x1 - x0) * i / 160; pts.push(`${sx(x).toFixed(1)},${sy(phi(x, mu, sig)).toFixed(1)}`); }
    // 1-sigma-Band füllen
    let bandPts = [`${sx(mu-sig).toFixed(1)},${(H-MB).toFixed(1)}`];
    for (let i = 0; i <= 60; i++) { const x = mu - sig + 2 * sig * i / 60; bandPts.push(`${sx(x).toFixed(1)},${sy(phi(x, mu, sig)).toFixed(1)}`); }
    bandPts.push(`${sx(mu+sig).toFixed(1)},${(H-MB).toFixed(1)}`);
    let s = `<polygon points="${bandPts.join(" ")}" fill="var(--hauch)"/>`;
    s += `<line x1="0" y1="${H-MB}" x2="${W}" y2="${H-MB}" stroke="var(--text)" stroke-width="1"/>`;
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--akzent)" stroke-width="2.4"/>`;
    s += `<line x1="${sx(mu)}" y1="${sy(phi(mu,mu,sig))}" x2="${sx(mu)}" y2="${H-MB}" stroke="var(--text-leise)" stroke-dasharray="3 2"/>`;
    s += `<text x="${sx(mu)}" y="${H-8}" text-anchor="middle" font-size="10" fill="var(--text-leise)">μ</text>`;
    [-1,1].forEach(k=>{ s += `<text x="${sx(mu+k*sig)}" y="${H-8}" text-anchor="middle" font-size="9" fill="var(--text-leise)">μ${k>0?"+":"−"}σ</text>`; });
    svg.innerHTML = s;
    out.innerHTML = `μ = <strong>${mu.toLocaleString("de-DE")}</strong>, σ = <strong>${sig.toLocaleString("de-DE")}</strong>. Im Bereich μ ± σ liegen ≈ <strong>68 %</strong>, in μ ± 2σ ≈ 95 %.`;
  }
  steuer.append(regler("μ", () => mu, v => mu = v, muMin, muMax, 0.5), regler("σ", () => sig, v => sig = Math.max(0.3, v), sMin, sMax, 0.5));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
