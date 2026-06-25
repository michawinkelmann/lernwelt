// experiment.js — Interaktives Experiment: Mach-Zehnder-Interferometer mit Einzelphotonen (QP, eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Die Phasendifferenz φ zwischen den
// beiden Wegen am Phasenschieber selbst einstellen und am Zähler von Detektor D1 die
// relative Häufigkeit P(D1) = z1/N SELBST ablesen (N = 1000 einzeln gesendete Photonen).
// Aus mindestens 6 verschiedenen φ entsteht die Kurve P(D1) = cos²(φ/2): Auch wenn immer
// nur EIN Photon im Gerät ist, zeigt sich Interferenz — das Photon interferiert „mit sich
// selbst". Ein Welcher-Weg-Schalter zerstört die Interferenz (Komplementarität).
// Die kleine Zählstreuung (Schrotrauschen) ist pro φ deterministisch geseedet — dadurch
// bleiben pruefFaelle und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, esc, farbe, bauePhasen, csvHerunterladen } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const N_PHOTONEN = 1000;            // einzeln gesendete Photonen je Messpunkt
export const PHI_MIN = 0, PHI_MAX = 360, PHI_SCHRITT = 30;   // Phasendifferenz in Grad
export const Z_STREU_SPANNE = 26;          // Schrotrauschen auf die Zählrate von D1 (±13 Ereignisse vor dem Runden)
export const P_TOLERANZ = 0.04;            // akzeptierte Ablesung der relativen Häufigkeit P(D1): ±0,04
export const PERIODE_GRAD = 360;           // Periodizität von P(D1) in Grad
export const MIN_MESSUNGEN = 6;

// ---------- Physik (rein, Node-testbar) ----------
// Detektionswahrscheinlichkeit an D1: P(D1) = cos²(φ/2)
export function pD1(phiGrad) {
  const phi = phiGrad * Math.PI / 180;
  return Math.cos(phi / 2) ** 2;
}
// Detektionswahrscheinlichkeit an D2: P(D2) = sin²(φ/2)
export function pD2(phiGrad) {
  const phi = phiGrad * Math.PI / 180;
  return Math.sin(phi / 2) ** 2;
}
// real registrierte Zählrate an D1 (ganzzahlig, 0…N) inkl. reproduzierbarem Schrotrauschen.
// markiert = Welcher-Weg-Information aktiv → keine Interferenz mehr, P(D1) = 1/2.
export function zaehlrateReal(phiGrad, N = N_PHOTONEN, markiert = false) {
  const p = markiert ? 0.5 : pD1(phiGrad);
  const ideal = p * N;
  const z = Math.round(ideal + streuung("z:" + phiGrad + ":" + (markiert ? "m" : "i"), Z_STREU_SPANNE));
  return Math.min(N, Math.max(0, z));
}
// relative Häufigkeit aus einer Zählrate
export function relHaeufigkeit(zaehlrate, N = N_PHOTONEN) {
  return N > 0 ? zaehlrate / N : NaN;
}

// ---------- Eingabe-Prüfungen / Bewertung ----------
// Die Lernenden lesen P(D1) = z1/N ab; Toleranz deckt die Ableserundung + Schrotrauschen ab.
export function ablesungPOk(eingabe, phiGrad, N = N_PHOTONEN, markiert = false) {
  const wahr = relHaeufigkeit(zaehlrateReal(phiGrad, N, markiert), N);
  return Number.isFinite(eingabe) && Math.abs(eingabe - wahr) <= P_TOLERANZ;
}
// Bewertung: wie gut folgt die Messreihe der Theorie cos²(φ/2)? (mittlere Abweichung)
export function bewertungKurve(messungen) {
  const gueltig = messungen.filter(z => Number.isFinite(z.pAbgelesen));
  if (gueltig.length === 0) return { stufe: "nochmal prüfen", abw: NaN };
  const abw = gueltig.reduce((a, z) => a + Math.abs(z.pAbgelesen - pD1(z.phi)), 0) / gueltig.length * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 6) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Phasen, darunter ein Maximum-nahes (≤30°)
// und ein Minimum-nahes (150°…210°) — sonst sieht man die cos²-Form nicht.
export function messreiheVollstaendig(messungen) {
  const phis = messungen.map(z => z.phi);
  const verschieden = new Set(phis).size;
  const hatMax = phis.some(p => p <= 30 || p >= 330);
  const hatMin = phis.some(p => p >= 150 && p <= 210);
  return verschieden >= MIN_MESSUNGEN && hatMax && hatMin;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "pD1", phi: 0, soll: 1, tol: 1e-12 },        // konstruktiv: alles in D1
  { art: "pD1", phi: 180, soll: 0, tol: 1e-12 },      // destruktiv: nichts in D1
  { art: "pD1", phi: 90, soll: 0.5, tol: 1e-12 },     // halb/halb
  { art: "summe", phi: 73, soll: 1, tol: 1e-12 },     // P(D1)+P(D2)=1 für beliebiges φ
  { art: "periode", phi: 45, soll: 0, tol: 1e-12 }    // P(D1) ist 360°-periodisch
];

