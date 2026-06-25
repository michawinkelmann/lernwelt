// spiel.js — Tafel-Quiz (Pausenraum, Beamermodus). Team-Quiz, von vorn moderiert:
// Frage groß + vier Optionen A–D auf der digitalen Tafel, Teams antworten offline
// (Handzeichen/Buzzer), die Moderation löst auf und vergibt Punkte. Läuft im
// Beamer-Rahmen (assets/js/spiel/beamer.js). Reine Logik (mischeFragen, istRichtig,
// sieger) ist exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-tafel-quiz",
  titel: "Tafel-Quiz",
  kurz: "Team-Quiz von vorn moderiert: Frage und vier Antworten groß auf der Tafel, die Teams raten — Punkte und Timer laufen mit.",
  kategorie: "klasse"
};

const QUIZ_URL = new URL("../../daten/pausenraum/quiz-allgemein.json", import.meta.url);
const BUCHSTABEN = ["A", "B", "C", "D"];

// rein/testbar: Fragen in zufälliger Reihenfolge (optional mit eigenem RNG)
export function mischeFragen(fragen, rng = Math.random) {
  const a = fragen.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// rein/testbar: Ist die Option idx die richtige Antwort der Frage?
export function istRichtig(frage, idx) {
  return !!frage && Number(idx) === Number(frage.richtig);
}
// rein/testbar: Indizes der Teams mit Höchstpunktzahl
export function sieger(staende) {
  if (!staende || !staende.length) return [];
  const max = Math.max(...staende);
  return staende.map((p, i) => (p === max ? i : -1)).filter(i => i >= 0);
}

export async function starte(api) {
  const { buehne, el } = api;
  let daten;
  try { daten = await (await fetch(QUIZ_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Fragen konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  const fragen = Array.isArray(daten.fragen) ? daten.fragen : [];
  if (!fragen.length) { buehne.innerHTML = `<p class="bm-info">Es sind keine Fragen vorhanden.</p>`; return; }

  // cfg.zeit: 0 = ohne Bedenkzeit, sonst Sekunden
  const cfg = { teams: 2, zeit: 0 };
  let teams = null, reihenfolge = [], pos = 0, timer = null, aufgeloest = false;

  zeigeSetup();

  function neuesQuiz() {
    teams = api.baueTeams(Array.from({ length: cfg.teams }, (_, i) => "Team " + (i + 1)));
    reihenfolge = api.mischen(fragen);
    pos = 0;
  }
  function kopfTeams() { return teams.el; }
  function aktuelleFrage() { return reihenfolge[pos]; }

  function zeigeSetup() {
    if (timer) timer.stopp();
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Tafel-Quiz — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Teams</span><div class="bm-wahl" id="tq-teams">
          ${[2, 3, 4].map(n => chip(n + " Teams", `data-teams="${n}"`, cfg.teams === n)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Bedenkzeit</span><div class="bm-wahl" id="tq-zeit">
          ${chip("aus", `data-zeit="0"`, cfg.zeit === 0)}
          ${chip("20 s", `data-zeit="20"`, cfg.zeit === 20)}
          ${chip("30 s", `data-zeit="30"`, cfg.zeit === 30)}</div></div>
        <p class="bm-info">Die Frage erscheint groß mit den vier Antworten <strong>A–D</strong>. Die Teams beraten sich und antworten <strong>offline</strong> per Handzeichen oder Buzzer. Mit <strong>„Auflösen"</strong> zeigt die Tafel die richtige Antwort — danach gibst du jedem richtigen Team einen Punkt.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="tq-los">Los geht's</button></div>
      </div>`;
    buehne.querySelectorAll("#tq-teams .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg.teams = Number(b.dataset.teams);
      buehne.querySelectorAll("#tq-teams .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    buehne.querySelectorAll("#tq-zeit .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg.zeit = Number(b.dataset.zeit);
      buehne.querySelectorAll("#tq-zeit .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    buehne.querySelector("#tq-los").addEventListener("click", () => { neuesQuiz(); zeigeFrage(); });
  }

  function zeigeFrage() {
    if (timer) timer.stopp();
    aufgeloest = false;
    const frage = aktuelleFrage();
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    if (cfg.zeit > 0) {
      timer = api.baueTimer({ sekunden: cfg.zeit });
      buehne.append(timer.el);
    } else { timer = null; }

    const fortschritt = el(`<div class="bm-info">Frage ${pos + 1} von ${reihenfolge.length}</div>`);
    const frageEl = el(`<div class="bm-frage-text">${frage.frage}</div>`);
    const optionen = el(`<div class="bm-optionen"></div>`);
    frage.optionen.forEach((opt, i) => {
      optionen.append(el(`<div class="bm-option" data-idx="${i}"><span class="bm-option-marke">${BUCHSTABEN[i] || (i + 1)}</span><span class="bm-option-text">${opt}</span></div>`));
    });
    const bereich = el(`<div class="bm-wort"></div>`);
    bereich.append(fortschritt, frageEl, optionen);
    buehne.append(bereich);

    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="tq-aufloesen">Auflösen</button>
      <button type="button" class="knopf zweitrangig" id="tq-ende">Quiz beenden</button></div>`);
    buehne.append(knoepfe);

    if (timer) {
      const startBtn = el(`<button type="button" class="knopf zweitrangig" id="tq-timer">Bedenkzeit starten (${cfg.zeit} s)</button>`);
      knoepfe.insertBefore(startBtn, knoepfe.firstChild);
      startBtn.addEventListener("click", () => { timer.start(); startBtn.disabled = true; });
    }
    knoepfe.querySelector("#tq-aufloesen").addEventListener("click", () => aufloesen(optionen, frage));
    knoepfe.querySelector("#tq-ende").addEventListener("click", zeigeEndstand);
  }

  function aufloesen(optionen, frage) {
    if (aufgeloest) return;
    aufgeloest = true;
    if (timer) timer.stopp();
    optionen.querySelectorAll(".bm-option").forEach(o => {
      const i = Number(o.dataset.idx);
      if (istRichtig(frage, i)) { o.classList.add("bm-richtig"); o.querySelector(".bm-option-marke").textContent = "✓"; }
      else { o.classList.add("bm-falsch"); }
    });

    buehne.querySelector(".bm-frage-text")?.insertAdjacentElement("afterend",
      el(`<div class="bm-info bm-erklaerung">${frage.erklaerung || ""}</div>`));

    const letzte = pos >= reihenfolge.length - 1;
    const punkteZeile = el(`<div class="bm-punkte-vergabe"></div>`);
    punkteZeile.append(el(`<div class="bm-gross">Punkte vergeben:</div>`));
    const knopfreihe = el(`<div class="bm-knopfzeile"></div>`);
    teams.namen.forEach((name, i) => {
      const b = el(`<button type="button" class="knopf zweitrangig" data-team="${i}">${name} +1</button>`);
      b.addEventListener("click", () => { teams.addiere(i, 1); b.classList.add("bm-vergeben"); });
      knopfreihe.append(b);
    });
    punkteZeile.append(knopfreihe);
    const weiterReihe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="tq-weiter">${letzte ? "Endstand zeigen 🏁" : "Nächste Frage"}</button>
      <button type="button" class="knopf zweitrangig" id="tq-ende2">Quiz beenden</button></div>`);
    punkteZeile.append(weiterReihe);
    buehne.append(punkteZeile);

    // Alte Auflösen-/Timer-Knöpfe entfernen, damit nur noch weiter/beenden bleiben.
    buehne.querySelector("#tq-aufloesen")?.closest(".bm-knopfzeile")?.remove();

    weiterReihe.querySelector("#tq-weiter").addEventListener("click", () => {
      if (letzte) { zeigeEndstand(); }
      else { pos += 1; zeigeFrage(); }
    });
    weiterReihe.querySelector("#tq-ende2").addEventListener("click", zeigeEndstand);
  }

  function zeigeEndstand() {
    if (timer) timer.stopp();
    const st = teams.staende(), gew = sieger(st);
    const titel = gew.length === cfg.teams ? "Unentschieden!"
      : gew.length > 1 ? "Gleichstand: " + gew.map(i => teams.namen[i]).join(" & ")
      : teams.namen[gew[0]] + " gewinnt! 🏆";
    const liste = st.map((p, i) => ({ name: teams.namen[i], p })).sort((a, b) => b.p - a.p)
      .map(r => `<div class="bm-team"><span class="bm-team-name">${r.name}</span><span class="bm-team-punkte">${r.p}</span></div>`).join("");
    buehne.innerHTML = `
      <div class="bm-wort">
        <div class="bm-gross">${titel}</div>
        <div class="bm-teams">${liste}</div>
        <div class="bm-knopfzeile">
          <button type="button" class="knopf" id="tq-nochmal">Nochmal spielen</button>
          <button type="button" class="knopf zweitrangig" id="tq-neu">Einstellungen ändern</button>
        </div></div>`;
    buehne.querySelector("#tq-nochmal").addEventListener("click", () => { neuesQuiz(); zeigeFrage(); });
    buehne.querySelector("#tq-neu").addEventListener("click", zeigeSetup);
  }
}

// --- Selbsttests (nur Node; im Browser nicht aktiv) ---
export const TESTS = [
  ["mischeFragen behält alle Elemente", () => {
    const f = [{ frage: "a" }, { frage: "b" }, { frage: "c" }];
    const g = mischeFragen(f, () => 0.5);
    return g.length === 3 && f.every(x => g.includes(x)) && f.length === 3; // Original unverändert
  }],
  ["mischeFragen ist deterministisch bei festem RNG", () => {
    const f = [1, 2, 3, 4, 5].map(n => ({ frage: String(n) }));
    const seq = [0.1, 0.9, 0.3, 0.7]; let i = 0; const rng = () => seq[(i++) % seq.length];
    let j = 0; const rng2 = () => seq[(j++) % seq.length];
    const a = mischeFragen(f, rng).map(x => x.frage).join("");
    const b = mischeFragen(f, rng2).map(x => x.frage).join("");
    return a === b;
  }],
  ["istRichtig erkennt die richtige Option", () => {
    const fr = { frage: "x", optionen: ["A", "B", "C", "D"], richtig: 2 };
    return istRichtig(fr, 2) === true && istRichtig(fr, 0) === false && istRichtig(fr, "2") === true && istRichtig(null, 0) === false;
  }],
  ["sieger findet Höchststand und Gleichstände", () => {
    return JSON.stringify(sieger([3, 5, 1])) === JSON.stringify([1])
      && JSON.stringify(sieger([4, 4, 2])) === JSON.stringify([0, 1])
      && JSON.stringify(sieger([0, 0, 0])) === JSON.stringify([0, 1, 2])
      && JSON.stringify(sieger([])) === JSON.stringify([]);
  }]
];

// Direktstart unter Node: `node --input-type=module` o. import → führt Tests aus.
if (typeof process !== "undefined" && process.argv && /spiel\.js$/.test(process.argv[1] || "")) {
  let ok = 0;
  for (const [name, fn] of TESTS) {
    let bestanden = false; try { bestanden = !!fn(); } catch (e) { bestanden = false; }
    console.log((bestanden ? "✓" : "✗") + " " + name);
    if (bestanden) ok++;
  }
  console.log(ok + "/" + TESTS.length + " Tests bestanden");
  if (ok !== TESTS.length) process.exitCode = 1;
}
