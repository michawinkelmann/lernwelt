// experiment.js — Interaktives Experiment: Polarisation von Licht / Gesetz von Malus (QP, gA+eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Hinter einem festen Polarisator ist das
// Licht linear polarisiert (Intensität I₀). Den drehbaren Analysator stellt man auf einen
// Winkel θ ein und liest am Fotosensor die relative Intensität I (in % von I₀) SELBST ab.
// Aus mindestens sechs Winkeln entsteht eine Messreihe; in der Auswertung berechnen die
// Lernenden zu jeder Zeile cos²θ, tragen I gegen cos²θ auf und erhalten eine Ursprungs-
// gerade — das ist der quantitative Nachweis des Gesetzes von Malus I(θ) = I₀·cos²(θ),
// die Steigung liefert I₀. Die kleine Ablesestreuung ist pro Winkel deterministisch
// geseedet — dadurch bleiben pruefFaelle und TESTS in Node analytisch prüfbar.
// Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, regression, esc, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const I0 = 100;                 // % — Intensität hinter dem Polarisator (Referenz = 100 %)
export const THETA_MIN = 0, THETA_MAX = 180, THETA_SCHRITT = 10;  // ° (Analysatorwinkel)
export const I_STREU_SPANNE = 2.4;     // % — Sensor-/Ablesestreuung auf die Intensität (±1,2 %)
export const I_TOLERANZ = 2.5;         // akzeptierte Ablesung der Intensität: ±2,5 %-Punkte
export const COS2_TOLERANZ = 0.03;     // akzeptierte cos²θ-Eingabe der Lernenden: ±0,03
export const STEIGUNG_TOLERANZ = 8;    // Bewertung der Steigung gegen I₀ in %-Punkten
export const MIN_MESSUNGEN = 6;        // mindestens sechs verschiedene Winkel

// ---------- Physik (rein, Node-testbar) ----------
export function gradToBog(thetaGrad) {
  return thetaGrad * Math.PI / 180;
}
// cos²θ (θ in Grad) — die Größe, gegen die in der Auswertung aufgetragen wird
export function cos2(thetaGrad) {
  const c = Math.cos(gradToBog(thetaGrad));
  return c * c;
}
// Gesetz von Malus: I(θ) = I₀·cos²(θ)
export function intensitaet(thetaGrad, i0 = I0) {
  return i0 * cos2(thetaGrad);
}
// am Sensor wirklich angezeigte Intensität inkl. reproduzierbarer Streuung; nie negativ
export function intensitaetReal(thetaGrad) {
  const wahr = intensitaet(thetaGrad) + streuung("I:" + thetaGrad, I_STREU_SPANNE);
  return Math.max(0, wahr); // % — der Sensor zeigt keine negativen Werte
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungIOk(eingabeProzent, thetaGrad) {
  return ablesungOk(eingabeProzent, intensitaetReal(thetaGrad), I_TOLERANZ);
}
export function cos2EingabeOk(eingabe, thetaGrad) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - cos2(thetaGrad)) <= COS2_TOLERANZ;
}
export function bewertungSteigung(steigung) {
  const abw = Math.abs(steigung - I0) / I0 * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= STEIGUNG_TOLERANZ) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens sechs VERSCHIEDENE Winkel
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.theta)).size >= MIN_MESSUNGEN;
}

// ---------- Prüffälle (analytisch nachgerechnet) ----------
export const pruefFaelle = [
  { art: "I", theta: 0, soll: 100, tol: 1e-9 },          // % — Maximum
  { art: "I", theta: 90, soll: 0, tol: 1e-9 },           // % — Auslöschung
  { art: "I", theta: 45, soll: 50, tol: 1e-9 },          // % — I₀/2
  { art: "I", theta: 60, soll: 25, tol: 1e-9 },          // % — I₀/4
  { art: "cos2", theta: 30, soll: 0.75, tol: 1e-9 },     // cos²30° = 3/4
  { art: "steigung", soll: 100, tol: 1e-9 }              // I gegen cos²θ → Ursprungsgerade, m = I₀
];

