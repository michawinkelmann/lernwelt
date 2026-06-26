// spiel.js — „Papierflieger-Pilot": vertikaler Endlos-Shoot-'em-up im Schul-Heft.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
//
// Welt: Karoblatt, das nach unten scrollt (Gefühl: nach oben fliegen). Spieler ist
// ein Papierflieger mit Auto-Feuer. Gegner kommen von oben, Upgrades zum Anfliegen,
// Spezialfähigkeit „Tafelwisch" (begrenzte Ladungen), Bosse mit Lebensbalken.
//
// Darstellung strikt in Stift-Linien; alle Farben über CSS-Variablen (Hell/Dunkel).
// Logikgröße im Hochformat 480 x 640, DPR-skaliert. Keine externen Requests,
// kein Audio, kein localStorage außer über das Highscore-Modul.

export const manifest = {
  id: "sp-papierflieger",
  titel: "Papierflieger-Pilot",
  kurz: "Vertikaler Endlos-Shooter im Heft: Steig auf, sammle Upgrades, besiege die Riesen-Klassenarbeit.",
  punkteLabel: "Punkte",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Pfeiltasten/WASD oder Ziehen · Leertaste = Tafelwisch"
};

// Logische Spielfeldmaße (Welt-/Logikkoordinaten)
const BREITE = 480;
const HOEHE = 640;

