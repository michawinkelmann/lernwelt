// experiment.js — Interaktives Experiment: Brennweite einer Sammellinse (Klasse 6).
// Realitätsnahe Messpraxis statt fertiger Konstruktion: Linse und Schirm auf der
// optischen Bank verschieben, bis das Bild des LED-Pfeils scharf ist, dann
// Gegenstandsweite g und Bildweite b SELBST an der cm-Skala (Lupen!) ablesen,
// Messreihe protokollieren und mit der Linsenformel die Brennweite f bestimmen.
// Die kleine Zeiger-Streuung kommt deterministisch aus helfer.streuung — dadurch
// bleiben pruefFaelle und TESTS in Node lauffähig (Modulebene ist DOM-frei).

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel,
  bauePhasen, csvHerunterladen, farbe
} from "../../../assets/js/experiment/helfer.js";

// ---------- Linsen (die "geheime" Linse X ist das eigentliche Messziel) ----------
export const LINSEN = [
  { id: "A", name: "Linse A", f: 10.0, geheim: false },
  { id: "B", name: "Linse B", f: 15.0, geheim: false },
  { id: "X", name: "Linse X", f: 12.5, geheim: true }
];

export const BANK_CM = 120;            // Länge der optischen Bank in cm
export const LINSE_MIN = 15;           // Stellbereich der Linse in cm
export const LINSE_MAX = 60;
export const SCHIRM_MIN_ABSTAND = 5;   // Schirm klemmt: immer mind. 5 cm hinter der Linse
export const ANZEIGE_SPANNE = 0.6;     // Zeiger-Streuung: ±0,3 cm
export const ABLESE_TOLERANZ_CM = 0.4; // akzeptierte Abweichung beim Ablesen
export const F_TOLERANZ_CM = 0.2;      // akzeptierte Abweichung je f-Rechnung
export const SCHAERFE_MINDEST = 90;    // % — erst scharfstellen, dann ablesen
export const MIN_MESSUNGEN = 5;
export const DOPPEL_G_ABSTAND = 0.6;   // cm — so nah beieinander gilt als "gleiches g"

// ---------- Modell (rein, Node-testbar) ----------
// Linsenformel 1/f = 1/g + 1/b, umgestellt: nur g > f liefert ein reelles Bild.
export function bildweiteIdeal(f, g) {
  return g > f ? (f * g) / (g - f) : NaN;
}
// Auswertung je Messzeile: f = g·b/(g+b)
export function fAusPaar(g, b) {
  return g > 0 && b > 0 ? (g * b) / (g + b) : NaN;
}
// Schärfe des Schirmbilds in %: 100 bei Δ = 0, linear auf 0 bei |Δ| = 15 cm
export function schaerfeProzent(deltaCm) {
  if (!Number.isFinite(deltaCm)) return 0;
  return Math.max(0, 100 * (1 - Math.abs(deltaCm) / 15));
}
export function schaerfeBei(f, linseCm, schirmCm) {
  const b = bildweiteIdeal(f, linseCm);
  if (!Number.isFinite(b)) return 0;
  return schaerfeProzent(schirmCm - (linseCm + b));
}
// Der Schirm kann nie vor bzw. in die Linse geschoben werden (und nicht von der Bank)
export function klemmeSchirm(linseCm, schirmCm) {
  return Math.min(BANK_CM, Math.max(schirmCm, linseCm + SCHIRM_MIN_ABSTAND));
}
// Zeigerstellung auf der Skala: wahrer Wert + reproduzierbare Streuung (±0,3 cm)
export function anzeigeWert(art, wahrCm) {
  return wahrCm + streuung(art + ":" + wahrCm.toFixed(1), ANZEIGE_SPANNE);
}
// Doppelte Gegenstandsweite abfangen (Messreihe braucht verschiedene g)
export function istDoppelG(messungen, gCm) {
  return messungen.some(z => Math.abs(z.g - gCm) < DOPPEL_G_ABSTAND);
}
export function bewertungF(fGemessen, fWahr) {
  const abw = Math.abs(fGemessen - fWahr);
  if (abw <= 0.4) return { stufe: "sehr gut", abw };
  if (abw <= 0.8) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}

