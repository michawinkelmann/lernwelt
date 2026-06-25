// experiment.js — Interaktives Experiment: Lochkamera (Klasse 6).
// Realitätsnahe Messpraxis: Ein fester Gegenstand (leuchtender Pfeil, G = 20 cm)
// steht in fester Entfernung g = 100 cm vor einer Lochblende. Die Lernenden
// verändern die KAMERALÄNGE b (Loch bis Mattscheibe). Auf der Mattscheibe steht
// das Bild auf dem KOPF; seine Größe B liest man SELBST an einer mm-/cm-Skala
// neben dem Bild ab und protokolliert die Messreihe. Entdeckung über den
// Strahlensatz: B/G = b/g, also B wächst proportional zur Kameralänge b.
// Die kleine Ablese-Streuung ist deterministisch geseedet -> TESTS laufen in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, esc, mittel,
  bauePhasen, csvHerunterladen, farbe, reduzierteBewegung
} from "../../../assets/js/experiment/helfer.js";

// ---------- Feste Versuchsgrößen (rein, Node-testbar) ----------
export const G_CM = 20;            // Größe des Gegenstands (leuchtender Pfeil) in cm
export const g_CM = 100;           // Gegenstandsweite (Pfeil -> Loch) in cm, fest
export const B_LAENGEN = [5, 8, 10, 15];  // wählbare Kameralängen b in cm
export const ANZEIGE_SPANNE = 0.3; // Ablese-Streuung der Pfeilspitze: ±0,15 cm
export const ABLESE_TOLERANZ_CM = 0.2;     // akzeptierte Abweichung beim Ablesen von B
export const MIN_MESSUNGEN = 4;            // mind. 4 verschiedene Kameralängen
export const SKALA_MAX_CM = 5;             // Mattscheiben-Skala reicht 0..5 cm

// ---------- Physik (exakt) ----------
// Strahlensatz an der Lochblende: B / G = b / g  ->  B = G * b / g
export function bildgroesse(b, G = G_CM, g = g_CM) {
  return g > 0 ? (G * b) / g : NaN;
}
// Abbildungsmaßstab B/b (für die feste Geometrie konstant = G/g)
export function massstab(b, G = G_CM, g = g_CM) {
  return b > 0 ? bildgroesse(b, G, g) / b : NaN;
}
// abgelesener Wert an der mm-Skala: wahrer Wert + reproduzierbare Streuung
export function anzeigeB(b) {
  return Math.max(0, bildgroesse(b) + streuung("B:" + b, ANZEIGE_SPANNE));
}

// ---------- Auswertung (rein) ----------
// G aus Steigung der b-B-Geraden zurückgewinnen: G = (B/b) * g
export function gegenstandAusQuotient(quotient, g = g_CM) {
  return quotient * g;
}
export function bewertungProportional(quotienten) {
  // prüft, ob alle B/b nahe beieinander liegen (Proportionalität)
  const w = quotienten.filter(Number.isFinite);
  if (w.length < 2) return { ok: false, spanne: NaN };
  const max = Math.max.apply(null, w), min = Math.min.apply(null, w);
  return { ok: (max - min) <= 0.05, spanne: max - min };
}

// ---------- Prüffälle (analytisch bekannte Kontrollwerte) ----------
export const pruefFaelle = [
  { b: 5, soll: 1.0 },
  { b: 8, soll: 1.6 },
  { b: 10, soll: 2.0 },
  { b: 15, soll: 3.0 }
];

