// spiel.js — Fakt oder Fake (Pausenraum, Beamermodus). Team-Spiel, von vorn moderiert:
// Eine Aussage erscheint groß auf der Tafel, die Teams stimmen offline ab (Handzeichen),
// ob sie wahr (Fakt) oder erfunden (Fake) ist. Die Moderation löst auf und vergibt
// Punkte. Läuft im Beamer-Rahmen (assets/js/spiel/beamer.js). Reine Logik
// (mischeAussagen, sieger) ist exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-fakt-oder-fake",
  titel: "Fakt oder Fake",
  kurz: "Aussage groß auf der Tafel — die Teams stimmen ab: wahr oder erfunden? Auflösen mit Erklärung, Punkte laufen mit.",
  kategorie: "klasse"
};

const DATEN_URL = new URL("../../daten/pausenraum/fakt-oder-fake.json", import.meta.url);

// rein/testbar: Aussagen in zufälliger Reihenfolge (optional mit eigenem RNG); Original bleibt unverändert
export function mischeAussagen(aussagen, rng = Math.random) {
  const a = aussagen.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// rein/testbar: Indizes der Teams mit Höchstpunktzahl (mehrere bei Gleichstand)
export function sieger(staende) {
  if (!staende || !staende.length) return [];
  const max = Math.max(...staende);
  return staende.map((p, i) => (p === max ? i : -1)).filter(i => i >= 0);
}

export async function starte(api) {
  const { buehne, el } = api;
  let daten;
  try { daten = await (await fetch(DATEN_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Aussagen konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  const alle = Array.isArray(daten.aussagen) ? daten.aussagen : [];
  if (!alle.length) { buehne.innerHTML = `<p class="bm-info">Es sind keine Aussagen vorhanden.</p>`; return; }

  const cfg = { teams: 2 };
  let teams = null, reihenfolge = [], pos = 0, aufgeloest = false;

  zeigeSetup();

  function neuesSpiel() {
    teams = api.baueTeams(Array.from({ length: cfg.teams }, (_, i) => "Team " + (i + 1)));
    reihenfolge = mischeAussagen(alle);
    pos = 0;
  }
  function kopfTeams() { return teams.el; }
  function aktuelle() { return reihenfolge[pos]; }

  function zeigeSetup() {
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Fakt oder Fake — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Teams</span><div class="bm-wahl" id="ff-teams">
          ${[2, 3, 4].map(n => chip(n + " Teams", `data-teams="${n}"`, cfg.teams === n)).join("")}</div></div>
        <p class="bm-info">Eine Aussage erscheint groß auf der Tafel. Jedes Team berät sich und stimmt <strong>offline</strong> per Handzeichen ab — z. B. Daumen hoch für <strong>Fakt</strong> (wahr), Daumen runter für <strong>Fake</strong> (erfunden). Mit <strong>„Auflösen"</strong> zeigt die Tafel die Wahrheit samt Erklärung — danach gibst du jedem richtigen Team einen Punkt.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="ff-los">Los geht's</button></div>
      </div>`;
    buehne.querySelectorAll("#ff-teams .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg.teams = Number(b.dataset.teams);
      buehne.querySelectorAll("#ff-teams .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    buehne.querySelector("#ff-los").addEventListener("click", () => { neuesSpiel(); zeigeAussage(); });
  }

  function zeigeAussage() {
    aufgeloest = false;
    const a = aktuelle();
    buehne.innerHTML = "";
    buehne.append(kopfTeams());

    const fortschritt = el(`<div class="bm-info">Aussage ${pos + 1} von ${reihenfolge.length}</div>`);
    const text = el(`<div class="bm-frage-text">${a.text}</div>`);
    const wahl = el(`<div class="bm-optionen">
      <div class="bm-option"><span class="bm-option-marke">✓</span><span class="bm-option-text">Fakt — das stimmt</span></div>
      <div class="bm-option"><span class="bm-option-marke">✗</span><span class="bm-option-text">Fake — erfunden</span></div>
    </div>`);
    const bereich = el(`<div class="bm-wort"></div>`);
    bereich.append(fortschritt, text, wahl);
    buehne.append(bereich);

    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="ff-aufloesen">Auflösen</button>
      <button type="button" class="knopf zweitrangig" id="ff-ende">Spiel beenden</button></div>`);
    buehne.append(knoepfe);
    knoepfe.querySelector("#ff-aufloesen").addEventListener("click", () => aufloesen(wahl, a));
    knoepfe.querySelector("#ff-ende").addEventListener("click", zeigeEndstand);
  }

  function aufloesen(wahl, a) {
    if (aufgeloest) return;
    aufgeloest = true;
    // Die zutreffende Wahl hervorheben, die andere abdunkeln.
    const optionen = wahl.querySelectorAll(".bm-option");
    const richtigIdx = a.fakt ? 0 : 1; // 0 = Fakt, 1 = Fake
    optionen.forEach((o, i) => o.classList.add(i === richtigIdx ? "bm-richtig" : "bm-falsch"));

    const urteil = el(`<div class="bm-gross">${a.fakt ? "FAKT ✓ — das stimmt!" : "FAKE ✗ — erfunden!"}</div>`);
    buehne.querySelector(".bm-frage-text")?.insertAdjacentElement("afterend", urteil);
    urteil.insertAdjacentElement("afterend", el(`<div class="bm-info bm-erklaerung">${a.erklaerung || ""}</div>`));

    const letzte = pos >= reihenfolge.length - 1;
    const vergabe = el(`<div class="bm-punkte-vergabe"></div>`);
    vergabe.append(el(`<div class="bm-gross">Punkte für die Teams, die richtig lagen:</div>`));
    const knopfreihe = el(`<div class="bm-knopfzeile"></div>`);
    teams.namen.forEach((name, i) => {
      const b = el(`<button type="button" class="knopf zweitrangig" data-team="${i}">${name} +1</button>`);
      b.addEventListener("click", () => { teams.addiere(i, 1); b.classList.add("bm-vergeben"); });
      knopfreihe.append(b);
    });
    vergabe.append(knopfreihe);
    const weiterReihe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="ff-weiter">${letzte ? "Endstand zeigen 🏁" : "Nächste Aussage"}</button>
      <button type="button" class="knopf zweitrangig" id="ff-ende2">Spiel beenden</button></div>`);
    vergabe.append(weiterReihe);
    buehne.append(vergabe);

    // Alten Auflösen-Knopf entfernen, damit nur noch weiter/beenden bleibt.
    buehne.querySelector("#ff-aufloesen")?.closest(".bm-knopfzeile")?.remove();

    weiterReihe.querySelector("#ff-weiter").addEventListener("click", () => {
      if (letzte) { zeigeEndstand(); }
      else { pos += 1; zeigeAussage(); }
    });
    weiterReihe.querySelector("#ff-ende2").addEventListener("click", zeigeEndstand);
  }

  function zeigeEndstand() {
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
          <button type="button" class="knopf" id="ff-nochmal">Nochmal spielen</button>
          <button type="button" class="knopf zweitrangig" id="ff-neu">Einstellungen ändern</button>
        </div></div>`;
    buehne.querySelector("#ff-nochmal").addEventListener("click", () => { neuesSpiel(); zeigeAussage(); });
    buehne.querySelector("#ff-neu").addEventListener("click", zeigeSetup);
  }
}

// --- Selbsttests (nur Node; im Browser nicht aktiv) ---
export const TESTS = [
  ["mischeAussagen behält alle Elemente und lässt das Original unverändert", () => {
    const f = [{ text: "a" }, { text: "b" }, { text: "c" }];
    const g = mischeAussagen(f, () => 0.5);
    return g.length === 3 && f.every(x => g.includes(x)) && f.length === 3;
  }],
  ["mischeAussagen ist deterministisch bei festem RNG", () => {
    const f = [1, 2, 3, 4, 5].map(n => ({ text: String(n) }));
    const seq = [0.1, 0.9, 0.3, 0.7]; let i = 0; const rng = () => seq[(i++) % seq.length];
    let j = 0; const rng2 = () => seq[(j++) % seq.length];
    const a = mischeAussagen(f, rng).map(x => x.text).join("");
    const b = mischeAussagen(f, rng2).map(x => x.text).join("");
    return a === b;
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
