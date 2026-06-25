// experiment.js — Interaktives Experiment: Röntgenbremsspektrum — Grenzwellenlänge & h (QP, eA).
// Praktikumsnahe Messpraxis statt fertiger Zahlen: die Röhrenspannung U am Regler einstellen,
// das aufgenommene Bremsspektrum betrachten und die kurzwellige Grenze λ_min am
// SELBST verschiebbaren Cursor an einer pm-Skala ablesen. ≥6 verschiedene U protokollieren
// und in der Auswertung λ_min über 1/U auftragen: Ursprungsgerade mit Steigung h·c/e → h.
// Die kleine Ablesestreuung an der Grenze ist pro U deterministisch geseedet (helfer.streuung),
// damit pruefFaelle und TESTS in Node analytisch prüfbar bleiben. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, esc, mittel, regression, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen } from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
export const H_EXAKT = 6.62607015e-34;   // Js (CODATA, exakt) — nur für die Modell-Selbstprüfung, NIE im UI als Sollwert
export const C_LICHT = 2.99792458e8;      // m/s — Lichtgeschwindigkeit
export const E_LADUNG = 1.602e-19;        // C — Elementarladung (Wert fürs Protokoll)
export const E_EXAKT = 1.602176634e-19;   // C — exakter Wert, nur für die Modell-Selbstprüfung
export const HC_E = H_EXAKT * C_LICHT / E_EXAKT; // V·m ≈ 1,23984·10⁻⁶ — Duane-Hunt-Konstante λ_min·U
export const U_MIN_KV = 15, U_MAX_KV = 35, U_SCHRITT_KV = 2.5; // Röhrenspannung in kV
export const LAMBDA_STREU_SPANNE_PM = 1.0; // Ablesestreuung an der Grenze: ±0,5 pm
export const LAMBDA_TOLERANZ_PM = 0.8;     // akzeptierte Ablesung der Grenzwellenlänge: ±0,8 pm
export const H_TOLERANZ = 0.25;            // h-Eingabe in 10⁻³⁴ Js: ±0,25
export const STEIGUNG_TOL_REL = 0.04;      // Steigung am Diagramm ablesen: ±4 %
export const MIN_MESSUNGEN = 6;

