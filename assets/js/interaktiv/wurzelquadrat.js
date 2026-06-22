// wurzelquadrat.js — Quadratwurzel als Umkehrung des Quadrierens.
// Ein Quadrat mit Seitenlänge n hat den Flächeninhalt A = n². Die Quadratwurzel
// macht das rückgängig: √A = n. Regler: Seitenlänge n (≥ 0). Zeigt damit das
// Lernziel „√ ist die Umkehrung des Quadrierens, √a ≥ 0, nur für a ≥ 0".
// params = { nmax:12, ninit:4, einheit:"" }
export function mount(container, params) {
  const p = params || {};
  const nmax = p.nmax || 12;
  const E = p.einheit ? " " + p.einheit : "";
  let n = (p.ninit != null) ? p.ninit : 4;
  const W = 260, H = 210, M = 30, S = 150;            // Zeichenmaße (Pixel-Seite max = S)
  const fmt = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");

  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:300px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";

  const lab = document.createElement("label");
  lab.style.cssText = "text-align:center;white-space:nowrap";
  lab.append(document.createTextNode("Seitenlänge n: "));
  const inp = document.createElement("input");
  inp.type = "range"; inp.min = 0; inp.max = nmax; inp.step = 0.5; inp.value = n;
  inp.setAttribute("aria-label", "Seitenlänge n"); inp.style.verticalAlign = "middle";
  const nv = document.createElement("strong");
  nv.style.cssText = "display:inline-block;min-width:3ch;text-align:right;font-variant-numeric:tabular-nums";
  nv.textContent = fmt(n);
  lab.append(inp, document.createTextNode(" "), nv, document.createTextNode(E));

  const out = document.createElement("p");
  out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.04rem;min-height:3.8em";

  function zeichne() {
    const A = n * n;
    const seite = nmax > 0 ? (n / nmax) * S : 0;
    const x0 = M, y0 = H - M;                          // linke untere Ecke
    let s = "";
    if (seite > 0.5) {
      s += `<rect x="${x0}" y="${(y0 - seite).toFixed(1)}" width="${seite.toFixed(1)}" height="${seite.toFixed(1)}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
      s += `<text x="${x0 + seite / 2}" y="${y0 + 16}" text-anchor="middle" font-size="12" fill="var(--text)">n = ${fmt(n)}${E}</text>`;
      if (seite > 44) s += `<text x="${x0 + seite / 2}" y="${y0 - seite / 2}" text-anchor="middle" dominant-baseline="middle" font-size="12" fill="var(--akzent)">A = ${fmt(A)}</text>`;
    } else {
      s += `<text x="${x0}" y="${y0}" font-size="12" fill="var(--text-leise)">n = 0  →  A = 0</text>`;
    }
    svg.innerHTML = s;
    out.innerHTML =
      `Quadrieren: n² = ${fmt(n)}² = <strong>${fmt(A)}</strong><br>` +
      `Wurzelziehen (Umkehrung): √${fmt(A)} = <strong>${fmt(n)}</strong><br>` +
      `<span style="color:var(--text-leise);font-size:.92em">√ ist nur für Zahlen ≥ 0 erklärt und liefert nie ein negatives Ergebnis.</span>`;
  }

  inp.addEventListener("input", () => { n = +inp.value; nv.textContent = fmt(n); zeichne(); });
  wrap.append(svg, lab, out);
  container.append(wrap);
  zeichne();
}
