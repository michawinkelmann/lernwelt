// experiment.js — Interaktives Experiment: Kraefteaddition / Kraefteparallelogramm (Klasse 8).
// Realitaetsnahe Messpraxis statt fertiger Simulation: An einem Ring ziehen zwei
// Federkraftmesser unter einem einstellbaren Winkel nach oben aussen; senkrecht
// nach unten zieht ein bekanntes Gewicht (die Gegenkraft F_G). Im Gleichgewicht
// liest du die beiden Kraefte F1 und F2 SELBST an den Skalen ab. Aus Symmetrie
// sind F1 und F2 gleich gross. In der Auswertung setzt du F1 und F2 zur
// Resultierenden zusammen (Kraefteparallelogramm) und stellst fest: die
// Resultierende ist betragsgleich zur Gegenkraft F_G und zeigt ihr entgegen.
// Entdeckung: Kraefte addieren sich vektoriell, nicht einfach als Zahlen.
//   - Winkel 0 zwischen den Federn: R = F1 + F2.
//   - Winkel 90 Grad: R = Wurzel(F1^2 + F2^2).
// Modell: Gegenkraft F_G fest; halber Winkel a = phi/2; je Feder F = F_G/(2 cos a).
// Kontrollwerte (F_G = 4,0 N): phi=0 -> F=2,00 N ; phi=90 -> F=2,83 N ; phi=120 -> F=4,00 N.
// Die kleine Ablese-Streuung ist deterministisch geseedet -> TESTS in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Konstanten ----------
export const F_G = 4.0;                 // N — Gewichtskraft (Gegenkraft), bekannt und fest
export const PHI_MIN = 0, PHI_MAX = 140, PHI_SCHRITT = 10; // Grad — Winkel zwischen den Federn
export const BEREICH_N = 10, TEILUNG_N = 0.2;   // Skala der Federkraftmesser
export const TOLERANZ_N = 0.15;         // akzeptierte Ablesegenauigkeit je Feder
export const TOLERANZ_R_REL = 0.05;     // +/-5 % beim Nachrechnen der Resultierenden
export const TOLERANZ_R_MIN = 0.15;     // mind. +/-0,15 N
export const MIN_MESSUNGEN = 4;         // Winkel-Einstellungen

// ---------- Modell (exakt, Node-testbar) ----------
export function bogen(grad) { return grad * Math.PI / 180; }
// Betrag jeder Feder bei gegebenem Winkel phi (in Grad) zwischen den Federn
export function federkraft(phiGrad) {
  return F_G / (2 * Math.cos(bogen(phiGrad / 2)));
}
// Betrag der Resultierenden zweier gleich grosser Kraefte F unter Winkel phi:
// R = 2 F cos(phi/2). (Diagonale des Kraefteparallelogramms / der Raute.)
export function resultierende(F, phiGrad) {
  return 2 * F * Math.cos(bogen(phiGrad / 2));
}
// allgemeine Parallelogramm-Formel fuer zwei (auch ungleiche) Kraefte:
// R = Wurzel(F1^2 + F2^2 + 2 F1 F2 cos(phi))
export function resultierendeAllg(F1, F2, phiGrad) {
  return Math.sqrt(F1 * F1 + F2 * F2 + 2 * F1 * F2 * Math.cos(bogen(phiGrad)));
}

// ---------- Skalen-Anzeige: wahrer Wert + geseedete Streuung ----------
export function anzeigeFeder(phiGrad, welche) {
  const wahr = federkraft(phiGrad);
  return Math.max(0, wahr + streuung("F:" + welche + ":" + phiGrad, TEILUNG_N));
}
export function toleranzR(rSoll) { return Math.max(TOLERANZ_R_MIN, rSoll * TOLERANZ_R_REL); }

