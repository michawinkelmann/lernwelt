// spiel.js — Galgenraten (Pausenraum, Beamermodus). Hangman auf der digitalen Tafel:
// Die Klasse rät gemeinsam gegen die Tafel — Buchstaben aufdecken, bevor das
// Galgenmännchen vollständig ist. Läuft im Beamer-Rahmen (assets/js/spiel/beamer.js).
// Reine Logik (maskiere, istGewonnen, fehlerAnzahl, normBuchstabe) ist exportiert und
// in Node testbar — DOM/SVG nur in starte().

export const manifest = {
  id: "sp-galgenraten",
  titel: "Galgenraten",
  kurz: "Hangman im Beamermodus: Die Klasse rät gemeinsam Buchstabe für Buchstabe gegen die Tafel.",
  kategorie: "klasse"
};

const WORT_URL = new URL("../../daten/pausenraum/galgen-woerter.json", import.meta.url);

// Höchstzahl falscher Versuche, bevor das Männchen vollständig ist (= verloren).
export const MAX_FEHLER = 11;

// rein/testbar: Vergleichsform eines Zeichens (Großschreibung, ohne Akzente, ä→ae usw.)
// damit Groß-/Kleinschreibung beim Raten ignoriert wird.
export function normBuchstabe(ch) {
  return String(ch).toUpperCase()
    .replace(/Ä/g, "AE").replace(/Ö/g, "OE").replace(/Ü/g, "UE").replace(/ß/g, "SS");
}

// rein/testbar: Ist dieses Zeichen ein zu erratender Buchstabe?
// Leerzeichen, Bindestriche und sonstige Zeichen müssen nicht geraten werden.
export function istRatbar(ch) {
  return /[a-zäöüßA-ZÄÖÜ]/.test(ch);
}

// rein/testbar: Maskiert das Wort. Erratene Buchstaben werden gezeigt, nicht erratene
// als "_". Leerzeichen/Bindestriche bleiben sichtbar. "geraten" ist eine Liste roher
// Buchstaben (Groß/Klein egal); Vergleich über normBuchstabe.
export function maskiere(wort, geraten) {
  const norm = (geraten || []).map(normBuchstabe);
  return Array.from(String(wort)).map(ch => {
    if (!istRatbar(ch)) return ch;
    return norm.includes(normBuchstabe(ch)) ? ch : "_";
  }).join("");
}

// rein/testbar: Sind alle ratbaren Buchstaben des Worts erraten?
export function istGewonnen(wort, geraten) {
  const norm = (geraten || []).map(normBuchstabe);
  return Array.from(String(wort)).every(ch => !istRatbar(ch) || norm.includes(normBuchstabe(ch)));
}

// rein/testbar: Anzahl falscher geratener Buchstaben (die nicht im Wort vorkommen).
export function fehlerAnzahl(wort, geraten) {
  const imWort = new Set(Array.from(String(wort)).filter(istRatbar).map(normBuchstabe));
  const gesehen = new Set();
  let fehler = 0;
  (geraten || []).forEach(g => {
    const n = normBuchstabe(g);
    if (gesehen.has(n)) return;
    gesehen.add(n);
    if (!imWort.has(n)) fehler++;
  });
  return fehler;
}

// rein/testbar: Spielstatus aus Wort + geratenen Buchstaben.
export function status(wort, geraten) {
  if (istGewonnen(wort, geraten)) return "gewonnen";
  if (fehlerAnzahl(wort, geraten) >= MAX_FEHLER) return "verloren";
  return "laeuft";
}

