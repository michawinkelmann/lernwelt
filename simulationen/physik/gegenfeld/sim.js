// Photoeffekt: Gegenfeldmethode — Licht löst Elektronen aus der Katode einer Photozelle,
// eine Gegenspannung bremst sie ab. Modus „statisch“: Parameter ändern → sofort neu
// rechnen und zeichnen (istFertig liefert sofort true, update ist leer).
// Modell (Sek. II, Schulniveau):
//   E_Ph = h·c/λ                Photonenenergie (in eV über h·c/e ≈ 1239,84 eV·nm)
//   E_kin,max = E_Ph − W_A      Einstein-Gleichung (nur falls E_Ph > W_A)
//   e·U₀ = E_kin,max            Grenzspannung der Gegenfeldmethode
//   I_rel = max(0, 1 − U/U₀)    linear fallender Relativstrom — bewusste Vereinfachung
// Links: Photozelle mit Stromkreis (Lichtpfeil in Spektralfarbe der Wellenlänge,
// Elektronenpfeile, Quelle mit U). Rechts: f-U₀-Diagramm mit Gerade der Steigung h/e.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// Naturkonstanten — alle Rechnungen und Prüffälle laufen über genau diese Werte
const H = 6.62607e-34;            // Js — Plancksches Wirkungsquantum
const C = 2.99792458e8;           // m/s — Lichtgeschwindigkeit
const E = 1.602177e-19;           // C — Elementarladung
const HC_EVNM = H * C / E * 1e9;  // h·c/e ≈ 1239,84 eV·nm
const STEIGUNG_V = H / E * 1e14;  // h/e in Volt je 10¹⁴ Hz ≈ 0,4136 V

export const manifest = {
  id: "physik/gegenfeld",
  titel: "Photoeffekt: Gegenfeldmethode",
  modus: "statisch",
  raster: false,     // Schaltbild + eigenes Diagramm statt Koordinatenraster
  werkzeuge: false,  // Lineal/Winkelmesser ergeben am Schaltbild keinen Sinn
  parameter: [
    { id: "lambda", label: "Wellenlänge",     einheit: "nm", min: 200, max: 700, schritt: 5,    start: 400 },
    { id: "wa",     label: "Austrittsarbeit", einheit: "eV", min: 1.5, max: 5,   schritt: 0.01, start: 1.94 },
    { id: "u",      label: "Gegenspannung",   einheit: "V",  min: 0,   max: 3,   schritt: 0.01, start: 0 }
  ],
  anzeigen: [
    { id: "ePh",      label: "Photonenenergie",     einheit: "eV",       stellen: 3 },
    { id: "u0",       label: "Grenzspannung U₀",    einheit: "V",        stellen: 3 },
    { id: "f14",      label: "Frequenz",            einheit: "·10¹⁴ Hz", stellen: 3 },
    { id: "fG14",     label: "Grenzfrequenz",       einheit: "·10¹⁴ Hz", stellen: 3 },
    { id: "stromRel", label: "Fotostrom (relativ)", einheit: "",         stellen: 2 }
  ],
  presets: [
    { name: "Cäsium + violett",       werte: { lambda: 405, wa: 1.94, u: 0 } },
    { name: "Zink + UV",              werte: { lambda: 250, wa: 4.34, u: 0 } },
    { name: "Knapp unter der Grenze", werte: { lambda: 546, wa: 2.28, u: 0 } }
  ],
  vorhersage: {
    frage: "Macht helleres Licht die Elektronen schneller?",
    optionen: [
      "Ja — mehr Intensität bedeutet mehr Energie für jedes Elektron",
      "Nein — nur höhere Frequenz (kleinere Wellenlänge) macht sie schneller",
      "Nein — helleres Licht macht die Elektronen sogar langsamer"
    ],
    aufloesung: "Nein — die Intensität ändert die Geschwindigkeit nicht. Helleres Licht bedeutet nur mehr Photonen pro Sekunde, also mehr ausgelöste Elektronen; jedes einzelne Photon trägt aber unverändert die Energie E = h·f. Deshalb hat diese Simulation gar keinen Helligkeitsregler: Auf E_kin,max — und damit auf die Grenzspannung U₀ — wirken nur die Wellenlänge (Frequenz) und die Austrittsarbeit. Genau an diesem Befund scheiterte das Wellenmodell."
  },
  beobachtung: [
    "Bestimme die Grenzfrequenz von Zink: Wähle das Preset „Zink + UV“, lasse U = 0 und schiebe die Wellenlänge zu größeren Werten, bis der Fotostrom gerade verschwindet. Rechne f = c/λ aus und vergleiche mit der angezeigten Grenzfrequenz.",
    "Vergleiche die Gerade im f-U₀-Diagramm für zwei Materialien, z. B. Cäsium (1,94 eV) und Zink (4,34 eV): Was verschiebt sich — und was bleibt gleich? Die Steigung ist h/e, eine Naturkonstante, unabhängig vom Katodenmaterial.",
    "Stelle bei fester Wellenlänge die Gegenspannung so ein, dass der Fotostrom gerade null wird. Dann gilt U = U₀, und du liest direkt E_kin,max = e·U₀ ab — bei 400 nm auf Cäsium z. B. rund 1,16 eV."
  ],
  modellgrenzen: "Die Lichtintensität ist nicht modelliert — der Fotostrom ist nur ein Relativwert (1 = ohne Gegenfeld). Der lineare Stromabfall bis U₀ ist eine Schulbuch-Vereinfachung; real bestimmt die Energieverteilung der Elektronen die Kurvenform. Temperatureffekte (z. B. thermische Auslösung) bleiben unberücksichtigt.",
  bilanz: {
    ePh:      { label: "Photonenenergie",     einheit: "eV",       stellen: 3 },
    u0:       { label: "Grenzspannung U₀",    einheit: "V",        stellen: 3 },
    f14:      { label: "Frequenz",            einheit: "·10¹⁴ Hz", stellen: 3 },
    fG14:     { label: "Grenzfrequenz",       einheit: "·10¹⁴ Hz", stellen: 3 },
    stromRel: { label: "Fotostrom (relativ)", einheit: "",         stellen: 2 }
  },
  welt: { xMin: 0, xMax: 10, yMin: 0, yMax: 5 }
};

