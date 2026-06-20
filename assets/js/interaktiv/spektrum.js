// spektrum.js — Wasserstoff-Energieniveaus: Übergang wählen → Photon-Wellenlänge (Balmer-Serie, sichtbar).
// params = { nEnd:2, nStartInit:3 }
export function mount(container, params) {
  const p = params || {};
  const nu = p.nEnd ?? 2;
  let no = p.nStartInit ?? 3;
  const E = n => -13.6 / (n * n);
  const W = 300, H = 210, xL = 150, xR = 290, top = 16, bot = 180;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:380px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.textAlign = "center"; lab.append(document.createTextNode("Startniveau n: "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = nu + 1; inp.max = 6; inp.step = 1; inp.value = no; inp.setAttribute("aria-label", "Startniveau");
  const nv = document.createElement("strong"); nv.textContent = no; lab.append(inp, document.createTextNode(" "), nv);
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  // Energie -13.6..0 → y bot..top
  const ey = e => bot - (e - E(1)) / (0 - E(1)) * (bot - top);
  function farbe(l) { // sichtbare Näherung
    if (l < 400 || l > 700) return "#888";
    if (l < 450) return "#7a4fd0"; if (l < 490) return "#2c6fb0"; if (l < 560) return "#2a9d3a"; if (l < 590) return "#d4b800"; if (l < 635) return "#e07b00"; return "#c0392b";
  }
  function zeichne() {
    let s = "";
    for (let n = 1; n <= 6; n++) {
      const y = ey(E(n));
      s += `<line x1="${xL}" y1="${y}" x2="${xR}" y2="${y}" stroke="var(--text)" stroke-width="${n===nu?2:1}"/>`;
      s += `<text x="${xL-4}" y="${y+3}" text-anchor="end" font-size="9" fill="var(--text-leise)">n=${n}</text>`;
    }
    const yo = ey(E(no)), yu = ey(E(nu)), x = xL + 60;
    const dE = E(no) - E(nu), lam = 1240 / dE; // nm
    s += `<line x1="${x}" y1="${yo}" x2="${x}" y2="${yu}" stroke="${farbe(lam)}" stroke-width="2.4"/>`;
    s += `<polygon points="${x},${yu} ${x-4},${yu+8} ${x+4},${yu+8}" fill="${farbe(lam)}"/>`;
    // Farbbalken
    s += `<rect x="20" y="${top}" width="20" height="${bot-top}" fill="${farbe(lam)}" stroke="var(--linie)"/>`;
    s += `<text x="30" y="${bot+14}" text-anchor="middle" font-size="9" fill="var(--text-leise)">Linie</text>`;
    svg.innerHTML = s;
    const sicht = lam >= 380 && lam <= 750 ? "sichtbar" : (lam < 380 ? "ultraviolett" : "infrarot");
    out.innerHTML = `Übergang n=${no} → n=${nu}: ΔE = <strong>${(Math.round(dE*100)/100).toLocaleString("de-DE")} eV</strong> → λ = <strong>${Math.round(lam)} nm</strong> (${sicht})`;
  }
  inp.addEventListener("input", () => { no = +inp.value; nv.textContent = no; zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
