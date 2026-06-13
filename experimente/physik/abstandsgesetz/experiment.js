// experiment.js — Interaktives Experiment: Abstandsgesetz radioaktiver Strahlung
// (Klasse 10 / Qualifikationsphase). Realitätsnahe Messpraxis statt glatter Kurve:
// erst die NULLRATE bestimmen (Präparat im Bleitresor!), dann das GM-Zählrohr auf
// der Reiterschiene verschieben, Impulse in der Torzeit zählen, Position und
// Zählerstand SELBST ablesen und protokollieren. Die gezählten Impulse folgen
// einer deterministisch geseedeten Poisson-Statistik (Normal-Approximation):
// Zwei Läufe bei gleichem r liefern verschiedene N — die ±√N-Schwankung ist hier
// LERNINHALT, kein Fehler. Die Modulebene ist DOM-frei; alles Browser-Spezifische
// lebt in starteExperiment().

import {
  mulberry32, seedAus, streuung, parseDezimal, komma, mittel, esc, ablesungOk,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
export const R0 = 400;             // Imp/s — wahre Netto-Rate am Referenzabstand
export const R0_ABSTAND = 0.05;    // m — Referenzabstand r0
export const NULLRATE = 0.30;      // Imp/s — Umgebungsstrahlung (kosmisch + terrestrisch)
export const TORZEITEN = [10, 60, 100]; // s — wählbare Torzeiten des Impulszählers
export const NULL_TORZEIT = 100;   // s — feste Torzeit der Nullraten-Messung
export const R_MIN = 0.05, R_MAX = 0.50, R_SCHRITT = 0.01; // m — Reiterschiene
export const TOLERANZ_ABSTAND = 0.005;     // m — Eintrag der Positions-Ablesung
export const TOLERANZ_NULLRATE = 0.1;      // Imp/s — Eintrag R_null = N0/T
export const TOLERANZ_RKORR = 0.1;         // Imp/s — Eintrag R_korr = R − R_null
export const TOLERANZ_PRODUKT_PROZENT = 8; // % — Eintrag des Produkts R_korr·r²
export const MIN_ABSTAENDE = 6;    // verschiedene Abstände vor der Auswertung
export const PRODUKT_KONSTANTE = R0 * R0_ABSTAND * R0_ABSTAND; // = 1,0 Imp·m²/s

// ---------- Physik (rein, Node-testbar) ----------
// wahre Zählrate am Ort r: 1/r²-Gesetz der Punktquelle plus Nullrate
export function rateWahr(r) {
  return R0 * (R0_ABSTAND / r) * (R0_ABSTAND / r) + NULLRATE;
}

// Φ⁻¹(p): Quantilfunktion der Standardnormalverteilung als rationale Näherung
// nach Peter Acklam / Beasley-Springer-Moro (relativer Fehler < 1,2·10⁻⁹).
// Exportiert, damit die Zählstatistik in Node nachgeprüft werden kann.
export function inversNormal(p) {
  if (!(p > 0 && p < 1)) return NaN;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pu = 0.02425; // Übergang zwischen Zentral- und Randbereich
  if (p < pu) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pu) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// Poisson(mu), deterministisch geseedet, über die Normal-Approximation
// N = round(mu + √mu·z). Negative Ausreißer werden auf 0 geklemmt.
export function poissonGeseedet(mu, schluessel) {
  if (!(mu > 0)) return 0;
  const u = Math.min(1 - 1e-12, Math.max(1e-12, mulberry32(seedAus(schluessel))()));
  return Math.max(0, Math.round(mu + Math.sqrt(mu) * inversNormal(u)));
}

// gezählte Impulse einer Abstandsmessung; lauf zählt Wiederholungen hoch,
// damit zwei Messungen bei gleichem r verschiedene N liefern (Zählstatistik!)
export function zaehleImpulse(r, T, lauf) {
  return poissonGeseedet(rateWahr(r) * T, "zaehl:" + r + ":" + T + ":" + lauf);
}
// gezählte Impulse bei Präparat im Bleitresor: nur Umgebungsstrahlung
export function zaehleNullImpulse(T, lauf) {
  return poissonGeseedet(NULLRATE * T, "zaehl:tresor:" + T + ":" + lauf);
}

// ablesbare Reiterposition: wahres r plus ±2 mm Montage-/Skalenstreuung
export function abstandAngezeigt(r) {
  return r + streuung("skala:" + r, 0.004);
}

// ---------- Auswertelogik (rein) ----------
export function rateAus(n, t) { return n / t; }
export function rateKorrigiert(rate, rNull) { return rate - rNull; }
export function produkt(rateKorr, r) { return rateKorr * r * r; }
export function produktOk(eingabe, soll) {
  return Number.isFinite(eingabe) &&
         Math.abs(eingabe - soll) <= Math.abs(soll) * (TOLERANZ_PRODUKT_PROZENT / 100) + 1e-12;
}
export function anzahlAbstaende(messungen) {
  return new Set(messungen.map(m => m.r)).size;
}
// erstes Paar „gleicher Abstand, gleiche Torzeit, zweimal gezählt“
export function findeDoppelpaar(messungen) {
  for (let i = 0; i < messungen.length; i++) {
    for (let j = i + 1; j < messungen.length; j++) {
      if (messungen[i].r === messungen[j].r && messungen[i].T === messungen[j].T) {
        return [messungen[i], messungen[j]];
      }
    }
  }
  return null;
}
export function bereitFuerAuswertung(messungen) {
  return anzahlAbstaende(messungen) >= MIN_ABSTAENDE && findeDoppelpaar(messungen) !== null;
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "R(r)-Kontrollwerte: 400,3 / 100,3 / 25,3 / 4,3 Imp/s", ok: () =>
      Math.abs(rateWahr(0.05) - 400.3) < 1e-9 &&
      Math.abs(rateWahr(0.10) - 100.3) < 1e-9 &&
      Math.abs(rateWahr(0.20) - 25.3) < 1e-9 &&
      Math.abs(rateWahr(0.50) - 4.3) < 1e-9 },
  { name: "inversNormal(0,5) = 0 exakt", ok: () => inversNormal(0.5) === 0 },
  { name: "inversNormal: Φ⁻¹(0,975) ≈ 1,960 und Φ⁻¹(0,999) ≈ 3,090 (±0,01)", ok: () =>
      Math.abs(inversNormal(0.975) - 1.959964) <= 0.01 &&
      Math.abs(inversNormal(0.999) - 3.090232) <= 0.01 &&
      Math.abs(inversNormal(0.841345) - 1.0) <= 0.01 },
  { name: "inversNormal antisymmetrisch: Φ⁻¹(p) = −Φ⁻¹(1−p)", ok: () =>
      Math.abs(inversNormal(0.8) + inversNormal(0.2)) < 1e-9 &&
      Math.abs(inversNormal(0.975) + inversNormal(0.025)) < 1e-9 &&
      Math.abs(inversNormal(0.999) + inversNormal(0.001)) < 1e-6 },
  { name: "Zählung deterministisch reproduzierbar", ok: () =>
      zaehleImpulse(0.1, 100, 1) === zaehleImpulse(0.1, 100, 1) &&
      zaehleImpulse(0.27, 60, 2) === zaehleImpulse(0.27, 60, 2) &&
      zaehleNullImpulse(100, 1) === zaehleNullImpulse(100, 1) },
  { name: "Doppelmessung: zwei Läufe → verschiedene N (Beispiele)", ok: () =>
      zaehleImpulse(0.1, 100, 1) !== zaehleImpulse(0.1, 100, 2) &&
      zaehleImpulse(0.2, 60, 1) !== zaehleImpulse(0.2, 60, 2) &&
      zaehleNullImpulse(100, 1) !== zaehleNullImpulse(100, 2) },
  { name: "Zählstatistik: |N − R·T| ≤ 5·√(R·T) für 60 Kombinationen", ok: () => {
      for (let k = 0; k < 10; k++) {
        const r = Math.round((0.05 + k * 0.05) * 100) / 100;
        for (const T of TORZEITEN) {
          for (const lauf of [1, 2]) {
            const mu = rateWahr(r) * T;
            const n1 = zaehleImpulse(r, T, lauf);
            if (n1 !== zaehleImpulse(r, T, lauf)) return false;       // deterministisch
            if (Math.abs(n1 - mu) > 5 * Math.sqrt(mu) + 0.5) return false; // 5σ-Schranke
          }
        }
      }
      return true;
    } },
  { name: "Pipeline: perfekte Raten → R_korr·r² exakt konstant (= 1,0)", ok: () =>
      [0.05, 0.08, 0.1, 0.16, 0.2, 0.25, 0.32, 0.4, 0.5].every(r =>
        Math.abs(produkt(rateKorrigiert(rateWahr(r), NULLRATE), r) - PRODUKT_KONSTANTE) < 1e-12) },
  { name: "Nullraten-Falle: ohne Abzug +7,5 % bei r = 0,50 m", ok: () => {
      const verzerrung = (produkt(rateWahr(0.5), 0.5) / PRODUKT_KONSTANTE - 1) * 100;
      return Math.abs(verzerrung - 7.5) < 0.05; // 4,3/4,0 = 1,075 → +7,5 %
    } },
  { name: "Verdopplung 0,10 m → 0,20 m: R_korr viertelt sich exakt", ok: () => {
      const faktor = rateKorrigiert(rateWahr(0.2), NULLRATE) / rateKorrigiert(rateWahr(0.1), NULLRATE);
      return Math.abs(faktor - 0.25) < 1e-12;
    } },
  { name: "Klemmen: N nie negativ, Poisson(0) = 0", ok: () => {
      if (poissonGeseedet(0, "leer") !== 0) return false;
      for (let lauf = 1; lauf <= 300; lauf++) {
        if (poissonGeseedet(0.8, "klemmtest:" + lauf) < 0) return false;
      }
      return true;
    } },
  { name: "Nullmessung: N₀ nahe 30 bei T = 100 s", ok: () => {
      const n0 = zaehleNullImpulse(100, 1);
      return n0 >= 0 && Math.abs(n0 - 30) <= 5 * Math.sqrt(30);
    } },
  { name: "Skalen-Anzeige höchstens ±2 mm neben r (alle Rasterwerte)", ok: () => {
      for (let k = 0; k <= 45; k++) {
        const r = Math.round((R_MIN + k * R_SCHRITT) * 100) / 100;
        if (Math.abs(abstandAngezeigt(r) - r) > 0.002 + 1e-12) return false;
      }
      return true;
    } },
  { name: "Messreihen-Logik: Abstands-Zählung und Doppelpaar", ok: () => {
      const m = [
        { r: 0.05, T: 10 }, { r: 0.1, T: 100 }, { r: 0.1, T: 100 },
        { r: 0.2, T: 60 }, { r: 0.3, T: 10 }, { r: 0.4, T: 10 }
      ];
      const paar = findeDoppelpaar(m);
      return anzahlAbstaende(m) === 5 && paar !== null && paar[0].r === 0.1 &&
             !bereitFuerAuswertung(m) &&
             bereitFuerAuswertung(m.concat([{ r: 0.5, T: 10 }])) &&
             findeDoppelpaar([{ r: 0.1, T: 10 }, { r: 0.1, T: 100 }]) === null;
    } },
  { name: "Eingabe-Toleranzen: Produkt ±8 %, Ablesung ±5 mm", ok: () =>
      produktOk(1.07, 1.0) && produktOk(0.93, 1.0) && !produktOk(1.09, 1.0) && !produktOk(NaN, 1.0) &&
      ablesungOk(0.118, 0.1203, TOLERANZ_ABSTAND) && !ablesungOk(0.114, 0.1203, TOLERANZ_ABSTAND) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    phase: "aufbau",
    r: 0.10,            // Reiterposition (Sollwert des Schiebers) in m
    torzeit: 100,       // gewählte Torzeit in s
    tresor: true,       // Präparat noch im Bleitresor?
    nullN: null,        // gezählte Impulse der Nullmessung
    nullRate: null,     // akzeptierter Schülerwert für R_null in Imp/s
    laufZaehler: {},    // "r:T" → wie oft dort schon gezählt wurde
    zaehlung: null,     // { art, r, T, N, lauf, fertig, verbucht }
    anzeigeN: 0,        // aktueller Stand des Displays
    fortschritt: 0,     // 0…1 der laufenden Torzeit
    messungen: [],      // { r, rAbgelesen, T, N, lauf }
    vorhersage: ""
  };
  let animId = 0;

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="400" height="460" aria-label="Versuchsaufbau: Reiterschiene mit Zentimeterskala, links das Gamma-Präparat beziehungsweise der geschlossene Bleitresor, darauf ein verschiebbares Geiger-Müller-Zählrohr mit Ablesekante. Darunter eine Lupe mit Millimeterteilung an der Ablesekante und ein digitaler Impulszähler mit Torzeit-Anzeige und Fortschrittsbalken."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zählung starten / beenden (Torzeit im Zeitraffer) ----------
  function starteZaehlung(art) {
    const T = art === "null" ? NULL_TORZEIT : zustand.torzeit;
    const schluessel = (art === "null" ? "tresor" : zustand.r) + ":" + T;
    const lauf = (zustand.laufZaehler[schluessel] || 0) + 1;
    zustand.laufZaehler[schluessel] = lauf;
    const N = art === "null" ? zaehleNullImpulse(T, lauf) : zaehleImpulse(zustand.r, T, lauf);
    zustand.zaehlung = { art, r: zustand.r, T, N, lauf, fertig: false, verbucht: false };
    zustand.anzeigeN = 0;
    zustand.fortschritt = 0;
    cancelAnimationFrame(animId);
    if (reduziert) { beendeZaehlung(); return; } // reduzierte Bewegung: Endstand sofort
    const start = performance.now(), dauer = 2600;
    const tick = jetzt => {
      const t = Math.min(1, (jetzt - start) / dauer);
      zustand.fortschritt = t;
      zustand.anzeigeN = Math.round(zustand.zaehlung.N * t);
      zeichne();
      if (t < 1) animId = requestAnimationFrame(tick);
      else beendeZaehlung();
    };
    animId = requestAnimationFrame(tick);
    panelMessen(); // Bedienelemente während der Torzeit sperren
  }
  function beendeZaehlung() {
    zustand.fortschritt = 1;
    zustand.anzeigeN = zustand.zaehlung.N;
    zustand.zaehlung.fertig = true;
    zeichne();
    if (zustand.phase === "messen") panelMessen("✓ Torzeit abgelaufen — lies den Endstand N ab.");
  }

  // ---------- Zeichnung ----------
  const X0 = 44, PXM = 620;                  // Skalen-Null (Präparat-Vorderkante) und px pro Meter
  const posX = m => X0 + m * PXM;

  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"),
          cFlaeche = farbe("--flaeche"), cHauch = farbe("--hauch", "#eee");
    function rrect(x, y, b, hh, rad) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, b, hh, rad); else ctx.rect(x, y, b, hh);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";

    const angezeigt = abstandAngezeigt(zustand.r);

    // --- Reiterschiene mit cm-Skala ---
    ctx.fillStyle = cText; ctx.fillRect(16, 146, 360, 8);
    for (let cm = 0; cm <= 52; cm++) {
      const x = posX(cm / 100);
      const lang = cm % 5 === 0 ? 11 : 6;
      ctx.strokeStyle = cm % 5 === 0 ? cText : cLeise; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 158); ctx.lineTo(x, 158 + lang); ctx.stroke();
      if (cm % 5 === 0) {
        ctx.fillStyle = cText; ctx.textAlign = "center";
        ctx.fillText(String(cm), x, 182);
      }
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("cm", 372, 182);

    if (zustand.tresor) {
      // --- Bleitresor (Präparat sicher verwahrt) ---
      ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 3;
      ctx.fillRect(16, 98, 64, 48); ctx.strokeRect(16, 98, 64, 48);
      ctx.fillStyle = cText; ctx.font = "bold 16px system-ui, sans-serif"; ctx.textAlign = "center";
      ctx.fillText("Pb", 48, 128);
      ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cLeise; ctx.textAlign = "start";
      ctx.fillText("Bleitresor", 16, 92);
    } else {
      // --- Präparat auf der Schiene (Vorderkante = Skalen-Null) ---
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
      ctx.fillRect(X0 - 24, 114, 20, 32); ctx.strokeRect(X0 - 24, 114, 20, 32);
      rrect(X0 - 12, 123, 12, 16, 3); ctx.fillStyle = cHauch; ctx.fill(); ctx.stroke();
      ctx.fillStyle = cAkzent; ctx.beginPath(); ctx.arc(X0 - 6, 131, 3, 0, 7); ctx.fill();
      ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText;
      ctx.fillRect(X0 - 26, 146, 24, 10); ctx.strokeRect(X0 - 26, 146, 24, 10);
      ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("Präparat (γ)", 16, 108);
      // angedeutete Strahlung
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
      for (const dy of [-12, 0, 12]) {
        ctx.beginPath(); ctx.moveTo(X0 + 3, 131); ctx.lineTo(X0 + 40, 131 + dy); ctx.stroke();
      }
      ctx.setLineDash([]);
    }

    // --- GM-Zählrohr auf dem Reiter (Fenster = Ablesekante) ---
    const xF = posX(angezeigt);
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.fillRect(xF, 116, 6, 30); ctx.strokeRect(xF, 116, 6, 30);
    ctx.beginPath(); ctx.moveTo(xF, 126); ctx.lineTo(xF + 6, 126); ctx.moveTo(xF, 136); ctx.lineTo(xF + 6, 136); ctx.stroke();
    ctx.lineWidth = 2; rrect(xF + 6, 116, 36, 30, 5);
    ctx.fillStyle = cFlaeche; ctx.fill(); ctx.strokeStyle = cText; ctx.stroke();
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.fillRect(xF + 8, 146, 28, 10); ctx.strokeRect(xF + 8, 146, 28, 10);
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("GM-Rohr", Math.min(xF + 21, 352), 110);
    // Ablesekante
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(xF, 112); ctx.lineTo(xF, 168); ctx.stroke();
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.moveTo(xF, 176); ctx.lineTo(xF - 5, 167); ctx.lineTo(xF + 5, 167); ctx.closePath(); ctx.fill();

    // --- Lupe: Millimeter-Ablesung an der Ablesekante ---
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.strokeRect(20, 196, 352, 72);
    ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("Lupe an der Ablesekante — 1 Teilstrich = 1 mm", 26, 210);
    const LX = 30, LB = 332, PXZ = LB / 0.03;       // Fenster: ±1,5 cm um die Reiterstellung
    const wm = zustand.r - 0.015;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.fillRect(LX, 216, LB, 30); ctx.strokeRect(LX, 216, LB, 30);
    for (let mm = Math.ceil(wm * 1000); mm <= Math.floor((wm + 0.03) * 1000); mm++) {
      const x = LX + (mm / 1000 - wm) * PXZ;
      if (x < LX || x > LX + LB) continue;
      const lang = mm % 10 === 0 ? 22 : (mm % 5 === 0 ? 15 : 9);
      ctx.strokeStyle = mm % 10 === 0 ? cText : cLeise;
      ctx.beginPath(); ctx.moveTo(x, 216); ctx.lineTo(x, 216 + lang); ctx.stroke();
      if (mm % 10 === 0) {
        ctx.fillStyle = cText; ctx.textAlign = "center";
        ctx.fillText(String(mm / 10), x, 260);
      }
    }
    const ax = LX + (angezeigt - wm) * PXZ;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ax, 213); ctx.lineTo(ax, 250); ctx.stroke();
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.moveTo(ax, 213); ctx.lineTo(ax - 4, 205); ctx.lineTo(ax + 4, 205); ctx.closePath(); ctx.fill();

    // --- digitaler Impulszähler ---
    const z = zustand.zaehlung;
    const laeuft = z && !z.fertig;
    rrect(20, 280, 368, 170, 10);
    ctx.fillStyle = cFlaeche; ctx.fill(); ctx.strokeStyle = cText; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Digitaler Impulszähler", 34, 302);
    ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = cLeise; ctx.textAlign = "end";
    ctx.fillText("Eingang: GM-Rohr", 374, 302);
    // Display
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(34, 312, 212, 50); ctx.strokeRect(34, 312, 212, 50);
    ctx.fillStyle = cText; ctx.font = "bold 30px ui-monospace, Consolas, monospace"; ctx.textAlign = "end";
    ctx.fillText(String(zustand.anzeigeN), 238, 348);
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("Impulse N — Endstand bleibt stehen", 34, 378);
    // Torzeit + Status
    const anzeigeT = z && !z.verbucht ? z.T : (zustand.nullRate === null ? NULL_TORZEIT : zustand.torzeit);
    ctx.fillStyle = cLeise; ctx.fillText("Torzeit", 262, 324);
    ctx.fillStyle = cText; ctx.font = "bold 16px system-ui, sans-serif";
    ctx.fillText("T = " + anzeigeT + " s", 262, 344);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillText(z ? (z.fertig ? "fertig ✓" : "zählt …") : "bereit", 262, 364);
    // Fortschrittsbalken der Torzeit
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.strokeRect(34, 392, 330, 14);
    if (z) {
      ctx.fillStyle = cAkzent;
      ctx.fillRect(35, 393, 328 * (z.fertig ? 1 : zustand.fortschritt), 12);
    }
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText(
      laeuft ? "Torzeit läuft: noch " + Math.ceil(z.T * (1 - zustand.fortschritt)) + " s von " + z.T + " s" :
      z && !z.verbucht ? "Tor geschlossen — N ablesen und eintragen." :
      z ? "Zeile verbucht — bereit für die nächste Zählung." :
      "Bereit. Torzeit: " + anzeigeT + " s.", 199, 424);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Zeitraffer: Die echte Torzeit dauert wirklich T Sekunden.", 199, 442);
    ctx.textAlign = "start";
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf einer <strong>Reiterschiene</strong> mit Zentimeterskala sitzt links ein <strong>Gamma-Präparat</strong> (schwache Schulquelle) — noch sicher im <strong>Bleitresor</strong>. Ein <strong>Geiger-Müller-Zählrohr</strong> ist auf einem Reiter verschiebbar; seine Impulse sammelt der <strong>digitale Impulszähler</strong>, solange die wählbare <strong>Torzeit</strong> läuft (10 s, 60 s oder 100 s).</p>
      <p><strong>Plan:</strong> (1) Zuerst die <strong>Nullrate</strong> messen — das Rohr tickt auch ohne Präparat! (2) Dann die Zählrate bei mindestens ${MIN_ABSTAENDE} Abständen zwischen 0,05 m und 0,50 m bestimmen, einen Abstand davon <strong>doppelt</strong>. (3) In der Auswertung ziehst du die Nullrate ab und prüfst, ob R<sub>korr</sub>·r² konstant ist — das wäre das 1/r²-Gesetz.</p>
      <p class="exp-hinweis">⚠ Im echten Labor gelten die drei A des Strahlenschutzes: <strong>A</strong>bstand halten, <strong>A</strong>bschirmung nutzen, <strong>A</strong>ufenthaltsdauer kurz. Präparate nur mit der Zange greifen — und sofort zurück in den Tresor.</p>
      <label for="exp-vorhersage"><strong>Deine Vorhersage:</strong> Was passiert mit der Zählrate, wenn du den Abstand verdoppelst?</label>
      <select id="exp-vorhersage" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="halb"${zustand.vorhersage === "halb" ? " selected" : ""}>Sie halbiert sich.</option>
        <option value="viertel"${zustand.vorhersage === "viertel" ? " selected" : ""}>Sie viertelt sich.</option>
        <option value="gleich"${zustand.vorhersage === "gleich" ? " selected" : ""}>Sie bleibt gleich, schwankt nur stärker.</option>
      </select>
      <p id="exp-vorhersage-meldung" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-vorhersage").addEventListener("change", ev => {
      zustand.vorhersage = ev.target.value;
      panel.querySelector("#exp-vorhersage-meldung").textContent =
        ev.target.value ? "Notiert — am Ende prüfst du das an deinen eigenen Messwerten." : "";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen(meldung = "") {
    const z = zustand.zaehlung;
    const laeuft = z && !z.fertig;

    // --- Schritt 1: Nullrate (Präparat im Tresor) ---
    if (zustand.nullRate === null) {
      const formBereit = z && z.art === "null" && z.fertig && !z.verbucht;
      panel.innerHTML = `
        <h2>Durchführung</h2>
        <h3>Schritt 1 · Nullrate bestimmen</h3>
        <p>Das Präparat liegt noch im <strong>Bleitresor</strong> — trotzdem zählt das Rohr ab und zu: <strong>Umgebungsstrahlung</strong> aus Kosmos und Baustoffen. Diese <strong>Nullrate</strong> gehört nicht zum Präparat; du musst sie später von jeder Messung abziehen.</p>
        <button class="knopf" id="exp-nullstart" ${laeuft ? "disabled" : ""}>Nullmessung starten (T = 100 s)</button>
        <form id="exp-nullform" class="exp-ablesen">
          <label for="exp-nullwert">Rechne selbst: R<sub>null</sub> = N₀ / 100 s =</label>
          <input id="exp-nullwert" inputmode="decimal" autocomplete="off" size="7" ${formBereit ? "" : "disabled"}>
          <span>Imp/s</span>
          <button class="knopf" ${formBereit ? "" : "disabled"}>Eintragen</button>
        </form>
        <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(meldung)}</p>
        <p>Erst wenn die Nullrate notiert ist, kommt das Präparat aus dem Tresor.</p>`;
      panel.querySelector("#exp-nullstart").addEventListener("click", () => starteZaehlung("null"));
      panel.querySelector("#exp-nullform").addEventListener("submit", ev => {
        ev.preventDefault();
        if (!formBereit) return;
        const eingabe = parseDezimal(panel.querySelector("#exp-nullwert").value);
        if (!ablesungOk(eingabe, z.N / NULL_TORZEIT, TOLERANZ_NULLRATE)) {
          panel.querySelector("#exp-meldung").textContent =
            "✗ Teile den Endstand N₀ durch die Torzeit 100 s — Beispiel: 28 Impulse → 0,28 Imp/s.";
          return;
        }
        z.verbucht = true;
        zustand.nullN = z.N;
        zustand.nullRate = eingabe;
        zeichne();
        panelMessen("✓ Nullrate notiert: R_null = " + komma(eingabe, 2) + " Imp/s.");
      });
      return;
    }

    // --- Zwischenschritt: Tresor öffnen ---
    if (zustand.tresor) {
      panel.innerHTML = `
        <h2>Durchführung</h2>
        <p>✓ Nullrate: <strong>R<sub>null</sub> = ${komma(zustand.nullRate, 2)} Imp/s</strong> (deine Messung: ${zustand.nullN} Impulse in 100 s).</p>
        <p>Jetzt kommt das Präparat auf die Schiene — seine Vorderkante sitzt genau an der <strong>0-cm-Marke</strong>. Im echten Labor: Zange benutzen, kurze Wege, Tresor sofort wieder schließen.</p>
        <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(meldung)}</p>
        <button class="knopf" id="exp-tresor">Präparat einsetzen (Tresor öffnen)</button>`;
      panel.querySelector("#exp-tresor").addEventListener("click", () => {
        zustand.tresor = false;
        zeichne();
        panelMessen("Das Präparat strahlt — ab jetzt zählt das Rohr deutlich schneller.");
      });
      return;
    }

    // --- Schritt 2: Zählrate über dem Abstand ---
    const formBereit = z && z.art === "abstand" && z.fertig && !z.verbucht;
    const abstaende = anzahlAbstaende(zustand.messungen);
    const doppel = findeDoppelpaar(zustand.messungen) !== null;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <h3>Schritt 2 · Zählrate bei verschiedenen Abständen</h3>
      <div class="exp-regler">
        <label for="exp-r">Zählrohr-Reiter verschieben: <strong id="exp-rwert">${komma(zustand.r, 2)} m</strong></label>
        <input type="range" id="exp-r" min="${R_MIN}" max="${R_MAX}" step="${R_SCHRITT}" value="${zustand.r}" ${laeuft ? "disabled" : ""}>
      </div>
      <label for="exp-torzeit"><strong>Torzeit wählen:</strong></label>
      <select id="exp-torzeit" class="exp-wahl" ${laeuft ? "disabled" : ""}>
        ${TORZEITEN.map(t => `<option value="${t}"${t === zustand.torzeit ? " selected" : ""}>${t} s</option>`).join("")}
      </select>
      <button class="knopf" id="exp-start" ${laeuft ? "disabled" : ""}>Zählen starten</button>
      <form id="exp-eintrag" class="exp-ablesen">
        <label for="exp-r-eintrag">Abgelesen: r in m</label>
        <input id="exp-r-eintrag" inputmode="decimal" autocomplete="off" size="7" ${formBereit ? "" : "disabled"}>
        <label for="exp-n-eintrag">N</label>
        <input id="exp-n-eintrag" inputmode="numeric" autocomplete="off" size="7" ${formBereit ? "" : "disabled"}>
        <button class="knopf" ${formBereit ? "" : "disabled"}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(meldung)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>r in m</th><th>T in s</th><th>N</th><th>R = N/T in Imp/s</th></tr></thead>
      <tbody>${zustand.messungen.map(m =>
        `<tr><td>${komma(m.rAbgelesen, 3)}</td><td>${m.T}</td><td>${m.N}</td><td>${komma(m.N / m.T, 2)}</td></tr>`).join("") ||
        '<tr><td colspan="4">noch leer</td></tr>'}</tbody></table>
      <p>Bisher: <strong>${abstaende}</strong> von mindestens ${MIN_ABSTAENDE} Abständen · Doppelmessung (gleicher Abstand, gleiche Torzeit, zweimal): <strong>${doppel ? "✓" : "steht noch aus"}</strong></p>
      <p class="exp-hinweis">Tipp für eine starke Messreihe: kleine <em>und</em> große Abstände, einen Abstand doppelt zählen — und nimm mindestens je eine Messung mit 10 s und mit 100 s Torzeit auf (für die Auswertung spannend!).</p>
      <button class="knopf" id="exp-weiter2" ${bereitFuerAuswertung(zustand.messungen) ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelector("#exp-r").addEventListener("input", ev => {
      zustand.r = Math.round(parseDezimal(ev.target.value) * 100) / 100;
      const zz = zustand.zaehlung;
      if (zz && zz.art === "abstand" && zz.fertig && !zz.verbucht) {
        zustand.zaehlung = null; zustand.anzeigeN = 0; zustand.fortschritt = 0;
        zeichne();
        panelMessen("Reiter verschoben — die nicht eingetragene Zählung ist verworfen. Starte neu.");
        return;
      }
      panel.querySelector("#exp-rwert").textContent = komma(zustand.r, 2) + " m";
      zeichne();
    });
    panel.querySelector("#exp-torzeit").addEventListener("change", ev => {
      zustand.torzeit = Number(ev.target.value);
      zeichne();
    });
    panel.querySelector("#exp-start").addEventListener("click", () => starteZaehlung("abstand"));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-eintrag").addEventListener("submit", ev => {
      ev.preventDefault();
      const zz = zustand.zaehlung;
      if (!(zz && zz.art === "abstand" && zz.fertig && !zz.verbucht)) return;
      const er = parseDezimal(panel.querySelector("#exp-r-eintrag").value);
      const en = parseDezimal(panel.querySelector("#exp-n-eintrag").value);
      const meldungEl = panel.querySelector("#exp-meldung");
      if (!ablesungOk(er, abstandAngezeigt(zz.r), TOLERANZ_ABSTAND)) {
        meldungEl.textContent = "✗ Lies die Ablesekante an der Lupe ab und gib r in Metern an (z. B. 0,118) — auf ±5 mm genau.";
        return;
      }
      if (!Number.isFinite(en) || en !== zz.N) {
        meldungEl.textContent = "✗ Tippe den Zählerstand N exakt vom Display ab — Ziffer für Ziffer, ohne Rundung.";
        return;
      }
      const fruehere = zustand.messungen.find(m => m.r === zz.r && m.T === zz.T);
      zz.verbucht = true;
      zustand.messungen.push({ r: zz.r, rAbgelesen: er, T: zz.T, N: zz.N, lauf: zz.lauf });
      let text = "✓ Eingetragen — R = N/T habe ich für dich ausgerechnet: " + komma(zz.N / zz.T, 2) + " Imp/s.";
      if (fruehere && fruehere.N !== zz.N) {
        text += " Gleicher Abstand, gleiche Torzeit — und trotzdem ein anderes N als vorhin (" + fruehere.N + "): Das ist Zählstatistik, kein Fehler!";
      } else if (fruehere) {
        text += " Diesmal zufällig exakt dasselbe N wie vorhin — auch das kommt beim Zufall vor.";
      }
      zeichne();
      panelMessen(text);
    });
  }

  function panelAuswerten() {
    if (!bereitFuerAuswertung(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Für eine belastbare Auswertung brauchst du <strong>mindestens ${MIN_ABSTAENDE} verschiedene Abstände</strong> und <strong>eine Doppelmessung</strong> (gleicher Abstand, gleiche Torzeit, zweimal gezählt).</p>
        <p>Aktuell: ${anzahlAbstaende(zustand.messungen)} Abstände · Doppelmessung: ${findeDoppelpaar(zustand.messungen) ? "✓" : "fehlt noch"}.</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const rNull = zustand.nullRate;
    const zeilen = [...zustand.messungen].sort((a, b) => a.r - b.r || a.T - b.T || a.lauf - b.lauf);
    const exakt = zeilen.map(m => {
      const R = rateAus(m.N, m.T);
      const k = rateKorrigiert(R, rNull);
      return { R, k, p: produkt(k, m.rAbgelesen) };
    });
    const dp = findeDoppelpaar(zeilen);
    const kurz = zeilen.find(m => m.T === 10), lang = zeilen.find(m => m.T === 100);
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <h3>1 · Nullrate abziehen, Produkt bilden</h3>
      <p>Deine Nullrate: <strong>R<sub>null</sub> = ${komma(rNull, 2)} Imp/s</strong>. Rechne jede Zeile fertig: erst <strong>R<sub>korr</sub> = R − R<sub>null</sub></strong>, dann das Produkt <strong>R<sub>korr</sub>·r²</strong> (mit r in m; r² = r·r). Komma oder Punkt — beides geht.</p>
      <form id="exp-auswform">
        <table class="exp-tabelle"><thead><tr><th>r in m</th><th>T in s</th><th>N</th><th>R in Imp/s</th><th>R<sub>korr</sub> in Imp/s</th><th>R<sub>korr</sub>·r² in Imp·m²/s</th></tr></thead>
        <tbody>${zeilen.map((m, i) => `<tr>
          <td>${komma(m.rAbgelesen, 3)}</td><td>${m.T}</td><td>${m.N}</td><td>${komma(exakt[i].R, 2)}</td>
          <td><input class="exp-eingabe" id="exp-k-${i}" inputmode="decimal" autocomplete="off" aria-label="R korrigiert Zeile ${i + 1}"> <span id="exp-k-ok-${i}" aria-live="polite"></span></td>
          <td><input class="exp-eingabe" id="exp-p-${i}" inputmode="decimal" autocomplete="off" aria-label="Produkt Zeile ${i + 1}"> <span id="exp-p-ok-${i}" aria-live="polite"></span></td>
        </tr>`).join("")}</tbody></table>
        <button class="knopf zweitrangig">Zeilen prüfen</button>
      </form>
      <p id="exp-ausw-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>2 · Schnell-Check: Abstand verdoppeln</h3>
      <p>Vergleiche r = 0,10 m mit r = 0,20 m (nimm deine eigenen Zeilen, wenn du beide hast): Auf welchen Bruchteil fällt R<sub>korr</sub> beim Verdoppeln des Abstands? Gib den Faktor als Dezimalzahl an.</p>
      <form id="exp-doppelform" class="exp-ablesen">
        <label for="exp-doppel">R<sub>korr</sub>(2r) / R<sub>korr</sub>(r) ≈</label>
        <input id="exp-doppel" inputmode="decimal" autocomplete="off" size="6">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-doppel-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>3 · Erkenntnisfragen</h3>
      <p><strong>Warum liefern zwei Zählungen bei gleichem Abstand verschiedene N?</strong></p>
      <select id="exp-f1" class="exp-wahl" aria-label="Antwort zu Frage 1 auswählen">
        <option value="">— Antwort wählen —</option>
        <option value="a">Das Zählrohr ist defekt und zählt unzuverlässig.</option>
        <option value="b">Der radioaktive Zerfall ist ein Zufallsprozess — N schwankt von Natur aus um etwa ±√N.</option>
        <option value="c">Die Quelle wird zwischen den beiden Messungen merklich schwächer.</option>
        <option value="d">Die Torzeit-Elektronik rundet die Sekunden zufällig auf oder ab.</option>
      </select>
      <button class="knopf zweitrangig" id="exp-f1k">Antwort prüfen</button>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite"></p>
      <p><strong>Wie wird die relative Schwankung √N/N kleiner?</strong></p>
      <select id="exp-f2" class="exp-wahl" aria-label="Antwort zu Frage 2 auswählen">
        <option value="">— Antwort wählen —</option>
        <option value="a">Kürzer zählen, damit weniger Zeit für Schwankungen bleibt.</option>
        <option value="b">Länger zählen: Je größer N, desto kleiner √N/N = 1/√N.</option>
        <option value="c">Die Nullrate abziehen — das glättet die Werte.</option>
        <option value="d">Das Zählrohr näher an die Quelle schieben — dann stimmt jeder Abstand besser.</option>
      </select>
      <button class="knopf zweitrangig" id="exp-f2k">Antwort prüfen</button>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite"></p>
      <p><strong>Warum muss die Nullrate abgezogen werden?</strong></p>
      <select id="exp-f3" class="exp-wahl" aria-label="Antwort zu Frage 3 auswählen">
        <option value="">— Antwort wählen —</option>
        <option value="a">Muss sie nicht — bei kurzen Torzeiten fällt sie ohnehin nicht ins Gewicht.</option>
        <option value="b">Sonst erscheinen die Raten bei großen Abständen zu hoch — der Untergrund verbiegt das 1/r²-Gesetz.</option>
        <option value="c">Weil die Umgebungsstrahlung vom Präparat angeregt wird und mitwächst.</option>
        <option value="d">Damit alle Produkte exakt gleich werden — ohne Abzug wären sie nur zufällig verschieden.</option>
      </select>
      <button class="knopf zweitrangig" id="exp-f3k">Antwort prüfen</button>
      <p id="exp-f3-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>4 · Strahlenschutz: Warum Abstand so wirksam ist</h3>
      <p>Doppelter Abstand = ein <strong>Viertel</strong> der Dosisleistung, zehnfacher Abstand = ein <strong>Hundertstel</strong>. Deshalb ist Abstand die einfachste und wirksamste Schutzmaßnahme — genau das hast du hier quantitativ nachgemessen. Dazu kommen Abschirmung (dein Bleitresor!) und kurze Aufenthaltsdauer.</p>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was das Modell vereinfacht</summary>
        <p><strong>Endliche Detektorfläche und Quellengröße:</strong> Das 1/r²-Gesetz gilt für Punktquellen. Bei sehr kleinem r sind Präparat und Zählrohrfenster nicht mehr „punktförmig“, und die Frage „Wo genau beginnt r — am Fenster oder am Zähldraht?“ wird wichtig. Echte Messungen weichen dort systematisch ab.</p>
        <p><strong>Totzeit (Ausblick):</strong> Nach jedem Impuls ist ein GM-Zählrohr für rund 100 µs blind. Bei hohen Raten (kleines r!) gehen Impulse verloren — echte Zähler zählen dort systematisch zu wenig.</p>
        <p><strong>Streustrahlung:</strong> Tisch, Wände und Stativmaterial streuen Photonen ins Rohr — ein Teil des Untergrunds hängt sogar vom Aufbau ab.</p>
        <p><strong>Und immer dabei:</strong> ±√N. Zählstatistik verschwindet nie — sie wird mit längerer Torzeit nur <em>relativ</em> kleiner.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-auswform").addEventListener("submit", ev => {
      ev.preventDefault();
      let alleOk = true;
      zeilen.forEach((m, i) => {
        const wk = parseDezimal(panel.querySelector("#exp-k-" + i).value);
        const kOk = Number.isFinite(wk) && Math.abs(wk - exakt[i].k) <= TOLERANZ_RKORR;
        panel.querySelector("#exp-k-ok-" + i).textContent = kOk ? "✓" : "✗";
        const wp = parseDezimal(panel.querySelector("#exp-p-" + i).value);
        const pOk = produktOk(wp, exakt[i].p);
        panel.querySelector("#exp-p-ok-" + i).textContent = pOk ? "✓" : "✗";
        if (!kOk || !pOk) alleOk = false;
      });
      panel.querySelector("#exp-ausw-meldung").textContent = alleOk
        ? "✓ Alle Zeilen stimmen. Schau auf die letzte Spalte: Alle Produkte liegen nahe beieinander (bei dir im Mittel " +
          komma(mittel(exakt.map(e => e.p)), 2) + " Imp·m²/s) — R_korr·r² ist (fast) konstant, also R_korr ∝ 1/r². " +
          "Das ist das Abstandsgesetz! Die kleinen Unterschiede sind Zählstatistik."
        : "Noch nicht alles ✓ — Tipp: R_korr = R − R_null, und das Produkt bildest du mit dem r derselben Zeile (in Metern, quadriert).";
    });
    panel.querySelector("#exp-doppelform").addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseDezimal(panel.querySelector("#exp-doppel").value);
      const ok = Number.isFinite(wert) && Math.abs(wert - 0.25) <= 0.25 * 0.15;
      let text = ok
        ? "✓ Ein Viertel! Doppelter Abstand → vierfache Kugelfläche, auf die sich dieselbe Strahlung verteilt → ¼ der Rate."
        : "✗ Schau in deine Tabelle: R_korr bei 0,20 m geteilt durch R_korr bei 0,10 m — was kommt heraus?";
      if (ok && zustand.vorhersage === "viertel") text += " Deine Vorhersage vom Anfang war übrigens richtig!";
      else if (ok && zustand.vorhersage) text += " Vergleiche mit deiner Vorhersage vom Anfang — jetzt weißt du es genauer.";
      panel.querySelector("#exp-doppel-meldung").textContent = text;
    });
    function frage(idWahl, idKnopf, idMeldung, richtig, okText, fehlText) {
      panel.querySelector(idKnopf).addEventListener("click", () => {
        const wahl = panel.querySelector(idWahl).value;
        const m = panel.querySelector(idMeldung);
        if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
        m.textContent = wahl === richtig ? okText : fehlText;
      });
    }
    let f1Ok = "✓ Genau — Zählstatistik! Jeder Zerfall ist ein unabhängiges Zufallsereignis; erwartbar ist eine Schwankung von etwa ±√N.";
    if (dp) {
      f1Ok += " Dein Doppelpaar bei r = " + komma(dp[0].rAbgelesen, 3) + " m: N = " + dp[0].N + " und N = " + dp[1].N +
        " — mit √N ≈ " + Math.round(Math.sqrt(dp[0].N)) + " passt dieser Unterschied bestens ins Band.";
    }
    frage("#exp-f1", "#exp-f1k", "#exp-f1-meldung", "b", f1Ok,
      "✗ Noch nicht. Beide Messungen waren korrekt, das Gerät ist in Ordnung, die Quelle praktisch konstant — was bleibt als Ursache übrig?");
    let f2Ok = "✓ Richtig: √N/N = 1/√N — je mehr Impulse, desto kleiner die relative Schwankung. Zehnmal länger zählen drückt sie auf weniger als ein Drittel.";
    if (kurz && lang) {
      f2Ok += " Bei dir konkret: 10-s-Zeile mit N = " + kurz.N + " → √N/N ≈ " + komma(100 / Math.sqrt(kurz.N), 1) +
        " %, 100-s-Zeile mit N = " + lang.N + " → ≈ " + komma(100 / Math.sqrt(lang.N), 1) + " %. Länger zählen lohnt!";
    } else {
      f2Ok += " Beispiel: N = 100 → ±10 %, N = 10 000 → ±1 %.";
    }
    frage("#exp-f2", "#exp-f2k", "#exp-f2-meldung", "b", f2Ok,
      "✗ Denk an ±√N: Die absolute Schwankung wächst mit N — aber wie entwickelt sich √N geteilt durch N?");
    frage("#exp-f3", "#exp-f3k", "#exp-f3-meldung", "b",
      "✓ Richtig: 0,3 Imp/s Untergrund sind bei r = 0,05 m (R ≈ 400 Imp/s) belanglos, bei r = 0,50 m (R ≈ 4,3 Imp/s) aber gut 7 % der Anzeige! Ohne Abzug käme R·r² bei 0,50 m um 7,5 % zu groß heraus — das Gesetz schiene verletzt, obwohl es gilt.",
      "✗ Vergleiche die 0,3 Imp/s mit deiner Rate bei 0,05 m und mit der bei 0,50 m — wo fällt der Untergrund ins Gewicht?");
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const datenZeilen = zeilen.map((m, i) => [
        m.rAbgelesen, String(m.T), String(m.N), exakt[i].R, exakt[i].k, exakt[i].p
      ]);
      datenZeilen.push(["Nullrate (Tresor zu)", String(NULL_TORZEIT), String(zustand.nullN), rNull, "", ""]);
      csvHerunterladen("abstandsgesetz-messwerte.csv",
        ["r in m", "T in s", "N", "R in Imp/s", "R_korr in Imp/s", "R_korr*r^2 in Imp*m^2/s"], datenZeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      cancelAnimationFrame(animId);
      zustand.r = 0.10; zustand.torzeit = 100; zustand.tresor = true;
      zustand.nullN = null; zustand.nullRate = null; zustand.laufZaehler = {};
      zustand.zaehlung = null; zustand.anzeigeN = 0; zustand.fortschritt = 0;
      zustand.messungen = []; zustand.vorhersage = "";
      zeichne();
      wechslePhase("aufbau");
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  zeichne();
  wechslePhase("aufbau");
}
