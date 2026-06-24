// spiel.js — „Mauerbrecher" (Breakout) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Reflexion, Schlägerwinkel, Steinraster, Kollision) ist
// exportiert und in Node testbar — auf Modulebene wird weder document noch
// window angefasst, das Canvas entsteht erst in starte().

export const LOGIK_B = 480; // logische Breite der Spielfläche
export const LOGIK_H = 360; // logische Höhe

// Steinraster: 10 × 6 Steine, bündig über die volle Breite.
export const RASTER = { x0: 0, y0: 36, spalten: 10, zeilen: 6, zellB: 48, zellH: 18 };

export const TEMPO_START = 240; // px/s
export const TEMPO_MAX = 420;   // px/s
export const SCHLAEGER_TEMPO = 320; // px/s bei Pfeiltasten

export const manifest = {
  id: "sp-mauerbrecher",
  titel: "Mauerbrecher",
  kurz: "Schläger, Ball, bunte Mauer: Räum alle Steine ab, ohne den Ball fallen zu lassen.",
  punkteLabel: "Punkte",
  highscore: true,
  zeigeZeit: false,
  steuerungHinweis: "Maus/Finger bewegt den Schläger — oder ← →. Leertaste startet den Ball."
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Spiegelung eines Geschwindigkeitsvektors an einer Wand mit (Einheits-)Normale n:
// v' = v − 2 (v·n) n — der Betrag bleibt erhalten.
export function reflektiereWand(v, normal) {
  const skalar = 2 * (v.x * normal.x + v.y * normal.y);
  return { x: v.x - skalar * normal.x, y: v.y - skalar * normal.y };
}

// Abprallwinkel am Schläger, abhängig vom Auftreffpunkt. schlaegerX = Mittelpunkt.
// Mitte → 0 (senkrecht nach oben), Kanten → ±60° (±π/3), dazwischen linear
// (monoton); außerhalb der Kante wird auf ±60° geklemmt. Winkel im Bogenmaß,
// gemessen von der Senkrechten (positiv = nach rechts).
export function schlaegerWinkel(trefferX, schlaegerX, breite) {
  const t = Math.max(-1, Math.min(1, (trefferX - schlaegerX) / (breite / 2)));
  return t * (Math.PI / 3);
}

// Index des Steins im Raster, der den Punkt (x, y) enthält — oder −1 außerhalb.
// Zellen sind links/oben inklusiv, rechts/unten exklusiv (Index = zeile·spalten + spalte).
export function steinIndexFuer(x, y, raster) {
  const spalte = Math.floor((x - raster.x0) / raster.zellB);
  const zeile = Math.floor((y - raster.y0) / raster.zellH);
  if (spalte < 0 || zeile < 0 || spalte >= raster.spalten || zeile >= raster.zeilen) return -1;
  return zeile * raster.spalten + spalte;
}

// Sind alle Steine abgeräumt?
export function alleWeg(steine) {
  return steine.every(s => s.leben <= 0);
}

// Achsenparallele Kollision Ball ↔ Stein. Der Ball zählt als Quadrat der
// Kantenlänge 2r um den Mittelpunkt; die getroffene Seite ergibt sich aus der
// KÜRZESTEN Überlappung. Liefert { seite, ueberlappung } oder null.
// seite ist die Steinseite aus Ballsicht: "links" = Ball traf die linke Flanke.
export function ballSteinKollision(ball, stein) {
  const ox = Math.min(ball.x + ball.r, stein.x + stein.b) - Math.max(ball.x - ball.r, stein.x);
  const oy = Math.min(ball.y + ball.r, stein.y + stein.h) - Math.max(ball.y - ball.r, stein.y);
  if (ox <= 0 || oy <= 0) return null;
  if (ox < oy) {
    return { seite: ball.x < stein.x + stein.b / 2 ? "links" : "rechts", ueberlappung: ox };
  }
  return { seite: ball.y < stein.y + stein.h / 2 ? "oben" : "unten", ueberlappung: oy };
}

// Neue Mauer: oberste zwei Reihen sind hart (2 Treffer, 20 Punkte),
// die übrigen weich (1 Treffer, 10 Punkte). Drei Farbbänder à zwei Reihen.
export function baueMauer(raster = RASTER) {
  const steine = [];
  for (let zeile = 0; zeile < raster.zeilen; zeile++) {
    for (let spalte = 0; spalte < raster.spalten; spalte++) {
      const hart = zeile < 2;
      steine.push({
        x: raster.x0 + spalte * raster.zellB,
        y: raster.y0 + zeile * raster.zellH,
        b: raster.zellB, h: raster.zellH,
        reihe: zeile, spalte,
        leben: hart ? 2 : 1,
        maxLeben: hart ? 2 : 1,
        punkte: hart ? 20 : 10
      });
    }
  }
  return steine;
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  // Mindestens 2× rendern: das Canvas wird per CSS auf Containerbreite skaliert,
  // devicePixelRatio allein wäre auf großen Bildschirmen zu grob.
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOGIK_B * faktor);
  canvas.height = Math.round(LOGIK_H * faktor);
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // Leben-Anzeige in der Kopfzeile ergänzen
  let lebenEl = api.kopf.querySelector("#mb-leben");
  if (!lebenEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Leben: <b id="mb-leben">3</b>';
    api.kopf.appendChild(span);
    lebenEl = span.querySelector("b");
  }

  const schlaeger = { x: LOGIK_B / 2, y: 338, b: 72, h: 10 }; // x = Mittelpunkt, y = Oberkante
  const ball = { x: LOGIK_B / 2, y: 0, r: 6, vx: 0, vy: 0 };
  let steine = baueMauer();
  let tempo = TEMPO_START;
  let punkte = 0;
  let leben = 3;
  let mauerNr = 1;
  let zerstoertGesamt = 0;
  let angedockt = true;
  let laeuftRunde = false;
  const tastenGedrueckt = { links: false, rechts: false };
  let effekte = []; // Partikel und Punkte-Texte (entfallen bei reduzierter Bewegung)

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function klemme(wert, min, max) { return Math.max(min, Math.min(max, wert)); }

  function setzeAusgangslage() {
    steine = baueMauer();
    tempo = TEMPO_START;
    punkte = 0;
    leben = 3;
    mauerNr = 1;
    zerstoertGesamt = 0;
    effekte = [];
    schlaeger.x = LOGIK_B / 2;
    andocken();
    api.setzePunkte(0);
    lebenEl.textContent = "3";
  }

  function starteRunde() {
    setzeAusgangslage();
    laeuftRunde = true;
    api.loop(dt => { aktualisiere(dt); zeichne(); });
  }

  function andocken() {
    angedockt = true;
    ball.vx = 0; ball.vy = 0;
    ball.x = schlaeger.x;
    ball.y = schlaeger.y - ball.r;
  }

  function loesen() {
    if (!laeuftRunde || !angedockt) return;
    angedockt = false;
    const winkel = (Math.random() * 2 - 1) * (Math.PI / 12); // leichte Streuung ±15°
    ball.vx = tempo * Math.sin(winkel);
    ball.vy = -tempo * Math.cos(winkel);
  }

  function aktualisiere(dt) {
    if (tastenGedrueckt.links) schlaeger.x -= SCHLAEGER_TEMPO * dt;
    if (tastenGedrueckt.rechts) schlaeger.x += SCHLAEGER_TEMPO * dt;
    schlaeger.x = klemme(schlaeger.x, schlaeger.b / 2, LOGIK_B - schlaeger.b / 2);

    if (angedockt) {
      ball.x = schlaeger.x;
      ball.y = schlaeger.y - ball.r;
    } else {
      // Teilschritte gegen Tunneln: maximal 4 px Weg pro Teilschritt
      const teilschritte = Math.max(1, Math.ceil((tempo * dt) / 4));
      const h = dt / teilschritte;
      for (let i = 0; i < teilschritte && laeuftRunde && !angedockt; i++) {
        ball.x += ball.vx * h;
        ball.y += ball.vy * h;
        kollidiere();
      }
    }

    // Effekte fortschreiben
    for (const e of effekte) {
      e.t -= dt;
      if (e.art === "p") { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 500 * dt; }
      else e.y -= 30 * dt;
    }
    effekte = effekte.filter(e => e.t > 0);
  }

  function spiegle(normal) {
    const v = reflektiereWand({ x: ball.vx, y: ball.vy }, normal);
    ball.vx = v.x; ball.vy = v.y;
  }

  function kollidiere() {
    // Wände: links, rechts, oben spiegeln
    if (ball.x - ball.r < 0 && ball.vx < 0) { ball.x = ball.r; spiegle({ x: 1, y: 0 }); }
    if (ball.x + ball.r > LOGIK_B && ball.vx > 0) { ball.x = LOGIK_B - ball.r; spiegle({ x: -1, y: 0 }); }
    if (ball.y - ball.r < 0 && ball.vy < 0) { ball.y = ball.r; spiegle({ x: 0, y: 1 }); }

    // Schläger: Abprallwinkel hängt vom Auftreffpunkt ab
    if (ball.vy > 0 &&
        Math.abs(ball.x - schlaeger.x) <= schlaeger.b / 2 + ball.r &&
        ball.y + ball.r >= schlaeger.y &&
        ball.y - ball.r <= schlaeger.y + schlaeger.h) {
      const winkel = schlaegerWinkel(ball.x, schlaeger.x, schlaeger.b);
      ball.vx = tempo * Math.sin(winkel);
      ball.vy = -tempo * Math.cos(winkel);
      ball.y = schlaeger.y - ball.r;
    }

    // Steine: Kandidaten über das Raster bestimmen (Mittelpunkt + 4 Randpunkte)
    const kandidaten = new Set([
      steinIndexFuer(ball.x, ball.y, RASTER),
      steinIndexFuer(ball.x - ball.r, ball.y, RASTER),
      steinIndexFuer(ball.x + ball.r, ball.y, RASTER),
      steinIndexFuer(ball.x, ball.y - ball.r, RASTER),
      steinIndexFuer(ball.x, ball.y + ball.r, RASTER)
    ]);
    for (const idx of kandidaten) {
      if (idx < 0) continue;
      const stein = steine[idx];
      if (!stein || stein.leben <= 0) continue;
      const treffer = ballSteinKollision(ball, stein);
      if (!treffer) continue;
      trifftStein(stein, treffer);
      break; // pro Teilschritt höchstens ein Stein
    }

    // Boden: Leben verlieren
    if (ball.y - ball.r > LOGIK_H) ballVerloren();
  }

  function trifftStein(stein, treffer) {
    if (treffer.seite === "links") { ball.vx = -Math.abs(ball.vx); ball.x = stein.x - ball.r; }
    else if (treffer.seite === "rechts") { ball.vx = Math.abs(ball.vx); ball.x = stein.x + stein.b + ball.r; }
    else if (treffer.seite === "oben") { ball.vy = -Math.abs(ball.vy); ball.y = stein.y - ball.r; }
    else { ball.vy = Math.abs(ball.vy); ball.y = stein.y + stein.h + ball.r; }

    stein.leben -= 1;
    if (stein.leben > 0) return;

    punkte += stein.punkte;
    zerstoertGesamt += 1;
    api.setzePunkte(punkte);
    steinEffekt(stein);

    // Reihe komplett abgeräumt → Ball wird 8 % schneller (gedeckelt)
    if (steine.filter(s => s.reihe === stein.reihe).every(s => s.leben <= 0)) {
      tempo = Math.min(TEMPO_MAX, tempo * 1.08);
      const betrag = Math.hypot(ball.vx, ball.vy);
      if (betrag > 0) { ball.vx = ball.vx / betrag * tempo; ball.vy = ball.vy / betrag * tempo; }
    }

    if (alleWeg(steine)) naechsteMauer();
  }

  function naechsteMauer() {
    mauerNr += 1;
    steine = baueMauer();
    leben = Math.min(4, leben + 1); // Bonusleben, höchstens 4
    lebenEl.textContent = String(leben);
    andocken(); // Tempo bleibt erhalten — die nächste Mauer ist schneller
  }

  function ballVerloren() {
    leben -= 1;
    lebenEl.textContent = String(Math.max(0, leben));
    if (leben <= 0) {
      laeuftRunde = false;
      zeichne();
      api.vorbei(punkte,
        `<p>Mauer ${mauerNr} erreicht · ${zerstoertGesamt} Steine zerstört</p>`);
    } else {
      andocken();
    }
  }

  function steinEffekt(stein) {
    if (api.reduzierteBewegung) return; // keine Partikel, kein Punkte-Blitztext
    for (let i = 0; i < 9; i++) {
      effekte.push({
        art: "p", reihe: stein.reihe,
        x: stein.x + stein.b / 2, y: stein.y + stein.h / 2,
        vx: (Math.random() - 0.5) * 190, vy: -Math.random() * 130 - 30,
        t: 0.4
      });
    }
    effekte.push({ art: "t", text: "+" + stein.punkte, x: stein.x + stein.b / 2, y: stein.y, t: 0.6 });
    if (effekte.length > 150) effekte = effekte.slice(-150);
  }

  // --- Eingaben ---
  api.tasten(ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") tastenGedrueckt.links = true;
    else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") tastenGedrueckt.rechts = true;
    else if (ev.key === " ") loesen();
  });
  api.flaeche.addEventListener("keyup", ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") tastenGedrueckt.links = false;
    if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") tastenGedrueckt.rechts = false;
  });
  api.flaeche.addEventListener("blur", () => {
    tastenGedrueckt.links = false; tastenGedrueckt.rechts = false;
  });

  function zeigerX(clientX) {
    const r = canvas.getBoundingClientRect();
    return (clientX - r.left) / r.width * LOGIK_B;
  }
  api.flaeche.addEventListener("pointermove", ev => {
    schlaeger.x = klemme(zeigerX(ev.clientX), schlaeger.b / 2, LOGIK_B - schlaeger.b / 2);
  });
  api.flaeche.addEventListener("pointerdown", ev => {
    schlaeger.x = klemme(zeigerX(ev.clientX), schlaeger.b / 2, LOGIK_B - schlaeger.b / 2);
  });
  api.flaeche.addEventListener("click", loesen);
  api.wisch(richtung => { if (richtung === "tipp") loesen(); });

  // --- Zeichnen ---
  function rund(x, y, b, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, radius);
    else ctx.rect(x, y, b, h);
    ctx.fill();
  }

  function bandFarbe(reihe, F) {
    if (reihe < 2) return F.fehler;   // hart (2 Treffer)
    if (reihe < 4) return F.physik;   // mittleres Band
    return F.ok;                      // unteres Band
  }

  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      fehler: farbe("--fehler", "#b3261e"),
      physik: farbe("--physik", "#a3570e"),
      ok: farbe("--ok", "#2c7029")
    };
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);

    ctx.fillStyle = F.leise;
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Mauer " + mauerNr, 8, 24);

    // Steine
    for (const stein of steine) {
      if (stein.leben <= 0) continue;
      const angeschlagen = stein.maxLeben === 2 && stein.leben === 1;
      ctx.fillStyle = bandFarbe(stein.reihe, F);
      ctx.globalAlpha = angeschlagen ? 0.55 : 1;
      rund(stein.x + 2, stein.y + 2, stein.b - 4, stein.h - 4, 3);
      ctx.globalAlpha = 1;
      if (angeschlagen) { // Riss zeigt den Schaden zusätzlich zur Farbe
        ctx.strokeStyle = F.bg;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(stein.x + stein.b * 0.32, stein.y + 3);
        ctx.lineTo(stein.x + stein.b * 0.5, stein.y + stein.h * 0.55);
        ctx.lineTo(stein.x + stein.b * 0.42, stein.y + stein.h - 3);
        ctx.stroke();
      }
    }

    // Schläger und Ball
    ctx.fillStyle = F.akzent;
    rund(schlaeger.x - schlaeger.b / 2, schlaeger.y, schlaeger.b, schlaeger.h, 5);
    ctx.fillStyle = F.text;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, 2 * Math.PI);
    ctx.fill();

    // Effekte
    for (const e of effekte) {
      if (e.art === "p") {
        ctx.globalAlpha = Math.max(0, e.t / 0.4);
        ctx.fillStyle = bandFarbe(e.reihe, F);
        ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
      } else {
        ctx.globalAlpha = Math.max(0, e.t / 0.6);
        ctx.fillStyle = F.text;
        ctx.font = "700 14px 'Source Sans 3', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.text, e.x, e.y);
      }
    }
    ctx.globalAlpha = 1;

    if (angedockt && laeuftRunde) {
      ctx.fillStyle = F.leise;
      ctx.font = "600 16px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      const text = mauerNr > 1
        ? `Mauer ${mauerNr} — Leertaste oder Tippen!`
        : "Leertaste oder Tippen löst den Ball";
      ctx.fillText(text, LOGIK_B / 2, 220);
    }
  }

  // Abdunkelnde Einblendung mit Text (funktioniert in Hell- und Dunkelmodus)
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

  // Ausgangsbild vor dem ersten Start
  setzeAusgangslage();
  zeichne();
  hinweis("Mauerbrecher", "Drück auf „Start“!");
}
