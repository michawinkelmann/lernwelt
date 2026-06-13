// spiel.js — Blitzrechnen: 60-Sekunden-Kopfrechensprint (Trainingsraum).
// Reine Logik (Aufgaben-Generatoren, Antwortprüfung, Punkte) liegt auf Modulebene
// und ist in Node testbar (export TESTS) — alles mit DOM passiert erst in starte().

export const manifest = {
  id: "ls-blitzrechnen",
  titel: "Blitzrechnen",
  punkteLabel: "Punkte",
  highscore: true,
  zeigeZeit: true,
  steuerungHinweis: "Antwort eintippen und Enter — Komma oder Punkt, beides zählt."
};

export const SPRINT_SEKUNDEN = 60;

export const LEVELS = [
  { nr: 1, name: "Kleines Einmaleins", kurz: "2–9 mal 2–9" },
  { nr: 2, name: "Plus und Minus bis 100", kurz: "nie negativ" },
  { nr: 3, name: "Bis 1000 mit Mal und Geteilt", kurz: "geteilt geht immer glatt auf" },
  { nr: 4, name: "Gemischt mit Klammern", kurz: "alles plus a · (b + c)" }
];

// ---------- reine Hilfsfunktionen ----------

// Zufällige ganze Zahl von min bis max (beide einschließlich)
function zufallsZahl(min, max) { return min + Math.floor(Math.random() * (max - min + 1)); }
function zufallsWahl(liste) { return liste[Math.floor(Math.random() * liste.length)]; }

// Zahl für die Anzeige: Dezimalpunkt → deutsches Komma
export function alsDeutsch(zahl) { return String(zahl).replace(".", ","); }

// Antwortprüfung: Komma → Punkt, trimmen, als Zahl exakt vergleichen.
// Alle Aufgaben werden so erzeugt, dass die Lösung exakt darstellbar ist.
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
// Jede Aufgabe: { text: "7 · 8 = ?", loesung: 56 } — Lösung immer ganzzahlig ≥ 0.

function aufgabeEinmaleins() {
  const a = zufallsZahl(2, 9), b = zufallsZahl(2, 9);
  return { text: `${a} · ${b} = ?`, loesung: a * b };
}

function aufgabePlusMinus(maxSumme) {
  if (Math.random() < 0.5) {
    const a = zufallsZahl(11, maxSumme - 11);
    const b = zufallsZahl(2, maxSumme - a);
    return { text: `${a} + ${b} = ?`, loesung: a + b };
  }
  const a = zufallsZahl(13, maxSumme);
  const b = zufallsZahl(2, a - 2);
  return { text: `${a} − ${b} = ?`, loesung: a - b };
}

function aufgabeGrossesEinmaleins() {
  const a = zufallsZahl(2, 9), b = zufallsZahl(11, 25);
  return { text: `${b} · ${a} = ?`, loesung: a * b };
}

function aufgabeGeteilt() {
  const teiler = zufallsZahl(2, 9), ergebnis = zufallsZahl(3, 12);
  return { text: `${teiler * ergebnis} : ${teiler} = ?`, loesung: ergebnis };
}

function aufgabeKlammer() {
  const a = zufallsZahl(2, 9), b = zufallsZahl(2, 9), c = zufallsZahl(2, 9);
  return { text: `${a} · (${b} + ${c}) = ?`, loesung: a * (b + c) };
}

export function erzeugeAufgabe(level) {
  if (level === 1) return aufgabeEinmaleins();
  if (level === 2) return aufgabePlusMinus(100);
  if (level === 3) {
    const art = zufallsWahl(["pm", "pm", "mal", "geteilt"]);
    if (art === "pm") return aufgabePlusMinus(1000);
    return art === "mal" ? aufgabeGrossesEinmaleins() : aufgabeGeteilt();
  }
  // Level 4: alles gemischt, Klammerterm etwas häufiger
  const art = zufallsWahl(["k11", "pm100", "pm1000", "mal", "geteilt", "klammer", "klammer"]);
  if (art === "k11") return aufgabeEinmaleins();
  if (art === "pm100") return aufgabePlusMinus(100);
  if (art === "pm1000") return aufgabePlusMinus(1000);
  if (art === "mal") return aufgabeGrossesEinmaleins();
  if (art === "geteilt") return aufgabeGeteilt();
  return aufgabeKlammer();
}

// ---------- Selbsttests (Node: siehe QS-Lauf) ----------

// Unabhängige Nachrechnung: liest den Aufgabentext und rechnet selbst.
function zerlegeText(text) {
  let m = text.match(/^(\d+) · \((\d+) \+ (\d+)\) = \?$/);
  if (m) {
    const a = Number(m[1]), b = Number(m[2]), c = Number(m[3]);
    return { art: "klammer", zahlen: [a, b, c], wert: a * (b + c) };
  }
  m = text.match(/^(\d+) ([+−·:]) (\d+) = \?$/);
  if (!m) return null;
  const a = Number(m[1]), b = Number(m[3]), op = m[2];
  const wert = op === "+" ? a + b : op === "−" ? a - b : op === "·" ? a * b : a / b;
  return { art: op, zahlen: [a, b], wert };
}

