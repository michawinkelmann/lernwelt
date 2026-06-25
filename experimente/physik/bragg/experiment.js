// experiment.js — Interaktives Experiment: Wellenlänge der Röntgenstrahlung (Bragg-Reflexion).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Den Glanzwinkel θ am Goniometer
// SELBST einstellen, das Zählrohr zeigt die Impulsrate — bei den Bragg-Winkeln
// schießt sie zu scharfen Reflexen hoch. Die Lernenden lesen die Glanzwinkel der
// Maxima SELBST an der Kreisteilung ab (mehrere Ordnungen, zwei charakteristische
// Linien des Röntgenmaterials), protokollieren und werten Zeile für Zeile aus:
// λ = 2·d·sin θ / n. Der Netzebenenabstand d = 282 pm (NaCl) ist gegeben, die
// Wellenlänge des Röhrenmaterials bleibt intern UNBEKANNT (Molybdän Kα ≈ 71,1 pm).
// Die kleine Ablesestreuung auf θ ist pro Reflex deterministisch geseedet — dadurch
// bleiben pruefFaelle und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import {
  streuung, parseDezimal, komma, mittel, esc,
  farbe, bauePhasen, csvHerunterladen, ablesungOk, reduzierteBewegung
} from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const D_NACL = 282;            // pm — Netzebenenabstand NaCl (gegeben, auf der Apparatur vermerkt)
// Charakteristische Linien des Röhrenmaterials (Molybdän) — intern, der Apparatur NICHT zu entnehmen.
export const LAMBDA_KA = 71.1;        // pm — Mo Kα (Hauptlinie, stark)
export const LAMBDA_KB = 63.1;        // pm — Mo Kβ (Nebenlinie, schwächer)
export const THETA_MIN = 2, THETA_MAX = 30, THETA_SCHRITT = 0.1; // Grad am Goniometer
export const PEAK_HALBWERT = 0.45;    // Grad — halbe Breite der Reflexe (scharfe Maxima)
export const UNTERGRUND = 12;         // Imp/s — Streustrahlung/Rauschen abseits der Reflexe
export const INT_KA1 = 1000;          // Imp/s — Spitzenintensität Kα 1. Ordnung (Referenz)
export const THETA_STREU_SPANNE = 0.30; // Grad — Ablese-/Justagestreuung auf den Glanzwinkel (±0,15°)
export const THETA_TOLERANZ = 0.4;    // akzeptierte θ-Ablesung: ±0,4°
export const LAMBDA_TOLERANZ = 3;     // λ-Eingabe in pm: ±3 pm
export const MIN_MESSUNGEN = 6;

// Linienkatalog mit relativer Intensität (Kβ etwa halb so stark wie Kα).
export const LINIEN = [
  { id: "ka", name: "Kα", lambda: LAMBDA_KA, staerke: 1.0 },
  { id: "kb", name: "Kβ", lambda: LAMBDA_KB, staerke: 0.5 }
];

// ---------- Physik (rein, Node-testbar) ----------
// Bragg-Bedingung n·λ = 2·d·sin θ → Glanzwinkel in Grad. NaN, falls keine Lösung (sin θ > 1).
export function braggWinkelGrad(lambda, d, n) {
  const s = n * lambda / (2 * d);
  return s <= 1 ? Math.asin(s) * 180 / Math.PI : NaN;
}
// Umkehrung: aus dem abgelesenen Glanzwinkel die Wellenlänge bestimmen (die Auswertungsformel).
export function lambdaAusWinkel(thetaGrad, d, n) {
  return (n >= 1 && d > 0) ? 2 * d * Math.sin(thetaGrad * Math.PI / 180) / n : NaN;
}
// höchste Ordnung, die im erfassten Winkelbereich (≤ THETA_MAX) noch einen Reflex liefert
export function maxOrdnung(lambda, d, thetaMaxGrad = THETA_MAX) {
  let n = 0, w;
  while (Number.isFinite(w = braggWinkelGrad(lambda, d, n + 1)) && w <= thetaMaxGrad) n++;
  return n;
}

// alle erwarteten Reflexe (Linie × Ordnung) im Bereich [THETA_MIN, THETA_MAX], nach Winkel sortiert.
export function reflexe(d = D_NACL) {
  const liste = [];
  for (const lin of LINIEN) {
    for (let n = 1; n <= maxOrdnung(lin.lambda, d); n++) {
      const theta = braggWinkelGrad(lin.lambda, d, n);
      if (theta >= THETA_MIN) {
        // Intensität fällt mit der Ordnung (Strukturfaktor/Polarisation grob modelliert: ~1/n)
        liste.push({ linie: lin.id, name: lin.name, lambda: lin.lambda, n, theta, hoehe: INT_KA1 * lin.staerke / n });
      }
    }
  }
  return liste.sort((a, b) => a.theta - b.theta);
}

