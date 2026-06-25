// spiel.js — Verbotene Wörter (Pausenraum, Beamermodus). Klassenspiel auf der
// digitalen Tafel: Eine Person erklärt einen Begriff, ohne die fünf verbotenen
// Wörter zu benutzen — das eigene Team rät. Eigenständiger Nachbau der Tabu-Mechanik
// mit selbst geschriebenen Karten. Läuft im Beamer-Rahmen (assets/js/spiel/beamer.js).
// Reine Logik (kartenpool, sieger) ist exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-verbotene-woerter",
  titel: "Verbotene Wörter",
  kurz: "Einen Begriff erklären, ohne die fünf verbotenen Wörter zu benutzen — das eigene Team rät. Karte, Punkte und Timer groß auf der Tafel.",
  kategorie: "klasse"
};

const KARTEN_URL = new URL("../../daten/pausenraum/tabu.json", import.meta.url);

// rein/testbar: prüft und liefert die spielbaren Karten (Begriff + mind. 1 Tabuwort).
export function kartenpool(karten) {
  if (!Array.isArray(karten)) return [];
  return karten.filter(k => k && typeof k.begriff === "string" && k.begriff.trim()
    && Array.isArray(k.tabu) && k.tabu.length > 0);
}

// rein/testbar: Indizes der Teams mit Höchstpunktzahl.
export function sieger(staende) {
  const max = Math.max(...staende);
  return staende.map((p, i) => (p === max ? i : -1)).filter(i => i >= 0);
}

