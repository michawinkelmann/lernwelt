// experiment.js — Interaktives Experiment: Kondensator-Entladung (RC-Glied, Qualifikationsphase).
// Realitätsnahe Messpraxis statt fertiger Simulation: Kondensator auf 6,00 V laden,
// über Präzisionswiderstände entladen und die Spur am Speicher-Oszilloskop mit zwei
// Cursorn SELBST ablesen — Halbwertszeit bei U = 3,00 V, τ direkt bei U₀/e ≈ 2,21 V.
// Aus τ = R·C folgt dreimal unabhängig die Kapazität. Pointe: Der Aufdruck
// „470 µF ±20 %“ ist nur ein Näherungswert — dieses Exemplar hat in Wahrheit 508 µF.
// Das Schirm-Rauschen ist deterministisch geseedet → TESTS laufen in Node (DOM-frei).

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau (die wahre Kapazität ist das Messziel) ----------
export const U0 = 6.00;                  // Ladespannung in V
export const C_WAHR_F = 508e-6;          // wahre Kapazität in F (geheim!)
export const C_AUFDRUCK_UF = 470;        // µF laut Aufdruck …
export const AUFDRUCK_TOLERANZ = 0.20;   // … mit ±20 % Elko-Toleranz

// Präzisionswiderstände (±0,1 % — praktisch exakt). Toleranzen in s:
// tolMess fürs Cursor-Ablesen (T_h und τ direkt), tolRechen für τ = T_h/ln 2.
export const WIDERSTAENDE = [
  { id: "10k", r: 10000, label: "10 kΩ", tolMess: 0.15, tolRechen: 0.2 },
  { id: "22k", r: 22000, label: "22 kΩ", tolMess: 0.15, tolRechen: 0.2 },
  { id: "47k", r: 47000, label: "47 kΩ", tolMess: 0.3,  tolRechen: 0.4 }
];
export const TOLERANZ_C_UF = 15;         // akzeptierte Abweichung der C-Eingaben in µF
export const TOLERANZ_FAKTOR = 0.1;      // Konsistenz-Check τ(22k)/τ(10k)
export const TOLERANZ_U2 = 0.05;         // V, Frage „U nach 2·T_h“

// Oszilloskop: 10×8 Teilungen, fest 1 V/div, Zeitbasis automatisch (1-2-5-Reihe)
export const DIV_X = 10, DIV_Y = 8, VOLT_PRO_DIV = 1;
export const ZEITBASEN = [0.5, 1, 2, 5, 10, 20];  // s/div
export const RAUSCH_SPANNE = 0.02;                // Schirm-Rauschen ±10 mV

// ---------- Modell (exakt, Node-testbar) ----------
export function tau(r) { return r * C_WAHR_F; }                    // s
export function halbwertszeit(r) { return tau(r) * Math.LN2; }     // s, T_h = τ·ln 2
export function spannung(r, t) { return t <= 0 ? U0 : U0 * Math.exp(-t / tau(r)); } // V
export function tauAusTh(th) { return th / Math.LN2; }             // s
export function kapazitaetUF(tauS, r) { return tauS / r * 1e6; }   // µF

// Zeitbasis so wählen, dass der Schirm mindestens 3·τ zeigt
export function zeitbasis(r) {
  const ziel = 3 * tau(r);
  return ZEITBASEN.find(z => z * DIV_X >= ziel) ?? ZEITBASEN[ZEITBASEN.length - 1];
}
export function fensterS(r) { return zeitbasis(r) * DIV_X; }       // Schirmbreite in s

// Schirm-Anzeige: wahre Kurve + kleines, deterministisch geseedetes Rauschen
export function angezeigteSpannung(r, t) {
  if (t <= 0) return U0;
  return spannung(r, t) + streuung("oszi:" + r + ":" + t.toFixed(2), RAUSCH_SPANNE);
}