// Mindest-Selbsttests (in Node ausführbar, siehe Block am Dateiende).
export const TESTS = [
  // maskiere deckt erratene Buchstaben auf, Rest "_", Leerzeichen sichtbar
  () => maskiere("Schule", ["s", "e"]) === "S____e",
  () => maskiere("Grosse Pause", ["p", "e"]) === "_____e P___e",
  () => maskiere("Schule", []) === "______",
  // Groß-/Kleinschreibung wird ignoriert (Kleinbuchstabe rät Großbuchstaben und umgekehrt)
  () => maskiere("Affe", ["A", "e"]) === "A__e",
  () => maskiere("Affe", ["a", "E"]) === "A__e",
  // Umlaute: "ä" wird über "ae" mit-aufgedeckt und umgekehrt
  () => maskiere("Bär", ["b", "ae", "r"]) === "Bär",
  // istGewonnen
  () => istGewonnen("Hai", ["h", "a", "i"]) === true,
  () => istGewonnen("Hai", ["h", "a"]) === false,
  () => istGewonnen("Hai", ["H", "A", "I"]) === true, // Großschreibung egal
  () => istGewonnen("Zwei Worte", ["z", "w", "e", "i", "o", "r", "t"]) === true, // Leerzeichen zählt nicht
  // fehlerAnzahl
  () => fehlerAnzahl("Hai", ["h", "x", "y"]) === 2,
  () => fehlerAnzahl("Hai", ["x", "x"]) === 1, // doppelt geraten zählt nur einmal
  () => fehlerAnzahl("Hai", ["h", "a", "i"]) === 0,
  // status
  () => status("Hai", ["h", "a", "i"]) === "gewonnen",
  () => status("Hai", ["b", "c", "d", "f", "g", "j", "k", "l", "m", "n", "p"]) === "verloren"
];

// Die elf Teile des Galgenmännchens als SVG-Fragmente. Index 0 erscheint beim
// 1. Fehler, Index 10 beim 11. Fehler — dann ist das Männchen komplett.
const GALGEN_TEILE = [
  '<line x1="20" y1="180" x2="100" y2="180" />',          // Boden
  '<line x1="40" y1="180" x2="40" y2="20" />',            // Pfosten
  '<line x1="40" y1="20" x2="110" y2="20" />',            // Querbalken
  '<line x1="40" y1="50" x2="70" y2="20" />',             // Strebe
  '<line x1="110" y1="20" x2="110" y2="40" />',           // Seil
  '<circle cx="110" cy="52" r="12" />',                   // Kopf
  '<line x1="110" y1="64" x2="110" y2="110" />',          // Rumpf
  '<line x1="110" y1="74" x2="92" y2="95" />',            // linker Arm
  '<line x1="110" y1="74" x2="128" y2="95" />',           // rechter Arm
  '<line x1="110" y1="110" x2="93" y2="140" />',          // linkes Bein
  '<line x1="110" y1="110" x2="127" y2="140" />'          // rechtes Bein
];

