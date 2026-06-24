// experiment.js — Interaktives Experiment: Gewichtskraft F_G = m · g (Klasse 8).
// Realitätsnahe Messpraxis: Massestücke an einen Federkraftmesser (Newtonmeter) hängen,
// die Kraft SELBST an der Newton-Skala ablesen, Messreihe protokollieren und den
// Ortsfaktor g = F_G / m bestimmen. Messstreuung ist deterministisch geseedet (testbar).

export const G = 9.81; // N/kg (Ortsfaktor)
export const MASSEN = [50, 100, 200];   // verfügbare Massestücke in g (stapelbar)
export const MAX_ANHAENGEN = 6;
export const MESSBEREICH_N = 10;         // Newtonmeter 0–10 N

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function seedFuer(gramm) { let s = 23; for (const z of "gk:" + gramm) s = (s * 31 + z.charCodeAt(0)) >>> 0; return s; }

export function kraftIdeal(gramm) { return (gramm / 1000) * G; }            // N
export function kraftReal(gramm) {
  if (gramm === 0) return 0;
  const streu = (mulberry32(seedFuer(gramm))() - 0.5) * 0.12;               // ±0,06 N
  return kraftIdeal(gramm) + streu;
}
export function istUeberlastet(gramm) { return kraftIdeal(gramm) > MESSBEREICH_N; }

export const ABLESE_TOLERANZ_N = 0.1;
export function ablesungOk(eingabeN, wahrN) {
  return Number.isFinite(eingabeN) && Math.abs(eingabeN - wahrN) <= ABLESE_TOLERANZ_N;
}
export function parseDezimal(text) { const n = Number(String(text).trim().replace(",", ".")); return Number.isFinite(n) ? n : NaN; }

// Auswertung: Ortsfaktor je Zeile g = F_G / m  (N/kg)
export function ortsfaktorAusZeile(kraftN, gramm) { return gramm > 0 ? kraftN / (gramm / 1000) : NaN; }
export function gMittel(zeilen) {
  const w = zeilen.map(z => ortsfaktorAusZeile(z.kraft, z.gramm)).filter(Number.isFinite);
  return w.length ? w.reduce((a, b) => a + b, 0) / w.length : NaN;
}
export function bewertungG(gGemessen) {
  const abw = Math.abs(gGemessen - G) / G * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}

export const pruefFaelle = [
  { gramm: 100, ideal: 0.981 }, { gramm: 200, ideal: 1.962 },
  { gramm: 500, ideal: 4.905 }, { gramm: 1000, ideal: 9.81 }
];
export const TESTS = [
  { name: "Ideal 100 g = 0,981 N", ok: () => Math.abs(kraftIdeal(100) - 0.981) < 1e-9 },
  { name: "Real deterministisch", ok: () => kraftReal(200) === kraftReal(200) },
  { name: "Real nahe Ideal (±0,06 N)", ok: () => [50,100,150,200,250,300,400,500].every(g => Math.abs(kraftReal(g) - kraftIdeal(g)) <= 0.061) },
  { name: "Ablesung ±0,1 N", ok: () => ablesungOk(1.96, 1.98) && !ablesungOk(1.7, 1.98) && !ablesungOk(NaN, 1.98) },
  { name: "g aus idealer Reihe = 9,81", ok: () => Math.abs(gMittel([100,200,300,500].map(g => ({ gramm: g, kraft: kraftIdeal(g) }))) - G) < 1e-9 },
  { name: "g aus realer Reihe < 3 % daneben", ok: () => bewertungG(gMittel([100,200,300,400,500].map(g => ({ gramm: g, kraft: kraftReal(g) })))).abw < 3 },
  { name: "Messbereich", ok: () => !istUeberlastet(1000) && istUeberlastet(1100) },
  { name: "parseDezimal", ok: () => parseDezimal("1,96") === 1.96 && Number.isNaN(parseDezimal("x")) },
  { name: "Prüffälle konsistent", ok: () => pruefFaelle.every(p => Math.abs(kraftIdeal(p.gramm) - p.ideal) < 1e-6) }
];

// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const z = { angehaengt: [], zeigerN: 0, animVon: 0, animZiel: 0, animStart: 0, messungen: [], phase: "aufbau" };

  wurzel.innerHTML = `
    <div class="exp-phasen" role="tablist" aria-label="Phasen des Experiments">
      <button role="tab" data-phase="aufbau" aria-selected="true">1 · Aufbau</button>
      <button role="tab" data-phase="messen" aria-selected="false">2 · Durchführung</button>
      <button role="tab" data-phase="auswerten" aria-selected="false">3 · Auswertung</button>
    </div>
    <div class="exp-flaeche">
      <div class="exp-links"><canvas id="exp-canvas" width="360" height="560" aria-label="Versuchsaufbau: Stativ mit Federkraftmesser (Newton-Skala) und anhängbaren Massestücken."></canvas></div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`;
  const canvas = wurzel.querySelector("#exp-canvas"), ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");
  const tabs = [...wurzel.querySelectorAll('[role="tab"]')];
  const farbe = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || "#333";
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const grammGesamt = () => z.angehaengt.reduce((a, b) => a + b, 0);

  function setzeZiel() {
    const g = grammGesamt();
    z.animZiel = istUeberlastet(g) ? MESSBEREICH_N + 0.4 : kraftReal(g);
    z.animVon = z.zeigerN; z.animStart = performance.now();
    if (reduziert) { z.zeigerN = z.animZiel; zeichne(); } else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - z.animStart) / 420), e = 1 - Math.pow(1 - t, 3);
    z.zeigerN = z.animVon + (z.animZiel - z.animVon) * e; zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"), cFehler = farbe("--fehler") || "#b33", cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h); ctx.lineWidth = 2; ctx.strokeStyle = cText; ctx.fillStyle = cText; ctx.font = "13px system-ui, sans-serif";
    // Stativ
    ctx.fillRect(40, 18, 200, 8); ctx.fillRect(24, 18, 10, h - 70); ctx.fillRect(10, h - 54, 130, 10);
    // Federkraftmesser-Körper mit Newton-Skala
    const fx = 150, oben = 34, koerperLen = 300, px = koerperLen / MESSBEREICH_N;
    ctx.strokeStyle = cLeise; ctx.fillStyle = cFlaeche; ctx.lineWidth = 2;
    ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(fx - 26, oben, 52, koerperLen + 24, 8) : ctx.rect(fx - 26, oben, 52, koerperLen + 24)); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise;
    for (let n = 0; n <= MESSBEREICH_N * 2; n++) {
      const nN = n / 2, y = oben + 12 + nN * px, lang = n % 2 === 0 ? 12 : 7;
      ctx.beginPath(); ctx.moveTo(fx + 26, y); ctx.lineTo(fx + 26 - lang, y); ctx.strokeStyle = n % 2 === 0 ? cText : cLeise; ctx.stroke();
      if (n % 2 === 0) { ctx.fillStyle = cText; ctx.fillText(String(nN), fx - 24, y + 4); ctx.fillStyle = cLeise; }
    }
    ctx.fillStyle = cText; ctx.fillText("N", fx - 22, oben + 4);
    // Zeiger (Akzent) an aktueller Kraft
    const fZeig = Math.min(z.zeigerN, MESSBEREICH_N + 0.3), yz = oben + 12 + fZeig * px;
    ctx.strokeStyle = z.zeigerN > MESSBEREICH_N ? cFehler : cAkzent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx - 26, yz); ctx.lineTo(fx + 26, yz); ctx.stroke();
    ctx.fillStyle = z.zeigerN > MESSBEREICH_N ? cFehler : cAkzent; ctx.beginPath(); ctx.moveTo(fx + 26, yz); ctx.lineTo(fx + 33, yz - 5); ctx.lineTo(fx + 33, yz + 5); ctx.closePath(); ctx.fill();
    // Haken + Massestücke
    const unten = oben + koerperLen + 24; ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(fx, unten); ctx.lineTo(fx, unten + 8); ctx.arc(fx, unten + 14, 6, -Math.PI / 2, Math.PI / 2, false); ctx.stroke();
    let y = unten + 22; ctx.font = "12px system-ui, sans-serif";
    for (const g of z.angehaengt) {
      const bh = g === 50 ? 16 : g === 100 ? 22 : 32;
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.beginPath(); (ctx.roundRect ? ctx.roundRect(fx - 26, y, 52, bh, 4) : ctx.rect(fx - 26, y, 52, bh)); ctx.fill(); ctx.stroke();
      ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(g + " g", fx, y + bh / 2 + 4); ctx.textAlign = "start"; y += bh + 3;
    }
    if (z.zeigerN > MESSBEREICH_N) { ctx.fillStyle = cFehler; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText("Messbereich überschritten!", 24, h - 18); }
  }

  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Am Stativ hängt ein <strong>Federkraftmesser (Newtonmeter)</strong> mit einer Skala in <strong>Newton</strong>. Unten hängst du <strong>Massestücke</strong> (50 g, 100 g, 200 g) an. Je größer die Masse, desto weiter zieht die Gewichtskraft den Zeiger nach unten.</p>
      <p><strong>Plan:</strong> Häng nacheinander verschiedene Massen an, lies die Kraft <em>F<sub>G</sub></em> jeweils selbst ab und trag sie in die Messtabelle ein. Aus <em>F<sub>G</sub></em> und <em>m</em> bestimmst du am Ende den Ortsfaktor <em>g</em>.</p>
      <p class="exp-hinweis">⚠ Der Newtonmeter misst nur bis ${MESSBEREICH_N} N — häng nicht zu viel an, sonst ist der Messbereich überschritten.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }
  function panelMessen() {
    const g = grammGesamt();
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-masseknoepfe" aria-label="Massestücke anhängen">
        ${MASSEN.map(m => `<button class="knopf zweitrangig" data-masse="${m}">+ ${m} g</button>`).join("")}
        <button class="knopf zweitrangig" id="exp-leeren">Abnehmen</button>
      </div>
      <p>Angehängt: <strong>${g} g</strong> = <strong>${komma(g / 1000)} kg</strong></p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies die Newton-Skala ab — Gewichtskraft F<sub>G</sub> in N:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7" ${g === 0 || istUeberlastet(g) ? "disabled" : ""}>
        <button class="knopf" ${g === 0 || istUeberlastet(g) ? "disabled" : ""}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${istUeberlastet(g) ? "Messbereich überschritten — nimm Masse ab." : ""}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>m in g</th><th>F<sub>G</sub> in N</th></tr></thead>
      <tbody>${z.messungen.map(r => `<tr><td>${r.gramm}</td><td>${komma(r.kraft)}</td></tr>`).join("") || '<tr><td colspan="2">noch leer</td></tr>'}</tbody></table>
      <p>${z.messungen.length} von mindestens 5 Messungen.</p>
      <button class="knopf" id="exp-weiter2" ${z.messungen.length >= 5 ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelectorAll("[data-masse]").forEach(k => k.addEventListener("click", () => {
      if (z.angehaengt.length >= MAX_ANHAENGEN) return;
      z.angehaengt.push(Number(k.dataset.masse)); setzeZiel(); panelMessen();
    }));
    panel.querySelector("#exp-leeren").addEventListener("click", () => { z.angehaengt = []; setzeZiel(); panelMessen(); });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value), gJetzt = grammGesamt(), meldung = panel.querySelector("#exp-meldung");
      if (z.messungen.some(r => r.gramm === gJetzt)) { meldung.textContent = "Für diese Masse hast du schon gemessen — häng eine andere Kombination an."; return; }
      if (!ablesungOk(eingabe, z.zeigerN)) { meldung.textContent = "✗ Schau genau hin: Wo steht der Zeiger auf der Newton-Skala? (Auf 0,1 N genau ablesen.)"; return; }
      z.messungen.push({ gramm: gJetzt, kraft: eingabe }); meldung.textContent = "✓ Eingetragen."; panelMessen();
    });
  }
  function panelAuswerten() {
    const zeilen = z.messungen, gWerte = zeilen.map(r => ortsfaktorAusZeile(r.kraft, r.gramm)), gm = gMittel(zeilen), bew = Number.isFinite(gm) ? bewertungG(gm) : null;
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <table class="exp-tabelle"><thead><tr><th>m in kg</th><th>F<sub>G</sub> in N</th><th>g = F<sub>G</sub>/m in N/kg</th></tr></thead>
      <tbody>${zeilen.map((r, i) => `<tr><td>${komma(r.gramm / 1000, 3)}</td><td>${komma(r.kraft)}</td><td>${komma(gWerte[i], 2)}</td></tr>`).join("")}</tbody></table>
      <p>Die Quotienten F<sub>G</sub>/m sind (fast) gleich — <strong>F<sub>G</sub> und m sind proportional</strong>: F<sub>G</sub> = m · g.</p>
      <p>Dein Ortsfaktor: <strong>g ≈ ${Number.isFinite(gm) ? komma(gm, 2) : "–"} N/kg</strong> (Literaturwert: 9,81 N/kg)${bew ? ` — Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.` : ""}</p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum streuen die Werte?</summary>
        <p>Das Ablesen am Newtonmeter ist nur auf etwa ±0,1 N genau, und die Skala hat eine begrenzte Auflösung. Deshalb mittelt man über <em>mehrere</em> Messungen statt einer einzigen. Der Ortsfaktor g ist auf der Erde fast konstant (≈ 9,81 N/kg); auf dem Mond wäre er rund sechsmal kleiner.</p>
      </details>
      <div class="sp-panel-knoepfe">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => { z.angehaengt = []; z.messungen = []; setzeZiel(); wechslePhase("aufbau"); });
  }
  function komma(zahl, stellen = 2) { return Number(zahl).toFixed(stellen).replace(".", ","); }
  function wechslePhase(p) {
    z.phase = p; tabs.forEach(t => t.setAttribute("aria-selected", String(t.dataset.phase === p)));
    if (p === "aufbau") panelAufbau(); if (p === "messen") panelMessen(); if (p === "auswerten") panelAuswerten();
  }
  tabs.forEach(t => t.addEventListener("click", () => wechslePhase(t.dataset.phase)));
  setzeZiel(); wechslePhase("aufbau");
}
