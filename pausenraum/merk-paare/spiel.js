// spiel.js — Merk-Paare (Pausenraum): klassisches Karten-Memory mit 18 selbst
// gezeichneten, neutralen Motiven (Inline-SVG, currentColor). Läuft im
// gemeinsamen Spiel-Gerüst (assets/js/spiel/geruest.js).
//
// Reine Logik (LEVEL, MOTIVE, mische, baueBrett, istPaar, formatZeit,
// erzeugeRng) ist exportiert und in Node testbar: Auf Modulebene wird kein
// document/window angefasst — DOM nur innerhalb von starte().

export const manifest = {
  id: "sp-merk-paare",
  titel: "Merk-Paare",
  kurz: "Das ruhige Spiel für zwischendurch: Decke Kartenpaare mit möglichst wenigen Zügen auf.",
  punkteLabel: "Züge",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "aufsteigend", // weniger Züge = besser
  zeigeZeit: true,
  steuerungHinweis: "Karten antippen oder anklicken."
};

// Nur das mittlere Level schreibt in die Bestenliste — Züge sind nur bei
// gleicher Feldgröße fair vergleichbar.
export const STANDARD_LEVEL = 2;

export const LEVEL = {
  1: { name: "Klein", spalten: 4, zeilen: 4, paare: 8 },
  2: { name: "Mittel", spalten: 5, zeilen: 4, paare: 10 },
  3: { name: "Groß", spalten: 6, zeilen: 6, paare: 18 }
};

// ---------- Motive (reine Daten: Name + Inline-SVG-String) ----------
// Alle Motive sind selbst gezeichnet, einfarbig und erben currentColor
// über das fill-Attribut am SVG-Wurzelelement.
function motivSvg(inneres) {
  return `<svg class="mk-motiv" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">${inneres}</svg>`;
}

