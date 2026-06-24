// spiel.js — Größenordnungs-Duell (Trainingsraum · Physik)
// Schätzspiel: Zwei Objekte treten an („Was ist schneller?“) — erst tippen,
// dann decken die Steckbriefe die Werte auf. +100 Punkte pro Treffer, ab dem
// dritten Treffer in Serie +25 Bonus. Eine Runde = 10 Duelle einer Kategorie.
//
// Das Spielgerüst (assets/js/spiel/geruest.js) liefert Rahmen, Punkteanzeige
// und Bestenliste; dieses Modul liefert manifest + starte(api). Datensatz und
// reine Logik (datensatzKonsistent, vergleiche, ziehePaar, punkteFuerDuell)
// hängen nicht am DOM — die Modulebene benutzt kein document/window und ist
// in Node testbar: selbsttest().

// ---------- Manifest ----------

export const manifest = {
  id: "ls-groessenduell",
  titel: "Größenordnungs-Duell",
  kurz: "Was ist schneller — Gepard oder Radprofi? Erst tippen, dann zeigen die Steckbriefe die Wahrheit.",
  punkteLabel: "Punkte",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "absteigend",
  zeigeZeit: false,
  steuerungHinweis: "Linke oder rechte Karte antippen — oder Tasten A und L."
};

export const DUELLE_JE_RUNDE = 10;

// ---------- Datensatz ----------
// Alle Werte sind gerundete Schätzwerte für den Schulgebrauch (siWert in
// SI-Basiseinheit der Kategorie). Die Anzeige trägt deshalb „≈“; Ausnahmen
// (genormte oder definierte Werte) sind per „tag“ gekennzeichnet.
// Wichtig: Innerhalb einer Kategorie sind alle siWert verschieden — sonst
// wäre ein Duell unentscheidbar (geprüft von datensatzKonsistent()).

export const KATEGORIEN = [
  { id: "geschwindigkeiten", titel: "Geschwindigkeiten", frage: "Was ist schneller?", siEinheit: "m/s" },
  { id: "massen", titel: "Massen", frage: "Was ist schwerer?", siEinheit: "kg" },
  { id: "laengen", titel: "Längen", frage: "Was ist länger bzw. höher?", siEinheit: "m" },
  { id: "energien", titel: "Energien", frage: "Wo steckt mehr Energie?", siEinheit: "J" }
];

