// experiment.js — Interaktives Experiment: Photoeffekt — h bestimmen (Qualifikationsphase).
// Gegenfeldmethode wie im Praktikum: Hg-Linie am Filterrad wählen, die Gegenspannung
// in 0,01-V-Schritten feinfühlig hochfahren, den Strom-Nullpunkt am ANALOGEN
// Zeigerinstrument selbst aufsuchen und U₀ notieren. Aus der U₀-f-Geraden folgen
// h (Steigung, über e·m) und die Austrittsarbeit der Kathode (Achsenabschnitt).
// Das Zeigerrauschen ist deterministisch geseedet (helfer.streuung): TESTS laufen in Node.

import { streuung, parseDezimal, komma, esc, regression, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen } from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
export const HC_E = 1239.84;            // h·c/e in eV·nm bzw. V·nm (Kurs-Standardwert)
export const AUSTRITTSARBEIT = 2.25;    // W_A der Kathode in eV (Kalium) — im UI NIE anzeigen: Messziel Nr. 2!
export const I0 = 12;                   // Fotostrom bei U = 0 in pA
export const RAUSCH_SPANNE = 0.3;       // Zeigerrauschen: ±0,15 pA
export const C_LICHT = 2.99792458e8;    // Lichtgeschwindigkeit in m/s
export const E_LADUNG = 1.602e-19;      // Elementarladung in C (Wert fürs Protokoll)
export const E_EXAKT = 1.602176634e-19; // exakter Wert — nur für die Modell-Selbstprüfung
export const U_MAX = 2;                 // Stellbereich der Gegenspannung in V
export const U0_TOLERANZ = 0.03;        // akzeptierte Abweichung beim U₀-Eintrag in V

// Hg-Linien des Filterrads (Farbwerte nur für die Zeichnung)
export const LINIEN = [
  { nm: 365.0, name: "UV", farbe: "#8d4bd6", unsichtbar: true },
  { nm: 404.7, name: "violett", farbe: "#7a2ff0" },
  { nm: 435.8, name: "blau", farbe: "#2f5df0" },
  { nm: 546.1, name: "grün", farbe: "#2da13c" },
  { nm: 578.0, name: "gelb", farbe: "#d9b918" }
];

// ---------- Physikmodell (rein, Node-testbar) ----------
// Grenzspannung in V; kann ≤ 0 sein (dann löst die Linie gar keine Elektronen aus)
export function u0Volt(nm) { return HC_E / nm - AUSTRITTSARBEIT; }
export function hatFotostrom(nm) { return u0Volt(nm) > 0; }
// Frequenz in Einheiten von 10¹⁴ Hz (in der Messtabelle vorgerechnet)
export function fIn1e14(nm) { return C_LICHT / (nm * 1e-9) / 1e14; }
// idealer Fotostrom in pA: linear fallend bis U₀, danach exakt 0
export function stromIdeal(nm, u) {
  const u0 = u0Volt(nm);
  if (u0 <= 0) return 0; // Photonenenergie < W_A: nie Fotostrom, egal welche Spannung
  return I0 * Math.max(0, 1 - u / u0);
}
// was das Zeigerinstrument anzeigt: ideal + deterministisches Rauschen (±0,15 pA)
export function stromGemessen(nm, u) {
  return stromIdeal(nm, u) + streuung("I:" + nm + ":" + u.toFixed(2), RAUSCH_SPANNE);
}

// ---------- Eintrags- und Auswertungsprüfungen ----------
export function eintragOk(eingabe, nm) {
  return hatFotostrom(nm) && Number.isFinite(eingabe) && Math.abs(eingabe - u0Volt(nm)) <= U0_TOLERANZ;
}
// Regression über die Messtabelle: x = f in 10¹⁴ Hz, y = U₀ in V
export function auswertung(messungen) {
  const punkte = messungen.map(z => ({ x: fIn1e14(z.nm), y: z.u0 }));
  const { m, b } = regression(punkte);
  return { m, b, punkte };
}
// Schritt 1: Steigung ablesen (±3 % um die Regressionssteigung)
export function pruefeSteigung(eingabe, mRegr) {
  return Number.isFinite(eingabe) && Number.isFinite(mRegr) && Math.abs(eingabe - mRegr) <= 0.03 * Math.abs(mRegr);
}
// Steigung in V/10¹⁴ Hz → h in Js
export function hAusSteigung(m1e14, e = E_LADUNG) { return m1e14 * 1e-14 * e; }
// Schritt 2: h berechnen (Eingabe in 10⁻³⁴ Js, ±0,2 um e·m der eingetragenen Steigung)
export function pruefeH(eingabe1e34, m1e14) {
  return Number.isFinite(eingabe1e34) && Math.abs(eingabe1e34 - hAusSteigung(m1e14) * 1e34) <= 0.2;
}
// Schritt 3: W_A vom Achsenabschnitt ablesen (Eingabe in eV, ±0,1 um −b)
export function pruefeWa(eingabeEv, bRegr) {
  return Number.isFinite(eingabeEv) && Math.abs(eingabeEv - (-bRegr)) <= 0.1;
}

