// experiment.js — Interaktives Experiment: Reihen- und Parallelschaltung (Klasse 7).
// Realitätsnahe Messpraxis: Zwei gleiche Lämpchen (je 20 Ohm) liegen einmal in
// REIHE, einmal PARALLEL am selben Netzgerät (6 V). Mit dem Vielfachmessgerät
// liest die Schülerin/der Schüler den Gesamtstrom I (Amperemeter) und die
// Teilspannung U an einem Lämpchen (Voltmeter) SELBST an den analogen Skalen ab.
// Entdeckung:
//   Reihe    -> überall gleicher (kleiner) Strom, Teilspannungen addieren sich zu U.
//   Parallel -> an jedem Zweig die volle Spannung, Zweigströme addieren sich
//               -> Gesamtstrom größer.
// Die kleine Zeiger-Unruhe ist deterministisch geseedet -> TESTS laufen in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Daten (rein, Node-testbar) ----------
export const U_QUELLE = 6;     // Netzgerät in V
export const R_LAMPE = 20;     // Widerstand je Lämpchen in Ohm
export const N_LAMPEN = 2;     // zwei gleiche Lämpchen

// Messgeräte (Vielfachmessgerät, analog)
export const BEREICH_A = 1.0,  TEILUNG_A = 0.05;   // Amperemeter: Endwert 1 A
export const BEREICH_V = 8,    TEILUNG_V = 0.5;    // Voltmeter:  Endwert 8 V
export const TOLERANZ_A = 0.03, TOLERANZ_V = 0.3;  // akzeptierte Ablesegenauigkeit

// ---------- Physik (exakt) ----------
export function gesamtstrom(schaltung, U = U_QUELLE, R = R_LAMPE) {
  if (schaltung === "reihe")    return U / (N_LAMPEN * R);
  if (schaltung === "parallel") return (N_LAMPEN * U) / R;
  return NaN;
}
export function lampenspannung(schaltung, U = U_QUELLE) {
  if (schaltung === "reihe")    return U / N_LAMPEN;
  if (schaltung === "parallel") return U;
  return NaN;
}
export function lampenstrom(schaltung, U = U_QUELLE, R = R_LAMPE) {
  return lampenspannung(schaltung, U) / R;
}
export function helligkeit(schaltung, U = U_QUELLE, R = R_LAMPE) {
  const uL = lampenspannung(schaltung, U);
  const pMax = (U * U) / R;            // ein Lämpchen direkt an U
  return Math.max(0, Math.min(1, (uL * uL) / R / pMax));
}

// ---------- Anzeige: wahrer Wert + geseedete Streuung ----------
export function anzeigeStromA(schaltung) {
  return Math.max(0, gesamtstrom(schaltung) + streuung("A:" + schaltung, TEILUNG_A));
}
export function anzeigeSpannungV(schaltung) {
  return Math.max(0, lampenspannung(schaltung) + streuung("V:" + schaltung, TEILUNG_V));
}

// ---------- Auswertung (rein) ----------
export function summeTeilspannungen(uProLampe) { return uProLampe * N_LAMPEN; }
export function summeZweigstroeme(iProLampe) { return iProLampe * N_LAMPEN; }
export function bewerteAblesung(gemessen, wahr, toleranz) {
  return ablesungOk(gemessen, wahr, toleranz);
}

function istVielfaches(wert, schritt) {
  const q = wert / schritt;
  return Math.abs(q - Math.round(q)) < 1e-9;
}

