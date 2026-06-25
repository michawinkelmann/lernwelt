// experiment.js — Interaktives Experiment: Kapazität eines Plattenkondensators (QP, gA+eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Plattenabstand d selbst einstellen,
// mit fester Spannung U₀ aufladen und die Ladung Q am Messverstärker SELBST ablesen.
// Aus jeder Zeile berechnen die Lernenden C = Q/U₀, tragen C gegen 1/d auf und gewinnen
// aus der Ursprungssteigung ε₀·A → daraus die elektrische Feldkonstante ε₀.
// Die kleine Ablesestreuung auf Q ist pro Abstand deterministisch geseedet — dadurch
// bleiben pruefFaelle und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, regression, esc, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const EPS0 = 8.854e-12;             // F/m — elektrische Feldkonstante (Literaturwert, nur intern!)
export const PLATTEN_RADIUS = 0.10;        // m — Kreisplatten r = 10 cm
export const A_PLATTE = Math.PI * PLATTEN_RADIUS * PLATTEN_RADIUS; // m² ≈ 0,031416
export const U0 = 100;                     // V — feste Ladespannung
export const D_MIN_MM = 1.0, D_MAX_MM = 10.0, D_SCHRITT_MM = 0.5; // mm
export const Q_STREU_SPANNE_NC = 0.8;      // nC — Ablesestreuung auf die Ladung (±0,4 nC)
export const Q_TOLERANZ_NC = 0.5;          // akzeptierte Ablesung: ±0,5 nC
export const C_TOLERANZ_PF = 6;            // C-Eingabe in pF: ±6 pF (Rundungs-/Ablesefenster)
export const EPS0_TOLERANZ = 0.6;          // ε₀-Eingabe in 10⁻¹² F/m: ±0,6
export const MIN_MESSUNGEN = 6;

// ---------- Physik (rein, Node-testbar) ----------
// Kapazität des Plattenkondensators aus der Geometrie: C = ε₀·A/d
export function C_ausGeometrie(dMeter) {
  return dMeter > 0 ? EPS0 * A_PLATTE / dMeter : NaN; // F
}
// Ladung bei fester Spannung U₀: Q = C·U₀
export function Q_ausGeometrie(dMeter) {
  return C_ausGeometrie(dMeter) * U0; // C
}
// wahre, abzulesende Ladung in nC inkl. reproduzierbarer Streuung (Messverstärker, Leckstrom)
export function Q_realNc(dMm) {
  const dM = dMm / 1000;
  return Q_ausGeometrie(dM) * 1e9 + streuung("q:" + dMm, Q_STREU_SPANNE_NC); // nC
}
// Auswertungsformel — die rechnen die Lernenden selbst, das System prüft nur:
// C = Q/U₀
export function C_ausMessung(qNc, uVolt) {
  return uVolt > 0 ? (qNc * 1e-9) / uVolt : NaN; // F
}
// ε₀ aus der Steigung der Geraden C über 1/d: Steigung m = ε₀·A  →  ε₀ = m/A
export function eps0_ausSteigung(steigung_Fm) {
  return steigung_Fm / A_PLATTE; // F/m
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungQOk(eingabeNc, wahrNc) {
  return ablesungOk(eingabeNc, wahrNc, Q_TOLERANZ_NC);
}
export function cEingabeOk(eingabePf, wahrPf) {
  return Number.isFinite(eingabePf) && Math.abs(eingabePf - wahrPf) <= C_TOLERANZ_PF;
}
export function eps0EingabeOk(eingabe1e12, wahr1e12) {
  return Number.isFinite(eingabe1e12) && Math.abs(eingabe1e12 - wahr1e12) <= EPS0_TOLERANZ;
}
export function bewertungEps0(eps0_1e12) {
  const abw = Math.abs(eps0_1e12 - EPS0 / 1e-12) / (EPS0 / 1e-12) * 100;
  if (abw <= 4) return { stufe: "sehr gut", abw };
  if (abw <= 10) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Plattenabstände
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.dMm)).size >= MIN_MESSUNGEN;
}
// ε₀ aus einer kompletten (idealen) Messreihe per Regression von C über 1/d
export function eps0AusReihe(messungen) {
  const punkte = messungen.map(z => ({ x: 1 / (z.dMm / 1000), y: z.cF }));
  return eps0_ausSteigung(regression(punkte).m); // F/m
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "C", d: 2.0, soll: 1.39082e-10, tol: 1e-14 },   // F   (ε₀·A/0,002)
  { art: "Q", d: 2.0, soll: 1.39082e-8, tol: 1e-12 },    // C   (C·100 V)
  { art: "C", d: 5.0, soll: 5.56329e-11, tol: 1e-14 },   // F
  { art: "halb", d: 4.0, tol: 1e-22 },                   // d verdoppeln → C halbiert (4 mm vs 8 mm)
  { art: "steigung", soll: 2.78164e-13, tol: 1e-17 }     // ε₀·A in F·m (Regressionssteigung C über 1/d)
];

