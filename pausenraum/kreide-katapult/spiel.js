// spiel.js — „Kreide-Katapult" (Wurfparabel-Duell, 2 Spieler Hot-Seat).
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Wurfphysik (Startgeschwindigkeit, Flugbahn, Treffer) ist exportiert und
// in Node testbar — auf Modulebene wird weder document noch window angefasst, das
// Canvas entsteht erst in starte().
//
// Koordinatensystem (Welt): logische Fläche LOGIK_B × LOGIK_H. Der Ursprung liegt
// oben links, x wächst nach RECHTS, y wächst nach UNTEN (Bildschirmkonvention).
// Eine Wurfparabel steigt also = y wird kleiner, fällt = y wird größer.

export const LOGIK_B = 640; // logische Breite der Tafel-Szene
export const LOGIK_H = 360; // logische Höhe

export const G = 380;        // Gravitation in Welt-Einheiten/s²
export const V_MAX = 560;    // Startgeschwindigkeit bei Stärke 100 % (Welt-Einheiten/s)
export const V_MIN = 90;     // Startgeschwindigkeit bei Stärke 0 %
export const SIEG_TREFFER = 3; // Best-of: wer zuerst so viele Treffer hat, gewinnt
export const WIND_MAX = 110; // maximaler Windbetrag (horizontale Beschleunigung, Einh./s²)

