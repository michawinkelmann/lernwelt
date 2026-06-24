// experiment.js — Interaktives Experiment: Spezifische Wärmekapazität (Klasse 9/10).
// Mischversuch und Kalorimeter in realitätsnaher Messpraxis: erst Wasser + Wasser
// als Methoden-Check, dann heiße Metallproben ins kalte Wasser — Waage und
// Thermometer-Lupe werden SELBST abgelesen und protokolliert. Aus der Energie-
// bilanz Q_ab = Q_auf folgt c_M, und damit fliegt Probe X auf. Alle Streuungen
// sind deterministisch geseedet; die TESTS laufen DOM-frei in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  bauePhasen, csvHerunterladen, farbe, reduzierteBewegung
} from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten und Versuchsplan (Modulebene, Node-testbar) ----------
export const C_WASSER = 4.18; // J/(g·K) — Tabellenwert, wird den Lernenden gegeben

// Fünf Mischungen: ein Methoden-Check (Wasser + Wasser) und vier Metallproben.
// c in J/(g·K); Probe X ist Blei (c = 0,129) — das UI verrät das natürlich nicht.
// Kontroll-Mischtemperaturen (exakt nachgerechnet): Wasser+Wasser 40,00 °C ·
// Aluminium 31,12 °C · Eisen 25,98 °C · Kupfer 25,23 °C · Blei 21,81 °C.
export const MISCHUNGEN = [
  { id: "wasser", name: "Wasser + Wasser (Methoden-Check)", kurzz: "W", typ: "wasser",
    mKalt: 200, tKalt: 20, mZweit: 100, tZweit: 80, c: C_WASSER },
  { id: "alu", name: "Aluminium-Probe", kurzz: "Al", typ: "metall", stoff: "Aluminium",
    mKalt: 200, tKalt: 20, mZweit: 150, tZweit: 100, c: 0.90 },
  { id: "eisen", name: "Eisen-Probe", kurzz: "Fe", typ: "metall", stoff: "Eisen",
    mKalt: 200, tKalt: 20, mZweit: 150, tZweit: 100, c: 0.45 },
  { id: "kupfer", name: "Kupfer-Probe", kurzz: "Cu", typ: "metall", stoff: "Kupfer",
    mKalt: 200, tKalt: 20, mZweit: 150, tZweit: 100, c: 0.39 },
  { id: "x", name: "Probe X (unbekannt)", kurzz: "X", typ: "metall", stoff: "Blei", geheim: true,
    mKalt: 200, tKalt: 20, mZweit: 150, tZweit: 100, c: 0.129 }
];
export const mischungVon = id => MISCHUNGEN.find(m => m.id === id);

// Tabellenwerte fürs Vergleichen und Identifizieren (gerundet, wie im Tafelwerk)
export const TABELLENWERTE = [
  { stoff: "Aluminium", c: 0.90 },
  { stoff: "Eisen", c: 0.45 },
  { stoff: "Kupfer", c: 0.39 },
  { stoff: "Blei", c: 0.13 }
];

// Streu-Spannen (volle Breite, deterministisch) und Eintrag-Toleranzen
export const STREU_MASSE = 0.4;  // Waage zeigt bis ±0,2 g neben dem Sollwert
export const STREU_TEMP = 0.4;   // Anfangstemperaturen: bis ±0,2 °C
export const STREU_MISCH = 0.3;  // Mischtemperatur-Anzeige: bis ±0,15 °C
export const TOL_MASSE = 0.3;    // g — so genau muss der Protokoll-Eintrag sein
export const TOL_TEMP = 0.3;     // °C (Anfangstemperaturen)
export const TOL_MISCH = 0.25;   // °C (Mischtemperatur)
export const TOL_C = 0.05;       // J/(g·K) für die berechnete Wärmekapazität

// Energiebilanz: T_m = (m1·c1·T1 + m2·c2·T2) / (m1·c1 + m2·c2)
export function mischTemperatur(m1, c1, T1, m2, c2, T2) {
  return (m1 * c1 * T1 + m2 * c2 * T2) / (m1 * c1 + m2 * c2);
}
export function tmNominal(m) {
  return mischTemperatur(m.mKalt, C_WASSER, m.tKalt, m.mZweit, m.c, m.tZweit);
}
// abgegebene bzw. aufgenommene Wärme — für Bilanz-Tests und Auswertungstexte
export function qAb(m2, c2, T2, Tm) { return m2 * c2 * (T2 - Tm); }
export function qAuf(m1, c1, T1, Tm) { return m1 * c1 * (Tm - T1); }

// Bilanz nach c_M umgestellt (Auswertung der Metallproben)
export function cAusMessung(mw, Tw, mM, TM, Tm) {
  const nenner = mM * (TM - Tm);
  return nenner > 0 ? (mw * C_WASSER * (Tm - Tw)) / nenner : NaN;
}
export function cEingabeOk(eingabe, soll) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - soll) <= TOL_C;
}
// Probe identifizieren: der nächstliegende Tabellenwert gewinnt
export function identifiziere(cWert) {
  return TABELLENWERTE.reduce((best, t) =>
    Math.abs(t.c - cWert) < Math.abs(best.c - cWert) ? t : best);
}

