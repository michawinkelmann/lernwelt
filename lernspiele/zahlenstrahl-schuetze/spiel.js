// spiel.js — Zahlenstrahl-Scharfschütze (Trainingsraum · Mathematik)
// Schätzspiel: Ein Zielwert (Bruch, Dezimalzahl, negative Zahl oder Wurzel) wird
// möglichst genau auf einem Canvas-Zahlenstrahl markiert. Punkte je Aufgabe:
// round(100 · max(0, 1 − 12 · |Fehler| / Spanne)) — Volltreffer 100, ab ca.
// 8,3 % Abweichung von der Strahl-Länge 0. Eine Runde = 10 Aufgaben (max 1000).
//
// Arbeitsteilung wie bei der Sim-Engine: Das Spielgerüst
// (assets/js/spiel/geruest.js) liefert Rahmen, Punkteanzeige und Bestenliste;
// dieses Modul liefert manifest + starte(api). Die reine Logik (punkteFuer,
// zieheAufgabe, formatZahl) hängt nicht am DOM — die Modulebene benutzt kein
// document/window und ist damit in Node testbar: selbsttest().

import { zeigeStufenwahl } from "../../assets/js/spiel/stufenwahl.js";

// ---------- Manifest ----------

export const manifest = {
  id: "ls-zahlenstrahl",
  titel: "Zahlenstrahl-Scharfschütze",
  kurz: "Wo liegt 5/8? Markiere die Stelle auf dem Zahlenstrahl — Punkte gibt es für Treffernähe.",
  punkteLabel: "Punkte",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Auf den Zahlenstrahl tippen oder klicken — Feinjustage mit ← →, bestätigen mit Enter."
};

export const AUFGABEN_JE_RUNDE = 10;

// ---------- Level ----------
// Annahme (dokumentiert): Level 4 nutzt den Strahl 0–10, damit die Wurzeln
// √2…√90 (≈ 1,41…9,49) die volle Breite ausnutzen — auf einem Strahl 0–100
// lägen alle Ziele im linken Zehntel und wären nicht sinnvoll schätzbar.

export const LEVELS = [
  { nr: 1, name: "Brüche", bereichText: "0 bis 1", min: 0, max: 1, haupt: 1, neben: 0.1, mittel: 0.5, zweig: "alle",
    beschreibung: "Echte Brüche wie 1/2, 2/5 oder 5/8 zwischen 0 und 1 treffen." },
  { nr: 2, name: "Dezimal & gemischt", bereichText: "0 bis 10", min: 0, max: 10, haupt: 1, neben: 0.5, mittel: null, zweig: "alle",
    beschreibung: "Dezimalzahlen mit einer Nachkommastelle und gemischte Zahlen wie 2 3/4." },
  { nr: 3, name: "Negative Zahlen", bereichText: "−5 bis +5", min: -5, max: 5, haupt: 1, neben: 0.5, mittel: null, zweig: "alle",
    beschreibung: "Negative Brüche und Dezimalzahlen wie −7/4 oder −2,5 links der Null." },
  { nr: 4, name: "Wurzeln (Gym)", bereichText: "0 bis 10", min: 0, max: 10, haupt: 1, neben: 0.5, mittel: null, zweig: "gym",
    beschreibung: "Quadratwurzeln von √2 bis √90 ohne Taschenrechner einschachteln." }
];

// ---------- Klassenstufen ----------
// Eine Runde nutzt eine feste Skala je Level (kein Blend): jede Klasse mappt
// auf genau ein Level (nr). Der „Gymnasium"-Knopf wählt bewusst Level 4 (Wurzeln,
// zweig "gym").
export const STUFEN = [
  { klasse: "Klasse 5", kurz: "Brüche am Strahl 0–1", nr: 1 },
  { klasse: "Klasse 6", kurz: "Dezimalzahlen 0–10", nr: 2 },
  { klasse: "Klasse 7", kurz: "auch negative Zahlen", nr: 3 },
  { klasse: "Gymnasium ab 9", kurz: "Wurzeln 0–10", nr: 4 }
];

// ---------- Reine Logik (ohne DOM, in Node testbar) ----------

function ggt(a, b) { while (b) { const r = a % b; a = b; b = r; } return a; }

// Aufgaben-Pools, einmalig auf Modulebene berechnet.
const BRUECHE_0_1 = [];
for (let n = 2; n <= 10; n++) for (let z = 1; z < n; z++) if (ggt(z, n) === 1) BRUECHE_0_1.push({ z, n });

