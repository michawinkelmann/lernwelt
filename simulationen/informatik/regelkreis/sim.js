// Zweipunktregler (Thermostat-Regelkreis) — ein Raum wird ueber einen Zweipunktregler
// mit Hysterese auf eine Solltemperatur geregelt. Modell in SI-naher Form (Grad Celsius,
// Minuten): Die Heizung kennt nur zwei Zustaende (an/aus). Sie schaltet EIN, sobald die
// Temperatur unter die untere Bandgrenze T_soll - h faellt, und AUS, sobald sie ueber die
// obere Bandgrenze T_soll + h steigt; dazwischen behaelt sie ihren Zustand (Hysterese,
// h = halbe Schaltdifferenz). Die Raumtemperatur folgt einem newtonschen Ausgleich
// dT/dt = rate*(Tziel - T): bei eingeschalteter Heizung strebt sie zur Heizkoerper-
// temperatur T_heiz = T_soll + 15, sonst zur Umgebungstemperatur T_umg = T_soll - 15.
// Dadurch pendelt T als Saegezahn dauerhaft im Hysterese-Band um den Sollwert.
// Integration: explizites Euler-Verfahren mit festem dt aus dem Manifest.

const RATE = 0.5;        // Ausgleichsrate (1/min), fest
const ABSTAND = 15;      // Abstand der Heiz-/Umgebungstemperatur vom Sollwert (Grad C)

// Ableitung der Temperatur: newtonscher Ausgleich zum jeweiligen Ziel
function tempZiel(z, p) {
  return z.heizung ? (p.sollwert + ABSTAND) : (p.sollwert - ABSTAND);
}

export const manifest = {
  id: "informatik/regelkreis",
  titel: "Zweipunktregler (Thermostat)",
  modus: "kontinuierlich",
  dt: 1 / 240,
  tMax: 60,
  schrittweite: 0.25,
  zeitRaffung: 4,          // 4 Modellminuten je Echtzeitsekunde bei Tempo 1x
  werkzeuge: false,        // Mess-Lineal/Winkel sind hier nicht sinnvoll
  parameter: [
    { id: "sollwert",  label: "Sollwert T_soll",        einheit: "°C", min: 16,  max: 24, schritt: 1,   start: 20 },
    { id: "hysterese", label: "Hysterese h (halbe Schaltdifferenz)", einheit: "°C", min: 0.5, max: 3,  schritt: 0.5, start: 2 }
  ],
  anzeigen: [
    { id: "t",       label: "Zeit",            einheit: "min", stellen: 1 },
    { id: "T",       label: "Raumtemperatur",  einheit: "°C", stellen: 1 },
    { id: "heizung", label: "Heizung (1 = an / 0 = aus)", einheit: "",  stellen: 0 },
    { id: "Tsoll",   label: "Sollwert",        einheit: "°C", stellen: 0 }
  ],
  raster: false,
  diagramme: [
    { x: "t", y: "T", titel: "Temperatur über der Zeit" }
  ],
  presets: [
    { name: "Standard (20 °C, h = 2)", werte: { sollwert: 20, hysterese: 2 } },
    { name: "Enge Hysterese (h = 0,5)",     werte: { sollwert: 21, hysterese: 0.5 } },
    { name: "Weite Hysterese (h = 3)",      werte: { sollwert: 22, hysterese: 3 } }
  ],
  vorhersage: {
    frage: "Was passiert mit der Raumtemperatur, wenn ein Zweipunktregler (Thermostat) die Heizung nur an- und ausschalten kann?",
    optionen: [
      "Sie steigt einmal auf den Sollwert und bleibt dann exakt konstant.",
      "Sie pendelt dauerhaft in einem schmalen Band um den Sollwert (Sägezahn).",
      "Sie steigt immer weiter, weil die Heizung nie ganz abschaltet."
    ],
    aufloesung: "Sie pendelt: Ein Zweipunktregler kennt nur an und aus. Er heizt, bis die obere Bandgrenze T_soll + h erreicht ist, schaltet ab, lässt die Temperatur bis zur unteren Grenze T_soll − h absinken und schaltet wieder ein. So entsteht eine dauerhafte Sägezahn-Schwingung im Hysterese-Band [T_soll − h, T_soll + h]. Eine konstante Temperatur wäre nur mit einer stufenlos regelnden Heizung erreichbar."
  },
  beobachtung: [
    "Stelle einen Sollwert ein und starte. Beobachte, dass die Temperatur nicht ruhig stehen bleibt, sondern als Sägezahn um den Sollwert pendelt — zwischen den beiden Bandgrenzen T_soll − h und T_soll + h.",
    "Achte genau auf die Umkehrpunkte: Die Heizung schaltet EIN, sobald die Kurve die untere Bandgrenze berührt, und AUS, sobald sie die obere berührt. Vergleiche die Anzeige „Heizung“ (1/0) mit dem Heizsymbol.",
    "Verkleinere die Hysterese h (z. B. auf 0,5 °C): Die Schwankung wird kleiner — dafür schaltet die Heizung viel häufiger. Vergrößere h (z. B. auf 3 °C): Die Schwankung wird größer, dafür schaltet sie seltener.",
    "Ändere den Sollwert bei gleicher Hysterese: Das ganze Sägezahn-Band verschiebt sich mit nach oben oder unten, seine Breite (2 · h) bleibt aber gleich."
  ],
  modellgrenzen: "Stark idealisiert: konstante Heiz- und Kühlraten, keine Wärmeträgheit und keine Totzeit zwischen Schalten und Temperaturänderung. Ein echter Zweipunktregler muss einen Kompromiss zwischen kleiner Hysterese (genaue Temperatur, aber häufiges Schalten und Verschleiß) und großer Hysterese (seltenes Schalten, aber größere Schwankung) finden; reale Anlagen haben zusätzlich Verzögerungen und schwankende Außentemperaturen.",
  bilanz: {
    T_ein:        { label: "Einschaltschwelle T_soll − h", einheit: "°C", stellen: 1 },
    T_aus:        { label: "Ausschaltschwelle T_soll + h", einheit: "°C", stellen: 1 },
    Tmax_settled: { label: "höchste Temperatur (eingeschwungen)", einheit: "°C", stellen: 1 },
    Tmin_settled: { label: "tiefste Temperatur (eingeschwungen)",  einheit: "°C", stellen: 1 }
  }
};

