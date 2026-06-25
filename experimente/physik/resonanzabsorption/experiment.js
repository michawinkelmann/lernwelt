// experiment.js — Interaktives Experiment: Resonanzabsorption am Natriumdampf (QP, gA/eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Die Wellenlänge des Lichts
// selbst am Regler einstellen, die durchgelassene Intensität I am Detektor
// SELBST ablesen, eine Messreihe um die Resonanz protokollieren und daraus die
// Resonanzwellenlänge λ₀ (Absorptionsminimum) und die Anregungsenergie
// ΔE = h·c/λ₀ bestimmen. Die durchgelassene Intensität folgt einem Lorentz-Profil
// mit scharfem Einbruch bei λ₀; die kleine Ablesestreuung ist pro Wellenlänge
// deterministisch geseedet — dadurch bleiben pruefFaelle und TESTS in Node
// analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, esc, farbe, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Naturkonstanten ----------
export const H_PLANCK = 6.626e-34;     // J·s
export const C_LICHT = 2.998e8;        // m/s
export const E_LADUNG = 1.602e-19;     // C — Umrechnung J → eV

// ---------- Konstanten des Aufbaus ----------
export const LAMBDA0 = 589;            // nm — Resonanzwellenlänge der Natrium-D-Linie (intern!)
export const LINIEN_BREITE = 6;        // nm — Halbwertsbreite des Lorentz-Profils (verbreitert: Doppler/Stoß)
export const I_MAX = 100;              // % — Transmission fern der Resonanz
export const ABSORPTION_TIEFE = 72;    // % — maximale Absorption genau bei λ₀ (Minimum bei I_MAX − Tiefe = 28 %)
export const DE_REFERENZ = H_PLANCK * C_LICHT / (LAMBDA0 * 1e-9) / E_LADUNG; // eV ≈ 2,105 (nur intern!)

export const L_MIN = 560, L_MAX = 620, L_SCHRITT = 2;    // nm
export const I_STREU_SPANNE = 1.4;     // % — Detektor-/Ablesestreuung auf die Intensität (±0,7 %)
export const I_TOLERANZ = 1.2;         // akzeptierte Ablesung der Intensität: ±1,2 %
export const L0_TOLERANZ = 3;          // λ₀-Eingabe in nm: ±3 nm (eine Rasterstufe)
export const DE_TOLERANZ = 0.06;       // ΔE-Eingabe in eV: ±0,06
export const MIN_MESSUNGEN = 6;
export const MIN_RASTER = 12;          // nm — Messreihe muss mind. diesen λ-Bereich abdecken