const GEMISCHT_BRUCHTEILE = BRUECHE_0_1.filter(b => b.n <= 8);

const BRUECHE_L3 = []; // unechte Brüche z/n mit Wert < 5, Nenner 2–4, gekürzt
for (const n of [2, 3, 4]) for (let z = 1; z < 5 * n; z++) if (ggt(z, n) === 1) BRUECHE_L3.push({ z, n });

const QUADRATZAHLEN = new Set([4, 9, 16, 25, 36, 49, 64, 81]);
const RADIKANDEN = [];
for (let k = 2; k <= 90; k++) if (!QUADRATZAHLEN.has(k)) RADIKANDEN.push(k);

// Deutsche Zahldarstellung: Komma statt Punkt, Minuszeichen „−“ (U+2212),
// ohne überflüssige Nachkomma-Nullen.
export function formatZahl(x, dezimalen = 2) {
  let s = x.toFixed(dezimalen);
  if (s.includes(".")) s = s.replace(/0+$/, "").replace(/\.$/, "");
  if (s === "-0") s = "0";
  return s.replace("-", "−").replace(".", ",");
}

// Punkte für eine Aufgabe: 100 bei Volltreffer, linear fallend,
// 0 ab |fehler| ≥ spanne/12. Ergebnis ist immer ganzzahlig und nie negativ.
export function punkteFuer(fehler, spanne) {
  const f = Math.abs(fehler);
  return Math.round(100 * Math.max(0, 1 - 12 * f / spanne));
}

function wahl(liste, rng) { return liste[Math.floor(rng() * liste.length)]; }

function roheAufgabe(L, rng) {
  switch (L.nr) {
    case 1: { // echte, gekürzte Brüche in [0,1]
      const b = wahl(BRUECHE_0_1, rng);
      return { anzeigeText: `${b.z}/${b.n}`, wert: b.z / b.n, loesungText: `${b.z}/${b.n} = ${formatZahl(b.z / b.n, 3)}` };
    }
    case 2: { // Dezimalzahl mit 1 Nachkommastelle oder gemischte Zahl
      if (rng() < 0.5) {
        let k; do { k = 1 + Math.floor(rng() * 99); } while (k % 10 === 0);
        const wert = k / 10;
        return { anzeigeText: formatZahl(wert, 1), wert, loesungText: formatZahl(wert, 1) };
      }
      const ganz = 1 + Math.floor(rng() * 9);
      const b = wahl(GEMISCHT_BRUCHTEILE, rng);
      const wert = ganz + b.z / b.n;
      return { anzeigeText: `${ganz} ${b.z}/${b.n}`, wert, loesungText: `${ganz} ${b.z}/${b.n} = ${formatZahl(wert, 2)}` };
    }
    case 3: { // negative (und einige positive) Brüche/Dezimalzahlen in [−5,5]
      const vz = rng() < 0.7 ? -1 : 1;
      if (rng() < 0.5) {
        let k; do { k = 1 + Math.floor(rng() * 49); } while (k % 10 === 0);
        const wert = vz * k / 10;
        return { anzeigeText: formatZahl(wert, 1), wert, loesungText: formatZahl(wert, 1) };
      }
      const b = wahl(BRUECHE_L3, rng);
      const wert = vz * b.z / b.n;
      const text = `${vz < 0 ? "−" : ""}${b.z}/${b.n}`;
      return { anzeigeText: text, wert, loesungText: `${text} = ${formatZahl(wert, 2)}` };
    }
    case 4: { // Quadratwurzeln, Radikand 2–90 ohne Quadratzahlen
      const k = wahl(RADIKANDEN, rng);
      const wert = Math.sqrt(k);
      return { anzeigeText: `√${k}`, wert, loesungText: `√${k} ≈ ${formatZahl(wert, 2)}` };
    }
    default: throw new Error("Unbekanntes Level: " + L.nr);
  }
}

// Zieht eine Aufgabe für ein Level (Nummer 1–4 oder Levelobjekt).
// Mit „vorher“ wird eine direkte Wiederholung derselben Aufgabe ausgeschlossen.
export function zieheAufgabe(level, rng = Math.random, vorher = null) {
  const L = typeof level === "number" ? LEVELS.find(l => l.nr === level) : level;
  if (!L) throw new Error("Unbekanntes Level: " + level);
  let a = roheAufgabe(L, rng);
  for (let i = 0; i < 100 && vorher && a.anzeigeText === vorher.anzeigeText; i++) a = roheAufgabe(L, rng);
  return a;
}

