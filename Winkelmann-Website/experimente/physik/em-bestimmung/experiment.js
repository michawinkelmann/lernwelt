// experiment.js — Interaktives Experiment: e/m-Bestimmung am Fadenstrahlrohr (QP, eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: U und I selbst einstellen,
// den Durchmesser des Leuchtkreises an den Messstegen SELBST ablesen,
// Messreihe protokollieren und e/m = 2U/(r²·B²) Zeile für Zeile auswerten.
// Das Magnetfeld rechnet das System aus der Helmholtz-Geometrie vor (B = k·I),
// die kleine Ablesestreuung ist pro (U, I) deterministisch geseedet — dadurch
// bleiben pruefFaelle und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, esc, farbe, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const MU0 = 4 * Math.PI * 1e-7;     // Vs/(Am)
export const WINDUNGEN = 130;              // n je Spule
export const SPULENRADIUS = 0.150;         // m
// Helmholtz-Feld in der Mitte: B = (4/5)^(3/2) · µ₀ · n · I / R = k · I
export const K_HELMHOLTZ = Math.pow(4 / 5, 1.5) * MU0 * WINDUNGEN / SPULENRADIUS; // ≈ 7,7929·10⁻⁴ T/A
export const EM_REFERENZ = 1.7588e11;      // C/kg (CODATA, gerundet) — nur intern!
export const E_MILLIKAN = 1.602e-19;       // C — Ergebnis des Geschwister-Experiments
export const U_MIN = 100, U_MAX = 300, U_SCHRITT = 5;     // V
export const I_MIN = 1.0, I_MAX = 2.5, I_SCHRITT = 0.05;  // A
export const D_STREU_SPANNE = 0.004;       // m — Strahl-/Ablesestreuung auf den Durchmesser (±2 mm)
export const D_TOLERANZ_CM = 0.3;          // akzeptierte Ablesung: ±0,3 cm
export const EM_TOLERANZ = 0.12;           // e/m-Eingabe in 10¹¹ C/kg: ±0,12
export const M_TOLERANZ = 0.3;             // m-Eingabe in 10⁻³¹ kg: ±0,3
export const MIN_MESSUNGEN = 6;

// ---------- Physik (rein, Node-testbar) ----------
export function feldAusStrom(iAmp) {
  return K_HELMHOLTZ * iAmp; // T
}
// Aus e·U = ½·m·v² und e·v·B = m·v²/r folgt r = √(2·U·(m/e))/B
export function radiusIdeal(uVolt, iAmp) {
  const b = feldAusStrom(iAmp);
  return Math.sqrt(2 * uVolt / (EM_REFERENZ * b * b)); // m
}
// wahrer Leuchtkreis-Durchmesser inkl. reproduzierbarer Streuung (Strahlbreite, Justage)
export function durchmesserReal(uVolt, iAmp) {
  return 2 * radiusIdeal(uVolt, iAmp) + streuung("d:" + uVolt + ":" + iAmp, D_STREU_SPANNE); // m
}
// Auswertungsformel — die rechnen die Lernenden selbst, das System prüft nur
export function emAusMessung(uVolt, bTesla, rMeter) {
  return (rMeter > 0 && bTesla > 0) ? 2 * uVolt / (rMeter * rMeter * bTesla * bTesla) : NaN; // C/kg
}
export function masseAusEm(emCkg) {
  return emCkg > 0 ? E_MILLIKAN / emCkg : NaN; // kg
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungDOk(eingabeCm, wahrDMeter) {
  return ablesungOk(eingabeCm, wahrDMeter * 100, D_TOLERANZ_CM);
}
export function emEingabeOk(eingabe1e11, wahr1e11) {
  return Number.isFinite(eingabe1e11) && Math.abs(eingabe1e11 - wahr1e11) <= EM_TOLERANZ;
}
export function masseEingabeOk(eingabe1e31, wahr1e31) {
  return Number.isFinite(eingabe1e31) && Math.abs(eingabe1e31 - wahr1e31) <= M_TOLERANZ;
}
export function bewertungEm(mittel1e11) {
  const abw = Math.abs(mittel1e11 - EM_REFERENZ / 1e11) / (EM_REFERENZ / 1e11) * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 Kombinationen, U UND I variiert
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.U)).size >= 2
    && new Set(messungen.map(z => z.I)).size >= 2;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "k", soll: 7.79286e-4, tol: 2e-9 },                      // T/A
  { art: "B", I: 1.5, soll: 1.169e-3, tol: 1e-6 },                // T
  { art: "r", U: 200, I: 1.5, soll: 0.0408, tol: 2e-4 },          // m
  { art: "em", U: 250, I: 2.0, soll: 1.7588e11, tol: 1e6 }        // C/kg (Pipeline invertiert)
];

