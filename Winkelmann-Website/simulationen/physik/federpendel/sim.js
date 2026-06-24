// Federpendel — ungedämpfte harmonische Schwingung eines Feder-Masse-Pendels.
// Modell (SI-Einheiten): Auslenkung y aus der Gleichgewichtslage, positiv = nach
// unten; Start am unteren Umkehrpunkt: y(0) = y0, v(0) = 0. Rückstellgesetz
// F = -D·y, also a = -(D/m)·y — die Gewichtskraft steckt bereits in der Lage der
// Gleichgewichtslage und taucht deshalb nicht mehr auf. Integration semi-implizit
// (Euler-Cromer: erst v, dann y mit dem neuen v) — symplektisch, die Amplitude
// driftet praktisch nicht. Analytische Vergleichswerte: y(t) = y0·cos(ωt) mit
// ω = √(D/m), T = 2π·√(m/D), v_max = ω·y0. Die Simulation läuft genau zwei
// Perioden; der letzte Zeitschritt wird exakt auf t = 2T gekappt.

const X_FEDER = 0.25;    // x-Position der Federachse (m)
const Y_DECKE = 0.78;    // Höhe der Deckenbefestigung (m)
const L0 = 0.33;         // Federlänge in der Gleichgewichtslage (m)
const WINDUNGEN = 8;     // feste Windungszahl der Feder
const X_SPUR_0 = 0.55;   // Beginn des y(t)-Spurbereichs (m)
const X_SPUR_1 = 1.34;   // Ende des y(t)-Spurbereichs (m)

function periodendauer(p) {
  return 2 * Math.PI * Math.sqrt(p.m / p.federD);
}

// Kantenlänge des Masseklotzes: wächst dezent mit ∛m (wie bei konstanter Dichte)
function masseKante(m) {
  return 0.055 + 0.035 * Math.cbrt(m / 2);
}

export const manifest = {
  id: "physik/federpendel",
  titel: "Federpendel",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 30,
  schrittweite: 0.05,
  parameter: [
    { id: "m",      label: "Masse",             einheit: "kg",  min: 0.05, max: 2,    schritt: 0.05, start: 0.5 },
    { id: "federD", label: "Federkonstante D",  einheit: "N/m", min: 5,    max: 100,  schritt: 5,    start: 20 },
    { id: "y0",     label: "Anfangsauslenkung", einheit: "m",   min: 0.02, max: 0.15, schritt: 0.01, start: 0.1 }
  ],
  anzeigen: [
    { id: "t",              label: "Zeit",                       einheit: "s",   stellen: 2 },
    { id: "y",              label: "Auslenkung",                 einheit: "m",   stellen: 3 },
    { id: "v",              label: "Geschwindigkeit",            einheit: "m/s", stellen: 3 },
    { id: "T",              label: "Periodendauer (analytisch)", einheit: "s",   stellen: 3 },
    { id: "f",              label: "Frequenz",                   einheit: "Hz",  stellen: 3 },
    { id: "vMaxAnalytisch", label: "v_max (analytisch)",         einheit: "m/s", stellen: 3 }
  ],
  diagramme: [
    { x: "t", y: "y", titel: "Auslenkung über der Zeit (t-y-Diagramm)" },
    { x: "t", y: "v", titel: "Geschwindigkeit über der Zeit (t-v-Diagramm)" }
  ],
  presets: [
    { name: "Standard",      werte: { m: 0.5, federD: 20, y0: 0.1 } },
    { name: "schwere Masse", werte: { m: 2,   federD: 20, y0: 0.1 } },
    { name: "harte Feder",   werte: { m: 0.5, federD: 80, y0: 0.1 } }
  ],
  vorhersage: {
    frage: "Schwingt eine schwerere Masse an derselben Feder schneller oder langsamer?",
    optionen: [
      "Schneller — die stärker gedehnte Feder zieht kräftiger",
      "Langsamer — die größere Trägheit verzögert das Hin und Her",
      "Gleich schnell — die Masse hat keinen Einfluss"
    ],
    aufloesung: "Langsamer: In T = 2π·√(m/D) steht die Masse unter der Wurzel — die vierfache Masse verdoppelt die Periodendauer. Die stärkere Vordehnung der Feder verschiebt nur die Gleichgewichtslage, nicht den Takt. Und anders als beim Fadenpendel kürzt sich die Masse nicht heraus: Die Rückstellkraft kommt von der Feder und wächst nicht mit m mit."
  },
  beobachtung: [
    "Starte das Preset „Standard“ (m = 0,5 kg) und lies die Periodendauer an der gestrichelten Marke „t = T“ bzw. im t-y-Diagramm ab. Vervierfache dann die Masse (Preset „schwere Masse“, 2 kg): T verdoppelt sich nur — der Wurzel-Zusammenhang T ~ √m.",
    "Vervierfache stattdessen die Federkonstante (Preset „harte Feder“, D = 20 → 80 N/m): T halbiert sich, denn D steht unter der Wurzel im Nenner.",
    "Ändere nur die Anfangsauslenkung y₀ (z. B. 0,03 m gegen 0,15 m): Die Kurve wird höher, aber T bleibt exakt gleich — die Periodendauer hängt nicht von der Amplitude ab. Genau das zeichnet die harmonische Schwingung aus.",
    "Vergleiche t-y- und t-v-Diagramm: Wo ist die Geschwindigkeit am größten, wo ist sie null? (Beim Durchgang durch die Gleichgewichtslage bzw. an den Umkehrpunkten.) Vergleiche den Spitzenwert im t-v-Diagramm mit der Anzeige v_max = √(D/m)·y₀."
  ],
  modellgrenzen: "Ungedämpfte Idealfeder: keine Reibung, keine Federmasse, das hookesche Gesetz F = −D·y gilt exakt. Die Erdbeschleunigung steckt bereits in der Lage der Gleichgewichtslage — sie dehnt die Feder vor, ändert aber weder Rückstellgesetz noch Periodendauer. Reale Federpendel schwingen gedämpft (die Amplitude nimmt ab), und große Auslenkungen verlassen den linearen Bereich der Feder.",
  bilanz: {
    T:              { label: "Periodendauer T",     einheit: "s",   stellen: 3 },
    vMaxAnalytisch: { label: "v_max (analytisch)",  einheit: "m/s", stellen: 3 },
    yEnde:          { label: "Auslenkung nach 2 T", einheit: "m",   stellen: 3 }
  }
};

