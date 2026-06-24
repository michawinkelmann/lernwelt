// optik.js — Strahlenoptik: Reflexion, Brechung (Snellius) oder Sammellinse (Abbildung).
// params = { modus:"reflexion"|"brechung"|"linse", winkel, n2, f, g }
export function mount(container, params) {
  const p = params || {}, modus = p.modus || "reflexion";
  const st = { w: p.winkel ?? 40, n2: p.n2 ?? 1.33, f: p.f ?? 4, g: p.g ?? 12 };
  const W = 320, H = 200, cx = 160, cy = 100;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:400px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.4rem;justify-content:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  const f2 = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
  function regler(sym, label, min, max, step, einh) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = st[sym]; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = (+st[sym]).toLocaleString("de-DE");
    i.addEventListener("input", () => { st[sym] = +i.value; s.textContent = (+i.value).toLocaleString("de-DE"); zeichne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(einh ? " " + einh : "")); return l;
  }
  function strahl(x1, y1, x2, y2, farbe, arrow) {
    const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
    let s = `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="2.2"/>`;
    if (arrow) { const mx=x1+dx*0.6, my=y1+dy*0.6; s += `<polygon points="${mx},${my} ${mx-7*ux-3.5*uy},${my-7*uy+3.5*ux} ${mx-7*ux+3.5*uy},${my-7*uy-3.5*ux}" fill="${farbe}"/>`; }
    return s;
  }
  function zeichne() {
    let s = "", txt = "";
    const AK = "var(--akzent)", LE = "var(--text-leise)";
    if (modus === "reflexion" || modus === "brechung") {
      const a1 = st.w * Math.PI / 180, L = 92;
      s += `<line x1="20" y1="${cy}" x2="${W-20}" y2="${cy}" stroke="var(--text)" stroke-width="2"/>`;       // Grenzfläche/Spiegel
      s += `<line x1="${cx}" y1="20" x2="${cx}" y2="${H-20}" stroke="${LE}" stroke-width="1" stroke-dasharray="4 3"/>`; // Lot
      s += `<text x="${cx+4}" y="30" font-size="10" fill="${LE}">Lot</text>`;
      // einfallender Strahl (oben links → Auftreffpunkt)
      s += strahl(cx - L*Math.sin(a1), cy - L*Math.cos(a1), cx, cy, AK, true);
      if (modus === "reflexion") {
        for (let i = 0; i < 8; i++) s += `<line x1="${30+i*35}" y1="${cy}" x2="${22+i*35}" y2="${cy+8}" stroke="var(--text)" stroke-width="1"/>`; // Schraffur
        s += strahl(cx, cy, cx + L*Math.sin(a1), cy - L*Math.cos(a1), AK, true);
        s += `<text x="${cx - 30}" y="${cy-12}" font-size="10" fill="${AK}">${st.w}°</text><text x="${cx + 16}" y="${cy-12}" font-size="10" fill="${AK}">${st.w}°</text>`;
        txt = `Reflexionsgesetz: Einfallswinkel = Reflexionswinkel = <strong>${st.w}°</strong> (beide zum Lot gemessen).`;
      } else {
        s += `<rect x="20" y="${cy}" width="${W-40}" height="${H-20-cy}" fill="var(--info,#2c6fb0)" opacity="0.12"/>`;
        s += `<text x="24" y="${cy-4}" font-size="10" fill="${LE}">Luft (n=1)</text><text x="24" y="${H-24}" font-size="10" fill="${LE}">Medium (n=${f2(st.n2)})</text>`;
        const sin2 = Math.sin(a1) / st.n2, a2 = Math.asin(Math.max(-1, Math.min(1, sin2)));
        s += strahl(cx, cy, cx + L*Math.sin(a2), cy + L*Math.cos(a2), AK, true);
        s += `<text x="${cx - 28}" y="${cy-12}" font-size="10" fill="${AK}">${st.w}°</text><text x="${cx + 12}" y="${cy+22}" font-size="10" fill="${AK}">${f2(a2*180/Math.PI)}°</text>`;
        txt = `Brechung (Luft → Medium): Einfallswinkel ${st.w}° → Brechungswinkel <strong>${f2(a2*180/Math.PI)}°</strong>. Snellius: sin α₁ = n · sin α₂.`;
      }
    } else { // linse (Sammellinse)
      const PX = 8.2, f = st.f, g = st.g, h = 30, rechts = W - 14, fpx = f * PX;
      const lineTo = (p1, p2, xE) => ({ x: xE, y: p1.y + (xE - p1.x) / (p2.x - p1.x) * (p2.y - p1.y) });
      s += `<line x1="14" y1="${cy}" x2="${rechts}" y2="${cy}" stroke="var(--text)" stroke-width="1"/>`;          // optische Achse
      s += `<line x1="${cx}" y1="30" x2="${cx}" y2="${H-30}" stroke="${AK}" stroke-width="2"/>`;                    // Linse
      s += `<polygon points="${cx},28 ${cx-5},38 ${cx+5},38" fill="${AK}"/><polygon points="${cx},${H-28} ${cx-5},${H-38} ${cx+5},${H-38}" fill="${AK}"/>`;
      [-1,1].forEach(sgn => { s += `<circle cx="${cx+sgn*fpx}" cy="${cy}" r="2.5" fill="var(--text)"/><text x="${cx+sgn*fpx}" y="${cy+14}" text-anchor="middle" font-size="9" fill="${LE}">${sgn<0?'F':'F´'}</text>`; });
      const ox = cx - g * PX, tip = { x: ox, y: cy - h };
      s += `<line x1="${ox}" y1="${cy}" x2="${ox}" y2="${cy-h}" stroke="var(--ok,#2a7)" stroke-width="2.4"/><polygon points="${ox},${cy-h} ${ox-4},${cy-h+7} ${ox+4},${cy-h+7}" fill="var(--ok,#2a7)"/>`;
      if (Math.abs(g - f) < 0.4) {
        txt = `f = ${f2(f)} cm, g = ${f2(g)} cm ≈ f → die Strahlen verlaufen hinter der Linse nahezu parallel (Bild im Unendlichen).`;
      } else {
        const b = f * g / (g - f), ix = cx + b * PX, hi = (b / g) * h;   // hi>0: Bild nach unten (umgekehrt)
        const lensTop = { x: cx, y: cy - h }, Fp = { x: cx + fpx, y: cy }, mitte = { x: cx, y: cy };
        const eA = lineTo(lensTop, Fp, rechts);                 // gebrochener Parallelstrahl (durch F´)
        const eB = lineTo(tip, mitte, rechts);                  // Mittelpunktstrahl (gerade)
        s += `<line x1="${ox}" y1="${cy-h}" x2="${cx}" y2="${cy-h}" stroke="${LE}" stroke-width="1.6"/>`;            // Parallelstrahl bis Linse
        if (b > 0) { // reelles Bild rechts
          s += strahl(cx, cy - h, ix, cy + hi, LE, false);
          s += strahl(ox, cy - h, ix, cy + hi, AK, false);
          if (ix < rechts && Math.abs(hi) < 78) {
            const ah = hi > 0 ? -7 : 7;
            s += `<line x1="${ix}" y1="${cy}" x2="${ix}" y2="${cy+hi}" stroke="var(--fehler,#c0392b)" stroke-width="2.4"/><polygon points="${ix},${cy+hi} ${ix-4},${cy+hi+ah} ${ix+4},${cy+hi+ah}" fill="var(--fehler,#c0392b)"/>`;
          }
          txt = `f = ${f2(f)} cm, g = ${f2(g)} cm → Bildweite b = <strong>${f2(b)} cm</strong> (reelles, umgekehrtes Bild)<br>Abbildungsmaßstab = ${f2(Math.abs(b/g))}`;
        } else { // virtuelles Bild links (g < f): Strahlen divergieren, Rückverlängerung gestrichelt
          s += strahl(cx, cy - h, eA.x, eA.y, LE, false);       // gebrochener Parallelstrahl nach rechts (divergiert)
          s += strahl(ox, cy - h, eB.x, eB.y, AK, false);       // Mittelpunktstrahl nach rechts
          s += `<line x1="${cx}" y1="${cy-h}" x2="${ix}" y2="${cy+hi}" stroke="${LE}" stroke-width="1" stroke-dasharray="4 3"/>`;
          s += `<line x1="${cx}" y1="${cy}" x2="${ix}" y2="${cy+hi}" stroke="${AK}" stroke-width="1" stroke-dasharray="4 3"/>`;
          if (ix > 14 && Math.abs(hi) < 78) {
            const ah = hi > 0 ? -7 : 7;
            s += `<line x1="${ix}" y1="${cy}" x2="${ix}" y2="${cy+hi}" stroke="var(--fehler,#c0392b)" stroke-width="2.2" stroke-dasharray="4 3"/><polygon points="${ix},${cy+hi} ${ix-4},${cy+hi+ah} ${ix+4},${cy+hi+ah}" fill="var(--fehler,#c0392b)" opacity="0.7"/>`;
          }
          txt = `f = ${f2(f)} cm, g = ${f2(g)} cm (g < f, „Lupe") → b = <strong>${f2(b)} cm</strong> (virtuelles, aufrechtes, vergrößertes Bild)<br>Abbildungsmaßstab = ${f2(Math.abs(b/g))}`;
        }
      }
    }
    svg.innerHTML = s; out.innerHTML = txt;
  }
  if (modus === "reflexion") steuer.append(regler("w", "Einfallswinkel", 0, 80, 5, "°"));
  else if (modus === "brechung") steuer.append(regler("w", "Einfallswinkel", 0, 85, 5, "°"), regler("n2", "Brechzahl n", 1.1, 2, 0.05, ""));
  else steuer.append(regler("g", "Gegenstandsweite g", 1, 16, 1, "cm"), regler("f", "Brennweite f", 2, 8, 1, "cm"));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
