// Energieerhaltung am Fadenpendel — Umwandlung zwischen Lage- und Bewegungsenergie
// bei der Schwingung eines Fadenpendels; bei Reibung wird ein Teil in Wärme
// umgewandelt. Modell (SI-Einheiten): Auslenkwinkel θ (rad) aus der Ruhelage,
// Bewegungsgleichung θ'' = −(g/L)·sinθ − k·θ'  (mathematisches Pendel mit linearer
// Dämpfung, KEINE Kleinwinkelnäherung — sinθ exakt). Integration semi-implizit
// (Euler-Cromer: erst Winkelgeschwindigkeit ω = θ', dann Winkel θ mit dem neuen ω)
// mit dt = 1/240 s — symplektisch, daher driftet die Gesamtenergie bei k = 0
// praktisch nicht und bleibt gleich der analytischen Startenergie.
//
// Nullpunkt der Höhe am tiefsten Punkt (θ = 0). Energien:
//   E_pot = m·g·L·(1 − cos θ)          (Lageenergie über dem tiefsten Punkt)
//   E_kin = ½·m·(L·θ')²                 (Bewegungsenergie, Bahngeschwindigkeit v = L·θ')
//   E_ges = E_pot + E_kin               (ohne Reibung konstant)
//   v     = L·|θ'|                       (Bahngeschwindigkeit der Masse)
// Bei Reibung (k > 0) sinkt E_ges; die Differenz steckt als Wärme im System:
//   E_waerme = E_ges_start − E_ges.
//
// Analytische Kontrolle (reibungsfrei, k = 0): Aus der Energieerhaltung folgt am
// tiefsten Punkt E_kin = E_ges_start, also
//   v_max = √(2·g·L·(1 − cos θ₀))   bzw.   v_max = √(2·E_start/m).

const G = 9.81;             // Erdbeschleunigung (m/s²)
const X_AUFH = 0.85;        // x-Position der Aufhängung (Welt, m)
const Y_AUFH = 1.45;        // Höhe der Aufhängung (Welt, m)

// Massenradius wächst dezent mit ∛m (wie bei konstanter Dichte) — nur Darstellung
function masseRadius(m) {
  return 0.05 + 0.03 * Math.cbrt(m / 2);
}

