// experiment.js — Interaktives Experiment: Beschleunigung auf der Rollbahn
// (Einführungsphase, Kinematik). Realitätsnahe Messpraxis: Ein Wagen rollt aus
// der Ruhe eine geneigte Bahn hinab, zwei Lichtschranken stoppen seine
// 5,0-cm-Unterbrecherfahne. Die Zeiten liest man an der digitalen Zeitbox ab,
// überträgt sie SELBST in die Messtabelle und wertet aus:
// v = 5 cm / t_Fahne, a = (v2 − v1) / t12 — der Vergleich mit g·sin α deckt
// am Ende die Rollreibung auf.
//
// MODELL (dokumentiert; Modulebene DOM-frei, in Node testbar):
//   Beschleunigung mit Rollreibung µ = 0,008:  a = g·(sin α − µ·cos α)
//   Aus der Ruhe:                              v(x) = √(2·a·x)
//   Durchgangszeit der Fahne an Position x:    t_F ≈ 0,05 / v_mitte  mit
//     v_mitte = √(2·a·(x + 0,025)) — Geschwindigkeit, wenn die FAHNENMITTE die
//     Schranke passiert. Näherung gegenüber der exakten √-Differenz
//     t_exakt = √(2·(x+0,05)/a) − √(2·x/a): Fehler < 0,3 % für x ≥ 0,15 m,
//     am unteren Randfall x = 0,10 m noch < 0,6 % (siehe TESTS).
//   Laufzeit zwischen den Schranken (Auslösung an der Fahnen-VORDERKANTE):
//     t12 = √(2·x2/a) − √(2·x1/a)
//   Anzeige mit deterministischer Elektronik-Streuung ±0,2 ms (streuung(…, 0,4)).
//   Bewusste Systematik fürs Auswertungsgespräch: v1/v2 gehören zur Fahnen-
//   MITTE, t12 zur VORDERKANTE — dadurch fällt a stets etwas zu klein aus
//   (≲ 2,6 % bei x1 ≥ 0,15 m), zusätzlich zur Rollreibung. Genau das
//   diskutiert die Fehlerbetrachtung in der Auswertung.

