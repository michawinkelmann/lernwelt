// spiel.js — Pong-Duell: zwei Spieler an einer Tastatur (oder per Touch),
// erster mit 7 Punkten gewinnt. Läuft im gemeinsamen Spiel-Gerüst
// (assets/js/spiel/geruest.js): Dieses Modul liefert manifest + starte(api),
// das Gerüst übernimmt Kopfzeile, Start-Knopf, Game-Loop und Panel.
//
// Testbarkeit wie bei den Simulationen: Die reine Spiellogik (Abprallwinkel,
// Wandreflexion, Punktvergabe, Siegprüfung, Tempoanstieg) steht DOM-frei auf
// Modulebene und läuft per selbsttest() auch in Node. Alles mit
// document/canvas lebt ausschließlich in starte().
//
// prefers-reduced-motion: Die Ballbewegung ist der Spielinhalt selbst und
// bleibt; auf dekorative Zusatzanimationen (Blinken, Nachzieheffekte,
// Einblend-Effekte) wird grundsätzlich verzichtet. Alle Meldungen erscheinen
// als ruhiger Text mit Zahlen — nie nur über Farbe.

export const manifest = {
  id: "sp-pong-duell",
  titel: "Pong-Duell",
  kurz: "Zwei Schläger, ein Ball, eine Tastatur: Fordere deine Sitznachbarin oder deinen Sitznachbarn heraus — erster mit 7 Punkten gewinnt.",
  punkteLabel: "Stand",
  highscore: false,
  zeigeZeit: false,
  steuerungHinweis: "Links: W/S — Rechts: ↑/↓. Touch: linke bzw. rechte Bildschirmhälfte ziehen. Erster mit 7 gewinnt."
};

// ===== Spielfeld-Konstanten (logische Koordinaten, unabhängig von Pixeln) =====
export const BREITE = 480;
export const HOEHE = 300;
export const SCHLAEGER_HOEHE = 60;
export const SCHLAEGER_BREITE = 8;
export const SCHLAEGER_RAND = 10;          // Abstand der Schläger vom Spielfeldrand
export const SCHLAEGER_TEMPO = 260;        // px/s bei gehaltener Taste
export const BALL_RADIUS = 5;
export const BALL_TEMPO_START = 200;       // px/s beim Aufschlag
export const BALL_TEMPO_MAX = 380;         // Deckel für den Tempoanstieg
export const TEMPO_FAKTOR = 1.04;          // +4 % je Schlägerkontakt
export const MAX_WINKEL = 55 * Math.PI / 180; // maximaler Abprallwinkel (±55°)
export const SIEG_PUNKTE = 7;

// ===== Reine Logik (DOM-frei, in Node testbar) =====

// Abprallwinkel am Schläger: Auftreffpunkt in der Schlägermitte → 0°
// (waagerecht zurück), an den Kanten → ±MAX_WINKEL. Dazwischen streng monoton:
//   anteil = (trefferY − schlaegerMitte) / (hoehe / 2), gekappt auf [−1, 1]
//   winkel = anteil · MAX_WINKEL
export function schlaegerWinkel(trefferY, schlaegerY, hoehe = SCHLAEGER_HOEHE) {
  const mitte = schlaegerY + hoehe / 2;
  const anteil = Math.max(-1, Math.min(1, (trefferY - mitte) / (hoehe / 2)));
  return anteil * MAX_WINKEL;
}

// Reflexion an Ober-/Unterkante: kehrt vy um und spiegelt die Position zurück
// ins Feld, damit der Ball nicht an der Wand "klebt". Liefert { y, vy }.
export function reflektiereY(y, vy, radius = BALL_RADIUS, hoehe = HOEHE) {
  if (y - radius < 0) return { y: 2 * radius - y, vy: Math.abs(vy) };
  if (y + radius > hoehe) return { y: 2 * (hoehe - radius) - y, vy: -Math.abs(vy) };
  return { y, vy };
}

// Punktvergabe: Ball links vollständig raus → Punkt für RECHTS (und umgekehrt).
export function punktLogik(x, radius = BALL_RADIUS, breite = BREITE) {
  if (x + radius < 0) return "rechts";
  if (x - radius > breite) return "links";
  return null;
}