// ---------- Modell (rein algebraisch, keine Zeitabhängigkeit) ----------

function rechne(p) {
  const ePh = HC_EVNM / p.lambda;                 // Photonenenergie in eV
  const eKin = Math.max(0, ePh - p.wa);           // Einstein-Gleichung, in eV
  const u0 = eKin;                                // e·U₀ = E_kin,max → Zahlenwert in V
  const f14 = C / (p.lambda * 1e-9) / 1e14;       // Frequenz in 10¹⁴ Hz
  const fG14 = p.wa * E / H / 1e14;               // Grenzfrequenz f_G = W_A/h in 10¹⁴ Hz
  const stromRel = ePh > p.wa ? Math.max(0, 1 - p.u / u0) : 0; // lineares Schulmodell
  return { ePh, u0, f14, fG14, stromRel };
}

export function init(p) {
  return { t: 0, ...rechne(p) };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { ePh: z.ePh, u0: z.u0, f14: z.f14, fG14: z.fG14, stromRel: z.stromRel };
}

export function istFertig() { return true; }

// Bilanz = Messwerte: Die Prüffälle vergleichen direkt gegen die angezeigten Größen
export function bilanz(z) { return messwerte(z); }

// ---------- Zeichnen: links Photozelle, rechts f-U₀-Diagramm ----------

// Näherungsweise Spektralfarbe über den HSL-Farbton (einzige Nicht-Token-Farbe,
// wie in den Spektren-SVGs): 380 nm → Violett, 700 nm → Rot; UV als gedecktes Violett.
function spektralFarbe(lambda) {
  if (lambda < 380) return "hsl(282, 55%, 48%)";
  const stuetzen = [[380, 275], [440, 240], [490, 180], [540, 120], [590, 60], [650, 25], [700, 0]];
  let ton = 0;
  for (let i = 0; i < stuetzen.length - 1; i++) {
    const [l1, t1] = stuetzen[i], [l2, t2] = stuetzen[i + 1];
    if (lambda >= l1 && lambda <= l2) ton = t1 + (t2 - t1) * (lambda - l1) / (l2 - l1);
  }
  return "hsl(" + Math.round(ton) + ", 85%, 50%)";
}

// Pfeil von (x1|y1) nach (x2|y2) in Weltkoordinaten, Kopfgröße wächst mit der Liniendicke
function pfeil(ctx, welt, x1, y1, x2, y2, farbe, dicke) {
  const ax = welt.px(x1), ay = welt.py(y1), bx = welt.px(x2), by = welt.py(y2);
  const w = Math.atan2(by - ay, bx - ax);
  const k = Math.max(7, dicke * 2.4);
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineWidth = dicke;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx - 0.6 * k * Math.cos(w), by - 0.6 * k * Math.sin(w));
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(bx, by);
  ctx.lineTo(bx - k * Math.cos(w - 0.45), by - k * Math.sin(w - 0.45));
  ctx.lineTo(bx - k * Math.cos(w + 0.45), by - k * Math.sin(w + 0.45));
  ctx.closePath();
  ctx.fill();
}

