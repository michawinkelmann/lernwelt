// experiment.js — Interaktives Experiment: Charakteristisches Röntgenspektrum / Moseley-Gesetz (QP, eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Anodenmaterial (Ordnungszahl Z) selbst wählen,
// die Lage der Kα-Linie an der Wellenlängen-Skala des Spektrometers SELBST ablesen,
// Messreihe protokollieren und √f gegen Z auftragen — die Moseley-Gerade liefert √(3/4·R·c)
// als Steigung und damit (eA) die Abschirmung Z−1 bzw. die Rydbergkonstante.
// Die wahre Kα-Wellenlänge rechnet das System aus dem Moseley-Gesetz vor, die kleine
// Ablesestreuung ist pro Element deterministisch geseedet — dadurch bleiben pruefFaelle
// und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, regression, esc, farbe, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Naturkonstanten ----------
export const R_INF = 1.0973731568e7;       // 1/m — Rydbergkonstante
export const C_LICHT = 2.99792458e8;        // m/s
export const R_FREQ = R_INF * C_LICHT;      // 1/s — Rydbergfrequenz ≈ 3,2898·10¹⁵ Hz
// Moseley-Kα: √f = a·(Z − 1) mit a = √(3/4 · R_freq)
export const A_MOSELEY = Math.sqrt(0.75 * R_FREQ);   // √Hz/—  ≈ 4,9665·10⁷
export const ABSCHIRMUNG = 1;               // σ ≈ 1 für die Kα-Linie (eine verbleibende Kernladung im 1s)

// ---------- Anodenmaterialien (Ordnungszahl Z) ----------
export const ELEMENTE = [
  { sym: "Ca", name: "Calcium",  Z: 20 },
  { sym: "Ti", name: "Titan",    Z: 22 },
  { sym: "Fe", name: "Eisen",    Z: 26 },
  { sym: "Cu", name: "Kupfer",   Z: 29 },
  { sym: "Zn", name: "Zink",     Z: 30 },
  { sym: "Mo", name: "Molybdän", Z: 42 }
];

// ---------- Mess- und Toleranzparameter ----------
export const LAMBDA_STREU_REL = 0.012;      // relative Ablese-/Justagestreuung der Skala (±0,6 %)
export const LAMBDA_TOL_REL = 0.02;         // akzeptierte Ablesung der Wellenlänge: ±2 %
export const SQRTF_TOL_REL = 0.03;          // akzeptierte √f-Rechnung je Zeile: ±3 %
export const A_TOL_REL = 0.06;              // Toleranz für die Steigung a (±6 %)
export const MIN_MESSUNGEN = 5;             // mindestens 5 verschiedene Elemente

// ---------- Physik (rein, Node-testbar) ----------
// Kα-Frequenz nach Moseley: f = (3/4)·R_freq·(Z − σ)²
export function frequenzKalpha(Z) {
  return 0.75 * R_FREQ * (Z - ABSCHIRMUNG) * (Z - ABSCHIRMUNG); // Hz
}
// Kα-Wellenlänge: λ = c/f  (entspricht 1/λ = R·(3/4)·(Z−1)²)
export function wellenlaengeKalpha(Z) {
  return C_LICHT / frequenzKalpha(Z); // m
}
// √f als lineare Größe in Z (Moseley-Geradenwert)
export function sqrtF(Z) {
  return Math.sqrt(frequenzKalpha(Z)); // √Hz
}
// wahre, abgelesene Wellenlänge inkl. reproduzierbarer Streuung (Justage, Ablesung)
export function wellenlaengeReal(Z) {
  return wellenlaengeKalpha(Z) * (1 + streuung("lambda:" + Z, LAMBDA_STREU_REL)); // m
}
// Frequenz aus selbst abgelesener Wellenlänge (so rechnen die Lernenden)
export function frequenzReal(Z) {
  return C_LICHT / wellenlaengeReal(Z); // Hz
}
// Ordnungszahl aus einer Wellenlänge zurückrechnen (für die Identifikations-Erkenntnisfrage)
export function ordnungszahlAusLambda(lambdaMeter) {
  if (!(lambdaMeter > 0)) return NaN;
  const f = C_LICHT / lambdaMeter;
  return Math.sqrt(f / (0.75 * R_FREQ)) + ABSCHIRMUNG;
}

