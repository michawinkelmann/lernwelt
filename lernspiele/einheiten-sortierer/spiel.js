// spiel.js — Einheiten-Sortierer: Formelzeichen, Einheiten, Messgeräte und
// Alltagswerte unter Zeitdruck der richtigen physikalischen Größe zuordnen.
// Aufbau wie bei allen Lernspielen: oben reine, in Node testbare Logik
// (Modulebene fasst kein document/window an), unten der DOM-Teil, der nur
// im Browser über starteSpielSeite() aus dem gemeinsamen Gerüst startet.

import { starteSpielSeite } from "../../assets/js/spiel/geruest.js";
import { zeigeStufenwahl } from "../../assets/js/spiel/stufenwahl.js";

// ===== Datensatz: 12 physikalische Größen mit je 4 Attributen =====
// Jeder Attributtext ist über alle Größen hinweg eindeutig und zusammen mit
// seinem Typ-Etikett genau einer Größe zuordenbar („J" nur bei Energie,
// „kWh" nur bei Energie, „bar" nur beim Druck). Begriffe sek-I-konform,
// pro Karte genau ein Begriff (kein Synonym „Arbeit" für Energie).
export const ATTRIBUT_TYPEN = ["formelzeichen", "einheit", "geraet", "alltag"];
export const TYP_LABEL = {
  formelzeichen: "Formelzeichen",
  einheit: "Einheit",
  geraet: "Messgerät / Beispiel",
  alltag: "Alltagswert"
};

export const GROESSEN = [
  { id: "laenge", name: "Länge",
    formelzeichen: "l (kleines L)",
    einheit: "m (Meter)",
    geraet: "Lineal oder Maßband",
    alltag: "Höhe einer Tür: etwa 2 m" },
  { id: "zeit", name: "Zeit",
    formelzeichen: "t",
    einheit: "s (Sekunde)",
    geraet: "Stoppuhr",
    alltag: "Eine Schulstunde: 45 min" },
  { id: "masse", name: "Masse",
    formelzeichen: "m",
    einheit: "kg (Kilogramm)",
    geraet: "Waage",
    alltag: "Eine Tafel Schokolade: 100 g" },
  { id: "temperatur", name: "Temperatur",
    formelzeichen: "ϑ (griechisch: Theta)",
    einheit: "°C (Grad Celsius)",
    geraet: "Thermometer",
    alltag: "Körpertemperatur: etwa 37 °C" },
  { id: "geschwindigkeit", name: "Geschwindigkeit",
    formelzeichen: "v",
    einheit: "m/s (Meter pro Sekunde)",
    geraet: "Tacho am Fahrrad",
    alltag: "Zügiges Radfahren: etwa 20 km/h" },
  { id: "kraft", name: "Kraft",
    formelzeichen: "F",
    einheit: "N (Newton)",
    geraet: "Federkraftmesser",
    alltag: "Gewichtskraft von 100 g Schokolade: etwa 1 N" },
  { id: "energie", name: "Energie",
    formelzeichen: "E",
    einheit: "J (Joule)",
    geraet: "Stromzähler (zählt Kilowattstunden)",
    alltag: "Ein Schokoriegel: etwa 1000 kJ" },
  { id: "leistung", name: "Leistung",
    formelzeichen: "P (großes P)",
    einheit: "W (Watt)",
    geraet: "alte Einheit: PS (Pferdestärke)",
    alltag: "Wasserkocher: etwa 2000 W" },
  { id: "stromstaerke", name: "Stromstärke",
    formelzeichen: "I (großes i)",
    einheit: "A (Ampere)",
    geraet: "Amperemeter (Strommessgerät)",
    alltag: "Sicherung im Sicherungskasten: 16 A" },
  { id: "spannung", name: "Spannung",
    formelzeichen: "U",
    einheit: "V (Volt)",
    geraet: "Voltmeter (Spannungsmessgerät)",
    alltag: "Steckdose: 230 V" },
  { id: "widerstand", name: "Widerstand",
    formelzeichen: "R",
    einheit: "Ω (Ohm)",
    geraet: "Ohmmeter (Messbereich am Multimeter)",
    alltag: "Kopfhörer: etwa 32 Ω" },
  { id: "druck", name: "Druck",
    formelzeichen: "p (kleines p)",
    einheit: "Pa (Pascal)",
    geraet: "Manometer (Reifendruck-Prüfer)",
    alltag: "Fahrradreifen: etwa 4 bar" }
];