// ---------- Spiel (läuft nur im Browser, alles DOM-Zeug bleibt hier drin) ----------

export function starte(api) {
  const f = api.flaeche;
  const win = f.ownerDocument.defaultView;
  const PAD_X = 30;     // Randabstand des Strahls im Canvas (CSS-Pixel)
  const HOEHE = 170;    // Canvas-Höhe (CSS-Pixel)

  let level = null, aufgabe = null, vorherige = null;
  let nummer = 0, punkte = 0, fehlerSumme = 0, volltreffer = 0;
  let marker = null;            // vom Spieler gesetzte Position oder null
  let zustand = "wahl";         // "wahl" | "zielen" | "aufgeloest" | "fertig"
  let timer = 0;
  let canvas, zielEl, feedback, fortschritt, bestaetigenKnopf;

  const farbe = name => win.getComputedStyle(f).getPropertyValue(name).trim() || "#888";
  const klemme = w => Math.min(level.max, Math.max(level.min, w));
  const mitte = () => (level.min + level.max) / 2;

  function zeigeLevelwahl() {
    win.clearTimeout(timer);
    zustand = "wahl";
    punkte = 0;
    api.setzePunkte(0);
    zeigeStufenwahl(f, {
      titel: "Wähle deine Klasse:",
      hinweis: "Jede Klasse übt auf ihrem eigenen Zahlenstrahl — 10 Aufgaben pro Runde, bis zu 100 Punkte pro Treffer. Nimm gern eine höhere Klasse, wenn du mehr willst.",
      stufen: STUFEN,
      aufWahl: s => starteRunde(s.nr)
    });
  }

  function starteRunde(nr) {
    level = LEVELS.find(L => L.nr === nr);
    nummer = 0; punkte = 0; fehlerSumme = 0; volltreffer = 0; vorherige = null;
    api.setzePunkte(0);
    f.innerHTML = `
      <div class="zs-wrap">
        <div class="zs-status"><span id="zs-fortschritt"></span><span>Level ${level.nr}: ${level.name} (${level.bereichText})</span></div>
        <p class="zs-ziel">Markiere: <b id="zs-zielwert"></b></p>
        <canvas id="zs-canvas" role="img" aria-label="Zahlenstrahl von ${level.bereichText}. Tippe oder klicke auf die geschätzte Position; Feinjustage mit den Pfeiltasten."></canvas>
        <div class="zs-aktionen">
          <button type="button" class="knopf" id="zs-bestaetigen">Bestätigen</button>
          <span class="zs-tipp">← → feinjustieren · Enter bestätigt</span>
        </div>
        <p class="zs-feedback" id="zs-feedback" role="status" aria-live="polite"></p>
      </div>`;
    canvas = f.querySelector("#zs-canvas");
    zielEl = f.querySelector("#zs-zielwert");
    feedback = f.querySelector("#zs-feedback");
    fortschritt = f.querySelector("#zs-fortschritt");
    bestaetigenKnopf = f.querySelector("#zs-bestaetigen");
    bestaetigenKnopf.addEventListener("click", () => { bestaetige(); f.focus({ preventScroll: true }); });
    canvas.addEventListener("pointerdown", ev => {
      if (zustand !== "zielen") return;
      const r = canvas.getBoundingClientRect();
      marker = klemme(wertAnPosition(ev.clientX - r.left, r.width));
      zeichne();
      f.focus({ preventScroll: true });
    });
    passeGroesseAn();
    naechsteAufgabe();
  }

  function wertAnPosition(x, breite) {
    const t = (x - PAD_X) / (breite - 2 * PAD_X);
    return level.min + Math.min(1, Math.max(0, t)) * (level.max - level.min);
  }
  function xFuerWert(w, breite) {
    return PAD_X + (w - level.min) / (level.max - level.min) * (breite - 2 * PAD_X);
  }

  function passeGroesseAn() {
    if (!canvas) return;
    const dpr = win.devicePixelRatio || 1;
    const cssBreite = Math.max(260, canvas.clientWidth || f.clientWidth - 32);
    canvas.width = Math.round(cssBreite * dpr);
    canvas.height = Math.round(HOEHE * dpr);
    zeichne();
  }

  function naechsteAufgabe() {
    nummer++;
    if (nummer > AUFGABEN_JE_RUNDE) { rundeVorbei(); return; }
    aufgabe = zieheAufgabe(level, Math.random, vorherige);
    vorherige = aufgabe;
    marker = null;
    zustand = "zielen";
    zielEl.textContent = aufgabe.anzeigeText;
    fortschritt.textContent = `Aufgabe ${nummer} von ${AUFGABEN_JE_RUNDE}`;
    feedback.textContent = "";
    bestaetigenKnopf.disabled = false;
    zeichne();
  }

  function bestaetige() {
    if (zustand !== "zielen") return;
    if (marker === null) {
      feedback.textContent = "Setze zuerst deine Marke: auf den Zahlenstrahl tippen oder ← → drücken.";
      return;
    }
    const spanne = level.max - level.min;
    const fehler = Math.abs(marker - aufgabe.wert);
    const p = punkteFuer(fehler, spanne);
    punkte += p; fehlerSumme += fehler;
    if (p === 100) volltreffer++;
    api.setzePunkte(punkte);
    zustand = "aufgeloest";
    bestaetigenKnopf.disabled = true;
    const nk = spanne <= 1 ? 3 : 2;
    const symbol = p === 100 ? "✓ Volltreffer!" : p >= 70 ? "✓ Stark!" : p > 0 ? "○ Schon nah dran." : "✗ Diesmal daneben.";
    feedback.textContent = `${symbol} Genau richtig: ${aufgabe.loesungText} · dein Abstand: ${formatZahl(fehler, nk)} · +${p} Punkte`;
    zeichne();
    // 1,5 s Auflösung zeigen, dann weiter (reine Standbild-Anzeige, kein Blinken
    // — verträgt sich auch mit prefers-reduced-motion).
    timer = win.setTimeout(naechsteAufgabe, 1500);
  }

  function rundeVorbei() {
    zustand = "fertig";
    const spanne = level.max - level.min;
    const mittel = fehlerSumme / AUFGABEN_JE_RUNDE / spanne * 100;
    api.vorbei(punkte, `
      <p>Level ${level.nr} (${level.name}) · ${volltreffer} Volltreffer von ${AUFGABEN_JE_RUNDE} ·
      mittlere Abweichung: ${formatZahl(mittel, 1)} % der Strahl-Länge.</p>
      <p>${volltreffer >= 5 ? "Ein richtig gutes Auge — probiere doch das nächste Level!" : "Mit jedem Versuch wird dein Schätz-Auge schärfer. Nochmal?"}</p>`);
  }

  function zeichne() {
    if (!canvas || !level) return;
    const dpr = win.devicePixelRatio || 1;
    const b = canvas.width / dpr, h = canvas.height / dpr;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, b, h);
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
      cAkzent = farbe("--akzent"), cOk = farbe("--ok");
    const y = 96;
    const klein = b < 430;

    // Strahl mit Pfeilspitze rechts
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(PAD_X - 14, y); ctx.lineTo(b - PAD_X + 14, y); ctx.stroke();
    ctx.fillStyle = cText;
    ctx.beginPath();
    ctx.moveTo(b - PAD_X + 22, y); ctx.lineTo(b - PAD_X + 11, y - 5); ctx.lineTo(b - PAD_X + 11, y + 5);
    ctx.closePath(); ctx.fill();

    // Ticks und Beschriftung der Hauptmarken
    ctx.font = `600 ${klein ? 11 : 12.5}px "Source Sans 3", system-ui, sans-serif`;
    ctx.textAlign = "center";
    const anzahl = Math.round((level.max - level.min) / level.neben);
    for (let i = 0; i <= anzahl; i++) {
      const v = level.min + i * level.neben;
      const x = xFuerWert(v, b);
      const istHaupt = Math.abs(v / level.haupt - Math.round(v / level.haupt)) < 1e-6;
      const istMittel = !istHaupt && level.mittel !== null &&
        Math.abs(v / level.mittel - Math.round(v / level.mittel)) < 1e-6;
      const lang = istHaupt ? 10 : istMittel ? 8 : 5;
      ctx.strokeStyle = istHaupt ? cText : cLeise; ctx.lineWidth = istHaupt ? 2 : 1;
      ctx.beginPath(); ctx.moveTo(x, y - lang); ctx.lineTo(x, y + lang); ctx.stroke();
      if (istHaupt) {
        ctx.fillStyle = cLeise; ctx.textBaseline = "top";
        ctx.fillText(formatZahl(v, 1), x, y + 15);
      }
    }

    // Auflösung: exakte Position (Fahne nach oben, mit Wort — nicht nur Farbe)
    if (zustand === "aufgeloest" && aufgabe) {
      const x = xFuerWert(aufgabe.wert, b);
      ctx.strokeStyle = cOk; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - 40); ctx.lineTo(x, y + 12); ctx.stroke();
      ctx.fillStyle = cOk; ctx.textBaseline = "bottom";
      ctx.fillText("genau", Math.min(b - 24, Math.max(24, x)), y - 44);
    }

    // Spieler-Marke (Fahne nach unten, beschriftet mit „du“)
    if (marker !== null) {
      const x = xFuerWert(marker, b);
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x, y - 12); ctx.lineTo(x, y + 40); ctx.stroke();
      ctx.fillStyle = cAkzent;
      ctx.beginPath();
      ctx.moveTo(x, y - 12); ctx.lineTo(x - 5, y - 21); ctx.lineTo(x + 5, y - 21);
      ctx.closePath(); ctx.fill();
      ctx.textBaseline = "top";
      ctx.fillText("du", Math.min(b - 14, Math.max(14, x)), y + 44);
    }
  }

  // Tastatur: Pfeile = Feinjustage (legt die Marke notfalls in die Mitte),
  // Enter auf der Spielfläche = bestätigen (Knöpfe behandeln Enter selbst).
  api.tasten(ev => {
    if (zustand !== "zielen") return;
    const schritt = (level.max - level.min) / 200;
    if (ev.key === "ArrowLeft") {
      marker = klemme((marker === null ? mitte() : marker) - schritt); zeichne();
    } else if (ev.key === "ArrowRight") {
      marker = klemme((marker === null ? mitte() : marker) + schritt); zeichne();
    } else if (ev.key === "Enter" && ev.target === f) {
      bestaetige();
    }
  });

  win.addEventListener("resize", () => { if (canvas && zustand !== "wahl") passeGroesseAn(); });
  api.neustartCb(zeigeLevelwahl);
  zeigeLevelwahl();
}

