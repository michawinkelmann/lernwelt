// Stromkreis-Baukasten (Klasse 5) — statisch-interaktiv: Bauteile direkt auf der Flaeche
// antippen. Modell rein qualitativ (Strom fliesst / fliesst nicht), keine Zahlenwerte ausser
// der Batteriespannung. Lernziele: geschlossener vs. offener Stromkreis (Schalter), Leiter vs.
// Nichtleiter (Material im Kreis), Reihen- vs. Parallelschaltung (Lampe herausdrehen), und der
// Kurzschluss (blanker Draht ohne Lampe). Keine Zeitentwicklung: der Zustand wird per Klick
// gesetzt, die Prueffaelle setzen ihn ueber init(werte) fuer den Headless-Lauf.

const MATERIALIEN = [
  { name: "Metalldraht", leit: 2 },
  { name: "Eisennagel",  leit: 2 },
  { name: "Wasser",      leit: 1 },   // leitet nur schwach -> Lampe glimmt
  { name: "Holzstab",    leit: 0 },
  { name: "Kunststoff",  leit: 0 },
  { name: "Lücke (Luft)",leit: 0 }
];

// Feste Geometrie in Welt-Einheiten (0..16 x 0..9), von zeichne() und zeiger() gemeinsam genutzt
const GEO = {
  loop: { l: 2.0, r: 14.0, t: 7.0, b: 1.8 },
  batterie: { x: 2.0, y: 4.4 },
  schalter: { x: 4.7, y: 7.0, hit: { x0: 3.7, x1: 5.7, y0: 6.1, y1: 8.0 } },
  material: { x: 8.4, y: 7.0, hit: { x0: 6.9, x1: 9.9, y0: 6.1, y1: 8.0 } },
  topo: [
    { id: 0, label: "1 Lampe",  hit: { x0: 1.8, x1: 5.1, y0: 0.2, y1: 1.2 } },
    { id: 1, label: "Reihe",    hit: { x0: 5.4, x1: 8.6, y0: 0.2, y1: 1.2 } },
    { id: 2, label: "Parallel", hit: { x0: 8.9, x1: 12.4, y0: 0.2, y1: 1.2 } }
  ]
};

function lampenPositionen(topologie) {
  if (topologie === 0) return [{ id: "l1", x: 14.0, y: 4.4 }];
  if (topologie === 1) return [{ id: "l1", x: 14.0, y: 5.4 }, { id: "l2", x: 14.0, y: 3.0 }];
  return [{ id: "l1", x: 14.0, y: 4.4 }, { id: "l2", x: 11.4, y: 4.4 }];
}

// ---------- Modell: aus dem Zustand das Verhalten ableiten (rein, in Node lauffaehig) ----------
function analyse(z) {
  const mat = MATERIALIEN[z.material];
  const leit = mat.leit;
  const versorgt = z.schalter && leit > 0;       // Schalter zu UND Material leitet
  let lampen, lampenAn = 0, offen = false, statusText, statusTyp;
  // Wichtig: Eine herausgedrehte Lampe = leere Fassung = offener Kontakt (Unterbrechung),
  // NICHT ein Kurzschluss. Ein echter Kurzschluss braeuchte eine blanke Drahtbruecke ueber
  // die Pole; so etwas baut dieser Baukasten nicht, also gibt es hier keinen Kurzschluss.

  if (!versorgt) {
    lampen = z.topologie === 0 ? [0] : [0, 0];
    if (!z.schalter) { statusText = "Der Schalter ist offen — der Stromkreis ist unterbrochen."; statusTyp = "aus"; }
    else { statusText = mat.name + " leitet den Strom nicht — die Lampe bleibt dunkel."; statusTyp = "aus"; }
  } else if (z.topologie === 0) {
    if (z.l1) { lampen = [leit]; statusText = leit === 1 ? "Geschlossener Kreis — die Lampe glimmt nur (Wasser leitet schwach)." : "Geschlossener Stromkreis — die Lampe leuchtet."; statusTyp = "an"; }
    else { lampen = [0]; offen = true; statusText = "Die Lampenfassung ist leer — der Stromkreis ist offen, es fließt kein Strom."; statusTyp = "aus"; }
  } else if (z.topologie === 1) {            // Reihe: beide Lampen noetig
    if (z.l1 && z.l2) { lampen = [leit, leit]; statusText = leit === 1 ? "Reihenschaltung — beide Lampen glimmen (Wasser leitet schwach)." : "Reihenschaltung: Der Strom fließt durch beide Lampen — beide leuchten (etwas dunkler)."; statusTyp = "an"; }
    else { lampen = [0, 0]; offen = true; statusText = "Reihe unterbrochen: Eine leere Fassung öffnet den ganzen Kreis — beide bleiben dunkel."; statusTyp = "aus"; }
  } else {                                   // Parallel: jede Lampe auf eigenem Zweig
    lampen = [z.l1 ? leit : 0, z.l2 ? leit : 0];
    const an = (z.l1 ? 1 : 0) + (z.l2 ? 1 : 0);
    if (an === 2) { statusText = leit === 1 ? "Parallelschaltung — beide Lampen glimmen." : "Parallelschaltung: Jede Lampe hat ihren eigenen Weg — beide leuchten voll."; statusTyp = "an"; }
    else if (an === 1) { statusText = "Parallelschaltung: Eine Lampe fehlt — die andere leuchtet trotzdem weiter."; statusTyp = "an"; }
    else { lampen = [0, 0]; offen = true; statusText = "Beide Lampen fehlen — beide Fassungen sind offen, es fließt kein Strom."; statusTyp = "aus"; }
  }
  lampenAn = lampen.filter(b => b > 0).length;
  const fluss = versorgt && !offen;          // fliesst im Hauptkreis ueberhaupt Strom?
  return { leit, versorgt, lampen, lampenAn, offen, fluss, statusText, statusTyp, matName: mat.name };
}

