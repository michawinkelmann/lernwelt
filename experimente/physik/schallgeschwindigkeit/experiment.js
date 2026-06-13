// experiment.js — Interaktives Experiment: Schallgeschwindigkeit per Laufzeitmessung
// (Klasse 7–9). Realitätsnahe Messpraxis: Zwei Mikrofone im Abstand d hängen an
// einer elektronischen Stoppuhr (Start: Mikro 1, Stopp: Mikro 2). Ein Klatschen
// neben Mikro 1 startet die Uhr — erreicht der Knall Mikro 2, stoppt sie. Der
// Abstand wird am Maßband SELBST abgelesen, die Laufzeit von der Digitalanzeige
// SELBST übertragen. Aus dem d-Δt-Diagramm liefert die Steigung k der
// Regressionsgeraden die Schallgeschwindigkeit c = 1/k.
//
// MODELL (exakt, dokumentiert; Modulebene DOM-frei → TESTS laufen in Node):
//   c_wahr = 343,2 m/s (trockene Luft, 20 °C) · Δt_wahr = d / c_wahr
//   Anzeige in ms (2 Nachkommastellen) = Δt_wahr + Trigger-Jitter ±0,05 ms,
//   deterministisch geseedet: streuung("t:" + d.toFixed(2) [+ ":" + Knall-Nr.], 0,10).
//   Wiederholter Knall am selben d → neuer Index → leicht anderer Jitter: Die
//   Streuung wird sichtbar, bleibt aber reproduzierbar (testbar).
//   Maßband: bandAbstand(d) = d ± 5 mm (geseedet); Eintrag-Toleranz ±1,5 cm.
//   Vertiefung Temperatur: c(ϑ) ≈ 331,5 + 0,6·ϑ (ϑ in °C). Diese Formel liefert
//   bei 20 °C den Wert 343,5 m/s, unser Versuchswert ist 343,2 m/s — verschiedene
//   Modelle runden verschieden; die TESTS prüfen nur die eigene Formel.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, regression,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten & Modell (rein, Node-testbar) ----------
export const C_WAHR = 343.2;              // m/s — Schallgeschwindigkeit bei 20 °C
export const D_MIN = 1.0, D_MAX = 10.0;   // m — einstellbarer Mikrofon-Abstand
export const MIN_ABSTAENDE = 6;           // mindestens 6 VERSCHIEDENE Abstände

export const ABSTAND_TOLERANZ = 0.015;    // m  — Ablesung am Maßband (Lupe)
export const ZEIT_TOLERANZ_MS = 0.05;     // ms — Δt exakt von der Anzeige übertragen
export const STEIGUNG_TOLERANZ_PROZENT = 3; // %  — abgelesene Steigung k
export const C_TOLERANZ = 6;              // m/s — berechnetes c (gegen 1000/k)
export const JITTER_SPANNE_MS = 0.10;     // Spanne der Trigger-Streuung (±0,05 ms)

// Abstands-Schlüssel: Slider-Schritt ist 0,1 m → auf 2 Stellen normieren,
// damit die geseedete Streuung nicht an Gleitkomma-Resten hängt.
export function abstandsKey(d) { return Number(d).toFixed(2); }

// wahre Laufzeit in ms: Δt = d / c
export function deltaTWahrMs(d) { return d / C_WAHR * 1000; }

// Anzeige der elektronischen Stoppuhr (vor Rundung): wahre Laufzeit plus
// Trigger-Jitter ±0,05 ms. `knall` zählt die Auslösungen am selben Abstand —
// jeder neue Knall bekommt einen eigenen Seed (Wiederholmessung streut!).
export function deltaTAnzeigeMs(d, knall = 0) {
  const key = "t:" + abstandsKey(d) + (knall > 0 ? ":" + knall : "");
  return deltaTWahrMs(d) + streuung(key, JITTER_SPANNE_MS);
}

// Digitalanzeige rundet auf 2 Nachkommastellen (0,01 ms)
export function runde2(x) { return Math.round(x * 100) / 100; }

// Maßband-Wahrheit: Mikrofonfüße trifft man beim Aufstellen nie exakt —
// das Maßband zeigt den tatsächlichen Abstand (±5 mm, geseedet).
export function bandAbstand(d) { return d + streuung("d:" + abstandsKey(d), 0.01); }

// ---------- Auswertelogik ----------
// Steigung k des d-Δt-Diagramms in ms/m → c = 1000/k in m/s
export function cAusSteigung(kMsProM) { return 1000 / kMsProM; }
export function steigungOk(eingabe, soll) {
  return Number.isFinite(eingabe) && Number.isFinite(soll) && soll > 0 &&
    Math.abs(eingabe - soll) / soll * 100 <= STEIGUNG_TOLERANZ_PROZENT;
}
export function cOk(eingabe, kMsProM) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - cAusSteigung(kMsProM)) <= C_TOLERANZ;
}
// relativer Fehler durch den Trigger-Jitter: ±0,05 ms bezogen auf Δt(d)
export function relFehlerProzent(d) { return ZEIT_TOLERANZ_MS / deltaTWahrMs(d) * 100; }
// Vertiefung: Temperaturabhängigkeit (ϑ in °C)
export function cAusTemperatur(thetaGradC) { return 331.5 + 0.6 * thetaGradC; }
export function bewertungC(c) {
  const abw = Math.abs(c - C_WAHR) / C_WAHR * 100;
  if (abw <= 1) return { stufe: "sehr gut", abw };
  if (abw <= 3) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen — lies die Steigung neu ab", abw };
}

