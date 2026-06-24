// experiment.js — Interaktives Experiment: Induktionsgesetz quantitativ (Qualifikationsphase).
// Realitätsnahe Messpraxis statt fertiger Formel: Ein Dreieckgenerator fährt den
// Feldspulenstrom mit wählbarer Rampensteilheit auf und ab, das empfindliche
// Digital-Voltmeter an der Induktionsspule wird SELBST abgelesen und protokolliert.
// Das Messprogramm (n2 variieren, dI/dt variieren) zeigt U ~ n2 und U ~ dI/dt —
// und der Vergleich mit U = µ0·(n1/l)·n2·A·(dI/dt) macht das Gesetz quantitativ.
// Die Anzeige-Streuung ist deterministisch geseedet (helfer.js), darum laufen die
// TESTS in Node. Die Modulebene ist DOM-frei; Browser-Code lebt in starteExperiment().

import {
  streuung, parseDezimal, komma, esc, ablesungOk,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Geräte- und Modellkonstanten ----------
export const MU0 = 4e-7 * Math.PI;        // Vs/(Am)
export const N1 = 1000;                   // Windungen der Feldspule
export const LAENGE = 0.50;               // m — Länge der Feldspule
export const FLAECHE = 2.00e-3;           // m² — Querschnitt (20,0 cm²)
export const I_AMPLITUDE = 2.0;           // A — fester Scheitelwert des Dreiecks
export const DIDT_WERTE = [2, 4, 8, 16];  // A/s — wählbare Rampensteilheiten
export const N2_WERTE = [150, 300, 600];  // Anzapfungen der Induktionsspule
export const TOLERANZ_MV = 0.25;          // mV — so genau muss abgelesen werden
export const STREU_SPANNE_MV = 0.15;      // mV — Anzeige-Streuung (±0,075 mV)
export const PROTOKOLL_N2 = 300;          // Messprogramm: bei n2 = 300 alle Steilheiten …
export const PROTOKOLL_DIDT = 8;          // … und bei 8 A/s alle Anzapfungen

// ---------- Modell (rein, Node-testbar) ----------
// Magnetfeld im Inneren der (ideal langen) Feldspule
export function bFeld(i1) { return MU0 * (N1 / LAENGE) * i1; } // T

// Dreieckstrom: Periode T = 4·Î/(dI/dt) — Viertel rauf, Hälfte runter, Viertel rauf
export function periode(didt) { return 4 * I_AMPLITUDE / didt; }

export function iVonT(t, didt) {
  if (!(didt > 0)) return 0;
  const T = periode(didt);
  const tau = ((t % T) + T) % T;
  if (tau < T / 4) return didt * tau;
  if (tau < 3 * T / 4) return I_AMPLITUDE - didt * (tau - T / 4);
  return -I_AMPLITUDE + didt * (tau - 3 * T / 4);
}

// momentane Steigung des Dreiecks: ±dI/dt
export function didtVonT(t, didt) {
  if (!(didt > 0)) return 0;
  const T = periode(didt);
  const tau = ((t % T) + T) % T;
  return (tau < T / 4 || tau >= 3 * T / 4) ? didt : -didt;
}

// Induktionsgesetz an der ideal langen Spule: |U| = µ0·(n1/l)·n2·A·(dI/dt)
export function uTheorie(n2, didt) { return MU0 * (N1 / LAENGE) * n2 * FLAECHE * didt; } // V
export function uTheorieMv(n2, didt) { return uTheorie(n2, didt) * 1000; }               // mV

// Umkehrung für die Plausibilitäts-Pipeline: aus U zurück auf dI/dt
export function didtAusU(uVolt, n2) { return uVolt / (MU0 * (N1 / LAENGE) * n2 * FLAECHE); }

// Zeitverlauf der Induktionsspannung: Rechteck, Vorzeichenwechsel an den
// Dreiecksspitzen. Vorzeichen nach Lenz bei festem Wickelsinn: steigendes I1 → U < 0.
export function uVonT(t, n2, didt) {
  if (!(didt > 0)) return 0;
  const s = didtVonT(t, didt);
  return (s > 0 ? -1 : 1) * uTheorie(n2, didt);
}

// Anzeige des Digital-Voltmeters auf der Rampe: |U| + reproduzierbare Streuung.
// Ohne Stromänderung (Generator angehalten) zeigt es exakt 0.
export function uMessMv(n2, didt) {
  if (!(didt > 0)) return 0;
  return uTheorieMv(n2, didt) + streuung("u:" + n2 + ":" + didt, STREU_SPANNE_MV);
}

// Mindestprotokoll: bei n2 = 300 alle vier dI/dt UND bei 8 A/s alle drei n2
export function protokollVollstaendig(messungen) {
  return DIDT_WERTE.every(d => messungen.some(m => m.n2 === PROTOKOLL_N2 && m.didt === d)) &&
         N2_WERTE.every(n => messungen.some(m => m.n2 === n && m.didt === PROTOKOLL_DIDT));
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "Kontrollwert: n2 = 300, 8 A/s → 12,06 mV", ok: () =>
      Math.abs(uTheorieMv(300, 8) - 12.06) <= 0.01 },
  { name: "Kontrollwert: n2 = 600, 16 A/s → 48,25 mV", ok: () =>
      Math.abs(uTheorieMv(600, 16) - 48.25) <= 0.01 },
  { name: "Kontrollwert: n2 = 150, 2 A/s → 1,51 mV", ok: () =>
      Math.abs(uTheorieMv(150, 2) - 1.51) <= 0.01 },
  { name: "U ~ dI/dt: Verhältnisse exakt 2,0", ok: () =>
      uTheorieMv(300, 16) / uTheorieMv(300, 8) === 2 &&
      uTheorieMv(300, 8) / uTheorieMv(300, 4) === 2 &&
      uTheorieMv(300, 4) / uTheorieMv(300, 2) === 2 },
  { name: "U ~ n2: Verhältnisse exakt 2,0 und 4,0", ok: () =>
      uTheorieMv(300, 8) / uTheorieMv(150, 8) === 2 &&
      uTheorieMv(600, 8) / uTheorieMv(300, 8) === 2 &&
      uTheorieMv(600, 8) / uTheorieMv(150, 8) === 4 },
  { name: "Keine Änderung → keine Spannung (dI/dt = 0)", ok: () =>
      uTheorieMv(300, 0) === 0 && uMessMv(300, 0) === 0 && uVonT(1.23, 300, 0) === 0 },
  { name: "Dreieck I1(t): Spitzen, Nullen, Periode T = 4·Î/(dI/dt)", ok: () => {
      if (periode(8) !== 1 || periode(16) !== 0.5 || periode(2) !== 4) return false;
      if (iVonT(0, 8) !== 0 || iVonT(0.25, 8) !== I_AMPLITUDE || iVonT(0.75, 8) !== -I_AMPLITUDE) return false;
      if (Math.abs(iVonT(0.5, 8)) > 1e-12 || Math.abs(iVonT(1, 8)) > 1e-12) return false;
      if (Math.abs(iVonT(1.25, 8) - I_AMPLITUDE) > 1e-12) return false; // periodisch
      for (let k = 0; k <= 400; k++) if (Math.abs(iVonT(k / 100, 2)) > I_AMPLITUDE + 1e-12) return false;
      return true;
    } },
  { name: "Rechteck U(t): konstant auf der Rampe, Wechsel an den Spitzen", ok: () => {
      const u1 = uVonT(0.05, 300, 8), u2 = uVonT(0.20, 300, 8);
      const u3 = uVonT(0.30, 300, 8), u4 = uVonT(0.80, 300, 8);
      return u1 < 0 && u1 === u2 && u3 > 0 && u4 < 0 &&
             Math.abs(Math.abs(u1) - uTheorie(300, 8)) < 1e-15 &&
             uVonT(0.24, 300, 8) * uVonT(0.26, 300, 8) < 0 &&
             uVonT(0.74, 300, 8) * uVonT(0.76, 300, 8) < 0;
    } },
  { name: "Pipeline invertiert: aus U exakt zurück auf dI/dt", ok: () =>
      N2_WERTE.every(n => DIDT_WERTE.every(d =>
        Math.abs(didtAusU(uTheorie(n, d), n) - d) <= d * 1e-12)) },
  { name: "Anzeige: Streuung höchstens ±0,075 mV, deterministisch", ok: () =>
      N2_WERTE.every(n => DIDT_WERTE.every(d =>
        Math.abs(uMessMv(n, d) - uTheorieMv(n, d)) <= STREU_SPANNE_MV / 2 + 1e-12)) &&
      uMessMv(300, 8) === uMessMv(300, 8) },
  { name: "Auch Messwerte liefern Verhältnis 2,0 ± 0,1", ok: () =>
      Math.abs(uMessMv(300, 16) / uMessMv(300, 8) - 2) <= 0.1 &&
      Math.abs(uMessMv(600, 8) / uMessMv(300, 8) - 2) <= 0.1 },
  { name: "B(Î) ≈ 5,03 mT (lange Spule)", ok: () =>
      Math.abs(bFeld(I_AMPLITUDE) * 1000 - 5.03) <= 0.01 },
  { name: "parseDezimal und Ablese-Toleranz ±0,25 mV", ok: () =>
      parseDezimal("12,06") === 12.06 && parseDezimal("12.06") === 12.06 &&
      Number.isNaN(parseDezimal("zwölf")) &&
      ablesungOk(12.30, 12.06, TOLERANZ_MV) && !ablesungOk(12.32, 12.06, TOLERANZ_MV) &&
      !ablesungOk(NaN, 12.06, TOLERANZ_MV) },
  { name: "Mindestprotokoll wird korrekt erkannt", ok: () => {
      const voll = [];
      for (const d of DIDT_WERTE) voll.push({ n2: 300, didt: d, uMv: 1 });
      for (const n of [150, 600]) voll.push({ n2: n, didt: 8, uMv: 1 });
      const fastVoll = voll.filter(m => !(m.n2 === 300 && m.didt === 16));
      return protokollVollstaendig(voll) && !protokollVollstaendig(fastVoll) && !protokollVollstaendig([]);
    } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    n2: 300, didt: 2,   // aktuelle Einstellung
    laeuft: true,       // Generator läuft / angehalten (I1 konstant)
    tPhase: 0,          // Generator-Zeit (steht beim Anhalten)
    tPapier: 0,         // Papiervorschub des Schreibers (läuft immer)
    iFix: 0,            // eingefrorener Strom beim Anhalten
    puffer: [],         // Schreiber-Spur: { t, i, uMv }
    messungen: [],      // Protokoll: { n2, didt, uMv }
    theorieOk: false,   // Theoriezeile in der Auswertung schon nachgerechnet?
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
      <canvas id="exp-geraet" width="380" height="292" aria-label="Versuchsaufbau: lange Feldspule am Dreieckgenerator, über ihrer Mitte die Induktionsspule mit Anzapfungen bei 150, 300 und 600 Windungen, angeschlossen an ein Digital-Voltmeter mit Millivolt-Anzeige."></canvas>
      <canvas id="exp-schreiber" width="380" height="334" aria-label="Zwei Schreiber-Spuren übereinander: oben der Feldspulenstrom als Dreieck über der Zeit, darunter die Induktionsspannung als Rechteck, das an den Dreiecksspitzen das Vorzeichen wechselt."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const geraetCanvas = flaeche.querySelector("#exp-geraet");
  const schreiberCanvas = flaeche.querySelector("#exp-schreiber");
  const ctx = geraetCanvas.getContext("2d");
  const sctx = schreiberCanvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const TAP_X = { 150: 166, 300: 198, 600: 230 }; // Anzapfungs-Klemmen auf dem Gerätebild

  function anzeigeMv() { return zustand.laeuft ? uMessMv(zustand.n2, zustand.didt) : 0; }

  // sinnvolle Vollausschlag-Stufe für die U-Spur (verrät den Theoriewert nicht)
  function uSkalaMv() {
    const uTh = uTheorieMv(zustand.n2, zustand.didt);
    return [1, 2, 5, 10, 20, 40, 80].find(s => s >= uTh * 1.25) || 80;
  }

  function pfeil(c, x1, y1, x2, y2, farbeStrich) {
    c.strokeStyle = farbeStrich; c.fillStyle = farbeStrich; c.lineWidth = 2;
    c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    const dx = Math.sign(x2 - x1) * 7;
    c.beginPath(); c.moveTo(x2, y2); c.lineTo(x2 - dx, y2 - 4); c.lineTo(x2 - dx, y2 + 4);
    c.closePath(); c.fill();
  }

  // ---------- Zeichnung: Spulenpaar, Generator, Voltmeter ----------
  function zeichneGeraet() {
    const w = geraetCanvas.width, h = geraetCanvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"),
          cFehler = farbe("--fehler", "#b33"), cFlaeche = farbe("--flaeche"), cHauch = farbe("--hauch", "#eee");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";

    // Status oben links
    if (zustand.laeuft) {
      ctx.fillStyle = cLeise; ctx.fillText("Generator läuft", 20, 32);
    } else {
      ctx.fillStyle = cFehler; ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText("Generator angehalten — I_1 konstant", 20, 32);
      ctx.font = "11px system-ui, sans-serif";
    }

    // Digital-Voltmeter (oben rechts)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(226, 14, 140, 64, 8); else ctx.rect(226, 14, 140, 64);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cHauch; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.fillRect(234, 22, 124, 32); ctx.strokeRect(234, 22, 124, 32);
    ctx.fillStyle = cText; ctx.font = "bold 17px ui-monospace, monospace"; ctx.textAlign = "right";
    ctx.fillText(komma(anzeigeMv(), 2) + " mV", 352, 45);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = cLeise;
    ctx.fillText("Digital-Voltmeter", 296, 70);
    ctx.textAlign = "start";

    // Messleitungen: feste Klemme (0) leise, gewählte Anzapfung in Akzentfarbe
    const tx = TAP_X[zustand.n2];
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(134, 140); ctx.lineTo(134, 108); ctx.lineTo(252, 108); ctx.lineTo(252, 78); ctx.stroke();
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(tx, 140); ctx.lineTo(tx, 122); ctx.lineTo(322, 122); ctx.lineTo(322, 78); ctx.stroke();

    // Feldspule (langes Rohr mit Wicklung)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(20, 168, 340, 56); ctx.strokeRect(20, 168, 340, 56);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    for (let x = 26; x <= 354; x += 7) { ctx.beginPath(); ctx.moveTo(x, 170); ctx.lineTo(x, 222); ctx.stroke(); }
    // B-Pfeile auf der Spulenachse (die Mitte verdeckt gleich die Induktionsspule)
    pfeil(ctx, 40, 196, 86, 196, cText); pfeil(ctx, 288, 196, 334, 196, cText);
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("B", 58, 190); ctx.font = "11px system-ui, sans-serif";

    // Zuleitungen zum Generator
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(26, 224); ctx.lineTo(26, 248); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(354, 224); ctx.lineTo(354, 240); ctx.lineTo(160, 240); ctx.lineTo(160, 248); ctx.stroke();

    // Dreieckgenerator (Kasten unten links)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(20, 248, 150, 40, 6); else ctx.rect(20, 248, 150, 40);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("Dreieckgenerator", 95, 262);
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(34, 277); ctx.lineTo(56, 268); ctx.lineTo(100, 284); ctx.lineTo(144, 268); ctx.lineTo(156, 273); ctx.stroke();
    ctx.textAlign = "start";

    // Induktionsspule (über der Mitte der Feldspule)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.fillRect(130, 156, 120, 80); ctx.strokeRect(130, 156, 120, 80);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    for (let x = 134; x <= 246; x += 5) { ctx.beginPath(); ctx.moveTo(x, 158); ctx.lineTo(x, 234); ctx.stroke(); }
    ctx.fillStyle = cLeise; ctx.fillText("Induktionsspule", 20, 152);
    // feste Klemme "0"
    ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(134, 156); ctx.lineTo(134, 140); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "right"; ctx.fillText("0", 130, 138);
    // Anzapfungen n2
    for (const n of N2_WERTE) {
      const x = TAP_X[n], aktiv = n === zustand.n2;
      ctx.strokeStyle = aktiv ? cAkzent : cText; ctx.lineWidth = aktiv ? 3 : 2;
      ctx.beginPath(); ctx.moveTo(x, 156); ctx.lineTo(x, 140); ctx.stroke();
      ctx.fillStyle = aktiv ? cAkzent : cText;
      ctx.font = aktiv ? "bold 11px system-ui, sans-serif" : "11px system-ui, sans-serif";
      ctx.fillText(String(n), x - 4, 138);
    }
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";

    // Datenzeilen rechts neben dem Generator
    ctx.fillStyle = cText;
    ctx.fillText("Feldspule: n_1 = 1000 · l = 0,50 m", 180, 264);
    const t2 = "A = 20 cm² · Î = 2 A · dI/dt = ";
    ctx.fillText(t2, 180, 281);
    const wT2 = ctx.measureText(t2).width;
    ctx.fillStyle = cAkzent; ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText(zustand.didt + " A/s", 180 + wT2, 281);
  }

  // ---------- Zeichnung: zwei Schreiber-Spuren (I-Dreieck, U-Rechteck) ----------
  function zeichneSchreiber() {
    const w = schreiberCanvas.width, hGes = schreiberCanvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b33");
    const T = periode(zustand.didt), fenster = 2 * T;
    const L = 56, R = w - 12;
    const uSkala = uSkalaMv();
    const plots = [
      { y0: 24, y1: 142, max: 2.5, beschr: "I_1 in A", raster: 1, feld: "i" },
      { y0: 184, y1: 306, max: uSkala, beschr: "U_ind in mV", raster: uSkala / 2, feld: "uMv" }
    ];
    sctx.clearRect(0, 0, w, hGes);
    const t0 = reduziert ? 0 : Math.max(0, zustand.tPapier - fenster);
    const xT = t => L + ((t - t0) / fenster) * (R - L);
    sctx.font = "11px system-ui, sans-serif";

    for (const p of plots) {
      const mitte = (p.y0 + p.y1) / 2, halb = (p.y1 - p.y0) / 2;
      p.yW = v => mitte - (v / p.max) * halb;
      sctx.strokeStyle = cLeise; sctx.lineWidth = 1; sctx.globalAlpha = 0.8;
      sctx.strokeRect(L, p.y0, R - L, p.y1 - p.y0);
      sctx.globalAlpha = 1;
      // waagerechte Rasterlinien mit Werten
      for (const v of [-p.raster, 0, p.raster]) {
        sctx.strokeStyle = cLeise; sctx.globalAlpha = v === 0 ? 0.9 : 0.45;
        sctx.setLineDash(v === 0 ? [] : [5, 5]);
        sctx.beginPath(); sctx.moveTo(L, p.yW(v)); sctx.lineTo(R, p.yW(v)); sctx.stroke();
        sctx.setLineDash([]); sctx.globalAlpha = 1;
        sctx.fillStyle = cText; sctx.textAlign = "right";
        sctx.fillText(komma(v, p.raster % 1 === 0 ? 0 : 1), L - 5, p.yW(v) + 4);
      }
      // senkrechtes Zeitraster alle T/2
      for (let k = Math.ceil(t0 / (T / 2)); k * T / 2 <= t0 + fenster + 1e-9; k++) {
        const x = xT(k * T / 2);
        sctx.strokeStyle = cLeise; sctx.globalAlpha = 0.3; sctx.lineWidth = 1;
        sctx.beginPath(); sctx.moveTo(x, p.y0); sctx.lineTo(x, p.y1); sctx.stroke();
        sctx.globalAlpha = 1;
      }
      sctx.textAlign = "left"; sctx.fillStyle = cText;
      sctx.fillText(p.beschr, L + 4, p.y0 - 7);
    }
    // Zeitachse unter dem unteren Plot
    sctx.fillStyle = cText; sctx.textAlign = "center";
    for (let k = Math.ceil(t0 / (T / 2)); k * T / 2 <= t0 + fenster + 1e-9; k++) {
      const t = k * T / 2, x = xT(t);
      if (x < R - 26) sctx.fillText(komma(t, 1), x, 322);
    }
    sctx.textAlign = "right"; sctx.fillText("t in s", R, 322);
    sctx.fillStyle = cLeise; sctx.fillText("Schreiber", R, 14);
    if (!zustand.laeuft) {
      sctx.fillStyle = cFehler; sctx.font = "bold 11px system-ui, sans-serif";
      sctx.fillText("angehalten: I_1 konstant → U = 0", R, 177);
      sctx.font = "11px system-ui, sans-serif";
    }
    sctx.textAlign = "left";

    // Spuren: animiert aus dem Puffer, bei reduzierter Bewegung statisch eine Doppelperiode
    let punkte = zustand.puffer;
    if (reduziert) {
      punkte = [];
      for (let k = 0; k <= 480; k++) {
        const t = (k / 480) * fenster;
        punkte.push({
          t,
          i: zustand.laeuft ? iVonT(t, zustand.didt) : zustand.iFix,
          uMv: zustand.laeuft ? uVonT(t, zustand.n2, zustand.didt) * 1000 : 0
        });
      }
    }
    if (!punkte.length) return;
    const spuren = [
      { p: plots[0], farbeSpur: cText },
      { p: plots[1], farbeSpur: cAkzent }
    ];
    for (const s of spuren) {
      sctx.strokeStyle = s.farbeSpur; sctx.lineWidth = 1.8;
      sctx.beginPath();
      punkte.forEach((q, idx) => {
        const x = xT(q.t), y = s.p.yW(q[s.p.feld]);
        if (idx === 0) sctx.moveTo(x, y); else sctx.lineTo(x, y);
      });
      sctx.stroke();
      // Schreibstift an der aktuellen Position (nur im Live-Betrieb)
      if (!reduziert) {
        const q = punkte[punkte.length - 1];
        sctx.fillStyle = s.farbeSpur;
        sctx.beginPath(); sctx.arc(xT(q.t), s.p.yW(q[s.p.feld]), 3.5, 0, 7); sctx.fill();
      }
    }
  }

  // ---------- Animation (Papiervorschub); reduzierte Bewegung: statisches Bild ----------
  let rafId = 0, letzte = 0;
  function tick(now) {
    if (zustand.phase !== "messen" || reduziert) { rafId = 0; return; }
    const dt = letzte ? Math.min(0.05, (now - letzte) / 1000) : 0.016;
    letzte = now;
    zustand.tPapier += dt;
    if (zustand.laeuft) zustand.tPhase += dt;
    zustand.puffer.push({
      t: zustand.tPapier,
      i: zustand.laeuft ? iVonT(zustand.tPhase, zustand.didt) : zustand.iFix,
      uMv: zustand.laeuft ? uVonT(zustand.tPhase, zustand.n2, zustand.didt) * 1000 : 0
    });
    const fenster = 2 * periode(zustand.didt);
    while (zustand.puffer.length && zustand.puffer[0].t < zustand.tPapier - fenster - 0.05) zustand.puffer.shift();
    zeichneSchreiber();
    rafId = requestAnimationFrame(tick);
  }
  function starteSchrieb() {
    if (reduziert) { zeichneSchreiber(); return; }
    if (!rafId) { letzte = 0; rafId = requestAnimationFrame(tick); }
  }
  function stoppeSchrieb() {
    if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
  }

  // neues Schreiberblatt einlegen (nach jeder Einstellungs-Änderung)
  function neuesBlatt() {
    zustand.puffer = []; zustand.tPhase = 0; zustand.tPapier = 0; zustand.iFix = 0;
    zeichneSchreiber();
  }

  function setzeLauf(an) {
    if (an === zustand.laeuft) return;
    if (!an) zustand.iFix = iVonT(zustand.tPhase, zustand.didt);
    zustand.laeuft = an;
    zeichneGeraet();
    if (reduziert) zeichneSchreiber();
    panelMessen(an
      ? "Generator läuft wieder — auf der Rampe steht wieder Spannung an."
      : "Generator angehalten: I_1 ist konstant — und das Voltmeter fällt auf 0. Nur die ÄNDERUNG induziert!");
  }

  function hatMessung(n2, didt) {
    return zustand.messungen.some(m => m.n2 === n2 && m.didt === didt);
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Eine lange <strong>Feldspule</strong> (n<sub>1</sub> = 1000 Windungen, Länge l = 0,50 m, Querschnitt A = 20,0 cm² = 2,00·10<sup>−3</sup> m²) erzeugt in ihrem Inneren das Magnetfeld B = µ<sub>0</sub>·n<sub>1</sub>·I<sub>1</sub>/l. Über ihrer Mitte sitzt die <strong>Induktionsspule</strong> mit Anzapfungen bei n<sub>2</sub> = 150, 300 und 600 Windungen. Ein <strong>Dreieckgenerator</strong> fährt den Strom I<sub>1</sub> als Dreieck auf und ab: Scheitelwert Î = 2,0 A fest, <strong>Rampensteilheit dI/dt wählbar</strong> (2, 4, 8 oder 16 A/s). Die Induktionsspannung misst ein empfindliches <strong>Digital-Voltmeter</strong> in Millivolt.</p>
      <p><strong>Plan:</strong> Auf jeder Rampe ändert sich der Fluss Φ = B·A gleichmäßig — nach dem Induktionsgesetz U = −n<sub>2</sub>·ΔΦ/Δt erwartest du dann eine <strong>konstante</strong> Spannung (ein Rechteck auf dem Schreiber!). Miss |U| nach dem Messprogramm: erst bei n<sub>2</sub> = 300 mit allen vier Steilheiten, dann bei 8 A/s mit allen drei Anzapfungen. In der Auswertung prüfst du U ~ dI/dt, U ~ n<sub>2</sub> und den Theoriewert.</p>
      <p class="exp-hinweis">⚠ Millivolt sind heikel: Im echten Labor fängt eine offene Messschleife Brummspannungen aus dem Stromnetz ein — Messleitungen immer verdrillen! Hier ist die Verkabelung schon störungsarm verlegt.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen(meldung = "") {
    const sperren = zustand.laeuft ? "" : "disabled";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <div>
          <label for="exp-n2"><strong>Anzapfung n<sub>2</sub>:</strong></label>
          <select id="exp-n2" class="exp-wahl">
            ${N2_WERTE.map(n => `<option value="${n}" ${n === zustand.n2 ? "selected" : ""}>n₂ = ${n} Windungen</option>`).join("")}
          </select>
        </div>
        <div>
          <label for="exp-didt"><strong>Rampensteilheit dI/dt:</strong></label>
          <select id="exp-didt" class="exp-wahl">
            ${DIDT_WERTE.map(d => `<option value="${d}" ${d === zustand.didt ? "selected" : ""}>dI/dt = ${d} A/s</option>`).join("")}
          </select>
        </div>
      </div>
      <p>Dreieck: Î = 2,0 A · Periode T = ${komma(periode(zustand.didt), 1)} s · Generator: <strong>${zustand.laeuft ? "läuft" : "angehalten"}</strong></p>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-halt">${zustand.laeuft ? "Generator anhalten (I₁ konstant)" : "Generator weiterlaufen lassen"}</button>
      </div>
      <p>Das Voltmeter zeigt den <strong>Betrag</strong> |U| auf der Rampe — die beiden Vorzeichen siehst du auf dem Schrieb links.</p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies das Voltmeter ab — |U| in mV:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7" ${sperren}>
        <button class="knopf" ${sperren}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(meldung)}</p>
      <h3>Messprogramm (Mindestprotokoll)</h3>
      <p>① bei n<sub>2</sub> = 300: ${DIDT_WERTE.map(d => `${d} A/s ${hatMessung(PROTOKOLL_N2, d) ? "✓" : "–"}`).join(" · ")}<br>
         ② bei dI/dt = 8 A/s: ${N2_WERTE.map(n => `n₂ = ${n} ${hatMessung(n, PROTOKOLL_DIDT) ? "✓" : "–"}`).join(" · ")}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>n<sub>2</sub></th><th>dI/dt in A/s</th><th>U in mV</th></tr></thead>
      <tbody>${zustand.messungen.map(z => `<tr><td>${z.n2}</td><td>${z.didt}</td><td>${komma(z.uMv, 2)}</td></tr>`).join("") || '<tr><td colspan="3">noch leer</td></tr>'}</tbody></table>
      <button class="knopf" id="exp-weiter2" ${protokollVollstaendig(zustand.messungen) ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelector("#exp-n2").addEventListener("change", ev => {
      zustand.n2 = Number(ev.target.value);
      neuesBlatt(); zeichneGeraet(); panelMessen("Neues Schreiberblatt eingelegt.");
    });
    panel.querySelector("#exp-didt").addEventListener("change", ev => {
      zustand.didt = Number(ev.target.value);
      neuesBlatt(); zeichneGeraet(); panelMessen("Neues Schreiberblatt eingelegt.");
    });
    panel.querySelector("#exp-halt").addEventListener("click", () => setzeLauf(!zustand.laeuft));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      if (!zustand.laeuft) return;
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldungEl = panel.querySelector("#exp-meldung");
      if (hatMessung(zustand.n2, zustand.didt)) {
        meldungEl.textContent = "Diese Kombination steht schon in der Tabelle — stelle eine andere ein.";
        return;
      }
      if (!ablesungOk(eingabe, uMessMv(zustand.n2, zustand.didt), TOLERANZ_MV)) {
        meldungEl.textContent = "✗ Schau noch einmal genau aufs Display und übernimm den Wert (Komma erlaubt, auf 0,1 mV genau).";
        return;
      }
      zustand.messungen.push({ n2: zustand.n2, didt: zustand.didt, uMv: eingabe });
      panelMessen("✓ Eingetragen.");
    });
  }

  function panelAuswerten() {
    if (!protokollVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Erst das <strong>Messprogramm</strong> vervollständigen: bei n<sub>2</sub> = 300 alle vier Steilheiten, bei 8 A/s alle drei Anzapfungen. Dann lohnt sich die Auswertung.</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const wert = (n2, didt) => zustand.messungen.find(m => m.n2 === n2 && m.didt === didt);
    const z0 = zustand.messungen[0];
    const vergleichsTabelle = () => `
      <table class="exp-tabelle"><thead><tr><th>n<sub>2</sub></th><th>dI/dt in A/s</th><th>U_mess in mV</th><th>U_theorie in mV</th><th>Abw. in mV</th></tr></thead>
      <tbody>${zustand.messungen.map(z => `<tr><td>${z.n2}</td><td>${z.didt}</td><td>${komma(z.uMv, 2)}</td><td>${komma(uTheorieMv(z.n2, z.didt), 2)}</td><td>${komma(z.uMv - uTheorieMv(z.n2, z.didt), 2)}</td></tr>`).join("")}</tbody></table>
      <p>Größte Abweichung: <strong>${komma(Math.max(...zustand.messungen.map(z => Math.abs(z.uMv - uTheorieMv(z.n2, z.didt)))), 2)} mV</strong> — Messung und Theorie passen zusammen.</p>`;
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <table class="exp-tabelle"><thead><tr><th>n<sub>2</sub></th><th>dI/dt in A/s</th><th>U in mV</th></tr></thead>
      <tbody>${zustand.messungen.map(z => `<tr><td>${z.n2}</td><td>${z.didt}</td><td>${komma(z.uMv, 2)}</td></tr>`).join("")}</tbody></table>
      <h3>1 · Proportionalitäts-Check</h3>
      <p>Rechne mit <strong>deinen</strong> Tabellenwerten (auf 1 Nachkommastelle):</p>
      <form id="exp-vform">
        <p class="exp-ablesen"><label for="exp-v1">U(16 A/s) / U(8 A/s) bei n₂ = 300 =</label>
          <input id="exp-v1" inputmode="decimal" autocomplete="off" size="5"> <span id="exp-v1-ok" aria-live="polite"></span></p>
        <p class="exp-ablesen"><label for="exp-v2">U(n₂ = 600) / U(n₂ = 300) bei 8 A/s =</label>
          <input id="exp-v2" inputmode="decimal" autocomplete="off" size="5"> <span id="exp-v2-ok" aria-live="polite"></span></p>
        <button class="knopf zweitrangig">Verhältnisse prüfen</button>
      </form>
      <p id="exp-v-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>2 · Vergleich mit der Theorie</h3>
      <p>Für jede Zeile gilt: U<sub>theorie</sub> = µ<sub>0</sub> · (n<sub>1</sub>/l) · n<sub>2</sub> · A · (dI/dt), mit µ<sub>0</sub> = 4π·10<sup>−7</sup> Vs/(Am).</p>
      <p>Rechne <strong>deine erste Zeile</strong> von Hand nach (n<sub>2</sub> = ${z0.n2}, dI/dt = ${z0.didt} A/s) und gib U<sub>theorie</sub> in mV an:</p>
      <form id="exp-tform" class="exp-ablesen">
        <label for="exp-twert">U<sub>theorie</sub> =</label>
        <input id="exp-twert" inputmode="decimal" autocomplete="off" size="7"> mV
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-t-meldung" class="exp-meldung" aria-live="polite"></p>
      <div id="exp-twrap">${zustand.theorieOk ? vergleichsTabelle() : ""}</div>
      <h3>3 · Erkenntnis</h3>
      <p><label for="exp-f1">Was zeigt das U-Rechteck an den Spitzen des I-Dreiecks?</label></p>
      <select id="exp-f1" class="exp-wahl">
        <option value="">— Antwort wählen —</option>
        <option value="a">U wird dort am größten, weil I am größten ist.</option>
        <option value="b">U wechselt das Vorzeichen, weil dI/dt dort das Vorzeichen wechselt.</option>
        <option value="c">U fällt dort auf null, weil das Feld kurz verschwindet.</option>
      </select>
      <button class="knopf zweitrangig" id="exp-f1-knopf">Antwort prüfen</button>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite"></p>
      <p><label for="exp-f2">Du hältst I₁ konstant (Generator angehalten). Was zeigt das Voltmeter?</label></p>
      <select id="exp-f2" class="exp-wahl">
        <option value="">— Antwort wählen —</option>
        <option value="a">Weiter den bisherigen Wert — schließlich fließt ein kräftiger Strom.</option>
        <option value="b">Null: Ohne Änderung des Flusses gibt es keine Induktionsspannung.</option>
        <option value="c">Einen größeren Wert, weil B jetzt dauerhaft anliegt.</option>
      </select>
      <button class="knopf zweitrangig" id="exp-f2-knopf">Antwort prüfen</button>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>4 · Ausblick: Transformator</h3>
      <p>Genau dieses Prinzip steckt im Transformator: Eine Wechselspannung an der Primärspule ändert den Fluss ständig, und die Sekundärspule liefert eine Spannung proportional zu ihrer Windungszahl — dein Ergebnis U ~ n<sub>2</sub> ist seine halbe Funktionsweise.</p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was ist hier idealisiert?</summary>
        <p><strong>Streufeld am Spulenende:</strong> B = µ₀·n₁·I₁/l gilt streng nur für die unendlich lange Spule. Real ist das Feld innen etwas schwächer und franst an den Enden aus — gemessene Spannungen liegen dann um einen Faktor knapp unter 1 unter der Formel. Dieses Modell rechnet ideal lang, deshalb passen Messung und Theorie so gut.</p>
        <p><strong>Voltmeter-Innenwiderstand:</strong> Spulenwiderstand und Messgerät bilden einen Spannungsteiler. Nur ein hochohmiges Voltmeter zeigt (fast) die volle Induktionsspannung — bei mV-Messungen entscheidend.</p>
        <p><strong>Rampen-Knicke:</strong> Ein realer Generator schafft keine perfekt scharfen Knicke. An den Umkehrpunkten ist das U-Rechteck deshalb kurz verschliffen statt senkrecht.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-vform").addEventListener("submit", ev => {
      ev.preventDefault();
      const checks = [
        { id: "v1", erwartet: 2.0 },
        { id: "v2", erwartet: 2.0 }
      ];
      let alleOk = true;
      for (const c of checks) {
        const w = parseDezimal(panel.querySelector("#exp-" + c.id).value);
        const ok = Number.isFinite(w) && Math.abs(w - c.erwartet) <= 0.1;
        panel.querySelector("#exp-" + c.id + "-ok").textContent = ok ? "✓" : "✗";
        if (!ok) alleOk = false;
      }
      panel.querySelector("#exp-v-meldung").textContent = alleOk
        ? "✓ Doppelte Steilheit → doppelte Spannung, doppelte Windungszahl → doppelte Spannung: U ~ dI/dt und U ~ n₂."
        : "Noch nicht: Teile jeweils die beiden Tabellenwerte (z. B. U bei 16 A/s durch U bei 8 A/s) und runde auf 1 Nachkommastelle.";
    });
    panel.querySelector("#exp-tform").addEventListener("submit", ev => {
      ev.preventDefault();
      const w = parseDezimal(panel.querySelector("#exp-twert").value);
      const soll = uTheorieMv(z0.n2, z0.didt);
      const meldungEl = panel.querySelector("#exp-t-meldung");
      if (Number.isFinite(w) && Math.abs(w - soll) <= 0.3) {
        zustand.theorieOk = true;
        meldungEl.textContent = "✓ Passt! Die übrigen Zeilen rechnet das System — vergleiche selbst:";
        panel.querySelector("#exp-twrap").innerHTML = vergleichsTabelle();
      } else {
        meldungEl.textContent = "✗ Rechne 4π·10⁻⁷ · (1000/0,50) · " + z0.n2 + " · 2,00·10⁻³ · " + z0.didt + " — das Ergebnis in V, dann mal 1000 für mV.";
      }
    });
    panel.querySelector("#exp-f1-knopf").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-f1").value;
      const m = panel.querySelector("#exp-f1-meldung");
      if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m.textContent = wahl === "b"
        ? "✓ Genau! Auf die Größe von I kommt es nicht an, nur auf seine Änderungsrate. Kehrt die Änderung um, kehrt U um — die Induktionsspannung wirkt der Änderung entgegen (Lenz)."
        : "✗ Schau auf den Schrieb: An der Spitze ist I maximal, aber U springt dort nur um. Welche Größe wechselt an der Spitze ihr Vorzeichen?";
    });
    panel.querySelector("#exp-f2-knopf").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-f2").value;
      const m = panel.querySelector("#exp-f2-meldung");
      if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m.textContent = wahl === "b"
        ? "✓ Richtig — probier es in der Durchführung: Generator anhalten, und U fällt sofort auf 0. Nicht das Feld induziert, sondern seine ÄNDERUNG."
        : "✗ Halte den Generator in der Durchführung an und beobachte das Voltmeter: Was bleibt von U übrig, wenn sich nichts mehr ändert?";
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("induktionsgesetz-messwerte.csv",
        ["n2", "dI/dt in A/s", "U_mess in mV", "U_theorie in mV"],
        zustand.messungen.map(z => [String(z.n2), z.didt, z.uMv, uTheorieMv(z.n2, z.didt)]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.theorieOk = false;
      zustand.n2 = 300; zustand.didt = 2; zustand.laeuft = true;
      neuesBlatt(); zeichneGeraet(); wechslePhase("aufbau");
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") { panelMessen(); starteSchrieb(); }
    if (id === "auswerten") { stoppeSchrieb(); panelAuswerten(); }
    zeichneGeraet();
  }

  zeichneGeraet();
  zeichneSchreiber();
  wechslePhase("aufbau");
}
