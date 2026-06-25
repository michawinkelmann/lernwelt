// experiment.js — Interaktives Experiment: Plancksches Wirkungsquantum h mit LEDs (Qualifikationsphase).
// Praktikumsnahe Messpraxis: eine LED bekannter Wellenlaenge waehlen, die Spannung am
// Feinregler langsam hochfahren und am empfindlichen Lichtsensor den Moment SELBST
// aufsuchen, in dem die LED gerade zu leuchten beginnt — die zugehoerige Spannung
// (Schwellenspannung U_S) am Voltmeter ablesen und notieren. Aus dem U_S-f-Diagramm
// (Ursprungsgerade, Steigung h/e) folgt das Plancksche Wirkungsquantum.
// Physikmodell: e·U_S = h·f = h·c/λ, also U_S = (h·c/e)·(1/λ).
// Die kleine Ablesestreuung ist pro (LED, Spannungsschritt) deterministisch geseedet —
// dadurch bleiben pruefFaelle und TESTS in Node analytisch pruefbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, esc, regression, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen } from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
export const H_EXAKT = 6.62607015e-34;  // Js (CODATA, exakt) — nur fuer die Modell-Selbstpruefung, NIE im UI als Sollwert
export const E_LADUNG = 1.602e-19;       // C — Elementarladung (Wert fuers Protokoll, aus dem Geschwister-Versuch)
export const E_EXAKT = 1.602176634e-19;  // C — exakter Wert, nur fuer die Modell-Selbstpruefung
export const C_LICHT = 2.99792458e8;     // m/s — Lichtgeschwindigkeit
export const U_MAX = 3.5;                // V — Stellbereich der LED-Spannung
export const U_SCHRITT_CENTI = 1;        // Feinregler in ganzen 0,01-V-Schritten (kein Float-Drift)
export const SCHWELL_TOLERANZ = 0.04;    // akzeptierte Abweichung beim U_S-Eintrag in V (±0,04)
export const I_DUNKEL = 0.04;            // Lichtsensor-Grundpegel in willkuerlichen Einheiten (Streulicht)
export const SENSOR_STEIGUNG = 9;        // Helligkeit pro Volt oberhalb der Schwelle (1/V)
export const RAUSCH_SPANNE = 0.02;       // Sensorrauschen am Grundpegel: ±0,01
export const MIN_MESSUNGEN = 5;          // mindestens 5 LEDs (verschiedene λ)

// LEDs des Steckbretts — Wellenlaenge intern bekannt, Farbwerte nur fuer die Zeichnung
export const LEDS = [
  { nm: 940, name: "infrarot", farbe: "#7a1f1f", unsichtbar: true },
  { nm: 635, name: "rot", farbe: "#e23b2e" },
  { nm: 590, name: "gelb", farbe: "#e0a911" },
  { nm: 525, name: "gruen", farbe: "#2da13c" },
  { nm: 470, name: "blau", farbe: "#2f5df0" },
  { nm: 405, name: "violett", farbe: "#7a2ff0" }
];

// ---------- Physikmodell (rein, Node-testbar) ----------
// Frequenz in Hz aus der Wellenlaenge in nm
export function frequenz(nm) { return C_LICHT / (nm * 1e-9); }
// Frequenz in Einheiten von 10¹⁴ Hz (so steht sie in der Messtabelle)
export function fIn1e14(nm) { return frequenz(nm) / 1e14; }
// ideale Schwellenspannung U_S in V aus e·U_S = h·c/λ
export function schwellspannung(nm) { return H_EXAKT * C_LICHT / (E_EXAKT * nm * 1e-9); }
// Helligkeit des Lichtsensors (willkuerliche Einheiten): unterhalb der Schwelle nur Grundpegel,
// oberhalb linear ansteigend (in Wahrheit eine Diodenkennlinie — fuers Aufsuchen der Schwelle reicht das)
export function helligkeitIdeal(nm, u) {
  const us = schwellspannung(nm);
  return u <= us ? I_DUNKEL : I_DUNKEL + SENSOR_STEIGUNG * (u - us);
}
// was der Sensor anzeigt: ideal + deterministisches Rauschen (±0,01) am Grundpegel
export function helligkeitGemessen(nm, u) {
  return helligkeitIdeal(nm, u) + streuung("L:" + nm + ":" + u.toFixed(2), RAUSCH_SPANNE);
}
// wahre, abgelesene Schwellenspannung inkl. reproduzierbarer Ablesestreuung (Augenmass am Sensor)
export function schwellspannungReal(nm) {
  return schwellspannung(nm) + streuung("US:" + nm, SCHWELL_TOLERANZ);
}
// Auswertungsformel — die rechnen die Lernenden selbst: h = Steigung · e
// Steigung m in Einheiten V/10¹⁴ Hz (so lesen sie sie aus dem Diagramm/der Tabelle ab)
export function hAusSteigung(m1e14, e = E_LADUNG) { return m1e14 * 1e-14 * e; }

