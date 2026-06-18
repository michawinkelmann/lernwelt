// LED mit Vorwiderstand — statisch-interaktiv: Eine Leuchtdiode (LED) leitet erst ab
// ihrer Flussspannung U_F und würde dann ohne Begrenzung sofort durchbrennen. Ein in
// Reihe geschalteter Vorwiderstand R legt den Strom fest. Lernende verändern Quellen-
// spannung U_q, Vorwiderstand R und die Farbe (Flussspannung U_F) und lesen Strom I,
// Spannung am Widerstand U_R und Spannung an der LED U_LED ab. Links das Schaltbild
// mit leuchtender LED, rechts die Kennlinie I(U_LED) mit Lastgerade und Arbeitspunkt.
//
// Modell (Konstantspannungs-Diodenmodell, Klasse 9, exakt — keine Zeitentwicklung):
//   Quelle U_q, Vorwiderstand R und LED (Flussspannung U_F) in Reihe.
//   Die LED leitet nur, wenn U_q > U_F. Dann gilt:
//       I   = (U_q − U_F) / R            (Strom durch den ganzen Kreis)
//       U_R = I · R = U_q − U_F          (Spannung fällt am Widerstand ab)
//       U_LED = U_F                      (an der leitenden LED liegt die Flussspannung)
//   Ist U_q ≤ U_F, fließt kein Strom (I = 0): die LED bleibt dunkel,
//   am Widerstand fällt nichts ab (U_R = 0), die ganze Spannung liegt an der LED
//   (U_LED = U_q). Damit nie negativer Strom: I = max(0, (U_q − U_F) / R).
//   Helligkeit der LED ∝ I.
//
// Modus „statisch“: init(p) baut den kompletten Zustand aus den Parametern, istFertig()
// liefert sofort true, update() ist leer. Die Prüffälle laufen dadurch ohne Klicks: die
// Engine setzt die Parameter, init übernimmt sie, bilanz(z, p) rechnet das Ergebnis.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Modell (rein, in Node lauffähig) ----------
// Liefert alle abgeleiteten Größen aus dem Zustand z = {U_q, R, U_F}.
function analyse(z) {
  const leitet = z.U_q > z.U_F;             // LED leitet erst oberhalb der Flussspannung
  const I = leitet ? (z.U_q - z.U_F) / z.R : 0;   // Strom in Ampere, nie negativ
  const U_R = I * z.R;                       // Spannungsabfall am Vorwiderstand
  const U_LED = leitet ? z.U_F : z.U_q;      // an der LED: U_F (an) bzw. U_q (aus)
  return { leitet, I, U_R, U_LED };
}

