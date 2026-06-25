// experiment.js — Interaktives Experiment: Der Transformator (Klasse 10).
// Realitaetsnahe Messpraxis statt fertiger Simulation: Auf einen gemeinsamen
// Eisenkern steckst du Sekundaerspulen mit verschiedenen Windungszahlen N2.
// Die Primaerspule (feste Windungszahl N1, feste Wechselspannung U1) bleibt
// gleich. Die Sekundaerspannung U2 liest du SELBST am Voltmeter ab und traegst
// das Wertepaar (N2, U2) in die Messtabelle ein. In der Auswertung zeigt das
// U2-N2-Diagramm eine Ursprungsgerade: U2 ist proportional zu N2, und die
// Steigung ist die "Windungsspannung" U1/N1 (Volt je Windung). Daraus folgt
// die Transformatorgleichung U2/U1 = N2/N1.
// Die kleine Anzeige-Streuung ist deterministisch geseedet -> TESTS in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, regression,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Konstanten ----------
export const U1 = 6.0;            // V — feste Primaer-Wechselspannung (Effektivwert)
export const N1 = 600;            // Windungen der Primaerspule (fest)
export const WINDUNGSSPANNUNG = U1 / N1;  // V je Windung = 0,01 V/Wdg
export const N2_WERTE = [150, 300, 600, 900, 1200];  // aufsteckbare Sekundaerspulen
export const BEREICH_V = 15, TEILUNG_V = 0.5;        // Voltmeter: Endwert, 1 Teilstrich
export const TOLERANZ_V = 0.3;    // akzeptierte Ablesegenauigkeit am Voltmeter
export const MIN_MESSUNGEN = 5;   // Wertepaare (N2, U2)

// ---------- Modell (exakt, Node-testbar) ----------
// Idealer Transformator: U2 = U1 * N2 / N1. Verluste (Streufluss, ohmscher
// Widerstand der Wicklung) vernachlaessigen wir hier bewusst.
export function spannungIdeal(N2) { return U1 * N2 / N1; }

// ---------- Voltmeter-Anzeige: wahrer Wert + geseedete Streuung ----------
export function anzeigeU2(N2) {
  if (N2 <= 0) return 0;
  return Math.max(0, spannungIdeal(N2) + streuung("U2:" + N2, TEILUNG_V));
}

// ---------- Auswertung (rein, Node-testbar) ----------
// beste Steigung durch den Ursprung fuer y = m * x  (Windungsspannung)
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}
// Windungsspannung U1/N1 in V je Windung aus Messzeilen {n2, u2}
export function windungsspannungAus(zeilen) {
  return steigungUrsprung(zeilen.map(z => ({ x: z.n2, y: z.u2 })));
}
// Verhaeltnisse zur Bestaetigung der Transformatorgleichung
export function verhaeltnisU(u2) { return u2 / U1; }
export function verhaeltnisN(n2) { return n2 / N1; }
export function bewerteSteigung(gemessen, soll) {
  const abw = Math.abs(gemessen - soll) / soll * 100;
  if (abw <= 5) return { stufe: "sehr gut", abw };
  if (abw <= 12) return { stufe: "gut", abw };
  return { stufe: "nochmal pruefen", abw };
}

