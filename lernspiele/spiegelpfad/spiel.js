// spiel.js — Spiegelpfad (Trainingsraum): Lichtstrahl mit drehbaren Spiegeln
// durch ein 10×7-Gitter zum Ziel lenken. Physik dahinter: Reflexionsgesetz
// (Einfallswinkel = Ausfallswinkel) — ein um 45° gekippter Spiegel knickt den
// Strahl um genau 90° ab.
//
// Die reine Logik (Reflexionstabelle, trace, Feldaufbau, Minimum-Suche per
// Brute-Force) liegt ohne DOM-Zugriffe auf Modulebene und ist in Node
// testbar; gezeichnet und geklickt wird ausschließlich in starte(api) über
// das gemeinsame Gerüst (assets/js/spiel/geruest.js).

export const manifest = {
  id: "ls-spiegelpfad",
  titel: "Spiegelpfad",
  kurz: "Drehe Spiegel und lenke den Lichtstrahl um Wände herum zum Stern.",
  punkteLabel: "Punkte",
  punkteEinheit: "",
  highscore: true,
  zeigeZeit: false,
  steuerungHinweis: "Spiegel antippen: dreht ihn um 45° — bring den Strahl zum Ziel! Tastatur: Pfeiltasten wählen, Enter/Leertaste dreht."
};

// ---------- Gitter-Konstanten ----------
export const BREITE = 10;  // Zellen in x-Richtung
export const HOEHE = 7;    // Zellen in y-Richtung
export const ZELLE = 48;   // Zellgröße in px (Canvas wird per CSS responsiv skaliert)

// Bewegungsrichtungen (y wächst nach unten, wie im Canvas)
export const DELTA = { rechts: [1, 0], links: [-1, 0], hoch: [0, -1], runter: [0, 1] };

// Reflexionstabelle: "/" und "\" lenken den Strahl um 90° um.
export const REFLEXION = {
  "/":  { rechts: "hoch",   links: "runter", hoch: "rechts", runter: "links" },
  "\\": { rechts: "runter", links: "hoch",   hoch: "links",  runter: "rechts" }
};

// Spiegelzustände: 0 = aus (Strahl läuft durch), 1 = "/", 2 = "\".
// Drehbare Spiegel: { x, y, start }. Feste Spiegel: { x, y, fest: true, zustand }.

// ---------- Die 8 Level ----------
// loesung = Zustände der DREHBAREN Spiegel (in Array-Reihenfolge), die zum
// Ziel führen; minimum = kleinste Zahl von Antipp-Drehungen ab Startzustand
// (eine Drehung schaltet 0 → 1 → 2 → 0 weiter). Beides wird im Node-Test
// gegen trace() und eine Brute-Force-Suche über alle Zustände geprüft.

