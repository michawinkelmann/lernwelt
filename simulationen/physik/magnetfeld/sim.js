// Magnetfeld eines Stabmagneten — statisch-interaktiv. Idealisiertes Polmodell (Coulomb-artig):
// Jeder Magnet besteht aus zwei punktfoermigen Polquellen mit Vorzeichen s = +1 (Nordpol) bzw.
// s = -1 (Suedpol). Das Feld an einem Punkt P ist die Summe der Einzelbeitraege
//   B(P) = Σ_i s_i · (P − P_i) / |P − P_i|³   (dimensionslos, Konstante k = 1).
// Daraus folgt |B| ∝ 1/r² (am Pol am staerksten) und Feldlinien, die aussen vom Nord- zum
// Suedpol laufen. Kompassnadeln auf einem Gitter richten sich entlang B aus, optional werden
// Feldlinien gezeichnet. Ein zweiter Magnet laesst sich zuschalten, verschieben und umdrehen;
// gleiche Pole zueinander stossen sich ab, ungleiche ziehen sich an. Keine Zeitentwicklung:
// der Zustand entsteht aus den Parametern (init) bzw. per Klick (zeiger); die Prueffaelle
// rechnen ihn ueber init(werte) headless durch.

// --- Magnet 1: fest, waagerecht auf der x-Achse. Nordpol rechts bei (2,0), Suedpol links bei (-2,0). ---
const M1 = { nx: 2, ny: 0, sx: -2, sy: 0 };

// Magnet 2: waagerecht bei y = 3, Mittelpunkt verschiebbar ueber magnet2x; die beiden Pole
// liegen bei (magnet2x ∓ 1, 3). Die Orientierung (welcher Pol Nord ist) haengt von magnet2flip ab.
const M2Y = 0;          // gleiche Linie wie Magnet 1 (nebeneinander, nicht uebereinander)
const M2_HALB = 2;      // halbe Magnetlaenge = wie Magnet 1 (Pole bei x ± 2) -> gleich gross
const POL_RADIUS = 0.55;// Mindestabstand zur numerischen Stabilitaet (Feld am Pol nicht unendlich)

// Liste aller Polquellen {x, y, s} fuer den aktuellen Zustand zusammenstellen.
function pole(z) {
  const liste = [
    { x: M1.nx, y: M1.ny, s: +1 },   // Magnet 1 Nordpol
    { x: M1.sx, y: M1.sy, s: -1 }    // Magnet 1 Suedpol
  ];
  if (z.zweiterMagnet) {
    // flip = 0: linker Pol (x-1) ist Nord (+1), rechter Pol (x+1) ist Sued (-1)
    // flip = 1: umgekehrt
    const sLinks = z.magnet2flip ? -1 : +1;
    liste.push({ x: z.magnet2x - M2_HALB, y: M2Y, s: sLinks });
    liste.push({ x: z.magnet2x + M2_HALB, y: M2Y, s: -sLinks });
  }
  return liste;
}

// Feld B(P) am Punkt (x,y) aus allen Polen. r wird nach unten begrenzt, damit die Anzeige
// direkt auf einem Pol nicht durch 1/0 zerbricht (physikalisch waere |B| -> unendlich).
function feld(x, y, polliste) {
  let bx = 0, by = 0;
  for (const p of polliste) {
    const dx = x - p.x, dy = y - p.y;
    let r = Math.hypot(dx, dy);
    if (r < POL_RADIUS) r = POL_RADIUS;
    const r3 = r * r * r;
    bx += p.s * dx / r3;
    by += p.s * dy / r3;
  }
  return { bx, by };
}

// Kraft zwischen Magnet 1 und Magnet 2 (Pol-Pol-Summe, ebenfalls Coulomb-artig): nur fuer die
// qualitative Aussage anziehen/abstossen und die Richtung des Kraftpfeils auf Magnet 2.
function kraftAufMagnet2(z) {
  if (!z.zweiterMagnet) return null;
  const m1Pole = [
    { x: M1.nx, y: M1.ny, s: +1 },
    { x: M1.sx, y: M1.sy, s: -1 }
  ];
  const sLinks = z.magnet2flip ? -1 : +1;
  const m2Pole = [
    { x: z.magnet2x - M2_HALB, y: M2Y, s: sLinks },
    { x: z.magnet2x + M2_HALB, y: M2Y, s: -sLinks }
  ];
  let fx = 0, fy = 0;
  for (const a of m2Pole) {
    for (const b of m1Pole) {
      const dx = a.x - b.x, dy = a.y - b.y;
      let r = Math.hypot(dx, dy);
      if (r < POL_RADIUS) r = POL_RADIUS;
      const r3 = r * r * r;
      // Kraft auf Pol a durch Pol b: gleiche Vorzeichen -> abstossend (entlang +(a-b))
      const f = a.s * b.s / r3;
      fx += f * dx;
      fy += f * dy;
    }
  }
  return { fx, fy };
}