function pruefeSpanne(level, z) {
  const [a, b, c] = z.zahlen;
  if (z.art === "klammer") {
    return (level === 4) && [a, b, c].every(n => n >= 2 && n <= 9);
  }
  if (z.art === "·") {
    const klein = a >= 2 && a <= 9 && b >= 2 && b <= 9;        // kleines Einmaleins
    const gross = a >= 11 && a <= 25 && b >= 2 && b <= 9;      // großes Einmaleins
    if (level === 1) return klein;
    if (level === 3) return gross;
    return klein || gross; // Level 4 mischt beide Formen
  }
  if (z.art === ":") return b >= 2 && b <= 9 && z.wert >= 3 && z.wert <= 12;
  // Plus/Minus: Operanden und Ergebnis in der Levelspanne, nie negativ
  const max = level === 2 ? 100 : 1000;
  return a >= 0 && a <= max && b >= 0 && b <= max && z.wert >= 0 && z.wert <= max;
}

function testeLevel(level, erlaubteArten) {
  for (let i = 0; i < 200; i++) {
    const auf = erzeugeAufgabe(level);
    const z = zerlegeText(auf.text);
    if (!z) return false;                                  // Text nicht lesbar
    if (!erlaubteArten.includes(z.art)) return false;      // falscher Aufgabentyp
    if (z.wert !== auf.loesung) return false;              // unabhängige Nachrechnung
    if (!Number.isInteger(auf.loesung) || auf.loesung < 0) return false; // exakt & nie negativ
    if (!pruefeSpanne(level, z)) return false;             // Werte in der Spanne
    if (!pruefeAntwort(String(auf.loesung), auf.loesung)) return false;
    if (!pruefeAntwort(alsDeutsch(auf.loesung), auf.loesung)) return false;
  }
  return true;
}

export const TESTS = [
  { name: "Level 1: 200 Einmaleins-Aufgaben korrekt und in Spanne", ok: () => testeLevel(1, ["·"]) },
  { name: "Level 2: 200 Plus/Minus-Aufgaben bis 100, nie negativ", ok: () => testeLevel(2, ["+", "−"]) },
  { name: "Level 3: 200 Aufgaben bis 1000, Division glatt", ok: () => testeLevel(3, ["+", "−", "·", ":"]) },
  { name: "Level 4: 200 gemischte Aufgaben inkl. Klammerterm", ok: () => testeLevel(4, ["+", "−", "·", ":", "klammer"]) },
  { name: "pruefeAntwort: Komma und Punkt, exakter Vergleich", ok: () =>
      pruefeAntwort("2,5", 2.5) && pruefeAntwort("2.5", 2.5) && !pruefeAntwort("2,6", 2.5) &&
      pruefeAntwort(" 56 ", 56) && !pruefeAntwort("", 0) && !pruefeAntwort("abc", 0) },
  { name: "punkteFuer: Basis 10·Level, Combo ab Serie 3 (+2 je weiterer)", ok: () =>
      punkteFuer(1, 1) === 10 && punkteFuer(1, 2) === 10 && punkteFuer(1, 3) === 12 &&
      punkteFuer(1, 4) === 14 && punkteFuer(3, 1) === 30 && punkteFuer(4, 5) === 46 }
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
        <div style="display:flex;flex-direction:column;gap:10px;align-items:stretch;width:min(100%,420px);">
          ${LEVELS.map(l => `<button type="button" class="knopf" data-level="${l.nr}" style="flex-direction:column;gap:2px;"><span>Level ${l.nr}: ${l.name}</span><span style="font-weight:400;font-size:.85rem;">${l.kurz}</span></button>`).join("")}
        </div>
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
        <p id="bz-frage" aria-live="polite" style="margin:0;font-weight:700;font-size:clamp(1.7rem,7vw,2.5rem);"></p>
        <form id="bz-form" style="display:flex;gap:10px;flex-wrap:wrap;justify-content:center;align-items:center;">
          <input id="bz-eingabe" inputmode="decimal" autocomplete="off" autocapitalize="off" spellcheck="false"
                 aria-label="Deine Antwort" style="font:inherit;font-size:1.4rem;width:7em;text-align:center;padding:8px;border:2px solid var(--linie);border-radius:var(--radius-klein);background:var(--bg);color:var(--text);">
          <button type="submit" class="knopf">Prüfen</button>
        </form>
        <p id="bz-feedback" role="status" aria-live="polite" style="margin:0;min-height:1.6em;font-weight:600;"></p>
      </div>`;

    const frageEl = api.flaeche.querySelector("#bz-frage");
    const eingabe = api.flaeche.querySelector("#bz-eingabe");
    const feedbackEl = api.flaeche.querySelector("#bz-feedback");

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

    api.flaeche.querySelector("#bz-form").addEventListener("submit", ev => {
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