export const LEVELS = [
  { nr: 1, name: "Erster Knick", minimum: 1,
    quelle: { x: 0, y: 3, richtung: "rechts" }, ziel: { x: 5, y: 0 },
    waende: [],
    spiegel: [{ x: 5, y: 3, start: 0 }],
    loesung: [1] },
  { nr: 2, name: "Doppelt gespiegelt", minimum: 4,
    quelle: { x: 0, y: 1, richtung: "rechts" }, ziel: { x: 8, y: 5 },
    waende: [],
    spiegel: [{ x: 4, y: 1, start: 0 }, { x: 4, y: 5, start: 0 }],
    loesung: [2, 2] },
  { nr: 3, name: "Um die Mauer", minimum: 2,
    quelle: { x: 0, y: 5, richtung: "rechts" }, ziel: { x: 9, y: 0 },
    waende: [[4, 5], [5, 2]],
    spiegel: [{ x: 2, y: 5, start: 0 }, { x: 2, y: 0, start: 0 }],
    loesung: [1, 1] },
  { nr: 4, name: "Falsche Fährte", minimum: 4,
    quelle: { x: 0, y: 3, richtung: "rechts" }, ziel: { x: 7, y: 6 },
    waende: [],
    spiegel: [{ x: 3, y: 3, start: 0 }, { x: 3, y: 6, start: 0 }, { x: 6, y: 1, start: 0 }],
    loesung: [2, 2, 0] },
  { nr: 5, name: "Zickzack", minimum: 8,
    quelle: { x: 0, y: 1, richtung: "rechts" }, ziel: { x: 9, y: 6 },
    waende: [[4, 2], [2, 4], [7, 5], [6, 3]],
    spiegel: [{ x: 3, y: 1, start: 0 }, { x: 3, y: 5, start: 0 }, { x: 5, y: 5, start: 0 }, { x: 5, y: 6, start: 0 }],
    loesung: [2, 2, 2, 2] },
  { nr: 6, name: "Der fremde Spiegel", minimum: 5,
    quelle: { x: 0, y: 3, richtung: "rechts" }, ziel: { x: 9, y: 5 },
    waende: [[4, 3], [5, 2]],
    spiegel: [
      { x: 3, y: 3, fest: true, zustand: 1 },
      { x: 3, y: 0, start: 0 }, { x: 7, y: 0, start: 0 }, { x: 7, y: 5, start: 0 }, { x: 1, y: 5, start: 0 }],
    loesung: [1, 2, 2, 0] },
  { nr: 7, name: "Verwinkelt", minimum: 6,
    quelle: { x: 4, y: 0, richtung: "runter" }, ziel: { x: 9, y: 5 },
    waende: [[6, 3], [2, 4], [7, 5]],
    spiegel: [
      { x: 4, y: 5, fest: true, zustand: 1 },
      { x: 4, y: 4, start: 0 }, { x: 8, y: 4, start: 0 }, { x: 8, y: 5, start: 0 }, { x: 1, y: 2, start: 0 }, { x: 6, y: 1, start: 0 }],
    loesung: [2, 2, 2, 0, 0] },
  { nr: 8, name: "Meisterprüfung", minimum: 6,
    quelle: { x: 0, y: 6, richtung: "rechts" }, ziel: { x: 9, y: 5 },
    waende: [[4, 6], [6, 5], [4, 4], [1, 1], [7, 0]],
    spiegel: [
      { x: 5, y: 1, fest: true, zustand: 2 },
      { x: 8, y: 3, fest: true, zustand: 2 },
      { x: 2, y: 6, start: 0 }, { x: 2, y: 1, start: 0 }, { x: 5, y: 3, start: 0 },
      { x: 8, y: 5, start: 0 }, { x: 7, y: 1, start: 0 }, { x: 3, y: 5, start: 0 }],
    loesung: [1, 1, 2, 2, 0, 0] }
];

// ---------- Reine Logik ----------

export function drehbareSpiegel(level) {
  return level.spiegel.filter(sp => !sp.fest);
}

// Baut aus Leveldaten + Zuständen der drehbaren Spiegel das Gitter für trace().
export function baueFeld(level, zustaende) {
  const zellen = Array.from({ length: HOEHE }, () => new Array(BREITE).fill(null));
  for (const [x, y] of level.waende) zellen[y][x] = { typ: "wand" };
  zellen[level.ziel.y][level.ziel.x] = { typ: "ziel" };
  let i = 0;
  for (const sp of level.spiegel) {
    const zustand = sp.fest ? sp.zustand : zustaende[i++];
    zellen[sp.y][sp.x] = { typ: "spiegel", zustand, fest: !!sp.fest };
  }
  return { breite: BREITE, hoehe: HOEHE, zellen };
}

// Verfolgt den Strahl von der Quelle aus: geradeaus, an "/" und "\" um 90°
// gespiegelt, an Wand und Rand endet er, am Ziel meldet er einen Treffer.
// pfad enthält die durchlaufenen Zellen (inkl. Quelle, ohne Wandzelle);
// ende ist die letzte Strahlzelle, richtung die letzte Flugrichtung.
export function trace(gitter, quelle) {
  let x = quelle.x, y = quelle.y, richtung = quelle.richtung;
  const pfad = [{ x, y }];
  const gesehen = new Set([x + "," + y + "," + richtung]);
  let treffer = false, grund = "rand";
  for (let schritt = 0; schritt < gitter.breite * gitter.hoehe * 4 + 4; schritt++) {
    const d = DELTA[richtung];
    x += d[0]; y += d[1];
    if (x < 0 || y < 0 || x >= gitter.breite || y >= gitter.hoehe) { grund = "rand"; break; }
    const zelle = gitter.zellen[y][x];
    if (zelle && zelle.typ === "wand") { grund = "wand"; break; }
    pfad.push({ x, y });
    if (zelle && zelle.typ === "ziel") { treffer = true; grund = "ziel"; break; }
    if (zelle && zelle.typ === "spiegel" && zelle.zustand > 0) {
      richtung = REFLEXION[zelle.zustand === 1 ? "/" : "\\"][richtung];
    }
    const schluessel = x + "," + y + "," + richtung;
    if (gesehen.has(schluessel)) { grund = "schleife"; break; } // Sicherheitsnetz
    gesehen.add(schluessel);
  }
  return { pfad, ende: pfad[pfad.length - 1], richtung, treffer, grund };
}

