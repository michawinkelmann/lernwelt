// led-energiestufen.js — LED-Farbe wählen → Einsetzspannung, Photonenenergie (eV/J) und Bandschema.
// Halbleiter/LED: Aus der Einsetzspannung U_E folgt die Photonenenergie E = e·U_E. Der Zahlwert in eV
// gleicht U_E in V; in Joule durch Multiplikation mit der Elementarladung e = 1,602e-19 C. Das SVG zeigt
// Valenzband (unten) und Leitungsband (oben); die Bandlücke wächst proportional zur Energie, der farbige
// Pfeil (in LED-Farbe) stellt den Elektronensprung/das ausgesandte Photon dar.
// Reines Vanilla-JS/SVG, keine externen Bibliotheken. params optional:
//   { leds:[{ name:"Blau", farbe:"#2b6cff", U:2.8, lambda:465 }, ...] }
export function mount(container, params) {
  const p = params || {};
  const e = 1.602e-19; // Elementarladung in C
  // Standard-LEDs in aufsteigender Energie (rot < gelb < gruen < blau < UV)
  const standard = [
    { name: "Rot", farbe: "#e23b2e", U: 1.8, lambda: 630 },
    { name: "Gelb/Orange", farbe: "#f2a200", U: 2.1, lambda: 590 },
    { name: "Grün", farbe: "#2faa3f", U: 2.3, lambda: 525 },
    { name: "Blau", farbe: "#2b6cff", U: 2.8, lambda: 465 },
    { name: "Violett/UV", farbe: "#8a3ff0", U: 3.4, lambda: 400 }
  ];
  const leds = (Array.isArray(p.leds) && p.leds.length)
    ? p.leds.map((l, i) => ({
        name: l.name || ("LED " + (i + 1)),
        farbe: l.farbe || "var(--akzent)",
        U: Number(l.U) || 0,
        lambda: Number(l.lambda) || 0
      }))
    : standard;

  // Energiebereich fuer die Darstellung (aus den vorhandenen Spannungen)
  const uMax = Math.max(...leds.map(l => l.U), 1);

  container.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.style.cssText = "display:flex;flex-direction:column;gap:var(--abstand-2);align-items:center";

  // --- Farb-Knoepfe ---
  const leiste = document.createElement("div");
  leiste.setAttribute("role", "group");
  leiste.setAttribute("aria-label", "LED-Farbe wählen");
  leiste.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:center";
  const knoepfe = [];
  leds.forEach((l, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = l.name;
    b.setAttribute("aria-label", "Farbe " + l.name + " wählen");
    b.setAttribute("aria-pressed", "false");
    b.style.cssText =
      "padding:.4em .8em;border:2px solid " + l.farbe + ";border-radius:var(--radius);" +
      "background:var(--flaeche);color:var(--text);cursor:pointer;font-weight:600";
    b.addEventListener("click", () => waehle(i));
    leiste.append(b);
    knoepfe.push(b);
  });

  // --- SVG-Bandschema ---
  const W = 340, H = 240;
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 " + W + " " + H);
  svg.setAttribute("role", "img");
  svg.style.cssText =
    "width:100%;max-width:360px;height:auto;display:block;margin:0 auto;" +
    "background:var(--flaeche);border:1px solid var(--linie);border-radius:var(--radius)";

  // --- Ausgabe ---
  const out = document.createElement("p");
  out.setAttribute("role", "status");
  out.style.cssText = "margin:0;text-align:center;font-size:1.05rem;min-height:1.4em";

  // Zahl mit deutschem Dezimalkomma
  function kommma(s) { return String(s).replace(".", ","); }
  function fmtU(v) { return kommma((Math.round(v * 10) / 10).toFixed(1)); }
  function fmtEv(v) { return kommma((Math.round(v * 100) / 100).toFixed(2)); }
  // Joule in Zehnerpotenz-Schreibweise, z. B. 4,5·10⁻¹⁹ J
  function fmtJ(j) {
    if (!isFinite(j) || j === 0) return "0 J";
    const exp = Math.floor(Math.log10(Math.abs(j)));
    const mant = j / Math.pow(10, exp);
    const hoch = { "-": "⁻", "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴",
                   "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
    const expStr = String(exp).split("").map(c => hoch[c] || c).join("");
    return kommma((Math.round(mant * 10) / 10).toFixed(1)) + "·10" + expStr + " J";
  }

  function bandschema(led) {
    const ML = 40, MR = 40, MT = 26, MB = 26;
    const bandH = 24;            // Hoehe der Baender (Balken)
    const innen = H - MT - MB - 2 * bandH; // Platz fuer die Bandluecke
    const luecke = (led.U / uMax) * innen; // Bandluecke proportional zur Energie
    const yLeit = MT + bandH + (innen - luecke);  // Unterkante Leitungsband-Bereich
    const yVal = MT + bandH + innen;              // Oberkante Valenzband-Bereich
    const xL = ML, xR = W - MR, br = xR - xL;
    const xM = (xL + xR) / 2;
    const farbe = led.farbe;
    let s = "";
    // Leitungsband (oben)
    s += '<rect x="' + xL + '" y="' + MT + '" width="' + br + '" height="' + bandH +
         '" fill="var(--hauch)" stroke="var(--linie)"/>';
    s += '<text x="' + xR + '" y="' + (MT - 6) + '" text-anchor="end" font-size="11" ' +
         'fill="var(--text-leise)">Leitungsband</text>';
    // Valenzband (unten)
    s += '<rect x="' + xL + '" y="' + yVal + '" width="' + br + '" height="' + bandH +
         '" fill="var(--hauch)" stroke="var(--linie)"/>';
    s += '<text x="' + xR + '" y="' + (yVal + bandH + 14) + '" text-anchor="end" font-size="11" ' +
         'fill="var(--text-leise)">Valenzband</text>';
    // Bandluecke (gestrichelte Begrenzungen)
    s += '<line x1="' + xL + '" y1="' + yLeit + '" x2="' + xR + '" y2="' + yLeit +
         '" stroke="var(--linie)" stroke-dasharray="4 4"/>';
    s += '<line x1="' + xL + '" y1="' + yVal + '" x2="' + xR + '" y2="' + yVal +
         '" stroke="var(--linie)" stroke-dasharray="4 4"/>';
    // Sprung-Pfeil in LED-Farbe (vom Valenz- ins Leitungsband)
    const idDef = "led-pfeil-" + Math.random().toString(36).slice(2, 8);
    s += '<defs><marker id="' + idDef + '" markerWidth="9" markerHeight="9" refX="6" refY="3" ' +
         'orient="auto"><path d="M0,0 L7,3 L0,6 Z" fill="' + farbe + '"/></marker></defs>';
    s += '<line x1="' + xM + '" y1="' + yVal + '" x2="' + xM + '" y2="' + yLeit +
         '" stroke="' + farbe + '" stroke-width="3" marker-end="url(#' + idDef + ')"/>';
    // Energie-Beschriftung an der Luecke
    const yMitte = (yLeit + yVal) / 2;
    s += '<text x="' + (xM + 10) + '" y="' + (yMitte + 4) + '" font-size="12" font-weight="600" ' +
         'fill="' + farbe + '">E = ' + fmtEv(led.U) + ' eV</text>';
    // Leuchtpunkt in LED-Farbe (Photon)
    s += '<circle cx="' + (xL + 18) + '" cy="' + (MT - 12) + '" r="0"/>';
    svg.innerHTML = s;
  }

  function waehle(i) {
    const led = leds[i];
    knoepfe.forEach((b, j) => {
      const aktiv = j === i;
      b.setAttribute("aria-pressed", String(aktiv));
      b.style.background = aktiv ? led.farbe : "var(--flaeche)";
      b.style.color = aktiv ? "#fff" : "var(--text)";
    });
    bandschema(led);
    svg.setAttribute("aria-label",
      "Bandschema für " + led.name + ": Bandlücke entspricht " + fmtEv(led.U) + " Elektronenvolt.");
    const eV = led.U;            // E in eV gleicht Zahlwert von U_E in V
    const joule = eV * e;        // E in Joule
    let txt = "<strong>" + led.name + ":</strong> U_E = " + fmtU(led.U) + " V → E = " +
              fmtEv(eV) + " eV ≈ " + fmtJ(joule);
    if (led.lambda) txt += " &nbsp;(λ ≈ " + kommma(led.lambda) + " nm)";
    out.innerHTML = txt;
  }

  wrap.append(leiste, svg, out);
  container.append(wrap);
  // Standardauswahl: erste LED (Rot)
  waehle(0);
}