export const manifest = {
  id: "physik/stromkreis-baukasten",
  titel: "Stromkreis-Baukasten",
  modus: "statisch",
  raster: false,
  werkzeuge: false,
  parameter: [],
  anzeigen: [
    { id: "lampenAn",  label: "Leuchtende Lampen", einheit: "", stellen: 0 },
    { id: "spannung",  label: "Batteriespannung",  einheit: "V", stellen: 1 }
  ],
  presets: [
    { name: "Lampe leuchtet",   werte: { schalter: 1, topologie: 0, l1: 1, l2: 1, material: 0 } },
    { name: "Reihenschaltung",  werte: { schalter: 1, topologie: 1, l1: 1, l2: 1, material: 0 } },
    { name: "Parallelschaltung",werte: { schalter: 1, topologie: 2, l1: 1, l2: 1, material: 0 } },
    { name: "Holz testen",      werte: { schalter: 1, topologie: 0, l1: 1, l2: 1, material: 3 } }
  ],
  vorhersage: {
    frage: "Du baust zwei Lampen ein und drehst dann eine heraus. Bei welcher Schaltung leuchtet die zweite Lampe weiter?",
    optionen: ["Bei der Reihenschaltung", "Bei der Parallelschaltung", "Bei beiden gleich"],
    aufloesung: "Bei der Parallelschaltung: Jede Lampe hat ihren eigenen Weg zur Batterie. Drehst du eine heraus, fließt durch die andere weiterhin Strom. In der Reihenschaltung hängen beide am selben Weg — fehlt eine, ist der ganze Kreis unterbrochen und beide bleiben dunkel. Deshalb ist die Beleuchtung zu Hause parallel geschaltet."
  },
  beobachtung: [
    "Tippe auf den Schalter: Erst im geschlossenen Kreis leuchtet die Lampe. Ein offener Kreis = kein Stromfluss.",
    "Tippe wiederholt auf das Material im Kreis und teste alle Stoffe. Welche leiten den Strom (Lampe an), welche nicht? Was macht das Wasser?",
    "Stelle „Reihe“ ein und drehe eine Lampe heraus (antippen) — beide gehen aus. Stelle dann „Parallel“ ein und wiederhole: Was passiert jetzt mit der anderen Lampe?",
    "Stelle „1 Lampe“ ein und drehe die Lampe heraus, während der Schalter geschlossen ist: Die leere Fassung unterbricht den Kreis genau wie ein offener Schalter — es fließt kein Strom. (Ein Kurzschluss entsteht erst durch eine blanke Drahtbrücke direkt über die Pole — die baut man hier nicht.)"
  ],
  modellgrenzen: "Stark vereinfachtes Modell: Es zählt nur, OB Strom fließt, nicht wie viel. Innenwiderstand der Batterie, Drahtwiderstand und unterschiedliche Lampen sind weggelassen; „leuchtet“ ist qualitativ. Eine herausgedrehte Lampe ist eine leere Fassung — ein offener Kontakt, kein Kurzschluss. Einen echten Kurzschluss (eine blanke Drahtbrücke direkt über die Batteriepole) bildet dieser Baukasten nicht nach; er ist gefährlich und entlädt die Batterie sehr schnell.",
  bilanz: {
    lampenAn: { label: "Leuchtende Lampen", einheit: "", stellen: 0 },
    offen:    { label: "Offener Stromkreis", einheit: "", stellen: 0 }
  }
};