export const MOTIVE = [
  { name: "Stern", svg: motivSvg('<path d="M12 2l2.7 6.3 6.8.5-5.2 4.5 1.6 6.7L12 16.4 6.1 20l1.6-6.7L2.5 8.8l6.8-.5z"/>') },
  { name: "Blitz", svg: motivSvg('<path d="M13 2 5 13h5l-2 9 9-12h-5z"/>') },
  { name: "Haus", svg: motivSvg('<path d="M12 3 3 11h2v9h5v-6h4v6h5v-9h2z"/>') },
  { name: "Note", svg: motivSvg('<circle cx="8.5" cy="17.5" r="3"/><rect x="10" y="4" width="1.9" height="13.5"/><path d="M11.9 4c3.1.9 4.9 2.7 4.9 5.8-1.7-1.8-3.1-2.4-4.9-2.7z"/>') },
  { name: "Herz", svg: motivSvg('<path d="M12 21S3.5 15.3 3.5 9.7C3.5 6.5 5.9 4.4 8.6 4.4c1.4 0 2.7.6 3.4 1.6.7-1 2-1.6 3.4-1.6 2.7 0 5.1 2.1 5.1 5.3C20.5 15.3 12 21 12 21z"/>') },
  { name: "Würfel", svg: motivSvg('<rect x="4" y="4" width="16" height="16" rx="3" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="8.8" cy="8.8" r="1.5"/><circle cx="15.2" cy="8.8" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="8.8" cy="15.2" r="1.5"/><circle cx="15.2" cy="15.2" r="1.5"/>') },
  { name: "Schirm", svg: motivSvg('<path d="M12 3c5 0 9 3.9 9 8.7H3C3 6.9 7 3 12 3z"/><path d="M11 11.7h2v6.8a2.6 2.6 0 0 1-5.2 0h2a.6.6 0 0 0 1.2 0z"/>') },
  { name: "Anker", svg: motivSvg('<circle cx="12" cy="5" r="2.1" fill="none" stroke="currentColor" stroke-width="1.8"/><rect x="11.1" y="7" width="1.8" height="11"/><rect x="8" y="9.4" width="8" height="1.8"/><path d="M4.5 13c.5 4.6 3.6 7.5 7.5 7.5s7-2.9 7.5-7.5l-2.3.1c-.5 3.2-2.4 5-5.2 5.2-2.8-.2-4.7-2-5.2-5.2z"/>') },
  { name: "Sonne", svg: motivSvg('<circle cx="12" cy="12" r="4.2"/><g stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><line x1="12" y1="2.4" x2="12" y2="5.2"/><line x1="12" y1="18.8" x2="12" y2="21.6"/><line x1="2.4" y1="12" x2="5.2" y2="12"/><line x1="18.8" y1="12" x2="21.6" y2="12"/><line x1="5.2" y1="5.2" x2="7.2" y2="7.2"/><line x1="16.8" y1="16.8" x2="18.8" y2="18.8"/><line x1="5.2" y1="18.8" x2="7.2" y2="16.8"/><line x1="16.8" y1="7.2" x2="18.8" y2="5.2"/></g>') },
  { name: "Mond", svg: motivSvg('<path d="M20.5 14.2A8.8 8.8 0 0 1 9.8 3.5a8.8 8.8 0 1 0 10.7 10.7z"/>') },
  { name: "Tanne", svg: motivSvg('<path d="M12 2 6.5 10h2.8L4.5 17H10v5h4v-5h5.5l-4.8-7h2.8z"/>') },
  { name: "Fisch", svg: motivSvg('<path d="M2.5 12c2.8-3.9 6.3-5.9 9.6-5.9 2.9 0 5.4 1.6 7.4 4l2-2.6v9l-2-2.6c-2 2.4-4.5 4-7.4 4-3.3 0-6.8-2-9.6-5.9z"/>') },
  { name: "Schlüssel", svg: motivSvg('<circle cx="7" cy="12" r="3.6" fill="none" stroke="currentColor" stroke-width="2"/><path d="M10.6 11h10.9v2h-2.1v3.2h-2V13h-2.2v3.2h-2V13h-2.6z"/>') },
  { name: "Glocke", svg: motivSvg('<path d="M12 2.8c.9 0 1.6.6 1.8 1.4A6.1 6.1 0 0 1 18 10v4.6l2 2.9H4l2-2.9V10a6.1 6.1 0 0 1 4.2-5.8c.2-.8.9-1.4 1.8-1.4z"/><path d="M9.8 18.8a2.2 2.2 0 0 0 4.4 0z"/>') },
  { name: "Pfeil", svg: motivSvg('<path d="M3.5 10.8h10.2V5.6L21 12l-7.3 6.4v-5.2H3.5z"/>') },
  { name: "Tulpe", svg: motivSvg('<path d="M7 3.5v4.2a5 5 0 0 0 10 0V3.5l-2.6 2.1L12 3.2 9.6 5.6z"/><rect x="11.1" y="12.5" width="1.8" height="9"/><path d="M11.1 17.5c-3.2-.2-5.4-2-5.6-4.4 3.2.2 5.4 2 5.6 4.4zm1.8 0c.2-2.4 2.4-4.2 5.6-4.4-.2 2.4-2.4 4.2-5.6 4.4z"/>') },
  { name: "Tasse", svg: motivSvg('<path d="M4 6.5h12.5V12a5.8 5.8 0 0 1-5.8 5.8h-.9A5.8 5.8 0 0 1 4 12z"/><path d="M16.5 8.2h1.7a2.9 2.9 0 0 1 .2 5.8l-2.1.1.2-2.1 1.7.1a.9.9 0 0 0 0-1.9h-1.7z"/><rect x="4.5" y="19.3" width="11.5" height="1.8" rx=".9"/>') },
  { name: "Diamant", svg: motivSvg('<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M7 4.5h10l4 5L12 20.5 3 9.5z"/><path d="M3 9.5h18M9.3 9.5 12 19.5l2.7-10M7 4.5l2.3 5L12 4.8l2.7 4.7 2.3-5"/></g>') }
];

