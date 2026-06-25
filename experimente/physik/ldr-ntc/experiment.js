// experiment.js — Interaktives Experiment: Heissleiter NTC (Klasse 9).
// Realitaetsnahe Messpraxis statt fertiger Simulation: Ein NTC-Widerstand
// (Heissleiter) sitzt in einem Wasserbad. Du stellst die Wassertemperatur
// ein (Heizplatte / Eiswasser), liest die Temperatur am Thermometer und den
// Widerstand SELBST am Ohmmeter ab und traegst das Wertepaar (T, R) ein.
// In der Auswertung plottet das Experiment die R(T)-Kurve: R faellt mit
// steigender Temperatur (Halbleiter — genau umgekehrt wie beim Metall, dessen
// Widerstand mit der Temperatur waechst).
// Modell (NTC-Kennlinie): R(T) = R25 * exp(B * (1/T - 1/T25)), T in Kelvin.
// Kontrollwerte: R(25 C)=1000 Ohm, R(0 C)=2928 Ohm, R(80 C)=161 Ohm.
// Die kleine Anzeige-Streuung ist deterministisch geseedet -> TESTS in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  farbe, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Konstanten ----------
export const R25 = 1000;            // Ohm — Nennwiderstand bei 25 C
export const B_KONST = 3500;        // K — Materialkonstante des NTC
export const T25_K = 298.15;        // 25 C in Kelvin
export const T_MIN = 0, T_MAX = 90, T_SCHRITT = 5; // Grad Celsius — einstellbare Bad-Temperatur
export const MIN_MESSUNGEN = 6;     // Wertepaare (T, R)
export const TOLERANZ_REL = 0.04;   // +/-4 % beim Ablesen des Ohmmeters
export const TOLERANZ_MIN_OHM = 6;  // mindestens +/-6 Ohm Spielraum

// ---------- Modell (exakt, Node-testbar) ----------
export function kelvin(tC) { return tC + 273.15; }
// NTC-Kennlinie R(T) in Ohm
export function widerstand(tC) {
  return R25 * Math.exp(B_KONST * (1 / kelvin(tC) - 1 / T25_K));
}
// Anzeige-Aufloesung des Ohmmeters: auf ganze Ohm gerundet
export function gerundet(r) { return Math.round(r); }

// ---------- Ohmmeter-Anzeige: wahrer Wert + geseedete Streuung ----------
export function anzeigeR(tC) {
  const wahr = widerstand(tC);
  // relative Streuung +/-1,5 % (Kontaktwiderstand, Eigenerwaermung des Messstroms)
  const streu = wahr * streuung("R:" + Math.round(tC), 0.03);
  return Math.max(1, gerundet(wahr + streu));
}
// akzeptierte Ablesegenauigkeit (relativ, mit Mindestbetrag)
export function toleranzOhm(rSoll) { return Math.max(TOLERANZ_MIN_OHM, rSoll * TOLERANZ_REL); }

// ---------- Auswertung (rein, Node-testbar) ----------
// faellt R mit steigender Temperatur? (monoton fallende Messreihe)
export function faelltMonoton(zeilen) {
  const s = zeilen.slice().sort((a, b) => a.t - b.t);
  for (let i = 1; i < s.length; i++) if (s[i].r >= s[i - 1].r) return false;
  return s.length >= 2;
}
// Verhaeltnis kalt/warm aus zwei Messzeilen (zur Verdeutlichung der Staerke des Effekts)
export function verhaeltnisKaltWarm(zeilen) {
  const s = zeilen.slice().sort((a, b) => a.t - b.t);
  if (s.length < 2) return NaN;
  return s[0].r / s[s.length - 1].r;
}
// erwarteter Widerstand bei einer Zwischentemperatur (Ablese-Aufgabe an der Kurve)
export function ableseSollAusKurve(tC) { return gerundet(widerstand(tC)); }

