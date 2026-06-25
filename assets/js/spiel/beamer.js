// beamer.js — gemeinsamer Rahmen für Klassen-/Beamerspiele im Pausenraum.
// Eine digitale Tafel, von vorn bedient: große Anzeige von Begriffen, Punkten,
// Timer. Ein Spielmodul liefert manifest + starte(api) und nutzt die Helfer.
// Reine Helfer (mischen, zieher, formatSek) sind exportiert und in Node testbar —
// DOM wird nur in den baue*-Funktionen und in starteBeamerSpiel angefasst.

export function el(html) {
  const t = document.createElement("template");
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
}

// Fisher-Yates (optional mit eigenem RNG)
export function mischen(arr, rnd = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
// Ziehen ohne Wiederholung; mischt neu, wenn der Stapel leer ist
export function zieher(items) {
  let rest = mischen(items);
  return () => { if (!rest.length) rest = mischen(items); return rest.pop(); };
}
export function formatSek(s) {
  s = Math.max(0, Math.round(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

// Großer Countdown-Timer. Gibt { el, start, stopp, setze, laeuft, rest }.
export function baueTimer({ sekunden, aufEnde } = {}) {
  const node = el(`<div class="bm-timer" role="timer" aria-live="off"><span class="bm-timer-zahl">0:00</span></div>`);
  const zahl = node.querySelector(".bm-timer-zahl");
  let rest = sekunden || 0, id = 0, laeuft = false;
  const zeige = () => { zahl.textContent = formatSek(rest); node.classList.toggle("bm-knapp", rest <= 10); };
  function stopp() { laeuft = false; clearInterval(id); }
  function tick() { rest -= 1; zeige(); if (rest <= 0) { stopp(); if (aufEnde) aufEnde(); } }
  function start(neu) { if (neu != null) rest = neu; if (laeuft) return; laeuft = true; zeige(); id = setInterval(tick, 1000); }
  zeige();
  return { el: node, start, stopp, setze: s => { rest = s; zeige(); }, get laeuft() { return laeuft; }, get rest() { return rest; } };
}

// Punktetafel für Teams. Gibt { el, addiere, setzeAktiv, staende, namen }.
export function baueTeams(namen) {
  const node = el(`<div class="bm-teams"></div>`);
  const punkte = namen.map(() => 0);
  const karten = namen.map(n => {
    const k = el(`<div class="bm-team"><span class="bm-team-name">${n}</span><span class="bm-team-punkte">0</span></div>`);
    node.append(k); return k;
  });
  const render = () => karten.forEach((k, i) => { k.querySelector(".bm-team-punkte").textContent = punkte[i]; });
  return {
    el: node,
    addiere: (i, n = 1) => { punkte[i] = Math.max(0, punkte[i] + n); render(); },
    setzeAktiv: i => karten.forEach((k, j) => k.classList.toggle("bm-aktiv", j === i)),
    staende: () => punkte.slice(), namen
  };
}

// Geheim-Panel: zeigt Text nur auf Knopfdruck, mit Wegschau-Hinweis (für Spion/Geheimwörter/Montagsmaler).
export function baueGeheim({ warnung = "Alle anderen kurz wegschauen!" } = {}) {
  const node = el(`<div class="bm-geheim"><button type="button" class="knopf bm-geheim-knopf">Anzeigen</button><div class="bm-geheim-inhalt" hidden></div></div>`);
  const knopf = node.querySelector(".bm-geheim-knopf"), inhalt = node.querySelector(".bm-geheim-inhalt");
  let text = "";
  knopf.addEventListener("click", () => {
    if (inhalt.hidden) { inhalt.innerHTML = `<p class="bm-warn">${warnung}</p><div class="bm-geheim-text">${text}</div>`; inhalt.hidden = false; knopf.textContent = "Verbergen"; }
    else { inhalt.hidden = true; knopf.textContent = "Anzeigen"; }
  });
  return { el: node, setze: t => { text = t; if (!inhalt.hidden) inhalt.querySelector(".bm-geheim-text").innerHTML = t; }, verbergen: () => { inhalt.hidden = true; knopf.textContent = "Anzeigen"; } };
}

// Seitenrahmen: Vollbild-Knopf + Bühne; ruft spiel.starte(api).
export function starteBeamerSpiel(spiel) {
  const wurzel = document.getElementById("spiel-wurzel");
  if (!wurzel) return;
  wurzel.innerHTML = "";
  const leiste = el(`<div class="bm-leiste"><button type="button" class="knopf zweitrangig bm-vollbild">⛶ Vollbild</button></div>`);
  const buehne = el(`<div class="bm-buehne" id="bm-buehne"></div>`);
  wurzel.append(leiste, buehne);
  const vb = leiste.querySelector(".bm-vollbild");
  vb.addEventListener("click", () => {
    if (!document.fullscreenElement) wurzel.requestFullscreen?.();
    else document.exitFullscreen?.();
  });
  document.addEventListener("fullscreenchange", () => {
    vb.textContent = document.fullscreenElement ? "⛶ Vollbild beenden" : "⛶ Vollbild";
    wurzel.classList.toggle("bm-vollbild-an", !!document.fullscreenElement);
  });
  const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
  spiel.starte({ buehne, leiste, el, mischen, zieher, formatSek, baueTimer, baueTeams, baueGeheim, reduziert });
}
