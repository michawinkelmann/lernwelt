// spiel.js — „Schlange" (Snake) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (schritt, neuesFutter, Tempo-Funktionen) ist exportiert und
// in Node testbar — auf Modulebene wird weder document noch window angefasst,
// das Canvas entsteht erst in starte().

export const GITTER_B = 24; // Spalten
export const GITTER_H = 16; // Zeilen
export const ZELLE = 24;    // logische Pixelgröße einer Zelle (Canvas: 576 × 384)

const DELTA = {
  links: { x: -1, y: 0 }, rechts: { x: 1, y: 0 },
  hoch: { x: 0, y: -1 }, runter: { x: 0, y: 1 }
};
const GEGENRICHTUNG = { links: "rechts", rechts: "links", hoch: "runter", runter: "hoch" };

export const manifest = {
  id: "sp-schlange",
  titel: "Schlange",
  kurz: "Der Klassiker: Friss Futter, wachse, beiß dir nicht in den Schwanz.",
  punkteLabel: "Punkte",
  highscore: true,
  zeigeZeit: false,
  steuerungHinweis: "Pfeiltasten/WASD oder Wischen — Leertaste pausiert."
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Tempostufe 1, 2, 3, … — steigt alle 5 Futterstücke.
export function tempoStufe(gefressen) {
  return 1 + Math.floor(gefressen / 5);
}

// Züge pro Sekunde: Start 6, +0,5 je 5 Futter, gedeckelt bei 14.
export function zuegeProSekunde(gefressen) {
  return Math.min(14, 6 + 0.5 * Math.floor(gefressen / 5));
}

// Ausgangslage: Schlange der Länge 3 mittig, Blick nach rechts.
export function startZustand() {
  return {
    breite: GITTER_B, hoehe: GITTER_H,
    schlange: [{ x: 11, y: 8 }, { x: 10, y: 8 }, { x: 9, y: 8 }],
    richtung: "rechts",
    futter: { x: 17, y: 8 },
    gefressen: 0, punkte: 0,
    gegessen: false, kollision: false
  };
}

// Ein Logik-Schritt. `wunsch` = gewünschte neue Richtung oder null.
// 180°-Wenden werden ignoriert (alte Richtung bleibt). Liefert einen NEUEN
// Zustand — die Eingabe bleibt unverändert. Felder im Ergebnis:
// gegessen (dieser Schritt hat Futter erwischt), kollision (Wand/Selbstbiss).
export function schritt(zustand, wunsch) {
  const richtung = (wunsch && DELTA[wunsch] && wunsch !== GEGENRICHTUNG[zustand.richtung])
    ? wunsch : zustand.richtung;
  const d = DELTA[richtung];
  const kopf = { x: zustand.schlange[0].x + d.x, y: zustand.schlange[0].y + d.y };
  const gegessen = !!zustand.futter && kopf.x === zustand.futter.x && kopf.y === zustand.futter.y;

  // Ohne Fressen rückt das Schwanzende weg — diese Zelle ist im selben Zug frei.
  const koerper = gegessen ? zustand.schlange : zustand.schlange.slice(0, -1);
  const wand = kopf.x < 0 || kopf.y < 0 || kopf.x >= zustand.breite || kopf.y >= zustand.hoehe;
  const biss = koerper.some(t => t.x === kopf.x && t.y === kopf.y);
  if (wand || biss) return { ...zustand, richtung, gegessen: false, kollision: true };

  const schlange = [kopf, ...(gegessen ? zustand.schlange : zustand.schlange.slice(0, -1))];
  return {
    ...zustand,
    schlange, richtung,
    futter: gegessen ? null : zustand.futter,
    gefressen: zustand.gefressen + (gegessen ? 1 : 0),
    // Punkte: 10 × Tempostufe, die beim Fressen gerade gilt (Stufe vor dem Happen).
    punkte: zustand.punkte + (gegessen ? 10 * tempoStufe(zustand.gefressen) : 0),
    gegessen, kollision: false
  };
}

// Neues Futter auf einer freien Zelle — nie auf der Schlange. rng() liefert [0,1);
// mit injiziertem RNG deterministisch. Liefert null, wenn das Gitter voll ist.
export function neuesFutter(rng, belegt, breite = GITTER_B, hoehe = GITTER_H) {
  const belegtSet = new Set(belegt.map(z => z.x + "," + z.y));
  const frei = [];
  for (let y = 0; y < hoehe; y++)
    for (let x = 0; x < breite; x++)
      if (!belegtSet.has(x + "," + y)) frei.push({ x, y });
  if (!frei.length) return null;
  return frei[Math.min(frei.length - 1, Math.floor(rng() * frei.length))];
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  const BREITE_PX = GITTER_B * ZELLE; // 576
  const HOEHE_PX = GITTER_H * ZELLE;  // 384

  // Mindestens 2× rendern: das Canvas wird per CSS auf Containerbreite skaliert,
  // devicePixelRatio allein wäre auf großen Bildschirmen zu grob.
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(BREITE_PX * faktor);
  canvas.height = Math.round(HOEHE_PX * faktor);
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // Tempostufen-Anzeige in der Kopfzeile ergänzen
  let stufeEl = api.kopf.querySelector("#sl-stufe");
  if (!stufeEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Tempo-Stufe: <b id="sl-stufe">1</b>';
    api.kopf.appendChild(span);
    stufeEl = span.querySelector("b");
  }

  // Bildschirm-Richtungstasten unter der Fläche (nur auf Touch-Geräten sichtbar)
  if (!api.flaeche.parentElement.querySelector(".spiel-touch-tasten")) {
    const tasten = document.createElement("div");
    tasten.className = "spiel-touch-tasten nur-touch";
    tasten.innerHTML =
      '<span></span><button type="button" data-richtung="hoch" aria-label="Nach oben">▲</button><span></span>' +
      '<button type="button" data-richtung="links" aria-label="Nach links">◀</button>' +
      '<button type="button" data-richtung="runter" aria-label="Nach unten">▼</button>' +
      '<button type="button" data-richtung="rechts" aria-label="Nach rechts">▶</button>';
    api.flaeche.insertAdjacentElement("afterend", tasten);
    tasten.addEventListener("click", ev => {
      const knopf = ev.target.closest("button[data-richtung]");
      if (!knopf) return;
      wuensche(knopf.dataset.richtung);
      api.flaeche.focus({ preventScroll: true });
    });
  }

  let zustand = startZustand();
  let wunschListe = [];        // kleine Eingabe-Warteschlange (max. 2 Richtungen)
  let akku = 0;                // Zeit-Akkumulator: Logik-Tick getrennt vom RAF
  let laeuftRunde = false;
  let pause = false;
  const rng = Math.random;

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }

  function starteRunde() {
    zustand = startZustand();
    zustand.futter = neuesFutter(rng, zustand.schlange);
    wunschListe = [];
    akku = 0;
    pause = false;
    laeuftRunde = true;
    api.setzePunkte(0);
    stufeEl.textContent = "1";
    api.loop(schleife);
  }

  function schleife(dt) {
    akku += dt;
    while (laeuftRunde && akku >= 1 / zuegeProSekunde(zustand.gefressen)) {
      akku -= 1 / zuegeProSekunde(zustand.gefressen);
      tick();
    }
    if (laeuftRunde) zeichne();
  }

  function tick() {
    zustand = schritt(zustand, wunschListe.shift() || null);
    if (zustand.kollision) {
      laeuftRunde = false;
      zeichne();
      api.vorbei(zustand.punkte,
        `<p>Länge: ${zustand.schlange.length} Felder · Tempo-Stufe ${tempoStufe(zustand.gefressen)}</p>`);
      return;
    }
    if (zustand.gegessen) {
      zustand.futter = neuesFutter(rng, zustand.schlange);
      api.setzePunkte(zustand.punkte);
      stufeEl.textContent = String(tempoStufe(zustand.gefressen));
    }
  }

  function wuensche(richtung) {
    if (!laeuftRunde || pause || !DELTA[richtung]) return;
    const letzte = wunschListe.length ? wunschListe[wunschListe.length - 1] : zustand.richtung;
    if (richtung === letzte || richtung === GEGENRICHTUNG[letzte]) return; // 180° ignorieren
    if (wunschListe.length < 2) wunschListe.push(richtung);
  }

  function pauseUmschalten() {
    if (!laeuftRunde) return;
    pause = !pause;
    if (pause) {
      api.loopStopp();
      zeichne();
      hinweis("Pause", "Weiter mit Leertaste oder Tipp");
    } else {
      api.loop(schleife);
    }
  }

  // --- Eingaben ---
  const TASTE_RICHTUNG = {
    ArrowLeft: "links", ArrowRight: "rechts", ArrowUp: "hoch", ArrowDown: "runter",
    a: "links", d: "rechts", w: "hoch", s: "runter",
    A: "links", D: "rechts", W: "hoch", S: "runter"
  };
  api.tasten(ev => {
    if (ev.key === " ") { pauseUmschalten(); return; }
    const richtung = TASTE_RICHTUNG[ev.key];
    if (richtung) wuensche(richtung);
  });
  api.wisch(richtung => {
    if (richtung === "tipp") pauseUmschalten();
    else wuensche(richtung);
  });

  // --- Zeichnen ---
  function kachel(x, y, groesse, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, groesse, groesse, radius);
    else ctx.rect(x, y, groesse, groesse);
    ctx.fill();
  }

  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      gitter: farbe("--karo", "rgba(125,108,80,0.16)"),
      schlange: farbe("--akzent", "#19599f"),
      futter: farbe("--fehler", "#b3261e"),
      text: farbe("--text", "#2c2823")
    };
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, BREITE_PX, HOEHE_PX);

    // dezentes Gitter
    ctx.strokeStyle = F.gitter;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < GITTER_B; x++) { ctx.moveTo(x * ZELLE + 0.5, 0); ctx.lineTo(x * ZELLE + 0.5, HOEHE_PX); }
    for (let y = 1; y < GITTER_H; y++) { ctx.moveTo(0, y * ZELLE + 0.5); ctx.lineTo(BREITE_PX, y * ZELLE + 0.5); }
    ctx.stroke();

    // Futter: Apfel (Kreis + Stiel)
    if (zustand.futter) {
      const fx = zustand.futter.x * ZELLE + ZELLE / 2;
      const fy = zustand.futter.y * ZELLE + ZELLE / 2;
      ctx.fillStyle = F.futter;
      ctx.beginPath();
      ctx.arc(fx, fy + 1, ZELLE / 2 - 4, 0, 2 * Math.PI);
      ctx.fill();
      ctx.strokeStyle = F.text;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(fx, fy - 7);
      ctx.lineTo(fx + 4, fy - 11);
      ctx.stroke();
    }

    // Schlange (Kopf kräftig, Körper leicht transparent)
    for (let i = zustand.schlange.length - 1; i >= 0; i--) {
      const t = zustand.schlange[i];
      ctx.fillStyle = F.schlange;
      ctx.globalAlpha = i === 0 ? 1 : 0.82;
      kachel(t.x * ZELLE + 2, t.y * ZELLE + 2, ZELLE - 4, 6);
    }
    ctx.globalAlpha = 1;

    // Augen auf dem Kopf (zeigen die Laufrichtung)
    const kopf = zustand.schlange[0];
    const d = DELTA[zustand.richtung];
    const ax = kopf.x * ZELLE + ZELLE / 2 + d.x * 5;
    const ay = kopf.y * ZELLE + ZELLE / 2 + d.y * 5;
    ctx.fillStyle = F.bg;
    ctx.beginPath(); ctx.arc(ax + d.y * 4, ay + d.x * 4, 2.2, 0, 2 * Math.PI); ctx.fill();
    ctx.beginPath(); ctx.arc(ax - d.y * 4, ay - d.x * 4, 2.2, 0, 2 * Math.PI); ctx.fill();
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
  }

  api.neustartCb(starteRunde);

  // Ausgangsbild vor dem ersten Start
  zeichne();
  hinweis("Schlange", "Drück auf „Start“!");
}
