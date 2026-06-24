// stromkreis.js — Schaltung mit Reglern: Ohmsches Gesetz, Reihen-, Parallelschaltung, Schalter/Lampe.
// params = { modus:"ohm"|"reihe"|"parallel"|"schalter", U:..., R1:..., R2:..., Umax, Rmax }
export function mount(container, params) {
  const p = params || {}, modus = p.modus || "ohm";
  const Umax = p.Umax || 24, Rmax = p.Rmax || 100;
  const st = { U: p.U ?? 12, R1: p.R1 ?? 20, R2: p.R2 ?? 30 };
  let an = true; // Schalter
  const W = 300, H = 180;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:380px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.3rem;justify-content:center;align-items:center";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.02rem";
  const f = x => (Math.round(x * 100) / 100).toLocaleString("de-DE");
  function regler(sym, label, min, max, step, einh) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = step; i.value = st[sym]; i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = st[sym];
    i.addEventListener("input", () => { st[sym] = +i.value; s.textContent = i.value; zeichne(); });
    l.append(i, document.createTextNode(" "), s, document.createTextNode(" " + einh)); return l;
  }
  function batterie(x, y) { // vertikal, Mitte (x,y)
    return `<line x1="${x}" y1="${y-14}" x2="${x}" y2="${y-3}" stroke="var(--text)" stroke-width="2"/>` +
           `<line x1="${x-10}" y1="${y-3}" x2="${x+10}" y2="${y-3}" stroke="var(--text)" stroke-width="2.5"/>` +
           `<line x1="${x-5}" y1="${y+3}" x2="${x+5}" y2="${y+3}" stroke="var(--text)" stroke-width="2.5"/>` +
           `<line x1="${x}" y1="${y+3}" x2="${x}" y2="${y+14}" stroke="var(--text)" stroke-width="2"/>` +
           `<text x="${x+14}" y="${y+4}" text-anchor="start" font-size="11" fill="var(--text)">U = ${f(st.U)} V</text>`;
  }
  function widerstand(x, y, horiz, label) { // Rechteck zentriert (x,y)
    const w = horiz ? 34 : 16, h = horiz ? 16 : 34;
    return `<rect x="${x-w/2}" y="${y-h/2}" width="${w}" height="${h}" fill="var(--hauch)" stroke="var(--text)" stroke-width="1.6"/>` +
           `<text x="${x + (horiz?0:18)}" y="${y - (horiz?12:0) + (horiz?0:4)}" text-anchor="${horiz?'middle':'start'}" font-size="11" fill="var(--text)">${label}</text>`;
  }
  function pfeil(x1, y1, x2, y2) {
    const dx = x2-x1, dy = y2-y1, len = Math.hypot(dx,dy)||1, ux=dx/len, uy=dy/len;
    return `<polygon points="${x2},${y2} ${x2-8*ux-4*uy},${y2-8*uy+4*ux} ${x2-8*ux+4*uy},${y2-8*uy-4*ux}" fill="var(--akzent)"/>`;
  }
  function rahmen(extra) { // Standard-Rechteckschleife, Batterie links
    return `<rect x="40" y="30" width="220" height="120" fill="none" stroke="var(--akzent)" stroke-width="2"/>` + batterie(40, 90) + extra;
  }
  function zeichne() {
    let s = "", txt = "";
    if (modus === "ohm") {
      s = rahmen(widerstand(260, 90, false, "R"));
      s += pfeil(120, 30, 150, 30);
      const I = st.U / st.R1;
      txt = `R = ${f(st.R1)} Ω <br> I = U / R = ${f(st.U)} V / ${f(st.R1)} Ω = <strong>${f(I)} A</strong>`;
    } else if (modus === "reihe") {
      s = rahmen(widerstand(150, 30, true, "R1") + widerstand(220, 30, true, "R2"));
      s += pfeil(95, 30, 110, 30);
      const Rg = st.R1 + st.R2, I = st.U / Rg;
      txt = `R₁=${f(st.R1)} Ω, R₂=${f(st.R2)} Ω → R = R₁+R₂ = <strong>${f(Rg)} Ω</strong><br>I = <strong>${f(I)} A</strong><br>U₁=${f(I*st.R1)} V, U₂=${f(I*st.R2)} V`;
    } else if (modus === "parallel") {
      // zwei vertikale Zweige rechts
      s = `<rect x="40" y="30" width="220" height="120" fill="none" stroke="none"/>`;
      s += `<line x1="40" y1="30" x2="260" y2="30" stroke="var(--akzent)" stroke-width="2"/>`;       // oben
      s += `<line x1="40" y1="150" x2="260" y2="150" stroke="var(--akzent)" stroke-width="2"/>`;     // unten
      s += `<line x1="40" y1="30" x2="40" y2="76" stroke="var(--akzent)" stroke-width="2"/><line x1="40" y1="104" x2="40" y2="150" stroke="var(--akzent)" stroke-width="2"/>`;
      s += batterie(40, 90);
      s += `<line x1="180" y1="30" x2="180" y2="150" stroke="var(--akzent)" stroke-width="2"/>` + widerstand(180, 90, false, "R1");
      s += `<line x1="240" y1="30" x2="240" y2="150" stroke="var(--akzent)" stroke-width="2"/>` + widerstand(240, 90, false, "R2");
      const Rg = st.R1 * st.R2 / (st.R1 + st.R2), I1 = st.U / st.R1, I2 = st.U / st.R2;
      txt = `R = (R₁·R₂)/(R₁+R₂) = <strong>${f(Rg)} Ω</strong><br>I₁=${f(I1)} A, I₂=${f(I2)} A → I = <strong>${f(I1+I2)} A</strong>`;
    } else { // schalter
      s = `<rect x="40" y="30" width="220" height="120" fill="none" stroke="var(--akzent)" stroke-width="2"/>`;
      // Lücke oben für Schalter (110..150)
      s = `<line x1="40" y1="30" x2="110" y2="30" stroke="var(--akzent)" stroke-width="2"/>` +
          `<line x1="150" y1="30" x2="260" y2="30" stroke="var(--akzent)" stroke-width="2"/>` +
          `<line x1="40" y1="30" x2="40" y2="150" stroke="var(--akzent)" stroke-width="2"/>` +
          `<line x1="40" y1="150" x2="260" y2="150" stroke="var(--akzent)" stroke-width="2"/>` +
          `<line x1="260" y1="30" x2="260" y2="150" stroke="var(--akzent)" stroke-width="2"/>`;
      s += batterie(40, 90);
      // Schalter
      s += `<circle cx="110" cy="30" r="3" fill="var(--text)"/><circle cx="150" cy="30" r="3" fill="var(--text)"/>`;
      s += an ? `<line x1="110" y1="30" x2="150" y2="30" stroke="var(--text)" stroke-width="2"/>`
              : `<line x1="110" y1="30" x2="146" y2="16" stroke="var(--text)" stroke-width="2"/>`;
      // Lampe rechts
      const lit = an;
      s += `<circle cx="260" cy="90" r="14" fill="${lit?'#ffd84d':'var(--flaeche)'}" stroke="var(--text)" stroke-width="1.6"/>`;
      s += `<line x1="250" y1="80" x2="270" y2="100" stroke="var(--text)" stroke-width="1.2"/><line x1="270" y1="80" x2="250" y2="100" stroke="var(--text)" stroke-width="1.2"/>`;
      txt = an ? "Schalter <strong>geschlossen</strong> → Strom fließt, die Lampe <strong>leuchtet</strong>." : "Schalter <strong>offen</strong> → kein Strom, die Lampe bleibt <strong>aus</strong>.";
    }
    svg.innerHTML = s; out.innerHTML = txt;
  }
  if (modus === "ohm") steuer.append(regler("U", "Spannung U", 1, Umax, 1, "V"), regler("R1", "Widerstand R", 1, Rmax, 1, "Ω"));
  else if (modus === "reihe" || modus === "parallel") steuer.append(regler("U", "U", 1, Umax, 1, "V"), regler("R1", "R₁", 1, Rmax, 1, "Ω"), regler("R2", "R₂", 1, Rmax, 1, "Ω"));
  else { const b = document.createElement("button"); b.type = "button"; b.className = "knopf klein"; b.textContent = "Schalter umlegen"; b.addEventListener("click", () => { an = !an; zeichne(); }); steuer.append(b); }
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