export const TESTS = [
  { name: "Maximum: I(0°) = I₀ = 100 % (Analysator parallel zum Polarisator)",
    ok: () => Math.abs(intensitaet(0) - 100) < 1e-9 && Math.abs(intensitaet(180) - 100) < 1e-9 },
  { name: "Auslöschung: I(90°) = 0 % (gekreuzte Polarisatoren)",
    ok: () => Math.abs(intensitaet(90) - 0) < 1e-9 },
  { name: "Halbwert: I(45°) = I₀/2 = 50 %",
    ok: () => Math.abs(intensitaet(45) - 50) < 1e-9 },
  { name: "Viertelwert: I(60°) = I₀/4 = 25 % (und I(120°) = 25 %)",
    ok: () => Math.abs(intensitaet(60) - 25) < 1e-9 && Math.abs(intensitaet(120) - 25) < 1e-9 },
  { name: "cos²θ-Stützwerte: cos²30° = 3/4, cos²90° = 0, cos²0° = 1",
    ok: () => Math.abs(cos2(30) - 0.75) < 1e-9 && Math.abs(cos2(90)) < 1e-12 && Math.abs(cos2(0) - 1) < 1e-12 },
  { name: "Symmetrie cos²(θ) = cos²(180°−θ): 30°/150° und 10°/170° gleich",
    ok: () => Math.abs(cos2(30) - cos2(150)) < 1e-12 && Math.abs(cos2(10) - cos2(170)) < 1e-12 },
  { name: "Linearität: I gegen cos²θ ist exakt eine Ursprungsgerade mit Steigung I₀",
    ok: () => { const punkte = [0, 10, 30, 45, 60, 90, 120, 150].map(t => ({ x: cos2(t), y: intensitaet(t) }));
      const r = regression(punkte);
      return Math.abs(r.m - I0) < 1e-9 && Math.abs(r.b) < 1e-9; } },
  { name: "Streugrenzen ±1,2 % auf dem ganzen Raster, nie negativ + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let t = THETA_MIN; t <= THETA_MAX; t += THETA_SCHRITT) {
        const ang = intensitaetReal(t);
        if (ang < 0) return false;
        const d = Math.abs(ang - intensitaet(t));
        // an θ=90° (wahr≈0) wird unten abgeschnitten → Abweichung kann kleiner sein; sonst ≤ Spanne/2
        if (intensitaet(t) > 1.3 && d > I_STREU_SPANNE / 2 + 1e-9) return false;
        if (d > 1e-6) irgendStreu = true;
      }
      return irgendStreu && intensitaetReal(40) === intensitaetReal(40)
        && intensitaetReal(40) !== intensitaetReal(50); } },
  { name: "Ablese-/Eingabe-Toleranzen: I ±2,5 %-Punkte, cos²θ ±0,03",
    ok: () => { const wahr30 = intensitaetReal(30);
      return ablesungIOk(wahr30, 30) && ablesungIOk(wahr30 + 2.4, 30) && !ablesungIOk(wahr30 + 2.6, 30) && !ablesungIOk(NaN, 30)
        && cos2EingabeOk(0.75, 30) && cos2EingabeOk(0.77, 30) && !cos2EingabeOk(0.80, 30) && !cos2EingabeOk(NaN, 30); } },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("0,75") === 0.75 && parseDezimal("0.75") === 0.75 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 VERSCHIEDENEN Winkeln",
    ok: () => { const z = t => ({ theta: t });
      const sechsGleich = [10, 10, 10, 10, 10, 10].map(z);
      const fuenf = [0, 30, 45, 60, 90].map(z);
      const sechs = [0, 20, 40, 60, 80, 100].map(z);
      return !messreiheVollstaendig(sechsGleich) && !messreiheVollstaendig(fuenf)
        && !messreiheVollstaendig(sechs.slice(0, 5)) && messreiheVollstaendig(sechs); } },
  { name: "Steigungsregression aus exakten Werten ≈ I₀ → Bewertung sehr gut",
    ok: () => { const punkte = [0, 30, 45, 60, 90, 120].map(t => ({ x: cos2(t), y: intensitaet(t) }));
      const m = regression(punkte).m;
      return bewertungSteigung(m).stufe === "sehr gut"; } },
  { name: "Bewertung: 100 → sehr gut · 105 → gut · 115 → nochmal prüfen",
    ok: () => bewertungSteigung(100).stufe === "sehr gut" && bewertungSteigung(105).stufe === "gut"
      && bewertungSteigung(115).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "I") return Math.abs(intensitaet(p.theta) - p.soll) <= p.tol;
      if (p.art === "cos2") return Math.abs(cos2(p.theta) - p.soll) <= p.tol;
      // steigung: I gegen cos²θ über das ganze Raster
      const punkte = [0, 30, 45, 60, 90, 120, 150].map(t => ({ x: cos2(t), y: intensitaet(t) }));
      return Math.abs(regression(punkte).m - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Strahlengang von links nach rechts auf der optischen Bank) ----------
  const BANK_Y = 150;              // Höhe der optischen Achse
  const X_QUELLE = 40;             // Lichtquelle
  const X_POL = 130;               // fester Polarisator
  const X_ANA = 250;               // drehbarer Analysator
  const X_SENS = 360;              // Fotosensor
  const SCHEIBE_R = 40;            // Radius der Polarisationsscheiben

  const zustand = {
    phase: "aufbau",
    theta: 0,
    vorhersage: "",                         // "max90" | "min90" | "gleich"
    messungen: [],                          // {theta, iAbgelesen}
    cos2Geprueft: false,                    // wurden die cos²θ-Spalten geprüft?
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
        <canvas id="exp-canvas" width="420" height="300" aria-label="Optische Bank von links nach rechts: Lichtquelle, fester Polarisator, drehbarer Analysator mit einstellbarem Winkel und am Ende ein Fotosensor. Über dem Analysator zeigt ein Pfeil die aktuelle Durchlassrichtung; rechts unten zeigt der Sensor die abgelesene relative Intensität in Prozent von I null."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");
  void reduzierteBewegung; // statisch-interaktiv: keine Daueranimation, daher kein Bewegungs-Opt-out nötig

  const vorhersageFehlt = () => !zustand.vorhersage;

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.lineWidth = 2;

    const sichtbar = zustand.phase !== "aufbau";
    const iWahr = intensitaet(zustand.theta);           // % (ideal, für die Strahlhelligkeit)

    // optische Achse
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X_QUELLE, BANK_Y); ctx.lineTo(X_SENS, BANK_Y); ctx.stroke();
    ctx.setLineDash([]);

    // Lichtstrahl Quelle → Polarisator (volle Helligkeit)
    if (sichtbar) {
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 6; ctx.globalAlpha = 0.9;
      ctx.beginPath(); ctx.moveTo(X_QUELLE + 14, BANK_Y); ctx.lineTo(X_POL - SCHEIBE_R, BANK_Y); ctx.stroke();
      // Polarisator → Analysator: linear polarisiert, weiterhin I₀
      ctx.beginPath(); ctx.moveTo(X_POL + SCHEIBE_R, BANK_Y); ctx.lineTo(X_ANA - SCHEIBE_R, BANK_Y); ctx.stroke();
      // hinter dem Analysator: Helligkeit ∝ cos²θ
      ctx.globalAlpha = Math.max(0.06, iWahr / I0);
      ctx.beginPath(); ctx.moveTo(X_ANA + SCHEIBE_R, BANK_Y); ctx.lineTo(X_SENS - 8, BANK_Y); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Lichtquelle
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(X_QUELLE - 22, BANK_Y - 18, 36, 36, 5); else ctx.rect(X_QUELLE - 22, BANK_Y - 18, 36, 36);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = sichtbar ? cAkzent : cLeise;
    ctx.beginPath(); ctx.arc(X_QUELLE - 4, BANK_Y, 8, 0, 7); ctx.fill();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Lampe", X_QUELLE - 4, BANK_Y + 36);

    // Hilfsfunktion: Polarisationsscheibe mit Durchlassrichtung (Winkel in Grad, 0 = senkrecht/vertikal)
    const scheibe = (x, winkelGrad, etikett, betont) => {
      ctx.strokeStyle = betont ? cAkzent : cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath(); ctx.arc(x, BANK_Y, SCHEIBE_R, 0, 7); ctx.fill(); ctx.stroke();
      // Durchlassrichtung als Doppelpfeil; 0° = vertikal, positive Winkel im Uhrzeigersinn
      const a = gradToBog(winkelGrad);
      const dx = Math.sin(a) * (SCHEIBE_R - 8), dy = -Math.cos(a) * (SCHEIBE_R - 8);
      ctx.strokeStyle = betont ? cAkzent : cLeise; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - dx, BANK_Y - dy); ctx.lineTo(x + dx, BANK_Y + dy); ctx.stroke();
      // Pfeilspitzen
      ctx.fillStyle = betont ? cAkzent : cLeise;
      const sp = (px, py, vx, vy) => {
        const len = Math.hypot(vx, vy), ux = vx / len, uy = vy / len;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - ux * 8 - uy * 4, py - uy * 8 + ux * 4);
        ctx.lineTo(px - ux * 8 + uy * 4, py - uy * 8 - ux * 4);
        ctx.closePath(); ctx.fill();
      };
      sp(x + dx, BANK_Y + dy, dx, dy); sp(x - dx, BANK_Y - dy, -dx, -dy);
      ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "12px system-ui, sans-serif";
      ctx.fillText(etikett, x, BANK_Y + SCHEIBE_R + 22);
    };

    // fester Polarisator (Durchlass vertikal, 0°) und drehbarer Analysator (θ)
    scheibe(X_POL, 0, "Polarisator (fest)", false);
    scheibe(X_ANA, zustand.theta, "Analysator", true);

    // Winkelangabe über dem Analysator
    ctx.fillStyle = cAkzent; ctx.textAlign = "center"; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("θ = " + zustand.theta + "°", X_ANA, BANK_Y - SCHEIBE_R - 12);
    ctx.font = "12px system-ui, sans-serif";

    // Fotosensor
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(X_SENS - 8, BANK_Y - 24, 16, 48, 4); else ctx.rect(X_SENS - 8, BANK_Y - 24, 16, 48);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Sensor", X_SENS, BANK_Y + 40);

    // Sensor-Anzeige (Display) — der ABLESBARE Wert
    const dispX = 320, dispY = 232, dispW = 92, dispH = 46;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(dispX, dispY, dispW, dispH, 6); else ctx.rect(dispX, dispY, dispW, dispH);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Intensität (% von I₀)", dispX + dispW / 2, dispY + 14);
    ctx.fillStyle = sichtbar ? cAkzent : cLeise; ctx.font = "bold 18px system-ui, sans-serif";
    ctx.fillText(sichtbar ? komma(intensitaetReal(zustand.theta), 1) + " %" : "— —", dispX + dispW / 2, dispY + 36);
    ctx.font = "12px system-ui, sans-serif";

    // Hinweistext im Aufbau
    if (!sichtbar) {
      ctx.fillStyle = cFlaeche; ctx.fillRect(20, 232, 280, 46);
      ctx.fillStyle = cLeise; ctx.textAlign = "start";
      ctx.fillText("Lampe aus — der Sensorwert erscheint", 28, 252);
      ctx.fillText("in der Durchführung.", 28, 270);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf der optischen Bank steht zuerst eine <strong>Lichtquelle</strong>, dann ein <strong>fester Polarisator</strong>: Hinter ihm ist das Licht <strong>linear polarisiert</strong> und hat die Intensität I₀ (wir setzen I₀ = 100 %). Dahinter folgt ein <strong>drehbarer Analysator</strong> — ein zweites Polarisationsfilter, dessen Durchlassrichtung du um den Winkel <strong>θ</strong> gegen den Polarisator verdrehen kannst. Am Ende misst ein <strong>Fotosensor</strong> die durchgelassene Intensität I und zeigt sie in % von I₀ an.</p>
      <p><strong>Idee der Messung:</strong> Stelle den Analysatorwinkel θ ein und lies am Sensor die relative Intensität I ab. Wie hängt I vom Winkel θ ab? Genau das findest du selbst heraus.</p>
      <p><strong>Plan:</strong> Miss I für mindestens ${MIN_MESSUNGEN} verschiedene Winkel θ (Regler 0°–180°). In der Auswertung berechnest du zu jeder Zeile cos²θ und trägst I gegen cos²θ auf.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich den Analysator von 0° auf 90° drehe, wird die gemessene Intensität …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="max90">… größer, bei 90° am hellsten</option>
        <option value="min90">… kleiner, bei 90° (fast) dunkel</option>
        <option value="gleich">… bleibt etwa gleich hell</option>
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
  const wortAus = wahl => wahl === "max90" ? "bei 90° am hellsten"
    : wahl === "min90" ? "bei 90° (fast) dunkel" : "etwa gleich hell";

  function beobachtungHtml() {
    const hat0 = zustand.messungen.some(z => z.theta <= 10);
    const hat90 = zustand.messungen.some(z => z.theta >= 80 && z.theta <= 100);
    let html = `<p>Deine Vorhersage: beim Drehen auf 90° wird es <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus!</p>`;
    if (hat0 && hat90) {
      const ok = zustand.vorhersage === "min90";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: bei <strong>0° maximal hell</strong>, bei <strong>90° fast dunkel (Auslöschung)</strong>. ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."} Gekreuzte Polarisatoren lassen kaum Licht durch.</p>`;
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
    const anzWinkel = new Set(zustand.messungen.map(z => z.theta)).size;
    let fortschritt = `${anzWinkel} von mindestens ${MIN_MESSUNGEN} verschiedenen Winkeln gemessen.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-theta">Analysatorwinkel: θ = <strong id="exp-theta-wert">${zustand.theta}°</strong></label>
        <input type="range" id="exp-theta" min="${THETA_MIN}" max="${THETA_MAX}" step="${THETA_SCHRITT}" value="${zustand.theta}" aria-label="Analysatorwinkel in Grad">
      </div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies den Sensor ab — Intensität I in % von I₀:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>θ in °</th><th>I in % von I₀</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.theta}</td><td>${komma(z.iAbgelesen, 1)}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const regler = panel.querySelector("#exp-theta");
    regler.addEventListener("input", () => {
      zustand.theta = Math.round(Number(regler.value) / THETA_SCHRITT) * THETA_SCHRITT; // exakt auf Schrittweite — deterministischer Streu-Schlüssel
      panel.querySelector("#exp-theta-wert").textContent = zustand.theta + "°";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.theta === zustand.theta)) {
        meldung.textContent = "Diesen Winkel hast du schon gemessen — stelle einen anderen θ ein.";
        return;
      }
      if (!ablesungIOk(eingabe, zustand.theta)) {
        meldung.textContent = "✗ Schau noch einmal genau auf das Display: Welcher Prozentwert steht dort? (Auf etwa 1–2 %-Punkte genau ablesen.)";
        return;
      }
      zustand.messungen.push({ theta: zustand.theta, iAbgelesen: eingabe });
      zustand.cos2Geprueft = false; // neue Zeile → Auswertung erneut prüfen
      zustand.meldungMessen = "✓ Eingetragen: θ = " + zustand.theta + "°, I = " + komma(eingabe, 1) + " %.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Winkel — bisher: ${new Set(zustand.messungen.map(z => z.theta)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    // sortiert nach Winkel — für Diagramm und Lesbarkeit
    const zeilen = [...zustand.messungen].sort((a, b) => a.theta - b.theta);
    const alleCos2Ok = zustand.cos2Geprueft && zeilen.every(z => z.cos2Ok === true);
    // Regression I gegen cos²θ (mit den abgelesenen Intensitäten) — erst nach bestätigten cos²θ
    const punkte = zeilen.map(z => ({ x: cos2(z.theta), y: z.iAbgelesen }));
    const reg = alleCos2Ok ? regression(punkte) : { m: NaN, b: NaN };
    const bew = alleCos2Ok ? bewertungSteigung(reg.m) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — sauber gemessen wie im Praktikum!"
      : bew.stufe === "gut" ? " Ordentlich! Mit Winkeln nahe 0° und 90° wird die Gerade noch klarer."
      : " Kein Drama: Miss ein paar Winkel mehr und achte aufs genaue Ablesen — dann passt die Ursprungsgerade besser.") : "";

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Das Gesetz von Malus vermutet <strong>I = I₀ · cos²θ</strong>. Prüfe das, indem du <strong>I gegen cos²θ</strong> aufträgst: Kommt eine <strong>Ursprungsgerade</strong> heraus, ist Malus bestätigt — die Steigung ist dann I₀.</p>
      <p>Berechne zuerst zu jeder Zeile selbst <strong>cos²θ</strong> (Taschenrechner: cos(θ) drücken, Ergebnis quadrieren) und trage es ein.</p>
      <details class="exp-fehler"><summary>Hilfe: cos²θ für einen Winkel ausrechnen</summary>
        <p>Beispiel θ = 30°: cos 30° ≈ 0,866; quadriert: 0,866² ≈ <strong>0,75</strong>. Kontrolle der Extreme: cos²0° = 1, cos²90° = 0, cos²45° = 0,5. Achte auf den Modus <em>DEG</em> (Grad), nicht RAD!</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>θ in °</th><th>cos²θ</th><th></th><th>I in % von I₀</th></tr></thead>
        <tbody>${zeilen.map((z, i) => `<tr>
          <td>${z.theta}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.cos2Eingabe == null ? "" : komma(z.cos2Eingabe, 2)}" aria-label="Dein cos Quadrat theta für θ gleich ${z.theta} Grad"></td>
          <td>${z.cos2Ok === true ? "✓" : z.cos2Ok === false ? "✗" : ""}</td>
          <td>${komma(z.iAbgelesen, 1)}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">cos²θ-Spalte prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${alleCos2Ok ? `
      <h3>I gegen cos²θ — dein Diagramm</h3>
      <canvas id="exp-diagramm" width="380" height="260" aria-label="Streudiagramm: waagerecht cos Quadrat theta von 0 bis 1, senkrecht die abgelesene Intensität in Prozent. Die Messpunkte liegen nahe einer Ursprungsgeraden; die Ausgleichsgerade ist eingezeichnet."></canvas>
      <div class="exp-hinweis">
        <p><strong>Ausgleichsgerade: I ≈ ${komma(reg.m, 1)} · cos²θ ${reg.b >= 0 ? "+" : "−"} ${komma(Math.abs(reg.b), 1)} %.</strong> Die Punkte liegen nahe einer <strong>Ursprungsgeraden</strong> — das bestätigt das Gesetz von Malus. Die Steigung entspricht I₀ (Sollwert 100 %), Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung}</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Bei θ = 90° (gekreuzte Filter) ist es fast dunkel. Was beweist diese <strong>Auslöschung</strong> über die Natur des Lichts?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="transversal">Licht ist eine Transversalwelle (Schwingung quer zur Ausbreitung)</option>
          <option value="longitudinal">Licht ist eine Longitudinalwelle wie der Schall</option>
          <option value="teilchen">Licht besteht nur aus Teilchen ohne Schwingungsrichtung</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du stellst θ = 60° ein. Welchen Bruchteil von I₀ erwartest du am Sensor (Malus)?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="haelfte">etwa die Hälfte (50 %)</option>
          <option value="viertel">etwa ein Viertel (25 %)</option>
          <option value="null">praktisch nichts (0 %)</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum liegt die Gerade nie perfekt?</summary>
        <p><strong>Restlicht bei 90°:</strong> Echte Polarisatoren lassen auch gekreuzt einen winzigen Rest durch (endliches Auslöschungsverhältnis). Deshalb misst man bei 90° selten exakt 0 % — der Achsenabschnitt der Geraden ist leicht positiv.</p>
        <p><strong>Streulicht und Umgebungslicht:</strong> Tageslicht oder Reflexe an Linsenrändern treffen den Sensor zusätzlich. Abhilfe: abdunkeln, Sensor abschirmen, Nullmessung ohne Lampe abziehen.</p>
        <p><strong>Winkel-Ablesung am Analysator:</strong> Schon 2–3° Fehler beim Drehen verschieben cos²θ spürbar — gerade in der Nähe von 45°, wo die Kurve am steilsten ist. Sorgfältig auf die Gradskala schauen.</p>
        <p><strong>Nicht perfekt monochromatisch:</strong> Eine Glühlampe enthält viele Wellenlängen, die der Polarisator unterschiedlich behandelt. Mit Laser- oder Filterlicht wird die Messung sauberer.</p>
        <p><strong>Strategie dagegen:</strong> viele Winkel über den ganzen Bereich messen, abdunkeln und die Ausgleichsgerade durch alle Punkte legen — genau das hast du getan.</p>
      </details>`;

    if (alleCos2Ok) zeichneDiagramm(zeilen, reg);

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zeilen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.cos2Eingabe = null; z.cos2Ok = null; return; }
        z.cos2Eingabe = wert;
        z.cos2Ok = cos2EingabeOk(wert, z.theta);
      });
      if (unvollstaendig) {
        zustand.cos2Geprueft = false;
        zustand.meldungAuswerten = "Fülle zuerst alle cos²θ-Felder aus (Dezimalzahl, z. B. 0,75).";
        panelAuswerten(); return;
      }
      const falsch = zeilen.filter(z => !z.cos2Ok).length;
      zustand.cos2Geprueft = true;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle cos²θ-Werte stimmen — unten erscheint dein Diagramm mit der Ausgleichsgeraden."
        : "✗ " + falsch + (falsch > 1 ? " Werte passen" : " Wert passt") + " noch nicht (±0,03 Toleranz). Tipp: Taschenrechner auf DEG stellen, cos(θ) bilden und das Ergebnis quadrieren.";
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "transversal" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "viertel" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("polarisation-messreihe.csv",
        ["theta in Grad", "cos^2 theta", "I in % von I0"],
        zeilen.map(z => [String(z.theta), cos2(z.theta), z.iAbgelesen]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        theta: 0, vorhersage: "", messungen: [], cos2Geprueft: false,
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  // ---------- Diagramm I gegen cos²θ ----------
  function zeichneDiagramm(zeilen, reg) {
    const dg = panel.querySelector("#exp-diagramm");
    if (!dg) return;
    const c = dg.getContext("2d");
    const W = dg.width, H = dg.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const links = 44, unten = 36, oben = 14, rechts = 14;
    const px = x => links + x * (W - links - rechts);                 // x: cos²θ ∈ [0,1]
    const yMax = 105;                                                 // % (etwas Luft über 100)
    const py = y => H - unten - (y / yMax) * (H - unten - oben);      // y: Intensität in %
    c.clearRect(0, 0, W, H);
    c.font = "11px system-ui, sans-serif";

    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(links, oben); c.lineTo(links, H - unten); c.lineTo(W - rechts, H - unten); c.stroke();
    // x-Ticks 0 … 1
    c.fillStyle = cLeise; c.textAlign = "center";
    for (let k = 0; k <= 5; k++) {
      const x = k / 5, X = px(x);
      c.strokeStyle = cLeise; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(X, oben); c.lineTo(X, H - unten); c.stroke();
      c.fillText(komma(x, 1), X, H - unten + 14);
    }
    // y-Ticks 0,50,100
    c.textAlign = "end";
    [0, 50, 100].forEach(v => {
      const Y = py(v);
      c.strokeStyle = cLeise; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(links, Y); c.lineTo(W - rechts, Y); c.stroke();
      c.fillText(String(v), links - 6, Y + 4);
    });
    c.fillStyle = cLeise; c.textAlign = "center";
    c.fillText("cos²θ", (links + W - rechts) / 2, H - 6);
    c.save(); c.translate(12, (oben + H - unten) / 2); c.rotate(-Math.PI / 2);
    c.fillText("I in %", 0, 0); c.restore();

    // Ausgleichsgerade
    c.strokeStyle = cAkzent; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px(0), py(reg.b)); c.lineTo(px(1), py(reg.m * 1 + reg.b)); c.stroke();

    // Messpunkte
    c.fillStyle = cText;
    zeilen.forEach(z => {
      const X = px(cos2(z.theta)), Y = py(z.iAbgelesen);
      c.beginPath(); c.arc(X, Y, 3.2, 0, 7); c.fill();
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Nur eine Transversalwelle hat eine Schwingungsrichtung quer zur Ausbreitung, die ein Filter aussortieren kann. Stehen Polarisator und Analysator senkrecht zueinander, wird die durchgelassene Schwingung vollständig blockiert — es wird dunkel. Longitudinalwellen wie Schall lassen sich nicht polarisieren."
      : "✗ Nicht ganz: Schall ist longitudinal und lässt sich gar nicht polarisieren; reine Teilchen hätten keine Schwingungsrichtung. Dass ein gedrehtes Filter das Licht auslöschen kann, geht nur, wenn Licht <em>quer</em> zur Ausbreitung schwingt — also eine Transversalwelle ist.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: cos 60° = 0,5, also cos²60° = 0,25 → I = I₀/4 = 25 %. Kontrolle in deiner Tabelle bei θ = 60° (und 120°)."
      : "✗ Rechne mit Malus: cos 60° = 0,5; quadriert 0,25. Also I = I₀ · 0,25 = ein Viertel. (Die Hälfte gehört zu 45°, praktisch nichts zu 90°.)";
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
