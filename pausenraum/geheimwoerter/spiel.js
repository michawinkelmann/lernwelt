// spiel.js — Geheimwörter (Pausenraum, Beamermodus). Wortgitter-Teamspiel auf der
// digitalen Tafel: zwei Teams suchen ihre eigenen Wörter im 5×5-Raster. Eigenständiger
// Nachbau der Mechanik mit selbst geschriebenen Wörtern. Läuft im Beamer-Rahmen
// (assets/js/spiel/beamer.js). Reine Logik (mische, baueSpielfeld, restzahl, sieger)
// ist exportiert und in Node testbar — DOM nur in starte().

export const manifest = {
  id: "sp-geheimwoerter",
  titel: "Geheimwörter",
  kurz: "Wortgitter-Teamspiel an der Tafel: Zwei Hinweisgeber:innen kennen den geheimen Schlüssel, die Teams erraten ihre Wörter im 5×5-Raster.",
  kategorie: "klasse"
};

const WOERTER_URL = new URL("../../daten/pausenraum/geheimwoerter.json", import.meta.url);

// Verteilung des Schlüssels: Startteam (a) 9, Gegner (b) 8, neutral 7, Attentäter 1 = 25.
const ANZ_A = 9, ANZ_B = 8, ANZ_NEUTRAL = 7, ANZ_ATTENTAETER = 1;
const GROESSE = 25;