export const manifest = {
  id: "physik/led-vorwiderstand",
  titel: "LED mit Vorwiderstand",
  modus: "statisch",
  raster: false,      // Schaltbild + eigene Kennlinie statt Koordinatenraster
  werkzeuge: false,   // Lineal/Winkelmesser ergeben hier keinen Sinn
  parameter: [
    { id: "U_q", label: "Quellenspannung U", einheit: "V", min: 0, max: 9, schritt: 0.5, start: 5 },
    { id: "R",   label: "Vorwiderstand R",   einheit: "Ω", min: 50, max: 1000, schritt: 10, start: 220 },
    { id: "U_F", label: "Flussspannung U_F (Farbe)", einheit: "V", min: 1.6, max: 3.4, schritt: 0.2, start: 2.0 }
  ],
  anzeigen: [
    // Strom intern in Ampere; Anzeige in mA über faktor 1000.
    { id: "I",     label: "Strom I",            einheit: "mA", faktor: 1000, stellen: 2 },
    { id: "U_R",   label: "Spannung am R",      einheit: "V",  stellen: 2 },
    { id: "U_LED", label: "Spannung an der LED", einheit: "V", stellen: 2 }
  ],
  presets: [
    { name: "Rote LED (U_F ≈ 1,8 V)",   werte: { U_q: 5, R: 220, U_F: 1.8 } },
    { name: "Blaue LED (U_F ≈ 3,0 V)",  werte: { U_q: 5, R: 220, U_F: 3.0 } },
    { name: "Spannung zu klein (LED aus)", werte: { U_q: 1.5, R: 220, U_F: 2.0 } }
  ],
  vorhersage: {
    frage: "Eine LED wird direkt (ohne Widerstand) an eine zu hohe Spannung gehängt — der Strom wäre riesig und würde sie zerstören. Was begrenzt den Strom durch die LED in einer richtig gebauten Schaltung?",
    optionen: [
      "Der Vorwiderstand R — er nimmt die überschüssige Spannung auf und legt den Strom fest",
      "Die LED selbst — sie regelt ihren Strom von allein passend ein",
      "Die Quellenspannung U_q — je höher sie ist, desto kleiner wird der Strom"
    ],
    aufloesung: "Der Vorwiderstand R begrenzt den Strom. An der leitenden LED liegt fast konstant ihre Flussspannung U_F. Die restliche Spannung U_q − U_F fällt am Vorwiderstand ab, und dieser legt über I = (U_q − U_F) / R den Strom fest. Ohne Vorwiderstand gäbe es nichts, was den Strom begrenzt — die LED würde sofort durchbrennen. Eine größere Quellenspannung vergrößert den Strom (nicht umgekehrt); deshalb wird R dann passend größer gewählt."
  },
  beobachtung: [
    "Lass R und U_F fest und erhöhe die Quellenspannung U_q. Wie verändert sich der Strom I? Beobachte zugleich, wie der Arbeitspunkt rechts auf der Kennlinie nach oben wandert und die LED heller leuchtet.",
    "Halte U_q und U_F fest und vergrößere den Vorwiderstand R. Was passiert mit dem Strom I? Warum nennt man R einen „Vorwiderstand“ zum Schutz der LED? Achte auf die Steigung der Lastgeraden.",
    "Stelle die Quellenspannung kleiner als die Flussspannung ein (z. B. U_q = 1,5 V, U_F = 2,0 V). Was zeigt das Strom-Anzeigefeld? Leuchtet die LED? Erkläre, warum unterhalb von U_F kein Strom fließt.",
    "Wähle nacheinander verschiedene Farben über U_F (rot ≈ 1,8 V, gelb ≈ 2,0 V, blau ≈ 3,0 V) bei gleichem U_q und R. Wie ändert sich der Strom mit der Flussspannung? Welche Farbe braucht die höchste Spannung, um überhaupt zu leuchten?"
  ],
  modellgrenzen: "Idealisiertes Konstantspannungsmodell: Die LED leitet schlagartig ab U_F und hält ihre Spannung danach exakt konstant. In Wirklichkeit steigt der Strom einer Diode nach der Shockley-Gleichung exponentiell an — die echte Kennlinie hat keinen scharfen Knick, sondern einen weichen Übergang, und U_LED wächst mit dem Strom leicht weiter. Auch der Innenwiderstand der Quelle und die Erwärmung der LED bleiben unberücksichtigt. Wichtig bleibt die Kernaussage: Eine LED braucht zur Strombegrenzung immer einen Vorwiderstand (oder eine Konstantstromquelle), sonst wird sie durch zu großen Strom zerstört.",
  bilanz: {
    I_mA: { label: "Strom I",            einheit: "mA", stellen: 3 },
    U_R:  { label: "Spannung am R",      einheit: "V",  stellen: 2 }
  }
};

