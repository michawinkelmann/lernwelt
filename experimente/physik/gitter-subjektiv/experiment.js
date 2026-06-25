// experiment.js — Interaktives Experiment: Wellenlänge mit dem Handgitter (subjektiv, QP, eA).
// Subjektive (visuelle) Gittermethode statt Schirm-Aufbau: Man blickt durch ein
// Handgitter (Gitterkonstante g) auf eine entfernte Lichtquelle. NEBEN der Quelle
// erscheinen die virtuellen Beugungsmaxima. An einer im Abstand L aufgestellten
// Maßskala liest man die seitliche Auslenkung x_k des k-ten Maximums SELBST ab.
// Daraus: tan θ = x_k / L und λ = g·sin θ / k. Die Lichtfarbe (und damit λ) ist
// dem Lernenden zunächst UNBEKANNT — er bestimmt sie aus eigener Messung.
// Realistische Tücke wie im Praktikum: die Ablesung streut deterministisch
// (Augenposition, Skalenkante), und weil man nur EINE Seite ablesen kann, lohnt
// das Mitteln über mehrere Ordnungen/Quellen. Modulebene strikt DOM-frei.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel,
  farbe, bauePhasen, csvHerunterladen, reduzierteBewegung
} from "../../../assets/js/experiment/helfer.js";

// ---------- Geräte ----------
// Lichtquellen — λ dem Lernenden zunächst verborgen (geheim:true zeigt "λ = ???")
export const QUELLEN = [
  { id: "rot",   kurz: "rote LED",   name: "Rote LED",       lambdaNm: 650.0, geheim: true },
  { id: "gruen", kurz: "grüne LED",  name: "Grüne LED",      lambdaNm: 532.0, geheim: true },
  { id: "na",    kurz: "Na-Lampe",   name: "Natriumlampe",   lambdaNm: 589.0, geheim: true }
];
// Auswahl, mit der die Quelle am Ende identifiziert wird (echte Werte + Distraktoren)
export const QUELLEN_AUSWAHL_NM = [450, 532, 589, 650];

// Handgitter: Striche pro mm (Aufdruck) — Gitterkonstante g = 1 mm / Strichzahl
export const GITTER = [300, 600];        // 1/300 mm ≈ 3,33 µm · 1/600 mm ≈ 1,67 µm
export const L_MIN = 0.40, L_MAX = 1.00, L_SCHRITT = 0.05; // Skalenabstand in m
export const SKALA_HALB_CM = 60;         // Maßskala reicht von −60 cm bis +60 cm
export const X_STREU_SPANNE = 0.010;     // ±5 mm Ablese-/Justagestreuung auf x (in m)
export const X_TOLERANZ_CM = 0.6;        // akzeptierte Ablesung der Auslenkung: ±0,6 cm
export const L_TOLERANZ_M = 0.02;        // akzeptierter notierter Skalenabstand: ±2 cm
export const LAMBDA_TOLERANZ_NM = 15;    // akzeptierte selbst gerechnete Wellenlänge: ±15 nm
export const MIN_MESSUNGEN = 6;          // Mindestumfang der Messreihe

// ---------- Modell (rein, Node-testbar) ----------
// Gitterkonstante in m: g = 1 mm / Strichzahl
export function gitterkonstanteM(strichProMm) { return 1e-3 / strichProMm; }

// höchste sichtbare Ordnung mit sin θ = k·λ/g ≤ 1
export function maxOrdnung(lambdaNm, strichProMm) {
  return Math.floor(gitterkonstanteM(strichProMm) / (lambdaNm * 1e-9));
}

// Beugungswinkel aus seitlicher Auslenkung x und Skalenabstand L: θ = arctan(x/L)
export function winkelAusXL(xMeter, lMeter) {
  return (lMeter > 0) ? Math.atan(xMeter / lMeter) : NaN; // rad
}

// Wellenlänge in nm aus g, Winkel θ und Ordnung k: λ = g·sin θ / k
export function lambda(strichProMm, thetaRad, k) {
  if (!(k >= 1)) return NaN;
  return gitterkonstanteM(strichProMm) * Math.sin(thetaRad) / k * 1e9; // nm
}

// Auswertungs-Pipeline in einem Schritt: aus x (m), L (m), g, k die Wellenlänge in nm
export function lambdaAusMessungNm(strichProMm, xMeter, lMeter, k) {
  if (!(k >= 1) || !(lMeter > 0) || !(xMeter > 0)) return NaN;
  return lambda(strichProMm, winkelAusXL(xMeter, lMeter), k);
}

// WAHRE seitliche Auslenkung des k-ten Maximums an der Skala (m):
// sin θ = k·λ/g, dann x = L·tan θ
export function auslenkungReal(strichProMm, lambdaNm, k, lMeter) {
  const s = k * lambdaNm * 1e-9 / gitterkonstanteM(strichProMm);
  if (!(s < 1)) return NaN; // Ordnung existiert nicht (sin θ ≥ 1)
  return lMeter * Math.tan(Math.asin(s)); // m
}
// … plus deterministische Ablese-/Augenstreuung (±5 mm), pro (Quelle,Gitter,k,L) stabil
export function auslenkungAnzeigeM(strichProMm, lambdaNm, k, lMeter, schluessel) {
  const x = auslenkungReal(strichProMm, lambdaNm, k, lMeter);
  if (!Number.isFinite(x)) return NaN;
  return x + streuung("x:" + schluessel, X_STREU_SPANNE);
}

// Maßskala-Abstand zeigt den wahren Abstand plus kleine Streuung (±1 cm)
export function abstandAnzeigeM(lWahrM) {
  return lWahrM + streuung("L:" + lWahrM.toFixed(2), 0.005);
}

