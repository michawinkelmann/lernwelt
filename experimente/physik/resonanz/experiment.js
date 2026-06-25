// experiment.js — Interaktives Experiment: Resonanz / erzwungene Schwingung (QP, gA + eA).
// Realitätsnahe Messpraxis statt fertiger Resonanzkurve: ein gedämpftes Federpendel
// (m, D) wird über einen Motor mit variabler Erregerfrequenz f angetrieben. Im
// stationären Zustand stellt sich eine Amplitude A(f) ein; die liest du an einem
// Amplituden-Lineal SELBST in cm ab, protokollierst die Messreihe und trägst A gegen f
// auf — die Resonanzkurve. Daraus liest du die Resonanzfrequenz ab und vergleichst sie
// mit der Eigenfrequenz f₀ = (1/2π)·√(D/m). Die kleine Ablesestreuung ist pro
// Erregerfrequenz deterministisch geseedet, damit pruefFaelle und TESTS in Node laufen.
// Modulebene strikt DOM-frei.

import { streuung, parseDezimal, komma, mittel, esc, farbe, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const MASSE = 0.200;        // kg — schwingende Masse
export const FEDER_D = 20.0;       // N/m — Federkonstante
export const GAMMA = 0.4;          // s⁻¹ — Dämpfungsparameter (schwache Dämpfung)
export const A_STAT = 0.10 / 4.010664263066502; // m — Antriebsamplitude, so dass Resonanzgipfel ≈ 10 cm
export const F_MIN = 0.2, F_MAX = 3.0, F_SCHRITT = 0.1;   // Hz — Erregerfrequenz am Regler
export const A_STREU_SPANNE = 0.004;   // m — Ablesestreuung auf die Amplitude (±0,2 cm)
export const A_TOLERANZ_CM = 0.3;      // akzeptierte Ablesung der Amplitude: ±0,3 cm
export const FRES_TOLERANZ = 0.15;     // f_res-Eingabe: ±0,15 Hz (akzeptiert 1,5 und 1,6 Hz)
export const MIN_MESSUNGEN = 6;        // mindestens 6 verschiedene Erregerfrequenzen

// ---------- Physik (rein, Node-testbar) ----------
// Eigenfrequenz des ungedämpften Federpendels
export function eigenfrequenz(dFeder, mMasse) {
  return 1 / (2 * Math.PI) * Math.sqrt(dFeder / mMasse); // Hz
}
export const F0 = eigenfrequenz(FEDER_D, MASSE);   // ≈ 1,5915 Hz

// stationäre Amplitude der erzwungenen Schwingung (Resonanzkurve), in m
export function amplitude(f, f0, gamma, aStat) {
  const nenner = Math.sqrt(Math.pow(f0 * f0 - f * f, 2) + Math.pow(gamma * f, 2));
  return nenner > 0 ? aStat * f0 * f0 / nenner : NaN;
}
// Resonanzfrequenz (Lage des Amplitudenmaximums): f_res = √(f₀² − γ²/2), nahe f₀
export function resonanzfrequenz(f0, gamma) {
  const inner = f0 * f0 - gamma * gamma / 2;
  return inner > 0 ? Math.sqrt(inner) : NaN; // Hz
}
// wahre, ablesbare Amplitude inkl. reproduzierbarer Streuung (Ablesen am Lineal)
export function amplitudeReal(f) {
  return amplitude(f, F0, GAMMA, A_STAT) + streuung("A:" + f.toFixed(1), A_STREU_SPANNE); // m
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungAOk(eingabeCm, wahrAMeter) {
  return ablesungOk(eingabeCm, wahrAMeter * 100, A_TOLERANZ_CM);
}
// f_res darf an f₀ ODER an die echte Maximumslage angelehnt werden — beides physikalisch korrekt
export function fresEingabeOk(eingabeHz) {
  return Number.isFinite(eingabeHz)
    && (Math.abs(eingabeHz - F0) <= FRES_TOLERANZ
      || Math.abs(eingabeHz - resonanzfrequenz(F0, GAMMA)) <= FRES_TOLERANZ);
}
export function bewertungFres(eingabeHz) {
  const abw = Math.abs(eingabeHz - F0) / F0 * 100;
  if (abw <= 4) return { stufe: "sehr gut", abw };
  if (abw <= 10) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Erregerfrequenzen, davon Werte nahe f₀
export function messreiheVollstaendig(messungen) {
  const fs = new Set(messungen.map(z => z.f.toFixed(1)));
  const nahe = messungen.some(z => Math.abs(z.f - F0) <= 0.25);
  return messungen.length >= MIN_MESSUNGEN && fs.size >= MIN_MESSUNGEN && nahe;
}

// ---------- Prüffälle (analytisch nachgerechnet) ----------
export const pruefFaelle = [
  { art: "f0", soll: 1.591549, tol: 1e-5 },                         // Hz: (1/2π)√(20/0,2)
  { art: "fres", soll: 1.566215, tol: 1e-5 },                       // Hz: √(f0²−γ²/2)
  { art: "Apeak_cm", soll: 10.0, tol: 0.02 },                       // cm: Gipfelamplitude ≈ 10 cm
  { art: "A_fern_cm", f: 3.0, soll: 0.96, tol: 0.05 }               // cm: weit oberhalb f₀ klein
];

export const TESTS = [
  { name: "Eigenfrequenz exakt: f₀ = (1/2π)·√(D/m) = (1/2π)·√(20/0,2) ≈ 1,5915 Hz",
    ok: () => F0 === 1 / (2 * Math.PI) * Math.sqrt(20.0 / 0.200)
      && Math.abs(F0 - 1.591549) < 1e-5 },
  { name: "Resonanzfrequenz f_res = √(f₀²−γ²/2) ≈ 1,5662 Hz, knapp unter f₀",
    ok: () => Math.abs(resonanzfrequenz(F0, GAMMA) - 1.566215) < 1e-5
      && resonanzfrequenz(F0, GAMMA) < F0 },
  { name: "Amplitudenmaximum liegt genau bei f_res (Ableitung des Nenners = 0)",
    ok: () => { const fr = resonanzfrequenz(F0, GAMMA);
      const aPk = amplitude(fr, F0, GAMMA, A_STAT);
      return [fr - 0.05, fr - 0.02, fr + 0.02, fr + 0.05].every(f =>
        amplitude(f, F0, GAMMA, A_STAT) <= aPk + 1e-12); } },
  { name: "Gipfelamplitude ≈ 10 cm (A_STAT so kalibriert)",
    ok: () => Math.abs(amplitude(resonanzfrequenz(F0, GAMMA), F0, GAMMA, A_STAT) * 100 - 10.0) < 0.02 },
  { name: "Resonanzkurve fällt zu großen f ab (monoton oberhalb des Gipfels)",
    ok: () => { const a = f => amplitude(f, F0, GAMMA, A_STAT);
      return a(1.7) > a(2.0) && a(2.0) > a(2.5) && a(2.5) > a(3.0); } },
  { name: "Resonanzkurve fällt zu kleinen f ab (monoton unterhalb des Gipfels)",
    ok: () => { const a = f => amplitude(f, F0, GAMMA, A_STAT);
      return a(1.5) > a(1.2) && a(1.2) > a(0.8) && a(0.8) > a(0.4); } },
  { name: "Resonanzüberhöhung: A am Gipfel deutlich größer als statisch (f→0)",
    ok: () => { const aPk = amplitude(resonanzfrequenz(F0, GAMMA), F0, GAMMA, A_STAT);
      const aStatisch = amplitude(0.0001, F0, GAMMA, A_STAT);
      return aPk > 3 * aStatisch && Math.abs(aStatisch - A_STAT) < 1e-4; } },
  { name: "stärkere Dämpfung senkt und verbreitert den Gipfel (γ größer → A_peak kleiner)",
    ok: () => { const fr1 = resonanzfrequenz(F0, 0.4), fr2 = resonanzfrequenz(F0, 1.2);
      return amplitude(fr2, F0, 1.2, A_STAT) < amplitude(fr1, F0, 0.4, A_STAT); } },
  { name: "Ablese-Streuung ±0,2 cm auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let z = F_MIN * 10; z <= F_MAX * 10 + 0.5; z++) { const f = z / 10;
        const d = Math.abs(amplitudeReal(f) - amplitude(f, F0, GAMMA, A_STAT));
        if (d > A_STREU_SPANNE / 2 + 1e-12) return false;
        if (d > 1e-5) irgendStreu = true;
      }
      return irgendStreu && amplitudeReal(1.6) === amplitudeReal(1.6)
        && amplitudeReal(1.6) !== amplitudeReal(1.5); } },
  { name: "Ablese-Toleranz Amplitude: ±0,3 cm",
    ok: () => ablesungAOk(9.86, 0.0986) && ablesungAOk(9.6, 0.0986)
      && !ablesungAOk(9.5, 0.0986) && !ablesungAOk(NaN, 0.0986) },
  { name: "f_res-Eingabe: 1,5 und 1,6 Hz gültig (an f₀ oder Maximumslage), 1,3 und 1,9 nicht",
    ok: () => fresEingabeOk(1.5) && fresEingabeOk(1.6) && fresEingabeOk(1.59)
      && !fresEingabeOk(1.3) && !fresEingabeOk(1.9) && !fresEingabeOk(NaN) },
  { name: "Bewertung: 1,59 → sehr gut · 1,5 → gut · 1,2 → nochmal prüfen",
    ok: () => bewertungFres(1.59).stufe === "sehr gut" && bewertungFres(1.5).stufe === "gut"
      && bewertungFres(1.2).stufe === "nochmal prüfen" },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("1,6") === 1.6 && parseDezimal("1.6") === 1.6 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen f UND einem Wert nahe f₀",
    ok: () => { const z = f => ({ f });
      const fern = [0.2, 0.4, 0.6, 0.8, 1.0, 1.2].map(z);                // alle weit unter f₀
      const wenig = [1.4, 1.5, 1.6, 1.5, 1.6, 1.4].map(z);              // nur 3 verschiedene
      const gut = [0.4, 0.8, 1.2, 1.5, 1.7, 2.2].map(z);               // 6 versch., 1,5 nahe f₀
      return !messreiheVollstaendig(fern) && !messreiheVollstaendig(wenig)
        && !messreiheVollstaendig(gut.slice(0, 5)) && messreiheVollstaendig(gut); } },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "f0") return Math.abs(F0 - p.soll) <= p.tol;
      if (p.art === "fres") return Math.abs(resonanzfrequenz(F0, GAMMA) - p.soll) <= p.tol;
      if (p.art === "Apeak_cm") return Math.abs(amplitude(resonanzfrequenz(F0, GAMMA), F0, GAMMA, A_STAT) * 100 - p.soll) <= p.tol;
      return Math.abs(amplitude(p.f, F0, GAMMA, A_STAT) * 100 - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (seitliche Ansicht: Motor oben, Feder, Masse, Amplituden-Lineal) ----------
  const AUFH_X = 130, AUFH_Y = 56;        // Aufhängung am Antriebsmotor
  const RUHE_Y = 250;                     // Ruhelage der Masse (Mitte)
  const PX_PRO_CM = 9;                    // Maßstab des Amplituden-Lineals: 1 cm ≙ 9 px
  const LINEAL_X = 250;                   // x-Position des Amplituden-Lineals
  const SKALA_CM = 12;                    // Lineal zeigt ±12 cm

  const zustand = {
    phase: "aufbau",
    f: 1.0,
    vorhersage: "",                        // "f0" | "tief" | "hoch" | "egal"
    messungen: [],                         // {f, A_m, A_cm}
    fresEingabe: null, fresOk: null,
    fr1: { wahl: "", ok: null }, fr2: { wahl: "", ok: null },
    animPhase: 0, animLaeuft: false,
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
        <canvas id="exp-canvas" width="360" height="460" aria-label="Seitenansicht eines Federpendels: oben ein Antriebsmotor, der die Aufhängung mit der Erregerfrequenz auf und ab bewegt, darunter Feder und schwingende Masse. Rechts daneben ein senkrechtes Amplituden-Lineal in Zentimetern. In der Durchführung zeigt das Lineal die stationäre Schwingungsweite an; unten eine Anzeige der eingestellten Erregerfrequenz."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;

  // ---------- Zeichnung ----------
  function aktuelleAmplitudeM() {
    return zustand.phase === "aufbau" ? 0 : amplitudeReal(zustand.f);
  }

  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.lineWidth = 1.5;

    const aM = aktuelleAmplitudeM();
    const aPx = aM * 100 * PX_PRO_CM;             // Amplitude in px
    // momentane Auslenkung (nur fürs Bild; Physik bleibt die stationäre Amplitude)
    const phase = zustand.animLaeuft ? zustand.animPhase : Math.PI / 2; // statisch: am oberen Umkehrpunkt
    const auslenkung = aPx * Math.sin(phase);     // +oben
    const masseY = RUHE_Y - auslenkung;
    // Aufhängung wird vom Motor mit kleiner Hubbewegung angetrieben
    const motorHub = zustand.animLaeuft ? 6 * Math.sin(phase) : 0;
    const aufhY = AUFH_Y - motorHub;

    // Antriebsmotor (oben)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(AUFH_X - 52, 12, 104, 32, 6); else ctx.rect(AUFH_X - 52, 12, 104, 32);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Antriebsmotor", AUFH_X, 32);
    ctx.font = "12px system-ui, sans-serif";
    // Pleuel/Hubstange vom Motor zur Aufhängung
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(AUFH_X, 44); ctx.lineTo(AUFH_X, aufhY); ctx.stroke();
    ctx.fillStyle = cText;
    ctx.beginPath(); ctx.arc(AUFH_X, aufhY, 4, 0, 7); ctx.fill();

    // Feder (Zickzack von Aufhängung zur Masse)
    const federOben = aufhY + 4, federUnten = masseY - 18;
    ctx.strokeStyle = cText; ctx.lineWidth = 1.8;
    ctx.beginPath();
    const windungen = 9;
    ctx.moveTo(AUFH_X, federOben);
    for (let i = 0; i < windungen; i++) {
      const y = federOben + (federUnten - federOben) * (i + 0.5) / windungen;
      ctx.lineTo(AUFH_X + (i % 2 === 0 ? 11 : -11), y);
    }
    ctx.lineTo(AUFH_X, federUnten);
    ctx.stroke();

    // schwingende Masse
    ctx.fillStyle = cAkzent; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(AUFH_X - 22, masseY - 18, 44, 36, 6); else ctx.rect(AUFH_X - 22, masseY - 18, 44, 36);
    ctx.fill(); ctx.stroke();

    // Amplituden-Lineal (senkrecht, ±cm um die Ruhelage)
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(LINEAL_X, RUHE_Y - SKALA_CM * PX_PRO_CM);
    ctx.lineTo(LINEAL_X, RUHE_Y + SKALA_CM * PX_PRO_CM);
    ctx.stroke();
    for (let cm = -SKALA_CM; cm <= SKALA_CM; cm++) {
      const y = RUHE_Y - cm * PX_PRO_CM, ganz = cm % 2 === 0;
      ctx.strokeStyle = ganz ? cText : cLeise; ctx.lineWidth = ganz ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(LINEAL_X, y); ctx.lineTo(LINEAL_X - (ganz ? 12 : 7), y); ctx.stroke();
      if (ganz && cm % 4 === 0) { ctx.fillStyle = cText; ctx.textAlign = "start"; ctx.fillText(String(Math.abs(cm)), LINEAL_X + 6, y + 4); }
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Amplitude · cm", LINEAL_X, RUHE_Y - SKALA_CM * PX_PRO_CM - 8);

    // Ruhelage-Linie
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1; ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(AUFH_X - 30, RUHE_Y); ctx.lineTo(LINEAL_X + 4, RUHE_Y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = cLeise; ctx.textAlign = "end";
    ctx.fillText("Ruhelage", AUFH_X - 34, RUHE_Y + 4);

    // Schwingungsbereich am Lineal markieren (oberer/unterer Umkehrpunkt) — ab der Durchführung
    if (zustand.phase !== "aufbau" && aPx > 0.5) {
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
      // obere Marke
      ctx.beginPath(); ctx.moveTo(LINEAL_X - 16, RUHE_Y - aPx); ctx.lineTo(LINEAL_X + 16, RUHE_Y - aPx); ctx.stroke();
      // untere Marke
      ctx.beginPath(); ctx.moveTo(LINEAL_X - 16, RUHE_Y + aPx); ctx.lineTo(LINEAL_X + 16, RUHE_Y + aPx); ctx.stroke();
      // verblassende Spur des Schwingbereichs
      ctx.globalAlpha = 0.16;
      ctx.fillStyle = cAkzent;
      ctx.fillRect(LINEAL_X - 16, RUHE_Y - aPx, 32, 2 * aPx);
      ctx.globalAlpha = 1;
      // Doppelpfeil mit Wert
      ctx.fillStyle = cAkzent; ctx.textAlign = "start"; ctx.font = "bold 12px system-ui, sans-serif";
      ctx.fillText("A ≈ ?", LINEAL_X + 22, RUHE_Y - aPx + 4);
      ctx.font = "12px system-ui, sans-serif";
    }

    // Erregerfrequenz-Anzeige unten
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(80, 408, 200, 44, 6); else ctx.rect(80, 408, 200, 44);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Erregerfrequenz des Motors", 180, 425);
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("f = " + komma(zustand.f, 1) + " Hz", 180, 444);
    ctx.font = "12px system-ui, sans-serif";

    // Hinweis im Aufbau
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(AUFH_X - 8, RUHE_Y + 40, 250, 52);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Motor aus — die stationäre", AUFH_X + 60, RUHE_Y + 58);
      ctx.fillText("Schwingungsweite siehst du", AUFH_X + 60, RUHE_Y + 74);
      ctx.fillText("in der Durchführung", AUFH_X + 60, RUHE_Y + 90);
    }
    ctx.textAlign = "start";
  }

  // ---------- Animation (gedämpft auf prefers-reduced-motion) ----------
  let animId = null;
  function reduzierteBewegung() { return matchMedia("(prefers-reduced-motion: reduce)").matches; }
  function starteAnimation() {
    stoppeAnimation();
    if (reduzierteBewegung() || zustand.phase === "aufbau") { zustand.animLaeuft = false; zeichne(); return; }
    zustand.animLaeuft = true;
    const T = 1 / zustand.f;                 // s je Schwingung — die Animation läuft mit der Erregerfrequenz
    let t0 = null;
    const tick = (zeit) => {
      if (t0 === null) t0 = zeit;
      zustand.animPhase = 2 * Math.PI * ((zeit - t0) / 1000) / T + Math.PI / 2;
      zeichne();
      animId = requestAnimationFrame(tick);
    };
    animId = requestAnimationFrame(tick);
  }
  function stoppeAnimation() {
    if (animId !== null) { cancelAnimationFrame(animId); animId = null; }
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    stoppeAnimation(); zustand.animLaeuft = false;
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Ein <strong>Federpendel</strong> (Masse m = ${komma(MASSE, 3)} kg an einer Feder mit D = ${komma(FEDER_D, 1)} N/m) hängt an einem <strong>Antriebsmotor</strong>. Der Motor bewegt die Aufhängung periodisch auf und ab und treibt das Pendel mit einer einstellbaren <strong>Erregerfrequenz f</strong> (0,2–3,0 Hz) an. Eine schwache Reibung dämpft die Schwingung (Dämpfungsparameter γ ≈ ${komma(GAMMA, 1)} s⁻¹).</p>
      <p>Lässt du den Motor lange genug laufen, schwingt das Pendel im <strong>eingeschwungenen (stationären) Zustand</strong> mit einer festen <strong>Amplitude A</strong>, die nur von f abhängt. Diese Schwingungsweite liest du am senkrechten <strong>Amplituden-Lineal</strong> (in cm) ab.</p>
      <p>Ungestört (ohne Antrieb) schwingt das Pendel mit seiner <strong>Eigenfrequenz</strong> f₀ = (1/2π)·√(D/m). Diesen Wert berechnest du später selbst und vergleichst ihn mit deiner Messung.</p>
      <p><strong>Plan:</strong> Stelle nacheinander mindestens ${MIN_MESSUNGEN} verschiedene Erregerfrequenzen ein — einige davon nahe f₀ — und lies jeweils die Amplitude ab. In der Auswertung trägst du A gegen f auf: Das ergibt die <strong>Resonanzkurve</strong>.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Bei welcher Erregerfrequenz wird die Amplitude des Pendels am größten?</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="tief">Bei sehr tiefer Frequenz (Motor langsam)</option>
        <option value="hoch">Bei sehr hoher Frequenz (Motor schnell)</option>
        <option value="f0">Wenn f ungefähr der Eigenfrequenz f₀ entspricht</option>
        <option value="egal">Die Frequenz ist egal — A bleibt gleich</option>
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
  const wortVorhersage = w => w === "tief" ? "bei sehr tiefer Frequenz"
    : w === "hoch" ? "bei sehr hoher Frequenz"
    : w === "f0" ? "nahe der Eigenfrequenz f₀" : "die Frequenz ist egal";

  function beobachtungHtml() {
    const fs = zustand.messungen.map(z => z.f);
    let html = `<p>Deine Vorhersage: größte Amplitude <strong>${wortVorhersage(zustand.vorhersage)}</strong>. Probier es am Regler aus — fahre die Frequenz langsam durch!</p>`;
    // Sobald links und rechts von f₀ sowie nahe f₀ gemessen wurde: Rückmeldung
    const hatNahe = fs.some(f => Math.abs(f - F0) <= 0.25);
    const hatFern = fs.some(f => f <= 0.8) || fs.some(f => f >= 2.4);
    if (hatNahe && hatFern) {
      const ok = zustand.vorhersage === "f0";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: Die Amplitude wird <strong>nahe der Eigenfrequenz f₀ ≈ ${komma(F0, 2)} Hz</strong> am größten und fällt zu sehr tiefen und sehr hohen Frequenzen ab — das ist <strong>Resonanz</strong> („Aufschaukeln“). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const fsAnz = new Set(zustand.messungen.map(z => z.f.toFixed(1))).size;
    const hatNahe = zustand.messungen.some(z => Math.abs(z.f - F0) <= 0.25);
    let fortschritt = `${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen.`;
    if (zustand.messungen.length >= 3 && !hatNahe) fortschritt += " Miss auch nahe f₀ ≈ 1,6 Hz!";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-f">Erregerfrequenz: f = <strong id="exp-f-wert">${komma(zustand.f, 1)} Hz</strong></label>
        <input type="range" id="exp-f" min="${F_MIN}" max="${F_MAX}" step="${F_SCHRITT}" value="${zustand.f}" aria-label="Erregerfrequenz in Hertz">
      </div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <p>Warte, bis sich die Schwingung eingependelt hat, und lies dann am Lineal die <strong>Amplitude A</strong> ab (Abstand von der Ruhelage bis zum Umkehrpunkt).</p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Amplitude A in cm:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>f in Hz</th><th>A in cm</th></tr></thead>
        <tbody>${zustand.messungen.slice().sort((a, b) => a.f - b.f).map(z =>
          `<tr><td>${komma(z.f, 1)}</td><td>${komma(z.A_cm, 1)}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const fRegler = panel.querySelector("#exp-f");
    fRegler.addEventListener("input", () => {
      zustand.f = Math.round(Number(fRegler.value) * 10) / 10;  // exakt auf Schrittweite — deterministische Streu-Schlüssel
      panel.querySelector("#exp-f-wert").textContent = komma(zustand.f, 1) + " Hz";
      starteAnimation();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.f.toFixed(1) === zustand.f.toFixed(1))) {
        meldung.textContent = "Diese Frequenz hast du schon gemessen — stelle eine andere ein.";
        return;
      }
      const wahrA = amplitudeReal(zustand.f);
      if (!ablesungAOk(eingabe, wahrA)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wie weit schwingt die Masse vom Ruhelage-Strich bis zum oberen Umkehrpunkt? (Auf etwa 2–3 mm genau ablesen.)";
        return;
      }
      zustand.messungen.push({ f: zustand.f, A_m: wahrA, A_cm: eingabe });
      zustand.meldungMessen = "✓ Eingetragen: bei f = " + komma(zustand.f, 1) + " Hz ist A = " + komma(eingabe, 1) + " cm.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    starteAnimation();
  }

  // ---------- Phase 3: Auswertung ----------
  function zeichneDiagramm(diaCanvas) {
    const dctx = diaCanvas.getContext("2d");
    const W = diaCanvas.width, H = diaCanvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    dctx.clearRect(0, 0, W, H);
    dctx.font = "11px system-ui, sans-serif";
    const lx = 44, by = H - 30, rx = W - 12, ty = 14;       // Achsenrahmen
    const fMin = 0, fMax = 3.2;
    const aMax = Math.max(11, ...zustand.messungen.map(z => z.A_cm)) * 1.05;
    const X = f => lx + (f - fMin) / (fMax - fMin) * (rx - lx);
    const Y = a => by - a / aMax * (by - ty);
    // Achsen
    dctx.strokeStyle = cText; dctx.lineWidth = 1.5;
    dctx.beginPath(); dctx.moveTo(lx, ty); dctx.lineTo(lx, by); dctx.lineTo(rx, by); dctx.stroke();
    // Gitter + Beschriftung x (f)
    dctx.fillStyle = cLeise; dctx.strokeStyle = cLeise; dctx.lineWidth = 0.5;
    dctx.textAlign = "center";
    for (let f = 0; f <= 3; f++) {
      const x = X(f);
      dctx.beginPath(); dctx.moveTo(x, ty); dctx.lineTo(x, by); dctx.stroke();
      dctx.fillText(String(f), x, by + 14);
    }
    dctx.fillText("f in Hz", (lx + rx) / 2, H - 4);
    // y (A)
    dctx.textAlign = "end";
    for (let a = 0; a <= aMax; a += 2) {
      const y = Y(a);
      dctx.beginPath(); dctx.moveTo(lx, y); dctx.lineTo(rx, y); dctx.stroke();
      dctx.fillText(String(a), lx - 4, y + 3);
    }
    dctx.save(); dctx.translate(12, (ty + by) / 2); dctx.rotate(-Math.PI / 2);
    dctx.textAlign = "center"; dctx.fillText("A in cm", 0, 0); dctx.restore();
    // Eigenfrequenz f₀ als senkrechte Linie
    dctx.strokeStyle = cLeise; dctx.lineWidth = 1.2; dctx.setLineDash([5, 4]);
    dctx.beginPath(); dctx.moveTo(X(F0), ty); dctx.lineTo(X(F0), by); dctx.stroke();
    dctx.setLineDash([]);
    dctx.fillStyle = cLeise; dctx.textAlign = "left";
    dctx.fillText("f₀", X(F0) + 4, ty + 12);
    // Messpunkte
    const pts = zustand.messungen.slice().sort((a, b) => a.f - b.f);
    dctx.strokeStyle = cAkzent; dctx.lineWidth = 2;
    dctx.beginPath();
    pts.forEach((z, i) => { const x = X(z.f), y = Y(z.A_cm); if (i === 0) dctx.moveTo(x, y); else dctx.lineTo(x, y); });
    dctx.stroke();
    dctx.fillStyle = cAkzent;
    pts.forEach(z => { dctx.beginPath(); dctx.arc(X(z.f), Y(z.A_cm), 3.5, 0, 7); dctx.fill(); });
  }

  function panelAuswerten() {
    stoppeAnimation(); zustand.animLaeuft = false;
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Frequenzen, davon einen Wert nahe f₀ — bisher: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.fresOk === true;
    const bew = fertig ? bewertungFres(zustand.fresEingabe) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — das passt hervorragend zur Theorie!"
      : bew.stufe === "gut" ? " Ordentlich! Mit ein paar Messpunkten direkt rund um den Gipfel triffst du f₀ noch genauer."
      : " Kein Drama: Lies den höchsten Punkt deiner Kurve noch einmal genau ab und miss bei Bedarf zwischen 1,4 und 1,7 Hz nach.") : "";
    const aMax = Math.max(...zustand.messungen.map(z => z.A_cm));
    const fBeiMax = zustand.messungen.reduce((b, z) => z.A_cm > b.A_cm ? z : b).f;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Deine Messpunkte ergeben die <strong>Resonanzkurve</strong>: A in Abhängigkeit von der Erregerfrequenz f. Der höchste Punkt der Kurve markiert die <strong>Resonanzfrequenz</strong>.</p>
      <canvas id="exp-dia" width="330" height="240" aria-label="Resonanzkurve: Amplitude A gegen Erregerfrequenz f. Die Punkte steigen zu einem Maximum nahe der Eigenfrequenz f₀ und fallen zu beiden Seiten ab."></canvas>
      <p>In deiner Tabelle liegt das Maximum (A ≈ ${komma(aMax, 1)} cm) bei f ≈ <strong>${komma(fBeiMax, 1)} Hz</strong>.</p>
      <h3>1) Eigenfrequenz selbst berechnen</h3>
      <p>Berechne mit dem Taschenrechner f₀ = (1/2π)·√(D/m) für D = ${komma(FEDER_D, 1)} N/m und m = ${komma(MASSE, 3)} kg.</p>
      <details class="exp-fehler"><summary>Hilfe: Rechenweg f₀</summary>
        <p>D/m = ${komma(FEDER_D, 1)} ÷ ${komma(MASSE, 3)} = ${komma(FEDER_D / MASSE, 0)} s⁻². Wurzel: √${komma(FEDER_D / MASSE, 0)} = ${komma(Math.sqrt(FEDER_D / MASSE), 2)} s⁻¹. Geteilt durch 2π ≈ 6,283 ergibt f₀ ≈ ${komma(F0, 2)} Hz.</p>
      </details>
      <h3>2) Resonanzfrequenz ablesen und vergleichen</h3>
      <p>Lies aus deiner Kurve die Frequenz des höchsten Punktes ab (Resonanzfrequenz) und trage sie in <strong>Hz</strong> ein. Vergleiche sie mit f₀.</p>
      <form id="exp-fres-form" class="exp-ablesen">
        <label for="exp-fres">Resonanzfrequenz f_res in Hz:</label>
        <input id="exp-fres" inputmode="decimal" autocomplete="off" size="7" value="${zustand.fresEingabe == null ? "" : komma(zustand.fresEingabe, 1)}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-fres-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <div class="exp-hinweis">
        <p><strong>f_res ≈ ${komma(zustand.fresEingabe, 1)} Hz</strong> — und berechnet f₀ ≈ ${komma(F0, 2)} Hz. Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung}</p>
        <p>Die Amplitude wird also dann am größten, wenn die Erregerfrequenz fast genau die Eigenfrequenz trifft — das ist die <strong>Resonanzbedingung</strong>. (Bei Dämpfung liegt der Gipfel ein kleines Stück <em>unter</em> f₀.)</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-fr1" class="exp-ablesen">
        <label for="exp-fr1-wahl">Warum schaukelt sich das Pendel gerade bei f ≈ f₀ so stark auf?</label>
        <select id="exp-fr1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="takt">Der Antrieb gibt im Takt der Eigenschwingung immer wieder Energie passend ab</option>
          <option value="kraft">Bei f₀ ist die Antriebskraft am größten</option>
          <option value="masse">Bei f₀ wird die Masse leichter</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-fr1-meldung" class="exp-meldung" aria-live="polite">${esc(fr1Feedback())}</p>
      <form id="exp-fr2" class="exp-ablesen">
        <label for="exp-fr2-wahl">Du dämpfst das Pendel stärker (größeres γ). Was passiert mit dem Resonanzgipfel?</label>
        <select id="exp-fr2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="hoeher">Er wird höher und schmaler</option>
          <option value="niedriger">Er wird niedriger und breiter</option>
          <option value="gleich">Er bleibt unverändert</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-fr2-meldung" class="exp-meldung" aria-live="polite">${esc(fr2Feedback())}</p>
      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum ist der Gipfel schwer genau zu treffen?</summary>
        <p><strong>Grobes Frequenzraster:</strong> Der Motor lässt sich nur in 0,1-Hz-Schritten einstellen. Der echte Gipfel kann zwischen zwei Reglerstufen liegen — dann unterschätzt du die Spitzenamplitude und der abgelesene f_res ist auf ±0,1 Hz unsicher. Strategie: rund um den Gipfel besonders eng messen.</p>
        <p><strong>Einschwingzeit:</strong> Nach jeder Frequenzänderung braucht das Pendel einige Schwingungen, bis die stationäre Amplitude erreicht ist. Liest du zu früh ab, misst du eine noch wachsende oder noch abklingende Auslenkung.</p>
        <p><strong>Ablesen am Lineal (Parallaxe):</strong> Die Masse bewegt sich schnell; den Umkehrpunkt trifft das Auge nur ungefähr. Schräges Draufschauen verschiebt den Wert um Millimeter. Senkrecht auf das Lineal blicken hilft.</p>
        <p><strong>Gipfellage und f₀:</strong> Wegen der Dämpfung liegt das Amplitudenmaximum exakt bei f_res = √(f₀² − γ²/2), also ein kleines Stück <em>unter</em> f₀. Bei schwacher Dämpfung ist der Unterschied klein — deine Messung darf f₀ daher knapp unterschreiten.</p>
      </details>`;

    zeichneDiagramm(panel.querySelector("#exp-dia"));

    panel.querySelector("#exp-fres-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-fres").value);
      zustand.fresEingabe = eingabe;
      zustand.fresOk = fresEingabeOk(eingabe);
      zustand.meldungAuswerten = zustand.fresOk
        ? "✓ Das passt — vergleiche unten mit deiner berechneten Eigenfrequenz f₀."
        : "✗ Noch nicht (±0,15 Hz). Lies die Frequenz beim höchsten Punkt deiner Kurve ab — sie sollte nahe f₀ ≈ 1,6 Hz liegen.";
      panelAuswerten();
    });
    panel.querySelector("#exp-fr1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-fr1-wahl").value;
      zustand.fr1 = { wahl, ok: wahl === "takt" };
      panelAuswerten();
    });
    panel.querySelector("#exp-fr2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-fr2-wahl").value;
      zustand.fr2 = { wahl, ok: wahl === "niedriger" };
      panelAuswerten();
    });
    if (zustand.fr1.wahl) panel.querySelector("#exp-fr1-wahl").value = zustand.fr1.wahl;
    if (zustand.fr2.wahl) panel.querySelector("#exp-fr2-wahl").value = zustand.fr2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("resonanz-messreihe.csv",
        ["f in Hz", "A in cm"],
        zustand.messungen.slice().sort((a, b) => a.f - b.f).map(z => [z.f, z.A_cm]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        f: 1.0, vorhersage: "", messungen: [],
        fresEingabe: null, fresOk: null,
        fr1: { wahl: "", ok: null }, fr2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function fr1Feedback() {
    if (zustand.fr1.ok === null || !zustand.fr1.wahl) return "";
    return zustand.fr1.ok
      ? "✓ Genau! Trifft die Erregerfrequenz die Eigenfrequenz, so „schiebt“ der Antrieb immer im richtigen Moment in Bewegungsrichtung an. Pro Schwingung wird mehr Energie zugeführt, als die Dämpfung abzieht — die Amplitude wächst, bis sich ein hohes Gleichgewicht einstellt (Resonanz)."
      : "✗ Nicht ganz: Die Antriebskraft hängt nicht von f ab, und die Masse bleibt konstant. Entscheidend ist der <em>Takt</em>: Nur wenn der Antrieb im Rhythmus der Eigenschwingung anschiebt, addiert sich die Energie auf.";
  }
  function fr2Feedback() {
    if (zustand.fr2.ok === null || !zustand.fr2.wahl) return "";
    return zustand.fr2.ok
      ? "✓ Richtig: Mehr Dämpfung zieht pro Schwingung mehr Energie ab. Der Gipfel wird <strong>niedriger</strong> und gleichzeitig <strong>breiter</strong> (kleinere Güte) — bei sehr starker Dämpfung verschwindet die Überhöhung ganz. Genau das nutzen Stoßdämpfer."
      : "✗ Andersherum: Stärkere Dämpfung kann die Amplitude nicht vergrößern. Sie entzieht Energie — der Gipfel sinkt und wird breiter.";
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
