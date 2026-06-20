// wurfparabel.js — schiefer Wurf: Startgeschwindigkeit v0 und Winkel α → Bahnkurve, Wurfweite, Höhe.
// params = { v0init:12, alphainit:45, g:9.81, vmax:25 }
export function mount(container, params) {
  const p = params || {}, g = p.g || 9.81, vmax = p.vmax || 25;
  let v0 = p.v0init || 12, al = p.alphainit || 45;
  const W = 340, H = 200, ML = 24, MB = 22;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function regler(label, get, set, min, max, step, einh) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = get(); i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = get();
    i.addEventListener("input", () => { set(+i.value); s.textContent = i.value; zeichne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(" " + einh)); return l;
  }
  function zeichne() {
    const rad = al * Math.PI / 180, vx = v0 * Math.cos(rad), vy = v0 * Math.sin(rad);
    const weite = 2 * vx * vy / g, hmax = vy * vy / (2 * g);
    const xMax = vmax * vmax / g, yMax = vmax * vmax / (2 * g);
    const sx = x => ML + x / xMax * (W - ML - 8), sy = y => (H - MB) - y / yMax * (H - MB - 8);
    let pts = []; const T = 2 * vy / g;
    for (let i = 0; i <= 60; i++) { const t = T * i / 60; pts.push(`${sx(vx*t).toFixed(1)},${sy(vy*t-0.5*g*t*t).toFixed(1)}`); }
    let s = `<line x1="${ML}" y1="${H-MB}" x2="${W-4}" y2="${H-MB}" stroke="var(--text)" stroke-width="1"/>`;
    s += `<line x1="${ML}" y1="8" x2="${ML}" y2="${H-MB}" stroke="var(--text)" stroke-width="1"/>`;
    s += `<polyline points="${pts.join(" ")}" fill="none" stroke="var(--akzent)" stroke-width="2.4"/>`;
    s += `<circle cx="${ML}" cy="${H-MB}" r="3" fill="var(--text)"/>`;
    s += `<text x="${W-6}" y="${H-8}" text-anchor="end" font-size="10" fill="var(--text-leise)">x</text>`;
    svg.innerHTML = s;
    const f = x => (Math.round(x * 10) / 10).toLocaleString("de-DE");
    out.innerHTML = `v₀ = ${v0} m/s, α = ${al}° → Wurfweite <strong>${f(weite)} m</strong>, max. Höhe <strong>${f(hmax)} m</strong>. (Maximale Weite bei 45°.)`;
  }
  steuer.append(regler("v₀", () => v0, v => v0 = v, 4, vmax, 1, "m/s"), regler("Winkel α", () => al, v => al = v, 10, 80, 5, "°"));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