// Impulsrate des Zählrohrs bei Glanzwinkel θ: Untergrund + Summe scharfer Gauß-Reflexe.
export function intensitaetReal(thetaGrad, d = D_NACL) {
  let i = UNTERGRUND;
  for (const r of reflexe(d)) {
    const x = (thetaGrad - r.theta) / PEAK_HALBWERT;
    i += r.hoehe * Math.exp(-x * x);
  }
  return i;
}
// abgelesene Winkel der Reflexe inkl. reproduzierbarer Ablesestreuung (Kreisteilung, Justage).
export function peakAngles(d = D_NACL) {
  return reflexe(d).map(r => ({
    ...r,
    thetaAbgelesen: r.theta + streuung("theta:" + r.linie + ":" + r.n, THETA_STREU_SPANNE)
  }));
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungThetaOk(eingabeGrad, wahrGrad) {
  return ablesungOk(eingabeGrad, wahrGrad, THETA_TOLERANZ);
}
export function lambdaEingabeOk(eingabePm, wahrPm) {
  return Number.isFinite(eingabePm) && Math.abs(eingabePm - wahrPm) <= LAMBDA_TOLERANZ;
}
export function bewertungLambda(gemessenPm, wahrPm = LAMBDA_KA) {
  const abw = Math.abs(gemessenPm - wahrPm) / wahrPm * 100;
  if (abw <= 2) return { stufe: "sehr gut", abw };
  if (abw <= 5) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: ≥ 6 Reflexe, dabei mindestens zwei verschiedene Ordnungen
// (sonst ist die Konsistenz über die Ordnungen gar nicht prüfbar).
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.n)).size >= 2;
}

// ---------- Prüffälle (analytisch nachgerechnet) ----------
export const pruefFaelle = [
  { art: "theta", lambda: LAMBDA_KA, n: 1, soll: 7.2422, tol: 1e-3 },   // Grad
  { art: "theta", lambda: LAMBDA_KA, n: 2, soll: 14.6035, tol: 1e-3 },  // Grad
  { art: "theta", lambda: LAMBDA_KA, n: 3, soll: 22.2217, tol: 1e-3 },  // Grad
  { art: "lambda", theta: 7.2422, n: 1, soll: 71.1, tol: 0.05 },        // pm (Rückrechnung)
  { art: "lambda", theta: 14.6035, n: 2, soll: 71.1, tol: 0.05 }        // pm (höhere Ordnung, gleiche λ)
];