export const manifest = {
  id: "physik/magnetfeld",
  titel: "Magnetfeld eines Stabmagneten",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [
    { id: "zweiterMagnet", label: "Zweiter Magnet",            typ: "toggle", min: 0, max: 1, schritt: 1, start: 0 },
    { id: "magnet2x",      label: "Position 2. Magnet",        einheit: "", min: 5, max: 13, schritt: 1, start: 8 },
    { id: "magnet2flip",   label: "Zweiten Magnet umdrehen",   typ: "toggle", min: 0, max: 1, schritt: 1, start: 0 },
    { id: "feldlinien",    label: "Feldlinien anzeigen",       typ: "toggle", min: 0, max: 1, schritt: 1, start: 1 }
  ],
  anzeigen: [],   // keine Zahlen-Messwerte (Kl. 5): stattdessen der ziehbare Kompass in der Flaeche

  presets: [
    { name: "Ein Stabmagnet",       werte: { zweiterMagnet: 0, magnet2x: 6, magnet2flip: 0, feldlinien: 1 } },
    { name: "Zwei Magnete anziehen",werte: { zweiterMagnet: 1, magnet2x: 6, magnet2flip: 1, feldlinien: 0 } },
    { name: "Zwei Magnete abstoßen",werte: { zweiterMagnet: 1, magnet2x: 6, magnet2flip: 0, feldlinien: 0 } }
  ],
  vorhersage: {
    frage: "Du hältst zwei Stabmagnete so, dass zwei Nordpole direkt zueinander zeigen. Ziehen sie sich an oder stoßen sie sich ab?",
    optionen: ["Sie ziehen sich an", "Sie stoßen sich ab", "Sie spüren nichts voneinander"],
    aufloesung: "Sie stoßen sich ab. Gleiche Pole stoßen sich immer ab, ungleiche Pole ziehen sich an — wie bei elektrischen Ladungen. Schalte in der Simulation „Zweiten Magnet umdrehen“ ein: Sobald sich Nord- und Südpol gegenüberstehen, kippt der Kraftpfeil und aus „abstoßen“ wird „anziehen“."
  },
  beobachtung: [
    "Schalte die Feldlinien ein: Jede Kompassnadel liegt genau auf einer Feldlinie. Die rote Nadelspitze (Nordsuchend) zeigt überall in Feldrichtung — außerhalb des Magneten vom Nordpol weg zum Südpol hin.",
    "Vergleiche die Nadeln dicht an einem Pol mit denen am Rand: Nahe den Polen sind die Pfeile am längsten — dort ist das Feld am stärksten. Mit wachsendem Abstand wird |B| schnell kleiner (1/r²).",
    "Schalte den zweiten Magneten mit dem Schalter ein und vergrößere den Abstand: Beobachte, wie sich die Feldlinien zwischen den beiden Magneten ausbilden, und was der Kraftpfeil sagt (anziehen/abstoßen).",
    "Drehe den zweiten Magneten mit dem Schalter um und ziehe den Kompass zwischen die Magnete: Wohin zeigt seine rote Nadel? Vergleiche anziehende und abstoßende Stellung."
  ],
  modellgrenzen: "Idealisiertes Polmodell: Wir tun so, als säßen an den Magnetenden zwei punktförmige „magnetische Ladungen“ (Coulomb-artig, |B| ∝ 1/r²). Das beschreibt die Form des Außenfeldes gut, ist aber ein Modell — echte Stabmagnete sind Dipole, deren Feld aus den ausgerichteten Elementarmagneten im Inneren entsteht. Einzelne magnetische Pole (Monopole) gibt es nicht: Zersägt man einen Magneten, hat jedes Stück wieder Nord und Süd. Gezeigt wird außerdem nur ein ebener Schnitt (2D); das reale Feld ist räumlich. Direkt auf einem Pol wird der Wert künstlich begrenzt (sonst unendlich).",
  bilanz: {
    Bx0: { label: "Bₓ am Punkt (0|0)", einheit: "", stellen: 5 },
    By0: { label: "Bᵧ am Punkt (0|0)", einheit: "", stellen: 5 },
    Bx2: { label: "Bₓ am Punkt (0|2)", einheit: "", stellen: 5 },
    By2: { label: "Bᵧ am Punkt (0|2)", einheit: "", stellen: 5 }
  }
};

