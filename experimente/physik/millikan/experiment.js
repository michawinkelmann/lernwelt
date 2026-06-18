// experiment.js — Interaktives Experiment: Millikan-Versuch (Qualifikationsphase, eA).
// Schwebe-Methode, bewusst vereinfacht (und ehrlich benannt): kein Auftrieb der Luft,
// keine Brownsche Bewegung, der Tröpfchenradius gilt als per Mikroskop-Messokular
// abgelesen — in Wirklichkeit bestimmt man ihn über die Sinkgeschwindigkeit (Stokes).
// Messpraxis wie im Original: Spannung feinfühlig einstellen, bis das Tröpfchen
// schwebt, U notieren, q = m·g·d/U berechnen — und im Treppenmuster der q-Werte
// die Elementarladung entdecken. Tröpfchen sind deterministisch geseedet (testbar).

import { mulberry32, seedAus, parseDezimal, komma, mittel, esc, farbe, reduzierteBewegung, bauePhasen, csvHerunterladen } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const PLATTENABSTAND = 6.00e-3;  // m (d)
export const OEL_DICHTE = 875.3;        // kg/m³ (ρ)
export const G = 9.81;                  // m/s²
const E_WAHR = 1.602e-19;               // C — nur intern, wird NICHT angezeigt!
export const U_MAX_GERAET = 600;        // V (Netzgerät)
export const U_MIN_NUTZBAR = 20;        // V — darunter ist U* nicht sauber einstellbar
export const ANZAHL_TROPFEN = 12;       // Ölvorrat
export const SCHWEBE_TOLERANZ_V = 2;    // |U − U*| ≤ 2 V → Tröpfchen schwebt sichtbar
export const EINTRAG_TOLERANZ_V = 3;    // notierte Schwebespannung: ±3 V akzeptiert
export const E_EINGABE_TOLERANZ = 0.05; // e-Eingabe in 10⁻¹⁹ C: ±0,05 akzeptiert
export const MIN_MESSUNGEN = 5;

// ---------- Tröpfchen (deterministisch via mulberry32/seedAus) ----------
export function masseAusRadius(radiusM) {
  return OEL_DICHTE * (4 / 3) * Math.PI * radiusM ** 3; // kg
}
export function schwebeSpannung(masseKg, n) {
  return masseKg * G * PLATTENABSTAND / (n * E_WAHR);   // V (U*)
}
// Tröpfchen Nr. i (1…12): Radius sichtbar (Messokular), Ladungszahl n GEHEIM.
export function tropfen(i) {
  const rng = mulberry32(seedAus("tropfen:" + i));
  const radiusMu = 0.35 + rng() * 0.40;        // µm
  const n = 1 + Math.floor(rng() * 5);         // 1…5 Elementarladungen (geheim)
  const masse = masseAusRadius(radiusMu * 1e-6);
  const uStern = schwebeSpannung(masse, n);
  // außerhalb 20–600 V nicht messbar → wird beim Einsprühen automatisch aussortiert
  const nutzbar = uStern >= U_MIN_NUTZBAR && uStern <= U_MAX_GERAET;
  return { nr: i, radiusMu, masse, n, uStern, nutzbar };
}
export function alleTropfen() {
  return Array.from({ length: ANZAHL_TROPFEN }, (_, k) => tropfen(k + 1));
}

