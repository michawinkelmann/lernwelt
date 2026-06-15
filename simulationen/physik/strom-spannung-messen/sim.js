// Spannung und Stromstärke messen — statisch-interaktiv: Lernende sehen, WO Messgeräte
// im Stromkreis angeschlossen werden (Amperemeter in REIHE in den Hauptkreis, Voltmeter
// PARALLEL über das Bauteil) und LESEN Strom I und Spannung U direkt an den Geräten ab.
// Der Zusammenhang ergibt sich über das ohmsche Gesetz U = R·I.
//
// Modell (rein algebraisch, SI-Einheiten, ideal ohmsch — keine Zeitentwicklung):
//   REIHE:    R_ges = R1 + R2;  I = U_q / R_ges (durch beide Widerstände gleich);
//             U1 = I·R1; U2 = I·R2  (U1 + U2 = U_q).
//   PARALLEL: U1 = U2 = U_q;  I1 = U_q / R1; I2 = U_q / R2;
//             I_ges = I1 + I2; R_ges = (R1·R2)/(R1 + R2).
//   Amperemeter misst den Hauptstrom: REIHE -> I, PARALLEL -> I_ges.
//   Voltmeter misst die Spannung an einer wählbaren Stelle (Parameter „voltmeter“):
//     0 = über R1   (REIHE -> U1, PARALLEL -> U_q)
//     1 = über R2   (REIHE -> U2, PARALLEL -> U_q)
//     2 = über die Quelle (immer U_q)
//
// Modus „statisch“: init(p) baut den kompletten Zustand aus den Parametern, istFertig()
// liefert sofort true, update() ist leer. Die Prüffälle laufen dadurch ohne Klicks: die
// Engine setzt die Parameter, init übernimmt sie, bilanz(z, p) rechnet das Ergebnis.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Modell (rein, in Node lauffähig) ----------
// Liefert alle abgeleiteten Größen aus dem Zustand z = {U_q, R1, R2, topologie, voltmeter}.
function analyse(z) {
  const reihe = z.topologie === 0;
  let I_haupt, R_ges, U_R1, U_R2;
  if (reihe) {
    R_ges = z.R1 + z.R2;                 // Reihe: Widerstände addieren sich
    I_haupt = z.U_q / R_ges;             // ein Stromweg: I = U / R_ges
    U_R1 = I_haupt * z.R1;               // Teilspannungen U = R·I
    U_R2 = I_haupt * z.R2;
  } else {
    R_ges = (z.R1 * z.R2) / (z.R1 + z.R2); // Parallel: Produkt durch Summe
    const I1 = z.U_q / z.R1;             // volle Quellenspannung an jedem Zweig
    const I2 = z.U_q / z.R2;
    I_haupt = I1 + I2;                   // Knotenregel: Zweigströme addieren sich
    U_R1 = z.U_q;                        // an beiden parallelen Widerständen liegt U_q
    U_R2 = z.U_q;
  }
  // Voltmeter-Anzeige je nach gewählter Messstelle
  let U_volt;
  if (z.voltmeter === 0) U_volt = U_R1;
  else if (z.voltmeter === 1) U_volt = U_R2;
  else U_volt = z.U_q;                   // über der Quelle
  return { reihe, I_haupt, R_ges, U_R1, U_R2, U_volt };
}

