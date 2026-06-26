// spiel.js — „Reagenzglas-Sortierer" (Water-Sort-Puzzle) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Gieß-Regeln, gewonnen-Prüfung, Solver, lösbarer Level-
// Aufbau) ist exportiert und in Node testbar — auf Modulebene wird weder document
// noch window angefasst, das Canvas und die Eingaben entstehen erst in starte().
//
// Modell: Jedes Glas ist ein Array von Farb-IDs, von UNTEN (Index 0) nach oben.
// Das letzte Element ist die oberste Schicht. Eine leere Liste = leeres Glas.

export const KAPAZITAET = 4; // Farbsegmente pro Glas

// Sieben gut unterscheidbare Farb-Definitionen (Farbe + Buchstabe + Muster
// für Barrierearmut — nie nur Farbe). „token" zeigt auf eine CSS-Variable,
// „ersatz" ist der Fallback, falls die Variable fehlt (z. B. in Node/Tests).
// „muster" steuert eine kleine grafische Schraffur je Farbe.
export const FARBEN = [
  { id: 0, name: "Blau",   token: "--mathe",  ersatz: "#19599f", buchstabe: "B", muster: "streifen" },
  { id: 1, name: "Rot",    token: "--fehler", ersatz: "#b3261e", buchstabe: "R", muster: "punkte"   },
  { id: 2, name: "Grün",   token: "--ok",     ersatz: "#2c7029", buchstabe: "G", muster: "gitter"   },
  { id: 3, name: "Orange", token: "--physik", ersatz: "#a3570e", buchstabe: "O", muster: "wellen"   },
  { id: 4, name: "Lila",   token: "--info",   ersatz: "#6b3fa0", buchstabe: "L", muster: "rauten"   },
  { id: 5, name: "Türkis", token: null,       ersatz: "#0e8a8a", buchstabe: "T", muster: "kreise"   },
  { id: 6, name: "Pink",   token: null,       ersatz: "#b5247c", buchstabe: "P", muster: "kreuze"   }
];

export const MAX_FARBEN = FARBEN.length; // 7 — Obergrenze des Levelaufbaus

