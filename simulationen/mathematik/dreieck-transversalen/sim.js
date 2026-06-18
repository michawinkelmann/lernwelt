// Besondere Linien im Dreieck — die vier klassischen Transversalen und ihre
// Schnittpunkte zum Anfassen (Geometrie der Sek I, Klasse 7/8). Modus „statisch“:
// die Ecke C an den Reglern Cx, Cy verschieben (A und B liegen fest), mit dem
// Regler „anzeige“ zwischen den vier Linienarten und der Euler-Geraden wechseln —
// das Dreieck und der zugehoerige besondere Punkt werden sofort neu gerechnet und
// gezeichnet.
//
// Modell (exakt, vektoriell):
//   Schwerpunkt          S = ((Ax+Bx+Cx)/3, (Ay+By+Cy)/3)
//   Umkreismittelpunkt   U  loest |U-A| = |U-B| = |U-C| (Schnitt der Mittelsenkrechten)
//   Hoehenschnittpunkt   H = A + B + C - 2*U   (bekannte Eulersche Beziehung)
//   Inkreismittelpunkt   I = (a*A + b*B + c*C)/(a+b+c) mit Seitenlaengen a=|BC|, b=|CA|, c=|AB|
//   Umkreisradius        R = |U-A| ;  Inkreisradius r = Flaeche/s, s = (a+b+c)/2
// Schwerpunkt und Inkreismittelpunkt liegen IMMER innerhalb des Dreiecks; Umkreis-
// mittelpunkt und Hoehenschnittpunkt koennen bei stumpfwinkligen Dreiecken ausserhalb
// liegen. S, U und H liegen stets auf einer Geraden — der Eulerschen Geraden — mit
// SH = 2*SU.

import { formatZahl } from "../../../assets/js/sim/welt.js";

export const manifest = {
  id: "mathematik/dreieck-transversalen",
  titel: "Besondere Linien im Dreieck",
  modus: "statisch",
  raster: false,     // eigenes Gitter ohne Einheit (reine Geometrie-Ebene, kein „m“)
  werkzeuge: false,  // Werte stehen in der Anzeige; Lineal/Winkelmesser nicht noetig
  parameter: [
    { id: "Cx", label: "Ecke C: x-Koordinate", einheit: "", min: -4, max: 4, schritt: 0.5, start: 0 },
    { id: "Cy", label: "Ecke C: y-Koordinate", einheit: "", min: -1, max: 4, schritt: 0.5, start: 3 },
    { id: "anzeige", label: "Anzeige (0 Seitenhalb. · 1 Mittelsenkr. · 2 Höhen · 3 Winkelhalb. · 4 Euler-Gerade)", einheit: "", min: 0, max: 4, schritt: 1, start: 0 }
  ],
  anzeigen: [
    { id: "R", label: "Umkreisradius R", einheit: "", stellen: 2 },
    { id: "r", label: "Inkreisradius r", einheit: "", stellen: 2 }
  ],
  presets: [
    { name: "fast gleichseitig", werte: { Cx: 0, Cy: 3.5, anzeige: 0 } },
    { name: "rechtwinklig",      werte: { Cx: -3, Cy: 3, anzeige: 1 } },
    { name: "stumpfwinklig",     werte: { Cx: 3.5, Cy: 0.5, anzeige: 1 } }
  ],
  vorhersage: {
    frage: "Welcher besondere Punkt liegt bei JEDEM Dreieck immer innerhalb des Dreiecks?",
    optionen: [
      "Schwerpunkt und Inkreismittelpunkt",
      "Umkreismittelpunkt und Höhenschnittpunkt",
      "Alle vier liegen immer innen"
    ],
    aufloesung: "Schwerpunkt und Inkreismittelpunkt liegen immer innen — der Schwerpunkt als „Mittel“ der drei Ecken, der Inkreismittelpunkt als Mittelpunkt des einbeschriebenen Kreises. Umkreismittelpunkt und Höhenschnittpunkt können dagegen außerhalb liegen: Schiebe C so, dass das Dreieck stumpfwinklig wird (z. B. Preset „stumpfwinklig“) und wechsle auf Anzeige 1 (Mittelsenkrechte) bzw. 2 (Höhen) — der Schnittpunkt wandert nach draußen."
  },
  beobachtung: [
    "Verschiebe die Ecke C mit den Reglern Cx und Cy. Beobachte zu jedem der vier Linientypen, wie der zugehörige Schnittpunkt mitwandert. Bei welchem Typ bleibt der Punkt am ruhigsten in der Mitte?",
    "Anzeige 0 (Seitenhalbierende): Der Schwerpunkt S teilt jede Seitenhalbierende im Verhältnis 2:1 — vom Eckpunkt aus gemessen ist das längere Stück doppelt so lang wie das Stück bis zur gegenüberliegenden Seitenmitte. Schätze es am Bild ab.",
    "Anzeige 1 (Mittelsenkrechte): Mache das Dreieck mit Preset „stumpfwinklig“ stumpfwinklig. Der Umkreismittelpunkt U rutscht aus dem Dreieck heraus — der Umkreis umschließt es trotzdem. Bei welcher Lage von C liegt U genau auf einer Dreiecksseite (rechtwinkliges Dreieck)?",
    "Anzeige 4 (Euler-Gerade): Schwerpunkt S, Umkreismittelpunkt U und Höhenschnittpunkt H liegen immer auf einer Geraden. Außerdem gilt SH = 2*SU. Wann fallen alle drei Punkte zusammen (Tipp: probiere ein möglichst gleichseitiges Dreieck mit Preset „fast gleichseitig“)?"
  ],
  modellgrenzen: "Voraussetzung ist ein echtes Dreieck. Liegen A, B und C (fast) auf einer Geraden — also Cy nahe an der Geraden durch A und B —, entartet das Dreieck: Es gibt keinen Umkreis mehr (der Nenner d in der Formel wird null), Umkreisradius und Höhenschnittpunkt sind nicht definiert. In diesem Fall zeigt die Simulation einen Hinweis statt der Kreise.",
  bilanz: {
    Sx: { label: "Schwerpunkt S: x", einheit: "", stellen: 4 },
    Sy: { label: "Schwerpunkt S: y", einheit: "", stellen: 4 },
    Ux: { label: "Umkreismittelpunkt U: x", einheit: "", stellen: 4 },
    Uy: { label: "Umkreismittelpunkt U: y", einheit: "", stellen: 4 },
    R:  { label: "Umkreisradius R", einheit: "", stellen: 4 },
    Hx: { label: "Höhenschnittpunkt H: x", einheit: "", stellen: 4 },
    Hy: { label: "Höhenschnittpunkt H: y", einheit: "", stellen: 4 },
    Ix: { label: "Inkreismittelpunkt I: x", einheit: "", stellen: 4 },
    Iy: { label: "Inkreismittelpunkt I: y", einheit: "", stellen: 4 },
    r:  { label: "Inkreisradius r", einheit: "", stellen: 4 }
  }
};

