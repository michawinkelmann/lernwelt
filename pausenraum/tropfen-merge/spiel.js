// spiel.js — „Tropfen-Verschmelzen" (Merge-Drop) für den Pausenraum.
// Aufbau nach Gerüst-Konvention (assets/js/spiel/geruest.js): manifest + starte(api).
// Die reine Spiellogik (Stufen, Radien, Werte, Punkte, Kreis-Überlappung, Merge-Regel)
// ist exportiert und in Node testbar — auf Modulebene wird weder document noch
// window noch ein Canvas angefasst, all das entsteht erst in starte().

// Logische (Welt-)Maße der Spielfläche in „Einheiten".
export const LOGIK_B = 360; // logische Breite
export const LOGIK_H = 480; // logische Höhe

// Becher (Spielbehälter) — Innenmaße in Weltkoordinaten. Bewusst eher quadratisch
// (≈ 7 Spalten des kleinsten Tropfens, ähnlich viele Reihen), damit der Becher bei
// schlechtem Stapeln wirklich überläuft und echter „Überlauf"-Druck entsteht.
export const BECHER = { x0: 86, x1: 274, boden: 430, wandStaerke: 6 };

// Höhe der „Überlauf"-Linie (oben). Klemmt ein Tropfen mit seinem Mittelpunkt über
// dieser Linie länger als die Frist, ist Schluss.
export const UEBERLAUF_Y = 120;

// Schonzeit nach dem Einwerfen: solange darf ein Tropfen über der Linie sein, ohne
// zu zählen (er ist auf dem Weg nach unten). Danach zählt nur noch „klemmt oben fest".
export const EINLAUF_S = 0.55;
// Wie lange ein zu hoher Tropfen geduldet wird, bevor das Spiel endet.
export const UEBERLAUF_FRIST = 1.2;

// Höchste erreichbare Stufe. Zwei Höchste verschmelzen zum Bonus und verschwinden.
export const MAX_STUFE = 11;

// Physik-Konstanten (Weltkoordinaten / Sekunden).
export const GRAVITATION = 1400;  // Welt-Einheiten/s²
export const RESTITUTION = 0.18;  // kleiner „Sprung" an Wänden/Boden
export const REIBUNG = 0.992;     // leichte horizontale Dämpfung pro Schritt
export const AUFLOESE_ITER = 5;   // Kollisions-Auflösungs-Iterationen pro Frame

export const manifest = {
  id: "sp-tropfen-merge",
  titel: "Tropfen-Verschmelzen",
  kurz: "Lass Tropfen in den Becher fallen — zwei gleiche verschmelzen zum nächstgrößeren. Wie weit kommst du, bevor der Becher überläuft?",
  punkteLabel: "Punkte",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Mit Maus/Finger zielen (oder ← →), Leertaste oder Tipp lässt den Tropfen fallen. Zwei gleiche verschmelzen zum nächstgrößeren!"
};

// ---------------------------------------------------------------------------
// Reine Logik (in Node testbar)
// ---------------------------------------------------------------------------

// Nächsthöhere Stufe — bei MAX_STUFE gedeckelt (höher geht nicht).
export function naechsteStufe(stufe) {
  return Math.min(MAX_STUFE, stufe + 1);
}

// Radius einer Stufe in Weltkoordinaten — streng monoton steigend.
// Lineares Wachstum ab einem Grundradius; gut unterscheidbar, passt in den Becher.
export function radiusFuer(stufe) {
  const s = Math.max(1, stufe);
  return 12 + (s - 1) * 6;
}

// Anzeigewert einer Stufe: verdoppelt sich je Stufe (2, 4, 8, 16, …).
export function wertFuer(stufe) {
  return Math.pow(2, Math.max(1, stufe));
}

// Punkte für eine ENTSTANDENE Stufe (also für ein Verschmelzen ZU dieser Stufe).
// Höhere Stufe = überproportional mehr Punkte (Dreieckszahl der Stufe).
export function punkteFuer(stufe) {
  const s = Math.max(1, stufe);
  return (s * (s + 1)) / 2;
}

