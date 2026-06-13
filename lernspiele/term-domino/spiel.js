// spiel.js — Term-Domino (Trainingsraum): Vereinfachungskette als Dominospiel.
// Jeder Stein trägt links einen VEREINFACHTEN Term und rechts einen neuen,
// unvereinfachten Term. An die Kette passt genau der Stein, dessen linke
// Hälfte die Vereinfachung des offenen rechten Endes ist. Drei Level mit je
// 10 Steinen; jede Kette hat genau eine gültige Reihenfolge (kettePruefen).
//
// Die reine Logik (Mini-Termparser, Äquivalenzprüfung, Kettenprüfung) liegt
// ohne DOM-Zugriffe auf Modulebene und ist in Node testbar. Alles mit
// document/Eingaben passiert erst in starte(api) über das gemeinsame Gerüst
// (assets/js/spiel/geruest.js).

export const manifest = {
  id: "ls-term-domino",
  titel: "Term-Domino",
  kurz: "Lege die Kette: Es passt der Stein, dessen linke Hälfte das offene Ende vereinfacht.",
  punkteLabel: "Fehlversuche",
  punkteEinheit: "",
  hsRichtung: "aufsteigend",
  highscore: true,
  zeigeZeit: true,
  steuerungHinweis: "Tippe den Stein an, der an das offene Ende passt."
};

// ---------- Steinsätze ----------
// Die Steine stehen hier in Kettenreihenfolge (Stein 0 = Startstein); die
// Auslage wird im Spiel gemischt. Pro Level gilt: linke Hälften paarweise
// nicht gleichwertig, jede rechte Hälfte passt auf genau eine linke Hälfte
// (die des Nachfolgers), die letzte rechte Hälfte auf gar keine — damit ist
// die Reihenfolge eindeutig und zyklenfrei (siehe kettePruefen).

export const LEVELS = [
  {
    nr: 1, name: "Zusammenfassen", bestenliste: false,
    hinweis: "Fasse gleichartige Terme zusammen: 3x + 2x = 5x.",
    steine: [
      { l: "2x",     r: "3x + 2x" },
      { l: "5x",     r: "7a − 4a" },
      { l: "3a",     r: "x + x + x" },
      { l: "3x",     r: "5a + 2a" },
      { l: "7a",     r: "9x − 5x" },
      { l: "4x",     r: "2x + 3 + x" },
      { l: "3x + 3", r: "6a − a" },
      { l: "5a",     r: "4x + 5 − 2x" },
      { l: "2x + 5", r: "8a + 2a − 4a" },
      { l: "6a",     r: "10x − 3x − 7" }
    ]
  },
  {
    nr: 2, name: "Ausmultiplizieren", bestenliste: true,
    hinweis: "Löse die Klammer mit dem Distributivgesetz: 3·(2x + 1) = 6x + 3.",
    steine: [
      { l: "x + 1",    r: "3·(2x + 1)" },
      { l: "6x + 3",   r: "2·(4x − 3)" },
      { l: "8x − 6",   r: "5·(x + 4)" },
      { l: "5x + 20",  r: "4·(2a + 5)" },
      { l: "8a + 20",  r: "(3x + 2)·2" },
      { l: "6x + 4",   r: "6·(2x − 1)" },
      { l: "12x − 6",  r: "3·(3a − 4)" },
      { l: "9a − 12",  r: "7·(x + 2)" },
      { l: "7x + 14",  r: "2·(5x + 3)" },
      { l: "10x + 6",  r: "4·(3x − 2)" }
    ]
  },
  {
    nr: 3, name: "Minusklammer & Ausklammern", bestenliste: false,
    hinweis: "Minusklammern drehen jedes Vorzeichen: −(x − 4) = −x + 4. Und rückwärts wird ausgeklammert: 6x + 9 = 3·(2x + 3).",
    steine: [
      { l: "x + 2",       r: "−(x − 4)" },
      { l: "−x + 4",      r: "6x + 9" },
      { l: "3·(2x + 3)",  r: "5x − (2x − 3)" },
      { l: "3x + 3",      r: "8a + 12" },
      { l: "4·(2a + 3)",  r: "−(3x + 5)" },
      { l: "−3x − 5",     r: "10x − 15" },
      { l: "5·(2x − 3)",  r: "7a − (a + 6)" },
      { l: "6a − 6",      r: "9x + 6" },
      { l: "3·(3x + 2)",  r: "4x − (x − 1)" },
      { l: "3x + 1",      r: "12a − 8" }
    ]
  }
];