// ---------- Modell (exakte Dreiecksgeometrie im R^2) ----------

function abstand(p, q) {
  return Math.hypot(p[0] - q[0], p[1] - q[1]);
}

// Berechnet aus den drei Ecken alle besonderen Punkte und Radien.
function rechneDreieck(Ax, Ay, Bx, By, Cx, Cy) {
  const A = [Ax, Ay], B = [Bx, By], C = [Cx, Cy];

  // Schwerpunkt
  const Sx = (Ax + Bx + Cx) / 3;
  const Sy = (Ay + By + Cy) / 3;

  // Umkreismittelpunkt ueber Determinantenformel; d = 0 -> entartet (kollinear)
  const d = 2 * (Ax * (By - Cy) + Bx * (Cy - Ay) + Cx * (Ay - By));
  const entartet = Math.abs(d) < 1e-9;
  let Ux = NaN, Uy = NaN, R = NaN, Hx = NaN, Hy = NaN;
  if (!entartet) {
    const a2 = Ax * Ax + Ay * Ay;
    const b2 = Bx * Bx + By * By;
    const c2 = Cx * Cx + Cy * Cy;
    Ux = (a2 * (By - Cy) + b2 * (Cy - Ay) + c2 * (Ay - By)) / d;
    Uy = (a2 * (Cx - Bx) + b2 * (Ax - Cx) + c2 * (Bx - Ax)) / d;
    R = abstand([Ux, Uy], A);
    // Hoehenschnittpunkt aus der Eulerschen Beziehung H = A + B + C - 2U
    Hx = Ax + Bx + Cx - 2 * Ux;
    Hy = Ay + By + Cy - 2 * Uy;
  }

  // Inkreismittelpunkt: mit Seitenlaengen gewichtetes Mittel der Ecken
  const a = abstand(B, C); // Seite a liegt der Ecke A gegenueber
  const b = abstand(C, A); // Seite b gegenueber B
  const c = abstand(A, B); // Seite c gegenueber C
  const u = a + b + c;     // Umfang
  const Ix = (a * Ax + b * Bx + c * Cx) / u;
  const Iy = (a * Ay + b * By + c * Cy) / u;
  const Flaeche = 0.5 * Math.abs(Ax * (By - Cy) + Bx * (Cy - Ay) + Cx * (Ay - By));
  const s = u / 2;
  const r = Flaeche / s;

  return { A, B, C, Sx, Sy, Ux, Uy, R, Hx, Hy, Ix, Iy, r, a, b, c, Flaeche, entartet };
}