export const manifest = {
  id: "physik/strom-spannung-messen",
  titel: "Spannung und Stromstärke messen",
  modus: "statisch",
  raster: false,      // Schaltbild statt Koordinatenraster
  werkzeuge: false,   // Lineal/Winkelmesser ergeben am Schaltbild keinen Sinn
  parameter: [
    { id: "U_q",       label: "Quellenspannung U",   einheit: "V", min: 1, max: 12, schritt: 1, start: 6 },
    { id: "R1",        label: "Widerstand R₁",       einheit: "Ω", min: 5, max: 50, schritt: 5, start: 10 },
    { id: "R2",        label: "Widerstand R₂",       einheit: "Ω", min: 5, max: 50, schritt: 5, start: 20 },
    // Diskrete Schalter als ganzzahlige Slider; im Canvas mit Klartext beschriftet
    { id: "topologie", label: "Schaltung", typ: "auswahl", optionen: [{ wert: 0, label: "Reihe" }, { wert: 1, label: "Parallel" }], min: 0, max: 1, schritt: 1, start: 0 },
    { id: "voltmeter", label: "Voltmeter misst", typ: "auswahl", optionen: [{ wert: 0, label: "R₁" }, { wert: 1, label: "R₂" }, { wert: 2, label: "Quelle" }], min: 0, max: 2, schritt: 1, start: 0 }
  ],
  anzeigen: [
    { id: "I_ampere", label: "Amperemeter zeigt I",  einheit: "A", stellen: 3 },
    { id: "U_volt",   label: "Voltmeter zeigt U",    einheit: "V", stellen: 2 },
    { id: "R_ges",    label: "Gesamtwiderstand R",   einheit: "Ω", stellen: 1 }
  ],
  presets: [
    { name: "Reihe — U an R₁",        werte: { U_q: 6, R1: 10, R2: 20, topologie: 0, voltmeter: 0 } },
    { name: "Reihe — U an R₂",        werte: { U_q: 6, R1: 10, R2: 20, topologie: 0, voltmeter: 1 } },
    { name: "Parallel — U an Quelle", werte: { U_q: 6, R1: 10, R2: 10, topologie: 1, voltmeter: 2 } }
  ],
  vorhersage: {
    frage: "Du willst die Stromstärke in einem Stromkreis messen. Wie schließt du das Amperemeter an?",
    optionen: [
      "In Reihe — das Amperemeter wird in den Stromweg eingebaut",
      "Parallel — das Amperemeter wird neben das Bauteil gehängt",
      "Egal — Hauptsache, es ist mit dem Stromkreis verbunden"
    ],
    aufloesung: "In Reihe: Das Amperemeter muss vom gesamten zu messenden Strom durchflossen werden, deshalb baut man es direkt in den Stromweg ein (in Reihe). Es ist (im Idealfall) widerstandslos und stört den Kreis kaum. Das Voltmeter dagegen wird parallel zum Bauteil angeschlossen, weil es die Spannung über dem Bauteil abgreift — es ist sehr hochohmig, damit fast kein Strom durch es selbst fließt. Merke: Amperemeter in Reihe, Voltmeter parallel."
  },
  beobachtung: [
    "Stelle „Reihe“ ein und verschiebe das Voltmeter (Schieberegler „Voltmeter an“) von R₁ über R₂ zur Quelle. Notiere die drei Spannungen: Ergeben U(R₁) + U(R₂) zusammen genau die Quellenspannung? Die Spannung teilt sich auf die Widerstände auf.",
    "Bleibe in der Reihenschaltung und ändere R₁ und R₂: Die Amperemeter-Anzeige (der Strom) ist überall im Kreis gleich groß — egal, an welcher Stelle du das Amperemeter denkst.",
    "Stelle „Parallel“ ein und verschiebe das Voltmeter über R₁, R₂ und die Quelle: Die Spannung ist überall dieselbe (= U_q). Dafür teilt sich jetzt der Strom auf die beiden Zweige auf — der Hauptstrom (Amperemeter) ist die Summe der Zweigströme.",
    "Prüfe an jedem Bauteil das ohmsche Gesetz: Teile die abgelesene Spannung U durch den eingestellten Widerstand R. Kommt der Strom heraus, der durch dieses Bauteil fließt (I = U / R)?"
  ],
  modellgrenzen: "Ideale Messgeräte: Das Amperemeter ist widerstandslos (es verfälscht den Strom nicht), das Voltmeter ist unendlich hochohmig (durch das Voltmeter fließt kein Strom). Die Spannungsquelle ist ideal, also ohne Innenwiderstand, und die Widerstände sind ohmsch (temperaturunabhängig), die Zuleitungen widerstandsfrei. Reale Messgeräte haben einen kleinen bzw. endlichen Eigenwiderstand und verändern die Messung geringfügig.",
  bilanz: {
    I_ampere: { label: "Amperemeter zeigt I", einheit: "A", stellen: 3 },
    U_volt:   { label: "Voltmeter zeigt U",   einheit: "V", stellen: 2 },
    R_ges:    { label: "Gesamtwiderstand R",  einheit: "Ω", stellen: 1 }
  }
};