// ---------- Mini-Termparser (rein, ohne eval) ----------
// Versteht +, −, ·, Klammern, ganze Zahlen und eine Variable (Buchstabe);
// implizite Multiplikation wie "3x" oder "2(x + 1)" wird erkannt.

export function variablenVon(term) {
  const menge = new Set((String(term).match(/[a-zäöü]/gi) || []).map(z => z.toLowerCase()));
  return [...menge];
}

export function bewerteTerm(term, wert) {
  // Normalisieren: typografisches Minus, Malzeichen, Variable → "v", Leerraum weg
  const t = String(term)
    .replace(/−/g, "-")
    .replace(/[·*×]/g, "*")
    .replace(/[a-zäöü]/gi, "v")
    .replace(/\s+/g, "");
  let pos = 0;

  function ausdruck() {
    let links = summand();
    while (t[pos] === "+" || t[pos] === "-") {
      const op = t[pos]; pos++;
      const rechts = summand();
      links = op === "+" ? links + rechts : links - rechts;
    }
    return links;
  }
  function summand() {
    let produkt = faktor();
    for (;;) {
      if (t[pos] === "*") { pos++; produkt *= faktor(); }
      else if (t[pos] === "v" || t[pos] === "(") { produkt *= faktor(); } // implizite Multiplikation
      else break;
    }
    return produkt;
  }
  function faktor() {
    if (t[pos] === "-") { pos++; return -faktor(); }
    if (t[pos] === "(") {
      pos++;
      const innen = ausdruck();
      if (t[pos] !== ")") throw new Error("Schließende Klammer fehlt in: " + term);
      pos++;
      return innen;
    }
    if (t[pos] === "v") { pos++; return wert; }
    if (/[0-9]/.test(t[pos] || "")) {
      let ziffern = "";
      while (/[0-9]/.test(t[pos] || "")) { ziffern += t[pos]; pos++; }
      if (t[pos] === "," || t[pos] === ".") {
        ziffern += "."; pos++;
        while (/[0-9]/.test(t[pos] || "")) { ziffern += t[pos]; pos++; }
      }
      return Number(ziffern);
    }
    throw new Error("Unerwartetes Zeichen \"" + (t[pos] || "(Ende)") + "\" in: " + term);
  }

  const ergebnis = ausdruck();
  if (pos !== t.length) throw new Error("Unverarbeiteter Rest in: " + term);
  return ergebnis;
}

// Prüfstellen laut Konzept: Termwerte an x ∈ {2, 3, 7} (bzw. a) vergleichen.
export const PRUEFWERTE = [2, 3, 7];

export function aequivalent(termA, termB) {
  const va = variablenVon(termA), vb = variablenVon(termB);
  if (va.length > 1 || vb.length > 1) return false;          // nur eine Variable pro Term
  if (va.length === 1 && vb.length === 1 && va[0] !== vb[0]) return false; // 3a ≠ 3x
  return PRUEFWERTE.every(w => Math.abs(bewerteTerm(termA, w) - bewerteTerm(termB, w)) < 1e-9);
}