import {
  streuung, parseDezimal, komma, ablesungOk, mittel,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

export const G = 9.81;            // m/s²
export const MU = 0.008;          // Rollreibungszahl der Bahn (Modellannahme, dokumentiert)
export const FAHNE = 0.05;        // m — Breite der Unterbrecherfahne
export const BAHN = 1.50;         // m — nutzbare Bahnlänge ab der Marke 0
export const POS_MIN = 0.10, POS_MAX = 1.40, POS_ABSTAND = 0.10; // m — Schrankenpositionen
export const ALPHA_MIN = 2, ALPHA_MAX = 10;                      // Grad
export const T_TOLERANZ_MS = 0.3;     // Toleranz beim Übertragen je Zeitwert
export const A_TOLERANZ_PROZENT = 3;  // Toleranz für a = (v2 − v1)/t12
export const STREU_MS = 0.4;          // Spanne der Elektronik-Streuung (±0,2 ms)

// ---------- Modell (reine Funktionen) ----------
export function beschleunigung(alphaGrad) {
  const w = alphaGrad * Math.PI / 180;
  return G * (Math.sin(w) - MU * Math.cos(w));
}
export function vAnPosition(a, x) { return Math.sqrt(2 * a * x); }
// Näherung: Fahnenzeit über die Geschwindigkeit an der Fahnenmitte
export function fahnenzeit(a, x) { return FAHNE / vAnPosition(a, x + FAHNE / 2); }
// exakte Verdunklungsdauer (√-Differenz) — Referenz für die TESTS
export function fahnenzeitExakt(a, x) {
  return Math.sqrt(2 * (x + FAHNE) / a) - Math.sqrt(2 * x / a);
}
export function laufzeit(a, x1, x2) {
  return Math.sqrt(2 * x2 / a) - Math.sqrt(2 * x1 / a);
}

// ---------- Auswertelogik ----------
// a aus einer Messreihe: v in m/s, t12 in ms
export function aAusReihe(v1, v2, t12Ms) { return (v2 - v1) / (t12Ms / 1000); }
export function prozentOk(eingabe, soll, prozent) {
  return Number.isFinite(eingabe) && Number.isFinite(soll) && soll !== 0 &&
    Math.abs(eingabe - soll) / Math.abs(soll) * 100 <= prozent;
}

// Schrankenpositionen in den erlaubten Bereich zwingen (LS2 mindestens 0,10 m
// hinter LS1). `bewegt` sagt, welcher Regler gezogen wurde — der andere weicht aus.
export function klemmePositionen(x1, x2, bewegt = "x2") {
  const r2 = z => Math.round(z * 100) / 100;
  x1 = Math.min(Math.max(x1, POS_MIN), POS_MAX - POS_ABSTAND);
  x2 = Math.min(Math.max(x2, POS_MIN + POS_ABSTAND), POS_MAX);
  if (x2 - x1 < POS_ABSTAND - 1e-9) {
    if (bewegt === "x1") x2 = x1 + POS_ABSTAND;
    else x1 = x2 - POS_ABSTAND;
  }
  return { x1: r2(x1), x2: r2(x2) };
}

// Eine komplette Messung: Zeiten in ms inkl. deterministischer Streuung (±0,2 ms),
// dadurch reproduzierbar und testbar — gleiche Einstellung, gleiche Anzeige.
export function messwerte(alphaGrad, x1, x2) {
  const a = beschleunigung(alphaGrad);
  const k = `ls:${alphaGrad.toFixed(1)}:${x1.toFixed(2)}:${x2.toFixed(2)}`;
  return {
    a,
    t1Ms: fahnenzeit(a, x1) * 1000 + streuung(k + ":t1", STREU_MS),
    t2Ms: fahnenzeit(a, x2) * 1000 + streuung(k + ":t2", STREU_MS),
    t12Ms: laufzeit(a, x1, x2) * 1000 + streuung(k + ":t12", STREU_MS)
  };
}

// ---------- Prüffälle (analytisch bekannte Lösungen) ----------
export const pruefFaelle = [
  { alpha: 5, soll: { a: 0.776816 }, toleranzProzent: 0.1 },  // 9,81·(sin 5° − 0,008·cos 5°)
  { alpha: 2, soll: { a: 0.263932 }, toleranzProzent: 0.1 },
  { alpha: 10, soll: { a: 1.626201 }, toleranzProzent: 0.1 },
  { alpha: 5, x: 1.00, soll: { v: 1.246448 }, toleranzProzent: 0.1 },
  { alpha: 5, x1: 0.20, x2: 1.20, soll: { t12: 1.040126 }, toleranzProzent: 0.1 }
];

export const TESTS = [
  { name: "a-Kontrollwert: α = 5° → 0,7768 m/s²",
    ok: () => Math.abs(beschleunigung(5) - 0.776816) < 5e-4 },
  { name: "a-Formel: Randwerte 2°/10° und streng monoton",
    ok: () => {
      if (Math.abs(beschleunigung(2) - 0.263932) > 5e-4) return false;
      if (Math.abs(beschleunigung(10) - 1.626201) > 5e-4) return false;
      for (let al = ALPHA_MIN; al < ALPHA_MAX; al += 0.5) {
        if (!(beschleunigung(al + 0.5) > beschleunigung(al))) return false;
      }
      return beschleunigung(ALPHA_MIN) > 0;
    } },
  { name: "v(x) = √(2ax): Kontrollwerte",
    ok: () => vAnPosition(2, 1) === 2 && vAnPosition(2, 0) === 0 &&
      Math.abs(vAnPosition(beschleunigung(5), 1.0) - 1.246448) < 1e-3 },
  { name: "t₁₂-Formel: √-Differenz und Identität t₁₂ = (v₂ − v₁)/a",
    ok: () => {
      if (Math.abs(laufzeit(2, 0.5, 2) - (Math.SQRT2 - Math.sqrt(0.5))) > 1e-12) return false;
      for (const al of [2, 5, 10]) {
        const a = beschleunigung(al);
        for (const [x1, x2] of [[0.1, 1.4], [0.2, 1.2], [0.3, 0.9]]) {
          const ident = (vAnPosition(a, x2) - vAnPosition(a, x1)) / a;
          if (Math.abs(laufzeit(a, x1, x2) - ident) > 1e-12) return false;
        }
      }
      return true;
    } },
  { name: "Fahnen-Näherung: Fehler < 0,3 % für x ≥ 0,15 m (Randfall 0,10 m < 0,6 %)",
    ok: () => {
      for (const al of [2, 5, 10]) {
        const a = beschleunigung(al);
        for (let x = 0.15; x <= 1.4 + 1e-9; x += 0.05) {
          const rel = Math.abs(fahnenzeit(a, x) - fahnenzeitExakt(a, x)) / fahnenzeitExakt(a, x);
          if (rel >= 0.003) return false;
        }
        const rand = Math.abs(fahnenzeit(a, 0.10) - fahnenzeitExakt(a, 0.10)) / fahnenzeitExakt(a, 0.10);
        if (rand >= 0.006) return false;
      }
      return true;
    } },
  { name: "Synthetisch perfekte Reihe → a exakt",
    ok: () => {
      const a = 1.234, t1 = 0.4, t2 = 1.1; // v = a·t, t12 = t2 − t1
      return Math.abs(aAusReihe(a * t1, a * t2, (t2 - t1) * 1000) - a) < 1e-12;
    } },
  { name: "Messkette ohne Streuung: a höchstens 3 % neben dem Modellwert",
    ok: () => [2, 5, 10].every(al => {
      const a = beschleunigung(al);
      return [[0.15, 1.40], [0.20, 1.20], [0.30, 0.90]].every(([x1, x2]) => {
        const v1 = FAHNE / fahnenzeit(a, x1), v2 = FAHNE / fahnenzeit(a, x2);
        const aExp = aAusReihe(v1, v2, laufzeit(a, x1, x2) * 1000);
        return Math.abs(aExp - a) / a < 0.03;
      });
    }) },
  { name: "Streuung: höchstens ±0,2 ms und deterministisch",
    ok: () => [[2, 0.10, 1.40], [5, 0.20, 1.20], [10, 0.30, 0.90], [7.5, 0.15, 0.55]]
      .every(([al, x1, x2]) => {
        const a = beschleunigung(al);
        const m = messwerte(al, x1, x2), n = messwerte(al, x1, x2);
        return Math.abs(m.t1Ms - fahnenzeit(a, x1) * 1000) <= STREU_MS / 2 + 1e-9 &&
               Math.abs(m.t2Ms - fahnenzeit(a, x2) * 1000) <= STREU_MS / 2 + 1e-9 &&
               Math.abs(m.t12Ms - laufzeit(a, x1, x2) * 1000) <= STREU_MS / 2 + 1e-9 &&
               m.t1Ms === n.t1Ms && m.t2Ms === n.t2Ms && m.t12Ms === n.t12Ms;
      }) },
  { name: "Klemmung: LS2 > LS1 + 0,1 m, Bereiche eingehalten",
    ok: () => {
      const f1 = klemmePositionen(1.40, 0.20, "x1"); // LS1 ganz ans Ende gezogen
      const f2 = klemmePositionen(0.50, 0.55, "x2"); // LS2 zu dicht an LS1
      const f3 = klemmePositionen(0.50, 0.55, "x1"); // LS1 zu dicht an LS2
      const f4 = klemmePositionen(-1, 5, "x2");      // weit außerhalb des Bereichs
      const f5 = klemmePositionen(0.10, 1.40, "x2"); // gültig → unverändert
      return f1.x1 === 1.30 && f1.x2 === 1.40 &&
             f2.x1 === 0.45 && f2.x2 === 0.55 &&
             f3.x1 === 0.50 && f3.x2 === 0.60 &&
             f4.x1 === 0.10 && f4.x2 === 1.40 &&
             f5.x1 === 0.10 && f5.x2 === 1.40 &&
             [f1, f2, f3, f4, f5].every(p => p.x2 - p.x1 >= POS_ABSTAND - 1e-9);
    } },
  { name: "Eingabeprüfungen: ±0,3 ms, ±3 %, Dezimalkomma",
    ok: () => ablesungOk(41.5, 41.34, T_TOLERANZ_MS) &&
      !ablesungOk(41.8, 41.34, T_TOLERANZ_MS) &&
      !ablesungOk(NaN, 41.34, T_TOLERANZ_MS) &&
      prozentOk(0.98, 1, A_TOLERANZ_PROZENT) && !prozentOk(1.04, 1, A_TOLERANZ_PROZENT) &&
      parseDezimal("41,3") === 41.3 && parseDezimal("41.3") === 41.3 },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      const a = beschleunigung(p.alpha), tol = p.toleranzProzent;
      const nah = (ist, soll) => Math.abs(ist - soll) / Math.abs(soll) * 100 <= tol;
      if (p.soll.a !== undefined) return nah(a, p.soll.a);
      if (p.soll.v !== undefined) return nah(vAnPosition(a, p.x), p.soll.v);
      return nah(laufzeit(a, p.x1, p.x2), p.soll.t12);
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
const S_ENDE = 1.47; // m — hier fängt der Prellbock den Wagen ab (Fahne hat LS2 sicher verlassen)

export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    alphaGrad: 5, x1: 0.30, x2: 1.20,
    sAnim: 0,          // zurückgelegter Weg der Fahnen-Vorderkante (m)
    fahrt: null,       // { a, start } während der Wagen rollt
    messung: null,     // { a, t1Ms, t2Ms, t12Ms, fertig } der laufenden/letzten Messung
    reihen: [],        // übertragene Messreihen
    gsinEingaben: {},  // akzeptierte g·sin α-Eingaben je Winkel ("5.0" → Zahl)
    phase: "aufbau"
  };

  wurzel.innerHTML = "";
  const wechsle = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="420" height="300" aria-label="Versuchsaufbau: geneigte Rollbahn mit Zentimeterskala, Wagen mit Unterbrecherfahne, zwei verschiebbare Lichtschranken LS1 und LS2 sowie digitale Zeitbox."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);
  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche"),
          cFehler = farbe("--fehler", "#b33");
    ctx.clearRect(0, 0, w, h);
    const wRad = zustand.alphaGrad * Math.PI / 180;
    const ux = Math.cos(wRad), uy = Math.sin(wRad);   // bahnabwärts
    const nx = -Math.sin(wRad), ny = Math.cos(wRad);  // senkrecht zur Bahn, von ihr weg nach unten
    const RAIL_PX = 352, EXTRA = 0.18;                // 18 cm Anlaufstück vor der Marke 0
    const PXM = RAIL_PX / (BAHN + EXTRA);
    const E = { x: 404, y: 238 };                     // unteres Bahnende
    const S = { x: E.x - RAIL_PX * ux, y: E.y - RAIL_PX * uy };
    const P = m => ({ x: S.x + (EXTRA + m) * PXM * ux, y: S.y + (EXTRA + m) * PXM * uy });
    const BODEN = 264;

    // Boden, Stellfuß (links hoch) und Fuß (rechts)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(10, BODEN); ctx.lineTo(w - 10, BODEN); ctx.stroke();
    ctx.fillStyle = cText;
    ctx.fillRect(S.x - 4, S.y, 8, BODEN - S.y);
    ctx.fillRect(E.x - 14, E.y, 8, BODEN - E.y);

    // Winkelmarkierung am unteren Ende
    ctx.strokeStyle = cLeise; ctx.setLineDash([5, 4]);
    ctx.beginPath(); ctx.moveTo(E.x, E.y); ctx.lineTo(E.x - 92, E.y); ctx.stroke();
    ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(E.x, E.y, 56, Math.PI, Math.PI + wRad, false); ctx.stroke();

    // Bahn
    ctx.strokeStyle = cText; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(S.x, S.y); ctx.lineTo(E.x, E.y); ctx.stroke();

    // Zentimeterskala unterhalb der Bahn
    ctx.lineWidth = 1;
    for (let cm = 0; cm <= 150; cm++) {
      const p = P(cm / 100);
      const lang = cm % 10 === 0 ? 10 : (cm % 5 === 0 ? 7 : 4);
      ctx.strokeStyle = cm % 10 === 0 ? cText : cLeise;
      ctx.beginPath();
      ctx.moveTo(p.x + nx * 4, p.y + ny * 4);
      ctx.lineTo(p.x + nx * (4 + lang), p.y + ny * (4 + lang));
      ctx.stroke();
    }
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const cm of [0, 50, 100, 150]) {
      const p = P(cm / 100);
      const lx = p.x + nx * 24, ly = p.y + ny * 24 + 4;
      const txt = cm === 0 ? "0 cm" : String(cm);
      const tw = ctx.measureText(txt).width;
      ctx.fillStyle = cFlaeche;                 // Chip, damit die Zahl auch über dem Standfuß lesbar bleibt
      ctx.fillRect(lx - tw / 2 - 2, ly - 8, tw + 4, 15);
      ctx.fillStyle = cText;
      ctx.fillText(txt, lx, ly);
    }
    ctx.textAlign = "start"; ctx.textBaseline = "alphabetic";

    // Prellbock am Bahnende
    const pb = P(1.49);
    ctx.save(); ctx.translate(pb.x, pb.y); ctx.rotate(wRad);
    ctx.fillStyle = cLeise; ctx.fillRect(-3, -15, 7, 13);
    ctx.restore();

    // Lichtschranken (vor dem Wagen zeichnen, damit er „durchfährt")
    const schranke = (xPos, name) => {
      const p = P(xPos);
      const blockiert = zustand.fahrt && zustand.sAnim >= xPos && zustand.sAnim <= xPos + FAHNE;
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(wRad);
      ctx.fillStyle = cLeise;
      ctx.fillRect(-2, -40, 4, 38);
      ctx.fillStyle = blockiert ? cFehler : cAkzent;
      ctx.fillRect(-5, -40, 10, 8);
      ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText(name, 0, -46);
      ctx.textAlign = "start";
      ctx.restore();
    };
    schranke(zustand.x1, "LS1");
    schranke(zustand.x2, "LS2");

    // Wagen mit Unterbrecherfahne — Fahnen-Vorderkante bei sAnim
    const sp = P(Math.min(zustand.sAnim, S_ENDE));
    ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(wRad);
    ctx.fillStyle = cText;
    ctx.beginPath(); ctx.arc(-29, -6, 3.5, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(-7, -6, 3.5, 0, 7); ctx.fill();
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(-36, -19, 38, 10, 2); else ctx.rect(-36, -19, 38, 10);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cAkzent;
    ctx.fillRect(-FAHNE * PXM, -33, FAHNE * PXM, 14);
    ctx.restore();

    // Digitale Zeitbox (Werte erscheinen, sobald die Messung sie liefert)
    const m = zustand.messung;
    const zeigT1 = m && (m.fertig || zustand.sAnim >= zustand.x1 + FAHNE);
    const zeigT2 = m && (m.fertig || zustand.sAnim >= zustand.x2 + FAHNE);
    const zeigT12 = m && (m.fertig || zustand.sAnim >= zustand.x2);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.fillRect(10, 10, 178, 80); ctx.strokeRect(10, 10, 178, 80);
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Zeitbox (ms)", 18, 26);
    ctx.font = "13px ui-monospace, Consolas, monospace";
    const zeile = (beschriftung, wert, y) => {
      ctx.fillText(beschriftung, 18, y);
      ctx.textAlign = "right"; ctx.fillText(wert, 178, y); ctx.textAlign = "start";
    };
    zeile("t₁", zeigT1 ? komma(m.t1Ms, 1) : "—", 44);
    zeile("t₂", zeigT2 ? komma(m.t2Ms, 1) : "—", 60);
    zeile("t₁₂", zeigT12 ? komma(m.t12Ms, 1) : "—", 76);

    // Winkelwert gut lesbar oben rechts
    ctx.fillStyle = cText; ctx.font = "13px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText(`α = ${komma(zustand.alphaGrad, 1)}°`, w - 12, 26);
    ctx.textAlign = "start";
  }

  // ---------- Messung ----------
  function starteMessung() {
    zustand.messung = { ...messwerte(zustand.alphaGrad, zustand.x1, zustand.x2), fertig: false };
    zustand.sAnim = 0;
    if (reduziert) { beendeFahrt(); return; }
    zustand.fahrt = { a: zustand.messung.a, start: performance.now() };
    panelMessen(); // Regler und Startknopf während der Fahrt sperren
    requestAnimationFrame(fahrSchritt);
  }
  function beendeFahrt() {
    zustand.fahrt = null;
    zustand.sAnim = S_ENDE;
    if (zustand.messung) zustand.messung.fertig = true;
    zeichne();
    if (zustand.phase === "messen") panelMessen();
  }
  function fahrSchritt() {
    if (!zustand.fahrt) return;
    const t = (performance.now() - zustand.fahrt.start) / 1000;
    zustand.sAnim = 0.5 * zustand.fahrt.a * t * t;
    if (zustand.sAnim >= S_ENDE) { beendeFahrt(); return; }
    zeichne();
    requestAnimationFrame(fahrSchritt);
  }

  // ---------- Regler (in Aufbau und Durchführung) ----------
  function reglerHtml() {
    const sperre = zustand.fahrt ? "disabled" : "";
    return `
      <div class="exp-regler">
        <label for="exp-alpha">Neigungswinkel α = <output id="exp-alpha-aus">${komma(zustand.alphaGrad, 1)}</output>°</label>
        <input type="range" id="exp-alpha" min="${ALPHA_MIN}" max="${ALPHA_MAX}" step="0.5" value="${zustand.alphaGrad}" ${sperre}>
        <label for="exp-x1">Lichtschranke LS1 bei x₁ = <output id="exp-x1-aus">${komma(zustand.x1, 2)}</output> m</label>
        <input type="range" id="exp-x1" min="${POS_MIN}" max="${POS_MAX}" step="0.05" value="${zustand.x1}" ${sperre}>
        <label for="exp-x2">Lichtschranke LS2 bei x₂ = <output id="exp-x2-aus">${komma(zustand.x2, 2)}</output> m</label>
        <input type="range" id="exp-x2" min="${POS_MIN}" max="${POS_MAX}" step="0.05" value="${zustand.x2}" ${sperre}>
      </div>`;
  }
  function bindeRegler() {
    const eAlpha = panel.querySelector("#exp-alpha"),
          eX1 = panel.querySelector("#exp-x1"), eX2 = panel.querySelector("#exp-x2");
    if (!eAlpha) return;
    const uebernehmen = bewegt => {
      const p = klemmePositionen(Number(eX1.value), Number(eX2.value), bewegt);
      zustand.alphaGrad = Number(eAlpha.value);
      zustand.x1 = p.x1; zustand.x2 = p.x2;
      eX1.value = String(p.x1); eX2.value = String(p.x2);
      panel.querySelector("#exp-alpha-aus").textContent = komma(zustand.alphaGrad, 1);
      panel.querySelector("#exp-x1-aus").textContent = komma(zustand.x1, 2);
      panel.querySelector("#exp-x2-aus").textContent = komma(zustand.x2, 2);
      zustand.messung = null; zustand.fahrt = null; zustand.sAnim = 0; // neue Einstellung → alte Zeiten verfallen
      setzeMessSperren();
      zeichne();
    };
    eAlpha.addEventListener("input", () => uebernehmen("x2"));
    eX1.addEventListener("input", () => uebernehmen("x1"));
    eX2.addEventListener("input", () => uebernehmen("x2"));
  }
  function setzeMessSperren() {
    const fertig = !!(zustand.messung && zustand.messung.fertig);
    for (const id of ["#exp-ein-t1", "#exp-ein-t2", "#exp-ein-t12"]) {
      const e = panel.querySelector(id);
      if (e) e.disabled = !fertig;
    }
    const k = panel.querySelector("#exp-uebertragen");
    if (k) k.disabled = !fertig;
    const meld = panel.querySelector("#exp-meldung");
    if (meld && !fertig && !zustand.fahrt) meld.textContent = "";
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf dem Tisch liegt eine <strong>1,50 m lange Rollbahn</strong> mit Zentimeterskala, über einen Stellfuß um α = 2° bis 10° geneigt. Der <strong>Wagen</strong> trägt eine <strong>Unterbrecherfahne von 5,0 cm Breite</strong> und startet aus der Ruhe an der Marke 0. Über der Bahn sitzen zwei verschiebbare <strong>Lichtschranken</strong> LS1 und LS2.</p>
      <p>Die <strong>Zeitbox</strong> (links oben im Bild) stoppt drei Zeiten: <strong>t₁</strong> und <strong>t₂</strong> sind die Verdunklungszeiten der Fahne in LS1 bzw. LS2, <strong>t₁₂</strong> läuft von Auslösung LS1 bis Auslösung LS2.</p>
      <p><strong>Plan:</strong> Wagen loslassen, die drei Zeiten ablesen und in die Messtabelle übertragen. Das Protokoll berechnet daraus v₁ = 5 cm/t₁ und v₂ = 5 cm/t₂ — in der Auswertung bestimmst du die Beschleunigung a = (v₂ − v₁)/t₁₂, misst mehrere Reihen mit anderen Positionen und Winkeln und vergleichst mit g·sin α.</p>
      <p class="exp-hinweis">Vorhersage vor dem Start: Wird t₂ größer oder kleiner als t₁? Begründe — die Fahne ist beide Male 5 cm breit.</p>
      <p>Tipp: Setz LS1 nicht ganz an den Bahnanfang — ab etwa 0,15 m läuft die Fahne schon gleichmäßig genug durch die Schranke.</p>
      ${reglerHtml()}
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    bindeRegler();
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechsle("messen"));
  }

  function panelMessen() {
    const fertig = !!(zustand.messung && zustand.messung.fertig);
    const n = zustand.reihen.length;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      ${reglerHtml()}
      <div class="exp-knopfzeile">
        <button class="knopf" id="exp-start" ${zustand.fahrt ? "disabled" : ""}>${fertig ? "Neue Messung starten" : "Messung starten"}</button>
      </div>
      <form id="exp-uebertrag" class="exp-ablesen" aria-label="Zeiten von der Zeitbox übertragen">
        <label for="exp-ein-t1">t₁ in ms:</label><input id="exp-ein-t1" class="exp-eingabe" inputmode="decimal" autocomplete="off" ${fertig ? "" : "disabled"}>
        <label for="exp-ein-t2">t₂ in ms:</label><input id="exp-ein-t2" class="exp-eingabe" inputmode="decimal" autocomplete="off" ${fertig ? "" : "disabled"}>
        <label for="exp-ein-t12">t₁₂ in ms:</label><input id="exp-ein-t12" class="exp-eingabe" inputmode="decimal" autocomplete="off" ${fertig ? "" : "disabled"}>
        <button class="knopf" id="exp-uebertragen" ${fertig ? "" : "disabled"}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${zustand.fahrt ? "Messung läuft — der Wagen rollt …" : (fertig ? "Lies t₁, t₂ und t₁₂ an der Zeitbox ab und trag sie ein." : "")}</p>
      <h3>Messtabelle</h3>
      <div style="overflow-x:auto">
      <table class="exp-tabelle"><thead><tr><th>Nr.</th><th>α in °</th><th>x₁ → x₂ in m</th><th>t₁ in ms</th><th>t₂ in ms</th><th>t₁₂ in ms</th><th>v₁ in m/s</th><th>v₂ in m/s</th></tr></thead>
      <tbody>${zustand.reihen.map((r, i) => `<tr><td>${i + 1}</td><td>${komma(r.alphaGrad, 1)}</td><td>${komma(r.x1, 2)} → ${komma(r.x2, 2)}</td><td>${komma(r.t1Ms, 1)}</td><td>${komma(r.t2Ms, 1)}</td><td>${komma(r.t12Ms, 1)}</td><td>${komma(r.v1, 3)}</td><td>${komma(r.v2, 3)}</td></tr>`).join("") || '<tr><td colspan="8">noch leer</td></tr>'}</tbody></table>
      </div>
      <p>${n} von mindestens 3 Messreihen — variiere Positionen und Winkel.</p>
      <button class="knopf" id="exp-weiter2" ${n >= 3 ? "" : "disabled"}>Zur Auswertung</button>`;
    bindeRegler();
    panel.querySelector("#exp-start").addEventListener("click", starteMessung);
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechsle("auswerten"));
    panel.querySelector("#exp-uebertrag").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const m = zustand.messung;
      if (!m || !m.fertig) { meldung.textContent = "Starte zuerst eine Messung."; return; }
      const e1 = parseDezimal(panel.querySelector("#exp-ein-t1").value);
      const e2 = parseDezimal(panel.querySelector("#exp-ein-t2").value);
      const e12 = parseDezimal(panel.querySelector("#exp-ein-t12").value);
      const falsch = [];
      if (!ablesungOk(e1, m.t1Ms, T_TOLERANZ_MS)) falsch.push("t₁");
      if (!ablesungOk(e2, m.t2Ms, T_TOLERANZ_MS)) falsch.push("t₂");
      if (!ablesungOk(e12, m.t12Ms, T_TOLERANZ_MS)) falsch.push("t₁₂");
      if (falsch.length) {
        meldung.textContent = `✗ ${falsch.join(", ")} stimmt so nicht — lies die Zeitbox noch einmal ab (auf 0,1 ms genau).`;
        return;
      }
      if (zustand.reihen.some(r => r.alphaGrad === zustand.alphaGrad && r.x1 === zustand.x1 && r.x2 === zustand.x2)) {
        meldung.textContent = "Diese Kombination hast du schon protokolliert — verschiebe eine Schranke oder ändere den Winkel.";
        return;
      }
      zustand.reihen.push({
        alphaGrad: zustand.alphaGrad, x1: zustand.x1, x2: zustand.x2,
        t1Ms: e1, t2Ms: e2, t12Ms: e12,
        v1: 50 / e1, v2: 50 / e2,   // 5 cm geteilt durch t in ms ergibt m/s
        aEingabe: NaN
      });
      zustand.messung = null;       // verbraucht — nächste Messung mit neuer Einstellung
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Übertragen — v₁ und v₂ stehen in der Tabelle. Stell etwas um und miss die nächste Reihe.";
    });
  }

  function baueVergleich(gruppen) {
    const schluessel = Object.keys(gruppen).sort((a, b) => Number(a) - Number(b));
    if (!schluessel.length) return "";
    const bloecke = schluessel.map(k => {
      const am = mittel(gruppen[k]);
      const akzeptiert = zustand.gsinEingaben[k];
      let inhalt;
      if (Number.isFinite(akzeptiert)) {
        const diff = akzeptiert - am;
        const mu = diff / (G * Math.cos(Number(k) * Math.PI / 180));
        inhalt = `<p>✓ Ohne Reibung wären es <strong>${komma(akzeptiert, 3)} m/s²</strong>, gemessen hast du ā = <strong>${komma(am, 3)} m/s²</strong>.
          Die Differenz <strong>${komma(diff, 3)} m/s²</strong> ist die <strong>Rollreibung</strong>! Aus µ·g·cos α folgt µ ≈ ${komma(mu, 4)}
          (Modellwert der Bahn: 0,008 — der kleine Rest steckt im Triggerpunkt der Schranken, siehe Fehlerbetrachtung).</p>`;
      } else {
        inhalt = `<form class="exp-ablesen" data-gsin="${k}">
          <label for="exp-gsin-${k}">Vergleichswert ohne Reibung, g·sin α in m/s²:</label>
          <input id="exp-gsin-${k}" class="exp-eingabe" inputmode="decimal" autocomplete="off">
          <button class="knopf">Prüfen</button>
        </form>`;
      }
      return `<div class="exp-hinweis">
        <p><strong>α = ${komma(Number(k), 1)}°:</strong> Mittelwert deiner Beschleunigungen ā = <strong>${komma(am, 3)} m/s²</strong> (${gruppen[k].length} ${gruppen[k].length > 1 ? "Reihen" : "Reihe"}).</p>
        ${inhalt}</div>`;
    });
    return `<h3>Vergleich mit der reibungsfreien Bahn</h3>${bloecke.join("")}`;
  }

  function baueBonus(reihen) {
    const fertige = reihen.filter(r => Number.isFinite(r.aEingabe));
    if (!fertige.length) return "";
    const zeilen = fertige.map(r => {
      const links = r.v2 * r.v2 - r.v1 * r.v1;
      const rechts = 2 * r.aEingabe * (r.x2 - r.x1);
      return `<tr><td>${komma(r.alphaGrad, 1)}</td><td>${komma(links, 3)}</td><td>${komma(rechts, 3)}</td></tr>`;
    }).join("");
    return `<details class="exp-fehler"><summary>Bonus: Gilt v₂² − v₁² = 2·a·Δx?</summary>
      <p>Das ist die zeitfreie Gleichung der gleichmäßig beschleunigten Bewegung. Vergleiche beide Seiten (in m²/s²):</p>
      <table class="exp-tabelle"><thead><tr><th>α in °</th><th>v₂² − v₁²</th><th>2·a·Δx</th></tr></thead><tbody>${zeilen}</tbody></table>
      <p>Kleine Unterschiede sind Messstreuung — die Gleichung bestätigt sich.</p></details>`;
  }

  function panelAuswerten() {
    const reihen = zustand.reihen;
    if (!reihen.length) {
      panel.innerHTML = `<h2>Auswertung</h2><p>Noch keine Messreihen — geh zur Durchführung und miss zuerst.</p>
        <button class="knopf" id="exp-zurueck">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechsle("messen"));
      return;
    }
    const offen = reihen.findIndex(r => !Number.isFinite(r.aEingabe));
    const gruppen = {};
    reihen.forEach(r => {
      if (!Number.isFinite(r.aEingabe)) return;
      const k = r.alphaGrad.toFixed(1);
      (gruppen[k] = gruppen[k] || []).push(r.aEingabe);
    });
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Berechne für jede Reihe die Beschleunigung <strong>a = (v₂ − v₁) / t₁₂</strong> — rechne t₁₂ dafür in Sekunden um.</p>
      <div style="overflow-x:auto">
      <table class="exp-tabelle"><thead><tr><th>Nr.</th><th>α in °</th><th>v₁ in m/s</th><th>v₂ in m/s</th><th>t₁₂ in ms</th><th>a in m/s²</th></tr></thead>
      <tbody>${reihen.map((r, i) => `<tr><td>${i + 1}</td><td>${komma(r.alphaGrad, 1)}</td><td>${komma(r.v1, 3)}</td><td>${komma(r.v2, 3)}</td><td>${komma(r.t12Ms, 1)}</td><td>${Number.isFinite(r.aEingabe) ? "✓ " + komma(r.aEingabe, 3) : "?"}</td></tr>`).join("")}</tbody></table>
      </div>
      <form id="exp-a-form" class="exp-ablesen">
        <label for="exp-a-reihe">Reihe</label>
        <select id="exp-a-reihe" class="exp-wahl">${reihen.map((r, i) => `<option value="${i}" ${i === (offen >= 0 ? offen : 0) ? "selected" : ""}>Nr. ${i + 1}</option>`).join("")}</select>
        <label for="exp-a-wert">a in m/s²:</label>
        <input id="exp-a-wert" class="exp-eingabe" inputmode="decimal" autocomplete="off">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      ${baueVergleich(gruppen)}
      ${baueBonus(reihen)}
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was steckt in den kleinen Abweichungen?</summary>
        <p><strong>Fahnenbreite:</strong> v = 5 cm/t ist eine <em>Durchschnitts</em>geschwindigkeit über die Fahnenbreite. Sie entspricht fast genau der Momentangeschwindigkeit in dem Augenblick, in dem die Fahnen<em>mitte</em> die Schranke passiert (Abweichung unter 0,3 % ab x = 0,15 m).</p>
        <p><strong>Ausrichtung und Triggerpunkt der Schranken:</strong> t₁₂ startet und stoppt, sobald die Fahnen<em>vorderkante</em> den Strahl unterbricht — v₁ und v₂ gehören aber zur Fahnen<em>mitte</em>. Dadurch fällt a systematisch um bis zu etwa 2–3 % zu klein aus. Im echten Aufbau kommt schief ausgerichtete Schrankenoptik dazu.</p>
        <p><strong>Elektronik:</strong> Die Zeitbox streut um ±0,2 ms — am stärksten wiegt das bei kurzen Fahnenzeiten, also bei steiler Bahn und weit unten platzierter Schranke.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf zweitrangig" id="exp-csv">Messdaten als CSV</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-a-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const i = Number(panel.querySelector("#exp-a-reihe").value);
      const r = reihen[i];
      const eingabe = parseDezimal(panel.querySelector("#exp-a-wert").value);
      const soll = aAusReihe(r.v1, r.v2, r.t12Ms);
      const meldung = panel.querySelector("#exp-meldung");
      if (!prozentOk(eingabe, soll, A_TOLERANZ_PROZENT)) {
        meldung.textContent = "✗ Das passt noch nicht. Rechne (v₂ − v₁) ÷ t₁₂ und setze t₁₂ in Sekunden ein — aus 731,2 ms werden 0,7312 s.";
        return;
      }
      r.aEingabe = eingabe;
      panelAuswerten();
      panel.querySelector("#exp-meldung").textContent = `✓ Reihe ${i + 1}: a = ${komma(eingabe, 3)} m/s² eingetragen.`;
    });
    panel.querySelectorAll("form[data-gsin]").forEach(f => f.addEventListener("submit", ev => {
      ev.preventDefault();
      const k = f.dataset.gsin;
      const eingabe = parseDezimal(f.querySelector("input").value);
      const soll = G * Math.sin(Number(k) * Math.PI / 180);
      const meldung = panel.querySelector("#exp-meldung");
      if (!prozentOk(eingabe, soll, 2)) {
        meldung.textContent = `✗ Rechne g·sin α für α = ${komma(Number(k), 1)}° mit g = 9,81 m/s² und runde auf drei Nachkommastellen.`;
        return;
      }
      zustand.gsinEingaben[k] = eingabe;
      panelAuswerten();
      panel.querySelector("#exp-meldung").textContent = "✓ Stimmt — vergleiche jetzt mit deinem Mittelwert.";
    }));
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("rollbahn-lichtschranken.csv",
        ["alpha_grad", "x1_m", "x2_m", "t1_ms", "t2_ms", "t12_ms", "v1_m_s", "v2_m_s", "a_m_s2"],
        reihen.map(r => [r.alphaGrad, r.x1, r.x2, r.t1Ms, r.t2Ms, r.t12Ms, r.v1, r.v2,
          Number.isFinite(r.aEingabe) ? r.aEingabe : ""]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechsle("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.reihen = []; zustand.gsinEingaben = {}; zustand.messung = null;
      zustand.sAnim = 0; zustand.alphaGrad = 5; zustand.x1 = 0.30; zustand.x2 = 1.20;
      zeichne();
      wechsle("aufbau");
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  zeichne();
  wechsle("aufbau");
}
