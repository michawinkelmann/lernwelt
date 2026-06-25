// experiment.js — Interaktives Experiment: Gesetz von Boyle-Mariotte, p·V = const
// (Klasse 10, Thermodynamik). Realitätsnahe Messpraxis: eine luftgefüllte
// Gasspritze (Kolbenprober) ist mit einem Manometer verbunden. Bei FESTER
// Temperatur stellt der Lernende verschiedene Volumina V ein, liest den Druck p
// SELBST am Manometer (Zeiger auf einer Skala) ab und trägt ihn ein. In der
// Auswertung bildet er das Produkt p·V je Zeile und entdeckt: Es ist (fast)
// konstant — Druck und Volumen sind zueinander umgekehrt proportional. Die kleine
// Ablese-Streuung ist deterministisch geseedet (testbar). Modulebene DOM-frei;
// Browser-Teil in starteExperiment().

import {
  streuung, parseDezimal, komma, mittel, esc, ablesungOk,
  farbe, reduzierteBewegung, bauePhasen, csvHerunterladen
} from "../../../assets/js/experiment/helfer.js";

// ---------- Modellkonstanten ----------
// Eingeschlossene Luftmenge bei fester Temperatur: p·V = const.
// Gewählt so, dass die Werte schulfreundlich sind: bei V = 20 mL -> p = 100 kPa.
export const PV_KONSTANTE = 2000;     // kPa·mL  (= p·V)
export const TEMPERATUR = 20;         // °C — bleibt konstant (isotherm)
export const V_MIN = 10, V_MAX = 40, V_SCHRITT = 1; // mL — Kolbenweg
export const MANOMETER_MAX = 250;     // kPa — Skalenendwert
export const VORGABE_VOLUMINA = [10, 15, 20, 25, 30, 40]; // empfohlene Messpunkte
export const TOLERANZ_DRUCK = 4;      // kPa — Eintrag der Druck-Ablesung
export const TOLERANZ_PRODUKT_PROZENT = 6; // % — Eintrag des Produkts p·V
export const MIN_MESSUNGEN = 5;       // verschiedene Volumina vor der Auswertung

// ---------- Physik (rein, Node-testbar) ----------
// wahrer Druck bei Volumen V (isotherm): p = const / V
export function druckWahr(V) {
  return PV_KONSTANTE / V;
}
// am Manometer abgelesener (gestreuter) Druck: ±1,5 kPa Skalen-/Ableserauschen
export function druckAngezeigt(V) {
  return druckWahr(V) + streuung("mano:" + V, 3);
}

// ---------- Auswertelogik (rein) ----------
export function produkt(p, V) { return p * V; }
export function druckEintragOk(eingabe, wahr) {
  return ablesungOk(eingabe, wahr, TOLERANZ_DRUCK);
}
export function produktOk(eingabe, soll) {
  return Number.isFinite(eingabe) &&
         Math.abs(eingabe - soll) <= Math.abs(soll) * (TOLERANZ_PRODUKT_PROZENT / 100) + 1e-9;
}
export function anzahlVolumina(messungen) {
  return new Set(messungen.map(m => m.V)).size;
}
export function bereitFuerAuswertung(messungen) {
  return anzahlVolumina(messungen) >= MIN_MESSUNGEN;
}

