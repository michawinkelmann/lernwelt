// spiel.js — Prozent-Blitz: 60-Sekunden-Prozentrechensprint (Trainingsraum).
// Reine Logik (Aufgaben-Generatoren, Antwortprüfung, Punkte) liegt auf Modulebene
// und ist in Node testbar (export TESTS) — alles mit DOM passiert erst in starte().

import { zeigeStufenwahl } from "../../assets/js/spiel/stufenwahl.js";

export const manifest = {
  id: "ls-prozent-blitz",
  titel: "Prozent-Blitz",
  punkteLabel: "Punkte",
  highscore: true,
  zeigeZeit: true,
  steuerungHinweis: "Antwort eintippen und Enter — Komma oder Punkt, beides zählt."
};

export const SPRINT_SEKUNDEN = 60;

export const LEVELS = [
  { nr: 1, name: "Glatte Prozentsätze", kurz: "10, 25, 50, 75, 100 % von Zahlen bis 200" },
  { nr: 2, name: "Fünfer-Prozente", kurz: "5–95 % von glatten Grundwerten" },
  { nr: 3, name: "Rückwärts und Rabatte", kurz: "Grundwert gesucht und Preise senken" }
];

// Klassenstufen → Levels (Blend). Jede Klasse zieht ihre Aufgaben aus diesen Levels.
export const STUFEN = [
  { klasse: "Klasse 7", kurz: "glatte Prozentsätze", levels: [1] },
  { klasse: "Klasse 8", kurz: "auch Fünfer-Prozente", levels: [1, 2] },
  { klasse: "Klasse 9", kurz: "rückwärts & Rabatte", levels: [2, 3] },
  { klasse: "Klasse 10", kurz: "alles gemischt", levels: [3] }
];

// ---------- reine Hilfsfunktionen ----------