export const TESTS = [
  { name: "P(D1) am Maximum: φ = 0° → cos²(0) = 1 (exakt)",
    ok: () => Math.abs(pD1(0) - 1) < 1e-12 },
  { name: "P(D1) am Minimum: φ = 180° → cos²(90°) = 0 (exakt)",
    ok: () => Math.abs(pD1(180) - 0) < 1e-12 },
  { name: "P(D1) am Wendepunkt: φ = 90° → cos²(45°) = 1/2 (±1e-12)",
    ok: () => Math.abs(pD1(90) - 0.5) < 1e-12 && Math.abs(pD1(270) - 0.5) < 1e-12 },
  { name: "Komplementarität P(D1)+P(D2)=1 für jedes φ (volles Raster)",
    ok: () => { for (let p = 0; p <= 360; p += 5) if (Math.abs(pD1(p) + pD2(p) - 1) > 1e-12) return false; return true; } },
  { name: "Periodizität: P(D1)(φ) = P(D1)(φ+360°) und Symmetrie P(D1)(φ)=P(D1)(−φ)",
    ok: () => [0, 30, 45, 90, 137, 200, 300].every(p =>
      Math.abs(pD1(p) - pD1(p + 360)) < 1e-12 && Math.abs(pD1(p) - pD1(360 - p)) < 1e-12) },
  { name: "cos²-Halbwinkel: φ = 60° → 3/4, φ = 120° → 1/4 (±1e-12)",
    ok: () => Math.abs(pD1(60) - 0.75) < 1e-12 && Math.abs(pD1(120) - 0.25) < 1e-12 },
  { name: "Zählrate ganzzahlig in [0, N], Schrotrauschen ≤ ±13 vom Ideal, deterministisch + φ-abhängig",
    ok: () => { let irgendStreu = false;
      for (let p = PHI_MIN; p <= PHI_MAX; p += PHI_SCHRITT) {
        const z = zaehlrateReal(p);
        if (!Number.isInteger(z) || z < 0 || z > N_PHOTONEN) return false;
        const abw = Math.abs(z - pD1(p) * N_PHOTONEN);
        if (abw > Z_STREU_SPANNE / 2 + 1e-9) return false;
        if (abw > 1e-6) irgendStreu = true;
      }
      return irgendStreu && zaehlrateReal(90) === zaehlrateReal(90) && zaehlrateReal(90) !== zaehlrateReal(120); } },
  { name: "Welcher-Weg-Markierung zerstört Interferenz: P(D1) ≈ 1/2 auch bei φ = 0° und 180°",
    ok: () => { for (const p of [0, 90, 180, 270]) {
        const rel = relHaeufigkeit(zaehlrateReal(p, N_PHOTONEN, true));
        if (Math.abs(rel - 0.5) > Z_STREU_SPANNE / 2 / N_PHOTONEN + 1e-9) return false;
      } return true; } },
  { name: "relative Häufigkeit aus Zählrate: z1/N, 500/1000 = 0,5",
    ok: () => relHaeufigkeit(500) === 0.5 && relHaeufigkeit(1000) === 1 && relHaeufigkeit(0) === 0 },
  { name: "Ablese-Toleranz P(D1): ±0,04 um den wahren Wert, NaN nicht",
    ok: () => { const wahr = relHaeufigkeit(zaehlrateReal(60));
      return ablesungPOk(wahr, 60) && ablesungPOk(wahr + 0.03, 60) && !ablesungPOk(wahr + 0.05, 60)
        && !ablesungPOk(NaN, 60); } },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("0,75") === 0.75 && parseDezimal("0.75") === 0.75 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥6 Phasen inkl. Maximum- und Minimum-Nähe",
    ok: () => { const z = p => ({ phi: p });
      const ohneMin = [0, 30, 60, 90, 120, 90].map(z);                 // kein φ um 180°, dazu doppelt
      const ohneMax = [60, 90, 120, 150, 180, 210].map(z);             // kein φ um 0°/360°
      const zuWenig = [0, 90, 180].map(z);
      const gut = [0, 60, 90, 120, 180, 300].map(z);
      return !messreiheVollstaendig(ohneMin) && !messreiheVollstaendig(ohneMax)
        && !messreiheVollstaendig(zuWenig) && messreiheVollstaendig(gut); } },
  { name: "Bewertung der Kurventreue: ideale Ablesung → sehr gut, grob daneben → nochmal prüfen",
    ok: () => { const ideal = [0, 60, 90, 120, 180, 300].map(p => ({ phi: p, pAbgelesen: pD1(p) }));
      const schlecht = [0, 60, 90, 120, 180, 300].map(p => ({ phi: p, pAbgelesen: 0.5 }));
      return bewertungKurve(ideal).stufe === "sehr gut" && bewertungKurve(schlecht).stufe === "nochmal prüfen"; } },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "pD1") return Math.abs(pD1(p.phi) - p.soll) <= p.tol;
      if (p.art === "summe") return Math.abs(pD1(p.phi) + pD2(p.phi) - p.soll) <= p.tol;
      return Math.abs(pD1(p.phi) - pD1(p.phi + PERIODE_GRAD)) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Aufsicht auf den optischen Tisch) ----------
  const Q_X = 36, Q_Y = 96;          // Photonenquelle (oben links)
  const ST1_X = 130, ST1_Y = 96;     // 1. Strahlteiler
  const ST2_X = 300, ST2_Y = 230;    // 2. Strahlteiler
  const SP1_X = 300, SP1_Y = 96;     // Spiegel oben rechts
  const SP2_X = 130, SP2_Y = 230;    // Spiegel unten links
  const D1_X = 300, D1_Y = 320;      // Detektor D1 (unten)
  const D2_X = 386, D2_Y = 230;      // Detektor D2 (rechts)

  const zustand = {
    phase: "aufbau",
    phi: 0, markiert: false,
    vorhersage: "",                        // "groesser" | "kleiner" | "gleich"
    messungen: [],                         // {phi, z1, z2, pAbgelesen, pOk}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    wegMarkiert: null,                     // {p, wahr} nach Erkenntnis im Welcher-Weg-Teil
    animPuls: 0,                           // 0..1 Position des Einzelphotons auf dem Weg
    timer: null,
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
        <canvas id="exp-canvas" width="420" height="360" aria-label="Aufsicht auf das Mach-Zehnder-Interferometer: oben links die Einzelphotonenquelle, rechts daneben der erste Strahlteiler, der das Licht auf zwei rechtwinklige Wege schickt; in einem Weg sitzt ein verstellbarer Phasenschieber. Zwei Spiegel führen beide Wege zum zweiten Strahlteiler, hinter dem die Detektoren D1 und D2 sitzen. Unten zwei Zählwerke, die die in D1 und D2 registrierten Photonen anzeigen."></canvas>
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
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche"), cOk = farbe("--ok", "#1b8a5a");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start"; ctx.lineCap = "butt";

    const live = zustand.phase !== "aufbau";

    // Strahlengang (zwei rechtwinklige Wege)
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.globalAlpha = 0.7;
    ctx.beginPath();
    ctx.moveTo(Q_X + 22, Q_Y); ctx.lineTo(ST1_X, ST1_Y);          // Quelle → ST1
    ctx.moveTo(ST1_X, ST1_Y); ctx.lineTo(SP1_X, SP1_Y);          // oberer Weg: ST1 → Spiegel1
    ctx.lineTo(ST2_X, ST2_Y);                                    // Spiegel1 → ST2
    ctx.moveTo(ST1_X, ST1_Y); ctx.lineTo(SP2_X, SP2_Y);          // unterer Weg: ST1 → Spiegel2
    ctx.lineTo(ST2_X, ST2_Y);                                    // Spiegel2 → ST2
    ctx.moveTo(ST2_X, ST2_Y); ctx.lineTo(D1_X, D1_Y - 18);       // ST2 → D1 (unten)
    ctx.moveTo(ST2_X, ST2_Y); ctx.lineTo(D2_X - 18, D2_Y);       // ST2 → D2 (rechts)
    ctx.stroke(); ctx.globalAlpha = 1;

    // Phasenschieber im oberen Weg (zwischen ST1 und Spiegel1)
    const PS_X = (ST1_X + SP1_X) / 2;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(PS_X - 16, ST1_Y - 13, 32, 26, 4); else ctx.rect(PS_X - 16, ST1_Y - 13, 32, 26);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cAkzent; ctx.textAlign = "center"; ctx.font = "bold 11px system-ui, sans-serif";
    ctx.fillText("φ", PS_X, ST1_Y + 4);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Phasenschieber", PS_X, ST1_Y - 18);
    ctx.font = "12px system-ui, sans-serif";

    // Welcher-Weg-Markierer im unteren Weg (nur sichtbar, wenn aktiviert)
    const WW_X = (ST1_X + SP2_X) / 2;
    if (zustand.markiert) {
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(WW_X - 18, SP2_Y - 13, 36, 26, 4); else ctx.rect(WW_X - 18, SP2_Y - 13, 36, 26);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = cAkzent; ctx.textAlign = "center"; ctx.font = "bold 11px system-ui, sans-serif";
      ctx.fillText("WW", WW_X, SP2_Y + 4);
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("Weg-Markierer", WW_X, SP2_Y + 26);
      ctx.font = "12px system-ui, sans-serif";
    }

    // Strahlteiler (45°, halbdurchlässig)
    const strahlteiler = (x, y, etikett, dy) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - 13, y + 13); ctx.lineTo(x + 13, y - 13); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.lineWidth = 1; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(etikett, x, y + dy);
      ctx.font = "12px system-ui, sans-serif";
    };
    strahlteiler(ST1_X, ST1_Y, "Strahlteiler 1", -20);
    strahlteiler(ST2_X, ST2_Y, "Strahlteiler 2", 28);

    // Spiegel (voll reflektierend, 45°)
    const spiegel = (x, y) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(x - 13, y - 13); ctx.lineTo(x + 13, y + 13); ctx.stroke();
    };
    spiegel(SP1_X, SP1_Y); spiegel(SP2_X, SP2_Y);

    // Photonenquelle
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(Q_X - 18, Q_Y - 14, 40, 28, 4); else ctx.rect(Q_X - 18, Q_Y - 14, 40, 28);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Quelle", Q_X + 2, Q_Y - 20); ctx.fillText("(1 Photon)", Q_X + 2, Q_Y + 30);
    ctx.font = "12px system-ui, sans-serif";

    // animiertes Einzelphoton (ein heller Punkt, der den/die Wege durchläuft)
    if (live && zustand.animPuls > 0) {
      const t = zustand.animPuls;
      const punkte = [];
      // Quelle→ST1 (t 0–0,18), dann beide Wege parallel (t 0,18–0,7), dann ST2→Detektoren (t 0,7–1)
      if (t < 0.18) {
        const u = t / 0.18;
        punkte.push([Q_X + 22 + (ST1_X - Q_X - 22) * u, Q_Y]);
      } else if (t < 0.7) {
        const u = (t - 0.18) / 0.52;
        // oberer Weg: ST1→SP1→ST2
        const oben = u < 0.5
          ? [ST1_X + (SP1_X - ST1_X) * (u / 0.5), ST1_Y]
          : [SP1_X, SP1_Y + (ST2_Y - SP1_Y) * ((u - 0.5) / 0.5)];
        // unterer Weg: ST1→SP2→ST2
        const unten = u < 0.5
          ? [ST1_X, ST1_Y + (SP2_Y - ST1_Y) * (u / 0.5)]
          : [SP2_X + (ST2_X - SP2_X) * ((u - 0.5) / 0.5), SP2_Y];
        punkte.push(oben, unten);
      } else {
        const u = (t - 0.7) / 0.3;
        punkte.push([ST2_X + (D1_X - ST2_X) * u, ST2_Y + (D1_Y - 18 - ST2_Y) * u]);
        punkte.push([ST2_X + (D2_X - 18 - ST2_X) * u, ST2_Y]);
      }
      ctx.fillStyle = cAkzent;
      punkte.forEach(([x, y]) => {
        ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(x, y, 7, 0, 7); ctx.fill();
        ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(x, y, 3.4, 0, 7); ctx.fill();
      });
      ctx.globalAlpha = 1;
    }

    // Detektoren mit Live-Zählwerk
    const detektor = (x, y, name, zaehlung) => {
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x - 16, y - 14, 32, 28, 5); else ctx.rect(x - 16, y - 14, 32, 28);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = cAkzent; ctx.textAlign = "center"; ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(name, x, y + 4); ctx.font = "12px system-ui, sans-serif";
    };
    detektor(D1_X, D1_Y, "D1");
    detektor(D2_X, D2_Y, "D2");

    // Zählwerke unten (digital)
    const z1 = live ? zaehlrateReal(zustand.phi, N_PHOTONEN, zustand.markiert) : 0;
    const z2 = N_PHOTONEN - z1;
    const zaehlwerk = (x, etikett, wert, betont) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 332, 192, 26, 6); else ctx.rect(x, 332, 192, 26);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "start";
      ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(etikett, x + 8, 348);
      ctx.fillStyle = betont ? cAkzent : cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "end";
      ctx.fillText(live ? wert : "—", x + 184, 349);
      ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    };
    zaehlwerk(14, "Zählwerk D1 (von " + N_PHOTONEN + ")", String(z1), true);
    zaehlwerk(214, "Zählwerk D2 (von " + N_PHOTONEN + ")", String(z2), false);

    // Hinweistext im Aufbau (zuletzt, mit Hintergrund)
    if (!live) {
      ctx.fillStyle = cFlaeche; ctx.fillRect(150, 150, 150, 60);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Quelle aus —", 225, 168);
      ctx.fillText("die Zählwerke laufen", 225, 186);
      ctx.fillText("in der Durchführung", 225, 204);
    }
    ctx.textAlign = "start";
  }

  // ---------- kurze Photonen-Animation (respektiert prefers-reduced-motion) ----------
  function pulsAbspielen() {
    if (zustand.timer) { clearInterval(zustand.timer); zustand.timer = null; }
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { zustand.animPuls = 0; zeichne(); return; }
    zustand.animPuls = 0.001;
    const start = performance.now(), dauer = 1100;
    zustand.timer = setInterval(() => {
      const t = (performance.now() - start) / dauer;
      if (t >= 1) { zustand.animPuls = 0; clearInterval(zustand.timer); zustand.timer = null; }
      else zustand.animPuls = t;
      zeichne();
    }, 40);
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Das <strong>Mach-Zehnder-Interferometer</strong> teilt Licht in zwei Wege und führt es wieder zusammen. Eine <strong>Quelle</strong> sendet die Photonen <strong>einzeln</strong> aus — zu jedem Zeitpunkt ist also höchstens <em>ein</em> Photon im Gerät. Am <strong>ersten Strahlteiler</strong> (halbdurchlässiger Spiegel) hat jedes Photon die Wahl zwischen einem <strong>oberen</strong> und einem <strong>unteren Weg</strong>. Zwei Spiegel lenken beide Wege auf den <strong>zweiten Strahlteiler</strong>; dahinter sitzen die Detektoren <strong>D1</strong> und <strong>D2</strong>, jeder mit einem Zählwerk.</p>
      <p>In den oberen Weg ist ein <strong>Phasenschieber</strong> eingebaut: Er verlängert diesen Lichtweg ein klein wenig und erzeugt so eine einstellbare <strong>Phasendifferenz φ</strong> (0°–360°) zwischen beiden Wegen.</p>
      <p>Die Quantenmechanik sagt für die Detektionswahrscheinlichkeiten voraus:</p>
      <p style="text-align:center"><strong>P(D1) = cos²(φ/2)</strong> &nbsp;und&nbsp; <strong>P(D2) = sin²(φ/2)</strong>.</p>
      <p>Über viele einzeln gesendete Photonen wird daraus die <strong>relative Häufigkeit</strong>: Von ${N_PHOTONEN} Photonen registriert D1 etwa P(D1)·${N_PHOTONEN} Stück. Genau diese Zahl liest du am Zählwerk ab.</p>
      <p><strong>Plan:</strong> Stelle mindestens ${MIN_MESSUNGEN} verschiedene Phasen φ ein (darunter eine nahe 0° und eine nahe 180°), lies jeweils das D1-Zählwerk ab und bestimme P(D1) = z₁ / ${N_PHOTONEN}. In der Auswertung trägst du P(D1) über φ auf.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt. <strong>Es ist immer nur ein Photon unterwegs</strong>, es kann also scheinbar nicht „mit sich selbst" interferieren:</p>
      <label for="exp-v">Wenn ich die Phase φ langsam von 0° auf 180° erhöhe, wird die D1-Zählrate …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="kleiner">… kleiner (D1 wird dunkel)</option>
        <option value="groesser">… größer</option>
        <option value="gleich">… bleibt etwa konstant bei der Hälfte (kein Muster)</option>
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
  const wortAus = wahl => wahl === "kleiner" ? "kleiner werden (D1 wird dunkel)"
    : wahl === "groesser" ? "größer werden"
    : "etwa konstant bei der Hälfte bleiben";

  function beobachtungHtml() {
    const phis = zustand.messungen.map(z => z.phi);
    let html = `<p>Deine Vorhersage: φ von 0° auf 180° → D1-Zählrate <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus!</p>`;
    const hatMaxMess = phis.some(p => p <= 30 || p >= 330);
    const hatMinMess = phis.some(p => p >= 150 && p <= 210);
    if (hatMaxMess && hatMinMess) {
      const ok = zustand.vorhersage === "kleiner";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>φ rauf von 0° auf 180° → D1 wird dunkel, D2 hell</strong> (P(D1) = cos²(φ/2)). Obwohl immer nur ein Photon im Gerät war, entsteht ein klares <strong>Interferenzmuster</strong> — jedes Photon „erkundet" beide Wege und interferiert <em>mit sich selbst</em>. ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — und genau das ist das Verblüffende am Einzelphoton-Versuch."}</p>`;
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
    const verschieden = new Set(zustand.messungen.map(z => z.phi)).size;
    let fortschritt = `${verschieden} von mindestens ${MIN_MESSUNGEN} verschiedenen Phasen.`;
    if (verschieden >= 2 && !zustand.messungen.some(z => z.phi <= 30 || z.phi >= 330)) fortschritt += " Miss auch nahe φ = 0°!";
    if (verschieden >= 2 && !zustand.messungen.some(z => z.phi >= 150 && z.phi <= 210)) fortschritt += " Miss auch nahe φ = 180°!";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-phi">Phasendifferenz am Phasenschieber: φ = <strong id="exp-phi-wert">${zustand.phi}°</strong></label>
        <input type="range" id="exp-phi" min="${PHI_MIN}" max="${PHI_MAX}" step="${PHI_SCHRITT}" value="${zustand.phi}" aria-label="Phasendifferenz in Grad">
      </div>
      <p>Stelle φ ein, sende die ${N_PHOTONEN} Photonen einzeln und lies am <strong>Zählwerk D1</strong> (im Bild unten) die Zahl z₁ ab. Daraus: P(D1) = z₁ / ${N_PHOTONEN}.</p>
      <div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-senden">${N_PHOTONEN} Photonen senden</button></div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Abgelesene relative Häufigkeit P(D1) = z₁/${N_PHOTONEN}:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>φ in °</th><th>z₁ (D1)</th><th>P(D1) = z₁/${N_PHOTONEN}</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.phi}</td><td>${z.z1}</td><td>${komma(z.pAbgelesen, 3)}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const phiRegler = panel.querySelector("#exp-phi");
    phiRegler.addEventListener("input", () => {
      zustand.phi = Math.round(Number(phiRegler.value) / PHI_SCHRITT) * PHI_SCHRITT; // exakt auf Raster — deterministische Streu-Schlüssel
      panel.querySelector("#exp-phi-wert").textContent = zustand.phi + "°";
      zeichne();
    });
    panel.querySelector("#exp-senden").addEventListener("click", pulsAbspielen);
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.phi === zustand.phi)) {
        meldung.textContent = "Diese Phase hast du schon protokolliert — stelle ein anderes φ ein.";
        return;
      }
      if (!ablesungPOk(eingabe, zustand.phi)) {
        meldung.textContent = "✗ Schau noch einmal genau auf das Zählwerk D1: Teile die angezeigte Zahl durch " + N_PHOTONEN + " (auf etwa zwei Nachkommastellen genau).";
        return;
      }
      const z1 = zaehlrateReal(zustand.phi);
      zustand.messungen.push({ phi: zustand.phi, z1, z2: N_PHOTONEN - z1, pAbgelesen: eingabe, pOk: null });
      zustand.messungen.sort((a, b) => a.phi - b.phi);
      zustand.meldungMessen = "✓ Eingetragen: φ = " + zustand.phi + "°, z₁ = " + z1 + ", P(D1) = " + komma(eingabe, 3) + ".";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      const verschieden = new Set(zustand.messungen.map(z => z.phi)).size;
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Phasen — darunter eine nahe φ = 0° (Maximum) und eine nahe φ = 180° (Minimum). Bisher: ${verschieden} verschiedene Phasen.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const bew = bewertungKurve(zustand.messungen);
    const ermutigung = bew.stufe === "sehr gut" ? " Stark — sauber abgelesen!"
      : bew.stufe === "gut" ? " Ordentlich! Etwas genauer ablesen, dann liegt die Kurve noch glatter."
      : " Schau noch einmal auf einzelne Zeilen — die Punkte sollten der cos²-Kurve folgen.";
    const wM = zustand.wegMarkiert;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Trage <strong>P(D1) gegen φ</strong> auf. Die Punkte folgen der Theorie-Kurve <strong>P(D1) = cos²(φ/2)</strong>: Maximum 1 bei φ = 0° (alle Photonen in D1), Minimum 0 bei φ = 180° (kein Photon in D1), genau die Hälfte bei φ = 90°. Diese Kurve entsteht, obwohl immer nur <em>ein</em> Photon im Gerät war.</p>
      <h3>Diagramm: P(D1) über φ</h3>
      <canvas id="exp-diagramm" width="380" height="240" aria-label="Streudiagramm der relativen Häufigkeit P von D1 über der Phasendifferenz mit eingezeichneter Theoriekurve Kosinus-Quadrat von Phi halbe."></canvas>
      <table class="exp-tabelle">
        <thead><tr><th>φ in °</th><th>P(D1) gemessen</th><th>cos²(φ/2) Theorie</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map(z => `<tr>
          <td>${z.phi}</td><td>${komma(z.pAbgelesen, 3)}</td><td>${komma(pD1(z.phi), 3)}</td>
          <td>${Math.abs(z.pAbgelesen - pD1(z.phi)) <= P_TOLERANZ + 0.01 ? "✓" : "✗"}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-hinweis">
        <p><strong>Deine Kurve folgt cos²(φ/2)</strong> — mittlere Abweichung von der Theorie: ${komma(bew.abw, 1)} Prozentpunkte: <strong>${bew.stufe}</strong>.${ermutigung}</p>
      </div>
      <h3>Komplementarität: Welcher Weg?</h3>
      <p>Schalte jetzt den <strong>Weg-Markierer (WW)</strong> im unteren Weg ein. Er stellt fest, <em>welchen</em> Weg jedes einzelne Photon nimmt — du hättest also „Welcher-Weg-Information". Sende erneut und lies P(D1) ab.</p>
      <div class="exp-regler">
        <label><input type="checkbox" id="exp-ww"${zustand.markiert ? " checked" : ""}> Weg-Markierer einschalten (Welcher-Weg-Messung)</label>
        <label for="exp-phi2">Phase φ = <strong id="exp-phi2-wert">${zustand.phi}°</strong></label>
        <input type="range" id="exp-phi2" min="${PHI_MIN}" max="${PHI_MAX}" step="${PHI_SCHRITT}" value="${zustand.phi}" aria-label="Phasendifferenz in Grad für den Welcher-Weg-Versuch">
      </div>
      <p id="exp-ww-anzeige" aria-live="polite"></p>
      <form id="exp-ww-form" class="exp-ablesen">
        <label for="exp-ww-wert">Bei <strong>eingeschaltetem</strong> Markierer abgelesenes P(D1):</label>
        <input id="exp-ww-wert" inputmode="decimal" autocomplete="off" size="7" value="${wM ? komma(wM.p, 2) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-ww-meldung" class="exp-meldung" aria-live="polite"></p>
      ${wM ? `
      <div class="exp-hinweis">
        <p><strong>Mit Weg-Markierer: P(D1) ≈ ½ für jedes φ — das Interferenzmuster ist verschwunden!</strong> Sobald der Weg des Photons bestimmbar ist, verhält es sich wie ein klassisches Teilchen, das sich an Strahlteiler 1 zufällig für einen Weg entscheidet. Welleneigenschaft (Interferenz) und Welcher-Weg-Wissen schließen sich aus — das ist <strong>Bohrs Komplementaritätsprinzip</strong>.</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Es war stets nur <strong>ein</strong> Photon im Gerät. Wie entsteht trotzdem das Interferenzmuster P(D1) = cos²(φ/2)?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="selbst">Jedes Photon erkundet beide Wege und interferiert mit sich selbst</option>
          <option value="zwei">Zwei Photonen treffen sich am zweiten Strahlteiler</option>
          <option value="messfehler">Es ist ein Messfehler der Detektoren</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du schaltest den Weg-Markierer ein und „weißt" damit den Weg. Was passiert mit dem Interferenzmuster?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="weg">Es verschwindet — P(D1) ist dann ½ unabhängig von φ</option>
          <option value="staerker">Es wird stärker, weil man mehr weiß</option>
          <option value="verschoben">Es verschiebt sich nur um 180°</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum streuen die Punkte um die cos²-Kurve?</summary>
        <p><strong>Schrotrauschen (statistische Schwankung):</strong> Jedes Photon entscheidet sich zufällig für D1 oder D2 — bei P(D1) = 0,5 zählt D1 von 1000 Photonen mal 487, mal 512. Diese Schwankung ist unvermeidlich und geht mit ~√N: Bei 1000 Photonen liegt sie bei etwa ±16, also rund ±0,016 in der relativen Häufigkeit. Mit <em>mehr</em> Photonen wird die Kurve glatter.</p>
        <p><strong>Endliche Photonenzahl:</strong> P(D1) = cos²(φ/2) ist eine Wahrscheinlichkeit — sie zeigt sich erst im Mittel über viele Photonen. Aus einem einzelnen Photon (Klick bei D1 oder D2) lässt sich die Kurve nicht ablesen.</p>
        <p><strong>Phasenstabilität:</strong> Im echten Versuch verändern Temperaturschwankungen und Erschütterungen die Weglängen um Bruchteile einer Wellenlänge und damit φ. Das „verwischt" das Muster (geringerer Kontrast). Hier ist der Aufbau idealisiert stabil; die kleine Streuung steht stellvertretend für das Schrotrauschen.</p>
        <p><strong>Detektoreffizienz:</strong> Reale Einzelphotonendetektoren zählen nicht jedes Photon und haben Dunkelzählraten. Das senkt den Kontrast, ändert aber die Lage von Maxima und Minima nicht.</p>
      </details>`;

    zeichneDiagramm();

    // Welcher-Weg-Teil
    const wwBox = panel.querySelector("#exp-ww");
    const phi2 = panel.querySelector("#exp-phi2");
    const wwAnzeige = panel.querySelector("#exp-ww-anzeige");
    function wwAktualisieren() {
      const z1 = zaehlrateReal(zustand.phi, N_PHOTONEN, zustand.markiert);
      wwAnzeige.innerHTML = `Zählwerk D1 zeigt <strong>${z1}</strong> von ${N_PHOTONEN} → P(D1) = ${komma(z1 / N_PHOTONEN, 3)}` +
        (zustand.markiert ? " (Markierer <strong>an</strong>)" : " (Markierer aus)");
      zeichne();
    }
    wwAktualisieren();
    wwBox.addEventListener("change", () => { zustand.markiert = wwBox.checked; zustand.wegMarkiert = null; wwAktualisieren(); pulsAbspielen(); panelAuswerten(); });
    phi2.addEventListener("input", () => {
      zustand.phi = Math.round(Number(phi2.value) / PHI_SCHRITT) * PHI_SCHRITT;
      panel.querySelector("#exp-phi2-wert").textContent = zustand.phi + "°";
      wwAktualisieren();
    });
    panel.querySelector("#exp-ww-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-ww-wert").value);
      const meldung = panel.querySelector("#exp-ww-meldung");
      if (!zustand.markiert) {
        meldung.textContent = "Schalte zuerst den Weg-Markierer ein (Häkchen oben) und sende erneut.";
        return;
      }
      if (!ablesungPOk(eingabe, zustand.phi, N_PHOTONEN, true)) {
        meldung.textContent = "✗ Lies P(D1) bei eingeschaltetem Markierer ab (Zählwerk D1 ÷ " + N_PHOTONEN + "). Tipp: Es liegt jetzt nahe ½.";
        return;
      }
      zustand.wegMarkiert = { p: eingabe, wahr: relHaeufigkeit(zaehlrateReal(zustand.phi, N_PHOTONEN, true)) };
      panelAuswerten();
    });

    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "selbst" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "weg" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("mach-zehnder-messreihe.csv",
        ["phi in Grad", "z1 (D1)", "P(D1) gemessen", "cos^2(phi/2) Theorie"],
        zustand.messungen.map(z => [String(z.phi), String(z.z1), z.pAbgelesen, pD1(z.phi)]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => { zustand.markiert = false; wechslePhase("messen"); });
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      if (zustand.timer) { clearInterval(zustand.timer); zustand.timer = null; }
      Object.assign(zustand, {
        phi: 0, markiert: false, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        wegMarkiert: null, animPuls: 0, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  // ---------- Diagramm P(D1) über φ mit Theoriekurve ----------
  function zeichneDiagramm() {
    const c = panel.querySelector("#exp-diagramm");
    if (!c) return;
    const d = c.getContext("2d");
    const W = c.width, H = c.height, mL = 44, mR = 12, mT = 14, mB = 34;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    d.clearRect(0, 0, W, H);
    d.font = "11px system-ui, sans-serif";
    const px = phi => mL + (phi / 360) * (W - mL - mR);
    const py = p => H - mB - p * (H - mT - mB);
    // Achsen
    d.strokeStyle = cText; d.lineWidth = 1.5;
    d.beginPath(); d.moveTo(mL, mT); d.lineTo(mL, H - mB); d.lineTo(W - mR, H - mB); d.stroke();
    d.fillStyle = cLeise; d.textAlign = "center";
    d.fillText("φ in °", (mL + W - mR) / 2, H - 6);
    d.save(); d.translate(12, (mT + H - mB) / 2); d.rotate(-Math.PI / 2);
    d.fillText("P(D1)", 0, 0); d.restore();
    // Achsen-Ticks φ (0…360 in 90er-Schritten)
    d.textAlign = "center"; d.strokeStyle = cLeise; d.lineWidth = 1;
    for (let t = 0; t <= 360; t += 90) {
      d.beginPath(); d.moveTo(px(t), H - mB); d.lineTo(px(t), H - mB + 4); d.stroke();
      d.fillText(String(t), px(t), H - mB + 16);
    }
    d.textAlign = "end";
    for (let t = 0; t <= 1; t += 0.5) {
      d.beginPath(); d.moveTo(mL - 4, py(t)); d.lineTo(mL, py(t)); d.stroke();
      d.fillText(komma(t, 1), mL - 6, py(t) + 4);
    }
    // Theoriekurve cos²(φ/2)
    d.strokeStyle = cAkzent; d.lineWidth = 2; d.globalAlpha = 0.85;
    d.beginPath();
    for (let phi = 0; phi <= 360; phi += 3) {
      const x = px(phi), y = py(pD1(phi));
      if (phi === 0) d.moveTo(x, y); else d.lineTo(x, y);
    }
    d.stroke(); d.globalAlpha = 1;
    // Messpunkte
    d.fillStyle = cText;
    zustand.messungen.forEach(z => {
      d.beginPath(); d.arc(px(z.phi), py(z.pAbgelesen), 3.4, 0, 7); d.fill();
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Solange niemand misst, welchen Weg das Photon nimmt, beschreibt es eine Überlagerung beider Wege. Am zweiten Strahlteiler überlagern sich die beiden Anteile dieser einen Wahrscheinlichkeitswelle — je nach Phasendifferenz φ verstärken oder löschen sie sich aus. Das einzelne Photon interferiert mit sich selbst."
      : "✗ Nicht ganz: Es ist nachweislich immer nur ein Photon im Gerät, also treffen sich keine zwei Photonen, und die Detektoren arbeiten korrekt. Überlege, was passiert, wenn man dem einen Photon keinen festen Weg zuschreibt.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: Sobald der Weg bestimmbar ist, verschwindet die Interferenz vollständig — P(D1) = ½ für jedes φ. Das ist Komplementarität: Welcher-Weg-Wissen und Interferenzmuster lassen sich nicht gleichzeitig haben. (In der Variante „delayed choice“ entscheidet man das sogar erst, nachdem das Photon den ersten Strahlteiler passiert hat — das Ergebnis bleibt gleich.)"
      : "✗ Schau auf deine Messung mit eingeschaltetem Markierer: Das Muster wird nicht stärker und nicht nur verschoben, sondern es verschwindet ganz — P(D1) bleibt bei ½. Welleneigenschaft und Wegwissen schließen sich aus.";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    if (zustand.timer) { clearInterval(zustand.timer); zustand.timer = null; zustand.animPuls = 0; }
    zustand.phase = id;
    if (id === "aufbau") { zustand.markiert = false; panelAufbau(); }
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }
  wechslePhase("aufbau");
}
