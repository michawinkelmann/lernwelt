// experiment.js — Interaktives Experiment: Halbwertszeit T½ (Klasse 10, Atom- und
// Kernphysik). Realitätsnahe Messpraxis: ein kurzlebiges Präparat (Modell:
// metastabiles Ba-137m, T½ ≈ 153 s) liegt vor einem Geiger-Müller-Zählrohr. Der
// Lernende misst in festen Zeitabständen (Torzeit) die Impulszahl, liest den
// Zählerstand SELBST am Display ab, rechnet die Zählrate R = N/T aus und trägt sie
// in das Protokoll ein. Das Experiment plottet daraus die Abklingkurve R(t). In der
// Auswertung bestimmt der Lernende T½ aus mehreren Halbierungen und mittelt.
// Die gezählten Impulse folgen einer deterministisch geseedeten Poisson-Statistik
// (Normal-Approximation): die ±sqrt(N)-Streuung ist hier LERNINHALT, kein Fehler.
// Die Modulebene ist DOM-frei; alles Browser-Spezifische lebt in starteExperiment().

import {
  mulberry32, seedAus, parseDezimal, komma, mittel, esc, ablesungOk,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
export const HALBWERTSZEIT = 150;   // s — wahre Halbwertszeit (Modell: Ba-137m, gerundet)
export const ZERFALLSKONST = Math.LN2 / HALBWERTSZEIT; // lambda in 1/s
export const R_START = 200;         // Imp/s — wahre Netto-Anfangs-Zählrate bei t = 0
export const NULLRATE = 0.4;        // Imp/s — Umgebungsstrahlung (klein, hier vernachlässigt)
export const TORZEIT = 10;          // s — feste Torzeit jeder Einzelmessung
export const MESSABSTAND = 30;      // s — Abstand der Messzeitpunkte
export const ANZAHL_MESSPUNKTE = 13; // t = 0, 30, 60, … , 360 s
export const TOLERANZ_RATE = 0.6;   // Imp/s — Eintrag von R = N/T (Streuung berücksichtigt)
export const TOLERANZ_THALB = 25;   // s — abgelesene Halbwertszeit gilt als richtig
export const MIN_MESSPUNKTE = 8;    // so viele Messpunkte vor der Auswertung

export const messZeiten = () => {
  const t = [];
  for (let i = 0; i < ANZAHL_MESSPUNKTE; i++) t.push(i * MESSABSTAND);
  return t;
};

// ---------- Physik (rein, Node-testbar) ----------
// wahre Netto-Zählrate zur Zeit t: exponentielles Zerfallsgesetz
export function rateWahr(t) {
  return R_START * Math.exp(-ZERFALLSKONST * t);
}
// in der Torzeit T um den Zeitpunkt t erwarteter Impuls-Mittelwert (inkl. Untergrund)
export function erwarteteImpulse(t) {
  return (rateWahr(t) + NULLRATE) * TORZEIT;
}

// Phi^-1(p): Quantilfunktion der Standardnormalverteilung (Acklam-Näherung),
// damit die Zählstatistik in Node nachgeprüft werden kann.
export function inversNormal(p) {
  if (!(p > 0 && p < 1)) return NaN;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pu = 0.02425;
  if (p < pu) {
    const q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p > 1 - pu) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
         (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}

// Poisson(mu), deterministisch geseedet, über die Normal-Approximation.
export function poissonGeseedet(mu, schluessel) {
  if (!(mu > 0)) return 0;
  const u = Math.min(1 - 1e-12, Math.max(1e-12, mulberry32(seedAus(schluessel))()));
  return Math.max(0, Math.round(mu + Math.sqrt(mu) * inversNormal(u)));
}

// gezählte Impulse einer Messung zum Zeitpunkt t (lauf erlaubt Wiederholungen)
export function zaehleImpulse(t, lauf) {
  return poissonGeseedet(erwarteteImpulse(t), "hwz:" + t + ":" + lauf);
}

// ---------- Auswertelogik (rein) ----------
export function rateAus(n, T) { return n / T; }
export function rateEintragOk(eingabe, n) {
  return ablesungOk(eingabe, rateAus(n, TORZEIT), TOLERANZ_RATE);
}
// Halbwertszeit aus dem theoretischen Zerfallsgesetz an einem Startwert ablesen:
// gesucht ist die Zeit, bis die Rate auf die Hälfte gefallen ist.
export function halbwertszeitAus(t1, r1, t2, r2) {
  // r2 = r1 * (1/2)^((t2-t1)/T)  ->  T = (t2-t1) * ln2 / ln(r1/r2)
  if (!(r1 > 0 && r2 > 0 && r2 < r1 && t2 > t1)) return NaN;
  return (t2 - t1) * Math.LN2 / Math.log(r1 / r2);
}
export function thalbEintragOk(eingabe) {
  return Number.isFinite(eingabe) && Math.abs(eingabe - HALBWERTSZEIT) <= TOLERANZ_THALB;
}
export function anzahlMesspunkte(messungen) {
  return new Set(messungen.map(m => m.t)).size;
}
export function bereitFuerAuswertung(messungen) {
  return anzahlMesspunkte(messungen) >= MIN_MESSPUNKTE;
}
// zu einem Messpunkt-Zeitpunkt den (idealen) Zeitpunkt finden, an dem die Rate halb so groß ist
export function halbierungsZeit(t) {
  return t + HALBWERTSZEIT;
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "Zerfallsgesetz: R(0)=200, R(150)=100, R(300)=50 Imp/s (exakt halbiert)", ok: () =>
      Math.abs(rateWahr(0) - 200) < 1e-9 &&
      Math.abs(rateWahr(150) - 100) < 1e-9 &&
      Math.abs(rateWahr(300) - 50) < 1e-9 &&
      Math.abs(rateWahr(450) - 25) < 1e-9 },
  { name: "Unabhaengige Nachrechnung lambda = ln2 / T_1/2 reproduziert R(t)", ok: () => {
      const lambda = Math.log(2) / 150;
      for (const t of [0, 30, 75, 150, 220, 300]) {
        const ref = 200 * Math.pow(2, -t / 150);            // ueber Basis 2 statt e
        if (Math.abs(rateWahr(t) - ref) > 1e-9) return false;
        if (Math.abs(rateWahr(t) - 200 * Math.exp(-lambda * t)) > 1e-9) return false;
      }
      return true;
    } },
  { name: "Halbierung nach genau einer Halbwertszeit: R(t+150) = R(t)/2", ok: () =>
      [0, 30, 60, 90, 120, 200].every(t => Math.abs(rateWahr(t + 150) - rateWahr(t) / 2) < 1e-9) },
  { name: "halbwertszeitAus rechnet T_1/2 aus zwei idealen Punkten zurueck (= 150 s)", ok: () =>
      Math.abs(halbwertszeitAus(0, rateWahr(0), 150, rateWahr(150)) - 150) < 1e-6 &&
      Math.abs(halbwertszeitAus(30, rateWahr(30), 210, rateWahr(210)) - 150) < 1e-6 &&
      Math.abs(halbwertszeitAus(0, 200, 90, rateWahr(90)) - 150) < 1e-6 },
  { name: "inversNormal: Phi^-1(0,5)=0 exakt und Phi^-1(0,975) ~ 1,960", ok: () =>
      inversNormal(0.5) === 0 &&
      Math.abs(inversNormal(0.975) - 1.959964) <= 0.01 &&
      Math.abs(inversNormal(0.841345) - 1.0) <= 0.01 },
  { name: "Zaehlung deterministisch reproduzierbar", ok: () =>
      zaehleImpulse(0, 1) === zaehleImpulse(0, 1) &&
      zaehleImpulse(120, 2) === zaehleImpulse(120, 2) },
  { name: "Doppelmessung: zwei Laeufe am selben t -> verschiedene N (Zaehlstatistik)", ok: () =>
      zaehleImpulse(0, 1) !== zaehleImpulse(0, 2) &&
      zaehleImpulse(60, 1) !== zaehleImpulse(60, 2) },
  { name: "Zaehlstatistik: |N - mu| <= 5*sqrt(mu) fuer alle Messzeiten, beide Laeufe", ok: () => {
      for (const t of messZeiten()) {
        for (const lauf of [1, 2]) {
          const mu = erwarteteImpulse(t);
          const n = zaehleImpulse(t, lauf);
          if (n !== zaehleImpulse(t, lauf)) return false;
          if (Math.abs(n - mu) > 5 * Math.sqrt(mu) + 0.5) return false;
        }
      }
      return true;
    } },
  { name: "Eintrag-Toleranzen: Rate +/-0,6 Imp/s, T_1/2 +/-25 s", ok: () =>
      rateEintragOk(rateWahr(0) * TORZEIT / TORZEIT, Math.round(rateWahr(0) * TORZEIT)) &&
      thalbEintragOk(150) && thalbEintragOk(130) && thalbEintragOk(170) &&
      !thalbEintragOk(110) && !thalbEintragOk(NaN) },
  { name: "Messreihen-Logik: Messpunkt-Zaehlung und Auswertungs-Schwelle", ok: () => {
      const m = messZeiten().slice(0, 7).map(t => ({ t }));
      if (anzahlMesspunkte(m) !== 7 || bereitFuerAuswertung(m)) return false;
      const m2 = messZeiten().slice(0, 8).map(t => ({ t }));
      return anzahlMesspunkte(m2) === 8 && bereitFuerAuswertung(m2);
    } }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = {
    phase: "aufbau",
    tIndex: 0,            // aktueller Messzeitpunkt-Index (in messZeiten())
    laufZaehler: {},      // t -> wie oft dort schon gezaehlt wurde
    zaehlung: null,       // { t, T, N, lauf, fertig, verbucht }
    anzeigeN: 0,
    fortschritt: 0,
    messungen: [],        // { t, N, R }
    vorhersage: ""
  };
  let animId = 0;
  const ZEITEN = messZeiten();

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML =
    '<div class="exp-links">' +
    '<canvas id="exp-canvas" width="400" height="540" aria-label="Versuchsaufbau: links ein radioaktives Präparat vor einem Geiger-Müller-Zählrohr, daneben ein digitaler Impulszähler mit Display, Torzeit-Anzeige und Fortschrittsbalken. Darunter ein Diagramm der Zählrate über der Zeit, in das die eigenen Messpunkte eingetragen werden."></canvas>' +
    '</div>' +
    '<div class="exp-rechts" id="exp-panel"></div>';
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const aktuelleZeit = () => ZEITEN[zustand.tIndex];

  // ---------- Zählung starten / beenden ----------
  function starteZaehlung() {
    const t = aktuelleZeit();
    const lauf = (zustand.laufZaehler[t] || 0) + 1;
    zustand.laufZaehler[t] = lauf;
    const N = zaehleImpulse(t, lauf);
    zustand.zaehlung = { t, T: TORZEIT, N, lauf, fertig: false, verbucht: false };
    zustand.anzeigeN = 0;
    zustand.fortschritt = 0;
    cancelAnimationFrame(animId);
    if (reduziert) { beendeZaehlung(); return; }
    const start = performance.now(), dauer = 1600;
    const tick = jetzt => {
      const f = Math.min(1, (jetzt - start) / dauer);
      zustand.fortschritt = f;
      zustand.anzeigeN = Math.round(zustand.zaehlung.N * f);
      zeichne();
      if (f < 1) animId = requestAnimationFrame(tick);
      else beendeZaehlung();
    };
    animId = requestAnimationFrame(tick);
    panelMessen();
  }
  function beendeZaehlung() {
    zustand.fortschritt = 1;
    zustand.anzeigeN = zustand.zaehlung.N;
    zustand.zaehlung.fertig = true;
    zeichne();
    if (zustand.phase === "messen") panelMessen("✓ Torzeit abgelaufen — lies den Endstand N ab und rechne R = N/T.");
  }

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent"),
          cFlaeche = farbe("--flaeche"), cHauch = farbe("--hauch", "#eee");
    function rrect(x, y, b, hh, rad) {
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, y, b, hh, rad); else ctx.rect(x, y, b, hh);
    }
    ctx.clearRect(0, 0, w, h);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";

    // --- Präparat + Zählrohr (oben links) ---
    // Präparat (kleine Quelle auf Halter)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(24, 60, 22, 30); ctx.strokeRect(24, 60, 22, 30);
    ctx.fillStyle = cAkzent; ctx.beginPath(); ctx.arc(46, 66, 4, 0, 7); ctx.fill();
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText;
    ctx.fillRect(22, 90, 26, 10); ctx.strokeRect(22, 90, 26, 10);
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("Präparat", 18, 52);
    // angedeutete Strahlung
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.5; ctx.setLineDash([4, 4]);
    for (const dy of [-8, 0, 8]) {
      ctx.beginPath(); ctx.moveTo(50, 66); ctx.lineTo(96, 66 + dy); ctx.stroke();
    }
    ctx.setLineDash([]);
    // GM-Zählrohr
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.fillRect(96, 56, 6, 24); ctx.strokeRect(96, 56, 6, 24);
    ctx.lineWidth = 2; rrect(102, 50, 44, 36, 6);
    ctx.fillStyle = cFlaeche; ctx.fill(); ctx.strokeStyle = cText; ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.fillText("GM-Rohr", 124, 102);
    ctx.textAlign = "start";

    // --- digitaler Impulszähler (oben rechts) ---
    const z = zustand.zaehlung;
    const laeuft = z && !z.fertig;
    rrect(176, 44, 200, 124, 10);
    ctx.fillStyle = cFlaeche; ctx.fill(); ctx.strokeStyle = cText; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Digitaler Impulszähler", 188, 64);
    // Display
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(188, 74, 120, 40); ctx.strokeRect(188, 74, 120, 40);
    ctx.fillStyle = cText; ctx.font = "bold 26px ui-monospace, Consolas, monospace"; ctx.textAlign = "end";
    ctx.fillText(String(zustand.anzeigeN), 302, 104);
    ctx.font = "10px system-ui, sans-serif"; ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("Impulse N", 188, 128);
    // Torzeit + Status
    ctx.fillStyle = cLeise; ctx.fillText("Torzeit", 320, 86);
    ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
    ctx.fillText("T = " + TORZEIT + " s", 320, 102);
    ctx.font = "11px system-ui, sans-serif"; ctx.fillStyle = cLeise;
    ctx.fillText(z ? (z.fertig ? "fertig ✓" : "zählt …") : "bereit", 320, 124);
    // Fortschrittsbalken
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5; ctx.strokeRect(188, 140, 176, 12);
    if (z) { ctx.fillStyle = cAkzent; ctx.fillRect(189, 141, 174 * (z.fertig ? 1 : zustand.fortschritt), 10); }
    ctx.fillStyle = cText; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Messzeitpunkt: t = " + aktuelleZeit() + " s", 188, 164);

    // --- Diagramm: Zählrate über der Zeit ---
    const D = { x: 56, y: 220, b: 312, h: 268 };
    const tMax = ZEITEN[ZEITEN.length - 1];      // 360 s
    const rMax = 220;                            // Imp/s (Achsenobergrenze)
    const px = t => D.x + (t / tMax) * D.b;
    const py = r => D.y + D.h - (r / rMax) * D.h;
    // Achsen
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(D.x, D.y - 6); ctx.lineTo(D.x, D.y + D.h); ctx.lineTo(D.x + D.b + 6, D.y + D.h); ctx.stroke();
    // y-Gitter + Beschriftung (Imp/s)
    ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "end";
    for (let r = 0; r <= rMax; r += 50) {
      const y = py(r);
      ctx.strokeStyle = cHauch; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(D.x, y); ctx.lineTo(D.x + D.b, y); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.fillText(String(r), D.x - 6, y + 4);
    }
    // x-Gitter + Beschriftung (s)
    ctx.textAlign = "center";
    for (let t = 0; t <= tMax; t += 60) {
      const x = px(t);
      ctx.strokeStyle = cHauch; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, D.y); ctx.lineTo(x, D.y + D.h); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.fillText(String(t), x, D.y + D.h + 16);
    }
    // Achsentitel
    ctx.fillStyle = cText; ctx.font = "bold 12px system-ui, sans-serif";
    ctx.fillText("Zeit t in s", D.x + D.b / 2, D.y + D.h + 32);
    ctx.save();
    ctx.translate(D.x - 38, D.y + D.h / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillText("Zählrate R in Imp/s", 0, 0); ctx.restore();
    // eigene Messpunkte
    ctx.fillStyle = cAkzent;
    for (const m of zustand.messungen) {
      const x = px(m.t), y = py(Math.min(m.R, rMax));
      ctx.beginPath(); ctx.arc(x, y, 3.5, 0, 7); ctx.fill();
    }
    // Hinweis, wenn noch leer
    if (!zustand.messungen.length) {
      ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.font = "12px system-ui, sans-serif";
      ctx.fillText("Hier erscheint deine Abklingkurve, Punkt für Punkt.", D.x + D.b / 2, D.y + D.h / 2);
    }
    ctx.textAlign = "start";
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML =
      '<h2>Aufbau und Geräte</h2>' +
      '<p>Vor einem <strong>Geiger-Müller-Zählrohr</strong> liegt ein frisch präpariertes, <strong>kurzlebiges</strong> Präparat (Modell eines Bariumisotops). Ein <strong>digitaler Impulszähler</strong> zählt die Impulse, solange die <strong>Torzeit</strong> von ' + TORZEIT + ' s läuft. Das Präparat zerfällt erkennbar schnell — seine Zählrate nimmt von Messung zu Messung ab.</p>' +
      '<p><strong>Plan:</strong> Miss <strong>alle ' + MESSABSTAND + ' Sekunden</strong> die Impulszahl in einer Torzeit von ' + TORZEIT + ' s, rechne jedes Mal die Zählrate <strong>R = N/T</strong> aus und trag sie ins Protokoll ein. Aus der <strong>Abklingkurve</strong> R(t) bestimmst du die <strong>Halbwertszeit T<sub>½</sub></strong> — die Zeit, in der die Zählrate auf die Hälfte sinkt.</p>' +
      '<p class="exp-hinweis">⚠ Im echten Labor gelten die drei A des Strahlenschutzes: <strong>A</strong>bstand halten, <strong>A</strong>bschirmung nutzen, <strong>A</strong>ufenthaltsdauer kurz. Präparate nur mit der Zange greifen.</p>' +
      '<label for="exp-vorhersage"><strong>Deine Vorhersage:</strong> Wie nimmt die Zählrate mit der Zeit ab?</label>' +
      '<select id="exp-vorhersage" class="exp-wahl">' +
      '<option value="">— bitte wählen —</option>' +
      '<option value="linear"' + (zustand.vorhersage === "linear" ? " selected" : "") + '>Gleichmäßig: in jeder gleichen Zeitspanne um denselben Betrag (Gerade).</option>' +
      '<option value="exp"' + (zustand.vorhersage === "exp" ? " selected" : "") + '>In jeder gleichen Zeitspanne um denselben Anteil — z. B. immer auf die Hälfte (fallende Kurve).</option>' +
      '<option value="konstant"' + (zustand.vorhersage === "konstant" ? " selected" : "") + '>Gar nicht: Sie bleibt gleich, schwankt nur etwas.</option>' +
      '</select>' +
      '<p id="exp-vorhersage-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>';
    panel.querySelector("#exp-vorhersage").addEventListener("change", ev => {
      zustand.vorhersage = ev.target.value;
      panel.querySelector("#exp-vorhersage-meldung").textContent =
        ev.target.value ? "Notiert — am Ende prüfst du das an deiner eigenen Kurve." : "";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen(meldung = "") {
    const z = zustand.zaehlung;
    const laeuft = z && !z.fertig;
    const formBereit = z && z.fertig && !z.verbucht;
    const t = aktuelleZeit();
    const schonGemessen = zustand.messungen.some(m => m.t === t);
    const naechsterFehlt = ZEITEN.find(zt => !zustand.messungen.some(m => m.t === zt));
    const optionen = ZEITEN.map(zt => {
      const fertig = zustand.messungen.some(m => m.t === zt);
      return '<option value="' + zt + '"' + (zt === t ? " selected" : "") + '>' + zt + ' s' + (fertig ? " ✓" : "") + '</option>';
    }).join("");
    panel.innerHTML =
      '<h2>Durchführung</h2>' +
      '<div class="exp-regler">' +
      '<label for="exp-tpunkt"><strong>Messzeitpunkt wählen:</strong> t = </label>' +
      '<select id="exp-tpunkt" class="exp-wahl" ' + (laeuft ? "disabled" : "") + '>' + optionen + '</select>' +
      '</div>' +
      '<button class="knopf" id="exp-start" ' + (laeuft || schonGemessen ? "disabled" : "") + '>Zählen starten (T = ' + TORZEIT + ' s)</button>' +
      (schonGemessen ? '<p class="exp-hinweis">Diesen Zeitpunkt hast du schon gemessen — wähle einen anderen' + (naechsterFehlt !== undefined ? " (offen: t = " + naechsterFehlt + " s)" : "") + '.</p>' : "") +
      '<form id="exp-eintrag" class="exp-ablesen">' +
      '<label for="exp-n-eintrag">Zählerstand N ablesen:</label>' +
      '<input id="exp-n-eintrag" inputmode="numeric" autocomplete="off" size="6" ' + (formBereit ? "" : "disabled") + '>' +
      '<label for="exp-r-eintrag">R = N/T in Imp/s</label>' +
      '<input id="exp-r-eintrag" inputmode="decimal" autocomplete="off" size="6" ' + (formBereit ? "" : "disabled") + '>' +
      '<button class="knopf" ' + (formBereit ? "" : "disabled") + '>In die Tabelle</button>' +
      '</form>' +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(meldung) + '</p>' +
      '<h3>Messtabelle</h3>' +
      '<table class="exp-tabelle"><thead><tr><th>t in s</th><th>N</th><th>R = N/T in Imp/s</th></tr></thead>' +
      '<tbody>' + (zustand.messungen.length
        ? [...zustand.messungen].sort((a, b) => a.t - b.t).map(m =>
            '<tr><td>' + m.t + '</td><td>' + m.N + '</td><td>' + komma(m.R, 1) + '</td></tr>').join("")
        : '<tr><td colspan="3">noch leer</td></tr>') + '</tbody></table>' +
      '<p>Bisher: <strong>' + anzahlMesspunkte(zustand.messungen) + '</strong> von mindestens ' + MIN_MESSPUNKTE + ' Messpunkten. Die Kurve baut sich links Punkt für Punkt auf.</p>' +
      '<button class="knopf" id="exp-weiter2" ' + (bereitFuerAuswertung(zustand.messungen) ? "" : "disabled") + '>Zur Auswertung</button>';
    panel.querySelector("#exp-tpunkt").addEventListener("change", ev => {
      zustand.tIndex = ZEITEN.indexOf(Number(ev.target.value));
      const zz = zustand.zaehlung;
      if (zz && zz.fertig && !zz.verbucht) {
        zustand.zaehlung = null; zustand.anzeigeN = 0; zustand.fortschritt = 0;
        zeichne();
        panelMessen("Anderer Zeitpunkt gewählt — die nicht eingetragene Zählung ist verworfen. Starte neu.");
        return;
      }
      zeichne();
      panelMessen();
    });
    panel.querySelector("#exp-start").addEventListener("click", () => { if (!schonGemessen) starteZaehlung(); });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-eintrag").addEventListener("submit", ev => {
      ev.preventDefault();
      const zz = zustand.zaehlung;
      if (!(zz && zz.fertig && !zz.verbucht)) return;
      const en = parseDezimal(panel.querySelector("#exp-n-eintrag").value);
      const er = parseDezimal(panel.querySelector("#exp-r-eintrag").value);
      const meldungEl = panel.querySelector("#exp-meldung");
      if (!Number.isFinite(en) || en !== zz.N) {
        meldungEl.textContent = "✗ Tippe den Zählerstand N exakt vom Display ab — Ziffer für Ziffer, ohne Rundung.";
        return;
      }
      if (!rateEintragOk(er, zz.N)) {
        meldungEl.textContent = "✗ Rechne R = N geteilt durch die Torzeit T = " + TORZEIT + " s. Beispiel: 1840 Impulse ÷ 10 s = 184 Imp/s.";
        return;
      }
      zz.verbucht = true;
      zustand.messungen.push({ t: zz.t, N: zz.N, R: rateAus(zz.N, TORZEIT) });
      zeichne();
      const offen = ZEITEN.find(zt => !zustand.messungen.some(m => m.t === zt));
      if (offen !== undefined) zustand.tIndex = ZEITEN.indexOf(offen);
      panelMessen("✓ Eingetragen — der Punkt steht jetzt im Diagramm." + (offen !== undefined ? " Weiter mit t = " + offen + " s." : " Alle Messpunkte aufgenommen!"));
    });
  }

  function panelAuswerten() {
    if (!bereitFuerAuswertung(zustand.messungen)) {
      panel.innerHTML =
        '<h2>Auswertung</h2>' +
        '<p>Für eine belastbare Abklingkurve brauchst du <strong>mindestens ' + MIN_MESSPUNKTE + ' Messpunkte</strong>.</p>' +
        '<p>Aktuell: ' + anzahlMesspunkte(zustand.messungen) + ' Messpunkte.</p>' +
        '<button class="knopf" id="exp-zurueck0">Zur Durchführung</button>';
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const zeilen = [...zustand.messungen].sort((a, b) => a.t - b.t);
    const r0 = zeilen[0].R;                 // gemessene Anfangsrate (bei t = 0, falls vorhanden)
    const tStart = zeilen[0].t;
    panel.innerHTML =
      '<h2>Auswertung</h2>' +
      '<h3>1 · Die Abklingkurve lesen</h3>' +
      '<p>Links steht deine Kurve. Sie fällt nicht geradlinig, sondern <strong>immer langsamer</strong> — in gleichen Zeitspannen jeweils um denselben <em>Anteil</em>. Das ist der typische <strong>exponentielle Zerfall</strong>.</p>' +
      '<h3>2 · Halbwertszeit aus mehreren Halbierungen</h3>' +
      '<p>Such dir aus der Tabelle einen Startwert und lies ab, nach welcher Zeit die Zählrate auf die <strong>Hälfte</strong>, dann auf ein <strong>Viertel</strong>, dann auf ein <strong>Achtel</strong> gefallen ist. Der zeitliche Abstand zwischen zwei Halbierungen ist jeweils die Halbwertszeit T<sub>½</sub> — und der ist (fast) immer gleich groß.</p>' +
      '<details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>' +
      '<p><strong>Teilschritt 1:</strong> Nimm die Startrate aus deiner ersten Zeile (t = ' + tStart + ' s, R ≈ ' + komma(r0, 0) + ' Imp/s). Die Hälfte davon ist etwa ' + komma(r0 / 2, 0) + ' Imp/s.</p>' +
      '<p><strong>Teilschritt 2:</strong> Such in der Tabelle (oder auf der Kurve links) die Zeit, bei der R etwa diesen halben Wert erreicht. Die Differenz zur Startzeit ist deine erste Schätzung für T<sub>½</sub>.</p>' +
      '<p><strong>Teilschritt 3:</strong> Wiederhole das für ein Viertel (' + komma(r0 / 4, 0) + ' Imp/s) und ein Achtel (' + komma(r0 / 8, 0) + ' Imp/s). Bilde den Mittelwert der Abstände — so mitteln sich Ablesefehler heraus.</p>' +
      '</details>' +
      '<table class="exp-tabelle"><thead><tr><th>Anteil der Startrate</th><th>Ziel-Rate in Imp/s</th><th>erreicht bei t ≈ … s</th></tr></thead><tbody>' +
      '<tr><td>1/2</td><td>' + komma(r0 / 2, 0) + '</td><td>' + naechstesT(zeilen, r0 / 2) + '</td></tr>' +
      '<tr><td>1/4</td><td>' + komma(r0 / 4, 0) + '</td><td>' + naechstesT(zeilen, r0 / 4) + '</td></tr>' +
      '<tr><td>1/8</td><td>' + komma(r0 / 8, 0) + '</td><td>' + naechstesT(zeilen, r0 / 8) + '</td></tr>' +
      '</tbody></table>' +
      '<form id="exp-thalbform" class="exp-ablesen">' +
      '<label for="exp-thalb">Deine gemittelte Halbwertszeit T<sub>½</sub> in s:</label>' +
      '<input id="exp-thalb" inputmode="numeric" autocomplete="off" size="6">' +
      '<button class="knopf">Prüfen</button>' +
      '</form>' +
      '<p id="exp-thalb-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<h3>3 · Erkenntnisfragen</h3>' +
      '<p><strong>Warum ist der Abstand zwischen den Halbierungen immer ungefähr gleich?</strong></p>' +
      '<select id="exp-f1" class="exp-wahl" aria-label="Antwort zu Frage 1 auswählen">' +
      '<option value="">— Antwort wählen —</option>' +
      '<option value="a">Zufall — bei einer längeren Messreihe wären die Abstände sehr verschieden.</option>' +
      '<option value="b">Weil sich in jeder Halbwertszeit immer dieselbe Hälfte der noch vorhandenen Kerne umwandelt — egal wie viele es gerade sind.</option>' +
      '<option value="c">Weil das Zählrohr mit der Zeit langsamer wird.</option>' +
      '</select>' +
      '<button class="knopf zweitrangig" id="exp-f1k">Antwort prüfen</button>' +
      '<p id="exp-f1-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<p><strong>Warum streuen die Messpunkte ein wenig um die glatte Kurve?</strong></p>' +
      '<select id="exp-f2" class="exp-wahl" aria-label="Antwort zu Frage 2 auswählen">' +
      '<option value="">— Antwort wählen —</option>' +
      '<option value="a">Der radioaktive Zerfall ist ein Zufallsprozess — N schwankt von Natur aus um etwa ±√N.</option>' +
      '<option value="b">Das Präparat bewegt sich zwischen den Messungen.</option>' +
      '<option value="c">Die Torzeit ist mal länger, mal kürzer als 10 s.</option>' +
      '</select>' +
      '<button class="knopf zweitrangig" id="exp-f2k">Antwort prüfen</button>' +
      '<p id="exp-f2-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — was das Modell vereinfacht</summary>' +
      '<p><strong>Zählstatistik (±√N):</strong> Jeder Zerfall ist ein unabhängiges Zufallsereignis. Bei N Impulsen schwankt die Anzeige um etwa ±√N. Bei kleinem N gegen Ende der Messreihe (große Zeiten) wird die relative Schwankung größer — darum lese man die Halbwertszeit lieber aus den ersten, impulsstarken Halbierungen ab.</p>' +
      '<p><strong>Nullrate:</strong> Auch ohne Präparat tickt das Rohr (hier ≈ ' + komma(NULLRATE, 1) + ' Imp/s Umgebungsstrahlung). Solange die Präparat-Rate noch viel größer ist, stört das kaum; bei sehr langem Zerfall müsste man die Nullrate abziehen.</p>' +
      '<p><strong>Totzeit:</strong> Nach jedem Impuls ist ein GM-Zählrohr kurz blind. Bei sehr hohen Raten (ganz am Anfang) zählt es etwas zu wenig — die echte Anfangsrate ist minimal höher als gemessen.</p>' +
      '</details>' +
      '<div class="exp-knopfzeile">' +
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>' +
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>' +
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>' +
      '</div>';
    panel.querySelector("#exp-thalbform").addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseDezimal(panel.querySelector("#exp-thalb").value);
      const meldungEl = panel.querySelector("#exp-thalb-meldung");
      if (thalbEintragOk(wert)) {
        let text = "✓ Sehr gut: T½ ≈ " + komma(wert, 0) + " s. Der wahre Wert dieses Modellpräparats liegt bei rund " + HALBWERTSZEIT + " s.";
        if (zustand.vorhersage === "exp") text += " Deine Vorhersage vom Anfang war richtig — die Kurve fällt exponentiell!";
        else if (zustand.vorhersage) text += " Vergleiche mit deiner Vorhersage vom Anfang: Die Kurve fällt nicht geradlinig, sondern exponentiell.";
        meldungEl.textContent = text;
      } else {
        meldungEl.textContent = "✗ Noch nicht. Miss den zeitlichen Abstand zwischen zwei Halbierungen (z. B. von der Start- zur Halb-Rate) und mittle über die drei Werte. Liegt zwischen " + (HALBWERTSZEIT - TOLERANZ_THALB) + " s und " + (HALBWERTSZEIT + TOLERANZ_THALB) + " s.";
      }
    });
    function frage(idWahl, idKnopf, idMeldung, richtig, okText, fehlText) {
      panel.querySelector(idKnopf).addEventListener("click", () => {
        const wahl = panel.querySelector(idWahl).value;
        const m = panel.querySelector(idMeldung);
        if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
        m.textContent = wahl === richtig ? okText : fehlText;
      });
    }
    frage("#exp-f1", "#exp-f1k", "#exp-f1-meldung", "b",
      "✓ Genau: In jeder Halbwertszeit zerfällt immer dieselbe Hälfte des noch vorhandenen Bestands. Aus 200 wird 100, aus 100 wird 50, aus 50 wird 25 — gleicher Anteil, gleicher Zeitabstand. Das ist das Kennzeichen des exponentiellen Zerfalls.",
      "✗ Noch nicht. Das Zählrohr ist in Ordnung, und Zufall steckt nur in der kleinen Streuung. Überlege: Welcher Anteil der vorhandenen Kerne wandelt sich in einer Halbwertszeit um — und hängt das davon ab, wie viele schon zerfallen sind?");
    frage("#exp-f2", "#exp-f2k", "#exp-f2-meldung", "a",
      "✓ Richtig: Zählstatistik! Jeder Zerfall ist zufällig; erwartbar ist eine Schwankung von etwa ±√N. Deshalb liegen die Punkte nicht exakt, aber nahe auf der glatten Kurve.",
      "✗ Die Torzeit ist konstant, und das ruhende Präparat bewegt sich nicht. Was bleibt? Denk an die zufällige Natur des Zerfalls und an ±√N.");
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const datenZeilen = zeilen.map(m => [String(m.t), String(m.N), m.R]);
      csvHerunterladen("halbwertszeit-messwerte.csv",
        ["t in s", "N", "R in Imp/s"], datenZeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      cancelAnimationFrame(animId);
      zustand.tIndex = 0; zustand.laufZaehler = {}; zustand.zaehlung = null;
      zustand.anzeigeN = 0; zustand.fortschritt = 0; zustand.messungen = []; zustand.vorhersage = "";
      zeichne();
      wechslePhase("aufbau");
    });
  }

  // naechster Tabellenwert, dessen Rate <= ziel ist (Zeitpunkt der Halbierung ablesen)
  function naechstesT(zeilen, ziel) {
    const treffer = zeilen.find(m => m.R <= ziel);
    return treffer ? String(treffer.t) : "> " + zeilen[zeilen.length - 1].t;
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
