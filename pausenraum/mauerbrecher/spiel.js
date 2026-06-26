// spiel.js — „Mauerbrecher" (Breakout) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Reflexion, Schlägerwinkel, Steinraster, Layouts, Kollision)
// ist exportiert und in Node testbar — auf Modulebene wird weder document noch
// window angefasst, das Canvas entsteht erst in starte().

export const LOGIK_B = 480; // logische Breite der Spielfläche
export const LOGIK_H = 360; // logische Höhe

// Steinraster: bis zu 8 Reihen × 12 Spalten, bündig über die volle Breite.
export const RASTER = { x0: 0, y0: 34, spalten: 12, zeilen: 8, zellB: 40, zellH: 18 };

export const TEMPO_START = 240; // px/s
export const TEMPO_MAX = 440;   // px/s
export const SCHLAEGER_TEMPO = 320; // px/s bei Pfeiltasten
export const SCHLAEGER_B = 72;  // Grundbreite des Schlägers
export const SCHLAEGER_BREIT = 112; // mit „breiter Schläger"-Power-up

export const manifest = {
  id: "sp-mauerbrecher",
  titel: "Mauerbrecher",
  kurz: "Schläger, Ball, große Mauern mit Lücken und Spezialsteinen: Stahl bremst, Explosiv-Steine sprengen die Nachbarschaft, Gold lässt Power-ups fallen.",
  punkteLabel: "Punkte",
  highscore: true,
  zeigeZeit: false,
  steuerungHinweis: "Maus/Finger bewegt den Schläger — oder ← →. Leertaste startet den Ball. Fang die fallenden Power-ups!"
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
// Mitte → 0 (senkrecht nach oben), Kanten → ±60° (±π/3), dazwischen linear.
export function schlaegerWinkel(trefferX, schlaegerX, breite) {
  const t = Math.max(-1, Math.min(1, (trefferX - schlaegerX) / (breite / 2)));
  return t * (Math.PI / 3);
}

// Index des Steins im Raster, der den Punkt (x, y) enthält — oder −1 außerhalb.
export function steinIndexFuer(x, y, raster) {
  const spalte = Math.floor((x - raster.x0) / raster.zellB);
  const zeile = Math.floor((y - raster.y0) / raster.zellH);
  if (spalte < 0 || zeile < 0 || spalte >= raster.spalten || zeile >= raster.zeilen) return -1;
  return zeile * raster.spalten + spalte;
}

// Achsenparallele Kollision Ball ↔ Stein (Ball als Quadrat 2r); kürzeste Überlappung
// bestimmt die getroffene Seite. Liefert { seite, ueberlappung } oder null.
export function ballSteinKollision(ball, stein) {
  const ox = Math.min(ball.x + ball.r, stein.x + stein.b) - Math.max(ball.x - ball.r, stein.x);
  const oy = Math.min(ball.y + ball.r, stein.y + stein.h) - Math.max(ball.y - ball.r, stein.y);
  if (ox <= 0 || oy <= 0) return null;
  if (ox < oy) {
    return { seite: ball.x < stein.x + stein.b / 2 ? "links" : "rechts", ueberlappung: ox };
  }
  return { seite: ball.y < stein.y + stein.h / 2 ? "oben" : "unten", ueberlappung: oy };
}

// Sind alle ZERSTÖRBAREN Steine abgeräumt? Stahl (unzerstörbar) und Lücken zählen nicht.
export function alleWeg(steine) {
  return steine.every(s => !s || s.unzerstoerbar || s.leben <= 0);
}

// Stein-Typen je Layout-Zeichen. "." (und alles Unbekannte) = Lücke (null).
export function steinTyp(zeichen) {
  switch (zeichen) {
    case "w": return { typ: "weich",    leben: 1,        punkte: 10 };
    case "h": return { typ: "hart",     leben: 2,        punkte: 20 };
    case "f": return { typ: "fest",     leben: 3,        punkte: 30 };
    case "s": return { typ: "stahl",    leben: Infinity, punkte: 0,  unzerstoerbar: true };
    case "x": return { typ: "explosiv", leben: 1,        punkte: 25, explosiv: true };
    case "g": return { typ: "gold",     leben: 1,        punkte: 15, drop: true };
    default:  return null;
  }
}

// Vier Level-Layouts (je bis zu 8 Reihen × 12 Spalten). Zeichen siehe steinTyp.
// Kürzere/fehlende Zeichen werden als Lücke behandelt (defensiv).
export const LAYOUTS = [
  [ // 1 — locker, mit Lücken und einem Gold-Paar
    "wwwwwwwwwwww",
    "h.h.h.h.h.h.",
    "w.w.w.w.w.w.",
    ".w.w.w.w.w.w",
    "wwww.gg.wwww",
    "............",
    "............",
    "............"
  ],
  [ // 2 — feste Oberreihe, Stahlpfeiler, Explosiv-Paar
    "ffffffffffff",
    "h.h.h.h.h.h.",
    "wsswwwwwwssw",
    "w.wwwwwwww.w",
    ".wwwwwwwwww.",
    "....gxxg....",
    "............",
    "............"
  ],
  [ // 3 — Festung mit Stahlrand und Explosiv-Kern
    "hhhhhhhhhhhh",
    "f.f.f.f.f.f.",
    ".fwwwwwwwwf.",
    "sfw.xwwx.wfs",
    "sfwwwwwwwwfs",
    ".fwwwwwwwwf.",
    "...g.h..h.g.",
    "............"
  ],
  [ // 4 — dicht, viele Spezialsteine
    "hhhhhhhhhhhh",
    "hfhfhfhfhfhf",
    "wxwxwxwxwxwx",
    "wwwwwwwwwwww",
    "s.s.s.s.s.s.",
    "g.wwwwwwww.g",
    ".w.w.w.w.w.w",
    "............"
  ]
];

// Baut die dichte Stein-Liste (Index = zeile·spalten + spalte) aus einem Layout.
// Lücken werden als „leer"-Platzhalter (leben 0) gesetzt, damit alle Schleifen
// (filter/every/for…of) ohne Sonderfälle laufen.
export function baueMauerAusLayout(layout, raster = RASTER) {
  const steine = [];
  for (let zeile = 0; zeile < raster.zeilen; zeile++) {
    const reihe = layout[zeile] || "";
    for (let spalte = 0; spalte < raster.spalten; spalte++) {
      const idx = zeile * raster.spalten + spalte;
      const e = steinTyp(reihe[spalte] || ".");
      if (!e) {
        steine[idx] = { x: 0, y: 0, b: 0, h: 0, reihe: zeile, spalte, typ: "leer", leben: 0, maxLeben: 0, punkte: 0 };
        continue;
      }
      steine[idx] = {
        x: raster.x0 + spalte * raster.zellB,
        y: raster.y0 + zeile * raster.zellH,
        b: raster.zellB, h: raster.zellH,
        reihe: zeile, spalte,
        typ: e.typ,
        leben: e.leben,
        maxLeben: e.leben,
        punkte: e.punkte,
        unzerstoerbar: !!e.unzerstoerbar,
        explosiv: !!e.explosiv,
        drop: !!e.drop
      };
    }
  }
  return steine;
}

// Mauer für eine Levelnummer (1-basiert) — die Layouts wiederholen sich zyklisch.
export function baueMauer(mauerNr = 1, raster = RASTER) {
  const layout = LAYOUTS[(Math.max(1, mauerNr) - 1) % LAYOUTS.length];
  return baueMauerAusLayout(layout, raster);
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

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

  let lebenEl = api.kopf.querySelector("#mb-leben");
  if (!lebenEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Leben: <b id="mb-leben">3</b>';
    api.kopf.appendChild(span);
    lebenEl = span.querySelector("b");
  }

  const schlaeger = { x: LOGIK_B / 2, y: 338, b: SCHLAEGER_B, h: 10 };
  const ball = { x: LOGIK_B / 2, y: 0, r: 6, vx: 0, vy: 0 };
  let steine = baueMauer(1);
  let tempo = TEMPO_START;
  let punkte = 0;
  let leben = 3;
  let mauerNr = 1;
  let zerstoertGesamt = 0;
  let angedockt = true;
  let laeuftRunde = false;
  let powerups = [];
  let breitBis = 0;       // Restzeit „breiter Schläger" in Sekunden
  const tastenGedrueckt = { links: false, rechts: false };
  let effekte = [];

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function klemme(wert, min, max) { return Math.max(min, Math.min(max, wert)); }

  function setzeAusgangslage() {
    steine = baueMauer(1);
    tempo = TEMPO_START;
    punkte = 0;
    leben = 3;
    mauerNr = 1;
    zerstoertGesamt = 0;
    effekte = [];
    powerups = [];
    breitBis = 0;
    schlaeger.b = SCHLAEGER_B;
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
    const winkel = (Math.random() * 2 - 1) * (Math.PI / 12);
    ball.vx = tempo * Math.sin(winkel);
    ball.vy = -tempo * Math.cos(winkel);
  }

  function aktualisiere(dt) {
    if (tastenGedrueckt.links) schlaeger.x -= SCHLAEGER_TEMPO * dt;
    if (tastenGedrueckt.rechts) schlaeger.x += SCHLAEGER_TEMPO * dt;
    schlaeger.x = klemme(schlaeger.x, schlaeger.b / 2, LOGIK_B - schlaeger.b / 2);

    // „breiter Schläger" läuft ab
    if (breitBis > 0) { breitBis -= dt; if (breitBis <= 0) schlaeger.b = SCHLAEGER_B; }

    if (angedockt) {
      ball.x = schlaeger.x;
      ball.y = schlaeger.y - ball.r;
    } else {
      const teilschritte = Math.max(1, Math.ceil((tempo * dt) / 4));
      const h = dt / teilschritte;
      for (let i = 0; i < teilschritte && laeuftRunde && !angedockt; i++) {
        ball.x += ball.vx * h;
        ball.y += ball.vy * h;
        kollidiere();
      }
    }

    // Fallende Power-ups bewegen / fangen
    for (let i = powerups.length - 1; i >= 0; i--) {
      const pu = powerups[i];
      pu.y += pu.vy * dt;
      const gefangen = pu.y + 7 >= schlaeger.y && pu.y - 7 <= schlaeger.y + schlaeger.h &&
                       Math.abs(pu.x - schlaeger.x) <= schlaeger.b / 2 + 9;
      if (gefangen) { wendePowerupAn(pu.art); powerups.splice(i, 1); continue; }
      if (pu.y > LOGIK_H + 14) powerups.splice(i, 1);
    }

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
    if (ball.x - ball.r < 0 && ball.vx < 0) { ball.x = ball.r; spiegle({ x: 1, y: 0 }); }
    if (ball.x + ball.r > LOGIK_B && ball.vx > 0) { ball.x = LOGIK_B - ball.r; spiegle({ x: -1, y: 0 }); }
    if (ball.y - ball.r < 0 && ball.vy < 0) { ball.y = ball.r; spiegle({ x: 0, y: 1 }); }

    if (ball.vy > 0 &&
        Math.abs(ball.x - schlaeger.x) <= schlaeger.b / 2 + ball.r &&
        ball.y + ball.r >= schlaeger.y &&
        ball.y - ball.r <= schlaeger.y + schlaeger.h) {
      const winkel = schlaegerWinkel(ball.x, schlaeger.x, schlaeger.b);
      ball.vx = tempo * Math.sin(winkel);
      ball.vy = -tempo * Math.cos(winkel);
      ball.y = schlaeger.y - ball.r;
    }

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
      break;
    }

    if (ball.y - ball.r > LOGIK_H) ballVerloren();
  }

  function trifftStein(stein, treffer) {
    // Abprall (gilt auch für Stahl)
    if (treffer.seite === "links") { ball.vx = -Math.abs(ball.vx); ball.x = stein.x - ball.r; }
    else if (treffer.seite === "rechts") { ball.vx = Math.abs(ball.vx); ball.x = stein.x + stein.b + ball.r; }
    else if (treffer.seite === "oben") { ball.vy = -Math.abs(ball.vy); ball.y = stein.y - ball.r; }
    else { ball.vy = Math.abs(ball.vy); ball.y = stein.y + stein.h + ball.r; }

    if (stein.unzerstoerbar) return; // Stahl: nur abprallen

    stein.leben -= 1;
    if (stein.leben > 0) return;

    zerstoere(stein, true);

    // Reihe abgeräumt (zerstörbare Steine) → Ball etwas schneller
    if (steine.filter(s => s.reihe === stein.reihe && !s.unzerstoerbar).every(s => s.leben <= 0)) {
      tempo = Math.min(TEMPO_MAX, tempo * 1.06);
      const betrag = Math.hypot(ball.vx, ball.vy);
      if (betrag > 0) { ball.vx = ball.vx / betrag * tempo; ball.vy = ball.vy / betrag * tempo; }
    }

    if (alleWeg(steine)) naechsteMauer();
  }

  // Stein zerstören: Punkte, Effekt, ggf. Power-up-Drop und Explosion.
  function zerstoere(stein, ausLoeser) {
    stein.leben = 0;
    punkte += stein.punkte;
    zerstoertGesamt += 1;
    api.setzePunkte(punkte);
    steinEffekt(stein);
    if (stein.drop || (ausLoeser && Math.random() < 0.06)) spawnePowerup(stein);
    if (stein.explosiv) explodiere(stein);
  }

  // Explosiv-Stein sprengt die 3×3-Nachbarschaft; Kettenreaktion über weitere Explosiv-Steine.
  function explodiere(quelle) {
    const queue = [quelle];
    const gesehen = new Set([quelle.reihe + ":" + quelle.spalte]);
    while (queue.length) {
      const q = queue.shift();
      for (let dz = -1; dz <= 1; dz++) {
        for (let ds = -1; ds <= 1; ds++) {
          if (dz === 0 && ds === 0) continue;
          const z = q.reihe + dz, sp = q.spalte + ds;
          if (z < 0 || sp < 0 || z >= RASTER.zeilen || sp >= RASTER.spalten) continue;
          const n = steine[z * RASTER.spalten + sp];
          if (!n || n.leben <= 0 || n.unzerstoerbar) continue;
          const key = z + ":" + sp;
          n.leben = 0;
          punkte += n.punkte;
          zerstoertGesamt += 1;
          steinEffekt(n);
          if (n.explosiv && !gesehen.has(key)) { gesehen.add(key); queue.push(n); }
        }
      }
    }
    api.setzePunkte(punkte);
  }

  function spawnePowerup(stein) {
    const arten = ["breit", "leben", "extra"];
    const art = arten[Math.floor(Math.random() * arten.length)];
    powerups.push({ x: stein.x + stein.b / 2, y: stein.y + stein.h / 2, art, vy: 115 });
    if (powerups.length > 8) powerups = powerups.slice(-8);
  }

  function wendePowerupAn(art) {
    if (art === "breit") { schlaeger.b = SCHLAEGER_BREIT; breitBis = 9; }
    else if (art === "leben") { leben = Math.min(5, leben + 1); lebenEl.textContent = String(leben); }
    else if (art === "extra") { punkte += 50; api.setzePunkte(punkte); }
    if (!api.reduzierteBewegung) {
      const text = art === "breit" ? "breiter Schläger" : art === "leben" ? "+1 Leben" : "+50";
      effekte.push({ art: "t", text, x: klemme(schlaeger.x, 40, LOGIK_B - 40), y: schlaeger.y - 14, t: 0.9 });
    }
  }

  function naechsteMauer() {
    mauerNr += 1;
    steine = baueMauer(mauerNr);
    powerups = [];
    leben = Math.min(5, leben + 1);
    lebenEl.textContent = String(leben);
    andocken();
  }

  function ballVerloren() {
    leben -= 1;
    lebenEl.textContent = String(Math.max(0, leben));
    if (leben <= 0) {
      laeuftRunde = false;
      zeichne();
      api.vorbei(punkte, `<p>Mauer ${mauerNr} erreicht · ${zerstoertGesamt} Steine zerstört</p>`);
    } else {
      andocken();
    }
  }

  function steinEffekt(stein) {
    if (api.reduzierteBewegung) return;
    for (let i = 0; i < 9; i++) {
      effekte.push({
        art: "p", typ: stein.typ,
        x: stein.x + stein.b / 2, y: stein.y + stein.h / 2,
        vx: (Math.random() - 0.5) * 190, vy: -Math.random() * 130 - 30,
        t: 0.4
      });
    }
    if (stein.punkte) effekte.push({ art: "t", text: "+" + stein.punkte, x: stein.x + stein.b / 2, y: stein.y, t: 0.6 });
    if (effekte.length > 160) effekte = effekte.slice(-160);
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

  function steinFarbe(stein, F) {
    switch (stein.typ) {
      case "stahl":    return F.leise;
      case "explosiv": return F.physik;
      case "gold":     return F.gold;
      case "fest":     return F.akzent;
      case "hart":     return F.fehler;
      default:         return F.ok; // weich
    }
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
      gold: "#c79a1e"
    };
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);

    ctx.fillStyle = F.leise;
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Mauer " + mauerNr, 8, 24);

    for (const stein of steine) {
      if (!stein || stein.leben <= 0) continue;
      ctx.fillStyle = steinFarbe(stein, F);
      const anteil = stein.unzerstoerbar ? 1 : 0.5 + 0.5 * (stein.leben / stein.maxLeben);
      ctx.globalAlpha = anteil;
      rund(stein.x + 2, stein.y + 2, stein.b - 4, stein.h - 4, 3);
      ctx.globalAlpha = 1;
      const mx = stein.x + stein.b / 2, my = stein.y + stein.h / 2;
      if (stein.typ === "stahl") {            // Bolzen-Punkte als Stahl-Markierung
        ctx.fillStyle = F.bg;
        for (const ox of [-stein.b / 2 + 7, stein.b / 2 - 7]) { ctx.beginPath(); ctx.arc(mx + ox, my, 1.6, 0, 2 * Math.PI); ctx.fill(); }
      } else if (stein.typ === "explosiv") {  // Stern-Funke
        ctx.strokeStyle = F.bg; ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(mx - 5, my); ctx.lineTo(mx + 5, my);
        ctx.moveTo(mx, my - 5); ctx.lineTo(mx, my + 5);
        ctx.moveTo(mx - 3.5, my - 3.5); ctx.lineTo(mx + 3.5, my + 3.5);
        ctx.moveTo(mx - 3.5, my + 3.5); ctx.lineTo(mx + 3.5, my - 3.5);
        ctx.stroke();
      } else if (stein.typ === "gold") {      // Stern
        ctx.fillStyle = F.bg;
        ctx.font = "700 12px 'Source Sans 3', system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText("★", mx, my + 0.5);
        ctx.textBaseline = "alphabetic";
      }
    }

    // Power-ups
    for (const pu of powerups) {
      ctx.fillStyle = pu.art === "leben" ? F.fehler : pu.art === "breit" ? F.akzent : F.ok;
      rund(pu.x - 9, pu.y - 7, 18, 14, 4);
      ctx.fillStyle = "#ffffff";
      ctx.font = "700 11px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText(pu.art === "breit" ? "B" : pu.art === "leben" ? "♥" : "+", pu.x, pu.y + 0.5);
      ctx.textBaseline = "alphabetic";
    }

    ctx.fillStyle = F.akzent;
    rund(schlaeger.x - schlaeger.b / 2, schlaeger.y, schlaeger.b, schlaeger.h, 5);
    ctx.fillStyle = F.text;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, 2 * Math.PI);
    ctx.fill();

    for (const e of effekte) {
      if (e.art === "p") {
        ctx.globalAlpha = Math.max(0, e.t / 0.4);
        ctx.fillStyle = e.typ === "gold" ? F.gold : e.typ === "stahl" ? F.leise : e.typ === "explosiv" ? F.physik : e.typ === "fest" ? F.akzent : e.typ === "hart" ? F.fehler : F.ok;
        ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
      } else {
        ctx.globalAlpha = Math.max(0, e.t / 0.7);
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
      const text = mauerNr > 1 ? `Mauer ${mauerNr} — Leertaste oder Tippen!` : "Leertaste oder Tippen löst den Ball";
      ctx.fillText(text, LOGIK_B / 2, 250);
    }
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
  hinweis("Mauerbrecher", "Drück auf „Start“!");
}