// Rechteck mit runden Ecken (Pixelkoordinaten) — Glasröhre der Photozelle
function rundRect(ctx, x, y, b, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + b, y, x + b, y + h, r);
  ctx.arcTo(x + b, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + b, y, r);
  ctx.closePath();
}

// DIN-Symbol Quelle in waagerechter Leitung: langer dünner Strich = Pluspol (links,
// zur Katode), kurzer dicker Strich = Minuspol (rechts, zur Anode) → Gegenfeld
function zeichneQuelle(ctx, welt, stil, cx, cy) {
  ctx.strokeStyle = stil.text;
  ctx.lineCap = "butt";
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(cx - 0.14), welt.py(cy - 0.34));
  ctx.lineTo(welt.px(cx - 0.14), welt.py(cy + 0.34));
  ctx.stroke();
  ctx.lineWidth = stil.linienstaerke * 3;
  ctx.beginPath();
  ctx.moveTo(welt.px(cx + 0.14), welt.py(cy - 0.14));
  ctx.lineTo(welt.px(cx + 0.14), welt.py(cy + 0.14));
  ctx.stroke();
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const klein = welt.massstab < 45; // schmale Bildschirme: kompaktere Schrift
  const schrift = klein ? "10px sans-serif" : stil.schrift;
  const fett = "bold " + schrift;
  const lichtFarbe = spektralFarbe(p.lambda);

  // ===== Photozelle (links) =====
  // Glasröhre (Vakuum)
  ctx.fillStyle = stil.hauch;
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = stil.linienstaerke;
  rundRect(ctx, welt.px(0.7), welt.py(4.0), welt.laenge(3.8), welt.laenge(2.5), welt.laenge(0.22));
  ctx.fill();
  ctx.stroke();

  // Katode (Platte links) und Anode (Ring im Schnitt: zwei Stummel rechts)
  ctx.fillStyle = stil.text;
  ctx.fillRect(welt.px(1.05), welt.py(3.75), welt.laenge(0.13), welt.laenge(2.0));
  ctx.fillRect(welt.px(3.9), welt.py(3.75), welt.laenge(0.1), welt.laenge(0.7));
  ctx.fillRect(welt.px(3.9), welt.py(2.45), welt.laenge(0.1), welt.laenge(0.7));
  ctx.font = schrift;
  ctx.fillStyle = stil.beschriftung;
  ctx.textBaseline = "middle";
  ctx.textAlign = "right";
  ctx.fillText("Katode", welt.px(1.0), welt.py(1.3));
  ctx.textAlign = "left";
  ctx.fillText("Anode", welt.px(4.07), welt.py(1.3));

  // Lichtpfeil in Spektralfarbe, von oben links auf die Katode
  pfeil(ctx, welt, 0.18, 4.82, 1.02, 3.72, lichtFarbe, stil.linienstaerke + 2);
  ctx.font = fett;
  ctx.fillStyle = lichtFarbe;
  ctx.textAlign = "left";
  ctx.fillText("λ = " + formatZahl(p.lambda, 0) + " nm" + (p.lambda < 380 ? " (UV)" : ""), welt.px(1.2), welt.py(4.55));

  // Elektronen: Pfeillänge skaliert mit dem Relativstrom
  if (z.stromRel > 0) {
    const laengeE = 0.25 + 2.05 * z.stromRel;
    [2.32, 2.75, 3.18].forEach(y => pfeil(ctx, welt, 1.35, y, 1.35 + laengeE, y, stil.akzent, stil.linienstaerke + 1));
    ctx.font = schrift;
    ctx.fillStyle = stil.akzent;
    ctx.textAlign = "center";
    ctx.fillText("e⁻", welt.px(1.35 + laengeE / 2), welt.py(3.5));
  } else if (z.ePh <= p.wa) {
    // deutlicher Hinweis: unterhalb der Grenzfrequenz löst Licht nichts aus
    ctx.font = fett;
    ctx.fillStyle = stil.fehler;
    ctx.textAlign = "center";
    const zeilen = klein
      ? ["kein Fotostrom —", "Frequenz unter der", "Grenzfrequenz"]
      : ["kein Fotostrom —", "Frequenz unter der Grenzfrequenz"];
    zeilen.forEach((zeile, i) => ctx.fillText(zeile, welt.px(2.55), welt.py(3.05 - 0.34 * i)));
  } else {
    // E_Ph > W_A, aber die Gegenspannung lässt kein Elektron mehr ankommen
    ctx.font = fett;
    ctx.fillStyle = stil.text;
    ctx.textAlign = "center";
    ctx.fillText("kein Fotostrom — U ≥ U₀", welt.px(2.55), welt.py(2.78));
  }

  // Stromkreis unter der Röhre (Lücken für Messgerät und Quelle)
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(welt.px(1.12), welt.py(1.78));
  ctx.lineTo(welt.px(1.12), welt.py(0.8));
  ctx.lineTo(welt.px(1.63), welt.py(0.8));
  ctx.moveTo(welt.px(2.27), welt.py(0.8));
  ctx.lineTo(welt.px(2.86), welt.py(0.8));
  ctx.moveTo(welt.px(3.14), welt.py(0.8));
  ctx.lineTo(welt.px(3.95), welt.py(0.8));
  ctx.lineTo(welt.px(3.95), welt.py(1.78));
  ctx.stroke();

  // Strommessgerät (Kreis mit A)
  ctx.beginPath();
  ctx.arc(welt.px(1.95), welt.py(0.8), welt.laenge(0.32), 0, 2 * Math.PI);
  ctx.fillStyle = stil.flaeche;
  ctx.fill();
  ctx.stroke();
  ctx.font = schrift;
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.fillText("A", welt.px(1.95), welt.py(0.8));

  // Gegenspannungsquelle: Pluspol zur Katode, Minuspol zur Anode
  zeichneQuelle(ctx, welt, stil, 3.0, 0.8);
  ctx.font = schrift;
  ctx.fillStyle = stil.text;
  ctx.fillText("+", welt.px(2.72), welt.py(1.32));
  ctx.fillText("−", welt.px(3.28), welt.py(1.32));
  ctx.font = fett;
  ctx.fillText("U = " + formatZahl(p.u, 2) + " V", welt.px(3.0), welt.py(0.34));

  // ===== f-U₀-Diagramm (rechts) =====
  const DX0 = 5.6, DX1 = 9.8, DY0 = 1.0, DY1 = 4.4; // Zeichenbereich in Weltkoordinaten
  const FMAX = 16, UMAX = 5;                        // Achsen: f in 10¹⁴ Hz, U₀ in V
  const fx = f => DX0 + (f / FMAX) * (DX1 - DX0);
  const fy = u => DY0 + (u / UMAX) * (DY1 - DY0);

  // Achsen mit Pfeilspitzen
  pfeil(ctx, welt, DX0, DY0, DX1 + 0.12, DY0, stil.text, stil.linienstaerke);
  pfeil(ctx, welt, DX0, DY0, DX0, DY1 + 0.12, stil.text, stil.linienstaerke);

  // Skalenstriche und Zahlen
  ctx.strokeStyle = stil.text;
  ctx.fillStyle = stil.beschriftung;
  ctx.font = schrift;
  ctx.lineWidth = 1;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  for (const f of [4, 8, 12]) {
    ctx.beginPath();
    ctx.moveTo(welt.px(fx(f)), welt.py(DY0));
    ctx.lineTo(welt.px(fx(f)), welt.py(DY0) + 5);
    ctx.stroke();
    if (!klein || f === 8) ctx.fillText(formatZahl(f, 0), welt.px(fx(f)), welt.py(DY0) + 7);
  }
  ctx.textAlign = "right";
  ctx.fillText("f in 10¹⁴ Hz", welt.px(DX1 + 0.12), welt.py(DY0) + 7);
  ctx.textBaseline = "middle";
  for (let u = 1; u <= 4; u++) {
    ctx.beginPath();
    ctx.moveTo(welt.px(DX0), welt.py(fy(u)));
    ctx.lineTo(welt.px(DX0) - 5, welt.py(fy(u)));
    ctx.stroke();
    ctx.fillText(formatZahl(u, 0), welt.px(DX0) - 7, welt.py(fy(u)));
  }
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("U₀ in V", welt.px(DX0 - 0.15), welt.py(DY1 + 0.22));
  if (!klein) {
    ctx.fillStyle = stil.text;
    ctx.font = fett;
    ctx.textAlign = "center";
    ctx.fillText("f-U₀-Diagramm", welt.px(7.9), welt.py(DY1 + 0.22));
  }

  // Angelegte Gegenspannung als gestrichelte Vergleichslinie
  if (p.u > 0.04) {
    ctx.strokeStyle = stil.beschriftung;
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(welt.px(DX0), welt.py(fy(p.u)));
    ctx.lineTo(welt.px(DX1), welt.py(fy(p.u)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = stil.beschriftung;
    ctx.font = schrift;
    ctx.textAlign = "left";
    ctx.fillText("U", welt.px(DX1 - 0.22), welt.py(fy(p.u) + 0.08));
  }

  // Gerade U₀(f) = (h/e)·f − W_A/e — nur oberhalb der Grenzfrequenz zeichnen
  const fEnde = Math.min(FMAX, (UMAX + p.wa) / STEIGUNG_V);
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke + 1;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(welt.px(fx(z.fG14)), welt.py(fy(0)));
  ctx.lineTo(welt.px(fx(fEnde)), welt.py(fy(STEIGUNG_V * fEnde - p.wa)));
  ctx.stroke();

  // Grenzfrequenz-Markierung auf der f-Achse
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.arc(welt.px(fx(z.fG14)), welt.py(fy(0)), stil.linienstaerke + 2.5, 0, 2 * Math.PI);
  ctx.fill();
  ctx.font = fett;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("f_G", welt.px(fx(z.fG14) - 0.22), welt.py(fy(0) + 0.14));

  // Aktueller Betriebspunkt (auf der Geraden) mit Ableselinien
  if (z.ePh > p.wa) {
    ctx.strokeStyle = stil.beschriftung;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath();
    ctx.moveTo(welt.px(fx(z.f14)), welt.py(fy(0)));
    ctx.lineTo(welt.px(fx(z.f14)), welt.py(fy(z.u0)));
    ctx.lineTo(welt.px(fx(0)), welt.py(fy(z.u0)));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = stil.text;
    ctx.beginPath();
    ctx.arc(welt.px(fx(z.f14)), welt.py(fy(z.u0)), stil.linienstaerke + 3, 0, 2 * Math.PI);
    ctx.fill();
    ctx.font = schrift;
    const rechtsLage = z.f14 > 11; // nahe am rechten Rand: Beschriftung nach links
    ctx.textAlign = rechtsLage ? "right" : "left";
    ctx.fillText("U₀ = " + formatZahl(z.u0, 2) + " V",
      welt.px(fx(z.f14) + (rechtsLage ? -0.18 : 0.18)), welt.py(fy(z.u0) + 0.1));
  } else {
    // Betriebspunkt liegt links der Grenzfrequenz: offener Punkt auf der f-Achse
    ctx.strokeStyle = stil.text;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.arc(welt.px(fx(z.f14)), welt.py(fy(0)), stil.linienstaerke + 3, 0, 2 * Math.PI);
    ctx.stroke();
  }
}

// ---------- Prüffälle (analytisch bekannte Lösungen) ----------
// Mit h = 6,62607e-34 Js, c = 2,99792458e8 m/s, e = 1,602177e-19 C gilt
// h·c/e = 1239,8417 eV·nm und h/e = 0,4135670 V je 10¹⁴ Hz. Daraus:
//   λ = 400 nm:  E_Ph = 3,099604 eV → U₀ = 1,159604 V;  f = c/λ = 7,494811·10¹⁴ Hz
//   λ = 546 nm:  E_Ph = 2,270772 eV < W_A = 2,28 eV → U₀ = 0, Strom 0
//   λ = 250 nm:  E_Ph = 4,959367 eV → U₀ = 0,619367 V; I_rel = 1 − 0,5/U₀ = 0,192724;
//                f_G = W_A·e/h = 10,494076·10¹⁴ Hz

export const pruefFaelle = [
  {
    name: "Violett auf Cäsium: λ = 400 nm, W_A = 1,94 eV, U = 0",
    parameter: { lambda: 400, wa: 1.94, u: 0 },
    toleranzProzent: 0.5,
    soll: { u0: 1.1596, f14: 7.4948 }
  },
  {
    name: "Knapp unter der Grenze: λ = 546 nm, W_A = 2,28 eV, U = 0",
    parameter: { lambda: 546, wa: 2.28, u: 0 },
    toleranzProzent: 0.5,
    soll: { u0: 0, stromRel: 0 }
  },
  {
    name: "UV auf Zink mit Gegenfeld: λ = 250 nm, W_A = 4,34 eV, U = 0,5 V",
    parameter: { lambda: 250, wa: 4.34, u: 0.5 },
    toleranzProzent: 0.5,
    soll: { u0: 0.61937, stromRel: 0.19272, fG14: 10.4941 }
  }
];