// alle sichtbaren Maxima k = 1..k_max (eine Seite), deren x auf die Skala fällt
export function sichtbareOrdnungen(lambdaNm, strichProMm, lMeter) {
  const liste = [];
  const kmax = maxOrdnung(lambdaNm, strichProMm);
  for (let k = 1; k <= kmax; k++) {
    const x = auslenkungReal(strichProMm, lambdaNm, k, lMeter);
    if (Number.isFinite(x) && x * 100 <= SKALA_HALB_CM) liste.push(k);
  }
  return liste;
}

// Mindestprotokoll: ≥6 Messungen, ≥2 Ordnungen UND ≥2 verschiedene Quellen
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.k)).size >= 2
    && new Set(messungen.map(z => z.quelleId)).size >= 2;
}

// Einordnung des Quellen-Mittelwerts gegen den wahren λ (nur Rückmeldung, keine Note)
export function bewertungLambda(gemessenNm, wahrNm) {
  const abw = Math.abs(gemessenNm - wahrNm) / wahrNm * 100;
  if (abw <= 1.5) return { stufe: "sehr gut", abw };
  if (abw <= 3.5) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}

// die zur Auswahl gehörende beste Übereinstimmung mit einem gemessenen λ
export function naechsteAuswahl(gemessenNm) {
  return QUELLEN_AUSWAHL_NM.reduce((b, w) =>
    Math.abs(w - gemessenNm) < Math.abs(b - gemessenNm) ? w : b);
}

// ---------- Prüffälle (analytisch bekannte Sollwerte) ----------
export const pruefFaelle = [
  // x = L·tan(arcsin(k·λ/g)) — Vorwärtsrechnung
  { was: "x1 (650 nm, 300er, L = 0,5 m, k = 1)", soll: 0.09941, tol: 5e-4,
    ist: () => auslenkungReal(300, 650, 1, 0.5) },
  { was: "x1 (532 nm, 600er, L = 0,5 m, k = 1)", soll: 0.16841, tol: 5e-4,
    ist: () => auslenkungReal(600, 532, 1, 0.5) },
  { was: "x2 (589 nm, 300er, L = 0,5 m, k = 2)", soll: 0.18889, tol: 5e-4,
    ist: () => auslenkungReal(300, 589, 2, 0.5) },
  // λ = g·sin(arctan(x/L))/k — Rückwärtsrechnung (muss x oben invertieren)
  { was: "λ aus x1 (650 nm, 300er, L = 0,5 m, k = 1)", soll: 650, tol: 1e-6,
    ist: () => lambdaAusMessungNm(300, auslenkungReal(300, 650, 1, 0.5), 0.5, 1) },
  { was: "k_max (650 nm, 300er)", soll: 5, tol: 0, ist: () => maxOrdnung(650, 300) }
];