// ---------- TESTS (laufen DOM-frei in Node) ----------
export const TESTS = [
  { name: "p·V = const: p(20)=100, p(10)=200, p(40)=50 kPa", ok: () =>
      Math.abs(druckWahr(20) - 100) < 1e-9 &&
      Math.abs(druckWahr(10) - 200) < 1e-9 &&
      Math.abs(druckWahr(40) - 50) < 1e-9 &&
      Math.abs(druckWahr(25) - 80) < 1e-9 },
  { name: "Unabhängige Nachrechnung: p(V)·V = 2000 für alle Rasterwerte", ok: () => {
      for (let V = V_MIN; V <= V_MAX; V += V_SCHRITT) {
        if (Math.abs(druckWahr(V) * V - PV_KONSTANTE) > 1e-9) return false;
      }
      return true;
    } },
  { name: "Umgekehrte Proportionalität: halbes V -> doppelter p", ok: () =>
      Math.abs(druckWahr(10) - 2 * druckWahr(20)) < 1e-9 &&
      Math.abs(druckWahr(15) - 2 * druckWahr(30)) < 1e-9 &&
      Math.abs(druckWahr(20) / druckWahr(40) - 2) < 1e-9 },
  { name: "Produkt p·V exakt konstant aus idealen Werten", ok: () =>
      [10, 12, 18, 24, 33, 40].every(V => Math.abs(produkt(druckWahr(V), V) - PV_KONSTANTE) < 1e-9) },
  { name: "Anzeige-Streuung höchstens ±1,5 kPa, deterministisch", ok: () => {
      for (let V = V_MIN; V <= V_MAX; V += V_SCHRITT) {
        if (Math.abs(druckAngezeigt(V) - druckWahr(V)) > 1.5 + 1e-12) return false;
        if (druckAngezeigt(V) !== druckAngezeigt(V)) return false;
      }
      return true;
    } },
  { name: "Mittel der gestreuten Produkte nahe Konstante (<2 %)", ok: () => {
      const ps = VORGABE_VOLUMINA.map(V => produkt(druckAngezeigt(V), V));
      const m = mittel(ps);
      return Math.abs(m - PV_KONSTANTE) / PV_KONSTANTE < 0.02;
    } },
  { name: "Eintrag-Toleranzen: Druck ±4 kPa, Produkt ±6 %", ok: () =>
      druckEintragOk(101, 100) && !druckEintragOk(106, 100) && !druckEintragOk(NaN, 100) &&
      produktOk(1950, 2000) && produktOk(2100, 2000) && !produktOk(2200, 2000) },
  { name: "Messreihen-Logik: Volumen-Zählung und Auswertungs-Schwelle", ok: () => {
      const m = [{ V: 10 }, { V: 15 }, { V: 20 }, { V: 25 }];
      if (anzahlVolumina(m) !== 4 || bereitFuerAuswertung(m)) return false;
      return bereitFuerAuswertung(m.concat([{ V: 30 }]));
    } },
  { name: "Produkt-Streuband: jedes gestreute p·V weicht <8 % ab", ok: () =>
      VORGABE_VOLUMINA.every(V => Math.abs(produkt(druckAngezeigt(V), V) - PV_KONSTANTE) / PV_KONSTANTE < 0.08) }
];