// Drehungen, um einen Spiegel von Zustand "von" auf "nach" zu tippen (zyklisch 0→1→2→0).
export function drehschritte(von, nach) {
  return ((nach - von) % 3 + 3) % 3;
}

export function punkteFuerLevel(drehungen, minimum) {
  return Math.max(40, 100 - 10 * (drehungen - minimum));
}

// Brute-Force über alle Zustandskombinationen der drehbaren Spiegel:
// kleinste Tipp-Anzahl ab Startzustand, mit der der Strahl das Ziel trifft.
// (Höchstens 3^6 = 729 Kombinationen — im Test und zur Levelpflege gedacht.)
export function minimaleDrehungen(level) {
  const dreh = drehbareSpiegel(level);
  const anzahl = Math.pow(3, dreh.length);
  let best = Infinity;
  for (let kombi = 0; kombi < anzahl; kombi++) {
    const zustaende = [];
    let rest = kombi;
    for (let i = 0; i < dreh.length; i++) { zustaende.push(rest % 3); rest = Math.floor(rest / 3); }
    if (!trace(baueFeld(level, zustaende), level.quelle).treffer) continue;
    let kosten = 0;
    for (let i = 0; i < dreh.length; i++) kosten += drehschritte(dreh[i].start || 0, zustaende[i]);
    if (kosten < best) best = kosten;
  }
  return best;
}

// ---------- Darstellung & Spielablauf (nur hier wird das DOM angefasst) ----------

const STIL = `
  .lp-innen { padding: 12px; display: grid; gap: 10px; }
  .lp-leiste { display: flex; flex-wrap: wrap; gap: 6px; }
  .lp-leiste .knopf { min-width: var(--beruehrziel); }
  .lp-status { margin: 0; font-weight: 600; min-height: 1.5em; }
  .lp-aktionen { display: flex; flex-wrap: wrap; gap: 8px; }
  #lp-canvas { border: 1px solid var(--linie); border-radius: var(--radius-klein); cursor: pointer; }
`;