// ---------- TESTS (laufen in Node, kein document/window noetig) ----------
// unabhaengige Nachrechnung der Resultierenden aus Komponenten:
// zwei symmetrische Kraefte unter halbem Winkel a -> Summe der x-Komponenten = 0,
// Summe der y-Komponenten = 2 F cos a. Ohne resultierende()/resultierendeAllg().
function resultierendeKomponenten(F, phiGrad) {
  const a = bogen(phiGrad / 2);
  const y = F * Math.cos(a) + F * Math.cos(a); // beide nach oben
  const x = F * Math.sin(a) - F * Math.sin(a); // entgegengesetzt -> 0
  return Math.sqrt(x * x + y * y);
}
export const TESTS = [
  { name: "Kontrollwerte F je Feder: phi=0 -> 2,00 N; phi=120 -> 4,00 N",
    ok: () => Math.abs(federkraft(0) - 2.0) < 1e-9 && Math.abs(federkraft(120) - 4.0) < 1e-9 },
  { name: "Kontrollwert phi=90 -> F = 2,828 N (= F_G/Wurzel2)",
    ok: () => Math.abs(federkraft(90) - F_G / Math.SQRT2) < 1e-9 && Math.abs(federkraft(90) - 2.8284) < 1e-3 },
  { name: "Resultierende ist IMMER betragsgleich zur Gegenkraft F_G (alle Winkel)",
    ok: () => { for (let p = 0; p <= 140; p += 5) { const F = federkraft(p); if (Math.abs(resultierende(F, p) - F_G) > 1e-9) return false; } return true; } },
  { name: "Unabhaengige Komponenten-Rechnung deckt sich mit resultierende() (alle Winkel)",
    ok: () => { for (let p = 0; p <= 140; p += 5) { const F = federkraft(p); if (Math.abs(resultierendeKomponenten(F, p) - resultierende(F, p)) > 1e-9) return false; } return true; } },
  { name: "Sonderfall 0 Grad: R = F1 + F2 (Kraefte zeigen gleich)",
    ok: () => { const F = federkraft(0); return Math.abs(resultierendeAllg(F, F, 0) - (F + F)) < 1e-9 && Math.abs(F + F - F_G) < 1e-9; } },
  { name: "Sonderfall 90 Grad: R = Wurzel(F1^2 + F2^2)",
    ok: () => { const F = federkraft(90); return Math.abs(resultierendeAllg(F, F, 90) - Math.sqrt(F * F + F * F)) < 1e-9 && Math.abs(Math.sqrt(F * F + F * F) - F_G) < 1e-9; } },
  { name: "Parallelogramm-Formel und 2 F cos(phi/2) sind gleich (gleiche Kraefte)",
    ok: () => [0, 30, 60, 90, 120].every(p => { const F = federkraft(p); return Math.abs(resultierendeAllg(F, F, p) - resultierende(F, p)) < 1e-9; }) },
  { name: "Je groesser der Winkel, desto groesser muss jede Feder ziehen (monoton)",
    ok: () => { for (let p = 0; p < 140; p += 5) if (federkraft(p + 5) <= federkraft(p)) return false; return true; } },
  { name: "Anzeige-Streuung hoechstens 1 Teilstrich; beide Federn deterministisch",
    ok: () => { for (let p = 0; p <= 140; p += 10) { for (const w of [1, 2]) if (Math.abs(anzeigeFeder(p, w) - federkraft(p)) > TEILUNG_N) return false; } return anzeigeFeder(60, 1) === anzeigeFeder(60, 1) && anzeigeFeder(60, 2) === anzeigeFeder(60, 2); } },
  { name: "parseDezimal und Ablese-/R-Toleranzen",
    ok: () => parseDezimal("2,8") === 2.8 && parseDezimal("2.8") === 2.8 && Number.isNaN(parseDezimal("zwei")) &&
      ablesungOk(2.1, 2.0, TOLERANZ_N) && !ablesungOk(2.2, 2.0, TOLERANZ_N) && !ablesungOk(NaN, 2.0, TOLERANZ_N) &&
      ablesungOk(4.1, 4.0, toleranzR(4.0)) && !ablesungOk(4.3, 4.0, toleranzR(4.0)) },
  { name: "Gestreute Federablesung -> Resultierende trifft F_G auf 8 %",
    ok: () => [0, 40, 90, 130].every(p => { const F1 = anzeigeFeder(p, 1), F2 = anzeigeFeder(p, 2); return Math.abs(resultierendeAllg(F1, F2, p) - F_G) / F_G < 0.08; }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  const zustand = {
    phi: 60,                 // Winkel zwischen den Federn in Grad
    messungen: [],           // {phi, f1, f2}
    rGeprueft: {},           // index -> true (Resultierende korrekt nachgerechnet)
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
    '<canvas id="exp-canvas" width="360" height="560" aria-label="Versuchsaufbau: ein Ring, an dem zwei Federkraftmesser schräg nach oben und ein bekanntes Gewicht senkrecht nach unten ziehen, dazu die beiden ablesbaren Kraftskalen."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Zeichnung ----------
  function pfeil(x1, y1, x2, y2, farbeStr, dicke) {
    ctx.strokeStyle = farbeStr; ctx.fillStyle = farbeStr; ctx.lineWidth = dicke;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const w = Math.atan2(y2 - y1, x2 - x1), L = 11, sp = 0.5;
    ctx.beginPath();
    ctx.moveTo(x2, y2);
    ctx.lineTo(x2 - L * Math.cos(w - sp), y2 - L * Math.sin(w - sp));
    ctx.lineTo(x2 - L * Math.cos(w + sp), y2 - L * Math.sin(w + sp));
    ctx.closePath(); ctx.fill();
  }
  // kleine Federkraftmesser-Skala laengs einer Richtung mit ablesbarem Zeigerwert
  function federSkala(rx, ry, dirX, dirY, wert, label, cText, cLeise, cAkzent, cFlaeche, cBg) {
    // rx,ry = Ringpunkt; die Skala liegt ein Stueck weiter aussen laengs (dirX,dirY) (Einheitsvektor)
    const start = 58, laenge = 84;       // Abstand und Laenge der Skala
    const sx = rx + dirX * start, sy = ry + dirY * start;
    // Querrichtung
    const qx = -dirY, qy = dirX;
    const breite = 16;
    // Gehaeuse als Rechteck laengs der Richtung
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(Math.atan2(dirY, dirX));
    ctx.fillStyle = cBg; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(0, -breite / 2, laenge, breite, 5); else ctx.rect(0, -breite / 2, laenge, breite);
    ctx.fill(); ctx.stroke();
    // Teilstriche 0..10 N entlang der Laenge (nur grobe Marken, Zahlen an 0/5/10)
    for (let n = 0; n <= BEREICH_N; n++) {
      const x = (n / BEREICH_N) * laenge;
      const gross = n % 5 === 0;
      ctx.strokeStyle = gross ? cText : cLeise; ctx.lineWidth = gross ? 1.4 : 0.8;
      ctx.beginPath(); ctx.moveTo(x, -breite / 2); ctx.lineTo(x, -breite / 2 + (gross ? 8 : 5)); ctx.stroke();
    }
    // Zeiger (Akzent) an der aktuellen Kraft
    const zx = (Math.min(wert, BEREICH_N) / BEREICH_N) * laenge;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2.4;
    ctx.beginPath(); ctx.moveTo(zx, -breite / 2 - 2); ctx.lineTo(zx, breite / 2 + 2); ctx.stroke();
    ctx.restore();
    // Anzeige des Werts als Zahl, gut lesbar neben der Skala (immer aufrecht)
    const mx = rx + dirX * (start + laenge + 4) + qx * 0, my = ry + dirY * (start + laenge + 4);
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = dirX >= 0 ? "left" : "right"; ctx.textBaseline = "middle";
    ctx.fillText(label + " = " + komma(Math.min(wert, BEREICH_N), 2) + " N", mx, my);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }
  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche", "#f4f6f8"), cBg = farbe("--bg", "#fff");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.fillText("Aufbau", 12, 18);

    const rx = 180, ry = 250;            // Ringpunkt (Mitte)
    const F = federkraft(zustand.phi);
    const a = bogen(zustand.phi / 2);
    // Richtungen der beiden Federn: nach oben und um a nach links/rechts gekippt
    const linksDir = { x: -Math.sin(a), y: -Math.cos(a) };
    const rechtsDir = { x: Math.sin(a), y: -Math.cos(a) };

    // Decke / Aufhaengepunkte oben
    ctx.fillStyle = cText; ctx.fillRect(40, 28, 280, 7);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    // Aufhaengepunkte je nach Winkel
    const ax1 = rx + linksDir.x * 200, ay1 = 35;
    const ax2 = rx + rechtsDir.x * 200, ay2 = 35;
    // Seile von der Decke zu den Federn (duenn)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.2;
    const seilL1x = rx + linksDir.x * 150, seilL1y = ry + linksDir.y * 150;
    const seilL2x = rx + rechtsDir.x * 150, seilL2y = ry + rechtsDir.y * 150;
    ctx.beginPath(); ctx.moveTo(Math.max(46, Math.min(314, ax1)), ay1); ctx.lineTo(seilL1x, seilL1y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(Math.max(46, Math.min(314, ax2)), ay2); ctx.lineTo(seilL2x, seilL2y); ctx.stroke();

    // Kraftpfeile der beiden Federn (vom Ring nach aussen) + Gegenkraft nach unten
    pfeil(rx, ry, rx + linksDir.x * 50, ry + linksDir.y * 50, cAkzent, 2.6);
    pfeil(rx, ry, rx + rechtsDir.x * 50, ry + rechtsDir.y * 50, cAkzent, 2.6);
    pfeil(rx, ry, rx, ry + 150, cText, 2.6);

    // Ring
    ctx.strokeStyle = cText; ctx.lineWidth = 2.4; ctx.fillStyle = cBg;
    ctx.beginPath(); ctx.arc(rx, ry, 9, 0, 7); ctx.fill(); ctx.stroke();

    // Gewicht unten
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(rx - 22, ry + 150, 44, 30, 5); else ctx.rect(rx - 22, ry + 150, 44, 30); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Gewicht", rx, ry + 168);
    ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("F_G = " + komma(F_G, 1) + " N", rx, ry + 196);

    // Winkelbogen am Ring zwischen den beiden Federrichtungen
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.2;
    const startW = Math.atan2(linksDir.y, linksDir.x);
    const endW = Math.atan2(rechtsDir.y, rechtsDir.x);
    ctx.beginPath(); ctx.arc(rx, ry, 34, startW, endW, false); ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText(komma(zustand.phi, 0) + "°", rx, ry - 42);

    // Skalen der Federkraftmesser laengs ihrer Richtung
    federSkala(rx, ry, linksDir.x, linksDir.y, anzeigeFeder(zustand.phi, 1), "F1", cText, cLeise, cAkzent, cFlaeche, cBg);
    federSkala(rx, ry, rechtsDir.x, rechtsDir.y, anzeigeFeder(zustand.phi, 2), "F2", cText, cLeise, cAkzent, cFlaeche, cBg);

    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>An einem <strong>Ring</strong> ziehen zwei <strong>Federkraftmesser</strong> schräg nach oben außen. Senkrecht nach unten zieht ein <strong>bekanntes Gewicht</strong> mit der Gewichtskraft <strong>F_G = ' + komma(F_G, 1) + ' N</strong> - das ist die <strong>Gegenkraft</strong>. Solange der Ring in Ruhe bleibt, ist alles im <strong>Gleichgewicht</strong>.</p>',
      '<p><strong>Plan:</strong> Stell verschiedene Winkel zwischen den beiden Federn ein. Bei jedem Winkel hält der Ring still - lies dann <strong>F1</strong> und <strong>F2</strong> selbst an den Skalen ab und trag sie ein. In der Auswertung setzt du F1 und F2 zur <strong>Resultierenden</strong> zusammen und vergleichst sie mit F_G. Mindestens ' + MIN_MESSUNGEN + ' Winkel.</p>',
      '<p class="exp-hinweis">Vermutung vorab: Was passiert mit F1 und F2, wenn du den Winkel vergrößerst? Bleiben sie gleich, werden sie kleiner oder größer? Schreib deine Erwartung auf, bevor du misst.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchfuehrung ----------
  function panelMessen() {
    const schonGemessen = zustand.messungen.some(z => z.phi === zustand.phi);
    const zeilen = zustand.messungen.slice().sort((a, b) => a.phi - b.phi);
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<div class="exp-regler">',
      '<label for="exp-phi">Winkel zwischen den Federn: <span id="exp-phi-live">' + komma(zustand.phi, 0) + '°</span></label>',
      '<input type="range" id="exp-phi" min="' + PHI_MIN + '" max="' + PHI_MAX + '" step="' + PHI_SCHRITT + '" value="' + zustand.phi + '">',
      '</div>',
      '<p>Der Ring steht still. Lies <strong>beide</strong> Federkraftmesser links ab (auf 0,1 N genau):</p>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-f1">F1 in N:</label>',
      '<input id="exp-f1" inputmode="decimal" autocomplete="off" size="6"' + (schonGemessen ? ' disabled' : '') + '>',
      '<label for="exp-f2">F2 in N:</label>',
      '<input id="exp-f2" inputmode="decimal" autocomplete="off" size="6"' + (schonGemessen ? ' disabled' : '') + '>',
      '<button class="knopf"' + (schonGemessen ? ' disabled' : '') + '>In die Tabelle</button>',
      '</form>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' +
        (schonGemessen ? 'Diesen Winkel hast du schon gemessen - stell einen anderen ein.' : '') + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle"><thead><tr><th>Winkel in °</th><th>F1 in N</th><th>F2 in N</th></tr></thead><tbody>' +
        (zeilen.map(z => '<tr><td>' + komma(z.phi, 0) + '</td><td>' + komma(z.f1, 2) + '</td><td>' + komma(z.f2, 2) + '</td></tr>').join("") ||
          '<tr><td colspan="3">noch leer</td></tr>') +
        '</tbody></table>',
      '<p>' + zustand.messungen.length + ' von mindestens ' + MIN_MESSUNGEN + ' Messungen.</p>',
      '<button class="knopf" id="exp-weiter2"' + (zustand.messungen.length >= MIN_MESSUNGEN ? '' : ' disabled') + '>Zur Auswertung</button>'
    ].join("");
    const regler = panel.querySelector("#exp-phi");
    regler.addEventListener("input", () => {
      zustand.phi = Number(regler.value);
      panel.querySelector("#exp-phi-live").textContent = komma(zustand.phi, 0) + "°";
      zeichne();
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const f1 = parseDezimal(panel.querySelector("#exp-f1").value);
      const f2 = parseDezimal(panel.querySelector("#exp-f2").value);
      if (zustand.messungen.some(z => z.phi === zustand.phi)) {
        meldung.textContent = "Diesen Winkel hast du schon gemessen - stell einen anderen ein.";
        return;
      }
      if (!ablesungOk(f1, anzeigeFeder(zustand.phi, 1), TOLERANZ_N)) {
        meldung.textContent = "Schau genau auf den linken Federkraftmesser (F1): Wo steht der Zeiger? (1 Teilstrich = 0,2 N.)";
        return;
      }
      if (!ablesungOk(f2, anzeigeFeder(zustand.phi, 2), TOLERANZ_N)) {
        meldung.textContent = "Der rechte Federkraftmesser (F2) zeigt etwas anderes - lies noch einmal genau ab.";
        return;
      }
      zustand.messungen.push({ phi: zustand.phi, f1, f2 });
      meldung.textContent = "Eingetragen. Stell den nächsten Winkel ein.";
      panelMessen();
    });
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const zeilen = zustand.messungen.slice().sort((a, b) => a.phi - b.phi);
    const alleR = zeilen.length > 0 && zeilen.every((z, i) => zustand.rGeprueft[i]);
    let html = [
      '<h2>Auswertung</h2>',
      '<p>Setze F1 und F2 zur <strong>Resultierenden R</strong> zusammen (Kräfteparallelogramm). Bei zwei gleich großen Kräften unter dem Winkel &phi; gilt:</p>',
      '<p style="text-align:center">R = Wurzel(F1&sup2; + F2&sup2; + 2 &middot; F1 &middot; F2 &middot; cos &phi;)</p>',
      '<p>Sonderfälle zum Prüfen: bei <strong>&phi; = 0</strong> wird daraus einfach <strong>R = F1 + F2</strong>, bei <strong>&phi; = 90&deg;</strong> wird es <strong>R = Wurzel(F1&sup2; + F2&sup2;)</strong>. Trag dein R (in N, auf 0,1 N) ein:</p>',
      '<table class="exp-tabelle"><thead><tr><th>Winkel</th><th>F1 in N</th><th>F2 in N</th><th>R in N</th></tr></thead><tbody>'
    ];
    zeilen.forEach((z, i) => {
      const ok = zustand.rGeprueft[i];
      html.push('<tr><td>' + komma(z.phi, 0) + '°</td><td>' + komma(z.f1, 2) + '</td><td>' + komma(z.f2, 2) + '</td><td>' +
        (ok ? '<strong>' + komma(resultierendeAllg(z.f1, z.f2, z.phi), 2) + '</strong>' :
          '<input class="exp-r-feld" data-zeile="' + i + '" inputmode="decimal" autocomplete="off" size="5"> N') +
        '</td></tr>');
    });
    html.push('</tbody></table>');
    html.push('<p id="exp-r-meldung" class="exp-meldung" aria-live="polite"></p>');
    if (alleR) {
      html.push('<p class="exp-hinweis"><strong>Entdeckung:</strong> In jeder Zeile kommt für R ungefähr <strong>' + komma(F_G, 1) + ' N</strong> heraus - genau die Gewichtskraft F_G! Die Resultierende der beiden Federkräfte ist <strong>betragsgleich zur Gegenkraft</strong> und zeigt ihr entgegen. Darum bleibt der Ring im Gleichgewicht. Und: Je größer der Winkel, desto stärker muss <em>jede</em> Feder ziehen, obwohl die Resultierende gleich bleibt. <strong>Kräfte addieren sich also nicht als bloße Zahlen, sondern als Pfeile (Vektoren) - nach dem Kräfteparallelogramm.</strong></p>');
      html.push('<canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Kräfteparallelogramm für eine deiner Messungen: die beiden Federkräfte als Pfeile, ihre Resultierende als Diagonale, der Gegenkraft entgegengerichtet."></canvas>');
    } else {
      html.push('<p>Rechne zuerst R für alle Zeilen aus - dann zeigt dir das Experiment das Kräfteparallelogramm.</p>');
    }
    html.push('<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV herunterladen</button></div>');
    html.push('<details class="exp-fehler"><summary>Fehlerbetrachtung - was begrenzt die Genauigkeit?</summary>');
    html.push('<p><strong>Ablesefehler:</strong> Genauer als etwa eine halbe Teilung (rund 0,1 N) lässt sich an der Federskala nicht ablesen. Beide Federn gehen in R ein, daher addieren sich die Fehler.</p>');
    html.push('<p><strong>Winkel messen:</strong> Den Winkel zwischen den Federn liest man am Aufbau nur auf wenige Grad genau ab - er steckt über cos &phi; in der Rechnung.</p>');
    html.push('<p><strong>Reibung und Gewicht der Federn:</strong> Echte Federkraftmesser haben etwas Eigenreibung und Eigengewicht; deshalb stimmen F1 und F2 nie perfekt mit dem Modell überein.</p>');
    html.push('</details>');
    html.push('<div class="exp-knopfzeile">');
    html.push('<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>');
    html.push('<button class="knopf" id="exp-neustart">Neues Experiment</button>');
    html.push('</div>');
    panel.innerHTML = html.join("");

    panel.querySelectorAll(".exp-r-feld").forEach(f => f.addEventListener("change", () => {
      const i = Number(f.dataset.zeile), z = zeilen[i];
      const soll = resultierendeAllg(z.f1, z.f2, z.phi);
      const eingabe = parseDezimal(f.value);
      const meldung = panel.querySelector("#exp-r-meldung");
      if (ablesungOk(eingabe, soll, toleranzR(soll))) {
        zustand.rGeprueft[i] = true; panelAuswerten();
      } else {
        meldung.textContent = "Zeile " + (i + 1) + " (Winkel " + komma(z.phi, 0) + "°): Noch nicht. Setze in R = Wurzel(F1² + F2² + 2·F1·F2·cos φ) ein - cos " + komma(z.phi, 0) + "° = " + komma(Math.cos(bogen(z.phi)), 3) + ".";
      }
    }));
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = []; zustand.phi = 60; zustand.rGeprueft = {};
      zeichne(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("kraefteaddition-messwerte.csv", ["Winkel in °", "F1 in N", "F2 in N", "R in N"],
        zeilen.map(z => [z.phi, z.f1, z.f2, resultierendeAllg(z.f1, z.f2, z.phi)]));
    });
    if (alleR) zeichneParallelogramm(zeilen[Math.floor(zeilen.length / 2)]);
  }

  // Kraefteparallelogramm fuer eine Messung: zwei Federpfeile + Resultierende + Gegenkraft
  function zeichneParallelogramm(zeile) {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !zeile) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height;
    c.clearRect(0, 0, W, H);
    const ox = W / 2, oy = H - 56, skala = 34; // N -> px
    const a = bogen(zeile.phi / 2);
    // Federrichtungen nach oben aussen
    const v1 = { x: -Math.sin(a), y: -Math.cos(a) };
    const v2 = { x: Math.sin(a), y: -Math.cos(a) };
    const F1 = zeile.f1, F2 = zeile.f2;
    const p1 = { x: ox + v1.x * F1 * skala, y: oy + v1.y * F1 * skala };
    const p2 = { x: ox + v2.x * F2 * skala, y: oy + v2.y * F2 * skala };
    const pr = { x: p1.x + (p2.x - ox), y: p1.y + (p2.y - oy) }; // Diagonale (Summe)
    function pfeilC(x1, y1, x2, y2, col, dicke) {
      c.strokeStyle = col; c.fillStyle = col; c.lineWidth = dicke;
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
      const w = Math.atan2(y2 - y1, x2 - x1), L = 11, sp = 0.5;
      c.beginPath(); c.moveTo(x2, y2);
      c.lineTo(x2 - L * Math.cos(w - sp), y2 - L * Math.sin(w - sp));
      c.lineTo(x2 - L * Math.cos(w + sp), y2 - L * Math.sin(w + sp));
      c.closePath(); c.fill();
    }
    // Parallelogramm-Hilfslinien (gestrichelt)
    c.strokeStyle = cLeise; c.lineWidth = 1; c.setLineDash([5, 4]);
    c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(pr.x, pr.y); c.lineTo(p2.x, p2.y); c.stroke();
    c.setLineDash([]);
    // Federpfeile
    pfeilC(ox, oy, p1.x, p1.y, cAkzent, 2.4);
    pfeilC(ox, oy, p2.x, p2.y, cAkzent, 2.4);
    // Resultierende (Diagonale, nach oben)
    pfeilC(ox, oy, pr.x, pr.y, cText, 3);
    // Gegenkraft (nach unten, betragsgleich)
    pfeilC(ox, oy, ox, oy + F_G * skala, cLeise, 2.4);
    // Beschriftungen
    c.font = "bold 12px system-ui, sans-serif"; c.textAlign = "center"; c.textBaseline = "middle";
    c.fillStyle = cAkzent;
    c.fillText("F1 = " + komma(F1, 2) + " N", p1.x - 30, p1.y - 6);
    c.fillText("F2 = " + komma(F2, 2) + " N", p2.x + 30, p2.y - 6);
    c.fillStyle = cText;
    c.fillText("R = " + komma(resultierendeAllg(F1, F2, zeile.phi), 2) + " N", pr.x + 4, pr.y - 12);
    c.fillStyle = cLeise;
    c.fillText("F_G = " + komma(F_G, 1) + " N", ox + 56, oy + F_G * skala - 8);
    c.fillStyle = cText; c.font = "11px system-ui, sans-serif";
    c.fillText("Winkel zwischen den Federn: " + komma(zeile.phi, 0) + "°", ox, 18);
    c.textAlign = "left"; c.textBaseline = "alphabetic";
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