// init: kompletter Zustand aus den Parametern (auch für den Headless-Lauf der Prüffälle)
export function init(p) {
  return {
    t: 0,
    U_q: p.U_q ?? 5,
    R:   p.R ?? 220,
    U_F: p.U_F ?? 2.0
  };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

// Messwerte in Rohgrößen (SI): I in Ampere; Anzeige skaliert über faktor (mA).
export function messwerte(z) {
  const a = analyse(z);
  return { I: a.I, U_R: a.U_R, U_LED: a.U_LED };
}

// Bilanz für Prüffälle: Strom in mA und Spannung am Widerstand in V.
export function bilanz(z) {
  const a = analyse(z);
  return { I_mA: a.I * 1000, U_R: a.U_R };
}

export function weltBereich() {
  // Eine gemeinsame, unverzerrte Fläche (welt.js hält x:y = 1:1). Links Schaltbild,
  // rechts Kennlinien-Panel. Konkrete Achsen der Kennlinie werden in Pixeln gezeichnet.
  return { xMin: 0, xMax: 20, yMin: 0, yMax: 10 };
}

// ===================== Zeichnen =====================

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
function zeichneWiderstand(ctx, welt, stil, cx, cy, senkrecht) {
  const b = senkrecht ? 0.8 : 1.8;
  const h = senkrecht ? 1.8 : 0.8;
  ctx.fillStyle = stil.flaeche;
  ctx.strokeStyle = stil.akzent;
  ctx.lineWidth = stil.linienstaerke;
  const x = welt.px(cx - b / 2), y = welt.py(cy + h / 2);
  ctx.fillRect(x, y, welt.laenge(b), welt.laenge(h));
  ctx.strokeRect(x, y, welt.laenge(b), welt.laenge(h));
}

// DIN-Symbol Quelle (Batterie) in einer senkrechten Leitung: Polstriche waagerecht,
// langer dünner Strich = Pluspol (oben), kurzer dicker Strich = Minuspol (unten).
function zeichneQuelle(ctx, welt, stil, cx, cy) {
  ctx.strokeStyle = stil.text;
  ctx.lineCap = "butt";
  const lang = 0.7, kurz = 0.32;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(cx - lang), welt.py(cy + 0.28));
  ctx.lineTo(welt.px(cx + lang), welt.py(cy + 0.28));
  ctx.stroke();
  ctx.lineWidth = stil.linienstaerke * 3;
  ctx.beginPath();
  ctx.moveTo(welt.px(cx - kurz), welt.py(cy - 0.28));
  ctx.lineTo(welt.px(cx + kurz), welt.py(cy - 0.28));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("+", welt.px(cx + lang) + 4, welt.py(cy + 0.28));
  ctx.fillText("–", welt.px(cx + kurz) + 4, welt.py(cy - 0.28));
}

