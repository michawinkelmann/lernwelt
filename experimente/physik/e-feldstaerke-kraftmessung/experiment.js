// experiment.js — Interaktives Experiment: Elektrische Feldstärke aus Kraftmessung (QP, gA+eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Im Plattenkondensator (fester
// Abstand d) stellst du die Plattenspannung U SELBST ein und liest die Kraft F
// auf eine kleine geladene Probekugel am empfindlichen Kraftmesser SELBST ab.
// Aus E = U/d und F = q·E gewinnst du die unbekannte Ladung q: q = F/E = Steigung
// der F-E-Geraden. Die feste Probeladung q bleibt vorab verborgen; die kleine
// Ablesestreuung ist pro U deterministisch geseedet — dadurch bleiben pruefFaelle
// und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, mittel, regression, esc, farbe, bauePhasen, csvHerunterladen, ablesungOk } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const D_PLATTE = 0.050;             // m — fester Plattenabstand (5 cm)
export const Q_PROBE = 8.0e-9;             // C — feste, dem Lernenden UNBEKANNTE Probeladung (8,0 nC)
export const U_MIN = 0, U_MAX = 6000, U_SCHRITT = 250;  // V — Plattenspannung
export const F_STREU_SPANNE = 0.006;       // mN — Ablesestreuung der Kraft (Spanne 0,006 mN → ±0,003 mN)
export const F_TOLERANZ_MN = 0.004;        // akzeptierte Ablesung der Kraft: ±0,004 mN
export const E_TOLERANZ_KVM = 2.0;         // E-Eingabe in kV/m: ±2 kV/m (eine Zeile, gA-Hilfe)
export const Q_TOLERANZ_NC = 0.4;          // q-Eingabe in nC: ±0,4 nC
export const MIN_MESSUNGEN = 6;

// ---------- Physik (rein, Node-testbar) ----------
// Homogenes Feld im Plattenkondensator
export function feldstaerke(uVolt) {
  return uVolt / D_PLATTE;                 // V/m = N/C
}
// Kraft auf die Probeladung (ideal, ohne Streuung)
export function kraftIdeal(uVolt) {
  return Q_PROBE * feldstaerke(uVolt);     // N
}
// am Kraftmesser tatsächlich abgelesene Kraft inkl. reproduzierbarer Streuung — in mN
export function kraftRealMN(uVolt) {
  return kraftIdeal(uVolt) * 1000 + streuung("F:" + uVolt, F_STREU_SPANNE); // mN
}
// Auswertungsformel — die rechnen die Lernenden selbst, das System prüft nur.
// Aus der Steigung der F-E-Geraden (F in N, E in V/m) folgt die Ladung q.
export function ladungAusSteigung(fNewton, eVm) {
  return eVm > 0 ? fNewton / eVm : NaN;    // C  (F = q·E ⇒ q = F/E)
}
// lineare Regression über die Messpunkte (E in V/m, F in N) → Steigung = q
export function ladungAusRegression(punkte) {
  return regression(punkte).m;             // C  (Ursprungsgerade ⇒ b ≈ 0)
}

// ---------- Eingabe-Prüfungen ----------
export function ablesungFOk(eingabeMN, wahrFMN) {
  return ablesungOk(eingabeMN, wahrFMN, F_TOLERANZ_MN);
}
export function feldEingabeOk(eingabeKVM, wahrKVM) {
  return Number.isFinite(eingabeKVM) && Math.abs(eingabeKVM - wahrKVM) <= E_TOLERANZ_KVM;
}
export function ladungEingabeOk(eingabeNC, wahrNC) {
  return Number.isFinite(eingabeNC) && Math.abs(eingabeNC - wahrNC) <= Q_TOLERANZ_NC;
}
export function bewertungQ(ergebnisNC) {
  const wahrNC = Q_PROBE * 1e9;
  const abw = Math.abs(ergebnisNC - wahrNC) / wahrNC * 100;
  if (abw <= 4) return { stufe: "sehr gut", abw };
  if (abw <= 10) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene Spannungen U (U = 0 zählt nicht als Messpunkt)
export function messreiheVollstaendig(messungen) {
  const wirksam = messungen.filter(z => z.U > 0);
  return wirksam.length >= MIN_MESSUNGEN && new Set(wirksam.map(z => z.U)).size >= MIN_MESSUNGEN;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "E", U: 3000, soll: 60000, tol: 1e-6 },         // V/m  (3000 / 0,050)
  { art: "E", U: 6000, soll: 120000, tol: 1e-6 },        // V/m
  { art: "F", U: 3000, soll: 4.8e-4, tol: 1e-9 },        // N    (8e-9 · 60000)
  { art: "F", U: 5000, soll: 8.0e-4, tol: 1e-9 },        // N
  { art: "q", F: 4.8e-4, E: 60000, soll: 8.0e-9, tol: 1e-12 } // C  (F/E)
];

