// spiel.js — Themen-Brett (Pausenraum, Beamermodus). Quiz-Brett im Jeopardy-Stil
// auf der digitalen Tafel: Teams wählen Kategorie + Punktwert, beantworten eine
// Wissensfrage und sammeln Punkte. Läuft im Beamer-Rahmen
// (assets/js/spiel/beamer.js). Reine Logik (bauBrett, alleGespielt, sieger) ist
// exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-jeopardy",
  titel: "Themen-Brett",
  kurz: "Quiz-Brett im Beamermodus: Teams wählen Kategorie und Wert, beantworten Wissensfragen und sammeln Punkte — Brett und Punktestand groß auf der Tafel.",
  kategorie: "klasse"
};

const DATEN_URL = new URL("../../daten/pausenraum/jeopardy-allgemein.json", import.meta.url);

// rein/testbar: flaches Feld-Array (genau 25 Felder) aus den Brettdaten bauen.
// Jedes Feld: { kat, wert, frage, antwort, gespielt:false }.
export function bauBrett(daten) {
  const felder = [];
  (daten.kategorien || []).forEach(k => {
    (k.fragen || []).forEach(f => {
      felder.push({ kat: k.name, wert: f.wert, frage: f.frage, antwort: f.antwort, gespielt: false });
    });
  });
  return felder;
}
// rein/testbar: sind alle Felder gespielt?
export function alleGespielt(felder) {
  return felder.length > 0 && felder.every(f => f.gespielt);
}
// rein/testbar: Indizes der Teams mit Höchstpunktzahl (bei Gleichstand mehrere)
export function sieger(staende) {
  const max = Math.max(...staende);
  return staende.map((p, i) => (p === max ? i : -1)).filter(i => i >= 0);
}