// ----- Schaltbild (linke Hälfte, ca. x ∈ [0, 9]) -----
// Rechteck-Stromweg: Quelle links (senkrecht), oben der Vorwiderstand R, rechts die LED
// (senkrecht), unten zurück. Strom fließt im Uhrzeigersinn (Pluspol oben).
function zeichneSchaltbild(ctx, welt, stil, z, a, dick) {
  const L = 1.3, R = 7.7, T = 8.2, B = 1.8;
  const ymQuelle = (T + B) / 2;
  const xR = 4.5;                       // Vorwiderstand oben
  const yLED = (T + B) / 2;             // LED rechts (senkrecht)

  // obere Leitung mit Lücke für R
  leitung(ctx, welt, stil, dick, [[L, T], [xR - 0.9, T]]);
  leitung(ctx, welt, stil, dick, [[xR + 0.9, T], [R, T]]);
  // untere Leitung
  leitung(ctx, welt, stil, dick, [[L, B], [R, B]]);
  // linke Seite mit Quelle (Lücke)
  leitung(ctx, welt, stil, dick, [[L, T], [L, ymQuelle + 0.7]]);
  leitung(ctx, welt, stil, dick, [[L, ymQuelle - 0.7], [L, B]]);
  // rechte Seite mit LED (Lücke)
  leitung(ctx, welt, stil, dick, [[R, T], [R, yLED + 0.95]]);
  leitung(ctx, welt, stil, dick, [[R, yLED - 0.95], [R, B]]);

  // Quelle
  zeichneQuelle(ctx, welt, stil, L, ymQuelle);
  ctx.fillStyle = stil.text; ctx.textAlign = "right"; ctx.textBaseline = "middle";
  ctx.font = stil.schrift;
  ctx.fillText("U = " + formatZahl(z.U_q, 1) + " V", welt.px(L) - 12, welt.py(ymQuelle));

  // Vorwiderstand R (waagerecht, oben)
  zeichneWiderstand(ctx, welt, stil, xR, T, false);
  ctx.fillStyle = stil.akzent; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.fillText("R = " + formatZahl(z.R, 0) + " Ω", welt.px(xR), welt.py(T + 0.55));
  ctx.fillStyle = stil.beschriftung; ctx.textBaseline = "top";
  ctx.fillText("U_R = " + formatZahl(a.U_R, 2) + " V", welt.px(xR), welt.py(T - 0.55));

  // LED (rechts, senkrecht). Für senkrechten Einbau drehen wir das waagerechte Symbol:
  // einfacher — wir zeichnen es waagerecht etwas links der rechten Leitung und führen
  // kurze senkrechte Stummel hin. Stattdessen: LED senkrecht selbst zeichnen.
  zeichneLEDsenkrecht(ctx, welt, stil, R, yLED, a.leitet ? leuchtfaktor(a.I) : 0);
  // Beschriftung LED
  ctx.fillStyle = a.leitet ? stil.akzent : stil.beschriftung;
  ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText("LED", welt.px(R) + welt.laenge(1.0), welt.py(yLED + 0.5));
  ctx.fillStyle = stil.beschriftung;
  ctx.fillText("U_LED = " + formatZahl(a.U_LED, 2) + " V", welt.px(R) + welt.laenge(1.0), welt.py(yLED));
  ctx.fillText("U_F = " + formatZahl(z.U_F, 1) + " V", welt.px(R) + welt.laenge(1.0), welt.py(yLED - 0.5));

  // Strompfeil + Stromwert (oben, in Stromrichtung nach rechts), nur wenn Strom fließt
  if (a.leitet && a.I > 0) {
    const xPfeil = (L + xR) / 2 - 0.4;
    pfeilWaagerecht(ctx, welt, stil.ok, xPfeil, T + 0.0, 0.0, true);
    ctx.fillStyle = stil.ok; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("I = " + formatZahl(a.I * 1000, 2) + " mA", welt.px(xPfeil + 0.4), welt.py(T + 1.1));
  } else {
    ctx.fillStyle = stil.fehler; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("I = 0 mA — LED aus", welt.px((L + xR) / 2), welt.py(T + 1.1));
  }
}

// Helligkeitsfaktor [0,1] aus dem Strom: ~20 mA gilt als „voll“ leuchtend.
function leuchtfaktor(I) {
  return Math.max(0, Math.min(1, (I * 1000) / 20));
}

// kleiner waagerechter Strompfeil (Richtung +x)
function pfeilWaagerecht(ctx, welt, farbe, x, y) {
  ctx.strokeStyle = farbe; ctx.fillStyle = farbe;
  ctx.lineWidth = welt.laenge(0.06) + 1;
  const x1 = welt.px(x), x2 = welt.px(x + 0.8), yy = welt.py(y) - welt.laenge(0.0);
  ctx.beginPath(); ctx.moveTo(x1, yy); ctx.lineTo(x2, yy); ctx.stroke();
  const aw = welt.laenge(0.22);
  ctx.beginPath();
  ctx.moveTo(x2, yy);
  ctx.lineTo(x2 - aw, yy - aw * 0.55);
  ctx.lineTo(x2 - aw, yy + aw * 0.55);
  ctx.closePath(); ctx.fill();
}

