// matrixabb.js — 2×2-Matrix als Abbildung: Einheitsquadrat → Bild, mit Determinante (Flächenfaktor).
// params = { a:1,b:0,c:0,d:1, bereich:4 }
export function mount(container, params) {
  const p = params || {};
  const M = { a: p.a ?? 1, b: p.b ?? 0, c: p.c ?? 0, d: p.d ?? 1 };
  const R = p.bereich || 4, S = 240, C = S / 2, PX = (S / 2 - 14) / R;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${S} ${S}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:300px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.3rem 1.1rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  const sx = x => C + x * PX, sy = y => C - y * PX;
  function regler(sym, label) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = -3; i.max = 3; i.step = 0.5; i.value = M[sym]; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = M[sym].toLocaleString("de-DE");
    i.addEventListener("input", () => { M[sym] = +i.value; s.textContent = M[sym].toLocaleString("de-DE"); zeichne(); });
    l.append(i, document.createTextNode(" "), s); return l;
  }
  function zeichne() {
    let s = "";
    for (let g = -R; g <= R; g++) {
      s += `<line x1="${sx(g)}" y1="${sy(-R)}" x2="${sx(g)}" y2="${sy(R)}" stroke="var(--linie)" stroke-width="0.5" opacity="0.4"/>`;
      s += `<line x1="${sx(-R)}" y1="${sy(g)}" x2="${sx(R)}" y2="${sy(g)}" stroke="var(--linie)" stroke-width="0.5" opacity="0.4"/>`;
    }
    s += `<line x1="${sx(-R)}" y1="${sy(0)}" x2="${sx(R)}" y2="${sy(0)}" stroke="var(--text)" stroke-width="1"/>`;
    s += `<line x1="${sx(0)}" y1="${sy(-R)}" x2="${sx(0)}" y2="${sy(R)}" stroke="var(--text)" stroke-width="1"/>`;
    // Originaleinheitsquadrat
    s += `<polygon points="${sx(0)},${sy(0)} ${sx(1)},${sy(0)} ${sx(1)},${sy(1)} ${sx(0)},${sy(1)}" fill="none" stroke="var(--text-leise)" stroke-width="1.2" stroke-dasharray="3 2"/>`;
    // Bild: Ecken (0,0),(a,c),(a+b,c+d),(b,d)
    const P = [[0,0],[M.a,M.c],[M.a+M.b,M.c+M.d],[M.b,M.d]];
    s += `<polygon points="${P.map(([x,y])=>sx(x)+","+sy(y)).join(" ")}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.2"/>`;
    // Basisvektoren-Bilder
    s += `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(M.a)}" y2="${sy(M.c)}" stroke="var(--akzent)" stroke-width="2"/>`;
    s += `<line x1="${sx(0)}" y1="${sy(0)}" x2="${sx(M.b)}" y2="${sy(M.d)}" stroke="var(--akzent)" stroke-width="2" opacity="0.6"/>`;
    svg.innerHTML = s;
    const det = M.a * M.d - M.b * M.c, f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
    out.innerHTML = `Matrix [[${f(M.a)}, ${f(M.b)}], [${f(M.c)}, ${f(M.d)}]] <br> Determinante = a·d − b·c = <strong>${f(det)}</strong> (Flächenfaktor)`;
  }
  steuer.append(regler("a", "a"), regler("b", "b"), regler("c", "c"), regler("d", "d"));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
