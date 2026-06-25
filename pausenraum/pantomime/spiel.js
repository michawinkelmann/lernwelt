// spiel.js — Pantomime (Pausenraum, Beamermodus). Klassenspiel auf der digitalen Tafel:
// Begriffe still darstellen, das eigene Team rät. Läuft im Beamer-Rahmen
// (assets/js/spiel/beamer.js). Reine Logik (wortpool, sieger) ist exportiert und
// in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-pantomime",
  titel: "Pantomime",
  kurz: "Begriffe still darstellen, das eigene Team rät — Punkte und Timer groß auf der Tafel.",
  kategorie: "klasse"
};

const DECK_URL = new URL("../../daten/pausenraum/begriffe-allgemein.json", import.meta.url);

// rein/testbar: Wortpool aus den gewählten Kategorien
export function wortpool(kategorien, gewaehlteIds) {
  const pool = [];
  kategorien.forEach(k => { if (gewaehlteIds.includes(k.id)) k.woerter.forEach(w => pool.push({ wort: w, kat: k.name })); });
  return pool;
}
// rein/testbar: Indizes der Teams mit Höchstpunktzahl
export function sieger(staende) {
  const max = Math.max(...staende);
  return staende.map((p, i) => (p === max ? i : -1)).filter(i => i >= 0);
}

export async function starte(api) {
  const { buehne, el } = api;
  let deck;
  try { deck = await (await fetch(DECK_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Begriffe konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  const kategorien = deck.kategorien;
  const cfg = { teams: 2, zeit: 90, gewaehlt: kategorien.map(k => k.id) };
  let teams = null, aktiv = 0, ziehe = null, timer = null, aktuell = null, rundeTreffer = 0;

  zeigeSetup();

  function neueRunde() {
    teams = api.baueTeams(Array.from({ length: cfg.teams }, (_, i) => "Team " + (i + 1)));
    ziehe = api.zieher(wortpool(kategorien, cfg.gewaehlt));
    aktiv = 0;
  }
  function kopfTeams() { teams.setzeAktiv(aktiv); return teams.el; }

  function zeigeSetup() {
    if (timer) timer.stopp();
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Pantomime — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Teams</span><div class="bm-wahl" id="pm-teams">
          ${[2, 3, 4].map(n => chip(n + " Teams", `data-teams="${n}"`, cfg.teams === n)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Zeit pro Runde</span><div class="bm-wahl" id="pm-zeit">
          ${[60, 90, 120].map(s => chip(s + " s", `data-zeit="${s}"`, cfg.zeit === s)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Kategorien</span><div class="bm-wahl" id="pm-kat">
          ${kategorien.map(k => chip(k.name, `data-kat="${k.id}"`, cfg.gewaehlt.includes(k.id))).join("")}</div></div>
        <p class="bm-info">Eine Person pro Team dreht der Tafel den Rücken zu. Das Team stellt den Begriff <strong>stumm</strong> dar (keine Worte, keine Geräusche, kein Zeigen auf echte Dinge) — die ratende Person ruft ihn. Pro Treffer 1 Punkt.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="pm-los">Los geht's</button></div>
      </div>`;
    const single = (sel, key) => buehne.querySelectorAll(sel + " .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg[key] = Number(b.dataset[key]);
      buehne.querySelectorAll(sel + " .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    single("#pm-teams", "teams");
    single("#pm-zeit", "zeit");
    buehne.querySelectorAll("#pm-kat .bm-chip").forEach(b => b.addEventListener("click", () => {
      const id = b.dataset.kat, i = cfg.gewaehlt.indexOf(id);
      if (i >= 0) { if (cfg.gewaehlt.length > 1) { cfg.gewaehlt.splice(i, 1); b.classList.remove("bm-an"); } }
      else { cfg.gewaehlt.push(id); b.classList.add("bm-an"); }
    }));
    buehne.querySelector("#pm-los").addEventListener("click", () => { neueRunde(); zeigeVorRunde(); });
  }

  function zeigeVorRunde() {
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const box = el(`<div class="bm-wort">
      <div class="bm-gross">${teams.namen[aktiv]} ist dran</div>
      <p class="bm-info">Eine Person aus ${teams.namen[aktiv]} dreht sich von der Tafel weg. Bereit? Dann Runde starten — die Zeit läuft.</p>
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="pm-start">Runde starten (${cfg.zeit} s)</button>
        <button type="button" class="knopf zweitrangig" id="pm-ende">Spiel beenden</button>
      </div></div>`);
    buehne.append(box);
    box.querySelector("#pm-start").addEventListener("click", zeigeRunde);
    box.querySelector("#pm-ende").addEventListener("click", zeigeEndstand);
  }

  function zeigeRunde() {
    rundeTreffer = 0;
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    timer = api.baueTimer({ sekunden: cfg.zeit, aufEnde: rundeVorbei });
    buehne.append(timer.el);
    const wortEl = el(`<div class="bm-wort"><div class="bm-wort-kat"></div><div class="bm-wort-text"></div></div>`);
    buehne.append(wortEl);
    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="pm-treffer">Erraten ✓ (+1)</button>
      <button type="button" class="knopf zweitrangig" id="pm-skip">Auslassen</button>
      <button type="button" class="knopf zweitrangig" id="pm-stop">Runde beenden</button></div>`);
    buehne.append(knoepfe);
    const textEl = wortEl.querySelector(".bm-wort-text"), katEl = wortEl.querySelector(".bm-wort-kat");
    const neuesWort = () => { aktuell = ziehe(); textEl.textContent = aktuell.wort; katEl.textContent = aktuell.kat; };
    neuesWort();
    knoepfe.querySelector("#pm-treffer").addEventListener("click", () => { teams.addiere(aktiv, 1); rundeTreffer++; neuesWort(); });
    knoepfe.querySelector("#pm-skip").addEventListener("click", neuesWort);
    knoepfe.querySelector("#pm-stop").addEventListener("click", () => { timer.stopp(); rundeVorbei(); });
    timer.start();
  }

  function rundeVorbei() {
    if (timer) timer.stopp();
    const naechster = (aktiv + 1) % cfg.teams;
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const box = el(`<div class="bm-wort">
      <div class="bm-gross">${teams.namen[aktiv]}: ${rundeTreffer} ${rundeTreffer === 1 ? "Begriff" : "Begriffe"} in dieser Runde 🎉</div>
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="pm-weiter">Weiter: ${teams.namen[naechster]}</button>
        <button type="button" class="knopf zweitrangig" id="pm-ende">Spiel beenden</button>
      </div></div>`);
    buehne.append(box);
    box.querySelector("#pm-weiter").addEventListener("click", () => { aktiv = naechster; zeigeVorRunde(); });
    box.querySelector("#pm-ende").addEventListener("click", zeigeEndstand);
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
          <button type="button" class="knopf" id="pm-nochmal">Nochmal spielen</button>
          <button type="button" class="knopf zweitrangig" id="pm-neu">Einstellungen ändern</button>
        </div></div>`;
    buehne.querySelector("#pm-nochmal").addEventListener("click", () => { neueRunde(); zeigeVorRunde(); });
    buehne.querySelector("#pm-neu").addEventListener("click", zeigeSetup);
  }
}
