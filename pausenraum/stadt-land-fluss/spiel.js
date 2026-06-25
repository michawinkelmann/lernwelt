// spiel.js — Stadt-Land-Fluss (Pausenraum, Beamermodus). Klassenspiel auf der
// digitalen Tafel: Die Tafel ist Spielleitung — sie zieht einen großen
// Zufallsbuchstaben, zeigt die gewählten Kategorien an und stoppt optional die
// Zeit. Alle füllen auf Papier; aufgelöst und Punkte vergeben wird per Hand.
// Läuft im Beamer-Rahmen (assets/js/spiel/beamer.js). Reine Logik
// (zufallsBuchstabe) ist exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-stadt-land-fluss",
  titel: "Stadt-Land-Fluss",
  kurz: "Die Tafel zieht einen großen Zufallsbuchstaben und zeigt die Kategorien — alle füllen auf Papier, der Countdown läuft groß mit.",
  kategorie: "klasse"
};

const KAT_URL = new URL("../../daten/pausenraum/slf-kategorien.json", import.meta.url);

// rein/testbar: zieht einen Großbuchstaben A–Z, der nicht in `ausgeschlossen` liegt.
// Standardmäßig fallen schwer spielbare Buchstaben (Q, X, Y) weg.
export function zufallsBuchstabe(rng = Math.random, ausgeschlossen = ["Q", "X", "Y"]) {
  const aus = ausgeschlossen.map(b => String(b).toUpperCase());
  const pool = [];
  for (let c = 65; c <= 90; c++) { const b = String.fromCharCode(c); if (!aus.includes(b)) pool.push(b); }
  if (!pool.length) return "A"; // Sicherheitsnetz: niemals alles ausschließen
  return pool[Math.floor(rng() * pool.length)];
}

// Mini-Testfälle für den Node-Selbsttest (kein Browser nötig).
export const TESTS = [
  ["zieht nie einen ausgeschlossenen Buchstaben", () => {
    const aus = ["Q", "X", "Y"];
    for (let i = 0; i < 500; i++) if (aus.includes(zufallsBuchstabe(Math.random, aus))) return false;
    return true;
  }],
  ["liefert immer einen Großbuchstaben A–Z", () => {
    for (let i = 0; i < 500; i++) { const b = zufallsBuchstabe(); if (!/^[A-Z]$/.test(b)) return false; }
    return true;
  }],
  ["respektiert eine eigene Ausschlussliste", () => {
    const aus = ["A", "E", "I", "O", "U"];
    for (let i = 0; i < 300; i++) if (aus.includes(zufallsBuchstabe(Math.random, aus))) return false;
    return true;
  }]
];

export async function starte(api) {
  const { buehne, el } = api;
  let kategorien;
  try { kategorien = (await (await fetch(KAT_URL, { cache: "no-store" })).json()).kategorien; }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Kategorien konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  if (!Array.isArray(kategorien) || !kategorien.length) {
    buehne.innerHTML = `<p class="bm-info">Es sind keine Kategorien hinterlegt.</p>`; return;
  }

  // Standardauswahl: die fünf Klassiker, sofern vorhanden.
  const standard = ["Stadt", "Land", "Fluss", "Tier", "Beruf"].filter(k => kategorien.includes(k));
  const cfg = { zeit: 60, gewaehlt: standard.length ? standard.slice() : kategorien.slice(0, 5) };
  let timer = null, letzter = null, runde = 0;

  zeigeSetup();

  function zeigeSetup() {
    if (timer) timer.stopp();
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Stadt-Land-Fluss — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Kategorien</span><div class="bm-wahl" id="slf-kat">
          ${kategorien.map((k, i) => chip(k, `data-idx="${i}"`, cfg.gewaehlt.includes(k))).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Zeit pro Runde</span><div class="bm-wahl" id="slf-zeit">
          ${[0, 60, 120].map(s => chip(s === 0 ? "ohne Zeit" : s + " s", `data-zeit="${s}"`, cfg.zeit === s)).join("")}</div></div>
        <p class="bm-info">Die Tafel zieht einen großen Buchstaben und zeigt die gewählten Kategorien. Alle füllen ihr Blatt aus. <strong>Auflösen und Punktezählen</strong> macht ihr gemeinsam — die Tafel ist nur die Spielleitung.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="slf-los">Los geht's</button></div>
      </div>`;
    buehne.querySelectorAll("#slf-zeit .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg.zeit = Number(b.dataset.zeit);
      buehne.querySelectorAll("#slf-zeit .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    buehne.querySelectorAll("#slf-kat .bm-chip").forEach(b => b.addEventListener("click", () => {
      const name = kategorien[Number(b.dataset.idx)], i = cfg.gewaehlt.indexOf(name);
      if (i >= 0) { if (cfg.gewaehlt.length > 1) { cfg.gewaehlt.splice(i, 1); b.classList.remove("bm-an"); } }
      else { cfg.gewaehlt.push(name); b.classList.add("bm-an"); }
    }));
    buehne.querySelector("#slf-los").addEventListener("click", () => { runde = 0; zeigeRunde(); });
  }

  // Neuer Buchstabe, möglichst ohne sofortige Wiederholung des letzten.
  function naechsterBuchstabe() {
    const zieh = api.zufallsBuchstabe || zufallsBuchstabe;
    let b = zieh();
    for (let i = 0; i < 8 && b === letzter; i++) b = zieh();
    letzter = b;
    return b;
  }

  function zeigeRunde() {
    if (timer) timer.stopp();
    runde += 1;
    const buchstabe = naechsterBuchstabe();
    buehne.innerHTML = "";

    buehne.append(el(`<div class="bm-info">Runde ${runde}</div>`));

    const buchstabeEl = el(`<div class="bm-wort">
      <div class="bm-wort-kat">Schreibe zu jeder Kategorie ein Wort mit …</div>
      <div class="bm-wort-text" id="slf-buchstabe">${buchstabe}</div>
    </div>`);
    buehne.append(buchstabeEl);

    // Kategorienliste groß und beamer-tauglich (beamer.css bleibt unverändert -> Inline-Stil).
    const liste = cfg.gewaehlt.map(k => `<li style="padding:.1em 0">${k}</li>`).join("");
    buehne.append(el(`<ol class="bm-gross" style="display:flex;flex-wrap:wrap;justify-content:center;gap:.3em 1.4em;list-style:none;margin:0 auto;padding:0;max-width:30ch">${liste}</ol>`));

    const knoepfe = el(`<div class="bm-knopfzeile"></div>`);
    if (cfg.zeit > 0) {
      timer = api.baueTimer({ sekunden: cfg.zeit });
      buehne.insertBefore(timer.el, buchstabeEl);
      const stopp = el(`<button type="button" class="knopf zweitrangig" id="slf-stop">Stopp</button>`);
      knoepfe.append(stopp);
      stopp.addEventListener("click", () => { timer.stopp(); });
      timer.start();
    }
    const naechst = el(`<button type="button" class="knopf" id="slf-naechst">Nächster Buchstabe</button>`);
    const zurueck = el(`<button type="button" class="knopf zweitrangig" id="slf-setup">Einstellungen ändern</button>`);
    knoepfe.append(naechst, zurueck);
    buehne.append(knoepfe);

    naechst.addEventListener("click", zeigeRunde);
    zurueck.addEventListener("click", zeigeSetup);
  }
}
