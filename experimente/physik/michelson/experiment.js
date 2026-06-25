// experiment.js — Interaktives Experiment: Wellenlänge mit dem Michelson-Interferometer (QP, eA).
// Realitätsnahe Messpraxis statt fertiger Zahlen: Den beweglichen Spiegel am
// Mikrometertisch um eine Strecke Δs verschieben und die durchs Zentrum
// wandernden Interferenzringe SELBST zählen — das System zeigt einen
// Ringzähler, dessen Stand du abliest. Pro halber Wellenlänge wandert ein
// Ring durch: ΔN = 2·Δs/λ. Aus der Messreihe (≥6 Werte) bestimmst du λ
// entweder über die Steigung der Geraden ΔN(Δs) (Steigung = 2/λ) oder
// zeilenweise über λ = 2·Δs/ΔN und mittelst. Die Laserwellenlänge ist intern
// fest (HeNe, 632,8 nm), für die Lernenden aber UNBEKANNT. Die kleine
// Zählstreuung ist pro Δs deterministisch geseedet — dadurch bleiben
// pruefFaelle und TESTS in Node analytisch prüfbar. Modulebene DOM-frei.

import { streuung, parseDezimal, komma, regression, esc, farbe, bauePhasen, csvHerunterladen } from "../../../assets/js/experiment/helfer.js";

// ---------- Konstanten des Aufbaus ----------
export const LAMBDA_NM = 632.8;            // nm — HeNe-Laser, intern UNBEKANNT für die Lernenden
export const LAMBDA_M = LAMBDA_NM * 1e-9;  // m
export const DS_MIN_UM = 0, DS_MAX_UM = 20, DS_SCHRITT_UM = 1;  // Spiegelverschiebung in µm
export const N_STREU_SPANNE = 1.4;         // Zähl-/Ablesestreuung auf die Ringzahl (±0,7 Ringe vor dem Runden)
export const LAMBDA_TOLERANZ_NM = 25;      // akzeptierte λ-Eingabe: ±25 nm
export const STEIGUNG_REF = 2 / (LAMBDA_M); // 1/m — Steigung der Geraden ΔN(Δs) bei Δs in METERN
export const MIN_MESSUNGEN = 6;

// ---------- Physik (rein, Node-testbar) ----------
// ideale Ringzahl beim Verschieben um Δs (beide in m): ΔN = 2·Δs/λ
export function ringzahl(dsMeter, lambdaMeter = LAMBDA_M) {
  return (lambdaMeter > 0) ? 2 * dsMeter / lambdaMeter : NaN;
}
// real gezählte (ganzzahlige) Ringzahl inkl. reproduzierbarer Zählstreuung
export function ringzahlReal(dsUm, lambdaMeter = LAMBDA_M) {
  if (dsUm <= 0) return 0;
  const ideal = ringzahl(dsUm * 1e-6, lambdaMeter);
  return Math.max(0, Math.round(ideal + streuung("n:" + dsUm, N_STREU_SPANNE)));
}
// Auswertung über die Geradensteigung: λ = 2/Steigung (Steigung in 1/m, Δs in m)
export function lambdaAusSteigung(steigung1m) {
  return (steigung1m > 0) ? 2 / steigung1m * 1e9 : NaN; // nm
}
// Auswertung zeilenweise: λ = 2·Δs/ΔN (Δs in µm, ΔN ganzzahlig) → nm
export function lambdaAusZeile(dsUm, deltaN) {
  return (deltaN > 0) ? 2 * (dsUm * 1e-6) / deltaN * 1e9 : NaN; // nm
}

// ---------- Eingabe-Prüfungen / Bewertung ----------
export function lambdaEingabeOk(eingabeNm, wahrNm = LAMBDA_NM) {
  return Number.isFinite(eingabeNm) && Math.abs(eingabeNm - wahrNm) <= LAMBDA_TOLERANZ_NM;
}
export function bewertungLambda(lambdaNm) {
  const abw = Math.abs(lambdaNm - LAMBDA_NM) / LAMBDA_NM * 100;
  if (abw <= 2) return { stufe: "sehr gut", abw };
  if (abw <= 5) return { stufe: "gut", abw };
  return { stufe: "nochmal prüfen", abw };
}
// vollständige Messreihe: mindestens 6 verschiedene, von 0 verschiedene Δs
export function messreiheVollstaendig(messungen) {
  const ds = messungen.map(z => z.dsUm).filter(v => v > 0);
  return ds.length >= MIN_MESSUNGEN && new Set(ds).size >= MIN_MESSUNGEN;
}
// Regression ΔN über Δs (Δs in METERN, damit Steigung = 2/λ in 1/m)
export function steigungAusMessungen(messungen) {
  const punkte = messungen.map(z => ({ x: z.dsUm * 1e-6, y: z.deltaN }));
  return regression(punkte).m;
}