export function starte(api) {
  const flaeche = api.flaeche;
  let levelIdx = 0;
  let zustaende = [];
  let drehungen = 0;
  let levelFertig = false;
  let erg = null;
  const anim = { fortschritt: 0, gesamt: 0 };
  let cursor = { x: 0, y: 0 };
  const beste = new Map();   // Level-Nr. → beste Punkte dieser Sitzung (nur im Speicher)
  let leinwand = null, ctx = null;

  api.neustartCb(() => { beste.clear(); api.setzePunkte(0); starteLevel(0); });
  api.tasten(taste);
  baueUi();
  api.setzePunkte(0);
  starteLevel(0);

  function baueUi() {
    flaeche.innerHTML = `
      <style>${STIL}</style>
      <div class="lp-innen">
        <div class="lp-leiste" role="group" aria-label="Level wählen" id="lp-leiste"></div>
        <p class="lp-status" role="status" id="lp-status"></p>
        <canvas id="lp-canvas" aria-label="Spielfeld: Gitter mit Lichtquelle (Pfeil), drehbaren Spiegeln, Wänden und Ziel-Stern"></canvas>
        <div class="lp-aktionen">
          <button type="button" class="knopf zweitrangig" id="lp-reset">Level zurücksetzen</button>
          <button type="button" class="knopf" id="lp-weiter" hidden>Weiter</button>
        </div>
      </div>`;
    leinwand = flaeche.querySelector("#lp-canvas");
    ctx = leinwand.getContext("2d");
    const dpr = Math.min(2, (typeof devicePixelRatio === "number" && devicePixelRatio > 0) ? devicePixelRatio : 1);
    leinwand.width = BREITE * ZELLE * dpr;
    leinwand.height = HOEHE * ZELLE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    leinwand.addEventListener("click", ev => {
      const r = leinwand.getBoundingClientRect();
      const x = Math.floor((ev.clientX - r.left) / r.width * BREITE);
      const y = Math.floor((ev.clientY - r.top) / r.height * HOEHE);
      if (x >= 0 && y >= 0 && x < BREITE && y < HOEHE) drehe(x, y);
    });
    flaeche.querySelector("#lp-reset").addEventListener("click", () => starteLevel(levelIdx));
    flaeche.querySelector("#lp-weiter").addEventListener("click", () => starteLevel(levelIdx + 1));
  }

  function starteLevel(idx) {
    levelIdx = Math.max(0, Math.min(LEVELS.length - 1, idx));
    const level = LEVELS[levelIdx];
    zustaende = drehbareSpiegel(level).map(sp => sp.start || 0);
    drehungen = 0;
    levelFertig = false;
    api.versteckePanel();
    const erster = drehbareSpiegel(level)[0];
    cursor = erster ? { x: erster.x, y: erster.y } : { x: 0, y: 0 };
    flaeche.querySelector("#lp-weiter").hidden = true;
    zeichneLeiste();
    retrace();
    statusText();
    api.loop(tick);
  }

  function zeichneLeiste() {
    const leiste = flaeche.querySelector("#lp-leiste");
    leiste.innerHTML = LEVELS.map((lv, i) =>
      `<button type="button" class="knopf${i === levelIdx ? "" : " zweitrangig"}" data-lp-level="${i}" aria-pressed="${i === levelIdx}" aria-label="Level ${lv.nr}: ${lv.name}${beste.has(lv.nr) ? ", geschafft" : ""}">${lv.nr}${beste.has(lv.nr) ? " ✓" : ""}</button>`).join("");
    leiste.querySelectorAll("[data-lp-level]").forEach(knopf =>
      knopf.addEventListener("click", () => starteLevel(Number(knopf.dataset.lpLevel))));
  }

  function retrace() {
    const level = LEVELS[levelIdx];
    erg = trace(baueFeld(level, zustaende), level.quelle);
    anim.gesamt = Math.max(0, erg.pfad.length - 1);
    // Bei reduzierter Bewegung sofort den vollständigen Strahl zeigen
    anim.fortschritt = api.reduzierteBewegung ? anim.gesamt : 0;
  }

  function drehe(x, y) {
    cursor = { x, y };
    if (levelFertig) return;
    const dreh = drehbareSpiegel(LEVELS[levelIdx]);
    const i = dreh.findIndex(sp => sp.x === x && sp.y === y);
    if (i < 0) return;
    zustaende[i] = (zustaende[i] + 1) % 3;
    drehungen += 1;
    retrace();
    statusText();
  }

  function taste(ev) {
    if (ev.key === "ArrowLeft") cursor = { x: Math.max(0, cursor.x - 1), y: cursor.y };
    else if (ev.key === "ArrowRight") cursor = { x: Math.min(BREITE - 1, cursor.x + 1), y: cursor.y };
    else if (ev.key === "ArrowUp") cursor = { x: cursor.x, y: Math.max(0, cursor.y - 1) };
    else if (ev.key === "ArrowDown") cursor = { x: cursor.x, y: Math.min(HOEHE - 1, cursor.y + 1) };
    else if (ev.key === "Enter" || ev.key === " ") drehe(cursor.x, cursor.y);
  }

  function tick(dt) {
    if (anim.fortschritt < anim.gesamt) {
      anim.fortschritt = Math.min(anim.gesamt, anim.fortschritt + dt * 16);
    } else if (erg && erg.treffer && !levelFertig) {
      levelGeschafft();
    }
    zeichne();
  }

  function levelGeschafft() {
    levelFertig = true;
    const level = LEVELS[levelIdx];
    const punkte = punkteFuerLevel(drehungen, level.minimum);
    if (punkte > (beste.get(level.nr) || 0)) beste.set(level.nr, punkte);
    api.setzePunkte(gesamtPunkte());
    zeichneLeiste();
    const perfekt = drehungen === level.minimum;
    setzeStatus("Treffer! +" + punkte + " Punkte" +
      (perfekt ? " — Minimum getroffen, perfekt!" : " (Minimum: " + level.minimum + " Drehungen)"));
    if (levelIdx < LEVELS.length - 1) {
      const weiter = flaeche.querySelector("#lp-weiter");
      weiter.hidden = false;
      weiter.textContent = "Weiter zu Level " + LEVELS[levelIdx + 1].nr;
      weiter.focus();
    } else {
      const n = beste.size;
      api.vorbei(gesamtPunkte(),
        "<p>Geschaffte Level in dieser Runde: " + n + " von " + LEVELS.length + ". " +
        (n < LEVELS.length
          ? "Die vollen 800 Punkte gibt es, wenn du vor Level 8 auch alle anderen Level löst — jeweils mit möglichst wenigen Drehungen."
          : "Alle Level gelöst — großartig!") + "</p>");
    }
  }

  function gesamtPunkte() {
    let summe = 0;
    for (const p of beste.values()) summe += p;
    return summe;
  }

  function statusText() {
    const level = LEVELS[levelIdx];
    setzeStatus("Level " + level.nr + " von " + LEVELS.length + " — „" + level.name +
      "“ · Drehungen: " + drehungen + " · Minimum: " + level.minimum);
  }

  function setzeStatus(text) {
    const el = flaeche.querySelector("#lp-status");
    if (el) el.textContent = text;
  }

  // ---------- Zeichnen ----------

  function zeichne() {
    if (!ctx || !erg) return;
    const level = LEVELS[levelIdx];
    const stil = getComputedStyle(flaeche);
    const farbe = (name, ersatz) => (stil.getPropertyValue(name) || "").trim() || ersatz;
    const fFlaeche = farbe("--flaeche", "#fffdf6");
    const fLinie = farbe("--linie", "#ddd5c4");
    const fText = farbe("--text", "#2c2823");
    const fLeise = farbe("--text-leise", "#6e6555");
    const fAkzent = farbe("--akzent", "#a3570e");
    const fOk = farbe("--ok", "#2c7029");
    const fHauch = farbe("--hauch", "#f0ead9");
    const B = BREITE * ZELLE, H = HOEHE * ZELLE;
    const mitte = k => k * ZELLE + ZELLE / 2;

    ctx.clearRect(0, 0, B, H);
    ctx.fillStyle = fFlaeche;
    ctx.fillRect(0, 0, B, H);

    // Gitterlinien
    ctx.strokeStyle = fLinie;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 1; x < BREITE; x++) { ctx.moveTo(x * ZELLE + 0.5, 0); ctx.lineTo(x * ZELLE + 0.5, H); }
    for (let y = 1; y < HOEHE; y++) { ctx.moveTo(0, y * ZELLE + 0.5); ctx.lineTo(B, y * ZELLE + 0.5); }
    ctx.stroke();

    // Wände (massive Blöcke mit Fugen)
    for (const [wx, wy] of level.waende) {
      ctx.fillStyle = fLeise;
      ctx.fillRect(wx * ZELLE + 3, wy * ZELLE + 3, ZELLE - 6, ZELLE - 6);
      ctx.strokeStyle = fFlaeche;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(wx * ZELLE + 3, wy * ZELLE + ZELLE / 2);
      ctx.lineTo(wx * ZELLE + ZELLE - 3, wy * ZELLE + ZELLE / 2);
      ctx.moveTo(wx * ZELLE + ZELLE / 2, wy * ZELLE + 3);
      ctx.lineTo(wx * ZELLE + ZELLE / 2, wy * ZELLE + ZELLE / 2);
      ctx.stroke();
    }

    // Tastatur-Auswahl (gestrichelter Rahmen)
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = fLeise;
    ctx.lineWidth = 2;
    ctx.strokeRect(cursor.x * ZELLE + 4, cursor.y * ZELLE + 4, ZELLE - 8, ZELLE - 8);
    ctx.setLineDash([]);

    // Ziel-Stern
    const sternPfad = (cx, cy, r1, r2) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const w = -Math.PI / 2 + i * Math.PI / 5;
        const r = i % 2 === 0 ? r1 : r2;
        const px = cx + Math.cos(w) * r, py = cy + Math.sin(w) * r;
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath();
    };
    const getroffen = erg.treffer && anim.fortschritt >= anim.gesamt;
    sternPfad(mitte(level.ziel.x), mitte(level.ziel.y), 17, 7);
    ctx.fillStyle = getroffen ? fOk : fHauch;
    ctx.fill();
    ctx.strokeStyle = getroffen ? fText : fAkzent;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Quelle (Pfeil in Strahlrichtung)
    const q = level.quelle;
    const dq = DELTA[q.richtung];
    const qx = mitte(q.x), qy = mitte(q.y);
    ctx.fillStyle = fAkzent;
    ctx.beginPath();
    ctx.moveTo(qx + dq[0] * 17, qy + dq[1] * 17);
    ctx.lineTo(qx - dq[0] * 7 + dq[1] * 12, qy - dq[1] * 7 + dq[0] * 12);
    ctx.lineTo(qx - dq[0] * 7 - dq[1] * 12, qy - dq[1] * 7 - dq[0] * 12);
    ctx.closePath();
    ctx.fill();

    // Spiegel
    let di = 0;
    for (const sp of level.spiegel) {
      const zustand = sp.fest ? sp.zustand : zustaende[di++];
      const cx = mitte(sp.x), cy = mitte(sp.y);
      ctx.beginPath();
      ctx.arc(cx, cy, 19, 0, Math.PI * 2);
      ctx.fillStyle = sp.fest ? fLinie : fHauch;
      ctx.fill();
      ctx.setLineDash(!sp.fest && zustand === 0 ? [4, 4] : []);
      ctx.strokeStyle = sp.fest ? fLeise : fAkzent;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);
      if (zustand > 0) {
        const o = zustand === 1 ? 1 : -1; // 1 = "/", 2 = "\"
        ctx.beginPath();
        ctx.moveTo(cx - 13, cy + 13 * o);
        ctx.lineTo(cx + 13, cy - 13 * o);
        ctx.strokeStyle = sp.fest ? fText : fAkzent;
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        ctx.stroke();
      } else if (!sp.fest) {
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fillStyle = fLeise;
        ctx.fill();
      }
      if (sp.fest) { // Schloss-Symbol: fest eingebauter Spiegel
        const lx = cx + 6, ly = cy + 7;
        ctx.fillStyle = fText;
        ctx.fillRect(lx, ly, 10, 8);
        ctx.beginPath();
        ctx.arc(lx + 5, ly, 4, Math.PI, 0);
        ctx.lineWidth = 2;
        ctx.strokeStyle = fText;
        ctx.stroke();
      }
    }

    // Lichtstrahl (über den Symbolen, damit Knicke sichtbar sind)
    const punkte = erg.pfad.map(z => [mitte(z.x), mitte(z.y)]);
    const baueStrahl = bis => {
      ctx.beginPath();
      ctx.moveTo(punkte[0][0], punkte[0][1]);
      let rest = bis;
      for (let i = 1; i < punkte.length && rest > 0; i++) {
        const teil = Math.min(1, rest);
        ctx.lineTo(
          punkte[i - 1][0] + (punkte[i][0] - punkte[i - 1][0]) * teil,
          punkte[i - 1][1] + (punkte[i][1] - punkte[i - 1][1]) * teil);
        rest -= teil;
      }
      if (bis >= anim.gesamt && erg.grund !== "ziel") {
        const d = DELTA[erg.richtung];
        const weite = erg.grund === "wand" ? ZELLE / 2 - 4 : ZELLE / 2;
        const [ex, ey] = punkte[punkte.length - 1];
        ctx.lineTo(ex + d[0] * weite, ey + d[1] * weite);
      }
    };
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.globalAlpha = 0.25;
    ctx.strokeStyle = fAkzent;
    ctx.lineWidth = 10;
    baueStrahl(anim.fortschritt);
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.lineWidth = 4;
    baueStrahl(anim.fortschritt);
    ctx.stroke();

    // Treffer-Hinweis (zusätzlich zum Statustext — nicht nur Farbe)
    if (getroffen) {
      const text = "Treffer!";
      ctx.font = "700 26px " + farbe("--schrift", "system-ui");
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const tw = ctx.measureText(text).width;
      const tx = B / 2, ty = 26;
      ctx.globalAlpha = 0.88;
      ctx.fillStyle = fFlaeche;
      ctx.fillRect(tx - tw / 2 - 12, ty - 18, tw + 24, 36);
      ctx.globalAlpha = 1;
      ctx.strokeStyle = fOk;
      ctx.lineWidth = 2;
      ctx.strokeRect(tx - tw / 2 - 12, ty - 18, tw + 24, 36);
      ctx.fillStyle = fOk;
      ctx.fillText(text, tx, ty);
    }
  }
}
