// Bewegungsdiagramme — gleichmäßig beschleunigte geradlinige Bewegung.
// Ein Fahrzeug fährt mit Startgeschwindigkeit v0 und konstanter Beschleunigung a.
// Modell: x(t) = v0·t + ½a·t², v(t) = v0 + a·t (SI-Einheiten, eine Raumrichtung).
// Zeitschritt in Verlet-Form (Geschwindigkeits-Mittelwert) — bei konstantem a exakt.
// Der letzte Schritt wird exakt auf tFahr interpoliert. Negatives v ist erlaubt
// (Umkehr/Rückwärtsfahrt): x kann dann zurücklaufen — das ist gewollt.

export const manifest = {
  id: "physik/bewegungsdiagramme",
  titel: "Bewegungsdiagramme",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 30,
  parameter: [
    { id: "v0",    label: "Startgeschwindigkeit", einheit: "m/s",  min: 0,  max: 15, schritt: 0.5, start: 0 },
    { id: "a",     label: "Beschleunigung",       einheit: "m/s²", min: -3, max: 3,  schritt: 0.1, start: 2 },
    { id: "tFahr", label: "Fahrzeit",             einheit: "s",    min: 1,  max: 20, schritt: 1,   start: 6 }
  ],
  anzeigen: [
    { id: "t", label: "Zeit",            einheit: "s",   stellen: 2 },
    { id: "x", label: "Ort",             einheit: "m",   stellen: 2 },
    { id: "v", label: "Geschwindigkeit", einheit: "m/s", stellen: 2 }
  ],
  diagramme: [
    { x: "t", y: "x", titel: "Ort über Zeit (x-t-Diagramm)" },
    { x: "t", y: "v", titel: "Geschwindigkeit über Zeit (v-t-Diagramm)" }
  ],
  presets: [
    { name: "Konstante Fahrt", werte: { v0: 5,  a: 0,  tFahr: 10 } },
    { name: "Anfahren",        werte: { v0: 0,  a: 2,  tFahr: 6 } },
    { name: "Bremsung",        werte: { v0: 12, a: -2, tFahr: 6 } },
    { name: "Wende",           werte: { v0: 6,  a: -2, tFahr: 8 } }
  ],
  vorhersage: {
    frage: "Ein Fahrzeug fährt mit v₀ = 12 m/s und bremst mit a = −2 m/s² für 6 s (Preset „Bremsung“). Wie sieht das x-t-Diagramm am Ende aus?",
    optionen: [
      "Eine fallende Gerade — der Ort wird kleiner",
      "Eine nach oben gekrümmte Parabel, die immer steiler wird",
      "Eine nach unten gekrümmte Kurve, die zum Schluss waagerecht ausläuft"
    ],
    aufloesung: "Antwort C ist richtig. Der Ort x nimmt die ganze Zeit zu (das Fahrzeug fährt vorwärts), aber immer langsamer: Die x-t-Kurve steigt anfangs steil und wird flacher, weil die Geschwindigkeit gleichmäßig auf 0 sinkt. Bei t = 6 s ist v = 0 — dort verläuft die Kurve waagerecht, das Fahrzeug steht (Endweg 36 m). Es ist eine nach unten gekrümmte Parabel."
  },
  beobachtung: [
    "Stelle das Preset „Anfahren“ ein. Vergleiche beide Diagramme: Das v-t-Diagramm ist eine ansteigende Gerade, das x-t-Diagramm eine immer steilere Parabel. Woran erkennst du im x-t-Diagramm, dass das Fahrzeug schneller wird?",
    "Lies an einer Stelle die Steigung des x-t-Graphen ab (z. B. mit dem Lineal). Welcher Wert steht zur gleichen Zeit im v-t-Diagramm? Die Steigung im x-t-Diagramm ist die Geschwindigkeit.",
    "Die Fläche zwischen v-t-Graph und Zeitachse ist der zurückgelegte Weg. Prüfe das beim Preset „Konstante Fahrt“ (Rechteck) und „Anfahren“ (Dreieck) und vergleiche mit dem Endweg.",
    "Stelle das Preset „Wende“ ein. Das Fahrzeug fährt erst vorwärts, kehrt um und endet hinter dem Start. Wo wird v negativ, und was macht das x-t-Diagramm an dieser Stelle?"
  ],
  modellgrenzen: "Idealisierte geradlinige Bewegung mit exakt konstanter Beschleunigung — keine Reibung, kein Ruck beim Gas-/Bremswechsel. Reale Fahrzeuge beschleunigen ungleichmäßig; eine Bremsung endet außerdem beim Stillstand und läuft nicht rückwärts weiter.",
  bilanz: {
    endweg:         { label: "Endweg x(tFahr)",     einheit: "m",   stellen: 2 },
    endgeschw:      { label: "Endgeschw. v(tFahr)", einheit: "m/s", stellen: 2 },
    mittlere_geschw:{ label: "mittlere Geschw.",    einheit: "m/s", stellen: 2 }
  }
};

export function init(p) {
  return {
    t: 0,
    x: 0,
    v: p.v0,
    spur: [[0, 0]],   // [t, x] für die Diagramm-Spur (hier nur zur Veranschaulichung)
    fertig: false
  };
}

// Verlet-Form: neue Geschwindigkeit, Ort mit gemitteltem v — bei konstantem a exakt.
// Letzter Schritt wird exakt auf tFahr interpoliert.
export function update(z, p, dt) {
  if (z.fertig) return;
  let schritt = dt;
  let letzter = false;
  // letzten Teilschritt exakt auf tFahr kürzen
  if (z.t + schritt >= p.tFahr) {
    schritt = p.tFahr - z.t;
    letzter = true;
  }
  const vAlt = z.v;
  z.v = vAlt + p.a * schritt;
  z.x += (vAlt + z.v) / 2 * schritt;   // Geschwindigkeits-Mittelwert: exakt bei konstantem a
  z.t += schritt;
  if (z.spur.length < 6000) z.spur.push([z.t, z.x]);
  if (letzter || z.t >= p.tFahr - 1e-9) {
    z.t = p.tFahr;
    z.fertig = true;
  }
}

