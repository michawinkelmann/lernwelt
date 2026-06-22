// normalparabel.js — die Normalparabel f(x)=x². Regler bewegt einen Punkt (x, x²) auf der
// Kurve; der Spiegelpunkt (−x, x²) zeigt die Achsensymmetrie. Die Funktion bleibt fest.
// params = { xmax:4 }
export function mount(container, params) {
  const p = params || {}; const xmax = p.xmax || 4;
  let x = 2;
  const W = 300, H = 260, ML = 36, MR = 14, MT = 14, MB = 28, ymax = xmax * xmax;
  const sx = vx => ML + (vx + xmax) / (2 * xmax) * (W - ML - MR);
  const sy = vy => (H - MB) - vy / ymax * (H - MT - MB);
  const fmt = v => (Math.round(v * 100) / 100).toLocaleString("de-DE");
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:320px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.cssText = "text-align:center;white-space:nowrap";
  lab.append(document.createTextNode("x = "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = -xmax; inp.max = xmax; inp.step = 0.5; inp.value = x;
  inp.setAttribute("aria-label", "x-Wert"); inp.style.verticalAlign = "middle";
  const xv = document.createElement("strong"); xv.style.cssText = "display:inline-block;min-width:3ch;text-align:right;font-variant-numeric:tabular-nums"; xv.textContent = fmt(x);
  lab.append(inp, document.createTextNode(" "), xv);
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.04rem;min-height:2.8em";
  function zeichne() {
    const gy = ymax <= 16 ? 2 : 4;
    let s = "";
    for (let vx = -xmax; vx <= xmax; vx += 1) { const X = sx(vx);
      s += `<line x1="${X}" y1="${MT}" x2="${X}" y2="${H - MB}" stroke="var(--linie)" stroke-width="0.5" opacity="0.4"/>`;
      if (vx !== 0) s += `<text x="${X}" y="${H - MB + 12}" text-anchor="middle" font-size="9" fill="var(--text-leise)">${vx}</text>`;
    }
    for (let vy = 0; vy <= ymax; vy += gy) { const Y = sy(vy);
      s += `<line x1="${ML}" y1="${Y}" x2="${W - MR}" y2="${Y}" stroke="var(--linie)" stroke-width="0.5" opacity="0.4"/>`;
      s += `<text x="${ML - 4}" y="${Y + 3}" text-anchor="end" font-size="9" fill="var(--text-leise)">${vy}</text>`;
    }
    s += `<line x1="${sx(0)}" y1="${MT}" x2="${sx(0)}" y2="${H - MB}" stroke="var(--text)" stroke-width="1.2"/>`;
    s += `<line x1="${ML}" y1="${H - MB}" x2="${W - MR}" y2="${H - MB}" stroke="var(--text)" stroke-width="1.2"/>`;
    s += `<text x="${W - MR}" y="${H - MB - 5}" text-anchor="end" font-size="10" fill="var(--text-leise)">x</text>`;
    s += `<text x="${sx(0) + 5}" y="${MT + 9}" font-size="10" fill="var(--text-leise)">y</text>`;
    let pts = []; for (let i = 0; i <= 120; i++) { const vx = -xmax + 2 * xmax * i / 120; pts.push(`${sx(vx).toFixed(1)},${sy(vx * vx).toFixed(1)}`); }
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--akzent)" stroke-width="2.4"/>`;
    const y = x * x;
    s += `<circle cx="${sx(-x).toFixed(1)}" cy="${sy(y).toFixed(1)}" r="3.5" fill="none" stroke="var(--akzent)" stroke-width="1.5"/>`;
    s += `<circle cx="${sx(x).toFixed(1)}" cy="${sy(y).toFixed(1)}" r="5" fill="var(--akzent)"/>`;
    const lblY = (sy(y) - 8 < MT + 8) ? sy(y) + 16 : sy(y) - 8;
    s += `<text x="${sx(x).toFixed(1)}" y="${lblY.toFixed(1)}" text-anchor="middle" font-size="11" fill="var(--akzent)" font-weight="bold">(${fmt(x)} | ${fmt(y)})</text>`;
    svg.innerHTML = s;
    const xq = x < 0 ? `(${fmt(x)})` : fmt(x);
    const symm = x === 0 ? "Tiefster Punkt (Scheitel): (0 | 0)"
      : `Achsensymmetrie: f(−${fmt(Math.abs(x))}) = f(${fmt(Math.abs(x))}) = ${fmt(y)}`;
    out.innerHTML = `f(x) = x²  →  f(${fmt(x)}) = ${xq}² = <strong>${fmt(y)}</strong><br><span style="color:var(--text-leise);font-size:.95em">${symm}</span>`;
  }
  inp.addEventListener("input", () => { x = +inp.value; xv.textContent = fmt(x); zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
