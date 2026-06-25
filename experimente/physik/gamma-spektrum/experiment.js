// experiment.js — Interaktives Experiment: γ-Spektrum mit dem Halbleiterdetektor (QP, gA/eA).
// Realitätsnahe Messpraxis statt fertiger Energien: Ein γ-Strahler wird mit einem
// Halbleiterdetektor + Vielkanalanalysator (MCA) gemessen. Auf der Kanalskala des
// Spektrums liest man die Lage der scharfen Photopeaks SELBST ab. Schritt 1:
// Kalibrierung mit bekannten Quellen (Cs-137, Co-60, Na-22) → Kalibriergerade
// K = m·E + b per linearer Regression. Schritt 2: unbekannte Quelle messen,
// Peak-Kanäle ablesen, in Energie umrechnen und das Nuklid identifizieren.
// Die Ablesestreuung ist pro Peak deterministisch geseedet (helfer.js) — dadurch
// laufen pruefFaelle und TESTS in Node analytisch nach. Modulebene DOM-frei.

import {
  streuung, parseDezimal, komma, mittel, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen, ablesungOk
} from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus / der Kalibrierung ----------
// Der Detektor ist linear: Kanalnummer K = m·E + b. Diese „wahren" Geraeteparameter
// kennt die Schule NICHT — sie werden aus den Kalibrierpeaks zurueckgewonnen.
export const M_KALIB = 1.30;          // Kanaele pro keV (Steigung der Kalibriergeraden)
export const B_KALIB = 20.0;          // Kanal-Offset (Nulllinien-Versatz)
export const KANAELE = 2048;          // Kanaele des Vielkanalanalysators (MCA) — 1461 keV → ca. 1920 Kanaele
export const PEAK_STREU_KANAL = 5;    // ±2,5 Kanaele Ablese-/Justagestreuung auf den Peak
export const KANAL_TOLERANZ = 6;      // akzeptierte Kanal-Ablesung: ±6 Kanaele
export const E_TOLERANZ_KEV = 15;     // Energie-Eingabe (unbekannte Peaks): ±15 keV
export const M_EINGABE_TOL = 0.06;    // Steigung der Kalibriergeraden: ±0,06 Kanaele/keV
export const MIN_KALIBPUNKTE = 3;     // mind. 3 bekannte Peaks fuer eine belastbare Gerade
export const MIN_UNBEKANNT = 2;       // mind. 2 Peaks der unbekannten Quelle ablesen

// ---------- Nuklid-Bibliothek (charakteristische γ-Energien in keV) ----------
// Quellen mit ihren bekannten Photopeak-Energien. Cs-137 / Co-60 / Na-22 sind die
// Kalibrierquellen; die unbekannte Probe ist eines dieser Nuklide (hier Na-22).
export const NUKLIDE = {
  "cs-137": { name: "Caesium-137", linien: [662] },
  "co-60":  { name: "Cobalt-60", linien: [1173, 1332] },
  "na-22":  { name: "Natrium-22", linien: [511, 1275] },  // 511 keV = Annihilation
  "k-40":   { name: "Kalium-40", linien: [1461] },
  "mn-54":  { name: "Mangan-54", linien: [835] }
};
// Auswahl fuer das Identifikations-Dropdown der unbekannten Quelle
export const ID_KANDIDATEN = ["cs-137", "co-60", "na-22", "k-40", "mn-54"];
export const UNBEKANNT_NUKLID = "na-22";   // Loesung der Identifikation (intern)

// ---------- Physik (rein, Node-testbar) ----------
// Energiekalibrierung: aus der bekannten Energie folgt der erwartete Kanal.
export function kanalAusEnergie(eKeV, m = M_KALIB, b = B_KALIB) {
  return m * eKeV + b;
}
// Umkehrung: aus einem abgelesenen Kanal (und der Kalibriergeraden) die Energie.
export function energieAusKanal(kanal, m, b) {
  return (m !== 0) ? (kanal - b) / m : NaN; // keV
}
// Wahre Peak-Lage im Spektrum inkl. reproduzierbarer Ablesestreuung.
export function peakKanalReal(eKeV) {
  return Math.round(kanalAusEnergie(eKeV) + streuung("peak:" + eKeV, PEAK_STREU_KANAL));
}
// Lineare Regression K(E): bestimmt m (Kanaele/keV) und b (Offset) aus Kalibrierpunkten {E, K}.
export function kalibrierung(punkte) {
  const n = punkte.length;
  if (n < 2) return { m: NaN, b: NaN };
  const sx = punkte.reduce((a, p) => a + p.E, 0);
  const sy = punkte.reduce((a, p) => a + p.K, 0);
  const sxx = punkte.reduce((a, p) => a + p.E * p.E, 0);
  const sxy = punkte.reduce((a, p) => a + p.E * p.K, 0);
  const nenner = n * sxx - sx * sx;
  if (nenner === 0) return { m: NaN, b: NaN };
  const m = (n * sxy - sx * sy) / nenner;
  return { m, b: (sy - m * sx) / n };
}
// Identifikation: zu einer gemessenen Energie das am besten passende Nuklid.
// Treffer, wenn jede Linie des Kandidaten nahe einer gemessenen Energie liegt
// UND alle gemessenen Peaks erklaert werden (innerhalb der Toleranz).
export function passtNuklid(energienKeV, schluessel, tol = E_TOLERANZ_KEV) {
  const lin = NUKLIDE[schluessel].linien;
  const jedeLinieGetroffen = lin.every(e => energienKeV.some(g => Math.abs(g - e) <= tol));
  const jederPeakErklaert = energienKeV.every(g => lin.some(e => Math.abs(g - e) <= tol));
  return jedeLinieGetroffen && jederPeakErklaert;
}