export const manifest = {
  id: "physik/energie-erhaltung",
  titel: "Energieerhaltung am Fadenpendel",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 20,
  schrittweite: 0.05,
  parameter: [
    { id: "winkel0", label: "Anfangswinkel θ₀", einheit: "°",   min: 10,  max: 90, schritt: 5,    start: 60 },
    { id: "laenge",  label: "Pendellänge L",     einheit: "m",   min: 0.3, max: 2,  schritt: 0.1,  start: 1 },
    { id: "masse",   label: "Masse m",           einheit: "kg",  min: 0.2, max: 2,  schritt: 0.1,  start: 1 },
    { id: "reibung", label: "Dämpfung k",        einheit: "1/s", min: 0,   max: 0.5, schritt: 0.05, start: 0 }
  ],
  anzeigen: [
    { id: "t",     label: "Zeit",            einheit: "s",   stellen: 2 },
    { id: "EPot",  label: "Lageenergie E_pot",      einheit: "J",   stellen: 2 },
    { id: "EKin",  label: "Bewegungsenergie E_kin", einheit: "J",   stellen: 2 },
    { id: "EGes",  label: "Gesamtenergie E_ges",    einheit: "J",   stellen: 2 },
    { id: "v",     label: "Geschwindigkeit",        einheit: "m/s", stellen: 2 }
  ],
  diagramme: [
    { x: "t", y: "EPot", titel: "Lageenergie über der Zeit (t-E_pot-Diagramm)" },
    { x: "t", y: "EKin", titel: "Bewegungsenergie über der Zeit (t-E_kin-Diagramm)" },
    { x: "t", y: "EGes", titel: "Gesamtenergie über der Zeit (t-E_ges-Diagramm)" }
  ],
  presets: [
    { name: "Reibungsfrei (60°)",  werte: { winkel0: 60, laenge: 1,   masse: 1, reibung: 0 } },
    { name: "Große Auslenkung 90°", werte: { winkel0: 90, laenge: 1,   masse: 1, reibung: 0 } },
    { name: "Mit Dämpfung",        werte: { winkel0: 60, laenge: 1,   masse: 1, reibung: 0.2 } }
  ],
  vorhersage: {
    frage: "An welcher Stelle der Schwingung ist die Geschwindigkeit der Masse am größten?",
    optionen: [
      "An den Umkehrpunkten ganz außen",
      "Auf halbem Weg zwischen Umkehrpunkt und Tiefpunkt",
      "Am tiefsten Punkt der Bahn"
    ],
    aufloesung: "Am tiefsten Punkt. Dort ist die Lageenergie null (kleinste Höhe), also ist die gesamte Energie als Bewegungsenergie vorhanden — E_kin und damit v sind maximal. An den Umkehrpunkten ist es umgekehrt: Die Masse steht kurz still (v = 0), die ganze Energie steckt in der Lageenergie."
  },
  beobachtung: [
    "Starte das Preset „Reibungsfrei (60°)“ und verfolge die drei Energiebalken: Während E_pot fällt, steigt E_kin um genau denselben Betrag — und umgekehrt. Die Summe E_ges bleibt waagerecht. Lageenergie wird in Bewegungsenergie umgewandelt und zurück, ohne Verlust.",
    "Vergleiche im t-E_pot- und t-E_kin-Diagramm, wann welche Energie ihren Höchst- bzw. Tiefstwert hat: E_kin ist maximal, wenn E_pot null ist (Tiefpunkt), und null, wenn E_pot maximal ist (Umkehrpunkt). Die beiden Kurven sind gegenläufig.",
    "Wähle das Preset „Mit Dämpfung“ (k = 0,2): Jetzt sinkt die Gesamtenergie E_ges Schwingung für Schwingung. Der fehlende Betrag wird in Wärme umgewandelt (siehe Wärme-Anzeige in der Zeichnung). Reibung „verbraucht“ keine Energie — sie wandelt sie nur in eine nicht mehr nutzbare Form um.",
    "Untersuche, wovon die größte Geschwindigkeit v abhängt: Vergrößere getrennt den Anfangswinkel θ₀ und die Länge L (beides erhöht v_max), und ändere dann nur die Masse m. Beobachtung: v_max ändert sich mit m NICHT — schwere und leichte Massen erreichen am Tiefpunkt dieselbe Geschwindigkeit, denn v_max = √(2·g·L·(1 − cos θ₀))."
  ],
  modellgrenzen: "Idealisiertes mathematisches Pendel: Die gesamte Masse sitzt punktförmig am Fadenende, der Faden ist masselos und unausdehnbar. Außer der einstellbaren Dämpfung k werden Luftwiderstand und Reibung in der Aufhängung vernachlässigt; die Dämpfung ist vereinfachend proportional zur Winkelgeschwindigkeit angesetzt. Der Aufhängepunkt ruht. Die Erdbeschleunigung ist konstant g = 9,81 m/s².",
  bilanz: {
    E_start: { label: "Startenergie E_ges (t = 0)", einheit: "J",   stellen: 3 },
    E_ges:   { label: "Gesamtenergie E_ges (Ende)", einheit: "J",   stellen: 3 },
    vmax:    { label: "größte Geschwindigkeit v_max", einheit: "m/s", stellen: 3 }
  }
};

export function init(p) {
  const theta0 = p.winkel0 * Math.PI / 180;
  const eStart = p.masse * G * p.laenge * (1 - Math.cos(theta0));
  return {
    t: 0,
    theta: theta0,   // Auslenkwinkel (rad), Start am Umkehrpunkt
    omega: 0,        // Winkelgeschwindigkeit θ' (rad/s)
    eStart,          // Startenergie (J), für Wärme-Bilanz und Anzeige
    vmax: 0          // bisher größte Bahngeschwindigkeit (m/s)
  };
}

// Euler-Cromer (semi-implizit): erst ω mit der Winkelbeschleunigung
// θ'' = −(g/L)·sinθ − k·θ', dann θ mit dem neuen ω.
export function update(z, p, dt) {
  const alpha = -(G / p.laenge) * Math.sin(z.theta) - p.reibung * z.omega;
  z.omega += alpha * dt;
  z.theta += z.omega * dt;
  z.t += dt;
  const v = p.laenge * Math.abs(z.omega);
  if (v > z.vmax) z.vmax = v;
}

// Energien in SI (J) und Bahngeschwindigkeit (m/s)
function energien(z, p) {
  const ePot = p.masse * G * p.laenge * (1 - Math.cos(z.theta));
  const eKin = 0.5 * p.masse * Math.pow(p.laenge * z.omega, 2);
  return { ePot, eKin, eGes: ePot + eKin, v: p.laenge * Math.abs(z.omega) };
}

