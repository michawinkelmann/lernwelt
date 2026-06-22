// vektor2d.js — zwei Vektoren: Summe (Parallelogramm), Skalarprodukt und eingeschlossener Winkel.
// params = { ax:3, ay:1, bx:1, by:2, bereich:5 }
export function mount(container, params) {
  const p = params || {};
  const V = { ax: p.ax ?? 3, ay: p.ay ?? 1, bx: p.bx ?? 1, by: p.by ?? 2 };
  const R = p.bereich || 5, S = 240, C = S / 2, PX = (S / 2 - 12) / R;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${S} ${S}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:300px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.3rem 1rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1rem";
  const sx = x => C + x * PX, sy = y => C - y * PX;
  function pfeil(x, y, farbe, opacity) {
    const len = Math.hypot(x, y) || 1, ux = x / len, uy = y / len, hx = sx(x), hy = sy(y);
    const a1x = hx - 8 * ux - 4 * uy, a1y = hy + 8 * uy - 4 * ux, a2x = hx - 8 * ux + 4 * uy, a2y = hy + 8 * uy + 4 * ux;
    return `<line x1="${sx(0)}" y1="${sy(0)}" x2="${hx}" y2="${hy}" stroke="${farbe}" stroke-width="2.4" opacity="${opacity||1}"/>` +
           `<polygon points="${hx},${hy} ${a1x},${a1y} ${a2x},${a2y}" fill="${farbe}" opacity="${opacity||1}"/>`;
  }
  function regler(sym, label) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = -R; i.max = R; i.step = 1; i.value = V[sym]; i.style.width = "64px"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = V[sym];
    i.addEventListener("input", () => { V[sym] = +i.value; s.textContent = i.value; zeichne(); });
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
    // Parallelogramm-Hilfslinien zur Summe
    const sumx = V.ax + V.bx, sumy = V.ay + V.by;
    s += `<line x1="${sx(V.ax)}" y1="${sy(V.ay)}" x2="${sx(sumx)}" y2="${sy(sumy)}" stroke="var(--linie)" stroke-width="1" stroke-dasharray="3 2"/>`;
    s += `<line x1="${sx(V.bx)}" y1="${sy(V.by)}" x2="${sx(sumx)}" y2="${sy(sumy)}" stroke="var(--linie)" stroke-width="1" stroke-dasharray="3 2"/>`;
    s += pfeil(sumx, sumy, "var(--ok,#2a7)", 0.9);
    s += pfeil(V.ax, V.ay, "var(--akzent)");
    s += pfeil(V.bx, V.by, "var(--info,#2c6fb0)");
    svg.innerHTML = s;
    const dot = V.ax * V.bx + V.ay * V.by;
    const la = Math.hypot(V.ax, V.ay), lb = Math.hypot(V.bx, V.by);
    const f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
    let winkel = "—";
    if (la > 0 && lb > 0) { const cosw = Math.max(-1, Math.min(1, dot / (la * lb))); winkel = f(Math.acos(cosw) * 180 / Math.PI) + "°"; }
    out.innerHTML = p.nurSumme
      ? `a + b = (${f(V.ax+V.bx)} | ${f(V.ay+V.by)})`
      : `a + b = (${f(V.ax+V.bx)} | ${f(V.ay+V.by)}) <br> Skalarprodukt a·b = <strong>${f(dot)}</strong> <br> Winkel = <strong>${winkel}</strong>`;
  }
  steuer.append(regler("ax", "a.x"), regler("ay", "a.y"), regler("bx", "b.x"), regler("by", "b.y"));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
