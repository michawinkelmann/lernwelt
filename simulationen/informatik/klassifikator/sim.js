// Klassifikator: die Trennlinie lernen — wie eine einfache KI (ein Perzeptron) zwei
// Punktklassen mit einer GERADEN voneinander trennt. Modus „statisch“: an den Reglern
// w1, w2, b die „Gewichte“ einstellen → die Trennlinie und die Klassifizierung der
// festen Punkte werden sofort neu gerechnet und gezeichnet.
//
// Modell (exakt): Es gibt einen festen Datensatz aus sechs Punkten mit bekannter Klasse
// (wahres Label +1 oder −1). Für einen Punkt (x, y) berechnet das Modell den „Score“
//   score = w1·x + w2·y + b.
// Daraus folgt die vorhergesagte Klasse:  score > 0  →  +1 ,  sonst (score ≤ 0)  →  −1.
// Ein Punkt ist „korrekt“ klassifiziert, wenn die vorhergesagte Klasse mit dem wahren
// Label übereinstimmt. „korrekt“ zählt die richtig klassifizierten Punkte (0 bis 6).
// Die Trennlinie ist die Menge aller Punkte mit score = 0, also w1·x + w2·y + b = 0 —
// das ist eine Gerade, die die Ebene in zwei Halbebenen (Seite +1 und Seite −1) teilt.

import { formatZahl } from "../../../assets/js/sim/welt.js";

// ---------- Fester Datensatz ----------
// Klasse +1 (oben-links): A ; Klasse −1 (unten-rechts): B.
// Jeder Eintrag: { x, y, label } mit label ∈ {+1, −1}.
const DATEN = [
  { x: 1, y: 3, label:  1 },
  { x: 2, y: 4, label:  1 },
  { x: 1, y: 4, label:  1 },
  { x: 3, y: 1, label: -1 },
  { x: 4, y: 2, label: -1 },
  { x: 4, y: 1, label: -1 }
];

// Fester Abfragepunkt Q — „auf welcher Seite der Linie liegt dieser neue Punkt?“
const Q = { x: 2, y: 3 };

export const manifest = {
  id: "informatik/klassifikator",
  titel: "Klassifikator: die Trennlinie lernen",
  modus: "statisch",
  raster: false,     // eigenes Gitter ohne Einheit (abstrakter Merkmalsraum, kein „m“)
  werkzeuge: false,  // keine Mess-Werkzeuge nötig; die Genauigkeit steht in der Anzeige
  parameter: [
    { id: "w1", label: "Gewicht w₁ (für x)", einheit: "", min: -3, max: 3, schritt: 0.5, start: -1 },
    { id: "w2", label: "Gewicht w₂ (für y)", einheit: "", min: -3, max: 3, schritt: 0.5, start:  1 },
    { id: "b",  label: "Schwelle b (Verschiebung)", einheit: "", min: -4, max: 4, schritt: 0.5, start: 0 }
  ],
  anzeigen: [
    { id: "korrekt",    label: "richtig klassifizierte Punkte", einheit: "von 6", stellen: 0 },
    { id: "genauigkeit", label: "Genauigkeit", einheit: "%", stellen: 0 }
  ],
  presets: [
    { name: "Perfekte Trennung",  werte: { w1: -1, w2: 1, b: 0 } },
    { name: "Schlechte Linie",    werte: { w1: 1,  w2: 1, b: 0 } },
    { name: "Senkrechte Linie",   werte: { w1: 1,  w2: 0, b: -2.5 } }
  ],
  vorhersage: {
    frage: "Kann eine einzige gerade Linie diese zwei Punktwolken immer perfekt trennen?",
    optionen: [
      "Ja, immer — egal wie die Punkte liegen",
      "Nur wenn sich die Klassen mit einer Geraden trennen lassen (linear trennbar)",
      "Nein, eine Gerade reicht grundsätzlich nie"
    ],
    aufloesung: "Eine Gerade trennt zwei Klassen genau dann perfekt, wenn die Punkte „linear trennbar“ sind — wenn man also eine Gerade ziehen kann, die alle +1-Punkte auf die eine und alle −1-Punkte auf die andere Seite legt. Bei diesem Datensatz geht das: Stelle das Preset „Perfekte Trennung“ ein (w₁ = −1, w₂ = 1, b = 0). Die Linie ist dann y = x, und die Genauigkeit springt auf 100 %. Gäbe es Punkte, die sich „verzahnen“ (z. B. ein +1-Punkt mitten in der −1-Wolke), bekäme man mit keiner einzigen Geraden 100 % — dann braucht man kompliziertere Modelle."
  },
  beobachtung: [
    "Stelle die Regler so ein, dass die Genauigkeit 100 % erreicht (alle 6 Punkte richtig). Tipp: Probiere zuerst das Preset „Perfekte Trennung“ und verändere dann einen Regler leicht — wann kippt die Genauigkeit?",
    "Drehen: Lass b = 0 und verändere nur w₁ und w₂. Die Linie dreht sich um den Ursprung. Welche Kombinationen aus w₁ und w₂ trennen die Klassen, welche nicht?",
    "Verschieben: Halte w₁ und w₂ fest und verändere nur b. Die Linie bleibt gleich geneigt, wandert aber parallel hin und her. Was passiert mit den falsch markierten Punkten?",
    "Grenzfall: Such eine Einstellung, bei der ein Punkt genau auf der Linie liegt (score = 0). Zu welcher Klasse zählt das Modell ihn dann? (Regel im Modell: score = 0 gilt als −1.)"
  ],
  modellgrenzen: "Dieses Modell trennt ausschließlich mit EINER geraden Linie (lineare Trennung). Hier sind die Gewichte w₁, w₂, b von Hand einstellbar — ein echtes Perzeptron lernt sie selbst, indem es bei jedem falsch klassifizierten Punkt die Gewichte ein Stück korrigiert (Training). Datensätze, die sich nicht mit einer Geraden trennen lassen (nicht-linear trennbar, z. B. das XOR-Muster), brauchen mehr: weitere Merkmale, mehrere Neuronen oder gekrümmte Trennlinien.",
  bilanz: {
    korrekt: { label: "richtig klassifizierte Punkte", einheit: "von 6", stellen: 0 },
    seite_q: { label: "Seite des Abfragepunkts Q(2,3): +1 oder −1", einheit: "", stellen: 0 }
  }
};