// ---------- Mess-/Auswertelogik (rein, Node-testbar) ----------
// Kräftegleichgewicht beim Schweben: q·U/d = m·g  →  q = m·g·d/U
export function ladungAusU(masseKg, uVolt) {
  return uVolt > 0 ? masseKg * G * PLATTENABSTAND / uVolt : NaN;
}
// Vorzeichen der Drift: ∝ (n·e·U/d − m·g); > 0 → steigt, < 0 → sinkt
export function driftMass(t, uVolt) {
  return t.n * E_WAHR * uVolt / PLATTENABSTAND - t.masse * G;
}
export function schwebt(uVolt, uStern) {
  return Math.abs(uVolt - uStern) <= SCHWEBE_TOLERANZ_V;
}
export function eintragOk(uVolt, uStern) {
  return Number.isFinite(uVolt) && Math.abs(uVolt - uStern) <= EINTRAG_TOLERANZ_V;
}
// Stufen-Logik: Verhältnis zur kleinsten Ladung, auf n hochgerechnet
export function nAusVerhaeltnis(q, qMin, nMin) {
  return Math.round(q / qMin * nMin);
}
export function hypotheseOk(nr, nEingabe) {
  return Number.isInteger(nEingabe) && tropfen(nr).n === nEingabe;
}
// e als Mittel über q/n (n = bestätigte Hypothese); Ein-/Ausgabe in 10⁻¹⁹ C
export function eMittel1e19(messungen) {
  return mittel(messungen.map(z => z.q / z.n)) / 1e-19;
}
export function eEingabeOk(eingabe1e19, mittel1e19) {
  return Number.isFinite(eingabe1e19) && Math.abs(eingabe1e19 - mittel1e19) <= E_EINGABE_TOLERANZ;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  // Kontrollwert aus der Versuchsplanung: r = 0,5 µm, n = 2
  { art: "kontrolle", radiusMu: 0.5, n: 2, sollMasse: 4.584e-16, tolMasse: 2e-19, sollU: 84.2, tolU: 0.1 },
  // konkrete Tröpfchen (deterministisch):
  { art: "tropfen", nr: 1, sollU: 109.18, tolU: 0.05, nutzbar: true },
  { art: "tropfen", nr: 3, sollU: 17.81, tolU: 0.05, nutzbar: false }, // < 20 V → aussortiert
  { art: "tropfen", nr: 7, sollU: 90.64, tolU: 0.05, nutzbar: true },
  { art: "tropfen", nr: 10, sollU: 275.75, tolU: 0.05, nutzbar: true }
];