// ---------- Eingabe-Prüfungen ----------
// Ablesung der Wellenlänge in pm (Picometer), relativ tolerant
export function ablesungLambdaOk(eingabePm, wahrLambdaMeter) {
  return ablesungOk(eingabePm, wahrLambdaMeter * 1e12, wahrLambdaMeter * 1e12 * LAMBDA_TOL_REL);
}
// √f-Rechnung je Zeile, Eingabe in 10⁸ √Hz
export function sqrtFEingabeOk(eingabe1e8, wahr1e8) {
  return Number.isFinite(eingabe1e8) && Math.abs(eingabe1e8 - wahr1e8) <= Math.abs(wahr1e8) * SQRTF_TOL_REL;
}
// Steigung a aus der Regression, Eingabe in 10⁷ √Hz
export function aEingabeOk(eingabe1e7, wahr1e7) {
  return Number.isFinite(eingabe1e7) && Math.abs(eingabe1e7 - wahr1e7) <= Math.abs(wahr1e7) * A_TOL_REL;
}
export function bewertungA(a1e7) {
  const soll = A_MOSELEY / 1e7;
  const abw = Math.abs(a1e7 - soll) / soll * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 6) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 5 VERSCHIEDENE Elemente
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.Z)).size >= MIN_MESSUNGEN;
}

// ---------- Prüffälle (analytisch nachgerechnet) ----------
export const pruefFaelle = [
  { art: "a", soll: 4.96727e7, tol: 1e3 },                         // √Hz — Moseley-Steigung
  { art: "f", Z: 29, soll: 1.93443e18, tol: 3e15 },                // Hz — Kα(Cu) Kontrollwert
  { art: "lambda", Z: 29, soll: 1.54977e-10, tol: 3e-13 },         // m — λ(Cu) ≈ 155 pm
  { art: "rueck", Z: 26, tol: 1e-6 }                               // Z aus λ(Fe) zurück
];

