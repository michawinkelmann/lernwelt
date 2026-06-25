// experiment.js — Interaktives Experiment: Quantenzustände an polarisiertem Licht (QP, eA).
// Einzelne Photonen werden in einem definierten Polarisationszustand PRÄPARIERT
// (Präparator-Polarisator, fester Winkel α). Ein drehbarer Analysator (Winkel β)
// misst: Pro Photon ist der Ausgang ZUFÄLLIG, aber die Wahrscheinlichkeit für
// „Detektor ja" folgt der Projektionsregel P = cos²(β−α) (Malus auf
// Einzelphotonenebene = Messpostulat). Bei β−α = 45° ist P = 0,5 — echte
// Superposition. Nach der Messung ist das Photon im Analysatorzustand präpariert
// (Zustandsänderung durch Messung). Realitätsnahe Messpraxis statt fertiger Zahlen:
// Von N gesendeten Photonen liest man am Einzelphotonenzähler die Zahl der
// Durchgänge SELBST ab und bestimmt die relative Häufigkeit P. In der Auswertung
// trägt man P gegen cos²(β−α) auf — eine Ursprungsgerade bestätigt die
// Projektionsregel. Das Schrotrauschen ist pro Winkel deterministisch geseedet,
// dadurch bleiben pruefFaelle und TESTS in Node analytisch prüfbar.
// Modulebene DOM-frei.

import { streuung, parseDezimal, komma, esc, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const ALPHA = 0;                 // ° — Präparationswinkel (fest, hier vertikal 0°)
export const N_PHOTONEN = 500;          // gesendete Einzelphotonen je Einstellung
export const BETA_MIN = 0, BETA_MAX = 180, BETA_SCHRITT = 15;  // ° (Analysatorwinkel)
export const P_TOLERANZ = 0.03;         // akzeptierte Ablesung der rel. Häufigkeit P: ±0,03
export const COS2_TOLERANZ = 0.03;      // akzeptierte cos²(β−α)-Eingabe der Lernenden: ±0,03
export const STEIGUNG_SOLL = 1;         // P gegen cos²(β−α) → Ursprungsgerade mit Steigung 1
export const STEIGUNG_TOLERANZ = 0.08;  // Bewertung der Steigung gegen 1
export const MIN_MESSUNGEN = 6;         // mindestens sechs verschiedene Winkel β

// ---------- Physik (rein, Node-testbar) ----------
export function gradToBog(grad) {
  return grad * Math.PI / 180;
}
// cos²(β−α) — die Projektionswahrscheinlichkeit und zugleich die Auftragungsgröße
export function pDurch(betaGrad, alphaGrad = ALPHA) {
  const c = Math.cos(gradToBog(betaGrad - alphaGrad));
  return c * c;
}
// Schrotrauschen: bei N Einzelphotonen schwankt die gezählte Zahl um den Erwartungswert
// N·P mit der Standardabweichung √(N·P·(1−P)). Wir setzen eine deterministische Streuung
// von etwa einer Standardabweichung an (geseedet pro Winkel) und runden auf ganze Photonen.
export function streuPhotonen(betaGrad, alphaGrad = ALPHA, n = N_PHOTONEN) {
  const p = pDurch(betaGrad, alphaGrad);
  const sigma = Math.sqrt(n * p * (1 - p));
  return streuung("zaehl:" + betaGrad + ":" + alphaGrad + ":" + n, 2 * sigma); // ±1σ
}
// tatsächlich gezählte „Durchgänge" inkl. Schrotrauschen; nie < 0 oder > N
export function zaehlrateReal(betaGrad, alphaGrad = ALPHA, n = N_PHOTONEN) {
  const erwartet = n * pDurch(betaGrad, alphaGrad);
  const gezaehlt = Math.round(erwartet + streuPhotonen(betaGrad, alphaGrad, n));
  return Math.max(0, Math.min(n, gezaehlt)); // ganze Photonen, im Bereich 0…N
}
// abgelesene relative Häufigkeit P = (Durchgänge) / N
export function relHaeufigkeitReal(betaGrad, alphaGrad = ALPHA, n = N_PHOTONEN) {
  return zaehlrateReal(betaGrad, alphaGrad, n) / n;
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungPOk(eingabeP, betaGrad, alphaGrad = ALPHA, n = N_PHOTONEN) {
  return ablesungOk(eingabeP, relHaeufigkeitReal(betaGrad, alphaGrad, n), P_TOLERANZ);
}
export function cos2EingabeOk(eingabe, betaGrad, alphaGrad = ALPHA) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - pDurch(betaGrad, alphaGrad)) <= COS2_TOLERANZ;
}
// lineare Regression durch den Ursprung erzwingen: P = m·cos²(β−α), m = Σ(x·y)/Σ(x²).
// Die Projektionsregel sagt einen Achsenabschnitt 0 voraus — deshalb Ursprungsfit.
export function steigungUrsprung(punkte) {
  const sxx = punkte.reduce((a, p) => a + p.x * p.x, 0);
  const sxy = punkte.reduce((a, p) => a + p.x * p.y, 0);
  return sxx > 0 ? sxy / sxx : NaN;
}
export function bewertungSteigung(steigung) {
  const abw = Math.abs(steigung - STEIGUNG_SOLL) / STEIGUNG_SOLL * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= STEIGUNG_TOLERANZ * 100) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens sechs VERSCHIEDENE Winkel β
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.beta)).size >= MIN_MESSUNGEN;
}

