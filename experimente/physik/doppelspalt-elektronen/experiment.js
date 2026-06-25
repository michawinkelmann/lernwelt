// experiment.js — Interaktives Experiment: Doppelspalt mit Elektronen (Materiewellen, QP, gA/eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Beschleunigungsspannung U selbst einstellen,
// das Interferenzmuster baut sich auf dem Schirm Treffer für Treffer auf (stochastisch),
// den Streifenabstand Δx an der mm-Skala am Schirm SELBST ablesen, Messreihe protokollieren
// und Zeile für Zeile auswerten: λ = Δx·d/L.
//
// Physik: Elektronen durchlaufen U → Impuls p = √(2·mₑ·e·U), de-Broglie-Wellenlänge λ = h/p.
// Hinter dem Doppelspalt (Spaltabstand d, intern d = 50 nm) entsteht im Abstand L (0,30 m) ein
// Streifenmuster mit Δx = λ·L/d. Weil λ ∝ 1/√U, gilt Δx ∝ 1/√U: Trägt man Δx gegen 1/√U auf,
// ergibt sich eine Ursprungsgerade mit Steigung (h·L)/(d·√(2·mₑ·e)).
//
// Die kleine Ablesestreuung ist pro U deterministisch geseedet — dadurch bleiben pruefFaelle und
// TESTS in Node analytisch prüfbar. Modulebene ist DOM-frei.

import { streuung, parseDezimal, komma, regression, esc, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Naturkonstanten & Aufbau ----------
export const M_E = 9.1093837e-31;          // kg — Elektronenmasse (CODATA)
export const E_LADUNG = 1.602176634e-19;   // C — Elementarladung
export const H_PLANCK = 6.62607015e-34;    // J·s — Planck-Konstante (intern, Sollwert!)
export const D_SPALT = 50e-9;              // m — Spaltabstand des Doppelspalts (50 nm)
export const L_ABSTAND = 0.30;             // m — Abstand Doppelspalt → Schirm
export const U_MIN = 2000, U_MAX = 10000, U_SCHRITT = 500; // V (2–10 kV in 0,5-kV-Schritten)
export const DX_STREU_SPANNE = 0.006;      // mm — Ablesestreuung auf Δx (±0,003 mm; Δx ist nur ~0,1 mm groß)
export const DX_TOLERANZ_MM = 0.004;       // akzeptierte Ablesung des Streifenabstands: ±0,004 mm
export const LAMBDA_TOLERANZ = 0.9;        // λ-Eingabe in pm: ±0,9 pm
export const H_TOLERANZ = 0.4;             // h-Eingabe in 10⁻³⁴ J·s: ±0,4
export const MIN_MESSUNGEN = 6;

// Vorfaktor der Materiewellen-Geraden Δx = C/√U  mit  C = h·L/(d·√(2·mₑ·e))
export const C_GERADE = H_PLANCK * L_ABSTAND / (D_SPALT * Math.sqrt(2 * M_E * E_LADUNG)); // m·√V

// ---------- Physik (rein, Node-testbar) ----------
// Impuls eines aus der Ruhe mit U beschleunigten Elektrons (nicht-relativistisch)
export function impuls(uVolt) {
  return Math.sqrt(2 * M_E * E_LADUNG * uVolt); // kg·m/s
}
// de-Broglie-Wellenlänge λ = h/p
export function deBroglie(uVolt) {
  return uVolt > 0 ? H_PLANCK / impuls(uVolt) : NaN; // m
}
// idealer (ungestörter) Streifenabstand Δx = λ·L/d
export function streifenabstand(uVolt, dSpalt, lAbstand) {
  return deBroglie(uVolt) * lAbstand / dSpalt; // m
}
// realer Streifenabstand am festen Aufbau inkl. reproduzierbarer Ablesestreuung (in mm geseedet)
export function streifenabstandReal(uVolt) {
  return streifenabstand(uVolt, D_SPALT, L_ABSTAND) * 1000 + streuung("dx:" + uVolt, DX_STREU_SPANNE); // mm
}
// Auswertungsformel — das rechnen die Lernenden selbst, das System prüft nur: λ = Δx·d/L
export function lambdaAusMessung(dxMeter, dSpalt, lAbstand) {
  return lAbstand > 0 ? dxMeter * dSpalt / lAbstand : NaN; // m
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungDxOk(eingabeMm, wahrDxMm) {
  return ablesungOk(eingabeMm, wahrDxMm, DX_TOLERANZ_MM);
}
export function lambdaEingabeOk(eingabePm, wahrPm) {
  return Number.isFinite(eingabePm) && Math.abs(eingabePm - wahrPm) <= LAMBDA_TOLERANZ;
}
export function hEingabeOk(eingabe1e34, wahr1e34) {
  return Number.isFinite(eingabe1e34) && Math.abs(eingabe1e34 - wahr1e34) <= H_TOLERANZ;
}
// h aus der Geradensteigung m (Δx über 1/√U): C = m, also h = C·d·√(2·mₑ·e)/L
export function hAusSteigung(mGerade) {
  return mGerade * D_SPALT * Math.sqrt(2 * M_E * E_LADUNG) / L_ABSTAND; // J·s
}
export function bewertungH(mittel1e34) {
  const ref = H_PLANCK / 1e-34;
  const abw = Math.abs(mittel1e34 - ref) / ref * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Spannungen
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.U)).size >= MIN_MESSUNGEN;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "lambda", U: 5000, soll: 1.7347e-11, tol: 5e-15 },         // m — λ bei 5 kV ≈ 17,35 pm
  { art: "dx", U: 5000, soll: 1.0408e-4, tol: 5e-8 },              // m — Δx = λ·L/d
  { art: "viertel", U2: 8000, U1: 2000, faktor: 0.5, tol: 1e-12 }, // U vervierfachen → Δx halbiert
  { art: "rueck", U: 6000, tol: 1e-15 }                            // Δx → λ zurückrechnen ergibt λ(U)
];

