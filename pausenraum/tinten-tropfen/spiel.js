// spiel.js — „Tinten-Tropfen" (Zeichne-eine-Linie-Physik, Marke Happy Glass) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Physik (Punkt auf Strecke, Kreis-Strecke-Kollision, Gleiten) ist exportiert
// und in Node testbar — auf Modulebene wird weder document noch window angefasst, das
// Canvas entsteht erst in starte().
//
// Koordinatensystem (Welt): logische Fläche LOGIK_B × LOGIK_H. Ursprung oben links,
// x wächst nach RECHTS, y wächst nach UNTEN (Bildschirmkonvention). Der Tropfen fällt
// also = y wird größer.

export const LOGIK_B = 480; // logische Breite der Tafel-Szene
export const LOGIK_H = 360; // logische Höhe

export const G = 620;          // Gravitation in Welt-Einheiten/s²
export const TROPFEN_R = 9;    // Radius des Tintentropfens
export const REIBUNG = 0.012;  // Gleitreibung beim Rollen über Strecken (pro Kontakt)
export const RESTITUTION = 0.18; // „Härte" des Abpralls längs der Normalen (0..1)
export const RASTER_LEN = 7;   // Mindest-Segmentlänge beim Zeichnen (geglättet/gerastert)
export const RUHE_TEMPO = 16;  // |v| darunter über RUHE_ZEIT gilt als „liegt still" (px/s)
export const RUHE_ZEIT = 1.1;  // Sekunden in Ruhe bis „nochmal zeichnen"
export const MAX_VERSUCHE = 3; // Fehlversuche je Level, dann darf man überspringen

export const manifest = {
  id: "sp-tinten-tropfen",
  titel: "Tinten-Tropfen",
  kurz: "Zeichne mit Kreide eine Rampe und lass den Tintentropfen ins Tintenfass rollen — weniger Kreide gibt mehr Punkte.",
  punkteLabel: "Punkte",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Mit Maus oder Finger eine Kreide-Rampe zeichnen, dann Leertaste oder Tipp lässt den Tropfen los. Weniger Kreide = mehr Punkte."
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar) — keine DOM-Zugriffe.
// ---------------------------------------------------------------------------

// Punkt auf der Strecke a–b mit kleinstem Abstand zu p. Der Parameter t wird auf
// [0,1] geklemmt, sodass an den Enden der jeweilige Endpunkt zurückkommt.
export function naechsterPunktAufStrecke(p, a, b) {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const laenge2 = abx * abx + aby * aby;
  if (laenge2 <= 1e-12) return { x: a.x, y: a.y, t: 0 }; // entartete Strecke = Punkt
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / laenge2;
  t = Math.max(0, Math.min(1, t));
  return { x: a.x + t * abx, y: a.y + t * aby, t };
}

// Kollision Kreis ↔ Strecke. Liefert null (keine Berührung) oder
// { normal:{x,y}, tiefe } mit Einheits-Normale (zeigt vom Segment zum Kreismittelpunkt)
// und Eindringtiefe = r − Abstand (> 0 bei Überlappung).
export function kreisStreckeKollision(kreis, a, b) {
  const fuss = naechsterPunktAufStrecke({ x: kreis.x, y: kreis.y }, a, b);
  let nx = kreis.x - fuss.x;
  let ny = kreis.y - fuss.y;
  let abstand = Math.hypot(nx, ny);
  if (abstand > kreis.r) return null;
  if (abstand > 1e-9) {
    nx /= abstand; ny /= abstand;            // Normale = Richtung Fußpunkt → Mittelpunkt
  } else {
    // Mittelpunkt liegt genau auf der Strecke: Normale senkrecht zur Strecke wählen.
    const dx = b.x - a.x, dy = b.y - a.y;
    const l = Math.hypot(dx, dy) || 1;
    nx = -dy / l; ny = dx / l;
    abstand = 0;
  }
  return { normal: { x: nx, y: ny }, tiefe: kreis.r - abstand, fuss };
}