// Bewertung des C-Mittelwerts gegen den wahren Wert
export function bewertungC(cUF) {
  const abw = Math.abs(cUF - C_WAHR_F * 1e6) / (C_WAHR_F * 1e6) * 100;
  if (abw <= 3) return { stufe: "sehr gut", abw };
  if (abw <= 8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}

// ---------- TESTS (laufen in Node, kein DOM) ----------
const RS = WIDERSTAENDE.map(w => w.r);
export const TESTS = [
  { name: "τ = R·C exakt: 5,08 / 11,176 / 23,876 s",
    ok: () => [5.08, 11.176, 23.876].every((soll, i) => Math.abs(tau(RS[i]) - soll) < 1e-9) },
  { name: "T_h = τ·ln 2: 3,521 / 7,747 / 16,550 s",
    ok: () => [3.521, 7.747, 16.550].every((soll, i) => Math.abs(halbwertszeit(RS[i]) - soll) <= 5e-4) },
  { name: "Stützwert U(τ) = U₀/e ≈ 2,207 V (alle R)",
    ok: () => RS.every(r => Math.abs(spannung(r, tau(r)) - U0 / Math.E) < 1e-12) },
  { name: "Stützwert U(2·T_h) ab 6 V = exakt 1,5 V (alle R)",
    ok: () => RS.every(r => Math.abs(spannung(r, 2 * halbwertszeit(r)) - 1.5) < 1e-9) },
  { name: "Pipeline T_h → τ → C invertiert exakt: 508,000 µF",
    ok: () => RS.every(r => Math.abs(kapazitaetUF(tauAusTh(halbwertszeit(r)), r) - 508) < 1e-6) },
  { name: "Methodenvergleich: τ_direkt = τ_aus_Th bei perfekter Ablesung",
    ok: () => RS.every(r => Math.abs(tauAusTh(halbwertszeit(r)) - tau(r)) < 1e-12) },
  { name: "Konsistenz: τ(22 kΩ)/τ(10 kΩ) = 2,2",
    ok: () => Math.abs(tau(22000) / tau(10000) - 2.2) < 1e-9 },
  { name: "Zeitbasis-Wahl: Schirm deckt 3·τ bis 6·τ ab (alle R)",
    ok: () => RS.every(r => fensterS(r) >= 3 * tau(r) && fensterS(r) <= 6 * tau(r)) },
  { name: "Toleranzfälle: Eintrag ±0,15 s (10k/22k) bzw. ±0,3 s (47k)",
    ok: () => ablesungOk(3.6, halbwertszeit(10000), 0.15) && !ablesungOk(3.8, halbwertszeit(10000), 0.15)
           && ablesungOk(16.3, halbwertszeit(47000), 0.3) && !ablesungOk(16.0, halbwertszeit(47000), 0.3)
           && !ablesungOk(NaN, halbwertszeit(10000), 0.15) },
  { name: "Schirm-Rauschen deterministisch und ≤ ±10 mV",
    ok: () => RS.every(r => { const T = fensterS(r);
      for (let k = 0; k <= 200; k++) { const t = T * k / 200;
        const a = angezeigteSpannung(r, t);
        if (a !== angezeigteSpannung(r, t)) return false;
        if (Math.abs(a - spannung(r, t)) > RAUSCH_SPANNE / 2 + 1e-12) return false; }
      return true; }) },
  { name: "Bewertung C: ±3 % sehr gut, ±8 % gut",
    ok: () => bewertungC(508).stufe === "sehr gut" && bewertungC(523).stufe === "sehr gut"
           && bewertungC(525).stufe === "gut" && bewertungC(545).stufe === "gut"
           && bewertungC(560).stufe === "nochmal prüfen" }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    rIndex: 0,
    geladen: false,
    spur: null,                // { fortschritt: 0..1, fertig } — Aufzeichnung zum aktuellen R
    cursor: [2, 4],            // Cursor-Zeiten in s
    messungen: {},             // je R-id: { th, tauDirekt } (eigene Ablesungen)
    auswertung: { tau: {}, c: {}, faktor: null, u2: null },
    phase: "aufbau"
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="400" height="536" aria-label="Versuchsaufbau: Schaltung aus Spannungsquelle, Schalter, Kondensator, Widerstand und Oszilloskop; darunter der Oszilloskop-Schirm mit Gitter, aufgezeichneter Entladekurve und zwei Ablese-Cursorn."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);
  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const PLOT = { L: 46, T: 166, W: 340, H: 272, B: 438 }; // Schirm, 34 px je Teilung

  function aktR() { return WIDERSTAENDE[zustand.rIndex]; }
  function schrittweite() { return fensterS(aktR().r) / 1000; }
  function rundeT(t) { const s = schrittweite(); return Number((Math.round(t / s) * s).toFixed(2)); }
  function zeitbasisText() { const z = zeitbasis(aktR().r); return z < 1 ? komma(z, 1) : komma(z, 0); }
  function statusText() {
    if (zustand.spur && !zustand.spur.fertig) return "Aufzeichnung läuft … (Zeitraffer)";
    if (zustand.spur) return "✓ Spur gespeichert · " + zeitbasisText() + " s/div · 0–" + komma(fensterS(aktR().r), 0) + " s";
    if (zustand.geladen) return "✓ S geschlossen: U_C = 6,00 V — bereit zum Entladen";
    return "Kondensator leer (U_C ≈ 0 V) — erst laden";
  }
  function cursorText(i) {
    const t = zustand.cursor[i];
    return "Cursor " + (i + 1) + ": t = " + komma(t, 2) + " s → U = " + komma(angezeigteSpannung(aktR().r, t), 2) + " V";
  }

  // ---------- Zeichnung: Schaltskizze + Oszilloskop-Schirm ----------
  function linie(x1, y1, x2, y2) { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); }

  function zeichne() {
    const w = aktR(), fenster = fensterS(w.r);
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px system-ui, sans-serif";
    ctx.strokeStyle = cText; ctx.fillStyle = cText; ctx.lineWidth = 2;

    // --- Schaltskizze (obere und untere Leitung, Quelle, S, C, R, Oszi) ---
    const oR = 40, uR = 124;
    linie(36, oR, 36, 72); linie(36, 92, 36, uR);            // linker Zweig mit Quelle
    ctx.lineWidth = 3; linie(22, 76, 50, 76);                // langer Strich (+)
    ctx.lineWidth = 5; linie(29, 88, 43, 88);                // kurzer Strich (−)
    ctx.lineWidth = 2; ctx.fillText("+", 55, 72);
    linie(36, oR, 88, oR);                                   // obere Leitung bis Schalter
    ctx.beginPath(); ctx.arc(88, oR, 3, 0, 7); ctx.fill();
    if (zustand.geladen) linie(88, oR, 124, oR);             // S zu → laden
    else linie(88, oR, 118, 22);                             // S offen → entladen
    ctx.beginPath(); ctx.arc(124, oR, 3, 0, 7); ctx.fill();
    ctx.fillText("S", 96, 16);
    linie(124, oR, 340, oR); linie(36, uR, 340, uR);
    linie(176, oR, 176, 74); linie(176, 84, 176, uR);        // Kondensator
    ctx.lineWidth = 3; linie(160, 74, 192, 74); linie(160, 84, 192, 84); ctx.lineWidth = 2;
    linie(268, oR, 268, 62); ctx.strokeRect(257, 62, 22, 40); linie(268, 102, 268, uR); // Widerstand
    linie(340, oR, 340, 62); ctx.strokeRect(316, 62, 48, 40); linie(340, 102, 340, uR); // Oszi
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(322, 70); ctx.quadraticCurveTo(330, 96, 358, 96); ctx.stroke();
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillText("U₀ = 6,00 V", 4, 144);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("C „470 µF ±20 %“", 185, 144);
    ctx.fillText("R = " + w.label, 268, 144);
    ctx.fillText("Oszi", 340, 144);
    ctx.textAlign = "start"; ctx.font = "12px system-ui, sans-serif";

    // --- Schirm ---
    ctx.fillText("Speicher-Oszilloskop · 1 V/div · " + zeitbasisText() + " s/div", PLOT.L, 158);
    ctx.fillStyle = cFlaeche; ctx.fillRect(PLOT.L, PLOT.T, PLOT.W, PLOT.H);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    for (let i = 0; i <= DIV_X; i++) linie(PLOT.L + i * 34, PLOT.T, PLOT.L + i * 34, PLOT.B);
    for (let j = 0; j <= DIV_Y; j++) linie(PLOT.L, PLOT.B - j * 34, PLOT.L + PLOT.W, PLOT.B - j * 34);
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.strokeRect(PLOT.L, PLOT.T, PLOT.W, PLOT.H);
    ctx.fillStyle = cText; ctx.textAlign = "right";
    for (let j = 0; j <= DIV_Y; j += 2) ctx.fillText(j === DIV_Y ? j + " V" : String(j), PLOT.L - 6, PLOT.B - j * 34 + 4);
    for (let i = 0; i <= DIV_X; i += 2) {
      const t = i * zeitbasis(w.r), x = PLOT.L + i * 34;
      if (i === DIV_X) { ctx.fillText(komma(t, 0) + " s", x + 8, PLOT.B + 18); }
      else { ctx.textAlign = "center"; ctx.fillText(komma(t, 0), x, PLOT.B + 18); ctx.textAlign = "right"; }
    }
    ctx.textAlign = "start";

    // Spur: „live“-Linie nach dem Laden bzw. aufgezeichnete Entladekurve
    if (zustand.geladen && !zustand.spur) {
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.setLineDash([5, 4]);
      linie(PLOT.L, PLOT.B - U0 * 34, PLOT.L + PLOT.W, PLOT.B - U0 * 34);
      ctx.setLineDash([]);
      ctx.fillStyle = cAkzent; ctx.fillText("live: 6,00 V", PLOT.L + 6, PLOT.B - U0 * 34 - 6);
    }
    if (zustand.spur) {
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5; ctx.beginPath();
      const breite = Math.round(PLOT.W * zustand.spur.fortschritt);
      for (let px = 0; px <= breite; px++) {
        const y = PLOT.B - angezeigteSpannung(w.r, px / PLOT.W * fenster) * 34;
        if (px === 0) ctx.moveTo(PLOT.L, y); else ctx.lineTo(PLOT.L + px, y);
      }
      ctx.stroke();
    }

    // Ablese-Cursor (erst nach fertiger Aufzeichnung)
    if (zustand.spur && zustand.spur.fertig) {
      zustand.cursor.forEach((t, i) => {
        const x = PLOT.L + (t / fenster) * PLOT.W;
        ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
        if (i === 1) ctx.setLineDash([6, 4]);
        linie(x, PLOT.T, x, PLOT.B); ctx.setLineDash([]);
        ctx.fillStyle = cText;
        ctx.fillText("C" + (i + 1), Math.min(x + 4, PLOT.L + PLOT.W - 18), PLOT.T + 14 + i * 14);
        ctx.beginPath(); ctx.arc(x, PLOT.B - angezeigteSpannung(w.r, t) * 34, 4, 0, 7); ctx.fill();
      });
    }

    // Statuszeile + Cursorwerte unter dem Schirm
    ctx.fillStyle = cText; ctx.font = "13px system-ui, sans-serif";
    ctx.fillText(statusText(), 8, 476);
    if (zustand.spur && zustand.spur.fertig) {
      ctx.fillText(cursorText(0), 8, 500);
      ctx.fillText(cursorText(1), 8, 520);
    }
  }

  // Klick/Tipp auf den Schirm setzt den nächstgelegenen Cursor
  canvas.addEventListener("pointerdown", ev => {
    if (!(zustand.spur && zustand.spur.fertig)) return;
    const rect = canvas.getBoundingClientRect();
    const x = (ev.clientX - rect.left) * (canvas.width / rect.width);
    const y = (ev.clientY - rect.top) * (canvas.height / rect.height);
    if (x < PLOT.L - 8 || x > PLOT.L + PLOT.W + 8 || y < PLOT.T - 8 || y > PLOT.B + 8) return;
    const fenster = fensterS(aktR().r);
    const t = rundeT(Math.min(fenster, Math.max(0, (x - PLOT.L) / PLOT.W * fenster)));
    const i = Math.abs(t - zustand.cursor[0]) <= Math.abs(t - zustand.cursor[1]) ? 0 : 1;
    zustand.cursor[i] = t;
    const regler = panel.querySelector("#exp-c" + (i + 1));
    if (regler) regler.value = String(t);
    aktualisiereCursorwerte(); zeichne();
  });

  function aktualisiereCursorwerte() {
    const p = panel.querySelector("#exp-cursorwerte");
    if (p && zustand.spur && zustand.spur.fertig) p.textContent = cursorText(0) + " · " + cursorText(1);
  }

  // ---------- Laden / Entladen + Aufzeichnen ----------
  function lade() {
    zustand.geladen = true; zustand.spur = null;
    zeichne(); panelMessen();
  }
  function entlade() {
    if (!zustand.geladen || (zustand.spur && !zustand.spur.fertig)) return;
    zustand.geladen = false;
    zustand.spur = { fortschritt: 0, fertig: false };
    const fertigstellen = () => {
      zustand.spur.fertig = true;
      const f = fensterS(aktR().r);
      zustand.cursor = [rundeT(f * 0.1), rundeT(f * 0.2)];
      zeichne(); panelMessen();
    };
    if (reduziert) { zustand.spur.fortschritt = 1; fertigstellen(); return; }
    panelMessen();
    const start = performance.now(), dauer = 3500;
    (function schrittAnim() {
      const f = Math.min(1, (performance.now() - start) / dauer);
      zustand.spur.fortschritt = f;
      zeichne();
      if (f < 1) requestAnimationFrame(schrittAnim); else fertigstellen();
    })();
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf dem Tisch: ein <strong>Elektrolytkondensator</strong> mit Aufdruck <strong>„470 µF ±20 %“</strong>, drei <strong>Präzisionswiderstände</strong> (10 kΩ, 22 kΩ, 47 kΩ — auf ±0,1 % genau), eine Spannungsquelle mit <strong>U₀ = 6,00 V</strong>, ein <strong>Speicher-Oszilloskop</strong> parallel zum Kondensator und ein Schalter S.</p>
      <p>Schalter zu → die Quelle lädt den Kondensator auf 6,00 V. Schalter auf → der Kondensator entlädt sich über R, der Speicher-Oszi zeichnet U(t) auf. Theorie: U(t) = U₀ · e<sup>−t/(R·C)</sup> mit der Zeitkonstante τ = R · C und der Halbwertszeit T<sub>h</sub> = τ · ln 2.</p>
      <p class="exp-hinweis">Die Pointe dieses Versuchs: Der Aufdruck auf Elkos ist erstaunlich grob — <strong>±20 % Toleranz sind normal</strong>. Welche Kapazität dein Exemplar <em>wirklich</em> hat, verrät nur die Messung. Genau die machst du jetzt — dreimal unabhängig.</p>
      <p><strong>Plan:</strong> Für jeden der drei Widerstände: laden, entladen, Spur aufzeichnen. Mit Cursor 1 die Zeit bei U = 3,00 V ablesen (Halbwertszeit T<sub>h</sub>), mit Cursor 2 die Zeit bei U ≈ 2,21 V (= U₀/e — dort gilt t = τ, „Methode 2“). In der Auswertung bestimmst du daraus dreimal C = τ/R.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const w = aktR(), fenster = fensterS(w.r);
    const fertig = !!(zustand.spur && zustand.spur.fertig);
    const laeuft = !!(zustand.spur && !zustand.spur.fertig);
    const m = zustand.messungen;
    const anzahl = WIDERSTAENDE.filter(x => m[x.id]).length;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <label for="exp-r"><strong>Widerstand wählen</strong> (Präzisionswiderstände ±0,1 %):</label>
      <select id="exp-r" class="exp-wahl" ${laeuft ? "disabled" : ""}>${WIDERSTAENDE.map((x, i) => `<option value="${i}"${i === zustand.rIndex ? " selected" : ""}>R = ${esc(x.label)}${m[x.id] ? " — ✓ gemessen" : ""}</option>`).join("")}</select>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-laden" ${laeuft || zustand.geladen ? "disabled" : ""}>1 · Laden (auf 6,00 V)</button>
        <button class="knopf" id="exp-entladen" ${zustand.geladen && !laeuft ? "" : "disabled"}>2 · Entladen + Aufzeichnen</button>
      </div>
      <p id="exp-status" aria-live="polite">${esc(statusText())}</p>
      <div class="exp-regler">
        <label for="exp-c1">Cursor 1 — t in s (auf U = 3,00 V schieben):</label>
        <input type="range" id="exp-c1" min="0" max="${fenster}" step="${schrittweite()}" value="${zustand.cursor[0]}" ${fertig ? "" : "disabled"}>
        <label for="exp-c2">Cursor 2 — t in s (auf U ≈ 2,21 V schieben):</label>
        <input type="range" id="exp-c2" min="0" max="${fenster}" step="${schrittweite()}" value="${zustand.cursor[1]}" ${fertig ? "" : "disabled"}>
      </div>
      <p id="exp-cursorwerte" aria-live="polite">${fertig ? esc(cursorText(0) + " · " + cursorText(1)) : "Die Cursor erscheinen nach der Aufzeichnung."}</p>
      <p class="exp-hinweis">So misst du: <strong>Cursor 1</strong> dorthin, wo die Spur <strong>3,00 V</strong> (= U₀/2) schneidet — sein t ist die Halbwertszeit T<sub>h</sub>. <strong>Cursor 2</strong> dorthin, wo die Spur <strong>≈ 2,21 V</strong> (= U₀/e) schneidet — sein t ist direkt τ („Methode 2“). Klick auf den Schirm setzt den nächstgelegenen Cursor. Die Aufzeichnung läuft im Zeitraffer, die Zeitachse zeigt echte Sekunden.</p>
      <form id="exp-eintragen" class="exp-ablesen">
        <label for="exp-th">T<sub>h</sub> in s:</label>
        <input id="exp-th" inputmode="decimal" autocomplete="off" ${fertig ? "" : "disabled"}>
        <label for="exp-taud">τ in s (Methode 2):</label>
        <input id="exp-taud" inputmode="decimal" autocomplete="off" ${fertig ? "" : "disabled"}>
        <button class="knopf" ${fertig ? "" : "disabled"}>In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>R</th><th>T<sub>h</sub> in s</th><th>τ direkt in s</th></tr></thead>
      <tbody>${WIDERSTAENDE.map(x => `<tr><td>${esc(x.label)}</td><td>${m[x.id] ? komma(m[x.id].th, 2) : "—"}</td><td>${m[x.id] ? komma(m[x.id].tauDirekt, 2) : "—"}</td></tr>`).join("")}</tbody></table>
      <p>${anzahl} von 3 Widerständen gemessen.</p>
      <button class="knopf" id="exp-weiter2" ${anzahl === 3 ? "" : "disabled"}>Zur Auswertung</button>`;

    panel.querySelector("#exp-r").addEventListener("change", ev => {
      zustand.rIndex = Number(ev.target.value);
      zustand.geladen = false; zustand.spur = null;
      zeichne(); panelMessen();
    });
    panel.querySelector("#exp-laden").addEventListener("click", lade);
    panel.querySelector("#exp-entladen").addEventListener("click", entlade);
    [0, 1].forEach(i => {
      panel.querySelector("#exp-c" + (i + 1)).addEventListener("input", ev => {
        zustand.cursor[i] = rundeT(parseDezimal(ev.target.value));
        aktualisiereCursorwerte(); zeichne();
      });
    });
    panel.querySelector("#exp-eintragen").addEventListener("submit", ev => {
      ev.preventDefault();
      const w2 = aktR();
      const th = parseDezimal(panel.querySelector("#exp-th").value);
      const td = parseDezimal(panel.querySelector("#exp-taud").value);
      const thOk = ablesungOk(th, halbwertszeit(w2.r), w2.tolMess);
      const tdOk = ablesungOk(td, tau(w2.r), w2.tolMess);
      if (!thOk || !tdOk) {
        panel.querySelector("#exp-meldung").textContent =
          (thOk ? "" : "✗ T_h: Schau noch einmal — Cursor 1 genau dorthin, wo die Spur 3,00 V schneidet. ") +
          (tdOk ? "" : "✗ τ: Cursor 2 genau auf ≈ 2,21 V schieben und t ablesen.");
        return;
      }
      const neu = !zustand.messungen[w2.id];
      zustand.messungen[w2.id] = { th, tauDirekt: td };
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = neu
        ? "✓ Eingetragen. Jetzt den nächsten Widerstand wählen, laden, entladen."
        : "✓ Messung aktualisiert.";
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  function panelAuswerten() {
    const m = zustand.messungen, a = zustand.auswertung;
    if (!WIDERSTAENDE.every(x => m[x.id])) {
      panel.innerHTML = `<h2>Auswertung</h2>
        <p>Noch nicht genug Daten: Miss zuerst T<sub>h</sub> und τ für <strong>alle drei</strong> Widerstände.</p>
        <button class="knopf" id="exp-zurueck">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const alleTau = WIDERSTAENDE.every(x => Number.isFinite(a.tau[x.id]));
    const alleC = alleTau && WIDERSTAENDE.every(x => Number.isFinite(a.c[x.id]));
    const cMittelwert = alleC ? mittel(WIDERSTAENDE.map(x => a.c[x.id])) : NaN;

    function erkenntnis() {
      const bew = bewertungC(cMittelwert);
      const lo = C_AUFDRUCK_UF * (1 - AUFDRUCK_TOLERANZ), hi = C_AUFDRUCK_UF * (1 + AUFDRUCK_TOLERANZ);
      return `<div class="exp-hinweis"><strong>Drei Widerstände, dreimal (fast) dasselbe C — Mittelwert: ${komma(cMittelwert, 0)} µF.</strong>
        Der Aufdruck verspricht ${C_AUFDRUCK_UF} µF, aber Elkos haben ±20 % Toleranz (erlaubt: ${komma(lo, 0)}–${komma(hi, 0)} µF).
        Dieses Exemplar hat in Wahrheit <strong>508 µF</strong> — dein <strong>Messwert schlägt den Aufdruck</strong>!
        Abweichung deiner Messung vom wahren Wert: ${komma(bew.abw, 1)} % → <strong>${bew.stufe}</strong>.</div>`;
    }
    const vergleich = alleTau
      ? `<p>✓ Beide Methoden liefern (fast) dieselbe Zeitkonstante: ${WIDERSTAENDE.map(x => `${esc(x.label)}: ${komma(a.tau[x.id], 2)} s / ${komma(m[x.id].tauDirekt, 2)} s`).join(" · ")} — zwei Wege, ein τ.</p>`
      : "";

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <table class="exp-tabelle"><thead><tr><th>R</th><th>T<sub>h</sub> in s</th><th>τ = T<sub>h</sub>/ln 2</th><th>τ direkt</th><th>C in µF</th></tr></thead>
      <tbody>${WIDERSTAENDE.map(x => `<tr><td>${esc(x.label)}</td><td>${komma(m[x.id].th, 2)}</td><td>${Number.isFinite(a.tau[x.id]) ? komma(a.tau[x.id], 2) + " ✓" : "?"}</td><td>${komma(m[x.id].tauDirekt, 2)}</td><td>${Number.isFinite(a.c[x.id]) ? komma(a.c[x.id], 0) + " ✓" : "?"}</td></tr>`).join("")}</tbody></table>

      <h3>1 · Von der Halbwertszeit zur Zeitkonstante</h3>
      <p>Berechne je Zeile τ = T<sub>h</sub> / ln 2 (ln 2 ≈ 0,693) und vergleiche mit Methode 2 (direkte Ablesung bei U₀/e).</p>
      <details class="exp-hilfe" open><summary>Hilfe: Schritt für Schritt</summary>
        <p><strong>Teilschritt:</strong> Nimm aus der Tabelle dein abgelesenes T<sub>h</sub> (die Zeit, bei der die Spur 3,00 V erreicht) und teile es durch ln 2 ≈ 0,693. Das ergibt die Zeitkonstante τ derselben Zeile.</p>
        <p><strong>Rechenbeispiel (erfundene Zahlen!):</strong> Liest du bei 10 kΩ etwa T<sub>h</sub> = 4 s ab, dann ist τ = 4 s ∕ 0,693 ≈ 5,8 s. Tippe also 5,8 ins Feld. Mach das für alle drei Zeilen mit deinen eigenen T<sub>h</sub>-Werten.</p>
        <p><strong>Kontrolle:</strong> Dein τ muss immer etwas größer sein als dein T<sub>h</sub> (weil du durch eine Zahl kleiner als 1 teilst). Vergleiche das Ergebnis mit deinem direkt abgelesenen τ aus Methode 2 — beide Werte sollten dicht beieinanderliegen.</p>
      </details>
      <form id="exp-f1" class="exp-ablesen">
        ${WIDERSTAENDE.map(x => Number.isFinite(a.tau[x.id]) ? "" : `<label for="exp-tau-${x.id}">τ bei ${esc(x.label)} in s:</label><input id="exp-tau-${x.id}" inputmode="decimal" autocomplete="off">`).join("")}
        ${alleTau ? "" : '<button class="knopf">Prüfen</button>'}
      </form>
      ${vergleich}
      <p id="exp-meldung1" class="exp-meldung" aria-live="polite"></p>

      ${alleTau ? `
      <h3>2 · Kapazität bestimmen: C = τ / R</h3>
      <p>τ in s, R in Ω → C in F; mal 10<sup>6</sup> → µF. Nimm dein τ aus der Spalte „τ = T<sub>h</sub>/ln 2“.</p>
      <details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>
        <p><strong>Teilschritt:</strong> Stelle τ = R · C nach C um: <strong>C = τ ∕ R</strong>. Setze dein τ in Sekunden und R in Ohm ein (10 kΩ = 10000 Ω, 22 kΩ = 22000 Ω, 47 kΩ = 47000 Ω).</p>
        <p><strong>Einheiten-Trick:</strong> So kommt C zuerst in Farad heraus — eine winzige Zahl wie 0,0005 F. Multipliziere mit 10<sup>6</sup> (Komma um 6 Stellen nach rechts), dann steht da der handliche Wert in Mikrofarad (µF).</p>
        <p><strong>Rechenbeispiel (erfundene Zahlen!):</strong> Wäre τ = 5,8 s und R = 10000 Ω, dann C = 5,8 ∕ 10000 = 0,00058 F = 580 µF. In dein Feld kommt also 580. Der Aufdruck „470 µF“ ist nur grob — dein Messwert darf deutlich davon abweichen.</p>
      </details>
      <form id="exp-f2" class="exp-ablesen">
        ${WIDERSTAENDE.map(x => Number.isFinite(a.c[x.id]) ? "" : `<label for="exp-cwert-${x.id}">C aus ${esc(x.label)} in µF:</label><input id="exp-cwert-${x.id}" inputmode="decimal" autocomplete="off">`).join("")}
        ${alleC ? "" : '<button class="knopf">Prüfen</button>'}
      </form>
      <p id="exp-meldung2" class="exp-meldung" aria-live="polite"></p>` : ""}
      ${alleC ? erkenntnis() : ""}

      ${alleC ? `
      <h3>3 · Konsistenz-Check</h3>
      <p>Von 10 kΩ auf 22 kΩ wächst R um den Faktor 2,2 — und τ? Berechne τ(22 kΩ) / τ(10 kΩ) aus deiner Tabelle:</p>
      <details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>
        <p><strong>Teilschritt:</strong> Such in deiner Tabelle die beiden Zeitkonstanten für 22 kΩ und für 10 kΩ heraus und teile die größere durch die kleinere: Faktor = τ(22 kΩ) ∕ τ(10 kΩ).</p>
        <p><strong>Rechenbeispiel (erfundene Zahlen!):</strong> Stünde dort τ(22 kΩ) = 12,8 s und τ(10 kΩ) = 5,8 s, dann ist der Faktor 12,8 ∕ 5,8 ≈ 2,2 — genau so viel, wie auch R größer geworden ist. Das ist kein Zufall: In τ = R · C steckt dasselbe C, also wächst τ im selben Verhältnis wie R.</p>
      </details>
      <form id="exp-f3" class="exp-ablesen">
        ${zustand.auswertung.faktor !== null
          ? `<p>✓ Faktor ${komma(zustand.auswertung.faktor, 2)} — τ wächst (fast) exakt mit R, denn τ = R·C und C bleibt dasselbe. Theoretisch: genau 2,2.</p>`
          : '<label for="exp-faktor">Faktor:</label><input id="exp-faktor" inputmode="decimal" autocomplete="off"><button class="knopf">Prüfen</button>'}
      </form>
      <p id="exp-meldung3" class="exp-meldung" aria-live="polite"></p>` : ""}

      ${alleC && a.faktor !== null ? `
      <h3>4 · Halbieren ohne Ende — wie beim radioaktiven Zerfall</h3>
      <p>Nach <em>jeder</em> Halbwertszeit halbiert sich U — egal, wo du startest. Start bei 6,00 V: Welche Spannung bleibt nach 2 · T<sub>h</sub>?</p>
      <form id="exp-f4" class="exp-ablesen">
        ${a.u2 !== null
          ? `<p>✓ ${komma(a.u2, 2)} V — richtig: 6 V → 3 V → 1,5 V. Genau dieselbe Eigenschaft hat die Aktivität beim radioaktiven Zerfall: U(t) fällt exponentiell wie N(t).</p>`
          : '<label for="exp-u2">U(2·T<sub>h</sub>) in V:</label><input id="exp-u2" inputmode="decimal" autocomplete="off"><button class="knopf">Prüfen</button>'}
      </form>
      <p id="exp-meldung4" class="exp-meldung" aria-live="polite"></p>` : ""}
      ${a.u2 !== null ? '<p><strong>✓ Auswertung vollständig.</strong> Sichere dein Protokoll als CSV — fertig ist der Versuchsbericht.</p>' : ""}

      <details class="exp-fehler"><summary>Fehlerbetrachtung — was begrenzt die Genauigkeit?</summary>
        <p><strong>Cursor-Ablesung:</strong> Schirmraster, Rauschen und die flache Kurve bei großem R machen das Treffen von „genau 3,00 V“ unsicher — bei 47 kΩ ist t nur auf einige Zehntelsekunden genau ablesbar. Dagegen helfen zwei Methoden (T<sub>h</sub> und U₀/e) und das Mitteln über mehrere Widerstände.</p>
        <p><strong>Eingangswiderstand des Oszis (Ausblick):</strong> Im echten Labor liegt der Oszi-Eingang mit typisch 1 MΩ <em>parallel</em> zum Kondensator und entlädt heimlich mit. Statt R wirkt R ∥ 1 MΩ: Aus 47 kΩ werden 44,9 kΩ — τ fällt rund 4 % zu klein aus, C wird unterschätzt. Je größer R, desto schlimmer; im MΩ-Bereich wird die Messung unbrauchbar (Abhilfe: 10:1-Tastkopf mit 10 MΩ). In diesem virtuellen Aufbau ist der Eingang ideal hochohmig.</p>
        <p><strong>Leckstrom des Elkos:</strong> Reale Elektrolytkondensatoren entladen sich auch von selbst — das wirkt wie ein zusätzlicher Parallelwiderstand und verkürzt τ. Die Präzisionswiderstände (±0,1 %) sind dagegen praktisch fehlerfrei: Der Hauptfehler steckt im Ablesen.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;

    // Schritt 1: τ = T_h / ln 2 (gegen die EIGENEN T_h-Einträge geprüft)
    const f1 = panel.querySelector("#exp-f1");
    if (f1 && !alleTau) f1.addEventListener("submit", ev => {
      ev.preventDefault();
      const fehler = []; let neue = 0;
      for (const x of WIDERSTAENDE) {
        const feld = panel.querySelector("#exp-tau-" + x.id);
        if (!feld || !feld.value.trim()) continue;
        const v = parseDezimal(feld.value);
        if (ablesungOk(v, tauAusTh(m[x.id].th), x.tolRechen)) { a.tau[x.id] = v; neue++; }
        else fehler.push("✗ " + x.label + ": Rechne nach — dein T_h geteilt durch 0,693.");
      }
      if (neue) panelAuswerten();
      panel.querySelector("#exp-meldung1").textContent = fehler.join(" ") ||
        (WIDERSTAENDE.every(x => Number.isFinite(a.tau[x.id])) ? "✓ Alle Zeitkonstanten berechnet." : "✓ Übernommen — es fehlen noch Zeilen.");
    });

    // Schritt 2: C = τ / R in µF (gegen das eigene τ geprüft, ±15 µF)
    const f2 = panel.querySelector("#exp-f2");
    if (f2 && !alleC) f2.addEventListener("submit", ev => {
      ev.preventDefault();
      const fehler = []; let neue = 0;
      for (const x of WIDERSTAENDE) {
        const feld = panel.querySelector("#exp-cwert-" + x.id);
        if (!feld || !feld.value.trim()) continue;
        const v = parseDezimal(feld.value);
        if (ablesungOk(v, kapazitaetUF(a.tau[x.id], x.r), TOLERANZ_C_UF)) { a.c[x.id] = v; neue++; }
        else fehler.push("✗ " + x.label + ": C = τ/R, dann mal 10⁶ → µF (Beispiel-Größenordnung: einige hundert µF).");
      }
      if (neue) panelAuswerten();
      panel.querySelector("#exp-meldung2").textContent = fehler.join(" ") ||
        (WIDERSTAENDE.every(x => Number.isFinite(a.c[x.id])) ? "✓ Dreimal C bestimmt — sieh dir den Kasten an!" : "✓ Übernommen — es fehlen noch Zeilen.");
    });

    // Schritt 3: Konsistenz τ(22k)/τ(10k) ≈ 2,2 (gegen die eigenen τ-Werte)
    const f3 = panel.querySelector("#exp-f3");
    if (f3 && a.faktor === null) f3.addEventListener("submit", ev => {
      ev.preventDefault();
      const v = parseDezimal(panel.querySelector("#exp-faktor").value);
      if (ablesungOk(v, a.tau["22k"] / a.tau["10k"], TOLERANZ_FAKTOR)) { a.faktor = v; panelAuswerten(); }
      else panel.querySelector("#exp-meldung3").textContent = "✗ Teile dein τ bei 22 kΩ durch dein τ bei 10 kΩ.";
    });

    // Schritt 4: U nach 2·T_h ab 6 V → 1,5 V
    const f4 = panel.querySelector("#exp-f4");
    if (f4 && a.u2 === null) f4.addEventListener("submit", ev => {
      ev.preventDefault();
      const v = parseDezimal(panel.querySelector("#exp-u2").value);
      if (ablesungOk(v, 1.5, TOLERANZ_U2)) { a.u2 = v; panelAuswerten(); }
      else panel.querySelector("#exp-meldung4").textContent = "✗ Halbiere zweimal: 6 V → ? → ?";
    });

    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = WIDERSTAENDE.map(x => [
        x.r / 1000, m[x.id].th,
        Number.isFinite(a.tau[x.id]) ? a.tau[x.id] : "",
        m[x.id].tauDirekt,
        Number.isFinite(a.c[x.id]) ? a.c[x.id] : ""
      ]);
      csvHerunterladen("rc-entladung-messwerte.csv",
        ["R in kΩ", "T_h in s", "τ aus T_h in s", "τ direkt in s", "C in µF"], zeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.rIndex = 0; zustand.geladen = false; zustand.spur = null;
      zustand.cursor = [2, 4]; zustand.messungen = {};
      zustand.auswertung = { tau: {}, c: {}, faktor: null, u2: null };
      zeichne(); wechslePhase("aufbau");
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }

  zeigePhase("aufbau");
}