export function init(p) {
  // A und B liegen fest (Defaults), nur C ist beweglich. Prueffaelle uebergeben alle sechs.
  const Ax = p.Ax ?? -3, Ay = p.Ay ?? -2;
  const Bx = p.Bx ?? 3,  By = p.By ?? -2;
  const Cx = p.Cx, Cy = p.Cy;
  const g = rechneDreieck(Ax, Ay, Bx, By, Cx, Cy);
  return { t: 0, ...g };
}

export function update() { /* statisch: nichts zu integrieren */ }

export function messwerte(z) {
  // R und r sind bei entartetem Dreieck NaN -> formatZahl zeigt dann „–“
  return { R: z.R, r: z.r };
}

export function istFertig() { return true; }

export function bilanz(z) {
  return {
    Sx: z.Sx, Sy: z.Sy,
    Ux: z.Ux, Uy: z.Uy, R: z.R,
    Hx: z.Hx, Hy: z.Hy,
    Ix: z.Ix, Iy: z.Iy, r: z.r
  };
}

// ---------- Sichtbarer Weltausschnitt ----------
// Fest und symmetrisch, gleicher Massstab in x und y (welt.px/py bilden unverzerrt ab).
export function weltBereich() {
  return { xMin: -6, xMax: 6, yMin: -5, yMax: 5 };
}

// ---------- Darstellung ----------

// Fachfarbe Mathematik aus den Design-Tokens (Fallback: Akzentfarbe der Engine)
function matheFarbe(stil) {
  if (typeof document === "undefined") return stil.akzent;
  const wert = getComputedStyle(document.documentElement).getPropertyValue("--mathe").trim();
  return wert || stil.akzent;
}

// Hex/rgb-Farbe mit Alpha versehen
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

// Strecke zwischen zwei Welt-Punkten
function strecke(ctx, welt, p, q) {
  ctx.beginPath();
  ctx.moveTo(welt.px(p[0]), welt.py(p[1]));
  ctx.lineTo(welt.px(q[0]), welt.py(q[1]));
  ctx.stroke();
}