export function init(p) {
  return {
    t: 0,
    y: p.y0,          // Start am unteren Umkehrpunkt
    v: 0,
    fertig: false,
    spur: [[0, p.y0]] // [t, y] für die Spur auf der Zeichenfläche
  };
}

// Euler-Cromer (semi-implizit): erst v mit a = -(D/m)·y, dann y mit dem neuen v.
// Der letzte Teilschritt wird exakt auf t = 2T gekappt, damit die Bilanz genau
// am Ende der zweiten Periode entsteht (auch im Headless-Lauf).
export function update(z, p, dt) {
  if (z.fertig) return;
  const tEnde = 2 * periodendauer(p);
  let schritt = dt;
  if (z.t + schritt >= tEnde) {
    schritt = Math.max(0, tEnde - z.t);
    z.fertig = true;
  }
  z.v += -(p.federD / p.m) * z.y * schritt;
  z.y += z.v * schritt;
  z.t = z.fertig ? tEnde : z.t + schritt;
  if (z.spur.length < 6000) z.spur.push([z.t, z.y]);
}

export function messwerte(z, p) {
  const T = periodendauer(p);
  return {
    t: z.t,
    y: z.y,
    v: z.v,
    T,
    f: 1 / T,
    vMaxAnalytisch: Math.sqrt(p.federD / p.m) * p.y0
  };
}

export function istFertig(z) { return z.fertig; }

// Bilanz in Anzeigeeinheiten (hier SI): analytische Kontrollwerte und yEnde als
// Integrationstest — nach exakt zwei Perioden muss wieder y = y0 herauskommen.
export function bilanz(z, p) {
  return {
    T: periodendauer(p),
    vMaxAnalytisch: Math.sqrt(p.federD / p.m) * p.y0,
    yEnde: z.y
  };
}