export const manifest = {
  id: "sp-reagenzglas-sortierer",
  titel: "Reagenzglas-Sortierer",
  kurz: "Gieße Farbschichten zwischen Reagenzgläsern um, bis jedes Glas einfarbig ist. Reines Logik-Puzzle, das von Level zu Level kniffliger wird.",
  punkteLabel: "Level",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Glas antippen zum Aufnehmen, zweites Glas antippen zum Umgießen · Z macht den letzten Zug rückgängig · R mischt neu"
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Oberste zusammenhängende Farbschicht eines Glases: { farbe, anzahl } oder null
// bei leerem Glas. „anzahl" zählt, wie viele gleiche Farben oben zusammenliegen.
export function obersteSchicht(glas) {
  if (!glas || glas.length === 0) return null;
  const farbe = glas[glas.length - 1];
  let anzahl = 1;
  for (let i = glas.length - 2; i >= 0 && glas[i] === farbe; i--) anzahl++;
  return { farbe, anzahl };
}

// Darf aus vonGlas in nachGlas gegossen werden?
//  • nicht ins selbe Glas (Referenzgleichheit), Quelle nicht leer
//  • Zielglas leer ODER oben dieselbe Farbe wie die Quelle
//  • im Zielglas muss mindestens 1 Platz frei sein (Kapazität 4)
export function darfGiessen(vonGlas, nachGlas) {
  if (vonGlas === nachGlas) return false;
  const oben = obersteSchicht(vonGlas);
  if (!oben) return false;                          // Quelle leer
  if (nachGlas.length >= KAPAZITAET) return false;  // Ziel voll
  if (nachGlas.length === 0) return true;           // Ziel leer → immer erlaubt
  return nachGlas[nachGlas.length - 1] === oben.farbe; // gleiche Farbe oben
}

// Gießt die oberste Schicht von vonIdx nach nachIdx — so viel, wie zusammenhängend
// oben liegt UND Platz hat. Liefert ein NEUES rohre-Array (unveränderlich) oder
// null, wenn der Zug ungültig ist. Das Eingabe-Array bleibt unangetastet.
export function giesse(rohre, vonIdx, nachIdx) {
  if (vonIdx === nachIdx) return null;
  const von = rohre[vonIdx];
  const nach = rohre[nachIdx];
  if (!von || !nach) return null;
  if (!darfGiessen(von, nach)) return null;
  const oben = obersteSchicht(von);
  const platz = KAPAZITAET - nach.length;
  const menge = Math.min(oben.anzahl, platz);
  if (menge <= 0) return null;
  // Tiefe Kopie aller Gläser, damit nichts geteilt wird.
  const neu = rohre.map(g => g.slice());
  for (let i = 0; i < menge; i++) {
    neu[nachIdx].push(neu[vonIdx].pop());
  }
  return neu;
}

// Ist das Puzzle gelöst? Jedes Glas ist leer ODER vollständig einfarbig
// (alle KAPAZITAET Plätze dieselbe Farbe).
export function gewonnen(rohre) {
  return rohre.every(glas => {
    if (glas.length === 0) return true;
    if (glas.length !== KAPAZITAET) return false;
    return glas.every(f => f === glas[0]);
  });
}

// Existiert irgendein SINNVOLLER Zug? (für „keine Züge mehr"-Hinweis)
// Eine schon einfarbig-volle Quelle in ein leeres Glas zu kippen, zählt nicht
// als Fortschritt und wird hier ausgeklammert.
export function gibtZug(rohre) {
  for (let v = 0; v < rohre.length; v++) {
    const o = obersteSchicht(rohre[v]);
    if (!o) continue;
    const quelleEinfarbigVoll = rohre[v].length === KAPAZITAET && o.anzahl === KAPAZITAET;
    for (let n = 0; n < rohre.length; n++) {
      if (v === n) continue;
      if (!darfGiessen(rohre[v], rohre[n])) continue;
      if (quelleEinfarbigVoll && rohre[n].length === 0) continue;
      return true;
    }
  }
  return false;
}

// Kleiner deterministischer Zufallsgenerator (Mulberry32) — für reproduzierbare
// Tests und stabiles „R mischt neu" bei festem Level.
export function macheRng(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Gelöster Zielzustand: je Farbe ein volles Glas, danach die leeren Gläser.
export function geloesterZustand(farbenAnzahl, leereGlaeser) {
  const rohre = [];
  for (let f = 0; f < farbenAnzahl; f++) {
    rohre.push(Array(KAPAZITAET).fill(f));
  }
  for (let e = 0; e < leereGlaeser; e++) rohre.push([]);
  return rohre;
}

// Liste aller AKTUELL gültigen Züge als [vonIdx, nachIdx] (rohe Variante:
// jeder per darfGiessen erlaubte Guss zählt — auch eine volle einfarbige Quelle
// in ein leeres Glas zu kippen). Diese Variante steuert die Durchmischung beim
// Levelaufbau und den Solver; für UI-Hinweise dient gibtZug() (mit Sinnfilter).
function alleZuege(rohre) {
  const zuege = [];
  for (let v = 0; v < rohre.length; v++) {
    if (rohre[v].length === 0) continue;
    for (let n = 0; n < rohre.length; n++) {
      if (v !== n && darfGiessen(rohre[v], rohre[n])) zuege.push([v, n]);
    }
  }
  return zuege;
}

// Kompakter Schlüssel eines Zustands (für Besuchts-Mengen im Solver).
function zustandSchluessel(rohre) {
  return rohre.map(g => g.join(",")).join("|");
}

// Tiefensuche nach EINER Lösung (Zugfolge), iterativ mit Besuchts-Menge.
// Der Zustandsraum (≤9 Gläser × 4) ist klein genug für eine schnelle Suche.
// Liefert ein Array von Zügen [[von,nach],…] oder null, wenn unlösbar.
export function loese(start) {
  if (gewonnen(start)) return [];
  const besucht = new Set([zustandSchluessel(start)]);
  const stapel = [{ rohre: start.map(g => g.slice()), pfad: [] }];
  const GRENZE = 300000; // Sicherheitsdeckel gegen Endlosfälle
  let schritte = 0;
  while (stapel.length) {
    if (++schritte > GRENZE) return null;
    const { rohre, pfad } = stapel.pop();
    const zuege = alleZuege(rohre);
    for (const [v, n] of zuege) {
      const naechste = giesse(rohre, v, n);
      if (!naechste) continue;
      const key = zustandSchluessel(naechste);
      if (besucht.has(key)) continue;
      const neuerPfad = pfad.concat([[v, n]]);
      if (gewonnen(naechste)) return neuerPfad;
      besucht.add(key);
      stapel.push({ rohre: naechste, pfad: neuerPfad });
    }
  }
  return null;
}

// Fisher-Yates-Mischung einer Liste mit gegebenem rng (in place).
function mische(liste, rng) {
  for (let i = liste.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = liste[i]; liste[i] = liste[j]; liste[j] = t;
  }
  return liste;
}

// Baut eine LÖSBARE Startaufstellung. Vorgehen (vom Auftrag erlaubt):
// die Farbsegmente (je Farbe genau KAPAZITAET Stück) werden zufällig permutiert
// und auf die vollen Gläser verteilt; die leeren Gläser bleiben leer. Anschließend
// prüft der Solver loese(), ob die Stellung lösbar UND noch nicht gelöst ist —
// nur dann wird sie übernommen, sonst neu gemischt. So ist die zurückgegebene
// Stellung garantiert lösbar, und es liegt eine echte Lösung bei.
// Liefert { rohre, loesung } — loesung = von loese() gefundene Zugfolge.
export function baueLevelMitLoesung(farbenAnzahl, leereGlaeser, rng = Math.random) {
  const n = Math.max(1, Math.min(MAX_FARBEN, farbenAnzahl));
  const leer = Math.max(1, leereGlaeser);

  // Vorrat: jede Farbe genau KAPAZITAET-mal.
  const vorratBasis = [];
  for (let f = 0; f < n; f++) for (let k = 0; k < KAPAZITAET; k++) vorratBasis.push(f);

  let letztesGueltige = null; // Rückfall, falls alle Versuche „schon gelöst" sind
  for (let versuch = 0; versuch < 200; versuch++) {
    const vorrat = mische(vorratBasis.slice(), rng);
    const rohre = [];
    for (let g = 0; g < n; g++) rohre.push(vorrat.slice(g * KAPAZITAET, (g + 1) * KAPAZITAET));
    for (let e = 0; e < leer; e++) rohre.push([]);
    if (gewonnen(rohre)) continue;          // zufällig schon sortiert → neu mischen
    const loesung = loese(rohre);           // lösbar?
    if (loesung && loesung.length) return { rohre, loesung };
    if (loesung) letztesGueltige = { rohre, loesung }; // (gewonnen wäre oben raus)
  }

  // Notnagel (praktisch nie erreicht): falls oben nichts Brauchbares kam, einen
  // gültigen Zug vom gelösten Zustand weg machen (immer lösbar, nur leicht).
  if (letztesGueltige) return letztesGueltige;
  let rohre = geloesterZustand(n, leer);
  const zuege = alleZuege(rohre);
  if (zuege.length) {
    const z = zuege[Math.floor(rng() * zuege.length)];
    const naechste = giesse(rohre, z[0], z[1]);
    if (naechste) rohre = naechste;
  }
  return { rohre, loesung: loese(rohre) || [] };
}

// Bequeme Kurzform: nur die Startaufstellung (lösbar).
export function baueLevel(farbenAnzahl, leereGlaeser, rng = Math.random) {
  return baueLevelMitLoesung(farbenAnzahl, leereGlaeser, rng).rohre;
}

// Konfiguration je Levelnummer (1-basiert): mehr Farben mit steigendem Level.
// Start: 3 Farben + 2 leere Gläser. Ab da pro Level eine Farbe mehr,
// bis MAX_FARBEN; leere Gläser bleiben bei 2.
export function levelKonfig(levelNr) {
  const lvl = Math.max(1, levelNr);
  const farben = Math.min(MAX_FARBEN, 2 + lvl); // L1→3, L2→4, … L5→7, danach 7
  const leer = 2;                               // konstant 2 leere Gläser
  return { farben, leer };
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export const LOGIK_B = 480; // logische Breite der Spielfläche
export const LOGIK_H = 360; // logische Höhe

export function starte(api) {
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOGIK_B * faktor);
  canvas.height = Math.round(LOGIK_H * faktor);
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:72vh;height:auto;margin:0 auto;border-radius:inherit;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // Kopfzeile: Zähler für Züge ergänzen
  let zuegeEl = api.kopf.querySelector("#rs-zuege");
  if (!zuegeEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Züge: <b id="rs-zuege">0</b>';
    api.kopf.appendChild(span);
    zuegeEl = span.querySelector("b");
  }

  let levelNr = 1;
  let rohre = [];
  let auswahl = -1;       // Index des aufgenommenen Glases, oder -1
  let historie = [];      // Stapel früherer rohre-Zustände (für Undo)
  let zuegeZahl = 0;
  let meldung = "";       // kurze Statuszeile unter den Gläsern
  let meldungBis = 0;     // performance.now()-Zeitpunkt, bis Meldung sichtbar
  let geometrie = [];     // je Glas: { x, y, b, h } in Logikkoordinaten
  let gewonnenEffekt = 0; // Sekunden für die Gewonnen-Animation
  let aktuelleSeed = 1;   // Seed des aktuellen Levels (für „R neu mischen")

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function farbeFuer(id) {
    const f = FARBEN[id];
    if (!f) return "#888888";
    return f.token ? farbe(f.token, f.ersatz) : f.ersatz;
  }

  // Glas-Geometrie für die aktuelle Glaszahl bestimmen (zentriert, ggf. zweireihig).
  function berechneGeometrie() {
    geometrie = [];
    const anzahl = rohre.length;
    const proReihe = anzahl <= 6 ? anzahl : Math.ceil(anzahl / 2);
    const reihen = anzahl <= 6 ? 1 : 2;
    const segH = 26;
    const glasH = segH * KAPAZITAET + 14;     // Innenhöhe + Sockel/Lippe
    const glasB = Math.min(46, Math.floor((LOGIK_B - 24) / proReihe) - 12);
    const luecke = 14;
    const obenStart = reihen === 1 ? 70 : 48;
    const reihenHoehe = glasH + 34;
    for (let i = 0; i < anzahl; i++) {
      const reihe = Math.floor(i / proReihe);
      const istLetzteReihe = reihe === reihen - 1;
      const spalteAnzahl = (!istLetzteReihe || anzahl % proReihe === 0) ? proReihe : (anzahl - reihe * proReihe);
      const spalte = i - reihe * proReihe;
      const gesamtB = spalteAnzahl * glasB + (spalteAnzahl - 1) * luecke;
      const x0 = (LOGIK_B - gesamtB) / 2;
      const x = x0 + spalte * (glasB + luecke);
      const y = obenStart + reihe * reihenHoehe;
      geometrie.push({ x, y, b: glasB, h: glasH, segH });
    }
  }

  function zeigeMeldung(text, dauer = 1600) {
    meldung = text;
    meldungBis = performance.now() + dauer;
  }

  function ladeLevel(neuMischen = false) {
    const cfg = levelKonfig(levelNr);
    if (!neuMischen) aktuelleSeed = (Date.now() ^ (levelNr * 2654435761)) >>> 0;
    const rng = macheRng(aktuelleSeed);
    rohre = baueLevel(cfg.farben, cfg.leer, rng);
    auswahl = -1;
    historie = [];
    zuegeZahl = 0;
    gewonnenEffekt = 0;
    zuegeEl.textContent = "0";
    api.setzePunkte(levelNr);
    berechneGeometrie();
    meldung = "";
  }

  function tiefKopie(r) { return r.map(g => g.slice()); }

  function fuehreZugAus(vonIdx, nachIdx) {
    const naechste = giesse(rohre, vonIdx, nachIdx);
    if (!naechste) return false;
    historie.push(tiefKopie(rohre));
    if (historie.length > 200) historie.shift();
    rohre = naechste;
    zuegeZahl++;
    zuegeEl.textContent = String(zuegeZahl);
    return true;
  }

  function rueckgaengig() {
    if (historie.length === 0) { zeigeMeldung("Kein Zug zum Zurücknehmen"); return; }
    rohre = historie.pop();
    auswahl = -1;
    zuegeZahl = Math.max(0, zuegeZahl - 1);
    zuegeEl.textContent = String(zuegeZahl);
    zeigeMeldung("Zug zurückgenommen");
  }

  // Reaktion auf das Antippen eines Glases (oder daneben).
  function tippeGlas(idx) {
    if (gewonnenEffekt > 0) return; // während der Gewonnen-Animation gesperrt
    if (idx < 0) { auswahl = -1; return; }
    if (auswahl === -1) {
      // Aufnehmen — nur ein nicht-leeres Glas lässt sich aufnehmen.
      if (rohre[idx].length === 0) { zeigeMeldung("Dieses Glas ist leer"); return; }
      auswahl = idx;
    } else if (auswahl === idx) {
      auswahl = -1; // dasselbe Glas → Auswahl aufheben
    } else {
      if (fuehreZugAus(auswahl, idx)) {
        auswahl = -1;
        if (gewonnen(rohre)) levelGeschafft();
      } else {
        zeigeMeldung("So passt es nicht — andere Farbe oder voll");
        auswahl = -1; // Auswahl lösen statt umzusetzen
      }
    }
  }

  function levelGeschafft() {
    gewonnenEffekt = 1.8;
    zeigeMeldung("Gelöst! Nächstes Level …", 1700);
  }

  // Glas-Index unter einer Logik-Koordinate (x,y) bestimmen — mit etwas
  // Toleranz nach unten, damit auch „unter das Glas tippen" trifft.
  function glasUnter(x, y) {
    for (let i = 0; i < geometrie.length; i++) {
      const g = geometrie[i];
      if (x >= g.x - 6 && x <= g.x + g.b + 6 && y >= g.y - 18 && y <= g.y + g.h + 22) return i;
    }
    // Nur x-basiert (Spalte) als Rückfall, wenn vertikal knapp daneben getippt.
    let beste = -1, distanz = 1e9;
    for (let i = 0; i < geometrie.length; i++) {
      const g = geometrie[i];
      const mx = g.x + g.b / 2;
      const d = Math.abs(x - mx);
      if (d < distanz && d < g.b) { distanz = d; beste = i; }
    }
    return beste;
  }

  // --- Eingaben ---
  api.tasten(ev => {
    if (ev.key === "z" || ev.key === "Z") rueckgaengig();
    else if (ev.key === "r" || ev.key === "R") { ladeLevel(true); }
    else if (ev.key === "Escape") auswahl = -1;
  });

  function zeigerXY(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    // jsdom/Layout ohne Maße: Division durch 0 vermeiden.
    if (!r.width || !r.height) return { x: 0, y: 0 };
    return {
      x: (clientX - r.left) / r.width * LOGIK_B,
      y: (clientY - r.top) / r.height * LOGIK_H
    };
  }
  api.flaeche.addEventListener("pointerdown", ev => {
    const p = zeigerXY(ev.clientX, ev.clientY);
    tippeGlas(glasUnter(p.x, p.y));
  });
  // Touch: ein Tipp = Auswahl/Umgießen (über pointerdown bereits abgedeckt).
  // „wisch" fängt nur reine Tipps auf sehr alten Touch-Stacks ohne pointer-Events
  // ab; da fehlt die genaue Position, deshalb nur die Auswahl lösen bei Wischen.
  api.wisch(richtung => {
    if (richtung !== "tipp") auswahl = -1;
  });

  // --- Zeichnen ---
  function rund(x, y, b, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, radius);
    else ctx.rect(x, y, b, h);
  }

  // Kleines Muster je Farbe in ein Segment-Rechteck zeichnen (Barrierearmut).
  function zeichneMuster(art, x, y, b, h, hell) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, b, h);
    ctx.clip();
    ctx.strokeStyle = hell;
    ctx.fillStyle = hell;
    ctx.lineWidth = 1.4;
    ctx.globalAlpha = 0.5;
    if (art === "streifen") {
      for (let i = -h; i < b; i += 7) { ctx.beginPath(); ctx.moveTo(x + i, y + h); ctx.lineTo(x + i + h, y); ctx.stroke(); }
    } else if (art === "punkte") {
      for (let yy = y + 5; yy < y + h; yy += 8) for (let xx = x + 5; xx < x + b; xx += 8) { ctx.beginPath(); ctx.arc(xx, yy, 1.4, 0, 2 * Math.PI); ctx.fill(); }
    } else if (art === "gitter") {
      for (let yy = y + 6; yy < y + h; yy += 8) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + b, yy); ctx.stroke(); }
      for (let xx = x + 6; xx < x + b; xx += 8) { ctx.beginPath(); ctx.moveTo(xx, y); ctx.lineTo(xx, y + h); ctx.stroke(); }
    } else if (art === "wellen") {
      for (let yy = y + 6; yy < y + h; yy += 8) {
        ctx.beginPath();
        for (let xx = x; xx <= x + b; xx += 4) ctx.lineTo(xx, yy + Math.sin((xx - x) / 3) * 2);
        ctx.stroke();
      }
    } else if (art === "rauten") {
      for (let yy = y + 4; yy < y + h; yy += 9) for (let xx = x + 4; xx < x + b; xx += 9) {
        ctx.beginPath(); ctx.moveTo(xx, yy - 2.5); ctx.lineTo(xx + 2.5, yy); ctx.lineTo(xx, yy + 2.5); ctx.lineTo(xx - 2.5, yy); ctx.closePath(); ctx.stroke();
      }
    } else if (art === "kreise") {
      for (let yy = y + 7; yy < y + h; yy += 9) for (let xx = x + 7; xx < x + b; xx += 9) { ctx.beginPath(); ctx.arc(xx, yy, 2.4, 0, 2 * Math.PI); ctx.stroke(); }
    } else if (art === "kreuze") {
      for (let yy = y + 6; yy < y + h; yy += 9) for (let xx = x + 6; xx < x + b; xx += 9) {
        ctx.beginPath(); ctx.moveTo(xx - 2.4, yy - 2.4); ctx.lineTo(xx + 2.4, yy + 2.4); ctx.moveTo(xx - 2.4, yy + 2.4); ctx.lineTo(xx + 2.4, yy - 2.4); ctx.stroke();
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  function zeichneGlas(i, F) {
    const g = geometrie[i];
    const glas = rohre[i];
    const istAusgewaehlt = auswahl === i;
    const innenX = g.x + 3;
    const innenB = g.b - 6;
    const segH = g.segH;
    const lippe = 6;        // Glaslippe oben
    const sockel = 8;       // Sockel unten
    const innenH = segH * KAPAZITAET;
    const innenY = g.y + lippe;

    // Segmente von unten nach oben füllen
    for (let s = 0; s < glas.length; s++) {
      const id = glas[s];
      // Oberste Schicht des AUSGEWÄHLTEN Glases leicht anheben
      const obersteAngehoben = istAusgewaehlt && s === glas.length - 1;
      const hebe = obersteAngehoben ? -7 : 0;
      const segY = innenY + innenH - (s + 1) * segH + hebe;
      ctx.fillStyle = farbeFuer(id);
      rund(innenX, segY, innenB, segH, 0);
      ctx.fill();
      // Trennlinie zwischen Segmenten
      ctx.strokeStyle = "rgba(255,255,255,0.35)";
      ctx.lineWidth = 1;
      if (s > 0) { ctx.beginPath(); ctx.moveTo(innenX, segY + segH); ctx.lineTo(innenX + innenB, segY + segH); ctx.stroke(); }
      // Muster + Buchstabe für Barrierearmut
      const fdef = FARBEN[id];
      if (fdef) {
        zeichneMuster(fdef.muster, innenX, segY, innenB, segH, "rgba(255,255,255,0.9)");
        ctx.fillStyle = "rgba(255,255,255,0.95)";
        ctx.font = "700 12px 'Source Sans 3', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(fdef.buchstabe, innenX + innenB / 2, segY + segH / 2 + 0.5);
        ctx.textBaseline = "alphabetic";
      }
    }

    // Glas-Umriss (gerundete Wände, offen oben). Auswahl hebt den Rahmen hervor.
    ctx.lineWidth = istAusgewaehlt ? 3 : 2;
    ctx.strokeStyle = istAusgewaehlt ? F.akzent : F.leise;
    const links = g.x, rechts = g.x + g.b, oben = g.y, unten = g.y + g.h - sockel;
    ctx.beginPath();
    ctx.moveTo(links, oben);
    ctx.lineTo(links, unten - 6);
    ctx.quadraticCurveTo(links, unten, links + 6, unten);
    ctx.lineTo(rechts - 6, unten);
    ctx.quadraticCurveTo(rechts, unten, rechts, unten - 6);
    ctx.lineTo(rechts, oben);
    ctx.stroke();
    // Glaslippe (kleine Verdickung oben)
    ctx.beginPath();
    ctx.moveTo(links - 2, oben);
    ctx.lineTo(rechts + 2, oben);
    ctx.stroke();

    // Auswahl-Hinweis: kleiner Pfeil über dem Glas
    if (istAusgewaehlt) {
      ctx.fillStyle = F.akzent;
      ctx.beginPath();
      const px = g.x + g.b / 2;
      ctx.moveTo(px - 6, oben - 12);
      ctx.lineTo(px + 6, oben - 12);
      ctx.lineTo(px, oben - 4);
      ctx.closePath();
      ctx.fill();
    }
  }

  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      ok: farbe("--ok", "#2c7029")
    };
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);

    // Kopfzeile auf der Fläche
    ctx.fillStyle = F.leise;
    ctx.font = "600 14px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Level " + levelNr, 10, 24);
    ctx.textAlign = "right";
    ctx.fillText("Z = zurück · R = neu", LOGIK_B - 10, 24);

    for (let i = 0; i < rohre.length; i++) zeichneGlas(i, F);

    // Statuszeile / Meldung
    if (meldung && performance.now() < meldungBis) {
      ctx.fillStyle = F.text;
      ctx.font = "600 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(meldung, LOGIK_B / 2, LOGIK_H - 12);
    } else if (gibtZug(rohre) === false && !gewonnen(rohre) && gewonnenEffekt <= 0) {
      ctx.fillStyle = F.text;
      ctx.font = "600 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Keine Züge mehr — R mischt neu, Z nimmt zurück", LOGIK_B / 2, LOGIK_H - 12);
    }

    // Gewonnen-Schimmer
    if (gewonnenEffekt > 0) {
      ctx.globalAlpha = Math.min(0.85, gewonnenEffekt);
      ctx.fillStyle = F.ok;
      ctx.font = "700 30px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Gelöst!", LOGIK_B / 2, 44);
      ctx.globalAlpha = 1;
    }
  }

  function aktualisiere(dt) {
    if (gewonnenEffekt > 0) {
      gewonnenEffekt -= dt;
      if (gewonnenEffekt <= 0) {
        gewonnenEffekt = 0;
        levelNr += 1;
        ladeLevel(false);
      }
    }
  }

  function starteRunde() {
    levelNr = 1;
    ladeLevel(false);
    api.loop(dt => { aktualisiere(dt); zeichne(); });
  }

  api.neustartCb(starteRunde);

  // Erststand: Level 1 aufbauen und einmal zeichnen (Loop startet erst per „Start").
  ladeLevel(false);
  zeichne();
}