export function messwerte(z) {
  return { t: z.t, x: z.x, v: z.v };
}

export function istFertig(z) { return z.fertig; }

export function bilanz(z, p) {
  const endweg = z.x;
  const endgeschw = z.v;
  const mittlere_geschw = p.tFahr > 0 ? endweg / p.tFahr : 0;
  return { endweg, endgeschw, mittlere_geschw };
}

// Weltbereich analytisch aus v0, a, tFahr: Bahn x(t) = v0·t + ½a·t².
// Extremum bei t* = −v0/a (falls 0 < t* < tFahr); dort liegt das Minimum bzw. Maximum.
export function weltBereich(p) {
  const xAt = t => p.v0 * t + 0.5 * p.a * t * t;
  let xMin = 0;
  let xMax = xAt(p.tFahr);
  const xEnd = xMax;
  // Endpunkt einbeziehen
  xMin = Math.min(0, xEnd);
  xMax = Math.max(0, xEnd);
  // Scheitel der Bahn (nur wenn a ≠ 0 und t* echt im Intervall liegt)
  if (Math.abs(p.a) > 1e-9) {
    const tStern = -p.v0 / p.a;
    if (tStern > 0 && tStern < p.tFahr) {
      const xStern = xAt(tStern);
      xMin = Math.min(xMin, xStern);
      xMax = Math.max(xMax, xStern);
    }
  }
  // Mindestspanne und Rand, damit Straße + Fahrzeug sichtbar bleiben
  if (xMax - xMin < 4) { const m = (xMin + xMax) / 2; xMin = m - 2; xMax = m + 2; }
  const rand = (xMax - xMin) * 0.08 + 1;
  // Straße als schmaler Streifen um y = 0
  return { xMin: xMin - rand, xMax: xMax + rand, yMin: -3, yMax: 3 };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const yStrasse = 0;
  // Straße (Fahrbahn) als waagerechte Linie
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(welt.bereich.xMin), welt.py(yStrasse));
  ctx.lineTo(welt.px(welt.bereich.xMax), welt.py(yStrasse));
  ctx.stroke();

  // Startmarke bei x = 0
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 4]);
  ctx.beginPath();
  ctx.moveTo(welt.px(0), welt.py(-1.4));
  ctx.lineTo(welt.px(0), welt.py(1.4));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.beschriftung;
  ctx.font = stil.schrift || "12px sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText("Start", welt.px(0), welt.py(1.5));

  // Geschwindigkeitspfeil (über dem Fahrzeug, Vorschau von 0,5 s)
  const laengeFaktor = 0.5;
  pfeil(ctx,
    welt.px(z.x), welt.py(1.6),
    welt.px(z.x + z.v * laengeFaktor), welt.py(1.6),
    stil.ok, stil.linienstaerke);

  // Fahrzeug als Rechteck, Position auf der Straße
  const breiteM = Math.max(0.6, (welt.bereich.xMax - welt.bereich.xMin) * 0.04);
  const hoeheM = breiteM * 0.6;
  const px = welt.px(z.x);
  const py = welt.py(yStrasse);
  const bw = welt.laenge(breiteM);
  const bh = welt.laenge(hoeheM);
  ctx.fillStyle = stil.akzent;
  ctx.fillRect(px - bw / 2, py - bh, bw, bh);
  // zwei Räder
  ctx.fillStyle = stil.text;
  const r = Math.max(2, bh * 0.22);
  ctx.beginPath();
  ctx.arc(px - bw * 0.28, py, r, 0, 2 * Math.PI);
  ctx.arc(px + bw * 0.28, py, r, 0, 2 * Math.PI);
  ctx.fill();
}

function pfeil(ctx, x1, y1, x2, y2, farbe, staerke) {
  const dx = x2 - x1, dy = y2 - y1;
  const laenge = Math.hypot(dx, dy);
  if (laenge < 8) return;
  ctx.strokeStyle = farbe;
  ctx.fillStyle = farbe;
  ctx.lineWidth = staerke;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const w = Math.atan2(dy, dx), k = 8 + staerke * 2;
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - k * Math.cos(w - 0.45), y2 - k * Math.sin(w - 0.45));
  ctx.lineTo(x2 - k * Math.cos(w + 0.45), y2 - k * Math.sin(w + 0.45));
  ctx.closePath();
  ctx.fill();
}

// ---------- Prüffälle (analytisch: x = v0·t + ½at², v = v0 + at) ----------

export const pruefFaelle = [
  {
    name: "Konstante Fahrt: v0 = 5 m/s, a = 0, tFahr = 10 s",
    parameter: { v0: 5, a: 0, tFahr: 10 },
    toleranzProzent: 0.5,
    soll: { endweg: 50, endgeschw: 5, mittlere_geschw: 5 }
  },
  {
    name: "Anfahren: v0 = 0, a = 2 m/s², tFahr = 5 s",
    parameter: { v0: 0, a: 2, tFahr: 5 },
    toleranzProzent: 0.5,
    soll: { endweg: 25, endgeschw: 10, mittlere_geschw: 5 }
  },
  {
    name: "Bremsen: v0 = 10 m/s, a = −1 m/s², tFahr = 8 s",
    parameter: { v0: 10, a: -1, tFahr: 8 },
    toleranzProzent: 0.5,
    soll: { endweg: 48, endgeschw: 2, mittlere_geschw: 6 }
  }
];