// init: kompletter Zustand aus den Parametern (auch für den Headless-Lauf der Prüffälle)
export function init(p) {
  return {
    t: 0,
    U_q: p.U_q ?? 6,
    R1: p.R1 ?? 10,
    R2: p.R2 ?? 20,
    topologie: Math.round(p.topologie ?? 0),   // 0 = Reihe, 1 = Parallel
    voltmeter: Math.round(p.voltmeter ?? 0)     // 0 = R1, 1 = R2, 2 = Quelle
  };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

export function messwerte(z) {
  const a = analyse(z);
  return { I_ampere: a.I_haupt, U_volt: a.U_volt, R_ges: a.R_ges };
}

export function bilanz(z) {
  const a = analyse(z);
  return { I_ampere: a.I_haupt, U_volt: a.U_volt, R_ges: a.R_ges };
}

export function weltBereich() {
  return { xMin: 0, xMax: 12, yMin: 0, yMax: 8 };
}

// ---------- Zeichnen: Schaltbild mit Batterie, R1, R2, Amperemeter (in Reihe),
//            Voltmeter (parallel über dem gewählten Bauteil) und Live-Anzeigen ----------

// Leitungszug in Weltkoordinaten
function leitung(ctx, welt, stil, breite, punkte) {
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = breite;
  ctx.lineCap = "butt";
  ctx.lineJoin = "round";
  ctx.beginPath();
  punkte.forEach(([x, y], i) => {
    if (i === 0) ctx.moveTo(welt.px(x), welt.py(y));
    else ctx.lineTo(welt.px(x), welt.py(y));
  });
  ctx.stroke();
}

// DIN-Symbol Widerstand: Rechteck (deckt die darunterliegende Leitung ab)
function zeichneWiderstand(ctx, welt, stil, cx, cy, senkrecht, beschriftung, sub) {
  const b = senkrecht ? 0.7 : 1.4;
  const h = senkrecht ? 1.4 : 0.7;
  ctx.fillStyle = stil.flaeche;
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke;
  const x = welt.px(cx - b / 2), y = welt.py(cy + h / 2);
  ctx.fillRect(x, y, welt.laenge(b), welt.laenge(h));
  ctx.strokeRect(x, y, welt.laenge(b), welt.laenge(h));
  // Beschriftung des Widerstands neben dem Symbol
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  if (beschriftung) ctx.fillText(beschriftung, welt.px(cx), welt.py(cy));
  if (sub) {
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText(sub, welt.px(senkrecht ? cx + 1.1 : cx), welt.py(senkrecht ? cy : cy - 0.62));
  }
}

// DIN-Symbol Quelle (Batterie): lange dünne Linie (+) und kurze dicke Linie (-),
// hier in einer senkrechten Leitung -> Polstriche waagerecht, Pluspol oben.
function zeichneQuelle(ctx, welt, stil, cx, cy) {
  ctx.strokeStyle = stil.text;
  ctx.lineCap = "butt";
  const lang = 0.55, kurz = 0.26;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(cx - lang), welt.py(cy + 0.22));
  ctx.lineTo(welt.px(cx + lang), welt.py(cy + 0.22));
  ctx.stroke();
  ctx.lineWidth = stil.linienstaerke * 3;
  ctx.beginPath();
  ctx.moveTo(welt.px(cx - kurz), welt.py(cy - 0.22));
  ctx.lineTo(welt.px(cx + kurz), welt.py(cy - 0.22));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("+", welt.px(cx + lang) + 4, welt.py(cy + 0.22));
  ctx.fillText("–", welt.px(cx + kurz) + 4, welt.py(cy - 0.22));
}

// Messgerät als Kreis mit Kennbuchstabe (A oder V) und Anzeigewert darunter/daneben.
function zeichneMessgeraet(ctx, welt, stil, cx, cy, buchstabe, anzeige, farbe) {
  const r = welt.laenge(0.62);
  const px = welt.px(cx), py = welt.py(cy);
  ctx.fillStyle = stil.flaeche;
  ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = farbe;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.stroke();
  ctx.fillStyle = farbe;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = (stil.linienstaerke > 3 ? "bold 22px" : "bold 15px") + " sans-serif";
  ctx.fillText(buchstabe, px, py);
  ctx.font = stil.schrift;
  return { px, py, r };
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const a = analyse(z);
  ctx.save();
  ctx.font = stil.schrift;
  const dick = stil.linienstaerke + 1;

  // Überschrift mit Schaltungsart
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.font = (stil.linienstaerke > 3 ? "bold 18px" : "bold 14px") + " sans-serif";
  ctx.fillText(a.reihe ? "Reihenschaltung" : "Parallelschaltung", welt.px(6), welt.py(7.85));
  ctx.font = stil.schrift;

  // Voltmeter-Position bestimmen (über welchem Bauteil hängt es?)
  // voltmeter: 0 = R1, 1 = R2, 2 = Quelle
  if (a.reihe) {
    zeichneReihe(ctx, welt, stil, z, a, dick);
  } else {
    zeichneParallel(ctx, welt, stil, z, a, dick);
  }

  ctx.restore();
}