export const TESTS = [
  { name: "Vorfaktor C exakt: C = h·L/(d·√(2·mₑ·e)) reproduzierbar",
    ok: () => C_GERADE === H_PLANCK * L_ABSTAND / (D_SPALT * Math.sqrt(2 * M_E * E_LADUNG))
      && Math.abs(C_GERADE - 0.0073595) < 1e-6 },
  { name: "Kontrollwert λ: U = 5 kV → λ ≈ 17,35 pm (1,7347·10⁻¹¹ m, ±5·10⁻¹⁵)",
    ok: () => Math.abs(deBroglie(5000) - 1.7347e-11) <= 5e-15 },
  { name: "Kontrollwert Δx: U = 5 kV, d = 50 nm, L = 0,30 m → Δx ≈ 0,104 mm (±5·10⁻⁸ m)",
    ok: () => Math.abs(streifenabstand(5000, D_SPALT, L_ABSTAND) - 1.0408e-4) <= 5e-8 },
  { name: "λ ∝ 1/√U: U vervierfachen → λ exakt halbiert",
    ok: () => Math.abs(deBroglie(8000) - 0.5 * deBroglie(2000)) <= 1e-23
      && Math.abs(deBroglie(10000) - 0.5 * deBroglie(2500)) <= 1e-23 },
  { name: "Δx ∝ 1/√U: U vervierfachen (2 → 8 kV) → Δx exakt halbiert",
    ok: () => { const a = streifenabstand(2000, D_SPALT, L_ABSTAND);
      const b = streifenabstand(8000, D_SPALT, L_ABSTAND);
      return Math.abs(b - 0.5 * a) <= 1e-12; } },
  { name: "Rückrechnung exakt: λ = Δx·d/L invertiert Δx = λ·L/d für alle U",
    ok: () => [2000, 3500, 5000, 7000, 10000].every(u => {
      const dx = streifenabstand(u, D_SPALT, L_ABSTAND);
      return Math.abs(lambdaAusMessung(dx, D_SPALT, L_ABSTAND) - deBroglie(u)) <= 1e-16; }) },
  { name: "Geraden-Pipeline: ideale (1/√U, Δx)-Punkte → Steigung C → h zurück (±10⁻³⁷)",
    ok: () => { const pkt = [2000, 4000, 6000, 8000, 10000].map(u =>
        ({ x: 1 / Math.sqrt(u), y: streifenabstand(u, D_SPALT, L_ABSTAND) }));
      const m = regression(pkt).m;
      return Math.abs(m - C_GERADE) <= 1e-9 && Math.abs(hAusSteigung(m) - H_PLANCK) <= 1e-37; } },
  { name: "Streugrenzen ±0,003 mm über das ganze U-Raster + klarer Abfalltrend + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let u = U_MIN; u <= U_MAX; u += U_SCHRITT) {
        const abw = Math.abs(streifenabstandReal(u) - streifenabstand(u, D_SPALT, L_ABSTAND) * 1000);
        if (abw > DX_STREU_SPANNE / 2 + 1e-12) return false;   // bleibt in der Streubreite
        if (abw > 1e-9) irgendStreu = true;
      }
      // Trend: kleines U → großes Δx, großes U → kleines Δx (Punkt-Rauschen darf lokal überlappen)
      const trend = streifenabstandReal(U_MIN) - streifenabstandReal(U_MAX) > 0.05;
      return irgendStreu && trend && streifenabstandReal(5000) === streifenabstandReal(5000)
        && streifenabstandReal(5000) !== streifenabstandReal(5500); } },
  { name: "Ablese-/Eingabe-Toleranzen: Δx ±0,004 mm, λ ±0,9 pm, h ±0,4·10⁻³⁴",
    ok: () => ablesungDxOk(0.104, 0.104) && ablesungDxOk(0.107, 0.104) && !ablesungDxOk(0.11, 0.104)
      && !ablesungDxOk(NaN, 0.104)
      && lambdaEingabeOk(17.3, 17.35) && !lambdaEingabeOk(18.3, 17.35) && !lambdaEingabeOk(NaN, 17.35)
      && hEingabeOk(6.6, 6.626) && !hEingabeOk(7.1, 6.626) && !hEingabeOk(NaN, 6.626) },
  { name: "h aus Steigung: ideale Steigung C → h = 6,626·10⁻³⁴ J·s, Eingabe ±0,4",
    ok: () => { const h34 = hAusSteigung(C_GERADE) / 1e-34;
      return Math.abs(hAusSteigung(C_GERADE) - H_PLANCK) <= 1e-40
        && hEingabeOk(6.5, h34) && hEingabeOk(6.9, h34)
        && !hEingabeOk(7.05, h34) && !hEingabeOk(6.2, h34); } },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("0,104") === 0.104 && parseDezimal("0.104") === 0.104 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig erst mit ≥ 6 verschiedenen Spannungen",
    ok: () => { const z = U => ({ U });
      const zuWenig = [2000, 3000, 4000, 5000, 6000].map(z);
      const doppelt = [2000, 2000, 3000, 4000, 5000, 6000].map(z);
      const gut = [2000, 3000, 4000, 5500, 7000, 9000].map(z);
      return !messreiheVollstaendig(zuWenig) && !messreiheVollstaendig(doppelt)
        && messreiheVollstaendig(gut); } },
  { name: "Bewertung: 6,626 → sehr gut · 6,4 → gut · 5,9 → nochmal prüfen",
    ok: () => bewertungH(6.626).stufe === "sehr gut" && bewertungH(6.4).stufe === "gut"
      && bewertungH(5.9).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "lambda") return Math.abs(deBroglie(p.U) - p.soll) <= p.tol;
      if (p.art === "dx") return Math.abs(streifenabstand(p.U, D_SPALT, L_ABSTAND) - p.soll) <= p.tol;
      if (p.art === "viertel") return Math.abs(streifenabstand(p.U2, D_SPALT, L_ABSTAND)
        - p.faktor * streifenabstand(p.U1, D_SPALT, L_ABSTAND)) <= p.tol;
      const dx = streifenabstand(p.U, D_SPALT, L_ABSTAND);
      return Math.abs(lambdaAusMessung(dx, D_SPALT, L_ABSTAND) - deBroglie(p.U)) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Aufsicht: Kanone → Doppelspalt → Schirm) ----------
  const W = 360, H = 460;
  const SPALT_X = 96;          // x des Doppelspalts
  const SCHIRM_X = 312;        // x des Leuchtschirms
  const ACHSE_Y = 150;         // optische Achse (Mitte des Strahlengangs)
  const SKALA_OBEN = 250, SKALA_UNTEN = 446; // mm-Skala am Schirm (vertikal)
  const SCHIRM_MITTE = (SKALA_OBEN + SKALA_UNTEN) / 2;
  const PX_PRO_MM = 150;       // Maßstab am Schirm: 1 mm Streifenabstand ≙ 150 px (Δx ist klein!)

  const zustand = {
    phase: "aufbau",
    U: 5000,
    vorhersage: "",                 // "groesser" | "kleiner" | "gleich"
    treffer: [],                    // Trefferpositionen (mm, relativ zur Mitte) der aktuellen Spannung
    animLaeuft: false, animId: 0,
    messungen: [],                  // {U, dxMm, lambdaEingabe, lambdaOk}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    hBestaetigt: null,              // {eingabe, wahr} nach eA-Erfolg
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
        <canvas id="exp-canvas" width="${W}" height="${H}" aria-label="Aufsicht des Doppelspalt-Versuchs mit Elektronen: links die Elektronenkanone, in der Mitte der Doppelspalt, rechts der Leuchtschirm mit senkrechter Millimeterskala. In der Durchführung treffen einzelne Elektronen scheinbar zufällig auf den Schirm und bauen nach und nach ein Streifenmuster auf; der Abstand benachbarter heller Streifen ist der Streifenabstand. Unten eine Anzeige der Beschleunigungsspannung."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const lambdaWahrPm = z => lambdaAusMessung(z.dxMm / 1000, D_SPALT, L_ABSTAND) / 1e-12;

  // ---------- Intensität: I(y) ∝ cos²(π·y/Δx) (Doppelspalt-Idealmuster) ----------
  function intensitaet(yMm, dxMm) {
    const c = Math.cos(Math.PI * yMm / dxMm);
    return c * c;
  }
  // ein zufälliger Treffer, verteilt nach der Intensität (Verwerfungsmethode, deterministisch geseedet)
  let trefferZaehler = 0;
  function zieheTreffer(dxMm) {
    const yMax = 2.4 * dxMm; // sichtbarer Bereich um die Mitte (mehrere Streifen)
    for (let k = 0; k < 60; k++) {
      const r1 = streuung("ty:" + zustand.U + ":" + trefferZaehler + ":" + k, 1) + 0.5; // 0..1
      const r2 = streuung("ti:" + zustand.U + ":" + trefferZaehler + ":" + k, 1) + 0.5; // 0..1
      const y = (r1 - 0.5) * 2 * yMax;
      if (r2 <= intensitaet(y, dxMm)) { trefferZaehler++; return y; }
    }
    trefferZaehler++;
    return (streuung("tf:" + zustand.U + ":" + trefferZaehler, 1)) * 2 * yMax;
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, W, H);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    const dxWahr = zustand.phase === "aufbau" ? streifenabstand(zustand.U, D_SPALT, L_ABSTAND) * 1000
                                              : streifenabstandReal(zustand.U); // mm

    // Strahlengang Kanone → Spalt (gestrichelt)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(40, ACHSE_Y); ctx.lineTo(SPALT_X, ACHSE_Y); ctx.stroke();
    ctx.setLineDash([]);

    // Elektronenkanone
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(16, ACHSE_Y - 18, 44, 36, 5); else ctx.rect(16, ACHSE_Y - 18, 44, 36);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.fillRect(58, ACHSE_Y - 4, 8, 8);
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Elektronen-", 38, ACHSE_Y - 26); ctx.fillText("kanone", 38, ACHSE_Y - 13);

    // Doppelspalt (Blende mit zwei Lücken)
    ctx.fillStyle = cText;
    ctx.fillRect(SPALT_X - 3, ACHSE_Y - 40, 6, 32);
    ctx.fillRect(SPALT_X - 3, ACHSE_Y - 6, 6, 12);
    ctx.fillRect(SPALT_X - 3, ACHSE_Y + 8, 6, 32);
    ctx.fillStyle = cLeise; ctx.fillText("Doppelspalt", SPALT_X, ACHSE_Y - 48);
    ctx.fillText("d = 50 nm", SPALT_X, ACHSE_Y + 58);

    // aufgefächerte Wellen Spalt → Schirm (dezent)
    if (zustand.phase !== "aufbau") {
      ctx.strokeStyle = cAkzent; ctx.globalAlpha = 0.12; ctx.lineWidth = 1;
      for (let s = -2; s <= 2; s++) {
        ctx.beginPath(); ctx.moveTo(SPALT_X + 3, ACHSE_Y);
        ctx.lineTo(SCHIRM_X - 4, SCHIRM_MITTE + s * dxWahr * PX_PRO_MM); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Schirm
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(SCHIRM_X, SKALA_OBEN - 8, 14, SKALA_UNTEN - SKALA_OBEN + 16);
    ctx.strokeRect(SCHIRM_X, SKALA_OBEN - 8, 14, SKALA_UNTEN - SKALA_OBEN + 16);
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Leuchtschirm", SCHIRM_X + 7, SKALA_OBEN - 16);

    // Treffer (einzelne Elektronen) als Punkte auf dem Schirm
    if (zustand.phase !== "aufbau") {
      ctx.fillStyle = cAkzent;
      for (const yMm of zustand.treffer) {
        const py = SCHIRM_MITTE + yMm * PX_PRO_MM;
        if (py < SKALA_OBEN - 6 || py > SKALA_UNTEN + 6) continue;
        ctx.globalAlpha = 0.7;
        ctx.beginPath(); ctx.arc(SCHIRM_X + 4 + streuung("tx:" + yMm, 6), py, 1.4, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // mm-Skala rechts neben dem Schirm (Nullpunkt in der Mitte)
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    const skalaX = SCHIRM_X + 18;
    ctx.beginPath(); ctx.moveTo(skalaX, SKALA_OBEN); ctx.lineTo(skalaX, SKALA_UNTEN); ctx.stroke();
    const halbMm = (SCHIRM_MITTE - SKALA_OBEN) / PX_PRO_MM;
    for (let n = -Math.floor(halbMm / 0.05); n <= Math.floor(halbMm / 0.05); n++) {
      const mm = n * 0.05, y = SCHIRM_MITTE + mm * PX_PRO_MM, gross = n % 2 === 0;
      ctx.strokeStyle = gross ? cText : cLeise; ctx.lineWidth = gross ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(skalaX, y); ctx.lineTo(skalaX + (gross ? 11 : 6), y); ctx.stroke();
      if (gross) { ctx.fillStyle = cText; ctx.textAlign = "start";
        ctx.fillText(komma(mm, 1) + (n === 0 ? " mm" : ""), skalaX + 14, y + 4); }
    }

    // Spannungsanzeige oben links
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(16, 20, 180, 44, 6); else ctx.rect(16, 20, 180, 44);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center"; ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Beschleunigungsspannung", 106, 37);
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("U = " + komma(zustand.U / 1000, 1) + " kV", 106, 56);
    ctx.font = "12px system-ui, sans-serif";

    // Hinweis im Aufbau
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(SCHIRM_X - 150, SCHIRM_MITTE - 30, 150, 60);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Kanone aus —", SCHIRM_X - 75, SCHIRM_MITTE - 8);
      ctx.fillText("das Muster baut sich in", SCHIRM_X - 75, SCHIRM_MITTE + 8);
      ctx.fillText("der Durchführung auf", SCHIRM_X - 75, SCHIRM_MITTE + 24);
    }
    ctx.textAlign = "start";
  }

  // ---------- Treffer-Aufbau (stochastisch, ein Wesenszug der QM) ----------
  function stoppeAnim() {
    zustand.animLaeuft = false;
    if (zustand.animId) cancelAnimationFrame(zustand.animId);
    zustand.animId = 0;
  }
  function baueMusterAuf() {
    stoppeAnim();
    trefferZaehler = 0;
    zustand.treffer = [];
    const dxWahr = streifenabstandReal(zustand.U); // mm
    const ZIEL = 900;
    if (reduzierteBewegung()) { // ohne Bewegung: Muster sofort vollständig zeigen
      for (let k = 0; k < ZIEL; k++) zustand.treffer.push(zieheTreffer(dxWahr));
      zeichne(); return;
    }
    zustand.animLaeuft = true;
    const schritt = () => {
      if (!zustand.animLaeuft) return;
      for (let k = 0; k < 22; k++) zustand.treffer.push(zieheTreffer(dxWahr));
      zeichne();
      if (zustand.treffer.length < ZIEL) zustand.animId = requestAnimationFrame(schritt);
      else zustand.animLaeuft = false;
    };
    zustand.animId = requestAnimationFrame(schritt);
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    stoppeAnim();
    panel.innerHTML = `
      <h2>Aufbau und Idee</h2>
      <p>Eine <strong>Elektronenkanone</strong> beschleunigt Elektronen mit der Spannung <strong>U</strong> und schickt sie auf einen <strong>Doppelspalt</strong> (Spaltabstand d = 50 nm). Im Abstand <strong>L = 0,30 m</strong> dahinter steht ein <strong>Leuchtschirm</strong>. Das Verblüffende: Auf dem Schirm erscheint kein einzelner Fleck hinter jedem Spalt, sondern ein <strong>Streifenmuster</strong> wie bei Wellen — obwohl Elektronen einzeln und scheinbar zufällig auftreffen.</p>
      <p><strong>Materiewellen:</strong> Nach de Broglie gehört zu einem Teilchen mit Impuls p eine Wellenlänge λ = h/p. Aus der Beschleunigung folgt e·U = p²/(2·mₑ), also p = √(2·mₑ·e·U) und damit <strong>λ = h / √(2·mₑ·e·U)</strong>. Hinter dem Doppelspalt liegt der Streifenabstand bei <strong>Δx = λ·L/d</strong>.</p>
      <p><strong>Idee der Messung:</strong> d und L sind bekannt, λ ist winzig. Du liest für mindestens ${MIN_MESSUNGEN} verschiedene Spannungen den Streifenabstand Δx an der mm-Skala ab und berechnest λ = Δx·d/L. Weil λ ∝ 1/√U, ist auch <strong>Δx ∝ 1/√U</strong> — das prüfst du in der Auswertung mit einer Geraden.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich U <strong>erhöhe</strong>, wird der Streifenabstand Δx …</label>
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
      if (!zustand.vorhersage) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst deine Vorhersage aus — gleich prüfst du sie selbst.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortAus = wahl => wahl === "groesser" ? "größer" : wahl === "kleiner" ? "kleiner" : "(fast) gleich";

  function beobachtungHtml() {
    const us = new Set(zustand.messungen.map(z => z.U)).size;
    let html = `<p>Deine Vorhersage: U erhöhen → Δx <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus und beobachte das Muster!</p>`;
    if (us >= 2) {
      const ok = zustand.vorhersage === "kleiner";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>U rauf → Streifen rücken enger zusammen</strong> (schnellere Elektronen, kleineres λ, also kleineres Δx; Δx ∝ 1/√U). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
    }
    return html;
  }

  function panelMessen() {
    if (!zustand.vorhersage) {
      stoppeAnim();
      panel.innerHTML = `
        <h2>Durchführung</h2>
        <p>Halte zuerst deine <strong>Vorhersage</strong> fest (Phase 1 · Aufbau) — erst vorhersagen, dann messen!</p>
        <button class="knopf" id="exp-zurueck0">Zum Aufbau</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("aufbau"));
      return;
    }
    const usAnz = new Set(zustand.messungen.map(z => z.U)).size;
    const fortschritt = `${usAnz} von mindestens ${MIN_MESSUNGEN} verschiedenen Spannungen gemessen.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-u">Beschleunigungsspannung: U = <strong id="exp-u-wert">${komma(zustand.U / 1000, 1)} kV</strong></label>
        <input type="range" id="exp-u" min="${U_MIN}" max="${U_MAX}" step="${U_SCHRITT}" value="${zustand.U}" aria-label="Beschleunigungsspannung in Volt">
      </div>
      <div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-belichten">Muster aufbauen (Schirm belichten)</button></div>
      <p class="exp-meldung">Der Schirm sammelt einzelne Treffer — erst körnig, dann werden Streifen sichtbar. <em>Jedes Elektron trifft einzeln; das Muster ist Wahrscheinlichkeit.</em></p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies an der mm-Skala den <strong>Streifenabstand Δx</strong> ab (Abstand benachbarter heller Streifen, in mm):</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <details class="exp-fehler"><summary>Tipp: Wie lese ich Δx genau ab?</summary>
        <p>Ein einzelner Streifenabstand ist klein. Genauer wird es, wenn du den Abstand über <strong>mehrere</strong> Streifen ausmisst und dann teilst — z. B. den Abstand von 4 hellen Streifen bestimmen und durch 4 teilen. Die mm-Skala hat Striche im Abstand 0,05 mm.</p>
      </details>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>U in kV</th><th>1/√U in 1/√V</th><th>Δx in mm</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${komma(z.U / 1000, 1)}</td><td>${komma(1 / Math.sqrt(z.U), 4)}</td><td>${komma(z.dxMm, 3)}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const uRegler = panel.querySelector("#exp-u");
    uRegler.addEventListener("input", () => {
      zustand.U = Math.round(Number(uRegler.value) / U_SCHRITT) * U_SCHRITT; // exakt auf Schritt — deterministischer Streu-Schlüssel
      panel.querySelector("#exp-u-wert").textContent = komma(zustand.U / 1000, 1) + " kV";
      zustand.treffer = []; stoppeAnim();
      zeichne();
    });
    panel.querySelector("#exp-belichten").addEventListener("click", baueMusterAuf);
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.U === zustand.U)) {
        meldung.textContent = "Diese Spannung hast du schon gemessen — stelle eine andere ein.";
        return;
      }
      const wahrDx = streifenabstandReal(zustand.U); // mm
      if (!ablesungDxOk(eingabe, wahrDx)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wie groß ist der Abstand benachbarter heller Streifen? (Tipp: über mehrere Streifen messen und teilen — auf wenige Tausendstel Millimeter genau.)";
        return;
      }
      zustand.messungen.push({ U: zustand.U, dxMm: eingabe, lambdaEingabe: null, lambdaOk: null });
      zustand.meldungMessen = "✓ Eingetragen: U = " + komma(zustand.U / 1000, 1) + " kV, Δx = " + komma(eingabe, 3) + " mm. Stelle die nächste Spannung ein.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    if (zustand.treffer.length === 0 && !reduzierteBewegung()) baueMusterAuf();
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    stoppeAnim();
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Spannungen — bisher: ${new Set(zustand.messungen.map(z => z.U)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.messungen.every(z => z.lambdaOk === true);
    // Regression Δx (in m) über 1/√U → Steigung = C, daraus h
    const punkte = zustand.messungen.map(z => ({ x: 1 / Math.sqrt(z.U), y: z.dxMm / 1000 }));
    const reg = regression(punkte);
    const hAusReg34 = hAusSteigung(reg.m) / 1e-34;
    const bew = fertig ? bewertungH(hAusReg34) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — Quantenmechanik mit dem Lineal nachgemessen!"
      : bew.stufe === "gut" ? " Ordentlich! Mit Ablesungen über mehrere Streifen kommst du noch näher heran."
      : " Kein Drama: Lies Δx über mehrere Streifen ab und miss ein paar weitere Spannungen — dann liegt die Gerade sauberer.") : "";
    const hB = zustand.hBestaetigt;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p><strong>Schritt 1 (gA):</strong> Berechne für jede Zeile die de-Broglie-Wellenlänge <strong>λ = Δx·d/L</strong> und trage sie in <strong>Pikometer (pm = 10⁻¹² m)</strong> ein — z. B. 17,3.</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für eine Zeile</summary>
        <p>1) Δx in <strong>Meter</strong>: 0,104 mm = 1,04·10⁻⁴ m. 2) d = 50 nm = 5·10⁻⁸ m, L = 0,30 m. 3) λ = Δx·d/L ausrechnen — eine winzige Zahl um 1,7·10⁻¹¹ m. 4) In pm: mit 10¹² multiplizieren und mit einer Nachkommastelle eintragen (≈ 17,3).</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>U in kV</th><th>Δx in mm</th><th>λ in pm</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${komma(z.U / 1000, 1)}</td><td>${komma(z.dxMm, 3)}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.lambdaEingabe == null ? "" : komma(z.lambdaEingabe, 1)}" aria-label="Dein λ für Zeile ${i + 1} in Pikometer"></td>
          <td>${z.lambdaOk === true ? "✓" : z.lambdaOk === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Zeilen prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <div class="exp-hinweis">
        <p><strong>Schritt 2: Δx gegen 1/√U auftragen.</strong> Weil λ ∝ 1/√U gilt auch Δx = C · (1/√U) — eine <strong>Ursprungsgerade</strong>. Hier dein Diagramm aus den ${zustand.messungen.length} Messpunkten:</p>
        <canvas id="exp-diag" class="exp-diagramm" width="340" height="240" aria-label="Diagramm: Streifenabstand Δx über 1 durch Wurzel U. Die Messpunkte liegen auf einer Ursprungsgeraden."></canvas>
      </div>
      <h3>eA: Aus der Geraden zur Planck-Konstante</h3>
      <p>Die Steigung der Geraden ist C = h·L / (d·√(2·mₑ·e)). Nach h umgestellt: <strong>h = C · d · √(2·mₑ·e) / L</strong>. Das System hat die Ausgleichsgerade durch deine Punkte gelegt — ihre Steigung beträgt <strong>C ≈ ${komma(reg.m * 1000, 4)} mm·√V</strong>. Rechne daraus h und gib es in <strong>10⁻³⁴ J·s</strong> an.</p>
      <details class="exp-fehler"><summary>Hilfe: h aus C berechnen</summary>
        <p>mₑ = 9,109·10⁻³¹ kg, e = 1,602·10⁻¹⁹ C, also √(2·mₑ·e) ≈ 5,40·10⁻²⁵. Mit d = 5·10⁻⁸ m und L = 0,30 m: h = C · d · √(2·mₑ·e) / L. Achtung: C in <strong>SI</strong> einsetzen (m·√V, nicht mm·√V). Ergebnis um 6,6·10⁻³⁴ J·s.</p>
      </details>
      <form id="exp-h-form" class="exp-ablesen">
        <label for="exp-h">h in 10⁻³⁴ J·s:</label>
        <input id="exp-h" inputmode="decimal" autocomplete="off" size="7" value="${hB ? komma(hB.eingabe, 2) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-h-meldung" class="exp-meldung" aria-live="polite"></p>
      ${hB ? `
      <div class="exp-hinweis">
        <p><strong>h ≈ ${komma(hB.eingabe, 2)} · 10⁻³⁴ J·s</strong> — Literaturwert 6,626 · 10⁻³⁴ J·s (Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>).${ermutigung} Aus dem Streifenmuster von Elektronen die Planck-Konstante zu gewinnen — das ist ein Kernbefund der Quantenphysik.</p>
      </div>` : ""}` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Du schickst die Elektronen <strong>einzeln nacheinander</strong> los — eines pro Sekunde. Was passiert auf dem Schirm?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="zwei">Hinter jedem Spalt sammelt sich ein Fleck, also zwei Flecken</option>
          <option value="muster">Jeder einzelne Treffer ist ein Punkt; nach vielen Treffern entsteht trotzdem das Streifenmuster</option>
          <option value="nichts">Einzelne Elektronen können nicht interferieren, es bleibt gleichmäßig grau</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Es gilt Δx ∝ 1/√U. Du <strong>vervierfachst</strong> die Spannung U — was macht der Streifenabstand Δx?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">Δx bleibt gleich</option>
          <option value="halb">Δx halbiert sich</option>
          <option value="viertel">Δx wird ein Viertel</option>
          <option value="doppelt">Δx verdoppelt sich</option>
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
        <p><strong>Ablesen des Streifenabstands:</strong> Δx ist nur einige Zehntel Millimeter groß. Schon ein kleiner Ablesefehler verschiebt λ und damit h spürbar. Deshalb über <strong>mehrere</strong> Streifen messen und teilen — der relative Fehler sinkt.</p>
        <p><strong>Endliche Streifenschärfe:</strong> Reale Streifen sind nicht hauchdünn, sondern von der Einhüllenden (Beugung am Einzelspalt) und der Strahlbreite verschmiert. Die Mitte eines hellen Streifens ist dadurch nicht punktgenau festzulegen.</p>
        <p><strong>Relativistik bei hohem U:</strong> p = √(2·mₑ·e·U) gilt nur nicht-relativistisch. Bei U = 10 kV erreichen Elektronen schon rund 20 % der Lichtgeschwindigkeit — die einfache Formel unterschätzt p geringfügig, λ kommt etwas zu groß heraus.</p>
        <p><strong>Modellgrenze des Doppelspalts:</strong> Das ideale Δx = λ·L/d gilt für kleine Winkel und einen scharf definierten Spaltabstand d. Justage und Spaltbreite wirken zusätzlich.</p>
        <p><strong>Strategie dagegen:</strong> viele Spannungen messen, Δx über mehrere Streifen ablesen und die Gerade durch alle Punkte legen (mitteln) — genau das hast du getan.</p>
      </details>`;

    // Diagramm zeichnen (Δx über 1/√U)
    if (fertig) zeichneDiagramm(punkte, reg);

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.lambdaEingabe = null; z.lambdaOk = null; return; }
        z.lambdaEingabe = wert;
        z.lambdaOk = lambdaEingabeOk(wert, lambdaWahrPm(z));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (Dezimalzahl, z. B. 17,3).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.lambdaOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle Zeilen bestätigt — unten wartet dein Diagramm und der eA-Schritt."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±0,9 pm). Häufigste Stolperfalle: Δx in Meter (mm ÷ 1000), d = 5·10⁻⁸ m, dann λ = Δx·d/L und mit 10¹² in pm umrechnen.";
      if (falsch > 0) zustand.hBestaetigt = null;
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "muster" };
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
    panel.querySelector("#exp-h-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-h").value);
      if (!hEingabeOk(eingabe, hAusReg34)) {
        panel.querySelector("#exp-h-meldung").textContent = "✗ Das passt noch nicht (±0,4). Rechne h = C · d · √(2·mₑ·e) / L mit C in SI (m·√V!), d = 5·10⁻⁸ m, L = 0,30 m und gib das Ergebnis in 10⁻³⁴ J·s an.";
        return;
      }
      zustand.hBestaetigt = { eingabe, wahr: hAusReg34 };
      panelAuswerten();
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("doppelspalt-elektronen-messreihe.csv",
        ["U in V", "1/sqrt(U) in 1/sqrt(V)", "Delta x in mm", "lambda in pm"],
        zustand.messungen.map(z => [String(z.U), 1 / Math.sqrt(z.U), z.dxMm,
          z.lambdaEingabe == null ? "" : z.lambdaEingabe]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        U: 5000, vorhersage: "", treffer: [], messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        hBestaetigt: null, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  // kleines Auswertungsdiagramm: Messpunkte + Ausgleichsgerade
  function zeichneDiagramm(punkte, reg) {
    const c = panel.querySelector("#exp-diag");
    if (!c) return;
    const g = c.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const PL = 52, PR = 12, PT = 12, PB = 34;
    const bw = c.width - PL - PR, bh = c.height - PT - PB;
    const xMax = Math.max(...punkte.map(p => p.x)) * 1.08;
    const yMax = Math.max(...punkte.map(p => p.y)) * 1.12;
    const X = x => PL + x / xMax * bw;
    const Y = y => PT + bh - y / yMax * bh;
    g.clearRect(0, 0, c.width, c.height);
    g.font = "11px system-ui, sans-serif";
    // Achsen
    g.strokeStyle = cText; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(PL, PT); g.lineTo(PL, PT + bh); g.lineTo(PL + bw, PT + bh); g.stroke();
    g.fillStyle = cLeise; g.textAlign = "center";
    g.fillText("1/√U  in  1/√V", PL + bw / 2, c.height - 6);
    g.save(); g.translate(13, PT + bh / 2); g.rotate(-Math.PI / 2);
    g.fillText("Δx  in  mm", 0, 0); g.restore();
    // Ausgleichsgerade y = m·x + b
    g.strokeStyle = cAkzent; g.lineWidth = 2;
    g.beginPath(); g.moveTo(X(0), Y(reg.b)); g.lineTo(X(xMax), Y(reg.m * xMax + reg.b)); g.stroke();
    // y-Tick-Beschriftung (in mm)
    g.fillStyle = cLeise; g.textAlign = "end";
    for (let t = 0; t <= 4; t++) { const yv = yMax * t / 4;
      g.fillText(komma(yv * 1000, 2), PL - 6, Y(yv) + 4); }
    // Messpunkte
    g.fillStyle = cText;
    for (const p of punkte) { g.beginPath(); g.arc(X(p.x), Y(p.y), 3.2, 0, 7); g.fill(); }
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Jedes Elektron trifft als einzelner Punkt auf — scheinbar zufällig. Erst nach vielen tausend Treffern zeichnet sich das Streifenmuster ab. Die Welle beschreibt nicht ein einzelnes Elektron, sondern die Wahrscheinlichkeit, wo es auftrifft. Das ist der Kern der Quantenphysik."
      : "✗ Nicht ganz: Im Versuch entstehen wirklich Streifen, keine zwei Flecken — und einzelne Elektronen interferieren mit sich selbst. Beobachte den Aufbau noch einmal: erst einzelne Punkte, dann ein Muster.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: Δx ∝ 1/√U, und 1/√4 = 1/2 — der Streifenabstand halbiert sich. Kontrolle in deiner Tabelle: von 2 kV auf 8 kV rückt das Muster auf die Hälfte zusammen."
      : "✗ Schau auf Δx = C/√U: U vervierfachen heißt √U verdoppeln, also Δx halbieren. Prüfe es an deiner Tabelle (z. B. 2 kV gegen 8 kV).";
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