export const DATENSATZ = {
  geschwindigkeiten: [ // siWert in m/s
    { name: "Weinbergschnecke", siWert: 0.001, anzeige: "≈ 0,001 m/s (3,6 m pro Stunde)" },
    { name: "Fußgänger", siWert: 1.4, anzeige: "≈ 1,4 m/s (5 km/h)" },
    { name: "100-m-Sprinter (Renndurchschnitt)", siWert: 10, anzeige: "≈ 10 m/s (36 km/h)" },
    { name: "Radprofi im Flachen", siWert: 12.5, anzeige: "≈ 12,5 m/s (45 km/h)" },
    { name: "Brieftaube", siWert: 22, anzeige: "≈ 22 m/s (80 km/h)" },
    { name: "Gepard im Spurt", siWert: 30, anzeige: "≈ 30 m/s (110 km/h)" },
    { name: "Auto auf der Autobahn", siWert: 36, anzeige: "≈ 36 m/s (130 km/h)" },
    { name: "ICE bei Höchsttempo", siWert: 83, anzeige: "≈ 83 m/s (300 km/h)" },
    { name: "Wanderfalke im Sturzflug", siWert: 90, anzeige: "≈ 90 m/s (320 km/h)" },
    { name: "Verkehrsflugzeug im Reiseflug", siWert: 250, anzeige: "≈ 250 m/s (900 km/h)" },
    { name: "Schall in Luft", siWert: 340, anzeige: "≈ 340 m/s (1 230 km/h)" },
    { name: "Erdoberfläche am Äquator (Erddrehung)", siWert: 460, anzeige: "≈ 460 m/s (1 670 km/h)" },
    { name: "ISS in der Umlaufbahn", siWert: 7700, anzeige: "≈ 7 700 m/s (28 000 km/h)" },
    { name: "Erde auf ihrer Bahn um die Sonne", siWert: 30000, anzeige: "≈ 30 000 m/s (30 km/s)" },
    { name: "Licht im Vakuum", siWert: 3e8, anzeige: "≈ 300 000 000 m/s (300 000 km/s)" }
  ],
  massen: [ // siWert in kg
    { name: "Stechmücke", siWert: 2e-6, anzeige: "≈ 2 mg" },
    { name: "Reiskorn", siWert: 2.5e-5, anzeige: "≈ 25 mg" },
    { name: "Streichholz", siWert: 1e-4, anzeige: "≈ 0,1 g" },
    { name: "Rosine", siWert: 5e-4, anzeige: "≈ 0,5 g" },
    { name: "Büroklammer", siWert: 1e-3, anzeige: "≈ 1 g" },
    { name: "1-Cent-Münze", siWert: 2.3e-3, anzeige: "≈ 2,3 g" },
    { name: "1-Euro-Münze", siWert: 7.5e-3, anzeige: "≈ 7,5 g" },
    { name: "AA-Batterie", siWert: 2.5e-2, anzeige: "≈ 25 g" },
    { name: "Hühnerei", siWert: 6e-2, anzeige: "≈ 60 g" },
    { name: "Apfel", siWert: 0.16, anzeige: "≈ 160 g" },
    { name: "Fußball", siWert: 0.45, anzeige: "≈ 450 g", tag: "genormt" },
    { name: "1 Liter Wasser", siWert: 1, anzeige: "≈ 1 kg" },
    { name: "Ziegelstein", siWert: 2.5, anzeige: "≈ 2,5 kg" },
    { name: "Hauskatze", siWert: 4.5, anzeige: "≈ 4,5 kg" },
    { name: "Fahrrad", siWert: 12, anzeige: "≈ 12 kg" },
    { name: "Sack Zement", siWert: 25, anzeige: "≈ 25 kg" },
    { name: "Erwachsener Mensch", siWert: 75, anzeige: "≈ 75 kg" },
    { name: "Klavier", siWert: 250, anzeige: "≈ 250 kg" },
    { name: "Kleinwagen", siWert: 1000, anzeige: "≈ 1 t (1 000 kg)" },
    { name: "Nilpferd", siWert: 2500, anzeige: "≈ 2,5 t" },
    { name: "Afrikanischer Elefant", siWert: 5000, anzeige: "≈ 5 t" },
    { name: "Stadtbus (leer)", siWert: 12000, anzeige: "≈ 12 t" },
    { name: "Sattelschlepper (beladen)", siWert: 40000, anzeige: "≈ 40 t" },
    { name: "Blauwal", siWert: 150000, anzeige: "≈ 150 t (150 000 kg)" }
  ],
  laengen: [ // siWert in m
    { name: "Menschliches Haar (Durchmesser)", siWert: 7e-5, anzeige: "≈ 0,07 mm" },
    { name: "Salzkorn", siWert: 3e-4, anzeige: "≈ 0,3 mm" },
    { name: "Ameise", siWert: 8e-3, anzeige: "≈ 8 mm" },
    { name: "1-Cent-Münze (Durchmesser)", siWert: 1.6e-2, anzeige: "≈ 16 mm" },
    { name: "DIN-A4-Blatt (lange Seite)", siWert: 0.297, anzeige: "29,7 cm", tag: "genormt" },
    { name: "Zimmertür (Höhe)", siWert: 2, anzeige: "≈ 2 m" },
    { name: "Klassenzimmer (Länge)", siWert: 9, anzeige: "≈ 9 m" },
    { name: "Schwimmbahn im Sportbad", siWert: 25, anzeige: "25 m", tag: "genormt" },
    { name: "Fußballplatz (Länge)", siWert: 105, anzeige: "≈ 105 m" },
    { name: "Eiffelturm (Höhe)", siWert: 330, anzeige: "≈ 330 m" },
    { name: "Zugspitze (Höhe über dem Meer)", siWert: 2962, anzeige: "≈ 2 962 m" },
    { name: "Marathonstrecke", siWert: 42195, anzeige: "42,195 km", tag: "festgelegte Distanz" },
    { name: "Deutschland (Nord-Süd-Ausdehnung)", siWert: 876000, anzeige: "≈ 880 km" },
    { name: "Erde (Durchmesser)", siWert: 1.27e7, anzeige: "≈ 12 700 km" },
    { name: "Erde (Umfang am Äquator)", siWert: 4e7, anzeige: "≈ 40 000 km" }
  ],
  energien: [ // siWert in J
    { name: "Apfel um 1 m anheben (Hubarbeit)", siWert: 1, anzeige: "≈ 1 J" },
    { name: "Fußball beim Torschuss (Bewegungsenergie)", siWert: 170, anzeige: "≈ 170 J" },
    { name: "Ein Klimmzug (Hubarbeit)", siWert: 370, anzeige: "≈ 370 J" },
    { name: "AA-Batterie (gespeicherte Energie)", siWert: 1.3e4, anzeige: "≈ 13 kJ" },
    { name: "Smartphone-Akku (voll geladen)", siWert: 4.3e4, anzeige: "≈ 43 kJ (12 Wh)" },
    { name: "1 Liter Wasser aufkochen (20 °C → 100 °C)", siWert: 3.3e5, anzeige: "≈ 330 kJ" },
    { name: "Auto bei 100 km/h (Bewegungsenergie)", siWert: 5e5, anzeige: "≈ 500 kJ" },
    { name: "Tafel Schokolade (Brennwert)", siWert: 2.3e6, anzeige: "≈ 2 300 kJ (550 kcal)" },
    { name: "1 Kilowattstunde Strom", siWert: 3.6e6, anzeige: "3,6 MJ (= 1 kWh)", tag: "Definitionswert" },
    { name: "Tagesbedarf eines Menschen (Nahrung)", siWert: 1e7, anzeige: "≈ 10 MJ (2 400 kcal)" },
    { name: "1 Liter Benzin (Brennwert)", siWert: 3.2e7, anzeige: "≈ 32 MJ" },
    { name: "Blitzschlag", siWert: 5e9, anzeige: "≈ 5 GJ" },
    { name: "Jahres-Stromverbrauch einer Familie", siWert: 1.1e10, anzeige: "≈ 11 GJ (3 000 kWh)" }
  ]
};

