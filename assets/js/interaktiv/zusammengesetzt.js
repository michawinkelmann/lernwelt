// zusammengesetzt.js — zusammengesetzte (L-)Figur: Flächeninhalt durch Zerlegen in zwei
// Rechtecke ODER durch Ergänzen (großes Rechteck minus Ausschnitt). Regler: Ausschnitt b×h.
// params = { W:8, H:6, nwInit:3, nhInit:2, einheit:"cm" }
export function mount(container, params) {
  const p = params || {}; const W = p.W || 8, H = p.H || 6, E = p.einheit || "cm";
  let nw = p.nwInit ?? 3, nh = p.nhInit ?? 2;
  const PX = 22, OX = 14, OY = 14;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${OX*2+W*PX} ${OY*2+H*PX}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:340px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.0rem;min-height:3em";
  function zeichne() {
    const x0 = OX, y0 = OY; // obere linke Ecke des umschließenden Rechtecks
    // Zerlegung: Rechteck1 oben-links (W−nw)×nh, Rechteck2 unten W×(H−nh)
    let s = "";
    s += `<rect x="${x0}" y="${y0+nh*PX}" width="${W*PX}" height="${(H-nh)*PX}" fill="var(--hauch)" stroke="none"/>`;             // unten
    s += `<rect x="${x0}" y="${y0}" width="${(W-nw)*PX}" height="${nh*PX}" fill="var(--ok)" opacity="0.22" stroke="none"/>`;        // oben-links
    // Gitter
    for (let i = 1; i < W; i++) s += `<line x1="${x0+i*PX}" y1="${y0+(i<=W-nw?0:nh*PX)}" x2="${x0+i*PX}" y2="${y0+H*PX}" stroke="var(--linie)" stroke-width="0.7" opacity="0.6"/>`;
    for (let j = 1; j < H; j++) s += `<line x1="${x0}" y1="${y0+j*PX}" x2="${x0+(j<nh?(W-nw)*PX:W*PX)}" y2="${y0+j*PX}" stroke="var(--linie)" stroke-width="0.7" opacity="0.6"/>`;
    // L-Umriss
    const pts = [[0,0],[W-nw,0],[W-nw,nh],[W,nh],[W,H],[0,H]].map(([x,y])=>`${x0+x*PX},${y0+y*PX}`).join(" ");
    s += `<polygon points="${pts}" fill="none" stroke="var(--akzent)" stroke-width="2.5"/>`;
    // Ausschnitt (Ergänzen) gestrichelt
    s += `<rect x="${x0+(W-nw)*PX}" y="${y0}" width="${nw*PX}" height="${nh*PX}" fill="none" stroke="var(--text-leise)" stroke-width="1.5" stroke-dasharray="5 4"/>`;
    svg.innerHTML = s;
    const A1 = (W-nw)*nh, A2 = W*(H-nh), ges = A1+A2;
    out.innerHTML = `Zerlegen: A = ${W-nw}·${nh} + ${W}·${H-nh} = ${A1} + ${A2} = <strong>${ges} ${E}²</strong><br>` +
      `<span style="color:var(--text-leise);font-size:.92em">Ergänzen: A = ${W}·${H} − ${nw}·${nh} = ${W*H} − ${nw*nh} = ${ges} ${E}²</span>`;
  }
  function regler(label, val, min, max, set) { const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = 1; i.value = val; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const o = document.createElement("strong"); o.textContent = val + " " + E;
    i.addEventListener("input", () => { set(+i.value); o.textContent = i.value + " " + E; zeichne(); }); l.append(i, document.createTextNode(" "), o); return l; }
  steuer.append(regler("Ausschnitt-Breite", nw, 1, W-1, v => nw = v), regler("Ausschnitt-Höhe", nh, 1, H-1, v => nh = v));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