export function init(p) {
  return {
    t: 0,
    zweiterMagnet: (p.zweiterMagnet ?? 0) ? 1 : 0,
    magnet2x: p.magnet2x ?? 8,
    magnet2flip: (p.magnet2flip ?? 0) ? 1 : 0,
    feldlinien: (p.feldlinien ?? 1) ? 1 : 0,
    kompass: { x: 0, y: -3.2 },   // frei verschiebbarer Kompass (Startposition unter Magnet 1)
    ziehtKompass: false
  };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

export function messwerte(z) {
  const { bx, by } = feld(0, 0, pole(z));
  const betrag = Math.hypot(bx, by);
  // Kompasswinkel: Richtung der Nordspitze = Feldrichtung, in Grad (0° = nach rechts, gegen Uhrzeiger)
  let winkel = Math.atan2(by, bx) * 180 / Math.PI;
  if (winkel < 0) winkel += 360;
  return { B_betrag_mitte: betrag, winkel_mitte: winkel };
}

export function bilanz(z) {
  const liste = pole(z);
  const a = feld(0, 0, liste);
  const b = feld(0, 2, liste);
  return { Bx0: a.bx, By0: a.by, Bx2: b.bx, By2: b.by };
}

export function weltBereich(werte, zustand) {
  // Ein Magnet: kompakt & zentriert. Zwei Magnete: so breit, dass der zweite (rechts) samt der
  // Feldlinien dazwischen Platz hat — je groesser der Abstand, desto breiter der Ausschnitt.
  const an = (zustand && zustand.zweiterMagnet) || (werte && werte.zweiterMagnet);
  if (!an) return { xMin: -6, xMax: 6, yMin: -5, yMax: 5 };
  const x = (zustand && zustand.magnet2x) || (werte && werte.magnet2x) || 8;
  return { xMin: -6, xMax: x + 3, yMin: -5, yMax: 5 };
}

// ---------- Ziehen: frei verschiebbarer Kompass ----------
// Der Kompass wird angefasst (start, wenn der Zeiger nah genug ist) und mit dem Zeiger gezogen
// (move). Seine Nadel richtet sich an der Stelle entlang des Magnetfeldes aus (siehe zeichneKompass).
export function zieh({ phase, x, y, zustand: z }) {
  if (phase === "ende") { z.ziehtKompass = false; return true; }
  if (phase === "start") {
    if (Math.hypot(x - z.kompass.x, y - z.kompass.y) <= 1.1) { z.ziehtKompass = true; return true; }
    return false;
  }
  if (phase === "move" && z.ziehtKompass) {
    const b = weltBereich(null, z);
    z.kompass.x = Math.max(b.xMin + 0.6, Math.min(b.xMax - 0.6, x));
    z.kompass.y = Math.max(b.yMin + 0.6, Math.min(b.yMax - 0.6, y));
    return true;
  }
  return false;
}

// ---------- Zeichnen ----------
export function zeichne({ ctx, welt, zustand: z, stil }) {
  const W = m => welt.laenge(m);
  const polliste = pole(z);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.font = stil.schrift;

  const farbeN = stil.fehler;   // Nordpol = rot
  const farbeS = stil.akzent;   // Suedpol = blau/Akzent

  // --- Feldlinien (optional) ---
  if (z.feldlinien) zeichneFeldlinien(ctx, welt, z, polliste, stil);

  // --- Kompassnadeln auf einem Gitter ---
  zeichneNadeln(ctx, welt, polliste, stil, W, farbeN, farbeS);

  // --- Stabmagnete ---
  zeichneMagnet(ctx, welt, W, M1.sx, M1.nx, M1.ny, false, stil, farbeN, farbeS); // Magnet 1: N rechts
  if (z.zweiterMagnet) {
    // Magnet 2: Nordseite je nach flip links oder rechts
    const nordRechts = z.magnet2flip === 0 ? false : true;
    zeichneMagnet(ctx, welt, W, z.magnet2x - M2_HALB, z.magnet2x + M2_HALB, M2Y, nordRechts ? false : true, stil, farbeN, farbeS, false);
  }

  // --- Kraftpfeil + Text bei zwei Magneten ---
  if (z.zweiterMagnet) zeichneKraft(ctx, welt, z, stil, W);

  // --- Frei verschiebbarer Kompass ---
  zeichneKompass(ctx, welt, z, polliste, stil, W, farbeN, farbeS);

  ctx.restore();
}

// Ein Stabmagnet als Rechteck mit zwei Haelften. nordLinks=true -> Nordpol ist die linke Haelfte.
// Sonst Nordpol rechts. fest=true zeichnet einen Klick-Hinweis (zum Umdrehen).
function zeichneMagnet(ctx, welt, W, xa, xb, y, nordLinks, stil, farbeN, farbeS, anklickbar) {
  const h = 0.9;                 // Magnethoehe in Welteinheiten
  const x0 = welt.px(xa - 0.4);  // etwas ueber die Pole hinaus, damit die Pole an den Enden sitzen
  const x1 = welt.px(xb + 0.4);
  const yo = welt.py(y + h / 2), yu = welt.py(y - h / 2);
  const breite = x1 - x0, hoehe = yu - yo, mitte = (x0 + x1) / 2;
  const farbeLinks = nordLinks ? farbeN : farbeS;
  const farbeRechts = nordLinks ? farbeS : farbeN;
  // linke Haelfte
  ctx.fillStyle = farbeLinks;
  ctx.fillRect(x0, yo, mitte - x0, hoehe);
  // rechte Haelfte
  ctx.fillStyle = farbeRechts;
  ctx.fillRect(mitte, yo, x1 - mitte, hoehe);
  // Rahmen
  ctx.strokeStyle = stil.text;
  ctx.lineWidth = stil.linienstaerke;
  ctx.strokeRect(x0, yo, breite, hoehe);
  // Beschriftung N / S (weiss fuer Kontrast auf den Farbflaechen)
  ctx.fillStyle = "#ffffff";
  ctx.font = (stil.linienstaerke > 3 ? "bold 22px" : "bold 16px") + " sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(nordLinks ? "N" : "S", (x0 + mitte) / 2, (yo + yu) / 2);
  ctx.fillText(nordLinks ? "S" : "N", (mitte + x1) / 2, (yo + yu) / 2);
  ctx.font = stil.schrift;
  if (anklickbar) {
    ctx.fillStyle = stil.beschriftung;
    ctx.textBaseline = "bottom";
    ctx.fillText("(anklicken zum Umdrehen)", mitte, yo - 6);
  }
}

// Gitter aus Kompassnadeln (7 x 5). Jede Nadel zeigt entlang B(P); die rote Spitze ist Nord.
function zeichneNadeln(ctx, welt, polliste, stil, W, farbeN, farbeS) {
  const b = welt.bereich;
  const NX = 7, NY = 5;
  const laenge = 0.62;          // halbe Nadellaenge in Welteinheiten
  for (let i = 0; i < NX; i++) {
    for (let j = 0; j < NY; j++) {
      const x = b.xMin + (b.xMax - b.xMin) * (i + 0.5) / NX;
      const y = b.yMin + (b.yMax - b.yMin) * (j + 0.5) / NY;
      const { bx, by } = feld(x, y, polliste);
      const betrag = Math.hypot(bx, by);
      if (betrag < 1e-9) continue;
      const ux = bx / betrag, uy = by / betrag;
      // Drehpunkt = Gitterpunkt; Nadel von -laenge bis +laenge entlang (ux,uy)
      const cx = welt.px(x), cy = welt.py(y);
      const sx = cx - ux * W(laenge), sy = cy + uy * W(laenge);   // Schwanz (py: +uy nach unten)
      const tx = cx + ux * W(laenge), ty = cy - uy * W(laenge);   // Spitze (Nord)
      // Schwanz-Haelfte (Sued, grau/blau)
      ctx.strokeStyle = farbeS;
      ctx.lineWidth = stil.linienstaerke;
      ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
      // Spitzen-Haelfte (Nord, rot) mit Pfeilspitze
      ctx.strokeStyle = farbeN;
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
      // Pfeilspitze
      const fl = Math.max(4, W(0.18));
      const winkel = Math.atan2(ty - cy, tx - cx);
      ctx.fillStyle = farbeN;
      ctx.beginPath();
      ctx.moveTo(tx, ty);
      ctx.lineTo(tx - fl * Math.cos(winkel - 0.5), ty - fl * Math.sin(winkel - 0.5));
      ctx.lineTo(tx - fl * Math.cos(winkel + 0.5), ty - fl * Math.sin(winkel + 0.5));
      ctx.closePath(); ctx.fill();
      // kleiner Drehpunkt
      ctx.fillStyle = stil.beschriftung;
      ctx.beginPath(); ctx.arc(cx, cy, Math.max(1.5, W(0.05)), 0, 2 * Math.PI); ctx.fill();
    }
  }
}

// Feldlinien per Integration entlang des Feldes, gestartet rund um die Nordpole.
function zeichneFeldlinien(ctx, welt, z, polliste, stil) {
  ctx.strokeStyle = stil.beschriftung;
  ctx.lineWidth = Math.max(1, stil.linienstaerke - 0.8);
  ctx.globalAlpha = 0.85;
  // Startpunkte: ring um jeden Nordpol
  const nordpole = polliste.filter(p => p.s > 0);
  const proPol = 12;
  for (const np of nordpole) {
    for (let k = 0; k < proPol; k++) {
      const a = (k / proPol) * 2 * Math.PI;
      const x0 = np.x + Math.cos(a) * (POL_RADIUS + 0.05);
      const y0 = np.y + Math.sin(a) * (POL_RADIUS + 0.05);
      integriereLinie(ctx, welt, polliste, x0, y0, +1);
    }
  }
  ctx.globalAlpha = 1;
}

// Eine Feldlinie von (x0,y0) in Feldrichtung (richtung=+1) verfolgen, bis sie das Bild verlaesst
// oder einen Suedpol erreicht. Einfaches Euler-Verfahren mit normierten Schritten.
function integriereLinie(ctx, welt, polliste, x0, y0, richtung) {
  const b = welt.bereich;
  const schritt = 0.12;
  const maxSchritte = 600;
  let x = x0, y = y0;
  ctx.beginPath();
  ctx.moveTo(welt.px(x), welt.py(y));
  for (let i = 0; i < maxSchritte; i++) {
    const { bx, by } = feld(x, y, polliste);
    const betrag = Math.hypot(bx, by);
    if (betrag < 1e-9) break;
    x += richtung * bx / betrag * schritt;
    y += richtung * by / betrag * schritt;
    if (x < b.xMin - 0.5 || x > b.xMax + 0.5 || y < b.yMin - 0.5 || y > b.yMax + 0.5) {
      ctx.lineTo(welt.px(x), welt.py(y));
      break;
    }
    ctx.lineTo(welt.px(x), welt.py(y));
    // Abbruch nahe einem Suedpol (Linien enden dort)
    let nahSued = false;
    for (const p of polliste) {
      if (p.s < 0 && Math.hypot(x - p.x, y - p.y) < POL_RADIUS + 0.05) { nahSued = true; break; }
    }
    if (nahSued) break;
  }
  ctx.stroke();
}

// Kraftpfeil auf Magnet 2 + Text anziehen/abstoßen.
function zeichneKraft(ctx, welt, z, stil, W) {
  const k = kraftAufMagnet2(z);
  if (!k) return;
  const betrag = Math.abs(k.fx);
  // Magnet 1 liegt links von Magnet 2: Kraft nach links (fx < 0) = anziehen, nach rechts = abstoßen.
  const anziehen = k.fx < 0;
  const text = anziehen ? "anziehen" : "abstoßen";
  const cx = welt.px(z.magnet2x), cy = welt.py(M2Y + 1.4);
  if (betrag > 1e-6) {
    const ux = anziehen ? -1 : 1;
    const lpx = Math.min(W(1.8), 70);
    const x1 = cx + ux * lpx, y1 = cy;
    ctx.strokeStyle = stil.ok;
    ctx.fillStyle = stil.ok;
    ctx.lineWidth = stil.linienstaerke + 1;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x1, y1); ctx.stroke();
    const fl = Math.max(7, W(0.32));
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * fl, y1 - fl * 0.55);
    ctx.lineTo(x1 - ux * fl, y1 + fl * 0.55);
    ctx.closePath(); ctx.fill();
  }
  ctx.fillStyle = stil.text;
  ctx.font = (stil.linienstaerke > 3 ? "bold 18px" : "bold 14px") + " sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText("Kraft auf Magnet 2: " + text, cx, welt.py(M2Y + 2.2));
  ctx.font = stil.schrift;
}

