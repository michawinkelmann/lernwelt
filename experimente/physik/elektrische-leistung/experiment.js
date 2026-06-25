// experiment.js — Interaktives Experiment: Elektrische Leistung P = U * I (Klasse 9).
// Realitaetsnahe Messpraxis statt fertiger Simulation: An einem Verbraucher
// (hier ein Gluehlaempchen-Widerstand) stellst du am Netzgeraet verschiedene
// Spannungen ein, liest die Spannung U am Voltmeter und die Stromstaerke I am
// Amperemeter SELBST ab und traegst beide Werte ein. In der Auswertung
// berechnest du fuer JEDE Zeile die Leistung P = U * I selbst. Du entdeckst:
// P = U * I; an einem (naeherungsweise) ohmschen Widerstand waechst P mit U^2
// (doppelte Spannung -> vierfache Leistung).
// Verbraucher: R = 40 Ohm (konstant angenommen). Kontrollwerte:
// U=2 V -> I=50 mA, P=0,10 W ; U=6 V -> I=150 mA, P=0,90 W.
// Die kleine Zeiger-Streuung ist deterministisch geseedet -> TESTS in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Konstanten ----------
export const R_VERBRAUCHER = 40;       // Ohm — Widerstand des Verbrauchers (konstant)
export const U_MAX = 8, U_SCHRITT = 0.5; // V — regelbares Netzgeraet
export const BEREICH_V = 10, TEILUNG_V = 0.2;   // Voltmeter: Endwert, 1 Teilstrich
export const BEREICH_MA = 250, TEILUNG_MA = 5;  // Amperemeter
export const TOLERANZ_V = 0.15, TOLERANZ_MA = 4; // akzeptierte Ablesegenauigkeit
export const MIN_MESSUNGEN = 5;        // Wertepaare (U, I)
export const TOLERANZ_P_REL = 0.05;    // +/-5 % beim Nachrechnen von P
export const TOLERANZ_P_MIN = 0.01;    // mind. +/-0,01 W

// ---------- Modell (exakt, Node-testbar) ----------
// ohmscher Verbraucher: I = U / R, P = U * I = U^2 / R
export function stromMa(U) { return (U / R_VERBRAUCHER) * 1000; }   // mA
export function leistung(U, iMa) { return U * (iMa / 1000); }       // W  (I von mA in A)
export function leistungIdeal(U) { return U * U / R_VERBRAUCHER; }  // W

// ---------- Instrumenten-Anzeige: wahrer Wert + geseedete Streuung ----------
export function anzeigeV(U) {
  if (U === 0) return 0;
  return Math.max(0, U + streuung("V:" + U, TEILUNG_V));
}
export function anzeigeMa(U) {
  if (U === 0) return 0;
  return Math.max(0, stromMa(U) + streuung("A:" + U, TEILUNG_MA));
}

// ---------- Auswertung (rein, Node-testbar) ----------
// Leistung aus den abgelesenen Werten der Zeile
export function leistungAusZeile(u, iMa) { return u * (iMa / 1000); }
export function toleranzP(pSoll) { return Math.max(TOLERANZ_P_MIN, pSoll * TOLERANZ_P_REL); }
// waechst P quadratisch mit U? Vergleich P(2U)/P(U) ~ 4 (am ohmschen Widerstand)
export function verhaeltnisVerdopplung(uKlein) {
  return leistungIdeal(2 * uKlein) / leistungIdeal(uKlein);
}