// ---------- TESTS (laufen in Node, kein document/window noetig) ----------
// gestreute Messreihe, wie sie im Versuch entsteht
function gestreuteReihe() {
  return N2_WERTE.map(n2 => ({ n2, u2: anzeigeU2(n2) }));
}
export const TESTS = [
  { name: "Kontrollwerte U2: N2=300 -> 3,0 V; N2=1200 -> 12,0 V",
    ok: () => Math.abs(spannungIdeal(300) - 3.0) < 1e-9 && Math.abs(spannungIdeal(1200) - 12.0) < 1e-9 },
  { name: "Gleiche Windungszahl (N2=N1=600) -> U2=U1=6,0 V",
    ok: () => Math.abs(spannungIdeal(600) - U1) < 1e-9 },
  { name: "Unabhaengige Nachrechnung U2 = U1 * N2/N1 fuer alle Spulen",
    ok: () => N2_WERTE.every(n2 => Math.abs(spannungIdeal(n2) - 6.0 * n2 / 600) < 1e-12) },
  { name: "Proportionalitaet: doppeltes N2 -> doppeltes U2",
    ok: () => [150, 300, 450].every(n2 => Math.abs(spannungIdeal(2 * n2) - 2 * spannungIdeal(n2)) < 1e-12) },
  { name: "Windungsspannung U1/N1 = 0,01 V je Windung; Steigung perfekter Reihe trifft das",
    ok: () => Math.abs(WINDUNGSSPANNUNG - 0.01) < 1e-12 &&
      Math.abs(windungsspannungAus(N2_WERTE.map(n2 => ({ n2, u2: spannungIdeal(n2) }))) - WINDUNGSSPANNUNG) < 1e-12 },
  { name: "Transformatorgleichung: U2/U1 = N2/N1 (alle Spulen)",
    ok: () => N2_WERTE.every(n2 => Math.abs(verhaeltnisU(spannungIdeal(n2)) - verhaeltnisN(n2)) < 1e-12) },
  { name: "Anzeige-Streuung hoechstens 1 Teilstrich (alle Spulen)",
    ok: () => N2_WERTE.every(n2 => Math.abs(anzeigeU2(n2) - spannungIdeal(n2)) <= TEILUNG_V) },
  { name: "Anzeige deterministisch",
    ok: () => anzeigeU2(900) === anzeigeU2(900) && anzeigeU2(150) === anzeigeU2(150) },
  { name: "parseDezimal und Ablese-Toleranz (+/-0,3 V)",
    ok: () => parseDezimal("3,1") === 3.1 && parseDezimal("3.1") === 3.1 && Number.isNaN(parseDezimal("drei")) &&
      ablesungOk(3.1, 3.0, TOLERANZ_V) && !ablesungOk(2.6, 3.0, TOLERANZ_V) && !ablesungOk(NaN, 3.0, TOLERANZ_V) },
  { name: "Bewertung der Steigung: bis 5 % sehr gut",
    ok: () => bewerteSteigung(0.0102, 0.01).stufe === "sehr gut" && bewerteSteigung(0.0109, 0.01).stufe === "gut" &&
      bewerteSteigung(0.013, 0.01).stufe === "nochmal pruefen" },
  { name: "Gestreute 5er-Reihe -> Windungsspannung besser als 5 %",
    ok: () => Math.abs(windungsspannungAus(gestreuteReihe()) - WINDUNGSSPANNUNG) / WINDUNGSSPANNUNG < 0.05 }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    n2: N2_WERTE[1],          // aktuell aufgesteckte Sekundaerspule
    zeigU: 0, vonU: 0, zielU: 0, animStart: 0,
    messungen: [],            // {n2, u2}
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
    '<canvas id="exp-canvas" width="360" height="600" aria-label="Versuchsaufbau: gemeinsamer Eisenkern mit fester Primärspule am Wechselspannungsnetzgerät und aufsteckbarer Sekundärspule, deren Spannung ein analoges Voltmeter anzeigt."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeigerbewegung ----------
  function setzeZiel() {
    zustand.zielU = anzeigeU2(zustand.n2);
    zustand.vonU = zustand.zeigU;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.zeigU = zustand.zielU; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 400);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeigU = zustand.vonU + (zustand.zielU - zustand.vonU) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  // ---------- Zeichnung ----------
  function pfad(punkte) {
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }
  // eine Spule als Reihe kleiner Boegen am senkrechten Kernschenkel
  function zeichneSpule(xKern, yOben, yUnten, windungen, cFarbe) {
    const n = Math.max(4, Math.min(11, windungen));
    const hoehe = yUnten - yOben;
    const schritt = hoehe / n;
    ctx.strokeStyle = cFarbe; ctx.lineWidth = 2.4;
    for (let i = 0; i < n; i++) {
      const y = yOben + schritt * (i + 0.5);
      ctx.beginPath();
      ctx.arc(xKern, y, schritt * 0.62, -Math.PI / 2, Math.PI / 2, false);
      ctx.stroke();
    }
  }
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche", "#f4f6f8"), cBg = farbe("--bg", "#fff");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.fillText("Aufbau", 12, 18);

    // Eisenkern: geschlossener Ring (zwei senkrechte Schenkel + Joch oben/unten)
    const kxL = 120, kxR = 240, kyO = 84, kyU = 300, dicke = 16;
    ctx.strokeStyle = cText; ctx.fillStyle = cFlaeche; ctx.lineWidth = 1.5;
    // aeusserer Rahmen
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(kxL - dicke, kyO - dicke, (kxR - kxL) + 2 * dicke, (kyU - kyO) + 2 * dicke, 8);
    else ctx.rect(kxL - dicke, kyO - dicke, (kxR - kxL) + 2 * dicke, (kyU - kyO) + 2 * dicke);
    ctx.fill(); ctx.stroke();
    // Fenster ausstanzen
    ctx.fillStyle = cBg;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(kxL + dicke, kyO + dicke, (kxR - kxL) - 2 * dicke, (kyU - kyO) - 2 * dicke, 5);
    else ctx.rect(kxL + dicke, kyO + dicke, (kxR - kxL) - 2 * dicke, (kyU - kyO) - 2 * dicke);
    ctx.fill();
    ctx.strokeStyle = cText;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(kxL + dicke, kyO + dicke, (kxR - kxL) - 2 * dicke, (kyU - kyO) - 2 * dicke, 5);
    else ctx.rect(kxL + dicke, kyO + dicke, (kxR - kxL) - 2 * dicke, (kyU - kyO) - 2 * dicke);
    ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Eisenkern", (kxL + kxR) / 2, (kyO + kyU) / 2 + 4);

    // Primaerspule (links) und Sekundaerspule (rechts)
    zeichneSpule(kxL, kyO + 18, kyU - 18, 9, cText);
    zeichneSpule(kxR, kyO + 18, kyU - 18, Math.round(zustand.n2 / 130), cAkzent);

    // Primaer-Netzgeraet (Wechselspannung) links
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.strokeRect(14, 96, 70, 70);
    ctx.beginPath(); ctx.arc(49, 131, 14, 0, 7); ctx.stroke();
    // Sinus-Symbol fuer Wechselspannung
    ctx.beginPath();
    ctx.moveTo(40, 131);
    ctx.quadraticCurveTo(44.5, 121, 49, 131);
    ctx.quadraticCurveTo(53.5, 141, 58, 131);
    ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Netzgerät", 49, 88);
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("U1 = " + komma(U1, 1) + " V", 49, 162 + 18);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("(Wechselspannung)", 49, 162 + 33);

    // Leitungen Netzgeraet -> Primaerspule
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    pfad([[84, 110], [kxL, 110]]);
    pfad([[84, 152], [kxL, 152]]);

    // Beschriftung der Spulen mit Windungszahl (Kopfzeile, klar ueber dem Kernrahmen)
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Primär", kxL - 4, 42);
    ctx.fillText("N1 = " + N1, kxL - 4, 56);
    ctx.fillStyle = cAkzent;
    ctx.fillText("Sekundär", kxR + 6, 42);
    ctx.fillText("N2 = " + zustand.n2, kxR + 6, 56);
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("(aufsteckbar)", kxR + 6, kyU + 24);
    ctx.font = "12px system-ui, sans-serif";

    // Leitungen Sekundaerspule -> rechts zum Rand und hinab zum Voltmeter
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    pfad([[kxR, 110], [336, 110], [336, 372]]);
    pfad([[kxR, 152], [318, 152], [318, 372]]);

    // analoges Voltmeter unten (eigene klare Zone)
    zeichneVoltmeter(180, 506, cText, cLeise, cAkzent, cBg);
  }

  // analoges Zeigerinstrument fuer U2 (0-15 V)
  function zeichneVoltmeter(x0, y0, cText, cLeise, cAkzent, cBg) {
    const r = 122, halb = 55 * Math.PI / 180, top = y0 - 148;
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, top, 312, 178, 10); else ctx.rect(24, top, 312, 178);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Voltmeter U2", 36, top + 20);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText("0-15 V, Teilung 0,5 V", 324, top + 20);

    // Skalenbogen
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0, y0, r, -Math.PI / 2 - halb, -Math.PI / 2 + halb); ctx.stroke();
    // Teilstriche + Zahlen
    const nTicks = Math.round(BEREICH_V / TEILUNG_V);
    for (let k = 0; k <= nTicks; k++) {
      const wertK = k * TEILUNG_V;
      const a = -halb + (wertK / BEREICH_V) * 2 * halb;
      const sa = Math.sin(a), ca = Math.cos(a);
      const beschriftet = Math.abs(wertK / 3 - Math.round(wertK / 3)) < 1e-9;
      const mittel = Math.abs(wertK - Math.round(wertK)) < 1e-9;
      const len = beschriftet ? 15 : mittel ? 10 : 6;
      ctx.strokeStyle = beschriftet ? cText : cLeise;
      ctx.lineWidth = beschriftet ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x0 + (r - len) * sa, y0 - (r - len) * ca);
      ctx.lineTo(x0 + r * sa, y0 - r * ca);
      ctx.stroke();
      if (beschriftet) {
        ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(wertK), x0 + (r - 28) * sa, y0 - (r - 28) * ca);
      }
    }
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("V", x0, y0 - 48);
    // Zeiger
    const wertZ = Math.min(Math.max(zustand.zeigU, 0), BEREICH_V);
    const az = -halb + (wertZ / BEREICH_V) * 2 * halb;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 - 13 * Math.sin(az), y0 + 13 * Math.cos(az));
    ctx.lineTo(x0 + (r - 20) * Math.sin(az), y0 - (r - 20) * Math.cos(az));
    ctx.stroke();
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(x0, y0, 7, 0, 7); ctx.fill();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Phase 1: Aufbau ----------
  function spulenKnoepfe(idVorsatz) {
    return N2_WERTE.map(n2 =>
      '<button class="knopf zweitrangig" data-' + idVorsatz + '="' + n2 + '"' +
      (zustand.n2 === n2 ? ' aria-pressed="true"' : '') + '>' + n2 + ' Wdg</button>').join(" ");
  }
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>Auf einem gemeinsamen <strong>Eisenkern</strong> sitzen zwei Spulen. Die <strong>Primärspule</strong> hat fest <strong>N1 = ' + N1 + ' Windungen</strong> und liegt an einer festen Wechselspannung <strong>U1 = ' + komma(U1, 1) + ' V</strong>. Die <strong>Sekundärspule</strong> kannst du wechseln: Steck eine Spule mit anderer Windungszahl N2 auf. Das <strong>Voltmeter</strong> misst die Spannung U2, die an der Sekundärspule entsteht.</p>',
      '<p><strong>Plan:</strong> Steck nacheinander Sekundärspulen mit verschiedenen N2 auf, lies U2 jeweils selbst am Voltmeter ab und trag das Wertepaar (N2, U2) ein. Mindestens ' + MIN_MESSUNGEN + ' Wertepaare. In der Auswertung trägst du U2 über N2 auf - daraus findest du den Zusammenhang.</p>',
      '<p class="exp-hinweis">Wichtig: Der Trafo wandelt nur <em>Wechsel</em>spannung um. Mit Gleichspannung bliebe der magnetische Fluss konstant - dann zeigt das Voltmeter dauerhaft 0 V (außer im kurzen Ein- und Ausschaltmoment).</p>',
      '<p><strong>Sekundärspule aufstecken:</strong></p>',
      '<div class="exp-masseknoepfe" aria-label="Sekundärspule wählen">' + spulenKnoepfe("aufbau-n2") + '</div>',
      '<p>Aufgesteckt: <strong>N2 = ' + zustand.n2 + ' Windungen</strong></p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    panel.querySelectorAll("[data-aufbau-n2]").forEach(k => k.addEventListener("click", () => {
      zustand.n2 = Number(k.dataset.aufbauN2); setzeZiel(); panelAufbau();
    }));
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchfuehrung ----------
  function panelMessen() {
    const schonGemessen = zustand.messungen.some(z => z.n2 === zustand.n2);
    const zeilen = zustand.messungen.slice().sort((a, b) => a.n2 - b.n2);
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<p>Feste Primärseite: <strong>U1 = ' + komma(U1, 1) + ' V</strong>, <strong>N1 = ' + N1 + '</strong>. Steck eine Sekundärspule auf:</p>',
      '<div class="exp-masseknoepfe" aria-label="Sekundärspule wählen">' + spulenKnoepfe("n2") + '</div>',
      '<p>Aufgesteckt: <strong>N2 = ' + zustand.n2 + ' Windungen</strong>' +
        (schonGemessen ? ' <em>(für diese Spule hast du schon gemessen)</em>' : '') + '</p>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-wert">Lies das Voltmeter ab - Sekundärspannung U2 in V (auf 0,1 V genau):</label>',
      '<input id="exp-wert" inputmode="decimal" autocomplete="off" size="7"' + (schonGemessen ? ' disabled' : '') + '>',
      '<button class="knopf"' + (schonGemessen ? ' disabled' : '') + '>In die Tabelle</button>',
      '</form>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle"><thead><tr><th>N2 in Windungen</th><th>U2 in V</th></tr></thead><tbody>' +
        (zeilen.map(z => '<tr><td>' + z.n2 + '</td><td>' + komma(z.u2, 1) + '</td></tr>').join("") ||
          '<tr><td colspan="2">noch leer</td></tr>') +
        '</tbody></table>',
      '<p>' + zustand.messungen.length + ' von mindestens ' + MIN_MESSUNGEN + ' Messungen.</p>',
      '<button class="knopf" id="exp-weiter2"' + (zustand.messungen.length >= MIN_MESSUNGEN ? '' : ' disabled') + '>Zur Auswertung</button>'
    ].join("");
    panel.querySelectorAll("[data-n2]").forEach(k => k.addEventListener("click", () => {
      zustand.n2 = Number(k.dataset.n2); setzeZiel(); panelMessen();
    }));
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      if (zustand.messungen.some(z => z.n2 === zustand.n2)) {
        meldung.textContent = "Für diese Windungszahl hast du schon gemessen - steck eine andere Spule auf.";
        return;
      }
      if (!ablesungOk(eingabe, zustand.zeigU, TOLERANZ_V)) {
        meldung.textContent = "Schau genau hin: Wo steht der Zeiger auf der Volt-Skala? (1 Teilstrich = 0,5 V.)";
        return;
      }
      zustand.messungen.push({ n2: zustand.n2, u2: eingabe });
      meldung.textContent = "Eingetragen. Steck die nächste Spule auf.";
      panelMessen();
    });
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const zeilen = zustand.messungen.slice().sort((a, b) => a.n2 - b.n2);
    const m = windungsspannungAus(zeilen);
    const bew = Number.isFinite(m) ? bewerteSteigung(m, WINDUNGSSPANNUNG) : null;
    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="U2-N2-Diagramm: deine Messpunkte liegen auf einer Ursprungsgeraden, dazu die gestrichelte Ausgleichsgerade."></canvas>',
      '<p>Die Punkte liegen auf einer <strong>Ursprungsgeraden</strong>: <strong>U2 ist proportional zu N2</strong>. Je mehr Windungen die Sekundärspule hat, desto größer die Spannung.</p>',
      '<table class="exp-tabelle"><thead><tr><th>N2</th><th>U2 in V</th><th>U2/U1</th><th>N2/N1</th></tr></thead><tbody>' +
        zeilen.map(z =>
          '<tr><td>' + z.n2 + '</td><td>' + komma(z.u2, 1) + '</td><td>' + komma(verhaeltnisU(z.u2), 2) +
          '</td><td>' + komma(verhaeltnisN(z.n2), 2) + '</td></tr>').join("") +
        '</tbody></table>',
      '<p>Spalte 3 und 4 sind (fast) gleich - das ist die <strong>Transformatorgleichung</strong>: <strong>U2 / U1 = N2 / N1</strong>.</p>',
      '<p>Die Steigung der Geraden ist die <strong>Windungsspannung U1/N1</strong> (Spannung je Windung): dein Wert <strong>m &asymp; ' +
        (Number.isFinite(m) ? komma(m, 4) : "-") + ' V/Wdg</strong> (erwartet: ' + komma(WINDUNGSSPANNUNG, 4) + ' V/Wdg = U1/N1)' +
        (bew ? ' - Abweichung ' + komma(bew.abw, 1) + ' %: <strong>' + bew.stufe + '</strong>.' : '') + '</p>',
      '<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV herunterladen</button></div>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung - warum streuen die Werte?</summary>',
      '<p><strong>Ablesefehler:</strong> Am analogen Voltmeter kann man nicht genauer als etwa eine halbe Teilung (rund 0,25 V) ablesen - mit Blick schräg auf die Skala wird es noch ungenauer (Parallaxenfehler).</p>',
      '<p><strong>Realer Trafo:</strong> Wir haben den idealen Trafo angenommen. In Wirklichkeit ist U2 etwas kleiner als U1 * N2/N1, weil der ohmsche Widerstand der Wicklungen und nicht voll genutzter Streufluss Spannung "schlucken". Bei Belastung (Strom auf der Sekundärseite) wird die Abweichung größer.</p>',
      '<p><strong>Warum mitteln?</strong> Aus mehreren Wertepaaren eine Ausgleichsgerade zu legen ist genauer, als aus einer einzigen Messung zu rechnen.</p>',
      '</details>',
      '<div class="exp-knopfzeile">',
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>',
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>',
      '</div>'
    ].join("");
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.n2 = N2_WERTE[1]; setzeZiel(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("transformator-messwerte.csv", ["N2 in Windungen", "U2 in V"],
        zeilen.map(z => [z.n2, z.u2]));
    });
    zeichneDiagramm(zeilen, m);
  }

  // U2-N2-Diagramm mit Ausgleichsgerade durch den Ursprung
  function zeichneDiagramm(zeilen, m) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 52, Re = W - 16, O = 16, Un = H - 40;
    const nMax = 1300;
    const uMax = Math.max(13, ...zeilen.map(z => z.u2)) * 1.05;
    const X = n => L + (n / nMax) * (Re - L);
    const Y = u => Un - (u / uMax) * (Un - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif"; c.textBaseline = "alphabetic"; c.lineWidth = 1;
    for (let u = 0; u <= uMax; u += 3) {
      c.strokeStyle = u === 0 ? cText : cLeise; c.globalAlpha = u === 0 ? 1 : 0.5;
      c.beginPath(); c.moveTo(L, Y(u)); c.lineTo(Re, Y(u)); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "right"; c.fillText(String(u), L - 6, Y(u) + 4);
    }
    for (let n = 0; n <= 1200; n += 300) {
      c.strokeStyle = n === 0 ? cText : cLeise; c.globalAlpha = n === 0 ? 1 : 0.5;
      c.beginPath(); c.moveTo(X(n), O); c.lineTo(X(n), Un); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cText; c.textAlign = "center"; c.fillText(String(n), X(n), Un + 16);
    }
    c.fillStyle = cText; c.textAlign = "left";
    c.fillText("U2 in V", 8, 13); c.fillText("N2 in Windungen", W - 132, H - 6);
    // Ausgleichsgerade durch den Ursprung
    if (Number.isFinite(m)) {
      const nEnd = Math.min(1300, uMax / m);
      c.strokeStyle = cLeise; c.lineWidth = 1.5; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(nEnd), Y(m * nEnd)); c.stroke();
      c.setLineDash([]);
    }
    // Messpunkte
    c.fillStyle = cAkzent;
    for (const z of zeilen) { c.beginPath(); c.arc(X(z.n2), Y(z.u2), 5, 0, 7); c.fill(); }
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