// rein/testbar: Fisher-Yates-Mischung (optional mit eigenem RNG)
export function mische(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// rein/testbar: baut das 5×5-Spielfeld aus dem Wörter-Vorrat.
// → { felder:[{wort, rolle}], startteam } mit rolle in {"a","b","neutral","attentaeter"}
// und exakt 9/8/7/1. Das Startteam ist immer "a" (das Team mit 9 Wörtern).
export function baueSpielfeld(woerter, rng = Math.random) {
  if (!Array.isArray(woerter) || woerter.length < GROESSE) {
    throw new Error("Es werden mindestens 25 Wörter benötigt.");
  }
  const ausgewaehlt = mische(woerter, rng).slice(0, GROESSE);
  const rollen = [
    ...Array(ANZ_A).fill("a"),
    ...Array(ANZ_B).fill("b"),
    ...Array(ANZ_NEUTRAL).fill("neutral"),
    ...Array(ANZ_ATTENTAETER).fill("attentaeter")
  ];
  const gemischt = mische(rollen, rng);
  const felder = ausgewaehlt.map((wort, i) => ({ wort, rolle: gemischt[i] }));
  return { felder, startteam: "a" };
}

// rein/testbar: wie viele Felder einer Rolle sind noch verdeckt (nicht in aufgedeckt-Set)?
export function restzahl(felder, rolle, aufgedeckt) {
  return felder.reduce((n, f, i) => (f.rolle === rolle && !aufgedeckt.has(i) ? n + 1 : n), 0);
}

// rein/testbar: ermittelt den Sieger anhand der Reste und eines optionalen Attentäter-Treffers.
// gibt "a", "b" oder null (Spiel läuft noch) zurück.
export function sieger(felder, aufgedeckt, attentaeterVon = null) {
  if (attentaeterVon === "a") return "b";
  if (attentaeterVon === "b") return "a";
  if (restzahl(felder, "a", aufgedeckt) === 0) return "a";
  if (restzahl(felder, "b", aufgedeckt) === 0) return "b";
  return null;
}

// Konsistenz-Prüffälle (Node-testbar): Verteilung 9/8/7/1, 25 Felder, genau 1 Attentäter.
export const TESTS = [
  // 1) Genau 25 Felder
  () => baueSpielfeld(Array.from({ length: 40 }, (_, i) => "W" + i)).felder.length === GROESSE,
  // 2) Verteilung exakt 9/8/7/1
  () => {
    const { felder } = baueSpielfeld(Array.from({ length: 30 }, (_, i) => "W" + i));
    const z = r => felder.filter(f => f.rolle === r).length;
    return z("a") === 9 && z("b") === 8 && z("neutral") === 7 && z("attentaeter") === 1;
  },
  // 3) Startteam ist "a"
  () => baueSpielfeld(Array.from({ length: 25 }, (_, i) => "W" + i)).startteam === "a",
  // 4) restzahl/sieger: alle a-Felder aufgedeckt → a gewinnt; Attentäter durch a → b gewinnt
  () => {
    const { felder } = baueSpielfeld(Array.from({ length: 25 }, (_, i) => "W" + i));
    const aIdx = felder.map((f, i) => (f.rolle === "a" ? i : -1)).filter(i => i >= 0);
    const auf = new Set(aIdx);
    return restzahl(felder, "a", auf) === 0 && sieger(felder, auf) === "a" && sieger(felder, new Set(), "a") === "b";
  },
  // 5) Keine doppelten Wörter im Feld (Vorrat ohne Dubletten)
  () => {
    const { felder } = baueSpielfeld(Array.from({ length: 50 }, (_, i) => "W" + i));
    return new Set(felder.map(f => f.wort)).size === GROESSE;
  }
];

export async function starte(api) {
  const { buehne, el } = api;
  let vorrat;
  try { vorrat = (await (await fetch(WOERTER_URL, { cache: "no-store" })).json()).woerter; }
  catch (_e) { buehne.innerHTML = `<p class="bm-info">Die Wörter konnten nicht geladen werden — bitte die Seite neu laden.</p>`; return; }
  if (!Array.isArray(vorrat) || vorrat.length < GROESSE) {
    buehne.innerHTML = `<p class="bm-info">Es stehen zu wenige Wörter zur Verfügung.</p>`; return;
  }

  const TEAM = { a: "Team Rot", b: "Team Blau" };
  let spiel = null;          // { felder, startteam }
  let aufgedeckt = null;     // Set der bereits aufgedeckten Feld-Indizes
  let aktiv = "a";           // welches Team gerade rät
  let schluessel = false;    // Schlüssel-Modus (Hinweisgeber:innen-Ansicht) an/aus
  let vorbei = false;        // Spiel beendet?

  neuesSpiel();

  function neuesSpiel() {
    spiel = baueSpielfeld(vorrat);   // Math.random als RNG (api.mischen ist ein Misch-Helfer, keine Zufallsfunktion)
    aufgedeckt = new Set();
    aktiv = spiel.startteam;
    schluessel = false;
    vorbei = false;
    render();
  }

  function rolleLabel(rolle) {
    return rolle === "a" ? "Rot" : rolle === "b" ? "Blau" : rolle === "neutral" ? "neutral" : "✗";
  }

  // Klick auf ein Feld: deckt seine Farbe dauerhaft auf, wertet den Zug aus.
  function tippe(i) {
    if (vorbei || schluessel || aufgedeckt.has(i)) return;
    aufgedeckt.add(i);
    const rolle = spiel.felder[i].rolle;
    if (rolle === "attentaeter") { vorbei = true; render(); return; }
    const gewinner = api && sieger(spiel.felder, aufgedeckt);
    if (gewinner) { vorbei = true; render(); return; }
    // Eigenes Feld → weiter raten. Neutral oder gegnerisch → Zug endet, Team wechselt.
    if (rolle !== aktiv) aktiv = aktiv === "a" ? "b" : "a";
    render();
  }

  function zugBeenden() {
    if (vorbei || schluessel) return;
    aktiv = aktiv === "a" ? "b" : "a";
    render();
  }

  // Findet den Index des aufgedeckten Attentäter-Feldes (oder null).
  function attentaeterTreffer() {
    for (let i = 0; i < spiel.felder.length; i++) {
      if (spiel.felder[i].rolle === "attentaeter" && aufgedeckt.has(i)) return spiel.felder[i];
    }
    return null;
  }

  function render() {
    buehne.innerHTML = "";

    // Kopf: Restzähler beider Teams (große Punktetafel-Optik) + aktives Team markiert.
    const restA = restzahl(spiel.felder, "a", aufgedeckt);
    const restB = restzahl(spiel.felder, "b", aufgedeckt);
    const kopf = el(`<div class="gw-kopf">
      <div class="gw-team gw-rot ${aktiv === "a" && !vorbei ? "gw-aktiv" : ""}">
        <span class="gw-team-name">${TEAM.a}</span><span class="gw-team-rest">${restA}</span></div>
      <div class="gw-status" role="status" aria-live="polite"></div>
      <div class="gw-team gw-blau ${aktiv === "b" && !vorbei ? "gw-aktiv" : ""}">
        <span class="gw-team-name">${TEAM.b}</span><span class="gw-team-rest">${restB}</span></div>
    </div>`);
    buehne.append(kopf);
    const statusEl = kopf.querySelector(".gw-status");

    if (vorbei) {
      const att = attentaeterTreffer();
      let gew;
      if (att) gew = aktiv === "a" ? "b" : "a"; // wer den Attentäter tippte, verliert
      else gew = sieger(spiel.felder, aufgedeckt) || (restA <= restB ? "a" : "b");
      const grund = att
        ? `${TEAM[aktiv]} hat den Attentäter ✗ aufgedeckt.`
        : `${TEAM[gew]} hat alle eigenen Wörter gefunden.`;
      statusEl.innerHTML = `<span class="gw-sieg ${gew === "a" ? "gw-rot-text" : "gw-blau-text"}">🏆 ${TEAM[gew]} gewinnt!</span><span class="gw-grund">${grund}</span>`;
    } else if (schluessel) {
      statusEl.innerHTML = `<span class="gw-schluessel-status">🔑 Schlüssel sichtbar</span>`;
    } else {
      statusEl.innerHTML = `<span class="gw-dran">${TEAM[aktiv]} ist am Zug</span>`;
    }

    // 5×5-Raster.
    const raster = el(`<div class="gw-raster" role="group" aria-label="Wortgitter, 5 mal 5"></div>`);
    spiel.felder.forEach((f, i) => {
      const auf = aufgedeckt.has(i);
      // Im Schlüssel-Modus alle Felder farbig; sonst nur aufgedeckte Felder farbig.
      const zeigeRolle = schluessel || auf;
      const klasse = zeigeRolle ? "gw-r-" + f.rolle : "gw-r-verdeckt";
      const istAufgedeckt = auf ? "gw-auf" : "";
      const istSchluessel = schluessel && !auf ? "gw-schluessel" : "";
      const btn = el(`<button type="button" class="gw-feld ${klasse} ${istAufgedeckt} ${istSchluessel}" data-i="${i}"
        ${auf || vorbei || schluessel ? "disabled" : ""}>
        <span class="gw-wort">${f.wort}</span>
        ${zeigeRolle ? `<span class="gw-marke">${rolleLabel(f.rolle)}</span>` : ""}
      </button>`);
      raster.append(btn);
    });
    buehne.append(raster);
    raster.querySelectorAll(".gw-feld").forEach(b => {
      b.addEventListener("click", () => tippe(Number(b.dataset.i)));
    });

    // Schlüssel-Umschalter mit großer Warnung (nur für die beiden Hinweisgeber:innen).
    const warnung = el(`<div class="gw-schluessel-box">
      <button type="button" class="knopf zweitrangig gw-schluessel-knopf">
        ${schluessel ? "🔒 Schlüssel verbergen" : "🔑 Schlüssel anzeigen"}</button>
      ${schluessel ? `<p class="bm-warn">⚠ Nur die beiden Hinweisgeber:innen schauen jetzt auf die Tafel!</p>` : ""}
    </div>`);
    buehne.append(warnung);
    warnung.querySelector(".gw-schluessel-knopf").addEventListener("click", () => {
      if (vorbei) return;
      schluessel = !schluessel;
      render();
    });

    // Steuerleiste: Zug beenden + Neues Spiel.
    const steuer = el(`<div class="bm-knopfzeile gw-steuer">
      ${vorbei ? "" : `<button type="button" class="knopf gw-zug-ende" ${schluessel ? "disabled" : ""}>Zug beenden (Team wechseln)</button>`}
      <button type="button" class="knopf ${vorbei ? "" : "zweitrangig"} gw-neu">Neues Spiel</button>
    </div>`);
    buehne.append(steuer);
    const zugBtn = steuer.querySelector(".gw-zug-ende");
    if (zugBtn) zugBtn.addEventListener("click", zugBeenden);
    steuer.querySelector(".gw-neu").addEventListener("click", neuesSpiel);
  }
}