// ===== Reihenschaltung: ein geschlossener Rechteck-Stromweg =====
// Quelle links, oben das Amperemeter (in Reihe!), rechts R1 (oben) und R2 (unten).
function zeichneReihe(ctx, welt, stil, z, a, dick) {
  // Eckpunkte des Stromwegs
  const L = 1.6, R = 9.6, T = 6.4, B = 1.4;
  const ymQuelle = (T + B) / 2;       // Quelle Mitte links
  const xAmp = 4.4;                   // Amperemeter oben
  const yR1 = 4.4, yR2 = 3.0;         // R1 und R2 in der rechten senkrechten Leitung
  // Leitungen (mit Lücken für Quelle, Amperemeter, R1, R2)
  // oben: von linker oberer Ecke bis Amperemeter, Amperemeter bis rechte obere Ecke
  leitung(ctx, welt, stil, dick, [[L, T], [xAmp - 0.7, T]]);
  leitung(ctx, welt, stil, dick, [[xAmp + 0.7, T], [R, T]]);
  // unten
  leitung(ctx, welt, stil, dick, [[L, B], [R, B]]);
  // linke Seite mit Quelle (Lücke)
  leitung(ctx, welt, stil, dick, [[L, T], [L, ymQuelle + 0.55]]);
  leitung(ctx, welt, stil, dick, [[L, ymQuelle - 0.55], [L, B]]);
  // rechte Seite mit R1 (oben) und R2 (unten), Lücken für die Symbole
  leitung(ctx, welt, stil, dick, [[R, T], [R, yR1 + 0.7]]);
  leitung(ctx, welt, stil, dick, [[R, yR1 - 0.7], [R, yR2 + 0.7]]);
  leitung(ctx, welt, stil, dick, [[R, yR2 - 0.7], [R, B]]);

  // Quelle
  zeichneQuelle(ctx, welt, stil, L, ymQuelle);
  ctx.fillStyle = stil.text; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillText("U = " + formatZahl(z.U_q, 0) + " V", welt.px(L) - 14, welt.py(ymQuelle));

  // R1 und R2 (senkrecht)
  zeichneWiderstand(ctx, welt, stil, R, yR1, true, "R₁");
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(formatZahl(z.R1, 0) + " Ω", welt.px(R) + 0.62 * welt.massstab, welt.py(yR1));
  zeichneWiderstand(ctx, welt, stil, R, yR2, true, "R₂");
  ctx.fillText(formatZahl(z.R2, 0) + " Ω", welt.px(R) + 0.62 * welt.massstab, welt.py(yR2));

  // Amperemeter in Reihe (oben in der Leitung)
  zeichneMessgeraet(ctx, welt, stil, xAmp, T, "A", null, stil.akzent);
  ctx.fillStyle = stil.akzent; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText("I = " + formatZahl(a.I_haupt, 3) + " A", welt.px(xAmp), welt.py(T) - 0.78 * welt.massstab);
  ctx.fillStyle = stil.beschriftung; ctx.textBaseline = "top";
  ctx.fillText("Amperemeter (in Reihe)", welt.px(xAmp), welt.py(T) + 0.78 * welt.massstab);

  // Voltmeter parallel über dem gewählten Bauteil
  // Anschlusspunkte: R1 zwischen yR1+0.7 und yR1-0.7 auf x=R; R2 analog; Quelle an x=L
  let p1, p2, ux, beschr;
  if (z.voltmeter === 0) {            // über R1
    p1 = [R, yR1 + 0.7]; p2 = [R, yR1 - 0.7]; ux = R + 2.0; beschr = "über R₁";
  } else if (z.voltmeter === 1) {     // über R2
    p1 = [R, yR2 + 0.7]; p2 = [R, yR2 - 0.7]; ux = R + 2.0; beschr = "über R₂";
  } else {                            // über Quelle
    p1 = [L, ymQuelle + 0.55]; p2 = [L, ymQuelle - 0.55]; ux = L - 2.0; beschr = "über der Quelle";
  }
  zeichneVoltmeter(ctx, welt, stil, p1, p2, ux, a.U_volt, beschr);
}