export async function starte(api) {
  const { buehne, el } = api;
  let daten;
  try { daten = await (await fetch(DATEN_URL, { cache: "no-store" })).json(); }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Das Themen-Brett konnte nicht geladen werden — bitte die Seite neu laden.</p>`; return; }

  const kategorien = (daten.kategorien || []).map(k => k.name);
  const werte = [...new Set(bauBrett(daten).map(f => f.wert))].sort((a, b) => a - b);
  const cfg = { teams: 2 };
  let teams = null, felder = null, aktiv = 0, aktuell = null;

  zeigeSetup();

  function neuesSpiel() {
    teams = api.baueTeams(Array.from({ length: cfg.teams }, (_, i) => "Team " + (i + 1)));
    felder = bauBrett(daten);
    aktiv = 0;
  }
  function feld(kat, wert) { return felder.find(f => f.kat === kat && f.wert === wert); }
  function kopfTeams() { teams.setzeAktiv(aktiv); return teams.el; }

  function zeigeSetup() {
    const chip = (txt, attr, an) => `<button type="button" class="bm-chip ${an ? "bm-an" : ""}" ${attr}>${txt}</button>`;
    buehne.innerHTML = `
      <div class="bm-setup">
        <h2>Themen-Brett — Einstellungen</h2>
        <div class="bm-zeile"><span class="bm-label">Teams</span><div class="bm-wahl" id="jp-teams">
          ${[2, 3, 4].map(n => chip(n + " Teams", `data-teams="${n}"`, cfg.teams === n)).join("")}</div></div>
        <p class="bm-info">Das Team, das dran ist, wählt ein freies Feld. Die Frage erscheint groß — beratet euch, dann „Antwort zeigen". Stimmt eure Lösung, gebt die Punkte dem richtigen Team; sonst „niemand". Wer die meisten Punkte sammelt, gewinnt.</p>
        <div class="bm-knopfzeile"><button type="button" class="knopf" id="jp-los">Los geht's</button></div>
      </div>`;
    buehne.querySelectorAll("#jp-teams .bm-chip").forEach(b => b.addEventListener("click", () => {
      cfg.teams = Number(b.dataset.teams);
      buehne.querySelectorAll("#jp-teams .bm-chip").forEach(x => x.classList.toggle("bm-an", x === b));
    }));
    buehne.querySelector("#jp-los").addEventListener("click", () => { neuesSpiel(); zeigeBrett(); });
  }

  function zeigeBrett() {
    buehne.innerHTML = "";
    buehne.append(kopfTeams());

    const hinweis = el(`<div class="bm-gross">${teams.namen[aktiv]} wählt ein Feld</div>`);
    buehne.append(hinweis);

    // Brett: Kopfzeile (Kategorien) + 5 Zeilen Werte. Inline-Grid, damit
    // keine Änderung an der gemeinsamen beamer.css nötig ist.
    const spalten = kategorien.length;
    const brett = el(`<div role="grid" aria-label="Spielbrett" style="display:grid;grid-template-columns:repeat(${spalten},1fr);gap:clamp(4px,0.8vw,10px);flex:1;align-content:stretch;"></div>`);

    kategorien.forEach(name => {
      const kopf = el(`<div role="columnheader" style="display:flex;align-items:center;justify-content:center;text-align:center;padding:clamp(6px,1.4vh,16px) 6px;border-radius:12px;background:color-mix(in srgb, var(--akzent) 16%, transparent);border:2px solid var(--akzent);font-weight:800;font-size:clamp(.85rem,2vw,1.4rem);line-height:1.1;"></div>`);
      kopf.textContent = name;
      brett.append(kopf);
    });

    werte.forEach(wert => {
      kategorien.forEach(kat => {
        const f = feld(kat, wert);
        const gespielt = f.gespielt;
        const zelle = el(`<button type="button" role="gridcell"
          ${gespielt ? "disabled aria-disabled=\"true\"" : ""}
          aria-label="${kat}, ${wert} Punkte${gespielt ? ", bereits gespielt" : ""}"
          style="font:inherit;cursor:${gespielt ? "default" : "pointer"};min-height:clamp(48px,8vh,96px);border-radius:12px;border:2px solid var(--linie);background:${gespielt ? "var(--bg)" : "var(--flaeche)"};color:${gespielt ? "var(--text-leise)" : "var(--akzent)"};font-weight:800;font-size:clamp(1.1rem,3.4vw,2.4rem);${gespielt ? "opacity:.4;" : ""}"
          >${gespielt ? "—" : wert}</button>`);
        if (!gespielt) {
          zelle.addEventListener("mouseenter", () => { zelle.style.background = "color-mix(in srgb, var(--akzent) 12%, transparent)"; });
          zelle.addEventListener("mouseleave", () => { zelle.style.background = "var(--flaeche)"; });
          zelle.addEventListener("click", () => zeigeFrage(f));
        }
        brett.append(zelle);
      });
    });
    buehne.append(brett);

    const fertig = alleGespielt(felder);
    const knoepfe = el(`<div class="bm-knopfzeile">
      <button type="button" class="knopf zweitrangig" id="jp-ende">${fertig ? "Endstand zeigen 🏁" : "Spiel beenden"}</button>
    </div>`);
    buehne.append(knoepfe);
    knoepfe.querySelector("#jp-ende").addEventListener("click", zeigeEndstand);
    if (fertig) hinweis.textContent = "Alle Felder gespielt!";
  }

  function zeigeFrage(f) {
    aktuell = f;
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const box = el(`<div class="bm-wort">
      <div class="bm-wort-kat">${f.kat} · ${f.wert} Punkte</div>
      <div class="bm-wort-text"></div>
      <p class="bm-info">${teams.namen[aktiv]} ist dran. Beratet euch — dann auflösen.</p>
      <div class="bm-knopfzeile">
        <button type="button" class="knopf" id="jp-antwort">Antwort zeigen</button>
        <button type="button" class="knopf zweitrangig" id="jp-zurueck">Zurück zum Brett</button>
      </div></div>`);
    box.querySelector(".bm-wort-text").textContent = f.frage;
    buehne.append(box);
    box.querySelector("#jp-antwort").addEventListener("click", () => zeigeAntwort(f));
    // „Zurück zum Brett" ohne Wertung (Feld bleibt offen)
    box.querySelector("#jp-zurueck").addEventListener("click", zeigeBrett);
  }

  function zeigeAntwort(f) {
    buehne.innerHTML = "";
    buehne.append(kopfTeams());
    const box = el(`<div class="bm-wort">
      <div class="bm-wort-kat">${f.kat} · ${f.wert} Punkte</div>
      <div class="bm-info" style="font-size:clamp(1.1rem,3vw,1.7rem);">${f.frage}</div>
      <div class="bm-wort-text" style="color:var(--akzent);"></div>
      <p class="bm-gross">Wer hatte es richtig? Punkte vergeben:</p>
      <div class="bm-knopfzeile" id="jp-vergabe"></div>
    </div>`);
    box.querySelector(".bm-wort-text").textContent = f.antwort;
    const vergabe = box.querySelector("#jp-vergabe");
    teams.namen.forEach((name, i) => {
      const b = el(`<button type="button" class="knopf">Punkte an ${name} (+${f.wert})</button>`);
      b.addEventListener("click", () => vergebe(f, i));
      vergabe.append(b);
    });
    const keiner = el(`<button type="button" class="knopf zweitrangig">niemand</button>`);
    keiner.addEventListener("click", () => vergebe(f, -1));
    vergabe.append(keiner);
    buehne.append(box);
  }

  function vergebe(f, teamIndex) {
    if (teamIndex >= 0) teams.addiere(teamIndex, f.wert);
    f.gespielt = true;
    // Reihum: nächstes Team wählt das nächste Feld
    aktiv = (aktiv + 1) % cfg.teams;
    if (alleGespielt(felder)) zeigeEndstand();
    else zeigeBrett();
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
          <button type="button" class="knopf" id="jp-nochmal">Nochmal spielen</button>
          <button type="button" class="knopf zweitrangig" id="jp-neu">Einstellungen ändern</button>
        </div></div>`;
    buehne.querySelector("#jp-nochmal").addEventListener("click", () => { neuesSpiel(); zeigeBrett(); });
    buehne.querySelector("#jp-neu").addEventListener("click", zeigeSetup);
  }
}