// ---------- deterministische „wahre" Werte je Mischung ----------
export function wahreWerte(m) {
  return {
    mw: m.mKalt + streuung("waage:" + m.id + ":kalt", STREU_MASSE),
    Tw: m.tKalt + streuung("therm:" + m.id + ":kalt", STREU_TEMP),
    m2: m.mZweit + streuung("waage:" + m.id + ":zweit", STREU_MASSE),
    T2: m.tZweit + streuung("therm:" + m.id + ":zweit", STREU_TEMP)
  };
}
export function tmWahr(m) {
  const w = wahreWerte(m);
  return mischTemperatur(w.mw, C_WASSER, w.Tw, w.m2, m.c, w.T2);
}
export function tmAnzeige(m) {
  return tmWahr(m) + streuung("therm:" + m.id + ":misch", STREU_MISCH);
}

// ---------- Prüffälle + TESTS (Modulebene DOM-frei) ----------
export const pruefFaelle = [
  { id: "wasser", soll: 40.00, toleranz: 0.02 },
  { id: "alu",    soll: 31.12, toleranz: 0.02 },
  { id: "eisen",  soll: 25.98, toleranz: 0.02 },
  { id: "kupfer", soll: 25.23, toleranz: 0.02 },
  { id: "x",      soll: 21.81, toleranz: 0.02 }
];

