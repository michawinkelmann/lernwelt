// Gasgesetze: Kolben und p-V-Diagramm — eine fest eingeschlossene Gasmenge im Zylinder.
// Modus „statisch“: Parameter ändern → sofort neu rechnen und zeichnen
// (istFertig liefert sofort true, update ist leer).
// Modell (ideales Gas, intern in SI-Einheiten):
//   p = n·R·T / V        mit V in m³ (1 l = 0,001 m³) und T in Kelvin
//   p·V = n·R·T          → bei fester Gasmenge ist p·V/T konstant (Klasse-10-Form)
// Links: Zylinder mit Kolben (Füllhöhe ∝ V), Teilchen mit Bewegungs-Schlieren
// (Länge ∝ √T) und Manometer-Balken. Rechts: p-V-Diagramm mit Isothermen.

import { formatZahl, schoeneSchrittweite } from "../../../assets/js/sim/welt.js";

// Allgemeine Gaskonstante — fürs Gymnasium nur eine Randnotiz: Im Vordergrund
// steht p·V/T = konstant; R legt den Zahlenwert dieser Konstante fest (p·V/T = n·R).
const R = 8.314;           // J/(mol·K)
const LITER = 0.001;       // 1 l = 0,001 m³
const DICHTE_START = 0.05; // mol je Liter im Normalzustand (0,1 mol auf 2 l) — Bezug für „relativ“

export const manifest = {
  id: "physik/gasgesetze",
  titel: "Gasgesetze: Kolben und p-V-Diagramm",
  modus: "statisch",
  raster: false,      // Zylinderbild + eigenes Diagramm statt Koordinatenraster
  werkzeuge: false,   // Lineal/Winkelmesser ergeben am Zylinderbild keinen Sinn
  parameter: [
    { id: "vol",  label: "Volumen",    einheit: "l",   min: 0.5,  max: 5,   schritt: 0.1,  start: 2 },
    { id: "temp", label: "Temperatur", einheit: "K",   min: 200,  max: 600, schritt: 10,   start: 300 },
    { id: "n",    label: "Gasmenge",   einheit: "mol", min: 0.05, max: 0.3, schritt: 0.05, start: 0.1 }
  ],
  anzeigen: [
    { id: "p",         label: "Druck",       einheit: "kPa", stellen: 2 },
    { id: "pv",        label: "p·V",         einheit: "J",   stellen: 2 },
    { id: "tempC",     label: "Temperatur",  einheit: "°C",  stellen: 0 },
    { id: "dichteRel", label: "Teilchen je Liter (relativ)", einheit: "", stellen: 2 }
  ],
  presets: [
    { name: "Normalzustand",    werte: { vol: 2, temp: 300, n: 0.1 } },
    { name: "Zusammengedrückt", werte: { vol: 1, temp: 300, n: 0.1 } },
    { name: "Erhitzt",          werte: { vol: 2, temp: 600, n: 0.1 } }
  ],
  vorhersage: {
    frage: "Das Volumen wird bei gleicher Temperatur halbiert (z. B. von 2 l auf 1 l). Was macht der Druck?",
    optionen: [
      "Er verdoppelt sich",
      "Er halbiert sich",
      "Er bleibt gleich — die Temperatur ändert sich ja nicht"
    ],
    aufloesung: "Er verdoppelt sich. Bei fester Temperatur und fester Gasmenge gilt p·V = konstant (Gesetz von Boyle-Mariotte): halbes Volumen → doppelter Druck. Im Teilchenmodell: Dieselben Teilchen sind jetzt auf halbem Raum eingesperrt und treffen die Wände doppelt so oft. Probiere es mit den Presets „Normalzustand“ und „Zusammengedrückt“ aus und behalte dabei die Anzeige p·V im Blick."
  },
  beobachtung: [
    "Boyle-Mariotte: Halbiere das Volumen von 2 l auf 1 l und lasse die Temperatur fest. Notiere die Anzeige p·V vorher und nachher — was fällt auf? Formuliere die Regel für T = konstant.",
    "Amontons: Verdopple bei festem Volumen (2 l) die Kelvin-Temperatur von 300 K auf 600 K. Was macht der Druck? Prüfe auch p·V: Warum ändert es sich jetzt, obwohl es in Auftrag 1 konstant blieb?",
    "Beobachte den Zustandspunkt im p-V-Diagramm: Er wandert nur dann <strong>entlang</strong> der Isotherme, wenn die Temperatur fest bleibt. Probiere es aus — ändere erst nur das Volumen, dann nur die Temperatur. Wohin verlässt der Punkt die Kurve?",
    "Erhöhe die Gasmenge n bei festem Volumen und fester Temperatur. Warum steigt der Druck? Begründe mit dem Teilchenmodell und der Anzeige „Teilchen je Liter (relativ)“: Was ändert sich an den Stößen auf die Zylinderwand?"
  ],
  modellgrenzen: "Ideales Gas: Die Teilchen sind punktförmig (kein Eigenvolumen) und üben keine Anziehungskräfte aufeinander aus — für Luft bei Alltagsbedingungen eine sehr gute Näherung, bei sehr hohem Druck oder nahe der Verflüssigung nicht mehr. Alle Änderungen verlaufen quasistatisch (langsam, das Gas bleibt im Gleichgewicht). Wichtig: In p·V/T = konstant steht immer die Kelvin-Temperatur — niemals °C in die Formel einsetzen!",
  bilanz: {
    p:         { label: "Druck",       einheit: "kPa", stellen: 2 },
    pv:        { label: "p·V",         einheit: "J",   stellen: 2 },
    tempC:     { label: "Temperatur",  einheit: "°C",  stellen: 0 },
    dichteRel: { label: "Teilchen je Liter (relativ)", einheit: "", stellen: 2 }
  },
  welt: { xMin: 0, xMax: 10, yMin: 0, yMax: 5 }
};

