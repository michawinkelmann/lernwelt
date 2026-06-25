// experiment.js — Interaktives Experiment: Koinzidenzmethode — Einzelphotonennachweis (QP, eA).
// Aufbau wie im Quantenoptik-Praktikum (Grangier-Roger-Aspect): Eine getriggerte
// ("heralded") Photonenquelle schickt Licht auf einen 50:50-Strahlteiler mit zwei
// Detektoren D1, D2 und einem Koinzidenzzähler. Pro Triggerzeit ("gate") liest man
// die vier Zählerstände N_T (Trigger), N1, N2, N_koinz SELBST ab und berechnet die
// Korrelation g²(0) = N_koinz·N_T / (N1·N2). Klassische/abgeschwächte Quellen liefern
// g²(0) ≈ 1, eine echte Einzelphotonenquelle g²(0) < 1 (Antikorrelation) — ein einzelnes
// Photon kann sich am Strahlteiler nicht aufteilen. Die Zählstreuung (Poisson-artig) ist
// pro (Quelle, Zeit, Wiederholung) deterministisch geseedet, damit pruefFaelle und TESTS
// in Node analytisch prüfbar bleiben. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, esc, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen } from "../../../assets/js/experiment/helfer.js";

// ---------- Quellen des Aufbaus ----------
// Jede Quelle ist über eine "wahre" Korrelation g2 und die Ereignisraten definiert.
// rateTrigger: Triggerereignisse je Sekunde (Heralds). teilA: Wahrscheinlichkeit, dass
// ein freigegebenes Photon im transmittierten Arm D1 detektiert wird; teilB analog D2.
// rateA = rateTrigger·teilA, rateB = rateTrigger·teilB (Klicks je Sekunde).
// Koinzidenzen je Sekunde folgen aus der Definition: rateK = g2·rateA·rateB/rateTrigger.
export const QUELLEN = [
  { id: "einzelphoton", name: "Einzelphotonenquelle (getriggert)", kurz: "echtes Einzelphoton",
    g2: 0.18, rateTrigger: 20000, teilA: 0.20, teilB: 0.20, klassisch: false },
  { id: "lampe", name: "Abgeschwächte Lampe (thermisch)", kurz: "klassisch, gebündelt",
    g2: 1.30, rateTrigger: 20000, teilA: 0.20, teilB: 0.20, klassisch: true },
  { id: "laser", name: "Abgeschwächter Laser (kohärent)", kurz: "klassisch, Poisson",
    g2: 1.00, rateTrigger: 20000, teilA: 0.20, teilB: 0.20, klassisch: true }
];
export const ZEITEN_S = [1, 2, 5, 10];   // wählbare Gate-Zeiten in s
export const ZEIT_STD = 5;
export const G2_TOLERANZ = 0.06;         // akzeptierte Abweichung beim g²-Eintrag
export const G2_SCHWELLE = 0.5;          // unter 0,5 gilt als eindeutiger Einzelphoton-Nachweis
export const MIN_MESSUNGEN = 6;
export const QUELLE_VON = id => QUELLEN.find(q => q.id === id);

// ---------- Physik (rein, Node-testbar) ----------
// g²(0) aus vier Zählerständen — diese Formel rechnen die Lernenden selbst nach.
export function g2(n1, n2, nKoinz, nTrigger) {
  return (n1 > 0 && n2 > 0) ? (nKoinz * nTrigger) / (n1 * n2) : NaN;
}
// erwartete Zählerwartungswerte (ohne Streuung) für eine Quelle und eine Gate-Zeit
export function erwarteteZaehler(quelle, zeitS) {
  const q = typeof quelle === "string" ? QUELLE_VON(quelle) : quelle;
  const nTrigger = q.rateTrigger * zeitS;
  const n1 = q.rateTrigger * q.teilA * zeitS;
  const n2 = q.rateTrigger * q.teilB * zeitS;
  const nKoinz = q.g2 * n1 * n2 / nTrigger;     // = g2·rateA·rateB·zeit
  return { nTrigger, n1, n2, nKoinz };
}
export function erwarteteKoinzidenzen(quelle, zeitS) {
  return erwarteteZaehler(quelle, zeitS).nKoinz;
}
// Poisson-artige, deterministisch geseedete Streuung: ±√erwartungswert (1σ-Schätzung),
// auf ganze Klicks gerundet — so wie ein realer Zähler ganze Ereignisse zeigt.
function zaehlerWert(schluessel, erwartung) {
  const spanne = 2 * Math.sqrt(Math.max(erwartung, 1)); // ±√µ  → spanne = 2σ
  return Math.max(0, Math.round(erwartung + streuung(schluessel, spanne)));
}
// reale (abgelesene) Zählerstände inkl. Streuung; "wdh" macht Wiederholungen unterscheidbar
export function zaehlerReal(quelle, zeitS, wdh = 0) {
  const q = typeof quelle === "string" ? QUELLE_VON(quelle) : quelle;
  const e = erwarteteZaehler(q, zeitS);
  const s = ":" + q.id + ":" + zeitS + ":" + wdh;
  return {
    nTrigger: zaehlerWert("T" + s, e.nTrigger),
    n1: zaehlerWert("A" + s, e.n1),
    n2: zaehlerWert("B" + s, e.n2),
    nKoinz: zaehlerWert("K" + s, e.nKoinz)
  };
}