// ---------- Prüffälle (analytisch nachgerechnet, unabhängig ermittelt) ----------
export const pruefFaelle = [
  { art: "N",       ds: 10e-6, lambda: 632.8e-9, soll: 31.6062, tol: 1e-3 },  // Ringe (ideal)
  { art: "lambda",  ds: 10,    N: 32,            soll: 625.0,   tol: 1e-2 },  // nm aus Zeile
  { art: "steigung",                              soll: STEIGUNG_REF, tol: 1 } // 1/m, Rückrechnung
];

export const TESTS = [
  { name: "Grundformel ΔN = 2·Δs/λ: Δs = 10 µm, λ = 632,8 nm → 31,606 Ringe (±0,001)",
    ok: () => Math.abs(ringzahl(10e-6) - 31.6062) < 1e-3 },
  { name: "Linearität: doppeltes Δs → doppelte (ideale) Ringzahl, exakt",
    ok: () => Math.abs(ringzahl(20e-6) - 2 * ringzahl(10e-6)) < 1e-12
      && Math.abs(ringzahl(15e-6) - 1.5 * ringzahl(10e-6)) < 1e-12 },
  { name: "Steigung der Geraden ΔN(Δs) ist exakt 2/λ (Δs in Metern)",
    ok: () => { const s = (ringzahl(20e-6) - ringzahl(5e-6)) / (20e-6 - 5e-6);
      return Math.abs(s - 2 / LAMBDA_M) < 1e-3 && Math.abs(s - STEIGUNG_REF) < 1e-9; } },
  { name: "λ aus Steigung invertiert die Grundformel exakt: 2/(2/λ) → 632,8 nm",
    ok: () => Math.abs(lambdaAusSteigung(STEIGUNG_REF) - LAMBDA_NM) < 1e-6 },
  { name: "λ aus Zeile: Δs = 10 µm, ΔN = 32 → 625,0 nm (±0,01)",
    ok: () => Math.abs(lambdaAusZeile(10, 32) - 625.0) < 1e-2 },
  { name: "λ aus Zeile: perfekt gerundete ΔN über das ganze Raster → ±~5 % um 632,8 nm",
    ok: () => [4, 8, 12, 16, 20].every(ds => {
      const N = Math.round(ringzahl(ds * 1e-6)); // ideale, gerundete Ringzahl
      return Math.abs(lambdaAusZeile(ds, N) - LAMBDA_NM) <= LAMBDA_NM * 0.05; }) },
  { name: "Ringzähler ganzzahlig, monoton nichtfallend in Δs, 0 bei Δs = 0",
    ok: () => { if (ringzahlReal(0) !== 0) return false;
      let prev = 0;
      for (let ds = 1; ds <= DS_MAX_UM; ds += DS_SCHRITT_UM) {
        const n = ringzahlReal(ds);
        if (!Number.isInteger(n) || n < prev) return false;
        prev = n;
      }
      return true; } },
  { name: "Zählstreuung höchstens ±1 Ring vom Ideal + deterministisch + reagiert auf Δs",
    ok: () => { let irgendStreu = false;
      for (let ds = 1; ds <= DS_MAX_UM; ds += DS_SCHRITT_UM) {
        const abw = Math.abs(ringzahlReal(ds) - ringzahl(ds * 1e-6));
        if (abw > 1.0 + 1e-9) return false;
        if (abw > 1e-6) irgendStreu = true;
      }
      return irgendStreu && ringzahlReal(10) === ringzahlReal(10) && ringzahlReal(10) !== undefined; } },
  { name: "Regression auf ideale (gerundete) Messpunkte liefert λ in Toleranz (±25 nm)",
    ok: () => { const m = [4, 6, 9, 12, 16, 20].map(ds => ({ dsUm: ds, deltaN: Math.round(ringzahl(ds * 1e-6)) }));
      return lambdaEingabeOk(lambdaAusSteigung(steigungAusMessungen(m))); } },
  { name: "Eingabe-Toleranz λ: ±25 nm um 632,8 nm (610 ok, 657 ok, 605/660 nicht, NaN nicht)",
    ok: () => lambdaEingabeOk(632.8) && lambdaEingabeOk(610) && lambdaEingabeOk(657)
      && !lambdaEingabeOk(605) && !lambdaEingabeOk(660) && !lambdaEingabeOk(NaN) },
  { name: "Bewertung: 632,8 → sehr gut · 615 → gut · 560 → nochmal prüfen",
    ok: () => bewertungLambda(632.8).stufe === "sehr gut" && bewertungLambda(615).stufe === "gut"
      && bewertungLambda(560).stufe === "nochmal prüfen" },
  { name: "Messreihe vollständig nur mit ≥ 6 verschiedenen, von 0 verschiedenen Δs",
    ok: () => { const z = ds => ({ dsUm: ds, deltaN: 1 });
      const zuWenig = [2, 4, 6, 8, 10].map(z);
      const doppelt = [2, 2, 4, 6, 8, 10].map(z);
      const mitNull = [0, 4, 6, 8, 10, 12].map(z);
      const gut = [2, 4, 6, 8, 10, 12].map(z);
      return !messreiheVollstaendig(zuWenig) && !messreiheVollstaendig(doppelt)
        && !messreiheVollstaendig(mitNull) && messreiheVollstaendig(gut); } },
  { name: "parseDezimal: Komma und Punkt als Dezimaltrennzeichen",
    ok: () => parseDezimal("12,0") === 12 && parseDezimal("12.0") === 12 && Number.isNaN(parseDezimal("abc")) },
  { name: "Prüffälle konsistent",
    ok: () => pruefFaelle.every(p => {
      if (p.art === "N") return Math.abs(ringzahl(p.ds, p.lambda) - p.soll) <= p.tol;
      if (p.art === "lambda") return Math.abs(lambdaAusZeile(p.ds, p.N) - p.soll) <= p.tol;
      return Math.abs(STEIGUNG_REF - p.soll) <= p.tol;
    }) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;

  // ---------- Canvas-Geometrie (Aufsicht auf den optischen Tisch) ----------
  const L_X = 40, L_Y = 150;        // Laseraustritt
  const ST_X = 170, ST_Y = 150;     // Strahlteiler (45°)
  const SP_FEST_X = 320;            // fester Spiegel (rechts, in der Strahlhöhe)
  const SP_BEW_Y = 30;              // beweglicher Spiegel (oben)
  const SCHIRM_X = ST_X, SCHIRM_Y = 290; // Schirm (unten)

  const zustand = {
    phase: "aufbau",
    dsUm: 0,                                // aktuelle Spiegelverschiebung (Mikrometertisch)
    vorhersage: "",                         // "mehr" | "weniger" | "gleich"
    messungen: [],                          // {dsUm, deltaN, lambdaEingabe, lambdaOk}
    f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
    lambdaBestaetigt: null,                 // {eingabe, wahr} nach Auswertungs-Erfolg
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
        <canvas id="exp-canvas" width="380" height="340" aria-label="Aufsicht auf das Michelson-Interferometer: links der Laser, in der Mitte der halbdurchlässige Strahlteiler unter 45 Grad, rechts der feste Spiegel und oben der bewegliche Spiegel auf dem Mikrometertisch, unten der Schirm mit den konzentrischen Interferenzringen. Darunter die Anzeige der Spiegelverschiebung und der digitale Ringzähler."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);
  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  const vorhersageFehlt = () => !zustand.vorhersage;
  // ungerundete Soll-Steigung der gezählten Ringe — Grundlage des „wahren" λ je Zeile
  const lambdaWahrNm = () => LAMBDA_NM; // intern bekannt, fürs Prüfen der Eingabe

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFlaeche = farbe("--flaeche");
    ctx.clearRect(0, 0, w, h);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start"; ctx.lineCap = "butt";

    // Strahlengang (rote Linien): Laser → Strahlteiler → beide Spiegel; zurück → Schirm
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(L_X + 26, L_Y); ctx.lineTo(ST_X, ST_Y);               // Laser → Teiler
    ctx.moveTo(ST_X, ST_Y); ctx.lineTo(SP_FEST_X, ST_Y);            // Teiler → fester Spiegel
    ctx.moveTo(ST_X, ST_Y); ctx.lineTo(ST_X, SP_BEW_Y + 12);        // Teiler → beweglicher Spiegel
    ctx.moveTo(ST_X, ST_Y); ctx.lineTo(SCHIRM_X, SCHIRM_Y - 18);    // Teiler → Schirm
    ctx.stroke(); ctx.globalAlpha = 1;

    // Laser
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(L_X - 14, L_Y - 14, 40, 28, 4); else ctx.rect(L_X - 14, L_Y - 14, 40, 28);
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "center"; ctx.fillText("Laser", L_X + 6, L_Y - 20);

    // Strahlteiler (45°, halbdurchlässig)
    ctx.strokeStyle = cText; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(ST_X - 15, ST_Y + 15); ctx.lineTo(ST_X + 15, ST_Y - 15); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.lineWidth = 1;
    ctx.fillText("Strahlteiler", ST_X + 18, ST_Y - 18);

    // fester Spiegel (rechts)
    ctx.strokeStyle = cText; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(SP_FEST_X, ST_Y - 22); ctx.lineTo(SP_FEST_X, ST_Y + 22); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.lineWidth = 1; ctx.textAlign = "center";
    ctx.fillText("fester", SP_FEST_X + 22, ST_Y - 6); ctx.fillText("Spiegel", SP_FEST_X + 22, ST_Y + 8);

    // beweglicher Spiegel (oben) auf dem Mikrometertisch — Position zeigt die Verschiebung an
    const versatzPx = Math.min(20, zustand.dsUm) * 0.7;  // optisch leicht angedeutet
    const spY = SP_BEW_Y + versatzPx;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(ST_X - 22, spY); ctx.lineTo(ST_X + 22, spY); ctx.stroke();
    // Mikrometertisch (Pfeil zeigt Verschieberichtung)
    ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(ST_X + 30, SP_BEW_Y - 4); ctx.lineTo(ST_X + 30, SP_BEW_Y + 26); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ST_X + 27, SP_BEW_Y + 20); ctx.lineTo(ST_X + 30, SP_BEW_Y + 26); ctx.lineTo(ST_X + 33, SP_BEW_Y + 20); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.textAlign = "start";
    ctx.fillText("beweglicher Spiegel", ST_X + 38, SP_BEW_Y + 6);
    ctx.fillText("(Mikrometertisch)", ST_X + 38, SP_BEW_Y + 20);

    // Schirm mit konzentrischen Interferenzringen (unten)
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    const SR = 30, SCY = SCHIRM_Y + 8;
    ctx.beginPath(); ctx.arc(SCHIRM_X, SCY, SR, 0, 7); ctx.fill(); ctx.stroke();
    if (zustand.phase !== "aufbau") {
      // Ringmuster: Phase richtet sich nach der aktuell gezählten Ringzahl (anschaulich, nicht maßstäblich)
      const phase = (ringzahlReal(zustand.dsUm) % 2) * Math.PI;
      ctx.save();
      ctx.beginPath(); ctx.arc(SCHIRM_X, SCY, SR - 2, 0, 7); ctx.clip();
      for (let r = 2; r < SR; r += 2) {
        const hell = 0.5 + 0.5 * Math.cos(r * 1.1 + phase);
        ctx.globalAlpha = 0.15 + 0.6 * hell;
        ctx.strokeStyle = cAkzent; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.arc(SCHIRM_X, SCY, r, 0, 7); ctx.stroke();
      }
      ctx.restore(); ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = cLeise; ctx.textAlign = "center";
      ctx.fillText("Ringe ab", SCHIRM_X, SCY - 3);
      ctx.fillText("Durchführung", SCHIRM_X, SCY + 11);
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("Schirm", SCHIRM_X + SR + 6, SCY + 4);

    // Anzeigen: Spiegelverschiebung (Mikrometer) und digitaler Ringzähler
    const kasten = (x, etikett, wert) => {
      ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(x, 300, 170, 36, 6); else ctx.rect(x, 300, 170, 36);
      ctx.fill(); ctx.stroke();
      ctx.textAlign = "center";
      ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.fillText(etikett, x + 85, 313);
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif"; ctx.fillText(wert, x + 85, 329);
      ctx.font = "12px system-ui, sans-serif";
    };
    const zaehler = zustand.phase === "aufbau" ? "—" : "ΔN = " + ringzahlReal(zustand.dsUm);
    kasten(196, "Mikrometertisch", "Δs = " + zustand.dsUm + " µm");
    // Ringzähler etwas abgesetzt unten links
    ctx.strokeStyle = cText; ctx.lineWidth = 2; ctx.fillStyle = cFlaeche;
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(14, 300, 170, 36, 6); else ctx.rect(14, 300, 170, 36);
    ctx.fill(); ctx.stroke();
    ctx.textAlign = "center";
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif"; ctx.fillText("digitaler Ringzähler", 99, 313);
    ctx.fillStyle = zustand.phase === "aufbau" ? cLeise : cAkzent;
    ctx.font = "bold 16px system-ui, sans-serif"; ctx.fillText(zaehler, 99, 330);
    ctx.font = "12px system-ui, sans-serif"; ctx.textAlign = "start";
  }

  // ---------- Phase 1: Aufbau (mit Vorhersage — POE) ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Im <strong>Michelson-Interferometer</strong> trifft der Strahl eines <strong>Lasers</strong> auf einen halbdurchlässigen <strong>Strahlteiler</strong> (45°). Dieser spaltet ihn in zwei Teilstrahlen: Der eine läuft zum <strong>festen Spiegel</strong>, der andere zum <strong>beweglichen Spiegel</strong> auf einem <strong>Mikrometertisch</strong>. Beide Strahlen werden zurückgeworfen, am Teiler wieder vereinigt und überlagern sich auf dem <strong>Schirm</strong> zu konzentrischen <strong>Interferenzringen</strong>.</p>
      <p>Verschiebst du den beweglichen Spiegel um die Strecke Δs, ändert sich die Länge eines Lichtwegs — und zwar um <strong>2·Δs</strong>, weil das Licht hin <em>und</em> zurück läuft. Immer wenn dieser Gangunterschied um <em>eine ganze</em> Wellenlänge λ zunimmt, wandert genau <strong>ein</strong> Ring durch das Zentrum. Daraus folgt der Zusammenhang</p>
      <p style="text-align:center"><strong>ΔN = 2·Δs / λ</strong>, also umgestellt <strong>λ = 2·Δs / ΔN</strong>.</p>
      <p>Welche Wellenlänge der Laser hat, steht <strong>nicht</strong> auf dem Gehäuse — die bestimmst du selbst. Der Mikrometertisch lässt sich von 0 bis ${DS_MAX_UM} µm in ${DS_SCHRITT_UM}-µm-Schritten verstellen, ein <strong>digitaler Ringzähler</strong> zeigt dir die Zahl der durchgelaufenen Ringe an — die liest du ab.</p>
      <p><strong>Plan:</strong> Stelle mindestens ${MIN_MESSUNGEN} verschiedene Verschiebungen Δs ein, lies jeweils die gezählte Ringzahl ΔN ab und protokolliere sie. In der Auswertung bestimmst du λ.</p>
      <h3>Vorhersage zuerst!</h3>
      <p>Sag voraus, bevor du misst — raten ist ausdrücklich erlaubt:</p>
      <label for="exp-v">Wenn ich den Spiegel um eine größere Strecke Δs verschiebe, dann …</label>
      <select id="exp-v" class="exp-wahl">
        <option value="">— bitte wählen —</option>
        <option value="mehr">… wandern mehr Ringe durch (ΔN wird größer)</option>
        <option value="weniger">… wandern weniger Ringe durch (ΔN wird kleiner)</option>
        <option value="gleich">… bleibt die Ringzahl ungefähr gleich</option>
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
  const wortAus = wahl => wahl === "mehr" ? "mehr Ringe" : wahl === "weniger" ? "weniger Ringe" : "ungefähr gleich viele Ringe";

  function beobachtungHtml() {
    const dsWerte = new Set(zustand.messungen.map(z => z.dsUm)).size;
    let html = `<p>Deine Vorhersage: größeres Δs → <strong>${wortAus(zustand.vorhersage)}</strong>. Probier es am Mikrometertisch aus!</p>`;
    if (dsWerte >= 2) {
      const ok = zustand.vorhersage === "mehr";
      html += `<p>${ok ? "✓" : "✗"} Beobachtet: <strong>größeres Δs → mehr Ringe</strong> wandern durch (ΔN ∝ Δs). ${ok ? "Deine Vorhersage stimmt!" : "Deine Vorhersage war anders — jetzt weißt du es aus eigener Messung."}</p>`;
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
    const dsAnz = new Set(zustand.messungen.map(z => z.dsUm).filter(v => v > 0)).size;
    let fortschritt = `${dsAnz} von mindestens ${MIN_MESSUNGEN} verschiedenen Verschiebungen.`;
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-regler">
        <label for="exp-ds">Spiegelverschiebung am Mikrometertisch: Δs = <strong id="exp-ds-wert">${zustand.dsUm} µm</strong></label>
        <input type="range" id="exp-ds" min="${DS_MIN_UM}" max="${DS_MAX_UM}" step="${DS_SCHRITT_UM}" value="${zustand.dsUm}" aria-label="Spiegelverschiebung in Mikrometern">
      </div>
      <p>Stelle Δs ein und lies am <strong>digitalen Ringzähler</strong> (im Bild unten) die Zahl der durchgelaufenen Ringe ΔN ab. Tipp: Bei Δs = 0 zeigt der Zähler 0.</p>
      <div id="exp-beobachtung">${beobachtungHtml()}</div>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Abgelesene Ringzahl ΔN (ganze Zahl):</label>
        <input id="exp-wert" inputmode="numeric" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungMessen)}</p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle">
        <thead><tr><th>Δs in µm</th><th>ΔN (gezählt)</th></tr></thead>
        <tbody>${zustand.messungen.map(z =>
          `<tr><td>${z.dsUm}</td><td>${z.deltaN}</td></tr>`).join("")
          || '<tr><td colspan="2">noch leer</td></tr>'}</tbody>
      </table>
      <p>${fortschritt}</p>
      <button class="knopf" id="exp-weiter2"${messreiheVollstaendig(zustand.messungen) ? "" : " disabled"}>Zur Auswertung</button>`;

    const dsRegler = panel.querySelector("#exp-ds");
    dsRegler.addEventListener("input", () => {
      zustand.dsUm = Math.round(Number(dsRegler.value));
      panel.querySelector("#exp-ds-wert").textContent = zustand.dsUm + " µm";
      zeichne();
    });
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      const meldung = panel.querySelector("#exp-meldung");
      if (zustand.messungen.some(z => z.dsUm === zustand.dsUm)) {
        meldung.textContent = "Diese Verschiebung hast du schon protokolliert — stelle ein anderes Δs ein.";
        return;
      }
      const wahrN = ringzahlReal(zustand.dsUm);
      if (!Number.isInteger(eingabe) || eingabe !== wahrN) {
        meldung.textContent = "✗ Lies den digitalen Ringzähler im Bild noch einmal genau ab und trage genau diese ganze Zahl ein.";
        return;
      }
      zustand.messungen.push({ dsUm: zustand.dsUm, deltaN: wahrN, lambdaEingabe: null, lambdaOk: null });
      zustand.meldungMessen = "✓ Eingetragen: Δs = " + zustand.dsUm + " µm, ΔN = " + wahrN + ".";
      panelMessen();
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
  }

  // ---------- Phase 3: Auswertung ----------
  function panelAuswerten() {
    if (!messreiheVollstaendig(zustand.messungen)) {
      panel.innerHTML = `
        <h2>Auswertung</h2>
        <p>Dafür brauchst du mindestens ${MIN_MESSUNGEN} verschiedene Verschiebungen Δs > 0 — bisher: ${new Set(zustand.messungen.map(z => z.dsUm).filter(v => v > 0)).size}.</p>
        <button class="knopf" id="exp-zurueck">Zurück zur Durchführung</button>`;
      panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    // Regression über alle Punkte (für das Diagramm und das λ aus der Steigung)
    const steigung = steigungAusMessungen(zustand.messungen);   // 1/m
    const lambdaRegNm = lambdaAusSteigung(steigung);            // nm aus Steigung
    const bewReg = bewertungLambda(lambdaRegNm);
    const ermutigung = bewReg.stufe === "sehr gut" ? " Stark — präzise wie im Praktikum!"
      : bewReg.stufe === "gut" ? " Ordentlich! Mit größeren Δs (mehr gezählte Ringe) wird das Runden des Zählers relativ unwichtiger."
      : " Kein Drama: Nimm ein paar größere Verschiebungen dazu — je mehr Ringe gezählt werden, desto genauer.";
    const lB = zustand.lambdaBestaetigt;

    panel.innerHTML = `
      <h2>Auswertung</h2>
      <p>Trage <strong>ΔN gegen Δs</strong> auf — die Punkte liegen auf einer <strong>Ursprungsgeraden</strong> mit der Steigung <strong>2/λ</strong>. Aus der Steigung bestimmst du λ. (Alternativ rechnest du je Zeile λ = 2·Δs/ΔN und mittelst.)</p>
      <details class="exp-fehler"><summary>Hilfe: So kommst du von der Steigung zu λ</summary>
        <p>1) Steigung der Geraden bestimmen: m = ΔN / Δs. Achtung Einheiten — rechne Δs in <strong>Metern</strong> (10 µm = 1,0·10⁻⁵ m). 2) Die Theorie sagt m = 2/λ. 3) Also <strong>λ = 2 / m</strong>. Das Ergebnis liegt im Bereich einiger hundert Nanometer (sichtbares Licht: 380–750 nm). Trage es unten in <strong>nm</strong> ein.</p>
        <p>Zeilenweise geht es auch: λ = 2·Δs/ΔN. Beispiel Δs = 10 µm, ΔN = 32 → λ = 2·1,0·10⁻⁵ m / 32 = 6,25·10⁻⁷ m = 625 nm.</p>
      </details>
      <table class="exp-tabelle">
        <thead><tr><th>Δs in µm</th><th>ΔN</th><th>λ = 2·Δs/ΔN in nm</th></tr></thead>
        <tbody>${zustand.messungen.map(z => `<tr>
          <td>${z.dsUm}</td><td>${z.deltaN}</td>
          <td>${z.deltaN > 0 ? komma(lambdaAusZeile(z.dsUm, z.deltaN), 1) : "—"}</td>
        </tr>`).join("")}</tbody>
      </table>
      <h3>Diagramm: ΔN über Δs</h3>
      <canvas id="exp-diagramm" width="360" height="240" aria-label="Streudiagramm der gezählten Ringzahl über der Spiegelverschiebung mit eingezeichneter Ausgleichsgeraden durch den Ursprung."></canvas>
      <p>Ausgleichsgerade (System): Steigung m = <strong>${komma(steigung / 1e6, 4)} Ringe/µm</strong> = ${komma(steigung, 0)} 1/m.</p>
      <form id="exp-lambda-form" class="exp-ablesen">
        <label for="exp-lambda">Deine Wellenlänge λ in nm:</label>
        <input id="exp-lambda" inputmode="decimal" autocomplete="off" size="7" value="${lB ? komma(lB.eingabe, 1) : ""}">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-lambda-meldung" class="exp-meldung" aria-live="polite">${esc(zustand.meldungAuswerten)}</p>
      ${lB ? `
      <div class="exp-hinweis">
        <p><strong>Dein Ergebnis: λ ≈ ${komma(lB.eingabe, 1)} nm.</strong> Der Laser ist ein <strong>HeNe-Laser</strong> mit dem Literaturwert λ = 632,8 nm (rotes Licht) — Abweichung ${komma(bewertungLambda(lB.eingabe).abw, 1)} %: <strong>${bewertungLambda(lB.eingabe).stufe}</strong>.${bewertungLambda(lB.eingabe).stufe === "sehr gut" ? " Stark — präzise wie im Praktikum!" : ""}</p>
        <p>Bemerkenswert: Mit einer Spiegelverschiebung von wenigen Mikrometern hast du eine Länge im Bereich von <strong>Millionstel Millimetern</strong> gemessen. Das ist die Stärke der Interferometrie.</p>
      </div>` : `<p class="exp-meldung">Tipp zur Steigung: m ≈ ${komma(steigung / 1e6, 3)} Ringe/µm. Daraus λ = 2/m. ${bewReg.stufe === "sehr gut" ? "" : "(" + ermutigung.trim() + ")"}</p>`}
      <h3>Erkenntnisfragen</h3>
      <form id="exp-f1" class="exp-ablesen">
        <label for="exp-f1-wahl">Warum steht in ΔN = 2·Δs/λ der <strong>Faktor 2</strong>?</label>
        <select id="exp-f1-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="hinrueck">Das Licht durchläuft die Strecke Δs zweimal — hin zum Spiegel und zurück</option>
          <option value="zweistrahl">Weil es zwei Teilstrahlen gibt</option>
          <option value="zweispiegel">Weil das Interferometer zwei Spiegel hat</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f1-meldung" class="exp-meldung" aria-live="polite">${esc(f1Feedback())}</p>
      <form id="exp-f2" class="exp-ablesen">
        <label for="exp-f2-wahl">Du <strong>verdoppelst</strong> Δs. Was passiert mit der gezählten Ringzahl ΔN?</label>
        <select id="exp-f2-wahl" class="exp-wahl">
          <option value="">— bitte wählen —</option>
          <option value="gleich">ΔN bleibt gleich</option>
          <option value="wurzel2">ΔN wächst um den Faktor √2</option>
          <option value="doppelt">ΔN verdoppelt sich</option>
          <option value="halb">ΔN halbiert sich</option>
        </select>
        <button class="knopf zweitrangig">Prüfen</button>
      </form>
      <p id="exp-f2-meldung" class="exp-meldung" aria-live="polite">${esc(f2Feedback())}</p>
      <h3>Protokoll &amp; Fehlerbetrachtung</h3>
      <div class="exp-knopfzeile">
        <button class="knopf zweitrangig" id="exp-csv">Messreihe als CSV</button>
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr messen</button>
        <button class="knopf zweitrangig" id="exp-neustart">Neues Experiment</button>
      </div>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — warum trifft man nie exakt 632,8 nm?</summary>
        <p><strong>Ganzzahliges Zählen (Quantisierung):</strong> Der Ringzähler springt nur um ganze Ringe. Bei Δs = 10 µm „sollten" es 31,6 Ringe sein — gezählt werden aber 31 oder 32. Dieser Rundungsfehler von höchstens ±1 Ring wiegt bei <em>kleinen</em> Δs relativ schwer (1 von 6 ist viel), bei <em>großen</em> Δs kaum noch (1 von 60 ist wenig). Deshalb: große Verschiebungen bevorzugen.</p>
        <p><strong>Kalibrierung des Mikrometertischs:</strong> Steht die µm-Skala nicht exakt auf Null oder hat sie einen kleinen Skalenfehler, verschiebt das die ganze Gerade. Die <em>Steigung</em> 2/λ und damit λ bleiben davon weitgehend unberührt — ein Vorteil der Geraden-Auswertung gegenüber einer Einzelmessung.</p>
        <p><strong>Messunsicherheit über die Steigung:</strong> Trägt man ΔN über Δs auf, mittelt die Ausgleichsgerade über alle Punkte. Eine grobe Abschätzung: λ ist auf etwa <strong>λ · (1/ΔN_max)</strong> genau — bei 60 gezählten Ringen also rund 1 %. Das erklärt die Toleranz von ±25 nm.</p>
        <p><strong>Stabilität:</strong> Im echten Versuch lassen schon Trittschall oder Temperaturdrift die Ringe „atmen". Hier ist das idealisiert — die kleine Streuung steht stellvertretend für die Zähl-Unsicherheit.</p>
      </details>`;

    zeichneDiagramm(steigung);

    panel.querySelector("#exp-lambda-form").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-lambda").value);
      if (!lambdaEingabeOk(eingabe, lambdaWahrNm())) {
        zustand.meldungAuswerten = "✗ Das passt noch nicht (±25 nm). Häufigste Stolperfalle: Δs in Meter umrechnen (10 µm = 1,0·10⁻⁵ m), dann λ = 2/Steigung bzw. λ = 2·Δs/ΔN. Sichtbares Licht liegt zwischen 380 und 750 nm.";
        zustand.lambdaBestaetigt = null;
        panelAuswerten();
        return;
      }
      zustand.lambdaBestaetigt = { eingabe, wahr: lambdaWahrNm() };
      zustand.meldungAuswerten = "✓ Passt!";
      panelAuswerten();
    });
    panel.querySelector("#exp-f1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f1-wahl").value;
      zustand.f1 = { wahl, ok: wahl === "hinrueck" };
      panelAuswerten();
    });
    panel.querySelector("#exp-f2").addEventListener("submit", ev => {
      ev.preventDefault();
      const wahl = panel.querySelector("#exp-f2-wahl").value;
      zustand.f2 = { wahl, ok: wahl === "doppelt" };
      panelAuswerten();
    });
    if (zustand.f1.wahl) panel.querySelector("#exp-f1-wahl").value = zustand.f1.wahl;
    if (zustand.f2.wahl) panel.querySelector("#exp-f2-wahl").value = zustand.f2.wahl;
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      csvHerunterladen("michelson-messreihe.csv",
        ["Delta s in um", "Delta N", "lambda in nm"],
        zustand.messungen.map(z => [z.dsUm, z.deltaN,
          z.deltaN > 0 ? lambdaAusZeile(z.dsUm, z.deltaN) : ""]));
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      Object.assign(zustand, {
        dsUm: 0, vorhersage: "", messungen: [],
        f1: { wahl: "", ok: null }, f2: { wahl: "", ok: null },
        lambdaBestaetigt: null, meldungMessen: "", meldungAuswerten: ""
      });
      wechslePhase("aufbau");
    });
  }

  // ---------- Diagramm ΔN über Δs mit Ausgleichsgerade ----------
  function zeichneDiagramm(steigung1m) {
    const c = panel.querySelector("#exp-diagramm");
    if (!c) return;
    const d = c.getContext("2d");
    const W = c.width, H = c.height, mL = 44, mR = 12, mT = 12, mB = 34;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    d.clearRect(0, 0, W, H);
    d.font = "11px system-ui, sans-serif";
    const maxDs = Math.max(DS_MAX_UM, ...zustand.messungen.map(z => z.dsUm));
    const maxN = Math.max(4, ...zustand.messungen.map(z => z.deltaN)) * 1.1;
    const px = ds => mL + (ds / maxDs) * (W - mL - mR);
    const py = n => H - mB - (n / maxN) * (H - mT - mB);
    // Achsen
    d.strokeStyle = cText; d.lineWidth = 1.5;
    d.beginPath(); d.moveTo(mL, mT); d.lineTo(mL, H - mB); d.lineTo(W - mR, H - mB); d.stroke();
    d.fillStyle = cLeise; d.textAlign = "center";
    d.fillText("Δs in µm", (mL + W - mR) / 2, H - 6);
    d.save(); d.translate(12, (mT + H - mB) / 2); d.rotate(-Math.PI / 2);
    d.fillText("ΔN", 0, 0); d.restore();
    // Achsen-Ticks
    d.textAlign = "center"; d.strokeStyle = cLeise; d.lineWidth = 1;
    for (let t = 0; t <= maxDs; t += 5) {
      d.beginPath(); d.moveTo(px(t), H - mB); d.lineTo(px(t), H - mB + 4); d.stroke();
      d.fillText(String(t), px(t), H - mB + 16);
    }
    d.textAlign = "end";
    for (let t = 0; t <= maxN; t += 10) {
      d.beginPath(); d.moveTo(mL - 4, py(t)); d.lineTo(mL, py(t)); d.stroke();
      d.fillText(String(t), mL - 6, py(t) + 4);
    }
    // Ausgleichsgerade durch den Ursprung (Steigung in 1/m → Ringe pro µm)
    const mProUm = steigung1m * 1e-6;
    d.strokeStyle = cAkzent; d.lineWidth = 2; d.globalAlpha = 0.8;
    d.beginPath(); d.moveTo(px(0), py(0)); d.lineTo(px(maxDs), py(mProUm * maxDs)); d.stroke();
    d.globalAlpha = 1;
    // Messpunkte
    d.fillStyle = cText;
    zustand.messungen.forEach(z => {
      d.beginPath(); d.arc(px(z.dsUm), py(z.deltaN), 3.2, 0, 7); d.fill();
    });
  }

  function f1Feedback() {
    if (zustand.f1.ok === null || !zustand.f1.wahl) return "";
    return zustand.f1.ok
      ? "✓ Genau! Der Strahl läuft die Strecke Δs zum Spiegel und dieselbe Strecke wieder zurück. Der Gangunterschied ändert sich deshalb um 2·Δs — daher der Faktor 2."
      : "✗ Nicht ganz: Zwei Strahlen oder zwei Spiegel erklären den Faktor nicht. Verfolge den Weg eines Strahls zum beweglichen Spiegel und zurück — welche Strecke legt er beim Verschieben zusätzlich zurück?";
  }
  function f2Feedback() {
    if (zustand.f2.ok === null || !zustand.f2.wahl) return "";
    return zustand.f2.ok
      ? "✓ Richtig: ΔN = 2·Δs/λ ist eine Ursprungsgerade — Δs verdoppeln verdoppelt ΔN. Kontrolle in deiner Tabelle: doppeltes Δs liefert (bis auf das ±1-Runden) die doppelte Ringzahl."
      : "✗ Schau auf ΔN = 2·Δs/λ: ΔN steigt proportional zu Δs (gerade Linie durch den Ursprung). Verdoppelst du Δs, verdoppelt sich ΔN. Prüfe es an deiner Tabelle.";
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