export async function starte(api) {
  const { buehne, el } = api;
  let liste;
  try {
    const daten = await (await fetch(WORT_URL, { cache: "no-store" })).json();
    liste = daten.woerter;
  } catch (_e) {
    buehne.innerHTML = `<p class="bm-info">Die Wörter konnten nicht geladen werden — bitte die Seite neu laden.</p>`;
    return;
  }
  let ziehe = api.zieher(liste);

  // Zustand der laufenden Partie
  let wort = "";
  let geraten = [];

  zeigeSetup();

  function zeigeSetup() {
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Galgenraten — Einstellungen</h2>
        <p class="bm-info">Die ganze Klasse rät gemeinsam gegen die Tafel: Nennt Buchstaben, richtige werden aufgedeckt. Bei einem falschen Buchstaben wächst das Galgenmännchen — nach <strong>${MAX_FEHLER}</strong> Fehlern ist es vorbei.</p>
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="ga-zufall">Zufallswort</button>
          <button type="button" class="knopf zweitrangig" id="ga-eigen">Eigenes Wort eingeben</button>
        </div>
      </div>`;
    buehne.querySelector("#ga-zufall").addEventListener("click", () => starteRunde(ziehe()));
    buehne.querySelector("#ga-eigen").addEventListener("click", zeigeEingabe);
  }

  // Verdeckte Eingabe eines eigenen Worts (type=password, damit die Klasse nicht mitliest).
  function zeigeEingabe() {
    buehne.innerHTML = `
      <div class="bm-setup ga-eingabe">
        <h2>Eigenes Wort eingeben</h2>
        <p class="bm-warn">Alle anderen kurz wegschauen!</p>
        <p class="bm-info">Tippe ein Wort oder eine kurze Phrase ein — die Eingabe wird verdeckt angezeigt, damit niemand mitliest. Erlaubt sind Buchstaben, Leerzeichen und Bindestriche.</p>
        <div class="bm-zeile ga-eingabe-zeile">
          <input type="password" id="ga-feld" class="ga-feld" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="geheimes Wort …">
          <label class="ga-zeigen"><input type="checkbox" id="ga-sicht"> anzeigen</label>
        </div>
        <p class="bm-info ga-fehler" id="ga-eingabe-fehler" hidden>Bitte mindestens einen Buchstaben eingeben.</p>
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="ga-start">Spiel starten</button>
          <button type="button" class="knopf zweitrangig" id="ga-zurueck">Zurück</button>
        </div>
      </div>`;
    const feld = buehne.querySelector("#ga-feld");
    const sicht = buehne.querySelector("#ga-sicht");
    const fehler = buehne.querySelector("#ga-eingabe-fehler");
    feld.focus();
    sicht.addEventListener("change", () => { feld.type = sicht.checked ? "text" : "password"; });
    const losgehts = () => {
      const eingabe = feld.value.trim();
      if (!Array.from(eingabe).some(istRatbar)) { fehler.hidden = false; feld.focus(); return; }
      starteRunde(eingabe);
    };
    buehne.querySelector("#ga-start").addEventListener("click", losgehts);
    buehne.querySelector("#ga-zurueck").addEventListener("click", zeigeSetup);
    feld.addEventListener("keydown", e => { if (e.key === "Enter") losgehts(); });
  }

  function starteRunde(neuesWort) {
    wort = neuesWort;
    geraten = [];
    zeigeSpiel();
  }

  function zeigeSpiel() {
    buehne.innerHTML = "";

    // Galgen-Grafik
    const galgenWrap = el(`<div class="ga-galgen"><svg viewBox="0 0 150 200" class="ga-svg" role="img" aria-label="Galgenmännchen"><g class="ga-strich"></g></svg></div>`);
    const galgenG = galgenWrap.querySelector(".ga-strich");

    // Fehleranzeige
    const fehlerEl = el(`<p class="bm-info ga-fehlerstand" aria-live="polite"></p>`);

    // Wort mit Lücken
    const wortEl = el(`<div class="ga-wort" aria-live="polite"></div>`);

    // Tastatur (A–Z + Umlaute)
    const reihen = ["ABCDEFGHIJ", "KLMNOPQRS", "TUVWXYZ", "ÄÖÜ"];
    const tastatur = el(`<div class="ga-tastatur"></div>`);
    reihen.forEach(zeile => {
      const r = el(`<div class="ga-reihe"></div>`);
      Array.from(zeile).forEach(b => {
        const knopf = el(`<button type="button" class="knopf ga-taste" data-buchstabe="${b}">${b}</button>`);
        knopf.addEventListener("click", () => rate(b));
        r.append(knopf);
      });
      tastatur.append(r);
    });

    // Aktionsknöpfe
    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="ga-neu">Neues Wort</button>
      <button type="button" class="knopf zweitrangig" id="ga-setup">Einstellungen</button></div>`);
    knoepfe.querySelector("#ga-neu").addEventListener("click", () => starteRunde(ziehe()));
    knoepfe.querySelector("#ga-setup").addEventListener("click", zeigeSetup);

    // Ergebniszeile (gewonnen/verloren)
    const ergebnisEl = el(`<div class="ga-ergebnis" hidden></div>`);

    buehne.append(galgenWrap, fehlerEl, wortEl, ergebnisEl, tastatur, knoepfe);

    function rate(b) {
      const norm = normBuchstabe(b);
      if (geraten.map(normBuchstabe).includes(norm)) return; // schon geraten
      geraten.push(b);
      aktualisiere();
    }

    function aktualisiere() {
      // Wort als Kästchen
      wortEl.innerHTML = "";
      Array.from(wort).forEach(ch => {
        if (!istRatbar(ch)) {
          // Leerzeichen / Bindestrich sichtbar lassen
          wortEl.append(el(`<span class="ga-zeichen ga-trenn">${ch === " " ? "&nbsp;" : ch}</span>`));
        } else {
          const sichtbar = geraten.map(normBuchstabe).includes(normBuchstabe(ch));
          wortEl.append(el(`<span class="ga-zeichen${sichtbar ? " ga-auf" : ""}">${sichtbar ? ch : ""}</span>`));
        }
      });

      // Fehler + Galgen
      const fehler = fehlerAnzahl(wort, geraten);
      galgenG.innerHTML = GALGEN_TEILE.slice(0, Math.min(fehler, MAX_FEHLER)).join("");
      fehlerEl.textContent = `Fehler: ${fehler} von ${MAX_FEHLER}`;

      // Tastenzustand: richtige grün markieren, falsche/benutzte deaktivieren
      tastatur.querySelectorAll(".ga-taste").forEach(t => {
        const norm = normBuchstabe(t.dataset.buchstabe);
        const benutzt = geraten.map(normBuchstabe).includes(norm);
        const imWort = Array.from(wort).filter(istRatbar).map(normBuchstabe).includes(norm);
        t.classList.toggle("ga-benutzt", benutzt);
        t.classList.toggle("ga-treffer", benutzt && imWort);
        t.classList.toggle("ga-daneben", benutzt && !imWort);
        t.disabled = benutzt;
      });

      // Spielstatus
      const st = status(wort, geraten);
      if (st === "gewonnen") {
        ergebnisEl.hidden = false;
        ergebnisEl.innerHTML = `<div class="bm-gross ga-gewonnen">Gewonnen! 🎉</div>`;
        tastatur.querySelectorAll(".ga-taste").forEach(t => t.disabled = true);
      } else if (st === "verloren") {
        ergebnisEl.hidden = false;
        ergebnisEl.innerHTML = `<div class="bm-gross ga-verloren">Verloren — das Wort war: <strong>${wort}</strong></div>`;
        tastatur.querySelectorAll(".ga-taste").forEach(t => t.disabled = true);
        // bei Niederlage das ganze Wort aufdecken
        wortEl.querySelectorAll(".ga-zeichen").forEach((span, i) => {
          const ch = Array.from(wort)[i];
          if (istRatbar(ch) && !span.classList.contains("ga-auf")) {
            span.textContent = ch; span.classList.add("ga-auf", "ga-fehlstelle");
          }
        });
      } else {
        ergebnisEl.hidden = true;
        ergebnisEl.innerHTML = "";
      }
    }

    // Tastatureingabe über die echte Tastatur (bequem auf dem Laptop)
    const aufTaste = e => {
      if (e.ctrlKey || e.altKey || e.metaKey) return;
      const ch = e.key;
      if (ch && ch.length === 1 && istRatbar(ch)) { rate(ch); }
    };
    document.addEventListener("keydown", aufTaste);
    // Beim nächsten Bildschirmwechsel den Handler wieder entfernen
    const beobachter = new MutationObserver(() => {
      if (!buehne.contains(wortEl)) { document.removeEventListener("keydown", aufTaste); beobachter.disconnect(); }
    });
    beobachter.observe(buehne, { childList: true });

    aktualisiere();
  }
}