// ---------- Reine Logik (ohne DOM, in Node testbar) ----------

// Prüft den Datensatz: jedes Objekt braucht name, siWert > 0 und anzeige;
// innerhalb einer Kategorie darf kein siWert doppelt vorkommen (sonst wäre
// ein Duell unentscheidbar). Liefert { ok, fehler[] }.
export function datensatzKonsistent(datensatz = DATENSATZ) {
  const fehler = [];
  const kategorien = Object.keys(datensatz);
  if (kategorien.length < 4) fehler.push("Weniger als 4 Kategorien.");
  let gesamt = 0;
  for (const k of kategorien) {
    const liste = datensatz[k];
    if (!Array.isArray(liste)) { fehler.push(`Kategorie ${k}: keine Liste.`); continue; }
    if (liste.length < 12) fehler.push(`Kategorie ${k}: nur ${liste.length} Objekte (mindestens 12).`);
    const gesehen = new Map();
    liste.forEach((o, i) => {
      if (!o || typeof o.name !== "string" || !o.name.trim()) fehler.push(`${k}[${i}]: name fehlt oder leer.`);
      if (typeof o.siWert !== "number" || !Number.isFinite(o.siWert) || o.siWert <= 0)
        fehler.push(`${k}[${i}] (${o && o.name}): siWert muss eine Zahl > 0 sein.`);
      if (typeof o.anzeige !== "string" || !o.anzeige.trim()) fehler.push(`${k}[${i}] (${o && o.name}): anzeige fehlt oder leer.`);
      if (gesehen.has(o.siWert))
        fehler.push(`${k}: gleicher siWert ${o.siWert} bei „${gesehen.get(o.siWert)}“ und „${o.name}“ — Duell unentscheidbar.`);
      gesehen.set(o.siWert, o && o.name);
    });
    gesamt += liste.length;
  }
  if (gesamt < 48) fehler.push(`Nur ${gesamt} Objekte insgesamt (mindestens 48).`);
  return { ok: fehler.length === 0, fehler };
}

