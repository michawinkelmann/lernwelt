// histogramm.js — Binomialverteilung: n und p einstellen → Säulendiagramm der P(X=k), mit μ und σ.
// params = { ninit:10, pinit:0.5, nmax:20 }
export function mount(container, params) {
  const p = params || {};
  let n = p.ninit ?? 10, pr = p.pinit ?? 0.5; const nmax = p.nmax || 20;
  const W = 340, H = 170, ML = 8, MB = 20;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function binom(n, k, p) {
    let c = 1; for (let i = 0; i < k; i++) c = c * (n - i) / (i + 1);
    return c * Math.pow(p, k) * Math.pow(1 - p, n - k);
  }
  function regler(label, get, set, min, max, step) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = get(); i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = (+get()).toLocaleString("de-DE");
    i.addEventListener("input", () => { set(+i.value); s.textContent = (+i.value).toLocaleString("de-DE"); zeichne(); });
    l.append(i, document.createTextNode(" "), s); return l;
  }
  function zeichne() {
    const probs = []; let pmax = 0;
    for (let k = 0; k <= n; k++) { const v = binom(n, k, pr); probs.push(v); if (v > pmax) pmax = v; }
    const bw = (W - ML - 6) / (n + 1);
    let s = `<line x1="${ML}" y1="${H-MB}" x2="${W-4}" y2="${H-MB}" stroke="var(--text)" stroke-width="1"/>`;
    probs.forEach((v, k) => {
      const h = pmax ? v / pmax * (H - MB - 10) : 0, x = ML + k * bw;
      s += `<rect x="${x+1}" y="${H-MB-h}" width="${bw-2}" height="${h}" fill="var(--akzent)" rx="1.5"/>`;
      if (n <= 20) s += `<text x="${x+bw/2}" y="${H-6}" text-anchor="middle" font-size="8" fill="var(--text-leise)">${k}</text>`;
    });
    const mu = n * pr;
    s += `<line x1="${ML+(mu+0.5)*bw}" y1="6" x2="${ML+(mu+0.5)*bw}" y2="${H-MB}" stroke="var(--fehler,#c33)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    svg.innerHTML = s;
    const sig = Math.sqrt(n * pr * (1 - pr)), f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
    out.innerHTML = `n = ${n}, p = ${f(pr)} <br> Erwartungswert μ = n·p = <strong>${f(mu)}</strong> <br> σ = <strong>${f(sig)}</strong>`;
  }
  steuer.append(regler("n", () => n, v => n = v, 1, nmax, 1), regler("p", () => pr, v => pr = v, 0.05, 0.95, 0.05));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