function zufallsZahl(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function zufallsWahl(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

// Zahl für die Anzeige: Dezimalpunkt → deutsches Komma
export function alsDeutsch(zahl) { return String(zahl).replace(".", ","); }

// Antwortprüfung: Komma → Punkt, trimmen, als Zahl exakt vergleichen.
// Alle Aufgaben werden so erzeugt, dass die Lösung exakt darstellbar ist
// (ganzzahlig oder höchstens eine Nachkommastelle).
export function pruefeAntwort(eingabe, soll) {
  const text = String(eingabe).trim().replace(",", ".");
  if (text === "") return false;
  const wert = Number(text);
  return Number.isFinite(wert) && wert === soll;
}

// Punkte für eine richtige Antwort: 10 · Level; ab der 3. richtigen in Serie
// Combo-Bonus, der mit jedem weiteren Treffer um 2 wächst (3. → +2, 4. → +4 …).
export function punkteFuer(level, serie) {
  const bonus = serie >= 3 ? 2 * (serie - 2) : 0;
  return 10 * level + bonus;
}

// ---------- Aufgaben-Generatoren ----------
// Jede Aufgabe: { text, loesung }. Grundwerte sind so gewählt, dass die Lösung
// exakt aufgeht: ganzzahlig — außer Level 1 mit 10 %, wo höchstens eine
// Nachkommastelle entsteht (z. B. 10 % von 48 = 4,8).

function aufgabeGlatt() {
  const p = zufallsWahl([10, 25, 50, 75, 100]);
  const g = 4 * zufallsZahl(1, 50); // durch 4 teilbar, ≤ 200
  return { text: `${p} % von ${g} = ?`, loesung: (g * p) / 100 };
}

function aufgabeFuenfer() {
  const p = 5 * zufallsZahl(1, 19);  // 5–95 %
  const g = 20 * zufallsZahl(1, 20); // glatte Grundwerte 20–400
  return { text: `${p} % von ${g} = ?`, loesung: (g * p) / 100 }; // ganzzahlig: (20k·5m)/100 = k·m
}

function aufgabeRueckwaerts() {
  const p = zufallsWahl([5, 10, 20, 25, 40, 50, 75, 80]);
  const g = 20 * zufallsZahl(1, 20); // gesuchter Grundwert 20–400
  const w = (g * p) / 100;           // ganzzahliger Prozentwert
  return { text: `${p} % von G sind ${w} — G = ?`, loesung: g };
}

function aufgabeRabatt() {
  const x = 20 * zufallsZahl(1, 25); // alter Preis 20–500 €
  const p = 5 * zufallsZahl(1, 15);  // Rabatt 5–75 %
  return { text: `${x} € um ${p} % gesenkt — neuer Preis in € = ?`, loesung: (x * (100 - p)) / 100 };
}

export function erzeugeAufgabe(level) {
  if (level === 1) return aufgabeGlatt();
  if (level === 2) return aufgabeFuenfer();
  return Math.random() < 0.5 ? aufgabeRueckwaerts() : aufgabeRabatt();
}

// ---------- Selbsttests (Node: siehe QS-Lauf) ----------

// Unabhängige Nachrechnung: liest den Aufgabentext und rechnet selbst.
function zerlegeText(text) {
  let m = text.match(/^(\d+) % von (\d+) = \?$/);
  if (m) return { art: "vorwaerts", p: Number(m[1]), g: Number(m[2]) };
  m = text.match(/^(\d+) % von G sind (\d+) — G = \?$/);
  if (m) return { art: "rueckwaerts", p: Number(m[1]), w: Number(m[2]) };
  m = text.match(/^(\d+) € um (\d+) % gesenkt — neuer Preis in € = \?$/);
  if (m) return { art: "rabatt", x: Number(m[1]), p: Number(m[2]) };
  return null;
}

function testeLevel(level) {
  for (let i = 0; i < 200; i++) {
    const auf = erzeugeAufgabe(level);
    const z = zerlegeText(auf.text);
    if (!z) return false;
    if (level === 1) {
      if (z.art !== "vorwaerts") return false;
      if (![10, 25, 50, 75, 100].includes(z.p)) return false;
      if (z.g % 4 !== 0 || z.g < 4 || z.g > 200) return false;
      // exakt: höchstens eine Nachkommastelle, in Zehnteln nachgerechnet
      const zaehler = z.g * z.p;                      // Lösung = zaehler/100
      if (zaehler % 10 !== 0) return false;           // sonst bliebe ein Rest
      if (Math.round(auf.loesung * 10) !== zaehler / 10) return false;
      if (Math.abs(auf.loesung * 10 - zaehler / 10) > 1e-9) return false;
    } else if (level === 2) {
      if (z.art !== "vorwaerts") return false;
      if (z.p % 5 !== 0 || z.p < 5 || z.p > 95) return false;
      if (z.g % 20 !== 0 || z.g < 20 || z.g > 400) return false;
      if (!Number.isInteger(auf.loesung)) return false;
      if (auf.loesung !== (z.g * z.p) / 100) return false; // unabhängig, exakt ganzzahlig
    } else if (z.art === "rueckwaerts") {
      if (![5, 10, 20, 25, 40, 50, 75, 80].includes(z.p)) return false;
      if ((z.w * 100) % z.p !== 0) return false;           // Grundwert geht glatt auf
      if (auf.loesung !== (z.w * 100) / z.p) return false; // unabhängige Nachrechnung
      if (!Number.isInteger(auf.loesung) || auf.loesung % 20 !== 0 || auf.loesung > 400) return false;
    } else if (z.art === "rabatt") {
      if (z.p % 5 !== 0 || z.p < 5 || z.p > 75) return false;
      if (z.x % 20 !== 0 || z.x < 20 || z.x > 500) return false;
      if ((z.x * (100 - z.p)) % 100 !== 0) return false;
      if (auf.loesung !== (z.x * (100 - z.p)) / 100) return false;
      if (!Number.isInteger(auf.loesung) || auf.loesung <= 0 || auf.loesung >= z.x) return false;
    } else {
      return false; // Level 3 darf nur rueckwaerts/rabatt liefern
    }
    if (!pruefeAntwort(String(auf.loesung), auf.loesung)) return false;
    if (!pruefeAntwort(alsDeutsch(auf.loesung), auf.loesung)) return false;
  }
  return true;
}

export const TESTS = [
  { name: "Level 1: 200 glatte Prozentaufgaben, exakt (max. 1 Nachkommastelle)", ok: () => testeLevel(1) },
  { name: "Level 2: 200 Fünfer-Prozente, Ergebnis ganzzahlig", ok: () => testeLevel(2) },
  { name: "Level 3: 200 Rückwärts-/Rabattaufgaben, ganzzahlig und glatt", ok: () => testeLevel(3) },
  { name: "pruefeAntwort: Komma und Punkt, exakter Vergleich", ok: () =>
      pruefeAntwort("2,5", 2.5) && pruefeAntwort("2.5", 2.5) && !pruefeAntwort("2,6", 2.5) &&
      pruefeAntwort("4.8", 4.8) && pruefeAntwort("4,8", 4.8) && !pruefeAntwort("", 0) },
  { name: "punkteFuer: Basis 10·Level, Combo ab Serie 3 (+2 je weiterer)", ok: () =>
      punkteFuer(1, 1) === 10 && punkteFuer(2, 3) === 22 && punkteFuer(2, 4) === 24 &&
      punkteFuer(3, 1) === 30 && punkteFuer(3, 5) === 36 },
  { name: "STUFEN: jede Klasse mappt auf gültige Levels (1–3)", ok: () =>
      STUFEN.length >= 4 && STUFEN.every(s => s.levels.length >= 1 && s.levels.every(l => l >= 1 && l <= 3)) },
  { name: "STUFEN: je Klasse 200 Aufgaben exakt & gültig", ok: () =>
      STUFEN.every(s => { for (let i = 0; i < 200; i++) { const l = s.levels[i % s.levels.length]; const a = erzeugeAufgabe(l); if (!Number.isInteger(Math.round(a.loesung * 10)) || !pruefeAntwort(String(a.loesung), a.loesung)) return false; } return true; }) }
];

// ---------- Spielablauf (DOM nur hier) ----------

export function starte(api) {
  let aufraeumen = null; // bricht einen laufenden Sprint sauber ab

  function zeigeLevelwahl() {
    if (aufraeumen) { aufraeumen(); aufraeumen = null; }
    api.loopStopp();
    api.versteckePanel();
    api.setzePunkte(0);
    api.setzeZeit(`${SPRINT_SEKUNDEN} s`);
    zeigeStufenwahl(api.flaeche, {
      titel: `Wähle deine Klasse — ${SPRINT_SEKUNDEN} Sekunden, so viele Aufgaben wie möglich:`,
      hinweis: "Such dir deine Klassenstufe — oder nimm eine höhere, wenn du mehr willst. Antworte immer nur mit der Zahl — ohne € oder %.",
      stufen: STUFEN,
      aufWahl: stufe => starteSprint(stufe)
    });
  }

  function starteSprint(stufe) {
    let punkte = 0, serie = 0, besteSerie = 0, richtige = 0, versuche = 0;
    let rest = SPRINT_SEKUNDEN, gesperrt = false, fertig = false;
    let aufgabe = null, sperrTimer = 0;

    api.setzePunkte(0);
    api.setzeZeit(`${SPRINT_SEKUNDEN} s`);
    api.flaeche.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;min-height:280px;padding:20px;text-align:center;">
        <p style="margin:0;color:var(--text-leise);font-size:.92rem;">${stufe.klasse} — ${stufe.kurz}</p>
        <p id="pb-frage" aria-live="polite" style="margin:0;font-weight:700;font-size:clamp(1.3rem,5.5vw,2rem);max-width:26ch;"></p>
        <form id="pb-form" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;">
          <input id="pb-eingabe" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false"
                 aria-label="Deine Antwort" style="font:inherit;font-size:1.4rem;width:7em;text-align:center;padding:8px;border:2px solid var(--linie);border-radius:var(--radius-klein);background:var(--bg);color:var(--text);">
          <button type="submit" class="knopf">Prüfen</button>
        </form>
        <p id="pb-feedback" role="status" aria-live="polite" style="margin:0;min-height:1.6em;font-weight:600;"></p>
      </div>`;

    const frageEl = api.flaeche.querySelector("#pb-frage");
    const eingabe = api.flaeche.querySelector("#pb-eingabe");
    const feedbackEl = api.flaeche.querySelector("#pb-feedback");

    aufraeumen = () => { fertig = true; clearTimeout(sperrTimer); };

    function naechste() {
      if (fertig) return;
      const lvl = zufallsWahl(stufe.levels);
      aufgabe = erzeugeAufgabe(lvl);
      aufgabe._lvl = lvl;
      frageEl.textContent = aufgabe.text;
      eingabe.value = "";
      gesperrt = false;
      eingabe.focus();
    }

    function beende() {
      if (fertig) return;
      aufraeumen(); aufraeumen = null;
      api.setzeZeit("0 s");
      frageEl.textContent = "Zeit um!";
      eingabe.disabled = true;
      const serieText = besteSerie >= 3 ? ` — beste Serie: ${besteSerie} in Folge` : "";
      api.vorbei(punkte, `<p>Gelöst: ${richtige} von ${versuche} Aufgaben (${stufe.klasse})${serieText}.</p>`);
    }

    api.flaeche.querySelector("#pb-form").addEventListener("submit", ev => {
      ev.preventDefault();
      if (gesperrt || fertig) return;
      if (eingabe.value.trim() === "") return; // leere Eingabe: nichts werten
      versuche++;
      if (pruefeAntwort(eingabe.value, aufgabe.loesung)) {
        serie++; richtige++;
        besteSerie = Math.max(besteSerie, serie);
        punkte += punkteFuer(aufgabe._lvl, serie);
        api.setzePunkte(punkte);
        feedbackEl.style.color = "var(--ok)";
        feedbackEl.textContent = serie >= 3 ? `✓ Richtig! Combo ×${serie}` : "✓ Richtig!";
        naechste();
      } else {
        serie = 0;
        gesperrt = true;
        feedbackEl.style.color = "var(--fehler)";
        feedbackEl.textContent = `✗ Leider nein — richtig: ${alsDeutsch(aufgabe.loesung)}`;
        sperrTimer = setTimeout(() => { feedbackEl.textContent = ""; naechste(); }, 1200);
      }
    });

    naechste();
    api.loop(dt => {
      rest -= dt;
      api.setzeZeit(`${Math.max(0, Math.ceil(rest))} s`);
      if (rest <= 0) beende();
    });
  }

  api.neustartCb(zeigeLevelwahl);
  zeigeLevelwahl();
}
