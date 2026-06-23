// baukasten.js — Schaltkreis-Baukasten: zwei parallele Zweige (je 2 Plätze) zwischen den
// Batteriepolen. Schüler wählen pro Platz ein Bauteil und testen, welche Lampe leuchtet.
// Ein Zweig leitet nur, wenn BEIDE Plätze leiten (Reihe); die zwei Zweige liegen parallel.
export function mount(container, params) {
  const OPTS = [["leer", "— leer —"], ["draht", "Draht"], ["offen", "Schalter (offen)"], ["zu", "Schalter (zu)"], ["lampe", "Lampe"]];
  const leitet = c => c === "draht" || c === "zu" || c === "lampe";
  const Z = [["zu", "lampe"], ["offen", "lampe"]];   // Startaufbau
  const W = 330, H = 200, BX = 50, RX = 280, Y1 = 52, Y2 = 112, BY = 170, cx1 = 132, cx2 = 222, sw = 22;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:420px;height:auto;display:block;margin:0 auto;background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:grid;grid-template-columns:1fr 1fr;gap:.3rem .8rem;justify-content:center;max-width:420px;margin:0 auto;font-size:.9rem";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:1.0rem;min-height:3em";
  const T = "var(--text)";
  function comp(cx, y, c, lit) {
    if (c === "draht") return `<line x1="${cx-sw}" y1="${y}" x2="${cx+sw}" y2="${y}" stroke="${T}" stroke-width="2"/>`;
    if (c === "leer") return "";
    if (c === "offen" || c === "zu") {
      let s = `<circle cx="${cx-sw}" cy="${y}" r="2.6" fill="${T}"/><circle cx="${cx+sw}" cy="${y}" r="2.6" fill="${T}"/>`;
      s += c === "zu" ? `<line x1="${cx-sw}" y1="${y}" x2="${cx+sw}" y2="${y}" stroke="${T}" stroke-width="2"/>`
                      : `<line x1="${cx-sw}" y1="${y}" x2="${cx+15}" y2="${y-15}" stroke="${T}" stroke-width="2"/>`;
      return s;
    }
    if (c === "lampe") {
      let s = `<line x1="${cx-sw}" y1="${y}" x2="${cx-12}" y2="${y}" stroke="${T}" stroke-width="2"/><line x1="${cx+12}" y1="${y}" x2="${cx+sw}" y2="${y}" stroke="${T}" stroke-width="2"/>`;
      if (lit) s += `<circle cx="${cx}" cy="${y}" r="17" fill="#ffe08a" opacity="0.75"/>`;
      const col = lit ? "#d68a00" : T;
      s += `<circle cx="${cx}" cy="${y}" r="12" fill="none" stroke="${col}" stroke-width="2"/>`;
      s += `<line x1="${cx-8.5}" y1="${y-8.5}" x2="${cx+8.5}" y2="${y+8.5}" stroke="${col}" stroke-width="1.5"/><line x1="${cx-8.5}" y1="${y+8.5}" x2="${cx+8.5}" y2="${y-8.5}" stroke="${col}" stroke-width="1.5"/>`;
      return s;
    }
    return "";
  }
  function zeichne() {
    const cond = [leitet(Z[0][0]) && leitet(Z[0][1]), leitet(Z[1][0]) && leitet(Z[1][1])];
    const fliesst = cond[0] || cond[1];
    let s = "";
    s += `<line x1="${BX}" y1="${Y1}" x2="${BX}" y2="${BY}" stroke="${T}" stroke-width="2"/>`;   // linker Bus + runter
    s += `<line x1="${RX}" y1="${Y1}" x2="${RX}" y2="${BY}" stroke="${T}" stroke-width="2"/>`;   // rechter Bus + runter
    s += `<line x1="${BX}" y1="${BY}" x2="155" y2="${BY}" stroke="${T}" stroke-width="2"/><line x1="185" y1="${BY}" x2="${RX}" y2="${BY}" stroke="${T}" stroke-width="2"/>`;
    s += `<line x1="163" y1="${BY-11}" x2="163" y2="${BY+11}" stroke="${T}" stroke-width="2"/>`;  // Batterie lang (+)
    s += `<line x1="177" y1="${BY-6}" x2="177" y2="${BY+6}" stroke="${T}" stroke-width="4"/>`;    // Batterie kurz (−)
    s += `<text x="170" y="${BY+24}" text-anchor="middle" font-size="10" fill="var(--text-leise)">Batterie</text>`;
    [Y1, Y2].forEach((y, zi) => {
      s += `<line x1="${BX}" y1="${y}" x2="${cx1-sw}" y2="${y}" stroke="${T}" stroke-width="2"/>`;
      s += `<line x1="${cx1+sw}" y1="${y}" x2="${cx2-sw}" y2="${y}" stroke="${T}" stroke-width="2"/>`;
      s += `<line x1="${cx2+sw}" y1="${y}" x2="${RX}" y2="${y}" stroke="${T}" stroke-width="2"/>`;
      s += comp(cx1, y, Z[zi][0], Z[zi][0] === "lampe" && cond[zi]);
      s += comp(cx2, y, Z[zi][1], Z[zi][1] === "lampe" && cond[zi]);
    });
    svg.innerHTML = s;
    let an = 0; [0, 1].forEach(zi => [0, 1].forEach(pi => { if (Z[zi][pi] === "lampe" && cond[zi]) an++; }));
    out.innerHTML = `Strom fließt: <strong>${fliesst ? "ja" : "nein"}</strong> · Zweig 1: ${cond[0] ? "geschlossen ✓" : "offen ✗"}, Zweig 2: ${cond[1] ? "geschlossen ✓" : "offen ✗"}<br>` +
      `<span style="color:var(--text-leise);font-size:.92em">Leuchtende Lampen: <strong>${an}</strong>. Ein Zweig leitet nur, wenn <em>beide</em> Plätze leiten (Reihe); die zwei Zweige liegen parallel.</span>`;
  }
  [0, 1].forEach(zi => [0, 1].forEach(pi => {
    const lab = document.createElement("label"); lab.style.cssText = "display:flex;flex-direction:column;gap:.1rem";
    lab.append(document.createTextNode(`Zweig ${zi+1} · Platz ${pi+1}`));
    const sel = document.createElement("select"); sel.style.cssText = "font:inherit;padding:.15rem";
    OPTS.forEach(([v, t]) => { const o = document.createElement("option"); o.value = v; o.textContent = t; if (v === Z[zi][pi]) o.selected = true; sel.append(o); });
    sel.addEventListener("change", () => { Z[zi][pi] = sel.value; zeichne(); });
    lab.append(sel); steuer.append(lab);
  }));
  wrap.append(svg, steuer, out); container.append(wrap); zeichne();
}
