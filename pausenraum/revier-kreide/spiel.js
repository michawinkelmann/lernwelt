// spiel.js — „Revier-Kreide" (Territorium-Eroberung à la Paper.io) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Flood-Fill der Eroberung, Flächenanteil, Rasterbewegung) ist
// exportiert und in Node testbar — auf Modulebene wird weder document noch window noch
// ein Canvas angefasst, das Canvas entsteht erst in starte().

export const GITTER_B = 40; // Spalten
export const GITTER_H = 28; // Zeilen
export const ZELLE = 16;    // logische Pixelgröße einer Zelle (Canvas: 640 × 448)
export const ZIEL_PROZENT = 50; // motivierende Zielmarke

const DELTA = {
  links: { x: -1, y: 0 }, rechts: { x: 1, y: 0 },
  hoch: { x: 0, y: -1 }, runter: { x: 0, y: 1 }
};
const GEGENRICHTUNG = { links: "rechts", rechts: "links", hoch: "runter", runter: "hoch" };

export const manifest = {
  id: "sp-revier-kreide",
  titel: "Revier-Kreide",
  kurz: "Mal mit Kreide deine Schleife aufs Schulhofpflaster, kehr ins eigene Revier zurück und erobere die eingeschlossene Fläche — kreuze nie deine eigene Spur!",
  punkteLabel: "Fläche",
  punkteEinheit: "%",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Pfeiltasten oder Wischen lenken. Zieh eine Schleife aus deinem Revier heraus und kehre zurück, um die Fläche zu erobern — kreuze nie deine eigene Spur!"
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Nachbarzelle in Blickrichtung. Liefert {x, y} (kann außerhalb des Felds liegen —
// die Randprüfung erfolgt beim Aufrufer; der Rand ist in diesem Spiel TÖDLICH).
export function naechsteZelle(x, y, richtung) {
  const d = DELTA[richtung] || { x: 0, y: 0 };
  return { x: x + d.x, y: y + d.y };
}

// Anteil der einem Spieler gehörenden Zellen am gesamten Feld, in Prozent (0–100).
// besitz = Int-Array der Länge W·H mit Besitzer-Id je Zelle (0 = frei).
export function prozentFlaeche(besitz, spielerId, W, H) {
  let eigen = 0;
  const gesamt = W * H;
  for (let i = 0; i < gesamt; i++) if (besitz[i] === spielerId) eigen++;
  return gesamt > 0 ? (eigen / gesamt) * 100 : 0;
}

// Eroberung nach dem Schließen einer Schleife (Flood-Fill).
//
// Voraussetzung (Spur-Behandlung): Die soeben gezogene Spur ist VOR dem Aufruf
// bereits in `besitz` als `spielerId` eingetragen. Die Spur zählt damit als
// EIGENE GRENZE — zusammen mit dem schon vorhandenen Revier bildet sie eine
// geschlossene Wand, die das eroberte Gebiet umschließt.
//
// Verfahren: Flutung von ALLEN Randzellen aus, aber nur über Zellen, die NICHT
// dem Spieler gehören („außen erreichbar"). Jede danach noch nicht erreichte
// Nicht-Spieler-Zelle liegt im Inneren und wird `spielerId` zugeschlagen — egal,
// wem sie vorher gehörte (auch gegnerisches Revier wird so überschrieben).
//
// Ist die Spur NICHT geschlossen (kein umschlossenes Gebiet), erreicht die Flutung
// alle freien Zellen und es wird nichts gefüllt.
//
// Gibt { besitz, neu } zurück: das (in-place veränderte) Array und die Anzahl neu
// dem Spieler zugeschlagener Zellen.
export function fuelleEingeschlossen(besitz, spielerId, W, H) {
  const gesamt = W * H;
  const aussen = new Uint8Array(gesamt); // 1 = von außen erreichbar (nicht Spieler)
  const stapel = [];

  // Startzellen: alle Randzellen, die NICHT dem Spieler gehören.
  for (let x = 0; x < W; x++) {
    const oben = x;                 // y = 0
    const unten = (H - 1) * W + x;  // y = H-1
    if (besitz[oben] !== spielerId && !aussen[oben]) { aussen[oben] = 1; stapel.push(oben); }
    if (besitz[unten] !== spielerId && !aussen[unten]) { aussen[unten] = 1; stapel.push(unten); }
  }
  for (let y = 0; y < H; y++) {
    const links = y * W;            // x = 0
    const rechts = y * W + (W - 1); // x = W-1
    if (besitz[links] !== spielerId && !aussen[links]) { aussen[links] = 1; stapel.push(links); }
    if (besitz[rechts] !== spielerId && !aussen[rechts]) { aussen[rechts] = 1; stapel.push(rechts); }
  }

  // Iterative 4er-Flutung (kein Rekursionslimit bei großem Feld).
  while (stapel.length) {
    const i = stapel.pop();
    const x = i % W, y = (i - x) / W;
    if (x > 0)     { const j = i - 1; if (!aussen[j] && besitz[j] !== spielerId) { aussen[j] = 1; stapel.push(j); } }
    if (x < W - 1) { const j = i + 1; if (!aussen[j] && besitz[j] !== spielerId) { aussen[j] = 1; stapel.push(j); } }
    if (y > 0)     { const j = i - W; if (!aussen[j] && besitz[j] !== spielerId) { aussen[j] = 1; stapel.push(j); } }
    if (y < H - 1) { const j = i + W; if (!aussen[j] && besitz[j] !== spielerId) { aussen[j] = 1; stapel.push(j); } }
  }

  // Alles, was dem Spieler nicht gehört UND nicht von außen erreichbar ist → erobern.
  let neu = 0;
  for (let i = 0; i < gesamt; i++) {
    if (besitz[i] !== spielerId && !aussen[i]) { besitz[i] = spielerId; neu++; }
  }
  return { besitz, neu };
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  const BREITE_PX = GITTER_B * ZELLE; // 640
  const HOEHE_PX = GITTER_H * ZELLE;  // 448

  // Mindestens 2× rendern: das Canvas wird per CSS auf Containerbreite skaliert.
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(BREITE_PX * faktor);
  canvas.height = Math.round(HOEHE_PX * faktor);
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:72vh;height:auto;margin:0 auto;border-radius:inherit;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // Best-Anzeige (höchster erreichter Anteil) in der Kopfzeile ergänzen
  let bestEl = api.kopf.querySelector("#rk-best");
  if (!bestEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Bestmarke: <b id="rk-best">0&#8201;%</b>';
    api.kopf.appendChild(span);
    bestEl = span.querySelector("b");
  }

  // Bildschirm-Richtungstasten unter der Fläche (nur auf Touch-Geräten sichtbar)
  if (!api.flaeche.parentElement.querySelector(".spiel-touch-tasten")) {
    const tasten = document.createElement("div");
    tasten.className = "spiel-touch-tasten nur-touch";
    tasten.innerHTML =
      '<span></span><button type="button" data-richtung="hoch" aria-label="Nach oben">&#9650;</button><span></span>' +
      '<button type="button" data-richtung="links" aria-label="Nach links">&#9664;</button>' +
      '<button type="button" data-richtung="runter" aria-label="Nach unten">&#9660;</button>' +
      '<button type="button" data-richtung="rechts" aria-label="Nach rechts">&#9654;</button>';
    api.flaeche.insertAdjacentElement("afterend", tasten);
    tasten.addEventListener("click", ev => {
      const knopf = ev.target.closest("button[data-richtung]");
      if (!knopf) return;
      wuensche(knopf.dataset.richtung);
      api.flaeche.focus({ preventScroll: true });
    });
  }

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  const idx = (x, y) => y * GITTER_B + x;
  const imFeld = (x, y) => x >= 0 && y >= 0 && x < GITTER_B && y < GITTER_H;

  const ANZ = GITTER_B * GITTER_H;
  // Drei Akteure: 1 = Spieler, 2 & 3 = KI-Gegner.
  const SPIELER = 1;
  const GEGNER_IDS = [2, 3];

  // Zustand (wird in starteRunde() gesetzt)
  let besitz = new Int16Array(ANZ);   // Besitzer-Id je Zelle (0 = frei)
  let spurFeld = new Int16Array(ANZ); // Akteur-Id der Spur in dieser Zelle (0 = keine)
  let akteure = [];                   // { id, x, y, richtung, lebt, respawnT, spur:[], istKi, kiZiel }
  let akku = 0;
  let laeuftRunde = false;
  let maxProzent = 0;
  let wunschListe = [];

  // Start-Reviere möglichst weit auseinander setzen (3×3-Block).
  const STARTPLAETZE = [
    { x: 5, y: 13 },
    { x: GITTER_B - 6, y: 5 },
    { x: GITTER_B - 6, y: GITTER_H - 6 }
  ];

  function setzeRevier(id, cx, cy) {
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const x = cx + dx, y = cy + dy;
        if (imFeld(x, y)) besitz[idx(x, y)] = id;
      }
    }
  }

  // Akteur (klein) neu aufsetzen: altes Revier + Spur löschen, frisches 3×3-Revier.
  function setzeAkteur(a, platz) {
    // bestehende Spur entfernen
    loescheSpur(a);
    // bestehendes Revier dieses Akteurs entfernen
    for (let i = 0; i < ANZ; i++) if (besitz[i] === a.id) besitz[i] = 0;
    a.x = platz.x; a.y = platz.y;
    a.richtung = a.id === SPIELER ? "rechts" : (a.id % 2 === 0 ? "links" : "hoch");
    a.lebt = true;
    a.respawnT = 0;
    a.spur = [];
    a.kiZiel = null;
    a.kiSchritte = 0;
    setzeRevier(a.id, platz.x, platz.y);
  }

  function loescheSpur(a) {
    for (const z of a.spur) {
      if (spurFeld[idx(z.x, z.y)] === a.id) spurFeld[idx(z.x, z.y)] = 0;
    }
    a.spur = [];
  }

  function starteRunde() {
    besitz = new Int16Array(ANZ);
    spurFeld = new Int16Array(ANZ);
    akteure = [];
    const ids = [SPIELER, ...GEGNER_IDS];
    ids.forEach((id, k) => {
      const a = { id, x: 0, y: 0, richtung: "rechts", lebt: true, respawnT: 0, spur: [], istKi: id !== SPIELER, kiZiel: null, kiSchritte: 0 };
      akteure.push(a);
      setzeAkteur(a, STARTPLAETZE[k] || STARTPLAETZE[0]);
    });
    akku = 0;
    maxProzent = 0;
    wunschListe = [];
    laeuftRunde = true;
    api.setzePunkte(0);
    bestEl.innerHTML = "0&#8201;%";
    api.loop(schleife);
  }

  // Schrittfrequenz: bei reduzierter Bewegung etwas gemächlicher.
  const ZUEGE_PRO_SEK = api.reduzierteBewegung ? 7 : 9;

  function schleife(dt) {
    akku += dt;
    const schritt = 1 / ZUEGE_PRO_SEK;
    let runden = 0;
    while (laeuftRunde && akku >= schritt && runden < 5) {
      akku -= schritt;
      tick();
      runden++;
    }
    if (laeuftRunde) zeichne();
  }

  // Hilft der Eingabe: nächste gewünschte Richtung des Spielers (keine 180°-Wende).
  function naechsterWunsch(a) {
    while (wunschListe.length) {
      const w = wunschListe.shift();
      if (w && DELTA[w] && w !== GEGENRICHTUNG[a.richtung]) return w;
    }
    return a.richtung;
  }

  function tick() {
    const spieler = akteure[0];

    // 1) Richtungen bestimmen
    if (spieler.lebt) spieler.richtung = naechsterWunsch(spieler);
    for (const a of akteure) {
      if (a.istKi && a.lebt) a.richtung = kiRichtung(a);
    }

    // 2) Bewegungen + Spuren ausführen, Tode sammeln
    const gestorben = new Set();
    for (const a of akteure) {
      if (!a.lebt) continue;
      const ziel = naechsteZelle(a.x, a.y, a.richtung);

      // Rand ist tödlich
      if (!imFeld(ziel.x, ziel.y)) { gestorben.add(a.id); continue; }

      const zIdx = idx(ziel.x, ziel.y);

      // In FREMDE Spur laufen → der FREMDE stirbt (man „schlägt" ihn); man selbst lebt.
      const fremdeSpur = spurFeld[zIdx];
      if (fremdeSpur && fremdeSpur !== a.id) {
        gestorben.add(fremdeSpur);
      }

      // In die EIGENE Spur laufen → man selbst stirbt.
      if (spurFeld[zIdx] === a.id) {
        gestorben.add(a.id);
        continue;
      }

      // Bewegung ausführen
      a.x = ziel.x; a.y = ziel.y;

      // Spur legen / Eroberung auslösen
      if (besitz[zIdx] === a.id) {
        // im eigenen Revier: falls eine Spur offen war → Schleife schließen, erobern
        if (a.spur.length) erobere(a);
      } else {
        // außerhalb: Spur hinterlassen
        if (spurFeld[zIdx] !== a.id) {
          spurFeld[zIdx] = a.id;
          a.spur.push({ x: ziel.x, y: ziel.y });
        }
      }
    }

    // 3) Tode abwickeln (Spuren auflösen, Respawn vormerken)
    for (const a of akteure) {
      if (gestorben.has(a.id) && a.lebt) {
        a.lebt = false;
        a.respawnT = a.istKi ? 1.2 : 0; // Spieler-Tod beendet die Runde sofort
        loescheSpur(a);
      }
    }

    // 4) Spieler tot? → Runde vorbei
    if (!spieler.lebt) {
      laeuftRunde = false;
      aktualisiereProzent();
      zeichne();
      const info = maxProzent >= ZIEL_PROZENT
        ? `<p>Stark! Du hast die ${ZIEL_PROZENT}&#8201;%-Marke geknackt — Bestmarke ${maxProzent}&#8201;%.</p>`
        : `<p>Erobert: ${maxProzent}&#8201;% — Ziel waren ${ZIEL_PROZENT}&#8201;%. Zieh größere Schleifen!</p>`;
      api.vorbei(maxProzent, info);
      return;
    }

    // 5) KI-Respawns herunterzählen
    for (const a of akteure) {
      if (a.istKi && !a.lebt) {
        a.respawnT -= 1 / ZUEGE_PRO_SEK;
        if (a.respawnT <= 0) setzeAkteur(a, freierStartplatz());
      }
    }

    aktualisiereProzent();
  }

  // Spieler hat ins eigene Revier zurückgefunden → Spur + Inneres erobern.
  function erobere(a) {
    // Spur als eigene Grenze fest ins Revier übernehmen …
    for (const z of a.spur) {
      besitz[idx(z.x, z.y)] = a.id;
      spurFeld[idx(z.x, z.y)] = 0;
    }
    a.spur = [];
    // … dann das eingeschlossene Gebiet zuschlagen.
    const vorher = besitzAnzahl(a.id);
    fuelleEingeschlossen(besitz, a.id, GITTER_B, GITTER_H);
    // Eroberte Zellen lösen ggf. fremde offene Spuren mittendrin auf — defensiv säubern.
    for (let i = 0; i < ANZ; i++) {
      if (spurFeld[i] && besitz[i] === a.id) {
        const opfer = akteure.find(x => x.id === spurFeld[i]);
        if (opfer && opfer.id !== a.id) { /* Spur liegt jetzt in fremdem Land — bleibt, bis Opfer schließt */ }
      }
    }
    return besitzAnzahl(a.id) - vorher;
  }

  function besitzAnzahl(id) {
    let n = 0;
    for (let i = 0; i < ANZ; i++) if (besitz[i] === id) n++;
    return n;
  }

  function aktualisiereProzent() {
    const p = Math.round(prozentFlaeche(besitz, SPIELER, GITTER_B, GITTER_H));
    api.setzePunkte(p);
    if (p > maxProzent) {
      maxProzent = p;
      bestEl.innerHTML = maxProzent + "&#8201;%";
    }
  }

  function freierStartplatz() {
    // Suche einen 3×3-Bereich, der möglichst frei ist.
    let bester = STARTPLAETZE[1], besteFrei = -1;
    const kandidaten = [
      ...STARTPLAETZE,
      { x: GITTER_B >> 1, y: 3 },
      { x: GITTER_B >> 1, y: GITTER_H - 4 },
      { x: 5, y: 4 }, { x: 5, y: GITTER_H - 5 }
    ];
    for (const k of kandidaten) {
      let frei = 0;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const x = k.x + dx, y = k.y + dy;
          if (imFeld(x, y) && besitz[idx(x, y)] === 0 && spurFeld[idx(x, y)] === 0) frei++;
        }
      if (frei > besteFrei) { besteFrei = frei; bester = k; }
    }
    return bester;
  }

  // --- Einfache KI: gieriges Ausbeulen + Heimkehr, vermeidet sofortigen Tod ---
  function kiRichtung(a) {
    const dirs = ["hoch", "runter", "links", "rechts"];
    const sicher = dirs.filter(d => d !== GEGENRICHTUNG[a.richtung] && istKiSchritt(a, d));
    const auswahl = sicher.length ? sicher : dirs.filter(d => istKiSchritt(a, d));
    if (!auswahl.length) return a.richtung; // ausweglos → läuft weiter (stirbt am Rand)

    a.kiSchritte = (a.kiSchritte || 0) + 1;
    const draussen = besitz[idx(a.x, a.y)] !== a.id;

    // Genug ausgebeult oder kurz vor dem eigenen Schwanz → heimkehren.
    if (draussen && (a.spur.length >= 7 || Math.random() < 0.04)) {
      const heim = richtungZu(a, naechstesEigenes(a));
      if (heim && auswahl.includes(heim)) return heim;
    }

    // Sonst meist geradeaus weiter (ergibt schöne Rechtecke), gelegentlich abbiegen.
    if (auswahl.includes(a.richtung) && Math.random() < 0.78) return a.richtung;
    return auswahl[Math.floor(Math.random() * auswahl.length)];
  }

  // Ist ein Schritt für die KI sofort tödlich? (Rand oder eigene Spur)
  function istKiSchritt(a, d) {
    const z = naechsteZelle(a.x, a.y, d);
    if (!imFeld(z.x, z.y)) return false;
    if (spurFeld[idx(z.x, z.y)] === a.id) return false;
    return true;
  }

  // Nächste eigene Reviers-Zelle (grobe Heuristik: Mittelpunkt des eigenen Reviers).
  function naechstesEigenes(a) {
    let sx = 0, sy = 0, n = 0;
    for (let i = 0; i < ANZ; i++) {
      if (besitz[i] === a.id) {
        const x = i % GITTER_B, y = (i - x) / GITTER_B;
        sx += x; sy += y; n++;
      }
    }
    if (!n) return { x: a.x, y: a.y };
    return { x: Math.round(sx / n), y: Math.round(sy / n) };
  }

  function richtungZu(a, ziel) {
    const dx = ziel.x - a.x, dy = ziel.y - a.y;
    if (Math.abs(dx) >= Math.abs(dy)) return dx === 0 ? (dy > 0 ? "runter" : "hoch") : (dx > 0 ? "rechts" : "links");
    return dy === 0 ? (dx > 0 ? "rechts" : "links") : (dy > 0 ? "runter" : "hoch");
  }

  // --- Eingaben ---
  function wuensche(richtung) {
    if (!laeuftRunde || !DELTA[richtung]) return;
    const spieler = akteure[0];
    if (!spieler || !spieler.lebt) return;
    const letzte = wunschListe.length ? wunschListe[wunschListe.length - 1] : spieler.richtung;
    if (richtung === letzte || richtung === GEGENRICHTUNG[letzte]) return; // 180° / Doppelung ignorieren
    if (wunschListe.length < 2) wunschListe.push(richtung);
  }

  const TASTE_RICHTUNG = {
    ArrowLeft: "links", ArrowRight: "rechts", ArrowUp: "hoch", ArrowDown: "runter",
    a: "links", d: "rechts", w: "hoch", s: "runter",
    A: "links", D: "rechts", W: "hoch", S: "runter"
  };
  api.tasten(ev => {
    const richtung = TASTE_RICHTUNG[ev.key];
    if (richtung) wuensche(richtung);
  });
  api.wisch(richtung => { if (richtung !== "tipp") wuensche(richtung); });

  // --- Zeichnen ---
  function fuellZelle(x, y, alpha) {
    if (alpha != null) ctx.globalAlpha = alpha;
    ctx.fillRect(x * ZELLE, y * ZELLE, ZELLE, ZELLE);
    if (alpha != null) ctx.globalAlpha = 1;
  }

  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      gitter: farbe("--karo", "rgba(125,108,80,0.16)"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      spieler: farbe("--akzent", "#19599f"),
      gegner1: farbe("--fehler", "#b3261e"),
      gegner2: farbe("--physik", "#a3570e")
    };
    const farbeFuer = id => id === SPIELER ? F.spieler : id === GEGNER_IDS[0] ? F.gegner1 : F.gegner2;

    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, BREITE_PX, HOEHE_PX);

    // Revier (flächig, halbtransparent)
    for (let i = 0; i < ANZ; i++) {
      const id = besitz[i];
      if (!id) continue;
      const x = i % GITTER_B, y = (i - x) / GITTER_B;
      ctx.fillStyle = farbeFuer(id);
      fuellZelle(x, y, 0.32);
    }

    // dezentes Gitter
    ctx.strokeStyle = F.gitter;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < GITTER_B; x++) { ctx.moveTo(x * ZELLE + 0.5, 0); ctx.lineTo(x * ZELLE + 0.5, HOEHE_PX); }
    for (let y = 1; y < GITTER_H; y++) { ctx.moveTo(0, y * ZELLE + 0.5); ctx.lineTo(BREITE_PX, y * ZELLE + 0.5); }
    ctx.stroke();

    // Spuren (kräftig)
    for (let i = 0; i < ANZ; i++) {
      const id = spurFeld[i];
      if (!id) continue;
      const x = i % GITTER_B, y = (i - x) / GITTER_B;
      ctx.fillStyle = farbeFuer(id);
      ctx.globalAlpha = 0.85;
      ctx.fillRect(x * ZELLE + 2, y * ZELLE + 2, ZELLE - 4, ZELLE - 4);
      ctx.globalAlpha = 1;
    }

    // Köpfe (volle Farbe, kleiner Rahmen für Kontrast)
    for (const a of akteure) {
      if (!a.lebt) continue;
      ctx.fillStyle = farbeFuer(a.id);
      ctx.fillRect(a.x * ZELLE + 1, a.y * ZELLE + 1, ZELLE - 2, ZELLE - 2);
      ctx.fillStyle = F.bg;
      const cx = a.x * ZELLE + ZELLE / 2, cy = a.y * ZELLE + ZELLE / 2;
      ctx.beginPath(); ctx.arc(cx, cy, 2.4, 0, 2 * Math.PI); ctx.fill();
    }

    // Live-Prozentzahl oben links
    const p = Math.round(prozentFlaeche(besitz, SPIELER, GITTER_B, GITTER_H));
    ctx.fillStyle = F.spieler;
    ctx.globalAlpha = 0.9;
    ctx.font = "700 18px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText("Dein Revier: " + p + " %", 8, 8);
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
  }

  // Abdunkelnde Einblendung mit Text (funktioniert in Hell- und Dunkelmodus)
  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(20,18,14,0.55)";
    ctx.fillRect(0, 0, BREITE_PX, HOEHE_PX);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 30px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(haupt, BREITE_PX / 2, HOEHE_PX / 2 - 12);
    if (unter) {
      ctx.font = "400 16px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(unter, BREITE_PX / 2, HOEHE_PX / 2 + 18);
    }
    ctx.textBaseline = "alphabetic";
  }

  api.neustartCb(starteRunde);

  // Ausgangsbild vor dem ersten Start
  besitz = new Int16Array(ANZ);
  spurFeld = new Int16Array(ANZ);
  akteure = [
    { id: SPIELER, x: STARTPLAETZE[0].x, y: STARTPLAETZE[0].y, richtung: "rechts", lebt: true, respawnT: 0, spur: [], istKi: false, kiZiel: null, kiSchritte: 0 },
    { id: GEGNER_IDS[0], x: STARTPLAETZE[1].x, y: STARTPLAETZE[1].y, richtung: "links", lebt: true, respawnT: 0, spur: [], istKi: true, kiZiel: null, kiSchritte: 0 },
    { id: GEGNER_IDS[1], x: STARTPLAETZE[2].x, y: STARTPLAETZE[2].y, richtung: "hoch", lebt: true, respawnT: 0, spur: [], istKi: true, kiZiel: null, kiSchritte: 0 }
  ];
  akteure.forEach((a, k) => setzeRevier(a.id, STARTPLAETZE[k].x, STARTPLAETZE[k].y));
  zeichne();
  hinweis("Revier-Kreide", "Drück auf „Start“!");
}
