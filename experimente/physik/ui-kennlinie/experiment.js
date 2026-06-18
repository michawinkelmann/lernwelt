// experiment.js — Interaktives Experiment: U-I-Kennlinien (Klasse 8).
// Realitätsnahe Messpraxis statt fertiger Simulation: Netzgerät einstellen,
// Voltmeter UND Milliamperemeter SELBST an den analogen Skalen ablesen,
// Wertepaare protokollieren und als Kennlinie auswerten. Ohmscher Widerstand
// → Ursprungsgerade (R = 1/Steigung); Glühlampe → gekrümmte Kennlinie, weil
// der Widerstand des Glühdrahts mit der Temperatur wächst.
// Die Zeiger-„Unruhe" ist deterministisch geseedet → TESTS laufen in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Bauteile (Bauteil X ist das Messziel) ----------
export const BAUTEILE = [
  { id: "R100", name: "Ohmscher Widerstand (100 Ω)", kurz: "Widerstand 100 Ω", typ: "widerstand", r: 100 },
  { id: "LAMPE", name: "Glühlampe 12 V", kurz: "Glühlampe", typ: "lampe", r0: 30, beta: 200 },
  { id: "X", name: "Bauteil X (unbekannt)", kurz: "Bauteil X", typ: "widerstand", r: 220, geheim: true }
];

// ---------- Messgeräte und Toleranzen ----------
export const BEREICH_V = 15, TEILUNG_V = 0.5;    // Voltmeter: Endwert, 1 Teilstrich
export const BEREICH_MA = 150, TEILUNG_MA = 5;   // Milliamperemeter
export const TOLERANZ_V = 0.3, TOLERANZ_MA = 3;  // akzeptierte Ablesegenauigkeit
export const U_MAX = 12, U_SCHRITT = 0.5;        // Netzgerät
export const MIN_MESSUNGEN = 6;                  // Wertepaare je Bauteil

// ---------- Modell (exakt, Node-testbar) ----------
// Glühlampe: Der Glühdraht wird mit steigender Leistung heißer, Ansatz
// R = R0 + β·P mit P = U²/R. Das gibt R² − R0·R − β·U² = 0, positive Lösung:
export function widerstandLampe(U, r0 = 30, beta = 200) {
  return (r0 + Math.sqrt(r0 * r0 + 4 * beta * U * U)) / 2; // in Ω
}
// wahrer Strom durch das Bauteil bei Spannung U (in A)
export function stromIdeal(bauteil, U) {
  if (bauteil.typ === "lampe") return U / widerstandLampe(U, bauteil.r0, bauteil.beta);
  return U / bauteil.r;
}

// ---------- Instrumenten-Anzeige: wahrer Wert + geseedete Streuung ----------
export function anzeigeU(U) {
  if (U === 0) return 0; // Zeiger ruht am Anschlag
  return Math.max(0, U + streuung("V:" + U, TEILUNG_V));
}
export function anzeigeImA(bauteil, U) {
  if (U === 0) return 0;
  return Math.max(0, stromIdeal(bauteil, U) * 1000 + streuung("A:" + bauteil.id + ":" + U, TEILUNG_MA));
}

// ---------- Auswertung (rein, Node-testbar) ----------
// Regression durch den Ursprung: beste Steigung m für y = m·x
export function steigungUrsprung(punkte) {
  let sxx = 0, sxy = 0;
  for (const p of punkte) { sxx += p.x * p.x; sxy += p.x * p.y; }
  return sxx > 0 ? sxy / sxx : NaN;
}
// R in Ω aus Messzeilen {u: V, i: mA} über die Ursprungsgerade I = U/R
export function rAusRegression(zeilen) {
  const m = steigungUrsprung(zeilen.map(z => ({ x: z.u, y: z.i }))); // in mA/V
  return Number.isFinite(m) && m > 0 ? 1000 / m : NaN;
}
export function rAusUI(u, imA) { return imA > 0 ? u / (imA / 1000) : NaN; }
export function bewerteR(rGemessen, rWahr) {
  const abw = Math.abs(rGemessen - rWahr) / rWahr * 100;
  if (abw <= 5) return { stufe: "gut", abw };
  if (abw <= 10) return { stufe: "okay", abw };
  return { stufe: "nochmal prüfen", abw };
}
export function toleranzR(rSoll) { return Math.max(2, rSoll * 0.05); } // in Ω