// Mittelpunkt zweier Punkte
function mitte(p, q) {
  return [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
}

// Lotfusspunkt von Punkt P auf die Gerade durch A und B
function lotfuss(P, A, B) {
  const vx = B[0] - A[0], vy = B[1] - A[1];
  const len2 = vx * vx + vy * vy;
  if (len2 < 1e-12) return [A[0], A[1]];
  const t = ((P[0] - A[0]) * vx + (P[1] - A[1]) * vy) / len2;
  return [A[0] + t * vx, A[1] + t * vy];
}

// Eine Gerade durch zwei Punkte ueber den ganzen Sichtbereich verlaengern (fuer Euler-Gerade)
function geradeDurch(ctx, welt, p, q) {
  const dx = q[0] - p[0], dy = q[1] - p[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return;
  const ux = dx / len, uy = dy / len;
  const weit = 40; // weit ueber den Sichtbereich hinaus
  strecke(ctx, welt, [p[0] - ux * weit, p[1] - uy * weit], [p[0] + ux * weit, p[1] + uy * weit]);
}

// Gefuellten Punkt mit Beschriftung zeichnen
function punkt(ctx, welt, p, farbe, label, stil, dx, dy) {
  const X = welt.px(p[0]), Y = welt.py(p[1]);
  const rad = Math.max(3.5, stil.linienstaerke + 1.5);
  ctx.beginPath();
  ctx.arc(X, Y, rad, 0, 2 * Math.PI);
  ctx.fillStyle = farbe;
  ctx.fill();
  ctx.strokeStyle = stil.flaeche;
  ctx.lineWidth = 1.5;
  ctx.stroke();
  if (label) {
    const basis = parseFloat(stil.schrift) || 12;
    ctx.font = "700 " + Math.max(12, basis + 1) + "px sans-serif";
    ctx.fillStyle = farbe;
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(label, X + (dx ?? 8), Y + (dy ?? -8));
  }
}

export function zeichne({ ctx, welt, zustand: z, werte: p, stil }) {
  const mathe = matheFarbe(stil);
  const modus = Math.round(p.anzeige);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // --- Eigenes Koordinatengitter + Achsen (ohne Einheit) ---
  const GB = welt.bereich;
  ctx.save();
  ctx.strokeStyle = stil.raster; ctx.lineWidth = 1;
  ctx.beginPath();
  for (let gx = Math.ceil(GB.xMin); gx <= GB.xMax; gx++) { ctx.moveTo(welt.px(gx), welt.py(GB.yMin)); ctx.lineTo(welt.px(gx), welt.py(GB.yMax)); }
  for (let gy = Math.ceil(GB.yMin); gy <= GB.yMax; gy++) { ctx.moveTo(welt.px(GB.xMin), welt.py(gy)); ctx.lineTo(welt.px(GB.xMax), welt.py(gy)); }
  ctx.stroke();
  ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(welt.px(GB.xMin), welt.py(0)); ctx.lineTo(welt.px(GB.xMax), welt.py(0));
  ctx.moveTo(welt.px(0), welt.py(GB.yMin)); ctx.lineTo(welt.px(0), welt.py(GB.yMax));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung; ctx.font = stil.schrift;
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let gx = Math.ceil(GB.xMin); gx <= GB.xMax; gx++) { if (gx !== 0) ctx.fillText(String(gx), welt.px(gx), welt.py(0) + 4); }
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let gy = Math.ceil(GB.yMin); gy <= GB.yMax; gy++) { if (gy !== 0) ctx.fillText(String(gy), welt.px(0) - 5, welt.py(gy)); }
  ctx.restore();

  const A = z.A, B = z.B, C = z.C;
  const S = [z.Sx, z.Sy], U = [z.Ux, z.Uy], H = [z.Hx, z.Hy], I = [z.Ix, z.Iy];
  const Mc = mitte(A, B); // Seitenmitte gegenueber C (Seite c = AB)
  const Ma = mitte(B, C); // Seitenmitte gegenueber A (Seite a = BC)
  const Mb = mitte(C, A); // Seitenmitte gegenueber B (Seite b = CA)

  // --- Modusabhaengige Transversalen + besonderer Punkt / Kreis (UNTER dem Dreieck) ---
  ctx.setLineDash([6, 5]);
  ctx.lineWidth = Math.max(1.5, stil.linienstaerke - 0.5);

  if (modus === 0) {
    // Seitenhalbierende: von jeder Ecke zur Mitte der Gegenseite
    ctx.strokeStyle = farbeMitAlpha(mathe, 0.85);
    strecke(ctx, welt, A, Ma);
    strecke(ctx, welt, B, Mb);
    strecke(ctx, welt, C, Mc);
  } else if (modus === 1) {
    // Mittelsenkrechten: durch jede Seitenmitte senkrecht zur Seite (= durch U)
    ctx.strokeStyle = farbeMitAlpha(stil.akzent, 0.85);
    if (!z.entartet) {
      strecke(ctx, welt, Mc, U);
      strecke(ctx, welt, Ma, U);
      strecke(ctx, welt, Mb, U);
      // Umkreis
      ctx.setLineDash([]);
      ctx.strokeStyle = farbeMitAlpha(stil.akzent, 0.6);
      ctx.beginPath();
      ctx.arc(welt.px(U[0]), welt.py(U[1]), welt.laenge(z.R), 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([6, 5]);
    }
  } else if (modus === 2) {
    // Hoehen: von jeder Ecke senkrecht (Lot) auf die Gegenseite, treffen sich in H
    ctx.strokeStyle = farbeMitAlpha(stil.fehler, 0.85);
    if (!z.entartet) {
      strecke(ctx, welt, A, lotfuss(A, B, C));
      strecke(ctx, welt, B, lotfuss(B, C, A));
      strecke(ctx, welt, C, lotfuss(C, A, B));
    }
  } else if (modus === 3) {
    // Winkelhalbierende: von jeder Ecke zum Inkreismittelpunkt I
    ctx.strokeStyle = farbeMitAlpha(mathe, 0.85);
    strecke(ctx, welt, A, I);
    strecke(ctx, welt, B, I);
    strecke(ctx, welt, C, I);
    // Inkreis
    ctx.setLineDash([]);
    ctx.strokeStyle = farbeMitAlpha(mathe, 0.6);
    ctx.beginPath();
    ctx.arc(welt.px(I[0]), welt.py(I[1]), welt.laenge(z.r), 0, 2 * Math.PI);
    ctx.stroke();
    ctx.setLineDash([6, 5]);
  } else if (modus === 4) {
    // Euler-Gerade durch S, U, H
    if (!z.entartet) {
      ctx.strokeStyle = farbeMitAlpha(stil.text, 0.7);
      ctx.lineWidth = stil.linienstaerke;
      geradeDurch(ctx, welt, U, S);
    }
  }
  ctx.setLineDash([]);

  // --- Dreieck ABC (kraeftig, gefuellt) ---
  ctx.beginPath();
  ctx.moveTo(welt.px(A[0]), welt.py(A[1]));
  ctx.lineTo(welt.px(B[0]), welt.py(B[1]));
  ctx.lineTo(welt.px(C[0]), welt.py(C[1]));
  ctx.closePath();
  ctx.fillStyle = farbeMitAlpha(mathe, 0.12);
  ctx.fill();
  ctx.strokeStyle = mathe;
  ctx.lineWidth = stil.linienstaerke + 0.5;
  ctx.stroke();

  // Eckenbeschriftung A, B, C (jeweils nach aussen versetzt)
  const basis = parseFloat(stil.schrift) || 12;
  ctx.font = "700 " + Math.max(13, basis + 2) + "px sans-serif";
  ctx.fillStyle = stil.text;
  ctx.textBaseline = "middle";
  // A links unten, B rechts unten, C nach aussen vom Schwerpunkt weg
  ctx.textAlign = "right"; ctx.fillText("A", welt.px(A[0]) - 8, welt.py(A[1]) + 6);
  ctx.textAlign = "left";  ctx.fillText("B", welt.px(B[0]) + 8, welt.py(B[1]) + 6);
  const cAussenX = C[0] - S[0], cAussenY = C[1] - S[1];
  ctx.textAlign = cAussenX >= 0 ? "left" : "right";
  ctx.fillText("C", welt.px(C[0]) + (cAussenX >= 0 ? 8 : -8), welt.py(C[1]) + (cAussenY >= 0 ? -8 : 10));

  // --- Besonderer Punkt (UEBER dem Dreieck) je nach Modus ---
  if (modus === 0) {
    punkt(ctx, welt, S, mathe, "S", stil, 8, -8);
  } else if (modus === 1 && !z.entartet) {
    punkt(ctx, welt, U, stil.akzent, "U", stil, 8, -8);
  } else if (modus === 2 && !z.entartet) {
    punkt(ctx, welt, H, stil.fehler, "H", stil, 8, -8);
  } else if (modus === 3) {
    punkt(ctx, welt, I, mathe, "I", stil, 8, -8);
  } else if (modus === 4 && !z.entartet) {
    // Auf der Euler-Geraden alle drei Punkte zeigen
    punkt(ctx, welt, U, stil.akzent, "U", stil, 8, -10);
    punkt(ctx, welt, S, mathe, "S", stil, 8, -10);
    punkt(ctx, welt, H, stil.fehler, "H", stil, 8, -10);
  }

  // --- Textblock unten links: aktiver Linientyp + Hinweise ---
  const xText = 12;
  let yText = welt.hoehe - 12;
  const klein = Math.max(11, basis);
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";

  // Entartungshinweis (kollineare Punkte)
  if (z.entartet && (modus === 1 || modus === 2 || modus === 4)) {
    ctx.font = "700 " + (klein + 1) + "px sans-serif";
    ctx.fillStyle = stil.fehler;
    ctx.fillText("Entartetes Dreieck: kein Umkreis / Höhenschnittpunkt", xText, yText);
    yText -= klein + 8;
  }

  const titel = [
    "Seitenhalbierende  →  Schwerpunkt S",
    "Mittelsenkrechte  →  Umkreismittelpunkt U",
    "Höhen  →  Höhenschnittpunkt H",
    "Winkelhalbierende  →  Inkreismittelpunkt I",
    "Euler-Gerade: S, U und H liegen auf einer Geraden"
  ][modus];
  ctx.font = "700 " + (klein + 1) + "px sans-serif";
  ctx.fillStyle = stil.text;
  ctx.fillText(titel, xText, yText);
  yText -= klein + 8;

  // Zusatzzeile mit Zahlwerten je nach Modus
  ctx.font = klein + "px sans-serif";
  ctx.fillStyle = stil.beschriftung;
  let zusatz = "";
  if (modus === 0) zusatz = "S = (" + zahl(z.Sx) + " | " + zahl(z.Sy) + ")";
  else if (modus === 1 && !z.entartet) zusatz = "U = (" + zahl(z.Ux) + " | " + zahl(z.Uy) + "),  R = " + zahl(z.R);
  else if (modus === 2 && !z.entartet) zusatz = "H = (" + zahl(z.Hx) + " | " + zahl(z.Hy) + ")";
  else if (modus === 3) zusatz = "I = (" + zahl(z.Ix) + " | " + zahl(z.Iy) + "),  r = " + zahl(z.r);
  else if (modus === 4 && !z.entartet) zusatz = "SH = 2 * SU  (S, U, H kollinear)";
  if (zusatz) ctx.fillText(zusatz, xText, yText);
}

// Zahl ohne ueberfluessige Nachkommastellen: 6 → „6“, 2,5 → „2,5“, −1 → „−1“
function zahl(wert) {
  if (!isFinite(wert)) return "–";
  let s;
  if (Math.abs(wert - Math.round(wert)) < 1e-9) s = formatZahl(wert, 0);
  else if (Math.abs(10 * wert - Math.round(10 * wert)) < 1e-9) s = formatZahl(wert, 1);
  else s = formatZahl(wert, 2);
  return s;
}

// ---------- Prueffaelle ----------
// Soll-Werte analytisch nachgerechnet. toleranzProzent 1; bei Soll = 0 prueft die
// Validierung absolut (|ist| <= 0,01 effektiv ueber die absolute Schranke).
//
// Fall 1 — rechtwinkliges Dreieck A(0,0), B(4,0), C(0,3) (rechter Winkel bei A):
//   Schwerpunkt S = (4/3, 1)
//   Umkreis = Mitte der Hypotenuse BC = (2; 1,5), R = 2,5
//   Hoehenschnittpunkt = rechtwinklige Ecke A = (0,0)
//   Inkreis: a=|BC|=5, b=|CA|=3, c=|AB|=4 -> I=(1,1); Flaeche=6, s=6 -> r=1
//
// Fall 2 — gleichschenkliges Dreieck A(-4,0), B(4,0), C(0,3) (selbst nachgerechnet):
//   Schwerpunkt S = ((-4+4+0)/3, (0+0+3)/3) = (0, 1)
//   Umkreis liegt aus Symmetrie auf der y-Achse: Ux = 0.
//     |U-A|=|U-C|:  16 + Uy^2 = (Uy-3)^2 = Uy^2 - 6Uy + 9  ->  16 = -6Uy + 9  ->  Uy = -7/6 ≈ -1,16667
//     R = sqrt(16 + (7/6)^2) = sqrt(625/36) = 25/6 ≈ 4,16667
//   Hoehenschnittpunkt:  H = A+B+C - 2U = (0, 3 - 2*(-7/6)) = (0, 16/3) ≈ (0; 5,33333)
//   Inkreis: a=|BC|=5, b=|CA|=5, c=|AB|=8, Umfang 18
//     Ix = (5*(-4)+5*4+8*0)/18 = 0;  Iy = (0+0+8*3)/18 = 24/18 = 4/3 ≈ 1,33333
//     Flaeche = 12, s = 9 -> r = 12/9 = 4/3 ≈ 1,33333

export const pruefFaelle = [
  {
    name: "rechtwinklig A(0,0) B(4,0) C(0,3)",
    parameter: { Ax: 0, Ay: 0, Bx: 4, By: 0, Cx: 0, Cy: 3 },
    toleranzProzent: 1,
    soll: { Sx: 1.3333, Sy: 1, Ux: 2, Uy: 1.5, R: 2.5, Hx: 0, Hy: 0, Ix: 1, Iy: 1, r: 1 }
  },
  {
    name: "gleichschenklig A(-4,0) B(4,0) C(0,3)",
    parameter: { Ax: -4, Ay: 0, Bx: 4, By: 0, Cx: 0, Cy: 3 },
    toleranzProzent: 1,
    soll: { Sx: 0, Sy: 1, Ux: 0, Uy: -1.16667, R: 4.16667, Hx: 0, Hy: 5.33333, Ix: 0, Iy: 1.33333, r: 1.33333 }
  }
];