// Frei verschiebbarer Kompass: Gehaeuse + Nadel, die sich am lokalen Feld B(kompass) ausrichtet.
function zeichneKompass(ctx, welt, z, polliste, stil, W, farbeN, farbeS) {
  const { bx, by } = feld(z.kompass.x, z.kompass.y, polliste);
  const betrag = Math.hypot(bx, by) || 1;
  const ux = bx / betrag, uy = by / betrag;
  const cx = welt.px(z.kompass.x), cy = welt.py(z.kompass.y);
  const R = Math.max(16, welt.laenge(0.95));
  ctx.save();
  // Gehaeuse
  ctx.fillStyle = stil.flaeche; ctx.strokeStyle = stil.text; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
  // Himmelsrichtungen N/S
  ctx.fillStyle = stil.beschriftung; ctx.font = `${Math.max(9, Math.round(R * 0.3))}px sans-serif`;
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText("N", cx, cy - R * 0.78); ctx.fillText("S", cx, cy + R * 0.78);
  // Nadel entlang B (py: +uy zeigt nach unten -> Spitze cx+ux*nl, cy-uy*nl); Nordspitze rot
  const nl = R * 0.78;
  const tx = cx + ux * nl, ty = cy - uy * nl, sx = cx - ux * nl, sy = cy + uy * nl;
  ctx.lineWidth = Math.max(3, stil.linienstaerke + 1);
  ctx.strokeStyle = farbeS; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(cx, cy); ctx.stroke();
  ctx.strokeStyle = farbeN; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(tx, ty); ctx.stroke();
  const fl = Math.max(6, R * 0.24), w = Math.atan2(ty - cy, tx - cx);
  ctx.fillStyle = farbeN; ctx.beginPath(); ctx.moveTo(tx, ty);
  ctx.lineTo(tx - fl * Math.cos(w - 0.5), ty - fl * Math.sin(w - 0.5));
  ctx.lineTo(tx - fl * Math.cos(w + 0.5), ty - fl * Math.sin(w + 0.5));
  ctx.closePath(); ctx.fill();
  // Drehpunkt + Beschriftung
  ctx.fillStyle = stil.text; ctx.beginPath(); ctx.arc(cx, cy, Math.max(2, R * 0.08), 0, 2 * Math.PI); ctx.fill();
  ctx.fillStyle = stil.beschriftung; ctx.textBaseline = "top"; ctx.font = stil.schrift;
  ctx.fillText("Kompass ziehen", cx, cy + R + 3);
  ctx.restore();
}

