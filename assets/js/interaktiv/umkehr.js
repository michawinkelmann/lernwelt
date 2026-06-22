// umkehr.js — eˣ und ln(x) als Umkehrfunktionen: Spiegelung an der Geraden y = x.
// Punkt (x | eˣ) auf eˣ und sein Spiegelpunkt (eˣ | x) auf ln zeigen: ln(eˣ) = x.
export function mount(container, params) {
  const W = 300, H = 300, M = 30, lo = -2, hi = 5;          // gleiche Skala für x und y
  const sx = v => M + (v - lo) / (hi - lo) * (W - 2 * M);
  const sy = v => (H - M) - (v - lo) / (hi - lo) * (H - 2 * M);
  const fmt = v => (Math.round(v * 100) / 100).toLocaleString("de-DE");
  let x = 1;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"); svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:320px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.cssText = "text-align:center;white-space:nowrap"; lab.append(document.createTextNode("x = "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = -1.5; inp.max = 1.6; inp.step = 0.1; inp.value = x; inp.style.verticalAlign = "middle"; inp.setAttribute("aria-label", "x");
  const xv = document.createElement("strong"); xv.style.cssText = "display:inline-block;min-width:3ch;text-align:right;font-variant-numeric:tabular-nums"; xv.textContent = fmt(x);
  lab.append(inp, document.createTextNode(" "), xv);
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.0rem;min-height:3em";
  function kurve(fn, x0, x1, farbe) { let pts = [], n = 120;
    for (let i = 0; i <= n; i++) { const t = x0 + (x1 - x0) * i / n, y = fn(t); if (isFinite(y) && y >= lo - 1 && y <= hi + 1) pts.push(`${sx(t).toFixed(1)},${sy(y).toFixed(1)}`); }
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="${farbe}" stroke-width="2.2"/>`; }
  function zeichne() {
    let s = "";
    for (let g = -2; g <= 5; g++) { s += `<line x1="${sx(g)}" y1="${M}" x2="${sx(g)}" y2="${H-M}" stroke="var(--linie)" stroke-width="0.5" opacity="0.3"/><line x1="${M}" y1="${sy(g)}" x2="${W-M}" y2="${sy(g)}" stroke="var(--linie)" stroke-width="0.5" opacity="0.3"/>`; }
    s += `<line x1="${M}" y1="${sy(0)}" x2="${W-M}" y2="${sy(0)}" stroke="var(--text)" stroke-width="1"/><line x1="${sx(0)}" y1="${M}" x2="${sx(0)}" y2="${H-M}" stroke="var(--text)" stroke-width="1"/>`;
    s += `<line x1="${sx(lo)}" y1="${sy(lo)}" x2="${sx(hi)}" y2="${sy(hi)}" stroke="var(--text-leise)" stroke-width="1.2" stroke-dasharray="5 4"/>`;
    s += `<text x="${sx(hi)-2}" y="${sy(hi)+12}" text-anchor="end" font-size="10" fill="var(--text-leise)">y = x</text>`;
    s += kurve(Math.exp, lo, 1.65, "var(--akzent)");                  // eˣ
    s += kurve(Math.log, 0.05, hi, "var(--ok)");                       // ln
    s += `<text x="${sx(1.2)}" y="${sy(Math.exp(1.2))}" font-size="11" fill="var(--akzent)">eˣ</text>`;
    s += `<text x="${sx(3.8)}" y="${sy(Math.log(3.8))-4}" font-size="11" fill="var(--ok)">ln x</text>`;
    const ex = Math.exp(x);
    if (ex <= hi) { s += `<circle cx="${sx(x)}" cy="${sy(ex)}" r="4" fill="var(--akzent)"/><circle cx="${sx(ex)}" cy="${sy(x)}" r="4" fill="var(--ok)"/>`;
      s += `<line x1="${sx(x)}" y1="${sy(ex)}" x2="${sx(ex)}" y2="${sy(x)}" stroke="var(--text-leise)" stroke-width="0.8" stroke-dasharray="2 2"/>`; }
    svg.innerHTML = s;
    out.innerHTML = `Punkt auf eˣ: (${fmt(x)} | ${fmt(ex)}) — Spiegelpunkt auf ln: (${fmt(ex)} | ${fmt(x)}).<br><span style="color:var(--text-leise);font-size:.93em">eˣ und ln sind Umkehrfunktionen (Spiegelung an y = x): ln(eˣ) = ${fmt(x)}.</span>`;
  }
  inp.addEventListener("input", () => { x = +inp.value; xv.textContent = fmt(x); zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