// ---------- TESTS (laufen in Node, kein document/window noetig) ----------
// unabhaengige Nachrechnung der Kennlinie mit Math.pow statt exp(.. * ..)
function widerstandUnabhaengig(tC) {
  const TK = tC + 273.15;
  return R25 * Math.pow(Math.E, B_KONST * (1 / TK - 1 / 298.15));
}
function gestreuteReihe() {
  return [0, 20, 40, 60, 80].map(t => ({ t, r: anzeigeR(t) }));
}
export const TESTS = [
  { name: "Nennwert: R(25 C) = 1000 Ohm",
    ok: () => Math.abs(widerstand(25) - 1000) < 1e-6 },
  { name: "Kontrollwerte: R(0 C)=2928, R(80 C)=161 Ohm (auf 1 Ohm)",
    ok: () => Math.abs(widerstand(0) - 2928) < 1 && Math.abs(widerstand(80) - 161) < 1 },
  { name: "Unabhaengige Nachrechnung deckt sich mit dem Modell (alle T)",
    ok: () => [0, 10, 25, 37, 60, 90].every(t => Math.abs(widerstand(t) - widerstandUnabhaengig(t)) < 1e-6) },
  { name: "R faellt streng monoton mit T (Halbleiter!)",
    ok: () => { for (let t = 0; t < 90; t += 2) if (widerstand(t + 2) >= widerstand(t)) return false; return true; } },
  { name: "Eiswasser viel hochohmiger als heisses Bad: R(0)/R(80) > 10",
    ok: () => widerstand(0) / widerstand(80) > 10 },
  { name: "Anzeige-Streuung unter 3,5 % und auf ganze Ohm gerundet (alle T)",
    ok: () => { for (let t = 0; t <= 90; t += 5) { const a = anzeigeR(t); if (a !== Math.round(a)) return false; if (Math.abs(a - widerstand(t)) > widerstand(t) * 0.035 + 1) return false; } return true; } },
  { name: "Anzeige deterministisch",
    ok: () => anzeigeR(40) === anzeigeR(40) && anzeigeR(0) === anzeigeR(0) },
  { name: "parseDezimal und Ablese-Toleranz (relativ, Mindestbetrag)",
    ok: () => parseDezimal("510") === 510 && parseDezimal("510,5") === 510.5 && Number.isNaN(parseDezimal("xyz")) &&
      ablesungOk(1010, 1000, toleranzOhm(1000)) && !ablesungOk(1060, 1000, toleranzOhm(1000)) &&
      ablesungOk(174, 170, toleranzOhm(170)) && !ablesungOk(160, 170, toleranzOhm(170)) },
  { name: "Auswertung erkennt fallende Reihe; steigende nicht",
    ok: () => faelltMonoton([{ t: 0, r: 2052 }, { t: 40, r: 530 }, { t: 80, r: 170 }]) &&
      !faelltMonoton([{ t: 0, r: 100 }, { t: 40, r: 200 }]) && !faelltMonoton([{ t: 25, r: 1000 }]) },
  { name: "Verhaeltnis kalt/warm und Kurven-Ablesung konsistent",
    ok: () => { const z = [0, 25, 80].map(t => ({ t, r: gerundet(widerstand(t)) }));
      return Math.abs(verhaeltnisKaltWarm(z) - z[0].r / z[2].r) < 1e-9 && ableseSollAusKurve(50) === gerundet(widerstand(50)); } },
  { name: "Gestreute Reihe bleibt monoton fallend",
    ok: () => faelltMonoton(gestreuteReihe()) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    t: 25,                 // eingestellte Bad-Temperatur in Grad Celsius
    messungen: [],         // {t, r}
    ableseFrage: { gestellt: false, tZiel: 50, ok: false },
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
    '<canvas id="exp-canvas" width="360" height="540" aria-label="Versuchsaufbau: NTC-Widerstand in einem Wasserbad mit Thermometer und Heizplatte, angeschlossen an ein Digital-Ohmmeter."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeichnung ----------
  function pfad(punkte) {
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }
  function geraeteBox(x, y, bw, titel, wert, hinweis, cText, cLeise, cFlaeche, cBg) {
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, bw, 78, 8); else ctx.rect(x, y, bw, 78); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(titel, x + bw / 2, y + 16);
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x + 10, y + 24, bw - 20, 32, 4); else ctx.rect(x + 10, y + 24, bw - 20, 32); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 17px system-ui, sans-serif";
    ctx.fillText(wert, x + bw / 2, y + 46);
    ctx.fillStyle = cLeise; ctx.font = "10.5px system-ui, sans-serif";
    ctx.fillText(hinweis, x + bw / 2, y + 70);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
  }
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche", "#f4f6f8"), cBg = farbe("--bg", "#fff");
    const tC = zustand.t, r = anzeigeR(tC);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.fillText("Aufbau", 12, 18);

    // Anzeigen oben: Thermometer-Wert und Ohmmeter
    geraeteBox(16, 30, 156, "Thermometer", komma(tC, 0) + " C", "Wasserbad-Temperatur", cText, cLeise, cFlaeche, cBg);
    geraeteBox(188, 30, 156, "Ohmmeter", r + " Ohm", "Widerstand des NTC", cText, cLeise, cFlaeche, cBg);

    // Becherglas mit Wasser
    const bx = 96, by = 150, bw = 168, bh = 230;
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(bx, by); ctx.lineTo(bx, by + bh); ctx.lineTo(bx + bw, by + bh); ctx.lineTo(bx + bw, by);
    ctx.stroke();
    // Wasserfuellung (Farbe je nach Temperatur leicht andeuten ueber Fuellhoehe-Linie)
    const wasserO = by + 36;
    ctx.fillStyle = cFlaeche;
    ctx.fillRect(bx + 2, wasserO, bw - 4, by + bh - wasserO - 2);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(bx + 2, wasserO); ctx.lineTo(bx + bw - 2, wasserO); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Wasserbad", bx + 8, wasserO + 16);

    // Thermometer im Bad (rechts)
    const thx = bx + bw - 34;
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5; ctx.fillStyle = cBg;
    ctx.beginPath(); ctx.roundRect ? ctx.roundRect(thx - 4, by - 14, 8, bh - 30, 4) : ctx.rect(thx - 4, by - 14, 8, bh - 30); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(thx, by + bh - 44, 8, 0, 7); ctx.stroke();
    // Quecksilberfaden steigt mit der Temperatur
    const fuell = (tC - T_MIN) / (T_MAX - T_MIN);
    const fadenOben = (by - 8) + (1 - fuell) * (bh - 60);
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.arc(thx, by + bh - 44, 6, 0, 7); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = cAkzent;
    pfad([[thx, by + bh - 44], [thx, fadenOben]]);

    // NTC-Bauteil im Bad (links), an zwei Leitungen
    const nx = bx + 46, ny = by + bh - 70;
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillStyle = cBg;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(nx - 18, ny - 12, 36, 24, 5); else ctx.rect(nx - 18, ny - 12, 36, 24); ctx.fill(); ctx.stroke();
    // Schraegstrich (Symbol fuer temperaturabhaengigen Widerstand)
    pfad([[nx - 14, ny + 9], [nx + 14, ny - 9]]);
    ctx.fillStyle = cText; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("NTC", nx, ny + 26);
    // Zuleitungen vom NTC nach oben aus dem Bad heraus zum Ohmmeter
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    pfad([[nx - 8, ny - 12], [nx - 8, by - 6], [240, by - 6], [240, 108]]);
    pfad([[nx + 8, ny - 12], [nx + 8, by - 18], [300, by - 18], [300, 108]]);

    // Heizplatte unter dem Becher
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bx - 14, by + bh, bw + 28, 22, 5); else ctx.rect(bx - 14, by + bh, bw + 28, 22); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Heizplatte / Eisbad (Temperatur einstellbar)", bx + bw / 2, by + bh + 38);
    ctx.textAlign = "left";
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>Ein <strong>NTC-Widerstand (Heißleiter)</strong> hängt in einem <strong>Wasserbad</strong>. Mit Heizplatte und Eis stellst du die <strong>Temperatur</strong> ein, das <strong>Thermometer</strong> zeigt sie an. Das <strong>Ohmmeter</strong> misst direkt den Widerstand R des NTC.</p>',
      '<p><strong>Plan:</strong> Stell nacheinander verschiedene Temperaturen ein, lies T am Thermometer und R selbst am Ohmmeter ab und trag das Wertepaar (T, R) ein. Mindestens ' + MIN_MESSUNGEN + ' Wertepaare. In der Auswertung zeichnet das Experiment die R(T)-Kurve.</p>',
      '<p class="exp-hinweis">Tipp: Beginne kalt (Eiswasser, nahe 0 C) und arbeite dich in Schritten nach oben. Beim echten Versuch immer kurz warten, bis sich der NTC der Wassertemperatur angeglichen hat - sonst misst du einen Zwischenwert.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchfuehrung ----------
  function panelMessen() {
    const schonGemessen = zustand.messungen.some(z => z.t === zustand.t);
    const zeilen = zustand.messungen.slice().sort((a, b) => a.t - b.t);
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<div class="exp-regler">',
      '<label for="exp-t">Bad-Temperatur einstellen: <span id="exp-t-live">' + komma(zustand.t, 0) + ' C</span></label>',
      '<input type="range" id="exp-t" min="' + T_MIN + '" max="' + T_MAX + '" step="' + T_SCHRITT + '" value="' + zustand.t + '">',
      '</div>',
      '<p>Warte, bis sich der NTC angeglichen hat. Lies dann <strong>T am Thermometer</strong> und <strong>R am Ohmmeter</strong> ab:</p>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-wert">Widerstand R in Ohm (auf ganze Ohm):</label>',
      '<input id="exp-wert" inputmode="decimal" autocomplete="off" size="8"' + (schonGemessen ? ' disabled' : '') + '>',
      '<button class="knopf"' + (schonGemessen ? ' disabled' : '') + '>In die Tabelle</button>',
      '</form>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' +
        (schonGemessen ? 'Bei dieser Temperatur hast du schon gemessen - stell eine andere ein.' : '') + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle"><thead><tr><th>T in C</th><th>R in Ohm</th></tr></thead><tbody>' +
        (zeilen.map(z => '<tr><td>' + komma(z.t, 0) + '</td><td>' + z.r + '</td></tr>').join("") ||
          '<tr><td colspan="2">noch leer</td></tr>') +
        '</tbody></table>',
      '<p>' + zustand.messungen.length + ' von mindestens ' + MIN_MESSUNGEN + ' Messungen.</p>',
      '<button class="knopf" id="exp-weiter2"' + (zustand.messungen.length >= MIN_MESSUNGEN ? '' : ' disabled') + '>Zur Auswertung</button>'
    ].join("");
    const regler = panel.querySelector("#exp-t");
    regler.addEventListener("input", () => {
      zustand.t = Number(regler.value);
      panel.querySelector("#exp-t-live").textContent = komma(zustand.t, 0) + " C";
      zeichne();
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      if (zustand.messungen.some(z => z.t === zustand.t)) {
        meldung.textContent = "Bei dieser Temperatur hast du schon gemessen - stell eine andere ein.";
        return;
      }
      const wahr = anzeigeR(zustand.t);
      if (!ablesungOk(eingabe, wahr, toleranzOhm(wahr))) {
        meldung.textContent = "Schau genau aufs Ohmmeter: Welcher Wert steht in der Anzeige? (Auf ganze Ohm ablesen.)";
        return;
      }
      zustand.messungen.push({ t: zustand.t, r: eingabe });
      meldung.textContent = "Eingetragen. Stell die nächste Temperatur ein.";
      panelMessen();
    });
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const zeilen = zustand.messungen.slice().sort((a, b) => a.t - b.t);
    const faellt = faelltMonoton(zeilen);
    const verh = verhaeltnisKaltWarm(zeilen);
    const tKalt = zeilen.length ? zeilen[0].t : 0, tWarm = zeilen.length ? zeilen[zeilen.length - 1].t : 0;
    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="R-T-Diagramm: deine Messpunkte und die durch sie gelegte Kennlinie des Heißleiters, die mit steigender Temperatur fällt."></canvas>',
      '<p>Die Kurve fällt: <strong>' + (faellt ? 'Mit steigender Temperatur sinkt der Widerstand' : 'Prüfe deine Messreihe - die Kurve sollte mit steigender Temperatur fallen') +
        '.</strong> Das ist typisch für einen <strong>Halbleiter (NTC = Negative Temperature Coefficient)</strong>: Wärme setzt zusätzliche Ladungsträger frei, der Strom fließt leichter. <em>Genau umgekehrt</em> verhält sich ein Metall, dessen Widerstand mit der Temperatur steigt.</p>',
      '<table class="exp-tabelle"><thead><tr><th>T in C</th><th>R in Ohm</th></tr></thead><tbody>' +
        zeilen.map(z => '<tr><td>' + komma(z.t, 0) + '</td><td>' + z.r + '</td></tr>').join("") +
        '</tbody></table>',
      Number.isFinite(verh) && verh > 1 ?
        '<p>Von ' + komma(tKalt, 0) + ' C auf ' + komma(tWarm, 0) + ' C sank der Widerstand etwa auf ein <strong>' + komma(1 / verh, 2) +
        '-faches</strong> (also rund das ' + komma(verh, 1) + '-fache kalt gegenüber warm). Schon kleine Temperaturänderungen wirken stark - deshalb sind NTCs gute Temperatursensoren.</p>' : '',
      '<div class="exp-frage-box">',
      '<p><strong>Lies aus deiner Kurve ab:</strong> Welchen Widerstand erwartest du bei <strong>T = ' + zustand.ableseFrage.tZiel + ' C</strong>?</p>',
      '<form id="exp-ablese-frage" class="exp-ablesen">',
      '<label for="exp-rkurve">R bei ' + zustand.ableseFrage.tZiel + ' C in Ohm:</label>',
      '<input id="exp-rkurve" inputmode="decimal" autocomplete="off" size="8"' + (zustand.ableseFrage.ok ? ' disabled' : '') + '>',
      '<button class="knopf"' + (zustand.ableseFrage.ok ? ' disabled' : '') + '>Prüfen</button>',
      '</form>',
      '<p id="exp-kurve-meldung" class="exp-meldung" aria-live="polite">' +
        (zustand.ableseFrage.ok ? 'Gut abgelesen - die Kurve liegt bei dieser Temperatur etwa dort.' : '') + '</p>',
      '</div>',
      '<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV herunterladen</button></div>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung - was begrenzt die Genauigkeit?</summary>',
      '<p><strong>Temperaturangleich:</strong> Der NTC braucht etwas Zeit, bis er die Wassertemperatur angenommen hat. Misst man zu schnell, gehören T und R nicht zusammen.</p>',
      '<p><strong>Eigenerwärmung:</strong> Schon der kleine Messstrom des Ohmmeters heizt den NTC ein wenig auf - das drückt R leicht nach unten. Deshalb nur kurz messen.</p>',
      '<p><strong>Ableser des Thermometers:</strong> Das Wasser ist nicht überall exakt gleich warm; rühren und nahe am NTC messen verringert den Fehler.</p>',
      '</details>',
      '<div class="exp-knopfzeile">',
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>',
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>',
      '</div>'
    ].join("");
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.t = 25; zustand.ableseFrage = { gestellt: false, tZiel: 50, ok: false };
      zeichne(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("ntc-heissleiter-messwerte.csv", ["T in C", "R in Ohm"], zeilen.map(z => [z.t, z.r]));
    });
    panel.querySelector("#exp-ablese-frage").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-rkurve").value);
      const soll = ableseSollAusKurve(zustand.ableseFrage.tZiel);
      // grosszuegige Toleranz: Ablesen von einer gekruemmten Kurve ist ungenauer
      if (ablesungOk(eingabe, soll, Math.max(40, soll * 0.18))) {
        zustand.ableseFrage.ok = true; panelAuswerten();
      } else {
        panel.querySelector("#exp-kurve-meldung").textContent =
          "Noch nicht. Suche auf der Temperaturachse " + zustand.ableseFrage.tZiel + " C, geh senkrecht hoch bis zur Kurve und dann waagerecht zur R-Achse.";
      }
    });
    zeichneDiagramm(zeilen);
  }

  // R-T-Diagramm: Messpunkte + fallende Kennlinie (durch das Modell gezogen)
  function zeichneDiagramm(zeilen) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 54, Re = W - 16, O = 16, Un = H - 40;
    const tMax = 95;
    const rMax = Math.max(3100, ...zeilen.map(z => z.r)) * 1.05;
    const X = t => L + (t / tMax) * (Re - L);
    const Y = r => Un - (r / rMax) * (Un - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif"; c.textBaseline = "alphabetic"; c.lineWidth = 1;
    const rSchritt = 500;
    for (let r = 0; r <= rMax; r += rSchritt) {
      c.strokeStyle = r === 0 ? cText : cLeise; c.globalAlpha = r === 0 ? 1 : 0.5;
      c.beginPath(); c.moveTo(L, Y(r)); c.lineTo(Re, Y(r)); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "right"; c.fillText(String(r), L - 6, Y(r) + 4);
    }
    for (let t = 0; t <= 90; t += 15) {
      c.strokeStyle = t === 0 ? cText : cLeise; c.globalAlpha = t === 0 ? 1 : 0.5;
      c.beginPath(); c.moveTo(X(t), O); c.lineTo(X(t), Un); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "center"; c.fillText(String(t), X(t), Un + 16);
    }
    c.fillStyle = cText; c.textAlign = "left";
    c.fillText("R in Ohm", 8, 13); c.fillText("T in C", W - 52, H - 6);
    // Kennlinie (Modellkurve durch die Messpunkte gelegt, falls genug Punkte)
    if (zeilen.length >= 2) {
      c.strokeStyle = cLeise; c.lineWidth = 1.5; c.setLineDash([6, 5]);
      c.beginPath();
      let erster = true;
      for (let t = 0; t <= 90; t += 1) {
        const rv = widerstand(t);
        if (rv > rMax) { erster = true; continue; }
        const px = X(t), py = Y(rv);
        if (erster) { c.moveTo(px, py); erster = false; } else c.lineTo(px, py);
      }
      c.stroke(); c.setLineDash([]);
    }
    // Messpunkte
    c.fillStyle = cAkzent;
    for (const z of zeilen) { c.beginPath(); c.arc(X(z.t), Y(z.r), 5, 0, 7); c.fill(); }
  }

  // ---------- Phasensteuerung ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  zeichne();
  wechslePhase("aufbau");
}