// wurzelstrahl.js — Quadratwurzel auf dem Zahlenstrahl. Regler für die Zahl unter der
// Wurzel (Radikand a), Marke bei √a. Quadratzahlen → ganzzahlig/rational, sonst irrational.
// params = { amin:1, amax:17, ainit:2 }
export function mount(container, params) {
  const p = params || {};
  const amin = p.amin ?? 1, amax = p.amax ?? 17;
  let a = p.ainit ?? 2;
  const W = 340, H = 120, ML = 26, MR = 18, yA = 74;
  const achsMax = Math.ceil(Math.sqrt(amax) + 0.001);
  const sx = v => ML + v / achsMax * (W - ML - MR);
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:420px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.cssText = "text-align:center;white-space:nowrap";
  lab.append(document.createTextNode("Zahl unter der Wurzel a: "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = amin; inp.max = amax; inp.step = 1; inp.value = a;
  inp.setAttribute("aria-label", "Radikand a"); inp.style.verticalAlign = "middle";
  const av = document.createElement("strong"); av.style.cssText = "display:inline-block;min-width:2.5ch;text-align:right;font-variant-numeric:tabular-nums"; av.textContent = a;
  lab.append(inp, document.createTextNode(" "), av);
  const out = document.createElement("p"); out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.04rem;min-height:3.2em";
  function zeichne() {
    const w = Math.sqrt(a), ganz = Number.isInteger(w);
    let s = `<line x1="${ML}" y1="${yA}" x2="${W - MR}" y2="${yA}" stroke="var(--text)" stroke-width="1.5"/>`;
    s += `<polygon points="${W - MR},${yA} ${W - MR - 8},${yA - 4} ${W - MR - 8},${yA + 4}" fill="var(--text)"/>`;
    for (let t = 0; t <= achsMax; t++) { const x = sx(t);
      s += `<line x1="${x}" y1="${yA - 5}" x2="${x}" y2="${yA + 5}" stroke="var(--text)" stroke-width="1"/>`;
      s += `<text x="${x}" y="${yA + 18}" text-anchor="middle" font-size="11" fill="var(--text-leise)">${t}</text>`;
    }
    const xm = sx(w);
    s += `<line x1="${xm.toFixed(1)}" y1="${yA - 28}" x2="${xm.toFixed(1)}" y2="${yA + 5}" stroke="var(--akzent)" stroke-width="2"/>`;
    s += `<circle cx="${xm.toFixed(1)}" cy="${yA}" r="4.5" fill="var(--akzent)"/>`;
    s += `<text x="${xm.toFixed(1)}" y="${yA - 32}" text-anchor="middle" font-size="12" fill="var(--akzent)" font-weight="bold">√${a}</text>`;
    svg.innerHTML = s;
    if (ganz) {
      out.innerHTML = `√${a} = <strong>${w}</strong><br><span style="color:var(--text-leise);font-size:.95em">${a} ist eine Quadratzahl → √${a} ist <strong>rational</strong> (eine ganze Zahl).</span>`;
    } else {
      const dez = w.toFixed(8).replace(".", ",");
      out.innerHTML = `√${a} ≈ <strong>${dez}…</strong><br><span style="color:var(--text-leise);font-size:.95em">${a} ist keine Quadratzahl → √${a} ist <strong>irrational</strong> (unendlich, nicht periodisch).</span>`;
    }
  }
  inp.addEventListener("input", () => { a = +inp.value; av.textContent = a; zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
