// zweistufig.js — zweistufiger Zufallsversuch (Urne) als Baumdiagramm mit Pfadwahrscheinlichkeiten.
// params = { rot:3, blau:2, ziehen:"mit"|"ohne", namen:["rot","blau"] }
export function mount(container, params) {
  const p = params || {};
  let r = p.rot ?? 3, b = p.blau ?? 2;
  let ziehen = p.ziehen === "ohne" ? "ohne" : "mit";
  const NA = p.namen || ["rot", "blau"];
  const W = 360, H = 220;
  container.innerHTML = "";
  const wrap = document.createElement("div"); wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2)";
  const steuer = document.createElement("div"); steuer.style.cssText = "display:flex;flex-wrap:wrap;gap:.4rem 1.2rem;justify-content:center;align-items:center";
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", `0 0 ${W} ${H}`); svg.setAttribute("role", "img");
  svg.style.cssText = "width:100%;max-width:460px;height:auto;display:block;margin:0 auto";
  const out = document.createElement("p"); out.setAttribute("role", "status"); out.style.cssText = "margin:0;text-align:center;font-size:.98rem";
  function regler(label, get, set, min, max) {
    const l = document.createElement("label"); l.style.whiteSpace = "nowrap"; l.append(document.createTextNode(label + ": "));
    const i = document.createElement("input"); i.type = "range"; i.min = min; i.max = max; i.step = 1; i.value = get(); i.style.verticalAlign = "middle"; i.setAttribute("aria-label", label);
    const s = document.createElement("strong"); s.textContent = get();
    i.addEventListener("input", () => { set(+i.value); s.textContent = i.value; zeichne(); });
    l.append(i, document.createTextNode(" "), s); return l;
  }
  const sel = document.createElement("label"); sel.append(document.createTextNode("Ziehen: "));
  const ss = document.createElement("select");
  ["mit", "ohne"].forEach(v => { const o = document.createElement("option"); o.value = v; o.textContent = v + " Zurücklegen"; ss.append(o); });
  ss.value = ziehen; ss.style.cssText = "padding:.2em;border:1px solid var(--linie);border-radius:var(--radius-klein);background:var(--flaeche);color:var(--text)";
  ss.addEventListener("change", () => { ziehen = ss.value; zeichne(); }); sel.append(ss);
  function frac(z, n) { return n <= 0 ? "0" : `${z}/${n}`; }
  function kante(x1, y1, x2, y2, label, farbe) {
    return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${farbe}" stroke-width="1.6"/>` +
           `<text x="${(x1+x2)/2}" y="${(y1+y2)/2-3}" text-anchor="middle" font-size="10" fill="var(--text-leise)">${label}</text>`;
  }
  function zeichne() {
    const ges = r + b;
    if (ges < 2) { svg.innerHTML = ""; out.textContent = "Lege mindestens zwei Kugeln in die Urne (zwei Züge möglich)."; return; }
    const ROT = "var(--fehler,#c0392b)", BLAU = "var(--info,#2c6fb0)";
    const x0 = 16, x1 = 150, x2 = 300, ym = H / 2;
    const ys1 = [ym - 60, ym + 60], ys2 = [yc => yc - 30, yc => yc + 30];
    let s = `<circle cx="${x0}" cy="${ym}" r="5" fill="var(--text)"/>`;
    const p1 = [r / ges, b / ges];
    // Stufe-2-Wahrscheinlichkeiten
    function p2(erst) {
      if (ziehen === "mit") return [r / ges, b / ges];
      const g2 = ges - 1; if (g2 <= 0) return [0, 0];
      return erst === 0 ? [(r - 1) / g2, b / g2] : [r / g2, (b - 1) / g2];
    }
    function f1(erst) { return erst === 0 ? frac(r, ges) : frac(b, ges); }
    function f2(erst, zw) {
      if (ziehen === "mit") return zw === 0 ? frac(r, ges) : frac(b, ges);
      const g2 = ges - 1;
      if (erst === 0) return zw === 0 ? frac(r - 1, g2) : frac(b, g2);
      return zw === 0 ? frac(r, g2) : frac(b - 1, g2);
    }
    const leafs = [];
    [0, 1].forEach(e => {
      const yc = ys1[e], farbe1 = e === 0 ? ROT : BLAU;
      s += kante(x0, ym, x1, yc, f1(e), farbe1);
      s += `<circle cx="${x1}" cy="${yc}" r="4" fill="${farbe1}"/>`;
      const pp2 = p2(e);
      [0, 1].forEach(z => {
        const yl = ys2[z](yc), farbe2 = z === 0 ? ROT : BLAU;
        s += kante(x1, yc, x2, yl, f2(e, z), farbe2);
        let prob = p1[e] * pp2[z]; if (!isFinite(prob)) prob = 0;
        const nm = `${NA[e]},${NA[z]}`;
        s += `<text x="${x2+6}" y="${yl+4}" font-size="10" fill="var(--text)">${nm}: ${(Math.round(prob*1000)/1000).toLocaleString("de-DE")}</text>`;
        leafs.push({ nm, prob });
      });
    });
    svg.innerHTML = s;
    const pZwei = leafs.find(l => l.nm === `${NA[0]},${NA[0]}`).prob;
    out.innerHTML = `Urne: ${r}× ${NA[0]}, ${b}× ${NA[1]} (${ziehen} Zurücklegen). ` +
      `Beispiel P(beide ${NA[0]}) = <strong>${(Math.round(pZwei*1000)/1000).toLocaleString("de-DE")}</strong>. Summe aller Pfade = 1.`;
  }
  steuer.append(regler(NA[0], () => r, v => r = v, 0, 9), regler(NA[1], () => b, v => b = v, 0, 9), sel);
  wrap.append(steuer, svg, out); container.append(wrap); zeichne();
}