// ---------- Prüffälle (analytisch bekannte Kontrollwerte) ----------
export const pruefFaelle = [
  { f: 10, g: 30, soll: { b: 15 } },
  { f: 10, g: 15, soll: { b: 30 } },
  { f: 12.5, g: 25, soll: { b: 25 } },          // g = 2f → b = 2f
  { f: 15, g: 15, soll: { keinBild: true } },   // g = f: Strahlen parallel
  { f: 15, g: 12, soll: { keinBild: true } },   // g < f: Lupe, kein reelles Bild
  { f: 12.5, g: 50, soll: { fZurueck: 12.5 } }  // Pipeline: f aus (g, b_ideal) exakt
];

export const TESTS = [
  { name: "b ideal f=10: g=30→15, g=15→30", ok: () => Math.abs(bildweiteIdeal(10, 30) - 15) < 1e-12 && Math.abs(bildweiteIdeal(10, 15) - 30) < 1e-12 },
  { name: "b ideal f=12,5: g=25→25 (g=2f→b=2f)", ok: () => Math.abs(bildweiteIdeal(12.5, 25) - 25) < 1e-12 },
  { name: "kein reelles Bild für g ≤ f", ok: () => [[15, 12], [15, 15], [10, 10], [12.5, 8]].every(([f, g]) => Number.isNaN(bildweiteIdeal(f, g))) },
  { name: "f-Pipeline aus perfekten Paaren exakt", ok: () => LINSEN.every(l => [18, 20, 25, 30, 40, 50, 60].filter(g => g > l.f + 1e-9).every(g => Math.abs(fAusPaar(g, bildweiteIdeal(l.f, g)) - l.f) < 1e-9)) },
  { name: "Schärfe: 100 bei Δ=0, 50 bei 7,5, 0 ab 15", ok: () => schaerfeProzent(0) === 100 && Math.abs(schaerfeProzent(7.5) - 50) < 1e-12 && schaerfeProzent(15) === 0 && schaerfeProzent(-15) === 0 && schaerfeProzent(22) === 0 && schaerfeProzent(3) > schaerfeProzent(6) },
  { name: "Schärfe am Fokus maximal (f=10, Linse 30, Schirm 45)", ok: () => schaerfeBei(10, 30, 45) === 100 && schaerfeBei(10, 30, 45.5) < 100 && schaerfeBei(15, 15, 80) === 0 },
  { name: "Schirm klemmt (mind. Linse + 5 cm, max. 120 cm)", ok: () => klemmeSchirm(30, 20) === 35 && klemmeSchirm(30, 80) === 80 && klemmeSchirm(60, 200) === 120 && klemmeSchirm(118, 118) === 120 },
  { name: "Anzeige deterministisch, Streuung ≤ ±0,3 cm", ok: () => ["linse", "schirm"].every(a => [15, 22.5, 30, 44.5, 60, 90, 120].every(p => anzeigeWert(a, p) === anzeigeWert(a, p) && Math.abs(anzeigeWert(a, p) - p) <= 0.3 + 1e-12)) },
  { name: "Ablesung ±0,4 cm akzeptiert/verwirft", ok: () => ablesungOk(30.3, 30.05, ABLESE_TOLERANZ_CM) && !ablesungOk(30.6, 30.05, ABLESE_TOLERANZ_CM) && !ablesungOk(NaN, 30, ABLESE_TOLERANZ_CM) },
  { name: "parseDezimal: Komma und Punkt", ok: () => parseDezimal("12,5") === 12.5 && parseDezimal("12.5") === 12.5 && Number.isNaN(parseDezimal("zwoelf")) },
  { name: "Doppel-g wird abgefangen", ok: () => istDoppelG([{ g: 30 }, { g: 40 }], 30.4) && !istDoppelG([{ g: 30 }, { g: 40 }], 35) },
  { name: "Bewertung: 0,3→sehr gut, 0,6→gut, 1,2→nochmal prüfen", ok: () => bewertungF(12.8, 12.5).stufe === "sehr gut" && bewertungF(13.1, 12.5).stufe === "gut" && bewertungF(13.7, 12.5).stufe === "nochmal prüfen" },
  { name: "Mittelwert der f-Spalte", ok: () => Math.abs(mittel([10, 10.2, 9.8]) - 10) < 1e-12 },
  { name: "Prüffälle konsistent", ok: () => pruefFaelle.every(p => { if (p.soll.b !== undefined) return Math.abs(bildweiteIdeal(p.f, p.g) - p.soll.b) < 1e-9; if (p.soll.keinBild) return Number.isNaN(bildweiteIdeal(p.f, p.g)); return Math.abs(fAusPaar(p.g, bildweiteIdeal(p.f, p.g)) - p.soll.fZurueck) < 1e-9; }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    linse: LINSEN[0],
    linsePos: 30,      // cm (wahr, Sliderwert)
    schirmPos: 60,     // cm (wahr, geklemmt)
    messungen: [],     // { g, b, gWahr, bWahr } — g/b wie abgelesen und eingetragen
    fEingaben: [],     // je Auswertungszeile: { text, wert, ok }
    phase: "aufbau"
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], id => {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  });

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = `
    <div class="exp-links">
      <canvas id="exp-canvas" width="360" height="640" aria-label="Versuchsaufbau: optische Bank mit Zentimeterskala von 0 bis 120, leuchtender Pfeil bei 0, verschiebbare Linse und verschiebbarer Schirm. Darunter der Blick auf den Schirm mit Schärfe-Balken sowie zwei Lupen-Ausschnitte der Skala mit den Zeigern von Linse und Schirm."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");
  const bx = cm => 16 + cm * (328 / BANK_CM); // Bank-Überblick: cm → Pixel

  // ---------- Zeichnung ----------
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cBg = farbe("--bg");
    const f = zustand.linse.f;
    const bIdeal = bildweiteIdeal(f, zustand.linsePos);
    const schaerfe = schaerfeBei(f, zustand.linsePos, zustand.schirmPos);
    const aL = anzeigeWert("linse", zustand.linsePos);
    const aS = anzeigeWert("schirm", zustand.schirmPos);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    function rundRect(x, y, w, h, r) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    }
    // umgekehrter (kopfstehender) Bild-Pfeil auf dem Schirm
    function pfeilBild(cx, cy, hoehe, alpha) {
      const kopf = Math.max(6, Math.min(13, hoehe * 0.35));
      ctx.save(); ctx.globalAlpha = alpha;
      ctx.strokeStyle = cAkzent; ctx.fillStyle = cAkzent;
      ctx.lineWidth = Math.max(2.5, Math.min(4, hoehe * 0.12));
      ctx.beginPath(); ctx.moveTo(cx, cy - hoehe / 2); ctx.lineTo(cx, cy + hoehe / 2 - kopf); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy + hoehe / 2);
      ctx.lineTo(cx - kopf * 0.65, cy + hoehe / 2 - kopf);
      ctx.lineTo(cx + kopf * 0.65, cy + hoehe / 2 - kopf);
      ctx.closePath(); ctx.fill();
      ctx.restore();
    }

    // --- Optische Bank (Überblick) ---
    ctx.fillStyle = cLeise; ctx.fillText("Optische Bank — Skala in cm", 14, 16);
    ctx.fillRect(12, 114, 336, 7); // Schiene
    ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
    for (let cm = 0; cm <= BANK_CM; cm += 5) {
      const x = bx(cm), lang = cm % 20 === 0 ? 12 : cm % 10 === 0 ? 9 : 6;
      ctx.strokeStyle = cm % 20 === 0 ? cText : cLeise; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, 121); ctx.lineTo(x, 121 + lang); ctx.stroke();
      if (cm % 20 === 0) { ctx.fillStyle = cText; ctx.fillText(String(cm), x, 144); }
    }
    // LED-Pfeil (Objekt) fest bei 0 cm — mit Leucht-Schein
    const ox = bx(0);
    ctx.globalAlpha = 0.15; ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.arc(ox, 76, 13, 0, 7); ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(ox, 114); ctx.lineTo(ox, 96); ctx.stroke(); // Halter
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ox, 96); ctx.lineTo(ox, 68); ctx.stroke();
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.moveTo(ox, 58); ctx.lineTo(ox - 5, 68); ctx.lineTo(ox + 5, 68); ctx.closePath(); ctx.fill();
    // Linse im Reiter
    const lx = bx(zustand.linsePos);
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(lx, 114); ctx.lineTo(lx, 98); ctx.stroke();
    ctx.fillStyle = cBg;
    ctx.beginPath(); ctx.ellipse(lx, 72, 8, 28, 0, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText(zustand.linse.id, lx, 36);
    // Schirm (weiße Karte, von der Seite)
    const sx = bx(zustand.schirmPos);
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(sx, 114); ctx.lineTo(sx, 98); ctx.stroke();
    ctx.fillStyle = cBg; ctx.fillRect(sx - 2.5, 42, 5, 56); ctx.strokeRect(sx - 2.5, 42, 5, 56);
    // Zeiger-Marken der Reiter (mit Streuung — wie auf der Lupe)
    ctx.fillStyle = cAkzent;
    for (const cm of [aL, aS]) {
      const x = bx(cm);
      ctx.beginPath(); ctx.moveTo(x, 112); ctx.lineTo(x - 5, 103); ctx.lineTo(x + 5, 103); ctx.closePath(); ctx.fill();
    }

    // --- Blick auf den Schirm ---
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Blick auf den Schirm", 14, 172);
    rundRect(80, 180, 200, 122, 8);
    ctx.fillStyle = cBg; ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.stroke();
    ctx.save();
    rundRect(80, 180, 200, 122, 8); ctx.clip();
    if (Number.isFinite(bIdeal)) {
      const m = bIdeal / zustand.linsePos;                       // Abbildungsmaßstab
      const hPx = Math.max(8, Math.min(100, 2 * m * 16));        // Pfeil ist 2 cm hoch
      const delta = zustand.schirmPos - (zustand.linsePos + bIdeal);
      const unschaerfe = Math.min(30, Math.abs(delta) * 2.4);    // Blur/Doppelkanten in px
      if (unschaerfe < 0.7) {
        pfeilBild(180, 241, hPx, 1);
      } else {
        for (let i = 0; i < 8; i++) {
          const wnk = (i / 8) * Math.PI * 2;
          pfeilBild(180 + Math.cos(wnk) * unschaerfe, 241 + Math.sin(wnk) * unschaerfe * 0.8, hPx, 0.13);
        }
        pfeilBild(180, 241, hPx, 0.3);
      }
    } else {
      // kein reelles Bild: der Schirm ist nur gleichmäßig schwach beleuchtet
      ctx.globalAlpha = 0.07; ctx.fillStyle = cAkzent;
      for (const r of [70, 46, 24]) { ctx.beginPath(); ctx.arc(180, 241, r, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    ctx.restore();

    // --- Schärfe-Balken 0–100 % ---
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Schärfe", 14, 332);
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5; ctx.strokeRect(80, 320, 200, 14);
    ctx.fillStyle = cAkzent; ctx.fillRect(81, 321, 198 * schaerfe / 100, 12);
    ctx.fillStyle = cText; ctx.fillText(Math.round(schaerfe) + " %", 290, 332);

    // --- Lupen: Skala an Linse und Schirm, millimetergenau ablesbar ---
    function zeichneLupe(yTop, titel, wert) {
      ctx.fillStyle = cBg; ctx.fillRect(12, yTop, 336, 132);
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.strokeRect(12, yTop, 336, 132);
      ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
      ctx.fillText(titel, 20, yTop + 20);
      const von = wert - 3.5, y0 = yTop + 92, proCm = 320 / 7;
      const xOf = cm => 20 + (cm - von) * proCm;
      ctx.save();
      ctx.beginPath(); ctx.rect(14, yTop + 24, 332, 106); ctx.clip();
      ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(16, y0); ctx.lineTo(344, y0); ctx.stroke();
      ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
      const iVon = Math.ceil(von * 10), iBis = Math.floor((wert + 3.5) * 10);
      for (let i = iVon; i <= iBis; i++) {
        const cm = i / 10;
        if (cm < 0 || cm > BANK_CM + 1e-9) continue;
        const x = xOf(cm), lang = i % 10 === 0 ? 16 : i % 5 === 0 ? 11 : 6;
        ctx.strokeStyle = i % 10 === 0 ? cText : cLeise;
        ctx.lineWidth = i % 10 === 0 ? 1.6 : 1;
        ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 - lang); ctx.stroke();
        if (i % 10 === 0) { ctx.fillStyle = cText; ctx.fillText(String(Math.round(cm)), x, y0 + 18); }
      }
      const zx = xOf(wert);
      ctx.strokeStyle = cAkzent; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(zx, yTop + 32); ctx.lineTo(zx, y0 - 12); ctx.stroke();
      ctx.fillStyle = cAkzent;
      ctx.beginPath(); ctx.moveTo(zx, y0 - 1); ctx.lineTo(zx - 5, y0 - 12); ctx.lineTo(zx + 5, y0 - 12); ctx.closePath(); ctx.fill();
      ctx.restore();
      ctx.textAlign = "start";
    }
    zeichneLupe(348, "Lupe: Zeiger der Linse (cm)", aL);
    zeichneLupe(496, "Lupe: Zeiger des Schirms (cm)", aS);
  }

  // ---------- Live-Status (Schärfe, kein Bild, Bank-Ende) ----------
  function statusAktualisieren() {
    const el = panel.querySelector("#exp-status");
    if (!el) return;
    const f = zustand.linse.f;
    const b = bildweiteIdeal(f, zustand.linsePos);
    if (!Number.isFinite(b)) {
      el.textContent = "Kein Bild auf dem Schirm möglich — warum? Der Pfeil steht zu nah an der Linse (g ≤ f). So benutzt man eine Sammellinse als Lupe! Schiebe die Linse weiter nach rechts.";
      return;
    }
    if (zustand.linsePos + b > BANK_CM) {
      el.textContent = "Das scharfe Bild läge hinter dem Ende der Bank. Schiebe die Linse weiter nach rechts — dann rückt das Bild näher an die Linse.";
      return;
    }
    const s = schaerfeBei(f, zustand.linsePos, zustand.schirmPos);
    let text = "Schärfe: " + Math.round(s) + " %";
    if (s >= 95) text += " — richtig scharf! Übrigens: Das Bild steht auf dem Kopf.";
    else if (s >= SCHAERFE_MINDEST) text += " — schon gut, ein Tick geht vielleicht noch.";
    else text += " — noch unscharf: Schirm verschieben.";
    el.textContent = text;
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf der <strong>optischen Bank</strong> mit cm-Skala (0 bis 120) stehen drei Geräte: Links bei <strong>0 cm</strong> leuchtet ein Pfeil (LED-Objekt) — er bleibt fest. Die <strong>Sammellinse</strong> und der weiße <strong>Schirm</strong> stecken in Reitern und lassen sich verschieben.</p>
      <p><strong>Plan:</strong> Stell die Linse irgendwo hin und verschiebe dann den Schirm, bis der Pfeil <em>richtig scharf</em> auf dem Schirm erscheint. Jetzt ablesen: Die <strong>Gegenstandsweite g</strong> ist der Zeigerwert der Linse (der Pfeil steht ja bei 0). Die <strong>Bildweite b</strong> ist Zeiger des Schirms <em>minus</em> Zeiger der Linse. Das machst du für mindestens ${MIN_MESSUNGEN} verschiedene Linsen-Positionen — in der Auswertung wird daraus die <strong>Brennweite f</strong>.</p>
      <p class="exp-hinweis">Unter dem Aufbau zeigen dir zwei <strong>Lupen</strong> die Skala an Linse und Schirm vergrößert — dort liest du auf Millimeter genau ab.</p>
      <label for="exp-linsenwahl"><strong>Linse wählen:</strong></label>
      <select id="exp-linsenwahl" class="exp-wahl">${LINSEN.map((l, i) => `<option value="${i}">${esc(l.name)}${l.geheim ? " — ohne Aufdruck (f geheim)" : ` — Aufdruck „f = ${komma(l.f, 1)} cm“`}</option>`).join("")}</select>
      <p>Tipp: Starte mit Linse A und prüfe, ob deine Messung den Aufdruck bestätigt. Linse X ist die eigentliche Aufgabe — ihre Brennweite steht nirgends drauf.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    const wahl = panel.querySelector("#exp-linsenwahl");
    wahl.value = String(LINSEN.indexOf(zustand.linse));
    wahl.addEventListener("change", () => {
      zustand.linse = LINSEN[Number(wahl.value)];
      zustand.messungen = []; zustand.fEingaben = [];
      zeichne();
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen() {
    const l = zustand.linse;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <p>Eingebaut: <strong>${esc(l.name)}</strong>${l.geheim ? " — ohne Aufdruck (Brennweite unbekannt!)" : ` — Aufdruck: f = ${komma(l.f, 1)} cm`}</p>
      <div class="exp-regler">
        <label for="exp-linse">Linse verschieben (${LINSE_MIN}–${LINSE_MAX} cm)</label>
        <input type="range" id="exp-linse" min="${LINSE_MIN}" max="${LINSE_MAX}" step="0.5" value="${zustand.linsePos}">
        <label for="exp-schirm">Schirm verschieben, bis das Bild scharf ist</label>
        <input type="range" id="exp-schirm" min="${zustand.linsePos + SCHIRM_MIN_ABSTAND}" max="${BANK_CM}" step="0.5" value="${zustand.schirmPos}">
      </div>
      <p id="exp-status" class="exp-meldung" aria-live="polite"></p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-g">g in cm:</label>
        <input id="exp-g" class="exp-eingabe" inputmode="decimal" autocomplete="off">
        <label for="exp-b">b in cm:</label>
        <input id="exp-b" class="exp-eingabe" inputmode="decimal" autocomplete="off">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p class="exp-hinweis">Ablesen mit den Lupen unter dem Aufbau: <strong>g</strong> = Zeiger der Linse (der Pfeil steht bei 0). <strong>b</strong> = Zeiger des Schirms <em>minus</em> Zeiger der Linse.</p>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>Nr.</th><th>g in cm</th><th>b in cm</th></tr></thead>
      <tbody>${zustand.messungen.map((z, i) => `<tr><td>${i + 1}</td><td>${komma(z.g, 1)}</td><td>${komma(z.b, 1)}</td></tr>`).join("") || '<tr><td colspan="3">noch leer</td></tr>'}</tbody></table>
      <p>${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen — jedes Mal mit einer anderen Linsen-Position.</p>
      <button class="knopf" id="exp-weiter2" ${zustand.messungen.length >= MIN_MESSUNGEN ? "" : "disabled"}>Zur Auswertung</button>`;
    const linseR = panel.querySelector("#exp-linse");
    const schirmR = panel.querySelector("#exp-schirm");
    linseR.addEventListener("input", () => {
      zustand.linsePos = Number(linseR.value);
      zustand.schirmPos = klemmeSchirm(zustand.linsePos, zustand.schirmPos);
      schirmR.min = String(zustand.linsePos + SCHIRM_MIN_ABSTAND);
      schirmR.value = String(zustand.schirmPos);
      zeichne(); statusAktualisieren();
    });
    schirmR.addEventListener("input", () => {
      zustand.schirmPos = klemmeSchirm(zustand.linsePos, Number(schirmR.value));
      schirmR.value = String(zustand.schirmPos);
      zeichne(); statusAktualisieren();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const gE = parseDezimal(panel.querySelector("#exp-g").value);
      const bE = parseDezimal(panel.querySelector("#exp-b").value);
      const aL = anzeigeWert("linse", zustand.linsePos);
      const aS = anzeigeWert("schirm", zustand.schirmPos);
      const bId = bildweiteIdeal(zustand.linse.f, zustand.linsePos);
      if (!Number.isFinite(bId) || zustand.linsePos + bId > BANK_CM) {
        meldung.textContent = "✗ In dieser Stellung entsteht kein scharfes Bild auf dem Schirm — lies den Hinweis über dem Formular und verschiebe erst die Linse.";
        return;
      }
      if (schaerfeBei(zustand.linse.f, zustand.linsePos, zustand.schirmPos) < SCHAERFE_MINDEST) {
        meldung.textContent = `✗ Erst scharfstellen! Verschiebe den Schirm, bis die Schärfe mindestens ${SCHAERFE_MINDEST} % erreicht.`;
        return;
      }
      if (istDoppelG(zustand.messungen.map(z => ({ g: z.gWahr })), zustand.linsePos)) {
        meldung.textContent = "✗ Mit dieser Linsen-Position hast du schon gemessen — schiebe die Linse ein deutliches Stück weiter.";
        return;
      }
      if (!ablesungOk(gE, aL, ABLESE_TOLERANZ_CM)) {
        meldung.textContent = "✗ Prüfe g: Schau in die Linsen-Lupe — wo genau steht der Zeiger? (Auf Millimeter genau ablesen.)";
        return;
      }
      if (!ablesungOk(bE, aS - aL, ABLESE_TOLERANZ_CM)) {
        meldung.textContent = "✗ Prüfe b: Zeiger des Schirms minus Zeiger der Linse — rechne noch einmal nach.";
        return;
      }
      zustand.messungen.push({ g: gE, b: bE, gWahr: zustand.linsePos, bWahr: zustand.schirmPos - zustand.linsePos });
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = `✓ Eingetragen — Messung ${zustand.messungen.length}.`;
      statusAktualisieren();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    statusAktualisieren();
  }

  function panelAuswerten() {
    const zeilen = zustand.messungen;
    if (!zeilen.length) {
      panel.innerHTML = `<h2>Auswertung</h2>
        <p>Noch keine Messwerte — geh zuerst zur Durchführung und miss mindestens ${MIN_MESSUNGEN} Paare aus g und b.</p>
        <button class="knopf" id="exp-zurueck0">Zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const gleichGross = zeilen.find(z => Math.abs(z.g - z.b) <= 1);
    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p class="exp-hinweis">Werkzeug: die <strong>Linsenformel</strong> 1/f = 1/g + 1/b. Für dich schon umgestellt:<br>
      <strong>f = (g · b) : (g + b)</strong> — also „g mal b, geteilt durch g plus b“.<br>
      <small>Woher die Formel kommt, lernst du später im Gymnasialzweig genauer — hier benutzt du sie einfach als Rechenrezept.</small></p>
      <p>Rechne f für jede Zeile aus (eine Stelle nach dem Komma reicht) und trag dein Ergebnis ein:</p>
      <table class="exp-tabelle"><thead><tr><th>g in cm</th><th>b in cm</th><th>f in cm (deine Rechnung)</th><th>geprüft</th></tr></thead>
      <tbody>${zeilen.map((z, i) => `<tr><td>${komma(z.g, 1)}</td><td>${komma(z.b, 1)}</td>
        <td><input class="exp-eingabe" data-zeile="${i}" inputmode="decimal" autocomplete="off" value="${zustand.fEingaben[i] ? esc(zustand.fEingaben[i].text) : ""}" aria-label="f für Zeile ${i + 1} in cm"></td>
        <td id="exp-fst-${i}">${zustand.fEingaben[i] && zustand.fEingaben[i].ok ? "✓" : "—"}</td></tr>`).join("")}</tbody></table>
      <div id="exp-ergebnis" aria-live="polite"></div>
      <details class="exp-fehler"><summary>Bonus-Beobachtung: g = 2 · f</summary>
        <p>Stell die Linse so, dass die Gegenstandsweite <strong>doppelt so groß wie die Brennweite</strong> ist (bei Linse A also g = 20 cm). Dann wird auch <strong>b = 2 · f</strong> — und das Bild auf dem Schirm ist <strong>genauso groß</strong> wie der leuchtende Pfeil. Probiere es in der Durchführung aus!</p>
        ${gleichGross ? `<p>In deiner Tabelle steckt schon so ein Paar: g ≈ ${komma(gleichGross.g, 1)} cm und b ≈ ${komma(gleichGross.b, 1)} cm sind fast gleich. Dann gilt f ≈ g : 2 ≈ ${komma(gleichGross.g / 2, 1)} cm — vergleiche mit deinem Mittelwert!</p>` : ""}
      </details>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum schwanken deine f-Werte?</summary>
        <p>„Scharf“ ist Ansichtssache: Nahe der besten Schirm-Position sieht das Bild über mehrere Millimeter fast gleich scharf aus — die Schärfe-Beurteilung ist <em>subjektiv</em>. Und wer schräg auf Skala und Zeiger schaut, liest etwas daneben ab (<em>Parallaxe</em>). Beides verschiebt g und b um kleine Beträge.</p>
        <p>Dagegen hilft genau das, was du getan hast: <strong>mehrere</strong> Paare mit verschiedenen g messen und den <strong>Mittelwert</strong> von f bilden — einzelne Ausreißer fallen dann kaum noch ins Gewicht.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelectorAll("[data-zeile]").forEach(eingabe => eingabe.addEventListener("change", () => {
      const i = Number(eingabe.dataset.zeile);
      const wert = parseDezimal(eingabe.value);
      const soll = fAusPaar(zeilen[i].g, zeilen[i].b);
      const ok = Number.isFinite(wert) && Math.abs(wert - soll) <= F_TOLERANZ_CM;
      zustand.fEingaben[i] = { text: eingabe.value, wert, ok };
      panel.querySelector("#exp-fst-" + i).textContent = ok ? "✓" : "✗ rechne nochmal: g · b geteilt durch (g + b)";
      ergebnisAktualisieren();
    }));
    panel.querySelector("#exp-csv").addEventListener("click", () =>
      csvHerunterladen("brennweite-messwerte.csv", ["g in cm", "b in cm", "f in cm"],
        zeilen.map(z => [z.g, z.b, fAusPaar(z.g, z.b)])));
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.fEingaben = [];
      zustand.linsePos = 30; zustand.schirmPos = 60;
      zeichne(); wechslePhase("aufbau");
    });
    ergebnisAktualisieren();
  }

  function ergebnisAktualisieren() {
    const ziel = panel.querySelector("#exp-ergebnis");
    if (!ziel) return;
    const zeilen = zustand.messungen;
    const fertig = zeilen.map((z, i) => zustand.fEingaben[i]).filter(e => e && e.ok);
    if (fertig.length < zeilen.length) {
      ziel.innerHTML = `<p>${fertig.length} von ${zeilen.length} Zeilen berechnet und geprüft — weiter so!</p>`;
      return;
    }
    const fMittelwert = mittel(fertig.map(e => e.wert));
    const l = zustand.linse;
    const bew = bewertungF(fMittelwert, l.f);
    if (l.geheim) {
      ziel.innerHTML = `<p><strong>Mittelwert: f ≈ ${komma(fMittelwert, 1)} cm.</strong> Das ist deine Bestimmung der geheimen Brennweite von Linse X! Bewertung (ohne den wahren Wert zu verraten): <strong>${bew.stufe}</strong>${bew.stufe === "sehr gut" ? " — du liegst näher als 0,4 cm dran!" : bew.stufe === "gut" ? " — näher als 0,8 cm dran." : " — mehr als 0,8 cm daneben: Miss noch ein paar Paare und achte genau aufs Scharfstellen."}</p>`;
    } else {
      ziel.innerHTML = `<p><strong>Mittelwert: f ≈ ${komma(fMittelwert, 1)} cm.</strong> Aufdruck: f = ${komma(l.f, 1)} cm — Abweichung ${komma(bew.abw, 1)} cm: <strong>${bew.stufe}</strong>.</p>`;
    }
  }

  zeichne();
  wechslePhase("aufbau");
}