export function init(p) {
  return {
    t: 0,
    T: p.sollwert - ABSTAND,   // Start: kalter Raum auf Umgebungstemperatur
    heizung: true,             // Heizung beim Start an
    Tmin_settled: Infinity,    // tiefster Wert in der zweiten Laufhaelfte
    Tmax_settled: -Infinity,   // hoechster Wert in der zweiten Laufhaelfte
    spur: [[0, p.sollwert - ABSTAND]]  // [t, T] fuer die Zeichenflaeche
  };
}

// Ein Zeitschritt: erst Reglerlogik (Hysterese) auswerten, dann Temperatur per
// explizitem Euler integrieren. Im eingeschwungenen Bereich (zweite Laufhaelfte)
// den durchlaufenen Temperaturbereich erfassen.
export function update(z, p, dt) {
  const tMaxLauf = manifest.tMax;
  // Reglerlogik mit Hysterese
  if (z.T <= p.sollwert - p.hysterese) z.heizung = true;
  else if (z.T >= p.sollwert + p.hysterese) z.heizung = false;
  // Temperaturdynamik (Newton): dT/dt = rate*(Tziel - T)
  z.T += RATE * (tempZiel(z, p) - z.T) * dt;
  z.t += dt;
  // eingeschwungenen Bereich nur in der zweiten Laufhaelfte erfassen
  if (z.t > tMaxLauf / 2) {
    if (z.T < z.Tmin_settled) z.Tmin_settled = z.T;
    if (z.T > z.Tmax_settled) z.Tmax_settled = z.T;
  }
  if (z.spur.length < 8000) z.spur.push([z.t, z.T]);
}

export function messwerte(z, p) {
  return {
    t: z.t,
    T: z.T,
    heizung: z.heizung ? 1 : 0,
    Tsoll: p.sollwert
  };
}

// Laeuft dauerhaft (kein natuerliches Ende); die Engine kappt bei tMax.
export function istFertig() { return false; }

// Bilanz in Anzeigeeinheiten (Grad C): die exakten Schaltschwellen sowie der
// tatsaechlich durchlaufene Temperaturbereich im eingeschwungenen Zustand.
export function bilanz(z, p) {
  return {
    T_ein: p.sollwert - p.hysterese,
    T_aus: p.sollwert + p.hysterese,
    Tmax_settled: z.Tmax_settled,
    Tmin_settled: z.Tmin_settled
  };
}