// Überlappung zweier Kreise a={x,y,r}, b={x,y,r}.
// Liefert null, wenn sie sich nicht berühren/überlappen, sonst
// { nx, ny, tiefe }: (nx,ny) ist die NORMIERTE Normale, die von b nach a zeigt
// (Richtung, in die a herausgeschoben werden muss), tiefe>0 ist die Eindringtiefe.
export function kreisUeberlappung(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const summe = a.r + b.r;
  const distQ = dx * dx + dy * dy;
  if (distQ >= summe * summe) return null; // disjunkt → keine Überlappung
  const dist = Math.sqrt(distQ);
  const tiefe = summe - dist;
  if (dist > 1e-9) {
    return { nx: dx / dist, ny: dy / dist, tiefe };
  }
  // Exakt deckungsgleich (Mittelpunkte identisch): feste Ausweichrichtung nach oben.
  return { nx: 0, ny: -1, tiefe };
}

// Sollen zwei Tropfen verschmelzen? Nur bei GLEICHER Stufe UND Berührung/Überlappung.
// (Die Höchststufe MAX_STUFE wird hier ebenfalls als verschmelzbar gemeldet — sie
//  bildet einen Bonus und verschwindet; das entscheidet der Spielteil.)
export function sollVerschmelzen(a, b) {
  if (a.stufe !== b.stufe) return false;
  return kreisUeberlappung(a, b) !== null;
}

// ---------------------------------------------------------------------------
// Browser-Teil (Canvas, Eingaben) — wird vom Gerüst aufgerufen
// ---------------------------------------------------------------------------