// ---------- Modell (rein algebraisch, keine Zeitabhängigkeit) ----------

function rechne(w) {
  const V = w.vol * LITER;            // Volumen in m³ (SI)
  const pPa = w.n * R * w.temp / V;   // Zustandsgleichung des idealen Gases, Druck in Pa
  return {
    pKpa: pPa / 1000,                 // Anzeige in kPa
    pv: pPa * V,                      // p·V in J — gleich n·R·T, hängt nur von T (und n) ab
    tempC: w.temp - 273.15,           // Kelvin → Celsius (nur zur Anzeige, nie zum Rechnen!)
    dichteRel: (w.n / w.vol) / DICHTE_START
  };
}

export function init(w) {
  return { t: 0, ...rechne(w) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { p: z.pKpa, pv: z.pv, tempC: z.tempC, dichteRel: z.dichteRel };
}

export function istFertig() { return true; }

// Bilanz = Messwerte: Die Prüffälle vergleichen direkt gegen die angezeigten Größen
export function bilanz(z) { return messwerte(z); }

// ---------- Zeichnen: links Zylinder mit Kolben, rechts p-V-Diagramm ----------

// Zylinder-Geometrie in Weltkoordinaten: Innenhöhe 3,3 Einheiten ≙ 5 l
const ZYL = { links: 1.0, rechts: 3.0, boden: 1.0, vollHoehe: 3.3, volMax: 5 };
const MANO_MAX_KPA = 1000; // feste Manometer-Skala 0–1000 kPa (Druckvergleich bleibt ablesbar)

// Deterministische Pseudozufallsfolge (Mulberry32): identisches Teilchenbild in
// jedem Frame — kein Flackern; mehr Gasmenge fügt nur weitere Teilchen hinzu.
function zufallsFolge(saat) {
  let a = saat >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Pfeil von (x1|y1) nach (x2|y2) in Weltkoordinaten (für die Diagrammachsen)
function pfeil(ctx, welt, x1, y1, x2, y2, farbe, dicke) {
  const ax = welt.px(x1), ay = welt.py(y1), bx = welt.px(x2), by = welt.py(y2);
  const wkl = Math.atan2(by - ay, bx - ax);
  const k = Math.max(7, dicke * 2.4);
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineWidth = dicke;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx - 0.6 * k * Math.cos(wkl), by - 0.6 * k * Math.sin(wkl));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - k * Math.cos(wkl - 0.45), by - k * Math.sin(wkl - 0.45));
  ctx.lineTo(bx - k * Math.cos(wkl + 0.45), by - k * Math.sin(wkl + 0.45));
  ctx.closePath();
  ctx.fill();
}