export const TESTS = [
  { name: "Plattenabstand d = 0,050 m fest verdrahtet",
    ok: () => D_PLATTE === 0.05 },
  { name: "Kontrollwert E: U = 3000 V → E = 60 000 V/m (= 60 kV/m)",
    ok: () => Math.abs(feldstaerke(3000) - 60000) <= 1e-6 && Math.abs(feldstaerke(6000) - 120000) <= 1e-6 },
  { name: "Kontrollwert F: U = 3000 V → F = 0,48 mN; U = 5000 V → F = 0,80 mN",
    ok: () => Math.abs(kraftIdeal(3000) - 4.8e-4) <= 1e-9 && Math.abs(kraftIdeal(5000) - 8.0e-4) <= 1e-9 },
  { name: "Linearität F ∝ U: U verdoppeln verdoppelt F exakt",
    ok: () => [500, 1000, 1500, 2000, 3000].every(u =>
      Math.abs(kraftIdeal(2 * u) - 2 * kraftIdeal(u)) <= 1e-15)
      && Math.abs(kraftIdeal(0)) <= 1e-18 },
  { name: "Ursprungsgerade: q aus F/E ist für jedes U dieselbe Konstante = Q_PROBE",
    ok: () => [500, 1500, 2500, 4000, 6000].every(u =>
      Math.abs(ladungAusSteigung(kraftIdeal(u), feldstaerke(u)) - Q_PROBE) <= 1e-18) },
  { name: "Regressionssteigung über ideale Punkte ≈ Q_PROBE (8,0·10⁻⁹ C)",
    ok: () => { const pkt = [500, 1500, 2500, 3500, 4500, 6000].map(u =>
        ({ x: feldstaerke(u), y: kraftIdeal(u) }));
      return Math.abs(ladungAusRegression(pkt) - Q_PROBE) <= 1e-15; } },
  { name: "Streugrenzen ±0,003 mN über das ganze U-Raster + Determinismus",
    ok: () => { let irgendStreu = false;
      for (let u = U_SCHRITT; u <= U_MAX; u += U_SCHRITT) {
        const ab = Math.abs(kraftRealMN(u) - kraftIdeal(u) * 1000);
        if (ab > F_STREU_SPANNE / 2 + 1e-12) return false;
        if (ab > 1e-6) irgendStreu = true;
      }
      return irgendStreu && kraftRealMN(3000) === kraftRealMN(3000)
        && kraftRealMN(3000) !== kraftRealMN(3250); } },
  { name: "Ablese-Toleranz Kraft ±0,004 mN greift",
    ok: () => ablesungFOk(0.481, 0.480) && ablesungFOk(0.483, 0.480)
      && !ablesungFOk(0.486, 0.480) && !ablesungFOk(NaN, 0.480) },
  { name: "q-Eingabe (nC): 8,0 trifft, 7,7/8,3 noch, 8,5/7,5 nicht (±0,4)",
    ok: () => ladungEingabeOk(8.0, 8.0) && ladungEingabeOk(7.7, 8.0) && ladungEingabeOk(8.3, 8.0)
      && !ladungEingabeOk(8.5, 8.0) && !ladungEingabeOk(7.5, 8.0) && !ladungEingabeOk(NaN, 8.0) },
  { name: "E-Eingabe (kV/m) ±2: U=3000 → 60 kV/m, 58/62 noch, 63 nicht",
    ok: () => feldEingabeOk(60, 60) && feldEingabeOk(58, 60) && feldEingabeOk(62, 60)
      && !feldEingabeOk(63, 60) && !feldEingabeOk(NaN, 60) },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("0,48") === 0.48 && parseDezimal("0.48") === 0.48 && Number.isNaN(parseDezimal("abc")) },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen U > 0",
    ok: () => { const z = U => ({ U });
      const zuwenig = [250, 500, 750, 1000, 1250].map(z);
      const mitNull = [0, 0, 250, 500, 750, 1000].map(z);
      const doppelt = [250, 250, 500, 750, 1000, 1250].map(z);
      const gut = [250, 1000, 2000, 3000, 4500, 6000].map(z);
      return !messreiheVollstaendig(zuwenig) && !messreiheVollstaendig(mitNull)
        && !messreiheVollstaendig(doppelt) && messreiheVollstaendig(gut); } },
  { name: "Bewertung: 8,0 → sehr gut · 7,4 → gut · 6,8 → nochmal prüfen",
    ok: () => bewertungQ(8.0).stufe === "sehr gut" && bewertungQ(7.4).stufe === "gut"
      && bewertungQ(6.8).stufe === "nochmal prüfen" },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "E") return Math.abs(feldstaerke(p.U) - p.soll) <= p.tol;
      if (p.art === "F") return Math.abs(kraftIdeal(p.U) - p.soll) <= p.tol;
      return Math.abs(ladungAusSteigung(p.F, p.E) - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Seitenansicht des Plattenkondensators) ----------
  const PLATTE_LINKS = 92, PLATTE_RECHTS = 268; // x-Ausdehnung der beiden WAAGERECHTEN Platten
  const PLATTE_Y_OBEN = 96, PLATTE_Y_UNTEN = 300; // y der oberen (+) und unteren (−) Platte
  const MITTE_X = (PLATTE_LINKS + PLATTE_RECHTS) / 2;
  const KUGEL_Y0 = 150;                    // Ruhelage der Kugel (nahe der oberen Platte)
  const F_PX_PRO_MN = 150;                 // Ausschlag-Skala (senkrecht) der Kugel

  const zustand = {
    phase: "aufbau",
    U: 3000,
    vorhersage: "",                        // "proportional" | "wurzel" | "konstant"
    messungen: [],                         // {U, eVm, eKVm, fMN, fEingabe, fOk}  (fEingabe in mN)
    f1: { wahl: "", ok: null },
    qModus: "steigung",                    // "steigung" (eA: Regression) | "zeile" (gA: F/E je Zeile)
    qBestaetigt: null,                     // {eingabe, wahr} nach q-Erfolg
    meldungMessen: "", meldungAuswerten: ""
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);
  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="460" aria-label="Seitenansicht eines Plattenkondensators mit zwei WAAGERECHTEN Platten im festen Abstand von 5 Zentimetern (Plusplatte oben, Minusplatte unten). Mittig hängt an einem senkrechten Faden eine kleine geladene Probekugel am Kraftmesser darüber. In der Durchführung baut die Plattenspannung ein senkrechtes elektrisches Feld auf; die Kraft zieht die Kugel senkrecht nach unten zur Minusplatte, in einer Linie mit dem Kraftmesser, der den Ausschlag misst. Unten Anzeigen für Plattenspannung und abgelesene Kraft."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  // wahre Kraft (mN) der Zeile, gegen die das System die Auswertung prüft
  const eVmVon = z => z.eVm;

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";

    const messend = zustand.phase !== "aufbau";
    const fMN = messend ? kraftIdeal(zustand.U) * 1000 : 0;   // glatter Wert für die Zeichnung
    // Ausschlag der Kugel nach UNTEN (zur negativen Platte), gedeckelt für die Optik
    const ausschlag = Math.min(fMN * F_PX_PRO_MN, (PLATTE_Y_UNTEN - KUGEL_Y0) - 48);
    const kugelY = KUGEL_Y0 + ausschlag;

    // Feldlinien (senkrecht, + oben → − unten) nur wenn Spannung anliegt
    if (messend && zustand.U > 0) {
      ctx.strokeStyle = cLeise; ctx.lineWidth = 1; ctx.globalAlpha = 0.7;
      const ym = (PLATTE_Y_OBEN + PLATTE_Y_UNTEN) / 2;
      for (let i = 0; i < 5; i++) {
        const x = PLATTE_LINKS + 18 + i * ((PLATTE_RECHTS - PLATTE_LINKS - 36) / 4);
        ctx.beginPath(); ctx.moveTo(x, PLATTE_Y_OBEN + 6); ctx.lineTo(x, PLATTE_Y_UNTEN - 6); ctx.stroke();
        // Pfeilspitze in der Mitte (nach unten)
        ctx.beginPath();
        ctx.moveTo(x, ym + 6); ctx.lineTo(x - 4, ym - 2); ctx.lineTo(x + 4, ym - 2);
        ctx.closePath(); ctx.fillStyle = cLeise; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // Platten (oben +, unten −) — waagerecht; obere Platte mit Lücke für den Faden
    ctx.strokeStyle = cText; ctx.fillStyle = cText; ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(PLATTE_LINKS, PLATTE_Y_OBEN); ctx.lineTo(MITTE_X - 16, PLATTE_Y_OBEN); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(MITTE_X + 16, PLATTE_Y_OBEN); ctx.lineTo(PLATTE_RECHTS, PLATTE_Y_OBEN); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(PLATTE_LINKS, PLATTE_Y_UNTEN); ctx.lineTo(PLATTE_RECHTS, PLATTE_Y_UNTEN); ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.font = "bold 16px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("+", PLATTE_RECHTS + 16, PLATTE_Y_OBEN + 6);
    ctx.fillText("–", PLATTE_RECHTS + 16, PLATTE_Y_UNTEN + 6);
    ctx.font = "12px system-ui, sans-serif";

    // Abstandsmaß d senkrecht links neben den Platten
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1;
    const xMass = PLATTE_LINKS - 16;
    ctx.beginPath(); ctx.moveTo(xMass, PLATTE_Y_OBEN); ctx.lineTo(xMass, PLATTE_Y_UNTEN); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xMass - 4, PLATTE_Y_OBEN); ctx.lineTo(xMass + 4, PLATTE_Y_OBEN); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(xMass - 4, PLATTE_Y_UNTEN); ctx.lineTo(xMass + 4, PLATTE_Y_UNTEN); ctx.stroke();
    ctx.save(); ctx.translate(xMass - 8, (PLATTE_Y_OBEN + PLATTE_Y_UNTEN) / 2); ctx.rotate(-Math.PI / 2);
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.fillText("d = 5,0 cm (fest)", 0, 0); ctx.restore();

    // Kraftmesser oben (Feder + Aufhängung über der Kugel)
    ctx.strokeStyle = cText; ctx.fillStyle = cFlaeche; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(MITTE_X - 26, 16, 52, 30, 5); else ctx.rect(MITTE_X - 26, 16, 52, 30);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Kraftmesser", MITTE_X, 33); ctx.font = "12px system-ui, sans-serif";
    // senkrechter Faden von der Aufhängung durch die Plattenlücke zur Kugel (in einer Linie!)
    ctx.strokeStyle = cText; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(MITTE_X, 46); ctx.lineTo(MITTE_X, kugelY); ctx.stroke();

    // Probekugel (geladen)
    ctx.fillStyle = cAkzent; ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(MITTE_X, kugelY, 9, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cFlaeche; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("q", MITTE_X, kugelY + 4); ctx.font = "12px system-ui, sans-serif";

    // Kraftpfeil an der Kugel (nach UNTEN, zur Minusplatte), wenn Feld anliegt
    if (messend && zustand.U > 0) {
      ctx.strokeStyle = cAkzent; ctx.fillStyle = cAkzent; ctx.lineWidth = 2;
      const py2 = kugelY + 34;
      ctx.beginPath(); ctx.moveTo(MITTE_X, kugelY + 10); ctx.lineTo(MITTE_X, py2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(MITTE_X, py2 + 8); ctx.lineTo(MITTE_X - 5, py2); ctx.lineTo(MITTE_X + 5, py2); ctx.closePath(); ctx.fill();
      ctx.fillText("F", MITTE_X + 14, kugelY + 26);
    }

    // Netzgeräte-/Anzeige-Kästen unten
    const kasten = (x, etikett, wert) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 398, 160, 46, 6); else ctx.rect(x, 398, 160, 46);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.fillText(etikett, x + 80, 415);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + 80, 435);
      ctx.font = "12px system-ui, sans-serif";
    };
    kasten(14, "Plattenspannung", "U = " + zustand.U + " V");
    kasten(186, "Kraftmesser", messend ? "F = " + komma(kraftRealMN(zustand.U), 3) + " mN" : "F = — mN");

    // Hinweistext im Aufbau (zuletzt, mit Hintergrund — gut lesbar)
    if (zustand.phase === "aufbau") {
      ctx.fillStyle = cFlaeche; ctx.fillRect(MITTE_X - 90, 200, 180, 58);
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Spannung aus —", MITTE_X, 218);
      ctx.fillText("der Kraftmesser schlägt aus,", MITTE_X, 236);
      ctx.fillText("sobald du U einstellst", MITTE_X, 254);
    }
    ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Zwei parallele Metallplatten stehen im <strong>festen Abstand d = 5,0 cm = 0,050 m</strong> einander gegenüber. Ein Netzgerät legt eine regelbare <strong>Plattenspannung U</strong> (0–6000 V) an — dadurch entsteht zwischen den Platten ein nahezu <strong>homogenes elektrisches Feld</strong> der Stärke E = U/d, das von der Plus- zur Minusplatte zeigt.</p>
      <p>Genau in der Mitte hängt an einem dünnen Faden eine winzige <strong>geladene Probekugel</strong> mit einer festen Ladung q — <em>wie groß q ist, weißt du noch nicht</em>; das sollst du herausfinden. Die Kugel hängt am <strong>empfindlichen Kraftmesser</strong>: Das Feld zieht sie senkrecht nach unten zur Gegenplatte — in einer Linie mit dem Faden; der Kraftmesser zeigt die <strong>Kraft F</strong> in Millinewton (mN) an.</p>
      <p><strong>Idee der Messung:</strong> Auf eine Ladung im Feld wirkt F = q · E. Mit dem selbst gerechneten E = U/d kannst du F gegen E auftragen — die <strong>Steigung</strong> dieser Geraden ist die gesuchte Ladung: <strong>q = F / E</strong>.</p>
      <p><strong>Plan:</strong> Stelle mindestens ${MIN_MESSUNGEN} verschiedene Spannungen U ein und lies jedes Mal die Kraft F am Kraftmesser ab. In der Auswertung berechnest du E und bestimmst daraus q.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich die Spannung U <strong>verdopple</strong>, wird die Kraft F auf die Kugel …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="proportional">… ebenfalls doppelt so groß (F ∝ U)</option>
        <option value="wurzel">… nur um den Faktor √2 größer</option>
        <option value="konstant">… bleibt (fast) gleich</option>
      </select>
      <p id="exp-meldung-aufbau" class="exp-meldung" aria-live="polite"></p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-v").value = zustand.vorhersage;
    panel.querySelector("#exp-v").addEventListener("change", ev => { zustand.vorhersage = ev.target.value; });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => {
      if (vorhersageFehlt()) {
        panel.querySelector("#exp-meldung-aufbau").textContent = "Wähle zuerst deine Vorhersage aus — gleich prüfst du sie selbst.";
        return;
      }
      wechslePhase("messen");
    });
  }

  // ---------- Phase 2: Durchführung ----------
  const wortAus = wahl => wahl === "proportional" ? "doppelt so groß"
    : wahl === "wurzel" ? "um den Faktor √2 größer" : "(fast) gleich";

  function beobachtungHtml() {
    const us = new Set(zustand.messungen.filter(z => z.U > 0).map(z => z.U)).size;
    let html = `<p>Deine Vorhersage: U verdoppeln → Kraft <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Regler aus — schau, wie weit die Kugel ausschlägt!</p>`;
    if (us >= 2) {
      const ok = zustand.vorhersage === "proportional";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>U doppelt → F doppelt</strong> (F = q·U/d, also F ∝ U). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
    }
    return html;
  }

  function panelMessen() {
    if (vorhersageFehlt()) {
      panel.innerHTML = `
        <h2>Durchführung</h2>
        <p>Halte zuerst deine <strong>Vorhersage</strong> fest (Phase 1 · Aufbau) — erst vorhersagen, dann messen!</p>
        <button class="knopf" id="exp-zurueck0">Zum Aufbau</button>`;
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("aufbau"));
      return;
    }
    const wirksam = zustand.messungen.filter(z => z.U > 0).length;
    let fortschritt = `${wirksam} von mindestens ${MIN_MESSUNGEN} Messungen (mit U > 0).`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-u">Plattenspannung: U = <strong id="exp-u-wert">${zustand.U} V</strong></label>
        <input type="range" id="exp-u" min="${U_MIN}" max="${U_MAX}" step="${U_SCHRITT}" value="${zustand.U}" aria-label="Plattenspannung in Volt">
      </div>
      <p>Plattenabstand (fest, vom System): <strong>d = 0,050 m</strong></p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies den Kraftmesser ab — Kraft F in mN:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>U in V</th><th>F in mN</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.U}</td><td>${komma(z.fMN, 3)}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const uRegler = panel.querySelector("#exp-u");
    uRegler.addEventListener("input", () => {
      zustand.U = Math.round(Number(uRegler.value));
      panel.querySelector("#exp-u-wert").textContent = zustand.U + " V";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.U === 0) {
        meldung.textContent = "Bei U = 0 V wirkt keine Kraft — stelle eine Spannung größer als 0 ein.";
        return;
      }
      if (zustand.messungen.some(z => z.U === zustand.U)) {
        meldung.textContent = "Diese Spannung hast du schon gemessen — stelle eine andere ein (mindestens 6 verschiedene U).";
        return;
      }
      const wahrFMN = kraftRealMN(zustand.U);
      if (!ablesungFOk(eingabe, wahrFMN)) {
        meldung.textContent = "✗ Schau noch einmal genau auf die Kraftmesser-Anzeige (auf wenige Tausendstel mN genau ablesen).";
        return;
      }
      zustand.messungen.push({
        U: zustand.U, eVm: feldstaerke(zustand.U), eKVm: feldstaerke(zustand.U) / 1000,
        fMN: eingabe, fEingabe: null, fOk: null
      });
      zustand.messungen.sort((a, b) => a.U - b.U);
      zustand.meldungMessen = "✓ Eingetragen: bei U = " + zustand.U + " V zeigt der Kraftmesser " + komma(eingabe, 3) + " mN.";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Spannungen U > 0 — bisher: ${zustand.messungen.filter(z => z.U > 0).length}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    // Regression über (E in V/m, F in N) — Steigung = q. F-Werte aus den Ablesungen.
    const punkte = zustand.messungen.map(z => ({ x: z.eVm, y: z.fMN / 1000 }));
    const reg = regression(punkte);
    const qReg = reg.m * 1e9;              // nC
    const qBew = Number.isFinite(qReg) ? bewertungQ(qReg) : null;
    const ermutigung = qBew ? (qBew.stufe === "sehr gut" ? " Stark — saubere Messreihe, schöne Ursprungsgerade!"
      : qBew.stufe === "gut" ? " Ordentlich! Mit weiteren Punkten bei hohen Spannungen (große, gut ablesbare Kräfte) wird die Steigung noch genauer."
      : " Kein Drama: Miss ein paar weitere Spannungen — vor allem große U liefern gut ablesbare Kräfte.") : "";
    const qB = zustand.qBestaetigt;
    const gA = zustand.qModus === "zeile";
    // gA-Hilfe rechnet je Zeile q = F/E und mittelt — analytisch dasselbe Ergebnis
    const qZeilen = zustand.messungen.map(z => ladungAusSteigung(z.fMN / 1000, z.eVm) * 1e9);
    const qMittel = mittel(qZeilen);

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Zu jeder Messung gehört die selbst gerechnete Feldstärke <strong>E = U / d</strong> (mit d = 0,050 m). Trag dein E in <strong>kV/m</strong> ein und prüfe es.</p>
      <details class="exp-fehler"><summary>Hilfe: Einheiten-Fahrplan für eine Zeile</summary>
        <p>1) E = U/d, z. B. 3000 V ÷ 0,050 m = 60 000 V/m. 2) Das sind 60 kV/m (÷ 1000). 3) Für q brauchst du F in <strong>Newton</strong>: 0,48 mN = 0,48·10⁻³ N. 4) q = F/E ist eine winzige Zahl um 8·10⁻⁹ C = 8 nC.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>U in V</th><th>F in mN</th><th>E = U/d in kV/m</th><th></th></tr></thead>
        <tbody>${zustand.messungen.map((z, i) => `<tr>
          <td>${z.U}</td><td>${komma(z.fMN, 3)}</td>
          <td><input class="exp-eingabe" style="width:6em" data-idx="${i}" inputmode="decimal" autocomplete="off" value="${z.fEingabe == null ? "" : komma(z.fEingabe, 1)}" aria-label="Dein E für Zeile ${i + 1} in Kilovolt pro Meter"></td>
          <td>${z.fOk === true ? "✓" : z.fOk === false ? "✗" : ""}</td>
        </tr>`).join("")}</tbody>
      </table>
      <div class="exp-knopfzeile"><button class="knopf" id="exp-pruefen">E-Spalte prüfen</button></div>
      <p id="exp-meldung-ausw" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>

      <h3>Die Ladung q bestimmen</h3>
      <p>F = q · E ist eine <strong>Ursprungsgerade</strong>: Trägt man F (in N) gegen E (in V/m) auf, ist die <strong>Steigung gleich q</strong>. Wähle deinen Weg:</p>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig${gA ? "" : " "}" id="exp-modus-steigung" aria-pressed="${!gA}">Über die Steigung (eA)</button>
        <button class="knopf zweitrangig" id="exp-modus-zeile" aria-pressed="${gA}">Angeleitet, Zeile für Zeile (gA)</button>
      </div>
      ${gA ? `
      <p>Rechne in <strong>jeder Zeile</strong> q = F / E (F in Newton, E in V/m) und überzeuge dich: Es kommt immer (fast) dasselbe heraus — das ist die feste Ladung. Bilde den Mittelwert deiner Zeilen-Werte und trage ihn in <strong>nC</strong> ein (1 nC = 10⁻⁹ C).</p>` : `
      <p>Bestimme die <strong>Steigung</strong> der F-E-Geraden: nimm zwei weit auseinanderliegende Punkte und rechne ΔF / ΔE (F in Newton, E in V/m), oder lass dir unten die lineare Regression zeigen. Trage deine Steigung als Ladung q in <strong>nC</strong> ein.</p>`}
      <form id="exp-q-form" class="exp-ablesen">
        <label for="exp-q">q in nC (= 10⁻⁹ C):</label>
        <input id="exp-q" inputmode="decimal" autocomplete="off" size="7" value="${qB ? komma(qB.eingabe, 1) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-q-meldung" class="exp-meldung" aria-live="polite"></p>
      <details class="exp-fehler"><summary>${gA ? "Kontrolle: q = F/E je Zeile" : "Lineare Regression über deine Punkte"}</summary>
        ${gA ? `<table class="exp-tabelle"><thead><tr><th>U in V</th><th>q = F/E in nC</th></tr></thead>
          <tbody>${zustand.messungen.map(z => `<tr><td>${z.U}</td><td>${komma(ladungAusSteigung(z.fMN / 1000, z.eVm) * 1e9, 2)}</td></tr>`).join("")}</tbody></table>
          <p>Mittelwert: <strong>${komma(qMittel, 2)} nC</strong>.</p>`
        : `<p>Ausgleichsgerade F = m·E + b durch deine ${zustand.messungen.length} Punkte (F in N, E in V/m): Steigung <strong>m = ${komma(qReg, 2)} · 10⁻⁹ C = ${komma(qReg, 2)} nC</strong>, Achsenabschnitt b ≈ ${komma(reg.b * 1e6, 3)} µN (nahe null — wie es eine Ursprungsgerade verlangt).</p>`}
      </details>
      ${qB ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: q ≈ ${komma(qB.eingabe, 1)} nC = ${komma(qB.eingabe, 1)} · 10⁻⁹ C.</strong> Tatsächlich trug die Kugel q = 8,0 nC — Abweichung ${komma(bewertungQ(qB.eingabe).abw, 1)} %: <strong>${bewertungQ(qB.eingabe).stufe}</strong>.${qB ? ermutigung : ""}</p>
        <p>Zum Vergleich: 8,0 nC entsprechen rund 5·10¹⁰ Elementarladungen — eine winzige, aber im homogenen Feld gut messbare Ladung.</p>
      </div>` : ""}

      <h3>Erkenntnisfrage</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Du tauschst die Kugel gegen eine mit <strong>doppelt so großer</strong> Ladung. Was ändert sich an der <strong>Steigung</strong> deiner F-E-Geraden?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">Nichts — die Steigung bleibt gleich</option>
          <option value="doppelt">Die Steigung verdoppelt sich</option>
          <option value="halb">Die Steigung halbiert sich</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>

      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man nie exakt 8,0 nC?</summary>
        <p><strong>Ablesung am Kraftmesser:</strong> Die Kräfte sind winzig (Bruchteile eines Millinewton). Schon ein leichtes Schwingen oder ungenaues Ablesen der Skala verschiebt jeden Wert um einige Tausendstel mN — und damit die Steigung.</p>
        <p><strong>Randfeld des Kondensators:</strong> Das Feld ist nur tief zwischen den Platten wirklich homogen. Am Rand „beult“ es aus; sitzt die Kugel nicht exakt mittig, ist das tatsächliche E etwas kleiner als U/d — q fällt dann systematisch zu groß aus.</p>
        <p><strong>Auftrieb und Faden:</strong> Der dünne Faden und die Luft üben kleine Zusatzkräfte aus; bei sehr kleinen U gehen sie relativ stärker ins Gewicht. Deshalb sind große Spannungen (große Kräfte) genauer ablesbar.</p>
        <p><strong>Strategie dagegen:</strong> viele Spannungen messen, hohe U bevorzugen und die Steigung aus allen Punkten (Regression) statt aus einer einzigen Zeile bestimmen — genau das hast du getan.</p>
      </details>`;

    panel.querySelector("#exp-pruefen").addEventListener("click", () => {
      let unvollstaendig = false;
      panel.querySelectorAll("[data-idx]").forEach(inp => {
        const wert = parseDezimal(inp.value);
        const z = zustand.messungen[Number(inp.dataset.idx)];
        if (!Number.isFinite(wert)) { unvollstaendig = true; z.fEingabe = null; z.fOk = null; return; }
        z.fEingabe = wert;
        z.fOk = feldEingabeOk(wert, z.eKVm);
      });
      if (unvollstaendig) {
        zustand.meldungAuswerten = "Fülle zuerst alle Zeilen aus (E in kV/m, z. B. 60).";
        panelAuswerten(); return;
      }
      const falsch = zustand.messungen.filter(z => !z.fOk).length;
      zustand.meldungAuswerten = falsch === 0
        ? "✓ Alle E-Werte stimmen — jetzt zur Ladung q."
        : "✗ " + falsch + (falsch > 1 ? " Zeilen passen" : " Zeile passt") + " noch nicht (±2 kV/m). Denk an E = U/d mit d = 0,050 m und teile am Ende durch 1000, um kV/m zu erhalten.";
      panelAuswerten();
    });
    panel.querySelector("#exp-modus-steigung").addEventListener("click", () => { zustand.qModus = "steigung"; panelAuswerten(); });
    panel.querySelector("#exp-modus-zeile").addEventListener("click", () => { zustand.qModus = "zeile"; panelAuswerten(); });
    panel.querySelector("#exp-q-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-q").value);
      const wahrNC = Q_PROBE * 1e9;
      if (!ladungEingabeOk(eingabe, wahrNC)) {
        panel.querySelector("#exp-q-meldung").textContent = "✗ Das passt noch nicht (±0,4 nC). Tipp: q = F/E mit F in Newton (mN ÷ 1000) und E in V/m — das Ergebnis liegt zwischen 7 und 9 nC. Schau in die Kontroll-/Regressionsbox unten.";
        return;
      }
      zustand.qBestaetigt = { eingabe, wahr: wahrNC };
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "doppelt" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("e-feldstaerke-kraftmessung-messreihe.csv",
        ["U in V", "F in mN", "E in kV/m", "q je Zeile in nC"],
        zustand.messungen.map(z => [String(z.U), z.fMN, z.eKVm,
          ladungAusSteigung(z.fMN / 1000, z.eVm) * 1e9]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        U: 3000, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, qModus: "steigung",
        qBestaetigt: null, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Die Steigung der F-E-Geraden ist die Ladung q selbst. Doppelte Ladung bedeutet bei gleichem Feld doppelte Kraft — die Gerade wird doppelt so steil. So lässt sich umgekehrt jede unbekannte Ladung über ihre Kraft im bekannten Feld bestimmen."
      : "✗ Überlege mit F = q·E: bei gleichem E (gleiches U/d) ist die Kraft proportional zu q. Verdoppelst du q, verdoppelt sich bei jedem E die Kraft — die Gerade wird steiler, nicht flacher.";
  }

  // ---------- Phasensteuerung + Start ----------
  function zeigePhase(id) {
    zustand.phase = id;
    if (id === "aufbau") panelAufbau();
    if (id === "messen") panelMessen();
    if (id === "auswerten") panelAuswerten();
    zeichne();
  }
  wechslePhase("aufbau");
}