export function starte(api) {
  // --- Canvas mit DPR-Skalierung anlegen ------------------------------------
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(BREITE * faktor);
  canvas.height = Math.round(HOEHE * faktor);
  // CSS-Begrenzung NUR am Canvas (keine globale CSS-Änderung): Hochformat soll auf
  // dem Laptop nicht riesig werden. Höhe deckeln, Breite mitziehen, zentrieren.
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:72vh;height:auto;margin:0 auto;border-radius:inherit;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  const reduziert = api.reduzierteBewegung;

  // --- Kopfzeilen-Statusanzeige (Leben, Schild, Upgrades, Tafelwisch) -------
  let statusEl = api.kopf.querySelector("#pf-status");
  if (!statusEl) {
    const span = document.createElement("span");
    span.id = "pf-status";
    span.className = "pf-status";
    api.kopf.appendChild(span);
    statusEl = span;
  }

  // --- Touch-Knopf für die Spezialfähigkeit (nur auf Touch-Geräten sichtbar) -
  if (!api.flaeche.parentElement.querySelector(".spiel-touch-tasten")) {
    const tasten = document.createElement("div");
    tasten.className = "spiel-touch-tasten nur-touch";
    // Ein einzelner, breiter Spezial-Knopf (zieht über die ganze Reihe)
    tasten.innerHTML =
      '<button type="button" data-tat="spezial" aria-label="Tafelwisch auslösen" ' +
      'style="grid-column:1 / span 3;font-size:1rem;">Tafelwisch</button>';
    api.flaeche.insertAdjacentElement("afterend", tasten);
    tasten.addEventListener("click", ev => {
      const knopf = ev.target.closest("button[data-tat]");
      if (!knopf) return;
      if (knopf.dataset.tat === "spezial") tafelwisch();
      api.flaeche.focus({ preventScroll: true });
    });
  }

  // --- Farb-Hilfe: liest CSS-Variablen (passt sich Hell-/Dunkelmodus an) ----
  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }

  // ===========================================================================
  // Spielzustand
  // ===========================================================================
  let flieger, schuesse, gegnerschuesse, gegner, partikel, pickups, boss;
  let scrollY;          // fortlaufende Scroll-Position (für Karo-Animation)
  let strecke;          // zurückgelegte Strecke (für Streckenpunkte)
  let punkte;
  let leben, schild;
  let unverwundbar;     // Sekunden Rest-Unverwundbarkeit nach Treffer
  let buntstift;        // Spread-Stufe 0..3 (0 = Einzelschuss)
  let tinte;            // Tinte-Stufe 0..3 (stärker/schneller)
  let tempoStufe;       // Tempo-Upgrade 0..3
  let wischLadungen;    // Tafelwisch-Ladungen
  let feuerKuehl;       // Cooldown bis zum nächsten eigenen Schuss
  let spielzeit;        // Sekunden seit Rundenstart (Schwierigkeit + Boss-Timing)
  let stufe;            // Welt-Schwierigkeitsstufe (steigt mit Zeit und nach Bossen)
  let spawnKuehl;       // Cooldown bis zum nächsten Gegner-Spawn
  let bossTimer;        // Countdown bis zum nächsten Boss
  let bossNr;           // Anzahl bereits erschienener Bosse (wechselnde Typen)
  let laeuft;           // Runde läuft?
  let wischBlitz;       // kurzer weißer Blitz beim Tafelwisch (Sekunden)
  let abschuesse;       // Zähler für die Endabrechnung

  // Eingabe-Status
  const halten = { links: false, rechts: false, hoch: false, runter: false };
  let zeigerAktiv = false;          // Finger/Maus zieht gerade
  let zielX = BREITE / 2, zielY = HOEHE * 0.78; // Touch-Zielposition

  // ===========================================================================
  // Rundenstart / Reset
  // ===========================================================================
  function starteRunde() {
    flieger = { x: BREITE / 2, y: HOEHE * 0.78, b: 26, h: 30 };
    schuesse = [];
    gegnerschuesse = [];
    gegner = [];
    partikel = [];
    pickups = [];
    boss = null;
    scrollY = 0;
    strecke = 0;
    punkte = 0;
    leben = 3;
    schild = false;
    unverwundbar = 1.2;
    buntstift = 0;
    tinte = 0;
    tempoStufe = 0;
    wischLadungen = 2;
    feuerKuehl = 0;
    spielzeit = 0;
    stufe = 1;
    spawnKuehl = 1.0;
    bossTimer = 42;          // erster Boss nach ~42 s
    bossNr = 0;
    wischBlitz = 0;
    abschuesse = 0;
    laeuft = true;
    zielX = flieger.x;
    zielY = flieger.y;
    for (const k in halten) halten[k] = false;
    api.setzePunkte(0);
    aktualisiereStatus();
    api.loop(schleife);
  }

  // ===========================================================================
  // Game-Loop
  // ===========================================================================
  function schleife(dt) {
    if (laeuft) aktualisiere(dt);
    zeichne();
  }

  // ===========================================================================
  // Update-Logik
  // ===========================================================================
  function aktualisiere(dt) {
    spielzeit += dt;

    // Welt-Schwierigkeit: alle 22 s eine Stufe höher (zusätzlich nach Bossen)
    const zeitStufe = 1 + Math.floor(spielzeit / 18);
    if (zeitStufe > stufe) stufe = zeitStufe;

    // Scrollgeschwindigkeit (reduzierte Bewegung -> langsamer)
    const scrollTempo = reduziert ? Math.min(92, 54 + stufe * 3) : Math.min(220, 108 + stufe * 9);
    scrollY += scrollTempo * dt;
    strecke += scrollTempo * dt;
    // Streckenpunkte: ~1 Punkt pro 12 Welt-Pixel
    punkte += scrollTempo * dt / 12;

    bewegeFlieger(dt);
    feuere(dt);
    bewegeSchuesse(dt);
    bewegeGegnerschuesse(dt);

    // Boss-Steuerung
    if (boss) {
      aktualisiereBoss(dt);
    } else {
      bossTimer -= dt;
      // Spawn normaler Gegner nur ohne Boss
      spawnKuehl -= dt;
      if (spawnKuehl <= 0) {
        spawneGegner();
        // Spawnrate steigt mit der Stufe (untere Schranke 0,45 s)
        const basis = Math.max(0.34, 1.05 - stufe * 0.085);
        spawnKuehl = basis * (0.7 + Math.random() * 0.6);
      }
      if (bossTimer <= 0) starteBoss();
    }

    bewegeGegner(dt);
    bewegePickups(dt);
    aktualisierePartikel(dt);

    pruefeTreffer();
    pruefeSpielerTreffer(dt);

    if (unverwundbar > 0) unverwundbar -= dt;
    if (wischBlitz > 0) wischBlitz -= dt;

    api.setzePunkte(Math.floor(punkte));
  }

  // --- Fliegerbewegung -------------------------------------------------------
  function bewegeFlieger(dt) {
    const tempo = 230 + tempoStufe * 55;  // Welt-Pixel pro Sekunde
    if (zeigerAktiv) {
      // Touch/Maus: Flieger gleitet zur Zielposition (mit kleinem Offset über Finger)
      const folge = Math.min(1, dt * 14);
      flieger.x += (zielX - flieger.x) * folge;
      flieger.y += (zielY - flieger.y) * folge;
    } else {
      let dx = 0, dy = 0;
      if (halten.links) dx -= 1;
      if (halten.rechts) dx += 1;
      if (halten.hoch) dy -= 1;
      if (halten.runter) dy += 1;
      if (dx && dy) { dx *= 0.7071; dy *= 0.7071; }
      flieger.x += dx * tempo * dt;
      flieger.y += dy * tempo * dt;
    }
    // im Sichtfeld halten
    const rx = flieger.b / 2, ry = flieger.h / 2;
    flieger.x = klemme(flieger.x, rx, BREITE - rx);
    flieger.y = klemme(flieger.y, ry + 6, HOEHE - ry - 4);
  }

  // --- Auto-Feuer ------------------------------------------------------------
  function feuere(dt) {
    feuerKuehl -= dt;
    if (feuerKuehl > 0) return;
    // Feuerrate: Tinte macht schneller
    const rate = 0.22 - tinte * 0.04;   // Sekunden zwischen Salven
    feuerKuehl = Math.max(0.09, rate);
    const schaden = 1 + tinte;          // Tinte = stärker
    const px = flieger.x, py = flieger.y - flieger.h / 2;
    const tempo = 460 + tinte * 40;
    // Spread über die Buntstift-Stufe
    const winkel = [];
    if (buntstift <= 0) winkel.push(0);
    else if (buntstift === 1) { winkel.push(-0.13, 0.13); }
    else if (buntstift === 2) { winkel.push(-0.22, 0, 0.22); }
    else { winkel.push(-0.34, -0.12, 0.12, 0.34, 0); }
    for (const w of winkel) {
      schuesse.push({
        x: px, y: py,
        vx: Math.sin(w) * tempo, vy: -Math.cos(w) * tempo,
        r: 3.2, schaden
      });
    }
  }

  function bewegeSchuesse(dt) {
    for (let i = schuesse.length - 1; i >= 0; i--) {
      const s = schuesse[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      if (s.y < -10 || s.x < -10 || s.x > BREITE + 10) schuesse.splice(i, 1);
    }
  }

  function bewegeGegnerschuesse(dt) {
    for (let i = gegnerschuesse.length - 1; i >= 0; i--) {
      const s = gegnerschuesse[i];
      s.x += s.vx * dt; s.y += s.vy * dt;
      s.dreh = (s.dreh || 0) + dt * 6;
      if (s.y > HOEHE + 14 || s.y < -20 || s.x < -20 || s.x > BREITE + 20)
        gegnerschuesse.splice(i, 1);
    }
  }

  // ===========================================================================
  // Gegner
  // ===========================================================================
  // Typen: "monster" (zerknülltes Papier, gerade/leicht pendelnd, kann schießen),
  //        "wecker" (Verfolger, schneller), "zettel" (flattern im Zickzack).
  function spawneGegner() {
    const r = Math.random();
    const x = 30 + Math.random() * (BREITE - 60);
    const hp = 1 + Math.floor(stufe / 3);   // HP wächst mit Stufe
    if (r < 0.45) {
      // Hausaufgaben-Monster
      gegner.push({
        typ: "monster", x, y: -28, b: 34, h: 34,
        vy: 70 + stufe * 6, vx: 0, hp: hp + 1, maxHp: hp + 1,
        phase: Math.random() * Math.PI * 2,
        schiesst: stufe >= 2 && Math.random() < 0.62,
        schussKuehl: 1.2 + Math.random(),
        wert: 60, dreh: 0
      });
    } else if (r < 0.75) {
      // Verspätungs-Wecker (Verfolger)
      gegner.push({
        typ: "wecker", x, y: -26, b: 30, h: 30,
        vy: 95 + stufe * 7, vx: 0, hp, maxHp: hp,
        wert: 80, dreh: 0
      });
    } else {
      // Schmierzettel (Zickzack-Flatterer)
      gegner.push({
        typ: "zettel", x, y: -24, b: 28, h: 24,
        vy: 80 + stufe * 6, vx: (Math.random() < 0.5 ? -1 : 1) * 90,
        hp: Math.max(1, hp - 1), maxHp: Math.max(1, hp - 1),
        phase: Math.random() * Math.PI * 2,
        wert: 50, dreh: 0
      });
    }
  }

  function bewegeGegner(dt) {
    for (let i = gegner.length - 1; i >= 0; i--) {
      const g = gegner[i];
      g.dreh += dt * (g.typ === "monster" ? 1.5 : g.typ === "wecker" ? 3 : 5);
      if (g.typ === "monster") {
        g.phase += dt * 2;
        g.x += Math.sin(g.phase) * 40 * dt;
        g.y += g.vy * dt;
        if (g.schiesst) {
          g.schussKuehl -= dt;
          if (g.schussKuehl <= 0 && g.y > 0 && g.y < HOEHE * 0.7) {
            g.schussKuehl = 1.6 + Math.random();
            schiesseAufSpieler(g.x, g.y + g.h / 2, 150 + stufe * 8);
          }
        }
      } else if (g.typ === "wecker") {
        // verfolgt den Flieger sanft in X
        const dx = flieger.x - g.x;
        g.x += klemme(dx, -90 * dt, 90 * dt);
        g.y += g.vy * dt;
      } else { // zettel
        g.phase += dt * 4;
        g.x += g.vx * dt;
        g.y += g.vy * dt + Math.sin(g.phase) * 12 * dt;
        if (g.x < 24 || g.x > BREITE - 24) g.vx *= -1;
        g.x = klemme(g.x, 24, BREITE - 24);
      }
      if (g.y > HOEHE + 30) gegner.splice(i, 1);
    }
  }

  function schiesseAufSpieler(x, y, tempo) {
    const dx = flieger.x - x, dy = flieger.y - y;
    const len = Math.hypot(dx, dy) || 1;
    gegnerschuesse.push({ x, y, vx: dx / len * tempo, vy: dy / len * tempo, r: 4, dreh: 0 });
  }

  // ===========================================================================
  // Bosse — zwei Typen im Wechsel
  // ===========================================================================
  function starteBoss() {
    bossNr++;
    const typ = (bossNr % 2 === 1) ? "klassenarbeit" : "drache";
    const maxHp = 60 + stufe * 18 + bossNr * 20;
    boss = {
      typ, x: BREITE / 2, y: -90, zielY: 90,
      b: typ === "klassenarbeit" ? 200 : 150,
      h: typ === "klassenarbeit" ? 150 : 90,
      hp: maxHp, maxHp,
      richtung: 1, phase: 0, schussKuehl: 1.6, dreh: 0, eintritt: true
    };
  }

  function aktualisiereBoss(dt) {
    const b = boss;
    b.dreh += dt;
    if (b.eintritt) {
      // hereinschweben
      b.y += (b.zielY - b.y) * Math.min(1, dt * 2.5);
      if (b.y > b.zielY - 2) { b.y = b.zielY; b.eintritt = false; }
      return;
    }
    b.phase += dt;
    // seitliche Pendelbewegung
    const reichweite = (BREITE - b.b) / 2 - 6;
    b.x += b.richtung * (40 + stufe * 4) * dt;
    if (b.x > BREITE / 2 + reichweite) { b.x = BREITE / 2 + reichweite; b.richtung = -1; }
    if (b.x < BREITE / 2 - reichweite) { b.x = BREITE / 2 - reichweite; b.richtung = 1; }

    // Schussmuster
    b.schussKuehl -= dt;
    if (b.schussKuehl <= 0) {
      if (b.typ === "klassenarbeit") {
        // Fächer aus roten Stiften nach unten
        b.schussKuehl = Math.max(0.7, 1.5 - stufe * 0.05);
        const n = 5;
        const tempo = 150 + stufe * 8;
        for (let i = 0; i < n; i++) {
          const w = -0.5 + i / (n - 1);   // Streuung um senkrecht nach unten
          gegnerschuesse.push({
            x: b.x, y: b.y + b.h / 2,
            vx: Math.sin(w) * tempo, vy: Math.cos(w) * tempo, r: 4.5, dreh: 0
          });
        }
      } else {
        // Mathe-Drache: gezielte Doppelsalve auf den Spieler
        b.schussKuehl = Math.max(0.55, 1.2 - stufe * 0.05);
        schiesseAufSpieler(b.x - 24, b.y + b.h / 2, 200 + stufe * 9);
        schiesseAufSpieler(b.x + 24, b.y + b.h / 2, 200 + stufe * 9);
      }
    }
  }

  function bossBesiegt() {
    const b = boss;
    punkte += 600 + bossNr * 200;
    abschuesse++;
    // Konfetti-Explosion
    explosion(b.x, b.y, 28, farbe("--fehler", "#b3261e"));
    explosion(b.x, b.y, 22, farbe("--akzent", "#19599f"));
    // garantiertes Upgrade
    erzeugePickup(b.x, b.y + 10, garantiertesUpgrade());
    // weiteres Bonus-Pickup
    erzeugePickup(b.x - 40, b.y + 10, "schwamm");
    boss = null;
    stufe++;                       // Schwierigkeit steigt nach jedem Boss
    bossTimer = 50;                // nächster Boss
    spawnKuehl = 2.0;
  }

  // ===========================================================================
  // Pickups / Upgrades
  // ===========================================================================
  // Arten: "buntstift","tinte","schild","leben","tempo","schwamm"
  function erzeugePickup(x, y, art) {
    pickups.push({ x: klemme(x, 20, BREITE - 20), y, art, vy: 55, phase: Math.random() * 6, dreh: 0 });
  }

  function zufallsUpgrade() {
    const r = Math.random();
    if (r < 0.30) return "buntstift";
    if (r < 0.52) return "tinte";
    if (r < 0.70) return "schild";
    if (r < 0.82) return "schwamm";
    if (r < 0.92) return "tempo";
    return "leben";
  }

  function garantiertesUpgrade() {
    // bevorzugt das, was noch fehlt/nützt
    if (buntstift < 3) return "buntstift";
    if (tinte < 3) return "tinte";
    if (!schild) return "schild";
    if (leben < 5) return "leben";
    return "tempo";
  }

  function bewegePickups(dt) {
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.phase += dt * 2;
      p.dreh += dt;
      p.y += p.vy * dt;
      p.x += Math.sin(p.phase) * 18 * dt;
      if (p.y > HOEHE + 24) pickups.splice(i, 1);
    }
  }

  function sammle(art) {
    if (art === "buntstift") buntstift = Math.min(3, buntstift + 1);
    else if (art === "tinte") tinte = Math.min(3, tinte + 1);
    else if (art === "schild") schild = true;
    else if (art === "tempo") tempoStufe = Math.min(3, tempoStufe + 1);
    else if (art === "leben") leben = Math.min(5, leben + 1);
    else if (art === "schwamm") wischLadungen = Math.min(6, wischLadungen + 1);
    punkte += 25;
    aktualisiereStatus();
  }

  // ===========================================================================
  // Trefferprüfung
  // ===========================================================================
  function pruefeTreffer() {
    // eigene Schüsse gegen Gegner
    for (let si = schuesse.length - 1; si >= 0; si--) {
      const s = schuesse[si];
      let getroffen = false;
      for (let gi = gegner.length - 1; gi >= 0; gi--) {
        const g = gegner[gi];
        if (Math.abs(s.x - g.x) < g.b / 2 + s.r && Math.abs(s.y - g.y) < g.h / 2 + s.r) {
          g.hp -= s.schaden;
          getroffen = true;
          if (!reduziert) explosion(s.x, s.y, 3, farbe("--text-leise", "#6e6555"));
          if (g.hp <= 0) {
            gegnerStirbt(g);
            gegner.splice(gi, 1);
          }
          break;
        }
      }
      // eigener Schuss gegen Boss
      if (!getroffen && boss && !boss.eintritt) {
        const b = boss;
        if (Math.abs(s.x - b.x) < b.b / 2 + s.r && Math.abs(s.y - b.y) < b.h / 2 + s.r) {
          b.hp -= s.schaden;
          getroffen = true;
          if (!reduziert) explosion(s.x, s.y, 2, farbe("--fehler", "#b3261e"));
          if (b.hp <= 0) bossBesiegt();
        }
      }
      if (getroffen) schuesse.splice(si, 1);
    }

    // Pickups einsammeln (durch Anfliegen)
    for (let pi = pickups.length - 1; pi >= 0; pi--) {
      const p = pickups[pi];
      if (Math.abs(p.x - flieger.x) < 22 && Math.abs(p.y - flieger.y) < 22) {
        sammle(p.art);
        if (!reduziert) explosion(p.x, p.y, 6, farbe("--ok", "#2c7029"));
        pickups.splice(pi, 1);
      }
    }
  }

  function gegnerStirbt(g) {
    punkte += g.wert;
    abschuesse++;
    if (!reduziert) explosion(g.x, g.y, 9, farbe("--text-leise", "#6e6555"));
    // Chance auf Upgrade-Drop
    if (Math.random() < 0.16) erzeugePickup(g.x, g.y, zufallsUpgrade());
  }

  // Treffer am Spieler: Gegnerschüsse, Gegnerkörper, Bosskörper
  function pruefeSpielerTreffer(dt) {
    if (unverwundbar > 0) return;
    const fx = flieger.x, fy = flieger.y, frx = flieger.b / 2 - 4, fry = flieger.h / 2 - 4;

    // Gegnerschüsse
    for (let i = gegnerschuesse.length - 1; i >= 0; i--) {
      const s = gegnerschuesse[i];
      if (Math.abs(s.x - fx) < frx + s.r && Math.abs(s.y - fy) < fry + s.r) {
        gegnerschuesse.splice(i, 1);
        spielerGetroffen();
        return;
      }
    }
    // Gegnerkörper (Rammen)
    for (let i = gegner.length - 1; i >= 0; i--) {
      const g = gegner[i];
      if (Math.abs(g.x - fx) < g.b / 2 + frx - 4 && Math.abs(g.y - fy) < g.h / 2 + fry - 4) {
        if (!reduziert) explosion(g.x, g.y, 8, farbe("--text-leise", "#6e6555"));
        gegner.splice(i, 1);
        spielerGetroffen();
        return;
      }
    }
    // Bosskörper
    if (boss && !boss.eintritt) {
      const b = boss;
      if (Math.abs(b.x - fx) < b.b / 2 + frx - 6 && Math.abs(b.y - fy) < b.h / 2 + fry - 6) {
        spielerGetroffen();
      }
    }
  }

  function spielerGetroffen() {
    if (schild) {
      // Schild fängt den Treffer ab
      schild = false;
      unverwundbar = 1.1;
      if (!reduziert) explosion(flieger.x, flieger.y, 12, farbe("--akzent", "#19599f"));
      aktualisiereStatus();
      return;
    }
    leben--;
    unverwundbar = 1.6;
    if (!reduziert) explosion(flieger.x, flieger.y, 14, farbe("--fehler", "#b3261e"));
    aktualisiereStatus();
    if (leben <= 0) gameOver();
  }

  // ===========================================================================
  // Tafelwisch (Spezialfähigkeit)
  // ===========================================================================
  function tafelwisch() {
    if (!laeuft || wischLadungen <= 0) return;
    wischLadungen--;
    wischBlitz = 0.35;
    // alle sichtbaren Gegner kassieren Schaden / werden gelöscht
    for (let i = gegner.length - 1; i >= 0; i--) {
      const g = gegner[i];
      if (g.y > -20 && g.y < HOEHE + 20) {
        if (!reduziert) explosion(g.x, g.y, 7, farbe("--akzent", "#19599f"));
        punkte += Math.floor(g.wert * 0.5);
        abschuesse++;
        gegner.splice(i, 1);
      }
    }
    // feindliche Schüsse löschen
    gegnerschuesse.length = 0;
    // Boss bekommt kräftigen Schaden ab (aber wird nicht sofort gewischt)
    if (boss && !boss.eintritt) {
      boss.hp -= Math.ceil(boss.maxHp * 0.12);
      if (boss.hp <= 0) bossBesiegt();
    }
    aktualisiereStatus();
  }

  // ===========================================================================
  // Partikel (Papierschnipsel)
  // ===========================================================================
  function explosion(x, y, anzahl, farbwert) {
    if (reduziert) return;
    for (let i = 0; i < anzahl; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 120;
      partikel.push({
        x, y,
        vx: Math.cos(w) * v, vy: Math.sin(w) * v,
        leben: 0.4 + Math.random() * 0.4, alter: 0,
        gr: 2 + Math.random() * 3, dreh: Math.random() * 6, dv: (Math.random() - 0.5) * 10,
        farbe: farbwert
      });
    }
  }

  function aktualisierePartikel(dt) {
    for (let i = partikel.length - 1; i >= 0; i--) {
      const p = partikel[i];
      p.alter += dt;
      if (p.alter >= p.leben) { partikel.splice(i, 1); continue; }
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vy += 60 * dt;                 // leichte „Schwerkraft"
      p.vx *= 0.98;
      p.dreh += p.dv * dt;
    }
  }

  // ===========================================================================
  // Game Over
  // ===========================================================================
  function gameOver() {
    laeuft = false;
    zeichne();
    const m = Math.floor(spielzeit / 60), s = Math.floor(spielzeit % 60);
    const zeitText = (m > 0 ? m + " min " : "") + s + " s";
    api.vorbei(Math.floor(punkte),
      `<p>Strecke geflogen: ${Math.floor(strecke / 10)} m &middot; Abschüsse: ${abschuesse} &middot; Flugzeit: ${zeitText}${bossNr > 0 ? " &middot; Bosse besiegt: " + bossNr : ""}</p>`);
  }

  // ===========================================================================
  // Kopfzeilen-Status
  // ===========================================================================
  function aktualisiereStatus() {
    if (!statusEl) return;
    const herz = "♥".repeat(Math.max(0, leben));
    let html = `<span class="pf-leben" aria-label="Leben: ${leben}">${herz || "—"}</span>`;
    html += ` &middot; Tafelwisch: <b>${wischLadungen}</b>`;
    if (schild) html += " &middot; 🛡 Schild";
    if (buntstift > 0) html += ` &middot; Buntstift ${buntstift}`;
    if (tinte > 0) html += ` &middot; Tinte ${tinte}`;
    if (tempoStufe > 0) html += ` &middot; Tempo ${tempoStufe}`;
    statusEl.innerHTML = html;
  }

  // ===========================================================================
  // Eingaben
  // ===========================================================================
  const TASTE_RICHTUNG = {
    ArrowLeft: "links", ArrowRight: "rechts", ArrowUp: "hoch", ArrowDown: "runter",
    a: "links", d: "rechts", w: "hoch", s: "runter",
    A: "links", D: "rechts", W: "hoch", S: "runter"
  };

  // keydown kommt über das Gerüst (verhindert Standard bei Pfeilen/Leertaste)
  api.tasten(ev => {
    if (ev.key === " ") { tafelwisch(); return; }
    const r = TASTE_RICHTUNG[ev.key];
    if (r) { halten[r] = true; zeigerAktiv = false; }
  });

  // keyup liefert das Gerüst nicht — daher eigener Listener auf der Fläche.
  api.flaeche.addEventListener("keyup", ev => {
    const r = TASTE_RICHTUNG[ev.key];
    if (r) halten[r] = false;
  });

  // Touch/Maus: Finger auf der Fläche zieht den Flieger (mit kleinem Offset nach oben)
  function zeigerZuWelt(ev) {
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * BREITE;
    const y = (ev.clientY - r.top) / r.height * HOEHE;
    // Offset: Flieger etwas über dem Finger, damit der Finger ihn nicht verdeckt
    zielX = klemme(x, 0, BREITE);
    zielY = klemme(y - 46, 0, HOEHE);
  }
  api.flaeche.addEventListener("pointerdown", ev => {
    if (!laeuft) return;
    zeigerAktiv = true;
    zeigerZuWelt(ev);
    if (ev.pointerType === "touch") ev.preventDefault();
  });
  api.flaeche.addEventListener("pointermove", ev => {
    if (!laeuft || !zeigerAktiv) return;
    zeigerZuWelt(ev);
    if (ev.pointerType === "touch") ev.preventDefault();
  });
  function zeigerEnde() { zeigerAktiv = false; }
  api.flaeche.addEventListener("pointerup", zeigerEnde);
  api.flaeche.addEventListener("pointercancel", zeigerEnde);
  api.flaeche.addEventListener("pointerleave", zeigerEnde);

  // ===========================================================================
  // Zeichnen
  // ===========================================================================
  function zeichne() {
    const F = {
      papier: farbe("--flaeche", "#fffdf6"),
      karo: farbe("--karo", "rgba(125,108,80,0.16)"),
      linie: farbe("--linie", "#ddd5c4"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      fehler: farbe("--fehler", "#b3261e"),
      ok: farbe("--ok", "#2c7029")
    };

    // Papierhintergrund
    ctx.fillStyle = F.papier;
    ctx.fillRect(0, 0, BREITE, HOEHE);

    zeichneKaro(F);

    // Pickups (unter Gegnern)
    for (const p of pickups) zeichnePickup(p, F);

    // Gegner
    for (const g of gegner) zeichneGegner(g, F);

    // Boss
    if (boss) zeichneBoss(boss, F);

    // eigene Schüsse (Bleistift-/Tinte-Punkte)
    ctx.fillStyle = tinte > 0 ? F.akzent : F.text;
    for (const s of schuesse) {
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Gegnerschüsse (rote Korrektur-Striche)
    ctx.strokeStyle = F.fehler;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    for (const s of gegnerschuesse) {
      const len = 9;
      const vlen = Math.hypot(s.vx, s.vy) || 1;
      const ux = s.vx / vlen, uy = s.vy / vlen;
      ctx.beginPath();
      ctx.moveTo(s.x - ux * len, s.y - uy * len);
      ctx.lineTo(s.x + ux * len, s.y + uy * len);
      ctx.stroke();
    }
    ctx.lineCap = "butt";

    // Partikel
    for (const p of partikel) {
      const a = 1 - p.alter / p.leben;
      ctx.save();
      ctx.globalAlpha = Math.max(0, a);
      ctx.translate(p.x, p.y);
      ctx.rotate(p.dreh);
      ctx.fillStyle = p.farbe;
      ctx.fillRect(-p.gr / 2, -p.gr / 2, p.gr, p.gr);
      ctx.restore();
    }
    ctx.globalAlpha = 1;

    // Spieler
    zeichneFlieger(F);

    // Tafelwisch-Blitz
    if (wischBlitz > 0) {
      ctx.fillStyle = "rgba(255,255,255," + (wischBlitz / 0.35 * 0.5) + ")";
      ctx.fillRect(0, 0, BREITE, HOEHE);
    }

    // Tafelwisch-Anzeige unten links (für alle Eingabearten sichtbar)
    zeichneWischAnzeige(F);
  }

  // --- Karopapier, nach unten scrollend -------------------------------------
  function zeichneKaro(F) {
    const gr = 32;                          // Karo-Größe (Welt-Pixel)
    const off = ((scrollY % gr) + gr) % gr; // animierter Versatz
    ctx.strokeStyle = F.karo;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= BREITE; x += gr) {
      ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, HOEHE);
    }
    for (let y = -gr + off; y <= HOEHE; y += gr) {
      ctx.moveTo(0, y + 0.5); ctx.lineTo(BREITE, y + 0.5);
    }
    ctx.stroke();
    // Rote Randlinie (Heftrand) — dezent
    ctx.strokeStyle = F.fehler;
    ctx.globalAlpha = 0.25;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(34.5, 0); ctx.lineTo(34.5, HOEHE);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  // --- Papierflieger (weißes Origami-Dreieck in dünnen Linien) ---------------
  function zeichneFlieger(F) {
    // Blink-Effekt während Unverwundbarkeit
    if (unverwundbar > 0 && !reduziert && Math.floor(unverwundbar * 12) % 2 === 0) return;
    ctx.save();
    ctx.translate(flieger.x, flieger.y);
    const h = flieger.h / 2, b = flieger.b / 2;

    // Schild-Aura
    if (schild) {
      ctx.strokeStyle = F.akzent;
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(0, 0, b + 8, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Füllung (Papierweiß) + Umriss (Stift)
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    // Außenkontur: Pfeil nach oben
    ctx.beginPath();
    ctx.moveTo(0, -h);          // Spitze
    ctx.lineTo(b, h);           // rechte Heckecke
    ctx.lineTo(0, h - 7);       // Heck-Einkerbung
    ctx.lineTo(-b, h);          // linke Heckecke
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Mittelfalz
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(0, h - 7);
    ctx.stroke();
    // Flügelfalze
    ctx.strokeStyle = F.leise;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -h + 4); ctx.lineTo(b - 4, h - 2);
    ctx.moveTo(0, -h + 4); ctx.lineTo(-b + 4, h - 2);
    ctx.stroke();
    ctx.restore();
  }

  // --- Gegner ----------------------------------------------------------------
  function zeichneGegner(g, F) {
    ctx.save();
    ctx.translate(g.x, g.y);
    if (g.typ === "monster") zeichneMonster(g, F);
    else if (g.typ === "wecker") zeichneWecker(g, F);
    else zeichneZettel(g, F);
    // HP-Hinweis: leichter Riss/Knick wird durch Form impliziert; bei mehr HP dicker
    ctx.restore();
  }

  // Hausaufgaben-Monster: zerknülltes Papierknäuel mit Gesicht
  function zeichneMonster(g, F) {
    const r = g.b / 2;
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 1.6;
    ctx.lineJoin = "round";
    // zerknüllte Kontur (gezackter Kreis)
    ctx.beginPath();
    const zacken = 9;
    for (let i = 0; i <= zacken; i++) {
      const a = (i / zacken) * Math.PI * 2 + g.dreh * 0.3;
      const rr = r * (0.82 + 0.18 * Math.abs(Math.sin(i * 2.3 + g.dreh)));
      const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Knitter-Linien
    ctx.strokeStyle = F.leise;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(-r * 0.4, -r * 0.2); ctx.lineTo(r * 0.2, r * 0.3);
    ctx.moveTo(r * 0.3, -r * 0.3); ctx.lineTo(-r * 0.1, r * 0.1);
    ctx.stroke();
    // Gesicht (mürrisch)
    ctx.fillStyle = F.text;
    ctx.beginPath(); ctx.arc(-4, -2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -2, 2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(-5, 7); ctx.quadraticCurveTo(0, 3, 5, 7); // Stirnrunzel-Mund
    ctx.stroke();
  }

  // Verspätungs-Wecker: rundes Ziffernblatt mit Glocken und Zeigern
  function zeichneWecker(g, F) {
    const r = g.b / 2;
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 1.6;
    // Glocken
    ctx.beginPath(); ctx.arc(-r * 0.6, -r * 0.7, r * 0.34, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(r * 0.6, -r * 0.7, r * 0.34, 0, Math.PI * 2); ctx.stroke();
    // Ziffernblatt
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
    ctx.fill(); ctx.stroke();
    // Füßchen
    ctx.beginPath();
    ctx.moveTo(-r * 0.5, r * 0.78); ctx.lineTo(-r * 0.7, r * 0.98);
    ctx.moveTo(r * 0.5, r * 0.78); ctx.lineTo(r * 0.7, r * 0.98);
    ctx.stroke();
    // Zeiger (drehen langsam mit g.dreh)
    ctx.strokeStyle = F.fehler;
    ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(g.dreh) * r * 0.55, Math.sin(g.dreh) * r * 0.55);
    ctx.moveTo(0, 0); ctx.lineTo(Math.cos(g.dreh * 1.7) * r * 0.4, Math.sin(g.dreh * 1.7) * r * 0.4);
    ctx.stroke();
  }

  // Schmierzettel: flatterndes, gerissenes Blatt mit Gekritzel
  function zeichneZettel(g, F) {
    const w = g.b / 2, h = g.h / 2;
    const flatter = Math.sin(g.dreh) * 2.5;
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 1.4;
    ctx.lineJoin = "round";
    // gerissener Rand
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(w, -h + flatter);
    ctx.lineTo(w - 2, h);
    ctx.lineTo(-2, h - 3);
    ctx.lineTo(-w + 2, h - flatter);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Schreiblinien (Gekritzel)
    ctx.strokeStyle = F.leise;
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      const yy = i * 5;
      ctx.moveTo(-w + 4, yy);
      ctx.lineTo(w - 4, yy + Math.sin(g.dreh + i) * 1.5);
    }
    ctx.stroke();
  }

  // --- Boss ------------------------------------------------------------------
  function zeichneBoss(b, F) {
    ctx.save();
    ctx.translate(b.x, b.y);
    if (b.typ === "klassenarbeit") zeichneKlassenarbeit(b, F);
    else zeichneDrache(b, F);
    ctx.restore();
    zeichneBossBalken(b, F);
  }

  // Riesen-Klassenarbeit: großes Prüfungsblatt mit Überschrift, Note, „Aufgaben"
  function zeichneKlassenarbeit(b, F) {
    const w = b.b / 2, h = b.h / 2;
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    // Blatt (mit Eselsohr oben rechts)
    ctx.beginPath();
    ctx.moveTo(-w, -h);
    ctx.lineTo(w - 16, -h);
    ctx.lineTo(w, -h + 16);
    ctx.lineTo(w, h);
    ctx.lineTo(-w, h);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Eselsohr
    ctx.beginPath();
    ctx.moveTo(w - 16, -h);
    ctx.lineTo(w - 16, -h + 16);
    ctx.lineTo(w, -h + 16);
    ctx.strokeStyle = F.leise;
    ctx.lineWidth = 1.2;
    ctx.stroke();
    // Kopfzeile „KLASSENARBEIT"
    ctx.fillStyle = F.text;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 16px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText("KLASSENARBEIT", 0, -h + 22);
    // rote Note (mürrisch grinsend in der Ecke)
    ctx.fillStyle = F.fehler;
    ctx.font = "700 34px 'Fraunces', Georgia, serif";
    ctx.fillText("6", -w + 28, -h + 36);
    // angedeutete Aufgabenzeilen
    ctx.strokeStyle = F.leise;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const yy = -h + 50 + i * 18;
      ctx.moveTo(-w + 18, yy); ctx.lineTo(w - 18, yy);
    }
    ctx.stroke();
    // böses Gesicht in der Mitte
    ctx.fillStyle = F.text;
    ctx.beginPath(); ctx.arc(-14, 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 12, 3, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = F.fehler;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-16, 30); ctx.quadraticCurveTo(0, 22, 16, 30);
    ctx.stroke();
  }

  // Mathe-Drache: gezackter Drachenkopf aus Formeln/Linien
  function zeichneDrache(b, F) {
    const w = b.b / 2, h = b.h / 2;
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.akzent;
    ctx.lineWidth = 2.2;
    ctx.lineJoin = "round";
    // gezackter Drachenleib (Papierdrache)
    ctx.beginPath();
    ctx.moveTo(0, -h);
    ctx.lineTo(w, -h * 0.2);
    ctx.lineTo(w * 0.4, h);
    ctx.lineTo(-w * 0.4, h);
    ctx.lineTo(-w, -h * 0.2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // Querstreben des Drachens
    ctx.strokeStyle = F.leise;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -h); ctx.lineTo(0, h);
    ctx.moveTo(-w, -h * 0.2); ctx.lineTo(w, -h * 0.2);
    ctx.stroke();
    // Augen
    ctx.fillStyle = F.text;
    ctx.beginPath(); ctx.arc(-14, -10, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, -10, 3.5, 0, Math.PI * 2); ctx.fill();
    // Formel-Brüllmaul
    ctx.fillStyle = F.fehler;
    ctx.font = "700 18px 'Fraunces', Georgia, serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("x²", 0, 12);
    // Schweif (Wimpel)
    ctx.strokeStyle = F.akzent;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(-w * 0.4, h);
    ctx.quadraticCurveTo(-w * 0.2, h + 18 + Math.sin(b.dreh * 3) * 6, 0, h + 10);
    ctx.stroke();
  }

  function zeichneBossBalken(b, F) {
    const bw = BREITE - 40, bh = 9, bx = 20, by = 12;
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 4); else ctx.rect(bx, by, bw, bh);
    ctx.fill(); ctx.stroke();
    const anteil = Math.max(0, b.hp / b.maxHp);
    ctx.fillStyle = F.fehler;
    const iw = (bw - 4) * anteil;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(bx + 2, by + 2, iw, bh - 4, 3); else ctx.rect(bx + 2, by + 2, iw, bh - 4);
    ctx.fill();
    // Boss-Name
    ctx.fillStyle = F.text;
    ctx.font = "700 12px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillText(b.typ === "klassenarbeit" ? "Riesen-Klassenarbeit" : "Mathe-Drache", BREITE / 2, by + bh + 3);
  }

  // --- Pickups (Upgrade-Symbole) ---------------------------------------------
  function zeichnePickup(p, F) {
    ctx.save();
    ctx.translate(p.x, p.y + Math.sin(p.phase) * 2);
    const r = 13;
    // Hülle: kleines Heft-Sticker
    ctx.fillStyle = F.papier;
    ctx.strokeStyle = F.text;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-r, -r, r * 2, r * 2, 4); else ctx.rect(-r, -r, r * 2, r * 2);
    ctx.fill(); ctx.stroke();

    if (p.art === "buntstift") {
      // bunter Stift (diagonal)
      ctx.lineCap = "round";
      ctx.lineWidth = 4;
      ctx.strokeStyle = farbe("--physik", "#a3570e");
      ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(6, -6); ctx.stroke();
      // Spitze
      ctx.fillStyle = F.text;
      ctx.beginPath(); ctx.moveTo(6, -6); ctx.lineTo(3, -7); ctx.lineTo(7, -3); ctx.closePath(); ctx.fill();
      ctx.lineCap = "butt";
    } else if (p.art === "tinte") {
      // Tintenfass / Tropfen
      ctx.fillStyle = F.akzent;
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.quadraticCurveTo(6, 2, 0, 8);
      ctx.quadraticCurveTo(-6, 2, 0, -7);
      ctx.closePath();
      ctx.fill();
    } else if (p.art === "schild") {
      // Büroklammer-Schild
      ctx.strokeStyle = F.akzent;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-3, -7); ctx.lineTo(-3, 5);
      ctx.arc(0, 5, 3, Math.PI, 0, false);
      ctx.lineTo(3, -4);
      ctx.arc(0, -4, 3, 0, Math.PI, false);
      ctx.lineTo(-1, 3);
      ctx.stroke();
    } else if (p.art === "leben") {
      // Schulmilch (Tüte)
      ctx.fillStyle = F.papier;
      ctx.strokeStyle = F.text;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(-5, 8); ctx.lineTo(-5, -4); ctx.lineTo(0, -8); ctx.lineTo(5, -4); ctx.lineTo(5, 8);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.fillStyle = F.fehler;
      ctx.beginPath(); ctx.arc(0, 1, 2.4, 0, Math.PI * 2); ctx.fill();
    } else if (p.art === "tempo") {
      // Tempo: Doppelpfeil nach oben
      ctx.strokeStyle = F.ok;
      ctx.lineWidth = 2.2;
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(-5, 2); ctx.lineTo(0, -4); ctx.lineTo(5, 2);
      ctx.moveTo(-5, 7); ctx.lineTo(0, 1); ctx.lineTo(5, 7);
      ctx.stroke();
    } else { // schwamm
      // Tafelschwamm (zweifarbiges Rechteck)
      ctx.fillStyle = F.ok;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(-7, -2, 14, 8, 2); else ctx.rect(-7, -2, 14, 8);
      ctx.fill();
      ctx.fillStyle = F.leise;
      ctx.fillRect(-7, -6, 14, 4);
    }
    ctx.restore();
  }

  // Tafelwisch-Ladungen unten links als kleine Schwämme + Hinweis
  function zeichneWischAnzeige(F) {
    const y = HOEHE - 18;
    ctx.save();
    ctx.fillStyle = F.leise;
    ctx.font = "600 11px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText("Tafelwisch", 12, y - 9);
    for (let i = 0; i < wischLadungen; i++) {
      const x = 12 + i * 16;
      ctx.fillStyle = F.ok;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, 12, 7, 2); else ctx.rect(x, y, 12, 7);
      ctx.fill();
      ctx.fillStyle = F.leise;
      ctx.fillRect(x, y - 3, 12, 3);
    }
    ctx.restore();
  }

  // ===========================================================================
  // Startbild
  // ===========================================================================
  function startbild() {
    // Ruhebild zeichnen (ohne Logik), dann Hinweis
    const F = {
      papier: farbe("--flaeche", "#fffdf6"),
      karo: farbe("--karo", "rgba(125,108,80,0.16)"),
      linie: farbe("--linie", "#ddd5c4"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      fehler: farbe("--fehler", "#b3261e"),
      ok: farbe("--ok", "#2c7029")
    };
    ctx.fillStyle = F.papier;
    ctx.fillRect(0, 0, BREITE, HOEHE);
    scrollY = 0;
    zeichneKaro(F);
    // Vorschau-Flieger in der Mitte
    flieger = { x: BREITE / 2, y: HOEHE * 0.62, b: 26, h: 30 };
    schild = false; unverwundbar = 0;
    zeichneFlieger(F);
    hinweis("Papierflieger-Pilot", "Drück auf „Start“!");
  }

  // Abdunkelnde Einblendung mit Text (Hell- und Dunkelmodus tauglich)
  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(20,18,14,0.55)";
    ctx.fillRect(0, 0, BREITE, HOEHE);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 30px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(haupt, BREITE / 2, HOEHE / 2 - 14);
    if (unter) {
      ctx.font = "400 16px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(unter, BREITE / 2, HOEHE / 2 + 16);
    }
  }

  // ===========================================================================
  // Hilfsfunktionen
  // ===========================================================================
  function klemme(wert, min, max) { return wert < min ? min : (wert > max ? max : wert); }

  // ===========================================================================
  // Verdrahtung mit dem Gerüst
  // ===========================================================================
  api.neustartCb(starteRunde);

  // Startbild vor dem ersten Start
  startbild();
}