export const TESTS = [
  { name: "Plattenfläche exakt: A = π·(0,10 m)² ≈ 0,031416 m²",
    ok: () => A_PLATTE === Math.PI * 0.10 * 0.10 && Math.abs(A_PLATTE - 0.0314159) < 1e-6 },
  { name: "Kontrollwert C: d = 2 mm → C = 139,08 pF (±0,01 pF)",
    ok: () => Math.abs(C_ausGeometrie(0.002) * 1e12 - 139.082) <= 0.01 },
  { name: "Kontrollwert Q: d = 2 mm, U₀ = 100 V → Q = 13,908 nC (±0,01 nC)",
    ok: () => Math.abs(Q_ausGeometrie(0.002) * 1e9 - 13.9082) <= 0.01 },
  { name: "Antiproportionalität C ∝ 1/d: d verdoppeln (4 mm → 8 mm) halbiert C exakt",
    ok: () => Math.abs(C_ausGeometrie(0.004) - 2 * C_ausGeometrie(0.008)) <= 1e-22
      && Math.abs(C_ausGeometrie(0.001) - 5 * C_ausGeometrie(0.005)) <= 1e-22 },
  { name: "Q = C·U₀ konsistent auf dem ganzen Raster",
    ok: () => { for (let d = D_MIN_MM; d <= D_MAX_MM + 1e-9; d += D_SCHRITT_MM) {
        const dM = Math.round(d * 10) / 10 / 1000;
        if (Math.abs(Q_ausGeometrie(dM) - C_ausGeometrie(dM) * U0) > 1e-20) return false;
      } return true; } },
  { name: "Auswertung invertiert exakt: aus idealem Q wird wieder C = ε₀·A/d",
    ok: () => [1, 2.5, 4, 6.5, 8, 10].every(dMm => {
      const qNc = Q_ausGeometrie(dMm / 1000) * 1e9;
      return Math.abs(C_ausMessung(qNc, U0) - C_ausGeometrie(dMm / 1000)) <= 1e-22; }) },
  { name: "Regressionssteigung von C über 1/d ≈ ε₀·A = 2,78164·10⁻¹³ F·m",
    ok: () => { const ideal = [1, 2, 3, 5, 7, 10].map(dMm =>
        ({ dMm, cF: C_ausGeometrie(dMm / 1000) }));
      return Math.abs(eps0AusReihe(ideal) - EPS0) <= 1e-18; } },
  { name: "ε₀ aus Steigung: Steigung/A liefert 8,854·10⁻¹² F/m (±10⁻¹⁵)",
    ok: () => Math.abs(eps0_ausSteigung(EPS0 * A_PLATTE) - EPS0) <= 1e-15 },
  { name: "Streugrenzen ±0,4 nC auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let d = D_MIN_MM; d <= D_MAX_MM + 1e-9; d += D_SCHRITT_MM) {
        const dMm = Math.round(d * 10) / 10;
        const ab = Math.abs(Q_realNc(dMm) - Q_ausGeometrie(dMm / 1000) * 1e9);
        if (ab > Q_STREU_SPANNE_NC / 2 + 1e-12) return false;
        if (ab > 1e-6) irgendStreu = true;
      }
      return irgendStreu && Q_realNc(3) === Q_realNc(3) && Q_realNc(3) !== Q_realNc(3.5); } },
  { name: "Ablese-/Eingabe-Toleranzen: Q ±0,5 nC, C ±6 pF, ε₀ ±0,6·10⁻¹²",
    ok: () => ablesungQOk(13.9, 13.91) && !ablesungQOk(14.5, 13.91) && !ablesungQOk(NaN, 13.91)
      && cEingabeOk(139, 139.08) && cEingabeOk(133.1, 139.08) && !cEingabeOk(132, 139.08)
      && eps0EingabeOk(8.9, 8.854) && eps0EingabeOk(8.3, 8.854)
      && !eps0EingabeOk(9.5, 8.854) && !eps0EingabeOk(NaN, 8.854) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("13,9") === 13.9 && parseDezimal("13.9") === 13.9 && Number.isNaN(parseDezimal("xyz")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen Abständen",
    ok: () => { const z = dMm => ({ dMm });
      const doppelt = [1, 1, 2, 2, 3, 3].map(z);
      const gut = [1, 2, 3, 5, 7, 10].map(z);
      return !messreiheVollstaendig(doppelt) && !messreiheVollstaendig(gut.slice(0, 5))
        && messreiheVollstaendig(gut); } },
  { name: "Bewertung: 8,854 → sehr gut · 9,3 → gut · 7,5 → nochmal prüfen",
    ok: () => bewertungEps0(8.854).stufe === "sehr gut" && bewertungEps0(9.3).stufe === "gut"
      && bewertungEps0(7.5).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "C") return Math.abs(C_ausGeometrie(p.d / 1000) - p.soll) <= p.tol;
      if (p.art === "Q") return Math.abs(Q_ausGeometrie(p.d / 1000) - p.soll) <= p.tol;
      if (p.art === "halb") return Math.abs(C_ausGeometrie(p.d / 1000) - 2 * C_ausGeometrie(2 * p.d / 1000)) <= p.tol;
      // steigung: ε₀·A
      return Math.abs(EPS0 * A_PLATTE - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Seitenansicht des Plattenkondensators) ----------
  const CX = 180, CY = 150;          // Mitte zwischen den Platten
  const PLATTE_H = 150;              // px Plattenhöhe (Seitenansicht)
  const PX_PRO_MM = 11;              // Maßstab: 1 mm Abstand ≙ 11 px
  const PLATTE_DICKE = 9;            // px

  const zustand = {
    phase: "aufbau",
    dMm: 2.0,
    vorhersageC: "", vorhersageQ: "",     // "groesser" | "kleiner" | "gleich"
    messungen: [],                         // {dMm, qNc, cEingabe, cPfWahr, cF, cOk}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    eps0Bestaetigt: null,                  // {eingabe, wahr} nach erfolgreicher ε₀-Bestimmung
    dielektrikum: { wahl: "", ok: null },  // eA-Bonusfrage
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
        <canvas id="exp-canvas" width="360" height="380" aria-label="Seitenansicht eines Plattenkondensators: zwei parallele Kreisplatten mit Radius 10 cm, oben die Plus-, unten die Minusplatte, dazwischen der einstellbare Abstand d mit eingezeichneter Maßskala in Millimeter. Beide Platten sind über eine 100-Volt-Quelle verbunden; rechts zeigt ein Messverstärker die gespeicherte Ladung Q in Nanocoulomb an."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersageC || !zustand.vorhersageQ;
  const cWahrPf = z => C_ausMessung(z.qNc, U0) * 1e12;

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    const dPx = zustand.dMm * PX_PRO_MM;
    const yOben = CY - dPx / 2;          // Unterkante obere Platte
    const yUnten = CY + dPx / 2;         // Oberkante untere Platte
    const halbB = PLATTE_H / 2;

    // homogenes Feld zwischen den Platten (nur in Durchführung sichtbar — Spannung liegt an)
    if (zustand.phase !== "aufbau") {
      ctx.strokeStyle = cAkzent; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
      const anzahl = 5;
      for (let i = 0; i < anzahl; i++) {
        const x = CX - halbB + 18 + i * (PLATTE_H - 36) / (anzahl - 1);
        ctx.beginPath(); ctx.moveTo(x, yOben + PLATTE_DICKE / 2 + 2); ctx.lineTo(x, yUnten - PLATTE_DICKE / 2 - 2); ctx.stroke();
        // Pfeilspitze nach unten (Feld zeigt von + nach −)
        const ya = yUnten - PLATTE_DICKE / 2 - 4;
        ctx.beginPath(); ctx.moveTo(x, ya); ctx.lineTo(x - 3, ya - 6); ctx.lineTo(x + 3, ya - 6); ctx.closePath(); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // obere Platte (+)
    ctx.fillStyle = cText;
    ctx.fillRect(CX - halbB, yOben - PLATTE_DICKE, PLATTE_H, PLATTE_DICKE);
    // untere Platte (−)
    ctx.fillRect(CX - halbB, yUnten, PLATTE_H, PLATTE_DICKE);
    // Plattenbeschriftung
    ctx.fillStyle = cText; ctx.textAlign = "end"; ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText("+", CX - halbB - 6, yOben - 1);
    ctx.fillText("–", CX - halbB - 6, yUnten + PLATTE_DICKE + 1);
    ctx.font = "12px system-ui, sans-serif";

    // Leitungen zur Quelle
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CX + halbB, yOben - PLATTE_DICKE / 2); ctx.lineTo(CX + halbB + 38, yOben - PLATTE_DICKE / 2);
    ctx.moveTo(CX + halbB, yUnten + PLATTE_DICKE / 2); ctx.lineTo(CX + halbB + 38, yUnten + PLATTE_DICKE / 2);
    ctx.stroke();

    // Maßskala für d (links der Platten)
    const xSkala = CX - halbB - 34;
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(xSkala, yOben); ctx.lineTo(xSkala, yUnten); ctx.stroke();
    [yOben, yUnten].forEach(y => { ctx.beginPath(); ctx.moveTo(xSkala - 4, y); ctx.lineTo(xSkala + 4, y); ctx.stroke(); });
    // Pfeilspitzen
    ctx.fillStyle = cLeise;
    ctx.beginPath(); ctx.moveTo(xSkala, yOben); ctx.lineTo(xSkala - 3, yOben + 6); ctx.lineTo(xSkala + 3, yOben + 6); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(xSkala, yUnten); ctx.lineTo(xSkala - 3, yUnten - 6); ctx.lineTo(xSkala + 3, yUnten - 6); ctx.closePath(); ctx.fill();
    ctx.save(); ctx.translate(xSkala - 10, CY); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.fillStyle = cLeise;
    ctx.fillText("d = " + komma(zustand.dMm, 1) + " mm", 0, 0);
    ctx.restore();

    // Plattenangabe
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Kreisplatten r = 10 cm  (A ≈ 314 cm²)", CX, 20);

    // Spannungsquelle + Messverstärker (Anzeigen unten)
    const kasten = (x, etikett, wert) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 318, 160, 46, 6); else ctx.rect(x, 318, 160, 46);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(etikett, x + 80, 335);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + 80, 355);
      ctx.font = "12px system-ui, sans-serif";
    };
    kasten(14, "Ladespannung (fest)", "U₀ = " + U0 + " V");
    // Messverstärker zeigt Ladung erst in der Durchführung an (aufgeladen)
    const qAnzeige = zustand.phase === "aufbau" ? "—" : komma(Q_realNc(zustand.dMm), 1) + " nC";
    kasten(186, "Messverstärker", "Q = " + qAnzeige);

    // Hinweistext im Aufbau
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(CX - 96, CY - 16, 192, 34);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Noch nicht aufgeladen —", CX, CY - 1);
      ctx.fillText("Q erscheint in der Durchführung", CX, CY + 14);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Ein <strong>Plattenkondensator</strong> aus zwei parallelen Kreisplatten (Radius r = 10 cm, also Plattenfläche A ≈ 0,0314 m²) steht im Luftspalt. Der <strong>Plattenabstand d</strong> lässt sich von 1 mm bis 10 mm verstellen. Über eine Quelle wird der Kondensator stets mit derselben <strong>Ladespannung U₀ = 100 V</strong> aufgeladen. Ein <strong>Messverstärker</strong> (Ladungsmessgerät) zeigt anschließend die gespeicherte <strong>Ladung Q</strong> in Nanocoulomb (1 nC = 10⁻⁹ C) an.</p>
      <p><strong>Idee der Messung:</strong> Die Kapazität sagt, wie viel Ladung der Kondensator pro Volt fasst: <strong>C = Q / U</strong>. Bei fester Spannung U₀ kannst du also aus dem abgelesenen Q direkt C bestimmen. Wie C vom Abstand d abhängt, findest du heraus, indem du d veränderst.</p>
      <p><strong>Plan:</strong> Stelle mindestens ${MIN_MESSUNGEN} <em>verschiedene</em> Abstände d ein, lade jeweils mit U₀ = 100 V auf und lies Q ab. In der Auswertung berechnest du für jede Zeile C = Q/U₀, trägst C gegen 1/d auf und gewinnst aus der Steigung die Feldkonstante ε₀.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-vc">Wenn ich den Plattenabstand d <em>vergrößere</em> (U₀ fest), wird die Kapazität C …</label>
      <select id="exp-vc" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… größer</option>
        <option value="kleiner">… kleiner</option>
        <option value="gleich">… bleibt (fast) gleich</option>
      </select>
      <label for="exp-vq">… und die gespeicherte Ladung Q wird dabei …</label>
      <select id="exp-vq" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… größer</option>
        <option value="kleiner">… kleiner</option>
        <option value="gleich">… bleibt (fast) gleich</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-vc").value = zustand.vorhersageC;
    panel.querySelector("#exp-vq").value = zustand.vorhersageQ;
    panel.querySelector("#exp-vc").addEventListener("change", ev => { zustand.vorhersageC = ev.target.value; });
    panel.querySelector("#exp-vq").addEventListener("change", ev => { zustand.vorhersageQ = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst beide Vorhersagen aus — gleich prüfst du sie selbst.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortAus = wahl => wahl === "groesser" ? "größer" : wahl === "kleiner" ? "kleiner" : "(fast) gleich";

  function beobachtungHtml() {
    const ds = [...new Set(zustand.messungen.map(z => z.dMm))].sort((a, b) => a - b);
    let html = `<p>Deine Vorhersage: d vergrößern → C wird <strong>${wortAus(zustand.vorhersageC)}</strong>, Q wird <strong>${wortAus(zustand.vorhersageQ)}</strong>. Probier es am Regler aus!</p>`;
    if (ds.length >= 2) {
      const okC = zustand.vorhersageC === "kleiner";
      const okQ = zustand.vorhersageQ === "kleiner";
      html += `<p>${okC ? "✓" : "✗"} Beobachtet: <strong>d größer → Q kleiner</strong>, und weil C = Q/U₀ ist, auch <strong>C kleiner</strong> (C ∝ 1/d). ${okC ? "Deine C-Vorhersage stimmt!" : "Deine C-Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
      html += `<p>${okQ ? "✓" : "✗"} Bei fester Spannung U₀ verändert sich Q genau wie C. ${okQ ? "Auch deine Q-Vorhersage stimmt!" : "Vergleiche: Q sinkt mit wachsendem d — wie C."}</p>`;
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
    const dsAnz = new Set(zustand.messungen.map(z => z.dMm)).size;
    let fortschritt = `${dsAnz} von mindestens ${MIN_MESSUNGEN} verschiedenen Abständen.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-d">Plattenabstand: d = <strong id="exp-d-wert">${komma(zustand.dMm, 1)} mm</strong></label>
        <input type="range" id="exp-d" min="${D_MIN_MM}" max="${D_MAX_MM}" step="${D_SCHRITT_MM}" value="${zustand.dMm}" aria-label="Plattenabstand in Millimeter">
      </div>
      <p>Ladespannung (fest): <strong>U₀ = ${U0} V</strong>. Nach dem Aufladen zeigt der Messverstärker die Ladung Q an — lies sie selbst ab.</p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies den Messverstärker ab — Ladung Q in nC:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>d in mm</th><th>U₀ in V</th><th>Q in nC</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${komma(z.dMm, 1)}</td><td>${U0}</td><td>${komma(z.qNc, 1)}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const dRegler = panel.querySelector("#exp-d");
    dRegler.addEventListener("input", () => {
      zustand.dMm = Math.round(Number(dRegler.value) * 10) / 10; // exakt auf Schrittweite — deterministische Streu-Schlüssel
      panel.querySelector("#exp-d-wert").textContent = komma(zustand.dMm, 1) + " mm";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.dMm === zustand.dMm)) {
        meldung.textContent = "Diesen Abstand hast du schon gemessen — stelle einen anderen d ein.";
        return;
      }
      const wahrQ = Q_realNc(zustand.dMm);
      if (!ablesungQOk(eingabe, wahrQ)) {
        meldung.textContent = "✗ Schau noch einmal genau auf die Anzeige des Messverstärkers (auf etwa 0,5 nC genau ablesen).";
        return;
      }
      zustand.messungen.push({
        dMm: zustand.dMm, qNc: eingabe,
        cEingabe: null, cPfWahr: C_ausMessung(eingabe, U0) * 1e12,
        cF: C_ausMessung(eingabe, U0), cOk: null
      });
      zustand.meldungMessen = "✓ Eingetragen — Q = " + komma(eingabe, 1) + " nC bei d = " + komma(zustand.dMm, 1) + " mm.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function zeichneDiagramm(cv) {
    if (!cv) return;
    const c = cv.getContext("2d"), w = cv.width, h = cv.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    c.clearRect(0, 0, w, h);
    c.font = "11px system-ui, sans-serif";
    const links = 52, unten = h - 30, oben = 14, rechts = w - 12;
    // Datenpunkte: x = 1/d in 1/m, y = C in pF (aus den Eingaben, sonst aus Messung)
    const punkte = zustand.messungen.map(z => ({
      x: 1 / (z.dMm / 1000),
      y: (z.cOk && z.cEingabe != null ? z.cEingabe : z.cPfWahr)
    }));
    const xMax = 1 / (D_MIN_MM / 1000) * 1.05;            // bis ~1050 1/m
    const yMax = Math.max(...punkte.map(p => p.y), C_ausGeometrie(D_MIN_MM / 1000) * 1e12) * 1.1;
    const sx = v => links + v / xMax * (rechts - links);
    const sy = v => unten - v / yMax * (unten - oben);
    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(links, oben); c.lineTo(links, unten); c.lineTo(rechts, unten); c.stroke();
    c.fillStyle = cLeise; c.textAlign = "center";
    c.fillText("1/d  in  1/m", (links + rechts) / 2, h - 6);
    c.save(); c.translate(14, (oben + unten) / 2); c.rotate(-Math.PI / 2);
    c.fillText("C in pF", 0, 0); c.restore();
    // Ausgleichsgerade durch den Ursprung (Regression aller bestätigten/Messpunkte)
    if (punkte.length >= 2) {
      const reg = regression(punkte);
      c.strokeStyle = cAkzent; c.lineWidth = 1.5; c.globalAlpha = 0.8;
      c.beginPath(); c.moveTo(sx(0), sy(reg.b)); c.lineTo(sx(xMax), sy(reg.m * xMax + reg.b)); c.stroke();
      c.globalAlpha = 1;
    }
    // Punkte
    c.fillStyle = cAkzent;
    punkte.forEach(p => { c.beginPath(); c.arc(sx(p.x), sy(p.y), 3.5, 0, 7); c.fill(); });
  }

  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Abstände — bisher: ${new Set(zustand.messungen.map(z => z.dMm)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.messungen.every(z => z.cOk === true);
    const eps0Wahr1e12 = EPS0 / 1e-12;
    const eb = zustand.eps0Bestaetigt;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Für jede Zeile gilt: <strong>C = Q / U₀</strong>. Rechne selbst (Taschenrechner!) und trage C in <strong>pF</strong> (Picofarad, 1 pF = 10⁻¹² F) ein — z. B. 139.</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für eine Zeile</summary>
        <p>1) Q in Coulomb: 13,9 nC = 13,9·10⁻⁹ C. 2) Durch U₀ = 100 V teilen: C = 13,9·10⁻⁹ ÷ 100 = 1,39·10⁻¹⁰ F. 3) In pF umrechnen: ·10¹² → 139 pF. 4) Mit ganzen pF eintragen.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>d in mm</th><th>Q in nC</th><th>1/d in 1/m</th><th>C in pF</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${komma(z.dMm, 1)}</td><td>${komma(z.qNc, 1)}</td><td>${komma(1 / (z.dMm / 1000), 0)}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.cEingabe == null ? "" : komma(z.cEingabe, 0)}" aria-label="Dein C für Zeile ${i + 1} in Picofarad"></td>
          <td>${z.cOk === true ? "✓" : z.cOk === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Zeilen prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <h3>C gegen 1/d auftragen</h3>
      <p>Trägst du deine berechneten C-Werte gegen 1/d auf, liegen sie auf einer <strong>Ursprungsgeraden</strong> — das bestätigt C ∝ 1/d. Aus C = ε₀·A/d = (ε₀·A)·(1/d) ist die <strong>Steigung</strong> dieser Geraden gerade <strong>ε₀·A</strong>.</p>
      <div class="exp-diagramm"><canvas id="exp-graph" width="330" height="220" aria-label="Diagramm: Kapazität C in Picofarad über 1/d in 1 durch Meter. Die Messpunkte liegen auf einer Ursprungsgeraden; ihre Steigung ist ε₀ mal Plattenfläche."></canvas></div>
      <p>Bestimme die Steigung deiner Geraden und gewinne daraus die Feldkonstante: <strong>ε₀ = Steigung / A</strong> mit A = ${komma(A_PLATTE * 1e4, 1)} cm² = ${komma(A_PLATTE, 4)} m². Gib ε₀ in <strong>10⁻¹² F/m</strong> an (Literaturwert liegt bei 8,854).</p>
      <form id="exp-eps-form" class="exp-ablesen">
        <label for="exp-eps">ε₀ in 10⁻¹² F/m:</label>
        <input id="exp-eps" inputmode="decimal" autocomplete="off" size="7" value="${eb ? komma(eb.eingabe, 2) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-eps-meldung" class="exp-meldung" aria-live="polite"></p>
      <details class="exp-fehler"><summary>Hilfe: Steigung und ε₀ berechnen</summary>
        <p>Steigung ≈ C / (1/d) für eine Zeile, am besten gemittelt — oder zwei weit auseinanderliegende Punkte: m = (C₂ − C₁)/(1/d₂ − 1/d₁). Achte auf Einheiten: C in <strong>Farad</strong> (pF · 10⁻¹²), 1/d in 1/m. Dann ε₀ = m / A. Erwartung: m ≈ 2,78·10⁻¹³ F·m, also ε₀ ≈ 8,85·10⁻¹² F/m.</p>
      </details>
      ${eb ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: ε₀ ≈ ${komma(eb.eingabe, 2)} · 10⁻¹² F/m</strong> (Literaturwert: 8,854 · 10⁻¹² F/m — Abweichung ${komma(bewertungEps0(eb.eingabe).abw, 1)} %: <strong>${bewertungEps0(eb.eingabe).stufe}</strong>). ${bewertungEps0(eb.eingabe).stufe === "sehr gut" ? "Stark — du hast eine Naturkonstante aus eigenen Messungen gewonnen!" : bewertungEps0(eb.eingabe).stufe === "gut" ? "Ordentlich! Mit kleinen Abständen (große C, gut ablesbar) und sauberer Steigung kommst du noch näher heran." : "Kein Drama: Prüfe die Einheiten der Steigung (Farad und 1/m) und nimm zwei weit auseinanderliegende Punkte."}</p>
      </div>` : ""}` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Du <strong>verdoppelst</strong> den Plattenabstand d bei fester Spannung. Was macht die Kapazität C?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="doppelt">C verdoppelt sich</option>
          <option value="gleich">C bleibt gleich</option>
          <option value="halb">C halbiert sich</option>
          <option value="viertel">C wird ein Viertel</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Warum hängt C <strong>nicht</strong> von der Ladespannung U₀ ab, obwohl C = Q/U in der Formel steht?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="proportional">Weil mit U auch Q proportional mitwächst — der Quotient C bleibt gleich</option>
          <option value="zufall">Das ist Zufall der Messung</option>
          <option value="klein">Weil U₀ zu klein ist, um C zu beeinflussen</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite">${esc(f2Feedback())}</p>
      ${fertig ? `
      <h3>Bonus (eA): Dielektrikum einschieben</h3>
      <p>Du schiebst bei festem Abstand und fester Spannung eine <strong>Glasplatte</strong> (Dielektrikum, ε<sub>r</sub> ≈ 5) genau passend zwischen die Platten. Die Kapazität wird dann C = ε<sub>r</sub>·ε₀·A/d. Was zeigt der Messverstärker für die Ladung Q?</p>
      <form id="exp-diel-form" class="exp-ablesen">
        <label for="exp-diel-wahl">Mit Glas zwischen den Platten ist die abgelesene Ladung Q …</label>
        <select id="exp-diel-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="groesser">… etwa 5-mal so groß</option>
          <option value="gleich">… unverändert</option>
          <option value="kleiner">… etwa 5-mal kleiner</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-diel-meldung" class="exp-meldung" aria-live="polite">${esc(dielFeedback())}</p>` : ""}
      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man nie exakt 8,854?</summary>
        <p><strong>Streufeld am Plattenrand:</strong> Die Formel C = ε₀·A/d gilt für ein <em>ideal homogenes</em> Feld. Am Rand wölben sich die Feldlinien nach außen, dort sitzt etwas mehr Ladung als das Modell vorsieht — das gemessene C (und damit ε₀) fällt systematisch etwas zu groß aus, besonders bei großem Abstand d.</p>
        <p><strong>Abstand ungenau einstellbar:</strong> Geht d in die Formel als 1/d ein, wirkt sich ein kleiner Abstandsfehler stark aus — bei d = 1 mm macht ein Zehntelmillimeter schon 10 % aus. Deshalb: bei kleinen Abständen besonders sorgfältig sein und mehrere Abstände mitteln.</p>
        <p><strong>Ablesung am Messverstärker &amp; Leckladung:</strong> Reale Ladungsmessgeräte verlieren über die Zeit etwas Ladung (Leckstrom), und die Anzeige rauscht. Deshalb zügig ablesen und die Werte über viele Abstände mitteln.</p>
        <p><strong>Strategie dagegen:</strong> viele verschiedene Abstände messen, kleine d (große, gut ablesbare Ladungen) einbeziehen, C gegen 1/d auftragen und die <em>Steigung</em> auswerten statt einer Einzelzeile — genau das hast du getan.</p>
      </details>`;

    if (fertig) zeichneDiagramm(panel.querySelector("#exp-graph"));

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.cEingabe = null; z.cOk = null; return; }
        z.cEingabe = wert;
        z.cOk = cEingabeOk(wert, cWahrPf(z));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (Zahl in pF, z. B. 139).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.cOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle Zeilen bestätigt — jetzt wertest du die Steigung aus."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±6 pF). Stolperfalle: Q in Coulomb (nC ÷ 10⁹), durch U₀ = 100 V teilen, dann ·10¹² für pF.";
      if (falsch > 0) zustand.eps0Bestaetigt = null;
      panelAuswerten();
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
      zustand.f2 = { wahl, ok: wahl === "proportional" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-eps-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-eps").value);
      if (!eps0EingabeOk(eingabe, eps0Wahr1e12)) {
        panel.querySelector("#exp-eps-meldung").textContent = "✗ Das passt noch nicht (±0,6). Bestimme die Steigung m deiner Geraden (C in Farad gegen 1/d in 1/m) und rechne ε₀ = m/A.";
        return;
      }
      zustand.eps0Bestaetigt = { eingabe, wahr: eps0Wahr1e12 };
      panelAuswerten();
    });
    panel.querySelector("#exp-diel-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-diel-wahl").value;
      zustand.dielektrikum = { wahl, ok: wahl === "groesser" };
      panelAuswerten();
    });
    if (zustand.dielektrikum.wahl) { const s = panel.querySelector("#exp-diel-wahl"); if (s) s.value = zustand.dielektrikum.wahl; }
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("kondensator-kapazitaet-messreihe.csv",
        ["d in mm", "U0 in V", "Q in nC", "1/d in 1/m", "C in pF"],
        zustand.messungen.map(z => [z.dMm, String(U0), z.qNc, 1 / (z.dMm / 1000),
          z.cEingabe == null ? "" : z.cEingabe]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        dMm: 2.0, vorhersageC: "", vorhersageQ: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        eps0Bestaetigt: null, dielektrikum: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! C = ε₀·A/d — der Abstand d steht im Nenner. Doppeltes d ⇒ halbe Kapazität. Kontrolle in deiner Tabelle: zwei Zeilen mit doppeltem d zeigen halbiertes C."
      : "✗ Schau auf C = ε₀·A/d: d steht im Nenner. Verdoppelst du d, halbiert sich C — es wächst nicht und bleibt auch nicht gleich.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: C = ε₀·A/d hängt nur von der Geometrie ab. Erhöhst du U, lädt der Kondensator proportional mehr Ladung Q nach — der Quotient C = Q/U bleibt konstant. Deshalb durftest du mit einer festen Spannung U₀ messen."
      : "✗ Nicht ganz: C ist eine Eigenschaft des Kondensators (Geometrie), kein Zufall und nicht von der Höhe von U abhängig. Der Trick: mit U wächst auch Q im gleichen Verhältnis, der Quotient bleibt gleich.";
  }
  function dielFeedback() {
    if (zustand.dielektrikum.ok === null || !zustand.dielektrikum.wahl) return "";
    return zustand.dielektrikum.ok
      ? "✓ Richtig: Das Dielektrikum erhöht C um den Faktor ε_r ≈ 5 (C = ε_r·ε₀·A/d). Bei fester Spannung ist Q = C·U₀, also wird auch die abgelesene Ladung etwa 5-mal so groß. So bestimmt man umgekehrt ε_r eines Materials."
      : "✗ Überlege mit C = ε_r·ε₀·A/d: ε_r ≈ 5 vergrößert C um das Fünffache. Weil Q = C·U₀ und U₀ fest ist, wächst auch Q auf das Fünffache — es wird nicht kleiner und bleibt nicht gleich.";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }
  // prefers-reduced-motion respektieren: keine Eigenanimation vorhanden — Hinweis nur dokumentiert
  void reduzierteBewegung;
  wechslePhase("aufbau");
}