export function zeichne({ ctx, welt, zustand: z, werte: w, stil }) {
  const klein = welt.massstab < 45; // schmale Bildschirme: kompaktere Schrift
  const schrift = klein ? "10px sans-serif" : stil.schrift;
  const fett = "bold " + schrift;

  // ===== Zylinder mit Kolben (links) =====
  const gasHoehe = ZYL.vollHoehe * w.vol / ZYL.volMax; // Füllhöhe ∝ Volumen
  const gasOben = ZYL.boden + gasHoehe;
  const innenBreite = ZYL.rechts - ZYL.links;

  // Gasraum
  ctx.fillStyle = stil.hauch;
  ctx.fillRect(welt.px(ZYL.links), welt.py(gasOben), welt.laenge(innenBreite), welt.laenge(gasHoehe));

  // Teilchen mit Bewegungs-Schlieren: Anzahl ∝ n, Schlierenlänge ∝ √T —
  // dieselbe Zufallsfolge je Frame, auf den Gasraum begrenzt (Clip)
  const anzahl = Math.round(w.n * 200);                  // 0,05 mol → 10 … 0,3 mol → 60
  const schliere = 0.55 * Math.sqrt(w.temp / 600);       // Weltlänge des Geschwindigkeitsstrichs
  const wuerfel = zufallsFolge(42);
  ctx.save();
  ctx.beginPath();
  ctx.rect(welt.px(ZYL.links), welt.py(gasOben), welt.laenge(innenBreite), welt.laenge(gasHoehe));
  ctx.clip();
  for (let i = 0; i < anzahl; i++) {
    const tx = ZYL.links + 0.06 + wuerfel() * (innenBreite - 0.12);
    const ty = ZYL.boden + 0.06 + wuerfel() * Math.max(0.01, gasHoehe - 0.12);
    const winkel = wuerfel() * 2 * Math.PI;
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(welt.px(tx), welt.py(ty));
    ctx.lineTo(welt.px(tx - schliere * Math.cos(winkel)), welt.py(ty - schliere * Math.sin(winkel)));
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.fillStyle = stil.akzent;
    ctx.beginPath();
    ctx.arc(welt.px(tx), welt.py(ty), stil.linienstaerke + 1, 0, 2 * Math.PI);
    ctx.fill();
  }
  ctx.restore();

  // Kolben (sitzt direkt auf dem Gas), Kolbenstange und Griff
  ctx.fillStyle = stil.text;
  ctx.fillRect(welt.px(ZYL.links - 0.02), welt.py(gasOben + 0.16), welt.laenge(innenBreite + 0.04), welt.laenge(0.16));
  ctx.fillRect(welt.px(1.95), welt.py(4.78), welt.laenge(0.1), welt.laenge(4.78 - (gasOben + 0.16)));
  ctx.fillRect(welt.px(1.55), welt.py(4.92), welt.laenge(0.9), welt.laenge(0.14));

  // Zylinderwände (oben offen, damit der Kolben fahren kann)
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke + 1.5;
  ctx.lineCap = "butt";
  ctx.lineJoin = "miter";
  ctx.beginPath();
  ctx.moveTo(welt.px(ZYL.links), welt.py(ZYL.boden + ZYL.vollHoehe + 0.12));
  ctx.lineTo(welt.px(ZYL.links), welt.py(ZYL.boden));
  ctx.lineTo(welt.px(ZYL.rechts), welt.py(ZYL.boden));
  ctx.lineTo(welt.px(ZYL.rechts), welt.py(ZYL.boden + ZYL.vollHoehe + 0.12));
  ctx.stroke();

  // Beschriftung: Volumen neben dem Gasraum, T und n unter dem Zylinder
  ctx.font = fett;
  ctx.fillStyle = stil.text;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("V = " + formatZahl(w.vol, 1) + " l", welt.px(ZYL.rechts + 0.15), welt.py(Math.max(ZYL.boden + 0.3, gasOben - 0.25)));
  ctx.font = schrift;
  ctx.textAlign = "center";
  ctx.fillText("T = " + formatZahl(w.temp, 0) + " K · n = " + formatZahl(w.n, 2) + " mol", welt.px((ZYL.links + ZYL.rechts) / 2), welt.py(0.74));

  // Manometer-Balken (feste Skala 0–1000 kPa): Füllung ∝ Druck
  const balken = { x0: 0.9, x1: 2.55, y0: 0.22, y1: 0.46 };
  const anteil = Math.min(1, z.pKpa / MANO_MAX_KPA);
  ctx.fillStyle = stil.akzent;
  ctx.fillRect(welt.px(balken.x0), welt.py(balken.y1), welt.laenge((balken.x1 - balken.x0) * anteil), welt.laenge(balken.y1 - balken.y0));
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.strokeRect(welt.px(balken.x0), welt.py(balken.y1), welt.laenge(balken.x1 - balken.x0), welt.laenge(balken.y1 - balken.y0));
  ctx.strokeStyle = stil.beschriftung;
  ctx.fillStyle = stil.beschriftung;
  ctx.font = klein ? "9px sans-serif" : "11px sans-serif";
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let k = 0; k <= 4; k++) {
    const x = balken.x0 + (k / 4) * (balken.x1 - balken.x0);
    ctx.beginPath();
    ctx.moveTo(welt.px(x), welt.py(balken.y0));
    ctx.lineTo(welt.px(x), welt.py(balken.y0 - 0.06));
    ctx.stroke();
  }
  ctx.fillText("0", welt.px(balken.x0), welt.py(balken.y0 - 0.08));
  ctx.fillText("1.000 kPa", welt.px(balken.x1), welt.py(balken.y0 - 0.08));
  ctx.font = fett;
  ctx.fillStyle = stil.akzent;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("p = " + formatZahl(z.pKpa, klein ? 0 : 2) + " kPa", welt.px(balken.x1 + 0.12), welt.py((balken.y0 + balken.y1) / 2));

  // ===== p-V-Diagramm (rechts) =====
  const DX0 = 5.6, DX1 = 9.8, DY0 = 1.0, DY1 = 4.4; // Zeichenbereich in Weltkoordinaten
  const VACHSE = 5.9, VKURVE = 5;                   // V-Achse läuft etwas über die Kurven (bis 5 l) hinaus
  // p-Achse bis zur Spitze der 600-K-Isotherme bei 0,5 l → alle Kurven passen immer
  // ins Bild. pMax wächst mit n: Mehr Teilchen verschieben alle Isothermen nach außen.
  const pMax = w.n * R * 600 / 0.5;                 // p in kPa, da p[kPa] = n·R·T / V[l]
  const fx = v => DX0 + (v / VACHSE) * (DX1 - DX0);
  const fy = p => DY0 + (p / pMax) * (DY1 - DY0);

  // Achsen mit Pfeilspitzen
  pfeil(ctx, welt, DX0, DY0, DX1 + 0.15, DY0, stil.text, stil.linienstaerke);
  pfeil(ctx, welt, DX0, DY0, DX0, DY1 + 0.15, stil.text, stil.linienstaerke);

  // V-Skala (1 … 5 l)
  ctx.strokeStyle = stil.text;
  ctx.fillStyle = stil.beschriftung;
  ctx.font = schrift;
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (let v = 1; v <= VKURVE; v++) {
    ctx.beginPath();
    ctx.moveTo(welt.px(fx(v)), welt.py(DY0));
    ctx.lineTo(welt.px(fx(v)), welt.py(DY0) + 5);
    ctx.stroke();
    ctx.fillText(formatZahl(v, 0), welt.px(fx(v)), welt.py(DY0) + 7);
  }
  ctx.textAlign = "right";
  ctx.fillText("V in l", welt.px(DX1 + 0.15), welt.py(DY0) + 7);

  // p-Skala mit „schönen“ Schritten
  const sy = schoeneSchrittweite(pMax, 5);
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  for (let pt = sy; pt <= pMax + 1e-9; pt += sy) {
    ctx.beginPath();
    ctx.moveTo(welt.px(DX0), welt.py(fy(pt)));
    ctx.lineTo(welt.px(DX0) - 5, welt.py(fy(pt)));
    ctx.stroke();
    ctx.fillText(formatZahl(pt, 0), welt.px(DX0) - 7, welt.py(fy(pt)));
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("p in kPa", welt.px(DX0 - 0.15), welt.py(DY1 + 0.2));
  if (!klein) {
    ctx.fillStyle = stil.text;
    ctx.font = fett;
    ctx.textAlign = "center";
    ctx.fillText("p-V-Diagramm", welt.px((DX0 + DX1) / 2), welt.py(DY1 + 0.2));
  }

  // Isotherme p(V) = n·R·T0/V von 0,5 bis 5 l zeichnen
  const zeichneIsotherme = T0 => {
    ctx.beginPath();
    let begonnen = false;
    for (let v = 0.5; v <= VKURVE + 1e-9; v += 0.045) {
      const pk = w.n * R * T0 / v;
      if (pk > pMax * 1.0001) continue;
      const X = welt.px(fx(v)), Y = welt.py(fy(pk));
      if (begonnen) ctx.lineTo(X, Y); else { ctx.moveTo(X, Y); begonnen = true; }
    }
    ctx.stroke();
  };

  // Orientierungs-Isothermen 300 K und 600 K (gestrichelt)
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
  ctx.setLineDash([6, 5]);
  zeichneIsotherme(300);
  zeichneIsotherme(600);
  ctx.setLineDash([]);
  ctx.fillStyle = stil.beschriftung;
  ctx.font = schrift;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("600 K", welt.px(fx(0.8) + 0.1), welt.py(fy(w.n * R * 600 / 0.8)));
  ctx.fillText("300 K", welt.px(fx(0.8) + 0.1), welt.py(fy(w.n * R * 300 / 0.8)));

  // Aktuelle Isotherme (durchgezogen) + kleine Legende oben rechts
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.lineCap = "round";
  zeichneIsotherme(w.temp);
  const legende = "T = " + formatZahl(w.temp, 0) + " K";
  ctx.font = fett;
  ctx.fillStyle = stil.akzent;
  ctx.textAlign = "right";
  ctx.textBaseline = "middle";
  const legendeBreite = ctx.measureText(legende).width;
  ctx.fillText(legende, welt.px(9.7), welt.py(4.15));
  ctx.beginPath();
  ctx.moveTo(welt.px(9.7) - legendeBreite - 8 - welt.laenge(0.45), welt.py(4.15));
  ctx.lineTo(welt.px(9.7) - legendeBreite - 8, welt.py(4.15));
  ctx.stroke();

  // Aktueller Zustandspunkt mit Ableselinien zu beiden Achsen
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 3]);
  ctx.beginPath();
  ctx.moveTo(welt.px(fx(w.vol)), welt.py(fy(0)));
  ctx.lineTo(welt.px(fx(w.vol)), welt.py(fy(z.pKpa)));
  ctx.lineTo(welt.px(fx(0)), welt.py(fy(z.pKpa)));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.text;
  ctx.beginPath();
  ctx.arc(welt.px(fx(w.vol)), welt.py(fy(z.pKpa)), stil.linienstaerke + 3, 0, 2 * Math.PI);
  ctx.fill();
}