// Geschwindigkeit nach einem Kontakt: Tangentialanteil bleibt (mit etwas Reibung
// gedämpft), Normalanteil wird zurückgeworfen (mit Restitution). reibung 0 = volles
// Gleiten, 1 = sofort gestoppt entlang der Strecke; restitution 0 = kein Abprall.
export function gleiteGeschwindigkeit(v, normal, reibung = REIBUNG, restitution = RESTITUTION) {
  const vn = v.x * normal.x + v.y * normal.y;       // Normalkomponente (Skalar)
  const tx = v.x - vn * normal.x;                   // Tangentialanteil
  const ty = v.y - vn * normal.y;
  // Bewegt sich der Körper IN die Fläche hinein (vn < 0), kehren wir diesen Anteil um.
  const vnNeu = vn < 0 ? -vn * restitution : vn;
  const halt = Math.max(0, 1 - reibung);
  return {
    x: tx * halt + vnNeu * normal.x,
    y: ty * halt + vnNeu * normal.y
  };
}

// Punkt-in-Rechteck (Zielzone Tintenfass).
export function inRechteck(p, r) {
  return p.x >= r.x && p.x <= r.x + r.b && p.y >= r.y && p.y <= r.y + r.h;
}

// Gesamtlänge einer Polyline (Liste von {x,y}); Summe der Segmentlängen.
export function polylineLaenge(punkte) {
  let s = 0;
  for (let i = 1; i < punkte.length; i++) {
    s += Math.hypot(punkte[i].x - punkte[i - 1].x, punkte[i].y - punkte[i - 1].y);
  }
  return s;
}

// Gesamtlänge aller Striche (Array von Polylines).
export function verbrauchteKreide(striche) {
  let s = 0;
  for (const strich of striche) s += polylineLaenge(strich);
  return s;
}

// Punktzahl für ein geschafftes Level: Basis + Bonus für gesparte Kreide + Zügig-Bonus.
// rest = Restbudget-Anteil (0..1), zeitBonus 0..1 (1 = sehr schnell). Ganzzahlig.
export function levelPunkte(rest, zeitBonus) {
  const r = Math.max(0, Math.min(1, rest));
  const z = Math.max(0, Math.min(1, zeitBonus));
  return Math.round(100 + 150 * r + 60 * z);
}

// Fünf Levels (steigend). Jedes Level: Startpunkt des Tropfens, Kreide-Budget (Welt-
// Einheiten Gesamtlänge), Zielzone (Tintenfass) und statische Hindernisse als
// Strecken {a,b}. Koordinaten in der Welt LOGIK_B × LOGIK_H.
// Linke und rechte Wand werden in starte() zusätzlich als Begrenzung gezogen.
export const LEVELS = [
  { // 1 — kleine Lücke: Tropfen muss eine waagerechte Brücke über den Spalt finden.
    name: "Erste Tropfen",
    start: { x: 80, y: 40 },
    budget: 320,
    ziel: { x: 360, y: 296, b: 70, h: 48 },
    hindernisse: [
      { a: { x: 30, y: 230 }, b: { x: 170, y: 230 } },   // linke Plattform
      { a: { x: 340, y: 296 }, b: { x: 340, y: 250 } },  // linke Fasswand
      { a: { x: 430, y: 296 }, b: { x: 430, y: 250 } }    // rechte Fasswand
    ]
  },
  { // 2 — zwei Plattformen mit Lücke dazwischen: Rampe muss überbrücken.
    name: "Über den Spalt",
    start: { x: 60, y: 40 },
    budget: 300,
    ziel: { x: 388, y: 300, b: 64, h: 44 },
    hindernisse: [
      { a: { x: 30, y: 160 }, b: { x: 150, y: 175 } },   // schräge Startplattform
      { a: { x: 250, y: 250 }, b: { x: 360, y: 250 } },  // mittlere Plattform
      { a: { x: 368, y: 300 }, b: { x: 368, y: 256 } },  // linke Fasswand
      { a: { x: 452, y: 300 }, b: { x: 452, y: 256 } }    // rechte Fasswand
    ]
  },
  { // 3 — ein Pfeiler, um den man herumlenken muss.
    name: "Um die Säule",
    start: { x: 90, y: 40 },
    budget: 290,
    ziel: { x: 40, y: 300, b: 64, h: 44 },
    hindernisse: [
      { a: { x: 200, y: 90 }, b: { x: 200, y: 250 } },   // hoher Pfeiler in der Mitte
      { a: { x: 160, y: 250 }, b: { x: 260, y: 250 } },  // Sockel des Pfeilers
      { a: { x: 36, y: 300 }, b: { x: 36, y: 256 } },    // linke Fasswand
      { a: { x: 104, y: 300 }, b: { x: 104, y: 256 } }   // rechte Fasswand
    ]
  },
  { // 4 — schiefe Ebene: vorhandene Rutsche, die das Ziel knapp verfehlt; ergänzen!
    name: "Die schiefe Ebene",
    start: { x: 50, y: 40 },
    budget: 250,
    ziel: { x: 392, y: 250, b: 60, h: 40 },
    hindernisse: [
      { a: { x: 30, y: 110 }, b: { x: 300, y: 235 } },   // lange schiefe Rutsche
      { a: { x: 372, y: 250 }, b: { x: 372, y: 212 } },  // linke Fasswand (erhöht)
      { a: { x: 452, y: 250 }, b: { x: 452, y: 212 } }    // rechte Fasswand
    ]
  },
  { // 5 — Trichter + Hindernis: zickzack ins tiefe Fass.
    name: "Durch den Trichter",
    start: { x: 240, y: 40 },
    budget: 300,
    ziel: { x: 210, y: 312, b: 60, h: 36 },
    hindernisse: [
      { a: { x: 60, y: 120 }, b: { x: 210, y: 200 } },   // linker Trichterarm
      { a: { x: 420, y: 120 }, b: { x: 270, y: 200 } },  // rechter Trichterarm
      { a: { x: 150, y: 270 }, b: { x: 210, y: 270 } },  // kleines Hindernis vor dem Fass
      { a: { x: 192, y: 312 }, b: { x: 192, y: 276 } },  // linke Fasswand
      { a: { x: 278, y: 312 }, b: { x: 278, y: 276 } }   // rechte Fasswand
    ]
  }
];

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen.
// ---------------------------------------------------------------------------