// gängige Austrittsarbeiten (Schulbuchwerte) — wird erst nach Schritt 3 eingeblendet
export const AUSTRITTSARBEITEN = [
  { stoff: "Cäsium", wa: 1.94 },
  { stoff: "Kalium", wa: 2.25 },
  { stoff: "Natrium", wa: 2.28 },
  { stoff: "Calcium", wa: 2.87 },
  { stoff: "Zink", wa: 4.34 },
  { stoff: "Kupfer", wa: 4.48 },
  { stoff: "Platin", wa: 5.36 }
];

// ---------- Prüffälle + TESTS (Modulebene DOM-frei, in Node lauffähig) ----------
export const pruefFaelle = [
  { nm: 365.0, u0: 1.147 },
  { nm: 404.7, u0: 0.814 },
  { nm: 435.8, u0: 0.595 },
  { nm: 546.1, u0: 0.020 },  // nur knapp über 0: fast an der Grenzfrequenz!
  { nm: 578.0, u0: null }    // unter der Grenzfrequenz: kein Fotostrom
];

function perfekteReihe() {
  return LINIEN.filter(l => hatFotostrom(l.nm)).map(l => ({ nm: l.nm, u0: u0Volt(l.nm) }));
}

export const TESTS = [
  { name: "U₀-Kontrollwerte: 1,147 / 0,814 / 0,595 / 0,020 V", ok: () =>
    [[365.0, 1.147], [404.7, 0.814], [435.8, 0.595], [546.1, 0.020]]
      .every(([nm, soll]) => Math.abs(u0Volt(nm) - soll) < 0.001) },
  { name: "546,1 nm fast an der Grenzfrequenz (0 < U₀ < 0,05 V)", ok: () =>
    u0Volt(546.1) > 0 && u0Volt(546.1) < 0.05 && hatFotostrom(546.1) },
  { name: "578,0 nm: kein Fotostrom — bei keiner Spannung", ok: () =>
    u0Volt(578.0) < 0 && !hatFotostrom(578.0) &&
    [0, 0.25, 0.5, 1, 1.5, 2].every(u => stromIdeal(578.0, u) === 0 && Math.abs(stromGemessen(578.0, u)) <= 0.15 + 1e-12) },
  { name: "Perfekte Reihe → h = 6,626·10⁻³⁴ Js (exakt)", ok: () => {
    const { m } = auswertung(perfekteReihe());
    return Math.abs(hAusSteigung(m, E_EXAKT) * 1e34 - 6.626) < 0.005; } },
  { name: "Perfekte Reihe → W_A = 2,25 eV (Achsenabschnitt exakt)", ok: () => {
    const { b } = auswertung(perfekteReihe());
    return Math.abs(-b - AUSTRITTSARBEIT) < 1e-9; } },
  { name: "Auf 0,01 V gerundete Reihe → h auf ±0,2, W_A auf ±0,1 genau", ok: () => {
    const reihe = perfekteReihe().map(z => ({ nm: z.nm, u0: Math.round(z.u0 * 100) / 100 }));
    const { m, b } = auswertung(reihe);
    return Math.abs(hAusSteigung(m) * 1e34 - 6.626) <= 0.2 && Math.abs(-b - AUSTRITTSARBEIT) <= 0.1; } },
  { name: "Rauschen deterministisch und ≤ ±0,15 pA", ok: () =>
    LINIEN.every(l => {
      for (let c = 0; c <= 200; c += 7) {
        const u = c / 100;
        if (Math.abs(stromGemessen(l.nm, u) - stromIdeal(l.nm, u)) > 0.15 + 1e-12) return false;
        if (stromGemessen(l.nm, u) !== stromGemessen(l.nm, u + 0)) return false;
      }
      return true; }) },
  { name: "I(U) monoton fallend, Nullpunkt exakt bei U₀", ok: () =>
    LINIEN.filter(l => hatFotostrom(l.nm)).every(l => {
      let vorher = Infinity;
      for (let c = 0; c <= 200; c++) {
        const i = stromIdeal(l.nm, c / 100);
        if (i > vorher + 1e-12) return false;
        vorher = i;
      }
      const u0 = u0Volt(l.nm);
      return stromIdeal(l.nm, u0 + 0.001) === 0 && stromIdeal(l.nm, Math.max(0, u0 - 0.01)) > 0; }) },
  { name: "U₀-Eintrag: Toleranz ±0,03 V, Komma wie Punkt", ok: () =>
    eintragOk(parseDezimal("1,147"), 365.0) && eintragOk(parseDezimal("1.12"), 365.0) &&
    !eintragOk(1.10, 365.0) && !eintragOk(NaN, 365.0) && !eintragOk(0.1, 578.0) &&
    eintragOk(0.02, 546.1) && !eintragOk(-0.01, 546.1) },
  { name: "f-Spalte (10¹⁴ Hz) korrekt vorgerechnet", ok: () =>
    [[365.0, 8.213], [404.7, 7.408], [435.8, 6.879], [546.1, 5.490], [578.0, 5.187]]
      .every(([nm, soll]) => Math.abs(fIn1e14(nm) - soll) < 0.001) },
  { name: "Auswertungs-Prüfungen: ±3 % / ±0,2 / ±0,1", ok: () => {
    const m = 0.413566;
    return pruefeSteigung(0.414, m) && !pruefeSteigung(0.43, m) && !pruefeSteigung(NaN, m) &&
      pruefeH(6.63, m) && !pruefeH(6.0, m) && pruefeWa(2.25, -2.25) && pruefeWa(2.31, -2.25) && !pruefeWa(2.4, -2.25); } },
  { name: "Prüffälle konsistent", ok: () =>
    pruefFaelle.every(p => p.u0 === null ? !hatFotostrom(p.nm) : Math.abs(u0Volt(p.nm) - p.u0) < 0.001) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    linie: LINIEN[0],
    uCenti: 0,               // Gegenspannung in ganzen 0,01-V-Schritten (kein Float-Drift)
    messungen: [],           // { nm, u0 } — nur verwertbare Linien
    gelb578: false,          // Beobachtung "kein Fotostrom" bei 578,0 nm notiert?
    zeigerIst: 0, animVon: 0, animZiel: 0, animStart: 0, animNr: 0,
    ausw: { m: NaN, mOk: false, hWert: NaN, hOk: false, waOk: false }
  };
  const u = () => zustand.uCenti / 100;

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="360" height="620" aria-label="Versuchsaufbau: Quecksilberdampflampe mit Filterrad, Vakuum-Photozelle, Gegenspannungsquelle mit Feinregler und Messverstärker mit analoger Picoampere-Anzeige."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);
  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeigeranimation (deterministisches Ziel) ----------
  function setzeZeiger() {
    zustand.animZiel = stromGemessen(zustand.linie.nm, u());
    zustand.animVon = zustand.zeigerIst;
    zustand.animStart = performance.now();
    const nr = ++zustand.animNr;
    if (reduziert) { zustand.zeigerIst = zustand.animZiel; zeichne(); return; }
    (function schritt() {
      if (nr !== zustand.animNr) return;
      const t = Math.min(1, (performance.now() - zustand.animStart) / 260);
      const e = 1 - Math.pow(1 - t, 3);
      zustand.zeigerIst = zustand.animVon + (zustand.animZiel - zustand.animVon) * e;
      zeichne();
      if (t < 1) requestAnimationFrame(schritt);
    })();
  }

  // ---------- Zeichnung des Aufbaus ----------
  function rrect(x, y, b, h, r = 8) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, r); else ctx.rect(x, y, b, h);
  }

  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b33"),
          cFlaeche = farbe("--flaeche"), cBg = farbe("--bg");
    const L = zustand.linie, aktivIdx = LINIEN.indexOf(L);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "start"; ctx.lineWidth = 2;

    // --- Hg-Lampe ---
    ctx.fillStyle = cText; ctx.fillText("Hg-Lampe", 18, 50);
    ctx.strokeStyle = cText; ctx.fillStyle = cFlaeche;
    rrect(14, 58, 84, 64); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(26, 72 + i * 14); ctx.lineTo(58, 72 + i * 14); ctx.stroke(); }
    ctx.fillStyle = cText; ctx.fillRect(94, 78, 10, 24); // Austrittsfenster

    // --- Filterrad (aktive Linie sitzt im Strahlengang) ---
    ctx.lineWidth = 2; ctx.strokeStyle = cText; ctx.fillStyle = cFlaeche;
    ctx.beginPath(); ctx.arc(148, 90, 36, 0, 7); ctx.fill(); ctx.stroke();
    // Mischlicht von der Lampe bis zur Radmitte
    ctx.globalAlpha = 0.15; ctx.fillStyle = cText; ctx.fillRect(104, 84, 58, 12); ctx.globalAlpha = 1;
    for (let i = 0; i < LINIEN.length; i++) {
      const a = (i - aktivIdx) * 2 * Math.PI / LINIEN.length;
      const wx = 148 + 21 * Math.cos(a), wy = 90 + 21 * Math.sin(a);
      ctx.beginPath(); ctx.arc(wx, wy, 8, 0, 7);
      ctx.fillStyle = LINIEN[i].farbe; ctx.fill();
      ctx.strokeStyle = i === aktivIdx ? cText : cLeise; ctx.lineWidth = i === aktivIdx ? 2.5 : 1; ctx.stroke();
    }
    ctx.beginPath(); ctx.arc(148, 90, 4, 0, 7); ctx.fillStyle = cText; ctx.fill();
    ctx.textAlign = "center"; ctx.fillStyle = cText;
    ctx.fillText("Filterrad", 148, 142);
    ctx.fillText(komma(L.nm, 1) + " nm · " + L.name, 148, 158);
    ctx.textAlign = "start";

    // --- gefilterter Strahl zur Zelle (UV gestrichelt = unsichtbar) ---
    ctx.fillStyle = L.farbe; ctx.globalAlpha = L.unsichtbar ? 0.45 : 0.55;
    if (L.unsichtbar) { for (let s = 0; s < 5; s++) ctx.fillRect(177 + s * 10, 85, 6, 10); }
    else ctx.fillRect(177, 85, 47, 10);
    // Lichtkeil in der Zelle bis zur Kathode
    ctx.globalAlpha = 0.22;
    ctx.beginPath(); ctx.moveTo(224, 85); ctx.lineTo(296, 76); ctx.lineTo(296, 124); ctx.lineTo(224, 95); ctx.closePath(); ctx.fill();
    ctx.globalAlpha = 1;

    // --- Vakuum-Photozelle ---
    ctx.textAlign = "center"; ctx.fillStyle = cText; ctx.fillText("Vakuum-Photozelle", 268, 40); ctx.textAlign = "start";
    ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(268, 100, 46, 0, 7); ctx.stroke();
    // Kathode: gewölbtes Blech an der Rückwand (Beschriftung ohne Material!)
    ctx.strokeStyle = cText; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(268, 100, 38, -0.85, 0.85); ctx.stroke();
    // Anode: Stab davor
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(246, 80); ctx.lineTo(246, 120); ctx.stroke();
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cLeise;
    ctx.fillText("Anode", 222, 74);
    ctx.beginPath(); ctx.lineWidth = 1; ctx.strokeStyle = cLeise;
    ctx.moveTo(293, 129); ctx.lineTo(302, 142); ctx.stroke();
    ctx.fillText("Kathode", 296, 154);
    ctx.font = "12px system-ui, sans-serif";

    // --- Verdrahtung: Anode → Quelle (−), Quelle (+) → Verstärker → Kathode ---
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(246, 120); ctx.lineTo(246, 200); ctx.lineTo(70, 200); ctx.lineTo(70, 300); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(306, 100); ctx.lineTo(330, 100); ctx.lineTo(330, 300); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(90, 410); ctx.lineTo(90, 520); ctx.lineTo(266, 520); ctx.lineTo(266, 470); ctx.stroke();
    ctx.fillStyle = cText;
    for (const [tx, ty] of [[70, 300], [90, 410], [330, 300], [266, 470]]) {
      ctx.beginPath(); ctx.arc(tx, ty, 3.5, 0, 7); ctx.fill();
    }
    ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("−", 78, 295); ctx.fillText("+", 98, 424);

    // --- Gegenspannungsquelle mit Feinregler ---
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    rrect(14, 300, 154, 110); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.font = "bold 13px system-ui, sans-serif"; ctx.fillText("Gegenspannung", 91, 320);
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    rrect(28, 330, 126, 30, 5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 15px ui-monospace, monospace"; ctx.textAlign = "right";
    ctx.fillText("U = " + komma(u(), 2) + " V", 146, 351);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";
    // Drehknopf
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cBg;
    ctx.beginPath(); ctx.arc(58, 386, 13, 0, 7); ctx.fill(); ctx.stroke();
    const ka = (-0.75 + 1.5 * u() / U_MAX) * Math.PI;
    ctx.beginPath(); ctx.moveTo(58, 386); ctx.lineTo(58 + 11 * Math.sin(ka), 386 - 11 * Math.cos(ka)); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Feinregler", 120, 390);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    // --- Messverstärker mit analoger pA-Anzeige (0…20 pA, Null-Markierung) ---
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    rrect(186, 300, 160, 170); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.font = "bold 13px system-ui, sans-serif"; ctx.fillText("Messverstärker", 266, 320);
    const px = 266, py = 446, R = 96, a0 = -2.3562, spann = 1.5708;
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(px, py, R, a0, a0 + spann); ctx.stroke();
    ctx.font = "10px system-ui, sans-serif";
    for (let i = 0; i <= 20; i++) {
      const a = a0 + (i / 20) * spann, c = Math.cos(a), s = Math.sin(a);
      const len = i === 0 ? 14 : (i % 5 === 0 ? 12 : 7);
      ctx.strokeStyle = i === 0 ? cFehler : (i % 5 === 0 ? cText : cLeise);
      ctx.lineWidth = i === 0 ? 3 : (i % 5 === 0 ? 1.5 : 1);
      ctx.beginPath(); ctx.moveTo(px + (R - len) * c, py + (R - len) * s); ctx.lineTo(px + R * c, py + R * s); ctx.stroke();
      if (i % 5 === 0) {
        ctx.fillStyle = i === 0 ? cFehler : cText;
        ctx.fillText(String(i), px + (R + 11) * c, py + (R + 11) * s + 3);
      }
    }
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("pA", 266, 410);
    ctx.font = "12px system-ui, sans-serif";
    // Zeiger (leicht unter 0 möglich — Rauschen!)
    const wert = Math.max(-0.8, Math.min(20.5, zustand.zeigerIst));
    const za = a0 + (wert / 20) * spann;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + (R - 6) * Math.cos(za), py + (R - 6) * Math.sin(za)); ctx.stroke();
    ctx.beginPath(); ctx.arc(px, py, 4.5, 0, 7); ctx.fillStyle = cText; ctx.fill();

    // --- Statuszeile ---
    ctx.textAlign = "start"; ctx.font = "bold 13px system-ui, sans-serif";
    if (!hatFotostrom(L.nm)) {
      ctx.fillStyle = cAkzent;
      ctx.fillText("Licht trifft auf — aber der Zeiger bleibt bei 0!", 16, 600);
    } else {
      ctx.fillStyle = cLeise; ctx.font = "13px system-ui, sans-serif";
      ctx.fillText("Linie: " + komma(L.nm, 1) + " nm (" + L.name + ")", 16, 600);
    }
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Eine <strong>Quecksilberdampflampe</strong> liefert Licht aus einzelnen Spektrallinien. Das <strong>Filterrad</strong> lässt genau eine Linie zur <strong>Vakuum-Photozelle</strong> durch (365,0 nm ist UV — unsichtbar, im Schema gestrichelt). Trifft das Licht die Kathode, löst es Elektronen aus: Es fließt ein winziger <strong>Fotostrom</strong>, den der Messverstärker als Zeigerausschlag in Picoampere anzeigt (1 pA = 10⁻¹² A).</p>
      <p>Mit der <strong>Gegenspannung U</strong> bremst du die Elektronen. Bei der Grenzspannung U₀ kommen selbst die schnellsten nicht mehr an — der Zeiger steht auf 0. Dann gilt: e·U₀ = E<sub>kin,max</sub>.</p>
      <p><strong>Plan:</strong> Suche für jede Linie die Spannung U₀, bei der der Fotostrom gerade verschwindet, und trage sie in die Messtabelle ein. Aus dem U₀-f-Diagramm bestimmst du am Ende h — und als Zugabe die Austrittsarbeit der Kathode, deren Beschichtung nicht angeschrieben ist.</p>
      <p class="exp-hinweis">⚠ Im echten Aufbau gilt: Nie direkt in die Hg-Lampe blicken (starkes UV!). Und der pA-Verstärker reagiert empfindlich auf Streulicht und Erschütterungen — deshalb wird der Raum abgedunkelt.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchführung ----------
  function tabellenZeilen() {
    return LINIEN.map(l => {
      if (hatFotostrom(l.nm)) {
        const mz = zustand.messungen.find(z => z.nm === l.nm);
        return mz ? `<tr><td>${komma(l.nm, 1)}</td><td>${komma(fIn1e14(l.nm), 3)}</td><td>${komma(mz.u0, 2)}</td></tr>` : "";
      }
      return zustand.gelb578 ? `<tr><td>${komma(l.nm, 1)}</td><td>${komma(fIn1e14(l.nm), 3)}</td><td>kein Fotostrom</td></tr>` : "";
    }).join("");
  }

  function panelMessen() {
    const L = zustand.linie;
    const schonGemessen = zustand.messungen.some(z => z.nm === L.nm);
    const block578 = !hatFotostrom(L.nm) ? `
      <div class="exp-hinweis">
        <p><strong>Merkwürdig:</strong> Bei dieser Linie bleibt der Zeiger auf 0 — egal wie du U einstellst, sogar bei U = 0. Das Licht ist da (du siehst den gelben Strahl) … aber wo bleibt der Strom?</p>
        <details><summary>Denkanstoß</summary>
          <p>Jedes Photon bringt die Energie E = h·f mit. Reicht sie nicht, um ein Elektron aus der Kathode zu lösen, fließt gar kein Fotostrom — auch bei U = 0, und eine hellere Lampe würde daran nichts ändern. Die Frequenz des gelben Lichts liegt unter der <strong>Grenzfrequenz</strong> dieser Kathode. Wo genau die liegt, zeigt dir gleich dein eigenes Diagramm.</p>
        </details>
        ${zustand.gelb578 ? "<p>✓ Beobachtung ist in der Tabelle notiert.</p>" : '<button class="knopf zweitrangig" id="exp-578">Beobachtung „kein Fotostrom“ notieren</button>'}
      </div>` : "";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <label for="exp-linie"><strong>Filterrad — Linie wählen:</strong></label>
      <select id="exp-linie" class="exp-wahl">
        ${LINIEN.map((l, i) => `<option value="${i}"${l === L ? " selected" : ""}>${komma(l.nm, 1)} nm (${esc(l.name)})</option>`).join("")}
      </select>
      <div class="exp-regler">
        <label for="exp-u">Gegenspannung: <strong id="exp-uwert">U = ${komma(u(), 2)} V</strong></label>
        <input type="range" id="exp-u" min="0" max="${U_MAX * 100}" step="1" value="${zustand.uCenti}"
          aria-label="Gegenspannung in Hundertstel Volt">
        <div class="exp-knopfzeile">
          <button class="knopf zweitrangig" id="exp-uminus" aria-label="0,01 Volt weniger">−0,01 V</button>
          <button class="knopf zweitrangig" id="exp-uplus" aria-label="0,01 Volt mehr">+0,01 V</button>
        </div>
      </div>
      <p>Beobachte das Zeigerinstrument: Erhöhe U in 0,01-V-Schritten, bis der Fotostrom <strong>gerade</strong> verschwindet — diese Spannung ist U₀. (Der Zeiger zittert etwas: echtes pA-Rauschen.)</p>
      <form id="exp-eintrag" class="exp-ablesen">
        <label for="exp-u0">U₀ in V:</label>
        <input id="exp-u0" inputmode="decimal" autocomplete="off" size="7" ${schonGemessen ? "disabled" : ""}>
        <button class="knopf" ${schonGemessen ? "disabled" : ""}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${schonGemessen ? "✓ Für diese Linie steht U₀ schon in der Tabelle." : ""}</p>
      ${block578}
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>λ in nm</th><th>f in 10¹⁴ Hz</th><th>U₀ in V</th></tr></thead>
        <tbody>${tabellenZeilen() || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>f = c/λ ist für dich vorgerechnet. ${zustand.messungen.length} von 4 verwertbaren Linien gemessen${zustand.gelb578 ? " · 578,0 nm: Beobachtung notiert" : ""}.</p>
      <button class="knopf" id="exp-weiter2" ${zustand.messungen.length >= 4 ? "" : "disabled"}>Zur Auswertung</button>`;

    panel.querySelector("#exp-linie").addEventListener("change", ev => {
      zustand.linie = LINIEN[Number(ev.target.value)];
      setzeZeiger(); panelMessen();
    });
    const slider = panel.querySelector("#exp-u");
    const uAnzeige = panel.querySelector("#exp-uwert");
    function setzeU(centi) {
      zustand.uCenti = Math.max(0, Math.min(U_MAX * 100, Math.round(centi)));
      slider.value = String(zustand.uCenti);
      uAnzeige.textContent = "U = " + komma(u(), 2) + " V";
      setzeZeiger();
    }
    slider.addEventListener("input", () => setzeU(Number(slider.value)));
    panel.querySelector("#exp-uminus").addEventListener("click", () => setzeU(zustand.uCenti - 1));
    panel.querySelector("#exp-uplus").addEventListener("click", () => setzeU(zustand.uCenti + 1));
    panel.querySelector("#exp-578")?.addEventListener("click", () => { zustand.gelb578 = true; panelMessen(); });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-eintrag").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const L2 = zustand.linie;
      const eingabe = parseDezimal(panel.querySelector("#exp-u0").value);
      if (!hatFotostrom(L2.nm)) {
        meldung.textContent = "Hier gibt es keinen Strom-Nullpunkt zu suchen — es fließt ja gar kein Strom. Notiere stattdessen die Beobachtung unten.";
        return;
      }
      if (!Number.isFinite(eingabe)) {
        meldung.textContent = "Bitte eine Zahl eingeben — Komma oder Punkt sind beide okay.";
        return;
      }
      if (!eintragOk(eingabe, L2.nm)) {
        meldung.textContent = eingabe < u0Volt(L2.nm)
          ? "✗ Bei dieser Spannung schlägt der Zeiger noch aus — fahr U weiter hoch und schau genau hin."
          : "✗ Da war der Strom schon vorher null — taste dich von unten an den Kipppunkt heran.";
        return;
      }
      zustand.messungen.push({ nm: L2.nm, u0: eingabe });
      zustand.messungen.sort((a, b) => a.nm - b.nm);
      meldung.textContent = "✓ Eingetragen.";
      panelMessen();
      const m2 = panel.querySelector("#exp-meldung");
      m2.textContent = L2.nm === 546.1
        ? "✓ Eingetragen. Auffällig: U₀ ist winzig — Grün liegt fast an der Grenzfrequenz dieser Kathode!"
        : "✓ Eingetragen.";
    });
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (zustand.messungen.length < 4) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du erst die vollständige Messreihe: alle <strong>vier</strong> verwertbaren Linien. Bisher gemessen: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const { m, b, punkte } = auswertung(zustand.messungen);
    const a = zustand.ausw;
    const schritt2 = `
      <h3>Schritt 2: h berechnen</h3>
      <p>Aus m = h/e folgt <strong>h = e·m</strong>. Gegeben: e = 1,602·10⁻¹⁹ C. Achtung Einheiten: m in V/10¹⁴ Hz = 10⁻¹⁴ V·s.</p>
      <form class="exp-ablesen" id="exp-form-h">
        <label for="exp-h">h in 10⁻³⁴ Js:</label>
        <input id="exp-h" inputmode="decimal" autocomplete="off" size="7" ${a.hOk ? "disabled" : ""}>
        <button class="knopf" ${a.hOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-meld-h" class="exp-meldung" aria-live="polite">${a.hOk ? "✓ h ≈ " + komma(a.hWert, 2) + "·10⁻³⁴ Js — Literaturwert 6,626·10⁻³⁴ Js, Abweichung " + komma(Math.abs(a.hWert - 6.626) / 6.626 * 100, 1) + " %. Stark: Du hast eine Naturkonstante gemessen!" : ""}</p>`;
    const schritt3 = `
      <h3>Schritt 3: Austrittsarbeit der Kathode</h3>
      <p>Verlängere die Gerade nach links bis f = 0 (gestrichelt im Diagramm): Sie schneidet die U₀-Achse bei −W<sub>A</sub>/e. Lies den Achsenabschnitt ab — oder rechne mit einem Messpunkt: W<sub>A</sub>/e = m·f − U₀.</p>
      <form class="exp-ablesen" id="exp-form-wa">
        <label for="exp-wa">W<sub>A</sub> in eV:</label>
        <input id="exp-wa" inputmode="decimal" autocomplete="off" size="7" ${a.waOk ? "disabled" : ""}>
        <button class="knopf" ${a.waOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-meld-wa" class="exp-meldung" aria-live="polite"></p>`;
    const enthuellung = `
      <div class="exp-hinweis">
        <p>✓ W<sub>A</sub> ≈ ${komma(-b, 2)} eV — ein Blick in die Tabelle: Die geheimnisvolle Kathode ist mit <strong>Kalium</strong> beschichtet! (Natrium läge mit 2,28 eV ganz ähnlich — solche Feinheiten verlangen im Labor noch genauere Messungen.)</p>
        <table class="exp-tabelle">
          <thead><tr><th>Material</th><th>W<sub>A</sub> in eV</th></tr></thead>
          <tbody>${AUSTRITTSARBEITEN.map(z => `<tr><td>${z.stoff === "Kalium" ? "<strong>Kalium</strong>" : esc(z.stoff)}</td><td>${komma(z.wa, 2)}</td></tr>`).join("")}</tbody>
        </table>
        <p>Damit kennst du auch die Grenzfrequenz: Sie liegt dort, wo deine Gerade die f-Achse schneidet — knapp unterhalb der grünen Linie. Genau das hat 546,1 nm (gerade noch Strom) und 578,0 nm (kein Strom mehr) im Versuch gezeigt.</p>
      </div>`;
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Nach Einstein gilt e·U₀ = h·f − W<sub>A</sub>, also U₀ = (h/e)·f − W<sub>A</sub>/e: eine <strong>Gerade</strong>. Unten siehst du deine Messpunkte mit der Regressionsgeraden. (Der Punkt von 546,1 nm liegt fast auf der f-Achse — Grün ist hier fast an der Grenzfrequenz.)</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="460" height="330" aria-label="Diagramm: Grenzspannung U Null über der Frequenz f mit Messpunkten, Regressionsgerade, Steigungsdreieck und gestrichelter Verlängerung bis zur U-Null-Achse."></canvas>
      <h3>Schritt 1: Steigung bestimmen</h3>
      <p>Lies die Steigung am gestrichelten Steigungsdreieck ab: m = ΔU₀/Δf.</p>
      <form class="exp-ablesen" id="exp-form-m">
        <label for="exp-m">m in V/10¹⁴ Hz:</label>
        <input id="exp-m" inputmode="decimal" autocomplete="off" size="7" ${a.mOk ? "disabled" : ""}>
        <button class="knopf" ${a.mOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-meld-m" class="exp-meldung" aria-live="polite">${a.mOk ? "✓ Steigung passt: m ≈ " + komma(a.m, 3) + " V/10¹⁴ Hz." : ""}</p>
      ${a.mOk ? schritt2 : ""}
      ${a.hOk ? schritt3 : ""}
      ${a.waOk ? enthuellung : ""}
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was begrenzt die Genauigkeit?</summary>
        <p><strong>Nullpunkt im Rauschen:</strong> Der Zeiger zittert um ±0,15 pA. Ob der Strom bei 1,14 V oder 1,16 V „wirklich null“ wird, ist Ansichtssache — der Nullpunkt ertrinkt im Rauschen. Profis nähern sich deshalb von beiden Seiten und mitteln.</p>
        <p><strong>Streulicht:</strong> Raumlicht und Filter-Durchlass anderer Linien erzeugen zusätzlichen Strom — U₀ wird systematisch zu groß abgelesen. Darum: Raum abdunkeln.</p>
        <p><strong>Kontaktspannungen:</strong> Kathode und Anode bestehen aus verschiedenen Materialien; das verschiebt alle U₀ um denselben Betrag. Der Achsenabschnitt (also W<sub>A</sub>) wird dadurch verfälscht — die <em>Steigung</em> aber nicht! Deshalb ist die h-Bestimmung robuster als die W<sub>A</sub>-Bestimmung.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;

    zeichneDiagramm(punkte, m, b);

    panel.querySelector("#exp-form-m").addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-m").value);
      if (pruefeSteigung(e, m)) { a.mOk = true; a.m = e; panelAuswerten(); }
      else panel.querySelector("#exp-meld-m").textContent = "✗ Nutze das Steigungsdreieck: m = ΔU₀/Δf (auf ±3 % genau, mit Komma oder Punkt).";
    });
    panel.querySelector("#exp-form-h")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-h").value);
      if (pruefeH(e, a.m)) { a.hOk = true; a.hWert = e; panelAuswerten(); }
      else panel.querySelector("#exp-meld-h").textContent = "✗ Prüfe die Zehnerpotenzen: m ist in Volt pro 10¹⁴ Hz angegeben, gesucht ist h in 10⁻³⁴ Js.";
    });
    panel.querySelector("#exp-form-wa")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-wa").value);
      if (pruefeWa(e, b)) { a.waOk = true; panelAuswerten(); }
      else panel.querySelector("#exp-meld-wa").textContent = "✗ Schau, wo die gestrichelte Verlängerung die U₀-Achse (bei f = 0) schneidet — der Betrag dieses Werts in Volt ist W_A in eV (±0,1).";
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = [];
      for (const l of LINIEN) {
        const mz = zustand.messungen.find(z => z.nm === l.nm);
        if (mz) zeilen.push([komma(l.nm, 1), komma(fIn1e14(l.nm), 3), komma(mz.u0, 3)]);
        else if (!hatFotostrom(l.nm) && zustand.gelb578) zeilen.push([komma(l.nm, 1), komma(fIn1e14(l.nm), 3), "kein Fotostrom"]);
      }
      csvHerunterladen("photoeffekt-messreihe.csv", ["lambda in nm", "f in 10^14 Hz", "U0 in V"], zeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.gelb578 = false; zustand.uCenti = 0;
      zustand.linie = LINIEN[0];
      zustand.ausw = { m: NaN, mOk: false, hWert: NaN, hOk: false, waOk: false };
      setzeZeiger(); wechslePhase("aufbau");
    });
  }

  // U₀-f-Diagramm mit Regressionsgerade, Steigungsdreieck und Achsenabschnitt
  function zeichneDiagramm(punkte, m, b) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !punkte.length || !Number.isFinite(m)) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height;
    const xMax = 9, yMin = -2.6, yMax = 1.5;
    const Lr = 48, Rr = 10, T = 12, B = 30;
    const X = f => Lr + f / xMax * (W - Lr - Rr);
    const Y = v => T + (yMax - v) / (yMax - yMin) * (H - T - B);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    // Gitter
    c.lineWidth = 1; c.strokeStyle = cLeise;
    c.globalAlpha = 0.3;
    for (let v = -2.5; v <= 1.5; v += 0.5) { c.beginPath(); c.moveTo(Lr, Y(v)); c.lineTo(W - Rr, Y(v)); c.stroke(); }
    for (let f = 1; f <= xMax; f++) { c.beginPath(); c.moveTo(X(f), T); c.lineTo(X(f), H - B); c.stroke(); }
    c.globalAlpha = 1;
    // Achsen: U₀-Achse bei f = 0, f-Achse bei U₀ = 0
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(Lr, T); c.lineTo(Lr, H - B); c.stroke();
    c.beginPath(); c.moveTo(Lr, Y(0)); c.lineTo(W - Rr, Y(0)); c.stroke();
    c.fillStyle = cText;
    c.fillText("U₀ in V", 4, 14);
    c.textAlign = "right"; c.fillText("f in 10¹⁴ Hz", W - Rr, Y(0) - 6); c.textAlign = "start";
    // Achsenbeschriftung
    c.textAlign = "right";
    for (const v of [-2, -1, 0, 1]) c.fillText(String(v).replace("-", "−"), Lr - 6, Y(v) + 4);
    c.textAlign = "center";
    for (let f = 1; f <= xMax; f++) c.fillText(String(f), X(f), H - 8);
    // Regressionsgerade: durchgezogen im Messbereich, gestrichelt extrapoliert bis f = 0
    const fMin = Math.min(...punkte.map(p => p.x));
    c.strokeStyle = cText; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X(fMin), Y(m * fMin + b)); c.lineTo(X(xMax), Y(m * xMax + b)); c.stroke();
    c.setLineDash([6, 5]);
    c.beginPath(); c.moveTo(X(0), Y(b)); c.lineTo(X(fMin), Y(m * fMin + b)); c.stroke();
    c.setLineDash([]);
    // Achsenabschnitt markieren (Wert wird bewusst NICHT angeschrieben)
    c.fillStyle = cAkzent; c.beginPath(); c.arc(X(0), Y(b), 4, 0, 7); c.fill();
    // Steigungsdreieck zwischen f = 6 und f = 8
    const y6 = m * 6 + b, y8 = m * 8 + b;
    c.strokeStyle = cAkzent; c.lineWidth = 1.5; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(X(6), Y(y6)); c.lineTo(X(8), Y(y6)); c.lineTo(X(8), Y(y8)); c.stroke();
    c.setLineDash([]);
    c.fillStyle = cAkzent; c.textAlign = "center";
    c.fillText("Δf = 2,0", X(7), Y(y6) + 16);
    c.textAlign = "right";
    c.fillText("ΔU₀ ≈ " + komma(2 * m, 2) + " V", X(8) - 8, Y((y6 + y8) / 2) + 4);
    c.textAlign = "start";
    // Messpunkte
    for (const p of punkte) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(p.x), Y(p.y), 4.5, 0, 7); c.fill();
      c.strokeStyle = cText; c.lineWidth = 1; c.stroke();
    }
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  setzeZeiger();
  wechslePhase("aufbau");
}