export function messwerte(z, p) {
  const e = energien(z, p);
  return { t: z.t, EPot: e.ePot, EKin: e.eKin, EGes: e.eGes, v: e.v };
}

// kontinuierlicher Modus: läuft bis tMax, nie von selbst „fertig"
export function istFertig() { return false; }

// Bilanz in Anzeigeeinheiten (hier SI): aktuelle Gesamtenergie am Ende (bei k = 0
// gleich der Startenergie — Energieerhaltung), Startenergie und v_max.
export function bilanz(z, p) {
  return {
    E_start: z.eStart,
    E_ges: energien(z, p).eGes,
    vmax: z.vmax
  };
}

// Fester Weltausschnitt: links das Pendel, rechts die Energiebalken
export function weltBereich() {
  return { xMin: 0, xMax: 2.8, yMin: 0, yMax: 1.7 };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const e = energien(z, p);
  const r = masseRadius(p.masse);
  const Lv = Math.min(0.62, 0.34 + 0.14 * p.laenge); // gezeichnete Armlaenge (schematisch, bleibt stets im Bild)
  // Masseposition aus Winkel θ: x = sinθ, y nach unten von der Aufhängung
  const mx = X_AUFH + Lv * Math.sin(z.theta);
  const my = Y_AUFH - Lv * Math.cos(z.theta);
  const tiefY = Y_AUFH - Lv;   // tiefster Punkt (Höhen-Nullpunkt)

  ctx.save();
  ctx.font = stil.schrift;
  ctx.lineJoin = "round";

  // --- Pendel-Skala so wählen, dass es ins linke Drittel passt ---
  // (Weltbereich ist fix; lange Pendel werden über Y_AUFH/L bereits abgedeckt)

  // Tiefpunkt-Markierung (Höhen-Nullpunkt) als gestrichelte Bahnlinie
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.setLineDash([6, 5]);
  ctx.beginPath();
  ctx.moveTo(welt.px(X_AUFH - Lv - 0.05), welt.py(tiefY));
  ctx.lineTo(welt.px(X_AUFH + Lv + 0.05), welt.py(tiefY));
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "left";
  ctx.textBaseline = "bottom";
  ctx.fillText("tiefster Punkt (h = 0)", welt.px(X_AUFH - Lv - 0.05), welt.py(tiefY) - 3);

  // Kreisbogen der Bahn (dezent)
  ctx.strokeStyle = stil.hauch;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  const thetaMax = p.winkel0 * Math.PI / 180;
  ctx.arc(welt.px(X_AUFH), welt.py(Y_AUFH), welt.laenge(Lv), Math.PI / 2 - thetaMax, Math.PI / 2 + thetaMax);
  ctx.stroke();

  // Aufhängung (kleiner Block mit Schraffur)
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath();
  ctx.moveTo(welt.px(X_AUFH - 0.12), welt.py(Y_AUFH));
  ctx.lineTo(welt.px(X_AUFH + 0.12), welt.py(Y_AUFH));
  ctx.stroke();
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let sx = -0.12; sx <= 0.10 + 1e-9; sx += 0.04) {
    ctx.moveTo(welt.px(X_AUFH + sx), welt.py(Y_AUFH));
    ctx.lineTo(welt.px(X_AUFH + sx + 0.025), welt.py(Y_AUFH + 0.03));
  }
  ctx.stroke();

  // Faden
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);
  ctx.beginPath();
  ctx.moveTo(welt.px(X_AUFH), welt.py(Y_AUFH));
  ctx.lineTo(welt.px(mx), welt.py(my));
  ctx.stroke();

  // Masse
  ctx.fillStyle = stil.akzent;
  ctx.beginPath();
  ctx.arc(welt.px(mx), welt.py(my), welt.laenge(r), 0, 2 * Math.PI);
  ctx.fill();

  // Höhen-Hilfslinie von der Masse zur Tiefpunkt-Höhe (zeigt h, die Quelle von E_pot)
  if (my - tiefY > 0.01) {
    ctx.strokeStyle = stil.beschriftung;
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(welt.px(mx), welt.py(my));
    ctx.lineTo(welt.px(mx), welt.py(tiefY));
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // --- Energiebalken rechts ---
  const balkenX = 1.95;            // linke Kante der Balken (Welt-x)
  const balkenBreite = 0.16;       // Breite je Balken
  const balkenLuecke = 0.06;      // Abstand zwischen Balken
  const yBasis = 0.18;             // untere Kante der Balken (Welt-y)
  const yMaxBalken = 1.45;         // Höhe für den vollen Maßstab (Welt-y)
  const hBalken = yMaxBalken - yBasis;
  // Maßstab: voller Balken = maximal mögliche Startenergie bei diesen Parametern,
  // mindestens aber die aktuelle Startenergie (E_ges fällt nur, steigt nie)
  const eMax = Math.max(z.eStart, 1e-6);

  const balken = [
    { wert: e.ePot, farbe: stil.ok,     kurz: "E_pot" },
    { wert: e.eKin, farbe: stil.akzent, kurz: "E_kin" },
    { wert: e.eGes, farbe: stil.fehler, kurz: "E_ges" }
  ];

  // Achsenlinie der Balken
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(welt.px(balkenX - 0.04), welt.py(yBasis));
  ctx.lineTo(welt.px(balkenX + 3 * balkenBreite + 2 * balkenLuecke + 0.02), welt.py(yBasis));
  ctx.stroke();

  ctx.textAlign = "center";
  balken.forEach((b, i) => {
    const x = balkenX + i * (balkenBreite + balkenLuecke);
    const h = hBalken * Math.min(1, b.wert / eMax);
    // Balken
    ctx.fillStyle = b.farbe;
    ctx.fillRect(welt.px(x), welt.py(yBasis + h), welt.laenge(balkenBreite), welt.laenge(h));
    // Rahmen für den vollen Maßstab (Hilfe beim Ablesen)
    ctx.strokeStyle = stil.hauch;
    ctx.lineWidth = 1;
    ctx.strokeRect(welt.px(x), welt.py(yMaxBalken), welt.laenge(balkenBreite), welt.laenge(hBalken));
    // Beschriftung unter dem Balken
    ctx.fillStyle = stil.text;
    ctx.textBaseline = "top";
    ctx.fillText(b.kurz, welt.px(x + balkenBreite / 2), welt.py(yBasis) + 6);
    // Wert über dem Balken
    ctx.fillStyle = b.farbe;
    ctx.textBaseline = "bottom";
    ctx.fillText(b.wert.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }), welt.px(x + balkenBreite / 2), welt.py(yBasis + h) - 4);
  });

  // Überschrift über den Balken
  ctx.fillStyle = stil.beschriftung;
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Energie in J", welt.px(balkenX + (3 * balkenBreite + 2 * balkenLuecke) / 2), welt.py(yMaxBalken) - 6);

  // Wärme-Anzeige bei Reibung: Differenz Startenergie − aktuelle Gesamtenergie
  const eWaerme = z.eStart - e.eGes;
  if (p.reibung > 0) {
    ctx.fillStyle = stil.beschriftung;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(
      "davon in Wärme: " + Math.max(0, eWaerme).toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " J",
      welt.px(balkenX + (3 * balkenBreite + 2 * balkenLuecke) / 2),
      welt.py(yBasis) + 22
    );
  }

  ctx.restore();
}