// LED senkrecht: Strom fließt von oben (Anode) nach unten (Kathode) in der rechten
// Leitung. Dreieck zeigt nach unten, Kathodenstrich darunter, Lichtpfeile nach rechts.
function zeichneLEDsenkrecht(ctx, welt, stil, cx, cy, leuchtAnteil) {
  const s = 0.9;
  const yo = welt.py(cy + s), yu = welt.py(cy - s);
  const xl = welt.px(cx - s), xr = welt.px(cx + s), xm = welt.px(cx);
  // Lichthof
  if (leuchtAnteil > 0) {
    const r = welt.laenge(s) * (1.7 + 1.6 * leuchtAnteil);
    const halo = ctx.createRadialGradient(xm, welt.py(cy), welt.laenge(s) * 0.5, xm, welt.py(cy), r);
    halo.addColorStop(0, stil.akzent);
    halo.addColorStop(1, "transparent");
    ctx.save();
    ctx.globalAlpha = 0.18 + 0.5 * leuchtAnteil;
    ctx.fillStyle = halo;
    ctx.beginPath(); ctx.arc(xm, welt.py(cy), r, 0, 2 * Math.PI); ctx.fill();
    ctx.restore();
  }
  // Diodendreieck (Spitze nach unten = Stromrichtung)
  ctx.lineWidth = stil.linienstaerke;
  ctx.strokeStyle = stil.akzent;
  ctx.fillStyle = leuchtAnteil > 0 ? stil.akzent : stil.flaeche;
  ctx.save();
  ctx.globalAlpha = leuchtAnteil > 0 ? (0.25 + 0.6 * leuchtAnteil) : 1;
  ctx.beginPath();
  ctx.moveTo(xl, yo);
  ctx.lineTo(xr, yo);
  ctx.lineTo(xm, yu);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(xl, yo);
  ctx.lineTo(xr, yo);
  ctx.lineTo(xm, yu);
  ctx.closePath();
  ctx.stroke();
  // Kathodenstrich (waagerecht unter der Spitze)
  ctx.beginPath();
  ctx.moveTo(xl, yu);
  ctx.lineTo(xr, yu);
  ctx.stroke();
  // zwei Licht-Pfeile schräg nach rechts oben
  ctx.strokeStyle = leuchtAnteil > 0 ? stil.akzent : stil.beschriftung;
  ctx.fillStyle = ctx.strokeStyle;
  for (let k = 0; k < 2; k++) {
    const oy = welt.laenge(k * 0.5);
    const x1 = xr + welt.laenge(0.15), y1 = welt.py(cy + 0.2) - oy;
    const x2 = x1 + welt.laenge(0.55), y2 = y1 - welt.laenge(0.55);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const aw = welt.laenge(0.18);
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - aw * 0.9, y2 + aw * 0.2);
    ctx.lineTo(x2 - aw * 0.2, y2 + aw * 0.9);
    ctx.closePath(); ctx.fill();
  }
}