// Fester Weltausschnitt: links Decke/Feder/Masse, rechts die y(t)-Spur
export function weltBereich() {
  return { xMin: 0, xMax: 1.4, yMin: 0, yMax: 0.85 };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const kante = masseKante(p.m);
  const federEnde = Y_DECKE - L0 - z.y;            // unteres Federende (Welt-y)
  const ruheZentrum = Y_DECKE - L0 - kante / 2;    // Massenmittelpunkt in der Gleichgewichtslage
  const tEnde = 2 * periodendauer(p);
  const spurX = t => X_SPUR_0 + (X_SPUR_1 - X_SPUR_0) * (t / tEnde);
  const spurOben = ruheZentrum + p.y0 + 0.04;      // oberer Rand des Spurbereichs
  const spurUnten = ruheZentrum - p.y0 - 0.04;     // unterer Rand des Spurbereichs

  ctx.save();
  ctx.font = stil.schrift;

  // Gleichgewichtslage: gestrichelte Linie quer über Pendel und Spur (zugleich
  // die y = 0-Achse der Spur, gleiche Höhenskala 1 : 1 in Metern)
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(welt.px(0.06), welt.py(ruheZentrum));
  ctx.lineTo(welt.px(X_SPUR_1 + 0.02), welt.py(ruheZentrum));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "right";
  ctx.textBaseline = "bottom";
  ctx.fillText("Gleichgewichtslage", welt.px(X_SPUR_1), welt.py(ruheZentrum) - 4);

  // Marke t = T in der Spur: gestrichelte Hilfslinie nach einer vollen Periode
  const xMarke = spurX(periodendauer(p));
  ctx.strokeStyle = stil.beschriftung;
  ctx.setLineDash([5, 4]);
  ctx.beginPath();
  ctx.moveTo(welt.px(xMarke), welt.py(spurUnten));
  ctx.lineTo(welt.px(xMarke), welt.py(spurOben));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.text;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("t = T", welt.px(xMarke), welt.py(spurOben) - 3);
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.fillText("y(t)", welt.px(X_SPUR_0), welt.py(spurOben) - 3);

  // Spur: bisheriger Verlauf y(t), 1 : 1 an der Gleichgewichtslage gespiegelt
  if (z.spur.length > 1) {
    ctx.strokeStyle = stil.akzent;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    z.spur.forEach(([ti, yi], i) => {
      const sx = welt.px(spurX(ti));
      const sy = welt.py(ruheZentrum - yi);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
    const [tL, yL] = z.spur[z.spur.length - 1];
    ctx.fillStyle = stil.akzent;
    ctx.beginPath();
    ctx.arc(welt.px(spurX(tL)), welt.py(ruheZentrum - yL), Math.max(3, stil.linienstaerke + 1), 0, 2 * Math.PI);
    ctx.fill();
  }

  // Decke mit Schraffur
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(0.08), welt.py(Y_DECKE));
  ctx.lineTo(welt.px(0.42), welt.py(Y_DECKE));
  ctx.stroke();
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let sx = 0.08; sx <= 0.40 + 1e-9; sx += 0.04) {
    ctx.moveTo(welt.px(sx), welt.py(Y_DECKE));
    ctx.lineTo(welt.px(sx + 0.025), welt.py(Y_DECKE + 0.03));
  }
  ctx.stroke();

  // Feder als Zickzack-Polylinie: feste Windungszahl, Länge folgt der Auslenkung
  const anlauf = 0.03;                      // gerade Endstücke oben und unten
  const yA = Y_DECKE - anlauf;
  const yB = federEnde + anlauf;
  const halbwindungen = 2 * WINDUNGEN;
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.lineJoin = "round";
  ctx.beginPath();
  ctx.moveTo(welt.px(X_FEDER), welt.py(Y_DECKE));
  ctx.lineTo(welt.px(X_FEDER), welt.py(yA));
  for (let i = 1; i <= halbwindungen; i++) {
    const yi = yA + (yB - yA) * (i - 0.5) / halbwindungen;
    ctx.lineTo(welt.px(X_FEDER + (i % 2 === 1 ? 0.045 : -0.045)), welt.py(yi));
  }
  ctx.lineTo(welt.px(X_FEDER), welt.py(yB));
  ctx.lineTo(welt.px(X_FEDER), welt.py(federEnde));
  ctx.stroke();

  // Masseklotz am Federende (Kantenlänge wächst dezent mit der Masse)
  ctx.fillStyle = stil.akzent;
  ctx.fillRect(welt.px(X_FEDER - kante / 2), welt.py(federEnde), welt.laenge(kante), welt.laenge(kante));

  // Auslenkungspfeil: von der Gleichgewichtslage zum aktuellen Massenmittelpunkt
  const zentrum = ruheZentrum - z.y;
  if (Math.abs(z.y) > 0.005) {
    pfeil(ctx, welt.px(0.42), welt.py(ruheZentrum), welt.px(0.42), welt.py(zentrum), stil.fehler, stil.linienstaerke);
    ctx.fillStyle = stil.fehler;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("y", welt.px(0.42) + 6, welt.py((ruheZentrum + zentrum) / 2));
  }

  ctx.restore();
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

// ---------- Prüffälle (analytisch bekannte Lösungen, Pflicht vor status: online) ----------
// T = 2π·√(m/D), v_max = √(D/m)·y0; yEnde prüft die Integration: nach exakt
// zwei Perioden muss die Masse wieder am Startpunkt y0 stehen (Energie-Drift).

export const pruefFaelle = [
  {
    name: "Standard: m = 0,5 kg, D = 20 N/m, y₀ = 0,1 m",
    parameter: { m: 0.5, federD: 20, y0: 0.1 },
    toleranzProzent: 1,
    soll: { T: 0.99346, vMaxAnalytisch: 0.63246, yEnde: 0.1 }
  },
  {
    name: "Schwerere Masse: m = 1 kg, D = 25 N/m, y₀ = 0,05 m",
    parameter: { m: 1, federD: 25, y0: 0.05 },
    toleranzProzent: 1,
    soll: { T: 1.25664, vMaxAnalytisch: 0.25 }
  },
  {
    name: "Harte Feder: m = 0,2 kg, D = 80 N/m, y₀ = 0,1 m",
    parameter: { m: 0.2, federD: 80, y0: 0.1 },
    toleranzProzent: 1,
    soll: { T: 0.31416, vMaxAnalytisch: 2 }
  }
];
