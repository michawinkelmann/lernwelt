// experiment.js — Interaktives Experiment: Spezifischer Widerstand eines Drahtes (Klasse 8–10).
// Realitätsnahe Messpraxis statt fertiger Simulation: Abgreifklemme auf der
// Maßstab-Schiene verschieben, die wirksame Länge an der Skala SELBST ablesen,
// das Digital-Voltmeter übertragen — die Konstantstromquelle hält I = 0,500 A,
// also liefert R = U/I jede Zeile der Messtabelle. Im R-l-Diagramm liefert die
// Steigung der Regressionsgeraden ρ = m·A: für beide Konstantan-Drähte (fast)
// derselbe Wert trotz verschiedener R — eine Materialkonstante. Draht X wird
// über sein ρ als Eisen entlarvt.
// Kontrollwerte des Modells (l = 1,000 m): Konstantan d=0,35 mm → R = 5,197 Ω,
// U = 2,598 V · Konstantan d=0,50 mm → R = 2,546 Ω, U = 1,273 V · Draht X
// d=0,35 mm → R = 1,299 Ω, U = 0,650 V.
// Die kleine Messstreuung ist deterministisch geseedet → TESTS laufen in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, regression,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Konstanten ----------
export const I_KONST = 0.5;             // A — Konstantstromquelle, fest eingestellt
export const L_MIN = 0.20, L_MAX = 2.00, L_SCHRITT = 0.05; // m — Klemmen-Stellungen
export const MIN_MESSUNGEN = 5;         // Längen je Draht
export const POS_TOLERANZ = 0.005;      // m — Eintrag der abgelesenen Klemmen-Position
export const U_TOLERANZ = 0.015;        // V — Übertrag des Voltmeters
export const STEIGUNG_TOLERANZ = 0.04;  // relativ — abgelesene Steigung ΔR/Δl
export const RHO_TOLERANZ = 0.03;       // Ω·mm²/m — berechnetes ρ = m·A

// ---------- Drähte (Draht X ist das Messziel) ----------
export const DRAEHTE = [
  { id: "K35", name: "Konstantan d = 0,35 mm", kurz: "Konstantan 0,35 mm", d: 0.35, rho: 0.50, material: "Konstantan" },
  { id: "K50", name: "Konstantan d = 0,50 mm", kurz: "Konstantan 0,50 mm", d: 0.50, rho: 0.50, material: "Konstantan" },
  { id: "X", name: "Draht X d = 0,35 mm", kurz: "Draht X", d: 0.35, rho: 0.125, material: "Eisen", geheim: true }
];

// Literaturtabelle für den Materialvergleich (ρ in Ω·mm²/m bei 20 °C)
export const MATERIALIEN = [
  { name: "Kupfer", rho: 0.0178 },
  { name: "Eisen", rho: 0.125 },
  { name: "Konstantan", rho: 0.50 },
  { name: "Chromnickel", rho: 1.10 }
];

// ---------- Modell (exakt, Node-testbar) ----------
// Querschnittsfläche A = π·d²/4 in mm² (d in mm): 0,35 mm → 0,09621 mm², 0,50 mm → 0,19635 mm²
export function querschnitt(dMm) { return Math.PI * dMm * dMm / 4; }
// R = ρ·l/A in Ω (ρ in Ω·mm²/m, l in m, A in mm²)
export function widerstand(draht, l) { return draht.rho * l / querschnitt(draht.d); }
// wahre Spannung über dem Drahtstück: U = R·I
export function spannungIdeal(draht, l) { return widerstand(draht, l) * I_KONST; }
// Auswertung: R aus eingetragenem U, ρ aus abgelesener Steigung
export function rAusU(u) { return u / I_KONST; }
export function rhoAus(steigung, dMm) { return steigung * querschnitt(dMm); }
export function steigungOk(eingabe, soll) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - soll) <= STEIGUNG_TOLERANZ * Math.abs(soll);
}
// nächstliegendes Tabellenmaterial zu einem gemessenen ρ
export function materialZu(rho) {
  if (!Number.isFinite(rho)) return null;
  let best = null;
  for (const m of MATERIALIEN) if (!best || Math.abs(m.rho - rho) < Math.abs(best.rho - rho)) best = m;
  return best;
}

// ---------- deterministische Anzeigen (Ablese-Realismus, testbar) ----------
function lSchluessel(l) { return Math.round(l * 100); } // Stellung in ganzen cm
// Die Klemme landet nie exakt auf dem Sollwert: ±1,5 mm Versatz, an der Skala ablesbar.
export function klemmePosition(draht, l) {
  return l + streuung("pos:" + draht.id + ":" + lSchluessel(l), 0.003);
}
// Das Voltmeter zeigt die Spannung der TATSÄCHLICHEN Klemmen-Position plus Anzeigerauschen ±5 mV.
export function anzeigeU(draht, l) {
  return spannungIdeal(draht, klemmePosition(draht, l)) + streuung("U:" + draht.id + ":" + lSchluessel(l), 0.01);
}

