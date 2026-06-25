// experiment.js — Interaktives Experiment: Reflexionsgesetz am ebenen Spiegel (Klasse 6).
// Realitaetsnahe Messpraxis: Ein schmaler Lichtstrahl trifft unter einem waehlbaren
// Einfallswinkel alpha (gemessen ZUM LOT) auf einen ebenen Spiegel. Der reflektierte
// Strahl zeigt auf der Gradskala des Winkelmessers auf einen ablesbaren Wert — den
// Reflexionswinkel beta liest die Schuelerin/der Schueler SELBST ab und traegt ihn ein.
// Entdeckung: beta = alpha (Reflexionsgesetz); einfallender und reflektierter Strahl
// liegen symmetrisch zum Lot. Die kleine Ablese-Streuung ist deterministisch geseedet,
// damit die TESTS in Node laufen.

import {
  streuung, parseDezimal, komma, ablesungOk, esc,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Aufbau-Daten (rein, Node-testbar) ----------
export const WINKEL = [20, 30, 45, 60];   // waehlbare Einfallswinkel alpha in Grad
export const STREU_GRAD = 2;              // Spanne der Ablese-Streuung (±1°)
export const TOLERANZ_GRAD = 2;           // akzeptierte Ablesegenauigkeit in Grad

// ---------- Physik (exakt) ----------
// Reflexionsgesetz: Reflexionswinkel = Einfallswinkel, beide zum Lot gemessen.
export function reflexionswinkel(alpha) { return alpha; }

// ---------- Anzeige: wahrer Wert + geseedete Streuung ----------
// Der am Winkelmesser ablesbare beta-Wert (kleine, reproduzierbare Abweichung).
export function anzeigeReflexion(alpha) {
  const b = reflexionswinkel(alpha) + streuung("refl:" + alpha, STREU_GRAD);
  return Math.max(0, Math.min(90, b));
}

// ---------- Auswertung (rein) ----------
export function verhaeltnis(beta, alpha) { return alpha > 0 ? beta / alpha : NaN; }
export function differenz(beta, alpha) { return beta - alpha; }
export function bewerteAblesung(gemessen, wahr, toleranz) {
  return ablesungOk(gemessen, wahr, toleranz);
}

// ---------- TESTS (laufen in Node, kein document/window noetig) ----------
export const TESTS = [
  { name: "Reflexionsgesetz: beta = alpha fuer alle Winkel", ok: () => WINKEL.every(a => reflexionswinkel(a) === a) },
  { name: "Unabhaengige Nachrechnung: differenz(beta,alpha) = 0", ok: () => WINKEL.every(a => differenz(reflexionswinkel(a), a) === 0) },
  { name: "Verhaeltnis beta:alpha = 1", ok: () => WINKEL.every(a => Math.abs(verhaeltnis(reflexionswinkel(a), a) - 1) < 1e-12) },
  { name: "Anzeige deterministisch (gleicher Aufruf, gleicher Wert)", ok: () => WINKEL.every(a => anzeigeReflexion(a) === anzeigeReflexion(a)) },
  { name: "Anzeige-Streuung hoechstens halbe Spanne (±1°)", ok: () => WINKEL.every(a => Math.abs(anzeigeReflexion(a) - reflexionswinkel(a)) <= STREU_GRAD / 2 + 1e-12) },
  { name: "Anzeige bleibt im Skalenbereich 0..90°", ok: () => WINKEL.every(a => anzeigeReflexion(a) >= 0 && anzeigeReflexion(a) <= 90) },
  { name: "Ablesetoleranz ±2°", ok: () => bewerteAblesung(31, 30, TOLERANZ_GRAD) && !bewerteAblesung(34, 30, TOLERANZ_GRAD) && !bewerteAblesung(NaN, 30, TOLERANZ_GRAD) },
  { name: "parseDezimal: Komma und Punkt", ok: () => parseDezimal("30,0") === 30 && parseDezimal("30.0") === 30 && Number.isNaN(parseDezimal("schraeg")) }
];

// ======================================================================
// Browser-Teil — nur hier DOM/Canvas
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    alpha: 30,
    an: false,
    zeig: 0, von: 0, ziel: 0, animStart: 0,
    messungen: [],
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
    '<canvas id="exp-canvas" width="360" height="500" aria-label="Versuchsaufbau: ebener Spiegel waagerecht, senkrechtes Lot im Auftreffpunkt, ein einfallender Lichtstrahl von schräg oben und der reflektierte Strahl, dazu ein Winkelmesser-Halbkreis mit Gradskala von 0 bis 90 Grad auf beiden Seiten des Lots."></canvas>',
    '</div>',
    '<div class="exp-rechts" id="exp-panel"></div>'
  ].join("");
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  // Geometrie des Winkelmessers
  const CX = 180, CY = 340, R = 150;   // Mittelpunkt = Auftreffpunkt, Radius
  const GRAD = Math.PI / 180;

  function setzeZiel() {
    zustand.ziel = zustand.an ? anzeigeReflexion(zustand.alpha) : 0;
    zustand.von = zustand.zeig;
    zustand.animStart = performance.now();
    if (reduziert) { zustand.zeig = zustand.ziel; zeichne(); }
    else anim();
  }
  function anim() {
    const t = Math.min(1, (performance.now() - zustand.animStart) / 400);
    const e = 1 - Math.pow(1 - t, 3);
    zustand.zeig = zustand.von + (zustand.ziel - zustand.von) * e;
    zeichne();
    if (t < 1) requestAnimationFrame(anim);
  }

  // ---------- Zeichen-Helfer ----------
  // Punkt auf dem Winkelmesser-Halbkreis. winkelGrad: 0 = senkrecht nach oben (Lot),
  // seite: -1 = links (einfallend), +1 = rechts (reflektiert).
  function randPunkt(winkelGrad, seite, radius) {
    const a = winkelGrad * GRAD;
    return { x: CX + seite * radius * Math.sin(a), y: CY - radius * Math.cos(a) };
  }
  function linie(x1, y1, x2, y2, strichFarbe, breite) {
    ctx.strokeStyle = strichFarbe; ctx.lineWidth = breite || 2;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  }

  function zeichne() {
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cBg = farbe("--bg", "#fff"),
          cFlaeche = farbe("--flaeche", "#f4f6f8");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = "round"; ctx.lineJoin = "round";

    // Kopfzeile
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillStyle = cLeise; ctx.fillText("Einfallswinkel (gewählt)", 14, 20);
    ctx.fillStyle = cText; ctx.textAlign = "right"; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("α = " + komma(zustand.alpha, 0) + "°", 346, 20);
    ctx.textAlign = "left"; ctx.font = "12px system-ui, sans-serif";

    zeichneWinkelmesser(cText, cLeise, cFlaeche);
    zeichneSpiegel(cText, cLeise);
    zeichneStrahlen(cText, cLeise, cAkzent, cBg);
  }

  function zeichneWinkelmesser(cText, cLeise, cFlaeche) {
    // schwach getoenter Halbkreis als Skalenflaeche
    ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    ctx.moveTo(CX - R, CY);
    ctx.arc(CX, CY, R, Math.PI, 2 * Math.PI, false);
    ctx.closePath(); ctx.fill();
    // Rand des Halbkreises
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(CX, CY, R, Math.PI, 2 * Math.PI, false); ctx.stroke();

    // Gradteilung 0..90 auf beiden Seiten des Lots, alle 10 Grad beschriftet, dazwischen 5er-Striche
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    for (const seite of [-1, 1]) {
      for (let g = 0; g <= 90; g += 5) {
        const beschriftet = g % 10 === 0;
        const aussen = randPunkt(g, seite, R);
        const innen = randPunkt(g, seite, R - (beschriftet ? 13 : 7));
        ctx.strokeStyle = beschriftet ? cText : cLeise;
        ctx.lineWidth = beschriftet ? 1.5 : 1;
        linie(aussen.x, aussen.y, innen.x, innen.y, ctx.strokeStyle, ctx.lineWidth);
        if (beschriftet && (g === 0 ? seite === 1 : true) && g !== 90) {
          // 0 nur einmal mittig setzen (bei seite +1), 90 spaeter separat
          const t = randPunkt(g, seite, R - 26);
          ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif";
          ctx.fillText(String(g), t.x, t.y);
        }
      }
    }
    // 90-Grad-Beschriftung an den Enden (etwas eingerueckt, damit nicht abgeschnitten)
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif";
    ctx.fillText("90", CX - R + 14, CY - 8);
    ctx.fillText("90", CX + R - 14, CY - 8);

    // Mittelpunkt-Markierung (Auftreffpunkt)
    ctx.fillStyle = cText;
    ctx.beginPath(); ctx.arc(CX, CY, 3, 0, 7); ctx.fill();
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function zeichneSpiegel(cText, cLeise) {
    // ebener Spiegel: waagerechte Linie durch den Auftreffpunkt, mit Schraffur nach unten
    const x1 = CX - R - 6, x2 = CX + R + 6;
    ctx.strokeStyle = cText; ctx.lineWidth = 3;
    linie(x1, CY, x2, CY, cText, 3);
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    for (let x = x1 + 4; x < x2; x += 12) {
      ctx.beginPath(); ctx.moveTo(x, CY); ctx.lineTo(x - 8, CY + 10); ctx.stroke();
    }
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "right"; ctx.textBaseline = "alphabetic";
    ctx.fillText("ebener Spiegel", x2, CY + 26);
    ctx.textAlign = "left";

    // Lot (Normale): gestrichelte senkrechte Linie nach oben
    ctx.save();
    ctx.setLineDash([6, 5]); ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX, CY - R - 22); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Lot", CX, CY - R - 28);
    ctx.textAlign = "left";
  }

  function zeichneStrahlen(cText, cLeise, cAkzent, cBg) {
    if (!zustand.an) {
      // Hinweis im Halbkreis, wenn die Lichtquelle aus ist
      ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.textBaseline = "middle";
      ctx.fillText("Lichtquelle ist aus —", CX, CY - 70);
      ctx.fillText("schalte sie ein.", CX, CY - 53);
      ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
      return;
    }
    const alpha = zustand.alpha;
    const beta = zustand.zeig;

    // Einfallender Strahl: vom Rand (links, Winkel alpha) zum Auftreffpunkt
    const ein = randPunkt(alpha, -1, R);
    linie(ein.x, ein.y, CX, CY, cAkzent, 2.5);
    pfeilspitze(ein.x, ein.y, CX, CY, cAkzent);   // Pfeil zeigt auf den Auftreffpunkt
    // Lichtquelle als kleines Symbol am Strahlanfang
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.arc(ein.x, ein.y, 5, 0, 7); ctx.fill();
    ctx.fillStyle = cBg;
    ctx.beginPath(); ctx.arc(ein.x, ein.y, 2, 0, 7); ctx.fill();

    // Reflektierter Strahl: vom Auftreffpunkt zum Rand (rechts, abgelesener Winkel beta)
    const refl = randPunkt(beta, 1, R);
    linie(CX, CY, refl.x, refl.y, cAkzent, 2.5);
    pfeilspitze(CX, CY, refl.x, refl.y, cAkzent);

    // Markierung, wohin der reflektierte Strahl auf der Skala zeigt
    ctx.fillStyle = cAkzent;
    ctx.beginPath(); ctx.arc(refl.x, refl.y, 4, 0, 7); ctx.fill();

    // Winkelboegen + Beschriftung alpha / beta nahe dem Lot
    ctx.strokeStyle = cText; ctx.lineWidth = 1.25;
    ctx.beginPath(); ctx.arc(CX, CY, 40, -Math.PI / 2 - alpha * GRAD, -Math.PI / 2, false); ctx.stroke();
    ctx.beginPath(); ctx.arc(CX, CY, 52, -Math.PI / 2, -Math.PI / 2 + beta * GRAD, false); ctx.stroke();
    const mAlpha = randPunkt(Math.max(alpha / 2, 15), -1, 100);
    const mBeta = randPunkt(Math.max(beta / 2, 15), 1, 100);
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("α", mAlpha.x, mAlpha.y);
    ctx.fillText("β", mBeta.x, mBeta.y);

    // Klartext-Anzeige des abgelesenen beta unten links (zum Vergleich beim Ablesen)
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif";
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    ctx.fillText("reflektierter Strahl zeigt auf die Gradskala rechts —", 14, CY + 60);
    ctx.fillText("dort den Reflexionswinkel β ablesen.", 14, CY + 76);
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  }

  function pfeilspitze(x1, y1, x2, y2, f) {
    const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1;
    const ux = dx / len, uy = dy / len;
    // Spitze etwas vor dem Endpunkt, damit sie nicht im Rand verschwindet
    const sx = x2 - ux * 4, sy = y2 - uy * 4;
    const gr = 8;
    ctx.fillStyle = f;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx - ux * gr - uy * gr * 0.5, sy - uy * gr + ux * gr * 0.5);
    ctx.lineTo(sx - ux * gr + uy * gr * 0.5, sy - uy * gr - ux * gr * 0.5);
    ctx.closePath(); ctx.fill();
  }

  // ---------- Phase 1: Aufbau ----------
  function panelAufbau() {
    panel.innerHTML = [
      '<h2>Aufbau und Geräte</h2>',
      '<p>Ein schmaler <strong>Lichtstrahl</strong> fällt von schräg oben auf einen <strong>ebenen Spiegel</strong>. Die gestrichelte senkrechte Linie ist das <strong>Lot</strong> (die Normale) im Auftreffpunkt. Den <strong>Einfallswinkel α</strong> misst man immer <strong>zwischen einfallendem Strahl und Lot</strong> — nicht zum Spiegel. Der <strong>Winkelmesser</strong> (Halbkreis mit Gradskala) liegt um den Auftreffpunkt; daran liest du den <strong>Reflexionswinkel β</strong> ab.</p>',
      '<p><strong>Plan:</strong> Stelle nacheinander verschiedene Einfallswinkel ein, schalte die Lichtquelle ein und lies jedes Mal selbst ab, auf welchen Gradwert der reflektierte Strahl zeigt. Trage α und β in die Messtabelle ein.</p>',
      '<p class="exp-hinweis"><strong>Was vermutest du:</strong> Wie groß wird der Reflexionswinkel β im Vergleich zum Einfallswinkel α — kleiner, gleich groß oder größer? Notiere deine Vermutung, bevor du misst.</p>',
      '<label for="exp-alpha"><strong>Einfallswinkel α schon mal wählen:</strong></label>',
      '<select id="exp-alpha" class="exp-wahl">',
      WINKEL.map(w => '<option value="' + w + '">' + w + '°</option>').join(""),
      '</select>',
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>'
    ].join("");
    const wahl = panel.querySelector("#exp-alpha");
    wahl.value = String(zustand.alpha);
    wahl.addEventListener("change", () => {
      zustand.alpha = Number(wahl.value); zustand.an = false; setzeZiel();
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  // ---------- Phase 2: Durchfuehrung ----------
  function panelMessen() {
    const schonGemessen = zustand.messungen.some(m => m.alpha === zustand.alpha);
    const knoepfe = WINKEL.map(w =>
      '<button class="knopf ' + (w === zustand.alpha ? "" : "zweitrangig") + '" data-winkel="' + w + '">' + w + '°</button>'
    ).join("");
    const zeilen = zustand.messungen.length
      ? zustand.messungen.map(m => '<tr><td>' + komma(m.alpha, 0) + '°</td><td>' + komma(m.beta, 0) + '°</td></tr>').join("")
      : '<tr><td colspan="2">noch leer</td></tr>';
    panel.innerHTML = [
      '<h2>Durchführung</h2>',
      '<p><strong>Einfallswinkel α einstellen:</strong></p>',
      '<div class="exp-masseknoepfe" aria-label="Einfallswinkel wählen">', knoepfe, '</div>',
      '<div class="exp-masseknoepfe"><button class="knopf ' + (zustand.an ? "zweitrangig" : "") + '" id="exp-schalter">' + (zustand.an ? "Lichtquelle ausschalten" : "Lichtquelle einschalten") + '</button></div>',
      '<p>' + (zustand.an ? "Lichtquelle <strong>an</strong> — schau, auf welchen Gradwert der reflektierte Strahl rechts vom Lot zeigt, und lies β ab." : "Lichtquelle ist <strong>aus</strong>. Schalte sie ein, dann erscheinen einfallender und reflektierter Strahl.") + '</p>',
      '<form id="exp-ablesen" class="exp-ablesen">',
      '<label for="exp-wert">Reflexionswinkel β am Winkelmesser ablesen (in Grad):</label>',
      '<input id="exp-wert" inputmode="decimal" autocomplete="off" size="7" ' + (zustand.an ? "" : "disabled") + '>',
      '<button class="knopf" ' + (zustand.an ? "" : "disabled") + '>In die Tabelle</button>',
      '</form>',
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + (schonGemessen ? "Für α = " + komma(zustand.alpha, 0) + "° hast du schon gemessen — wähle einen anderen Winkel." : "") + '</p>',
      '<h3>Messtabelle</h3>',
      '<table class="exp-tabelle"><thead><tr><th>Einfallswinkel α</th><th>Reflexionswinkel β</th></tr></thead><tbody>', zeilen, '</tbody></table>',
      '<p>' + zustand.messungen.length + ' von mindestens 4 Messungen.</p>',
      '<button class="knopf" id="exp-weiter2" ' + (zustand.messungen.length >= 4 ? "" : "disabled") + '>Zur Auswertung</button>',
      '<p class="exp-hinweis">' + (zustand.messungen.length >= 4 ? "Genug Messungen — weiter zur Auswertung." : "Tipp: Miss alle vier Winkel, dann wird die Auswertung freigeschaltet.") + '</p>'
    ].join("");

    panel.querySelectorAll("[data-winkel]").forEach(k => k.addEventListener("click", () => {
      zustand.alpha = Number(k.dataset.winkel); zustand.an = false; setzeZiel(); panelMessen();
    }));
    panel.querySelector("#exp-schalter").addEventListener("click", () => {
      zustand.an = !zustand.an; setzeZiel(); panelMessen();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(m => m.alpha === zustand.alpha)) {
        meldung.textContent = "Für diesen Einfallswinkel hast du schon gemessen — wähle einen anderen.";
        return;
      }
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const wahr = anzeigeReflexion(zustand.alpha);
      if (!ablesungOk(eingabe, wahr, TOLERANZ_GRAD)) {
        meldung.textContent = "Schau noch einmal genau hin: Auf welchen Gradwert zeigt der reflektierte Strahl auf der Skala rechts vom Lot? (Auf ein Grad genau ablesen.)";
        return;
      }
      zustand.messungen.push({ alpha: zustand.alpha, beta: eingabe });
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "Eingetragen.";
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    const ms = zustand.messungen.slice().sort((a, b) => a.alpha - b.alpha);
    const zeilen = ms.map(m =>
      '<tr><td>' + komma(m.alpha, 0) + '°</td><td>' + komma(m.beta, 0) + '°</td><td>' + komma(differenz(m.beta, m.alpha), 0) + '°</td></tr>'
    ).join("");
    panel.innerHTML = [
      '<h2>Auswertung</h2>',
      '<table class="exp-tabelle"><thead><tr><th>Einfallswinkel α</th><th>Reflexionswinkel β</th><th>β − α</th></tr></thead><tbody>', zeilen, '</tbody></table>',
      '<p>Vergleiche in jeder Zeile α und β. Die Differenz β − α ist (bis auf winzige Ablesefehler) jedes Mal <strong>null</strong> — also ist <strong>β so groß wie α</strong>.</p>',
      '<form id="exp-frage" class="exp-ablesen">',
      '<p>Stelle selbst fest: Wie groß ist der Reflexionswinkel β, wenn der Einfallswinkel α = 50° beträgt?</p>',
      '<label for="exp-frage-wert">β in Grad:</label>',
      '<input id="exp-frage-wert" inputmode="decimal" autocomplete="off" size="7">',
      '<button class="knopf">Prüfen</button>',
      '</form>',
      '<p id="exp-frage-meldung" class="exp-meldung" aria-live="polite"></p>',
      '<p class="exp-hinweis"><strong>Reflexionsgesetz:</strong> Der Reflexionswinkel ist genauso groß wie der Einfallswinkel (β = α). Beide werden zum Lot gemessen, und einfallender und reflektierter Strahl liegen symmetrisch zum Lot.</p>',
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — wie genau sind deine Werte?</summary><p>Am Winkelmesser kann man nur auf etwa ein bis zwei Grad genau ablesen, und das auch nur mit Blick genau senkrecht auf die Skala (sonst entsteht ein Parallaxenfehler — der Strahl scheint je nach Blickrichtung auf einen anderen Strich zu zeigen). Außerdem hat ein echter Lichtstrahl eine kleine Breite. Deshalb stimmen α und β nie auf die Nachkommastelle überein, sind aber im Rahmen der Ablesegenauigkeit gleich groß.</p></details>',
      '<div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button><button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button><button class="knopf" id="exp-neustart">Neues Experiment</button></div>'
    ].join("");

    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.messungen = [];
      zustand.alpha = 30; zustand.an = false; setzeZiel(); wechslePhase("aufbau");
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const reihen = ms.map(m => [m.alpha, m.beta, differenz(m.beta, m.alpha)]);
      csvHerunterladen("reflexionsgesetz-messwerte.csv", ["Einfallswinkel α in Grad", "Reflexionswinkel β in Grad", "β minus α in Grad"], reihen);
    });
    panel.querySelector("#exp-frage").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-frage-wert").value);
      const ziel = panel.querySelector("#exp-frage-meldung");
      if (ablesungOk(eingabe, 50, 0.5)) ziel.textContent = "Genau! β = α = 50°. Das ist das Reflexionsgesetz.";
      else ziel.textContent = "Noch nicht: Der Reflexionswinkel ist genauso groß wie der Einfallswinkel — also β = 50°.";
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