// ---------- Selbsttest (läuft in Node: node --input-type=module …) ----------

// Liest die Anzeige einer Aufgabe zurück in eine Zahl (Gegenrechnung für Tests).
function parseAnzeige(text) {
  let t = text.trim();
  if (t.startsWith("√")) {
    const radikand = Number(t.slice(1));
    return { wert: Math.sqrt(radikand), radikand };
  }
  let vz = 1;
  if (t.startsWith("−") || t.startsWith("-")) { vz = -1; t = t.slice(1); }
  if (t.includes("/")) {
    const teile = t.split(" ");
    let ganz = 0, bruch = t;
    if (teile.length === 2) { ganz = Number(teile[0]); bruch = teile[1]; }
    const [z, n] = bruch.split("/").map(Number);
    return { wert: vz * (ganz + z / n) };
  }
  return { wert: vz * Number(t.replace(",", ".")) };
}

export function selbsttest() {
  const ergebnisse = [];
  const pruefe = (name, ok, info = "") => ergebnisse.push({ name, ok: !!ok, info: ok ? "" : info });
  const lcg = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };

  // punkteFuer: Volltreffer und Nullpunkt-Grenze
  pruefe("punkteFuer: Volltreffer gibt 100 (Spannen 1/10/100)",
    [1, 10, 100].every(s => punkteFuer(0, s) === 100));
  pruefe("punkteFuer: Fehler = Spanne/12 gibt 0 (Spannen 1/10/100)",
    [1, 10, 100].every(s => punkteFuer(s / 12, s) === 0));
  pruefe("punkteFuer: jenseits der Grenze bleibt 0, nie negativ",
    punkteFuer(10, 10) === 0 && punkteFuer(99, 10) === 0 && punkteFuer(0.2, 1) === 0);

  // punkteFuer: monoton fallend und ganzzahlig in 0–100
  {
    let monoton = true, ganzzahlig = true, vorher = Infinity;
    for (let i = 0; i <= 120; i++) {
      const p = punkteFuer(i * (10 / 120), 10);
      if (p > vorher) monoton = false;
      if (!Number.isInteger(p) || p < 0 || p > 100) ganzzahlig = false;
      vorher = p;
    }
    pruefe("punkteFuer: monoton fallend bei wachsendem Fehler", monoton);
    pruefe("punkteFuer: immer ganzzahlig in 0…100", ganzzahlig);
  }

  // Levelliste
  pruefe("LEVELS: 4 Level mit gültigen Bereichen",
    LEVELS.length === 4 && LEVELS.every(L => L.min < L.max && L.nr >= 1 && L.nr <= 4));

  // Je Level: 200 Ziehungen im Bereich und Anzeige ↔ Wert konsistent
  for (const L of LEVELS) {
    const rng = lcg(7919 * L.nr + 1);
    let imBereich = true, konsistent = true, info = "";
    for (let i = 0; i < 200; i++) {
      const a = zieheAufgabe(L.nr, rng);
      if (!(a.wert >= L.min - 1e-9 && a.wert <= L.max + 1e-9)) {
        imBereich = false; info = `außerhalb: ${a.anzeigeText} → ${a.wert}`;
      }
      const p = parseAnzeige(a.anzeigeText);
      if (Math.abs(p.wert - a.wert) > 1e-9) {
        konsistent = false; info = `inkonsistent: ${a.anzeigeText} → ${a.wert}`;
      }
      if (p.radikand !== undefined && Math.abs(a.wert * a.wert - p.radikand) > 1e-9) {
        konsistent = false; info = `Wurzel falsch: ${a.anzeigeText}`;
      }
      if (typeof a.anzeigeText !== "string" || !a.anzeigeText) { konsistent = false; info = "leere Anzeige"; }
    }
    pruefe(`Level ${L.nr}: 200 Ziehungen im Bereich ${L.min}…${L.max}`, imBereich, info);
    pruefe(`Level ${L.nr}: anzeigeText ↔ wert konsistent (Gegenrechnung)`, konsistent, info);
  }

  // Keine doppelte Aufgabe direkt nacheinander
  for (const L of LEVELS) {
    const rng = lcg(101 * L.nr + 13);
    let ok = true, vorher = null;
    for (let i = 0; i < 200; i++) {
      const a = zieheAufgabe(L.nr, rng, vorher);
      if (vorher && a.anzeigeText === vorher.anzeigeText) { ok = false; break; }
      vorher = a;
    }
    pruefe(`Level ${L.nr}: keine doppelte Aufgabe direkt nacheinander (200 Folge-Ziehungen)`, ok);
  }

  // formatZahl: deutsche Schreibweise
  pruefe("formatZahl: Komma, Minuszeichen, keine überflüssigen Nullen",
    formatZahl(0.625, 3) === "0,625" && formatZahl(-2.5, 1) === "−2,5" &&
    formatZahl(3, 1) === "3" && formatZahl(10, 1) === "10");

  // STUFEN ↔ LEVELS
  pruefe("STUFEN: jede Stufe hat ein gültiges nr (1…4)",
    STUFEN.length >= 3 && STUFEN.every(s => Number.isInteger(s.nr) && s.nr >= 1 && s.nr <= 4));
  pruefe("STUFEN: jede Stufe entspricht einem existierenden LEVELS-Eintrag",
    STUFEN.every(s => LEVELS.some(L => L.nr === s.nr)));

  return { ok: ergebnisse.every(e => e.ok), ergebnisse };
}

// TESTS-Array (gleiches Format wie die anderen Trainer): bündelt selbsttest()
// und die beiden STUFEN-Prüfungen für das gemeinsame Verifikations-Gerüst.
export const TESTS = [
  { name: "selbsttest(): alle internen Prüfungen bestehen", ok: () => selbsttest().ok },
  { name: "STUFEN: jede Stufe hat ein gültiges nr (1…4) und einen existierenden LEVELS-Eintrag",
    ok: () => STUFEN.length >= 3 &&
      STUFEN.every(s => Number.isInteger(s.nr) && s.nr >= 1 && s.nr <= 4 && LEVELS.some(L => L.nr === s.nr)) },
  { name: "STUFEN: jede Stufe zieht eine Aufgabe im Bereich ihres Levels",
    ok: () => STUFEN.every(s => { const L = LEVELS.find(l => l.nr === s.nr); const a = zieheAufgabe(s.nr); return a.wert >= L.min - 1e-9 && a.wert <= L.max + 1e-9; }) }
];