export const TESTS = [
  { name: "Bragg-Winkel Kα: λ = 71,1 pm, d = 282 pm → θ₁ = 7,242°, θ₂ = 14,603°, θ₃ = 22,222°",
    ok: () => Math.abs(braggWinkelGrad(71.1, 282, 1) - 7.2422) < 1e-3
      && Math.abs(braggWinkelGrad(71.1, 282, 2) - 14.6035) < 1e-3
      && Math.abs(braggWinkelGrad(71.1, 282, 3) - 22.2217) < 1e-3 },
  { name: "Umkehrung exakt: θ → λ rechnet die Bragg-Winkel auf 71,1 pm zurück (n = 1,2,3)",
    ok: () => [1, 2, 3].every(n => {
      const th = braggWinkelGrad(71.1, 282, n);
      return Math.abs(lambdaAusWinkel(th, 282, n) - 71.1) < 1e-9;
    }) },
  { name: "Konsistenz über Ordnungen: jede Ordnung von Kα liefert dieselbe Wellenlänge",
    ok: () => { const ws = [1, 2, 3].map(n => lambdaAusWinkel(braggWinkelGrad(71.1, 282, n), 282, n));
      return ws.every(w => Math.abs(w - ws[0]) < 1e-9); } },
  { name: "Zweite Linie Kβ (63,1 pm) erscheint bei kleinerem Winkel als Kα derselben Ordnung",
    ok: () => braggWinkelGrad(63.1, 282, 1) < braggWinkelGrad(71.1, 282, 1)
      && braggWinkelGrad(63.1, 282, 2) < braggWinkelGrad(71.1, 282, 2) },
  { name: "n·λ = 2·d·sin θ ist die definierende Identität (Stichprobe über alle Reflexe)",
    ok: () => reflexe().every(r => Math.abs(r.n * r.lambda - 2 * D_NACL * Math.sin(r.theta * Math.PI / 180)) < 1e-9) },
  { name: "maxOrdnung: Kα am NaCl-Kristall reicht bis n = 3 (n = 4 läge bei 30,3° > 30°)",
    ok: () => maxOrdnung(71.1, 282) === 3 && Math.abs(braggWinkelGrad(71.1, 282, 4) - 30.281) < 1e-2 },
  { name: "Reflexkatalog liefert ≥ 6 Maxima, sortiert nach Winkel, alle im Bereich 2°–30°",
    ok: () => { const r = reflexe();
      return r.length >= MIN_MESSUNGEN
        && r.every((x, i) => i === 0 || x.theta >= r[i - 1].theta)
        && r.every(x => x.theta >= THETA_MIN && x.theta <= THETA_MAX); } },
  { name: "Intensität: am Bragg-Winkel scharfes Maximum, dazwischen nahe am Untergrund",
    ok: () => { const r0 = reflexe()[0];
      const aufPeak = intensitaetReal(r0.theta);
      const daneben = intensitaetReal(r0.theta + 2.5); // 2,5° abseits ⇒ praktisch Untergrund
      return aufPeak > UNTERGRUND + 0.6 * r0.hoehe
        && daneben < UNTERGRUND + 1
        && Math.abs(intensitaetReal(1000) - UNTERGRUND) < 1; } },
  { name: "Streugrenzen ±0,15° auf θ + Determinismus (gleicher Reflex gleich, anderer verschieden)",
    ok: () => { let irgendStreu = false;
      for (const p of peakAngles()) { const dlt = Math.abs(p.thetaAbgelesen - p.theta);
        if (dlt > THETA_STREU_SPANNE / 2 + 1e-12) return false;
        if (dlt > 1e-6) irgendStreu = true;
      }
      const a = peakAngles()[0].thetaAbgelesen, b = peakAngles()[0].thetaAbgelesen;
      return irgendStreu && a === b && peakAngles()[0].thetaAbgelesen !== peakAngles()[1].thetaAbgelesen; } },
  { name: "Ablese-/Eingabe-Toleranzen: θ ±0,4° und λ ±3 pm wie spezifiziert",
    ok: () => ablesungThetaOk(7.2, 7.2436) && ablesungThetaOk(7.6, 7.2436) && !ablesungThetaOk(7.7, 7.2436)
      && !ablesungThetaOk(NaN, 7.2436)
      && lambdaEingabeOk(71, 71.1) && lambdaEingabeOk(74, 71.1) && !lambdaEingabeOk(75, 71.1) && !lambdaEingabeOk(NaN, 71.1) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("7,2") === 7.2 && parseDezimal("7.2") === 7.2 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 Reflexen UND mindestens zwei Ordnungen",
    ok: () => { const z = (n, theta) => ({ n, theta });
      const nur1 = [1, 1, 1, 1, 1, 1].map(n => z(n, 7));            // nur 1. Ordnung
      const gut = [z(1, 7.2), z(1, 6.4), z(2, 14.6), z(2, 12.9), z(3, 22.2), z(3, 19.6)];
      return !messreiheVollstaendig(nur1)
        && !messreiheVollstaendig(gut.slice(0, 5)) && messreiheVollstaendig(gut); } },
  { name: "Bewertung: 71,1 → sehr gut · 73 → gut · 80 → nochmal prüfen",
    ok: () => bewertungLambda(71.1).stufe === "sehr gut" && bewertungLambda(73).stufe === "gut"
      && bewertungLambda(80).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => p.art === "theta"
      ? Math.abs(braggWinkelGrad(p.lambda, D_NACL, p.n) - p.soll) <= p.tol
      : Math.abs(lambdaAusWinkel(p.theta, D_NACL, p.n) - p.soll) <= p.tol) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Aufsicht aufs Goniometer) ----------
  const CX = 180, CY = 232;        // Drehmitte des Kristalltisches
  const R_QUELLE = 150;            // px — Abstand Röhre ↔ Drehmitte
  const R_ZAEHL = 150;             // px — Abstand Zählrohr ↔ Drehmitte
  const KRISTALL_HALB = 26;        // px — halbe Kristallbreite

  const zustand = {
    phase: "aufbau",
    theta: 7.0,
    vorhersage: "",                       // "groesser" | "kleiner" | "gleich"
    messungen: [],                        // {theta, n, lambdaEingabe, lambdaOk}
    nWahl: 1,                             // gewählte Ordnung beim Eintragen
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    meldungMessen: "", meldungAuswerten: ""
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="470" aria-label="Aufsicht auf das Röntgen-Goniometer: links die Röntgenröhre, in der Mitte der drehbare NaCl-Einkristall, rechts das Zählrohr. Röhre und Zählrohr stehen unter dem Glanzwinkel theta zur Kristalloberfläche; beim Drehen erfasst das Zählrohr den reflektierten Strahl. Unten die Kreisteilung mit der Glanzwinkel-Anzeige und das Anzeigefeld der Impulsrate."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  // Maximal-Impulsrate (für die Skalierung des Zeigerausschlags): höchster Reflex + Untergrund.
  const I_MAX_ANZEIGE = INT_KA1 + UNTERGRUND;

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.lineJoin = "round";

    const th = zustand.theta * Math.PI / 180;
    // Kristalloberfläche liegt waagerecht; Röhre links unter θ über der Fläche,
    // Zählrohr rechts spiegelsymmetrisch unter θ (Reflexionsgesetz am Goniometer:
    // dreht man den Kristall um θ, fährt das Zählrohr um 2θ mit).
    const qx = CX - Math.cos(th) * R_QUELLE, qy = CY - Math.sin(th) * R_QUELLE;
    const zx = CX + Math.cos(th) * R_ZAEHL, zy = CY - Math.sin(th) * R_ZAEHL;

    // Grundkreis des Goniometers
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.5;
    ctx.beginPath(); ctx.arc(CX, CY, R_QUELLE, Math.PI, 2 * Math.PI); ctx.stroke();
    ctx.globalAlpha = 1;

    // einfallender Strahl (Röhre → Kristall)
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(CX, CY); ctx.stroke();
    pfeilspitze(qx + (CX - qx) * 0.62, qy + (CY - qy) * 0.62, CX - qx, CY - qy, cAkzent);

    // reflektierter Strahl (Kristall → Zählrohr): nur sichtbar, wenn nennenswert Intensität ankommt
    const intensitaet = intensitaetReal(zustand.theta);
    const anteil = Math.min(1, (intensitaet - UNTERGRUND) / (I_MAX_ANZEIGE - UNTERGRUND));
    if (zustand.phase !== "aufbau") {
      ctx.globalAlpha = 0.25 + 0.75 * anteil;       // heller, je stärker der Reflex
      ctx.lineWidth = 1.5 + 3 * anteil;
      ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(zx, zy); ctx.stroke();
      ctx.globalAlpha = 1;
      pfeilspitze(CX + (zx - CX) * 0.62, CY + (zy - CY) * 0.62, zx - CX, zy - CY, cAkzent);
    }

    // Netzebenen im Kristall (Aufsicht: waagerechte Linien als angedeutete Ebenen)
    ctx.save();
    ctx.translate(CX, CY);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-KRISTALL_HALB, -16, 2 * KRISTALL_HALB, 32, 4); }
    else { ctx.beginPath(); ctx.rect(-KRISTALL_HALB, -16, 2 * KRISTALL_HALB, 32); }
    ctx.fill(); ctx.stroke();
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1; ctx.globalAlpha = 0.8;
    for (let y = -10; y <= 10; y += 6) { ctx.beginPath(); ctx.moveTo(-KRISTALL_HALB + 3, y); ctx.lineTo(KRISTALL_HALB - 3, y); ctx.stroke(); }
    ctx.globalAlpha = 1; ctx.restore();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("NaCl-Kristall (d = 282 pm)", CX, CY + 30);

    // Glanzwinkel-Bogen θ zwischen Kristalloberfläche und einfallendem Strahl
    ctx.strokeStyle = cText; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(CX, CY, 40, Math.PI, Math.PI + th); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("θ", CX - 52 * Math.cos(th / 2), CY - 52 * Math.sin(th / 2) + 4);

    // Röntgenröhre (Quelle)
    geraetekasten(qx - 30, qy - 18, 60, 28, "Röntgen-\nröhre", cText, cFlaeche, cLeise);
    // Zählrohr
    geraetekasten(zx - 24, zy - 16, 48, 26, "Zählrohr", cText, cFlaeche, cLeise);

    // Kreisteilung (Goniometer-Skala) unten als Halbkreis-Andeutung mit Strichen
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1; ctx.textAlign = "center";
    const RG = 88;
    for (let g = 0; g <= 30; g += 2) {
      const a = Math.PI + g * Math.PI / 180;
      const x1 = CX + Math.cos(a) * RG, y1 = CY + Math.sin(a) * RG;
      const lang = g % 10 === 0;
      const x2 = CX + Math.cos(a) * (RG + (lang ? 9 : 5)), y2 = CY + Math.sin(a) * (RG + (lang ? 9 : 5));
      ctx.strokeStyle = lang ? cText : cLeise; ctx.lineWidth = lang ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      if (lang) { ctx.fillStyle = cText; ctx.fillText(String(g) + "°", CX + Math.cos(a) * (RG + 22), CY + Math.sin(a) * (RG + 22) + 4); }
    }
    // Zeiger der Kreisteilung auf den aktuellen Glanzwinkel
    const ap = Math.PI + th;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(ap) * RG, CY + Math.sin(ap) * RG); ctx.stroke();

    // Anzeigefelder unten: Glanzwinkel + Impulsrate
    const kasten = (x, etikett, wert) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 410, 160, 46, 6); else ctx.rect(x, 410, 160, 46);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(etikett, x + 80, 427);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + 80, 447);
      ctx.font = "12px system-ui, sans-serif";
    };
    kasten(14, "Glanzwinkel", "θ = " + komma(zustand.theta, 1) + "°");
    if (zustand.phase !== "aufbau") {
      kasten(186, "Zählrohr (Impulsrate)", komma(Math.round(intensitaet), 0).replace(",000", "") + " Imp/s");
    } else {
      kasten(186, "Zählrohr (Impulsrate)", "— (Hochspannung aus)");
    }

    // Hinweistext im Aufbau
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(CX - 104, 60, 208, 56);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Hochspannung aus —", CX, 80);
      ctx.fillText("die Reflexe zeigen sich", CX, 98);
      ctx.fillText("in der Durchführung", CX, 116);
    }
    ctx.textAlign = "start";
  }

  function pfeilspitze(x, y, dx, dy, farbwert) {
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len, s = 8;
    ctx.fillStyle = farbwert;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x - ux * s - uy * s * 0.6, y - uy * s + ux * s * 0.6);
    ctx.lineTo(x - ux * s + uy * s * 0.6, y - uy * s - ux * s * 0.6);
    ctx.closePath(); ctx.fill();
  }
  function geraetekasten(x, y, bw, bh, label, cText, cFlaeche, cLeise) {
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, bw, bh, 4); else ctx.rect(x, y, bw, bh);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
    const zeilen = label.split("\n");
    zeilen.forEach((zl, i) => ctx.fillText(zl, x + bw / 2, y + bh / 2 + 4 + (i - (zeilen.length - 1) / 2) * 12));
    ctx.font = "12px system-ui, sans-serif";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Eine <strong>Röntgenröhre</strong> sendet die für ihr Anodenmaterial <strong>charakteristische Strahlung</strong> aus — eine sehr enge Mischung weniger Wellenlängen, hier praktisch <em>monochromatisch</em>. Welches Material steckt in der Röhre? Das sollst du gerade herausfinden — auf der Apparatur steht es <strong>nicht</strong>.</p>
      <p>Der Strahl trifft unter dem <strong>Glanzwinkel θ</strong> auf einen <strong>NaCl-Einkristall</strong> auf dem Goniometer. Im Kristall stapeln sich Netzebenen im festen Abstand <strong>d = 282 pm</strong> (das ist gegeben). Drehst du den Kristall, fährt das <strong>Zählrohr</strong> automatisch unter dem gleichen Winkel mit und misst die <strong>Impulsrate</strong> (reflektierte Intensität).</p>
      <p>Bei den meisten Winkeln löschen sich die an den Ebenen reflektierten Wellen aus — das Zählrohr zeigt nur Untergrund. Nur wenn der <strong>Gangunterschied</strong> benachbarter Ebenen ein <em>ganzzahliges</em> Vielfaches der Wellenlänge ist, verstärken sie sich zu einem scharfen <strong>Reflex</strong>. Das ist die <strong>Bragg-Bedingung</strong>:</p>
      <p class="formel-abgesetzt" style="text-align:center"><strong>n · λ = 2 · d · sin θ</strong>&nbsp;&nbsp;(n = 1, 2, 3 …)</p>
      <p><strong>Idee der Messung:</strong> Fahre θ langsam durch, lies die Glanzwinkel der Reflexe ab, und löse die Bragg-Bedingung nach λ auf: <strong>λ = 2 · d · sin θ / n</strong>. Weil dieselbe Wellenlänge in mehreren Ordnungen n erscheint, kannst du dein Ergebnis gleich mehrfach gegenprüfen.</p>
      <p><strong>Plan:</strong> Miss mindestens ${MIN_MESSUNGEN} Reflexe und erfasse dabei <em>mehrere Ordnungen</em> (n = 1, 2, 3). In der Auswertung berechnest du aus jeder Zeile λ und mittelst.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Du hast den ersten Reflex (1. Ordnung, n = 1) bei einem Winkel θ₁ gefunden. Bei welchem Winkel erwartest du den Reflex 2. Ordnung (n = 2)?</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="kleiner">Bei einem kleineren Winkel als θ₁</option>
        <option value="gleich">Beim selben Winkel θ₁</option>
        <option value="groesser">Bei einem größeren Winkel als θ₁</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-v").value = zustand.vorhersage;
    panel.querySelector("#exp-v").addEventListener("change", ev => { zustand.vorhersage = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst deine Vorhersage aus — gleich prüfst du sie selbst am Goniometer.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortAus = wahl => wahl === "groesser" ? "bei einem größeren Winkel"
    : wahl === "kleiner" ? "bei einem kleineren Winkel" : "beim selben Winkel";

  function beobachtungHtml() {
    const ordnungen = new Set(zustand.messungen.map(z => z.n));
    let html = `<p>Deine Vorhersage: der Reflex 2. Ordnung liegt <strong>${wortAus(zustand.vorhersage)}</strong>. Fahre θ durch und finde die Reflexe!</p>`;
    if (ordnungen.has(1) && ordnungen.has(2)) {
      const ok = zustand.vorhersage === "groesser";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>höhere Ordnung → größerer Glanzwinkel</strong>. Aus n·λ = 2·d·sin θ folgt sin θ ∝ n: bei doppeltem n braucht es einen größeren Winkel. ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
    }
    return html;
  }

  // Welcher echte Reflex liegt dem aktuellen θ am nächsten (für das Eintragen)?
  function naechsterReflex() {
    let best = null, bestAbw = Infinity;
    for (const p of peakAngles()) {
      const abw = Math.abs(p.thetaAbgelesen - zustand.theta);
      if (abw < bestAbw) { bestAbw = abw; best = p; }
    }
    return { reflex: best, abw: bestAbw };
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
    const ordAnz = new Set(zustand.messungen.map(z => z.n)).size;
    let fortschritt = `${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Reflexen.`;
    if (zustand.messungen.length >= 2 && ordAnz < 2) fortschritt += " Erfasse auch höhere Ordnungen (größere Winkel)!";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-theta">Glanzwinkel am Goniometer: θ = <strong id="exp-theta-wert">${komma(zustand.theta, 1)}°</strong></label>
        <input type="range" id="exp-theta" min="${THETA_MIN}" max="${THETA_MAX}" step="${THETA_SCHRITT}" value="${zustand.theta}" aria-label="Glanzwinkel in Grad">
      </div>
      <p>Anzeige des Zählrohrs: <strong id="exp-int-wert">${Math.round(intensitaetReal(zustand.theta))} Imp/s</strong> <span id="exp-int-hinweis" class="exp-leise"></span></p>
      <canvas id="exp-zaehler" class="exp-diagramm" width="440" height="120" aria-label="Live-Balken der Impulsrate des Zählrohrs: schlägt hoch aus, sobald der eingestellte Glanzwinkel einen Bragg-Reflex trifft."></canvas>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Reflex gefunden? Lies den Glanzwinkel θ an der Kreisteilung ab (in °):</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <label for="exp-n">als Ordnung n =</label>
        <select id="exp-n" class="exp-wahl" style="display:inline-block;margin:0">
          <option value="1">1</option><option value="2">2</option><option value="3">3</option>
        </select>
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>θ in °</th><th>Ordnung n</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${komma(z.theta, 1)}</td><td>${z.n}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const regler = panel.querySelector("#exp-theta");
    panel.querySelector("#exp-n").value = String(zustand.nWahl);
    const zaehlerCanvas = panel.querySelector("#exp-zaehler");
    const zctx = zaehlerCanvas.getContext("2d");
    zeichneZaehler(zctx, zaehlerCanvas);
    aktualisiereIntHinweis();

    regler.addEventListener("input", () => {
      zustand.theta = Math.round(Number(regler.value) * 10) / 10; // exakt auf Schrittweite — stabile Streu-Schlüssel
      panel.querySelector("#exp-theta-wert").textContent = komma(zustand.theta, 1) + "°";
      panel.querySelector("#exp-int-wert").textContent = Math.round(intensitaetReal(zustand.theta)) + " Imp/s";
      aktualisiereIntHinweis();
      zeichneZaehler(zctx, zaehlerCanvas);
      zeichne();
    });
    panel.querySelector("#exp-n").addEventListener("change", ev => { zustand.nWahl = Number(ev.target.value); });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const n = Number(panel.querySelector("#exp-n").value);
      const meldung = panel.querySelector("#exp-meldung");
      const { reflex, abw } = naechsterReflex();
      // Steht das Zählrohr überhaupt auf einem Reflex? (Untergrund ⇒ kein Maximum)
      if (!reflex || abw > THETA_TOLERANZ + 0.6) {
        meldung.textContent = "✗ Hier zeigt das Zählrohr nur Untergrund — kein Reflex. Fahre θ langsam durch, bis die Impulsrate hochschießt, und lies dann ab.";
        return;
      }
      if (!ablesungThetaOk(eingabe, reflex.thetaAbgelesen)) {
        meldung.textContent = "✗ Schau noch einmal genau auf die Kreisteilung: Bei welchem θ ist die Impulsrate am höchsten? (Auf etwa 0,2° genau ablesen.)";
        return;
      }
      if (n !== reflex.n) {
        meldung.textContent = `✗ Der Winkel passt zu einem Reflex, aber die Ordnung stimmt noch nicht. Tipp: Der allererste (kleinste) Reflex einer Linie ist n = 1, der nächstgrößere derselben Linie n = 2 …`;
        return;
      }
      if (zustand.messungen.some(z => z.linie === reflex.linie && z.n === reflex.n)) {
        meldung.textContent = "Diesen Reflex hast du schon notiert — fahre weiter zu einem anderen Maximum.";
        return;
      }
      zustand.messungen.push({
        theta: eingabe, n, linie: reflex.linie,
        lambdaEingabe: null, lambdaOk: null
      });
      zustand.meldungMessen = "✓ Notiert: Reflex bei θ = " + komma(eingabe, 1) + "°, Ordnung n = " + n + ".";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));

    function aktualisiereIntHinweis() {
      const i = intensitaetReal(zustand.theta);
      const el = panel.querySelector("#exp-int-hinweis");
      if (!el) return;
      el.textContent = i > UNTERGRUND + 0.5 * INT_KA1 ? "← starker Reflex!"
        : i > UNTERGRUND + 0.15 * INT_KA1 ? "← ein Reflex baut sich auf" : "(nur Untergrund)";
    }
  }

  // Live-Balken der Impulsrate (logarithmische Empfindung wäre Overkill — linear reicht)
  function zeichneZaehler(zctx, cv) {
    const w = cv.width, h = cv.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    zctx.clearRect(0, 0, w, h);
    zctx.font = "11px system-ui, sans-serif";
    // Achse
    const x0 = 8, x1 = w - 8, yBasis = h - 22;
    zctx.strokeStyle = cLeise; zctx.lineWidth = 1;
    zctx.beginPath(); zctx.moveTo(x0, yBasis); zctx.lineTo(x1, yBasis); zctx.stroke();
    // Balken
    const i = intensitaetReal(zustand.theta);
    const anteil = Math.min(1, (i - UNTERGRUND) / (I_MAX_ANZEIGE - UNTERGRUND));
    const bh = anteil * (yBasis - 10);
    zctx.fillStyle = cAkzent; zctx.globalAlpha = 0.85;
    zctx.fillRect(x0, yBasis - bh, x1 - x0, bh);
    zctx.globalAlpha = 1;
    zctx.fillStyle = cText; zctx.textAlign = "center";
    zctx.fillText("Impulsrate ≈ " + Math.round(i) + " Imp/s", w / 2, h - 6);
    zctx.textAlign = "start";
    zctx.fillStyle = cLeise; zctx.fillText("0", x0, yBasis - 2);
    zctx.textAlign = "end"; zctx.fillText("~" + I_MAX_ANZEIGE, x1, 12);
    zctx.textAlign = "start";
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} Reflexe mit mehreren Ordnungen — bisher: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.messungen.every(z => z.lambdaOk === true);
    const mw = fertig ? mittel(zustand.messungen.map(z => z.lambdaEingabe)) : NaN;
    const bew = fertig ? bewertungLambda(mw) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — so misst man Wellenlängen im Pikometerbereich!"
      : bew.stufe === "gut" ? " Ordentlich! Mit sorgfältigem Ablesen der Maxima kommst du noch näher heran."
      : " Kein Drama: Prüfe r in der Formel — sin θ einsetzen (nicht θ selbst) und durch die richtige Ordnung n teilen.") : "";

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Für jede Zeile gilt die nach λ aufgelöste Bragg-Bedingung: <strong>λ = 2 · d · sin θ / n</strong> mit d = 282 pm. Rechne selbst (Taschenrechner — Gradmaß!) und trage dein Ergebnis in <strong>pm</strong> ein — z. B. 71,2.</p>
      <details class="exp-fehler"><summary>Hilfe: Rechenfahrplan für eine Zeile</summary>
        <p>1) Taschenrechner auf <strong>Grad (DEG)</strong> stellen. 2) sin θ ausrechnen (z. B. sin 7,2° ≈ 0,1253). 3) λ = 2 · 282 pm · sin θ / n. Für n = 1: λ = 564 pm · sin θ. 4) Bei höherer Ordnung durch n teilen — die Wellenlänge muss in <em>jeder</em> Zeile (fast) gleich herauskommen.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>θ in °</th><th>n</th><th>λ in pm</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${komma(z.theta, 1)}</td><td>${z.n}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.lambdaEingabe == null ? "" : komma(z.lambdaEingabe, 1)}" aria-label="Deine Wellenlänge für Zeile ${i + 1} in Pikometer"></td>
          <td>${z.lambdaOk === true ? "✓" : z.lambdaOk === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Zeilen prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: λ ≈ ${komma(mw, 1)} pm</strong> (Mittelwert deiner ${zustand.messungen.length} Zeilen). Vergleichswert für die Kα-Linie von Molybdän: 71,1 pm — Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung}</p>
        <p>Auffällig? Ein paar Zeilen liefern eine deutlich <em>kürzere</em> Wellenlänge (um 63 pm). Das ist kein Messfehler, sondern die zweite charakteristische Linie der Röhre (<strong>Kβ</strong>) — die Röhre sendet zwei eng benachbarte Wellenlängen aus.</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Warum brauchst du überhaupt einen <strong>Kristall</strong> als „Gitter“ — und kein optisches Strichgitter wie bei sichtbarem Licht?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="hart">Röntgenstrahlung ist zu energiereich für Glas</option>
          <option value="abstand">Der Netzebenenabstand (~100 pm) liegt in der Größenordnung der Wellenlänge — ein Strichgitter ist viel zu grob</option>
          <option value="fest">Nur feste Körper reflektieren Röntgenstrahlung</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du tauschst den NaCl-Kristall gegen einen mit <strong>größerem</strong> Netzebenenabstand d (bei gleicher Wellenlänge). Was passiert mit dem Glanzwinkel des Reflexes 1. Ordnung?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="groesser">θ wird größer</option>
          <option value="kleiner">θ wird kleiner</option>
          <option value="gleich">θ bleibt gleich</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum streuen die λ-Werte um 71 pm?</summary>
        <p><strong>Ablesung des Glanzwinkels:</strong> Der Reflex hat eine endliche Breite, das Maximum lässt sich nur auf Bruchteile eines Grades genau festlegen. Weil λ über sin θ vom Winkel abhängt, schlägt ein Ablesefehler von 0,1° unmittelbar auf die Wellenlänge durch — bei kleinen Winkeln (kleine Ordnung) relativ am stärksten.</p>
        <p><strong>Justage des Goniometers:</strong> Sitzt der Nullpunkt der Kreisteilung nicht exakt auf der Strahlachse oder steht der Kristall leicht schief, verschieben sich <em>alle</em> Winkel systematisch. Eine sorgfältige Nullpunktkontrolle (symmetrischer Reflex links/rechts) fängt das ab.</p>
        <p><strong>Zwei Linien dicht beieinander:</strong> Kα und Kβ liegen nah zusammen; wer die Reflexe verwechselt oder die Ordnung falsch zuordnet, mischt zwei Wellenlängen. Konsequente Zuordnung über mehrere Ordnungen (gleiche Linie ⇒ gleiches λ) entlarvt solche Fehler.</p>
        <p><strong>Strategie dagegen:</strong> Reflexe höherer Ordnung mitnehmen (größerer Winkel ⇒ genauere Ablesung relativ zur Wellenlänge) und über alle Zeilen derselben Linie mitteln — genau das hast du getan.</p>
      </details>`;

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.lambdaEingabe = null; z.lambdaOk = null; return; }
        z.lambdaEingabe = wert;
        z.lambdaOk = lambdaEingabeOk(wert, lambdaAusWinkel(z.theta, D_NACL, z.n));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (Dezimalzahl, z. B. 71,2).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.lambdaOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle Zeilen bestätigt — unten wartet dein Mittelwert."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±3 pm Toleranz). Häufigste Stolperfalle: Taschenrechner auf Grad stellen und durch die richtige Ordnung n teilen!";
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "abstand" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "kleiner" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("bragg-messreihe.csv",
        ["theta in Grad", "Ordnung n", "lambda in pm"],
        zustand.messungen.map(z => [z.theta, String(z.n), z.lambdaEingabe == null ? "" : z.lambdaEingabe]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        theta: 7.0, vorhersage: "", messungen: [], nWahl: 1,
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Ein Beugungsgitter wirkt nur, wenn seine Strukturabstände in der Größenordnung der Wellenlänge liegen. Röntgenstrahlung hat λ ≈ 50–200 pm — viel zu fein für ein geritztes Strichgitter (Striche µm-weit auseinander). Der regelmäßige Atomgitter-Aufbau eines Kristalls mit d ≈ 100 pm passt dagegen perfekt: Die Natur liefert das ideale „Gitter“."
      : "✗ Nicht ganz: Es liegt nicht an der Energie und nicht daran, dass nur Festkörper reflektieren. Entscheidend ist der Maßstab — überlege, wie groß die Wellenlänge der Röntgenstrahlung ist und welcher „Gitterabstand“ dazu passt.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: Aus sin θ = n·λ / (2·d) folgt — bei festem λ und n — ein <em>kleinerer</em> sin θ, wenn d größer wird. Also rückt der Reflex zu kleineren Glanzwinkeln. (Ein größerer Gittermaßstab beugt schwächer.)"
      : "✗ Schau auf sin θ = n·λ / (2·d): d steht im Nenner. Wird d größer, wird sin θ kleiner — und damit der Glanzwinkel.";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }
  // prefers-reduced-motion respektieren: das Experiment animiert nichts automatisch
  // (alle Änderungen sind nutzergesteuert), darum genügt das einmalige Zeichnen.
  void reduzierteBewegung;
  wechslePhase("aufbau");
}