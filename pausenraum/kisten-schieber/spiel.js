// spiel.js — „Kisten-Schieber" (Sokoban) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Level parsen, ein Zug, Sieg-Prüfung) ist exportiert und in
// Node testbar — auf Modulebene wird weder document noch window angefasst, das
// Canvas entsteht erst in starte(). Ruhiges Logikspiel ohne Zeitdruck: Die Figur
// springt feldweise (keine Animation), darum bleibt auch bei reduzierter Bewegung
// alles unverändert spielbar.

export const manifest = {
  id: "sp-kisten-schieber",
  titel: "Kisten-Schieber",
  kurz: "Schieb alle Kisten auf die Zielfelder — ein ruhiges Logikrätsel mit immer kniffligeren Leveln.",
  punkteLabel: "Level",
  highscore: true,
  hsRichtung: "absteigend", // mehr gelöste Level = besser
  zeigeZeit: false,
  steuerungHinweis: "Pfeiltasten oder Wischen bewegen · U macht den letzten Zug rückgängig · R startet das Level neu"
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// ASCII-Zeichen der Level:
//   #  Wand          (Leerzeichen)  freies Feld
//   .  Zielfeld      $  Kiste        *  Kiste auf Zielfeld
//   @  Figur         +  Figur auf Zielfeld
//
// Steigende Schwierigkeit; Level 1 ist ein sehr einfaches Tutorial (1 Kiste).
export const LEVELS = [
  [ // 1 — Tutorial: eine Kiste einen Schritt weit schieben
    "#######",
    "#     #",
    "# @$. #",
    "#     #",
    "#######"
  ],
  [ // 2 — zwei Kisten nebeneinander
    "########",
    "#      #",
    "# @$ . #",
    "# $  . #",
    "#      #",
    "########"
  ],
  [ // 3 — um die Ecke schieben
    "########",
    "#   ..##",
    "#  $$ ##",
    "## @  ##",
    "##    ##",
    "########"
  ],
  [ // 4 — schmaler Gang, Reihenfolge zählt
    "#########",
    "#.      #",
    "#.$$$ @ #",
    "#.      #",
    "#########"
  ],
  [ // 5 — kleines Lager mit Innenwand
    "########",
    "#  .   #",
    "# $##$ #",
    "# . @  #",
    "#  .$  #",
    "#      #",
    "########"
  ],
  [ // 6 — Kreuzform: vier Kisten in die vier Ecken schieben
    "#######",
    "#.   .#",
    "#  $  #",
    "# $@$ #",
    "#  $  #",
    "#.   .#",
    "#######"
  ],
  [ // 7 — Kammern: jede Kiste durch ihre Engstelle schieben
    "##########",
    "#  .##.  #",
    "# $    $ #",
    "##  ##  ##",
    "# $ @@ $ #",
    "#  .##.  #",
    "##########"
  ],
  [ // 8 — verschachtelt, mit Engstellen (4 Kisten, 4 Ziele)
    "##########",
    "#. .   . #",
    "# $$$ $  #",
    "#   @    #",
    "#      . #",
    "#        #",
    "##########"
  ]
];

// Parst ein Level (Array von Zeilen-Strings) in einen Zustand.
// Liefert { breite, hoehe, waende (2D-Boolean-Raster), kisten:[{x,y}],
//           ziele:[{x,y}], figur:{x,y} }. Waende ist über istWand(...) abfragbar.
export function parseLevel(zeilen) {
  const hoehe = zeilen.length;
  let breite = 0;
  for (const z of zeilen) breite = Math.max(breite, z.length);

  const waende = [];
  for (let y = 0; y < hoehe; y++) waende.push(new Array(breite).fill(false));
  const kisten = [];
  const ziele = [];
  let figur = { x: 0, y: 0 };

  for (let y = 0; y < hoehe; y++) {
    const zeile = zeilen[y];
    for (let x = 0; x < breite; x++) {
      const zeichen = x < zeile.length ? zeile[x] : " ";
      switch (zeichen) {
        case "#": waende[y][x] = true; break;
        case ".": ziele.push({ x, y }); break;
        case "$": kisten.push({ x, y }); break;
        case "*": kisten.push({ x, y }); ziele.push({ x, y }); break;
        case "@": figur = { x, y }; break;
        case "+": figur = { x, y }; ziele.push({ x, y }); break;
        default: break; // Leerzeichen / Unbekanntes = freies Feld
      }
    }
  }
  return { breite, hoehe, waende, kisten, ziele, figur };
}

// Liegt an (x,y) eine Wand (außerhalb des Rasters gilt als Wand)?
export function istWand(zustand, x, y) {
  if (x < 0 || y < 0 || x >= zustand.breite || y >= zustand.hoehe) return true;
  return !!zustand.waende[y][x];
}

// Index der Kiste auf (x,y) oder −1.
export function kisteIndexAuf(zustand, x, y) {
  return zustand.kisten.findIndex(k => k.x === x && k.y === y);
}

// Liegt an (x,y) ein Zielfeld?
export function istZiel(zustand, x, y) {
  return zustand.ziele.some(z => z.x === x && z.y === y);
}

// Tiefe Kopie des veränderlichen Teils (Figur + Kisten). Wände/Ziele/Maße sind
// unveränderlich und werden nur per Referenz weitergereicht — so bleibt die
// Zughistorie für Undo klein und der Ausgangszustand unangetastet.
function klone(zustand) {
  return {
    breite: zustand.breite,
    hoehe: zustand.hoehe,
    waende: zustand.waende,
    ziele: zustand.ziele,
    kisten: zustand.kisten.map(k => ({ x: k.x, y: k.y })),
    figur: { x: zustand.figur.x, y: zustand.figur.y }
  };
}

// Ein Zug in Richtung (dx,dy) mit dx,dy ∈ {−1,0,1}, genau eine Komponente ±1.
// Regeln: Figur rückt ein Feld vor; steht eine Kiste davor, wird sie geschoben,
// sofern das Feld DAHINTER frei ist (keine Wand, keine zweite Kiste). Nie ziehen,
// nie zwei Kisten auf einmal. Liefert einen NEUEN Zustand oder null, wenn der
// Zug unmöglich ist (für Undo via Historie).
export function zug(zustand, dx, dy) {
  const zx = zustand.figur.x + dx;
  const zy = zustand.figur.y + dy;
  if (istWand(zustand, zx, zy)) return null;

  const kIdx = kisteIndexAuf(zustand, zx, zy);
  if (kIdx >= 0) {
    // Kiste vor der Figur — Feld dahinter prüfen
    const hx = zx + dx;
    const hy = zy + dy;
    if (istWand(zustand, hx, hy)) return null;
    if (kisteIndexAuf(zustand, hx, hy) >= 0) return null; // zweite Kiste blockiert
    const neu = klone(zustand);
    neu.kisten[kIdx] = { x: hx, y: hy };
    neu.figur = { x: zx, y: zy };
    return neu;
  }

  // Freies Feld — Figur rückt vor
  const neu = klone(zustand);
  neu.figur = { x: zx, y: zy };
  return neu;
}

// Sind alle Kisten auf Zielfeldern (und damit das Level gelöst)?
export function gewonnen(zustand) {
  if (zustand.kisten.length === 0) return false;
  return zustand.kisten.every(k => istZiel(zustand, k.x, k.y));
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  // Logische Zeichenfläche; die tatsächliche Kachelgröße ergibt sich pro Level
  // aus den Maßen, das Canvas wird dafür neu dimensioniert.
  const ZELLE = 48;             // logische Pixel pro Kachel
  const faktor = Math.max(2, window.devicePixelRatio || 1);

  const canvas = document.createElement("canvas");
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:66vh;height:auto;margin:0 auto;border-radius:inherit;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");

  // Kopfzeilen-Anzeigen (Level + Züge) in die Info-Zeile hängen
  let zuegeEl = api.kopf.querySelector("#ks-zuege");
  if (!zuegeEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Z&uuml;ge: <b id="ks-zuege">0</b>';
    api.kopf.appendChild(span);
    zuegeEl = span.querySelector("b");
  }

  let levelNr = 0;          // 0-basiert in LEVELS
  let zustand = null;       // aktueller Zustand
  let historie = [];        // Stapel früherer Zustände (für Undo)
  let zuege = 0;
  let geloest = 0;          // Anzahl gelöster Level (= Punktzahl)
  let gewann = false;       // dieses Level gerade gelöst (kurze Erfolgsmeldung)
  let meldungT = 0;         // Restzeit der Erfolgsmeldung in Sekunden
  let breiteLog = ZELLE;    // aktuelle logische Canvas-Maße
  let hoeheLog = ZELLE;

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }

  function dimensioniere() {
    breiteLog = zustand.breite * ZELLE;
    hoeheLog = zustand.hoehe * ZELLE;
    canvas.width = Math.round(breiteLog * faktor);
    canvas.height = Math.round(hoeheLog * faktor);
    ctx.setTransform(faktor, 0, 0, faktor, 0, 0);
  }

  function ladeLevel(nr) {
    levelNr = ((nr % LEVELS.length) + LEVELS.length) % LEVELS.length;
    zustand = parseLevel(LEVELS[levelNr]);
    historie = [];
    zuege = 0;
    gewann = false;
    meldungT = 0;
    zuegeEl.textContent = "0";
    api.setzePunkte(geloest);
    dimensioniere();
  }

  function neustart() {
    geloest = 0;
    ladeLevel(0);
    api.loop(dt => { aktualisiere(dt); zeichne(); });
  }

  function levelNeu() {
    // R: aktuelles Level von vorn
    ladeLevel(levelNr);
  }

  function rueckgaengig() {
    if (gewann || !historie.length) return;
    zustand = historie.pop();
    zuege = Math.max(0, zuege - 1);
    zuegeEl.textContent = String(zuege);
  }

  function bewege(dx, dy) {
    if (gewann || !zustand) return; // während der Erfolgsmeldung gesperrt
    const neu = zug(zustand, dx, dy);
    if (!neu) return; // Zug unmöglich (Wand oder blockierte Kiste)
    historie.push(zustand);
    if (historie.length > 200) historie = historie.slice(-200); // mind. 50 Schritte
    zustand = neu;
    zuege += 1;
    zuegeEl.textContent = String(zuege);
    if (gewonnen(zustand)) {
      gewann = true;
      geloest += 1;
      api.setzePunkte(geloest);
      // Nach dem letzten Level ist Schluss; sonst kurze Erfolgsmeldung, dann weiter.
      meldungT = (levelNr + 1 >= LEVELS.length) ? 2.4 : 1.2;
    }
  }

  function aktualisiere(dt) {
    if (meldungT > 0) {
      meldungT -= dt;
      if (meldungT <= 0) {
        if (levelNr + 1 >= LEVELS.length) {
          // Alle Level gelöst → vorbei mit Punktzahl = Anzahl gelöster Level
          api.vorbei(geloest, "<p>Alle Level gel&ouml;st! Stark.</p>");
        } else {
          ladeLevel(levelNr + 1);
        }
      }
    }
  }

  // --- Eingaben ---
  api.tasten(ev => {
    const k = ev.key;
    if (k === "ArrowUp" || k === "w" || k === "W") bewege(0, -1);
    else if (k === "ArrowDown" || k === "s" || k === "S") bewege(0, 1);
    else if (k === "ArrowLeft" || k === "a" || k === "A") bewege(-1, 0);
    else if (k === "ArrowRight" || k === "d" || k === "D") bewege(1, 0);
    else if (k === "u" || k === "U") rueckgaengig();
    else if (k === "r" || k === "R") levelNeu();
  });

  api.wisch(richtung => {
    if (richtung === "hoch") bewege(0, -1);
    else if (richtung === "runter") bewege(0, 1);
    else if (richtung === "links") bewege(-1, 0);
    else if (richtung === "rechts") bewege(1, 0);
    // „tipp" ohne Wirkung — kein Zeitdruck, kein versehentlicher Zug
  });

  // --- Zeichnen ---
  function rund(x, y, b, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, radius);
    else ctx.rect(x, y, b, h);
    ctx.fill();
  }

  function zeichne() {
    if (!zustand) return;
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      linie: farbe("--linie", "#ddd5c4"),
      akzent: farbe("--akzent", "#19599f"),
      ok: farbe("--ok", "#2c7029"),
      fehler: farbe("--fehler", "#b3261e")
    };

    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, breiteLog, hoeheLog);

    // Bodenraster (dezente Kreidelinien) — nur über begehbaren/gefüllten Feldern
    ctx.strokeStyle = F.linie;
    ctx.lineWidth = 1;
    for (let y = 0; y < zustand.hoehe; y++) {
      for (let x = 0; x < zustand.breite; x++) {
        if (istWand(zustand, x, y)) continue;
        ctx.strokeRect(x * ZELLE + 0.5, y * ZELLE + 0.5, ZELLE - 1, ZELLE - 1);
      }
    }

    // Zielfelder als markierte Kreise
    for (const z of zustand.ziele) {
      const cx = z.x * ZELLE + ZELLE / 2;
      const cy = z.y * ZELLE + ZELLE / 2;
      ctx.strokeStyle = F.ok;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(cx, cy, ZELLE * 0.22, 0, 2 * Math.PI);
      ctx.stroke();
      ctx.fillStyle = F.ok;
      ctx.beginPath();
      ctx.arc(cx, cy, ZELLE * 0.07, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Wände als Kreide-Blöcke (mit feinem Innenrahmen)
    for (let y = 0; y < zustand.hoehe; y++) {
      for (let x = 0; x < zustand.breite; x++) {
        if (!istWand(zustand, x, y)) continue;
        ctx.fillStyle = F.leise;
        rund(x * ZELLE + 2, y * ZELLE + 2, ZELLE - 4, ZELLE - 4, 5);
        ctx.strokeStyle = F.bg;
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x * ZELLE + 7, y * ZELLE + 7, ZELLE - 14, ZELLE - 14);
      }
    }

    // Kisten als Kästchen; auf Ziel optisch hervorgehoben
    for (const k of zustand.kisten) {
      const px = k.x * ZELLE;
      const py = k.y * ZELLE;
      const aufZiel = istZiel(zustand, k.x, k.y);
      ctx.fillStyle = aufZiel ? F.ok : farbe("--physik", "#a3570e");
      rund(px + 6, py + 6, ZELLE - 12, ZELLE - 12, 6);
      // Deckel-Kreuz wie bei einer Kiste
      ctx.strokeStyle = F.bg;
      ctx.lineWidth = 2;
      const m = ZELLE / 2;
      ctx.beginPath();
      ctx.moveTo(px + 8, py + 8); ctx.lineTo(px + ZELLE - 8, py + ZELLE - 8);
      ctx.moveTo(px + ZELLE - 8, py + 8); ctx.lineTo(px + 8, py + ZELLE - 8);
      ctx.stroke();
      if (aufZiel) {
        // Häkchen-Punkt in der Mitte als zusätzliche, nicht nur farbliche Markierung
        ctx.fillStyle = F.bg;
        ctx.beginPath();
        ctx.arc(px + m, py + m, ZELLE * 0.08, 0, 2 * Math.PI);
        ctx.fill();
      }
    }

    // Figur als einfache Kreide-Figur (Kopf + Körper)
    zeichneFigur(zustand.figur.x * ZELLE, zustand.figur.y * ZELLE, F);

    // Kopf-Notiz auf dem Brett
    ctx.fillStyle = F.leise;
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Level " + (levelNr + 1) + " / " + LEVELS.length, 6, 16);

    // Erfolgsmeldung
    if (gewann && meldungT > 0) {
      ctx.fillStyle = "rgba(20,18,14,0.45)";
      ctx.fillRect(0, 0, breiteLog, hoeheLog);
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.font = "700 26px 'Source Sans 3', system-ui, sans-serif";
      const letztes = levelNr + 1 >= LEVELS.length;
      ctx.fillText(letztes ? "Geschafft!" : "Level gelöst!", breiteLog / 2, hoeheLog / 2 - 8);
      ctx.font = "400 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(letztes ? "Alle Level fertig" : "Weiter geht’s …", breiteLog / 2, hoeheLog / 2 + 18);
      ctx.textBaseline = "alphabetic";
    }
  }

  function zeichneFigur(px, py, F) {
    const cx = px + ZELLE / 2;
    const koerperFarbe = F.akzent;
    // Körper (Oberkörper als abgerundeter Block)
    ctx.fillStyle = koerperFarbe;
    rund(px + ZELLE * 0.28, py + ZELLE * 0.42, ZELLE * 0.44, ZELLE * 0.40, 6);
    // Kopf
    ctx.beginPath();
    ctx.arc(cx, py + ZELLE * 0.34, ZELLE * 0.17, 0, 2 * Math.PI);
    ctx.fill();
    // Gesicht (zwei Kreide-Augen) auf hellem Grund
    ctx.fillStyle = F.bg;
    ctx.beginPath();
    ctx.arc(cx - ZELLE * 0.055, py + ZELLE * 0.32, ZELLE * 0.028, 0, 2 * Math.PI);
    ctx.arc(cx + ZELLE * 0.055, py + ZELLE * 0.32, ZELLE * 0.028, 0, 2 * Math.PI);
    ctx.fill();
  }

  function startbild() {
    if (!zustand) { zustand = parseLevel(LEVELS[0]); dimensioniere(); }
    zeichne();
    ctx.fillStyle = "rgba(20,18,14,0.55)";
    ctx.fillRect(0, 0, breiteLog, hoeheLog);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 26px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText("Kisten-Schieber", breiteLog / 2, hoeheLog / 2 - 10);
    ctx.font = "400 15px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText("Drück auf „Start“!", breiteLog / 2, hoeheLog / 2 + 16);
    ctx.textBaseline = "alphabetic";
  }

  api.neustartCb(neustart);

  ladeLevel(0);
  startbild();
}
