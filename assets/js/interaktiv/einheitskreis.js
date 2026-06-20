// einheitskreis.js — Winkel am Einheitskreis → sin und cos ablesen.
// params = { }  (Winkel 0..360°)
export function mount(container, params) {
  let w = (params && params.init) || 30;
  const C = 110, R = 80, S = 2 * C + 40;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${S} ${S}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:300px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const inp = document.createElement("input"); inp.type = "range"; inp.min = 0; inp.max = 360; inp.step = 5; inp.value = w;
  inp.style.cssText = "width:100%;max-width:300px;display:block;margin:0 auto"; inp.setAttribute("aria-label", "Winkel");
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.05rem";
  const cx = 20 + C, cy = 20 + C;
  function zeichne() {
    const r = w * Math.PI / 180, px = cx + R * Math.cos(r), py = cy - R * Math.sin(r);
    let s = `<line x1="20" y1="${cy}" x2="${S-20}" y2="${cy}" stroke="var(--linie)"/><line x1="${cx}" y1="20" x2="${cx}" y2="${S-20}" stroke="var(--linie)"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="var(--text)" stroke-width="1.2"/>`;
    s += `<line x1="${px}" y1="${py}" x2="${px}" y2="${cy}" stroke="var(--mathe,#1d6)" stroke-width="2" stroke-dasharray="3 2"/>`;
    s += `<line x1="${cx}" y1="${py}" x2="${px}" y2="${py}" stroke="var(--akzent)" stroke-width="2" stroke-dasharray="3 2"/>`;
    s += `<line x1="${cx}" y1="${cy}" x2="${px}" y2="${py}" stroke="var(--akzent)" stroke-width="2.4"/>`;
    s += `<circle cx="${px}" cy="${py}" r="5" fill="var(--akzent)"/>`;
    svg.innerHTML = s;
    out.innerHTML = `Winkel <strong>${w}°</strong> <br> cos ${w}° = <strong>${(Math.round(Math.cos(r)*100)/100).toLocaleString("de-DE")}</strong> <br> sin ${w}° = <strong>${(Math.round(Math.sin(r)*100)/100).toLocaleString("de-DE")}</strong>`;
  }
  inp.addEventListener("input", () => { w = +inp.value; zeichne(); });
  wrap.append(svg, inp, out); container.append(wrap); zeichne();
}