// ---------- Eingabe-Pruefungen ----------
export function kanalAblesungOk(eingabe, wahrerKanal) {
  return ablesungOk(eingabe, wahrerKanal, KANAL_TOLERANZ);
}
export function energieEingabeOk(eingabeKeV, wahrKeV) {
  return Number.isFinite(eingabeKeV) && Math.abs(eingabeKeV - wahrKeV) <= E_TOLERANZ_KEV;
}
export function steigungEingabeOk(eingabe, wahr) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - wahr) <= M_EINGABE_TOL;
}
export function bewertungSteigung(eingabe, wahr) {
  const abw = Math.abs(eingabe - wahr) / wahr * 100;
  if (abw <= 2) return { stufe: "sehr gut", abw };
  if (abw <= 5) return { stufe: "gut", abw };
  return { stufe: "nochmal pruefen", abw };
}
// Kalibrierung vollstaendig: mind. 3 bekannte Peaks, davon >= 2 verschiedene Energien.
export function kalibrierungVollstaendig(punkte) {
  return punkte.length >= MIN_KALIBPUNKTE
    && new Set(punkte.map(p => p.E)).size >= 2;
}

// ---------- Prueffaelle (analytisch nachgerechnet, unabhaengig ermittelt) ----------
export const pruefFaelle = [
  { art: "kanal", E: 662, soll: 1.30 * 662 + 20, tol: 1e-9 },         // Cs-137 → Kanal (880,6)
  { art: "kanal", E: 1332, soll: 1.30 * 1332 + 20, tol: 1e-9 },       // Co-60 obere Linie (1751,6)
  { art: "energie", K: 880.6, m: 1.30, b: 20, soll: 662, tol: 1e-6 }, // Rueckrechnung exakt
  { art: "id", energien: [511, 1275], nuklid: "na-22" }               // Identifikation Na-22
];