// ---------- Eingabe-Prüfungen ----------
export function g2EingabeOk(eingabe, wahr) {
  return Number.isFinite(eingabe) && Number.isFinite(wahr) && Math.abs(eingabe - wahr) <= G2_TOLERANZ;
}
export function istEinzelphotonNachweis(g2Wert) {
  return Number.isFinite(g2Wert) && g2Wert < G2_SCHWELLE;
}
export function bewertungG2(g2Mittel) {
  if (!Number.isFinite(g2Mittel)) return { stufe: "nochmal prüfen", text: "" };
  if (g2Mittel < G2_SCHWELLE)
    return { stufe: "Einzelphoton nachgewiesen", text: "g²(0) deutlich < 1 — klassisch unmöglich." };
  if (g2Mittel < 0.9)
    return { stufe: "Antikorrelation", text: "g²(0) < 1, aber nicht weit unter der Schwelle." };
  return { stufe: "klassisch", text: "g²(0) ≈ 1 oder größer — keine Antikorrelation." };
}
// vollständige Messreihe: ≥ 6 Zeilen und mindestens 2 verschiedene Quellen
export function messreiheVollstaendig(messungen) {
  return messungen.length >= MIN_MESSUNGEN
    && new Set(messungen.map(z => z.quelle)).size >= 2;
}
// hat die Reihe sowohl eine klassische als auch die Einzelphotonenquelle (für den Kontrast)?
export function reiheZeigtKontrast(messungen) {
  const ids = new Set(messungen.map(z => z.quelle));
  return ids.has("einzelphoton") && [...ids].some(id => QUELLE_VON(id).klassisch);
}

// ---------- Prüffälle (analytisch nachgerechnet) ----------
export const pruefFaelle = [
  { art: "g2-formel", n1: 4000, n2: 4000, nK: 800, nT: 20000, soll: 1.0, tol: 1e-9 },
  { art: "g2-einzel", quelle: "einzelphoton", soll: 0.18, tol: 1e-9 },
  { art: "g2-laser", quelle: "laser", soll: 1.00, tol: 1e-9 },
  { art: "g2-lampe", quelle: "lampe", soll: 1.30, tol: 1e-9 }
];

// erwartetes (rauschfreies) g² aus der Definition — muss exakt q.g2 ergeben
function g2Erwartet(quelle, zeitS) {
  const e = erwarteteZaehler(quelle, zeitS);
  return g2(e.n1, e.n2, e.nKoinz, e.nTrigger);
}

