// spiel.js — Bruch-Paare (Trainingsraum): Memory mit Wertepaaren in
// verschiedenen Darstellungen — Bruch, Dezimalzahl, Prozent, Kreisbild und
// gekürzter Bruch. Läuft im gemeinsamen Spiel-Gerüst (assets/js/spiel/geruest.js).
//
// Reine Logik (LEVEL, POOLS, wertVon, mische, baueBrett, istPaar, formatZeit,
// erzeugeRng) ist exportiert und in Node testbar: Auf Modulebene wird kein
// document/window angefasst — DOM nur innerhalb von starte().

export const manifest = {
  id: "ls-bruch-paare",
  titel: "Bruch-Paare",
  kurz: "Memory mit Köpfchen: Finde die Paare aus Bruch, Dezimalzahl, Prozent und Anteilsbild.",
  punkteLabel: "Züge",
  punkteEinheit: "",
  highscore: true,
  hsRichtung: "aufsteigend", // weniger Züge = besser
  zeigeZeit: true,
  steuerungHinweis: "Karten antippen oder anklicken."
};

// Nur das mittlere Level schreibt in die Bestenliste — Züge sind nur bei
// gleicher Brettgröße fair vergleichbar.
export const STANDARD_LEVEL = 2;

export const LEVEL = {
  1: { name: "Leicht", spalten: 4, zeilen: 3, paare: 6 },
  2: { name: "Mittel", spalten: 4, zeilen: 4, paare: 8 },
  3: { name: "Schwer", spalten: 5, zeilen: 4, paare: 10 }
};

// ---------- Wertepaare (reine Daten) ----------
// Kurzschreibweisen für Darstellungen desselben Werts:
function B(z, n) { return { art: "bruch", z, n }; }           // Bruch z/n
function D(text, z, n) { return { art: "dezimal", text, z, n }; } // Dezimaltext, Wert z/n
function P(p) { return { art: "prozent", p }; }               // p %  (Wert p/100)
function K(z, n) { return { art: "kreis", z, n }; }           // Kreisbild: z von n Teilen

// Pro Level ein Pool aus Paaren [Darstellung A, Darstellung B] desselben Werts.
// Wichtig: Innerhalb eines Pools kommt jeder WERT genau einmal vor — sonst
// gäbe es auf dem Brett mehrdeutige „Paare“.
export const POOLS = {
  // Level 1: nur Halbe-, Viertel- und Drittel-Familie (6 Paare = ganzer Pool)
  1: [
    [B(1, 2), K(1, 2)],
    [B(1, 4), D("0,25", 1, 4)],
    [B(3, 4), D("0,75", 3, 4)],
    [B(1, 3), K(1, 3)],
    [B(2, 3), K(2, 3)],
    [B(4, 4), D("1", 1, 1)] // 4 Viertel = 1 Ganzes
  ],
  // Level 2: zusätzlich Achtel und Fünftel sowie Prozent-Darstellungen
  2: [
    [B(1, 2), P(50)],
    [B(1, 4), K(1, 4)],
    [B(3, 4), P(75)],
    [B(1, 3), K(1, 3)],
    [B(2, 3), K(2, 3)],
    [B(1, 5), D("0,2", 1, 5)],
    [B(2, 5), P(40)],
    [B(3, 5), D("0,6", 3, 5)],
    [B(4, 5), P(80)],
    [B(1, 8), D("0,125", 1, 8)],
    [B(3, 8), K(3, 8)],
    [B(5, 8), D("0,625", 5, 8)],
    [B(7, 8), K(7, 8)]
  ],
  // Level 3: zusätzlich Kürzen-Paare (ungekürzter Bruch <-> gekürzter Bruch)
  3: [
    [B(5, 10), B(1, 2)],
    [B(2, 8), B(1, 4)],
    [B(6, 8), B(3, 4)],
    [B(2, 6), B(1, 3)],
    [B(4, 6), B(2, 3)],
    [B(4, 10), B(2, 5)],
    [B(6, 10), B(3, 5)],
    [B(1, 5), P(20)],
    [B(4, 5), D("0,8", 4, 5)],
    [B(1, 8), K(1, 8)],
    [B(3, 8), K(3, 8)],
    [B(5, 8), D("0,625", 5, 8)],
    [B(7, 8), K(7, 8)]
  ]
};

// Wert einer Darstellung als Bruch wz/wn (exakt, für Vergleich und Tests).
export function wertVon(d) {
  if (d.art === "prozent") return { wz: d.p, wn: 100 };
  return { wz: d.z, wn: d.n };
}