// ===== Parallelschaltung: zwei Zweige zwischen zwei waagerechten Sammelleitungen =====
function zeichneParallel(ctx, welt, stil, z, a, dick) {
  const L = 1.6, T = 6.0, B = 1.6;
  const ymQuelle = (T + B) / 2;
  const xAmp = 3.4;                   // Amperemeter im Hauptstrom (obere Sammelleitung)
  const xR1 = 6.2, xR2 = 9.0;        // zwei parallele Zweige
  const ymR = (T + B) / 2;            // Widerstände in Zweigmitte

  // linke senkrechte Leitung mit Quelle
  leitung(ctx, welt, stil, dick, [[L, T], [L, ymQuelle + 0.55]]);
  leitung(ctx, welt, stil, dick, [[L, ymQuelle - 0.55], [L, B]]);
  // obere Sammelleitung mit Amperemeter (Lücke)
  leitung(ctx, welt, stil, dick, [[L, T], [xAmp - 0.7, T]]);
  leitung(ctx, welt, stil, dick, [[xAmp + 0.7, T], [xR2, T]]);
  // untere Sammelleitung
  leitung(ctx, welt, stil, dick, [[L, B], [xR2, B]]);
  // Zweig 1 (R1) mit Lücke
  leitung(ctx, welt, stil, dick, [[xR1, T], [xR1, ymR + 0.7]]);
  leitung(ctx, welt, stil, dick, [[xR1, ymR - 0.7], [xR1, B]]);
  // Zweig 2 (R2) mit Lücke
  leitung(ctx, welt, stil, dick, [[xR2, T], [xR2, ymR + 0.7]]);
  leitung(ctx, welt, stil, dick, [[xR2, ymR - 0.7], [xR2, B]]);

  // Knotenpunkte markieren (wo sich der Strom teilt)
  ctx.fillStyle = stil.text;
  [[xR1, T], [xR1, B], [xR2, T], [xR2, B]].forEach(([x, y]) => {
    ctx.beginPath(); ctx.arc(welt.px(x), welt.py(y), Math.max(2.5, welt.laenge(0.07)), 0, 2 * Math.PI); ctx.fill();
  });

  // Quelle
  zeichneQuelle(ctx, welt, stil, L, ymQuelle);
  ctx.fillStyle = stil.text; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.fillText("U = " + formatZahl(z.U_q, 0) + " V", welt.px(L) - 14, welt.py(ymQuelle));

  // Widerstände (senkrecht in den Zweigen)
  zeichneWiderstand(ctx, welt, stil, xR1, ymR, true, "R₁");
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText(formatZahl(z.R1, 0) + " Ω", welt.px(xR1) + 0.62 * welt.massstab, welt.py(ymR));
  zeichneWiderstand(ctx, welt, stil, xR2, ymR, true, "R₂");
  ctx.fillText(formatZahl(z.R2, 0) + " Ω", welt.px(xR2) + 0.62 * welt.massstab, welt.py(ymR));

  // Amperemeter im Hauptstrom (obere Sammelleitung, vor der Verzweigung)
  zeichneMessgeraet(ctx, welt, stil, xAmp, T, "A", null, stil.akzent);
  ctx.fillStyle = stil.akzent; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText("I = " + formatZahl(a.I_haupt, 3) + " A", welt.px(xAmp), welt.py(T) - 0.78 * welt.massstab);
  ctx.fillStyle = stil.beschriftung; ctx.textBaseline = "top";
  ctx.fillText("Amperemeter (in Reihe)", welt.px(xAmp), welt.py(T) + 0.78 * welt.massstab);

  // Voltmeter parallel über dem gewählten Bauteil
  let p1, p2, ux, beschr;
  if (z.voltmeter === 0) {            // über R1
    p1 = [xR1, ymR + 0.7]; p2 = [xR1, ymR - 0.7]; ux = xR1 - 2.0; beschr = "über R₁";
  } else if (z.voltmeter === 1) {     // über R2
    p1 = [xR2, ymR + 0.7]; p2 = [xR2, ymR - 0.7]; ux = xR2 + 2.0; beschr = "über R₂";
  } else {                            // über Quelle
    p1 = [L, ymQuelle + 0.55]; p2 = [L, ymQuelle - 0.55]; ux = L - 2.0; beschr = "über der Quelle";
  }
  zeichneVoltmeter(ctx, welt, stil, p1, p2, ux, a.U_volt, beschr);
}