// ---------- TESTS (Node: Modulebene DOM-frei) ----------
const D_RASTER = Array.from({ length: 19 }, (_, i) => 1 + i * 0.5); // 1,0 … 10,0 m
const REIHE6 = [1.5, 3.0, 4.5, 6.0, 8.0, 10.0];
function reihePerfekt() { return D_RASTER.map(d => ({ x: d, y: d / C_WAHR })); }
function reiheReal() { return REIHE6.map(d => ({ x: bandAbstand(d), y: deltaTAnzeigeMs(d, 0) / 1000 })); }
function reiheMitWiederholung() {
  const p = [];
  for (const d of [2.0, 4.0, 6.0, 8.0, 10.0]) {
    for (let k = 0; k < 2; k++) p.push({ x: bandAbstand(d), y: deltaTAnzeigeMs(d, k) / 1000 });
  }
  return p;
}

export const TESTS = [
  { name: "Δt-Kontrollwert: d = 5,0 m → 14,57 ms", ok: () => runde2(deltaTWahrMs(5.0)) === 14.57 },
  { name: "Δt-Kontrollwert: d = 10,0 m → 29,14 ms", ok: () => runde2(deltaTWahrMs(10.0)) === 29.14 },
  { name: "Anzeige-Jitter ≤ ±0,05 ms (alle d, Knall 0–5)", ok: () => D_RASTER.every(d => [0, 1, 2, 3, 4, 5].every(k => Math.abs(deltaTAnzeigeMs(d, k) - deltaTWahrMs(d)) <= ZEIT_TOLERANZ_MS + 1e-12)) },
  { name: "Anzeige deterministisch, Wiederholungs-Knall variiert", ok: () => deltaTAnzeigeMs(5.0, 0) === deltaTAnzeigeMs(5.0, 0) && deltaTAnzeigeMs(5.0, 2) === deltaTAnzeigeMs(5.0, 2) && D_RASTER.every(d => new Set([0, 1, 2, 3].map(k => deltaTAnzeigeMs(d, k))).size === 4) },
  { name: "Maßband: |Band − d| ≤ 5 mm, deterministisch", ok: () => D_RASTER.every(d => Math.abs(bandAbstand(d) - d) <= 0.005) && bandAbstand(7.5) === bandAbstand(7.5) },
  { name: "perfekte Reihe → Steigung 1/343,2 und c exakt 343,2", ok: () => { const r = regression(reihePerfekt()); return Math.abs(r.m - 1 / C_WAHR) < 1e-12 && Math.abs(r.b) < 1e-12 && Math.abs(cAusSteigung(r.m * 1000) - C_WAHR) < 1e-9; } },
  { name: "reale 6er-Reihe → c höchstens ±1 m/s neben 343,2", ok: () => Math.abs(cAusSteigung(regression(reiheReal()).m * 1000) - C_WAHR) <= 1 },
  { name: "Wiederholmessungen stören die Gerade nicht (±1 m/s)", ok: () => Math.abs(cAusSteigung(regression(reiheMitWiederholung()).m * 1000) - C_WAHR) <= 1 },
  { name: "relativer Zeitfehler fällt monoton: 1 m ≈ 1,7 % · 10 m ≈ 0,17 %", ok: () => D_RASTER.slice(1).every((d, i) => relFehlerProzent(d) < relFehlerProzent(D_RASTER[i])) && Math.abs(relFehlerProzent(10) - 0.17) < 0.005 && Math.abs(relFehlerProzent(1) - 1.72) < 0.05 },
  { name: "Temperaturformel: 20 °C → 343,5 · 30 °C → 349,5 m/s (schneller)", ok: () => Math.abs(cAusTemperatur(20) - 343.5) < 1e-9 && Math.abs(cAusTemperatur(30) - 349.5) < 1e-9 && cAusTemperatur(30) > cAusTemperatur(20) },
  { name: "parseDezimal & Übertrag-Toleranzen (±0,05 ms · ±1,5 cm)", ok: () => parseDezimal("14,57") === 14.57 && parseDezimal("14.57") === 14.57 && Number.isNaN(parseDezimal("abc")) && ablesungOk(14.57, 14.57, ZEIT_TOLERANZ_MS) && ablesungOk(14.53, 14.57, ZEIT_TOLERANZ_MS) && !ablesungOk(14.51, 14.57, ZEIT_TOLERANZ_MS) && !ablesungOk(NaN, 14.57, ZEIT_TOLERANZ_MS) && ablesungOk(5.01, 5.003, ABSTAND_TOLERANZ) && !ablesungOk(5.02, 5.003, ABSTAND_TOLERANZ) },
  { name: "Steigungs- und c-Prüfung (±3 % · ±6 m/s)", ok: () => { const k = 1000 / C_WAHR; return steigungOk(k * 1.029, k) && !steigungOk(k * 1.031, k) && !steigungOk(NaN, k) && cOk(343, 2.9) && !cOk(351, 2.9) && Math.abs(cAusSteigung(k) - C_WAHR) < 1e-9 && bewertungC(343.2).stufe === "sehr gut" && bewertungC(335).stufe === "gut"; } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    d: 5.0,                   // Slider-Einstellung in m
    abstandOk: false, dMess: NaN, // Maßband korrekt abgelesen + notierter Wert
    dtAnzeige: NaN,           // Anzeige der Stoppuhr in ms (NaN = noch kein Knall)
    dtWartend: NaN,           // Wert, der nach der Wellenfront-Animation erscheint
    misst: false,             // Wellenfront unterwegs (Animation läuft)
    wellenFrac: 0,            // Anteil der Strecke, den die Front geschafft hat
    knallProD: {},            // Abstands-Key → Anzahl ausgelöster Knalle (Jitter-Index)
    messungen: [],            // {key, dMess, dtMs}
    auswertung: { kEingabe: NaN, kOk: false, cEingabe: NaN, cOk: false, f1: "", f2: "" },
    info: "",                 // letzte Erfolgsmeldung (überlebt das Neuzeichnen)
    phase: "aufbau",
    rafId: 0, animStart: 0, animDauer: 0
  };

  wurzel.innerHTML = "";
  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], id => {
    zustand.phase = id;
    if (id !== "messen") stoppeWelle();
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  });

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="380" height="470" aria-label="Versuchsaufbau: Zwei Mikrofone auf Stativen im Abstand d, beide an eine elektronische Stoppuhr angeschlossen; links ein Lautsprecher-Symbol für den Knall. Unten ein Maßband und eine Lupe, die das Maßband bei Mikrofon 2 vergrößert zeigt."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const X0 = 42, SKALA = 30, BODEN = 330, KOPF_Y = 262; // 1 m = 30 px

  function stoppeWelle() {
    cancelAnimationFrame(zustand.rafId);
    zustand.misst = false; zustand.wellenFrac = 0; zustand.dtWartend = NaN;
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "13px system-ui, sans-serif";
    ctx.textAlign = "start";

    const x1 = X0, x2 = X0 + zustand.d * SKALA;

    function mikrofon(x, label) {
      ctx.fillStyle = cText;
      ctx.fillRect(x - 14, BODEN - 6, 28, 6);                    // Standfuß
      ctx.fillRect(x - 2, KOPF_Y + 8, 4, BODEN - KOPF_Y - 14);   // Stange
      ctx.beginPath(); ctx.arc(x, KOPF_Y, 9, 0, 7);              // Kopf
      ctx.fillStyle = cFlaeche; ctx.fill();
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
      ctx.lineWidth = 1.5;                                        // Mikrofon-Gitter
      ctx.beginPath();
      ctx.moveTo(x - 5, KOPF_Y); ctx.lineTo(x + 5, KOPF_Y);
      ctx.moveTo(x - 4, KOPF_Y - 3.5); ctx.lineTo(x + 4, KOPF_Y - 3.5);
      ctx.moveTo(x - 4, KOPF_Y + 3.5); ctx.lineTo(x + 4, KOPF_Y + 3.5);
      ctx.stroke();
      ctx.fillStyle = cText; ctx.textAlign = "center";
      ctx.fillText(label, x, KOPF_Y - 16); ctx.textAlign = "start";
    }

    // Zeitbox (elektronische Stoppuhr)
    const bx = 104, by = 22, bw = 200, bh = 54;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(bx, by, bw, bh); ctx.strokeRect(bx, by, bw, bh);
    ctx.textAlign = "center"; ctx.fillStyle = cText;
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("elektronische Stoppuhr", bx + bw / 2, by - 7);
    ctx.font = "bold 21px ui-monospace, Consolas, monospace";
    const anzeigeText = zustand.misst ? "läuft …"
      : (Number.isFinite(zustand.dtAnzeige) ? komma(zustand.dtAnzeige, 2) + " ms" : "––,–– ms");
    ctx.fillText(anzeigeText, bx + bw / 2, by + 30);
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cLeise;
    ctx.fillText("Start: Mikro 1 · Stopp: Mikro 2", bx + bw / 2, by + bh - 8);
    ctx.textAlign = "start";

    // Kabel von den Mikrofonen zur Zeitbox
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x1, KOPF_Y - 9); ctx.lineTo(x1, 112); ctx.lineTo(bx + 24, by + bh); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x2, KOPF_Y - 9); ctx.lineTo(x2, 112); ctx.lineTo(bx + bw - 24, by + bh); ctx.stroke();

    // Boden
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(8, BODEN); ctx.lineTo(w - 8, BODEN); ctx.stroke();

    // Lautsprecher-Symbol (Knallquelle) links neben Mikro 1 — stumm!
    ctx.fillStyle = cText;
    ctx.fillRect(10, 302, 8, 14);
    ctx.beginPath(); ctx.moveTo(18, 302); ctx.lineTo(28, 293); ctx.lineTo(28, 325); ctx.lineTo(18, 316); ctx.closePath(); ctx.fill();
    if (zustand.misst) {
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(30, 309, 6, -0.9, 0.9); ctx.stroke();
      ctx.beginPath(); ctx.arc(30, 309, 11, -0.9, 0.9); ctx.stroke();
    }

    mikrofon(x1, "M1"); mikrofon(x2, "M2");

    // Wellenfront in Zeitlupe — oberhalb des Bodens geclippt
    if ((zustand.misst || Number.isFinite(zustand.dtAnzeige)) && zustand.wellenFrac > 0) {
      const r = Math.max(2, zustand.wellenFrac * zustand.d * SKALA);
      ctx.save(); ctx.beginPath(); ctx.rect(0, 86, w, BODEN - 86); ctx.clip();
      ctx.strokeStyle = cAkzent;
      for (const [rr, alpha, lw] of [[r, 0.9, 2.5], [r - 24, 0.35, 1.5], [r - 48, 0.18, 1.5]]) {
        if (rr > 2) {
          ctx.globalAlpha = zustand.misst ? alpha : 0.25; ctx.lineWidth = lw;
          ctx.beginPath(); ctx.arc(x1, KOPF_Y, rr, 0, 7); ctx.stroke();
        }
      }
      ctx.globalAlpha = 1; ctx.restore();
    }
    if (zustand.misst) { ctx.fillStyle = cLeise; ctx.fillText("Zeitlupe!", 14, 104); }
    if (!zustand.misst && Number.isFinite(zustand.dtAnzeige)) {
      ctx.fillStyle = cAkzent; ctx.font = "bold 14px system-ui, sans-serif";
      ctx.fillText("✓", x2 + 12, KOPF_Y - 12);
      ctx.font = "13px system-ui, sans-serif";
    }

    // Maßband am Boden (0 bei Mikro 1)
    const mbY = 340, mbH = 20;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.fillRect(X0 - 8, mbY, D_MAX * SKALA + 24, mbH);
    ctx.strokeRect(X0 - 8, mbY, D_MAX * SKALA + 24, mbH);
    ctx.font = "10px system-ui, sans-serif";
    for (let halbe = 0; halbe <= 20; halbe++) {
      const v = halbe / 2, x = X0 + v * SKALA, ganz = halbe % 2 === 0;
      ctx.strokeStyle = ganz ? cText : cLeise;
      ctx.beginPath(); ctx.moveTo(x, mbY); ctx.lineTo(x, mbY + (ganz ? 9 : 6)); ctx.stroke();
      if (ganz) { ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(String(v), x, mbY + 18); ctx.textAlign = "start"; }
    }
    ctx.fillStyle = cLeise; ctx.fillText("m", 16, mbY + 14);
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;                 // Markierung Mikro 2
    ctx.beginPath(); ctx.moveTo(x2, mbY - 4); ctx.lineTo(x2, mbY + mbH + 4); ctx.stroke();

    // Lupe: vergrößerter Maßband-Ausschnitt (±2,2 cm um die Mikro-2-Markierung)
    const lup = { x: 20, y: 384, w: 340, h: 72 };
    ctx.fillStyle = cFlaeche; ctx.fillRect(lup.x, lup.y, lup.w, lup.h);
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5; ctx.strokeRect(lup.x, lup.y, lup.w, lup.h);
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Lupe: Maßband bei Mikro 2 (m)", lup.x, lup.y - 6);
    const bandW = bandAbstand(zustand.d), cx = lup.x + lup.w / 2, ppm = lup.w / 0.044;
    ctx.save(); ctx.beginPath(); ctx.rect(lup.x, lup.y, lup.w, lup.h); ctx.clip();
    ctx.font = "11px system-ui, sans-serif";
    for (let mm = Math.ceil((bandW - 0.022) * 1000); mm <= Math.floor((bandW + 0.022) * 1000); mm++) {
      const v = mm / 1000, x = cx + (v - bandW) * ppm;
      ctx.strokeStyle = mm % 10 === 0 ? cText : cLeise; ctx.lineWidth = 1;
      const hh = mm % 10 === 0 ? 26 : mm % 5 === 0 ? 17 : 10;
      ctx.beginPath(); ctx.moveTo(x, lup.y + lup.h - 6); ctx.lineTo(x, lup.y + lup.h - 6 - hh); ctx.stroke();
      if (mm % 10 === 0) { ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.fillText(komma(v, 2), x, lup.y + 22); ctx.textAlign = "start"; }
    }
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(cx, lup.y + 28); ctx.lineTo(cx, lup.y + lup.h - 4); ctx.stroke();
    ctx.fillStyle = cAkzent; ctx.fillText("Mikro 2", cx + 6, lup.y + 38);
    ctx.restore();
  }

  // ---------- Wellenfront-Animation ----------
  function tick(now) {
    if (!zustand.misst) return;
    const frac = Math.min(1, (now - zustand.animStart) / zustand.animDauer);
    zustand.wellenFrac = frac;
    zeichne();
    if (frac < 1) { zustand.rafId = requestAnimationFrame(tick); return; }
    zustand.misst = false;
    zustand.dtAnzeige = zustand.dtWartend; zustand.dtWartend = NaN;
    zeichne();
    if (zustand.phase === "messen") { panelMessen(); panel.querySelector("#exp-t")?.focus(); }
  }

  // ---------- Panels ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Zwei <strong>Mikrofone</strong> stehen im Abstand d auf dem Tisch. Beide hängen an einer <strong>elektronischen Stoppuhr</strong>: Erreicht ein Knall Mikrofon 1, <strong>startet</strong> die Uhr — erreicht er Mikrofon 2, <strong>stoppt</strong> sie. Den Knall löst du mit einem Klatschen direkt neben Mikrofon 1 aus (das Lautsprecher-Symbol bleibt stumm). Den Abstand misst du mit dem <strong>Maßband</strong>; die <strong>Lupe</strong> zeigt dir die Stelle bei Mikrofon 2 vergrößert.</p>
      <p><strong>Plan:</strong> Miss die Laufzeit Δt für mindestens ${MIN_ABSTAENDE} <em>verschiedene</em> Abstände zwischen ${komma(D_MIN, 1)} m und ${komma(D_MAX, 1)} m. In der Auswertung trägst du Δt über d auf: Es entsteht eine Ursprungsgerade — und aus ihrer Steigung folgt die Schallgeschwindigkeit c.</p>
      <p class="exp-hinweis">⚠ Wie im echten Versuch gilt: Die Uhr triggert nur auf etwa ±0,05 ms genau — zwei Knalle beim selben Abstand zeigen nie exakt dieselbe Zeit. Auf dem Bildschirm läuft der Knall in <strong>Zeitlupe</strong>; echter Schall wäre längst angekommen, bevor du blinzelst.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const a = zustand;
    const n = a.messungen.length;
    const verschieden = new Set(a.messungen.map(z => z.key)).size;
    const anzeigeText = a.misst ? "läuft …" : (Number.isFinite(a.dtAnzeige) ? komma(a.dtAnzeige, 2) + " ms" : "– –,– – ms");
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-abstand">Mikrofon-Abstand einstellen: <strong id="exp-d-wert">${komma(a.d, 1)} m</strong></label>
        <input type="range" id="exp-abstand" min="${D_MIN}" max="${D_MAX}" step="0.1" value="${a.d}">
      </div>
      <form id="exp-d-form" class="exp-ablesen">
        <label for="exp-d-mess">1 · Lies die Lupe ab — Abstand d in m:</label>
        <input id="exp-d-mess" inputmode="decimal" autocomplete="off" size="7" value="${a.abstandOk ? komma(a.dMess, 2) : ""}">
        <button class="knopf">Abstand notieren</button>
      </form>
      <p id="exp-d-meldung" class="exp-meldung" aria-live="polite">${a.abstandOk ? "✓ Abstand notiert." : ""}</p>
      <div class="exp-knopfzeile">
        <button class="knopf" id="exp-knall" ${a.abstandOk && !a.misst ? "" : "disabled"}>2 · Knall auslösen${a.misst ? " …" : ""}</button>
      </div>
      <p>Stoppuhr-Anzeige: <strong id="exp-anzeige" style="font-variant-numeric: tabular-nums">${anzeigeText}</strong></p>
      <form id="exp-t-form" class="exp-ablesen">
        <label for="exp-t">3 · Übertrage die Anzeige — Δt in ms:</label>
        <input id="exp-t" inputmode="decimal" autocomplete="off" size="7" ${Number.isFinite(a.dtAnzeige) ? "" : "disabled"}>
        <button class="knopf" ${Number.isFinite(a.dtAnzeige) ? "" : "disabled"}>In die Tabelle</button>
      </form>
      <p id="exp-t-meldung" class="exp-meldung" aria-live="polite">${esc(a.info)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>d in m</th><th>Δt in ms</th></tr></thead>
      <tbody>${a.messungen.map(z => `<tr><td>${komma(z.dMess, 2)}</td><td>${komma(z.dtMs, 2)}</td></tr>`).join("") || '<tr><td colspan="2">noch leer</td></tr>'}</tbody></table>
      <p>${verschieden} von mindestens ${MIN_ABSTAENDE} verschiedenen Abständen (${n} Messung${n === 1 ? "" : "en"} insgesamt). Wiederholungen beim selben Abstand sind erlaubt — sie zeigen die Streuung, zählen aber nicht als neuer Abstand.</p>
      <button class="knopf" id="exp-weiter2" ${verschieden >= MIN_ABSTAENDE ? "" : "disabled"}>Zur Auswertung</button>`;

    const slider = panel.querySelector("#exp-abstand");
    slider.addEventListener("input", () => {
      stoppeWelle();
      zustand.d = parseDezimal(slider.value);
      zustand.abstandOk = false; zustand.dMess = NaN; zustand.dtAnzeige = NaN; zustand.info = "";
      panel.querySelector("#exp-d-wert").textContent = komma(zustand.d, 1) + " m";
      panel.querySelector("#exp-knall").disabled = true;
      panel.querySelector("#exp-t").disabled = true;
      panel.querySelector("#exp-anzeige").textContent = "– –,– – ms";
      panel.querySelector("#exp-d-meldung").textContent = "";
      zeichne();
    });
    slider.addEventListener("change", () => { panelMessen(); panel.querySelector("#exp-abstand").focus(); });

    panel.querySelector("#exp-d-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-d-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-d-mess").value);
      if (!ablesungOk(eingabe, bandAbstand(zustand.d), ABSTAND_TOLERANZ)) {
        meldung.textContent = "✗ Schau in die Lupe: Wo steht die Mikro-2-Markierung auf dem Maßband? (Auf 1 cm genau reicht, z. B. 5,00.)";
        return;
      }
      zustand.abstandOk = true; zustand.dMess = eingabe; zustand.dtAnzeige = NaN; zustand.info = "";
      panelMessen();
    });

    panel.querySelector("#exp-knall").addEventListener("click", () => {
      if (!zustand.abstandOk || zustand.misst) return;
      const key = abstandsKey(zustand.d);
      const index = zustand.knallProD[key] || 0;
      zustand.knallProD[key] = index + 1;
      const wert = runde2(deltaTAnzeigeMs(zustand.d, index));
      zustand.dtAnzeige = NaN; zustand.info = "";
      if (reduziert) {                       // sofortiges Ergebnis ohne Animation
        zustand.wellenFrac = 1; zustand.dtAnzeige = wert;
        zeichne(); panelMessen(); panel.querySelector("#exp-t")?.focus();
        return;
      }
      zustand.misst = true; zustand.dtWartend = wert; zustand.wellenFrac = 0;
      zustand.animStart = performance.now();
      zustand.animDauer = 200 + zustand.d * 140;   // Zeitlupe: ~0,3–1,6 s
      cancelAnimationFrame(zustand.rafId);
      zustand.rafId = requestAnimationFrame(tick);
      panelMessen();
    });

    panel.querySelector("#exp-t-form").addEventListener("submit", ev => {
      ev.preventDefault();
      if (!Number.isFinite(zustand.dtAnzeige)) return;
      const meldung = panel.querySelector("#exp-t-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-t").value);
      if (!ablesungOk(eingabe, zustand.dtAnzeige, ZEIT_TOLERANZ_MS)) {
        meldung.textContent = "✗ Übertrage genau, was die Anzeige zeigt — mit beiden Nachkommastellen (z. B. 14,57).";
        return;
      }
      zustand.messungen.push({ key: abstandsKey(zustand.d), dMess: zustand.dMess, dtMs: eingabe });
      zustand.auswertung.kEingabe = NaN; zustand.auswertung.kOk = false;
      zustand.auswertung.cEingabe = NaN; zustand.auswertung.cOk = false;
      zustand.info = "✓ Eingetragen. Löse ruhig beim selben Abstand noch einen Knall aus — die Anzeige schwankt leicht (Streuung!) — oder stell den nächsten Abstand ein.";
      zustand.dtAnzeige = NaN; zustand.wellenFrac = 0;
      zeichne();
      panelMessen();
    });

    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  function bewertungHtml(c) {
    const bew = bewertungC(c);
    return `<p><strong>Vergleich:</strong> Bei 20 °C gilt in Luft c ≈ 343 m/s (Modellwert dieses Versuchs: ${komma(C_WAHR, 1)} m/s). Dein Wert: <strong>${komma(c, 0)} m/s</strong> — Abweichung ${komma(bew.abw, 1)} %: <strong>${esc(bew.stufe)}</strong>.</p>`;
  }

  function feedbackF1(wert) {
    if (!wert) return "";
    if (wert === "1km") return "✓ Richtig: 343 m/s · 3 s ≈ 1030 m — also etwa 1 km. Daher die Faustformel: Sekunden zwischen Blitz und Donner zählen und durch 3 teilen → Entfernung in Kilometern.";
    return "✗ Rechne mit deinem Ergebnis: Strecke = c · Zeit. Der Lichtblitz ist praktisch sofort bei dir, der Donner braucht die vollen 3 s.";
  }
  function feedbackF2(wert) {
    if (!wert) return "";
    if (wert === "schneller") return "✓ Richtig: In wärmerer Luft ist der Schall schneller. Vertiefung: c ≈ 331,5 + 0,6 · ϑ (ϑ in °C) — bei 30 °C also rund 349,5 m/s. Bei 20 °C liefert diese Formel übrigens 343,5 m/s, unser Versuch nutzt 343,2 m/s: Verschiedene Modelle runden verschieden.";
    return "✗ Denk an die Luftteilchen: Je wärmer, desto schneller flitzen sie — und desto schneller reichen sie den Schall weiter. Probier es noch einmal.";
  }
  function frageHtml(id, frage, optionen, gewaehlt, feedback) {
    return `
      <p><strong>${frage}</strong></p>
      <div class="exp-knopfzeile" data-frage="${id}" role="group" aria-label="Antwortmöglichkeiten">
        ${optionen.map(o => `<button class="knopf zweitrangig" data-wert="${o.wert}" aria-pressed="${String(gewaehlt === o.wert)}">${esc(o.text)}</button>`).join("")}
      </div>
      <p class="exp-meldung" aria-live="polite">${feedback}</p>`;
  }

  function panelAuswerten() {
    stoppeWelle(); zeichne();
    const zeilen = zustand.messungen;
    const verschieden = new Set(zeilen.map(z => z.key)).size;
    if (verschieden < MIN_ABSTAENDE) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Du hast erst ${verschieden} von ${MIN_ABSTAENDE} verschiedenen Abständen gemessen. Für eine belastbare Gerade brauchst du mehr Punkte — zurück zur Durchführung!</p>
        <button class="knopf" id="exp-zurueck">Weiter messen</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const punkte = zeilen.map(z => ({ x: z.dMess, y: z.dtMs / 1000 })); // Δt in s umrechnen!
    const reg = regression(punkte);
    const kSollMs = reg.m * 1000;                                       // Steigung in ms/m
    const a = zustand.auswertung;
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Der Schall braucht für die Strecke d die Zeit <strong>Δt = d / c</strong>. Trägt man Δt über d auf, entsteht also eine Ursprungsgerade mit der Steigung k = 1/c — und damit <strong>c = 1/k</strong>.</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Laufzeit Delta-t in Millisekunden über dem Abstand d in Metern mit deinen Messpunkten und der Regressionsgeraden."></canvas>
      <h3>Schritt 1: Steigung ablesen</h3>
      <p>Wähle zwei weit auseinanderliegende Stellen <em>auf der Geraden</em> (nicht auf einzelnen Punkten!) und bilde k = Δ(Δt) / Δd — hier praktisch in <strong>ms/m</strong>.</p>
      <form id="exp-k-form" class="exp-ablesen">
        <label for="exp-k">k in ms/m:</label>
        <input id="exp-k" inputmode="decimal" autocomplete="off" size="7" ${a.kOk ? "disabled" : ""} value="${a.kOk ? komma(a.kEingabe, 2) : ""}">
        <button class="knopf" ${a.kOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-k-meldung" class="exp-meldung" aria-live="polite">${a.kOk ? "✓ Gut abgelesen." : ""}</p>
      ${a.kOk ? `
      <h3>Schritt 2: c berechnen</h3>
      <p>Aus k = 1/c folgt c = 1/k. Dein k ist in ms/m — also <strong>c = 1000 / k in m/s</strong>. Rechne mit deinem k = ${komma(a.kEingabe, 2)} ms/m.</p>
      <form id="exp-c-form" class="exp-ablesen">
        <label for="exp-c">c in m/s:</label>
        <input id="exp-c" inputmode="decimal" autocomplete="off" size="7" ${a.cOk ? "disabled" : ""} value="${a.cOk ? komma(a.cEingabe, 0) : ""}">
        <button class="knopf" ${a.cOk ? "disabled" : ""}>Prüfen</button>
      </form>
      <p id="exp-c-meldung" class="exp-meldung" aria-live="polite">${a.cOk ? "✓ Richtig gerechnet." : ""}</p>` : ""}
      ${a.cOk ? bewertungHtml(a.cEingabe) : ""}
      <h3>Warum sind große Abstände genauer?</h3>
      <p>Die Uhr triggert nur auf ±${komma(ZEIT_TOLERANZ_MS, 2)} ms genau — egal, wie groß d ist. Bei d = 1,0 m ist Δt ≈ ${komma(runde2(deltaTWahrMs(1)), 2)} ms; davon sind 0,05 ms schon ${komma(relFehlerProzent(1), 1)} %. Bei d = 10,0 m ist Δt ≈ ${komma(runde2(deltaTWahrMs(10)), 2)} ms — dieselben 0,05 ms machen nur noch ${komma(relFehlerProzent(10), 2)} % aus. <strong>Gleicher absoluter Fehler, ein Zehntel relativer Fehler:</strong> Deshalb misst man über möglichst große Abstände.</p>
      <h3>Erkenntnisfragen</h3>
      ${frageHtml("f1", "1 · Zwischen Blitz und Donner zählst du 3 Sekunden. Wie weit ist das Gewitter ungefähr entfernt?", [
        { wert: "300m", text: "etwa 300 m" }, { wert: "1km", text: "etwa 1 km" },
        { wert: "3km", text: "etwa 3 km" }, { wert: "10km", text: "etwa 10 km" }
      ], a.f1, feedbackF1(a.f1))}
      ${frageHtml("f2", "2 · An einem heißen Sommertag (30 °C): Ist der Schall schneller oder langsamer als bei 20 °C?", [
        { wert: "schneller", text: "schneller" }, { wert: "langsamer", text: "langsamer" },
        { wert: "gleich", text: "genauso schnell" }
      ], a.f2, feedbackF2(a.f2))}
      <details class="exp-fehler"><summary>Fehlerbetrachtung — was begrenzt die Genauigkeit?</summary>
        <ul>
          <li><strong>Triggerschwelle:</strong> Die Uhr schaltet erst, wenn das Mikrofonsignal eine Schwelle überschreitet — mal einen Tick früher, mal später (hier ±0,05 ms). Weil beide Mikrofone gleich gebaut sind, hebt sich ein Teil dieses Fehlers weg; der Rest bleibt als Streuung in deiner Tabelle sichtbar.</li>
          <li><strong>Wind und Temperatur:</strong> Rückenwind verkürzt die Laufzeit, Gegenwind verlängert sie. Und über warmem Boden ist die Luft nicht überall gleich warm — c ändert sich unterwegs. Im Freien streuen die Messwerte deshalb stärker als hier.</li>
          <li><strong>Maßband:</strong> Über mehrere Meter hängt ein Maßband durch und lässt sich leicht um 1–2 cm verschätzen. Zum Glück: Bei d = 10 m sind 2 cm nur 0,2 % — auch hier sind große Abstände im Vorteil.</li>
        </ul>
      </details>
      <h3>Deine Messreihe</h3>
      <table class="exp-tabelle"><thead><tr><th>d in m</th><th>Δt in ms</th><th>Δt in s</th></tr></thead>
      <tbody>${zeilen.map(z => `<tr><td>${komma(z.dMess, 2)}</td><td>${komma(z.dtMs, 2)}</td><td>${komma(z.dtMs / 1000, 5)}</td></tr>`).join("")}</tbody></table>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messung als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;

    panel.querySelector("#exp-k-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-k").value);
      if (steigungOk(eingabe, kSollMs)) {
        zustand.auswertung.kEingabe = eingabe; zustand.auswertung.kOk = true;
        panelAuswerten();
      } else {
        panel.querySelector("#exp-k-meldung").textContent = "✗ Das passt noch nicht zur Geraden. Lies z. B. bei d = 2 m und d = 10 m die Δt-Werte auf der Geraden ab und teile die Differenz (in ms) durch 8 m.";
      }
    });
    panel.querySelector("#exp-c-form")?.addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-c").value);
      if (cOk(eingabe, zustand.auswertung.kEingabe)) {
        zustand.auswertung.cEingabe = eingabe; zustand.auswertung.cOk = true;
        panelAuswerten();
      } else {
        panel.querySelector("#exp-c-meldung").textContent = `✗ Taschenrechner: 1000 ÷ ${komma(zustand.auswertung.kEingabe, 2)} — das Ergebnis ist c in m/s.`;
      }
    });
    panel.querySelectorAll("[data-frage] [data-wert]").forEach(b => b.addEventListener("click", () => {
      zustand.auswertung[b.closest("[data-frage]").dataset.frage] = b.dataset.wert;
      panelAuswerten();
    }));
    panel.querySelector("#exp-csv").addEventListener("click", () =>
      csvHerunterladen("schallgeschwindigkeit-messung.csv", ["d in m", "Δt in ms", "Δt in s"],
        zeilen.map(z => [z.dMess, z.dtMs, komma(z.dtMs / 1000, 5)])));
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      stoppeWelle();
      Object.assign(zustand, {
        d: 5.0, abstandOk: false, dMess: NaN, dtAnzeige: NaN, dtWartend: NaN,
        misst: false, wellenFrac: 0, knallProD: {}, messungen: [], info: "",
        auswertung: { kEingabe: NaN, kOk: false, cEingabe: NaN, cOk: false, f1: "", f2: "" }
      });
      zeichne();
      wechslePhase("aufbau");
    });
    zeichneDiagramm(punkte, reg);
  }

  function zeichneDiagramm(punkte, reg) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !punkte.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L0 = 52, U = H - 38, R = W - 14, O = 16;
    const xMax = 10.5;
    const yMax = Math.max(10, Math.ceil(Math.max(...punkte.map(p => p.y * 1000)) * 1.15 / 5) * 5);
    const X = v => L0 + v / xMax * (R - L0);
    const Y = v => U - v / yMax * (U - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    c.lineWidth = 1;
    for (let v = 1; v <= 10; v += 1) {
      c.strokeStyle = cLeise; c.globalAlpha = 0.4;
      c.beginPath(); c.moveTo(X(v), U); c.lineTo(X(v), O); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.fillText(String(v), X(v) - (v >= 10 ? 8 : 4), U + 16);
    }
    for (let v = 5; v <= yMax; v += 5) {
      c.strokeStyle = cLeise; c.globalAlpha = 0.4;
      c.beginPath(); c.moveTo(L0, Y(v)); c.lineTo(R, Y(v)); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.fillText(String(v), L0 - 24, Y(v) + 4);
    }
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L0, O - 4); c.lineTo(L0, U); c.lineTo(R, U); c.stroke();
    c.fillStyle = cText;
    c.fillText("Δt in ms", L0 - 44, 12); c.fillText("d in m", R - 40, U + 30); c.fillText("0", L0 - 12, U + 16);
    if (Number.isFinite(reg.m) && reg.m > 0) {
      const mMs = reg.m * 1000, bMs = reg.b * 1000;
      const xEnde = Math.min(xMax, (yMax - bMs) / mMs);
      c.strokeStyle = cText; c.setLineDash([7, 5]); c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(X(0), Y(bMs)); c.lineTo(X(xEnde), Y(mMs * xEnde + bMs)); c.stroke(); c.setLineDash([]);
    }
    for (const p of punkte) { c.fillStyle = cAkzent; c.beginPath(); c.arc(X(p.x), Y(p.y * 1000), 5, 0, 7); c.fill(); }
  }

  zeichne();
  wechslePhase("aufbau");
}