// ---------- Erkenntnisfragen (Daten, DOM-frei) ----------
export const FRAGEN = {
  laenge: {
    text: "Doppelte Länge (gleicher Draht) — was macht der Widerstand?",
    optionen: ["R halbiert sich", "R bleibt gleich", "R verdoppelt sich", "R vervierfacht sich"],
    richtig: "R verdoppelt sich",
    erklaerung: "R ∝ l: doppelter Weg für die Elektronen, doppelter Widerstand. Prüf es in deiner Tabelle: l = 1,00 m hat etwa den doppelten R-Wert von l = 0,50 m.",
    tipp: "Schau ins Diagramm: Die Punkte liegen auf einer Ursprungsgeraden. Was passiert mit R, wenn du l verdoppelst?"
  },
  dicke: {
    text: "Doppelter Durchmesser (gleiches Material, gleiche Länge) — was macht der Widerstand?",
    optionen: ["R halbiert sich", "R viertelt sich", "R verdoppelt sich", "R vervierfacht sich"],
    richtig: "R viertelt sich",
    erklaerung: "A = π·d²/4 wächst quadratisch: doppeltes d → vierfaches A → ein Viertel des Widerstands. Deine beiden Konstantan-Drähte zeigen es: d = 0,35 → 0,50 mm senkt R auf das 0,49-Fache, denn (0,35/0,50)² = 0,49.",
    tipp: "Beliebte Falle: Es zählt der Querschnitt A = π·d²/4, nicht der Durchmesser selbst. Vergleiche deine beiden Konstantan-Drähte bei gleicher Länge."
  }
};

// ---------- TESTS (laufen in Node, kein document/window nötig) ----------
const K35 = DRAEHTE[0], K50 = DRAEHTE[1], DX = DRAEHTE[2];
// ideale Messreihe ohne Streuung (5 Längen)
function perfekteReihe(draht) {
  return [0.4, 0.8, 1.2, 1.6, 2.0].map(l => ({ x: l, y: widerstand(draht, l) }));
}
// abgelesene (gestreute) Reihe, wie sie im Versuch entsteht: x = Skalen-Ablesung, y = U/I
function gestreuteReihe(draht) {
  const punkte = [];
  for (let cm = 40; cm <= 200; cm += 40) {
    const l = cm / 100;
    punkte.push({ x: klemmePosition(draht, l), y: rAusU(anzeigeU(draht, l)) });
  }
  return punkte;
}
function rhoPipeline(draht, reihe) { return rhoAus(regression(reihe).m, draht.d); }