// ---------- Prüffälle (reibungsfrei, analytisch bekannte Lösungen) ----------
// Bei k = 0 gilt Energieerhaltung: E_ges am Ende = E_start = m·g·L·(1 − cos θ₀),
// und am tiefsten Punkt v_max = √(2·g·L·(1 − cos θ₀)). E_ges ≈ E_start ist
// zugleich der Integrationstest (symplektisches Euler-Cromer driftet kaum).

export const pruefFaelle = [
  {
    name: "θ₀ = 60°, L = 1 m, m = 1 kg, reibungsfrei",
    parameter: { winkel0: 60, laenge: 1, masse: 1, reibung: 0 },
    toleranzProzent: 2,
    soll: { E_ges: 4.905, vmax: 3.132 }
  },
  {
    name: "θ₀ = 90°, L = 1 m, m = 1 kg, reibungsfrei",
    parameter: { winkel0: 90, laenge: 1, masse: 1, reibung: 0 },
    toleranzProzent: 2,
    soll: { E_ges: 9.81, vmax: 4.429 }
  },
  {
    name: "θ₀ = 45°, L = 0,5 m, m = 2 kg, reibungsfrei",
    parameter: { winkel0: 45, laenge: 0.5, masse: 2, reibung: 0 },
    toleranzProzent: 2,
    soll: { E_ges: 2.873, vmax: 1.695 }
  }
];