// Vergleich zweier Objekte: 1 wenn a den größeren siWert hat, −1 wenn kleiner, 0 bei Gleichstand.
export function vergleiche(a, b) {
  if (a.siWert > b.siWert) return 1;
  if (a.siWert < b.siWert) return -1;
  return 0;
}

// Punkte für ein Duell: 100 je Treffer; „serie“ ist die Länge der aktuellen
// Trefferserie einschließlich dieses Treffers — ab 3 gibt es +25 Bonus.
export function punkteFuerDuell(richtig, serie) {
  if (!richtig) return 0;
  return 100 + (serie >= 3 ? 25 : 0);
}

// Zieht ein zufälliges Paar zweier verschiedener Objekte einer Kategorie.
// „verbraucht“ (Set von Schlüsseln "i-j") verhindert, dass dieselbe Paarung
// in einer Runde doppelt vorkommt. Liefert { links, rechts, schluessel }
// in zufälliger Seiten-Reihenfolge — oder null, wenn alle Paare verbraucht sind.
// Mutiert „verbraucht“ nicht; der Aufrufer trägt den Schlüssel selbst ein.
// Gewicht für die Paarauswahl: bevorzugt Paare, die etwa eine Größenordnung
// auseinanderliegen (Maximum bei Faktor ≈ 10). So werden triviale Riesen-Abstände
// (z. B. Mücke gegen Wal) und mehrdeutig dichte Paare seltener gezogen — es ist
// echtes Größenordnungs-Schätzen nötig statt offensichtlicher Vergleiche.
export function naehe(a, b) {
  const d = Math.abs(Math.log10(a) - Math.log10(b)); // Abstand in Größenordnungen
  return Math.exp(-((d - 1) * (d - 1)) / (2 * 0.8 * 0.8));
}

export function ziehePaar(kategorie, rng = Math.random, verbraucht = new Set()) {
  const objekte = DATENSATZ[kategorie];
  if (!objekte) throw new Error("Unbekannte Kategorie: " + kategorie);
  const frei = [];
  for (let i = 0; i < objekte.length; i++)
    for (let j = i + 1; j < objekte.length; j++) {
      const schluessel = i + "-" + j;
      if (!verbraucht.has(schluessel)) frei.push({ i, j, schluessel });
    }
  if (!frei.length) return null;
  let summe = 0;
  const gew = frei.map(fp => { const w = naehe(objekte[fp.i].siWert, objekte[fp.j].siWert); summe += w; return w; });
  let ziel = rng() * summe, idx = 0;
  while (idx < gew.length - 1 && (ziel -= gew[idx]) > 0) idx++;
  const p = frei[idx];
  const getauscht = rng() < 0.5;
  return {
    links: objekte[getauscht ? p.j : p.i],
    rechts: objekte[getauscht ? p.i : p.j],
    schluessel: p.schluessel
  };
}

// ---------- Spiel (läuft nur im Browser) ----------

