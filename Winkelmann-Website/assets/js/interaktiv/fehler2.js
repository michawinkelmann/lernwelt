// fehler2.js — Fehler 1. und 2. Art beim (rechtsseitigen) Binomial-Hypothesentest.
// H0: p=p0, H1: p=p1 (>p0). Ablehnung von H0, wenn X ≥ c. α=P(X≥c|p0), β=P(X<c|p1).
// params = { n:20, p0:0.5, p1Init:0.7, cInit:14 }
export function mount(container, params) {
  const p = params || {}; const n = p.n ?? 20, p0 = p.p0 ?? 0.5;
  let p1 = p.p1Init ?? 0.7, c = p.cInit ?? 14;
  const W = 340, H = 210, ML = 8, MR = 8, MT = 26, MB = 22, bw = (W - ML - MR) / (n + 1);
  const fmt = v => (Math.round(v * 10) / 10).toLocaleString("de-DE");
  function pmf(pp) { const a = []; let v = Math.pow(1 - pp, n); a[0] = v; for (let k = 1; k <= n; k++) { v = v * (n - k + 1) / k * pp / (1 - pp); a[k] = v; } return a; }
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:430px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:.98rem;min-height:3em";
  function zeichne() {
    const d0 = pmf(p0), d1 = pmf(p1), maxp = Math.max(...d0, ...d1);
    const sy = v => (H - MB) - v / maxp * (H - MT - MB);
    let s = "";
    for (let k = 0; k <= n; k++) { const x = ML + k * bw;
      s += `<rect x="${(x+1).toFixed(1)}" y="${sy(d1[k]).toFixed(1)}" width="${(bw-2).toFixed(1)}" height="${(sy(0)-sy(d1[k])).toFixed(1)}" fill="var(--fehler)" opacity="${k<c?0.55:0.15}"/>`; }
    for (let k = 0; k <= n; k++) { const x = ML + k * bw;
      s += `<rect x="${(x+1).toFixed(1)}" y="${sy(d0[k]).toFixed(1)}" width="${(bw-2).toFixed(1)}" height="${(sy(0)-sy(d0[k])).toFixed(1)}" fill="var(--akzent)" opacity="${k>=c?0.7:0.2}"/>`; }
    s += `<line x1="${ML}" y1="${sy(0)}" x2="${W-MR}" y2="${sy(0)}" stroke="var(--text)" stroke-width="1"/>`;
    const cx = ML + c * bw;
    s += `<line x1="${cx.toFixed(1)}" y1="${MT-6}" x2="${cx.toFixed(1)}" y2="${sy(0)}" stroke="var(--text)" stroke-width="1.5" stroke-dasharray="4 3"/>`;
    s += `<text x="${cx.toFixed(1)}" y="${MT-9}" text-anchor="middle" font-size="10" fill="var(--text)">c = ${c}</text>`;
    s += `<rect x="${ML}" y="2" width="10" height="9" fill="var(--akzent)" opacity="0.6"/><text x="${ML+13}" y="10" font-size="9" fill="var(--text-leise)">H₀ (p=${fmt(p0)})</text>`;
    s += `<rect x="${ML+96}" y="2" width="10" height="9" fill="var(--fehler)" opacity="0.5"/><text x="${ML+109}" y="10" font-size="9" fill="var(--text-leise)">H₁ (p=${fmt(p1)})</text>`;
    svg.innerHTML = s;
    const alpha = d0.reduce((a, v, k) => a + (k >= c ? v : 0), 0);
    const beta = d1.reduce((a, v, k) => a + (k < c ? v : 0), 0);
    out.innerHTML = `Ablehnen, wenn X ≥ c.<br>α = P(X ≥ ${c} | H₀) = <strong style="color:var(--akzent)">${fmt(alpha*100)} %</strong> (Fehler 1. Art) &nbsp;·&nbsp; β = P(X &lt; ${c} | H₁) = <strong style="color:var(--fehler)">${fmt(beta*100)} %</strong> (Fehler 2. Art)`;
  }
  function regler(label, min, max, step, val, set) { const l = document.createElement("label"); l.style.cssText = "white-space:nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = val; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const o = document.createElement("strong"); o.style.cssText = "display:inline-block;min-width:3ch;text-align:right;font-variant-numeric:tabular-nums"; o.textContent = fmt(val);
    i.addEventListener("input", () => { set(+i.value); o.textContent = fmt(+i.value); zeichne(); }); l.append(i, document.createTextNode(" "), o); return l; }
  steuer.append(regler("kritischer Wert c", 1, n, 1, c, v => c = v), regler("p₁ (H₁)", p0 + 0.05, 0.95, 0.05, p1, v => p1 = v));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