export const TESTS = [
  { name: "Kontrollwert Masse: r = 0,5 µm → m ≈ 4,584·10⁻¹⁶ kg",
    ok: () => Math.abs(masseAusRadius(0.5e-6) - 4.584e-16) <= 2e-19 },
  { name: "Kontrollwert Schwebespannung: r = 0,5 µm, n = 2 → U* = 84,2 V",
    ok: () => Math.abs(schwebeSpannung(masseAusRadius(0.5e-6), 2) - 84.2) <= 0.1 },
  { name: "Alle 12 Tröpfchen deterministisch reproduzierbar",
    ok: () => alleTropfen().every(t => { const u = tropfen(t.nr);
      return u.radiusMu === t.radiusMu && u.n === t.n && u.masse === t.masse && u.uStern === t.uStern; }) },
  { name: "Parameterbereiche: r in [0,35; 0,75) µm, n in 1…5",
    ok: () => alleTropfen().every(t => t.radiusMu >= 0.35 && t.radiusMu < 0.75
      && Number.isInteger(t.n) && t.n >= 1 && t.n <= 5) },
  { name: "Mindestens 9 der 12 Tröpfchen nutzbar (U* in 20–600 V)",
    ok: () => alleTropfen().filter(t => t.nutzbar).length >= 9 },
  { name: "Aussortier-Logik: nutzbar ⇔ U* in [20; 600] V",
    ok: () => alleTropfen().every(t => t.nutzbar === (t.uStern >= 20 && t.uStern <= 600)) },
  { name: "Prüffälle: U*-Werte und Nutzbarkeit stimmen",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "kontrolle") {
        const m = masseAusRadius(p.radiusMu * 1e-6);
        return Math.abs(m - p.sollMasse) <= p.tolMasse && Math.abs(schwebeSpannung(m, p.n) - p.sollU) <= p.tolU;
      }
      const t = tropfen(p.nr);
      return Math.abs(t.uStern - p.sollU) <= p.tolU && t.nutzbar === p.nutzbar;
    }) },
  { name: "q-Pipeline: perfekte U-Einträge → q/n = e konstant (< 0,1 % Abweichung)",
    ok: () => alleTropfen().filter(t => t.nutzbar).every(t => {
      const q = ladungAusU(t.masse, t.uStern);
      return Math.abs(q / t.n - E_WAHR) / E_WAHR < 0.001;
    }) },
  { name: "Stufen-Logik: Verhältnis zur kleinsten Ladung rundet korrekt auf n",
    ok: () => { const ts = alleTropfen().filter(t => t.nutzbar);
      const qs = ts.map(t => ladungAusU(t.masse, t.uStern));
      const qMin = Math.min(...qs), nMin = ts[qs.indexOf(qMin)].n;
      return nMin === 1 && ts.every((t, i) => nAusVerhaeltnis(qs[i], qMin, nMin) === t.n); } },
  { name: "Schwebe- und Driftlogik: ±2 V schwebt, sonst korrektes Vorzeichen",
    ok: () => { const t = tropfen(1);
      return schwebt(t.uStern + 2, t.uStern) && !schwebt(t.uStern + 2.5, t.uStern)
        && driftMass(t, t.uStern + 10) > 0 && driftMass(t, t.uStern - 10) < 0 && driftMass(t, 0) < 0; } },
  { name: "Eintrag-Toleranz ±3 V (inkl. ungültiger Eingabe)",
    ok: () => eintragOk(109, 109.18) && eintragOk(112, 109.18) && !eintragOk(113, 109.18) && !eintragOk(NaN, 109.18) },
  { name: "Hypothesen-Prüfung: geheimes n wird korrekt erkannt",
    ok: () => hypotheseOk(1, 2) && !hypotheseOk(1, 1) && hypotheseOk(7, 1) && !hypotheseOk(7, 2) && !hypotheseOk(1, NaN) },
  { name: "e-Mittel aus perfekter Messreihe trifft den wahren Wert (< 0,1 %)",
    ok: () => { const mess = alleTropfen().filter(t => t.nutzbar)
        .map(t => ({ q: ladungAusU(t.masse, t.uStern), n: t.n }));
      return Math.abs(eMittel1e19(mess) - E_WAHR / 1e-19) / (E_WAHR / 1e-19) < 0.001; } },
  { name: "e-Eingabe-Prüfung: ±0,05 in 10⁻¹⁹ C",
    ok: () => eEingabeOk(1.60, 1.602) && eEingabeOk(1.65, 1.602) && !eEingabeOk(1.66, 1.602) && !eEingabeOk(NaN, 1.602) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("84,2") === 84.2 && parseDezimal("84.2") === 84.2 && Number.isNaN(parseDezimal("abc")) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  // ---------- Canvas-Geometrie (Blick durchs Mikroskop, stark vergrößert) ----------
  const SPALT_OBEN = 78, SPALT_UNTEN = 392;          // Plattenzwischenraum ≙ 6,00 mm
  const TROPFEN_X = 180, Y_MIN = SPALT_OBEN + 10, Y_MAX = SPALT_UNTEN - 10;
  const Y_MITTE = (SPALT_OBEN + SPALT_UNTEN) / 2, Y_START = 130;

  const zustand = {
    phase: "aufbau",
    naechsteNr: 1,       // welches Tröpfchen „Einsprühen“ als Nächstes zieht
    aktiv: null,         // aktuelles Tröpfchen oder null
    U: 0,                // eingestellte Spannung in V
    tropfenY: Y_MITTE,
    verworfen: [],       // aussortierte Tröpfchen-Nrn (automatisch + von Hand)
    messungen: [],       // {nr, radiusMu, masse, U, q, n, nOk}
    hypothesenGeprueft: false,
    eBestaetigt: null,   // {eingabe, mittel} nach erfolgreicher e-Eingabe
    meldungMessen: "", meldungAuswerten: ""
  };
  const alleHypothesenOk = () => zustand.messungen.length > 0 && zustand.messungen.every(z => z.nOk === true);

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="460" aria-label="Versuchsaufbau: Plattenkondensator mit Öltröpfchen, gesehen durch das Messokular mit Fadenkreuz; oben der Zerstäuber, unten das Netzgerät mit der eingestellten Spannung."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  // ---------- Statuslogik (Pfeil + Text — funktioniert auch ohne Animation) ----------
  function statusText() {
    if (!zustand.aktiv) return "Kein Tröpfchen in der Kammer — sprühe ein.";
    if (schwebt(zustand.U, zustand.aktiv.uStern)) return "✓ Das Tröpfchen schwebt! Notiere die Spannung.";
    return driftMass(zustand.aktiv, zustand.U) > 0
      ? "↑ Das Tröpfchen steigt — Spannung verringern."
      : "↓ Das Tröpfchen sinkt — Spannung erhöhen.";
  }

  // ---------- Animation (bei prefers-reduced-motion: Pfeil + Text statt Bewegung) ----------
  let rafId = 0, tZuletzt = 0;
  function animTick(t) {
    if (!zustand.aktiv || zustand.phase !== "messen" || reduziert) { rafId = 0; return; }
    const dt = Math.min(0.05, Math.max(0, (t - tZuletzt) / 1000)); tZuletzt = t;
    const a = zustand.aktiv;
    if (!schwebt(zustand.U, a.uStern)) {
      // Anzeige-Modell: Driftgeschwindigkeit ∝ (n·e·U/d − m·g), normiert auf m·g
      const rel = Math.max(-1.5, Math.min(1.5, zustand.U / a.uStern - 1));
      zustand.tropfenY = Math.max(Y_MIN, Math.min(Y_MAX, zustand.tropfenY - rel * 80 * dt));
    }
    zeichne();
    rafId = requestAnimationFrame(animTick);
  }
  function starteAnim() {
    if (!rafId && !reduziert && zustand.aktiv && zustand.phase === "messen") {
      tZuletzt = performance.now();
      rafId = requestAnimationFrame(animTick);
    }
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche"), cOk = farbe("--ok", "#2a7");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "13px system-ui, sans-serif"; ctx.textAlign = "start";

    // Zerstäuber (oben, sprüht durch ein Loch in der oberen Platte ein)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(168, 38); ctx.lineTo(178, 60); ctx.moveTo(192, 38); ctx.lineTo(182, 60); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.fillText("Zerstäuber", 200, 46);

    // Kondensatorplatten (oben +, unten −) mit Einsprühloch
    ctx.fillStyle = cText;
    ctx.fillRect(28, 64, 144, 14); ctx.fillRect(188, 64, 144, 14);   // obere Platte mit Loch
    ctx.fillRect(28, SPALT_UNTEN, 304, 14);                           // untere Platte
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.fillText("+", 12, 77); ctx.fillText("−", 12, SPALT_UNTEN + 13);
    ctx.font = "13px system-ui, sans-serif";

    // Glaswände + Maßpfeil d = 6,00 mm
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(28, SPALT_OBEN); ctx.lineTo(28, SPALT_UNTEN);
    ctx.moveTo(332, SPALT_OBEN); ctx.lineTo(332, SPALT_UNTEN); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(344, SPALT_OBEN); ctx.lineTo(344, SPALT_UNTEN); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(344, SPALT_OBEN); ctx.lineTo(340, SPALT_OBEN + 8); ctx.lineTo(348, SPALT_OBEN + 8); ctx.closePath();
    ctx.moveTo(344, SPALT_UNTEN); ctx.lineTo(340, SPALT_UNTEN - 8); ctx.lineTo(348, SPALT_UNTEN - 8); ctx.closePath();
    ctx.fillStyle = cLeise; ctx.fill();
    ctx.save(); ctx.translate(354, Y_MITTE); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = "center"; ctx.fillText("d = 6,00 mm", 0, 0); ctx.restore();

    // Messokular-Fadenkreuz (Blick durchs Mikroskop)
    ctx.strokeStyle = cLeise; ctx.setLineDash([4, 6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(60, Y_MITTE); ctx.lineTo(300, Y_MITTE);
    ctx.moveTo(TROPFEN_X, SPALT_OBEN + 14); ctx.lineTo(TROPFEN_X, SPALT_UNTEN - 14); ctx.stroke();
    ctx.setLineDash([]);

    // Öltröpfchen
    if (zustand.aktiv) {
      const y = reduziert ? Y_MITTE : zustand.tropfenY;
      const rPx = 4 + (zustand.aktiv.radiusMu - 0.35) * 10; // 4–8 px je nach r
      ctx.fillStyle = cAkzent;
      ctx.beginPath(); ctx.arc(TROPFEN_X, y, rPx, 0, 7); ctx.fill();
      const schwebtJetzt = schwebt(zustand.U, zustand.aktiv.uStern);
      if (reduziert && !schwebtJetzt) {
        // Pfeil + Text statt Animation
        const hoch = driftMass(zustand.aktiv, zustand.U) > 0, s = hoch ? -1 : 1;
        ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5;
        ctx.beginPath(); ctx.moveTo(TROPFEN_X + 26, y - s * 20); ctx.lineTo(TROPFEN_X + 26, y + s * 20); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(TROPFEN_X + 26, y + s * 24); ctx.lineTo(TROPFEN_X + 20, y + s * 12); ctx.lineTo(TROPFEN_X + 32, y + s * 12); ctx.closePath();
        ctx.fillStyle = cAkzent; ctx.fill();
        ctx.fillText(hoch ? "steigt" : "sinkt", TROPFEN_X + 40, y + 4);
      } else if (schwebtJetzt) {
        ctx.fillStyle = cOk; ctx.fillText("✓ schwebt", TROPFEN_X + 24, y + 4);
      }
    } else {
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Kammer leer — »Einsprühen« drücken", TROPFEN_X, Y_MITTE - 16);
      ctx.textAlign = "start";
    }

    // Netzgerät
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(100, 418, 160, 34, 6); else ctx.rect(100, 418, 160, 34); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("Netzgerät: U = " + zustand.U + " V", 180, 440);
    ctx.textAlign = "start";
  }

  // ---------- Spannung setzen (Regler + Feintasten) ----------
  function setzeU(wert) {
    zustand.U = Math.max(0, Math.min(U_MAX_GERAET, Math.round(wert)));
    const regler = panel.querySelector("#exp-spannung");
    if (regler) regler.value = String(zustand.U);
    const anzeige = panel.querySelector("#exp-u-wert");
    if (anzeige) anzeige.textContent = zustand.U + " V";
    const status = panel.querySelector("#exp-status");
    if (status) status.textContent = statusText();
    zeichne();
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Zwischen zwei horizontalen <strong>Kondensatorplatten</strong> (Abstand d = 6,00 mm) sprüht ein <strong>Zerstäuber</strong> winzige Öltröpfchen ein (Öldichte ρ = 875,3 kg/m³). Beim Zerstäuben laden sie sich durch Reibung <strong>negativ</strong> auf. Durch ein <strong>Mikroskop mit Messokular</strong> beobachtest du ein einzelnes Tröpfchen und liest seinen Radius r ab. Ein regelbares <strong>Netzgerät (0–600 V)</strong> erzeugt das elektrische Feld.</p>
      <p><strong>Idee der Schwebe-Methode:</strong> Ohne Spannung sinkt das Tröpfchen. Stellst du U so ein, dass die elektrische Kraft die Gewichtskraft genau ausgleicht, <em>schwebt</em> es:</p>
      <p>q · U/d = m · g &nbsp;⟹&nbsp; <strong>q = m · g · d / U</strong> &nbsp;mit&nbsp; m = ρ · (4/3) · π · r³</p>
      <p><strong>Plan:</strong> Sprühe nacheinander bis zu 12 Tröpfchen ein, bringe jedes zum Schweben, notiere U und lass q berechnen. Wenn Ladung wirklich „gequantelt“ ist, muss sich das in deinen q-Werten verraten — das prüfst du in der Auswertung.</p>
      <p class="exp-hinweis"><strong>Vereinfachungen dieser Nachbildung</strong> — im echten Versuch ist es schwerer: (1) Der <strong>Auftrieb</strong> des Tröpfchens in Luft ist hier weggelassen (er ändert das Ergebnis um unter 0,2 %). (2) Die <strong>Brownsche Bewegung</strong> lässt kleine Tröpfchen in Wirklichkeit merklich zittern. (3) Den <strong>Radius</strong> liest du hier bequem am Messokular ab — real bestimmt man ihn erst über die Sinkgeschwindigkeit ohne Feld (Stokes-Reibung). Mehr dazu in der Fehlerbetrachtung.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchführung ----------
  function panelMessen() {
    const a = zustand.aktiv;
    const vorratLeer = zustand.naechsteNr > ANZAHL_TROPFEN;
    const aus = a ? "" : " disabled";
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-knopfzeile">
        <button class="knopf" id="exp-spruehen"${vorratLeer || a ? " disabled" : ""}>${vorratLeer ? "Ölvorrat leer" : "Einsprühen (Tröpfchen " + zustand.naechsteNr + " von " + ANZAHL_TROPFEN + ")"}</button>
        <button class="knopf zweitrangig" id="exp-verwerfen"${aus}>Tröpfchen verwerfen</button>
      </div>
      <p><strong>Messokular:</strong> ${a ? "r = " + komma(a.radiusMu, 2) + " µm" : "—"}</p>
      <div class="exp-regler">
        <label for="exp-spannung">Spannung: U = <strong id="exp-u-wert">${zustand.U} V</strong></label>
        <input type="range" id="exp-spannung" min="0" max="${U_MAX_GERAET}" step="1" value="${zustand.U}"${aus} aria-label="Kondensatorspannung in Volt">
        <div class="exp-knopfzeile" role="group" aria-label="Feineinstellung der Spannung">
          ${[-10, -1, 1, 10].map(d => `<button class="knopf zweitrangig" data-du="${d}"${aus}>${d > 0 ? "+" : "−"}${Math.abs(d)} V</button>`).join("")}
        </div>
      </div>
      <p id="exp-status" class="exp-meldung" aria-live="polite">${esc(statusText())}</p>
      <form id="exp-notieren" class="exp-ablesen">
        <label for="exp-wert">Schwebespannung U in V:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7"${aus}>
        <button class="knopf"${aus}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Nr.</th><th>r in µm</th><th>U in V</th><th>q = m·g·d/U in 10⁻¹⁹ C</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.nr}</td><td>${komma(z.radiusMu, 2)}</td><td>${komma(z.U, 0)}</td><td>${komma(z.q / 1e-19, 2)}</td></tr>`).join("")
          || '<tr><td colspan="4">noch leer</td></tr>'}</tbody>
      </table>
      <p>${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen — je mehr Tröpfchen, desto deutlicher das Muster.${zustand.verworfen.length ? " (Verworfen: " + zustand.verworfen.length + ")" : ""}</p>
      <button class="knopf" id="exp-weiter2"${zustand.messungen.length >= MIN_MESSUNGEN ? "" : " disabled"}>Zur Auswertung</button>`;

    panel.querySelector("#exp-spruehen").addEventListener("click", () => {
      if (zustand.naechsteNr > ANZAHL_TROPFEN || zustand.aktiv) return;
      const t = tropfen(zustand.naechsteNr); zustand.naechsteNr++;
      if (!t.nutzbar) {
        zustand.verworfen.push(t.nr);
        zustand.meldungMessen = "Tröpfchen " + t.nr + " (r = " + komma(t.radiusMu, 2) + " µm): Die Schwebespannung läge außerhalb von " + U_MIN_NUTZBAR + "–" + U_MAX_GERAET + " V — mit diesem Netzgerät nicht sauber einstellbar. Automatisch aussortiert; sprühe erneut ein.";
      } else {
        zustand.aktiv = t;
        zustand.tropfenY = reduziert ? Y_MITTE : Y_START;
        zustand.meldungMessen = "Tröpfchen " + t.nr + " ist in der Kammer. Ohne Spannung sinkt es — regle U, bis es schwebt.";
      }
      panelMessen(); zeichne(); starteAnim();
    });
    panel.querySelector("#exp-verwerfen").addEventListener("click", () => {
      if (!zustand.aktiv) return;
      zustand.verworfen.push(zustand.aktiv.nr);
      zustand.aktiv = null;
      zustand.meldungMessen = "Tröpfchen verworfen — sprühe das nächste ein.";
      panelMessen(); zeichne();
    });
    panel.querySelector("#exp-spannung").addEventListener("input", ev => setzeU(Number(ev.target.value)));
    panel.querySelectorAll("[data-du]").forEach(k => k.addEventListener("click", () => setzeU(zustand.U + Number(k.dataset.du))));
    panel.querySelector("#exp-notieren").addEventListener("submit", ev => {
      ev.preventDefault();
      const a2 = zustand.aktiv;
      if (!a2) return;
      const u = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (!eintragOk(u, a2.uStern)) {
        meldung.textContent = "✗ Bei diesem Wert schwebt das Tröpfchen nicht. Regle U, bis „✓ schwebt“ erscheint, und notiere genau diese Spannung.";
        return;
      }
      const q = ladungAusU(a2.masse, u);
      zustand.messungen.push({ nr: a2.nr, radiusMu: a2.radiusMu, masse: a2.masse, U: u, q, n: null, nOk: null });
      zustand.hypothesenGeprueft = false; zustand.eBestaetigt = null;
      zustand.aktiv = null;
      zustand.meldungMessen = "✓ Notiert: q = " + komma(q / 1e-19, 2) + " · 10⁻¹⁹ C (vom System aus q = m·g·d/U berechnet). Sprühe das nächste Tröpfchen ein.";
      panelMessen(); zeichne();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (zustand.messungen.length < MIN_MESSUNGEN) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} Messungen — bisher: ${zustand.messungen.length}. Je mehr Tröpfchen, desto deutlicher wird das Muster.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const sortiert = [...zustand.messungen].sort((x, y) => x.q - y.q);
    const qMin = sortiert[0].q;
    const fertig = alleHypothesenOk();
    const eMittelWert = fertig ? eMittel1e19(zustand.messungen) : NaN;
    const e = zustand.eBestaetigt;
    const abwLit = e ? Math.abs(e.eingabe * 1e-19 - 1.602e-19) / 1.602e-19 * 100 : 0;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <h3>1 · Das Treppenmuster</h3>
      <p>Deine Ladungen, aufsteigend sortiert. Wären beliebige Ladungen möglich, läge hier eine glatte Rampe — stattdessen…</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Punktdiagramm: gemessene Ladungen aufsteigend sortiert; die Werte sammeln sich auf wenigen Stufen statt auf einer glatten Rampe."></canvas>
      <h3>2 · Verhältnisse bilden</h3>
      <p><strong>Teile jede Ladung durch die kleinste — was fällt auf?</strong> Die Spalte q/q<sub>min</sub> nimmt dir das Rechnen ab:</p>
      <table class="exp-tabelle">
        <thead><tr><th>Nr.</th><th>q in 10⁻¹⁹ C</th><th>q/q<sub>min</sub></th><th>Hypothese n</th><th></th>${fertig ? "<th>q/n in 10⁻¹⁹ C</th>" : ""}</tr></thead>
        <tbody>${sortiert.map(z => `<tr>
          <td>${z.nr}</td>
          <td>${komma(z.q / 1e-19, 2)}</td>
          <td>${komma(z.q / qMin, 2)}</td>
          <td><input class="exp-eingabe" style="width:3.5em" data-nr="${z.nr}" inputmode="numeric" autocomplete="off" value="${z.n ?? ""}" aria-label="Hypothese: Anzahl der Elementarladungen für Tröpfchen ${z.nr}"></td>
          <td>${z.nOk === true ? "✓" : z.nOk === false ? "✗" : ""}</td>
          ${fertig ? `<td>${komma(z.q / z.n / 1e-19, 3)}</td>` : ""}
        </tr>`).join("")}</tbody>
      </table>
      <details class="exp-fehler"><summary>Hilfe: Was sagen mir die Verhältnisse?</summary>
        <p>Die Verhältnisse liegen (fast) auf <strong>ganzen Zahlen</strong> — Ladung kommt offenbar nur in Portionen vor: q = n · e. Die Verhältnisse verraten dir n, <em>wenn</em> dein kleinstes Tröpfchen genau eine Portion trägt. Enden die Verhältnisse dagegen auf ,5, trägt dein kleinstes Tröpfchen <strong>zwei</strong> Elementarladungen — dann gehören zu den Verhältnissen 1; 1,5; 2; … die Ladungszahlen 2; 3; 4; …</p>
      </details>
      <p><strong>3 · Hypothese:</strong> Trage für jedes Tröpfchen ein, wie viele Elementarladungen n es deiner Meinung nach trägt.</p>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">Hypothesen prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${fertig ? `
      <h3>4 · Elementarladung bestimmen</h3>
      <p>Alle Hypothesen bestätigt! Jedes q/n ist eine Messung <em>derselben</em> Größe: der Elementarladung. Bilde den <strong>Mittelwert aller q/n</strong> (letzte Spalte) und runde auf zwei Nachkommastellen.</p>
      <form id="exp-e-form" class="exp-ablesen">
        <label for="exp-e">e in 10⁻¹⁹ C:</label>
        <input id="exp-e" inputmode="decimal" autocomplete="off" size="7" value="${e ? komma(e.eingabe, 2) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-e-meldung" class="exp-meldung" aria-live="polite"></p>
      ${e ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: e ≈ ${komma(e.eingabe, 2)} · 10⁻¹⁹ C.</strong> Der Literaturwert ist e = 1,602 · 10⁻¹⁹ C — du liegst nur ${komma(abwLit, 1)} % daneben. Stark!</p>
        <p>Du hast damit Robert A. Millikans Auswertung nachvollzogen: den Nachweis, dass elektrische Ladung <strong>gequantelt</strong> ist, und die Messung der Elementarladung. Dafür erhielt er <strong>1923 den Nobelpreis für Physik</strong> — und e gehört heute zu den festgelegten Naturkonstanten, auf denen unser Einheitensystem ruht.</p>
      </div>` : ""}` : ""}
      <h3>Protokoll & Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was ist hier geschönt?</summary>
        <p><strong>Brownsche Bewegung:</strong> Echte Tröpfchen dieser Größe zittern durch Stöße der Luftmoleküle — exaktes Schweben ist real kaum zu erkennen, man mittelt über längere Beobachtung.</p>
        <p><strong>Auftrieb:</strong> Das Tröpfchen verdrängt Luft. Korrekt wäre (ρ<sub>Öl</sub> − ρ<sub>Luft</sub>) statt ρ<sub>Öl</sub> — ein Effekt von etwa 0,14 %, hier bewusst weggelassen.</p>
        <p><strong>Radiusmessung:</strong> Der bequeme Messokular-Wert ist die größte Schummelei: Tröpfchen unter 1 µm kann man im Lichtmikroskop nicht scharf vermessen (Beugung!). Millikan bestimmte r über die <strong>Sinkgeschwindigkeit ohne Feld</strong> mit der Stokes-Reibung F = 6πηrv — und musste die Reibungsformel für winzige Tröpfchen sogar noch korrigieren. Das ist ein schöner Ausblick für die Fehlerdiskussion im Unterricht.</p>
        <p><strong>Statistik:</strong> Mit nur ${zustand.messungen.length} Tröpfchen ist dein Mittelwert noch wackelig. Millikan vermaß <em>tausende</em> — Präzision entsteht durch Wiederholung.</p>
      </details>`;

    zeichneDiagramm(sortiert);
    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      const eingaben = new Map();
      let unvollstaendig = false;
      panel.querySelectorAll("[data-nr]").forEach(inp => {
        const n = parseDezimal(inp.value);
        if (!Number.isFinite(n)) unvollstaendig = true;
        else eingaben.set(Number(inp.dataset.nr), Math.round(n));
      });
      if (unvollstaendig) {
        panel.querySelector("#exp-meldung-ausw").textContent = "Trage zuerst für jedes Tröpfchen eine ganze Zahl n ein.";
        return;
      }
      zustand.messungen.forEach(z => { z.n = eingaben.get(z.nr); z.nOk = hypotheseOk(z.nr, z.n); });
      zustand.hypothesenGeprueft = true;
      const falsch = zustand.messungen.filter(z => !z.nOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle Hypothesen bestätigt — weiter zu Schritt 4!"
        : "✗ " + falsch + " Hypothese" + (falsch > 1 ? "n passen" : " passt") + " noch nicht. Schau in die Hilfe über dem Knopf — und wenn du unsicher bist, miss weitere Tröpfchen.";
      if (falsch > 0) zustand.eBestaetigt = null;
      panelAuswerten();
    });
    panel.querySelector("#exp-e-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-e").value);
      if (!eEingabeOk(eingabe, eMittelWert)) {
        panel.querySelector("#exp-e-meldung").textContent = "✗ Das passt noch nicht zum Mittelwert deiner q/n-Spalte (±0,05). Addiere alle q/n und teile durch ihre Anzahl.";
        return;
      }
      zustand.eBestaetigt = { eingabe, mittel: eMittelWert };
      zustand.meldungAuswerten = "";
      panelAuswerten();
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("millikan-messreihe.csv",
        ["Nr", "r in Mikrometer", "U in V", "q in 10^-19 C", "n (Hypothese)", "q/n in 10^-19 C"],
        sortiert.map(z => [String(z.nr), z.radiusMu, z.U, z.q / 1e-19,
          z.n == null ? "" : String(z.n), z.n ? z.q / z.n / 1e-19 : ""]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, { naechsteNr: 1, aktiv: null, U: 0, tropfenY: Y_MITTE, verworfen: [],
        messungen: [], hypothesenGeprueft: false, eBestaetigt: null, meldungMessen: "", meldungAuswerten: "" });
      wechslePhase("aufbau");
    });
  }

  // Stufendiagramm: q aufsteigend — die Werte sammeln sich auf wenigen Niveaus
  function zeichneDiagramm(sortiert) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 40, R = W - 14, T = 18, U0 = H - 34;
    const yMax = Math.max(2, Math.ceil(Math.max(...sortiert.map(z => z.q)) / 1e-19 + 0.3));
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    // Gitter (alle 1 · 10⁻¹⁹ C) + Achsen
    for (let yw = 1; yw <= yMax; yw++) {
      const y = U0 - yw / yMax * (U0 - T);
      c.strokeStyle = cLeise; c.globalAlpha = 0.3; c.lineWidth = 1;
      c.beginPath(); c.moveTo(L, y); c.lineTo(R, y); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cLeise; c.textAlign = "right"; c.fillText(String(yw), L - 6, y + 4);
    }
    c.textAlign = "start"; c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, T - 6); c.lineTo(L, U0); c.lineTo(R, U0); c.stroke();
    c.fillStyle = cText;
    c.fillText("q in 10⁻¹⁹ C", L + 4, 12);
    c.fillText("Tröpfchen, nach q sortiert →", W - 180, U0 + 24);
    c.fillStyle = cLeise; c.textAlign = "right"; c.fillText("0", L - 6, U0 + 4); c.textAlign = "start";
    // Stufenbalken + Punkte
    sortiert.forEach((z, i) => {
      const x = L + (i + 0.5) / sortiert.length * (R - L);
      const y = U0 - (z.q / 1e-19) / yMax * (U0 - T);
      c.strokeStyle = cAkzent; c.lineWidth = 2.5;
      c.beginPath(); c.moveTo(x - 13, y); c.lineTo(x + 13, y); c.stroke();
      c.fillStyle = cAkzent; c.beginPath(); c.arc(x, y, 4.5, 0, 7); c.fill();
    });
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") { panelMessen(); starteAnim(); }
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }
  wechslePhase("aufbau");
}