export const TESTS = [
  { name: "Prüffälle: x_k-Vorwärtswerte, λ-Rückwärts und k_max",
    ok: () => pruefFaelle.every(p => Math.abs(p.ist() - p.soll) <= p.tol) },

  { name: "winkelAusXL: tan θ = x/L (45° bei x = L, 0 bei x = 0, NaN bei L ≤ 0)",
    ok: () => Math.abs(winkelAusXL(0.5, 0.5) - Math.PI / 4) < 1e-12
      && winkelAusXL(0, 0.7) === 0
      && Number.isNaN(winkelAusXL(0.1, 0)) },

  { name: "lambda: λ = g·sin θ / k — Kontrollwert und k-Antiproportionalität",
    ok: () => {
      const g = gitterkonstanteM(300);
      const l1 = lambda(300, Math.asin(1 * 650e-9 / g), 1);
      const l2 = lambda(300, Math.asin(2 * 650e-9 / g), 2);
      return Math.abs(l1 - 650) < 1e-6 && Math.abs(l2 - 650) < 1e-6;
    } },

  { name: "k_max über alle Kombinationen (650 nm: 300er→5, 600er→2)",
    ok: () => maxOrdnung(650, 300) === 5 && maxOrdnung(650, 600) === 2
      && maxOrdnung(532, 600) === 3 && maxOrdnung(589, 300) === 5 },

  { name: "Ordnung über k_max existiert nicht (sin θ ≥ 1 → NaN)",
    ok: () => !Number.isFinite(auslenkungReal(600, 650, 3, 0.5))
      && Number.isFinite(auslenkungReal(600, 650, 2, 0.5)) },

  { name: "λ-Pipeline aus perfektem x exakt (alle Quellen/Gitter/L/k)",
    ok: () => QUELLEN.every(q => GITTER.every(g => [0.4, 0.6, 1.0].every(L => {
        const kmax = Math.min(3, maxOrdnung(q.lambdaNm, g));
        for (let k = 1; k <= kmax; k++) {
          const x = auslenkungReal(g, q.lambdaNm, k, L);
          if (!Number.isFinite(x)) continue;
          if (Math.abs(lambdaAusMessungNm(g, x, L, k) - q.lambdaNm) > 1e-6) return false;
        }
        return true;
      }))) },

  { name: "Konsistenz über Ordnungen: gleiche Quelle/Gitter, k=1..3 → gleiches λ",
    ok: () => {
      const g = 300, L = 0.6, lam = 589;
      for (let k = 1; k <= maxOrdnung(lam, g) && k <= 3; k++) {
        const x = auslenkungReal(g, lam, k, L);
        if (Math.abs(lambdaAusMessungNm(g, x, L, k) - lam) > 1e-6) return false;
      }
      return true;
    } },

  { name: "Ablese-Streuung innerhalb ±5 mm, deterministisch und schlüsselabhängig",
    ok: () => {
      for (const g of GITTER) for (let k = 1; k <= 3; k++) {
        const s = "rot:" + g + ":" + k + ":0.50";
        const a = auslenkungAnzeigeM(g, 650, k, 0.5, s);
        if (!Number.isFinite(a)) continue;
        if (Math.abs(a - auslenkungReal(g, 650, k, 0.5)) > X_STREU_SPANNE / 2 + 1e-12) return false;
        if (a !== auslenkungAnzeigeM(g, 650, k, 0.5, s)) return false; // deterministisch
      }
      return auslenkungAnzeigeM(300, 650, 1, 0.5, "a") !== auslenkungAnzeigeM(300, 650, 1, 0.5, "b");
    } },

  { name: "Skalenabstand-Streuung innerhalb ±2,5 mm, deterministisch",
    ok: () => {
      for (let i = 0; i <= 60; i++) {
        const L = 0.4 + i * 0.01;
        if (Math.abs(abstandAnzeigeM(L) - L) > 0.0025) return false;
        if (abstandAnzeigeM(L) !== abstandAnzeigeM(L)) return false;
      }
      return true;
    } },

  { name: "Ehrliche Ablesung (mit Streuung) trifft λ auf unter 15 nm",
    ok: () => {
      const g = 300, L = 0.5, k = 2;
      const x = auslenkungAnzeigeM(g, 589, k, L, "na:" + g + ":" + k + ":0.50");
      return Math.abs(lambdaAusMessungNm(g, x, L, k) - 589) < 15;
    } },

  { name: "Quelle landet eindeutig: gemessenes λ ordnet sich richtig zu",
    ok: () => {
      const treffer = q => {
        const g = 300, L = 0.6, k = 2;
        const x = auslenkungAnzeigeM(g, q.lambdaNm, k, L, q.id + ":" + g + ":" + k + ":0.60");
        return naechsteAuswahl(lambdaAusMessungNm(g, x, L, k));
      };
      return treffer(QUELLEN[0]) === 650 && treffer(QUELLEN[1]) === 532 && treffer(QUELLEN[2]) === 589;
    } },

  { name: "Messreihe vollständig nur mit ≥6 Messungen, ≥2 Ordnungen UND ≥2 Quellen",
    ok: () => {
      const z = (quelleId, k) => ({ quelleId, k });
      const nurEine = [1, 2, 3, 1, 2, 3].map((k, i) => z("rot", k));       // nur 1 Quelle
      const nurK1 = ["rot", "gruen", "na", "rot", "gruen", "na"].map(q => z(q, 1)); // nur k=1
      const gut = [z("rot", 1), z("rot", 2), z("gruen", 1), z("gruen", 2), z("na", 1), z("na", 2)];
      return !messreiheVollstaendig(nurEine) && !messreiheVollstaendig(nurK1)
        && !messreiheVollstaendig(gut.slice(0, 5)) && messreiheVollstaendig(gut);
    } },

  { name: "Bewertung: 0,5 % → sehr gut · 2,5 % → gut · 6 % → nochmal prüfen",
    ok: () => bewertungLambda(652, 650).stufe === "sehr gut"
      && bewertungLambda(666, 650).stufe === "gut"
      && bewertungLambda(611, 650).stufe === "nochmal prüfen" },

  { name: "Helfer eingebunden: parseDezimal und ablesungOk",
    ok: () => parseDezimal("10,2") === 10.2 && parseDezimal("10.2") === 10.2
      && Number.isNaN(parseDezimal("abc"))
      && ablesungOk(10.4, 10.0, X_TOLERANZ_CM) && !ablesungOk(10.7, 10.0, X_TOLERANZ_CM) }
];

// ======================================================================
// Browser-Teil
// ======================================================================

// Lichtfarbe aus der Wellenlänge — bewusste Ausnahme von den CSS-Variablen,
// denn die Farbe IST hier eine Messinformation (in Hell- und Dunkelmodus sichtbar).
function lambdaFarbe(nm, alpha = 1) {
  let h;
  if (nm < 440) h = 270 - (nm - 380) / 60 * 30;
  else if (nm < 490) h = 240 - (nm - 440) / 50 * 60;
  else if (nm < 530) h = 180 - (nm - 490) / 40 * 60;
  else if (nm < 580) h = 120 - (nm - 530) / 50 * 60;
  else if (nm < 645) h = 60 - (nm - 580) / 65 * 60;
  else h = 0;
  return "hsla(" + Math.round(h) + ", 95%, 55%, " + alpha + ")";
}

const TIEF = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
const subK = k => String(k).split("").map(z => TIEF[z] || z).join("");

