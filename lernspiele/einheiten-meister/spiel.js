// spiel.js — Einheiten-Meister: 60-Sekunden-Umrechnungssprint (Trainingsraum).
// Reine Logik (Umrechnungskatalog, Generator, Antwortprüfung, Punkte) liegt auf
// Modulebene und ist in Node testbar (export TESTS) — DOM erst in starte().
//
// Exaktheit: Jede Aufgabe wird aus einem ganzzahligen Zehntel-Wert der großen
// Einheit aufgebaut (zg). Der Wert in der kleinen Einheit ist zg·Faktor/10 und
// nach Konstruktion immer ganzzahlig; der Wert in der großen Einheit hat
// höchstens eine Nachkommastelle (z. B. 3,5 km = 3500 m). Kein Rundungsrest.

export const manifest = {
  id: "ls-einheiten-meister",
  titel: "Einheiten-Meister",
  punkteLabel: "Punkte",
  highscore: true,
  zeigeZeit: true,
  steuerungHinweis: "Antwort eintippen und Enter — Komma oder Punkt, beides zählt."
};

export const SPRINT_SEKUNDEN = 60;

export const LEVELS = [
  { nr: 1, name: "Länge und Zeit", kurz: "mm, cm, m, km und s, min, h" },
  { nr: 2, name: "Masse und Fläche dazu", kurz: "zusätzlich g, kg, t und cm², m²" },
  { nr: 3, name: "Volumen dazu — alles gemischt", kurz: "zusätzlich ml, l, m³" }
];

// Umrechnungskatalog. art steuert die erlaubten Werte der großen Einheit:
// "zehntel" = beliebige Zehntel (zg roh), "halbe" = nur halbe Schritte
// (zg = 5·n, wichtig bei Faktor 60), "ganz" = nur ganze Werte (Fläche: glatt).
// zMin/zMax sind die Grenzen für n; zg ergibt sich daraus.
export const KATALOG = [
  { gross: "cm",  klein: "mm",  faktor: 10,    art: "zehntel", zMin: 12, zMax: 400, level: 1 },
  { gross: "m",   klein: "cm",  faktor: 100,   art: "zehntel", zMin: 12, zMax: 200, level: 1 },
  { gross: "km",  klein: "m",   faktor: 1000,  art: "zehntel", zMin: 4,  zMax: 150, level: 1 },
  { gross: "m",   klein: "mm",  faktor: 1000,  art: "zehntel", zMin: 4,  zMax: 90,  level: 1 },
  { gross: "min", klein: "s",   faktor: 60,    art: "halbe",   zMin: 1,  zMax: 20,  level: 1 },
  { gross: "h",   klein: "min", faktor: 60,    art: "halbe",   zMin: 1,  zMax: 12,  level: 1 },
  { gross: "kg",  klein: "g",   faktor: 1000,  art: "zehntel", zMin: 4,  zMax: 150, level: 2 },
  { gross: "t",   klein: "kg",  faktor: 1000,  art: "zehntel", zMin: 4,  zMax: 80,  level: 2 },
  { gross: "m²",  klein: "cm²", faktor: 10000, art: "ganz",    zMin: 1,  zMax: 20,  level: 2 },
  { gross: "l",   klein: "ml",  faktor: 1000,  art: "zehntel", zMin: 4,  zMax: 150, level: 3 },
  { gross: "m³",  klein: "l",   faktor: 1000,  art: "zehntel", zMin: 4,  zMax: 50,  level: 3 }
];

// ---------- reine Hilfsfunktionen ----------