// Level 1–3: feste Vierergruppen; Level 4: vier zufällige aus allen zwölf.
export const LEVELS = {
  1: { name: "Grundgrößen", hinweis: "Länge · Zeit · Masse · Temperatur",
       ids: ["laenge", "zeit", "masse", "temperatur"] },
  2: { name: "Bewegung & Energie", hinweis: "Kraft · Energie · Leistung · Geschwindigkeit",
       ids: ["kraft", "energie", "leistung", "geschwindigkeit"] },
  3: { name: "Elektrik & Druck", hinweis: "Stromstärke · Spannung · Widerstand · Druck",
       ids: ["stromstaerke", "spannung", "widerstand", "druck"] },
  4: { name: "Alles gemischt", hinweis: "vier zufällige aus allen zwölf Größen",
       ids: null }
};

export const RUNDENDAUER_S = 60;

// ===== Klassenstufen =====
// Eine Klassenstufe legt fest, welche Größen in einer Runde vorkommen können;
// je Runde werden daraus vier Spalten gezogen. Höhere Klassen nehmen die
// kleineren Größen weiter mit und ergänzen neue.
export const STUFEN = [
  { klasse: "Klasse 5/6", kurz: "Länge, Zeit, Masse, Temperatur",
    groessen: ["laenge", "zeit", "masse", "temperatur"] },
  { klasse: "Klasse 7/8", kurz: "auch Geschwindigkeit, Kraft, Energie, Leistung",
    groessen: ["laenge", "zeit", "masse", "temperatur", "geschwindigkeit", "kraft", "energie", "leistung"] },
  { klasse: "Klasse 9/10", kurz: "auch Strom, Spannung, Widerstand, Druck",
    groessen: ["laenge", "zeit", "masse", "temperatur", "geschwindigkeit", "kraft", "energie", "leistung", "stromstaerke", "spannung", "widerstand", "druck"] }
];

// ===== Reine Logik (in Node testbar) =====

