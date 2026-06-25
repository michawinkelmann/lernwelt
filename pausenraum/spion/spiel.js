// spiel.js — „Wer ist der Spion?“ (Pausenraum, Beamermodus). Spyfall-Mechanik auf
// einem Gerät: Ein Ort wird verteilt, ein bis zwei Spione kennen ihn nicht. Das
// Gerät wird reihum gereicht (private Rollen-Anzeige), danach Diskussion mit
// großem Timer und Abstimmung. Läuft im Beamer-Rahmen (assets/js/spiel/beamer.js).
// Reine Logik (verteileRollen, mische) ist exportiert und in Node testbar —
// DOM wird nur in starte() angefasst.

export const manifest = {
  id: "sp-spion",
  titel: "Wer ist der Spion?",
  kurz: "Ein Ort, ein geheimer Spion: Gerät reihum geben, diskutieren, abstimmen — wer kennt den Ort wirklich nicht?",
  kategorie: "klasse"
};

const ORTE_URL = new URL("../../daten/pausenraum/spion-orte.json", import.meta.url);

// rein/testbar: Fisher-Yates-Mischung (eigener Export, unabhängig vom Beamer-Helfer)
export function mische(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// rein/testbar: verteilt Rollen auf spielerN Personen. Genau spionN bekommen
// "spion", alle übrigen den Ort. Rückgabe: Array length spielerN mit
// { spieler: i+1, rolle: "spion" | ort } in Spielerreihenfolge.
export function verteileRollen(spielerN, spionN, ort, rng = Math.random) {
  const n = Math.max(0, Math.floor(spielerN));
  const spione = Math.max(0, Math.min(Math.floor(spionN), n));
  // Indizes mischen und die ersten `spione` zu Spionen erklären — so ist die
  // Spionzahl exakt und die Verteilung unabhängig von der Anzeigereihenfolge.
  const indizes = mische(Array.from({ length: n }, (_, i) => i), rng);
  const istSpion = new Set(indizes.slice(0, spione));
  return Array.from({ length: n }, (_, i) => ({
    spieler: i + 1,
    rolle: istSpion.has(i) ? "spion" : ort
  }));
}

// rein/testbar: Indizes der Personen mit den meisten Stimmen (kann Gleichstand sein)
export function meisteStimmen(stimmen) {
  if (!stimmen.length) return [];
  const max = Math.max(...stimmen);
  if (max <= 0) return [];
  return stimmen.map((s, i) => (s === max ? i : -1)).filter(i => i >= 0);
}

const SPION_TEXT = "Du bist Spion! 🕵️ — errate den Ort und bleib unentdeckt.";

// --- Selbsttests (Node-testbar) ---
export const TESTS = [
  function spionzahlExakt() {
    const r = verteileRollen(7, 2, "Schwimmbad");
    const s = r.filter(x => x.rolle === "spion").length;
    if (s !== 2) throw new Error("Spionzahl falsch: " + s + " statt 2");
  },
  function laengeStimmt() {
    const r = verteileRollen(6, 1, "Zirkus");
    if (r.length !== 6) throw new Error("Länge falsch: " + r.length + " statt 6");
  },
  function ortBeiNichtSpionen() {
    const ort = "Flughafen";
    const r = verteileRollen(8, 2, ort);
    const okOrt = r.filter(x => x.rolle !== "spion").every(x => x.rolle === ort);
    if (!okOrt) throw new Error("Nicht-Spione haben nicht alle den Ort");
    const okSpion = r.filter(x => x.rolle === "spion").every(x => x.rolle === "spion");
    if (!okSpion) throw new Error("Spion-Markierung fehlerhaft");
  },
  function einSpionMinimal() {
    const r = verteileRollen(4, 1, "Kino");
    if (r.filter(x => x.rolle === "spion").length !== 1) throw new Error("Genau 1 Spion erwartet");
    if (r.filter(x => x.rolle === "Kino").length !== 3) throw new Error("3 Nicht-Spione erwartet");
  },
  function spielerNummerierung() {
    const r = verteileRollen(5, 1, "Strand");
    const ok = r.every((x, i) => x.spieler === i + 1);
    if (!ok) throw new Error("Spielernummern nicht 1..n in Reihenfolge");
  },
  function meisteStimmenGrundfall() {
    const g = meisteStimmen([1, 3, 2, 3]);
    if (g.length !== 2 || g[0] !== 1 || g[1] !== 3) throw new Error("meisteStimmen falsch: " + JSON.stringify(g));
  }
];

export async function starte(api) {
  const { buehne, el } = api;
  let daten;
  try { daten = await (await fetch(ORTE_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Orte konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  const orte = Array.isArray(daten.orte) ? daten.orte : [];

  const cfg = { spieler: 5, spione: 1, zeit: 300 };
  let rollen = null;   // [{spieler, rolle}] in Spielerreihenfolge
  let ort = null;      // gewählter Ort dieser Runde
  let timer = null;

  zeigeSetup();

  // --- Phase 1: Einstellungen ---
  function zeigeSetup() {
    if (timer) timer.stopp();
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    const spielerWahl = [4, 5, 6, 7, 8, 9, 10];
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Wer ist der Spion? — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Spieler</span><div class="bm-wahl" id="sp-spieler">
          ${spielerWahl.map(n => chip(n + "", `data-spieler="${n}"`, cfg.spieler === n)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Spione</span><div class="bm-wahl" id="sp-spione">
          ${[1, 2].map(n => chip(n + (n === 1 ? " Spion" : " Spione"), `data-spione="${n}"`, cfg.spione === n)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Diskussionszeit</span><div class="bm-wahl" id="sp-zeit">
          ${[180, 300, 480].map(s => chip(Math.round(s / 60) + " Min", `data-zeit="${s}"`, cfg.zeit === s)).join("")}</div></div>
        <p class="bm-info">Das Spiel wählt zufällig <strong>einen Ort</strong>. Alle außer den Spionen erfahren ihn. Gleich wird das Gerät reihum gereicht — jede Person sieht heimlich ihre Rolle.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="sp-los">Rollen verteilen</button></div>
      </div>`;
    const single = (sel, key) => buehne.querySelectorAll(sel + " .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg[key] = Number(b.dataset[key]);
      buehne.querySelectorAll(sel + " .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
      if (key === "spieler" && cfg.spione > Math.max(1, cfg.spieler - 2)) { cfg.spione = 1; markiere("#sp-spione", "spione"); }
    }));
    const markiere = (sel, key) => buehne.querySelectorAll(sel + " .bm-chip").forEach(x => x.classList.toggle("bm-an", Number(x.dataset[key]) === cfg[key]));
    single("#sp-spieler", "spieler");
    single("#sp-spione", "spione");
    single("#sp-zeit", "zeit");
    buehne.querySelector("#sp-los").addEventListener("click", () => { neueVerteilung(); zeigeWeitergabe(0); });
  }

  function neueVerteilung() {
    ort = orte.length ? api.mischen(orte)[0] : "Schwimmbad";
    rollen = verteileRollen(cfg.spieler, cfg.spione, ort);
  }

  // --- Phase 2: Gerät reihum geben, Rolle privat anzeigen ---
  // i = aktueller Spieler-Index (0-basiert); eigene Reveal-Logik (kein baueGeheim).
  function zeigeWeitergabe(i) {
    if (timer) timer.stopp();
    buehne.innerHTML = "";
    const box = el(`<div class="bm-wort">
      <div class="bm-wort-kat">Rolle ${i + 1} von ${rollen.length}</div>
      <div class="bm-gross">Spieler ${i + 1} — antippen, um deine Rolle zu sehen</div>
      <p class="bm-info">Nimm das Gerät, sodass nur du auf den Bildschirm schaust.</p>
      <div class="bm-knopfzeile"><button type="button" class="knopf" id="sp-zeigen">Rolle ansehen</button></div>
    </div>`);
    buehne.append(box);
    box.querySelector("#sp-zeigen").addEventListener("click", () => zeigeRolle(i));
  }

  function zeigeRolle(i) {
    const eintrag = rollen[i];
    const istSpion = eintrag.rolle === "spion";
    buehne.innerHTML = "";
    const inhalt = istSpion
      ? `<p class="bm-warn">Nur Spieler ${i + 1} schaut!</p><div class="bm-geheim-text">${SPION_TEXT}</div>`
      : `<p class="bm-warn">Nur Spieler ${i + 1} schaut!</p><div class="bm-wort-kat">Geheimer Ort</div><div class="bm-wort-text">${eintrag.rolle}</div>`;
    const letzte = i === rollen.length - 1;
    const box = el(`<div class="bm-wort">
      ${inhalt}
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="sp-weiter">${letzte ? "Verbergen & Diskussion starten" : "Verbergen & weitergeben"}</button>
      </div>
    </div>`);
    buehne.append(box);
    box.querySelector("#sp-weiter").addEventListener("click", () => {
      if (letzte) zeigeDiskussion();
      else zeigeWeitergabe(i + 1);
    });
  }

  // --- Phase 3: Diskussion mit großem Timer ---
  function zeigeDiskussion() {
    if (timer) timer.stopp();
    buehne.innerHTML = "";
    const kopf = el(`<div class="bm-wort"><div class="bm-gross">Diskussion läuft — wer ist der Spion?</div>
      <p class="bm-info">Reihum stellt ihr euch Fragen zum Ort. Wer ihn nicht kennt, muss bluffen. Der Spion versucht, den Ort zu erraten und unentdeckt zu bleiben.</p></div>`);
    buehne.append(kopf);
    timer = api.baueTimer({ sekunden: cfg.zeit, aufEnde: zeigeAbstimmung });
    buehne.append(timer.el);
    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="sp-abstimmen">Abstimmung</button>
      <button type="button" class="knopf zweitrangig" id="sp-neu">Einstellungen ändern</button>
    </div>`);
    buehne.append(knoepfe);
    knoepfe.querySelector("#sp-abstimmen").addEventListener("click", zeigeAbstimmung);
    knoepfe.querySelector("#sp-neu").addEventListener("click", zeigeSetup);
    timer.start();
  }

  // --- Phase 4: Abstimmung (Stimmen pro Person) ---
  function zeigeAbstimmung() {
    if (timer) timer.stopp();
    const stimmen = rollen.map(() => 0);
    buehne.innerHTML = "";
    const kopf = el(`<div class="bm-wort"><div class="bm-gross">Abstimmung: Wer ist der Spion?</div>
      <p class="bm-info">Pro Verdacht eine Stimme vergeben. Danach „Auflösen".</p></div>`);
    buehne.append(kopf);
    const liste = el(`<div class="bm-teams sp-stimmliste"></div>`);
    const zahlEls = rollen.map((_, i) => {
      const karte = el(`<div class="bm-team">
        <span class="bm-team-name">Spieler ${i + 1}</span>
        <span class="bm-team-punkte" data-stimme="${i}">0</span>
        <button type="button" class="knopf zweitrangig sp-plus" data-i="${i}">+ Stimme</button>
      </div>`);
      liste.append(karte);
      return karte.querySelector(".bm-team-punkte");
    });
    buehne.append(liste);
    liste.querySelectorAll(".sp-plus").forEach(b => b.addEventListener("click", () => {
      const i = Number(b.dataset.i);
      stimmen[i] += 1;
      zahlEls[i].textContent = stimmen[i];
    }));
    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="sp-aufloesen">Auflösen</button>
      <button type="button" class="knopf zweitrangig" id="sp-zurueck">Zurück zur Diskussion</button>
    </div>`);
    buehne.append(knoepfe);
    knoepfe.querySelector("#sp-aufloesen").addEventListener("click", () => zeigeAufloesung(stimmen));
    knoepfe.querySelector("#sp-zurueck").addEventListener("click", zeigeDiskussion);
  }

  // --- Phase 5: Auflösung ---
  function zeigeAufloesung(stimmen) {
    if (timer) timer.stopp();
    const spione = rollen.filter(r => r.rolle === "spion").map(r => r.spieler);
    const verdaechtigt = meisteStimmen(stimmen).map(i => i + 1);
    const spionLabel = spione.length === 1 ? "Spieler " + spione[0] : "Spieler " + spione.join(" & ");
    let urteil;
    if (!verdaechtigt.length) urteil = "Es wurde niemand mehrheitlich verdächtigt.";
    else {
      const getroffen = verdaechtigt.filter(s => spione.includes(s));
      const verdLabel = verdaechtigt.length === 1 ? "Spieler " + verdaechtigt[0] : "Spieler " + verdaechtigt.join(" & ");
      urteil = getroffen.length
        ? `Verdacht traf zu: ${verdLabel} — die Gruppe hat ${getroffen.length === spione.length ? "alle Spione" : "einen Spion"} enttarnt! ✓`
        : `Daneben: ${verdLabel} ${verdaechtigt.length === 1 ? "war kein Spion" : "waren keine Spione"} — der Spion bleibt unentdeckt. 🕵️`;
    }
    buehne.innerHTML = `
      <div class="bm-wort">
        <div class="bm-wort-kat">Gesuchter Ort war</div>
        <div class="bm-wort-text">${ort}</div>
        <div class="bm-gross">${spione.length === 1 ? "Der Spion war" : "Die Spione waren"}: ${spionLabel}</div>
        <p class="bm-info">${urteil}</p>
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="sp-nochmal">Neue Runde</button>
          <button type="button" class="knopf zweitrangig" id="sp-neu">Einstellungen ändern</button>
        </div>
      </div>`;
    buehne.querySelector("#sp-nochmal").addEventListener("click", () => { neueVerteilung(); zeigeWeitergabe(0); });
    buehne.querySelector("#sp-neu").addEventListener("click", zeigeSetup);
  }
}