// Siegprüfung: Wer zuerst `ziel` Punkte erreicht, gewinnt.
export function siegPruefung(punkteLinks, punkteRechts, ziel = SIEG_PUNKTE) {
  if (punkteLinks >= ziel) return "links";
  if (punkteRechts >= ziel) return "rechts";
  return null;
}

// +4 % Tempo je Schlägerkontakt, gedeckelt bei BALL_TEMPO_MAX.
export function steigereTempo(tempo) {
  return Math.min(BALL_TEMPO_MAX, tempo * TEMPO_FAKTOR);
}

// ===== Selbsttest (läuft in Node: import("./spiel.js").then(m => m.selbsttest())) =====
export function selbsttest() {
  const faelle = [];
  const pruefe = (name, ok, detail = "") => faelle.push({ name, ok: !!ok, detail: String(detail) });
  const nahe = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

  // Abprallwinkel: Schläger bei y=100, Höhe 60 → Mitte bei 130
  pruefe("Winkel Schlägermitte = 0°", nahe(schlaegerWinkel(130, 100, 60), 0));
  pruefe("Winkel obere Kante = −55°", nahe(schlaegerWinkel(100, 100, 60), -MAX_WINKEL));
  pruefe("Winkel untere Kante = +55°", nahe(schlaegerWinkel(160, 100, 60), MAX_WINKEL));
  pruefe("Winkel halbe Strecke = +27,5°", nahe(schlaegerWinkel(145, 100, 60), MAX_WINKEL / 2));
  let monoton = true, letzter = -Infinity;
  for (let y = 100; y <= 160; y += 5) {
    const w = schlaegerWinkel(y, 100, 60);
    if (w < letzter) monoton = false;
    letzter = w;
  }
  pruefe("Winkel über den Schläger monoton steigend", monoton);
  pruefe("Winkel oberhalb der Kante gekappt", nahe(schlaegerWinkel(80, 100, 60), -MAX_WINKEL));
  pruefe("Winkel unterhalb der Kante gekappt", nahe(schlaegerWinkel(200, 100, 60), MAX_WINKEL));

  // Wandreflexion (Radius 5, Feldhöhe 300)
  const oben = reflektiereY(3, -120, 5, 300);
  pruefe("Reflexion oben: vy wird positiv, Position gespiegelt", oben.vy === 120 && nahe(oben.y, 7), JSON.stringify(oben));
  const unten = reflektiereY(297, 120, 5, 300);
  pruefe("Reflexion unten: vy wird negativ, Position gespiegelt", unten.vy === -120 && nahe(unten.y, 293), JSON.stringify(unten));
  const mitte = reflektiereY(150, 80, 5, 300);
  pruefe("Feldmitte: keine Reflexion", mitte.y === 150 && mitte.vy === 80);

  // Punktlogik (Ball muss vollständig draußen sein)
  pruefe("Ball links raus → Punkt für RECHTS", punktLogik(-6, 5, 480) === "rechts");
  pruefe("Ball rechts raus → Punkt für LINKS", punktLogik(486, 5, 480) === "links");
  pruefe("Ball im Feld → kein Punkt", punktLogik(240, 5, 480) === null);
  pruefe("Ball berührt Torlinie → noch kein Punkt", punktLogik(-5, 5, 480) === null);

  // Siegprüfung (erster mit 7)
  pruefe("7:5 → LINKS gewinnt", siegPruefung(7, 5) === "links");
  pruefe("3:7 → RECHTS gewinnt", siegPruefung(3, 7) === "rechts");
  pruefe("6:6 → noch kein Sieger", siegPruefung(6, 6) === null);

  // Tempoanstieg: +4 % je Kontakt, Deckel 380
  pruefe("Tempo 200 → 208 nach einem Kontakt", nahe(steigereTempo(200), 208));
  pruefe("Tempo wird bei 380 gedeckelt", steigereTempo(375) === 380 && steigereTempo(380) === 380);

  return { gesamt: faelle.length, bestanden: faelle.filter(f => f.ok).length, faelle };
}