// Fisher-Yates auf einer Kopie — Original bleibt unverändert.
export function mischen(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Prüft den Datensatz: 12 Größen, je 4 gefüllte Attribute, ids/Namen eindeutig,
// kein Attributtext doppelt über Größen hinweg. Liefert Liste der Fehler.
export function datensatzFehler(groessen = GROESSEN) {
  const fehler = [];
  if (!Array.isArray(groessen) || groessen.length !== 12) {
    fehler.push(`erwartet 12 Größen, gefunden ${Array.isArray(groessen) ? groessen.length : 0}`);
  }
  const ids = new Set(), namen = new Set(), texte = new Map();
  for (const g of groessen || []) {
    if (!g || !g.id || !g.name) { fehler.push("Größe ohne id oder name"); continue; }
    if (ids.has(g.id)) fehler.push(`doppelte id: ${g.id}`);
    ids.add(g.id);
    const nameKlein = g.name.toLowerCase();
    if (namen.has(nameKlein)) fehler.push(`doppelter Name: ${g.name}`);
    namen.add(nameKlein);
    for (const typ of ATTRIBUT_TYPEN) {
      const text = g[typ];
      if (typeof text !== "string" || !text.trim()) {
        fehler.push(`${g.id}: Attribut „${typ}" fehlt oder ist leer`);
        continue;
      }
      const klein = text.trim().toLowerCase();
      if (texte.has(klein)) {
        fehler.push(`Attribut doppelt über Größen hinweg: „${text}" (${texte.get(klein)} und ${g.id})`);
      } else {
        texte.set(klein, g.id);
      }
    }
  }
  return fehler;
}

// Liefert die 4 Spalten-Größen eines Levels — immer 4 verschiedene,
// in zufälliger Spaltenreihenfolge (auch bei festen Levelgruppen).
export function spaltenFuerLevel(level, rng = Math.random) {
  const def = LEVELS[level] || LEVELS[4];
  const auswahl = def.ids
    ? def.ids.map(id => GROESSEN.find(g => g.id === id))
    : mischen(GROESSEN, rng).slice(0, 4);
  return mischen(auswahl, rng);
}

// Liefert die 4 Spalten-Größen einer Klassenstufe — vier verschiedene, zufällig
// aus den in der Stufe erlaubten Größen (stufe.groessen) gezogen und in zufälliger
// Spaltenreihenfolge. Hat eine Stufe genau vier Größen, kommen stets diese vier.
export function spaltenFuerStufe(stufe, rng = Math.random) {
  const erlaubt = (stufe && Array.isArray(stufe.groessen) ? stufe.groessen : [])
    .map(id => GROESSEN.find(g => g.id === id))
    .filter(Boolean);
  const basis = erlaubt.length >= 4 ? erlaubt : GROESSEN;
  return mischen(basis, rng).slice(0, 4);
}

// Kartenpool einer Runde: je Spalten-Größe alle 4 Attribute → 16 Karten.
export function erzeugePool(spalten) {
  const pool = [];
  for (const g of spalten) {
    for (const typ of ATTRIBUT_TYPEN) {
      pool.push({ text: g[typ], typ, groesseId: g.id, groesseName: g.name });
    }
  }
  return pool;
}

// Entnimmt eine zufällige Karte ohne Wiederholung (mutiert pool);
// null, wenn der Pool leer ist — der Aufrufer füllt dann neu.
export function naechsteKarte(pool, rng = Math.random) {
  if (!Array.isArray(pool) || pool.length === 0) return null;
  const i = Math.floor(rng() * pool.length);
  return pool.splice(i, 1)[0];
}

// Punktedelta: richtig +10, ab dem 3. Treffer in Serie +12, falsch −5.
// combo = Länge der aktuellen Richtig-Serie einschließlich dieser Antwort.
export function punkteNach(antwortRichtig, combo) {
  if (!antwortRichtig) return -5;
  return combo >= 3 ? 12 : 10;
}

// Der Punktestand fällt nie unter 0.
export function klemmePunkte(punkte) {
  return Math.max(0, punkte);
}

// ===== Selbsttests (in Node / im Verifikations-Gerüst) =====

export const TESTS = [
  { name: "Datensatz: 12 Größen, Attribute eindeutig (datensatzFehler leer)",
    ok: () => datensatzFehler().length === 0 },
  { name: "STUFEN: jede Stufe referenziert nur existierende GRÖSSEN-ids",
    ok: () => STUFEN.length >= 3 && STUFEN.every(s =>
      Array.isArray(s.groessen) && s.groessen.length > 0 &&
      s.groessen.every(id => GROESSEN.some(g => g.id === id))) },
  { name: "STUFEN: kleinste Stufe hat mindestens 3 Größen",
    ok: () => Math.min(...STUFEN.map(s => s.groessen.length)) >= 3 },
  { name: "spaltenFuerStufe: liefert je Stufe vier verschiedene erlaubte Größen",
    ok: () => STUFEN.every(s => { const sp = spaltenFuerStufe(s, Math.random);
      const ids = sp.map(g => g.id);
      return sp.length === 4 && new Set(ids).size === 4 && ids.every(id => s.groessen.includes(id)); }) }
];

// ===== DOM-Teil (läuft nur im Browser) =====

const manifest = {
  id: "ls-einheiten-sortierer",
  titel: "Einheiten-Sortierer",
  kurz: "Volt, Ampere, Newton, Watt: Sortiere Größe, Formelzeichen, Einheit und Messgerät unter Zeitdruck in die richtigen Spalten.",
  punkteLabel: "Punkte",
  punkteEinheit: "",
  highscore: true,
  zeigeZeit: true,
  steuerungHinweis: "Tippe die richtige Spalte an — oder Tasten 1 bis 4."
};

function esc(s) {
  return String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));
}

