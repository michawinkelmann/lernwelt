// experiment.js — Interaktives Experiment: Magnetfeld einer Spule mit der Hallsonde (QP, gA + eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Den Spulenstrom I selbst einstellen,
// das Magnetfeld B im Inneren der langen Spule mit der Hallsonde SELBST ablesen,
// die Messreihe protokollieren und B(I) auswerten. Die Spule hat N = 500 Windungen
// auf L = 0,500 m, also Windungsdichte n = N/L = 1000 1/m (gegeben). Im langen
// Solenoid gilt B = µ₀·n·I; eine Auftragung B gegen I liefert eine Ursprungsgerade
// mit der Steigung µ₀·n. eA: aus der Steigung µ₀ rückrechnen. gA: B ∝ I bestätigen
// und B/I mitteln. Die kleine Ablesestreuung ist pro I deterministisch geseedet —
// dadurch bleiben pruefFaelle und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, regression, esc, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const MU0 = 4 * Math.PI * 1e-7;     // Vs/(Am) — Literaturwert ≈ 1,2566·10⁻⁶
export const WINDUNGEN = 500;              // N
export const SPULENLAENGE = 0.500;         // m
export const WINDUNGSDICHTE = WINDUNGEN / SPULENLAENGE;   // n = 1000 1/m (gegeben)
export const I_MIN = 0, I_MAX = 5.0, I_SCHRITT = 0.25;    // A
export const B_STREU_SPANNE = 0.04e-3;     // T — Hallsonden-/Ablesestreuung auf B (±0,02 mT)
export const B_TOLERANZ_MT = 0.05;         // akzeptierte Ablesung in mT: ±0,05 mT
export const MU0_REFERENZ_1E7 = MU0 / 1e-7; // = 12,566… (Eingabewert in 10⁻⁷ Vs/Am)
export const MU0_TOLERANZ_1E7 = 0.8;       // µ₀-Eingabe in 10⁻⁷ Vs/Am: ±0,8
export const MIN_MESSUNGEN = 6;