export const TESTS = [
  { name: "Moseley-Steigung a = √(3/4·R·c): ≈ 4,9673·10⁷ √Hz (±10³)",
    ok: () => A_MOSELEY === Math.sqrt(0.75 * R_INF * C_LICHT)
      && Math.abs(A_MOSELEY - 4.96727e7) <= 1e3 },
  { name: "Kontrollwert f: Kupfer (Z = 29) → Kα ≈ 1,934·10¹⁸ Hz (±3·10¹⁵)",
    ok: () => Math.abs(frequenzKalpha(29) - 1.93443e18) <= 3e15 },
  { name: "Kontrollwert λ: Kupfer (Z = 29) → Kα ≈ 1,550·10⁻¹⁰ m (≈ 155 pm, ±0,3 pm)",
    ok: () => Math.abs(wellenlaengeKalpha(29) - 1.54977e-10) <= 3e-13 },
  { name: "√f linear in (Z − 1): √f = a·(Z − 1) exakt für alle Elemente",
    ok: () => ELEMENTE.every(e => Math.abs(sqrtF(e.Z) - A_MOSELEY * (e.Z - ABSCHIRMUNG)) <= 1e-3) },
  { name: "Steigung aus idealer Regression von √f über Z reproduziert a",
    ok: () => { const pkt = ELEMENTE.map(e => ({ x: e.Z, y: sqrtF(e.Z) }));
      const { m, b } = regression(pkt);
      // m = a (Steigung), Nullstelle b/(-m) ≈ Z = 1 (Abschirmung)
      return Math.abs(m - A_MOSELEY) <= 1e-2 && Math.abs(-b / m - ABSCHIRMUNG) <= 1e-6; } },
  { name: "λ ∝ 1/(Z−1)²: Z−1 verdoppeln (Z 21→41) → λ exakt geviertelt",
    ok: () => Math.abs(wellenlaengeKalpha(21) - 4 * wellenlaengeKalpha(41)) <= 1e-16 },
  { name: "f-Verhältnis Mo/Ca ist (41/19)² — Moseleys quadratisches Gesetz",
    ok: () => Math.abs(frequenzKalpha(42) / frequenzKalpha(20) - Math.pow(41 / 19, 2)) <= 1e-9 },
  { name: "Z aus λ exakt zurück: λ(Fe) → Z = 26, λ(Mo) → Z = 42",
    ok: () => Math.abs(ordnungszahlAusLambda(wellenlaengeKalpha(26)) - 26) <= 1e-6
      && Math.abs(ordnungszahlAusLambda(wellenlaengeKalpha(42)) - 42) <= 1e-6 },
  { name: "Streuung relativ ≤ 0,6 %, deterministisch und Z-spezifisch",
    ok: () => { let irgendStreu = false;
      for (const e of ELEMENTE) {
        const rel = Math.abs(wellenlaengeReal(e.Z) - wellenlaengeKalpha(e.Z)) / wellenlaengeKalpha(e.Z);
        if (rel > LAMBDA_STREU_REL / 2 + 1e-12) return false;
        if (rel > 1e-9) irgendStreu = true;
      }
      return irgendStreu && wellenlaengeReal(29) === wellenlaengeReal(29)
        && wellenlaengeReal(29) !== wellenlaengeReal(30); } },
  { name: "Ablese-Toleranz λ (±2 %) und √f-Toleranz je Zeile (±3 %)",
    ok: () => { const lamPm = wellenlaengeKalpha(29) * 1e12;
      const sf8 = sqrtF(29) / 1e8;
      return ablesungLambdaOk(lamPm, wellenlaengeKalpha(29))
        && ablesungLambdaOk(lamPm * 1.019, wellenlaengeKalpha(29))
        && !ablesungLambdaOk(lamPm * 1.05, wellenlaengeKalpha(29))
        && !ablesungLambdaOk(NaN, wellenlaengeKalpha(29))
        && sqrtFEingabeOk(sf8, sf8) && sqrtFEingabeOk(sf8 * 1.029, sf8)
        && !sqrtFEingabeOk(sf8 * 1.05, sf8) && !sqrtFEingabeOk(NaN, sf8); } },
  { name: "Steigungs-Toleranz a (±6 %) und Bewertung der Abweichung",
    ok: () => { const a7 = A_MOSELEY / 1e7;
      return aEingabeOk(a7, a7) && aEingabeOk(a7 * 1.05, a7) && !aEingabeOk(a7 * 1.07, a7)
        && !aEingabeOk(NaN, a7)
        && bewertungA(a7).stufe === "sehr gut" && bewertungA(a7 * 1.05).stufe === "gut"
        && bewertungA(a7 * 1.1).stufe === "nochmal prüfen"; } },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("155,4") === 155.4 && parseDezimal("155.4") === 155.4
      && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 5 verschiedenen Elementen",
    ok: () => { const z = Z => ({ Z });
      const zuWenig = [20, 22, 26, 29].map(z);
      const doppelt = [20, 22, 26, 29, 29].map(z);
      const gut = [20, 22, 26, 29, 30].map(z);
      return !messreiheVollstaendig(zuWenig) && !messreiheVollstaendig(doppelt)
        && messreiheVollstaendig(gut) && messreiheVollstaendig([...gut, z(42)]); } },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "a") return Math.abs(A_MOSELEY - p.soll) <= p.tol;
      if (p.art === "f") return Math.abs(frequenzKalpha(p.Z) - p.soll) <= p.tol;
      if (p.art === "lambda") return Math.abs(wellenlaengeKalpha(p.Z) - p.soll) <= p.tol;
      return Math.abs(ordnungszahlAusLambda(wellenlaengeKalpha(p.Z)) - p.Z) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Spektrometer-Schirm) ----------
  const RAND_L = 52, RAND_R = 18, RAND_O = 18, RAND_U = 70;  // Plot-Ränder
  const LAMBDA_MIN_PM = 50, LAMBDA_MAX_PM = 350;             // Skalenbereich der Wellenlängen-Achse

  const zustand = {
    phase: "aufbau",
    elementIdx: 3,                          // Default: Kupfer
    vorhersage: "",                         // "kuerzer" | "laenger" | "gleich"
    messungen: [],                          // {Z, sym, lambdaWahrM, lambdaPm, fHz, sqrtfEingabe, sqrtfOk}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    aBestaetigt: null,                      // {eingabe, wahr} nach Steigungs-Erfolg
    meldungMessen: "", meldungAuswerten: ""
  };

  const elementJetzt = () => ELEMENTE[zustand.elementIdx];

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="320" aria-label="Spektrometer-Anzeige: über einem schwachen, breiten Bremsstrahlungs-Untergrund ragt eine scharfe, schmale Spitze auf — die charakteristische Kα-Linie des gewählten Anodenmaterials. Die waagerechte Achse ist die Wellenlängen-Skala in Picometer; der Fußpunkt der Spitze kreuzt sie bei der gesuchten Wellenlänge. Je größer die Ordnungszahl des Anodenmaterials, desto kleiner die Wellenlänge."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  const sqrtfWahr1e8 = z => Math.sqrt(z.fHz) / 1e8;

  // px-Position für eine Wellenlänge in pm auf der Plotbreite
  function xVonLambda(lamPm) {
    const w = canvas.width;
    const t = (lamPm - LAMBDA_MIN_PM) / (LAMBDA_MAX_PM - LAMBDA_MIN_PM);
    return RAND_L + t * (w - RAND_L - RAND_R);
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    const x0 = RAND_L, y0 = h - RAND_U, xMax = w - RAND_R, yTop = RAND_O;

    // Titel
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Röntgenspektrometer · Intensität über Wellenlänge", w / 2, 14);

    // Achsen
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x0, yTop); ctx.lineTo(x0, y0); ctx.lineTo(xMax, y0); ctx.stroke();

    // Wellenlängen-Skala (Picometer)
    ctx.textAlign = "center";
    for (let lam = LAMBDA_MIN_PM; lam <= LAMBDA_MAX_PM; lam += 50) {
      const x = xVonLambda(lam);
      ctx.strokeStyle = cText; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + 5); ctx.stroke();
      ctx.fillStyle = cText; ctx.fillText(String(lam), x, y0 + 18);
      // feine Zwischenstriche alle 10 pm
      for (let s = 10; s < 50; s += 10) {
        const xs = xVonLambda(lam + s);
        if (xs <= xMax) { ctx.strokeStyle = cLeise;
          ctx.beginPath(); ctx.moveTo(xs, y0); ctx.lineTo(xs, y0 + 3); ctx.stroke(); }
      }
    }
    ctx.fillStyle = cLeise; ctx.fillText("Wellenlänge λ in pm", (x0 + xMax) / 2, y0 + 36);

    // Intensitäts-Achsenbeschriftung
    ctx.save(); ctx.translate(16, (yTop + y0) / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.fillStyle = cLeise; ctx.fillText("Intensität", 0, 0); ctx.restore();

    if (zustand.phase !== "aufbau") {
      const el = elementJetzt();
      const lamWahrPm = wellenlaengeReal(el.Z) * 1e12;
      const xPeak = xVonLambda(lamWahrPm);

      // Bremsstrahlungs-Untergrund: breiter Buckel, kurzwellige Grenze, fällt nach lang aus
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.globalAlpha = 0.8;
      const grenzePm = Math.max(LAMBDA_MIN_PM + 6, lamWahrPm * 0.62); // kurzwellige Kante
      ctx.beginPath();
      let erster = true;
      for (let lam = grenzePm; lam <= LAMBDA_MAX_PM; lam += 2) {
        const t = (lam - grenzePm) / (LAMBDA_MAX_PM - grenzePm);
        const amp = 26 * Math.sin(Math.min(1, t * 1.7) * Math.PI) * (1 - 0.4 * t);
        const x = xVonLambda(lam), y = y0 - Math.max(0, amp);
        if (erster) { ctx.moveTo(xVonLambda(grenzePm), y0); erster = false; }
        ctx.lineTo(x, y);
      }
      ctx.lineTo(xMax, y0); ctx.stroke(); ctx.globalAlpha = 1;

      // scharfe Kα-Linie (schmale Spitze) über dem Untergrund
      const hPeak = y0 - yTop - 8;
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5;
      ctx.globalAlpha = 0.22;
      ctx.beginPath(); ctx.moveTo(xPeak - 6, y0); ctx.lineTo(xPeak, yTop + 8); ctx.lineTo(xPeak + 6, y0); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
      ctx.beginPath(); ctx.moveTo(xPeak, y0); ctx.lineTo(xPeak, yTop + 8); ctx.stroke();
      // Spitzenkappe
      ctx.beginPath(); ctx.moveTo(xPeak - 5, yTop + 14); ctx.lineTo(xPeak, yTop + 6); ctx.lineTo(xPeak + 5, yTop + 14); ctx.stroke();
      // Linien-Etikett
      ctx.fillStyle = cAkzent; ctx.textAlign = "center"; ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText("Kα", xPeak, yTop + 24);
      ctx.font = "12px system-ui, sans-serif";

      // Lot vom Fußpunkt zur Skala (Ablese-Hilfe)
      ctx.strokeStyle = cAkzent; ctx.setLineDash([3, 3]); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(xPeak, y0); ctx.lineTo(xPeak, y0 + 6); ctx.stroke();
      ctx.setLineDash([]);
    } else {
      // Aufbau: Hinweis statt Spektrum
      ctx.fillStyle = cFlaeche; ctx.fillRect((x0 + xMax) / 2 - 104, (yTop + y0) / 2 - 26, 208, 52);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Röhre aus —", (x0 + xMax) / 2, (yTop + y0) / 2 - 6);
      ctx.fillText("das Spektrum erscheint", (x0 + xMax) / 2, (yTop + y0) / 2 + 12);
    }

    // Anoden-Etikett unten
    if (zustand.phase !== "aufbau") {
      const el = elementJetzt();
      ctx.fillStyle = cText; ctx.textAlign = "start"; ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText("Anode: " + el.name + " (" + el.sym + ", Z = " + el.Z + ")", x0, h - 8);
      ctx.font = "12px system-ui, sans-serif";
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>In einer <strong>Röntgenröhre</strong> werden Elektronen stark beschleunigt und prallen auf eine <strong>Anode</strong> aus einem reinen Metall. Dabei entsteht zweierlei: ein breiter, kontinuierlicher <strong>Bremsstrahlungs-Untergrund</strong> und — darüber aufragend — scharfe, schmale <strong>charakteristische Linien</strong>, deren Lage nur vom Anodenmaterial abhängt. Die stärkste heißt <strong>Kα-Linie</strong>: Sie entsteht, wenn ein Elektron aus der L-Schale in eine zuvor geschlagene Lücke der innersten K-Schale fällt.</p>
      <p>Ein <strong>Kristall-Spektrometer</strong> fächert das Röntgenlicht nach der Wellenlänge auf. Auf dem Schirm liest du an der <strong>Skala in Picometer</strong> (1 pm = 10⁻¹² m) ab, bei welcher Wellenlänge die scharfe Kα-Spitze steht.</p>
      <p><strong>Moseleys Idee (1913):</strong> Trägt man nicht λ, sondern die <strong>Wurzel der Frequenz √f</strong> über der Ordnungszahl Z auf, liegen alle Elemente auf einer <strong>Geraden</strong>: $\\sqrt{f} = a\\,(Z-1)$. Das „−1“ ist die <strong>Abschirmung</strong>: Das fallende Elektron „sieht“ wegen des verbliebenen zweiten K-Elektrons eine um rund eine Einheit verminderte Kernladung. Die Steigung ist $a=\\sqrt{\\tfrac34\\,R_f}$ mit der Rydbergfrequenz $R_f$.</p>
      <p><strong>Plan:</strong> Wähle nacheinander mindestens ${MIN_MESSUNGEN} verschiedene Anodenmaterialien, lies jeweils die Kα-Wellenlänge ab, rechne daraus f = c/λ und trage in der Auswertung √f gegen Z auf.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich von Calcium (Z = 20) zu Molybdän (Z = 42) wechsle, wird die Kα-Wellenlänge …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="kuerzer">… kürzer (Spitze wandert nach links)</option>
        <option value="laenger">… länger (Spitze wandert nach rechts)</option>
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
  const wortAus = wahl => wahl === "kuerzer" ? "kürzer" : wahl === "laenger" ? "länger" : "(fast) gleich";

  function beobachtungHtml() {
    const zs = zustand.messungen.map(z => z.Z);
    const spanne = zs.length ? Math.max(...zs) - Math.min(...zs) : 0;
    let html = `<p>Deine Vorhersage: höheres Z → Wellenlänge <strong>${wortAus(zustand.vorhersage)}</strong>. Probier mehrere Anoden aus!</p>`;
    if (spanne >= 6) {
      const ok = zustand.vorhersage === "kuerzer";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>höheres Z → kürzere Kα-Wellenlänge</strong> (die Spitze wandert nach links, denn die stärkere Kernladung erhöht die Frequenz). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const el = elementJetzt();
    const anzahl = new Set(zustand.messungen.map(z => z.Z)).size;
    const optionen = ELEMENTE.map((e, i) =>
      `<option value="${i}"${i === zustand.elementIdx ? " selected" : ""}>${e.name} — ${e.sym}, Z = ${e.Z}</option>`).join("");
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-el">Anodenmaterial wählen:</label>
        <select id="exp-el" class="exp-wahl">${optionen}</select>
      </div>
      <p>Gewählt: <strong>${esc(el.name)} (${esc(el.sym)})</strong>, Ordnungszahl <strong>Z = ${el.Z}</strong>. Das Spektrometer zeigt die Kα-Spitze.</p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies an der Skala ab — Kα-Wellenlänge λ in pm:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Element</th><th>Z</th><th>λ in pm</th><th>f in 10¹⁸ Hz</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${esc(z.sym)}</td><td>${z.Z}</td><td>${komma(z.lambdaPm, 1)}</td><td>${komma(z.fHz / 1e18, 3)}</td></tr>`).join("")
          || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${anzahl} von mindestens ${MIN_MESSUNGEN} verschiedenen Elementen.</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const elWahl = panel.querySelector("#exp-el");
    elWahl.addEventListener("change", () => {
      zustand.elementIdx = Number(elWahl.value);
      panelMessen();
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      const elAkt = elementJetzt();
      if (zustand.messungen.some(z => z.Z === elAkt.Z)) {
        meldung.textContent = "Dieses Element hast du schon vermessen — wähle ein anderes Anodenmaterial (mindestens " + MIN_MESSUNGEN + " verschiedene!).";
        return;
      }
      const wahrLam = wellenlaengeReal(elAkt.Z);
      if (!ablesungLambdaOk(eingabe, wahrLam)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wo steht der Fußpunkt der scharfen Kα-Spitze auf der pm-Skala? (Auf wenige Picometer genau ablesen.)";
        return;
      }
      const lambdaM = eingabe * 1e-12;
      zustand.messungen.push({
        Z: elAkt.Z, sym: elAkt.sym, lambdaWahrM: wahrLam,
        lambdaPm: eingabe, fHz: C_LICHT / lambdaM,
        sqrtfEingabe: null, sqrtfOk: null
      });
      zustand.meldungMessen = "✓ Eingetragen — das System rechnet für dich f = c/λ = " + komma((C_LICHT / lambdaM) / 1e18, 3) + " · 10¹⁸ Hz.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Elemente — bisher: ${new Set(zustand.messungen.map(z => z.Z)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.messungen.every(z => z.sqrtfOk === true);
    // Regression √f (in √Hz) über (Z − 1): Steigung = a
    const punkte = fertig
      ? zustand.messungen.map(z => ({ x: z.Z - ABSCHIRMUNG, y: z.sqrtfEingabe * 1e8 }))
      : [];
    const reg = fertig ? regression(punkte) : { m: NaN, b: NaN };
    const a1e7Wahr = reg.m / 1e7;
    const bew = fertig ? bewertungA(a1e7Wahr) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — eine saubere Moseley-Gerade!"
      : bew.stufe === "gut" ? " Ordentlich! Nimm noch ein weit entferntes Element (z. B. Mo neben Ca) dazu, dann liegt die Steigung noch sicherer."
      : " Kein Drama: Prüfe die √f-Werte je Zeile und nimm Elemente mit großem Z-Abstand — das stabilisiert die Steigung.") : "";
    const aB = zustand.aBestaetigt;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Für jede Zeile gilt die Moseley-Größe <strong>√f</strong>. Rechne selbst (Taschenrechner!): Ziehe aus f die Wurzel und trage sie in <strong>10⁸ √Hz</strong> ein — z. B. für f = 1,93·10¹⁸ Hz ist √f ≈ 1,39·10⁹ √Hz = <strong>13,9</strong> (in 10⁸).</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für eine Zeile</summary>
        <p>1) f steht in <strong>10¹⁸ Hz</strong>, z. B. 1,93·10¹⁸ Hz. 2) Wurzel ziehen: √(1,93·10¹⁸) = √1,93 · 10⁹ ≈ 1,389·10⁹ √Hz. 3) In <strong>10⁸ √Hz</strong> umrechnen: 1,389·10⁹ = 13,89·10⁸ → eintragen <strong>13,9</strong>. (Faustprobe: höheres Z ⇒ größeres √f.)</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>Element</th><th>Z</th><th>f in 10¹⁸ Hz</th><th>√f in 10⁸ √Hz</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${esc(z.sym)}</td><td>${z.Z}</td><td>${komma(z.fHz / 1e18, 3)}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.sqrtfEingabe == null ? "" : komma(z.sqrtfEingabe, 2)}" aria-label="Dein √f für ${esc(z.name || z.sym)} in 10 hoch 8 Wurzel Hertz"></td>
          <td>${z.sqrtfOk === true ? "✓" : z.sqrtfOk === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Zeilen prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <h3>Moseley-Diagramm: √f über (Z − 1)</h3>
      <canvas id="exp-diagramm" width="360" height="240" aria-label="Streudiagramm: √f in 10 hoch 8 Wurzel Hertz über der um eins verminderten Ordnungszahl Z minus 1. Die Messpunkte liegen auf einer Ursprungsgeraden; ihre Steigung ist die Moseley-Konstante a."></canvas>
      <div class="exp-hinweis">
        <p><strong>Steigung deiner Geraden: a ≈ ${komma(a1e7Wahr, 3)} · 10⁷ √Hz.</strong> Theoriewert $a=\\sqrt{\\tfrac34 R_f}$ ≈ 4,966 · 10⁷ √Hz — Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung}</p>
        <p>Dass die Punkte auf der Geraden durch <strong>Z − 1</strong> (nicht durch Z) liegen, bestätigt die <strong>Abschirmung σ ≈ 1</strong>: Das in die K-Lücke fallende Elektron spürt eine um etwa eine Einheit verminderte Kernladung.</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Warum hängt die Lage der Kα-Linie <strong>nur vom Anodenmaterial</strong> ab und nicht von der Röhrenspannung?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="brems">Weil es die Bremsstrahlung der Elektronen im Anodenfeld ist</option>
          <option value="schalen">Weil sie aus festen Energiestufen der inneren Elektronenschalen des Atoms stammt</option>
          <option value="temperatur">Weil die Anode sich unterschiedlich stark erhitzt</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Es gilt √f ∝ (Z − 1). Element B hat die <strong>doppelte</strong> Größe (Z − 1) wie Element A. Wie verhält sich seine Kα-<strong>Frequenz</strong>?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">f bleibt gleich</option>
          <option value="wurzel2">f wächst um den Faktor √2</option>
          <option value="doppelt">f verdoppelt sich</option>
          <option value="vierfach">f vervierfacht sich</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite">${esc(f2Feedback())}</p>
      ${fertig ? `
      <h3>Bonus: die Rydbergfrequenz zurückgewinnen</h3>
      <p>Aus der Moseley-Steigung folgt umgekehrt $R_f = \\tfrac43\\,a^2$. Setz <em>deine</em> Steigung a (in 10⁷ √Hz) ein und gib die Rydbergfrequenz in <strong>10¹⁵ Hz</strong> an.</p>
      <form id="exp-a-form" class="exp-ablesen">
        <label for="exp-a">R<sub>f</sub> in 10¹⁵ Hz:</label>
        <input id="exp-a" inputmode="decimal" autocomplete="off" size="7" value="${aB ? komma(aB.eingabe, 2) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-a-meldung" class="exp-meldung" aria-live="polite"></p>
      ${aB ? `
      <div class="exp-hinweis">
        <p><strong>R<sub>f</sub> ≈ ${komma(aB.eingabe, 2)} · 10¹⁵ Hz</strong> (Literaturwert: 3,290 · 10¹⁵ Hz). Aus charakteristischen Röntgenlinien gewinnst du dieselbe Naturkonstante wie aus dem sichtbaren Wasserstoffspektrum — <strong>ein Atommodell, ein Rydberg.</strong></p>
      </div>` : ""}` : ""}
      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man die Steigung nie exakt?</summary>
        <p><strong>Ablesung der Linienlage:</strong> Die Kα-Spitze hat eine endliche Breite, und die Skala lässt sich nur auf wenige Picometer genau ablesen. Weil f = c/λ ist, schlägt ein λ-Fehler von 1 % direkt als 1 % Frequenzfehler durch — und in √f noch halb so stark.</p>
        <p><strong>Kα-Feinstruktur (Kα₁/Kα₂):</strong> Die „eine“ Kα-Linie ist in Wahrheit ein eng benachbartes Dublett. Mit einem Schulspektrometer erscheinen beide als eine Spitze; man liest faktisch einen Mittelwert ab. Das verschiebt λ minimal systematisch.</p>
        <p><strong>Abschirmung ist nur näherungsweise σ = 1:</strong> Moseleys lineares Gesetz mit exakt Z − 1 ist eine sehr gute, aber nicht perfekte Näherung. Bei genauer Messung über einen großen Z-Bereich krümmt sich die √f-Z-Linie ein wenig — relativistische und Mehrelektronen-Effekte.</p>
        <p><strong>Strategie dagegen:</strong> Elemente mit großem Z-Abstand wählen (lange Hebelarme für die Steigung), mehrere Linien ablesen und die Steigung per Regression statt aus zwei Punkten bestimmen — genau das hast du getan.</p>
      </details>`;

    if (fertig) zeichneDiagramm(punkte, reg);

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.sqrtfEingabe = null; z.sqrtfOk = null; return; }
        z.sqrtfEingabe = wert;
        z.sqrtfOk = sqrtFEingabeOk(wert, sqrtfWahr1e8(z));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (Dezimalzahl, z. B. 13,9).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.sqrtfOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle √f-Werte bestätigt — unten erscheint deine Moseley-Gerade."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±3 % Toleranz). Häufigste Stolperfalle: erst die Wurzel ziehen, dann auf 10⁸ umrechnen (10⁹ √Hz = 10·10⁸).";
      if (falsch > 0) zustand.aBestaetigt = null;
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "schalen" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "vierfach" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-a-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-a").value);
      // R_f = 4/3·a²; aus der eigenen Steigung reg.m (√Hz). Toleranz: doppelte relative a-Toleranz.
      const rfWahr1e15 = (4 / 3) * reg.m * reg.m / 1e15;
      const tol = rfWahr1e15 * 2 * A_TOL_REL;
      if (!(Number.isFinite(eingabe) && Math.abs(eingabe - rfWahr1e15) <= tol)) {
        panel.querySelector("#exp-a-meldung").textContent = "✗ Das passt noch nicht. Rechne R_f = 4/3 · a² mit a aus der Steigung (in √Hz) und gib das Ergebnis in 10¹⁵ Hz an (Erwartung nahe 3,29).";
        return;
      }
      zustand.aBestaetigt = { eingabe, wahr: rfWahr1e15 };
      panelAuswerten();
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("moseley-messreihe.csv",
        ["Element", "Z", "lambda in pm", "f in 10^18 Hz", "sqrt(f) in 10^8 sqrtHz"],
        zustand.messungen.map(z => [z.sym, String(z.Z), z.lambdaPm, z.fHz / 1e18,
          z.sqrtfEingabe == null ? "" : z.sqrtfEingabe]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        elementIdx: 3, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        aBestaetigt: null, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  // ---------- Moseley-Diagramm (Streupunkte + Regressionsgerade) ----------
  function zeichneDiagramm(punkte, reg) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const d = dia.getContext("2d");
    const w = dia.width, h = dia.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const L = 50, R = 14, O = 14, U = 40;
    d.clearRect(0, 0, w, h);
    d.font = "11px system-ui, sans-serif";

    const xs = punkte.map(p => p.x), ys = punkte.map(p => p.y / 1e8); // y in 10⁸
    const xMaxD = Math.max(...xs) + 3, xMinD = 0;
    const yMaxD = Math.max(...ys) * 1.1, yMinD = 0;
    const px = x => L + (x - xMinD) / (xMaxD - xMinD) * (w - L - R);
    const py = y => (h - U) - (y - yMinD) / (yMaxD - yMinD) * (h - O - U);

    // Achsen
    d.strokeStyle = cText; d.lineWidth = 1.5;
    d.beginPath(); d.moveTo(L, O); d.lineTo(L, h - U); d.lineTo(w - R, h - U); d.stroke();
    d.fillStyle = cLeise; d.textAlign = "center";
    d.fillText("Z − 1", (L + w - R) / 2, h - 8);
    d.save(); d.translate(13, (O + h - U) / 2); d.rotate(-Math.PI / 2);
    d.fillText("√f in 10⁸ √Hz", 0, 0); d.restore();

    // x-Ticks
    for (let x = 0; x <= xMaxD; x += 10) {
      d.strokeStyle = cLeise; d.lineWidth = 1;
      d.beginPath(); d.moveTo(px(x), h - U); d.lineTo(px(x), h - U + 4); d.stroke();
      d.fillStyle = cText; d.fillText(String(x), px(x), h - U + 16);
    }
    // y-Ticks
    d.textAlign = "end";
    const yStep = yMaxD > 30 ? 10 : 5;
    for (let y = 0; y <= yMaxD; y += yStep) {
      d.strokeStyle = cLeise; d.lineWidth = 1;
      d.beginPath(); d.moveTo(L - 4, py(y)); d.lineTo(L, py(y)); d.stroke();
      d.fillStyle = cText; d.fillText(String(y), L - 7, py(y) + 4);
    }

    // Regressionsgerade (in den Plotbereich geclippt)
    d.strokeStyle = cAkzent; d.lineWidth = 2;
    const yAt = x => (reg.m * x + reg.b) / 1e8;
    d.beginPath(); d.moveTo(px(xMinD), py(yAt(xMinD))); d.lineTo(px(xMaxD), py(yAt(xMaxD))); d.stroke();

    // Messpunkte
    d.fillStyle = cAkzent;
    punkte.forEach((p, i) => {
      const x = px(p.x), y = py(p.y / 1e8);
      d.beginPath(); d.arc(x, y, 4, 0, 7); d.fill();
      d.fillStyle = cText; d.textAlign = "start";
      d.fillText(zustand.messungen[i].sym, x + 6, y - 5);
      d.fillStyle = cAkzent;
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Die Kα-Strahlung entsteht beim Sprung eines Elektrons von der L- in die K-Schale. Die Energiedifferenz dieser Schalen ist eine feste Eigenschaft des jeweiligen Atoms — sie hängt von der Kernladung Z ab, nicht davon, wie schnell die Röhrenelektronen ankommen. Die Spannung muss nur hoch genug sein, um die K-Lücke überhaupt zu erzeugen."
      : "✗ Nicht ganz: Den kontinuierlichen Untergrund liefert die Bremsstrahlung — der verschiebt sich mit der Spannung. Die scharfe Kα-Spitze dagegen sitzt immer an derselben Stelle. Überlege, woher ihre feste Energie kommt: aus den Elektronenschalen des Atoms.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: √f verdoppelt sich, also wird f um den Faktor 2² = 4 größer. Genau das ist Moseleys quadratisches Gesetz f ∝ (Z − 1)² — vergleiche in deiner Tabelle ein Element mit großem und eines mit kleinem Z."
      : "✗ Schau auf √f ∝ (Z − 1): Wenn (Z − 1) sich verdoppelt, verdoppelt sich √f. Die Frequenz selbst ist das Quadrat davon, wächst also um 2² = 4.";
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