function starte(api) {
  let aktiv = false, punkte = 0, rest = RUNDENDAUER_S, combo = 0, besteSerie = 0;
  let richtigAnz = 0, falschAnz = 0, stufe = STUFEN[0];
  let spalten = [], pool = [], karte = null, letzterText = "";

  api.neustartCb(zeigeLevelwahl);
  api.tasten(ev => {
    if (!aktiv) return;
    if (["1", "2", "3", "4"].includes(ev.key)) antworte(Number(ev.key) - 1);
  });

  function zeigeLevelwahl() {
    aktiv = false;
    api.loopStopp();
    api.setzePunkte(0);
    api.setzeZeit(RUNDENDAUER_S + " s");
    zeigeStufenwahl(api.flaeche, {
      titel: "Wähle deine Klasse:",
      hinweis: `${RUNDENDAUER_S} Sekunden lang erscheinen Karten — tippe die Spalte der passenden Größe an. Richtig: +10 (ab 3 Treffern in Serie +12), daneben: −5. Höhere Klassen bringen mehr Größen ins Spiel.`,
      stufen: STUFEN,
      aufWahl: s => starteRunde(s)
    });
  }

  function starteRunde(neueStufe) {
    stufe = neueStufe;
    spalten = spaltenFuerStufe(stufe);
    pool = erzeugePool(spalten);
    punkte = 0; combo = 0; besteSerie = 0; richtigAnz = 0; falschAnz = 0;
    rest = RUNDENDAUER_S; letzterText = ""; karte = null; aktiv = true;
    api.setzePunkte(0);
    api.flaeche.innerHTML = `
      <div class="es-brett">
        <div class="es-karte">
          <span class="es-typ" id="es-typ"></span>
          <span class="es-text" id="es-text"></span>
        </div>
        <p class="es-status" id="es-status" role="status" aria-live="polite">Los geht’s — wohin gehört die Karte?</p>
        <div class="es-spalten">
          ${spalten.map((g, i) => `
            <button type="button" class="es-spalte" data-i="${i}">
              <span class="es-taste" aria-hidden="true">Taste ${i + 1}</span>
              <span class="es-name">${esc(g.name)}</span>
            </button>`).join("")}
        </div>
      </div>`;
    api.flaeche.querySelectorAll(".es-spalte").forEach(k =>
      k.addEventListener("click", () => antworte(Number(k.dataset.i))));
    zieheKarte();
    api.loop(dt => {
      rest -= dt;
      api.setzeZeit(Math.max(0, Math.ceil(rest)) + " s");
      if (rest <= 0) rundeVorbei();
    });
    api.flaeche.focus();
  }

  function zieheKarte() {
    karte = naechsteKarte(pool);
    if (!karte) {
      // Pool leer: neu füllen; direkte Wiederholung über die Grenze vermeiden.
      pool = erzeugePool(spalten);
      karte = naechsteKarte(pool);
      if (karte && karte.text === letzterText && pool.length > 0) {
        const ersatz = naechsteKarte(pool);
        pool.push(karte);
        karte = ersatz;
      }
    }
    const typEl = api.flaeche.querySelector("#es-typ");
    const textEl = api.flaeche.querySelector("#es-text");
    if (typEl && textEl && karte) {
      typEl.textContent = TYP_LABEL[karte.typ];
      textEl.textContent = karte.text;
    }
  }

  function antworte(spaltenIndex) {
    if (!aktiv || !karte || !spalten[spaltenIndex]) return;
    const richtig = spalten[spaltenIndex].id === karte.groesseId;
    combo = richtig ? combo + 1 : 0;
    if (combo > besteSerie) besteSerie = combo;
    const delta = punkteNach(richtig, combo);
    punkte = klemmePunkte(punkte + delta);
    api.setzePunkte(punkte);
    const status = api.flaeche.querySelector("#es-status");
    if (richtig) {
      richtigAnz++;
      status.textContent = combo >= 3
        ? `✓ Richtig! +${delta} (Serie: ${combo})`
        : `✓ Richtig! +${delta}`;
    } else {
      falschAnz++;
      status.textContent = `✗ Daneben (−5). Merke: „${karte.text}" → ${karte.groesseName}`;
    }
    const knopf = api.flaeche.querySelector(`.es-spalte[data-i="${spaltenIndex}"]`);
    if (knopf && !api.reduzierteBewegung) {
      knopf.classList.remove("es-ok", "es-falsch");
      void knopf.offsetWidth; // Animation neu anstoßen
      knopf.classList.add(richtig ? "es-ok" : "es-falsch");
    }
    letzterText = karte.text;
    zieheKarte();
  }

  function rundeVorbei() {
    aktiv = false;
    api.loopStopp();
    api.setzeZeit("0 s");
    const gesamt = richtigAnz + falschAnz;
    const lob = richtigAnz >= gesamt * 0.8 && gesamt > 0
      ? "Stark sortiert! Schaffst du beim nächsten Mal eine noch längere Serie?"
      : "Gut drangeblieben — mit jeder Runde sitzen Einheiten und Formelzeichen besser.";
    api.vorbei(punkte, `
      <p>${esc(stufe.klasse)} · ✓ ${richtigAnz} richtig · ✗ ${falschAnz} daneben · längste Serie: ${besteSerie}</p>
      <p>${lob}</p>`);
  }

  zeigeLevelwahl();
}

// Nur im Browser starten — in Node (Tests) gibt es kein document.
export { manifest, starte };

if (typeof document !== "undefined" && document.getElementById("spiel-wurzel")) {
  starteSpielSeite({ manifest, starte });
}