// Zwei Karten sind ein Paar, wenn sie dasselbe Motiv zeigen. Symmetrisch.
export function istPaar(a, b) {
  return !!a && !!b && a.motiv === b.motiv;
}

// Fisher-Yates-Mischung, rng austauschbar (Tests: erzeugeRng(seed)).
export function mische(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = a[i]; a[i] = a[j]; a[j] = t;
  }
  return a;
}

// Deterministischer Zufallsgenerator (mulberry32) für testbare Bretter.
export function erzeugeRng(seed) {
  let s = seed >>> 0;
  return function () {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Brett bauen: Motive ziehen, jedes als Kartenpaar ablegen, mischen.
export function baueBrett(level, rng = Math.random) {
  const def = LEVEL[level] || LEVEL[STANDARD_LEVEL];
  const auswahl = mische(MOTIVE, rng).slice(0, def.paare);
  const karten = [];
  auswahl.forEach((m, i) => {
    for (let k = 0; k < 2; k++) {
      karten.push({ paarId: i, motiv: m.name, html: m.svg, beschriftung: m.name });
    }
  });
  return mische(karten, rng);
}

// Sekunden -> "m:ss"
export function formatZeit(s) {
  const ganz = Math.max(0, Math.floor(s));
  return Math.floor(ganz / 60) + ":" + String(ganz % 60).padStart(2, "0");
}

// ---------- Spielablauf (DOM erst ab hier, innerhalb von starte) ----------

export function starte(api) {
  let level = STANDARD_LEVEL;
  let karten = [], zustand = [], offene = [];
  let zuege = 0, gefundene = 0, gesperrt = false;
  let zeit = 0, uhrLaeuft = false, deckTimer = 0;

  api.neustartCb(() => neuesSpiel(level));
  neuesSpiel(level);

  function neuesSpiel(neuesLevel) {
    level = neuesLevel;
    clearTimeout(deckTimer);
    api.loopStopp();
    karten = baueBrett(level, Math.random);
    zustand = karten.map(() => "zu");
    offene = []; zuege = 0; gefundene = 0; gesperrt = false;
    zeit = 0; uhrLaeuft = false;
    api.setzePunkte(0);
    api.setzeZeit("0:00");
    api.versteckePanel();
    zeichneBrett();
  }

  function zeichneBrett() {
    const def = LEVEL[level];
    const leiste = [1, 2, 3].map(l => {
      const d = LEVEL[l];
      const aktiv = l === level;
      const stern = l === STANDARD_LEVEL ? " ★" : "";
      return `<button type="button" class="knopf${aktiv ? "" : " zweitrangig"} mk-level" data-level="${l}" aria-pressed="${aktiv}">${d.name} · ${d.spalten}×${d.zeilen}${stern}</button>`;
    }).join("");
    const feld = karten.map((k, i) =>
      `<button type="button" class="mk-karte" data-i="${i}" aria-label="Karte ${i + 1} von ${karten.length}, verdeckt">` +
        `<span class="mk-innen" aria-hidden="true"><span class="mk-rueck">?</span><span class="mk-vorn">${k.html}</span></span>` +
        `<span class="mk-haken" aria-hidden="true">✓</span></button>`).join("");
    api.flaeche.innerHTML =
      `<div class="mk-leiste" role="group" aria-label="Feldgröße wählen">${leiste}</div>` +
      `<div class="mk-raster${api.reduzierteBewegung ? " mk-reduziert" : ""}" style="--mk-spalten:${def.spalten}">${feld}</div>` +
      `<p class="mk-status" role="status">Finde je zwei gleiche Motive — das ★-Level zählt für die Bestenliste.</p>`;
    api.flaeche.querySelector(".mk-leiste").addEventListener("click", ev => {
      const knopf = ev.target.closest(".mk-level");
      if (knopf) neuesSpiel(Number(knopf.dataset.level));
    });
    api.flaeche.querySelector(".mk-raster").addEventListener("click", ev => {
      const knopf = ev.target.closest(".mk-karte");
      if (knopf) deckeAuf(Number(knopf.dataset.i));
    });
  }

  function kartenKnopf(i) {
    return api.flaeche.querySelector(`.mk-karte[data-i="${i}"]`);
  }

  function setzeStatus(text) {
    const el = api.flaeche.querySelector(".mk-status");
    if (el) el.textContent = text;
  }

  function zeigeKarte(i, offen) {
    zustand[i] = offen ? "offen" : "zu";
    const knopf = kartenKnopf(i);
    if (!knopf) return;
    knopf.classList.toggle("offen", offen);
    knopf.setAttribute("aria-label", offen ? karten[i].beschriftung : `Karte ${i + 1} von ${karten.length}, verdeckt`);
  }

  function markiereGefunden(i) {
    zustand[i] = "fertig";
    const knopf = kartenKnopf(i);
    if (!knopf) return;
    knopf.classList.add("gefunden");
    knopf.setAttribute("aria-disabled", "true");
    knopf.setAttribute("aria-label", `${karten[i].beschriftung} — Paar gefunden`);
  }

  function deckeAuf(i) {
    if (gesperrt || zustand[i] !== "zu" || offene.length >= 2) return;
    if (!uhrLaeuft) {
      uhrLaeuft = true;
      api.loop(dt => { zeit += dt; api.setzeZeit(formatZeit(zeit)); });
    }
    zeigeKarte(i, true);
    offene.push(i);
    if (offene.length < 2) return;
    zuege += 1; // ein Zug = ein aufgedecktes Kartenpaar
    api.setzePunkte(zuege);
    const a = offene[0], b = offene[1];
    if (istPaar(karten[a], karten[b])) {
      offene = [];
      markiereGefunden(a);
      markiereGefunden(b);
      gefundene += 1;
      setzeStatus(`✓ Paar gefunden: ${karten[a].beschriftung}!`);
      if (gefundene === LEVEL[level].paare) rundeVorbei();
    } else {
      gesperrt = true;
      setzeStatus("✗ Kein Paar — merk dir die beiden Karten!");
      deckTimer = setTimeout(() => {
        zeigeKarte(a, false);
        zeigeKarte(b, false);
        offene = [];
        gesperrt = false;
      }, 900);
    }
  }

  function rundeVorbei() {
    api.loopStopp();
    uhrLaeuft = false;
    const def = LEVEL[level];
    const std = LEVEL[STANDARD_LEVEL];
    setzeStatus(`Geschafft! Alle ${def.paare} Paare in ${zuege} Zügen.`);
    const info = `<p>Feld ${def.name} (${def.spalten}×${def.zeilen}) · Zeit: <b>${formatZeit(zeit)}</b> · Bestmöglich wären ${def.paare} Züge.</p>`;
    if (level === STANDARD_LEVEL) {
      // Nur hier: Gerüst-Panel mit Bestenlisten-Eintrag (weniger Züge = besser)
      api.vorbei(zuege, info);
    } else {
      // Andere Feldgrößen: eigenes Panel ohne Bestenlisten-Eintrag
      api.zeigePanel(
        `<h2>Geschafft!</h2>` +
        `<p class="sp-endstand">Züge: <b>${zuege}</b></p>` + info +
        `<p>In die Bestenliste kommst du nur im Feld ${std.name} · ${std.spalten}×${std.zeilen} ★ — dort sind die Züge fair vergleichbar.</p>` +
        `<div class="sp-panel-knoepfe"><button type="button" class="knopf" id="mk-nochmal">Nochmal spielen</button></div>`);
      const nochmal = document.getElementById("mk-nochmal");
      if (nochmal) {
        nochmal.addEventListener("click", () => neuesSpiel(level));
        nochmal.focus();
      }
    }
  }
}
