// experiment.js — Interaktives Experiment: Magnetische Flussdichte mit der Stromwaage (QP, gA+eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Strom (und im eA-Teil die wirksame
// Leiterlänge) selbst einstellen, die Massenänderung Δm an der elektronischen Waage
// SELBST ablesen, die Messreihe protokollieren und daraus die unbekannte Flussdichte B
// bestimmen. Aus F = B·I·L folgt: F gegen I aufgetragen ergibt eine Ursprungsgerade mit
// Steigung B·L → B = Steigung/L. Die kleine Ablesestreuung der Waage ist pro Einstellung
// deterministisch geseedet — dadurch bleiben pruefFaelle und TESTS in Node analytisch
// prüfbar. Modulebene strikt DOM-frei.

import {
  streuung, parseDezimal, komma, mittel, esc, regression,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen, ablesungOk
} from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const B_WAHR = 0.42;            // T — FESTE, intern unbekannte Flussdichte des Magneten
export const G = 9.81;                 // m/s² — Ortsfaktor
export const L_STANDARD = 0.080;       // m — wirksame Leiterlänge im Feld (Standardreihe)
export const I_MIN = 0, I_MAX = 6.0, I_SCHRITT = 0.5;        // A — Stromstärke
export const L_MIN = 0.04, L_MAX = 0.12, L_SCHRITT = 0.01;   // m — variable Länge (eA-Teil)
export const DM_STREU_SPANNE = 0.02;   // g — Ablesestreuung der Waage (±0,01 g)
export const DM_TOLERANZ_G = 0.03;     // akzeptierte Ablesung: ±0,03 g
export const F_TOLERANZ_MN = 0.4;      // berechnete Kraft F: ±0,4 mN je Zeile
export const B_TOLERANZ = 0.03;        // B-Eingabe in T: ±0,03
export const MIN_MESSUNGEN = 6;        // mindestens 6 verschiedene Stromstärken

// Schlüssel deterministisch normieren: I auf 0,5-Raster, L auf 0,01-Raster,
// damit die geseedete Streuung nicht an Gleitkomma-Resten hängt.
export function stromKey(i) { return Number(i).toFixed(1); }
export function laengeKey(l) { return Number(l).toFixed(2); }