export function init(p) {
  return {
    t: 0,
    schalter: (p.schalter ?? 0) ? true : false,   // Start: offen -> Aufforderung zum Schliessen
    topologie: p.topologie ?? 0,
    l1: (p.l1 ?? 1) ? true : false,
    l2: (p.l2 ?? 1) ? true : false,
    material: p.material ?? 0
  };
}

export function update() { /* statisch: keine Zeitentwicklung */ }
export function istFertig() { return true; }

export function messwerte(z) {
  return { lampenAn: analyse(z).lampenAn, spannung: 4.5 };
}

export function bilanz(z) {
  const a = analyse(z);
  return { lampenAn: a.lampenAn, offen: a.offen ? 1 : 0 };
}

export function weltBereich() {
  return { xMin: 0, xMax: 16, yMin: 0, yMax: 9 };
}

// ---------- Zeiger: Klick auf Bauteil ----------
function inRect(x, y, r) { return x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1; }

export function zeiger({ x, y, zustand: z }) {
  if (inRect(x, y, GEO.schalter.hit)) { z.schalter = !z.schalter; return true; }
  if (inRect(x, y, GEO.material.hit)) { z.material = (z.material + 1) % MATERIALIEN.length; return true; }
  for (const b of GEO.topo) if (inRect(x, y, b.hit)) { if (z.topologie !== b.id) { z.topologie = b.id; return true; } return false; }
  for (const lp of lampenPositionen(z.topologie)) {
    if (Math.hypot(x - lp.x, y - lp.y) < 0.95) { z[lp.id] = !z[lp.id]; return true; }
  }
  return false;
}