// ---------- TESTS (laufen in Node, kein document/window noetig) ----------
// unabhaengige Nachrechnung: P = U^2 / R, ohne die leistung()-Funktion zu benutzen
function pUnabhaengig(U) { return (U * U) / 40; }
function gestreuteReihe() {
  return [2, 3, 4, 6, 8].map(U => ({ u: anzeigeV(U), i: anzeigeMa(U) }));
}
export const TESTS = [
  { name: "Kontrollwerte: U=2 V -> I=50 mA, P=0,10 W",
    ok: () => Math.abs(stromMa(2) - 50) < 1e-9 && Math.abs(leistung(2, 50) - 0.10) < 1e-9 },
  { name: "Kontrollwerte: U=6 V -> I=150 mA, P=0,90 W",
    ok: () => Math.abs(stromMa(6) - 150) < 1e-9 && Math.abs(leistung(6, 150) - 0.90) < 1e-9 },
  { name: "P = U * I deckt sich mit U^2/R (unabhaengige Nachrechnung, alle U)",
    ok: () => [1, 2, 3.5, 5, 8].every(U => Math.abs(leistung(U, stromMa(U)) - pUnabhaengig(U)) < 1e-12 &&
      Math.abs(leistungIdeal(U) - pUnabhaengig(U)) < 1e-12) },
  { name: "Doppelte Spannung -> vierfache Leistung (P ~ U^2)",
    ok: () => [1, 2, 3].every(u => Math.abs(verhaeltnisVerdopplung(u) - 4) < 1e-12) },
  { name: "Ohmsches Gesetz im Verbraucher exakt: I proportional zu U",
    ok: () => [1, 2, 4, 7].every(U => Math.abs(stromMa(U) - U * 25) < 1e-12) },
  { name: "Anzeige-Streuung hoechstens 1 Teilstrich (V und mA, alle U)",
    ok: () => { for (let n = 0; n <= 16; n++) { const U = n / 2; if (Math.abs(anzeigeV(U) - U) > TEILUNG_V) return false; if (Math.abs(anzeigeMa(U) - stromMa(U)) > TEILUNG_MA) return false; } return true; } },
  { name: "Anzeige deterministisch",
    ok: () => anzeigeV(4) === anzeigeV(4) && anzeigeMa(6) === anzeigeMa(6) },
  { name: "parseDezimal und Ablese-Toleranzen (+/-0,15 V, +/-4 mA)",
    ok: () => parseDezimal("4,0") === 4 && parseDezimal("4.0") === 4 && Number.isNaN(parseDezimal("vier")) &&
      ablesungOk(4.1, 4.0, TOLERANZ_V) && !ablesungOk(4.2, 4.0, TOLERANZ_V) &&
      ablesungOk(152, 150, TOLERANZ_MA) && !ablesungOk(157, 150, TOLERANZ_MA) && !ablesungOk(NaN, 5, TOLERANZ_MA) },
  { name: "Leistung aus Zeile + P-Toleranz beim Nachrechnen",
    ok: () => Math.abs(leistungAusZeile(4, 100) - 0.40) < 1e-12 &&
      ablesungOk(0.41, 0.40, toleranzP(0.40)) && !ablesungOk(0.45, 0.40, toleranzP(0.40)) && !ablesungOk(NaN, 0.40, toleranzP(0.40)) },
  { name: "Gestreute Reihe: P aus abgelesenen Werten nahe U^2/R (besser 8 %)",
    ok: () => gestreuteReihe().every((z, idx) => { const U = [2, 3, 4, 6, 8][idx];
      return Math.abs(leistungAusZeile(z.u, z.i) - leistungIdeal(U)) / leistungIdeal(U) < 0.08; }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    u: 0,                                  // Netzgeraet-Einstellung in V
    zeigV: 0, zeigI: 0, vonV: 0, vonI: 0, zielV: 0, zielI: 0, animStart: 0,
    messungen: [],                         // {einstellung, u, i}
    pGeprueft: {},                         // index -> true (P fuer die Zeile korrekt nachgerechnet)
    phase: "aufbau"
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = [
    '<div class="exp-links">',
    '<canvas id="exp-canvas" width="360" height="640" aria-label="Versuchsaufbau: Schaltskizze mit Netzgerät, Verbraucher, Amperemeter in Reihe und Voltmeter parallel; darunter die beiden analogen Zeigerinstrumente."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeigerbewegung ----------
  function setzeZiel() {
    zustand.zielV = anzeigeV(zustand.u);
    zustand.zielI = anzeigeMa(zustand.u);
    zustand.vonV = zustand.zeigV; zustand.vonI = zustand.zeigI;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.zeigV = zustand.zielV; zustand.zeigI = zustand.zielI; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 400);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeigV = zustand.vonV + (zustand.zielV - zustand.vonV) * e;
    zustand.zeigI = zustand.vonI + (zustand.zielI - zustand.vonI) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  // ---------- Zeichnung ----------
  function pfad(punkte) {
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }
  function kreisGeraet(x, y, buchstabe, cText, cBg) {
    ctx.fillStyle = cBg; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 19, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(buchstabe, x, y + 1);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  function knoten(x, y, cText) { ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill(); }

  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cBg = farbe("--bg", "#fff");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    zeichneSchaltung(cText, cLeise, cAkzent, cBg);
    zeichneInstrument({ y0: 414, titel: "Voltmeter U", einheit: "V", bereich: BEREICH_V, teilung: TEILUNG_V, mittel: 1, beschriftet: 2, wert: zustand.zeigV, hinweis: "0-10 V, Teilung 0,2 V" }, cText, cLeise, cAkzent, cBg);
    zeichneInstrument({ y0: 619, titel: "Amperemeter I", einheit: "mA", bereich: BEREICH_MA, teilung: TEILUNG_MA, mittel: 25, beschriftet: 50, wert: zustand.zeigI, hinweis: "0-250 mA, Teilung 5 mA" }, cText, cLeise, cAkzent, cBg);
  }

  function zeichneSchaltung(cText, cLeise, cAkzent, cBg) {
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.fillText("Schaltung", 12, 20);

    // Netzgeraet mit Drehknopf
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.strokeRect(20, 80, 78, 90);
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("Netzgerät", 59, 100); ctx.fillText("0-8 V", 59, 117);
    ctx.beginPath(); ctx.arc(59, 144, 12, 0, 7); ctx.stroke();
    const kw = (-120 + 240 * zustand.u / U_MAX) * Math.PI / 180;
    ctx.beginPath(); ctx.moveTo(59, 144); ctx.lineTo(59 + 10 * Math.sin(kw), 144 - 10 * Math.cos(kw)); ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillText("+", 103, 90); ctx.fillText("-", 103, 150);

    // Reihenschaltung ueber Amperemeter zum Verbraucher und zurueck
    pfad([[98, 95], [118, 95], [118, 38], [165, 38]]);
    kreisGeraet(185, 38, "A", cText, cBg);
    pfad([[205, 38], [322, 38], [322, 88]]);
    pfad([[322, 162], [322, 200], [118, 200], [118, 155], [98, 155]]);

    // Verbraucher (Gluehlaempchen-Symbol) zwischen den Knotenpunkten
    pfad([[322, 88], [322, 108]]); pfad([[322, 142], [322, 162]]);
    ctx.beginPath(); ctx.arc(322, 125, 17, 0, 7); ctx.stroke();
    const d = 17 / Math.SQRT2;
    ctx.beginPath(); ctx.moveTo(322 - d, 125 - d); ctx.lineTo(322 + d, 125 + d);
    ctx.moveTo(322 + d, 125 - d); ctx.lineTo(322 - d, 125 + d); ctx.stroke();

    // Voltmeter parallel zum Verbraucher
    pfad([[322, 88], [262, 88], [262, 106]]);
    pfad([[262, 144], [262, 162], [322, 162]]);
    kreisGeraet(262, 125, "V", cText, cBg);
    knoten(322, 88, cText); knoten(322, 162, cText);

    // Beschriftungen
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Amperemeter - in Reihe", 185, 72);
    ctx.fillText("Voltmeter - parallel", 232, 186);
    ctx.fillStyle = cText; ctx.textAlign = "right";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("Verbraucher", 354, 110);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("(Lämpchen)", 354, 126);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
  }

  // analoges Zeigerinstrument
  function zeichneInstrument(g, cText, cLeise, cAkzent, cBg) {
    const x0 = 180, y0 = g.y0, r = 146, halb = 55 * Math.PI / 180, top = y0 - 170;
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, top, 312, 188, 10); else ctx.rect(24, top, 312, 188);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(g.titel, 36, top + 20);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText(g.hinweis, 324, top + 20);

    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0, y0, r, -Math.PI / 2 - halb, -Math.PI / 2 + halb); ctx.stroke();
    const nTicks = Math.round(g.bereich / g.teilung);
    for (let k = 0; k <= nTicks; k++) {
      const wertK = k * g.teilung;
      const a = -halb + (wertK / g.bereich) * 2 * halb;
      const sa = Math.sin(a), ca = Math.cos(a);
      const istBe = Math.abs(wertK / g.beschriftet - Math.round(wertK / g.beschriftet)) < 1e-9;
      const istMi = Math.abs(wertK / g.mittel - Math.round(wertK / g.mittel)) < 1e-9;
      const len = istBe ? 16 : istMi ? 11 : 6;
      ctx.strokeStyle = istBe ? cText : cLeise; ctx.lineWidth = istBe ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x0 + (r - len) * sa, y0 - (r - len) * ca);
      ctx.lineTo(x0 + r * sa, y0 - r * ca);
      ctx.stroke();
      if (istBe) {
        ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(wertK), x0 + (r - 30) * sa, y0 - (r - 30) * ca);
      }
    }
    ctx.fillStyle = cText; ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(g.einheit, x0, y0 - 52);
    const wertZ = Math.min(Math.max(g.wert, 0), g.bereich);
    const az = -halb + (wertZ / g.bereich) * 2 * halb;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 - 14 * Math.sin(az), y0 + 14 * Math.cos(az));
    ctx.lineTo(x0 + (r - 22) * Math.sin(az), y0 - (r - 22) * Math.cos(az));
    ctx.stroke();
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(x0, y0, 7, 0, 7); ctx.fill();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>Ein regelbares <strong>Netzgerät</strong> treibt den Strom durch einen <strong>Verbraucher</strong> (ein Lämpchen). Das <strong>Amperemeter</strong> hängt <strong>in Reihe</strong> und misst die Stromstärke I; das <strong>Voltmeter</strong> hängt <strong>parallel</strong> zum Verbraucher und misst die anliegende Spannung U.</p>',
      '<p><strong>Plan:</strong> Spannung schrittweise hochdrehen, bei jeder Einstellung <em>beide</em> Instrumente selbst ablesen und das Wertepaar (U, I) eintragen. In der Auswertung berechnest du für jede Zeile die Leistung <strong>P = U * I</strong>. Mindestens ' + MIN_MESSUNGEN + ' Wertepaare.</p>',
      '<p class="exp-hinweis">Achtung Einheiten: Das Amperemeter zeigt <strong>Milliampere (mA)</strong>. Für P = U * I in Watt musst du die Stromstärke erst in Ampere umrechnen: 1 mA = 0,001 A.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchfuehrung ----------
  function panelMessen() {
    const schonGemessen = zustand.messungen.some(z => z.einstellung === zustand.u);
    const zeilen = zustand.messungen.slice().sort((a, b) => a.einstellung - b.einstellung);
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<div class="exp-regler">',
      '<label for="exp-u">Netzgerät-Drehknopf: <span id="exp-u-live">' + komma(zustand.u, 1) + ' V</span></label>',
      '<input type="range" id="exp-u" min="0" max="' + U_MAX + '" step="' + U_SCHRITT + '" value="' + zustand.u + '">',
      '</div>',
      '<p>Lies <strong>beide</strong> Instrumente links ab - U auf 0,1 V, I auf 1 mA geschätzt:</p>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-uab">U in V:</label>',
      '<input id="exp-uab" inputmode="decimal" autocomplete="off" size="6"' + (zustand.u === 0 ? ' disabled' : '') + '>',
      '<label for="exp-iab">I in mA:</label>',
      '<input id="exp-iab" inputmode="decimal" autocomplete="off" size="6"' + (zustand.u === 0 ? ' disabled' : '') + '>',
      '<button class="knopf"' + (zustand.u === 0 ? ' disabled' : '') + '>In die Tabelle</button>',
      '</form>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' +
        (zustand.u === 0 ? 'Dreh zuerst die Spannung hoch.' : (schonGemessen ? 'Bei dieser Knopfstellung hast du schon gemessen.' : '')) + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle"><thead><tr><th>U in V</th><th>I in mA</th></tr></thead><tbody>' +
        (zeilen.map(z => '<tr><td>' + komma(z.u, 1) + '</td><td>' + komma(z.i, 0) + '</td></tr>').join("") ||
          '<tr><td colspan="2">noch leer</td></tr>') +
        '</tbody></table>',
      '<p>' + zustand.messungen.length + ' von mindestens ' + MIN_MESSUNGEN + ' Messungen.</p>',
      '<button class="knopf" id="exp-weiter2"' + (zustand.messungen.length >= MIN_MESSUNGEN ? '' : ' disabled') + '>Zur Auswertung</button>'
    ].join("");
    const regler = panel.querySelector("#exp-u");
    regler.addEventListener("input", () => {
      zustand.u = Number(regler.value);
      panel.querySelector("#exp-u-live").textContent = komma(zustand.u, 1) + " V";
      setzeZiel();
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const uAb = parseDezimal(panel.querySelector("#exp-uab").value);
      const iAb = parseDezimal(panel.querySelector("#exp-iab").value);
      if (zustand.messungen.some(z => z.einstellung === zustand.u)) {
        meldung.textContent = "Bei dieser Knopfstellung hast du schon gemessen - dreh auf einen anderen Wert.";
        return;
      }
      if (!ablesungOk(uAb, zustand.zeigV, TOLERANZ_V)) {
        meldung.textContent = "Schau noch einmal genau aufs Voltmeter: Wo steht der Zeiger? (1 Teilstrich = 0,2 V.)";
        return;
      }
      if (!ablesungOk(iAb, zustand.zeigI, TOLERANZ_MA)) {
        meldung.textContent = "Das Amperemeter zeigt etwas anderes - zähl die Teilstriche nach (1 Teilstrich = 5 mA).";
        return;
      }
      zustand.messungen.push({ einstellung: zustand.u, u: uAb, i: iAb });
      meldung.textContent = "Wertepaar eingetragen - stell die nächste Spannung ein.";
      panelMessen();
    });
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const zeilen = zustand.messungen.slice().sort((a, b) => a.einstellung - b.einstellung);
    const alleP = Object.keys(zustand.pGeprueft).length >= zeilen.length && zeilen.length > 0;
    let html = [
      '<h2>Auswertung</h2>',
      '<p>Berechne für jede Zeile die Leistung <strong>P = U * I</strong>. Denk an die Einheit: I steht in mA, also erst durch 1000 teilen (mA -> A). Trag dein Ergebnis in Watt ein (auf 0,01 W gerundet).</p>',
      '<table class="exp-tabelle"><thead><tr><th>U in V</th><th>I in mA</th><th>P = U * I in W</th></tr></thead><tbody>'
    ];
    zeilen.forEach((z, i) => {
      const ok = zustand.pGeprueft[i];
      html.push('<tr><td>' + komma(z.u, 1) + '</td><td>' + komma(z.i, 0) + '</td><td>' +
        (ok ? '<strong>' + komma(leistungAusZeile(z.u, z.i), 2) + '</strong>' :
          '<input class="exp-p-feld" data-zeile="' + i + '" inputmode="decimal" autocomplete="off" size="5"> W') +
        '</td></tr>');
    });
    html.push('</tbody></table>');
    html.push('<p id="exp-p-meldung" class="exp-meldung" aria-live="polite"></p>');
    if (alleP) {
      const klein = zeilen[0], gross = zeilen[zeilen.length - 1];
      html.push('<p class="exp-hinweis"><strong>Entdeckung:</strong> Die Leistung steigt mit der Spannung - und zwar schneller als linear. Beim ohmschen Verbraucher gilt P = U * I = U&sup2;/R: <strong>doppelte Spannung bedeutet vierfache Leistung</strong>. Vergleiche selbst U = ' + komma(klein.u, 1) + ' V (P &asymp; ' + komma(leistungAusZeile(klein.u, klein.i), 2) + ' W) mit der etwa doppelten Spannung in deiner Tabelle.</p>');
      html.push('<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="P-U-Diagramm: die Leistung wächst mit der Spannung entlang einer nach oben gekrümmten Kurve (Parabel)."></canvas>');
    } else {
      html.push('<p>Rechne zuerst alle Zeilen aus - dann zeigt dir das Experiment den Zusammenhang und ein P-U-Diagramm.</p>');
    }
    html.push('<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV herunterladen</button></div>');
    html.push('<details class="exp-fehler"><summary>Fehlerbetrachtung - wie genau ist P?</summary>');
    html.push('<p><strong>Fehler pflanzen sich fort:</strong> P = U * I steckt die Ablesefehler beider Instrumente. Sind U und I je etwa 3 % ungenau, ist P bis zu rund 6 % ungenau (die Fehler addieren sich näherungsweise).</p>');
    html.push('<p><strong>Erwärmung des Lämpchens:</strong> Ein echter Glühdraht wird mit steigender Leistung heißer und sein Widerstand wächst. Dann ist I etwas kleiner als U/R bei kaltem Draht - die P-U-Kurve flacht oben leicht ab. Wir haben den Widerstand hier als konstant angenommen.</p>');
    html.push('<p><strong>Eigenverbrauch der Messgeräte:</strong> Voltmeter und Amperemeter ziehen selbst ein wenig Leistung - bei genauen Messungen unterscheidet man strom- und spannungsrichtige Schaltung.</p>');
    html.push('</details>');
    html.push('<div class="exp-knopfzeile">');
    html.push('<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>');
    html.push('<button class="knopf" id="exp-neustart">Neues Experiment</button>');
    html.push('</div>');
    panel.innerHTML = html.join("");

    panel.querySelectorAll(".exp-p-feld").forEach(f => f.addEventListener("change", () => {
      const i = Number(f.dataset.zeile), z = zeilen[i];
      const soll = leistungAusZeile(z.u, z.i);
      const eingabe = parseDezimal(f.value);
      const meldung = panel.querySelector("#exp-p-meldung");
      if (ablesungOk(eingabe, soll, toleranzP(soll))) {
        zustand.pGeprueft[i] = true; panelAuswerten();
      } else {
        meldung.textContent = "Zeile " + (i + 1) + ": Noch nicht. Rechne P = " + komma(z.u, 1) + " V * " + komma(z.i, 0) + " mA. Erst " + komma(z.i, 0) + " mA = " + komma(z.i / 1000, 3) + " A, dann mal " + komma(z.u, 1) + " V.";
      }
    }));
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.u = 0; zustand.pGeprueft = {};
      setzeZiel(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("elektrische-leistung-messwerte.csv", ["U in V", "I in mA", "P in W"],
        zeilen.map(z => [z.u, z.i, leistungAusZeile(z.u, z.i)]));
    });
    if (alleP) zeichneDiagramm(zeilen);
  }

  // P-U-Diagramm: Leistung ueber Spannung (nach oben gekruemmt = Parabel)
  function zeichneDiagramm(zeilen) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 52, Re = W - 16, O = 16, Un = H - 40;
    const uMax = 9;
    const pWerte = zeilen.map(z => leistungAusZeile(z.u, z.i));
    const pMax = Math.max(0.5, ...pWerte) * 1.12;
    const X = u => L + (u / uMax) * (Re - L);
    const Y = p => Un - (p / pMax) * (Un - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif"; c.textBaseline = "alphabetic"; c.lineWidth = 1;
    const pSchritt = pMax > 1.5 ? 0.5 : pMax > 0.8 ? 0.2 : 0.1;
    for (let p = 0; p <= pMax + 1e-9; p += pSchritt) {
      c.strokeStyle = p < 1e-9 ? cText : cLeise; c.globalAlpha = p < 1e-9 ? 1 : 0.5;
      c.beginPath(); c.moveTo(L, Y(p)); c.lineTo(Re, Y(p)); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "right"; c.fillText(komma(p, pSchritt < 0.5 ? 1 : 1), L - 6, Y(p) + 4);
    }
    for (let u = 0; u <= 8; u += 2) {
      c.strokeStyle = u === 0 ? cText : cLeise; c.globalAlpha = u === 0 ? 1 : 0.5;
      c.beginPath(); c.moveTo(X(u), O); c.lineTo(X(u), Un); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "center"; c.fillText(String(u), X(u), Un + 16);
    }
    c.fillStyle = cText; c.textAlign = "left";
    c.fillText("P in W", 8, 13); c.fillText("U in V", W - 52, H - 6);
    // Modellkurve P = U^2/R durch die Punkte
    c.strokeStyle = cLeise; c.lineWidth = 1.5; c.setLineDash([6, 5]);
    c.beginPath();
    let erster = true;
    for (let u = 0; u <= 8.2; u += 0.1) {
      const pv = leistungIdeal(u);
      if (pv > pMax) { erster = true; continue; }
      const px = X(u), py = Y(pv);
      if (erster) { c.moveTo(px, py); erster = false; } else c.lineTo(px, py);
    }
    c.stroke(); c.setLineDash([]);
    // Messpunkte
    c.fillStyle = cAkzent;
    zeilen.forEach((z, i) => { c.beginPath(); c.arc(X(z.u), Y(pWerte[i]), 5, 0, 7); c.fill(); });
  }

  // ---------- Phasensteuerung ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  setzeZiel();
  wechslePhase("aufbau");
}
