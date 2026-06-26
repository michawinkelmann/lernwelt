// spiel.js — „Antwort-Schnitt" (Slice-Spiel mit Kopfrechnen) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Aufgaben-Generator mit Prüffunktion, Strecke-trifft-Kachel)
// ist exportiert und in Node testbar — auf Modulebene wird weder document noch
// window noch canvas angefasst; das Canvas entsteht erst in starte().

export const LOGIK_B = 480; // logische Breite der Spielfläche
export const LOGIK_H = 360; // logische Höhe
export const SCHWERKRAFT = 520; // px/s² — zieht geworfene Kacheln zurück nach unten
export const KACHEL_R = 26;     // Radius der runden Kreide-Täfelchen (Trefferradius)

export const manifest = {
  id: "sp-antwort-schnitt",
  titel: "Antwort-Schnitt",
  kurz: "Zahlenkacheln fliegen hoch — wisch nur durch die richtigen Antworten, verschone falsche Kacheln und Bomben.",
  punkteLabel: "Punkte",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Mit gedrückter Maus oder dem Finger über die RICHTIGEN Kacheln wischen — falsche Antworten und Bomben nicht treffen."
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Kleiner, deterministischer Zufallsgenerator (mulberry32) für reproduzierbare Tests.
// Ohne Argument wird Math.random genutzt.
export function macheRng(saat) {
  if (saat === undefined || saat === null) return Math.random;
  let a = saat >>> 0;
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function ganz(rng, min, max) { return min + Math.floor(rng() * (max - min + 1)); }
function waehle(rng, liste) { return liste[Math.floor(rng() * liste.length)]; }

function istPrim(n) {
  if (n < 2) return false;
  for (let t = 2; t * t <= n; t++) if (n % t === 0) return false;
  return true;
}

// Zieht eindeutige Werte aus einem Vorrat (ohne Wiederholung), bis anzahl erreicht ist
// oder der Vorrat leer ist. Reihenfolge zufällig.
function zieheEindeutig(rng, vorrat, anzahl) {
  const kopie = vorrat.slice();
  const raus = [];
  while (raus.length < anzahl && kopie.length) {
    const i = Math.floor(rng() * kopie.length);
    raus.push(kopie.splice(i, 1)[0]);
  }
  return raus;
}

// Aufgabentypen: Funktionen liefern jeweils ein Aufgaben-Objekt mit
//   text       – Anzeigetext der Aufgabe (echtes Unicode: ×, ², …)
//   istRichtig – (wert)=>bool, prüft eine Kachelzahl
//   werteVorschlag – ()=>zahl[], garantiert ≥1 richtigen + falsche Werte (gemischt)
// stufe steuert Zahlenraum/Schwierigkeit (1 = leicht … aufsteigend).

function aufgabeEinmaleins(stufe, rng) {
  const obergrenze = stufe <= 2 ? 9 : stufe <= 4 ? 12 : 15;
  const a = ganz(rng, 2, obergrenze);
  const b = ganz(rng, 2, obergrenze);
  const loesung = a * b;
  const text = a + " × " + b + " = ?";
  function istRichtig(wert) { return wert === loesung; }
  function werteVorschlag() {
    const falsch = new Set();
    // Naheliegende Distraktoren (typische Rechenfehler) plus Streuung.
    const kandidaten = [loesung + a, loesung - a, loesung + b, loesung - b, loesung + 1, loesung - 1, (a + 1) * b, a * (b + 1)];
    for (const k of kandidaten) { if (k !== loesung && k > 0) falsch.add(k); }
    while (falsch.size < 6) {
      const w = loesung + ganz(rng, -12, 12);
      if (w !== loesung && w > 0) falsch.add(w);
    }
    const falschListe = zieheEindeutig(rng, [...falsch], ganz(rng, 3, 5));
    const richtige = 1 + (rng() < 0.25 ? 1 : 0); // gelegentlich zweimal die richtige Zahl
    const werte = [];
    for (let i = 0; i < richtige; i++) werte.push(loesung);
    werte.push(...falschListe);
    return mischeArray(werte, rng);
  }
  return { text: text, istRichtig: istRichtig, werteVorschlag: werteVorschlag };
}

function aufgabeZielzahl(stufe, rng) {
  const ziel = stufe <= 2 ? ganz(rng, 8, 15) : stufe <= 4 ? ganz(rng, 12, 25) : ganz(rng, 18, 40);
  const text = "Triff alle, die = " + ziel + " ergeben";
  function istRichtig(wert) { return wert === ziel; }
  function werteVorschlag() {
    const wieVieleRichtig = ganz(rng, 1, 3);
    const werte = [];
    for (let i = 0; i < wieVieleRichtig; i++) werte.push(ziel);
    const falsch = new Set();
    while (falsch.size < 6) {
      let w = ziel + ganz(rng, -9, 9);
      if (w === ziel) w = ziel + (rng() < 0.5 ? 2 : -2);
      if (w > 0) falsch.add(w);
    }
    werte.push(...zieheEindeutig(rng, [...falsch], ganz(rng, 3, 5)));
    return mischeArray(werte, rng);
  }
  return { text: text, istRichtig: istRichtig, werteVorschlag: werteVorschlag };
}

function aufgabeVielfache(stufe, rng) {
  const n = waehle(rng, stufe <= 2 ? [2, 3, 4, 5] : stufe <= 4 ? [3, 4, 6, 7, 8] : [6, 7, 8, 9, 12]);
  const text = "Vielfache von " + n;
  function istRichtig(wert) { return Number.isInteger(wert) && wert > 0 && wert % n === 0; }
  function werteVorschlag() {
    const maxFaktor = stufe <= 2 ? 9 : 12;
    const richtigeVorrat = [];
    for (let k = 1; k <= maxFaktor; k++) richtigeVorrat.push(n * k);
    const werte = zieheEindeutig(rng, richtigeVorrat, ganz(rng, 2, 4));
    const falsch = new Set();
    const obergrenze = n * maxFaktor;
    while (falsch.size < 6) {
      const w = ganz(rng, 2, obergrenze);
      if (w % n !== 0) falsch.add(w);
    }
    werte.push(...zieheEindeutig(rng, [...falsch], ganz(rng, 3, 4)));
    return mischeArray(werte, rng);
  }
  return { text: text, istRichtig: istRichtig, werteVorschlag: werteVorschlag };
}

function aufgabeGeradeUngerade(stufe, rng) {
  const geradeGesucht = rng() < 0.5;
  const text = geradeGesucht ? "Triff alle GERADEN Zahlen" : "Triff alle UNGERADEN Zahlen";
  function istRichtig(wert) { return Number.isInteger(wert) && (wert % 2 === 0) === geradeGesucht; }
  function werteVorschlag() {
    const obergrenze = stufe <= 2 ? 30 : stufe <= 4 ? 60 : 99;
    const werte = [];
    const wieVieleRichtig = ganz(rng, 2, 4);
    const gesehen = new Set();
    let schutz = 0;
    while (werte.length < wieVieleRichtig && schutz++ < 200) {
      const w = ganz(rng, 1, obergrenze);
      if ((w % 2 === 0) === geradeGesucht && !gesehen.has(w)) { gesehen.add(w); werte.push(w); }
    }
    const falschAnzahl = ganz(rng, 3, 5);
    schutz = 0;
    let falsch = 0;
    while (falsch < falschAnzahl && schutz++ < 400) {
      const w = ganz(rng, 1, obergrenze);
      if ((w % 2 === 0) !== geradeGesucht && !gesehen.has(w)) { gesehen.add(w); werte.push(w); falsch++; }
    }
    return mischeArray(werte, rng);
  }
  return { text: text, istRichtig: istRichtig, werteVorschlag: werteVorschlag };
}

function aufgabePrimzahlen(stufe, rng) {
  const text = "Triff alle PRIMZAHLEN";
  function istRichtig(wert) { return istPrim(wert); }
  function werteVorschlag() {
    const obergrenze = stufe <= 2 ? 30 : stufe <= 4 ? 50 : 99;
    const primVorrat = [];
    for (let n = 2; n <= obergrenze; n++) if (istPrim(n)) primVorrat.push(n);
    const werte = zieheEindeutig(rng, primVorrat, ganz(rng, 2, 4));
    const gesehen = new Set(werte);
    const falschAnzahl = ganz(rng, 3, 5);
    let falsch = 0, schutz = 0;
    while (falsch < falschAnzahl && schutz++ < 400) {
      const w = ganz(rng, 4, obergrenze);
      if (!istPrim(w) && !gesehen.has(w)) { gesehen.add(w); werte.push(w); falsch++; }
    }
    return mischeArray(werte, rng);
  }
  return { text: text, istRichtig: istRichtig, werteVorschlag: werteVorschlag };
}

const AUFGABEN_BAUER = [
  aufgabeEinmaleins,
  aufgabeZielzahl,
  aufgabeVielfache,
  aufgabeGeradeUngerade,
  aufgabePrimzahlen
];

// Liefert genau EINE Aufgabe für die gegebene Stufe (1…). rng optional (Tests).
// Rückgabe: { text, istRichtig:(wert)=>bool, werteVorschlag:()=>zahl[] }.
export function macheAufgabe(stufe, rng) {
  const r = (typeof rng === "function") ? rng : macheRng(rng);
  const s = Math.max(1, Math.floor(stufe || 1));
  // Primzahlen/Gerade-Ungerade erst ab Stufe 2 in den Pool nehmen (für ganz Junge erstmal Rechnen).
  const pool = s <= 1 ? [aufgabeEinmaleins, aufgabeZielzahl, aufgabeVielfache] : AUFGABEN_BAUER;
  const bauer = waehle(r, pool);
  return bauer(s, r);
}

// Mischt ein Array in place-frei (Fisher–Yates) mit gegebenem rng und gibt es zurück.
export function mischeArray(arr, rng) {
  const r = (typeof rng === "function") ? rng : macheRng(rng);
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// Quadrat des kürzesten Abstands von Punkt p zur Strecke a→b.
export function abstandQuadratPunktStrecke(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const laengeQ = dx * dx + dy * dy;
  if (laengeQ === 0) {
    const ex = p.x - a.x, ey = p.y - a.y;
    return ex * ex + ey * ey;
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / laengeQ;
  t = Math.max(0, Math.min(1, t));
  const fx = a.x + t * dx, fy = a.y + t * dy;
  const ex = p.x - fx, ey = p.y - fy;
  return ex * ex + ey * ey;
}

// Schneidet das Klingen-Segment p1→p2 die Kachel? Kachel = { x, y, r } (Mittelpunkt
// + Trefferradius). Treffer, wenn der kürzeste Abstand des Mittelpunkts zur Strecke
// ≤ r ist (Kreis-gegen-Strecke). Reine Geometrie, kein DOM.
export function streckeSchneidetKachel(p1, p2, kachel) {
  const r = (kachel.r !== undefined) ? kachel.r : KACHEL_R;
  const distQ = abstandQuadratPunktStrecke({ x: kachel.x, y: kachel.y }, p1, p2);
  return distQ <= r * r;
}

// Combo-Bonus: der n-te in EINEM Wisch geschnittene richtige Treffer.
// 1. Treffer = Grundpunkte, danach wächst der Bonus (10, 12, 14, …).
export function comboPunkte(grund, indexImWisch) {
  if (indexImWisch <= 0) return grund;
  return grund + (10 + 2 * (indexImWisch - 1));
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOGIK_B * faktor);
  canvas.height = Math.round(LOGIK_H * faktor);
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:72vh;height:auto;margin:0 auto;border-radius:inherit;touch-action:none;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // Kopfzeile: Leben + aktuelle Aufgabe
  let lebenEl = api.kopf.querySelector("#as-leben");
  if (!lebenEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Leben: <b id="as-leben">3</b>';
    api.kopf.appendChild(span);
    lebenEl = span.querySelector("b");
  }
  let aufgabeEl = api.kopf.querySelector("#as-aufgabe");
  if (!aufgabeEl) {
    const span = document.createElement("span");
    span.className = "as-aufgabe-kopf";
    span.innerHTML = 'Aufgabe: <b id="as-aufgabe">–</b>';
    api.kopf.appendChild(span);
    aufgabeEl = span.querySelector("b");
  }

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function klemme(wert, min, max) { return Math.max(min, Math.min(max, wert)); }

  // --- Zustand ---
  let kacheln = [];        // fliegende Kreide-Täfelchen
  let punkte = 0;
  let leben = 3;
  let aufgabe = null;      // aktuelle Aufgabe (aus macheAufgabe)
  let aufgabenZaehler = 0; // wie viele Aufgaben insgesamt gestellt
  let trefferSeitWechsel = 0; // richtige Treffer seit letztem Aufgabenwechsel
  let wechselTimer = 0;    // Sekunden bis zum nächsten Aufgabenwechsel
  let spawnTimer = 0;      // Sekunden bis zur nächsten Wurf-Welle
  let spielzeit = 0;       // verstrichene Spielzeit in Sekunden (für Schwierigkeit)
  let laeuftRunde = false;
  let laengsteCombo = 0;

  // Klinge / Wischspur
  let zeigtKlinge = false;
  let klingenPunkte = [];  // { x, y, t } — verblassende Spur
  let letzterPunkt = null; // letzte Zeigerposition (für Segment)
  let comboImWisch = 0;    // richtige Treffer im aktuellen Wisch

  let effekte = [];        // Aufploppende Punktezahlen / „X" bei Fehlern

  function aktuelleStufe() {
    // steigt mit der Zahl gestellter Aufgaben (alle ~3 Aufgaben eine Stufe höher).
    return 1 + Math.floor(aufgabenZaehler / 3);
  }
  function maxKacheln() {
    return Math.min(7, 3 + Math.floor(spielzeit / 22)); // mehr Kacheln mit der Zeit
  }
  function spawnPause() {
    return Math.max(0.9, 2.0 - spielzeit / 60); // schnellere Wellen mit der Zeit
  }
  function tempoFaktor() {
    return 1 + Math.min(0.5, spielzeit / 120); // etwas höhere Wurfgeschwindigkeit später
  }

  function neueAufgabe() {
    aufgabe = macheAufgabe(aktuelleStufe());
    aufgabenZaehler += 1;
    trefferSeitWechsel = 0;
    wechselTimer = 8 + Math.random() * 4; // alle 8–12 s, oder früher nach genug Treffern
    aufgabeEl.textContent = aufgabe.text;
  }

  function setzeAusgangslage() {
    kacheln = [];
    effekte = [];
    klingenPunkte = [];
    letzterPunkt = null;
    zeigtKlinge = false;
    comboImWisch = 0;
    punkte = 0;
    leben = 3;
    aufgabenZaehler = 0;
    trefferSeitWechsel = 0;
    spielzeit = 0;
    spawnTimer = 0.4;
    laengsteCombo = 0;
    neueAufgabe();
    api.setzePunkte(0);
    lebenEl.textContent = "3";
  }

  function starteRunde() {
    setzeAusgangslage();
    laeuftRunde = true;
    api.loop(function (dt) { aktualisiere(dt); zeichne(); });
  }

  // Wirft eine Welle Kacheln von unten nach oben. Garantiert ≥1 richtige Kachel,
  // gelegentlich eine Bombe.
  function wirfWelle() {
    const werte = aufgabe.werteVorschlag();
    // Auf maximale Kachelzahl begrenzen, dabei mindestens eine richtige behalten.
    let liste = werte.slice();
    const grenze = maxKacheln();
    if (liste.length > grenze) {
      const idxRichtig = liste.findIndex(function (w) { return aufgabe.istRichtig(w); });
      const behalten = [];
      if (idxRichtig >= 0) behalten.push(liste[idxRichtig]);
      for (let i = 0; i < liste.length && behalten.length < grenze; i++) {
        if (i !== idxRichtig) behalten.push(liste[i]);
      }
      liste = mischeArray(behalten, Math.random);
    }
    // Sicherstellen: mind. 1 richtige Kachel in der Welle.
    if (!liste.some(function (w) { return aufgabe.istRichtig(w); })) {
      const ersatz = aufgabe.werteVorschlag().find(function (w) { return aufgabe.istRichtig(w); });
      if (ersatz !== undefined) { liste[Math.floor(Math.random() * liste.length)] = ersatz; }
    }

    const n = liste.length;
    const abstand = LOGIK_B / (n + 1);
    const tf = tempoFaktor();
    for (let i = 0; i < n; i++) {
      const wert = liste[i];
      const startX = klemme(abstand * (i + 1) + (Math.random() - 0.5) * 30, KACHEL_R + 4, LOGIK_B - KACHEL_R - 4);
      // Wurf nach oben: Höhe so, dass die Parabel ~oberes Drittel erreicht.
      const vy = -(330 + Math.random() * 90) * tf;
      const vx = (startX < LOGIK_B / 2 ? 1 : -1) * Math.random() * 45;
      kacheln.push({
        x: startX, y: LOGIK_H + KACHEL_R,
        vx: vx, vy: vy,
        wert: wert,
        bombe: false,
        richtig: aufgabe.istRichtig(wert),
        geschnitten: false,
        schnittWar: null,   // "ok" | "fehler" — Farbe nach dem Schnitt
        winkel: (Math.random() - 0.5) * 0.5,
        dreh: (Math.random() - 0.5) * 1.4,
        t: 0
      });
    }
    // Gelegentlich eine Bombe mit hineinwerfen (häufiger mit der Zeit).
    const bombenChance = Math.min(0.55, 0.2 + spielzeit / 130);
    if (Math.random() < bombenChance) {
      const startX = klemme(ganz(Math.random, 0, 1) ? LOGIK_B * (0.2 + Math.random() * 0.6) : LOGIK_B / 2, KACHEL_R + 4, LOGIK_B - KACHEL_R - 4);
      kacheln.push({
        x: startX, y: LOGIK_H + KACHEL_R,
        vx: (Math.random() - 0.5) * 60,
        vy: -(330 + Math.random() * 90) * tf,
        wert: null, bombe: true, richtig: false,
        geschnitten: false, schnittWar: null,
        winkel: (Math.random() - 0.5) * 0.5, dreh: (Math.random() - 0.5) * 1.6, t: 0
      });
    }
  }

  function aktualisiere(dt) {
    if (!laeuftRunde) return;
    spielzeit += dt;
    wechselTimer -= dt;
    spawnTimer -= dt;

    // Aufgabenwechsel: nach Zeitablauf oder genügend Treffern.
    if (wechselTimer <= 0 || trefferSeitWechsel >= 6) neueAufgabe();

    if (spawnTimer <= 0) { wirfWelle(); spawnTimer = spawnPause(); }

    // Kacheln fliegen (Wurfparabel) und drehen sich.
    for (let i = kacheln.length - 1; i >= 0; i--) {
      const k = kacheln[i];
      k.vy += SCHWERKRAFT * dt;
      k.x += k.vx * dt;
      k.y += k.vy * dt;
      k.winkel += k.dreh * dt;
      k.t += dt;
      // Unten herausgefallen → entfernen (kein Lebensverlust beim Verpassen).
      if (k.y - KACHEL_R > LOGIK_H + 6 && k.vy > 0) kacheln.splice(i, 1);
    }
    if (kacheln.length > 14) kacheln = kacheln.slice(-14);

    // Klingen-Spur verblassen lassen.
    for (const p of klingenPunkte) p.t -= dt;
    klingenPunkte = klingenPunkte.filter(function (p) { return p.t > 0; });

    for (const e of effekte) { e.t -= dt; e.y -= 28 * dt; }
    effekte = effekte.filter(function (e) { return e.t > 0; });
  }

  // Verarbeitet ein Klingen-Segment (von → nach): prüft alle Kacheln auf Schnitt.
  function schneideSegment(von, nach) {
    for (const k of kacheln) {
      if (k.geschnitten) continue;
      if (!streckeSchneidetKachel(von, nach, { x: k.x, y: k.y, r: KACHEL_R })) continue;
      k.geschnitten = true;
      if (k.bombe) {
        k.schnittWar = "fehler";
        verliereLeben();
        bombenEffekt(k);
        zeigeText("☠", k.x, k.y, "fehler");
      } else if (k.richtig) {
        k.schnittWar = "ok";
        const pkt = comboPunkte(10, comboImWisch);
        punkte += pkt;
        comboImWisch += 1;
        if (comboImWisch > laengsteCombo) laengsteCombo = comboImWisch;
        trefferSeitWechsel += 1;
        api.setzePunkte(punkte);
        zeigeText("+" + pkt, k.x, k.y, "ok");
        funkenEffekt(k, true);
      } else {
        k.schnittWar = "fehler";
        verliereLeben();
        zeigeText("✗", k.x, k.y, "fehler");
        funkenEffekt(k, false);
      }
    }
  }

  function verliereLeben() {
    leben -= 1;
    lebenEl.textContent = String(Math.max(0, leben));
    if (leben <= 0 && laeuftRunde) {
      laeuftRunde = false;
      zeichne();
      const info = "<p>Aufgaben geschafft: " + aufgabenZaehler + " · längste Combo: " + laengsteCombo + "</p>";
      api.vorbei(punkte, info);
    }
  }

  function zeigeText(text, x, y, art) {
    if (api.reduzierteBewegung) return;
    effekte.push({ text: text, x: x, y: y, art: art, t: 0.8 });
    if (effekte.length > 60) effekte = effekte.slice(-60);
  }
  function funkenEffekt(k, gut) {
    if (api.reduzierteBewegung) return;
    for (let i = 0; i < 8; i++) {
      effekte.push({
        art: gut ? "funke-ok" : "funke-fehler",
        x: k.x, y: k.y,
        vx: (Math.random() - 0.5) * 180, vy: (Math.random() - 0.5) * 180,
        t: 0.35
      });
    }
    if (effekte.length > 80) effekte = effekte.slice(-80);
  }
  function bombenEffekt(k) {
    if (api.reduzierteBewegung) return;
    for (let i = 0; i < 14; i++) {
      effekte.push({
        art: "funke-fehler",
        x: k.x, y: k.y,
        vx: (Math.random() - 0.5) * 260, vy: (Math.random() - 0.5) * 260,
        t: 0.45
      });
    }
    if (effekte.length > 90) effekte = effekte.slice(-90);
  }

  // --- Eingaben (Zeiger = Klinge). getBoundingClientRect NUR hier in Handlern. ---
  function zeigerPunkt(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (clientX - r.left) / r.width * LOGIK_B,
      y: (clientY - r.top) / r.height * LOGIK_H
    };
  }

  function starteWisch(p) {
    zeigtKlinge = true;
    comboImWisch = 0;
    letzterPunkt = p;
    klingenPunkte = [{ x: p.x, y: p.y, t: 0.25 }];
  }
  function bewegeWisch(p) {
    if (!zeigtKlinge || !letzterPunkt) return;
    schneideSegment(letzterPunkt, p);
    klingenPunkte.push({ x: p.x, y: p.y, t: 0.25 });
    if (klingenPunkte.length > 24) klingenPunkte = klingenPunkte.slice(-24);
    letzterPunkt = p;
  }
  function endeWisch() {
    zeigtKlinge = false;
    letzterPunkt = null;
    comboImWisch = 0;
  }

  api.flaeche.addEventListener("pointerdown", function (ev) {
    if (!laeuftRunde) return;
    ev.preventDefault();
    if (canvas.setPointerCapture && ev.pointerId !== undefined) {
      try { canvas.setPointerCapture(ev.pointerId); } catch (_f) { /* egal */ }
    }
    starteWisch(zeigerPunkt(ev.clientX, ev.clientY));
  });
  api.flaeche.addEventListener("pointermove", function (ev) {
    if (!zeigtKlinge) return;
    ev.preventDefault();
    bewegeWisch(zeigerPunkt(ev.clientX, ev.clientY));
  });
  api.flaeche.addEventListener("pointerup", function () { endeWisch(); });
  api.flaeche.addEventListener("pointercancel", function () { endeWisch(); });
  api.flaeche.addEventListener("pointerleave", function () { endeWisch(); });

  // --- Zeichnen ---
  function rund(x, y, b, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, radius);
    else ctx.rect(x, y, b, h);
    ctx.fill();
  }

  function zeichneKachel(k, F) {
    ctx.save();
    ctx.translate(k.x, k.y);
    ctx.rotate(k.winkel);
    const halb = KACHEL_R;
    // Täfelchen-Korpus: nach dem Schnitt grün (richtig) bzw. rot (falsch).
    let korpus = F.tafel;
    let rand = F.linie;
    if (k.bombe) { korpus = F.text; rand = F.fehler; }
    else if (k.geschnitten && k.schnittWar === "ok") { korpus = F.ok; }
    else if (k.geschnitten && k.schnittWar === "fehler") { korpus = F.fehler; }
    ctx.fillStyle = korpus;
    rund(-halb, -halb * 0.82, halb * 2, halb * 1.64, 8);
    ctx.lineWidth = 2;
    ctx.strokeStyle = rand;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-halb, -halb * 0.82, halb * 2, halb * 1.64, 8);
    else ctx.rect(-halb, -halb * 0.82, halb * 2, halb * 1.64);
    ctx.stroke();

    if (k.bombe) {
      ctx.fillStyle = F.fehler;
      ctx.font = "700 26px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("☠", 0, 1);
    } else {
      const dunkel = (k.geschnitten && k.schnittWar);
      ctx.fillStyle = dunkel ? "#ffffff" : F.text;
      ctx.font = "700 22px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(String(k.wert), 0, 1);
    }
    ctx.restore();
  }

  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      fehler: farbe("--fehler", "#b3261e"),
      physik: farbe("--physik", "#a3570e"),
      ok: farbe("--ok", "#2c7029"),
      linie: farbe("--linie", "#ddd5c4"),
      tafel: farbe("--flaeche", "#fffdf6")
    };
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);

    // Kopfbanner mit der Aufgabe (auch auf der Fläche, gut sichtbar).
    ctx.fillStyle = F.akzent;
    ctx.globalAlpha = 0.12;
    ctx.fillRect(0, 0, LOGIK_B, 34);
    ctx.globalAlpha = 1;
    ctx.fillStyle = F.akzent;
    ctx.font = "700 17px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(aufgabe ? aufgabe.text : "", LOGIK_B / 2, 18);
    ctx.textBaseline = "alphabetic";

    for (const k of kacheln) zeichneKachel(k, F);

    // Klingen-Spur: heller, verblassender Strich.
    if (klingenPunkte.length > 1) {
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      for (let i = 1; i < klingenPunkte.length; i++) {
        const a = klingenPunkte[i - 1], b = klingenPunkte[i];
        const alpha = Math.max(0, Math.min(1, b.t / 0.25));
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = F.akzent;
        ctx.lineWidth = 2 + 5 * alpha;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Effekte: Funken + aufsteigende Punktezahlen.
    for (const e of effekte) {
      if (e.art === "funke-ok" || e.art === "funke-fehler") {
        ctx.globalAlpha = Math.max(0, e.t / 0.4);
        ctx.fillStyle = e.art === "funke-ok" ? F.ok : F.fehler;
        const ex = e.x + (e.vx || 0) * (0.4 - e.t);
        const ey = e.y + (e.vy || 0) * (0.4 - e.t);
        ctx.fillRect(ex - 2, ey - 2, 4, 4);
      } else {
        ctx.globalAlpha = Math.max(0, e.t / 0.8);
        ctx.fillStyle = e.art === "ok" ? F.ok : F.fehler;
        ctx.font = "700 18px 'Source Sans 3', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.text, e.x, e.y);
      }
    }
    ctx.globalAlpha = 1;
  }

  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(20,18,14,0.55)";
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 28px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(haupt, LOGIK_B / 2, LOGIK_H / 2 - 12);
    if (unter) {
      ctx.font = "400 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(unter, LOGIK_B / 2, LOGIK_H / 2 + 16);
    }
    ctx.textBaseline = "alphabetic";
  }

  api.neustartCb(starteRunde);

  setzeAusgangslage();
  zeichne();
  hinweis("Antwort-Schnitt", "Drück auf „Start“!");
}
