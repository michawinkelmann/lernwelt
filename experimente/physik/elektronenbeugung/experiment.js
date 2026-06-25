// experiment.js — Interaktives Experiment: Elektronenbeugung an Graphit (Qualifikationsphase).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Beschleunigungsspannung U
// selbst einstellen, den Durchmesser der beiden Beugungsringe an der mm-Skala
// des Leuchtschirms SELBST ablesen, Messreihe protokollieren und r gegen 1/√U
// auftragen. Aus der Ursprungsgeraden bestätigt der gA-Zweig r ∝ 1/√U (und
// damit λ ∝ 1/√U), der eA-Zweig bestimmt aus der Steigung den Netzebenenabstand d.
// Modell (Debye-Scherrer, Kleinwinkel-Schulform): de-Broglie λ = h/√(2·mₑ·e·U),
// Bragg sin θ = λ/dₙ, Ringradius r = 2·L·λ/dₙ ∝ 1/√U bei festem L. Die kleine
// Ablesestreuung ist pro (U, Ring) deterministisch geseedet — dadurch bleiben
// pruefFaelle und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, regression, esc, farbe, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const H_PLANCK = 6.626e-34;         // J·s
export const M_E = 9.109e-31;              // kg — Elektronenmasse
export const E_LADUNG = 1.602e-19;         // C — Elementarladung
export const L_SCHIRM = 0.135;             // m — Abstand Graphitfolie ↔ Leuchtschirm (fest)
export const D1 = 213e-12;                 // m — Netzebenenabstand 1 (innerer Ring), intern!
export const D2 = 123e-12;                 // m — Netzebenenabstand 2 (äußerer Ring), intern!
// λ = h/√(2·mₑ·e·U) = K_LAMBDA/√U  mit  K_LAMBDA = h/√(2·mₑ·e)
export const K_LAMBDA = H_PLANCK / Math.sqrt(2 * M_E * E_LADUNG); // ≈ 1,2265·10⁻⁹ m·√V
export const U_MIN = 3000, U_MAX = 7000, U_SCHRITT = 250;         // V (3–7 kV)
export const R_STREU_SPANNE = 0.0016;      // m — Ablese-/Strahlstreuung auf den Radius (±0,8 mm)
export const R_TOLERANZ_CM = 0.2;          // akzeptierte Ablesung des Radius: ±0,2 cm
export const D_TOLERANZ_PM = 12;           // d-Eingabe in pm: ±12 pm
export const STEIGUNG_REL_TOL = 0.04;      // relative Toleranz der selbst gerechneten Steigung
export const MIN_MESSUNGEN = 6;

// Die zwei Ringe als Datensätze (intern; auf dem Schirm sind sie nur „innen/außen")
export const RINGE = [
  { id: "innen", label: "innerer Ring", d: D1 },
  { id: "aussen", label: "äußerer Ring", d: D2 }
];

// ---------- Physik (rein, Node-testbar) ----------
// de-Broglie-Wellenlänge der mit U beschleunigten Elektronen (m)
export function deBroglie(uVolt) {
  return uVolt > 0 ? K_LAMBDA / Math.sqrt(uVolt) : NaN;
}
// idealer Ringradius (Kleinwinkel-Schulnäherung r = 2·L·λ/d): m
export function ringRadius(uVolt, dMeter, lMeter = L_SCHIRM) {
  return dMeter > 0 && uVolt > 0 ? 2 * lMeter * deBroglie(uVolt) / dMeter : NaN;
}
// wahrer, abzulesender Radius inkl. reproduzierbarer Streuung (Strahlbreite, Justage): m
export function ringRadiusReal(uVolt, dMeter) {
  return ringRadius(uVolt, dMeter) + streuung("r:" + uVolt + ":" + dMeter, R_STREU_SPANNE);
}
// Steigung der Geraden r = m·(1/√U):  m = r·√U  (ein Messpunkt) — die rechnen die Lernenden selbst
export function steigungAusPunkt(rMeter, uVolt) {
  return uVolt > 0 ? rMeter * Math.sqrt(uVolt) : NaN;
}
// Netzebenenabstand aus der Geradensteigung m: aus r = 2·L·K_LAMBDA/d · 1/√U folgt
// m = 2·L·K_LAMBDA/d  ⇒  d = 2·L·K_LAMBDA/m
export function dAusSteigung(steigung, lMeter = L_SCHIRM) {
  return steigung > 0 ? 2 * lMeter * K_LAMBDA / steigung : NaN;
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungROk(eingabeCm, wahrRMeter) {
  return ablesungOk(eingabeCm, wahrRMeter * 100, R_TOLERANZ_CM);
}
export function dEingabeOk(eingabePm, wahrPm) {
  return Number.isFinite(eingabePm) && Math.abs(eingabePm - wahrPm) <= D_TOLERANZ_PM;
}
export function steigungOk(eingabe, wahr) {
  return Number.isFinite(eingabe) && wahr > 0 && Math.abs(eingabe - wahr) / wahr <= STEIGUNG_REL_TOL;
}
// Einordnung eines bestimmten d gegen den Literaturwert (nur Rückmeldung, keine Note)
export function bewertungD(dPm, wahrPm) {
  const abw = Math.abs(dPm - wahrPm) / wahrPm * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene U, beide Ringe je Messung
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.U)).size >= MIN_MESSUNGEN;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "lambda", U: 5000, soll: 1.73450e-11, tol: 1e-15 },               // m (≈ 17,35 pm)
  { art: "r", U: 5000, ring: "innen", soll: 0.021987, tol: 2e-5 },         // m (≈ 2,20 cm)
  { art: "r", U: 5000, ring: "aussen", soll: 0.038077, tol: 2e-5 },        // m (≈ 3,81 cm)
  { art: "d", ring: "innen", soll: 213e-12, tol: 1e-15 },                  // m (Rückrechnung über Steigung)
  { art: "d", ring: "aussen", soll: 123e-12, tol: 1e-15 }
];

