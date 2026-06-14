// Winkel messen und Winkelarten — ein Winkel zwischen zwei Schenkeln zum Anfassen
// (Geometrie der Sekundarstufe I). Modus „statisch“: am Regler den Winkel α (in Grad)
// einstellen → Schenkel, Winkelbogen, Winkelmesser und die Benennung der Winkelart
// werden sofort neu gerechnet und gezeichnet.
//
// Modell (exakt): Ein Winkel wird durch zwei Schenkel gebildet, die vom Scheitel S
// ausgehen. Der erste Schenkel zeigt fest waagerecht nach rechts (Richtung 0°), der
// zweite ist um α gegen den Uhrzeigersinn gedreht. Gemessen wird in Grad (0° … 360°).
// Klassifikation (mathematische Winkelarten):
//   spitzer Winkel       0° < α < 90°
//   rechter Winkel       α = 90°
//   stumpfer Winkel      90° < α < 180°
//   gestreckter Winkel   α = 180°   (halbe Drehung)
//   überstumpfer Winkel  180° < α < 360°
//   Vollwinkel           α = 360°   (volle Drehung)
// Kodierung der Art: 0 = spitz, 1 = recht, 2 = stumpf, 3 = gestreckt,
//                    4 = überstumpf, 5 = Vollwinkel.
// Grenzfall α = 0°: wird als spitzer Grenzfall (Art = 0) behandelt.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// Toleranz, mit der „glatte“ Winkel (90, 180, 360) als Gleichheit gelten.
// Die Schrittweite des Reglers ist 5°, daher ist eine kleine Toleranz unkritisch.
const EPS = 1e-6;

// Winkelart als Code 0..5 aus dem Winkel α (in Grad) bestimmen (if/else-Klassifikation)
function winkelArt(alpha) {
  if (alpha >= 360 - EPS) return 5;          // Vollwinkel (α = 360°)
  if (alpha > 180 + EPS) return 4;           // überstumpfer Winkel (180° < α < 360°)
  if (Math.abs(alpha - 180) <= EPS) return 3; // gestreckter Winkel (α = 180°)
  if (alpha > 90 + EPS) return 2;            // stumpfer Winkel (90° < α < 180°)
  if (Math.abs(alpha - 90) <= EPS) return 1; // rechter Winkel (α = 90°)
  return 0;                                   // spitzer Winkel (0° ≤ α < 90°)
}

// Klartext-Name der Winkelart (für die Beschriftung in der Zeichnung)
const ART_NAME = ["spitzer Winkel", "rechter Winkel", "stumpfer Winkel",
                  "gestreckter Winkel", "überstumpfer Winkel", "Vollwinkel"];

export const manifest = {
  id: "mathematik/winkel-messen",
  titel: "Winkel messen und Winkelarten",
  modus: "statisch",
  raster: false,     // eigener Winkelmesser als Hintergrund, kein Karo-Raster mit „m“
  werkzeuge: false,  // der Winkelmesser ist Teil der Zeichnung; Wert steht in der Anzeige
  parameter: [
    { id: "winkel", label: "Winkel α", einheit: "°", min: 0, max: 360, schritt: 5, start: 45 }
  ],
  anzeigen: [
    { id: "winkel", label: "Winkel α", einheit: "°", stellen: 0 }
  ],
  presets: [
    { name: "rechter Winkel",      werte: { winkel: 90 } },
    { name: "stumpfer Winkel",     werte: { winkel: 120 } },
    { name: "überstumpfer Winkel", werte: { winkel: 250 } }
  ],
  vorhersage: {
    frage: "Ein Winkel ist größer als 90°, aber kleiner als 180°. Wie heißt diese Winkelart?",
    optionen: [
      "spitzer Winkel",
      "stumpfer Winkel",
      "überstumpfer Winkel"
    ],
    aufloesung: "Es ist ein stumpfer Winkel. Merke dir die Reihenfolge: spitz (0°–90°), rechter Winkel (genau 90°), stumpf (90°–180°), gestreckter Winkel (genau 180°), überstumpf (180°–360°), Vollwinkel (genau 360°). Stelle mit dem Regler z. B. 120° ein — der Winkel ist sichtbar weiter geöffnet als ein rechter Winkel, aber noch kein gestreckter."
  },
  beobachtung: [
    "Stelle nacheinander 30°, 60° und 80° ein. Alle drei sind spitze Winkel — sie sind enger geöffnet als ein rechter Winkel. Ab welchem Wert wechselt die Benennung?",
    "Stelle genau 90° ein (Preset „rechter Winkel“). Die beiden Schenkel stehen senkrecht aufeinander. Im rechten Winkel wird statt eines Bogens oft ein kleines Quadrat eingezeichnet — achte darauf in der Zeichnung.",
    "Stelle 180° ein. Die beiden Schenkel bilden eine gerade Linie — das ist der gestreckte Winkel, eine halbe Drehung. Verdopple gedanklich: Welcher Winkel entspricht einer ganzen Drehung?",
    "Drehe den Regler über 180° hinaus (z. B. 220°, 300°). Jetzt ist der Winkel überstumpf: Der Winkelbogen läuft auf der großen Seite (mehr als eine halbe Drehung) herum. Bei genau 360° ist es ein Vollwinkel."
  ],
  modellgrenzen: "Dargestellt werden Winkel von 0° bis 360° und ihre mathematischen Winkelarten. Der erste Schenkel zeigt immer waagerecht nach rechts, gemessen wird gegen den Uhrzeigersinn (mathematisch positiver Drehsinn). Negative Winkel oder Winkel über 360° (mehrfache Drehungen) sind nicht dargestellt.",
  bilanz: {
    winkel: { label: "Winkel α", einheit: "°", stellen: 0 },
    art:    { label: "Winkelart (0=spitz,1=recht,2=stumpf,3=gestreckt,4=überstumpf,5=Vollwinkel)", einheit: "", stellen: 0 }
  }
};