export async function starte(api) {
  const { buehne, el } = api;
  let daten;
  try { daten = await (await fetch(KARTEN_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Karten konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  const karten = kartenpool(daten.karten);
  if (!karten.length) { buehne.innerHTML = `<p class="bm-info">Es stehen keine Karten zur Verfügung.</p>`; return; }

  const cfg = { teams: 2, zeit: 90 };
  let teams = null, aktiv = 0, ziehe = null, timer = null, aktuell = null, rundeTreffer = 0, rundeFehler = 0, geheim = null;

  zeigeSetup();

  function neueRunde() {
    teams = api.baueTeams(Array.from({ length: cfg.teams }, (_, i) => "Team " + (i + 1)));
    ziehe = api.zieher(karten);
    aktiv = 0;
  }
  function kopfTeams() { teams.setzeAktiv(aktiv); return teams.el; }

  // Baut den HTML-Inhalt der Geheim-Karte (Begriff groß + verbotene Wörter).
  function karteHtml(k) {
    const tabu = k.tabu.map(w => `<li>${w}</li>`).join("");
    return `<div class="vw-karte">
      <div class="vw-karte-begriff">${k.begriff}</div>
      <div class="vw-karte-tabu-titel">verboten:</div>
      <ul class="vw-karte-tabu">${tabu}</ul>
    </div>`;
  }

  function zeigeSetup() {
    if (timer) timer.stopp();
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Verbotene Wörter — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Teams</span><div class="bm-wahl" id="vw-teams">
          ${[2, 3, 4].map(n => chip(n + " Teams", `data-teams="${n}"`, cfg.teams === n)).join("")}</div></div>
        <div class="bm-zeile"><span class="bm-label">Zeit pro Runde</span><div class="bm-wahl" id="vw-zeit">
          ${[60, 90, 120].map(s => chip(s + " s", `data-zeit="${s}"`, cfg.zeit === s)).join("")}</div></div>
        <p class="bm-info">Eine Person aus dem Team schaut sich heimlich die Karte an (alle anderen schauen weg), verbirgt sie wieder und erklärt dann den <strong>Begriff</strong> mit eigenen Worten — die <strong>fünf verbotenen Wörter</strong> und Teile davon sind tabu. Das eigene Team rät: pro Treffer +1 Punkt, bei einem verbotenen Wort −1 Punkt.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="vw-los">Los geht's</button></div>
      </div>`;
    const single = (sel, key) => buehne.querySelectorAll(sel + " .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg[key] = Number(b.dataset[key]);
      buehne.querySelectorAll(sel + " .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    single("#vw-teams", "teams");
    single("#vw-zeit", "zeit");
    buehne.querySelector("#vw-los").addEventListener("click", () => { neueRunde(); zeigeVorRunde(); });
  }

  function zeigeVorRunde() {
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const box = el(`<div class="bm-wort">
      <div class="bm-gross">${teams.namen[aktiv]} ist dran</div>
      <p class="bm-info">Eine Person aus ${teams.namen[aktiv]} erklärt — alle anderen Teams schauen während des Aufdeckens kurz weg. Bereit? Dann Runde starten, die Zeit läuft.</p>
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="vw-start">Runde starten (${cfg.zeit} s)</button>
        <button type="button" class="knopf zweitrangig" id="vw-ende">Spiel beenden</button>
      </div></div>`);
    buehne.append(box);
    box.querySelector("#vw-start").addEventListener("click", zeigeRunde);
    box.querySelector("#vw-ende").addEventListener("click", zeigeEndstand);
  }

  function zeigeRunde() {
    rundeTreffer = 0; rundeFehler = 0;
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    timer = api.baueTimer({ sekunden: cfg.zeit, aufEnde: rundeVorbei });
    buehne.append(timer.el);

    // Geheim-Panel: zeigt die Karte nur der erklärenden Person.
    geheim = api.baueGeheim({ warnung: "Nur die erklärende Person schaut auf die Tafel! (Karte danach verbergen)" });
    buehne.append(geheim.el);

    const hinweis = el(`<p class="bm-info">Erkläre den Begriff <strong>ohne</strong> die verbotenen Wörter (und Wortteile davon). Dein Team rät — bei Treffer „Erraten ✓", bei einem verbotenen Wort „Tabu verletzt".</p>`);
    buehne.append(hinweis);

    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf" id="vw-treffer">Erraten ✓ (+1)</button>
      <button type="button" class="knopf zweitrangig vw-tabu" id="vw-tabu">Tabu verletzt (−1)</button>
      <button type="button" class="knopf zweitrangig" id="vw-skip">Auslassen</button>
      <button type="button" class="knopf zweitrangig" id="vw-stop">Runde beenden</button></div>`);
    buehne.append(knoepfe);

    const naechsteKarte = () => { aktuell = ziehe(); geheim.setze(karteHtml(aktuell)); geheim.verbergen(); };
    naechsteKarte();
    knoepfe.querySelector("#vw-treffer").addEventListener("click", () => { teams.addiere(aktiv, 1); rundeTreffer++; naechsteKarte(); });
    knoepfe.querySelector("#vw-tabu").addEventListener("click", () => { teams.addiere(aktiv, -1); rundeFehler++; naechsteKarte(); });
    knoepfe.querySelector("#vw-skip").addEventListener("click", naechsteKarte);
    knoepfe.querySelector("#vw-stop").addEventListener("click", () => { timer.stopp(); rundeVorbei(); });
    timer.start();
  }

  function rundeVorbei() {
    if (timer) timer.stopp();
    const naechster = (aktiv + 1) % cfg.teams;
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const tref = `${rundeTreffer} ${rundeTreffer === 1 ? "Begriff" : "Begriffe"}`;
    const fehl = rundeFehler > 0 ? `, ${rundeFehler}× Tabu verletzt` : "";
    const box = el(`<div class="bm-wort">
      <div class="bm-gross">${teams.namen[aktiv]}: ${tref}${fehl} in dieser Runde 🎉</div>
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="vw-weiter">Weiter: ${teams.namen[naechster]}</button>
        <button type="button" class="knopf zweitrangig" id="vw-ende">Spiel beenden</button>
      </div></div>`);
    buehne.append(box);
    box.querySelector("#vw-weiter").addEventListener("click", () => { aktiv = naechster; zeigeVorRunde(); });
    box.querySelector("#vw-ende").addEventListener("click", zeigeEndstand);
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
          <button type="button" class="knopf" id="vw-nochmal">Nochmal spielen</button>
          <button type="button" class="knopf zweitrangig" id="vw-neu">Einstellungen ändern</button>
        </div></div>`;
    buehne.querySelector("#vw-nochmal").addEventListener("click", () => { neueRunde(); zeigeVorRunde(); });
    buehne.querySelector("#vw-neu").addEventListener("click", zeigeSetup);
  }
}