// Zwei Karten sind ein Paar, wenn ihre Werte gleich sind. Kreuzprodukt statt
// Division: exakte Bruch-Arithmetik ohne Rundungsfehler. Symmetrisch.
export function istPaar(a, b) {
  return !!a && !!b && a.wz * b.wn === b.wz * a.wn;
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

// Kreissektor-Bild: z von n Teilen gefärbt (Inline-SVG, erbt currentColor
// über die Klassen bp-rand/bp-voll/bp-linien aus dem Seiten-Stylesheet).
export function kreisSvg(z, n) {
  const r = 44;
  let sektor = "";
  if (z >= n) {
    sektor = `<circle class="bp-voll" cx="50" cy="50" r="${r}"/>`;
  } else if (z > 0) {
    const w = 2 * Math.PI * z / n;
    const x = (50 + r * Math.sin(w)).toFixed(2);
    const y = (50 - r * Math.cos(w)).toFixed(2);
    const gross = w > Math.PI ? 1 : 0;
    sektor = `<path class="bp-voll" d="M50 50 L50 ${50 - r} A${r} ${r} 0 ${gross} 1 ${x} ${y} Z"/>`;
  }
  let linien = "";
  for (let i = 0; i < n; i++) {
    const w = 2 * Math.PI * i / n;
    linien += `<line x1="50" y1="50" x2="${(50 + r * Math.sin(w)).toFixed(2)}" y2="${(50 - r * Math.cos(w)).toFixed(2)}"/>`;
  }
  return `<svg class="bp-kreis" viewBox="0 0 100 100" aria-hidden="true">` +
    `<circle class="bp-rand" cx="50" cy="50" r="${r}"/>${sektor}<g class="bp-linien">${linien}</g></svg>`;
}

// Anzeige-HTML einer Darstellung (reine Strings, kein DOM nötig).
export function kartenHtml(d) {
  if (d.art === "bruch") return `<span class="bp-bruch"><span class="bp-z">${d.z}</span><span class="bp-n">${d.n}</span></span>`;
  if (d.art === "dezimal") return `<span class="bp-zahl">${d.text}</span>`;
  if (d.art === "prozent") return `<span class="bp-zahl">${d.p}&nbsp;%</span>`;
  return kreisSvg(d.z, d.n);
}

// Vorlese-Text (aria-label) einer Darstellung.
export function beschreibe(d) {
  if (d.art === "bruch") return `Bruch ${d.z}/${d.n}`;
  if (d.art === "dezimal") return `Dezimalzahl ${d.text}`;
  if (d.art === "prozent") return `${d.p} Prozent`;
  return `Kreisbild: ${d.z} von ${d.n} Teilen gefärbt`;
}

// Brett bauen: Paare aus dem Level-Pool ziehen, in Karten auflösen, mischen.
export function baueBrett(level, rng = Math.random) {
  const def = LEVEL[level] || LEVEL[STANDARD_LEVEL];
  const pool = POOLS[level] || POOLS[STANDARD_LEVEL];
  const auswahl = mische(pool, rng).slice(0, def.paare);
  const karten = [];
  auswahl.forEach((paar, i) => {
    paar.forEach(d => {
      const w = wertVon(d);
      karten.push({ paarId: i, art: d.art, wz: w.wz, wn: w.wn, html: kartenHtml(d), beschriftung: beschreibe(d) });
    });
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
      `<div class="mk-leiste" role="group" aria-label="Brettgröße wählen">${leiste}</div>` +
      `<div class="mk-raster${api.reduzierteBewegung ? " mk-reduziert" : ""}" style="--mk-spalten:${def.spalten}">${feld}</div>` +
      `<p class="mk-status" role="status">Finde je zwei Karten mit demselben Wert — das ★-Level zählt für die Bestenliste.</p>`;
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
      setzeStatus(`✓ Paar gefunden: ${karten[a].beschriftung} = ${karten[b].beschriftung}`);
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
    const info = `<p>Level ${def.name} (${def.spalten}×${def.zeilen}) · Zeit: <b>${formatZeit(zeit)}</b> · Bestmöglich wären ${def.paare} Züge.</p>`;
    if (level === STANDARD_LEVEL) {
      // Nur hier: Gerüst-Panel mit Bestenlisten-Eintrag (weniger Züge = besser)
      api.vorbei(zuege, info);
    } else {
      // Andere Brettgrößen: eigenes Panel ohne Bestenlisten-Eintrag
      api.zeigePanel(
        `<h2>Geschafft!</h2>` +
        `<p class="sp-endstand">Züge: <b>${zuege}</b></p>` + info +
        `<p>In die Bestenliste kommst du nur im Level ${std.name} · ${std.spalten}×${std.zeilen} ★ — dort sind die Züge fair vergleichbar.</p>` +
        `<div class="sp-panel-knoepfe"><button type="button" class="knopf" id="mk-nochmal">Nochmal spielen</button></div>`);
      const nochmal = document.getElementById("mk-nochmal");
      if (nochmal) {
        nochmal.addEventListener("click", () => neuesSpiel(level));
        nochmal.focus();
      }
    }
  }
}