// ---------- Physik (rein, Node-testbar) ----------
// Lorentzkraft auf den geraden Leiter im homogenen Feld: F = B·I·L (B ⊥ I).
export function kraft(iAmp, lMeter) {
  return B_WAHR * iAmp * lMeter; // N
}
// Die Waage zeigt die Kraft als Massenänderung: F = Δm·g  →  Δm = F/g.
export function deltaM(iAmp, lMeter) {
  return kraft(iAmp, lMeter) / G; // kg
}
// Tatsächliche Waagen-Anzeige in GRAMM inkl. reproduzierbarer Ablesestreuung (±0,01 g):
// kleine Drift, Auflösung der Waage, Luftbewegung. Bei I = 0 exakt 0 (Tara).
export function deltaMRealG(iAmp, lMeter) {
  if (iAmp === 0) return 0;
  return deltaM(iAmp, lMeter) * 1000 + streuung("dm:" + stromKey(iAmp) + ":" + laengeKey(lMeter), DM_STREU_SPANNE);
}
// Auswertungsformel — die rechnen die Lernenden selbst, das System prüft nur:
// aus der abgelesenen Masse (in g) folgt die Kraft F = Δm·g (in mN, wenn man in g rechnet:
// F[mN] = Δm[g] · g, weil 1 g · 9,81 m/s² = 9,81 mN). Hier in SI: Δm in kg → F in N.
export function kraftAusMasseG(dmGramm) {
  return (dmGramm / 1000) * G; // N
}
// Aus der Steigung der F-I-Geraden (Steigung = B·L) folgt B = Steigung / L.
export function bAusSteigung(steigung, lMeter) {
  return lMeter > 0 ? steigung / lMeter : NaN; // T
}
// gA-Weg ohne Regression: Mittelwert von F/(I·L) über alle Zeilen mit I > 0.
export function bAusMittel(messungen) {
  const einzel = messungen.filter(z => z.I > 0).map(z => z.F / (z.I * z.L));
  return mittel(einzel); // T
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungDmOk(eingabeG, wahrDmG) {
  return ablesungOk(eingabeG, wahrDmG, DM_TOLERANZ_G);
}
export function kraftEingabeOkMN(eingabeMN, wahrN) {
  return Number.isFinite(eingabeMN) && Math.abs(eingabeMN - wahrN * 1000) <= F_TOLERANZ_MN;
}
export function bEingabeOk(eingabeT, wahrT) {
  return Number.isFinite(eingabeT) && Math.abs(eingabeT - wahrT) <= B_TOLERANZ;
}
export function bewertungB(bWert) {
  const abw = Math.abs(bWert - B_WAHR) / B_WAHR * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Standard-Messreihe: mindestens 6 verschiedene Stromstärken.
export function messreiheVollstaendig(messungen) {
  return new Set(messungen.map(z => stromKey(z.I))).size >= MIN_MESSUNGEN;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "F", I: 4.0, L: 0.080, soll: 0.13440, tol: 1e-6 },        // N: 0,42·4·0,08
  { art: "dm", I: 4.0, L: 0.080, soll: 13.700, tol: 1e-3 },        // g: 0,13440/9,81·1000
  { art: "F", I: 2.0, L: 0.080, soll: 0.06720, tol: 1e-6 },        // N (halbes I → halbe Kraft)
  { art: "B", steigung: 0.0336, L: 0.080, soll: 0.42, tol: 1e-9 }  // T: Steigung B·L=0,0336 → /0,08
];

export const TESTS = [
  { name: "Kontrollwert F: I = 4,0 A, L = 0,080 m → F = 0,1344 N (= 134,4 mN)",
    ok: () => Math.abs(kraft(4.0, 0.080) - 0.13440) <= 1e-9
      && Math.abs(kraft(4.0, 0.080) - B_WAHR * 4.0 * 0.080) <= 1e-12 },
  { name: "Kontrollwert Δm: I = 4,0 A, L = 0,080 m → Δm = 13,700 g (F/g·1000)",
    ok: () => Math.abs(deltaM(4.0, 0.080) * 1000 - 13.700) <= 1e-3
      && Math.abs(deltaM(4.0, 0.080) - kraft(4.0, 0.080) / G) <= 1e-15 },
  { name: "F ∝ I bei festem L: I verdoppeln → F verdoppelt (0–6 A)",
    ok: () => [0.5, 1.0, 1.5, 2.5, 3.0].every(i =>
      Math.abs(kraft(2 * i, 0.080) - 2 * kraft(i, 0.080)) <= 1e-12) },
  { name: "F ∝ L bei festem I: L verdoppeln → F verdoppelt; F = 0 bei L = 0",
    ok: () => [0.04, 0.05, 0.06].every(l =>
      Math.abs(kraft(3.0, 2 * l) - 2 * kraft(3.0, l)) <= 1e-12) && kraft(3.0, 0) === 0 },
  { name: "F = 0 bei I = 0 und Waage zeigt exakt 0,000 g (Tara)",
    ok: () => kraft(0, 0.080) === 0 && deltaMRealG(0, 0.080) === 0 && deltaMRealG(0, 0.12) === 0 },
  { name: "Streugrenze Waage ±0,01 g auf dem ganzen Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let c = 5; c <= 60; c += 5) { const i = c / 10;
        for (let l = L_MIN; l <= L_MAX + 1e-9; l += L_SCHRITT) {
          const d = Math.abs(deltaMRealG(i, l) - deltaM(i, l) * 1000);
          if (d > DM_STREU_SPANNE / 2 + 1e-12) return false;
          if (d > 1e-6) irgendStreu = true;
        }
      }
      return irgendStreu && deltaMRealG(4.0, 0.080) === deltaMRealG(4.0, 0.080)
        && deltaMRealG(4.0, 0.080) !== deltaMRealG(3.5, 0.080); } },
  { name: "Regression der idealen F-I-Reihe → Steigung B·L, Achsenabschnitt 0",
    ok: () => { const r = regression([0, 1, 2, 3, 4, 5, 6].map(i => ({ x: i, y: kraft(i, 0.080) })));
      return Math.abs(r.m - B_WAHR * 0.080) <= 1e-12 && Math.abs(r.b) <= 1e-12; } },
  { name: "B aus Steigung: Steigung/L = B (exakt 0,42 T) — auch bei anderem L",
    ok: () => Math.abs(bAusSteigung(B_WAHR * 0.080, 0.080) - B_WAHR) <= 1e-12
      && Math.abs(bAusSteigung(B_WAHR * 0.05, 0.05) - B_WAHR) <= 1e-12 },
  { name: "gA-Mittelwert F/(I·L) liefert B exakt, I = 0 wird ignoriert",
    ok: () => { const m = [0, 1, 2, 3, 4, 5].map(i => ({ I: i, L: 0.080, F: kraft(i, 0.080) }));
      return Math.abs(bAusMittel(m) - B_WAHR) <= 1e-12; } },
  { name: "reale Standardreihe (Waage ablesen) → B auf ±0,03 T genau",
    ok: () => { const reihe = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0].map(i =>
        ({ x: i, y: kraftAusMasseG(deltaMRealG(i, 0.080)) }));
      return Math.abs(bAusSteigung(regression(reihe).m, 0.080) - B_WAHR) <= B_TOLERANZ; } },
  { name: "Ablese-/Eingabe-Toleranzen: Δm ±0,03 g, F ±0,4 mN, B ±0,03 T",
    ok: () => ablesungDmOk(13.70, 13.700) && !ablesungDmOk(13.74, 13.700) && !ablesungDmOk(NaN, 13.700)
      && kraftEingabeOkMN(134.4, 0.13440) && kraftEingabeOkMN(134.7, 0.13440)
      && !kraftEingabeOkMN(135.0, 0.13440) && !kraftEingabeOkMN(NaN, 0.13440)
      && bEingabeOk(0.42, B_WAHR) && bEingabeOk(0.44, B_WAHR)
      && !bEingabeOk(0.46, B_WAHR) && !bEingabeOk(NaN, B_WAHR) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("13,7") === 13.7 && parseDezimal("13.7") === 13.7 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen Stromstärken",
    ok: () => { const z = i => ({ I: i });
      const fuenf = [0.5, 1.0, 2.0, 3.0, 4.0].map(z);
      const doppelt = [1.0, 1.0, 2.0, 2.0, 3.0, 4.0].map(z);
      const sechs = [0.5, 1.0, 2.0, 3.0, 4.0, 5.0].map(z);
      return !messreiheVollstaendig(fuenf) && !messreiheVollstaendig(doppelt)
        && messreiheVollstaendig(sechs); } },
  { name: "Bewertung: 0,42 → sehr gut · 0,40 → gut · 0,36 → nochmal prüfen",
    ok: () => bewertungB(0.42).stufe === "sehr gut" && bewertungB(0.40).stufe === "gut"
      && bewertungB(0.36).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "F") return Math.abs(kraft(p.I, p.L) - p.soll) <= p.tol;
      if (p.art === "dm") return Math.abs(deltaM(p.I, p.L) * 1000 - p.soll) <= p.tol;
      return Math.abs(bAusSteigung(p.steigung, p.L) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  // ---------- Canvas-Geometrie (Frontalblick: Magnet mit Leiterbügel, Waage darunter) ----------
  const CX = 180;                  // horizontale Mitte
  const MAG_Y = 150;               // Oberkante des Polschuh-Bereichs
  const SPALT_H = 70;              // Höhe des Luftspalts
  const LEITER_Y = MAG_Y + SPALT_H / 2; // Höhe des Leiters im Spalt
  const WAAGE_Y = 300;             // Oberkante der Waage

  const zustand = {
    phase: "aufbau",
    I: 2.0, L: L_STANDARD,
    eaModus: false,                // im eA-Teil: zweite Reihe mit variabler Länge
    vorhersageI: "",               // "groesser" | "kleiner" | "gleich"
    messungen: [],                 // {I, L, dmG, F, fEingabe, fOk}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    bEingabe: { wert: NaN, ok: false },
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
        <canvas id="exp-canvas" width="360" height="380" aria-label="Frontalansicht der Stromwaage: ein Hufeisen- bzw. Polschuh-Magnet bildet einen waagerechten Luftspalt, durch den ein gerader Leiterbügel verläuft. Der Bügel hängt an einer elektronischen Waage darunter. Fließt Strom, wirkt eine senkrechte Kraft, die die Waage als Massenänderung anzeigt. Unten zwei Anzeigen für Stromstärke und Waagenwert."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersageI;
  const fWahrN = z => kraft(z.I, z.L);

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start"; ctx.lineWidth = 2;

    // Polschuhe (Nord oben, Süd unten) mit Luftspalt dazwischen
    const polBreite = 150, polDicke = 26;
    ctx.fillStyle = cLeise; ctx.strokeStyle = cText;
    // oberer Pol (N)
    ctx.fillRect(CX - polBreite / 2, MAG_Y - polDicke, polBreite, polDicke);
    ctx.strokeRect(CX - polBreite / 2, MAG_Y - polDicke, polBreite, polDicke);
    // unterer Pol (S)
    ctx.fillRect(CX - polBreite / 2, MAG_Y + SPALT_H, polBreite, polDicke);
    ctx.strokeRect(CX - polBreite / 2, MAG_Y + SPALT_H, polBreite, polDicke);
    ctx.fillStyle = cFlaeche; ctx.textAlign = "center"; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("N", CX, MAG_Y - polDicke / 2 + 5);
    ctx.fillText("S", CX, MAG_Y + SPALT_H + polDicke / 2 + 5);
    ctx.font = "12px system-ui, sans-serif";

    // Feldlinien im Spalt (von N nach S, also nach unten) — nur Andeutung
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    for (let k = -2; k <= 2; k++) {
      const x = CX + k * 28;
      ctx.beginPath(); ctx.moveTo(x, MAG_Y + 4); ctx.lineTo(x, MAG_Y + SPALT_H - 4); ctx.stroke();
      // kleines Pfeilende nach unten
      ctx.beginPath(); ctx.moveTo(x, MAG_Y + SPALT_H - 4); ctx.lineTo(x - 3, MAG_Y + SPALT_H - 9);
      ctx.lineTo(x + 3, MAG_Y + SPALT_H - 9); ctx.closePath(); ctx.fillStyle = cLeise; ctx.fill();
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("B ↓", CX + polBreite / 2 + 6, LEITER_Y - 6);
    ctx.fillText("Luftspalt", CX + polBreite / 2 + 6, LEITER_Y + 12);

    // Leiterbügel: waagerechtes Stück im Spalt, an beiden Enden nach unten zur Waage.
    // Die im Feld wirksame Länge L wird als Breite des waagerechten Stücks dargestellt.
    const lPx = Math.max(40, zustand.L / L_STANDARD * 70); // Skala: 8 cm ≙ 70 px
    const xl = CX - lPx / 2, xr = CX + lPx / 2;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(xl, WAAGE_Y - 6);             // linker Schenkel hoch
    ctx.lineTo(xl, LEITER_Y);
    ctx.lineTo(xr, LEITER_Y);                // waagerechtes Stück im Feld (= wirksame Länge L)
    ctx.lineTo(xr, WAAGE_Y - 6);             // rechter Schenkel runter zur Waage
    ctx.stroke();
    ctx.fillStyle = cAkzent; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("L = " + komma(zustand.L * 100, 1) + " cm", CX, LEITER_Y - 8);
    ctx.font = "12px system-ui, sans-serif";

    // Stromrichtung am waagerechten Leiter (Pfeil nach rechts) + Kraftpfeil (nur wenn Strom fließt)
    if (zustand.phase !== "aufbau" && zustand.I > 0) {
      ctx.fillStyle = cAkzent; ctx.textAlign = "start";
      // Strompfeil im Leiter
      ctx.beginPath(); ctx.moveTo(CX + 8, LEITER_Y); ctx.lineTo(CX, LEITER_Y - 4);
      ctx.lineTo(CX, LEITER_Y + 4); ctx.closePath(); ctx.fill();
      ctx.fillText("I →", CX + lPx / 2 - 24, LEITER_Y - 8);
      // Kraftpfeil nach unten (drückt auf die Waage) — Länge skaliert mit der Kraft
      const fLen = Math.min(46, 8 + kraft(zustand.I, zustand.L) / kraft(I_MAX, L_MAX) * 40);
      ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(CX, LEITER_Y + 6); ctx.lineTo(CX, LEITER_Y + 6 + fLen); ctx.stroke();
      ctx.fillStyle = cText;
      ctx.beginPath(); ctx.moveTo(CX, LEITER_Y + 6 + fLen); ctx.lineTo(CX - 5, LEITER_Y + fLen);
      ctx.lineTo(CX + 5, LEITER_Y + fLen); ctx.closePath(); ctx.fill();
      ctx.fillText("F", CX + 8, LEITER_Y + 6 + fLen / 2);
    }

    // elektronische Waage
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(CX - 110, WAAGE_Y, 220, 30, 6); else ctx.rect(CX - 110, WAAGE_Y, 220, 30);
    ctx.fill(); ctx.stroke();
    // Display der Waage
    const dmAnz = zustand.phase === "aufbau" ? 0 : deltaMRealG(zustand.I, zustand.L);
    ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.fillText("Waage: Δm = " + komma(dmAnz, 2) + " g", CX, WAAGE_Y + 20);
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = cLeise; ctx.fillText("elektronische Waage (auf 0 tariert)", CX, WAAGE_Y + 46);

    // Netzgeräte-Anzeige (Stromstärke) unten links
    const kasten = (x, etikett, wert) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 338, 160, 36, 6); else ctx.rect(x, 338, 160, 36);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(etikett, x + 80, 352);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + 80, 368);
      ctx.font = "12px system-ui, sans-serif";
    };
    kasten(CX - 80, "Stromquelle", "I = " + komma(zustand.I, 1) + " A");

    // Hinweistext im Aufbau
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(CX - 96, 18, 192, 40);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Strom aus —", CX, 36);
      ctx.fillText("die Kraft erscheint in der Durchführung", CX, 54);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Ein <strong>gerader Leiter</strong> (im Feld wirksame Länge L) verläuft waagerecht durch den <strong>Luftspalt eines kräftigen Magneten</strong>. Dessen Flussdichte B ist <strong>fest, aber unbekannt</strong> — genau die wollen wir bestimmen. Der Leiterbügel hängt an einer <strong>elektronischen Waage</strong>, die zuvor auf 0 tariert wurde.</p>
      <p><strong>Idee der Messung:</strong> Fließt der Strom I durch den Leiter, wirkt auf ihn die Kraft <strong>F = B · I · L</strong> senkrecht nach unten (oder oben — je nach Stromrichtung). Diese Kraft drückt auf die Waage, die sie als <strong>Massenänderung Δm</strong> anzeigt. Wegen F = Δm · g (g = 9,81 m/s²) kannst du aus dem Waagenwert die Kraft berechnen.</p>
      <p><strong>Plan (Standardreihe):</strong> Halte die Länge fest bei L = ${komma(L_STANDARD * 100, 0)} cm und stelle ${MIN_MESSUNGEN} verschiedene Stromstärken zwischen 0 und ${komma(I_MAX, 1)} A ein. Lies jeweils Δm an der Waage ab. In der Auswertung berechnest du F = Δm · g, trägst F über I auf und liest aus der <strong>Steigung B · L</strong> die gesuchte Flussdichte B ab.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-vi">Wenn ich den Strom I erhöhe (L fest), wird der Waagenwert Δm …</label>
      <select id="exp-vi" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="groesser">… größer</option>
        <option value="kleiner">… kleiner</option>
        <option value="gleich">… bleibt (fast) gleich</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-vi").value = zustand.vorhersageI;
    panel.querySelector("#exp-vi").addEventListener("change", ev => { zustand.vorhersageI = ev.target.value; });
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
    const stromStufen = new Set(zustand.messungen.filter(z => z.L === L_STANDARD).map(z => stromKey(z.I))).size;
    let html = `<p>Deine Vorhersage: I rauf → <strong>${wortAus(zustand.vorhersageI)}</strong>. Probier es am Regler aus!</p>`;
    if (stromStufen >= 2) {
      const ok = zustand.vorhersageI === "groesser";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>I rauf → Waagenwert größer</strong> (stärkerer Strom, größere Kraft: F = B·I·L, also F ∝ I). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const standardZeilen = zustand.messungen.filter(z => z.L === L_STANDARD);
    const stromStufen = new Set(standardZeilen.map(z => stromKey(z.I))).size;
    let fortschritt = `${stromStufen} von mindestens ${MIN_MESSUNGEN} verschiedenen Stromstärken (bei L = ${komma(L_STANDARD * 100, 0)} cm).`;
    if (zustand.eaModus) {
      const laengen = new Set(zustand.messungen.filter(z => z.L !== L_STANDARD).map(z => laengeKey(z.L))).size;
      fortschritt += ` Zusatzreihe (eA): ${laengen} von 3 verschiedenen Längen.`;
    }
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-i">Stromstärke: I = <strong id="exp-i-wert">${komma(zustand.I, 1)} A</strong></label>
        <input type="range" id="exp-i" min="${I_MIN}" max="${I_MAX}" step="${I_SCHRITT}" value="${zustand.I}" aria-label="Stromstärke in Ampere">
        ${zustand.eaModus ? `
        <label for="exp-l">Wirksame Leiterlänge: L = <strong id="exp-l-wert">${komma(zustand.L * 100, 1)} cm</strong></label>
        <input type="range" id="exp-l" min="${L_MIN}" max="${L_MAX}" step="${L_SCHRITT}" value="${zustand.L}" aria-label="Wirksame Leiterlänge in Meter">` : `
        <p>Länge fest: <strong>L = ${komma(L_STANDARD * 100, 0)} cm</strong>. <button class="knopf zweitrangig" id="exp-ea">eA-Zusatz: Länge variieren</button></p>`}
      </div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies die Waage ab — Massenänderung Δm in g:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>I in A</th><th>L in cm</th><th>Δm in g</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${komma(z.I, 1)}</td><td>${komma(z.L * 100, 1)}</td><td>${komma(z.dmG, 2)}</td></tr>`).join("")
          || '<tr><td colspan="3">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(standardZeilen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const iRegler = panel.querySelector("#exp-i");
    iRegler.addEventListener("input", () => {
      zustand.I = Math.round(Number(iRegler.value) * 10) / 10; // exakt auf Schrittweite — deterministische Streu-Schlüssel
      panel.querySelector("#exp-i-wert").textContent = komma(zustand.I, 1) + " A";
      zeichne();
    });
    const lRegler = panel.querySelector("#exp-l");
    if (lRegler) lRegler.addEventListener("input", () => {
      zustand.L = Math.round(Number(lRegler.value) * 100) / 100;
      panel.querySelector("#exp-l-wert").textContent = komma(zustand.L * 100, 1) + " cm";
      zeichne();
    });
    panel.querySelector("#exp-ea")?.addEventListener("click", () => {
      zustand.eaModus = true; zustand.L = 0.06; panelMessen(); zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.I === 0) {
        meldung.textContent = "Bei I = 0 A zeigt die Waage 0,00 g (kein Strom, keine Kraft). Stelle einen Strom > 0 ein.";
        return;
      }
      if (zustand.messungen.some(z => stromKey(z.I) === stromKey(zustand.I) && laengeKey(z.L) === laengeKey(zustand.L))) {
        meldung.textContent = "Diese Kombination (I und L) hast du schon gemessen — stelle eine andere ein.";
        return;
      }
      const wahrDm = deltaMRealG(zustand.I, zustand.L);
      if (!ablesungDmOk(eingabe, wahrDm)) {
        meldung.textContent = "✗ Schau noch einmal genau auf das Display der Waage (auf 0,01 g genau ablesen).";
        return;
      }
      zustand.messungen.push({
        I: zustand.I, L: zustand.L, dmG: eingabe,
        F: kraftAusMasseG(eingabe), fEingabe: null, fOk: null
      });
      // nach I sortieren (gleiche Länge zuerst nach Strom) — übersichtlichere Tabelle/Regression
      zustand.messungen.sort((a, b) => (a.L - b.L) || (a.I - b.I));
      zustand.meldungMessen = "✓ Eingetragen: Δm = " + komma(eingabe, 2) + " g bei I = " + komma(zustand.I, 1) + " A.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const standardZeilen = zustand.messungen.filter(z => z.L === L_STANDARD);
    if (!messreiheVollstaendig(standardZeilen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Stromstärken bei L = ${komma(L_STANDARD * 100, 0)} cm — bisher: ${new Set(standardZeilen.map(z => stromKey(z.I))).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.messungen.every(z => z.fOk === true);
    // Regression nur über die Standardreihe (festes L): F über I
    const stdPunkte = standardZeilen.map(z => ({ x: z.I, y: z.fEingabe == null ? z.F : z.fEingabe / 1000 }));
    const reg = regression(standardZeilen.map(z => ({ x: z.I, y: z.F })));
    const steigung = reg.m;                       // B·L in N/A
    const bRegression = bAusSteigung(steigung, L_STANDARD);
    const bMittel = bAusMittel(standardZeilen);
    const bEin = zustand.bEingabe;
    const bew = bEin.ok ? bewertungB(bEin.wert) : null;
    const ermutigung = bew ? (bew.stufe === "sehr gut" ? " Stark — Messen wie im Praktikum!"
      : bew.stufe === "gut" ? " Ordentlich! Mit mehr Stromstärken und sorgfältigem Ablesen kommst du noch näher heran."
      : " Kein Drama: Miss ein paar weitere Stromstärken und mittle — die Streuung gleicht sich aus.") : "";

    // eA-Zusatzauswertung (zweite Reihe mit variabler Länge)
    const eaZeilen = zustand.messungen.filter(z => z.L !== L_STANDARD);
    const eaLaengen = new Set(eaZeilen.map(z => laengeKey(z.L))).size;
    const eaReg = eaLaengen >= 3 ? regression(eaZeilen.map(z => ({ x: z.L, y: z.F }))) : null;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Für jede Zeile gilt: <strong>F = Δm · g</strong> (mit g = 9,81 m/s²). Rechne F selbst aus und trage es in <strong>mN</strong> (Millinewton) ein — z. B. ergibt Δm = 13,70 g die Kraft F = 13,70 g · 9,81 m/s² ≈ <strong>134,4 mN</strong>.</p>
      <details class="exp-fehler"><summary>Hilfe: von Δm zu F</summary>
        <p>1 g = 0,001 kg. F = Δm · g = (Δm[g] ÷ 1000) · 9,81 m/s² in Newton. Praktisch: <strong>F in mN = Δm in g · 9,81</strong> (weil 1 g · 9,81 m/s² = 9,81 mN). Beispiel: 6,85 g → 67,2 mN.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>I in A</th><th>L in cm</th><th>Δm in g</th><th>F in mN</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${komma(z.I, 1)}</td><td>${komma(z.L * 100, 1)}</td><td>${komma(z.dmG, 2)}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.fEingabe == null ? "" : komma(z.fEingabe, 1)}" aria-label="Deine Kraft F für Zeile ${i + 1} in Millinewton"></td>
          <td>${z.fOk === true ? "✓" : z.fOk === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Kräfte prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <div class="exp-hinweis">
        <p><strong>F gegen I aufgetragen ergibt eine Ursprungsgerade.</strong> Lineare Regression über deine Standardreihe (L = ${komma(L_STANDARD * 100, 0)} cm = ${komma(L_STANDARD, 3)} m):</p>
        <p>Steigung = <strong>B · L ≈ ${komma(steigung * 1000, 2)} mN/A</strong> = ${komma(steigung, 4)} N/A (Achsenabschnitt ≈ ${komma(reg.b * 1000, 2)} mN — nahe null, wie erwartet).</p>
        <p><strong>gA-Kontrollweg ohne Diagramm:</strong> Mittelwert von F/(I·L) über alle Zeilen → B ≈ ${komma(bMittel, 3)} T.</p>
        <p>Jetzt du: Bestimme aus der Steigung die <strong>Flussdichte B = Steigung / L</strong> und trage sie in Tesla ein.</p>
        <form id="exp-b-form" class="exp-ablesen">
          <label for="exp-b">B in T:</label>
          <input id="exp-b" inputmode="decimal" autocomplete="off" size="7" value="${bEin.ok ? komma(bEin.wert, 3) : ""}">
          <button class="knopf">Prüfen</button>
        </form>
        <p id="exp-b-meldung" class="exp-meldung" aria-live="polite"></p>
        ${bEin.ok ? `<p><strong>B ≈ ${komma(bEin.wert, 3)} T</strong> — Abweichung vom intern hinterlegten Wert ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${ermutigung} Damit ist die unbekannte Flussdichte des Magneten bestimmt.</p>` : ""}
      </div>` : ""}
      ${fertig && zustand.eaModus ? `
      <h3>eA-Zusatz: Hängt F von der Länge L ab?</h3>
      ${eaReg ? `
      <div class="exp-hinweis">
        <p>Deine Zusatzreihe (festes I, verschiedene L) zeigt: <strong>F wächst proportional zu L</strong>. Regression F über L → Steigung B · I ≈ ${komma(eaReg.m * 1000, 1)} mN/m, Achsenabschnitt ≈ ${komma(eaReg.b * 1000, 2)} mN. Das bestätigt F = B · I · L: Verdoppelst du L, verdoppelt sich F.</p>
      </div>` : `<p>Miss in der Durchführung noch mindestens 3 verschiedene Längen (bei festem Strom), dann erscheint hier die F-L-Auswertung.</p>`}` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">B zeigt nach unten, der Strom fließt waagerecht (auf dich zu). In welche Richtung wirkt die Kraft F auf den Leiter (Drei-Finger-Regel der rechten Hand)?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="parallelB">parallel zu B (nach unten)</option>
          <option value="senkrecht">senkrecht zu B und I (waagerecht zur Seite)</option>
          <option value="parallelI">in Stromrichtung (auf dich zu)</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du <strong>drehst die Stromrichtung um</strong> (Pluspol und Minuspol vertauscht), Betrag von I bleibt gleich. Was zeigt die Waage?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">den gleichen positiven Wert wie vorher</option>
          <option value="negativ">betragsgleich, aber die Kraft kehrt sich um (Bügel wird angehoben → Waage zeigt weniger/negativ)</option>
          <option value="null">0,00 g</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum streut B um den wahren Wert?</summary>
        <p><strong>Auflösung und Drift der Waage:</strong> Eine Labor-Waage zeigt nur auf etwa 0,01 g genau, und Luftbewegungen oder Temperaturdrift lassen den letzten Digit zappeln. Bei kleinen Strömen ist die Kraft winzig (wenige mN) — dort wiegt jeder Ablesefehler relativ am schwersten. Strategie: viele Stromstärken messen, große Ströme bevorzugen und über die Regressionsgerade mitteln (Achsenabschnitt nahe null ist ein gutes Qualitätszeichen).</p>
        <p><strong>Wirksame Länge L:</strong> Nur das Leiterstück <em>im</em> homogenen Feld trägt zur Kraft bei. An den Polschuhrändern „franst" das Feld aus, sodass die effektive Länge etwas größer ist als die geometrische — das verschiebt B systematisch ein wenig nach unten.</p>
        <p><strong>Restkräfte und Tarierung:</strong> Zuleitungen und die Aufhängung üben kleine Kräfte aus. Deshalb wird die Waage bei I = 0 sorgfältig auf null tariert; bleibt eine Restkraft, taucht sie als Achsenabschnitt ≠ 0 in der Geraden auf.</p>
        <p><strong>Feld-Inhomogenität:</strong> B ist im Spalt nur näherungsweise homogen. Verläuft der Leiter nicht exakt mittig oder senkrecht zu B, ist die wirksame Komponente B·sin(α) kleiner — auch das senkt das Ergebnis leicht.</p>
      </details>`;

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.fEingabe = null; z.fOk = null; return; }
        z.fEingabe = wert;
        z.fOk = kraftEingabeOkMN(wert, fWahrN(z));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (Kraft in mN, z. B. 134,4).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.fOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle Kräfte bestätigt — unten kannst du jetzt B bestimmen."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±0,4 mN). Tipp: F in mN = Δm in g · 9,81.";
      if (falsch > 0) zustand.bEingabe = { wert: NaN, ok: false };
      panelAuswerten();
    });
    panel.querySelector("#exp-b-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-b").value);
      if (!bEingabeOk(eingabe, bRegression)) {
        panel.querySelector("#exp-b-meldung").textContent = "✗ Das passt noch nicht (±0,03 T). Rechne B = Steigung / L = " + komma(steigung, 4) + " N/A ÷ " + komma(L_STANDARD, 3) + " m.";
        return;
      }
      zustand.bEingabe = { wert: eingabe, ok: true };
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "senkrecht" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "negativ" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("stromwaage-messreihe.csv",
        ["I in A", "L in cm", "dm in g", "F in mN"],
        zustand.messungen.map(z => [z.I, z.L * 100, z.dmG,
          z.fEingabe == null ? "" : z.fEingabe]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        I: 2.0, L: L_STANDARD, eaModus: false, vorhersageI: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        bEingabe: { wert: NaN, ok: false }, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Die Lorentzkraft steht immer senkrecht auf B und auf I. Mit der Drei-Finger-Regel (rechte Hand: Daumen = Strom, Zeigefinger = B, Mittelfinger = Kraft) ergibt sich eine waagerechte Auslenkung. In unserem Aufbau ist der Leiter so eingehängt, dass diese Kraft die Waage senkrecht be- bzw. entlastet."
      : "✗ Nicht ganz: F = I·L × B steht immer senkrecht zu beiden Richtungen — also weder parallel zu B noch in Stromrichtung. Nimm die rechte Hand: Daumen Strom, Zeigefinger Feld, Mittelfinger zeigt die Kraft.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: In F = B·I·L steckt die Stromrichtung. Kehrst du I um, kehrt sich auch F um — der Bügel wird statt heruntergedrückt nun angehoben, die Waage zeigt einen kleineren bzw. negativen Wert (Entlastung). Der Betrag bleibt gleich."
      : "✗ Überlege mit der Drei-Finger-Regel: Drehst du die Stromrichtung um, dreht sich auch die Kraftrichtung um. Der Betrag der Kraft ändert sich nicht, aber sie wirkt jetzt nach oben statt nach unten.";
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