// Voltmeter parallel anschließen: zwei Abgriffleitungen von p1/p2 zur seitlich liegenden
// Voltmeter-Position (ux). Der Kennkreis sitzt mittig zwischen den beiden Abgriffhöhen.
function zeichneVoltmeter(ctx, welt, stil, p1, p2, ux, anzeige, beschr) {
  const ym = (p1[1] + p2[1]) / 2;
  // Abgriffleitungen (etwas dünner, in Akzentfarbe, gestrichelt zur Unterscheidung)
  ctx.strokeStyle = stil.fehler;
  ctx.lineWidth = stil.linienstaerke;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(welt.px(p1[0]), welt.py(p1[1]));
  ctx.lineTo(welt.px(ux), welt.py(p1[1]));
  ctx.lineTo(welt.px(ux), welt.py(ym + 0.62));
  ctx.moveTo(welt.px(p2[0]), welt.py(p2[1]));
  ctx.lineTo(welt.px(ux), welt.py(p2[1]));
  ctx.lineTo(welt.px(ux), welt.py(ym - 0.62));
  ctx.stroke();
  ctx.setLineDash([]);
  // Anschlusspunkte markieren
  ctx.fillStyle = stil.fehler;
  [p1, p2].forEach(p => {
    ctx.beginPath(); ctx.arc(welt.px(p[0]), welt.py(p[1]), Math.max(2.5, welt.laenge(0.07)), 0, 2 * Math.PI); ctx.fill();
  });
  // Voltmeter-Kreis
  zeichneMessgeraet(ctx, welt, stil, ux, ym, "V", null, stil.fehler);
  // Anzeige und Beschriftung
  ctx.fillStyle = stil.fehler; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText("U = " + formatZahl(anzeige, 2) + " V", welt.px(ux), welt.py(ym) - 0.78 * welt.massstab);
  ctx.fillStyle = stil.beschriftung; ctx.textBaseline = "top";
  ctx.fillText("Voltmeter (parallel " + beschr + ")", welt.px(ux), welt.py(ym) + 0.78 * welt.massstab);
}

// ---------- Prüffälle (ohmsch, analytisch verifiziert) ----------
// Fall1: Reihe, Rges=R1+R2=30, I=6/30=0,2 A, Voltmeter über R1 -> U1=I·R1=0,2·10=2 V.
// Fall2: Reihe, gleiche Schaltung, Voltmeter über R2 -> U2=I·R2=0,2·20=4 V.
// Fall3: Parallel, R1=R2=10 -> I1=I2=0,6 A, Iges=1,2 A, Rges=10·10/20=5 Ω,
//        Voltmeter über der Quelle -> U=U_q=6 V.
export const pruefFaelle = [
  {
    name: "Reihe, Voltmeter über R₁",
    parameter: { U_q: 6, R1: 10, R2: 20, topologie: 0, voltmeter: 0 },
    toleranzProzent: 1,
    soll: { I_ampere: 0.2, U_volt: 2, R_ges: 30 }
  },
  {
    name: "Reihe, Voltmeter über R₂",
    parameter: { U_q: 6, R1: 10, R2: 20, topologie: 0, voltmeter: 1 },
    toleranzProzent: 1,
    soll: { I_ampere: 0.2, U_volt: 4, R_ges: 30 }
  },
  {
    name: "Parallel, Voltmeter über der Quelle",
    parameter: { U_q: 6, R1: 10, R2: 10, topologie: 1, voltmeter: 2 },
    toleranzProzent: 1,
    soll: { I_ampere: 1.2, U_volt: 6, R_ges: 5 }
  }
];