// Fester Weltausschnitt: x = Zeit (min), y = Temperatur (Grad C). Der y-Bereich
// umschliesst Umgebungs- und Heiztemperatur des aktuellen Sollwerts grosszuegig.
export function weltBereich(p) {
  return {
    xMin: 0,
    xMax: manifest.tMax,
    yMin: p.sollwert - ABSTAND - 2,
    yMax: p.sollwert + ABSTAND + 2
  };
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const xMax = manifest.tMax;
  const sollOben = p.sollwert + p.hysterese, sollUnten = p.sollwert - p.hysterese;
  // Eigene, flaechenfuellende Abbildung: t (min) -> x, T (Grad C) -> y; rechts Platz fuer Linien-Labels
  const Bx = welt.breite, By = welt.hoehe;
  const padL = 48, padR = 158, padT = 18, padB = 44;
  const yMin = p.sollwert - p.hysterese - 6, yMax = p.sollwert + p.hysterese + 5;
  const MX = t => padL + (t / xMax) * (Bx - padL - padR);
  const MY = T => (By - padB) - ((T - yMin) / (yMax - yMin)) * (By - padT - padB);
  const beamer = stil.linienstaerke > 3;
  ctx.save();
  ctx.font = stil.schrift;

  // Hysterese-Band
  ctx.fillStyle = stil.hauch; ctx.globalAlpha = 0.7;
  ctx.fillRect(MX(0), MY(sollOben), MX(xMax) - MX(0), MY(sollUnten) - MY(sollOben));
  ctx.globalAlpha = 1;

  // Achsen
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(MX(0), MY(yMin)); ctx.lineTo(MX(xMax), MY(yMin));
  ctx.moveTo(MX(0), MY(yMin)); ctx.lineTo(MX(0), MY(yMax));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let t = 0; t <= xMax + 1e-9; t += 10) {
    ctx.beginPath(); ctx.moveTo(MX(t), MY(yMin)); ctx.lineTo(MX(t), MY(yMin) + 4); ctx.stroke();
    ctx.fillText(String(t), MX(t), MY(yMin) + 6);
  }
  ctx.fillText("Zeit t in min", (MX(0) + MX(xMax)) / 2, MY(yMin) + 22);
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let T = Math.ceil(yMin / 2) * 2; T <= yMax; T += 2) {
    ctx.beginPath(); ctx.moveTo(MX(0) - 4, MY(T)); ctx.lineTo(MX(0), MY(T)); ctx.stroke();
    ctx.fillText(String(T), MX(0) - 6, MY(T));
  }

  // EIN/AUS/Soll-Linien mit Labels rechts in der Marge
  const linie = (yWert, farbe, text, dash) => {
    ctx.strokeStyle = farbe; ctx.lineWidth = dash ? 1 : stil.linienstaerke; ctx.setLineDash(dash || []);
    ctx.beginPath(); ctx.moveTo(MX(0), MY(yWert)); ctx.lineTo(MX(xMax), MY(yWert)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = farbe; ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText(text, MX(xMax) + 6, MY(yWert));
  };
  linie(sollOben, stil.fehler, "AUS bei " + sollOben.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " °C", [6, 5]);
  linie(sollUnten, stil.ok, "EIN bei " + sollUnten.toLocaleString("de-DE", { maximumFractionDigits: 1 }) + " °C", [6, 5]);
  linie(p.sollwert, stil.akzent, "Sollwert " + p.sollwert.toLocaleString("de-DE") + " °C", [2, 4]);

  // Saegezahn T(t) (auf den Plotbereich begrenzt)
  ctx.save();
  ctx.beginPath(); ctx.rect(MX(0), MY(yMax), MX(xMax) - MX(0), MY(yMin) - MY(yMax)); ctx.clip();
  if (z.spur.length > 1) {
    ctx.strokeStyle = stil.akzent; ctx.lineWidth = stil.linienstaerke; ctx.lineJoin = "round";
    ctx.beginPath();
    z.spur.forEach(([ti, Ti], i) => { const sx = MX(ti), sy = MY(Ti); if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy); });
    ctx.stroke();
    const [tL, TL] = z.spur[z.spur.length - 1];
    ctx.fillStyle = z.heizung ? stil.fehler : stil.akzent;
    ctx.beginPath(); ctx.arc(MX(tL), MY(TL), Math.max(3, stil.linienstaerke + 1), 0, 2 * Math.PI); ctx.fill();
  }
  ctx.restore();

  // Badge oben links: Heizzustand + aktuelle Temperatur
  ctx.textAlign = "left"; ctx.textBaseline = "top";
  ctx.font = (beamer ? "bold 16px" : "bold 12px") + " sans-serif";
  ctx.fillStyle = z.heizung ? stil.fehler : stil.beschriftung;
  ctx.fillText("Heizung: " + (z.heizung ? "AN ▲" : "aus"), MX(0) + 8, MY(yMax) + 4);
  ctx.fillStyle = stil.text;
  ctx.fillText("T = " + z.T.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + " °C", MX(0) + 8, MY(yMax) + 4 + (beamer ? 22 : 16));

  ctx.restore();
}
// ---------- Prueffaelle (Schaltschwellen exakt; eingeschwungener Bereich knapp am Band) ----------
// T_ein = T_soll - h und T_aus = T_soll + h sind exakt aus den Parametern. Der
// eingeschwungene Bereich [Tmin_settled, Tmax_settled] liegt durch die kleine
// Euler-Ueberschwingung minimal ausserhalb des Bandes (< 0,4 Grad C bei dt = 1/240),
// daher Toleranz 5 %. Das System muss wirklich oszillieren (Tmax > Tmin).
export const pruefFaelle = [
  {
    name: "Standard: T_soll = 20 °C, h = 2 °C",
    parameter: { sollwert: 20, hysterese: 2 },
    toleranzProzent: 5,
    soll: { T_ein: 18, T_aus: 22, Tmax_settled: 22, Tmin_settled: 18 }
  },
  {
    name: "Engeres Band: T_soll = 22 °C, h = 1 °C",
    parameter: { sollwert: 22, hysterese: 1 },
    toleranzProzent: 5,
    soll: { T_ein: 21, T_aus: 23, Tmax_settled: 23, Tmin_settled: 21 }
  }
];