// ---------- TESTS (laufen in Node, kein document/window nötig) ----------
export const TESTS = [
  { name: "Reihe: I = 0,15 A (U=6 V, R=20 Ω)", ok: () => Math.abs(gesamtstrom("reihe") - 0.15) < 1e-12 },
  { name: "Parallel: I = 0,60 A (U=6 V, R=20 Ω)", ok: () => Math.abs(gesamtstrom("parallel") - 0.60) < 1e-12 },
  { name: "Parallelstrom = 4·Reihenstrom", ok: () => Math.abs(gesamtstrom("parallel") - 4 * gesamtstrom("reihe")) < 1e-12 },
  { name: "Reihe: Teilspannung je Lämpchen = 3 V, Summe = 6 V", ok: () => Math.abs(lampenspannung("reihe") - 3) < 1e-12 && Math.abs(summeTeilspannungen(lampenspannung("reihe")) - U_QUELLE) < 1e-12 },
  { name: "Parallel: volle Spannung 6 V an jedem Zweig", ok: () => Math.abs(lampenspannung("parallel") - 6) < 1e-12 },
  { name: "Parallel: Zweigströme addieren sich zum Gesamtstrom", ok: () => Math.abs(summeZweigstroeme(lampenstrom("parallel")) - gesamtstrom("parallel")) < 1e-12 },
  { name: "Reihe: Strom durch jedes Lämpchen = Gesamtstrom", ok: () => Math.abs(lampenstrom("reihe") - gesamtstrom("reihe")) < 1e-12 },
  { name: "Unabhängige Nachrechnung über Ohm: I_reihe=U/(2R), I_par=2U/R", ok: () => Math.abs(gesamtstrom("reihe") - U_QUELLE / (2 * R_LAMPE)) < 1e-12 && Math.abs(gesamtstrom("parallel") - 2 * U_QUELLE / R_LAMPE) < 1e-12 },
  { name: "Helligkeit: parallel heller als in Reihe", ok: () => helligkeit("parallel") > helligkeit("reihe") && helligkeit("parallel") <= 1 + 1e-12 },
  { name: "Anzeige deterministisch", ok: () => anzeigeStromA("reihe") === anzeigeStromA("reihe") && anzeigeSpannungV("parallel") === anzeigeSpannungV("parallel") },
  { name: "Anzeige-Streuung höchstens 1 Teilung", ok: () => ["reihe", "parallel"].every(s => Math.abs(anzeigeStromA(s) - gesamtstrom(s)) <= TEILUNG_A + 1e-12 && Math.abs(anzeigeSpannungV(s) - lampenspannung(s)) <= TEILUNG_V + 1e-12) },
  { name: "Ablesetoleranzen (±0,03 A / ±0,3 V)", ok: () => bewerteAblesung(0.16, 0.15, TOLERANZ_A) && !bewerteAblesung(0.20, 0.15, TOLERANZ_A) && bewerteAblesung(3.2, 3.0, TOLERANZ_V) && !bewerteAblesung(3.6, 3.0, TOLERANZ_V) && !bewerteAblesung(NaN, 3, TOLERANZ_V) },
  { name: "parseDezimal: Komma und Punkt", ok: () => parseDezimal("0,15") === 0.15 && parseDezimal("0.15") === 0.15 && Number.isNaN(parseDezimal("viel")) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    schaltung: "reihe",
    an: false,
    zeigA: 0, zeigV: 0,
    vonA: 0, vonV: 0, zielA: 0, zielV: 0, animStart: 0,
    messungen: { reihe: [], parallel: [] },
    phase: "aufbau"
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML = '<div class="exp-links"><canvas id="exp-canvas" width="360" height="660" aria-label="Versuchsaufbau: Netzgerät mit zwei gleichen Lämpchen, oben als Schaltskizze (umschaltbar zwischen Reihen- und Parallelschaltung) mit Amperemeter und Voltmeter; darunter die beiden analogen Zeigerinstrumente."></canvas></div><div class="exp-rechts" id="exp-panel"></div>';
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  function serie() { return zustand.messungen[zustand.schaltung]; }

  function setzeZiel() {
    zustand.zielA = zustand.an ? anzeigeStromA(zustand.schaltung) : 0;
    zustand.zielV = zustand.an ? anzeigeSpannungV(zustand.schaltung) : 0;
    zustand.vonA = zustand.zeigA; zustand.vonV = zustand.zeigV;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.zeigA = zustand.zielA; zustand.zeigV = zustand.zielV; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 400);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeigA = zustand.vonA + (zustand.zielA - zustand.vonA) * e;
    zustand.zeigV = zustand.vonV + (zustand.zielV - zustand.vonV) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cBg = farbe("--bg", "#fff");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    zeichneSchaltung(cText, cLeise, cAkzent, cBg);
    zeichneInstrument({ y0: 430, titel: "Amperemeter (Gesamtstrom I)", einheit: "A", bereich: BEREICH_A, teilung: TEILUNG_A, mittel: 0.1, beschriftet: 0.2, wert: zustand.zeigA, hinweis: "0–1 A · Teilung 0,05 A", stellen: 2 }, cText, cLeise, cAkzent, cBg);
    zeichneInstrument({ y0: 635, titel: "Voltmeter (an Lämpchen 1)", einheit: "V", bereich: BEREICH_V, teilung: TEILUNG_V, mittel: 1, beschriftet: 2, wert: zustand.zeigV, hinweis: "0–8 V · Teilung 0,5 V", stellen: 0 }, cText, cLeise, cAkzent, cBg);
  }

  function pfad(punkte, strichFarbe) {
    ctx.strokeStyle = strichFarbe; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }
  function kreisGeraet(x, y, buchstabe, cText, cBg) {
    ctx.fillStyle = cBg; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 15, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(buchstabe, x, y + 1);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  function knoten(x, y, cText) {
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(x, y, 3, 0, 7); ctx.fill();
  }
  function laempchen(x, y, hell, cText, cBg, cAkzent) {
    if (hell > 0.02) {
      ctx.save(); ctx.globalAlpha = 0.10 + 0.32 * hell; ctx.fillStyle = cAkzent;
      ctx.beginPath(); ctx.arc(x, y, 24, 0, 7); ctx.fill(); ctx.restore();
    }
    ctx.fillStyle = cBg; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 14, 0, 7); ctx.fill(); ctx.stroke();
    const d = 14 / Math.SQRT2;
    ctx.beginPath();
    ctx.moveTo(x - d, y - d); ctx.lineTo(x + d, y + d);
    ctx.moveTo(x + d, y - d); ctx.lineTo(x - d, y + d); ctx.stroke();
  }

  function zeichneSchaltung(cText, cLeise, cAkzent, cBg) {
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.fillText("Schaltung", 14, 18);
    ctx.fillStyle = cText; ctx.textAlign = "right"; ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText(zustand.schaltung === "reihe" ? "Reihenschaltung" : "Parallelschaltung", 348, 18);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";

    const hell = zustand.an ? helligkeit(zustand.schaltung) : 0;

    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.strokeRect(18, 70, 70, 96);
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("Netzgerät", 53, 92);
    ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText(komma(U_QUELLE, 0) + " V", 53, 116);
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = zustand.an ? cAkzent : cLeise;
    ctx.fillText(zustand.an ? "EIN" : "AUS", 53, 138);
    ctx.fillStyle = cText; ctx.textAlign = "left"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("+", 92, 84); ctx.fillText("−", 92, 162);

    ctx.font = "11px system-ui, sans-serif";
    if (zustand.schaltung === "reihe") {
      pfad([[88, 76], [104, 76], [104, 56], [136, 56]], cText);
      kreisGeraet(155, 56, "A", cText, cBg);
      pfad([[174, 56], [206, 56]], cText);
      laempchen(226, 56, hell, cText, cBg, cAkzent);
      pfad([[244, 56], [278, 56]], cText);
      laempchen(298, 56, hell, cText, cBg, cAkzent);
      pfad([[316, 56], [332, 56], [332, 188], [104, 188], [104, 160], [88, 160]], cText);
      knoten(206, 56, cText); knoten(244, 56, cText);
      pfad([[206, 56], [206, 104]], cText);
      pfad([[244, 56], [244, 90]], cText);
      pfad([[244, 118], [244, 124], [206, 124]], cText);
      kreisGeraet(244, 104, "V", cText, cBg);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("A — in Reihe", 155, 38);
      ctx.fillText("Lämpchen 1", 226, 38);
      ctx.fillText("Lämpchen 2", 298, 38);
      ctx.textAlign = "left";
      ctx.fillText("misst U an", 150, 100);
      ctx.fillText("Lämpchen 1", 150, 114);
    } else {
      pfad([[88, 76], [104, 76], [104, 56], [136, 56]], cText);
      kreisGeraet(155, 56, "A", cText, cBg);
      pfad([[174, 56], [332, 56]], cText);
      knoten(232, 56, cText); knoten(308, 56, cText);
      pfad([[232, 56], [232, 92]], cText);
      laempchen(232, 106, hell, cText, cBg, cAkzent);
      pfad([[232, 120], [232, 168]], cText);
      pfad([[308, 56], [308, 92]], cText);
      laempchen(308, 106, hell, cText, cBg, cAkzent);
      pfad([[308, 120], [308, 168]], cText);
      knoten(232, 168, cText); knoten(308, 168, cText);
      pfad([[332, 168], [232, 168]], cText);
      pfad([[232, 168], [104, 168], [104, 160], [88, 160]], cText);
      knoten(232, 92, cText); knoten(232, 132, cText);
      pfad([[232, 92], [186, 92], [186, 100]], cText);
      pfad([[186, 128], [186, 132], [232, 132]], cText);
      kreisGeraet(186, 114, "V", cText, cBg);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("A — in Reihe", 155, 38);
      ctx.fillText("Lämpchen 1", 232, 188);
      ctx.fillText("Lämpchen 2", 308, 188);
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, 222); ctx.lineTo(346, 222); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Vielfachmessgeräte — selbst ablesen:", 14, 240);
  }

  function zeichneInstrument(g, cText, cLeise, cAkzent, cBg) {
    const x0 = 180, y0 = g.y0, r = 138, halb = 55 * Math.PI / 180;
    const top = y0 - 162;
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, top, 312, 180, 10); else ctx.rect(24, top, 312, 180);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(g.titel, 36, top + 19);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText(g.hinweis, 324, top + 19);

    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0, y0, r, -Math.PI / 2 - halb, -Math.PI / 2 + halb); ctx.stroke();

    const nTicks = Math.round(g.bereich / g.teilung);
    for (let k = 0; k <= nTicks; k++) {
      const wertK = k * g.teilung;
      const a = -halb + (wertK / g.bereich) * 2 * halb;
      const sa = Math.sin(a), ca = Math.cos(a);
      const beschriftet = istVielfaches(wertK, g.beschriftet), mittel = istVielfaches(wertK, g.mittel);
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
        ctx.fillText(komma(wertK, g.stellen), x0 + (r - 28) * sa, y0 - (r - 28) * ca);
      }
    }
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(g.einheit, x0, y0 - 50);

    const wertZ = Math.min(Math.max(g.wert, 0), g.bereich);
    const az = -halb + (wertZ / g.bereich) * 2 * halb;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x0 - 13 * Math.sin(az), y0 + 13 * Math.cos(az));
    ctx.lineTo(x0 + (r - 20) * Math.sin(az), y0 - (r - 20) * Math.cos(az));
    ctx.stroke();
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(x0, y0, 6, 0, 7); ctx.fill();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>Am Netzgerät (' + komma(U_QUELLE, 0) + ' V) hängen <strong>zwei gleiche Lämpchen</strong> (jedes hat denselben Widerstand). Du kannst sie <strong>in Reihe</strong> (hintereinander) oder <strong>parallel</strong> (nebeneinander) schalten. Das <strong>Amperemeter</strong> liegt in Reihe direkt hinter der Quelle und misst den <strong>Gesamtstrom I</strong>. Das <strong>Voltmeter</strong> liegt parallel zu Lämpchen 1 und misst die <strong>Spannung U an diesem Lämpchen</strong>.</p>',
      '<p><strong>Plan:</strong> Schalte zuerst die Reihenschaltung ein, lies Gesamtstrom und Lampenspannung selbst ab und trag sie ein. Dann baust du auf Parallelschaltung um und misst erneut. Am Ende vergleichst du beide Schaltungen.</p>',
      '<p class="exp-hinweis">⚠ Achte auf die Helligkeit der Lämpchen: Sie verrät dir schon vor dem Ablesen, in welcher Schaltung mehr Strom fließt.</p>',
      '<label for="exp-schaltung"><strong>Schaltung wählen:</strong></label>',
      '<select id="exp-schaltung" class="exp-wahl"><option value="reihe">Reihenschaltung</option><option value="parallel">Parallelschaltung</option></select>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    const wahl = panel.querySelector("#exp-schaltung");
    wahl.value = zustand.schaltung;
    wahl.addEventListener("change", () => {
      zustand.schaltung = wahl.value; zustand.an = false; setzeZiel();
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchführung ----------
  function panelMessen() {
    const s = serie();
    const hatI = s.some(m => m.groesse === "I");
    const hatU = s.some(m => m.groesse === "U");
    const beideVoll = zustand.messungen.reihe.length >= 2 && zustand.messungen.parallel.length >= 2;
    const zeilen = s.length
      ? s.map(m => "<tr><td>" + (m.groesse === "I" ? "Gesamtstrom I" : "Spannung U (Lämpchen 1)") + "</td><td>" + (m.groesse === "I" ? komma(m.wert, 2) + " A" : komma(m.wert, 1) + " V") + "</td></tr>").join("")
      : '<tr><td colspan="2">noch leer</td></tr>';
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<p>Gewählte Schaltung: <strong>' + (zustand.schaltung === "reihe" ? "Reihenschaltung" : "Parallelschaltung") + '</strong> <button class="knopf zweitrangig" id="exp-wechseln">Schaltung wechseln</button></p>',
      '<div class="exp-masseknoepfe"><button class="knopf ' + (zustand.an ? "zweitrangig" : "") + '" id="exp-schalter">' + (zustand.an ? "Netzgerät ausschalten" : "Netzgerät einschalten") + '</button></div>',
      '<p>' + (zustand.an ? "Netzgerät <strong>eingeschaltet</strong> — lies jetzt die Instrumente links ab." : "Netzgerät ist <strong>aus</strong>. Schalte es ein, dann zeigen die Instrumente etwas an.") + '</p>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-groesse">Was liest du gerade ab?</label>',
      '<select id="exp-groesse" class="exp-wahl"><option value="I">Gesamtstrom I am Amperemeter (in A)</option><option value="U">Spannung U an Lämpchen 1 am Voltmeter (in V)</option></select>',
      '<label for="exp-wert" id="exp-wert-label">Wert in A:</label>',
      '<input id="exp-wert" inputmode="decimal" autocomplete="off" size="7" ' + (zustand.an ? "" : "disabled") + '>',
      '<button class="knopf" ' + (zustand.an ? "" : "disabled") + '>In die Tabelle</button>',
      '</form>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<h3>Messtabelle — ' + (zustand.schaltung === "reihe" ? "Reihe" : "Parallel") + '</h3>',
      '<table class="exp-tabelle"><thead><tr><th>Größe</th><th>Messwert</th></tr></thead><tbody>' + zeilen + '</tbody></table>',
      '<p>' + (hatI ? "✓" : "○") + ' Gesamtstrom &nbsp; ' + (hatU ? "✓" : "○") + ' Lampenspannung — beides für diese Schaltung messen.</p>',
      '<button class="knopf" id="exp-weiter2" ' + (beideVoll ? "" : "disabled") + '>Zur Auswertung</button>',
      '<p class="exp-hinweis">' + (beideVoll ? "Beide Schaltungen vollständig gemessen — weiter zur Auswertung." : "Tipp: Erst beide Größen in beiden Schaltungen messen, dann wird die Auswertung freigeschaltet.") + '</p>'
    ].join("");

    const groesseWahl = panel.querySelector("#exp-groesse");
    const wertLabel = panel.querySelector("#exp-wert-label");
    function passeLabelAn() { wertLabel.textContent = "Wert in " + (groesseWahl.value === "I" ? "A" : "V") + ":"; }
    groesseWahl.addEventListener("change", passeLabelAn); passeLabelAn();

    panel.querySelector("#exp-wechseln").addEventListener("click", () => wechslePhase("aufbau"));
    panel.querySelector("#exp-schalter").addEventListener("click", () => {
      zustand.an = !zustand.an; setzeZiel(); panelMessen();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const groesse = groesseWahl.value;
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      if (s.some(m => m.groesse === groesse)) {
        meldung.textContent = "Diese Größe hast du für diese Schaltung schon eingetragen — miss die andere Größe oder wechsle die Schaltung.";
        return;
      }
      if (groesse === "I") {
        const wahr = anzeigeStromA(zustand.schaltung);
        if (!ablesungOk(eingabe, wahr, TOLERANZ_A)) {
          meldung.textContent = "✗ Schau noch einmal aufs Amperemeter: Wo steht der Zeiger? (1 Teilstrich = 0,05 A.)";
          return;
        }
        s.push({ groesse: "I", wert: eingabe });
      } else {
        const wahr = anzeigeSpannungV(zustand.schaltung);
        if (!ablesungOk(eingabe, wahr, TOLERANZ_V)) {
          meldung.textContent = "✗ Das Voltmeter zeigt etwas anderes — lies die Spannung an Lämpchen 1 genau ab (1 Teilstrich = 0,5 V).";
          return;
        }
        s.push({ groesse: "U", wert: eingabe });
      }
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Eingetragen.";
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const r = zustand.messungen.reihe, p = zustand.messungen.parallel;
    const iR = (r.find(m => m.groesse === "I") || {}).wert;
    const uR = (r.find(m => m.groesse === "U") || {}).wert;
    const iP = (p.find(m => m.groesse === "I") || {}).wert;
    const uP = (p.find(m => m.groesse === "U") || {}).wert;
    const z = (v, e, n) => Number.isFinite(v) ? komma(v, n === undefined ? 2 : n) + " " + e : "–";
    const zweigEinzeln = Number.isFinite(uP) ? z(uP / R_LAMPE, "A") : z(gesamtstrom("parallel") / N_LAMPEN, "A");

    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      '<table class="exp-tabelle"><thead><tr><th></th><th>Reihe</th><th>Parallel</th></tr></thead><tbody>',
      '<tr><td>Gesamtstrom I</td><td>' + z(iR, "A") + '</td><td>' + z(iP, "A") + '</td></tr>',
      '<tr><td>Spannung U an Lämpchen 1</td><td>' + z(uR, "V", 1) + '</td><td>' + z(uP, "V", 1) + '</td></tr>',
      '</tbody></table>',
      '<h3>Reihenschaltung</h3>',
      '<p>Du misst an einem Lämpchen nur <strong>' + z(uR, "V", 1) + '</strong> — am zweiten liegt genauso viel an, zusammen ergibt das wieder die Quellenspannung ' + komma(U_QUELLE, 0) + ' V. <strong>Die Teilspannungen addieren sich.</strong> Der Strom ist überall gleich und mit <strong>' + z(iR, "A") + '</strong> klein, weil beide Widerstände hintereinander liegen.</p>',
      '<h3>Parallelschaltung</h3>',
      '<p>An jedem Lämpchen liegt jetzt die <strong>volle Spannung ' + z(uP, "V", 1) + '</strong>. Durch jeden Zweig fließt also derselbe Strom wie bei einem einzelnen Lämpchen, und beide Zweigströme addieren sich: Der Gesamtstrom ist mit <strong>' + z(iP, "A") + '</strong> deutlich größer — und die Lämpchen leuchten heller.</p>',
      '<form id="exp-rechnung" class="exp-ablesen">',
      '<p>Prüfe selbst: Wie groß ist die <strong>Summe der beiden Zweigströme</strong> in der Parallelschaltung? (Jeder Zweig führt halb so viel wie der Gesamtstrom — oder rechne <em>2 · ' + zweigEinzeln + '</em> aus U und R.)</p>',
      '<label for="exp-summe">Summe der Zweigströme in A:</label>',
      '<input id="exp-summe" inputmode="decimal" autocomplete="off" size="7">',
      '<button class="knopf">Prüfen</button>',
      '</form>',
      '<p id="exp-rechnung-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<p class="exp-hinweis"><strong>Regeln:</strong> In der Reihe ist der Strom überall gleich und die Teilspannungen addieren sich. In der Parallelschaltung liegt überall dieselbe Spannung an und die Zweigströme addieren sich.</p>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — wie genau sind deine Werte?</summary><p>Genauer als etwa eine halbe Teilung kann niemand ablesen (±0,025 A bzw. ±0,25 V) — und das auch nur mit Blick senkrecht auf die Skala (Parallaxenfehler). Echte Messgeräte verbrauchen außerdem selbst einen winzigen Strom, und reale Lämpchen ändern ihren Widerstand mit der Temperatur; deshalb stimmen Messung und Rechnung nie ganz exakt überein.</p></details>',
      '<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button><button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button><button class="knopf" id="exp-neustart">Neues Experiment</button></div>'
    ].join("");

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = { reihe: [], parallel: [] };
      zustand.schaltung = "reihe"; zustand.an = false; setzeZiel(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const reihen = [];
      for (const sch of ["reihe", "parallel"]) {
        for (const m of zustand.messungen[sch]) {
          reihen.push([sch === "reihe" ? "Reihe" : "Parallel", m.groesse === "I" ? "Gesamtstrom I in A" : "Spannung U in V", m.wert]);
        }
      }
      csvHerunterladen("reihen-parallel-messwerte.csv", ["Schaltung", "Größe", "Messwert"], reihen);
    });
    panel.querySelector("#exp-rechnung").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-summe").value);
      const soll = Number.isFinite(iP) ? iP : gesamtstrom("parallel");
      const ok = ablesungOk(eingabe, soll, 0.05);
      const ziel = panel.querySelector("#exp-rechnung-meldung");
      if (ok) ziel.textContent = "✓ Genau! Die Summe der Zweigströme ist der Gesamtstrom (rund " + komma(soll, 2) + " A).";
      else ziel.textContent = "✗ Noch nicht: In der Parallelschaltung addieren sich die beiden gleich großen Zweigströme zum Gesamtstrom.";
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  setzeZiel();
  wechslePhase("aufbau");
}