// Prüft konstruktiv, dass ein Steinsatz GENAU eine gültige Kette bildet:
// linke Hälften paarweise verschieden, jede rechte Hälfte hat genau einen
// passenden linken Nachfolger (außer dem Endstein: keinen), jede linke Hälfte
// genau einen Vorgänger (außer Stein 0: keinen) — und der Lauf ab Stein 0
// erreicht alle 10 Steine ohne Zyklus.
export function kettePruefen(steine) {
  if (!Array.isArray(steine) || steine.length !== 10) {
    return { ok: false, grund: "Es müssen genau 10 Steine sein." };
  }
  for (let i = 0; i < steine.length; i++) {
    for (let j = i + 1; j < steine.length; j++) {
      if (aequivalent(steine[i].l, steine[j].l)) {
        return { ok: false, grund: "Linke Hälften von Stein " + i + " und " + j + " sind gleichwertig." };
      }
    }
  }
  const indizes = steine.map((s, i) => i);
  const nachfolger = steine.map((s, i) =>
    indizes.filter(j => j !== i && aequivalent(steine[i].r, steine[j].l)));
  const vorgaenger = steine.map((s, j) =>
    indizes.filter(i => i !== j && aequivalent(steine[i].r, steine[j].l)));

  const enden = indizes.filter(i => nachfolger[i].length === 0);
  if (enden.length !== 1) {
    return { ok: false, grund: "Es muss genau einen Endstein geben, gefunden: " + enden.length + "." };
  }
  for (const i of indizes) {
    if (i !== enden[0] && nachfolger[i].length !== 1) {
      return { ok: false, grund: "Stein " + i + " hat " + nachfolger[i].length + " mögliche Nachfolger." };
    }
  }
  const starts = indizes.filter(j => vorgaenger[j].length === 0);
  if (starts.length !== 1 || starts[0] !== 0) {
    return { ok: false, grund: "Genau Stein 0 muss Startstein sein (linke Hälfte ohne Vorgänger)." };
  }
  for (const j of indizes) {
    if (j !== 0 && vorgaenger[j].length !== 1) {
      return { ok: false, grund: "Stein " + j + " hat " + vorgaenger[j].length + " mögliche Vorgänger." };
    }
  }
  const reihenfolge = [0];
  const besucht = new Set([0]);
  let aktuell = 0;
  while (nachfolger[aktuell].length === 1) {
    const naechster = nachfolger[aktuell][0];
    if (besucht.has(naechster)) return { ok: false, grund: "Zyklus in der Kette." };
    reihenfolge.push(naechster);
    besucht.add(naechster);
    aktuell = naechster;
  }
  if (reihenfolge.length !== steine.length) {
    return { ok: false, grund: "Die Kette erreicht nur " + reihenfolge.length + " von 10 Steinen." };
  }
  return { ok: true, reihenfolge };
}