export const TESTS = [
  { name: "K_LAMBDA exakt: h/√(2·mₑ·e) ≈ 1,2265·10⁻⁹ m·√V",
    ok: () => K_LAMBDA === 6.626e-34 / Math.sqrt(2 * 9.109e-31 * 1.602e-19)
      && Math.abs(K_LAMBDA - 1.2265e-9) < 1e-13 },
  { name: "de-Broglie: U = 5000 V → λ ≈ 17,35 pm (±0,01 pm)",
    ok: () => Math.abs(deBroglie(5000) - 1.7345e-11) <= 1e-14 },
  { name: "Kontrollradien bei U = 5000 V: r_innen ≈ 2,20 cm, r_außen ≈ 3,81 cm",
    ok: () => Math.abs(ringRadius(5000, D1) - 0.021987) <= 2e-5
      && Math.abs(ringRadius(5000, D2) - 0.038077) <= 2e-5 },
  { name: "1/√U-Gesetz: U vervierfachen → r exakt halbiert (beide Ringe)",
    ok: () => Math.abs(ringRadius(12000, D1) - 0.5 * ringRadius(3000, D1)) <= 1e-15
      && Math.abs(ringRadius(20000, D2) - 0.5 * ringRadius(5000, D2)) <= 1e-15 },
  { name: "r ∝ 1/√U: m = r·√U über das ganze Raster konstant je Ring",
    ok: () => RINGE.every(ring => {
      const soll = 2 * L_SCHIRM * K_LAMBDA / ring.d;
      for (let u = U_MIN; u <= U_MAX; u += U_SCHRITT)
        if (Math.abs(steigungAusPunkt(ringRadius(u, ring.d), u) - soll) > 1e-12) return false;
      return true;
    }) },
  { name: "äußerer Ring stets größer: r_außen/r_innen = d_innen/d_außen ≈ 1,73",
    ok: () => { const v = D1 / D2;
      return [3000, 5000, 7000].every(u =>
        Math.abs(ringRadius(u, D2) / ringRadius(u, D1) - v) <= 1e-12 && v > 1.7); } },
  { name: "Rückrechnung d aus Steigung exakt: 213 pm und 123 pm",
    ok: () => Math.abs(dAusSteigung(2 * L_SCHIRM * K_LAMBDA / D1) - D1) <= 1e-15
      && Math.abs(dAusSteigung(2 * L_SCHIRM * K_LAMBDA / D2) - D2) <= 1e-15 },
  { name: "Regression über perfekte Messpunkte liefert Steigung 2·L·K_λ/d (Ursprung)",
    ok: () => RINGE.every(ring => {
      const pkt = []; for (let u = U_MIN; u <= U_MAX; u += U_SCHRITT)
        pkt.push({ x: 1 / Math.sqrt(u), y: ringRadius(u, ring.d) });
      const { m, b } = regression(pkt);
      return Math.abs(m - 2 * L_SCHIRM * K_LAMBDA / ring.d) <= 1e-9 && Math.abs(b) <= 1e-9;
    }) },
  { name: "Streugrenzen ±0,8 mm auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let u = U_MIN; u <= U_MAX; u += U_SCHRITT) for (const ring of RINGE) {
        const ab = Math.abs(ringRadiusReal(u, ring.d) - ringRadius(u, ring.d));
        if (ab > R_STREU_SPANNE / 2 + 1e-12) return false;
        if (ab > 1e-6) irgendStreu = true;
      }
      return irgendStreu && ringRadiusReal(5000, D1) === ringRadiusReal(5000, D1)
        && ringRadiusReal(5000, D1) !== ringRadiusReal(5250, D1)
        && ringRadiusReal(5000, D1) !== ringRadiusReal(5000, D2); } },
  { name: "Ehrliche Ablesung (mit Streuung) trifft d auf unter 15 pm (Praktikumsgüte)",
    ok: () => RINGE.every(ring => {
      const pkt = []; for (let u = U_MIN; u <= U_MAX; u += U_SCHRITT)
        pkt.push({ x: 1 / Math.sqrt(u), y: ringRadiusReal(u, ring.d) });
      const { m } = regression(pkt);
      return Math.abs(dAusSteigung(m) - ring.d) < 15e-12;
    }) },
  { name: "Ablese-/Eingabe-Toleranzen: r ±0,2 cm, d ±12 pm, Steigung ±4 %",
    ok: () => ablesungROk(2.2, 0.0220) && !ablesungROk(2.5, 0.0220) && !ablesungROk(NaN, 0.0220)
      && dEingabeOk(213, 213) && dEingabeOk(124, 213 - 88) && !dEingabeOk(99, 213) && !dEingabeOk(NaN, 213)
      && steigungOk(1.55, 1.5547) && !steigungOk(1.7, 1.5547) && !steigungOk(NaN, 1.5547) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("2,2") === 2.2 && parseDezimal("2.2") === 2.2 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen Spannungen",
    ok: () => { const z = U => ({ U });
      const wenig = [3000, 3500, 4000, 4500, 5000].map(z);
      const doppelt = [3000, 3000, 4000, 4000, 5000, 6000].map(z);
      const gut = [3000, 3500, 4000, 5000, 6000, 7000].map(z);
      return !messreiheVollstaendig(wenig) && !messreiheVollstaendig(doppelt)
        && messreiheVollstaendig(gut) && !messreiheVollstaendig(gut.slice(0, 5)); } },
  { name: "Bewertung d: 213 → sehr gut · 200 → gut · 170 → nochmal prüfen",
    ok: () => bewertungD(213, 213).stufe === "sehr gut" && bewertungD(200, 213).stufe === "gut"
      && bewertungD(170, 213).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "lambda") return Math.abs(deBroglie(p.U) - p.soll) <= p.tol;
      if (p.art === "r") return Math.abs(ringRadius(p.U, p.ring === "innen" ? D1 : D2) - p.soll) <= p.tol;
      const d = p.ring === "innen" ? D1 : D2;
      return Math.abs(dAusSteigung(2 * L_SCHIRM * K_LAMBDA / d) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Blick auf den runden Leuchtschirm) ----------
  const CX = 180, CY = 188;        // Schirmmitte (= 0. Strahl, Skalen-Null)
  const R_SCHIRM = 150;            // px — Radius des runden Leuchtschirms
  const PX_PRO_CM = 24;            // Maßstab: 1 cm auf dem Schirm ≙ 24 px
  const SKALA_CM = 6;              // mm-Skala (waagerecht nach rechts) bis 6 cm

  const zustand = {
    phase: "aufbau",
    U: 5000,
    vorhersage: "",                       // "groesser" | "kleiner" | "gleich"
    messungen: [],                        // {U, rInnenCm, rAussenCm}
    ringWahl: "innen",                    // welcher Ring gerade abgelesen wird
    auswRing: "innen",                    // welcher Ring ausgewertet wird (gA/eA)
    steigungEingabe: null, steigungOk: null,
    dEingabe: null, dOk: null,
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
        <canvas id="exp-canvas" width="360" height="470" aria-label="Frontalansicht der Elektronenbeugungsröhre: ein runder grüner Leuchtschirm, in der Mitte der helle ungebeugte Strahlfleck. In der Durchführung erscheinen zwei konzentrische Beugungsringe um die Mitte. Eine Millimeter-Skala läuft waagerecht von der Mitte nach rechts; an ihr liest du die Ringradien ab. Unten zeigt ein Netzgerät die Beschleunigungsspannung an."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  const dRing = id => id === "innen" ? D1 : D2;
  const wahrPm = id => Math.round(dRing(id) * 1e12);
  // wahre Steigung des gewählten Auswertungsrings (für die Toleranzprüfung)
  const steigungWahr = () => 2 * L_SCHIRM * K_LAMBDA / dRing(zustand.auswRing);

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    // Leuchtschirm-Glaskolben (rund)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, CY, R_SCHIRM, 0, 7); ctx.fill(); ctx.stroke();
    // dezenter grünlicher Leuchtfond nur in der Durchführung/Auswertung
    if (zustand.phase !== "aufbau") {
      ctx.fillStyle = "rgba(80, 200, 120, 0.10)";
      ctx.beginPath(); ctx.arc(CX, CY, R_SCHIRM - 2, 0, 7); ctx.fill();
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Leuchtschirm (Frontalansicht)", CX, 22);

    // Beugungsringe (ab Durchführung)
    if (zustand.phase !== "aufbau") {
      for (const ring of RINGE) {
        const rPx = ringRadiusReal(zustand.U, ring.d) * 100 * PX_PRO_CM;
        if (rPx > R_SCHIRM - 4) continue; // läge außerhalb des Schirms
        ctx.strokeStyle = "rgba(70, 210, 120, 0.85)";
        ctx.globalAlpha = 0.30; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(CX, CY, rPx, 0, 7); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(CX, CY, rPx, 0, 7); ctx.stroke();
      }
      // ungebeugter Zentralfleck
      ctx.fillStyle = "rgba(120, 230, 150, 1)";
      ctx.beginPath(); ctx.arc(CX, CY, 5, 0, 7); ctx.fill();
    }

    // waagerechte mm-Skala von der Mitte nach rechts (liegt über dem Schirm)
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + SKALA_CM * PX_PRO_CM, CY); ctx.stroke();
    for (let halb = 0; halb <= SKALA_CM * 2; halb++) {
      const cm = halb / 2, x = CX + cm * PX_PRO_CM, ganz = halb % 2 === 0;
      ctx.strokeStyle = ganz ? cText : cLeise; ctx.lineWidth = ganz ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(x, CY); ctx.lineTo(x, CY - (ganz ? 11 : 6)); ctx.stroke();
      if (ganz && cm > 0) { ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(String(cm), x, CY - 15); }
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("Radius-Skala · cm", CX + 6, CY + 16);

    // Netzgerät-Anzeige
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(96, 408, 168, 46, 6); else ctx.rect(96, 408, 168, 46);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Beschleunigungsspannung", 180, 425);
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("U = " + komma(zustand.U / 1000, 2) + " kV", 180, 445);
    ctx.font = "12px system-ui, sans-serif";

    // Hinweis im Aufbau (mit Hintergrund — gut lesbar)
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(CX - 100, CY - 30, 200, 60);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Strahl aus —", CX, CY - 10);
      ctx.fillText("die Beugungsringe erscheinen", CX, CY + 8);
      ctx.fillText("in der Durchführung", CX, CY + 26);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>In der <strong>Elektronenbeugungsröhre</strong> erzeugt eine Elektronenkanone einen feinen Strahl: Die <strong>Beschleunigungsspannung U</strong> (3–7 kV) bringt die Elektronen auf Tempo. Sie treffen auf eine hauchdünne <strong>Graphitfolie</strong> — polykristallin, also mit Kristalliten in allen Richtungen. Die regelmäßigen <strong>Netzebenen</strong> (Abstände d) wirken wie ein Strichgitter: Auf dem dahinter liegenden runden <strong>Leuchtschirm</strong> (Abstand L = ${komma(L_SCHIRM * 100, 1)} cm) erscheinen <strong>zwei konzentrische Beugungsringe</strong> um den ungebeugten Mittelfleck.</p>
      <p><strong>Die Physik dahinter:</strong> Nach de&nbsp;Broglie hat jedes Elektron eine Wellenlänge λ&nbsp;=&nbsp;h&nbsp;/&nbsp;√(2·mₑ·e·U). Die Bragg-Bedingung sin&nbsp;θ&nbsp;=&nbsp;λ/d ergibt unter kleinen Winkeln einen Ringradius <strong>r&nbsp;=&nbsp;2·L·λ&nbsp;/&nbsp;d</strong>. Weil λ&nbsp;∝&nbsp;1/√U ist, gilt auch <strong>r&nbsp;∝&nbsp;1/√U</strong> — und je <em>kleiner</em> der Netzebenenabstand d, desto <em>größer</em> der Ring.</p>
      <p><strong>Plan:</strong> Stelle mindestens ${MIN_MESSUNGEN} verschiedene Spannungen U ein und lies jedes Mal den Radius beider Ringe an der mm-Skala ab. In der Auswertung trägst du r gegen 1/√U auf und gewinnst aus der Ursprungsgeraden den Netzebenenabstand.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich die Spannung U erhöhe, werden die Beugungsringe …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… größer (weiter außen)</option>
        <option value="kleiner">… kleiner (enger um die Mitte)</option>
        <option value="gleich">… bleiben (fast) gleich</option>
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
  const wortAus = wahl => wahl === "groesser" ? "größer" : wahl === "kleiner" ? "kleiner" : "(fast) gleich";

  function beobachtungHtml() {
    const us = new Set(zustand.messungen.map(z => z.U)).size;
    let html = `<p>Deine Vorhersage: U rauf → Ringe <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus!</p>`;
    if (us >= 2) {
      const ok = zustand.vorhersage === "kleiner";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>U rauf → Ringe kleiner</strong> (schnellere Elektronen, kürzere Wellenlänge λ, also kleinerer Beugungswinkel — r ∝ 1/√U). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const lam = deBroglie(zustand.U);
    const usAnz = new Set(zustand.messungen.map(z => z.U)).size;
    let fortschritt = `${usAnz} von mindestens ${MIN_MESSUNGEN} verschiedenen Spannungen.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-u">Beschleunigungsspannung: U = <strong id="exp-u-wert">${komma(zustand.U / 1000, 2)} kV</strong></label>
        <input type="range" id="exp-u" min="${U_MIN}" max="${U_MAX}" step="${U_SCHRITT}" value="${zustand.U}" aria-label="Beschleunigungsspannung in Volt">
      </div>
      <p>de-Broglie-Wellenlänge (System, λ = h/√(2·mₑ·e·U)): <strong id="exp-lam-wert">λ = ${komma(lam * 1e12, 2)} pm</strong></p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-ring">Ring ablesen:</label>
        <select id="exp-ring" class="exp-wahl">
          <option value="innen"${zustand.ringWahl === "innen" ? " selected" : ""}>innerer Ring</option>
          <option value="aussen"${zustand.ringWahl === "aussen" ? " selected" : ""}>äußerer Ring</option>
        </select>
        <label for="exp-wert">Radius r an der mm-Skala in cm:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>U in kV</th><th>1/√U in 1/√V</th><th>r (innen) in cm</th><th>r (außen) in cm</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${komma(z.U / 1000, 2)}</td><td>${komma(1 / Math.sqrt(z.U), 5)}</td><td>${z.rInnenCm == null ? "—" : komma(z.rInnenCm, 2)}</td><td>${z.rAussenCm == null ? "—" : komma(z.rAussenCm, 2)}</td></tr>`).join("")
          || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt} Tipp: Bei jeder Spannung lohnt sich beides — innerer <em>und</em> äußerer Ring.</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const uRegler = panel.querySelector("#exp-u");
    uRegler.addEventListener("input", () => {
      zustand.U = Math.round(Number(uRegler.value) / U_SCHRITT) * U_SCHRITT; // exakt auf Raster → deterministische Streu-Schlüssel
      panel.querySelector("#exp-u-wert").textContent = komma(zustand.U / 1000, 2) + " kV";
      panel.querySelector("#exp-lam-wert").textContent = "λ = " + komma(deBroglie(zustand.U) * 1e12, 2) + " pm";
      zeichne();
    });
    panel.querySelector("#exp-ring").addEventListener("change", ev => { zustand.ringWahl = ev.target.value; });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      const ringId = zustand.ringWahl;
      const wahrR = ringRadiusReal(zustand.U, dRing(ringId));
      if (!ablesungROk(eingabe, wahrR)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wo schneidet der " + (ringId === "innen" ? "innere" : "äußere") + " Ring die waagerechte Skala? (Auf etwa 1–2 mm genau ablesen.)";
        return;
      }
      // Zeile für dieses U finden oder anlegen
      let zeile = zustand.messungen.find(z => z.U === zustand.U);
      if (!zeile) { zeile = { U: zustand.U, rInnenCm: null, rAussenCm: null }; zustand.messungen.push(zeile); }
      zeile[ringId === "innen" ? "rInnenCm" : "rAussenCm"] = eingabe;
      zustand.messungen.sort((a, b) => a.U - b.U);
      zustand.meldungMessen = "✓ Eingetragen: " + (ringId === "innen" ? "innerer" : "äußerer") + " Ring, r = " + komma(eingabe, 2) + " cm bei U = " + komma(zustand.U / 1000, 2) + " kV.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  // Datenpunkte (1/√U, r in m) für den gewählten Auswertungsring; nur Zeilen mit Ablesung
  function punkteFuer(ringId) {
    const feld = ringId === "innen" ? "rInnenCm" : "rAussenCm";
    return zustand.messungen.filter(z => z[feld] != null)
      .map(z => ({ x: 1 / Math.sqrt(z.U), y: z[feld] / 100, U: z.U, rCm: z[feld] }));
  }

  function zeichneDiagramm() {
    const dc = panel.querySelector("#exp-diagramm");
    if (!dc) return;
    const c = dc.getContext("2d");
    const W = dc.width, H = dc.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    c.clearRect(0, 0, W, H);
    const pad = 44, links = pad, rechts = W - 12, oben = 12, unten = H - 30;
    const pkt = punkteFuer(zustand.auswRing);
    const xMax = 1 / Math.sqrt(U_MIN) * 1.05, yMax = 0.05; // 1/√3000 ≈ 0,0183; r bis 5 cm
    const px = x => links + x / xMax * (rechts - links);
    const py = y => unten - y / yMax * (unten - oben);

    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(links, oben); c.lineTo(links, unten); c.lineTo(rechts, unten); c.stroke();
    c.fillStyle = cLeise; c.font = "10px system-ui, sans-serif"; c.textAlign = "center";
    c.fillText("1/√U  in  1/√V", (links + rechts) / 2, H - 6);
    c.save(); c.translate(11, (oben + unten) / 2); c.rotate(-Math.PI / 2);
    c.fillText("r  in  cm", 0, 0); c.restore();
    // y-Ticks (cm)
    c.textAlign = "end";
    for (let cm = 0; cm <= 5; cm++) {
      const y = py(cm / 100);
      c.strokeStyle = cLeise; c.lineWidth = 1; c.globalAlpha = cm === 0 ? 0 : 0.25;
      c.beginPath(); c.moveTo(links, y); c.lineTo(rechts, y); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cLeise; c.fillText(String(cm), links - 5, y + 3);
    }
    // x-Ticks
    c.textAlign = "center";
    for (const u of [7000, 5000, 4000, 3000]) {
      const x = px(1 / Math.sqrt(u));
      c.beginPath(); c.moveTo(x, unten); c.lineTo(x, unten + 4); c.stroke();
      c.fillStyle = cLeise; c.fillText(komma(1 / Math.sqrt(u), 4), x, unten + 16);
    }
    // Regressionsgerade durch den Ursprung (Ausgleichsgerade)
    if (pkt.length >= 2) {
      const { m, b } = regression(pkt);
      c.strokeStyle = cAkzent; c.lineWidth = 2;
      c.beginPath(); c.moveTo(px(0), py(b)); c.lineTo(px(xMax), py(m * xMax + b)); c.stroke();
    }
    // Messpunkte
    c.fillStyle = cAkzent;
    for (const p of pkt) { c.beginPath(); c.arc(px(p.x), py(p.y), 3.5, 0, 7); c.fill(); }
  }

  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Spannungen — bisher: ${new Set(zustand.messungen.map(z => z.U)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const ringId = zustand.auswRing;
    const pkt = punkteFuer(ringId);
    const genugPunkte = pkt.length >= 2;
    const reg = genugPunkte ? regression(pkt) : { m: NaN, b: NaN };
    const dGemessen = zustand.dOk ? zustand.dEingabe : (genugPunkte ? dAusSteigung(reg.m) * 1e12 : NaN);
    const bew = zustand.dOk ? bewertungD(zustand.dEingabe, wahrPm(ringId)) : null;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Trage <strong>r</strong> gegen <strong>1/√U</strong> auf: Weil r&nbsp;=&nbsp;2·L·λ/d und λ&nbsp;=&nbsp;K/√U, ergibt sich eine <strong>Ursprungsgerade</strong> r&nbsp;=&nbsp;m·(1/√U). Das bestätigt zugleich r&nbsp;∝&nbsp;λ&nbsp;∝&nbsp;1/√U.</p>
      <div class="exp-regler">
        <label for="exp-auswring">Diesen Ring auswerten:</label>
        <select id="exp-auswring" class="exp-wahl">
          <option value="innen"${ringId === "innen" ? " selected" : ""}>innerer Ring</option>
          <option value="aussen"${ringId === "aussen" ? " selected" : ""}>äußerer Ring</option>
        </select>
      </div>
      <canvas id="exp-diagramm" class="exp-diagramm" width="340" height="240" aria-label="Diagramm: Ringradius r in Zentimetern über 1 durch Wurzel U. Die Messpunkte des gewählten Rings liegen auf einer Ursprungsgeraden; eine Ausgleichsgerade ist eingezeichnet."></canvas>

      <h3>① Steigung der Geraden ablesen (gA)</h3>
      <p>Bestimme die Steigung m&nbsp;=&nbsp;Δr/Δ(1/√U) aus deinem Diagramm — am einfachsten als m&nbsp;=&nbsp;r·√U für einen Punkt, oder über zwei weit auseinanderliegende Punkte. Gib m in <strong>der Einheit der Achsen</strong> an: r in <strong>Meter</strong>, also m in m·√V (eine Zahl um 1,5 für den inneren, 2,7 für den äußeren Ring).</p>
      <details class="exp-fehler"><summary>Hilfe: So liest du die Steigung ab</summary>
        <p>Nimm einen Messpunkt, z.&nbsp;B. U&nbsp;=&nbsp;5000&nbsp;V → 1/√U&nbsp;≈&nbsp;0,01414. Lies das zugehörige r ab (in cm), rechne es in Meter um (cm&nbsp;÷&nbsp;100) und teile: m&nbsp;=&nbsp;r&nbsp;/&nbsp;(1/√U)&nbsp;=&nbsp;r·√U. Mehrere Punkte mitteln macht es genauer.</p>
      </details>
      <form id="exp-steigung-form" class="exp-ablesen">
        <label for="exp-steigung">Steigung m in m·√V:</label>
        <input id="exp-steigung" inputmode="decimal" autocomplete="off" size="7" value="${zustand.steigungOk ? komma(zustand.steigungEingabe, 3) : ""}">
        <button class="knopf zweitrangig">Prüfen</button>
        <strong>${zustand.steigungOk === true ? "✓" : zustand.steigungOk === false ? "✗" : ""}</strong>
      </form>
      <p id="exp-steigung-meldung" class="exp-meldung" aria-live="polite"></p>

      <h3>② Netzebenenabstand bestimmen (eA)</h3>
      <p>Aus m&nbsp;=&nbsp;2·L·K/d folgt <strong>d&nbsp;=&nbsp;2·L·K&nbsp;/&nbsp;m</strong> mit K&nbsp;=&nbsp;h/√(2·mₑ·e)&nbsp;≈&nbsp;1,2265·10⁻⁹&nbsp;m·√V und L&nbsp;=&nbsp;${komma(L_SCHIRM, 3)}&nbsp;m. Rechne d aus <em>deiner</em> Steigung und gib es in <strong>Pikometer (pm)</strong> an.</p>
      <form id="exp-d-form" class="exp-ablesen">
        <label for="exp-d">Netzebenenabstand d in pm:</label>
        <input id="exp-d" inputmode="decimal" autocomplete="off" size="7" value="${zustand.dOk ? komma(zustand.dEingabe, 0) : ""}">
        <button class="knopf zweitrangig">Prüfen</button>
        <strong>${zustand.dOk === true ? "✓" : zustand.dOk === false ? "✗" : ""}</strong>
      </form>
      <p id="exp-d-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${zustand.dOk ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: d ≈ ${komma(zustand.dEingabe, 0)} pm</strong> (${ringId === "innen" ? "innerer" : "äußerer"} Ring). Literaturwert für Graphit: ${ringId === "innen" ? "213" : "123"} pm — Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>. Damit hast du aus dem Beugungsbild einen <strong>atomaren Abstand</strong> gemessen — und nebenbei de Broglie bestätigt!</p>
      </div>` : ""}

      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Du hast gemessen: höhere Spannung → <strong>kleinere</strong> Ringe. Woran liegt das?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="schneller">Schnellere Elektronen haben eine kürzere Wellenlänge λ, also einen kleineren Beugungswinkel</option>
          <option value="mehr">Höhere Spannung schickt mehr Elektronen los, der Ring rückt zusammen</option>
          <option value="erwaermung">Die Folie erwärmt sich und zieht die Ringe nach innen</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Der äußere Ring ist <strong>größer</strong> als der innere. Was bedeutet das für die Netzebenenabstände?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="kleiner">Der äußere Ring gehört zum <em>kleineren</em> Netzebenenabstand d (r ∝ 1/d)</option>
          <option value="groesser">Der äußere Ring gehört zum <em>größeren</em> Netzebenenabstand d</option>
          <option value="egal">Der Ringradius hat mit d nichts zu tun</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man d nie exakt?</summary>
        <p><strong>Ablesung des Radius:</strong> Die Ringe sind keine haarscharfen Linien, sondern einige Millimeter breite Leuchtbänder. Lies stets die <em>Mitte</em> des Bandes ab. Da d&nbsp;∝&nbsp;1/m und m direkt aus r folgt, schlägt jeder Ablesefehler voll auf d durch — viele Spannungen messen und über die Ausgleichsgerade mitteln hilft.</p>
        <p><strong>Kleinwinkel-Näherung:</strong> Streng gilt r&nbsp;=&nbsp;L·tan(2θ), hier rechnen wir mit r&nbsp;=&nbsp;2·L·λ/d. Für die größten Ringe (kleines U) sind das gut 1–2&nbsp;% zu wenig — die Gerade ist in Wirklichkeit ganz leicht nach oben gekrümmt. Wer es genau will, nimmt nur die kleineren Ringe (großes U) für die Steigung.</p>
        <p><strong>Schirmabstand L:</strong> L geht <em>linear</em> in d ein. Ist L um 2&nbsp;% falsch, ist auch d um 2&nbsp;% falsch — die Geometrie der Röhre muss man kennen.</p>
        <p><strong>Strategie dagegen:</strong> beide Ringe getrennt auswerten (zwei unabhängige d-Werte), viele Spannungen über das ganze Diagramm verteilen und die Ausgleichsgerade durch den Ursprung legen — genau das hast du getan.</p>
      </details>`;

    zeichneDiagramm();

    panel.querySelector("#exp-auswring").addEventListener("change", ev => {
      zustand.auswRing = ev.target.value;
      zustand.steigungEingabe = null; zustand.steigungOk = null;
      zustand.dEingabe = null; zustand.dOk = null;
      zustand.meldungAuswerten = "";
      panelAuswerten();
    });
    panel.querySelector("#exp-steigung-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-steigung").value);
      if (!steigungOk(eingabe, steigungWahr())) {
        zustand.steigungOk = false;
        panel.querySelector("#exp-steigung-meldung").textContent = "✗ Das passt noch nicht (±4 %). Achte auf die Einheit: r in Meter (cm ÷ 100), dann m = r·√U. Für den inneren Ring liegt m bei etwa 1,55, für den äußeren bei etwa 2,69.";
        return;
      }
      zustand.steigungEingabe = eingabe; zustand.steigungOk = true;
      panel.querySelector("#exp-steigung-meldung").textContent = "✓ Steigung bestätigt. Jetzt daraus den Netzebenenabstand bestimmen.";
      panelAuswerten();
    });
    panel.querySelector("#exp-d-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-d").value);
      if (!dEingabeOk(eingabe, wahrPm(ringId))) {
        zustand.dOk = false;
        zustand.meldungAuswerten = "✗ Das passt noch nicht (±12 pm). Rechne d = 2·L·K / m = 2 · " + komma(L_SCHIRM, 3) + " · 1,2265·10⁻⁹ / m und gib das Ergebnis in pm an (1 pm = 10⁻¹² m).";
        panelAuswerten();
        return;
      }
      zustand.dEingabe = eingabe; zustand.dOk = true;
      zustand.meldungAuswerten = "";
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "schneller" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "kleiner" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("elektronenbeugung-messreihe.csv",
        ["U in V", "1/sqrt(U) in 1/sqrtV", "r innen in cm", "r aussen in cm"],
        zustand.messungen.map(z => [String(z.U), 1 / Math.sqrt(z.U),
          z.rInnenCm == null ? "" : z.rInnenCm, z.rAussenCm == null ? "" : z.rAussenCm]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        U: 5000, vorhersage: "", messungen: [], ringWahl: "innen", auswRing: "innen",
        steigungEingabe: null, steigungOk: null, dEingabe: null, dOk: null,
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Mehr Spannung → mehr kinetische Energie → größerer Impuls p. Wegen λ = h/p sinkt die Wellenlänge, und mit sin θ = λ/d wird der Beugungswinkel — und damit der Ring — kleiner. Genau das steckt in r ∝ 1/√U."
      : "✗ Nicht ganz: Die Anzahl der Elektronen ändert nur die Helligkeit, nicht den Radius, und Erwärmung spielt keine Rolle. Denk an de Broglie: schneller heißt kürzere Wellenlänge.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: r = 2·L·λ/d — der Radius ist umgekehrt proportional zu d. Der größere (äußere) Ring gehört also zum kleineren Netzebenenabstand. Im Graphit sind das die 123-pm-Ebenen, der innere Ring gehört zu 213 pm."
      : "✗ Schau auf r = 2·L·λ/d: d steht im Nenner. Großer Ring bedeutet also kleines d — nicht großes.";
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