export const TESTS = [
  { name: "B(5)=1,0 cm; B(10)=2,0 cm (G=20, g=100)", ok: () => Math.abs(bildgroesse(5) - 1.0) < 1e-12 && Math.abs(bildgroesse(10) - 2.0) < 1e-12 },
  { name: "B(8)=1,6 cm; B(15)=3,0 cm", ok: () => Math.abs(bildgroesse(8) - 1.6) < 1e-12 && Math.abs(bildgroesse(15) - 3.0) < 1e-12 },
  { name: "B verdoppelt sich, wenn b sich verdoppelt", ok: () => Math.abs(bildgroesse(10) - 2 * bildgroesse(5)) < 1e-12 && Math.abs(bildgroesse(16) - 2 * bildgroesse(8)) < 1e-12 },
  { name: "Unabhängige Nachrechnung B = G*b/g für alle b", ok: () => B_LAENGEN.every(b => Math.abs(bildgroesse(b) - (G_CM * b) / g_CM) < 1e-12) },
  { name: "Maßstab B/b konstant = G/g = 0,2", ok: () => B_LAENGEN.every(b => Math.abs(massstab(b) - G_CM / g_CM) < 1e-12) && Math.abs(massstab(7) - 0.2) < 1e-12 },
  { name: "G aus Quotient zurück: 0,2 * 100 = 20 cm", ok: () => Math.abs(gegenstandAusQuotient(massstab(10)) - G_CM) < 1e-12 },
  { name: "Proportionalität erkannt (gleiche Quotienten)", ok: () => bewertungProportional(B_LAENGEN.map(b => massstab(b))).ok === true && bewertungProportional([0.2, 0.5]).ok === false },
  { name: "Prüffälle konsistent", ok: () => pruefFaelle.every(p => Math.abs(bildgroesse(p.b) - p.soll) < 1e-9) },
  { name: "Anzeige deterministisch, Streuung ≤ ±0,15 cm", ok: () => B_LAENGEN.every(b => anzeigeB(b) === anzeigeB(b) && Math.abs(anzeigeB(b) - bildgroesse(b)) <= ANZEIGE_SPANNE / 2 + 1e-12) },
  { name: "Ablesung ±0,2 cm akzeptiert/verwirft", ok: () => ablesungOk(2.1, 2.0, ABLESE_TOLERANZ_CM) && !ablesungOk(2.4, 2.0, ABLESE_TOLERANZ_CM) && !ablesungOk(NaN, 2.0, ABLESE_TOLERANZ_CM) },
  { name: "Mittelwert der Quotientenspalte", ok: () => Math.abs(mittel([0.2, 0.2, 0.2]) - 0.2) < 1e-12 },
  { name: "parseDezimal: Komma und Punkt", ok: () => parseDezimal("2,0") === 2.0 && parseDezimal("2.0") === 2.0 && Number.isNaN(parseDezimal("zwei")) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    b: B_LAENGEN[0],     // aktuell gewählte Kameralänge in cm
    bAnim: B_LAENGEN[0], // animierte Länge (nur Darstellung)
    bVon: B_LAENGEN[0], bZiel: B_LAENGEN[0], animStart: 0,
    messungen: [],       // { b, B } — B wie an der Skala abgelesen und eingetragen
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
    '<canvas id="exp-canvas" width="360" height="560" aria-label="Versuchsaufbau der Lochkamera: links ein leuchtender Pfeil als Gegenstand, in der Mitte eine Wand mit kleinem Loch, rechts die Mattscheibe mit dem umgekehrten Bild. Neben dem Bild eine Zentimeter- und Millimeterskala, an der die Bildgröße abgelesen wird. Zwei Strahlen laufen durch das Loch."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // ---------- Geometrie der Zeichnung ----------
  // Gegenstand links (x=46), Lochblende Mitte (x=176), Mattscheibe rechts (x bewegt sich).
  const LOCH_X = 176, LOCH_Y = 150;        // Position des Lochs
  const GEG_X = 46;                        // x des Gegenstands-Pfeils
  const SKALA_PX_PRO_CM = 24;              // 1 cm Bild = 24 px in der Übersicht (b=15 -> 72 px)
  // Mattscheiben-x wächst mit b (rein darstellerisch): 5 cm -> nah, 15 cm -> weiter
  function mattX(b) { return LOCH_X + 26 + (b - 5) * 9.2; } // 5->202, 15->294

  function setzeZiel(neuB) {
    zustand.b = neuB;
    zustand.bZiel = neuB; zustand.bVon = zustand.bAnim;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.bAnim = neuB; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 350);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.bAnim = zustand.bVon + (zustand.bZiel - zustand.bVon) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cBg = farbe("--bg", "#fff");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    zeichneAufbau(cText, cLeise, cAkzent, cBg);
    zeichneLupe(cText, cLeise, cAkzent, cBg);
  }

  function pfad(punkte, strichFarbe, breite) {
    ctx.strokeStyle = strichFarbe; ctx.lineWidth = breite || 2;
    ctx.beginPath(); ctx.moveTo(punkte[0][0], punkte[0][1]);
    for (let i = 1; i < punkte.length; i++) ctx.lineTo(punkte[i][0], punkte[i][1]);
    ctx.stroke();
  }
  // aufrechter Pfeil (Gegenstand), Spitze oben
  function pfeilAuf(x, yFuss, hoehe, farbeP) {
    const yKopf = yFuss - hoehe, kopf = Math.min(11, hoehe * 0.28);
    ctx.strokeStyle = farbeP; ctx.fillStyle = farbeP; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, yFuss); ctx.lineTo(x, yKopf + kopf); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yKopf); ctx.lineTo(x - kopf * 0.65, yKopf + kopf);
    ctx.lineTo(x + kopf * 0.65, yKopf + kopf); ctx.closePath(); ctx.fill();
  }
  // umgekehrter Pfeil (Bild), Spitze unten
  function pfeilAb(x, yFuss, hoehe, farbeP) {
    const yKopf = yFuss + hoehe, kopf = Math.min(11, hoehe * 0.28);
    ctx.strokeStyle = farbeP; ctx.fillStyle = farbeP; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x, yFuss); ctx.lineTo(x, yKopf - kopf); ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, yKopf); ctx.lineTo(x - kopf * 0.65, yKopf - kopf);
    ctx.lineTo(x + kopf * 0.65, yKopf - kopf); ctx.closePath(); ctx.fill();
  }

  function zeichneAufbau(cText, cLeise, cAkzent, cBg) {
    const b = zustand.bAnim;
    const Bcm = bildgroesse(zustand.b);             // wahre Bildgröße (für Pfeilhöhe gerundet animiert)
    const BcmAnim = bildgroesse(b);
    const mx = mattX(b);

    // Überschrift
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.font = "12px system-ui, sans-serif"; ctx.fillStyle = cLeise;
    ctx.fillText("Lochkamera — Seitenansicht", 14, 18);
    ctx.textAlign = "right"; ctx.font = "bold 12px system-ui, sans-serif"; ctx.fillStyle = cText;
    ctx.fillText("Kameralänge b = " + komma(zustand.b, 0) + " cm", 348, 18);
    ctx.textAlign = "left";

    // optische Achse
    pfad([[20, LOCH_Y], [330, LOCH_Y]], cLeise, 1);

    // --- Gegenstand: leuchtender aufrechter Pfeil ---
    const gegH = 56;                                 // Pfeilhöhe in px (rein darstellerisch)
    // Leucht-Schein
    ctx.save(); ctx.globalAlpha = 0.14; ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.arc(GEG_X, LOCH_Y - gegH / 2, 30, 0, 7); ctx.fill(); ctx.restore();
    pfeilAuf(GEG_X, LOCH_Y, gegH, cAkzent);
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Gegenstand", GEG_X, LOCH_Y + 22);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("G = " + komma(G_CM, 0) + " cm", GEG_X, LOCH_Y + 38);

    // --- Abstand g (Maßlinie Gegenstand -> Loch) ---
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    pfad([[GEG_X, LOCH_Y - gegH - 14], [LOCH_X, LOCH_Y - gegH - 14]], cLeise, 1);
    pfad([[GEG_X, LOCH_Y - gegH - 18], [GEG_X, LOCH_Y - gegH - 10]], cLeise, 1);
    pfad([[LOCH_X, LOCH_Y - gegH - 18], [LOCH_X, LOCH_Y - gegH - 10]], cLeise, 1);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("g = " + komma(g_CM, 0) + " cm (fest)", (GEG_X + LOCH_X) / 2, LOCH_Y - gegH - 22);

    // --- Lochblende (Wand mit kleinem Loch) ---
    ctx.fillStyle = cText;
    ctx.fillRect(LOCH_X - 4, 56, 8, LOCH_Y - 56 - 5);          // oberer Wandteil
    ctx.fillRect(LOCH_X - 4, LOCH_Y + 5, 8, 250 - LOCH_Y - 5); // unterer Wandteil
    // kleines Loch (Lücke) markieren
    ctx.fillStyle = cAkzent; ctx.beginPath(); ctx.arc(LOCH_X, LOCH_Y, 3, 0, 7); ctx.fill();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Lochblende", LOCH_X, 46);
    // "kleines Loch" links neben die Wand mit kurzem Zeiger auf das Loch
    ctx.textAlign = "right";
    ctx.fillText("kleines Loch", LOCH_X - 12, LOCH_Y + 44);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    pfad([[LOCH_X - 10, LOCH_Y + 40], [LOCH_X - 2, LOCH_Y + 4]], cLeise, 1);

    // --- zwei Strahlen durch das Loch: sie kreuzen sich im Loch ---
    const halbB = BcmAnim * SKALA_PX_PRO_CM;         // volle Bildhöhe in px (Fuß auf Achse)
    // Strahl von der PfeilSPITZE (oben) durchs Loch zur Bild-Spitze (unten)
    pfad([[GEG_X, LOCH_Y - gegH], [LOCH_X, LOCH_Y], [mx, LOCH_Y + halbB]], cAkzent, 1.4);
    // Strahl vom PfeilFUSS (auf der Achse) durchs Loch zum Bild-Fuß (auf der Achse)
    pfad([[GEG_X, LOCH_Y], [LOCH_X, LOCH_Y], [mx, LOCH_Y]], cAkzent, 1.4);

    // --- Mattscheibe (Schirm) mit umgekehrtem Bild ---
    ctx.fillStyle = cBg; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(mx - 3, 66, 6, 170); ctx.strokeRect(mx - 3, 66, 6, 170);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Mattscheibe", mx + 7, 66);
    // umgekehrtes Bild (Spitze unten), Fuß auf der Achse
    pfeilAb(mx, LOCH_Y, halbB, cAkzent);

    // --- Abstand b (Maßlinie Loch -> Mattscheibe) ---
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    const yb = 244;
    pfad([[LOCH_X, yb], [mx, yb]], cLeise, 1);
    pfad([[LOCH_X, yb - 4], [LOCH_X, yb + 4]], cLeise, 1);
    pfad([[mx, yb - 4], [mx, yb + 4]], cLeise, 1);
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("b = " + komma(zustand.b, 0) + " cm", (LOCH_X + mx) / 2, yb + 16);

    // Trennlinie zur Lupe
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(14, 270); ctx.lineTo(346, 270); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left";
    ctx.fillText("Mattscheibe von vorn — Bildgröße B selbst ablesen:", 14, 288);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Lupe: Mattscheibe von vorn mit cm/mm-Skala ----------
  function zeichneLupe(cText, cLeise, cAkzent, cBg) {
    const yTop = 298, hoehe = 250;
    ctx.fillStyle = cBg; ctx.fillRect(20, yTop, 320, hoehe);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.strokeRect(20, yTop, 320, hoehe);

    // Bild: umgekehrter Pfeil, Fuß auf der Nulllinie der Skala
    const Bsicht = anzeigeB(zustand.b);              // abgelesener (gestreuter) Wert
    const nullY = yTop + 28;                          // 0 cm der Skala (oben)
    const pxProCm = 42;                               // 1 cm = 42 px (gut ablesbar)
    const skalaX = 250;                               // x-Position der Skala
    const bildX = 150;                                // x-Position des Bild-Pfeils

    // Skala (0 .. SKALA_MAX_CM cm) mit mm-Strichen, senkrecht
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(skalaX, nullY); ctx.lineTo(skalaX, nullY + SKALA_MAX_CM * pxProCm); ctx.stroke();
    ctx.font = "11px system-ui, sans-serif"; ctx.textBaseline = "middle";
    const iBis = SKALA_MAX_CM * 10;
    for (let i = 0; i <= iBis; i++) {
      const cm = i / 10, y = nullY + cm * pxProCm;
      const lang = (i % 10 === 0) ? 16 : (i % 5 === 0) ? 11 : 6;
      ctx.strokeStyle = (i % 10 === 0) ? cText : cLeise;
      ctx.lineWidth = (i % 10 === 0) ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(skalaX, y); ctx.lineTo(skalaX + lang, y); ctx.stroke();
      if (i % 10 === 0) {
        ctx.fillStyle = cText; ctx.textAlign = "left";
        ctx.fillText(komma(cm, 0), skalaX + 20, y);
      }
    }
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("cm", skalaX + 18, nullY - 8);

    // umgekehrter Bild-Pfeil: Fuß bei 0 (oben), Spitze nach unten bei B
    const spitzeY = nullY + Bsicht * pxProCm;
    // Leucht-Schein
    ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.ellipse(bildX, (nullY + spitzeY) / 2, 26, Bsicht * pxProCm / 2 + 8, 0, 0, 7); ctx.fill(); ctx.restore();
    pfeilAb(bildX, nullY, Bsicht * pxProCm, cAkzent);

    // Hilfslinien: Fußhöhe (0) und Spitzenhöhe zur Skala
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1; ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(bildX, nullY); ctx.lineTo(skalaX, nullY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(bildX, spitzeY); ctx.lineTo(skalaX, spitzeY); ctx.stroke();
    ctx.setLineDash([]);

    // Beschriftung des Bildes
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Bild (steht auf dem Kopf)", bildX, yTop + 18);
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("Fuß bei 0 — wo zeigt die Spitze?", bildX, spitzeY + 22);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>Vor der Kamera steht fest ein <strong>leuchtender Pfeil</strong> der Größe G = ' + komma(G_CM, 0) + ' cm, und zwar in der festen Entfernung g = ' + komma(g_CM, 0) + ' cm vor dem Loch. Die <strong>Lochkamera</strong> ist ein Kasten: vorn eine <strong>Lochblende</strong> mit einem winzigen Loch, hinten eine <strong>Mattscheibe</strong> als Schirm. Du kannst den Kasten <strong>länger oder kürzer</strong> machen — das ist die <strong>Kameralänge b</strong> (Loch bis Mattscheibe).</p>',
      '<p>Durch das Loch fällt von jedem Punkt des Pfeils genau ein Strahl. Oben und unten kreuzen sich die Strahlen im Loch — deshalb steht das Bild auf der Mattscheibe <strong>auf dem Kopf</strong>. Wie groß das Bild ist, liest du an einer <strong>cm-/mm-Skala</strong> direkt neben dem Bild ab.</p>',
      '<div class="exp-vorhersage"><p><strong>Erst überlegen (Vorhersage):</strong> Was passiert mit dem Bild, wenn du die Kamera <em>länger</em> machst (b größer)?</p>',
      '<select id="exp-poe" class="exp-wahl"><option value="">— bitte wählen —</option><option value="groesser">Das Bild wird größer.</option><option value="gleich">Das Bild bleibt gleich groß.</option><option value="kleiner">Das Bild wird kleiner.</option></select>',
      '<p id="exp-poe-echo" class="exp-meldung" aria-live="polite"></p></div>',
      '<p class="exp-hinweis">Notiere deine Vermutung ruhig auch auf Papier — gleich prüfst du sie mit eigenen Messungen.</p>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    const poe = panel.querySelector("#exp-poe");
    poe.addEventListener("change", () => {
      const echo = panel.querySelector("#exp-poe-echo");
      if (poe.value === "") { echo.textContent = ""; return; }
      echo.textContent = "Vermutung notiert. Ob sie stimmt, zeigen gleich deine Messwerte — du musst nichts vorher wissen.";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchführung ----------
  function panelMessen() {
    const gemesseneB = zustand.messungen.map(m => m.b);
    const knoepfe = B_LAENGEN.map(function (b) {
      const aktiv = (b === zustand.b) ? " zweitrangig-aktiv" : "";
      const fertig = gemesseneB.indexOf(b) >= 0 ? " ✓" : "";
      return '<button class="knopf zweitrangig exp-blen" data-b="' + b + '"' + (aktiv ? ' aria-pressed="true"' : '') + '>' + komma(b, 0) + ' cm' + fertig + '</button>';
    }).join("");
    const zeilen = zustand.messungen.length
      ? zustand.messungen.map(function (m, i) {
          return '<tr><td>' + (i + 1) + '</td><td>' + komma(m.b, 0) + ' cm</td><td>' + komma(m.B, 1) + ' cm</td></tr>';
        }).join("")
      : '<tr><td colspan="3">noch leer</td></tr>';

    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<p>Stell der Reihe nach verschiedene <strong>Kameralängen b</strong> ein. Lies dann unten links an der Skala ab, <strong>wie weit die Pfeilspitze des umgekehrten Bildes reicht</strong> — das ist die Bildgröße B (der Fuß liegt bei 0). Trag B ein.</p>',
      '<div class="exp-masseknoepfe"><strong>Kameralänge b wählen:</strong><br>' + knoepfe + '</div>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-wert">Abgelesene Bildgröße B in cm (bei b = ' + komma(zustand.b, 0) + ' cm):</label>',
      '<input id="exp-wert" class="exp-eingabe" inputmode="decimal" autocomplete="off" size="7">',
      '<button class="knopf">In die Tabelle</button>',
      '</form>',
      '<p class="exp-hinweis">Tipp: Die Spitze des Bildes zeigt auf einen Wert der Skala. Lies auf den Millimeter genau ab (kleine Striche = 1 mm = 0,1 cm).</p>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle"><thead><tr><th>Nr.</th><th>Kameralänge b</th><th>Bildgröße B</th></tr></thead><tbody>' + zeilen + '</tbody></table>',
      '<p>' + zustand.messungen.length + ' von mindestens ' + MIN_MESSUNGEN + ' Messungen — jede mit einer anderen Kameralänge.</p>',
      '<button class="knopf" id="exp-weiter2"' + (zustand.messungen.length >= MIN_MESSUNGEN ? '' : ' disabled') + '>Zur Auswertung</button>',
      '<p class="exp-hinweis">' + (zustand.messungen.length >= MIN_MESSUNGEN ? 'Genug Messungen — weiter zur Auswertung.' : 'Tipp: Miss alle vier Kameralängen, dann wird die Auswertung freigeschaltet.') + '</p>'
    ].join("");

    panel.querySelectorAll(".exp-blen").forEach(function (btn) {
      btn.addEventListener("click", function () {
        setzeZiel(Number(btn.dataset.b));
        panelMessen();
      });
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", function (ev) {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      if (gemesseneB.indexOf(zustand.b) >= 0) {
        meldung.textContent = "Diese Kameralänge hast du schon gemessen — wähle eine andere Länge.";
        return;
      }
      const wahr = anzeigeB(zustand.b);
      if (!ablesungOk(eingabe, wahr, ABLESE_TOLERANZ_CM)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Bis zu welchem Wert reicht die Pfeilspitze auf der Skala? (Kleine Striche = 1 mm.)";
        return;
      }
      zustand.messungen.push({ b: zustand.b, B: eingabe });
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Eingetragen — Messung " + zustand.messungen.length + ".";
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", function () { wechslePhase("auswerten"); });
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const zeilen = zustand.messungen.slice().sort(function (a, b) { return a.b - b.b; });
    if (!zeilen.length) {
      panel.innerHTML = [
        '<h2>Auswertung</h2>',
        '<p>Noch keine Messwerte — geh zuerst zur Durchführung und miss mindestens ' + MIN_MESSUNGEN + ' Kameralängen.</p>',
        '<button class="knopf" id="exp-zurueck0">Zur Durchführung</button>'
      ].join("");
      panel.querySelector("#exp-zurueck0").addEventListener("click", function () { wechslePhase("messen"); });
      return;
    }
    const quotienten = zeilen.map(function (z) { return z.B / z.b; });
    const qMittel = mittel(quotienten);
    const prop = bewertungProportional(quotienten);
    const tabZeilen = zeilen.map(function (z) {
      const q = z.B / z.b;
      return '<tr><td>' + komma(z.b, 0) + ' cm</td><td>' + komma(z.B, 1) + ' cm</td><td>' + komma(q, 3) + '</td></tr>';
    }).join("");

    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      '<p>Trage für jede Messung den <strong>Quotienten B : b</strong> ein (Bildgröße geteilt durch Kameralänge). Achte darauf, was dir an dieser Spalte auffällt.</p>',
      '<table class="exp-tabelle"><thead><tr><th>b in cm</th><th>B in cm</th><th>B : b</th></tr></thead><tbody>' + tabZeilen + '</tbody></table>',
      '<p>' + (prop.ok
        ? 'Der Quotient <strong>B : b ist (fast) immer gleich</strong> — rund <strong>' + komma(qMittel, 2) + '</strong>. Genau das bedeutet: <strong>Die Bildgröße B ist proportional zur Kameralänge b.</strong> Verdoppelst du b, verdoppelt sich auch B.'
        : 'Schau dir die letzte Spalte an: Liegen die Werte nicht alle nahe beieinander, hat sich beim Ablesen ein Fehler eingeschlichen — miss die betroffene Länge in der Durchführung noch einmal.') + '</p>',
      '<form id="exp-rechnung" class="exp-ablesen">',
      '<p>Der Quotient B : b ist hier rund ' + komma(qMittel, 2) + '. Multipliziert mit der festen Entfernung g = ' + komma(g_CM, 0) + ' cm muss daraus wieder die <strong>Gegenstandsgröße G</strong> herauskommen (Strahlensatz: B/G = b/g, also G = (B : b) · g). Rechne G aus:</p>',
      '<label for="exp-G">G in cm:</label>',
      '<input id="exp-G" class="exp-eingabe" inputmode="decimal" autocomplete="off" size="7">',
      '<button class="knopf">Prüfen</button>',
      '</form>',
      '<p id="exp-rechnung-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<p class="exp-hinweis"><strong>Merke:</strong> An der Lochkamera gilt der Strahlensatz B : G = b : g. Bei festem Gegenstand (G und g fest) wächst das Bild B <strong>proportional zur Kameralänge b</strong> — und es steht immer auf dem Kopf.</p>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — warum schwanken deine Werte?</summary><p>Genauer als etwa einen halben Millimeter kann man die Pfeilspitze auf der Skala nicht ablesen — und nur, wenn man senkrecht draufschaut (sonst <em>Parallaxenfehler</em>). Außerdem ist ein echtes Lochbild nie ganz scharf: Ist das Loch zu groß, verschwimmt der Rand des Bildes; ist es sehr klein, wird das Bild dunkel. Deshalb stimmen Messung und Rechnung nie ganz exakt überein.</p></details>',
      '<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button><button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button><button class="knopf" id="exp-neustart">Neues Experiment</button></div>'
    ].join("");

    panel.querySelector("#exp-zurueck").addEventListener("click", function () { wechslePhase("messen"); });
    panel.querySelector("#exp-neustart").addEventListener("click", function () {
      zustand.messungen = [];
      setzeZiel(B_LAENGEN[0]);
      wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", function () {
      csvHerunterladen("lochkamera-messwerte.csv", ["b in cm", "B in cm", "B durch b"],
        zeilen.map(function (z) { return [z.b, z.B, z.B / z.b]; }));
    });
    panel.querySelector("#exp-rechnung").addEventListener("submit", function (ev) {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-G").value);
      const soll = gegenstandAusQuotient(qMittel);
      const ziel = panel.querySelector("#exp-rechnung-meldung");
      if (ablesungOk(eingabe, soll, 1.5)) {
        ziel.textContent = "✓ Genau! Aus B : b und der Entfernung g bekommst du die Gegenstandsgröße G ≈ " + komma(soll, 0) + " cm zurück — das passt zum festen Pfeil.";
      } else {
        ziel.textContent = "✗ Noch nicht: Rechne (B : b) · g, also rund " + komma(qMittel, 2) + " · " + komma(g_CM, 0) + " cm.";
      }
    });
  }

  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
  }

  setzeZiel(B_LAENGEN[0]);
  wechslePhase("aufbau");
}
