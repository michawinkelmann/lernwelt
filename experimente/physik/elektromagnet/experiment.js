// experiment.js — Interaktives Experiment: Elektromagnet — Magnetkraft und Stromstärke (Klasse 9/10).
// Realitätsnahe Messpraxis statt fertiger Simulation: An einem Elektromagneten
// (Spule mit Eisenkern, feste Windungszahl) wird die Stromstaerke I am
// Netzgeraet eingestellt. Die Magnetkraft wird NICHT als Zahl vorgegeben,
// sondern als ANZAHL gehaltener Bueroklammern abgelesen: Die Schuelerin/der
// Schueler zaehlt die am Kern haengenden Bueroklammern SELBST und traegt sie ein.
// Entdeckung: Bei fester Windungszahl ist die Magnetkraft (Anzahl Bueroklammern)
// proportional zur Stromstaerke I -> Anzahl = k * I mit k = 6 Klammern je Ampere.
// Modell exakt ganzzahlig (round) -> Zaehlen ist eindeutig, TESTS laufen in Node.

import {
  parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Daten (rein, Node-testbar) ----------
export const WINDUNGEN = 400;        // feste Windungszahl der Spule
export const K_KLAMMERN = 6;         // gehaltene Bueroklammern je Ampere
export const I_WERTE = [0.5, 1.0, 1.5, 2.0]; // einstellbare Stromstaerken in A
export const I_MAX_ANZEIGE = 2.5;    // Endwert der Strom-Anzeige in A (Modellbereich)
export const MIN_MESSUNGEN = 4;      // Messreihen vor der Auswertung

// ---------- Physik (exakt, ganzzahlig) ----------
// Bei fester Windungszahl und nicht zu grossem Strom: Kraft ~ I.
// Anzahl gehaltener Bueroklammern = round(k * I). Dadurch eindeutig abzaehlbar.
export function anzahlKlammern(I, k = K_KLAMMERN) {
  if (!Number.isFinite(I) || I <= 0) return 0;
  return Math.round(k * I);
}

// ---------- Auswertung (rein, Node-testbar) ----------
// Quotient Anzahl / I sollte ungefaehr konstant (= k) sein.
export function quotient(anzahl, I) {
  return I > 0 ? anzahl / I : NaN;
}
// beste Steigung k einer Ursprungsgeraden Anzahl = k * I aus Messzeilen {i, n}
export function steigungUrsprung(zeilen) {
  let sxx = 0, sxy = 0;
  for (const z of zeilen) { sxx += z.i * z.i; sxy += z.i * z.n; }
  return sxx > 0 ? sxy / sxx : NaN;
}
export function bewerteAblesung(eingabe, wahr) {
  return ablesungOk(eingabe, wahr, 0); // Bueroklammern: exakt ganzzahlig, Toleranz 0
}

// ---------- TESTS (laufen in Node, kein document/window noetig) ----------
export const TESTS = [
  { name: "I=0,5 A -> 3 Bueroklammern", ok: () => anzahlKlammern(0.5) === 3 },
  { name: "I=1,0 A -> 6 Bueroklammern", ok: () => anzahlKlammern(1.0) === 6 },
  { name: "I=1,5 A -> 9 Bueroklammern", ok: () => anzahlKlammern(1.5) === 9 },
  { name: "I=2,0 A -> 12 Bueroklammern", ok: () => anzahlKlammern(2.0) === 12 },
  { name: "Strom verdoppeln -> Anzahl verdoppelt (1,0->2,0 A)", ok: () => anzahlKlammern(2.0) === 2 * anzahlKlammern(1.0) },
  { name: "Unabhaengige Nachrechnung: Anzahl = round(6*I) fuer alle I-Werte", ok: () => I_WERTE.every(I => anzahlKlammern(I) === Math.round(6 * I)) },
  { name: "Kein Strom -> keine Bueroklammern (I=0 und negativ)", ok: () => anzahlKlammern(0) === 0 && anzahlKlammern(-1) === 0 },
  { name: "Deterministisch: gleicher Strom -> immer gleiche Anzahl", ok: () => anzahlKlammern(1.5) === anzahlKlammern(1.5) && anzahlKlammern(2.0) === anzahlKlammern(2.0) },
  { name: "Proportionalitaet: Quotient Anzahl/I konstant = 6", ok: () => I_WERTE.every(I => Math.abs(quotient(anzahlKlammern(I), I) - K_KLAMMERN) < 1e-12) },
  { name: "Steigung der Ursprungsgeraden = k = 6", ok: () => Math.abs(steigungUrsprung(I_WERTE.map(I => ({ i: I, n: anzahlKlammern(I) }))) - K_KLAMMERN) < 1e-12 },
  { name: "Ablesung exakt (Toleranz 0): 9 ok, 8 falsch", ok: () => bewerteAblesung(9, 9) && !bewerteAblesung(8, 9) && !bewerteAblesung(NaN, 9) },
  { name: "Monotonie: mehr Strom haelt nie weniger Klammern", ok: () => { let v = -1; for (const I of I_WERTE) { const a = anzahlKlammern(I); if (a < v) return false; v = a; } return true; } },
  { name: "parseDezimal: Komma und Punkt", ok: () => parseDezimal("1,5") === 1.5 && parseDezimal("1.5") === 1.5 && Number.isNaN(parseDezimal("viel")) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    iIndex: 1,            // Index in I_WERTE (Start: 1,0 A, damit Klammern sichtbar)
    an: true,             // Netzgeraet eingeschaltet
    zeigKlammern: 0,      // aktuell gezeichnete Anzahl (fuer sanftes Wachsen)
    von: 0, ziel: 0, animStart: 0,
    messungen: [],        // [{ i, n }]
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
    '<canvas id="exp-canvas" width="360" height="600" aria-label="Elektromagnet: Netzgerät mit digitaler Stromanzeige, darunter eine senkrechte Spule mit Eisenkern; am unteren Kernende hängt eine Kette von Büroklammern, deren Anzahl von der Stromstärke abhängt."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  function aktI() { return I_WERTE[zustand.iIndex]; }
  function zielKlammern() { return zustand.an ? anzahlKlammern(aktI()) : 0; }

  // ---------- sanftes Wachsen der Klammer-Kette ----------
  function setzeZiel() {
    zustand.ziel = zielKlammern();
    zustand.von = zustand.zeigKlammern;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.zeigKlammern = zustand.ziel; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 450);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeigKlammern = zustand.von + (zustand.ziel - zustand.von) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cBg = farbe("--bg", "#fff");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    zeichneNetzgeraet(cText, cLeise, cAkzent, cBg);
    zeichneElektromagnet(cText, cLeise, cAkzent, cBg);
    zeichneKlammern(cText, cLeise, cAkzent, cBg);
  }

  function pfad(punkte, strichFarbe, breite) {
    ctx.strokeStyle = strichFarbe; ctx.lineWidth = breite || 2;
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }

  // Netzgeraet mit digitaler Stromanzeige (I als konkrete Zahl ablesbar)
  function zeichneNetzgeraet(cText, cLeise, cAkzent, cBg) {
    ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Elektromagnet", 14, 18);
    ctx.fillStyle = cText; ctx.textAlign = "right"; ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText(WINDUNGEN + " Windungen", 346, 18);
    ctx.textAlign = "left"; ctx.font = "12px system-ui, sans-serif";

    // Geraetebox
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(40, 32, 280, 78, 8); else ctx.rect(40, 32, 280, 78);
    ctx.stroke();
    ctx.fillStyle = cText; ctx.textAlign = "left"; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Netzgerät (Stromstärke einstellbar)", 54, 50);

    // digitale Stromanzeige (dunkles Feld, helle Zahl)
    const dx = 54, dy = 60, dw = 132, dh = 38;
    ctx.fillStyle = cText;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(dx, dy, dw, dh, 5); else ctx.rect(dx, dy, dw, dh);
    ctx.fill();
    ctx.fillStyle = cBg;
    ctx.font = "bold 22px system-ui, sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText(komma(zustand.an ? aktI() : 0, 1), dx + dw - 34, dy + dh / 2);
    ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("A", dx + dw - 26, dy + dh / 2 + 1);

    // EIN/AUS-Marke
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = zustand.an ? cAkzent : cLeise;
    ctx.fillText(zustand.an ? "Strom EIN" : "Strom AUS", 202, 72);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Anzeige der", 202, 88);
    ctx.fillText("Stromstärke I", 202, 100);

    // Anschluesse + Leitungen zur Spule
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("+", 60, 124); ctx.fillText("−", 290, 124);
    pfad([[64, 110], [64, 132], [150, 132], [150, 150]], cText);
    pfad([[294, 110], [294, 132], [210, 132], [210, 150]], cText);
  }

  // Spule (Wicklung) mit senkrechtem Eisenkern; Kern ragt unten heraus
  function zeichneElektromagnet(cText, cLeise, cAkzent, cBg) {
    const cx = 180;                 // Mittelachse
    const spulenOben = 150, spulenUnten = 286;
    const kernHalb = 13;            // halbe Kernbreite
    const spulHalb = 30;            // halbe Wicklungsbreite

    // Eisenkern (durchgehend, unten herausragend bis zum Pol)
    const kernUnten = 318;
    ctx.fillStyle = cBg; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(cx - kernHalb, spulenOben - 8, 2 * kernHalb, (kernUnten - (spulenOben - 8)));
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "middle";
    ctx.fillText("Eisenkern", cx + spulHalb + 16, (spulenOben + spulenUnten) / 2 - 16);

    // Wicklung als Reihe von Ringen (stilisierte Spule) um den Kern
    const anReihen = 9;
    const schritt = (spulenUnten - spulenOben) / anReihen;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
    for (let r = 0; r < anReihen; r++) {
      const y = spulenOben + r * schritt + schritt / 2;
      ctx.beginPath();
      ctx.ellipse(cx, y, spulHalb, schritt * 0.42, 0, 0, Math.PI * 2);
      ctx.stroke();
    }
    // Zuleitungen an die Wicklung (oben links, oben rechts)
    pfad([[150, 150], [cx - spulHalb, spulenOben + schritt * 0.4]], cAkzent, 3);
    pfad([[210, 150], [cx + spulHalb, spulenOben + schritt * 0.4]], cAkzent, 3);

    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "middle";
    ctx.fillText("Spule", cx - spulHalb - 14, (spulenOben + spulenUnten) / 2 - 16);

    // Polflaeche (unteres Kernende)
    ctx.fillStyle = cText;
    ctx.fillRect(cx - kernHalb - 4, kernUnten - 4, 2 * kernHalb + 8, 5);
  }

  // Kette der gehaltenen Bueroklammern (Anzahl = Magnetkraft), eindeutig abzaehlbar
  function zeichneKlammern(cText, cLeise, cAkzent, cBg) {
    const cx = 180;
    const startY = 326;            // erste Klammer haengt knapp unter dem Pol
    const n = Math.round(zustand.zeigKlammern);
    const istZiel = n === zielKlammern();

    if (n <= 0) {
      ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Keine Büroklammern gehalten (kein Strom).", cx, startY + 30);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      return;
    }

    const klammerH = 21;           // Hoehe je Klammer inkl. Abstand
    // kurzer Verbindungsstrich: erste Klammer haengt am Pol
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(cx, 319); ctx.lineTo(cx, startY + 1); ctx.stroke();
    for (let i = 0; i < n; i++) {
      const y = startY + i * klammerH;
      zeichneKlammer(cx, y, cLeise, cBg);
      // kleine Nummer rechts neben jeder Klammer -> Zaehlen wird eindeutig
      ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif";
      ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillText(String(i + 1), cx + 26, y + klammerH / 2);
    }

    // Beschriftung der Kette
    const letzteY = startY + n * klammerH;
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "top";
    ctx.fillText("Büroklammern selbst zählen", cx, letzteY + 6);
    if (istZiel) {
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
      ctx.fillText("(hängende Klammern = Magnetkraft)", cx, letzteY + 22);
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // eine einzelne Bueroklammer (stilisierter Draht-Buegel, klar erkennbar)
  function zeichneKlammer(cx, y, cLinie, cBg) {
    const halbB = 8, hoehe = 16;
    ctx.strokeStyle = cLinie; ctx.lineWidth = 2; ctx.lineJoin = "round"; ctx.lineCap = "round";
    // aeussere Buegelform
    ctx.beginPath();
    ctx.moveTo(cx - halbB, y + 2);
    ctx.lineTo(cx - halbB, y + hoehe - 3);
    ctx.arc(cx - halbB + 3, y + hoehe - 3, 3, Math.PI, 0, true);
    ctx.lineTo(cx - halbB + 6, y + 4);
    ctx.arc(cx - halbB + 3, y + 4, 3, 0, Math.PI, true);
    ctx.stroke();
    // innerer Buegel (Klammer-Optik)
    ctx.beginPath();
    ctx.moveTo(cx + halbB, y);
    ctx.lineTo(cx + halbB, y + hoehe - 5);
    ctx.arc(cx + halbB - 3, y + hoehe - 5, 3, 0, Math.PI, false);
    ctx.lineTo(cx + halbB - 6, y + 6);
    ctx.stroke();
    ctx.lineJoin = "miter"; ctx.lineCap = "butt";
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>Du baust einen <strong>Elektromagneten</strong>: eine <strong>Spule</strong> mit ' + WINDUNGEN + ' Windungen, in der ein <strong>Eisenkern</strong> steckt. Die Spule hängt am <strong>Netzgerät</strong>; dessen Anzeige zeigt dir die eingestellte <strong>Stromstärke I</strong>. Solange Strom fließt, wird der Eisenkern magnetisch und hält <strong>Büroklammern</strong> fest.</p>',
      '<p>Die <strong>Windungszahl bleibt fest</strong> (' + WINDUNGEN + '). Du veränderst <strong>nur die Stromstärke</strong> und liest die Magnetkraft als <strong>Anzahl gehaltener Büroklammern</strong> ab — die hängenden Klammern zählst du selbst.</p>',
      '<div class="exp-poe">',
      '<p><strong>Vorhersage (erst überlegen, dann messen):</strong> Bei I = 1,0 A hält der Magnet einige Büroklammern. Was passiert mit der <strong>Anzahl gehaltener Büroklammern</strong>, wenn du den Strom auf I = 2,0 A <strong>verdoppelst</strong>?</p>',
      '<select id="exp-vorhersage" class="exp-wahl">',
      '<option value="">— Vorhersage wählen —</option>',
      '<option value="gleich">Sie bleibt ungefähr gleich.</option>',
      '<option value="wenig">Sie wird etwas größer.</option>',
      '<option value="doppelt">Sie wird ungefähr doppelt so groß.</option>',
      '<option value="weniger">Sie wird kleiner.</option>',
      '</select>',
      '<p id="exp-vorhersage-echo" class="exp-meldung" aria-live="polite"></p>',
      '</div>',
      '<p class="exp-hinweis">Tipp: Achte darauf, dass die Klammern eine <em>Kette</em> bilden — eine Klammer hält die nächste. Je stärker der Magnet, desto länger die Kette.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    const vorh = panel.querySelector("#exp-vorhersage");
    vorh.addEventListener("change", () => {
      const echo = panel.querySelector("#exp-vorhersage-echo");
      if (!vorh.value) { echo.textContent = ""; return; }
      echo.textContent = "Notiert. Prüfe deine Vorhersage gleich mit echten Messungen.";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchfuehrung ----------
  function panelMessen() {
    const I = aktI();
    const schonGemessen = zustand.messungen.some(m => Math.abs(m.i - I) < 1e-9);
    const zeilen = zustand.messungen.length
      ? zustand.messungen.map(m => '<tr><td>' + komma(m.i, 1) + ' A</td><td>' + m.n + '</td></tr>').join("")
      : '<tr><td colspan="2">noch leer</td></tr>';
    const knoepfe = I_WERTE.map((w, idx) =>
      '<button type="button" class="knopf ' + (idx === zustand.iIndex ? "" : "zweitrangig") + '" data-i="' + idx + '">' + komma(w, 1) + ' A</button>'
    ).join("");

    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<p>Stell am Netzgerät eine <strong>Stromstärke</strong> ein. Die Anzeige links zeigt I, am Kern hängen dann die Büroklammern.</p>',
      '<div class="exp-masseknoepfe">' + knoepfe + '</div>',
      '<p>Eingestellt: <strong>I = ' + komma(I, 1) + ' A</strong>. <button class="knopf zweitrangig" id="exp-schalter">' + (zustand.an ? "Strom ausschalten" : "Strom einschalten") + '</button></p>',
      '<p>' + (zustand.an
        ? "Zähle jetzt die am Eisenkern <strong>hängenden Büroklammern</strong> in der Zeichnung links und trag die Anzahl ein."
        : "Der Strom ist <strong>aus</strong> — es hängen keine Klammern. Schalte den Strom ein.") + '</p>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-anzahl">Anzahl gehaltener Büroklammern bei I = ' + komma(I, 1) + ' A:</label>',
      '<input id="exp-anzahl" inputmode="numeric" autocomplete="off" size="5" ' + (zustand.an ? "" : "disabled") + '>',
      '<button class="knopf" ' + (zustand.an ? "" : "disabled") + '>In die Tabelle</button>',
      '</form>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + (schonGemessen ? "Diese Stromstärke ist schon in der Tabelle — wähle eine andere." : "") + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle"><thead><tr><th>Stromstärke I</th><th>Anzahl Büroklammern</th></tr></thead><tbody>' + zeilen + '</tbody></table>',
      '<p>' + zustand.messungen.length + ' von mindestens ' + MIN_MESSUNGEN + ' Messungen — miss alle vier Stromstärken.</p>',
      '<button class="knopf" id="exp-weiter2" ' + (zustand.messungen.length >= MIN_MESSUNGEN ? "" : "disabled") + '>Zur Auswertung</button>'
    ].join("");

    panel.querySelectorAll("[data-i]").forEach(b => {
      b.addEventListener("click", () => {
        zustand.iIndex = Number(b.dataset.i);
        zustand.an = true;
        setzeZiel();
        panelMessen();
      });
    });
    panel.querySelector("#exp-schalter").addEventListener("click", () => {
      zustand.an = !zustand.an; setzeZiel(); panelMessen();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-anzahl").value);
      const istI = aktI();
      if (zustand.messungen.some(m => Math.abs(m.i - istI) < 1e-9)) {
        meldung.textContent = "Diese Stromstärke hast du schon eingetragen — wähle eine andere.";
        return;
      }
      const wahr = anzahlKlammern(istI);
      if (!Number.isInteger(eingabe)) {
        meldung.textContent = "✗ Bitte eine ganze Anzahl Büroklammern eintragen (z. B. 6).";
        return;
      }
      if (!bewerteAblesung(eingabe, wahr)) {
        meldung.textContent = "✗ Zähl noch einmal genau nach: Wie viele Büroklammern hängen wirklich am Kern?";
        return;
      }
      zustand.messungen.push({ i: istI, n: eingabe });
      zustand.messungen.sort((a, b) => a.i - b.i);
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Eingetragen — stell die nächste Stromstärke ein.";
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const ms = zustand.messungen.slice().sort((a, b) => a.i - b.i);
    const zeilen = ms.map(m =>
      '<tr><td>' + komma(m.i, 1) + ' A</td><td>' + m.n + '</td><td>' + komma(quotient(m.n, m.i), 1) + '</td></tr>'
    ).join("") || '<tr><td colspan="3">noch keine Messungen</td></tr>';
    const k = ms.length >= 2 ? steigungUrsprung(ms) : NaN;
    const verdoppelt = ms.find(m => Math.abs(m.i - 1.0) < 1e-9) && ms.find(m => Math.abs(m.i - 2.0) < 1e-9);

    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      '<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Anzahl gehaltener Büroklammern über der Stromstärke I. Die Messpunkte liegen auf einer Ursprungsgeraden."></canvas>',
      '<table class="exp-tabelle"><thead><tr><th>I in A</th><th>Anzahl n</th><th>n / I</th></tr></thead><tbody>' + zeilen + '</tbody></table>',
      '<p>Schau in die letzte Spalte: Der <strong>Quotient n / I</strong> ist (fast) immer gleich groß. Wenn n geteilt durch I konstant ist, dann ist <strong>n proportional zu I</strong> — die Punkte liegen auf einer <strong>Ursprungsgeraden</strong>.</p>',
      Number.isFinite(k)
        ? '<p>Aus deinen Punkten ergibt sich die Steigung <strong>k &asymp; ' + komma(k, 1) + ' Büroklammern je Ampere</strong>. Pro zusätzlichem Ampere hält der Magnet also rund ' + komma(k, 0) + ' Klammern mehr.</p>'
        : '',
      verdoppelt
        ? '<p><strong>Vorhersage geprüft:</strong> Bei doppeltem Strom (1,0 A &rarr; 2,0 A) hängen doppelt so viele Büroklammern. <strong>Die Magnetkraft wächst proportional zur Stromstärke.</strong></p>'
        : '<p class="exp-hinweis">Tipp: Miss auch 1,0 A und 2,0 A, um die Verdopplung direkt zu sehen.</p>',
      '<form id="exp-rechnung" class="exp-ablesen">',
      '<p>Prüfe selbst: Wie viele Büroklammern würde der Magnet bei <strong>I = 2,5 A</strong> halten, wenn die Proportionalität weiter gilt? (Rechne mit deinem k.)</p>',
      '<label for="exp-vorhersagewert">Erwartete Anzahl bei 2,5 A:</label>',
      '<input id="exp-vorhersagewert" inputmode="numeric" autocomplete="off" size="5">',
      '<button class="knopf">Prüfen</button>',
      '</form>',
      '<p id="exp-rechnung-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — und wo das Modell endet</summary>',
      '<p><strong>Sättigung:</strong> Bei sehr großem Strom wird der Eisenkern magnetisch &bdquo;voll&ldquo; (Sättigung) — dann wächst die Kraft kaum noch, obwohl der Strom steigt. Die schöne Proportionalität gilt nur im hier gemessenen Bereich.</p>',
      '<p><strong>Abzählen:</strong> Bei langen Ketten verzählt man sich leicht, und manchmal hängt eine Klammer halb &mdash; ob sie noch &bdquo;zählt&ldquo;, ist Ansichtssache.</p>',
      '<p><strong>Remanenz:</strong> Nach dem Ausschalten bleibt der Eisenkern oft noch ein wenig magnetisch (Restmagnetismus) und hält vereinzelt eine Klammer &mdash; das verfälscht die Nullmessung.</p>',
      '</details>',
      '<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button><button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button><button class="knopf" id="exp-neustart">Neues Experiment</button></div>'
    ].join("");

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.iIndex = 1; zustand.an = true;
      setzeZiel(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const reihen = ms.map(m => [m.i, m.n]);
      csvHerunterladen("elektromagnet-messwerte.csv", ["Stromstärke I in A", "Anzahl Büroklammern"], reihen);
    });
    panel.querySelector("#exp-rechnung").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-vorhersagewert").value);
      const soll = anzahlKlammern(I_MAX_ANZEIGE); // round(6*2,5) = 15
      const ziel = panel.querySelector("#exp-rechnung-meldung");
      if (ablesungOk(eingabe, soll, 1)) {
        ziel.textContent = "✓ Genau! Bei 2,5 A erwartet man rund " + soll + " Büroklammern (k · I = " + K_KLAMMERN + " · 2,5).";
      } else {
        ziel.textContent = "✗ Noch nicht: Rechne Anzahl = k · I mit k ≈ " + K_KLAMMERN + " und I = 2,5 A.";
      }
    });
    zeichneDiagramm(ms, k);
  }

  // Diagramm: Anzahl ueber I, Ursprungsgerade + Messpunkte
  function zeichneDiagramm(ms, k) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 48, Re = W - 16, O = 18, Un = H - 42;
    const iMax = 2.5;
    const nMax = 16;
    const X = i => L + (i / iMax) * (Re - L);
    const Y = n => Un - (n / nMax) * (Un - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif"; c.textBaseline = "alphabetic"; c.lineWidth = 1;
    for (let n = 0; n <= nMax; n += 3) {
      c.strokeStyle = n === 0 ? cText : cLeise;
      c.beginPath(); c.moveTo(L, Y(n)); c.lineTo(Re, Y(n)); c.stroke();
      c.fillStyle = cText; c.textAlign = "right"; c.textBaseline = "middle";
      c.fillText(String(n), L - 6, Y(n));
    }
    c.textBaseline = "alphabetic";
    for (let i = 0; i <= iMax + 1e-9; i += 0.5) {
      c.strokeStyle = i === 0 ? cText : cLeise;
      c.beginPath(); c.moveTo(X(i), O); c.lineTo(X(i), Un); c.stroke();
      c.fillStyle = cText; c.textAlign = "center"; c.fillText(komma(i, 1), X(i), Un + 16);
    }
    c.fillStyle = cText; c.textAlign = "left";
    c.fillText("Anzahl n", 6, 13); c.fillText("I in A", W - 50, H - 6);

    // Ursprungsgerade aus k
    if (Number.isFinite(k) && k > 0) {
      const iEnd = Math.min(iMax, nMax / k);
      c.strokeStyle = cLeise; c.lineWidth = 1.5; c.setLineDash([6, 5]);
      c.beginPath(); c.moveTo(X(0), Y(0)); c.lineTo(X(iEnd), Y(iEnd * k)); c.stroke();
      c.setLineDash([]);
    }
    // Messpunkte
    c.fillStyle = cAkzent;
    for (const m of ms) { c.beginPath(); c.arc(X(m.i), Y(m.n), 5, 0, 7); c.fill(); }
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