export function starte(api) {
  const f = api.flaeche;
  let kategorie = null, paar = null, verbraucht = new Set();
  let nummer = 0, punkte = 0, serie = 0, besteSerie = 0, treffer = 0;
  let zustand = "wahl"; // "wahl" | "tippen" | "aufgedeckt" | "fertig"
  let links, rechts, feedback, fortschritt, serieEl, weiter;

  function zeigeKategoriewahl() {
    zustand = "wahl";
    punkte = 0;
    api.setzePunkte(0);
    f.innerHTML = `
      <div class="gd-katwahl">
        <h2>Wähle eine Kategorie</h2>
        <div class="gd-kats">
          ${KATEGORIEN.map(k => `
            <button type="button" class="gd-katknopf" data-kat="${k.id}">
              <b>${k.titel}</b>
              <span>${k.frage} (${DATENSATZ[k.id].length} Objekte)</span>
            </button>`).join("")}
        </div>
        <p class="gd-hinweis">10 Duelle pro Runde · +100 Punkte pro Treffer · ab 3 Treffern in Serie +25 Bonus.</p>
      </div>`;
    f.querySelectorAll(".gd-katknopf").forEach(k =>
      k.addEventListener("click", () => starteRunde(k.dataset.kat)));
  }

  function karteHtml(id, taste) {
    return `
      <button type="button" class="gd-karte" id="${id}">
        <kbd aria-hidden="true">${taste}</kbd>
        <span class="gd-symbol" aria-hidden="true"></span>
        <span class="gd-name"></span>
        <span class="gd-wert" hidden></span>
        <span class="gd-tag" hidden></span>
      </button>`;
  }

  function starteRunde(katId) {
    kategorie = KATEGORIEN.find(k => k.id === katId);
    verbraucht = new Set();
    nummer = 0; punkte = 0; serie = 0; besteSerie = 0; treffer = 0;
    api.setzePunkte(0);
    f.innerHTML = `
      <div class="gd-wrap">
        <div class="gd-status"><span id="gd-fortschritt"></span><span>${kategorie.titel}</span><span id="gd-serie"></span></div>
        <p class="gd-frage">${kategorie.frage}</p>
        <div class="gd-karten">${karteHtml("gd-links", "A")}${karteHtml("gd-rechts", "L")}</div>
        <p class="gd-feedback" id="gd-feedback" role="status" aria-live="polite"></p>
        <div class="gd-aktionen"><button type="button" class="knopf" id="gd-weiter" hidden>Weiter</button></div>
        <p class="gd-quelle">Alle Angaben sind gerundete Schätzwerte (≈) für den Größenvergleich — keine Messwerte.</p>
      </div>`;
    links = f.querySelector("#gd-links");
    rechts = f.querySelector("#gd-rechts");
    feedback = f.querySelector("#gd-feedback");
    fortschritt = f.querySelector("#gd-fortschritt");
    serieEl = f.querySelector("#gd-serie");
    weiter = f.querySelector("#gd-weiter");
    links.addEventListener("click", () => waehle("links"));
    rechts.addEventListener("click", () => waehle("rechts"));
    weiter.addEventListener("click", naechstesDuell);
    naechstesDuell();
  }

  function fuelleKarte(knopf, objekt) {
    knopf.disabled = false;
    knopf.classList.remove("gd-richtig", "gd-falsch");
    knopf.querySelector(".gd-symbol").textContent = "";
    knopf.querySelector(".gd-name").textContent = objekt.name;
    const wert = knopf.querySelector(".gd-wert");
    wert.textContent = objekt.anzeige; wert.hidden = true;
    const tag = knopf.querySelector(".gd-tag");
    tag.textContent = objekt.tag || "Schätzwert"; tag.hidden = true;
  }

  function naechstesDuell() {
    if (zustand !== "aufgedeckt" && nummer > 0) return; // Doppel-Klicks abfangen
    nummer++;
    if (nummer > DUELLE_JE_RUNDE) { rundeVorbei(); return; }
    paar = ziehePaar(kategorie.id, Math.random, verbraucht);
    if (!paar) { rundeVorbei(); return; } // Sicherheitsnetz, praktisch unerreichbar
    verbraucht.add(paar.schluessel);
    zustand = "tippen";
    fortschritt.textContent = `Duell ${nummer} von ${DUELLE_JE_RUNDE}`;
    serieEl.textContent = serie >= 2 ? `Serie: ${serie}` : "";
    feedback.textContent = "";
    weiter.hidden = true;
    fuelleKarte(links, paar.links);
    fuelleKarte(rechts, paar.rechts);
    f.focus({ preventScroll: true });
  }

  function waehle(seite) {
    if (zustand !== "tippen") return;
    zustand = "aufgedeckt";
    const gewaehlt = seite === "links" ? paar.links : paar.rechts;
    const anderes = seite === "links" ? paar.rechts : paar.links;
    const richtig = vergleiche(gewaehlt, anderes) > 0;
    const gewinner = vergleiche(paar.links, paar.rechts) > 0 ? paar.links : paar.rechts;
    serie = richtig ? serie + 1 : 0;
    besteSerie = Math.max(besteSerie, serie);
    const p = punkteFuerDuell(richtig, serie);
    punkte += p;
    if (richtig) treffer++;
    api.setzePunkte(punkte);

    // Steckbriefe aufdecken (Werte mit Einheiten + Schätzwert-Hinweis)
    for (const [knopf, objekt] of [[links, paar.links], [rechts, paar.rechts]]) {
      knopf.disabled = true;
      knopf.querySelector(".gd-wert").hidden = false;
      knopf.querySelector(".gd-tag").hidden = false;
      if (objekt === gewinner) {
        knopf.classList.add("gd-richtig");
        knopf.querySelector(".gd-symbol").textContent = "✓";
      }
    }
    if (!richtig) {
      const falschKnopf = seite === "links" ? links : rechts;
      falschKnopf.classList.add("gd-falsch");
      falschKnopf.querySelector(".gd-symbol").textContent = "✗";
    }

    feedback.textContent = richtig
      ? `✓ Richtig! Vorn liegt: ${gewinner.name} (+${p} Punkte${serie >= 3 ? " mit Serien-Bonus" : ""}).`
      : `✗ Leider nein — vorn liegt: ${gewinner.name}. Die Serie beginnt neu.`;
    serieEl.textContent = serie >= 2 ? `Serie: ${serie}` : "";
    weiter.textContent = nummer >= DUELLE_JE_RUNDE ? "Zum Ergebnis" : "Weiter";
    weiter.hidden = false;
    weiter.focus();
  }

  function rundeVorbei() {
    zustand = "fertig";
    if (weiter) weiter.hidden = true;
    api.vorbei(punkte, `
      <p>${kategorie.titel}: ${treffer} von ${DUELLE_JE_RUNDE} Duellen richtig · längste Serie: ${besteSerie}.</p>
      <p>${treffer >= 8 ? "Du schätzt schon wie ein Profi — nimm dir die nächste Kategorie vor!"
        : "Merke dir ein paar Ankerwerte (Fußgänger 5 km/h, 1 Liter Wasser 1 kg) — dann klappt es noch besser."}</p>`);
  }

  // Tastatur: A = linke Karte, L = rechte Karte (zusätzlich Pfeile);
  // Enter auf der Spielfläche blättert nach dem Aufdecken weiter.
  api.tasten(ev => {
    const taste = ev.key.toLowerCase();
    if (zustand === "tippen") {
      if (taste === "a" || ev.key === "ArrowLeft") waehle("links");
      else if (taste === "l" || ev.key === "ArrowRight") waehle("rechts");
    } else if (zustand === "aufgedeckt" && ev.key === "Enter" && ev.target === f) {
      naechstesDuell();
    }
  });

  api.neustartCb(zeigeKategoriewahl);
  zeigeKategoriewahl();
}