export function starte(api) {
  const faktor = Math.max(2, window.devicePixelRatio || 1);
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(LOGIK_B * faktor);
  canvas.height = Math.round(LOGIK_H * faktor);
  canvas.style.cssText = "display:block;width:auto;max-width:100%;max-height:78vh;height:auto;margin:0 auto;border-radius:inherit;touch-action:none;";
  api.flaeche.innerHTML = "";
  api.flaeche.appendChild(canvas);
  const ctx = canvas.getContext("2d");
  ctx.setTransform(faktor, 0, 0, faktor, 0, 0);

  // --- Zustand ---
  const tropfen = [];        // aktive Tropfen im Becher: {x,y,vx,vy,stufe,r,alterT,verschmolzen}
  let zielX = LOGIK_B / 2;   // x-Position des hängenden Tropfens
  let aktuelleStufe = 1;     // Stufe des bereitliegenden Tropfens
  let naechsteVorschau = 1;  // Stufe der Vorschau (kommt als Nächstes)
  let punkte = 0;
  let hoechsteStufe = 1;     // höchste je erreichte Stufe (für Endtext)
  let cooldown = 0;          // Sperre nach dem Fallen, in Sekunden
  let laeuft = false;
  let ueberlaufT = 0;        // wie lange ein Tropfen schon zu hoch klemmt
  const tastenGedrueckt = { links: false, rechts: false };
  let effekte = [];          // kurze Partikel-/Text-Effekte (nur ohne reduzierte Bewegung)
  let merkmalEl = null;      // Anzeige „höchste Stufe" im Kopf

  const ZIEL_TEMPO = 280;    // Welt-Einheiten/s beim Verschieben per Pfeiltaste
  const COOLDOWN_S = 0.42;   // Wartezeit, bis der nächste Tropfen bereitliegt

  function farbe(name, ersatz) {
    const wert = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return wert || ersatz;
  }
  function klemme(wert, min, max) { return Math.max(min, Math.min(max, wert)); }

  // Acht klar unterscheidbare Stufenfarben; höhere Stufen wiederholen am Ende
  // mit leichtem Versatz — bis MAX_STUFE reicht die Palette.
  const STUFEN_FARBEN = [
    "#e0584f", // 1 — rot
    "#e6883a", // 2 — orange
    "#e8c33a", // 3 — gelb
    "#7cbf4a", // 4 — grün
    "#3aa6a0", // 5 — türkis
    "#3a82c4", // 6 — blau
    "#6b54c4", // 7 — indigo
    "#a64fb0", // 8 — violett
    "#d44f8a", // 9 — magenta
    "#9a6b3a", // 10 — braun
    "#444444"  // 11 — dunkel (Höchststufe)
  ];
  function stufenFarbe(stufe) {
    return STUFEN_FARBEN[(Math.max(1, stufe) - 1) % STUFEN_FARBEN.length];
  }

  // Startstufen klein halten (1–4) — gewichtet zugunsten der kleinsten.
  function zufallsStartStufe() {
    const r = Math.random();
    if (r < 0.40) return 1;
    if (r < 0.70) return 2;
    if (r < 0.90) return 3;
    return 4;
  }

  function setzeAusgangslage() {
    tropfen.length = 0;
    punkte = 0;
    hoechsteStufe = 1;
    cooldown = 0;
    ueberlaufT = 0;
    effekte = [];
    zielX = LOGIK_B / 2;
    aktuelleStufe = zufallsStartStufe();
    naechsteVorschau = zufallsStartStufe();
    api.setzePunkte(0);
    if (merkmalEl) merkmalEl.textContent = String(wertFuer(1));
  }

  function starteRunde() {
    setzeAusgangslage();
    laeuft = true;
    api.loop(dt => { aktualisiere(dt); zeichne(); });
  }

  // Lässt den bereitliegenden Tropfen fallen (sofern frei).
  function fallenLassen() {
    if (!laeuft || cooldown > 0) return;
    const r = radiusFuer(aktuelleStufe);
    const x = klemme(zielX, BECHER.x0 + r, BECHER.x1 - r);
    tropfen.push({
      x, y: UEBERLAUF_Y - 22, vx: 0, vy: 0,
      stufe: aktuelleStufe, r, alterT: 0, verschmolzen: false
    });
    aktuelleStufe = naechsteVorschau;
    naechsteVorschau = zufallsStartStufe();
    cooldown = COOLDOWN_S;
  }

  // --- Physikschritt ---
  function aktualisiere(dt) {
    // Zielposition per Pfeiltasten verschieben
    if (tastenGedrueckt.links) zielX -= ZIEL_TEMPO * dt;
    if (tastenGedrueckt.rechts) zielX += ZIEL_TEMPO * dt;
    const rHang = radiusFuer(aktuelleStufe);
    zielX = klemme(zielX, BECHER.x0 + rHang, BECHER.x1 - rHang);

    if (cooldown > 0) cooldown -= dt;

    // 1) Integration: Schwerkraft + Bewegung
    for (const t of tropfen) {
      t.vy += GRAVITATION * dt;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.vx *= REIBUNG;
    }

    // 2) Mehrere Auflösungs-Iterationen für stabileres Stapeln
    for (let it = 0; it < AUFLOESE_ITER; it++) {
      loeseWaende();
      loeseKollisionen();
    }

    // 3) Merges nach der Auflösung (Kettenmerges über mehrere Durchläufe)
    behandleMerges();

    // 4) Überlauf prüfen. Ein Tropfen zählt, wenn er (a) seine kurze Einlauf-Schonzeit
    //    hinter sich hat, (b) sein Mittelpunkt ÜBER der Überlauf-Linie liegt und (c) er
    //    nicht mehr zügig nach unten fällt — also oben gegen den Stapel klemmt. So löst
    //    auch ein noch leicht wackelnder, hochgedrückter Stapel zuverlässig aus.
    let zuHoch = false;
    for (const t of tropfen) {
      t.alterT += dt;
      const faelltSchnell = t.vy > 90; // klar nach unten unterwegs → nur auf der Durchreise
      if (t.alterT > EINLAUF_S && !faelltSchnell && t.y < UEBERLAUF_Y) zuHoch = true;
    }
    ueberlaufT = zuHoch ? ueberlaufT + dt : 0;
    if (ueberlaufT > UEBERLAUF_FRIST) { beendeSpiel(); return; }

    // Effekte altern lassen
    for (const e of effekte) {
      e.t -= dt;
      if (e.art === "p") { e.x += e.vx * dt; e.y += e.vy * dt; e.vy += 900 * dt; }
      else e.y -= 26 * dt;
    }
    effekte = effekte.filter(e => e.t > 0);
  }

  // Kreis ↔ Becherwände/Boden: Position korrigieren + Geschwindigkeit dämpfen.
  function loeseWaende() {
    const links = BECHER.x0;
    const rechts = BECHER.x1;
    const boden = BECHER.boden;
    for (const t of tropfen) {
      if (t.x - t.r < links) {
        t.x = links + t.r;
        if (t.vx < 0) t.vx = -t.vx * RESTITUTION;
      }
      if (t.x + t.r > rechts) {
        t.x = rechts - t.r;
        if (t.vx > 0) t.vx = -t.vx * RESTITUTION;
      }
      if (t.y + t.r > boden) {
        t.y = boden - t.r;
        if (t.vy > 0) t.vy = -t.vy * RESTITUTION;
        t.vx *= 0.9; // Bodenreibung
      }
    }
  }

  // Kreis ↔ Kreis: bei Überlappung beide entlang der Verbindungslinie auseinander-
  // schieben (positionsbasiert) und etwas Geschwindigkeit längs der Normalen dämpfen.
  function loeseKollisionen() {
    for (let i = 0; i < tropfen.length; i++) {
      const a = tropfen[i];
      for (let j = i + 1; j < tropfen.length; j++) {
        const b = tropfen[j];
        const u = kreisUeberlappung(a, b);
        if (!u) continue;
        // Beide je zur Hälfte herausschieben (gleiche „Masse").
        const halb = u.tiefe / 2;
        a.x += u.nx * halb; a.y += u.ny * halb;
        b.x -= u.nx * halb; b.y -= u.ny * halb;
        // Relativgeschwindigkeit längs der Normalen dämpfen, wenn sie aufeinander zu laufen.
        const rvx = a.vx - b.vx;
        const rvy = a.vy - b.vy;
        const vn = rvx * u.nx + rvy * u.ny;
        if (vn < 0) {
          const impuls = -(1 + RESTITUTION) * vn / 2;
          a.vx += impuls * u.nx; a.vy += impuls * u.ny;
          b.vx -= impuls * u.nx; b.vy -= impuls * u.ny;
        }
      }
    }
  }

  // Verschmelzungen abarbeiten: berühren sich zwei gleiche Stufen, entsteht EIN
  // Tropfen der nächsthöheren Stufe am Mittelpunkt (gemittelter Impuls).
  // Zwei Höchste verschmelzen zu einem Punkte-Bonus und verschwinden.
  function behandleMerges() {
    let nochmal = true;
    let schutz = 0;
    while (nochmal && schutz < 8) {
      nochmal = false;
      schutz++;
      for (let i = 0; i < tropfen.length; i++) {
        const a = tropfen[i];
        if (a.verschmolzen) continue;
        for (let j = i + 1; j < tropfen.length; j++) {
          const b = tropfen[j];
          if (b.verschmolzen) continue;
          if (!sollVerschmelzen(a, b)) continue;
          a.verschmolzen = true;
          b.verschmolzen = true;
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          if (a.stufe >= MAX_STUFE) {
            // Höchststufe: beide verschwinden, dicker Bonus.
            const bonus = punkteFuer(MAX_STUFE) * 4;
            punkte += bonus;
            api.setzePunkte(punkte);
            knallEffekt(mx, my, MAX_STUFE);
            textEffekt("+" + bonus, mx, my);
          } else {
            const neueStufe = naechsteStufe(a.stufe);
            const neuR = radiusFuer(neueStufe);
            tropfen.push({
              x: mx, y: my,
              vx: (a.vx + b.vx) / 2,
              vy: (a.vy + b.vy) / 2,
              stufe: neueStufe, r: neuR, alterT: EINLAUF_S, verschmolzen: false
            });
            const gewinn = punkteFuer(neueStufe);
            punkte += gewinn;
            api.setzePunkte(punkte);
            if (neueStufe > hoechsteStufe) {
              hoechsteStufe = neueStufe;
              if (merkmalEl) merkmalEl.textContent = String(wertFuer(neueStufe));
            }
            knallEffekt(mx, my, neueStufe);
            textEffekt("+" + gewinn, mx, my);
          }
          nochmal = true;
          break;
        }
        if (nochmal) break;
      }
      // Verschmolzene entfernen
      if (nochmal) {
        for (let k = tropfen.length - 1; k >= 0; k--) {
          if (tropfen[k].verschmolzen) tropfen.splice(k, 1);
        }
      }
    }
  }

  function beendeSpiel() {
    laeuft = false;
    zeichne();
    const info = "<p>Höchste Stufe: " + wertFuer(hoechsteStufe) +
                 " (Stufe " + hoechsteStufe + " von " + MAX_STUFE + ")</p>";
    api.vorbei(punkte, info);
  }

  // --- Effekte ---
  function knallEffekt(x, y, stufe) {
    if (api.reduzierteBewegung) return;
    const farbeStufe = stufenFarbe(stufe);
    for (let i = 0; i < 10; i++) {
      const winkel = (i / 10) * Math.PI * 2;
      effekte.push({
        art: "p", farbe: farbeStufe,
        x, y,
        vx: Math.cos(winkel) * (90 + Math.random() * 80),
        vy: Math.sin(winkel) * (90 + Math.random() * 80) - 40,
        t: 0.45
      });
    }
    if (effekte.length > 160) effekte = effekte.slice(-160);
  }
  function textEffekt(text, x, y) {
    if (api.reduzierteBewegung) return;
    effekte.push({ art: "t", text, x: klemme(x, 28, LOGIK_B - 28), y, t: 0.7 });
  }

  // --- Eingaben ---
  api.tasten(ev => {
    if (ev.key === "ArrowLeft" || ev.key === "a" || ev.key === "A") tastenGedrueckt.links = true;
    else if (ev.key === "ArrowRight" || ev.key === "d" || ev.key === "D") tastenGedrueckt.rechts = true;
    else if (ev.key === " ") fallenLassen();
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
    zielX = klemme(zeigerX(ev.clientX), BECHER.x0, BECHER.x1);
  });
  api.flaeche.addEventListener("pointerdown", ev => {
    zielX = klemme(zeigerX(ev.clientX), BECHER.x0, BECHER.x1);
  });
  api.flaeche.addEventListener("click", fallenLassen);
  api.wisch(richtung => { if (richtung === "tipp") fallenLassen(); });

  // --- Zeichnen ---
  function kreis(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
    ctx.fill();
  }
  function rund(x, y, b, h, radius) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, radius);
    else ctx.rect(x, y, b, h);
    ctx.fill();
  }

  function zeichneTropfen(t, F) {
    ctx.fillStyle = stufenFarbe(t.stufe);
    kreis(t.x, t.y, t.r);
    // Wert-Label
    ctx.fillStyle = "#ffffff";
    const groesse = Math.max(10, Math.min(22, Math.round(t.r * 0.9)));
    ctx.font = "700 " + groesse + "px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(String(wertFuer(t.stufe)), t.x, t.y + 0.5);
    ctx.textBaseline = "alphabetic";
  }

  function zeichne() {
    const F = {
      bg: farbe("--flaeche", "#fffdf6"),
      text: farbe("--text", "#2c2823"),
      leise: farbe("--text-leise", "#6e6555"),
      akzent: farbe("--akzent", "#19599f"),
      fehler: farbe("--fehler", "#b3261e")
    };
    ctx.fillStyle = F.bg;
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);

    // Überlauf-Linie (gestrichelt)
    ctx.strokeStyle = F.fehler;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath();
    ctx.moveTo(BECHER.x0, UEBERLAUF_Y);
    ctx.lineTo(BECHER.x1, UEBERLAUF_Y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = F.fehler;
    ctx.font = "600 11px 'Source Sans 3', system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("Überlauf", BECHER.x0 + 2, UEBERLAUF_Y - 4);

    // Becherwände (links, rechts, Boden) als U-Form
    ctx.fillStyle = F.leise;
    const w = BECHER.wandStaerke;
    rund(BECHER.x0 - w, UEBERLAUF_Y, w, BECHER.boden - UEBERLAUF_Y + w, 2);      // linke Wand
    rund(BECHER.x1, UEBERLAUF_Y, w, BECHER.boden - UEBERLAUF_Y + w, 2);          // rechte Wand
    rund(BECHER.x0 - w, BECHER.boden, BECHER.x1 - BECHER.x0 + 2 * w, w, 2);      // Boden

    // Hängender Tropfen + Falllinie + Vorschau (nur solange spielbar)
    if (laeuft) {
      const rHang = radiusFuer(aktuelleStufe);
      const hx = klemme(zielX, BECHER.x0 + rHang, BECHER.x1 - rHang);
      // Falllinie
      ctx.strokeStyle = F.leise;
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      ctx.beginPath();
      ctx.moveTo(hx, UEBERLAUF_Y);
      ctx.lineTo(hx, BECHER.boden);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.globalAlpha = cooldown > 0 ? 0.35 : 1;
      zeichneTropfen({ x: hx, y: UEBERLAUF_Y - 22, stufe: aktuelleStufe, r: rHang }, F);
      ctx.globalAlpha = 1;

      // Vorschau oben rechts (im freien Bereich neben dem schmalen Becher)
      ctx.fillStyle = F.leise;
      ctx.font = "600 11px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "right";
      ctx.fillText("Als Nächstes:", LOGIK_B - 8, 22);
      zeichneTropfen({ x: LOGIK_B - 24, y: 46, stufe: naechsteVorschau, r: 14 }, F);
    }

    // Tropfen im Becher
    for (const t of tropfen) zeichneTropfen(t, F);

    // Effekte
    for (const e of effekte) {
      if (e.art === "p") {
        ctx.globalAlpha = Math.max(0, e.t / 0.45);
        ctx.fillStyle = e.farbe;
        ctx.fillRect(e.x - 2, e.y - 2, 4, 4);
      } else {
        ctx.globalAlpha = Math.max(0, e.t / 0.7);
        ctx.fillStyle = F.text;
        ctx.font = "700 15px 'Source Sans 3', system-ui, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(e.text, e.x, e.y);
      }
    }
    ctx.globalAlpha = 1;

    // Warnung, wenn der Becher überzulaufen droht
    if (ueberlaufT > 0.3 && laeuft) {
      ctx.fillStyle = F.fehler;
      ctx.globalAlpha = 0.5 + 0.5 * Math.abs(Math.sin(ueberlaufT * 6));
      ctx.font = "700 16px 'Source Sans 3', system-ui, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Becher läuft über!", LOGIK_B / 2, UEBERLAUF_Y - 24);
      ctx.globalAlpha = 1;
    }
  }

  function hinweis(haupt, unter) {
    ctx.fillStyle = "rgba(20,18,14,0.55)";
    ctx.fillRect(0, 0, LOGIK_B, LOGIK_H);
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "700 26px 'Source Sans 3', system-ui, sans-serif";
    ctx.fillText(haupt, LOGIK_B / 2, LOGIK_H / 2 - 12);
    if (unter) {
      ctx.font = "400 15px 'Source Sans 3', system-ui, sans-serif";
      ctx.fillText(unter, LOGIK_B / 2, LOGIK_H / 2 + 16);
    }
    ctx.textBaseline = "alphabetic";
  }

  // Kopf-Anzeige „höchster Tropfen" anlegen
  merkmalEl = api.kopf.querySelector("#tm-stufe");
  if (!merkmalEl) {
    const span = document.createElement("span");
    span.innerHTML = 'Höchster Tropfen: <b id="tm-stufe">2</b>';
    api.kopf.appendChild(span);
    merkmalEl = span.querySelector("b");
  }

  api.neustartCb(starteRunde);

  setzeAusgangslage();
  zeichne();
  hinweis("Tropfen-Verschmelzen", "Drück auf „Start“!");
}
