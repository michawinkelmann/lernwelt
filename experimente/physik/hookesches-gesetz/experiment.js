// experiment.js — Interaktives Experiment: Hookesches Gesetz (Klasse 7/8).
// Realitätsnahe Messpraxis statt idealer Simulation: Massestücke anhängen,
// die Auslenkung an der mm-Skala SELBST ablesen und eintippen, Messreihe
// protokollieren, auswerten (D bestimmen), Grenzen erfahren (Überlast).
// Die kleine Messstreuung ist pro Feder/Masse deterministisch geseedet —
// dadurch bleiben die pruefFaelle analytisch testbar.

const G = 9.81; // m/s²

// ---------- Federn (die "unbekannte" Feder ist das Messziel) ----------
export const FEDERN = [
  { id: "A", name: "Feder A (weich)", d: 25, maxKraft: 5.0, laenge0: 80 },   // D in N/m, Ruhelänge in mm (gezeichnet)
  { id: "B", name: "Feder B (mittel)", d: 40, maxKraft: 6.5, laenge0: 80 },
  { id: "X", name: "Feder X (unbekannt)", d: 32, maxKraft: 5.5, laenge0: 80, geheim: true }
];

export const MASSEN = [50, 100, 200]; // verfügbare Massestücke in g (stapelbar)
export const MAX_ANHAENGEN = 6;       // Plätze am Haken

// ---------- deterministische Streuung (Ablese-Realismus, testbar) ----------
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seedFuer(federId, gramm) {
  let s = 17;
  for (const z of federId + ":" + gramm) s = (s * 31 + z.charCodeAt(0)) >>> 0;
  return s;
}

// wahre Auslenkung in mm (Physik) + reproduzierbare "Fertigungs-/Ablesestreuung"
export function auslenkungIdeal(feder, gramm) {
  return (gramm / 1000) * G / feder.d * 1000; // mm
}
export function auslenkungReal(feder, gramm) {
  if (gramm === 0) return 0;
  const r = mulberry32(seedFuer(feder.id, gramm));
  const streu = (r() - 0.5) * 1.2; // ±0,6 mm
  return auslenkungIdeal(feder, gramm) + streu;
}
export function istUeberlastet(feder, gramm) {
  return (gramm / 1000) * G > feder.maxKraft;
}

// ---------- Mess-/Auswertelogik (rein, Node-testbar) ----------
export function kraftAus(gramm) { return (gramm / 1000) * G; } // N

// Ablesung gilt als sauber, wenn sie höchstens 1,5 mm neben dem realen Zeiger liegt
export const ABLESE_TOLERANZ_MM = 1.5;
export function ablesungOk(eingabeMm, wahrMm) {
  return Number.isFinite(eingabeMm) && Math.abs(eingabeMm - wahrMm) <= ABLESE_TOLERANZ_MM;
}

