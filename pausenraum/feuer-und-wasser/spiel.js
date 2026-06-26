// spiel.js — „Feuer & Wasser" (kooperativer 2-Spieler-Plattformer) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Level-Parsing, feste/tödliche Kacheln, AABB-Überlappung)
// ist exportiert und in Node testbar — auf Modulebene wird weder document noch
// window angefasst, das Canvas entsteht erst in starte().

export const KACHEL = 24; // Kantenlänge einer Kachel in logischen Pixeln

export const manifest = {
  id: "sp-feuer-und-wasser",
  titel: "Feuer & Wasser",
  kurz: "Kooperativer Plattformer für zwei: Feuer und Wasser meiden die jeweils tödlichen Seen und erreichen gemeinsam ihre Ausgänge.",
  punkteLabel: "Level",
  highscore: false, // kooperativer Durchlauf, kein Solo-Score
  zeigeZeit: true,
  steuerungHinweis: "Feuer (rot): A / D laufen, W springen · Wasser (blau): ← / → laufen, ↑ springen · Bringt beide zu ihren Ausgängen!"
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Feste (solide) Kacheln, an denen Figuren kollidieren. Block "#" und dünne
// Plattform "=" sind fest; alles andere (Luft, Seen, Türen, Starts) ist passierbar.
export function istFest(zeichen) {
  return zeichen === "#" || zeichen === "=";
}

// Ist die Kachel `zeichen` für eine Figur vom Typ `figurTyp` tödlich?
// Regeln: Lava "L" tötet Wasser, Aqua/See "A" tötet Feuer, Gift "G" tötet beide.
export function toedlichFuer(figurTyp, zeichen) {
  if (zeichen === "G") return true;            // Gift/Schleim — tödlich für beide
  if (zeichen === "L") return figurTyp === "wasser"; // Lava — nur Wasser stirbt
  if (zeichen === "A") return figurTyp === "feuer";  // Wasser-See — nur Feuer stirbt
  return false;
}

// AABB-Überlappung zweier Rechtecke a, b = { x, y, b, h } (b=Breite, h=Höhe).
// Liefert true, wenn sich die Rechtecke (echt) überlappen.
export function rechteckUeberlappung(a, b) {
  return a.x < b.x + b.b && a.x + a.b > b.x && a.y < b.y + b.h && a.y + a.b > b.y;
}

// Parst eine ASCII-Tilemap (Array von Zeilen ODER mehrzeiliger String) in ein
// Level-Objekt. Start-/Ausgangs-/Gefahren-Zeichen bleiben in `tiles` als
// passierbare Markierungen erhalten (sie sind nicht fest); ihre Positionen
// werden zusätzlich als Pixel-Koordinaten herausgezogen.
export function parseLevel(text) {
  const zeilen = Array.isArray(text) ? text.slice() : String(text).split("\n");
  // Nachlaufende leere Zeile (z. B. aus Template-Strings) entfernen.
  while (zeilen.length && zeilen[zeilen.length - 1] === "") zeilen.pop();
  const hoehe = zeilen.length;
  let breite = 0;
  for (const z of zeilen) breite = Math.max(breite, z.length);

  const tiles = [];
  let feuerStart = null, wasserStart = null, feuerAusgang = null, wasserAusgang = null;

  for (let zy = 0; zy < hoehe; zy++) {
    const reihe = [];
    const quelle = zeilen[zy] || "";
    for (let zx = 0; zx < breite; zx++) {
      const z = quelle[zx] || " ";
      const px = zx * KACHEL, py = zy * KACHEL;
      if (z === "F") feuerStart = { x: px, y: py };
      else if (z === "W") wasserStart = { x: px, y: py };
      else if (z === "f") feuerAusgang = { x: px, y: py };
      else if (z === "w") wasserAusgang = { x: px, y: py };
      reihe.push(z);
    }
    tiles.push(reihe);
  }

  return { breite, hoehe, tiles, feuerStart, wasserStart, feuerAusgang, wasserAusgang };
}

// Fünf Level-Layouts mit steigender Schwierigkeit (Zeichen siehe oben).
//   #  fester Block        (leer)  Luft
//   =  dünne Plattform     F/W     Feuer-/Wasser-Start
//   f/w Feuer-/Wasser-Ausgang
//   L  Lava (tötet Wasser) A  Wasser-See (tötet Feuer)  G  Gift (tötet beide)
// Die Layouts sind mit einem Erreichbarkeits-Prüfer (max. Sprunghöhe 2 Kacheln,
// Reichweite ~3 Kacheln) so konstruiert, dass JEDE Figur ihre Tür sicher
// erreichen kann und Start/Tür auf festem Grund stehen. Über Kreuz angeordnete
// Türen sorgen dafür, dass beide Figuren an der für sie tödlichen Lache der
// anderen vorbeispringen müssen.
export const LEVELS = [
  [ // 1 — flach: Türen über Kreuz, je eine kleine gegnerische Lache (A für Feuer, L für Wasser)
    "##################",
    "#                #",
    "#                #",
    "#                #",
    "#                #",
    "#                #",
    "#                #",
    "# F w   AL   f W #",
    "##################"
  ],
  [ // 2 — Türen auf 2-hoch-Stufen, Lachen am Boden (Aqua · Gift · Lava) zum Überspringen
    "####################",
    "#                  #",
    "#                  #",
    "#                  #",
    "#                  #",
    "#                  #",
    "#   w          f   #",
    "#   #          #   #",
    "# F   A  G   L   W #",
    "####################"
  ],
  [ // 3 — mehr Lachen im Wechsel (A/L/A/L) plus Gift, Türen auf niedrigen Stufen
    "######################",
    "#                    #",
    "#                    #",
    "#                    #",
    "#                    #",
    "#                    #",
    "#   w            f   #",
    "#  ##            ##  #",
    "# F    A L A L G   W #",
    "######################"
  ],
  [ // 4 — höher: Mittelinsel, breitere Lachen (AA · GG · LL), Türen auf 2-hoch-Stufen
    "########################",
    "#                      #",
    "#                      #",
    "#                      #",
    "#                      #",
    "#                      #",
    "#                      #",
    "#   w     ####     f   #",
    "#  ##              ##  #",
    "# F    AA  GG  LL    W #",
    "########################"
  ],
  [ // 5 — Turm: zwei Plattformetagen, gemischte Lachen, Türen ganz außen oben
    "##########################",
    "#                        #",
    "#                        #",
    "#                        #",
    "#                        #",
    "#                        #",
    "#           ###          #",
    "#                        #",
    "#   w    ###   ###   f   #",
    "#  ##                ##  #",
    "# F    AA   GG    LL   W #",
    "##########################"
  ]
];

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  // Logische Spielfläche: größtes Level bestimmt die Canvas-Maße (alle Level
  // werden mittig in dieser Fläche gezeichnet, falls sie kleiner sind).
  let logikB = 0, logikH = 0;
  for (const lv of LEVELS) {
    const p = parseLevel(lv);
    logikB = Math.max(logikB, p.breite * KACHEL);
    logikH = Math.max(logikH, p.hoehe * KACHEL);
  }

  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(logikB * faktor);
  canvas.height = Math.round(logikH * faktor);
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:72vh;height:auto;margin:0 auto;border-radius:inherit;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // Tode-Anzeige in der Kopfzeile.
  let todeEl = api.kopf.querySelector("#fw-tode");
  if (!todeEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Tode: <b id="fw-tode">0</b>';
    api.kopf.appendChild(span);
    todeEl = span.querySelector("b");
  }

  const SCHWERKRAFT = 900;   // px/s²
  const LAUF_TEMPO = 132;    // px/s
  const SPRUNG = 330;        // px/s (Anfangsgeschwindigkeit nach oben)
  const FIG_B = 16, FIG_H = 20; // Figurmaße (etwas kleiner als eine Kachel)

  // Eingabe-Status (über keydown gesetzt, über keyup gelöscht).
  const tasten = {
    feuerLinks: false, feuerRechts: false, feuerSprung: false,
    wasserLinks: false, wasserRechts: false, wasserSprung: false
  };

  let levelNr = 0;          // 0-basiert
  let level = null;         // geparstes aktuelles Level
  let offsetX = 0, offsetY = 0; // zentrierter Versatz des Levels in der Canvas-Fläche
  let feuer = null, wasser = null;
  let tode = 0;
  let laeuft = false;
  let verstrichen = 0;      // Sekunden seit Spielstart
  let geschafft = false;    // Sieg erreicht
  let zielHalten = 0;       // Sekunden, die beide gleichzeitig am Ausgang stehen

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function klemme(wert, min, max) { return Math.max(min, Math.min(max, wert)); }

  // Figur-Objekt am Start einer Levelpassage erzeugen/zurücksetzen.
  function macheFigur(typ, start) {
    const sx = start ? start.x : KACHEL;
    const sy = start ? start.y : KACHEL;
    return {
      typ,
      x: sx + (KACHEL - FIG_B) / 2, // mittig in der Start-Kachel
      y: sy + (KACHEL - FIG_H),     // auf dem Kachelboden stehend
      vx: 0, vy: 0,
      amBoden: false
    };
  }

  // Lädt Level `nr` (0-basiert) und setzt die Figuren auf ihre Startpunkte.
  function ladeLevel(nr) {
    levelNr = nr;
    level = parseLevel(LEVELS[nr]);
    offsetX = Math.round((logikB - level.breite * KACHEL) / 2);
    offsetY = Math.round((logikH - level.hoehe * KACHEL) / 2);
    feuer = macheFigur("feuer", level.feuerStart);
    wasser = macheFigur("wasser", level.wasserStart);
    zielHalten = 0;
    api.setzePunkte(nr + 1);
  }

  // Level neu beginnen (nach einem Tod): Figuren zurück an Start.
  function levelNeustart() {
    tode += 1;
    todeEl.textContent = String(tode);
    feuer = macheFigur("feuer", level.feuerStart);
    wasser = macheFigur("wasser", level.wasserStart);
    zielHalten = 0;
  }

  function gesamtNeustart() {
    tode = 0;
    todeEl.textContent = "0";
    verstrichen = 0;
    geschafft = false;
    api.setzeZeit("0 s");
    ladeLevel(0);
    laeuft = true;
    api.loop(dt => { aktualisiere(dt); zeichne(); });
  }

  // Tile-Zeichen an Pixelposition (x, y) in Level-Koordinaten; außerhalb = "#".
  function tileBei(x, y) {
    const zx = Math.floor(x / KACHEL);
    const zy = Math.floor(y / KACHEL);
    if (zy < 0 || zy >= level.hoehe || zx < 0 || zx >= level.breite) return "#";
    return level.tiles[zy][zx];
  }

  // Kollidiert das Rechteck r = {x,y,b,h} mit einer festen Kachel?
  function trifftFest(r) {
    const x0 = Math.floor(r.x / KACHEL);
    const x1 = Math.floor((r.x + r.b - 0.001) / KACHEL);
    const y0 = Math.floor(r.y / KACHEL);
    const y1 = Math.floor((r.y + r.h - 0.001) / KACHEL);
    for (let zy = y0; zy <= y1; zy++) {
      for (let zx = x0; zx <= x1; zx++) {
        if (zy < 0 || zy >= level.hoehe || zx < 0 || zx >= level.breite) return true; // Rand = Wand
        if (istFest(level.tiles[zy][zx])) return true;
      }
    }
    return false;
  }

  // Steht eine Figur (mittig unten) auf einer für sie tödlichen Kachel? Wir
  // prüfen mehrere Punkte des Körpers, damit Berührung sicher erkannt wird.
  function aufToedlich(fig) {
    const punkte = [
      { x: fig.x + 2,          y: fig.y + FIG_H - 2 },
      { x: fig.x + FIG_B - 2,  y: fig.y + FIG_H - 2 },
      { x: fig.x + FIG_B / 2,  y: fig.y + FIG_H - 2 },
      { x: fig.x + FIG_B / 2,  y: fig.y + FIG_H / 2 }
    ];
    for (const p of punkte) {
      if (toedlichFuer(fig.typ, tileBei(p.x, p.y))) return true;
    }
    return false;
  }

  // Physik einer Figur fortschreiben: Eingabe → Geschwindigkeit, dann achsen-
  // getrennt bewegen und an festen Kacheln auflösen (erst x, dann y).
  function bewegeFigur(fig, links, rechts, sprung, dt) {
    fig.vx = 0;
    if (links) fig.vx -= LAUF_TEMPO;
    if (rechts) fig.vx += LAUF_TEMPO;

    if (sprung && fig.amBoden) {
      fig.vy = -SPRUNG;
      fig.amBoden = false;
    }

    fig.vy += SCHWERKRAFT * dt;
    if (fig.vy > 760) fig.vy = 760; // Endgeschwindigkeit begrenzen

    // --- x-Achse ---
    fig.x += fig.vx * dt;
    let r = { x: fig.x, y: fig.y, b: FIG_B, h: FIG_H };
    if (trifftFest(r)) {
      if (fig.vx > 0) {
        // an die linke Kante des getroffenen Blocks setzen
        fig.x = Math.floor((fig.x + FIG_B) / KACHEL) * KACHEL - FIG_B - 0.01;
      } else if (fig.vx < 0) {
        fig.x = (Math.floor(fig.x / KACHEL) + 1) * KACHEL + 0.01;
      }
      fig.vx = 0;
    }

    // --- y-Achse ---
    fig.amBoden = false;
    fig.y += fig.vy * dt;
    r = { x: fig.x, y: fig.y, b: FIG_B, h: FIG_H };
    if (trifftFest(r)) {
      if (fig.vy > 0) {
        // auf Blockoberseite stellen
        fig.y = Math.floor((fig.y + FIG_H) / KACHEL) * KACHEL - FIG_H - 0.01;
        fig.amBoden = true;
      } else if (fig.vy < 0) {
        fig.y = (Math.floor(fig.y / KACHEL) + 1) * KACHEL + 0.01;
      }
      fig.vy = 0;
    }
  }

  // Steht eine Figur an ihrem Ausgang? (Ausgangskachel-Rechteck überlappen.)
  function amAusgang(fig, ausgang) {
    if (!ausgang) return false;
    const tor = { x: ausgang.x, y: ausgang.y, b: KACHEL, h: KACHEL };
    return rechteckUeberlappung({ x: fig.x, y: fig.y, b: FIG_B, h: FIG_H }, tor);
  }

  function aktualisiere(dt) {
    if (!laeuft) return;
    verstrichen += dt;
    api.setzeZeit(Math.floor(verstrichen) + " s");

    bewegeFigur(feuer, tasten.feuerLinks, tasten.feuerRechts, tasten.feuerSprung, dt);
    bewegeFigur(wasser, tasten.wasserLinks, tasten.wasserRechts, tasten.wasserSprung, dt);

    // Tod prüfen: tödliche Kachel ODER aus der Welt gefallen.
    if (aufToedlich(feuer) || aufToedlich(wasser) ||
        feuer.y > level.hoehe * KACHEL + 40 || wasser.y > level.hoehe * KACHEL + 40) {
      levelNeustart();
      return;
    }

    // Ziel: beide gleichzeitig an ihrem Ausgang, kurz halten (gegen Zufalls-Touch).
    if (amAusgang(feuer, level.feuerAusgang) && amAusgang(wasser, level.wasserAusgang)) {
      zielHalten += dt;
      if (zielHalten >= 0.25) levelGeschafft();
    } else {
      zielHalten = 0;
    }
  }

  function levelGeschafft() {
    if (levelNr + 1 < LEVELS.length) {
      ladeLevel(levelNr + 1);
    } else {
      // Alle Level geschafft → Sieg.
      laeuft = false;
      geschafft = true;
      zeichne();
      const zeit = Math.floor(verstrichen);
      api.vorbei(LEVELS.length,
        "<p>Geschafft! Alle " + LEVELS.length + " Level gemeinsam gelöst.<br>Zeit: " +
        zeit + " s · Tode: " + tode + "</p>");
    }
  }

  // --- Eingaben ---
  // keydown über das Gerüst (preventDefault bei Pfeilen/Leertaste schon dort).
  api.tasten(ev => {
    setzeTaste(ev.key, true);
  });
  // keyup direkt auf der Spielfläche (wie Mauerbrecher).
  api.flaeche.addEventListener("keyup", ev => {
    setzeTaste(ev.key, false);
  });
  // Fokusverlust: alle Tasten loslassen (sonst „klemmen" Richtungen).
  api.flaeche.addEventListener("blur", () => {
    for (const k in tasten) tasten[k] = false;
  });

  function setzeTaste(key, an) {
    switch (key) {
      // Feuer (Spieler 1): A / D laufen, W springen
      case "a": case "A": tasten.feuerLinks = an; break;
      case "d": case "D": tasten.feuerRechts = an; break;
      case "w": case "W": tasten.feuerSprung = an; break;
      // Wasser (Spieler 2): Pfeile links/rechts, hoch springen
      case "ArrowLeft": tasten.wasserLinks = an; break;
      case "ArrowRight": tasten.wasserRechts = an; break;
      case "ArrowUp": tasten.wasserSprung = an; break;
      default: break;
    }
  }

  // --- Zeichnen ---
  function rund(x, y, b, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, radius);
    else ctx.rect(x, y, b, h);
    ctx.fill();
  }

  // Kreide-Ziegel: gefüllter Block mit hellem Rand und Fugenkreuz.
  function zeichneZiegel(px, py, F) {
    ctx.fillStyle = F.ziegel;
    rund(px + 1, py + 1, KACHEL - 2, KACHEL - 2, 3);
    ctx.strokeStyle = F.ziegelRand;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + 4, py + KACHEL / 2);
    ctx.lineTo(px + KACHEL - 4, py + KACHEL / 2);
    ctx.moveTo(px + KACHEL / 2, py + 4);
    ctx.lineTo(px + KACHEL / 2, py + KACHEL - 4);
    ctx.stroke();
  }

  // See-Fläche (Lava/Wasser/Gift) als Kachel mit leichter Wellenlinie oben.
  function zeichneSee(px, py, fuell, kontur) {
    ctx.fillStyle = fuell;
    ctx.fillRect(px, py, KACHEL, KACHEL);
    ctx.strokeStyle = kontur;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, py + 5);
    ctx.quadraticCurveTo(px + KACHEL / 4, py + 1, px + KACHEL / 2, py + 5);
    ctx.quadraticCurveTo(px + 3 * KACHEL / 4, py + 9, px + KACHEL, py + 5);
    ctx.stroke();
  }

  // Tür/Ausgang: Rahmen in der Figurfarbe mit Buchstabe.
  function zeichneTuer(px, py, rahmen, buchstabe, F) {
    ctx.fillStyle = F.bg;
    rund(px + 4, py + 2, KACHEL - 8, KACHEL - 2, 3);
    ctx.lineWidth = 2;
    ctx.strokeStyle = rahmen;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(px + 4, py + 2, KACHEL - 8, KACHEL - 2, 3);
    else ctx.rect(px + 4, py + 2, KACHEL - 8, KACHEL - 2);
    ctx.stroke();
    ctx.fillStyle = rahmen;
    ctx.font = "700 12px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(buchstabe, px + KACHEL / 2, py + KACHEL / 2 + 1);
    ctx.textBaseline = "alphabetic";
  }

  // Eine Spielfigur zeichnen (abgerundeter Körper, zwei Augen).
  function zeichneFigur(fig, koerper, glanz, F) {
    const x = offsetX + fig.x, y = offsetY + fig.y;
    ctx.fillStyle = koerper;
    rund(x, y, FIG_B, FIG_H, 5);
    // kleiner Glanz oben
    ctx.fillStyle = glanz;
    rund(x + 2, y + 2, FIG_B - 8, 4, 2);
    // Augen
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(x + 5, y + 8, 2.6, 0, 2 * Math.PI);
    ctx.arc(x + FIG_B - 5, y + 8, 2.6, 0, 2 * Math.PI);
    ctx.fill();
    ctx.fillStyle = F.text;
    const blick = fig.vx > 0 ? 0.8 : fig.vx < 0 ? -0.8 : 0;
    ctx.beginPath();
    ctx.arc(x + 5 + blick, y + 8, 1.2, 0, 2 * Math.PI);
    ctx.arc(x + FIG_B - 5 + blick, y + 8, 1.2, 0, 2 * Math.PI);
    ctx.fill();
  }

  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      feuer: farbe("--fehler", "#b3261e"),
      wasser: farbe("--mathe", "#19599f"),
      gift: farbe("--ok", "#2c7029"),
      lava: farbe("--physik", "#a3570e"),
      ziegel: farbe("--text-leise", "#6e6555"),
      ziegelRand: farbe("--flaeche", "#fffdf6")
    };

    // Tafel-Hintergrund für den Pausenraum-Look.
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, logikB, logikH);

    if (!level) return;

    for (let zy = 0; zy < level.hoehe; zy++) {
      for (let zx = 0; zx < level.breite; zx++) {
        const z = level.tiles[zy][zx];
        const px = offsetX + zx * KACHEL, py = offsetY + zy * KACHEL;
        if (z === "#") {
          zeichneZiegel(px, py, F);
        } else if (z === "=") {
          // dünne Plattform: flacher Balken oben in der Kachel
          ctx.fillStyle = F.ziegel;
          rund(px + 1, py + 1, KACHEL - 2, 7, 3);
          ctx.strokeStyle = F.ziegelRand;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(px + KACHEL / 2, py + 1);
          ctx.lineTo(px + KACHEL / 2, py + 8);
          ctx.stroke();
        } else if (z === "L") {
          zeichneSee(px, py, F.lava, "#f0a020");
        } else if (z === "A") {
          zeichneSee(px, py, F.wasser, "#bcd8f5");
        } else if (z === "G") {
          zeichneSee(px, py, F.gift, "#bfe6a0");
        } else if (z === "f") {
          zeichneTuer(px, py, F.feuer, "F", F);
        } else if (z === "w") {
          zeichneTuer(px, py, F.wasser, "W", F);
        }
      }
    }

    // Figuren: Wasser zuerst, Feuer oben (sie sind ohnehin getrennt).
    zeichneFigur(wasser, F.wasser, "#bcd8f5", F);
    zeichneFigur(feuer, F.feuer, "#f6b6b0", F);

    // Level-Etikett oben links.
    ctx.fillStyle = F.leise;
    ctx.font = "600 13px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Level " + (levelNr + 1) + " / " + LEVELS.length, offsetX + 6, offsetY + 16);
  }

  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(20,18,14,0.55)";
    ctx.fillRect(0, 0, logikB, logikH);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 28px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(haupt, logikB / 2, logikH / 2 - 14);
    if (unter) {
      ctx.font = "400 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(unter, logikB / 2, logikH / 2 + 14);
    }
    ctx.textBaseline = "alphabetic";
  }

  api.neustartCb(gesamtNeustart);

  // Startbild: erstes Level zeigen, aber noch nicht laufen lassen.
  ladeLevel(0);
  laeuft = false;
  api.setzeZeit("0 s");
  zeichne();
  hinweis("Feuer & Wasser", "Drück auf „Start“ — zu zweit!");
}
