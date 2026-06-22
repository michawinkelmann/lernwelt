// zahlbereiche.js — Die reellen Zahlen am Zahlenstrahl: rationale (ganze Zahlen, Brüche)
// und irrationale Zahlen (√2, π). Regler wählt ein Beispiel und erklärt seinen Zahlbereich.
export function mount(container, params) {
  const bsp = [
    { w: -3, lab: "−3", art: "rational", txt: "−3 ist eine ganze Zahl (ℤ) — und damit auch rational (ℚ)." },
    { w: -Math.sqrt(3), lab: "−√3", art: "irrational", txt: "−√3 ≈ −1,732… lässt sich nicht als Bruch schreiben — irrational." },
    { w: -1.5, lab: "−3/2", art: "rational", txt: "−1,5 = −3/2 ist ein Bruch — rational (ℚ)." },
    { w: 0.5, lab: "1/2", art: "rational", txt: "0,5 = 1/2 ist ein Bruch — rational (ℚ)." },
    { w: Math.SQRT2, lab: "√2", art: "irrational", txt: "√2 ≈ 1,414… ist nicht als Bruch darstellbar — irrational." },
    { w: 2.75, lab: "11/4", art: "rational", txt: "2,75 = 11/4 ist ein Bruch — rational (ℚ)." },
    { w: Math.PI, lab: "π", art: "irrational", txt: "π ≈ 3,142… ist irrational (unendlich, nicht periodisch)." }
  ];
  let idx = 4;
  const W = 360, H = 132, ML = 22, MR = 18, yA = 70, AX = 4;
  const sx = v => ML + (v + AX) / (2 * AX) * (W - ML - MR);
  const farbe = art => art === "rational" ? "var(--akzent)" : "var(--ok)";
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.cssText = "text-align:center;white-space:nowrap";
  lab.append(document.createTextNode("Beispiel wählen: "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = 0; inp.max = bsp.length - 1; inp.step = 1; inp.value = idx;
  inp.setAttribute("aria-label", "Beispielzahl"); inp.style.verticalAlign = "middle";
  lab.append(inp);
  const out = document.createElement("p"); out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.04rem;min-height:3.4em";
  function zeichne() {
    let s = `<line x1="${ML}" y1="${yA}" x2="${W - MR}" y2="${yA}" stroke="var(--text)" stroke-width="1.5"/>`;
    s += `<polygon points="${W - MR},${yA} ${W - MR - 8},${yA - 4} ${W - MR - 8},${yA + 4}" fill="var(--text)"/>`;
    for (let t = -AX; t <= AX; t++) { const x = sx(t);
      s += `<line x1="${x}" y1="${yA - 4}" x2="${x}" y2="${yA + 4}" stroke="var(--text)" stroke-width="1"/>`;
      s += `<text x="${x}" y="${yA + 17}" text-anchor="middle" font-size="10" fill="var(--text-leise)">${t}</text>`;
    }
    bsp.forEach((b, i) => { const x = sx(b.w), sel = i === idx;
      s += `<circle cx="${x.toFixed(1)}" cy="${yA}" r="${sel ? 5.5 : 3.5}" fill="${farbe(b.art)}" opacity="${sel ? 1 : 0.4}"/>`;
      if (sel) {
        s += `<line x1="${x.toFixed(1)}" y1="${yA - 22}" x2="${x.toFixed(1)}" y2="${yA - 6}" stroke="${farbe(b.art)}" stroke-width="2"/>`;
        s += `<text x="${x.toFixed(1)}" y="${yA - 26}" text-anchor="middle" font-size="12" font-weight="bold" fill="${farbe(b.art)}">${b.lab}</text>`;
      }
    });
    s += `<circle cx="${ML + 6}" cy="16" r="4" fill="var(--akzent)"/><text x="${ML + 14}" y="20" font-size="10" fill="var(--text-leise)">rational (ℚ)</text>`;
    s += `<circle cx="${ML + 116}" cy="16" r="4" fill="var(--ok)"/><text x="${ML + 124}" y="20" font-size="10" fill="var(--text-leise)">irrational</text>`;
    svg.innerHTML = s;
    const b = bsp[idx];
    out.innerHTML = `<strong>${b.lab}</strong> — <strong>${b.art}</strong><br>` +
      `<span style="color:var(--text-leise);font-size:.93em">${b.txt}</span><br>` +
      `<span style="color:var(--text-leise);font-size:.93em">Rationale und irrationale Zahlen zusammen bilden die reellen Zahlen ℝ.</span>`;
  }
  inp.addEventListener("input", () => { idx = +inp.value; zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
