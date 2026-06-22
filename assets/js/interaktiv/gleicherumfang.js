// gleicherumfang.js — Rechtecke mit GLEICHEM Umfang U, aber verschiedener Fläche.
// Regler verändert die Seite a; b = U/2 − a ergänzt sich automatisch, sodass U konstant bleibt.
// Die Fläche A = a·b ist beim Quadrat am größten. params = { U:24, aInit:4, einheit:"cm" }
export function mount(container, params) {
  const p = params || {}; const U = p.U || 24, E = p.einheit || "cm", halb = U / 2, m = halb - 1;
  let a = p.aInit ?? 4;
  const PX = 15, OX = 16, OY = 16, S = m * PX;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${OX*2+S} ${OY*2+S}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:300px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const lab = document.createElement("label"); lab.style.cssText = "text-align:center;white-space:nowrap"; lab.append(document.createTextNode("Seite a: "));
  const inp = document.createElement("input"); inp.type = "range"; inp.min = 1; inp.max = m; inp.step = 1; inp.value = a; inp.style.verticalAlign = "middle"; inp.setAttribute("aria-label", "Seite a");
  const av = document.createElement("strong"); av.style.cssText = "display:inline-block;min-width:3ch;text-align:right"; av.textContent = a + " " + E;
  lab.append(inp, document.createTextNode(" "), av);
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.0rem;min-height:3em";
  function zeichne() {
    const b = halb - a, w = a * PX, h = b * PX, y0 = OY + S - h;
    let s = `<rect x="${OX}" y="${y0}" width="${w}" height="${h}" fill="var(--hauch)" stroke="var(--akzent)" stroke-width="2.5"/>`;
    for (let i = 1; i < a; i++) s += `<line x1="${OX+i*PX}" y1="${y0}" x2="${OX+i*PX}" y2="${y0+h}" stroke="var(--linie)" stroke-width="0.7" opacity="0.6"/>`;
    for (let j = 1; j < b; j++) s += `<line x1="${OX}" y1="${y0+j*PX}" x2="${OX+w}" y2="${y0+j*PX}" stroke="var(--linie)" stroke-width="0.7" opacity="0.6"/>`;
    s += `<text x="${OX+w/2}" y="${y0+h+13}" text-anchor="middle" font-size="11" fill="var(--text)">a = ${a}</text>`;
    s += `<text x="${OX-5}" y="${y0+h/2}" text-anchor="end" font-size="11" fill="var(--text)">b = ${b}</text>`;
    svg.innerHTML = s;
    const A = a * b, quad = a === b;
    out.innerHTML = `Umfang U = 2·(a+b) = 2·(${a}+${b}) = <strong>${U} ${E}</strong> (bleibt gleich)<br>` +
      `Fläche A = a·b = ${a}·${b} = <strong>${A} ${E}²</strong>${quad ? ' <span style="color:var(--ok)">— Quadrat: größte Fläche!</span>' : ''}`;
  }
  inp.addEventListener("input", () => { a = +inp.value; av.textContent = a + " " + E; zeichne(); });
  wrap.append(svg, lab, out); container.append(wrap); zeichne();
}
