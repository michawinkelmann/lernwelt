// flaeche.js — Flächen von Dreieck / Parallelogramm / Trapez mit Reglern.
// params = { form:"dreieck"|"parallelogramm"|"trapez", gmax:12, hmax:8, ginit:8, hinit:5, amax, cmax, einheit:"cm" }
export function mount(container, params) {
  const p = params || {}, form = p.form || "parallelogramm", E = p.einheit || "cm";
  const PX = 22, OX = 24, OY = 16;
  let g = p.ginit || 8, h = p.hinit || 5, a = p.ainit || 8, c = p.cinit || 4;
  const gmax = p.gmax || 12, hmax = p.hmax || 8, amax = p.amax || 12, cmax = p.cmax || 10;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:380px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.3rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.04rem";
  function regler(label, val, max, set) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = 1; i.max = max; i.step = 1; i.value = val; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = val;
    i.addEventListener("input", () => { set(+i.value); s.textContent = i.value; zeichne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(" " + E)); return l;
  }
  function zeichne() {
    const Wd = OX * 2 + Math.max(gmax, amax) * PX, Ht = OY * 2 + hmax * PX;
    svg.setAttribute("viewBox", `0 0 ${Wd} ${Ht}`);
    const y0 = Ht - OY; let s = "", A = 0, formel = "";
    if (form === "dreieck") {
      A = g * h / 2; formel = `A = ½ · g · h = ½ · ${g} · ${h} = ${A.toLocaleString("de-DE")}`;
      const x0 = OX, x1 = OX + g * PX, sp = OX + Math.round(g * 0.35) * PX, yt = y0 - h * PX;
      s += `<polygon points="${x0},${y0} ${x1},${y0} ${sp},${yt}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
      s += `<line x1="${sp}" y1="${y0}" x2="${sp}" y2="${yt}" stroke="var(--text-leise)" stroke-dasharray="3 2"/>`;
      s += `<text x="${(x0+x1)/2}" y="${y0+12}" text-anchor="middle" font-size="11">g = ${g}</text>`;
      s += `<text x="${sp+4}" y="${(y0+yt)/2}" font-size="11">h = ${h}</text>`;
    } else if (form === "parallelogramm") {
      A = g * h; formel = `A = g · h = ${g} · ${h} = ${A.toLocaleString("de-DE")}`;
      const sk = Math.round(g * 0.3) * PX, x0 = OX, yt = y0 - h * PX;
      s += `<polygon points="${x0},${y0} ${x0+g*PX},${y0} ${x0+g*PX+sk},${yt} ${x0+sk},${yt}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
      s += `<line x1="${x0+sk}" y1="${yt}" x2="${x0+sk}" y2="${y0}" stroke="var(--text-leise)" stroke-dasharray="3 2"/>`;
      s += `<text x="${x0+g*PX/2}" y="${y0+12}" text-anchor="middle" font-size="11">g = ${g}</text>`;
      s += `<text x="${x0+sk+4}" y="${(y0+yt)/2}" font-size="11">h = ${h}</text>`;
    } else { // trapez
      A = (a + c) * h / 2; formel = `A = ½ · (a + c) · h = ½ · (${a} + ${c}) · ${h} = ${A.toLocaleString("de-DE")}`;
      const x0 = OX, yt = y0 - h * PX, off = Math.round((a - c) / 2) * PX;
      s += `<polygon points="${x0},${y0} ${x0+a*PX},${y0} ${x0+off+c*PX},${yt} ${x0+off},${yt}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
      s += `<text x="${x0+a*PX/2}" y="${y0+12}" text-anchor="middle" font-size="11">a = ${a}</text>`;
      s += `<text x="${x0+off+c*PX/2}" y="${yt-3}" text-anchor="middle" font-size="11">c = ${c}</text>`;
    }
    svg.innerHTML = s;
    out.innerHTML = `<strong>${formel} ${E}²</strong>`;
  }
  if (form === "trapez") { steuer.append(regler("Seite a", a, amax, v => a = v), regler("Seite c", c, cmax, v => c = v), regler("Höhe h", h, hmax, v => h = v)); }
  else { steuer.append(regler("Grundseite g", g, gmax, v => g = v), regler("Höhe h", h, hmax, v => h = v)); }
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