// ----- Kennlinie I(U_LED) mit Lastgerade und Arbeitspunkt (rechte Hälfte) -----
// Eigenes Diagramm in Pixeln: x-Achse U (0..U_max), y-Achse I (0..I_max in mA).
// Diodenkennlinie (Konstantspannungsmodell): I=0 bis U=U_F, dann steiler, fast senkrechter
// Anstieg. Lastgerade: I = (U_q − U) / R (in mA). Arbeitspunkt = Schnittpunkt bei U=U_F.
function zeichneKennlinie(ctx, welt, stil, z, a) {
  // Panel-Rahmen in Pixeln (rechte Hälfte der Canvasfläche)
  const xLinks = welt.px(11.0), xRechts = welt.px(19.3);
  const yUnten = welt.py(1.8), yOben = welt.py(8.6);
  const pbreite = xRechts - xLinks, phoehe = yUnten - yOben;
  if (pbreite < 20 || phoehe < 20) return;   // zu schmal -> überspringen (sehr kleine Handys)

  // Achsenskalen wählen
  const U_max = 9.5;                         // bis knapp über max U_q
  // y-Skala: maximal möglicher Strom im aktuellen Setup (Kurzschlussfall U_F=0 vermeiden);
  // wir nehmen das Maximum aus Arbeitsstrom und (U_q)/R, mit etwas Reserve, gerundet.
  const I_arb_mA = a.I * 1000;
  const I_obergrenze = Math.max(I_arb_mA, (z.U_q) / z.R * 1000, 5);
  const I_max = schoeneObergrenze(I_obergrenze * 1.25);

  const sx = u => xLinks + (u / U_max) * pbreite;          // U -> px
  const sy = i => yUnten - (i / I_max) * phoehe;           // I(mA) -> px

  // Panel-Hintergrund
  ctx.fillStyle = stil.flaeche;
  ctx.fillRect(xLinks, yOben, pbreite, phoehe);

  // Gitterlinien + Achsenticks
  ctx.strokeStyle = stil.raster; ctx.lineWidth = 1;
  ctx.fillStyle = stil.beschriftung; ctx.font = stil.schrift;
  const uTick = 2, iTick = schoeneTick(I_max);
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let u = 0; u <= U_max + 1e-9; u += uTick) {
    ctx.beginPath(); ctx.moveTo(sx(u), yOben); ctx.lineTo(sx(u), yUnten); ctx.stroke();
    ctx.fillText(formatZahl(u, 0), sx(u), yUnten + 4);
  }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let i = 0; i <= I_max + 1e-9; i += iTick) {
    ctx.beginPath(); ctx.moveTo(xLinks, sy(i)); ctx.lineTo(xRechts, sy(i)); ctx.stroke();
    ctx.fillText(formatZahl(i, 0), xLinks - 4, sy(i));
  }

  // Achsen (kräftig)
  ctx.strokeStyle = stil.text; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(xLinks, yOben); ctx.lineTo(xLinks, yUnten); ctx.lineTo(xRechts, yUnten);
  ctx.stroke();

  // Achsenbeschriftung
  ctx.fillStyle = stil.text; ctx.textAlign = "right"; ctx.textBaseline = "bottom";
  ctx.fillText("U / V", xRechts, yUnten + (stil.linienstaerke > 3 ? 30 : 22));
  ctx.save();
  ctx.translate(xLinks - (stil.linienstaerke > 3 ? 36 : 28), yOben);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText("I / mA", 0, 0);
  ctx.restore();

  // Titel
  ctx.fillStyle = stil.text; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
  ctx.font = (stil.linienstaerke > 3 ? "bold 16px" : "bold 13px") + " sans-serif";
  ctx.fillText("Kennlinie der LED", (xLinks + xRechts) / 2, yOben - 6);
  ctx.font = stil.schrift;

  // --- Diodenkennlinie (Konstantspannungsmodell): I=0 bis U_F, dann fast senkrecht ---
  // Modellhaft: ab U_F steiler exponentieller Anstieg, optisch als Knick + steile Flanke.
  ctx.strokeStyle = stil.akzent; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(sx(0), sy(0));
  ctx.lineTo(sx(z.U_F), sy(0));            // flacher Teil: kein Strom bis U_F
  // steiler Anstieg ab U_F: kleine, schnell wachsende Spannungszunahme bis I_max
  const dU = Math.max(0.06, 0.10);         // sehr schmaler Spannungsbereich für den Anstieg
  for (let n = 1; n <= 24; n++) {
    const frac = n / 24;
    const II = I_max * frac;
    // exponentielle Form: U = U_F + dU*ln(1+ k*frac) — leicht gekrümmte, steile Flanke
    const U = z.U_F + dU * Math.log(1 + 9 * frac) / Math.log(10);
    ctx.lineTo(sx(Math.min(U, U_max)), sy(II));
  }
  ctx.stroke();
  // Beschriftung Kennlinie
  ctx.fillStyle = stil.akzent; ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.fillText("LED-Kennlinie", sx(Math.min(z.U_F + 0.3, U_max - 2)), sy(I_max * 0.78));

  // --- Lastgerade I = (U_q − U)/R, in mA: von (U=0, I=U_q/R*1000) bis (U=U_q, I=0) ---
  ctx.strokeStyle = stil.fehler; ctx.lineWidth = stil.linienstaerke;
  ctx.setLineDash([6, 5]);
  const I0 = (z.U_q / z.R) * 1000;         // Achsenschnitt bei U=0 (mA)
  ctx.beginPath();
  ctx.moveTo(sx(0), sy(I0));
  ctx.lineTo(sx(z.U_q), sy(0));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.fehler; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
  // Beschriftung an der Geraden (etwa in der Mitte)
  const uMitte = z.U_q * 0.5;
  ctx.fillText("Lastgerade", sx(uMitte) + 4, sy((z.U_q - uMitte) / z.R * 1000) - 4);

  // --- Arbeitspunkt = Schnittpunkt: U=U_F, I=I_arb (nur wenn die LED leitet) ---
  if (a.leitet && a.I > 0) {
    const px = sx(z.U_F), py = sy(I_arb_mA);
    // Hilfslinien zum Punkt
    ctx.strokeStyle = stil.ok; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(xLinks, py); ctx.lineTo(px, py);
    ctx.moveTo(px, yUnten); ctx.lineTo(px, py);
    ctx.stroke();
    ctx.setLineDash([]);
    // Punkt
    ctx.fillStyle = stil.ok;
    ctx.beginPath(); ctx.arc(px, py, Math.max(4, welt.laenge(0.12)), 0, 2 * Math.PI); ctx.fill();
    ctx.strokeStyle = stil.flaeche; ctx.lineWidth = 1.5; ctx.stroke();
    // Beschriftung Arbeitspunkt
    ctx.fillStyle = stil.ok; ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("Arbeitspunkt", px + 6, py - 6);
    ctx.fillText("(" + formatZahl(z.U_F, 1) + " V; " + formatZahl(I_arb_mA, 1) + " mA)", px + 6, py + 14);
  } else {
    // LED aus: Hinweis im Panel
    ctx.fillStyle = stil.fehler; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("U_q ≤ U_F → kein Schnittpunkt, I = 0", (xLinks + xRechts) / 2, sy(I_max * 0.45));
  }
}