export const TESTS = [
  { name: "k-Faktor exakt: (4/5)^1,5·µ₀·130/0,15 ≈ 7,79286·10⁻⁴ T/A",
    ok: () => K_HELMHOLTZ === Math.pow(4 / 5, 1.5) * (4 * Math.PI * 1e-7) * 130 / 0.15
      && Math.abs(K_HELMHOLTZ - 7.79286e-4) < 2e-9 },
  { name: "Kontrollwert B: I = 1,5 A → B = 1,169·10⁻³ T (±10⁻⁶)",
    ok: () => Math.abs(feldAusStrom(1.5) - 1.169e-3) <= 1e-6 },
  { name: "Kontrollwert r: U = 200 V, I = 1,5 A → r = 0,0408 m (±0,0002)",
    ok: () => Math.abs(radiusIdeal(200, 1.5) - 0.0408) <= 2e-4 },
  { name: "e/m-Pipeline invertiert exakt: perfekte r/B/U → 1,7588·10¹¹ (±10⁶)",
    ok: () => [[100, 1], [200, 1.5], [300, 2.5], [150, 1.15], [250, 2.05]].every(([u, i]) =>
      Math.abs(emAusMessung(u, feldAusStrom(i), radiusIdeal(u, i)) - EM_REFERENZ) <= 1e6) },
  { name: "√U-Gesetz: U vervierfachen bei festem B → r exakt verdoppelt",
    ok: () => Math.abs(radiusIdeal(400, 1.2) - 2 * radiusIdeal(100, 1.2)) <= 1e-12
      && Math.abs(radiusIdeal(1200, 2.5) - 2 * radiusIdeal(300, 2.5)) <= 1e-12 },
  { name: "I-Antiproportionalität: r·B = √(2U·m/e) konstant bei festem U",
    ok: () => { const soll = Math.sqrt(2 * 200 / EM_REFERENZ);
      return [1, 1.3, 1.7, 2.2, 2.5].every(i =>
        Math.abs(radiusIdeal(200, i) * feldAusStrom(i) - soll) <= 1e-12); } },
  { name: "Streugrenzen ±2 mm auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let u = U_MIN; u <= U_MAX; u += U_SCHRITT) {
        for (let c = 100; c <= 250; c += 5) { const i = c / 100;
          const d = Math.abs(durchmesserReal(u, i) - 2 * radiusIdeal(u, i));
          if (d > D_STREU_SPANNE / 2 + 1e-12) return false;
          if (d > 1e-5) irgendStreu = true;
        }
      }
      return irgendStreu && durchmesserReal(200, 1.5) === durchmesserReal(200, 1.5)
        && durchmesserReal(200, 1.5) !== durchmesserReal(205, 1.5); } },
  { name: "Elektronenmasse: m = e/(e/m) = 9,1085·10⁻³¹ kg, Eingabe ±0,3",
    ok: () => { const w = masseAusEm(EM_REFERENZ) / 1e-31;
      return Math.abs(masseAusEm(EM_REFERENZ) - 9.1085e-31) <= 1e-34
        && masseEingabeOk(9.1, w) && masseEingabeOk(9.4, w)
        && !masseEingabeOk(9.41, w) && !masseEingabeOk(8.8, w) && !masseEingabeOk(NaN, w); } },
  { name: "Ablese-/Eingabe-Toleranzen: d ±0,3 cm, e/m ±0,12·10¹¹",
    ok: () => ablesungDOk(8.4, 0.0816) && !ablesungDOk(8.5, 0.0816) && !ablesungDOk(NaN, 0.0816)
      && emEingabeOk(1.70, 1.7588) && emEingabeOk(1.87, 1.7588)
      && !emEingabeOk(1.88, 1.7588) && !emEingabeOk(NaN, 1.7588) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("4,1") === 4.1 && parseDezimal("4.1") === 4.1 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 Kombinationen und variiertem U UND I",
    ok: () => { const z = (U, I) => ({ U, I });
      const nurI = [1, 1.1, 1.2, 1.3, 1.4, 1.5].map(i => z(200, i));
      const nurU = [100, 150, 200, 250, 300, 120].map(u => z(u, 1.5));
      const gut = [z(100, 1.2), z(150, 1.2), z(200, 1.6), z(250, 1.6), z(300, 2), z(200, 2)];
      return !messreiheVollstaendig(nurI) && !messreiheVollstaendig(nurU)
        && !messreiheVollstaendig(gut.slice(0, 5)) && messreiheVollstaendig(gut); } },
  { name: "Bewertung: 1,7588 → sehr gut · 1,70 → gut · 1,45 → nochmal prüfen",
    ok: () => bewertungEm(1.7588).stufe === "sehr gut" && bewertungEm(1.70).stufe === "gut"
      && bewertungEm(1.45).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "k") return Math.abs(K_HELMHOLTZ - p.soll) <= p.tol;
      if (p.art === "B") return Math.abs(feldAusStrom(p.I) - p.soll) <= p.tol;
      if (p.art === "r") return Math.abs(radiusIdeal(p.U, p.I) - p.soll) <= p.tol;
      return Math.abs(emAusMessung(p.U, feldAusStrom(p.I), radiusIdeal(p.U, p.I)) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Frontalblick auf das Rohr) ----------
  const CX = 180, CY = 200;        // Kolbenmitte
  const R_KOLBEN = 146;            // px
  const PX_PRO_CM = 17;            // Maßstab: 1 cm im Rohr ≙ 17 px
  const P_X = CX, P_Y = 328;       // Strahlaustritt (Anodenloch) = Skalen-Null
  const SKALA_CM = 15;             // Messstege bis 15 cm

  const zustand = {
    phase: "aufbau",
    U: 200, I: 1.5,
    vorhersageU: "", vorhersageI: "",      // "groesser" | "kleiner" | "gleich"
    messungen: [],                         // {U, I, B, dCm, rCm, rM, emEingabe, emOk}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    mBestaetigt: null,                     // {eingabe, wahr} nach Bonus-Erfolg
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
        <canvas id="exp-canvas" width="360" height="460" aria-label="Frontalansicht des Fadenstrahlrohrs: runder Glaskolben im Helmholtz-Spulenpaar, unten die Elektronenkanone, senkrecht darüber die Zentimeterskala der Messstege. In der Durchführung erscheint der leuchtende Elektronenkreis; sein höchster Punkt kreuzt die Skala beim Durchmesser. Unten Anzeigen für Beschleunigungsspannung und Spulenstrom."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersageU || !zustand.vorhersageI;
  const emWahr1e11 = z => emAusMessung(z.U, z.B, z.rM) / 1e11;

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    // Helmholtz-Spulenpaar (frontal: Ring um den Kolben, zweite Spule deckungsgleich dahinter)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 10; ctx.globalAlpha = 0.45;
    ctx.beginPath(); ctx.arc(CX, CY, 158, 0, 7); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(CX, CY, 153, 0, 7); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 163, 0, 7); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Helmholtz-Spulenpaar (2. Spule dahinter)", CX, 16);

    // Glaskolben mit Restgas
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(CX, CY, R_KOLBEN, 0, 7); ctx.fill(); ctx.stroke();

    // Leuchtkreis (Heizung an = ab der Durchführung)
    if (zustand.phase !== "aufbau") {
      const dWahr = durchmesserReal(zustand.U, zustand.I);     // m
      const rPx = dWahr * 100 / 2 * PX_PRO_CM;
      const mz = P_Y - rPx;                                    // Kreismittelpunkt y
      ctx.strokeStyle = cAkzent;
      ctx.globalAlpha = 0.22; ctx.lineWidth = 9;
      ctx.beginPath(); ctx.arc(P_X, mz, rPx, 0, 7); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(P_X, mz, rPx, 0, 7); ctx.stroke();
      // Richtungspfeil: am Austritt laufen die Elektronen nach rechts
      ctx.fillStyle = cAkzent;
      ctx.beginPath(); ctx.moveTo(P_X + 26, P_Y); ctx.lineTo(P_X + 14, P_Y - 5); ctx.lineTo(P_X + 14, P_Y + 5); ctx.closePath(); ctx.fill();
    }

    // Elektronenkanone (Austritt = Skalen-Nullpunkt)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(128, 316, 46, 24, 4); else ctx.rect(128, 316, 46, 24);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.fillRect(174, 324, 8, 8);

    // Messstege: senkrechte cm-Skala vom Anodenloch nach oben (liegen vor dem Strahl)
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(P_X, P_Y); ctx.lineTo(P_X, P_Y - SKALA_CM * PX_PRO_CM); ctx.stroke();
    for (let halb = 0; halb <= SKALA_CM * 2; halb++) {
      const cm = halb / 2, y = P_Y - cm * PX_PRO_CM, ganz = halb % 2 === 0;
      ctx.strokeStyle = ganz ? cText : cLeise; ctx.lineWidth = ganz ? 1.5 : 1;
      ctx.beginPath(); ctx.moveTo(P_X, y); ctx.lineTo(P_X + (ganz ? 12 : 7), y); ctx.stroke();
      if (ganz && cm % 2 === 0) { ctx.fillStyle = cText; ctx.textAlign = "start"; ctx.fillText(String(cm), P_X + 16, y + 4); }
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "end";
    ctx.fillText("Messstege · cm", P_X - 8, 92);
    ctx.textAlign = "center";
    ctx.fillText("Elektronenkanone", CX, 388);

    // Netzgeräte-Anzeigen
    const kasten = (x, etikett, wert) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 398, 160, 46, 6); else ctx.rect(x, 398, 160, 46);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(etikett, x + 80, 415);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + 80, 435);
      ctx.font = "12px system-ui, sans-serif";
    };
    kasten(14, "Beschleunigung", "U = " + zustand.U + " V");
    kasten(186, "Spulenstrom", "I = " + komma(zustand.I, 2) + " A");

    // Hinweistext im Aufbau (zuletzt, mit Hintergrund — gut lesbar)
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(CX - 96, 136, 192, 62);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Heizung aus —", CX, 154);
      ctx.fillText("der Leuchtkreis erscheint", CX, 172);
      ctx.fillText("in der Durchführung", CX, 190);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Im <strong>Fadenstrahlrohr</strong> (Glaskolben mit einem Rest Gas) erzeugt eine <strong>Elektronenkanone</strong> einen feinen Elektronenstrahl: Die Glühkathode dampft Elektronen aus, die <strong>Beschleunigungsspannung U</strong> (100–300 V) bringt sie auf Tempo, durch das Anodenloch treten sie aus. Das <strong>Helmholtz-Spulenpaar</strong> (n = 130 Windungen, Spulenradius R = 0,150 m) erzeugt ein nahezu homogenes Magnetfeld senkrecht zur Strahlebene — die Lorentzkraft zwingt die Elektronen auf eine <strong>Kreisbahn</strong>. Im Rohr sitzen <strong>Messstege</strong> mit cm-Skala: Der Kreis startet am Anodenloch (0 cm), sein höchster Punkt kreuzt die Skala genau beim Durchmesser d.</p>
      <p>Das Magnetfeld rechnet das System aus der Spulengeometrie vor: B = (4/5)<sup>3/2</sup> · µ₀ · n · I / R = <strong>k · I</strong> mit k ≈ 0,7793 mT/A.</p>
      <p><strong>Idee der Messung:</strong> Energieansatz e·U = ½·m·v² und Kraftansatz e·v·B = m·v²/r ergeben zusammen <strong>e/m = 2U / (r² · B²)</strong> — alles auf der rechten Seite kannst du messen!</p>
      <p><strong>Plan:</strong> Miss den Durchmesser für mindestens ${MIN_MESSUNGEN} Kombinationen und variiere dabei <em>sowohl</em> U <em>als auch</em> I. In der Auswertung berechnest du aus jeder Zeile e/m und mittelst.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-vu">Wenn ich U erhöhe (I fest), wird der Leuchtkreis …</label>
      <select id="exp-vu" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… größer</option>
        <option value="kleiner">… kleiner</option>
        <option value="gleich">… bleibt (fast) gleich</option>
      </select>
      <label for="exp-vi">Wenn ich I erhöhe (U fest), wird der Leuchtkreis …</label>
      <select id="exp-vi" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… größer</option>
        <option value="kleiner">… kleiner</option>
        <option value="gleich">… bleibt (fast) gleich</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-vu").value = zustand.vorhersageU;
    panel.querySelector("#exp-vi").value = zustand.vorhersageI;
    panel.querySelector("#exp-vu").addEventListener("change", ev => { zustand.vorhersageU = ev.target.value; });
    panel.querySelector("#exp-vi").addEventListener("change", ev => { zustand.vorhersageI = ev.target.value; });
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
    const us = new Set(zustand.messungen.map(z => z.U)).size;
    const is = new Set(zustand.messungen.map(z => z.I)).size;
    let html = `<p>Deine Vorhersage: U rauf → <strong>${wortAus(zustand.vorhersageU)}</strong>, I rauf → <strong>${wortAus(zustand.vorhersageI)}</strong>. Probier es am Regler aus!</p>`;
    if (us >= 2) {
      const ok = zustand.vorhersageU === "groesser";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>U rauf → Kreis größer</strong> (schnellere Elektronen, r ∝ √U). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
    }
    if (is >= 2) {
      const ok = zustand.vorhersageI === "kleiner";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>I rauf → Kreis kleiner</strong> (stärkeres B zwingt auf eine engere Bahn, r ∝ 1/B). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const b = feldAusStrom(zustand.I);
    const usAnz = new Set(zustand.messungen.map(z => z.U)).size;
    const isAnz = new Set(zustand.messungen.map(z => z.I)).size;
    let fortschritt = `${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen.`;
    if (zustand.messungen.length >= 2 && usAnz < 2) fortschritt += " Variiere auch U!";
    if (zustand.messungen.length >= 2 && isAnz < 2) fortschritt += " Variiere auch I!";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-u">Beschleunigungsspannung: U = <strong id="exp-u-wert">${zustand.U} V</strong></label>
        <input type="range" id="exp-u" min="${U_MIN}" max="${U_MAX}" step="${U_SCHRITT}" value="${zustand.U}" aria-label="Beschleunigungsspannung in Volt">
        <label for="exp-i">Spulenstrom: I = <strong id="exp-i-wert">${komma(zustand.I, 2)} A</strong></label>
        <input type="range" id="exp-i" min="${I_MIN}" max="${I_MAX}" step="${I_SCHRITT}" value="${zustand.I}" aria-label="Spulenstrom in Ampere">
      </div>
      <p>Magnetfeld (System, aus B = k·I): <strong id="exp-b-wert">B = ${komma(b * 1000, 3)} mT</strong></p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies die Messstege ab — Durchmesser d in cm:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>U in V</th><th>I in A</th><th>B in mT</th><th>r in cm</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.U}</td><td>${komma(z.I, 2)}</td><td>${komma(z.B * 1000, 3)}</td><td>${komma(z.rCm, 2)}</td></tr>`).join("")
          || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const uRegler = panel.querySelector("#exp-u"), iRegler = panel.querySelector("#exp-i");
    uRegler.addEventListener("input", () => {
      zustand.U = Math.round(Number(uRegler.value));
      panel.querySelector("#exp-u-wert").textContent = zustand.U + " V";
      panel.querySelector("#exp-b-wert").textContent = "B = " + komma(feldAusStrom(zustand.I) * 1000, 3) + " mT";
      zeichne();
    });
    iRegler.addEventListener("input", () => {
      zustand.I = Math.round(Number(iRegler.value) * 100) / 100; // exakt auf Schrittweite — deterministische Streu-Schlüssel
      panel.querySelector("#exp-i-wert").textContent = komma(zustand.I, 2) + " A";
      panel.querySelector("#exp-b-wert").textContent = "B = " + komma(feldAusStrom(zustand.I) * 1000, 3) + " mT";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.U === zustand.U && z.I === zustand.I)) {
        meldung.textContent = "Diese Kombination hast du schon gemessen — stelle eine andere ein (U und I variieren!).";
        return;
      }
      const wahrD = durchmesserReal(zustand.U, zustand.I);
      if (!ablesungDOk(eingabe, wahrD)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wo kreuzt der Kreis ganz oben die Skala? (Auf etwa 2–3 mm genau ablesen.)";
        return;
      }
      zustand.messungen.push({
        U: zustand.U, I: zustand.I, B: feldAusStrom(zustand.I),
        dCm: eingabe, rCm: eingabe / 2, rM: eingabe / 200,
        emEingabe: null, emOk: null
      });
      zustand.meldungMessen = "✓ Eingetragen — das System halbiert für dich: r = d/2 = " + komma(eingabe / 2, 2) + " cm.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} Kombinationen mit variiertem U <em>und</em> I — bisher: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.messungen.every(z => z.emOk === true);
    const mw = fertig ? mittel(zustand.messungen.map(z => z.emEingabe)) : NaN;
    const bew = fertig ? bewertungEm(mw) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — Messen wie im Praktikum!"
      : bew.stufe === "gut" ? " Ordentlich! Mit großen Kreisen (kleines I) und sorgfältigem Ablesen kommst du noch näher heran."
      : " Kein Drama: Miss ein paar weitere Kombinationen — große Kreise lassen sich genauer ablesen.") : "";
    const mWahr = fertig ? masseAusEm(mw * 1e11) / 1e-31 : NaN;
    const mB = zustand.mBestaetigt;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Für jede Zeile gilt: <strong>e/m = 2U / (r² · B²)</strong>. Rechne selbst (Taschenrechner!) und trage dein Ergebnis in <strong>10¹¹ C/kg</strong> ein — z. B. 1,76.</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für eine Zeile</summary>
        <p>1) r in <strong>Meter</strong> umrechnen: 4,10 cm = 0,041 m. 2) B in <strong>Tesla</strong>: 1,169 mT = 1,169·10⁻³ T. 3) e/m = 2U/(r² · B²) ausrechnen — eine riesige Zahl um 1,7·10¹¹. 4) Durch 10¹¹ teilen und mit zwei Nachkommastellen eintragen.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>U in V</th><th>B in mT</th><th>r in cm</th><th>e/m in 10¹¹ C/kg</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${z.U}</td><td>${komma(z.B * 1000, 3)}</td><td>${komma(z.rCm, 2)}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.emEingabe == null ? "" : komma(z.emEingabe, 2)}" aria-label="Dein e/m für Zeile ${i + 1} in 10 hoch 11 Coulomb pro Kilogramm"></td>
          <td>${z.emOk === true ? "✓" : z.emOk === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Zeilen prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: e/m ≈ ${komma(mw, 2)} · 10¹¹ C/kg</strong> (Mittelwert deiner ${zustand.messungen.length} Zeilen). Literaturwert: 1,7588 · 10¹¹ C/kg — Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung}</p>
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Elektronen sind unsichtbar — warum siehst du trotzdem einen <strong>leuchtenden</strong> Kreis?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="selbst">Schnelle Elektronen leuchten von selbst</option>
          <option value="restgas">Elektronen regen das Restgas an, das Licht aussendet</option>
          <option value="feld">Das Magnetfeld bringt das Gas zum Leuchten</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">In der Formel steckt r ∝ √U. Du <strong>vervierfachst</strong> U bei festem B — was macht r?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">r bleibt gleich</option>
          <option value="wurzel2">r wächst um den Faktor √2</option>
          <option value="doppelt">r verdoppelt sich</option>
          <option value="vierfach">r vervierfacht sich</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite">${esc(f2Feedback())}</p>
      ${fertig ? `
      <h3>Bonus: Das Elektron wiegen</h3>
      <p>Im Geschwister-Experiment, dem <a href="../millikan/index.html">Millikan-Versuch</a>, misst man die Elementarladung: e = 1,602 · 10⁻¹⁹ C. Zusammen mit <em>deinem</em> e/m ergibt das die Elektronenmasse: <strong>m = e / (e/m)</strong>. Gib m in 10⁻³¹ kg an.</p>
      <form id="exp-m-form" class="exp-ablesen">
        <label for="exp-m">m in 10⁻³¹ kg:</label>
        <input id="exp-m" inputmode="decimal" autocomplete="off" size="7" value="${mB ? komma(mB.eingabe, 2) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-m-meldung" class="exp-meldung" aria-live="polite"></p>
      ${mB ? `
      <div class="exp-hinweis">
        <p><strong>m ≈ ${komma(mB.eingabe, 2)} · 10⁻³¹ kg</strong> (Literaturwert: 9,109 · 10⁻³¹ kg). Millikan lieferte e, dein Fadenstrahlrohr e/m — <strong>zwei Schulversuche zusammen wiegen ein Elektron!</strong></p>
      </div>` : ""}` : ""}
      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man nie exakt 1,7588?</summary>
        <p><strong>Parallaxe an den Messstegen:</strong> Blickst du schräg auf Kreis und Skala, verschiebt sich die Ablesung um einige Millimeter. Deshalb: senkrecht draufschauen, Auge auf Höhe des Kreisscheitels. Und weil r <em>quadratisch</em> in e/m eingeht, verdoppelt sich jeder Ablesefehler im Ergebnis.</p>
        <p><strong>B-Inhomogenität am Rand:</strong> Die Helmholtz-Anordnung macht das Feld nur im mittleren Bereich schön homogen. Große Kreise laufen durch Randzonen mit etwas schwächerem B — r fällt dort systematisch zu groß aus.</p>
        <p><strong>Austrittsgeschwindigkeit am Anodenloch:</strong> v = √(2·(e/m)·U) setzt voraus, dass die Elektronen aus der Ruhe genau die Spannung U durchlaufen. Tatsächlich starten sie mit thermischer Geschwindigkeit aus der Glühkathode, und am Anodenloch wirken Streufelder — bei kleinen U wiegt das relativ schwerer.</p>
        <p><strong>Strategie dagegen:</strong> viele Kombinationen messen, große Kreise bevorzugen (relativ genauere Ablesung) und mitteln — genau das hast du getan.</p>
      </details>`;

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.emEingabe = null; z.emOk = null; return; }
        z.emEingabe = wert;
        z.emOk = emEingabeOk(wert, emWahr1e11(z));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (Dezimalzahl, z. B. 1,76).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.emOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle Zeilen bestätigt — unten wartet dein Mittelwert."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±0,12 Toleranz). Häufigste Stolperfalle: r in Meter (cm ÷ 100) und B in Tesla (mT ÷ 1000) umrechnen!";
      if (falsch > 0) zustand.mBestaetigt = null;
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "restgas" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "doppelt" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-m-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-m").value);
      if (!masseEingabeOk(eingabe, mWahr)) {
        panel.querySelector("#exp-m-meldung").textContent = "✗ Das passt noch nicht (±0,3). Rechne m = e/(e/m) = 1,602·10⁻¹⁹ ÷ (dein Mittelwert · 10¹¹) und gib das Ergebnis in 10⁻³¹ kg an.";
        return;
      }
      zustand.mBestaetigt = { eingabe, wahr: mWahr };
      panelAuswerten();
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("em-bestimmung-messreihe.csv",
        ["U in V", "I in A", "B in mT", "r in cm", "e/m in 10^11 C/kg"],
        zustand.messungen.map(z => [String(z.U), z.I, z.B * 1000, z.rCm,
          z.emEingabe == null ? "" : z.emEingabe]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        U: 200, I: 1.5, vorhersageU: "", vorhersageI: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        mBestaetigt: null, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Im Rohr ist absichtlich ein Rest Gas (Druck ≈ 1 Pa). Stößt ein Elektron ein Gasatom an, wird es angeregt und sendet beim Zurückfallen Licht aus — die Strahlspur wird sichtbar. Im perfekten Vakuum sähe man nichts."
      : "✗ Nicht ganz: Elektronen leuchten nicht von selbst, und ein Magnetfeld regt kein Gas an. Überlege, was außer den Elektronen noch im Rohr ist — das Vakuum ist absichtlich nicht perfekt.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: √4 = 2, also verdoppelt sich r. Kontrolle in deiner Tabelle: gleiches I, U von 100 V auf 200 V → r wächst um √2 ≈ 1,41; auf 400 V wären es genau 2."
      : "✗ Schau auf r = √(2U·m/e)/B: U steht unter der Wurzel, vervierfachen heißt Faktor √4 = 2. Prüfe es an deiner Tabelle (gleiches I, verschiedene U).";
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
