// experiment.js — Interaktives Experiment: Siedekurve von Wasser (Klasse 6/7).
// Realitätsnahe Messpraxis statt fertiger Kurve: Heizplatte einschalten, die
// Zeit BEWUSST in Schritten weiterstellen (Protokoll-Disziplin!), das analoge
// Thermometer selbst ablesen und mit der Zeit notieren — bis die Kurve beim
// Sieden stehen bleibt. Die kleine Anzeige-Streuung ist deterministisch
// geseedet; alle TESTS laufen DOM-frei in Node.

import {
  streuung, parseDezimal, komma, ablesungOk, mittel, mulberry32,
  bauePhasen, csvHerunterladen, farbe, reduzierteBewegung
} from "../../../assets/js/experiment/helfer.js";

// ---------- Modell (exakt, Node-testbar) ----------
// T(t) = 100 − 80·e^(−t/300) in °C; sobald der rohe Wert 99,5 °C erreicht,
// hält das Modell exakt 100,0 °C (Sieden — Plateau ab t ≈ 1523 s).
// Kontrollwerte: T(150) = 51,48 · T(300) = 70,57 · T(600) = 89,17.
export const TAU = 300;               // Zeitkonstante in s
export const START_TEMPERATUR = 20;   // T(0) = 100 − 80 = 20 °C
export const SIEDE_TEMPERATUR = 100;  // Plateau in °C
export const PLATEAU_AB = 99.5;       // °C: ab hier zeigt das Modell exakt 100,0
export const ABLESE_TOLERANZ = 0.7;   // °C: so genau muss die Ablesung sein
export const MIN_MESSUNGEN = 8;       // Mindestumfang der Messreihe
export const MIN_IM_PLATEAU = 2;      // davon mindestens beim Sieden
export const ZEIT_MAX = 5970;         // s: mehr zeigt die Stoppuhr nicht (99:30)

export function rohTemperatur(t) { return 100 - 80 * Math.exp(-t / TAU); }
export function siedet(t) { return rohTemperatur(t) >= PLATEAU_AB; }
export function modellTemperatur(t) { return siedet(t) ? SIEDE_TEMPERATUR : rohTemperatur(t); }
// Anzeige des Thermometers: Modellwert + reproduzierbare Streuung von ±0,2 °C
export function anzeigeTemperatur(t) { return modellTemperatur(t) + streuung("T:" + t, 0.4); }