// ---------- Eintrags- und Auswertungspruefungen ----------
// U_S selbst abgelesen: ±0,04 V um die wahre (gestreute) Schwellenspannung der LED
export function eintragOk(eingabe, nm) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - schwellspannungReal(nm)) <= SCHWELL_TOLERANZ;
}
// Regression ueber die Messtabelle: x = f in 10¹⁴ Hz, y = U_S in V → Ursprungsgerade, Steigung = h/e
export function auswertung(messungen) {
  const punkte = messungen.map(z => ({ x: fIn1e14(z.nm), y: z.us }));
  const { m, b } = regression(punkte);
  return { m, b, punkte };
}
// Schritt 1: Steigung ablesen (±4 % um die Regressionssteigung)
export function pruefeSteigung(eingabe, mRegr) {
  return Number.isFinite(eingabe) && Number.isFinite(mRegr) && Math.abs(eingabe - mRegr) <= 0.04 * Math.abs(mRegr);
}
// Schritt 2: h berechnen (Eingabe in 10⁻³⁴ Js, ±0,3 um e·m der eingetragenen Steigung)
export function pruefeH(eingabe1e34, m1e14) {
  return Number.isFinite(eingabe1e34) && Math.abs(eingabe1e34 - hAusSteigung(m1e14) * 1e34) <= 0.3;
}
// Bewertung des Endergebnisses (Eingabe in 10⁻³⁴ Js, Literaturwert 6,626)
export function bewertungH(h1e34) {
  const abw = Math.abs(h1e34 - 6.626) / 6.626 * 100;
  if (abw <= 4) return { stufe: "sehr gut", abw };
  if (abw <= 10) return { stufe: "gut", abw };
  return { stufe: "nochmal pruefen", abw };
}
// vollstaendige Messreihe: mindestens MIN_MESSUNGEN verschiedene LEDs (verschiedene λ)
export function messreiheVollstaendig(messungen) {
  return new Set(messungen.map(z => z.nm)).size >= MIN_MESSUNGEN;
}

// ---------- Prueffaelle (analytisch nachgerechnet, unabhaengig ermittelt) ----------
export const pruefFaelle = [
  { art: "US", nm: 635, soll: 1.953, tol: 0.002 },   // V — rote LED
  { art: "US", nm: 470, soll: 2.638, tol: 0.002 },   // V — blaue LED
  { art: "f", nm: 525, soll: 5.710, tol: 0.002 },    // 10¹⁴ Hz — gruene LED
  { art: "h", soll: 6.626, tol: 0.01 }               // 10⁻³⁴ Js (Pipeline aus perfekter Reihe)
];

function perfekteReihe() {
  return LEDS.map(l => ({ nm: l.nm, us: schwellspannung(l.nm) }));
}

