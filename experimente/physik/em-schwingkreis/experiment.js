// experiment.js — Interaktives Experiment: Elektromagnetischer Schwingkreis (Thomson) (QP, eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Den Drehkondensator C selbst einstellen,
// den Kreis kurz anregen und die Schwingfrequenz f am Frequenzmesser SELBST ablesen,
// Messreihe protokollieren und f über 1/√C auswerten (Ursprungsgerade).
// Die Induktivität L der Spule ist dem Lernenden UNBEKANNT (intern 10,0 mH) und wird
// in der eA-Stufe aus der Steigung zurückgerechnet. Die kleine Ableselstreuung ist pro C
// deterministisch geseedet — dadurch bleiben pruefFaelle und TESTS in Node analytisch
// prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, regression, esc, farbe, bauePhasen, csvHerunterladen, ablesungOk, reduzierteBewegung } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const L_HENRY = 10.0e-3;            // H — feste Spule, dem Lernenden UNBEKANNT (intern)
export const L_REF_MH = L_HENRY * 1000;    // 10,0 mH — Vergleichswert für die Bewertung
export const C_MIN = 1, C_MAX = 50, C_SCHRITT = 1;   // nF — Drehkondensator
export const F_STREU_SPANNE_KHZ = 0.30;    // kHz — Ablese-/Anregungsstreuung auf f (±0,15 kHz)
export const F_TOLERANZ_KHZ = 0.25;        // akzeptierte Ablesung: ±0,25 kHz
export const L_TOLERANZ_MH = 1.0;          // L-Eingabe in mH: ±1,0
export const MIN_MESSUNGEN = 6;

// Steigung der Auswertegeraden, wenn f in kHz über x = 1/√(C[nF]) aufgetragen wird:
// f[Hz] = 1/(2π·√(L·C)) mit C = C_nF·1e-9 ⇒ f[kHz] = STEIGUNG_KHZ · (1/√C_nF)
export const STEIGUNG_KHZ = 1 / (2 * Math.PI * Math.sqrt(L_HENRY * 1e-9)) / 1000; // ≈ 50,329 kHz

// ---------- Physik (rein, Node-testbar) ----------
// Thomson-Formel: f = 1/(2π·√(L·C))
export function frequenz(lHenry, cFarad) {
  return (lHenry > 0 && cFarad > 0) ? 1 / (2 * Math.PI * Math.sqrt(lHenry * cFarad)) : NaN; // Hz
}
export function periode(lHenry, cFarad) {
  return (lHenry > 0 && cFarad > 0) ? 2 * Math.PI * Math.sqrt(lHenry * cFarad) : NaN; // s
}
// wahre, am Frequenzmesser abzulesende Frequenz in kHz inkl. reproduzierbarer Streuung
export function frequenzReal(cNanoFarad) {
  const fkHz = frequenz(L_HENRY, cNanoFarad * 1e-9) / 1000;
  return fkHz + streuung("f:" + cNanoFarad, F_STREU_SPANNE_KHZ); // kHz
}
// Auswertung: aus der Steigung m (kHz pro 1/√(C[nF])) folgt L
// m[kHz] = 1/(2π·√(L·1e-9))/1000  ⇒  L = (1/(2π·m·1000))² / 1e-9
export function L_ausSteigung(steigungKHz) {
  return steigungKHz > 0 ? Math.pow(1 / (2 * Math.PI * steigungKHz * 1000), 2) / 1e-9 : NaN; // H
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungFOk(eingabeKHz, wahrKHz) {
  return ablesungOk(eingabeKHz, wahrKHz, F_TOLERANZ_KHZ);
}
export function lEingabeOk(eingabeMH, wahrMH) {
  return Number.isFinite(eingabeMH) && Math.abs(eingabeMH - wahrMH) <= L_TOLERANZ_MH;
}
export function bewertungL(lMH) {
  const abw = Math.abs(lMH - L_REF_MH) / L_REF_MH * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Kapazitäten
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.C)).size >= MIN_MESSUNGEN;
}
// Auswertepunkte für f über 1/√C (C in nF, f in kHz)
export function auswertePunkte(messungen) {
  return messungen.map(z => ({ x: 1 / Math.sqrt(z.C), y: z.fkHz }));
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "f", C: 10, soll: 15.9155, tol: 1e-3 },                  // kHz — Kontrollwert
  { art: "T", C: 10, soll: 6.2832e-5, tol: 1e-8 },               // s
  { art: "halb", C1: 10, C2: 40, soll: 0.5, tol: 1e-9 },         // f(4C)/f(C) = 1/2
  { art: "steigung", soll: 50.3292, tol: 1e-3 },                 // kHz pro 1/√(C[nF])
  { art: "L", soll: 0.010, tol: 1e-9 }                           // H (Steigung → L zurück)
];