export function starte(api) {
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOGIK_B * faktor);
  canvas.height = Math.round(LOGIK_H * faktor);
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:72vh;height:auto;margin:0 auto;border-radius:inherit;touch-action:none;cursor:crosshair;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // Kopfzeile: Level + Restbudget („Kreide").
  let kopfEl = api.kopf.querySelector("#tt-kopf");
  if (!kopfEl) {
    const span = document.createElement("span");
    span.id = "tt-kopf";
    span.innerHTML = 'Level <b id="tt-level">1</b> · Kreide <b id="tt-kreide">100&nbsp;%</b>';
    api.kopf.appendChild(span);
    kopfEl = span;
  }
  const levelEl = kopfEl.querySelector("#tt-level");
  const kreideEl = kopfEl.querySelector("#tt-kreide");

  // Zustand
  let levelNr = 0;            // 0-basiert in LEVELS
  const tropfen = { x: 0, y: 0, r: TROPFEN_R, vx: 0, vy: 0 };
  let striche = [];          // fertige Striche (je eine Polyline)
  let aktuellerStrich = null; // gerade gezeichneter Strich
  let segmente = [];         // alle Strecken (Striche + Level-Hindernisse + Ränder) zum Kollidieren
  let hindernisse = [];      // nur Level-Hindernisse + Ränder
  let ziel = null;
  let budget = 0;
  let laeuft = false;        // Tropfen fliegt
  let punkte = 0;
  let versuche = 0;          // Fehlversuche im aktuellen Level
  let ruheZeit = 0;          // wie lange der Tropfen schon (fast) still liegt
  let levelStartZeit = 0;    // performance.now() bei Levelbeginn
  let geschafft = false;     // ganze Runde vorbei?
  let meldung = "";          // kurzer Hinweistext am unteren Rand
  let meldungT = 0;          // Restzeit der Meldung
  let spritzer = [];         // Tintenspritzer-Effekte beim Erreichen des Ziels
  let pauseBis = 0;          // Zeitpunkt, ab dem das nächste Level lädt
  let warteAufNaechstes = false;

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function klemme(wert, min, max) { return Math.max(min, Math.min(max, wert)); }
  function jetztMs() { return (typeof performance !== "undefined" && performance.now) ? performance.now() : Date.now(); }

  // Statische Begrenzungen: linke/rechte Wand. Kein Boden — fällt der Tropfen unten
  // heraus, ist der Versuch verloren.
  function raender() {
    return [
      { a: { x: 0, y: 0 }, b: { x: 0, y: LOGIK_H } },              // linke Wand
      { a: { x: LOGIK_B, y: 0 }, b: { x: LOGIK_B, y: LOGIK_H } }   // rechte Wand
    ];
  }

  function ladeLevel(nr) {
    const lvl = LEVELS[nr];
    levelNr = nr;
    hindernisse = lvl.hindernisse.concat(raender());
    ziel = lvl.ziel;
    budget = lvl.budget;
    striche = [];
    aktuellerStrich = null;
    versuche = 0;
    bauSegmente();
    setzeTropfenZurueck();
    levelStartZeit = jetztMs();
    laeuft = false;
    geschafft = false;
    levelEl.textContent = String(nr + 1);
    aktualisiereKreide();
  }

  function setzeTropfenZurueck() {
    const lvl = LEVELS[levelNr];
    tropfen.x = lvl.start.x;
    tropfen.y = lvl.start.y;
    tropfen.vx = 0;
    tropfen.vy = 0;
    ruheZeit = 0;
  }

  // Alle Strecken zum Kollidieren: Level-Hindernisse + Ränder + gezeichnete Striche.
  function bauSegmente() {
    segmente = hindernisse.slice();
    for (const strich of striche) {
      for (let i = 1; i < strich.length; i++) {
        segmente.push({ a: strich[i - 1], b: strich[i] });
      }
    }
    if (aktuellerStrich) {
      for (let i = 1; i < aktuellerStrich.length; i++) {
        segmente.push({ a: aktuellerStrich[i - 1], b: aktuellerStrich[i] });
      }
    }
  }

  function restBudget() {
    return Math.max(0, budget - verbrauchteKreide(striche) - (aktuellerStrich ? polylineLaenge(aktuellerStrich) : 0));
  }
  function aktualisiereKreide() {
    const prozent = Math.round(restBudget() / budget * 100);
    kreideEl.innerHTML = klemme(prozent, 0, 100) + "&nbsp;%";
  }

  function zeigeMeldung(text, sek) {
    meldung = text;
    meldungT = sek || 1.6;
  }

  // ---- Spielablauf ----
  function starteRunde() {
    punkte = 0;
    api.setzePunkte(0);
    spritzer = [];
    warteAufNaechstes = false;
    geschafft = false;
    ladeLevel(0);
    zeigeMeldung("Zeichne eine Rampe und drück Leertaste!", 2.4);
    api.loop(dt => { aktualisiere(dt); zeichne(); });
  }

  function loesen() {
    if (geschafft || laeuft) return;
    if (aktuellerStrich) beendeStrich();
    bauSegmente();
    laeuft = true;
    ruheZeit = 0;
    tropfen.vx = 0;
    tropfen.vy = 0;
    meldungT = 0;
  }

  function naechstesLevel() {
    if (levelNr + 1 < LEVELS.length) {
      ladeLevel(levelNr + 1);
      zeigeMeldung("Level " + (levelNr + 1) + ": " + LEVELS[levelNr].name, 2.0);
    } else {
      beendeRunde("<p>Alle " + LEVELS.length + " Level geschafft! Tinte sitzt.</p>");
    }
  }

  function levelGeschafft() {
    const sekunden = (jetztMs() - levelStartZeit) / 1000;
    const zeitBonus = klemme(1 - sekunden / 25, 0, 1);          // unter ~25 s zählt
    const rest = restBudget() / budget;
    const gewinn = levelPunkte(rest, zeitBonus);
    punkte += gewinn;
    api.setzePunkte(punkte);
    laeuft = false;
    spritze(ziel.x + ziel.b / 2, ziel.y + 6);
    zeigeMeldung("Getroffen! +" + gewinn + " Punkte", 1.8);
    // Kurze Siegespause, dann nächstes Level (über die Loop-Zeit gesteuert).
    pauseBis = jetztMs() + 950;
    warteAufNaechstes = true;
  }

  function versuchVerloren(grund) {
    versuche += 1;
    laeuft = false;
    setzeTropfenZurueck();
    if (versuche >= MAX_VERSUCHE) {
      zeigeMeldung(grund + " — Taste „n“ überspringt dieses Level.", 3.2);
    } else {
      zeigeMeldung(grund + " — Taste „r“ wischt die Kreide weg, dann neu.", 2.6);
    }
  }

  function ueberspringen() {
    if (geschafft || laeuft) return;
    if (versuche < MAX_VERSUCHE) return; // erst nach den Fehlversuchen erlaubt
    zeigeMeldung("Level übersprungen.", 1.4);
    if (levelNr + 1 < LEVELS.length) {
      ladeLevel(levelNr + 1);
    } else {
      beendeRunde("<p>Übersprungen — bis hierher gekommen!</p>");
    }
  }

  function beendeRunde(infoHtml) {
    geschafft = true;
    laeuft = false;
    warteAufNaechstes = false;
    zeichne();
    api.vorbei(punkte, infoHtml + "<p>Level erreicht: " + (levelNr + 1) + " von " + LEVELS.length + "</p>");
  }

  function spritze(x, y) {
    if (api.reduzierteBewegung) return;
    for (let i = 0; i < 12; i++) {
      const w = -Math.random() * Math.PI; // nach oben streuen (−π..0)
      const v = 60 + Math.random() * 120;
      spritzer.push({ x: x, y: y, vx: Math.cos(w) * v, vy: Math.sin(w) * v - 40, t: 0.6 });
    }
    if (spritzer.length > 80) spritzer = spritzer.slice(-80);
  }

  // ---- Physik-Schritt ----
  function aktualisiere(dt) {
    // Kurze Siegespause: warten, dann nächstes Level.
    if (warteAufNaechstes) {
      if (jetztMs() >= pauseBis) { warteAufNaechstes = false; naechstesLevel(); }
    }

    if (meldungT > 0) meldungT -= dt;

    for (const s of spritzer) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += 400 * dt; s.t -= dt; }
    spritzer = spritzer.filter(s => s.t > 0);

    if (!laeuft || geschafft) return;

    // Integration in Teilschritten, damit der Tropfen dünne Strecken nicht durchtunnelt.
    const grob = Math.hypot(tropfen.vx, tropfen.vy) * dt;
    const teil = Math.max(1, Math.ceil(grob / 3));
    const h = dt / teil;
    for (let i = 0; i < teil && laeuft && !geschafft; i++) {
      tropfen.vy += G * h;                 // Gravitation
      tropfen.x += tropfen.vx * h;
      tropfen.y += tropfen.vy * h;
      kollidiere();
      if (laeuft) pruefeRuheUndZiel(h);
      if (!laeuft) break;
    }
  }

  function kollidiere() {
    // Mehrere Auflösungs-Durchläufe für Ecken (zwei Strecken gleichzeitig).
    for (let runde = 0; runde < 3; runde++) {
      let getroffen = false;
      for (const seg of segmente) {
        const k = kreisStreckeKollision(tropfen, seg.a, seg.b);
        if (!k || k.tiefe <= 0) continue;
        // Aus der Strecke herausschieben (entlang der Normalen).
        tropfen.x += k.normal.x * k.tiefe;
        tropfen.y += k.normal.y * k.tiefe;
        // Geschwindigkeit projizieren/reflektieren (Gleiten mit Reibung).
        const v = gleiteGeschwindigkeit({ x: tropfen.vx, y: tropfen.vy }, k.normal);
        tropfen.vx = v.x;
        tropfen.vy = v.y;
        getroffen = true;
      }
      if (!getroffen) break;
    }
  }

  function pruefeRuheUndZiel(h) {
    // Ziel erreicht? Mittelpunkt des Tropfens in der Fass-Öffnung.
    if (inRechteck({ x: tropfen.x, y: tropfen.y }, ziel)) {
      levelGeschafft();
      return;
    }
    // Aus dem Bild gefallen?
    if (tropfen.y - tropfen.r > LOGIK_H + 8 || tropfen.x < -20 || tropfen.x > LOGIK_B + 20) {
      versuchVerloren("Daneben");
      return;
    }
    // Kommt zur Ruhe ohne Ziel?
    const tempo = Math.hypot(tropfen.vx, tropfen.vy);
    if (tempo < RUHE_TEMPO) {
      ruheZeit += h;
      if (ruheZeit > RUHE_ZEIT) versuchVerloren("Liegen geblieben");
    } else {
      ruheZeit = 0;
    }
  }

  // ---- Zeichnen (Eingabe) ----
  function zeigerWelt(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width * LOGIK_B,
      y: (ev.clientY - r.top) / r.height * LOGIK_H
    };
  }

  function starteStrich(p) {
    if (laeuft || geschafft) return;
    if (restBudget() < RASTER_LEN) { zeigeMeldung("Keine Kreide mehr — Taste „r“ wischt weg.", 2.0); return; }
    aktuellerStrich = [{ x: p.x, y: p.y }];
  }

  function ziehePunkt(p) {
    if (!aktuellerStrich) return;
    const letzt = aktuellerStrich[aktuellerStrich.length - 1];
    const d = Math.hypot(p.x - letzt.x, p.y - letzt.y);
    if (d < RASTER_LEN) return;                 // rastern: erst ab Mindestlänge neuer Punkt
    const verbleibend = restBudget();
    if (verbleibend <= 0) { beendeStrich(); zeigeMeldung("Keine Kreide mehr.", 1.6); return; }
    if (d > verbleibend) {
      // letzten Punkt nur so weit setzen, wie das Budget reicht.
      const t = verbleibend / d;
      aktuellerStrich.push({ x: letzt.x + (p.x - letzt.x) * t, y: letzt.y + (p.y - letzt.y) * t });
      beendeStrich();
      zeigeMeldung("Keine Kreide mehr.", 1.6);
      return;
    }
    aktuellerStrich.push({ x: p.x, y: p.y });
    aktualisiereKreide();
  }

  function beendeStrich() {
    if (!aktuellerStrich) return;
    if (aktuellerStrich.length >= 2) striche.push(aktuellerStrich);
    aktuellerStrich = null;
    bauSegmente();
    aktualisiereKreide();
  }

  function letztenStrichZurueck() {
    if (laeuft || geschafft) return;
    if (aktuellerStrich) { aktuellerStrich = null; }
    else if (striche.length) { striche.pop(); }
    else return;
    bauSegmente();
    aktualisiereKreide();
    zeigeMeldung("Letzter Strich weg.", 1.2);
  }

  function alleStricheWeg() {
    if (laeuft || geschafft) return;
    striche = [];
    aktuellerStrich = null;
    setzeTropfenZurueck();
    bauSegmente();
    aktualisiereKreide();
    zeigeMeldung("Tafel gewischt.", 1.2);
  }

  // --- Eingaben ---
  canvas.addEventListener("pointerdown", ev => {
    if (laeuft || geschafft) return;
    ev.preventDefault();
    if (canvas.setPointerCapture) canvas.setPointerCapture(ev.pointerId);
    starteStrich(zeigerWelt(ev));
  });
  canvas.addEventListener("pointermove", ev => {
    if (!aktuellerStrich) return;
    ev.preventDefault();
    ziehePunkt(zeigerWelt(ev));
  });
  function pointerEnde() { if (aktuellerStrich) beendeStrich(); }
  canvas.addEventListener("pointerup", pointerEnde);
  canvas.addEventListener("pointercancel", () => { aktuellerStrich = null; });
  canvas.addEventListener("pointerleave", pointerEnde);

  api.tasten(ev => {
    if (ev.key === " ") loesen();
    else if (ev.key === "z" || ev.key === "Z") letztenStrichZurueck();
    else if (ev.key === "r" || ev.key === "R") alleStricheWeg();
    else if (ev.key === "n" || ev.key === "N") ueberspringen();
  });
  // Tipp (ohne Ziehen / Beamer): startet den Tropfen — aber nur, wenn gerade nicht gezeichnet wird.
  api.wisch(richtung => { if (richtung === "tipp" && !aktuellerStrich) loesen(); });

  // ---- Zeichnen (Darstellung) ----
  function farben() {
    return {
      bg: farbe("--flaeche", "#2b2620"),
      text: farbe("--text", "#ede6d8"),
      leise: farbe("--text-leise", "#b3a88f"),
      akzent: farbe("--akzent", "#82b3e8"),
      ok: farbe("--ok", "#7cc578"),
      fehler: farbe("--fehler", "#f28680"),
      physik: farbe("--physik", "#e3a05c"),
      linie: farbe("--linie", "#4a4337")
    };
  }

  function strichZeichnen(zielCtx, punkte) {
    if (punkte.length < 1) return;
    zielCtx.beginPath();
    zielCtx.moveTo(punkte[0].x, punkte[0].y);
    for (let i = 1; i < punkte.length; i++) zielCtx.lineTo(punkte[i].x, punkte[i].y);
    zielCtx.stroke();
    // Endpunkt-Kappe, damit auch ein sehr kurzer Strich sichtbar ist.
    if (punkte.length === 1) {
      zielCtx.beginPath();
      zielCtx.arc(punkte[0].x, punkte[0].y, zielCtx.lineWidth / 2, 0, 2 * Math.PI);
      zielCtx.fill();
    }
  }

  function zeichne() {
    const F = farben();
    // Tafel-Hintergrund (tafelgrün, dezent).
    ctx.fillStyle = "#26352b";
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);
    ctx.strokeStyle = "rgba(255,255,255,0.10)";
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, LOGIK_B - 2, LOGIK_H - 2);

    // Hindernisse (Plattformen/Wände) als helle Kreidebalken.
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "rgba(231,225,210,0.85)";
    ctx.lineWidth = 6;
    for (const seg of LEVELS[levelNr].hindernisse) {
      ctx.beginPath();
      ctx.moveTo(seg.a.x, seg.a.y);
      ctx.lineTo(seg.b.x, seg.b.y);
      ctx.stroke();
    }

    // Tintenfass (Zielzone): dunkles Glas mit Tinte + Beschriftung.
    ctx.fillStyle = "rgba(20,30,60,0.55)";
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(ziel.x, ziel.y, ziel.b, ziel.h, 5); ctx.fill(); }
    else ctx.fillRect(ziel.x, ziel.y, ziel.b, ziel.h);
    ctx.fillStyle = F.akzent;
    ctx.fillRect(ziel.x + 4, ziel.y + ziel.h - 14, ziel.b - 8, 10);  // Tinten-Pegel
    ctx.fillStyle = "rgba(231,225,210,0.92)";
    ctx.font = "700 16px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("Ziel", ziel.x + ziel.b / 2, ziel.y + ziel.h / 2 - 2);
    ctx.textBaseline = "alphabetic";

    // Gezeichnete Kreidestriche.
    ctx.strokeStyle = "rgba(245,242,232,0.95)";
    ctx.fillStyle = "rgba(245,242,232,0.95)";
    ctx.lineWidth = 5;
    for (const strich of striche) strichZeichnen(ctx, strich);
    if (aktuellerStrich) {
      ctx.strokeStyle = "rgba(245,242,232,0.7)";
      ctx.fillStyle = "rgba(245,242,232,0.7)";
      strichZeichnen(ctx, aktuellerStrich);
    }

    // Startmarke (gestrichelter Kreis am Startpunkt), solange nicht losgelassen.
    if (!laeuft && !geschafft) {
      const st = LEVELS[levelNr].start;
      ctx.strokeStyle = "rgba(231,225,210,0.4)";
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(st.x, st.y, TROPFEN_R + 5, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Tintenspritzer (Effekt)
    for (const s of spritzer) {
      ctx.globalAlpha = Math.max(0, s.t / 0.6);
      ctx.fillStyle = F.akzent;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Tropfen: dunkler Tintenklecks mit kleinem Glanzpunkt.
    ctx.fillStyle = "#101826";
    ctx.beginPath();
    ctx.arc(tropfen.x, tropfen.y, tropfen.r, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = F.akzent;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.beginPath();
    ctx.arc(tropfen.x - tropfen.r * 0.3, tropfen.y - tropfen.r * 0.35, tropfen.r * 0.28, 0, 2 * Math.PI);
    ctx.fill();

    // Untere Meldung
    if (meldungT > 0 && meldung) {
      ctx.fillStyle = "rgba(231,225,210,0.95)";
      ctx.font = "600 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(meldung, LOGIK_B / 2, LOGIK_H - 12);
    }
  }

  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(15,18,12,0.55)";
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

  // Startbild
  ladeLevel(0);
  zeichne();
  hinweis("Tinten-Tropfen", "Drück auf „Start“!");
}