// ---------- Prueffaelle (Polmodell B(P)=Σ s_i (P-P_i)/|P-P_i|³, k = 1) ----------
// Beide Magnete liegen auf y = 0 (nebeneinander). Magnet 1: N(2,0), S(-2,0). Magnet 2 (Mitte x=6,
// Halblaenge 2): flip=0 -> N(4,0), S(8,0); flip=1 -> S(4,0), N(8,0). Werte unten aus feld() berechnet.
export const pruefFaelle = [
  {
    name: "Nur Magnet 1 (N bei 2|0, S bei −2|0)",
    parameter: { zweiterMagnet: 0 },
    toleranzProzent: 1,
    soll: { Bx0: -0.5, By0: 0, Bx2: -0.17678, By2: 0 }
  },
  {
    name: "Magnet 1 + Magnet 2 (x = 6, flip = 0, gleiche Pole zueinander)",
    parameter: { zweiterMagnet: 1, magnet2x: 6, magnet2flip: 0 },
    toleranzProzent: 1,
    soll: { Bx0: -0.54688, By0: 0, Bx2: -0.20723, By2: 0.01879 }
  },
  {
    name: "Magnet 1 + Magnet 2 (x = 6, flip = 1, ungleiche Pole zueinander)",
    parameter: { zweiterMagnet: 1, magnet2x: 6, magnet2flip: 1 },
    toleranzProzent: 1,
    soll: { Bx0: -0.45312, By0: 0, Bx2: -0.14632, By2: -0.01879 }
  }
];