// ---------- Prüffälle (analytisch bekannte Lösungen) ----------
// Mit R = 8,314 J/(mol·K) gilt p[kPa] = n·R·T / V[l] und p·V = n·R·T in J:
//   V = 2 l, T = 300 K, n = 0,1 mol → p = 124,71 kPa, p·V = 249,42 J
//   V = 1 l, T = 300 K, n = 0,1 mol → p = 249,42 kPa (Boyle-Mariotte: halbes V, doppeltes p)
//   V = 4 l, T = 600 K, n = 0,1 mol → p = 124,71 kPa, p·V = 498,84 J (p·V/T unverändert)

export const pruefFaelle = [
  {
    name: "Normalzustand: V = 2 l, T = 300 K, n = 0,1 mol",
    parameter: { vol: 2, temp: 300, n: 0.1 },
    toleranzProzent: 0.3,
    soll: { p: 124.71, pv: 249.42 }
  },
  {
    name: "Boyle-Mariotte (halbes Volumen): V = 1 l, T = 300 K, n = 0,1 mol",
    parameter: { vol: 1, temp: 300, n: 0.1 },
    toleranzProzent: 0.3,
    soll: { p: 249.42 }
  },
  {
    name: "Gleicher Druck bei doppeltem V und T: V = 4 l, T = 600 K, n = 0,1 mol",
    parameter: { vol: 4, temp: 600, n: 0.1 },
    toleranzProzent: 0.3,
    soll: { p: 124.71, pv: 498.84 }
  }
];