// Fisher-Yates-Mischung (zufall injizierbar, damit testbar)
export function mische(liste, zufall = Math.random) {
  const kopie = [...liste];
  for (let i = kopie.length - 1; i > 0; i--) {
    const j = Math.floor(zufall() * (i + 1));
    [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
  }
  return kopie;
}

export function formatZeit(sekunden) {
  const min = Math.floor(sekunden / 60);
  const sek = Math.floor(sekunden % 60);
  return min + ":" + String(sek).padStart(2, "0");
}

// ---------- Darstellung & Spielablauf (nur hier wird das DOM angefasst) ----------

const STIL = `
  .td-innen { padding: 14px; display: grid; gap: 12px; }
  .td-level-zeile { display: flex; flex-wrap: wrap; gap: 8px; }
  .td-hinweis { margin: 0; color: var(--text-leise); }
  .td-status { margin: 0; font-weight: 600; min-height: 1.5em; }
  .td-kette { display: flex; flex-wrap: wrap; align-items: center; gap: 4px; }
  .td-stein { display: inline-flex; align-items: stretch; border: 2px solid var(--linie);
    border-radius: 8px; background: var(--flaeche); overflow: hidden; font: inherit;
    font-weight: 600; color: var(--text); padding: 0; font-size: 1.02rem; }
  .td-h { display: flex; align-items: center; padding: 8px 12px; min-height: var(--beruehrziel); box-sizing: border-box; }
  .td-links { background: var(--hauch); border-right: 2px dashed var(--linie); }
  .td-offen { box-shadow: inset 0 0 0 3px var(--akzent); }
  .td-frage { font-weight: 700; color: var(--akzent); padding: 0 4px; font-size: 1.1rem; }
  button.td-wahl { cursor: pointer; }
  button.td-wahl:hover .td-links { background: var(--linie); }
  button.td-wahl:focus-visible { outline: 3px solid var(--akzent); outline-offset: 2px; }
  .td-auslage-titel { margin: 0; color: var(--text-leise); }
  .td-auslage { display: flex; flex-wrap: wrap; gap: 10px; }
  @keyframes td-wackeln { 0%, 100% { transform: translateX(0); } 25% { transform: translateX(-5px); } 75% { transform: translateX(5px); } }
  .td-wackelt { animation: td-wackeln 0.4s ease 1; }
  @media (prefers-reduced-motion: reduce) { .td-wackelt { animation: none; } }
`;

export function starte(api) {
  const flaeche = api.flaeche;
  let levelIdx = 1;        // Level 2 (Ausmultiplizieren) ist das Standard-Level mit Bestenliste
  let gelegt = 1;          // der Startstein liegt schon
  let fehlversuche = 0;
  let zeit = 0;
  let uhrLaeuft = false;
  let fertig = false;
  let auslage = [];

  api.neustartCb(() => starteLevel(levelIdx));
  starteLevel(levelIdx);

  function starteLevel(idx) {
    levelIdx = idx;
    gelegt = 1; fehlversuche = 0; zeit = 0; uhrLaeuft = false; fertig = false;
    api.loopStopp();
    api.versteckePanel();
    api.setzePunkte(0);
    api.setzeZeit("0:00");
    auslage = mische(LEVELS[idx].steine.map((s, i) => i).slice(1));
    baueUi();
  }

  function offenesEnde() { return LEVELS[levelIdx].steine[gelegt - 1].r; }

  function baueUi() {
    const level = LEVELS[levelIdx];
    flaeche.innerHTML = `
      <style>${STIL}</style>
      <div class="td-innen">
        <div class="td-level-zeile" role="group" aria-label="Level wählen">
          ${LEVELS.map((lv, i) =>
            `<button type="button" class="knopf${i === levelIdx ? "" : " zweitrangig"}" data-level="${i}" aria-pressed="${i === levelIdx}">Level ${lv.nr}: ${lv.name}${lv.bestenliste ? " ★" : ""}</button>`).join("")}
        </div>
        <p class="td-hinweis">${level.hinweis} ${level.bestenliste ? "★ Standard-Level — nur hier zählt die Bestenliste." : "Übungslevel ohne Bestenlisten-Eintrag."}</p>
        <p class="td-status" role="status" id="td-status"></p>
        <div class="td-kette" id="td-kette" aria-label="Gelegte Kette"></div>
        <p class="td-auslage-titel" id="td-auslage-titel">Auslage — tippe den passenden Stein:</p>
        <div class="td-auslage" id="td-auslage" aria-labelledby="td-auslage-titel"></div>
      </div>`;
    flaeche.querySelectorAll("[data-level]").forEach(knopf =>
      knopf.addEventListener("click", () => starteLevel(Number(knopf.dataset.level))));
    zeichne();
    setzeStatus("Der Startstein liegt. Offenes Ende: „" + offenesEnde() + "“ — welcher Stein zeigt links die Vereinfachung?");
  }

  function zeichne() {
    const level = LEVELS[levelIdx];
    const kette = flaeche.querySelector("#td-kette");
    kette.innerHTML = level.steine.slice(0, gelegt).map((s, i) =>
      `<span class="td-stein"><span class="td-h td-links">${s.l}</span><span class="td-h td-rechts${i === gelegt - 1 && !fertig ? " td-offen" : ""}">${s.r}</span></span>`
    ).join("") + (fertig ? "" : '<span class="td-frage" aria-hidden="true">+ ?</span>');
    const auslageEl = flaeche.querySelector("#td-auslage");
    auslageEl.innerHTML = auslage.map(i =>
      `<button type="button" class="td-stein td-wahl" data-stein="${i}"><span class="td-h td-links">${level.steine[i].l}</span><span class="td-h td-rechts">${level.steine[i].r}</span></button>`).join("");
    auslageEl.querySelectorAll("[data-stein]").forEach(knopf =>
      knopf.addEventListener("click", () => wahl(Number(knopf.dataset.stein), knopf)));
  }

  function setzeStatus(text) {
    const el = flaeche.querySelector("#td-status");
    if (el) el.textContent = text;
  }

  function wahl(idx, knopf) {
    if (fertig) return;
    const level = LEVELS[levelIdx];
    if (!uhrLaeuft) {
      uhrLaeuft = true;
      api.loop(dt => { zeit += dt; api.setzeZeit(formatZeit(zeit)); });
    }
    if (idx === gelegt) {
      gelegt += 1;
      auslage = auslage.filter(i => i !== idx);
      const meldung = "✓ Richtig: " + level.steine[idx - 1].r + " = " + level.steine[idx].l + ".";
      if (gelegt === level.steine.length) {
        zeichne();
        abschluss();
      } else {
        zeichne();
        setzeStatus(meldung + " Neues offenes Ende: „" + offenesEnde() + "“.");
      }
    } else {
      fehlversuche += 1;
      api.setzePunkte(fehlversuche);
      setzeStatus("✗ Fehlversuch: „" + level.steine[idx].l + "“ ist nicht die Vereinfachung von „" + offenesEnde() + "“. Probier es gleich nochmal!");
      if (!api.reduzierteBewegung && knopf) {
        knopf.classList.add("td-wackelt");
        setTimeout(() => knopf.classList.remove("td-wackelt"), 450);
      }
    }
  }

  function abschluss() {
    fertig = true;
    api.loopStopp();
    const level = LEVELS[levelIdx];
    const zeitText = formatZeit(zeit);
    const lob = fehlversuche === 0 ? "Fehlerfrei — ganz stark!"
      : fehlversuche <= 2 ? "Fast fehlerfrei — sehr gut!"
      : "Geschafft! Mit etwas Übung klappt es mit noch weniger Fehlversuchen.";
    setzeStatus("Alle " + level.steine.length + " Steine liegen! " + lob);
    if (level.bestenliste) {
      api.vorbei(fehlversuche, "<p>Level 2 (" + level.name + ") in " + zeitText + " min gelegt. " + lob + "</p>");
    } else {
      api.zeigePanel(`
        <h2>Kette komplett!</h2>
        <p class="sp-endstand">Fehlversuche: <b>${fehlversuche}</b> · Zeit: ${zeitText} min</p>
        <p>${lob} Die Bestenliste führt nur das Standard-Level 2 (Ausmultiplizieren), damit alle Einträge vergleichbar bleiben — Level ${level.nr} ist zum Üben da.</p>
        <div class="sp-panel-knoepfe">
          <button type="button" class="knopf" id="td-nochmal">Nochmal dieses Level</button>
          <button type="button" class="knopf zweitrangig" id="td-zu-level2">Level 2 mit Bestenliste</button>
        </div>`);
      const panel = flaeche.parentElement.querySelector("#sp-panel");
      panel.querySelector("#td-nochmal").addEventListener("click", () => starteLevel(levelIdx));
      panel.querySelector("#td-zu-level2").addEventListener("click", () => starteLevel(1));
      panel.querySelector("#td-nochmal").focus();
    }
  }
}