function zufallsZahl(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function zufallsWahl(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

// Zahl für die Anzeige: Dezimalpunkt → deutsches Komma
export function alsDeutsch(zahl) { return String(zahl).replace(".", ","); }

// Antwortprüfung: Komma → Punkt, trimmen, als Zahl exakt vergleichen.
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

// ---------- Aufgaben-Generator ----------
// Aufgabe: { text: "3,5 km = ? m", loesung: 3500 }

function zieheZehntel(eintrag) {
  const n = zufallsZahl(eintrag.zMin, eintrag.zMax);
  if (eintrag.art === "halbe") return 5 * n;  // 0,5er-Schritte (Faktor 60 bleibt glatt)
  if (eintrag.art === "ganz") return 10 * n;  // nur ganze Werte (Fläche)
  return n;                                   // beliebige Zehntel
}

export function erzeugeAufgabe(level) {
  const pool = KATALOG.filter(u => u.level <= level);
  const u = zufallsWahl(pool);
  const zg = zieheZehntel(u);              // großer Wert in Zehnteln (ganzzahlig)
  const grossWert = zg / 10;               // höchstens eine Nachkommastelle
  const kleinWert = (zg * u.faktor) / 10;  // nach Konstruktion ganzzahlig
  if (Math.random() < 0.5) {
    return { text: `${alsDeutsch(grossWert)} ${u.gross} = ? ${u.klein}`, loesung: kleinWert };
  }
  return { text: `${kleinWert} ${u.klein} = ? ${u.gross}`, loesung: grossWert };
}

// ---------- Selbsttests (Node: siehe QS-Lauf) ----------

// Unabhängige Nachrechnung: liest den Aufgabentext, sucht das Einheitenpaar im
// Katalog und prüft die Umrechnung als reine Ganzzahl-Gleichung (in Zehnteln).
function zerlegeText(text) {
  const m = text.match(/^(\d+(?:,\d)?) (\S+) = \? (\S+)$/);
  if (!m) return null;
  return { wert: Number(m[1].replace(",", ".")), von: m[2], nach: m[3] };
}

function zgErlaubt(eintrag, zg) {
  if (eintrag.art === "halbe") return zg % 5 === 0 && zg >= 5 * eintrag.zMin && zg <= 5 * eintrag.zMax;
  if (eintrag.art === "ganz") return zg % 10 === 0 && zg >= 10 * eintrag.zMin && zg <= 10 * eintrag.zMax;
  return Number.isInteger(zg) && zg >= eintrag.zMin && zg <= eintrag.zMax;
}

function testeLevel(level) {
  for (let i = 0; i < 200; i++) {
    const auf = erzeugeAufgabe(level);
    const z = zerlegeText(auf.text);
    if (!z) return false;
    const runter = KATALOG.find(u => u.gross === z.von && u.klein === z.nach);
    const rauf = KATALOG.find(u => u.klein === z.von && u.gross === z.nach);
    const eintrag = runter || rauf;
    if (!eintrag || eintrag.level > level) return false;   // Paar unbekannt oder zu hohes Level
    let zg, kleinWert;
    if (runter) {                                          // groß → klein: Lösung ganzzahlig
      zg = Math.round(z.wert * 10);
      if (Math.abs(z.wert * 10 - zg) > 1e-9) return false; // mehr als 1 Nachkommastelle?
      kleinWert = auf.loesung;
      if (!Number.isInteger(kleinWert)) return false;
    } else {                                               // klein → groß: Anzeige ganzzahlig
      if (!Number.isInteger(z.wert)) return false;
      zg = Math.round(auf.loesung * 10);
      if (Math.abs(auf.loesung * 10 - zg) > 1e-9) return false; // Lösung max. 1 Nachkommastelle
      kleinWert = z.wert;
    }
    // Kern der unabhängigen Nachrechnung — exakt in Ganzzahlen: zg·Faktor = klein·10
    if (zg * eintrag.faktor !== kleinWert * 10) return false;
    if (!zgErlaubt(eintrag, zg)) return false;             // Werte in der erlaubten Spanne
    if (!pruefeAntwort(String(auf.loesung), auf.loesung)) return false;
    if (!pruefeAntwort(alsDeutsch(auf.loesung), auf.loesung)) return false;
  }
  return true;
}

export const TESTS = [
  { name: "Level 1: 200 Längen-/Zeitaufgaben exakt (Zehntel-Gleichung)", ok: () => testeLevel(1) },
  { name: "Level 2: 200 Aufgaben mit Masse und Fläche, alles glatt", ok: () => testeLevel(2) },
  { name: "Level 3: 200 gemischte Aufgaben inkl. Volumen, exakt", ok: () => testeLevel(3) },
  { name: "pruefeAntwort: Komma und Punkt, exakter Vergleich", ok: () =>
      pruefeAntwort("2,5", 2.5) && pruefeAntwort("2.5", 2.5) && !pruefeAntwort("2,6", 2.5) &&
      pruefeAntwort("3,5", 3.5) && pruefeAntwort(" 3500 ", 3500) && !pruefeAntwort("", 0) },
  { name: "punkteFuer: Basis 10·Level, Combo ab Serie 3 (+2 je weiterer)", ok: () =>
      punkteFuer(1, 1) === 10 && punkteFuer(1, 3) === 12 && punkteFuer(2, 4) === 24 &&
      punkteFuer(3, 1) === 30 && punkteFuer(3, 6) === 38 }
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
    api.flaeche.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:14px;align-items:center;justify-content:center;min-height:280px;padding:20px;text-align:center;">
        <p style="margin:0;font-weight:700;">Wähle dein Level — ${SPRINT_SEKUNDEN} Sekunden, so viele Aufgaben wie möglich:</p>
        <div style="display:flex;flex-direction:column;gap:10px;align-items:stretch;width:min(100%,460px);">
          ${LEVELS.map(l => `<button type="button" class="knopf" data-level="${l.nr}" style="flex-direction:column;gap:2px;"><span>Level ${l.nr}: ${l.name}</span><span style="font-weight:400;font-size:.85rem;">${l.kurz}</span></button>`).join("")}
        </div>
        <p style="margin:0;color:var(--text-leise);font-size:.92rem;">Antworte nur mit der Zahl — die Zieleinheit steht schon in der Aufgabe.</p>
      </div>`;
    api.flaeche.querySelectorAll("[data-level]").forEach(knopf =>
      knopf.addEventListener("click", () => starteSprint(Number(knopf.dataset.level))));
  }

  function starteSprint(level) {
    let punkte = 0, serie = 0, besteSerie = 0, richtige = 0, versuche = 0;
    let rest = SPRINT_SEKUNDEN, gesperrt = false, fertig = false;
    let aufgabe = null, sperrTimer = 0;

    api.setzePunkte(0);
    api.setzeZeit(`${SPRINT_SEKUNDEN} s`);
    api.flaeche.innerHTML = `
      <div style="display:flex;flex-direction:column;gap:16px;align-items:center;justify-content:center;min-height:280px;padding:20px;text-align:center;">
        <p style="margin:0;color:var(--text-leise);font-size:.92rem;">Level ${level}: ${LEVELS[level - 1].name}</p>
        <p id="em-frage" aria-live="polite" style="margin:0;font-weight:700;font-size:clamp(1.6rem,6.5vw,2.4rem);"></p>
        <form id="em-form" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;">
          <input id="em-eingabe" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false"
                 aria-label="Deine Antwort" style="font:inherit;font-size:1.4rem;width:7em;text-align:center;padding:8px;border:2px solid var(--linie);border-radius:var(--radius-klein);background:var(--bg);color:var(--text);">
          <button type="submit" class="knopf">Prüfen</button>
        </form>
        <p id="em-feedback" role="status" aria-live="polite" style="margin:0;min-height:1.6em;font-weight:600;"></p>
      </div>`;

    const frageEl = api.flaeche.querySelector("#em-frage");
    const eingabe = api.flaeche.querySelector("#em-eingabe");
    const feedbackEl = api.flaeche.querySelector("#em-feedback");

    aufraeumen = () => { fertig = true; clearTimeout(sperrTimer); };

    function naechste() {
      if (fertig) return;
      aufgabe = erzeugeAufgabe(level);
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
      api.vorbei(punkte, `<p>Gelöst: ${richtige} von ${versuche} Aufgaben (Level ${level})${serieText}.</p>`);
    }

    api.flaeche.querySelector("#em-form").addEventListener("submit", ev => {
      ev.preventDefault();
      if (gesperrt || fertig) return;
      if (eingabe.value.trim() === "") return; // leere Eingabe: nichts werten
      versuche++;
      if (pruefeAntwort(eingabe.value, aufgabe.loesung)) {
        serie++; richtige++;
        besteSerie = Math.max(besteSerie, serie);
        punkte += punkteFuer(level, serie);
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
