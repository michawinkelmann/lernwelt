// engine.js — Kern der Simulations-Engine: feste Zeitschritte (Akkumulator, entkoppelt
// von der Framerate), Zustands- und Preset-Verwaltung, URL-Hash, Headless-Lauf für die
// Validierung. Drei Modi:
//   kontinuierlich — Zeitschritt-Physik (optional mit Zeitraffung für Mikrophysik)
//   schrittweise   — diskrete Abläufe mit Weiter/Zurück (Verlauf wird gespeichert)
//   statisch       — Parameter ändern → sofort neu rechnen und zeichnen
// Eine konkrete Simulation liefert nur Manifest + init/update/zeichne (+ Prüffälle).

import { Welt } from "./welt.js";
import { Messreihe, Diagramm, Messwerkzeuge, ladeCsvHerunter } from "./mess.js";
import { baueOberflaeche, zeigeReglerWert, zeigeAnzeigen, zeigeBilanz, zeigeTabelle, verdrahteVorhersage } from "./ui.js";

// Design-Tokens lesen, damit Simulationen farblich zur Seite passen
function leseStil() {
  const s = getComputedStyle(document.documentElement);
  const lese = (name, ersatz) => (s.getPropertyValue(name) || ersatz).trim();
  const beamer = document.body.classList.contains("sim-beamer");
  return {
    flaeche: lese("--flaeche", "#fff"),
    raster: lese("--karo", "rgba(0,0,0,.1)"),
    beschriftung: lese("--text-leise", "#777"),
    text: lese("--text", "#222"),
    akzent: lese("--akzent", "#19599f"),
    ok: lese("--ok", "#2c7029"),
    fehler: lese("--fehler", "#b3261e"),
    hauch: lese("--hauch", "#eee"),
    linienstaerke: beamer ? 4 : 2,
    schrift: beamer ? "16px sans-serif" : "12px sans-serif"
  };
}

// ---------- Headless-Lauf (für Prüffälle / validierung.html) ----------

export function laufeHeadless(sim, parameterWerte) {
  const werte = standardWerte(sim.manifest);
  Object.assign(werte, parameterWerte);
  const dt = sim.manifest.dt ?? 1 / 240;
  const tMax = sim.manifest.tMax ?? 120;
  const zustand = sim.init(werte);
  let schritte = 0;
  while (!sim.istFertig(zustand, werte) && zustand.t < tMax && schritte < 1e7) {
    sim.update(zustand, werte, dt);
    schritte++;
  }
  return sim.bilanz(zustand, werte);
}

export function standardWerte(manifest) {
  const werte = {};
  manifest.parameter.forEach(p => { werte[p.id] = p.start; });
  return werte;
}

// ---------- URL-Hash (Parameterzustand teilen) ----------

function liesHash(manifest, werte) {
  const teile = new URLSearchParams(location.hash.slice(1));
  manifest.parameter.forEach(p => {
    if (teile.has(p.id)) {
      const wert = parseFloat(String(teile.get(p.id)).replace(",", "."));
      if (isFinite(wert)) werte[p.id] = Math.min(p.max, Math.max(p.min, wert));
    }
  });
  return { beamer: teile.get("beamer") === "1" };
}

function schreibeHash(manifest, werte, beamer) {
  const teile = new URLSearchParams();
  manifest.parameter.forEach(p => {
    if (Math.abs(werte[p.id] - p.start) > 1e-9) teile.set(p.id, String(werte[p.id]));
  });
  if (beamer) teile.set("beamer", "1");
  const neu = teile.toString();
  history.replaceState(null, "", neu ? "#" + neu : location.pathname + location.search);
}

// ---------- Hauptstart ----------