export const manifest = {
  id: "sp-kreide-katapult",
  titel: "Kreide-Katapult",
  kurz: "Wurfparabel-Duell für zwei: Stell Winkel und Stärke ein und triff über den Hügel hinweg die gegnerische Kanone — der Wind redet mit.",
  punkteLabel: "Treffer",
  highscore: false,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Winkel mit ↑ ↓, Stärke mit ← →, Leertaste schießt — oder ziehen und loslassen (Touch). Abwechselnd!"
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Startgeschwindigkeit aus dem Stärke-Prozentwert (0..100). Linear zwischen
// V_MIN und vMax — monoton steigend in der Stärke.
export function startGeschwindigkeit(staerkeProzent, vMax = V_MAX) {
  const p = Math.max(0, Math.min(100, staerkeProzent)) / 100;
  return V_MIN + (vMax - V_MIN) * p;
}

// Position eines Geschosses zur Zeit t (Sekunden) bei Abwurf nach RECHTS.
// Standard-Wurfparabel mit optionaler horizontaler Wind-Beschleunigung:
//   x = x0 + v0·cosα·t + ½·wind·t²
//   y = y0 − (v0·sinα·t − ½·g·t²)      (y wächst nach unten ⇒ Aufstieg senkt y)
// winkelGrad in Grad über der Horizontalen, g > 0, wind als Welt-Beschleunigung.
export function wurfPosition(x0, y0, v0, winkelGrad, g, wind, t) {
  const a = winkelGrad * Math.PI / 180;
  const vx = v0 * Math.cos(a);
  const vy = v0 * Math.sin(a);
  return {
    x: x0 + vx * t + 0.5 * (wind || 0) * t * t,
    y: y0 - (vy * t - 0.5 * g * t * t)
  };
}

// Punkt-in-Kreis: liegt (px, py) im Zielkreis (Mittelpunkt {x,y}, Radius r)?
export function trefferKreis(px, py, ziel) {
  const dx = px - ziel.x;
  const dy = py - ziel.y;
  return dx * dx + dy * dy <= ziel.r * ziel.r;
}

// Geländehöhe (y-Wert der Bodenlinie) an der Stelle x — eine glatte Hügelkette.
// Größeres Ergebnis = weiter unten. Basislinie liegt bei basisY, der Hügel in der
// Mitte wölbt sich nach oben (kleineres y).
export function gelaendeHoehe(x, breite = LOGIK_B, basisY = LOGIK_H - 40) {
  const mitte = breite / 2;
  const huegel = 86 * Math.exp(-Math.pow((x - mitte) / (breite * 0.22), 2));
  const welle = 10 * Math.sin(x / breite * Math.PI * 3);
  return basisY - huegel - welle;
}

// Liegt der Punkt (x, y) im (oder unter dem) Gelände? = Einschlag im Boden.
export function imGelaende(x, y, breite = LOGIK_B, basisY = LOGIK_H - 40) {
  return y >= gelaendeHoehe(x, breite, basisY);
}

// Startaufstellung der beiden Kanonen — auf dem Gelände platziert.
// richtung: +1 = schießt nach rechts (Spieler 1), −1 = nach links (Spieler 2).
export function kanonen(breite = LOGIK_B, basisY = LOGIK_H - 40) {
  const x1 = Math.round(breite * 0.09);
  const x2 = Math.round(breite * 0.91);
  return [
    { spieler: 1, x: x1, y: gelaendeHoehe(x1, breite, basisY) - 12, r: 18, richtung: 1 },
    { spieler: 2, x: x2, y: gelaendeHoehe(x2, breite, basisY) - 12, r: 18, richtung: -1 }
  ];
}

// Windwert für eine neue Runde aus einer Zufallszahl (0..1) — symmetrisch um 0,
// in Schritten gerundet, gelegentlich windstill.
export function windAus(zufall) {
  const z = zufall * 2 - 1;            // −1..1
  const w = Math.round(z * WIND_MAX / 10) * 10; // Vielfache von 10
  return Math.abs(w) < 10 ? 0 : w;     // kleine Werte = Flaute
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

  // Punktestand beider Spieler in der Kopfzeile (statt einzelnem Punktezähler).
  let standEl = api.kopf.querySelector("#kk-stand");
  if (!standEl) {
    // Den vom Gerüst gerenderten "Treffer: 0"-Span verstecken; eigener Stand daneben.
    const punkteSpan = api.kopf.querySelector(".spiel-punkte");
    if (punkteSpan) punkteSpan.style.display = "none";
    const span = document.createElement("span");
    span.id = "kk-stand";
    api.kopf.appendChild(span);
    standEl = span;
  }

  const basisY = LOGIK_H - 40;
  let kan = kanonen(LOGIK_B, basisY);
  let aktiv = 0;          // Index des Spielers am Zug (0 oder 1)
  let treffer = [0, 0];   // Trefferzähler je Spieler
  let runde = 1;
  let wind = windAus(Math.random());
  let winkel = 55;        // Grad (0..90)
  let staerke = 55;       // Prozent (10..100)
  let laeuftRunde = false;

  // Geschoss-Zustand
  let geschoss = null;    // { x, y, vx, vy, von } während des Flugs
  let spuren = [];        // gepunktete Vorschau-Bahnen der letzten Schüsse
  let partikel = [];      // Einschlag-/Treffer-Funken
  let banner = null;      // { text, t } kurze Trefferanzeige

  // Zieh-Steuerung (Touch/Maus): Pull-back an der eigenen Kanone
  let ziehen = null;      // { x, y } aktuelle Zeigerposition in Weltkoordinaten

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function klemme(wert, min, max) { return Math.max(min, Math.min(max, wert)); }

  // Farbe je Spieler: 1 = Akzent (blau), 2 = Fehler (rot).
  function spielerFarbe(i, F) { return i === 0 ? F.akzent : F.fehler; }
  function spielerName(i) { return i === 0 ? "Spieler 1" : "Spieler 2"; }

  function setzeStand() {
    const F = farbenJetzt();
    const aktivName = spielerName(aktiv);
    standEl.innerHTML =
      '<b style="color:' + F.akzent + '">S1: ' + treffer[0] + '</b>' +
      ' &nbsp;·&nbsp; ' +
      '<b style="color:' + F.fehler + '">S2: ' + treffer[1] + '</b>' +
      ' &nbsp;|&nbsp; am Zug: <b style="color:' + spielerFarbe(aktiv, F) + '">' + aktivName + '</b>';
    api.setzePunkte(treffer[0] + treffer[1]);
  }

  function farbenJetzt() {
    return {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      fehler: farbe("--fehler", "#b3261e"),
      ok: farbe("--ok", "#2c7029"),
      physik: farbe("--physik", "#a3570e"),
      gold: "#c79a1e"
    };
  }

  function setzeAusgangslage() {
    kan = kanonen(LOGIK_B, basisY);
    aktiv = 0;
    treffer = [0, 0];
    runde = 1;
    wind = windAus(Math.random());
    winkel = 55;
    staerke = 55;
    geschoss = null;
    spuren = [];
    partikel = [];
    banner = null;
    ziehen = null;
    setzeStand();
  }

  function starteRunde() {
    setzeAusgangslage();
    laeuftRunde = true;
    api.loop(dt => { aktualisiere(dt); zeichne(); });
  }

  // Aktuelle Kanone des Spielers am Zug.
  function eigeneKanone() { return kan[aktiv]; }

  // Schuss auslösen: aus Winkel + Stärke die Geschwindigkeit bestimmen.
  function schiessen() {
    if (!laeuftRunde || geschoss) return;
    const k = eigeneKanone();
    const v0 = startGeschwindigkeit(staerke);
    const a = winkel * Math.PI / 180;
    // richtung spiegelt den Horizontalanteil für Spieler 2 (schießt nach links).
    geschoss = {
      x: k.x + Math.cos(a) * k.richtung * (k.r + 4),
      y: k.y - Math.sin(a) * (k.r + 4),
      vx: v0 * Math.cos(a) * k.richtung,
      vy: -v0 * Math.sin(a),      // nach oben = negatives vy
      von: aktiv,
      bahn: []
    };
  }

  // Spielerwechsel + neue Runde (frischer Wind).
  function naechsteRunde(spielerWechsel) {
    if (spielerWechsel) aktiv = aktiv === 0 ? 1 : 0;
    runde += 1;
    wind = windAus(Math.random());
    geschoss = null;
    setzeStand();
  }

  function trefferAnzeige(text) {
    banner = { text, t: 1.4 };
  }

  function funken(x, y, farbeWert, anzahl) {
    if (api.reduzierteBewegung) anzahl = Math.min(anzahl, 6);
    for (let i = 0; i < anzahl; i++) {
      partikel.push({
        x, y,
        vx: (Math.random() - 0.5) * 220,
        vy: -Math.random() * 200 - 30,
        farbe: farbeWert,
        t: 0.5
      });
    }
    if (partikel.length > 140) partikel = partikel.slice(-140);
  }

  function aktualisiere(dt) {
    // Banner ausblenden
    if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }

    // Partikel
    for (const p of partikel) { p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 480 * dt; p.t -= dt; }
    partikel = partikel.filter(p => p.t > 0);

    if (!geschoss) return;

    // Geschoss integrieren (kleine Teilschritte für saubere Kollision).
    const speed = Math.hypot(geschoss.vx, geschoss.vy);
    const schritte = Math.max(1, Math.ceil(speed * dt / 4));
    const h = dt / schritte;
    for (let i = 0; i < schritte && geschoss; i++) {
      geschoss.vy += G * h;            // y wächst nach unten ⇒ +g
      geschoss.vx += wind * h;         // konstanter Wind (horizontal)
      geschoss.x += geschoss.vx * h;
      geschoss.y += geschoss.vy * h;
      if (geschoss.bahn.length < 600) geschoss.bahn.push([geschoss.x, geschoss.y]);
      pruefeEinschlag();
    }
  }

  function pruefeEinschlag() {
    if (!geschoss) return;
    const gx = geschoss.x, gy = geschoss.y;

    // 1) Gegnerische Kanone getroffen?
    const gegnerIdx = geschoss.von === 0 ? 1 : 0;
    const gegner = kan[gegnerIdx];
    if (trefferKreis(gx, gy, gegner)) {
      const F = farbenJetzt();
      funken(gegner.x, gegner.y, spielerFarbe(gegnerIdx, F), 22);
      treffer[geschoss.von] += 1;
      spuren.push({ punkte: geschoss.bahn, von: geschoss.von });
      if (spuren.length > 4) spuren = spuren.slice(-4);
      trefferAnzeige("Treffer! " + spielerName(geschoss.von) + " punktet");
      setzeStand();
      if (treffer[geschoss.von] >= SIEG_TREFFER) { ende(); return; }
      // Nach Treffer ist der Getroffene als nächstes dran.
      naechsteRunde(true);
      return;
    }

    // 2) Eigene Kanone (Eigentor unwahrscheinlich, aber sauber abfangen): zählt als Fehlschuss.
    const selbst = kan[geschoss.von];
    if (geschoss.bahn.length > 8 && trefferKreis(gx, gy, selbst)) {
      const F = farbenJetzt();
      funken(gx, gy, F.leise, 8);
      verfehlt();
      return;
    }

    // 3) Einschlag im Gelände?
    if (imGelaende(gx, gy, LOGIK_B, basisY)) {
      const F = farbenJetzt();
      funken(gx, gelaendeHoehe(gx, LOGIK_B, basisY), F.physik, 14);
      verfehlt();
      return;
    }

    // 4) Feld verlassen (seitlich/unten/zu hoch oben verschwunden)?
    if (gx < -20 || gx > LOGIK_B + 20 || gy > LOGIK_H + 30) {
      verfehlt();
      return;
    }
  }

  function verfehlt() {
    if (!geschoss) return;
    // Bahn als gepunktete Vorschau merken.
    spuren.push({ punkte: geschoss.bahn, von: geschoss.von });
    if (spuren.length > 4) spuren = spuren.slice(-4);
    trefferAnzeige("Daneben — " + spielerName(geschoss.von === 0 ? 1 : 0) + " ist dran");
    naechsteRunde(true);
  }

  function ende() {
    laeuftRunde = false;
    const siegerIdx = treffer[0] >= SIEG_TREFFER ? 0 : 1;
    const verlierer = siegerIdx === 0 ? 1 : 0;
    geschoss = null;
    zeichne();
    const info = "<p>" + spielerName(siegerIdx) + " gewinnt " +
      treffer[siegerIdx] + ":" + treffer[verlierer] + "!</p>";
    api.vorbei(treffer[siegerIdx], info);
  }

  // --- Eingaben: Tastatur ---
  api.tasten(ev => {
    if (!laeuftRunde || geschoss) return;
    if (ev.key === "ArrowUp") winkel = klemme(winkel + 2, 0, 90);
    else if (ev.key === "ArrowDown") winkel = klemme(winkel - 2, 0, 90);
    else if (ev.key === "ArrowRight") staerke = klemme(staerke + 3, 10, 100);
    else if (ev.key === "ArrowLeft") staerke = klemme(staerke - 3, 10, 100);
    else if (ev.key === " ") schiessen();
  });

  // --- Eingaben: Ziehen (Touch/Maus) — Pull-back an der eigenen Kanone ---
  function zeigerWelt(ev) {
    const r = canvas.getBoundingClientRect();
    return {
      x: (ev.clientX - r.left) / r.width * LOGIK_B,
      y: (ev.clientY - r.top) / r.height * LOGIK_H
    };
  }

  // Zieh-Vektor (von der Kanone weg) → Winkel + Stärke. Man zieht in die
  // Gegenrichtung des gewünschten Abschusses (wie eine Schleuder).
  function ausZiehen(p) {
    const k = eigeneKanone();
    // Richtung VON der Kanone zum Zeiger:
    const dx = p.x - k.x;
    const dy = p.y - k.y;
    // Abschuss-Richtung ist entgegengesetzt: nach k.richtung gespiegelt.
    const zielDx = -dx * k.richtung;   // positiv = „vorwärts" relativ zur Kanone
    const zielDy = -dy;                // positiv (nach oben), da y nach unten wächst
    const laenge = Math.hypot(dx, dy);
    if (laenge > 4) {
      // Winkel über der Horizontalen aus der Gegenrichtung (immer 0..90).
      let w = Math.atan2(Math.max(0, zielDy), Math.max(0.0001, Math.abs(zielDx))) * 180 / Math.PI;
      winkel = klemme(w, 0, 90);
      staerke = klemme(laenge / 1.6 + 8, 10, 100); // längeres Ziehen = mehr Stärke
    }
  }

  canvas.addEventListener("pointerdown", ev => {
    if (!laeuftRunde || geschoss) return;
    ev.preventDefault();
    canvas.setPointerCapture && canvas.setPointerCapture(ev.pointerId);
    ziehen = zeigerWelt(ev);
    ausZiehen(ziehen);
  });
  canvas.addEventListener("pointermove", ev => {
    if (!ziehen || geschoss) return;
    ziehen = zeigerWelt(ev);
    ausZiehen(ziehen);
  });
  function loslassen(ev) {
    if (!ziehen) return;
    ziehen = null;
    schiessen();
  }
  canvas.addEventListener("pointerup", loslassen);
  canvas.addEventListener("pointercancel", () => { ziehen = null; });
  // Tipp ohne Ziehen (Beamer/Maus-Klick) löst ebenfalls einen Schuss aus.
  api.wisch(richtung => { if (richtung === "tipp") schiessen(); });

  // --- Zeichnen ---
  function rund(x, y, b, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, radius);
    else ctx.rect(x, y, b, h);
    ctx.fill();
  }

  function zeichneKanone(k, F, istAktiv) {
    const farbeWert = spielerFarbe(k.spieler - 1, F);
    // Sockel
    ctx.fillStyle = farbeWert;
    rund(k.x - k.r, k.y - 4, k.r * 2, k.r + 12, 6);
    // Rohr in Schussrichtung (nur beim aktiven Spieler in der eingestellten Winkel-/Stärke-Lage)
    const a = winkel * Math.PI / 180;
    const len = istAktiv ? 16 + startGeschwindigkeit(staerke) / V_MAX * 22 : 22;
    const rx = k.x + Math.cos(a) * k.richtung * len;
    const ry = k.y - Math.sin(a) * len;
    ctx.strokeStyle = farbeWert;
    ctx.lineWidth = 7;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(k.x, k.y);
    ctx.lineTo(rx, ry);
    ctx.stroke();
    ctx.lineCap = "butt";
    // Kopf
    ctx.fillStyle = farbeWert;
    ctx.beginPath();
    ctx.arc(k.x, k.y, 8, 0, 2 * Math.PI);
    ctx.fill();
    // Aktiv-Markierung
    if (istAktiv) {
      ctx.strokeStyle = F.gold;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(k.x, k.y, k.r + 6, 0, 2 * Math.PI);
      ctx.stroke();
    }
  }

  function zeichneGelaende(F) {
    ctx.fillStyle = F.leise;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(0, LOGIK_H);
    for (let x = 0; x <= LOGIK_B; x += 6) ctx.lineTo(x, gelaendeHoehe(x, LOGIK_B, basisY));
    ctx.lineTo(LOGIK_B, LOGIK_H);
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
    // Bodenlinie
    ctx.strokeStyle = F.leise;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 0; x <= LOGIK_B; x += 6) {
      const y = gelaendeHoehe(x, LOGIK_B, basisY);
      if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  function zeichneWind(F) {
    const cx = LOGIK_B / 2, cy = 28;
    ctx.fillStyle = F.leise;
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (wind === 0) {
      ctx.fillText("Wind: windstill", cx, cy);
      return;
    }
    const pfeilRichtung = wind > 0 ? "→" : "←";
    ctx.fillText("Wind " + pfeilRichtung + " " + Math.abs(wind), cx, cy);
    // kleiner Pfeil darunter
    const len = 14 + Math.abs(wind) / WIND_MAX * 26;
    const dir = wind > 0 ? 1 : -1;
    const ax = cx - dir * len / 2, bx = cx + dir * len / 2, ay = cy + 14;
    ctx.strokeStyle = F.physik;
    ctx.lineWidth = 3;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(ax, ay);
    ctx.lineTo(bx, ay);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(bx, ay);
    ctx.lineTo(bx - dir * 7, ay - 5);
    ctx.lineTo(bx - dir * 7, ay + 5);
    ctx.closePath();
    ctx.fillStyle = F.physik;
    ctx.fill();
    ctx.lineCap = "butt";
  }

  function zeichneReglerAnzeige(F) {
    // Große Anzeige Winkel + Stärke des aktiven Spielers, oben in der Ecke.
    const k = eigeneKanone();
    const aktivFarbe = spielerFarbe(aktiv, F);
    const links = aktiv === 0;
    const x = links ? 12 : LOGIK_B - 12;
    ctx.textAlign = links ? "left" : "right";
    ctx.textBaseline = "top";
    ctx.fillStyle = aktivFarbe;
    ctx.font = "700 20px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(spielerName(aktiv), x, 44);
    ctx.fillStyle = F.text;
    ctx.font = "700 17px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText("Winkel: " + Math.round(winkel) + "°", x, 70);
    ctx.fillText("Stärke: " + Math.round(staerke) + " %", x, 92);
  }

  function zeichneSpuren(F) {
    for (const s of spuren) {
      ctx.strokeStyle = spielerFarbe(s.von, F);
      ctx.globalAlpha = 0.35;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([2, 5]);
      ctx.beginPath();
      s.punkte.forEach(([x, y], i) => { i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
    }
  }

  function zeichneGeschoss(F) {
    if (!geschoss) return;
    // Live-Flugbahn
    ctx.strokeStyle = spielerFarbe(geschoss.von, F);
    ctx.lineWidth = 2;
    ctx.beginPath();
    geschoss.bahn.forEach(([x, y], i) => { i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.stroke();
    // Kreidegeschoss
    ctx.fillStyle = F.text;
    ctx.beginPath();
    ctx.arc(geschoss.x, geschoss.y, 4.5, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = F.bg;
    ctx.beginPath();
    ctx.arc(geschoss.x - 1, geschoss.y - 1, 1.6, 0, 2 * Math.PI);
    ctx.fill();
  }

  function zeichnePartikel() {
    for (const p of partikel) {
      ctx.globalAlpha = Math.max(0, p.t / 0.5);
      ctx.fillStyle = p.farbe;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    }
    ctx.globalAlpha = 1;
  }

  function zeichneBanner(F) {
    if (!banner) return;
    ctx.globalAlpha = Math.min(1, banner.t / 0.6);
    ctx.fillStyle = F.text;
    ctx.font = "700 22px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(banner.text, LOGIK_B / 2, LOGIK_H * 0.42);
    ctx.globalAlpha = 1;
  }

  function zeichne() {
    const F = farbenJetzt();
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);

    zeichneGelaende(F);
    zeichneSpuren(F);
    zeichneWind(F);
    zeichneReglerAnzeige(F);

    zeichneKanone(kan[0], F, aktiv === 0 && laeuftRunde);
    zeichneKanone(kan[1], F, aktiv === 1 && laeuftRunde);

    zeichneGeschoss(F);
    zeichnePartikel();
    zeichneBanner(F);

    if (laeuftRunde && !geschoss && !banner) {
      ctx.fillStyle = F.leise;
      ctx.font = "600 14px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "alphabetic";
      ctx.fillText("Leertaste schießt — oder an der Kanone ziehen und loslassen", LOGIK_B / 2, LOGIK_H - 12);
    }
  }

  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(20,18,14,0.55)";
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 30px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(haupt, LOGIK_B / 2, LOGIK_H / 2 - 12);
    if (unter) {
      ctx.font = "400 16px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(unter, LOGIK_B / 2, LOGIK_H / 2 + 18);
    }
    ctx.textBaseline = "alphabetic";
  }

  api.neustartCb(starteRunde);

  setzeAusgangslage();
  zeichne();
  hinweis("Kreide-Katapult", "Drück auf „Start“ — Spieler 1 beginnt!");
}