// „schöne“ Obergrenze (auf 1/2/5·10^k aufrunden) für die I-Achse
function schoeneObergrenze(wert) {
  if (!isFinite(wert) || wert <= 0) return 10;
  const z = Math.pow(10, Math.floor(Math.log10(wert)));
  for (const f of [1, 2, 2.5, 5, 10]) if (wert <= f * z) return f * z;
  return 10 * z;
}
// passender Tick-Abstand zur Obergrenze (ca. 5 Striche)
function schoeneTick(obergrenze) {
  const roh = obergrenze / 5;
  const z = Math.pow(10, Math.floor(Math.log10(roh)));
  for (const f of [1, 2, 2.5, 5, 10]) if (roh <= f * z) return f * z;
  return 10 * z;
}

export function zeichne({ ctx, welt, zustand: z, stil }) {
  const a = analyse(z);
  ctx.save();
  ctx.font = stil.schrift;
  const dick = stil.linienstaerke + 1;
  zeichneSchaltbild(ctx, welt, stil, z, a, dick);
  zeichneKennlinie(ctx, welt, stil, z, a);
  ctx.restore();
}

// ---------- Prüffälle (Konstantspannungsmodell, analytisch verifiziert) ----------
// I = max(0, (U_q − U_F)/R);  I_mA = I·1000;  U_R = I·R = U_q − U_F (wenn an), sonst 0.
// Fall1: (5−2)/220 = 0,0136363… A = 13,636 mA; U_R = 5−2 = 3 V.
// Fall2: U_q=2 ≤ U_F=2 -> LED aus: I = 0 mA, U_R = 0 V.
// Fall3: (9−3,4)/470 = 0,0119148… A = 11,915 mA; U_R = 9−3,4 = 5,6 V.
export const pruefFaelle = [
  {
    name: "Rote/gelbe LED leitet (U_q=5 V, R=220 Ω, U_F=2,0 V)",
    parameter: { U_q: 5, R: 220, U_F: 2.0 },
    toleranzProzent: 1,
    soll: { I_mA: 13.636, U_R: 3 }
  },
  {
    name: "Spannung zu klein — LED aus (U_q=2 V ≤ U_F=2,0 V)",
    parameter: { U_q: 2, R: 220, U_F: 2.0 },
    toleranzProzent: 1,
    soll: { I_mA: 0, U_R: 0 }
  },
  {
    name: "Blaue LED, größerer R (U_q=9 V, R=470 Ω, U_F=3,4 V)",
    parameter: { U_q: 9, R: 470, U_F: 3.4 },
    toleranzProzent: 1,
    soll: { I_mA: 11.915, U_R: 5.6 }
  }
];
