// geruest.js — gemeinsamer Rahmen für alle Lern- und Pausenspiele.
// Aufgabenteilung wie bei der Sim-Engine: Das Gerüst liefert Kopfzeile (Punkte,
// Zeit, Knöpfe), Spielfläche, Game-Loop, Tastatur-/Touch-Weiterleitung,
// Game-Over-Panel mit lokaler Bestenliste und den Einbettmodus (?einbettung=1).
// Ein Spielmodul liefert: manifest + starte(spielplatz) und nutzt die API.
//
// manifest = { id, titel, kurz, punkteLabel ("Punkte"), punkteEinheit (""),
//   highscore (true), hsRichtung ("absteigend"|"aufsteigend"),
//   steuerungHinweis ("Pfeiltasten oder Wischen"), zeigeZeit (false) }
// starte(spielplatz) erhält:
//   flaeche (div zum Befüllen — Canvas oder DOM), kopf (Infozeile-DOM),
//   setzePunkte(n), setzeZeit(text), vorbei(punkte, infoHtml?),
//   neustartCb(fn) — wird bei „Nochmal" gerufen,
//   loop(cb) — startet RAF-Schleife, cb(dtSekunden); loopStopp(),
//   tasten(cb) — keydown-Weiterleitung (cb(ereignis), preventDefault bei Pfeilen/Leertaste),
//   wisch(cb) — Touch-Wischrichtungen ("links"|"rechts"|"hoch"|"runter"),
//   reduzierteBewegung (bool), istEinbettung (bool)

import { istHighscore, speichereHighscore, bestenlisteHtml, holeHighscores } from "./highscore.js";

