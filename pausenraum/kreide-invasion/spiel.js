// spiel.js — „Kreide-Invasion" (Space-Invaders-Variante) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Setting: dunkelgrüne Schultafel, alle Figuren in Kreide-Weiß/Gelb mit dünnen,
// leicht „kreidigen" Linien. Reine Hilfsfunktionen (Tempo, Trefferprüfung,
// Bunkerraster) sind exportiert und in Node testbar — auf Modulebene wird weder
// document noch window angefasst, das Canvas entsteht erst in starte().

export const LOGIK_B = 640; // logische Breite der Spielfläche (Querformat)
export const LOGIK_H = 480; // logische Höhe

// Gegnerraster: 5 Reihen × 9 Spalten Fehlerteufel.
export const REIHEN = 5;
export const SPALTEN = 9;
export const GEGNER_B = 34;   // Breite eines Fehlerteufels
export const GEGNER_H = 26;   // Höhe
export const GEGNER_LX = 18;  // horizontaler Abstand der Rasterzellen über die Figur hinaus
export const GEGNER_LY = 16;  // vertikaler Abstand

// Spieler (Kreidekanone)
export const KANONE_B = 44;
export const KANONE_H = 18;
export const KANONE_TEMPO = 300;     // px/s
export const KANONE_Y = LOGIK_H - 40; // Oberkante der Kanone
export const NACHLADE_S = 0.33;       // Sekunden zwischen zwei Schüssen
export const SCHUSS_TEMPO = 460;      // px/s, nach oben
export const KLECKS_TEMPO = 200;      // px/s, Gegnerfeuer nach unten

export const manifest = {
  id: "sp-kreide-invasion",
  titel: "Kreide-Invasion",
  kurz: "Space-Invaders an der Tafel: Schieß die Fehlerteufel ab und überstehe Welle um Welle.",
  punkteLabel: "Punkte",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Pfeiltasten + Leertaste oder die Tasten unter der Fläche"
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar, ohne DOM/Canvas)
// ---------------------------------------------------------------------------

// Punkte einer Reihe: oben am meisten. Reihe 0 (oberste) = 50, dann 40, 30, 20, 10.
export function reihenPunkte(reihe) {
  return (REIHEN - reihe) * 10;
}

// Seitwärts-Tempo des Blocks (px/s). Start ca. 28, steigt deutlich, je weniger
// Gegner übrig sind, und etwas mit der Wellen-Nummer. Auf sinnvolles Maß gedeckelt.
export function blockTempo(uebrig, gesamt, welle) {
  const anteilWeg = 1 - uebrig / gesamt;           // 0 … fast 1
  const basis = 26 + 18 * welle;                   // pro Welle schneller
  return Math.min(220, basis + anteilWeg * 150);
}

// Achsen-aligned Box-Überschneidung (links/oben inklusiv).
export function boxenSchneiden(a, b) {
  return a.x < b.x + b.b && a.x + a.b > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

// Liefert den vertikalen Pixel-Schritt, um den der Block bei Randberührung sinkt.
export const ABSTIEG = 18;

// Baut das Gegnerraster für eine Welle. `wellenOffsetY` schiebt höhere Wellen
// tiefer (jede Welle startet eine Reihe weiter unten). Jeder Gegner trägt seine
// Rasterposition (reihe/spalte), seinen Punktwert und lebt zunächst.
export function baueGegner(startX, startY) {
  const liste = [];
  for (let r = 0; r < REIHEN; r++) {
    for (let s = 0; s < SPALTEN; s++) {
      liste.push({
        reihe: r, spalte: s,
        x: startX + s * (GEGNER_B + GEGNER_LX),
        y: startY + r * (GEGNER_H + GEGNER_LY),
        b: GEGNER_B, h: GEGNER_H,
        lebt: true,
        punkte: reihenPunkte(r)
      });
    }
  }
  return liste;
}

// Linker/rechter Rand der lebenden Gegner (für Randberührung). Liefert null, wenn keiner lebt.
export function blockGrenzen(gegner) {
  let minX = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const g of gegner) {
    if (!g.lebt) continue;
    if (g.x < minX) minX = g.x;
    if (g.x + g.b > maxX) maxX = g.x + g.b;
    if (g.y + g.h > maxY) maxY = g.y + g.h;
  }
  if (minX === Infinity) return null;
  return { minX, maxX, maxY };
}