// ---------- Zeichnen ----------
export function zeichne({ ctx, welt, zustand: z, stil }) {
  const a = analyse(z);
  const aktiv = a.fluss ? stil.akzent : stil.beschriftung;
  const W = (m) => welt.laenge(m);
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.font = stil.schrift;

  // --- Leitungen ---
  const L = GEO.loop;
  const draht = (x1, y1, x2, y2, an) => {
    ctx.strokeStyle = an ? aktiv : stil.beschriftung;
    ctx.lineWidth = an ? stil.linienstaerke + 1.5 : stil.linienstaerke;
    ctx.beginPath(); ctx.moveTo(welt.px(x1), welt.py(y1)); ctx.lineTo(welt.px(x2), welt.py(y2)); ctx.stroke();
  };
  // Aussenrahmen: oben (mit Luecken fuer Schalter & Material), unten, links (mit Batterie)
  draht(L.l, L.t, GEO.schalter.x - 0.55, L.t, a.fluss);                 // oben links bis Schalter
  draht(GEO.schalter.x + 0.55, L.t, GEO.material.x - 0.8, L.t, a.fluss);// Schalter bis Material
  draht(GEO.material.x + 0.8, L.t, L.r, L.t, a.fluss);                  // Material bis Ecke
  draht(L.l, L.b, L.r, L.b, a.fluss);                                   // unten
  draht(L.l, L.b, L.l, GEO.batterie.y - 0.7, a.fluss);                  // links unten bis Batterie
  draht(L.l, GEO.batterie.y + 0.7, L.l, L.t, a.fluss);                  // Batterie bis links oben

  // Rechte Seite je nach Topologie
  const lp = lampenPositionen(z.topologie);
  if (z.topologie === 2) {
    draht(11.4, L.t, 11.4, 4.4 + 0.62, a.lampen[1] > 0);               // zweiter Zweig oben
    draht(11.4, 4.4 - 0.62, 11.4, L.b, a.lampen[1] > 0);               // zweiter Zweig unten
    draht(14.0, L.t, 14.0, 4.4 + 0.62, a.lampen[0] > 0);
    draht(14.0, 4.4 - 0.62, 14.0, L.b, a.lampen[0] > 0);
  }
  if (z.topologie === 0) {
    draht(14.0, L.t, 14.0, lp[0].y + 0.62, a.lampen[0] > 0);
    draht(14.0, lp[0].y - 0.62, 14.0, L.b, a.lampen[0] > 0);
  } else if (z.topologie === 1) {
    const an = a.lampen[0] > 0;
    draht(14.0, L.t, 14.0, lp[0].y + 0.62, an);
    draht(14.0, lp[0].y - 0.62, 14.0, lp[1].y + 0.62, an);
    draht(14.0, lp[1].y - 0.62, 14.0, L.b, an);
  }

  // --- Elektronen-Fluss: nur durch tatsaechlich leitende Zweige (leere Fassung = kein Fluss) ---
  if (a.fluss) {
    const reduce = typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Welche vertikalen Zweige fuehren Strom? In der Parallelschaltung nur die mit eingedrehter Lampe.
    let zweige;
    if (z.topologie === 2) {
      zweige = [];
      if (a.lampen[0] > 0) zweige.push(14.0);   // Zweig mit Lampe 1 (aussen rechts)
      if (a.lampen[1] > 0) zweige.push(11.4);   // Zweig mit Lampe 2 (innen)
      if (!zweige.length) zweige = [14.0];       // Fallback (bei a.fluss faktisch nie leer)
    } else {
      zweige = [14.0];                           // 1 Lampe / Reihe: einziger rechter Zweig (x = 14)
    }
    const xMain = Math.max(...zweige);
    const btTop = GEO.batterie.y + 0.7, btBot = GEO.batterie.y - 0.7;   // Pole der Batterie auf der linken Kante
    // Hauptschleife im Uhrzeigersinn, ABER mit Luecke am Batteriespalt: die Elektronen verschwinden
    // am einen Pol und tauchen am anderen wieder auf — sie laufen NIE sichtbar zwischen den Polen.
    const pfade = [[[L.l, btTop], [L.l, L.t], [xMain, L.t], [xMain, L.b], [L.l, L.b], [L.l, btBot]]];
    // Weitere leitende Parallelzweige als Vertikal-Segment, GLEICHE Richtung wie der rechte Hauptzweig (oben -> unten).
    for (const bx of zweige) if (bx !== xMain) pfade.push([[bx, L.t], [bx, L.b]]);
    // Gleichmaessige Geschwindigkeit UND gleicher Abstand auf jedem Zweig (sonst wirkt ein kurzer Zweig langsamer).
    const spacing = (2 * (L.r - L.l) + 2 * (L.t - L.b)) / 26;            // konstanter Abstand (Welteinheiten)
    const v = 5.5;                                                      // konstante Geschwindigkeit (Welteinheiten/s)
    const t = (typeof performance !== "undefined" ? performance.now() : Date.now()) / 1000;
    const off = reduce ? spacing * 0.5 : (v * t) % spacing;             // gemeinsam, gleichmaessig wandernder Versatz
    ctx.fillStyle = stil.akzent;
    for (const poly of pfade) {
      const segLen = [], cum = [0]; let total = 0;
      for (let i = 0; i < poly.length - 1; i++) { const d = Math.hypot(poly[i + 1][0] - poly[i][0], poly[i + 1][1] - poly[i][1]); segLen.push(d); total += d; cum.push(total); }
      for (let s = off; s < total; s += spacing) {
        let i = 0; while (i < segLen.length - 1 && s > cum[i + 1]) i++;
        const f = segLen[i] ? (s - cum[i]) / segLen[i] : 0;
        const wx = poly[i][0] + (poly[i + 1][0] - poly[i][0]) * f;
        const wy = poly[i][1] + (poly[i + 1][1] - poly[i][1]) * f;
        ctx.beginPath(); ctx.arc(welt.px(wx), welt.py(wy), Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill();
      }
    }
  }

  // --- Batterie ---
  const bx = welt.px(GEO.batterie.x), by = welt.py(GEO.batterie.y);
  ctx.strokeStyle = stil.text; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.moveTo(bx - W(0.5), by - W(0.7)); ctx.lineTo(bx + W(0.5), by - W(0.7)); ctx.stroke(); // lange Platte = +
  ctx.lineWidth = stil.linienstaerke + 3;
  ctx.beginPath(); ctx.moveTo(bx - W(0.28), by + W(0.7)); ctx.lineTo(bx + W(0.28), by + W(0.7)); ctx.stroke(); // kurze, dicke = -
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "left"; ctx.textBaseline = "middle";
  ctx.fillText("+", bx + W(0.62), by - W(0.7));
  ctx.fillText("–", bx + W(0.62), by + W(0.7));
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillText("Batterie 4,5 V", bx, by + W(1.05));

  // --- Schalter ---
  const sx = welt.px(GEO.schalter.x), sy = welt.py(GEO.schalter.y);
  ctx.fillStyle = stil.text;
  ctx.beginPath(); ctx.arc(welt.px(GEO.schalter.x - 0.55), sy, Math.max(3, W(0.08)), 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(welt.px(GEO.schalter.x + 0.55), sy, Math.max(3, W(0.08)), 0, 2 * Math.PI); ctx.fill();
  ctx.strokeStyle = z.schalter ? aktiv : stil.fehler; ctx.lineWidth = stil.linienstaerke + 1;
  ctx.beginPath(); ctx.moveTo(welt.px(GEO.schalter.x - 0.55), sy);
  if (z.schalter) ctx.lineTo(welt.px(GEO.schalter.x + 0.55), sy);
  else ctx.lineTo(welt.px(GEO.schalter.x + 0.35), sy - W(0.75));
  ctx.stroke();
  ctx.fillStyle = stil.beschriftung; ctx.textBaseline = "bottom";
  ctx.fillText("Schalter (" + (z.schalter ? "zu" : "offen") + ")", sx, welt.py(GEO.schalter.y) - W(0.95));

  // --- Material-Slot ---
  const mx = GEO.material.x;
  ctx.fillStyle = a.leit > 0 ? (a.leit === 2 ? stil.hauch : stil.flaeche) : stil.flaeche;
  ctx.strokeStyle = stil.text; ctx.lineWidth = stil.linienstaerke;
  const mw = 1.5, mh = 0.9;
  ctx.beginPath(); ctx.rect(welt.px(mx - mw / 2), welt.py(GEO.material.y + mh / 2), W(mw), W(mh)); ctx.fill(); ctx.stroke();
  ctx.fillStyle = stil.text; ctx.textBaseline = "middle"; ctx.textAlign = "center";
  ctx.fillText(a.matName, welt.px(mx), welt.py(GEO.material.y));
  ctx.fillStyle = stil.beschriftung; ctx.textBaseline = "bottom";
  ctx.fillText("Material (antippen)", welt.px(mx), welt.py(GEO.material.y) - W(0.85));

  // --- Lampen ---
  for (let i = 0; i < lp.length; i++) {
    const eingedreht = z[lp[i].id];
    lampe(ctx, welt, lp[i].x, lp[i].y, eingedreht ? a.lampen[i] : -1, lp[i].id.toUpperCase(), stil, W);
  }

  // --- Topologie-Schalter (Knopfreihe unten) ---
  ctx.textBaseline = "middle"; ctx.textAlign = "center";
  for (const b of GEO.topo) {
    const aktivT = z.topologie === b.id;
    ctx.fillStyle = aktivT ? stil.akzent : stil.flaeche;
    ctx.strokeStyle = aktivT ? stil.akzent : stil.beschriftung;
    ctx.lineWidth = stil.linienstaerke;
    ctx.beginPath();
    ctx.rect(welt.px(b.hit.x0), welt.py(b.hit.y1), W(b.hit.x1 - b.hit.x0), W(b.hit.y1 - b.hit.y0));
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = aktivT ? stil.flaeche : stil.text;
    ctx.fillText(b.label, welt.px((b.hit.x0 + b.hit.x1) / 2), welt.py((b.hit.y0 + b.hit.y1) / 2));
  }
  ctx.fillStyle = stil.beschriftung; ctx.textAlign = "left";
  ctx.fillText("Schaltung:", welt.px(12.7), welt.py(0.7));

  // --- Statuszeile ---
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  ctx.fillStyle = a.statusTyp === "an" ? stil.ok : stil.beschriftung;
  ctx.font = (stil.linienstaerke > 3 ? "bold 18px" : "bold 13px") + " sans-serif";
  ctx.fillText(a.statusText, welt.px(8), welt.py(8.72));

  ctx.restore();
}

// Lampe zeichnen: level -1 = herausgedreht (leere Fassung), 0 = aus, 1 = glimmt, 2 = hell
function lampe(ctx, welt, cx, cy, level, name, stil, W) {
  const px = welt.px(cx), py = welt.py(cy), r = W(0.62);
  if (level === -1) {
    ctx.strokeStyle = stil.beschriftung; ctx.lineWidth = stil.linienstaerke; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = stil.text; ctx.beginPath();
    ctx.arc(px - r * 0.5, py + r, Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(px + r * 0.5, py + r, Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill();
    ctx.fillStyle = stil.beschriftung; ctx.textAlign = "center"; ctx.textBaseline = "bottom";
    ctx.fillText("herausgedreht", px, py - r - 4);
    return;
  }
  if (level > 0) {
    const farbe = level >= 2 ? "#ffc21f" : "#ffe39a";
    ctx.save(); ctx.shadowColor = farbe; ctx.shadowBlur = level >= 2 ? 26 : 13;
    ctx.fillStyle = farbe; ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill(); ctx.restore();
  } else {
    ctx.fillStyle = stil.flaeche; ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.fill();
  }
  ctx.strokeStyle = stil.text; ctx.lineWidth = stil.linienstaerke;
  ctx.beginPath(); ctx.arc(px, py, r, 0, 2 * Math.PI); ctx.stroke();
  // Gluehwendel
  ctx.beginPath();
  ctx.moveTo(px - r * 0.55, py + r * 0.1);
  ctx.lineTo(px - r * 0.2, py - r * 0.45); ctx.lineTo(px + r * 0.2, py + r * 0.45); ctx.lineTo(px + r * 0.55, py - r * 0.1);
  ctx.stroke();
  // Sockel
  ctx.fillStyle = stil.text;
  ctx.beginPath(); ctx.arc(px - r * 0.5, py + r, Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill();
  ctx.beginPath(); ctx.arc(px + r * 0.5, py + r, Math.max(2.5, W(0.07)), 0, 2 * Math.PI); ctx.fill();
}

// ---------- Prueffaelle (analytisch: boolesche Schaltungslogik) ----------
export const pruefFaelle = [
  { name: "Eine Lampe, Schalter zu, Metalldraht", parameter: { schalter: 1, topologie: 0, l1: 1, material: 0 }, toleranzProzent: 1, soll: { lampenAn: 1, offen: 0 } },
  { name: "Schalter offen -> kein Strom", parameter: { schalter: 0, topologie: 0, l1: 1, material: 0 }, toleranzProzent: 1, soll: { lampenAn: 0 } },
  { name: "Holz leitet nicht", parameter: { schalter: 1, topologie: 0, l1: 1, material: 3 }, toleranzProzent: 1, soll: { lampenAn: 0 } },
  { name: "Reihe: beide Lampen leuchten", parameter: { schalter: 1, topologie: 1, l1: 1, l2: 1, material: 0 }, toleranzProzent: 1, soll: { lampenAn: 2 } },
  { name: "Reihe: eine fehlt -> Kreis offen", parameter: { schalter: 1, topologie: 1, l1: 1, l2: 0, material: 0 }, toleranzProzent: 1, soll: { lampenAn: 0, offen: 1 } },
  { name: "Parallel: eine fehlt -> andere leuchtet", parameter: { schalter: 1, topologie: 2, l1: 1, l2: 0, material: 0 }, toleranzProzent: 1, soll: { lampenAn: 1, offen: 0 } },
  { name: "Parallel: beide fehlen -> offen, KEIN Kurzschluss", parameter: { schalter: 1, topologie: 2, l1: 0, l2: 0, material: 0 }, toleranzProzent: 1, soll: { lampenAn: 0, offen: 1 } },
  { name: "Eine Lampe heraus -> offener Kontakt, KEIN Kurzschluss", parameter: { schalter: 1, topologie: 0, l1: 0, material: 0 }, toleranzProzent: 1, soll: { lampenAn: 0, offen: 1 } }
];