// ======================================================================
// Browser-Teil
// ======================================================================
export function starteExperiment() {
  const wurzel = document.getElementById("experiment-wurzel");
  if (!wurzel) return;
  reduzierteBewegung(); // (keine Daueranimation; Aufruf hält die Schnittstelle konsistent)

  const zustand = {
    phase: "aufbau",
    V: 20,                // eingestelltes Volumen in mL
    messungen: [],        // { V, p, pWahr }
    vorhersage: ""
  };

  const wechslePhase = bauePhasen(wurzel, [
    { id: "aufbau", label: "Aufbau" },
    { id: "messen", label: "Durchführung" },
    { id: "auswerten", label: "Auswertung" }
  ], zeigePhase);

  const flaeche = document.createElement("div");
  flaeche.className = "exp-flaeche";
  flaeche.innerHTML =
    '<div class="exp-links">' +
    '<canvas id="exp-canvas" width="400" height="500" aria-label="Versuchsaufbau: eine waagerechte Gasspritze mit verschiebbarem Kolben und Volumenskala, über einen Schlauch mit einem runden Manometer verbunden, dessen Zeiger den Gasdruck auf einer Skala in Kilopascal anzeigt. Daneben die Temperaturanzeige, die konstant bleibt."></canvas>' +
    '</div>' +
    '<div class="exp-rechts" id="exp-panel"></div>';
  wurzel.appendChild(flaeche);

  const canvas = flaeche.querySelector("#exp-canvas");
  const ctx = canvas.getContext("2d");
  const panel = flaeche.querySelector("#exp-panel");

  const druckHier = () => druckAngezeigt(zustand.V);

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
    const p = druckHier();

    // --- Gasspritze (waagerecht) ---
    // Zylinder von xZyl bis xZyl+zylLen; Gassäule links, Kolben verschiebbar.
    const xZyl = 30, yZyl = 70, zylLen = 250, zylH = 46;
    const vollAnteil = (zustand.V - 0) / V_MAX;             // 0..1 (V_MAX = volle Länge)
    const gasLen = Math.max(18, vollAnteil * (zylLen - 20));
    // Glaszylinder
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(xZyl, yZyl, zylLen, zylH); ctx.strokeRect(xZyl, yZyl, zylLen, zylH);
    // eingeschlossenes Gas (links)
    ctx.globalAlpha = 0.18; ctx.fillStyle = cAkzent;
    ctx.fillRect(xZyl + 2, yZyl + 2, gasLen, zylH - 4); ctx.globalAlpha = 1;
    // ein paar Gasteilchen
    ctx.fillStyle = cAkzent;
    for (let i = 0; i < 7; i++) {
      const gx = xZyl + 8 + (i * 53) % Math.max(10, gasLen - 8);
      const gy = yZyl + 8 + ((i * 29) % (zylH - 16));
      ctx.beginPath(); ctx.arc(gx, gy, 2.2, 0, 7); ctx.fill();
    }
    // Kolben
    const kolbenX = xZyl + 2 + gasLen;
    ctx.fillStyle = cHauch; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    ctx.fillRect(kolbenX, yZyl - 4, 10, zylH + 8); ctx.strokeRect(kolbenX, yZyl - 4, 10, zylH + 8);
    // Kolbenstange
    ctx.strokeStyle = cText; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(kolbenX + 10, yZyl + zylH / 2); ctx.lineTo(xZyl + zylLen + 18, yZyl + zylH / 2); ctx.stroke();
    ctx.fillStyle = cText; ctx.fillRect(xZyl + zylLen + 18, yZyl + zylH / 2 - 12, 8, 24);
    // Volumenskala unter dem Zylinder
    ctx.strokeStyle = cLeise; ctx.fillStyle = cLeise; ctx.lineWidth = 1; ctx.font = "9px system-ui, sans-serif";
    ctx.textAlign = "center";
    for (let V = 0; V <= V_MAX; V += 10) {
      const x = xZyl + 2 + (V / V_MAX) * (zylLen - 20);
      ctx.strokeStyle = cLeise; ctx.beginPath(); ctx.moveTo(x, yZyl + zylH + 2); ctx.lineTo(x, yZyl + zylH + 8); ctx.stroke();
      ctx.fillStyle = cLeise; ctx.fillText(String(V), x, yZyl + zylH + 20);
    }
    ctx.fillStyle = cLeise; ctx.textAlign = "start"; ctx.fillText("Volumen V in mL", xZyl, yZyl - 14);
    // aktueller Volumen-Marker
    ctx.fillStyle = cAkzent; ctx.font = "bold 12px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("V = " + zustand.V + " mL", kolbenX, yZyl + zylH + 34);

    // --- Schlauch zum Manometer ---
    ctx.strokeStyle = cText; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(xZyl + 30, yZyl + zylH); ctx.lineTo(xZyl + 30, 190);
    ctx.lineTo(150, 190); ctx.lineTo(150, 230); ctx.stroke();

    // --- rundes Manometer ---
    const cx = 150, cy = 300, rad = 78;
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(cx, cy, rad, 0, 7); ctx.fill(); ctx.stroke();
    // Skala 0..MANOMETER_MAX über 240° (von 150° bis 390°=30°)
    const a0 = 150 * Math.PI / 180, a1 = (150 + 240) * Math.PI / 180;
    const winkel = pp => a0 + (Math.min(pp, MANOMETER_MAX) / MANOMETER_MAX) * (a1 - a0);
    ctx.font = "10px system-ui, sans-serif"; ctx.textAlign = "center";
    for (let pp = 0; pp <= MANOMETER_MAX; pp += 25) {
      const ang = winkel(pp), gross = pp % 50 === 0;
      const r1 = rad - (gross ? 14 : 9), r2 = rad - 3;
      ctx.strokeStyle = gross ? cText : cLeise; ctx.lineWidth = gross ? 1.8 : 1;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.lineTo(cx + Math.cos(ang) * r2, cy + Math.sin(ang) * r2); ctx.stroke();
      if (gross) {
        ctx.fillStyle = cText;
        ctx.fillText(String(pp), cx + Math.cos(ang) * (rad - 28), cy + Math.sin(ang) * (rad - 28) + 3);
      }
    }
    // Zeiger
    const az = winkel(p);
    ctx.strokeStyle = cAkzent; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(az) * (rad - 16), cy + Math.sin(az) * (rad - 16)); ctx.stroke();
    ctx.fillStyle = cText; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, 7); ctx.fill();
    ctx.fillStyle = cText; ctx.font = "bold 11px system-ui, sans-serif"; ctx.textAlign = "center";
    ctx.fillText("Manometer", cx, cy + rad + 18);
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("Druck p in kPa", cx, cy - rad - 10);

    // --- Temperaturanzeige (konstant) ---
    const T = { x: 268, y: 250, b: 112, h: 96 };
    ctx.fillStyle = cFlaeche; ctx.strokeStyle = cText; ctx.lineWidth = 2;
    rrect(T.x, T.y, T.b, T.h, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = cLeise; ctx.font = "11px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Temperatur", T.x + 12, T.y + 22);
    ctx.fillStyle = cText; ctx.font = "bold 22px ui-monospace, Consolas, monospace"; ctx.textAlign = "center";
    ctx.fillText(TEMPERATUR + " °C", T.x + T.b / 2, T.y + 52);
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("bleibt konstant", T.x + T.b / 2, T.y + 74);

    // --- großer Druck-Klartext, damit der abgelesene Wert eindeutig sichtbar ist ---
    ctx.fillStyle = cText; ctx.font = "bold 13px system-ui, sans-serif"; ctx.textAlign = "start";
    ctx.fillText("Zeiger steht auf:", 250, 420);
    ctx.fillStyle = cAkzent; ctx.font = "bold 26px ui-monospace, Consolas, monospace";
    ctx.fillText(komma(p, 0) + " kPa", 250, 452);
    ctx.fillStyle = cLeise; ctx.font = "10px system-ui, sans-serif";
    ctx.fillText("(lies selbst an der Skala ab)", 250, 470);
  }

  // ---------- Panels je Phase ----------
  function panelAufbau() {
    panel.innerHTML =
      '<h2>Aufbau und Geräte</h2>' +
      '<p>Eine <strong>Gasspritze</strong> (Kolbenprober) schließt eine feste Menge Luft ein und ist über einen Schlauch mit einem <strong>Manometer</strong> verbunden. Schiebst du den Kolben hinein, wird das <strong>Volumen V</strong> kleiner — der Zeiger des Manometers zeigt den <strong>Druck p</strong> an. Die <strong>Temperatur</strong> bleibt dabei konstant (isotherm).</p>' +
      '<p><strong>Plan:</strong> Stelle nacheinander verschiedene Volumina ein, lies jedes Mal den Druck <strong>selbst</strong> am Manometer ab und trag ihn ein. In der Auswertung bildest du das Produkt <strong>p · V</strong> je Zeile und prüfst, ob es konstant bleibt.</p>' +
      '<p class="exp-hinweis">Achte darauf: nur das Volumen wird verändert — Gasmenge und Temperatur bleiben gleich. Nur dann gilt das Gesetz von Boyle-Mariotte.</p>' +
      '<label for="exp-vorhersage"><strong>Deine Vorhersage:</strong> Was passiert mit dem Druck, wenn du das Volumen <em>halbierst</em>?</label>' +
      '<select id="exp-vorhersage" class="exp-wahl">' +
      '<option value="">— bitte wählen —</option>' +
      '<option value="halb"' + (zustand.vorhersage === "halb" ? " selected" : "") + '>Er halbiert sich.</option>' +
      '<option value="gleich"' + (zustand.vorhersage === "gleich" ? " selected" : "") + '>Er bleibt gleich.</option>' +
      '<option value="doppelt"' + (zustand.vorhersage === "doppelt" ? " selected" : "") + '>Er verdoppelt sich.</option>' +
      '</select>' +
      '<p id="exp-vorhersage-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<button class="knopf" id="exp-weiter1">Zur Durchführung</button>';
    panel.querySelector("#exp-vorhersage").addEventListener("change", ev => {
      zustand.vorhersage = ev.target.value;
      panel.querySelector("#exp-vorhersage-meldung").textContent =
        ev.target.value ? "Notiert — am Ende prüfst du das an deinen Messwerten." : "";
    });
    panel.querySelector("#exp-weiter1").addEventListener("click", () => wechslePhase("messen"));
  }

  function panelMessen(meldung = "") {
    const schonGemessen = zustand.messungen.some(m => m.V === zustand.V);
    const offenesV = VORGABE_VOLUMINA.find(v => !zustand.messungen.some(m => m.V === v));
    panel.innerHTML =
      '<h2>Durchführung</h2>' +
      '<div class="exp-regler">' +
      '<label for="exp-v">Kolben verschieben — Volumen: <strong id="exp-vwert">' + zustand.V + ' mL</strong></label>' +
      '<input type="range" id="exp-v" min="' + V_MIN + '" max="' + V_MAX + '" step="' + V_SCHRITT + '" value="' + zustand.V + '">' +
      '</div>' +
      '<p class="exp-hinweis">Empfohlene Messpunkte: ' + VORGABE_VOLUMINA.join(", ") + ' mL.' + (offenesV !== undefined ? ' Als Nächstes offen: ' + offenesV + ' mL.' : ' Alle empfohlenen Punkte gemessen!') + '</p>' +
      '<form id="exp-eintrag" class="exp-ablesen">' +
      '<label for="exp-p-eintrag">Lies das Manometer ab — Druck p in kPa:</label>' +
      '<input id="exp-p-eintrag" inputmode="decimal" autocomplete="off" size="6" ' + (schonGemessen ? "disabled" : "") + '>' +
      '<button class="knopf" ' + (schonGemessen ? "disabled" : "") + '>In die Tabelle</button>' +
      '</form>' +
      (schonGemessen ? '<p class="exp-hinweis">Für dieses Volumen hast du schon gemessen — stell ein anderes ein.</p>' : "") +
      '<p id="exp-meldung" class="exp-meldung" aria-live="polite">' + esc(meldung) + '</p>' +
      '<h3>Messtabelle</h3>' +
      '<table class="exp-tabelle"><thead><tr><th>V in mL</th><th>p in kPa</th></tr></thead>' +
      '<tbody>' + (zustand.messungen.length
        ? [...zustand.messungen].sort((a, b) => a.V - b.V).map(m =>
            '<tr><td>' + m.V + '</td><td>' + komma(m.p, 0) + '</td></tr>').join("")
        : '<tr><td colspan="2">noch leer</td></tr>') + '</tbody></table>' +
      '<p>Bisher: <strong>' + anzahlVolumina(zustand.messungen) + '</strong> von mindestens ' + MIN_MESSUNGEN + ' Volumina.</p>' +
      '<button class="knopf" id="exp-weiter2" ' + (bereitFuerAuswertung(zustand.messungen) ? "" : "disabled") + '>Zur Auswertung</button>';
    panel.querySelector("#exp-v").addEventListener("input", ev => {
      zustand.V = Number(ev.target.value);
      panel.querySelector("#exp-vwert").textContent = zustand.V + " mL";
      zeichne();
      // Eingabefeld je nach „schon gemessen" sperren/freigeben, ohne Neuaufbau-Flackern
      const feld = panel.querySelector("#exp-p-eintrag");
      const knopf = panel.querySelector("#exp-eintrag button");
      const schon = zustand.messungen.some(m => m.V === zustand.V);
      feld.disabled = schon; knopf.disabled = schon;
    });
    panel.querySelector("#exp-weiter2").addEventListener("click", () => wechslePhase("auswerten"));
    panel.querySelector("#exp-eintrag").addEventListener("submit", ev => {
      ev.preventDefault();
      if (zustand.messungen.some(m => m.V === zustand.V)) return;
      const eingabe = parseDezimal(panel.querySelector("#exp-p-eintrag").value);
      const wahr = druckAngezeigt(zustand.V);
      const meldungEl = panel.querySelector("#exp-meldung");
      if (!druckEintragOk(eingabe, wahr)) {
        meldungEl.textContent = "✗ Schau genau hin: Wo steht der Zeiger auf der kPa-Skala? Der Klartext rechts unten hilft beim Kontrollieren — auf ein paar kPa genau eintragen.";
        return;
      }
      zustand.messungen.push({ V: zustand.V, p: eingabe, pWahr: wahr });
      const offen = VORGABE_VOLUMINA.find(v => !zustand.messungen.some(m => m.V === v));
      if (offen !== undefined) zustand.V = offen;
      zeichne();
      panelMessen("✓ Eingetragen." + (offen !== undefined ? " Weiter mit V = " + offen + " mL." : " Alle empfohlenen Volumina gemessen!"));
    });
    zeichne();
  }

  function panelAuswerten() {
    if (!bereitFuerAuswertung(zustand.messungen)) {
      panel.innerHTML =
        '<h2>Auswertung</h2>' +
        '<p>Miss mindestens <strong>' + MIN_MESSUNGEN + ' verschiedene Volumina</strong>.</p>' +
        '<p>Aktuell: ' + anzahlVolumina(zustand.messungen) + ' Volumina.</p>' +
        '<button class="knopf" id="exp-zurueck0">Zur Durchführung</button>';
      panel.querySelector("#exp-zurueck0").addEventListener("click", () => wechslePhase("messen"));
      return;
    }
    const zeilen = [...zustand.messungen].sort((a, b) => a.V - b.V);
    const produkte = zeilen.map(m => produkt(m.p, m.V));
    const mittelP = mittel(produkte);
    panel.innerHTML =
      '<h2>Auswertung</h2>' +
      '<h3>1 · Produkt p · V bilden</h3>' +
      '<p>Rechne für jede Zeile das Produkt aus Druck und Volumen: <strong>p · V</strong>. Trag es in die letzte Spalte ein (Komma oder Punkt — beides geht).</p>' +
      '<details class="exp-hilfe"><summary>Hilfe: Schritt für Schritt</summary>' +
      '<p><strong>Teilschritt:</strong> Nimm aus einer Zeile den Druck p (in kPa) und das Volumen V (in mL) und multipliziere beide. Beispiel (erfundene Zahlen): p = 100 kPa und V = 20 mL ergeben p · V = 2000 kPa·mL.</p>' +
      '<p>Wenn p und V umgekehrt proportional sind, kommt in jeder Zeile (fast) dieselbe Zahl heraus.</p>' +
      '</details>' +
      '<form id="exp-pvform">' +
      '<table class="exp-tabelle"><thead><tr><th>V in mL</th><th>p in kPa</th><th>p · V in kPa·mL</th></tr></thead><tbody>' +
      zeilen.map((m, i) => '<tr><td>' + m.V + '</td><td>' + komma(m.p, 0) + '</td>' +
        '<td><input class="exp-eingabe" id="exp-pv-' + i + '" inputmode="decimal" autocomplete="off" aria-label="Produkt Zeile ' + (i + 1) + '"> <span id="exp-pv-ok-' + i + '" aria-live="polite"></span></td></tr>').join("") +
      '</tbody></table>' +
      '<button class="knopf zweitrangig">Zeilen prüfen</button>' +
      '</form>' +
      '<p id="exp-pv-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<h3>2 · Schnell-Check: Volumen halbieren</h3>' +
      '<p>Vergleiche zwei Zeilen, bei denen das Volumen halb so groß ist (z. B. 40 mL und 20 mL, oder 30 mL und 15 mL): Auf welchen Faktor ändert sich der Druck?</p>' +
      '<form id="exp-faktorform" class="exp-ablesen">' +
      '<label for="exp-faktor">p(½V) / p(V) ≈</label>' +
      '<input id="exp-faktor" inputmode="decimal" autocomplete="off" size="5">' +
      '<button class="knopf">Prüfen</button>' +
      '</form>' +
      '<p id="exp-faktor-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<h3>3 · Erkenntnisfrage</h3>' +
      '<p><strong>Warum bleibt p · V konstant?</strong></p>' +
      '<select id="exp-f1" class="exp-wahl" aria-label="Antwort auswählen">' +
      '<option value="">— Antwort wählen —</option>' +
      '<option value="a">Zufall — bei mehr Messungen wäre p · V sehr verschieden.</option>' +
      '<option value="b">Die gleiche Anzahl Teilchen wird auf weniger Raum gedrängt: Sie treffen häufiger auf die Wände, der Druck steigt im selben Maß, wie das Volumen sinkt.</option>' +
      '<option value="c">Weil das Manometer den Druck an das Volumen anpasst.</option>' +
      '</select>' +
      '<button class="knopf zweitrangig" id="exp-f1k">Antwort prüfen</button>' +
      '<p id="exp-f1-meldung" class="exp-meldung" aria-live="polite"></p>' +
      '<h3>Erkenntnis</h3>' +
      '<p>Bei konstanter Temperatur und Gasmenge gilt das <strong>Gesetz von Boyle-Mariotte</strong>: <strong>p · V = const</strong>. Druck und Volumen sind <strong>umgekehrt proportional</strong> — halbes Volumen bedeutet doppelten Druck. Bei dir liegt das Produkt im Mittel bei rund <strong>' + komma(mittelP, 0) + ' kPa·mL</strong>.</p>' +
      '<details class="exp-fehler"><summary>Fehlerbetrachtung — was das Modell vereinfacht</summary>' +
      '<p><strong>Ablesefehler am Manometer:</strong> Der Zeiger lässt sich nur auf wenige kPa genau ablesen. Deshalb streuen die Produkte leicht um den Mittelwert — über mehrere Messungen mitteln.</p>' +
      '<p><strong>Erwärmung beim Komprimieren:</strong> Drückt man echtes Gas schnell zusammen, erwärmt es sich kurz (und kühlt beim Ausdehnen ab). Boyle-Mariotte gilt nur, wenn man langsam arbeitet und die Temperatur konstant bleibt.</p>' +
      '<p><strong>Totvolumen und Dichtheit:</strong> Im Schlauch und im Manometer steckt etwas „totes" Gasvolumen, und kleine Undichtigkeiten verfälschen den Druck. Echte Messreihen weichen dadurch systematisch ab.</p>' +
      '<p><strong>Ideales Gas:</strong> Bei sehr hohen Drücken gilt p · V = const nicht mehr exakt — reale Gase weichen vom idealen Gasgesetz ab.</p>' +
      '</details>' +
      '<div class="exp-knopfzeile">' +
      '<button class="knopf zweitrangig" id="exp-csv">Messwerte als CSV</button>' +
      '<button class="knopf zweitrangig" id="exp-zurueck">Mehr Messungen</button>' +
      '<button class="knopf" id="exp-neustart">Neues Experiment</button>' +
      '</div>';
    panel.querySelector("#exp-pvform").addEventListener("submit", ev => {
      ev.preventDefault();
      let alleOk = true;
      zeilen.forEach((m, i) => {
        const wp = parseDezimal(panel.querySelector("#exp-pv-" + i).value);
        const ok = produktOk(wp, produkte[i]);
        panel.querySelector("#exp-pv-ok-" + i).textContent = ok ? "✓" : "✗";
        if (!ok) alleOk = false;
      });
      panel.querySelector("#exp-pv-meldung").textContent = alleOk
        ? "✓ Alle Zeilen stimmen. Schau auf die letzte Spalte: Alle Produkte liegen nahe beieinander (bei dir im Mittel " + komma(mittelP, 0) + " kPa·mL) — p · V ist (fast) konstant. Das ist das Gesetz von Boyle-Mariotte!"
        : "Noch nicht alles ✓ — multipliziere p (kPa) mit V (mL) derselben Zeile. Achte auf Tippfehler.";
    });
    panel.querySelector("#exp-faktorform").addEventListener("submit", ev => {
      ev.preventDefault();
      const wert = parseDezimal(panel.querySelector("#exp-faktor").value);
      const ok = Number.isFinite(wert) && Math.abs(wert - 2) <= 0.3;
      let text = ok
        ? "✓ Verdopplung! Halbes Volumen → doppelter Druck. Genau das meint umgekehrt proportional."
        : "✗ Schau in deine Tabelle: Teile den Druck beim kleineren Volumen durch den beim doppelten Volumen — was kommt heraus?";
      if (ok && zustand.vorhersage === "doppelt") text += " Deine Vorhersage vom Anfang war richtig!";
      else if (ok && zustand.vorhersage) text += " Vergleiche mit deiner Vorhersage vom Anfang.";
      panel.querySelector("#exp-faktor-meldung").textContent = text;
    });
    panel.querySelector("#exp-f1k").addEventListener("click", () => {
      const wahl = panel.querySelector("#exp-f1").value, m = panel.querySelector("#exp-f1-meldung");
      if (!wahl) { m.textContent = "Wähle zuerst eine Antwort aus."; return; }
      m.textContent = wahl === "b"
        ? "✓ Richtig: Dieselbe Teilchenzahl auf halbem Raum heißt doppelt so viele Wandstöße pro Fläche — doppelter Druck. Druck wächst genau im selben Maß, wie das Volumen schrumpft, also bleibt p · V gleich."
        : "✗ Das Manometer misst nur, es regelt nichts. Und Zufall steckt nur in der kleinen Streuung. Denk an die Teilchen: Was passiert mit den Wandstößen, wenn dieselbe Anzahl Teilchen weniger Platz hat?";
    });
    panel.querySelector("#exp-csv").addEventListener("click", () => {
      const datenZeilen = zeilen.map((m, i) => [String(m.V), komma(m.p, 0), komma(produkte[i], 0)]);
      csvHerunterladen("boyle-mariotte-messwerte.csv",
        ["V in mL", "p in kPa", "p*V in kPa*mL"], datenZeilen);
    });
    panel.querySelector("#exp-zurueck").addEventListener("click", () => wechslePhase("messen"));
    panel.querySelector("#exp-neustart").addEventListener("click", () => {
      zustand.V = 20; zustand.messungen = []; zustand.vorhersage = "";
      zeichne();
      wechslePhase("aufbau");
    });
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