// ---------- Physik (rein, Node-testbar) ----------
// Duane-Hunt: maximale Photonenenergie = e·U, also λ_min = h·c/(e·U). U in Volt, Ergebnis in Meter.
export function grenzwellenlaenge(uVolt) {
  return uVolt > 0 ? HC_E / uVolt : NaN; // m
}
// in Pikometer — so steht λ_min in der Messtabelle
export function grenzwellenlaengePm(uVolt) {
  return grenzwellenlaenge(uVolt) * 1e12;
}
// wahre, am Cursor abgelesene Grenze inkl. reproduzierbarer Ablesestreuung (Pixelraster/Augenmaß)
export function grenzwellenlaengeReal(uVolt) {
  return grenzwellenlaengePm(uVolt) + streuung("lmin:" + uVolt, LAMBDA_STREU_SPANNE_PM); // pm
}
// Intensität des Bremsspektrums über λ (willkürliche Einheiten): scharfe Kante bei λ_min,
// danach steiler Anstieg, breites Maximum, langer langwelliger Auslauf (Kramers-artig).
// λ in pm. Reine Form fürs Zeichnen und zum Auffinden der Kante.
export function intensitaet(lambdaPm, uVolt) {
  const lmin = grenzwellenlaengePm(uVolt);
  if (lambdaPm <= lmin) return 0; // links der Grenze: keine Strahlung (Duane-Hunt)
  const x = lambdaPm / lmin;       // ab der Kante: x > 1
  return Math.max(0, (x - 1) / (x * x * x)); // Maximum bei x = 3/2, Kante bei x = 1
}
// Auswertung pro Zeile: aus e·U = h·c/λ_min folgt h = e·U·λ_min/c. λ_min in pm.
export function hAusZeile(uVolt, lminPm) {
  return (uVolt > 0 && lminPm > 0) ? E_LADUNG * uVolt * (lminPm * 1e-12) / C_LICHT : NaN; // Js
}
// Auswertung über die Steigung: λ_min (pm) gegen x = 1/U in Einheiten 10⁻⁵ V⁻¹ auftragen.
// Steigung m hat die Einheit pm/(10⁻⁵ V⁻¹); es gilt h·c/e = m·10⁻⁷ V·m, also h = m·10⁻⁷·e/c.
export function hAusSteigung(mPlot, e = E_LADUNG) {
  return mPlot * 1e-7 * e / C_LICHT; // Js
}
// x-Wert fürs Diagramm: 1/U in Einheiten 10⁻⁵ V⁻¹
export function xPlot(uVolt) {
  return 1e5 / uVolt;
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungLambdaOk(eingabePm, uVolt) {
  return Number.isFinite(eingabePm) && Math.abs(eingabePm - grenzwellenlaengeReal(uVolt)) <= LAMBDA_TOLERANZ_PM;
}
export function steigungOk(eingabe, mRegr) {
  return Number.isFinite(eingabe) && Number.isFinite(mRegr) && Math.abs(eingabe - mRegr) <= STEIGUNG_TOL_REL * Math.abs(mRegr);
}
export function hEingabeOk(eingabe1e34, wahr1e34 = H_EXAKT / 1e-34) {
  return Number.isFinite(eingabe1e34) && Math.abs(eingabe1e34 - wahr1e34) <= H_TOLERANZ;
}
export function bewertungH(h1e34) {
  const soll = H_EXAKT / 1e-34; // 6,62607
  const abw = Math.abs(h1e34 - soll) / soll * 100;
  if (abw <= 2) return { stufe: "sehr gut", abw };
  if (abw <= 5) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Röhrenspannungen
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN && new Set(messungen.map(z => z.U)).size >= MIN_MESSUNGEN;
}
// Regression über die Messtabelle: x = 1/U (10⁻⁵ V⁻¹), y = λ_min (pm) → Ursprungsgerade
export function auswertung(messungen) {
  const punkte = messungen.map(z => ({ x: xPlot(z.U), y: z.lmin }));
  const { m, b } = regression(punkte);
  return { m, b, punkte };
}

// ---------- Prüffälle (analytisch nachgerechnet) ----------
export const pruefFaelle = [
  { art: "lmin", U: 20000, soll: 61.992, tol: 0.01 },   // pm — Kontrollwert
  { art: "lmin", U: 30000, soll: 41.328, tol: 0.01 },   // pm
  { art: "prop", U1: 15000, U2: 30000 },                // λ_min(15kV) = 2·λ_min(30kV)
  { art: "h", U: 25000, soll: 6.62607015e-34, tol: 1e-40 } // Rückrechnung aus Zeile
];

export const TESTS = [
  { name: "Duane-Hunt-Konstante: h·c/e ≈ 1,23984·10⁻⁶ V·m",
    ok: () => HC_E === H_EXAKT * C_LICHT / E_EXAKT && Math.abs(HC_E - 1.2398420e-6) < 1e-12 },
  { name: "Kontrollwert λ_min: U = 20 kV → 61,99 pm (±0,01)",
    ok: () => Math.abs(grenzwellenlaengePm(20000) - 61.992) <= 0.01 },
  { name: "Kontrollwert λ_min: U = 30 kV → 41,33 pm (±0,01)",
    ok: () => Math.abs(grenzwellenlaengePm(30000) - 41.328) <= 0.01 },
  { name: "λ_min hängt NUR von U ab und ist antiproportional: U verdoppeln → λ_min halbiert",
    ok: () => [[15000, 30000], [12000, 24000], [17500, 35000]].every(([u1, u2]) =>
      Math.abs(grenzwellenlaengePm(u1) - 2 * grenzwellenlaengePm(u2)) <= 1e-9) },
  { name: "Kante: links von λ_min keine Strahlung, rechts davon Intensität > 0",
    ok: () => { const lmin = grenzwellenlaengePm(25000);
      return intensitaet(lmin - 0.01, 25000) === 0 && intensitaet(lmin * 0.5, 25000) === 0
        && intensitaet(lmin + 5, 25000) > 0 && intensitaet(lmin * 1.5, 25000) > 0; } },
  { name: "Bremsspektrum: Intensitätsmaximum liegt bei λ = 1,5·λ_min (Kramers-Form)",
    ok: () => { const U = 25000, lmin = grenzwellenlaengePm(U);
      const imax = intensitaet(1.5 * lmin, U);
      return [1.2, 1.35, 1.7, 2.0, 2.5].every(f => intensitaet(f * lmin, U) <= imax + 1e-12)
        && imax > intensitaet(1.05 * lmin, U); } },
  { name: "h-Pipeline pro Zeile invertiert exakt: perfekte λ_min(U) → 6,62607015·10⁻³⁴ Js",
    ok: () => [15000, 20000, 25000, 30000, 35000, 22500].every(U =>
      Math.abs(hAusZeile(U, grenzwellenlaengePm(U)) * (E_EXAKT / E_LADUNG) - H_EXAKT) <= 1e-40) },
  { name: "h aus Steigung: perfekte λ_min-1/U-Gerade → Steigung·10⁻⁷·e/c = 6,626·10⁻³⁴ Js",
    ok: () => { const reihe = [15000, 17500, 20000, 25000, 30000, 35000].map(U => ({ U, lmin: grenzwellenlaengePm(U) }));
      const { m } = auswertung(reihe);
      return Math.abs(m - 12.39842) < 1e-3 && Math.abs(hAusSteigung(m, E_EXAKT) * 1e34 - 6.62607) < 0.005; } },
  { name: "Regression ist Ursprungsgerade: Achsenabschnitt b ≈ 0",
    ok: () => { const reihe = [15000, 20000, 22500, 27500, 30000, 35000].map(U => ({ U, lmin: grenzwellenlaengePm(U) }));
      return Math.abs(auswertung(reihe).b) < 1e-6; } },
  { name: "Streugrenzen ±0,5 pm auf dem ganzen Spannungsraster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let kv = U_MIN_KV; kv <= U_MAX_KV + 1e-9; kv += U_SCHRITT_KV) { const U = Math.round(kv * 1000);
        const d = Math.abs(grenzwellenlaengeReal(U) - grenzwellenlaengePm(U));
        if (d > LAMBDA_STREU_SPANNE_PM / 2 + 1e-12) return false;
        if (d > 1e-6) irgendStreu = true;
      }
      return irgendStreu && grenzwellenlaengeReal(20000) === grenzwellenlaengeReal(20000)
        && grenzwellenlaengeReal(20000) !== grenzwellenlaengeReal(22500); } },
  { name: "Ablese-Toleranz λ_min ±0,8 pm um den wahren (gestreuten) Wert",
    ok: () => { const w = grenzwellenlaengeReal(20000);
      return ablesungLambdaOk(w, 20000) && ablesungLambdaOk(w + 0.7, 20000)
        && !ablesungLambdaOk(w + 0.9, 20000) && !ablesungLambdaOk(w - 1.0, 20000) && !ablesungLambdaOk(NaN, 20000); } },
  { name: "h-Eingabe-Toleranz ±0,25·10⁻³⁴ Js, Steigung ±4 %",
    ok: () => hEingabeOk(6.63) && hEingabeOk(6.85) && !hEingabeOk(6.88) && !hEingabeOk(NaN)
      && steigungOk(12.4, 12.39842) && steigungOk(12.86, 12.39842) && !steigungOk(13.5, 12.39842) && !steigungOk(NaN, 12.39842) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("61,9") === 61.9 && parseDezimal("61.9") === 61.9 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen Spannungen",
    ok: () => { const z = (U, lmin) => ({ U, lmin });
      const wenig = [15000, 20000, 25000, 30000, 35000].map(U => z(U, grenzwellenlaengePm(U)));
      const doppelt = [15000, 15000, 20000, 25000, 30000, 35000].map(U => z(U, 1));
      const gut = [15000, 17500, 20000, 25000, 30000, 35000].map(U => z(U, 1));
      return !messreiheVollstaendig(wenig) && !messreiheVollstaendig(doppelt) && messreiheVollstaendig(gut); } },
  { name: "Bewertung: 6,626 → sehr gut · 6,80 → gut · 7,20 → nochmal prüfen",
    ok: () => bewertungH(6.626).stufe === "sehr gut" && bewertungH(6.80).stufe === "gut"
      && bewertungH(7.20).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "lmin") return Math.abs(grenzwellenlaengePm(p.U) - p.soll) <= p.tol;
      if (p.art === "prop") return Math.abs(grenzwellenlaengePm(p.U1) - 2 * grenzwellenlaengePm(p.U2)) <= 1e-9;
      return Math.abs(hAusZeile(p.U, grenzwellenlaengePm(p.U)) * (E_EXAKT / E_LADUNG) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  // ---------- Diagramm-Geometrie des Spektrums (λ-Achse in pm) ----------
  const LAMBDA_ACHSE_MIN = 20, LAMBDA_ACHSE_MAX = 130; // pm, fester sichtbarer Bereich

  const zustand = {
    phase: "aufbau",
    U: 20000,                       // Röhrenspannung in V
    cursorPm: 60,                   // Position des Ablese-Cursors in pm
    vorhersage: "",                 // "kuerzer" | "laenger" | "gleich"
    messungen: [],                  // { U, lmin } (lmin in pm, selbst abgelesen)
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    ausw: { m: NaN, mOk: false, hWert: NaN, hOk: false },
    meldungMessen: "", meldungAuswerten: ""
  };
  const uKv = () => zustand.U / 1000;

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="380" height="470" aria-label="Röntgenröhre mit Spektrometer: oben das Schema der Röhre mit einstellbarer Röhrenspannung, darunter das aufgenommene Bremsspektrum als Intensität-über-Wellenlänge-Diagramm mit Pikometer-Skala. Eine scharfe kurzwellige Kante markiert die Grenzwellenlänge; ein verschiebbarer Cursor dient zum Ablesen."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);
  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;

  // ---------- Diagramm-Abbildung Spektrum ----------
  const DIA_X0 = 56, DIA_X1 = 364, DIA_Y0 = 430, DIA_Y1 = 150; // Plotrahmen im Canvas
  const lambdaZuX = pm => DIA_X0 + (pm - LAMBDA_ACHSE_MIN) / (LAMBDA_ACHSE_MAX - LAMBDA_ACHSE_MIN) * (DIA_X1 - DIA_X0);
  const xZuLambda = px => LAMBDA_ACHSE_MIN + (px - DIA_X0) / (DIA_X1 - DIA_X0) * (LAMBDA_ACHSE_MAX - LAMBDA_ACHSE_MIN);

  function rrect(x, y, b, h, r = 6) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, b, h, r); else ctx.rect(x, y, b, h);
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b33"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start"; ctx.lineWidth = 2;

    // ---- Röhren-Schema (oben) ----
    ctx.strokeStyle = cText; ctx.fillStyle = cFlaeche;
    rrect(16, 22, 140, 96, 10); ctx.fill(); ctx.stroke(); // Glaskolben (Röhre)
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Röntgenröhre (Vakuum)", 18, 18);
    // Kathode (Glühwendel, links)
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(34, 50); ctx.lineTo(34, 90); ctx.stroke();
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(40, 60 + i * 12, 5, Math.PI * 0.5, Math.PI * 1.5); ctx.stroke(); }
    ctx.fillStyle = cLeise; ctx.fillText("Kathode", 20, 108);
    // Anode (schräge Fläche, rechts)
    ctx.strokeStyle = cText; ctx.fillStyle = cText; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(128, 44); ctx.lineTo(112, 96); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText("Anode", 116, 108);
    // beschleunigte Elektronen → Anode
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5; ctx.fillStyle = cAkzent;
    for (let i = 0; i < 3; i++) { const yy = 58 + i * 16;
      ctx.beginPath(); ctx.moveTo(48, yy); ctx.lineTo(104, yy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(104, yy); ctx.lineTo(96, yy - 4); ctx.lineTo(96, yy + 4); ctx.closePath(); ctx.fill(); }
    // Röntgenstrahl aus der Anode zum Spektrometer
    ctx.fillStyle = cAkzent; ctx.globalAlpha = 0.5;
    for (let s = 0; s < 4; s++) ctx.fillRect(120 + s * 9, 116, 5, 8);
    ctx.globalAlpha = 1;

    // Spannungsanzeige der Röhre
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    rrect(196, 30, 168, 50, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Röhrenspannung", 280, 48);
    ctx.fillStyle = cText; ctx.font = "bold 17px ui-monospace, monospace";
    ctx.fillText("U = " + komma(uKv(), 1) + " kV", 280, 70);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    // Spektrometer-Etikett
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Spektrometer (Bragg-Drehung) → Spektrum:", 196, 100);
    ctx.font = "12px system-ui, sans-serif";

    // ---- Bremsspektrum-Diagramm ----
    // Achsen
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(DIA_X0, DIA_Y1); ctx.lineTo(DIA_X0, DIA_Y0); ctx.lineTo(DIA_X1, DIA_Y0); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "start";
    ctx.fillText("Intensität", DIA_X0 - 40, DIA_Y1 - 4);
    ctx.textAlign = "right"; ctx.fillText("λ in pm", DIA_X1, DIA_Y0 + 35); ctx.textAlign = "start";
    // λ-Skala (pm) mit Strichen alle 10 pm, Beschriftung alle 20 pm
    ctx.font = "10px system-ui, sans-serif";
    for (let pm = LAMBDA_ACHSE_MIN; pm <= LAMBDA_ACHSE_MAX; pm += 10) {
      const x = lambdaZuX(pm), gross = pm % 20 === 0;
      ctx.strokeStyle = gross ? cText : cLeise; ctx.lineWidth = gross ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, DIA_Y0); ctx.lineTo(x, DIA_Y0 + (gross ? 7 : 4)); ctx.stroke();
      if (gross) { ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(String(pm), x, DIA_Y0 + 19); }
    }
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    // Spektrumskurve (ab der Durchführung sichtbar) — Maximum auf feste Höhe normiert
    if (zustand.phase !== "aufbau") {
      const lmin = grenzwellenlaengePm(zustand.U);
      const iMax = intensitaet(1.5 * lmin, zustand.U) || 1;
      const yVon = i => DIA_Y0 - (i / iMax) * (DIA_Y0 - DIA_Y1) * 0.92;
      // Füllung unter der Kurve
      ctx.beginPath(); ctx.moveTo(lambdaZuX(Math.max(LAMBDA_ACHSE_MIN, lmin)), DIA_Y0);
      let erster = true;
      for (let pm = LAMBDA_ACHSE_MIN; pm <= LAMBDA_ACHSE_MAX; pm += 0.5) {
        const x = lambdaZuX(pm), y = yVon(intensitaet(pm, zustand.U));
        if (erster) { ctx.lineTo(x, y); erster = false; } else ctx.lineTo(x, y);
      }
      ctx.lineTo(lambdaZuX(LAMBDA_ACHSE_MAX), DIA_Y0); ctx.closePath();
      ctx.fillStyle = cAkzent; ctx.globalAlpha = 0.18; ctx.fill(); ctx.globalAlpha = 1;
      // Kurve
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5; ctx.beginPath();
      erster = true;
      for (let pm = LAMBDA_ACHSE_MIN; pm <= LAMBDA_ACHSE_MAX; pm += 0.5) {
        const x = lambdaZuX(pm), y = yVon(intensitaet(pm, zustand.U));
        if (erster) { ctx.moveTo(x, y); erster = false; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
      // scharfe kurzwellige Kante senkrecht hervorheben
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 1; ctx.setLineDash([3, 3]);
      ctx.beginPath(); ctx.moveTo(lambdaZuX(lmin), DIA_Y0); ctx.lineTo(lambdaZuX(lmin), yVon(intensitaet(lmin + 0.5, zustand.U))); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left";
      ctx.fillText("kurzwellige Grenze", lambdaZuX(lmin) + 4, DIA_Y1 + 30);
      ctx.font = "12px system-ui, sans-serif";

      // verschiebbarer Ablese-Cursor (senkrechte Linie + Wert)
      const cx = lambdaZuX(zustand.cursorPm);
      ctx.strokeStyle = cFehler; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(cx, DIA_Y1 - 6); ctx.lineTo(cx, DIA_Y0 + 9); ctx.stroke();
      // Griff oben
      ctx.fillStyle = cFehler; ctx.beginPath();
      ctx.moveTo(cx, DIA_Y1 - 6); ctx.lineTo(cx - 5, DIA_Y1 - 14); ctx.lineTo(cx + 5, DIA_Y1 - 14); ctx.closePath(); ctx.fill();
      ctx.textAlign = "center"; ctx.fillStyle = cFehler; ctx.font = "bold 12px ui-monospace, monospace";
      ctx.fillText("λ = " + komma(zustand.cursorPm, 1) + " pm", cx, DIA_Y1 - 18);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    } else {
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Röhre aus — das Spektrum erscheint", (DIA_X0 + DIA_X1) / 2, (DIA_Y0 + DIA_Y1) / 2 - 6);
      ctx.fillText("in der Durchführung.", (DIA_X0 + DIA_X1) / 2, (DIA_Y0 + DIA_Y1) / 2 + 12);
      ctx.textAlign = "start";
    }
  }

  // ---------- Cursor mit der Maus/Touch verschieben ----------
  function cursorAusEvent(ev) {
    const rect = canvas.getBoundingClientRect();
    const px = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const pm = Math.max(LAMBDA_ACHSE_MIN, Math.min(LAMBDA_ACHSE_MAX, xZuLambda(px)));
    zustand.cursorPm = Math.round(pm * 10) / 10; // 0,1-pm-Raster
    const feld = panel.querySelector("#exp-wert");
    if (feld) feld.value = komma(zustand.cursorPm, 1);
    zeichne();
  }

  // ---------- Phase 1: Aufbau (POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>In einer <strong>Röntgenröhre</strong> beschleunigt die <strong>Röhrenspannung U</strong> Elektronen von der Glühkathode zur Anode. Beim Abbremsen im Anodenmaterial geben sie Energie als Röntgenstrahlung ab — das ist die <strong>Bremsstrahlung</strong>. Ein <strong>Spektrometer</strong> (Bragg-Reflexion an einem Kristall) zerlegt sie und nimmt das <strong>Bremsspektrum</strong> auf: Intensität über der Wellenlänge λ.</p>
      <p>Auffällig ist die <strong>scharfe kurzwellige Grenze</strong> λ_min: kürzere Wellenlängen kommen nicht vor. Der Grund (Duane-Hunt): Ein Elektron kann höchstens seine ganze Energie e·U in <em>ein</em> Photon stecken. Dieses energiereichste Photon hat die kleinste Wellenlänge:</p>
      <p style="text-align:center"><strong>e·U = h·c / λ_min &nbsp;&nbsp;⟹&nbsp;&nbsp; λ_min = h·c / (e·U)</strong></p>
      <p><strong>Idee der Messung:</strong> λ_min hängt nur von U ab — und in λ_min stecken h und c. Misst du λ_min für viele Spannungen und trägst λ_min gegen 1/U auf, liegt alles auf einer <strong>Ursprungsgeraden</strong> mit der Steigung h·c/e. Daraus bestimmst du <strong>h</strong>.</p>
      <p><strong>Plan:</strong> Nimm das Spektrum für mindestens ${MIN_MESSUNGEN} verschiedene Röhrenspannungen auf und lies jedes Mal λ_min an der Kante ab.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich U erhöhe, liegt die kurzwellige Grenze λ_min bei …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="kuerzer">… kürzeren Wellenlängen (λ_min wird kleiner)</option>
        <option value="laenger">… längeren Wellenlängen (λ_min wird größer)</option>
        <option value="gleich">… bleibt an derselben Stelle</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-v").value = zustand.vorhersage;
    panel.querySelector("#exp-v").addEventListener("change", ev => { zustand.vorhersage = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst deine Vorhersage aus — gleich prüfst du sie selbst am Spektrum.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortAus = wahl => wahl === "kuerzer" ? "kürzeren Wellenlängen (kleineres λ_min)"
    : wahl === "laenger" ? "längeren Wellenlängen (größeres λ_min)" : "an derselben Stelle";

  function beobachtungHtml() {
    let html = `<p>Deine Vorhersage: U rauf → Grenze bei <strong>${wortAus(zustand.vorhersage)}</strong>. Verschiebe U und beobachte die Kante!</p>`;
    if (new Set(zustand.messungen.map(z => z.U)).size >= 2) {
      const ok = zustand.vorhersage === "kuerzer";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>U rauf → Kante wandert nach links</strong> (kürzeres λ_min, denn λ_min ∝ 1/U). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const anz = new Set(zustand.messungen.map(z => z.U)).size;
    let fortschritt = `${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen.`;
    if (zustand.messungen.length >= 1 && anz < MIN_MESSUNGEN) fortschritt += " Stelle für jede Messung eine andere Spannung ein!";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-u">Röhrenspannung: U = <strong id="exp-u-wert">${komma(uKv(), 1)} kV</strong></label>
        <input type="range" id="exp-u" min="${U_MIN_KV}" max="${U_MAX_KV}" step="${U_SCHRITT_KV}" value="${uKv()}" aria-label="Röhrenspannung in Kilovolt">
      </div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <p>Schiebe den <strong>roten Cursor</strong> im Spektrum genau auf die kurzwellige Kante (oder tippe den Wert direkt ein) und lies die <strong>Grenzwellenlänge λ_min in pm</strong> ab — auf etwa 0,5 pm genau.</p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">λ_min an der Kante in pm:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7" value="${komma(zustand.cursorPm, 1)}">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>U in kV</th><th>1/U in 10⁻⁵ V⁻¹</th><th>λ_min in pm</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${komma(z.U / 1000, 1)}</td><td>${komma(xPlot(z.U), 3)}</td><td>${komma(z.lmin, 1)}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const uRegler = panel.querySelector("#exp-u");
    uRegler.addEventListener("input", () => {
      zustand.U = Math.round(Number(uRegler.value) * 1000);
      panel.querySelector("#exp-u-wert").textContent = komma(uKv(), 1) + " kV";
      // Cursor sinnvoll mitführen: in die Nähe der neuen Kante setzen
      zustand.cursorPm = Math.round(grenzwellenlaengePm(zustand.U) * 10) / 10;
      const feld = panel.querySelector("#exp-wert");
      if (feld) feld.value = komma(zustand.cursorPm, 1);
      zeichne();
    });
    panel.querySelector("#exp-wert").addEventListener("input", ev => {
      const v = parseDezimal(ev.target.value);
      if (Number.isFinite(v)) { zustand.cursorPm = Math.max(LAMBDA_ACHSE_MIN, Math.min(LAMBDA_ACHSE_MAX, v)); zeichne(); }
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.U === zustand.U)) {
        meldung.textContent = "Diese Spannung hast du schon gemessen — stelle eine andere ein (λ_min für verschiedene U!).";
        return;
      }
      if (!ablesungLambdaOk(eingabe, zustand.U)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Setze den Cursor genau auf die scharfe Kante, wo die Intensität von 0 hochspringt. (Auf etwa 0,5 pm genau ablesen.)";
        return;
      }
      zustand.messungen.push({ U: zustand.U, lmin: eingabe });
      zustand.messungen.sort((a, b) => a.U - b.U);
      zustand.meldungMessen = "✓ Eingetragen — 1/U rechnet das System für dich vor.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));

    // Cursor per Klick/Ziehen im Canvas setzen (nur in dieser Phase)
    let zieht = false;
    canvas.onpointerdown = ev => { zieht = true; canvas.setPointerCapture?.(ev.pointerId); cursorAusEvent(ev); };
    canvas.onpointermove = ev => { if (zieht) cursorAusEvent(ev); };
    canvas.onpointerup = () => { zieht = false; };
    canvas.style.touchAction = "none"; canvas.style.cursor = "ew-resize";
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    canvas.onpointerdown = canvas.onpointermove = canvas.onpointerup = null;
    canvas.style.cursor = "";
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} Messungen bei <em>verschiedenen</em> Spannungen — bisher: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const { m, b, punkte } = auswertung(zustand.messungen);
    const a = zustand.ausw;
    const bew = a.hOk ? bewertungH(a.hWert) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — Messen wie im Praktikum!"
      : bew.stufe === "gut" ? " Ordentlich! Mit sorgfältigerem Ablesen der Kante kommst du noch näher heran."
      : " Kein Drama: Lies die Kanten noch einmal genau ab und nutze die Regressionsgerade.") : "";
    // Mittel der Zeilen-h (zur Querprobe)
    const hZeilen = zustand.messungen.map(z => hAusZeile(z.U, z.lmin) * 1e34);
    const hZeilenMittel = mittel(hZeilen);

    const schritt2 = `
      <h3>Schritt 2: h berechnen</h3>
      <p>Aus h·c/e = m folgt <strong>h = m · 10⁻⁷ · e / c</strong> (die 10⁻⁷ verwandeln pm und 10⁻⁵ V⁻¹ in Meter und V⁻¹). Gegeben: e = 1,602·10⁻¹⁹ C, c = 2,998·10⁸ m/s.</p>
      <details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>
        <p>1) Deine Steigung m ist in pm pro (10⁻⁵ V⁻¹). In SI-Einheiten (m pro V⁻¹) ist das m·10⁻¹²/10⁻⁵ = m·10⁻⁷ V·m — das ist genau h·c/e.</p>
        <p>2) Also h = (m·10⁻⁷) · e / c = (m·10⁻⁷) · 1,602·10⁻¹⁹ / (2,998·10⁸) Js.</p>
        <p>3) Zahlenwert: h ≈ m · 0,5345 · 10⁻³⁴ Js. Trage die Zahl in <strong>10⁻³⁴ Js</strong> ein (Literaturwert liegt nahe 6,6).</p>
      </details>
      <form class="exp-ablesen" id="exp-form-h">
        <label for="exp-h">h in 10⁻³⁴ Js:</label>
        <input id="exp-h" inputmode="decimal" autocomplete="off" size="7" ${a.hOk ? "disabled" : ""} value="${a.hOk ? komma(a.hWert, 3) : ""}">
        <button class="knopf" ${a.hOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-meld-h" class="exp-meldung" aria-live="polite">${a.hOk ? "✓ h ≈ " + komma(a.hWert, 3) + "·10⁻³⁴ Js — Literaturwert 6,626·10⁻³⁴ Js, Abweichung " + komma(bew.abw, 1) + " %: " + bew.stufe + "." + ermutigung : ""}</p>`;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Aus λ_min = (h·c/e)·(1/U) wird eine <strong>Ursprungsgerade</strong>, wenn du λ_min über 1/U aufträgst. Unten siehst du deine Messpunkte mit der Regressionsgeraden.</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="460" height="330" aria-label="Diagramm: Grenzwellenlänge lambda_min in Pikometer über 1 durch U in Einheiten 10 hoch minus 5 pro Volt, mit Messpunkten, Ursprungs-Regressionsgerade und Steigungsdreieck."></canvas>
      <h3>Schritt 1: Steigung bestimmen</h3>
      <p>Lies die Steigung am eingezeichneten Steigungsdreieck ab: m = Δλ_min / Δ(1/U), in <strong>pm pro (10⁻⁵ V⁻¹)</strong>.</p>
      <details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>
        <p>Im Diagramm ist ein <strong>Steigungsdreieck</strong> eingezeichnet. Lies seine waagerechte Seite Δ(1/U) (in 10⁻⁵ V⁻¹) und seine senkrechte Seite Δλ_min (in pm) ab.</p>
        <p>Teile dann: <strong>m = Δλ_min ∕ Δ(1/U)</strong>. Weil die Gerade durch den Ursprung geht, kannst du auch eine einzelne Zeile nehmen: m = λ_min · U / 10⁵.</p>
      </details>
      <form class="exp-ablesen" id="exp-form-m">
        <label for="exp-m">m in pm/(10⁻⁵ V⁻¹):</label>
        <input id="exp-m" inputmode="decimal" autocomplete="off" size="7" ${a.mOk ? "disabled" : ""} value="${a.mOk ? komma(a.m, 3) : ""}">
        <button class="knopf" ${a.mOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-meld-m" class="exp-meldung" aria-live="polite">${a.mOk ? "✓ Steigung passt: m ≈ " + komma(a.m, 3) + " pm/(10⁻⁵ V⁻¹)." : ""}</p>
      ${a.mOk ? schritt2 : ""}
      ${a.hOk ? `
      <div class="exp-hinweis">
        <p><strong>Querprobe:</strong> Rechnest du h für jede Zeile einzeln (h = e·U·λ_min/c) und mittelst, kommt ≈ ${komma(hZeilenMittel, 3)}·10⁻³⁴ Js heraus — dieselbe Naturkonstante, unabhängig von der Geraden bestätigt.</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Du verdoppelst die Röhrenspannung U. Was passiert mit der Grenzwellenlänge λ_min?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="halb">λ_min halbiert sich</option>
          <option value="gleich">λ_min bleibt gleich</option>
          <option value="doppelt">λ_min verdoppelt sich</option>
          <option value="vierfach">λ_min vervierfacht sich</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du nimmst statt der Anode aus Wolfram eine aus Kupfer — gleiche Spannung U. Wo liegt λ_min jetzt?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">An derselben Stelle — λ_min hängt nur von U ab</option>
          <option value="kuerzer">Bei kürzeren Wellenlängen</option>
          <option value="laenger">Bei längeren Wellenlängen</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man nie exakt 6,626·10⁻³⁴?</summary>
        <p><strong>Ablesen der Kante:</strong> Die kurzwellige Grenze ist im echten Spektrum nicht messerscharf — sie ist durch das Auflösungsvermögen des Spektrometers leicht verschmiert. Liest du λ_min systematisch zu groß ab, fällt h zu groß aus. Strategie: die Kante dort ansetzen, wo die Intensität gerade über null steigt.</p>
        <p><strong>Spannungsmessung:</strong> Die tatsächliche Beschleunigungsspannung kann durch Welligkeit des Netzteils etwas unter dem angezeigten Wert liegen — dann wäre das wahre λ_min etwas größer als erwartet.</p>
        <p><strong>Geometrie/Bragg-Kalibrierung:</strong> Stimmt der Kristall-Gitterabstand oder der Nullwinkel des Spektrometers nicht exakt, ist die ganze λ-Skala leicht gestaucht oder gestreckt — ein systematischer Fehler in allen λ_min.</p>
        <p><strong>Strategie dagegen:</strong> viele Spannungen messen und die Steigung der Ausgleichsgeraden nutzen statt einer Einzelmessung — genau das hast du getan. Zufällige Ablesefehler mitteln sich so heraus.</p>
      </details>`;

    zeichneDiagramm(punkte, m, b);

    panel.querySelector("#exp-form-m").addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-m").value);
      if (steigungOk(e, m)) { a.mOk = true; a.m = e; panelAuswerten(); }
      else panel.querySelector("#exp-meld-m").textContent = "✗ Nutze das Steigungsdreieck: m = Δλ_min/Δ(1/U) (auf ±4 % genau, mit Komma oder Punkt).";
    });
    panel.querySelector("#exp-form-h")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const e = parseDezimal(panel.querySelector("#exp-h").value);
      // gegen den Wert der EINGETRAGENEN Steigung prüfen (nicht gegen den Sollwert)
      const hWahr1e34 = hAusSteigung(a.m) * 1e34;
      if (Number.isFinite(e) && Math.abs(e - hWahr1e34) <= H_TOLERANZ) { a.hOk = true; a.hWert = e; panelAuswerten(); }
      else panel.querySelector("#exp-meld-h").textContent = "✗ Prüfe die Zehnerpotenzen: h = m·10⁻⁷·e/c ≈ m·0,5345·10⁻³⁴ Js (mit deiner Steigung m).";
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "halb" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "gleich" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("roentgen-bremsspektrum-messreihe.csv",
        ["U in kV", "1/U in 10^-5 V^-1", "lambda_min in pm", "h aus Zeile in 10^-34 Js"],
        zustand.messungen.map(z => [komma(z.U / 1000, 1), xPlot(z.U), z.lmin, hAusZeile(z.U, z.lmin) * 1e34]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        U: 20000, cursorPm: 60, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        ausw: { m: NaN, mOk: false, hWert: NaN, hOk: false },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  // λ_min-1/U-Diagramm mit Ursprungs-Regressionsgerade und Steigungsdreieck
  function zeichneDiagramm(punkte, m, b) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !punkte.length || !Number.isFinite(m)) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height;
    const xMax = 7.5, yMax = 95; // 1/U bis 7,5·10⁻⁵ V⁻¹ ; λ_min bis 95 pm
    const Lr = 52, Rr = 12, T = 14, Bo = 34;
    const X = x => Lr + x / xMax * (W - Lr - Rr);
    const Y = y => T + (yMax - y) / yMax * (H - T - Bo);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    // Gitter
    c.lineWidth = 1; c.strokeStyle = cLeise; c.globalAlpha = 0.3;
    for (let y = 0; y <= yMax; y += 20) { c.beginPath(); c.moveTo(Lr, Y(y)); c.lineTo(W - Rr, Y(y)); c.stroke(); }
    for (let x = 1; x <= xMax; x++) { c.beginPath(); c.moveTo(X(x), T); c.lineTo(X(x), H - Bo); c.stroke(); }
    c.globalAlpha = 1;
    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(Lr, T); c.lineTo(Lr, H - Bo); c.lineTo(W - Rr, H - Bo); c.stroke();
    c.fillStyle = cText; c.textAlign = "start";
    c.fillText("λ_min in pm", 6, 12);
    c.textAlign = "right"; c.fillText("1/U in 10⁻⁵ V⁻¹", W - Rr, H - Bo + 26); c.textAlign = "start";
    // Achsenbeschriftung
    c.textAlign = "right";
    for (let y = 0; y <= yMax; y += 20) c.fillText(String(y), Lr - 6, Y(y) + 4);
    c.textAlign = "center";
    for (let x = 1; x <= xMax; x++) c.fillText(String(x), X(x), H - Bo + 16);
    // Ursprungs-Regressionsgerade (durch 0 erzwingen für die Darstellung wäre möglich; wir zeigen die echte Regression)
    c.strokeStyle = cText; c.lineWidth = 2;
    c.beginPath(); c.moveTo(X(0), Y(b)); c.lineTo(X(xMax), Y(m * xMax + b)); c.stroke();
    // Steigungsdreieck zwischen x = 3 und x = 6
    const x1 = 3, x2 = 6, y1 = m * x1 + b, y2 = m * x2 + b;
    c.strokeStyle = cAkzent; c.lineWidth = 1.5; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(X(x1), Y(y1)); c.lineTo(X(x2), Y(y1)); c.lineTo(X(x2), Y(y2)); c.stroke();
    c.setLineDash([]);
    c.fillStyle = cAkzent; c.textAlign = "center";
    c.fillText("Δ(1/U) = 3", X((x1 + x2) / 2), Y(y1) + 16);
    c.textAlign = "left";
    c.fillText("Δλ_min ≈ " + komma(3 * m, 1) + " pm", X(x2) + 6, Y((y1 + y2) / 2) + 4);
    c.textAlign = "start";
    // Messpunkte
    for (const p of punkte) {
      c.fillStyle = cAkzent; c.beginPath(); c.arc(X(p.x), Y(p.y), 4.5, 0, 7); c.fill();
      c.strokeStyle = cText; c.lineWidth = 1; c.stroke();
    }
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau: λ_min = h·c/(e·U) ist antiproportional zu U. Verdoppelst du U, halbiert sich λ_min — in deiner Tabelle wandert die Kante bei doppelter Spannung auf den halben pm-Wert."
      : "✗ Schau auf λ_min = h·c/(e·U): U steht im Nenner. Doppeltes U bedeutet halbes λ_min — prüfe es an zwei Zeilen deiner Tabelle (z. B. 15 kV und 30 kV).";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: In λ_min = h·c/(e·U) steht nur U — kein Materialparameter. Die kurzwellige Grenze ist für jede Anode dieselbe. (Anders die charakteristischen Linien: die hängen sehr wohl vom Anodenmaterial ab — aber das ist eine andere Geschichte.)"
      : "✗ Nicht ganz: Die Grenzwellenlänge folgt allein aus der maximalen Energie e·U eines Elektrons. Das Anodenmaterial bestimmt zwar die charakteristischen Linien, aber nicht λ_min.";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }
  wechslePhase("aufbau");
}