export const TESTS = [
  { name: "U_S-Kontrollwerte: rot 1,953 V · gelb 2,101 V · blau 2,638 V · violett 3,062 V", ok: () =>
    [[635, 1.953], [590, 2.101], [470, 2.638], [405, 3.062]]
      .every(([nm, soll]) => Math.abs(schwellspannung(nm) - soll) < 0.002) },
  { name: "Linearitaet U_S ∝ 1/λ (Verhaeltnis = Wellenlaengen-Verhaeltnis)", ok: () =>
    Math.abs(schwellspannung(470) / schwellspannung(940) - 940 / 470) < 1e-9 &&
    Math.abs(schwellspannung(405) / schwellspannung(635) - 635 / 405) < 1e-9 },
  { name: "U_S ∝ f: U_S/f ist fuer alle LEDs konstant = h/e", ok: () => {
    const soll = H_EXAKT / E_EXAKT;
    return LEDS.every(l => Math.abs(schwellspannung(l.nm) / frequenz(l.nm) - soll) < 1e-12); } },
  { name: "Frequenz-Spalte (10¹⁴ Hz) korrekt vorgerechnet", ok: () =>
    [[940, 3.189], [635, 4.721], [590, 5.081], [525, 5.710], [470, 6.378], [405, 7.402]]
      .every(([nm, soll]) => Math.abs(fIn1e14(nm) - soll) < 0.002) },
  { name: "Perfekte Reihe → h = 6,626·10⁻³⁴ Js (Ursprungsgerade, exakt)", ok: () => {
    const { m } = auswertung(perfekteReihe());
    return Math.abs(hAusSteigung(m, E_EXAKT) * 1e34 - 6.626) < 0.005; } },
  { name: "Perfekte Reihe → Achsenabschnitt ≈ 0 (Gerade durch den Ursprung)", ok: () => {
    const { b } = auswertung(perfekteReihe());
    return Math.abs(b) < 1e-9; } },
  { name: "Auf 0,01 V gerundete Reihe → h auf ±0,3 genau", ok: () => {
    const reihe = perfekteReihe().map(z => ({ nm: z.nm, us: Math.round(z.us * 100) / 100 }));
    const { m } = auswertung(reihe);
    return Math.abs(hAusSteigung(m) * 1e34 - 6.626) <= 0.3; } },
  { name: "Sensor-Schwelle: unterhalb nur Grundpegel, oberhalb steigend; Nullpunkt exakt bei U_S", ok: () =>
    LEDS.every(l => {
      const us = schwellspannung(l.nm);
      return helligkeitIdeal(l.nm, us) === I_DUNKEL &&
        helligkeitIdeal(l.nm, Math.max(0, us - 0.2)) === I_DUNKEL &&
        helligkeitIdeal(l.nm, us + 0.1) > I_DUNKEL; }) },
  { name: "Helligkeit monoton wachsend, Rauschen deterministisch und ≤ ±0,01", ok: () =>
    LEDS.every(l => { let vorher = -Infinity;
      for (let c = 0; c <= 350; c += 5) { const u = c / 100;
        const i = helligkeitIdeal(l.nm, u);
        if (i < vorher - 1e-12) return false; vorher = i;
        if (Math.abs(helligkeitGemessen(l.nm, u) - helligkeitIdeal(l.nm, u)) > RAUSCH_SPANNE / 2 + 1e-12) return false;
        if (helligkeitGemessen(l.nm, u) !== helligkeitGemessen(l.nm, u + 0)) return false;
      }
      return true; }) },
  { name: "Ablesestreuung deterministisch und ≤ ±0,04 V auf allen LEDs", ok: () => {
    let irgendStreu = false;
    return LEDS.every(l => {
      const d = Math.abs(schwellspannungReal(l.nm) - schwellspannung(l.nm));
      if (d > SCHWELL_TOLERANZ + 1e-12) return false;
      if (d > 1e-6) irgendStreu = true;
      return schwellspannungReal(l.nm) === schwellspannungReal(l.nm);
    }) && irgendStreu; } },
  { name: "U_S-Eintrag: Toleranz ±0,04 V, Komma wie Punkt", ok: () => {
    const w = schwellspannungReal(635);
    return eintragOk(parseDezimal(komma(w, 2).replace(".", ",")), 635) &&
      eintragOk(w + 0.03, 635) && eintragOk(w - 0.03, 635) &&
      !eintragOk(w + 0.05, 635) && !eintragOk(NaN, 635); } },
  { name: "Auswertungs-Pruefungen: Steigung ±4 %, h ±0,3", ok: () => {
    const m = H_EXAKT / E_EXAKT * 1e14; // V pro 10¹⁴ Hz
    return pruefeSteigung(m, m) && pruefeSteigung(m * 1.03, m) && !pruefeSteigung(m * 1.06, m) && !pruefeSteigung(NaN, m) &&
      pruefeH(6.63, m) && !pruefeH(6.0, m) && !pruefeH(NaN, m); } },
  { name: "Bewertung: 6,63 → sehr gut · 6,30 → gut · 5,80 → nochmal pruefen", ok: () =>
    bewertungH(6.63).stufe === "sehr gut" && bewertungH(6.30).stufe === "gut" && bewertungH(5.80).stufe === "nochmal pruefen" },
  { name: "Messreihe vollstaendig erst ab 5 verschiedenen LEDs", ok: () => {
    const z = nm => ({ nm });
    const vier = [635, 590, 525, 470].map(z);
    const fuenfDoppelt = [635, 635, 590, 525, 470].map(z);
    const fuenf = [635, 590, 525, 470, 405].map(z);
    return !messreiheVollstaendig(vier) && !messreiheVollstaendig(fuenfDoppelt) && messreiheVollstaendig(fuenf); } },
  { name: "Prueffaelle konsistent", ok: () =>
    pruefFaelle.every(p => {
      if (p.art === "US") return Math.abs(schwellspannung(p.nm) - p.soll) <= p.tol;
      if (p.art === "f") return Math.abs(fIn1e14(p.nm) - p.soll) <= p.tol;
      const { m } = auswertung(perfekteReihe());
      return Math.abs(hAusSteigung(m, E_EXAKT) * 1e34 - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    phase: "aufbau",
    led: LEDS[1],                          // Start: rote LED (sichtbar)
    uCenti: 0,                             // LED-Spannung in ganzen 0,01-V-Schritten
    vorhersage: "",                        // "ir" | "rot" | "blau" | "gleich"
    messungen: [],                         // { nm, name, us }
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    ausw: { m: NaN, mOk: false, hWert: NaN, hOk: false },
    meldungMessen: "", meldungAuswerten: ""
  };
  const u = () => zustand.uCenti / 100;

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="460" aria-label="Versuchsaufbau: ein Steckbrett mit auswählbarer Leuchtdiode, davor ein lichtdichtes Röhrchen mit empfindlichem Lichtsensor. In der Durchführung fährt ein regelbares Netzgerät die LED-Spannung hoch; ein Voltmeter zeigt die Spannung, eine Balkenanzeige die gemessene Helligkeit. Ab der Schwellenspannung beginnt die LED zu leuchten und der Helligkeitsbalken steigt."></canvas>
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
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    const messen = zustand.phase !== "aufbau";
    const led = zustand.led;
    const us = schwellspannung(led.nm);
    const leuchtet = messen && u() > us;
    // Helligkeit 0..1 fuer die optische Darstellung (gedeckelt)
    const hellAnteil = leuchtet ? Math.min(1, (u() - us) / 0.8) : 0;

    // Lichtdichtes Gehaeuse (Box um LED + Sensor)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(40, 60, 280, 150, 10); else ctx.rect(40, 60, 280, 150);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("lichtdichtes Gehäuse", 180, 52);

    // LED links im Gehaeuse (kleines Halbrund + Beinchen)
    const lx = 110, ly = 135;
    if (leuchtet && !reduziert) {  // Lichthof um die leuchtende LED
      const grad = ctx.createRadialGradient(lx, ly, 4, lx, ly, 60);
      grad.addColorStop(0, led.farbe);
      grad.addColorStop(1, "rgba(0,0,0,0)");
      ctx.globalAlpha = 0.25 + 0.5 * hellAnteil;
      ctx.fillStyle = grad;
      ctx.beginPath(); ctx.arc(lx, ly, 60, 0, 7); ctx.fill();
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = leuchtet ? led.farbe : cFlaeche;
    if (leuchtet) ctx.globalAlpha = 0.4 + 0.6 * hellAnteil;
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(lx, ly, 16, Math.PI, 2 * Math.PI); ctx.lineTo(lx + 16, ly + 14); ctx.lineTo(lx - 16, ly + 14); ctx.closePath();
    ctx.fill(); ctx.globalAlpha = 1; ctx.stroke();
    // Beinchen
    ctx.beginPath(); ctx.moveTo(lx - 8, ly + 14); ctx.lineTo(lx - 8, ly + 44);
    ctx.moveTo(lx + 8, ly + 14); ctx.lineTo(lx + 8, ly + 44); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("LED", lx, ly + 60);
    ctx.fillStyle = cLeise;
    ctx.fillText(led.unsichtbar ? "(" + led.name + ", λ = " + led.nm + " nm)" : "(" + led.name + ", λ = " + led.nm + " nm)", lx, ly + 75);

    // Lichtsensor rechts im Gehaeuse (Roehrchen mit Photodiode)
    const sx = 250, sy = 135;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(sx - 22, sy - 18, 44, 36, 5); else ctx.rect(sx - 22, sy - 18, 44, 36);
    ctx.fill(); ctx.stroke();
    // Sensorpunkt (faerbt sich bei Licht)
    ctx.fillStyle = leuchtet ? led.farbe : cLeise;
    if (leuchtet) ctx.globalAlpha = 0.3 + 0.7 * hellAnteil;
    ctx.beginPath(); ctx.arc(sx, sy, 9, 0, 7); ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillStyle = cText; ctx.fillText("Lichtsensor", sx, sy + 60);

    // Lichtbuendel LED → Sensor (nur wenn es leuchtet)
    if (leuchtet) {
      ctx.strokeStyle = led.farbe; ctx.globalAlpha = 0.3 + 0.5 * hellAnteil; ctx.lineWidth = 2;
      for (let k = -1; k <= 1; k++) {
        ctx.beginPath(); ctx.moveTo(lx + 18, ly + k * 6); ctx.lineTo(sx - 22, sy + k * 4); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    // Voltmeter-Anzeige
    const kasten = (x, etikett, wert, breit = 150) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 410, breit, 40, 6); else ctx.rect(x, 410, breit, 40);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(etikett, x + breit / 2, 425);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + breit / 2, 442);
      ctx.font = "12px system-ui, sans-serif";
    };

    if (messen) {
      // Helligkeitsbalken (Lichtsensor-Anzeige)
      const bx = 60, by = 250, bw = 240, bh = 30;
      ctx.strokeStyle = cText; ctx.lineWidth = 1.5; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx, by, bw, bh, 5); else ctx.rect(bx, by, bw, bh);
      ctx.fill(); ctx.stroke();
      const hell = Math.max(0, helligkeitGemessen(led.nm, u()));
      const anteil = Math.min(1, hell / (I_DUNKEL + SENSOR_STEIGUNG * 0.8)); // Skala bis ~0,8 V ueber Schwelle
      ctx.fillStyle = leuchtet ? cAkzent : cLeise;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(bx + 2, by + 2, Math.max(3, (bw - 4) * anteil), bh - 4, 3);
      else ctx.rect(bx + 2, by + 2, Math.max(3, (bw - 4) * anteil), bh - 4);
      ctx.fill();
      ctx.fillStyle = cLeise; ctx.textAlign = "start";
      ctx.fillText("Lichtsensor — Helligkeit", bx, by - 8);
      ctx.fillStyle = cText; ctx.textAlign = "end";
      ctx.fillText(komma(hell, 2), bx + bw, by - 8);
      // Status-Hinweis
      ctx.textAlign = "center"; ctx.fillStyle = leuchtet ? cAkzent : cLeise;
      ctx.font = "bold 13px system-ui, sans-serif";
      ctx.fillText(leuchtet ? "LED leuchtet" : "noch dunkel", 180, by + bh + 22);
      ctx.font = "12px system-ui, sans-serif";

      kasten(50, "LED-Spannung", "U = " + komma(u(), 2) + " V");
      kasten(210, "Stell-Bereich", "0 … " + komma(U_MAX, 1) + " V");
    } else {
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Netzgerät aus —", 180, 255);
      ctx.fillText("in der Durchführung fährst du", 180, 273);
      ctx.fillText("die Spannung langsam hoch", 180, 291);
      kasten(105, "regelbares Netzgerät", "U = 0,00 V");
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Eine <strong>Leuchtdiode (LED)</strong> wandelt elektrische Energie direkt in Licht um: Fließt Strom, fällt je Elektron die Energie e·U frei, und ein Lichtteilchen (Photon) der Energie h·f entsteht. Die LED leuchtet aber erst ab einer bestimmten <strong>Schwellenspannung U<sub>S</sub></strong> — vorher reicht die Energie der Elektronen nicht aus, um Photonen der LED-Farbe zu erzeugen.</p>
      <p>Auf dem Steckbrett sitzen mehrere LEDs <strong>bekannter Wellenlänge λ</strong> (von infrarot bis violett). Über ein <strong>regelbares Netzgerät</strong> stellst du die Spannung ein, ein <strong>Voltmeter</strong> zeigt sie an. In einem lichtdichten Gehäuse blickt ein <strong>empfindlicher Lichtsensor</strong> auf die LED: Er zeigt schon das schwächste Leuchten an, das dein Auge noch gar nicht sieht.</p>
      <p><strong>Idee der Messung:</strong> Beim Einsetzen des Leuchtens reicht die Elektronenenergie gerade für ein Photon: <strong>e·U<sub>S</sub> = h·f = h·c/λ</strong>. Umgestellt: <strong>U<sub>S</sub> = (h·c/e) · (1/λ)</strong>. Trägt man U<sub>S</sub> gegen die Frequenz f = c/λ auf, ergibt sich eine <strong>Ursprungsgerade mit der Steigung h/e</strong> — daraus folgt h.</p>
      <p><strong>Plan:</strong> Bestimme U<sub>S</sub> für mindestens ${MIN_MESSUNGEN} LEDs verschiedener Farbe. Fahre dazu die Spannung langsam hoch und lies am Voltmeter die Spannung ab, bei der der Sensor <em>gerade</em> erstes Licht meldet.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Welche LED braucht die <strong>höchste</strong> Schwellenspannung U<sub>S</sub>, um zu leuchten?</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="ir">die infrarote (λ = 940 nm, langwellig)</option>
        <option value="rot">die rote (λ = 635 nm)</option>
        <option value="blau">die blaue (λ = 470 nm)</option>
        <option value="violett">die violette (λ = 405 nm, kurzwellig)</option>
        <option value="gleich">alle gleich — die Farbe ist egal</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-v").value = zustand.vorhersage;
    panel.querySelector("#exp-v").addEventListener("change", ev => { zustand.vorhersage = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst deine Vorhersage aus — gleich prüfst du sie selbst an den Messwerten.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortVorhersage = wahl => ({
    ir: "die infrarote", rot: "die rote", blau: "die blaue",
    violett: "die violette", gleich: "alle gleich"
  }[wahl] || "—");

  function beobachtungHtml() {
    const farben = new Set(zustand.messungen.map(z => z.nm));
    let html = `<p>Deine Vorhersage: höchstes U<sub>S</sub> braucht <strong>${wortVorhersage(zustand.vorhersage)}</strong>. Miss los und prüfe es!</p>`;
    if (farben.has(940) && farben.has(405)) {
      const ok = zustand.vorhersage === "violett";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>je kurzwelliger (blau/violett), desto höher U<sub>S</sub></strong> — die violette LED braucht am meisten, die infrarote am wenigsten (kurzwelliges Licht = energiereichere Photonen). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
    } else if (farben.size >= 2) {
      html += `<p>Schon erkennbar: Die LEDs schalten bei <em>verschiedenen</em> Spannungen ein. Miss auch die Randfarben (infrarot und violett), um die Reihenfolge sicher zu sehen.</p>`;
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
    const anzFarben = new Set(zustand.messungen.map(z => z.nm)).size;
    const schonGemessen = zustand.messungen.some(z => z.nm === zustand.led.nm);
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <label for="exp-led">LED auswählen:</label>
      <select id="exp-led" class="exp-wahl">
        ${LEDS.map((l, i) => `<option value="${i}"${l.nm === zustand.led.nm ? " selected" : ""}>${esc(l.name)} — λ = ${l.nm} nm${l.unsichtbar ? " (unsichtbar)" : ""}${zustand.messungen.some(z => z.nm === l.nm) ? " ✓ gemessen" : ""}</option>`).join("")}
      </select>
      <div class="exp-regler">
        <label for="exp-u">LED-Spannung langsam hochfahren: U = <strong id="exp-u-wert">${komma(u(), 2)} V</strong></label>
        <input type="range" id="exp-u" min="0" max="${Math.round(U_MAX * 100)}" step="${U_SCHRITT_CENTI}" value="${zustand.uCenti}" aria-label="LED-Spannung in Volt, in 0,01-Volt-Schritten">
      </div>
      <p>Lichtsensor: <strong id="exp-hell">${komma(Math.max(0, helligkeitGemessen(zustand.led.nm, u())), 2)}</strong> ${u() > schwellspannung(zustand.led.nm) ? "— LED leuchtet" : "— noch dunkel"}</p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Wo setzt das Leuchten gerade ein? Lies U<sub>S</sub> am Voltmeter ab (in V):</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7" value="${schonGemessen ? "" : komma(u(), 2)}">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>LED</th><th>λ in nm</th><th>f in 10¹⁴ Hz</th><th>U_S in V</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${esc(z.name)}</td><td>${z.nm}</td><td>${komma(fIn1e14(z.nm), 3)}</td><td>${komma(z.us, 2)}</td></tr>`).join("")
          || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${anzFarben} von mindestens ${MIN_MESSUNGEN} LEDs gemessen.</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const ledWahl = panel.querySelector("#exp-led");
    const uRegler = panel.querySelector("#exp-u");
    ledWahl.addEventListener("change", () => {
      zustand.led = LEDS[Number(ledWahl.value)];
      zustand.uCenti = 0;                  // neue LED: bei 0 V beginnen, sonst sieht man die Schwelle nicht
      zustand.meldungMessen = "";
      panelMessen();
    });
    uRegler.addEventListener("input", () => {
      zustand.uCenti = Math.round(Number(uRegler.value));
      panel.querySelector("#exp-u-wert").textContent = komma(u(), 2) + " V";
      const hellEl = panel.querySelector("#exp-hell");
      hellEl.textContent = komma(Math.max(0, helligkeitGemessen(zustand.led.nm, u())), 2);
      const wertFeld = panel.querySelector("#exp-wert");
      if (!zustand.messungen.some(z => z.nm === zustand.led.nm)) wertFeld.value = komma(u(), 2);
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.nm === zustand.led.nm)) {
        meldung.textContent = "Diese LED hast du schon gemessen — wähle oben eine andere Farbe.";
        return;
      }
      if (!eintragOk(eingabe, zustand.led.nm)) {
        meldung.textContent = "✗ Schau genauer hin: Fahre die Spannung in kleinen Schritten hoch und lies genau dort ab, wo der Helligkeitsbalken sich gerade vom Grundpegel löst (auf etwa 0,02–0,04 V genau).";
        return;
      }
      zustand.messungen.push({ nm: zustand.led.nm, name: zustand.led.name, us: eingabe });
      zustand.meldungMessen = "✓ Eingetragen: " + zustand.led.name + "-LED, U_S = " + komma(eingabe, 2) + " V. Wähle die nächste Farbe.";
      // automatisch zur naechsten ungemessenen LED springen (komfortabel)
      const naechste = LEDS.find(l => !zustand.messungen.some(z => z.nm === l.nm));
      if (naechste) { zustand.led = naechste; zustand.uCenti = 0; }
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function diagramm(canvasEl, punkte, mRegr) {
    const c = canvasEl.getContext("2d");
    const W = canvasEl.width, H = canvasEl.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    c.clearRect(0, 0, W, H);
    c.fillStyle = cFlaeche; c.fillRect(0, 0, W, H);
    const ml = 52, mr = 16, mt = 16, mb = 40;
    const px0 = ml, px1 = W - mr, py0 = H - mb, py1 = mt;
    // Achsen-Skalen (Ursprung sichtbar einschließen!)
    const xMax = 8, yMax = 3.5;            // 10¹⁴ Hz · V
    const X = x => px0 + (x / xMax) * (px1 - px0);
    const Y = y => py0 + (y / yMax) * (py1 - py0);
    // Gitter
    c.strokeStyle = cLeise; c.lineWidth = 0.5; c.globalAlpha = 0.5;
    c.font = "10px system-ui, sans-serif"; c.textAlign = "center";
    for (let x = 0; x <= xMax; x += 2) {
      c.beginPath(); c.moveTo(X(x), py0); c.lineTo(X(x), py1); c.stroke();
      c.fillStyle = cLeise; c.fillText(String(x), X(x), py0 + 14);
    }
    c.textAlign = "end";
    for (let y = 0; y <= yMax; y += 1) {
      c.beginPath(); c.moveTo(px0, Y(y)); c.lineTo(px1, Y(y)); c.stroke();
      c.fillStyle = cLeise; c.fillText(String(y), px0 - 6, Y(y) + 3);
    }
    c.globalAlpha = 1;
    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(px0, py1); c.lineTo(px0, py0); c.lineTo(px1, py0); c.stroke();
    c.fillStyle = cLeise; c.textAlign = "center";
    c.fillText("f in 10¹⁴ Hz", (px0 + px1) / 2, H - 6);
    c.save(); c.translate(12, (py0 + py1) / 2); c.rotate(-Math.PI / 2);
    c.fillText("U_S in V", 0, 0); c.restore();
    // Regressionsgerade durch den Ursprung-Bereich
    if (Number.isFinite(mRegr)) {
      const { b } = auswertung(zustand.messungen);
      c.strokeStyle = cAkzent; c.lineWidth = 2;
      c.beginPath(); c.moveTo(X(0), Y(b)); c.lineTo(X(xMax), Y(mRegr * xMax + b)); c.stroke();
    }
    // Messpunkte
    c.fillStyle = cText;
    punkte.forEach(p => { c.beginPath(); c.arc(X(p.x), Y(p.y), 3.5, 0, 7); c.fill(); });
  }

  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} LEDs verschiedener Farbe — bisher: ${new Set(zustand.messungen.map(z => z.nm)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const { m } = auswertung(zustand.messungen);
    zustand.ausw.m = m;
    const a = zustand.ausw;
    const bew = a.hOk ? bewertungH(a.hWert) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — Messen wie im Praktikum!"
      : bew.stufe === "gut" ? " Ordentlich! Mit sorgfältigerem Aufsuchen der Schwelle und allen sechs LEDs kommst du noch näher heran."
      : " Kein Drama: Prüfe die Einheiten (10⁻¹⁴ und e) und miss notfalls weitere LEDs.") : "";

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Trag U<sub>S</sub> gegen die Frequenz f auf. Weil <strong>e·U<sub>S</sub> = h·f</strong> gilt, ist das eine <strong>Ursprungsgerade</strong> mit der Steigung <strong>h/e</strong>. Aus der Steigung folgt h = Steigung · e.</p>
      <canvas id="exp-diagramm" width="330" height="220" aria-label="Diagramm: Schwellenspannung U_S über der Frequenz f. Die Messpunkte liegen auf einer Geraden durch den Ursprung; ihre Steigung ist h/e."></canvas>
      <details class="exp-fehler"><summary>Hilfe: Steigung aus dem Diagramm ablesen</summary>
        <p>Nimm zwei weit auseinander liegende Punkte deiner Geraden, z. B. die infrarote (f ≈ 3,19 · 10¹⁴ Hz) und die violette LED (f ≈ 7,40 · 10¹⁴ Hz). Steigung = ΔU<sub>S</sub> / Δf. Da die Gerade durch den Ursprung geht, kannst du auch einfach U<sub>S</sub>/f einer einzelnen LED nehmen. Trage die Steigung in <strong>V pro 10¹⁴ Hz</strong> ein (z. B. 0,41).</p>
      </details>
      <h3>Schritt 1 · Steigung der Geraden</h3>
      <form id="exp-m-form" class="exp-ablesen">
        <label for="exp-m">Steigung in V pro 10¹⁴ Hz:</label>
        <input id="exp-m" inputmode="decimal" autocomplete="off" size="7" value="${Number.isFinite(a.m) && a.mOk ? komma(a.m, 3) : ""}">
        <button class="knopf">Steigung prüfen</button>
      </form>
      <p id="exp-m-meldung" class="exp-meldung" aria-live="polite">${a.mOk ? "✓ Steigung passt — sie entspricht h/e." : ""}</p>
      ${a.mOk ? `
      <h3>Schritt 2 · h berechnen</h3>
      <p>Aus der Steigung folgt <strong>h = Steigung · e</strong>. Die Elementarladung ist e = 1,602 · 10⁻¹⁹ C (aus dem Millikan-Versuch). Achte auf den Faktor 10⁻¹⁴ der Frequenzachse! Gib h in <strong>10⁻³⁴ Js</strong> an.</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für h</summary>
        <p>Steigung steht in V pro 10¹⁴ Hz. Echte Steigung in V·s = Steigung · 10⁻¹⁴. Dann h = (Steigung · 10⁻¹⁴) · 1,602·10⁻¹⁹ Js — eine winzige Zahl um 6,6·10⁻³⁴. Durch 10⁻³⁴ teilen und eintragen (z. B. 6,63).</p>
      </details>
      <form id="exp-h-form" class="exp-ablesen">
        <label for="exp-h">h in 10⁻³⁴ Js:</label>
        <input id="exp-h" inputmode="decimal" autocomplete="off" size="7" value="${a.hOk ? komma(a.hWert, 2) : ""}">
        <button class="knopf">h prüfen</button>
      </form>
      <p id="exp-h-meldung" class="exp-meldung" aria-live="polite"></p>` : ""}
      ${a.hOk && bew ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: h ≈ ${komma(a.hWert, 2)} · 10⁻³⁴ Js.</strong> Literaturwert: 6,626 · 10⁻³⁴ Js — Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung}</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Warum geht die U<sub>S</sub>-f-Gerade (im Idealfall) durch den <strong>Ursprung</strong>?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="messfehler">Reiner Messfehler — eigentlich sollte sie es nicht</option>
          <option value="proportional">Weil e·U_S = h·f ist: U_S ist direkt proportional zu f, ohne Sockel</option>
          <option value="austritt">Wegen einer Austrittsarbeit wie beim Photoeffekt</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Eine LED leuchtet <strong>grün</strong>, eine andere <strong>rot</strong>. Welche braucht die höhere Schwellenspannung?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="rot">die rote (längere Wellenlänge)</option>
          <option value="gruen">die grüne (kürzere Wellenlänge, höhere Frequenz)</option>
          <option value="gleich">beide gleich</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man nie exakt 6,626?</summary>
        <p><strong>Die Schwelle ist nicht scharf:</strong> Eine LED beginnt nicht schlagartig zu leuchten — der Strom setzt über einen kleinen Spannungsbereich allmählich ein. Wo genau „erstes Licht“ liegt, ist Auslegungssache von einigen Hundertstel Volt. Deshalb empfindlicher Sensor, langsames Hochfahren und mehrere LEDs zum Mitteln.</p>
        <p><strong>Systematischer Sockel:</strong> Reale LEDs zeigen oft ein U<sub>S</sub>, das etwas <em>unter</em> h·f/e liegt (Tunnel- und thermische Effekte) oder durch den Vorwiderstand und Bahnwiderstände verschoben ist. Die Gerade trifft den Ursprung dann nicht exakt — ein kleiner Achsenabschnitt bleibt. Das Modell e·U<sub>S</sub> = h·f ist eine sehr gute Näherung, aber eben eine Näherung.</p>
        <p><strong>Wellenlängen-Streuung:</strong> „635 nm“ ist die Spitzenwellenlänge; eine LED strahlt in einem Band von einigen zehn Nanometern. Die angesetzte Frequenz ist also leicht idealisiert.</p>
        <p><strong>Strategie dagegen:</strong> alle verfügbaren LEDs messen, die Schwelle reproduzierbar definieren (immer derselbe Sensorpegel) und die Steigung über die gesamte Gerade bestimmen statt aus einem Punkt — genau das hast du getan.</p>
      </details>`;

    const dia = panel.querySelector("#exp-diagramm");
    if (dia) diagramm(dia, auswertung(zustand.messungen).punkte, a.mOk ? a.m : NaN);

    panel.querySelector("#exp-m-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-m").value);
      if (!pruefeSteigung(eingabe, m)) {
        panel.querySelector("#exp-m-meldung").textContent = "✗ Das passt noch nicht (±4 %). Tipp: Bei einer Ursprungsgeraden ist die Steigung = U_S/f einer einzelnen LED — probiere die violette: ihr U_S geteilt durch f ≈ 7,40.";
        a.mOk = false; a.hOk = false; return;
      }
      a.m = eingabe; a.mOk = true; a.hOk = false; a.hWert = NaN;
      panelAuswerten();
    });
    panel.querySelector("#exp-h-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-h").value);
      if (!pruefeH(eingabe, a.m)) {
        panel.querySelector("#exp-h-meldung").textContent = "✗ Das passt noch nicht (±0,3). Häufigste Falle: den Faktor 10⁻¹⁴ der Frequenzachse vergessen. Rechne h = (Steigung · 10⁻¹⁴) · 1,602·10⁻¹⁹ und gib das Ergebnis in 10⁻³⁴ Js an.";
        a.hOk = false; return;
      }
      a.hWert = eingabe; a.hOk = true;
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "proportional" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "gruen" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("h-led-messreihe.csv",
        ["LED", "lambda in nm", "f in 10^14 Hz", "U_S in V"],
        zustand.messungen.map(z => [z.name, String(z.nm), fIn1e14(z.nm), z.us]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        led: LEDS[1], uCenti: 0, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        ausw: { m: NaN, mOk: false, hWert: NaN, hOk: false },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! e·U_S = h·f hat keinen konstanten Summanden — U_S ist direkt proportional zu f. Bei f = 0 wäre auch U_S = 0, die Gerade läuft durch den Ursprung. (Anders als beim Photoeffekt, wo eine Austrittsarbeit den Geraden-Schnittpunkt verschiebt.)"
      : "✗ Nicht ganz: Schau auf e·U_S = h·f. Da steht kein konstanter Zusatzterm — U_S ist schlicht proportional zu f. Eine Austrittsarbeit wie beim Photoeffekt gibt es bei der LED nicht.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: Grün ist kurzwelliger als Rot, also höhere Frequenz f und nach U_S = (h/e)·f auch höhere Schwellenspannung. Kontrolle in deiner Tabelle: grün ≈ 2,16 V, rot ≈ 1,95 V."
      : "✗ Schau auf U_S = (h·c/e)·(1/λ): kleineres λ (grün) bedeutet größeres U_S. Grün braucht also mehr als Rot — prüfe es an deiner Tabelle.";
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