// ---------- Physik (rein, Node-testbar) ----------
// Feld im Inneren der langen Spule: B = µ₀ · n · I
export function feld(iAmp) {
  return MU0 * WINDUNGSDICHTE * iAmp; // T
}
// wahres Hallsonden-Messsignal inkl. reproduzierbarer Streuung (Rauschen, Ablesung)
export function feldReal(iAmp) {
  if (iAmp <= 0) return 0; // bei I = 0 liegt kein Feld an (Nullpunkt sauber)
  return feld(iAmp) + streuung("b:" + iAmp.toFixed(2), B_STREU_SPANNE); // T
}
// Auswertung: aus der Regressionssteigung der Geraden B = (µ₀·n)·I folgt µ₀
export function mu0AusSteigung(steigungTproA) {
  return WINDUNGSDICHTE > 0 ? steigungTproA / WINDUNGSDICHTE : NaN; // Vs/(Am)
}
// gA-Auswertung: B/I muss konstant ≈ µ₀·n sein (Proportionalität)
export function quotientBdurchI(bTesla, iAmp) {
  return iAmp > 0 ? bTesla / iAmp : NaN; // T/A
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungBOk(eingabeMt, wahrBTesla) {
  return ablesungOk(eingabeMt, wahrBTesla * 1000, B_TOLERANZ_MT);
}
export function mu0EingabeOk(eingabe1e7, wahr1e7) {
  return Number.isFinite(eingabe1e7) && Math.abs(eingabe1e7 - wahr1e7) <= MU0_TOLERANZ_1E7;
}
export function bewertungMu0(mittel1e7) {
  const abw = Math.abs(mittel1e7 - MU0_REFERENZ_1E7) / MU0_REFERENZ_1E7 * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Stromstärken (für eine saubere Gerade)
export function messreiheVollstaendig(messungen) {
  return new Set(messungen.map(z => z.I)).size >= MIN_MESSUNGEN;
}
// Regression über die selbst abgelesenen (I, B)-Paare; x = I in A, y = B in T
export function regressionAusMessungen(messungen) {
  return regression(messungen.map(z => ({ x: z.I, y: z.bTesla })));
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "n", soll: 1000, tol: 1e-9 },                 // 1/m
  { art: "B", I: 1.0, soll: 1.2566e-3, tol: 1e-6 },    // T (= µ₀·n·1)
  { art: "B", I: 2.0, soll: 2.5133e-3, tol: 1e-6 },    // T
  { art: "B", I: 5.0, soll: 6.2832e-3, tol: 1e-6 },    // T
  { art: "steigung", soll: 1.2566e-3, tol: 1e-6 },     // T/A (= µ₀·n)
  { art: "mu0", soll: 1.2566e-6, tol: 1e-9 }           // Vs/(Am) (= Steigung/n)
];

export const TESTS = [
  { name: "Windungsdichte exakt: n = N/L = 500/0,5 = 1000 1/m",
    ok: () => WINDUNGSDICHTE === 1000 && Math.abs(WINDUNGSDICHTE - 1000) < 1e-9 },
  { name: "Kontrollwert B: I = 1,0 A → B = 1,2566·10⁻³ T (±10⁻⁶)",
    ok: () => Math.abs(feld(1.0) - 1.2566e-3) <= 1e-6 },
  { name: "Kontrollwert B: I = 2,0 A → B = 2,5133·10⁻³ T (±10⁻⁶)",
    ok: () => Math.abs(feld(2.0) - 2.5133e-3) <= 1e-6 },
  { name: "Kontrollwert B: I = 5,0 A → B = 6,2832·10⁻³ T (±10⁻⁶)",
    ok: () => Math.abs(feld(5.0) - 6.2832e-3) <= 1e-6 },
  { name: "Proportionalität B ∝ I: B(2I) = 2·B(I) exakt",
    ok: () => [0.5, 1.0, 1.75, 2.5].every(i =>
      Math.abs(feld(2 * i) - 2 * feld(i)) <= 1e-15) },
  { name: "Steigung µ₀·n: B(I)/I konstant = 1,2566·10⁻³ T/A bei jedem I>0",
    ok: () => [0.25, 1.0, 2.5, 5.0].every(i =>
      Math.abs(quotientBdurchI(feld(i), i) - MU0 * WINDUNGSDICHTE) <= 1e-12)
      && Math.abs(MU0 * WINDUNGSDICHTE - 1.2566e-3) <= 1e-6 },
  { name: "µ₀ aus Steigung rückgerechnet: Steigung/n = µ₀ = 1,2566·10⁻⁶ Vs/Am",
    ok: () => Math.abs(mu0AusSteigung(MU0 * WINDUNGSDICHTE) - MU0) <= 1e-15
      && Math.abs(mu0AusSteigung(1.2566e-3) - 1.2566e-6) <= 1e-9 },
  { name: "Regression über ideale (I,B)-Punkte liefert Steigung = µ₀·n, b ≈ 0",
    ok: () => { const pkt = [0, 1, 2, 3, 4, 5].map(i => ({ I: i, bTesla: feld(i) }));
      const r = regressionAusMessungen(pkt);
      return Math.abs(r.m - MU0 * WINDUNGSDICHTE) <= 1e-9 && Math.abs(r.b) <= 1e-12; } },
  { name: "Regression über reale (gestreute) Daten trifft µ₀ auf ±0,8·10⁻⁷",
    ok: () => { const ist = [0.5, 1.0, 1.5, 2.5, 3.5, 4.5, 5.0]
        .map(i => ({ I: i, bTesla: feldReal(i) }));
      const r = regressionAusMessungen(ist);
      return mu0EingabeOk(mu0AusSteigung(r.m) / 1e-7, MU0_REFERENZ_1E7); } },
  { name: "Hallsonden-Streuung ±0,02 mT auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let c = 25; c <= 500; c += 25) { const i = c / 100;
        const d = Math.abs(feldReal(i) - feld(i));
        if (d > B_STREU_SPANNE / 2 + 1e-15) return false;
        if (d > 1e-9) irgendStreu = true;
      }
      return irgendStreu && feldReal(2.5) === feldReal(2.5)
        && feldReal(2.5) !== feldReal(2.75) && feldReal(0) === 0; } },
  { name: "Ablese-Toleranz B ±0,05 mT (in mT geprüft)",
    ok: () => ablesungBOk(2.51, 2.5133e-3) && ablesungBOk(2.55, 2.5133e-3)
      && !ablesungBOk(2.58, 2.5133e-3) && !ablesungBOk(NaN, 2.5133e-3) },
  { name: "µ₀-Eingabe-Toleranz ±0,8·10⁻⁷ um 12,566",
    ok: () => mu0EingabeOk(12.6, MU0_REFERENZ_1E7) && mu0EingabeOk(13.3, MU0_REFERENZ_1E7)
      && mu0EingabeOk(11.8, MU0_REFERENZ_1E7)
      && !mu0EingabeOk(13.4, MU0_REFERENZ_1E7) && !mu0EingabeOk(NaN, MU0_REFERENZ_1E7) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("2,51") === 2.51 && parseDezimal("2.51") === 2.51 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen Stromstärken",
    ok: () => { const z = I => ({ I, bTesla: feld(I) });
      const wenig = [0.5, 1, 1.5, 2, 2.5].map(z);
      const doppelt = [1, 1, 2, 2, 3, 3].map(z);  // nur 3 verschiedene
      const gut = [0.5, 1, 2, 3, 4, 5].map(z);
      return !messreiheVollstaendig(wenig) && !messreiheVollstaendig(doppelt)
        && messreiheVollstaendig(gut); } },
  { name: "Bewertung: 12,566 → sehr gut · 12,0 → gut · 10,5 → nochmal prüfen",
    ok: () => bewertungMu0(12.566).stufe === "sehr gut" && bewertungMu0(12.0).stufe === "gut"
      && bewertungMu0(10.5).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "n") return Math.abs(WINDUNGSDICHTE - p.soll) <= p.tol;
      if (p.art === "B") return Math.abs(feld(p.I) - p.soll) <= p.tol;
      if (p.art === "steigung") return Math.abs(MU0 * WINDUNGSDICHTE - p.soll) <= p.tol;
      return Math.abs(mu0AusSteigung(MU0 * WINDUNGSDICHTE) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Längsschnitt durch die Spule) ----------
  const SP_X = 40, SP_BREITE = 280;        // Spulenrahmen (Solenoid) links→rechts
  const SP_Y = 70, SP_HOEHE = 110;         // Spulenrahmen oben/unten
  const SP_MITTE_Y = SP_Y + SP_HOEHE / 2;  // Längsachse
  const SONDE_X = SP_X + SP_BREITE * 0.5;  // Hallsonde sitzt mittig im Inneren

  const zustand = {
    phase: "aufbau",
    I: 2.0,
    vorhersage: "",                         // "linear" | "konstant" | "wurzel"
    messungen: [],                          // {I, bTesla, bEingabeMt}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    mu0Eingabe: null, mu0Ok: null,          // eA-Auswertung über Regression
    quotientGeprueft: false,                // gA-Auswertung über Mittel von B/I
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
        <canvas id="exp-canvas" width="360" height="300" aria-label="Längsschnitt durch eine lange Zylinderspule: die Windungen als Querschnittspunkte oben und unten, gestrichelt die nahezu parallelen Feldlinien im homogenen Inneren. Mittig steckt eine Hallsonde, die das Magnetfeld misst. In der Durchführung verdichten sich die Feldlinien mit steigendem Spulenstrom; unten Anzeigen für Spulenstrom und Messsignal der Hallsonde."></canvas>
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
    ctx.lineWidth = 1.5;

    // Feldlinien im Inneren (Dichte ∝ B, also ∝ I) — nur ab Durchführung sichtbar
    const feldAktiv = zustand.phase !== "aufbau" && zustand.I > 0;
    if (feldAktiv) {
      // Anzahl Linien proportional zum Strom (homogenes Innenfeld → parallele Linien)
      const linien = Math.max(1, Math.round(zustand.I / I_MAX * 7) + 1);
      ctx.strokeStyle = cAkzent; ctx.globalAlpha = 0.5; ctx.lineWidth = 1.5;
      for (let k = 0; k < linien; k++) {
        const y = SP_Y + 14 + (SP_HOEHE - 28) * (linien === 1 ? 0.5 : k / (linien - 1));
        ctx.beginPath();
        ctx.setLineDash([8, 6]);
        ctx.moveTo(SP_X + 8, y); ctx.lineTo(SP_X + SP_BREITE - 8, y);
        ctx.stroke();
        ctx.setLineDash([]);
        // Pfeilspitze (Feldrichtung nach rechts)
        const px = SP_X + SP_BREITE - 8;
        ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px - 9, y - 4); ctx.lineTo(px - 9, y + 4); ctx.closePath();
        ctx.fillStyle = cAkzent; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Spulenwindungen im Längsschnitt: oben und unten je eine Reihe kleiner Kreise
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    const windZahl = 13;
    for (let k = 0; k < windZahl; k++) {
      const x = SP_X + 14 + (SP_BREITE - 28) * k / (windZahl - 1);
      ctx.fillStyle = cFlaeche;
      ctx.beginPath(); ctx.arc(x, SP_Y, 6, 0, 7); ctx.fill(); ctx.stroke();        // oben: Draht nach vorn
      ctx.beginPath(); ctx.arc(x, SP_Y + SP_HOEHE, 6, 0, 7); ctx.fill(); ctx.stroke(); // unten: Draht nach hinten
      // Symbole: oben Punkt (·), unten Kreuz (×)
      ctx.fillStyle = cText;
      ctx.beginPath(); ctx.arc(x, SP_Y, 1.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - 3, SP_Y + SP_HOEHE - 3); ctx.lineTo(x + 3, SP_Y + SP_HOEHE + 3);
      ctx.moveTo(x + 3, SP_Y + SP_HOEHE - 3); ctx.lineTo(x - 3, SP_Y + SP_HOEHE + 3); ctx.lineWidth = 1.5; ctx.stroke();
      ctx.lineWidth = 2;
    }

    // Beschriftung Spule (zwei Zeilen — passt in die Canvas-Breite, kein Überlauf am Rand)
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("lange Zylinderspule · N = 500 Windungen", w / 2, 16);
    ctx.fillText("L = 0,500 m → n = N/L = 1000 1/m", w / 2, 32);
    ctx.textAlign = "start";
    ctx.fillStyle = cLeise;
    ctx.fillText("Windungen (Längsschnitt)", SP_X, SP_Y - 14);

    // Hallsonde mittig im Inneren
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(SONDE_X - 7, SP_MITTE_Y - 26, 14, 52, 3); else ctx.rect(SONDE_X - 7, SP_MITTE_Y - 26, 14, 52);
    ctx.fill(); ctx.stroke();
    // Sondenkopf (Messplättchen)
    ctx.fillStyle = cAkzent;
    ctx.fillRect(SONDE_X - 5, SP_MITTE_Y - 4, 10, 8);
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Hallsonde", SONDE_X, SP_Y + SP_HOEHE + 30);

    // Netzgeräte-Anzeigen unten
    const kasten = (x, etikett, wert) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 252, 160, 40, 6); else ctx.rect(x, 252, 160, 40);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(etikett, x + 80, 267);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + 80, 285);
      ctx.font = "12px system-ui, sans-serif";
    };
    kasten(14, "Spulenstrom", "I = " + komma(zustand.I, 2) + " A");
    // Teslameter zeigt das (leicht verrauschte) Hallsonden-Signal an — du liest es ab und trägst es ein.
    const bAnzeige = zustand.phase === "aufbau" ? "aus" : "B = " + komma(feldReal(zustand.I) * 1000, 2) + " mT";
    kasten(186, "Hallsonde · Teslameter", bAnzeige);

    // Hinweistext im Aufbau (mit Hintergrund — gut lesbar)
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(w / 2 - 102, SP_MITTE_Y - 22, 204, 44);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Strom aus —", w / 2, SP_MITTE_Y - 4);
      ctx.fillText("Feldlinien erscheinen in der Durchführung", w / 2, SP_MITTE_Y + 14);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Eine <strong>lange Zylinderspule</strong> (Solenoid) trägt N = 500 Windungen auf der Länge L = 0,500 m. Daraus ergibt sich die <strong>Windungsdichte</strong> n = N/L = <strong>1000 1/m</strong> — diese Zahl ist gegeben. Durch die Spule fließt ein einstellbarer <strong>Spulenstrom I</strong> (0–5,0 A). Im Inneren einer langen Spule ist das Magnetfeld nahezu <strong>homogen</strong> (die Feldlinien laufen parallel zur Achse) und an den Enden vernachlässigbar.</p>
      <p>Mittig im Inneren steckt eine <strong>Hallsonde</strong>: ein dünnes Plättchen, das die magnetische Flussdichte B misst. Du liest B in <strong>Millitesla (mT)</strong> selbst ab.</p>
      <p><strong>Idee der Messung:</strong> Theoretisch erwartet man für die lange Spule B = µ₀ · n · I. Trägst du B gegen I auf, sollte eine <strong>Ursprungsgerade</strong> herauskommen — ihre Steigung ist µ₀ · n. Daraus lässt sich µ₀ bestimmen, ohne es vorauszusetzen.</p>
      <p><strong>Plan:</strong> Stelle mindestens ${MIN_MESSUNGEN} verschiedene Stromstärken ein und lies jeweils B ab. In der Auswertung trägst du die Punkte auf, legst eine Gerade hindurch und gewinnst aus der Steigung µ₀.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich den Spulenstrom I verdopple, wird das Feld B im Inneren …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="konstant">… bleibt (fast) gleich</option>
        <option value="wurzel">… etwa um den Faktor √2 größer</option>
        <option value="linear">… doppelt so groß</option>
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
  const wortAus = wahl => wahl === "linear" ? "doppelt so groß"
    : wahl === "wurzel" ? "um den Faktor √2 größer" : "(fast) gleich";

  function beobachtungHtml() {
    const anz = new Set(zustand.messungen.map(z => z.I)).size;
    let html = `<p>Deine Vorhersage: I verdoppeln → B <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus — wie ändert sich die Feldliniendichte?</p>`;
    if (anz >= 3) {
      const ok = zustand.vorhersage === "linear";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>I verdoppeln → B verdoppelt sich</strong> (die Feldlinien werden doppelt so dicht; B ∝ I). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const anz = new Set(zustand.messungen.map(z => z.I)).size;
    let fortschritt = `${anz} von mindestens ${MIN_MESSUNGEN} verschiedenen Stromstärken.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-i">Spulenstrom: I = <strong id="exp-i-wert">${komma(zustand.I, 2)} A</strong></label>
        <input type="range" id="exp-i" min="${I_MIN}" max="${I_MAX}" step="${I_SCHRITT}" value="${zustand.I}" aria-label="Spulenstrom in Ampere">
      </div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies die Hallsonde ab — Magnetfeld B in mT:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>I in A</th><th>B in mT (abgelesen)</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${komma(z.I, 2)}</td><td>${komma(z.bEingabeMt, 2)}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const iRegler = panel.querySelector("#exp-i");
    iRegler.addEventListener("input", () => {
      zustand.I = Math.round(Number(iRegler.value) / I_SCHRITT) * I_SCHRITT; // exakt auf Schrittweite — deterministische Streu-Schlüssel
      panel.querySelector("#exp-i-wert").textContent = komma(zustand.I, 2) + " A";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.I === zustand.I)) {
        meldung.textContent = "Diese Stromstärke hast du schon gemessen — stelle eine andere ein.";
        return;
      }
      const wahrB = feldReal(zustand.I);
      if (!ablesungBOk(eingabe, wahrB)) {
        meldung.textContent = "✗ Schau noch einmal genau auf die Hallsonden-Anzeige (auf etwa 0,05 mT genau ablesen).";
        return;
      }
      zustand.messungen.push({ I: zustand.I, bTesla: eingabe / 1000, bEingabeMt: eingabe });
      zustand.meldungMessen = "✓ Eingetragen: bei I = " + komma(zustand.I, 2) + " A misst du B = " + komma(eingabe, 2) + " mT.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- kleines Diagramm B(I) für die Auswertung ----------
  function zeichneDiagramm(cv, regr) {
    const c = cv.getContext("2d");
    const w = cv.width, h = cv.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    c.clearRect(0, 0, w, h);
    c.font = "11px system-ui, sans-serif";
    const ox = 46, oy = h - 30, breite = w - ox - 14, hoehe = oy - 16;
    const bMaxMt = Math.max(7, ...zustand.messungen.map(z => z.bEingabeMt)) * 1.1;
    const xPx = i => ox + i / I_MAX * breite;
    const yPx = bMt => oy - bMt / bMaxMt * hoehe;
    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(ox, 12); c.lineTo(ox, oy); c.lineTo(ox + breite, oy); c.stroke();
    c.fillStyle = cLeise; c.textAlign = "center";
    c.fillText("I in A", ox + breite / 2, h - 6);
    c.save(); c.translate(12, 16 + hoehe / 2); c.rotate(-Math.PI / 2);
    c.fillText("B in mT", 0, 0); c.restore();
    // x-Ticks
    c.textAlign = "center"; c.strokeStyle = cLeise; c.lineWidth = 1;
    for (let i = 0; i <= I_MAX; i++) {
      const x = xPx(i);
      c.beginPath(); c.moveTo(x, oy); c.lineTo(x, oy + 4); c.stroke();
      c.fillText(String(i), x, oy + 16);
    }
    // Regressionsgerade (Ursprungsnah): y = m·x + b, m in T/A → mT
    if (regr && Number.isFinite(regr.m)) {
      c.strokeStyle = cAkzent; c.lineWidth = 2; c.globalAlpha = 0.85;
      const y0 = (regr.b) * 1000, yE = (regr.m * I_MAX + regr.b) * 1000;
      c.beginPath(); c.moveTo(xPx(0), yPx(y0)); c.lineTo(xPx(I_MAX), yPx(yE)); c.stroke();
      c.globalAlpha = 1;
    }
    // Messpunkte
    c.fillStyle = cText;
    zustand.messungen.forEach(z => {
      c.beginPath(); c.arc(xPx(z.I), yPx(z.bEingabeMt), 3.2, 0, 7); c.fill();
    });
    c.textAlign = "start";
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Stromstärken — bisher: ${new Set(zustand.messungen.map(z => z.I)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const regr = regressionAusMessungen(zustand.messungen);
    const steigungTproA = regr.m;                       // T/A
    const steigungMtProA = steigungTproA * 1000;        // mT/A (für Anzeige)
    const mu0AusRegr1e7 = mu0AusSteigung(steigungTproA) / 1e-7;
    // gA: Mittelwert der Einzelquotienten B/I
    const quotienten = zustand.messungen.map(z => quotientBdurchI(z.bTesla, z.I)).filter(Number.isFinite);
    const mwQuotientTproA = mittel(quotienten);          // ≈ µ₀·n
    const mwQuotientMtProA = mwQuotientTproA * 1000;
    const bewQ = bewertungMu0(mu0AusSteigung(mwQuotientTproA) / 1e-7);

    const mu0Fertig = zustand.mu0Ok === true;
    const bewE = mu0Fertig ? bewertungMu0(zustand.mu0Eingabe) : null;
    const ermutigung = bewE ? (bewE.stufe === "sehr gut" ? " Stark — Messen wie im Praktikum!"
      : bewE.stufe === "gut" ? " Ordentlich! Mit mehr Punkten und sorgfältigem Ablesen wirst du noch genauer."
      : " Kein Drama: Miss ein paar weitere Stromstärken und lies die Hallsonde genau ab.") : "";

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Trage B gegen I auf — es entsteht eine <strong>Ursprungsgerade</strong>. Das bestätigt: <strong>B ∝ I</strong>. Ihre Steigung ist µ₀ · n.</p>
      <canvas id="exp-diagramm" width="330" height="220" aria-label="Diagramm: abgelesenes Magnetfeld B in Millitesla über dem Spulenstrom I in Ampere. Die Messpunkte liegen auf einer Ursprungsgeraden; die eingezeichnete Ausgleichsgerade hat die Steigung µ₀ mal n."></canvas>
      <p>Steigung deiner Ausgleichsgeraden: <strong>${komma(steigungMtProA, 3)} mT/A</strong> = ${komma(steigungTproA * 1e3, 3)}·10⁻³ T/A.</p>

      <h3>Weg A · für alle: Proportionalität bestätigen (B/I mitteln)</h3>
      <p>Bilde für jede Zeile den Quotienten B/I. Bleibt er konstant, ist B ∝ I bewiesen. Sein Mittelwert ist die Steigung µ₀ · n.</p>
      <table class="exp-tabelle">
        <thead><tr><th>I in A</th><th>B in mT</th><th>B/I in mT/A</th></tr></thead>
        <tbody>${zustand.messungen.map(z => `<tr>
          <td>${komma(z.I, 2)}</td><td>${komma(z.bEingabeMt, 2)}</td>
          <td>${komma(quotientBdurchI(z.bEingabeMt, z.I), 3)}</td></tr>`).join("")}</tbody>
      </table>
      <p>Mittelwert: <strong>B/I ≈ ${komma(mwQuotientMtProA, 3)} mT/A</strong> — er bleibt über alle Zeilen nahezu gleich, also gilt <strong>B ∝ I</strong> (Bewertung der Genauigkeit: ${bewQ.stufe}, ${komma(bewQ.abw, 1)} % Abweichung von µ₀·n).</p>

      <h3>Weg B · vertiefend: µ₀ aus der Steigung bestimmen</h3>
      <p>Aus B = µ₀ · n · I folgt: Steigung = µ₀ · n, also <strong>µ₀ = Steigung / n</strong> mit n = 1000 1/m. Rechne selbst und trage µ₀ in <strong>10⁻⁷ Vs/(A·m)</strong> ein — z. B. 12,6.</p>
      <details class="exp-fehler"><summary>Hilfe: Rechen-Fahrplan für µ₀</summary>
        <p>1) Steigung in <strong>T/A</strong> nehmen (mT/A ÷ 1000), z. B. ${komma(steigungMtProA, 3)} mT/A = ${komma(steigungTproA * 1e3, 3)}·10⁻³ T/A. 2) Durch n = 1000 1/m teilen → µ₀ in Vs/(A·m), eine winzige Zahl um 1,26·10⁻⁶. 3) Durch 10⁻⁷ teilen und mit einer Nachkommastelle eintragen (Literaturwert: 12,566).</p>
      </details>
      <form id="exp-mu0-form" class="exp-ablesen">
        <label for="exp-mu0">µ₀ in 10⁻⁷ Vs/(A·m):</label>
        <input id="exp-mu0" inputmode="decimal" autocomplete="off" size="7" value="${zustand.mu0Eingabe == null ? "" : komma(zustand.mu0Eingabe, 1)}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-mu0-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${mu0Fertig ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: µ₀ ≈ ${komma(zustand.mu0Eingabe, 1)} · 10⁻⁷ Vs/(A·m)</strong>. Literaturwert: 12,566 · 10⁻⁷ Vs/(A·m) — Abweichung ${komma(bewE.abw, 1)} %: <strong>${bewE.stufe}</strong>.${ermutigung} Aus einer Spule und einer Hallsonde wird so die magnetische Feldkonstante!</p>
      </div>` : ""}

      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Warum ist das Feld im <strong>Inneren</strong> der langen Spule nahezu <strong>homogen</strong>?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="ueberlagerung">Die Felder vieler dicht gewickelter Windungen überlagern sich zu parallelen Feldlinien</option>
          <option value="luft">Weil im Inneren Luft ist und Luft das Feld glättet</option>
          <option value="hallsonde">Die Hallsonde erzeugt selbst ein homogenes Feld</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du ziehst die <strong>gleichen</strong> 500 Windungen auf die <strong>doppelte</strong> Länge (L = 1,0 m, gleicher Strom). Was passiert mit B im Inneren?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">B bleibt gleich</option>
          <option value="halb">B halbiert sich (n wird halb so groß)</option>
          <option value="doppelt">B verdoppelt sich</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man nie exakt 12,566?</summary>
        <p><strong>Hallsonden-Rauschen und Ablesung:</strong> Das Messsignal schwankt um einige Hundertstel mT, und beim Ablesen rundest du. Deshalb streuen die Punkte leicht um die Gerade. Gegenmittel: viele Stromstärken messen und die Ausgleichsgerade durch alle Punkte legen statt nur zwei Werte zu nehmen.</p>
        <p><strong>Randfeld und Sondenlage:</strong> B = µ₀·n·I gilt streng nur für die <em>unendlich lange</em> Spule. Eine reale Spule hat an den Enden ein schwächeres Feld; sitzt die Sonde nicht genau in der Mitte oder schräg zur Achse, misst sie etwas zu wenig. Deshalb: Sonde mittig und parallel zur Achse.</p>
        <p><strong>Windungsdichte:</strong> n = N/L setzt eine gleichmäßige, einlagige Wicklung voraus. Ungleichmäßige oder mehrlagige Wicklung verändert das effektive n und damit die Steigung.</p>
        <p><strong>Strategie dagegen:</strong> mittig messen, viele Punkte aufnehmen und über die Steigung (Weg B) bzw. den Mittelwert von B/I (Weg A) auswerten — genau das hast du getan.</p>
      </details>`;

    zeichneDiagramm(panel.querySelector("#exp-diagramm"), regr);

    panel.querySelector("#exp-mu0-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-mu0").value);
      zustand.mu0Eingabe = Number.isFinite(eingabe) ? eingabe : null;
      zustand.mu0Ok = mu0EingabeOk(eingabe, mu0AusRegr1e7);
      zustand.meldungAuswerten = zustand.mu0Ok
        ? "✓ Das passt — unten steht dein Ergebnis."
        : (Number.isFinite(eingabe)
          ? "✗ Noch nicht (±0,8 Toleranz). Häufigste Stolperfalle: Steigung in T/A umrechnen (mT/A ÷ 1000) und durch n = 1000 teilen."
          : "Trag eine Dezimalzahl ein, z. B. 12,6.");
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "ueberlagerung" };
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
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("magnetfeld-spule-messreihe.csv",
        ["I in A", "B in mT", "B/I in mT/A"],
        zustand.messungen.map(z => [z.I, z.bEingabeMt, quotientBdurchI(z.bEingabeMt, z.I)]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        I: 2.0, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        mu0Eingabe: null, mu0Ok: null, quotientGeprueft: false,
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Jede Windung erzeugt ein Ringfeld. Liegen viele Windungen dicht beieinander, heben sich ihre Felder außen weitgehend auf und addieren sich innen zu einem nahezu parallelen, gleich starken Feld. Deshalb hängt B im Inneren nur von n und I ab, nicht vom Ort."
      : "✗ Nicht ganz: Weder die Luft noch die Hallsonde machen das Feld homogen. Überlege, wie sich die Felder der vielen einzelnen, dicht gewickelten Windungen im Inneren überlagern.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: B = µ₀·n·I, und n = N/L. Verdoppelst du L bei gleichem N, halbiert sich n — also auch B. Die Feldstärke hängt von der Windungs<em>dichte</em> ab, nicht von der bloßen Windungszahl."
      : "✗ Schau auf B = µ₀·n·I mit n = N/L: N bleibt 500, aber L verdoppelt sich, also wird n halb so groß. Was folgt daraus für B?";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }
  // prefers-reduced-motion respektieren: keine fortlaufende Animation nötig —
  // gezeichnet wird nur bei Zustandsänderungen. (Hinweis erfüllt die Konvention.)
  void reduzierteBewegung;
  wechslePhase("aufbau");
}