export const TESTS = [
  { name: "Querschnitte exakt: A(0,35) = 0,09621 mm², A(0,50) = 0,19635 mm²", ok: () =>
    Math.abs(querschnitt(0.35) - 0.09621) < 2e-6 && Math.abs(querschnitt(0.50) - 0.19635) < 2e-6 },
  { name: "Kontrollwerte R bei l = 1 m: 5,197 / 2,546 / 1,299 Ω", ok: () =>
    Math.abs(widerstand(K35, 1) - 5.197) < 5e-4 && Math.abs(widerstand(K50, 1) - 2.546) < 5e-4 && Math.abs(widerstand(DX, 1) - 1.299) < 5e-4 },
  { name: "Kontrollwerte U bei l = 1 m: 2,598 / 1,273 / 0,650 V", ok: () =>
    Math.abs(spannungIdeal(K35, 1) - 2.598) < 5e-4 && Math.abs(spannungIdeal(K50, 1) - 1.273) < 5e-4 && Math.abs(spannungIdeal(DX, 1) - 0.650) < 5e-4 },
  { name: "ρ-Pipeline: perfekte Reihe → ρ exakt (1e-9), beide Konstantan-Drähte identisch", ok: () => {
    const rhos = DRAEHTE.map(d => { const reg = regression(perfekteReihe(d)); return Math.abs(reg.b) < 1e-9 ? rhoAus(reg.m, d.d) : NaN; });
    return DRAEHTE.every((d, i) => Math.abs(rhos[i] - d.rho) < 1e-9) && Math.abs(rhos[0] - rhos[1]) < 1e-9; } },
  { name: "Dicken-Faktor: R(0,35)/R(0,50) = (0,50/0,35)² = 2,041 — umgekehrt 0,49", ok: () =>
    Math.abs(widerstand(K35, 1) / widerstand(K50, 1) - (0.5 / 0.35) ** 2) < 1e-9 &&
    Math.abs((0.5 / 0.35) ** 2 - 2.041) < 1e-3 &&
    Math.abs(widerstand(K50, 1.4) / widerstand(K35, 1.4) - 0.49) < 1e-9 },
  { name: "Draht X: ρ-Vergleich identifiziert eindeutig Eisen (auch ±0,03 daneben)", ok: () => {
    const rx = rhoPipeline(DX, perfekteReihe(DX));
    return materialZu(rx).name === "Eisen" && materialZu(0.125 - RHO_TOLERANZ).name === "Eisen" &&
      materialZu(0.125 + RHO_TOLERANZ).name === "Eisen" && materialZu(0.50).name === "Konstantan" && materialZu(0.0178).name === "Kupfer"; } },
  { name: "Streugrenzen: Klemme ±1,5 mm, Voltmeter ±5 mV (alle Drähte, alle Stellungen)", ok: () => {
    for (const d of DRAEHTE) for (let cm = 20; cm <= 200; cm += 5) {
      const l = cm / 100, pos = klemmePosition(d, l);
      if (Math.abs(pos - l) > 0.0015) return false;
      if (Math.abs(anzeigeU(d, l) - spannungIdeal(d, pos)) > 0.005) return false;
    }
    return true; } },
  { name: "Anzeigen deterministisch", ok: () =>
    klemmePosition(K35, 1) === klemmePosition(K35, 1) && anzeigeU(DX, 0.75) === anzeigeU(DX, 0.75) && anzeigeU(K35, 1.25) === anzeigeU(K35, 1.25) },
  { name: "Proportionalität: R(2l) = 2·R(l), R(1,5)/R(0,5) = 3", ok: () =>
    DRAEHTE.every(d => [0.3, 0.7, 0.95].every(l => Math.abs(widerstand(d, 2 * l) - 2 * widerstand(d, l)) < 1e-12)) &&
    DRAEHTE.every(d => Math.abs(widerstand(d, 1.5) / widerstand(d, 0.5) - 3) < 1e-12) },
  { name: "parseDezimal Komma/Punkt + Eintrags-Toleranzen (±5 mm, ±15 mV)", ok: () =>
    parseDezimal("2,598") === 2.598 && parseDezimal("2.598") === 2.598 && Number.isNaN(parseDezimal("zwei")) &&
    ablesungOk(1.004, 1.000, POS_TOLERANZ) && !ablesungOk(1.006, 1.000, POS_TOLERANZ) &&
    ablesungOk(2.61, 2.598, U_TOLERANZ) && !ablesungOk(2.58, 2.598, U_TOLERANZ) && !ablesungOk(NaN, 1, POS_TOLERANZ) },
  { name: "Steigungs-Prüfung ±4 %, ρ-Prüfung ±0,03", ok: () => {
    const m35 = widerstand(K35, 1);
    return steigungOk(m35 * 1.039, m35) && !steigungOk(m35 * 1.041, m35) && !steigungOk(NaN, m35) &&
      ablesungOk(0.52, rhoAus(m35, K35.d), RHO_TOLERANZ) && !ablesungOk(0.54, rhoAus(m35, K35.d), RHO_TOLERANZ); } },
  { name: "Gestreute 5er-Reihe → ρ besser als ±0,01 (alle Drähte)", ok: () =>
    DRAEHTE.every(d => Math.abs(rhoPipeline(d, gestreuteReihe(d)) - d.rho) < 0.01) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  function leereAuswertung() {
    return { m: NaN, mOk: false, rho: NaN, rhoOk: false, materialWahl: "", materialOk: false };
  }
  const zustand = {
    draht: DRAEHTE[0],
    l: 1.00,                 // Sollwert des Klemmen-Reglers in m
    info: "",
    messungen: Object.fromEntries(DRAEHTE.map(d => [d.id, []])), // je Draht: {key, l, u, r}
    auswertung: Object.fromEntries(DRAEHTE.map(d => [d.id, leereAuswertung()])),
    fragen: { laenge: { wahl: "", ok: false }, dicke: { wahl: "", ok: false } },
    phase: "aufbau"
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="360" height="540" aria-label="Versuchsaufbau: Messdraht auf einer Maßstab-Schiene mit verschiebbarer Abgreifklemme, dazu Konstantstromquelle (0,500 Ampere) und Digital-Voltmeter; unten eine Lupe auf die Skala an der Klemmenschneide."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  function serie() { return zustand.messungen[zustand.draht.id]; }

  // ---------- Zeichnung ----------
  function pfad(punkte) {
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }
  function geraeteBox(x, y, titel, wert, hinweis, cText, cLeise, cFlaeche, cBg) {
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, 156, 78, 8); else ctx.rect(x, y, 156, 78); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(titel, x + 78, y + 16);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x + 10, y + 24, 136, 32, 4); else ctx.rect(x + 10, y + 24, 136, 32); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 17px system-ui, sans-serif";
    ctx.fillText(wert, x + 78, y + 46);
    ctx.fillStyle = cLeise; ctx.font = "10.5px system-ui, sans-serif";
    ctx.fillText(hinweis, x + 78, y + 70);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
  }
  function zeichneLupe(pos, cText, cLeise, cAkzent, cFlaeche) {
    const bx = 28, by = 372, bw = 304, bh = 118;
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Lupe: Skala an der Klemmenschneide (Ablesung in m)", bx, by - 8);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    const ppmL = bw / 0.066;                  // Fenster: ±3,3 cm um die Schneide
    const cx = bx + bw / 2, basis = by + 74;
    ctx.save(); ctx.beginPath(); ctx.rect(bx, by, bw, bh); ctx.clip();
    const von = Math.max(0, Math.ceil((pos - 0.034) * 1000));
    const bis = Math.min(2040, Math.floor((pos + 0.034) * 1000));
    for (let mm = von; mm <= bis; mm++) {
      const v = mm / 1000, x = cx + (v - pos) * ppmL;
      const cmStrich = mm % 10 === 0, halb = mm % 5 === 0;
      ctx.strokeStyle = cmStrich ? cText : cLeise; ctx.lineWidth = cmStrich ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(x, basis); ctx.lineTo(x, basis - (cmStrich ? 26 : halb ? 17 : 10)); ctx.stroke();
      if (cmStrich) { ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(komma(v, 2), x, basis + 18); }
    }
    // Klemmenschneide als Marke in der Mitte
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, by + 16); ctx.lineTo(cx, basis + 2); ctx.stroke();
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.moveTo(cx - 6, by + 6); ctx.lineTo(cx + 6, by + 6); ctx.lineTo(cx, by + 16); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = cAkzent; ctx.textAlign = "center";
    ctx.fillText("Klemmenschneide", cx, by + bh + 16);
    ctx.textAlign = "left";
  }
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche", "#f4f4f4"), cBg = farbe("--bg", "#fff");
    const d = zustand.draht;
    const pos = klemmePosition(d, zustand.l);
    const xL = 26, ppm = 154, yDraht = 276, ySkala = 308, xR = xL + 2.0 * ppm;
    const xK = xL + pos * ppm;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";

    // Geräte mit Anzeigen
    geraeteBox(16, 28, "Konstantstromquelle", "I = " + komma(I_KONST, 3) + " A", "fest eingestellt", cText, cLeise, cFlaeche, cBg);
    geraeteBox(188, 28, "Digital-Voltmeter", komma(anzeigeU(d, zustand.l), 3) + " V", "Abgriff direkt am Draht", cText, cLeise, cFlaeche, cBg);

    // Stromkreis: Quelle → linkes Drahtende und → Abgreifklemme
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    pfad([[40, 106], [40, yDraht], [xL, yDraht]]);
    pfad([[152, 106], [152, 160], [xK, 160], [xK, 248]]);
    ctx.fillStyle = cText;
    ctx.fillText("−", 28, 122); ctx.fillText("+", 158, 122);

    // Spannungsabgriff direkt am Drahtstück (Vierleiter-Idee), gestrichelt
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    pfad([[206, 106], [206, 192], [33, 192], [33, yDraht - 3]]);
    pfad([[326, 106], [326, 206], [xK + 7, 206], [xK + 7, 252]]);
    ctx.setLineDash([]);

    // Drahtname
    ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    const drahtLabel = "Messdraht: " + d.name;
    const dlBreite = ctx.measureText(drahtLabel).width;
    ctx.fillStyle = cBg;                                   // Hintergrund-Chip, damit Leitungen das Label nicht durchkreuzen
    ctx.fillRect(180 - dlBreite / 2 - 5, 128, dlBreite + 10, 16);
    ctx.fillStyle = cText;
    ctx.fillText(drahtLabel, 180, 140);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";

    // Messdraht: stromdurchflossen bis zur Klemme, dahinter stromlos.
    // Die Strichdicke macht den Durchmesser sichtbar (0,35 mm vs. 0,50 mm).
    const dicke = d.d * 9;
    ctx.lineCap = "round";
    ctx.strokeStyle = cText; ctx.lineWidth = dicke;
    ctx.beginPath(); ctx.moveTo(xL, yDraht); ctx.lineTo(xK, yDraht); ctx.stroke();
    ctx.globalAlpha = 0.45; ctx.strokeStyle = cLeise;
    ctx.beginPath(); ctx.moveTo(xK, yDraht); ctx.lineTo(xR, yDraht); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineCap = "butt";
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText("rechts der Klemme: stromlos", xR, 242);
    ctx.textAlign = "left"; ctx.font = "12px system-ui, sans-serif";

    // Abgreifklemme mit Schneide + Führungslinie zur Skala
    ctx.fillStyle = cBg; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(xK - 7, 248, 14, 14, 3); else ctx.rect(xK - 7, 248, 14, 14); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.moveTo(xK - 5, 262); ctx.lineTo(xK + 5, 262); ctx.lineTo(xK, yDraht - 1); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(xK, yDraht + dicke / 2 + 1); ctx.lineTo(xK, ySkala); ctx.stroke(); ctx.setLineDash([]);

    // Maßstab-Schiene (grobe Skala — fein ablesen in der Lupe)
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(xL, ySkala); ctx.lineTo(xR, ySkala); ctx.stroke();
    for (let dm = 0; dm <= 20; dm++) {
      const v = dm / 10, x = xL + v * ppm, gross = dm % 5 === 0;
      ctx.strokeStyle = gross ? cText : cLeise; ctx.lineWidth = gross ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, ySkala); ctx.lineTo(x, ySkala + (gross ? 12 : 7)); ctx.stroke();
      if (gross) { ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(komma(v, 1), x, ySkala + 26); }
    }
    ctx.textAlign = "left"; ctx.fillStyle = cText; ctx.fillText("m", xR + 8, ySkala + 26);

    zeichneLupe(pos, cText, cLeise, cAkzent, cFlaeche);
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf einer <strong>Maßstab-Schiene</strong> ist ein Messdraht gespannt. Links ist er fest angeschlossen, die <strong>Abgreifklemme</strong> kannst du verschieben — vom Strom durchflossen wird nur das Stück bis zur Klemme. Seine Länge l heißt <strong>wirksame Länge</strong>.</p>
      <p>Die <strong>Konstantstromquelle</strong> hält die Stromstärke fest auf <strong>I = ${komma(I_KONST, 3)} A</strong> — egal, wie lang das Drahtstück ist. Das <strong>Digital-Voltmeter</strong> greift die Spannung mit eigenen Leitungen direkt am Drahtstück ab (wie bei einer echten Vierleitermessung): Übergangswiderstände der Klemmen verfälschen die Messung so praktisch nicht — wir vernachlässigen sie hier bewusst.</p>
      <p><strong>Plan:</strong> Je Draht mindestens ${MIN_MESSUNGEN} Längen zwischen ${komma(L_MIN, 2)} m und ${komma(L_MAX, 2)} m einstellen, die Klemmen-Position in der Lupe ablesen, U übertragen — R = U/I rechnet die Tabelle. In der Auswertung trägst du R über l auf: Die Steigung liefert ρ = Steigung · A.</p>
      <p class="exp-hinweis">⚠ Wie im echten Versuch gilt: nur kurz messen. Ein dauerhaft bestromter dünner Draht erwärmt sich — und bei den meisten Metallen wächst der Widerstand mit der Temperatur.</p>
      <label for="exp-draht"><strong>Draht wählen:</strong></label>
      <select id="exp-draht" class="exp-wahl">${DRAEHTE.map((d, i) => `<option value="${i}">${esc(d.name)}</option>`).join("")}</select>
      <p>Tipp: Starte mit Konstantan d = 0,35 mm. Nimm danach den dickeren Konstantan-Draht — gleiches Material, anderer Querschnitt! Draht X ist die Detektivaufgabe: Sein Material verrät erst dein ρ.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    const wahl = panel.querySelector("#exp-draht");
    wahl.value = String(DRAEHTE.indexOf(zustand.draht));
    wahl.addEventListener("change", ev => {
      zustand.draht = DRAEHTE[Number(ev.target.value)];
      zustand.info = "";
      zeichne();
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchführung ----------
  function panelMessen() {
    const d = zustand.draht, s = serie();
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <p>Eingespannt: <strong>${esc(d.name)}</strong> <button class="knopf zweitrangig" id="exp-wechseln">Draht wechseln</button></p>
      <div class="exp-regler">
        <label for="exp-l">Abgreifklemme verschieben — Sollwert: <span id="exp-l-live">${komma(zustand.l, 2)}&nbsp;m</span></label>
        <input type="range" id="exp-l" min="${L_MIN}" max="${L_MAX}" step="${L_SCHRITT}" value="${zustand.l}">
      </div>
      <p>Die Quelle hält I = ${komma(I_KONST, 3)} A. Lies links ab: die <strong>Klemmen-Position</strong> in der Lupe (die Klemme sitzt nie exakt auf dem Sollwert!) und das <strong>Voltmeter</strong>:</p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-lab">l in m:</label>
        <input id="exp-lab" inputmode="decimal" autocomplete="off" size="7">
        <label for="exp-uab">U in V:</label>
        <input id="exp-uab" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.info)}</p>
      <h3>Messtabelle — ${esc(d.kurz)}</h3>
      <table class="exp-tabelle"><thead><tr><th>l in m</th><th>U in V</th><th>R = U/I in Ω</th></tr></thead>
      <tbody>${s.map(z => `<tr><td>${komma(z.l, 3)}</td><td>${komma(z.u, 3)}</td><td>${komma(z.r, 2)}</td></tr>`).join("") || '<tr><td colspan="3">noch leer</td></tr>'}</tbody></table>
      <p>${s.length} von mindestens ${MIN_MESSUNGEN} Messungen für diesen Draht.</p>
      <button class="knopf" id="exp-weiter2" ${s.length >= MIN_MESSUNGEN ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelector("#exp-wechseln").addEventListener("click", () => wechslePhase("aufbau"));
    const regler = panel.querySelector("#exp-l");
    regler.addEventListener("input", () => {
      zustand.l = Math.round(parseDezimal(regler.value) * 100) / 100;
      zustand.info = "";
      panel.querySelector("#exp-l-live").innerHTML = komma(zustand.l, 2) + "&nbsp;m";
      panel.querySelector("#exp-meldung").textContent = "";
      zeichne();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const lAb = parseDezimal(panel.querySelector("#exp-lab").value);
      const uAb = parseDezimal(panel.querySelector("#exp-uab").value);
      const key = lSchluessel(zustand.l);
      if (s.some(z => z.key === key)) {
        meldung.textContent = "Bei dieser Klemmen-Stellung hast du an diesem Draht schon gemessen — verschieb die Klemme.";
        return;
      }
      if (!ablesungOk(lAb, klemmePosition(d, zustand.l), POS_TOLERANZ)) {
        meldung.textContent = "✗ Schau in die Lupe: Wo steht die Klemmenschneide auf der Skala? (Auf mm genau ablesen, z. B. 0,998.)";
        return;
      }
      if (!ablesungOk(uAb, anzeigeU(d, zustand.l), U_TOLERANZ)) {
        meldung.textContent = "✗ Das Voltmeter zeigt etwas anderes — übertrage alle drei Nachkommastellen (z. B. 2,598).";
        return;
      }
      const r = rAusU(uAb);
      s.push({ key, l: lAb, u: uAb, r });
      s.sort((z1, z2) => z1.key - z2.key);
      zustand.auswertung[d.id] = leereAuswertung(); // neue Daten → Auswertung dieses Drahts neu
      zustand.info = `✓ Eingetragen. Das System rechnet: R = U/I = ${komma(r, 2)} Ω. Verschieb die Klemme zur nächsten Länge.`;
      panelMessen();
    });
  }

  // ---------- Phase 3: Auswertung ----------
  function frageOptionen(frage, wahl) {
    return ['<option value="">– bitte wählen –</option>']
      .concat(frage.optionen.map(o => `<option value="${esc(o)}"${wahl === o ? " selected" : ""}>${esc(o)}</option>`))
      .join("");
  }
  function panelAuswerten() {
    if (!DRAEHTE.some(d => zustand.messungen[d.id].length >= MIN_MESSUNGEN)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Noch keine vollständige Messreihe: Du brauchst je Draht mindestens ${MIN_MESSUNGEN} Längen. Zurück zur Durchführung!</p>
        <button class="knopf" id="exp-zurueck">Weiter messen</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const regs = {};
    for (const d of DRAEHTE) {
      const s = zustand.messungen[d.id];
      if (s.length >= 2) regs[d.id] = regression(s.map(z => ({ x: z.l, y: z.r })));
    }
    let html = `
      <h2>Auswertung</h2>
      <p>Modell: <strong>R = ρ·l/A</strong> — bei festem Draht ist R proportional zu l. Im R-l-Diagramm liegt je Draht eine Ursprungsgerade mit der Steigung <strong>m = ρ/A</strong>, also ist <strong>ρ = m·A</strong> (Querschnitt A = π·d²/4).</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="R-l-Diagramm mit deinen Messpunkten und gestrichelten Regressionsgeraden, je Draht ein eigenes Punktsymbol."></canvas>
      <h3>Tabelle: spezifischer Widerstand (20 °C)</h3>
      <table class="exp-tabelle"><thead><tr><th>Stoff</th><th>ρ in Ω·mm²/m</th></tr></thead>
      <tbody>${MATERIALIEN.map(mm => `<tr><td style="text-align:left">${esc(mm.name)}</td><td>${komma(mm.rho, mm.rho < 0.1 ? 4 : 3)}</td></tr>`).join("")}</tbody></table>`;
    for (const d of DRAEHTE) {
      const s = zustand.messungen[d.id];
      if (s.length < MIN_MESSUNGEN) continue;
      const a = zustand.auswertung[d.id];
      html += `
      <h3>${esc(d.kurz)}${d.geheim && a.materialOk ? " = Eisen ✓" : ""}: Steigung → ρ</h3>
      <p>Lies die Steigung der ${esc(d.kurz)}-Geraden im Diagramm ab: zwei weit auseinanderliegende Stellen <em>auf der Geraden</em> wählen und m = ΔR/Δl bilden.</p>
      <form class="exp-ablesen exp-m-form" data-draht="${d.id}">
        <label for="exp-m-${d.id}">m in Ω/m:</label>
        <input id="exp-m-${d.id}" inputmode="decimal" autocomplete="off" size="7" ${a.mOk ? "disabled" : ""} value="${a.mOk ? komma(a.m, 2) : ""}">
        <button class="knopf" ${a.mOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-m-meldung-${d.id}" class="exp-meldung" aria-live="polite">${a.mOk ? "✓ Gut abgelesen." : ""}</p>`;
      if (a.mOk) html += `
      <p>Querschnitt: A = π·d²/4 = <strong>${komma(querschnitt(d.d), 5)} mm²</strong> (d = ${komma(d.d, 2)} mm). Berechne ρ = m·A.</p>
      <form class="exp-ablesen exp-rho-form" data-draht="${d.id}">
        <label for="exp-rho-${d.id}">ρ in Ω·mm²/m:</label>
        <input id="exp-rho-${d.id}" inputmode="decimal" autocomplete="off" size="7" ${a.rhoOk ? "disabled" : ""} value="${a.rhoOk ? komma(a.rho, 3) : ""}">
        <button class="knopf" ${a.rhoOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-rho-meldung-${d.id}" class="exp-meldung" aria-live="polite">${a.rhoOk ? "✓ Richtig gerechnet." : ""}</p>`;
      if (a.rhoOk && !d.geheim) html += `
      <p>Dein Ergebnis: ρ ≈ <strong>${komma(a.rho, 3)} Ω·mm²/m</strong> — Tabellenwert Konstantan: 0,500. Gut getroffen!</p>`;
      if (a.rhoOk && d.geheim) html += `
      <p>Dein Ergebnis: ρ ≈ <strong>${komma(a.rho, 3)} Ω·mm²/m</strong>. Vergleiche mit der Tabelle oben — welches Material steckt in Draht X?</p>
      <form class="exp-ablesen exp-material-form">
        <label for="exp-material">Material:</label>
        <select id="exp-material" class="exp-wahl">
          <option value="">– bitte wählen –</option>
          ${MATERIALIEN.map(mm => `<option value="${esc(mm.name)}"${a.materialWahl === mm.name ? " selected" : ""}>${esc(mm.name)}</option>`).join("")}
        </select>
        <button class="knopf" ${a.materialOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-material-meldung" class="exp-meldung" aria-live="polite">${a.materialOk ? "✓ Draht X ist ein Eisendraht — ρ ≈ 0,125 Ω·mm²/m passt zu keinem anderen Tabellenwert." : ""}</p>`;
    }
    if (zustand.auswertung.K35.rhoOk && zustand.auswertung.K50.rhoOk) html += `
      <p class="exp-hinweis"><strong>Materialkonstante entdeckt:</strong> Der dicke Konstantan-Draht hatte bei jeder Länge nur etwa den 0,49-fachen Widerstand — genau (0,35/0,50)², weil A mit d² wächst. Trotzdem liefert ρ = m·A für beide (fast) denselben Wert (deine: ${komma(zustand.auswertung.K35.rho, 3)} und ${komma(zustand.auswertung.K50.rho, 3)}): <strong>ρ hängt nur vom Material ab</strong>, nicht von Länge oder Dicke des Drahts.</p>`;
    const fehlt = DRAEHTE.filter(d => zustand.messungen[d.id].length < MIN_MESSUNGEN);
    if (fehlt.length) html += `
      <p>Noch keine vollständige Messreihe: <strong>${fehlt.map(d => esc(d.kurz)).join(", ")}</strong>. Geh über „Mehr Messungen“ → „Draht wechseln“ zurück — erst der Vergleich zeigt, was ρ besonders macht.</p>`;
    html += `
      <h3>Erkenntnisfragen</h3>
      <form class="exp-ablesen exp-frage-form" data-frage="laenge">
        <label for="exp-frage-laenge">${esc(FRAGEN.laenge.text)}</label>
        <select id="exp-frage-laenge" class="exp-wahl">${frageOptionen(FRAGEN.laenge, zustand.fragen.laenge.wahl)}</select>
        <button class="knopf" ${zustand.fragen.laenge.ok ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-frage-meldung-laenge" class="exp-meldung" aria-live="polite">${zustand.fragen.laenge.ok ? "✓ " + esc(FRAGEN.laenge.erklaerung) : ""}</p>
      <form class="exp-ablesen exp-frage-form" data-frage="dicke">
        <label for="exp-frage-dicke">${esc(FRAGEN.dicke.text)}</label>
        <select id="exp-frage-dicke" class="exp-wahl">${frageOptionen(FRAGEN.dicke, zustand.fragen.dicke.wahl)}</select>
        <button class="knopf" ${zustand.fragen.dicke.ok ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-frage-meldung-dicke" class="exp-meldung" aria-live="polite">${zustand.fragen.dicke.ok ? "✓ " + esc(FRAGEN.dicke.erklaerung) : ""}</p>
      <p class="exp-hinweis"><strong>Warum diese Materialien?</strong> <strong>Konstantan</strong> heißt so, weil sein Widerstand bei Erwärmung nahezu konstant bleibt — ideal für Mess- und Präzisionswiderstände im Praktikum. <strong>Kupfer</strong> hat das kleinste ρ der Tabelle: In Leitungen soll möglichst wenig Energie verloren gehen — deshalb Kupfer ins Kabel und Konstantan ins Messgerät.</p>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV herunterladen</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was begrenzt die Genauigkeit?</summary>
        <ul>
          <li><strong>Übergangswiderstände:</strong> Das Voltmeter greift hier direkt am Draht ab (Vierleiter-Idee), darum stören Klemmen- und Übergangswiderstände kaum. Misst man U stattdessen an der Quelle, misst man Zuleitungen und Klemmen mit — bei so kleinen R ein grober Fehler.</li>
          <li><strong>Drahterwärmung:</strong> Wer zu lange misst, heizt den Draht auf — bei Eisen oder Kupfer steigt R dann deutlich, bei Konstantan kaum (daher der Name). Also: einstellen, ablesen, weiterschieben.</li>
          <li><strong>Durchmesser-Toleranz:</strong> d geht quadratisch in A = π·d²/4 ein — schon 3 % Abweichung in d machen rund 6 % Fehler in A und damit in ρ. Deshalb misst man d mit der Mikrometerschraube, an mehreren Stellen.</li>
          <li><strong>Ablesung der Länge:</strong> ±1–2 mm an der Skala sind bei l = 0,20 m schon 1 %, bei 2,00 m nur 0,1 % — lange Drahtstücke messen sich genauer.</li>
        </ul>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.innerHTML = html;

    panel.querySelectorAll(".exp-m-form").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const id = f.dataset.draht, a = zustand.auswertung[id];
      const eingabe = parseDezimal(f.querySelector("input").value);
      if (steigungOk(eingabe, regs[id].m)) {
        a.m = eingabe; a.mOk = true; panelAuswerten();
      } else {
        document.getElementById("exp-m-meldung-" + id).textContent =
          "✗ Das passt noch nicht zur Geraden. Nimm zwei Stellen auf der Geraden (z. B. bei l = 0,50 m und l = 2,00 m) und teile ΔR durch Δl.";
      }
    }));
    panel.querySelectorAll(".exp-rho-form").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const id = f.dataset.draht, a = zustand.auswertung[id];
      const d = DRAEHTE.find(x => x.id === id);
      const eingabe = parseDezimal(f.querySelector("input").value);
      if (ablesungOk(eingabe, rhoAus(a.m, d.d), RHO_TOLERANZ)) {
        a.rho = eingabe; a.rhoOk = true; panelAuswerten();
      } else {
        document.getElementById("exp-rho-meldung-" + id).textContent =
          `✗ Rechne ρ = m·A mit deinem m = ${komma(a.m, 2)} Ω/m und A = ${komma(querschnitt(d.d), 5)} mm² — das Ergebnis hat die Einheit Ω·mm²/m.`;
      }
    }));
    panel.querySelectorAll(".exp-material-form").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const a = zustand.auswertung.X;
      a.materialWahl = f.querySelector("select").value;
      if (a.materialWahl === "Eisen") {
        a.materialOk = true; panelAuswerten();
      } else {
        document.getElementById("exp-material-meldung").textContent =
          "✗ Vergleiche dein ρ mit der Tabelle: Welcher Wert liegt am nächsten?";
      }
    }));
    panel.querySelectorAll(".exp-frage-form").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const frage = FRAGEN[f.dataset.frage], z = zustand.fragen[f.dataset.frage];
      z.wahl = f.querySelector("select").value;
      if (z.wahl === frage.richtig) {
        z.ok = true; panelAuswerten();
      } else {
        document.getElementById("exp-frage-meldung-" + f.dataset.frage).textContent = "✗ " + frage.tipp;
      }
    }));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = [];
      for (const d of DRAEHTE) for (const z of zustand.messungen[d.id]) zeilen.push([d.kurz, z.l, z.u, z.r]);
      csvHerunterladen("spezifischer-widerstand-messwerte.csv", ["Draht", "l in m", "U in V", "R in Ohm"], zeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.draht = DRAEHTE[0]; zustand.l = 1.00; zustand.info = "";
      zustand.messungen = Object.fromEntries(DRAEHTE.map(d => [d.id, []]));
      zustand.auswertung = Object.fromEntries(DRAEHTE.map(d => [d.id, leereAuswertung()]));
      zustand.fragen = { laenge: { wahl: "", ok: false }, dicke: { wahl: "", ok: false } };
      zeichne(); wechslePhase("aufbau");
    });
    zeichneDiagramm(regs);
  }

  // R-l-Diagramm: Messpunkte je Draht in eigenem Stil + Regressionsgeraden
  function zeichneDiagramm(regs) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 50, Re = W - 14, O = 16, Un = H - 40;
    const alle = DRAEHTE.map(d => ({ d, s: zustand.messungen[d.id] })).filter(e => e.s.length);
    const lMax = 2.1;
    const rMax = Math.max(3, ...alle.map(e => Math.max(...e.s.map(z => z.r)))) * 1.12;
    const X = v => L + (v / lMax) * (Re - L);
    const Y = v => Un - (v / rMax) * (Un - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif"; c.textBaseline = "alphabetic"; c.lineWidth = 1;
    const rSchritt = rMax > 8 ? 2 : rMax > 4 ? 1 : 0.5;
    for (let r = 0; r <= rMax; r += rSchritt) {
      c.strokeStyle = r === 0 ? cText : cLeise; c.globalAlpha = r === 0 ? 1 : 0.5;
      c.beginPath(); c.moveTo(L, Y(r)); c.lineTo(Re, Y(r)); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "right"; c.fillText(komma(r, rSchritt < 1 ? 1 : 0), L - 5, Y(r) + 4);
    }
    for (let lv = 0; lv <= 2.0001; lv += 0.5) {
      c.strokeStyle = lv === 0 ? cText : cLeise; c.globalAlpha = lv === 0 ? 1 : 0.5;
      c.beginPath(); c.moveTo(X(lv), O); c.lineTo(X(lv), Un); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "center"; c.fillText(komma(lv, 1), X(lv), Un + 16);
    }
    c.fillStyle = cText; c.textAlign = "left";
    c.fillText("R in Ω", 6, 12); c.fillText("l in m", W - 46, H - 8);
    for (const e of alle) {
      const reg = regs[e.d.id];
      if (!reg || !Number.isFinite(reg.m)) continue;
      const x2 = Math.min(2.05, (rMax - reg.b) / reg.m);
      c.strokeStyle = cLeise; c.lineWidth = 1.5; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(reg.b)); c.lineTo(X(x2), Y(reg.m * x2 + reg.b)); c.stroke();
      c.setLineDash([]);
    }
    // Punktsymbole: Kreis (Konstantan 0,35), offenes Quadrat (Konstantan 0,50), Dreieck (X)
    function marker(e, x, y) {
      if (e.d.id === "K35") { c.fillStyle = cAkzent; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
      else if (e.d.id === "K50") { c.strokeStyle = cText; c.lineWidth = 2; c.strokeRect(x - 4.5, y - 4.5, 9, 9); }
      else { c.fillStyle = cText; c.beginPath(); c.moveTo(x, y - 5.5); c.lineTo(x + 5.5, y + 4.5); c.lineTo(x - 5.5, y + 4.5); c.closePath(); c.fill(); }
    }
    for (const e of alle) for (const z of e.s) marker(e, X(z.l), Y(z.r));
    let ly = O + 12;
    c.font = "12px system-ui, sans-serif"; c.textAlign = "left";
    for (const e of alle) {
      marker(e, L + 14, ly - 4);
      c.fillStyle = cText; c.fillText(e.d.kurz, L + 26, ly);
      ly += 18;
    }
  }

  // ---------- Phasensteuerung ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  zeichne();
  wechslePhase("aufbau");
}