// ---------- Physik (rein, Node-testbar) ----------
// Lorentz-Profil: durchgelassene Intensität bricht symmetrisch bei λ₀ ein.
// I(λ) = I_max − Tiefe · b² / ((λ − λ₀)² + b²)
export function transmission(lambda, lambda0 = LAMBDA0, breite = LINIEN_BREITE) {
  return I_MAX - ABSORPTION_TIEFE * breite * breite / ((lambda - lambda0) * (lambda - lambda0) + breite * breite); // %
}
// reale Anzeige inkl. reproduzierbarer Streuung (Detektorrauschen, Ablesung)
export function transmissionReal(lambda) {
  return transmission(lambda) + streuung("I:" + lambda, I_STREU_SPANNE); // %
}
// Auswertungsformel — die rechnen die Lernenden selbst, das System prüft nur
export function energieAusLambda(lambda0Nm) {
  return lambda0Nm > 0 ? H_PLANCK * C_LICHT / (lambda0Nm * 1e-9) / E_LADUNG : NaN; // eV
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungIOk(eingabeProzent, wahrProzent) {
  return ablesungOk(eingabeProzent, wahrProzent, I_TOLERANZ);
}
export function lambda0EingabeOk(eingabeNm, wahrNm = LAMBDA0) {
  return Number.isFinite(eingabeNm) && Math.abs(eingabeNm - wahrNm) <= L0_TOLERANZ;
}
export function energieEingabeOk(eingabeEv, wahrEv) {
  return Number.isFinite(eingabeEv) && Math.abs(eingabeEv - wahrEv) <= DE_TOLERANZ;
}
export function bewertungLambda(eingabeNm) {
  const abw = Math.abs(eingabeNm - LAMBDA0);
  if (abw <= 1) return { stufe: "sehr gut", abw };
  if (abw <= 3) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: ≥ 6 verschiedene λ, die einen Bereich von ≥ 12 nm abdecken
export function messreiheVollstaendig(messungen) {
  if (messungen.length < MIN_MESSUNGEN) return false;
  const ls = messungen.map(z => z.lambda);
  if (new Set(ls).size < MIN_MESSUNGEN) return false;
  return Math.max(...ls) - Math.min(...ls) >= MIN_RASTER;
}
// Index der Messung mit der kleinsten abgelesenen Intensität (= Lage des Minimums)
export function minimumIndex(messungen) {
  let best = -1, kleinste = Infinity;
  messungen.forEach((z, i) => { if (z.iAb < kleinste) { kleinste = z.iAb; best = i; } });
  return best;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "min", soll: I_MAX - ABSORPTION_TIEFE, tol: 1e-9 },        // % — Minimum genau bei λ₀ = 28 %
  { art: "fern", lambda: 560, soll: 97.04, tol: 0.02 },            // % — fern der Resonanz fast durchlässig
  { art: "dE", lambda0: 589, soll: 2.1053, tol: 1e-3 },            // eV — Anregungsenergie der D-Linie
  { art: "sym", versatz: 7, tol: 1e-12 }                            // Symmetrie: I(λ₀−Δ) = I(λ₀+Δ)
];

export const TESTS = [
  { name: "Absorptionsminimum genau bei λ₀: I(589 nm) = 28 % (= I_max − Tiefe)",
    ok: () => Math.abs(transmission(LAMBDA0) - (I_MAX - ABSORPTION_TIEFE)) < 1e-9
      && Math.abs(transmission(LAMBDA0) - 28) < 1e-9 },
  { name: "Minimum ist global: I(λ₀) ist kleiner als an jeder anderen Rasterstelle",
    ok: () => { const im = transmission(LAMBDA0);
      for (let l = L_MIN; l <= L_MAX; l += L_SCHRITT) {
        if (l !== LAMBDA0 && transmission(l) <= im + 1e-9) return false;
      }
      return true; } },
  { name: "Symmetrie der Absorptionskurve: I(λ₀ − Δ) = I(λ₀ + Δ)",
    ok: () => [1, 3, 5, 7, 12, 20].every(d =>
      Math.abs(transmission(LAMBDA0 - d) - transmission(LAMBDA0 + d)) < 1e-12) },
  { name: "Monotonie zur Resonanz hin: I fällt streng, je näher λ an λ₀ heranrückt",
    ok: () => [560, 570, 580, 585, 587, 588].every((l, i, arr) =>
      i === 0 || transmission(l) < transmission(arr[i - 1])) },
  { name: "Fern der Resonanz fast voll durchlässig: I(560) ≈ 97,0 % und < 98 %",
    ok: () => Math.abs(transmission(560) - 97.04) < 0.02 && transmission(560) < 98 && transmission(560) > 96 },
  { name: "Kontrollwert ΔE: λ₀ = 589 nm → ΔE = h·c/λ₀ ≈ 2,105 eV (±0,001)",
    ok: () => Math.abs(energieAusLambda(589) - 2.1053) < 1e-3 && Math.abs(energieAusLambda(589) - DE_REFERENZ) < 1e-12 },
  { name: "ΔE ∝ 1/λ₀: kleinere Wellenlänge → größere Anregungsenergie",
    ok: () => energieAusLambda(560) > energieAusLambda(589) && energieAusLambda(589) > energieAusLambda(620)
      && Math.abs(energieAusLambda(560) - 2.2143) < 1e-3 },
  { name: "Streugrenzen ±0,7 % auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let l = L_MIN; l <= L_MAX; l += L_SCHRITT) {
        const d = Math.abs(transmissionReal(l) - transmission(l));
        if (d > I_STREU_SPANNE / 2 + 1e-12) return false;
        if (d > 1e-6) irgendStreu = true;
      }
      return irgendStreu && transmissionReal(585) === transmissionReal(585)
        && transmissionReal(585) !== transmissionReal(587); } },
  { name: "minimumIndex findet die Zeile mit kleinster Ablesung (= λ₀-Stelle)",
    ok: () => { const m = [585, 587, 589, 591, 593].map(l => ({ lambda: l, iAb: transmission(l) }));
      return minimumIndex(m) === 2 && minimumIndex([]) === -1; } },
  { name: "λ₀-Toleranz ±3 nm, ΔE-Toleranz ±0,06 eV",
    ok: () => lambda0EingabeOk(589) && lambda0EingabeOk(587) && lambda0EingabeOk(592)
      && !lambda0EingabeOk(593) && !lambda0EingabeOk(585) && !lambda0EingabeOk(NaN)
      && energieEingabeOk(2.11, DE_REFERENZ) && energieEingabeOk(2.16, DE_REFERENZ)
      && !energieEingabeOk(2.17, DE_REFERENZ) && !energieEingabeOk(NaN, DE_REFERENZ) },
  { name: "Intensitäts-Ablesung ±1,2 %: knapp drin akzeptiert, zu weit weg abgelehnt",
    ok: () => ablesungIOk(28.0, 28.0) && ablesungIOk(29.1, 28.0) && !ablesungIOk(29.3, 28.0)
      && !ablesungIOk(NaN, 28.0) },
  { name: "Bewertung λ₀: 589 → sehr gut · 591 → gut · 595 → nochmal prüfen",
    ok: () => bewertungLambda(589).stufe === "sehr gut" && bewertungLambda(591).stufe === "gut"
      && bewertungLambda(595).stufe === "nochmal prüfen" },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen λ über ≥ 12 nm Bereich",
    ok: () => { const z = l => ({ lambda: l, iAb: transmission(l) });
      const zuEng = [583, 584, 585, 586, 587, 588].map(z);      // nur 5 nm Bereich
      const zuWenig = [575, 580, 585, 590, 595].map(z);          // nur 5 Punkte
      const gut = [575, 581, 585, 587, 589, 591, 595].map(z);    // 20 nm, 7 Punkte
      return !messreiheVollstaendig(zuEng) && !messreiheVollstaendig(zuWenig)
        && !messreiheVollstaendig(gut.slice(0, 4)) && messreiheVollstaendig(gut); } },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("2,11") === 2.11 && parseDezimal("2.11") === 2.11 && Number.isNaN(parseDezimal("abc")) },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "min") return Math.abs(transmission(LAMBDA0) - p.soll) <= p.tol;
      if (p.art === "fern") return Math.abs(transmission(p.lambda) - p.soll) <= p.tol;
      if (p.art === "dE") return Math.abs(energieAusLambda(p.lambda0) - p.soll) <= p.tol;
      return Math.abs(transmission(LAMBDA0 - p.versatz) - transmission(LAMBDA0 + p.versatz)) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Strahlengang von links nach rechts) ----------
  const STRAHL_Y = 150;            // y der optischen Achse
  const QUELLE_X = 40;             // Lichtquelle
  const ZELLE_X = 150, ZELLE_B = 130, ZELLE_H = 70;   // Dampfzelle (Rechteck)
  const DET_X = 320, DET_B = 26, DET_H = 60;          // Detektor rechts

  const zustand = {
    phase: "aufbau",
    lambda: 575,
    vorhersage: "",                        // "monoton" | "minimum" | "maximum"
    messungen: [],                         // {lambda, iWahr, iAb}
    lambda0Eingabe: null, lambda0Ok: null,
    dEEingabe: null, dEOk: null,
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
        <canvas id="exp-canvas" width="380" height="240" aria-label="Strahlengang von links nach rechts: durchstimmbare Lichtquelle, dann die geheizte Glaszelle mit Natriumdampf, dahinter ein Detektor, der die durchgelassene Intensität in Prozent anzeigt. Ein Farbbalken zeigt die eingestellte Wellenlänge. Bei der Resonanzwellenlänge bricht die angezeigte Intensität stark ein."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  const dEWahr = z => energieAusLambda(z.lambda);

  // sichtbare Spektralfarbe zu einer Wellenlänge (nur Darstellung, grobe Näherung im Gelb/Orange-Bereich)
  function spektralFarbe(nm) {
    // 560 nm ≈ gelbgrün, 589 nm ≈ natriumgelb, 620 nm ≈ orangerot
    let r, g, b;
    if (nm < 580) { r = 173 + (255 - 173) * (nm - 560) / 20; g = 255; b = 0; }
    else if (nm < 600) { r = 255; g = 255 - (255 - 200) * (nm - 580) / 20; b = 0; }
    else { r = 255; g = 200 - (200 - 90) * (nm - 600) / 20; b = 0; }
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.lineWidth = 2;

    const aktiv = zustand.phase !== "aufbau";
    const cStrahl = spektralFarbe(zustand.lambda);
    const iWahr = aktiv ? transmissionReal(zustand.lambda) : 0;
    const anteil = Math.max(0, Math.min(1, iWahr / 100));

    // Lichtquelle (durchstimmbar)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(QUELLE_X - 22, STRAHL_Y - 20, 44, 40, 5); else ctx.rect(QUELLE_X - 22, STRAHL_Y - 20, 44, 40);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Lichtquelle", QUELLE_X, STRAHL_Y + 36);
    ctx.fillText("(durchstimmbar)", QUELLE_X, STRAHL_Y + 50);

    // Einfallender Strahl (volle Helligkeit) Quelle → Zelle
    if (aktiv) {
      ctx.strokeStyle = cStrahl; ctx.globalAlpha = 0.85; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(QUELLE_X + 22, STRAHL_Y); ctx.lineTo(ZELLE_X, STRAHL_Y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
    } else {
      ctx.strokeStyle = cLeise; ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(QUELLE_X + 22, STRAHL_Y); ctx.lineTo(DET_X, STRAHL_Y); ctx.stroke();
      ctx.setLineDash([]);
    }

    // Dampfzelle (geheizte Glaszelle mit Natriumdampf)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(ZELLE_X, STRAHL_Y - ZELLE_H / 2, ZELLE_B, ZELLE_H, 8); else ctx.rect(ZELLE_X, STRAHL_Y - ZELLE_H / 2, ZELLE_B, ZELLE_H);
    ctx.fill(); ctx.stroke();
    if (aktiv) {
      // Dampf leicht angedeutet — bei starker Absorption „arbeitet“ die Zelle sichtbarer
      ctx.fillStyle = cStrahl; ctx.globalAlpha = 0.10 + 0.22 * (1 - anteil);
      ctx.fillRect(ZELLE_X + 4, STRAHL_Y - ZELLE_H / 2 + 4, ZELLE_B - 8, ZELLE_H - 8);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Dampfzelle (Na)", ZELLE_X + ZELLE_B / 2, STRAHL_Y - ZELLE_H / 2 - 8);

    // Durchgelassener Strahl (gedimmt nach Transmission) Zelle → Detektor
    if (aktiv) {
      ctx.strokeStyle = cStrahl; ctx.globalAlpha = 0.85 * anteil + 0.05; ctx.lineWidth = 7;
      ctx.beginPath(); ctx.moveTo(ZELLE_X + ZELLE_B, STRAHL_Y); ctx.lineTo(DET_X, STRAHL_Y); ctx.stroke();
      ctx.globalAlpha = 1; ctx.lineWidth = 2;
    }

    // Detektor mit Anzeige
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(DET_X, STRAHL_Y - DET_H / 2, DET_B, DET_H, 4); else ctx.rect(DET_X, STRAHL_Y - DET_H / 2, DET_B, DET_H);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.fillText("Detektor", DET_X + DET_B / 2, STRAHL_Y + DET_H / 2 + 16);

    // Anzeige-Kasten unten: eingestellte Wellenlänge (mit Farbtupfer) + abgelesene Intensität
    const ky = 206;
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(14, ky, 170, 30, 6); else ctx.rect(14, ky, 170, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = spektralFarbe(zustand.lambda);
    ctx.beginPath(); ctx.arc(30, ky + 15, 7, 0, 7); ctx.fill();
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("λ = " + zustand.lambda + " nm", 46, ky + 19);

    ctx.strokeStyle = cText; ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(196, ky, 170, 30, 6); else ctx.rect(196, ky, 170, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "start";
    ctx.fillText(aktiv ? "Detektor: I = " + komma(iWahr, 1) + " %" : "Detektor: —", 206, ky + 19);
    ctx.font = "12px system-ui, sans-serif";

    // Aufbau-Hinweis
    if (!aktiv) {
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Quelle aus — in der Durchführung", w / 2, 30);
      ctx.fillText("stimmst du die Wellenlänge durch", w / 2, 46);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Licht aus einer <strong>durchstimmbaren Lichtquelle</strong> durchstrahlt eine geheizte <strong>Glaszelle mit Natriumdampf</strong>. Dahinter misst ein <strong>Detektor</strong> die <strong>durchgelassene Intensität I</strong> (in %, bezogen auf das einfallende Licht). Mit dem Regler stellst du die <strong>Wellenlänge λ</strong> des Lichts ein (${L_MIN}–${L_MAX} nm) und liest am Detektor ab, wie viel Licht durch die Zelle kommt.</p>
      <p><strong>Quantenphysikalische Idee:</strong> Die Natriumatome haben <em>diskrete</em> Energieniveaus. Ein Photon der Energie E = h·f = h·c/λ wird nur dann stark absorbiert, wenn seine Energie <em>genau</em> zu einer Anregungsenergie ΔE eines Atomübergangs passt — das ist <strong>Resonanz</strong>. Passt die Energie nicht, läuft das Licht fast ungestört durch.</p>
      <p><strong>Plan:</strong> Miss I für mindestens ${MIN_MESSUNGEN} verschiedene Wellenlängen rund um den Bereich, in dem du den Einbruch vermutest (Bereich ≥ ${MIN_RASTER} nm abdecken, am Minimum ruhig in 2-nm-Schritten). In der Auswertung trägst du I gegen λ auf, liest die Resonanzwellenlänge λ₀ am tiefsten Punkt ab und berechnest daraus ΔE = h·c/λ₀.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wie verhält sich die <strong>durchgelassene</strong> Intensität, wenn du λ von ${L_MIN} nm bis ${L_MAX} nm durchstimmst?</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="monoton">Sie ändert sich gleichmäßig (immer heller oder immer dunkler)</option>
        <option value="minimum">Bei einer bestimmten Wellenlänge bricht sie scharf ein (Minimum)</option>
        <option value="maximum">Bei einer bestimmten Wellenlänge steigt sie scharf an (Maximum)</option>
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
  const wortVorhersage = w => w === "monoton" ? "gleichmäßige Änderung"
    : w === "minimum" ? "scharfer Einbruch (Minimum)" : "scharfer Anstieg (Maximum)";

  function beobachtungHtml() {
    let html = `<p>Deine Vorhersage: <strong>${wortVorhersage(zustand.vorhersage)}</strong>. Stimm die Wellenlänge durch und beobachte den Detektor!</p>`;
    // Beobachtung freischalten, sobald nah an der Resonanz gemessen wurde
    const nahDran = zustand.messungen.some(z => Math.abs(z.lambda - LAMBDA0) <= LINIEN_BREITE);
    const fern = zustand.messungen.some(z => Math.abs(z.lambda - LAMBDA0) >= 4 * LINIEN_BREITE);
    if (nahDran && fern) {
      const ok = zustand.vorhersage === "minimum";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: Die durchgelassene Intensität <strong>bricht bei einer bestimmten Wellenlänge scharf ein</strong> — dort verschluckt der Dampf das Licht (Resonanz). Daneben kommt fast alles durch. ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt siehst du es aus eigener Messung."}</p>`;
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
    const ls = zustand.messungen.map(z => z.lambda);
    const bereich = ls.length ? Math.max(...ls) - Math.min(...ls) : 0;
    let fortschritt = `${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen.`;
    if (zustand.messungen.length >= 2 && bereich < MIN_RASTER) fortschritt += ` Decke einen größeren λ-Bereich ab (mindestens ${MIN_RASTER} nm)!`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-l">Wellenlänge des Lichts: λ = <strong id="exp-l-wert">${zustand.lambda} nm</strong></label>
        <input type="range" id="exp-l" min="${L_MIN}" max="${L_MAX}" step="${L_SCHRITT}" value="${zustand.lambda}" aria-label="Wellenlänge in Nanometer">
      </div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies den Detektor ab — durchgelassene Intensität I in %:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>λ in nm</th><th>I in %</th></tr></thead>
        <tbody>${zustand.messungen.slice().sort((a, b) => a.lambda - b.lambda).map(z =>
          `<tr><td>${z.lambda}</td><td>${komma(z.iAb, 1)}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const lRegler = panel.querySelector("#exp-l");
    lRegler.addEventListener("input", () => {
      zustand.lambda = Math.round(Number(lRegler.value)); // exakt auf Schrittweite — deterministische Streu-Schlüssel
      panel.querySelector("#exp-l-wert").textContent = zustand.lambda + " nm";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.lambda === zustand.lambda)) {
        meldung.textContent = "Diese Wellenlänge hast du schon gemessen — stelle eine andere ein.";
        return;
      }
      const iWahr = transmissionReal(zustand.lambda);
      if (!ablesungIOk(eingabe, iWahr)) {
        meldung.textContent = "✗ Schau noch einmal genau auf die Detektoranzeige (auf etwa 1 % genau ablesen).";
        return;
      }
      zustand.messungen.push({ lambda: zustand.lambda, iWahr, iAb: eingabe });
      zustand.meldungMessen = "✓ Eingetragen: λ = " + zustand.lambda + " nm, I = " + komma(eingabe, 1) + " %.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Diagramm I gegen λ (Auswertung) ----------
  function zeichneDiagramm(cv, hebeMin) {
    const c = cv.getContext("2d");
    const w = cv.width, hh = cv.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    c.clearRect(0, 0, w, hh);
    c.fillStyle = cFlaeche; c.fillRect(0, 0, w, hh);
    const li = 46, re = 12, ob = 12, un = 34;
    const px0 = li, px1 = w - re, py0 = hh - un, py1 = ob;
    const lMin = L_MIN, lMax = L_MAX, iMin = 0, iMax = 100;
    const xPx = l => px0 + (l - lMin) / (lMax - lMin) * (px1 - px0);
    const yPx = i => py0 + (i - iMin) / (iMax - iMin) * (py1 - py0);

    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5; c.font = "11px system-ui, sans-serif";
    c.beginPath(); c.moveTo(px0, py1); c.lineTo(px0, py0); c.lineTo(px1, py0); c.stroke();
    c.fillStyle = cLeise; c.textAlign = "center";
    for (let l = 560; l <= 620; l += 20) {
      const x = xPx(l);
      c.beginPath(); c.moveTo(x, py0); c.lineTo(x, py0 + 4); c.stroke();
      c.fillText(String(l), x, py0 + 16);
    }
    c.fillText("λ in nm", (px0 + px1) / 2, hh - 2);
    c.textAlign = "end";
    for (let i = 0; i <= 100; i += 25) {
      const y = yPx(i);
      c.beginPath(); c.moveTo(px0 - 4, y); c.lineTo(px0, y); c.stroke();
      c.fillText(String(i), px0 - 7, y + 4);
    }
    c.save(); c.translate(12, (py0 + py1) / 2); c.rotate(-Math.PI / 2);
    c.textAlign = "center"; c.fillText("I in %", 0, 0); c.restore();

    // Messpunkte
    const sortiert = zustand.messungen.slice().sort((a, b) => a.lambda - b.lambda);
    const mi = minimumIndex(sortiert);
    c.strokeStyle = cAkzent; c.lineWidth = 1.5;
    c.beginPath();
    sortiert.forEach((z, k) => {
      const x = xPx(z.lambda), y = yPx(z.iAb);
      if (k === 0) c.moveTo(x, y); else c.lineTo(x, y);
    });
    c.stroke();
    sortiert.forEach((z, k) => {
      const x = xPx(z.lambda), y = yPx(z.iAb);
      c.fillStyle = (hebeMin && k === mi) ? cText : cAkzent;
      c.beginPath(); c.arc(x, y, (hebeMin && k === mi) ? 5 : 3.5, 0, 7); c.fill();
    });
    // Minimum markieren
    if (hebeMin && mi >= 0) {
      const z = sortiert[mi];
      c.strokeStyle = cText; c.setLineDash([3, 3]); c.lineWidth = 1;
      c.beginPath(); c.moveTo(xPx(z.lambda), py0); c.lineTo(xPx(z.lambda), yPx(z.iAb)); c.stroke();
      c.setLineDash([]);
      c.fillStyle = cText; c.textAlign = "center";
      c.fillText("λ₀ ≈ " + z.lambda + " nm", xPx(z.lambda), yPx(z.iAb) - 8);
    }
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Wellenlängen über einen Bereich von ≥ ${MIN_RASTER} nm — bisher: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const sortiert = zustand.messungen.slice().sort((a, b) => a.lambda - b.lambda);
    const mi = minimumIndex(sortiert);
    const lambdaMinAb = mi >= 0 ? sortiert[mi].lambda : NaN;
    const l0Fertig = zustand.lambda0Ok === true;
    const dEFertig = zustand.dEOk === true;
    const bew = l0Fertig ? bewertungLambda(zustand.lambda0Eingabe) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — genau auf der D-Linie!"
      : bew.stufe === "gut" ? " Ordentlich! Mit dichteren Messpunkten direkt am Einbruch triffst du noch genauer."
      : " Kein Drama: Miss ein paar Wellenlängen dichter am tiefsten Punkt — dann wird λ₀ schärfer.") : "";

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Trag deine Messwerte als <strong>I-λ-Diagramm</strong> auf — die <strong>Absorptionskurve</strong>. Sie hat einen scharfen Einbruch: die <strong>Absorptionslinie</strong>. Ihr tiefster Punkt liegt bei der <strong>Resonanzwellenlänge λ₀</strong>.</p>
      <canvas id="exp-diagramm" width="380" height="220" aria-label="Diagramm der durchgelassenen Intensität I in Prozent gegen die Wellenlänge λ in Nanometer. Die Messpunkte bilden eine Kurve mit einem deutlichen Minimum — der Absorptionslinie."></canvas>
      <h3>1 · Resonanzwellenlänge ablesen</h3>
      <p>An welcher Wellenlänge liegt der <strong>tiefste Punkt</strong> deiner Kurve? Lies λ₀ am Diagramm ab und trag sie in nm ein.</p>
      <form id="exp-l0-form" class="exp-ablesen">
        <label for="exp-l0">λ₀ in nm:</label>
        <input id="exp-l0" inputmode="decimal" autocomplete="off" size="7" value="${zustand.lambda0Eingabe == null ? "" : komma(zustand.lambda0Eingabe, 0)}">
        <button class="knopf">Prüfen</button>
        <span aria-hidden="true">${zustand.lambda0Ok === true ? "✓" : zustand.lambda0Ok === false ? "✗" : ""}</span>
      </form>
      <p id="exp-l0-meldung" class="exp-meldung" aria-live="polite">${esc(l0Feedback(lambdaMinAb))}</p>
      ${l0Fertig ? `
      <div class="exp-hinweis">
        <p><strong>λ₀ ≈ ${komma(zustand.lambda0Eingabe, 0)} nm.</strong> Das ist die Natrium-D-Linie (Literaturwert: 589 nm) — Abweichung ${komma(bew.abw, 0)} nm: <strong>${bew.stufe}</strong>.${ermutigung} Bei genau dieser Wellenlänge passt die Photonenenergie zur Anregungsenergie eines Natrium-Übergangs, deshalb der Einbruch.</p>
      </div>
      <h3>2 · Anregungsenergie berechnen <span class="abzeichen">eA</span></h3>
      <p>Aus λ₀ folgt die Anregungsenergie des Übergangs: <strong>ΔE = h · c / λ₀</strong>. Rechne selbst und gib ΔE in <strong>eV</strong> an (1 eV = 1,602·10⁻¹⁹ J; h = 6,626·10⁻³⁴ J·s, c = 2,998·10⁸ m/s).</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für ΔE</summary>
        <p>1) λ₀ in <strong>Meter</strong>: 589 nm = 589·10⁻⁹ m. 2) Energie in <strong>Joule</strong>: ΔE = h·c/λ₀ = (6,626·10⁻³⁴ · 2,998·10⁸) / (589·10⁻⁹) ≈ 3,37·10⁻¹⁹ J. 3) In <strong>eV</strong> umrechnen: durch 1,602·10⁻¹⁹ teilen → ≈ 2,1 eV.</p>
      </details>
      <form id="exp-de-form" class="exp-ablesen">
        <label for="exp-de">ΔE in eV:</label>
        <input id="exp-de" inputmode="decimal" autocomplete="off" size="7" value="${zustand.dEEingabe == null ? "" : komma(zustand.dEEingabe, 2)}">
        <button class="knopf">Prüfen</button>
        <span aria-hidden="true">${zustand.dEOk === true ? "✓" : zustand.dEOk === false ? "✗" : ""}</span>
      </form>
      <p id="exp-de-meldung" class="exp-meldung" aria-live="polite">${esc(dEFeedback())}</p>
      ${dEFertig ? `
      <div class="exp-hinweis">
        <p><strong>ΔE ≈ ${komma(zustand.dEEingabe, 2)} eV.</strong> So groß ist der Energieabstand zwischen Grund- und angeregtem Zustand für diesen Natrium-Übergang. Dasselbe ΔE steckt hinter dem gelben Licht einer Natriumdampflampe: Dort fallen angeregte Atome wieder herab und <em>senden</em> Photonen exakt dieser Energie aus — <strong>Emission und Absorption sind zwei Seiten desselben Übergangs</strong> (Kirchhoff).</p>
      </div>` : ""}` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Warum wird das Licht <strong>nur</strong> bei λ₀ stark absorbiert und sonst kaum?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="diskret">Nur Photonen mit E = ΔE passen zu einem Übergang zwischen diskreten Energieniveaus</option>
          <option value="hell">Bei λ₀ ist die Lichtquelle einfach am hellsten</option>
          <option value="erwaermt">Das Glas der Zelle erwärmt sich bei λ₀ und wird undurchsichtig</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Ein anderes Gas hat seine Resonanz bei <strong>kleinerer</strong> Wellenlänge. Was gilt dann für seine Anregungsenergie ΔE?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="groesser">ΔE ist größer (denn ΔE = h·c/λ₀, also ΔE ∝ 1/λ₀)</option>
          <option value="kleiner">ΔE ist kleiner</option>
          <option value="gleich">ΔE ist gleich, nur die Farbe ändert sich</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man λ₀ nie exakt?</summary>
        <p><strong>Endliche Schrittweite:</strong> Mit 2-nm-Schritten kann der wahre tiefste Punkt zwischen zwei Messwerten liegen. Wer das Minimum genauer will, misst dort dichter (z. B. in 1-nm-Schritten) und schaut, wo die Kurve am tiefsten durchhängt.</p>
        <p><strong>Linienverbreiterung:</strong> Die Absorptionslinie ist nicht unendlich scharf, sondern einige Nanometer breit — durch die Wärmebewegung der Atome (Doppler-Verbreiterung) und Stöße im Dampf. Dadurch ist der Einbruch ein Tal statt einer Nadel, und der tiefste Punkt lässt sich nur auf wenige Nanometer genau festlegen.</p>
        <p><strong>Detektorrauschen &amp; Ablesung:</strong> Die angezeigte Intensität schwankt um ein bis zwei Prozent. In der Nähe des flachen Minimums macht das die λ₀-Bestimmung empfindlich — deshalb hilft es, mehrere Punkte rund um das Tal zu messen.</p>
        <p><strong>Strategie dagegen:</strong> breiten Bereich grob abtasten, dann am Einbruch verdichten und die ganze Kurve betrachten statt nur eines einzelnen Werts — genau das hast du getan.</p>
      </details>`;

    zeichneDiagramm(panel.querySelector("#exp-diagramm"), l0Fertig);

    panel.querySelector("#exp-l0-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-l0").value);
      zustand.lambda0Eingabe = Number.isFinite(eingabe) ? eingabe : null;
      zustand.lambda0Ok = lambda0EingabeOk(eingabe);
      if (zustand.lambda0Ok !== true) { zustand.dEEingabe = null; zustand.dEOk = null; }
      panelAuswerten();
    });
    panel.querySelector("#exp-de-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-de").value);
      zustand.dEEingabe = Number.isFinite(eingabe) ? eingabe : null;
      // Bezugswert ist die exakte Energie zur Literatur-λ₀ — unabhängig von der Ableserundung
      zustand.dEOk = energieEingabeOk(eingabe, DE_REFERENZ);
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "diskret" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "groesser" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("resonanzabsorption-messreihe.csv",
        ["lambda in nm", "I in %"],
        sortiert.map(z => [String(z.lambda), z.iAb]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        lambda: 575, vorhersage: "", messungen: [],
        lambda0Eingabe: null, lambda0Ok: null, dEEingabe: null, dEOk: null,
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function l0Feedback(lambdaMinAb) {
    if (zustand.lambda0Ok === null) return "";
    if (zustand.lambda0Ok === true) return "✓ Treffer — das ist die Resonanzwellenlänge.";
    return "✗ Noch nicht. Schau auf den tiefsten Punkt deiner Kurve" +
      (Number.isFinite(lambdaMinAb) ? " (deine niedrigste Ablesung liegt bei etwa " + lambdaMinAb + " nm)" : "") +
      " — dort liegt λ₀ (±3 nm Toleranz).";
  }
  function dEFeedback() {
    if (zustand.dEOk === null) return "";
    return zustand.dEOk
      ? "✓ Richtig: ΔE = h·c/λ₀ ≈ 2,1 eV — die Anregungsenergie des Natrium-Übergangs."
      : "✗ Das passt noch nicht (±0,06 eV). Häufigste Stolperfalle: λ₀ in Meter (nm·10⁻⁹) und am Ende durch 1,602·10⁻¹⁹ teilen, um von Joule auf eV zu kommen.";
  }
  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Die Atome nehmen Energie nur in festen Portionen auf — passend zu den Abständen ihrer diskreten Energieniveaus. Nur Photonen mit E = h·c/λ = ΔE werden absorbiert, alle anderen laufen durch. Die diskrete Linie ist der direkte Fingerabdruck der Quantelung."
      : "✗ Nicht ganz: Die Lichtquelle ist über den ganzen Bereich gleich hell, und das Glas bleibt durchsichtig. Der Schlüssel liegt in den Atomen selbst — ihre Energieniveaus sind nicht beliebig, sondern diskret.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: ΔE = h·c/λ₀ — die Energie ist umgekehrt proportional zur Wellenlänge. Kürzere Resonanzwellenlänge bedeutet also einen größeren Energieabstand der beteiligten Niveaus."
      : "✗ Schau auf ΔE = h·c/λ₀: λ₀ steht im Nenner. Wird λ₀ kleiner, wird der Bruch — und damit ΔE — größer.";
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