// ---------- Modell (exakte Klassifikation) ----------

export function init(p) {
  const alpha = p.winkel;
  return { t: 0, winkel: alpha, art: winkelArt(alpha) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { winkel: z.winkel };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return { winkel: z.winkel, art: z.art };
}

// ---------- Sichtbarer Weltausschnitt ----------
// Quadratisch und symmetrisch um den Scheitel (Ursprung), damit der Winkelmesser ein
// echter Halbkreis/Kreis bleibt (welt.px/py bilden gleichmaßstäblich ab).
export function weltBereich() {
  return { xMin: -1.25, xMax: 1.25, yMin: -1.25, yMax: 1.25 };
}

// ---------- Darstellung ----------

// Mathematik-Fachfarbe aus den Design-Tokens (Fallback: Akzentfarbe der Engine)
function matheFarbe(stil) {
  if (typeof document === "undefined") return stil.akzent;
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

// Hex/rgb-Farbe der Tokens mit Alpha versehen
function farbeMitAlpha(farbe, alpha) {
  if (farbe.startsWith("#")) {
    let h = farbe.slice(1);
    if (h.length === 3) h = h.split("").map(c => c + c).join("");
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const m = farbe.match(/(\d+)[,\s]+(\d+)[,\s]+(\d+)/);
  if (m) return `rgba(${m[1]},${m[2]},${m[3]},${alpha})`;
  return farbe;
}

const GRAD = Math.PI / 180;

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const mathe = matheFarbe(stil);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  const cx = welt.px(0), cy = welt.py(0);     // Scheitelpunkt in Pixeln
  const rSchenkel = welt.laenge(1.0);          // Länge der Schenkel (Weltlänge 1)
  const rMesser   = welt.laenge(1.05);         // Radius des Winkelmesser-Hintergrunds
  const rBogen    = welt.laenge(0.42);         // Radius des Winkelbogens
  const alpha = z.winkel;
  const aRad = alpha * GRAD;
  const ueberstumpf = z.art === 4;             // großer Bogen (> 180°) zeichnen?

  // Hilfsfunktion: Canvas-Winkel. In Weltkoordinaten zeigt +y nach oben, im Canvas nach
  // unten — daher wird der mathematische Winkel zum Zeichnen negiert (gegen den
  // Uhrzeigersinn in der Welt = im Canvas mit negativem Winkel um den Scheitel).
  const cwx = (winkelGrad, radiusPx) => cx + radiusPx * Math.cos(winkelGrad * GRAD);
  const cwy = (winkelGrad, radiusPx) => cy - radiusPx * Math.sin(winkelGrad * GRAD);

  // ---------- Winkelmesser-Hintergrund (Halbkreis 0°..180° + Skala) ----------
  ctx.save();
  // Halbkreisscheibe (oben) als blasse Fläche
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, rMesser, 0, Math.PI, true); // 0..180° (im Canvas: gegen den Uhrzeigersinn = oben)
  ctx.closePath();
  ctx.fillStyle = farbeMitAlpha(stil.beschriftung, 0.07);
  ctx.fill();
  // Gradskala: lange Striche alle 30°, kurze alle 10° — voller Kreis (0..360)
  ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.55);
  ctx.fillStyle = stil.beschriftung;
  ctx.font = (parseFloat(stil.schrift) ? Math.max(10, parseFloat(stil.schrift) - 1) : 11) + "px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  for (let g = 0; g < 360; g += 10) {
    const lang = (g % 30 === 0);
    ctx.lineWidth = lang ? 1.4 : 0.8;
    const rInnen = rMesser - (lang ? welt.laenge(0.10) : welt.laenge(0.055));
    ctx.beginPath();
    ctx.moveTo(cwx(g, rInnen), cwy(g, rInnen));
    ctx.lineTo(cwx(g, rMesser), cwy(g, rMesser));
    ctx.stroke();
    if (lang) {
      const rText = rMesser + welt.laenge(0.10);
      ctx.fillText(String(g), cwx(g, rText), cwy(g, rText));
    }
  }
  // Vollkreis-Umriss dünn
  ctx.lineWidth = 1;
  ctx.strokeStyle = farbeMitAlpha(stil.beschriftung, 0.35);
  ctx.beginPath();
  ctx.arc(cx, cy, rMesser, 0, 2 * Math.PI);
  ctx.stroke();
  ctx.restore();

  // ---------- Winkelfläche (Sektor) zwischen den Schenkeln ----------
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  // Canvas-arc: positiver Winkel im Uhrzeigersinn (y nach unten). Der mathematisch
  // positive Sektor 0..α (gegen den Uhrzeigersinn) entspricht im Canvas dem Bogen
  // von 0 nach −aRad, also „anticlockwise = true“ von 0 bis −aRad.
  ctx.arc(cx, cy, rBogen, 0, -aRad, true);
  ctx.closePath();
  ctx.fillStyle = farbeMitAlpha(mathe, ueberstumpf ? 0.12 : 0.20);
  ctx.fill();
  ctx.restore();

  // ---------- Schenkel ----------
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 0.5;
  // 1. Schenkel: fest waagerecht nach rechts (0°)
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cwx(0, rSchenkel), cwy(0, rSchenkel));
  ctx.stroke();
  // 2. Schenkel: um α gegen den Uhrzeigersinn gedreht
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(cwx(alpha, rSchenkel), cwy(alpha, rSchenkel));
  ctx.stroke();

  // ---------- Winkelbogen (bzw. rechtes-Winkel-Kästchen) ----------
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke + 0.5;
  if (z.art === 1) {
    // Rechter Winkel: kleines Quadrat statt Bogen
    const s = welt.laenge(0.16);
    ctx.beginPath();
    ctx.moveTo(cx + s, cy);
    ctx.lineTo(cx + s, cy - s);
    ctx.lineTo(cx, cy - s);
    ctx.stroke();
  } else if (alpha > EPS) {
    // Bogen von 0° bis α. Bei überstumpfen Winkeln ist α > 180°, der Bogen läuft
    // automatisch über die große Seite (mehr als eine halbe Drehung).
    ctx.beginPath();
    ctx.arc(cx, cy, rBogen, 0, -aRad, true);
    ctx.stroke();
  }

  // ---------- Scheitelpunkt ----------
  ctx.fillStyle = stil.text;
  ctx.beginPath();
  ctx.arc(cx, cy, Math.max(3, stil.linienstaerke + 1), 0, 2 * Math.PI);
  ctx.fill();
  // Beschriftung „S“ am Scheitel
  const basis = parseFloat(stil.schrift) || 12;
  ctx.font = "700 " + Math.max(11, basis) + "px sans-serif";
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillText("S", cx - 6, cy + 6);

  // ---------- Gradzahl an der Winkelhalbierenden ----------
  // Position: in Richtung der Winkelhalbierenden (α/2), bei überstumpf nach außen
  // auf der großen Seite (α/2 + 180°), damit die Zahl im offenen Sektor steht.
  const halb = ueberstumpf ? (alpha / 2 + 180) : (alpha / 2);
  const rZahl = welt.laenge(ueberstumpf ? 0.60 : 0.58);
  const zx = cwx(halb, rZahl), zy = cwy(halb, rZahl);
  ctx.font = "700 " + Math.max(15, basis + 6) + "px sans-serif";
  ctx.fillStyle = mathe;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(formatZahl(alpha, 0) + "°", zx, zy);

  // ---------- Winkelart als Wort (groß, oben) ----------
  ctx.font = "700 " + Math.max(16, basis + 7) + "px sans-serif";
  ctx.fillStyle = stil.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(ART_NAME[z.art], 12, 10);
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch aus der Klassifikation:
//   45° → spitz (0), 90° → recht (1), 120° → stumpf (2),
//   180° → gestreckt (3), 270° → überstumpf (4).
// (toleranzProzent 1 für den Winkel; bei Soll = 0 prüft die Validierung absolut —
//  die Art wird daher als ganze Zahl exakt verglichen.)

export const pruefFaelle = [
  {
    name: "45° — spitzer Winkel",
    parameter: { winkel: 45 },
    toleranzProzent: 1,
    soll: { winkel: 45, art: 0 }
  },
  {
    name: "90° — rechter Winkel",
    parameter: { winkel: 90 },
    toleranzProzent: 1,
    soll: { winkel: 90, art: 1 }
  },
  {
    name: "120° — stumpfer Winkel",
    parameter: { winkel: 120 },
    toleranzProzent: 1,
    soll: { winkel: 120, art: 2 }
  },
  {
    name: "180° — gestreckter Winkel",
    parameter: { winkel: 180 },
    toleranzProzent: 1,
    soll: { art: 3 }
  },
  {
    name: "270° — überstumpfer Winkel",
    parameter: { winkel: 270 },
    toleranzProzent: 1,
    soll: { art: 4 }
  }
];