// Je Spalte den untersten lebenden Gegner — nur diese dürfen Tinte werfen.
export function untersteSchuetzen(gegner) {
  const proSpalte = new Map();
  for (const g of gegner) {
    if (!g.lebt) continue;
    const vorhanden = proSpalte.get(g.spalte);
    if (!vorhanden || g.y > vorhanden.y) proSpalte.set(g.spalte, g);
  }
  return [...proSpalte.values()];
}

// Bunker als Raster kleiner „Blöcke" (Radiergummi), die einzeln abbröckeln.
// Jeder Bunker ist ein Gitter aus Zellen; getroffene Zellen verschwinden. Eine
// kleine Ausbuchtung unten (Eingang) wird ausgespart — klassische Invaders-Form.
export const BUNKER_SPALTEN = 6;
export const BUNKER_ZEILEN = 4;
export const BUNKER_ZELLE = 9; // px je Zelle → Bunker 54 × 36

export function baueBunker(mittenX, obenY) {
  const zellen = [];
  const b = BUNKER_SPALTEN * BUNKER_ZELLE;
  const x0 = Math.round(mittenX - b / 2);
  for (let zy = 0; zy < BUNKER_ZEILEN; zy++) {
    for (let zx = 0; zx < BUNKER_SPALTEN; zx++) {
      // Unten mittig eine 2×1-Lücke als Eingang aussparen.
      const eingang = zy >= BUNKER_ZEILEN - 1 && (zx === 2 || zx === 3);
      if (eingang) continue;
      zellen.push({
        x: x0 + zx * BUNKER_ZELLE,
        y: obenY + zy * BUNKER_ZELLE,
        b: BUNKER_ZELLE, h: BUNKER_ZELLE,
        heil: true
      });
    }
  }
  return zellen;
}

