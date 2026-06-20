// markov.js — Übergangsgraph (Markow-Kette): Verteilung schrittweise iterieren (v' = M·v) bis zum Fixvektor.
// Konvention: spaltenstochastische Matrix, matrix[i][j] = Wahrscheinlichkeit von Zustand j NACH Zustand i (Spaltensumme = 1).
// params = { zustaende:["A","B"], matrix:[[0.8,0.3],[0.2,0.7]], start:[1,0], titel? }
export function mount(container, params) {
  const p = params || {};
  const Z = p.zustaende || ["A", "B"];
  const n = Z.length;
  let M = p.matrix || [[0.8, 0.3], [0.2, 0.7]];
  // Spalten normalisieren (Sicherheit)
  for (let j = 0; j < n; j++) { let s = 0; for (let i = 0; i < n; i++) s += M[i][j]; if (s > 0) for (let i = 0; i < n; i++) M[i][j] /= s; }
  const start = (p.start && p.start.length === n) ? p.start.slice() : Z.map((_, i) => i === 0 ? 1 : 0);
  let v = start.slice(), schritt = 0;
  // Fixvektor durch Iteration aus Gleichverteilung
  function mul(mat, vec) { return vec.map((_, i) => mat[i].reduce((a, mij, j) => a + mij * vec[j], 0)); }
  let fix = Z.map(() => 1 / n); for (let t = 0; t < 600; t++) fix = mul(M, fix);

  const W = 320, Hg = 150, cx = 160, cy = 78, RR = n === 2 ? 0 : 52, r = 24;
  const pos = n === 2 ? [{ x: 70, y: cy }, { x: 250, y: cy }]
    : Z.map((_, k) => { const a = -Math.PI / 2 + k * 2 * Math.PI / n; return { x: cx + RR * Math.cos(a), y: cy + 8 + RR * Math.sin(a) }; });
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${Hg + 78}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:420px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.5rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  const f = x => (Math.round(x * 1000) / 1000).toLocaleString("de-DE");
  const f2 = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");

  function graph() {
    let s = "";
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const pij = M[i][j]; if (pij < 0.001) continue;
      if (i === j) { // Selbstschleife nach außen
        const a = pos[i], dirx = a.x - cx || (n === 2 ? (i === 0 ? -1 : 1) : 0), diry = a.y - cy - 8 || -1;
        const dl = Math.hypot(dirx, diry) || 1, ux = dirx / dl, uy = diry / dl;
        const lx = a.x + ux * r, ly = a.y + uy * r;
        s += `<path d="M ${a.x + ux*r - uy*7} ${a.y + uy*r + ux*7} Q ${lx + ux*26} ${ly + uy*26} ${a.x + ux*r + uy*7} ${a.y + uy*r - ux*7}" fill="none" stroke="var(--text-leise)" stroke-width="1.4"/>`;
        s += `<text x="${lx + ux*30}" y="${ly + uy*30 + 3}" text-anchor="middle" font-size="10" fill="var(--text-leise)">${f2(pij)}</text>`;
      } else { // Bogen j -> i
        const a = pos[j], b = pos[i], mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y, dl = Math.hypot(dx, dy) || 1, nx = -dy / dl, ny = dx / dl;
        const bow = 26, ccx = mx + nx * bow, ccy = my + ny * bow;   // Kontrollpunkt seitlich
        const sx = a.x + (b.x - a.x) * r / dl, sy = a.y + (b.y - a.y) * r / dl;
        const ex = b.x - (b.x - a.x) * r / dl, ey = b.y - (b.y - a.y) * r / dl;
        s += `<path d="M ${sx.toFixed(1)} ${sy.toFixed(1)} Q ${ccx.toFixed(1)} ${ccy.toFixed(1)} ${ex.toFixed(1)} ${ey.toFixed(1)}" fill="none" stroke="var(--text-leise)" stroke-width="1.4"/>`;
        // Pfeilspitze bei (ex,ey) Richtung Kontrollpunkt
        const tx = ex - ccx, ty = ey - ccy, tl = Math.hypot(tx, ty) || 1, tux = tx / tl, tuy = ty / tl;
        s += `<polygon points="${ex},${ey} ${ex-7*tux-3.5*tuy},${ey-7*tuy+3.5*tux} ${ex-7*tux+3.5*tuy},${ey-7*tuy-3.5*tux}" fill="var(--text-leise)"/>`;
        s += `<text x="${(ccx+mx)/2}" y="${(ccy+my)/2 + 3}" text-anchor="middle" font-size="10" fill="var(--text-leise)">${f2(pij)}</text>`;
      }
    }
    for (let i = 0; i < n; i++) {
      s += `<circle cx="${pos[i].x}" cy="${pos[i].y}" r="${r}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2"/>`;
      s += `<text x="${pos[i].x}" y="${pos[i].y + 4}" text-anchor="middle" font-size="12" fill="var(--text)">${Z[i]}</text>`;
    }
    return s;
  }
  function balken() {
    const bx = 30, bw = (W - 60) / n, base = Hg + 56, maxh = 48;
    let s = `<line x1="20" y1="${base}" x2="${W-20}" y2="${base}" stroke="var(--text)" stroke-width="1"/>`;
    for (let i = 0; i < n; i++) {
      const x = bx + i * bw, h = v[i] * maxh, fh = fix[i] * maxh;
      s += `<rect x="${x}" y="${base-h}" width="${bw-18}" height="${h}" fill="var(--akzent)" rx="2"/>`;
      s += `<line x1="${x-2}" y1="${base-fh}" x2="${x+bw-16}" y2="${base-fh}" stroke="var(--fehler,#c0392b)" stroke-width="1.2" stroke-dasharray="3 2"/>`;
      s += `<text x="${x+(bw-18)/2}" y="${base+12}" text-anchor="middle" font-size="10" fill="var(--text-leise)">${Z[i]}</text>`;
      s += `<text x="${x+(bw-18)/2}" y="${base-h-3}" text-anchor="middle" font-size="9" fill="var(--text)">${f2(v[i])}</text>`;
    }
    s += `<text x="${W-22}" y="${Hg+18}" text-anchor="end" font-size="9" fill="var(--fehler,#c0392b)">– – Fixvektor</text>`;
    return s;
  }
  function zeichne() {
    svg.innerHTML = graph() + balken();
    out.innerHTML = `Schritt n = <strong>${schritt}</strong><br>Verteilung (${Z.join(", ")}) = (${v.map(f).join("; ")})<br>Grenzverteilung (Fixvektor) ≈ (${fix.map(f2).join("; ")})`;
  }
  function knopf(txt, fn) { const b = document.createElement("button"); b.type = "button"; b.className = "knopf klein"; b.textContent = txt; b.addEventListener("click", fn); return b; }
  steuer.append(
    knopf("1 Schritt ▶", () => { v = mul(M, v); schritt++; zeichne(); }),
    knopf("10 Schritte ⏩", () => { for (let t = 0; t < 10; t++) v = mul(M, v); schritt += 10; zeichne(); }),
    knopf("Reset", () => { v = start.slice(); schritt = 0; zeichne(); })
  );
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