// ---------- Selbsttest (läuft in Node: node --input-type=module …) ----------

export function selbsttest() {
  const ergebnisse = [];
  const pruefe = (name, ok, info = "") => ergebnisse.push({ name, ok: !!ok, info: ok ? "" : info });
  const lcg = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const hole = (kat, name) => DATENSATZ[kat].find(o => o.name === name);

  // Datensatz: konsistent und groß genug
  const k = datensatzKonsistent();
  pruefe("Datensatz: konsistent (name, siWert > 0, anzeige, keine doppelten siWert)", k.ok, k.fehler.join(" | "));
  const gesamt = KATEGORIEN.reduce((s, kat) => s + DATENSATZ[kat.id].length, 0);
  pruefe("Datensatz: 4 Kategorien, je ≥ 12 Objekte, gesamt ≥ 48",
    KATEGORIEN.length === 4 && KATEGORIEN.every(kat => DATENSATZ[kat.id].length >= 12) && gesamt >= 48,
    `gesamt=${gesamt}`);

  // Negativtests: datensatzKonsistent erkennt kaputte Daten
  const kunst = n => Array.from({ length: n }, (_, i) => ({ name: "Objekt " + (i + 1), siWert: i + 1, anzeige: "≈ " + (i + 1) }));
  {
    const defekt = { a: kunst(12), b: kunst(12), c: kunst(12), d: kunst(12) };
    defekt.a[11] = { name: "Doppelgänger", siWert: 5, anzeige: "≈ 5" };
    const r = datensatzKonsistent(defekt);
    pruefe("datensatzKonsistent: erkennt doppelten siWert (unentscheidbares Duell)",
      !r.ok && r.fehler.some(t => t.includes("gleicher siWert")));
  }
  {
    const defekt = { a: kunst(12), b: kunst(12), c: kunst(12), d: kunst(12) };
    defekt.b[0] = { name: "Nullinger", siWert: 0, anzeige: "0" };
    const r = datensatzKonsistent(defekt);
    pruefe("datensatzKonsistent: erkennt siWert ≤ 0", !r.ok && r.fehler.some(t => t.includes("siWert")));
  }
  {
    const defekt = { a: kunst(12), b: kunst(12), c: kunst(12), d: kunst(12) };
    defekt.c[3] = { name: "", siWert: 99.5, anzeige: "≈ 99,5" };
    const r = datensatzKonsistent(defekt);
    pruefe("datensatzKonsistent: erkennt fehlenden Namen", !r.ok && r.fehler.some(t => t.includes("name")));
  }

  // vergleiche: bekannte Paare aus dem echten Datensatz
  pruefe("vergleiche: Licht schneller als Schnecke, Mücke leichter als Blauwal, Gleichstand = 0",
    vergleiche(hole("geschwindigkeiten", "Licht im Vakuum"), hole("geschwindigkeiten", "Weinbergschnecke")) === 1 &&
    vergleiche(hole("massen", "Stechmücke"), hole("massen", "Blauwal")) === -1 &&
    vergleiche(hole("laengen", "Eiffelturm (Höhe)"), hole("laengen", "Eiffelturm (Höhe)")) === 0 &&
    vergleiche(hole("energien", "Blitzschlag"), hole("energien", "Jahres-Stromverbrauch einer Familie")) === -1);

  // ziehePaar: je Kategorie 20 Runden × 10 Züge = 200 Ziehungen kollisionsfrei
  {
    let ok = true, info = "";
    KATEGORIEN.forEach((kat, idx) => {
      const rng = lcg(4242 + idx);
      for (let runde = 0; runde < 20 && ok; runde++) {
        const benutzt = new Set();
        for (let zug = 0; zug < 10 && ok; zug++) {
          const p = ziehePaar(kat.id, rng, benutzt);
          if (!p) { ok = false; info = kat.id + ": kein Paar mehr"; break; }
          if (p.links === p.rechts) { ok = false; info = kat.id + ": Objekt gegen sich selbst"; }
          if (p.links.siWert === p.rechts.siWert) { ok = false; info = kat.id + ": unentscheidbares Paar"; }
          if (benutzt.has(p.schluessel)) { ok = false; info = kat.id + ": Paarung doppelt in einer Runde"; }
          if (!DATENSATZ[kat.id].includes(p.links) || !DATENSATZ[kat.id].includes(p.rechts)) {
            ok = false; info = kat.id + ": Objekt aus fremder Kategorie";
          }
          benutzt.add(p.schluessel);
        }
      }
    });
    pruefe("ziehePaar: 4 × 200 Ziehungen ohne doppelte Paarung innerhalb einer Runde", ok, info);
  }

  // ziehePaar: vollständig verbrauchte Kategorie liefert null
  {
    const n = DATENSATZ.massen.length;
    const alle = new Set();
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) alle.add(i + "-" + j);
    pruefe("ziehePaar: liefert null, wenn alle Paarungen verbraucht sind",
      ziehePaar("massen", lcg(7), alle) === null);
  }

  // ziehePaar: unbekannte Kategorie löst Fehler aus
  {
    let wirft = false;
    try { ziehePaar("quark", lcg(1), new Set()); } catch (_f) { wirft = true; }
    pruefe("ziehePaar: unbekannte Kategorie löst Fehler aus", wirft);
  }

  // punkteFuerDuell: Grundpunkte, Serienbonus, Fehlversuch
  pruefe("punkteFuerDuell: 100 (Serie 1–2), 125 (Serie ≥ 3), 0 bei Fehler",
    punkteFuerDuell(true, 1) === 100 && punkteFuerDuell(true, 2) === 100 &&
    punkteFuerDuell(true, 3) === 125 && punkteFuerDuell(true, 9) === 125 &&
    punkteFuerDuell(false, 4) === 0 && punkteFuerDuell(false, 0) === 0);

  return { ok: ergebnisse.every(e => e.ok), ergebnisse };
}