// ---------- Prüffälle (analytisch nachgerechnet) ----------
export const pruefFaelle = [
  { art: "P", beta: 0, soll: 1, tol: 1e-12 },        // β = α: P = 1 (sicherer Durchgang)
  { art: "P", beta: 90, soll: 0, tol: 1e-12 },       // β = α+90°: P = 0 (Auslöschung)
  { art: "P", beta: 45, soll: 0.5, tol: 1e-12 },     // β = α+45°: P = 0,5 (Superposition)
  { art: "P", beta: 60, soll: 0.25, tol: 1e-12 },    // β = α+60°: P = 1/4
  { art: "P", beta: 30, soll: 0.75, tol: 1e-12 },    // β = α+30°: P = 3/4
  { art: "steigung", soll: 1, tol: 1e-12 }           // P gegen cos²(β−α) → Ursprungsgerade, m = 1
];

export const TESTS = [
  { name: "Sicherer Durchgang: β = α → P = 1 (auch 180°, paralleler Zustand)",
    ok: () => Math.abs(pDurch(0) - 1) < 1e-12 && Math.abs(pDurch(180) - 1) < 1e-12 },
  { name: "Auslöschung: β = α+90° → P = 0 (orthogonaler Zustand, nie ein Durchgang)",
    ok: () => Math.abs(pDurch(90)) < 1e-12 },
  { name: "Superposition: β = α+45° → P = 0,5 (echter Zufall pro Einzelphoton)",
    ok: () => Math.abs(pDurch(45) - 0.5) < 1e-12 && Math.abs(pDurch(135) - 0.5) < 1e-12 },
  { name: "Projektionswerte: P(60°)=1/4, P(30°)=3/4, P(120°)=1/4",
    ok: () => Math.abs(pDurch(60) - 0.25) < 1e-12 && Math.abs(pDurch(30) - 0.75) < 1e-12
      && Math.abs(pDurch(120) - 0.25) < 1e-12 },
  { name: "Unabhängig vom Präparationswinkel: nur die Differenz β−α zählt (α=30°, β=75° → 0,5)",
    ok: () => Math.abs(pDurch(75, 30) - 0.5) < 1e-12 && Math.abs(pDurch(30, 30) - 1) < 1e-12
      && Math.abs(pDurch(120, 30) - 0) < 1e-12 },
  { name: "Symmetrie P(β−α) = P(−(β−α)): 30°/−30° (=330°) gleich, 60°/120° um 90° gespiegelt gleich",
    ok: () => Math.abs(pDurch(30) - pDurch(330)) < 1e-12 && Math.abs(pDurch(60) - pDurch(120)) < 1e-12 },
  { name: "Linearität: P gegen cos²(β−α) ist exakt eine Ursprungsgerade mit Steigung 1",
    ok: () => { const punkte = [0, 15, 30, 45, 60, 90, 120, 150].map(b => ({ x: pDurch(b), y: pDurch(b) }));
      const m = steigungUrsprung(punkte);
      return Math.abs(m - 1) < 1e-12; } },
  { name: "Schrotrauschen: gezählte Photonen ganzzahlig in 0…N, Streuung ≲ wenige σ + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let b = BETA_MIN; b <= BETA_MAX; b += BETA_SCHRITT) {
        const z = zaehlrateReal(b);
        if (!Number.isInteger(z) || z < 0 || z > N_PHOTONEN) return false;
        const p = pDurch(b), sigma = Math.sqrt(N_PHOTONEN * p * (1 - p));
        // Abweichung vom Erwartungswert höchstens ~1,5σ + Rundung; bei P=0/1 ist σ=0 → exakt
        if (Math.abs(z - N_PHOTONEN * p) > 1.5 * sigma + 1) return false;
        if (sigma > 0 && Math.abs(z - N_PHOTONEN * p) > 0.5) irgendStreu = true;
      }
      // Determinismus + winkelabhängig
      return irgendStreu && zaehlrateReal(60) === zaehlrateReal(60) && zaehlrateReal(60) !== zaehlrateReal(75); } },
  { name: "Randfälle ohne Rauschen: P=1 → genau N Durchgänge, P=0 → genau 0 (σ=0)",
    ok: () => zaehlrateReal(0) === N_PHOTONEN && zaehlrateReal(180) === N_PHOTONEN && zaehlrateReal(90) === 0 },
  { name: "Ablese-/Eingabe-Toleranzen: P ±0,03, cos²(β−α) ±0,03",
    ok: () => { const wahr60 = relHaeufigkeitReal(60);
      return ablesungPOk(wahr60, 60) && ablesungPOk(wahr60 + 0.029, 60) && !ablesungPOk(wahr60 + 0.031, 60) && !ablesungPOk(NaN, 60)
        && cos2EingabeOk(0.75, 30) && cos2EingabeOk(0.77, 30) && !cos2EingabeOk(0.80, 30) && !cos2EingabeOk(NaN, 30); } },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("0,75") === 0.75 && parseDezimal("0.75") === 0.75 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 VERSCHIEDENEN Winkeln β",
    ok: () => { const z = b => ({ beta: b });
      const sechsGleich = [15, 15, 15, 15, 15, 15].map(z);
      const fuenf = [0, 30, 45, 60, 90].map(z);
      const sechs = [0, 30, 45, 60, 90, 120].map(z);
      return !messreiheVollstaendig(sechsGleich) && !messreiheVollstaendig(fuenf)
        && !messreiheVollstaendig(sechs.slice(0, 5)) && messreiheVollstaendig(sechs); } },
  { name: "Ursprungsfit aus exakten Werten → Steigung 1 → Bewertung sehr gut",
    ok: () => { const punkte = [0, 30, 45, 60, 90, 120].map(b => ({ x: pDurch(b), y: pDurch(b) }));
      return bewertungSteigung(steigungUrsprung(punkte)).stufe === "sehr gut"; } },
  { name: "Bewertung: 1,00 → sehr gut · 1,05 → gut · 1,15 → nochmal prüfen",
    ok: () => bewertungSteigung(1.00).stufe === "sehr gut" && bewertungSteigung(1.05).stufe === "gut"
      && bewertungSteigung(1.15).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "P") return Math.abs(pDurch(p.beta) - p.soll) <= p.tol;
      const punkte = [0, 30, 45, 60, 90, 120, 150].map(b => ({ x: pDurch(b), y: pDurch(b) }));
      return Math.abs(steigungUrsprung(punkte) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Strahlengang von links nach rechts) ----------
  const BANK_Y = 150;              // Höhe der optischen Achse
  const X_QUELLE = 62;             // Einzelphotonenquelle (rechts gerückt, damit das lange Label „Einzelphotonen" nicht links abgeschnitten wird)
  const X_PRAEP = 138;             // Präparator (fest, Winkel α)
  const X_ANA = 258;               // drehbarer Analysator (Winkel β)
  const X_DET = 372;               // Einzelphotonendetektor
  const SCHEIBE_R = 38;            // Radius der Polarisationsscheiben

  const zustand = {
    phase: "aufbau",
    beta: 0,
    vorhersage: "",                         // "max90" | "min90" | "gleich"
    messungen: [],                          // {beta, durchgaenge, pAbgelesen}
    cos2Geprueft: false,                    // wurden die cos²(β−α)-Spalten geprüft?
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
        <canvas id="exp-canvas" width="420" height="300" aria-label="Optische Bank von links nach rechts: eine Quelle einzelner Photonen, ein fester Präparator-Polarisator mit Winkel alpha, ein drehbarer Analysator mit einstellbarem Winkel beta und am Ende ein Einzelphotonendetektor. Über dem Analysator steht der aktuelle Winkel beta; rechts unten zeigt der Zähler, wie viele der gesendeten Photonen durchgekommen sind und die daraus abgelesene relative Häufigkeit P."></canvas>
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
    const p = pDurch(zustand.beta);                 // Durchlasswahrscheinlichkeit (für Strahlhelligkeit hinter Analysator)

    // optische Achse
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.moveTo(X_QUELLE, BANK_Y); ctx.lineTo(X_DET, BANK_Y); ctx.stroke();
    ctx.setLineDash([]);

    // Photonenstrahl (vereinzelt dargestellt durch kleine Pakete) Quelle → Präparator → Analysator
    if (sichtbar) {
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 5; ctx.globalAlpha = 0.85;
      ctx.beginPath(); ctx.moveTo(X_QUELLE + 16, BANK_Y); ctx.lineTo(X_PRAEP - SCHEIBE_R, BANK_Y); ctx.stroke();
      // präparierte Photonen weiter zum Analysator (gleicher Fluss — alle sind im Zustand α)
      ctx.beginPath(); ctx.moveTo(X_PRAEP + SCHEIBE_R, BANK_Y); ctx.lineTo(X_ANA - SCHEIBE_R, BANK_Y); ctx.stroke();
      // hinter dem Analysator: Bruchteil P kommt durch — Helligkeit ∝ P
      ctx.globalAlpha = Math.max(0.05, p);
      ctx.beginPath(); ctx.moveTo(X_ANA + SCHEIBE_R, BANK_Y); ctx.lineTo(X_DET - 10, BANK_Y); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // Einzelphotonenquelle
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(X_QUELLE - 24, BANK_Y - 18, 38, 36, 5); else ctx.rect(X_QUELLE - 24, BANK_Y - 18, 38, 36);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = sichtbar ? cAkzent : cLeise;
    ctx.beginPath(); ctx.arc(X_QUELLE - 5, BANK_Y, 7, 0, 7); ctx.fill();
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Einzelphotonen", X_QUELLE - 5, BANK_Y + 34);
    ctx.font = "12px system-ui, sans-serif";

    // Hilfsfunktion: Polarisationsscheibe mit Durchlassrichtung (Winkel in Grad, 0 = vertikal)
    const scheibe = (x, winkelGrad, etikett, betont) => {
      ctx.strokeStyle = betont ? cAkzent : cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath(); ctx.arc(x, BANK_Y, SCHEIBE_R, 0, 7); ctx.fill(); ctx.stroke();
      // Durchlassrichtung als Doppelpfeil; 0° = vertikal, positive Winkel im Uhrzeigersinn
      const a = gradToBog(winkelGrad);
      const dx = Math.sin(a) * (SCHEIBE_R - 8), dy = -Math.cos(a) * (SCHEIBE_R - 8);
      ctx.strokeStyle = betont ? cAkzent : cLeise; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(x - dx, BANK_Y - dy); ctx.lineTo(x + dx, BANK_Y + dy); ctx.stroke();
      ctx.fillStyle = betont ? cAkzent : cLeise;
      const sp = (px, py, vx, vy) => {
        const len = Math.hypot(vx, vy) || 1, ux = vx / len, uy = vy / len;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px - ux * 8 - uy * 4, py - uy * 8 + ux * 4);
        ctx.lineTo(px - ux * 8 + uy * 4, py - uy * 8 - ux * 4);
        ctx.closePath(); ctx.fill();
      };
      sp(x + dx, BANK_Y + dy, dx, dy); sp(x - dx, BANK_Y - dy, -dx, -dy);
      ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText(etikett, x, BANK_Y + SCHEIBE_R + 20);
      ctx.font = "12px system-ui, sans-serif";
    };

    // fester Präparator (Durchlass α) und drehbarer Analysator (β)
    scheibe(X_PRAEP, ALPHA, "Präparator (α = " + ALPHA + "°)", false);
    scheibe(X_ANA, zustand.beta, "Analysator", true);

    // Winkelangabe über dem Analysator
    ctx.fillStyle = cAkzent; ctx.textAlign = "center"; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("β = " + zustand.beta + "°", X_ANA, BANK_Y - SCHEIBE_R - 10);
    ctx.font = "12px system-ui, sans-serif";

    // Einzelphotonendetektor
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(X_DET - 9, BANK_Y - 24, 18, 48, 4); else ctx.rect(X_DET - 9, BANK_Y - 24, 18, 48);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Detektor", X_DET, BANK_Y + 40);

    // Zähler-Anzeige (Display) — die ABLESBAREN Werte: Durchgänge von N und daraus P
    const dispX = 250, dispY = 224, dispW = 162, dispH = 56;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(dispX, dispY, dispW, dispH, 6); else ctx.rect(dispX, dispY, dispW, dispH);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Einzelphotonenzähler", dispX + dispW / 2, dispY + 14);
    if (sichtbar) {
      const durch = zaehlrateReal(zustand.beta);
      ctx.fillStyle = cAkzent; ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText(durch + " / " + N_PHOTONEN + " durch", dispX + dispW / 2, dispY + 34);
      ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("rel. Häufigkeit P = " + komma(durch / N_PHOTONEN, 3), dispX + dispW / 2, dispY + 50);
    } else {
      ctx.fillStyle = cLeise; ctx.font = "bold 16px system-ui, sans-serif";
      ctx.fillText("— —", dispX + dispW / 2, dispY + 38);
    }
    ctx.font = "12px system-ui, sans-serif";

    // Hinweistext im Aufbau
    if (!sichtbar) {
      ctx.fillStyle = cFlaeche; ctx.fillRect(20, 224, 218, 56);
      ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("Quelle aus — der Zähler zeigt", 28, 244);
      ctx.fillText("die Durchgänge erst in der", 28, 260);
      ctx.fillText("Durchführung.", 28, 276);
      ctx.font = "12px system-ui, sans-serif";
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Idee</h2>
      <p>Eine Quelle sendet <strong>einzelne Photonen</strong> — immer nur eines zur Zeit. Der feste <strong>Präparator</strong> bringt jedes Photon in einen wohldefinierten <strong>Polarisationszustand</strong> (Durchlassrichtung α = ${ALPHA}°, hier vertikal): Es ist anschließend <em>präpariert</em>. Dahinter steht ein drehbarer <strong>Analysator</strong>, dessen Durchlassrichtung du um den Winkel <strong>β</strong> verstellen kannst. Ein <strong>Einzelphotonendetektor</strong> registriert für jedes Photon nur „ja, durchgekommen" oder „nein".</p>
      <p><strong>Das Quanten-Messpostulat:</strong> Für ein <em>einzelnes</em> Photon ist der Ausgang grundsätzlich <strong>zufällig</strong>. Vorhersagbar ist nur die <strong>Wahrscheinlichkeit</strong>, durchzukommen: P = cos²(β − α). Das ist die <strong>Projektion</strong> des präparierten Zustands auf die Analysatorrichtung — das Gesetz von Malus auf der Ebene einzelner Quantenobjekte.</p>
      <p><strong>Idee der Messung:</strong> Schick je Einstellung N = ${N_PHOTONEN} Photonen los und lies am Zähler ab, wie viele durchkommen. Die <strong>relative Häufigkeit</strong> P = (Durchgänge)/N nähert die Wahrscheinlichkeit an. Wie hängt P von β ab? Das findest du selbst heraus.</p>
      <p><strong>Plan:</strong> Miss P für mindestens ${MIN_MESSUNGEN} verschiedene Winkel β (Regler 0°–180°). In der Auswertung berechnest du zu jeder Zeile cos²(β−α) und trägst P dagegen auf.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich den Analysator von β = 0° auf β = 90° drehe, geht der Anteil der Durchgänge P …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="max90">… nach oben, bei 90° kommen fast alle durch</option>
        <option value="min90">… nach unten, bei 90° kommt (fast) keines durch</option>
        <option value="gleich">… bleibt etwa gleich (rund die Hälfte)</option>
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
  const wortAus = wahl => wahl === "max90" ? "bei 90° kommen fast alle durch"
    : wahl === "min90" ? "bei 90° kommt fast keines durch" : "bleibt etwa gleich";

  function beobachtungHtml() {
    const hat0 = zustand.messungen.some(z => z.beta <= 15);
    const hat90 = zustand.messungen.some(z => z.beta >= 75 && z.beta <= 105);
    const hat45 = zustand.messungen.some(z => z.beta >= 30 && z.beta <= 60);
    let html = `<p>Deine Vorhersage: beim Drehen auf 90° geht P <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus!</p>`;
    if (hat0 && hat90) {
      const ok = zustand.vorhersage === "min90";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: bei <strong>β = 0° kommen (fast) alle durch (P ≈ 1)</strong>, bei <strong>β = 90° praktisch keines (P ≈ 0)</strong>. ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."} Im orthogonalen Zustand wird jedes Photon „aussortiert".</p>`;
    }
    if (hat45) {
      html += `<p>Bei <strong>β ≈ 45°</strong> kommt etwa die <strong>Hälfte</strong> durch (P ≈ 0,5). Das ist keine halbe Energie pro Photon, sondern echte <strong>Superposition</strong>: Jedes einzelne Photon kommt mit Wahrscheinlichkeit ½ durch — welches genau, ist nicht vorhersagbar.</p>`;
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
    const anzWinkel = new Set(zustand.messungen.map(z => z.beta)).size;
    let fortschritt = `${anzWinkel} von mindestens ${MIN_MESSUNGEN} verschiedenen Winkeln gemessen.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-beta">Analysatorwinkel: β = <strong id="exp-beta-wert">${zustand.beta}°</strong> &nbsp;(Präparation α = ${ALPHA}° fest)</label>
        <input type="range" id="exp-beta" min="${BETA_MIN}" max="${BETA_MAX}" step="${BETA_SCHRITT}" value="${zustand.beta}" aria-label="Analysatorwinkel beta in Grad">
      </div>
      <p>Gesendet werden je Einstellung <strong>N = ${N_PHOTONEN}</strong> Einzelphotonen.</p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies den Zähler ab — relative Häufigkeit P = (Durchgänge)/${N_PHOTONEN}:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>β in °</th><th>Durchgänge von ${N_PHOTONEN}</th><th>P (abgelesen)</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.beta}</td><td>${z.durchgaenge}</td><td>${komma(z.pAbgelesen, 3)}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const regler = panel.querySelector("#exp-beta");
    regler.addEventListener("input", () => {
      zustand.beta = Math.round(Number(regler.value) / BETA_SCHRITT) * BETA_SCHRITT; // exakt auf Schrittweite — deterministischer Streu-Schlüssel
      panel.querySelector("#exp-beta-wert").textContent = zustand.beta + "°";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.beta === zustand.beta)) {
        meldung.textContent = "Diesen Winkel hast du schon gemessen — stelle ein anderes β ein.";
        return;
      }
      if (!ablesungPOk(eingabe, zustand.beta)) {
        meldung.textContent = "✗ Schau noch einmal auf den Zähler: Teile die Durchgänge durch " + N_PHOTONEN + ". (Auf etwa 0,02 genau ablesen.)";
        return;
      }
      zustand.messungen.push({ beta: zustand.beta, durchgaenge: zaehlrateReal(zustand.beta), pAbgelesen: eingabe });
      zustand.cos2Geprueft = false; // neue Zeile → Auswertung erneut prüfen
      zustand.meldungMessen = "✓ Eingetragen: β = " + zustand.beta + "°, P = " + komma(eingabe, 3) + ".";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Winkel — bisher: ${new Set(zustand.messungen.map(z => z.beta)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    // sortiert nach Winkel — für Diagramm und Lesbarkeit
    const zeilen = [...zustand.messungen].sort((a, b) => a.beta - b.beta);
    const alleCos2Ok = zustand.cos2Geprueft && zeilen.every(z => z.cos2Ok === true);
    // Ursprungsfit P = m·cos²(β−α) (mit den abgelesenen P) — erst nach bestätigten cos²-Werten
    const punkte = zeilen.map(z => ({ x: pDurch(z.beta), y: z.pAbgelesen }));
    const m = alleCos2Ok ? steigungUrsprung(punkte) : NaN;
    const bew = alleCos2Ok ? bewertungSteigung(m) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — sauber wie im Quantenoptik-Praktikum!"
      : bew.stufe === "gut" ? " Ordentlich! Mit Winkeln nahe 0°, 45° und 90° wird die Gerade noch klarer."
      : " Kein Drama: Miss ein paar Winkel mehr — mehr Photonen und mehr Winkel glätten das Schrotrauschen.") : "";

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Das Messpostulat sagt <strong>P = cos²(β − α)</strong> voraus (Projektion des präparierten Zustands). Prüfe das, indem du <strong>P gegen cos²(β−α)</strong> aufträgst: Kommt eine <strong>Ursprungsgerade mit Steigung 1</strong> heraus, ist die Projektionsregel bestätigt.</p>
      <p>Berechne zuerst zu jeder Zeile selbst <strong>cos²(β−α)</strong> mit α = ${ALPHA}° (Taschenrechner: β−α bilden, cos drücken, Ergebnis quadrieren) und trage es ein.</p>
      <details class="exp-fehler"><summary>Hilfe: cos²(β−α) für einen Winkel ausrechnen</summary>
        <p>Beispiel β = 30° (α = 0°): cos 30° ≈ 0,866; quadriert: 0,866² ≈ <strong>0,75</strong>. Kontrolle der Sonderfälle: cos²(0°) = 1 (β = α), cos²(90°) = 0 (β = α+90°), cos²(45°) = 0,5 (β = α+45°). Achte auf den Modus <em>DEG</em> (Grad), nicht RAD!</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>β in °</th><th>cos²(β−α)</th><th></th><th>P (abgelesen)</th></tr></thead>
        <tbody>${zeilen.map((z, i) => `<tr>
          <td>${z.beta}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.cos2Eingabe == null ? "" : komma(z.cos2Eingabe, 2)}" aria-label="Dein cos Quadrat von beta minus alpha für β gleich ${z.beta} Grad"></td>
          <td>${z.cos2Ok === true ? "✓" : z.cos2Ok === false ? "✗" : ""}</td>
          <td>${komma(z.pAbgelesen, 3)}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">cos²(β−α)-Spalte prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${alleCos2Ok ? `
      <h3>P gegen cos²(β−α) — dein Diagramm</h3>
      <canvas id="exp-diagramm" width="380" height="260" aria-label="Streudiagramm: waagerecht cos Quadrat von beta minus alpha von 0 bis 1, senkrecht die abgelesene relative Häufigkeit P von 0 bis 1. Die Messpunkte streuen leicht um eine Ursprungsgerade mit Steigung etwa 1; diese Ausgleichsgerade ist eingezeichnet."></canvas>
      <div class="exp-hinweis">
        <p><strong>Ursprungsgerade: P ≈ ${komma(m, 3)} · cos²(β−α).</strong> Die Punkte liegen nahe einer <strong>Ursprungsgeraden mit Steigung ≈ 1</strong> — das bestätigt die Projektionsregel P = cos²(β−α). Sollwert der Steigung: 1, Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung}</p>
        <p>Die kleine Streuung der Punkte ist kein Messfehler im üblichen Sinn, sondern <strong>Schrotrauschen</strong>: Pro Photon ist der Ausgang zufällig, nur über viele Photonen wird P scharf.</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Bei β = 45° kommt rund die Hälfte der Photonen durch. Was passiert mit einem <strong>einzelnen</strong> Photon?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="zufall">Es kommt zufällig durch oder nicht — Wahrscheinlichkeit ½; vorher steht es nicht fest</option>
          <option value="halb">Es kommt mit halber Energie durch (das Photon wird geteilt)</option>
          <option value="immer">Jedes zweite Photon kommt fest durch, abwechselnd</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Ein Photon hat den Analysator bei β = 30° passiert. In welchem <strong>Zustand</strong> ist es jetzt?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="analysator">Im Zustand der Analysatorrichtung (β = 30°) — die Messung hat es neu präpariert</option>
          <option value="praep">Weiterhin im Präparationszustand α = 0°</option>
          <option value="keiner">In gar keinem Zustand mehr</option>
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
        <p><strong>Schrotrauschen (statistische Streuung):</strong> Weil jedes Photon einzeln und zufällig entscheidet, schwankt die Zahl der Durchgänge bei N Photonen typisch um ±√(N·P·(1−P)). Bei N = ${N_PHOTONEN} sind das nahe P = ½ schon rund ±11 Photonen, also etwa ±0,02 in P. Mehr Photonen je Einstellung → schärferes P. Genau bei β = α und β = α+90° ist P = 1 bzw. 0, dort gibt es kein Rauschen.</p>
        <p><strong>Restdurchlass bei β = α+90°:</strong> Reale Polarisatoren löschen orthogonale Photonen nicht zu 100 % aus (endliches Auslöschungsverhältnis). Deshalb misst man dort selten exakt P = 0; die Gerade bekommt einen winzig positiven Achsenabschnitt.</p>
        <p><strong>Winkel-Ablesung am Analysator:</strong> Schon 2–3° Fehler beim Einstellen von β verschieben cos²(β−α) spürbar — besonders nahe 45°, wo die Kurve am steilsten ist. Sorgfältig auf die Gradskala schauen.</p>
        <p><strong>Dunkelzählrate des Detektors:</strong> Einzelphotonendetektoren „klicken" gelegentlich ohne Photon (thermisch). Das hebt P leicht an; man zieht eine Nullmessung (Quelle aus) ab.</p>
        <p><strong>Strategie dagegen:</strong> viele Winkel über den ganzen Bereich, möglichst viele Photonen je Einstellung und die Ausgleichsgerade durch den Ursprung legen — genau das hast du getan.</p>
      </details>`;

    if (alleCos2Ok) zeichneDiagramm(zeilen, m);

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zeilen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.cos2Eingabe = null; z.cos2Ok = null; return; }
        z.cos2Eingabe = wert;
        z.cos2Ok = cos2EingabeOk(wert, z.beta);
      });
      if (unvollstaendig) {
        zustand.cos2Geprueft = false;
        zustand.meldungAuswerten = "Fülle zuerst alle cos²(β−α)-Felder aus (Dezimalzahl, z. B. 0,75).";
        panelAuswerten(); return;
      }
      const falsch = zeilen.filter(z => !z.cos2Ok).length;
      zustand.cos2Geprueft = true;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle cos²(β−α)-Werte stimmen — unten erscheint dein Diagramm mit der Ursprungsgeraden."
        : "✗ " + falsch + (falsch > 1 ? " Werte passen" : " Wert passt") + " noch nicht (±0,03 Toleranz). Tipp: Taschenrechner auf DEG stellen, β−α bilden, cos davon nehmen und quadrieren.";
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "zufall" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "analysator" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("quantenzustaende-messreihe.csv",
        ["beta in Grad", "Durchgaenge von " + N_PHOTONEN, "cos^2(beta-alpha)", "P abgelesen"],
        zeilen.map(z => [String(z.beta), z.durchgaenge, pDurch(z.beta), z.pAbgelesen]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        beta: 0, vorhersage: "", messungen: [], cos2Geprueft: false,
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  // ---------- Diagramm P gegen cos²(β−α) ----------
  function zeichneDiagramm(zeilen, m) {
    const dg = panel.querySelector("#exp-diagramm");
    if (!dg) return;
    const c = dg.getContext("2d");
    const W = dg.width, H = dg.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const links = 44, unten = 36, oben = 14, rechts = 14;
    const px = x => links + x * (W - links - rechts);                 // x: cos²(β−α) ∈ [0,1]
    const yMax = 1.05;                                                // P (etwas Luft über 1)
    const py = y => H - unten - (y / yMax) * (H - unten - oben);      // y: rel. Häufigkeit P
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
    // y-Ticks 0; 0,5; 1
    c.textAlign = "end";
    [0, 0.5, 1].forEach(v => {
      const Y = py(v);
      c.strokeStyle = cLeise; c.lineWidth = 0.6;
      c.beginPath(); c.moveTo(links, Y); c.lineTo(W - rechts, Y); c.stroke();
      c.fillText(komma(v, 1), links - 6, Y + 4);
    });
    c.fillStyle = cLeise; c.textAlign = "center";
    c.fillText("cos²(β−α)", (links + W - rechts) / 2, H - 6);
    c.save(); c.translate(12, (oben + H - unten) / 2); c.rotate(-Math.PI / 2);
    c.fillText("P", 0, 0); c.restore();

    // Ursprungsgerade durch (0,0) und (1, m)
    c.strokeStyle = cAkzent; c.lineWidth = 2;
    c.beginPath(); c.moveTo(px(0), py(0)); c.lineTo(px(1), py(m)); c.stroke();

    // Messpunkte
    c.fillStyle = cText;
    zeilen.forEach(z => {
      const X = px(pDurch(z.beta)), Y = py(z.pAbgelesen);
      c.beginPath(); c.arc(X, Y, 3.2, 0, 7); c.fill();
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Pro Einzelphoton ist der Ausgang nicht vorherbestimmt — die Theorie liefert nur die Wahrscheinlichkeit P = cos²45° = ½. Welches Photon durchkommt, ist objektiv zufällig (Messpostulat). Erst über sehr viele Photonen wird daraus die scharfe Häufigkeit ½."
      : "✗ Nicht ganz: Ein Photon wird nicht geteilt (halbe Energie gibt es nicht), und es gibt kein festes <em>jedes zweite</em>. Bei β = 45° ist der präparierte Zustand eine <em>Superposition</em> aus Durchlass und Sperre — pro Photon entscheidet der Zufall mit Wahrscheinlichkeit ½.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: Die Messung verändert den Zustand. Ein Photon, das den Analysator bei β = 30° passiert hat, ist danach im Zustand der Analysatorrichtung (30°) präpariert — ein dritter Polarisator bei 30° ließe es nun sicher durch. Das ist der Kern des Messpostulats: Messen heißt Präparieren."
      : "✗ Nicht ganz: Durch das Passieren des Analysators wird das Photon auf dessen Durchlassrichtung <em>projiziert</em>. Es behält nicht den alten Zustand α = 0° und ist auch nicht <em>zustandslos</em>, sondern ist nun im Zustand der Analysatorrichtung β = 30°.";
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