// ===== Browser-Teil: Darstellung + Eingaben (nur hier document/canvas) =====
export function starte(api) {
  // Canvas in logischen Koordinaten 480×300, auf HiDPI-Displays scharf
  const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(BREITE * dpr);
  canvas.height = Math.round(HOEHE * dpr);
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.scale(dpr, dpr);

  // Farben aus den Design-Tokens (folgen Hell-/Dunkelmodus), mit Notfallwerten
  const stil = getComputedStyle(document.body);
  const farbe = (name, ersatz) => (stil.getPropertyValue(name) || "").trim() || ersatz;
  const FARBE = {
    linie: farbe("--linie", "#999999"),
    text: farbe("--text", "#222222"),
    leise: farbe("--text-leise", "#666666"),
    akzent: farbe("--akzent", "#19599f")
  };
  const SCHRIFT = "system-ui, sans-serif";

  const XL = SCHLAEGER_RAND;                              // linke Schlägerkante
  const XR = BREITE - SCHLAEGER_RAND - SCHLAEGER_BREITE;  // rechter Schläger, linke Kante

  // Veränderlicher Spielzustand
  const z = {};
  function reset() {
    z.punkteL = 0;
    z.punkteR = 0;
    z.schlL = (HOEHE - SCHLAEGER_HOEHE) / 2;
    z.schlR = (HOEHE - SCHLAEGER_HOEHE) / 2;
    z.ball = { x: BREITE / 2, y: HOEHE / 2, vx: 0, vy: 0, tempo: BALL_TEMPO_START };
    z.aufschlagSeite = Math.random() < 0.5 ? -1 : 1; // −1 = Aufschlag nach links, +1 = nach rechts
    z.phase = "bereit";                              // bereit | pause | laeuft | ende
    z.pauseRest = 0;
    z.gross = "Pong-Duell";
    z.klein = "Taste drücken oder Start — erster mit 7 gewinnt";
    api.setzePunkte("0 : 0");
  }

  function aufschlag() {
    const richtung = z.aufschlagSeite;
    z.aufschlagSeite = -z.aufschlagSeite; // Aufschlag wechselt bei jedem Ballwechsel
    const winkel = (Math.random() * 2 - 1) * (35 * Math.PI / 180);
    z.ball.x = BREITE / 2;
    z.ball.y = HOEHE / 2;
    z.ball.tempo = BALL_TEMPO_START;
    z.ball.vx = Math.cos(winkel) * z.ball.tempo * richtung;
    z.ball.vy = Math.sin(winkel) * z.ball.tempo;
    z.phase = "laeuft";
  }

  function punktFuer(seite) {
    if (seite === "links") z.punkteL++; else z.punkteR++;
    api.setzePunkte(`${z.punkteL} : ${z.punkteR}`);
    z.ball.x = BREITE / 2; z.ball.y = HOEHE / 2; z.ball.vx = 0; z.ball.vy = 0;
    const sieger = siegPruefung(z.punkteL, z.punkteR);
    if (sieger) { spielEnde(sieger); return; }
    // 1 s Stopp: Stand groß einblenden (Zahlen + Text, nie nur Farbe)
    z.phase = "pause";
    z.pauseRest = 1.0;
    z.gross = `${z.punkteL} : ${z.punkteR}`;
    z.klein = `Punkt für ${seite === "links" ? "LINKS" : "RECHTS"} — Aufschlag folgt`;
  }

  function spielEnde(sieger) {
    z.phase = "ende";
    z.gross = `${z.punkteL} : ${z.punkteR}`;
    z.klein = "";
    zeichne();
    api.loopStopp();
    const verlierer = Math.min(z.punkteL, z.punkteR);
    const wer = sieger === "links" ? "LINKS" : "RECHTS";
    api.zeigePanel(`
      <h2>${wer} gewinnt ${SIEG_PUNKTE}:${verlierer}!</h2>
      <p>Starkes Match! Der Aufschlag merkt sich nichts — die Revanche beginnt wieder bei 0 : 0.</p>
      <div class="sp-panel-knoepfe"><button type="button" class="knopf" id="pd-revanche">Revanche?</button></div>`);
    const knopf = document.getElementById("pd-revanche");
    knopf.addEventListener("click", () => { api.versteckePanel(); neustart(); });
    knopf.focus();
  }

  function neustart() {
    reset();
    z.phase = "pause";
    z.pauseRest = 1.0;
    z.gross = "0 : 0";
    z.klein = "Los geht's!";
    api.loop(tick);
    api.flaeche.focus({ preventScroll: true });
  }
  api.neustartCb(neustart);

  // --- Tastatur: gehaltene Tasten als Set. api.tasten liefert nur keydown,
  //     deshalb eigenes keyup (und blur als Sicherung) auf der Spielfläche. ---
  const gehalten = new Set();
  const RELEVANT = new Set(["w", "s", "ArrowUp", "ArrowDown"]);
  const normalisiere = taste => (taste === "ArrowUp" || taste === "ArrowDown") ? taste : String(taste).toLowerCase();
  api.tasten(ev => {
    const t = normalisiere(ev.key);
    if (!RELEVANT.has(t)) return;
    gehalten.add(t);
    if (z.phase === "bereit") neustart();
  });
  api.flaeche.addEventListener("keyup", ev => gehalten.delete(normalisiere(ev.key)));
  api.flaeche.addEventListener("blur", () => gehalten.clear());

  // --- Touch/Maus: Ziehen in der linken/rechten Hälfte bewegt den jeweiligen
  //     Schläger. Mehrere Finger gleichzeitig: Zuordnung pro pointerId. ---
  const zeiger = new Map(); // pointerId → "links" | "rechts"
  const logisch = ev => {
    const r = canvas.getBoundingClientRect();
    return { x: (ev.clientX - r.left) * (BREITE / r.width), y: (ev.clientY - r.top) * (HOEHE / r.height) };
  };
  const ziehe = (seite, y) => {
    const ziel = Math.max(0, Math.min(HOEHE - SCHLAEGER_HOEHE, y - SCHLAEGER_HOEHE / 2));
    if (seite === "links") z.schlL = ziel; else z.schlR = ziel;
  };
  canvas.addEventListener("pointerdown", ev => {
    const p = logisch(ev);
    const seite = p.x < BREITE / 2 ? "links" : "rechts";
    zeiger.set(ev.pointerId, seite);
    try { canvas.setPointerCapture(ev.pointerId); } catch (_f) { /* ältere Browser */ }
    ziehe(seite, p.y);
    api.flaeche.focus({ preventScroll: true });
    if (z.phase === "bereit") neustart();
  });
  canvas.addEventListener("pointermove", ev => {
    const seite = zeiger.get(ev.pointerId);
    if (seite) ziehe(seite, logisch(ev).y);
  });
  for (const typ of ["pointerup", "pointercancel"]) {
    canvas.addEventListener(typ, ev => zeiger.delete(ev.pointerId));
  }

  // --- Spielschritt ---
  function update(dt) {
    // Schläger per Tastatur (Touch setzt die Position direkt)
    let richtungL = 0, richtungR = 0;
    if (gehalten.has("w")) richtungL -= 1;
    if (gehalten.has("s")) richtungL += 1;
    if (gehalten.has("ArrowUp")) richtungR -= 1;
    if (gehalten.has("ArrowDown")) richtungR += 1;
    z.schlL = Math.max(0, Math.min(HOEHE - SCHLAEGER_HOEHE, z.schlL + richtungL * SCHLAEGER_TEMPO * dt));
    z.schlR = Math.max(0, Math.min(HOEHE - SCHLAEGER_HOEHE, z.schlR + richtungR * SCHLAEGER_TEMPO * dt));

    if (z.phase === "pause") {
      z.pauseRest -= dt;
      if (z.pauseRest <= 0) aufschlag();
      return;
    }
    if (z.phase !== "laeuft") return;

    const b = z.ball;
    const altX = b.x, altY = b.y;
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    // Wand oben/unten
    const wand = reflektiereY(b.y, b.vy);
    b.y = wand.y;
    b.vy = wand.vy;

    // Schlägerkontakt: Prüfung entlang der zurückgelegten Strecke, damit der
    // Ball bei hohem Tempo nicht durch den Schläger "tunnelt".
    const ebeneL = XL + SCHLAEGER_BREITE; // rechte Kante des linken Schlägers
    if (b.vx < 0 && altX - BALL_RADIUS > ebeneL && b.x - BALL_RADIUS <= ebeneL) {
      const t = ((altX - BALL_RADIUS) - ebeneL) / ((altX - BALL_RADIUS) - (b.x - BALL_RADIUS));
      const yKreuz = altY + (b.y - altY) * t;
      if (yKreuz >= z.schlL - BALL_RADIUS && yKreuz <= z.schlL + SCHLAEGER_HOEHE + BALL_RADIUS) {
        const winkel = schlaegerWinkel(yKreuz, z.schlL);
        b.tempo = steigereTempo(b.tempo);
        b.vx = Math.cos(winkel) * b.tempo;
        b.vy = Math.sin(winkel) * b.tempo;
        b.x = ebeneL + BALL_RADIUS;
        b.y = yKreuz;
      }
    }
    const ebeneR = XR; // linke Kante des rechten Schlägers
    if (b.vx > 0 && altX + BALL_RADIUS < ebeneR && b.x + BALL_RADIUS >= ebeneR) {
      const t = (ebeneR - (altX + BALL_RADIUS)) / ((b.x + BALL_RADIUS) - (altX + BALL_RADIUS));
      const yKreuz = altY + (b.y - altY) * t;
      if (yKreuz >= z.schlR - BALL_RADIUS && yKreuz <= z.schlR + SCHLAEGER_HOEHE + BALL_RADIUS) {
        const winkel = schlaegerWinkel(yKreuz, z.schlR);
        b.tempo = steigereTempo(b.tempo);
        b.vx = -Math.cos(winkel) * b.tempo;
        b.vy = Math.sin(winkel) * b.tempo;
        b.x = ebeneR - BALL_RADIUS;
        b.y = yKreuz;
      }
    }

    const punkt = punktLogik(b.x);
    if (punkt) punktFuer(punkt);
  }

  // --- Darstellung ---
  function zeichne() {
    ctx.clearRect(0, 0, BREITE, HOEHE);

    // Mittellinie (gestrichelt)
    ctx.strokeStyle = FARBE.linie;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(BREITE / 2, 6);
    ctx.lineTo(BREITE / 2, HOEHE - 6);
    ctx.stroke();
    ctx.setLineDash([]);

    // Stand dauerhaft klein neben der Mittellinie (Zahlen, nicht nur Farbe)
    ctx.fillStyle = FARBE.leise;
    ctx.font = `700 20px ${SCHRIFT}`;
    ctx.textAlign = "center";
    ctx.fillText(String(z.punkteL), BREITE / 2 - 40, 28);
    ctx.fillText(String(z.punkteR), BREITE / 2 + 40, 28);

    // Schläger
    ctx.fillStyle = FARBE.text;
    ctx.fillRect(XL, z.schlL, SCHLAEGER_BREITE, SCHLAEGER_HOEHE);
    ctx.fillRect(XR, z.schlR, SCHLAEGER_BREITE, SCHLAEGER_HOEHE);

    // Ball (nur während des Ballwechsels)
    if (z.phase === "laeuft") {
      ctx.fillStyle = FARBE.akzent;
      ctx.beginPath();
      ctx.arc(z.ball.x, z.ball.y, BALL_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Meldung (Startbildschirm, Punktpause, Endstand)
    if (z.phase === "bereit" || z.phase === "pause" || z.phase === "ende") {
      ctx.fillStyle = FARBE.text;
      ctx.textAlign = "center";
      ctx.font = `800 ${z.phase === "bereit" ? 44 : 56}px ${SCHRIFT}`;
      ctx.fillText(z.gross, BREITE / 2, 142);
      if (z.klein) {
        ctx.font = `600 17px ${SCHRIFT}`;
        ctx.fillText(z.klein, BREITE / 2, 176);
      }
      if (z.phase === "bereit") {
        ctx.fillStyle = FARBE.leise;
        ctx.font = `500 14px ${SCHRIFT}`;
        ctx.fillText("Links: W/S — Rechts: ↑/↓ · Touch: Hälfte ziehen", BREITE / 2, 206);
      }
    }
  }

  function tick(dt) {
    update(dt);
    zeichne();
  }

  // Startbildschirm zeigen; das Match beginnt mit erster Taste, Touch oder Start-Knopf.
  reset();
  api.loop(tick);
}