// ---------- Modell (exakte lineare Klassifikation) ----------

// Score eines Punktes (x, y) bei Gewichten p = {w1, w2, b}
function score(p, x, y) {
  return p.w1 * x + p.w2 * y + p.b;
}

// Vorhergesagte Klasse: score > 0 → +1 , sonst −1 (score = 0 zählt als −1)
function vorhersageKlasse(p, x, y) {
  return score(p, x, y) > 0 ? 1 : -1;
}

// Anzahl richtig klassifizierter Punkte (0..6)
function zaehleKorrekt(p) {
  let n = 0;
  for (const d of DATEN) if (vorhersageKlasse(p, d.x, d.y) === d.label) n++;
  return n;
}

export function init(p) {
  const korrekt = zaehleKorrekt(p);
  return { t: 0, korrekt, genauigkeit: (korrekt / DATEN.length) * 100 };
}

export function update() { /* statisch: nichts zu tun */ }

export function messwerte(z) {
  return { korrekt: z.korrekt, genauigkeit: z.genauigkeit };
}

export function istFertig() { return true; }

export function bilanz(z, p) {
  // seite_q: Vorzeichen-Klasse des festen Abfragepunkts Q(2,3) unter den aktuellen Gewichten
  return { korrekt: z.korrekt, seite_q: vorhersageKlasse(p, Q.x, Q.y) };
}

// ---------- Sichtbarer Weltausschnitt ----------
// Fest und in x/y gleich skaliert (welt.px/py bilden gleichmaßstäblich ab), damit die
// Geometrie (Winkel der Trennlinie) unverzerrt erscheint — wie bei matrix-abbildung.
export function weltBereich() {
  return { xMin: -1, xMax: 6, yMin: -1, yMax: 6 };
}

// ---------- Darstellung ----------

// Hex/rgb-Farbe der Tokens mit Alpha versehen (Tokens sind hex oder rgb())
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

