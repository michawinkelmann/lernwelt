// welle.js — Überlagerung zweier Wellen: Phasendifferenz einstellen → konstruktive/destruktive Interferenz.
// params = { phiInit:0 }
export function mount(container, params) {
  const p = params || {};
  let phi = p.phiInit ?? 0;
  const W = 340, H = 160, MB = 8, cy = H / 2, A = 38, perioden = 2;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:440px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.textAlign = "center"; lab.append(document.createTextNode("Phasendifferenz φ: "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = 0; inp.max = 360; inp.step = 15; inp.value = phi; inp.setAttribute("aria-label", "Phasendifferenz");
  const pv = document.createElement("strong"); pv.textContent = phi; lab.append(inp, document.createTextNode(" "), pv, document.createTextNode(" °"));
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  function kurve(fn, farbe, sw, op) {
    let pts = [];
    for (let i = 0; i <= 200; i++) { const x = i / 200 * W, t = i / 200 * perioden * 2 * Math.PI; pts.push(`${x.toFixed(1)},${(cy - fn(t)).toFixed(1)}`); }
    return `<polyline points="${pts.join(" ")}" fill="none" stroke="${farbe}" stroke-width="${sw}" opacity="${op||1}"/>`;
  }
  function zeichne() {
    const r = phi * Math.PI / 180;
    let s = `<line x1="0" y1="${cy}" x2="${W}" y2="${cy}" stroke="var(--linie)" stroke-width="1"/>`;
    s += kurve(t => A * Math.sin(t), "var(--info,#2c6fb0)", 1.4, 0.6);
    s += kurve(t => A * Math.sin(t - r), "var(--ok,#2a7)", 1.4, 0.6);
    s += kurve(t => A * Math.sin(t) + A * Math.sin(t - r), "var(--akzent)", 2.6, 1);
    svg.innerHTML = s;
    const amp = Math.abs(2 * Math.cos(r / 2));
    let art = amp > 1.8 ? "nahezu <strong>konstruktiv</strong> (Wellen verstärken sich)" : amp < 0.3 ? "nahezu <strong>destruktiv</strong> (Wellen löschen sich aus)" : "teilweise Überlagerung";
    out.innerHTML = `φ = ${phi}° → Amplitude der Summe = 2·A·|cos(φ/2)| = <strong>${(Math.round(amp*100)/100).toLocaleString("de-DE")}·A</strong><br>${art}`;
  }
  inp.addEventListener("input", () => { phi = +inp.value; pv.textContent = phi; zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