export function starteSimulation(sim, halter) {
  const manifest = sim.manifest;
  const modus = manifest.modus;
  const ui = baueOberflaeche(manifest, halter);
  verdrahteVorhersage(halter);

  const welt = new Welt(ui.canvas);
  const werte = standardWerte(manifest);
  const hashInfo = liesHash(manifest, werte);
  let beamer = hashInfo.beamer;
  if (beamer) document.body.classList.add("sim-beamer");

  const dt = manifest.dt ?? 1 / 240;
  const zeitRaffung = manifest.zeitRaffung ?? 1;     // Modellsekunden je Echtzeitsekunde (bei Tempo 1×)
  const schrittweite = manifest.schrittweite ?? 1 / 60; // Modellzeit eines „Einzelschritts"
  let zustand = sim.init(werte);
  let laeuft = false;
  let tempo = modus === "schrittweise" ? 2 : 1;       // schrittweise: Schritte pro Sekunde
  let akku = 0;
  let letzteZeit = null;
  let verlauf = [];                                    // Schnappschüsse für „Zurück" (schrittweise)

  const messreihe = new Messreihe(
    manifest.anzeigen.map(a => ({ id: a.id, label: a.label, einheit: a.einheit })),
    modus === "schrittweise" ? 0 : 1 / 50
  );
  const diagramme = (manifest.diagramme || []).map((d, i) => {
    const canvas = halter.querySelector(`[data-diagramm="${i}"]`);
    const ax = manifest.anzeigen.find(a => a.id === d.x) || { label: d.x, einheit: "" };
    const ay = manifest.anzeigen.find(a => a.id === d.y) || { label: d.y, einheit: "" };
    return { def: d, plot: new Diagramm(canvas, { xLabel: ax.label, xEinheit: ax.einheit, yLabel: ay.label, yEinheit: ay.einheit, farbe: leseStil().akzent }) };
  });
  const werkzeuge = manifest.werkzeuge !== false
    ? new Messwerkzeuge(ui.canvas, welt, text => { ui.werkzeugStatus.textContent = text; })
    : null;

  function bereichAnpassen() {
    if (typeof sim.weltBereich === "function") welt.setzeBereich(sim.weltBereich(werte, zustand));
    else if (manifest.welt) welt.setzeBereich(manifest.welt);
  }

  // Messwerte in Anzeigeeinheiten (faktor) — für Anzeigen, Messreihe und Diagramme
  function anzeigeWerte() {
    const roh = sim.messwerte(zustand, werte);
    const skaliert = {};
    manifest.anzeigen.forEach(a => { skaliert[a.id] = roh[a.id] * (a.faktor ?? 1); });
    return skaliert;
  }

  function erfasseMesswerte() {
    const m = anzeigeWerte();
    messreihe.erfasse(m);
    diagramme.forEach(d => d.plot.sammle(m[d.def.x], m[d.def.y]));
    return m;
  }

  function zeichneAlles() {
    const stil = leseStil();
    welt.passeCanvasAn();
    bereichAnpassen();
    welt.leeren(stil.flaeche);
    if (manifest.raster !== false) welt.zeichneRaster(stil);
    sim.zeichne({ ctx: welt.ctx, welt, zustand, werte, stil });
    if (werkzeuge) werkzeuge.zeichne(stil);
    diagramme.forEach(d => d.plot.zeichne(stil));
  }

  function zeigeStand(messwerte) {
    zeigeAnzeigen(halter, manifest, messwerte || anzeigeWerte());
    if (sim.istFertig(zustand, werte) && modus !== "statisch") {
      zeigeBilanz(ui.bilanz, manifest, sim.bilanz(zustand, werte));
      setzeLaeuft(false);
    }
  }

  function setzeLaeuft(neu) {
    laeuft = neu;
    if (ui.startKnopf) ui.startKnopf.textContent = laeuft ? "Pause" : (modus === "schrittweise" ? "Automatik" : "Start");
  }

  function zuruecksetzen() {
    zustand = sim.init(werte);
    verlauf = [];
    messreihe.leeren();
    diagramme.forEach(d => d.plot.leeren());
    zeigeBilanz(ui.bilanz, manifest, null);
    setzeLaeuft(false);
    akku = 0;
    erfasseMesswerte();
    zeigeStand();
    zeichneAlles();
  }

  // Ein Modellschritt: kontinuierlich = dt Physikzeit, schrittweise = 1 diskreter Schritt
  function modellSchritt() {
    if (modus === "schrittweise" && verlauf.length < 5000) verlauf.push(structuredClone(zustand));
    sim.update(zustand, werte, dt);
    erfasseMesswerte();
  }

  function schrittZurueck() {
    if (!verlauf.length) return;
    zustand = verlauf.pop();
    setzeLaeuft(false);
    zeigeBilanz(ui.bilanz, manifest, null);
    zeigeStand();
  }

  // Hauptschleife: Modell mit festem dt bzw. diskreten Schritten, Darstellung pro Frame
  function rahmen(jetzt) {
    if (letzteZeit === null) letzteZeit = jetzt;
    const vergangen = Math.min(0.25, (jetzt - letzteZeit) / 1000);
    letzteZeit = jetzt;
    if (laeuft && modus === "kontinuierlich") {
      akku += vergangen * tempo * zeitRaffung;
      while (akku >= dt && !sim.istFertig(zustand, werte)) {
        modellSchritt();
        akku -= dt;
      }
      zeigeStand();
    } else if (laeuft && modus === "schrittweise") {
      akku += vergangen * tempo; // tempo = Schritte pro Sekunde
      while (akku >= 1 && !sim.istFertig(zustand, werte)) {
        modellSchritt();
        akku -= 1;
      }
      zeigeStand();
    }
    zeichneAlles();
    requestAnimationFrame(rahmen);
  }

  // ---------- Bedienung (Knöpfe existieren je nach Modus) ----------

  function verbinde(selektor, fn) {
    const knoten = halter.querySelector(selektor);
    if (knoten) knoten.addEventListener("click", fn);
    return knoten;
  }

  if (ui.startKnopf) ui.startKnopf.addEventListener("click", () => {
    if (sim.istFertig(zustand, werte)) zuruecksetzen();
    setzeLaeuft(!laeuft);
  });
  verbinde('[data-aktion="schritt"]', () => {
    setzeLaeuft(false);
    if (sim.istFertig(zustand, werte)) return;
    if (modus === "schrittweise") {
      modellSchritt();
    } else {
      for (let i = 0; i < Math.max(1, Math.round(schrittweite / dt)); i++) {
        if (sim.istFertig(zustand, werte)) break;
        modellSchritt();
      }
    }
    zeigeStand();
  });
  verbinde('[data-aktion="zurueck"]', schrittZurueck);
  verbinde('[data-aktion="reset"]', () => { if (werkzeuge) werkzeuge.leeren(); zuruecksetzen(); });
  const tempoWahl = halter.querySelector('[data-aktion="tempo"]');
  if (tempoWahl) tempoWahl.addEventListener("change", e => { tempo = parseFloat(e.target.value); });
  verbinde('[data-aktion="csv"]', () => {
    ladeCsvHerunter(messreihe, manifest.id.replace(/\//g, "-") + "-messwerte.csv");
  });
  verbinde('[data-aktion="beamer"]', e => {
    beamer = !beamer;
    document.body.classList.toggle("sim-beamer", beamer);
    halter.querySelector('[data-aktion="beamer"]').setAttribute("aria-pressed", String(beamer));
    schreibeHash(manifest, werte, beamer);
  });
  verbinde('[data-aktion="vollbild"]', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else halter.requestFullscreen?.();
  });
  halter.querySelectorAll("[data-werkzeug]").forEach(knopf => {
    knopf.addEventListener("click", () => {
      if (!werkzeuge) return;
      const modusW = knopf.dataset.werkzeug;
      werkzeuge.setzeModus(werkzeuge.modus === modusW ? "aus" : modusW);
      halter.querySelectorAll("[data-werkzeug]").forEach(k =>
        k.setAttribute("aria-pressed", String(k.dataset.werkzeug === werkzeuge.modus)));
    });
  });
  verbinde('[data-aktion="stoppuhr"]', () => { if (werkzeuge) werkzeuge.stoppuhr(zustand.t); });

  // Parameter-Slider: Wert ändern → Anzeige aktualisieren, Sim neu aufsetzen, Hash schreiben
  manifest.parameter.forEach(p => {
    const eingabe = halter.querySelector(`[data-parameter="${p.id}"] input`);
    eingabe.addEventListener("input", () => {
      werte[p.id] = parseFloat(eingabe.value);
      zeigeReglerWert(halter, manifest, werte);
      schreibeHash(manifest, werte, beamer);
      zuruecksetzen();
    });
  });

  // Presets
  (manifest.presets || []).forEach((voreinstellung, i) => {
    verbinde(`[data-preset="${i}"]`, () => {
      Object.assign(werte, voreinstellung.werte);
      zeigeReglerWert(halter, manifest, werte);
      schreibeHash(manifest, werte, beamer);
      zuruecksetzen();
    });
  });

  // Messtabelle bei Bedarf füllen
  const tabelle = halter.querySelector(".sim-tabelle");
  if (tabelle) tabelle.addEventListener("toggle", e => {
    if (e.target.open) zeigeTabelle(ui.tabelle, messreihe);
  });

  // Geänderter Hash im selben Tab (z. B. geteilter Link): Parameter übernehmen
  window.addEventListener("hashchange", () => {
    liesHash(manifest, werte);
    zeigeReglerWert(halter, manifest, werte);
    zuruecksetzen();
  });

  // Los geht's
  zeigeReglerWert(halter, manifest, werte);
  zuruecksetzen();
  requestAnimationFrame(rahmen);
}