// Schnittpunkte der Geraden w1·x + w2·y + b = 0 mit dem Rand des Weltausschnitts.
// Liefert zwei Endpunkte [ [x1,y1], [x2,y2] ] oder null, wenn keine echte Linie existiert.
function linienEndpunkte(p, B) {
  const treffer = [];
  const eps = 1e-9;
  // Schnitt mit den senkrechten Rändern x = xMin und x = xMax (nach y auflösen)
  if (Math.abs(p.w2) > eps) {
    for (const x of [B.xMin, B.xMax]) {
      const y = -(p.w1 * x + p.b) / p.w2;
      if (y >= B.yMin - eps && y <= B.yMax + eps) treffer.push([x, y]);
    }
  }
  // Schnitt mit den waagerechten Rändern y = yMin und y = yMax (nach x auflösen)
  if (Math.abs(p.w1) > eps) {
    for (const y of [B.yMin, B.yMax]) {
      const x = -(p.w2 * y + p.b) / p.w1;
      if (x >= B.xMin - eps && x <= B.xMax + eps) treffer.push([x, y]);
    }
  }
  if (treffer.length < 2) return null;
  // Doppelte (Eck-)Treffer entfernen und die zwei am weitesten auseinander liegenden nehmen
  const eindeutig = [];
  for (const t of treffer) {
    if (!eindeutig.some(e => Math.abs(e[0] - t[0]) < 1e-6 && Math.abs(e[1] - t[1]) < 1e-6)) eindeutig.push(t);
  }
  if (eindeutig.length < 2) return null;
  let best = [eindeutig[0], eindeutig[1]], maxD = -1;
  for (let i = 0; i < eindeutig.length; i++) {
    for (let j = i + 1; j < eindeutig.length; j++) {
      const d = Math.hypot(eindeutig[i][0] - eindeutig[j][0], eindeutig[i][1] - eindeutig[j][1]);
      if (d > maxD) { maxD = d; best = [eindeutig[i], eindeutig[j]]; }
    }
  }
  return best;
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const B = welt.bereich;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // --- Halbebenen dezent einfärben (Seite +1 / Seite −1) durch Pixel-Abtastung ---
  // Wir bestimmen für die vier Bildschirmecken das Vorzeichen und füllen jede Halbebene
  // als Polygon. Robust auch bei senkrechten/waagerechten Linien: wir clippen am Rechteck.
  const farbePlus  = stil.akzent;  // Seite +1 (blau)
  const farbeMinus = stil.fehler;  // Seite −1 (rot)
  const ende = linienEndpunkte(p, B);
  if (ende) {
    // Rechteck-Ecken im Uhrzeigersinn
    const ecken = [
      [B.xMin, B.yMin], [B.xMax, B.yMin], [B.xMax, B.yMax], [B.xMin, B.yMax]
    ];
    // Polygon der Seite mit score > 0 bzw. score <= 0 zusammensetzen:
    // Wir laufen den Rechteckrand ab und fügen an den Kanten, die die Linie schneidet,
    // die Schnittpunkte ein; anschließend trennen wir nach Vorzeichen auf.
    const ringPunkte = [];
    for (let i = 0; i < 4; i++) {
      const a = ecken[i], c = ecken[(i + 1) % 4];
      ringPunkte.push(a);
      const sa = score(p, a[0], a[1]);
      const sc = score(p, c[0], c[1]);
      if ((sa > 0) !== (sc > 0) && (sa !== sc)) {
        const tt = sa / (sa - sc); // Parameter, bei dem score = 0
        ringPunkte.push([a[0] + tt * (c[0] - a[0]), a[1] + tt * (c[1] - a[1])]);
      }
    }
    const plus = ringPunkte.filter(q => score(p, q[0], q[1]) >= -1e-9 && score(p, q[0], q[1]) > 0
      || Math.abs(score(p, q[0], q[1])) < 1e-9);
    const minus = ringPunkte.filter(q => score(p, q[0], q[1]) <= 1e-9);
    const fuelle = (punkte, farbe) => {
      if (punkte.length < 3) return;
      ctx.beginPath();
      punkte.forEach((q, i) => { const X = welt.px(q[0]), Y = welt.py(q[1]); if (i === 0) ctx.moveTo(X, Y); else ctx.lineTo(X, Y); });
      ctx.closePath();
      ctx.fillStyle = farbeMitAlpha(farbe, 0.08);
      ctx.fill();
    };
    fuelle(plus, farbePlus);
    fuelle(minus, farbeMinus);
  } else {
    // Keine Linie im Bild (z. B. w1 = w2 = 0): ganze Fläche nach Vorzeichen von b färben
    ctx.fillStyle = farbeMitAlpha(p.b > 0 ? farbePlus : farbeMinus, 0.08);
    ctx.fillRect(welt.px(B.xMin), welt.py(B.yMax), welt.px(B.xMax) - welt.px(B.xMin), welt.py(B.yMin) - welt.py(B.yMax));
  }

  // --- Eigenes Koordinatengitter + Achsen (ohne Einheit, abstrakter Merkmalsraum) ---
  ctx.save();
  ctx.strokeStyle = stil.raster; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = Math.ceil(B.xMin); gx <= B.xMax; gx++) { ctx.moveTo(welt.px(gx), welt.py(B.yMin)); ctx.lineTo(welt.px(gx), welt.py(B.yMax)); }
  for (let gy = Math.ceil(B.yMin); gy <= B.yMax; gy++) { ctx.moveTo(welt.px(B.xMin), welt.py(gy)); ctx.lineTo(welt.px(B.xMax), welt.py(gy)); }
  ctx.stroke();
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(B.xMin), welt.py(0)); ctx.lineTo(welt.px(B.xMax), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(B.yMin)); ctx.lineTo(welt.px(0), welt.py(B.yMax));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung; ctx.font = stil.schrift;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let gx = Math.ceil(B.xMin); gx <= B.xMax; gx++) { if (gx !== 0) ctx.fillText(String(gx), welt.px(gx), welt.py(0) + 4); }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let gy = Math.ceil(B.yMin); gy <= B.yMax; gy++) { if (gy !== 0) ctx.fillText(String(gy), welt.px(0) - 5, welt.py(gy)); }
  // Achsentitel (Merkmale x und y)
  ctx.fillStyle = stil.beschriftung; ctx.font = stil.schrift;
  ctx.textAlign = "right"; ctx.textBaseline = "top";
  ctx.fillText("Merkmal x", welt.px(B.xMax) - 2, welt.py(0) + 4);
  ctx.save();
  ctx.translate(welt.px(0) - 5, welt.py(B.yMax) + 2);
  ctx.textAlign = "left"; ctx.textBaseline = "bottom";
  ctx.fillText("Merkmal y", 4, 0);
  ctx.restore();
  ctx.restore();

  // --- Trennlinie  w1·x + w2·y + b = 0  als Gerade über den Bereich ---
  if (ende) {
    ctx.save();
    ctx.strokeStyle = stil.text;
    ctx.lineWidth = stil.linienstaerke + 1;
    ctx.beginPath();
    ctx.moveTo(welt.px(ende[0][0]), welt.py(ende[0][1]));
    ctx.lineTo(welt.px(ende[1][0]), welt.py(ende[1][1]));
    ctx.stroke();
    ctx.restore();
  }

  // --- Die sechs Datenpunkte: Klasse +1 als blaue Kreise, Klasse −1 als rote Quadrate ---
  // Falsch klassifizierte Punkte bekommen einen dicken dunklen Rand und ein ✗.
  const r = Math.max(7, welt.laenge(0.18));
  const basis = parseFloat(stil.schrift) || 12;
  for (const d of DATEN) {
    const X = welt.px(d.x), Y = welt.py(d.y);
    const vorh = vorhersageKlasse(p, d.x, d.y);
    const richtig = vorh === d.label;
    const farbe = d.label === 1 ? farbePlus : farbeMinus;
    ctx.fillStyle = farbe;
    ctx.strokeStyle = richtig ? stil.flaeche : stil.text;
    ctx.lineWidth = richtig ? 1.5 : Math.max(3, stil.linienstaerke + 1.5);
    if (d.label === 1) {
      // Klasse +1: Kreis
      ctx.beginPath();
      ctx.arc(X, Y, r, 0, 2 * Math.PI);
      ctx.fill();
      ctx.stroke();
    } else {
      // Klasse −1: Quadrat
      ctx.beginPath();
      ctx.rect(X - r, Y - r, 2 * r, 2 * r);
      ctx.fill();
      ctx.stroke();
    }
    if (!richtig) {
      // ✗ als Markierung für „falsch klassifiziert“
      ctx.strokeStyle = stil.text;
      ctx.lineWidth = Math.max(2, stil.linienstaerke);
      const k = r * 0.62;
      ctx.beginPath();
      ctx.moveTo(X - k, Y - k); ctx.lineTo(X + k, Y + k);
      ctx.moveTo(X + k, Y - k); ctx.lineTo(X - k, Y + k);
      ctx.stroke();
    }
  }

  // --- Abfragepunkt Q als kleine Raute mit Beschriftung (neuer, unbekannter Punkt) ---
  {
    const X = welt.px(Q.x), Y = welt.py(Q.y);
    const seite = vorhersageKlasse(p, Q.x, Q.y);
    const rq = Math.max(6, welt.laenge(0.15));
    ctx.fillStyle = seite === 1 ? farbeMitAlpha(farbePlus, 0.9) : farbeMitAlpha(farbeMinus, 0.9);
    ctx.strokeStyle = stil.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(X, Y - rq); ctx.lineTo(X + rq, Y); ctx.lineTo(X, Y + rq); ctx.lineTo(X - rq, Y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = stil.text;
    ctx.font = "700 " + Math.max(11, basis) + "px sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "bottom";
    ctx.fillText("Q → " + (seite === 1 ? "+1" : "−1"), X + rq + 4, Y - 2);
  }

  // --- Genauigkeit groß oben rechts anzeigen ---
  {
    const proz = Math.round(z.genauigkeit);
    const gross = Math.max(22, (stil.linienstaerke > 3 ? 40 : 28));
    ctx.textAlign = "right"; ctx.textBaseline = "top";
    ctx.font = "700 " + gross + "px sans-serif";
    ctx.fillStyle = proz === 100 ? stil.ok : (proz === 0 ? stil.fehler : stil.text);
    ctx.fillText(proz + " %", welt.px(B.xMax) - 8, welt.py(B.yMax) + 6);
    ctx.font = "600 " + Math.max(12, basis + 1) + "px sans-serif";
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText("Genauigkeit (" + z.korrekt + "/6)", welt.px(B.xMax) - 8, welt.py(B.yMax) + 6 + gross + 2);
  }

  // --- Legende + Score-Formel unten links ---
  {
    const xText = 12;
    let yText = welt.hoehe - 12;
    const klein = Math.max(11, basis);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    // Score-Formel mit aktuellen Gewichten
    ctx.font = "700 " + klein + "px sans-serif";
    ctx.fillStyle = stil.text;
    ctx.fillText("score = " + zahl(p.w1) + "·x + " + zahl(p.w2) + "·y + " + zahl(p.b), xText, yText);
    yText -= klein + 8;
    // Legende: Kreis +1 / Quadrat −1
    ctx.font = klein + "px sans-serif";
    const ry = klein * 0.5;
    // Kreis
    ctx.fillStyle = farbePlus;
    ctx.beginPath(); ctx.arc(xText + ry, yText - ry, ry, 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText("Klasse +1", xText + 2 * ry + 6, yText);
    // Quadrat
    const x2 = xText + 2 * ry + 6 + 70;
    ctx.fillStyle = farbeMinus;
    ctx.fillRect(x2, yText - 2 * ry, 2 * ry, 2 * ry);
    ctx.fillStyle = stil.beschriftung;
    ctx.fillText("Klasse −1", x2 + 2 * ry + 6, yText);
  }
}

// Zahl ohne überflüssige Nachkommastellen: 6 → „6“, 2,5 → „2,5“, −1 → „−1“
function zahl(wert) {
  let s;
  if (Math.abs(wert - Math.round(wert)) < 1e-9) s = formatZahl(wert, 0);
  else if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) s = formatZahl(wert, 1);
  else s = formatZahl(wert, 2);
  return s;
}

