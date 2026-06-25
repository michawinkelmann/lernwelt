// experiment.js — Interaktives Experiment: thermische Längenausdehnung
// ΔL = α · L0 · ΔT (Klasse 10, Thermodynamik). Realitätsnahe Messpraxis: ein
// fest eingespannter Metallstab (Länge L0) wird erwärmt; eine MESSUHR
// (Feinzeiger, 0,01 mm) tastet das freie Ende ab. Der Lernende stellt verschiedene
// Temperaturdifferenzen ΔT ein, liest die Längenzunahme ΔL SELBST an der Messuhr ab
// und trägt sie ein. In der Auswertung entdeckt er ΔL ∝ ΔT und bestimmt aus der
// Steigung α·L0 (und daraus den Längenausdehnungskoeffizienten α). Die kleine
// Ablese-Streuung ist deterministisch geseedet (testbar). Modulebene DOM-frei;
// Browser-Teil in starteExperiment().

import {
  streuung, parseDezimal, komma, mittel, regression, esc, ablesungOk,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
export const L0_MM = 600;             // mm — Ausgangslänge des Stabes bei T0
export const ALPHA = 23.8e-6;         // 1/K — Längenausdehnungskoeffizient (Aluminium)
export const T0 = 20;                 // °C — Anfangstemperatur (ΔT = 0)
export const T_MAX = 120;             // °C — Heizung bis hierher (ΔT bis 100 K)
export const T_SCHRITT = 5;           // °C — Schrittweite des Heizreglers
export const MESSUHR_BEREICH = 2.0;   // mm — Skalenumfang der Messuhr (eine Umdrehung)
export const VORGABE_DT = [20, 40, 60, 80, 100]; // K — empfohlene Temperaturdifferenzen
export const TOLERANZ_DL = 0.04;      // mm — Eintrag der Messuhr-Ablesung
export const MIN_MESSUNGEN = 4;       // verschiedene ΔT vor der Auswertung

// das Produkt α·L0 (Steigung der ΔL-ΔT-Geraden), in mm/K
export const STEIGUNG_SOLL = ALPHA * L0_MM;   // = 0,01428 mm/K

// ---------- Physik (rein, Node-testbar) ----------
// wahre Längenzunahme bei Temperaturdifferenz dT (in K)
export function dLWahr(dT) {
  return ALPHA * L0_MM * dT;            // mm
}
// an der Messuhr abgelesene (gestreute) Längenzunahme: ±0,015 mm Tast-/Ablesefehler
export function dLAngezeigt(dT) {
  if (dT === 0) return 0;
  return dLWahr(dT) + streuung("messuhr:" + dT, 0.03);
}

// ---------- Auswertelogik (rein) ----------
export function dLEintragOk(eingabe, wahr) {
  return ablesungOk(eingabe, wahr, TOLERANZ_DL);
}
// Steigung α·L0 aus zwei (ΔT, ΔL)-Punkten
export function steigungAus(dT1, dL1, dT2, dL2) {
  if (dT2 === dT1) return NaN;
  return (dL2 - dL1) / (dT2 - dT1);
}
// daraus α zurückrechnen
export function alphaAus(steigung) {
  return steigung / L0_MM;              // 1/K
}
export function anzahlDT(messungen) {
  return new Set(messungen.map(m => m.dT)).size;
}
export function bereitFuerAuswertung(messungen) {
  return anzahlDT(messungen) >= MIN_MESSUNGEN;
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "ΔL bei ΔT=0 ist 0; bei ΔT=100 K ist α·L0·100 = 1,428 mm", ok: () =>
      dLWahr(0) === 0 &&
      Math.abs(dLWahr(100) - 1.428) < 1e-9 &&
      Math.abs(dLWahr(50) - 0.714) < 1e-9 },
  { name: "Unabhängige Nachrechnung ΔL = α·L0·ΔT für alle Vorgabe-ΔT", ok: () => {
      const alpha = 23.8e-6, L0 = 600;
      return VORGABE_DT.every(dT => Math.abs(dLWahr(dT) - alpha * L0 * dT) < 1e-12);
    } },
  { name: "Proportionalität: doppeltes ΔT -> doppeltes ΔL", ok: () =>
      Math.abs(dLWahr(80) - 2 * dLWahr(40)) < 1e-12 &&
      Math.abs(dLWahr(100) - 5 * dLWahr(20)) < 1e-12 },
  { name: "Quotient ΔL/ΔT = α·L0 konstant (= Steigung)", ok: () =>
      [20, 35, 60, 100].every(dT => Math.abs(dLWahr(dT) / dT - STEIGUNG_SOLL) < 1e-12) &&
      Math.abs(STEIGUNG_SOLL - 0.01428) < 1e-9 },
  { name: "Steigung aus zwei idealen Punkten = α·L0; α korrekt zurückgerechnet", ok: () => {
      const s = steigungAus(20, dLWahr(20), 80, dLWahr(80));
      return Math.abs(s - STEIGUNG_SOLL) < 1e-12 && Math.abs(alphaAus(s) - ALPHA) < 1e-15;
    } },
  { name: "Anzeige-Streuung höchstens ±0,015 mm, deterministisch", ok: () => {
      for (const dT of VORGABE_DT) {
        if (Math.abs(dLAngezeigt(dT) - dLWahr(dT)) > 0.015 + 1e-12) return false;
        if (dLAngezeigt(dT) !== dLAngezeigt(dT)) return false;
      }
      return dLAngezeigt(0) === 0;
    } },
  { name: "Regression durch gestreute Punkte: Steigung <3 % daneben, b nahe 0", ok: () => {
      const pkte = VORGABE_DT.map(dT => ({ x: dT, y: dLAngezeigt(dT) }));
      const r = regression(pkte);
      return Math.abs(r.m - STEIGUNG_SOLL) / STEIGUNG_SOLL < 0.03 && Math.abs(r.b) < 0.05;
    } },
  { name: "Eintrag-Toleranz ΔL ±0,04 mm; Auswertungs-Schwelle 4 ΔT", ok: () =>
      dLEintragOk(0.72, 0.714) && !dLEintragOk(0.80, 0.714) && !dLEintragOk(NaN, 0.714) &&
      anzahlDT([{ dT: 20 }, { dT: 40 }, { dT: 60 }]) === 3 &&
      !bereitFuerAuswertung([{ dT: 20 }, { dT: 40 }, { dT: 60 }]) &&
      bereitFuerAuswertung([{ dT: 20 }, { dT: 40 }, { dT: 60 }, { dT: 80 }]) },
  { name: "Streuband: jedes gestreute ΔL weicht <0,02 mm vom idealen Wert ab", ok: () =>
      VORGABE_DT.every(dT => Math.abs(dLAngezeigt(dT) - dLWahr(dT)) < 0.02) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  reduzierteBewegung();

  const zustand = {
    phase: "aufbau",
    T: T0,                 // eingestellte Temperatur in °C (ΔT = T - T0)
    messungen: [],         // { dT, dL, dLWahr }
    vorhersage: ""
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML =
    '<div class="exp-links">' +
    '<canvas id="exp-canvas" width="400" height="500" aria-label="Versuchsaufbau: ein waagerechter Metallstab ist links fest eingespannt und wird von einem Brenner erwärmt; sein freies rechtes Ende drückt gegen den Taststift einer Messuhr mit runder Skala in Hundertstel-Millimetern. Daneben ein Thermometer mit der aktuellen Stabtemperatur und der großgeschriebene Messuhr-Wert in Millimetern."></canvas>' +
    '</div>' +
    '<div class="exp-rechts" id="exp-panel"></div>';
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const dTHier = () => zustand.T - T0;
  const dLHier = () => dLAngezeigt(dTHier());

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"),
          cFlaeche = farbe("--flaeche"), cHauch = farbe("--hauch", "#eee"), cFehler = farbe("--fehler", "#b3332a");
    function rrect(x, y, b, hh, rad) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, b, hh, rad); else ctx.rect(x, y, b, hh);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";
    const dT = dTHier(), dL = dLHier();
    const heiss = dT > 0;
    const yStab = 110;

    // --- feste Einspannung (links) ---
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(24, yStab - 26, 26, 52); ctx.strokeRect(24, yStab - 26, 26, 52);
    // Schraffur der Wand
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    for (let y = yStab - 24; y < yStab + 26; y += 8) {
      ctx.beginPath(); ctx.moveTo(24, y); ctx.lineTo(18, y + 6); ctx.stroke();
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("fest eingespannt", 14, yStab - 36);

    // --- Metallstab (Länge optisch konstant; Ausdehnung ist mikroskopisch) ---
    const stabX = 50, stabLen = 184, stabH = 14;
    // Stab leicht eingefärbt nach Temperatur
    const gluehen = Math.min(0.5, dT / 200);
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(stabX, yStab - stabH / 2, stabLen, stabH); ctx.strokeRect(stabX, yStab - stabH / 2, stabLen, stabH);
    if (heiss) {
      ctx.globalAlpha = gluehen; ctx.fillStyle = cFehler;
      ctx.fillRect(stabX, yStab - stabH / 2, stabLen, stabH); ctx.globalAlpha = 1;
    }
    ctx.fillStyle = cText; ctx.textAlign = "center"; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Metallstab  L0 = " + L0_MM + " mm", stabX + stabLen / 2, yStab - 18);

    // --- Brenner unter dem Stab ---
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    const bx = stabX + stabLen / 2;
    if (heiss) {
      // Flammen
      ctx.fillStyle = cFehler; ctx.globalAlpha = 0.8;
      for (const dx of [-16, 0, 16]) {
        ctx.beginPath();
        ctx.moveTo(bx + dx - 6, yStab + 40);
        ctx.quadraticCurveTo(bx + dx, yStab + 14, bx + dx + 6, yStab + 40);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = cText; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(bx - 22, yStab + 40, 44, 10); ctx.strokeRect(bx - 22, yStab + 40, 44, 10);
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif";
    ctx.fillText(heiss ? "Brenner (heizt)" : "Brenner (aus)", bx, yStab + 64);

    // --- freies Ende + Taststift der Messuhr ---
    const endeX = stabX + stabLen;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(endeX, yStab - 22); ctx.lineTo(endeX, yStab + 22); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("freies Ende →", endeX - 2, yStab + 22 + 12);
    // Taststift
    ctx.strokeStyle = cText; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(endeX + 2, yStab); ctx.lineTo(endeX + 36, yStab); ctx.stroke();

    // --- Messuhr (runde Skala) ---
    const cx = endeX + 84, cy = yStab, rad = 50;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill(); ctx.stroke();
    // Skala: 0..MESSUHR_BEREICH mm über volle 360°, 0 oben
    ctx.font = "9px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (let k = 0; k <= 20; k++) {
      const mm = k * 0.1;
      const ang = -Math.PI / 2 + (mm / MESSUHR_BEREICH) * 2 * Math.PI;
      const gross = k % 5 === 0;
      const r1 = rad - (gross ? 11 : 6), r2 = rad - 2;
      ctx.strokeStyle = gross ? cText : cLeise; ctx.lineWidth = gross ? 1.6 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2); ctx.stroke();
      if (gross) {
        ctx.fillStyle = cText;
        ctx.fillText(komma(mm, 1), cx + Math.cos(ang) * (rad - 17), cy + Math.sin(ang) * (rad - 17));
      }
    }
    // Zeiger (eine Umdrehung = MESSUHR_BEREICH mm)
    const az = -Math.PI / 2 + (Math.min(dL, MESSUHR_BEREICH) / MESSUHR_BEREICH) * 2 * Math.PI;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(az) * (rad - 12), cy + Math.sin(az) * (rad - 12)); ctx.stroke();
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(cx, cy, 4, 0, 7); ctx.fill();
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cText; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Messuhr (mm)", cx, cy + rad + 16);
    ctx.fillStyle = cLeise; ctx.font = "9px system-ui, sans-serif";
    ctx.fillText("Teilstrich = 0,01 mm", cx, cy + rad + 29);

    // --- Thermometer (links unten) ---
    const Tm = { x: 30, y: 230, b: 150, h: 70 };
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    rrect(Tm.x, Tm.y, Tm.b, Tm.h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Stabtemperatur", Tm.x + 12, Tm.y + 20);
    ctx.fillStyle = cText; ctx.font = "bold 22px ui-monospace, Consolas, monospace"; ctx.textAlign = "center";
    ctx.fillText(zustand.T + " °C", Tm.x + Tm.b / 2, Tm.y + 48);

    // --- ΔT-Anzeige ---
    const dTm = { x: 200, y: 230, b: 170, h: 70 };
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    rrect(dTm.x, dTm.y, dTm.b, dTm.h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Temperaturdifferenz ΔT", dTm.x + 10, dTm.y + 20);
    ctx.fillStyle = cAkzent; ctx.font = "bold 22px ui-monospace, Consolas, monospace"; ctx.textAlign = "center";
    ctx.fillText(dT + " K", dTm.x + dTm.b / 2, dTm.y + 48);

    // --- großer ΔL-Klartext (Messuhr-Ablesung als Zahl) ---
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Messuhr zeigt eine Längenzunahme von:", 30, 360);
    ctx.fillStyle = cAkzent; ctx.font = "bold 30px ui-monospace, Consolas, monospace";
    ctx.fillText(komma(dL, 2) + " mm", 30, 400);
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("(lies selbst an der runden Skala ab — Teilstrich = 0,01 mm pro 0,1-Sprung)", 30, 422);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Hinweis: Die Ausdehnung ist winzig — sichtbar nur am Feinzeiger, nicht am Stab.", 30, 446);
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML =
      '<h2>Aufbau und Geräte</h2>' +
      '<p>Ein <strong>Metallstab</strong> der Länge L₀ = ' + L0_MM + ' mm ist links <strong>fest eingespannt</strong>. Ein <strong>Brenner</strong> erwärmt ihn; sein freies rechtes Ende drückt gegen den Taststift einer <strong>Messuhr</strong>, die kleinste Längenänderungen auf <strong>0,01 mm</strong> genau anzeigt. Ein <strong>Thermometer</strong> misst die Stabtemperatur.</p>' +
      '<p><strong>Plan:</strong> Heize den Stab auf verschiedene Temperaturen, bestimme jeweils die Temperaturdifferenz ΔT = T − T₀ und lies die <strong>Längenzunahme ΔL</strong> <strong>selbst</strong> an der Messuhr ab. Trag beides ein und untersuche den Zusammenhang zwischen ΔL und ΔT.</p>' +
      '<p class="exp-hinweis">Die Ausdehnung ist winzig: Bei 100 K Erwärmung wird ein 60-cm-Stab nur gut einen Millimeter länger. Deshalb misst man mit der empfindlichen Messuhr, nicht mit dem Lineal.</p>' +
      '<label for="exp-vorhersage"><strong>Deine Vorhersage:</strong> Wie hängt die Längenzunahme ΔL von der Temperaturdifferenz ΔT ab?</label>' +
      '<select id="exp-vorhersage" class="exp-wahl">' +
      '<option value="">— bitte wählen —</option>' +
      '<option value="prop"' + (zustand.vorhersage === "prop" ? " selected" : "") + '>Doppelte Erwärmung → doppelte Längenzunahme (proportional).</option>' +
      '<option value="quad"' + (zustand.vorhersage === "quad" ? " selected" : "") + '>ΔL wächst viel schneller als ΔT (z. B. quadratisch).</option>' +
      '<option value="konstant"' + (zustand.vorhersage === "konstant" ? " selected" : "") + '>ΔL ist immer gleich groß, egal wie stark man erwärmt.</option>' +
      '</select>' +
      '<p id="exp-vorhersage-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>';
    panel.querySelector("#exp-vorhersage").addEventListener("change", ev => {
      zustand.vorhersage = ev.target.value;
      panel.querySelector("#exp-vorhersage-meldung").textContent =
        ev.target.value ? "Notiert — am Ende prüfst du das an deinen Messwerten." : "";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen(meldung = "") {
    const dT = dTHier();
    const schonGemessen = zustand.messungen.some(m => m.dT === dT);
    const istNull = dT === 0;
    const offenesDT = VORGABE_DT.find(d => !zustand.messungen.some(m => m.dT === d));
    panel.innerHTML =
      '<h2>Durchführung</h2>' +
      '<div class="exp-regler">' +
      '<label for="exp-t">Stab erwärmen — Temperatur: <strong id="exp-twert">' + zustand.T + ' °C</strong> (ΔT = ' + dT + ' K)</label>' +
      '<input type="range" id="exp-t" min="' + T0 + '" max="' + T_MAX + '" step="' + T_SCHRITT + '" value="' + zustand.T + '">' +
      '</div>' +
      '<p class="exp-hinweis">Empfohlene Temperaturdifferenzen: ' + VORGABE_DT.join(", ") + ' K.' + (offenesDT !== undefined ? ' Als Nächstes offen: ΔT = ' + offenesDT + ' K (also ' + (T0 + offenesDT) + ' °C).' : ' Alle empfohlenen Punkte gemessen!') + '</p>' +
      '<form id="exp-eintrag" class="exp-ablesen">' +
      '<label for="exp-dl-eintrag">Lies die Messuhr ab — Längenzunahme ΔL in mm:</label>' +
      '<input id="exp-dl-eintrag" inputmode="decimal" autocomplete="off" size="6" ' + (schonGemessen || istNull ? "disabled" : "") + '>' +
      '<button class="knopf" ' + (schonGemessen || istNull ? "disabled" : "") + '>In die Tabelle</button>' +
      '</form>' +
      (istNull ? '<p class="exp-hinweis">Bei ΔT = 0 (Stab noch kalt) zeigt die Messuhr 0 mm — erwärme erst.</p>'
               : schonGemessen ? '<p class="exp-hinweis">Für dieses ΔT hast du schon gemessen — wähle eine andere Temperatur.</p>' : "") +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(meldung) + '</p>' +
      '<h3>Messtabelle</h3>' +
      '<table class="exp-tabelle"><thead><tr><th>ΔT in K</th><th>ΔL in mm</th></tr></thead>' +
      '<tbody>' + (zustand.messungen.length
        ? [...zustand.messungen].sort((a, b) => a.dT - b.dT).map(m =>
            '<tr><td>' + m.dT + '</td><td>' + komma(m.dL, 2) + '</td></tr>').join("")
        : '<tr><td colspan="2">noch leer</td></tr>') + '</tbody></table>' +
      '<p>Bisher: <strong>' + anzahlDT(zustand.messungen) + '</strong> von mindestens ' + MIN_MESSUNGEN + ' Temperaturdifferenzen.</p>' +
      '<button class="knopf" id="exp-weiter2" ' + (bereitFuerAuswertung(zustand.messungen) ? "" : "disabled") + '>Zur Auswertung</button>';
    panel.querySelector("#exp-t").addEventListener("input", ev => {
      zustand.T = Number(ev.target.value);
      const dTneu = dTHier();
      panel.querySelector("#exp-twert").textContent = zustand.T + " °C";
      zeichne();
      const feld = panel.querySelector("#exp-dl-eintrag");
      const knopf = panel.querySelector("#exp-eintrag button");
      const sperr = dTneu === 0 || zustand.messungen.some(m => m.dT === dTneu);
      feld.disabled = sperr; knopf.disabled = sperr;
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-eintrag").addEventListener("submit", ev => {
      ev.preventDefault();
      const dTjetzt = dTHier();
      if (dTjetzt === 0 || zustand.messungen.some(m => m.dT === dTjetzt)) return;
      const eingabe = parseDezimal(panel.querySelector("#exp-dl-eintrag").value);
      const wahr = dLAngezeigt(dTjetzt);
      const meldungEl = panel.querySelector("#exp-meldung");
      if (!dLEintragOk(eingabe, wahr)) {
        meldungEl.textContent = "✗ Schau genau auf die Messuhr: Der große Zeiger zählt Hundertstel-Millimeter. Der Klartext links hilft beim Kontrollieren — auf 0,01 mm genau eintragen.";
        return;
      }
      zustand.messungen.push({ dT: dTjetzt, dL: eingabe, dLWahr: wahr });
      const offen = VORGABE_DT.find(d => !zustand.messungen.some(m => m.dT === d));
      if (offen !== undefined) zustand.T = T0 + offen;
      zeichne();
      panelMessen("✓ Eingetragen." + (offen !== undefined ? " Weiter mit ΔT = " + offen + " K." : " Alle empfohlenen Werte gemessen!"));
    });
    zeichne();
  }

  function panelAuswerten() {
    if (!bereitFuerAuswertung(zustand.messungen)) {
      panel.innerHTML =
        '<h2>Auswertung</h2>' +
        '<p>Miss mindestens <strong>' + MIN_MESSUNGEN + ' verschiedene Temperaturdifferenzen</strong>.</p>' +
        '<p>Aktuell: ' + anzahlDT(zustand.messungen) + ' Temperaturdifferenzen.</p>' +
        '<button class="knopf" id="exp-zurueck0">Zur Durchführung</button>';
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const zeilen = [...zustand.messungen].sort((a, b) => a.dT - b.dT);
    const quotienten = zeilen.map(m => m.dL / m.dT);
    const reg = regression(zeilen.map(m => ({ x: m.dT, y: m.dL })));
    const steigung = reg.m;
    const alpha = alphaAus(steigung);
    panel.innerHTML =
      '<h2>Auswertung</h2>' +
      '<h3>1 · Quotient ΔL / ΔT bilden</h3>' +
      '<p>Teile in jeder Zeile die Längenzunahme durch die Temperaturdifferenz: <strong>ΔL / ΔT</strong>. Sind die Werte (fast) gleich, ist ΔL <strong>proportional</strong> zu ΔT.</p>' +
      '<table class="exp-tabelle"><thead><tr><th>ΔT in K</th><th>ΔL in mm</th><th>ΔL/ΔT in mm/K</th></tr></thead><tbody>' +
      zeilen.map((m, i) => '<tr><td>' + m.dT + '</td><td>' + komma(m.dL, 2) + '</td><td>' + komma(quotienten[i], 4) + '</td></tr>').join("") +
      '</tbody></table>' +
      '<p>Die Quotienten sind (fast) gleich — <strong>ΔL ∝ ΔT</strong>. Der gemeinsame Wert ist die <strong>Steigung</strong> der ΔL-ΔT-Geraden.</p>' +
      '<h3>2 · Steigung und α bestimmen</h3>' +
      '<p>Die Steigung ist das Produkt <strong>α · L₀</strong>. Aus deinen Messwerten (Ausgleichsgerade durch den Ursprung) ergibt sich:</p>' +
      '<p class="exp-hinweis">Steigung α · L₀ ≈ <strong>' + komma(steigung, 4) + ' mm/K</strong> &nbsp;→&nbsp; α = Steigung / L₀ = ' + komma(steigung, 4) + ' mm/K ÷ ' + L0_MM + ' mm ≈ <strong>' + komma(alpha * 1e6, 1) + ' · 10⁻⁶ 1/K</strong></p>' +
      '<p>Zum Vergleich: Der Tabellenwert für Aluminium liegt bei etwa <strong>23,8 · 10⁻⁶ 1/K</strong>. Stahl hätte rund 12, Kupfer rund 17 · 10⁻⁶ 1/K — der Koeffizient α ist also <em>materialabhängig</em>.</p>' +
      '<h3>3 · Schnell-Check: Erwärmung verdoppeln</h3>' +
      '<p>Vergleiche zwei Zeilen, bei denen ΔT doppelt so groß ist (z. B. 40 K und 80 K): Auf welchen Faktor ändert sich ΔL?</p>' +
      '<form id="exp-faktorform" class="exp-ablesen">' +
      '<label for="exp-faktor">ΔL(2·ΔT) / ΔL(ΔT) ≈</label>' +
      '<input id="exp-faktor" inputmode="decimal" autocomplete="off" size="5">' +
      '<button class="knopf">Prüfen</button>' +
      '</form>' +
      '<p id="exp-faktor-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<h3>4 · Erkenntnisfrage</h3>' +
      '<p><strong>Ein doppelt so langer Stab aus demselben Material — wie verhält sich seine Längenzunahme bei gleichem ΔT?</strong></p>' +
      '<select id="exp-f1" class="exp-wahl" aria-label="Antwort auswählen">' +
      '<option value="">— Antwort wählen —</option>' +
      '<option value="a">Gleich — die Länge spielt keine Rolle.</option>' +
      '<option value="b">Doppelt so groß — ΔL hängt über α·L₀ auch von der Ausgangslänge L₀ ab.</option>' +
      '<option value="c">Halb so groß.</option>' +
      '</select>' +
      '<button class="knopf zweitrangig" id="exp-f1k">Antwort prüfen</button>' +
      '<p id="exp-f1-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<h3>Erkenntnis</h3>' +
      '<p>Es gilt <strong>ΔL = α · L₀ · ΔT</strong>: Die Längenzunahme ist proportional zur Temperaturdifferenz <em>und</em> zur Ausgangslänge; der Faktor α ist der materialabhängige <strong>Längenausdehnungskoeffizient</strong>. Genau deshalb baut man Dehnungsfugen in Brücken und Schienen — und Bimetallstreifen nutzen die unterschiedliche Ausdehnung zweier Metalle als Schalter.</p>' +
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — was das Modell vereinfacht</summary>' +
      '<p><strong>Ablesefehler an der Messuhr:</strong> Der Feinzeiger lässt sich auf etwa 0,01 mm genau ablesen. Bei kleinen ΔT ist ΔL selbst nur wenige Hundertstel Millimeter groß — dort schlägt der Ablesefehler relativ stark durch. Über mehrere Punkte (Ausgleichsgerade) mitteln!</p>' +
      '<p><strong>Temperatur des ganzen Stabes:</strong> Der Brenner erwärmt erst eine Stelle; bis der ganze Stab gleichmäßig die Thermometer-Temperatur hat, vergeht Zeit. Misst man zu früh, ist der Stab in Wahrheit kühler als angezeigt — ΔL fällt zu klein aus.</p>' +
      '<p><strong>Reibung und Anpressdruck:</strong> Der Taststift drückt mit einer kleinen Kraft gegen den Stab; Reibung in der Führung kann die Anzeige leicht verfälschen.</p>' +
      '<p><strong>Linearität:</strong> α ist nur näherungsweise konstant. Über sehr große Temperaturbereiche ändert es sich leicht — dann ist ΔL nicht mehr exakt proportional zu ΔT.</p>' +
      '</details>' +
      '<div class="exp-knopfzeile">' +
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>' +
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>' +
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>' +
      '</div>';
    panel.querySelector("#exp-faktorform").addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseDezimal(panel.querySelector("#exp-faktor").value);
      const ok = Number.isFinite(wert) && Math.abs(wert - 2) <= 0.3;
      let text = ok
        ? "✓ Verdopplung! Doppelte Temperaturdifferenz → doppelte Längenzunahme. Das ist die Proportionalität ΔL ∝ ΔT."
        : "✗ Schau in deine Tabelle: Teile ΔL beim größeren ΔT durch ΔL beim halben ΔT — was kommt heraus?";
      if (ok && zustand.vorhersage === "prop") text += " Deine Vorhersage vom Anfang war richtig!";
      else if (ok && zustand.vorhersage) text += " Vergleiche mit deiner Vorhersage vom Anfang.";
      panel.querySelector("#exp-faktor-meldung").textContent = text;
    });
    panel.querySelector("#exp-f1k").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-f1").value, m = panel.querySelector("#exp-f1-meldung");
      if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m.textContent = wahl === "b"
        ? "✓ Richtig: In ΔL = α · L₀ · ΔT steckt die Ausgangslänge L₀. Doppelt so lang heißt bei gleichem ΔT auch doppelte Längenzunahme — jeder Millimeter Stab dehnt sich ja gleich stark, und es gibt doppelt so viele davon."
        : "✗ Denk an die Formel ΔL = α · L₀ · ΔT. Wie geht die Ausgangslänge L₀ darin ein, wenn ΔT und Material gleich bleiben?";
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const datenZeilen = zeilen.map((m, i) => [String(m.dT), komma(m.dL, 2), komma(quotienten[i], 4)]);
      csvHerunterladen("laengenausdehnung-messwerte.csv",
        ["dT in K", "dL in mm", "dL/dT in mm/K"], datenZeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.T = T0; zustand.messungen = []; zustand.vorhersage = "";
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