// kleine Zahlhilfe fürs Skalenzeichnen
function istVielfaches(wert, schritt) {
  const q = wert / schritt;
  return Math.abs(q - Math.round(q)) < 1e-9;
}

// ---------- TESTS (laufen in Node, kein document/window nötig) ----------
const T_R100 = BAUTEILE[0], T_LAMPE = BAUTEILE[1], T_X = BAUTEILE[2];
// abgelesene (gestreute) Messreihe U = 2, 4, …, 12 V, wie sie im Versuch entsteht
function gestreuteReihe(bauteil) {
  const zeilen = [];
  for (let n = 4; n <= 24; n += 4) {
    const u = n / 2;
    zeilen.push({ u: anzeigeU(u), i: anzeigeImA(bauteil, u) });
  }
  return zeilen;
}
export const TESTS = [
  { name: "Lampe: Kontrollwert U=12 V → R=185,37 Ω und I=64,7 mA", ok: () => Math.abs(widerstandLampe(12) - 185.37) < 0.01 && Math.abs(stromIdeal(T_LAMPE, 12) * 1000 - 64.7) < 0.05 },
  { name: "Lampe: Kontrollwert U=2 V → I=42,5 mA", ok: () => Math.abs(stromIdeal(T_LAMPE, 2) * 1000 - 42.5) < 0.05 },
  { name: "Lampe: R(U) monoton steigend, R(0)=R0=30 Ω", ok: () => { if (Math.abs(widerstandLampe(0) - 30) > 1e-12) return false; for (let n = 0; n < 48; n++) if (widerstandLampe((n + 1) / 4) <= widerstandLampe(n / 4)) return false; return true; } },
  { name: "Lampe: I stetig bei 0 (I → U/R0)", ok: () => stromIdeal(T_LAMPE, 0) === 0 && Math.abs(stromIdeal(T_LAMPE, 1e-6) - 1e-6 / 30) < 1e-12 },
  { name: "Ohmsche Bauteile exakt linear (100 Ω und Bauteil X = 220 Ω)", ok: () => Math.abs(stromIdeal(T_R100, 6) - 0.06) < 1e-15 && Math.abs(stromIdeal(T_X, 11) - 0.05) < 1e-15 && [1, 3, 7, 12].every(u => Math.abs(stromIdeal(T_R100, u) - u / 100) < 1e-15) },
  { name: "Regression durch Ursprung: perfekte Reihe → exakt R", ok: () => [T_R100, T_X].every(b => { const zeilen = [1, 2, 4, 6, 9, 12].map(u => ({ u, i: stromIdeal(b, u) * 1000 })); return Math.abs(rAusRegression(zeilen) - b.r) < 1e-9; }) },
  { name: "Anzeige-Streuung höchstens 1 Teilung (alle U, alle Bauteile)", ok: () => { for (let n = 0; n <= 24; n++) { const u = n / 2; if (Math.abs(anzeigeU(u) - u) > TEILUNG_V) return false; for (const b of BAUTEILE) if (Math.abs(anzeigeImA(b, u) - stromIdeal(b, u) * 1000) > TEILUNG_MA) return false; } return true; } },
  { name: "Anzeige deterministisch", ok: () => anzeigeU(7.5) === anzeigeU(7.5) && anzeigeImA(T_LAMPE, 7.5) === anzeigeImA(T_LAMPE, 7.5) },
  { name: "parseDezimal und Ablese-Toleranzen (±0,3 V / ±3 mA)", ok: () => parseDezimal("4,5") === 4.5 && parseDezimal("4.5") === 4.5 && Number.isNaN(parseDezimal("vier")) && ablesungOk(4.2, 4.4, TOLERANZ_V) && !ablesungOk(4.0, 4.4, TOLERANZ_V) && ablesungOk(62, 64.7, TOLERANZ_MA) && !ablesungOk(61, 64.7, TOLERANZ_MA) && !ablesungOk(NaN, 5, TOLERANZ_MA) },
  { name: "R aus U und I (Lampenauswertung)", ok: () => Math.abs(rAusUI(12, stromIdeal(T_LAMPE, 12) * 1000) - widerstandLampe(12)) < 1e-9 && Math.abs(rAusUI(2, 42.5) - 47.06) < 0.1 && Number.isNaN(rAusUI(2, 0)) },
  { name: "Bewertung: bis 5 % gut", ok: () => bewerteR(104, 100).stufe === "gut" && bewerteR(210, 220).stufe === "gut" && bewerteR(92, 100).stufe === "okay" && bewerteR(130, 100).stufe === "nochmal prüfen" },
  { name: "Gestreute Messreihe → R auf 5 % genau", ok: () => [T_R100, T_X].every(b => Math.abs(rAusRegression(gestreuteReihe(b)) - b.r) / b.r < 0.05) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    bauteil: BAUTEILE[0],
    u: 0,                                      // Drehknopf-Einstellung in V
    zeigU: 0, zeigI: 0,                        // aktuell gezeichnete Zeigerwerte
    vonU: 0, vonI: 0, zielU: 0, zielI: 0, animStart: 0,
    messungen: { R100: [], LAMPE: [], X: [] }, // je Bauteil: {einstellung, u, i}
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
      <canvas id="exp-canvas" width="360" height="640" aria-label="Versuchsaufbau: Schaltskizze mit Netzgerät, Bauteil, Amperemeter in Reihe und Voltmeter parallel; darunter die beiden analogen Zeigerinstrumente."></canvas>
    </div>
    <div class="exp-rechts" id="exp-panel"></div>`;
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  function serie() { return zustand.messungen[zustand.bauteil.id]; }

  // ---------- Zeigerbewegung (sanft, außer bei reduzierter Bewegung) ----------
  function setzeZiel() {
    zustand.zielU = anzeigeU(zustand.u);
    zustand.zielI = anzeigeImA(zustand.bauteil, zustand.u);
    zustand.vonU = zustand.zeigU; zustand.vonI = zustand.zeigI;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.zeigU = zustand.zielU; zustand.zeigI = zustand.zielI; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 400);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeigU = zustand.vonU + (zustand.zielU - zustand.vonU) * e;
    zustand.zeigI = zustand.vonI + (zustand.zielI - zustand.vonI) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cBg = farbe("--bg", "#fff");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    zeichneSchaltung(cText, cLeise, cAkzent, cBg);
    zeichneInstrument({ y0: 414, titel: "Voltmeter", einheit: "V", bereich: BEREICH_V, teilung: TEILUNG_V, mittel: 1, beschriftet: 5, wert: zustand.zeigU, hinweis: "0–15 V · Teilung 0,5 V" }, cText, cLeise, cAkzent, cBg);
    zeichneInstrument({ y0: 619, titel: "Milliamperemeter", einheit: "mA", bereich: BEREICH_MA, teilung: TEILUNG_MA, mittel: 10, beschriftet: 50, wert: zustand.zeigI, hinweis: "0–150 mA · Teilung 5 mA" }, cText, cLeise, cAkzent, cBg);
  }

  function pfad(punkte, strichFarbe) {
    ctx.strokeStyle = strichFarbe; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }
  function kreisGeraet(x, y, buchstabe, cText, cBg) {
    ctx.fillStyle = cBg; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, 20, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(buchstabe, x, y + 1);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  function knoten(x, y, cText) {
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
  }

  function zeichneSchaltung(cText, cLeise, cAkzent, cBg) {
    const b = zustand.bauteil;
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.fillText("Schaltung", 12, 20);

    // Netzgerät mit Drehknopf (Knopfstellung zeigt die Einstellung)
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.strokeRect(20, 80, 78, 90);
    ctx.fillStyle = cText; ctx.textAlign = "center";
    ctx.fillText("Netzgerät", 59, 100); ctx.fillText("0–12 V", 59, 117);
    ctx.beginPath(); ctx.arc(59, 144, 12, 0, 7); ctx.stroke();
    const kw = (-120 + 240 * zustand.u / U_MAX) * Math.PI / 180;
    ctx.beginPath(); ctx.moveTo(59, 144); ctx.lineTo(59 + 10 * Math.sin(kw), 144 - 10 * Math.cos(kw)); ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillText("+", 103, 90); ctx.fillText("−", 103, 150);

    // Leitungen: Reihenschaltung über das Amperemeter zum Bauteil und zurück
    pfad([[98, 95], [118, 95], [118, 38], [165, 38]], cText);
    kreisGeraet(185, 38, "A", cText, cBg);
    pfad([[205, 38], [322, 38], [322, 88]], cText);
    pfad([[322, 162], [322, 200], [118, 200], [118, 155], [98, 155]], cText);

    // Bauteil zwischen den Knotenpunkten
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    if (b.typ === "lampe") {
      pfad([[322, 88], [322, 108]], cText); pfad([[322, 142], [322, 162]], cText);
      ctx.beginPath(); ctx.arc(322, 125, 17, 0, 7); ctx.stroke();
      const d = 17 / Math.SQRT2;
      ctx.beginPath(); ctx.moveTo(322 - d, 125 - d); ctx.lineTo(322 + d, 125 + d);
      ctx.moveTo(322 + d, 125 - d); ctx.lineTo(322 - d, 125 + d); ctx.stroke();
    } else {
      pfad([[322, 88], [322, 96]], cText); pfad([[322, 150], [322, 162]], cText);
      ctx.strokeRect(308, 96, 28, 54);
      ctx.fillStyle = cText; ctx.textAlign = "center";
      ctx.fillText(b.geheim ? "?" : "", 322, 127);
      ctx.textAlign = "left";
    }

    // Voltmeter parallel zum Bauteil
    pfad([[322, 88], [262, 88], [262, 105]], cText);
    pfad([[262, 145], [262, 162], [322, 162]], cText);
    kreisGeraet(262, 125, "V", cText, cBg);
    knoten(322, 88, cText); knoten(322, 162, cText);

    // Beschriftungen
    ctx.fillStyle = cLeise; ctx.textAlign = "center";
    ctx.fillText("Amperemeter — in Reihe", 185, 74);
    ctx.fillText("Voltmeter — parallel", 230, 186);
    ctx.fillStyle = cText; ctx.textAlign = "right";
    ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("Bauteil: " + b.kurz, 350, 26);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
  }

  // analoges Zeigerinstrument: Skalenbogen, Teilstriche, Beschriftung, Zeiger
  function zeichneInstrument(g, cText, cLeise, cAkzent, cBg) {
    const x0 = 180, y0 = g.y0, r = 146, halb = 55 * Math.PI / 180;
    const top = y0 - 170;
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(24, top, 312, 188, 10); else ctx.rect(24, top, 312, 188);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText(g.titel, 36, top + 20);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
    ctx.fillText(g.hinweis, 324, top + 20);

    // Skalenbogen
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x0, y0, r, -Math.PI / 2 - halb, -Math.PI / 2 + halb); ctx.stroke();

    // Teilstriche und Zahlen
    const nTicks = Math.round(g.bereich / g.teilung);
    for (let k = 0; k <= nTicks; k++) {
      const wertK = k * g.teilung;
      const a = -halb + (wertK / g.bereich) * 2 * halb;
      const sa = Math.sin(a), ca = Math.cos(a);
      const beschriftet = istVielfaches(wertK, g.beschriftet), mittel = istVielfaches(wertK, g.mittel);
      const len = beschriftet ? 16 : mittel ? 11 : 6;
      ctx.strokeStyle = beschriftet ? cText : cLeise;
      ctx.lineWidth = beschriftet ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(x0 + (r - len) * sa, y0 - (r - len) * ca);
      ctx.lineTo(x0 + r * sa, y0 - r * ca);
      ctx.stroke();
      if (beschriftet) {
        ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
        ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(String(wertK), x0 + (r - 30) * sa, y0 - (r - 30) * ca);
      }
    }
    // Einheit
    ctx.fillStyle = cText; ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText(g.einheit, x0, y0 - 52);

    // Zeiger + Drehpunkt
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
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Ein regelbares <strong>Netzgerät</strong> (0–12 V) treibt den Strom durch das Bauteil. Das <strong>Amperemeter</strong> hängt <strong>in Reihe</strong>: Durch es fließt derselbe Strom wie durch das Bauteil. Das <strong>Voltmeter</strong> hängt <strong>parallel</strong> zum Bauteil und misst die Spannung, die direkt daran anliegt.</p>
      <p><strong>Plan:</strong> Spannung schrittweise hochdrehen, bei jeder Einstellung <em>beide</em> Zeigerinstrumente selbst ablesen und das Wertepaar (U, I) eintragen. Mindestens ${MIN_MESSUNGEN} Wertepaare je Bauteil — daraus entsteht in der Auswertung die <strong>U-I-Kennlinie</strong>.</p>
      <p class="exp-hinweis">⚠ Wie im echten Aufbau gilt: Ein Amperemeter hat fast keinen Eigenwiderstand — <em>nie</em> parallel zur Quelle schalten, das wäre ein Kurzschluss. Erst die Schaltung prüfen, dann einschalten!</p>
      <label for="exp-bauteil"><strong>Bauteil wählen:</strong></label>
      <select id="exp-bauteil" class="exp-wahl">${BAUTEILE.map((b, i) => `<option value="${i}">${esc(b.name)}</option>`).join("")}</select>
      <p>Tipp: Starte mit dem 100-Ω-Widerstand und prüfe, ob deine Messung zum Aufdruck passt. Miss danach die Glühlampe — und zum Schluss verrät dir die Kennlinie, was in Bauteil X steckt.</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    const wahl = panel.querySelector("#exp-bauteil");
    wahl.value = String(BAUTEILE.indexOf(zustand.bauteil));
    wahl.addEventListener("change", ev => {
      zustand.bauteil = BAUTEILE[Number(ev.target.value)];
      zustand.u = 0; // beim Umbauen wird das Netzgerät heruntergedreht
      setzeZiel();
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchführung ----------
  function panelMessen() {
    const b = zustand.bauteil, s = serie();
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <p>Im Stromkreis: <strong>${esc(b.name)}</strong> <button class="knopf zweitrangig" id="exp-wechseln">Bauteil wechseln</button></p>
      <div class="exp-regler">
        <label for="exp-u">Netzgerät-Drehknopf: <span id="exp-u-live">${komma(zustand.u, 1)}&nbsp;V</span></label>
        <input type="range" id="exp-u" min="0" max="${U_MAX}" step="${U_SCHRITT}" value="${zustand.u}">
      </div>
      <p>Lies jetzt <strong>beide</strong> Instrumente links ab — Spannung auf 0,1 V, Stromstärke auf 1 mA geschätzt:</p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-uab">U in V:</label>
        <input id="exp-uab" inputmode="decimal" autocomplete="off">
        <label for="exp-iab">I in mA:</label>
        <input id="exp-iab" inputmode="decimal" autocomplete="off">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Messtabelle — ${esc(b.kurz)}</h3>
      <table class="exp-tabelle"><thead><tr><th>U in V</th><th>I in mA</th></tr></thead>
      <tbody>${s.map(z => `<tr><td>${komma(z.u, 1)}</td><td>${komma(z.i, 1)}</td></tr>`).join("") || '<tr><td colspan="2">noch leer</td></tr>'}</tbody></table>
      <p>${s.length} von mindestens ${MIN_MESSUNGEN} Messungen für dieses Bauteil.</p>
      <button class="knopf" id="exp-weiter2" ${s.length >= MIN_MESSUNGEN ? "" : "disabled"}>Zur Auswertung</button>`;
    panel.querySelector("#exp-wechseln").addEventListener("click", () => wechslePhase("aufbau"));
    panel.querySelector("#exp-u").addEventListener("input", ev => {
      zustand.u = Number(ev.target.value);
      panel.querySelector("#exp-u-live").innerHTML = komma(zustand.u, 1) + "&nbsp;V";
      setzeZiel();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const uAb = parseDezimal(panel.querySelector("#exp-uab").value);
      const iAb = parseDezimal(panel.querySelector("#exp-iab").value);
      if (s.some(z => z.einstellung === zustand.u)) {
        meldung.textContent = "Bei dieser Knopfstellung hast du schon gemessen — dreh auf einen anderen Wert.";
        return;
      }
      const wahrU = anzeigeU(zustand.u), wahrI = anzeigeImA(zustand.bauteil, zustand.u);
      if (!ablesungOk(uAb, wahrU, TOLERANZ_V)) {
        meldung.textContent = "✗ Schau noch einmal genau aufs Voltmeter: Wo steht der Zeiger? (1 Teilstrich = 0,5 V.)";
        return;
      }
      if (!ablesungOk(iAb, wahrI, TOLERANZ_MA)) {
        meldung.textContent = "✗ Das Milliamperemeter zeigt etwas anderes — zähl die Teilstriche nach (1 Teilstrich = 5 mA).";
        return;
      }
      s.push({ einstellung: zustand.u, u: uAb, i: iAb });
      s.sort((z1, z2) => z1.einstellung - z2.einstellung);
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Wertepaar eingetragen — stell die nächste Spannung ein.";
    });
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const m = zustand.messungen;
    let html = `
      <h2>Auswertung</h2>
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="U-I-Diagramm mit deinen Messpunkten: je Bauteil ein eigenes Punktsymbol, bei ohmschen Bauteilen zusätzlich eine gestrichelte Ursprungsgerade."></canvas>`;
    for (const b of BAUTEILE) {
      const s = m[b.id];
      if (!s.length) continue;
      if (b.typ === "widerstand") {
        const r = rAusRegression(s);
        if (!Number.isFinite(r)) continue;
        const bew = bewerteR(r, b.r);
        html += `
      <h3>${esc(b.kurz)}: eine Gerade durch den Ursprung</h3>
      <p>Die Punkte liegen auf einer Ursprungsgeraden — <strong>I ist proportional zu U</strong>. Die Regression durch den Ursprung liefert R = 1/Steigung = <strong>${komma(r, 1)} Ω</strong>${b.geheim ? "" : ` (Aufdruck: ${b.r} Ω)`} — Abweichung ${komma(bew.abw, 1)} %: <strong>${bew.stufe}</strong>.${b.geheim ? ` Damit ist das Geheimnis gelüftet: In der schwarzen Box steckt ein <strong>${b.r}-Ω-Widerstand</strong>.` : ""}</p>`;
      } else {
        const sg = s.filter(z => z.u > 0 && z.i > 0);
        if (sg.length < 2) continue;
        const minz = sg[0], maxz = sg[sg.length - 1];
        html += `
      <h3>Glühlampe: keine Gerade!</h3>
      <p>Berechne den Widerstand R = U/I an den Enden deiner Messreihe (rechne I zuerst in A um: 1 mA = 0,001 A) und runde auf ganze Ω:</p>
      <form id="exp-lampe" class="exp-ablesen">
        <label for="exp-rklein">R bei U = ${komma(minz.u, 1)} V (I = ${komma(minz.i, 1)} mA):</label>
        <input id="exp-rklein" inputmode="decimal" autocomplete="off"> Ω
        <label for="exp-rgross">R bei U = ${komma(maxz.u, 1)} V (I = ${komma(maxz.i, 1)} mA):</label>
        <input id="exp-rgross" inputmode="decimal" autocomplete="off"> Ω
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-lampe-meldung" class="exp-meldung" aria-live="polite"></p>
      <div id="exp-erkenntnis"></div>`;
      }
    }
    const fehlt = BAUTEILE.filter(b => !m[b.id].length);
    if (fehlt.length) html += `
      <p>Noch nicht gemessen: <strong>${fehlt.map(b => esc(b.kurz)).join(", ")}</strong>. Geh über „Mehr Messungen" → „Bauteil wechseln" zurück — erst der Vergleich macht die Kennlinien spannend.</p>`;
    html += `
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV herunterladen</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — wie genau sind deine Werte?</summary>
        <p><strong>Ablesefehler:</strong> Genauer als etwa eine halbe Teilung (±0,25 V bzw. ±2,5 mA) kann niemand ablesen — und auch das nur mit Blick senkrecht auf die Skala (Parallaxenfehler!).</p>
        <p><strong>Instrumentenklasse:</strong> Schulmessgeräte sind oft „Klasse 1,5": Die Anzeige darf um 1,5 % des <em>Endwerts</em> falsch sein — hier also ±0,23 V bzw. ±2,3 mA, egal wo der Zeiger steht. Deshalb misst man möglichst im oberen Skalendrittel.</p>
        <p><strong>Eigenverbrauch der Messgeräte (Ausblick):</strong> Das Voltmeter zieht selbst einen winzigen Strom, das Amperemeter hat einen kleinen Eigenwiderstand. Bei sehr genauen Messungen unterscheidet man deshalb „stromrichtige" und „spannungsrichtige" Schaltung — dazu in einer höheren Klasse mehr.</p>
      </details>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.innerHTML = html;
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = { R100: [], LAMPE: [], X: [] };
      zustand.bauteil = BAUTEILE[0]; zustand.u = 0;
      setzeZiel(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const zeilen = [];
      for (const b of BAUTEILE) for (const z of zustand.messungen[b.id]) zeilen.push([b.kurz, z.u, z.i]);
      csvHerunterladen("ui-kennlinie-messwerte.csv", ["Bauteil", "U in V", "I in mA"], zeilen);
    });
    const lampeForm = panel.querySelector("#exp-lampe");
    if (lampeForm) lampeForm.addEventListener("submit", ev => {
      ev.preventDefault();
      const sg = zustand.messungen.LAMPE.filter(z => z.u > 0 && z.i > 0);
      const minz = sg[0], maxz = sg[sg.length - 1];
      const rkSoll = rAusUI(minz.u, minz.i), rgSoll = rAusUI(maxz.u, maxz.i);
      const rk = parseDezimal(panel.querySelector("#exp-rklein").value);
      const rg = parseDezimal(panel.querySelector("#exp-rgross").value);
      const okK = ablesungOk(rk, rkSoll, toleranzR(rkSoll));
      const okG = ablesungOk(rg, rgSoll, toleranzR(rgSoll));
      panel.querySelector("#exp-lampe-meldung").textContent =
        `R(${komma(minz.u, 1)} V): ${okK ? "✓ passt" : "✗ stimmt noch nicht"} · R(${komma(maxz.u, 1)} V): ${okG ? "✓ passt" : "✗ stimmt noch nicht"}` +
        (okK && okG ? "" : " — Tipp: R = U/I, die Stromstärke vorher durch 1000 teilen (mA → A).");
      panel.querySelector("#exp-erkenntnis").innerHTML = okK && okG ? `
        <p class="exp-hinweis">Von ${komma(rkSoll, 0)} Ω auf ${komma(rgSoll, 0)} Ω: <strong>Der Widerstand der Glühlampe wächst mit der Temperatur des Glühdrahts.</strong> Genau deshalb ist ihre Kennlinie keine Gerade — das ohmsche Gesetz gilt nur, solange die Temperatur konstant bleibt.</p>` : "";
    });
    zeichneDiagramm();
  }

  // U-I-Diagramm: Messpunkte je Bauteil in eigenem Stil + Ursprungsgeraden
  function zeichneDiagramm() {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 54, Re = W - 16, O = 18, Un = H - 42;
    const alle = BAUTEILE.map(b => ({ b, s: zustand.messungen[b.id] })).filter(e => e.s.length);
    const uMax = 13;
    const iMax = Math.max(30, ...alle.map(e => Math.max(...e.s.map(z => z.i)))) * 1.12;
    const X = u => L + (u / uMax) * (Re - L);
    const Y = i => Un - (i / iMax) * (Un - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif"; c.textBaseline = "alphabetic"; c.lineWidth = 1;
    const iSchritt = iMax > 100 ? 25 : iMax > 50 ? 10 : 5;
    for (let i = 0; i <= iMax; i += iSchritt) {
      c.strokeStyle = i === 0 ? cText : cLeise;
      c.beginPath(); c.moveTo(L, Y(i)); c.lineTo(Re, Y(i)); c.stroke();
      c.fillStyle = cText; c.textAlign = "right"; c.fillText(String(i), L - 6, Y(i) + 4);
    }
    for (let u = 0; u <= 12; u += 2) {
      c.strokeStyle = u === 0 ? cText : cLeise;
      c.beginPath(); c.moveTo(X(u), O); c.lineTo(X(u), Un); c.stroke();
      c.fillStyle = cText; c.textAlign = "center"; c.fillText(String(u), X(u), Un + 16);
    }
    c.fillStyle = cText; c.textAlign = "left";
    c.fillText("I in mA", 8, 13); c.fillText("U in V", W - 56, H - 6);
    // gestrichelte Ursprungsgeraden der ohmschen Bauteile
    for (const e of alle) {
      if (e.b.typ !== "widerstand" || e.s.length < 2) continue;
      const r = rAusRegression(e.s);
      if (!Number.isFinite(r)) continue;
      const uEnd = Math.min(12.6, iMax * r / 1000);
      c.strokeStyle = cLeise; c.lineWidth = 1.5; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(uEnd), Y(uEnd / r * 1000)); c.stroke();
      c.setLineDash([]);
    }
    // dünne Verbindungslinie der Lampenpunkte (Krümmung sichtbar machen)
    const lampe = alle.find(e => e.b.typ === "lampe");
    if (lampe && lampe.s.length >= 2) {
      c.strokeStyle = cLeise; c.lineWidth = 1.5; c.beginPath();
      lampe.s.forEach((z, i) => i === 0 ? c.moveTo(X(z.u), Y(z.i)) : c.lineTo(X(z.u), Y(z.i)));
      c.stroke();
    }
    // Messpunkte: Kreis (100 Ω, Akzentfarbe), offenes Quadrat (Lampe), Dreieck (X)
    function marker(e, x, y) {
      if (e.b.id === "R100") { c.fillStyle = cAkzent; c.beginPath(); c.arc(x, y, 5, 0, 7); c.fill(); }
      else if (e.b.id === "LAMPE") { c.strokeStyle = cText; c.lineWidth = 2; c.strokeRect(x - 4.5, y - 4.5, 9, 9); }
      else { c.fillStyle = cText; c.beginPath(); c.moveTo(x, y - 5.5); c.lineTo(x + 5.5, y + 4.5); c.lineTo(x - 5.5, y + 4.5); c.closePath(); c.fill(); }
    }
    for (const e of alle) for (const z of e.s) marker(e, X(z.u), Y(z.i));
    // Legende
    let ly = O + 12;
    c.font = "12px system-ui, sans-serif"; c.textAlign = "left";
    for (const e of alle) {
      marker(e, L + 14, ly - 4);
      c.fillStyle = cText; c.fillText(e.b.kurz, L + 26, ly);
      ly += 18;
    }
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