export const TESTS = [
  { name: "Kontrollwert f: C = 10 nF, L = 10 mH → f ≈ 15,9155 kHz (±0,001)",
    ok: () => Math.abs(frequenz(L_HENRY, 10e-9) / 1000 - 15.9155) <= 1e-3 },
  { name: "Thomson-Formel exakt: f = 1/(2π·√(L·C)) nachgerechnet",
    ok: () => { const C = 22e-9;
      return Math.abs(frequenz(L_HENRY, C) - 1 / (2 * Math.PI * Math.sqrt(L_HENRY * C))) < 1e-9; } },
  { name: "Periode: T = 1/f und T = 2π·√(L·C) (C = 10 nF → 62,83 µs)",
    ok: () => Math.abs(periode(L_HENRY, 10e-9) - 1 / frequenz(L_HENRY, 10e-9)) < 1e-15
      && Math.abs(periode(L_HENRY, 10e-9) - 6.2832e-5) <= 1e-8 },
  { name: "f ∝ 1/√C: C vervierfachen (10→40 nF) halbiert f exakt",
    ok: () => Math.abs(frequenz(L_HENRY, 40e-9) / frequenz(L_HENRY, 10e-9) - 0.5) <= 1e-9
      && Math.abs(frequenz(L_HENRY, 8e-9) / frequenz(L_HENRY, 2e-9) - 0.5) <= 1e-9 },
  { name: "größeres C → kleinere f (streng monoton fallend über das ganze Raster)",
    ok: () => { for (let c = C_MIN; c < C_MAX; c += C_SCHRITT)
        if (!(frequenz(L_HENRY, c * 1e-9) > frequenz(L_HENRY, (c + 1) * 1e-9))) return false;
      return true; } },
  { name: "Steigung der Geraden f[kHz] über 1/√(C[nF]): m ≈ 50,329 (±0,001)",
    ok: () => Math.abs(STEIGUNG_KHZ - 50.3292) <= 1e-3
      && Math.abs(STEIGUNG_KHZ - 1 / (2 * Math.PI * Math.sqrt(L_HENRY * 1e-9)) / 1000) < 1e-9 },
  { name: "Ursprungsgerade: y = f[kHz], x = 1/√(C[nF]) liefert konstante Steigung y/x",
    ok: () => [1, 2, 5, 10, 20, 50].every(c => {
      const x = 1 / Math.sqrt(c), y = frequenz(L_HENRY, c * 1e-9) / 1000;
      return Math.abs(y / x - STEIGUNG_KHZ) <= 1e-9; }) },
  { name: "Regression über streufreie Punkte: m ≈ Steigung, b ≈ 0",
    ok: () => { const pkt = [2, 5, 10, 20, 33, 50].map(c =>
        ({ x: 1 / Math.sqrt(c), y: frequenz(L_HENRY, c * 1e-9) / 1000 }));
      const r = regression(pkt);
      return Math.abs(r.m - STEIGUNG_KHZ) <= 1e-6 && Math.abs(r.b) <= 1e-6; } },
  { name: "L-Rückrechnung exakt: aus der Steigung folgt L = 10,0 mH",
    ok: () => Math.abs(L_ausSteigung(STEIGUNG_KHZ) - L_HENRY) <= 1e-9
      && Math.abs(L_ausSteigung(STEIGUNG_KHZ) * 1000 - 10.0) <= 1e-6 },
  { name: "Streugrenzen ±0,15 kHz auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let c = C_MIN; c <= C_MAX; c += C_SCHRITT) {
        const d = Math.abs(frequenzReal(c) - frequenz(L_HENRY, c * 1e-9) / 1000);
        if (d > F_STREU_SPANNE_KHZ / 2 + 1e-12) return false;
        if (d > 1e-6) irgendStreu = true;
      }
      return irgendStreu && frequenzReal(10) === frequenzReal(10) && frequenzReal(10) !== frequenzReal(11); } },
  { name: "Ablese-/Eingabe-Toleranzen: f ±0,25 kHz, L ±1,0 mH",
    ok: () => ablesungFOk(15.9, 15.9155) && ablesungFOk(16.1, 15.9155)
      && !ablesungFOk(16.2, 15.9155) && !ablesungFOk(NaN, 15.9155)
      && lEingabeOk(10.0, 10.0) && lEingabeOk(10.9, 10.0)
      && !lEingabeOk(11.1, 10.0) && !lEingabeOk(NaN, 10.0) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("15,9") === 15.9 && parseDezimal("15.9") === 15.9 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen Kapazitäten",
    ok: () => { const mk = cs => cs.map(c => ({ C: c }));
      return !messreiheVollstaendig(mk([5, 5, 10, 20, 33, 50]))
        && !messreiheVollstaendig(mk([2, 5, 10, 20, 33]))
        && messreiheVollstaendig(mk([2, 5, 10, 20, 33, 50])); } },
  { name: "Bewertung: 10,0 → sehr gut · 10,7 → gut · 12,0 → nochmal prüfen",
    ok: () => bewertungL(10.0).stufe === "sehr gut" && bewertungL(10.7).stufe === "gut"
      && bewertungL(12.0).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "f") return Math.abs(frequenz(L_HENRY, p.C * 1e-9) / 1000 - p.soll) <= p.tol;
      if (p.art === "T") return Math.abs(periode(L_HENRY, p.C * 1e-9) - p.soll) <= p.tol;
      if (p.art === "halb") return Math.abs(frequenz(L_HENRY, p.C2 * 1e-9) / frequenz(L_HENRY, p.C1 * 1e-9) - p.soll) <= p.tol;
      if (p.art === "steigung") return Math.abs(STEIGUNG_KHZ - p.soll) <= p.tol;
      return Math.abs(L_ausSteigung(STEIGUNG_KHZ) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Schaltbild + Oszilloskop) ----------
  const zustand = {
    phase: "aufbau",
    C: 10,                                 // nF
    vorhersage: "",                        // "groesser" | "kleiner" | "gleich"
    messungen: [],                         // {C, fkHz}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    lBestaetigt: null,                     // {eingabe, wahr} nach eA-Erfolg
    meldungMessen: "", meldungAuswerten: "",
    phase0: Math.random() * Math.PI * 2    // zufällige Anfangsphase der Oszi-Animation (rein dekorativ)
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="460" aria-label="Schaltbild des LC-Schwingkreises: eine Spule mit fester Induktivität in Reihe mit einem einstellbaren Drehkondensator, dazu ein Anregungstaster. Darunter ein Oszilloskop-/Frequenzmesser-Schirm, der die gedämpfte Schwingung und die abgelesene Frequenz anzeigt. Unten eine Anzeige für die eingestellte Kapazität."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.lineJoin = "round";

    // ----- Schaltbild oben: L — C — Taster im Rechteck-Kreis -----
    const xL = 60, xR = 300, yO = 40, yU = 150;
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    // obere Leitung von Spule (links) zu Kondensator (rechts) — Lücke in der Mitte für Bauteile
    // Rahmen-Ecken
    ctx.beginPath();
    ctx.moveTo(xL, yO); ctx.lineTo(110, yO);          // bis Spule
    ctx.moveTo(174, yO); ctx.lineTo(236, yO);
    ctx.moveTo(264, yO); ctx.lineTo(xR, yO);          // ab Kondensator-Bereich
    ctx.lineTo(xR, yU);                                // rechte Leitung runter
    ctx.lineTo(230, yU);                               // bis Taster
    ctx.moveTo(190, yU); ctx.lineTo(xL, yU);           // ab Taster nach links
    ctx.lineTo(xL, yO);                                // linke Leitung hoch
    ctx.stroke();

    // Spule (oben links) — vier Halbkreise als Symbol
    ctx.beginPath();
    let sx = 110; const sr = 8;
    for (let i = 0; i < 4; i++) { ctx.arc(sx + sr + i * 2 * sr, yO, sr, Math.PI, 0, false); }
    ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Spule L (fest, unbekannt)", 175, yO - 14);

    // Kondensator (oben rechts) — zwei Platten, eine mit Pfeil (Drehko = einstellbar)
    const cxK = 250, gap = 7;
    ctx.beginPath();
    ctx.moveTo(cxK - 14, yO); ctx.lineTo(cxK - gap, yO);
    ctx.moveTo(cxK - gap, yO - 12); ctx.lineTo(cxK - gap, yO + 12);   // linke Platte
    ctx.moveTo(cxK + gap, yO - 12); ctx.lineTo(cxK + gap, yO + 12);   // rechte Platte
    ctx.moveTo(cxK + gap, yO); ctx.lineTo(cxK + 14, yO);
    ctx.stroke();
    // Pfeil quer durch (regelbar)
    ctx.strokeStyle = cAkzent;
    ctx.beginPath(); ctx.moveTo(cxK - 13, yO + 14); ctx.lineTo(cxK + 13, yO - 14); ctx.stroke();
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.moveTo(cxK + 13, yO - 14); ctx.lineTo(cxK + 6, yO - 12); ctx.lineTo(cxK + 11, yO - 6); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Drehkondensator C", cxK, yO + 34);
    ctx.fillStyle = cAkzent; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("C = " + zustand.C + " nF", cxK, yO + 50);
    ctx.font = "12px system-ui, sans-serif";

    // Anregungstaster (unten Mitte)
    ctx.strokeStyle = cText;
    ctx.beginPath();
    ctx.moveTo(190, yU); ctx.lineTo(204, yU - 10);    // Schalterhebel
    ctx.stroke();
    ctx.beginPath(); ctx.arc(190, yU, 2.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(230, yU, 2.5, 0, 7); ctx.fill();
    ctx.fillStyle = cLeise; ctx.fillText("Anregung", 210, yU + 18);

    // ----- Oszilloskop / Frequenzmesser unten -----
    const ox = 24, oy = 196, ow = 312, oh = 150;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ox, oy, ow, oh, 8); else ctx.rect(ox, oy, ow, oh);
    ctx.fill(); ctx.stroke();
    // Schirm
    const sxs = ox + 12, sys = oy + 12, sws = ow - 24, shs = 96;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.strokeRect(sxs, sys, sws, shs);
    const midY = sys + shs / 2;
    // Nulllinie
    ctx.strokeStyle = cLeise; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(sxs, midY); ctx.lineTo(sxs + sws, midY); ctx.stroke();
    ctx.setLineDash([]);

    if (zustand.phase !== "aufbau") {
      // gedämpfte Schwingung zeichnen: höhere Frequenz bei kleinem C (anschaulich)
      const fkHzIdeal = frequenz(L_HENRY, zustand.C * 1e-9) / 1000;     // ~7..50 kHz
      // auf dem Schirm: Anzahl sichtbarer Perioden skaliert mit f (nur Darstellung)
      const perioden = 1.4 + (fkHzIdeal - 7) / (50 - 7) * 7;           // 1,4 .. 8,4 Perioden
      const omega = 2 * Math.PI * perioden / sws;
      const daempfung = 2.6 / sws;
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i <= sws; i++) {
        const y = midY - (shs / 2 - 6) * Math.exp(-daempfung * i) * Math.sin(omega * i + zustand.phase0);
        if (i === 0) ctx.moveTo(sxs + i, y); else ctx.lineTo(sxs + i, y);
      }
      ctx.stroke();
      // Frequenz-Digitalanzeige
      ctx.fillStyle = cText; ctx.textAlign = "center";
      ctx.font = "bold 20px system-ui, monospace";
      ctx.fillText("f = " + komma(frequenzReal(zustand.C), 2) + " kHz", ox + ow / 2, oy + oh - 14);
      ctx.font = "12px system-ui, sans-serif";
      ctx.fillStyle = cLeise; ctx.textAlign = "start";
      ctx.fillText("Frequenzmesser", sxs + 4, sys + 14);
    } else {
      ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("Taster „Anregung“ drücken —", ox + ow / 2, midY - 4);
      ctx.fillText("die Schwingung erscheint in der Durchführung", ox + ow / 2, midY + 16);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    }
    ctx.textAlign = "start";
  }

  // sanfte Schirm-Animation (läuft nur in der Durchführung; respektiert reduzierte Bewegung)
  let animLaeuft = false;
  function animiere() {
    if (zustand.phase !== "messen" || reduzierteBewegung()) { animLaeuft = false; return; }
    animLaeuft = true;
    zustand.phase0 += 0.18;
    zeichne();
    requestAnimationFrame(animiere);
  }
  function vielleichtAnimieren() {
    if (zustand.phase === "messen" && !reduzierteBewegung() && !animLaeuft) requestAnimationFrame(animiere);
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Vor dir steht ein <strong>elektromagnetischer Schwingkreis</strong>: eine <strong>Spule</strong> mit fester Induktivität L (ihr Wert ist dir <em>nicht</em> bekannt) in Reihe mit einem <strong>Drehkondensator C</strong>, dessen Kapazität du von 1 nF bis 50 nF einstellen kannst. Ein Taster lädt den Kondensator kurz auf und gibt den Kreis frei.</p>
      <p>Danach pendelt die Energie zwischen Kondensator (elektrisches Feld) und Spule (magnetisches Feld) hin und her — der Kreis <strong>schwingt</strong>, durch den ohmschen Widerstand etwas gedämpft. Ein <strong>Frequenzmesser</strong> (Oszilloskop) zeigt die Schwingfrequenz f in kHz an.</p>
      <p><strong>Idee der Messung:</strong> Für die Eigenfrequenz gilt die <strong>Thomson-Formel</strong> $f = \\dfrac{1}{2\\pi\\sqrt{L\\,C}}$. Stellst du verschiedene C ein und liest jedes Mal f ab, kannst du den Zusammenhang prüfen — und in der Auswertung sogar die unbekannte Spule L bestimmen.</p>
      <p><strong>Plan:</strong> Miss f für mindestens ${MIN_MESSUNGEN} <em>verschiedene</em> Kapazitäten C. In der Auswertung trägst du f über $1/\\sqrt{C}$ auf und gewinnst aus der Geraden L.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich die Kapazität C <strong>vergrößere</strong>, wird die Schwingfrequenz f …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… größer</option>
        <option value="kleiner">… kleiner</option>
        <option value="gleich">… bleibt (fast) gleich</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-v").value = zustand.vorhersage;
    panel.querySelector("#exp-v").addEventListener("change", ev => { zustand.vorhersage = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst deine Vorhersage aus — gleich prüfst du sie selbst.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortAus = wahl => wahl === "groesser" ? "größer" : wahl === "kleiner" ? "kleiner" : "(fast) gleich";

  function beobachtungHtml() {
    const cs = new Set(zustand.messungen.map(z => z.C)).size;
    let html = `<p>Deine Vorhersage: C größer → f wird <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus und beobachte die Anzeige!</p>`;
    if (cs >= 2) {
      const ok = zustand.vorhersage === "kleiner";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>C größer → f kleiner</strong> (mehr Kapazität ⇒ trägere Schwingung, $f \\propto 1/\\sqrt{C}$). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
    }
    return html;
  }

  function panelMessen() {
    if (vorhersageFehlt()) {
      panel.innerHTML = `
        <h2>Durchführung</h2>
        <p>Halte zuerst deine <strong>Vorhersage</strong> fest (Phase 1 · Aufbau) — erst vorhersagen, dann messen!</p>
        <button class="knopf" id="exp-zurueck0">Zum Aufbau</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("aufbau"));
      return;
    }
    const csAnz = new Set(zustand.messungen.map(z => z.C)).size;
    let fortschritt = `${csAnz} von mindestens ${MIN_MESSUNGEN} verschiedenen Kapazitäten.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-c">Drehkondensator: C = <strong id="exp-c-wert">${zustand.C} nF</strong></label>
        <input type="range" id="exp-c" min="${C_MIN}" max="${C_MAX}" step="${C_SCHRITT}" value="${zustand.C}" aria-label="Kapazität in Nanofarad">
      </div>
      <p>Stelle C ein, drücke gedanklich „Anregung“ und <strong>lies die Frequenz am Frequenzmesser ab</strong> (links auf dem Schirm).</p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Abgelesene Schwingfrequenz f in kHz:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>C in nF</th><th>f in kHz</th><th>1/√C in 1/√nF</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.C}</td><td>${komma(z.fkHz, 2)}</td><td>${komma(1 / Math.sqrt(z.C), 3)}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const cRegler = panel.querySelector("#exp-c");
    cRegler.addEventListener("input", () => {
      zustand.C = Math.round(Number(cRegler.value));
      panel.querySelector("#exp-c-wert").textContent = zustand.C + " nF";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.C === zustand.C)) {
        meldung.textContent = "Diese Kapazität hast du schon gemessen — stelle einen anderen Wert ein.";
        return;
      }
      const wahrF = frequenzReal(zustand.C);
      if (!ablesungFOk(eingabe, wahrF)) {
        meldung.textContent = "✗ Schau noch einmal genau auf die Frequenzanzeige (auf etwa 0,2 kHz genau ablesen).";
        return;
      }
      zustand.messungen.push({ C: zustand.C, fkHz: eingabe });
      zustand.messungen.sort((a, b) => a.C - b.C);
      zustand.meldungMessen = "✓ Eingetragen: C = " + zustand.C + " nF, f = " + komma(eingabe, 2) + " kHz.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    vielleichtAnimieren();
  }

  // ---------- Phase 3: Auswertung ----------
  function diagrammSvg() {
    const pkt = auswertePunkte(zustand.messungen);
    const W = 320, H = 220, ml = 46, mr = 12, mo = 12, mu = 38;
    const xMax = Math.max(...pkt.map(p => p.x)) * 1.08 || 1;
    const yMax = Math.max(...pkt.map(p => p.y)) * 1.08 || 1;
    const px = x => ml + x / xMax * (W - ml - mr);
    const py = y => H - mu - y / yMax * (H - mo - mu);
    const r = regression(pkt);
    const cAkzent = farbe("--akzent"), cText = farbe("--text"), cLeise = farbe("--text-leise");
    // Regressionsgerade durch den Ursprung-nahen Bereich
    const gx1 = 0, gx2 = xMax;
    const gy1 = r.m * gx1 + r.b, gy2 = r.m * gx2 + r.b;
    const punkteSvg = pkt.map(p =>
      `<circle cx="${px(p.x).toFixed(1)}" cy="${py(p.y).toFixed(1)}" r="3.5" fill="${cAkzent}"></circle>`).join("");
    const ticksX = [0.2, 0.4, 0.6, 0.8, 1.0].filter(t => t <= xMax).map(t =>
      `<line x1="${px(t).toFixed(1)}" y1="${(H - mu).toFixed(1)}" x2="${px(t).toFixed(1)}" y2="${(H - mu + 4)}" stroke="${cLeise}"/>` +
      `<text x="${px(t).toFixed(1)}" y="${H - mu + 16}" text-anchor="middle" font-size="10" fill="${cLeise}">${komma(t, 1)}</text>`).join("");
    const ticksY = [10, 20, 30, 40, 50].filter(t => t <= yMax).map(t =>
      `<line x1="${ml - 4}" y1="${py(t).toFixed(1)}" x2="${ml}" y2="${py(t).toFixed(1)}" stroke="${cLeise}"/>` +
      `<text x="${ml - 7}" y="${(py(t) + 3).toFixed(1)}" text-anchor="end" font-size="10" fill="${cLeise}">${t}</text>`).join("");
    return `
      <svg viewBox="0 0 ${W} ${H}" class="exp-diagramm" role="img" aria-label="Diagramm: Schwingfrequenz f über 1 durch Wurzel C. Die Messpunkte liegen auf einer Ursprungsgeraden; ihre Steigung liefert die Induktivität.">
        <line x1="${ml}" y1="${mo}" x2="${ml}" y2="${H - mu}" stroke="${cText}"/>
        <line x1="${ml}" y1="${H - mu}" x2="${W - mr}" y2="${H - mu}" stroke="${cText}"/>
        ${ticksX}${ticksY}
        <line x1="${px(gx1).toFixed(1)}" y1="${py(gy1).toFixed(1)}" x2="${px(gx2).toFixed(1)}" y2="${py(gy2).toFixed(1)}" stroke="${cAkzent}" stroke-width="1.5" stroke-dasharray="5 4"/>
        ${punkteSvg}
        <text x="${(ml + (W - ml - mr) / 2).toFixed(1)}" y="${H - 4}" text-anchor="middle" font-size="11" fill="${cText}">1/√C in 1/√nF</text>
        <text x="14" y="${(mo + (H - mo - mu) / 2).toFixed(1)}" text-anchor="middle" font-size="11" fill="${cText}" transform="rotate(-90 14 ${(mo + (H - mo - mu) / 2).toFixed(1)})">f in kHz</text>
      </svg>`;
  }

  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Kapazitäten — bisher: ${new Set(zustand.messungen.map(z => z.C)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const r = regression(auswertePunkte(zustand.messungen));
    const lAusMessung = L_ausSteigung(r.m) * 1000;        // mH (aus eigener Steigung)
    const lWahr = L_REF_MH;
    const lB = zustand.lBestaetigt;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p><strong>1) Periode bestätigen (gA):</strong> Greif dir eine Zeile heraus und prüfe die Thomson-Formel $T = 2\\pi\\sqrt{L\\,C}$ als Umkehrung von f: Aus deinem f folgt $T = 1/f$. Vergleiche zwei Zeilen — bei <em>größerem</em> C ist T größer und f kleiner. Genau das hast du gemessen.</p>
      <p><strong>2) Gerade auftragen:</strong> Trägt man f (in kHz) über $1/\\sqrt{C}$ auf, ergibt sich eine <strong>Ursprungsgerade</strong> — denn $f = \\dfrac{1}{2\\pi\\sqrt{L}}\\cdot\\dfrac{1}{\\sqrt{C}}$. Deine Messpunkte:</p>
      ${diagrammSvg()}
      <p>Aus der Regression: Steigung $m \\approx$ <strong>${komma(r.m, 2)}</strong> kHz·√nF, Achsenabschnitt $b \\approx$ ${komma(r.b, 2)} kHz (nahe 0 — eine Ursprungsgerade).</p>
      <details class="exp-fehler"><summary>Hilfe: Wie komme ich von der Steigung zu L?</summary>
        <p>Die Steigung ist $m = \\dfrac{1}{2\\pi\\sqrt{L}}$, wenn f in <strong>Hertz</strong> und C in <strong>Farad</strong> stehen. Mit deinen Einheiten (f in kHz, C in nF) gilt $m_{\\text{(kHz)}} = \\dfrac{1}{2\\pi\\sqrt{L\\cdot 10^{-9}}}\\cdot 10^{-3}$. Stelle nach L um: $L = \\dfrac{1}{(2\\pi\\, m_{\\text{(kHz)}}\\cdot 10^{3})^{2}}\\cdot \\dfrac{1}{10^{-9}}$ und gib L in <strong>mH</strong> an. Kontrolle: Eine Steigung um 50 kHz·√nF führt auf rund 10 mH.</p>
      </details>
      <h3>Die unbekannte Spule bestimmen (eA)</h3>
      <p>Berechne aus <em>deiner</em> Steigung die Induktivität L der Spule und gib sie in <strong>mH</strong> an (zwei Nachkommastellen, z. B. 10,0).</p>
      <form id="exp-l-form" class="exp-ablesen">
        <label for="exp-l">L in mH:</label>
        <input id="exp-l" inputmode="decimal" autocomplete="off" size="7" value="${lB ? komma(lB.eingabe, 2) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-l-meldung" class="exp-meldung" aria-live="polite"></p>
      ${lB ? `
      <div class="exp-hinweis">
        <p><strong>L ≈ ${komma(lB.eingabe, 2)} mH.</strong> Der eingebaute Wert war 10,0 mH — Abweichung ${komma(bewertungL(lB.eingabe).abw, 1)} %: <strong>${bewertungL(lB.eingabe).stufe}</strong>. Du hast eine unbekannte Spule allein über Frequenzmessungen vermessen!</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Im Schwingkreis pendelt die <strong>Energie</strong> hin und her. Welche mechanische Analogie passt?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="reibung">Kondensator ↔ Reibung, Spule ↔ Luftwiderstand</option>
          <option value="federmasse">Kondensator ↔ Feder (Spannenergie), Spule ↔ Masse (Bewegungsenergie)</option>
          <option value="umgekehrt">Kondensator ↔ Masse, Spule ↔ Feder</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du <strong>vervierfachst</strong> C (bei gleicher Spule). Was macht die Frequenz f?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="vierfach">f vervierfacht sich</option>
          <option value="doppelt">f verdoppelt sich</option>
          <option value="halb">f halbiert sich</option>
          <option value="viertel">f wird ein Viertel</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite">${esc(f2Feedback())}</p>
      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man L nie exakt?</summary>
        <p><strong>Ablesen der Frequenz:</strong> Auf einem realen Oszilloskop liest man die Periodendauer von wenigen Schwingungen ab; jede ungenaue Marke verschiebt f um einige Prozent. Mitteln über viele Kapazitäten (große Hebel beim Auftragen) verkleinert diesen Fehler.</p>
        <p><strong>Dämpfung:</strong> Der ohmsche Widerstand der Spule dämpft die Schwingung. Stark gedämpfte Schwingungen liegen geringfügig <em>unter</em> der ungedämpften Eigenfrequenz $f_0$ — die Thomson-Formel ist der Grenzfall ohne Verluste.</p>
        <p><strong>Bauteil-Toleranzen:</strong> Die aufgedruckte Kapazität eines Drehkondensators stimmt nur auf einige Prozent; zusätzlich addieren sich Streukapazitäten der Leitungen. Das verschiebt einzelne Punkte von der idealen Geraden.</p>
        <p><strong>Strategie dagegen:</strong> viele verschiedene C messen, über die Ausgleichsgerade auswerten (nicht aus einer Einzelmessung) — genau das hast du getan.</p>
      </details>`;

    panel.querySelector("#exp-l-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-l").value);
      if (!lEingabeOk(eingabe, lWahr)) {
        panel.querySelector("#exp-l-meldung").textContent = "✗ Das passt noch nicht (±1,0 mH). Nutze $L = 1/(2\\pi\\,m\\cdot 10^{3})^{2}/10^{-9}$ mit deiner Steigung m und gib L in mH an. (Deine Steigung ergibt rechnerisch rund " + komma(lAusMessung, 1) + " mH.)";
        return;
      }
      zustand.lBestaetigt = { eingabe, wahr: lWahr };
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "federmasse" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "halb" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("em-schwingkreis-messreihe.csv",
        ["C in nF", "f in kHz", "1/sqrt(C) in 1/sqrt(nF)"],
        zustand.messungen.map(z => [String(z.C), z.fkHz, 1 / Math.sqrt(z.C)]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        C: 10, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        lBestaetigt: null, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
    if (window.renderMathInElement) {
      try { window.renderMathInElement(panel, { delimiters: [{ left: "$", right: "$", display: false }] }); } catch (e) { /* KaTeX optional */ }
    }
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Der Kondensator speichert Energie im elektrischen Feld wie eine gespannte Feder, die Spule speichert sie im Magnetfeld wie die Bewegungsenergie einer Masse. Deshalb schwingt der LC-Kreis wie ein Feder-Masse-Pendel — er ist das elektrische Analogon des harmonischen Oszillators."
      : "✗ Nicht ganz: Reibung gehört zur Dämpfung (ohmscher Widerstand), nicht zur schwingenden Energie. Überlege, welches Bauteil „Spannenergie“ (wie eine Feder) und welches „Bewegungsenergie“ (wie eine Masse) trägt.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: $f \\propto 1/\\sqrt{C}$, und $1/\\sqrt{4} = 1/2$ — also halbiert sich f. Kontrolle in deiner Tabelle: Vergleiche zwei Zeilen, deren C im Verhältnis 1:4 stehen."
      : "✗ Schau auf $f = \\dfrac{1}{2\\pi\\sqrt{L\\,C}}$: C steht unter der Wurzel, vervierfachen heißt Faktor $1/\\sqrt{4} = 1/2$. Prüfe es an deiner Tabelle.";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
    vielleichtAnimieren();
  }
  wechslePhase("aufbau");
}