export const TESTS = [
  { name: "g²-Formel: N1=N2=4000, N_K=800, N_T=20000 → g²=1,0 (exakt)",
    ok: () => Math.abs(g2(4000, 4000, 800, 20000) - 1) < 1e-9 },
  { name: "g²-Formel symmetrisch + Division: doppelte Koinzidenzen → doppeltes g²",
    ok: () => Math.abs(g2(4000, 4000, 1600, 20000) - 2 * g2(4000, 4000, 800, 20000)) < 1e-12 },
  { name: "erwartetes g² reproduziert die Quell-Definition exakt (alle Quellen, alle Zeiten)",
    ok: () => QUELLEN.every(q => ZEITEN_S.every(t => Math.abs(g2Erwartet(q, t) - q.g2) < 1e-9)) },
  { name: "Einzelphotonenquelle: g²(0) = 0,18 < 0,5 → echter Einzelphoton-Nachweis",
    ok: () => g2Erwartet(QUELLE_VON("einzelphoton"), 5) < G2_SCHWELLE
      && istEinzelphotonNachweis(0.18) && !istEinzelphotonNachweis(0.7) && !istEinzelphotonNachweis(1.0) },
  { name: "Klassische Quellen: Laser g²≈1, Lampe g²≥1 — keine Antikorrelation",
    ok: () => Math.abs(g2Erwartet(QUELLE_VON("laser"), 5) - 1) < 1e-9
      && g2Erwartet(QUELLE_VON("lampe"), 5) >= 1
      && !istEinzelphotonNachweis(g2Erwartet(QUELLE_VON("laser"), 5))
      && !istEinzelphotonNachweis(g2Erwartet(QUELLE_VON("lampe"), 5)) },
  { name: "erwarteteKoinzidenzen = g²·N1·N2/N_T und skaliert linear mit der Zeit",
    ok: () => {
      const q = QUELLE_VON("einzelphoton");
      const k1 = erwarteteKoinzidenzen(q, 1), k5 = erwarteteKoinzidenzen(q, 5);
      const e = erwarteteZaehler(q, 1);
      return Math.abs(k1 - q.g2 * e.n1 * e.n2 / e.nTrigger) < 1e-9 && Math.abs(k5 - 5 * k1) < 1e-9;
    } },
  { name: "reale Zähler streuen Poisson-artig (≤ ±√µ) und sind ganzzahlig",
    ok: () => QUELLEN.every(q => ZEITEN_S.every(t => {
      const e = erwarteteZaehler(q, t), r = zaehlerReal(q, t, 0);
      const sigOk = (gemessen, mu) => Number.isInteger(gemessen)
        && Math.abs(gemessen - mu) <= Math.sqrt(Math.max(mu, 1)) + 1e-9;
      return sigOk(r.nTrigger, e.nTrigger) && sigOk(r.n1, e.n1)
        && sigOk(r.n2, e.n2) && sigOk(r.nKoinz, e.nKoinz);
    })) },
  { name: "Zähler deterministisch + Wiederholungen unterscheidbar",
    ok: () => {
      const a = zaehlerReal("einzelphoton", 5, 0), b = zaehlerReal("einzelphoton", 5, 0);
      const c = zaehlerReal("einzelphoton", 5, 1);
      return a.nKoinz === b.nKoinz && a.n1 === b.n1
        && (a.nKoinz !== c.nKoinz || a.n1 !== c.n1 || a.nTrigger !== c.nTrigger);
    } },
  { name: "gemessenes g² aus realen Zählern bleibt nahe am Sollwert (alle Quellen)",
    ok: () => QUELLEN.every(q => {
      const r = zaehlerReal(q, 10, 0);
      const g = g2(r.n1, r.n2, r.nKoinz, r.nTrigger);
      return g2EingabeOk(g, g) && Math.abs(g - q.g2) < 0.15; // Streuung klein bei 10 s
    }) },
  { name: "g²-Eingabe-Toleranz ±0,06 greift in beide Richtungen",
    ok: () => g2EingabeOk(0.18, 0.18) && g2EingabeOk(0.23, 0.18) && g2EingabeOk(0.13, 0.18)
      && !g2EingabeOk(0.25, 0.18) && !g2EingabeOk(0.10, 0.18) && !g2EingabeOk(NaN, 0.18) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("0,18") === 0.18 && parseDezimal("1.30") === 1.30 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 Zeilen und ≥ 2 Quellen; Kontrast erkannt",
    ok: () => {
      const z = (quelle) => ({ quelle });
      const nurEine = [0, 0, 0, 0, 0, 0].map(() => z("laser"));
      const gemischt = [z("einzelphoton"), z("einzelphoton"), z("laser"), z("laser"), z("lampe"), z("laser")];
      return !messreiheVollstaendig(nurEine) && messreiheVollstaendig(gemischt)
        && !messreiheVollstaendig(gemischt.slice(0, 5))
        && reiheZeigtKontrast(gemischt) && !reiheZeigtKontrast(nurEine);
    } },
  { name: "Bewertung: 0,18 → nachgewiesen · 0,75 → Antikorrelation · 1,30 → klassisch",
    ok: () => bewertungG2(0.18).stufe === "Einzelphoton nachgewiesen"
      && bewertungG2(0.75).stufe === "Antikorrelation"
      && bewertungG2(1.30).stufe === "klassisch" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "g2-formel") return Math.abs(g2(p.n1, p.n2, p.nK, p.nT) - p.soll) <= p.tol;
      return Math.abs(g2Erwartet(QUELLE_VON(p.quelle), 5) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Draufsicht auf den optischen Tisch) ----------
  const QX = 60, QY = 150;            // Quelle (links)
  const BSX = 200, BSY = 150;         // Strahlteiler (Mitte)
  const D1X = 330, D1Y = 150;         // Detektor D1 (transmittiert, rechts)
  const D2X = 200, D2Y = 40;          // Detektor D2 (reflektiert, oben)
  const TRX = 60, TRY = 70;           // Trigger-/Heraldzweig (Partnerphoton)

  const zustand = {
    phase: "aufbau",
    quelle: "einzelphoton", zeitS: ZEIT_STD,
    vorhersage: "",                       // "kleiner" | "gleich" | "groesser"
    aktZaehler: null,                     // zuletzt gemessener Zählerstand (zum Ablesen)
    wdhProKombi: {},                      // {quelle:zeit -> Anzahl bisheriger Messungen}
    messungen: [],                        // {quelle, zeitS, nTrigger, n1, n2, nKoinz, g2Eingabe, g2Ok}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    meldungMessen: "", meldungAuswerten: "",
    animPhase: 0
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="400" height="300" aria-label="Draufsicht auf den optischen Tisch: links die getriggerte Photonenquelle, von der ein Triggerphoton nach oben links zum Heraldzähler läuft und ein Signalphoton nach rechts zum 50:50-Strahlteiler in der Mitte. Vom Strahlteiler führt ein transmittierter Strahl nach rechts zu Detektor D1 und ein reflektierter Strahl nach oben zu Detektor D2. Beide Detektoren sind mit einem Koinzidenzzähler verbunden. Unten vier Zählerfelder für Trigger, D1, D2 und Koinzidenzen."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  const g2WahrVon = z => g2(z.n1, z.n2, z.nKoinz, z.nTrigger);
  const kombiSchluessel = () => zustand.quelle + ":" + zustand.zeitS;

  // ---------- Zeichnung ----------
  function pfeil(x1, y1, x2, y2, farbeStr, dick = 2) {
    const len = Math.hypot(x2 - x1, y2 - y1), ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    ctx.strokeStyle = farbeStr; ctx.lineWidth = dick;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    ctx.fillStyle = farbeStr;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - 9 * ux + 5 * uy, y2 - 9 * uy - 5 * ux);
    ctx.lineTo(x2 - 9 * ux - 5 * uy, y2 - 9 * uy + 5 * ux);
    ctx.closePath(); ctx.fill();
  }
  function bauteil(x, y, w, h, label, gefuellt) {
    const cText = farbe("--text"), cFlaeche = farbe("--flaeche"), cLeise = farbe("--text-leise");
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = gefuellt ? cFlaeche : cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x - w / 2, y - h / 2, w, h, 4); else ctx.rect(x - w / 2, y - h / 2, w, h);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(label, x, y + h / 2 + 13);
  }

  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    const q = QUELLE_VON(zustand.quelle);
    const aktiv = zustand.phase !== "aufbau";
    const cStrahl = q.klassisch ? cLeise : cAkzent;

    // Strahlengang (immer schwach sichtbar; in der Durchführung farbig)
    const alpha = aktiv ? 1 : 0.35;
    ctx.globalAlpha = alpha;
    pfeil(QX + 18, QY, BSX - 16, BSY, cStrahl, 2);          // Signal: Quelle → Strahlteiler
    pfeil(QX + 12, QY - 10, TRX + 4, TRY + 14, cLeise, 2);  // Trigger: Quelle → Herald
    pfeil(BSX + 14, BSY, D1X - 18, D1Y, cStrahl, 2);        // transmittiert → D1
    pfeil(BSX, BSY - 14, D2X, D2Y + 18, cStrahl, 2);        // reflektiert → D2
    ctx.globalAlpha = 1;

    // Koinzidenz-Verbindungen (gestrichelt) von D1, D2 zur "&"-Logik
    ctx.save();
    ctx.setLineDash([4, 3]); ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(D1X, D1Y + 16); ctx.lineTo(D1X, 250); ctx.lineTo(265, 250); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(D2X + 16, D2Y); ctx.lineTo(285, D2Y); ctx.lineTo(285, 242); ctx.lineTo(265, 250); ctx.stroke();
    ctx.restore();
    bauteil(255, 250, 26, 22, "Koinzidenz (&)", true);

    // Strahlteiler (50:50) — als gedrehtes Quadrat
    ctx.save();
    ctx.translate(BSX, BSY); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.rect(-13, -13, 26, 26); ctx.fill(); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Strahlteiler 50:50", BSX, BSY + 28);

    // Bauteile
    bauteil(QX, QY, 36, 30, "Quelle", true);
    bauteil(TRX, TRY, 30, 24, "Herald", true);
    bauteil(D1X, D1Y, 30, 26, "D1", true);
    bauteil(D2X, D2Y, 30, 26, "D2", true);

    // laufende Photonen (nur Durchführung, nur ohne reduzierte Bewegung)
    if (aktiv && !reduzierteBewegung()) {
      const t = zustand.animPhase;
      const punkt = (x1, y1, x2, y2, ph) => {
        const f = ((t + ph) % 1);
        ctx.fillStyle = cStrahl; ctx.globalAlpha = 0.9;
        ctx.beginPath(); ctx.arc(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f, 3, 0, 7); ctx.fill();
        ctx.globalAlpha = 1;
      };
      punkt(QX + 18, QY, BSX - 16, BSY, 0);
      // hinter dem Strahlteiler: für ein Einzelphoton entweder D1 ODER D2 — nie beide
      const obenRum = ((Math.floor(t) % 2) === 0);
      if (q.klassisch || obenRum) punkt(BSX + 14, BSY, D1X - 18, D1Y, 0.0);
      if (q.klassisch || !obenRum) punkt(BSX, BSY - 14, D2X, D2Y + 18, 0.0);
    }

    // Quelle-Etikett mit Klassifikation
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText(q.name, 10, 18);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(q.klassisch ? "klassische Lichtwelle" : "quantisiertes Licht", 10, 32);

    // Hinweistext im Aufbau
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(112, 92, 176, 40);
      ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("Zähler laufen in der", 200, 110);
      ctx.fillText("Durchführung mit", 200, 126);
    }
    ctx.textAlign = "start";

    // Vier Zählerfelder unten
    const z = zustand.aktZaehler;
    const feld = (x, et, wert, hervor) => {
      ctx.strokeStyle = hervor ? cAkzent : cText; ctx.lineWidth = hervor ? 2.5 : 1.5; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 270, 92, 26, 5); else ctx.rect(x, 270, 92, 26);
      ctx.fill(); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "start";
      ctx.fillText(et, x + 6, 281);
      ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "end";
      ctx.fillText(aktiv && z ? String(wert) : "—", x + 86, 281 + 0);
      ctx.textAlign = "start";
    };
    feld(6, "Trigger N_T", z ? z.nTrigger : 0, false);
    feld(102, "D1: N₁", z ? z.n1 : 0, false);
    feld(198, "D2: N₂", z ? z.n2 : 0, false);
    feld(300, "Koinz. N_K", z ? z.nKoinz : 0, true);
    ctx.textAlign = "start";
  }

  // ---------- Animationsschleife ----------
  let lauf = null;
  function tick() {
    if (zustand.phase === "messen" && !reduzierteBewegung()) {
      zustand.animPhase += 0.02;
      zeichne();
      lauf = requestAnimationFrame(tick);
    } else { lauf = null; }
  }
  function starteAnim() { if (!lauf && zustand.phase === "messen" && !reduzierteBewegung()) lauf = requestAnimationFrame(tick); }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Idee</h2>
      <p>Eine <strong>getriggerte Photonenquelle</strong> (z. B. parametrische Fluoreszenz) sendet Lichtquanten paarweise aus: Ein <strong>Triggerphoton</strong> meldet dem <em>Heraldzähler</em>, dass gleichzeitig ein <strong>Signalphoton</strong> unterwegs ist (englisch <em>heralded</em> = „angekündigt“). Das Signalphoton trifft auf einen <strong>50:50-Strahlteiler</strong>: Es kann durchgelassen werden (→ Detektor <strong>D1</strong>) oder reflektiert werden (→ Detektor <strong>D2</strong>). Ein <strong>Koinzidenzzähler</strong> registriert, wie oft D1 und D2 im selben Zeitfenster <em>gemeinsam</em> klicken.</p>
      <p><strong>Der Streitfall Welle vs. Teilchen:</strong> Eine klassische Lichtwelle würde sich am Strahlteiler in zwei halbe Wellen aufteilen — beide Detektoren könnten gleichzeitig ansprechen, Koinzidenzen sind möglich. Ein <strong>einzelnes Photon</strong> ist dagegen unteilbar: Es geht entweder zu D1 <em>oder</em> zu D2, niemals zu beiden. Echte Koinzidenzen sollten dann <strong>unterdrückt</strong> sein — das nennt man <strong>Antikorrelation</strong>.</p>
      <p><strong>Das Maß dafür</strong> ist die Korrelationsfunktion zweiter Ordnung:</p>
      <p style="text-align:center"><strong>g²(0) = N_K · N_T / (N₁ · N₂)</strong></p>
      <p>mit den Zählerständen N_T (Trigger), N₁ (D1), N₂ (D2) und N_K (Koinzidenzen). Die klassische Wellentheorie sagt streng <strong>g²(0) ≥ 1</strong> voraus. Für echte Einzelphotonen gilt dagegen <strong>g²(0) &lt; 1</strong> (ideal → 0). Ein gemessenes g²(0) &lt; 1 ist daher ein <strong>direkter Nachweis</strong>, dass Licht aus unteilbaren Quanten besteht.</p>
      <p><strong>Plan:</strong> Wähle nacheinander verschiedene Quellen und Gate-Zeiten, lies die vier Zählerstände <strong>selbst</strong> ab und protokolliere sie (mindestens ${MIN_MESSUNGEN} Zeilen, mindestens 2 Quellen). In der Auswertung berechnest du g²(0) für jede Zeile.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Bei der <strong>Einzelphotonenquelle</strong> erwarte ich für g²(0) im Vergleich zur klassischen Lampe einen Wert …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="kleiner">… deutlich kleiner (Koinzidenzen unterdrückt)</option>
        <option value="gleich">… ungefähr gleich (kein Unterschied)</option>
        <option value="groesser">… größer (mehr Koinzidenzen)</option>
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
  const wortVorhersage = wahl => wahl === "kleiner" ? "deutlich kleiner" : wahl === "groesser" ? "größer" : "ungefähr gleich";

  function beobachtungHtml() {
    const ids = new Set(zustand.messungen.map(z => z.quelle));
    let html = `<p>Deine Vorhersage: g²(0) der Einzelphotonenquelle ist <strong>${wortVorhersage(zustand.vorhersage)}</strong> als bei der klassischen Quelle.</p>`;
    if (reiheZeigtKontrast(zustand.messungen)) {
      const ok = zustand.vorhersage === "kleiner";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: Bei der Einzelphotonenquelle sind die <strong>Koinzidenzen N_K auffällig niedrig</strong> — viel kleiner, als das Produkt der Einzelraten erwarten ließe. ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt siehst du es an deinen eigenen Zählerständen."} (Klassische Quellen zeigen das nicht.)</p>`;
    } else if (ids.size >= 1) {
      html += `<p>Tipp: Miss dieselbe Gate-Zeit einmal mit der <strong>Einzelphotonenquelle</strong> und einmal mit einer <strong>klassischen Quelle</strong> und vergleiche die Koinzidenzen N_K.</p>`;
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
    const q = QUELLE_VON(zustand.quelle);
    const quellenAnz = new Set(zustand.messungen.map(z => z.quelle)).size;
    let fortschritt = `${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen.`;
    if (zustand.messungen.length >= 2 && quellenAnz < 2) fortschritt += " Wechsle auch die Quelle!";
    const z = zustand.aktZaehler;

    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-quelle">Lichtquelle wählen:</label>
        <select id="exp-quelle" class="exp-wahl">
          ${QUELLEN.map(qu => `<option value="${qu.id}"${qu.id === zustand.quelle ? " selected" : ""}>${esc(qu.name)}</option>`).join("")}
        </select>
        <label for="exp-zeit">Gate-Zeit (Messdauer): <strong id="exp-zeit-wert">${zustand.zeitS} s</strong></label>
        <input type="range" id="exp-zeit" min="0" max="${ZEITEN_S.length - 1}" step="1" value="${ZEITEN_S.indexOf(zustand.zeitS)}" aria-label="Gate-Zeit in Sekunden, Stufen 1, 2, 5, 10">
      </div>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-start">Messung starten (Zähler ablesen)</button></div>
      <div id="exp-zaehler" aria-live="polite">${
        z ? `<p>Abgelesene Zählerstände (${esc(QUELLE_VON(z.quelle).name)}, ${z.zeitS} s):</p>
        <table class="exp-tabelle"><tbody>
          <tr><td>Trigger N_T</td><td><strong>${z.nTrigger}</strong></td></tr>
          <tr><td>D1: N₁</td><td><strong>${z.n1}</strong></td></tr>
          <tr><td>D2: N₂</td><td><strong>${z.n2}</strong></td></tr>
          <tr><td>Koinzidenzen N_K</td><td><strong>${z.nKoinz}</strong></td></tr>
        </tbody></table>
        <p>Lies die vier Werte vom Canvas/aus der Tabelle ab und übernimm sie ins Protokoll.</p>
        <div class="exp-knopfzeile"><button class="knopf" id="exp-uebernehmen">Diese Werte ins Protokoll</button></div>`
        : `<p>Stelle Quelle und Gate-Zeit ein und drücke „Messung starten“ — dann erscheinen die vier Zählerstände zum Ablesen.</p>`
      }</div>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messprotokoll</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Quelle</th><th>t/s</th><th>N_T</th><th>N₁</th><th>N₂</th><th>N_K</th></tr></thead>
        <tbody>${zustand.messungen.map(m =>
          `<tr><td>${esc(QUELLE_VON(m.quelle).kurz)}</td><td>${m.zeitS}</td><td>${m.nTrigger}</td><td>${m.n1}</td><td>${m.n2}</td><td>${m.nKoinz}</td></tr>`).join("")
          || '<tr><td colspan="6">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const quelleSel = panel.querySelector("#exp-quelle"), zeitRegler = panel.querySelector("#exp-zeit");
    quelleSel.addEventListener("change", () => { zustand.quelle = quelleSel.value; zustand.aktZaehler = null; zeichne(); panelMessen(); });
    zeitRegler.addEventListener("input", () => {
      zustand.zeitS = ZEITEN_S[Number(zeitRegler.value)];
      panel.querySelector("#exp-zeit-wert").textContent = zustand.zeitS + " s";
    });
    panel.querySelector("#exp-start").addEventListener("click", () => {
      const wdh = zustand.wdhProKombi[kombiSchluessel()] || 0;
      const r = zaehlerReal(zustand.quelle, zustand.zeitS, wdh);
      zustand.aktZaehler = { quelle: zustand.quelle, zeitS: zustand.zeitS, ...r };
      zeichne();
      panelMessen();
    });
    panel.querySelector("#exp-uebernehmen")?.addEventListener("click", () => {
      const a = zustand.aktZaehler;
      if (!a) return;
      const schluessel = a.quelle + ":" + a.zeitS;
      zustand.wdhProKombi[schluessel] = (zustand.wdhProKombi[schluessel] || 0) + 1;
      zustand.messungen.push({
        quelle: a.quelle, zeitS: a.zeitS,
        nTrigger: a.nTrigger, n1: a.n1, n2: a.n2, nKoinz: a.nKoinz,
        g2Eingabe: null, g2Ok: null
      });
      zustand.aktZaehler = null;
      zustand.meldungMessen = "✓ Werte ins Protokoll übernommen. Stelle nun eine andere Quelle oder Zeit ein und miss erneut.";
      zeichne();
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    starteAnim();
  }

  // ---------- Phase 3: Auswertung ----------
  function zeichneDiagramm(cv, messungen) {
    const c = cv.getContext("2d");
    const W = cv.width, H = cv.height, L = 44, R = 12, T = 14, B = 34;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    c.clearRect(0, 0, W, H);
    const yMax = Math.max(1.6, ...messungen.map(m => g2WahrVon(m))) * 1.1;
    const px = i => L + (W - L - R) * (messungen.length === 1 ? 0.5 : i / (messungen.length - 1));
    const py = v => H - B - (H - B - T) * (v / yMax);
    // Gitter + y-Achse
    c.strokeStyle = cLeise; c.lineWidth = 1; c.font = "10px system-ui, sans-serif"; c.fillStyle = cLeise;
    for (let v = 0; v <= yMax; v += 0.5) {
      const y = py(v);
      c.globalAlpha = 0.4; c.beginPath(); c.moveTo(L, y); c.lineTo(W - R, y); c.stroke(); c.globalAlpha = 1;
      c.textAlign = "end"; c.fillText(komma(v, 1), L - 4, y + 3);
    }
    // g²=1-Linie (klassische Grenze) hervorheben
    c.strokeStyle = cText; c.setLineDash([5, 3]); c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, py(1)); c.lineTo(W - R, py(1)); c.stroke(); c.setLineDash([]);
    c.fillStyle = cText; c.textAlign = "start"; c.fillText("g²=1 (klassische Grenze)", L + 4, py(1) - 4);
    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, T); c.lineTo(L, H - B); c.lineTo(W - R, H - B); c.stroke();
    c.fillStyle = cLeise; c.textAlign = "start"; c.fillText("g²(0)", 4, T + 8);
    c.textAlign = "center"; c.fillText("Messung Nr.", (L + W - R) / 2, H - 6);
    // Punkte
    messungen.forEach((m, i) => {
      const v = g2WahrVon(m), x = px(i), y = py(v);
      const klassisch = QUELLE_VON(m.quelle).klassisch;
      c.fillStyle = klassisch ? cLeise : cAkzent;
      c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill();
      c.fillStyle = cText; c.font = "9px system-ui, sans-serif"; c.textAlign = "center";
      c.fillText(String(i + 1), x, H - B + 12);
    });
  }

  function panelAuswerten() {
    if (lauf) { cancelAnimationFrame(lauf); lauf = null; }
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} Messungen mit mindestens 2 verschiedenen Quellen — bisher: ${zustand.messungen.length}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const fertig = zustand.messungen.every(z => z.g2Ok === true);
    // Mittelwert nur über die Einzelphotonenquelle (der eigentliche Nachweis)
    const einzelMess = zustand.messungen.filter(z => z.quelle === "einzelphoton");
    const mwEinzel = fertig && einzelMess.length
      ? mittel(einzelMess.map(z => z.g2Eingabe)) : NaN;
    const klassMess = zustand.messungen.filter(z => QUELLE_VON(z.quelle).klassisch);
    const mwKlass = fertig && klassMess.length
      ? mittel(klassMess.map(z => z.g2Eingabe)) : NaN;
    const bew = fertig && einzelMess.length ? bewertungG2(mwEinzel) : null;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Für jede Zeile gilt: <strong>g²(0) = N_K · N_T / (N₁ · N₂)</strong>. Rechne selbst (Taschenrechner!) und trage dein Ergebnis ein — z. B. 0,18.</p>
      <details class="exp-fehler"><summary>Hilfe: Rechenweg für eine Zeile</summary>
        <p>Beispiel N_T = 100000, N₁ = 20000, N₂ = 20000, N_K = 3600:<br>
        g²(0) = (N_K · N_T)/(N₁ · N₂) = (3600 · 100000)/(20000 · 20000) = 3{,}6·10⁸ / 4·10⁸ = <strong>0{,}90</strong>.<br>
        Tipp: Zähler und Nenner getrennt ausrechnen, dann teilen. Werte über 1 sind klassisch, Werte deutlich unter 1 beweisen Einzelphotonen.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>Quelle</th><th>N_T</th><th>N₁</th><th>N₂</th><th>N_K</th><th>g²(0)</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${esc(QUELLE_VON(z.quelle).kurz)}</td><td>${z.nTrigger}</td><td>${z.n1}</td><td>${z.n2}</td><td>${z.nKoinz}</td>
          <td><input class="exp-eingabe" style="width:5em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.g2Eingabe == null ? "" : komma(z.g2Eingabe, 2)}" aria-label="Dein g²(0) für Zeile ${i + 1}"></td>
          <td>${z.g2Ok === true ? "✓" : z.g2Ok === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Zeilen prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <h3>Dein g²(0) je Messung</h3>
      <canvas id="exp-diagramm-cv" class="exp-diagramm" width="380" height="220" aria-label="Streudiagramm: dein berechnetes g²(0) je Messung. Eine gestrichelte Linie markiert die klassische Grenze g²=1. Punkte der Einzelphotonenquelle liegen deutlich darunter, klassische Quellen auf oder über der Linie."></canvas>
      <div class="exp-hinweis">
        ${einzelMess.length ? `<p><strong>Einzelphotonenquelle: g²(0) ≈ ${komma(mwEinzel, 2)}</strong> (Mittel aus ${einzelMess.length} Zeile${einzelMess.length > 1 ? "n" : ""}). ${klassMess.length ? `Klassische Quelle: g²(0) ≈ ${komma(mwKlass, 2)}.` : ""} Bewertung: <strong>${bew.stufe}</strong> — ${esc(bew.text)}</p>
        ${mwEinzel < G2_SCHWELLE ? `<p>Dein Messwert liegt <strong>klar unter 1</strong>. Eine klassische Lichtwelle kann das nicht erzeugen (sie fordert g²(0) ≥ 1). Du hast damit gezeigt: <strong>Licht besteht aus unteilbaren Quanten</strong> — am Strahlteiler geht das einzelne Photon entweder zu D1 oder zu D2, nie zu beiden.</p>` : `<p>Für den Nachweis sollte g²(0) der Einzelphotonenquelle deutlich unter ${komma(G2_SCHWELLE, 1)} liegen. Miss bei langer Gate-Zeit (10 s) — dann ist die Statistik besser und die Streuung kleiner.</p>`}` : `<p>Du hast die Einzelphotonenquelle noch nicht ausgewertet — miss und berechne sie, um den eigentlichen Nachweis zu führen.</p>`}
      </div>` : ""}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Was bedeutet ein gemessenes <strong>g²(0) &lt; 1</strong> physikalisch?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="schwach">Das Licht ist einfach sehr schwach (wenige Photonen)</option>
          <option value="unteilbar">Das Licht besteht aus unteilbaren Quanten — ein Photon teilt sich nicht am Strahlteiler</option>
          <option value="defekt">Ein Detektor ist defekt oder zu langsam</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Warum genügt es <strong>nicht</strong>, das Licht stark abzuschwächen, um Einzelphotonen zu „erzeugen“?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="poisson">Abgeschwächtes klassisches Licht ist poissonverteilt — manchmal kommen 0, manchmal 2 Photonen; g²(0) bleibt ≈ 1</option>
          <option value="reicht">Es genügt — schwaches Licht ist automatisch Einzelphotonenlicht</option>
          <option value="energie">Schwaches Licht hat zu wenig Energie für eine Koinzidenz</option>
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
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum wird g²(0) nie exakt 0?</summary>
        <p><strong>Statistische Streuung (Poisson):</strong> Zählereignisse sind zufällig. Bei N Ereignissen schwankt der Wert typisch um ±√N. Deshalb streut auch g²(0) — bei kurzer Gate-Zeit stärker. Gegenmittel: lange messen (große N), damit die relative Streuung √N/N = 1/√N klein wird.</p>
        <p><strong>Mehrphotonen-Beitrag der Quelle:</strong> Keine reale Einzelphotonenquelle ist perfekt — gelegentlich werden zwei Photonen gleichzeitig erzeugt. Diese liefern echte Koinzidenzen und heben g²(0) über 0 (im Versuch ≈ 0,18 statt 0). Je reiner die Quelle, desto näher an 0.</p>
        <p><strong>Dunkelzählraten und zufällige Koinzidenzen:</strong> Detektoren klicken auch ohne Photon (Dunkelrate), und im endlichen Koinzidenzfenster fallen zufällig zwei unabhängige Klicks zusammen. Beides erzeugt „unechte“ Koinzidenzen und vergrößert g²(0). Engeres Zeitfenster und gekühlte Detektoren helfen.</p>
        <p><strong>Detektor-Totzeit/Effizienz:</strong> Nach einem Klick ist ein Detektor kurz „blind“ und nicht jedes Photon wird registriert. Das verfälscht die Raten — durch die Triggerung (Heralding) und das Verhältnis in g²(0) kürzt sich der Effekt aber weitgehend heraus.</p>
      </details>`;

    if (fertig) zeichneDiagramm(panel.querySelector("#exp-diagramm-cv"), zustand.messungen);

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.g2Eingabe = null; z.g2Ok = null; return; }
        z.g2Eingabe = wert;
        z.g2Ok = g2EingabeOk(wert, g2WahrVon(z));
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (Dezimalzahl, z. B. 0,18).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.g2Ok).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle Zeilen bestätigt — das Diagramm und dein Ergebnis warten unten."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±0,06 Toleranz). Häufigste Stolperfalle: Zähler N_K · N_T und Nenner N₁ · N₂ getrennt ausrechnen, erst dann teilen.";
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "unteilbar" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "poisson" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("koinzidenz-messreihe.csv",
        ["Quelle", "t in s", "N_T", "N1", "N2", "N_K", "g2(0)"],
        zustand.messungen.map(z => [QUELLE_VON(z.quelle).kurz, String(z.zeitS),
          String(z.nTrigger), String(z.n1), String(z.n2), String(z.nKoinz),
          z.g2Eingabe == null ? "" : z.g2Eingabe]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        quelle: "einzelphoton", zeitS: ZEIT_STD, vorhersage: "",
        aktZaehler: null, wdhProKombi: {}, messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! g²(0) < 1 heißt: Die Koinzidenzen sind stärker unterdrückt, als es eine teilbare Welle je könnte. Das einzelne Photon entscheidet sich am Strahlteiler für genau einen Weg — D1 oder D2. Erst der Nachweis g²(0) < 1 zeigt zwingend die Quantelung des Lichts."
      : "✗ Nicht ganz: Schwaches klassisches Licht hätte trotzdem g²(0) ≥ 1, ein Detektordefekt würde die Raten anders verfälschen. Entscheidend ist die Unteilbarkeit — ein Photon kann nicht gleichzeitig D1 und D2 auslösen.";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: Abgeschwächtes Laser-/Lampenlicht folgt der Poisson-Statistik. Im Mittel mag nur ein Bruchteil eines Photons pro Gate ankommen, aber gelegentlich sind es zwei — und genau die liefern Koinzidenzen, sodass g²(0) ≈ 1 bleibt. Nur eine echte (getriggerte) Einzelphotonenquelle drückt g²(0) unter 1."
      : "✗ Schau auf deine Messung der klassischen Quelle: Trotz starker Abschwächung bleibt dort g²(0) ≈ 1. Schwaches Licht ist nicht automatisch Einzelphotonenlicht — die Photonenzahl pro Gate schwankt (Poisson), es kommen auch mal zwei gleichzeitig.";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
    if (id === "messen") starteAnim();
    else if (lauf) { cancelAnimationFrame(lauf); lauf = null; }
  }
  wechslePhase("aufbau");
}