export const TESTS = [
  { name: "Kalibrier-Rueckrechnung exakt: E → K → E ergibt wieder E (alle Linien)",
    ok: () => [511, 662, 835, 1173, 1275, 1332, 1461].every(e =>
      Math.abs(energieAusKanal(kanalAusEnergie(e), M_KALIB, B_KALIB) - e) < 1e-9) },

  { name: "Kanal aus Energie: Cs-137 (662 keV) → 880,6 Kanaele exakt",
    ok: () => kanalAusEnergie(662) === 1.30 * 662 + 20
      && Math.abs(kanalAusEnergie(662) - 880.6) < 1e-9 },

  { name: "Energie aus Kanal: K = 880,6 mit (m=1,30; b=20) → 662 keV",
    ok: () => Math.abs(energieAusKanal(880.6, 1.30, 20) - 662) < 1e-6 },

  { name: "Regression rekonstruiert die wahren Geraeteparameter aus 3 perfekten Punkten",
    ok: () => { const p = [662, 1173, 1332].map(e => ({ E: e, K: kanalAusEnergie(e) }));
      const k = kalibrierung(p);
      return Math.abs(k.m - M_KALIB) < 1e-9 && Math.abs(k.b - B_KALIB) < 1e-9; } },

  { name: "Regression linear: zweiter Punktsatz liefert dieselbe Gerade (m, b)",
    ok: () => { const p = [511, 835, 1461].map(e => ({ E: e, K: kanalAusEnergie(e) }));
      const k = kalibrierung(p);
      return Math.abs(k.m - M_KALIB) < 1e-9 && Math.abs(k.b - B_KALIB) < 1e-9; } },

  { name: "Identifikation: Peaks {511; 1275} keV → Na-22 (und nichts anderes)",
    ok: () => passtNuklid([511, 1275], "na-22")
      && !passtNuklid([511, 1275], "co-60") && !passtNuklid([511, 1275], "cs-137")
      && !passtNuklid([511, 1275], "k-40") && !passtNuklid([511, 1275], "mn-54") },

  { name: "Identifikation: Co-60 (zwei dicht beieinander) sauber von Cs-137 getrennt",
    ok: () => passtNuklid([1173, 1332], "co-60") && !passtNuklid([1173, 1332], "cs-137")
      && passtNuklid([662], "cs-137") && !passtNuklid([662], "co-60") },

  { name: "Identifikation streng: ein einzelner 662er ist NICHT Na-22 (Linie 1275 fehlt)",
    ok: () => !passtNuklid([662], "na-22") && !passtNuklid([511], "na-22") },

  { name: "Peak-Streuung hoechstens ±2,5 Kanaele + deterministisch + im MCA-Bereich",
    ok: () => { let irgend = false;
      for (const e of [511, 662, 835, 1173, 1275, 1332, 1461]) {
        const abw = Math.abs(peakKanalReal(e) - kanalAusEnergie(e));
        if (abw > PEAK_STREU_KANAL / 2 + 0.5 + 1e-9) return false; // +0,5 wegen Rundung
        if (abw > 0) irgend = true;
        if (peakKanalReal(e) < 0 || peakKanalReal(e) > KANAELE) return false;
      }
      return irgend && peakKanalReal(662) === peakKanalReal(662)
        && peakKanalReal(662) !== peakKanalReal(1332); } },

  { name: "Kanal-Ablese-/Energie-Toleranzen: K ±6 Kanaele, E ±15 keV",
    ok: () => kanalAblesungOk(1300, 1299) && kanalAblesungOk(1305, 1299)
      && !kanalAblesungOk(1306, 1299) && !kanalAblesungOk(NaN, 1299)
      && energieEingabeOk(525, 511) && energieEingabeOk(497, 511)
      && !energieEingabeOk(527, 511) && !energieEingabeOk(NaN, 511) },

  { name: "Steigungs-Toleranz und Bewertung: 1,30 → sehr gut · 1,35 → gut · 1,45 → pruefen",
    ok: () => steigungEingabeOk(1.30, 1.30) && steigungEingabeOk(1.35, 1.30)
      && !steigungEingabeOk(1.37, 1.30)
      && bewertungSteigung(1.30, 1.30).stufe === "sehr gut"
      && bewertungSteigung(1.35, 1.30).stufe === "gut"
      && bewertungSteigung(1.45, 1.30).stufe === "nochmal pruefen" },

  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("1,30") === 1.30 && parseDezimal("1.30") === 1.30
      && Number.isNaN(parseDezimal("abc")) },

  { name: "Kalibrierung vollstaendig nur mit >= 3 Punkten und >= 2 verschiedenen Energien",
    ok: () => { const p = (E, K) => ({ E, K });
      const dreiGleich = [p(662, 1), p(662, 1), p(662, 1)];
      const zweiNurEine = [p(662, 881), p(1332, 1752)];
      const gut = [662, 1173, 1332].map(e => p(e, kanalAusEnergie(e)));
      return !kalibrierungVollstaendig(dreiGleich) && !kalibrierungVollstaendig(zweiNurEine)
        && !kalibrierungVollstaendig(gut.slice(0, 2)) && kalibrierungVollstaendig(gut); } },

  { name: "Prueffaelle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "kanal") return Math.abs(kanalAusEnergie(p.E) - p.soll) <= p.tol;
      if (p.art === "energie") return Math.abs(energieAusKanal(p.K, p.m, p.b) - p.soll) <= p.tol;
      return passtNuklid(p.energien, p.nuklid);
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Spektrum: Kanal auf x, Zaehlrate auf y) ----------
  const PLOT_X0 = 56, PLOT_X1 = 612;        // px-Rand des Plotbereichs (links/rechts)
  const PLOT_Y0 = 28, PLOT_Y1 = 300;        // px oben/unten
  const K_MAX_PLOT = 2048;                  // angezeigter Kanalbereich (0 … 2048 = ganzer MCA)
  const PEAK_SIGMA = 11;                     // Kanal-Breite der gezeichneten Photopeaks
  const xVonKanal = k => PLOT_X0 + (k / K_MAX_PLOT) * (PLOT_X1 - PLOT_X0);
  const kanalVonX = x => (x - PLOT_X0) / (PLOT_X1 - PLOT_X0) * K_MAX_PLOT;

  const zustand = {
    phase: "aufbau",
    quelle: "cs-137",                       // aktuell gemessene Quelle (Dropdown)
    cursorKanal: null,                      // letzte Mausposition ueber dem Plot (Kanal)
    vorhersage: "",                         // POE: "scharf" | "breit" | "konstant"
    kalib: [],                              // {schluessel, name, E, kanalWahr, kanalAbl}
    unbekannt: [],                          // {kanalWahr, kanalAbl, eEingabe, eOk}
    gerade: null,                           // {m, b} nach „Kalibriergerade bestimmen"
    mEingabe: null, mOk: null,              // Steigungs-Eingabe (eA)
    idWahl: "", idOk: null,                 // Nuklid-Identifikation
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    meldungMessen: "", meldungAuswerten: ""
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchfuehrung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="640" height="360" aria-label="Gamma-Spektrum des Vielkanalanalysators: waagerecht die Kanalnummer von 0 bis 2048, senkrecht die Zaehlrate. Ueber dem Untergrund erheben sich die scharfen Photopeaks des gewaehlten Nuklids. Wenn du mit der Maus ueber das Spektrum faehrst, zeigt eine Hilfslinie den Kanal an der Mausposition an; an einem Peak liest du seinen Kanal an der Skala unten ab."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  // Linien des aktuell gemessenen Nuklids mit ihrer wahren (gestreuten) Kanal-Lage
  const aktuelleLinien = () => {
    const schluessel = zustand.quelle === "unbekannt" ? UNBEKANNT_NUKLID : zustand.quelle;
    return NUKLIDE[schluessel].linien.map(e => ({ E: e, kanal: peakKanalReal(e) }));
  };

  // ---------- Zeichnung: Spektrum (Kanal-x, Zaehlrate-y) ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start"; ctx.lineWidth = 1;

    // Plotrahmen
    ctx.strokeStyle = cLeise;
    ctx.strokeRect(PLOT_X0, PLOT_Y0, PLOT_X1 - PLOT_X0, PLOT_Y1 - PLOT_Y0);

    // Kanal-Skala (x): Striche alle 200, Beschriftung alle 400
    ctx.fillStyle = cLeise; ctx.strokeStyle = cLeise; ctx.textAlign = "center";
    for (let k = 0; k <= K_MAX_PLOT; k += 200) {
      const x = xVonKanal(k), gross = k % 400 === 0;
      ctx.lineWidth = gross ? 1.4 : 0.8;
      ctx.beginPath(); ctx.moveTo(x, PLOT_Y1); ctx.lineTo(x, PLOT_Y1 + (gross ? 7 : 4)); ctx.stroke();
      if (gross) ctx.fillText(String(k), x, PLOT_Y1 + 20);
    }
    ctx.fillText("Kanalnummer K", (PLOT_X0 + PLOT_X1) / 2, PLOT_Y1 + 38);
    // Zaehlrate-Achse (y) — nur qualitativ beschriftet
    ctx.save(); ctx.translate(16, (PLOT_Y0 + PLOT_Y1) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("Zaehlrate (Impulse)", 0, 0); ctx.restore();

    // Spektrumskurve: konstanter Untergrund (Compton/Streuung) + Gauss-Photopeaks
    const linien = (zustand.phase === "aufbau") ? [] : aktuelleLinien();
    const skala = (PLOT_Y1 - PLOT_Y0);
    const untergrund = 0.10;
    const yVon = (rel) => PLOT_Y1 - Math.min(1, rel) * skala;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.beginPath();
    let ersterPunkt = true;
    for (let px = PLOT_X0; px <= PLOT_X1; px++) {
      const k = kanalVonX(px);
      // sanft abfallender Untergrund nach hohen Kanaelen
      let rel = untergrund * (1 - 0.45 * (k / K_MAX_PLOT));
      for (const L of linien) {
        const d = (k - L.kanal) / PEAK_SIGMA;
        rel += 0.85 * Math.exp(-0.5 * d * d);   // Photopeak (normiert auf ca. 0,85)
      }
      const y = yVon(rel);
      if (ersterPunkt) { ctx.moveTo(px, y); ersterPunkt = false; } else ctx.lineTo(px, y);
    }
    ctx.stroke();

    // Peak-Markierungen (gestrichelte Hilfslinie; die ENERGIE wird NICHT verraten)
    if (zustand.phase !== "aufbau") {
      ctx.setLineDash([3, 3]); ctx.strokeStyle = cText; ctx.lineWidth = 1; ctx.fillStyle = cText;
      ctx.textAlign = "center";
      for (const L of linien) {
        const x = xVonKanal(L.kanal);
        ctx.beginPath(); ctx.moveTo(x, PLOT_Y0); ctx.lineTo(x, PLOT_Y1); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // Maus-Hilfslinie mit Kanal-Anzeige (zum Ablesen)
    if (zustand.phase === "messen" && zustand.cursorKanal != null) {
      const x = xVonKanal(zustand.cursorKanal);
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1; ctx.setLineDash([2, 2]);
      ctx.beginPath(); ctx.moveTo(x, PLOT_Y0); ctx.lineTo(x, PLOT_Y1); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = cFlaeche; ctx.fillRect(x - 30, PLOT_Y0 - 2, 60, 16);
      ctx.fillStyle = cText; ctx.textAlign = "center";
      ctx.fillText("K ~ " + Math.round(zustand.cursorKanal), x, PLOT_Y0 + 10);
    }

    // Quellen-Etikett (welche Probe liegt vor dem Detektor)
    ctx.textAlign = "start"; ctx.fillStyle = cLeise;
    const etikett = zustand.phase === "aufbau"
      ? "Detektor bereit — Probe in der Durchfuehrung einlegen"
      : "Messprobe: " + (zustand.quelle === "unbekannt" ? "unbekannt" : NUKLIDE[zustand.quelle].name);
    ctx.fillText(etikett, PLOT_X0, 18);

    // Hinweis im Aufbau (kein Spektrum sichtbar)
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect((PLOT_X0 + PLOT_X1) / 2 - 130, 150, 260, 40);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Das Spektrum erscheint, sobald du", (PLOT_X0 + PLOT_X1) / 2, 168);
      ctx.fillText("in der Durchfuehrung eine Probe misst.", (PLOT_X0 + PLOT_X1) / 2, 184);
      ctx.textAlign = "start";
    }
  }

  // Maus-Tracking auf dem Canvas (nur in der Durchfuehrung relevant)
  canvas.addEventListener("mousemove", ev => {
    const r = canvas.getBoundingClientRect();
    const x = (ev.clientX - r.left) * (canvas.width / r.width);
    const k = kanalVonX(x);
    zustand.cursorKanal = (x >= PLOT_X0 && x <= PLOT_X1) ? Math.max(0, k) : null;
    if (zustand.phase === "messen") zeichne();
  });
  canvas.addEventListener("mouseleave", () => { zustand.cursorKanal = null; if (zustand.phase === "messen") zeichne(); });

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geraete</h2>
      <p>Eine radioaktive Probe sendet <strong>&gamma;-Quanten</strong> aus. Sie treffen auf einen <strong>Halbleiterdetektor</strong>: Jedes &gamma;-Quant erzeugt dort einen Spannungspuls, dessen <em>Hoehe proportional zur abgegebenen Energie</em> ist. Der <strong>Vielkanalanalysator (MCA)</strong> sortiert die Pulse nach ihrer Hoehe in ${KANAELE} <strong>Kanaele</strong> ein und zaehlt mit — so entsteht das <strong>&gamma;-Spektrum</strong>: waagerecht die Kanalnummer, senkrecht, wie oft ein Puls dieser Hoehe vorkam.</p>
      <p>Gibt ein &gamma;-Quant seine <em>ganze</em> Energie im Detektor ab, landet sein Puls immer in (fast) demselben Kanal. Viele solche Quanten haeufen sich dort zu einem scharfen <strong>Photopeak</strong>. Jedes Nuklid hat seine charakteristischen &gamma;-Energien — der „Fingerabdruck" im Spektrum.</p>
      <p><strong>Der Trick — Energiekalibrierung:</strong> Der Detektor ist linear, es gilt <strong>K = m&middot;E + b</strong> (Kanal aus Energie). m und b kennt man zunaechst nicht. Man misst deshalb <em>bekannte</em> Quellen (Cs-137: 662 keV; Co-60: 1173 und 1332 keV; Na-22: 511 und 1275 keV), liest ihre Peak-Kanaele ab und legt eine <strong>Kalibriergerade</strong> hindurch. Mit ihr rechnet man jeden Kanal in eine Energie um.</p>
      <p><strong>Plan:</strong> (1) bekannte Quellen messen, mindestens ${MIN_KALIBPUNKTE} Photopeak-Kanaele ablesen → Kalibriergerade. (2) die <em>unbekannte</em> Probe messen, ihre Peak-Kanaele ablesen, in Energie umrechnen und das Nuklid bestimmen.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdruecklich erlaubt:</p>
      <label for="exp-v">Eine Quelle mit <em>einer</em> festen &gamma;-Energie (z. B. Cs-137, 662 keV) erzeugt im Spektrum &hellip;</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte waehlen —</option>
        <option value="scharf">&hellip; einen scharfen Peak bei einer bestimmten Kanalnummer</option>
        <option value="breit">&hellip; einen ueber alle Kanaele gleichmaessig verteilten breiten Berg</option>
        <option value="konstant">&hellip; eine waagerechte Linie (ueberall gleich viele Impulse)</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchfuehrung</button>`;
    panel.querySelector("#exp-v").value = zustand.vorhersage;
    panel.querySelector("#exp-v").addEventListener("change", ev => { zustand.vorhersage = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Waehle zuerst deine Vorhersage aus — gleich pruefst du sie selbst am Spektrum.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchfuehrung ----------
  const wortVorhersage = w => w === "scharf" ? "ein scharfer Peak" : w === "breit" ? "ein breiter Berg" : "eine waagerechte Linie";

  function beobachtungHtml() {
    let html = `<p>Deine Vorhersage: <strong>${wortVorhersage(zustand.vorhersage)}</strong>. Schau dir das Spektrum an!</p>`;
    if (zustand.kalib.length >= 1 || zustand.unbekannt.length >= 1) {
      const ok = zustand.vorhersage === "scharf";
      html += `<p>${ok ? "&#10003;" : "&#10007;"} Beobachtet: <strong>scharfe Peaks</strong> an festen Kanalnummern — Quanten gleicher Energie landen im selben Kanal. ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt siehst du es im eigenen Spektrum."} (Der niedrige Sockel darunter ist der Compton-Untergrund.)</p>`;
    }
    return html;
  }

  function quellenOptionen() {
    const bekannt = ["cs-137", "co-60", "na-22"].map(s =>
      `<option value="${s}">${esc(NUKLIDE[s].name)} (Kalibrierquelle)</option>`).join("");
    return bekannt + `<option value="unbekannt">unbekannte Probe</option>`;
  }

  function panelMessen() {
    if (vorhersageFehlt()) {
      panel.innerHTML = `
        <h2>Durchfuehrung</h2>
        <p>Halte zuerst deine <strong>Vorhersage</strong> fest (Phase 1 &middot; Aufbau) — erst vorhersagen, dann messen!</p>
        <button class="knopf" id="exp-zurueck0">Zum Aufbau</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("aufbau"));
      return;
    }
    const istUnbekannt = zustand.quelle === "unbekannt";
    const linien = aktuelleLinien();
    const kalibVollst = kalibrierungVollstaendig(zustand.kalib);

    const tabelleKalib = `
      <h3>Tabelle 1 &middot; Kalibrierpeaks (bekannte Energien)</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Nuklid</th><th>E in keV</th><th>abgelesener Kanal K</th></tr></thead>
        <tbody>${zustand.kalib.map(z =>
          `<tr><td>${esc(NUKLIDE[z.schluessel].name)}</td><td>${z.E}</td><td>${z.kanalAbl}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>`;
    const tabelleUnbek = `
      <h3>Tabelle 2 &middot; Peaks der unbekannten Probe</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Peak</th><th>abgelesener Kanal K</th></tr></thead>
        <tbody>${zustand.unbekannt.map((z, i) =>
          `<tr><td>${i + 1}</td><td>${z.kanalAbl}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>`;

    // Auswahl, welcher Peak gerade abgelesen wird (bei mehreren Linien der Quelle)
    let peakWahlHtml = "";
    if (!istUnbekannt && linien.length > 1) {
      peakWahlHtml = `
        <label for="exp-peakwahl">Diese Quelle hat mehrere Peaks — welchen liest du gerade ab?</label>
        <select id="exp-peakwahl" class="exp-wahl">
          ${linien.map((L, i) => `<option value="${i}">Peak bei E = ${L.E} keV</option>`).join("")}
        </select>`;
    }

    const fortschritt = kalibVollst
      ? `Kalibrierung steht (${zustand.kalib.length} Peaks). Unbekannte Probe: ${zustand.unbekannt.length} von ${MIN_UNBEKANNT} Peaks.`
      : `Kalibrierung: ${zustand.kalib.length} von ${MIN_KALIBPUNKTE} bekannten Peaks (>= 2 verschiedene Energien).`;
    const fertig = kalibVollst && zustand.unbekannt.length >= MIN_UNBEKANNT;

    panel.innerHTML = `
      <h2>Durchfuehrung</h2>
      <p>Lege eine Probe vor den Detektor und lies im Spektrum die <strong>Kanalnummer</strong> jedes Photopeaks ab. Fahre dazu mit der Maus ueber den Peak — oben erscheint der Kanal an der Mausposition.</p>
      <div class="exp-regler">
        <label for="exp-quelle">Probe vor dem Detektor:</label>
        <select id="exp-quelle" class="exp-wahl">${quellenOptionen()}</select>
      </div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <p>${istUnbekannt
        ? "Die <strong>Energien</strong> dieser Peaks sind unbekannt — nur die Kanaele kannst du ablesen. Die Umrechnung folgt in der Auswertung."
        : `Diese Quelle hat ${linien.length === 1 ? "<strong>einen</strong> bekannten Peak" : "<strong>" + linien.length + "</strong> bekannte Peaks"}: ${linien.map(L => "E = " + L.E + " keV").join(" und ")}.`}</p>
      ${peakWahlHtml}
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies die Skala ab — Kanalnummer K des Peaks:</label>
        <input id="exp-wert" inputmode="numeric" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      ${tabelleKalib}
      ${tabelleUnbek}
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${fertig ? "" : " disabled"}>Zur Auswertung</button>`;

    const quelleSel = panel.querySelector("#exp-quelle");
    quelleSel.value = zustand.quelle;
    quelleSel.addEventListener("change", () => { zustand.quelle = quelleSel.value; zustand.meldungMessen = ""; panelMessen(); zeichne(); });

    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (istUnbekannt) {
        // welcher der unbekannten Peaks ist gemeint? → der naechste noch nicht abgelesene
        const linie = linien.find(L => !zustand.unbekannt.some(z => z.kanalWahr === L.kanal));
        if (!linie) {
          meldung.textContent = "Beide Peaks der unbekannten Probe hast du bereits abgelesen — weiter zur Auswertung.";
          return;
        }
        if (!kanalAblesungOk(eingabe, linie.kanal)) {
          meldung.textContent = "Schau noch einmal genau hin: Lies den Kanal beim hoechsten Punkt eines Peaks ab (auf wenige Kanaele genau). Es gibt zwei Peaks — lies sie nacheinander ab.";
          return;
        }
        zustand.unbekannt.push({ kanalWahr: linie.kanal, kanalAbl: Math.round(eingabe), eEingabe: null, eOk: null });
        zustand.meldungMessen = "Peak der unbekannten Probe eingetragen (Kanal " + Math.round(eingabe) + ").";
      } else {
        // welcher bekannte Peak ist gemeint?
        const idx = linien.length > 1 ? Number(panel.querySelector("#exp-peakwahl").value) : 0;
        const linie = linien[idx];
        if (zustand.kalib.some(z => z.schluessel === zustand.quelle && z.E === linie.E)) {
          meldung.textContent = "Diesen Peak hast du fuer diese Quelle schon abgelesen — waehle eine andere Quelle oder einen anderen Peak.";
          return;
        }
        if (!kanalAblesungOk(eingabe, linie.kanal)) {
          meldung.textContent = "Schau noch einmal genau hin: Der Peak bei E = " + linie.E + " keV liegt woanders. Lies den Kanal beim hoechsten Punkt ab (auf wenige Kanaele genau).";
          return;
        }
        zustand.kalib.push({ schluessel: zustand.quelle, name: NUKLIDE[zustand.quelle].name, E: linie.E, kanalWahr: linie.kanal, kanalAbl: Math.round(eingabe) });
        zustand.meldungMessen = "Kalibrierpeak eingetragen: " + linie.E + " keV bei Kanal " + Math.round(eingabe) + ".";
      }
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const kalibVollst = kalibrierungVollstaendig(zustand.kalib);
    if (!kalibVollst || zustand.unbekannt.length < MIN_UNBEKANNT) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafuer brauchst du eine vollstaendige Kalibrierung (>= ${MIN_KALIBPUNKTE} bekannte Peaks, >= 2 Energien) und >= ${MIN_UNBEKANNT} Peaks der unbekannten Probe.
        Bisher: ${zustand.kalib.length} Kalibrierpeaks, ${zustand.unbekannt.length} unbekannte Peaks.</p>
        <button class="knopf" id="exp-zurueck">Zurueck zur Durchfuehrung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    // wahre Kalibriergerade aus den abgelesenen Punkten (fuer Bewertung der Steigung)
    const gerWahr = kalibrierung(zustand.kalib.map(z => ({ E: z.E, K: z.kanalAbl })));
    // bestaetigte Gerade des Lernenden (nach „Kalibriergerade bestimmen")
    const ger = zustand.gerade;
    const energieFuer = z => ger ? energieAusKanal(z.kanalAbl, ger.m, ger.b) : NaN;

    const fertigE = zustand.unbekannt.every(z => z.eOk === true);
    const energienBest = fertigE ? zustand.unbekannt.map(z => z.eEingabe) : [];
    const mBew = (zustand.mOk && zustand.mEingabe != null) ? bewertungSteigung(zustand.mEingabe, gerWahr.m) : null;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <h3>Schritt 1 &middot; Kalibriergerade K = m&middot;E + b</h3>
      <p>Trage deine Kalibrierpunkte (E in keV, Kanal K) gedanklich in ein Diagramm und lege eine Gerade hindurch. Bestaetige die Gerade — das System bestimmt die Ausgleichsgerade aus deinen Punkten und nutzt sie zum Umrechnen.</p>
      <table class="exp-tabelle">
        <thead><tr><th>Nuklid</th><th>E in keV</th><th>Kanal K</th></tr></thead>
        <tbody>${zustand.kalib.map(z =>
          `<tr><td>${esc(NUKLIDE[z.schluessel].name)}</td><td>${z.E}</td><td>${z.kanalAbl}</td></tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-gerade">Kalibriergerade bestimmen</button></div>
      ${ger ? `<div class="exp-hinweis"><p>Deine Kalibriergerade: <strong>K = ${komma(ger.m, 3)} &middot; E + ${komma(ger.b, 1)}</strong> &nbsp; (m in Kanaele/keV). Damit rechnest du unten jeden Kanal in eine Energie um: E = (K &minus; b) / m.</p></div>` : ""}

      <details class="exp-fehler"><summary>Schritt 2 (eA) &middot; Steigung m selbst bestimmen und deuten</summary>
        <p>Bestimme die Steigung deiner Kalibriergeraden selbst (z. B. aus zwei weit auseinander liegenden Punkten: m = (K&#8322; &minus; K&#8321;)/(E&#8322; &minus; E&#8321;)) und gib sie in <strong>Kanaele/keV</strong> an.</p>
        <form id="exp-m-form" class="exp-ablesen">
          <label for="exp-m">m in Kanaele/keV:</label>
          <input id="exp-m" inputmode="decimal" autocomplete="off" size="7" value="${zustand.mEingabe == null ? "" : komma(zustand.mEingabe, 3)}">
          <button class="knopf zweitrangig">Pruefen</button>
        </form>
        <p id="exp-m-meldung" class="exp-meldung" aria-live="polite">${mBew ? "&#10003; m ~ " + komma(zustand.mEingabe, 3) + " Kanaele/keV — Abweichung " + komma(mBew.abw, 1) + " %: " + mBew.stufe + "." : ""}</p>
        <p>Die Steigung ist die <strong>Energieaufloesung des Systems in Kanaelen</strong>: Pro keV rueckt der Peak um m Kanaele weiter. Je groesser m, desto feiner trennt der MCA dicht benachbarte &gamma;-Linien (z. B. die beiden Co-60-Linien 1173 und 1332 keV).</p>
      </details>

      <h3>Schritt 3 &middot; Unbekannte Probe — Energien bestimmen</h3>
      <p>Rechne fuer jeden Peak der unbekannten Probe die Energie aus: <strong>E = (K &minus; b) / m</strong> mit deiner Kalibriergeraden${ger ? " (b = " + komma(ger.b, 1) + ", m = " + komma(ger.m, 3) + ")" : ""}. Trag das Ergebnis in <strong>keV</strong> ein.</p>
      ${ger ? "" : '<p class="exp-meldung">Bestimme zuerst oben die Kalibriergerade.</p>'}
      <table class="exp-tabelle">
        <thead><tr><th>Peak</th><th>Kanal K</th><th>E in keV (du)</th><th></th></tr></thead>
        <tbody>${zustand.unbekannt.map((z, i) => `<tr>
          <td>${i + 1}</td><td>${z.kanalAbl}</td>
          <td><input class="exp-eingabe" style="width:5.5em" data-idx="${i}" inputmode="decimal" autocomplete="off" ${ger ? "" : "disabled"} value="${z.eEingabe == null ? "" : komma(z.eEingabe, 0)}" aria-label="Deine Energie fuer Peak ${i + 1} in keV"></td>
          <td>${z.eOk === true ? "&#10003;" : z.eOk === false ? "&#10007;" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen"${ger ? "" : " disabled"}>Energien pruefen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>

      ${fertigE ? `
      <h3>Schritt 4 &middot; Nuklid identifizieren</h3>
      <p>Deine bestimmten &gamma;-Energien: <strong>${energienBest.map(e => komma(e, 0) + " keV").join(" und ")}</strong>. Welches Nuklid passt zu <em>genau diesem</em> Linienmuster?</p>
      <form id="exp-id-form" class="exp-ablesen">
        <label for="exp-id">Unbekannte Probe ist &hellip;</label>
        <select id="exp-id" class="exp-wahl">
          <option value="">— bitte waehlen —</option>
          ${ID_KANDIDATEN.map(s => `<option value="${s}">${esc(NUKLIDE[s].name)} (${NUKLIDE[s].linien.join(", ")} keV)</option>`).join("")}
        </select>
        <button class="knopf">Pruefen</button>
      </form>
      <p id="exp-id-meldung" class="exp-meldung" aria-live="polite">${esc(idFeedback())}</p>
      ${zustand.idOk ? `<div class="exp-hinweis"><p><strong>Identifiziert: ${esc(NUKLIDE[UNBEKANNT_NUKLID].name)}.</strong> Die 511-keV-Linie stammt aus der <em>Zerstrahlung</em> (Annihilation) von Positronen — ein Fingerabdruck der &beta;&#8314;-Strahler wie Na-22. Vom Detektorpuls bis zum Nuklid: gemessen, kalibriert, identifiziert.</p></div>` : ""}` : ""}

      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Warum misst man <strong>zuerst</strong> bekannte Quellen (Cs-137, Co-60, Na-22), bevor man die unbekannte Probe auswertet?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte waehlen —</option>
          <option value="kalib">Um die Zuordnung Kanal &harr; Energie (Kalibriergerade) erst herzustellen</option>
          <option value="aufwaermen">Damit sich der Detektor aufwaermt</option>
          <option value="vergleich">Weil unbekannte Proben nicht strahlen</option>
        </select>
        <button class="knopf zweitrangig">Pruefen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Warum ist die Beziehung <strong>K = m&middot;E + b</strong> eine <em>Gerade</em> und keine beliebige Kurve?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte waehlen —</option>
          <option value="proportional">Weil die Pulshoehe proportional zur Energie ist und der MCA linear einsortiert</option>
          <option value="zufall">Reiner Zufall der Messung</option>
          <option value="energieklein">Weil &gamma;-Energien immer klein sind</option>
        </select>
        <button class="knopf zweitrangig">Pruefen</button>
      </form>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite">${esc(f2Feedback())}</p>

      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man die Energien nie exakt?</summary>
        <p><strong>Energieaufloesung des Detektors:</strong> Ein Photopeak ist nie unendlich scharf, sondern hat eine endliche Breite (beim Halbleiterdetektor sehr schmal, beim Szintillator deutlich breiter). Den genauen Peak-Kanal muss man schaetzen — das ist die groesste Unsicherheit beim Ablesen.</p>
        <p><strong>Kalibrierung ueber den ganzen Bereich:</strong> Liegen alle Kalibrierpunkte dicht beieinander, ist die Gerade weit ausserhalb unsicher. Besser: Punkte ueber den ganzen Energiebereich verteilen (z. B. 511 keV und 1332 keV als Eckpunkte).</p>
        <p><strong>Compton-Untergrund:</strong> Quanten, die nur <em>einen Teil</em> ihrer Energie abgeben, fuellen den Bereich unterhalb des Photopeaks (das Compton-Kontinuum). Ein Peak auf hohem Untergrund ist schwerer genau abzulesen — deshalb laenger messen (mehr Impulse) oder den Untergrund abziehen.</p>
        <p><strong>Strategie dagegen:</strong> mehrere Kalibrierpeaks weit verteilt waehlen, am Peak-Maximum ablesen und lieber etwas laenger messen — genau das hast du getan.</p>
      </details>`;

    panel.querySelector("#exp-gerade").addEventListener("click", () => {
      zustand.gerade = kalibrierung(zustand.kalib.map(z => ({ E: z.E, K: z.kanalAbl })));
      // Energie-Eingaben zuruecksetzen (neue Gerade → neu pruefen)
      zustand.unbekannt.forEach(z => { z.eOk = null; });
      zustand.meldungAuswerten = "";
      panelAuswerten();
    });

    const pruefenBtn = panel.querySelector("#exp-pruefen");
    if (pruefenBtn) pruefenBtn.addEventListener("click", () => {
      if (!ger) return;
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.unbekannt[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.eEingabe = null; z.eOk = null; return; }
        z.eEingabe = wert;
        // korrekt ist die Umrechnung mit DER eigenen Geraden (nicht die wahre Energie)
        z.eOk = energieEingabeOk(wert, energieFuer(z));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fuelle zuerst alle Energien aus (in keV, z. B. 511).";
        panelAuswerten(); return;
      }
      const falsch = zustand.unbekannt.filter(z => !z.eOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "Beide Energien passen zur Umrechnung — jetzt das Nuklid identifizieren."
        : falsch + (falsch > 1 ? " Energien passen" : " Energie passt") + " noch nicht (±" + E_TOLERANZ_KEV + " keV). Rechne E = (K - b) / m konsequent mit deiner Geraden — Vorsicht beim Offset b!";
      if (falsch > 0) { zustand.idWahl = ""; zustand.idOk = null; }
      panelAuswerten();
    });

    const mForm = panel.querySelector("#exp-m-form");
    if (mForm) mForm.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-m").value);
      zustand.mEingabe = Number.isFinite(eingabe) ? eingabe : null;
      zustand.mOk = steigungEingabeOk(eingabe, gerWahr.m);
      if (!zustand.mOk) {
        panel.querySelector("#exp-m-meldung").textContent = "Das passt noch nicht (±" + komma(M_EINGABE_TOL, 2) + "). Nimm zwei weit auseinander liegende Kalibrierpunkte: m = (K2 - K1)/(E2 - E1).";
        return;
      }
      panelAuswerten();
    });

    const idForm = panel.querySelector("#exp-id-form");
    if (idForm) idForm.addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-id").value;
      zustand.idWahl = wahl;
      zustand.idOk = wahl ? passtNuklid(energienBest, wahl) : null;
      panelAuswerten();
    });
    if (zustand.idWahl) { const s = panel.querySelector("#exp-id"); if (s) s.value = zustand.idWahl; }

    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "kalib" };
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

    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = [];
      zustand.kalib.forEach(z => zeilen.push(["Kalibrierung", NUKLIDE[z.schluessel].name, String(z.E), String(z.kanalAbl), ""]));
      zustand.unbekannt.forEach((z, i) => zeilen.push(["unbekannt", "Peak " + (i + 1), z.eEingabe == null ? "" : z.eEingabe, String(z.kanalAbl), ""]));
      csvHerunterladen("gamma-spektrum-messreihe.csv",
        ["Phase", "Quelle/Peak", "E in keV", "Kanal K", "Bemerkung"], zeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        quelle: "cs-137", cursorKanal: null, vorhersage: "",
        kalib: [], unbekannt: [], gerade: null, mEingabe: null, mOk: null,
        idWahl: "", idOk: null,
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function idFeedback() {
    if (zustand.idOk === null || !zustand.idWahl) return "";
    return zustand.idOk
      ? "Richtig! Die beiden Linien (511 keV und 1275 keV) passen genau zum Linienmuster dieses Nuklids."
      : "Nicht ganz: Vergleiche deine beiden Energien mit den Gamma-Linien der Kandidaten. Es muss ein Nuklid sein, dessen Linien BEIDE deine Peaks erklaeren — eine 511-keV-Annihilationslinie ist ein starker Hinweis.";
  }
  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "Genau! Der MCA liefert nur Kanalnummern. Erst die Kalibriergerade aus bekannten Energien uebersetzt Kanaele in keV — ohne sie wuesstest du nicht, welche Energie zu welchem Kanal gehoert."
      : "Nicht ganz: Der Detektor waermt sich nicht auf, und unbekannte Proben strahlen sehr wohl. Es geht darum, den Zusammenhang Kanal/Energie ueberhaupt erst herzustellen.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "Richtig: Die Pulshoehe steigt proportional mit der deponierten Energie, und der MCA ordnet Pulshoehen linear in Kanaele ein. Proportional + linear ergibt die Gerade K = m*E + b."
      : "Schau auf das Detektorprinzip: Die Pulshoehe ist proportional zur Energie. Eine proportionale, linear einsortierte Groesse ergibt eine Gerade — kein Zufall, und auch nicht, weil Energien klein waeren.";
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