export function starteSpielSeite(spiel) {
  const m = spiel.manifest;
  const wurzel = document.getElementById("spiel-wurzel");
  if (!wurzel) return;
  const istEinbettung = new URLSearchParams(location.search).has("einbettung");
  const reduzierteBewegung = matchMedia("(prefers-reduced-motion: reduce)").matches;

  wurzel.innerHTML = `
    <div class="spiel-kopf">
      <div class="spiel-info">
        <span class="spiel-punkte">${m.punkteLabel || "Punkte"}: <b id="sp-punkte">0</b></span>
        ${m.zeigeZeit ? '<span class="spiel-zeit">Zeit: <b id="sp-zeit">–</b></span>' : ""}
      </div>
      <div class="spiel-knoepfe">
        <button type="button" id="sp-start" class="knopf">Start</button>
        <button type="button" id="sp-highscore" class="knopf zweitrangig"${m.highscore === false ? " hidden" : ""}>Bestenliste</button>
      </div>
    </div>
    <div class="spiel-flaeche" id="sp-flaeche" tabindex="0" aria-label="Spielfläche von ${m.titel}"></div>
    <p class="spiel-steuerung">${m.steuerungHinweis || ""}</p>
    <div class="spiel-panel" id="sp-panel" hidden></div>`;

  const flaeche = wurzel.querySelector("#sp-flaeche");
  const panel = wurzel.querySelector("#sp-panel");
  const punkteEl = wurzel.querySelector("#sp-punkte");
  const zeitEl = wurzel.querySelector("#sp-zeit");
  const startKnopf = wurzel.querySelector("#sp-start");

  let rafId = 0, vorher = 0, laeuft = false, loopCb = null, neustart = null;

  function loop(cb) {
    loopCb = cb; laeuft = true; vorher = performance.now();
    cancelAnimationFrame(rafId);
    const tick = (jetzt) => {
      if (!laeuft) return;
      const dt = Math.min(0.05, (jetzt - vorher) / 1000);
      vorher = jetzt;
      loopCb(dt);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }
  function loopStopp() { laeuft = false; cancelAnimationFrame(rafId); }

  function zeigePanel(html) { panel.innerHTML = html; panel.hidden = false; }
  function versteckePanel() { panel.hidden = true; }

  function vorbei(punkte, infoHtml = "") {
    loopStopp();
    const darfEintragen = m.highscore !== false && istHighscore(m.id, punkte, m.hsRichtung);
    const wert = m.formatPunkte ? m.formatPunkte(punkte) : punkte;
    zeigePanel(`
      <h2>Vorbei!</h2>
      <p class="sp-endstand">${m.punkteLabel || "Punkte"}: <b>${wert}${m.punkteEinheit ? " " + m.punkteEinheit : ""}</b></p>
      ${infoHtml}
      ${darfEintragen ? `
        <form id="sp-hs-form" class="sp-hs-form">
          <label for="sp-initialen">Top 10! Deine Initialen (3 Zeichen):</label>
          <input id="sp-initialen" maxlength="3" size="4" autocomplete="off" pattern="[A-Za-zÄÖÜäöü0-9]{1,3}" required>
          <button class="knopf" type="submit">Eintragen</button>
        </form>` : ""}
      <div class="sp-panel-knoepfe">
        <button type="button" class="knopf" id="sp-nochmal">Nochmal spielen</button>
        ${m.highscore === false ? "" : '<button type="button" class="knopf zweitrangig" id="sp-liste">Bestenliste</button>'}
      </div>
      <div id="sp-liste-ziel"></div>`);
    const form = panel.querySelector("#sp-hs-form");
    if (form) form.addEventListener("submit", ev => {
      ev.preventDefault();
      const platz = speichereHighscore(m.id, panel.querySelector("#sp-initialen").value, punkte, m.hsRichtung);
      form.outerHTML = `<p class="sp-hs-dank">Eingetragen — Platz ${platz}!</p>`;
      panel.querySelector("#sp-liste-ziel").innerHTML = bestenlisteHtml(m.id, m.punkteEinheit, m.formatPunkte);
    });
    const nochmal = panel.querySelector("#sp-nochmal");
    nochmal.addEventListener("click", () => { versteckePanel(); if (neustart) neustart(); });
    const liste = panel.querySelector("#sp-liste");
    if (liste) liste.addEventListener("click", () =>
      panel.querySelector("#sp-liste-ziel").innerHTML = bestenlisteHtml(m.id, m.punkteEinheit, m.formatPunkte));
    nochmal.focus();
  }

  const api = {
    flaeche, kopf: wurzel.querySelector(".spiel-info"),
    setzePunkte: n => { punkteEl.textContent = n; },
    setzeZeit: t => { if (zeitEl) zeitEl.textContent = t; },
    vorbei, zeigePanel, versteckePanel,
    loop, loopStopp,
    neustartCb: fn => { neustart = fn; },
    tasten: cb => {
      flaeche.addEventListener("keydown", ev => {
        if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", " "].includes(ev.key)) ev.preventDefault();
        cb(ev);
      });
    },
    wisch: cb => {
      let sx = 0, sy = 0;
      flaeche.addEventListener("touchstart", ev => { sx = ev.touches[0].clientX; sy = ev.touches[0].clientY; }, { passive: true });
      flaeche.addEventListener("touchend", ev => {
        const dx = ev.changedTouches[0].clientX - sx, dy = ev.changedTouches[0].clientY - sy;
        if (Math.abs(dx) < 24 && Math.abs(dy) < 24) { cb("tipp"); return; }
        cb(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "rechts" : "links") : (dy > 0 ? "runter" : "hoch"));
      }, { passive: true });
    },
    reduzierteBewegung, istEinbettung
  };

  startKnopf.addEventListener("click", () => {
    startKnopf.blur(); flaeche.focus(); versteckePanel();
    if (neustart) neustart(); else spiel.starte(api);
    startKnopf.textContent = "Neustart";
  });
  wurzel.querySelector("#sp-highscore")?.addEventListener("click", () =>
    zeigePanel(`<h2>Bestenliste</h2>${bestenlisteHtml(m.id, m.punkteEinheit, m.formatPunkte)}
      <div class="sp-panel-knoepfe"><button type="button" class="knopf" id="sp-zu">Schließen</button></div>`) ||
    panel.querySelector("#sp-zu").addEventListener("click", versteckePanel));

  spiel.starte(api);
}