export const TESTS = [
  { name: "Methoden-Check: 200 g/20,0 °C + 100 g/80,0 °C → exakt 40,0 °C",
    ok: () => Math.abs(tmNominal(mischungVon("wasser")) - 40) < 1e-9 },
  { name: "Kontrollwert Aluminium: T_m = 31,12 °C (±0,02)",
    ok: () => Math.abs(tmNominal(mischungVon("alu")) - 31.12) <= 0.02 },
  { name: "Kontrollwert Eisen: T_m = 25,98 °C (±0,02)",
    ok: () => Math.abs(tmNominal(mischungVon("eisen")) - 25.98) <= 0.02 },
  { name: "Kontrollwert Kupfer: T_m = 25,23 °C (±0,02)",
    ok: () => Math.abs(tmNominal(mischungVon("kupfer")) - 25.23) <= 0.02 },
  { name: "Kontrollwert Probe X (Blei): T_m = 21,81 °C (±0,02)",
    ok: () => Math.abs(tmNominal(mischungVon("x")) - 21.81) <= 0.02 },
  { name: "Gewichtetes Mittel: T_m liegt stets zwischen T_kalt und T_heiß, bei 200 g + 100 g nicht in der Mitte",
    ok: () => MISCHUNGEN.every(m => { const t = tmNominal(m); return t > m.tKalt && t < m.tZweit; }) &&
              Math.abs(tmNominal(mischungVon("wasser")) - 50) > 9 },
  { name: "c-Pipeline invertiert exakt: perfekte Messwerte → Tabellen-c (1e-9)",
    ok: () => MISCHUNGEN.filter(m => m.typ === "metall").every(m =>
      Math.abs(cAusMessung(m.mKalt, m.tKalt, m.mZweit, m.tZweit, tmNominal(m)) - m.c) < 1e-9) },
  { name: "Streugrenzen: Waage ±0,2 g, Thermometer ±0,2 °C, Mischablesung ±0,15 °C — deterministisch",
    ok: () => MISCHUNGEN.every(m => { const w = wahreWerte(m);
      return Math.abs(w.mw - m.mKalt) <= 0.2 + 1e-12 && Math.abs(w.m2 - m.mZweit) <= 0.2 + 1e-12 &&
             Math.abs(w.Tw - m.tKalt) <= 0.2 + 1e-12 && Math.abs(w.T2 - m.tZweit) <= 0.2 + 1e-12 &&
             Math.abs(tmAnzeige(m) - tmWahr(m)) <= 0.15 + 1e-12 && tmAnzeige(m) === tmAnzeige(m); }) },
  { name: "Energieerhaltung: Q_ab = Q_auf bei der exakten Mischtemperatur (alle 5 Mischungen)",
    ok: () => MISCHUNGEN.every(m => { const t = tmNominal(m);
      return Math.abs(qAb(m.mZweit, m.c, m.tZweit, t) - qAuf(m.mKalt, C_WASSER, m.tKalt, t)) < 1e-8; }) },
  { name: "Identifikation eindeutig: Probe X → Blei (auch ±0,05 daneben); Eisen/Kupfer treffen ihre Werte",
    ok: () => identifiziere(0.129).stoff === "Blei" && identifiziere(0.179).stoff === "Blei" &&
              identifiziere(0.079).stoff === "Blei" &&
              identifiziere(cAusMessung(200, 20, 150, 100, tmNominal(mischungVon("x")))).stoff === "Blei" &&
              identifiziere(0.45).stoff === "Eisen" && identifiziere(0.39).stoff === "Kupfer" },
  { name: "parseDezimal (Komma/Punkt) und Eintrag-Toleranzen (Masse 0,3 · Temp 0,3 · Mischung 0,25 · c 0,05)",
    ok: () => parseDezimal("21,8") === 21.8 && parseDezimal("21.8") === 21.8 && Number.isNaN(parseDezimal("warm")) &&
              ablesungOk(200.2, 200.0, TOL_MASSE) && !ablesungOk(200.4, 200.0, TOL_MASSE) &&
              ablesungOk(25.0, 25.23, TOL_MISCH) && !ablesungOk(24.9, 25.23, TOL_MISCH) &&
              cEingabeOk(0.42, 0.39) && !cEingabeOk(0.45, 0.39) && !cEingabeOk(NaN, 0.39) },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => Math.abs(tmNominal(mischungVon(p.id)) - p.soll) <= p.toleranz) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  // je Mischung: schritt 0–5 (m_w wiegen, T_w, m2 wiegen, T2, mischen, T_m), 6 = fertig
  const zustand = {
    aktuell: "wasser",
    phase: "aufbau",
    animLaeuft: false,
    daten: Object.fromEntries(MISCHUNGEN.map(m => [m.id, { schritt: 0, werte: {} }]))
  };

  const wechsle = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], wechslePhase);

  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="640" aria-label="Versuchsaufbau: oben links eine digitale Waage, oben rechts eine Lupe auf die Thermometerskala mit Zehntelgrad-Strichen. Unten links ein ideales Kalorimeter mit Deckel, Rührer und Thermometer, unten rechts ein Becher mit heißem Wasser beziehungsweise ein siedendes Wasserbad mit der Metallprobe."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);

  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const aktuelle = () => mischungVon(zustand.aktuell);
  const datenVon = m => zustand.daten[m.id];
  const fertig = m => datenVon(m).schritt >= 6;
  const anzahlFertig = () => MISCHUNGEN.filter(fertig).length;
  // Auswertung möglich ab: Methoden-Check + Probe X + mindestens eine weitere Metallprobe
  const auswertbar = () => fertig(mischungVon("wasser")) && fertig(mischungVon("x")) &&
    MISCHUNGEN.filter(m => m.typ === "metall" && fertig(m)).length >= 2;

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b3332a"),
          cFlaeche = farbe("--flaeche");
    const m = aktuelle(), d = datenVon(m), wahr = wahreWerte(m);
    const wasserDrin = d.schritt >= 1, gemischt = d.schritt >= 5;
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif";

    // digitale Waage (oben links) — zeigt nur in den Wiege-Schritten einen Wert
    let waageWert = null, waageLast = "";
    if (d.schritt === 0) { waageWert = wahr.mw; waageLast = "Becher mit kaltem Wasser"; }
    if (d.schritt === 2) {
      waageWert = wahr.m2;
      waageLast = m.typ === "wasser" ? "Becher mit heißem Wasser" : "Probe " + m.kurzz + " (trocken)";
    }
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(20, 46, 150, 66); ctx.strokeRect(20, 46, 150, 66);
    ctx.fillStyle = cLeise; ctx.fillText("digitale Waage · g", 30, 64);
    ctx.fillStyle = cText; ctx.font = "bold 26px Consolas, monospace";
    ctx.fillText(waageWert === null ? "0,0" : komma(waageWert, 1), 30, 98);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = cLeise; ctx.fillText(waageLast || "(Waage leer, tariert)", 22, 130);

    // Thermometer-Lupe (oben rechts): Fenster ±3 °C, kleine Striche = 0,1 °C
    let lupeT = null, lupeOrt = "Kalorimeter";
    if (d.schritt === 3) { lupeT = wahr.T2; lupeOrt = m.typ === "wasser" ? "heißer Becher" : "Wasserbad"; }
    else if (gemischt) { lupeT = tmAnzeige(m); }
    else if (wasserDrin) { lupeT = wahr.Tw; }
    const L = { x: 208, y: 46, b: 134, h: 258 };
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(L.x, L.y, L.b, L.h); ctx.strokeRect(L.x, L.y, L.b, L.h);
    ctx.fillStyle = cLeise; ctx.fillText("Lupe: Thermometer", L.x + 8, L.y - 8);
    if (lupeT === null) {
      ctx.fillStyle = cLeise; ctx.fillText("— noch leer —", L.x + 28, L.y + L.h / 2);
    } else {
      const mitte = Math.round(lupeT);
      const unten = L.y + L.h - 20, obenY = L.y + 18;
      const proGrad = (unten - obenY) / 6;
      const yVon = t => unten - (t - (mitte - 3)) * proGrad;
      // rote Säule samt angedeuteter Kapillare
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
      ctx.strokeRect(L.x + 24, obenY - 6, 13, unten - obenY + 16);
      ctx.fillStyle = cFehler;
      const ySpitze = yVon(Math.max(mitte - 3, Math.min(mitte + 3, lupeT)));
      ctx.fillRect(L.x + 26, ySpitze, 9, unten - ySpitze + 8);
      // Skala: 0,1er kurz, 0,5er mittel, ganze Grad lang + Zahl
      for (let i = 0; i <= 60; i++) {
        const t = mitte - 3 + i * 0.1, y = yVon(t);
        const ganz = i % 10 === 0, halb = i % 5 === 0;
        ctx.strokeStyle = ganz ? cText : cLeise; ctx.lineWidth = ganz ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(L.x + 44, y);
        ctx.lineTo(L.x + 44 + (ganz ? 22 : (halb ? 15 : 9)), y); ctx.stroke();
        if (ganz) { ctx.fillStyle = cText; ctx.fillText(komma(t, 0), L.x + 72, y + 4); }
      }
      ctx.fillStyle = cText; ctx.fillText("°C", L.x + 100, L.y + 18);
      ctx.fillStyle = cLeise; ctx.fillText("zeigt: " + lupeOrt, L.x + 8, L.y + L.h + 16);
    }

    // Kalorimeter (unten links): doppelwandig, Deckel, Rührer, Thermometer
    const K = { x: 30, y: 420, b: 136, h: 180 };
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.strokeRect(K.x, K.y, K.b, K.h);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.strokeRect(K.x + 8, K.y + 8, K.b - 16, K.h - 12);
    if (wasserDrin) {
      const voll = (m.typ === "wasser" && gemischt) ? 96 : 70; // 300 g bzw. 200 g
      ctx.globalAlpha = 0.16; ctx.fillStyle = cAkzent;
      ctx.fillRect(K.x + 10, K.y + K.h - 14 - voll, K.b - 20, voll);
      ctx.globalAlpha = 0.6; ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(K.x + 10, K.y + K.h - 14 - voll);
      ctx.lineTo(K.x + K.b - 10, K.y + K.h - 14 - voll); ctx.stroke();
      ctx.globalAlpha = 1;
    }
    if (gemischt && m.typ === "metall") {
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.fillRect(K.x + 56, K.y + K.h - 46, 26, 30); ctx.strokeRect(K.x + 56, K.y + K.h - 46, 26, 30);
      ctx.fillStyle = cText; ctx.textAlign = "center";
      ctx.fillText(m.kurzz, K.x + 69, K.y + K.h - 26); ctx.textAlign = "start";
    }
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(K.x - 6, K.y - 14, K.b + 12, 14); ctx.strokeRect(K.x - 6, K.y - 14, K.b + 12, 14);
    ctx.strokeStyle = cFehler; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(K.x + 96, K.y - 36); ctx.lineTo(K.x + 96, K.y + 110); ctx.stroke();
    ctx.fillStyle = cFehler; ctx.beginPath(); ctx.arc(K.x + 96, K.y + 114, 5, 0, 7); ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(K.x + 36, K.y - 26); ctx.lineTo(K.x + 36, K.y + 130);
    ctx.moveTo(K.x + 22, K.y + 130); ctx.lineTo(K.x + 50, K.y + 130);
    ctx.moveTo(K.x + 26, K.y - 26); ctx.lineTo(K.x + 46, K.y - 26); ctx.stroke();
    ctx.fillStyle = cText; ctx.fillText("Kalorimeter (ideal)", K.x + 8, K.y + K.h + 22);

    // heiße Seite (unten rechts): Becher mit heißem Wasser bzw. siedendes Wasserbad
    const B = { x: 222, y: 440, b: 112, h: 150 };
    const heissVoll = m.typ === "metall" || !gemischt; // Wasserbad bleibt, heißes Wasser wird umgefüllt
    if (m.typ === "metall") {
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.fillRect(B.x - 6, B.y + B.h + 4, B.b + 12, 14);
      ctx.strokeRect(B.x - 6, B.y + B.h + 4, B.b + 12, 14);
      ctx.strokeStyle = cFehler; ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        ctx.beginPath(); ctx.moveTo(B.x + 2, B.y + B.h + 8 + i * 5);
        ctx.lineTo(B.x + B.b - 2, B.y + B.h + 8 + i * 5); ctx.stroke();
      }
    }
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(B.x, B.y); ctx.lineTo(B.x, B.y + B.h);
    ctx.lineTo(B.x + B.b, B.y + B.h); ctx.lineTo(B.x + B.b, B.y); ctx.stroke();
    if (heissVoll) {
      ctx.globalAlpha = 0.16; ctx.fillStyle = cFehler;
      ctx.fillRect(B.x + 2, B.y + 36, B.b - 4, B.h - 38);
      ctx.globalAlpha = 0.7; ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
      for (const x0 of [B.x + 30, B.x + 72]) {       // Dampf-Schnörkel
        ctx.beginPath();
        for (let yy = B.y + 26; yy >= B.y - 22; yy -= 5) {
          const x = x0 + Math.sin(yy / 9) * 5;
          if (yy === B.y + 26) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Probe hängt erst nach dem Wiegen im Wasserbad (Schritt 3 und 4)
    if (m.typ === "metall" && d.schritt >= 3 && !gemischt && !zustand.animLaeuft) {
      ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(B.x + 56, B.y - 6); ctx.lineTo(B.x + 56, B.y + 70); ctx.stroke();
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.fillRect(B.x + 43, B.y + 70, 26, 30); ctx.strokeRect(B.x + 43, B.y + 70, 26, 30);
      ctx.fillStyle = cText; ctx.textAlign = "center";
      ctx.fillText(m.kurzz, B.x + 56, B.y + 90); ctx.textAlign = "start";
    }
    ctx.fillStyle = cText;
    ctx.fillText(m.typ === "metall" ? "Wasserbad (siedet)" : (heissVoll ? "heißes Wasser" : "Becher (leer)"),
      B.x - 2, B.y + B.h + (m.typ === "metall" ? 36 : 22));
  }

  // Misch-Animation: Probe bzw. Wasserschwall wandert ins Kalorimeter
  function mischAnimation(beiEnde) {
    if (reduziert) { beiEnde(); return; }
    zustand.animLaeuft = true;
    const start = performance.now(), dauer = 750;
    const m = aktuelle();
    const vonX = 278, vonY = 500, nachX = 98, nachY = 410, hochY = 330;
    function schritt() {
      const t = Math.min(1, (performance.now() - start) / dauer);
      zeichne();
      const u = 1 - t;                                  // Bahn: quadratische Bézier-Kurve
      const x = u * u * vonX + 2 * u * t * ((vonX + nachX) / 2) + t * t * nachX;
      const y = u * u * vonY + 2 * u * t * hochY + t * t * nachY;
      const cText = farbe("--text"), cFlaeche = farbe("--flaeche"), cFehler = farbe("--fehler", "#b3332a");
      if (m.typ === "metall") {
        ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
        ctx.fillRect(x - 13, y - 15, 26, 30); ctx.strokeRect(x - 13, y - 15, 26, 30);
        ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(m.kurzz, x, y + 5); ctx.textAlign = "start";
      } else {
        ctx.fillStyle = cFehler; ctx.globalAlpha = 0.55;
        ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.arc(x + 10, y + 12, 6, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      }
      if (t < 1) requestAnimationFrame(schritt);
      else { zustand.animLaeuft = false; beiEnde(); }
    }
    requestAnimationFrame(schritt);
  }

  // ---------- Schritt-Texte und -Prüfungen ----------
  function schrittLabel(m, s) {
    const w2 = m.typ === "wasser";
    return [
      `Wiege das kalte Wasser ab und fülle es ins Kalorimeter (Soll: ${m.mKalt} g). Anzeige der Waage — m<sub>w</sub> in g:`,
      `Lies die Lupe ab: Temperatur im Kalorimeter — T<sub>w</sub> in °C:`,
      w2 ? `Wiege das heiße Wasser im Becher (Soll: ${m.mZweit} g). Anzeige der Waage — m<sub>2</sub> in g:`
         : `Wiege die noch kalte, trockene Probe ${esc(m.kurzz)}, bevor sie ins Wasserbad kommt (Soll: ${m.mZweit} g). Anzeige — m<sub>M</sub> in g:`,
      w2 ? `Lies die Lupe ab: Temperatur des heißen Wassers — T<sub>2</sub> in °C:`
         : `Die Probe hängt jetzt im siedenden Wasserbad und hat dessen Temperatur übernommen. Lies die Lupe ab — T<sub>M</sub> in °C:`,
      ``,
      `Gemischt und gerührt — lies die Lupe ab: Mischtemperatur T<sub>m</sub> in °C (auf Viertelgrad genau!):`
    ][s];
  }
  function schrittPruefung(m, s) {
    const wahr = wahreWerte(m), f = "✗ Schau noch einmal genau hin: ";
    return [
      { key: "mw", wahr: wahr.mw, tol: TOL_MASSE, fehler: f + "Was zeigt die Waage an? (Auf 0,1 g genau eintragen.)" },
      { key: "Tw", wahr: wahr.Tw, tol: TOL_TEMP, fehler: f + "Wo endet die rote Säule in der Lupe? (Kleine Striche = 0,1 °C.)" },
      { key: "m2", wahr: wahr.m2, tol: TOL_MASSE, fehler: f + "Was zeigt die Waage an? (Auf 0,1 g genau eintragen.)" },
      { key: "T2", wahr: wahr.T2, tol: TOL_TEMP, fehler: f + "Wo endet die rote Säule in der Lupe? (Kleine Striche = 0,1 °C.)" },
      null,
      { key: "Tm", wahr: tmAnzeige(m), tol: TOL_MISCH, fehler: f + "Die Mischtemperatur steht in der Lupe — hier zählt jedes Viertelgrad!" }
    ][s];
  }

  function protokollTabelle() {
    const zeile = m => {
      const v = datenVon(m).werte;
      const z = (x, n) => x === undefined ? "–" : komma(x, n);
      return `<tr><td>${esc(m.name.replace(" (Methoden-Check)", ""))}</td>
        <td>${z(v.mw, 1)}</td><td>${z(v.Tw, 1)}</td><td>${z(v.m2, 1)}</td><td>${z(v.T2, 1)}</td><td>${z(v.Tm, 2)}</td></tr>`;
    };
    const mitDaten = MISCHUNGEN.filter(m => Object.keys(datenVon(m).werte).length);
    return `<table class="exp-tabelle"><thead><tr><th>Mischung</th><th>m<sub>w</sub> in g</th><th>T<sub>w</sub> in °C</th><th>m<sub>2</sub>/m<sub>M</sub> in g</th><th>T<sub>2</sub>/T<sub>M</sub> in °C</th><th>T<sub>m</sub> in °C</th></tr></thead>
      <tbody>${mitDaten.map(zeile).join("") || '<tr><td colspan="6">noch leer</td></tr>'}</tbody></table>`;
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Links steht ein <strong>Kalorimeter</strong> — ein doppelwandiges, isoliertes Gefäß mit Deckel, Rührer und Thermometer. Rechts warten ein Becher mit <strong>heißem Wasser</strong> bzw. ein siedendes <strong>Wasserbad</strong> mit Metallproben zu je 150 g: Aluminium, Eisen, Kupfer — und die unbekannte <strong>Probe X</strong>. Dazu: eine <strong>digitale Waage</strong> und eine <strong>Lupe</strong>, mit der du die Thermometerskala auf 0,1 °C genau ablesen kannst.</p>
      <p><strong>Gegeben (Tabellenwert):</strong> Wasser hat die spezifische Wärmekapazität c<sub>w</sub> = 4,18 J/(g·K) — es braucht 4,18 J, um 1 g Wasser um 1 °C zu erwärmen.</p>
      <p><strong>Plan:</strong> Teil 1 ist der Methoden-Check: kaltes und heißes Wasser mischen und prüfen, ob die Mischtemperatur zur Energiebilanz Q<sub>ab</sub> = Q<sub>auf</sub> passt. In Teil 2 tauchst du 100 °C heiße Metallproben ins kalte Wasser und bestimmst aus T<sub>m</sub> ihre Wärmekapazität c<sub>M</sub> — bis Probe X enttarnt ist.</p>
      <p class="exp-hinweis">Vorhersage — erst festlegen, dann messen: 200 g Wasser mit 20,0 °C plus 100 g Wasser mit 80,0 °C. Landet die Mischung bei 50 °C? Darüber? Darunter?</p>
      <p><strong>Vereinfachung, ehrlich benannt:</strong> Unser Kalorimeter ist <em>ideal</em> — es gibt keine Wärme an Gefäß oder Umgebung ab. Echte Kalorimeter tun genau das; was das für die Messwerte bedeutet, diskutieren wir in der Auswertung.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechsle("messen"));
  }

  function panelMessen() {
    const m = aktuelle(), d = datenVon(m);
    const chips = MISCHUNGEN.map(x =>
      `<button class="knopf zweitrangig" data-mischung="${x.id}" aria-pressed="${x.id === m.id}" ${zustand.animLaeuft ? "disabled" : ""}>${fertig(x) ? "✓ " : ""}${esc(x.name.replace(" (Methoden-Check)", ""))}</button>`).join("");
    let aktion;
    if (d.schritt === 4) {
      aktion = `<p>${m.typ === "wasser"
        ? "Alles protokolliert? Dann gieß das heiße Wasser zügig ins Kalorimeter, Deckel drauf, umrühren."
        : "Alles protokolliert? Dann setz die heiße Probe zügig ins Kalorimeter um (im echten Versuch: kurz abtropfen lassen!), Deckel drauf, umrühren."}</p>
      <button class="knopf" id="exp-mischen" ${zustand.animLaeuft ? "disabled" : ""}>${zustand.animLaeuft ? "… es rührt …" : (m.typ === "wasser" ? "Umfüllen und rühren" : "Probe einsetzen und rühren")}</button>`;
    } else if (d.schritt >= 6) {
      const naechste = MISCHUNGEN.find(x => !fertig(x));
      aktion = `<p>✓ Diese Mischung ist vollständig protokolliert.</p>` +
        (naechste ? `<button class="knopf" id="exp-naechste">Weiter mit: ${esc(naechste.name)}</button>`
                  : `<p><strong>Alle fünf Mischungen stehen im Protokoll — weiter zur Auswertung!</strong></p>`);
    } else {
      aktion = `<form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">${schrittLabel(m, d.schritt)}</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">Eintragen</button>
      </form>`;
    }
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-knopfzeile" role="group" aria-label="Mischung wählen">${chips}</div>
      <p>Aktuell: <strong>${esc(m.name)}</strong>${d.schritt < 6 ? ` — Schritt ${Math.min(d.schritt, 5) + 1} von 6` : ""}</p>
      ${aktion}
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Protokoll</h3>
      ${protokollTabelle()}
      <p>${anzahlFertig()} von 5 Mischungen vollständig.${auswertbar() ? "" : " Für die Auswertung brauchst du mindestens den Methoden-Check, Probe X und eine weitere Probe — am stärksten wird der Vergleich mit allen fünf."}</p>
      <button class="knopf" id="exp-weiter2" ${auswertbar() ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelectorAll("[data-mischung]").forEach(k => k.addEventListener("click", () => {
      if (zustand.animLaeuft) return;
      zustand.aktuell = k.dataset.mischung;
      panelMessen(); zeichne();
    }));
    panel.querySelector("#exp-naechste")?.addEventListener("click", () => {
      const naechste = MISCHUNGEN.find(x => !fertig(x));
      if (naechste) { zustand.aktuell = naechste.id; panelMessen(); zeichne(); }
    });
    panel.querySelector("#exp-mischen")?.addEventListener("click", () => {
      if (zustand.animLaeuft || d.schritt !== 4) return;
      const mId = m.id;
      mischAnimation(() => {
        zustand.daten[mId].schritt = 5;
        if (zustand.phase === "messen") panelMessen();
        zeichne();
      });
      if (zustand.animLaeuft) panelMessen();   // Knopf sperren, solange es rührt
    });
    panel.querySelector("#exp-ablesen")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const pruefung = schrittPruefung(m, d.schritt);
      if (!pruefung) return;
      if (!ablesungOk(eingabe, pruefung.wahr, pruefung.tol)) {
        panel.querySelector("#exp-meldung").textContent = pruefung.fehler;
        return;
      }
      d.werte[pruefung.key] = eingabe;
      d.schritt += 1;
      panelMessen(); zeichne();
      panel.querySelector("#exp-meldung").textContent = "✓ Eingetragen.";
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechsle("auswerten"));
  }

  function panelAuswerten() {
    const wasserFertig = fertig(mischungVon("wasser"));
    const wasserWerte = datenVon(mischungVon("wasser")).werte;
    const metalle = MISCHUNGEN.filter(x => x.typ === "metall" && fertig(x));
    const offen = MISCHUNGEN.filter(x => !fertig(x));
    panel.innerHTML = `
      <h2>Auswertung</h2>
      ${offen.length ? `<p class="exp-hinweis">Noch nicht gemessen: ${offen.map(x => esc(x.name)).join(", ")} — du kannst jederzeit zur Durchführung zurück.</p>` : ""}
      ${protokollTabelle()}
      <div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv" ${anzahlFertig() ? "" : "disabled"}>Protokoll als CSV</button></div>
      <h3>Teil 1 · Methoden-Check: Warum nicht 50 °C?</h3>
      ${wasserFertig ? `
      <p>Gemessen hast du T<sub>m</sub> ≈ <strong>${komma(wasserWerte.Tm, 2)} °C</strong> — deutlich unter dem „naiven" Mittel (20 °C + 80 °C)/2 = 50 °C. Warum?</p>
      <select id="exp-f1" class="exp-wahl">
        <option value="">Bitte wählen …</option>
        <option value="verlust">Beim Umgießen ist Wärme verloren gegangen.</option>
        <option value="masse">Die Massen zählen mit: 200 g kaltes Wasser „überstimmen" 100 g heißes — T_m ist das massen-gewichtete Mittel.</option>
        <option value="traege">Das Thermometer reagiert zu langsam und zeigt zu wenig an.</option>
        <option value="kalt">Kaltes Wasser nimmt Wärme schlechter auf, als heißes sie abgibt.</option>
      </select>
      <p><button class="knopf" id="exp-f1pruefen">Antwort prüfen</button></p>
      <p id="exp-m1" class="exp-meldung" aria-live="polite"></p>` : `<p>Dafür fehlt noch der Methoden-Check (Teil 1).</p>`}
      <h3>Teil 2 · Wärmekapazität der Proben berechnen</h3>
      <p>Stelle die Energiebilanz Q<sub>auf</sub> = Q<sub>ab</sub> nach c<sub>M</sub> um und rechne mit <em>deinen</em> Protokollwerten:</p>
      <p class="exp-hinweis">c<sub>M</sub> = m<sub>w</sub> · c<sub>w</sub> · (T<sub>m</sub> − T<sub>w</sub>) / [ m<sub>M</sub> · (T<sub>M</sub> − T<sub>m</sub>) ] &nbsp;mit&nbsp; c<sub>w</sub> = 4,18 J/(g·K)</p>
      ${metalle.length ? metalle.map(x => `
        <form class="exp-ablesen" data-cform="${x.id}">
          <label for="exp-c-${x.id}">${esc(x.name)} — dein c<sub>M</sub> in J/(g·K):</label>
          <input id="exp-c-${x.id}" inputmode="decimal" autocomplete="off" size="7">
          <button class="knopf">Prüfen</button>
        </form>
        <p id="exp-cm-${x.id}" class="exp-meldung" aria-live="polite"></p>`).join("") : `<p>Es ist noch keine Metallprobe protokolliert.</p>`}
      <p>Tabellenwerte zum Vergleich: ${TABELLENWERTE.map(t => `${t.stoff} ${komma(t.c, 2)}`).join(" · ")} — alle in J/(g·K).</p>
      ${fertig(mischungVon("x")) ? `
      <h3>Teil 3 · Probe X enttarnen</h3>
      <label for="exp-fx">Vergleiche dein c für Probe X mit den Tabellenwerten. Probe X besteht aus …</label>
      <select id="exp-fx" class="exp-wahl">
        <option value="">Bitte wählen …</option>
        ${TABELLENWERTE.map(t => `<option value="${t.stoff}">${t.stoff}</option>`).join("")}
      </select>
      <p><button class="knopf" id="exp-fxpruefen">Antwort prüfen</button></p>
      <p id="exp-mx" class="exp-meldung" aria-live="polite"></p>` : ""}
      <h3>Erkenntnis</h3>
      <p>Vergleiche die Werte: Wasser speichert mit 4,18 J/(g·K) vier- bis dreißigmal so viel Energie je Gramm und Grad wie die Metalle hier — seine Wärmekapazität ist riesig. Genau deshalb mildern Meere und große Seen das Klima ganzer Küstenregionen, und deshalb arbeitet Wasser als Kühlmittel in Motoren, Heizungen und Kraftwerken.</p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was im echten Versuch schiefgeht</summary>
        <ul>
          <li><strong>Kalorimeter-Verluste:</strong> Echte Kalorimeter geben während der Messung Wärme an Gefäß und Umgebung ab. Das gemessene T<sub>m</sub> fällt dadurch <em>zu klein</em> aus — im Zähler wird (T<sub>m</sub> − T<sub>w</sub>) zu klein, im Nenner (T<sub>M</sub> − T<sub>m</sub>) zu groß: c<sub>M</sub> wird systematisch <em>unterschätzt</em>. Überlege bei jeder Fehlerquelle mit, <em>in welche Richtung</em> sie das Ergebnis schiebt!</li>
          <li><strong>Restwasser an der Probe:</strong> Hängen beim Umsetzen Tropfen aus dem 100 °C heißen Wasserbad an der Probe, bringen sie zusätzliche Energie (und Masse) mit — T<sub>m</sub> wird zu groß, c<sub>M</sub> wird überschätzt. Deshalb: kurz abtropfen lassen, aber nicht trödeln (sonst kühlt die Probe ab).</li>
          <li><strong>Ablesefehler bei kleinen ΔT:</strong> Bei Kupfer erwärmt sich das Wasser nur um gut 5 °C. Schon 0,25 °C Ablesefehler sind davon rund 5 % — und schlagen voll auf c<sub>M</sub> durch. Genau darum liegen deine Werte für Eisen (0,45) und Kupfer (0,39) schnell gefährlich nah beieinander: Hier entscheidet sauberes Ablesen.</li>
        </ul>
      </details>
      <details class="exp-fehler"><summary>Vertiefung: der Wasserwert</summary>
        <p>Profis behandeln das Kalorimeter wie zusätzliches Wasser: Gefäß, Rührer und Thermometer erwärmen sich mit und bekommen eine eigene Wärmekapazität W, den <strong>Wasserwert</strong>. In der Bilanz steht dann (m<sub>w</sub>·c<sub>w</sub> + W)·(T<sub>m</sub> − T<sub>w</sub>) = m<sub>M</sub>·c<sub>M</sub>·(T<sub>M</sub> − T<sub>m</sub>). Unser ideales Kalorimeter hatte W = 0 — im Schullabor bestimmt man W vorab mit einem Mischversuch wie in Teil 1.</p>
      </details>
      <div class="sp-panel-knoepfe">
        <button class="knopf zweitrangig" id="exp-zurueck">Zur Durchführung</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = MISCHUNGEN.filter(fertig).map(x => {
        const v = datenVon(x).werte;
        return [x.name, komma(v.mw, 1), komma(v.Tw, 1), komma(v.m2, 1), komma(v.T2, 1), komma(v.Tm, 2)];
      });
      csvHerunterladen("waermekapazitaet-protokoll.csv",
        ["Mischung", "m_w in g", "T_w in °C", "m2/m_M in g", "T2/T_M in °C", "T_m in °C"], zeilen);
    });
    panel.querySelector("#exp-f1pruefen")?.addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-f1").value, m1 = panel.querySelector("#exp-m1");
      if (!wahl) { m1.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m1.textContent = {
        masse: "✓ Genau: T_m ist das massen-gewichtete Mittel — 200 g kaltes Wasser zählen doppelt so stark wie 100 g heißes: T_m = (200 · 20 + 100 · 80) / 300 °C = 40 °C. Deine Messung bestätigt die Energiebilanz — die Methode trägt.",
        verlust: "✗ Unser Kalorimeter ist ideal, hier geht nichts verloren — und trotzdem sind es keine 50 °C. Vergleiche die beiden Wassermengen: Sind sie gleich groß?",
        traege: "✗ Nach dem Umrühren hat das Thermometer genug Zeit gehabt. Schau lieber auf die Massen: 200 g kalt gegen 100 g heiß — wer setzt sich durch?",
        kalt: "✗ Wasser ist Wasser: 1 g braucht 4,18 J pro °C — beim Aufnehmen wie beim Abgeben. Der Unterschied liegt allein in den Massen der beiden Portionen."
      }[wahl];
    });
    panel.querySelectorAll("[data-cform]").forEach(formEl => formEl.addEventListener("submit", ev => {
      ev.preventDefault();
      const x = mischungVon(formEl.dataset.cform), v = datenVon(x).werte;
      const soll = cAusMessung(v.mw, v.Tw, v.m2, v.T2, v.Tm);
      const eingabe = parseDezimal(formEl.querySelector("input").value);
      const ziel = panel.querySelector("#exp-cm-" + x.id);
      if (!cEingabeOk(eingabe, soll)) {
        ziel.textContent = "✗ Prüfe dein Einsetzen: Zähler m_w · c_w · (T_m − T_w), Nenner m_M · (T_M − T_m) — alle Werte aus deiner Protokollzeile. Zwei Nachkommastellen reichen.";
        return;
      }
      if (x.geheim) {
        ziel.textContent = "✓ Richtig gerechnet: Aus deinem Protokoll folgt c ≈ " + komma(soll, 2) + " J/(g·K). Merk dir den Wert — unten enttarnst du damit die Probe.";
      } else {
        const tab = TABELLENWERTE.find(t => t.stoff === x.stoff);
        const abw = Math.abs(soll - tab.c) / tab.c * 100;
        ziel.textContent = "✓ Richtig gerechnet: c ≈ " + komma(soll, 2) + " J/(g·K) — Tabellenwert " + tab.stoff + ": " + komma(tab.c, 2) + " (Abweichung " + komma(abw, 1) + " %). Kleine Ablesefehler schlagen hier direkt durch.";
      }
    }));
    panel.querySelector("#exp-fxpruefen")?.addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-fx").value, mx = panel.querySelector("#exp-mx");
      if (!wahl) { mx.textContent = "Wähle zuerst ein Metall aus."; return; }
      mx.textContent = wahl === "Blei"
        ? "✓ Enttarnt: Probe X ist aus Blei — dein c liegt bei etwa 0,13 J/(g·K), und kein anderer Tabellenwert kommt dem auch nur nahe."
        : "✗ Vergleiche noch einmal: Dein c für Probe X liegt deutlich unter 0,2 J/(g·K). Welcher Tabellenwert ist am nächsten dran?";
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechsle("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      MISCHUNGEN.forEach(x => { zustand.daten[x.id] = { schritt: 0, werte: {} }; });
      zustand.aktuell = "wasser";
      zeichne(); wechsle("aufbau");
    });
  }

  function wechslePhase(p) {
    zustand.phase = p;
    if (p === "aufbau") panelAufbau();
    if (p === "messen") panelMessen();
    if (p === "auswerten") panelAuswerten();
  }

  zeichne();
  wechsle("aufbau");
}