// Stoppuhr-Anzeige im Format mm:ss
export function zeitFormat(t) {
  const m = Math.floor(t / 60), s = Math.round(t % 60);
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// ---------- Mess- und Auswertelogik (rein) ----------
export function zaehleSiedend(messungen) { return messungen.filter(z => z.siedend).length; }
export function messreiheOk(messungen) {
  return messungen.length >= MIN_MESSUNGEN && zaehleSiedend(messungen) >= MIN_IM_PLATEAU;
}
// Plateau aus einer Messreihe erkennen: alle Punkte, die höchstens 0,5 °C
// unter dem Maximum liegen; ab MIN_IM_PLATEAU solcher Punkte gilt es als erkannt.
export function plateauAus(messungen) {
  const werte = messungen.map(z => z.T).filter(Number.isFinite);
  if (!werte.length) return { T: NaN, anzahl: 0, erkannt: false };
  const max = Math.max(...werte);
  const plateau = werte.filter(T => max - T <= 0.5);
  return { T: mittel(plateau), anzahl: plateau.length, erkannt: plateau.length >= MIN_IM_PLATEAU };
}
// Auswertungsfrage 1: „Bei welcher Temperatur bleibt die Kurve stehen?“ (100 ± 0,5)
export function siedeAntwortOk(wert) {
  return Number.isFinite(wert) && Math.abs(wert - SIEDE_TEMPERATUR) <= 0.5;
}

// ---------- Prüffälle + TESTS (Modulebene DOM-frei) ----------
export const pruefFaelle = [
  { t: 0,    soll: 20.0,  toleranz: 1e-9 },
  { t: 150,  soll: 51.48, toleranz: 0.005 },
  { t: 300,  soll: 70.57, toleranz: 0.005 },
  { t: 600,  soll: 89.17, toleranz: 0.005 },
  { t: 1530, soll: 100.0, toleranz: 0 }     // Plateau: exakt 100,0
];

// synthetische, perfekte Messreihe (Modellwerte ohne Streuung)
const perfekteReihe = zeiten => zeiten.map(t => ({ t, T: modellTemperatur(t), siedend: siedet(t) }));

export const TESTS = [
  { name: "Modell-Kontrollwerte (0/150/300/600/1530 s)",
    ok: () => pruefFaelle.every(p => Math.abs(modellTemperatur(p.t) - p.soll) <= p.toleranz) },
  { name: "Plateau exakt 100,0 ab roh ≥ 99,5 °C",
    ok: () => modellTemperatur(1500) < 99.5 && !siedet(1500) &&
              siedet(1530) && modellTemperatur(1530) === 100 && modellTemperatur(36000) === 100 },
  { name: "Anzeige-Streuung höchstens ±0,2 °C und deterministisch",
    ok: () => { for (let t = 0; t <= 7200; t += 30) { if (Math.abs(anzeigeTemperatur(t) - modellTemperatur(t)) > 0.2 + 1e-9) return false; } return anzeigeTemperatur(450) === anzeigeTemperatur(450); } },
  { name: "Modell monoton: nie fallend, vor dem Plateau streng steigend",
    ok: () => { for (let t = 0; t < 7200; t += 30) { const a = modellTemperatur(t), b = modellTemperatur(t + 30); if (b < a) return false; if (!siedet(t + 30) && !(b > a)) return false; } return true; } },
  { name: "Perfekte Reihe: Plateau wird bei 100,0 °C erkannt",
    ok: () => { const p = plateauAus(perfekteReihe([0, 150, 300, 450, 600, 900, 1200, 1530, 1830, 2130])); return p.erkannt && p.anzahl === 3 && Math.abs(p.T - 100) < 1e-9; } },
  { name: "parseDezimal (Komma/Punkt) und Ablese-Toleranz ±0,7 °C",
    ok: () => parseDezimal("99,8") === 99.8 && parseDezimal("99.8") === 99.8 && Number.isNaN(parseDezimal("heiss")) &&
              ablesungOk(100.6, 100, ABLESE_TOLERANZ) && !ablesungOk(100.8, 100, ABLESE_TOLERANZ) && !ablesungOk(NaN, 100, ABLESE_TOLERANZ) },
  { name: "Messreihe: mindestens 8 Punkte, davon 2 im Plateau",
    ok: () => messreiheOk(perfekteReihe([0, 150, 300, 600, 900, 1200, 1530, 1830])) &&
              !messreiheOk(perfekteReihe([0, 150, 300, 600, 900, 1200, 1530])) &&
              !messreiheOk(perfekteReihe([0, 150, 300, 450, 600, 900, 1200, 1530])) },
  { name: "Zeitknöpfe erreichen das Sieden (5 × 5 min + 30 s), Stoppuhrformat",
    ok: () => siedet(5 * 300 + 30) && !siedet(5 * 300) &&
              zeitFormat(0) === "00:00" && zeitFormat(1530) === "25:30" && zeitFormat(ZEIT_MAX) === "99:30" },
  { name: "Auswertungsfrage akzeptiert 100 ± 0,5 °C",
    ok: () => siedeAntwortOk(100) && siedeAntwortOk(99.5) && siedeAntwortOk(100.5) && !siedeAntwortOk(101) && !siedeAntwortOk(NaN) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  const reduziert = reduzierteBewegung();

  const zustand = { t: 0, plattAn: false, messungen: [], phase: "aufbau" };
  let animId = 0;

  // deterministische Blasen-Parameter (Position, Tempo, Größe)
  const zufall = mulberry32(4711);
  const blasen = Array.from({ length: 9 }, () => ({
    x: 70 + zufall() * 144, phase: zufall(), tempo: 0.25 + zufall() * 0.45, r: 2 + zufall() * 2.5
  }));

  const wechsle = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], wechslePhase);

  wurzel.insertAdjacentHTML("beforeend", `
    <div class="exp-flaeche">
      <div class="exp-links">
        <canvas id="exp-canvas" width="360" height="640" aria-label="Versuchsaufbau: Becherglas mit Wasser auf einer Heizplatte, links oben eine digitale Stoppuhr, rechts ein analoges Thermometer mit Skala von 0 bis 110 Grad Celsius."></canvas>
      </div>
      <div class="exp-rechts" id="exp-panel"></div>
    </div>`);

  const canvas = wurzel.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = wurzel.querySelector("#exp-panel");

  // ---------- Zeichnung ----------
  function zeichne() {
    const w = canvas.width, h = canvas.height;
    const cText = farbe("--text"), cLeise = farbe("--text-leise"),
          cAkzent = farbe("--akzent"), cFehler = farbe("--fehler", "#b3332a"),
          cFlaeche = farbe("--flaeche");
    const T = anzeigeTemperatur(zustand.t);
    const kocht = siedet(zustand.t);
    ctx.clearRect(0, 0, w, h);
    ctx.font = "13px system-ui, sans-serif";

    // Stoppuhr (digital)
    ctx.lineWidth = 2; ctx.strokeStyle = cText; ctx.fillStyle = cFlaeche;
    ctx.fillRect(40, 36, 170, 70); ctx.strokeRect(40, 36, 170, 70);
    ctx.fillStyle = cLeise; ctx.font = "12px system-ui, sans-serif";
    ctx.fillText("Stoppuhr · min:s", 52, 56);
    ctx.fillStyle = cText; ctx.font = "bold 30px Consolas, monospace";
    ctx.fillText(zeitFormat(zustand.t), 52, 94);

    // Heizplatte mit Heizwendeln, Kontrolllampe und Füßen
    ctx.font = "12px system-ui, sans-serif";
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(44, 576, 196, 20); ctx.strokeRect(44, 576, 196, 20);
    ctx.strokeStyle = zustand.plattAn ? cFehler : cLeise; ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(56, 582 + i * 5); ctx.lineTo(216, 582 + i * 5); ctx.stroke(); }
    ctx.beginPath(); ctx.arc(228, 586, 4.5, 0, 7);
    ctx.fillStyle = zustand.plattAn ? cFehler : cFlaeche; ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = cText; ctx.fillRect(56, 596, 18, 8); ctx.fillRect(210, 596, 18, 8);
    ctx.fillStyle = cLeise;
    ctx.fillText(zustand.plattAn ? "Heizplatte: AN" : "Heizplatte: AUS", 46, 620);

    // Becherglas mit Wasser
    ctx.strokeStyle = cText; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(60, 336); ctx.lineTo(60, 574);
    ctx.moveTo(224, 336); ctx.lineTo(224, 574);
    ctx.moveTo(58, 574); ctx.lineTo(226, 574); ctx.stroke();
    ctx.globalAlpha = 0.16; ctx.fillStyle = cAkzent; ctx.fillRect(62, 412, 160, 160); ctx.globalAlpha = 1;
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 2; ctx.globalAlpha = 0.6;
    ctx.beginPath(); ctx.moveTo(62, 412); ctx.lineTo(222, 412); ctx.stroke(); ctx.globalAlpha = 1;

    // Sieden: Blasen (animiert; bei reduzierter Bewegung statisch) + Dampf + Text
    if (kocht) {
      const jetzt = reduziert ? 0 : performance.now() / 1000;
      ctx.strokeStyle = cText; ctx.lineWidth = 1.5;
      for (const b of blasen) {
        const anteil = reduziert ? b.phase : (jetzt * b.tempo + b.phase) % 1;
        ctx.globalAlpha = 0.9 - anteil * 0.55;
        ctx.beginPath(); ctx.arc(b.x, 566 - anteil * 148, b.r, 0, 7); ctx.stroke();
      }
      ctx.globalAlpha = 0.75; ctx.strokeStyle = cLeise; ctx.lineWidth = 2;
      for (const x0 of [118, 166]) {
        ctx.beginPath();
        for (let y = 328; y >= 248; y -= 6) {
          const x = x0 + Math.sin(y / 13 + (reduziert ? 0 : jetzt * 2) + x0) * 7;
          if (y === 328) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.fillStyle = cText; ctx.font = "bold 14px system-ui, sans-serif";
      ctx.textAlign = "center"; ctx.fillText("es siedet", 142, 236); ctx.textAlign = "start";
    }

    // Analoges Thermometer: Skala 0–110 °C, Teilstriche 1 °C, Säule + Vorratskugel
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cLeise; ctx.lineWidth = 1.5;
    ctx.fillRect(250, 44, 102, 590); ctx.strokeRect(250, 44, 102, 590);
    const yT = grad => 598 - grad * (520 / 110);
    ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "right";
    for (let grad = 0; grad <= 110; grad++) {
      const y = yT(grad);
      const zehner = grad % 10 === 0, fuenfer = grad % 5 === 0;
      ctx.strokeStyle = zehner ? cText : cLeise; ctx.lineWidth = zehner ? 1.6 : 1;
      ctx.beginPath(); ctx.moveTo(zehner ? 289 : (fuenfer ? 293 : 297), y); ctx.lineTo(302, y); ctx.stroke();
      if (zehner) { ctx.fillStyle = cText; ctx.fillText(String(grad), 285, y + 4); }
    }
    ctx.textAlign = "start";
    ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.strokeRect(306, 70, 14, 534);
    const saeuleOben = yT(Math.max(0, Math.min(110, T)));
    ctx.fillStyle = cFehler;
    ctx.fillRect(309.5, saeuleOben, 7, 601 - saeuleOben);
    ctx.beginPath(); ctx.arc(313, 612, 11, 0, 7); ctx.fill();
    ctx.strokeStyle = cText; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = cText; ctx.font = "12px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.fillText("°C", 313, 62); ctx.textAlign = "start";
  }

  // Blasen-Animation nur, solange es siedet; bei reduzierter Bewegung statisch
  function starteSiedeAnimation() {
    if (reduziert) { zeichne(); return; }
    if (animId) return;
    const schleife = () => {
      zeichne();
      animId = siedet(zustand.t) ? requestAnimationFrame(schleife) : 0;
    };
    animId = requestAnimationFrame(schleife);
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML = `
      <h2>Aufbau und Geräte</h2>
      <p>Auf einer <strong>Heizplatte</strong> steht ein Becherglas mit Leitungswasser (etwa 20 °C). Im Wasser hängt ein <strong>analoges Thermometer</strong> — die Skala reicht von 0 bis 110 °C, jeder kleine Strich ist 1 °C. Daneben liegt eine <strong>digitale Stoppuhr</strong>.</p>
      <p><strong>Plan:</strong> Heizplatte einschalten, die Zeit Schritt für Schritt weiterstellen und das Thermometer immer wieder <em>selbst</em> ablesen. Jeden Wert trägst du zusammen mit der Zeit in die Messtabelle ein — so entsteht Punkt für Punkt deine <strong>Siedekurve</strong>.</p>
      <p class="exp-hinweis">Vorhersage: Was meinst du — steigt die Temperatur immer weiter, solange die Platte heizt? Behalte deine Vermutung im Kopf und prüfe sie nachher an deiner Kurve.</p>
      <p>Miss mindestens ${MIN_MESSUNGEN} Mal, davon mindestens ${MIN_IM_PLATEAU} Mal, wenn das Wasser schon sprudelt. Ein erster Messwert bei 0 s (vor dem Einschalten) gehört in jedes gute Protokoll!</p>
      <button class="knopf" id="exp-weiter1">Zur Durchführung</button>`;
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechsle("messen"));
  }

  function zeitzeileHtml() {
    return `Stoppuhr: <strong>${zeitFormat(zustand.t)}</strong> (Heizzeit t = ${zustand.t} s)` +
           (siedet(zustand.t) ? " — <strong>es siedet!</strong>" : "");
  }

  function panelMessen() {
    panel.innerHTML = `
      <h2>Durchführung</h2>
      <div class="exp-knopfzeile">
        <button class="knopf ${zustand.plattAn ? "zweitrangig" : ""}" id="exp-platte">${zustand.plattAn ? "Heizplatte ausschalten" : "Heizplatte einschalten"}</button>
        <button class="knopf zweitrangig" id="exp-t30">+30 s</button>
        <button class="knopf zweitrangig" id="exp-t300">+5 min (Zeitraffer)</button>
      </div>
      <p id="exp-zeitzeile">${zeitzeileHtml()}</p>
      <p>Die Zeit läuft nur, wenn <strong>du</strong> sie weiterstellst — lies in Ruhe ab und notiere erst dann. Am Anfang lohnen kleine Schritte, später der Zeitraffer. Miss auch dann noch, wenn es längst sprudelt!</p>
      <form id="exp-ablesen" class="exp-ablesen">
        <label for="exp-wert">Lies das Thermometer ab — T in °C:</label>
        <input id="exp-wert" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">In die Tabelle</button>
      </form>
      <p id="exp-meldung" class="exp-meldung" aria-live="polite"></p>
      <h3>Messtabelle</h3>
      <table class="exp-tabelle"><thead><tr><th>t in s</th><th>T in °C</th></tr></thead>
      <tbody>${zustand.messungen.map(z => `<tr><td>${z.t}</td><td>${komma(z.T, 1)}</td></tr>`).join("") || '<tr><td colspan="2">noch leer</td></tr>'}</tbody></table>
      <p>${zustand.messungen.length} von mindestens ${MIN_MESSUNGEN} Messungen — davon ${zaehleSiedend(zustand.messungen)} von ${MIN_IM_PLATEAU} beim Sieden.</p>
      <button class="knopf" id="exp-weiter2" ${messreiheOk(zustand.messungen) ? "" : "disabled"}>Zur Auswertung</button>`;
    const meldung = panel.querySelector("#exp-meldung");
    panel.querySelector("#exp-platte").addEventListener("click", () => {
      zustand.plattAn = !zustand.plattAn;
      panelMessen(); zeichne();
    });
    function zeitWeiter(dt) {
      if (!zustand.plattAn) {
        meldung.textContent = "Die Heizplatte ist aus — ohne Heizen ändert sich nichts. Schalte sie zuerst ein.";
        return;
      }
      if (zustand.t >= ZEIT_MAX) {
        meldung.textContent = "Genug gekocht — mehr als Sieden passiert nicht. Zeit für die Auswertung!";
        return;
      }
      zustand.t = Math.min(ZEIT_MAX, zustand.t + dt);
      panel.querySelector("#exp-zeitzeile").innerHTML = zeitzeileHtml();
      meldung.textContent = "";
      if (siedet(zustand.t)) starteSiedeAnimation(); else zeichne();
    }
    panel.querySelector("#exp-t30").addEventListener("click", () => zeitWeiter(30));
    panel.querySelector("#exp-t300").addEventListener("click", () => zeitWeiter(300));
    panel.querySelector("#exp-ablesen").addEventListener("submit", ev => {
      ev.preventDefault();
      const eingabe = parseDezimal(panel.querySelector("#exp-wert").value);
      if (zustand.messungen.some(z => z.t === zustand.t)) {
        meldung.textContent = "Für diesen Zeitpunkt steht schon ein Wert in der Tabelle — stell die Zeit erst weiter.";
        return;
      }
      if (!ablesungOk(eingabe, anzeigeTemperatur(zustand.t), ABLESE_TOLERANZ)) {
        meldung.textContent = "✗ Schau noch einmal genau hin: Wo endet die rote Säule? (Auf 1 °C genau reicht.)";
        return;
      }
      zustand.messungen.push({ t: zustand.t, T: eingabe, siedend: siedet(zustand.t) });
      zustand.messungen.sort((a, b) => a.t - b.t);
      panelMessen();
      panel.querySelector("#exp-meldung").textContent = "✓ Eingetragen.";
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechsle("auswerten"));
  }

  function panelAuswerten() {
    const fertig = messreiheOk(zustand.messungen);
    panel.innerHTML = `
      <h2>Auswertung</h2>
      ${fertig ? "" : `<p class="exp-hinweis">Noch zu wenig Messwerte (${zustand.messungen.length} von ${MIN_MESSUNGEN}, beim Sieden ${zaehleSiedend(zustand.messungen)} von ${MIN_IM_PLATEAU}). Geh zurück zur Durchführung und miss weiter — dann lohnt sich das Diagramm.</p>`}
      <p>Dein T-t-Diagramm: Jeder Punkt ist eine deiner Ablesungen, der Linienzug verbindet sie.</p>
      <canvas id="exp-diagramm" class="exp-diagramm" width="440" height="300" aria-label="Diagramm: Temperatur in Grad Celsius über der Zeit in Minuten. Die Kurve steigt erst steil, wird flacher und läuft beim Sieden waagerecht bei 100 Grad."></canvas>
      <div class="exp-knopfzeile"><button class="knopf zweitrangig" id="exp-csv" ${zustand.messungen.length ? "" : "disabled"}>Messwerte als CSV</button></div>
      <h3>Fragen zu deiner Kurve</h3>
      <form id="exp-frage1" class="exp-ablesen">
        <label for="exp-f1">1 · Bei welcher Temperatur bleibt die Kurve stehen? T in °C:</label>
        <input id="exp-f1" inputmode="decimal" autocomplete="off" size="7">
        <button class="knopf">Prüfen</button>
      </form>
      <p id="exp-m1" class="exp-meldung" aria-live="polite"></p>
      <p><label for="exp-f2"><strong>2 · Die Platte heizt weiter, aber die Temperatur steigt nicht mehr — wohin geht die Energie?</strong></label></p>
      <select id="exp-f2" class="exp-wahl">
        <option value="">Bitte wählen …</option>
        <option value="weg">Sie verschwindet einfach.</option>
        <option value="verdampfung">Sie wird zum Verdampfen gebraucht: Wasser wird zu Dampf.</option>
        <option value="heisser">Sie macht das Wasser heißer als 100 °C.</option>
        <option value="glas">Sie sammelt sich im Becherglas an.</option>
      </select>
      <p><button class="knopf" id="exp-f2pruefen">Antwort prüfen</button></p>
      <p id="exp-m2" class="exp-meldung" aria-live="polite"></p>
      <details class="exp-fehler"><summary>Vertiefung: Sieden ist Drucksache</summary>
        <p>Die 100 °C gelten nur bei normalem Luftdruck. Auf dem <strong>Mount Everest</strong> ist der Luftdruck so niedrig, dass Wasser schon bei etwa <strong>70 °C</strong> siedet — Bergsteiger bekommen ihren Tee nie richtig heiß. Im <strong>Schnellkochtopf</strong> ist es umgekehrt: Der Deckel hält den Dampf zurück, der Druck steigt, und das Wasser siedet erst bei rund 120 °C. Darum gart das Essen dort schneller.</p>
      </details>
      <details class="exp-fehler"><summary>Fehlerbetrachtung — typische Stolperfallen im echten Versuch</summary>
        <ul>
          <li><strong>Ablesen während des Rührens:</strong> Die Säule zappelt, und du erwischst leicht einen falschen Wert. Kurz warten und ruhig auf Augenhöhe ablesen — gerührt wird zwischen den Messungen, damit das Wasser überall gleich warm ist.</li>
          <li><strong>Thermometer berührt die Glaswand:</strong> Die Wand ist näher an der Heizplatte und heißer als das Wasser — das Thermometer zeigt dann zu viel an. Es muss frei im Wasser hängen.</li>
          <li><strong>Modellgrenzen:</strong> Hier bleibt die Wassermenge gleich und nichts kühlt ab. Im echten Versuch verdampft sichtbar Wasser, der Pegel sinkt — und bei ausgeschalteter Platte fällt die Temperatur wieder.</li>
        </ul>
      </details>
      <div class="sp-panel-knoepfe">
        <button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>
        <button class="knopf" id="exp-neustart">Neues Experiment</button>
      </div>`;
    panel.querySelector("#exp-csv").addEventListener("click", () =>
      csvHerunterladen("siedekurve-messwerte.csv", ["t in s", "T in °C"],
        zustand.messungen.map(z => [String(z.t), komma(z.T, 1)])));
    panel.querySelector("#exp-frage1").addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseDezimal(panel.querySelector("#exp-f1").value);
      panel.querySelector("#exp-m1").textContent = siedeAntwortOk(wert)
        ? "✓ Genau: Die Kurve bleibt bei 100 °C stehen — der Siedetemperatur von Wasser. Länger heizen macht das Wasser nicht heißer."
        : "✗ Noch nicht ganz: Schau auf den flachen Teil ganz rechts im Diagramm. Auf welcher Höhe läuft die Kurve waagerecht? Vergleiche mit deinen letzten Messwerten.";
    });
    panel.querySelector("#exp-f2pruefen").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-f2").value;
      const m2 = panel.querySelector("#exp-m2");
      if (!wahl) { m2.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m2.textContent = {
        verdampfung: "✓ Richtig: Die Energie wird zum Verdampfen gebraucht. Sie wandelt flüssiges Wasser in Dampf um — ohne die Temperatur zu erhöhen. (Fachwort: Verdampfungswärme.)",
        weg: "✗ Energie verschwindet nie einfach — sie steckt hinterher immer irgendwo. Was entsteht beim Sieden ständig neu und steigt auf?",
        heisser: "✗ Genau das zeigt deine Kurve nicht: Sie bleibt bei 100 °C stehen, egal wie lange die Platte heizt. Wohin könnte die Energie stattdessen gehen?",
        glas: "✗ Das Glas wird zwar warm, aber es kann nicht endlos Energie aufnehmen. Was steigt beim Sieden ständig aus dem Wasser auf?"
      }[wahl];
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechsle("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.t = 0; zustand.plattAn = false; zustand.messungen = [];
      if (animId) { cancelAnimationFrame(animId); animId = 0; }
      zeichne(); wechsle("aufbau");
    });
    zeichneDiagramm();
  }

  // T-t-Diagramm aus den eigenen Messpunkten (verbundene Punkte)
  function zeichneDiagramm() {
    const dia = panel.querySelector("#exp-diagramm");
    if (!dia || !zustand.messungen.length) return;
    const c = dia.getContext("2d");
    const cText = farbe("--text"), cLeise = farbe("--text-leise"), cAkzent = farbe("--akzent");
    const W = dia.width, H = dia.height, L = 44, R = 12, O = 18, U = H - 36;
    const tMax = Math.max(60, ...zustand.messungen.map(z => z.t)) * 1.06;
    const TMax = 110;
    const x = t => L + (t / tMax) * (W - L - R);
    const y = T => U - (T / TMax) * (U - O);
    c.clearRect(0, 0, W, H);
    c.font = "12px system-ui, sans-serif";
    // waagerechte Hilfslinien alle 20 °C samt Beschriftung
    for (let grad = 0; grad <= 100; grad += 20) {
      c.strokeStyle = cLeise; c.globalAlpha = grad ? 0.35 : 1; c.lineWidth = 1;
      c.beginPath(); c.moveTo(L, y(grad)); c.lineTo(W - R, y(grad)); c.stroke(); c.globalAlpha = 1;
      c.fillStyle = cLeise; c.textAlign = "right"; c.fillText(String(grad), L - 6, y(grad) + 4);
    }
    c.textAlign = "start";
    // Achsen
    c.strokeStyle = cText; c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(L, O - 6); c.lineTo(L, U); c.lineTo(W - R, U); c.stroke();
    c.fillStyle = cText; c.fillText("T in °C", L + 6, O); c.fillText("t in min", W - 62, U + 28);
    // Zeitachse: Marken je nach Messdauer alle 1, 5 oder 10 Minuten
    const schritt = tMax > 2400 ? 600 : (tMax > 600 ? 300 : 60);
    c.fillStyle = cLeise; c.textAlign = "center";
    for (let t = 0; t <= tMax; t += schritt) {
      c.strokeStyle = cLeise; c.lineWidth = 1;
      c.beginPath(); c.moveTo(x(t), U); c.lineTo(x(t), U + 5); c.stroke();
      c.fillText(String(Math.round(t / 60)), x(t), U + 18);
    }
    c.textAlign = "start";
    // Linienzug + Messpunkte (Messungen sind nach t sortiert)
    c.strokeStyle = cAkzent; c.lineWidth = 2; c.beginPath();
    zustand.messungen.forEach((z, i) => { if (i) c.lineTo(x(z.t), y(z.T)); else c.moveTo(x(z.t), y(z.T)); });
    c.stroke();
    c.fillStyle = cAkzent;
    for (const z of zustand.messungen) { c.beginPath(); c.arc(x(z.t), y(z.T), 4, 0, 7); c.fill(); }
  }

  function wechslePhase(p) {
    zustand.phase = p;
    if (p === "aufbau") panelAufbau();
    if (p === "messen") panelMessen();
    if (p === "auswerten") panelAuswerten();
  }

  zeichne();
  wechsle("aufbau");
}