// ---------- Prüffälle ----------
// Soll-Werte analytisch nachgerechnet (Konvention: score > 0 → +1, sonst −1):
//   1) w1=−1, w2=1, b=0  → Linie y = x trennt perfekt (alle 6 richtig); Q(2,3): −2+3=1>0 → +1
//   2) w1=1,  w2=0, b=−2.5 → senkrechte Linie x=2,5 „falsch herum“ (alle 6 falsch); Q: 2−2,5=−0,5<0 → −1
//   3) w1=0,  w2=1, b=−2.5 → waagerechte Linie y=2,5; Q(2,3): 3−2,5=0,5>0 → +1
// (toleranzProzent 1; bei Soll = 0 prüft die Validierung absolut; seite_q ist ±1.)

export const pruefFaelle = [
  {
    name: "Perfekte Trennung (y = x)",
    parameter: { w1: -1, w2: 1, b: 0 },
    toleranzProzent: 1,
    soll: { korrekt: 6, seite_q: 1 }
  },
  {
    name: "Senkrechte Linie, falsch herum (x = 2,5)",
    parameter: { w1: 1, w2: 0, b: -2.5 },
    toleranzProzent: 1,
    soll: { korrekt: 0, seite_q: -1 }
  },
  {
    name: "Waagerechte Linie (y = 2,5) — Seite von Q",
    parameter: { w1: 0, w2: 1, b: -2.5 },
    toleranzProzent: 1,
    soll: { seite_q: 1 }
  }
];