export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phase: "aufbau",
    quelle: QUELLEN[0], gitter: 300, lWahr: 0.5,
    lEintrag: null,            // notierter Skalenabstand in m (null = noch nicht abgelesen)
    vorhersage: "",            // "groesser" | "kleiner" | "gleich" (feineres Gitter → Maxima …)
    auswahlK: 1,               // gerade gewählte Ordnung zum Ablesen
    messungen: [],             // {quelleId, kurz, gitter, k, L, xCm, lambdaEintrag?, lambdaOk?}
    quelleGeloest: {},         // quelleId → true/false
    frageFeedback: null,
    meldungMessen: "", meldungAuswerten: ""
  };

  const wechsle = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], wechslePhase);

  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="460" aria-label="Blick durch das Handgitter auf eine entfernte Lichtquelle: in der Mitte das helle 0. Bild der Lampe, links und rechts daneben die farbigen Beugungsmaxima. Im Vordergrund eine waagerechte Zentimeterskala; an ihr liest man die seitliche Auslenkung des Maximums ab. Oben Anzeigen für gewählte Lichtquelle, Handgitter und Skalenabstand."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);

  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  // Canvas-Geometrie (Sicht durch das Gitter auf Quelle + Skala)
  const MITTE_X = 180, QUELLE_Y = 150, SKALA_Y = 300;
  const PX_PRO_CM = 158 / SKALA_HALB_CM;   // halbe Skala (60 cm) füllt 158 px nach jeder Seite

  function streuSchluessel(k) {
    return zustand.quelle.id + ":" + zustand.gitter + ":" + k + ":" + zustand.lWahr.toFixed(2);
  }
  // Anzeige-Auslenkung (m) des k-ten Maximums bei der aktuellen Konfiguration
  function xAnzeige(k) {
    return auslenkungAnzeigeM(zustand.gitter, zustand.quelle.lambdaNm, k, zustand.lWahr, streuSchluessel(k));
  }
  function ordnungenJetzt() {
    return sichtbareOrdnungen(zustand.quelle.lambdaNm, zustand.gitter, zustand.lWahr);
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    const lamFarbe = lambdaFarbe(zustand.quelle.lambdaNm, 1);
    const ordnungen = zustand.phase === "aufbau" ? [] : ordnungenJetzt();
    const aktiv = zustand.phase === "messen" ? zustand.auswahlK : null;

    // dunkler Sichtbereich (Blick durch das Gitter)
    ctx.fillStyle = cFlaeche; ctx.globalAlpha = 0.55;
    ctx.fillRect(8, 28, w - 16, 168); ctx.globalAlpha = 1;
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1; ctx.strokeRect(8.5, 28.5, w - 17, 167);
    ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("Blick durch das Handgitter", 12, 22);

    // 0. Maximum: das helle direkte Bild der Lampe in der Mitte
    ctx.fillStyle = lamFarbe;
    ctx.globalAlpha = 0.28; ctx.beginPath(); ctx.arc(MITTE_X, QUELLE_Y, 16, 0, 7); ctx.fill();
    ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(MITTE_X, QUELLE_Y, 9, 0, 7); ctx.fill();
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("0. Bild (Lampe)", MITTE_X, QUELLE_Y - 24);

    // virtuelle Maxima links und rechts (nur jene, die auf die Skala fallen)
    for (const k of ordnungen) {
      const xPx = xAnzeige(k) * 100 * PX_PRO_CM;
      for (const s of [-1, 1]) {
        const px = MITTE_X + s * xPx;
        if (px < 14 || px > w - 14) continue;
        const hervor = k === aktiv && s > 0; // die abzulesende (rechte) Ordnung betonen
        ctx.fillStyle = lamFarbe;
        ctx.globalAlpha = hervor ? 0.4 : 0.22;
        ctx.beginPath(); ctx.arc(px, QUELLE_Y, hervor ? 12 : 9, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.beginPath(); ctx.arc(px, QUELLE_Y, hervor ? 7 : 5, 0, 7); ctx.fill();
        ctx.fillStyle = hervor ? cAkzent : cLeise; ctx.font = "11px system-ui, sans-serif";
        ctx.fillText((s > 0 ? "+" : "−") + k, px, QUELLE_Y + 22);
        ctx.font = "12px system-ui, sans-serif";
      }
    }

    // Hinweis im Aufbau (Heizung/Lampe aus): Maxima erst in der Durchführung
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Die farbigen Beugungsbilder erscheinen,", MITTE_X, QUELLE_Y + 30);
      ctx.fillText("sobald du in der Durchführung hindurchblickst.", MITTE_X, QUELLE_Y + 48);
    }

    // Lotlinie von der Mitte zur Skala (0-Marke)
    ctx.strokeStyle = cLeise; ctx.setLineDash([4, 4]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(MITTE_X, QUELLE_Y + 12); ctx.lineTo(MITTE_X, SKALA_Y - 6); ctx.stroke();
    ctx.setLineDash([]);

    // waagerechte Zentimeter-Skala (Maßstab im Abstand L)
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(MITTE_X - 158, SKALA_Y); ctx.lineTo(MITTE_X + 158, SKALA_Y); ctx.stroke();
    ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "center";
    for (let cm = -SKALA_HALB_CM; cm <= SKALA_HALB_CM; cm += 5) {
      const px = MITTE_X + cm * PX_PRO_CM;
      if (px < 16 || px > w - 16) continue;
      const lang = cm % 20 === 0 ? 13 : cm % 10 === 0 ? 9 : 5;
      ctx.strokeStyle = cm % 20 === 0 ? cText : cLeise; ctx.lineWidth = cm % 20 === 0 ? 1.4 : 1;
      ctx.beginPath(); ctx.moveTo(px, SKALA_Y); ctx.lineTo(px, SKALA_Y + lang); ctx.stroke();
      if (cm % 20 === 0) { ctx.fillStyle = cText; ctx.fillText(String(cm), px, SKALA_Y + 25); }
    }
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Maßskala · cm (im Abstand L)", MITTE_X - 158, SKALA_Y + 40);

    // Marke der aktiven Ordnung auf der Skala (zeigt, was abzulesen ist)
    if (aktiv && ordnungen.includes(aktiv)) {
      const px = MITTE_X + xAnzeige(aktiv) * 100 * PX_PRO_CM;
      if (px <= w - 14) {
        ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(px, QUELLE_Y + 16); ctx.lineTo(px, SKALA_Y); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = cAkzent;
        ctx.beginPath(); ctx.moveTo(px, SKALA_Y - 9); ctx.lineTo(px - 5, SKALA_Y - 18); ctx.lineTo(px + 5, SKALA_Y - 18); ctx.closePath(); ctx.fill();
      }
    }

    // Anzeigen für Quelle / Gitter / Abstand
    const kasten = (x, etikett, wert, farbPunkt) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 360, 108, 44, 6); else ctx.rect(x, 360, 108, 44);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(etikett, x + 54, 376);
      ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.fillText(wert, x + 54, 394);
      if (farbPunkt) { ctx.fillStyle = farbPunkt; ctx.beginPath(); ctx.arc(x + 12, 372, 4, 0, 7); ctx.fill(); }
      ctx.font = "12px system-ui, sans-serif";
    };
    kasten(8, "Lichtquelle", zustand.quelle.geheim ? "λ = ???" : zustand.quelle.kurz, lamFarbe);
    kasten(126, "Handgitter", zustand.gitter + "/mm");
    kasten(244, "Skalenabstand", "L = " + komma(zustand.lWahr, 2) + " m");
    ctx.textAlign = "start";
  }

  // ---------- Hilfen für die Panels ----------
  function zeigeMeldungMessen() {
    const html = `<p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>`;
    zustand.meldungMessen = "";
    return html;
  }
  const kurzName = z => `${z.kurz} · ${z.gitter}er`;
  const vorhersageFehlt = () => !zustand.vorhersage;

  function setzeKonfig(aenderung) {
    Object.assign(zustand, aenderung);
    zustand.lEintrag = null;
    zeichne();
  }

  function quelleGitterWahl() {
    return `
      <div class="exp-regler">
        <label for="exp-quelle">Lichtquelle (λ zunächst unbekannt):</label>
        <select id="exp-quelle" class="exp-wahl">
          ${QUELLEN.map((q, i) => `<option value="${i}"${zustand.quelle === q ? " selected" : ""}>${esc(q.name)}</option>`).join("")}
        </select>
        <label for="exp-gitterwahl">Handgitter:</label>
        <select id="exp-gitterwahl" class="exp-wahl">
          ${GITTER.map(g => `<option value="${g}"${zustand.gitter === g ? " selected" : ""}>${g} Striche/mm (Aufdruck: g = ${komma(1e6 / g, 2)} µm)</option>`).join("")}
        </select>
      </div>`;
  }
  function verdrahteWahl(nachWechsel) {
    panel.querySelector("#exp-quelle").addEventListener("change", ev => {
      setzeKonfig({ quelle: QUELLEN[Number(ev.target.value)] }); nachWechsel();
    });
    panel.querySelector("#exp-gitterwahl").addEventListener("change", ev => {
      setzeKonfig({ gitter: Number(ev.target.value) }); nachWechsel();
    });
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Bei der <strong>subjektiven (visuellen) Gittermethode</strong> blickst du selbst durch ein <strong>Handgitter</strong> auf eine entfernte Lichtquelle (farbige LED oder Spektrallampe). Direkt geradeaus siehst du das helle <strong>0. Bild</strong> der Lampe; links und rechts daneben erscheinen die <strong>virtuellen Beugungsmaxima</strong> k-ter Ordnung. In einem Abstand <em>L</em> hinter dem Gitter steht eine waagerechte <strong>Maßskala</strong> (cm). An ihr liest du die <strong>seitliche Auslenkung x<sub>k</sub></strong> des Maximums ab.</p>
      <p>Aus der Geometrie folgt <strong>tan θ = x<sub>k</sub> / L</strong>, und die Gittergleichung liefert <strong>λ = g · sin θ / k</strong> (g = Gitterkonstante = 1/Strichzahl). Die Lichtfarbe — und damit λ — verrät dir das Gerät <strong>nicht</strong>; du bestimmst sie aus deiner eigenen Messung.</p>
      <p><strong>Plan:</strong> Skalenabstand L notieren. Dann für mindestens ${MIN_MESSUNGEN} Messungen die Auslenkung x ablesen und dabei <em>sowohl verschiedene Ordnungen</em> (k = 1, 2, …) <em>als auch verschiedene Quellen</em> nutzen. In der Auswertung rechnest du je Zeile θ und λ und mittelst je Quelle.</p>
      ${quelleGitterWahl()}
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du hindurchblickst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-vorhersage">Wechsle ich vom 300er- auf das feinere 600er-Gitter (gleiche Quelle), liegen die Maxima …</label>
      <select id="exp-vorhersage" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… weiter außen (größeres x)</option>
        <option value="kleiner">… enger zusammen (kleineres x)</option>
        <option value="gleich">… an derselben Stelle</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    verdrahteWahl(() => {});
    panel.querySelector("#exp-vorhersage").value = zustand.vorhersage;
    panel.querySelector("#exp-vorhersage").addEventListener("change", ev => { zustand.vorhersage = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst deine Vorhersage aus — gleich prüfst du sie selbst durch Beobachtung.";
        return;
      }
      wechsle("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortAus = wahl => wahl === "groesser" ? "weiter außen" : wahl === "kleiner" ? "enger zusammen" : "an derselben Stelle";

  function beobachtungHtml() {
    const gitterGenutzt = new Set(zustand.messungen.map(z => z.gitter)).size;
    let html = `<p>Deine Vorhersage: feineres Gitter → Maxima <strong>${wortAus(zustand.vorhersage)}</strong>. Wechsle das Gitter und schau, wie die farbigen Bilder wandern!</p>`;
    if (gitterGenutzt >= 2) {
      const ok = zustand.vorhersage === "groesser";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>feineres Gitter → Maxima weiter außen</strong> (kleineres g, größeres sin θ = k·λ/g). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Beobachtung."}</p>`;
    }
    return html;
  }

  function panelMessen() {
    if (vorhersageFehlt()) {
      panel.innerHTML = `
        <h2>Durchführung</h2>
        <p>Halte zuerst deine <strong>Vorhersage</strong> fest (Phase 1 · Aufbau) — erst vorhersagen, dann beobachten und messen!</p>
        <button class="knopf" id="exp-zurueck0">Zum Aufbau</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechsle("aufbau"));
      return;
    }
    const ordnungen = ordnungenJetzt();
    if (!ordnungen.includes(zustand.auswahlK)) zustand.auswahlK = ordnungen[0] || 1;
    const lFehlt = zustand.lEintrag === null;
    const us = new Set(zustand.messungen.map(z => z.k)).size;
    const qs = new Set(zustand.messungen.map(z => z.quelleId)).size;
    let fortschritt = `${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen.`;
    if (zustand.messungen.length >= 2 && us < 2) fortschritt += " Miss auch eine andere Ordnung k!";
    if (zustand.messungen.length >= 2 && qs < 2) fortschritt += " Nimm auch eine andere Lichtquelle!";

    panel.innerHTML = `
      <h2>Durchführung</h2>
      ${quelleGitterWahl()}
      <div class="exp-regler">
        <label for="exp-abstand">Skalenabstand einstellen (danach Skala neu ablesen!): L</label>
        <input type="range" id="exp-abstand" min="${L_MIN}" max="${L_MAX}" step="${L_SCHRITT}" value="${zustand.lWahr}"
          aria-label="Abstand der Maßskala vom Gitter zwischen 0,40 und 1,00 Metern">
      </div>
      <form id="exp-lform" class="exp-ablesen">
        <label for="exp-l">Skalenabstand: L in m =</label>
        <input id="exp-l" inputmode="decimal" autocomplete="off" size="7" value="${lFehlt ? "" : komma(zustand.lEintrag, 2)}">
        <button class="knopf">Notieren</button>
        <strong id="exp-l-status">${lFehlt ? "✗ noch nicht notiert" : "✓ notiert"}</strong>
      </form>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <div class="exp-regler">
        <label for="exp-kwahl">Welche Ordnung liest du ab?</label>
        <select id="exp-kwahl" class="exp-wahl">
          ${ordnungen.map(k => `<option value="${k}"${k === zustand.auswahlK ? " selected" : ""}>k = ${k} (rechts, +${k})</option>`).join("") || `<option value="">keine sichtbar — L verkleinern</option>`}
        </select>
      </div>
      <form id="exp-xform" class="exp-ablesen">
        <label for="exp-x">Lies an der Skala ab — Auslenkung x in cm:</label>
        <input id="exp-x" inputmode="decimal" autocomplete="off" size="7"${lFehlt || !ordnungen.length ? " disabled" : ""}>
        <button class="knopf"${lFehlt || !ordnungen.length ? " disabled" : ""}>In die Tabelle</button>
      </form>
      ${zeigeMeldungMessen()}
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Quelle · Gitter</th><th>k</th><th>x in cm</th><th>L in m</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${esc(kurzName(z))}</td><td>${z.k}</td><td>${komma(z.xCm, 1)}</td><td>${komma(z.L, 2)}</td></tr>`).join("")
          || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${esc(fortschritt)}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    verdrahteWahl(panelMessen);

    const regler = panel.querySelector("#exp-abstand");
    regler.addEventListener("input", ev => {
      zustand.lWahr = Math.round(Number(ev.target.value) / L_SCHRITT) * L_SCHRITT;
      zustand.lEintrag = null;
      zeichne();
      panel.querySelector("#exp-l-status").textContent = "✗ Skala neu ablesen!";
      panel.querySelector("#exp-l").value = "";
    });
    regler.addEventListener("change", () => {
      const hatteFokus = document.activeElement === regler;
      panelMessen();
      if (hatteFokus) panel.querySelector("#exp-abstand").focus();
    });

    panel.querySelector("#exp-kwahl").addEventListener("change", ev => {
      zustand.auswahlK = Number(ev.target.value) || zustand.auswahlK;
      zeichne();
    });

    panel.querySelector("#exp-lform").addEventListener("submit", ev => {
      ev.preventDefault();
      const ein = parseDezimal(panel.querySelector("#exp-l").value);
      if (!ablesungOk(ein, abstandAnzeigeM(zustand.lWahr), L_TOLERANZ_M)) {
        panel.querySelector("#exp-meldung").textContent = "✗ Schau noch einmal auf den Skalenabstand in der Anzeige — L in Metern, z. B. 0,50.";
        return;
      }
      zustand.lEintrag = ein;
      zustand.meldungMessen = "✓ L notiert. Jetzt eine Ordnung wählen und ihre Auslenkung x an der Skala ablesen.";
      panelMessen();
    });

    panel.querySelector("#exp-xform").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.lEintrag === null) { meldung.textContent = "Notiere zuerst den Skalenabstand L."; return; }
      const k = zustand.auswahlK;
      if (zustand.messungen.some(z => z.quelleId === zustand.quelle.id && z.gitter === zustand.gitter && z.k === k)) {
        meldung.textContent = "Diese Kombination (Quelle, Gitter, Ordnung) hast du schon — variiere Ordnung oder Quelle.";
        return;
      }
      const eingabe = parseDezimal(panel.querySelector("#exp-x").value);
      const wahrXcm = xAnzeige(k) * 100;
      if (!ablesungOk(eingabe, wahrXcm, X_TOLERANZ_CM)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wo trifft die Markierung der Ordnung +" + k + " die Skala? (Auf etwa 0,5 cm genau ablesen.)";
        return;
      }
      zustand.messungen.push({
        quelleId: zustand.quelle.id, kurz: zustand.quelle.kurz, gitter: zustand.gitter,
        k, L: zustand.lEintrag, xCm: eingabe, lambdaEintrag: null, lambdaOk: null
      });
      zustand.meldungMessen = "✓ Eingetragen: " + kurzName({ kurz: zustand.quelle.kurz, gitter: zustand.gitter }) + ", k = " + k + ", x = " + komma(eingabe, 1) + " cm.";
      panelMessen();
    });

    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechsle("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} Messungen mit ≥ 2 Ordnungen <em>und</em> ≥ 2 Quellen — bisher: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck0">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechsle("messen"));
      return;
    }
    const lambdaSoll = z => lambdaAusMessungNm(z.gitter, z.xCm / 100, z.L, z.k);
    const mittelwerte = QUELLEN.map(q => {
      const werte = zustand.messungen.filter(z => z.quelleId === q.id && z.lambdaOk).map(z => z.lambdaEintrag);
      return { q, n: werte.length, mw: mittel(werte) };
    }).filter(m => m.n > 0);

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Rechne für jede Zeile selbst: <strong>θ = arctan(x / L)</strong> (x vorher in Meter!), dann <strong>λ = g · sin θ / k</strong>. Die Gitterkonstante steht als Aufdruck auf dem Gitter (g = 1/Strichzahl). Gib λ in nm an; ±${LAMBDA_TOLERANZ_NM} nm sind okay.</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für eine Zeile</summary>
        <p>1) x in <strong>Meter</strong>: 10,0 cm = 0,100 m. 2) θ = arctan(x / L) — Taschenrechner im <strong>Bogenmaß oder Grad</strong>, aber konsistent! 3) g in Meter: 300/mm → g = 1/300 mm = 3,33·10⁻⁶ m. 4) λ = g · sin θ / k ausrechnen — Ergebnis um einige hundert Nanometer. 5) In Nanometer angeben (1 m = 10⁹ nm).</p>
      </details>
      ${zustand.messungen.map((z, i) => `
        <form class="exp-ablesen" data-zeile="${i}">
          <span><strong>${esc(kurzName(z))}</strong> (g = ${komma(1e6 / z.gitter, 2)} µm), k = ${z.k}, x = ${komma(z.xCm, 1)} cm, L = ${komma(z.L, 2)} m →</span>
          <label for="exp-l${i}">λ in nm:</label>
          <input id="exp-l${i}" inputmode="decimal" autocomplete="off" size="6" value="${z.lambdaOk ? komma(z.lambdaEintrag, 0) : ""}">
          <button class="knopf zweitrangig">Prüfen</button>
          <strong>${z.lambdaOk === true ? "✓" : z.lambdaOk === false ? "✗" : ""}</strong>
        </form>`).join("")}
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${mittelwerte.length ? `<h3>Mittelwert je Lichtquelle</h3>
      <ul>${mittelwerte.map(m => {
        const bew = bewertungLambda(m.mw, m.q.lambdaNm);
        return `<li>λ̄(${esc(m.q.name)}) = <strong>${komma(m.mw, 0)} nm</strong> aus ${m.n} Zeile${m.n > 1 ? "n" : ""} — welche Lichtfarbe ist das?<br>
          <form class="exp-ablesen exp-qwahl" data-quelle="${m.q.id}">
            <label for="exp-q-${m.q.id}">Diese Quelle hat λ ≈</label>
            <select id="exp-q-${m.q.id}" class="exp-wahl">
              <option value="">bitte wählen</option>
              ${QUELLEN_AUSWAHL_NM.map(w => `<option value="${w}">${w} nm</option>`).join("")}
            </select>
            <button class="knopf zweitrangig">Prüfen</button>
            <strong id="exp-q-status-${m.q.id}">${zustand.quelleGeloest[m.q.id]
              ? "✓ " + m.q.lambdaNm.toFixed(0) + " nm — Abweichung " + komma(bew.abw, 1) + " % (" + bew.stufe + ")"
              : ""}</strong>
          </form></li>`;
      }).join("")}</ul>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-frage1" class="exp-ablesen">
        <label for="exp-frage1-wahl">Warum siehst du die Maxima <strong>neben</strong> der Lampe, obwohl das Gitter genau vor deinem Auge sitzt?</label>
        <select id="exp-frage1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="virtuell">Das gebeugte Licht trifft schräg ins Auge; das Gehirn verlängert es geradlinig — die Bilder erscheinen seitlich versetzt (virtuell).</option>
          <option value="reflex">Die Skala spiegelt die Lampe seitlich.</option>
          <option value="farbe">Farbiges Licht wird vom Gitter zur Seite abgelenkt und bleibt dort.</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
        <strong id="exp-frage1-status">${zustand.f1 ? esc(zustand.f1) : ""}</strong>
      </form>
      <form id="exp-frage2" class="exp-ablesen">
        <label for="exp-frage2-wahl">Du misst dieselbe Quelle bei k = 1 und k = 2. Welches λ sollte sich ergeben?</label>
        <select id="exp-frage2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">Für beide Ordnungen dasselbe λ — k = 2 liegt nur weiter außen.</option>
          <option value="doppelt">Bei k = 2 das doppelte λ.</option>
          <option value="halb">Bei k = 2 das halbe λ.</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
        <strong id="exp-frage2-status">${zustand.f2 ? esc(zustand.f2) : ""}</strong>
      </form>
      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — wie genau ist deine Wellenlänge?</summary>
        <p><strong>Augen-/Parallaxenfehler:</strong> Bei der subjektiven Methode liest <em>du</em> die Lage des virtuellen Bildes an der Skala ab — Kopf- und Augenposition gehen direkt ein. Schon ein leicht schräger Blick verschiebt x um Millimeter. Deshalb: Gitter dicht ans Auge, ruhig halten, Skala mittig anvisieren.</p>
        <p><strong>Skalenabstand L:</strong> Hängt das Maßband durch oder steht die Skala nicht senkrecht zur Blickrichtung, wird L falsch — und λ skaliert fast linear mit dem Fehler in θ.</p>
        <p><strong>Kleine Auslenkung = großer relativer Fehler:</strong> Höhere Ordnungen (größeres k, größeres x) lassen sich relativ genauer ablesen. Über mehrere Ordnungen und Quellen zu mitteln verbessert die Schätzung — genau das hast du getan.</p>
        <p><strong>Objektiv vs. subjektiv:</strong> Die objektive Methode (Laser → Schirm) liefert ein festes, fotografierbares Bild und ist meist genauer. Die subjektive Methode braucht keine Verdunkelung und kein Schirmstativ — ideal für eine schnelle Spektralmessung im Tageslicht.</p>
      </details>`;

    panel.querySelectorAll("[data-zeile]").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const z = zustand.messungen[Number(f.dataset.zeile)];
      const ein = parseDezimal(f.querySelector("input").value);
      const soll = lambdaSoll(z);
      if (Number.isFinite(ein) && Math.abs(ein - soll) <= LAMBDA_TOLERANZ_NM) {
        z.lambdaEintrag = ein; z.lambdaOk = true;
        zustand.meldungAuswerten = "✓ " + kurzName(z) + ", k = " + z.k + ": λ passt.";
        panelAuswerten();
      } else {
        z.lambdaOk = false;
        zustand.quelleGeloest[z.quelleId] = false;
        f.querySelector(":scope > strong").textContent = "✗";
        panel.querySelector("#exp-meldung-ausw").textContent = "✗ Prüfe deine Rechnung: θ = arctan(x / L) mit x in Meter, dann λ = g · sin θ / k. Häufige Stolperfalle: x in cm statt m, oder g vergessen umzurechnen.";
      }
    }));

    panel.querySelectorAll(".exp-qwahl").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const qid = f.dataset.quelle;
      const q = QUELLEN.find(x => x.id === qid);
      const wahl = Number(f.querySelector("select").value);
      const status = panel.querySelector("#exp-q-status-" + qid);
      if (wahl === Math.round(q.lambdaNm) || wahl === naechsteAuswahl(q.lambdaNm)) {
        zustand.quelleGeloest[qid] = true;
        panelAuswerten();
      } else {
        status.textContent = wahl ? "✗ Vergleiche mit deinem Mittelwert für diese Quelle." : "Wähle zuerst einen Wert.";
      }
    }));

    panel.querySelector("#exp-frage1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-frage1-wahl").value;
      zustand.f1Wahl = wahl;
      zustand.f1 = wahl === "virtuell"
        ? "✓ Genau! Das am Gitter gebeugte Licht läuft unter dem Winkel θ ins Auge. Dein Sehsystem nimmt aber an, Licht komme geradlinig — also verortet es die Quelle dort, wo die Sichtlinie hinzeigt: seitlich neben der echten Lampe. Diese seitlichen Bilder sind virtuell."
        : wahl ? "✗ Nicht ganz: Es ist kein Reflex und das Licht „bleibt“ nirgends liegen. Überlege, wie dein Auge die Richtung deutet, aus der das gebeugte Licht kommt."
        : "Wähle zuerst eine Antwort.";
      panel.querySelector("#exp-frage1-status").textContent = zustand.f1;
    });
    panel.querySelector("#exp-frage2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-frage2-wahl").value;
      zustand.f2Wahl = wahl;
      zustand.f2 = wahl === "gleich"
        ? "✓ Richtig: λ ist eine Eigenschaft des Lichts und ändert sich nicht mit der Ordnung. In λ = g·sin θ/k wächst sin θ proportional zu k, das k im Nenner kürzt das wieder heraus — du erhältst (im Rahmen der Messgenauigkeit) denselben Wert. Kontrolliere das an deiner Tabelle!"
        : wahl ? "✗ Schau auf die Formel λ = g·sin θ/k: Zu k = 2 gehört ein größeres sin θ, aber auch das k im Nenner ist größer. Beide Effekte heben sich auf — λ bleibt gleich."
        : "Wähle zuerst eine Antwort.";
      panel.querySelector("#exp-frage2-status").textContent = zustand.f2;
    });
    if (zustand.f1Wahl) panel.querySelector("#exp-frage1-wahl").value = zustand.f1Wahl;
    if (zustand.f2Wahl) panel.querySelector("#exp-frage2-wahl").value = zustand.f2Wahl;

    panel.querySelector("#exp-csv").addEventListener("click", () =>
      csvHerunterladen("gitter-subjektiv-messreihe.csv",
        ["Quelle", "Gitter in Striche/mm", "k", "x in cm", "L in m", "lambda in nm"],
        zustand.messungen.map(z => [z.kurz, z.gitter, z.k, z.xCm, z.L, z.lambdaOk ? z.lambdaEintrag : ""])));

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechsle("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        quelle: QUELLEN[0], gitter: 300, lWahr: 0.5, lEintrag: null, vorhersage: "",
        auswahlK: 1, messungen: [], quelleGeloest: {}, frageFeedback: null,
        f1: null, f2: null, f1Wahl: "", f2Wahl: "", meldungMessen: "", meldungAuswerten: ""
      });
      zeichne();
      wechsle("aufbau");
    });
  }

  // ---------- Phasensteuerung ----------
  function wechslePhase(p) {
    zustand.phase = p;
    if (p === "aufbau") panelAufbau();
    if (p === "messen") panelMessen();
    if (p === "auswerten") panelAuswerten();
    zeichne();
  }

  // prefers-reduced-motion respektieren: das Experiment ist rein statisch
  // (keine laufende Animation); der Aufruf dokumentiert die bewusste
  // Entscheidung und bleibt erweiterbar.
  void reduzierteBewegung();

  zeichne();
  wechsle("aufbau");
}