export function parseDezimal(text) {
  const n = Number(String(text).trim().replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

// Auswertung: D je Messzeile (N/m) und Mittelwert; s in mm, F in N
export function dAusZeile(kraftN, auslenkungMm) {
  if (!(auslenkungMm > 0)) return NaN;
  return kraftN / (auslenkungMm / 1000);
}
export function dMittel(zeilen) {
  const werte = zeilen.map(z => dAusZeile(z.kraft, z.gemessenMm)).filter(Number.isFinite);
  if (!werte.length) return NaN;
  return werte.reduce((a, b) => a + b, 0) / werte.length;
}
export function bewertungD(dGemessen, dWahr) {
  const abw = Math.abs(dGemessen - dWahr) / dWahr * 100;
  if (abw <= 4) return { stufe: "sehr gut", abw };
  if (abw <= 10) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}

// ---------- Prüffälle (für validierungs-/Node-Läufe; Streuung eingerechnet) ----------
export const pruefFaelle = [
  { feder: "A", gramm: 200, soll: { ideal: 78.48 }, toleranzProzent: 0.2 },
  { feder: "B", gramm: 300, soll: { ideal: 73.575 }, toleranzProzent: 0.2 },
  { feder: "X", gramm: 150, soll: { ideal: 45.984 }, toleranzProzent: 0.2 },
  // Realwert weicht nie mehr als 0,6 mm vom Idealwert ab:
  { feder: "A", gramm: 100, soll: { realNah: 0.6 } },
  { feder: "X", gramm: 450, soll: { ueberlast: 0 } },   // 4,41 N < 5,5 N → keine Überlast
  { feder: "A", gramm: 600, soll: { ueberlast: 1 } }    // 5,89 N > 5,0 N → Überlast
];

export const TESTS = [
  { name: "Ideal A/200g = 78,48 mm", ok: () => Math.abs(auslenkungIdeal(FEDERN[0], 200) - 78.48) < 0.01 },
  { name: "Real deterministisch", ok: () => auslenkungReal(FEDERN[0], 200) === auslenkungReal(FEDERN[0], 200) },
  { name: "Real nahe Ideal (alle Kombis)", ok: () => FEDERN.every(f => [50,100,150,200,250,300,350,400,450,500].every(g => Math.abs(auslenkungReal(f, g) - auslenkungIdeal(f, g)) <= 0.61)) },
  { name: "Ablesung ±1,5 mm", ok: () => ablesungOk(78.0, 78.9) && !ablesungOk(76.0, 78.9) && !ablesungOk(NaN, 78.9) },
  { name: "parseDezimal Komma/Punkt", ok: () => parseDezimal("78,5") === 78.5 && parseDezimal("78.5") === 78.5 && Number.isNaN(parseDezimal("abc")) },
  { name: "D aus idealer Reihe exakt", ok: () => FEDERN.every(f => { const zeilen = [100,200,300].map(g => ({ kraft: kraftAus(g), gemessenMm: auslenkungIdeal(f, g) })); return Math.abs(dMittel(zeilen) - f.d) < 1e-9; }) },
  { name: "D aus realer Reihe < 4 % daneben", ok: () => FEDERN.every(f => { const zeilen = [100,200,300,400].map(g => ({ kraft: kraftAus(g), gemessenMm: auslenkungReal(f, g) })); return bewertungD(dMittel(zeilen), f.d).abw < 4; }) },
  { name: "Überlastgrenzen", ok: () => !istUeberlastet(FEDERN[2], 450) && istUeberlastet(FEDERN[0], 600) && istUeberlastet(FEDERN[1], 700) },
  { name: "Prüffälle konsistent", ok: () => pruefFaelle.every(p => { const f = FEDERN.find(x => x.id === p.feder); if (p.soll.ideal !== undefined) return Math.abs(auslenkungIdeal(f, p.gramm) - p.soll.ideal) / p.soll.ideal * 100 <= p.toleranzProzent; if (p.soll.realNah !== undefined) return Math.abs(auslenkungReal(f, p.gramm) - auslenkungIdeal(f, p.gramm)) <= p.soll.realNah; return (istUeberlastet(f, p.gramm) ? 1 : 0) === p.soll.ueberlast; }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;

  const zustand = {
    feder: FEDERN[0],
    angehaengt: [],          // Liste der Massestücke (g)
    kaputt: false,
    zeigerMm: 0,             // aktuelle reale Auslenkung
    animVon: 0, animZiel: 0, animStart: 0,
    messungen: [],           // {gramm, kraft, gemessenMm}
    phase: "aufbau"
  };

  wurzel.innerHTML = `
    <div class="exp-phasen" role="tablist" aria-label="Phasen des Experiments">
      <button role="tab" data-phase="aufbau" aria-selected="true">1 · Aufbau</button>
      <button role="tab" data-phase="messen" aria-selected="false">2 · Durchführung</button>
      <button role="tab" data-phase="auswerten" aria-selected="false">3 · Auswertung</button>
    </div>
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="640" aria-label="Versuchsaufbau: Stativ mit Feder, Zeiger und Millimeterskala. Unten anhängbare Massestücke."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`;

  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");
  const tabs = [...wurzel.querySelectorAll('[role="tab"]')];

  const farbe = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#333";

  function grammGesamt() { return zustand.angehaengt.reduce((a, b) => a + b, 0); }

  function setzeZiel() {
    const g = grammGesamt();
    if (!zustand.kaputt && istUeberlastet(zustand.feder, g)) {
      zustand.kaputt = true;
      zustand.animZiel = auslenkungIdeal(zustand.feder, g) * 1.6; // sichtbar überdehnt
    } else if (!zustand.kaputt) {
      zustand.animZiel = auslenkungReal(zustand.feder, g);
    }
    zustand.animVon = zustand.zeigerMm;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.zeigerMm = zustand.animZiel; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 450);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeigerMm = zustand.animVon + (zustand.animZiel - zustand.animVon) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler") || "#b33",
          cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2; ctx.strokeStyle = cText; ctx.fillStyle = cText;
    ctx.font = "13px system-ui, sans-serif";

    // Stativ
    ctx.fillRect(40, 20, 200, 8);                  // Ausleger
    ctx.fillRect(24, 20, 10, h - 60);              // Stange
    ctx.fillRect(10, h - 44, 120, 10);             // Fuß

    // Geometrie: Federaufhängung zuerst, damit der Skalen-Nullpunkt exakt
    // auf der Höhe des UNBELASTETEN Zeigers liegt (Ruhelage = 0 mm).
    const fx = 140, oben = 28;
    const skalaX = 250, px = 1.8;                  // 1 mm = 1,8 px
    const null0 = oben + zustand.feder.laenge0 * 1.2;
    const skalaMaxMm = 200;
    ctx.strokeStyle = cLeise; ctx.fillStyle = cLeise;
    const kastenH = skalaMaxMm * px + 38;
    ctx.strokeRect(skalaX, null0 - 20, 56, kastenH);
    ctx.fillStyle = cFlaeche; ctx.fillRect(skalaX + 1, null0 - 19, 54, kastenH - 2); ctx.fillStyle = cLeise;
    for (let mm = 0; mm <= skalaMaxMm; mm += 1) {
      const y = null0 + mm * px;
      const lang = mm % 10 === 0 ? 18 : (mm % 5 === 0 ? 12 : 7);
      ctx.beginPath(); ctx.moveTo(skalaX, y); ctx.lineTo(skalaX + lang, y);
      ctx.strokeStyle = mm % 10 === 0 ? cText : cLeise; ctx.stroke();
      if (mm % 10 === 0) { ctx.fillStyle = cText; ctx.fillText(String(mm), skalaX + 26, y + 4); ctx.fillStyle = cLeise; }
    }
    ctx.fillStyle = cText; ctx.fillText("mm", skalaX + 26, null0 - 26);

    // Feder (Zickzack) vom Ausleger bis Haken — Darstellung bei Überdehnung geklemmt
    const zeichenMm = Math.min(zustand.zeigerMm, skalaMaxMm + 10);
    const laengePx = zustand.feder.laenge0 * 1.2 + zeichenMm * px;
    const unten = oben + laengePx;
    ctx.strokeStyle = zustand.kaputt ? cFehler : cText; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx, oben);
    const windungen = 12;
    for (let i = 0; i <= windungen; i++) {
      const y = oben + (laengePx - 14) * (i / windungen);
      ctx.lineTo(fx + (i % 2 === 0 ? 14 : -14), y);
    }
    ctx.lineTo(fx, unten - 8); ctx.stroke();

    // Zeiger zur Skala
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(fx - 16, unten); ctx.lineTo(skalaX - 4, unten); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(skalaX - 4, unten); ctx.lineTo(skalaX - 12, unten - 5); ctx.lineTo(skalaX - 12, unten + 5); ctx.closePath();
    ctx.fillStyle = cAkzent; ctx.fill();

    // Haken + Massestücke
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx, unten - 8); ctx.lineTo(fx, unten + 6); ctx.arc(fx, unten + 12, 6, -Math.PI / 2, Math.PI / 2, false); ctx.stroke();
    let y = unten + 20;
    ctx.font = "12px system-ui, sans-serif";
    for (const g of zustand.angehaengt) {
      const bh = g === 50 ? 18 : g === 100 ? 26 : 38;
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(fx - 26, y, 52, bh, 4); else ctx.rect(fx - 26, y, 52, bh); ctx.fill(); ctx.stroke();
      ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(g + " g", fx, y + bh / 2 + 4); ctx.textAlign = "start";
      y += bh + 3;
    }
    if (zustand.kaputt) {
      ctx.fillStyle = cFehler; ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText("Überdehnt! Feder ist hinüber.", 30, h - 14);
    }
  }

  // ---------- Panels je Phase ----------
  const esc = s => String(s).replace(/[&<>"]/g, z => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[z]));

  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Am Stativ hängt eine Schraubenfeder. Der <strong>Zeiger</strong> an ihrem unteren Ende zeigt auf eine <strong>Millimeterskala</strong>; ohne Belastung steht er auf <strong>0 mm</strong>. Unten kannst du <strong>Massestücke</strong> (50 g, 100 g, 200 g) anhängen.</p>
      <p><strong>Plan:</strong> Hänge nacheinander verschiedene Massen an, lies die Auslenkung <em>s</em> jeweils selbst ab und trage sie in die Messtabelle ein. Aus <em>F</em> und <em>s</em> bestimmst du am Ende die Federkonstante <em>D</em>.</p>
      <p class="exp-hinweis">⚠ Echte Federn kann man überdehnen — auch hier: Mehr als die Feder verträgt, und sie bleibt krumm. Dann hilft nur eine neue Feder.</p>
      <label for="exp-feder"><strong>Feder wählen:</strong></label>
      <select id="exp-feder">${FEDERN.map((f, i) => `<option value="${i}">${esc(f.name)}${f.geheim ? "" : ` — D = ${f.d} N/m (Aufdruck)`}</option>`).join("")}</select>
      <p>Tipp: Starte mit Feder A und prüfe, ob deine Messung den Aufdruck bestätigt. Feder X ist die eigentliche Aufgabe — ihre Federkonstante kennt niemand.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-feder").value = String(FEDERN.indexOf(zustand.feder));
    panel.querySelector("#exp-feder").addEventListener("change", ev => {
      zustand.feder = FEDERN[Number(ev.target.value)];
      zustand.angehaengt = []; zustand.kaputt = false; zustand.messungen = [];
      setzeZiel();
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const g = grammGesamt();
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-masseknoepfe" aria-label="Massestücke anhängen">
        ${MASSEN.map(m => `<button class="knopf zweitrangig" data-masse="${m}">+ ${m} g</button>`).join("")}
        <button class="knopf zweitrangig" id="exp-leeren">Abnehmen</button>
        ${zustand.kaputt ? '<button class="knopf" id="exp-neuefeder">Neue Feder holen</button>' : ""}
      </div>
      <p>Angehängt: <strong id="exp-gesamt">${g} g</strong> → Gewichtskraft F = <strong>${(kraftAus(g)).toFixed(2).replace(".", ",")} N</strong> (g = 9,81 N/kg)</p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies die Skala ab — Auslenkung s in mm:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7" ${zustand.kaputt || g === 0 ? "disabled" : ""}>
        <button class="knopf" ${zustand.kaputt || g === 0 ? "disabled" : ""}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>m in g</th><th>F in N</th><th>s in mm</th></tr></thead>
      <tbody>${zustand.messungen.map(z => `<tr><td>${z.gramm}</td><td>${z.kraft.toFixed(2).replace(".", ",")}</td><td>${z.gemessenMm.toFixed(1).replace(".", ",")}</td></tr>`).join("") || '<tr><td colspan="3">noch leer</td></tr>'}</tbody></table>
      <p>${zustand.messungen.length} von mindestens 5 Messungen.</p>
      <button class="knopf" id="exp-weiter2" ${zustand.messungen.length >= 5 ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelectorAll("[data-masse]").forEach(k => k.addEventListener("click", () => {
      if (zustand.kaputt || zustand.angehaengt.length >= MAX_ANHAENGEN) return;
      zustand.angehaengt.push(Number(k.dataset.masse));
      setzeZiel(); panelMessen();
    }));
    panel.querySelector("#exp-leeren").addEventListener("click", () => {
      if (zustand.kaputt) return;
      zustand.angehaengt = []; setzeZiel(); panelMessen();
    });
    panel.querySelector("#exp-neuefeder")?.addEventListener("click", () => {
      zustand.kaputt = false; zustand.angehaengt = []; setzeZiel(); panelMessen();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const wahr = zustand.zeigerMm;
      const meldung = panel.querySelector("#exp-meldung");
      const gJetzt = grammGesamt();
      if (zustand.messungen.some(z => z.gramm === gJetzt)) {
        meldung.textContent = "Für diese Masse hast du schon gemessen — häng eine andere Kombination an.";
        return;
      }
      if (!ablesungOk(eingabe, wahr)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wo steht der Zeiger? (Auf 1 mm genau ablesen.)";
        return;
      }
      zustand.messungen.push({ gramm: gJetzt, kraft: kraftAus(gJetzt), gemessenMm: eingabe });
      meldung.textContent = "✓ Eingetragen.";
      panelMessen();
    });
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    const quotienten = zeilen.map(z => dAusZeile(z.kraft, z.gemessenMm));
    const d = dMittel(zeilen);
    const wahrD = zustand.feder.d;
    const bew = Number.isFinite(d) ? bewertungD(d, wahrD) : null;
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <table class="exp-tabelle"><thead><tr><th>F in N</th><th>s in mm</th><th>D = F/s in N/m</th></tr></thead>
      <tbody>${zeilen.map((z, i) => `<tr><td>${z.kraft.toFixed(2).replace(".", ",")}</td><td>${z.gemessenMm.toFixed(1).replace(".", ",")}</td><td>${quotienten[i].toFixed(1).replace(".", ",")}</td></tr>`).join("")}</tbody></table>
      <p>Die Quotienten sind (fast) gleich — <strong>F und s sind proportional</strong>. Das ist das Hookesche Gesetz: F = D · s.</p>
      <p>Dein Ergebnis: <strong>D ≈ ${Number.isFinite(d) ? d.toFixed(1).replace(".", ",") : "–"} N/m</strong>
      ${zustand.feder.geheim ? "" : ` (Aufdruck: ${wahrD} N/m)`}
      ${bew ? ` — Abweichung ${bew.abw.toFixed(1).replace(".", ",")} %: <strong>${bew.stufe}</strong>.` : ""}</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="420" height="280" aria-label="Streudiagramm: Auslenkung über Kraft mit deinen Messpunkten und einer Ursprungsgeraden."></canvas>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum streuen die Punkte?</summary>
        <p>Ablesen auf der mm-Skala ist nur auf etwa ±1 mm genau (Augenhöhe!). Auch echte Federn sind nie perfekt gleichmäßig gewickelt. Deshalb mittelt man über <em>mehrere</em> Messungen, statt einer einzigen zu vertrauen — und deshalb liegt deine Gerade nie exakt durch alle Punkte.</p>
        <p>Grenze des Gesetzes: Überdehnst du die Feder, gilt F = D · s <em>nicht mehr</em> — die Feder verformt sich bleibend (probier es ruhig aus … mit einer Ersatzfeder).</p>
      </details>
      <div class="sp-panel-knoepfe">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.angehaengt = []; zustand.messungen = []; zustand.kaputt = false;
      setzeZiel(); wechslePhase("aufbau");
    });
    zeichneDiagramm(zeilen, d);
  }

  function zeichneDiagramm(zeilen, d) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !zeilen.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 46, U = H - 36;
    const fMax = Math.max(...zeilen.map(z => z.kraft)) * 1.15;
    const sMax = Math.max(...zeilen.map(z => z.gemessenMm)) * 1.15;
    c.clearRect(0, 0, W, H);
    c.strokeStyle = cText; c.lineWidth = 1.5; c.font = "12px system-ui, sans-serif"; c.fillStyle = cText;
    c.beginPath(); c.moveTo(L, 12); c.lineTo(L, U); c.lineTo(W - 8, U); c.stroke();
    c.fillText("s in mm", 6, 22); c.fillText("F in N", W - 50, U + 26);
    // Gitter-Anker
    c.fillStyle = cLeise;
    c.fillText("0", L - 12, U + 14);
    // Ursprungsgerade s = F/D
    if (Number.isFinite(d)) {
      c.strokeStyle = cLeise; c.setLineDash([6, 5]); c.beginPath(); c.moveTo(L, U);
      const fEnd = fMax, sEnd = fEnd / d * 1000;
      c.lineTo(L + (fEnd / fMax) * (W - L - 14), U - (sEnd / sMax) * (U - 20)); c.stroke(); c.setLineDash([]);
    }
    // Messpunkte
    for (const z of zeilen) {
      const x = L + (z.kraft / fMax) * (W - L - 14);
      const y = U - (z.gemessenMm / sMax) * (U - 20);
      c.fillStyle = cAkzent; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill();
    }
  }

  function wechslePhase(p) {
    zustand.phase = p;
    tabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.phase === p)));
    if (p === "aufbau") panelAufbau();
    if (p === "messen") panelMessen();
    if (p === "auswerten") panelAuswerten();
  }
  tabs.forEach(t => t.addEventListener("click", () => wechslePhase(t.dataset.phase)));

  setzeZiel();
  wechslePhase("aufbau");
}