// Verteilt n Bunker gleichmäßig über die Breite und liefert deren Zellen-Arrays.
export function baueAlleBunker(anzahl, breite, obenY) {
  const liste = [];
  for (let i = 0; i < anzahl; i++) {
    const x = breite * (i + 1) / (anzahl + 1);
    liste.push(baueBunker(x, obenY));
  }
  return liste;
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  const TAFEL = "#21492f"; // fester Tafelgrün-Ton (hell- wie dunkelmodustauglich)

  // Canvas in Logikgröße, per devicePixelRatio scharf skaliert (wie schlange).
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOGIK_B * faktor);
  canvas.height = Math.round(LOGIK_H * faktor);
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // Wellen-Anzeige in der Kopfzeile ergänzen (wie schlange die Tempo-Stufe).
  let welleEl = api.kopf.querySelector("#ki-welle");
  if (!welleEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Welle: <b id="ki-welle">1</b>';
    api.kopf.appendChild(span);
    welleEl = span.querySelector("b");
  }
  // Leben-Anzeige in der Kopfzeile ergänzen.
  let lebenEl = api.kopf.querySelector("#ki-leben");
  if (!lebenEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Leben: <b id="ki-leben">♟♟♟</b>';
    api.kopf.appendChild(span);
    lebenEl = span.querySelector("b");
  }

  // On-Screen-Tasten unter der Fläche (nur Touch sichtbar): ◀ ▶ + Feuer.
  if (!api.flaeche.parentElement.querySelector(".spiel-touch-tasten")) {
    const tasten = document.createElement("div");
    tasten.className = "spiel-touch-tasten nur-touch";
    tasten.innerHTML =
      '<button type="button" data-tk="links" aria-label="Kanone nach links">◀</button>' +
      '<button type="button" data-tk="feuer" aria-label="Feuern">●</button>' +
      '<button type="button" data-tk="rechts" aria-label="Kanone nach rechts">▶</button>';
    api.flaeche.insertAdjacentElement("afterend", tasten);
    const setze = (tk, an) => {
      if (tk === "links") halten.links = an;
      else if (tk === "rechts") halten.rechts = an;
      else if (tk === "feuer") halten.feuer = an;
    };
    tasten.querySelectorAll("button[data-tk]").forEach(knopf => {
      const tk = knopf.dataset.tk;
      knopf.addEventListener("pointerdown", ev => {
        ev.preventDefault();
        setze(tk, true);
        if (tk === "feuer") api.flaeche.focus({ preventScroll: true });
      });
      const los = ev => { ev.preventDefault(); setze(tk, false); };
      knopf.addEventListener("pointerup", los);
      knopf.addEventListener("pointercancel", los);
      knopf.addEventListener("pointerleave", () => setze(tk, false));
    });
  }

  // --- Spielzustand (im Browser-Teil gehalten) ---
  const halten = { links: false, rechts: false, feuer: false };
  let kanoneX = LOGIK_B / 2 - KANONE_B / 2;
  let schuesse = [];   // eigene Kreide-Geschosse (nach oben)
  let kleckse = [];    // Gegner-Tintenkleckse (nach unten)
  let gegner = [];
  let bunker = [];     // Array von Zellen-Arrays
  let partikel = [];   // Kreidestaub (Juice)
  let punkte = 0;
  let leben = 3;
  let welle = 1;
  let nachlade = 0;        // Restzeit bis nächster Schuss möglich
  let kleckUhr = 0;        // Zähler bis nächster Gegnerschuss
  let richtung = 1;        // Block-Bewegungsrichtung (1 rechts, -1 links)
  let wackeln = 0;         // Rest-Wackelzeit bei Lebensverlust (Juice)
  let laeuftRunde = false;
  let endeBevor = false;   // verhindert doppeltes vorbei()

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }

  // Startaufstellung der aktuellen Welle. Höhere Wellen starten eine Reihe tiefer.
  function stelleWelleAuf(neueWelle) {
    welle = neueWelle;
    const blockB = SPALTEN * GEGNER_B + (SPALTEN - 1) * GEGNER_LX;
    const startX = Math.round((LOGIK_B - blockB) / 2);
    const startY = 44 + (welle - 1) * (GEGNER_H + GEGNER_LY); // je Welle eine Reihe tiefer
    gegner = baueGegner(startX, startY);
    richtung = 1;
    schuesse = [];
    kleckse = [];
    kleckUhr = naechsterKleckAbstand();
    welleEl.textContent = String(welle);
  }

  function starteRunde() {
    kanoneX = LOGIK_B / 2 - KANONE_B / 2;
    punkte = 0;
    leben = 3;
    partikel = [];
    nachlade = 0;
    wackeln = 0;
    endeBevor = false;
    bunker = baueAlleBunker(4, LOGIK_B, KANONE_Y - 70);
    stelleWelleAuf(1);
    halten.links = halten.rechts = halten.feuer = false;
    api.setzePunkte(0);
    lebenEl.textContent = lebenSymbole();
    laeuftRunde = true;
    api.loop(schleife);
  }

  function lebenSymbole() {
    return "♟".repeat(Math.max(0, leben)) || "–";
  }

  function naechsterKleckAbstand() {
    // Zufälliger Abstand bis zum nächsten Gegnerschuss; höhere Wellen feuern öfter.
    const min = Math.max(0.45, 1.4 - welle * 0.12);
    return min + Math.random() * 1.1;
  }

  // --- Hauptschleife ---
  function schleife(dt) {
    if (!laeuftRunde) return;
    aktualisiere(dt);
    zeichne();
  }

  function aktualisiere(dt) {
    // Kanone bewegen (gehaltene Tasten)
    let dx = 0;
    if (halten.links) dx -= 1;
    if (halten.rechts) dx += 1;
    kanoneX += dx * KANONE_TEMPO * dt;
    kanoneX = Math.max(6, Math.min(LOGIK_B - KANONE_B - 6, kanoneX));

    // Feuern (gehalten erlaubt, mit Nachladezeit)
    nachlade -= dt;
    if (halten.feuer && nachlade <= 0) {
      schuesse.push({ x: kanoneX + KANONE_B / 2 - 1.5, y: KANONE_Y - 12, b: 3, h: 12 });
      nachlade = NACHLADE_S;
    }

    // Eigene Geschosse nach oben
    for (const s of schuesse) s.y -= SCHUSS_TEMPO * dt;
    schuesse = schuesse.filter(s => s.y + s.h > 0);

    // Gegnerblock bewegen
    bewegeBlock(dt);

    // Gegnerfeuer
    kleckUhr -= dt;
    if (kleckUhr <= 0) {
      const schuetzen = untersteSchuetzen(gegner);
      if (schuetzen.length) {
        const g = schuetzen[Math.floor(Math.random() * schuetzen.length)];
        kleckse.push({ x: g.x + g.b / 2 - 3, y: g.y + g.h, b: 6, h: 10 });
      }
      kleckUhr = naechsterKleckAbstand();
    }
    for (const k of kleckse) k.y += KLECKS_TEMPO * dt;
    kleckse = kleckse.filter(k => k.y < LOGIK_H);

    // Kollisionen
    pruefeTreffer();

    // Juice: Partikel & Wackeln abbauen
    if (!api.reduzierteBewegung) {
      for (const p of partikel) {
        p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 220 * dt; p.t -= dt;
      }
      partikel = partikel.filter(p => p.t > 0);
      if (wackeln > 0) wackeln = Math.max(0, wackeln - dt);
    } else {
      partikel = [];
      wackeln = 0;
    }

    // Welle leer? → nächste Welle (schneller, tiefer startend)
    if (laeuftRunde && !gegner.some(g => g.lebt)) {
      stelleWelleAuf(welle + 1);
    }
  }

  function bewegeBlock(dt) {
    const grenzen = blockGrenzen(gegner);
    if (!grenzen) return;
    const uebrig = gegner.reduce((n, g) => n + (g.lebt ? 1 : 0), 0);
    const tempo = blockTempo(uebrig, REIHEN * SPALTEN, welle);
    let dx = richtung * tempo * dt;

    // Randberührung → abprallen, eine Stufe tiefer.
    if (grenzen.maxX + dx > LOGIK_B - 6 || grenzen.minX + dx < 6) {
      richtung *= -1;
      for (const g of gegner) if (g.lebt) g.y += ABSTIEG;
      dx = 0;
      // Nach dem Absteigen prüfen, ob die Kanonenlinie erreicht ist.
      const nachAb = blockGrenzen(gegner);
      if (nachAb && nachAb.maxY >= KANONE_Y) {
        runfeVorbei("erreicht");
        return;
      }
    } else {
      for (const g of gegner) if (g.lebt) g.x += dx;
    }
  }

  function pruefeTreffer() {
    // Eigene Geschosse vs. Gegner
    for (const s of schuesse) {
      if (s.tot) continue;
      for (const g of gegner) {
        if (!g.lebt) continue;
        if (boxenSchneiden(s, { x: g.x, y: g.y, b: g.b, h: g.h })) {
          g.lebt = false;
          s.tot = true;
          punkte += g.punkte;
          api.setzePunkte(punkte);
          staub(g.x + g.b / 2, g.y + g.h / 2, "#fffbe6");
          break;
        }
      }
    }
    // Eigene Geschosse vs. Bunker (bröckeln ab)
    for (const s of schuesse) {
      if (s.tot) continue;
      if (bunkerTreffer(s)) s.tot = true;
    }
    schuesse = schuesse.filter(s => !s.tot);

    // Gegner-Kleckse vs. Bunker
    for (const k of kleckse) {
      if (k.tot) continue;
      if (bunkerTreffer(k)) k.tot = true;
    }
    // Gegner-Kleckse vs. Kanone
    const kanonenBox = { x: kanoneX, y: KANONE_Y, b: KANONE_B, h: KANONE_H };
    for (const k of kleckse) {
      if (k.tot) continue;
      if (boxenSchneiden(k, kanonenBox)) {
        k.tot = true;
        trefferKanone();
      }
    }
    kleckse = kleckse.filter(k => !k.tot);
  }

  // Treffer auf eine Bunkerzelle: nächste heile Zelle, die das Geschoss berührt,
  // wird zerstört. Liefert true bei Treffer.
  function bunkerTreffer(geschoss) {
    for (const zellen of bunker) {
      for (const z of zellen) {
        if (!z.heil) continue;
        if (boxenSchneiden(geschoss, z)) {
          z.heil = false;
          staub(z.x + z.b / 2, z.y + z.h / 2, "#ffd4d0");
          return true;
        }
      }
    }
    return false;
  }

  function trefferKanone() {
    leben -= 1;
    lebenEl.textContent = lebenSymbole();
    staub(kanoneX + KANONE_B / 2, KANONE_Y + KANONE_H / 2, "#fff3a8");
    if (!api.reduzierteBewegung) wackeln = 0.4;
    if (leben <= 0) runfeVorbei("leben");
  }

  function staub(x, y, ton) {
    if (api.reduzierteBewegung) return;
    for (let i = 0; i < 10; i++) {
      const w = Math.random() * Math.PI * 2;
      const v = 40 + Math.random() * 90;
      partikel.push({
        x, y, vx: Math.cos(w) * v, vy: Math.sin(w) * v - 30,
        t: 0.3 + Math.random() * 0.25, ton
      });
    }
    if (partikel.length > 160) partikel = partikel.slice(-160);
  }

  function runfeVorbei(grund) {
    if (endeBevor) return;
    endeBevor = true;
    laeuftRunde = false;
    zeichne();
    const text = grund === "erreicht"
      ? "Die Fehlerteufel haben die Tafel erreicht!"
      : "Deine Kreidekanone ist zerstört.";
    api.vorbei(punkte, `<p>${text} · Welle ${welle}</p>`);
  }

  // --- Eingaben ---
  // Tastatur: api.tasten liefert nur keydown. Für gehaltene Bewegung/Feuer einen
  // eigenen keyup-Listener auf api.flaeche ergänzen.
  function istLinks(key) { return key === "ArrowLeft" || key === "a" || key === "A"; }
  function istRechts(key) { return key === "ArrowRight" || key === "d" || key === "D"; }
  function istFeuer(key) { return key === " " || key === "Spacebar"; }

  api.tasten(ev => {
    if (istLinks(ev.key)) halten.links = true;
    else if (istRechts(ev.key)) halten.rechts = true;
    else if (istFeuer(ev.key)) halten.feuer = true;
  });
  api.flaeche.addEventListener("keyup", ev => {
    if (istLinks(ev.key)) halten.links = false;
    else if (istRechts(ev.key)) halten.rechts = false;
    else if (istFeuer(ev.key)) halten.feuer = false;
  });
  api.flaeche.addEventListener("blur", () => {
    halten.links = halten.rechts = halten.feuer = false;
  });
  // Wischen: Tipp feuert einmalig (Komfort auf Touch zusätzlich zu den Tasten).
  api.wisch(richtungWisch => {
    if (richtungWisch === "tipp") {
      if (laeuftRunde && nachlade <= 0) {
        schuesse.push({ x: kanoneX + KANONE_B / 2 - 1.5, y: KANONE_Y - 12, b: 3, h: 12 });
        nachlade = NACHLADE_S;
      }
    } else if (richtungWisch === "links") {
      kanoneX = Math.max(6, kanoneX - 40);
    } else if (richtungWisch === "rechts") {
      kanoneX = Math.min(LOGIK_B - KANONE_B - 6, kanoneX + 40);
    }
  });

  // ---------------------------------------------------------------------------
  // Zeichnen — alles in „Kreide" auf die Tafel
  // ---------------------------------------------------------------------------
  const KREIDE = "#f4f1e6";  // Kreide-Weiß
  const KREIDE_GELB = "#f2d65c";
  const KREIDE_ROT = "#f0a89e";

  function tafelGrund() {
    ctx.fillStyle = TAFEL;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);
    // dezenter heller Holzrahmen
    ctx.strokeStyle = "rgba(214,196,150,0.5)";
    ctx.lineWidth = 4;
    ctx.strokeRect(3, 3, LOGIK_B - 6, LOGIK_H - 6);
    // ein paar „Kreideschlieren" als Atmosphäre (statisch, dezent)
    ctx.strokeStyle = "rgba(244,241,230,0.05)";
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.moveTo(40, 60); ctx.quadraticCurveTo(180, 30, 320, 70);
    ctx.moveTo(380, 420); ctx.quadraticCurveTo(520, 450, 600, 410);
    ctx.stroke();
  }

  // Ein Fehlerteufel: gekritzelter Kringel mit zwei Augen und durchgestrichenem
  // Buchstaben. Reihe bestimmt den „durchgestrichenen Buchstaben" und die Farbe.
  const BUCHSTABEN = ["A", "E", "i", "O", "x"];
  function zeichneGegner(g, t) {
    const cx = g.x + g.b / 2;
    const cy = g.y + g.h / 2;
    // leichtes „Wabbeln" der Beine, außer bei reduzierter Bewegung
    const phase = api.reduzierteBewegung ? 0 : Math.sin(t * 4 + g.spalte) * 1.5;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 2;
    ctx.strokeStyle = g.reihe < 2 ? KREIDE_GELB : KREIDE;
    // Kringel-Körper (leicht unregelmäßig)
    ctx.beginPath();
    ctx.ellipse(0, -1, g.b / 2 - 4, g.h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    // zwei kleine „Hörnchen"
    ctx.beginPath();
    ctx.moveTo(-6, -g.h / 2 + 4); ctx.lineTo(-9, -g.h / 2 - 2);
    ctx.moveTo(6, -g.h / 2 + 4); ctx.lineTo(9, -g.h / 2 - 2);
    ctx.stroke();
    // Beinchen
    ctx.beginPath();
    ctx.moveTo(-8, g.h / 2 - 5); ctx.lineTo(-8, g.h / 2 - 1 + phase);
    ctx.moveTo(0, g.h / 2 - 5); ctx.lineTo(0, g.h / 2 - 1 - phase);
    ctx.moveTo(8, g.h / 2 - 5); ctx.lineTo(8, g.h / 2 - 1 + phase);
    ctx.stroke();
    // Augen
    ctx.fillStyle = ctx.strokeStyle;
    ctx.beginPath(); ctx.arc(-5, -2, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(5, -2, 1.8, 0, Math.PI * 2); ctx.fill();
    // durchgestrichener Buchstabe unter den Augen
    ctx.font = "700 11px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(BUCHSTABEN[g.reihe], 0, 6);
    ctx.beginPath();
    ctx.moveTo(-7, 6); ctx.lineTo(7, 6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  function zeichneKanone(versatzX) {
    const x = kanoneX + versatzX;
    ctx.strokeStyle = KREIDE;
    ctx.fillStyle = "rgba(244,241,230,0.12)";
    ctx.lineWidth = 2;
    // Sockel
    ctx.beginPath();
    ctx.moveTo(x, KANONE_Y + KANONE_H);
    ctx.lineTo(x, KANONE_Y + 7);
    ctx.lineTo(x + 12, KANONE_Y + 7);
    ctx.lineTo(x + KANONE_B / 2 - 4, KANONE_Y);
    ctx.lineTo(x + KANONE_B / 2 + 4, KANONE_Y);
    ctx.lineTo(x + KANONE_B - 12, KANONE_Y + 7);
    ctx.lineTo(x + KANONE_B, KANONE_Y + 7);
    ctx.lineTo(x + KANONE_B, KANONE_Y + KANONE_H);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // kurzes Rohr
    ctx.beginPath();
    ctx.moveTo(x + KANONE_B / 2, KANONE_Y);
    ctx.lineTo(x + KANONE_B / 2, KANONE_Y - 6);
    ctx.lineWidth = 4;
    ctx.stroke();
  }

  function zeichneBunker() {
    ctx.fillStyle = "rgba(240,168,158,0.85)";
    ctx.strokeStyle = "rgba(244,241,230,0.4)";
    ctx.lineWidth = 1;
    for (const zellen of bunker) {
      for (const z of zellen) {
        if (!z.heil) continue;
        ctx.fillRect(z.x, z.y, z.b, z.h);
        ctx.strokeRect(z.x + 0.5, z.y + 0.5, z.b - 1, z.h - 1);
      }
    }
  }

  function zeichne() {
    let wx = 0, wy = 0;
    if (wackeln > 0 && !api.reduzierteBewegung) {
      wx = (Math.random() - 0.5) * 8 * (wackeln / 0.4);
      wy = (Math.random() - 0.5) * 8 * (wackeln / 0.4);
    }
    ctx.save();
    ctx.translate(wx, wy);

    tafelGrund();

    const t = performance.now() / 1000;

    // Gegner
    for (const g of gegner) if (g.lebt) zeichneGegner(g, t);

    // Bunker
    zeichneBunker();

    // eigene Geschosse (Kreidestriche nach oben)
    ctx.strokeStyle = KREIDE;
    ctx.lineWidth = 3;
    for (const s of schuesse) {
      ctx.beginPath();
      ctx.moveTo(s.x + s.b / 2, s.y);
      ctx.lineTo(s.x + s.b / 2, s.y + s.h);
      ctx.stroke();
    }

    // Gegner-Tintenkleckse (gelbe, zackige Tropfen nach unten)
    ctx.fillStyle = KREIDE_GELB;
    for (const k of kleckse) {
      ctx.beginPath();
      ctx.moveTo(k.x + k.b / 2, k.y);
      ctx.lineTo(k.x, k.y + k.h * 0.6);
      ctx.lineTo(k.x + k.b / 2, k.y + k.h);
      ctx.lineTo(k.x + k.b, k.y + k.h * 0.6);
      ctx.closePath();
      ctx.fill();
    }

    // Kanone
    zeichneKanone(0);

    // Kreidestaub-Partikel
    for (const p of partikel) {
      ctx.globalAlpha = Math.max(0, p.t / 0.5);
      ctx.fillStyle = p.ton;
      ctx.fillRect(p.x, p.y, 2, 2);
    }
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  // Abdunkelnde Einblendung mit Text (für das Startbild).
  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(10,28,18,0.55)";
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);
    ctx.fillStyle = KREIDE;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 34px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(haupt, LOGIK_B / 2, LOGIK_H / 2 - 14);
    if (unter) {
      ctx.font = "400 17px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(unter, LOGIK_B / 2, LOGIK_H / 2 + 20);
    }
  }

  api.neustartCb(starteRunde);

  // Ausgangsbild vor dem ersten Start: Tafel + ein paar Fehlerteufel als Deko.
  function startBild() {
    tafelGrund();
    const demo = baueGegner(Math.round((LOGIK_B - (SPALTEN * GEGNER_B + (SPALTEN - 1) * GEGNER_LX)) / 2), 70);
    for (const g of demo) zeichneGegner(g, 0);
    kanoneX = LOGIK_B / 2 - KANONE_B / 2;
    zeichneKanone(0);
    hinweis("Kreide-Invasion", "Drück auf „Start“!");
  }
  startBild();
}
